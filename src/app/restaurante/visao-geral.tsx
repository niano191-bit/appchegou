"use client";

import type { SecaoLoja } from "./secoes-loja";

type Props = {
  pausado: boolean;
  pedidosNaFila: number;
  horarioAbertura: string;
  horarioFechamento: string;
  onIr: (secao: SecaoLoja) => void;
  onAlternarPausa: () => void;
  pausando: boolean;
};

export function VisaoGeralLoja({
  pausado,
  pedidosNaFila,
  horarioAbertura,
  horarioFechamento,
  onIr,
  onAlternarPausa,
  pausando,
}: Props) {
  const horario =
    horarioAbertura || horarioFechamento
      ? `${horarioAbertura || "—"} às ${horarioFechamento || "—"}`
      : "Horário geral do app";

  return (
    <div className="flex flex-col gap-3">
      <div
        className={`rounded-2xl border px-4 py-4 ${
          pausado
            ? "border-dende/40 bg-dende-suave"
            : "border-mar/30 bg-mar-suave/50"
        }`}
      >
        <p className="text-sm font-semibold text-foreground">
          {pausado ? "Loja pausada" : "Loja recebendo pedidos"}
        </p>
        <p className="mt-1 text-xs text-muted">Horário: {horario}</p>
        <button
          type="button"
          disabled={pausando}
          onClick={onAlternarPausa}
          className={`mt-3 w-full rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-60 ${
            pausado
              ? "bg-mar text-white"
              : "border border-dende text-dende"
          }`}
        >
          {pausando
            ? "Salvando…"
            : pausado
              ? "Retomar pedidos"
              : "Pausar pedidos"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onIr("pedidos")}
          className="rounded-2xl border border-linha bg-white px-4 py-4 text-left"
        >
          <p className="text-2xl font-semibold text-dende">{pedidosNaFila}</p>
          <p className="mt-1 text-xs text-muted">Pedidos novos</p>
        </button>
        <button
          type="button"
          onClick={() => onIr("produtos")}
          className="rounded-2xl border border-linha bg-white px-4 py-4 text-left"
        >
          <p className="text-sm font-semibold text-foreground">Produtos</p>
          <p className="mt-1 text-xs text-muted">Editar cardápio</p>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onIr("estoque")}
          className="rounded-2xl border border-linha bg-white px-4 py-3 text-left text-sm font-medium text-foreground"
        >
          Estoque / esgotados
        </button>
        <button
          type="button"
          onClick={() => onIr("financeiro")}
          className="rounded-2xl border border-linha bg-white px-4 py-3 text-left text-sm font-medium text-foreground"
        >
          Financeiro
        </button>
        <button
          type="button"
          onClick={() => onIr("horarios")}
          className="rounded-2xl border border-linha bg-white px-4 py-3 text-left text-sm font-medium text-foreground"
        >
          Horários
        </button>
        <button
          type="button"
          onClick={() => onIr("config")}
          className="rounded-2xl border border-linha bg-white px-4 py-3 text-left text-sm font-medium text-foreground"
        >
          Configurações
        </button>
      </div>
    </div>
  );
}
