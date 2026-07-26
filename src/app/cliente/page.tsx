import { redirect } from "next/navigation";

export const metadata = {
  title: "Início — Tentações da Neuza",
  description: "Escolha um restaurante e faça seu pedido.",
};

/** Lista de restaurantes fica na raiz; /cliente redireciona para lá */
export default function PaginaCliente() {
  redirect("/");
}
