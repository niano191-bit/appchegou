import type { Pedido, StatusPedido } from "@/types/database";
import type { PedidoComItens } from "@/lib/pedidos-servidor";

export type { PedidoComItens };

export type ItemCarrinhoEnvio = {
  item_cardapio_id: string;
  quantidade: number;
};

/** Busca pedidos via API (usa demo local ou Supabase, conforme config) */
export async function listarPedidosDoRestaurante(
  restauranteId: string,
  status: StatusPedido[],
) {
  const params = new URLSearchParams({
    restauranteId,
    status: status.join(","),
  });

  const resposta = await fetch(`/api/pedidos?${params.toString()}`, {
    cache: "no-store",
  });
  const json = (await resposta.json()) as {
    pedidos?: PedidoComItens[];
    erro?: string;
  };

  if (!resposta.ok) {
    throw new Error(json.erro ?? "Não foi possível carregar os pedidos.");
  }

  return json.pedidos ?? [];
}

/** Muda o status de um pedido via API */
export async function atualizarStatusPedido(
  pedidoId: string,
  status: StatusPedido,
  extras?: { entregadorId?: string },
) {
  const resposta = await fetch(`/api/pedidos/${pedidoId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, entregadorId: extras?.entregadorId }),
  });
  const json = (await resposta.json()) as { erro?: string };

  if (!resposta.ok) {
    throw new Error(json.erro ?? "Não foi possível atualizar o pedido.");
  }
}

export type CorridaComItens = PedidoComItens & {
  restaurante_nome: string;
};

export type PedidoDetalhe = PedidoComItens & {
  restaurante_nome: string;
};

/** Busca um pedido pelo id */
export async function buscarPedido(pedidoId: string) {
  const resposta = await fetch(`/api/pedidos/${pedidoId}`, {
    cache: "no-store",
  });
  const json = (await resposta.json()) as {
    pedido?: PedidoDetalhe;
    erro?: string;
  };

  if (!resposta.ok) {
    throw new Error(json.erro ?? "Não foi possível carregar o pedido.");
  }

  return json.pedido!;
}

/** Lista corridas do entregador logado */
export async function listarCorridas() {
  const resposta = await fetch("/api/corridas", { cache: "no-store" });
  const json = (await resposta.json()) as {
    corridas?: CorridaComItens[];
    erro?: string;
  };

  if (!resposta.ok) {
    throw new Error(json.erro ?? "Não foi possível carregar as corridas.");
  }

  return json.corridas ?? [];
}

/** Cria um pedido novo a partir do carrinho */
export async function criarPedido(entrada: {
  restauranteId: string;
  endereco_entrega: string;
  observacao?: string;
  itens: ItemCarrinhoEnvio[];
}) {
  const resposta = await fetch("/api/pedidos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entrada),
  });
  const json = (await resposta.json()) as { pedido?: Pedido; erro?: string };

  if (!resposta.ok) {
    throw new Error(json.erro ?? "Não foi possível fazer o pedido.");
  }

  return json.pedido!;
}
