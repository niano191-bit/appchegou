"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AvisoFila } from "@/components/aviso-fila";
import { ContatoPedido } from "@/components/contato-pedido";
import { LinksWhatsAppPedido } from "@/components/links-whatsapp-pedido";
import { SeloAoVivo } from "@/components/selo-ao-vivo";
import { useTempoRealPedidos } from "@/hooks/use-tempo-real-pedidos";
import { linkWhatsApp } from "@/lib/contato";
import {
  atribuirEntregadorDono,
  buscarConfiguracaoDono,
  buscarEntregadoresDono,
  buscarPedidosDono,
  buscarResumoDia,
  buscarRestaurantesDono,
  cancelarPedidoDono,
  criarEntregadorDono,
  salvarConfiguracaoDono,
  type GanhosEntregadorDono,
  type PedidoDono,
  type ResumoDia,
} from "@/lib/dono";
import {
  linkWhatsAppFechamento,
  type FechamentoDia,
} from "@/lib/fechamento";
import {
  pedidoEhDinheiroPendente,
  pedidoVisivelNaOperacao,
  textoCobrancaDinheiro,
} from "@/lib/pagamento-pedido";
import {
  classificarPedidoCritico,
  contarPedidosCriticos,
  ordenarCriticosPrimeiro,
  textoMinutosParado,
} from "@/lib/pedidos-criticos";
import { rotuloPedido } from "@/lib/pedido-rotulo";
import { linkWhatsAppEntregadorComanda } from "@/lib/resumo-whatsapp";
import type { Configuracao, Restaurante, Usuario } from "@/types/database";
import {
  DISPONIBILIDADE_LABEL,
  formatarReais,
  STATUS_PAGAMENTO_LABEL,
  STATUS_PEDIDO_LABEL,
} from "@/types/database";
import { GestaoBairros } from "./gestao-bairros";
import { GestaoCupons } from "./gestao-cupons";
import { GestaoLojas } from "./gestao-lojas";
import { GestaoVitrine } from "./gestao-vitrine";

