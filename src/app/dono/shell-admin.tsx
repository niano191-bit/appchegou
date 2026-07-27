"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { BotaoSair } from "@/components/botao-sair";
import { MARCA } from "@/lib/marca";

export type AbaAdmin =
  | "operacao"
  | "vitrine"
  | "restaurantes"
  | "bairros"
  | "cupons"
  | "entregadores"
  | "config";

const ITENS: { id: AbaAdmin; label: string }[] = [
  { id: "operacao", label: "Operação" },
  { id: "vitrine", label: "Vitrine / Home" },
  { id: "restaurantes", label: "Restaurantes" },
  { id: "bairros", label: "Bairros e taxas" },
  { id: "cupons", label: "Cupons" },
  { id: "entregadores", label: "Entregadores" },
  { id: "config", label: "Configurações" },
];

type Props = {
  nome?: string | null;
  aba: AbaAdmin;
  onAba: (aba: AbaAdmin) => void;
  children: ReactNode;
};

/** Layout Admin: menu à esquerda + conteúdo */
export function ShellAdmin({ nome, aba, onAba, children }: Props) {
  const [menuAberto, setMenuAberto] = useState(false);
  const titulo = ITENS.find((i) => i.id === aba)?.label ?? "Admin";

  function escolher(id: AbaAdmin) {
    onAba(id);
    setMenuAberto(false);
  }

  const nav = (
    <nav className="flex flex-col gap-1 p-3">
      {ITENS.map((item) => {
        const ativa = aba === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => escolher(item.id)}
            className={`rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
              ativa
                ? "bg-dende text-white"
                : "text-foreground hover:bg-dende-suave"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="admin-shell flex min-h-full flex-1 bg-[#f7f4f0]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-linha bg-white md:flex">
        <div className="border-b border-linha px-4 py-4">
          <p className="font-display text-lg font-semibold text-dende">
            {MARCA.nomeCurto}
          </p>
          <p className="text-xs font-medium tracking-wide text-muted uppercase">
            Painel Admin
          </p>
          {nome ? (
            <p className="mt-2 truncate text-sm text-foreground">{nome}</p>
          ) : null}
        </div>
        <div className="flex-1 overflow-y-auto">{nav}</div>
        <div className="space-y-2 border-t border-linha px-4 py-3">
          <p className="text-[10px] font-semibold tracking-wide text-muted uppercase">
            Acessar áreas
          </p>
          <div className="flex flex-col gap-1 text-xs">
            <Link href="/" className="text-mar hover:underline">
              App cliente
            </Link>
            <Link href="/restaurante" className="text-mar hover:underline">
              Painel loja
            </Link>
            <Link href="/entregador" className="text-mar hover:underline">
              Painel entregador
            </Link>
          </div>
          <BotaoSair />
        </div>
      </aside>

      {/* Mobile drawer */}
      {menuAberto ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMenuAberto(false)}
          />
          <aside className="absolute top-0 left-0 flex h-full w-[min(18rem,85vw)] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-linha px-4 py-4">
              <div>
                <p className="font-display text-lg font-semibold text-dende">
                  Admin
                </p>
                {nome ? (
                  <p className="text-xs text-muted">{nome}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setMenuAberto(false)}
                className="text-sm font-medium text-muted"
              >
                Fechar
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{nav}</div>
            <div className="space-y-2 border-t border-linha px-4 py-3">
              <p className="text-[10px] font-semibold tracking-wide text-muted uppercase">
                Acessar áreas
              </p>
              <div className="flex flex-col gap-1 text-xs">
                <Link href="/" className="text-mar hover:underline">
                  App cliente
                </Link>
                <Link href="/restaurante" className="text-mar hover:underline">
                  Painel loja
                </Link>
                <Link href="/entregador" className="text-mar hover:underline">
                  Painel entregador
                </Link>
              </div>
              <BotaoSair />
            </div>
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-linha bg-white px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setMenuAberto(true)}
            className="rounded-xl border border-linha px-3 py-2 text-sm font-semibold text-foreground"
          >
            Menu
          </button>
          <p className="truncate text-sm font-semibold text-foreground">
            {titulo}
          </p>
          <BotaoSair />
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-8">
          <div className="mb-6 hidden md:block">
            <h1 className="font-display text-2xl text-foreground">{titulo}</h1>
            <p className="mt-1 text-sm text-muted">
              Gerencie a operação e o que o cliente vê no app.
            </p>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
