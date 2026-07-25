-- Fase 28 — Chave Pix da loja (para repasse no fechamento)
-- Rode no SQL Editor do Supabase apos a 019.

alter table restaurantes
  add column if not exists chave_pix text;

comment on column restaurantes.chave_pix is
  'Chave Pix da loja para o dono fazer o repasse do dia';
