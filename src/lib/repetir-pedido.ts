const CHAVE = "chegou_repetir_pedido";

export type RascunhoRepetir = {
  restauranteId: string;
  itens: { item_cardapio_id: string; quantidade: number }[];
  endereco_entrega?: string;
  observacao?: string | null;
};

/** Guarda rascunho para preencher o carrinho na loja */
export function salvarRascunhoRepetir(rascunho: RascunhoRepetir) {
  if (typeof window === "undefined") return;
  const itens = rascunho.itens.filter(
    (i) => i.item_cardapio_id && i.quantidade > 0,
  );
  if (!rascunho.restauranteId || itens.length === 0) return;
  sessionStorage.setItem(
    CHAVE,
    JSON.stringify({
      restauranteId: rascunho.restauranteId,
      itens,
      endereco_entrega: rascunho.endereco_entrega?.trim() || undefined,
      observacao: rascunho.observacao?.trim() || null,
    } satisfies RascunhoRepetir),
  );
}

/** Lê e remove o rascunho (só da loja pedida) */
export function consumirRascunhoRepetir(restauranteId: string) {
  if (typeof window === "undefined") return null;
  const bruto = sessionStorage.getItem(CHAVE);
  if (!bruto) return null;
  try {
    const dados = JSON.parse(bruto) as RascunhoRepetir;
    if (dados.restauranteId !== restauranteId) return null;
    sessionStorage.removeItem(CHAVE);
    if (!Array.isArray(dados.itens) || dados.itens.length === 0) return null;
    return dados;
  } catch {
    sessionStorage.removeItem(CHAVE);
    return null;
  }
}

/** Monta rascunho a partir de um pedido do histórico */
export function rascunhoDePedido(pedido: {
  restaurante_id: string;
  endereco_entrega?: string;
  observacao?: string | null;
  itens_pedido: {
    item_cardapio_id: string | null;
    quantidade: number;
  }[];
}): RascunhoRepetir | null {
  const itens = pedido.itens_pedido
    .filter((i) => i.item_cardapio_id && i.quantidade > 0)
    .map((i) => ({
      item_cardapio_id: i.item_cardapio_id as string,
      quantidade: i.quantidade,
    }));
  if (itens.length === 0) return null;
  return {
    restauranteId: pedido.restaurante_id,
    itens,
    endereco_entrega: pedido.endereco_entrega,
    observacao: pedido.observacao,
  };
}
