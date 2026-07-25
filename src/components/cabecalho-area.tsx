import Link from "next/link";
import { BotaoSair } from "@/components/botao-sair";
import { MarcaLogo } from "@/components/marca-logo";

type Props = {
  rotulo: string;
  titulo: string;
  descricao: string;
};

/** Cabeçalho padrão das áreas (cliente, loja, entregador, dono) */
export function CabecalhoArea({ rotulo, titulo, descricao }: Props) {
  return (
    <header className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <MarcaLogo tamanho="sm" />
        <BotaoSair />
      </div>
      <div className="flex flex-col gap-2">
        <Link
          href="/"
          className="text-sm font-medium text-dende underline-offset-2 hover:underline"
        >
          ← Início
        </Link>
        <p className="text-sm font-medium tracking-wide text-muted uppercase">
          {rotulo}
        </p>
        <h1 className="font-display text-3xl text-foreground">{titulo}</h1>
        <p className="text-sm leading-relaxed text-muted">{descricao}</p>
      </div>
    </header>
  );
}
