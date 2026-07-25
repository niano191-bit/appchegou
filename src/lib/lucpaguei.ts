import { getAppUrl } from "@/lib/mercadopago";

/** LucPaguei (SuitMoney white-label) — client id + secret + URL da API */
export function isLucPagueiConfigured() {
  return Boolean(
    process.env.LUC_PAGUEI_CLIENT_ID?.trim() &&
      process.env.LUC_PAGUEI_SECRET_KEY?.trim() &&
      process.env.LUC_PAGUEI_API_URL?.trim(),
  );
}

export type CobrançaLucPaguei = {
  checkoutUrl?: string;
  qrCode?: string;
  qrCodeBase64?: string;
  transactionId?: string;
  copiaECola?: string;
};

/**
 * Fluxo oficial (docs em /api-docs):
 * 1) POST /api/auth/login  { client_id, client_secret } → JWT
 * 2) POST /api/payments/deposit  Bearer JWT → { transactionId, qrcode }
 */
export async function criarCheckoutLucPaguei(entrada: {
  pedidoId: string;
  valorTotal: number;
  descricao: string;
  clienteNome?: string;
  clienteEmail?: string;
  clienteDocumento?: string;
}): Promise<CobrançaLucPaguei> {
  const clientId = process.env.LUC_PAGUEI_CLIENT_ID?.trim();
  const secret = process.env.LUC_PAGUEI_SECRET_KEY?.trim();
  const apiBase = process.env.LUC_PAGUEI_API_URL?.trim()?.replace(/\/$/, "");

  if (!clientId || !secret || !apiBase) {
    throw new Error(
      "LucPaguei incompleto. Configure LUC_PAGUEI_CLIENT_ID, LUC_PAGUEI_SECRET_KEY e LUC_PAGUEI_API_URL.",
    );
  }

  const token = await autenticarLucPaguei(apiBase, clientId, secret);
  const appUrl = getAppUrl().replace(/\/$/, "");
  const amount = Number(entrada.valorTotal.toFixed(2));
  const callbackUrl = `${appUrl}/api/pagamentos/lucpaguei/webhook`;

  const depositPath =
    process.env.LUC_PAGUEI_PIX_PATH?.trim() || "/api/payments/deposit";
  const depositUrl = depositPath.startsWith("http")
    ? depositPath
    : `${apiBase}${depositPath.startsWith("/") ? "" : "/"}${depositPath}`;

  const resposta = await fetch(depositUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      amount,
      external_id: entrada.pedidoId,
      clientCallbackUrl: callbackUrl,
      payer: {
        name: entrada.clienteNome ?? "Cliente",
        email: entrada.clienteEmail ?? "cliente@chegou.local",
        document: entrada.clienteDocumento?.replace(/\D/g, "") || "00000000000",
      },
      description: entrada.descricao,
    }),
  });

  const json = (await resposta.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  if (!resposta.ok) {
    const msg =
      (typeof json.message === "string" && json.message) ||
      (typeof json.error === "string" && json.error) ||
      `HTTP ${resposta.status}`;
    throw new Error(`LucPaguei depósito: ${msg}`);
  }

  // Resposta SuitMoney/LucPaguei: { message, qrCodeResponse: { qrcode, ... } }
  const nested =
    (json.qrCodeResponse as Record<string, unknown> | undefined) ||
    (json.data as Record<string, unknown> | undefined) ||
    (json.pix as Record<string, unknown> | undefined);

  const candidatos: Record<string, unknown>[] = [
    ...(nested ? [nested] : []),
    json,
  ];

  let copiaECola: string | undefined;
  let transactionId: string | undefined;

  for (const data of candidatos) {
    copiaECola =
      copiaECola ||
      str(data.qrcode) ||
      str(data.qrCode) ||
      str(data.qr_code) ||
      str(data.pixCopiaECola) ||
      str(data.pixCopiaCola) ||
      str(data.brCode) ||
      str(data.copyPaste) ||
      str(data.copy_paste) ||
      str(data.emv);

    transactionId =
      transactionId ||
      str(data.transactionId) ||
      str(data.transaction_id) ||
      str(data.id);
  }

  if (!copiaECola) {
    const chaves = Object.keys(json).join(", ") || "(vazio)";
    throw new Error(
      `LucPaguei respondeu sem código Pix (qrcode). Chaves: ${chaves}`,
    );
  }

  return {
    copiaECola,
    qrCode: copiaECola,
    transactionId,
  };
}

async function autenticarLucPaguei(
  apiBase: string,
  clientId: string,
  secret: string,
): Promise<string> {
  const resposta = await fetch(`${apiBase}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: secret,
    }),
  });

  const json = (await resposta.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  if (!resposta.ok) {
    const msg =
      (typeof json.message === "string" && json.message) ||
      (typeof json.error === "string" && json.error) ||
      `HTTP ${resposta.status}`;
    throw new Error(`LucPaguei login: ${msg}`);
  }

  const token =
    str(json.token) ||
    str(json.access_token) ||
    str((json.data as Record<string, unknown> | undefined)?.token);

  if (!token) {
    throw new Error("LucPaguei login não retornou token.");
  }

  return token;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}
