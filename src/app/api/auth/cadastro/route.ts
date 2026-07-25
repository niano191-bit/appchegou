import { NextResponse } from "next/server";
import { destinoPorPapel } from "@/lib/auth";
import { cadastrarCliente } from "@/lib/auth-servidor";

/** Cadastro de nova conta de cliente */
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
    const sessao = await cadastrarCliente({
      nome: corpo.nome,
      email: corpo.email,
      telefone: corpo.telefone,
      senha: corpo.senha,
    });
    return NextResponse.json(
      { sessao, destino: destinoPorPapel(sessao.papel) },
      { status: 201 },
    );
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Não foi possível criar a conta.";
    return NextResponse.json({ erro: mensagem }, { status: 400 });
  }
}
