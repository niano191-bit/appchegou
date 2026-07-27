/** Seções do menu lateral da loja (`?secao=`) */
export type SecaoLoja =
  | "visao"
  | "pedidos"
  | "conversas"
  | "avaliacoes"
  | "produtos"
  | "categorias"
  | "adicionais"
  | "estoque"
  | "entregador"
  | "bairros"
  | "horarios"
  | "financeiro"
  | "repasses"
  | "cupons"
  | "pagamentos"
  | "impressao"
  | "config";

export const SECOES_LOJA: SecaoLoja[] = [
  "visao",
  "pedidos",
  "conversas",
  "avaliacoes",
  "produtos",
  "categorias",
  "adicionais",
  "estoque",
  "entregador",
  "bairros",
  "horarios",
  "financeiro",
  "repasses",
  "cupons",
  "pagamentos",
  "impressao",
  "config",
];

/** Aliases antigos → seção atual */
export const ALIAS_SECAO: Record<string, SecaoLoja> = {
  cardapio: "produtos",
  esgotado: "estoque",
  loja: "config",
};

export function normalizarSecaoLoja(
  valor: string | null | undefined,
): SecaoLoja {
  if (!valor) return "pedidos";
  if (ALIAS_SECAO[valor]) return ALIAS_SECAO[valor];
  if (SECOES_LOJA.includes(valor as SecaoLoja)) return valor as SecaoLoja;
  return "pedidos";
}

export const LABELS_SECAO: Record<SecaoLoja, string> = {
  visao: "Visão geral",
  pedidos: "Pedidos",
  conversas: "Conversas",
  avaliacoes: "Avaliações",
  produtos: "Produtos",
  categorias: "Categorias",
  adicionais: "Adicionais",
  estoque: "Estoque",
  entregador: "Chamar entregador",
  bairros: "Bairros e taxas",
  horarios: "Horários",
  financeiro: "Financeiro",
  repasses: "Repasses",
  cupons: "Cupons",
  pagamentos: "Formas de pagamento",
  impressao: "Impressão",
  config: "Configurações",
};
