import { redirect } from "next/navigation";

export default function PaginaHorariosLoja() {
  redirect("/restaurante?secao=horarios");
}
