import Image from "next/image";
import Link from "next/link";
import { MARCA } from "@/lib/marca";

type Props = {
  /** `null` = sem link; omitido = vai para `/` */
  href?: string | null;
  tamanho?: "sm" | "md" | "lg";
  centralizado?: boolean;
  mostrarTagline?: boolean;
  /** Só o selo redondo, sem o nome ao lado */
  soSelo?: boolean;
};

const TAMANHO_IMG = {
  sm: 36,
  md: 52,
  lg: 96,
} as const;

/** Logo da marca: selo + nome */
export function MarcaLogo({
  href,
  tamanho = "md",
  centralizado = false,
  mostrarTagline = false,
  soSelo = false,
}: Props) {
  const destino = href === null ? null : (href ?? "/");
  const px = TAMANHO_IMG[tamanho];
  const titulo =
    tamanho === "lg"
      ? "text-4xl sm:text-5xl leading-[1.1]"
      : tamanho === "sm"
        ? "text-xl leading-tight"
        : "text-2xl leading-tight";

  const selo = (
    <Image
      src="/logo-tentacoes.png"
      alt={soSelo ? MARCA.nome : ""}
      width={px}
      height={px}
      className="marca-selo shrink-0 rounded-full"
      priority={tamanho === "lg"}
    />
  );

  const conteudo = soSelo ? (
    selo
  ) : (
    <span
      className={`inline-flex flex-col ${centralizado ? "items-center text-center" : "items-start text-left"}`}
    >
      <span
        className={`inline-flex items-center ${tamanho === "lg" ? "flex-col gap-4" : "gap-2.5"}`}
      >
        {selo}
        <span
          className={`font-display font-semibold tracking-tight text-foreground ${titulo}`}
        >
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
