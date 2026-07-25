import { NextResponse } from "next/server";
import { exigirSessao } from "@/lib/auth-servidor";
import { processarEstornoPedido } from "@/lib/estorno";
import {
  buscarClienteDoPedidoLocal,
  buscarPedidoLocal,
  usandoModoDemo,
} from "@/lib/local-db";
import {
  buscarClienteDoPedido,
  buscarPedido,
} from "@/lib/pedidos-servidor";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Cliente informa chave Pix para receber estorno
 * (quando o estorno automático ficou pendente).
 */
export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;

  try {
    const sessao = await exigirSessao("cliente");
    const corpo = (await request.json().catch(() => ({}))) as {
      pix_key?: string;
    };
    const pixKey = corpo.pix_key?.trim();
    if (!pixKey) {
      return NextResponse.json(
        { erro: "Informe a chave Pix para receber o estorno." },
        { status: 400 },
      );
    }

    const pedido = usandoModoDemo()
      ? await buscarPedidoLocal(id)
      : await buscarPedido(id);

    if (!pedido) {
      return NextResponse.json(
        { erro: "Pedido não encontrado." },
        { status: 404 },
      );
    }
    if (pedido.cliente_id !== sessao.id) {
      return NextResponse.json(
        { erro: "Este pedido não é seu." },
        { status: 403 },
      );
    }
    if (
      pedido.status_pagamento !== "reembolso_pendente" &&
      pedido.status_pagamento !== "pago"
    ) {
      return NextResponse.json(
        { erro: "Este pedido não precisa de estorno." },
        { status: 400 },
      );
    }
    if (pedido.status !== "cancelado") {
      return NextResponse.json(
        { erro: "Só é possível estornar pedidos cancelados." },
        { status: 400 },
      );
    }

    const cliente = usandoModoDemo()
      ? await buscarClienteDoPedidoLocal(id)
      : await buscarClienteDoPedido(id);

    const resultado = await processarEstornoPedido({
      pedidoId: id,
      clienteTelefone: cliente?.telefone,
      clienteEmail: cliente?.email,
      pixKeyManual: pixKey,
    });

    if (resultado.status === "estornado") {
      return NextResponse.json({ ok: true, status: "estornado" });
    }

    return NextResponse.json(
      {
        erro:
          resultado.status === "reembolso_pendente"
            ? resultado.motivo
            : "Não foi possível estornar.",
      },
      { status: 400 },
    );
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao solicitar estorno.";
    return NextResponse.json({ erro: mensagem }, { status: 400 });
  }
}
