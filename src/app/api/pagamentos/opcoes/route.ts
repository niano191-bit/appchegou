import { NextResponse } from "next/server";
import {
  lerConfiguracaoLocal,
  usandoModoDemo,
} from "@/lib/local-db";
import { isLucPagueiConfigured } from "@/lib/lucpaguei";
import { isMercadoPagoConfigured } from "@/lib/mercadopago";
import { lerConfiguracao } from "@/lib/pedidos-servidor";

/** Quais gateways o dono liberou e se as chaves estão no servidor */
export async function GET() {
  try {
    const config = usandoModoDemo()
      ? await lerConfiguracaoLocal()
      : await lerConfiguracao();

    return NextResponse.json({
      mercadopago: {
        ativo: config.pagamento_mercadopago,
        configurado: isMercadoPagoConfigured(),
      },
      lucpaguei: {
        ativo: config.pagamento_lucpaguei,
        configurado: isLucPagueiConfigured(),
      },
      dinheiro: {
        ativo: config.pagamento_dinheiro,
      },
    });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao carregar opções de pagamento.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
