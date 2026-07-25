import QRCode from "qrcode";
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

  // A API só manda o EMV (texto); geramos a imagem do QR aqui.
  const qrCodeBase64 = await QRCode.toDataURL(copiaECola, {
    margin: 1,
    width: 280,
    errorCorrectionLevel: "M",
  });

  return {
    copiaECola,
    qrCode: copiaECola,
    qrCodeBase64,
    transactionId,
  };
}

/**
 * Tenta estornar um depósito Pix pelo transactionId.
 * A docs pública SuitMoney não lista este endpoint; caminho configurável
 * (padrão /api/payments/refund). Se a API não tiver, falha e o chamador usa saque.
 */
export async function tentarRefundLucPaguei(entrada: {
  transactionId: string;
  amount: number;
  externalId: string;
}): Promise<{ ok: true } | { ok: false; motivo: string }> {
  if (!isLucPagueiConfigured()) {
    return { ok: false, motivo: "LucPaguei não configurado." };
  }

  const refundPath = (
    process.env.LUC_PAGUEI_REFUND_PATH?.trim() || "/api/payments/refund"
  ).replace(/\/$/, "");

  if (refundPath === "off" || refundPath === "none") {
    return { ok: false, motivo: "Refund desligado (LUC_PAGUEI_REFUND_PATH)." };
  }

  const clientId = process.env.LUC_PAGUEI_CLIENT_ID!.trim();
  const secret = process.env.LUC_PAGUEI_SECRET_KEY!.trim();
  const apiBase = process.env.LUC_PAGUEI_API_URL!.trim().replace(/\/$/, "");
  const token = await autenticarLucPaguei(apiBase, clientId, secret);

  const url = refundPath.startsWith("http")
    ? refundPath
    : `${apiBase}${refundPath.startsWith("/") ? "" : "/"}${refundPath}`;

  const amount = Number(entrada.amount.toFixed(2));
  const corpos = [
    {
      transactionId: entrada.transactionId,
      amount,
      external_id: entrada.externalId,
    },
    {
      transaction_id: entrada.transactionId,
      amount,
      external_id: entrada.externalId,
    },
  ];

  let ultimoErro = "Refund não disponível.";
  for (const body of corpos) {
    const resposta = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const json = (await resposta.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    if (resposta.ok || resposta.status === 201) {
      return { ok: true };
    }

    ultimoErro =
      (typeof json.message === "string" && json.message) ||
      (typeof json.error === "string" && json.error) ||
      `HTTP ${resposta.status}`;

    if (resposta.status === 404 || resposta.status === 405) {
      break;
    }
  }

  return { ok: false, motivo: ultimoErro };
}

/** Devolve valor via Pix (saque SuitMoney) para a chave do cliente */
export async function sacarPixLucPaguei(entrada: {
  amount: number;
  externalId: string;
  pixKey: string;
  keyType: "EMAIL" | "CPF" | "CNPJ" | "PHONE";
  description?: string;
}): Promise<{ ok: true; transactionId?: string } | { ok: false; motivo: string }> {
  if (!isLucPagueiConfigured()) {
    return { ok: false, motivo: "LucPaguei não configurado." };
  }

  const clientId = process.env.LUC_PAGUEI_CLIENT_ID!.trim();
  const secret = process.env.LUC_PAGUEI_SECRET_KEY!.trim();
  const apiBase = process.env.LUC_PAGUEI_API_URL!.trim().replace(/\/$/, "");
  const token = await autenticarLucPaguei(apiBase, clientId, secret);
  const appUrl = getAppUrl().replace(/\/$/, "");
  const amount = Number(entrada.amount.toFixed(2));

  const resposta = await fetch(`${apiBase}/api/withdrawals/withdraw`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      amount,
      external_id: entrada.externalId,
      pix_key: entrada.pixKey,
      key_type: entrada.keyType,
      description: entrada.description ?? `Estorno pedido ${entrada.externalId}`,
      clientCallbackUrl: `${appUrl}/api/pagamentos/lucpaguei/webhook`,
    }),
  });

  const json = (await resposta.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  if (!resposta.ok && resposta.status !== 201) {
    const msg =
      (typeof json.message === "string" && json.message) ||
      (typeof json.error === "string" && json.error) ||
      `HTTP ${resposta.status}`;
    return { ok: false, motivo: msg };
  }

  return {
    ok: true,
    transactionId:
      str(json.transaction_id) ||
      str(json.transactionId) ||
      str((json.data as Record<string, unknown> | undefined)?.transaction_id),
  };
}

/** Normaliza telefone BR para chave Pix PHONE (55 + DDD + número) */
export function telefoneParaChavePix(
  telefone: string | null | undefined,
): string | null {
  if (!telefone) return null;
  let digitos = telefone.replace(/\D/g, "");
  if (!digitos) return null;
  if (digitos.startsWith("55") && digitos.length >= 12) return digitos;
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  return null;
}

export function detectarTipoChavePix(
  chave: string,
): "EMAIL" | "CPF" | "CNPJ" | "PHONE" | null {
  const t = chave.trim();
  if (!t) return null;
  if (t.includes("@")) return "EMAIL";
  const digitos = t.replace(/\D/g, "");
  if (digitos.length === 11 && !t.includes("@")) {
    // celular BR ou CPF — se começar com DDD típico e tiver 11 dígitos sem formatação de CPF ambígua
    if (t.includes("+") || t.startsWith("55") || /^[\d\s()-]+$/.test(t)) {
      // telefone com 11 dígitos (9xxxx) ou CPF
      const soNumeros = digitos;
      if (soNumeros.length === 11 && soNumeros[2] === "9") return "PHONE";
      if (soNumeros.length === 11) return "CPF";
    }
  }
  if (digitos.length === 14) return "CNPJ";
  if (digitos.length >= 12 && digitos.startsWith("55")) return "PHONE";
  if (digitos.length === 10 || digitos.length === 11) return "PHONE";
  return null;
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
