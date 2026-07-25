import { NextResponse } from "next/server";
import { exigirSessao } from "@/lib/auth-servidor";
import { processarEstornoPedido } from "@/lib/estorno";
import {
  buscarClienteDoPedidoLocal,
  buscarPedidoLocal,
  cancelarPedidoLocal,
  usandoModoDemo,
} from "@/lib/local-db";
import {
  buscarClienteDoPedido,
  buscarPedido,
  cancelarPedido,
} from "@/lib/pedidos-servidor";

type Ctx = { params: Promise<{ id: string }> };

/** Cliente cancela pedido (só se ainda estiver novo) */
export async function POST(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;

  try {
    const sessao = await exigirSessao("cliente");

    const antes = usandoModoDemo()
      ? await buscarPedidoLocal(id)
      : await buscarPedido(id);

    if (usandoModoDemo()) {
      const pedido = await cancelarPedidoLocal(id, sessao.id);
      let estorno = null;
      if (antes?.status_pagamento === "pago") {
        const cliente = await buscarClienteDoPedidoLocal(id);
        estorno = await processarEstornoPedido({
          pedidoId: id,
          clienteTelefone: cliente?.telefone,
          clienteEmail: cliente?.email ?? sessao.email,
        });
      }
      return NextResponse.json({ modo: "demo", pedido, estorno });
    }

    await cancelarPedido(id, sessao.id);

    let estorno = null;
    if (antes?.status_pagamento === "pago") {
      const cliente = await buscarClienteDoPedido(id);
      estorno = await processarEstornoPedido({
        pedidoId: id,
        clienteTelefone: cliente?.telefone,
        clienteEmail: cliente?.email ?? sessao.email,
      });
    }

    return NextResponse.json({ modo: "supabase", ok: true, estorno });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao cancelar pedido.";
    return NextResponse.json({ erro: mensagem }, { status: 400 });
  }
}
