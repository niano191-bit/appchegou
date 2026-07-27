import { NextResponse } from "next/server";
import { exigirSessao } from "@/lib/auth-servidor";
import { uploadImagemVitrine } from "@/lib/upload-vitrine";

/** Upload de imagem de banner (Admin) */
export async function POST(request: Request) {
  try {
    await exigirSessao("dono");
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Faça login na área Admin.";
    return NextResponse.json({ erro: mensagem }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ erro: "Formulário inválido." }, { status: 400 });
  }

  const arquivo = form.get("arquivo");
  if (!(arquivo instanceof File)) {
    return NextResponse.json(
      { erro: "Selecione uma imagem para enviar." },
      { status: 400 },
    );
  }

  const pastaRaw = String(form.get("pasta") ?? "banners");
  const pasta = pastaRaw === "categorias" ? "categorias" : "banners";

  try {
    const url = await uploadImagemVitrine(arquivo, pasta);
    return NextResponse.json({ url });
  } catch (e) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao enviar imagem.";
    return NextResponse.json({ erro: mensagem }, { status: 400 });
  }
}
