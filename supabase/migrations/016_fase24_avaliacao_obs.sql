-- Fase 24 — Avaliacao do pedido + observacao por item
-- Rode no SQL Editor do Supabase apos a 015.

alter table pedidos
  add column if not exists avaliacao_nota smallint
  check (avaliacao_nota is null or (avaliacao_nota >= 1 and avaliacao_nota <= 5));

alter table pedidos
  add column if not exists avaliacao_comentario text;

alter table pedidos
  add column if not exists avaliado_em timestamptz;

comment on column pedidos.avaliacao_nota is
  'Nota 1 a 5 dada pelo cliente apos a entrega';
comment on column pedidos.avaliacao_comentario is
  'Comentario opcional da avaliacao';
comment on column pedidos.avaliado_em is
  'Quando o cliente avaliou';

alter table itens_pedido
  add column if not exists observacao text;

comment on column itens_pedido.observacao is
  'Observacao do cliente para este item (ex.: sem pimenta)';
