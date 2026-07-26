import { ErrorBoundary } from "@/components/error-boundary";
import { lerSessao } from "@/lib/auth-servidor";
import { PainelRestaurante } from "./painel-restaurante";
import type { SecaoLoja } from "./shell-loja";

export const metadata = {
  title: "Painel da Loja — Tentações da Neuza",
  description: "Aceite pedidos, edite cardápio e configure sua loja.",
};

export default async function PaginaRestaurante({
  searchParams,
}: {
  searchParams: Promise<{ secao?: string }>;
}) {
  const sessao = await lerSessao();
  const params = await searchParams;
  const secoes: SecaoLoja[] = ["pedidos", "cardapio", "esgotado", "loja"];
  const secaoInicial = secoes.includes(params.secao as SecaoLoja)
    ? (params.secao as SecaoLoja)
    : "pedidos";

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <ErrorBoundary titulo="O painel da loja travou ao abrir">
        <PainelRestaurante
          nomeLoja={sessao?.nome ?? "Restaurante"}
          secaoInicial={secaoInicial}
        />
      </ErrorBoundary>
    </div>
  );
}
