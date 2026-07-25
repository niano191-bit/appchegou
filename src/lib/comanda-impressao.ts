import { jsPDF } from "jspdf";
import { MARCA } from "@/lib/marca";
import {
  pedidoEhDinheiroPendente,
  textoCobrancaDinheiro,
} from "@/lib/pagamento-pedido";
import type { PedidoComItens } from "@/lib/pedidos";
import { codigoPedido, rotuloPedido } from "@/lib/pedido-rotulo";
import { formatarReais } from "@/types/database";

function formatarHora(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      timeZone: "America/Bahia",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/** Gera e baixa a comanda em PDF (sem precisar de impressora) */
export function baixarComandaPdf(pedido: PedidoComItens) {
  if (typeof window === "undefined") return;

  const rotulo = rotuloPedido(pedido);
  const arquivo = codigoPedido(pedido);
  const largura = 80; // mm
  const margem = 4;
  const maxW = largura - margem * 2;
  const itens = pedido.itens_pedido;
  const alturaEstimada = Math.max(
    120,
    70 + itens.length * 8 + (pedido.observacao ? 16 : 0),
  );

  const doc = new jsPDF({
    unit: "mm",
    format: [largura, alturaEstimada],
    orientation: "portrait",
  });

  let y = 8;

  const centro = (texto: string, size: number, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.text(texto, largura / 2, y, { align: "center", maxWidth: maxW });
    y += size * 0.45 + 1.5;
  };

  const linha = (texto: string, size = 9, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    const partes = doc.splitTextToSize(texto, maxW) as string[];
    for (const p of partes) {
      doc.text(p, margem, y);
      y += size * 0.4 + 1.2;
    }
  };

  const tracejado = () => {
    y += 1;
    doc.setDrawColor(0);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(margem, y, largura - margem, y);
    doc.setLineDashPattern([], 0);
    y += 4;
  };

  centro(MARCA.nome, 11, true);
  centro("Comanda da cozinha", 8);
  y += 1;
  centro(rotulo, 16, true);
  centro(formatarHora(pedido.criado_em), 8);
  tracejado();

  if (pedido.cliente_nome) {
    linha(`Cliente: ${pedido.cliente_nome}`, 9, true);
  }
  if (pedido.cliente_telefone) {
    linha(`Tel: ${pedido.cliente_telefone}`, 9);
  }
  const bairro = pedido.bairro_entrega ? ` (${pedido.bairro_entrega})` : "";
  linha(`Entrega: ${pedido.endereco_entrega}${bairro}`, 9);
  tracejado();

  for (const item of itens) {
    const valor = formatarReais(
      Number(item.preco_unitario) * item.quantidade,
    );
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`${item.quantidade}x`, margem, y);
    doc.setFont("helvetica", "normal");
    const nomePartes = doc.splitTextToSize(item.nome, maxW - 22) as string[];
    doc.text(nomePartes[0] ?? "", margem + 8, y);
    doc.text(valor, largura - margem, y, { align: "right" });
    y += 5;
    for (let i = 1; i < nomePartes.length; i++) {
      doc.text(nomePartes[i]!, margem + 8, y);
      y += 4.5;
    }
    if (item.observacao?.trim()) {
      linha(`  > ${item.observacao.trim()}`, 8);
    }
  }

  if (pedido.observacao?.trim()) {
    y += 1;
    linha(`OBS: ${pedido.observacao.trim()}`, 11, true);
  }

  tracejado();
  linha(`Itens: ${formatarReais(Number(pedido.total))}`, 9);
  linha(`Entrega: ${formatarReais(Number(pedido.taxa_entrega))}`, 9);
  const total = Number(pedido.total) + Number(pedido.taxa_entrega);
  linha(`TOTAL ${formatarReais(total)}`, 12, true);
  if (pedidoEhDinheiroPendente(pedido)) {
    y += 1;
    linha(textoCobrancaDinheiro(pedido), 10, true);
  }
  y += 3;
  centro(MARCA.tagline, 7);

  doc.save(`comanda-${arquivo}.pdf`);
}

/** Alias usado pelo painel — hoje baixa PDF */
export function imprimirComanda(pedido: PedidoComItens) {
  baixarComandaPdf(pedido);
}
