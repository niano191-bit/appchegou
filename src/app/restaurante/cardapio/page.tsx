import { redirect } from "next/navigation";

export const metadata = {
  title: "Produtos da loja — Tentações da Neuza",
  description: "Edite pratos, preços e fotos da sua loja.",
};

export default function PaginaCardapioLoja() {
  redirect("/restaurante?secao=produtos");
}
