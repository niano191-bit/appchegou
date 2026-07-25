import { NextResponse } from "next/server";
import { exigirSessao } from "@/lib/auth-servidor";
import {
  atualizarBairroLocal,
  criarBairroLocal,
  excluirBairroLocal,
  listarBairrosLocal,
  usandoModoDemo,
} from "@/lib/local-db";
import {
  atualizarBairro,
  criarBairro,
  excluirBairro,
  listarBairros,
} from "@/lib/bairros-servidor";

/** Lista todos os bairros (dono) */
export async function GET() {
  try {
    await exigirSessao("dono");
    if (usandoModoDemo()) {
      return NextResponse.json({
        modo: "demo",
        bairros: await listarBairrosLocal(false),
      });
    }
    return NextResponse.json({
      modo: "supabase",
      bairros: await listarBairros(false),
    });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao listar bairros.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}

/** Cria bairro */
export async function POST(request: Request) {
  try {
    await exigirSessao("dono");
    const corpo = (await request.json()) as {
      nome?: string;
      taxa?: number;
      ativo?: boolean;
      ordem?: number;
    };

    if (usandoModoDemo()) {
      const bairro = await criarBairroLocal({
        nome: corpo.nome ?? "",
        taxa: Number(corpo.taxa),
        ativo: corpo.ativo,
        ordem: corpo.ordem,
      });
      return NextResponse.json({ modo: "demo", bairro }, { status: 201 });
    }

    const bairro = await criarBairro({
      nome: corpo.nome ?? "",
      taxa: Number(corpo.taxa),
      ativo: corpo.ativo,
      ordem: corpo.ordem,
    });
    return NextResponse.json({ modo: "supabase", bairro }, { status: 201 });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao criar bairro.";
    return NextResponse.json({ erro: mensagem }, { status: 400 });
  }
}

/** Atualiza ou exclui bairro (?id=) */
export async function PATCH(request: Request) {
  try {
    await exigirSessao("dono");
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ erro: "Informe o id." }, { status: 400 });
    }

    const corpo = (await request.json()) as {
      nome?: string;
      taxa?: number;
      ativo?: boolean;
      ordem?: number;
    };

    if (usandoModoDemo()) {
      const bairro = await atualizarBairroLocal(id, corpo);
      return NextResponse.json({ modo: "demo", bairro });
    }

    const bairro = await atualizarBairro(id, corpo);
    return NextResponse.json({ modo: "supabase", bairro });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao atualizar bairro.";
    return NextResponse.json({ erro: mensagem }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    await exigirSessao("dono");
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ erro: "Informe o id." }, { status: 400 });
    }

    if (usandoModoDemo()) {
      await excluirBairroLocal(id);
      return NextResponse.json({ modo: "demo", ok: true });
    }

    await excluirBairro(id);
    return NextResponse.json({ modo: "supabase", ok: true });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao excluir bairro.";
    return NextResponse.json({ erro: mensagem }, { status: 400 });
  }
}
