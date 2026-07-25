"use client";

import { useEffect, useState } from "react";
import {
  atualizarItemCardapioDono,
  atualizarRestauranteDono,
  buscarCardapioDono,
  criarItemCardapioDono,
  criarRestauranteDono,
} from "@/lib/dono";
import type { ItemCardapio, Restaurante } from "@/types/database";
import { formatarReais } from "@/types/database";
import { SENHA_DEMO } from "@/lib/auth";

type Props = {
  restaurantes: Restaurante[];
  onAtualizou: () => Promise<void>;
};

/** Cadastro e edição de lojas + cardápio (painel do dono) */
export function GestaoLojas({ restaurantes, onAtualizou }: Props) {
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [lojaAbertaId, setLojaAbertaId] = useState<string | null>(null);
  const [cardapio, setCardapio] = useState<ItemCardapio[]>([]);
  const [carregandoCardapio, setCarregandoCardapio] = useState(false);

  const [novaLoja, setNovaLoja] = useState({
    nome: "",
    descricao: "",
    endereco: "",
    comissao_percentual: 10,
  });

  const [novoPrato, setNovoPrato] = useState({
    nome: "",
    descricao: "",
    preco: "",
  });

  useEffect(() => {
    if (!lojaAbertaId) {
      setCardapio([]);
      return;
    }
    let cancelado = false;
    setCarregandoCardapio(true);
    void buscarCardapioDono(lojaAbertaId)
      .then((itens) => {
        if (!cancelado) setCardapio(itens);
      })
      .catch((e) => {
        if (!cancelado) {
          setErro(e instanceof Error ? e.message : "Erro ao carregar cardápio.");
        }
      })
      .finally(() => {
        if (!cancelado) setCarregandoCardapio(false);
      });
    return () => {
      cancelado = true;
    };
  }, [lojaAbertaId]);

  async function criarLoja() {
    setSalvando(true);
    setErro(null);
    setMsg(null);
    try {
      const { usuario } = await criarRestauranteDono({
        nome: novaLoja.nome,
        descricao: novaLoja.descricao || undefined,
        endereco: novaLoja.endereco || undefined,
        comissao_percentual: Number(novaLoja.comissao_percentual),
      });
      setNovaLoja({
        nome: "",
        descricao: "",
        endereco: "",
        comissao_percentual: 10,
      });
      setMsg(
        `Loja criada. Login: ${usuario.email} · senha ${SENHA_DEMO}`,
      );
      await onAtualizou();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao criar loja.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarLoja(loja: Restaurante, form: HTMLFormElement) {
    const dados = new FormData(form);
    setSalvando(true);
    setErro(null);
    setMsg(null);
    try {
      await atualizarRestauranteDono({
        id: loja.id,
        nome: String(dados.get("nome") ?? ""),
        descricao: String(dados.get("descricao") ?? ""),
        endereco: String(dados.get("endereco") ?? ""),
        comissao_percentual: Number(dados.get("comissao") ?? 0),
        pedido_minimo: Number(dados.get("pedido_minimo") ?? 0),
      });
      setMsg("Loja atualizada.");
      await onAtualizou();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar loja.");
    } finally {
      setSalvando(false);
    }
  }

  async function alternarAtivo(loja: Restaurante) {
    setSalvando(true);
    setErro(null);
    try {
      await atualizarRestauranteDono({ id: loja.id, ativo: !loja.ativo });
      await onAtualizou();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao atualizar loja.");
    } finally {
      setSalvando(false);
    }
  }

  async function adicionarPrato(restauranteId: string) {
    setSalvando(true);
    setErro(null);
    setMsg(null);
    try {
      await criarItemCardapioDono(restauranteId, {
        nome: novoPrato.nome,
        descricao: novoPrato.descricao || undefined,
        preco: Number(novoPrato.preco),
      });
      setNovoPrato({ nome: "", descricao: "", preco: "" });
      setMsg("Prato adicionado.");
      setCardapio(await buscarCardapioDono(restauranteId));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao adicionar prato.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarPrato(item: ItemCardapio, form: HTMLFormElement) {
    const dados = new FormData(form);
    setSalvando(true);
    setErro(null);
    try {
      await atualizarItemCardapioDono(item.id, {
        nome: String(dados.get("nome") ?? ""),
        descricao: String(dados.get("descricao") ?? ""),
        preco: Number(dados.get("preco") ?? 0),
      });
      setMsg("Prato atualizado.");
      if (lojaAbertaId) {
        setCardapio(await buscarCardapioDono(lojaAbertaId));
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar prato.");
    } finally {
      setSalvando(false);
    }
  }

  async function alternarDisponivel(item: ItemCardapio) {
    setSalvando(true);
    setErro(null);
    try {
      await atualizarItemCardapioDono(item.id, {
        disponivel: !item.disponivel,
      });
      if (lojaAbertaId) {
        setCardapio(await buscarCardapioDono(lojaAbertaId));
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao atualizar prato.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
        Restaurantes e cardápio
      </h2>

      {erro ? (
        <div className="rounded-2xl border border-dende/30 bg-dende-suave px-5 py-4 text-sm text-dende-escuro">
          {erro}
        </div>
      ) : null}
      {msg ? (
        <div className="rounded-2xl border border-mar/30 bg-mar-suave px-5 py-4 text-sm text-mar">
          {msg}
        </div>
      ) : null}

      <div className="rounded-2xl border border-linha bg-white px-4 py-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">Nova loja</p>
        <label className="block text-sm text-muted">
          Nome
          <input
            value={novaLoja.nome}
            onChange={(e) =>
              setNovaLoja({ ...novaLoja, nome: e.target.value })
            }
            className="mt-1 w-full rounded-xl border border-linha px-3 py-2.5 text-foreground outline-none focus:border-dende"
            placeholder="Ex: Acarajé da Dona"
          />
        </label>
        <label className="block text-sm text-muted">
          Descrição
          <input
            value={novaLoja.descricao}
            onChange={(e) =>
              setNovaLoja({ ...novaLoja, descricao: e.target.value })
            }
            className="mt-1 w-full rounded-xl border border-linha px-3 py-2.5 text-foreground outline-none focus:border-dende"
          />
        </label>
        <label className="block text-sm text-muted">
          Endereço
          <input
            value={novaLoja.endereco}
            onChange={(e) =>
              setNovaLoja({ ...novaLoja, endereco: e.target.value })
            }
            className="mt-1 w-full rounded-xl border border-linha px-3 py-2.5 text-foreground outline-none focus:border-dende"
          />
        </label>
        <label className="block text-sm text-muted">
          Comissão (%)
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={novaLoja.comissao_percentual}
            onChange={(e) =>
              setNovaLoja({
                ...novaLoja,
                comissao_percentual: Number(e.target.value),
              })
            }
            className="mt-1 w-full rounded-xl border border-linha px-3 py-2.5 text-foreground outline-none focus:border-dende"
          />
        </label>
        <button
          type="button"
          disabled={salvando || !novaLoja.nome.trim()}
          onClick={() => void criarLoja()}
          className="w-full rounded-xl bg-dende px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          Criar loja
        </button>
        <p className="text-xs text-muted">
          Ao criar, o sistema gera um login da loja com senha{" "}
          <strong>{SENHA_DEMO}</strong>.
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {restaurantes.map((loja) => {
          const aberta = lojaAbertaId === loja.id;
          return (
            <li
              key={loja.id}
              className="rounded-2xl border border-linha bg-white px-4 py-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground">{loja.nome}</p>
                  <p className="text-xs text-muted">
                    {loja.ativo ? "Ativo" : "Inativo"} · comissão{" "}
                    {loja.comissao_percentual}%
                    {Number(loja.pedido_minimo) > 0
                      ? ` · mín. ${formatarReais(Number(loja.pedido_minimo))}`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={salvando}
                  onClick={() => void alternarAtivo(loja)}
                  className="text-xs font-medium text-dende underline-offset-2 hover:underline"
                >
                  {loja.ativo ? "Desativar" : "Ativar"}
                </button>
              </div>

              <button
                type="button"
                onClick={() =>
                  setLojaAbertaId(aberta ? null : loja.id)
                }
                className="mt-3 text-sm font-medium text-mar underline-offset-2 hover:underline"
              >
                {aberta ? "Fechar edição" : "Editar loja e cardápio"}
              </button>

              {aberta ? (
                <div className="mt-4 space-y-4 border-t border-linha pt-4">
                  <form
                    className="space-y-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void salvarLoja(loja, e.currentTarget);
                    }}
                  >
                    <label className="block text-sm text-muted">
                      Nome
                      <input
                        name="nome"
                        defaultValue={loja.nome}
                        className="mt-1 w-full rounded-xl border border-linha px-3 py-2.5 text-foreground outline-none focus:border-dende"
                      />
                    </label>
                    <label className="block text-sm text-muted">
                      Descrição
                      <input
                        name="descricao"
                        defaultValue={loja.descricao ?? ""}
                        className="mt-1 w-full rounded-xl border border-linha px-3 py-2.5 text-foreground outline-none focus:border-dende"
                      />
                    </label>
                    <label className="block text-sm text-muted">
                      Endereço
                      <input
                        name="endereco"
                        defaultValue={loja.endereco ?? ""}
                        className="mt-1 w-full rounded-xl border border-linha px-3 py-2.5 text-foreground outline-none focus:border-dende"
                      />
                    </label>
                    <label className="block text-sm text-muted">
                      Comissão (%)
                      <input
                        name="comissao"
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        defaultValue={loja.comissao_percentual}
                        className="mt-1 w-full rounded-xl border border-linha px-3 py-2.5 text-foreground outline-none focus:border-dende"
                      />
                    </label>
                    <label className="block text-sm text-muted">
                      Pedido mínimo (R$) — 0 = sem mínimo
                      <input
                        name="pedido_minimo"
                        type="number"
                        min={0}
                        step={0.5}
                        defaultValue={Number(loja.pedido_minimo ?? 0)}
                        className="mt-1 w-full rounded-xl border border-linha px-3 py-2.5 text-foreground outline-none focus:border-dende"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={salvando}
                      className="w-full rounded-xl bg-dende px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      Salvar loja
                    </button>
                  </form>

                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-foreground">
                      Cardápio
                    </p>
                    {carregandoCardapio ? (
                      <p className="text-sm text-muted">Carregando…</p>
                    ) : cardapio.length === 0 ? (
                      <p className="text-sm text-muted">
                        Nenhum prato ainda. Adicione abaixo.
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-3">
                        {cardapio.map((item) => (
                          <li
                            key={item.id}
                            className="rounded-xl border border-linha bg-background/60 px-3 py-3"
                          >
                            <form
                              className="space-y-2"
                              onSubmit={(e) => {
                                e.preventDefault();
                                void salvarPrato(item, e.currentTarget);
                              }}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs text-muted">
                                  {item.disponivel
                                    ? "Disponível"
                                    : "Indisponível"}{" "}
                                  · {formatarReais(Number(item.preco))}
                                </p>
                                <button
                                  type="button"
                                  disabled={salvando}
                                  onClick={() => void alternarDisponivel(item)}
                                  className="text-xs font-medium text-dende underline-offset-2 hover:underline"
                                >
                                  {item.disponivel
                                    ? "Esconder do cliente"
                                    : "Mostrar no cardápio"}
                                </button>
                              </div>
                              <input
                                name="nome"
                                defaultValue={item.nome}
                                className="w-full rounded-xl border border-linha px-3 py-2 text-sm text-foreground outline-none focus:border-dende"
                              />
                              <input
                                name="descricao"
                                defaultValue={item.descricao ?? ""}
                                placeholder="Descrição"
                                className="w-full rounded-xl border border-linha px-3 py-2 text-sm text-foreground outline-none focus:border-dende"
                              />
                              <input
                                name="preco"
                                type="number"
                                min={0}
                                step={0.5}
                                defaultValue={item.preco}
                                className="w-full rounded-xl border border-linha px-3 py-2 text-sm text-foreground outline-none focus:border-dende"
                              />
                              <button
                                type="submit"
                                disabled={salvando}
                                className="w-full rounded-xl border border-dende px-3 py-2 text-sm font-semibold text-dende disabled:opacity-60"
                              >
                                Salvar prato
                              </button>
                            </form>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="space-y-2 rounded-xl border border-dashed border-linha px-3 py-3">
                      <p className="text-xs font-semibold tracking-wide text-muted uppercase">
                        Novo prato
                      </p>
                      <input
                        value={novoPrato.nome}
                        onChange={(e) =>
                          setNovoPrato({ ...novoPrato, nome: e.target.value })
                        }
                        placeholder="Nome do prato"
                        className="w-full rounded-xl border border-linha px-3 py-2 text-sm text-foreground outline-none focus:border-dende"
                      />
                      <input
                        value={novoPrato.descricao}
                        onChange={(e) =>
                          setNovoPrato({
                            ...novoPrato,
                            descricao: e.target.value,
                          })
                        }
                        placeholder="Descrição (opcional)"
                        className="w-full rounded-xl border border-linha px-3 py-2 text-sm text-foreground outline-none focus:border-dende"
                      />
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={novoPrato.preco}
                        onChange={(e) =>
                          setNovoPrato({ ...novoPrato, preco: e.target.value })
                        }
                        placeholder="Preço (R$)"
                        className="w-full rounded-xl border border-linha px-3 py-2 text-sm text-foreground outline-none focus:border-dende"
                      />
                      <button
                        type="button"
                        disabled={
                          salvando ||
                          !novoPrato.nome.trim() ||
                          novoPrato.preco === ""
                        }
                        onClick={() => void adicionarPrato(loja.id)}
                        className="w-full rounded-xl bg-mar px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        Adicionar prato
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
