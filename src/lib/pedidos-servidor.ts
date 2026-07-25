import type {
  Configuracao,
  ItemCardapio,
  ItemPedido,
  Pedido,
  Restaurante,
  StatusPedido,
  Usuario,
} from "@/types/database";
import { SENHA_DEMO } from "@/lib/auth";
import { gerarHashSenha } from "@/lib/senha";
import { createSupabaseClient } from "@/lib/supabase/client";
import { normalizarConfiguracao, type ItemNovoPedido } from "@/lib/local-db";
import { TAXA_ENTREGA_PADRAO } from "@/lib/constantes";
import { buscarBairro, listarBairros } from "@/lib/bairros-servidor";
import { montarFechamentoDia } from "@/lib/fechamento";
import {
  dataPedidoSalvador,
  inicioFimDoDiaSalvador,
  mensagemBloqueioPedido,
  statusOperacaoLoja,
} from "@/lib/horario";
import { pedidoVisivelNaOperacao } from "@/lib/pagamento-pedido";
import { exigirPedidoMinimo } from "@/lib/pedido-minimo";

export type PedidoComItens = Pedido & {
  itens_pedido: ItemPedido[];
  cliente_nome?: string | null;
  cliente_telefone?: string | null;
  restaurante_endereco?: string | null;
};

async function proximoNumeroDia(dataPedido: string): Promise<number> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("pedidos")
    .select("numero_dia")
    .eq("data_pedido", dataPedido)
    .order("numero_dia", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return Number(data?.numero_dia ?? 0) + 1;
}

export type Corrida = PedidoComItens & {
  restaurante_nome: string;
};

async function anexarContatosPedidos(
  pedidos: PedidoComItens[],
): Promise<PedidoComItens[]> {
  if (pedidos.length === 0) return pedidos;

  const supabase = createSupabaseClient();
  const clienteIds = [...new Set(pedidos.map((p) => p.cliente_id))];
  const lojaIds = [...new Set(pedidos.map((p) => p.restaurante_id))];

  const [{ data: clientes }, { data: lojas }] = await Promise.all([
    supabase.from("usuarios").select("id, nome, telefone").in("id", clienteIds),
    supabase.from("restaurantes").select("id, endereco").in("id", lojaIds),
  ]);

  const porCliente = new Map(
    (clientes ?? []).map((c) => [
      c.id as string,
      { nome: c.nome as string, telefone: (c.telefone as string | null) ?? null },
    ]),
  );
  const porLoja = new Map(
    (lojas ?? []).map((l) => [
      l.id as string,
      (l.endereco as string | null) ?? null,
    ]),
  );

  return pedidos.map((p) => {
    const cliente = porCliente.get(p.cliente_id);
    return {
      ...p,
      cliente_nome: cliente?.nome ?? null,
      cliente_telefone: cliente?.telefone ?? null,
      restaurante_endereco: porLoja.get(p.restaurante_id) ?? null,
    };
  });
}

export async function listarRestaurantes() {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("restaurantes")
    .select("*")
    .eq("ativo", true)
    .order("nome");

  if (error) throw new Error(error.message);
  return (data ?? []) as Restaurante[];
}

export async function buscarRestaurante(id: string) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("restaurantes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Restaurante | null) ?? null;
}

export async function listarCardapio(restauranteId: string) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("itens_cardapio")
    .select("*")
    .eq("restaurante_id", restauranteId)
    .eq("disponivel", true)
    .order("nome");

  if (error) throw new Error(error.message);
  return (data ?? []) as ItemCardapio[];
}

export async function listarCardapioAdmin(restauranteId: string) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("itens_cardapio")
    .select("*")
    .eq("restaurante_id", restauranteId)
    .order("nome");

  if (error) throw new Error(error.message);
  return (data ?? []) as ItemCardapio[];
}

function slugEmailLoja(nome: string) {
  const base = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 40);
  return base || "loja";
}

