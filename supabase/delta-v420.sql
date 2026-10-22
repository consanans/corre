-- v4.20 · O "A CADA N" DO CADERNINHO (o Thales: "coloca a opção de personalizar os dias, porque tem uma tarefa minha
-- que é a cada 56 dias"). A tarefa que repete ganha o quanto: a cada 56 dias, a cada 2 semanas, a cada 3 meses.
--
--   corre_caderno.cada   1 a 999 (1 = o de sempre). Multiplica o repete: dia, semana ou mês. No dia útil e sem
--                        repetir, fica 1 (o gatilho acerta).
--
--   corre_caderno.antes  os avisos de antes, em minutos (o Thales: "colocar mais avisos, 1 dia antes, 2 dias antes, 5
--                        dias antes, 1 semana antes, 2h antes, 1h antes"). Até 6, da lista de sempre. Cada um chega
--                        uma vez por horário, como o da hora (a chave no corre_push_log leva o "antes": caderno:id:hora:-60).
--
-- O pulo pro próximo dia é do app (como na 4.19); o relógio é o mesmo (de minuto em minuto). A fila e os avisos mudam
-- por dentro e seguem com o mesmo formato (create or replace, sem DROP).
-- Precisa da v4.19. Pode rodar duas vezes. Sem DROP. Site antigo com o delta: nada muda pra ele (cada fica 1).
begin;

do $$
begin
  if to_regclass('public.corre_caderno') is null then
    raise exception 'o delta v4.20 precisa do delta-v419.sql antes (o Caderninho)';
  end if;
end $$;

alter table public.corre_caderno add column if not exists cada smallint not null default 1;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'corre_caderno_cada_check') then
    alter table public.corre_caderno add constraint corre_caderno_cada_check check (cada between 1 and 999);
  end if;
end $$;

alter table public.corre_caderno add column if not exists antes int[] not null default '{}';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'corre_caderno_antes_check') then
    alter table public.corre_caderno add constraint corre_caderno_antes_check
      check (cardinality(antes) <= 6 and antes <@ array[15, 30, 60, 120, 180, 1440, 2880, 4320, 7200, 10080, 20160]);
  end if;
end $$;
-- a fila olha até 14 dias pra frente (o maior "antes"): o índice da hora serve
create index if not exists corre_caderno_quando_idx on public.corre_caderno (quando) where not feito and avisa and quando is not null;

-- o gatilho da v4.19, com o "a cada" acertado no fim (sem repetir ou dia útil, volta pra 1)
create or replace function public.corre_caderno_ok() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare p record;
begin
  new.titulo := btrim(new.titulo);
  new.lista := btrim(coalesce(new.lista, ''));
  if new.pai is not null then
    if new.pai = new.id then raise exception 'pai' using hint = 'pai'; end if;
    select c.dono, c.pai into p from public.corre_caderno c where c.id = new.pai;
    if p.dono is null or p.dono <> new.dono then raise exception 'pai' using errcode = '42501', hint = 'pai'; end if;
    if p.pai is not null then raise exception 'subtarefa de subtarefa' using hint = 'pai'; end if;
    new.repete := '';
  end if;
  if new.hora is not null and new.hora !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'hora' using hint = 'hora'; end if;
  if new.repete <> '' and new.dia is null then raise exception 'repetir sem dia' using hint = 'repete'; end if;
  if new.repete not in ('dia', 'semana', 'mes') then new.cada := 1; end if;
  new.quando := case when new.dia is not null and new.hora is not null
                     then (new.dia + new.hora::time) at time zone 'America/Sao_Paulo' end;
  if new.feito and (tg_op = 'INSERT' or not old.feito) then new.feito_em := now(); end if;
  if not new.feito then new.feito_em := null; end if;
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.created_at := now();
    if current_user in ('authenticated', 'anon') and (select count(*) from public.corre_caderno c where c.dono = new.dono) >= 5000 then
      raise exception 'o Caderninho guarda até 5000 tarefas' using hint = 'limite';
    end if;
  elsif new.dono <> old.dono then
    raise exception 'dono' using errcode = '42501';
  end if;
  return new;
end $$;

-- a fila: a hora da tarefa e cada "antes" dela, nos últimos 30 minutos, que ainda não avisaram
create or replace function public.corre_caderno_fila(p_agora timestamptz default now())
returns table (id uuid, dono uuid, chave text)
language sql stable security definer set search_path = public, pg_temp as $$
  select c.id, c.dono, 'caderno:' || c.id || ':' || floor(extract(epoch from c.quando))::bigint || case when o.m > 0 then ':-' || o.m else '' end
    from public.corre_caderno c
    cross join lateral (select unnest(array[0] || c.antes) as m) o
   where not c.feito and c.avisa and c.quando > p_agora - interval '30 minutes' and c.quando <= p_agora + interval '14 days 30 seconds'
     and c.quando - make_interval(mins => o.m) <= p_agora + interval '30 seconds'
     and c.quando - make_interval(mins => o.m) > p_agora - interval '30 minutes'
     and coalesce((select pr.caderno from public.corre_push_pref pr where pr.dono = c.dono), true)
     and exists (select 1 from public.corre_push d where d.dono = c.dono)
     and not exists (select 1 from public.corre_push_log l where l.chave = 'caderno:' || c.id || ':' || floor(extract(epoch from c.quando))::bigint || case when o.m > 0 then ':-' || o.m else '' end) $$;
