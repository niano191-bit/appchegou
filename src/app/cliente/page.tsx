import Link from "next/link";
import { BotaoSair } from "@/components/botao-sair";
import { lerSessao } from "@/lib/auth-servidor";
import { ListaRestaurantes } from "./lista-restaurantes";

export const metadata = {
  title: "Pedir — Chegou",
  description: "Escolha um restaurante e faça seu pedido.",
};

export default async function PaginaCliente() {
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
          {sessao?.nome ?? "Cliente"}
        </p>
        <h1 className="font-display text-3xl text-[#1A120C]">
          Onde você quer pedir?
        </h1>
        <p className="text-sm leading-relaxed text-[#5C4A3A]">
          Escolha um restaurante, monte o carrinho e envie o pedido.
        </p>
      </header>

      <ListaRestaurantes />
    </div>
  );
}
