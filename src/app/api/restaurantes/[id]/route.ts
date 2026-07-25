import { NextResponse } from "next/server";
import {
  buscarRestauranteLocal,
  listarCardapioLocal,
  usandoModoDemo,
} from "@/lib/local-db";
import { buscarRestaurante, listarCardapio } from "@/lib/pedidos-servidor";

/** Detalhe do restaurante + cardápio */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    if (usandoModoDemo()) {
      const restaurante = await buscarRestauranteLocal(id);
      if (!restaurante) {
        return NextResponse.json(
          { erro: "Restaurante não encontrado." },
          { status: 404 },
        );
      }
      const cardapio = await listarCardapioLocal(id);
      return NextResponse.json({ modo: "demo", restaurante, cardapio });
    }

    const restaurante = await buscarRestaurante(id);
    if (!restaurante) {
      return NextResponse.json(
        { erro: "Restaurante não encontrado." },
        { status: 404 },
      );
    }
    const cardapio = await listarCardapio(id);
    return NextResponse.json({ modo: "supabase", restaurante, cardapio });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao carregar restaurante.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
