import { ErrorBoundary } from "@/components/error-boundary";
import { lerSessao } from "@/lib/auth-servidor";
import { PainelDono } from "./painel-dono";

export const metadata = {
  title: "Admin — Tentações da Neuza",
  description: "Operação, vitrine, lojas, entregadores e configurações.",
};

export default async function PaginaDono() {
  const sessao = await lerSessao();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <ErrorBoundary titulo="O painel Admin travou ao abrir">
        <PainelDono nomeAdmin={sessao?.nome ?? "Admin"} />
      </ErrorBoundary>
    </div>
  );
}
