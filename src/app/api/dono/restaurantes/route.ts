import { NextResponse } from "next/server";
import {
  atualizarRestauranteLocal,
  criarRestauranteLocal,
  lerBancoLocal,
  usandoModoDemo,
} from "@/lib/local-db";
import {
  atualizarRestaurante,
  criarRestaurante,
  listarTodosRestaurantes,
} from "@/lib/pedidos-servidor";

/** Lista todos os restaurantes (ativos e inativos) */
export async function GET() {
  try {
    if (usandoModoDemo()) {
      const banco = await lerBancoLocal();
      return NextResponse.json({
        modo: "demo",
        restaurantes: banco.restaurantes,
      });
    }

    const restaurantes = await listarTodosRestaurantes();
    return NextResponse.json({ modo: "supabase", restaurantes });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao listar restaurantes.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}

/** Cria restaurante + conta de login da loja */
export async function POST(request: Request) {
  let corpo: {
    nome?: string;
    descricao?: string | null;
    endereco?: string | null;
    comissao_percentual?: number;
  };

  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  if (!corpo.nome?.trim()) {
    return NextResponse.json(
      { erro: "Informe o nome do restaurante." },
      { status: 400 },
    );
  }

  try {
    if (usandoModoDemo()) {
      const criado = await criarRestauranteLocal({
        nome: corpo.nome,
        descricao: corpo.descricao,
        endereco: corpo.endereco,
        comissao_percentual: corpo.comissao_percentual,
      });
      return NextResponse.json({ modo: "demo", ...criado }, { status: 201 });
    }

    const criado = await criarRestaurante({
      nome: corpo.nome,
      descricao: corpo.descricao,
      endereco: corpo.endereco,
      comissao_percentual: corpo.comissao_percentual,
    });
    return NextResponse.json({ modo: "supabase", ...criado }, { status: 201 });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao criar restaurante.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}

/** Atualiza dados do restaurante */
export async function PATCH(request: Request) {
  let corpo: {
    id?: string;
    nome?: string;
    descricao?: string | null;
    endereco?: string | null;
    comissao_percentual?: number;
    ativo?: boolean;
  };

  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  if (!corpo.id) {
    return NextResponse.json(
      { erro: "Informe o id do restaurante." },
      { status: 400 },
    );
  }

  const patch = {
    nome: corpo.nome,
    descricao: corpo.descricao,
    endereco: corpo.endereco,
    comissao_percentual: corpo.comissao_percentual,
    ativo: corpo.ativo,
  };

  try {
    if (usandoModoDemo()) {
      const restaurante = await atualizarRestauranteLocal(corpo.id, patch);
      return NextResponse.json({ modo: "demo", restaurante });
    }

    const restaurante = await atualizarRestaurante(corpo.id, patch);
    return NextResponse.json({ modo: "supabase", restaurante });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao atualizar restaurante.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
