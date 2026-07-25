import Link from "next/link";
import { MARCA } from "@/lib/marca";

type Props = {
  /** `null` = sem link; omitido = vai para `/` */
  href?: string | null;
  tamanho?: "sm" | "md" | "lg";
  centralizado?: boolean;
  mostrarTagline?: boolean;
};

/** Logo em texto da marca (sem arquivo de imagem) */
export function MarcaLogo({
  href,
  tamanho = "md",
  centralizado = false,
  mostrarTagline = false,
}: Props) {
  const destino = href === null ? null : (href ?? "/");
  const titulo =
    tamanho === "lg"
      ? "text-4xl sm:text-5xl leading-[1.1]"
      : tamanho === "sm"
        ? "text-xl leading-tight"
        : "text-2xl leading-tight";

  const conteudo = (
    <span
      className={`inline-flex flex-col ${centralizado ? "items-center text-center" : "items-start text-left"}`}
    >
      <span className="inline-flex items-center gap-2">
        <span
          aria-hidden
          className={`marca-selo shrink-0 rounded-full bg-dende ${
            tamanho === "lg" ? "h-3 w-3" : tamanho === "sm" ? "h-2 w-2" : "h-2.5 w-2.5"
          }`}
        />
        <span className={`font-display font-semibold tracking-tight text-foreground ${titulo}`}>
          <span className="text-dende">{MARCA.nomeCurto}</span>
          <span className="text-foreground"> da Neuza</span>
        </span>
      </span>
      {mostrarTagline ? (
        <span className="mt-2 text-sm font-medium tracking-wide text-muted uppercase">
          {MARCA.tagline}
        </span>
      ) : null}
    </span>
  );

  if (destino === null) return conteudo;

  return (
    <Link href={destino} className="inline-block transition hover:opacity-90">
      {conteudo}
    </Link>
  );
}
