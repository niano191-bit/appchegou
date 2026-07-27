import type { ItemCardapio, Restaurante } from "@/types/database";

/** Cardápio da loja logada */
export async function buscarMeuCardapio() {
  const resposta = await fetch("/api/restaurante/cardapio", {
    cache: "no-store",
  });
  const json = (await resposta.json()) as {
    cardapio?: ItemCardapio[];
    restaurante?: Restaurante;
    erro?: string;
  };
  if (!resposta.ok) throw new Error(json.erro ?? "Erro ao carregar cardápio.");
  return {
    cardapio: json.cardapio ?? [],
    restaurante: json.restaurante!,
  };
}

export async function criarMeuPrato(entrada: {
  nome: string;
  descricao?: string;
  preco: number;
  imagem_url?: string | null;
}) {
  const resposta = await fetch("/api/restaurante/cardapio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entrada),
  });
  const json = (await resposta.json()) as { erro?: string };
  if (!resposta.ok) throw new Error(json.erro ?? "Erro ao criar prato.");
}

export async function atualizarMeuPrato(
  itemId: string,
  entrada: {
    nome?: string;
    descricao?: string | null;
    preco?: number;
    disponivel?: boolean;
    imagem_url?: string | null;
  },
) {
  const resposta = await fetch(`/api/restaurante/cardapio/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entrada),
  });
  const json = (await resposta.json()) as { erro?: string };
  if (!resposta.ok) throw new Error(json.erro ?? "Erro ao salvar prato.");
}

export async function atualizarMinhaLoja(entrada: {
  nome?: string;
  descricao?: string | null;
  endereco?: string | null;
  imagem_url?: string | null;
}) {
  const resposta = await fetch("/api/restaurante/loja", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entrada),
  });
  const json = (await resposta.json()) as { erro?: string };
  if (!resposta.ok) throw new Error(json.erro ?? "Erro ao salvar loja.");
}

/** Envia foto da loja/prato (até 3 MB) e devolve a URL */
export async function uploadImagemLoja(arquivo: File) {
  const form = new FormData();
  form.append("arquivo", arquivo);
  form.append("pasta", "lojas");
  const resposta = await fetch("/api/restaurante/upload", {
    method: "POST",
    body: form,
  });
  const json = (await resposta.json()) as { url?: string; erro?: string };
  if (!resposta.ok) throw new Error(json.erro ?? "Erro ao enviar imagem.");
  if (!json.url) throw new Error("Upload sem URL de retorno.");
  return json.url;
}
