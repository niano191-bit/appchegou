import type { PapelUsuario } from "@/types/database";

/** Entradas públicas de login (cada papel tem seu link) */
export const ACESSOS_LOGIN = [
  {
    papel: "cliente" as const,
    titulo: "Cliente",
    descricao: "Pedir comida e acompanhar entrega",
    href: "/login/cliente",
    destino: "/",
  },
  {
    papel: "restaurante" as const,
    titulo: "Restaurante",
    descricao: "Pedidos, cardápio e sua loja",
    href: "/login/restaurante",
    destino: "/restaurante",
  },
  {
    papel: "entregador" as const,
    titulo: "Entregador",
    descricao: "Aceitar corridas e entregar",
    href: "/login/entregador",
    destino: "/entregador",
  },
  {
    papel: "dono" as const,
    titulo: "Admin",
    descricao: "Operação completa — acessa todas as áreas",
    href: "/admin",
    destino: "/dono",
  },
] as const;

export function loginHrefPorPapel(papel: PapelUsuario) {
  return ACESSOS_LOGIN.find((a) => a.papel === papel)?.href ?? "/login";
}
