"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AvisoPedido } from "@/components/aviso-pedido";
import { SeloAoVivo } from "@/components/selo-ao-vivo";
import { useTempoRealPedidos } from "@/hooks/use-tempo-real-pedidos";
import { textoPrevisaoEntrega } from "@/lib/eta";
import {
  avaliarPedidoCliente,
  buscarPedido,
  cancelarPedido,
  solicitarEstornoPix,
  type PedidoDetalhe,
} from "@/lib/pedidos";
import {
  pedidoEhDinheiroPendente,
  textoCobrancaDinheiro,
} from "@/lib/pagamento-pedido";
import { rotuloPedido } from "@/lib/pedido-rotulo";
import {
  rascunhoDePedido,
  salvarRascunhoRepetir,
} from "@/lib/repetir-pedido";
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
      ? `A loja não pôde atender: ${motivo}.`
      : "A loja não pôde atender este pedido.";
  }
  if (pedido.cancelado_por === "dono") {
    const motivo = pedido.motivo_cancelamento?.trim();
    return motivo
      ? `Pedido cancelado pela operação: ${motivo}.`
      : "Pedido cancelado pela operação.";
  }
  if (pedido.cancelado_por === "cliente") {
    return "Você cancelou este pedido.";
  }
  return "Pedido cancelado.";
}

function mensagemPagamentoCancelado(pedido: PedidoDetalhe) {
  if (pedido.status_pagamento === "estornado") {
    return "O Pix foi estornado. O valor deve voltar na sua conta em instantes.";
  }
  if (pedido.status_pagamento === "reembolso_pendente") {
    return "Informe sua chave Pix abaixo para receber o estorno.";
  }
  if (pedido.status_pagamento === "pago") {
    return "Estamos processando o estorno do Pix…";
  }
  return null;
}

