import type { Pedido, StatusPedido } from "@/types/database";

export const OPCOES_ETA_MINUTOS = [25, 35, 45, 60] as const;

export type MinutosEta = (typeof OPCOES_ETA_MINUTOS)[number];

/** Status em que ainda faz sentido mostrar a previsão */
const STATUS_COM_ETA: StatusPedido[] = [
  "aceito",
  "pronto",
  "a_caminho",
];

/**
 * Texto amigável da previsão para o cliente.
 * Usa o horário salvo; se passou, avisa que deve chegar em breve.
 */
export function textoPrevisaoEntrega(
  pedido: Pick<
    Pedido,
    "status" | "tempo_estimado_minutos" | "previsao_entrega_em"
  >,
  agora = new Date(),
): string | null {
  if (!STATUS_COM_ETA.includes(pedido.status)) return null;

  const minutos = pedido.tempo_estimado_minutos;
  if (!minutos || minutos < 1) return null;

  if (pedido.previsao_entrega_em) {
    const fim = new Date(pedido.previsao_entrega_em).getTime();
    if (!Number.isNaN(fim)) {
      const restante = Math.ceil((fim - agora.getTime()) / 60_000);
      if (restante <= 0) {
        return "Previsão: deve chegar em breve.";
      }
      if (restante === 1) {
        return "Previsão: chega em cerca de 1 minuto.";
      }
      return `Previsão: chega em cerca de ${restante} minutos.`;
    }
  }

  return `Previsão: cerca de ${minutos} minutos.`;
}
