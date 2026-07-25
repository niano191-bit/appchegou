import { NextResponse } from "next/server";
import {
  atualizarItemCardapioLocal,
  usandoModoDemo,
} from "@/lib/local-db";
import { atualizarItemCardapio } from "@/lib/pedidos-servidor";

type Ctx = { params: Promise<{ id: string }> };

/** Atualiza prato do cardápio */
export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  let corpo: {
    nome?: string;
    descricao?: string | null;
    preco?: number;
    disponivel?: boolean;
  };

  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  try {
    if (usandoModoDemo()) {
      const item = await atualizarItemCardapioLocal(id, corpo);
      return NextResponse.json({ modo: "demo", item });
    }

    const item = await atualizarItemCardapio(id, corpo);
    return NextResponse.json({ modo: "supabase", item });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao atualizar item do cardápio.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
