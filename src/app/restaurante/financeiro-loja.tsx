"use client";

import { useEffect, useState } from "react";
import { listarPedidosDoRestaurante, type PedidoComItens } from "@/lib/pedidos";
import { obterSessaoCliente } from "@/lib/sessao-cliente";
import { formatarReais } from "@/types/database";

function hojeSalvador() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bahia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function dataPedido(p: PedidoComItens) {
  if (p.data_pedido) return p.data_pedido;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bahia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(p.criado_em));
}

export function FinanceiroLoja() {
  const [pedidos, setPedidos] = useState<PedidoComItens[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const user = await obterSessaoCliente();
        if (!user?.restaurante_id) {
          throw new Error("Sua conta não está ligada a um restaurante.");
        }
        const lista = await listarPedidosDoRestaurante(
          user.restaurante_id,
          ["entregue", "pronto", "a_caminho", "aceito"],
          "desc",
        );
        setPedidos(lista);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao carregar.");
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  if (carregando) {
    return (
      <p className="rounded-2xl bg-white/70 px-5 py-4 text-sm text-muted">
        Carregando financeiro…
      </p>
    );
  }

  if (erro) {
    return (
      <div className="rounded-2xl border border-dende/30 bg-dende-suave px-5 py-4 text-sm text-dende-escuro">
        {erro}
      </div>
    );
  }

  const hoje = hojeSalvador();
  const doDia = pedidos.filter((p) => dataPedido(p) === hoje);
  const entreguesHoje = doDia.filter((p) => p.status === "entregue");
  const vendasHoje = entreguesHoje.reduce(
    (acc, p) => acc + Number(p.total ?? 0),
    0,
  );
  const emAndamento = doDia.filter((p) =>
    ["aceito", "pronto", "a_caminho"].includes(p.status),
  ).length;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        Resumo do dia ({hoje}). Valores de pratos (sem taxa de entrega).
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-linha bg-white px-4 py-4">
          <p className="text-xs text-muted">Vendas entregues hoje</p>
          <p className="mt-1 text-xl font-semibold text-foreground">
            {formatarReais(vendasHoje)}
          </p>
        </div>
        <div className="rounded-2xl border border-linha bg-white px-4 py-4">
          <p className="text-xs text-muted">Pedidos entregues</p>
          <p className="mt-1 text-xl font-semibold text-foreground">
            {entreguesHoje.length}
          </p>
        </div>
        <div className="rounded-2xl border border-linha bg-white px-4 py-4">
          <p className="text-xs text-muted">Em andamento hoje</p>
          <p className="mt-1 text-xl font-semibold text-foreground">
            {emAndamento}
          </p>
        </div>
        <div className="rounded-2xl border border-linha bg-white px-4 py-4">
          <p className="text-xs text-muted">Ticket médio</p>
          <p className="mt-1 text-xl font-semibold text-foreground">
            {formatarReais(
              entreguesHoje.length
                ? vendasHoje / entreguesHoje.length
                : 0,
            )}
          </p>
        </div>
      </div>
      <p className="text-xs text-muted">
        O repasse oficial (comissão e Pix) aparece no fechamento do Admin.
      </p>
    </div>
  );
}
