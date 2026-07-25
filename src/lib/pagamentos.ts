import type { Pedido } from "@/types/database";

/** Simula pagamento (Pix ou cartão) no modo demo */
export async function simularPagamento(
  pedidoId: string,
  forma: "pix" | "cartao",
) {
  const resposta = await fetch("/api/pagamentos/simular", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pedidoId, forma }),
  });
  const json = (await resposta.json()) as {
    pedido?: Pedido;
    erro?: string;
  };

  if (!resposta.ok) {
    throw new Error(json.erro ?? "Não foi possível simular o pagamento.");
  }

  return json.pedido!;
}

/** Abre Checkout do Mercado Pago (quando as chaves de teste existem) */
export async function criarCheckoutMercadoPago(pedidoId: string) {
  const resposta = await fetch("/api/pagamentos/preferencia", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pedidoId }),
  });
  const json = (await resposta.json()) as {
    checkoutUrl?: string;
    ja_pago?: boolean;
    destino?: string;
    simular?: boolean;
    erro?: string;
  };

  if (!resposta.ok) {
    throw new Error(json.erro ?? "Não foi possível abrir o Mercado Pago.");
  }

  return json;
}

/** Abre Checkout / Pix do LucPaguei */
export async function criarCheckoutLucPaguei(pedidoId: string) {
  const resposta = await fetch("/api/pagamentos/lucpaguei", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pedidoId }),
  });
  const json = (await resposta.json()) as {
    checkoutUrl?: string;
    copiaECola?: string;
    qrCodeBase64?: string;
    transactionId?: string;
    ja_pago?: boolean;
    destino?: string;
    simular?: boolean;
    mensagem?: string;
    erro?: string;
  };

  if (!resposta.ok) {
    throw new Error(json.erro ?? "Não foi possível abrir o LucPaguei.");
  }

  return json;
}

export type OpcoesPagamento = {
  mercadopago: { ativo: boolean; configurado: boolean };
  lucpaguei: { ativo: boolean; configurado: boolean };
};

/** Gateways liberados pelo dono */
export async function buscarOpcoesPagamento() {
  const resposta = await fetch("/api/pagamentos/opcoes", { cache: "no-store" });
  const json = (await resposta.json()) as OpcoesPagamento & { erro?: string };
  if (!resposta.ok) {
    throw new Error(json.erro ?? "Erro ao carregar opções de pagamento.");
  }
  return json as OpcoesPagamento;
}
