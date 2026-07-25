/** Papéis possíveis de um usuário na plataforma */
export type PapelUsuario = "cliente" | "restaurante" | "entregador" | "dono";

/** Fluxo do pedido: novo → aceito → pronto → a_caminho → entregue */
export type StatusPedido =
  | "novo"
  | "aceito"
  | "pronto"
  | "a_caminho"
  | "entregue";

export type Usuario = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  papel: PapelUsuario;
  restaurante_id: string | null;
  /** Só no servidor — nunca enviar ao navegador */
  senha_hash?: string | null;
  criado_em: string;
};

export type Restaurante = {
  id: string;
  nome: string;
  descricao: string | null;
  endereco: string | null;
  imagem_url: string | null;
  comissao_percentual: number;
  ativo: boolean;
  criado_em: string;
};

export type ItemCardapio = {
  id: string;
  restaurante_id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  disponivel: boolean;
  imagem_url: string | null;
  criado_em: string;
};

/** Pagamento do pedido (Mercado Pago em teste ou simulação) */
export type StatusPagamento = "pendente" | "pago" | "falhou";

export type FormaPagamento = "pix" | "cartao" | null;

export type Pedido = {
  id: string;
  cliente_id: string;
  restaurante_id: string;
  entregador_id: string | null;
  status: StatusPedido;
  status_pagamento: StatusPagamento;
  forma_pagamento: FormaPagamento;
  mp_payment_id: string | null;
  total: number;
  taxa_entrega: number;
  endereco_entrega: string;
  observacao: string | null;
  criado_em: string;
  atualizado_em: string;
};

export type ItemPedido = {
  id: string;
  pedido_id: string;
  item_cardapio_id: string | null;
  nome: string;
  preco_unitario: number;
  quantidade: number;
};

/** Configurações gerais do app (taxa e horário) */
export type Configuracao = {
  taxa_entrega: number;
  horario_abertura: string;
  horario_fechamento: string;
};

/** Formata valor em reais: R$ 0,00 */
export function formatarReais(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Textos amigáveis dos status do pedido */
export const STATUS_PEDIDO_LABEL: Record<StatusPedido, string> = {
  novo: "Novo",
  aceito: "Aceito",
  pronto: "Pronto",
  a_caminho: "A caminho",
  entregue: "Entregue",
};

export const STATUS_PAGAMENTO_LABEL: Record<StatusPagamento, string> = {
  pendente: "Aguardando pagamento",
  pago: "Pago",
  falhou: "Pagamento falhou",
};
