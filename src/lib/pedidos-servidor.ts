import type {
  ItemCardapio,
  ItemPedido,
  Pedido,
  Restaurante,
  StatusPedido,
} from "@/types/database";
import { createSupabaseClient } from "@/lib/supabase/client";
import type { ItemNovoPedido } from "@/lib/local-db";

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
    .order("criado_em", { ascending: true });

  if (erroProntos) throw new Error(erroProntos.message);

  const { data: meus, error: erroMeus } = await supabase
    .from("pedidos")
    .select("*, itens_pedido(*), restaurantes(nome)")
    .eq("status", "a_caminho")
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
