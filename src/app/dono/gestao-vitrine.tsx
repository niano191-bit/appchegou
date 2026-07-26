"use client";

import { useCallback, useEffect, useState } from "react";
import type { BannerVitrine, CategoriaVitrine } from "@/types/database";
import {
  atualizarBannerDono,
  atualizarCategoriaDono,
  buscarVitrineDono,
  criarBannerDono,
  criarCategoriaDono,
} from "@/lib/vitrine";

export function GestaoVitrine() {
  const [banners, setBanners] = useState<BannerVitrine[]>([]);
  const [categorias, setCategorias] = useState<CategoriaVitrine[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [novaImagem, setNovaImagem] = useState("");
  const [novaCat, setNovaCat] = useState({
    nome: "",
    emoji: "🍽️",
    palavras_chave: "",
  });

  const carregar = useCallback(async () => {
    setErro(null);
    const dados = await buscarVitrineDono();
    setBanners(dados.banners);
    setCategorias(dados.categorias);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await carregar();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao carregar vitrine.");
      } finally {
        setCarregando(false);
      }
    })();
  }, [carregar]);

  async function criarBanner() {
    setSalvando(true);
    setErro(null);
    setMsg(null);
    try {
      await criarBannerDono({
        imagem_url: novaImagem,
        ordem: banners.length + 1,
      });
      setNovaImagem("");
      setMsg("Banner criado. Aparece na home do cliente.");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao criar banner.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarBanner(b: BannerVitrine, form: HTMLFormElement) {
    const dados = new FormData(form);
    setSalvando(true);
    setErro(null);
    setMsg(null);
    try {
      await atualizarBannerDono(b.id, {
        imagem_url: String(dados.get("imagem_url") ?? ""),
        ordem: Number(dados.get("ordem") ?? 0),
      });
      setMsg("Banner atualizado.");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar banner.");
    } finally {
      setSalvando(false);
    }
  }

  async function criarCat() {
    setSalvando(true);
    setErro(null);
    setMsg(null);
    try {
      await criarCategoriaDono({
        nome: novaCat.nome,
        emoji: novaCat.emoji,
        palavras_chave: novaCat.palavras_chave,
        ordem: categorias.length,
      });
      setNovaCat({ nome: "", emoji: "🍽️", palavras_chave: "" });
      setMsg("Categoria criada.");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao criar categoria.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarCat(c: CategoriaVitrine, form: HTMLFormElement) {
    const dados = new FormData(form);
    setSalvando(true);
    setErro(null);
    setMsg(null);
    try {
      await atualizarCategoriaDono(c.id, {
        nome: String(dados.get("nome") ?? ""),
        emoji: String(dados.get("emoji") ?? ""),
        palavras_chave: String(dados.get("palavras_chave") ?? ""),
        ordem: Number(dados.get("ordem") ?? 0),
      });
      setMsg("Categoria atualizada.");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar categoria.");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <p className="rounded-2xl bg-white/70 px-5 py-4 text-sm text-muted">
        Carregando vitrine…
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
        Vitrine / Home
      </h2>
      <p className="text-sm text-muted">
        Banners e categorias que o cliente vê na tela inicial.
      </p>

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
        <p className="text-sm font-semibold text-foreground">Novo banner</p>
        <p className="text-xs text-muted">
          Cole o link da imagem (JPG ou PNG). Ela aparece na home do cliente.
        </p>
        <label className="block text-sm text-muted">
          URL da imagem
          <input
            value={novaImagem}
            onChange={(e) => setNovaImagem(e.target.value)}
            placeholder="https://..."
            className="mt-1 w-full rounded-xl border border-linha px-3 py-2.5 text-foreground outline-none focus:border-dende"
          />
        </label>
        {novaImagem.trim() ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={novaImagem.trim()}
            alt=""
            className="aspect-[16/7] w-full rounded-xl object-cover bg-[#f0ebe4]"
          />
        ) : (
          <div className="flex aspect-[16/7] w-full items-center justify-center rounded-xl border border-dashed border-linha bg-[#f7f7f8] text-sm text-muted">
            Prévia da imagem
          </div>
        )}
        <button
          type="button"
          disabled={salvando || !novaImagem.trim()}
          onClick={() => void criarBanner()}
          className="rounded-xl bg-dende px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          Adicionar banner
        </button>
      </div>

      <ul className="flex flex-col gap-3">
        {banners.map((b) => (
          <li
            key={b.id}
            className="rounded-2xl border border-linha bg-white px-4 py-4"
          >
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                void salvarBanner(b, e.currentTarget);
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">
                  Banner · ordem {b.ordem}
                </p>
                <button
                  type="button"
                  disabled={salvando}
                  onClick={() =>
                    void atualizarBannerDono(b.id, {
                      ativo: !b.ativo,
                    }).then(carregar)
                  }
                  className="text-xs font-medium text-dende underline-offset-2 hover:underline"
                >
                  {b.ativo ? "Desativar" : "Ativar"}
                </button>
              </div>
              {b.imagem_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={b.imagem_url}
                  alt=""
                  className="aspect-[16/7] w-full rounded-xl object-cover bg-[#f0ebe4]"
                />
              ) : (
                <div className="flex aspect-[16/7] w-full items-center justify-center rounded-xl border border-dashed border-linha bg-[#f7f7f8] text-sm text-muted">
                  Sem imagem
                </div>
              )}
              <label className="block text-sm text-muted">
                URL da imagem
                <input
                  name="imagem_url"
                  defaultValue={b.imagem_url ?? ""}
                  placeholder="https://..."
                  className="mt-1 w-full rounded-xl border border-linha px-3 py-2 text-sm outline-none focus:border-dende"
                />
              </label>
              <label className="block text-sm text-muted">
                Ordem
                <input
                  name="ordem"
                  type="number"
                  defaultValue={b.ordem}
                  className="mt-1 w-full rounded-xl border border-linha px-3 py-2 text-sm outline-none focus:border-dende"
                />
              </label>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={salvando}
                  className="text-sm font-semibold text-mar"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  disabled={salvando}
                  onClick={() =>
                    void atualizarBannerDono(b.id, { excluir: true }).then(
                      carregar,
                    )
                  }
                  className="text-sm font-medium text-dende"
                >
                  Excluir
                </button>
              </div>
            </form>
          </li>
        ))}
      </ul>

      <div className="rounded-2xl border border-linha bg-white px-4 py-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">Nova categoria</p>
        <label className="block text-sm text-muted">
          Nome
          <input
            value={novaCat.nome}
            onChange={(e) => setNovaCat({ ...novaCat, nome: e.target.value })}
            className="mt-1 w-full rounded-xl border border-linha px-3 py-2.5 text-foreground outline-none focus:border-dende"
          />
        </label>
        <label className="block text-sm text-muted">
          Emoji
          <input
            value={novaCat.emoji}
            onChange={(e) => setNovaCat({ ...novaCat, emoji: e.target.value })}
            className="mt-1 w-full rounded-xl border border-linha px-3 py-2.5 text-foreground outline-none focus:border-dende"
          />
        </label>
        <label className="block text-sm text-muted">
          Palavras-chave (vírgula). Vazio = Todos (sem filtro)
          <input
            value={novaCat.palavras_chave}
            onChange={(e) =>
              setNovaCat({ ...novaCat, palavras_chave: e.target.value })
            }
            placeholder="ex: pizza, massa, italiana"
            className="mt-1 w-full rounded-xl border border-linha px-3 py-2.5 text-foreground outline-none focus:border-dende"
          />
        </label>
        <button
          type="button"
          disabled={salvando || !novaCat.nome.trim()}
          onClick={() => void criarCat()}
          className="rounded-xl bg-dende px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          Adicionar categoria
        </button>
      </div>

      <ul className="flex flex-col gap-3">
        {categorias.map((c) => (
          <li
            key={c.id}
            className="rounded-2xl border border-linha bg-white px-4 py-4"
          >
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                void salvarCat(c, e.currentTarget);
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">
                  {c.emoji} {c.nome}
                </p>
                <button
                  type="button"
                  disabled={salvando}
                  onClick={() =>
                    void atualizarCategoriaDono(c.id, {
                      ativo: !c.ativo,
                    }).then(carregar)
                  }
                  className="text-xs font-medium text-dende underline-offset-2 hover:underline"
                >
                  {c.ativo ? "Desativar" : "Ativar"}
                </button>
              </div>
              <div className="grid grid-cols-[4rem_1fr] gap-2">
                <input
                  name="emoji"
                  defaultValue={c.emoji}
                  className="rounded-xl border border-linha px-2 py-2 text-center text-sm outline-none focus:border-dende"
                />
                <input
                  name="nome"
                  defaultValue={c.nome}
                  className="rounded-xl border border-linha px-3 py-2 text-sm outline-none focus:border-dende"
                />
              </div>
              <input
                name="palavras_chave"
                defaultValue={c.palavras_chave}
                className="w-full rounded-xl border border-linha px-3 py-2 text-sm outline-none focus:border-dende"
              />
              <input
                name="ordem"
                type="number"
                defaultValue={c.ordem}
                className="w-full rounded-xl border border-linha px-3 py-2 text-sm outline-none focus:border-dende"
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={salvando}
                  className="text-sm font-semibold text-mar"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  disabled={salvando}
                  onClick={() =>
                    void atualizarCategoriaDono(c.id, { excluir: true }).then(
                      carregar,
                    )
                  }
                  className="text-sm font-medium text-dende"
                >
                  Excluir
                </button>
              </div>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
