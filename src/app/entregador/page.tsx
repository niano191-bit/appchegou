import Link from "next/link";
import { PainelEntregador } from "./painel-entregador";

export const metadata = {
  title: "App do Entregador — Chegou",
  description: "Aceite corridas e confirme entregas.",
};

export default function PaginaEntregador() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <Link
          href="/"
          className="text-sm font-medium text-[#C45C26] underline-offset-2 hover:underline"
        >
          ← Voltar
        </Link>
        <p className="text-sm font-medium tracking-wide text-[#8A7460] uppercase">
          Entregador Teste
        </p>
        <h1 className="font-display text-3xl text-[#1A120C]">
          Corridas disponíveis
        </h1>
        <p className="text-sm leading-relaxed text-[#5C4A3A]">
          Pedidos prontos aparecem aqui. Aceite a corrida e confirme quando
          entregar ao cliente.
        </p>
      </header>

      <PainelEntregador />
    </div>
  );
}
