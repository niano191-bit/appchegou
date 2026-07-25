import Link from "next/link";
import { TelaPagamento } from "./tela-pagamento";

export const metadata = {
  title: "Pagar pedido — Chegou",
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
      <header className="flex flex-col gap-2">
        <Link
          href={`/cliente/pedido/${id}`}
          className="text-sm font-medium text-[#C45C26] underline-offset-2 hover:underline"
        >
          ← Voltar ao pedido
        </Link>
        <h1 className="font-display text-3xl text-[#1A120C]">
          Pagamento (teste)
        </h1>
        <p className="text-sm leading-relaxed text-[#5C4A3A]">
          Nenhum valor real será cobrado. Use a simulação ou o Mercado Pago em
          modo sandbox.
        </p>
      </header>

      <TelaPagamento pedidoId={id} resultado={query.resultado} />
    </div>
  );
}
