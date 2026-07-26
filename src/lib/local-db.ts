import { promises as fs } from "fs";
import path from "path";
import { DEMO } from "@/lib/demo-ids";
import { SENHA_DEMO } from "@/lib/auth";
import { gerarHashSenha } from "@/lib/senha";
import type {
  BairroEntrega,
  BannerVitrine,
  CategoriaVitrine,
  Configuracao,
  Cupom,
  DisponibilidadeEntregador,
  ItemCardapio,
  ItemPedido,
  Pedido,
  Restaurante,
  StatusPedido,
  TipoCupom,
  TomBanner,
  Usuario,
} from "@/types/database";
import { ordemDisponibilidade } from "@/types/database";
import { BAIRROS_SALVADOR_SEED } from "@/lib/bairros-seed";
import { TAXA_ENTREGA_PADRAO } from "@/lib/constantes";
import {
  calcularDescontoCupom,
  normalizarCodigoCupom,
} from "@/lib/cupom";
import { montarFechamentoDia } from "@/lib/fechamento";
import {
  bannersPadrao,
  categoriasPadrao,
} from "@/lib/vitrine-defaults";
import {
  dataPedidoSalvador,
  horaParaMinutos,
  inicioFimDoDiaSalvador,
  mensagemBloqueioPedido,
  statusOperacaoLoja,
} from "@/lib/horario";
import { pedidoVisivelNaOperacao } from "@/lib/pagamento-pedido";
import { exigirPedidoMinimo } from "@/lib/pedido-minimo";

export type PedidoLocal = Pedido & { itens_pedido: ItemPedido[] };

type BancoLocal = {
  restaurantes: Restaurante[];
  usuarios: Usuario[];
  itens_cardapio: ItemCardapio[];
  pedidos: PedidoLocal[];
  configuracao: Configuracao;
  bairros: BairroEntrega[];
  cupons: Cupom[];
  banners_vitrine: BannerVitrine[];
  categorias_vitrine: CategoriaVitrine[];
};

function bairrosIniciais(criado: string): BairroEntrega[] {
  return BAIRROS_SALVADOR_SEED.map((b, i) => ({
    id: `b${String(i + 1).padStart(7, "0")}-0000-0000-0000-000000000001`,
    nome: b.nome,
    taxa: b.taxa,
    ativo: true,
    ordem: b.ordem,
    criado_em: criado,
  }));
}

export function configuracaoPadrao(): Configuracao {
  return {
    taxa_entrega: TAXA_ENTREGA_PADRAO,
    horario_abertura: "10:00",
    horario_fechamento: "22:00",
    pagamento_mercadopago: true,
    pagamento_lucpaguei: true,
    pagamento_dinheiro: true,
  };
}

/** Garante campos novos em configs antigas salvas no disco */
export function normalizarConfiguracao(
  cfg: Partial<Configuracao> | null | undefined,
): Configuracao {
  const base = configuracaoPadrao();
  return {
    taxa_entrega: Number(cfg?.taxa_entrega ?? base.taxa_entrega),
    horario_abertura: cfg?.horario_abertura ?? base.horario_abertura,
    horario_fechamento: cfg?.horario_fechamento ?? base.horario_fechamento,
    pagamento_mercadopago: cfg?.pagamento_mercadopago ?? true,
    pagamento_lucpaguei: cfg?.pagamento_lucpaguei ?? true,
    pagamento_dinheiro: cfg?.pagamento_dinheiro ?? true,
  };
}

/** Na Vercel o disco é temporário (/tmp); no PC usamos a pasta .data */
const arquivoDb = process.env.VERCEL
  ? path.join("/tmp", "chegou-db.json")
  : path.join(process.cwd(), ".data", "db.json");

function agora() {
  return new Date().toISOString();
}

/** Dados de teste iguais aos do SQL da Fase 1 */
function dadosIniciais(): BancoLocal {
  const criado = agora();

  return {
    configuracao: configuracaoPadrao(),
    bairros: bairrosIniciais(criado),
    banners_vitrine: bannersPadrao(criado),
    categorias_vitrine: categoriasPadrao(criado),
    cupons: [
      {
        id: "c1000000-0000-0000-0000-000000000001",
        codigo: "DEMO10",
        tipo: "percent",
        valor: 10,
        ativo: true,
        criado_em: criado,
      },
    ],
    restaurantes: [
      {
        id: DEMO.restauranteAcarajeId,
        nome: "Loja Demo Acarajé",
        descricao: "Acarajé e petiscos baianos (teste)",
        endereco: "Pelourinho, Salvador",
        imagem_url: null,
        comissao_percentual: 12,
        ativo: true,
        pausado: false,
        pedido_minimo: 0,
        horario_abertura: null,
        horario_fechamento: null,
        chave_pix: "71999990002",
        criado_em: criado,
      },
      {
        id: DEMO.restauranteMoquecaId,
        nome: "Loja Demo Moqueca",
        descricao: "Moquecas e peixes (teste)",
        endereco: "Rio Vermelho, Salvador",
        imagem_url: null,
        comissao_percentual: 15,
        ativo: true,
        pausado: false,
        pedido_minimo: 0,
        horario_abertura: null,
        horario_fechamento: null,
        chave_pix: null,
        criado_em: criado,
      },
    ],
    usuarios: [
      {
        id: DEMO.clienteId,
        nome: "Cliente Teste",
        email: "cliente.teste@chegou.local",
        telefone: "71999990001",
        papel: "cliente",
        restaurante_id: null,
        senha_hash: null,
        criado_em: criado,
      },
      {
        id: DEMO.usuarioRestauranteAcarajeId,
        nome: "Restaurante Teste Acarajé",
        email: "loja.acaraje@chegou.local",
        telefone: "71999990002",
        papel: "restaurante",
        restaurante_id: DEMO.restauranteAcarajeId,
        senha_hash: null,
        criado_em: criado,
      },
      {
        id: DEMO.entregadorId,
        nome: "Entregador Teste",
        email: "entregador.teste@chegou.local",
        telefone: "71999990004",
        papel: "entregador",
        restaurante_id: null,
        disponibilidade: "livre",
        senha_hash: null,
        criado_em: criado,
      },
      {
        id: DEMO.donoId,
        nome: "Dono Teste",
        email: "dono.teste@chegou.local",
        telefone: "71999990005",
        papel: "dono",
        restaurante_id: null,
        senha_hash: null,
        criado_em: criado,
      },
    ],
    itens_cardapio: [
      {
        id: "a1000000-0000-0000-0000-000000000001",
        restaurante_id: DEMO.restauranteAcarajeId,
        nome: "Acarajé Tradicional",
        descricao: "Vatapá, caruru e camarão",
        preco: 18.9,
        disponivel: true,
        imagem_url: null,
        criado_em: criado,
      },
      {
        id: "a1000000-0000-0000-0000-000000000002",
        restaurante_id: DEMO.restauranteAcarajeId,
        nome: "Abará",
        descricao: "Em folha de bananeira",
        preco: 16.5,
        disponivel: true,
        imagem_url: null,
        criado_em: criado,
      },
      {
        id: "a1000000-0000-0000-0000-000000000003",
        restaurante_id: DEMO.restauranteAcarajeId,
        nome: "Coca-Cola Lata",
        descricao: "350 ml",
        preco: 6,
        disponivel: true,
        imagem_url: null,
        criado_em: criado,
      },
      {
        id: "b1000000-0000-0000-0000-000000000001",
        restaurante_id: DEMO.restauranteMoquecaId,
        nome: "Moqueca de Peixe",
        descricao: "Serve 2 pessoas",
        preco: 79.9,
        disponivel: true,
        imagem_url: null,
        criado_em: criado,
      },
      {
        id: "b1000000-0000-0000-0000-000000000002",
        restaurante_id: DEMO.restauranteMoquecaId,
        nome: "Bobó de Camarão",
        descricao: "Porção individual",
        preco: 64,
        disponivel: true,
        imagem_url: null,
        criado_em: criado,
      },
      {
        id: "b1000000-0000-0000-0000-000000000003",
        restaurante_id: DEMO.restauranteMoquecaId,
        nome: "Água Mineral",
        descricao: "500 ml",
        preco: 4,
        disponivel: true,
        imagem_url: null,
        criado_em: criado,
      },
    ],
    pedidos: [
      {
        id: "f1000000-0000-0000-0000-000000000001",
        cliente_id: DEMO.clienteId,
        restaurante_id: DEMO.restauranteAcarajeId,
        entregador_id: null,
        status: "novo",
        status_pagamento: "pago",
        forma_pagamento: "pix",
        mp_payment_id: null,
        total: 43.8,
        taxa_entrega: 8,
        endereco_entrega: "Rua Teste, 100 — Barra, Salvador",
        bairro_entrega: "Barra",
        observacao: "Pedido de teste — sem cebola",
        cancelado_por: null,
        motivo_cancelamento: null,
        tempo_estimado_minutos: null,
        previsao_entrega_em: null,
        numero_dia: 1,
        data_pedido: null,
        troco_para: null,
        desconto: 0,
        cupom_codigo: null,
        criado_em: criado,
        atualizado_em: criado,
        itens_pedido: [
          {
            id: "i1000000-0000-0000-0000-000000000001",
            pedido_id: "f1000000-0000-0000-0000-000000000001",
            item_cardapio_id: "a1000000-0000-0000-0000-000000000001",
            nome: "Acarajé Tradicional",
            preco_unitario: 18.9,
            quantidade: 1,
          },
          {
            id: "i1000000-0000-0000-0000-000000000002",
            pedido_id: "f1000000-0000-0000-0000-000000000001",
            item_cardapio_id: "a1000000-0000-0000-0000-000000000002",
            nome: "Abará",
            preco_unitario: 16.5,
            quantidade: 1,
          },
          {
            id: "i1000000-0000-0000-0000-000000000003",
            pedido_id: "f1000000-0000-0000-0000-000000000001",
            item_cardapio_id: "a1000000-0000-0000-0000-000000000003",
            nome: "Coca-Cola Lata",
            preco_unitario: 6,
            quantidade: 1,
          },
        ],
      },
    ],
  };
}

