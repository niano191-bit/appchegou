import { linkGoogleMaps, linkWaze } from "@/lib/navegacao";

/** Botões Maps / Waze para um endereço */
export function LinksNavegacao({
  endereco,
  rotulo,
}: {
  endereco?: string | null;
  rotulo?: string;
}) {
  const texto = endereco?.trim();
  if (!texto) return null;

  return (
    <div className="mt-2 space-y-1.5">
      {rotulo ? (
        <p className="text-xs font-medium text-muted uppercase">{rotulo}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <a
          href={linkGoogleMaps(texto)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex rounded-lg border border-mar px-3 py-1.5 text-xs font-semibold text-mar"
        >
          Abrir no Maps
        </a>
        <a
          href={linkWaze(texto)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex rounded-lg border border-foreground/20 px-3 py-1.5 text-xs font-semibold text-foreground"
        >
          Abrir no Waze
        </a>
      </div>
    </div>
  );
}
