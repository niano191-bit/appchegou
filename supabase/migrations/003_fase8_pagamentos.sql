-- Fase 8 — Campos de pagamento no pedido
-- Rode no SQL Editor do Supabase quando for ligar o banco na nuvem.

do $$ begin
  create type status_pagamento as enum ('pendente', 'pago', 'falhou');
exception when duplicate_object then null;
end $$;

alter table pedidos
  add column if not exists status_pagamento status_pagamento not null default 'pendente';

alter table pedidos
  add column if not exists forma_pagamento text;

alter table pedidos
  add column if not exists mp_payment_id text;

-- Pedidos já existentes no banco de teste: marca como pagos
update pedidos
set status_pagamento = 'pago'
where status_pagamento = 'pendente'
  and criado_em < now();
