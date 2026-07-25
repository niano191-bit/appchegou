"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AvisoFila } from "@/components/aviso-fila";
import { ContatoPedido } from "@/components/contato-pedido";
import { LinksNavegacao } from "@/components/links-navegacao";
import { LinksWhatsAppPedido } from "@/components/links-whatsapp-pedido";
import { SeloAoVivo } from "@/components/selo-ao-vivo";
import { useTempoRealPedidos } from "@/hooks/use-tempo-real-pedidos";
import {
  pedidoEhDinheiroPendente,
  textoCobrancaDinheiro,
} from "@/lib/pagamento-pedido";
import {
  atualizarStatusPedido,
  listarCorridas,
  type CorridaComItens,
  type GanhosEntregadorDia,
} from "@/lib/pedidos";
import { rotuloPedido } from "@/lib/pedido-rotulo";
import { obterSessaoCliente } from "@/lib/sessao-cliente";
import { formatarReais, STATUS_PEDIDO_LABEL } from "@/types/database";

export function PainelEntregador() {
  const entregadorIdRef = useRef<string | null>(null);
  const [corridas, setCorridas] = useState<CorridaComItens[]>([]);
  const [ganhos, setGanhos] = useState<GanhosEntregadorDia>({
    entregas: 0,
    valor: 0,
  });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [acaoId, setAcaoId] = useState<string | null>(null);

  const carregar = useCallback(async (silencioso = false) => {
    try {
      if (!silencioso) setErro(null);
      if (!entregadorIdRef.current) {
        const user = await obterSessaoCliente();
        if (!user) throw new Error("Faça login para continuar.");
        entregadorIdRef.current = user.id;
      }
      const dados = await listarCorridas();
      setCorridas(dados.corridas);
      setGanhos(dados.ganhos);
      setErro(null);
    } catch (e) {
      setErro(
        e instanceof Error
          ? e.message
          : "Não foi possível carregar as corridas.",
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

  async function acao(
    pedidoId: string,
    status: "a_caminho" | "entregue",
  ) {
    if (!entregadorIdRef.current) return;
    setAcaoId(pedidoId);
    setErro(null);

    try {
      await atualizarStatusPedido(pedidoId, status, {
        entregadorId: entregadorIdRef.current,
      });
      await carregar(true);
    } catch (e) {
      setErro(
        e instanceof Error
          ? e.message
          : "Não foi possível atualizar a corrida.",
      );
    } finally {
      setAcaoId(null);
    }
  }

  const contarProntas = useCallback(async () => {
    const todas = await listarCorridas();
    return todas.corridas.filter((c) => c.status === "pronto").length;
  }, []);

  if (carregando) {
    return (
      <p className="rounded-2xl bg-white/70 px-5 py-4 text-sm text-muted">
        Carregando corridas…
      </p>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <SeloAoVivo />
      <AvisoFila
        chave="aviso-fila-entregador"
        contar={contarProntas}
        mensagem={(qtd) =>
          qtd === 1
            ? "Nova corrida disponível!"
            : `${qtd} novas corridas disponíveis!`
        }
      />

      <div className="rounded-2xl border border-mar/30 bg-mar-suave/50 px-5 py-4">
        <p className="text-xs font-medium tracking-wide text-muted uppercase">
          Ganhos de hoje
        </p>
        <p className="mt-1 text-2xl font-semibold text-mar">
          {formatarReais(ganhos.valor)}
        </p>
        <p className="mt-1 text-sm text-muted">
          {ganhos.entregas === 0
            ? "Nenhuma entrega concluída ainda hoje."
            : ganhos.entregas === 1
              ? "1 entrega concluída (taxas + gorjetas)"
              : `${ganhos.entregas} entregas concluídas (taxas + gorjetas)`}
        </p>
      </div>

      {erro ? (
        <div className="rounded-2xl border border-dende/30 bg-dende-suave px-5 py-4 text-sm text-muted">
          {erro}
        </div>
      ) : null}

      {corridas.length === 0 && !erro ? (
        <div className="rounded-2xl border border-dashed border-[#C4A882] bg-white/60 px-5 py-10 text-center text-sm text-muted">
          Nenhuma corrida pronta no momento.
          <br />
          Peça no app do cliente e marque como pronto no restaurante.
        </div>
      ) : null}

      <ul className="flex flex-col gap-4">
        {corridas.map((corrida) => {
          const ocupado = acaoId === corrida.id;
          const taxa = Number(corrida.taxa_entrega);
          const gorjeta = Number(corrida.gorjeta ?? 0);
          const ganho = taxa + gorjeta;

          return (
            <li
              key={corrida.id}
              className="rounded-2xl border border-linha bg-white px-5 py-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium tracking-wide text-muted uppercase">
                    {corrida.restaurante_nome} · {rotuloPedido(corrida)}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    Seu ganho: {formatarReais(ganho)}
                  </p>
                  {gorjeta > 0 ? (
                    <p className="mt-0.5 text-xs text-mar">
                      Inclui gorjeta de {formatarReais(gorjeta)}
                    </p>
                  ) : null}
                  {pedidoEhDinheiroPendente(corrida) ? (
                    <p className="mt-1 text-xs font-semibold text-dende">
                      {textoCobrancaDinheiro(corrida)}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      corrida.status === "pronto"
                        ? "bg-dende-suave text-dende"
                        : "bg-[#E3F2FD] text-[#1565C0]"
                    }`}
                  >
                    {STATUS_PEDIDO_LABEL[corrida.status]}
                  </span>
                  {corrida.status === "pronto" ? (
                    <span className="text-xs font-medium text-mar">
                      {corrida.entregador_id
                        ? "Atribuída a você"
                        : "Disponível"}
                    </span>
                  ) : null}
                </div>
              </div>

              <ContatoPedido
                nome={corrida.cliente_nome}
                telefone={corrida.cliente_telefone}
                enderecoLoja={corrida.restaurante_endereco}
                mostrarLoja
              />
              <LinksWhatsAppPedido pedido={corrida} />

              {corrida.restaurante_endereco ? (
                <LinksNavegacao
                  endereco={corrida.restaurante_endereco}
                  rotulo="Ir até a loja"
                />
              ) : null}

              <p className="mt-3 text-sm font-medium text-foreground">
                Entregar em:
              </p>
              <p className="text-sm text-muted">
                {corrida.endereco_entrega}
                {corrida.bairro_entrega ? ` (${corrida.bairro_entrega})` : ""}
              </p>
              <LinksNavegacao
                endereco={[
                  corrida.endereco_entrega,
                  corrida.bairro_entrega,
                ]
                  .filter(Boolean)
                  .join(" — ")}
                rotulo="Levar ao cliente"
              />

              <ul className="mt-3 border-t border-[#F0E6D8] pt-3 text-sm text-foreground">
                {corrida.itens_pedido.map((item) => (
                  <li key={item.id} className="py-0.5">
                    {item.quantidade}× {item.nome}
                    {item.observacao?.trim() ? (
                      <span className="mt-0.5 block text-xs text-dende">
                        Obs.: {item.observacao.trim()}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                {corrida.status === "pronto" ? (
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => void acao(corrida.id, "a_caminho")}
                    className="flex-1 rounded-xl bg-dende px-4 py-3 text-sm font-semibold text-white transition hover:bg-dende-escuro disabled:opacity-60"
                  >
                    {ocupado ? "Salvando…" : "Aceitar corrida"}
                  </button>
                ) : null}

                {corrida.status === "a_caminho" ? (
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => void acao(corrida.id, "entregue")}
                    className="flex-1 rounded-xl bg-[#2F6B3A] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#245530] disabled:opacity-60"
                  >
                    {ocupado
                      ? "Salvando…"
                      : pedidoEhDinheiroPendente(corrida)
                        ? "Recebi o dinheiro e entreguei"
                        : "Confirmar entrega"}
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
