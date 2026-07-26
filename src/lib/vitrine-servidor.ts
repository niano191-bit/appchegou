import type {
  BannerVitrine,
  CategoriaVitrine,
  TomBanner,
} from "@/types/database";
import { createSupabaseClient } from "@/lib/supabase/client";

function normalizarTom(tom: string | null | undefined): TomBanner {
  return tom === "mar" ? "mar" : "dende";
}

export async function listarBannersVitrine(apenasAtivos = false) {
  const supabase = createSupabaseClient();
  let q = supabase
    .from("banners_vitrine")
    .select("*")
    .order("ordem", { ascending: true })
    .order("criado_em", { ascending: true });
  if (apenasAtivos) q = q.eq("ativo", true);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return ((data ?? []) as BannerVitrine[]).map((b) => ({
    ...b,
    tom: normalizarTom(b.tom),
  }));
}

export async function listarCategoriasVitrine(apenasAtivos = false) {
  const supabase = createSupabaseClient();
  let q = supabase
    .from("categorias_vitrine")
    .select("*")
    .order("ordem", { ascending: true })
    .order("criado_em", { ascending: true });
  if (apenasAtivos) q = q.eq("ativo", true);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as CategoriaVitrine[];
}

export async function criarBannerVitrine(entrada: {
  titulo: string;
  texto?: string;
  tom?: TomBanner;
  ordem?: number;
}) {
  const titulo = entrada.titulo.trim();
  if (!titulo) throw new Error("Informe o título do banner.");
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("banners_vitrine")
    .insert({
      titulo,
      texto: (entrada.texto ?? "").trim(),
      tom: entrada.tom === "mar" ? "mar" : "dende",
      ativo: true,
      ordem: Number(entrada.ordem ?? 0),
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as BannerVitrine;
}

export async function atualizarBannerVitrine(
  id: string,
  patch: Partial<{
    titulo: string;
    texto: string;
    tom: TomBanner;
    ativo: boolean;
    ordem: number;
  }>,
) {
  const supabase = createSupabaseClient();
  const body: Record<string, unknown> = {};
  if (patch.titulo !== undefined) {
    const titulo = patch.titulo.trim();
    if (!titulo) throw new Error("Informe o título do banner.");
    body.titulo = titulo;
  }
  if (patch.texto !== undefined) body.texto = patch.texto.trim();
  if (patch.tom !== undefined) {
    body.tom = patch.tom === "mar" ? "mar" : "dende";
  }
  if (patch.ativo !== undefined) body.ativo = patch.ativo;
  if (patch.ordem !== undefined) body.ordem = Number(patch.ordem);

  const { data, error } = await supabase
    .from("banners_vitrine")
    .update(body)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as BannerVitrine;
}

export async function excluirBannerVitrine(id: string) {
  const supabase = createSupabaseClient();
  const { error } = await supabase.from("banners_vitrine").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function criarCategoriaVitrine(entrada: {
  nome: string;
  emoji?: string;
  palavras_chave?: string;
  ordem?: number;
}) {
  const nome = entrada.nome.trim();
  if (!nome) throw new Error("Informe o nome da categoria.");
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("categorias_vitrine")
    .insert({
      nome,
      emoji: (entrada.emoji ?? "🍽️").trim() || "🍽️",
      palavras_chave: (entrada.palavras_chave ?? "").trim(),
      ativo: true,
      ordem: Number(entrada.ordem ?? 0),
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as CategoriaVitrine;
}

export async function atualizarCategoriaVitrine(
  id: string,
  patch: Partial<{
    nome: string;
    emoji: string;
    palavras_chave: string;
    ativo: boolean;
    ordem: number;
  }>,
) {
  const supabase = createSupabaseClient();
  const body: Record<string, unknown> = {};
  if (patch.nome !== undefined) {
    const nome = patch.nome.trim();
    if (!nome) throw new Error("Informe o nome da categoria.");
    body.nome = nome;
  }
  if (patch.emoji !== undefined) body.emoji = patch.emoji.trim() || "🍽️";
  if (patch.palavras_chave !== undefined) {
    body.palavras_chave = patch.palavras_chave.trim();
  }
  if (patch.ativo !== undefined) body.ativo = patch.ativo;
  if (patch.ordem !== undefined) body.ordem = Number(patch.ordem);

  const { data, error } = await supabase
    .from("categorias_vitrine")
    .update(body)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as CategoriaVitrine;
}

export async function excluirCategoriaVitrine(id: string) {
  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from("categorias_vitrine")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}
