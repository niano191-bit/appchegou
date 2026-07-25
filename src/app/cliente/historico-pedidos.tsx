"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { pedidoEhDinheiroPendente } from "@/lib/pagamento-pedido";
import { listarMeusPedidos, type PedidoCliente } from "@/lib/pedidos";
import { rotuloPedido } from "@/lib/pedido-rotulo";
import {
  formatarReais,
  STATUS_PAGAMENTO_LABEL,
  STATUS_PEDIDO_LABEL,
} from "@/types/database";

function formatarQuando(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/** Lista pedidos anteriores do cliente */
export function HistoricoPedidos() {
  const [pedidos, setPedidos] = useState<PedidoCliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      setPedidos(await listarMeusPedidos());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar histórico.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (carregando) {
    return (
      <p className="text-sm text-muted">Carregando seus pedidos…</p>
    );
  }

  if (erro) {
    return (
      <div className="rounded-2xl border border-dende/30 bg-dende-suave px-5 py-4 text-sm text-dende-escuro">
        {erro}
      </div>
    );
  }

  if (pedidos.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-linha bg-white/60 px-5 py-6 text-center text-sm text-muted">
        Você ainda não fez pedidos. Escolha um restaurante acima.
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
        Seus pedidos
      </h2>
      <ul className="flex flex-col gap-3">
        {pedidos.map((p) => {
          const total = Number(p.total) + Number(p.taxa_entrega);
          const dinheiro = pedidoEhDinheiroPendente(p);
          const pendente = p.status_pagamento !== "pago" && !dinheiro;
          const href = pendente
            ? `/cliente/pedido/${p.id}/pagar`
            : `/cliente/pedido/${p.id}`;

          return (
            <li key={p.id}>
              <Link
                href={href}
                className="block rounded-2xl border border-linha bg-white px-4 py-3 transition hover:border-dende/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">
                      {p.restaurante_nome}
                    </p>
                    <p className="text-xs text-muted">
                      {formatarQuando(p.criado_em)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-dende">
                    {formatarReais(total)}
                  </p>
                </div>
                <p className="mt-2 text-xs text-muted">
                  {pendente
                    ? STATUS_PAGAMENTO_LABEL[p.status_pagamento]
                    : dinheiro
                      ? "Dinheiro na entrega"
                      : STATUS_PEDIDO_LABEL[p.status]}
                  {" · "}
                  Pedido {rotuloPedido(p)}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
