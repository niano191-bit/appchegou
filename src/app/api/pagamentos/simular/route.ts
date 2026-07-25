import { NextResponse } from "next/server";
import { exigirSessao } from "@/lib/auth-servidor";
import {
  buscarPedidoLocal,
  marcarPedidoPagoLocal,
  usandoModoDemo,
} from "@/lib/local-db";

/** Simula pagamento Pix ou cartão (só para desenvolvimento / teste) */
export async function POST(request: Request) {
  let corpo: { pedidoId?: string; forma?: "pix" | "cartao" };

  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  if (!corpo.pedidoId || !corpo.forma) {
    return NextResponse.json(
      { erro: "Informe pedidoId e forma (pix ou cartao)." },
      { status: 400 },
    );
  }

  try {
    const sessao = await exigirSessao("cliente");

    if (!usandoModoDemo()) {
      return NextResponse.json(
        {
          erro: "No Supabase, use o Checkout do Mercado Pago. Simulação só no modo demo.",
        },
        { status: 400 },
      );
    }

    const pedido = await buscarPedidoLocal(corpo.pedidoId);
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
      return NextResponse.json({ modo: "demo", pedido, ja_pago: true });
    }

    const atualizado = await marcarPedidoPagoLocal(
      corpo.pedidoId,
      corpo.forma,
      `simulado-${corpo.forma}-${Date.now()}`,
    );

    return NextResponse.json({ modo: "demo", pedido: atualizado });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao simular pagamento.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