async function garantirArquivo() {
  await fs.mkdir(path.dirname(arquivoDb), { recursive: true });
  try {
    await fs.access(arquivoDb);
  } catch {
    await fs.writeFile(
      arquivoDb,
      JSON.stringify(dadosIniciais(), null, 2),
      "utf8",
    );
  }
}

export async function lerBancoLocal(): Promise<BancoLocal> {
  await garantirArquivo();
  const bruto = await fs.readFile(arquivoDb, "utf8");
  const banco = JSON.parse(bruto) as BancoLocal;

  let mudou = false;

  // Bancos antigos sem configuração ganham o padrão automaticamente
  if (!banco.configuracao) {
    banco.configuracao = configuracaoPadrao();
    mudou = true;
  } else {
    const normalizada = normalizarConfiguracao(banco.configuracao);
    if (
      banco.configuracao.pagamento_mercadopago === undefined ||
      banco.configuracao.pagamento_lucpaguei === undefined
    ) {
      banco.configuracao = normalizada;
      mudou = true;
    }
  }

  for (const u of banco.usuarios) {
    if (u.disponibilidade === undefined) {
      u.disponibilidade = "offline";
      mudou = true;
    }
  }

  for (const loja of banco.restaurantes) {
    if (loja.pausado === undefined) {
      loja.pausado = false;
      mudou = true;
    }
    if (loja.pedido_minimo === undefined) {
      loja.pedido_minimo = 0;
      mudou = true;
    }
    if (loja.horario_abertura === undefined) {
      loja.horario_abertura = null;
      mudou = true;
    }
    if (loja.horario_fechamento === undefined) {
      loja.horario_fechamento = null;
      mudou = true;
    }
    if (loja.chave_pix === undefined) {
      loja.chave_pix = null;
      mudou = true;
    }
  }

  if (!banco.bairros?.length) {
    banco.bairros = bairrosIniciais(agora());
    mudou = true;
  }

  if (!banco.cupons) {
    banco.cupons = [
      {
        id: "c1000000-0000-0000-0000-000000000001",
        codigo: "DEMO10",
        tipo: "percent",
        valor: 10,
        ativo: true,
        criado_em: agora(),
      },
    ];
    mudou = true;
  }

  if (!banco.banners_vitrine?.length) {
    banco.banners_vitrine = bannersPadrao(agora());
    mudou = true;
  } else {
    for (const b of banco.banners_vitrine) {
      if (b.imagem_url === undefined) {
        b.imagem_url = null;
        mudou = true;
      }
    }
  }

  if (!banco.categorias_vitrine?.length) {
    banco.categorias_vitrine = categoriasPadrao(agora());
    mudou = true;
  }

  // Pedidos antigos sem campo de pagamento: considera pagos
  for (const pedido of banco.pedidos) {
    if (!pedido.status_pagamento) {
      pedido.status_pagamento = "pago";
      pedido.forma_pagamento = pedido.forma_pagamento ?? null;
      pedido.mp_payment_id = pedido.mp_payment_id ?? null;
      mudou = true;
    }
    if (pedido.desconto === undefined) {
      pedido.desconto = 0;
      pedido.cupom_codigo = pedido.cupom_codigo ?? null;
      mudou = true;
    }
  }

  if (mudou) {
    await fs.writeFile(arquivoDb, JSON.stringify(banco, null, 2), "utf8");
  }

  return banco;
}

async function salvarBancoLocal(banco: BancoLocal) {
  await garantirArquivo();
  await fs.writeFile(arquivoDb, JSON.stringify(banco, null, 2), "utf8");
}

export async function listarPedidosLocal(
  restauranteId: string,
  status: StatusPedido[],
  ordem: "asc" | "desc" = "asc",
) {
  const banco = await lerBancoLocal();
  const porCliente = new Map(
    banco.usuarios.map((u) => [u.id, { nome: u.nome, telefone: u.telefone }]),
  );
  const porLoja = new Map(banco.restaurantes.map((r) => [r.id, r.endereco]));

  const lista = banco.pedidos.filter(
    (p) =>
      p.restaurante_id === restauranteId &&
      pedidoVisivelNaOperacao(p) &&
      status.includes(p.status),
  );
  lista.sort((a, b) => {
    const diff =
      new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime();
    return ordem === "desc" ? -diff : diff;
  });
  return lista.map((p) => {
    const cliente = porCliente.get(p.cliente_id);
    return {
      ...p,
      cliente_nome: cliente?.nome ?? null,
      cliente_telefone: cliente?.telefone ?? null,
      restaurante_endereco: porLoja.get(p.restaurante_id) ?? null,
    };
  });
}

/** Pedidos do cliente (todos os status), mais recentes primeiro */
export async function listarPedidosDoClienteLocal(clienteId: string) {
  const banco = await lerBancoLocal();
  const porLoja = new Map(banco.restaurantes.map((r) => [r.id, r.nome]));

  return banco.pedidos
    .filter((p) => p.cliente_id === clienteId)
    .slice()
    .sort(
      (a, b) =>
        new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime(),
    )
    .map((p) => ({
      ...p,
      restaurante_nome: porLoja.get(p.restaurante_id) ?? "Restaurante",
    }));
}

