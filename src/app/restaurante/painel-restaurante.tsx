"use client";

import { useCallback, useEffect, useState } from "react";
import { DEMO } from "@/lib/demo-ids";
import {
  atualizarStatusPedido,
  listarPedidosDoRestaurante,
  type PedidoComItens,
} from "@/lib/pedidos";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { formatarReais, STATUS_PEDIDO_LABEL } from "@/types/database";

export function PainelRestaurante() {
  const [pedidos, setPedidos] = useState<PedidoComItens[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [acaoId, setAcaoId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setErro(
        "Supabase ainda não está configurado. Crie o arquivo .env.local com as chaves e rode o SQL da Fase 1.",
      );
      setCarregando(false);
      return;
    }

    try {
      setErro(null);
      const dados = await listarPedidosDoRestaurante(
        DEMO.restauranteAcarajeId,
        ["novo", "aceito"],
      );
      setPedidos(dados);
    } catch (e) {
      const mensagem =
        e instanceof Error ? e.message : "Não foi possível carregar os pedidos.";
      setErro(mensagem);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function mudarStatus(
    pedidoId: string,
    status: "aceito" | "pronto",
  ) {
    setAcaoId(pedidoId);
    setErro(null);

    try {
      await atualizarStatusPedido(pedidoId, status);
      await carregar();
    } catch (e) {
      const mensagem =
        e instanceof Error ? e.message : "Não foi possível atualizar o pedido.";
      setErro(mensagem);
    } finally {
      setAcaoId(null);
    }
  }

  if (carregando) {
    return (
      <p className="rounded-2xl bg-white/70 px-5 py-4 text-sm text-[#5C4A3A]">
        Carregando pedidos…
      </p>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {erro ? (
        <div className="rounded-2xl border border-[#C45C26]/30 bg-[#FFF4EB] px-5 py-4 text-sm text-[#5C3A1E]">
          {erro}
        </div>
      ) : null}

      {pedidos.length === 0 && !erro ? (
        <div className="rounded-2xl border border-dashed border-[#C4A882] bg-white/60 px-5 py-10 text-center text-sm text-[#5C4A3A]">
          Nenhum pedido novo ou em preparo no momento.
        </div>
      ) : null}

      <ul className="flex flex-col gap-4">
        {pedidos.map((pedido) => {
          const ocupado = acaoId === pedido.id;
          const totalComEntrega = Number(pedido.total) + Number(pedido.taxa_entrega);

          return (
            <li
              key={pedido.id}
              className="rounded-2xl border border-[#E8D9C8] bg-white px-5 py-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium tracking-wide text-[#8A7460] uppercase">
                    Pedido #{pedido.id.slice(0, 8)}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[#1A120C]">
                    {formatarReais(totalComEntrega)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    pedido.status === "novo"
                      ? "bg-[#FFF4EB] text-[#C45C26]"
                      : "bg-[#E8F5E9] text-[#2F6B3A]"
                  }`}
                >
                  {STATUS_PEDIDO_LABEL[pedido.status]}
                </span>
              </div>

              <p className="mt-3 text-sm text-[#5C4A3A]">
                {pedido.endereco_entrega}
              </p>
              {pedido.observacao ? (
                <p className="mt-1 text-sm text-[#8A7460]">
                  Obs.: {pedido.observacao}
                </p>
              ) : null}

              <ul className="mt-3 border-t border-[#F0E6D8] pt-3 text-sm text-[#1A120C]">
                {pedido.itens_pedido.map((item) => (
                  <li
                    key={item.id}
                    className="flex justify-between gap-3 py-0.5"
                  >
                    <span>
                      {item.quantidade}× {item.nome}
                    </span>
                    <span className="text-[#5C4A3A]">
                      {formatarReais(
                        Number(item.preco_unitario) * item.quantidade,
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                {pedido.status === "novo" ? (
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => void mudarStatus(pedido.id, "aceito")}
                    className="flex-1 rounded-xl bg-[#C45C26] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#A84C1E] disabled:opacity-60"
                  >
                    {ocupado ? "Salvando…" : "Aceitar"}
                  </button>
                ) : null}

                {pedido.status === "aceito" ? (
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => void mudarStatus(pedido.id, "pronto")}
                    className="flex-1 rounded-xl bg-[#2F6B3A] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#245530] disabled:opacity-60"
                  >
                    {ocupado ? "Salvando…" : "Marcar como pronto"}
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => {
          setCarregando(true);
          void carregar();
        }}
        className="text-sm font-medium text-[#C45C26] underline-offset-2 hover:underline"
      >
        Atualizar lista
      </button>
    </div>
  );
}
