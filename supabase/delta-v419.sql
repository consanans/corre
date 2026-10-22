-- v4.19 · O CADERNINHO: o planner do Corre (o Thales: "vamos adicionar um planner tipo todoist para organizar tudo
-- dentro do app"; escolheu o nome Caderninho, "tudo num lugar só" e o aviso no celular na hora).
--
-- As tarefas de cada um: título, nota, lista (Trabalho, Casa...), dia e hora, prioridade, repetir (todo dia, dia útil,
-- toda semana, todo mês) e subtarefas (um nível). O dia do Caderninho junta as tarefas com o que o Corre já sabe (post
-- do Studio, retorno do Hórus, cobrança das Vendas); isso é leitura do app, nada novo no banco. Tarefa com hora avisa
-- no celular na hora marcada, pra quem ligou os avisos e não desligou "Caderninho" (corre_push_pref.caderno).
--
--   corre_caderno                  as tarefas (só a dona lê e escreve; até 5000 por pessoa). O gatilho calcula a hora
--                                  do aviso (quando, no horário de Brasília) e o feito_em, e confere a subtarefa.
--   corre_push_pref.caderno        desligado = sem aviso do Caderninho; vazio = ligado. Os ajustes do app aceitam.
--   corre_caderno_fila(agora)      as tarefas que venceram e ainda não avisaram, de quem tem aparelho (só o servidor).
--   corre_caderno_tem()            tem tarefa na hora? (o relógio só chama a função quando tem)
--   corre_caderno_alvos(agora)     os avisos, no jeito do corre_postar_alvos (só o servidor; a função push entrega
--                                  junto com a hora de postar, acao "postar", sem login: quem decide é o banco)
--   o relógio                      o corre-hora-de-postar da v4.18 passa a olhar as tarefas também (um relógio só).
--
-- Precisa da v3.35 (os avisos) e da v4.18 (a hora de postar). Pode rodar duas vezes. Sem DROP. Site antigo com o
-- delta: nada muda pra ele (a tabela é nova).
begin;

do $$
begin
  if to_regclass('public.corre_push_log') is null or to_regclass('public.corre_push_pref') is null then
    raise exception 'o delta v4.19 precisa dos avisos no celular (v3.35) antes';
  end if;
  if to_regprocedure('public.corre_postar_tem(timestamptz)') is null then
    raise exception 'o delta v4.19 precisa do delta-v418.sql antes (a hora de postar)';
  end if;
end $$;

-- 1) as tarefas
create table if not exists public.corre_caderno (
  id uuid primary key default gen_random_uuid(),
  dono uuid not null default auth.uid() references public.corre_perfis (id) on delete cascade,
  titulo text not null check (char_length(btrim(titulo)) between 1 and 300),
  nota text not null default '' check (char_length(nota) <= 2000),
  lista text not null default '' check (char_length(lista) <= 40),
  dia date,
  hora text check (hora is null or hora ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  prio smallint not null default 4 check (prio between 1 and 4),
  repete text not null default '' check (repete in ('', 'dia', 'util', 'semana', 'mes')),
  avisa boolean not null default true,
  feito boolean not null default false,
  feito_em timestamptz,
  pai uuid references public.corre_caderno (id) on delete cascade,
  ordem double precision not null default 0,
  quando timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (hora is null or dia is not null)
);
create index if not exists corre_caderno_dono_idx on public.corre_caderno (dono, feito, dia);
create index if not exists corre_caderno_pai_idx on public.corre_caderno (pai) where pai is not null;
-- a fila do relógio: só o que tem hora, avisa e não foi feito
create index if not exists corre_caderno_quando_idx on public.corre_caderno (quando) where not feito and avisa and quando is not null;
alter table public.corre_caderno enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'corre_caderno' and policyname = 'caderno: so a dona') then
    create policy "caderno: so a dona" on public.corre_caderno using (dono = auth.uid()) with check (dono = auth.uid());
  end if;
