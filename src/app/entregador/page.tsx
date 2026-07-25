import { CabecalhoArea } from "@/components/cabecalho-area";
import { lerSessao } from "@/lib/auth-servidor";
import { PainelEntregador } from "./painel-entregador";

export const metadata = {
  title: "Entregador — Tentações da Neuza",
  description: "Aceite corridas e confirme entregas.",
};

export default async function PaginaEntregador() {
  const sessao = await lerSessao();

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-8">
      <CabecalhoArea
        rotulo={sessao?.nome ?? "Entregador"}
        titulo="Corridas disponíveis"
        descricao="Pedidos prontos aparecem aqui. Aceite a corrida e confirme quando entregar ao cliente."
      />
      <PainelEntregador />
    </div>
  );
}
