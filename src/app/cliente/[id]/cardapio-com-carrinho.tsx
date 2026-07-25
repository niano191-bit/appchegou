"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { buscarRestauranteComCardapio } from "@/lib/catalogo";
import { TAXA_ENTREGA_PADRAO } from "@/lib/constantes";
import { buscarTaxaEntrega } from "@/lib/dono";
import { criarPedido } from "@/lib/pedidos";
import type { ItemCardapio, Restaurante } from "@/types/database";
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
  const [endereco, setEndereco] = useState("Rua Teste, 100 — Barra, Salvador");
  const [observacao, setObservacao] = useState("");
  const [taxaEntrega, setTaxaEntrega] = useState(TAXA_ENTREGA_PADRAO);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setErro(null);
        const [dados, taxa] = await Promise.all([
          buscarRestauranteComCardapio(restauranteId),
          buscarTaxaEntrega().catch(() => TAXA_ENTREGA_PADRAO),
        ]);
        setRestaurante(dados.restaurante);
        setCardapio(dados.cardapio);
        setTaxaEntrega(taxa);
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

  const total = subtotal + taxaEntrega;

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

    setEnviando(true);
    setErro(null);
    setSucesso(null);

    try {
      const pedido = await criarPedido({
        restauranteId,
        endereco_entrega: endereco.trim(),
        observacao: observacao.trim() || undefined,
        itens: itensCarrinho.map((linha) => ({
          item_cardapio_id: linha.item.id,
          quantidade: linha.quantidade,
        })),
      });

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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl text-foreground">
          {restaurante.nome}
        </h1>
        {restaurante.descricao ? (
          <p className="mt-1 text-sm text-muted">{restaurante.descricao}</p>
        ) : null}
      </div>

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
            <span>Taxa de entrega</span>
            <span>{formatarReais(taxaEntrega)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold text-foreground">
            <span>Total</span>
            <span>{formatarReais(total)}</span>
          </div>
        </div>

        <button
          type="button"
          disabled={enviando || itensCarrinho.length === 0}
          onClick={() => void enviarPedido()}
          className="mt-4 w-full rounded-xl bg-dende px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-dende-escuro disabled:opacity-60"
        >
          {enviando ? "Enviando…" : "Ir para o pagamento"}
        </button>
      </section>
    </div>
  );
}
