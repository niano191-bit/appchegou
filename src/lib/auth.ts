import type { PapelUsuario } from "@/types/database";

/** Senha única das contas de teste (modo demo) */
export const SENHA_DEMO = "teste123";

export const COOKIE_SESSAO = "chegou_sessao";

export type SessaoUsuario = {
  id: string;
  nome: string;
  email: string | null;
  papel: PapelUsuario;
  restaurante_id: string | null;
};

/** Para onde cada papel vai depois do login */
export function destinoPorPapel(papel: PapelUsuario) {
  switch (papel) {
    case "cliente":
      return "/";
    case "restaurante":
      return "/restaurante";
    case "entregador":
      return "/entregador";
    case "dono":
      return "/dono";
  }
}

/** Contas de teste para a tela de login */
export const CONTAS_DEMO = [
  {
    rotulo: "Cliente Teste",
    email: "cliente.teste@chegou.local",
    papel: "cliente" as const,
  },
  {
    rotulo: "Restaurante (Acarajé)",
    email: "loja.acaraje@chegou.local",
    papel: "restaurante" as const,
  },
  {
    rotulo: "Entregador Teste",
    email: "entregador.teste@chegou.local",
    papel: "entregador" as const,
  },
  {
    rotulo: "Dono Teste",
    email: "dono.teste@chegou.local",
    papel: "dono" as const,
  },
];
