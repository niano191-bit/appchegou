import { NextResponse } from "next/server";
import { listarEntregadoresLocal, usandoModoDemo } from "@/lib/local-db";

/** Lista entregadores cadastrados */
export async function GET() {
  try {
    if (usandoModoDemo()) {
      const entregadores = await listarEntregadoresLocal();
      return NextResponse.json({ modo: "demo", entregadores });
    }

    return NextResponse.json({ modo: "supabase", entregadores: [] });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao listar entregadores.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
