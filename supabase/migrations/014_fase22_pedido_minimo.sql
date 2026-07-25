-- Fase 22 — Pedido mínimo por loja
-- Rode no SQL Editor do Supabase após a 013.

alter table restaurantes
  add column if not exists pedido_minimo numeric(10,2) not null default 0
  check (pedido_minimo >= 0);

comment on column restaurantes.pedido_minimo is
  'Valor mínimo do subtotal (sem taxa de entrega) para aceitar o pedido';
