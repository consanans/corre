-- Supabase de mentira: só o que os deltas usam
create role anon; create role authenticated; create role service_role;
-- como no Supabase de verdade: função NOVA (create, ou drop + create) ganha EXECUTE pra anon, authenticated e service_role,
-- além do PUBLIC. É isso que faz o delta ter que refazer o revoke/grant de toda função que ele recria.
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create table public.corre_perfis (id uuid primary key, plano text default 'gratis');
create table public.corre_posts (id uuid primary key default gen_random_uuid(), dono uuid references public.corre_perfis(id),
  ig_status text default '', ig_erro text default '', ig_tentativas int default 0, ig_quando timestamptz, updated_at timestamptz default now());
-- v3.41: a marca do Studio Houzi (só o que o delta v3.41 usa)
create table public.corre_houzi_marcas (id uuid primary key default gen_random_uuid(), dono uuid references public.corre_perfis(id), publica boolean not null default false, voz jsonb not null default '{}');
grant select on public.corre_houzi_marcas to anon, authenticated;

-- ---------------------------------------------------------------
-- CORREAL igual à produção ANTES da v3.43 (a foto lida pelo conector em 13/10/2026): o correal ainda inteiro,
-- 1 ponto de tarefa = 1 correal, teto de 40 por dia. Tabelas, funções, grants e RLS como estão lá.
-- ---------------------------------------------------------------
create table public.corre_correal (
  dono       uuid primary key references public.corre_perfis (id) on delete cascade,
  saldo      int not null default 0 constraint corre_correal_saldo_check check (saldo >= 0 and saldo <= 1000000),
  ganho      int not null default 0,
  gasto      int not null default 0,
  updated_at timestamptz not null default now()
);
create table public.corre_correal_log (
  id         bigint generated always as identity primary key,
  dono       uuid not null references public.corre_perfis (id) on delete cascade,
  valor      int not null,
  motivo     text not null constraint corre_correal_log_motivo_check check (char_length(motivo) <= 60),
  created_at timestamptz not null default now()
);
create index corre_correal_log_dono_idx on public.corre_correal_log (dono);
create table public.corre_tarefa_vez (
  id      uuid primary key default gen_random_uuid(),
  dono    uuid not null,
  u       text not null,
  k       text not null,
  comecou timestamptz not null default now()
);
create index corre_tarefa_vez_dono_idx on public.corre_tarefa_vez (dono);
alter table public.corre_correal enable row level security;
alter table public.corre_correal_log enable row level security;
alter table public.corre_tarefa_vez enable row level security;   -- (a foto não diz; sem grant pro app, tanto faz)
create policy "correal: vejo a minha" on public.corre_correal for select using (dono = auth.uid());
create policy "correal: vejo o meu extrato" on public.corre_correal_log for select using (dono = auth.uid());
grant select on public.corre_correal, public.corre_correal_log to authenticated;
-- o service_role só tem os extras que o Supabase põe sozinho (TRUNCATE, REFERENCES, TRIGGER; o MAINTAIN é do Postgres 17)
grant truncate, references, trigger on public.corre_correal, public.corre_correal_log, public.corre_tarefa_vez to service_role;

-- a cota do dia (a de verdade conta por tipo; aqui sempre deixa, que o teste é do correal)
create function public.corre_cota_minha(p_tipo text, p_lim integer) returns boolean language sql as $$ select true $$;

CREATE OR REPLACE FUNCTION public.corre_correal_preco(p_tipo text)
 RETURNS integer LANGUAGE sql IMMUTABLE SET search_path TO 'public'
AS $function$
  select case p_tipo when 'imagem' then 10 when 'legenda' then 2 when 'abordagem' then 2 when 'marca' then 3 when 'voo' then 5 end $function$;

CREATE OR REPLACE FUNCTION public.corre_tarefa_valor(p_u text, p_k text)
 RETURNS integer LANGUAGE sql IMMUTABLE SET search_path TO 'public'
