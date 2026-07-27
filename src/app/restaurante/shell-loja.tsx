"use client";

import { useState, type ReactNode } from "react";
import { BotaoSair } from "@/components/botao-sair";
import { MARCA } from "@/lib/marca";
import {
  LABELS_SECAO,
  type SecaoLoja,
} from "./secoes-loja";

export type { SecaoLoja };

type ItemMenu = {
  id: SecaoLoja;
  label: string;
  icone: string;
};

type GrupoMenu = {
  titulo: string;
  itens: ItemMenu[];
};

const GRUPOS: GrupoMenu[] = [
  {
    titulo: "Operação",
    itens: [
      { id: "visao", label: "Visão geral", icone: "◫" },
      { id: "pedidos", label: "Pedidos", icone: "☰" },
      { id: "conversas", label: "Conversas", icone: "💬" },
      { id: "avaliacoes", label: "Avaliações", icone: "★" },
    ],
  },
  {
    titulo: "Catálogo",
    itens: [
      { id: "produtos", label: "Produtos", icone: "▦" },
      { id: "categorias", label: "Categorias", icone: "⊞" },
      { id: "adicionais", label: "Adicionais", icone: "+" },
      { id: "estoque", label: "Estoque", icone: "▣" },
    ],
  },
  {
    titulo: "Entrega",
    itens: [
      { id: "entregador", label: "Chamar entregador", icone: "🛵" },
      { id: "bairros", label: "Bairros e taxas", icone: "◎" },
      { id: "horarios", label: "Horários", icone: "◷" },
    ],
  },
  {
    titulo: "Negócio",
    itens: [
      { id: "financeiro", label: "Financeiro", icone: "$" },
      { id: "repasses", label: "Repasses", icone: "⇄" },
      { id: "cupons", label: "Cupons", icone: "%" },
      { id: "pagamentos", label: "Formas de pagamento", icone: "▭" },
      { id: "impressao", label: "Impressão", icone: "⎙" },
      { id: "config", label: "Configurações", icone: "⚙" },
    ],
  },
];

type Props = {
  nome?: string | null;
  secao: SecaoLoja;
  onSecao: (secao: SecaoLoja) => void;
  badgePedidos?: number;
  children: ReactNode;
};

/** Layout da área da loja: menu agrupado à esquerda + conteúdo */
export function ShellLoja({
  nome,
  secao,
  onSecao,
  badgePedidos = 0,
  children,
}: Props) {
  const [menuAberto, setMenuAberto] = useState(false);
  const titulo = LABELS_SECAO[secao] ?? "Loja";

  function escolher(id: SecaoLoja) {
    onSecao(id);
    setMenuAberto(false);
  }

  const nav = (
    <nav className="flex flex-col gap-4 p-3">
      {GRUPOS.map((grupo) => (
        <div key={grupo.titulo}>
          <p className="mb-1.5 px-3 text-[10px] font-semibold tracking-wider text-muted uppercase">
            {grupo.titulo}
          </p>
          <div className="flex flex-col gap-0.5">
            {grupo.itens.map((item) => {
              const ativa = secao === item.id;
              const badge =
                item.id === "pedidos" && badgePedidos > 0
                  ? badgePedidos
                  : null;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => escolher(item.id)}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                    ativa
                      ? "bg-dende text-white"
                      : "text-foreground hover:bg-dende-suave"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`w-5 shrink-0 text-center text-sm ${
                      ativa ? "text-white/90" : "text-muted"
                    }`}
                  >
                    {item.icone}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {badge != null ? (
                    <span
                      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                        ativa
                          ? "bg-white text-dende"
                          : "bg-red-500 text-white"
                      }`}
                    >
                      {badge > 99 ? "99+" : badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="admin-shell flex min-h-full flex-1 bg-[#f7f4f0]">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-linha bg-white md:flex">
        <div className="border-b border-linha px-4 py-4">
          <p className="font-display text-lg font-semibold text-dende">
            {MARCA.nomeCurto}
          </p>
          <p className="text-xs font-medium tracking-wide text-muted uppercase">
            Painel da Loja
          </p>
          {nome ? (
            <p className="mt-2 truncate text-sm text-foreground">{nome}</p>
          ) : null}
        </div>
        <div className="flex-1 overflow-y-auto">{nav}</div>
        <div className="border-t border-linha px-4 py-3">
          <BotaoSair />
        </div>
      </aside>

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
                  Loja
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
            <div className="border-t border-linha px-4 py-3">
              <BotaoSair />
            </div>
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
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
              Aceite pedidos, edite o cardápio e configure sua loja.
            </p>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
