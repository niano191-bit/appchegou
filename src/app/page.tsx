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

        <p className="text-sm text-[#8A7460]">
          Fase 1 — Script do banco pronto em{" "}
          <code className="rounded bg-black/5 px-1.5 py-0.5 text-xs">
            supabase/migrations/001_fase1_schema.sql
          </code>
          . Cole no SQL Editor do Supabase para criar as tabelas.
        </p>
      </main>
    </div>
  );
}
