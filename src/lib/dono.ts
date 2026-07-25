import type {
  BairroEntrega,
  Configuracao,
  ItemCardapio,
  Restaurante,
  Usuario,
} from "@/types/database";
import type { PedidoComItens } from "@/lib/pedidos-servidor";

export type ResumoDia = {
  data?: string;
  data_label?: string;
  qtd_pedidos: number;
  faturamento: number;
  faturamento_pix?: number;
  faturamento_dinheiro?: number;
  comissao: number;
  ticket_medio: number;
  taxa_entrega_total?: number;
  entregues?: number;
  cancelados?: number;
  em_andamento?: number;
  por_loja?: {
    nome: string;
    pedidos: number;
    faturamento: number;
    comissao: number;
  }[];
  por_entregador?: {
    nome: string;
    entregas: number;
    valor: number;
  }[];
};

export type PedidoDono = PedidoComItens & {
  restaurante_nome: string;
  comissao_percentual: number;
  comissao_valor: number;
};

export async function buscarResumoDia() {
  const resposta = await fetch("/api/dono/resumo", { cache: "no-store" });
  const json = (await resposta.json()) as {
    resumo?: ResumoDia;
    erro?: string;
  };
  if (!resposta.ok) throw new Error(json.erro ?? "Erro ao carregar resumo.");
  return json.resumo!;
}

export async function buscarPedidosDono() {
  const resposta = await fetch("/api/dono/pedidos", { cache: "no-store" });
  const json = (await resposta.json()) as {
    pedidos?: PedidoDono[];
    erro?: string;
  };
  if (!resposta.ok) throw new Error(json.erro ?? "Erro ao carregar pedidos.");
  return json.pedidos ?? [];
}

export async function buscarRestaurantesDono() {
  const resposta = await fetch("/api/dono/restaurantes", { cache: "no-store" });
  const json = (await resposta.json()) as {
    restaurantes?: Restaurante[];
    erro?: string;
  };
  if (!resposta.ok)
    throw new Error(json.erro ?? "Erro ao carregar restaurantes.");
  return json.restaurantes ?? [];
}

export async function atualizarRestauranteDono(entrada: {
  id: string;
  nome?: string;
  descricao?: string | null;
  endereco?: string | null;
  comissao_percentual?: number;
  ativo?: boolean;
  pedido_minimo?: number;
}) {
  const resposta = await fetch("/api/dono/restaurantes", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entrada),
  });
  const json = (await resposta.json()) as { erro?: string };
  if (!resposta.ok) throw new Error(json.erro ?? "Erro ao salvar restaurante.");
}

export async function criarRestauranteDono(entrada: {
  nome: string;
  descricao?: string;
  endereco?: string;
  comissao_percentual?: number;
}) {
  const resposta = await fetch("/api/dono/restaurantes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entrada),
  });
  const json = (await resposta.json()) as {
    restaurante?: Restaurante;
    usuario?: Usuario;
    erro?: string;
  };
  if (!resposta.ok) throw new Error(json.erro ?? "Erro ao criar restaurante.");
  return { restaurante: json.restaurante!, usuario: json.usuario! };
}

export async function buscarCardapioDono(restauranteId: string) {
  const resposta = await fetch(`/api/dono/restaurantes/${restauranteId}/cardapio`, {
    cache: "no-store",
  });
  const json = (await resposta.json()) as {
    cardapio?: ItemCardapio[];
    erro?: string;
  };
  if (!resposta.ok) throw new Error(json.erro ?? "Erro ao carregar cardápio.");
  return json.cardapio ?? [];
}

export async function criarItemCardapioDono(
  restauranteId: string,
  entrada: {
    nome: string;
    descricao?: string;
    preco: number;
    disponivel?: boolean;
  },
) {
  const resposta = await fetch(
    `/api/dono/restaurantes/${restauranteId}/cardapio`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entrada),
    },
  );
  const json = (await resposta.json()) as { erro?: string };
  if (!resposta.ok) throw new Error(json.erro ?? "Erro ao criar prato.");
}

