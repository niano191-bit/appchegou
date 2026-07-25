/** Integração Mercado Pago — só ambiente de TESTE neste momento */

export function isMercadoPagoConfigured() {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN?.trim());
}

export function getAppUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL?.trim()) {
    return process.env.NEXT_PUBLIC_APP_URL.trim();
  }
  if (process.env.VERCEL_URL?.trim()) {
    return `https://${process.env.VERCEL_URL.trim()}`;
  }
  return "http://localhost:3000";
}

type ItemPreferencia = {
  title: string;
  quantity: number;
  unit_price: number;
};

/**
 * Cria preferência de pagamento no Mercado Pago (Checkout Pro — sandbox).
 * Só funciona com MERCADOPAGO_ACCESS_TOKEN de teste no .env.local
 */
export async function criarPreferenciaCheckout(entrada: {
  pedidoId: string;
  itens: ItemPreferencia[];
  taxaEntrega: number;
  gorjeta?: number;
}) {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "Mercado Pago não configurado. Use a simulação de teste ou preencha MERCADOPAGO_ACCESS_TOKEN.",
    );
  }

  const base = getAppUrl().replace(/\/$/, "");
  const items = [
    ...entrada.itens.map((item) => ({
      title: item.title,
      quantity: item.quantity,
      unit_price: Number(item.unit_price),
      currency_id: "BRL",
    })),
  ];

  if (entrada.taxaEntrega > 0) {
    items.push({
      title: "Taxa de entrega",
      quantity: 1,
      unit_price: Number(entrada.taxaEntrega),
      currency_id: "BRL",
    });
  }

  const gorjeta = Number(entrada.gorjeta ?? 0);
  if (gorjeta > 0) {
    items.push({
      title: "Gorjeta ao entregador",
      quantity: 1,
      unit_price: gorjeta,
      currency_id: "BRL",
    });
  }

  const resposta = await fetch(
    "https://api.mercadopago.com/checkout/preferences",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items,
        external_reference: entrada.pedidoId,
        back_urls: {
          success: `${base}/cliente/pedido/${entrada.pedidoId}/pagar?resultado=sucesso`,
          failure: `${base}/cliente/pedido/${entrada.pedidoId}/pagar?resultado=falhou`,
          pending: `${base}/cliente/pedido/${entrada.pedidoId}/pagar?resultado=pendente`,
        },
        auto_return: "approved",
        statement_descriptor: "CHEGOU TESTE",
      }),
    },
  );

  const json = (await resposta.json()) as {
    id?: string;
    init_point?: string;
    sandbox_init_point?: string;
    message?: string;
    error?: string;
  };

  if (!resposta.ok) {
    throw new Error(
      json.message || json.error || "Erro ao criar pagamento no Mercado Pago.",
    );
  }

  // Em teste, preferimos o link sandbox
  const url = json.sandbox_init_point || json.init_point;
  if (!url) {
    throw new Error("Mercado Pago não retornou o link de pagamento.");
  }

  return { preferenceId: json.id!, checkoutUrl: url };
}
