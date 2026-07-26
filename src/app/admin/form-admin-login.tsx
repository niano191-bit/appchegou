"use client";

import { useState } from "react";
import { CONTA_ADMIN_DEMO, SENHA_DEMO } from "@/lib/auth";
import { entrar, sair } from "@/lib/sessao-cliente";

export function FormAdminLogin() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function fazerLogin(emailLogin: string, senhaLogin: string) {
    setCarregando(true);
    setErro(null);
    try {
      const { sessao, destino } = await entrar(emailLogin, senhaLogin);
      if (sessao.papel !== "dono") {
        await sair();
        setErro("Esta conta não é de administrador. Use o login do cliente.");
        return;
      }
      // Reload completo evita ChunkLoadError após deploys (navegação suave quebrada)
      window.location.assign(destino || "/dono");
      return;
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível entrar.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <form
      className="rounded-2xl border border-linha bg-white px-5 py-5 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void fazerLogin(email, senha);
      }}
    >
      <label className="block text-sm text-muted">
        E-mail
        <input
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-xl border border-linha px-3 py-2.5 text-foreground outline-none focus:border-dende"
          required
        />
      </label>
      <label className="block text-sm text-muted">
        Senha
        <input
          type="password"
          autoComplete="current-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="mt-1 w-full rounded-xl border border-linha px-3 py-2.5 text-foreground outline-none focus:border-dende"
          required
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
        {carregando ? "Entrando…" : "Entrar no Admin"}
      </button>

      <p className="pt-1 text-center text-xs text-muted">
        Demo: {CONTA_ADMIN_DEMO.email} · senha {SENHA_DEMO}
      </p>
    </form>
  );
}
