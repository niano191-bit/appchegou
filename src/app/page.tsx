import Link from "next/link";
import { getSupabaseStatus } from "@/lib/supabase/status";

export default function Home() {
  const supabase = getSupabaseStatus();

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
            {supabase.configured
              ? "Supabase conectado"
              : "Supabase ainda não configurado"}
          </p>
          <p className="mt-1 opacity-90">{supabase.message}</p>
        </div>

        <Link
          href="/restaurante"
          className="inline-flex w-full items-center justify-center rounded-xl bg-[#C45C26] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#A84C1E]"
        >
          Abrir painel do restaurante
        </Link>

        <p className="text-sm text-[#8A7460]">
          Fase 2 — Painel do restaurante: aceitar pedidos e marcar como pronto.
        </p>
      </main>
    </div>
  );
}
