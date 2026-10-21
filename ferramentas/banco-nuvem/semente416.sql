-- Antes da v4.16: as colunas do corre_leads que o funil e o aviso dos pedidos usam (a semente da v3.60 só tinha id, dono
-- e nome), como na produção (lidas pelo conector em 21/10/2026), e o gatilho que carimba o updated_at a cada mudança.
\set ON_ERROR_STOP 1
alter table public.corre_leads add column if not exists st text not null default 'novo',
  add column if not exists fonte text not null default '', add column if not exists obs text not null default '',
  add column if not exists hist jsonb not null default '[]'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();
create or replace function public.corre_touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create or replace trigger corre_leads_touch before update on public.corre_leads for each row execute function public.corre_touch_updated_at();
