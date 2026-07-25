"use client";

import { useEffect, useRef } from "react";
import {
  createSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

/**
 * Avisa a tela quando algum pedido muda.
 * Com Supabase: escuta em tempo real.
 * No modo demo: atualiza a cada 2 segundos (até o Docker/Supabase estar ok).
 */
export function useTempoRealPedidos(onMudanca: () => void) {
  const onMudancaRef = useRef(onMudanca);
  onMudancaRef.current = onMudanca;

  useEffect(() => {
    const disparar = () => {
      onMudancaRef.current();
    };

    if (isSupabaseConfigured()) {
      const supabase = createSupabaseClient();
      const canal = supabase
        .channel("chegou-pedidos")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "pedidos" },
          disparar,
        )
        .subscribe();

      return () => {
        void supabase.removeChannel(canal);
      };
    }

    const intervalo = window.setInterval(disparar, 2000);
    return () => window.clearInterval(intervalo);
  }, []);
}
