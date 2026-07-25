"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buscarRestaurantes } from "@/lib/catalogo";
import type { Restaurante } from "@/types/database";

export function ListaRestaurantes() {
  const [restaurantes, setRestaurantes] = useState<Restaurante[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setErro(null);
        setRestaurantes(await buscarRestaurantes());
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
    <ul className="flex flex-col gap-3">
      {restaurantes.map((loja) => (
        <li key={loja.id}>
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
            <div className="px-5 py-4">
              <p className="text-lg font-semibold text-foreground">
                {loja.nome}
              </p>
              {loja.descricao ? (
                <p className="mt-1 text-sm text-muted">{loja.descricao}</p>
              ) : null}
              {loja.endereco ? (
                <p className="mt-2 text-xs text-muted">{loja.endereco}</p>
              ) : null}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
