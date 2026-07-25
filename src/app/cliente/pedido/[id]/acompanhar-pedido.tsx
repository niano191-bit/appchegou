"use client";

import { useCallback, useEffect, useState } from "react";
import { SeloAoVivo } from "@/components/selo-ao-vivo";
import { useTempoRealPedidos } from "@/hooks/use-tempo-real-pedidos";
import { buscarPedido, type PedidoDetalhe } from "@/lib/pedidos";
import {
  formatarReais,
  STATUS_PEDIDO_LABEL,
  type StatusPedido,
} from "@/types/database";

const ETAPAS: StatusPedido[] = [
  "novo",
  "aceito",
  "pronto",
  "a_caminho",
  "entregue",
];

const DICA: Record<StatusPedido, string> = {
  novo: "Pedido enviado. Aguardando o restaurante aceitar.",
  aceito: "Restaurante aceitou. Estão preparando seu pedido.",
  pronto: "Pedido pronto. Aguardando entregador.",
  a_caminho: "Saiu para entrega. Já está a caminho!",
  entregue: "Entregue. Bom apetite!",
};

export function AcompanharPedido({ pedidoId }: { pedidoId: string }) {
  const [pedido, setPedido] = useState<PedidoDetalhe | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const dados = await buscarPedido(pedidoId);
      setPedido(dados);
      setErro(null);
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : "Não foi possível carregar o pedido.",
      );
    } finally {
      setCarregando(false);
    }
  }, [pedidoId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useTempoRealPedidos(() => {
    void carregar();
  });

  if (carregando) {
    return (
      <p className="rounded-2xl bg-white/70 px-5 py-4 text-sm text-[#5C4A3A]">
        Carregando pedido…
      </p>
    );
  }

  if (erro || !pedido) {
    return (
      <div className="rounded-2xl border border-[#C45C26]/30 bg-[#FFF4EB] px-5 py-4 text-sm text-[#5C3A1E]">
        {erro ?? "Pedido não encontrado."}
      </div>
    );
  }

  const indiceAtual = ETAPAS.indexOf(pedido.status);
  const total =
    Number(pedido.total) + Number(pedido.taxa_entrega);

  return (
    <div className="flex flex-col gap-4">
      <SeloAoVivo />

      <div className="rounded-2xl border border-[#E8D9C8] bg-white px-5 py-4">
        <p className="text-xs font-medium tracking-wide text-[#8A7460] uppercase">
          {pedido.restaurante_nome}
        </p>
        <p className="mt-1 text-lg font-semibold text-[#1A120C]">
          Pedido #{pedido.id.slice(0, 8)}
        </p>
        <p className="mt-2 text-sm text-[#5C4A3A]">{DICA[pedido.status]}</p>
        <p className="mt-3 text-base font-semibold text-[#C45C26]">
          {STATUS_PEDIDO_LABEL[pedido.status]}
        </p>
      </div>

      <ol className="rounded-2xl border border-[#E8D9C8] bg-white px-5 py-4">
        {ETAPAS.map((etapa, index) => {
          const feita = index <= indiceAtual;
          return (
            <li
              key={etapa}
              className={`flex items-center gap-3 py-2 text-sm ${
                feita ? "text-[#1A120C] font-medium" : "text-[#B0A090]"
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  feita
                    ? "bg-[#2F6B3A] text-white"
                    : "bg-[#F0E6D8] text-[#8A7460]"
                }`}
              >
                {feita ? "✓" : index + 1}
              </span>
              {STATUS_PEDIDO_LABEL[etapa]}
            </li>
          );
        })}
      </ol>

      <div className="rounded-2xl border border-[#E8D9C8] bg-white px-5 py-4 text-sm">
        <p className="text-[#5C4A3A]">Entrega em {pedido.endereco_entrega}</p>
        <ul className="mt-3 space-y-1 border-t border-[#F0E6D8] pt-3 text-[#1A120C]">
          {pedido.itens_pedido.map((item) => (
            <li key={item.id}>
              {item.quantidade}× {item.nome}
            </li>
          ))}
        </ul>
        <p className="mt-3 font-semibold text-[#1A120C]">
          Total {formatarReais(total)}
        </p>
      </div>
    </div>
  );
}
