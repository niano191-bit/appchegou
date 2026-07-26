-- Fase 30 — Banner da home com imagem
-- Rode no SQL Editor do Supabase após a 021.

alter table banners_vitrine
  add column if not exists imagem_url text;

comment on column banners_vitrine.imagem_url is
  'URL da imagem do banner na home do cliente';
