"use client";

import { useEffect, useRef, useState } from "react";
import { useTempoRealPedidos } from "@/hooks/use-tempo-real-pedidos";

type Props = {
  /** Chave única para lembrar o último total visto */
  chave: string;
  /** Conta itens “novos” na fila (ex.: pedidos novo, corridas pronto) */
  contar: () => Promise<number>;
  /** Mensagem quando a fila cresce */
  mensagem: (quantidade: number) => string;
  ativo?: boolean;
};

/** Avisa loja/entregador quando entram itens novos na fila */
export function AvisoFila({
  chave,
  contar,
  mensagem,
  ativo = true,
}: Props) {
  const [aviso, setAviso] = useState<string | null>(null);
  const ultimoRef = useRef<number | null>(null);
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
      const n = await contar();
      const guardado = Number(sessionStorage.getItem(chave));
      ultimoRef.current = Number.isFinite(guardado) ? guardado : n;
      sessionStorage.setItem(chave, String(ultimoRef.current));
    })();
  }, [ativo, chave, contar]);

  useTempoRealPedidos(() => {
    if (!ativo) return;
    void (async () => {
      const n = await contar();
      const anterior = ultimoRef.current ?? n;
      if (n > anterior) {
        const texto = mensagem(n - anterior);
        setAviso(texto);
        if (
          typeof window !== "undefined" &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          new Notification("Tentações da Neuza", { body: texto });
        }
      }
      ultimoRef.current = n;
      sessionStorage.setItem(chave, String(n));
    })();
  });

  if (!aviso) return null;

  return (
    <div className="marca-entrada rounded-2xl border border-dende/40 bg-dende-suave px-5 py-4 text-sm text-dende-escuro">
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
