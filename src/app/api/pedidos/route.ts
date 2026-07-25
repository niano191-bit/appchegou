import { NextResponse } from "next/server";
import { listarPedidosLocal, usandoModoDemo } from "@/lib/local-db";
import { listarPedidosDoRestaurante } from "@/lib/pedidos-servidor";
import type { StatusPedido } from "@/types/database";

/** Lista pedidos (modo demo local ou Supabase, se configurado) */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const restauranteId = searchParams.get("restauranteId");
  const statusParam = searchParams.get("status") ?? "novo,aceito";

  if (!restauranteId) {
    return NextResponse.json(
      { erro: "Informe o restauranteId." },
      { status: 400 },
    );
  }

  const status = statusParam.split(",") as StatusPedido[];

  try {
    if (usandoModoDemo()) {
      const pedidos = await listarPedidosLocal(restauranteId, status);
      return NextResponse.json({ modo: "demo", pedidos });
    }

    const pedidos = await listarPedidosDoRestaurante(restauranteId, status);
    return NextResponse.json({ modo: "supabase", pedidos });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao listar pedidos.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
