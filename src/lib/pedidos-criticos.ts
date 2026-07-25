import type { Pedido, StatusPagamento, StatusPedido } from "@/types/database";
import {
  SLA_NOVO_MINUTOS,
  SLA_PRONTO_SEM_ENTREGADOR_MINUTOS,
} from "@/lib/constantes";

export type MotivoCritico =
  | "sem_aceite"
  | "pronto_sem_entregador"
  | "passou_previsao";

export type PedidoCriticoInfo = {
  critico: boolean;
  motivo: MotivoCritico | null;
  rotulo: string | null;
  minutosParado: number;
};

const STATUS_ATIVOS: StatusPedido[] = [
  "novo",
  "aceito",
  "pronto",
  "a_caminho",
];

function minutosDesde(iso: string | null | undefined, agora: Date): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((agora.getTime() - t) / 60_000));
}

function pagamentoConta(status: StatusPagamento) {
  return status === "pago";
}

/**
 * Classifica atraso operacional (só pedidos pagos ainda em andamento).
 */
export function classificarPedidoCritico(
  pedido: Pick<
    Pedido,
    | "status"
    | "status_pagamento"
    | "entregador_id"
    | "criado_em"
    | "atualizado_em"
    | "previsao_entrega_em"
  >,
  agora = new Date(),
): PedidoCriticoInfo {
  if (!pagamentoConta(pedido.status_pagamento)) {
    return { critico: false, motivo: null, rotulo: null, minutosParado: 0 };
  }
  if (!STATUS_ATIVOS.includes(pedido.status)) {
    return { critico: false, motivo: null, rotulo: null, minutosParado: 0 };
  }

  if (
    pedido.previsao_entrega_em &&
    new Date(pedido.previsao_entrega_em).getTime() < agora.getTime()
  ) {
    const minutosParado = minutosDesde(pedido.previsao_entrega_em, agora);
    return {
      critico: true,
      motivo: "passou_previsao",
      rotulo: "Passou da previsão",
      minutosParado,
    };
  }

  if (pedido.status === "novo") {
    // Prefere atualizado_em (ex.: momento do pagamento) quando existir
    const ref = pedido.atualizado_em || pedido.criado_em;
    const minutosParado = minutosDesde(ref, agora);
    if (minutosParado >= SLA_NOVO_MINUTOS) {
      return {
        critico: true,
        motivo: "sem_aceite",
        rotulo: "Sem aceite da loja",
        minutosParado,
      };
    }
  }

  if (pedido.status === "pronto" && !pedido.entregador_id) {
    const minutosParado = minutosDesde(pedido.atualizado_em, agora);
    if (minutosParado >= SLA_PRONTO_SEM_ENTREGADOR_MINUTOS) {
      return {
        critico: true,
        motivo: "pronto_sem_entregador",
        rotulo: "Pronto sem entregador",
        minutosParado,
      };
    }
  }

  return { critico: false, motivo: null, rotulo: null, minutosParado: 0 };
}

const PESO: Record<MotivoCritico, number> = {
  passou_previsao: 3,
  pronto_sem_entregador: 2,
  sem_aceite: 1,
};

/** Críticos primeiro (mais graves / mais antigos) */
export function ordenarCriticosPrimeiro<T extends Pedido>(
  pedidos: T[],
  agora = new Date(),
): T[] {
  return pedidos.slice().sort((a, b) => {
    const ca = classificarPedidoCritico(a, agora);
    const cb = classificarPedidoCritico(b, agora);
    if (ca.critico !== cb.critico) return ca.critico ? -1 : 1;
    if (ca.critico && cb.critico) {
      const pa = PESO[ca.motivo!] ?? 0;
      const pb = PESO[cb.motivo!] ?? 0;
      if (pa !== pb) return pb - pa;
      return cb.minutosParado - ca.minutosParado;
    }
    return (
      new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
    );
  });
}

export function contarPedidosCriticos(
  pedidos: Pedido[],
  agora = new Date(),
): number {
  return pedidos.filter((p) => classificarPedidoCritico(p, agora).critico)
    .length;
}

export function textoMinutosParado(minutos: number) {
  if (minutos <= 0) return "agora";
  if (minutos === 1) return "há 1 min";
  return `há ${minutos} min`;
}
