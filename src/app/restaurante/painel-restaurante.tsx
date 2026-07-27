"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AvisoFila } from "@/components/aviso-fila";
import { ContatoPedido } from "@/components/contato-pedido";
import { LinksWhatsAppPedido } from "@/components/links-whatsapp-pedido";
import { SeloAoVivo } from "@/components/selo-ao-vivo";
import { useTempoRealPedidos } from "@/hooks/use-tempo-real-pedidos";
import { baixarComandaPdf } from "@/lib/comanda-impressao";
import { OPCOES_ETA_MINUTOS, type MinutosEta } from "@/lib/eta";
import {
  pedidoEhDinheiroPendente,
  textoCobrancaDinheiro,
} from "@/lib/pagamento-pedido";
import {
  atualizarStatusPedido,
  listarPedidosDoRestaurante,
  recusarPedido,
  type PedidoComItens,
} from "@/lib/pedidos";
import { rotuloPedido } from "@/lib/pedido-rotulo";
import { obterSessaoCliente } from "@/lib/sessao-cliente";
import { formatarReais, STATUS_PEDIDO_LABEL } from "@/types/database";
import { AvaliacoesLoja } from "./avaliacoes-loja";
import { EmBreve } from "./em-breve";
import { EsgotadoRapido } from "./esgotado-rapido";
import { FinanceiroLoja } from "./financeiro-loja";
import { GestaoCardapioLoja } from "./gestao-cardapio";
import type { SecaoLoja } from "./secoes-loja";
import { ShellLoja } from "./shell-loja";
import { VisaoGeralLoja } from "./visao-geral";

type Fila = "agora" | "historico";

type Props = {
  nomeLoja?: string | null;
  secaoInicial?: SecaoLoja;
};

