-- ============================================================
-- Fase 12 — Senha própria por usuário (cadastro real)
-- ============================================================

alter table usuarios
  add column if not exists senha_hash text;

comment on column usuarios.senha_hash is
  'Hash scrypt da senha. Contas antigas sem hash ainda aceitam a senha de teste.';
