import { redirect } from "next/navigation";

export const metadata = {
  title: "Cardápio da loja — Tentações da Neuza",
  description: "Edite pratos, preços e fotos da sua loja.",
};

/** Cardápio ficou no menu lateral da loja */
export default function PaginaCardapioLoja() {
  redirect("/restaurante?secao=cardapio");
}
