import type { ItemCardapio, Restaurante } from "@/types/database";

/** Lista restaurantes ativos */
export async function buscarRestaurantes() {
  const resposta = await fetch("/api/restaurantes", { cache: "no-store" });
  const json = (await resposta.json()) as {
    restaurantes?: Restaurante[];
    erro?: string;
  };

  if (!resposta.ok) {
    throw new Error(json.erro ?? "Não foi possível carregar os restaurantes.");
  }

  return json.restaurantes ?? [];
}

/** Busca um restaurante e o cardápio dele */
export async function buscarRestauranteComCardapio(restauranteId: string) {
  const resposta = await fetch(`/api/restaurantes/${restauranteId}`, {
    cache: "no-store",
  });
  const json = (await resposta.json()) as {
    restaurante?: Restaurante;
    cardapio?: ItemCardapio[];
    erro?: string;
  };

  if (!resposta.ok) {
    throw new Error(json.erro ?? "Não foi possível carregar o cardápio.");
  }

  return {
    restaurante: json.restaurante!,
    cardapio: json.cardapio ?? [],
  };
}
