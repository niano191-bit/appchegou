/** Papeis possiveis de um usuario na plataforma */
export type PapelUsuario = "cliente" | "restaurante" | "entregador" | "dono";

/** Fluxo do pedido: novo -> aceito -> pronto -> a_caminho -> entregue */
export type StatusPedido =
  | "novo"
  | "aceito"
  | "pronto"
  | "a_caminho"
  | "entregue"
  | "cancelado";

export type Usuario = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  papel: PapelUsuario;
  restaurante_id: string | null;
  /** So no servidor ? nunca enviar ao navegador */
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
  /** Loja pausou pedidos manualmente (ainda aparece na lista) */
  pausado: boolean;
  /** Valor mínimo do subtotal (sem taxa de entrega); 0 = sem mínimo */
  pedido_minimo: number;
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

/** Pagamento do pedido (Mercado Pago em teste ou simulacao) */
export type StatusPagamento =
  | "pendente"
  | "pago"
  | "falhou"
  | "estornado"
  | "reembolso_pendente";

export type FormaPagamento = "pix" | "cartao" | "dinheiro" | null;

export type CanceladoPor = "cliente" | "restaurante" | null;

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
  /** Nome do bairro/zona escolhido no checkout */
  bairro_entrega?: string | null;
  observacao: string | null;
  cancelado_por?: CanceladoPor;
  motivo_cancelamento?: string | null;
  /** Minutos estimados pela loja ao aceitar */
  tempo_estimado_minutos?: number | null;
  /** Horario previsto de entrega (aceitacao + minutos) */
  previsao_entrega_em?: string | null;
  /** Numero sequencial do dia em Salvador (1, 2, 3...) */
  numero_dia?: number | null;
  /** Data civil do pedido em Salvador (YYYY-MM-DD) */
  data_pedido?: string | null;
  /** Cliente pediu troco para este valor (dinheiro na entrega) */
  troco_para?: number | null;
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

export type GatewayPagamento = "mercadopago" | "lucpaguei";

/** Bairro com taxa de entrega propria (zona) */
export type BairroEntrega = {
  id: string;
  nome: string;
  taxa: number;
  ativo: boolean;
  ordem: number;
  criado_em: string;
};

/** Configuracoes gerais do app (taxa, horario e gateways) */
export type Configuracao = {
  /** Taxa padrao quando nao ha bairros ativos */
  taxa_entrega: number;
  horario_abertura: string;
  horario_fechamento: string;
  /** Aceitar Mercado Pago no checkout */
  pagamento_mercadopago: boolean;
  /** Aceitar LucPaguei no checkout */
  pagamento_lucpaguei: boolean;
  /** Aceitar dinheiro na entrega */
  pagamento_dinheiro: boolean;
};

/** Formata valor em reais: R$ 0,00 */
export function formatarReais(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Textos amigaveis dos status do pedido */
export const STATUS_PEDIDO_LABEL: Record<StatusPedido, string> = {
  novo: "Novo",
  aceito: "Aceito",
  pronto: "Pronto",
  a_caminho: "A caminho",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export const STATUS_PAGAMENTO_LABEL: Record<StatusPagamento, string> = {
  pendente: "Aguardando pagamento",
  pago: "Pago",
  falhou: "Pagamento falhou",
  estornado: "Pix estornado",
  reembolso_pendente: "Aguardando chave Pix para estorno",
};
