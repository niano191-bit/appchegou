"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cadastrar } from "@/lib/sessao-cliente";

export function FormCadastro() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function enviar() {
    setCarregando(true);
    setErro(null);
    try {
      const { destino } = await cadastrar({
        nome,
        email,
        telefone: telefone || undefined,
        senha,
      });
      router.push(destino);
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível cadastrar.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <form
      className="rounded-2xl border border-linha bg-white px-4 py-4 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void enviar();
      }}
    >
      <label className="block text-sm text-muted">
        Nome
        <input
          required
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="mt-1 w-full rounded-xl border border-linha px-3 py-2.5 text-foreground outline-none focus:border-dende"
        />
      </label>
      <label className="block text-sm text-muted">
        E-mail
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-xl border border-linha px-3 py-2.5 text-foreground outline-none focus:border-dende"
        />
      </label>
      <label className="block text-sm text-muted">
        Telefone (opcional)
        <input
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          className="mt-1 w-full rounded-xl border border-linha px-3 py-2.5 text-foreground outline-none focus:border-dende"
        />
      </label>
      <label className="block text-sm text-muted">
        Senha (mín. 6 caracteres)
        <input
          required
          type="password"
          minLength={6}
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
        {carregando ? "Criando…" : "Criar conta"}
      </button>
    </form>
  );
}