export async function criarRestaurante(entrada: {
  nome: string;
  descricao?: string | null;
  endereco?: string | null;
  comissao_percentual?: number;
}) {
  const nome = entrada.nome.trim();
  if (!nome) throw new Error("Informe o nome do restaurante.");

  const comissao = Number(entrada.comissao_percentual ?? 10);
  if (Number.isNaN(comissao) || comissao < 0 || comissao > 100) {
    throw new Error("Comissão deve ser entre 0 e 100.");
  }

  const supabase = createSupabaseClient();
  const { data: restaurante, error } = await supabase
    .from("restaurantes")
    .insert({
      nome,
      descricao: entrada.descricao?.trim() || null,
      endereco: entrada.endereco?.trim() || null,
      comissao_percentual: comissao,
      ativo: true,
      pausado: false,
      pedido_minimo: 0,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  let slug = slugEmailLoja(nome);
  let email = `loja.${slug}@chegou.local`;
  let n = 2;
  for (;;) {
    const { data: existente } = await supabase
      .from("usuarios")
      .select("id")
      .ilike("email", email)
      .maybeSingle();
    if (!existente) break;
    email = `loja.${slug}${n}@chegou.local`;
    n += 1;
  }

  const { data: usuario, error: erroUser } = await supabase
    .from("usuarios")
    .insert({
      nome: `Loja ${nome}`,
      email,
      telefone: null,
      papel: "restaurante",
      restaurante_id: restaurante.id,
      senha_hash: gerarHashSenha(SENHA_DEMO),
    })
    .select("id, nome, email, telefone, papel, restaurante_id, criado_em")
    .single();

  if (erroUser) throw new Error(erroUser.message);

  return {
    restaurante: restaurante as Restaurante,
    usuario: usuario as Usuario,
  };
}

export async function criarItemCardapio(entrada: {
  restaurante_id: string;
  nome: string;
  descricao?: string | null;
  preco: number;
  disponivel?: boolean;
  imagem_url?: string | null;
}) {
  const nome = entrada.nome.trim();
  if (!nome) throw new Error("Informe o nome do prato.");
  const preco = Number(entrada.preco);
  if (Number.isNaN(preco) || preco < 0) throw new Error("Preço inválido.");

  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("itens_cardapio")
    .insert({
      restaurante_id: entrada.restaurante_id,
      nome,
      descricao: entrada.descricao?.trim() || null,
      preco,
      disponivel: entrada.disponivel ?? true,
      imagem_url: entrada.imagem_url?.trim() || null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as ItemCardapio;
}

export async function atualizarItemCardapio(
  id: string,
  patch: {
    nome?: string;
    descricao?: string | null;
    preco?: number;
    disponivel?: boolean;
    imagem_url?: string | null;
  },
) {
  const supabase = createSupabaseClient();
  const limpo: Record<string, unknown> = {};
  if (patch.nome !== undefined) {
    const nome = patch.nome.trim();
    if (!nome) throw new Error("Informe o nome do prato.");
    limpo.nome = nome;
  }
  if (patch.descricao !== undefined) {
    limpo.descricao = patch.descricao?.trim() || null;
  }
  if (patch.preco !== undefined) {
    const preco = Number(patch.preco);
    if (Number.isNaN(preco) || preco < 0) throw new Error("Preço inválido.");
    limpo.preco = preco;
  }
  if (patch.disponivel !== undefined) limpo.disponivel = patch.disponivel;
  if (patch.imagem_url !== undefined) {
    limpo.imagem_url = patch.imagem_url?.trim() || null;
  }

  const { data, error } = await supabase
    .from("itens_cardapio")
    .update(limpo)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as ItemCardapio;
}

export async function criarPedido(entrada: {
  clienteId: string;
  restauranteId: string;
  endereco_entrega: string;
  observacao?: string;
  bairroId?: string;
  taxa_entrega?: number;
  itens: ItemNovoPedido[];
}) {
  if (!entrada.itens.length) {
    throw new Error("Adicione pelo menos um item ao pedido.");
  }

  const loja = await buscarRestaurante(entrada.restauranteId);
  if (!loja) throw new Error("Restaurante não encontrado.");
  const config = await lerConfiguracao();
  const status = statusOperacaoLoja(loja, config);
  if (status !== "aberta") {
    throw new Error(mensagemBloqueioPedido(status, config));
  }

  const ativos = await listarBairros(true);
  let taxa = Number(entrada.taxa_entrega ?? config.taxa_entrega);
  let bairroNome: string | null = null;

  if (ativos.length > 0) {
    if (!entrada.bairroId) {
      throw new Error("Escolha o bairro de entrega.");
    }
    const bairro = await buscarBairro(entrada.bairroId);
    if (!bairro || !bairro.ativo) {
      throw new Error("Bairro de entrega inválido ou inativo.");
    }
    taxa = Number(bairro.taxa);
    bairroNome = bairro.nome;
  }

  const supabase = createSupabaseClient();
  const cardapio = await listarCardapio(entrada.restauranteId);
  const porId = new Map(cardapio.map((item) => [item.id, item]));

  let total = 0;
  const linhas: {
    item_cardapio_id: string;
    nome: string;
    preco_unitario: number;
    quantidade: number;
  }[] = [];

  for (const item of entrada.itens) {
    const doCardapio = porId.get(item.item_cardapio_id);
    if (!doCardapio || item.quantidade < 1) {
      throw new Error("Item do cardápio inválido.");
    }
    total += Number(doCardapio.preco) * item.quantidade;
    linhas.push({
      item_cardapio_id: doCardapio.id,
      nome: doCardapio.nome,
      preco_unitario: Number(doCardapio.preco),
      quantidade: item.quantidade,
    });
  }

  exigirPedidoMinimo(loja, total);

  const dataPedido = dataPedidoSalvador();
  let numeroDia = await proximoNumeroDia(dataPedido);
  let pedido: Pedido | null = null;
  let ultimoErro: Error | null = null;

  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const { data, error } = await supabase
      .from("pedidos")
      .insert({
        cliente_id: entrada.clienteId,
        restaurante_id: entrada.restauranteId,
        status: "novo",
        status_pagamento: "pendente",
        forma_pagamento: null,
        mp_payment_id: null,
        total,
        taxa_entrega: taxa,
        endereco_entrega: entrada.endereco_entrega,
        bairro_entrega: bairroNome,
        observacao: entrada.observacao?.trim() || null,
        numero_dia: numeroDia,
        data_pedido: dataPedido,
      })
      .select("*")
      .single();

    if (!error && data) {
      pedido = data as Pedido;
      break;
    }

    ultimoErro = new Error(error?.message ?? "Erro ao criar pedido.");
    // Conflito de número do dia — tenta o próximo
    if (error?.code === "23505" || /duplicate|unique/i.test(error?.message ?? "")) {
      numeroDia = await proximoNumeroDia(dataPedido);
      continue;
    }
    throw ultimoErro;
  }

  if (!pedido) {
    throw ultimoErro ?? new Error("Erro ao criar pedido.");
  }

  const { error: erroItens } = await supabase.from("itens_pedido").insert(
    linhas.map((linha) => ({
      pedido_id: pedido.id,
      ...linha,
    })),
  );

  if (erroItens) throw new Error(erroItens.message);

  return pedido as Pedido;
}

/** Busca um pedido pelo id (com itens e nome do restaurante) */
export async function buscarPedido(pedidoId: string) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("pedidos")
    .select("*, itens_pedido(*), restaurantes(nome)")
    .eq("id", pedidoId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const restaurantes = data.restaurantes as { nome?: string } | null;
  const { restaurantes: _, ...pedido } = data;

  return {
    ...(pedido as PedidoComItens),
    restaurante_nome: restaurantes?.nome ?? "Restaurante",
  };
}

/** Busca pedidos no Supabase (só no servidor / API) */
export async function listarPedidosDoRestaurante(
  restauranteId: string,
  status: StatusPedido[],
  ordem: "asc" | "desc" = "asc",
) {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("pedidos")
    .select("*, itens_pedido(*)")
    .eq("restaurante_id", restauranteId)
    .or("status_pagamento.eq.pago,forma_pagamento.eq.dinheiro")
    .in("status", status)
    .order("criado_em", { ascending: ordem === "asc" });

  if (error) {
    throw new Error(error.message);
  }

  const filtrados = ((data ?? []) as PedidoComItens[]).filter(
    pedidoVisivelNaOperacao,
  );
  return anexarContatosPedidos(filtrados);
}

/** Pedidos do cliente logado */
export async function listarPedidosDoCliente(clienteId: string) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("pedidos")
    .select("*, itens_pedido(*), restaurantes(nome)")
    .eq("cliente_id", clienteId)
    .order("criado_em", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((p) => {
    const loja = p.restaurantes as { nome?: string } | null;
    const { restaurantes: _, ...pedido } = p;
    return {
      ...(pedido as PedidoComItens),
      restaurante_nome: loja?.nome ?? "Restaurante",
    };
  });
}

/** Cliente cancela pedido ainda em status novo */
export async function cancelarPedido(pedidoId: string, clienteId: string) {
  const pedido = await buscarPedido(pedidoId);
  if (!pedido) throw new Error("Pedido não encontrado.");
  if (pedido.cliente_id !== clienteId) {
    throw new Error("Este pedido não é seu.");
  }
  if (pedido.status !== "novo") {
    throw new Error(
      "Só é possível cancelar enquanto o restaurante ainda não aceitou.",
    );
  }

  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from("pedidos")
    .update({
      status: "cancelado",
      cancelado_por: "cliente",
      motivo_cancelamento: null,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", pedidoId)
    .eq("cliente_id", clienteId)
    .eq("status", "novo");

  if (error) throw new Error(error.message);
}

/** Loja recusa pedido pago (novo ou aceito) */
export async function recusarPedido(
  pedidoId: string,
  restauranteId: string,
  motivo?: string | null,
) {
  const pedido = await buscarPedido(pedidoId);
  if (!pedido) throw new Error("Pedido não encontrado.");
  if (pedido.restaurante_id !== restauranteId) {
    throw new Error("Este pedido não é da sua loja.");
  }
  if (!pedidoVisivelNaOperacao(pedido)) {
    throw new Error("Só é possível recusar pedidos pagos ou em dinheiro.");
  }
  if (pedido.status !== "novo" && pedido.status !== "aceito") {
    throw new Error(
      "Só é possível recusar enquanto o pedido está novo ou em preparo.",
    );
  }

  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from("pedidos")
    .update({
      status: "cancelado",
      cancelado_por: "restaurante",
      motivo_cancelamento: motivo?.trim() || null,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", pedidoId)
    .eq("restaurante_id", restauranteId)
    .in("status", ["novo", "aceito"]);

  if (error) throw new Error(error.message);
}

/** Atualiza status no Supabase (e entregador / ETA, se informado) */
export async function atualizarStatusPedido(
  pedidoId: string,
  status: StatusPedido,
  extras?: {
    entregadorId?: string | null;
    tempoEstimadoMinutos?: number | null;
  },
) {
  if (status === "cancelado") {
    throw new Error("Use o cancelamento pelo cliente.");
  }

  const supabase = createSupabaseClient();
  const patch: Record<string, unknown> = {
    status,
    atualizado_em: new Date().toISOString(),
  };

  const atual = await buscarPedido(pedidoId);
  if (!atual) throw new Error("Pedido não encontrado.");

  if (status === "a_caminho") {
    if (!extras?.entregadorId) {
      throw new Error("Informe o entregador.");
    }
    if (atual.status !== "pronto") {
      throw new Error("Só é possível aceitar corrida de pedidos prontos.");
    }
    if (
      atual.entregador_id &&
      atual.entregador_id !== extras.entregadorId
    ) {
      throw new Error("Esta corrida foi atribuída a outro entregador.");
    }
    patch.entregador_id = extras.entregadorId;
  }

  if (status === "entregue") {
    if (atual.status !== "a_caminho") {
      throw new Error("Só é possível confirmar entrega de pedidos a caminho.");
    }
    if (
      atual.forma_pagamento === "dinheiro" &&
      atual.status_pagamento === "pendente"
    ) {
      patch.status_pagamento = "pago";
      patch.forma_pagamento = "dinheiro";
    }
  }

  if (status === "aceito") {
    const minutos = Number(extras?.tempoEstimadoMinutos);
    if (!Number.isFinite(minutos) || minutos < 10 || minutos > 120) {
      throw new Error("Informe o tempo estimado (entre 10 e 120 minutos).");
    }
    const previsao = new Date(Date.now() + minutos * 60_000).toISOString();
    patch.tempo_estimado_minutos = Math.round(minutos);
    patch.previsao_entrega_em = previsao;
  }

  const { error } = await supabase
    .from("pedidos")
    .update(patch)
    .eq("id", pedidoId)
    .neq("status", "cancelado");

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Dono atribui / troca / libera entregador.
 * - pronto: define entregador_id (ou null se liberar)
 * - a_caminho: só troca entregador (não libera)
 */
export async function atribuirEntregadorPedido(
  pedidoId: string,
  entrada: { entregadorId?: string | null; liberar?: boolean },
) {
  const pedido = await buscarPedido(pedidoId);
  if (!pedido) throw new Error("Pedido não encontrado.");
  if (!pedidoVisivelNaOperacao(pedido)) {
    throw new Error("Só é possível atribuir pedidos pagos ou em dinheiro.");
  }
  if (pedido.status !== "pronto" && pedido.status !== "a_caminho") {
    throw new Error(
      "Só é possível atribuir pedidos prontos ou a caminho.",
    );
  }

  let novoEntregadorId: string | null;
  if (entrada.liberar) {
    if (pedido.status !== "pronto") {
      throw new Error(
        "Para liberar, o pedido precisa estar pronto (não a caminho).",
      );
    }
    novoEntregadorId = null;
  } else {
    const id = entrada.entregadorId?.trim();
    if (!id) throw new Error("Informe o entregador.");
    const entregadores = await listarEntregadores();
    if (!entregadores.some((e) => e.id === id)) {
      throw new Error("Entregador não encontrado.");
    }
    novoEntregadorId = id;
  }

  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from("pedidos")
    .update({
      entregador_id: novoEntregadorId,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", pedidoId);

  if (error) throw new Error(error.message);
}

export type GanhosEntregadorDia = {
  entregas: number;
  valor: number;
};

/** Soma das taxas de entrega do entregador no dia (Salvador) */
export async function ganhosEntregadorHoje(
  entregadorId: string,
): Promise<GanhosEntregadorDia> {
  const supabase = createSupabaseClient();
  const { inicio, fim } = inicioFimDoDiaSalvador();

  const { data, error } = await supabase
    .from("pedidos")
    .select("taxa_entrega")
    .eq("entregador_id", entregadorId)
    .eq("status", "entregue")
    .eq("status_pagamento", "pago")
    .gte("atualizado_em", inicio.toISOString())
    .lte("atualizado_em", fim.toISOString());

  if (error) throw new Error(error.message);

  const lista = data ?? [];
  const valor = lista.reduce((s, p) => s + Number(p.taxa_entrega), 0);
  return { entregas: lista.length, valor };
}

export type GanhosEntregadorComNome = GanhosEntregadorDia & {
  entregador_id: string;
  nome: string;
  telefone: string | null;
};

/** Ganhos de todos os entregadores hoje (painel do dono) */
export async function ganhosTodosEntregadoresHoje(): Promise<
  GanhosEntregadorComNome[]
> {
  const supabase = createSupabaseClient();
  const { inicio, fim } = inicioFimDoDiaSalvador();
  const entregadores = await listarEntregadores();

  const { data, error } = await supabase
    .from("pedidos")
    .select("entregador_id, taxa_entrega")
    .eq("status", "entregue")
    .eq("status_pagamento", "pago")
    .not("entregador_id", "is", null)
    .gte("atualizado_em", inicio.toISOString())
    .lte("atualizado_em", fim.toISOString());

  if (error) throw new Error(error.message);

  const porId = new Map<string, { entregas: number; valor: number }>();
  for (const p of data ?? []) {
    const id = p.entregador_id as string;
    const atual = porId.get(id) ?? { entregas: 0, valor: 0 };
    atual.entregas += 1;
    atual.valor += Number(p.taxa_entrega);
    porId.set(id, atual);
  }

  return entregadores
    .map((e) => {
      const g = porId.get(e.id) ?? { entregas: 0, valor: 0 };
      return {
        entregador_id: e.id,
        nome: e.nome,
        telefone: e.telefone,
        entregas: g.entregas,
        valor: g.valor,
      };
    })
    .sort((a, b) => b.valor - a.valor || a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Corridas: prontas para pegar + as do entregador a caminho */
export async function listarCorridas(entregadorId: string) {
  const supabase = createSupabaseClient();

  const { data: prontos, error: erroProntos } = await supabase
    .from("pedidos")
    .select("*, itens_pedido(*), restaurantes(nome, endereco)")
    .eq("status", "pronto")
    .or("status_pagamento.eq.pago,forma_pagamento.eq.dinheiro")
    .order("criado_em", { ascending: true });

  if (erroProntos) throw new Error(erroProntos.message);

  const { data: meus, error: erroMeus } = await supabase
    .from("pedidos")
    .select("*, itens_pedido(*), restaurantes(nome, endereco)")
    .eq("status", "a_caminho")
    .or("status_pagamento.eq.pago,forma_pagamento.eq.dinheiro")
    .eq("entregador_id", entregadorId)
    .order("criado_em", { ascending: true });

  if (erroMeus) throw new Error(erroMeus.message);

  const mapa = (lista: typeof prontos): Corrida[] =>
    (lista ?? [])
      .map((p) => {
        const restaurantes = p.restaurantes as {
          nome?: string;
          endereco?: string | null;
        } | null;
        const { restaurantes: _, ...pedido } = p;
        return {
          ...(pedido as PedidoComItens),
          restaurante_nome: restaurantes?.nome ?? "Restaurante",
          restaurante_endereco: restaurantes?.endereco ?? null,
        };
      })
      .filter(pedidoVisivelNaOperacao);

  const prontosVisiveis = mapa(prontos).filter(
    (p) => !p.entregador_id || p.entregador_id === entregadorId,
  );
  const unidos = [...prontosVisiveis, ...mapa(meus)];
  const comContato = await anexarContatosPedidos(unidos);
  return comContato as Corrida[];
}

/** Cliente escolhe pagar em dinheiro na entrega */
export async function escolherDinheiro(
  pedidoId: string,
  clienteId: string,
  trocoPara?: number | null,
) {
  const config = await lerConfiguracao();
  if (!config.pagamento_dinheiro) {
    throw new Error("Pagamento em dinheiro está desligado.");
  }

  const pedido = await buscarPedido(pedidoId);
  if (!pedido) throw new Error("Pedido não encontrado.");
  if (pedido.cliente_id !== clienteId) {
    throw new Error("Este pedido não é seu.");
  }
  if (pedido.status_pagamento === "pago") {
    throw new Error("Este pedido já está pago.");
  }
  if (pedido.status === "cancelado") {
    throw new Error("Pedido cancelado.");
  }

  const total = Number(pedido.total) + Number(pedido.taxa_entrega);
  let troco: number | null = null;
  if (trocoPara != null && Number(trocoPara) > 0) {
    troco = Number(Number(trocoPara).toFixed(2));
    if (troco < total) {
      throw new Error(
        `Troco para deve ser pelo menos o total (${total.toFixed(2)}).`,
      );
    }
  }

  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("pedidos")
    .update({
      forma_pagamento: "dinheiro",
      status_pagamento: "pendente",
      troco_para: troco,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", pedidoId)
    .eq("cliente_id", clienteId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as Pedido;
}

/** Marca pedido como pago no Supabase */
export async function marcarPedidoPago(
  pedidoId: string,
  forma: "pix" | "cartao",
  mpPaymentId?: string | null,
) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("pedidos")
    .update({
      status_pagamento: "pago",
      forma_pagamento: forma,
      mp_payment_id: mpPaymentId ?? null,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", pedidoId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as Pedido;
}

/** Pix devolvido (refund ou saque) */
export async function marcarPedidoEstornado(
  pedidoId: string,
  referencia?: string | null,
) {
  const supabase = createSupabaseClient();
  const patch: Record<string, unknown> = {
    status_pagamento: "estornado",
    atualizado_em: new Date().toISOString(),
  };
  if (referencia) patch.mp_payment_id = referencia;

  const { data, error } = await supabase
    .from("pedidos")
    .update(patch)
    .eq("id", pedidoId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as Pedido;
}

/** Precisa que o cliente informe a chave Pix para o estorno */
export async function marcarPedidoReembolsoPendente(pedidoId: string) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("pedidos")
    .update({
      status_pagamento: "reembolso_pendente",
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", pedidoId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as Pedido;
}

/** Dados do cliente dono do pedido (para estorno Pix) */
export async function buscarClienteDoPedido(pedidoId: string) {
  const pedido = await buscarPedido(pedidoId);
  if (!pedido) return null;
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nome, email, telefone")
    .eq("id", pedido.cliente_id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as {
    id: string;
    nome: string;
    email: string | null;
    telefone: string | null;
  } | null;
}

export async function lerConfiguracao() {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("configuracao")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    return normalizarConfiguracao({
      taxa_entrega: TAXA_ENTREGA_PADRAO,
      horario_abertura: "10:00",
      horario_fechamento: "22:00",
    });
  }

  return normalizarConfiguracao({
    taxa_entrega: Number(data.taxa_entrega),
    horario_abertura: data.horario_abertura,
    horario_fechamento: data.horario_fechamento,
    pagamento_mercadopago: data.pagamento_mercadopago,
    pagamento_lucpaguei: data.pagamento_lucpaguei,
    pagamento_dinheiro: data.pagamento_dinheiro,
  });
}

export async function salvarConfiguracao(config: Configuracao) {
  const supabase = createSupabaseClient();
  const limpa = normalizarConfiguracao(config);
  const { data, error } = await supabase
    .from("configuracao")
    .upsert({
      id: 1,
      taxa_entrega: limpa.taxa_entrega,
      horario_abertura: limpa.horario_abertura,
      horario_fechamento: limpa.horario_fechamento,
      pagamento_mercadopago: limpa.pagamento_mercadopago,
      pagamento_lucpaguei: limpa.pagamento_lucpaguei,
      pagamento_dinheiro: limpa.pagamento_dinheiro,
      atualizado_em: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return normalizarConfiguracao({
    taxa_entrega: Number(data.taxa_entrega),
    horario_abertura: data.horario_abertura,
    horario_fechamento: data.horario_fechamento,
    pagamento_mercadopago: data.pagamento_mercadopago,
    pagamento_lucpaguei: data.pagamento_lucpaguei,
    pagamento_dinheiro: data.pagamento_dinheiro,
  });
}

export async function listarTodosRestaurantes() {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("restaurantes")
    .select("*")
    .order("nome");
  if (error) throw new Error(error.message);
  return (data ?? []) as Restaurante[];
}

export async function atualizarRestaurante(
  id: string,
  patch: {
    nome?: string;
    descricao?: string | null;
    endereco?: string | null;
    imagem_url?: string | null;
    comissao_percentual?: number;
    ativo?: boolean;
    pausado?: boolean;
    pedido_minimo?: number;
  },
) {
  const supabase = createSupabaseClient();
  const limpo: Record<string, unknown> = {};

  if (patch.nome !== undefined) {
    const nome = patch.nome.trim();
    if (!nome) throw new Error("Informe o nome do restaurante.");
    limpo.nome = nome;
  }
  if (patch.descricao !== undefined) {
    limpo.descricao = patch.descricao?.trim() || null;
  }
  if (patch.endereco !== undefined) {
    limpo.endereco = patch.endereco?.trim() || null;
  }
  if (patch.imagem_url !== undefined) {
    limpo.imagem_url = patch.imagem_url?.trim() || null;
  }
  if (patch.comissao_percentual !== undefined) {
    const valor = Number(patch.comissao_percentual);
    if (Number.isNaN(valor) || valor < 0 || valor > 100) {
      throw new Error("Comissão deve ser entre 0 e 100.");
    }
    limpo.comissao_percentual = valor;
  }
  if (patch.ativo !== undefined) limpo.ativo = patch.ativo;
  if (patch.pausado !== undefined) limpo.pausado = patch.pausado;
  if (patch.pedido_minimo !== undefined) {
    const valor = Number(patch.pedido_minimo);
    if (Number.isNaN(valor) || valor < 0) {
      throw new Error("Pedido mínimo inválido.");
    }
    limpo.pedido_minimo = Number(valor.toFixed(2));
  }

  const { data, error } = await supabase
    .from("restaurantes")
    .update(limpo)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Restaurante;
}

export async function listarEntregadores() {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nome, email, telefone, papel, restaurante_id, criado_em")
    .eq("papel", "entregador")
    .order("nome");
  if (error) throw new Error(error.message);
  return (data ?? []) as Usuario[];
}

export async function listarTodosPedidosDono() {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("pedidos")
    .select("*, itens_pedido(*), restaurantes(nome, comissao_percentual)")
    .order("criado_em", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((p) => {
    const loja = p.restaurantes as {
      nome?: string;
      comissao_percentual?: number;
    } | null;
    const { restaurantes: _, ...pedido } = p;
    const comissaoPct = Number(loja?.comissao_percentual ?? 0);
    return {
      ...(pedido as PedidoComItens),
      restaurante_nome: loja?.nome ?? "Restaurante",
      comissao_percentual: comissaoPct,
      comissao_valor: (Number(pedido.total) * comissaoPct) / 100,
    };
  });
}

export async function resumoDoDia() {
  const pedidos = await listarTodosPedidosDono();
  const { inicio, fim } = inicioFimDoDiaSalvador();
  const ganhos = await ganhosTodosEntregadoresHoje();

  return montarFechamentoDia({
    pedidos,
    inicio: inicio.getTime(),
    fim: fim.getTime(),
    data: dataPedidoSalvador(),
    ganhosEntregadores: ganhos.map((g) => ({
      nome: g.nome,
      entregas: g.entregas,
      valor: g.valor,
    })),
  });
}
