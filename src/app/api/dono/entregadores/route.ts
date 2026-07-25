import { NextResponse } from "next/server";
import { criarEntregador, exigirSessao } from "@/lib/auth-servidor";
import {
  ganhosTodosEntregadoresHojeLocal,
  listarEntregadoresLocal,
  usandoModoDemo,
} from "@/lib/local-db";
import {
  ganhosTodosEntregadoresHoje,
  listarEntregadores,
} from "@/lib/pedidos-servidor";

/** Lista entregadores + ganhos do dia */
export async function GET() {
  try {
    await exigirSessao("dono");

    if (usandoModoDemo()) {
      const [entregadores, ganhos] = await Promise.all([
        listarEntregadoresLocal(),
        ganhosTodosEntregadoresHojeLocal(),
      ]);
      return NextResponse.json({ modo: "demo", entregadores, ganhos });
    }

    const [entregadores, ganhos] = await Promise.all([
      listarEntregadores(),
      ganhosTodosEntregadoresHoje(),
    ]);
    return NextResponse.json({ modo: "supabase", entregadores, ganhos });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao listar entregadores.";
    const status =
      mensagem.includes("login") || mensagem.includes("permissão")
        ? 401
        : 500;
    return NextResponse.json({ erro: mensagem }, { status });
  }
}

/** Cria entregador com e-mail e senha */
export async function POST(request: Request) {
  let corpo: {
    nome?: string;
    email?: string;
    telefone?: string;
    senha?: string;
  };

  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  if (!corpo.nome?.trim() || !corpo.email?.trim() || !corpo.senha) {
    return NextResponse.json(
      { erro: "Informe nome, e-mail e senha." },
      { status: 400 },
    );
  }

  try {
    await exigirSessao("dono");
    const entregador = await criarEntregador({
      nome: corpo.nome,
      email: corpo.email,
      telefone: corpo.telefone,
      senha: corpo.senha,
    });
    return NextResponse.json({ entregador }, { status: 201 });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao criar entregador.";
    return NextResponse.json({ erro: mensagem }, { status: 400 });
  }
}
