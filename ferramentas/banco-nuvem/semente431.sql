-- Antes da v4.31: o que o denunciar lê e o Supabase de mentira ainda não tinha (como na produção, lida pelo conector
-- em 23/10/2026, só com o que a conta usa): quem está em cada conversa, a foto do post e o texto do story.
\set ON_ERROR_STOP 1
create table if not exists public.corre_conversa_membros (conversa uuid not null, membro uuid not null, estado text default 'ok',
  created_at timestamptz not null default now(), primary key (conversa, membro));
alter table public.corre_feed add column if not exists midia_url text;
alter table public.corre_stories add column if not exists texto text default '', add column if not exists midia_url text;
alter table public.corre_perfis add column if not exists bio text default '';
