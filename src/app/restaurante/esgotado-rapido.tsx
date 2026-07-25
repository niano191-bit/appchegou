"use client";

import { useCallback, useEffect, useState } from "react";
import {
  atualizarMeuPrato,
  buscarMeuCardapio,
} from "@/lib/restaurante-loja";
import type { ItemCardapio } from "@/types/database";
import { formatarReais } from "@/types/database";

/** Atalhos grandes para marcar prato esgotado/disponível na cozinha */
export function EsgotadoRapido() {
  const [cardapio, setCardapio] = useState<ItemCardapio[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [acaoId, setAcaoId] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      const dados = await buscarMeuCardapio();
      setCardapio(
        [...dados.cardapio].sort((a, b) =>
          a.nome.localeCompare(b.nome, "pt-BR"),
        ),
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar pratos.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function alternar(item: ItemCardapio) {
    setAcaoId(item.id);
    setErro(null);
    try {
      await atualizarMeuPrato(item.id, { disponivel: !item.disponivel });
      setCardapio((prev) =>
        prev.map((p) =>
          p.id === item.id ? { ...p, disponivel: !item.disponivel } : p,
        ),
      );
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : "Não foi possível atualizar o prato.",
      );
    } finally {
      setAcaoId(null);
    }
  }

  const esgotados = cardapio.filter((i) => !i.disponivel).length;

  return (
    <div className="rounded-2xl border border-linha bg-white px-4 py-3">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div>
          <p className="text-sm font-medium text-foreground">Esgotado agora</p>
          <p className="mt-0.5 text-xs text-muted">
            {carregando
              ? "Carregando pratos…"
              : esgotados === 0
                ? "Todos os pratos disponíveis"
                : `${esgotados} esgotado${esgotados === 1 ? "" : "s"}`}
          </p>
        </div>
        <span className="text-sm font-semibold text-dende">
          {aberto ? "Fechar" : "Abrir"}
        </span>
      </button>

      {aberto ? (
        <div className="mt-3 space-y-2 border-t border-linha pt-3">
          {erro ? (
            <p className="text-xs text-dende">{erro}</p>
          ) : null}
          {cardapio.length === 0 && !carregando ? (
            <p className="text-sm text-muted">
              Nenhum prato no cardápio ainda.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {cardapio.map((item) => {
                const ocupado = acaoId === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => void alternar(item)}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold disabled:opacity-60 ${
                        item.disponivel
                          ? "border border-linha bg-white text-foreground"
                          : "border border-dende/40 bg-dende-suave text-dende"
                      }`}
                    >
                      <span>
                        {item.nome}
                        <span className="mt-0.5 block text-xs font-normal text-muted">
                          {formatarReais(Number(item.preco))}
                        </span>
                      </span>
                      <span className="shrink-0">
                        {ocupado
                          ? "…"
                          : item.disponivel
                            ? "Esgotado"
                            : "Disponível"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
