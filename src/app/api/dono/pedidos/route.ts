import { NextResponse } from "next/server";
import { listarTodosPedidosLocal, usandoModoDemo } from "@/lib/local-db";
import { listarTodosPedidosDono } from "@/lib/pedidos-servidor";

/** Lista todos os pedidos (ao vivo no painel do dono) */
export async function GET() {
  try {
    if (usandoModoDemo()) {
      const pedidos = await listarTodosPedidosLocal();
      return NextResponse.json({ modo: "demo", pedidos });
    }

    const pedidos = await listarTodosPedidosDono();
    return NextResponse.json({ modo: "supabase", pedidos });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao listar pedidos.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
