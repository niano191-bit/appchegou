-- Fase 20 — Número do pedido do dia (#1, #2…)
-- Rode no SQL Editor do Supabase após a 011.

alter table pedidos
  add column if not exists numero_dia integer;

alter table pedidos
  add column if not exists data_pedido date;

comment on column pedidos.numero_dia is
  'Numero sequencial do dia (Salvador)';
comment on column pedidos.data_pedido is
  'Data civil do pedido em America/Sao_Paulo';

create unique index if not exists pedidos_data_numero_uidx
  on pedidos (data_pedido, numero_dia)
  where data_pedido is not null and numero_dia is not null;
