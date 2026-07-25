-- Fase 23 — Cupons de desconto
-- Rode no SQL Editor do Supabase após a 014.

create table if not exists cupons (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  tipo text not null check (tipo in ('percent', 'fix')),
  valor numeric(10,2) not null check (valor > 0),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create unique index if not exists cupons_codigo_unico
  on cupons (upper(codigo));

comment on table cupons is 'Códigos de desconto liberados pelo dono';

alter table pedidos
  add column if not exists desconto numeric(10,2) not null default 0
  check (desconto >= 0);

alter table pedidos
  add column if not exists cupom_codigo text;

comment on column pedidos.desconto is
  'Valor abatido do subtotal dos itens (sem taxa de entrega)';
comment on column pedidos.cupom_codigo is
  'Código do cupom usado neste pedido';

insert into cupons (codigo, tipo, valor, ativo)
select 'DEMO10', 'percent', 10, true
where not exists (
  select 1 from cupons where upper(codigo) = 'DEMO10'
);
