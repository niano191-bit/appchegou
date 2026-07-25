-- Fase 19 — Tempo estimado de entrega (ETA) ao aceitar o pedido
-- Rode no SQL Editor do Supabase após a 010.

alter table pedidos
  add column if not exists tempo_estimado_minutos integer;

alter table pedidos
  add column if not exists previsao_entrega_em timestamptz;

comment on column pedidos.tempo_estimado_minutos is
  'Minutos estimados informados pela loja ao aceitar';
comment on column pedidos.previsao_entrega_em is
  'Horario previsto de entrega (aceitacao + minutos)';
