import { NextResponse } from "next/server";
import { exigirSessao } from "@/lib/auth-servidor";
import {
  atribuirEntregadorPedidoLocal,
  usandoModoDemo,
} from "@/lib/local-db";
import { atribuirEntregadorPedido } from "@/lib/pedidos-servidor";

type Ctx = { params: Promise<{ id: string }> };

/** Dono atribui, troca ou libera o entregador do pedido */
export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;

  try {
    await exigirSessao("dono");
    const corpo = (await request.json().catch(() => ({}))) as {
      entregadorId?: string | null;
      liberar?: boolean;
    };

    if (usandoModoDemo()) {
      const pedido = await atribuirEntregadorPedidoLocal(id, {
        entregadorId: corpo.entregadorId,
        liberar: Boolean(corpo.liberar),
      });
      return NextResponse.json({ modo: "demo", pedido });
    }

    await atribuirEntregadorPedido(id, {
      entregadorId: corpo.entregadorId,
      liberar: Boolean(corpo.liberar),
    });
    return NextResponse.json({ modo: "supabase", ok: true });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao atribuir entregador.";
    return NextResponse.json({ erro: mensagem }, { status: 400 });
  }
}
