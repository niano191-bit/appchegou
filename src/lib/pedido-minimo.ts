import type { Restaurante } from "@/types/database";
import { formatarReais } from "@/types/database";

/** Pedido mínimo da loja (subtotal, sem taxa de entrega) */
export function valorPedidoMinimo(
  loja: Pick<Restaurante, "pedido_minimo"> | null | undefined,
) {
  const n = Number(loja?.pedido_minimo ?? 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Number(n.toFixed(2));
}

/** Valida subtotal contra o mínimo da loja; lança erro se abaixo */
export function exigirPedidoMinimo(
  loja: Pick<Restaurante, "pedido_minimo" | "nome"> | null | undefined,
  subtotal: number,
) {
  const minimo = valorPedidoMinimo(loja);
  if (minimo <= 0) return;
  const atual = Number(subtotal);
  if (atual + 1e-9 >= minimo) return;
  const falta = minimo - atual;
  throw new Error(
    `Pedido mínimo desta loja: ${formatarReais(minimo)}. Falta ${formatarReais(falta)} no subtotal.`,
  );
}

export function textoPedidoMinimo(minimo: number) {
  if (minimo <= 0) return null;
  return `Pedido mínimo ${formatarReais(minimo)} (sem a taxa de entrega)`;
}
