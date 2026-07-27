"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CONTAS_DEMO, SENHA_DEMO } from "@/lib/auth";
import { entrar, sair } from "@/lib/sessao-cliente";
import type { PapelUsuario } from "@/types/database";

type Props = {
  papel: Exclude<PapelUsuario, "dono">;
  titulo: string;
  destinoPadrao: string;
  nextUrl?: string;
};

function contaDemoDoPapel(papel: Props["papel"]) {
  return CONTAS_DEMO.find((c) => c.papel === papel) ?? CONTAS_DEMO[0];
}

export function FormLoginPapel({
  papel,
  titulo,
  destinoPadrao,
  nextUrl,
}: Props) {
  const router = useRouter();
  const demo = contaDemoDoPapel(papel);
  const [email, setEmail] = useState(demo.email);
  const [senha, setSenha] = useState(SENHA_DEMO);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function fazerLogin(emailLogin: string, senhaLogin: string) {
    setCarregando(true);
    setErro(null);
    try {
      const { sessao, destino } = await entrar(emailLogin, senhaLogin);
      if (sessao.papel !== papel && sessao.papel !== "dono") {
        await sair();
        setErro(
          `Esta conta não é de ${titulo.toLowerCase()}. Use o link certo.`,
        );
        return;
      }
      const irPara =
        nextUrl && nextUrl.startsWith("/")
          ? nextUrl
          : sessao.papel === "dono"
            ? destino
            : destinoPadrao || destino;
      router.push(irPara);
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
        <p className="text-sm font-semibold tracking-wide text-muted uppercase">
          Entrar rápido
        </p>
        <button
          type="button"
          disabled={carregando}
          onClick={() => void fazerLogin(demo.email, SENHA_DEMO)}
          className="rounded-2xl border border-linha bg-white px-4 py-3 text-left transition hover:border-dende/50 hover:bg-background disabled:opacity-60"
        >
          <p className="font-semibold text-foreground">{demo.rotulo}</p>
          <p className="text-xs text-muted">{demo.email}</p>
        </button>
      </div>

      <form
        className="rounded-2xl border border-linha bg-white px-4 py-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void fazerLogin(email, senha);
        }}
      >
        <p className="text-sm font-semibold tracking-wide text-muted uppercase">
          Ou digite
        </p>
        <label className="block text-sm text-muted">
          E-mail
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-linha px-3 py-2.5 text-foreground outline-none focus:border-dende"
          />
        </label>
        <label className="block text-sm text-muted">
          Senha
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="mt-1 w-full rounded-xl border border-linha px-3 py-2.5 text-foreground outline-none focus:border-dende"
          />
        </label>

        {erro ? (
          <p className="text-sm text-dende-escuro">{erro}</p>
        ) : null}

        <button
          type="submit"
          disabled={carregando}
          className="w-full rounded-xl bg-dende px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {carregando ? "Entrando…" : `Entrar como ${titulo}`}
        </button>
      </form>

      <p className="text-center text-sm text-muted">
        Outro tipo de conta?{" "}
        <Link
          href="/login"
          className="font-medium text-dende underline-offset-2 hover:underline"
        >
          Escolher acesso
        </Link>
      </p>
    </div>
  );
}
