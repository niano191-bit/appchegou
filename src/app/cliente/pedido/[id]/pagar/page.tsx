import Link from "next/link";
import { MarcaLogo } from "@/components/marca-logo";
import { TelaPagamento } from "./tela-pagamento";

export const metadata = {
  title: "Pagar pedido — Tentações da Neuza",
  description: "Pague com Pix ou cartão (ambiente de teste).",
};

export default async function PaginaPagar({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ resultado?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-3">
        <MarcaLogo tamanho="sm" />
        <Link
          href={`/cliente/pedido/${id}`}
          className="text-sm font-medium text-dende underline-offset-2 hover:underline"
        >
          ← Voltar ao pedido
        </Link>
        <h1 className="font-display text-3xl text-foreground">
          Pagamento (teste)
        </h1>
        <p className="text-sm leading-relaxed text-muted">
          Nenhum valor real será cobrado. Use a simulação ou o Mercado Pago em
          modo sandbox.
        </p>
      </header>

      <TelaPagamento pedidoId={id} resultado={query.resultado} />
    </div>
  );
}
