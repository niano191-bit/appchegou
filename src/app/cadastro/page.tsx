import Link from "next/link";
import { MarcaLogo } from "@/components/marca-logo";
import { FormCadastro } from "./form-cadastro";

export const metadata = {
  title: "Criar conta — Tentações da Neuza",
  description: "Cadastre-se para pedir comida baiana.",
};

export default function PaginaCadastro() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-4 py-10">
      <header className="flex flex-col items-center gap-4 text-center">
        <MarcaLogo tamanho="md" centralizado mostrarTagline />
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-3xl text-foreground">Criar conta</h1>
          <p className="text-sm leading-relaxed text-muted">
            Cadastro de cliente. Depois você já entra e pode pedir.
          </p>
        </div>
      </header>

      <FormCadastro />

      <p className="text-center text-sm text-muted">
        Já tem conta?{" "}
        <Link
          href="/login/cliente"
          className="font-medium text-dende underline-offset-2 hover:underline"
        >
          Entrar
        </Link>
      </p>
    </div>
  );
}
