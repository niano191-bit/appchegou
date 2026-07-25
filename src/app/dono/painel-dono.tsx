"use client";

import { useCallback, useEffect, useState } from "react";
import { SeloAoVivo } from "@/components/selo-ao-vivo";
import { useTempoRealPedidos } from "@/hooks/use-tempo-real-pedidos";
import {
  buscarConfiguracaoDono,
  buscarEntregadoresDono,
  buscarPedidosDono,
  buscarResumoDia,
  buscarRestaurantesDono,
  criarEntregadorDono,
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
import { GestaoLojas } from "./gestao-lojas";

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
  const [novoEntregador, setNovoEntregador] = useState({
    nome: "",
    email: "",
    telefone: "",
    senha: "",
  });

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
      <p className="rounded-2xl bg-white/70 px-5 py-4 text-sm text-muted">
        Carregando painel…
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <SeloAoVivo />

      {erro ? (
        <div className="rounded-2xl border border-dende/30 bg-dende-suave px-5 py-4 text-sm text-muted">
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
        <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
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
        <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
          Pedidos ao vivo
        </h2>
        {pedidos.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#C4A882] bg-white/60 px-5 py-6 text-center text-sm text-muted">
            Nenhum pedido ainda hoje.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pedidos.slice(0, 20).map((p) => (
              <li
                key={p.id}
                className="rounded-2xl border border-linha bg-white px-4 py-3 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">
                      {p.restaurante_nome}
                    </p>
                    <p className="text-muted">
                      #{p.id.slice(0, 8)} · {formatarReais(Number(p.total))}
                    </p>
                    <p className="text-xs text-muted">
                      Comissão {p.comissao_percentual}% ={" "}
                      {formatarReais(p.comissao_valor)}
                    </p>
                  </div>
                  <span className="rounded-full bg-dende-suave px-2.5 py-1 text-xs font-medium text-dende">
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

      <GestaoLojas
        restaurantes={restaurantes}
        onAtualizou={() => carregar(true)}
      />

      {/* Entregadores */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
          Entregadores
        </h2>
        <div className="rounded-2xl border border-linha bg-white px-4 py-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">
            Novo entregador
          </p>
          <label className="block text-sm text-muted">
            Nome
            <input
              value={novoEntregador.nome}
              onChange={(e) =>
                setNovoEntregador({ ...novoEntregador, nome: e.target.value })
              }
              className="mt-1 w-full rounded-xl border border-linha px-3 py-2.5 text-foreground outline-none focus:border-dende"
            />
          </label>
          <label className="block text-sm text-muted">
            E-mail
            <input
              type="email"
              value={novoEntregador.email}
              onChange={(e) =>
                setNovoEntregador({ ...novoEntregador, email: e.target.value })
              }
              className="mt-1 w-full rounded-xl border border-linha px-3 py-2.5 text-foreground outline-none focus:border-dende"
            />
          </label>
          <label className="block text-sm text-muted">
            Telefone
            <input
              value={novoEntregador.telefone}
              onChange={(e) =>
                setNovoEntregador({
                  ...novoEntregador,
                  telefone: e.target.value,
                })
              }
              className="mt-1 w-full rounded-xl border border-linha px-3 py-2.5 text-foreground outline-none focus:border-dende"
            />
          </label>
          <label className="block text-sm text-muted">
            Senha (mín. 6)
            <input
              type="password"
              minLength={6}
              value={novoEntregador.senha}
              onChange={(e) =>
                setNovoEntregador({ ...novoEntregador, senha: e.target.value })
              }
              className="mt-1 w-full rounded-xl border border-linha px-3 py-2.5 text-foreground outline-none focus:border-dende"
            />
          </label>
          <button
            type="button"
            disabled={
              salvando ||
              !novoEntregador.nome.trim() ||
              !novoEntregador.email.trim() ||
              novoEntregador.senha.length < 6
            }
            onClick={() => {
              void (async () => {
                setSalvando(true);
                setErro(null);
                setMsg(null);
                try {
                  await criarEntregadorDono({
                    nome: novoEntregador.nome,
                    email: novoEntregador.email,
                    telefone: novoEntregador.telefone || undefined,
                    senha: novoEntregador.senha,
                  });
                  setNovoEntregador({
                    nome: "",
                    email: "",
                    telefone: "",
                    senha: "",
                  });
                  setMsg("Entregador criado. Ele já pode entrar com esse e-mail.");
                  await carregar(true);
                } catch (e) {
                  setErro(
                    e instanceof Error
                      ? e.message
                      : "Erro ao criar entregador.",
                  );
                } finally {
                  setSalvando(false);
                }
              })();
            }}
            className="w-full rounded-xl bg-mar px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            Cadastrar entregador
          </button>
        </div>
        <ul className="flex flex-col gap-2">
          {entregadores.map((e) => (
            <li
              key={e.id}
              className="rounded-2xl border border-linha bg-white px-4 py-3 text-sm"
            >
              <p className="font-semibold text-foreground">{e.nome}</p>
              <p className="text-muted">{e.telefone ?? "Sem telefone"}</p>
              <p className="text-xs text-muted">{e.email}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Configurações */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
          Configurações
        </h2>
        {config ? (
          <div className="rounded-2xl border border-linha bg-white px-4 py-4 space-y-3">
            <label className="block text-sm text-muted">
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
                className="mt-1 w-full rounded-xl border border-linha px-3 py-2.5 text-foreground outline-none focus:border-dende"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm text-muted">
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
                  className="mt-1 w-full rounded-xl border border-linha px-3 py-2.5 text-foreground outline-none focus:border-dende"
                />
              </label>
              <label className="block text-sm text-muted">
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
                  className="mt-1 w-full rounded-xl border border-linha px-3 py-2.5 text-foreground outline-none focus:border-dende"
                />
              </label>
            </div>
            <p className="text-xs text-muted">
              Fora deste horário (fuso de Salvador) o cliente não consegue pedir.
              Cada loja ainda pode pausar pedidos no painel dela.
            </p>

            <div className="space-y-2 border-t border-linha pt-3">
              <p className="text-sm font-semibold text-foreground">
                Financeiro — como o cliente paga
              </p>
              <label className="flex items-center gap-3 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={config.pagamento_mercadopago ?? true}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      pagamento_mercadopago: e.target.checked,
                    })
                  }
                  className="h-4 w-4 accent-dende"
                />
                Mercado Pago
              </label>
              <label className="flex items-center gap-3 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={config.pagamento_lucpaguei ?? true}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      pagamento_lucpaguei: e.target.checked,
                    })
                  }
                  className="h-4 w-4 accent-mar"
                />
                LucPaguei
              </label>
              <p className="text-xs text-muted">
                Os dois podem ficar ligados. O cliente escolhe na hora de pagar.
              </p>
            </div>

            <button
              type="button"
              disabled={salvando}
              onClick={() => void salvarConfig()}
              className="w-full rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
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
    <div className="rounded-2xl border border-linha bg-white px-4 py-3">
      <p className="text-xs font-medium tracking-wide text-muted uppercase">
        {rotulo}
      </p>
      <p className="mt-1 text-lg font-semibold text-foreground">{valor}</p>
    </div>
  );
}
