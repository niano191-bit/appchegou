-- ============================================================
-- Fase 15 — Quem cancelou / recusou o pedido (+ motivo opcional)
-- ============================================================

alter table pedidos
  add column if not exists cancelado_por text
    check (cancelado_por is null or cancelado_por in ('cliente', 'restaurante'));

alter table pedidos
  add column if not exists motivo_cancelamento text;
