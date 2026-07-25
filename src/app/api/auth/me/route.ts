import { NextResponse } from "next/server";
import { lerSessao } from "@/lib/auth-servidor";

/** Retorna quem está logado (ou null) */
export async function GET() {
  const sessao = await lerSessao();
  return NextResponse.json({ sessao });
}
