import { NextResponse } from "next/server";
import {
  listarBannersVitrineLocal,
  listarCategoriasVitrineLocal,
  usandoModoDemo,
} from "@/lib/local-db";
import {
  bannersPadrao,
  categoriasPadrao,
} from "@/lib/vitrine-defaults";
import {
  listarBannersVitrine,
  listarCategoriasVitrine,
} from "@/lib/vitrine-servidor";

/** Vitrine pública da home (só itens ativos) */
export async function GET() {
  try {
    if (usandoModoDemo()) {
      const [banners, categorias] = await Promise.all([
        listarBannersVitrineLocal(true),
        listarCategoriasVitrineLocal(true),
      ]);
      return NextResponse.json({
        modo: "demo",
        banners,
        categorias,
      });
    }

    try {
      const [banners, categorias] = await Promise.all([
        listarBannersVitrine(true),
        listarCategoriasVitrine(true),
      ]);
      return NextResponse.json({
        modo: "supabase",
        banners: banners.length ? banners : bannersPadrao(),
        categorias: categorias.length ? categorias : categoriasPadrao(),
      });
    } catch {
      // Tabela ainda não migrada — fallback
      return NextResponse.json({
        modo: "fallback",
        banners: bannersPadrao().filter((b) => b.ativo),
        categorias: categoriasPadrao().filter((c) => c.ativo),
      });
    }
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao carregar vitrine.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
