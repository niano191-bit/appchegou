import { NextResponse } from "next/server";
import { exigirSessao } from "@/lib/auth-servidor";
import {
  escolherDinheiroLocal,
  usandoModoDemo,
} from "@/lib/local-db";
import { escolherDinheiro } from "@/lib/pedidos-servidor";

type Ctx = { params: Promise<{ id: string }> };

/** Cliente escolhe pagar em dinheiro na entrega */
export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;

  try {
    const sessao = await exigirSessao("cliente");
    const corpo = (await request.json().catch(() => ({}))) as {
      troco_para?: number | null;
    };

    const troco =
      corpo.troco_para != null ? Number(corpo.troco_para) : null;

    if (usandoModoDemo()) {
      const pedido = await escolherDinheiroLocal(id, sessao.id, troco);
      return NextResponse.json({ modo: "demo", pedido });
    }

    const pedido = await escolherDinheiro(id, sessao.id, troco);
    return NextResponse.json({ modo: "supabase", pedido });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao escolher pagamento em dinheiro.";
    return NextResponse.json({ erro: mensagem }, { status: 400 });
  }
}
