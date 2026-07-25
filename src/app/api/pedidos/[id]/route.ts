import { NextResponse } from "next/server";
import {
  atualizarStatusPedidoLocal,
  buscarPedidoLocal,
  usandoModoDemo,
} from "@/lib/local-db";
import {
  atualizarStatusPedido,
  buscarPedido,
} from "@/lib/pedidos-servidor";
import type { StatusPedido } from "@/types/database";

const STATUS_VALIDOS: StatusPedido[] = [
  "novo",
  "aceito",
  "pronto",
  "a_caminho",
  "entregue",
];

/** Busca um pedido pelo id */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    if (usandoModoDemo()) {
      const pedido = await buscarPedidoLocal(id);
      if (!pedido) {
        return NextResponse.json(
          { erro: "Pedido não encontrado." },
          { status: 404 },
        );
      }
      return NextResponse.json({ modo: "demo", pedido });
    }

    const pedido = await buscarPedido(id);
    if (!pedido) {
      return NextResponse.json(
        { erro: "Pedido não encontrado." },
        { status: 404 },
      );
    }
    return NextResponse.json({ modo: "supabase", pedido });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao buscar pedido.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}

/** Atualiza o status de um pedido */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  let corpo: { status?: string; entregadorId?: string };
  try {
    corpo = (await request.json()) as {
      status?: string;
      entregadorId?: string;
    };
  } catch {
    return NextResponse.json(
      { erro: "Dados inválidos. Envie um JSON com o status." },
      { status: 400 },
    );
  }

  if (!corpo.status || !STATUS_VALIDOS.includes(corpo.status as StatusPedido)) {
    return NextResponse.json(
      { erro: "Status inválido." },
      { status: 400 },
    );
  }

  if (corpo.status === "cancelado") {
    return NextResponse.json(
      { erro: "Para cancelar, use a ação de cancelar do cliente." },
      { status: 400 },
    );
  }

  const status = corpo.status as StatusPedido;
  const extras = { entregadorId: corpo.entregadorId };

  try {
    if (usandoModoDemo()) {
      const pedido = await atualizarStatusPedidoLocal(id, status, extras);
      return NextResponse.json({ modo: "demo", pedido });
    }

    await atualizarStatusPedido(id, status, extras);
    return NextResponse.json({ modo: "supabase", ok: true });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao atualizar pedido.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