export function AcompanharPedido({ pedidoId }: { pedidoId: string }) {
  const router = useRouter();
  const [pedido, setPedido] = useState<PedidoDetalhe | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [chavePix, setChavePix] = useState("");
  const [estornando, setEstornando] = useState(false);
  const [nota, setNota] = useState(5);
  const [comentarioAvaliacao, setComentarioAvaliacao] = useState("");
  const [avaliando, setAvaliando] = useState(false);
  /** Atualiza o texto “chega em X min” a cada minuto */
  const [, setTick] = useState(0);

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

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

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

  async function enviarChaveEstorno() {
    if (!chavePix.trim()) {
      setErro("Digite sua chave Pix.");
      return;
    }
    setEstornando(true);
    setErro(null);
    try {
      await solicitarEstornoPix(pedidoId, chavePix.trim());
      setChavePix("");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao solicitar estorno.");
    } finally {
      setEstornando(false);
    }
  }

  if (carregando) {
    return (
      <p className="rounded-2xl bg-white/70 px-5 py-4 text-sm text-muted">
        Carregando pedido…
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

  const cancelado = pedido.status === "cancelado";
  const indiceAtual = cancelado ? -1 : ETAPAS.indexOf(pedido.status);
  const total =
    Number(pedido.total) +
    Number(pedido.taxa_entrega) +
    Number(pedido.gorjeta ?? 0);
  const dinheiroPendente = pedidoEhDinheiroPendente(pedido);
  const aguardandoPagamento =
    !cancelado &&
    pedido.status_pagamento !== "pago" &&
    !dinheiroPendente;
  const podeCancelar = pedido.status === "novo";
  const podeRepetir =
    (pedido.status === "entregue" || cancelado) &&
    pedido.itens_pedido.some((i) => i.item_cardapio_id && i.quantidade > 0);

  function repetirPedido(atual: PedidoDetalhe) {
    const rascunho = rascunhoDePedido(atual);
    if (!rascunho) {
      window.alert("Não foi possível repetir este pedido.");
      return;
    }
    salvarRascunhoRepetir(rascunho);
    router.push(`/cliente/${atual.restaurante_id}`);
  }

  async function enviarAvaliacao(atual: PedidoDetalhe) {
    setAvaliando(true);
    setErro(null);
    try {
      await avaliarPedidoCliente(
        atual.id,
        nota,
        comentarioAvaliacao.trim() || undefined,
      );
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao avaliar.");
    } finally {
      setAvaliando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SeloAoVivo />
      {erro ? (
        <div className="rounded-2xl border border-dende/30 bg-dende-suave px-5 py-4 text-sm text-muted">
          {erro}
        </div>
      ) : null}
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

      {dinheiroPendente && !cancelado ? (
        <div className="rounded-2xl border border-dende/30 bg-dende-suave px-5 py-4 text-sm text-muted">
          <p className="font-medium text-foreground">
            Pagamento em dinheiro na entrega
          </p>
          <p className="mt-1">{textoCobrancaDinheiro(pedido)}</p>
          <p className="mt-1">
            Tenha o valor pronto. O entregador confirma o recebimento na
            entrega.
          </p>
        </div>
      ) : null}

      <div className="rounded-2xl border border-linha bg-white px-5 py-4">
        <p className="text-xs font-medium tracking-wide text-muted uppercase">
          {pedido.restaurante_nome}
        </p>
        <p className="mt-1 text-lg font-semibold text-foreground">
          Pedido {rotuloPedido(pedido)}
        </p>
        <p className="mt-2 text-sm text-muted">
          {aguardandoPagamento
            ? "Assim que pagar, o restaurante poderá aceitar."
            : cancelado
              ? mensagemCancelado(pedido)
              : DICA[pedido.status]}
        </p>
        {!aguardandoPagamento && !cancelado
          ? (() => {
              const previsao = textoPrevisaoEntrega(pedido);
              return previsao ? (
                <p className="mt-2 text-sm font-semibold text-mar">{previsao}</p>
              ) : null;
            })()
          : null}
        <p className="mt-3 text-base font-semibold text-dende">
          {aguardandoPagamento
            ? STATUS_PAGAMENTO_LABEL[pedido.status_pagamento]
            : STATUS_PEDIDO_LABEL[pedido.status]}
        </p>
      </div>

      {cancelado ? (
        <div className="rounded-2xl border border-dende/30 bg-dende-suave px-5 py-4 text-sm text-muted">
          <p>{mensagemCancelado(pedido)}</p>
          {mensagemPagamentoCancelado(pedido) ? (
            <p className="mt-2 font-medium text-foreground">
              {mensagemPagamentoCancelado(pedido)}
            </p>
          ) : null}
          {pedido.status_pagamento === "estornado" ? (
            <p className="mt-1 text-xs">
              {STATUS_PAGAMENTO_LABEL.estornado}
            </p>
          ) : null}
          {pedido.status_pagamento === "reembolso_pendente" ? (
            <div className="mt-3 flex flex-col gap-2">
              <label className="text-xs font-medium text-foreground">
                Sua chave Pix (celular, e-mail, CPF ou CNPJ)
              </label>
              <input
                type="text"
                value={chavePix}
                onChange={(e) => setChavePix(e.target.value)}
                placeholder="Ex.: 71999999999 ou email@…"
                className="rounded-xl border border-linha bg-white px-3 py-2.5 text-sm text-foreground"
              />
              <button
                type="button"
                disabled={estornando}
                onClick={() => void enviarChaveEstorno()}
                className="rounded-xl bg-mar px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {estornando ? "Enviando estorno…" : "Receber estorno no Pix"}
              </button>
            </div>
          ) : null}
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
              {item.observacao?.trim() ? (
                <span className="block text-xs text-muted">
                  Obs.: {item.observacao.trim()}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
        {Number(pedido.desconto) > 0 ? (
          <p className="mt-3 text-sm text-mar">
            Cupom {pedido.cupom_codigo}: −
            {formatarReais(Number(pedido.desconto))}
          </p>
        ) : null}
        {Number(pedido.gorjeta ?? 0) > 0 ? (
          <p className="mt-2 text-sm text-muted">
            Gorjeta: {formatarReais(Number(pedido.gorjeta))}
          </p>
        ) : null}
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

      {pedido.status === "entregue" && pedido.avaliacao_nota == null ? (
        <div className="rounded-2xl border border-linha bg-white px-5 py-4">
          <p className="text-sm font-semibold text-foreground">
            Como foi o pedido?
          </p>
          <div className="mt-3 flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNota(n)}
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                  nota >= n
                    ? "bg-dende text-white"
                    : "border border-linha text-muted"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <label className="mt-3 block text-sm text-muted">
            Comentário (opcional)
            <input
              value={comentarioAvaliacao}
              onChange={(e) => setComentarioAvaliacao(e.target.value)}
              placeholder="Ex.: chegou quente e rápido"
              className="mt-1 w-full rounded-xl border border-linha px-3 py-2.5 text-foreground outline-none focus:border-dende"
            />
          </label>
          <button
            type="button"
            disabled={avaliando}
            onClick={() => void enviarAvaliacao(pedido)}
            className="mt-3 w-full rounded-xl bg-mar px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {avaliando ? "Enviando…" : "Enviar avaliação"}
          </button>
        </div>
      ) : null}

      {pedido.avaliacao_nota != null ? (
        <div className="rounded-2xl border border-mar/30 bg-mar-suave px-5 py-4 text-sm text-mar">
          Sua nota: {pedido.avaliacao_nota}/5
          {pedido.avaliacao_comentario?.trim()
            ? ` — ${pedido.avaliacao_comentario.trim()}`
            : ""}
        </div>
      ) : null}

      {podeRepetir ? (
        <button
          type="button"
          onClick={() => repetirPedido(pedido)}
          className="rounded-xl bg-dende px-4 py-3 text-sm font-semibold text-white"
        >
          Pedir de novo
        </button>
      ) : null}
    </div>
  );
}
