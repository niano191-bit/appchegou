import { NextResponse } from "next/server";
import { exigirSessao } from "@/lib/auth-servidor";
import {
  cancelarPedidoLocal,
  usandoModoDemo,
} from "@/lib/local-db";
import { cancelarPedido } from "@/lib/pedidos-servidor";

type Ctx = { params: Promise<{ id: string }> };

/** Cliente cancela pedido (só se ainda estiver novo) */
export async function POST(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;

  try {
    const sessao = await exigirSessao("cliente");

    if (usandoModoDemo()) {
      const pedido = await cancelarPedidoLocal(id, sessao.id);
      return NextResponse.json({ modo: "demo", pedido });
    }

    await cancelarPedido(id, sessao.id);
    return NextResponse.json({ modo: "supabase", ok: true });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao cancelar pedido.";
    return NextResponse.json({ erro: mensagem }, { status: 400 });
  }
}
