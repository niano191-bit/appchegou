type Props = {
  titulo: string;
  texto: string;
};

/** Placeholder para funções ainda não disponíveis na loja */
export function EmBreve({ titulo, texto }: Props) {
  return (
    <div className="rounded-2xl border border-dashed border-linha bg-white px-5 py-10 text-center">
      <p className="text-sm font-semibold text-foreground">{titulo}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{texto}</p>
      <p className="mt-4 text-xs font-medium tracking-wide text-dende uppercase">
        Em breve
      </p>
    </div>
  );
}
