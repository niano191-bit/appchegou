import { promises as fs } from "fs";
import path from "path";
import { DEMO } from "@/lib/demo-ids";
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
  };
}

const arquivoDb = path.join(process.cwd(), ".data", "db.json");

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
        criado_em: criado,
      },
      {
        id: DEMO.usuarioRestauranteAcarajeId,
        nome: "Restaurante Teste Acarajé",
        email: "loja.acaraje@chegou.local",
        telefone: "71999990002",
        papel: "restaurante",
        restaurante_id: DEMO.restauranteAcarajeId,
        criado_em: criado,
      },
      {
        id: DEMO.entregadorId,
        nome: "Entregador Teste",
        email: "entregador.teste@chegou.local",
        telefone: "71999990004",
        papel: "entregador",
        restaurante_id: null,
        criado_em: criado,
      },
      {
        id: DEMO.donoId,
        nome: "Dono Teste",
        email: "dono.teste@chegou.local",
        telefone: "71999990005",
        papel: "dono",
        restaurante_id: null,
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
        total: 43.8,
        taxa_entrega: 8,
        endereco_entrega: "Rua Teste, 100 — Barra, Salvador",
        observacao: "Pedido de teste — sem cebola",
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

  // Bancos antigos sem configuração ganham o padrão automaticamente
  if (!banco.configuracao) {
    banco.configuracao = configuracaoPadrao();
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
) {
  const banco = await lerBancoLocal();
  return banco.pedidos
    .filter(
      (p) =>
        p.restaurante_id === restauranteId && status.includes(p.status),
    )
    .sort(
      (a, b) =>
        new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime(),
    );
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
};

/** Corridas disponíveis (pronto) + as do entregador (a caminho) */
export async function listarCorridasLocal(entregadorId: string) {
  const banco = await lerBancoLocal();
  const porRestaurante = new Map(
    banco.restaurantes.map((r) => [r.id, r.nome]),
  );

  return banco.pedidos
    .filter(
      (p) =>
        p.status === "pronto" ||
        (p.status === "a_caminho" && p.entregador_id === entregadorId),
    )
    .sort(
      (a, b) =>
        new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime(),
    )
    .map(
      (p): CorridaLocal => ({
        ...p,
        restaurante_nome:
          porRestaurante.get(p.restaurante_id) ?? "Restaurante",
      }),
    );
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
    total,
    taxa_entrega: entrada.taxa_entrega,
    endereco_entrega: entrada.endereco_entrega,
    observacao: entrada.observacao?.trim() || null,
    criado_em: criado,
    atualizado_em: criado,
    itens_pedido: itensPedido,
  };

  banco.pedidos.push(pedido);
  await salvarBancoLocal(banco);
  return pedido;
}

export async function lerConfiguracaoLocal() {
  const banco = await lerBancoLocal();
  return banco.configuracao;
}

export async function salvarConfiguracaoLocal(config: Configuracao) {
  const banco = await lerBancoLocal();
  banco.configuracao = {
    taxa_entrega: Number(config.taxa_entrega),
    horario_abertura: config.horario_abertura,
    horario_fechamento: config.horario_fechamento,
  };
  await salvarBancoLocal(banco);
  return banco.configuracao;
}

export async function atualizarRestauranteLocal(
  id: string,
  patch: { comissao_percentual?: number; ativo?: boolean },
) {
  const banco = await lerBancoLocal();
  const loja = banco.restaurantes.find((r) => r.id === id);
  if (!loja) throw new Error("Restaurante não encontrado.");

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

  await salvarBancoLocal(banco);
  return loja;
}

export async function listarEntregadoresLocal() {
  const banco = await lerBancoLocal();
  return banco.usuarios.filter((u) => u.papel === "entregador");
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
    return t >= inicio.getTime() && t <= fim.getTime();
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
