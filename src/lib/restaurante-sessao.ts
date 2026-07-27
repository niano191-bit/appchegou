import type { SessaoUsuario } from "@/lib/auth";
import {
  listarRestaurantesLocal,
  usandoModoDemo,
} from "@/lib/local-db";
import { listarRestaurantes } from "@/lib/pedidos-servidor";

/** Loja ligada à sessão; Admin usa a primeira loja ativa se não tiver uma. */
export async function restauranteIdEfetivo(sessao: SessaoUsuario) {
  if (sessao.restaurante_id) return sessao.restaurante_id;
  if (sessao.papel !== "dono") return null;

  if (usandoModoDemo()) {
    const lista = await listarRestaurantesLocal();
    return lista[0]?.id ?? null;
  }
  const lista = await listarRestaurantes();
  return lista[0]?.id ?? null;
}
