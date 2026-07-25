import Link from "next/link";
import { AcompanharPedido } from "./acompanhar-pedido";

export const metadata = {
  title: "Acompanhar pedido — Chegou",
  description: "Veja o status do seu pedido ao vivo.",
};

export default async function PaginaAcompanharPedido({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <Link
          href="/cliente"
          className="text-sm font-medium text-[#C45C26] underline-offset-2 hover:underline"
        >
          ← Pedir de novo
        </Link>
        <h1 className="font-display text-3xl text-[#1A120C]">
          Acompanhar pedido
        </h1>
        <p className="text-sm leading-relaxed text-[#5C4A3A]">
          O status muda sozinho conforme o restaurante e o entregador avançam.
        </p>
      </header>

      <AcompanharPedido pedidoId={id} />
    </div>
  );
}
