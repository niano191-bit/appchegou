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
          router.push("/");
          router.refresh();
        })();
      }}
      className="text-sm font-medium text-muted underline-offset-2 hover:underline"
    >
      Sair
    </button>
  );
}
