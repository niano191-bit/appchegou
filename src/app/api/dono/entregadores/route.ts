import { NextResponse } from "next/server";
import { criarEntregador } from "@/lib/auth-servidor";
import { listarEntregadoresLocal, usandoModoDemo } from "@/lib/local-db";
import { listarEntregadores } from "@/lib/pedidos-servidor";

/** Lista entregadores cadastrados */
export async function GET() {
  try {
    if (usandoModoDemo()) {
      const entregadores = await listarEntregadoresLocal();
      return NextResponse.json({ modo: "demo", entregadores });
    }

    const entregadores = await listarEntregadores();
    return NextResponse.json({ modo: "supabase", entregadores });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao listar entregadores.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
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
