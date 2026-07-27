"use client";

import { useEffect, useState } from "react";
import { listarPedidosDoRestaurante, type PedidoComItens } from "@/lib/pedidos";
import { rotuloPedido } from "@/lib/pedido-rotulo";
import { obterSessaoCliente } from "@/lib/sessao-cliente";

export function AvaliacoesLoja() {
  const [itens, setItens] = useState<PedidoComItens[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const user = await obterSessaoCliente();
        if (!user?.restaurante_id) {
          throw new Error("Sua conta não está ligada a um restaurante.");
        }
        const pedidos = await listarPedidosDoRestaurante(
          user.restaurante_id,
          ["entregue"],
          "desc",
        );
        setItens(
          pedidos.filter(
            (p) => p.avaliacao_nota != null && Number(p.avaliacao_nota) > 0,
          ),
        );
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
        Carregando avaliações…
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

  if (itens.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-linha bg-white px-5 py-10 text-center text-sm text-muted">
        Ainda não há avaliações dos clientes nesta loja.
      </div>
    );
  }

  const media =
    itens.reduce((acc, p) => acc + Number(p.avaliacao_nota ?? 0), 0) /
    itens.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border border-linha bg-white px-4 py-4">
        <p className="text-sm text-muted">Média das avaliações</p>
        <p className="mt-1 text-2xl font-semibold text-foreground">
          {media.toFixed(1)}
          <span className="text-base font-normal text-muted"> / 5</span>
        </p>
        <p className="mt-1 text-xs text-muted">
          {itens.length} avaliação{itens.length === 1 ? "" : "ões"}
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {itens.map((p) => (
          <li
            key={p.id}
            className="rounded-2xl border border-linha bg-white px-4 py-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted">
                Pedido {rotuloPedido(p)}
              </p>
              <p className="text-sm font-semibold text-dende">
                {p.avaliacao_nota}/5
              </p>
            </div>
            {p.avaliacao_comentario?.trim() ? (
              <p className="mt-2 text-sm text-foreground">
                {p.avaliacao_comentario.trim()}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted">Sem comentário.</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
