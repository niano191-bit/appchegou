import Link from "next/link";
import { MarcaLogo } from "@/components/marca-logo";
import { ACESSOS_LOGIN } from "@/lib/acessos";

export const metadata = {
  title: "Entrar — Tentações da Neuza",
  description: "Escolha se você é cliente, restaurante, entregador ou admin.",
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
            Escolha o seu tipo de acesso. Cada área tem o seu login.
          </p>
        </div>
      </header>

      {params.erro === "sem_permissao" ? (
        <div className="rounded-2xl border border-dende/30 bg-dende-suave px-5 py-4 text-sm text-dende-escuro">
          Essa área não é do seu tipo de conta. Escolha o acesso certo abaixo.
        </div>
      ) : null}

      <ul className="flex flex-col gap-3">
        {ACESSOS_LOGIN.map((acesso) => {
          const href =
            acesso.papel === "dono"
              ? acesso.href
              : params.next
                ? `${acesso.href}?next=${encodeURIComponent(params.next)}`
                : acesso.href;
          return (
            <li key={acesso.papel}>
              <Link
                href={href}
                className="block rounded-2xl border border-linha bg-white px-5 py-4 transition hover:border-dende/50 hover:bg-background"
              >
                <p className="font-semibold text-foreground">{acesso.titulo}</p>
                <p className="mt-1 text-sm text-muted">{acesso.descricao}</p>
              </Link>
            </li>
          );
        })}
      </ul>

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
