import { redirect } from "next/navigation";

export default function PaginaEstoqueLoja() {
  redirect("/restaurante?secao=estoque");
}
