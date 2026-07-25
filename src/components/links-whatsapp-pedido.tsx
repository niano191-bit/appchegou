import {
  linkWhatsAppClienteComanda,
  linkWhatsAppCompartilharComanda,
} from "@/lib/resumo-whatsapp";
import type { PedidoComItens } from "@/lib/pedidos";

type Props = {
  pedido: PedidoComItens & { restaurante_nome?: string | null };
};

/** Enviar / compartilhar comanda pelo WhatsApp */
export function LinksWhatsAppPedido({ pedido }: Props) {
  const paraCliente = linkWhatsAppClienteComanda(pedido);
  const compartilhar = linkWhatsAppCompartilharComanda(pedido);

  return (
    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
      {paraCliente ? (
        <a
          href={paraCliente}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-xl border border-mar/40 bg-mar-suave/50 px-3 py-2.5 text-center text-sm font-semibold text-mar"
        >
          WhatsApp do cliente
        </a>
      ) : null}
      <a
        href={compartilhar}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 rounded-xl border border-linha bg-white px-3 py-2.5 text-center text-sm font-semibold text-foreground"
      >
        Compartilhar comanda
      </a>
    </div>
  );
}
