import type { ItemPedido, Pedido, StatusPedido } from "@/types/database";
import { createSupabaseClient } from "@/lib/supabase/client";

export type PedidoComItens = Pedido & {
  itens_pedido: ItemPedido[];
};

/** Busca pedidos de um restaurante pelos status informados */
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

/** Muda o status de um pedido (ex.: novo → aceito) */
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
