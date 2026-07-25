"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { buscarRestauranteComCardapio } from "@/lib/catalogo";
import { TAXA_ENTREGA_PADRAO } from "@/lib/constantes";
import {
  buscarBairrosAtivos,
  buscarConfiguracaoPublica,
  buscarTaxaEntrega,
} from "@/lib/dono";
import {
  lerEnderecoSalvo,
  salvarEndereco,
} from "@/lib/endereco-cliente";
import {
  mensagemBloqueioPedido,
  rotuloStatusOperacao,
  statusOperacaoLoja,
  type StatusOperacaoLoja,
} from "@/lib/horario";
import {
  textoPedidoMinimo,
  valorPedidoMinimo,
} from "@/lib/pedido-minimo";
import { criarPedido } from "@/lib/pedidos";
import { consumirRascunhoRepetir } from "@/lib/repetir-pedido";
import type {
  BairroEntrega,
  Configuracao,
  ItemCardapio,
  Restaurante,
} from "@/types/database";
import { formatarReais } from "@/types/database";

type ItemCarrinho = {
  item: ItemCardapio;
  quantidade: number;
};

export function CardapioComCarrinho({
  restauranteId,
}: {
  restauranteId: string;
}) {
  const router = useRouter();
  const [restaurante, setRestaurante] = useState<Restaurante | null>(null);
  const [cardapio, setCardapio] = useState<ItemCardapio[]>([]);
  const [carrinho, setCarrinho] = useState<Record<string, ItemCarrinho>>({});
  const [endereco, setEndereco] = useState("");
  const [observacao, setObservacao] = useState("");
  const [bairroId, setBairroId] = useState("");
  const [bairros, setBairros] = useState<BairroEntrega[]>([]);
  const [taxaPadrao, setTaxaPadrao] = useState(TAXA_ENTREGA_PADRAO);
  const [config, setConfig] = useState<Configuracao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [avisoRepetir, setAvisoRepetir] = useState<string | null>(null);

  useEffect(() => {
    const salvo = lerEnderecoSalvo();
    setEndereco(salvo || "Rua Teste, 100 — Barra, Salvador");
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        setErro(null);
        const [dados, taxa, cfg, zonas] = await Promise.all([
          buscarRestauranteComCardapio(restauranteId),
          buscarTaxaEntrega().catch(() => TAXA_ENTREGA_PADRAO),
          buscarConfiguracaoPublica().catch(() => null),
          buscarBairrosAtivos().catch(() => [] as BairroEntrega[]),
        ]);
        setRestaurante({
          ...dados.restaurante,
          pausado: dados.restaurante.pausado ?? false,
          pedido_minimo: Number(dados.restaurante.pedido_minimo ?? 0),
        });
        setCardapio(dados.cardapio);
        setTaxaPadrao(taxa);
        setConfig(cfg);
        setBairros(zonas);
        if (zonas.length === 1) setBairroId(zonas[0]!.id);

        const rascunho = consumirRascunhoRepetir(restauranteId);
        if (rascunho) {
          const porId = new Map(dados.cardapio.map((i) => [i.id, i]));
          const novoCarrinho: Record<string, ItemCarrinho> = {};
          let ok = 0;
          let faltando = 0;
          for (const linha of rascunho.itens) {
            const item = porId.get(linha.item_cardapio_id);
            if (!item || !item.disponivel) {
              faltando += 1;
              continue;
            }
            novoCarrinho[item.id] = {
              item,
              quantidade: linha.quantidade,
            };
            ok += 1;
          }
          if (ok > 0) {
            setCarrinho(novoCarrinho);
            if (rascunho.endereco_entrega) {
              setEndereco(rascunho.endereco_entrega);
            }
            if (rascunho.observacao) {
              setObservacao(rascunho.observacao);
            }
            setAvisoRepetir(
              faltando > 0
                ? `Pedido repetido com ${ok} item(ns). ${faltando} não está mais disponível.`
                : "Pedido anterior carregado no carrinho. Confira e finalize.",
            );
          } else {
            setAvisoRepetir(
              "Nenhum item daquele pedido está disponível agora. Escolha outros pratos.",
            );
          }
        }
      } catch (e) {
        setErro(
          e instanceof Error ? e.message : "Não foi possível carregar o cardápio.",
        );
      } finally {
        setCarregando(false);
      }
    })();
  }, [restauranteId]);

  const itensCarrinho = useMemo(() => Object.values(carrinho), [carrinho]);

  const subtotal = useMemo(
    () =>
      itensCarrinho.reduce(
        (soma, linha) => soma + Number(linha.item.preco) * linha.quantidade,
        0,
      ),
    [itensCarrinho],
  );

  const bairroSelecionado = bairros.find((b) => b.id === bairroId) ?? null;
  const taxaEntrega = bairroSelecionado
    ? Number(bairroSelecionado.taxa)
    : bairros.length > 0
      ? 0
      : taxaPadrao;
  const total = subtotal + taxaEntrega;
  const pedidoMinimo = valorPedidoMinimo(restaurante);
  const abaixoDoMinimo = pedidoMinimo > 0 && subtotal + 1e-9 < pedidoMinimo;
  const avisoMinimo = textoPedidoMinimo(pedidoMinimo);

  function alterarQuantidade(item: ItemCardapio, delta: number) {
    setCarrinho((atual) => {
      const atualQtd = atual[item.id]?.quantidade ?? 0;
      const nova = atualQtd + delta;

      if (nova <= 0) {
        const { [item.id]: _, ...resto } = atual;
        return resto;
      }

      return {
        ...atual,
        [item.id]: { item, quantidade: nova },
      };
    });
  }

  async function enviarPedido() {
    if (!itensCarrinho.length) {
      setErro("Adicione pelo menos um item ao carrinho.");
      return;
    }

    if (!endereco.trim()) {
      setErro("Informe o endereço de entrega.");
      return;
    }

    if (bairros.length > 0 && !bairroId) {
      setErro("Escolha o bairro de entrega.");
      return;
    }

    if (abaixoDoMinimo) {
      setErro(
        `Pedido mínimo desta loja: ${formatarReais(pedidoMinimo)}. Falta ${formatarReais(pedidoMinimo - subtotal)} no subtotal.`,
      );
      return;
    }

    setEnviando(true);
    setErro(null);
    setSucesso(null);

    try {
      const pedido = await criarPedido({
        restauranteId,
        endereco_entrega: endereco.trim(),
        observacao: observacao.trim() || undefined,
        bairroId: bairroId || undefined,
        itens: itensCarrinho.map((linha) => ({
          item_cardapio_id: linha.item.id,
          quantidade: linha.quantidade,
        })),
      });

      salvarEndereco(endereco);
      setCarrinho({});
      setSucesso("Pedido criado! Abrindo pagamento…");
      router.push(`/cliente/pedido/${pedido.id}/pagar`);
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : "Não foi possível fazer o pedido.",
      );
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) {
    return (
      <p className="rounded-2xl bg-white/70 px-5 py-4 text-sm text-muted">
        Carregando cardápio…
      </p>
    );
  }

  if (!restaurante) {
    return (
      <div className="rounded-2xl border border-dende/30 bg-dende-suave px-5 py-4 text-sm text-muted">
        {erro ?? "Restaurante não encontrado."}
      </div>
    );
  }

  const statusLoja: StatusOperacaoLoja = config
    ? statusOperacaoLoja(restaurante, config)
    : restaurante.pausado
      ? "pausada"
      : "aberta";
  const aceitaPedidos = statusLoja === "aberta";
  const avisoFechado = config
    ? mensagemBloqueioPedido(statusLoja, config)
    : "";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-3xl text-foreground">
            {restaurante.nome}
          </h1>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              aceitaPedidos
                ? "bg-mar-suave text-mar"
                : "bg-dende-suave text-dende"
            }`}
          >
            {rotuloStatusOperacao(statusLoja)}
          </span>
        </div>
        {restaurante.descricao ? (
          <p className="mt-1 text-sm text-muted">{restaurante.descricao}</p>
        ) : null}
        {avisoMinimo ? (
          <p className="mt-2 text-sm font-medium text-dende">{avisoMinimo}</p>
        ) : null}
      </div>

      {!aceitaPedidos && avisoFechado ? (
        <div className="rounded-2xl border border-dende/30 bg-dende-suave px-5 py-4 text-sm text-muted">
          {avisoFechado}
        </div>
      ) : null}

      {erro ? (
        <div className="rounded-2xl border border-dende/30 bg-dende-suave px-5 py-4 text-sm text-muted">
          {erro}
        </div>
      ) : null}

      {sucesso ? (
        <div className="rounded-2xl border border-[#2F6B3A]/40 bg-[#E8F5E9] px-5 py-4 text-sm text-[#1B4332]">
          {sucesso}
        </div>
      ) : null}

      {avisoRepetir ? (
        <div className="rounded-2xl border border-mar/30 bg-mar-suave px-5 py-4 text-sm text-mar">
          {avisoRepetir}
        </div>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
          Cardápio
        </h2>
        <ul className="flex flex-col gap-3">
          {cardapio.map((item) => {
            const qtd = carrinho[item.id]?.quantidade ?? 0;
            return (
              <li
                key={item.id}
                className="overflow-hidden rounded-2xl border border-linha bg-white"
              >
                {item.imagem_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imagem_url}
                    alt=""
                    className="h-36 w-full object-cover"
                  />
                ) : null}
                <div className="flex items-start justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="font-semibold text-foreground">{item.nome}</p>
                    {item.descricao ? (
                      <p className="mt-0.5 text-sm text-muted">
                        {item.descricao}
                      </p>
                    ) : null}
                    <p className="mt-2 text-sm font-medium text-dende">
                      {formatarReais(Number(item.preco))}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {qtd > 0 ? (
                      <>
                        <button
                          type="button"
                          onClick={() => alterarQuantidade(item, -1)}
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-linha text-lg text-foreground"
                          aria-label="Remover um"
                        >
                          −
                        </button>
                        <span className="w-5 text-center text-sm font-semibold">
                          {qtd}
                        </span>
                      </>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => alterarQuantidade(item, 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-dende text-lg text-white"
                      aria-label="Adicionar um"
                    >
                      +
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-2xl border border-linha bg-white px-5 py-4">
        <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
          Carrinho
        </h2>

        {itensCarrinho.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Seu carrinho está vazio. Toque no + para adicionar.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-1 text-sm">
            {itensCarrinho.map((linha) => (
              <li key={linha.item.id} className="flex justify-between gap-3">
                <span>
                  {linha.quantidade}× {linha.item.nome}
                </span>
                <span>
                  {formatarReais(Number(linha.item.preco) * linha.quantidade)}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 space-y-3 border-t border-[#F0E6D8] pt-4">
          {bairros.length > 0 ? (
            <label className="block text-sm text-muted">
              Bairro de entrega
              <select
                value={bairroId}
                onChange={(e) => setBairroId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-linha bg-white px-3 py-2.5 text-foreground outline-none focus:border-dende"
              >
                <option value="">Selecione o bairro…</option>
                {bairros.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nome} — {formatarReais(Number(b.taxa))}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="block text-sm text-muted">
            Endereço de entrega
            <input
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              className="mt-1 w-full rounded-xl border border-linha px-3 py-2.5 text-foreground outline-none focus:border-dende"
            />
          </label>
          <label className="block text-sm text-muted">
            Observação (opcional)
            <input
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex.: sem pimenta"
              className="mt-1 w-full rounded-xl border border-linha px-3 py-2.5 text-foreground outline-none focus:border-dende"
            />
          </label>
        </div>

        <div className="mt-4 space-y-1 text-sm text-muted">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatarReais(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>
              Taxa de entrega
              {bairroSelecionado ? ` (${bairroSelecionado.nome})` : ""}
            </span>
            <span>
              {bairros.length > 0 && !bairroSelecionado
                ? "—"
                : formatarReais(taxaEntrega)}
            </span>
          </div>
          <div className="flex justify-between text-base font-semibold text-foreground">
            <span>Total</span>
            <span>{formatarReais(total)}</span>
          </div>
          {abaixoDoMinimo ? (
            <p className="pt-1 text-xs font-medium text-dende">
              Falta {formatarReais(pedidoMinimo - subtotal)} para o pedido
              mínimo ({formatarReais(pedidoMinimo)}).
            </p>
          ) : null}
        </div>

        <button
          type="button"
          disabled={
            enviando ||
            itensCarrinho.length === 0 ||
            !aceitaPedidos ||
            abaixoDoMinimo ||
            (bairros.length > 0 && !bairroId)
          }
          onClick={() => void enviarPedido()}
          className="mt-4 w-full rounded-xl bg-dende px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-dende-escuro disabled:opacity-60"
        >
          {enviando
            ? "Enviando…"
            : !aceitaPedidos
              ? "Loja fechada agora"
              : abaixoDoMinimo
                ? `Mínimo ${formatarReais(pedidoMinimo)}`
                : "Ir para o pagamento"}
        </button>
      </section>
    </div>
  );
}
