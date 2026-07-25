import { NextResponse } from "next/server";
import { exigirSessao } from "@/lib/auth-servidor";
import { processarEstornoPedido } from "@/lib/estorno";
import {
  buscarClienteDoPedidoLocal,
  cancelarPedidoDonoLocal,
  usandoModoDemo,
} from "@/lib/local-db";
import {
  buscarClienteDoPedido,
  cancelarPedidoDono,
} from "@/lib/pedidos-servidor";

type Ctx = { params: Promise<{ id: string }> };

/** Dono cancela pedido em andamento + tenta estorno Pix se estava pago */
export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;

  let motivo: string | undefined;
  try {
    const corpo = (await request.json().catch(() => ({}))) as {
      motivo?: string;
    };
    motivo = corpo.motivo;
  } catch {
    motivo = undefined;
  }

  try {
    await exigirSessao("dono");

    if (usandoModoDemo()) {
      const pedido = await cancelarPedidoDonoLocal(id, motivo);
      let estorno = null;
      if (pedido.status_pagamento === "pago") {
        const cliente = await buscarClienteDoPedidoLocal(id);
        estorno = await processarEstornoPedido({
          pedidoId: id,
          clienteTelefone: cliente?.telefone,
          clienteEmail: cliente?.email,
        });
      }
      return NextResponse.json({ modo: "demo", pedido, estorno });
    }

    const pedido = await cancelarPedidoDono(id, motivo);

    let estorno = null;
    if (pedido.status_pagamento === "pago") {
      const cliente = await buscarClienteDoPedido(id);
      estorno = await processarEstornoPedido({
        pedidoId: id,
        clienteTelefone: cliente?.telefone,
        clienteEmail: cliente?.email,
      });
    }

    return NextResponse.json({ modo: "supabase", ok: true, estorno });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao cancelar pedido.";
    return NextResponse.json({ erro: mensagem }, { status: 400 });
  }
}
