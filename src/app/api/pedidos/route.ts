import { NextResponse } from "next/server";
import { DEMO } from "@/lib/demo-ids";
import { TAXA_ENTREGA_PADRAO } from "@/lib/constantes";
import {
  criarPedidoLocal,
  lerConfiguracaoLocal,
  listarPedidosLocal,
  usandoModoDemo,
  type ItemNovoPedido,
} from "@/lib/local-db";
import {
  criarPedido,
  listarPedidosDoRestaurante,
} from "@/lib/pedidos-servidor";
import type { StatusPedido } from "@/types/database";

/** Lista pedidos (modo demo local ou Supabase, se configurado) */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const restauranteId = searchParams.get("restauranteId");
  const statusParam = searchParams.get("status") ?? "novo,aceito";

  if (!restauranteId) {
    return NextResponse.json(
      { erro: "Informe o restauranteId." },
      { status: 400 },
    );
  }

  const status = statusParam.split(",") as StatusPedido[];

  try {
    if (usandoModoDemo()) {
      const pedidos = await listarPedidosLocal(restauranteId, status);
      return NextResponse.json({ modo: "demo", pedidos });
    }

    const pedidos = await listarPedidosDoRestaurante(restauranteId, status);
    return NextResponse.json({ modo: "supabase", pedidos });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao listar pedidos.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}

/** Cria pedido com status novo (Cliente Teste até ter login) */
export async function POST(request: Request) {
  let corpo: {
    restauranteId?: string;
    endereco_entrega?: string;
    observacao?: string;
    itens?: ItemNovoPedido[];
  };

  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json(
      { erro: "Dados inválidos. Envie um JSON com o pedido." },
      { status: 400 },
    );
  }

  if (!corpo.restauranteId || !corpo.endereco_entrega?.trim()) {
    return NextResponse.json(
      { erro: "Informe o restaurante e o endereço de entrega." },
      { status: 400 },
    );
  }

  if (!corpo.itens?.length) {
    return NextResponse.json(
      { erro: "Adicione pelo menos um item ao pedido." },
      { status: 400 },
    );
  }

  try {
    const taxa = usandoModoDemo()
      ? (await lerConfiguracaoLocal()).taxa_entrega
      : TAXA_ENTREGA_PADRAO;

    const entrada = {
      clienteId: DEMO.clienteId,
      restauranteId: corpo.restauranteId,
      endereco_entrega: corpo.endereco_entrega.trim(),
      observacao: corpo.observacao,
      taxa_entrega: Number(taxa),
      itens: corpo.itens,
    };

    if (usandoModoDemo()) {
      const pedido = await criarPedidoLocal(entrada);
      return NextResponse.json({ modo: "demo", pedido }, { status: 201 });
    }

    const pedido = await criarPedido(entrada);
    return NextResponse.json({ modo: "supabase", pedido }, { status: 201 });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao criar pedido.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
