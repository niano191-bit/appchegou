"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { buscarRestaurantes } from "@/lib/catalogo";
import { buscarConfiguracaoPublica } from "@/lib/dono";
import { alternarFavorito, lerFavoritos } from "@/lib/favoritos";
import {
  horarioEfetivoLoja,
  rotuloStatusOperacao,
  statusOperacaoLoja,
} from "@/lib/horario";
import { textoPedidoMinimo, valorPedidoMinimo } from "@/lib/pedido-minimo";
import type { Configuracao, Restaurante } from "@/types/database";

export function ListaRestaurantes() {
  const [restaurantes, setRestaurantes] = useState<Restaurante[]>([]);
  const [config, setConfig] = useState<Configuracao | null>(null);
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setFavoritos(lerFavoritos());
    void (async () => {
      try {
        setErro(null);
        const [lojas, cfg] = await Promise.all([
          buscarRestaurantes(),
          buscarConfiguracaoPublica().catch(() => null),
        ]);
        setRestaurantes(
          lojas.map((l) => ({
            ...l,
            pausado: l.pausado ?? false,
            pedido_minimo: Number(l.pedido_minimo ?? 0),
          })),
        );
        setConfig(cfg);
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

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const base = q
      ? restaurantes.filter(
          (l) =>
            l.nome.toLowerCase().includes(q) ||
            (l.descricao ?? "").toLowerCase().includes(q) ||
            (l.endereco ?? "").toLowerCase().includes(q),
        )
      : restaurantes;

    const favSet = new Set(favoritos);
    return [...base].sort((a, b) => {
      const af = favSet.has(a.id) ? 0 : 1;
      const bf = favSet.has(b.id) ? 0 : 1;
      if (af !== bf) return af - bf;
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
  }, [restaurantes, busca, favoritos]);

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

  if (carregando) {
    return (
      <p className="rounded-2xl bg-white/70 px-5 py-4 text-sm text-muted">
        Carregando restaurantes…
      </p>
    );
  }

  if (erro) {
    return (
      <div className="rounded-2xl border border-dende/30 bg-dende-suave px-5 py-4 text-sm text-muted">
        {erro}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="block text-sm text-muted">
        Buscar loja
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Nome, bairro, tipo de comida…"
          className="mt-1 w-full rounded-xl border border-linha bg-white px-3 py-2.5 text-foreground outline-none focus:border-dende"
        />
      </label>

      {filtrados.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-linha bg-white/60 px-5 py-6 text-center text-sm text-muted">
          Nenhuma loja encontrada para “{busca.trim()}”.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
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

            return (
              <li key={loja.id} className="relative">
                <Link
                  href={`/cliente/${loja.id}`}
                  className="block overflow-hidden rounded-2xl border border-linha bg-white transition hover:border-dende/50 hover:bg-background"
                >
                  {loja.imagem_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={loja.imagem_url}
                      alt=""
                      className="h-32 w-full object-cover"
                    />
                  ) : null}
                  <div className="px-5 py-4 pr-14">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-foreground">
                        {loja.nome}
                      </p>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          aberta
                            ? "bg-mar-suave text-mar"
                            : "bg-dende-suave text-dende"
                        }`}
                      >
                        {rotuloStatusOperacao(status)}
                      </span>
                    </div>
                    {loja.descricao ? (
                      <p className="mt-1 text-sm text-muted">{loja.descricao}</p>
                    ) : null}
                    {horario ? (
                      <p className="mt-1 text-xs text-muted">
                        {horario.abertura} – {horario.fechamento}
                      </p>
                    ) : null}
                    {textoPedidoMinimo(valorPedidoMinimo(loja)) ? (
                      <p className="mt-1 text-xs font-medium text-dende">
                        {textoPedidoMinimo(valorPedidoMinimo(loja))}
                      </p>
                    ) : null}
                    {loja.endereco ? (
                      <p className="mt-2 text-xs text-muted">{loja.endereco}</p>
                    ) : null}
                  </div>
                </Link>
                <button
                  type="button"
                  aria-label={fav ? "Remover dos favoritos" : "Favoritar"}
                  onClick={(e) => toggleFavorito(loja.id, e)}
                  className={`absolute top-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border bg-white/95 text-lg shadow-sm ${
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
    </div>
  );
}
