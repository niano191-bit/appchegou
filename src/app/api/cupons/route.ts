import { NextResponse } from "next/server";
import { exigirSessao } from "@/lib/auth-servidor";
import {
  atualizarCupomLocal,
  criarCupomLocal,
  excluirCupomLocal,
  listarCuponsLocal,
  usandoModoDemo,
} from "@/lib/local-db";
import {
  atualizarCupom,
  criarCupom,
  excluirCupom,
  listarCupons,
} from "@/lib/pedidos-servidor";
import type { TipoCupom } from "@/types/database";

/** Lista cupons (dono) */
export async function GET() {
  try {
    await exigirSessao("dono");
    if (usandoModoDemo()) {
      const cupons = await listarCuponsLocal();
      return NextResponse.json({ modo: "demo", cupons });
    }
    const cupons = await listarCupons();
    return NextResponse.json({ modo: "supabase", cupons });
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : "Erro ao listar cupons.";
    const status =
      mensagem.includes("login") || mensagem.includes("área") ? 401 : 500;
    return NextResponse.json({ erro: mensagem }, { status });
  }
}

/** Cria cupom (dono) */
export async function POST(request: Request) {
  let corpo: { codigo?: string; tipo?: TipoCupom; valor?: number };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  try {
    await exigirSessao("dono");
    const entrada = {
      codigo: corpo.codigo ?? "",
      tipo: (corpo.tipo ?? "percent") as TipoCupom,
      valor: Number(corpo.valor),
    };
    if (usandoModoDemo()) {
      const cupom = await criarCupomLocal(entrada);
      return NextResponse.json({ modo: "demo", cupom }, { status: 201 });
    }
    const cupom = await criarCupom(entrada);
    return NextResponse.json({ modo: "supabase", cupom }, { status: 201 });
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : "Erro ao criar cupom.";
    return NextResponse.json({ erro: mensagem }, { status: 400 });
  }
}

/** Atualiza ou exclui cupom (dono) */
export async function PATCH(request: Request) {
  let corpo: {
    id?: string;
    ativo?: boolean;
    valor?: number;
    tipo?: TipoCupom;
    excluir?: boolean;
  };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  if (!corpo.id) {
    return NextResponse.json({ erro: "Informe o id do cupom." }, { status: 400 });
  }

  try {
    await exigirSessao("dono");

    if (corpo.excluir) {
      if (usandoModoDemo()) {
        await excluirCupomLocal(corpo.id);
        return NextResponse.json({ modo: "demo", ok: true });
      }
      await excluirCupom(corpo.id);
      return NextResponse.json({ modo: "supabase", ok: true });
    }

    const patch = {
      ativo: corpo.ativo,
      valor: corpo.valor,
      tipo: corpo.tipo,
    };
    if (usandoModoDemo()) {
      const cupom = await atualizarCupomLocal(corpo.id, patch);
      return NextResponse.json({ modo: "demo", cupom });
    }
    const cupom = await atualizarCupom(corpo.id, patch);
    return NextResponse.json({ modo: "supabase", cupom });
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : "Erro ao atualizar cupom.";
    return NextResponse.json({ erro: mensagem }, { status: 400 });
  }
}