end $$;
-- (tabela nova no Supabase nasce com tudo pra todo mundo, TRUNCATE inclusive: tira e dá só o que o app usa)
revoke all on public.corre_caderno from anon, authenticated;
grant select, insert, update, delete on public.corre_caderno to authenticated;

-- o gatilho: a hora do aviso (o dia e a hora são de Brasília), o feito_em, a subtarefa (da mesma dona, um nível só,
-- sem dia nem repetir próprios) e o teto de 5000 por pessoa
-- (sem security definer: a leitura do pai e a conta passam pela RLS, então pai de outra pessoa nem aparece)
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
  -- (a hora é conferida antes de virar time: "25:00" daria erro de data, não o recado certo)
  if new.hora is not null and new.hora !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'hora' using hint = 'hora'; end if;
  if new.repete <> '' and new.dia is null then raise exception 'repetir sem dia' using hint = 'repete'; end if;
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
create or replace trigger corre_caderno_ok before insert or update on public.corre_caderno
  for each row execute function public.corre_caderno_ok();

-- 2) a preferência (o ajuste dos avisos ganha "caderno"; o resto igual ao da v4.18)
alter table public.corre_push_pref add column if not exists caderno boolean;

create or replace function public.corre_push_ajustes(p_endpoint text default null) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'msg', coalesce(p.msg, true), 'resp', coalesce(p.resp, true), 'seg', coalesce(p.seg, true),
    'curt', coalesce(p.curt, true), 'texto', coalesce(p.texto, true), 'lembra', coalesce(p.lembra, true),
    'postar', coalesce(p.postar, true), 'caderno', coalesce(p.caderno, true),
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
  if p_campo not in ('msg', 'resp', 'seg', 'curt', 'texto', 'lembra', 'postar', 'caderno') or p_valor is null then raise exception 'campo' using hint = 'campo'; end if;
  insert into public.corre_push_pref (dono) values (eu) on conflict (dono) do nothing;
  execute format('update public.corre_push_pref set %I = $1, updated_at = now() where dono = $2', p_campo) using p_valor, eu;
  return public.corre_push_ajustes(null);
end $$;
revoke all on function public.corre_push_ajusta(text, boolean) from public, anon;
grant execute on function public.corre_push_ajusta(text, boolean) to authenticated;

-- 3) as tarefas que venceram nos últimos 30 minutos e ainda não avisaram (o relógio parado por mais que isso não
--    acorda ninguém com tarefa de horas atrás). A chave leva a hora: mudou a hora (ou a repetição andou), avisa de novo
create or replace function public.corre_caderno_fila(p_agora timestamptz default now())
returns table (id uuid, dono uuid, chave text)
language sql stable security definer set search_path = public, pg_temp as $$
  select c.id, c.dono, 'caderno:' || c.id || ':' || floor(extract(epoch from c.quando))::bigint
    from public.corre_caderno c
   where not c.feito and c.avisa and c.quando <= p_agora + interval '30 seconds' and c.quando > p_agora - interval '30 minutes'
     and coalesce((select pr.caderno from public.corre_push_pref pr where pr.dono = c.dono), true)
     and exists (select 1 from public.corre_push d where d.dono = c.dono)
     and not exists (select 1 from public.corre_push_log l where l.chave = 'caderno:' || c.id || ':' || floor(extract(epoch from c.quando))::bigint) $$;
revoke all on function public.corre_caderno_fila(timestamptz) from public, anon, authenticated;
grant execute on function public.corre_caderno_fila(timestamptz) to service_role;

create or replace function public.corre_caderno_tem(p_agora timestamptz default now()) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.corre_caderno_fila(p_agora)) $$;
revoke all on function public.corre_caderno_tem(timestamptz) from public, anon, authenticated;
grant execute on function public.corre_caderno_tem(timestamptz) to service_role;

-- 4) os avisos ([{ para, tipo, subs, payload }], como o corre_postar_alvos). No máximo 10 por pessoa numa volta
create or replace function public.corre_caderno_alvos(p_agora timestamptz default now()) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  f record; t record; ja bigint; subs jsonb; mostra boolean; titulo text; corpo text; ns int;
  conta jsonb := '{}'::jsonb;
  out jsonb := '[]'::jsonb;
