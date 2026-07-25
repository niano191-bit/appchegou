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
  observacao?: string;
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
  const [cupomCodigo, setCupomCodigo] = useState("");
  const [cupomAplicado, setCupomAplicado] = useState<{
    codigo: string;
    desconto: number;
    rotulo: string;
  } | null>(null);
  const [validandoCupom, setValidandoCupom] = useState(false);
  const [buscaPrato, setBuscaPrato] = useState("");

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
              observacao: "",
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

  const cardapioFiltrado = useMemo(() => {
    const q = buscaPrato.trim().toLowerCase();
    if (!q) return cardapio;
    return cardapio.filter(
      (i) =>
        i.nome.toLowerCase().includes(q) ||
        (i.descricao ?? "").toLowerCase().includes(q),
    );
  }, [cardapio, buscaPrato]);

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
  const desconto =
    cupomAplicado && cupomAplicado.desconto > 0
      ? Math.min(cupomAplicado.desconto, subtotal)
      : 0;
  const total = Math.max(0, subtotal - desconto) + taxaEntrega;
  const pedidoMinimo = valorPedidoMinimo(restaurante);
  const abaixoDoMinimo = pedidoMinimo > 0 && subtotal + 1e-9 < pedidoMinimo;
  const avisoMinimo = textoPedidoMinimo(pedidoMinimo);

  // Se o carrinho mudou, revalida o desconto do cupom
  useEffect(() => {
    if (!cupomAplicado) return;
    if (subtotal <= 0) {
      setCupomAplicado(null);
      return;
    }
    void (async () => {
      try {
        const res = await fetch("/api/cupons/validar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            codigo: cupomAplicado.codigo,
            subtotal,
          }),
        });
        const json = (await res.json()) as {
          codigo?: string;
          desconto?: number;
          rotulo?: string;
          erro?: string;
        };
        if (!res.ok) {
          setCupomAplicado(null);
          setErro(json.erro ?? "Cupom não vale mais para este carrinho.");
          return;
        }
        setCupomAplicado({
          codigo: json.codigo!,
          desconto: Number(json.desconto),
          rotulo: json.rotulo!,
        });
      } catch {
        /* mantém o aplicado */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só quando subtotal muda
  }, [subtotal]);

  function alterarQuantidade(item: ItemCardapio, delta: number) {
    setCarrinho((atual) => {
      const linha = atual[item.id];
      const atualQtd = linha?.quantidade ?? 0;
      const nova = atualQtd + delta;

      if (nova <= 0) {
        const { [item.id]: _, ...resto } = atual;
        return resto;
      }

      return {
        ...atual,
        [item.id]: {
          item,
          quantidade: nova,
          observacao: linha?.observacao ?? "",
        },
      };
    });
  }

  function alterarObsItem(itemId: string, observacao: string) {
    setCarrinho((atual) => {
      const linha = atual[itemId];
      if (!linha) return atual;
      return {
        ...atual,
        [itemId]: { ...linha, observacao },
      };
    });
  }

  async function aplicarCupom() {
    if (!cupomCodigo.trim()) return;
    if (subtotal <= 0) {
      setErro("Adicione itens antes de aplicar o cupom.");
      return;
    }
    setValidandoCupom(true);
    setErro(null);
    try {
      const res = await fetch("/api/cupons/validar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo: cupomCodigo.trim(),
          subtotal,
        }),
      });
      const json = (await res.json()) as {
        codigo?: string;
        desconto?: number;
        rotulo?: string;
        erro?: string;
      };
      if (!res.ok) {
        throw new Error(json.erro ?? "Cupom inválido.");
      }
      setCupomAplicado({
        codigo: json.codigo!,
        desconto: Number(json.desconto),
        rotulo: json.rotulo!,
      });
      setCupomCodigo(json.codigo!);
    } catch (e) {
      setCupomAplicado(null);
      setErro(e instanceof Error ? e.message : "Cupom inválido.");
    } finally {
      setValidandoCupom(false);
    }
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
        cupomCodigo: cupomAplicado?.codigo,
        itens: itensCarrinho.map((linha) => ({
          item_cardapio_id: linha.item.id,
          quantidade: linha.quantidade,
          observacao: linha.observacao?.trim() || undefined,
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
        <input
          value={buscaPrato}
          onChange={(e) => setBuscaPrato(e.target.value)}
          placeholder="Buscar prato…"
          className="w-full rounded-xl border border-linha bg-white px-3 py-2.5 text-sm text-foreground outline-none focus:border-dende"
        />
        {cardapioFiltrado.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-linha bg-white/60 px-5 py-6 text-center text-sm text-muted">
            Nenhum prato encontrado.
          </p>
        ) : null}
        <ul className="flex flex-col gap-3">
          {cardapioFiltrado.map((item) => {
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
                {qtd > 0 ? (
                  <div className="border-t border-linha px-4 py-2">
                    <input
                      value={carrinho[item.id]?.observacao ?? ""}
                      onChange={(e) =>
                        alterarObsItem(item.id, e.target.value)
                      }
                      placeholder="Obs. deste item (ex.: sem pimenta)"
                      className="w-full rounded-lg border border-linha px-2.5 py-2 text-xs text-foreground outline-none focus:border-dende"
                    />
                  </div>
                ) : null}
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
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {itensCarrinho.map((linha) => (
              <li key={linha.item.id}>
                <div className="flex justify-between gap-3">
                  <span>
                    {linha.quantidade}× {linha.item.nome}
                  </span>
                  <span>
                    {formatarReais(Number(linha.item.preco) * linha.quantidade)}
                  </span>
                </div>
                {linha.observacao?.trim() ? (
                  <p className="text-xs text-muted">
                    Obs.: {linha.observacao.trim()}
                  </p>
                ) : null}
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
          <div>
            <label className="block text-sm text-muted">
              Cupom (opcional)
              <div className="mt-1 flex gap-2">
                <input
                  value={cupomCodigo}
                  onChange={(e) => setCupomCodigo(e.target.value.toUpperCase())}
                  placeholder="Ex: DEMO10"
                  className="w-full rounded-xl border border-linha px-3 py-2.5 text-foreground outline-none focus:border-dende"
                />
                <button
                  type="button"
                  disabled={
                    validandoCupom ||
                    !cupomCodigo.trim() ||
                    itensCarrinho.length === 0
                  }
                  onClick={() => void aplicarCupom()}
                  className="shrink-0 rounded-xl border border-dende px-3 py-2.5 text-sm font-semibold text-dende disabled:opacity-60"
                >
                  {validandoCupom ? "…" : "Aplicar"}
                </button>
              </div>
            </label>
            {cupomAplicado ? (
              <p className="mt-1 text-xs font-medium text-mar">
                {cupomAplicado.rotulo} aplicado (−
                {formatarReais(desconto)})
                <button
                  type="button"
                  className="ml-2 underline"
                  onClick={() => {
                    setCupomAplicado(null);
                    setCupomCodigo("");
                  }}
                >
                  Remover
                </button>
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-4 space-y-1 text-sm text-muted">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatarReais(subtotal)}</span>
          </div>
          {desconto > 0 ? (
            <div className="flex justify-between text-mar">
              <span>Desconto</span>
              <span>−{formatarReais(desconto)}</span>
            </div>
          ) : null}
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
