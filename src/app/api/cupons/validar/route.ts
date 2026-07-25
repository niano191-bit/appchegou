import { NextResponse } from "next/server";
import { exigirSessao } from "@/lib/auth-servidor";
import {
  usandoModoDemo,
  validarCupomLocal,
} from "@/lib/local-db";
import { validarCupom } from "@/lib/pedidos-servidor";
import { textoCupom } from "@/lib/cupom";

/** Cliente valida cupom antes de fechar o pedido */
export async function POST(request: Request) {
  let corpo: { codigo?: string; subtotal?: number };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  const codigo = corpo.codigo?.trim() ?? "";
  const subtotal = Number(corpo.subtotal);
  if (!codigo) {
    return NextResponse.json({ erro: "Informe o cupom." }, { status: 400 });
  }
  if (!Number.isFinite(subtotal) || subtotal < 0) {
    return NextResponse.json({ erro: "Subtotal inválido." }, { status: 400 });
  }

  try {
    await exigirSessao("cliente");
    const resultado = usandoModoDemo()
      ? await validarCupomLocal(codigo, subtotal)
      : await validarCupom(codigo, subtotal);

    return NextResponse.json({
      codigo: resultado.codigo,
      desconto: resultado.desconto,
      rotulo: textoCupom(resultado.cupom),
      tipo: resultado.cupom.tipo,
      valor: resultado.cupom.valor,
    });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Não foi possível validar o cupom.";
    const status =
      mensagem.includes("login") || mensagem.includes("área") ? 401 : 400;
    return NextResponse.json({ erro: mensagem }, { status });
  }
}
