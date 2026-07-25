import { NextResponse } from "next/server";
import { exigirSessao } from "@/lib/auth-servidor";
import {
  ganhosEntregadorHojeLocal,
  listarCorridasLocal,
  usandoModoDemo,
} from "@/lib/local-db";
import {
  ganhosEntregadorHoje,
  listarCorridas,
} from "@/lib/pedidos-servidor";

/** Lista corridas do entregador logado + ganhos do dia */
export async function GET() {
  try {
    const sessao = await exigirSessao("entregador");

    if (usandoModoDemo()) {
      const [corridas, ganhos] = await Promise.all([
        listarCorridasLocal(sessao.id),
        ganhosEntregadorHojeLocal(sessao.id),
      ]);
      return NextResponse.json({ modo: "demo", corridas, ganhos });
    }

    const [corridas, ganhos] = await Promise.all([
      listarCorridas(sessao.id),
      ganhosEntregadorHoje(sessao.id),
    ]);
    return NextResponse.json({ modo: "supabase", corridas, ganhos });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao listar corridas.";
    const status =
      mensagem.includes("login") || mensagem.includes("permissão")
        ? 401
        : 500;
    return NextResponse.json({ erro: mensagem }, { status });
  }
}
