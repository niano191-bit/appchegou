import type { Pedido } from "@/types/database";

/** Rótulo amigável: #47 — ou fallback do id antigo */
export function rotuloPedido(
  pedido: Pick<Pedido, "id" | "numero_dia">,
): string {
  if (pedido.numero_dia != null && pedido.numero_dia > 0) {
    return `#${pedido.numero_dia}`;
  }
  return `#${pedido.id.slice(0, 8)}`;
}

/** Só o número (sem #), para nomes de arquivo etc. */
export function codigoPedido(
  pedido: Pick<Pedido, "id" | "numero_dia">,
): string {
  if (pedido.numero_dia != null && pedido.numero_dia > 0) {
    return String(pedido.numero_dia);
  }
  return pedido.id.slice(0, 8).toUpperCase();
}
