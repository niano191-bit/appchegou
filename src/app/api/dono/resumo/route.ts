import { NextResponse } from "next/server";
import { resumoDoDiaLocal, usandoModoDemo } from "@/lib/local-db";
import { resumoDoDia } from "@/lib/pedidos-servidor";

/** Números do dia para o painel do dono */
export async function GET() {
  try {
    if (usandoModoDemo()) {
      const resumo = await resumoDoDiaLocal();
      return NextResponse.json({ modo: "demo", resumo });
    }

    const resumo = await resumoDoDia();
    return NextResponse.json({ modo: "supabase", resumo });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao calcular resumo.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
