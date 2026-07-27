import type { BannerVitrine, CategoriaVitrine } from "@/types/database";

export function bannersPadrao(criado = new Date().toISOString()): BannerVitrine[] {
  return [
    {
      id: "bann0001-0000-0000-0000-000000000001",
      imagem_url: null,
      titulo: "O sabor da Bahia",
      texto: "Peça agora e receba quentinho na sua porta.",
      tom: "dende",
      ativo: true,
      ordem: 1,
      criado_em: criado,
    },
    {
      id: "bann0002-0000-0000-0000-000000000001",
      imagem_url: null,
      titulo: "Acompanhe ao vivo",
      texto: "Do fogão à entrega — status em tempo real.",
      tom: "mar",
      ativo: true,
      ordem: 2,
      criado_em: criado,
    },
  ];
}

export function categoriasPadrao(
  criado = new Date().toISOString(),
): CategoriaVitrine[] {
  return [
    {
      id: "cat00001-0000-0000-0000-000000000001",
      nome: "Todos",
      emoji: "🍽️",
      imagem_url: null,
      palavras_chave: "",
      ativo: true,
      ordem: 0,
      criado_em: criado,
    },
    {
      id: "cat00002-0000-0000-0000-000000000001",
      nome: "Baiana",
      emoji: "🌴",
      imagem_url: null,
      palavras_chave:
        "acaraj,moqueca,vatap,baian,dend,abar,xinxim,caruru,bobo",
      ativo: true,
      ordem: 1,
      criado_em: criado,
    },
    {
      id: "cat00003-0000-0000-0000-000000000001",
      nome: "Lanches",
      emoji: "🍔",
      imagem_url: null,
      palavras_chave: "lanche,hamb,burger,sandu,hot dog,pastel",
      ativo: true,
      ordem: 2,
      criado_em: criado,
    },
    {
      id: "cat00004-0000-0000-0000-000000000001",
      nome: "Peixe",
      emoji: "🐟",
      imagem_url: null,
      palavras_chave: "peixe,camarao,camarão,frutos,marisco,siri,moqueca",
      ativo: true,
      ordem: 3,
      criado_em: criado,
    },
    {
      id: "cat00005-0000-0000-0000-000000000001",
      nome: "Pizza",
      emoji: "🍕",
      imagem_url: null,
      palavras_chave: "pizza,italiana,massa",
      ativo: true,
      ordem: 4,
      criado_em: criado,
    },
    {
      id: "cat00006-0000-0000-0000-000000000001",
      nome: "Doces",
      emoji: "🍰",
      imagem_url: null,
      palavras_chave: "doce,sobremesa,bolo,pudim,brigadeiro,sorvete",
      ativo: true,
      ordem: 5,
      criado_em: criado,
    },
    {
      id: "cat00007-0000-0000-0000-000000000001",
      nome: "Saudável",
      emoji: "🥗",
      imagem_url: null,
      palavras_chave: "saudav,saudáv,salada,light,fit,natural",
      ativo: true,
      ordem: 6,
      criado_em: criado,
    },
  ];
}

/** Monta regex a partir das palavras-chave separadas por vírgula */
export function regexDePalavrasChave(palavras: string): RegExp | null {
  const partes = palavras
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (partes.length === 0) return null;
  return new RegExp(partes.join("|"), "i");
}

export function classeTomBanner(tom: string | null | undefined) {
  return tom === "mar" ? "from-mar to-teal-800" : "from-dende to-dende-escuro";
}
