import { lerSessao } from "@/lib/auth-servidor";
import { HomeCliente } from "./home-cliente";

export const metadata = {
  title: "Início — Tentações da Neuza",
  description: "Escolha um restaurante e faça seu pedido.",
};

export default async function PaginaCliente() {
  const sessao = await lerSessao();
  const ehCliente = !sessao || sessao.papel === "cliente";

  return (
    <HomeCliente
      logado={Boolean(sessao && ehCliente)}
      nomeUsuario={sessao && ehCliente ? sessao.nome : null}
    />
  );
}
