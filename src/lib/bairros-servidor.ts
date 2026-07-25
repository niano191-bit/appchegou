import type { BairroEntrega } from "@/types/database";
import { createSupabaseClient } from "@/lib/supabase/client";

export async function listarBairros(apenasAtivos = false) {
  const supabase = createSupabaseClient();
  let q = supabase
    .from("bairros_entrega")
    .select("*")
    .order("ordem", { ascending: true })
    .order("nome", { ascending: true });

  if (apenasAtivos) q = q.eq("ativo", true);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((b) => ({
    ...b,
    taxa: Number(b.taxa),
  })) as BairroEntrega[];
}

export async function buscarBairro(id: string) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("bairros_entrega")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return { ...data, taxa: Number(data.taxa) } as BairroEntrega;
}

export async function criarBairro(entrada: {
  nome: string;
  taxa: number;
  ativo?: boolean;
  ordem?: number;
}) {
  const nome = entrada.nome.trim();
  if (!nome) throw new Error("Informe o nome do bairro.");
  const taxa = Number(entrada.taxa);
  if (Number.isNaN(taxa) || taxa < 0) throw new Error("Taxa inválida.");

  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("bairros_entrega")
    .insert({
      nome,
      taxa,
      ativo: entrada.ativo ?? true,
      ordem: Number(entrada.ordem ?? 0),
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return { ...data, taxa: Number(data.taxa) } as BairroEntrega;
}

export async function atualizarBairro(
  id: string,
  patch: {
    nome?: string;
    taxa?: number;
    ativo?: boolean;
    ordem?: number;
  },
) {
  const limpo: Record<string, unknown> = {};
  if (patch.nome !== undefined) {
    const nome = patch.nome.trim();
    if (!nome) throw new Error("Informe o nome do bairro.");
    limpo.nome = nome;
  }
  if (patch.taxa !== undefined) {
    const taxa = Number(patch.taxa);
    if (Number.isNaN(taxa) || taxa < 0) throw new Error("Taxa inválida.");
    limpo.taxa = taxa;
  }
  if (patch.ativo !== undefined) limpo.ativo = patch.ativo;
  if (patch.ordem !== undefined) limpo.ordem = Number(patch.ordem) || 0;

  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("bairros_entrega")
    .update(limpo)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return { ...data, taxa: Number(data.taxa) } as BairroEntrega;
}

export async function excluirBairro(id: string) {
  const supabase = createSupabaseClient();
  const { error } = await supabase.from("bairros_entrega").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
