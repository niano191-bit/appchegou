-- ============================================================
-- Fase 17 — Bairros de entrega com taxa por zona (Salvador)
-- ============================================================

create table if not exists bairros_entrega (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  taxa numeric(10,2) not null check (taxa >= 0),
  ativo boolean not null default true,
  ordem integer not null default 0,
  criado_em timestamptz not null default now()
);

create unique index if not exists bairros_entrega_nome_unico
  on bairros_entrega (lower(nome));

alter table bairros_entrega enable row level security;

drop policy if exists "dev_bairros_tudo" on bairros_entrega;
create policy "dev_bairros_tudo" on bairros_entrega
  for all using (true) with check (true);

alter table pedidos
  add column if not exists bairro_entrega text;

-- Seed inicial (só se a tabela estiver vazia)
insert into bairros_entrega (nome, taxa, ativo, ordem)
select * from (values
  ('Barra', 8.00, true, 10),
  ('Ondina', 8.00, true, 20),
  ('Rio Vermelho', 9.00, true, 30),
  ('Graça', 9.00, true, 40),
  ('Vitória', 9.00, true, 50),
  ('Centro / Pelourinho', 9.00, true, 60),
  ('Pituba', 10.00, true, 70),
  ('Itaigara', 10.00, true, 80),
  ('Costa Azul', 10.00, true, 90),
  ('Federação', 10.00, true, 100),
  ('Caminho das Árvores', 11.00, true, 110),
  ('Imbuí', 11.00, true, 120),
  ('Brotas', 11.00, true, 130),
  ('Horto Florestal', 12.00, true, 140),
  ('Paralela', 12.00, true, 150),
  ('Cabula', 12.00, true, 160),
  ('Patamares', 13.00, true, 170),
  ('São Marcos', 13.00, true, 180),
  ('Stella Maris', 14.00, true, 190),
  ('Itapuã', 14.00, true, 200)
) as v(nome, taxa, ativo, ordem)
where not exists (select 1 from bairros_entrega limit 1);
