import { NextResponse } from "next/server";
import { exigirSessao } from "@/lib/auth-servidor";
import { buscarPedidoLocal, usandoModoDemo } from "@/lib/local-db";
import {
  criarPreferenciaCheckout,
  isMercadoPagoConfigured,
} from "@/lib/mercadopago";
import { buscarPedido } from "@/lib/pedidos-servidor";

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

    if (!isMercadoPagoConfigured()) {
      return NextResponse.json(
        {
          erro: "Mercado Pago não configurado. Use a simulação de teste ou preencha as chaves no .env.local.",
          simular: true,
        },
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

    const pref = await criarPreferenciaCheckout({
      pedidoId: pedido.id,
      taxaEntrega: Number(pedido.taxa_entrega),
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
