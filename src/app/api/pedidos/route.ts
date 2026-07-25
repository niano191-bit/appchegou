import { NextResponse } from "next/server";
import { exigirSessao, lerSessao } from "@/lib/auth-servidor";
import { TAXA_ENTREGA_PADRAO } from "@/lib/constantes";
import {
  criarPedidoLocal,
  lerConfiguracaoLocal,
  listarPedidosDoClienteLocal,
  listarPedidosLocal,
  usandoModoDemo,
  type ItemNovoPedido,
} from "@/lib/local-db";
import {
  criarPedido,
  lerConfiguracao,
  listarPedidosDoCliente,
  listarPedidosDoRestaurante,
} from "@/lib/pedidos-servidor";
import type { StatusPedido } from "@/types/database";

/** Lista pedidos do cliente logado ou do restaurante */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessao = await lerSessao();

  // Cliente: só os próprios pedidos
  if (searchParams.get("meus") === "1" || sessao?.papel === "cliente") {
    try {
      const user = await exigirSessao("cliente");
      if (usandoModoDemo()) {
        const pedidos = await listarPedidosDoClienteLocal(user.id);
        return NextResponse.json({ modo: "demo", pedidos });
      }
      const pedidos = await listarPedidosDoCliente(user.id);
      return NextResponse.json({ modo: "supabase", pedidos });
    } catch (e) {
      const mensagem =
        e instanceof Error ? e.message : "Erro ao listar seus pedidos.";
      const status =
        mensagem.includes("login") || mensagem.includes("área") ? 401 : 500;
      return NextResponse.json({ erro: mensagem }, { status });
    }
  }

  const statusParam = searchParams.get("status") ?? "novo,aceito";
  const ordem =
    searchParams.get("ordem") === "desc" ? ("desc" as const) : ("asc" as const);

  let restauranteId = searchParams.get("restauranteId");

  if (sessao?.papel === "restaurante") {
    if (!sessao.restaurante_id) {
      return NextResponse.json(
        { erro: "Sua conta não está ligada a um restaurante." },
        { status: 400 },
      );
    }
    restauranteId = sessao.restaurante_id;
  }

  if (!restauranteId) {
    return NextResponse.json(
      { erro: "Informe o restauranteId." },
      { status: 400 },
    );
  }

  const status = statusParam.split(",") as StatusPedido[];

  try {
    if (usandoModoDemo()) {
      const pedidos = await listarPedidosLocal(restauranteId, status, ordem);
      return NextResponse.json({ modo: "demo", pedidos });
    }

    const pedidos = await listarPedidosDoRestaurante(
      restauranteId,
      status,
      ordem,
    );
    return NextResponse.json({ modo: "supabase", pedidos });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao listar pedidos.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}

/** Cria pedido com status novo */
export async function POST(request: Request) {
  let corpo: {
    restauranteId?: string;
    endereco_entrega?: string;
    observacao?: string;
    bairroId?: string;
    cupomCodigo?: string;
    gorjeta?: number;
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
    const sessao = await exigirSessao("cliente");
    const taxaPadrao = usandoModoDemo()
      ? (await lerConfiguracaoLocal()).taxa_entrega
      : (await lerConfiguracao()).taxa_entrega || TAXA_ENTREGA_PADRAO;

    const entrada = {
      clienteId: sessao.id,
      restauranteId: corpo.restauranteId,
      endereco_entrega: corpo.endereco_entrega.trim(),
      observacao: corpo.observacao,
      bairroId: corpo.bairroId,
      taxa_entrega: Number(taxaPadrao),
      cupomCodigo: corpo.cupomCodigo,
      gorjeta: corpo.gorjeta != null ? Number(corpo.gorjeta) : 0,
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
    const status =
      mensagem.includes("fechados") ||
      mensagem.includes("pausou") ||
      mensagem.includes("disponível") ||
      mensagem.includes("bairro") ||
      mensagem.includes("Bairro") ||
      mensagem.includes("Cupom") ||
      mensagem.includes("cupom") ||
      mensagem.includes("mínimo") ||
      mensagem.includes("minimo") ||
      mensagem.includes("Gorjeta") ||
      mensagem.includes("gorjeta")
        ? 400
        : 500;
    return NextResponse.json({ erro: mensagem }, { status });
  }
}