revoke all on function public.corre_caderno_fila(timestamptz) from public, anon, authenticated;
grant execute on function public.corre_caderno_fila(timestamptz) to service_role;

-- os avisos: o da hora como na 4.19; o de antes diz quando ("Daqui a 1 hora", "Amanhã às 15:00", "Daqui a 1 semana")
create or replace function public.corre_caderno_alvos(p_agora timestamptz default now()) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  f record; t record; ja bigint; subs jsonb; mostra boolean; titulo text; corpo text; ns int; off int; quando text;
  conta jsonb := '{}'::jsonb;
  out jsonb := '[]'::jsonb;
begin
  for f in select * from public.corre_caderno_fila(p_agora) order by 1 limit 200 loop
    continue when coalesce((conta ->> f.dono::text)::int, 0) >= 10;
    insert into public.corre_push_log (chave, quem) values (left(f.chave, 200), null) on conflict do nothing;
    get diagnostics ja = row_count;
    continue when ja = 0;
    select * into t from public.corre_caderno c where c.id = f.id;
    continue when t.id is null;
    subs := (select jsonb_agg(jsonb_build_object('endpoint', d.endpoint, 'p256dh', d.p256dh, 'auth', d.auth) order by d.visto_em desc)
               from (select * from public.corre_push d2 where d2.dono = f.dono order by d2.visto_em desc limit 10) d);
    continue when subs is null;
    conta := conta || jsonb_build_object(f.dono::text, coalesce((conta ->> f.dono::text)::int, 0) + 1);
    mostra := coalesce((select pr.texto from public.corre_push_pref pr where pr.dono = f.dono), true);
    ns := (select count(*) from public.corre_caderno s where s.pai = t.id and not s.feito);
    off := coalesce(nullif(split_part(f.chave, ':-', 2), '')::int, 0);
    quando := case when off = 0 then t.hora
                   when off < 60 then 'daqui a ' || off || ' min (' || t.hora || ')'
                   when off < 1440 then 'daqui a ' || (off / 60) || case when off / 60 = 1 then ' hora' else ' horas' end || ' (' || t.hora || ')'
                   when off = 1440 then 'amanhã às ' || t.hora
                   when off % 10080 = 0 then 'daqui a ' || (off / 10080) || case when off / 10080 = 1 then ' semana' else ' semanas' end || ' · ' || to_char(t.dia, 'DD/MM') || ' às ' || t.hora
                   else 'daqui a ' || (off / 1440) || ' dias · ' || to_char(t.dia, 'DD/MM') || ' às ' || t.hora end;
    titulo := case when mostra then left(t.titulo, 110) else 'Hora de uma tarefa' end;
    corpo := 'Caderninho · ' || quando
             || case when mostra and t.lista <> '' then ' · ' || t.lista else '' end
             || case when ns = 1 then ' · 1 subtarefa' when ns > 1 then ' · ' || ns || ' subtarefas' else '' end
             || case when mostra and btrim(t.nota) <> '' then '. ' || left(btrim(t.nota), 120) else '' end
             || case when t.prio = 1 then '. Prioridade 1.' else '.' end;
    out := out || jsonb_build_array(jsonb_build_object('para', f.dono, 'tipo', 'caderno', 'subs', subs,
      'payload', jsonb_build_object('titulo', left(titulo, 120), 'corpo', left(corpo, 300), 'url', '/#/caderninho/t/' || t.id,
                                    'tag', 'caderno-' || t.id || case when off > 0 then '-' || off else '' end, 'renotify', true, 't', 'caderno', 'em', now())));
  end loop;
  return out;
end $$;
revoke all on function public.corre_caderno_alvos(timestamptz) from public, anon, authenticated;
grant execute on function public.corre_caderno_alvos(timestamptz) to service_role;

commit;

select case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'corre_caderno' and column_name = 'cada')
             and exists (select 1 from pg_constraint where conname = 'corre_caderno_cada_check')
             and exists (select 1 from pg_constraint where conname = 'corre_caderno_antes_check')
             and position('o.m' in (select prosrc from pg_proc where oid = 'public.corre_caderno_fila(timestamptz)'::regprocedure)) > 0
             and not has_function_privilege('authenticated', 'public.corre_caderno_fila(timestamptz)', 'execute')
             and position('new.cada := 1' in (select prosrc from pg_proc where oid = 'public.corre_caderno_ok()'::regprocedure)) > 0
            then 'delta v4.20 ok' else 'delta v4.20 NÃO TERMINOU: rode o arquivo inteiro de novo.' end as status;
