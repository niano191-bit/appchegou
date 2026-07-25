/** Só dígitos; adiciona 55 se for celular BR sem DDI */
export function telefoneParaWhatsApp(
  telefone: string | null | undefined,
): string | null {
  if (!telefone?.trim()) return null;
  let digitos = telefone.replace(/\D/g, "");
  if (!digitos) return null;
  if (digitos.length <= 11) digitos = `55${digitos}`;
  if (digitos.length < 12) return null;
  return digitos;
}

export function linkWhatsApp(
  telefone: string | null | undefined,
  mensagem?: string,
): string | null {
  const digitos = telefoneParaWhatsApp(telefone);
  if (!digitos) return null;
  const base = `https://wa.me/${digitos}`;
  if (!mensagem?.trim()) return base;
  return `${base}?text=${encodeURIComponent(mensagem.trim())}`;
}

export function formatarTelefoneExibicao(
  telefone: string | null | undefined,
): string {
  if (!telefone?.trim()) return "Sem telefone";
  const d = telefone.replace(/\D/g, "");
  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return telefone.trim();
}
