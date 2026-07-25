import Link from "next/link";
import { BotaoSair } from "@/components/botao-sair";
import { lerSessao } from "@/lib/auth-servidor";
import { PainelDono } from "./painel-dono";

export const metadata = {
  title: "Painel do Dono — Chegou",
  description: "Operação, comissões, entregadores e configurações.",
};

export default async function PaginaDono() {
  const sessao = await lerSessao();

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="text-sm font-medium text-[#C45C26] underline-offset-2 hover:underline"
          >
            ← Início
          </Link>
          <BotaoSair />
        </div>
        <p className="text-sm font-medium tracking-wide text-[#8A7460] uppercase">
          {sessao?.nome ?? "Dono"}
        </p>
        <h1 className="font-display text-3xl text-[#1A120C]">
          Painel do Dono
        </h1>
        <p className="text-sm leading-relaxed text-[#5C4A3A]">
          Visão da operação do dia. Só quem tem papel dono entra aqui.
        </p>
      </header>

      <PainelDono />
    </div>
  );
}
