import Link from "next/link";
import { MarcaLogo } from "@/components/marca-logo";
import { FormLogin } from "./form-login";

export const metadata = {
  title: "Entrar — Tentações da Neuza",
  description: "Entre com sua conta para pedir ou gerenciar pedidos.",
};

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erro?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-4 py-10">
      <header className="flex flex-col items-center gap-4 text-center">
        <MarcaLogo tamanho="md" centralizado mostrarTagline />
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-3xl text-foreground">Entrar</h1>
          <p className="text-sm leading-relaxed text-muted">
            Use sua conta ou as de teste (senha{" "}
            <strong className="text-foreground">teste123</strong>).
          </p>
        </div>
      </header>

      {params.erro === "sem_permissao" ? (
        <div className="rounded-2xl border border-dende/30 bg-dende-suave px-5 py-4 text-sm text-dende-escuro">
          Essa área não é do seu tipo de conta. Entre com a conta certa.
        </div>
      ) : null}

      <FormLogin nextUrl={params.next} />

      <p className="text-center text-sm text-muted">
        Cliente novo?{" "}
        <Link
          href="/cadastro"
          className="font-medium text-dende underline-offset-2 hover:underline"
        >
          Criar conta
        </Link>
      </p>
    </div>
  );
}
