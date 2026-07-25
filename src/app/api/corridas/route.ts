import { NextResponse } from "next/server";
import { DEMO } from "@/lib/demo-ids";
import { listarCorridasLocal, usandoModoDemo } from "@/lib/local-db";
import { listarCorridas } from "@/lib/pedidos-servidor";

/** Lista corridas do entregador (prontas + as dele a caminho) */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const entregadorId =
    searchParams.get("entregadorId") ?? DEMO.entregadorId;

  try {
    if (usandoModoDemo()) {
      const corridas = await listarCorridasLocal(entregadorId);
      return NextResponse.json({ modo: "demo", corridas });
    }

    const corridas = await listarCorridas(entregadorId);
    return NextResponse.json({ modo: "supabase", corridas });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao listar corridas.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
