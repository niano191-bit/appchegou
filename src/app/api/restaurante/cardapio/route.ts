import { NextResponse } from "next/server";
import { exigirSessao } from "@/lib/auth-servidor";
import {
  buscarRestauranteLocal,
  criarItemCardapioLocal,
  listarCardapioAdminLocal,
  usandoModoDemo,
} from "@/lib/local-db";
import {
  buscarRestaurante,
  criarItemCardapio,
  listarCardapioAdmin,
} from "@/lib/pedidos-servidor";

/** Cardápio da loja logada */
export async function GET() {
  try {
    const sessao = await exigirSessao("restaurante");
    if (!sessao.restaurante_id) {
      return NextResponse.json(
        { erro: "Sua conta não está ligada a um restaurante." },
        { status: 400 },
      );
    }

    if (usandoModoDemo()) {
      const [cardapio, restaurante] = await Promise.all([
        listarCardapioAdminLocal(sessao.restaurante_id),
        buscarRestauranteLocal(sessao.restaurante_id),
      ]);
      return NextResponse.json({ modo: "demo", cardapio, restaurante });
    }

    const [cardapio, restaurante] = await Promise.all([
      listarCardapioAdmin(sessao.restaurante_id),
      buscarRestaurante(sessao.restaurante_id),
    ]);
    return NextResponse.json({ modo: "supabase", cardapio, restaurante });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao carregar cardápio.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}

/** Novo prato na loja logada */
export async function POST(request: Request) {
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

  if (!corpo.nome?.trim() || corpo.preco === undefined) {
    return NextResponse.json(
      { erro: "Informe nome e preço do prato." },
      { status: 400 },
    );
  }

  try {
    const sessao = await exigirSessao("restaurante");
    if (!sessao.restaurante_id) {
      return NextResponse.json(
        { erro: "Sua conta não está ligada a um restaurante." },
        { status: 400 },
      );
    }

    const entrada = {
      restaurante_id: sessao.restaurante_id,
      nome: corpo.nome,
      descricao: corpo.descricao,
      preco: corpo.preco,
      disponivel: corpo.disponivel,
      imagem_url: corpo.imagem_url,
    };

    if (usandoModoDemo()) {
      const item = await criarItemCardapioLocal(entrada);
      return NextResponse.json({ modo: "demo", item }, { status: 201 });
    }

    const item = await criarItemCardapio(entrada);
    return NextResponse.json({ modo: "supabase", item }, { status: 201 });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao criar prato.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