export async function buscarPedidoLocal(pedidoId: string) {
  const banco = await lerBancoLocal();
  const pedido = banco.pedidos.find((p) => p.id === pedidoId);
  if (!pedido) return null;

  const restaurante = banco.restaurantes.find(
    (r) => r.id === pedido.restaurante_id,
  );

  return {
    ...pedido,
    restaurante_nome: restaurante?.nome ?? "Restaurante",
  };
}

export async function cancelarPedidoLocal(
  pedidoId: string,
  clienteId: string,
) {
  const banco = await lerBancoLocal();
  const pedido = banco.pedidos.find((p) => p.id === pedidoId);
  if (!pedido) throw new Error("Pedido não encontrado.");
  if (pedido.cliente_id !== clienteId) {
    throw new Error("Este pedido não é seu.");
  }
  if (pedido.status !== "novo") {
    throw new Error(
      "Só é possível cancelar enquanto o restaurante ainda não aceitou.",
    );
  }
  pedido.status = "cancelado";
  pedido.cancelado_por = "cliente";
  pedido.motivo_cancelamento = null;
  pedido.atualizado_em = agora();
  await salvarBancoLocal(banco);
  return pedido;
}

/** Dono cancela pedido em andamento */
export async function cancelarPedidoDonoLocal(
  pedidoId: string,
  motivo?: string | null,
) {
  const banco = await lerBancoLocal();
  const pedido = banco.pedidos.find((p) => p.id === pedidoId);
  if (!pedido) throw new Error("Pedido não encontrado.");
  if (pedido.status === "cancelado") {
    throw new Error("Este pedido já está cancelado.");
  }
  if (pedido.status === "entregue") {
    throw new Error("Não é possível cancelar um pedido já entregue.");
  }
  pedido.status = "cancelado";
  pedido.cancelado_por = "dono";
  pedido.motivo_cancelamento = motivo?.trim() || null;
  pedido.atualizado_em = agora();
  await salvarBancoLocal(banco);
  return pedido;
}

/** Loja recusa pedido (novo ou aceito) — cliente é avisado no acompanhamento */
export async function recusarPedidoLocal(
  pedidoId: string,
  restauranteId: string,
  motivo?: string | null,
) {
  const banco = await lerBancoLocal();
  const pedido = banco.pedidos.find((p) => p.id === pedidoId);
  if (!pedido) throw new Error("Pedido não encontrado.");
  if (pedido.restaurante_id !== restauranteId) {
    throw new Error("Este pedido não é da sua loja.");
  }
  if (!pedidoVisivelNaOperacao(pedido)) {
    throw new Error("Só é possível recusar pedidos pagos ou em dinheiro.");
  }
  if (pedido.status !== "novo" && pedido.status !== "aceito") {
    throw new Error(
      "Só é possível recusar enquanto o pedido está novo ou em preparo.",
    );
  }
  pedido.status = "cancelado";
  pedido.cancelado_por = "restaurante";
  pedido.motivo_cancelamento = motivo?.trim() || null;
  pedido.atualizado_em = agora();
  await salvarBancoLocal(banco);
  return pedido;
}

export async function atualizarStatusPedidoLocal(
  pedidoId: string,
  status: StatusPedido,
  extras?: {
    entregadorId?: string | null;
    tempoEstimadoMinutos?: number | null;
  },
) {
  const banco = await lerBancoLocal();
  const pedido = banco.pedidos.find((p) => p.id === pedidoId);

  if (!pedido) {
    throw new Error("Pedido não encontrado no banco local.");
  }

  if (pedido.status === "cancelado") {
    throw new Error("Este pedido foi cancelado.");
  }

  if (status === "cancelado") {
    throw new Error("Use o cancelamento pelo cliente.");
  }

  if (status === "a_caminho") {
    if (pedido.status !== "pronto") {
      throw new Error("Só é possível aceitar corrida de pedidos prontos.");
    }
    if (pedido.entregador_id && pedido.entregador_id !== extras?.entregadorId) {
      throw new Error("Esta corrida foi atribuída a outro entregador.");
    }
    if (!extras?.entregadorId) {
      throw new Error("Informe o entregador.");
    }
    pedido.entregador_id = extras.entregadorId;
  }

  if (status === "entregue") {
    if (pedido.status !== "a_caminho") {
      throw new Error("Só é possível confirmar entrega de pedidos a caminho.");
    }
    if (
      extras?.entregadorId &&
      pedido.entregador_id &&
      pedido.entregador_id !== extras.entregadorId
    ) {
      throw new Error("Esta corrida pertence a outro entregador.");
    }
    if (
      pedido.forma_pagamento === "dinheiro" &&
      pedido.status_pagamento === "pendente"
    ) {
      pedido.status_pagamento = "pago";
    }
  }

  if (status === "aceito") {
    const minutos = Number(extras?.tempoEstimadoMinutos);
    if (!Number.isFinite(minutos) || minutos < 10 || minutos > 120) {
      throw new Error("Informe o tempo estimado (entre 10 e 120 minutos).");
    }
    pedido.tempo_estimado_minutos = Math.round(minutos);
    pedido.previsao_entrega_em = new Date(
      Date.now() + minutos * 60_000,
    ).toISOString();
  }

  pedido.status = status;
  pedido.atualizado_em = agora();

  if (status === "a_caminho" && extras?.entregadorId) {
    const ent = banco.usuarios.find((u) => u.id === extras.entregadorId);
    if (ent) ent.disponibilidade = "em_rota";
  }
  if (status === "entregue") {
    const entregadorId = pedido.entregador_id ?? extras?.entregadorId;
    if (entregadorId) {
      const aindaEmRota = banco.pedidos.some(
        (p) =>
          p.id !== pedidoId &&
          p.entregador_id === entregadorId &&
          p.status === "a_caminho",
      );
      if (!aindaEmRota) {
        const ent = banco.usuarios.find((u) => u.id === entregadorId);
        if (ent) ent.disponibilidade = "livre";
      }
    }
  }

  await salvarBancoLocal(banco);
  return pedido;
}

export async function atualizarDisponibilidadeEntregadorLocal(
  entregadorId: string,
  valor: "livre" | "offline",
) {
  const banco = await lerBancoLocal();
  const ent = banco.usuarios.find(
    (u) => u.id === entregadorId && u.papel === "entregador",
  );
  if (!ent) throw new Error("Entregador não encontrado.");
  const atual = ent.disponibilidade ?? "offline";
  if (atual === "em_rota" && valor === "offline") {
    throw new Error(
      "Você está em rota. Confirme a entrega antes de ficar offline.",
    );
  }
  ent.disponibilidade = valor;
  await salvarBancoLocal(banco);
  return valor as DisponibilidadeEntregador;
}

export async function lerDisponibilidadeEntregadorLocal(entregadorId: string) {
  const banco = await lerBancoLocal();
  const ent = banco.usuarios.find((u) => u.id === entregadorId);
  return (ent?.disponibilidade as DisponibilidadeEntregador | undefined) ?? "offline";
}

export type CorridaLocal = PedidoLocal & {
  restaurante_nome: string;
  cliente_nome?: string | null;
  cliente_telefone?: string | null;
  restaurante_endereco?: string | null;
};

