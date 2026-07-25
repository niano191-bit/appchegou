import { NextResponse } from "next/server";
import { listarRestaurantesLocal, usandoModoDemo } from "@/lib/local-db";
import { listarRestaurantes } from "@/lib/pedidos-servidor";

/** Lista restaurantes ativos */
export async function GET() {
  try {
    if (usandoModoDemo()) {
      const restaurantes = await listarRestaurantesLocal();
      return NextResponse.json({ modo: "demo", restaurantes });
    }

    const restaurantes = await listarRestaurantes();
    return NextResponse.json({ modo: "supabase", restaurantes });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao listar restaurantes.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
