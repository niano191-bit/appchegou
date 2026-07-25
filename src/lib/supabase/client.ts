import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
}

export function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
}

/** Indica se as chaves do Supabase estão configuradas no .env.local */
export function isSupabaseConfigured() {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

/**
 * Cliente do Supabase para uso no navegador e no servidor.
 * Só funciona depois de preencher NEXT_PUBLIC_SUPABASE_URL e
 * NEXT_PUBLIC_SUPABASE_ANON_KEY no arquivo .env.local
 */
export function createSupabaseClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase não configurado. Preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no arquivo .env.local",
    );
  }

  if (!client) {
    client = createClient(getSupabaseUrl(), getSupabaseAnonKey());
  }

  return client;
}
