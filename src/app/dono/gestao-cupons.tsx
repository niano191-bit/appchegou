"use client";

import { useCallback, useEffect, useState } from "react";
import {
  atualizarCupomDono,
  buscarCuponsDono,
  criarCupomDono,
  excluirCupomDono,
} from "@/lib/dono";
import { textoCupom } from "@/lib/cupom";
import type { Cupom, TipoCupom } from "@/types/database";
import { formatarReais } from "@/types/database";

export function GestaoCupons() {
  const [cupons, setCupons] = useState<Cupom[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    codigo: "",
    tipo: "percent" as TipoCupom,
    valor: "10",
  });

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      setCupons(await buscarCuponsDono());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar cupons.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function criar() {
    setSalvando(true);
    setErro(null);
    setMsg(null);
    try {
      await criarCupomDono({
        codigo: form.codigo,
        tipo: form.tipo,
        valor: Number(form.valor.replace(",", ".")),
      });
      setForm({ codigo: "", tipo: "percent", valor: "10" });
      setMsg("Cupom criado.");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao criar cupom.");
    } finally {
      setSalvando(false);
    }
  }

  async function alternar(cupom: Cupom) {
    setErro(null);
    try {
      await atualizarCupomDono({ id: cupom.id, ativo: !cupom.ativo });
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao atualizar cupom.");
    }
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este cupom?")) return;
    setErro(null);
    try {
      await excluirCupomDono(id);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao excluir cupom.");
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
        Cupons de desconto
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
        <p className="text-sm font-semibold text-foreground">Novo cupom</p>
        <label className="block text-sm text-muted">
          Código
          <input
            value={form.codigo}
            onChange={(e) =>
              setForm({ ...form, codigo: e.target.value.toUpperCase() })
            }
            placeholder="Ex: SALVADOR10"
            className="mt-1 w-full rounded-xl border border-linha px-3 py-2.5 text-foreground outline-none focus:border-dende"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-sm text-muted">
            Tipo
            <select
              value={form.tipo}
              onChange={(e) =>
                setForm({ ...form, tipo: e.target.value as TipoCupom })
              }
              className="mt-1 w-full rounded-xl border border-linha bg-white px-3 py-2.5 text-foreground outline-none focus:border-dende"
            >
              <option value="percent">Percentual (%)</option>
              <option value="fix">Valor fixo (R$)</option>
            </select>
          </label>
          <label className="block text-sm text-muted">
            {form.tipo === "percent" ? "Percentual" : "Valor (R$)"}
            <input
              type="number"
              min={0.01}
              step={form.tipo === "percent" ? 1 : 0.5}
              value={form.valor}
              onChange={(e) => setForm({ ...form, valor: e.target.value })}
              className="mt-1 w-full rounded-xl border border-linha px-3 py-2.5 text-foreground outline-none focus:border-dende"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={salvando || !form.codigo.trim()}
          onClick={() => void criar()}
          className="w-full rounded-xl bg-dende px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {salvando ? "Salvando…" : "Criar cupom"}
        </button>
        <p className="text-xs text-muted">
          O desconto vale só sobre os itens (não na taxa de entrega). Em demo,
          teste com <strong>DEMO10</strong> (10%).
        </p>
      </div>

      {carregando ? (
        <p className="text-sm text-muted">Carregando cupons…</p>
      ) : cupons.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-linha bg-white/60 px-5 py-6 text-center text-sm text-muted">
          Nenhum cupom ainda.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {cupons.map((c) => (
            <li
              key={c.id}
              className="rounded-2xl border border-linha bg-white px-4 py-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground">
                    {textoCupom(c)}
                  </p>
                  <p className="text-xs text-muted">
                    {c.ativo ? "Ativo" : "Desativado"}
                    {c.tipo === "fix"
                      ? ` · ${formatarReais(Number(c.valor))}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <button
                    type="button"
                    onClick={() => void alternar(c)}
                    className="text-xs font-medium text-dende underline-offset-2 hover:underline"
                  >
                    {c.ativo ? "Desativar" : "Ativar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void excluir(c.id)}
                    className="text-xs font-medium text-muted underline-offset-2 hover:underline"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
