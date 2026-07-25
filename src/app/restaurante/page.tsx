import Link from "next/link";
import { PainelRestaurante } from "./painel-restaurante";

export const metadata = {
  title: "Painel do Restaurante — Chegou",
  description: "Aceite pedidos e marque quando estiverem prontos.",
};

export default function PaginaRestaurante() {
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
          Loja Demo Acarajé
        </p>
        <h1 className="font-display text-3xl text-[#1A120C]">
          Painel do Restaurante
        </h1>
        <p className="text-sm leading-relaxed text-[#5C4A3A]">
          Pedidos novos aparecem aqui. Aceite e marque como pronto quando a
          comida estiver pronta para o entregador.
        </p>
      </header>

      <PainelRestaurante />
    </div>
  );
}
