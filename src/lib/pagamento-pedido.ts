import type { Pedido } from "@/types/database";
import { formatarReais } from "@/types/database";

/** Pedido que a cozinha/entregador devem ver (Pix pago ou dinheiro a cobrar) */
export function pedidoVisivelNaOperacao(
  pedido: Pick<Pedido, "status" | "status_pagamento" | "forma_pagamento">,
) {
  if (pedido.status === "cancelado") return false;
  if (pedido.status_pagamento === "pago") return true;
  return (
    pedido.forma_pagamento === "dinheiro" &&
    pedido.status_pagamento === "pendente"
  );
}

export function pedidoEhDinheiroPendente(
  pedido: Pick<Pedido, "status_pagamento" | "forma_pagamento">,
) {
  return (
    pedido.forma_pagamento === "dinheiro" &&
    pedido.status_pagamento === "pendente"
  );
}

/** Total cobrado do cliente: itens + entrega + gorjeta */
export function totalAPagar(
  pedido: Pick<Pedido, "total" | "taxa_entrega" | "gorjeta">,
) {
  return (
    Number(pedido.total) +
    Number(pedido.taxa_entrega) +
    Number(pedido.gorjeta ?? 0)
  );
}

export function textoCobrancaDinheiro(
  pedido: Pick<Pedido, "total" | "taxa_entrega" | "gorjeta" | "troco_para">,
) {
  const total = totalAPagar(pedido);
  const trocoPara = pedido.troco_para != null ? Number(pedido.troco_para) : null;
  if (trocoPara != null && trocoPara > total) {
    const troco = trocoPara - total;
    return `COBRAR ${formatarReais(total)} (troco para ${formatarReais(trocoPara)} → ${formatarReais(troco)})`;
  }
  return `COBRAR ${formatarReais(total)} (dinheiro)`;
}
