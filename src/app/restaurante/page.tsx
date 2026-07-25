import { CabecalhoArea } from "@/components/cabecalho-area";
import { lerSessao } from "@/lib/auth-servidor";
import { PainelRestaurante } from "./painel-restaurante";

export const metadata = {
  title: "Painel do Restaurante — Tentações da Neuza",
  description: "Aceite pedidos e marque quando estiverem prontos.",
};

export default async function PaginaRestaurante() {
  const sessao = await lerSessao();

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-8">
      <CabecalhoArea
        rotulo={sessao?.nome ?? "Restaurante"}
        titulo="Painel do Restaurante"
        descricao="Pedidos novos aparecem aqui. Aceite e marque como pronto quando a comida estiver pronta para o entregador."
      />
      <PainelRestaurante />
    </div>
  );
}
