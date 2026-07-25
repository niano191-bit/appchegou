import { promises as fs } from "fs";
import path from "path";
import { DEMO } from "@/lib/demo-ids";
import { SENHA_DEMO } from "@/lib/auth";
import { gerarHashSenha } from "@/lib/senha";
import type {
  Configuracao,
  ItemCardapio,
  ItemPedido,
  Pedido,
  Restaurante,
  StatusPedido,
  Usuario,
} from "@/types/database";
import { TAXA_ENTREGA_PADRAO } from "@/lib/constantes";
import {
  mensagemBloqueioPedido,
  statusOperacaoLoja,
} from "@/lib/horario";

export type PedidoLocal = Pedido & { itens_pedido: ItemPedido[] };

type BancoLocal = {
  restaurantes: Restaurante[];
  usuarios: Usuario[];
  itens_cardapio: ItemCardapio[];
  pedidos: PedidoLocal[];
  configuracao: Configuracao;
};

export function configuracaoPadrao(): Configuracao {
  return {
    taxa_entrega: TAXA_ENTREGA_PADRAO,
    horario_abertura: "10:00",
    horario_fechamento: "22:00",
    pagamento_mercadopago: true,
    pagamento_lucpaguei: true,
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
        observacao: "Pedido de teste — sem cebola",
        cancelado_por: null,
        motivo_cancelamento: null,
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

  for (const loja of banco.restaurantes) {
    if (loja.pausado === undefined) {
      loja.pausado = false;
      mudou = true;
    }
  }

  // Pedidos antigos sem campo de pagamento: considera pagos
  for (const pedido of banco.pedidos) {
    if (!pedido.status_pagamento) {
      pedido.status_pagamento = "pago";
      pedido.forma_pagamento = pedido.forma_pagamento ?? null;
      pedido.mp_payment_id = pedido.mp_payment_id ?? null;
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
      p.status_pagamento === "pago" &&
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
  if (pedido.status_pagamento !== "pago") {
    throw new Error("Só é possível recusar pedidos já pagos.");
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
  extras?: { entregadorId?: string | null },
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
      throw new Error("Esta corrida já foi aceita por outro entregador.");
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
  }

  pedido.status = status;
  pedido.atualizado_em = agora();
  await salvarBancoLocal(banco);
  return pedido;
}

export type CorridaLocal = PedidoLocal & {
  restaurante_nome: string;
  cliente_nome?: string | null;
  cliente_telefone?: string | null;
  restaurante_endereco?: string | null;
};

/** Corridas disponíveis (pronto) + as do entregador (a caminho) */
export async function listarCorridasLocal(entregadorId: string) {
  const banco = await lerBancoLocal();
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
    .filter(
      (p) =>
        p.status_pagamento === "pago" &&
        (p.status === "pronto" ||
          (p.status === "a_caminho" && p.entregador_id === entregadorId)),
    )
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
};

/** Cria pedido com status novo no banco local */
export async function criarPedidoLocal(entrada: {
  clienteId: string;
  restauranteId: string;
  endereco_entrega: string;
  observacao?: string;
  taxa_entrega: number;
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
    throw new Error(mensagemBloqueioPedido(status, config));
  }

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
    });
  }

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
    taxa_entrega: entrada.taxa_entrega,
    endereco_entrega: entrada.endereco_entrega,
    observacao: entrada.observacao?.trim() || null,
    cancelado_por: null,
    motivo_cancelamento: null,
    criado_em: criado,
    atualizado_em: criado,
    itens_pedido: itensPedido,
  };

  banco.pedidos.push(pedido);
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

  await salvarBancoLocal(banco);
  return loja;
}

export async function listarEntregadoresLocal() {
  const banco = await lerBancoLocal();
  return banco.usuarios
    .filter((u) => u.papel === "entregador")
    .map((u) => semHash(u));
}

export async function listarTodosPedidosLocal() {
  const banco = await lerBancoLocal();
  const porRestaurante = new Map(
    banco.restaurantes.map((r) => [r.id, r]),
  );

  return banco.pedidos
    .slice()
    .sort(
      (a, b) =>
        new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime(),
    )
    .map((p) => {
      const loja = porRestaurante.get(p.restaurante_id);
      const comissaoPct = Number(loja?.comissao_percentual ?? 0);
      const comissaoValor = (Number(p.total) * comissaoPct) / 100;
      return {
        ...p,
        restaurante_nome: loja?.nome ?? "Restaurante",
        comissao_percentual: comissaoPct,
        comissao_valor: comissaoValor,
      };
    });
}

function inicioFimDoDiaSalvador() {
  const agoraSp = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
  );
  const y = agoraSp.getFullYear();
  const m = String(agoraSp.getMonth() + 1).padStart(2, "0");
  const d = String(agoraSp.getDate()).padStart(2, "0");
  // Intervalo do dia em Salvador, convertido para comparação ISO
  const inicio = new Date(`${y}-${m}-${d}T00:00:00-03:00`);
  const fim = new Date(`${y}-${m}-${d}T23:59:59.999-03:00`);
  return { inicio, fim };
}

/** Números do dia: pedidos, comissão e ticket médio */
export async function resumoDoDiaLocal() {
  const pedidos = await listarTodosPedidosLocal();
  const { inicio, fim } = inicioFimDoDiaSalvador();

  const doDia = pedidos.filter((p) => {
    const t = new Date(p.criado_em).getTime();
    return (
      p.status_pagamento === "pago" &&
      t >= inicio.getTime() &&
      t <= fim.getTime()
    );
  });

  const qtdPedidos = doDia.length;
  const faturamento = doDia.reduce((s, p) => s + Number(p.total), 0);
  const comissao = doDia.reduce((s, p) => s + Number(p.comissao_valor), 0);
  const ticketMedio = qtdPedidos > 0 ? faturamento / qtdPedidos : 0;

  return {
    qtd_pedidos: qtdPedidos,
    faturamento,
    comissao,
    ticket_medio: ticketMedio,
  };
}

/** Indica se estamos no modo demonstração (sem Supabase) */
export function usandoModoDemo() {
  return !(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}
