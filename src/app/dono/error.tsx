"use client";

export default function ErroDono({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const msg = error.message || "Erro desconhecido";
  const ehChunk =
    /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module/i.test(
      msg,
    );

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-4 px-4 py-16">
      <h1 className="font-display text-2xl text-foreground">
        Painel Admin não carregou
      </h1>
      <p className="text-sm text-muted">{msg}</p>
      {error.digest ? (
        <p className="text-xs text-muted">Código: {error.digest}</p>
      ) : null}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => {
            if (ehChunk) {
              window.location.href = "/dono";
              return;
            }
            reset();
          }}
          className="rounded-xl bg-dende px-4 py-3 text-sm font-semibold text-white"
        >
          Tentar de novo
        </button>
        <a
          href="/admin"
          className="rounded-xl border border-linha px-4 py-3 text-center text-sm font-semibold text-foreground"
        >
          Voltar ao login Admin
        </a>
      </div>
    </div>
  );
}
