-- Fase 26 — Dono pode cancelar pedido (crise / atraso)
-- Rode no SQL Editor do Supabase apos a 017.

alter table pedidos drop constraint if exists pedidos_cancelado_por_check;

alter table pedidos
  add constraint pedidos_cancelado_por_check
  check (
    cancelado_por is null
    or cancelado_por in ('cliente', 'restaurante', 'dono')
  );

comment on column pedidos.cancelado_por is
  'Quem cancelou: cliente, restaurante ou dono';
