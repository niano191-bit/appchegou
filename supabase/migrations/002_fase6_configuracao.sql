-- Fase 6 — Configurações do app (taxa e horário)
-- Rode no SQL Editor do Supabase quando for ligar o banco na nuvem.

create table if not exists configuracao (
  id integer primary key default 1 check (id = 1),
  taxa_entrega numeric(10,2) not null default 8.00 check (taxa_entrega >= 0),
  horario_abertura text not null default '10:00',
  horario_fechamento text not null default '22:00',
  atualizado_em timestamptz not null default now()
);

alter table configuracao enable row level security;

drop policy if exists "dev_configuracao_tudo" on configuracao;
create policy "dev_configuracao_tudo" on configuracao
  for all using (true) with check (true);

insert into configuracao (id, taxa_entrega, horario_abertura, horario_fechamento)
values (1, 8.00, '10:00', '22:00')
on conflict (id) do nothing;