AS $function$
  select t.v from (values
    ('policial', 'ronda', 3), ('policial', 'ladrao', 5), ('policial', 'transito', 2),
    ('bombeiro', 'fogo', 5), ('bombeiro', 'gato', 3), ('bombeiro', 'treino', 2),
    ('medico', 'socorro', 5), ('medico', 'vacina', 3), ('medico', 'plantao', 2),
    ('chef', 'pastel', 3), ('chef', 'smash', 3), ('chef', 'churros', 3),
    ('motoboy', 'entrega', 4), ('motoboy', 'acai', 4), ('motoboy', 'envelope', 3),
    ('craque', 'gols', 4), ('craque', 'peneira', 4), ('craque', 'embaixadinha', 3),
    ('ladrao', 'pipoca', 3), ('ladrao', 'churros', 4), ('ladrao', 'despista', 3),
    ('detetive', 'pistas', 4), ('detetive', 'testemunha', 3), ('detetive', 'rastro', 4),
    ('cientista', 'amostra', 4), ('cientista', 'ipe', 3), ('cientista', 'clima', 4),
    ('pirata', 'tesouro', 4), ('pirata', 'bandeira', 3), ('pirata', 'mapa', 4),
    ('astronauta', 'contagem', 3), ('astronauta', 'treino', 3), ('astronauta', 'estrelas', 4),
    ('ninja', 'pergaminho', 4), ('ninja', 'telhados', 4), ('ninja', 'meditar', 3),
    ('super', 'patrulha', 5), ('super', 'resgate', 4), ('super', 'pipa', 3),
    ('rei', 'fita', 3), ('rei', 'discurso', 3), ('rei', 'visita', 4)
  ) as t(u, k, v) where t.u = p_u and t.k = p_k $function$;

CREATE OR REPLACE FUNCTION public.corre_correal_hoje(p_dono uuid)
 RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  select coalesce(sum(valor), 0)::int from public.corre_correal_log
   where dono = p_dono and valor > 0 and motivo like 'tarefa:%'
     and created_at >= ((now() at time zone 'America/Sao_Paulo')::date)::timestamp at time zone 'America/Sao_Paulo' $function$;

CREATE OR REPLACE FUNCTION public.corre_correal_meu()
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare u uuid := auth.uid(); s int;
begin
  if u is null then return null; end if;
  select saldo into s from public.corre_correal where dono = u;
  return jsonb_build_object('saldo', coalesce(s, 0), 'hoje', public.corre_correal_hoje(u), 'teto', 40,
    'precos', jsonb_build_object('imagem', public.corre_correal_preco('imagem'), 'legenda', public.corre_correal_preco('legenda'),
                                 'abordagem', public.corre_correal_preco('abordagem'), 'marca', public.corre_correal_preco('marca'),
                                 'voo', public.corre_correal_preco('voo')));
end $function$;