export async function atualizarItemCardapioDono(
  itemId: string,
  entrada: {
    nome?: string;
    descricao?: string | null;
    preco?: number;
    disponivel?: boolean;
  },
) {
  const resposta = await fetch(`/api/dono/cardapio/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entrada),
  });
  const json = (await resposta.json()) as { erro?: string };
  if (!resposta.ok) throw new Error(json.erro ?? "Erro ao salvar prato.");
}

export type GanhosEntregadorDono = {
  entregador_id: string;
  nome: string;
  telefone: string | null;
  entregas: number;
  valor: number;
};

export async function buscarEntregadoresDono() {
  const resposta = await fetch("/api/dono/entregadores", { cache: "no-store" });
  const json = (await resposta.json()) as {
    entregadores?: Usuario[];
    ganhos?: GanhosEntregadorDono[];
    erro?: string;
  };
  if (!resposta.ok)
    throw new Error(json.erro ?? "Erro ao carregar entregadores.");
  return {
    entregadores: json.entregadores ?? [],
    ganhos: json.ganhos ?? [],
  };
}

/** Dono atribui / troca / libera entregador no pedido */
export async function atribuirEntregadorDono(
  pedidoId: string,
  entrada: { entregadorId?: string; liberar?: boolean },
) {
  const resposta = await fetch(`/api/dono/pedidos/${pedidoId}/atribuir`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entrada),
  });
  const json = (await resposta.json()) as { erro?: string };
  if (!resposta.ok) {
    throw new Error(json.erro ?? "Não foi possível atribuir o entregador.");
  }
}

export async function criarEntregadorDono(entrada: {
  nome: string;
  email: string;
  telefone?: string;
  senha: string;
}) {
  const resposta = await fetch("/api/dono/entregadores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entrada),
  });
  const json = (await resposta.json()) as { erro?: string };
  if (!resposta.ok) throw new Error(json.erro ?? "Erro ao criar entregador.");
}

export async function buscarConfiguracaoDono() {
  const resposta = await fetch("/api/dono/configuracao", { cache: "no-store" });
  const json = (await resposta.json()) as {
    configuracao?: Configuracao;
    erro?: string;
  };
  if (!resposta.ok)
    throw new Error(json.erro ?? "Erro ao carregar configuração.");
  return json.configuracao!;
}

export async function salvarConfiguracaoDono(config: Configuracao) {
  const resposta = await fetch("/api/dono/configuracao", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  const json = (await resposta.json()) as {
    configuracao?: Configuracao;
    erro?: string;
  };
  if (!resposta.ok) throw new Error(json.erro ?? "Erro ao salvar configuração.");
  return json.configuracao!;
}

export async function buscarConfiguracaoPublica() {
  const resposta = await fetch("/api/configuracao", { cache: "no-store" });
  const json = (await resposta.json()) as {
    configuracao?: Configuracao;
    erro?: string;
  };
  if (!resposta.ok) {
    throw new Error(json.erro ?? "Erro ao carregar configuração.");
  }
  return json.configuracao!;
}

export async function buscarTaxaEntrega() {
  const config = await buscarConfiguracaoPublica();
  return Number(config.taxa_entrega);
}

export async function buscarBairrosAtivos() {
  const resposta = await fetch("/api/bairros", { cache: "no-store" });
  const json = (await resposta.json()) as {
    bairros?: BairroEntrega[];
    erro?: string;
  };
  if (!resposta.ok) throw new Error(json.erro ?? "Erro ao carregar bairros.");
  return json.bairros ?? [];
}

export async function buscarBairrosDono() {
  const resposta = await fetch("/api/dono/bairros", { cache: "no-store" });
  const json = (await resposta.json()) as {
    bairros?: BairroEntrega[];
    erro?: string;
  };
  if (!resposta.ok) throw new Error(json.erro ?? "Erro ao carregar bairros.");
  return json.bairros ?? [];
}

export async function salvarBairroDono(entrada: {
  id?: string;
  nome: string;
  taxa: number;
  ativo: boolean;
  ordem?: number;
}) {
  if (entrada.id) {
    const resposta = await fetch(
      `/api/dono/bairros?id=${encodeURIComponent(entrada.id)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: entrada.nome,
          taxa: entrada.taxa,
          ativo: entrada.ativo,
          ordem: entrada.ordem,
        }),
      },
    );
    const json = (await resposta.json()) as {
      bairro?: BairroEntrega;
      erro?: string;
    };
    if (!resposta.ok) throw new Error(json.erro ?? "Erro ao salvar bairro.");
    return json.bairro!;
  }

  const resposta = await fetch("/api/dono/bairros", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entrada),
  });
  const json = (await resposta.json()) as {
    bairro?: BairroEntrega;
    erro?: string;
  };
  if (!resposta.ok) throw new Error(json.erro ?? "Erro ao criar bairro.");
  return json.bairro!;
}

export async function excluirBairroDono(id: string) {
  const resposta = await fetch(
    `/api/dono/bairros?id=${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  const json = (await resposta.json()) as { erro?: string };
  if (!resposta.ok) throw new Error(json.erro ?? "Erro ao excluir bairro.");
}