export function PainelRestaurante({
  nomeLoja,
  secaoInicial = "pedidos",
}: Props) {
  const router = useRouter();
  const restauranteIdRef = useRef<string | null>(null);
  const [secao, setSecaoState] = useState<SecaoLoja>(secaoInicial);
  const [badgePedidos, setBadgePedidos] = useState(0);

  function setSecao(proxima: SecaoLoja) {
    setSecaoState(proxima);
    router.replace(`/restaurante?secao=${proxima}`, { scroll: false });
  }
  const [fila, setFila] = useState<Fila>("agora");
  const [pedidos, setPedidos] = useState<PedidoComItens[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [acaoId, setAcaoId] = useState<string | null>(null);
  const [pausado, setPausado] = useState(false);
  const [pausando, setPausando] = useState(false);
  const [pedidoMinimo, setPedidoMinimo] = useState("0");
  const [salvandoMinimo, setSalvandoMinimo] = useState(false);
  const [horarioAbertura, setHorarioAbertura] = useState("");
  const [horarioFechamento, setHorarioFechamento] = useState("");
  const [salvandoHorario, setSalvandoHorario] = useState(false);
  const [chavePix, setChavePix] = useState("");
  const [salvandoPix, setSalvandoPix] = useState(false);
  /** Pedido aguardando escolha do tempo estimado */
  const [escolhendoEtaId, setEscolhendoEtaId] = useState<string | null>(null);

  const carregar = useCallback(
    async (silencioso = false) => {
      try {
        if (!silencioso) setErro(null);

        if (!restauranteIdRef.current) {
          const user = await obterSessaoCliente();
          if (user?.restaurante_id) {
            restauranteIdRef.current = user.restaurante_id;
          } else if (user?.papel === "dono") {
            const lojaBoot = await fetch("/api/restaurante/loja", {
              cache: "no-store",
            }).then((r) => r.json());
            const idLoja = lojaBoot?.restaurante?.id as string | undefined;
            if (!idLoja) {
              throw new Error("Nenhuma loja disponível para o Admin.");
            }
            restauranteIdRef.current = idLoja;
          } else {
            throw new Error("Sua conta não está ligada a um restaurante.");
          }
        }

        const [dados, lojaRes] = await Promise.all([
          fila === "agora"
            ? listarPedidosDoRestaurante(
                restauranteIdRef.current,
                ["novo", "aceito"],
                "asc",
              )
            : listarPedidosDoRestaurante(
                restauranteIdRef.current,
                ["pronto", "a_caminho", "entregue", "cancelado"],
                "desc",
              ),
          fetch("/api/restaurante/loja", { cache: "no-store" }).then((r) =>
            r.json(),
          ),
        ]);

        setPedidos(dados);
        if (fila === "agora") {
          setBadgePedidos(dados.filter((p) => p.status === "novo").length);
        } else if (restauranteIdRef.current) {
          void listarPedidosDoRestaurante(
            restauranteIdRef.current,
            ["novo"],
            "asc",
          ).then((novos) => setBadgePedidos(novos.length));
        }
        if (lojaRes?.restaurante) {
          setPausado(Boolean(lojaRes.restaurante.pausado));
          setPedidoMinimo(String(Number(lojaRes.restaurante.pedido_minimo ?? 0)));
          setHorarioAbertura(lojaRes.restaurante.horario_abertura ?? "");
          setHorarioFechamento(lojaRes.restaurante.horario_fechamento ?? "");
          setChavePix(lojaRes.restaurante.chave_pix ?? "");
        }
        setErro(null);
      } catch (e) {
        const mensagem =
          e instanceof Error
            ? e.message
            : "Não foi possível carregar os pedidos.";
        setErro(mensagem);
      } finally {
        setCarregando(false);
      }
    },
    [fila],
  );

  async function alternarPausa() {
    setPausando(true);
    setErro(null);
    try {
      const resposta = await fetch("/api/restaurante/loja", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pausado: !pausado }),
      });
      const json = (await resposta.json()) as {
        restaurante?: { pausado?: boolean };
        erro?: string;
      };
      if (!resposta.ok) {
        throw new Error(json.erro ?? "Não foi possível atualizar a pausa.");
      }
      setPausado(Boolean(json.restaurante?.pausado));
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : "Não foi possível atualizar a pausa.",
      );
    } finally {
      setPausando(false);
    }
  }

  async function salvarPedidoMinimo() {
    setSalvandoMinimo(true);
    setErro(null);
    try {
      const valor = Number(String(pedidoMinimo).replace(",", "."));
      if (Number.isNaN(valor) || valor < 0) {
        throw new Error("Pedido mínimo inválido.");
      }
      const resposta = await fetch("/api/restaurante/loja", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedido_minimo: valor }),
      });
      const json = (await resposta.json()) as {
        restaurante?: { pedido_minimo?: number };
        erro?: string;
      };
      if (!resposta.ok) {
        throw new Error(json.erro ?? "Não foi possível salvar o pedido mínimo.");
      }
      setPedidoMinimo(String(Number(json.restaurante?.pedido_minimo ?? valor)));
    } catch (e) {
      setErro(
        e instanceof Error
          ? e.message
          : "Não foi possível salvar o pedido mínimo.",
      );
    } finally {
      setSalvandoMinimo(false);
    }
  }

  async function salvarHorarioLoja() {
    setSalvandoHorario(true);
    setErro(null);
    try {
      const resposta = await fetch("/api/restaurante/loja", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          horario_abertura: horarioAbertura.trim() || null,
          horario_fechamento: horarioFechamento.trim() || null,
        }),
      });
      const json = (await resposta.json()) as {
        restaurante?: {
          horario_abertura?: string | null;
          horario_fechamento?: string | null;
        };
        erro?: string;
      };
      if (!resposta.ok) {
        throw new Error(json.erro ?? "Não foi possível salvar o horário.");
      }
      setHorarioAbertura(json.restaurante?.horario_abertura ?? "");
      setHorarioFechamento(json.restaurante?.horario_fechamento ?? "");
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : "Não foi possível salvar o horário.",
      );
    } finally {
      setSalvandoHorario(false);
    }
  }

  async function salvarChavePix() {
    setSalvandoPix(true);
    setErro(null);
    try {
      const resposta = await fetch("/api/restaurante/loja", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chave_pix: chavePix.trim() || null,
        }),
      });
      const json = (await resposta.json()) as {
        restaurante?: { chave_pix?: string | null };
        erro?: string;
      };
      if (!resposta.ok) {
        throw new Error(json.erro ?? "Não foi possível salvar a chave Pix.");
      }
      setChavePix(json.restaurante?.chave_pix ?? "");
    } catch (e) {
      setErro(
        e instanceof Error
          ? e.message
          : "Não foi possível salvar a chave Pix.",
      );
    } finally {
      setSalvandoPix(false);
    }
  }

  useEffect(() => {
    setCarregando(true);
    void carregar(false);
  }, [carregar]);

  useTempoRealPedidos(() => {
    void carregar(true);
  });

  async function mudarStatus(
    pedidoId: string,
    status: "aceito" | "pronto",
    tempoEstimadoMinutos?: MinutosEta,
  ) {
    setAcaoId(pedidoId);
    setErro(null);

    try {
      const pedidoAntes = pedidos.find((p) => p.id === pedidoId);
      await atualizarStatusPedido(pedidoId, status, {
        tempoEstimadoMinutos,
      });
      if (status === "aceito" && pedidoAntes) {
        baixarComandaPdf(pedidoAntes);
      }
      setEscolhendoEtaId(null);
      await carregar(true);
    } catch (e) {
      const mensagem =
        e instanceof Error ? e.message : "Não foi possível atualizar o pedido.";
      setErro(mensagem);
    } finally {
      setAcaoId(null);
    }
  }

  async function recusar(pedidoId: string) {
    const pedido = pedidos.find((p) => p.id === pedidoId);
    const motivo = window.prompt(
      "Motivo da recusa (opcional). O cliente verá este aviso.",
      "",
    );
    if (motivo === null) return;
    if (
      !confirm(
        pedido && pedidoEhDinheiroPendente(pedido)
          ? "Recusar este pedido? Ele será cancelado e o cliente será avisado (sem estorno — pagamento era em dinheiro)."
          : "Recusar este pedido? Ele será cancelado, o cliente será avisado e o app tenta estornar o Pix automaticamente.",
      )
    ) {
      return;
    }

    setAcaoId(pedidoId);
    setErro(null);
    try {
      await recusarPedido(pedidoId, motivo.trim() || undefined);
      await carregar(true);
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : "Não foi possível recusar o pedido.",
      );
    } finally {
      setAcaoId(null);
    }
  }

  const contarNovos = useCallback(async () => {
    if (!restauranteIdRef.current) return 0;
    const novos = await listarPedidosDoRestaurante(
      restauranteIdRef.current,
      ["novo"],
      "asc",
    );
    return novos.length;
  }, []);

  const blocoPausa = (
    <div
      className={`rounded-2xl border px-4 py-3 ${
        pausado
          ? "border-dende/40 bg-dende-suave"
          : "border-mar/30 bg-mar-suave/50"
      }`}
    >
      <p className="text-sm font-medium text-foreground">
        {pausado
          ? "Pedidos pausados — clientes não conseguem pedir."
          : "Loja recebendo pedidos (dentro do horário de funcionamento)."}
      </p>
      <button
        type="button"
        disabled={pausando}
        onClick={() => void alternarPausa()}
        className={`mt-2 w-full rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-60 ${
          pausado ? "bg-mar text-white" : "border border-dende text-dende"
        }`}
      >
        {pausando
          ? "Salvando…"
          : pausado
            ? "Retomar pedidos"
            : "Pausar pedidos"}
      </button>
    </div>
  );

  const blocoHorario = (
    <div className="rounded-2xl border border-linha bg-white px-4 py-3">
      <p className="text-sm font-medium text-foreground">Horário desta loja</p>
      <p className="mt-1 text-xs text-muted">
        Deixe em branco para usar o horário geral do app. Formato HH:MM
        (Salvador).
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="block text-xs text-muted">
          Abre
          <input
            type="time"
            value={horarioAbertura}
            onChange={(e) => setHorarioAbertura(e.target.value)}
            className="mt-1 w-full rounded-xl border border-linha px-3 py-2.5 text-sm text-foreground outline-none focus:border-dende"
          />
        </label>
        <label className="block text-xs text-muted">
          Fecha
          <input
            type="time"
            value={horarioFechamento}
            onChange={(e) => setHorarioFechamento(e.target.value)}
            className="mt-1 w-full rounded-xl border border-linha px-3 py-2.5 text-sm text-foreground outline-none focus:border-dende"
          />
        </label>
      </div>
      <button
        type="button"
        disabled={salvandoHorario}
        onClick={() => void salvarHorarioLoja()}
        className="mt-2 w-full rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {salvandoHorario ? "Salvando…" : "Salvar horário"}
      </button>
    </div>
  );

  const blocoPix = (
    <div className="rounded-2xl border border-linha bg-white px-4 py-3">
      <p className="text-sm font-medium text-foreground">Chave Pix da loja</p>
      <p className="mt-1 text-xs text-muted">
        Usada no fechamento do dia para o dono te transferir o repasse.
      </p>
      <input
        value={chavePix}
        onChange={(e) => setChavePix(e.target.value)}
        placeholder="CPF, e-mail, telefone ou chave aleatória"
        className="mt-2 w-full rounded-xl border border-linha px-3 py-2.5 text-sm text-foreground outline-none focus:border-dende"
      />
      <button
        type="button"
        disabled={salvandoPix}
        onClick={() => void salvarChavePix()}
        className="mt-2 w-full rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {salvandoPix ? "Salvando…" : "Salvar chave Pix"}
      </button>
    </div>
  );

  const blocoMinimo = (
    <div className="rounded-2xl border border-linha bg-white px-4 py-3">
      <p className="text-sm font-medium text-foreground">Pedido mínimo</p>
      <p className="mt-1 text-xs text-muted">
        Subtotal mínimo para o cliente pedir (sem a taxa de entrega). Use 0
        para não ter mínimo.
      </p>
      <div className="mt-2 flex gap-2">
        <input
          type="number"
          min={0}
          step={0.5}
          value={pedidoMinimo}
          onChange={(e) => setPedidoMinimo(e.target.value)}
          className="w-full rounded-xl border border-linha px-3 py-2.5 text-sm text-foreground outline-none focus:border-dende"
        />
        <button
          type="button"
          disabled={salvandoMinimo}
          onClick={() => void salvarPedidoMinimo()}
          className="shrink-0 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {salvandoMinimo ? "…" : "Salvar"}
        </button>
      </div>
    </div>
  );

  return (
    <ShellLoja
      nome={nomeLoja}
      secao={secao}
      onSecao={setSecao}
      badgePedidos={badgePedidos}
    >
      <div className="flex w-full flex-col gap-4">
      {erro ? (
        <div className="rounded-2xl border border-dende/30 bg-dende-suave px-5 py-4 text-sm text-muted">
          {erro}
        </div>
      ) : null}

      {secao === "visao" ? (
        <VisaoGeralLoja
          pausado={pausado}
          pedidosNaFila={badgePedidos}
          horarioAbertura={horarioAbertura}
          horarioFechamento={horarioFechamento}
          onIr={setSecao}
          onAlternarPausa={() => void alternarPausa()}
          pausando={pausando}
        />
      ) : null}

      {secao === "pedidos" ? (
      <>
      <SeloAoVivo />
      <AvisoFila
        chave="aviso-fila-restaurante"
        contar={contarNovos}
        mensagem={(qtd) =>
          qtd === 1
            ? "Chegou 1 pedido novo!"
            : `Chegaram ${qtd} pedidos novos!`
        }
      />

      {blocoPausa}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setFila("agora")}
          className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
            fila === "agora"
              ? "bg-dende text-white"
              : "border border-linha bg-white text-muted"
          }`}
        >
          Agora
        </button>
        <button
          type="button"
          onClick={() => setFila("historico")}
          className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
            fila === "historico"
              ? "bg-dende text-white"
              : "border border-linha bg-white text-muted"
          }`}
        >
          Histórico
        </button>
      </div>

      {carregando ? (
        <p className="rounded-2xl bg-white/70 px-5 py-4 text-sm text-muted">
          Carregando pedidos…
        </p>
      ) : null}

      {!carregando && pedidos.length === 0 && !erro ? (
        <div className="rounded-2xl border border-dashed border-linha bg-white/60 px-5 py-10 text-center text-sm text-muted">
          {fila === "agora"
            ? "Nenhum pedido novo ou em preparo no momento."
            : "Ainda não há pedidos no histórico."}
        </div>
      ) : null}

      <ul className="flex flex-col gap-4">
        {pedidos.map((pedido) => {
          const ocupado = acaoId === pedido.id;
          const totalComEntrega =
            Number(pedido.total) +
            Number(pedido.taxa_entrega) +
            Number(pedido.gorjeta ?? 0);

          return (
            <li
              key={pedido.id}
              className="rounded-2xl border border-linha bg-white px-5 py-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium tracking-wide text-muted uppercase">
                    Pedido {rotuloPedido(pedido)}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {formatarReais(totalComEntrega)}
                  </p>
                  {pedidoEhDinheiroPendente(pedido) ? (
                    <p className="mt-1 text-xs font-semibold text-dende">
                      {textoCobrancaDinheiro(pedido)}
                    </p>
                  ) : null}
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    pedido.status === "novo"
                      ? "bg-dende-suave text-dende"
                      : pedido.status === "entregue"
                        ? "bg-linha text-muted"
                        : "bg-mar-suave text-mar"
                  }`}
                >
                  {STATUS_PEDIDO_LABEL[pedido.status]}
                </span>
              </div>

              <ContatoPedido
                nome={pedido.cliente_nome}
                telefone={pedido.cliente_telefone}
              />
              <LinksWhatsAppPedido pedido={pedido} />

              <p className="mt-3 text-sm text-muted">
                Entrega: {pedido.endereco_entrega}
                {pedido.bairro_entrega ? ` (${pedido.bairro_entrega})` : ""}
              </p>
              {pedido.observacao ? (
                <p className="mt-1 text-sm text-muted">
                  Obs.: {pedido.observacao}
                </p>
              ) : null}

              <ul className="mt-3 border-t border-linha pt-3 text-sm text-foreground">
                {pedido.itens_pedido.map((item) => (
                  <li
                    key={item.id}
                    className="flex justify-between gap-3 py-0.5"
                  >
                    <span>
                      {item.quantidade}× {item.nome}
                      {item.observacao?.trim() ? (
                        <span className="mt-0.5 block text-xs text-dende">
                          Obs.: {item.observacao.trim()}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-muted">
                      {formatarReais(
                        Number(item.preco_unitario) * item.quantidade,
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => baixarComandaPdf(pedido)}
                  className="rounded-xl border border-mar/40 bg-mar-suave/40 px-4 py-2.5 text-sm font-semibold text-mar"
                >
                  Salvar PDF da comanda
                </button>

                {fila === "agora" ? (
                  <>
                    {pedido.status === "novo" &&
                    escolhendoEtaId === pedido.id ? (
                      <div className="rounded-xl border border-dende/30 bg-dende-suave/60 px-3 py-3">
                        <p className="text-sm font-medium text-foreground">
                          Em quanto tempo entrega?
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {OPCOES_ETA_MINUTOS.map((min) => (
                            <button
                              key={min}
                              type="button"
                              disabled={ocupado}
                              onClick={() =>
                                void mudarStatus(pedido.id, "aceito", min)
                              }
                              className="rounded-xl bg-dende px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                            >
                              {ocupado ? "…" : `${min} min`}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          disabled={ocupado}
                          onClick={() => setEscolhendoEtaId(null)}
                          className="mt-2 w-full text-xs font-semibold text-muted underline-offset-2 hover:underline"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-2 sm:flex-row">
                      {pedido.status === "novo" &&
                      escolhendoEtaId !== pedido.id ? (
                        <button
                          type="button"
                          disabled={ocupado}
                          onClick={() => setEscolhendoEtaId(pedido.id)}
                          className="flex-1 rounded-xl bg-dende px-4 py-3 text-sm font-semibold text-white transition hover:bg-dende-escuro disabled:opacity-60"
                        >
                          Aceitar e salvar PDF
                        </button>
                      ) : null}

                      {pedido.status === "aceito" ? (
                        <button
                          type="button"
                          disabled={ocupado}
                          onClick={() => void mudarStatus(pedido.id, "pronto")}
                          className="flex-1 rounded-xl bg-mar px-4 py-3 text-sm font-semibold text-white transition hover:bg-mar/90 disabled:opacity-60"
                        >
                          {ocupado ? "Salvando…" : "Marcar como pronto"}
                        </button>
                      ) : null}
                    </div>

                    {pedido.status === "aceito" &&
                    pedido.tempo_estimado_minutos ? (
                      <p className="text-xs text-muted">
                        Previsão enviada ao cliente:{" "}
                        {pedido.tempo_estimado_minutos} min
                      </p>
                    ) : null}

                    {pedido.status === "novo" || pedido.status === "aceito" ? (
                      <button
                        type="button"
                        disabled={ocupado}
                        onClick={() => void recusar(pedido.id)}
                        className="rounded-xl border border-dende px-4 py-2.5 text-sm font-semibold text-dende disabled:opacity-60"
                      >
                        Recusar pedido
                      </button>
                    ) : null}
                  </>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      </>
      ) : null}

      {secao === "conversas" ? (
        <EmBreve
          titulo="Conversas"
          texto="Em breve você poderá falar com o cliente por aqui. Por enquanto use o WhatsApp nos pedidos."
        />
      ) : null}

      {secao === "avaliacoes" ? <AvaliacoesLoja /> : null}

      {secao === "produtos" ? <GestaoCardapioLoja /> : null}

      {secao === "categorias" ? (
        <EmBreve
          titulo="Categorias do cardápio"
          texto="Ainda não há categorias por loja. Organize os pratos em Produtos; as categorias da home ficam no Admin."
        />
      ) : null}

      {secao === "adicionais" ? (
        <EmBreve
          titulo="Adicionais"
          texto="Em breve você poderá cadastrar adicionais (queijo, molho, etc.) nos pratos."
        />
      ) : null}

      {secao === "estoque" ? <EsgotadoRapido /> : null}

      {secao === "entregador" ? (
        <EmBreve
          titulo="Chamar entregador"
          texto="Hoje o Admin atribui o entregador. Em breve a loja poderá chamar por aqui."
        />
      ) : null}

      {secao === "bairros" ? (
        <EmBreve
          titulo="Bairros e taxas"
          texto="As taxas de entrega por bairro são definidas no painel Admin."
        />
      ) : null}

      {secao === "horarios" ? blocoHorario : null}

      {secao === "financeiro" ? <FinanceiroLoja /> : null}

      {secao === "repasses" ? (
        <div className="flex flex-col gap-3">
          <EmBreve
            titulo="Repasses"
            texto="O valor a receber aparece no fechamento do dia no Admin. Cadastre sua chave Pix abaixo."
          />
          {blocoPix}
        </div>
      ) : null}

      {secao === "cupons" ? (
        <EmBreve
          titulo="Cupons"
          texto="Os cupons do app são criados pelo Admin. Em breve a loja poderá ter cupons próprios."
        />
      ) : null}

      {secao === "pagamentos" ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-linha bg-white px-4 py-4 text-sm text-muted">
            <p className="font-medium text-foreground">
              Formas aceitas no app
            </p>
            <p className="mt-2">
              Pix e dinheiro (conforme configuração do Admin). Sua chave Pix é
              usada no repasse da loja.
            </p>
          </div>
          {blocoPix}
        </div>
      ) : null}

      {secao === "impressao" ? (
        <div className="rounded-2xl border border-linha bg-white px-4 py-4 text-sm text-muted">
          <p className="font-medium text-foreground">Impressão de comanda</p>
          <p className="mt-2">
            Em cada pedido, use <strong>Salvar PDF da comanda</strong> para
            imprimir ou compartilhar. Ao aceitar um pedido novo, o PDF é gerado
            automaticamente.
          </p>
          <button
            type="button"
            onClick={() => setSecao("pedidos")}
            className="mt-4 w-full rounded-xl bg-dende px-4 py-2.5 text-sm font-semibold text-white"
          >
            Ir para Pedidos
          </button>
        </div>
      ) : null}

      {secao === "config" ? (
        <>
          {blocoPausa}
          {blocoMinimo}
          <p className="text-xs text-muted">
            Nome, foto e endereço da loja ficam em{" "}
            <button
              type="button"
              onClick={() => setSecao("produtos")}
              className="font-semibold text-mar underline-offset-2 hover:underline"
            >
              Produtos
            </button>
            . Horário em{" "}
            <button
              type="button"
              onClick={() => setSecao("horarios")}
              className="font-semibold text-mar underline-offset-2 hover:underline"
            >
              Horários
            </button>
            .
          </p>
        </>
      ) : null}
      </div>
    </ShellLoja>
  );
}
