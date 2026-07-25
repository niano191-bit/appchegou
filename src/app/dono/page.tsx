import { CabecalhoArea } from "@/components/cabecalho-area";
import { lerSessao } from "@/lib/auth-servidor";
import { PainelDono } from "./painel-dono";

export const metadata = {
  title: "Painel do Dono — Tentações da Neuza",
  description: "Operação, comissões, entregadores e configurações.",
};

export default async function PaginaDono() {
  const sessao = await lerSessao();

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-8">
      <CabecalhoArea
        rotulo={sessao?.nome ?? "Dono"}
        titulo="Painel do Dono"
        descricao="Visão da operação do dia. Só quem tem papel dono entra aqui."
      />
      <PainelDono />
    </div>
  );
}
