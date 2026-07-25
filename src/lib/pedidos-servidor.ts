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
import {
  mensagemBloqueioPedido,
  statusOperacaoLoja,
} from "@/lib/horario";

export type PedidoComItens = Pedido & {
  itens_pedido: ItemPedido[];
  cliente_nome?: string | null;
  cliente_telefone?: string | null;
  restaurante_endereco?: string | null;
};

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

  const { data: pedido, error } = await supabase
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
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

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
    .eq("status_pagamento", "pago")
    .in("status", status)
    .order("criado_em", { ascending: ordem === "asc" });

  if (error) {
    throw new Error(error.message);
  }

  return anexarContatosPedidos((data ?? []) as PedidoComItens[]);
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
  if (pedido.status_pagamento !== "pago") {
    throw new Error("Só é possível recusar pedidos já pagos.");
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

/** Atualiza status no Supabase (e entregador, se informado) */
export async function atualizarStatusPedido(
  pedidoId: string,
  status: StatusPedido,
  extras?: { entregadorId?: string | null },
) {
  if (status === "cancelado") {
    throw new Error("Use o cancelamento pelo cliente.");
  }

  const supabase = createSupabaseClient();
  const patch: { status: StatusPedido; entregador_id?: string } = { status };

  if (status === "a_caminho") {
    if (!extras?.entregadorId) {
      throw new Error("Informe o entregador.");
    }
    patch.entregador_id = extras.entregadorId;
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

/** Corridas: prontas para pegar + as do entregador a caminho */
export async function listarCorridas(entregadorId: string) {
  const supabase = createSupabaseClient();

  const { data: prontos, error: erroProntos } = await supabase
    .from("pedidos")
    .select("*, itens_pedido(*), restaurantes(nome, endereco)")
    .eq("status", "pronto")
    .eq("status_pagamento", "pago")
    .order("criado_em", { ascending: true });

  if (erroProntos) throw new Error(erroProntos.message);

  const { data: meus, error: erroMeus } = await supabase
    .from("pedidos")
    .select("*, itens_pedido(*), restaurantes(nome, endereco)")
    .eq("status", "a_caminho")
    .eq("status_pagamento", "pago")
    .eq("entregador_id", entregadorId)
    .order("criado_em", { ascending: true });

  if (erroMeus) throw new Error(erroMeus.message);

  const mapa = (lista: typeof prontos): Corrida[] =>
    (lista ?? []).map((p) => {
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
    });

  const unidos = [...mapa(prontos), ...mapa(meus)];
  const comContato = await anexarContatosPedidos(unidos);
  return comContato as Corrida[];
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
    })
    .eq("id", pedidoId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as Pedido;
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
  const agoraSp = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
  );
  const y = agoraSp.getFullYear();
  const m = String(agoraSp.getMonth() + 1).padStart(2, "0");
  const d = String(agoraSp.getDate()).padStart(2, "0");
  const inicio = new Date(`${y}-${m}-${d}T00:00:00-03:00`).getTime();
  const fim = new Date(`${y}-${m}-${d}T23:59:59.999-03:00`).getTime();

  const doDia = pedidos.filter((p) => {
    const t = new Date(p.criado_em).getTime();
    return p.status_pagamento === "pago" && t >= inicio && t <= fim;
  });

  const qtd = doDia.length;
  const faturamento = doDia.reduce((s, p) => s + Number(p.total), 0);
  const comissao = doDia.reduce((s, p) => s + Number(p.comissao_valor), 0);

  return {
    qtd_pedidos: qtd,
    faturamento,
    comissao,
    ticket_medio: qtd > 0 ? faturamento / qtd : 0,
  };
}
