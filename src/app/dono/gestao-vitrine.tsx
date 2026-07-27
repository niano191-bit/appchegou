"use client";

import { useCallback, useEffect, useState } from "react";
import type { BannerVitrine, CategoriaVitrine } from "@/types/database";
import {
  atualizarBannerDono,
  atualizarCategoriaDono,
  buscarVitrineDono,
  criarBannerDono,
  criarCategoriaDono,
  uploadImagemBannerDono,
} from "@/lib/vitrine";

const inputCls =
  "rounded-lg border border-linha bg-white px-2.5 py-2 text-sm text-foreground outline-none focus:border-dende";

export function GestaoVitrine() {
  const [banners, setBanners] = useState<BannerVitrine[]>([]);
  const [categorias, setCategorias] = useState<CategoriaVitrine[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [arquivoNovo, setArquivoNovo] = useState<File | null>(null);
  const [previaNova, setPreviaNova] = useState<string | null>(null);
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

  useEffect(() => {
    if (!arquivoNovo) {
      setPreviaNova(null);
      return;
    }
    const url = URL.createObjectURL(arquivoNovo);
    setPreviaNova(url);
    return () => URL.revokeObjectURL(url);
  }, [arquivoNovo]);

  function escolherArquivo(fileList: FileList | null) {
    const file = fileList?.[0] ?? null;
    if (!file) {
      setArquivoNovo(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setErro("Escolha um arquivo de imagem (JPG ou PNG).");
      return;
    }
    setErro(null);
    setArquivoNovo(file);
  }

  async function criarBanner() {
    if (!arquivoNovo) return;
    setSalvando(true);
    setErro(null);
    setMsg(null);
    try {
      const imagem_url = await uploadImagemBannerDono(arquivoNovo);
      await criarBannerDono({
        imagem_url,
        ordem: banners.length + 1,
      });
      setArquivoNovo(null);
      setMsg("Banner criado. Aparece na home do cliente.");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao criar banner.");
    } finally {
      setSalvando(false);
    }
  }

  async function trocarImagemBanner(
    b: BannerVitrine,
    fileList: FileList | null,
  ) {
    const file = fileList?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErro("Escolha um arquivo de imagem (JPG ou PNG).");
      return;
    }
    setSalvando(true);
    setErro(null);
    setMsg(null);
    try {
      const imagem_url = await uploadImagemBannerDono(file);
      await atualizarBannerDono(b.id, { imagem_url });
      setMsg("Imagem do banner atualizada.");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao trocar imagem.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarOrdemBanner(b: BannerVitrine, form: HTMLFormElement) {
    const dados = new FormData(form);
    setSalvando(true);
    setErro(null);
    setMsg(null);
    try {
      await atualizarBannerDono(b.id, {
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
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
          Vitrine / Home
        </h2>
        <p className="mt-1 text-sm text-muted">
          Banners e categorias que o cliente vê na tela inicial.
        </p>
      </div>

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

      {/* ——— Banners ——— */}
      <div className="rounded-2xl border border-linha bg-white p-4 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-foreground">Banners</p>
            <p className="text-xs text-muted">
              Imagens da home (JPG ou PNG, até 3 MB).
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-2 rounded-xl border border-dashed border-linha bg-[#faf8f5] p-3">
            <label className="flex aspect-[16/7] cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-lg border border-dashed border-linha bg-white text-center transition hover:border-dende/50">
              {previaNova ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previaNova}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <>
                  <span className="text-sm font-medium text-foreground">
                    + Novo banner
                  </span>
                  <span className="px-2 text-xs text-muted">
                    Toque para escolher a imagem
                  </span>
                </>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={(e) => {
                  escolherArquivo(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
            <button
              type="button"
              disabled={salvando || !arquivoNovo}
              onClick={() => void criarBanner()}
              className="rounded-lg bg-dende px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {salvando && arquivoNovo ? "Enviando…" : "Adicionar"}
            </button>
          </div>

          {banners.map((b) => (
            <form
              key={b.id}
              className={`flex flex-col gap-2 rounded-xl border p-3 ${
                b.ativo
                  ? "border-linha bg-[#faf8f5]"
                  : "border-linha/60 bg-[#f3f1ee] opacity-70"
              }`}
              onSubmit={(e) => {
                e.preventDefault();
                void salvarOrdemBanner(b, e.currentTarget);
              }}
            >
              <div className="relative aspect-[16/7] overflow-hidden rounded-lg bg-[#f0ebe4]">
                {b.imagem_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={b.imagem_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted">
                    Sem imagem
                  </div>
                )}
                {!b.ativo ? (
                  <span className="absolute left-2 top-2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    Inativo
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <label className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-muted">
                  Ordem
                  <input
                    name="ordem"
                    type="number"
                    defaultValue={b.ordem}
                    className={`${inputCls} w-16`}
                  />
                </label>
                <button
                  type="submit"
                  disabled={salvando}
                  className="text-xs font-semibold text-mar"
                >
                  Salvar
                </button>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                <label className="cursor-pointer font-medium text-foreground underline-offset-2 hover:underline">
                  Trocar
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    disabled={salvando}
                    onChange={(e) => {
                      void trocarImagemBanner(b, e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
                <button
                  type="button"
                  disabled={salvando}
                  onClick={() =>
                    void atualizarBannerDono(b.id, {
                      ativo: !b.ativo,
                    }).then(carregar)
                  }
                  className="font-medium text-dende"
                >
                  {b.ativo ? "Desativar" : "Ativar"}
                </button>
                <button
                  type="button"
                  disabled={salvando}
                  onClick={() =>
                    void atualizarBannerDono(b.id, { excluir: true }).then(
                      carregar,
                    )
                  }
                  className="font-medium text-dende"
                >
                  Excluir
                </button>
              </div>
            </form>
          ))}
        </div>
      </div>

      {/* ——— Categorias ——— */}
      <div className="rounded-2xl border border-linha bg-white p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Categorias</p>
          <p className="text-xs text-muted">
            Rolagem da home. Palavras-chave vazias = “Todos” (sem filtro).
          </p>
        </div>

        <div className="grid gap-2 rounded-xl border border-dashed border-linha bg-[#faf8f5] p-3 sm:grid-cols-[3.5rem_minmax(0,8rem)_1fr_auto]">
          <input
            value={novaCat.emoji}
            onChange={(e) => setNovaCat({ ...novaCat, emoji: e.target.value })}
            aria-label="Emoji"
            title="Emoji"
            className={`${inputCls} text-center`}
          />
          <input
            value={novaCat.nome}
            onChange={(e) => setNovaCat({ ...novaCat, nome: e.target.value })}
            placeholder="Nome"
            aria-label="Nome"
            className={inputCls}
          />
          <input
            value={novaCat.palavras_chave}
            onChange={(e) =>
              setNovaCat({ ...novaCat, palavras_chave: e.target.value })
            }
            placeholder="Palavras-chave (vírgula)"
            aria-label="Palavras-chave"
            className={inputCls}
          />
          <button
            type="button"
            disabled={salvando || !novaCat.nome.trim()}
            onClick={() => void criarCat()}
            className="rounded-lg bg-dende px-3 py-2 text-sm font-semibold text-white disabled:opacity-60 sm:self-stretch"
          >
            Adicionar
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-linha">
          <div className="hidden min-w-[560px] grid-cols-[3.5rem_minmax(0,8rem)_1fr_4rem_auto] gap-2 border-b border-linha bg-[#faf8f5] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted sm:grid">
            <span>Emoji</span>
            <span>Nome</span>
            <span>Palavras-chave</span>
            <span>Ord.</span>
            <span>Ações</span>
          </div>
          <ul className="min-w-[560px] divide-y divide-linha">
            {categorias.map((c) => (
              <li
                key={c.id}
                className={c.ativo ? "bg-white" : "bg-[#f3f1ee] opacity-75"}
              >
                <form
                  className="grid grid-cols-[3.5rem_minmax(0,8rem)_1fr_4rem_auto] items-center gap-2 px-3 py-2.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void salvarCat(c, e.currentTarget);
                  }}
                >
                  <input
                    name="emoji"
                    defaultValue={c.emoji}
                    aria-label={`Emoji ${c.nome}`}
                    className={`${inputCls} text-center`}
                  />
                  <input
                    name="nome"
                    defaultValue={c.nome}
                    aria-label={`Nome ${c.nome}`}
                    className={inputCls}
                  />
                  <input
                    name="palavras_chave"
                    defaultValue={c.palavras_chave}
                    aria-label={`Palavras-chave ${c.nome}`}
                    className={inputCls}
                  />
                  <input
                    name="ordem"
                    type="number"
                    defaultValue={c.ordem}
                    aria-label={`Ordem ${c.nome}`}
                    className={`${inputCls} w-full`}
                  />
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 whitespace-nowrap text-xs">
                    <button
                      type="submit"
                      disabled={salvando}
                      className="font-semibold text-mar"
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      disabled={salvando}
                      onClick={() =>
                        void atualizarCategoriaDono(c.id, {
                          ativo: !c.ativo,
                        }).then(carregar)
                      }
                      className="font-medium text-dende"
                    >
                      {c.ativo ? "Desativar" : "Ativar"}
                    </button>
                    <button
                      type="button"
                      disabled={salvando}
                      onClick={() =>
                        void atualizarCategoriaDono(c.id, {
                          excluir: true,
                        }).then(carregar)
                      }
                      className="font-medium text-dende"
                    >
                      Excluir
                    </button>
                  </div>
                </form>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
