import { NextResponse } from "next/server";
import { exigirSessao } from "@/lib/auth-servidor";
import {
  atualizarDisponibilidadeEntregadorLocal,
  lerDisponibilidadeEntregadorLocal,
  usandoModoDemo,
} from "@/lib/local-db";
import {
  atualizarDisponibilidadeEntregador,
  lerDisponibilidadeEntregador,
} from "@/lib/pedidos-servidor";

/** Lê disponibilidade do entregador logado */
export async function GET() {
  try {
    const sessao = await exigirSessao("entregador");
    const disponibilidade = usandoModoDemo()
      ? await lerDisponibilidadeEntregadorLocal(sessao.id)
      : await lerDisponibilidadeEntregador(sessao.id);
    return NextResponse.json({
      modo: usandoModoDemo() ? "demo" : "supabase",
      disponibilidade,
    });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao ler disponibilidade.";
    const status =
      mensagem.includes("login") || mensagem.includes("permissão")
        ? 401
        : 500;
    return NextResponse.json({ erro: mensagem }, { status });
  }
}

/** Entregador fica livre ou offline */
export async function PATCH(request: Request) {
  let corpo: { disponibilidade?: string };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  const valor = corpo.disponibilidade;
  if (valor !== "livre" && valor !== "offline") {
    return NextResponse.json(
      { erro: "Use livre ou offline." },
      { status: 400 },
    );
  }

  try {
    const sessao = await exigirSessao("entregador");
    const disponibilidade = usandoModoDemo()
      ? await atualizarDisponibilidadeEntregadorLocal(sessao.id, valor)
      : await atualizarDisponibilidadeEntregador(sessao.id, valor);

    return NextResponse.json({
      modo: usandoModoDemo() ? "demo" : "supabase",
      disponibilidade,
    });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao atualizar disponibilidade.";
    return NextResponse.json({ erro: mensagem }, { status: 400 });
  }
}
