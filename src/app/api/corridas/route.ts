import { NextResponse } from "next/server";
import { exigirSessao } from "@/lib/auth-servidor";
import { listarCorridasLocal, usandoModoDemo } from "@/lib/local-db";
import { listarCorridas } from "@/lib/pedidos-servidor";

/** Lista corridas do entregador logado */
export async function GET() {
  try {
    const sessao = await exigirSessao("entregador");

    if (usandoModoDemo()) {
      const corridas = await listarCorridasLocal(sessao.id);
      return NextResponse.json({ modo: "demo", corridas });
    }

    const corridas = await listarCorridas(sessao.id);
    return NextResponse.json({ modo: "supabase", corridas });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao listar corridas.";
    const status = mensagem.includes("login") || mensagem.includes("permissão")
      ? 401
      : 500;
    return NextResponse.json({ erro: mensagem }, { status });
  }
}
