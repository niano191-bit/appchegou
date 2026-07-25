import { getAppUrl } from "@/lib/mercadopago";

/** Integração LucPaguei — chave em LUC_PAGUEI_API_KEY (quando disponível) */
export function isLucPagueiConfigured() {
  return Boolean(process.env.LUC_PAGUEI_API_KEY?.trim());
}

/**
 * Cria cobrança / link de checkout no LucPaguei.
 * Se a API ainda não estiver ligada, o app usa simulação de teste.
 *
 * Variáveis opcionais:
 * - LUC_PAGUEI_API_KEY
 * - LUC_PAGUEI_API_URL (padrão: vazio → só simulação até configurar)
 */
export async function criarCheckoutLucPaguei(entrada: {
  pedidoId: string;
  valorTotal: number;
  descricao: string;
}) {
  const apiKey = process.env.LUC_PAGUEI_API_KEY?.trim();
  const apiUrl = process.env.LUC_PAGUEI_API_URL?.trim();

  if (!apiKey || !apiUrl) {
    throw new Error(
      "LucPaguei ainda não está com a chave configurada. Use o botão de teste LucPaguei ou preencha LUC_PAGUEI_API_KEY e LUC_PAGUEI_API_URL.",
    );
  }

  const base = getAppUrl().replace(/\/$/, "");
  const resposta = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({
      amount: Number(entrada.valorTotal.toFixed(2)),
      description: entrada.descricao,
      external_reference: entrada.pedidoId,
      success_url: `${base}/cliente/pedido/${entrada.pedidoId}/pagar?resultado=sucesso&gateway=lucpaguei`,
      failure_url: `${base}/cliente/pedido/${entrada.pedidoId}/pagar?resultado=falhou&gateway=lucpaguei`,
      pending_url: `${base}/cliente/pedido/${entrada.pedidoId}/pagar?resultado=pendente&gateway=lucpaguei`,
    }),
  });

  const json = (await resposta.json().catch(() => ({}))) as {
    checkout_url?: string;
    checkoutUrl?: string;
    url?: string;
    link?: string;
    message?: string;
    error?: string;
  };

  if (!resposta.ok) {
    throw new Error(
      json.message ||
        json.error ||
        "Erro ao criar pagamento no LucPaguei.",
    );
  }

  const checkoutUrl =
    json.checkout_url || json.checkoutUrl || json.url || json.link;

  if (!checkoutUrl) {
    throw new Error("LucPaguei não retornou o link de pagamento.");
  }

  return { checkoutUrl };
}
