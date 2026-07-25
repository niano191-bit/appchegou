import { NextResponse } from "next/server";
import { resumoDoDiaLocal, usandoModoDemo } from "@/lib/local-db";

/** Números do dia para o painel do dono */
export async function GET() {
  try {
    if (usandoModoDemo()) {
      const resumo = await resumoDoDiaLocal();
      return NextResponse.json({ modo: "demo", resumo });
    }

    // Placeholder até ligar o Supabase com o SQL da Fase 6
    return NextResponse.json({
      modo: "supabase",
      resumo: {
        qtd_pedidos: 0,
        faturamento: 0,
        comissao: 0,
        ticket_medio: 0,
      },
    });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao calcular resumo.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