/** Ganhos do entregador hoje (soma das taxas de entrega) */
export async function ganhosEntregadorHojeLocal(entregadorId: string) {
  const banco = await lerBancoLocal();
  const { inicio, fim } = inicioFimDoDiaSalvador();
  const entregues = banco.pedidos.filter((p) => {
    if (p.entregador_id !== entregadorId) return false;
    if (p.status !== "entregue") return false;
    if (p.status_pagamento !== "pago") return false;
    const t = new Date(p.atualizado_em).getTime();
    return t >= inicio.getTime() && t <= fim.getTime();
  });

  const valor = entregues.reduce(
    (s, p) => s + Number(p.taxa_entrega) + Number(p.gorjeta ?? 0),
    0,
  );
  return { entregas: entregues.length, valor };
}

/** Ganhos de todos os entregadores hoje (painel do dono) */
export async function ganhosTodosEntregadoresHojeLocal() {
  const banco = await lerBancoLocal();
  const { inicio, fim } = inicioFimDoDiaSalvador();
  const entregadores = banco.usuarios.filter((u) => u.papel === "entregador");

  return entregadores
    .map((e) => {
      const entregues = banco.pedidos.filter((p) => {
        if (p.entregador_id !== e.id) return false;
        if (p.status !== "entregue") return false;
        if (p.status_pagamento !== "pago") return false;
        const t = new Date(p.atualizado_em).getTime();
        return t >= inicio.getTime() && t <= fim.getTime();
      });
      return {
        entregador_id: e.id,
        nome: e.nome,
        telefone: e.telefone,
        entregas: entregues.length,
        valor: entregues.reduce(
          (s, p) => s + Number(p.taxa_entrega) + Number(p.gorjeta ?? 0),
          0,
        ),
      };
    })
    .sort((a, b) => b.valor - a.valor || a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Dono atribui / troca / libera entregador no pedido */
export async function atribuirEntregadorPedidoLocal(
  pedidoId: string,
  entrada: { entregadorId?: string | null; liberar?: boolean },
) {
  const banco = await lerBancoLocal();
  const pedido = banco.pedidos.find((p) => p.id === pedidoId);
  if (!pedido) throw new Error("Pedido não encontrado.");
  if (!pedidoVisivelNaOperacao(pedido)) {
    throw new Error("Só é possível atribuir pedidos pagos ou em dinheiro.");
  }
  if (pedido.status !== "pronto" && pedido.status !== "a_caminho") {
    throw new Error(
      "Só é possível atribuir pedidos prontos ou a caminho.",
    );
  }

  if (entrada.liberar) {
    if (pedido.status !== "pronto") {
      throw new Error(
        "Para liberar, o pedido precisa estar pronto (não a caminho).",
      );
    }
    pedido.entregador_id = null;
  } else {
    const id = entrada.entregadorId?.trim();
    if (!id) throw new Error("Informe o entregador.");
    const entregador = banco.usuarios.find(
      (u) => u.id === id && u.papel === "entregador",
    );
    if (!entregador) throw new Error("Entregador não encontrado.");
    pedido.entregador_id = id;
  }

  pedido.atualizado_em = agora();
  await salvarBancoLocal(banco);
  return pedido;
}

/** Corridas disponíveis (pronto) + as do entregador (a caminho) */
export async function listarCorridasLocal(entregadorId: string) {
  const banco = await lerBancoLocal();
  const disponibilidade =
    banco.usuarios.find((u) => u.id === entregadorId)?.disponibilidade ??
    "offline";
  const porRestaurante = new Map(
    banco.restaurantes.map((r) => [
      r.id,
      { nome: r.nome, endereco: r.endereco },
    ]),
  );
  const porCliente = new Map(
    banco.usuarios.map((u) => [u.id, { nome: u.nome, telefone: u.telefone }]),
  );

  return banco.pedidos
    .filter((p) => {
      if (!pedidoVisivelNaOperacao(p)) return false;
      if (p.status === "a_caminho" && p.entregador_id === entregadorId) {
        return true;
      }
      if (p.status !== "pronto") return false;
      if (p.entregador_id === entregadorId) return true;
      if (disponibilidade === "offline") return false;
      return !p.entregador_id;
    })
    .sort(
      (a, b) =>
        new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime(),
    )
    .map((p): CorridaLocal => {
      const loja = porRestaurante.get(p.restaurante_id);
      const cliente = porCliente.get(p.cliente_id);
      return {
        ...p,
        restaurante_nome: loja?.nome ?? "Restaurante",
        restaurante_endereco: loja?.endereco ?? null,
        cliente_nome: cliente?.nome ?? null,
        cliente_telefone: cliente?.telefone ?? null,
      };
    });
}

export async function listarRestaurantesLocal() {
  const banco = await lerBancoLocal();
  return banco.restaurantes.filter((r) => r.ativo);
}

export async function buscarRestauranteLocal(id: string) {
  const banco = await lerBancoLocal();
  return banco.restaurantes.find((r) => r.id === id) ?? null;
}

export async function listarCardapioLocal(restauranteId: string) {
  const banco = await lerBancoLocal();
  return banco.itens_cardapio.filter(
    (item) => item.restaurante_id === restauranteId && item.disponivel,
  );
}

/** Cardápio completo (inclui indisponíveis) — painel do dono */
export async function listarCardapioAdminLocal(restauranteId: string) {
  const banco = await lerBancoLocal();
  return banco.itens_cardapio
    .filter((item) => item.restaurante_id === restauranteId)
    .slice()
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

function slugEmailLoja(nome: string) {
  const base = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 40);
  return base || "loja";
}

/** Cria restaurante e conta de login da loja (senha teste123) */
export async function criarRestauranteLocal(entrada: {
  nome: string;
  descricao?: string | null;
  endereco?: string | null;
  comissao_percentual?: number;
}) {
  const nome = entrada.nome.trim();
  if (!nome) throw new Error("Informe o nome do restaurante.");

  const comissao = Number(entrada.comissao_percentual ?? 10);
  if (Number.isNaN(comissao) || comissao < 0 || comissao > 100) {
    throw new Error("Comissão deve ser entre 0 e 100.");
  }

  const banco = await lerBancoLocal();
  const criado = agora();
  const id = crypto.randomUUID();

  const restaurante: Restaurante = {
    id,
    nome,
    descricao: entrada.descricao?.trim() || null,
    endereco: entrada.endereco?.trim() || null,
    imagem_url: null,
    comissao_percentual: comissao,
    ativo: true,
    pausado: false,
    pedido_minimo: 0,
    horario_abertura: null,
    horario_fechamento: null,
    chave_pix: null,
    criado_em: criado,
  };

  let slug = slugEmailLoja(nome);
  let email = `loja.${slug}@chegou.local`;
  let n = 2;
  while (
    banco.usuarios.some((u) => u.email?.toLowerCase() === email.toLowerCase())
  ) {
    email = `loja.${slug}${n}@chegou.local`;
    n += 1;
  }

  const usuario: Usuario = {
    id: crypto.randomUUID(),
    nome: `Loja ${nome}`,
    email,
    telefone: null,
    papel: "restaurante",
    restaurante_id: id,
    senha_hash: gerarHashSenha(SENHA_DEMO),
    criado_em: criado,
  };

  banco.restaurantes.push(restaurante);
  banco.usuarios.push(usuario);
  await salvarBancoLocal(banco);
  return { restaurante, usuario: semHash(usuario) };
}

function semHash(usuario: Usuario): Usuario {
  const { senha_hash: _, ...resto } = usuario;
  return { ...resto, senha_hash: null };
}

export async function cadastrarClienteLocal(entrada: {
  nome: string;
  email: string;
  telefone?: string;
  senha_hash: string;
}) {
  const banco = await lerBancoLocal();
  const email = entrada.email.trim().toLowerCase();
  if (banco.usuarios.some((u) => u.email?.toLowerCase() === email)) {
    throw new Error("Já existe uma conta com este e-mail.");
  }

  const usuario: Usuario = {
    id: crypto.randomUUID(),
    nome: entrada.nome.trim(),
    email,
    telefone: entrada.telefone?.trim() || null,
    papel: "cliente",
    restaurante_id: null,
    senha_hash: entrada.senha_hash,
    criado_em: agora(),
  };
  banco.usuarios.push(usuario);
  await salvarBancoLocal(banco);
  return semHash(usuario);
}

export async function criarEntregadorLocal(entrada: {
  nome: string;
  email: string;
  telefone?: string;
  senha_hash: string;
}) {
  const banco = await lerBancoLocal();
  const email = entrada.email.trim().toLowerCase();
  if (banco.usuarios.some((u) => u.email?.toLowerCase() === email)) {
    throw new Error("Já existe uma conta com este e-mail.");
  }

  const usuario: Usuario = {
    id: crypto.randomUUID(),
    nome: entrada.nome.trim(),
    email,
    telefone: entrada.telefone?.trim() || null,
    papel: "entregador",
    restaurante_id: null,
    disponibilidade: "offline",
    senha_hash: entrada.senha_hash,
    criado_em: agora(),
  };
  banco.usuarios.push(usuario);
  await salvarBancoLocal(banco);
  return semHash(usuario);
}

export async function criarItemCardapioLocal(entrada: {
  restaurante_id: string;
  nome: string;
  descricao?: string | null;
  preco: number;
  disponivel?: boolean;
  imagem_url?: string | null;
}) {
  const nome = entrada.nome.trim();
  if (!nome) throw new Error("Informe o nome do prato.");
  const preco = Number(entrada.preco);
  if (Number.isNaN(preco) || preco < 0) {
    throw new Error("Preço inválido.");
  }

  const banco = await lerBancoLocal();
  if (!banco.restaurantes.some((r) => r.id === entrada.restaurante_id)) {
    throw new Error("Restaurante não encontrado.");
  }

  const item: ItemCardapio = {
    id: crypto.randomUUID(),
    restaurante_id: entrada.restaurante_id,
    nome,
    descricao: entrada.descricao?.trim() || null,
    preco,
    disponivel: entrada.disponivel ?? true,
    imagem_url: entrada.imagem_url?.trim() || null,
    criado_em: agora(),
  };
  banco.itens_cardapio.push(item);
  await salvarBancoLocal(banco);
  return item;
}

export async function atualizarItemCardapioLocal(
  id: string,
  patch: {
    nome?: string;
    descricao?: string | null;
    preco?: number;
    disponivel?: boolean;
    imagem_url?: string | null;
  },
) {
  const banco = await lerBancoLocal();
  const item = banco.itens_cardapio.find((i) => i.id === id);
  if (!item) throw new Error("Item do cardápio não encontrado.");

  if (patch.nome !== undefined) {
    const nome = patch.nome.trim();
    if (!nome) throw new Error("Informe o nome do prato.");
    item.nome = nome;
  }
  if (patch.descricao !== undefined) {
    item.descricao = patch.descricao?.trim() || null;
  }
  if (patch.preco !== undefined) {
    const preco = Number(patch.preco);
    if (Number.isNaN(preco) || preco < 0) throw new Error("Preço inválido.");
    item.preco = preco;
  }
  if (patch.disponivel !== undefined) {
    item.disponivel = patch.disponivel;
  }
  if (patch.imagem_url !== undefined) {
    item.imagem_url = patch.imagem_url?.trim() || null;
  }

  await salvarBancoLocal(banco);
  return item;
}

export type ItemNovoPedido = {
  item_cardapio_id: string;
  quantidade: number;
  observacao?: string | null;
};

/** Cria pedido com status novo no banco local */
export async function criarPedidoLocal(entrada: {
  clienteId: string;
  restauranteId: string;
  endereco_entrega: string;
  observacao?: string;
  bairroId?: string;
  /** Ignorado se houver bairros ativos — taxa vem do bairro */
  taxa_entrega?: number;
  cupomCodigo?: string | null;
  gorjeta?: number;
  itens: ItemNovoPedido[];
}) {
  if (!entrada.itens.length) {
    throw new Error("Adicione pelo menos um item ao pedido.");
  }

  const banco = await lerBancoLocal();
  const restaurante = banco.restaurantes.find(
    (r) => r.id === entrada.restauranteId && r.ativo,
  );

  if (!restaurante) {
    throw new Error("Restaurante não encontrado.");
  }

  const config = normalizarConfiguracao(banco.configuracao);
  const status = statusOperacaoLoja(restaurante, config);
  if (status !== "aberta") {
    throw new Error(mensagemBloqueioPedido(status, config, restaurante));
  }

  const ativos = banco.bairros.filter((b) => b.ativo);
  let taxa = Number(entrada.taxa_entrega ?? config.taxa_entrega);
  let bairroNome: string | null = null;

  if (ativos.length > 0) {
    if (!entrada.bairroId) {
      throw new Error("Escolha o bairro de entrega.");
    }
    const bairro = ativos.find((b) => b.id === entrada.bairroId);
    if (!bairro) {
      throw new Error("Bairro de entrega inválido ou inativo.");
    }
    taxa = Number(bairro.taxa);
    bairroNome = bairro.nome;
  }

  let gorjeta = Number(entrada.gorjeta ?? 0);
  if (!Number.isFinite(gorjeta) || gorjeta < 0) {
    throw new Error("Gorjeta inválida.");
  }
  gorjeta = Number(gorjeta.toFixed(2));

  const criado = agora();
  const pedidoId = crypto.randomUUID();
  const itensPedido: ItemPedido[] = [];
  let total = 0;

  for (const item of entrada.itens) {
    const doCardapio = banco.itens_cardapio.find(
      (c) =>
        c.id === item.item_cardapio_id &&
        c.restaurante_id === entrada.restauranteId &&
        c.disponivel,
    );

    if (!doCardapio) {
      throw new Error("Item do cardápio inválido.");
    }

    if (item.quantidade < 1) {
      throw new Error("Quantidade inválida.");
    }

    total += Number(doCardapio.preco) * item.quantidade;
    itensPedido.push({
      id: crypto.randomUUID(),
      pedido_id: pedidoId,
      item_cardapio_id: doCardapio.id,
      nome: doCardapio.nome,
      preco_unitario: Number(doCardapio.preco),
      quantidade: item.quantidade,
      observacao: item.observacao?.trim() || null,
    });
  }

  exigirPedidoMinimo(restaurante, total);

  let desconto = 0;
  let cupomCodigo: string | null = null;
  const codigoInformado = entrada.cupomCodigo
    ? normalizarCodigoCupom(entrada.cupomCodigo)
    : "";
  if (codigoInformado) {
    const cupom = banco.cupons.find(
      (c) => normalizarCodigoCupom(c.codigo) === codigoInformado,
    );
    if (!cupom) throw new Error("Cupom não encontrado.");
    desconto = calcularDescontoCupom(cupom, total);
    cupomCodigo = normalizarCodigoCupom(cupom.codigo);
    total = Number((total - desconto).toFixed(2));
  }

  const dataPedido = dataPedidoSalvador();
  const numerosHoje = banco.pedidos
    .filter((p) => p.data_pedido === dataPedido && p.numero_dia != null)
    .map((p) => Number(p.numero_dia));
  const numeroDia =
    (numerosHoje.length ? Math.max(...numerosHoje) : 0) + 1;

  const pedido: PedidoLocal = {
    id: pedidoId,
    cliente_id: entrada.clienteId,
    restaurante_id: entrada.restauranteId,
    entregador_id: null,
    status: "novo",
    status_pagamento: "pendente",
    forma_pagamento: null,
    mp_payment_id: null,
    total,
    taxa_entrega: taxa,
    endereco_entrega: entrada.endereco_entrega,
    bairro_entrega: bairroNome,
    observacao: entrada.observacao?.trim() || null,
    cancelado_por: null,
    motivo_cancelamento: null,
    tempo_estimado_minutos: null,
    previsao_entrega_em: null,
    numero_dia: numeroDia,
    data_pedido: dataPedido,
    troco_para: null,
    desconto,
    cupom_codigo: cupomCodigo,
    gorjeta,
    avaliacao_nota: null,
    avaliacao_comentario: null,
    avaliado_em: null,
    criado_em: criado,
    atualizado_em: criado,
    itens_pedido: itensPedido,
  };

  banco.pedidos.push(pedido);
  await salvarBancoLocal(banco);
  return pedido;
}

/** Cliente avalia pedido entregue */
export async function avaliarPedidoLocal(
  pedidoId: string,
  clienteId: string,
  nota: number,
  comentario?: string | null,
) {
  const banco = await lerBancoLocal();
  const pedido = banco.pedidos.find((p) => p.id === pedidoId);
  if (!pedido) throw new Error("Pedido não encontrado.");
  if (pedido.cliente_id !== clienteId) {
    throw new Error("Este pedido não é seu.");
  }
  if (pedido.status !== "entregue") {
    throw new Error("Só é possível avaliar pedidos entregues.");
  }
  if (pedido.avaliacao_nota != null) {
    throw new Error("Este pedido já foi avaliado.");
  }
  const n = Math.round(Number(nota));
  if (!Number.isFinite(n) || n < 1 || n > 5) {
    throw new Error("Informe uma nota de 1 a 5.");
  }
  pedido.avaliacao_nota = n;
  pedido.avaliacao_comentario = comentario?.trim() || null;
  pedido.avaliado_em = agora();
  pedido.atualizado_em = agora();
  await salvarBancoLocal(banco);
  return pedido;
}

/** Marca pedido como pago (simulação ou retorno do Mercado Pago) */
export async function marcarPedidoPagoLocal(
  pedidoId: string,
  forma: "pix" | "cartao",
  mpPaymentId?: string | null,
) {
  const banco = await lerBancoLocal();
  const pedido = banco.pedidos.find((p) => p.id === pedidoId);

  if (!pedido) {
    throw new Error("Pedido não encontrado.");
  }

  pedido.status_pagamento = "pago";
  pedido.forma_pagamento = forma;
  pedido.mp_payment_id = mpPaymentId ?? null;
  pedido.atualizado_em = agora();
  await salvarBancoLocal(banco);
  return pedido;
}

/** Cliente escolhe pagar em dinheiro na entrega */
export async function escolherDinheiroLocal(
  pedidoId: string,
  clienteId: string,
  trocoPara?: number | null,
) {
  const banco = await lerBancoLocal();
  const config = normalizarConfiguracao(banco.configuracao);
  if (!config.pagamento_dinheiro) {
    throw new Error("Pagamento em dinheiro está desligado.");
  }
  const pedido = banco.pedidos.find((p) => p.id === pedidoId);
  if (!pedido) throw new Error("Pedido não encontrado.");
  if (pedido.cliente_id !== clienteId) {
    throw new Error("Este pedido não é seu.");
  }
  if (pedido.status_pagamento === "pago") {
    throw new Error("Este pedido já está pago.");
  }
  if (pedido.status === "cancelado") {
    throw new Error("Pedido cancelado.");
  }

  const total =
    Number(pedido.total) +
    Number(pedido.taxa_entrega) +
    Number(pedido.gorjeta ?? 0);
  let troco: number | null = null;
  if (trocoPara != null && Number(trocoPara) > 0) {
    troco = Number(trocoPara);
    if (troco < total) {
      throw new Error(
        `Troco para deve ser pelo menos o total (${total.toFixed(2)}).`,
      );
    }
  }

  pedido.forma_pagamento = "dinheiro";
  pedido.status_pagamento = "pendente";
  pedido.troco_para = troco;
  pedido.atualizado_em = agora();
  await salvarBancoLocal(banco);
  return pedido;
}

export async function marcarPedidoEstornadoLocal(
  pedidoId: string,
  referencia?: string | null,
) {
  const banco = await lerBancoLocal();
  const pedido = banco.pedidos.find((p) => p.id === pedidoId);
  if (!pedido) throw new Error("Pedido não encontrado.");
  pedido.status_pagamento = "estornado";
  if (referencia) pedido.mp_payment_id = referencia;
  pedido.atualizado_em = agora();
  await salvarBancoLocal(banco);
  return pedido;
}

export async function marcarPedidoReembolsoPendenteLocal(pedidoId: string) {
  const banco = await lerBancoLocal();
  const pedido = banco.pedidos.find((p) => p.id === pedidoId);
  if (!pedido) throw new Error("Pedido não encontrado.");
  pedido.status_pagamento = "reembolso_pendente";
  pedido.atualizado_em = agora();
  await salvarBancoLocal(banco);
  return pedido;
}

export async function buscarClienteDoPedidoLocal(pedidoId: string) {
  const banco = await lerBancoLocal();
  const pedido = banco.pedidos.find((p) => p.id === pedidoId);
  if (!pedido) return null;
  const u = banco.usuarios.find((x) => x.id === pedido.cliente_id);
  if (!u) return null;
  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    telefone: u.telefone,
  };
}

export async function marcarPedidoPagamentoFalhouLocal(pedidoId: string) {
  const banco = await lerBancoLocal();
  const pedido = banco.pedidos.find((p) => p.id === pedidoId);

  if (!pedido) {
    throw new Error("Pedido não encontrado.");
  }

  pedido.status_pagamento = "falhou";
  pedido.atualizado_em = agora();
  await salvarBancoLocal(banco);
  return pedido;
}

export async function lerConfiguracaoLocal() {
  const banco = await lerBancoLocal();
  return normalizarConfiguracao(banco.configuracao);
}

export async function salvarConfiguracaoLocal(config: Configuracao) {
  const banco = await lerBancoLocal();
  banco.configuracao = normalizarConfiguracao(config);
  await salvarBancoLocal(banco);
  return banco.configuracao;
}

export type PatchRestaurante = {
  nome?: string;
  descricao?: string | null;
  endereco?: string | null;
  imagem_url?: string | null;
  comissao_percentual?: number;
  ativo?: boolean;
  pausado?: boolean;
  pedido_minimo?: number;
  horario_abertura?: string | null;
  horario_fechamento?: string | null;
  chave_pix?: string | null;
};

export async function atualizarRestauranteLocal(
  id: string,
  patch: PatchRestaurante,
) {
  const banco = await lerBancoLocal();
  const loja = banco.restaurantes.find((r) => r.id === id);
  if (!loja) throw new Error("Restaurante não encontrado.");

  if (patch.nome !== undefined) {
    const nome = patch.nome.trim();
    if (!nome) throw new Error("Informe o nome do restaurante.");
    loja.nome = nome;
  }
  if (patch.descricao !== undefined) {
    loja.descricao = patch.descricao?.trim() || null;
  }
  if (patch.endereco !== undefined) {
    loja.endereco = patch.endereco?.trim() || null;
  }
  if (patch.imagem_url !== undefined) {
    loja.imagem_url = patch.imagem_url?.trim() || null;
  }
  if (patch.comissao_percentual !== undefined) {
    const valor = Number(patch.comissao_percentual);
    if (Number.isNaN(valor) || valor < 0 || valor > 100) {
      throw new Error("Comissão deve ser entre 0 e 100.");
    }
    loja.comissao_percentual = valor;
  }
  if (patch.ativo !== undefined) {
    loja.ativo = patch.ativo;
  }
  if (patch.pausado !== undefined) {
    loja.pausado = patch.pausado;
  }
  if (patch.pedido_minimo !== undefined) {
    const valor = Number(patch.pedido_minimo);
    if (Number.isNaN(valor) || valor < 0) {
      throw new Error("Pedido mínimo inválido.");
    }
    loja.pedido_minimo = Number(valor.toFixed(2));
  }
  if (patch.horario_abertura !== undefined) {
    const h = patch.horario_abertura?.trim() || null;
    if (h && horaParaMinutos(h) === null) {
      throw new Error("Horário de abertura inválido (use HH:MM).");
    }
    loja.horario_abertura = h;
  }
  if (patch.horario_fechamento !== undefined) {
    const h = patch.horario_fechamento?.trim() || null;
    if (h && horaParaMinutos(h) === null) {
      throw new Error("Horário de fechamento inválido (use HH:MM).");
    }
    loja.horario_fechamento = h;
  }
  if (patch.chave_pix !== undefined) {
    loja.chave_pix = patch.chave_pix?.trim() || null;
  }

  await salvarBancoLocal(banco);
  return loja;
}

export async function listarEntregadoresLocal() {
  const banco = await lerBancoLocal();
  return banco.usuarios
    .filter((u) => u.papel === "entregador")
    .map((u) =>
      semHash({
        ...u,
        disponibilidade: u.disponibilidade ?? "offline",
      }),
    )
    .sort(
      (a, b) =>
        ordemDisponibilidade(a.disponibilidade) -
          ordemDisponibilidade(b.disponibilidade) ||
        a.nome.localeCompare(b.nome, "pt-BR"),
    );
}

export async function listarTodosPedidosLocal() {
  const banco = await lerBancoLocal();
  const porRestaurante = new Map(
    banco.restaurantes.map((r) => [r.id, r]),
  );
  const telefoneLoja = new Map<string, string | null>();
  for (const u of banco.usuarios) {
    if (u.papel !== "restaurante" || !u.restaurante_id) continue;
    if (!telefoneLoja.has(u.restaurante_id)) {
      telefoneLoja.set(u.restaurante_id, u.telefone);
    }
  }
  const porCliente = new Map(banco.usuarios.map((u) => [u.id, u]));

  return banco.pedidos
    .slice()
    .sort(
      (a, b) =>
        new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime(),
    )
    .map((p) => {
      const loja = porRestaurante.get(p.restaurante_id);
      const cliente = porCliente.get(p.cliente_id);
      const comissaoPct = Number(loja?.comissao_percentual ?? 0);
      const comissaoValor = (Number(p.total) * comissaoPct) / 100;
      return {
        ...p,
        restaurante_nome: loja?.nome ?? "Restaurante",
        restaurante_endereco: loja?.endereco ?? null,
        restaurante_telefone: telefoneLoja.get(p.restaurante_id) ?? null,
        chave_pix: loja?.chave_pix?.trim() || null,
        cliente_nome: cliente?.nome ?? null,
        cliente_telefone: cliente?.telefone ?? null,
        comissao_percentual: comissaoPct,
        comissao_valor: comissaoValor,
      };
    });
}


/** Números / fechamento do dia */
export async function resumoDoDiaLocal() {
  const pedidos = await listarTodosPedidosLocal();
  const { inicio, fim } = inicioFimDoDiaSalvador();
  const ganhos = await ganhosTodosEntregadoresHojeLocal();

  return montarFechamentoDia({
    pedidos,
    inicio: inicio.getTime(),
    fim: fim.getTime(),
    data: dataPedidoSalvador(),
    ganhosEntregadores: ganhos.map((g) => ({
      nome: g.nome,
      entregas: g.entregas,
      valor: g.valor,
    })),
  });
}

export async function listarBairrosLocal(apenasAtivos = false) {
  const banco = await lerBancoLocal();
  const lista = banco.bairros
    .filter((b) => (apenasAtivos ? b.ativo : true))
    .slice()
    .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR"));
  return lista;
}

export async function buscarBairroLocal(id: string) {
  const banco = await lerBancoLocal();
  return banco.bairros.find((b) => b.id === id) ?? null;
}

export async function criarBairroLocal(entrada: {
  nome: string;
  taxa: number;
  ativo?: boolean;
  ordem?: number;
}) {
  const nome = entrada.nome.trim();
  if (!nome) throw new Error("Informe o nome do bairro.");
  const taxa = Number(entrada.taxa);
  if (Number.isNaN(taxa) || taxa < 0) throw new Error("Taxa inválida.");

  const banco = await lerBancoLocal();
  if (
    banco.bairros.some((b) => b.nome.toLowerCase() === nome.toLowerCase())
  ) {
    throw new Error("Já existe um bairro com este nome.");
  }

  const bairro: BairroEntrega = {
    id: crypto.randomUUID(),
    nome,
    taxa,
    ativo: entrada.ativo ?? true,
    ordem: Number(entrada.ordem ?? 0),
    criado_em: agora(),
  };
  banco.bairros.push(bairro);
  await salvarBancoLocal(banco);
  return bairro;
}

export async function atualizarBairroLocal(
  id: string,
  patch: {
    nome?: string;
    taxa?: number;
    ativo?: boolean;
    ordem?: number;
  },
) {
  const banco = await lerBancoLocal();
  const bairro = banco.bairros.find((b) => b.id === id);
  if (!bairro) throw new Error("Bairro não encontrado.");

  if (patch.nome !== undefined) {
    const nome = patch.nome.trim();
    if (!nome) throw new Error("Informe o nome do bairro.");
    if (
      banco.bairros.some(
        (b) => b.id !== id && b.nome.toLowerCase() === nome.toLowerCase(),
      )
    ) {
      throw new Error("Já existe um bairro com este nome.");
    }
    bairro.nome = nome;
  }
  if (patch.taxa !== undefined) {
    const taxa = Number(patch.taxa);
    if (Number.isNaN(taxa) || taxa < 0) throw new Error("Taxa inválida.");
    bairro.taxa = taxa;
  }
  if (patch.ativo !== undefined) bairro.ativo = patch.ativo;
  if (patch.ordem !== undefined) bairro.ordem = Number(patch.ordem) || 0;

  await salvarBancoLocal(banco);
  return bairro;
}

export async function excluirBairroLocal(id: string) {
  const banco = await lerBancoLocal();
  const antes = banco.bairros.length;
  banco.bairros = banco.bairros.filter((b) => b.id !== id);
  if (banco.bairros.length === antes) {
    throw new Error("Bairro não encontrado.");
  }
  await salvarBancoLocal(banco);
}

export async function listarCuponsLocal() {
  const banco = await lerBancoLocal();
  return banco.cupons
    .slice()
    .sort((a, b) => a.codigo.localeCompare(b.codigo, "pt-BR"));
}

export async function buscarCupomPorCodigoLocal(codigo: string) {
  const banco = await lerBancoLocal();
  const chave = normalizarCodigoCupom(codigo);
  return (
    banco.cupons.find((c) => normalizarCodigoCupom(c.codigo) === chave) ?? null
  );
}

export async function validarCupomLocal(codigo: string, subtotal: number) {
  const cupom = await buscarCupomPorCodigoLocal(codigo);
  if (!cupom) throw new Error("Cupom não encontrado.");
  const desconto = calcularDescontoCupom(cupom, subtotal);
  return {
    cupom,
    desconto,
    codigo: normalizarCodigoCupom(cupom.codigo),
  };
}

export async function criarCupomLocal(entrada: {
  codigo: string;
  tipo: TipoCupom;
  valor: number;
}) {
  const codigo = normalizarCodigoCupom(entrada.codigo);
  if (!codigo || codigo.length < 3) {
    throw new Error("Informe um código com pelo menos 3 caracteres.");
  }
  if (entrada.tipo !== "percent" && entrada.tipo !== "fix") {
    throw new Error("Tipo de cupom inválido.");
  }
  const valor = Number(entrada.valor);
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new Error("Valor do desconto inválido.");
  }
  if (entrada.tipo === "percent" && valor > 100) {
    throw new Error("Percentual deve ser no máximo 100.");
  }

  const banco = await lerBancoLocal();
  if (
    banco.cupons.some((c) => normalizarCodigoCupom(c.codigo) === codigo)
  ) {
    throw new Error("Já existe um cupom com este código.");
  }

  const cupom: Cupom = {
    id: crypto.randomUUID(),
    codigo,
    tipo: entrada.tipo,
    valor: Number(valor.toFixed(2)),
    ativo: true,
    criado_em: agora(),
  };
  banco.cupons.push(cupom);
  await salvarBancoLocal(banco);
  return cupom;
}

