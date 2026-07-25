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
          router.push("/login");
          router.refresh();
        })();
      }}
      className="text-sm font-medium text-[#8A7460] underline-offset-2 hover:underline"
    >
      Sair
    </button>
  );
}
