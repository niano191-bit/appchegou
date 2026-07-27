import { NextResponse } from "next/server";
import { exigirSessao } from "@/lib/auth-servidor";
import {
  atualizarItemCardapioLocal,
  listarCardapioAdminLocal,
  usandoModoDemo,
} from "@/lib/local-db";
import {
  atualizarItemCardapio,
  listarCardapioAdmin,
} from "@/lib/pedidos-servidor";
import { restauranteIdEfetivo } from "@/lib/restaurante-sessao";

type Ctx = { params: Promise<{ id: string }> };

/** Atualiza prato — só se for da loja logada */
export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  let corpo: {
    nome?: string;
    descricao?: string | null;
    preco?: number;
    disponivel?: boolean;
    imagem_url?: string | null;
  };

  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  try {
    const sessao = await exigirSessao("restaurante");
    const lojaId = await restauranteIdEfetivo(sessao);
    if (!lojaId) {
      return NextResponse.json(
        { erro: "Sua conta não está ligada a um restaurante." },
        { status: 400 },
      );
    }

    const cardapio = usandoModoDemo()
      ? await listarCardapioAdminLocal(lojaId)
      : await listarCardapioAdmin(lojaId);

    if (!cardapio.some((i) => i.id === id)) {
      return NextResponse.json(
        { erro: "Este prato não é da sua loja." },
        { status: 403 },
      );
    }

    if (usandoModoDemo()) {
      const item = await atualizarItemCardapioLocal(id, corpo);
      return NextResponse.json({ modo: "demo", item });
    }

    const item = await atualizarItemCardapio(id, corpo);
    return NextResponse.json({ modo: "supabase", item });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao atualizar prato.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
