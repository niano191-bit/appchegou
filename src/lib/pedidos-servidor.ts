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

/** Atualiza status no Supabase */
export async function atualizarStatusPedido(
  pedidoId: string,
  status: StatusPedido,
) {
  const supabase = createSupabaseClient();

  const { error } = await supabase
    .from("pedidos")
    .update({ status })
    .eq("id", pedidoId);

  if (error) {
    throw new Error(error.message);
  }
}
