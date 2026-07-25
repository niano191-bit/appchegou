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
      <p className="rounded-2xl bg-white/70 px-5 py-4 text-sm text-[#5C4A3A]">
        Carregando restaurantes…
      </p>
    );
  }

  if (erro) {
    return (
      <div className="rounded-2xl border border-[#C45C26]/30 bg-[#FFF4EB] px-5 py-4 text-sm text-[#5C3A1E]">
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
            className="block rounded-2xl border border-[#E8D9C8] bg-white px-5 py-4 transition hover:border-[#C45C26]/50 hover:bg-[#FFF9F4]"
          >
            <p className="text-lg font-semibold text-[#1A120C]">{loja.nome}</p>
            {loja.descricao ? (
              <p className="mt-1 text-sm text-[#5C4A3A]">{loja.descricao}</p>
            ) : null}
            {loja.endereco ? (
              <p className="mt-2 text-xs text-[#8A7460]">{loja.endereco}</p>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
