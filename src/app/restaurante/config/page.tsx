import { redirect } from "next/navigation";

export default function PaginaConfigLoja() {
  redirect("/restaurante?secao=config");
}
