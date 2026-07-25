"use client";

import { useEffect, useRef, useState } from "react";
import { useTempoRealPedidos } from "@/hooks/use-tempo-real-pedidos";
import { STATUS_PEDIDO_LABEL, type StatusPedido } from "@/types/database";

type Props = {
  /** Texto fixo ou função que busca o status atual */
  buscarStatus: () => Promise<{
    status: StatusPedido;
    rotuloExtra?: string;
  } | null>;
  /** Pedido em acompanhamento (cliente) */
  ativo?: boolean;
};

/**
 * Mostra aviso na tela (e notificação do navegador, se permitida)
 * quando o status do pedido muda.
 */
export function AvisoPedido({ buscarStatus, ativo = true }: Props) {
  const [aviso, setAviso] = useState<string | null>(null);
  const ultimoRef = useRef<StatusPedido | null>(null);
  const pediuPermissao = useRef(false);

  useEffect(() => {
    if (!ativo || typeof window === "undefined") return;
    if (
      !pediuPermissao.current &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      pediuPermissao.current = true;
      void Notification.requestPermission();
    }
  }, [ativo]);

  useEffect(() => {
    if (!ativo) return;
    void (async () => {
      const atual = await buscarStatus();
      if (atual) ultimoRef.current = atual.status;
    })();
  }, [ativo, buscarStatus]);

  useTempoRealPedidos(() => {
    if (!ativo) return;
    void (async () => {
      const atual = await buscarStatus();
      if (!atual) return;
      const anterior = ultimoRef.current;
      if (anterior && anterior !== atual.status) {
        const texto = `Pedido agora: ${STATUS_PEDIDO_LABEL[atual.status]}${
          atual.rotuloExtra ? ` — ${atual.rotuloExtra}` : ""
        }`;
        setAviso(texto);
        if (
          typeof window !== "undefined" &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          new Notification("Tentações da Neuza", { body: texto });
        }
      }
      ultimoRef.current = atual.status;
    })();
  });

  if (!aviso) return null;

  return (
    <div className="marca-entrada rounded-2xl border border-mar/40 bg-mar-suave px-5 py-4 text-sm text-mar">
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium">{aviso}</p>
        <button
          type="button"
          onClick={() => setAviso(null)}
          className="shrink-0 text-xs font-semibold underline-offset-2 hover:underline"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
