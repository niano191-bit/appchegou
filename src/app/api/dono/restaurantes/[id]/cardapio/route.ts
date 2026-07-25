import { NextResponse } from "next/server";
import {
  criarItemCardapioLocal,
  listarCardapioAdminLocal,
  usandoModoDemo,
} from "@/lib/local-db";
import {
  criarItemCardapio,
  listarCardapioAdmin,
} from "@/lib/pedidos-servidor";

type Ctx = { params: Promise<{ id: string }> };

/** Lista cardápio completo da loja (dono) */
export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;

  try {
    if (usandoModoDemo()) {
      const cardapio = await listarCardapioAdminLocal(id);
      return NextResponse.json({ modo: "demo", cardapio });
    }

    const cardapio = await listarCardapioAdmin(id);
    return NextResponse.json({ modo: "supabase", cardapio });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao listar cardápio.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}

/** Adiciona prato ao cardápio */
export async function POST(request: Request, ctx: Ctx) {
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

  if (!corpo.nome?.trim()) {
    return NextResponse.json(
      { erro: "Informe o nome do prato." },
      { status: 400 },
    );
  }
  if (corpo.preco === undefined) {
    return NextResponse.json({ erro: "Informe o preço." }, { status: 400 });
  }

  try {
    if (usandoModoDemo()) {
      const item = await criarItemCardapioLocal({
        restaurante_id: id,
        nome: corpo.nome,
        descricao: corpo.descricao,
        preco: corpo.preco,
        disponivel: corpo.disponivel,
      });
      return NextResponse.json({ modo: "demo", item }, { status: 201 });
    }

    const item = await criarItemCardapio({
      restaurante_id: id,
      nome: corpo.nome,
      descricao: corpo.descricao,
      preco: corpo.preco,
      disponivel: corpo.disponivel,
    });
    return NextResponse.json({ modo: "supabase", item }, { status: 201 });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao criar item do cardápio.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
