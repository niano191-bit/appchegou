"use client";

import { useCallback, useEffect, useState } from "react";
import { lerImagemComoDataUrl } from "@/lib/imagem";
import {
  atualizarMeuPrato,
  atualizarMinhaLoja,
  buscarMeuCardapio,
  criarMeuPrato,
} from "@/lib/restaurante-loja";
import type { ItemCardapio, Restaurante } from "@/types/database";
import { formatarReais } from "@/types/database";

export function GestaoCardapioLoja() {
  const [loja, setLoja] = useState<Restaurante | null>(null);
  const [cardapio, setCardapio] = useState<ItemCardapio[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [novo, setNovo] = useState({
    nome: "",
    descricao: "",
    preco: "",
    imagem_url: "",
  });

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      const dados = await buscarMeuCardapio();
      setLoja(dados.restaurante);
      setCardapio(dados.cardapio);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function salvarLoja(form: HTMLFormElement) {
    const dados = new FormData(form);
    setSalvando(true);
    setErro(null);
    setMsg(null);
    try {
      await atualizarMinhaLoja({
        nome: String(dados.get("nome") ?? ""),
        descricao: String(dados.get("descricao") ?? ""),
        endereco: String(dados.get("endereco") ?? ""),
        imagem_url: String(dados.get("imagem_url") ?? "") || null,
      });
      setMsg("Dados da loja salvos.");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar loja.");
    } finally {
      setSalvando(false);
    }
  }

  async function onFotoLoja(arquivo: File | null) {
    if (!arquivo || !loja) return;
    setSalvando(true);
    setErro(null);
    try {
      const url = await lerImagemComoDataUrl(arquivo);
      await atualizarMinhaLoja({ imagem_url: url });
      setMsg("Foto da loja atualizada.");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro na foto.");
    } finally {
      setSalvando(false);
    }
  }

  async function adicionarPrato() {
    setSalvando(true);
    setErro(null);
    setMsg(null);
    try {
      await criarMeuPrato({
        nome: novo.nome,
        descricao: novo.descricao || undefined,
        preco: Number(novo.preco),
        imagem_url: novo.imagem_url || null,
      });
      setNovo({ nome: "", descricao: "", preco: "", imagem_url: "" });
      setMsg("Prato adicionado.");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao adicionar.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarPrato(item: ItemCardapio, form: HTMLFormElement) {
    const dados = new FormData(form);
    setSalvando(true);
    setErro(null);
    try {
      await atualizarMeuPrato(item.id, {
        nome: String(dados.get("nome") ?? ""),
        descricao: String(dados.get("descricao") ?? ""),
        preco: Number(dados.get("preco") ?? 0),
        imagem_url: String(dados.get("imagem_url") ?? "") || null,
      });
      setMsg("Prato atualizado.");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar prato.");
    } finally {
      setSalvando(false);
    }
  }

  async function onFotoPrato(item: ItemCardapio, arquivo: File | null) {
    if (!arquivo) return;
    setSalvando(true);
    setErro(null);
    try {
      const url = await lerImagemComoDataUrl(arquivo);
      await atualizarMeuPrato(item.id, { imagem_url: url });
      setMsg("Foto do prato atualizada.");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro na foto.");
    } finally {
      setSalvando(false);
    }
  }

  async function onFotoNovo(arquivo: File | null) {
    if (!arquivo) return;
    try {
      const url = await lerImagemComoDataUrl(arquivo);
      setNovo((n) => ({ ...n, imagem_url: url }));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro na foto.");
    }
  }

  if (carregando) {
    return <p className="text-sm text-muted">Carregando cardápio…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
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

      {loja ? (
        <section className="rounded-2xl border border-linha bg-white px-4 py-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">Sua loja</p>
          {loja.imagem_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={loja.imagem_url}
              alt={loja.nome}
              className="h-28 w-full rounded-xl object-cover"
            />
          ) : null}
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void salvarLoja(e.currentTarget);
            }}
          >
            <input type="hidden" name="imagem_url" defaultValue={loja.imagem_url ?? ""} />
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
              Foto da loja (até 350 KB)
              <input
                type="file"
                accept="image/*"
                className="mt-1 block w-full text-sm"
                onChange={(e) =>
                  void onFotoLoja(e.target.files?.[0] ?? null)
                }
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
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
          Cardápio
        </h2>
        {cardapio.length === 0 ? (
          <p className="text-sm text-muted">Nenhum prato ainda.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {cardapio.map((item) => (
              <li
                key={item.id}
                className="rounded-2xl border border-linha bg-white px-4 py-3 space-y-2"
              >
                {item.imagem_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imagem_url}
                    alt={item.nome}
                    className="h-24 w-full rounded-xl object-cover"
                  />
                ) : null}
                <form
                  className="space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void salvarPrato(item, e.currentTarget);
                  }}
                >
                  <div className="flex justify-between gap-2 text-xs text-muted">
                    <span>
                      {item.disponivel ? "Disponível" : "Indisponível"} ·{" "}
                      {formatarReais(Number(item.preco))}
                    </span>
                    <button
                      type="button"
                      disabled={salvando}
                      onClick={() => {
                        void (async () => {
                          setSalvando(true);
                          setErro(null);
                          try {
                            await atualizarMeuPrato(item.id, {
                              disponivel: !item.disponivel,
                            });
                            await carregar();
                          } catch (e) {
                            setErro(
                              e instanceof Error
                                ? e.message
                                : "Erro ao atualizar.",
                            );
                          } finally {
                            setSalvando(false);
                          }
                        })();
                      }}
                      className="font-medium text-dende underline-offset-2 hover:underline"
                    >
                      {item.disponivel ? "Esconder" : "Mostrar"}
                    </button>
                  </div>
                  <input
                    name="nome"
                    defaultValue={item.nome}
                    className="w-full rounded-xl border border-linha px-3 py-2 text-sm outline-none focus:border-dende"
                  />
                  <input
                    name="descricao"
                    defaultValue={item.descricao ?? ""}
                    placeholder="Descrição"
                    className="w-full rounded-xl border border-linha px-3 py-2 text-sm outline-none focus:border-dende"
                  />
                  <input
                    name="preco"
                    type="number"
                    min={0}
                    step={0.5}
                    defaultValue={item.preco}
                    className="w-full rounded-xl border border-linha px-3 py-2 text-sm outline-none focus:border-dende"
                  />
                  <input
                    type="hidden"
                    name="imagem_url"
                    defaultValue={item.imagem_url ?? ""}
                  />
                  <label className="block text-xs text-muted">
                    Trocar foto
                    <input
                      type="file"
                      accept="image/*"
                      className="mt-1 block w-full"
                      onChange={(e) =>
                        void onFotoPrato(item, e.target.files?.[0] ?? null)
                      }
                    />
                  </label>
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

        <div className="space-y-2 rounded-2xl border border-dashed border-linha px-4 py-4">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">
            Novo prato
          </p>
          {novo.imagem_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={novo.imagem_url}
              alt=""
              className="h-20 w-full rounded-xl object-cover"
            />
          ) : null}
          <input
            value={novo.nome}
            onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
            placeholder="Nome"
            className="w-full rounded-xl border border-linha px-3 py-2 text-sm outline-none focus:border-dende"
          />
          <input
            value={novo.descricao}
            onChange={(e) => setNovo({ ...novo, descricao: e.target.value })}
            placeholder="Descrição"
            className="w-full rounded-xl border border-linha px-3 py-2 text-sm outline-none focus:border-dende"
          />
          <input
            type="number"
            min={0}
            step={0.5}
            value={novo.preco}
            onChange={(e) => setNovo({ ...novo, preco: e.target.value })}
            placeholder="Preço"
            className="w-full rounded-xl border border-linha px-3 py-2 text-sm outline-none focus:border-dende"
          />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => void onFotoNovo(e.target.files?.[0] ?? null)}
            className="block w-full text-sm"
          />
          <button
            type="button"
            disabled={salvando || !novo.nome.trim() || novo.preco === ""}
            onClick={() => void adicionarPrato()}
            className="w-full rounded-xl bg-mar px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            Adicionar prato
          </button>
        </div>
      </section>
    </div>
  );
}
