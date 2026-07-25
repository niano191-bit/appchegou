"use client";

import { useCallback, useEffect, useState } from "react";
import {
  buscarBairrosDono,
  excluirBairroDono,
  salvarBairroDono,
} from "@/lib/dono";
import type { BairroEntrega } from "@/types/database";
import { formatarReais } from "@/types/database";

export function GestaoBairros() {
  const [bairros, setBairros] = useState<BairroEntrega[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    id: "" as string | undefined,
    nome: "",
    taxa: "8",
    ativo: true,
  });

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      setBairros(await buscarBairrosDono());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar bairros.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  function editar(b: BairroEntrega) {
    setForm({
      id: b.id,
      nome: b.nome,
      taxa: String(b.taxa),
      ativo: b.ativo,
    });
    setMsg(null);
  }

  function limpar() {
    setForm({ id: undefined, nome: "", taxa: "8", ativo: true });
  }

  async function salvar() {
    setSalvando(true);
    setErro(null);
    setMsg(null);
    try {
      await salvarBairroDono({
        id: form.id,
        nome: form.nome,
        taxa: Number(form.taxa),
        ativo: form.ativo,
      });
      setMsg(form.id ? "Bairro atualizado." : "Bairro criado.");
      limpar();
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este bairro?")) return;
    setErro(null);
    try {
      await excluirBairroDono(id);
      if (form.id === id) limpar();
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao excluir.");
    }
  }

  if (carregando) {
    return (
      <p className="text-sm text-muted">Carregando bairros…</p>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
        Bairros e taxas de entrega
      </h2>
      <p className="text-sm text-muted">
        O cliente escolhe o bairro no pedido. A taxa da zona substitui a taxa
        padrão.
      </p>

      {erro ? (
        <div className="rounded-xl border border-dende/30 bg-dende-suave px-3 py-2 text-sm text-muted">
          {erro}
        </div>
      ) : null}
      {msg ? (
        <div className="rounded-xl border border-mar/30 bg-mar-suave px-3 py-2 text-sm text-mar">
          {msg}
        </div>
      ) : null}

      <div className="rounded-2xl border border-linha bg-white px-4 py-4 space-y-3">
        <label className="block text-sm text-muted">
          Nome do bairro
          <input
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            className="mt-1 w-full rounded-xl border border-linha px-3 py-2.5 text-foreground outline-none focus:border-dende"
            placeholder="Ex.: Pituba"
          />
        </label>
        <label className="block text-sm text-muted">
          Taxa (R$)
          <input
            type="number"
            min={0}
            step={0.5}
            value={form.taxa}
            onChange={(e) => setForm({ ...form, taxa: e.target.value })}
            className="mt-1 w-full rounded-xl border border-linha px-3 py-2.5 text-foreground outline-none focus:border-dende"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={form.ativo}
            onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
          />
          Ativo (aparece para o cliente)
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={salvando}
            onClick={() => void salvar()}
            className="flex-1 rounded-xl bg-dende px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {salvando
              ? "Salvando…"
              : form.id
                ? "Salvar bairro"
                : "Adicionar bairro"}
          </button>
          {form.id ? (
            <button
              type="button"
              onClick={limpar}
              className="rounded-xl border border-linha px-4 py-2.5 text-sm font-semibold text-muted"
            >
              Cancelar
            </button>
          ) : null}
        </div>
      </div>

      <ul className="space-y-2">
        {bairros.map((b) => (
          <li
            key={b.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-linha bg-white px-4 py-3 text-sm"
          >
            <div>
              <p className="font-medium text-foreground">
                {b.nome}{" "}
                {!b.ativo ? (
                  <span className="text-xs text-muted">(inativo)</span>
                ) : null}
              </p>
              <p className="text-muted">{formatarReais(Number(b.taxa))}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => editar(b)}
                className="rounded-lg border border-mar px-3 py-1.5 text-xs font-semibold text-mar"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => void excluir(b.id)}
                className="rounded-lg border border-dende px-3 py-1.5 text-xs font-semibold text-dende"
              >
                Excluir
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
