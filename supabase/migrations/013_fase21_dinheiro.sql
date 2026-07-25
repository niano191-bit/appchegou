-- Fase 21 — Dinheiro na entrega (+ troco)
-- Rode no SQL Editor do Supabase após a 012.

alter table configuracao
  add column if not exists pagamento_dinheiro boolean not null default true;

comment on column configuracao.pagamento_dinheiro is
  'Aceitar pagamento em dinheiro na entrega';

alter table pedidos
  add column if not exists troco_para numeric(10,2);

comment on column pedidos.troco_para is
  'Valor que o cliente vai pagar em dinheiro (para calcular troco)';
