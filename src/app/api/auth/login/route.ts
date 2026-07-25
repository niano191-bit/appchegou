import { NextResponse } from "next/server";
import { destinoPorPapel } from "@/lib/auth";
import { loginDemo } from "@/lib/auth-servidor";

/** Entra com e-mail e senha (contas de teste) */
export async function POST(request: Request) {
  let corpo: { email?: string; senha?: string };

  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  if (!corpo.email?.trim() || !corpo.senha) {
    return NextResponse.json(
      { erro: "Informe e-mail e senha." },
      { status: 400 },
    );
  }

  try {
    const sessao = await loginDemo(corpo.email, corpo.senha);
    return NextResponse.json({
      sessao,
      destino: destinoPorPapel(sessao.papel),
    });
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : "Não foi possível entrar.";
    return NextResponse.json({ erro: mensagem }, { status: 401 });
  }
}
