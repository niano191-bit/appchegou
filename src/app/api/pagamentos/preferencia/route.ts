import { NextResponse } from "next/server";
import { exigirSessao } from "@/lib/auth-servidor";
import {
  buscarPedidoLocal,
  lerConfiguracaoLocal,
  usandoModoDemo,
} from "@/lib/local-db";
import {
  criarPreferenciaCheckout,
  isMercadoPagoConfigured,
} from "@/lib/mercadopago";
import { buscarPedido, lerConfiguracao } from "@/lib/pedidos-servidor";

/** Cria link de pagamento no Mercado Pago (sandbox) */
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

    if (!config.pagamento_mercadopago) {
      return NextResponse.json(
        { erro: "Mercado Pago está desligado nas configurações do dono." },
        { status: 400 },
      );
    }

    const pedido = usandoModoDemo()
      ? await buscarPedidoLocal(corpo.pedidoId)
      : await buscarPedido(corpo.pedidoId);

    if (!pedido) {
      return NextResponse.json(
        { erro: "Pedido não encontrado." },
        { status: 404 },
      );
    }

    if (pedido.cliente_id !== sessao.id) {
      return NextResponse.json(
        { erro: "Este pedido não é seu." },
        { status: 403 },
      );
    }

    if (pedido.status_pagamento === "pago") {
      return NextResponse.json({
        ja_pago: true,
        destino: `/cliente/pedido/${pedido.id}`,
      });
    }

    if (!isMercadoPagoConfigured()) {
      return NextResponse.json({
        simular: true,
        mensagem:
          "Mercado Pago sem chave no servidor. Use o botão de teste Mercado Pago.",
      });
    }

    const pref = await criarPreferenciaCheckout({
      pedidoId: pedido.id,
      taxaEntrega: Number(pedido.taxa_entrega),
      gorjeta: Number(pedido.gorjeta ?? 0),
      itens: pedido.itens_pedido.map((item) => ({
        title: item.nome,
        quantity: item.quantidade,
        unit_price: Number(item.preco_unitario),
      })),
    });

    return NextResponse.json({
      checkoutUrl: pref.checkoutUrl,
      preferenceId: pref.preferenceId,
    });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao criar preferência.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