export async function atualizarCupomLocal(
  id: string,
  patch: { ativo?: boolean; valor?: number; tipo?: TipoCupom },
) {
  const banco = await lerBancoLocal();
  const cupom = banco.cupons.find((c) => c.id === id);
  if (!cupom) throw new Error("Cupom não encontrado.");

  if (patch.ativo !== undefined) cupom.ativo = patch.ativo;
  if (patch.tipo !== undefined) {
    if (patch.tipo !== "percent" && patch.tipo !== "fix") {
      throw new Error("Tipo de cupom inválido.");
    }
    cupom.tipo = patch.tipo;
  }
  if (patch.valor !== undefined) {
    const valor = Number(patch.valor);
    if (!Number.isFinite(valor) || valor <= 0) {
      throw new Error("Valor do desconto inválido.");
    }
    if (cupom.tipo === "percent" && valor > 100) {
      throw new Error("Percentual deve ser no máximo 100.");
    }
    cupom.valor = Number(valor.toFixed(2));
  }

  await salvarBancoLocal(banco);
  return cupom;
}

export async function excluirCupomLocal(id: string) {
  const banco = await lerBancoLocal();
  const antes = banco.cupons.length;
  banco.cupons = banco.cupons.filter((c) => c.id !== id);
  if (banco.cupons.length === antes) {
    throw new Error("Cupom não encontrado.");
  }
  await salvarBancoLocal(banco);
}

