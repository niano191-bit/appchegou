import { NextResponse } from "next/server";
import { lerConfiguracaoLocal, usandoModoDemo } from "@/lib/local-db";
import { lerConfiguracao } from "@/lib/pedidos-servidor";

/** Configuração pública (taxa e horário) para o app */
export async function GET() {
  try {
    if (usandoModoDemo()) {
      const configuracao = await lerConfiguracaoLocal();
      return NextResponse.json({ modo: "demo", configuracao });
    }

    const configuracao = await lerConfiguracao();
    return NextResponse.json({ modo: "supabase", configuracao });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao ler configuração.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
