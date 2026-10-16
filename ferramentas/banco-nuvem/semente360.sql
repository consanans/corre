-- Antes da v3.60: o pedaço da produção que o delta-v360 usa (lido em 16/10/2026 pelo conector). O gatilho
-- corre_plano_rede e o corre_plano_guard são cópias da produção; leads, Portfólio e marca do Houzi só com as colunas
-- que o delta olha. O auth.role() é o do Supabase (lê o papel do login).
\set ON_ERROR_STOP 1
create or replace function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role', true), '') $$;
alter table public.corre_perfis add column if not exists redes int default 1;
alter table public.corre_portfolio add column if not exists rede text not null default '';
alter table public.corre_houzi_marcas add column if not exists nome text not null default '', add column if not exists spec jsonb not null default '{}', add column if not exists naming jsonb not null default '{}';
create table public.corre_leads (id uuid primary key default gen_random_uuid(), dono uuid not null references public.corre_perfis(id), nome text default '');
alter table public.corre_leads enable row level security;
create policy "leads: so a dona" on public.corre_leads using (dono = auth.uid()) with check (dono = auth.uid());
grant select, insert, update, delete on public.corre_leads to authenticated;
grant insert, update, delete on public.corre_portfolio, public.corre_houzi_marcas to authenticated;
create policy "portfolio: mexo no meu" on public.corre_portfolio for all using (dono = auth.uid()) with check (dono = auth.uid());
alter table public.corre_houzi_marcas enable row level security;
create policy "houzi: publicada ou minha" on public.corre_houzi_marcas for select using (publica or dono = auth.uid());
create policy "houzi: mexo na minha" on public.corre_houzi_marcas for update using (dono = auth.uid()) with check (dono = auth.uid());
create policy "houzi: apago a minha" on public.corre_houzi_marcas for delete using (dono = auth.uid());
create policy "houzi: crio a minha" on public.corre_houzi_marcas for insert with check (dono = auth.uid());

-- da produção, igual
CREATE OR REPLACE FUNCTION public.corre_plano_guard()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then new.plano := 'gratis'; new.redes := 1;
    else new.plano := old.plano; new.redes := old.redes; end if;
  end if;
  return new;
end $function$;
create trigger corre_perfis_plano before insert or update on public.corre_perfis for each row execute function public.corre_plano_guard();
CREATE OR REPLACE FUNCTION public.corre_plano_rede()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare pl text; lim int;
begin
  if tg_op = 'UPDATE' and new.rede is not distinct from old.rede then return new; end if;  -- só confere quando liga/troca a rede
  select plano, redes into pl, lim from public.corre_perfis where id = new.dono;
  if new.rede <> '' and coalesce(pl, 'gratis') = 'gratis'
     and (select count(*) from public.corre_portfolio p where p.dono = new.dono and p.rede <> '' and p.id <> new.id) >= coalesce(lim, 1) then
    raise exception 'plano gratis: limite de % rede(s) social(is)', coalesce(lim, 1) using errcode = 'P0001', hint = 'plano_gratis';
  end if;
  return new;
end $function$;
create trigger corre_portfolio_plano before insert or update on public.corre_portfolio for each row execute function public.corre_plano_rede();

-- o fundador de verdade (o id da produção) e mais um, que não segue ninguém
insert into public.corre_perfis (id, handle, nome) values ('d1e9f6ac-f5d7-4723-8b02-eb0d1d7137b0', 'consanans-real', 'Fundador'), ('00000000-0000-0000-0000-0000000000a4', 'beltrana', 'Beltrana');
