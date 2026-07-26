"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BotaoSair } from "@/components/botao-sair";
import { buscarRestaurantes } from "@/lib/catalogo";
import { buscarConfiguracaoPublica } from "@/lib/dono";
import { alternarFavorito, lerFavoritos } from "@/lib/favoritos";
import {
  horarioEfetivoLoja,
  rotuloStatusOperacao,
  statusOperacaoLoja,
} from "@/lib/horario";
import { MARCA } from "@/lib/marca";
import { textoPedidoMinimo, valorPedidoMinimo } from "@/lib/pedido-minimo";
import { buscarVitrinePublica } from "@/lib/vitrine";
import {
  bannersPadrao,
  categoriasPadrao,
  classeTomBanner,
  regexDePalavrasChave,
} from "@/lib/vitrine-defaults";
import {
  formatarReais,
  type BannerVitrine,
  type CategoriaVitrine,
  type Configuracao,
  type Restaurante,
} from "@/types/database";
import { HistoricoPedidos } from "./historico-pedidos";

type Props = {
  logado: boolean;
  nomeUsuario?: string | null;
};

type Aba = "inicio" | "buscar" | "pedidos" | "perfil";

function textoLoja(loja: Restaurante) {
  return `${loja.nome} ${loja.descricao ?? ""} ${loja.endereco ?? ""}`;
}

