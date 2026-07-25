import Link from "next/link";
import { MarcaLogo } from "@/components/marca-logo";
import { AcompanharPedido } from "./acompanhar-pedido";

export const metadata = {
  title: "Acompanhar pedido — Tentações da Neuza",
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
      <header className="flex flex-col gap-3">
        <MarcaLogo tamanho="sm" />
        <Link
          href="/cliente"
          className="text-sm font-medium text-dende underline-offset-2 hover:underline"
        >
          ← Pedir de novo
        </Link>
        <h1 className="font-display text-3xl text-foreground">
          Acompanhar pedido
        </h1>
        <p className="text-sm leading-relaxed text-muted">
          O status muda sozinho conforme o restaurante e o entregador avançam.
        </p>
      </header>

      <AcompanharPedido pedidoId={id} />
    </div>
  );
}
