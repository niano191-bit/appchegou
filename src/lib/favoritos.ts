const CHAVE = "chegou_favoritos_lojas";

/** IDs das lojas favoritas do cliente (navegador) */
export function lerFavoritos(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return [];
    const lista = JSON.parse(bruto) as unknown;
    if (!Array.isArray(lista)) return [];
    return lista.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

export function salvarFavoritos(ids: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CHAVE, JSON.stringify([...new Set(ids)]));
}

export function ehFavorito(id: string) {
  return lerFavoritos().includes(id);
}

export function alternarFavorito(id: string): boolean {
  const atual = lerFavoritos();
  const idx = atual.indexOf(id);
  if (idx >= 0) {
    atual.splice(idx, 1);
    salvarFavoritos(atual);
    return false;
  }
  atual.push(id);
  salvarFavoritos(atual);
  return true;
}
