-- Supabase de mentira: só o que o delta v3.40 usa
create role anon; create role authenticated; create role service_role;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create table public.corre_perfis (id uuid primary key, plano text default 'gratis');
create table public.corre_posts (id uuid primary key default gen_random_uuid(), dono uuid references public.corre_perfis(id),
  ig_status text default '', ig_erro text default '', ig_tentativas int default 0, ig_quando timestamptz, updated_at timestamptz default now());
create table public.corre_correal (dono uuid primary key, saldo int not null default 0);
create function public.corre_correal_hoje(u uuid) returns int language sql stable as $$ select 0 $$;
