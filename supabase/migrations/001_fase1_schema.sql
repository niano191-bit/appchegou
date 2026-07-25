-- ============================================================
-- Fase 1 — Banco de dados do Chegou (dados de TESTE)
-- Cole este arquivo no SQL Editor do Supabase e clique em Run.
-- ============================================================

-- Papéis de usuário e status do pedido (listas fixas)
create type papel_usuario as enum ('cliente', 'restaurante', 'entregador', 'dono');
create type status_pedido as enum ('novo', 'aceito', 'pronto', 'a_caminho', 'entregue');

-- Usuários do app (cliente, loja, entregador ou dono)
create table usuarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text unique,
  telefone text,
  papel papel_usuario not null,
  restaurante_id uuid,
  criado_em timestamptz not null default now()
);

-- Restaurantes parceiros (comissão definida pelo dono)
create table restaurantes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  endereco text,
  imagem_url text,
  comissao_percentual numeric(5,2) not null default 10.00
    check (comissao_percentual >= 0 and comissao_percentual <= 100),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Liga o usuário-restaurante à loja dele
alter table usuarios
  add constraint usuarios_restaurante_id_fkey
  foreign key (restaurante_id) references restaurantes (id)
  on delete set null;

-- Itens do cardápio de cada restaurante
create table itens_cardapio (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references restaurantes (id) on delete cascade,
  nome text not null,
  descricao text,
  preco numeric(10,2) not null check (preco >= 0),
  disponivel boolean not null default true,
  imagem_url text,
  criado_em timestamptz not null default now()
);

-- Pedidos (fluxo: novo → aceito → pronto → a_caminho → entregue)
create table pedidos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references usuarios (id),
  restaurante_id uuid not null references restaurantes (id),
  entregador_id uuid references usuarios (id),
  status status_pedido not null default 'novo',
  total numeric(10,2) not null default 0 check (total >= 0),
  taxa_entrega numeric(10,2) not null default 0 check (taxa_entrega >= 0),
  endereco_entrega text not null,
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Itens dentro de cada pedido (guarda nome/preço do momento da compra)
create table itens_pedido (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos (id) on delete cascade,
  item_cardapio_id uuid references itens_cardapio (id) on delete set null,
  nome text not null,
  preco_unitario numeric(10,2) not null check (preco_unitario >= 0),
  quantidade integer not null check (quantidade > 0)
);

-- Índices para buscas comuns nas telas
create index idx_pedidos_status on pedidos (status);
create index idx_pedidos_restaurante on pedidos (restaurante_id);
create index idx_pedidos_entregador on pedidos (entregador_id);
create index idx_itens_cardapio_restaurante on itens_cardapio (restaurante_id);
create index idx_usuarios_papel on usuarios (papel);

-- Atualiza a data "atualizado_em" sempre que o pedido mudar
create or replace function atualizar_pedido_timestamp()
returns trigger as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_pedidos_atualizado_em
  before update on pedidos
  for each row
  execute function atualizar_pedido_timestamp();

-- Tempo real (Fase 5): avisa o app quando pedidos mudarem
alter publication supabase_realtime add table pedidos;

-- Segurança temporária: libera leitura/escrita no desenvolvimento.
-- Na Fase 7 (login) vamos restringir por papel.
alter table usuarios enable row level security;
alter table restaurantes enable row level security;
alter table itens_cardapio enable row level security;
alter table pedidos enable row level security;
alter table itens_pedido enable row level security;

create policy "dev_usuarios_tudo" on usuarios for all using (true) with check (true);
create policy "dev_restaurantes_tudo" on restaurantes for all using (true) with check (true);
create policy "dev_itens_cardapio_tudo" on itens_cardapio for all using (true) with check (true);
create policy "dev_pedidos_tudo" on pedidos for all using (true) with check (true);
create policy "dev_itens_pedido_tudo" on itens_pedido for all using (true) with check (true);

-- ============================================================
-- Dados de exemplo (só teste — nomes óbvios)
-- ============================================================

-- Restaurantes
insert into restaurantes (id, nome, descricao, endereco, comissao_percentual, ativo) values
  ('11111111-1111-1111-1111-111111111111', 'Loja Demo Acarajé', 'Acarajé e petiscos baianos (teste)', 'Pelourinho, Salvador', 12.00, true),
  ('22222222-2222-2222-2222-222222222222', 'Loja Demo Moqueca', 'Moquecas e peixes (teste)', 'Rio Vermelho, Salvador', 15.00, true);

-- Usuários
insert into usuarios (id, nome, email, telefone, papel, restaurante_id) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Cliente Teste', 'cliente.teste@chegou.local', '71999990001', 'cliente', null),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Restaurante Teste Acarajé', 'loja.acaraje@chegou.local', '71999990002', 'restaurante', '11111111-1111-1111-1111-111111111111'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Restaurante Teste Moqueca', 'loja.moqueca@chegou.local', '71999990003', 'restaurante', '22222222-2222-2222-2222-222222222222'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Entregador Teste', 'entregador.teste@chegou.local', '71999990004', 'entregador', null),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Dono Teste', 'dono.teste@chegou.local', '71999990005', 'dono', null);

-- Cardápio Loja Demo Acarajé
insert into itens_cardapio (id, restaurante_id, nome, descricao, preco, disponivel) values
  ('a1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Acarajé Tradicional', 'Vatapá, caruru e camarão', 18.90, true),
  ('a1000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Abará', 'Em folha de bananeira', 16.50, true),
  ('a1000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Coca-Cola Lata', '350 ml', 6.00, true);

-- Cardápio Loja Demo Moqueca
insert into itens_cardapio (id, restaurante_id, nome, descricao, preco, disponivel) values
  ('b1000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Moqueca de Peixe', 'Serve 2 pessoas', 79.90, true),
  ('b1000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Bobó de Camarão', 'Porção individual', 64.00, true),
  ('b1000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'Água Mineral', '500 ml', 4.00, true);

-- Pedido de exemplo já "novo" (aparece no painel do restaurante)
insert into pedidos (id, cliente_id, restaurante_id, status, total, taxa_entrega, endereco_entrega, observacao) values
  (
    'f1000000-0000-0000-0000-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'novo',
    43.80,
    8.00,
    'Rua Teste, 100 — Barra, Salvador',
    'Pedido de teste — sem cebola'
  );

insert into itens_pedido (pedido_id, item_cardapio_id, nome, preco_unitario, quantidade) values
  ('f1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Acarajé Tradicional', 18.90, 1),
  ('f1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 'Abará', 16.50, 1),
  ('f1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 'Coca-Cola Lata', 6.00, 1);
