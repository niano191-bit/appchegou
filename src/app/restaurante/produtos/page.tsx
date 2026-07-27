import { redirect } from "next/navigation";

export default function PaginaProdutosLoja() {
  redirect("/restaurante?secao=produtos");
}
