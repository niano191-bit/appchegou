import {
  detectarTipoChavePix,
  isLucPagueiConfigured,
  sacarPixLucPaguei,
  telefoneParaChavePix,
  tentarRefundLucPaguei,
} from "@/lib/lucpaguei";
import {
  buscarPedido,
  marcarPedidoEstornado,
  marcarPedidoReembolsoPendente,
} from "@/lib/pedidos-servidor";
import {
  buscarPedidoLocal,
  marcarPedidoEstornadoLocal,
  marcarPedidoReembolsoPendenteLocal,
  usandoModoDemo,
} from "@/lib/local-db";
import type { Pedido } from "@/types/database";

export type ResultadoEstorno =
  | { status: "estornado"; via: "demo" | "refund" | "saque" }
  | { status: "reembolso_pendente"; motivo: string }
  | { status: "ignorado"; motivo: string };

/**
 * Após cancelar/recusar pedido pago: tenta devolver o Pix.
 * 1) refund da transação (se a API LucPaguei tiver)
 * 2) saque Pix para telefone/e-mail do cliente
 * 3) marca reembolso_pendente para o cliente informar a chave
 */
export async function processarEstornoPedido(entrada: {
  pedidoId: string;
  clienteTelefone?: string | null;
  clienteEmail?: string | null;
  pixKeyManual?: string | null;
}): Promise<ResultadoEstorno> {
  const pedido = usandoModoDemo()
    ? await buscarPedidoLocal(entrada.pedidoId)
    : await buscarPedido(entrada.pedidoId);

  if (!pedido) {
    return { status: "ignorado", motivo: "Pedido não encontrado." };
  }

  if (pedido.status_pagamento === "estornado") {
    return { status: "estornado", via: "refund" };
  }

  if (
    pedido.status_pagamento !== "pago" &&
    pedido.status_pagamento !== "reembolso_pendente"
  ) {
    return { status: "ignorado", motivo: "Pedido não estava pago." };
  }

  if (usandoModoDemo()) {
    await marcarEstornado(pedido.id, pedido.mp_payment_id);
    return { status: "estornado", via: "demo" };
  }

  if (!isLucPagueiConfigured()) {
    await marcarPendente(pedido.id);
    return {
      status: "reembolso_pendente",
      motivo:
        "Gateway Pix não configurado. Estorne manualmente no painel LucPaguei.",
    };
  }

  const amount = Number(pedido.total);
  const txId = pedido.mp_payment_id?.trim() || "";

  if (txId && pedido.status_pagamento === "pago") {
    const refund = await tentarRefundLucPaguei({
      transactionId: txId,
      amount,
      externalId: `refund-${pedido.id}`,
    });
    if (refund.ok) {
      await marcarEstornado(pedido.id, txId);
      return { status: "estornado", via: "refund" };
    }
  }

  const chaveManual = entrada.pixKeyManual?.trim();
  if (chaveManual) {
    const tipo = detectarTipoChavePix(chaveManual);
    if (!tipo) {
      await marcarPendente(pedido.id);
      return {
        status: "reembolso_pendente",
        motivo: "Chave Pix inválida. Use e-mail, CPF, CNPJ ou celular.",
      };
    }
    const pixKey =
      tipo === "EMAIL"
        ? chaveManual
        : chaveManual.replace(/\D/g, "") || chaveManual;

    const saque = await sacarPixLucPaguei({
      amount,
      externalId: `estorno-${pedido.id}-${Date.now()}`,
      pixKey: tipo === "PHONE" ? telefoneParaChavePix(chaveManual) || pixKey : pixKey,
      keyType: tipo,
      description: `Estorno pedido ${pedido.id.slice(0, 8)}`,
    });

    if (saque.ok) {
      await marcarEstornado(pedido.id, saque.transactionId ?? txId);
      return { status: "estornado", via: "saque" };
    }

    await marcarPendente(pedido.id);
    return { status: "reembolso_pendente", motivo: saque.motivo };
  }

  const telefoneKey = telefoneParaChavePix(entrada.clienteTelefone);
  if (telefoneKey) {
    const saque = await sacarPixLucPaguei({
      amount,
      externalId: `estorno-${pedido.id}-${Date.now()}`,
      pixKey: telefoneKey,
      keyType: "PHONE",
      description: `Estorno pedido ${pedido.id.slice(0, 8)}`,
    });
    if (saque.ok) {
      await marcarEstornado(pedido.id, saque.transactionId ?? txId);
      return { status: "estornado", via: "saque" };
    }
  }

  const email = entrada.clienteEmail?.trim();
  if (email && email.includes("@") && !email.endsWith("@chegou.local")) {
    const saque = await sacarPixLucPaguei({
      amount,
      externalId: `estorno-${pedido.id}-${Date.now()}`,
      pixKey: email,
      keyType: "EMAIL",
      description: `Estorno pedido ${pedido.id.slice(0, 8)}`,
    });
    if (saque.ok) {
      await marcarEstornado(pedido.id, saque.transactionId ?? txId);
      return { status: "estornado", via: "saque" };
    }
  }

  await marcarPendente(pedido.id);
  return {
    status: "reembolso_pendente",
    motivo:
      "Não foi possível estornar sozinho. O cliente precisa informar a chave Pix.",
  };
}

async function marcarEstornado(pedidoId: string, ref?: string | null) {
  if (usandoModoDemo()) {
    await marcarPedidoEstornadoLocal(pedidoId, ref);
  } else {
    await marcarPedidoEstornado(pedidoId, ref);
  }
}

async function marcarPendente(pedidoId: string) {
  if (usandoModoDemo()) {
    await marcarPedidoReembolsoPendenteLocal(pedidoId);
  } else {
    await marcarPedidoReembolsoPendente(pedidoId);
  }
}

/** Dados mínimos do pedido para estorno (tipagem auxiliar) */
export type PedidoParaEstorno = Pick<
  Pedido,
  "id" | "total" | "status_pagamento" | "mp_payment_id"
>;
