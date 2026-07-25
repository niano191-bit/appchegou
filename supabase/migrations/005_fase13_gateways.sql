-- ============================================================
-- Fase 13 — Opções de pagamento: Mercado Pago e LucPaguei
-- ============================================================

alter table configuracao
  add column if not exists pagamento_mercadopago boolean not null default true;

alter table configuracao
  add column if not exists pagamento_lucpaguei boolean not null default true;

comment on column configuracao.pagamento_mercadopago is
  'Se true, o cliente pode pagar com Mercado Pago';
comment on column configuracao.pagamento_lucpaguei is
  'Se true, o cliente pode pagar com LucPaguei';
