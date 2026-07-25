"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SeloAoVivo } from "@/components/selo-ao-vivo";
import { useTempoRealPedidos } from "@/hooks/use-tempo-real-pedidos";
import {
  atualizarStatusPedido,
  listarPedidosDoRestaurante,
  type PedidoComItens,
} from "@/lib/pedidos";
import { obterSessaoCliente } from "@/lib/sessao-cliente";
import { formatarReais, STATUS_PEDIDO_LABEL } from "@/types/database";

type Aba = "agora" | "historico";

export function PainelRestaurante() {
  const restauranteIdRef = useRef<string | null>(null);
  const [aba, setAba] = useState<Aba>("agora");
  const [pedidos, setPedidos] = useState<PedidoComItens[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [acaoId, setAcaoId] = useState<string | null>(null);

  const carregar = useCallback(
    async (silencioso = false) => {
      try {
        if (!silencioso) setErro(null);

        if (!restauranteIdRef.current) {
          const user = await obterSessaoCliente();
          if (!user?.restaurante_id) {
            throw new Error("Sua conta não está ligada a um restaurante.");
          }
          restauranteIdRef.current = user.restaurante_id;
        }

        const dados =
          aba === "agora"
            ? await listarPedidosDoRestaurante(
                restauranteIdRef.current,
                ["novo", "aceito"],
                "asc",
              )
            : await listarPedidosDoRestaurante(
                restauranteIdRef.current,
                ["pronto", "a_caminho", "entregue"],
                "desc",
              );

        setPedidos(dados);
        setErro(null);
      } catch (e) {
        const mensagem =
          e instanceof Error
            ? e.message
            : "Não foi possível carregar os pedidos.";
        setErro(mensagem);
      } finally {
        setCarregando(false);
      }
    },
    [aba],
  );

  useEffect(() => {
    setCarregando(true);
    void carregar(false);
  }, [carregar]);

  useTempoRealPedidos(() => {
    void carregar(true);
  });

  async function mudarStatus(
    pedidoId: string,
    status: "aceito" | "pronto",
  ) {
    setAcaoId(pedidoId);
    setErro(null);

    try {
      await atualizarStatusPedido(pedidoId, status);
      await carregar(true);
    } catch (e) {
      const mensagem =
        e instanceof Error ? e.message : "Não foi possível atualizar o pedido.";
      setErro(mensagem);
    } finally {
      setAcaoId(null);
    }
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <SeloAoVivo />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setAba("agora")}
          className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
            aba === "agora"
              ? "bg-dende text-white"
              : "border border-linha bg-white text-muted"
          }`}
        >
          Agora
        </button>
        <button
          type="button"
          onClick={() => setAba("historico")}
          className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
            aba === "historico"
              ? "bg-dende text-white"
              : "border border-linha bg-white text-muted"
          }`}
        >
          Histórico
        </button>
      </div>

      {erro ? (
        <div className="rounded-2xl border border-dende/30 bg-dende-suave px-5 py-4 text-sm text-muted">
          {erro}
        </div>
      ) : null}

      {carregando ? (
        <p className="rounded-2xl bg-white/70 px-5 py-4 text-sm text-muted">
          Carregando pedidos…
        </p>
      ) : null}

      {!carregando && pedidos.length === 0 && !erro ? (
        <div className="rounded-2xl border border-dashed border-linha bg-white/60 px-5 py-10 text-center text-sm text-muted">
          {aba === "agora"
            ? "Nenhum pedido novo ou em preparo no momento."
            : "Ainda não há pedidos no histórico."}
        </div>
      ) : null}

      <ul className="flex flex-col gap-4">
        {pedidos.map((pedido) => {
          const ocupado = acaoId === pedido.id;
          const totalComEntrega =
            Number(pedido.total) + Number(pedido.taxa_entrega);

          return (
            <li
              key={pedido.id}
              className="rounded-2xl border border-linha bg-white px-5 py-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium tracking-wide text-muted uppercase">
                    Pedido #{pedido.id.slice(0, 8)}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {formatarReais(totalComEntrega)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    pedido.status === "novo"
                      ? "bg-dende-suave text-dende"
                      : pedido.status === "entregue"
                        ? "bg-linha text-muted"
                        : "bg-mar-suave text-mar"
                  }`}
                >
                  {STATUS_PEDIDO_LABEL[pedido.status]}
                </span>
              </div>

              <p className="mt-3 text-sm text-muted">
                {pedido.endereco_entrega}
              </p>
              {pedido.observacao ? (
                <p className="mt-1 text-sm text-muted">
                  Obs.: {pedido.observacao}
                </p>
              ) : null}

              <ul className="mt-3 border-t border-linha pt-3 text-sm text-foreground">
                {pedido.itens_pedido.map((item) => (
                  <li
                    key={item.id}
                    className="flex justify-between gap-3 py-0.5"
                  >
                    <span>
                      {item.quantidade}× {item.nome}
                    </span>
                    <span className="text-muted">
                      {formatarReais(
                        Number(item.preco_unitario) * item.quantidade,
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              {aba === "agora" ? (
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  {pedido.status === "novo" ? (
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => void mudarStatus(pedido.id, "aceito")}
                      className="flex-1 rounded-xl bg-dende px-4 py-3 text-sm font-semibold text-white transition hover:bg-dende-escuro disabled:opacity-60"
                    >
                      {ocupado ? "Salvando…" : "Aceitar"}
                    </button>
                  ) : null}

                  {pedido.status === "aceito" ? (
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => void mudarStatus(pedido.id, "pronto")}
                      className="flex-1 rounded-xl bg-mar px-4 py-3 text-sm font-semibold text-white transition hover:bg-mar/90 disabled:opacity-60"
                    >
                      {ocupado ? "Salvando…" : "Marcar como pronto"}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
