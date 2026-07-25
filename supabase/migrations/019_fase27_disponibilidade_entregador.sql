-- Fase 27 — Disponibilidade do entregador (livre / em_rota / offline)
-- Rode no SQL Editor do Supabase apos a 018.

alter table usuarios
  add column if not exists disponibilidade text not null default 'offline';

alter table usuarios drop constraint if exists usuarios_disponibilidade_check;

alter table usuarios
  add constraint usuarios_disponibilidade_check
  check (disponibilidade in ('livre', 'em_rota', 'offline'));

comment on column usuarios.disponibilidade is
  'Entregador: livre | em_rota | offline. Outros papeis usam o default offline.';

create index if not exists idx_usuarios_entregador_disponibilidade
  on usuarios (papel, disponibilidade)
  where papel = 'entregador';
