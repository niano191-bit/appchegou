import { redirect } from "next/navigation";
import { destinoPorPapel } from "@/lib/auth";
import { lerSessao } from "@/lib/auth-servidor";
import { HomeCliente } from "./cliente/home-cliente";

export default async function Home() {
  const sessao = await lerSessao();

  // Loja, entregador e dono vão direto para a área deles
  if (
    sessao &&
    (sessao.papel === "restaurante" ||
      sessao.papel === "entregador" ||
      sessao.papel === "dono")
  ) {
    redirect(destinoPorPapel(sessao.papel));
  }

  const logado = Boolean(sessao?.papel === "cliente");

  return (
    <HomeCliente
      logado={logado}
      nomeUsuario={logado ? sessao?.nome : null}
    />
  );
}
