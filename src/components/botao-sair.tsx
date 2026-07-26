"use client";

import { useRouter } from "next/navigation";
import { sair } from "@/lib/sessao-cliente";

export function BotaoSair() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        void (async () => {
          await sair();
          const path = window.location.pathname;
          const destino = path.startsWith("/dono")
            ? "/admin"
            : path.startsWith("/restaurante")
              ? "/login"
              : "/";
          window.location.assign(destino);
        })();
      }}
      className="text-sm font-medium text-muted underline-offset-2 hover:underline"
    >
      Sair
    </button>
  );
}
