-- ============================================================
-- Fase 14 — Pedido pode ser cancelado pelo cliente
-- ============================================================

alter type status_pedido add value if not exists 'cancelado';
