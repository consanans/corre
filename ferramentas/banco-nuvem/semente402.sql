-- Antes da v4.02: o que a Lojinha lê e o Supabase de mentira ainda não tinha (colunas e tabelas como na produção,
-- lidas pelo conector em 19/10/2026, só com o que a conta usa). O auth.users e o auth.sessions são do Supabase.
\set ON_ERROR_STOP 1
alter table public.corre_perfis add column if not exists faz text default '', add column if not exists whats_publico text default '',
  add column if not exists categoria text default '';
alter table public.corre_feed add column if not exists created_at timestamptz not null default now();
create table if not exists auth.users (id uuid primary key, created_at timestamptz default now(), last_sign_in_at timestamptz);
create table if not exists auth.sessions (id uuid primary key default gen_random_uuid(), user_id uuid not null, created_at timestamptz default now(),
  updated_at timestamptz default now(), refreshed_at timestamp without time zone);
create table if not exists public.corre_mensagens (id uuid primary key default gen_random_uuid(), conversa uuid, dono uuid, texto text default '',
  created_at timestamptz not null default now());
create table if not exists public.corre_produtos (id uuid primary key default gen_random_uuid(), dono uuid, nome text default '', publico boolean default true,
  created_at timestamptz not null default now());
create table if not exists public.corre_geracoes (id uuid primary key default gen_random_uuid(), dono uuid, marca_id uuid, prompt text default '',
  tipo text default 'imagem', created_at timestamptz not null default now());
create table if not exists public.corre_vendas (id uuid primary key default gen_random_uuid(), dono uuid, total numeric default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
