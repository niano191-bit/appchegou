-- Fase 32 — Imagem nos botões de categoria da home

alter table categorias_vitrine
  add column if not exists imagem_url text;

comment on column categorias_vitrine.imagem_url is
  'URL da imagem do botão de categoria na home (opcional; senão usa emoji)';
