-- ============================================================
-- Fase 16 — Loja pode pausar pedidos (além do horário global)
-- ============================================================

alter table restaurantes
  add column if not exists pausado boolean not null default false;
