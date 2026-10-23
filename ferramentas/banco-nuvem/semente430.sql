-- Antes da v4.30: as colunas que o bom dia lê e o Supabase de mentira não tinha, com os tipos da produção (lidos pelo
-- conector em 23/10/2026): o retorno do cliente (corre_leads.prox) e a cobrança (corre_vendas.vence, st, cliente, sinal).
\set ON_ERROR_STOP 1
alter table public.corre_leads add column if not exists prox date;
alter table public.corre_vendas add column if not exists vence date, add column if not exists st text not null default 'aberto',
  add column if not exists cliente text not null default '', add column if not exists sinal numeric not null default 0;
