import { NextResponse } from "next/server";
import {
  atualizarRestauranteLocal,
  lerBancoLocal,
  usandoModoDemo,
} from "@/lib/local-db";
import {
  atualizarRestaurante,
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

/** Atualiza comissão ou status ativo de um restaurante */
export async function PATCH(request: Request) {
  let corpo: {
    id?: string;
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

  try {
    if (usandoModoDemo()) {
      const restaurante = await atualizarRestauranteLocal(corpo.id, {
        comissao_percentual: corpo.comissao_percentual,
        ativo: corpo.ativo,
      });
      return NextResponse.json({ modo: "demo", restaurante });
    }

    const restaurante = await atualizarRestaurante(corpo.id, {
      comissao_percentual: corpo.comissao_percentual,
      ativo: corpo.ativo,
    });
    return NextResponse.json({ modo: "supabase", restaurante });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao atualizar restaurante.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
