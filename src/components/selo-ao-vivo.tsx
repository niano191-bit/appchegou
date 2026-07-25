/** Indica que a tela atualiza sozinha */
export function SeloAoVivo() {
  return (
    <p className="inline-flex items-center gap-2 text-xs font-medium text-[#2F6B3A]">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2F6B3A] opacity-40" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#2F6B3A]" />
      </span>
      Atualização ao vivo
    </p>
  );
}
