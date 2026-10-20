-- Antes da v4.06: os avisos no celular da v3.35 (as três tabelas e os ajustes que o app lê e grava) e o Mural, como na
-- produção (lidos pelo conector em 20/10/2026, só com as colunas que os lembretes usam). As funções de antes são cópia da
-- produção: o delta troca as duas e o teste confere que o que já valia continua valendo.
\set ON_ERROR_STOP 1
create table if not exists public.corre_push (endpoint text primary key, dono uuid not null references public.corre_perfis (id) on delete cascade,
  p256dh text not null, auth text not null, ua text not null default '', created_at timestamptz not null default now(),
  visto_em timestamptz not null default now());
create table if not exists public.corre_push_pref (dono uuid primary key references public.corre_perfis (id) on delete cascade,
  msg boolean not null default true, resp boolean not null default true, seg boolean not null default true,
  curt boolean not null default true, texto boolean not null default true, updated_at timestamptz not null default now());
create table if not exists public.corre_push_log (chave text primary key, quem uuid, created_at timestamptz not null default now());
alter table public.corre_push enable row level security;
alter table public.corre_push_pref enable row level security;
alter table public.corre_push_log enable row level security;
revoke all on public.corre_push, public.corre_push_pref, public.corre_push_log from anon, authenticated;

create or replace function public.corre_push_ajustes(p_endpoint text default null) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'msg', coalesce(p.msg, true), 'resp', coalesce(p.resp, true), 'seg', coalesce(p.seg, true),
    'curt', coalesce(p.curt, true), 'texto', coalesce(p.texto, true),
    'aparelhos', (select count(*) from public.corre_push d where d.dono = auth.uid()),
    'este', p_endpoint is not null and exists (select 1 from public.corre_push d where d.dono = auth.uid() and d.endpoint = p_endpoint))
  from (select auth.uid() as uid) u
  left join public.corre_push_pref p on p.dono = u.uid
  where u.uid is not null $$;
revoke all on function public.corre_push_ajustes(text) from public, anon;
grant execute on function public.corre_push_ajustes(text) to authenticated;

create or replace function public.corre_push_ajusta(p_campo text, p_valor boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare eu uuid := auth.uid();
begin
  if eu is null or not exists (select 1 from public.corre_perfis where id = eu) then
    raise exception 'sem perfil' using errcode = '42501', hint = 'perfil';
  end if;
  if p_campo not in ('msg', 'resp', 'seg', 'curt', 'texto') or p_valor is null then raise exception 'campo' using hint = 'campo'; end if;
  insert into public.corre_push_pref (dono) values (eu) on conflict (dono) do nothing;
  execute format('update public.corre_push_pref set %I = $1, updated_at = now() where dono = $2', p_campo) using p_valor, eu;
  return public.corre_push_ajustes(null);
end $$;
revoke all on function public.corre_push_ajusta(text, boolean) from public, anon;
grant execute on function public.corre_push_ajusta(text, boolean) to authenticated;

create table if not exists public.corre_mural (id uuid primary key default gen_random_uuid(), dono uuid, nome text not null default '',
  categoria text not null, titulo text not null default '', st text not null default 'aberto',
  created_at timestamptz not null default now(), expira_em timestamptz not null default now() + interval '15 days');
