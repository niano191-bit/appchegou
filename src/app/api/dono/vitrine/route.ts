import { NextResponse } from "next/server";
import { exigirSessao } from "@/lib/auth-servidor";
import {
  atualizarBannerVitrineLocal,
  atualizarCategoriaVitrineLocal,
  criarBannerVitrineLocal,
  criarCategoriaVitrineLocal,
  excluirBannerVitrineLocal,
  excluirCategoriaVitrineLocal,
  listarBannersVitrineLocal,
  listarCategoriasVitrineLocal,
  usandoModoDemo,
} from "@/lib/local-db";
import type { TomBanner } from "@/types/database";
import {
  atualizarBannerVitrine,
  atualizarCategoriaVitrine,
  criarBannerVitrine,
  criarCategoriaVitrine,
  excluirBannerVitrine,
  excluirCategoriaVitrine,
  listarBannersVitrine,
  listarCategoriasVitrine,
} from "@/lib/vitrine-servidor";

/** Lista banners e categorias (Admin) */
export async function GET() {
  try {
    await exigirSessao("dono");
    if (usandoModoDemo()) {
      const [banners, categorias] = await Promise.all([
        listarBannersVitrineLocal(false),
        listarCategoriasVitrineLocal(false),
      ]);
      return NextResponse.json({ modo: "demo", banners, categorias });
    }
    const [banners, categorias] = await Promise.all([
      listarBannersVitrine(false),
      listarCategoriasVitrine(false),
    ]);
    return NextResponse.json({ modo: "supabase", banners, categorias });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao carregar vitrine.";
    const status =
      mensagem.includes("login") || mensagem.includes("área") ? 401 : 500;
    return NextResponse.json({ erro: mensagem }, { status });
  }
}

type CorpoVitrine = {
  tipo?: "banner" | "categoria";
  id?: string;
  excluir?: boolean;
  titulo?: string;
  texto?: string;
  tom?: TomBanner;
  nome?: string;
  emoji?: string;
  palavras_chave?: string;
  ativo?: boolean;
  ordem?: number;
};

/** Cria banner ou categoria */
export async function POST(request: Request) {
  let corpo: CorpoVitrine;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  try {
    await exigirSessao("dono");
    const tipo = corpo.tipo ?? "banner";
    const demo = usandoModoDemo();

    if (tipo === "banner") {
      const entrada = {
        titulo: corpo.titulo ?? "",
        texto: corpo.texto,
        tom: corpo.tom,
        ordem: corpo.ordem,
      };
      const banner = demo
        ? await criarBannerVitrineLocal(entrada)
        : await criarBannerVitrine(entrada);
      return NextResponse.json(
        { modo: demo ? "demo" : "supabase", banner },
        { status: 201 },
      );
    }

    const entrada = {
      nome: corpo.nome ?? "",
      emoji: corpo.emoji,
      palavras_chave: corpo.palavras_chave,
      ordem: corpo.ordem,
    };
    const categoria = demo
      ? await criarCategoriaVitrineLocal(entrada)
      : await criarCategoriaVitrine(entrada);
    return NextResponse.json(
      { modo: demo ? "demo" : "supabase", categoria },
      { status: 201 },
    );
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao criar item da vitrine.";
    return NextResponse.json({ erro: mensagem }, { status: 400 });
  }
}

/** Atualiza ou exclui banner/categoria */
export async function PATCH(request: Request) {
  let corpo: CorpoVitrine;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  if (!corpo.id || !corpo.tipo) {
    return NextResponse.json(
      { erro: "Informe tipo e id do item." },
      { status: 400 },
    );
  }

  try {
    await exigirSessao("dono");
    const demo = usandoModoDemo();

    if (corpo.excluir) {
      if (corpo.tipo === "banner") {
        if (demo) await excluirBannerVitrineLocal(corpo.id);
        else await excluirBannerVitrine(corpo.id);
      } else {
        if (demo) await excluirCategoriaVitrineLocal(corpo.id);
        else await excluirCategoriaVitrine(corpo.id);
      }
      return NextResponse.json({ modo: demo ? "demo" : "supabase", ok: true });
    }

    if (corpo.tipo === "banner") {
      const patch = {
        titulo: corpo.titulo,
        texto: corpo.texto,
        tom: corpo.tom,
        ativo: corpo.ativo,
        ordem: corpo.ordem,
      };
      const banner = demo
        ? await atualizarBannerVitrineLocal(corpo.id, patch)
        : await atualizarBannerVitrine(corpo.id, patch);
      return NextResponse.json({
        modo: demo ? "demo" : "supabase",
        banner,
      });
    }

    const patch = {
      nome: corpo.nome,
      emoji: corpo.emoji,
      palavras_chave: corpo.palavras_chave,
      ativo: corpo.ativo,
      ordem: corpo.ordem,
    };
    const categoria = demo
      ? await atualizarCategoriaVitrineLocal(corpo.id, patch)
      : await atualizarCategoriaVitrine(corpo.id, patch);
    return NextResponse.json({
      modo: demo ? "demo" : "supabase",
      categoria,
    });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao atualizar vitrine.";
    return NextResponse.json({ erro: mensagem }, { status: 400 });
  }
}
