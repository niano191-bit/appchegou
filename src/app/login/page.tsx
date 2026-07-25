import { FormLogin } from "./form-login";

export const metadata = {
  title: "Entrar — Chegou",
  description: "Entre com sua conta de teste.",
};

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erro?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2 text-center">
        <p className="text-sm font-medium tracking-wide text-[#C45C26] uppercase">
          Chegou
        </p>
        <h1 className="font-display text-3xl text-[#1A120C]">Entrar</h1>
        <p className="text-sm leading-relaxed text-[#5C4A3A]">
          Escolha uma conta de teste. A senha de todas é{" "}
          <strong>teste123</strong>.
        </p>
      </header>

      {params.erro === "sem_permissao" ? (
        <div className="rounded-2xl border border-[#C45C26]/30 bg-[#FFF4EB] px-5 py-4 text-sm text-[#5C3A1E]">
          Essa área não é do seu tipo de conta. Entre com a conta certa.
        </div>
      ) : null}

      <FormLogin nextUrl={params.next} />
    </div>
  );
}
