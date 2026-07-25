import { NextResponse } from "next/server";
import { exigirSessao } from "@/lib/auth-servidor";
import {
  buscarPedidoLocal,
  marcarPedidoPagoLocal,
  usandoModoDemo,
} from "@/lib/local-db";

/**
 * Confirma pagamento após retorno do Mercado Pago (sucesso).
 * Em produção o ideal é também validar via webhook oficial.
 */
export async function POST(request: Request) {
  let corpo: {
    pedidoId?: string;
    paymentId?: string;
    forma?: "pix" | "cartao";
  };

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

    if (!usandoModoDemo()) {
      // Sem banco local: só confirma quando houver integração completa
      return NextResponse.json({
        ok: true,
        aviso: "Confirme o status no painel do Mercado Pago (teste).",
      });
    }

    const pedido = await buscarPedidoLocal(corpo.pedidoId);
    if (!pedido || pedido.cliente_id !== sessao.id) {
      return NextResponse.json(
        { erro: "Pedido não encontrado." },
        { status: 404 },
      );
    }

    const atualizado = await marcarPedidoPagoLocal(
      corpo.pedidoId,
      corpo.forma ?? "pix",
      corpo.paymentId ?? null,
    );

    return NextResponse.json({ pedido: atualizado });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao confirmar pagamento.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
