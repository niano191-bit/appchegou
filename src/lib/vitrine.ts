import type { BannerVitrine, CategoriaVitrine } from "@/types/database";

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

/** Envia arquivo de imagem e devolve a URL pública (ou data URL no demo). */
export async function uploadImagemBannerDono(arquivo: File) {
  const form = new FormData();
  form.append("arquivo", arquivo);
  const resposta = await fetch("/api/dono/vitrine/upload", {
    method: "POST",
    body: form,
  });
  const json = (await resposta.json()) as { url?: string; erro?: string };
  if (!resposta.ok) throw new Error(json.erro ?? "Erro ao enviar imagem.");
  if (!json.url) throw new Error("Upload sem URL de retorno.");
  return json.url;
}

export async function criarBannerDono(entrada: {
  imagem_url: string;
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
    imagem_url: string | null;
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