export function PainelDono() {
  const [resumo, setResumo] = useState<ResumoDia | null>(null);
  const [pedidos, setPedidos] = useState<PedidoDono[]>([]);
  const [restaurantes, setRestaurantes] = useState<Restaurante[]>([]);
  const [entregadores, setEntregadores] = useState<Usuario[]>([]);
  const [ganhosEntregadores, setGanhosEntregadores] = useState<
    GanhosEntregadorDono[]
  >([]);
  const [config, setConfig] = useState<Configuracao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [atribuindoId, setAtribuindoId] = useState<string | null>(null);
  const [cancelandoId, setCancelandoId] = useState<string | null>(null);
  const [escolhaEntregador, setEscolhaEntregador] = useState<
    Record<string, string>
  >({});
  const [agoraTick, setAgoraTick] = useState(() => Date.now());
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
      setEntregadores(ents.entregadores);
      setGanhosEntregadores(ents.ganhos);
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

  useEffect(() => {
    const id = window.setInterval(() => setAgoraTick(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const agora = useMemo(() => new Date(agoraTick), [agoraTick]);
  const pedidosOrdenados = useMemo(
    () => ordenarCriticosPrimeiro(pedidos, agora),
    [pedidos, agora],
  );
  const qtdCriticos = useMemo(
    () => contarPedidosCriticos(pedidos, agora),
    [pedidos, agora],
  );

  const contarCriticos = useCallback(async () => {
    const lista = await buscarPedidosDono();
    return contarPedidosCriticos(lista);
  }, []);

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

  function proximoEntregadorLivre() {
    return (
      entregadores.find(
        (e) => (e.disponibilidade ?? "offline") === "livre",
      ) ?? null
    );
  }

  async function atribuir(pedidoId: string, liberar = false) {
    const entregadorId = escolhaEntregador[pedidoId];
    if (!liberar && !entregadorId) {
      setErro("Escolha um entregador.");
      return;
    }
    setAtribuindoId(pedidoId);
    setErro(null);
    setMsg(null);
    try {
      await atribuirEntregadorDono(
        pedidoId,
        liberar ? { liberar: true } : { entregadorId },
      );
      setMsg(
        liberar
          ? "Pedido liberado para qualquer entregador."
          : "Entregador atribuído.",
      );
      await carregar(true);
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : "Não foi possível atribuir.",
      );
    } finally {
      setAtribuindoId(null);
    }
  }

  /** Atribui ao primeiro livre e abre WhatsApp com a comanda */
  async function despacharProximoLivre(p: PedidoDono) {
    const livre = proximoEntregadorLivre();
    if (!livre) {
      setErro(
        "Nenhum entregador livre agora. Peça para tocarem em “Ficar livre” ou escolha na lista.",
      );
      return;
    }

    setAtribuindoId(p.id);
    setErro(null);
    setMsg(null);
    try {
      await atribuirEntregadorDono(p.id, { entregadorId: livre.id });
      setEscolhaEntregador((prev) => ({ ...prev, [p.id]: livre.id }));
      setMsg(`Despachado para ${livre.nome}.`);
      await carregar(true);
      const whats = linkWhatsAppEntregadorComanda(livre.telefone, p);
      if (whats) {
        window.open(whats, "_blank", "noopener,noreferrer");
      }
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : "Não foi possível despachar.",
      );
    } finally {
      setAtribuindoId(null);
    }
  }

  async function cancelarComoDono(p: PedidoDono) {
    const motivo = window.prompt(
      "Motivo do cancelamento (opcional). O cliente verá este aviso.",
      "",
    );
    if (motivo === null) return;
    if (
      !confirm(
        pedidoEhDinheiroPendente(p)
          ? "Cancelar este pedido? O cliente será avisado (pagamento era em dinheiro — sem estorno)."
          : p.status_pagamento === "pago"
            ? "Cancelar este pedido? O cliente será avisado e o app tenta estornar o Pix."
            : "Cancelar este pedido? O cliente será avisado.",
      )
    ) {
      return;
    }

    setCancelandoId(p.id);
    setErro(null);
    setMsg(null);
    try {
      await cancelarPedidoDono(p.id, motivo.trim() || undefined);
      setMsg("Pedido cancelado.");
      await carregar(true);
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : "Não foi possível cancelar.",
      );
    } finally {
      setCancelandoId(null);
    }
  }

  function nomeEntregador(id: string | null | undefined) {
    if (!id) return null;
    return entregadores.find((e) => e.id === id)?.nome ?? "Entregador";
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
      <AvisoFila
        chave="aviso-fila-dono-criticos"
        contar={contarCriticos}
        mensagem={(qtd) =>
          qtd === 1
            ? "1 pedido precisa de atenção agora!"
            : `${qtd} pedidos precisam de atenção agora!`
        }
      />

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

      {qtdCriticos > 0 ? (
        <div className="rounded-2xl border border-dende/50 bg-dende-suave px-5 py-4 text-sm text-dende-escuro">
          <p className="font-semibold">
            {qtdCriticos === 1
              ? "1 pedido atrasado / parado"
              : `${qtdCriticos} pedidos atrasados / parados`}
          </p>
          <p className="mt-1 text-muted">
            Eles aparecem no topo da lista. Atribua entregador ou fale com a
            loja.
          </p>
        </div>
      ) : null}

      {/* Números do dia */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
          Números do dia
        </h2>
        {resumo?.data_label ? (
          <p className="text-sm text-muted capitalize">{resumo.data_label}</p>
        ) : null}
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
        {(resumo?.faturamento_pix != null ||
          resumo?.faturamento_dinheiro != null) &&
        (Number(resumo?.faturamento_dinheiro) > 0 ||
          Number(resumo?.faturamento_pix) > 0) ? (
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-xl border border-linha bg-white px-2 py-2">
              <p className="font-semibold text-foreground">
                {formatarReais(resumo?.faturamento_pix ?? 0)}
              </p>
              <p className="text-muted">Pix / online</p>
            </div>
            <div className="rounded-xl border border-linha bg-white px-2 py-2">
              <p className="font-semibold text-foreground">
                {formatarReais(resumo?.faturamento_dinheiro ?? 0)}
              </p>
              <p className="text-muted">Dinheiro</p>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-xl border border-linha bg-white px-2 py-2">
            <p className="font-semibold text-foreground">
              {resumo?.entregues ?? 0}
            </p>
            <p className="text-muted">Entregues</p>
          </div>
          <div className="rounded-xl border border-linha bg-white px-2 py-2">
            <p className="font-semibold text-foreground">
              {resumo?.em_andamento ?? 0}
            </p>
            <p className="text-muted">Andamento</p>
          </div>
          <div className="rounded-xl border border-linha bg-white px-2 py-2">
            <p className="font-semibold text-foreground">
              {resumo?.cancelados ?? 0}
            </p>
            <p className="text-muted">Cancelados</p>
          </div>
        </div>

        {(resumo?.repasse_pix_total != null ||
          resumo?.a_receber_lojas != null) &&
        (Number(resumo?.repasse_pix_total) > 0 ||
          Number(resumo?.a_receber_lojas) > 0) ? (
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-xl border border-mar/30 bg-mar-suave/40 px-2 py-2">
              <p className="font-semibold text-mar">
                {formatarReais(resumo?.repasse_pix_total ?? 0)}
              </p>
              <p className="text-muted">Repasse Pix às lojas</p>
            </div>
            <div className="rounded-xl border border-dende/30 bg-dende-suave/50 px-2 py-2">
              <p className="font-semibold text-dende">
                {formatarReais(resumo?.a_receber_lojas ?? 0)}
              </p>
              <p className="text-muted">A receber das lojas</p>
            </div>
          </div>
        ) : null}

        {resumo?.por_loja && resumo.por_loja.length > 0 ? (
          <div className="rounded-2xl border border-linha bg-white px-4 py-3 text-sm">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">
              Repasse por loja
            </p>
            <p className="mt-1 text-xs text-muted">
              Transferir Pix = vendas Pix − comissão. Dinheiro já ficou na
              loja.
            </p>
            <ul className="mt-3 space-y-3">
              {resumo.por_loja.map((loja) => {
                const repasse = Number(loja.repasse_pix ?? 0);
                const liquido = Number(
                  loja.liquido ??
                    Number(loja.faturamento) - Number(loja.comissao),
                );
                const chave = loja.chave_pix?.trim() || "";
                const valorCopiar =
                  repasse > 0
                    ? repasse.toFixed(2).replace(".", ",")
                    : Math.abs(repasse).toFixed(2).replace(".", ",");

                async function copiar(texto: string, ok: string) {
                  try {
                    await navigator.clipboard.writeText(texto);
                    setMsg(ok);
                  } catch {
                    setErro("Não foi possível copiar. Copie manualmente.");
                  }
                }

                return (
                  <li
                    key={loja.restaurante_id ?? loja.nome}
                    className="border-t border-linha pt-3 first:border-t-0 first:pt-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-foreground">
                        {loja.nome}{" "}
                        <span className="font-normal text-muted">
                          ({loja.pedidos})
                        </span>
                      </p>
                      <p
                        className={`shrink-0 text-sm font-semibold ${
                          repasse > 0
                            ? "text-mar"
                            : repasse < 0
                              ? "text-dende"
                              : "text-muted"
                        }`}
                      >
                        {repasse > 0
                          ? `Pix ${formatarReais(repasse)}`
                          : repasse < 0
                            ? `Deve ${formatarReais(Math.abs(repasse))}`
                            : "Zerado"}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      Fat. {formatarReais(Number(loja.faturamento))} · Pix{" "}
                      {formatarReais(Number(loja.faturamento_pix ?? 0))} ·
                      Din.{" "}
                      {formatarReais(Number(loja.faturamento_dinheiro ?? 0))}
                    </p>
                    <p className="text-xs text-muted">
                      Comissão {formatarReais(Number(loja.comissao))} ·
                      Líquido {formatarReais(liquido)}
                    </p>
                    {chave ? (
                      <p className="mt-1 break-all text-xs text-foreground">
                        Chave: {chave}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-dende">
                        Sem chave Pix cadastrada — edite a loja.
                      </p>
                    )}
                    {repasse !== 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {chave ? (
                          <button
                            type="button"
                            onClick={() =>
                              void copiar(chave, `Chave de ${loja.nome} copiada.`)
                            }
                            className="rounded-xl border border-mar/40 bg-mar-suave/50 px-3 py-1.5 text-xs font-semibold text-mar"
                          >
                            Copiar chave
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() =>
                            void copiar(
                              valorCopiar,
                              `Valor de ${loja.nome} copiado.`,
                            )
                          }
                          className="rounded-xl border border-linha bg-white px-3 py-1.5 text-xs font-semibold text-foreground"
                        >
                          Copiar valor
                        </button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {resumo ? (
          <a
            href={linkWhatsAppFechamento({
              data: resumo.data ?? "",
              data_label: resumo.data_label ?? "",
              qtd_pedidos: Number(resumo.qtd_pedidos ?? 0),
              faturamento: Number(resumo.faturamento ?? 0),
              faturamento_pix: Number(resumo.faturamento_pix ?? 0),
              faturamento_dinheiro: Number(resumo.faturamento_dinheiro ?? 0),
              comissao: Number(resumo.comissao ?? 0),
              ticket_medio: Number(resumo.ticket_medio ?? 0),
              taxa_entrega_total: Number(resumo.taxa_entrega_total ?? 0),
              gorjeta_total: Number(resumo.gorjeta_total ?? 0),
              repasse_pix_total: Number(resumo.repasse_pix_total ?? 0),
              a_receber_lojas: Number(resumo.a_receber_lojas ?? 0),
              entregues: Number(resumo.entregues ?? 0),
              cancelados: Number(resumo.cancelados ?? 0),
              em_andamento: Number(resumo.em_andamento ?? 0),
              por_loja: (resumo.por_loja ?? []).map((loja) => ({
                restaurante_id: loja.restaurante_id ?? null,
                nome: loja.nome,
                chave_pix: loja.chave_pix ?? null,
                pedidos: Number(loja.pedidos ?? 0),
                faturamento: Number(loja.faturamento ?? 0),
                faturamento_pix: Number(loja.faturamento_pix ?? 0),
                faturamento_dinheiro: Number(loja.faturamento_dinheiro ?? 0),
                comissao: Number(loja.comissao ?? 0),
                liquido: Number(
                  loja.liquido ??
                    Number(loja.faturamento ?? 0) - Number(loja.comissao ?? 0),
                ),
                repasse_pix: Number(loja.repasse_pix ?? 0),
              })),
              por_entregador: (resumo.por_entregador ?? []).map((e) => ({
                nome: e.nome,
                entregas: Number(e.entregas ?? 0),
                valor: Number(e.valor ?? 0),
              })),
            } as FechamentoDia)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-mar px-4 py-3 text-center text-sm font-semibold text-white"
          >
            Enviar fechamento no WhatsApp
          </a>
        ) : null}
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
            {pedidosOrdenados.slice(0, 20).map((p) => {
              const podeDespachar =
                pedidoVisivelNaOperacao(p) &&
                (p.status === "pronto" || p.status === "a_caminho");
              const atual = nomeEntregador(p.entregador_id);
              const selecionado =
                escolhaEntregador[p.id] || p.entregador_id || "";
              const entregadorSel = entregadores.find(
                (e) => e.id === selecionado,
              );
              const whatsEntregador =
                entregadorSel && podeDespachar
                  ? linkWhatsAppEntregadorComanda(entregadorSel.telefone, p)
                  : null;
              const ocupado = atribuindoId === p.id;
              const cancelando = cancelandoId === p.id;
              const critico = classificarPedidoCritico(p, agora);
              const livreAgora = proximoEntregadorLivre();
              const emAndamento =
                p.status !== "entregue" && p.status !== "cancelado";
              const whatsLoja = linkWhatsApp(
                p.restaurante_telefone,
                `Olá! Sobre o pedido ${rotuloPedido(p)} no app.`,
              );

              return (
                <li
                  key={p.id}
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    critico.critico
                      ? "border-dende/60 bg-dende-suave/40"
                      : "border-linha bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground">
                        {p.restaurante_nome}
                      </p>
                      <p className="text-muted">
                        {rotuloPedido(p)} · {formatarReais(Number(p.total))}
                      </p>
                      {p.avaliacao_nota != null ? (
                        <p className="text-xs font-medium text-mar">
                          Nota {p.avaliacao_nota}/5
                          {p.avaliacao_comentario?.trim()
                            ? ` — ${p.avaliacao_comentario.trim()}`
                            : ""}
                        </p>
                      ) : null}
                      {pedidoEhDinheiroPendente(p) ? (
                        <p className="text-xs font-semibold text-dende">
                          {textoCobrancaDinheiro(p)}
                        </p>
                      ) : null}
                      <p className="text-xs text-muted">
                        Comissão {p.comissao_percentual}% ={" "}
                        {formatarReais(p.comissao_valor)}
                      </p>
                      {critico.critico ? (
                        <p className="mt-1 text-xs font-semibold text-dende">
                          {critico.rotulo} ·{" "}
                          {textoMinutosParado(critico.minutosParado)}
                        </p>
                      ) : null}
                      {atual ? (
                        <p className="mt-1 text-xs font-medium text-mar">
                          Entregador: {atual}
                        </p>
                      ) : podeDespachar ? (
                        <p className="mt-1 text-xs text-muted">
                          Sem entregador atribuído
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        critico.critico
                          ? "bg-dende text-white"
                          : "bg-dende-suave text-dende"
                      }`}
                    >
                      {pedidoVisivelNaOperacao(p)
                        ? STATUS_PEDIDO_LABEL[p.status]
                        : STATUS_PAGAMENTO_LABEL[p.status_pagamento]}
                    </span>
                  </div>

                  {emAndamento ? (
                    <div className="mt-3 space-y-2 border-t border-linha pt-3">
                      <ContatoPedido
                        nome={p.cliente_nome}
                        telefone={p.cliente_telefone}
                        enderecoLoja={p.restaurante_endereco}
                        mostrarLoja
                      />
                      <LinksWhatsAppPedido pedido={p} />
                      {whatsLoja ? (
                        <a
                          href={whatsLoja}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block rounded-xl border border-linha bg-white px-3 py-2.5 text-center text-sm font-semibold text-foreground"
                        >
                          WhatsApp da loja
                        </a>
                      ) : null}
                      <button
                        type="button"
                        disabled={cancelando}
                        onClick={() => void cancelarComoDono(p)}
                        className="w-full rounded-xl border border-dende px-3 py-2.5 text-sm font-semibold text-dende disabled:opacity-60"
                      >
                        {cancelando ? "Cancelando…" : "Cancelar pedido"}
                      </button>
                    </div>
                  ) : null}

                  {podeDespachar && entregadores.length > 0 ? (
                    <div className="mt-3 space-y-2 border-t border-linha pt-3">
                      {p.status === "pronto" && !p.entregador_id ? (
                        <button
                          type="button"
                          disabled={ocupado || !livreAgora}
                          onClick={() => void despacharProximoLivre(p)}
                          className="w-full rounded-xl bg-dende px-3 py-3 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          {ocupado
                            ? "Despachando…"
                            : livreAgora
                              ? `Despachar → ${livreAgora.nome}`
                              : "Nenhum entregador livre"}
                        </button>
                      ) : null}
                      <label className="block text-xs font-medium text-muted">
                        Atribuir entregador
                        <select
                          value={selecionado}
                          onChange={(e) =>
                            setEscolhaEntregador((prev) => ({
                              ...prev,
                              [p.id]: e.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-xl border border-linha bg-white px-3 py-2 text-sm text-foreground"
                        >
                          <option value="">Escolha…</option>
                          {entregadores.map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.nome} ·{" "}
                              {
                                DISPONIBILIDADE_LABEL[
                                  e.disponibilidade ?? "offline"
                                ]
                              }
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          disabled={ocupado || !selecionado}
                          onClick={() => void atribuir(p.id, false)}
                          className="flex-1 rounded-xl bg-mar px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          {ocupado
                            ? "Salvando…"
                            : p.entregador_id
                              ? "Trocar entregador"
                              : "Atribuir"}
                        </button>
                        {p.status === "pronto" && p.entregador_id ? (
                          <button
                            type="button"
                            disabled={ocupado}
                            onClick={() => void atribuir(p.id, true)}
                            className="rounded-xl border border-linha px-3 py-2 text-sm font-semibold text-muted disabled:opacity-60"
                          >
                            Liberar
                          </button>
                        ) : null}
                        {whatsEntregador ? (
                          <a
                            href={whatsEntregador}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-xl border border-mar/40 bg-mar-suave/50 px-3 py-2 text-center text-sm font-semibold text-mar"
                          >
                            WhatsApp
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <GestaoVitrine />

      <GestaoLojas
        restaurantes={restaurantes}
        onAtualizou={() => carregar(true)}
      />

      <GestaoBairros />

      <GestaoCupons />

      {/* Entregadores */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
          Entregadores
        </h2>

        <div className="rounded-2xl border border-mar/30 bg-mar-suave/40 px-4 py-4">
          <p className="text-xs font-medium tracking-wide text-muted uppercase">
            Ganhos de hoje (taxas de entrega)
          </p>
          {ganhosEntregadores.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Nenhum entregador cadastrado.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {ganhosEntregadores.map((g) => (
                <li
                  key={g.entregador_id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <div>
                    <p className="font-semibold text-foreground">{g.nome}</p>
                    <p className="text-xs text-muted">
                      {g.entregas === 0
                        ? "0 entregas"
                        : g.entregas === 1
                          ? "1 entrega"
                          : `${g.entregas} entregas`}
                    </p>
                  </div>
                  <p className="font-semibold text-mar">
                    {formatarReais(g.valor)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 border-t border-mar/20 pt-2 text-sm font-semibold text-foreground">
            Total do dia{" "}
            <span className="text-mar">
              {formatarReais(
                ganhosEntregadores.reduce((s, g) => s + Number(g.valor), 0),
              )}
            </span>
          </p>
        </div>

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
          {entregadores.map((e) => {
            const disp = e.disponibilidade ?? "offline";
            return (
              <li
                key={e.id}
                className="rounded-2xl border border-linha bg-white px-4 py-3 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-foreground">{e.nome}</p>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      disp === "livre"
                        ? "bg-mar-suave text-mar"
                        : disp === "em_rota"
                          ? "bg-dende-suave text-dende"
                          : "bg-linha text-muted"
                    }`}
                  >
                    {DISPONIBILIDADE_LABEL[disp]}
                  </span>
                </div>
                <p className="text-muted">{e.telefone ?? "Sem telefone"}</p>
                <p className="text-xs text-muted">{e.email}</p>
              </li>
            );
          })}
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
              Taxa padrão (R$) — só se não houver bairros ativos
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
              <label className="flex items-center gap-3 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={config.pagamento_dinheiro ?? true}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      pagamento_dinheiro: e.target.checked,
                    })
                  }
                  className="h-4 w-4 accent-dende"
                />
                Dinheiro na entrega
              </label>
              <p className="text-xs text-muted">
                Pode deixar vários ligados. O cliente escolhe na hora de pagar.
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
