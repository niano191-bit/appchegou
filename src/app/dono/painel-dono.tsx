"use client";

import { useCallback, useEffect, useState } from "react";
import { SeloAoVivo } from "@/components/selo-ao-vivo";
import { useTempoRealPedidos } from "@/hooks/use-tempo-real-pedidos";
import {
  atualizarRestauranteDono,
  buscarConfiguracaoDono,
  buscarEntregadoresDono,
  buscarPedidosDono,
  buscarResumoDia,
  buscarRestaurantesDono,
  salvarConfiguracaoDono,
  type PedidoDono,
  type ResumoDia,
} from "@/lib/dono";
import type { Configuracao, Restaurante, Usuario } from "@/types/database";
import {
  formatarReais,
  STATUS_PAGAMENTO_LABEL,
  STATUS_PEDIDO_LABEL,
} from "@/types/database";

export function PainelDono() {
  const [resumo, setResumo] = useState<ResumoDia | null>(null);
  const [pedidos, setPedidos] = useState<PedidoDono[]>([]);
  const [restaurantes, setRestaurantes] = useState<Restaurante[]>([]);
  const [entregadores, setEntregadores] = useState<Usuario[]>([]);
  const [config, setConfig] = useState<Configuracao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async (silencioso = false) => {
    try {
      if (!silencioso) setErro(null);
      const [r, p, lojas, ents, cfg] = await Promise.all([
        buscarResumoDia(),
        buscarPedidosDono(),
        buscarRestaurantesDono(),
        buscarEntregadoresDono(),
        buscarConfiguracaoDono(),
      ]);
      setResumo(r);
      setPedidos(p);
      setRestaurantes(lojas);
      setEntregadores(ents);
      setConfig(cfg);
      setErro(null);
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : "Não foi possível carregar o painel.",
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar(false);
  }, [carregar]);

  useTempoRealPedidos(() => {
    void carregar(true);
  });

  async function salvarComissao(id: string, valor: number) {
    setSalvando(true);
    setMsg(null);
    setErro(null);
    try {
      await atualizarRestauranteDono({ id, comissao_percentual: valor });
      setMsg("Comissão atualizada.");
      await carregar(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar comissão.");
    } finally {
      setSalvando(false);
    }
  }

  async function alternarAtivo(loja: Restaurante) {
    setSalvando(true);
    setErro(null);
    try {
      await atualizarRestauranteDono({ id: loja.id, ativo: !loja.ativo });
      await carregar(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao atualizar loja.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarConfig() {
    if (!config) return;
    setSalvando(true);
    setMsg(null);
    setErro(null);
    try {
      const salva = await salvarConfiguracaoDono(config);
      setConfig(salva);
      setMsg("Configurações salvas.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar configuração.");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <p className="rounded-2xl bg-white/70 px-5 py-4 text-sm text-[#5C4A3A]">
        Carregando painel…
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <SeloAoVivo />

      {erro ? (
        <div className="rounded-2xl border border-[#C45C26]/30 bg-[#FFF4EB] px-5 py-4 text-sm text-[#5C3A1E]">
          {erro}
        </div>
      ) : null}
      {msg ? (
        <div className="rounded-2xl border border-[#2F6B3A]/40 bg-[#E8F5E9] px-5 py-4 text-sm text-[#1B4332]">
          {msg}
        </div>
      ) : null}

      {/* Números do dia */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-[#8A7460] uppercase">
          Números do dia
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <CardNumero
            rotulo="Pedidos"
            valor={String(resumo?.qtd_pedidos ?? 0)}
          />
          <CardNumero
            rotulo="Comissão"
            valor={formatarReais(resumo?.comissao ?? 0)}
          />
          <CardNumero
            rotulo="Faturamento"
            valor={formatarReais(resumo?.faturamento ?? 0)}
          />
          <CardNumero
            rotulo="Ticket médio"
            valor={formatarReais(resumo?.ticket_medio ?? 0)}
          />
        </div>
      </section>

      {/* Pedidos ao vivo */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-[#8A7460] uppercase">
          Pedidos ao vivo
        </h2>
        {pedidos.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#C4A882] bg-white/60 px-5 py-6 text-center text-sm text-[#5C4A3A]">
            Nenhum pedido ainda hoje.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pedidos.slice(0, 20).map((p) => (
              <li
                key={p.id}
                className="rounded-2xl border border-[#E8D9C8] bg-white px-4 py-3 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[#1A120C]">
                      {p.restaurante_nome}
                    </p>
                    <p className="text-[#5C4A3A]">
                      #{p.id.slice(0, 8)} · {formatarReais(Number(p.total))}
                    </p>
                    <p className="text-xs text-[#8A7460]">
                      Comissão {p.comissao_percentual}% ={" "}
                      {formatarReais(p.comissao_valor)}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#FFF4EB] px-2.5 py-1 text-xs font-medium text-[#C45C26]">
                    {p.status_pagamento === "pago"
                      ? STATUS_PEDIDO_LABEL[p.status]
                      : STATUS_PAGAMENTO_LABEL[p.status_pagamento]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Restaurantes */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-[#8A7460] uppercase">
          Restaurantes
        </h2>
        <ul className="flex flex-col gap-3">
          {restaurantes.map((loja) => (
            <li
              key={loja.id}
              className="rounded-2xl border border-[#E8D9C8] bg-white px-4 py-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-[#1A120C]">{loja.nome}</p>
                  <p className="text-xs text-[#8A7460]">
                    {loja.ativo ? "Ativo" : "Inativo"}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={salvando}
                  onClick={() => void alternarAtivo(loja)}
                  className="text-xs font-medium text-[#C45C26] underline-offset-2 hover:underline"
                >
                  {loja.ativo ? "Desativar" : "Ativar"}
                </button>
              </div>
              <label className="mt-3 block text-sm text-[#5C4A3A]">
                Comissão (%)
                <div className="mt-1 flex gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    defaultValue={loja.comissao_percentual}
                    id={`comissao-${loja.id}`}
                    className="w-28 rounded-xl border border-[#E8D9C8] px-3 py-2 text-[#1A120C] outline-none focus:border-[#C45C26]"
                  />
                  <button
                    type="button"
                    disabled={salvando}
                    onClick={() => {
                      const input = document.getElementById(
                        `comissao-${loja.id}`,
                      ) as HTMLInputElement | null;
                      void salvarComissao(loja.id, Number(input?.value ?? 0));
                    }}
                    className="rounded-xl bg-[#C45C26] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    Salvar
                  </button>
                </div>
              </label>
            </li>
          ))}
        </ul>
      </section>

      {/* Entregadores */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-[#8A7460] uppercase">
          Entregadores
        </h2>
        <ul className="flex flex-col gap-2">
          {entregadores.map((e) => (
            <li
              key={e.id}
              className="rounded-2xl border border-[#E8D9C8] bg-white px-4 py-3 text-sm"
            >
              <p className="font-semibold text-[#1A120C]">{e.nome}</p>
              <p className="text-[#5C4A3A]">{e.telefone ?? "Sem telefone"}</p>
              <p className="text-xs text-[#8A7460]">{e.email}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Configurações */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-[#8A7460] uppercase">
          Configurações
        </h2>
        {config ? (
          <div className="rounded-2xl border border-[#E8D9C8] bg-white px-4 py-4 space-y-3">
            <label className="block text-sm text-[#5C4A3A]">
              Taxa de entrega (R$)
              <input
                type="number"
                min={0}
                step={0.5}
                value={config.taxa_entrega}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    taxa_entrega: Number(e.target.value),
                  })
                }
                className="mt-1 w-full rounded-xl border border-[#E8D9C8] px-3 py-2.5 text-[#1A120C] outline-none focus:border-[#C45C26]"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm text-[#5C4A3A]">
                Abre às
                <input
                  type="time"
                  value={config.horario_abertura}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      horario_abertura: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-[#E8D9C8] px-3 py-2.5 text-[#1A120C] outline-none focus:border-[#C45C26]"
                />
              </label>
              <label className="block text-sm text-[#5C4A3A]">
                Fecha às
                <input
                  type="time"
                  value={config.horario_fechamento}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      horario_fechamento: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-[#E8D9C8] px-3 py-2.5 text-[#1A120C] outline-none focus:border-[#C45C26]"
                />
              </label>
            </div>
            <button
              type="button"
              disabled={salvando}
              onClick={() => void salvarConfig()}
              className="w-full rounded-xl bg-[#1A120C] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {salvando ? "Salvando…" : "Salvar configurações"}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function CardNumero({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-2xl border border-[#E8D9C8] bg-white px-4 py-3">
      <p className="text-xs font-medium tracking-wide text-[#8A7460] uppercase">
        {rotulo}
      </p>
      <p className="mt-1 text-lg font-semibold text-[#1A120C]">{valor}</p>
    </div>
  );
}
