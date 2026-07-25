import Link from "next/link";
import { BotaoSair } from "@/components/botao-sair";
import { MarcaLogo } from "@/components/marca-logo";
import { destinoPorPapel } from "@/lib/auth";
import { lerSessao } from "@/lib/auth-servidor";
import { MARCA } from "@/lib/marca";
import { getSupabaseStatus } from "@/lib/supabase/status";

export default async function Home() {
  const supabase = getSupabaseStatus();
  const sessao = await lerSessao();

  return (
    <div className="relative flex flex-1 flex-col">
      {/* Plano visual de fundo — atmosfera Salvador / dendê */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-24 left-1/2 h-[420px] w-[120%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,_#fb923c_0%,_transparent_65%)] opacity-40" />
        <div className="absolute bottom-0 right-0 h-64 w-64 translate-x-1/4 translate-y-1/4 rounded-full bg-mar/15 blur-3xl" />
      </div>

      <main className="relative mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-10 px-6 py-16">
        <div className="marca-entrada flex flex-col items-center gap-5 text-center">
          <p className="text-xs font-semibold tracking-[0.2em] text-mar uppercase">
            Delivery em {MARCA.cidade}
          </p>
          <MarcaLogo href={null} tamanho="lg" centralizado mostrarTagline />
          <p className="marca-entrada-atraso max-w-md text-lg leading-relaxed text-muted">
            Comida baiana com acompanhamento ao vivo — do fogão à sua porta.
          </p>
        </div>

        <div className="marca-entrada-atraso-2 flex w-full flex-col gap-4">
          {sessao ? (
            <div className="rounded-2xl border border-linha bg-white/70 px-5 py-4 text-left text-sm backdrop-blur-sm">
              <p className="font-medium text-foreground">
                Olá, {sessao.nome}
              </p>
              <p className="mt-1 text-muted">
                Você entrou como {sessao.papel}.
              </p>
            </div>
          ) : null}

          {sessao ? (
            <>
              <Link
                href={destinoPorPapel(sessao.papel)}
                className="inline-flex w-full items-center justify-center rounded-xl bg-dende px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-dende-escuro"
              >
                Ir para minha área
              </Link>
              <div className="flex justify-center">
                <BotaoSair />
              </div>
            </>
          ) : (
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-xl bg-dende px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-dende-escuro"
            >
              Entrar e pedir
            </Link>
          )}

          {!sessao && supabase.configured ? (
            <p className="text-center text-xs text-muted">
              Contas de teste · senha <strong>teste123</strong>
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
