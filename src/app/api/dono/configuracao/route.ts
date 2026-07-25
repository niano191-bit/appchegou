import { NextResponse } from "next/server";
import {
  lerConfiguracaoLocal,
  salvarConfiguracaoLocal,
  usandoModoDemo,
} from "@/lib/local-db";
import type { Configuracao } from "@/types/database";

/** Lê configuração (dono) */
export async function GET() {
  try {
    if (usandoModoDemo()) {
      const configuracao = await lerConfiguracaoLocal();
      return NextResponse.json({ modo: "demo", configuracao });
    }

    return NextResponse.json(
      { erro: "Configuração no Supabase ainda não ligada." },
      { status: 501 },
    );
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao ler configuração.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}

/** Salva taxa de entrega e horários */
export async function PUT(request: Request) {
  let corpo: Partial<Configuracao>;

  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  const taxa = Number(corpo.taxa_entrega);
  if (Number.isNaN(taxa) || taxa < 0) {
    return NextResponse.json(
      { erro: "Taxa de entrega inválida." },
      { status: 400 },
    );
  }

  if (!corpo.horario_abertura || !corpo.horario_fechamento) {
    return NextResponse.json(
      { erro: "Informe horário de abertura e fechamento." },
      { status: 400 },
    );
  }

  try {
    if (usandoModoDemo()) {
      const configuracao = await salvarConfiguracaoLocal({
        taxa_entrega: taxa,
        horario_abertura: corpo.horario_abertura,
        horario_fechamento: corpo.horario_fechamento,
      });
      return NextResponse.json({ modo: "demo", configuracao });
    }

    return NextResponse.json(
      { erro: "Configuração no Supabase ainda não ligada." },
      { status: 501 },
    );
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao salvar configuração.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
