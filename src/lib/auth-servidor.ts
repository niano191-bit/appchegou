import { cookies } from "next/headers";
import {
  COOKIE_SESSAO,
  SENHA_DEMO,
  type SessaoUsuario,
} from "@/lib/auth";
import {
  cadastrarClienteLocal,
  criarEntregadorLocal,
  lerBancoLocal,
  usandoModoDemo,
} from "@/lib/local-db";
import { gerarHashSenha, verificarSenha } from "@/lib/senha";
import { createSupabaseClient } from "@/lib/supabase/client";
import type { PapelUsuario, Usuario } from "@/types/database";

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
    secure: process.env.VERCEL === "1",
  });
}

export async function limparSessao() {
  const jar = await cookies();
  jar.delete(COOKIE_SESSAO);
}

function sessaoDeUsuario(usuario: Usuario): SessaoUsuario {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    papel: usuario.papel,
    restaurante_id: usuario.restaurante_id,
  };
}

function senhaConfere(senha: string, usuario: Usuario) {
  if (usuario.senha_hash) {
    return verificarSenha(senha, usuario.senha_hash);
  }
  // Contas antigas / demo sem hash
  return senha === SENHA_DEMO;
}

/** Login com e-mail e senha (hash ou senha de teste em contas antigas) */
export async function loginComSenha(email: string, senha: string) {
  const emailLimpo = email.trim().toLowerCase();
  let usuario: Usuario | null = null;

  if (usandoModoDemo()) {
    const banco = await lerBancoLocal();
    usuario =
      banco.usuarios.find((u) => u.email?.toLowerCase() === emailLimpo) ??
      null;
  } else {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .ilike("email", emailLimpo)
      .maybeSingle();

    if (error) throw new Error(error.message);
    usuario = (data as Usuario | null) ?? null;
  }

  if (!usuario) {
    throw new Error("Conta não encontrada.");
  }

  if (!senhaConfere(senha, usuario)) {
    throw new Error("Senha incorreta.");
  }

  const sessao = sessaoDeUsuario(usuario);
  await gravarSessao(sessao);
  return sessao;
}

/** @deprecated use loginComSenha */
export const loginDemo = loginComSenha;

function validarSenhaNova(senha: string) {
  if (senha.length < 6) {
    throw new Error("A senha precisa ter pelo menos 6 caracteres.");
  }
}

/** Cadastro de cliente com e-mail e senha próprios */
export async function cadastrarCliente(entrada: {
  nome: string;
  email: string;
  telefone?: string;
  senha: string;
}) {
  const nome = entrada.nome.trim();
  const email = entrada.email.trim().toLowerCase();
  if (!nome) throw new Error("Informe seu nome.");
  if (!email.includes("@")) throw new Error("Informe um e-mail válido.");
  validarSenhaNova(entrada.senha);

  const senha_hash = gerarHashSenha(entrada.senha);

  if (usandoModoDemo()) {
    const usuario = await cadastrarClienteLocal({
      nome,
      email,
      telefone: entrada.telefone,
      senha_hash,
    });
    const sessao = sessaoDeUsuario(usuario);
    await gravarSessao(sessao);
    return sessao;
  }

  const supabase = createSupabaseClient();
  const { data: existente } = await supabase
    .from("usuarios")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  if (existente) throw new Error("Já existe uma conta com este e-mail.");

  const { data, error } = await supabase
    .from("usuarios")
    .insert({
      nome,
      email,
      telefone: entrada.telefone?.trim() || null,
      papel: "cliente",
      restaurante_id: null,
      senha_hash,
    })
    .select("*")
    .single();

  if (error) {
    if (error.message.toLowerCase().includes("duplicate")) {
      throw new Error("Já existe uma conta com este e-mail.");
    }
    throw new Error(error.message);
  }

  const sessao = sessaoDeUsuario(data as Usuario);
  await gravarSessao(sessao);
  return sessao;
}

/** Dono cria entregador com login */
export async function criarEntregador(entrada: {
  nome: string;
  email: string;
  telefone?: string;
  senha: string;
}) {
  const nome = entrada.nome.trim();
  const email = entrada.email.trim().toLowerCase();
  if (!nome) throw new Error("Informe o nome do entregador.");
  if (!email.includes("@")) throw new Error("Informe um e-mail válido.");
  validarSenhaNova(entrada.senha);

  const senha_hash = gerarHashSenha(entrada.senha);

  if (usandoModoDemo()) {
    return criarEntregadorLocal({
      nome,
      email,
      telefone: entrada.telefone,
      senha_hash,
    });
  }

  const supabase = createSupabaseClient();
  const { data: existente } = await supabase
    .from("usuarios")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  if (existente) throw new Error("Já existe uma conta com este e-mail.");

  const { data, error } = await supabase
    .from("usuarios")
    .insert({
      nome,
      email,
      telefone: entrada.telefone?.trim() || null,
      papel: "entregador",
      restaurante_id: null,
      senha_hash,
      disponibilidade: "offline",
    })
    .select(
      "id, nome, email, telefone, papel, restaurante_id, disponibilidade, criado_em",
    )
    .single();

  if (error) throw new Error(error.message);
  return data as Usuario;
}

/** Exige login; se passar papel, exige esse papel. Admin (dono) acessa todos. */
export async function exigirSessao(papel?: PapelUsuario | PapelUsuario[]) {
  const sessao = await lerSessao();
  if (!sessao) {
    throw new Error("Faça login para continuar.");
  }

  if (papel) {
    const permitidos = Array.isArray(papel) ? papel : [papel];
    if (sessao.papel === "dono") {
      return sessao;
    }
    if (!permitidos.includes(sessao.papel)) {
      throw new Error("Você não tem permissão para esta área.");
    }
  }

  return sessao;
}
