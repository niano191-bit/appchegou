import { NextResponse } from "next/server";
import { exigirSessao } from "@/lib/auth-servidor";
import {
  avaliarPedidoLocal,
  usandoModoDemo,
} from "@/lib/local-db";
import { avaliarPedido } from "@/lib/pedidos-servidor";

type Ctx = { params: Promise<{ id: string }> };

/** Cliente avalia pedido entregue (nota 1-5) */
export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;

  let corpo: { nota?: number; comentario?: string };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "JSON invalido." }, { status: 400 });
  }

  try {
    const sessao = await exigirSessao("cliente");
    if (usandoModoDemo()) {
      const pedido = await avaliarPedidoLocal(
        id,
        sessao.id,
        Number(corpo.nota),
        corpo.comentario,
      );
      return NextResponse.json({ modo: "demo", pedido });
    }

    const pedido = await avaliarPedido(
      id,
      sessao.id,
      Number(corpo.nota),
      corpo.comentario,
    );
    return NextResponse.json({ modo: "supabase", pedido });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao avaliar pedido.";
    return NextResponse.json({ erro: mensagem }, { status: 400 });
  }
}
