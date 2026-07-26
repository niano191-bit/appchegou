-- Fase 29 — Vitrine da home (banners + categorias)
-- Rode no SQL Editor do Supabase após a 020.

create table if not exists banners_vitrine (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  texto text not null default '',
  tom text not null default 'dende' check (tom in ('dende', 'mar')),
  ativo boolean not null default true,
  ordem integer not null default 0,
  criado_em timestamptz not null default now()
);

create table if not exists categorias_vitrine (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  emoji text not null default '🍽️',
  palavras_chave text not null default '',
  ativo boolean not null default true,
  ordem integer not null default 0,
  criado_em timestamptz not null default now()
);

comment on table banners_vitrine is 'Banners do carrossel na home do cliente';
comment on table categorias_vitrine is 'Categorias da rolagem na home do cliente';

-- Seeds (só se as tabelas estiverem vazias)
insert into banners_vitrine (titulo, texto, tom, ativo, ordem)
select * from (
  values
    ('O sabor da Bahia', 'Peça agora e receba quentinho na sua porta.', 'dende', true, 1),
    ('Acompanhe ao vivo', 'Do fogão à entrega — status em tempo real.', 'mar', true, 2)
) as v(titulo, texto, tom, ativo, ordem)
where not exists (select 1 from banners_vitrine limit 1);

insert into categorias_vitrine (nome, emoji, palavras_chave, ativo, ordem)
select * from (
  values
    ('Todos', '🍽️', '', true, 0),
    ('Baiana', '🌴', 'acaraj,moqueca,vatap,baian,dend,abar,xinxim,caruru,bobo', true, 1),
    ('Lanches', '🍔', 'lanche,hamb,burger,sandu,hot dog,pastel', true, 2),
    ('Peixe', '🐟', 'peixe,camarao,camarão,frutos,marisco,siri,moqueca', true, 3),
    ('Pizza', '🍕', 'pizza,italiana,massa', true, 4),
    ('Doces', '🍰', 'doce,sobremesa,bolo,pudim,brigadeiro,sorvete', true, 5),
    ('Saudável', '🥗', 'saudav,saudáv,salada,light,fit,natural', true, 6)
) as v(nome, emoji, palavras_chave, ativo, ordem)
where not exists (select 1 from categorias_vitrine limit 1);
