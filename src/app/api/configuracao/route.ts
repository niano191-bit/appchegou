import { NextResponse } from "next/server";
import { lerConfiguracaoLocal, usandoModoDemo } from "@/lib/local-db";
import { TAXA_ENTREGA_PADRAO } from "@/lib/constantes";

/** Configuração pública (taxa e horário) para o app */
export async function GET() {
  try {
    if (usandoModoDemo()) {
      const configuracao = await lerConfiguracaoLocal();
      return NextResponse.json({ modo: "demo", configuracao });
    }

    // Até o SQL da Fase 6 rodar no Supabase, usa o padrão
    return NextResponse.json({
      modo: "supabase",
      configuracao: {
        taxa_entrega: TAXA_ENTREGA_PADRAO,
        horario_abertura: "10:00",
        horario_fechamento: "22:00",
      },
    });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao ler configuração.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
