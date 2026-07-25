import { NextResponse } from "next/server";
import { exigirSessao } from "@/lib/auth-servidor";
import {
  atualizarRestauranteLocal,
  usandoModoDemo,
} from "@/lib/local-db";
import { atualizarRestaurante } from "@/lib/pedidos-servidor";

/** Atualiza dados da própria loja (nome, foto, etc.) */
export async function PATCH(request: Request) {
  let corpo: {
    nome?: string;
    descricao?: string | null;
    endereco?: string | null;
    imagem_url?: string | null;
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
    return NextResponse.json({ modo: "supabase", restaurante });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao atualizar loja.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
