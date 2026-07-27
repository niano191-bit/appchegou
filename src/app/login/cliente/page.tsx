import Link from "next/link";
import { MarcaLogo } from "@/components/marca-logo";
import { FormLoginPapel } from "../form-login-papel";

export const metadata = {
  title: "Entrar — Cliente",
  description: "Login do cliente para pedir comida.",
};

export default async function LoginClientePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-4 py-10">
      <header className="flex flex-col items-center gap-4 text-center">
        <MarcaLogo tamanho="md" centralizado mostrarTagline />
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">
            Acesso cliente
          </p>
          <h1 className="font-display text-3xl text-foreground">Entrar</h1>
          <p className="text-sm text-muted">
            Senha de teste: <strong className="text-foreground">teste123</strong>
          </p>
        </div>
      </header>

      <FormLoginPapel
        papel="cliente"
        titulo="Cliente"
        destinoPadrao="/"
        nextUrl={params.next}
      />

      <p className="text-center text-sm text-muted">
        Novo por aqui?{" "}
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
