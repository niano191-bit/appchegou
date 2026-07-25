import { dataPedidoSalvador } from "@/lib/horario";
import { MARCA } from "@/lib/marca";
import { formatarReais } from "@/types/database";
import type { Pedido, StatusPedido } from "@/types/database";

export type LinhaLojaFechamento = {
  nome: string;
  pedidos: number;
  faturamento: number;
  comissao: number;
};

export type LinhaEntregadorFechamento = {
  nome: string;
  entregas: number;
  valor: number;
};

export type FechamentoDia = {
  data: string;
  data_label: string;
  qtd_pedidos: number;
  faturamento: number;
  faturamento_pix: number;
  faturamento_dinheiro: number;
  comissao: number;
  ticket_medio: number;
  taxa_entrega_total: number;
  entregues: number;
  cancelados: number;
  em_andamento: number;
  por_loja: LinhaLojaFechamento[];
  por_entregador: LinhaEntregadorFechamento[];
};

type PedidoFechamento = Pick<
  Pedido,
  | "status"
  | "status_pagamento"
  | "forma_pagamento"
  | "total"
  | "taxa_entrega"
  | "criado_em"
> & {
  restaurante_nome?: string;
  comissao_valor?: number;
};

const EM_ANDAMENTO: StatusPedido[] = [
  "novo",
  "aceito",
  "pronto",
  "a_caminho",
];

function noIntervalo(
  iso: string,
  inicio: number,
  fim: number,
) {
  const t = new Date(iso).getTime();
  return t >= inicio && t <= fim;
}

/** Monta o fechamento a partir dos pedidos do dia + ganhos dos entregadores */
export function montarFechamentoDia(entrada: {
  pedidos: PedidoFechamento[];
  inicio: number;
  fim: number;
  data?: string;
  ganhosEntregadores?: LinhaEntregadorFechamento[];
}): FechamentoDia {
  const data = entrada.data ?? dataPedidoSalvador();
  const doDia = entrada.pedidos.filter(
    (p) =>
      p.status_pagamento === "pago" &&
      noIntervalo(p.criado_em, entrada.inicio, entrada.fim),
  );

  const cancelados = entrada.pedidos.filter(
    (p) =>
      p.status === "cancelado" &&
      noIntervalo(p.criado_em, entrada.inicio, entrada.fim),
  ).length;

  const qtd = doDia.length;
  const faturamento = doDia.reduce((s, p) => s + Number(p.total), 0);
  const faturamento_dinheiro = doDia
    .filter((p) => p.forma_pagamento === "dinheiro")
    .reduce((s, p) => s + Number(p.total), 0);
  const faturamento_pix = faturamento - faturamento_dinheiro;
  const comissao = doDia.reduce((s, p) => s + Number(p.comissao_valor ?? 0), 0);
  const taxa_entrega_total = doDia.reduce(
    (s, p) => s + Number(p.taxa_entrega),
    0,
  );
  const entregues = doDia.filter((p) => p.status === "entregue").length;
  const em_andamento = doDia.filter((p) =>
    EM_ANDAMENTO.includes(p.status),
  ).length;

  const porLojaMap = new Map<string, LinhaLojaFechamento>();
  for (const p of doDia) {
    const nome = p.restaurante_nome?.trim() || "Restaurante";
    const atual = porLojaMap.get(nome) ?? {
      nome,
      pedidos: 0,
      faturamento: 0,
      comissao: 0,
    };
    atual.pedidos += 1;
    atual.faturamento += Number(p.total);
    atual.comissao += Number(p.comissao_valor ?? 0);
    porLojaMap.set(nome, atual);
  }

  const por_loja = [...porLojaMap.values()].sort(
    (a, b) => b.faturamento - a.faturamento || a.nome.localeCompare(b.nome, "pt-BR"),
  );

  const por_entregador = (entrada.ganhosEntregadores ?? [])
    .filter((g) => g.entregas > 0 || g.valor > 0)
    .slice()
    .sort((a, b) => b.valor - a.valor || a.nome.localeCompare(b.nome, "pt-BR"));

  let data_label = data;
  try {
    data_label = new Date(`${data}T12:00:00-03:00`).toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    /* mantém YYYY-MM-DD */
  }

  return {
    data,
    data_label,
    qtd_pedidos: qtd,
    faturamento,
    faturamento_pix,
    faturamento_dinheiro,
    comissao,
    ticket_medio: qtd > 0 ? faturamento / qtd : 0,
    taxa_entrega_total,
    entregues,
    cancelados,
    em_andamento,
    por_loja,
    por_entregador,
  };
}

/** Texto pronto para WhatsApp */
export function textoFechamentoWhatsApp(f: FechamentoDia) {
  const linhas: (string | null)[] = [
    `*${MARCA.nome}*`,
    `*Fechamento do dia*`,
    f.data_label,
    "",
    `Pedidos pagos: ${f.qtd_pedidos}`,
    `Entregues: ${f.entregues}`,
    `Em andamento: ${f.em_andamento}`,
    `Cancelados: ${f.cancelados}`,
    "",
    `Faturamento: ${formatarReais(f.faturamento)}`,
    `  Pix/online: ${formatarReais(f.faturamento_pix)}`,
    `  Dinheiro: ${formatarReais(f.faturamento_dinheiro)}`,
    `Comissão: ${formatarReais(f.comissao)}`,
    `Taxas de entrega: ${formatarReais(f.taxa_entrega_total)}`,
    `Ticket médio: ${formatarReais(f.ticket_medio)}`,
  ];

  if (f.por_loja.length > 0) {
    linhas.push("", "*Por loja*");
    for (const loja of f.por_loja) {
      linhas.push(
        `• ${loja.nome}: ${loja.pedidos} ped. · ${formatarReais(loja.faturamento)} · com. ${formatarReais(loja.comissao)}`,
      );
    }
  }

  if (f.por_entregador.length > 0) {
    linhas.push("", "*Entregadores*");
    for (const e of f.por_entregador) {
      linhas.push(
        `• ${e.nome}: ${e.entregas} · ${formatarReais(e.valor)}`,
      );
    }
  }

  linhas.push("", "_Gerado no app_");
  return linhas.filter((l) => l !== null).join("\n");
}

export function linkWhatsAppFechamento(f: FechamentoDia) {
  return `https://wa.me/?text=${encodeURIComponent(textoFechamentoWhatsApp(f))}`;
}
