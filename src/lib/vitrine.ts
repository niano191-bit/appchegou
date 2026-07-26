import type { BannerVitrine, CategoriaVitrine, TomBanner } from "@/types/database";

export async function buscarVitrinePublica() {
  const resposta = await fetch("/api/vitrine", { cache: "no-store" });
  const json = (await resposta.json()) as {
    banners?: BannerVitrine[];
    categorias?: CategoriaVitrine[];
    erro?: string;
  };
  if (!resposta.ok) {
    throw new Error(json.erro ?? "Erro ao carregar vitrine.");
  }
  return {
    banners: json.banners ?? [],
    categorias: json.categorias ?? [],
  };
}

export async function buscarVitrineDono() {
  const resposta = await fetch("/api/dono/vitrine", { cache: "no-store" });
  const json = (await resposta.json()) as {
    banners?: BannerVitrine[];
    categorias?: CategoriaVitrine[];
    erro?: string;
  };
  if (!resposta.ok) {
    throw new Error(json.erro ?? "Erro ao carregar vitrine.");
  }
  return {
    banners: json.banners ?? [],
    categorias: json.categorias ?? [],
  };
}

export async function criarBannerDono(entrada: {
  titulo: string;
  texto?: string;
  tom?: TomBanner;
  ordem?: number;
}) {
  const resposta = await fetch("/api/dono/vitrine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tipo: "banner", ...entrada }),
  });
  const json = (await resposta.json()) as {
    banner?: BannerVitrine;
    erro?: string;
  };
  if (!resposta.ok) throw new Error(json.erro ?? "Erro ao criar banner.");
  return json.banner!;
}

export async function atualizarBannerDono(
  id: string,
  patch: Partial<{
    titulo: string;
    texto: string;
    tom: TomBanner;
    ativo: boolean;
    ordem: number;
    excluir: boolean;
  }>,
) {
  const resposta = await fetch("/api/dono/vitrine", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tipo: "banner", id, ...patch }),
  });
  const json = (await resposta.json()) as {
    banner?: BannerVitrine;
    erro?: string;
  };
  if (!resposta.ok) throw new Error(json.erro ?? "Erro ao atualizar banner.");
  return json.banner;
}

export async function criarCategoriaDono(entrada: {
  nome: string;
  emoji?: string;
  palavras_chave?: string;
  ordem?: number;
}) {
  const resposta = await fetch("/api/dono/vitrine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tipo: "categoria", ...entrada }),
  });
  const json = (await resposta.json()) as {
    categoria?: CategoriaVitrine;
    erro?: string;
  };
  if (!resposta.ok) throw new Error(json.erro ?? "Erro ao criar categoria.");
  return json.categoria!;
}

export async function atualizarCategoriaDono(
  id: string,
  patch: Partial<{
    nome: string;
    emoji: string;
    palavras_chave: string;
    ativo: boolean;
    ordem: number;
    excluir: boolean;
  }>,
) {
  const resposta = await fetch("/api/dono/vitrine", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tipo: "categoria", id, ...patch }),
  });
  const json = (await resposta.json()) as {
    categoria?: CategoriaVitrine;
    erro?: string;
  };
  if (!resposta.ok) {
    throw new Error(json.erro ?? "Erro ao atualizar categoria.");
  }
  return json.categoria;
}
