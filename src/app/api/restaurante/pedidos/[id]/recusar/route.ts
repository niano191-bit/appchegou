import { NextResponse } from "next/server";
import { exigirSessao } from "@/lib/auth-servidor";
import { processarEstornoPedido } from "@/lib/estorno";
import {
  buscarClienteDoPedidoLocal,
  recusarPedidoLocal,
  usandoModoDemo,
} from "@/lib/local-db";
import {
  buscarClienteDoPedido,
  recusarPedido,
} from "@/lib/pedidos-servidor";

type Ctx = { params: Promise<{ id: string }> };

/** Restaurante recusa pedido (novo ou aceito) + tenta estorno Pix */
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
    const sessao = await exigirSessao("restaurante");
    if (!sessao.restaurante_id) {
      return NextResponse.json(
        { erro: "Conta sem restaurante vinculado." },
        { status: 400 },
      );
    }

    if (usandoModoDemo()) {
      const pedido = await recusarPedidoLocal(
        id,
        sessao.restaurante_id,
        motivo,
      );
      const cliente = await buscarClienteDoPedidoLocal(id);
      const estorno = await processarEstornoPedido({
        pedidoId: id,
        clienteTelefone: cliente?.telefone,
        clienteEmail: cliente?.email,
      });
      return NextResponse.json({ modo: "demo", pedido, estorno });
    }

    await recusarPedido(id, sessao.restaurante_id, motivo);
    const cliente = await buscarClienteDoPedido(id);
    const estorno = await processarEstornoPedido({
      pedidoId: id,
      clienteTelefone: cliente?.telefone,
      clienteEmail: cliente?.email,
    });

    return NextResponse.json({ modo: "supabase", ok: true, estorno });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao recusar pedido.";
    return NextResponse.json({ erro: mensagem }, { status: 400 });
  }
}
