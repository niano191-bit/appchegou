import { redirect } from "next/navigation";

export default function PaginaAvaliacoesLoja() {
  redirect("/restaurante?secao=avaliacoes");
}