export function HomeCliente({ logado, nomeUsuario }: Props) {
  const [restaurantes, setRestaurantes] = useState<Restaurante[]>([]);
  const [config, setConfig] = useState<Configuracao | null>(null);
  const [banners, setBanners] = useState<BannerVitrine[]>(() =>
    bannersPadrao().filter((b) => b.ativo),
  );
  const [categorias, setCategorias] = useState<CategoriaVitrine[]>(() =>
    categoriasPadrao().filter((c) => c.ativo),
  );
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<string>("");
  const [aba, setAba] = useState<Aba>("inicio");
  const [bannerIdx, setBannerIdx] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const buscaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFavoritos(lerFavoritos());
    void (async () => {
      try {
        setErro(null);
        const [lojas, cfg, vitrine] = await Promise.all([
          buscarRestaurantes(),
          buscarConfiguracaoPublica().catch(() => null),
          buscarVitrinePublica().catch(() => ({
            banners: bannersPadrao().filter((b) => b.ativo),
            categorias: categoriasPadrao().filter((c) => c.ativo),
          })),
        ]);
        setRestaurantes(
          lojas.map((l) => ({
            ...l,
            pausado: l.pausado ?? false,
            pedido_minimo: Number(l.pedido_minimo ?? 0),
          })),
        );
        setConfig(cfg);
        const cats =
          vitrine.categorias.length > 0
            ? vitrine.categorias
            : categoriasPadrao().filter((c) => c.ativo);
        const bans =
          vitrine.banners.length > 0
            ? vitrine.banners
            : bannersPadrao().filter((b) => b.ativo);
        setCategorias(cats);
        setBanners(bans);
        setCategoria((atual) =>
          atual && cats.some((c) => c.id === atual) ? atual : (cats[0]?.id ?? ""),
        );
      } catch (e) {
        setErro(
          e instanceof Error
            ? e.message
            : "Não foi possível carregar os restaurantes.",
        );
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (banners.length === 0) return;
    const t = window.setInterval(() => {
      setBannerIdx((i) => (i + 1) % banners.length);
    }, 5000);
    return () => window.clearInterval(t);
  }, [banners.length]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const cat =
      categorias.find((c) => c.id === categoria) ?? categorias[0] ?? null;
    const match = cat ? regexDePalavrasChave(cat.palavras_chave) : null;

    let base = restaurantes;
    if (match) {
      base = base.filter((l) => match.test(textoLoja(l)));
    }
    if (q) {
      base = base.filter((l) => textoLoja(l).toLowerCase().includes(q));
    }

    const favSet = new Set(favoritos);
    return [...base].sort((a, b) => {
      const af = favSet.has(a.id) ? 0 : 1;
      const bf = favSet.has(b.id) ? 0 : 1;
      if (af !== bf) return af - bf;
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
  }, [restaurantes, busca, categoria, favoritos, categorias]);

  function toggleFavorito(
    id: string,
    e: { preventDefault: () => void; stopPropagation: () => void },
  ) {
    e.preventDefault();
    e.stopPropagation();
    const agora = alternarFavorito(id);
    setFavoritos((prev) =>
      agora ? [...prev, id] : prev.filter((x) => x !== id),
    );
  }

  function irBuscar() {
    setAba("buscar");
    window.setTimeout(() => buscaRef.current?.focus(), 50);
  }

  const taxaBase = config?.taxa_entrega ?? 8;
  const banner = banners[bannerIdx] ?? banners[0] ?? null;
  const categoriaAtiva =
    categorias.find((c) => c.id === categoria) ?? categorias[0] ?? null;

  return (
    <div className="cliente-app mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col bg-white pb-24">
      {/* Header laranja */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-dende px-4 py-3 shadow-sm">
        <Link href="/" className="min-w-0">
          <span className="block truncate font-display text-xl font-semibold tracking-tight text-white lowercase">
            {MARCA.nomeCurto.toLowerCase()}
          </span>
          <span className="block text-[10px] font-medium tracking-wide text-white/80 uppercase">
            da Neuza · {MARCA.cidade}
          </span>
        </Link>
        {logado ? (
          <Link
            href="#perfil"
            onClick={() => setAba("perfil")}
            className="shrink-0 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-dende shadow-sm"
          >
            {nomeUsuario?.split(" ")[0] ?? "Perfil"}
          </Link>
        ) : (
          <Link
            href="/login"
            className="shrink-0 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-dende shadow-sm"
          >
            Entrar
          </Link>
        )}
      </header>

      {/* Faixa promo */}
      <div className="flex items-center justify-between gap-3 bg-mar px-4 py-2.5 text-white">
        <p className="text-xs leading-snug sm:text-sm">
          <span className="font-semibold">Novidade</span>
          {" — "}
          {MARCA.tagline}
        </p>
        <Link
          href={logado ? "#restaurantes" : "/login"}
          className="shrink-0 text-xs font-semibold underline-offset-2 hover:underline"
        >
          Pedir ›
        </Link>
      </div>

      {(aba === "inicio" || aba === "buscar") && (
        <div className="flex flex-col gap-4 px-4 pt-4">
          {/* Busca */}
          <label className="relative block">
            <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted">
              ⌕
            </span>
            <input
              ref={buscaRef}
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                if (aba !== "buscar") setAba("buscar");
              }}
              onFocus={() => setAba("buscar")}
              placeholder="Buscar restaurante ou prato..."
              className="w-full rounded-2xl border border-linha bg-[#f7f7f8] py-3.5 pr-4 pl-10 text-sm text-foreground outline-none transition focus:border-dende focus:bg-white"
            />
          </label>

          {/* Banner */}
          {banner ? (
            <div
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${classeTomBanner(banner.tom)} px-5 py-6 text-white shadow-sm`}
            >
              <p className="font-display text-2xl font-semibold leading-tight">
                {banner.titulo}
              </p>
              <p className="mt-2 max-w-[85%] text-sm text-white/90">
                {banner.texto}
              </p>
              <div className="mt-4 flex gap-1.5">
                {banners.map((b, i) => (
                  <button
                    key={b.id}
                    type="button"
                    aria-label={`Banner ${i + 1}`}
                    onClick={() => setBannerIdx(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === bannerIdx ? "w-5 bg-white" : "w-1.5 bg-white/45"
                    }`}
                  />
                ))}
              </div>
              <div
                aria-hidden
                className="pointer-events-none absolute -right-4 -bottom-6 text-7xl opacity-25"
              >
                🛵
              </div>
            </div>
          ) : null}

          {/* Categorias */}
          <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <ul className="flex w-max gap-3">
              {categorias.map((c) => {
                const ativa = categoria === c.id;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setCategoria(c.id)}
                      className="flex w-[4.5rem] flex-col items-center gap-1.5"
                    >
                      <span
                        className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl transition ${
                          ativa
                            ? "border-2 border-dende bg-dende-suave"
                            : "border border-linha bg-[#f7f7f8]"
                        }`}
                      >
                        {c.emoji}
                      </span>
                      <span
                        className={`text-center text-[11px] font-medium leading-tight ${
                          ativa ? "text-dende" : "text-muted"
                        }`}
                      >
                        {c.nome}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Lista */}
          <section id="restaurantes" className="pb-2">
            <h2 className="mb-3 text-base font-semibold text-foreground">
              {!categoriaAtiva?.palavras_chave.trim()
                ? "Todos os restaurantes"
                : categoriaAtiva.nome}
            </h2>

            {carregando ? (
              <p className="rounded-2xl bg-[#f7f7f8] px-5 py-4 text-sm text-muted">
                Carregando restaurantes…
              </p>
            ) : erro ? (
              <div className="rounded-2xl border border-dende/30 bg-dende-suave px-5 py-4 text-sm text-muted">
                {erro}
              </div>
            ) : filtrados.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-linha bg-[#f7f7f8] px-5 py-6 text-center text-sm text-muted">
                Nenhuma loja encontrada
                {busca.trim() ? ` para “${busca.trim()}”` : ""}.
              </p>
            ) : (
              <ul className="flex flex-col gap-4">
                {filtrados.map((loja) => {
                  const status = config
                    ? statusOperacaoLoja(loja, config)
                    : loja.pausado
                      ? "pausada"
                      : "aberta";
                  const aberta = status === "aberta";
                  const fav = favoritos.includes(loja.id);
                  const horario = config
                    ? horarioEfetivoLoja(loja, config)
                    : null;
                  const minimo = textoPedidoMinimo(valorPedidoMinimo(loja));

                  return (
                    <li key={loja.id} className="relative">
                      <Link
                        href={`/cliente/${loja.id}`}
                        className="block overflow-hidden rounded-2xl border border-linha bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition hover:border-dende/40"
                      >
                        <div className="relative aspect-[16/9] bg-[#f0ebe4]">
                          {loja.imagem_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={loja.imagem_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-4xl opacity-40">
                              🍲
                            </div>
                          )}
                          {fav ? (
                            <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-lg bg-white/95 px-2 py-1 text-xs font-semibold text-foreground shadow-sm">
                              <span className="text-dende">★</span>
                              Favorito
                            </span>
                          ) : null}
                        </div>

                        <div className="flex gap-3 px-4 py-3.5">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-linha bg-dende-suave text-lg">
                            {loja.imagem_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={loja.imagem_url}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span aria-hidden>🍽️</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-foreground">
                              {loja.nome}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-muted">
                              {loja.descricao ?? "Delivery · Salvador"}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                              <span className="inline-flex items-center gap-1.5 font-medium">
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    aberta ? "bg-mar" : "bg-dende"
                                  }`}
                                />
                                <span
                                  className={
                                    aberta ? "text-mar" : "text-dende"
                                  }
                                >
                                  {rotuloStatusOperacao(status)}
                                </span>
                              </span>
                              <span className="text-muted">
                                Entrega a partir de {formatarReais(taxaBase)}
                              </span>
                              {horario ? (
                                <span className="text-muted">
                                  {horario.abertura}–{horario.fechamento}
                                </span>
                              ) : (
                                <span className="text-muted">5–40 min</span>
                              )}
                            </div>
                            {minimo ? (
                              <p className="mt-1 text-xs font-medium text-dende">
                                {minimo}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </Link>
                      <button
                        type="button"
                        aria-label={
                          fav ? "Remover dos favoritos" : "Favoritar"
                        }
                        onClick={(e) => toggleFavorito(loja.id, e)}
                        className={`absolute top-2.5 left-2.5 z-10 flex h-9 w-9 items-center justify-center rounded-full border bg-white/95 text-base shadow-sm ${
                          fav
                            ? "border-dende text-dende"
                            : "border-linha text-muted"
                        }`}
                      >
                        {fav ? "★" : "☆"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}

      {aba === "pedidos" && (
        <div className="flex flex-col gap-4 px-4 pt-6">
          <h2 className="font-display text-2xl text-foreground">
            Seus pedidos
          </h2>
          {logado ? (
            <HistoricoPedidos />
          ) : (
            <div className="rounded-2xl border border-linha bg-[#f7f7f8] px-5 py-6 text-center">
              <p className="text-sm text-muted">
                Entre para ver o histórico dos seus pedidos.
              </p>
              <Link
                href="/login"
                className="mt-4 inline-flex rounded-full bg-dende px-5 py-2.5 text-sm font-semibold text-white"
              >
                Entrar
              </Link>
            </div>
          )}
        </div>
      )}

      {aba === "perfil" && (
        <div id="perfil" className="flex flex-col gap-4 px-4 pt-6">
          <h2 className="font-display text-2xl text-foreground">Perfil</h2>
          {logado ? (
            <div className="rounded-2xl border border-linha bg-white px-5 py-5">
              <p className="text-lg font-semibold text-foreground">
                {nomeUsuario ?? "Cliente"}
              </p>
              <p className="mt-1 text-sm text-muted">
                Conta ativa em {MARCA.nome}
              </p>
              <div className="mt-5 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setAba("pedidos")}
                  className="rounded-xl border border-linha px-4 py-3 text-left text-sm font-medium text-foreground"
                >
                  Meus pedidos
                </button>
                <div className="px-1">
                  <BotaoSair />
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-linha bg-[#f7f7f8] px-5 py-6 text-center">
              <p className="text-sm text-muted">
                Entre para acompanhar pedidos e favoritos.
              </p>
              <Link
                href="/login"
                className="mt-4 inline-flex rounded-full bg-dende px-5 py-2.5 text-sm font-semibold text-white"
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className="mt-3 block text-sm font-medium text-dende"
              >
                Criar conta
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Nav inferior */}
      <nav className="fixed right-0 bottom-0 left-0 z-40 border-t border-linha bg-white/95 backdrop-blur-md">
        <div className="mx-auto grid max-w-lg grid-cols-4 px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {(
            [
              { id: "inicio" as const, label: "Início", icon: "⌂" },
              { id: "buscar" as const, label: "Buscar", icon: "⌕" },
              { id: "pedidos" as const, label: "Pedidos", icon: "☰" },
              { id: "perfil" as const, label: "Perfil", icon: "☺" },
            ] as const
          ).map((item) => {
            const ativa = aba === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.id === "buscar") irBuscar();
                  else setAba(item.id);
                }}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                  ativa ? "text-dende" : "text-muted"
                }`}
              >
                <span className="text-xl leading-none">{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
