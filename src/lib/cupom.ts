import type { Cupom } from "@/types/database";
import { formatarReais } from "@/types/database";

export function normalizarCodigoCupom(codigo: string) {
  return codigo.trim().toUpperCase().replace(/\s+/g, "");
}

/** Calcula desconto sobre o subtotal dos itens (não inclui taxa) */
export function calcularDescontoCupom(
  cupom: Pick<Cupom, "tipo" | "valor" | "ativo">,
  subtotal: number,
) {
  if (!cupom.ativo) {
    throw new Error("Este cupom está desativado.");
  }
  const base = Math.max(0, Number(subtotal));
  if (base <= 0) return 0;

  const valor = Number(cupom.valor);
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new Error("Cupom inválido.");
  }

  let desconto = 0;
  if (cupom.tipo === "percent") {
    if (valor > 100) {
      throw new Error("Percentual do cupom inválido.");
    }
    desconto = (base * valor) / 100;
  } else {
    desconto = valor;
  }

  return Number(Math.min(desconto, base).toFixed(2));
}

export function textoCupom(cupom: Pick<Cupom, "tipo" | "valor" | "codigo">) {
  const rotulo =
    cupom.tipo === "percent"
      ? `${Number(cupom.valor)}%`
      : formatarReais(Number(cupom.valor));
  return `${cupom.codigo} · ${rotulo}`;
}
