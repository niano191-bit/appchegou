-- Fase 25 — Horario por loja + gorjeta ao entregador
-- Rode no SQL Editor do Supabase apos a 016.

alter table restaurantes
  add column if not exists horario_abertura text;

alter table restaurantes
  add column if not exists horario_fechamento text;

comment on column restaurantes.horario_abertura is
  'Horario da loja (HH:MM). Null = usa o horario geral do app';
comment on column restaurantes.horario_fechamento is
  'Horario da loja (HH:MM). Null = usa o horario geral do app';

alter table pedidos
  add column if not exists gorjeta numeric(10,2) not null default 0
  check (gorjeta >= 0);

comment on column pedidos.gorjeta is
  'Gorjeta opcional para o entregador';
