"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CONTAS_DEMO, SENHA_DEMO } from "@/lib/auth";
import { entrar } from "@/lib/sessao-cliente";

export function FormLogin({ nextUrl }: { nextUrl?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(CONTAS_DEMO[0].email);
  const [senha, setSenha] = useState(SENHA_DEMO);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function fazerLogin(emailLogin: string, senhaLogin: string) {
    setCarregando(true);
    setErro(null);
    try {
      const { destino } = await entrar(emailLogin, senhaLogin);
      router.push(nextUrl && nextUrl.startsWith("/") ? nextUrl : destino);
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível entrar.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold tracking-wide text-[#8A7460] uppercase">
          Entrar rápido
        </p>
        {CONTAS_DEMO.map((conta) => (
          <button
            key={conta.email}
            type="button"
            disabled={carregando}
            onClick={() => void fazerLogin(conta.email, SENHA_DEMO)}
            className="rounded-2xl border border-[#E8D9C8] bg-white px-4 py-3 text-left transition hover:border-[#C45C26]/50 hover:bg-[#FFF9F4] disabled:opacity-60"
          >
            <p className="font-semibold text-[#1A120C]">{conta.rotulo}</p>
            <p className="text-xs text-[#8A7460]">{conta.email}</p>
          </button>
        ))}
      </div>

      <form
        className="rounded-2xl border border-[#E8D9C8] bg-white px-4 py-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void fazerLogin(email, senha);
        }}
      >
        <p className="text-sm font-semibold tracking-wide text-[#8A7460] uppercase">
          Ou digite
        </p>
        <label className="block text-sm text-[#5C4A3A]">
          E-mail
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#E8D9C8] px-3 py-2.5 text-[#1A120C] outline-none focus:border-[#C45C26]"
          />
        </label>
        <label className="block text-sm text-[#5C4A3A]">
          Senha
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#E8D9C8] px-3 py-2.5 text-[#1A120C] outline-none focus:border-[#C45C26]"
          />
        </label>

        {erro ? (
          <p className="text-sm text-[#A84C1E]">{erro}</p>
        ) : null}

        <button
          type="submit"
          disabled={carregando}
          className="w-full rounded-xl bg-[#C45C26] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {carregando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
