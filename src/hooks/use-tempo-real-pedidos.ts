"use client";

import { useEffect, useRef } from "react";
import {
  createSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

/**
 * Avisa a tela quando algum pedido muda.
 * Com Supabase: escuta em tempo real.
 * Se o realtime falhar: atualiza a cada 2 segundos.
 */
export function useTempoRealPedidos(onMudanca: () => void) {
  const onMudancaRef = useRef(onMudanca);
  onMudancaRef.current = onMudanca;

  useEffect(() => {
    const disparar = () => {
      onMudancaRef.current();
    };

    let intervalo: number | undefined;
    let supabase: ReturnType<typeof createSupabaseClient> | null = null;
    let canal: ReturnType<
      ReturnType<typeof createSupabaseClient>["channel"]
    > | null = null;

    const usarPolling = () => {
      if (intervalo != null) return;
      intervalo = window.setInterval(disparar, 2000);
    };

    if (isSupabaseConfigured()) {
      try {
        supabase = createSupabaseClient();
        // Nome único: o cliente Supabase é singleton e reutilizar
        // "chegou-pedidos" após subscribe() quebra o painel no remount.
        const nome = `chegou-pedidos-${crypto.randomUUID()}`;
        canal = supabase
          .channel(nome)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "pedidos" },
            disparar,
          )
          .subscribe((status) => {
            if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              usarPolling();
            }
          });
      } catch {
        usarPolling();
      }
    } else {
      usarPolling();
    }

    return () => {
      if (intervalo != null) window.clearInterval(intervalo);
      if (supabase && canal) {
        void supabase.removeChannel(canal);
      }
    };
  }, []);
}
