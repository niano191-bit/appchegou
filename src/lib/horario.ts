import type { Configuracao, Restaurante } from "@/types/database";

/** Converte "HH:MM" em minutos desde meia-noite */
export function horaParaMinutos(hora: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hora.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Horário atual em Salvador (America/Bahia) em minutos */
export function minutosAgoraSalvador(agora = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Bahia",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(agora);

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

/**
 * Está dentro do horário de funcionamento?
 * Se abertura > fechamento, considera virada de dia (ex: 18:00–02:00).
 */
export function estaDentroDoHorario(
  abertura: string,
  fechamento: string,
  agora = new Date(),
): boolean {
  const a = horaParaMinutos(abertura);
  const f = horaParaMinutos(fechamento);
  if (a === null || f === null) return true;
  if (a === f) return true;

  const agoraMin = minutosAgoraSalvador(agora);

  if (a < f) {
    return agoraMin >= a && agoraMin < f;
  }
  // Ex.: 18:00 → 02:00
  return agoraMin >= a || agoraMin < f;
}

export type StatusOperacaoLoja =
  | "aberta"
  | "pausada"
  | "fora_horario"
  | "inativa";

export function statusOperacaoLoja(
  loja: Pick<Restaurante, "ativo" | "pausado">,
  config: Pick<Configuracao, "horario_abertura" | "horario_fechamento">,
  agora = new Date(),
): StatusOperacaoLoja {
  if (!loja.ativo) return "inativa";
  if (loja.pausado) return "pausada";
  if (
    !estaDentroDoHorario(
      config.horario_abertura,
      config.horario_fechamento,
      agora,
    )
  ) {
    return "fora_horario";
  }
  return "aberta";
}

export function rotuloStatusOperacao(status: StatusOperacaoLoja): string {
  switch (status) {
    case "aberta":
      return "Aberto";
    case "pausada":
      return "Pausado";
    case "fora_horario":
      return "Fechado agora";
    case "inativa":
      return "Indisponível";
  }
}

export function mensagemBloqueioPedido(
  status: StatusOperacaoLoja,
  config: Pick<Configuracao, "horario_abertura" | "horario_fechamento">,
): string {
  switch (status) {
    case "pausada":
      return "Esta loja pausou os pedidos por enquanto. Tente mais tarde.";
    case "fora_horario":
      return `Estamos fechados agora. Funcionamento: ${config.horario_abertura} às ${config.horario_fechamento} (Salvador).`;
    case "inativa":
      return "Esta loja não está disponível.";
    default:
      return "";
  }
}
