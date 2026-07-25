import Link from "next/link";
import { destinoPorPapel } from "@/lib/auth";
import { lerSessao } from "@/lib/auth-servidor";
import { getSupabaseStatus } from "@/lib/supabase/status";
import { BotaoSair } from "@/components/botao-sair";

export default async function Home() {
  const supabase = getSupabaseStatus();
  const sessao = await lerSessao();

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <main className="flex w-full max-w-lg flex-col items-center gap-8 text-center">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium tracking-wide text-[#C45C26] uppercase">
            Delivery em Salvador
          </p>
          <h1 className="font-display text-5xl leading-tight text-[#1A120C] sm:text-6xl">
            Chegou
          </h1>
          <p className="text-lg leading-relaxed text-[#5C4A3A]">
            Pedidos de comida com acompanhamento ao vivo — para clientes,
            restaurantes, entregadores e o dono do negócio.
          </p>
        </div>

        <div
          className={`w-full rounded-2xl border px-5 py-4 text-left text-sm leading-relaxed ${
            supabase.configured
              ? "border-[#2F6B3A]/40 bg-[#E8F5E9] text-[#1B4332]"
              : "border-[#C45C26]/30 bg-[#FFF4EB] text-[#5C3A1E]"
          }`}
        >
          <p className="font-medium">
            {sessao
              ? `Olá, ${sessao.nome}`
              : supabase.configured
                ? "Supabase conectado"
                : "Modo demonstração"}
          </p>
          <p className="mt-1 opacity-90">
            {sessao
              ? `Você entrou como ${sessao.papel}.`
              : "Entre com uma conta de teste para ver só a sua área."}
          </p>
        </div>

        <div className="flex w-full flex-col gap-3">
          {sessao ? (
            <>
              <Link
                href={destinoPorPapel(sessao.papel)}
                className="inline-flex w-full items-center justify-center rounded-xl bg-[#C45C26] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#A84C1E]"
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
              className="inline-flex w-full items-center justify-center rounded-xl bg-[#C45C26] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#A84C1E]"
            >
              Entrar
            </Link>
          )}
        </div>

        <p className="text-sm text-[#8A7460]">
          Fase 8 — Pagamentos em teste (Pix e cartão).
        </p>
      </main>
    </div>
  );
}
