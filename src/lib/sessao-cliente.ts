import type { SessaoUsuario } from "@/lib/auth";

/** Busca a sessão no navegador */
export async function obterSessaoCliente() {
  const resposta = await fetch("/api/auth/me", { cache: "no-store" });
  const json = (await resposta.json()) as { sessao?: SessaoUsuario | null };
  return json.sessao ?? null;
}

/** Entra com e-mail e senha */
export async function entrar(email: string, senha: string) {
  const resposta = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, senha }),
  });
  const json = (await resposta.json()) as {
    sessao?: SessaoUsuario;
    destino?: string;
    erro?: string;
  };

  if (!resposta.ok) {
    throw new Error(json.erro ?? "Não foi possível entrar.");
  }

  return { sessao: json.sessao!, destino: json.destino! };
}

/** Cria conta de cliente e já entra */
export async function cadastrar(entrada: {
  nome: string;
  email: string;
  telefone?: string;
  senha: string;
}) {
  const resposta = await fetch("/api/auth/cadastro", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entrada),
  });
  const json = (await resposta.json()) as {
    sessao?: SessaoUsuario;
    destino?: string;
    erro?: string;
  };

  if (!resposta.ok) {
    throw new Error(json.erro ?? "Não foi possível cadastrar.");
  }

  return { sessao: json.sessao!, destino: json.destino! };
}

/** Sai da conta */
export async function sair() {
  await fetch("/api/auth/logout", { method: "POST" });
}
