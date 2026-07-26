"use client";

import { Component, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  titulo?: string;
};

type State = {
  erro: Error | null;
};

/** Captura crash de render e mostra a mensagem (em vez da tela genérica) */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { erro: null };

  static getDerivedStateFromError(erro: Error): State {
    return { erro };
  }

  render() {
    if (this.state.erro) {
      const msg = this.state.erro.message || String(this.state.erro);
      const ehChunk =
        /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module/i.test(
          msg,
        ) || /ChunkLoadError/i.test(this.state.erro.name);

      return (
        <div className="rounded-2xl border border-dende/40 bg-dende-suave px-5 py-6 text-sm">
          <p className="font-semibold text-dende-escuro">
            {this.props.titulo ?? "Algo deu errado nesta tela"}
          </p>
          <p className="mt-2 text-muted">{msg}</p>
          <button
            type="button"
            className="mt-4 rounded-xl bg-dende px-4 py-2.5 text-sm font-semibold text-white"
            onClick={() => {
              if (ehChunk) {
                window.location.reload();
                return;
              }
              this.setState({ erro: null });
              window.location.reload();
            }}
          >
            Recarregar página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
