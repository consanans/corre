-- Antes da v3.56: o pedaço da produção que o delta-v356 mexe (lido em 16/10/2026 pelo conector).
-- corre_visivel, as políticas e a corre_grana_publica são cópias da produção; as outras quatro funções são de mentira,
-- mas carregam o trecho exato que o delta troca (o mesmo texto da produção), pra conferir a troca e a regra nova.
\set ON_ERROR_STOP 1
alter table public.corre_perfis add column if not exists handle text, add column if not exists nome text,
  add column if not exists visibilidade text default 'publico', add column if not exists grana_mostra text default 'nada';
alter table public.corre_perfis add constraint corre_perfis_visibilidade_check check (visibilidade = any (array['publico', 'mocado']));
create table public.corre_seguindo (quem uuid default auth.uid() references public.corre_perfis(id) on delete cascade,
  segue uuid references public.corre_perfis(id) on delete cascade, created_at timestamptz default now(), primary key (quem, segue), check (quem <> segue));
create table public.corre_feed (id uuid primary key default gen_random_uuid(), dono uuid references public.corre_perfis(id), grupo uuid, texto text default '');
create table public.corre_stories (id uuid primary key default gen_random_uuid(), dono uuid references public.corre_perfis(id), expira_em timestamptz default now() + interval '1 day', destaque_id uuid);
create table public.corre_destaques (id uuid primary key default gen_random_uuid(), dono uuid references public.corre_perfis(id));
create table public.corre_insta (id uuid primary key default gen_random_uuid(), dono uuid references public.corre_perfis(id));
create table public.corre_portfolio (id uuid primary key default gen_random_uuid(), dono uuid references public.corre_perfis(id), publico boolean default true);
create table public.corre_recomendacoes (id uuid primary key default gen_random_uuid(), dono uuid references public.corre_perfis(id), para uuid references public.corre_perfis(id), status text default 'aceita');
create table public.corre_estilo (dono uuid primary key, meta_dia numeric, meta_dias text, meta_perfil boolean);
create table public.corre_lancamentos (id uuid primary key default gen_random_uuid(), dono uuid, valor numeric, cliente text default '', categoria text default '', data date default (now() at time zone 'America/Sao_Paulo')::date);

create or replace function public.corre_visivel(p uuid) returns boolean language sql stable security definer set search_path to 'public' as $function$
  select exists (select 1 from public.corre_perfis where id = p and visibilidade = 'publico');
$function$;
create or replace function public.corre_grupo_ve(g uuid) returns boolean language sql stable as $$ select true $$;

alter table public.corre_perfis enable row level security;
alter table public.corre_seguindo enable row level security;
alter table public.corre_feed enable row level security;
alter table public.corre_stories enable row level security;
alter table public.corre_destaques enable row level security;
alter table public.corre_insta enable row level security;
alter table public.corre_portfolio enable row level security;
alter table public.corre_recomendacoes enable row level security;
create policy "perfil publico ou o meu" on public.corre_perfis for select using ((visibilidade = 'publico'::text) or (id = auth.uid()));
create policy "seguindo: vejo" on public.corre_seguindo for select using ((quem = auth.uid()) or (segue = auth.uid()) or (corre_visivel(quem) and corre_visivel(segue)));
create policy "seguindo: sigo" on public.corre_seguindo for insert with check ((quem = auth.uid()) and corre_visivel(segue));
create policy "seguindo: deixo" on public.corre_seguindo for delete using (quem = auth.uid());
create policy "feed: vejo" on public.corre_feed for select using ((dono = auth.uid()) or (corre_visivel(dono) and corre_grupo_ve(grupo)));
create policy "stories: vejo" on public.corre_stories for select using ((dono = auth.uid()) or (((expira_em > now()) or (destaque_id is not null)) and corre_visivel(dono)));
create policy "destaques: vejo" on public.corre_destaques for select using ((dono = auth.uid()) or corre_visivel(dono));
create policy "insta: vejo" on public.corre_insta for select using ((dono = auth.uid()) or corre_visivel(dono));
create policy "portfolio: vejo" on public.corre_portfolio for select using ((dono = auth.uid()) or (publico and corre_visivel(dono)));
create policy "recomendacoes: vejo" on public.corre_recomendacoes for select using ((dono = auth.uid()) or (para = auth.uid()) or ((status = 'aceita'::text) and corre_visivel(para) and corre_visivel(dono)));
grant usage on schema auth to anon, authenticated;   -- como no Supabase de verdade (o auth.uid() é chamado pelo app)
grant select on public.corre_perfis, public.corre_seguindo, public.corre_feed, public.corre_stories, public.corre_destaques,
  public.corre_insta, public.corre_portfolio, public.corre_recomendacoes to anon, authenticated;
