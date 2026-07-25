import { NextResponse } from "next/server";
import { exigirSessao } from "@/lib/auth-servidor";
import {
  buscarPedidoLocal,
  lerConfiguracaoLocal,
  usandoModoDemo,
} from "@/lib/local-db";
import { criarCheckoutLucPaguei, isLucPagueiConfigured } from "@/lib/lucpaguei";
import { buscarPedido, lerConfiguracao } from "@/lib/pedidos-servidor";

/** Cria cobrança LucPaguei (link ou Pix copia-e-cola) */
export async function POST(request: Request) {
  let corpo: { pedidoId?: string };

  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  if (!corpo.pedidoId) {
    return NextResponse.json(
      { erro: "Informe o pedidoId." },
      { status: 400 },
    );
  }

  try {
    const sessao = await exigirSessao("cliente");
    const config = usandoModoDemo()
      ? await lerConfiguracaoLocal()
      : await lerConfiguracao();

    if (!config.pagamento_lucpaguei) {
      return NextResponse.json(
        { erro: "LucPaguei está desligado nas configurações do dono." },
        { status: 400 },
      );
    }

    const pedido = usandoModoDemo()
      ? await buscarPedidoLocal(corpo.pedidoId)
      : await buscarPedido(corpo.pedidoId);

    if (!pedido || pedido.cliente_id !== sessao.id) {
      return NextResponse.json(
        { erro: "Pedido não encontrado." },
        { status: 404 },
      );
    }

    if (pedido.status_pagamento === "pago") {
      return NextResponse.json({
        ja_pago: true,
        destino: `/cliente/pedido/${pedido.id}`,
      });
    }

    if (!isLucPagueiConfigured()) {
      return NextResponse.json({
        simular: true,
        mensagem:
          "LucPaguei incompleto no servidor. Confira CLIENT_ID, SECRET_KEY e API_URL.",
      });
    }

    const total =
      Number(pedido.total) +
      Number(pedido.taxa_entrega) +
      Number(pedido.gorjeta ?? 0);
    const cobranca = await criarCheckoutLucPaguei({
      pedidoId: pedido.id,
      valorTotal: total,
      descricao: `Pedido ${pedido.restaurante_nome ?? ""} ${
        pedido.numero_dia != null ? `#${pedido.numero_dia}` : `#${pedido.id.slice(0, 8)}`
      }`.trim(),
      clienteNome: sessao.nome,
      clienteEmail: sessao.email ?? undefined,
    });

    return NextResponse.json({
      gateway: "lucpaguei",
      checkoutUrl: cobranca.checkoutUrl,
      copiaECola: cobranca.copiaECola ?? cobranca.qrCode,
      qrCodeBase64: cobranca.qrCodeBase64,
      transactionId: cobranca.transactionId,
    });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao abrir LucPaguei.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
