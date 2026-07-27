import { redirect } from "next/navigation";

export default function PaginaPedidosLoja() {
  redirect("/restaurante?secao=pedidos");
}
