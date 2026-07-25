import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

/** Gera hash seguro para guardar a senha */
export function gerarHashSenha(senha: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(senha, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/** Confere senha digitada com o hash guardado */
export function verificarSenha(senha: string, senhaHash: string) {
  const [salt, hash] = senhaHash.split(":");
  if (!salt || !hash) return false;
  const tentado = scryptSync(senha, salt, 64);
  const original = Buffer.from(hash, "hex");
  if (original.length !== tentado.length) return false;
  return timingSafeEqual(original, tentado);
}
