import { NextResponse } from "next/server";
import {
  marcarPedidoPagoLocal,
  usandoModoDemo,
} from "@/lib/local-db";
import { marcarPedidoPago } from "@/lib/pedidos-servidor";

/**
 * Webhook LucPaguei / SuitMoney — confirma quando o depósito Pix é pago.
 * external_id = id do pedido (enviado em /api/payments/deposit).
 */
export async function POST(request: Request) {
  let corpo: Record<string, unknown>;
  try {
    corpo = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  const data =
    (corpo.data as Record<string, unknown> | undefined) ??
    (corpo.transaction as Record<string, unknown> | undefined) ??
    corpo;

  const status = String(
    data.status ?? corpo.status ?? data.payment_status ?? "",
  ).toLowerCase();

  const pago =
    status === "paid" ||
    status === "pago" ||
    status === "approved" ||
    status === "completed" ||
    status === "confirmed" ||
    status === "success" ||
    corpo.paid === true;

  if (!pago) {
    return NextResponse.json({ ok: true, ignorado: true });
  }

  const pedidoId = String(
    data.external_id ??
      data.externalId ??
      data.external_reference ??
      data.identifier ??
      corpo.external_id ??
      corpo.externalId ??
      corpo.external_reference ??
      corpo.identifier ??
      "",
  ).trim();

  if (!pedidoId) {
    return NextResponse.json(
      { erro: "Sem referência do pedido (external_id)." },
      { status: 400 },
    );
  }

  const transactionId =
    str(data.transactionId) ||
    str(data.transaction_id) ||
    str(corpo.transactionId);

  try {
    if (usandoModoDemo()) {
      await marcarPedidoPagoLocal(pedidoId, "pix", transactionId);
    } else {
      await marcarPedidoPago(pedidoId, "pix", transactionId);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao confirmar pagamento.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}