/** Indica se estamos no modo demonstração (sem Supabase) */
export function usandoModoDemo() {
  return !(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

function ordenarVitrine<T extends { ordem: number; criado_em: string }>(
  lista: T[],
) {
  return [...lista].sort(
    (a, b) => a.ordem - b.ordem || a.criado_em.localeCompare(b.criado_em),
  );
}

export async function listarBannersVitrineLocal(apenasAtivos = false) {
  const banco = await lerBancoLocal();
  const lista = ordenarVitrine(banco.banners_vitrine ?? []);
  return apenasAtivos ? lista.filter((b) => b.ativo) : lista;
}

export async function listarCategoriasVitrineLocal(apenasAtivos = false) {
  const banco = await lerBancoLocal();
  const lista = ordenarVitrine(banco.categorias_vitrine ?? []);
  return apenasAtivos ? lista.filter((c) => c.ativo) : lista;
}

export async function criarBannerVitrineLocal(entrada: {
  imagem_url: string;
  ordem?: number;
}) {
  const imagem = entrada.imagem_url.trim();
  if (!imagem) throw new Error("Informe a URL da imagem do banner.");
  const banco = await lerBancoLocal();
  const banner: BannerVitrine = {
    id: crypto.randomUUID(),
    imagem_url: imagem,
    titulo: "Banner",
    texto: "",
    tom: "dende",
    ativo: true,
    ordem: Number(entrada.ordem ?? banco.banners_vitrine.length + 1),
    criado_em: agora(),
  };
  banco.banners_vitrine.push(banner);
  await salvarBancoLocal(banco);
  return banner;
}

export async function atualizarBannerVitrineLocal(
  id: string,
  patch: Partial<{
    imagem_url: string | null;
    ativo: boolean;
    ordem: number;
  }>,
) {
  const banco = await lerBancoLocal();
  const banner = banco.banners_vitrine.find((b) => b.id === id);
  if (!banner) throw new Error("Banner não encontrado.");
  if (patch.imagem_url !== undefined) {
    const imagem = (patch.imagem_url ?? "").trim();
    if (!imagem) throw new Error("Informe a URL da imagem do banner.");
    banner.imagem_url = imagem;
  }
  if (patch.ativo !== undefined) banner.ativo = patch.ativo;
  if (patch.ordem !== undefined) banner.ordem = Number(patch.ordem);
  await salvarBancoLocal(banco);
  return banner;
}

export async function excluirBannerVitrineLocal(id: string) {
  const banco = await lerBancoLocal();
  const antes = banco.banners_vitrine.length;
  banco.banners_vitrine = banco.banners_vitrine.filter((b) => b.id !== id);
  if (banco.banners_vitrine.length === antes) {
    throw new Error("Banner não encontrado.");
  }
  await salvarBancoLocal(banco);
}

export async function criarCategoriaVitrineLocal(entrada: {
  nome: string;
  emoji?: string;
  palavras_chave?: string;
  ordem?: number;
}) {
  const nome = entrada.nome.trim();
  if (!nome) throw new Error("Informe o nome da categoria.");
  const banco = await lerBancoLocal();
  const categoria: CategoriaVitrine = {
    id: crypto.randomUUID(),
    nome,
    emoji: (entrada.emoji ?? "🍽️").trim() || "🍽️",
    palavras_chave: (entrada.palavras_chave ?? "").trim(),
    ativo: true,
    ordem: Number(entrada.ordem ?? banco.categorias_vitrine.length),
    criado_em: agora(),
  };
  banco.categorias_vitrine.push(categoria);
  await salvarBancoLocal(banco);
  return categoria;
}

export async function atualizarCategoriaVitrineLocal(
  id: string,
  patch: Partial<{
    nome: string;
    emoji: string;
    palavras_chave: string;
    ativo: boolean;
    ordem: number;
  }>,
) {
  const banco = await lerBancoLocal();
  const categoria = banco.categorias_vitrine.find((c) => c.id === id);
  if (!categoria) throw new Error("Categoria não encontrada.");
  if (patch.nome !== undefined) {
    const nome = patch.nome.trim();
    if (!nome) throw new Error("Informe o nome da categoria.");
    categoria.nome = nome;
  }
  if (patch.emoji !== undefined) {
    categoria.emoji = patch.emoji.trim() || "🍽️";
  }
  if (patch.palavras_chave !== undefined) {
    categoria.palavras_chave = patch.palavras_chave.trim();
  }
  if (patch.ativo !== undefined) categoria.ativo = patch.ativo;
  if (patch.ordem !== undefined) categoria.ordem = Number(patch.ordem);
  await salvarBancoLocal(banco);
  return categoria;
}

export async function excluirCategoriaVitrineLocal(id: string) {
  const banco = await lerBancoLocal();
  const antes = banco.categorias_vitrine.length;
  banco.categorias_vitrine = banco.categorias_vitrine.filter((c) => c.id !== id);
  if (banco.categorias_vitrine.length === antes) {
    throw new Error("Categoria não encontrada.");
  }
  await salvarBancoLocal(banco);
}
