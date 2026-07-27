import { createClient } from "@supabase/supabase-js";
import {
  createSupabaseClient,
  getSupabaseAnonKey,
  getSupabaseUrl,
} from "@/lib/supabase/client";
import { usandoModoDemo } from "@/lib/local-db";

const TIPOS_OK = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_BYTES = 3 * 1024 * 1024;

function clienteStorage() {
  const url = getSupabaseUrl();
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (url && service) {
    return createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return createSupabaseClient();
}

function extensao(tipo: string, nome: string) {
  if (tipo === "image/png") return "png";
  if (tipo === "image/webp") return "webp";
  if (tipo === "image/gif") return "gif";
  if (tipo === "image/jpeg") return "jpg";
  const m = nome.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m?.[1] ?? "jpg";
}

/** Converte arquivo em data URL (modo demo / fallback). */
export async function arquivoParaDataUrl(arquivo: File | Blob, tipo: string) {
  const buffer = Buffer.from(await arquivo.arrayBuffer());
  return `data:${tipo};base64,${buffer.toString("base64")}`;
}

/**
 * Faz upload da imagem da vitrine (banner ou categoria).
 * Em produção: Supabase Storage (bucket vitrine).
 * Em demo: data URL gravada no JSON local.
 */
export async function uploadImagemVitrine(
  arquivo: File,
  pasta: "banners" | "categorias" = "banners",
) {
  const tipo = (arquivo.type || "").toLowerCase();
  if (!TIPOS_OK.has(tipo)) {
    throw new Error("Envie uma imagem JPG, PNG ou WEBP.");
  }
  if (arquivo.size <= 0) {
    throw new Error("Arquivo de imagem vazio.");
  }
  if (arquivo.size > MAX_BYTES) {
    throw new Error("A imagem deve ter no máximo 3 MB.");
  }

  if (usandoModoDemo() || !getSupabaseUrl() || !getSupabaseAnonKey()) {
    return arquivoParaDataUrl(arquivo, tipo);
  }

  const supabase = clienteStorage();
  const nome = `${pasta}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extensao(tipo, arquivo.name)}`;
  const bytes = new Uint8Array(await arquivo.arrayBuffer());

  const { error } = await supabase.storage.from("vitrine").upload(nome, bytes, {
    contentType: tipo,
    upsert: false,
  });

  if (error) {
    throw new Error(
      error.message.includes("Bucket not found")
        ? "Bucket de imagens ainda não foi criado. Aplique a migration 023."
        : `Falha no upload: ${error.message}`,
    );
  }

  const { data } = supabase.storage.from("vitrine").getPublicUrl(nome);
  if (!data?.publicUrl) {
    throw new Error("Não foi possível obter o link público da imagem.");
  }
  return data.publicUrl;
}
