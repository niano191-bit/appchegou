import { dataPedidoSalvador } from "@/lib/horario";
import { MARCA } from "@/lib/marca";
import { formatarReais } from "@/types/database";
import type { Pedido, StatusPedido } from "@/types/database";

export type LinhaLojaFechamento = {
  restaurante_id?: string | null;
  nome: string;
  chave_pix?: string | null;
  pedidos: number;
  faturamento: number;
  faturamento_pix: number;
  faturamento_dinheiro: number;
  comissao: number;
  /** Faturamento - comissão (o que a loja "ganhou" nos itens) */
  liquido: number;
  /**
   * Quanto a plataforma deve transferir via Pix para a loja.
   * Se negativo, a loja deve esse valor à plataforma (ex.: muita venda em dinheiro).
   */
  repasse_pix: number;
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
  gorjeta_total: number;
  /** Soma dos repasses positivos às lojas */
  repasse_pix_total: number;
  /** Soma do que as lojas devem (repasses negativos) */
  a_receber_lojas: number;
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
  | "gorjeta"
  | "criado_em"
> & {
  restaurante_id?: string;
  restaurante_nome?: string;
  chave_pix?: string | null;
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

function ehDinheiro(p: PedidoFechamento) {
  return p.forma_pagamento === "dinheiro";
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
    .filter(ehDinheiro)
    .reduce((s, p) => s + Number(p.total), 0);
  const faturamento_pix = faturamento - faturamento_dinheiro;
  const comissao = doDia.reduce((s, p) => s + Number(p.comissao_valor ?? 0), 0);
  const taxa_entrega_total = doDia.reduce(
    (s, p) => s + Number(p.taxa_entrega),
    0,
  );
  const gorjeta_total = doDia.reduce(
    (s, p) => s + Number(p.gorjeta ?? 0),
    0,
  );
  const entregues = doDia.filter((p) => p.status === "entregue").length;
  const em_andamento = doDia.filter((p) =>
    EM_ANDAMENTO.includes(p.status),
  ).length;

  const porLojaMap = new Map<string, LinhaLojaFechamento>();
  for (const p of doDia) {
    const nome = p.restaurante_nome?.trim() || "Restaurante";
    const chaveMapa = p.restaurante_id?.trim() || nome;
    const atual = porLojaMap.get(chaveMapa) ?? {
      restaurante_id: p.restaurante_id ?? null,
      nome,
      chave_pix: p.chave_pix?.trim() || null,
      pedidos: 0,
      faturamento: 0,
      faturamento_pix: 0,
      faturamento_dinheiro: 0,
      comissao: 0,
      liquido: 0,
      repasse_pix: 0,
    };
    if (!atual.chave_pix && p.chave_pix?.trim()) {
      atual.chave_pix = p.chave_pix.trim();
    }
    const total = Number(p.total);
    const com = Number(p.comissao_valor ?? 0);
    atual.pedidos += 1;
    atual.faturamento += total;
    atual.comissao += com;
    if (ehDinheiro(p)) {
      atual.faturamento_dinheiro += total;
    } else {
      atual.faturamento_pix += total;
    }
    porLojaMap.set(chaveMapa, atual);
  }

  const por_loja = [...porLojaMap.values()]
    .map((loja) => {
      const liquido = loja.faturamento - loja.comissao;
      const repasse_pix = loja.faturamento_pix - loja.comissao;
      return {
        ...loja,
        liquido: Number(liquido.toFixed(2)),
        repasse_pix: Number(repasse_pix.toFixed(2)),
      };
    })
    .sort(
      (a, b) =>
        b.repasse_pix - a.repasse_pix ||
        b.faturamento - a.faturamento ||
        a.nome.localeCompare(b.nome, "pt-BR"),
    );

  const repasse_pix_total = por_loja
    .filter((l) => l.repasse_pix > 0)
    .reduce((s, l) => s + l.repasse_pix, 0);
  const a_receber_lojas = por_loja
    .filter((l) => l.repasse_pix < 0)
    .reduce((s, l) => s + Math.abs(l.repasse_pix), 0);

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
    gorjeta_total,
    repasse_pix_total: Number(repasse_pix_total.toFixed(2)),
    a_receber_lojas: Number(a_receber_lojas.toFixed(2)),
    entregues,
    cancelados,
    em_andamento,
    por_loja,
    por_entregador,
  };
}

function textoRepasseLoja(loja: LinhaLojaFechamento) {
  if (loja.repasse_pix > 0) {
    return `→ Transferir Pix: ${formatarReais(loja.repasse_pix)}`;
  }
  if (loja.repasse_pix < 0) {
    return `→ Loja deve: ${formatarReais(Math.abs(loja.repasse_pix))}`;
  }
  return `→ Sem transferir (zerado)`;
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
    f.gorjeta_total > 0
      ? `Gorjetas: ${formatarReais(f.gorjeta_total)}`
      : null,
    `Ticket médio: ${formatarReais(f.ticket_medio)}`,
    "",
    `*Repasse às lojas (Pix):* ${formatarReais(f.repasse_pix_total)}`,
    f.a_receber_lojas > 0
      ? `*A receber das lojas:* ${formatarReais(f.a_receber_lojas)}`
      : null,
  ];

  if (f.por_loja.length > 0) {
    linhas.push("", "*Por loja*");
    for (const loja of f.por_loja) {
      linhas.push(
        `• *${loja.nome}* (${loja.pedidos} ped.)`,
        `  Fat. ${formatarReais(loja.faturamento)} · Pix ${formatarReais(loja.faturamento_pix)} · Din. ${formatarReais(loja.faturamento_dinheiro)}`,
        `  Comissão ${formatarReais(loja.comissao)} · Líquido ${formatarReais(loja.liquido)}`,
        `  ${textoRepasseLoja(loja)}`,
        loja.chave_pix?.trim()
          ? `  Chave Pix: ${loja.chave_pix.trim()}`
          : `  Chave Pix: (cadastrar na loja)`,
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
