import { redirect } from "next/navigation";
import { lerSessao } from "@/lib/auth-servidor";
import { MARCA } from "@/lib/marca";
import { FormAdminLogin } from "./form-admin-login";

export const metadata = {
  title: "Admin — Tentações da Neuza",
  description: "Área administrativa do delivery.",
};

export default async function PaginaAdmin() {
  const sessao = await lerSessao();
  if (sessao?.papel === "dono") {
    redirect("/dono");
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-4 py-12">
      <header className="flex flex-col gap-2 text-center">
        <p className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
          Área restrita
        </p>
        <h1 className="font-display text-3xl text-foreground">Admin</h1>
        <p className="text-sm leading-relaxed text-muted">
          Gestão de {MARCA.nome}. Só contas de administrador.
        </p>
      </header>

      <FormAdminLogin />
    </div>
  );
}
