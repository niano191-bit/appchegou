import { CabecalhoArea } from "@/components/cabecalho-area";
import { lerSessao } from "@/lib/auth-servidor";
import { HistoricoPedidos } from "./historico-pedidos";
import { ListaRestaurantes } from "./lista-restaurantes";

export const metadata = {
  title: "Pedir — Tentações da Neuza",
  description: "Escolha um restaurante e faça seu pedido.",
};

export default async function PaginaCliente() {
  const sessao = await lerSessao();

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-8">
      <CabecalhoArea
        rotulo={sessao?.nome ?? "Cliente"}
        titulo="Onde você quer pedir?"
        descricao="Escolha um restaurante, monte o carrinho e envie o pedido."
      />
      <ListaRestaurantes />
      <HistoricoPedidos />
    </div>
  );
}
