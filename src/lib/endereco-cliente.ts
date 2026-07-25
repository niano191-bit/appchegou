const CHAVE = "chegou_endereco_entrega";

/** Último endereço usado no pedido (navegador) */
export function lerEnderecoSalvo() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(CHAVE)?.trim() ?? "";
}

export function salvarEndereco(endereco: string) {
  if (typeof window === "undefined") return;
  const limpo = endereco.trim();
  if (limpo) localStorage.setItem(CHAVE, limpo);
}
