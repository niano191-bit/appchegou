import { cookies } from "next/headers";
import {
  COOKIE_SESSAO,
  SENHA_DEMO,
  type SessaoUsuario,
} from "@/lib/auth";
import { lerBancoLocal, usandoModoDemo } from "@/lib/local-db";
import type { PapelUsuario } from "@/types/database";

export async function lerSessao(): Promise<SessaoUsuario | null> {
  const jar = await cookies();
  const bruto = jar.get(COOKIE_SESSAO)?.value;
  if (!bruto) return null;

  try {
    return JSON.parse(bruto) as SessaoUsuario;
  } catch {
    return null;
  }
}

export async function gravarSessao(sessao: SessaoUsuario) {
  const jar = await cookies();
  jar.set(COOKIE_SESSAO, JSON.stringify(sessao), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function limparSessao() {
  const jar = await cookies();
  jar.delete(COOKIE_SESSAO);
}

/** Login no modo demo: e-mail + senha teste123 */
export async function loginDemo(email: string, senha: string) {
  if (!usandoModoDemo()) {
    throw new Error(
      "Login com Supabase Auth ainda será ligado quando o banco na nuvem estiver ativo.",
    );
  }

  if (senha !== SENHA_DEMO) {
    throw new Error("Senha incorreta. No modo demo use: teste123");
  }

  const banco = await lerBancoLocal();
  const usuario = banco.usuarios.find(
    (u) => u.email?.toLowerCase() === email.trim().toLowerCase(),
  );

  if (!usuario) {
    throw new Error("Conta não encontrada.");
  }

  const sessao: SessaoUsuario = {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    papel: usuario.papel,
    restaurante_id: usuario.restaurante_id,
  };

  await gravarSessao(sessao);
  return sessao;
}

/** Exige login; se passar papel, exige esse papel */
export async function exigirSessao(papel?: PapelUsuario | PapelUsuario[]) {
  const sessao = await lerSessao();
  if (!sessao) {
    throw new Error("Faça login para continuar.");
  }

  if (papel) {
    const permitidos = Array.isArray(papel) ? papel : [papel];
    if (!permitidos.includes(sessao.papel)) {
      throw new Error("Você não tem permissão para esta área.");
    }
  }

  return sessao;
}
