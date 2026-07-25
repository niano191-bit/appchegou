import Link from "next/link";
import { MarcaLogo } from "@/components/marca-logo";
import { CardapioComCarrinho } from "./cardapio-com-carrinho";

export const metadata = {
  title: "Cardápio — Tentações da Neuza",
  description: "Monte seu pedido e envie para o restaurante.",
};

export default async function PaginaCardapio({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-3">
        <MarcaLogo tamanho="sm" />
        <Link
          href="/cliente"
          className="text-sm font-medium text-dende underline-offset-2 hover:underline"
        >
          ← Restaurantes
        </Link>
      </header>

      <CardapioComCarrinho restauranteId={id} />
    </div>
  );
}
