"use client";

import { useEffect, useRef, useState } from "react";
import { useTempoRealPedidos } from "@/hooks/use-tempo-real-pedidos";
import { liberarAudioAlerta, tocarAlertaPedido } from "@/lib/alerta-som";

type Props = {
  /** Chave única para lembrar o último total visto */
  chave: string;
  /** Conta itens “novos” na fila (ex.: pedidos novo, corridas pronto) */
  contar: () => Promise<number>;
  /** Mensagem quando a fila cresce */
  mensagem: (quantidade: number) => string;
  ativo?: boolean;
  /** Toca bipe quando a fila cresce (loja / entregador) */
  som?: boolean;
};

/** Avisa loja/entregador quando entram itens novos na fila */
export function AvisoFila({
  chave,
  contar,
  mensagem,
  ativo = true,
  som = true,
}: Props) {
  const [aviso, setAviso] = useState<string | null>(null);
  const [somPronto, setSomPronto] = useState(false);
  const ultimoRef = useRef<number | null>(null);
  const pediuPermissao = useRef(false);
  const chaveSom = `${chave}-som-ok`;

  useEffect(() => {
    if (!ativo || typeof window === "undefined") return;
    if (sessionStorage.getItem(chaveSom) === "1") {
      void liberarAudioAlerta().then((ok) => setSomPronto(ok));
    }
    if (
      !pediuPermissao.current &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      pediuPermissao.current = true;
      void Notification.requestPermission();
    }
  }, [ativo, chaveSom]);

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
        if (som) tocarAlertaPedido(3);
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

  async function ativarSom() {
    const ok = await liberarAudioAlerta();
    setSomPronto(ok);
    if (ok) {
      sessionStorage.setItem(chaveSom, "1");
      tocarAlertaPedido(1);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {som && !somPronto ? (
        <button
          type="button"
          onClick={() => void ativarSom()}
          className="rounded-2xl border border-mar/40 bg-mar-suave/50 px-4 py-3 text-left text-sm font-medium text-mar"
        >
          Ativar som de novos pedidos (toque uma vez)
        </button>
      ) : null}

      {aviso ? (
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
      ) : null}
    </div>
  );
}
