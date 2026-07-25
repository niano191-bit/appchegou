import type {
  Configuracao,
  ItemCardapio,
  ItemPedido,
  Pedido,
  Restaurante,
  StatusPedido,
  Usuario,
} from "@/types/database";
import { createSupabaseClient } from "@/lib/supabase/client";
import type { ItemNovoPedido } from "@/lib/local-db";
import { TAXA_ENTREGA_PADRAO } from "@/lib/constantes";

export type PedidoComItens = Pedido & {
  itens_pedido: ItemPedido[];
};

export type Corrida = PedidoComItens & {
  restaurante_nome: string;
};

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

export async function criarPedido(entrada: {
  clienteId: string;
  restauranteId: string;
  endereco_entrega: string;
  observacao?: string;
  taxa_entrega: number;
  itens: ItemNovoPedido[];
}) {
  if (!entrada.itens.length) {
    throw new Error("Adicione pelo menos um item ao pedido.");
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
      taxa_entrega: entrada.taxa_entrega,
      endereco_entrega: entrada.endereco_entrega,
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
) {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("pedidos")
    .select("*, itens_pedido(*)")
    .eq("restaurante_id", restauranteId)
    .eq("status_pagamento", "pago")
    .in("status", status)
    .order("criado_em", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as PedidoComItens[];
}

/** Atualiza status no Supabase (e entregador, se informado) */
export async function atualizarStatusPedido(
  pedidoId: string,
  status: StatusPedido,
  extras?: { entregadorId?: string | null },
) {
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
    .eq("id", pedidoId);

  if (error) {
    throw new Error(error.message);
  }
}

/** Corridas: prontas para pegar + as do entregador a caminho */
export async function listarCorridas(entregadorId: string) {
  const supabase = createSupabaseClient();

  const { data: prontos, error: erroProntos } = await supabase
    .from("pedidos")
    .select("*, itens_pedido(*), restaurantes(nome)")
    .eq("status", "pronto")
    .eq("status_pagamento", "pago")
    .order("criado_em", { ascending: true });

  if (erroProntos) throw new Error(erroProntos.message);

  const { data: meus, error: erroMeus } = await supabase
    .from("pedidos")
    .select("*, itens_pedido(*), restaurantes(nome)")
    .eq("status", "a_caminho")
    .eq("status_pagamento", "pago")
    .eq("entregador_id", entregadorId)
    .order("criado_em", { ascending: true });

  if (erroMeus) throw new Error(erroMeus.message);

  const mapa = (lista: typeof prontos): Corrida[] =>
    (lista ?? []).map((p) => {
      const restaurantes = p.restaurantes as { nome?: string } | null;
      const { restaurantes: _, ...pedido } = p;
      return {
        ...(pedido as PedidoComItens),
        restaurante_nome: restaurantes?.nome ?? "Restaurante",
      };
    });

  return [...mapa(prontos), ...mapa(meus)];
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
    return {
      taxa_entrega: TAXA_ENTREGA_PADRAO,
      horario_abertura: "10:00",
      horario_fechamento: "22:00",
    } satisfies Configuracao;
  }

  return {
    taxa_entrega: Number(data.taxa_entrega),
    horario_abertura: data.horario_abertura,
    horario_fechamento: data.horario_fechamento,
  } satisfies Configuracao;
}

export async function salvarConfiguracao(config: Configuracao) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("configuracao")
    .upsert({
      id: 1,
      taxa_entrega: config.taxa_entrega,
      horario_abertura: config.horario_abertura,
      horario_fechamento: config.horario_fechamento,
      atualizado_em: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return {
    taxa_entrega: Number(data.taxa_entrega),
    horario_abertura: data.horario_abertura,
    horario_fechamento: data.horario_fechamento,
  } satisfies Configuracao;
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
  patch: { comissao_percentual?: number; ativo?: boolean },
) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("restaurantes")
    .update(patch)
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
    .select("*")
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
