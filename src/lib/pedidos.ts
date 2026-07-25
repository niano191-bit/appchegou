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
  ordem: "asc" | "desc" = "asc",
) {
  const params = new URLSearchParams({
    restauranteId,
    status: status.join(","),
    ordem,
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

export type PedidoCliente = PedidoComItens & {
  restaurante_nome: string;
};

/** Histórico de pedidos do cliente logado */
export async function listarMeusPedidos() {
  const resposta = await fetch("/api/pedidos?meus=1", { cache: "no-store" });
  const json = (await resposta.json()) as {
    pedidos?: PedidoCliente[];
    erro?: string;
  };

  if (!resposta.ok) {
    throw new Error(json.erro ?? "Não foi possível carregar seus pedidos.");
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

/** Cliente cancela pedido ainda não aceito */
export async function cancelarPedido(pedidoId: string) {
  const resposta = await fetch(`/api/pedidos/${pedidoId}/cancelar`, {
    method: "POST",
  });
  const json = (await resposta.json()) as { erro?: string };
  if (!resposta.ok) {
    throw new Error(json.erro ?? "Não foi possível cancelar o pedido.");
  }
}

/** Loja recusa pedido (novo ou em preparo) */
export async function recusarPedido(pedidoId: string, motivo?: string) {
  const resposta = await fetch(`/api/restaurante/pedidos/${pedidoId}/recusar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ motivo }),
  });
  const json = (await resposta.json()) as { erro?: string };
  if (!resposta.ok) {
    throw new Error(json.erro ?? "Não foi possível recusar o pedido.");
  }
}

/** Cliente informa chave Pix para receber estorno */
export async function solicitarEstornoPix(pedidoId: string, pixKey: string) {
  const resposta = await fetch(`/api/pedidos/${pedidoId}/estorno`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pix_key: pixKey }),
  });
  const json = (await resposta.json()) as { erro?: string };
  if (!resposta.ok) {
    throw new Error(json.erro ?? "Não foi possível solicitar o estorno.");
  }
}

/** Cria um pedido novo a partir do carrinho */
export async function criarPedido(entrada: {
  restauranteId: string;
  endereco_entrega: string;
  observacao?: string;
  bairroId?: string;
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
