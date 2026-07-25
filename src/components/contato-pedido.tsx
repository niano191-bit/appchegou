import {
  formatarTelefoneExibicao,
  linkWhatsApp,
} from "@/lib/contato";

/** Nome, telefone e WhatsApp do cliente (loja / entregador) */
export function ContatoPedido({
  nome,
  telefone,
  enderecoLoja,
  mostrarLoja = false,
}: {
  nome?: string | null;
  telefone?: string | null;
  enderecoLoja?: string | null;
  mostrarLoja?: boolean;
}) {
  const whats = linkWhatsApp(
    telefone,
    "Olá! Sobre seu pedido na Tentações da Neuza.",
  );

  return (
    <div className="mt-3 space-y-1.5 rounded-xl bg-mar-suave/40 px-3 py-2.5 text-sm">
      <p className="font-medium text-foreground">
        Cliente: {nome?.trim() || "Cliente"}
      </p>
      <p className="text-muted">{formatarTelefoneExibicao(telefone)}</p>
      {whats ? (
        <a
          href={whats}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex font-semibold text-mar underline-offset-2 hover:underline"
        >
          Abrir WhatsApp
        </a>
      ) : null}
      {mostrarLoja && enderecoLoja?.trim() ? (
        <p className="border-t border-mar/20 pt-2 text-muted">
          <span className="font-medium text-foreground">Retirar na loja: </span>
          {enderecoLoja.trim()}
        </p>
      ) : null}
    </div>
  );
}
