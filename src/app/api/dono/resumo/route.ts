import { NextResponse } from "next/server";
import { exigirSessao } from "@/lib/auth-servidor";
import { resumoDoDiaLocal, usandoModoDemo } from "@/lib/local-db";
import { resumoDoDia } from "@/lib/pedidos-servidor";

/** Números / fechamento do dia para o painel do dono */
export async function GET() {
  try {
    await exigirSessao("dono");

    if (usandoModoDemo()) {
      const resumo = await resumoDoDiaLocal();
      return NextResponse.json({ modo: "demo", resumo });
    }

    const resumo = await resumoDoDia();
    return NextResponse.json({ modo: "supabase", resumo });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao calcular resumo.";
    const status =
      mensagem.includes("login") || mensagem.includes("permissão")
        ? 401
        : 500;
    return NextResponse.json({ erro: mensagem }, { status });
  }
}
