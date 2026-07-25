"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AvisoPedido } from "@/components/aviso-pedido";
import { SeloAoVivo } from "@/components/selo-ao-vivo";
import { useTempoRealPedidos } from "@/hooks/use-tempo-real-pedidos";
import {
  buscarPedido,
  cancelarPedido,
  type PedidoDetalhe,
} from "@/lib/pedidos";
import {
  formatarReais,
  STATUS_PAGAMENTO_LABEL,
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
  cancelado: "Pedido cancelado.",
};

function mensagemCancelado(pedido: PedidoDetalhe) {
  if (pedido.cancelado_por === "restaurante") {
    const motivo = pedido.motivo_cancelamento?.trim();
    return motivo
      ? `A loja não pôde atender: ${motivo}. Se já pagou, peça o estorno pelo WhatsApp da loja ou no LucPaguei.`
      : "A loja não pôde atender este pedido. Se já pagou, peça o estorno pelo WhatsApp da loja ou no LucPaguei.";
  }
  if (pedido.cancelado_por === "cliente") {
    return "Você cancelou este pedido.";
  }
  return "Pedido cancelado.";
}

export function AcompanharPedido({ pedidoId }: { pedidoId: string }) {
  const [pedido, setPedido] = useState<PedidoDetalhe | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);

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

  async function cancelar() {
    if (!confirm("Cancelar este pedido?")) return;
    setCancelando(true);
    setErro(null);
    try {
      await cancelarPedido(pedidoId);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao cancelar.");
    } finally {
      setCancelando(false);
    }
  }

  if (carregando) {
    return (
      <p className="rounded-2xl bg-white/70 px-5 py-4 text-sm text-muted">
        Carregando pedido…
      </p>
    );
  }

  if (erro || !pedido) {
    return (
      <div className="rounded-2xl border border-dende/30 bg-dende-suave px-5 py-4 text-sm text-muted">
        {erro ?? "Pedido não encontrado."}
      </div>
    );
  }

  const cancelado = pedido.status === "cancelado";
  const indiceAtual = cancelado ? -1 : ETAPAS.indexOf(pedido.status);
  const total = Number(pedido.total) + Number(pedido.taxa_entrega);
  const aguardandoPagamento =
    !cancelado && pedido.status_pagamento !== "pago";
  const podeCancelar = pedido.status === "novo";

  return (
    <div className="flex flex-col gap-4">
      <SeloAoVivo />
      <AvisoPedido
        ativo={
          !aguardandoPagamento &&
          !cancelado &&
          pedido.status !== "entregue"
        }
        buscarStatus={async () => {
          const p = await buscarPedido(pedidoId);
          return {
            status: p.status,
            rotuloExtra: p.restaurante_nome,
          };
        }}
      />

      {aguardandoPagamento ? (
        <div className="rounded-2xl border border-dende/30 bg-dende-suave px-5 py-4 text-sm text-muted">
          <p className="font-medium">
            {STATUS_PAGAMENTO_LABEL[pedido.status_pagamento]}
          </p>
          <p className="mt-1">
            O restaurante só vê o pedido depois do pagamento.
          </p>
          <Link
            href={`/cliente/pedido/${pedidoId}/pagar`}
            className="mt-3 inline-flex rounded-xl bg-dende px-4 py-2.5 text-sm font-semibold text-white"
          >
            Ir para o pagamento
          </Link>
        </div>
      ) : null}

      <div className="rounded-2xl border border-linha bg-white px-5 py-4">
        <p className="text-xs font-medium tracking-wide text-muted uppercase">
          {pedido.restaurante_nome}
        </p>
        <p className="mt-1 text-lg font-semibold text-foreground">
          Pedido #{pedido.id.slice(0, 8)}
        </p>
        <p className="mt-2 text-sm text-muted">
          {aguardandoPagamento
            ? "Assim que pagar, o restaurante poderá aceitar."
            : cancelado
              ? mensagemCancelado(pedido)
              : DICA[pedido.status]}
        </p>
        <p className="mt-3 text-base font-semibold text-dende">
          {aguardandoPagamento
            ? STATUS_PAGAMENTO_LABEL[pedido.status_pagamento]
            : STATUS_PEDIDO_LABEL[pedido.status]}
        </p>
      </div>

      {cancelado ? (
        <div className="rounded-2xl border border-dende/30 bg-dende-suave px-5 py-4 text-sm text-muted">
          {mensagemCancelado(pedido)}
        </div>
      ) : null}

      {!cancelado ? (
        <ol className="rounded-2xl border border-linha bg-white px-5 py-4">
          {ETAPAS.map((etapa, index) => {
            const feita = index <= indiceAtual;
            return (
              <li
                key={etapa}
                className={`flex items-center gap-3 py-2 text-sm ${
                  feita ? "font-medium text-foreground" : "text-muted"
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                    feita
                      ? "bg-mar text-white"
                      : "bg-linha text-muted"
                  }`}
                >
                  {feita ? "✓" : index + 1}
                </span>
                {STATUS_PEDIDO_LABEL[etapa]}
              </li>
            );
          })}
        </ol>
      ) : null}

      <div className="rounded-2xl border border-linha bg-white px-5 py-4 text-sm">
        <p className="text-muted">
          Entrega em {pedido.endereco_entrega}
          {pedido.bairro_entrega ? ` — ${pedido.bairro_entrega}` : ""}
        </p>
        <ul className="mt-3 space-y-1 border-t border-linha pt-3 text-foreground">
          {pedido.itens_pedido.map((item) => (
            <li key={item.id}>
              {item.quantidade}× {item.nome}
            </li>
          ))}
        </ul>
        <p className="mt-3 font-semibold text-foreground">
          Total {formatarReais(total)}
        </p>
      </div>

      {podeCancelar ? (
        <button
          type="button"
          disabled={cancelando}
          onClick={() => void cancelar()}
          className="rounded-xl border border-dende px-4 py-3 text-sm font-semibold text-dende disabled:opacity-60"
        >
          {cancelando ? "Cancelando…" : "Cancelar pedido"}
        </button>
      ) : null}
    </div>
  );
}