grant insert, delete on public.corre_seguindo to authenticated;
grant update on public.corre_perfis to authenticated;
create policy "perfil: mexo no meu" on public.corre_perfis for update using (id = auth.uid());

-- a da produção, igual
CREATE OR REPLACE FUNCTION public.corre_grana_publica(p uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  modo text; vis text; total numeric; tudo numeric; marcas int;
  mdia numeric; mdias text; mperf boolean; mostra_meta boolean;
  ndias int; antes int; hoje_conta boolean; meta_mes numeric;
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  ini date := date_trunc('month', now() at time zone 'America/Sao_Paulo')::date;
begin
  select grana_mostra, visibilidade into modo, vis from public.corre_perfis where id = p;
  if modo is null then return null; end if;
  select meta_dia, meta_dias, meta_perfil into mdia, mdias, mperf from public.corre_estilo where dono = p;
  mostra_meta := coalesce(mperf, false) and coalesce(mdia, 0) > 0;
  if modo = 'nada' and not mostra_meta then return null; end if;
  if vis <> 'publico' and p is distinct from auth.uid() then return null; end if;
  select coalesce(sum(valor) filter (where cliente <> ''), 0), coalesce(sum(valor), 0) into total, tudo
    from public.corre_lancamentos
   where dono = p and valor > 0 and categoria <> 'transferencia' and data >= ini and data < (ini + interval '1 month')::date;
  select count(*) into marcas from public.corre_portfolio where dono = p and publico;
  return jsonb_build_object('mes', to_char(ini, 'YYYY-MM'), 'modo', modo, 'marcas', case when modo <> 'nada' then marcas end,
    'valor', case when modo = 'valor' then total end);
end $function$;

-- de mentira, com o trecho exato da produção
create or replace function public.corre_grupos_de(p_perfil uuid) returns boolean language sql stable security definer set search_path to 'public' as $function$
  select exists (select 1 from public.corre_perfis m where m.id = p_perfil and (public.corre_visivel(p_perfil) or p_perfil = auth.uid()));
$function$;
create or replace function public.corre_enquetes(p_id uuid) returns boolean language sql stable security definer set search_path to 'public' as $function$
  select exists (select 1 from public.corre_feed f where f.id = p_id
    and (f.dono = auth.uid() or (public.corre_visivel(f.dono) and public.corre_grupo_ve(f.grupo))));
$function$;
create or replace function public.corre_em_alta() returns bigint language sql stable security definer set search_path to 'public' as $function$
  select count(*) from public.corre_feed f
      join public.corre_perfis p on p.id = f.dono and p.visibilidade = 'publico';
$function$;
create or replace function public.corre_pra_voce() returns setof uuid language sql stable security definer set search_path to 'public' as $function$
  with eu as (select auth.uid() as id)
  select f.id from public.corre_feed f join public.corre_perfis a on a.id = f.dono
   where f.grupo is null
       and (a.visibilidade = 'publico' or f.dono = (select id from eu));
$function$;

-- quem é quem: t = o Thales (público), g = a Gabriela (mocada, segue o Thales), x = alguém que não segue a Gabriela
insert into public.corre_perfis (id, handle, nome, visibilidade, grana_mostra) values
  ('00000000-0000-0000-0000-0000000000a1', 'consanans', 'Thales', 'publico', 'nada'),
  ('00000000-0000-0000-0000-0000000000a2', 'gabriela', 'Gabriela Ferrari', 'mocado', 'faixa'),
  ('00000000-0000-0000-0000-0000000000a3', 'fulano', 'Fulano', 'publico', 'nada');
insert into public.corre_seguindo (quem, segue) values ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a1');
insert into public.corre_feed (dono, texto) values ('00000000-0000-0000-0000-0000000000a2', 'post da gabi'), ('00000000-0000-0000-0000-0000000000a1', 'post do thales');
insert into public.corre_stories (dono) values ('00000000-0000-0000-0000-0000000000a2');
insert into public.corre_destaques (dono) values ('00000000-0000-0000-0000-0000000000a2');
insert into public.corre_insta (dono) values ('00000000-0000-0000-0000-0000000000a2');
insert into public.corre_portfolio (dono) values ('00000000-0000-0000-0000-0000000000a2');
insert into public.corre_recomendacoes (dono, para) values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2');
insert into public.corre_lancamentos (dono, valor, cliente) values ('00000000-0000-0000-0000-0000000000a2', 3000, 'Cliente');
