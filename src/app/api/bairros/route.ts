import { NextResponse } from "next/server";
import { listarBairrosLocal, usandoModoDemo } from "@/lib/local-db";
import { listarBairros } from "@/lib/bairros-servidor";

/** Bairros ativos para o cliente escolher no checkout */
export async function GET() {
  try {
    if (usandoModoDemo()) {
      const bairros = await listarBairrosLocal(true);
      return NextResponse.json({ modo: "demo", bairros });
    }

    const bairros = await listarBairros(true);
    return NextResponse.json({ modo: "supabase", bairros });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao listar bairros.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