CREATE OR REPLACE FUNCTION public.corre_correal_gasta(p_tipo text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare u uuid := auth.uid(); p int := public.corre_correal_preco(p_tipo); s int;
begin
  if u is null or p is null then return jsonb_build_object('ok', false, 'saldo', 0, 'preco', p); end if;
  perform pg_advisory_xact_lock(hashtext('correal:' || u::text));
  select saldo into s from public.corre_correal where dono = u for update;
  if coalesce(s, 0) < p then return jsonb_build_object('ok', false, 'saldo', coalesce(s, 0), 'preco', p); end if;
  update public.corre_correal set saldo = saldo - p, gasto = gasto + p, updated_at = now() where dono = u returning saldo into s;
  insert into public.corre_correal_log (dono, valor, motivo) values (u, -p, 'gasto:' || p_tipo);
  return jsonb_build_object('ok', true, 'saldo', s, 'preco', p);
end $function$;

CREATE OR REPLACE FUNCTION public.corre_correal_devolve(p_dono uuid, p_tipo text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare p int := public.corre_correal_preco(p_tipo); g timestamptz; s int;
begin
  if p is null or p_dono is null then return jsonb_build_object('ok', false); end if;
  perform pg_advisory_xact_lock(hashtext('correal:' || p_dono::text));
  select max(created_at) into g from public.corre_correal_log where dono = p_dono and motivo = 'gasto:' || p_tipo and created_at > now() - interval '10 minutes';
  if g is null or exists (select 1 from public.corre_correal_log where dono = p_dono and motivo = 'volta:' || p_tipo and created_at >= g) then
    return jsonb_build_object('ok', false);
  end if;
  update public.corre_correal set saldo = saldo + p, gasto = greatest(0, gasto - p), updated_at = now() where dono = p_dono returning saldo into s;
  insert into public.corre_correal_log (dono, valor, motivo) values (p_dono, p, 'volta:' || p_tipo);
  return jsonb_build_object('ok', true, 'saldo', s);
end $function$;

CREATE OR REPLACE FUNCTION public.corre_tarefa_comeca(p_u text, p_k text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare eu uuid := auth.uid(); vez uuid;
begin
  if eu is null then raise exception 'login' using errcode = '42501'; end if;
  if public.corre_tarefa_valor(p_u, p_k) is null then raise exception 'tarefa' using errcode = 'P0001', hint = 'tarefa'; end if;
  if not public.corre_cota_minha('tarefa', 300) then raise exception 'limite de 300 tarefas por dia' using errcode = 'P0001', hint = 'limite'; end if;
  delete from public.corre_tarefa_vez where dono = eu;
  insert into public.corre_tarefa_vez (dono, u, k) values (eu, p_u, p_k) returning id into vez;
  return vez;
end $function$;

CREATE OR REPLACE FUNCTION public.corre_tarefa_termina(p_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare eu uuid := auth.uid(); t public.corre_tarefa_vez%rowtype; seg numeric; v int; hoje int; ganhou int; s int;
begin
  if eu is null then return jsonb_build_object('ok', false, 'motivo', 'login'); end if;
  select * into t from public.corre_tarefa_vez where id = p_id and dono = eu for update;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'sem_tarefa'); end if;
  seg := extract(epoch from now() - t.comecou);
  if seg < 20 then return jsonb_build_object('ok', false, 'motivo', 'rapido', 'falta', ceil(20 - seg)::int); end if;
  delete from public.corre_tarefa_vez where id = t.id;
  if seg > 1800 then return jsonb_build_object('ok', false, 'motivo', 'velha'); end if;
  v := coalesce(public.corre_tarefa_valor(t.u, t.k), 0);
  perform pg_advisory_xact_lock(hashtext('correal:' || eu::text));
  hoje := public.corre_correal_hoje(eu);
  ganhou := greatest(0, least(v, 40 - hoje));
  if ganhou > 0 then
    insert into public.corre_correal_log (dono, valor, motivo) values (eu, ganhou, 'tarefa:' || t.u || ':' || t.k);
    insert into public.corre_correal as c (dono, saldo, ganho) values (eu, ganhou, ganhou)
      on conflict (dono) do update set saldo = c.saldo + excluded.saldo, ganho = c.ganho + excluded.ganho, updated_at = now();
  end if;
  select saldo into s from public.corre_correal where dono = eu;
  return jsonb_build_object('ok', true, 'ganhou', ganhou, 'valia', v, 'saldo', coalesce(s, 0), 'hoje', hoje + ganhou, 'teto', 40);
end $function$;

-- os grants de função da foto (proacl). As que a foto diz "padrão" ficam só com o PUBLIC, como lá.
revoke all on function public.corre_tarefa_comeca(text, text), public.corre_correal_gasta(text), public.corre_correal_meu(),
  public.corre_tarefa_termina(uuid), public.corre_correal_hoje(uuid), public.corre_correal_devolve(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.corre_tarefa_comeca(text, text), public.corre_correal_gasta(text), public.corre_correal_meu(),
  public.corre_tarefa_termina(uuid) to authenticated;
grant execute on function public.corre_correal_devolve(uuid, text) to service_role;
revoke all on function public.corre_correal_preco(text), public.corre_tarefa_valor(text, text), public.corre_cota_minha(text, integer)
  from anon, authenticated, service_role;
