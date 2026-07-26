import { CabecalhoArea } from "@/components/cabecalho-area";
import { lerSessao } from "@/lib/auth-servidor";
import { PainelDono } from "./painel-dono";

export const metadata = {
  title: "Admin — Tentações da Neuza",
  description: "Operação, vitrine, lojas, entregadores e configurações.",
};

export default async function PaginaDono() {
  const sessao = await lerSessao();

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-8">
      <CabecalhoArea
        rotulo={sessao?.nome ?? "Admin"}
        titulo="Painel Admin"
        descricao="Gerencie a operação e o que o cliente vê no app."
      />
      <PainelDono />
    </div>
  );
}
