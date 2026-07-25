"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buscarOpcoesPagamento,
  criarCheckoutLucPaguei,
  criarCheckoutMercadoPago,
  simularPagamento,
  type OpcoesPagamento,
} from "@/lib/pagamentos";
import { buscarPedido, type PedidoDetalhe } from "@/lib/pedidos";
import { formatarReais, STATUS_PAGAMENTO_LABEL } from "@/types/database";

export function TelaPagamento({
  pedidoId,
  resultado,
}: {
  pedidoId: string;
  resultado?: string;
}) {
  const router = useRouter();
  const [pedido, setPedido] = useState<PedidoDetalhe | null>(null);
  const [opcoes, setOpcoes] = useState<OpcoesPagamento | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [acao, setAcao] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const [dados, gates] = await Promise.all([
        buscarPedido(pedidoId),
        buscarOpcoesPagamento(),
      ]);
      setPedido(dados);
      setOpcoes(gates);
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

  useEffect(() => {
    if (resultado === "sucesso") {
      setInfo("Retorno do pagamento: sucesso. Confirmando…");
      void (async () => {
        try {
          await fetch("/api/pagamentos/confirmar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pedidoId, forma: "pix" }),
          });
          router.replace(`/cliente/pedido/${pedidoId}`);
        } catch {
          setErro("Não foi possível confirmar o pagamento.");
        }
      })();
    } else if (resultado === "falhou") {
      setErro("Pagamento não concluído. Tente de novo.");
    } else if (resultado === "pendente") {
      setInfo("Pagamento pendente. Aguarde a confirmação.");
    }
  }, [resultado, pedidoId, router]);

  async function pagarSimulado(forma: "pix" | "cartao") {
    setAcao(forma);
    setErro(null);
    try {
      await simularPagamento(pedidoId, forma);
      router.push(`/cliente/pedido/${pedidoId}`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro na simulação.");
    } finally {
      setAcao(null);
    }
  }

  async function pagarMercadoPago() {
    setAcao("mp");
    setErro(null);
    try {
      const res = await criarCheckoutMercadoPago(pedidoId);
      if (res.ja_pago && res.destino) {
        router.push(res.destino);
        return;
      }
      if (res.simular) {
        await simularPagamento(pedidoId, "pix");
        router.push(`/cliente/pedido/${pedidoId}`);
        return;
      }
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }
      throw new Error("Link de pagamento não disponível.");
    } catch (e) {
      setErro(
        e instanceof Error
          ? e.message
          : "Não foi possível abrir o Mercado Pago.",
      );
    } finally {
      setAcao(null);
    }
  }

  async function pagarLucPaguei() {
    setAcao("lp");
    setErro(null);
    try {
      const res = await criarCheckoutLucPaguei(pedidoId);
      if (res.ja_pago && res.destino) {
        router.push(res.destino);
        return;
      }
      if (res.simular || !res.checkoutUrl) {
        // Sem chave ainda: marca como pago em modo teste
        await simularPagamento(pedidoId, "pix");
        router.push(`/cliente/pedido/${pedidoId}`);
        return;
      }
      window.location.href = res.checkoutUrl;
    } catch (e) {
      setErro(
        e instanceof Error
          ? e.message
          : "Não foi possível abrir o LucPaguei.",
      );
    } finally {
      setAcao(null);
    }
  }

  if (carregando) {
    return (
      <p className="rounded-2xl bg-white/70 px-5 py-4 text-sm text-muted">
        Carregando pagamento…
      </p>
    );
  }

  if (!pedido) {
    return (
      <div className="rounded-2xl border border-dende/30 bg-dende-suave px-5 py-4 text-sm text-muted">
        {erro ?? "Pedido não encontrado."}
      </div>
    );
  }

  const total = Number(pedido.total) + Number(pedido.taxa_entrega);
  const mpAtivo = opcoes?.mercadopago.ativo ?? true;
  const lpAtivo = opcoes?.lucpaguei.ativo ?? true;

  if (pedido.status_pagamento === "pago") {
    return (
      <div className="rounded-2xl border border-mar/40 bg-mar-suave px-5 py-4 text-sm text-mar">
        Este pedido já está pago.{" "}
        <button
          type="button"
          className="font-semibold underline"
          onClick={() => router.push(`/cliente/pedido/${pedidoId}`)}
        >
          Acompanhar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-linha bg-white px-5 py-4">
        <p className="text-xs font-medium tracking-wide text-muted uppercase">
          {pedido.restaurante_nome}
        </p>
        <p className="mt-1 text-lg font-semibold text-foreground">
          Total {formatarReais(total)}
        </p>
        <p className="mt-1 text-sm text-muted">
          {STATUS_PAGAMENTO_LABEL[pedido.status_pagamento]}
        </p>
        <ul className="mt-3 space-y-1 border-t border-linha pt-3 text-sm text-foreground">
          {pedido.itens_pedido.map((item) => (
            <li key={item.id}>
              {item.quantidade}× {item.nome}
            </li>
          ))}
        </ul>
      </div>

      {erro ? (
        <div className="rounded-2xl border border-dende/30 bg-dende-suave px-5 py-4 text-sm text-muted">
          {erro}
        </div>
      ) : null}
      {info ? (
        <div className="rounded-2xl border border-mar/30 bg-mar-suave px-5 py-4 text-sm text-mar">
          {info}
        </div>
      ) : null}

      <section className="flex flex-col gap-3 rounded-2xl border border-linha bg-white px-5 py-4">
        <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
          Simular pagamento (recomendado agora)
        </h2>
        <button
          type="button"
          disabled={Boolean(acao)}
          onClick={() => void pagarSimulado("pix")}
          className="rounded-xl bg-dende px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {acao === "pix" ? "Processando…" : "Simular Pix (teste)"}
        </button>
        <button
          type="button"
          disabled={Boolean(acao)}
          onClick={() => void pagarSimulado("cartao")}
          className="rounded-xl border border-dende px-4 py-3.5 text-sm font-semibold text-dende disabled:opacity-60"
        >
          {acao === "cartao" ? "Processando…" : "Simular cartão (teste)"}
        </button>
      </section>

      {mpAtivo ? (
        <section className="flex flex-col gap-3 rounded-2xl border border-dashed border-linha bg-white/60 px-5 py-4">
          <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
            Mercado Pago
          </h2>
          <p className="text-sm text-muted">
            {opcoes?.mercadopago.configurado
              ? "Abre o checkout oficial do Mercado Pago."
              : "Sem chave no servidor: o botão usa modo teste."}
          </p>
          <button
            type="button"
            disabled={Boolean(acao)}
            onClick={() => void pagarMercadoPago()}
            className="rounded-xl bg-foreground px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {acao === "mp"
              ? "Abrindo…"
              : opcoes?.mercadopago.configurado
                ? "Pagar no Mercado Pago"
                : "Pagar no Mercado Pago (teste)"}
          </button>
        </section>
      ) : null}

      {lpAtivo ? (
        <section className="flex flex-col gap-3 rounded-2xl border border-dashed border-mar/40 bg-mar-suave/40 px-5 py-4">
          <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
            LucPaguei
          </h2>
          <p className="text-sm text-muted">
            {opcoes?.lucpaguei.configurado
              ? "Abre o checkout oficial do LucPaguei."
              : "Sem chave no servidor: o botão confirma em modo teste. Quando tiver a API, colocamos as chaves no .env."}
          </p>
          <button
            type="button"
            disabled={Boolean(acao)}
            onClick={() => void pagarLucPaguei()}
            className="rounded-xl bg-mar px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {acao === "lp"
              ? "Abrindo…"
              : opcoes?.lucpaguei.configurado
                ? "Pagar no LucPaguei"
                : "Pagar no LucPaguei (teste)"}
          </button>
        </section>
      ) : null}
    </div>
  );
}
