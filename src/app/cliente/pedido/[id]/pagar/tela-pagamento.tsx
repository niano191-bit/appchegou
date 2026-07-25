"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buscarOpcoesPagamento,
  criarCheckoutLucPaguei,
  criarCheckoutMercadoPago,
  escolherPagamentoDinheiro,
  simularPagamento,
  type OpcoesPagamento,
} from "@/lib/pagamentos";
import { buscarPedido, type PedidoDetalhe } from "@/lib/pedidos";
import { pedidoEhDinheiroPendente } from "@/lib/pagamento-pedido";
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
  const [pixLuc, setPixLuc] = useState<{
    copiaECola?: string;
    qrCodeBase64?: string;
  } | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [trocoPara, setTrocoPara] = useState("");
  const [precisaTroco, setPrecisaTroco] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const [dados, gates] = await Promise.all([
        buscarPedido(pedidoId),
        buscarOpcoesPagamento(),
      ]);
      setPedido(dados);
      setOpcoes(gates);
      setErro(null);
      return dados;
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : "Não foi possível carregar o pedido.",
      );
      return null;
    } finally {
      setCarregando(false);
    }
  }, [pedidoId]);

  const irSePago = useCallback(
    async (silencioso = false) => {
      try {
        const dados = await buscarPedido(pedidoId);
        setPedido(dados);
        if (dados.status_pagamento === "pago") {
          setInfo("Pagamento confirmado! Redirecionando…");
          router.push(`/cliente/pedido/${pedidoId}`);
          return true;
        }
        if (!silencioso) {
          setInfo("Ainda não recebemos a confirmação. Se já pagou, aguarde alguns segundos.");
        }
        return false;
      } catch (e) {
        if (!silencioso) {
          setErro(
            e instanceof Error
              ? e.message
              : "Não foi possível verificar o pagamento.",
          );
        }
        return false;
      }
    },
    [pedidoId, router],
  );

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

  // Após gerar Pix LucPaguei: consulta a cada 4s se o webhook marcou como pago
  useEffect(() => {
    if (!pixLuc) return;

    void irSePago(true);
    const id = window.setInterval(() => {
      void irSePago(true);
    }, 4000);

    return () => window.clearInterval(id);
  }, [pixLuc, irSePago]);

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
    setPixLuc(null);
    try {
      const res = await criarCheckoutLucPaguei(pedidoId);
      if (res.ja_pago && res.destino) {
        router.push(res.destino);
        return;
      }
      if (res.simular) {
        await simularPagamento(pedidoId, "pix");
        router.push(`/cliente/pedido/${pedidoId}`);
        return;
      }
      if (res.checkoutUrl && !res.copiaECola) {
        window.location.href = res.checkoutUrl;
        return;
      }
      if (res.copiaECola || res.qrCodeBase64) {
        setPixLuc({
          copiaECola: res.copiaECola,
          qrCodeBase64: res.qrCodeBase64,
        });
        setInfo(
          "Pix gerado. Escaneie ou copie o código e aguarde a confirmação automática.",
        );
        return;
      }
      throw new Error("LucPaguei não retornou Pix nem link de pagamento.");
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

  async function verificarPagamentoManual() {
    setVerificando(true);
    setErro(null);
    try {
      await irSePago(false);
    } finally {
      setVerificando(false);
    }
  }

  async function pagarDinheiro() {
    setAcao("dinheiro");
    setErro(null);
    try {
      let troco: number | null = null;
      if (precisaTroco) {
        troco = Number(trocoPara.replace(",", "."));
        if (!Number.isFinite(troco) || troco <= 0) {
          throw new Error("Informe o valor do troco (ex.: 50).");
        }
      }
      await escolherPagamentoDinheiro(pedidoId, troco);
      router.push(`/cliente/pedido/${pedidoId}`);
    } catch (e) {
      setErro(
        e instanceof Error
          ? e.message
          : "Não foi possível escolher pagamento em dinheiro.",
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

  const total =
    Number(pedido.total) +
    Number(pedido.taxa_entrega) +
    Number(pedido.gorjeta ?? 0);
  const mpAtivo = opcoes?.mercadopago.ativo ?? true;
  const lpAtivo = opcoes?.lucpaguei.ativo ?? true;
  const lpConfigurado = opcoes?.lucpaguei.configurado ?? false;
  const dinheiroAtivo = opcoes?.dinheiro.ativo ?? true;
  const mostrarSimulacao = !lpConfigurado;

  if (pedido.status_pagamento === "pago" || pedidoEhDinheiroPendente(pedido)) {
    return (
      <div className="rounded-2xl border border-mar/40 bg-mar-suave px-5 py-4 text-sm text-mar">
        {pedidoEhDinheiroPendente(pedido)
          ? "Você escolheu pagar em dinheiro na entrega. "
          : "Este pedido já está pago. "}
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
        {Number(pedido.desconto) > 0 ? (
          <p className="mt-1 text-xs text-mar">
            Cupom {pedido.cupom_codigo} (−
            {formatarReais(Number(pedido.desconto))})
          </p>
        ) : null}
        {Number(pedido.gorjeta ?? 0) > 0 ? (
          <p className="mt-1 text-xs text-muted">
            Gorjeta ao entregador: {formatarReais(Number(pedido.gorjeta))}
          </p>
        ) : null}
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

      {mostrarSimulacao ? (
        <section className="flex flex-col gap-3 rounded-2xl border border-linha bg-white px-5 py-4">
          <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
            Simular pagamento
          </h2>
          <p className="text-sm text-muted">
            Use só enquanto o Pix real (LucPaguei) não estiver configurado.
          </p>
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
      ) : null}

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

      {dinheiroAtivo ? (
        <section className="flex flex-col gap-3 rounded-2xl border border-dashed border-dende/40 bg-dende-suave/40 px-5 py-4">
          <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
            Dinheiro na entrega
          </h2>
          <p className="text-sm text-muted">
            Pague ao entregador quando receber. Total:{" "}
            <span className="font-semibold text-foreground">
              {formatarReais(total)}
            </span>
          </p>
          <label className="flex items-center gap-3 text-sm text-foreground">
            <input
              type="checkbox"
              checked={precisaTroco}
              onChange={(e) => setPrecisaTroco(e.target.checked)}
              className="h-4 w-4 accent-dende"
            />
            Preciso de troco
          </label>
          {precisaTroco ? (
            <label className="block text-sm text-muted">
              Vou pagar com (R$)
              <input
                type="text"
                inputMode="decimal"
                value={trocoPara}
                onChange={(e) => setTrocoPara(e.target.value)}
                placeholder={`Ex.: ${Math.ceil(total / 10) * 10 || 50}`}
                className="mt-1 w-full rounded-xl border border-linha bg-white px-3 py-2.5 text-foreground outline-none focus:border-dende"
              />
            </label>
          ) : null}
          <button
            type="button"
            disabled={Boolean(acao)}
            onClick={() => void pagarDinheiro()}
            className="rounded-xl bg-dende px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {acao === "dinheiro"
              ? "Confirmando…"
              : "Pagar em dinheiro na entrega"}
          </button>
        </section>
      ) : null}

      {lpAtivo ? (
        <section className="flex flex-col gap-3 rounded-2xl border border-dashed border-mar/40 bg-mar-suave/40 px-5 py-4">
          <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
            LucPaguei
          </h2>
          <p className="text-sm text-muted">
            {lpConfigurado
              ? "Gera Pix pelo LucPaguei (QR + copia e cola)."
              : "LucPaguei sem chaves no servidor — o botão usa modo teste."}
          </p>
          <button
            type="button"
            disabled={Boolean(acao)}
            onClick={() => void pagarLucPaguei()}
            className="rounded-xl bg-mar px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {acao === "lp"
              ? "Gerando Pix…"
              : lpConfigurado
                ? "Pagar no LucPaguei"
                : "Pagar no LucPaguei (teste)"}
          </button>

          {pixLuc?.copiaECola || pixLuc?.qrCodeBase64 ? (
            <div className="space-y-3 rounded-xl border border-mar/20 bg-white px-4 py-4">
              {pixLuc.qrCodeBase64 ? (
                <>
                  <p className="text-center text-xs font-medium text-muted uppercase">
                    Escaneie o QR Code no app do banco
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      pixLuc.qrCodeBase64.startsWith("data:")
                        ? pixLuc.qrCodeBase64
                        : `data:image/png;base64,${pixLuc.qrCodeBase64}`
                    }
                    alt="QR Code Pix"
                    className="mx-auto h-56 w-56 rounded-lg bg-white"
                  />
                </>
              ) : null}

              {pixLuc.copiaECola ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted uppercase">
                    Ou Pix copia e cola
                  </p>
                  <textarea
                    readOnly
                    value={pixLuc.copiaECola}
                    rows={3}
                    className="w-full rounded-xl border border-linha bg-mar-suave/30 px-3 py-2 text-xs text-foreground"
                  />
                  <button
                    type="button"
                    className="w-full rounded-xl border border-mar px-3 py-2 text-sm font-semibold text-mar"
                    onClick={() => {
                      void navigator.clipboard.writeText(pixLuc.copiaECola!);
                      setInfo("Código Pix copiado.");
                    }}
                  >
                    Copiar código Pix
                  </button>
                </div>
              ) : null}

              <p className="text-center text-xs text-muted">
                Aguardando confirmação automática…
              </p>
              <button
                type="button"
                disabled={verificando || Boolean(acao)}
                onClick={() => void verificarPagamentoManual()}
                className="w-full rounded-xl bg-mar px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {verificando ? "Verificando…" : "Já paguei — verificar"}
              </button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