begin
  for f in select * from public.corre_caderno_fila(p_agora) order by 1 limit 200 loop
    continue when coalesce((conta ->> f.dono::text)::int, 0) >= 10;
    -- a marca antes de sair: outra chamada ao mesmo tempo não manda de novo
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
    titulo := case when mostra then left(t.titulo, 110) else 'Hora de uma tarefa' end;
    corpo := 'Caderninho · ' || t.hora
             || case when mostra and t.lista <> '' then ' · ' || t.lista else '' end
             || case when ns = 1 then ' · 1 subtarefa' when ns > 1 then ' · ' || ns || ' subtarefas' else '' end
             || case when mostra and btrim(t.nota) <> '' then '. ' || left(btrim(t.nota), 120) else '' end
             || case when t.prio = 1 then '. Prioridade 1.' else '.' end;
    out := out || jsonb_build_array(jsonb_build_object('para', f.dono, 'tipo', 'caderno', 'subs', subs,
      'payload', jsonb_build_object('titulo', left(titulo, 120), 'corpo', left(corpo, 300), 'url', '/#/caderninho/t/' || t.id,
                                    'tag', 'caderno-' || t.id, 'renotify', true, 't', 'caderno', 'em', now())));
  end loop;
  return out;
end $$;
revoke all on function public.corre_caderno_alvos(timestamptz) from public, anon, authenticated;
grant execute on function public.corre_caderno_alvos(timestamptz) to service_role;

commit;

-- 5) o relógio: o mesmo da hora de postar (v4.18), de minuto em minuto, agora chamando a função também quando tem
--    tarefa na hora (a função "push", acao "postar", entrega as duas coisas). O cabeçalho é o que o relógio do
--    Instagram já usa, lido do job dele aqui no banco: nenhuma chave entra no repositório. Sem o pg_cron ou o pg_net (o
--    banco de teste), passa. O schedule com o mesmo nome troca o que tinha (rodar 2x não duplica)
do $$
declare h text; cab jsonb := '{"Content-Type": "application/json"}'::jsonb;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') and exists (select 1 from pg_extension where extname = 'pg_net') then
    begin
      select substring(j.command from 'Bearer [A-Za-z0-9._-]+') into h from cron.job j
       where j.jobname in ('corre-studio-publica', 'corre-hora-de-postar', 'corre-lembretes') and j.command ~ 'Bearer '
       order by j.jobname = 'corre-studio-publica' desc limit 1;
    exception when others then h := null;
    end;
    if h is not null then cab := cab || jsonb_build_object('Authorization', h); end if;
    perform cron.schedule('corre-hora-de-postar', '* * * * *',
      format('select net.http_post(url := %L, headers := %L::jsonb, body := %L::jsonb, timeout_milliseconds := 60000) where public.corre_postar_tem() or public.corre_caderno_tem()',
             'https://jzjsqadcwphqzxfsxxyx.supabase.co/functions/v1/push', cab::text, '{"acao": "postar"}'));
  end if;
end $$;

select case when to_regclass('public.corre_caderno') is not null
             and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'corre_push_pref' and column_name = 'caderno')
             and to_regprocedure('public.corre_caderno_alvos(timestamptz)') is not null
             and to_regprocedure('public.corre_caderno_tem(timestamptz)') is not null
             and not has_function_privilege('authenticated', 'public.corre_caderno_alvos(timestamptz)', 'execute')
             and not has_function_privilege('anon', 'public.corre_caderno_fila(timestamptz)', 'execute')
             and not has_table_privilege('anon', 'public.corre_caderno', 'select')
             and not has_table_privilege('authenticated', 'public.corre_caderno', 'truncate')
             and position('caderno' in (select prosrc from pg_proc where oid = 'public.corre_push_ajusta(text,boolean)'::regprocedure)) > 0
            then 'delta v4.19 ok' else 'delta v4.19 NÃO TERMINOU: rode o arquivo inteiro de novo.' end as status;
