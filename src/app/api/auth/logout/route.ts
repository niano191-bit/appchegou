import { NextResponse } from "next/server";
import { limparSessao } from "@/lib/auth-servidor";

/** Sai da conta */
export async function POST() {
  await limparSessao();
  return NextResponse.json({ ok: true });
}
