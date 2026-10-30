-- v5.12: as colunas da venda que a Sala do Cliente lê (lidas da produção pelo conector em 30/10/2026)
\set ON_ERROR_STOP 1
alter table public.corre_vendas add column if not exists codigo text, add column if not exists validade date,
  add column if not exists recorrente boolean not null default false, add column if not exists sinal_em date;
alter table public.corre_posts add column if not exists ig_link text;
