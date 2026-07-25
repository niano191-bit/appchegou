/** Lê arquivo de imagem no navegador e devolve data URL (máx. ~350 KB) */
export function lerImagemComoDataUrl(arquivo: File): Promise<string> {
  const maxBytes = 350_000;
  if (!arquivo.type.startsWith("image/")) {
    return Promise.reject(new Error("Envie um arquivo de imagem."));
  }
  if (arquivo.size > maxBytes) {
    return Promise.reject(
      new Error("Imagem grande demais. Use até ~350 KB ou um link da web."),
    );
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Não foi possível ler a imagem."));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error("Falha ao ler a imagem."));
    reader.readAsDataURL(arquivo);
  });
}
