-- Antes da v4.34: o que o atendente e o piloto leem e o Supabase de mentira ainda não tinha, com os tipos da produção
-- (lidos pelo conector em 23/10/2026): o registro das cotas e o sal das conexões, os contatos do lead, as datas da venda
-- e a ordem das marcas.
\set ON_ERROR_STOP 1
create table if not exists public.corre_cota_log (id bigserial primary key, chave text not null, created_at timestamptz not null default now());
create index if not exists corre_cota_log_idx on public.corre_cota_log (chave, created_at desc);
create table if not exists public.corre_priv (k text primary key, v text);
insert into public.corre_priv (k, v) values ('ip_sal', 'sal-de-teste') on conflict (k) do nothing;
alter table public.corre_leads add column if not exists wa text not null default '', add column if not exists fixo text not null default '',
  add column if not exists tel text not null default '', add column if not exists potencial smallint not null default 0;
alter table public.corre_vendas add column if not exists pago_em date, add column if not exists whats text not null default '',
  add column if not exists aprovado_em timestamptz, add column if not exists entrega date, add column if not exists itens jsonb not null default '[]'::jsonb;
alter table public.corre_portfolio add column if not exists ordem integer not null default 0,
  add column if not exists created_at timestamptz not null default now();
alter table public.corre_perfis add column if not exists visibilidade text not null default 'publico', add column if not exists faz text not null default '',
  add column if not exists cidade text not null default '', add column if not exists whats_publico text not null default '';
alter table public.corre_produtos add column if not exists preco numeric, add column if not exists unidade text not null default '',
  add column if not exists descricao text not null default '', add column if not exists ordem integer not null default 0;
