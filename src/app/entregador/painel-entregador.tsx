"use client";

import { useCallback, useEffect, useState } from "react";
import { DEMO } from "@/lib/demo-ids";
import {
  atualizarStatusPedido,
  listarCorridas,
  type CorridaComItens,
} from "@/lib/pedidos";
import { formatarReais, STATUS_PEDIDO_LABEL } from "@/types/database";

export function PainelEntregador() {
  const [corridas, setCorridas] = useState<CorridaComItens[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [acaoId, setAcaoId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      const dados = await listarCorridas(DEMO.entregadorId);
      setCorridas(dados);
    } catch (e) {
      setErro(
        e instanceof Error
          ? e.message
          : "Não foi possível carregar as corridas.",
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function acao(
    pedidoId: string,
    status: "a_caminho" | "entregue",
  ) {
    setAcaoId(pedidoId);
    setErro(null);

    try {
      await atualizarStatusPedido(pedidoId, status, {
        entregadorId: DEMO.entregadorId,
      });
      await carregar();
    } catch (e) {
      setErro(
        e instanceof Error
          ? e.message
          : "Não foi possível atualizar a corrida.",
      );
    } finally {
      setAcaoId(null);
    }
  }

  if (carregando) {
    return (
      <p className="rounded-2xl bg-white/70 px-5 py-4 text-sm text-[#5C4A3A]">
        Carregando corridas…
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

      {corridas.length === 0 && !erro ? (
        <div className="rounded-2xl border border-dashed border-[#C4A882] bg-white/60 px-5 py-10 text-center text-sm text-[#5C4A3A]">
          Nenhuma corrida pronta no momento.
          <br />
          Peça no app do cliente e marque como pronto no restaurante.
        </div>
      ) : null}

      <ul className="flex flex-col gap-4">
        {corridas.map((corrida) => {
          const ocupado = acaoId === corrida.id;
          const totalComEntrega =
            Number(corrida.total) + Number(corrida.taxa_entrega);

          return (
            <li
              key={corrida.id}
              className="rounded-2xl border border-[#E8D9C8] bg-white px-5 py-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium tracking-wide text-[#8A7460] uppercase">
                    {corrida.restaurante_nome}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[#1A120C]">
                    {formatarReais(totalComEntrega)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    corrida.status === "pronto"
                      ? "bg-[#FFF4EB] text-[#C45C26]"
                      : "bg-[#E3F2FD] text-[#1565C0]"
                  }`}
                >
                  {STATUS_PEDIDO_LABEL[corrida.status]}
                </span>
              </div>

              <p className="mt-3 text-sm font-medium text-[#1A120C]">
                Entregar em:
              </p>
              <p className="text-sm text-[#5C4A3A]">
                {corrida.endereco_entrega}
              </p>

              <ul className="mt-3 border-t border-[#F0E6D8] pt-3 text-sm text-[#1A120C]">
                {corrida.itens_pedido.map((item) => (
                  <li key={item.id} className="py-0.5">
                    {item.quantidade}× {item.nome}
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                {corrida.status === "pronto" ? (
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => void acao(corrida.id, "a_caminho")}
                    className="flex-1 rounded-xl bg-[#C45C26] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#A84C1E] disabled:opacity-60"
                  >
                    {ocupado ? "Salvando…" : "Aceitar corrida"}
                  </button>
                ) : null}

                {corrida.status === "a_caminho" ? (
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => void acao(corrida.id, "entregue")}
                    className="flex-1 rounded-xl bg-[#2F6B3A] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#245530] disabled:opacity-60"
                  >
                    {ocupado ? "Salvando…" : "Confirmar entrega"}
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
