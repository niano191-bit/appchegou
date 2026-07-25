import Link from "next/link";
import { CabecalhoArea } from "@/components/cabecalho-area";
import { lerSessao } from "@/lib/auth-servidor";
import { GestaoCardapioLoja } from "../gestao-cardapio";

export const metadata = {
  title: "Cardápio da loja — Tentações da Neuza",
  description: "Edite pratos, preços e fotos da sua loja.",
};

export default async function PaginaCardapioLoja() {
  const sessao = await lerSessao();

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-8">
      <CabecalhoArea
        rotulo={sessao?.nome ?? "Restaurante"}
        titulo="Cardápio da loja"
        descricao="Cadastre pratos, preços e fotos. O que estiver disponível aparece para o cliente."
      />
      <Link
        href="/restaurante"
        className="text-sm font-medium text-dende underline-offset-2 hover:underline"
      >
        ← Voltar aos pedidos
      </Link>
      <GestaoCardapioLoja />
    </div>
  );
}
