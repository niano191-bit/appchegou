"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { criarCheckoutMercadoPago, simularPagamento } from "@/lib/pagamentos";
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
  const [carregando, setCarregando] = useState(true);
  const [acao, setAcao] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

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

  useEffect(() => {
    if (resultado === "sucesso") {
      setInfo("Retorno do Mercado Pago: sucesso. Confirmando…");
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
      setErro("Pagamento não concluído no Mercado Pago. Tente de novo.");
    } else if (resultado === "pendente") {
      setInfo("Pagamento pendente no Mercado Pago. Aguarde a confirmação.");
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

  if (carregando) {
    return (
      <p className="rounded-2xl bg-white/70 px-5 py-4 text-sm text-[#5C4A3A]">
        Carregando pagamento…
      </p>
    );
  }

  if (!pedido) {
    return (
      <div className="rounded-2xl border border-[#C45C26]/30 bg-[#FFF4EB] px-5 py-4 text-sm text-[#5C3A1E]">
        {erro ?? "Pedido não encontrado."}
      </div>
    );
  }

  const total = Number(pedido.total) + Number(pedido.taxa_entrega);

  if (pedido.status_pagamento === "pago") {
    return (
      <div className="rounded-2xl border border-[#2F6B3A]/40 bg-[#E8F5E9] px-5 py-4 text-sm text-[#1B4332]">
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
      <div className="rounded-2xl border border-[#E8D9C8] bg-white px-5 py-4">
        <p className="text-xs font-medium tracking-wide text-[#8A7460] uppercase">
          {pedido.restaurante_nome}
        </p>
        <p className="mt-1 text-lg font-semibold text-[#1A120C]">
          Total {formatarReais(total)}
        </p>
        <p className="mt-1 text-sm text-[#5C4A3A]">
          {STATUS_PAGAMENTO_LABEL[pedido.status_pagamento]}
        </p>
        <ul className="mt-3 space-y-1 border-t border-[#F0E6D8] pt-3 text-sm text-[#1A120C]">
          {pedido.itens_pedido.map((item) => (
            <li key={item.id}>
              {item.quantidade}× {item.nome}
            </li>
          ))}
        </ul>
      </div>

      {erro ? (
        <div className="rounded-2xl border border-[#C45C26]/30 bg-[#FFF4EB] px-5 py-4 text-sm text-[#5C3A1E]">
          {erro}
        </div>
      ) : null}
      {info ? (
        <div className="rounded-2xl border border-[#1565C0]/30 bg-[#E3F2FD] px-5 py-4 text-sm text-[#1565C0]">
          {info}
        </div>
      ) : null}

      <section className="flex flex-col gap-3 rounded-2xl border border-[#E8D9C8] bg-white px-5 py-4">
        <h2 className="text-sm font-semibold tracking-wide text-[#8A7460] uppercase">
          Simular pagamento (recomendado agora)
        </h2>
        <button
          type="button"
          disabled={Boolean(acao)}
          onClick={() => void pagarSimulado("pix")}
          className="rounded-xl bg-[#C45C26] px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {acao === "pix" ? "Processando…" : "Simular Pix (teste)"}
        </button>
        <button
          type="button"
          disabled={Boolean(acao)}
          onClick={() => void pagarSimulado("cartao")}
          className="rounded-xl border border-[#C45C26] px-4 py-3.5 text-sm font-semibold text-[#C45C26] disabled:opacity-60"
        >
          {acao === "cartao" ? "Processando…" : "Simular cartão (teste)"}
        </button>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-dashed border-[#C4A882] bg-white/60 px-5 py-4">
        <h2 className="text-sm font-semibold tracking-wide text-[#8A7460] uppercase">
          Mercado Pago (sandbox)
        </h2>
        <p className="text-sm text-[#5C4A3A]">
          Quando você colocar a chave de teste no arquivo .env.local, este botão
          abre o checkout oficial.
        </p>
        <button
          type="button"
          disabled={Boolean(acao)}
          onClick={() => void pagarMercadoPago()}
          className="rounded-xl bg-[#1A120C] px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {acao === "mp" ? "Abrindo…" : "Pagar no Mercado Pago (teste)"}
        </button>
      </section>
    </div>
  );
}
