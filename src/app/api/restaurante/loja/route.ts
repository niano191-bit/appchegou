import { NextResponse } from "next/server";
import { exigirSessao } from "@/lib/auth-servidor";
import {
  atualizarRestauranteLocal,
  buscarRestauranteLocal,
  usandoModoDemo,
} from "@/lib/local-db";
import {
  atualizarRestaurante,
  buscarRestaurante,
} from "@/lib/pedidos-servidor";

/** Dados da própria loja */
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
      const restaurante = await buscarRestauranteLocal(sessao.restaurante_id);
      if (!restaurante) {
        return NextResponse.json(
          { erro: "Restaurante não encontrado." },
          { status: 404 },
        );
      }
      return NextResponse.json({ modo: "demo", restaurante });
    }

    const restaurante = await buscarRestaurante(sessao.restaurante_id);
    if (!restaurante) {
      return NextResponse.json(
        { erro: "Restaurante não encontrado." },
        { status: 404 },
      );
    }
    return NextResponse.json({
      modo: "supabase",
      restaurante: {
        ...restaurante,
        pausado: restaurante.pausado ?? false,
      },
    });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao ler loja.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}

/** Atualiza dados da própria loja (nome, foto, pausa, etc.) */
export async function PATCH(request: Request) {
  let corpo: {
    nome?: string;
    descricao?: string | null;
    endereco?: string | null;
    imagem_url?: string | null;
    pausado?: boolean;
    pedido_minimo?: number;
    horario_abertura?: string | null;
    horario_fechamento?: string | null;
    chave_pix?: string | null;
  };

  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  try {
    const sessao = await exigirSessao("restaurante");
    if (!sessao.restaurante_id) {
      return NextResponse.json(
        { erro: "Sua conta não está ligada a um restaurante." },
        { status: 400 },
      );
    }

    const patch = {
      nome: corpo.nome,
      descricao: corpo.descricao,
      endereco: corpo.endereco,
      imagem_url: corpo.imagem_url,
      pausado: corpo.pausado,
      pedido_minimo: corpo.pedido_minimo,
      horario_abertura: corpo.horario_abertura,
      horario_fechamento: corpo.horario_fechamento,
      chave_pix: corpo.chave_pix,
    };

    if (usandoModoDemo()) {
      const restaurante = await atualizarRestauranteLocal(
        sessao.restaurante_id,
        patch,
      );
      return NextResponse.json({ modo: "demo", restaurante });
    }

    const restaurante = await atualizarRestaurante(
      sessao.restaurante_id,
      patch,
    );
    return NextResponse.json({
      modo: "supabase",
      restaurante: {
        ...restaurante,
        pausado: restaurante.pausado ?? false,
      },
    });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao atualizar loja.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
