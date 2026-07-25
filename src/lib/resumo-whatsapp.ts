import { linkWhatsApp } from "@/lib/contato";
import { MARCA } from "@/lib/marca";
import type { PedidoComItens } from "@/lib/pedidos";
import { formatarReais, STATUS_PEDIDO_LABEL } from "@/types/database";

type PedidoResumo = Pick<
  PedidoComItens,
  | "id"
  | "status"
  | "total"
  | "taxa_entrega"
  | "endereco_entrega"
  | "bairro_entrega"
  | "observacao"
  | "itens_pedido"
  | "cliente_nome"
  | "cliente_telefone"
  | "restaurante_endereco"
> & {
  restaurante_nome?: string | null;
};

/** Texto pronto para colar / enviar no WhatsApp */
export function textoResumoPedidoWhatsApp(pedido: PedidoResumo) {
  const codigo = pedido.id.slice(0, 8).toUpperCase();
  const total = Number(pedido.total) + Number(pedido.taxa_entrega);
  const itens = pedido.itens_pedido
    .map((i) => `• ${i.quantidade}x ${i.nome}`)
    .join("\n");

  const linhas = [
    `*${MARCA.nome}*`,
    `Pedido #${codigo}`,
    `Status: ${STATUS_PEDIDO_LABEL[pedido.status]}`,
    "",
    pedido.cliente_nome ? `Cliente: ${pedido.cliente_nome}` : null,
    pedido.cliente_telefone ? `Tel: ${pedido.cliente_telefone}` : null,
    pedido.restaurante_nome ? `Loja: ${pedido.restaurante_nome}` : null,
    pedido.restaurante_endereco
      ? `Retirada: ${pedido.restaurante_endereco}`
      : null,
    `Entrega: ${pedido.endereco_entrega}${
      pedido.bairro_entrega ? ` (${pedido.bairro_entrega})` : ""
    }`,
    "",
    "*Itens*",
    itens,
    pedido.observacao?.trim() ? `\n*Obs:* ${pedido.observacao.trim()}` : null,
    "",
    `Itens: ${formatarReais(Number(pedido.total))}`,
    `Entrega: ${formatarReais(Number(pedido.taxa_entrega))}`,
    `*Total: ${formatarReais(total)}*`,
  ];

  return linhas.filter((l) => l !== null).join("\n");
}

/** Abre WhatsApp do cliente com a comanda preenchida */
export function linkWhatsAppClienteComanda(pedido: PedidoResumo) {
  return linkWhatsApp(
    pedido.cliente_telefone,
    textoResumoPedidoWhatsApp(pedido),
  );
}

/** Abre WhatsApp para escolher contato (compartilhar comanda) */
export function linkWhatsAppCompartilharComanda(pedido: PedidoResumo) {
  const texto = textoResumoPedidoWhatsApp(pedido);
  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}
