import { isSupabaseConfigured } from "./client";

export type SupabaseStatus = {
  configured: boolean;
  message: string;
};

/** Verifica se o app consegue falar com o Supabase (só checa se as chaves existem). */
export function getSupabaseStatus(): SupabaseStatus {
  if (!isSupabaseConfigured()) {
    return {
      configured: false,
      message:
        "Ainda falta conectar. Crie o arquivo .env.local com as chaves do Supabase (veja o modelo em .env.example).",
    };
  }

  return {
    configured: true,
    message: "Chaves do Supabase encontradas. Pronto para a próxima fase.",
  };
}
