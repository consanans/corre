-- CORRE v4.06 · os lembretes (o Corre puxa de volta quem sumiu)
-- Pode rodar duas vezes. Sem DROP (o conector do Supabase trava em comando com DROP). Termina com 'delta v4.06 ok'.
-- Precisa da v3.35 (os avisos no celular: corre_push e companhia), da v4.0 (o link na bio) e da v4.02 (a Lojinha).
--
-- O Thales: "fazer quem entra voltar". Pela Lojinha, de 19 pessoas com mais de uma semana, 4 voltaram. Os avisos da
-- hora (mensagem, resposta, curtida, seguiu) já existem; faltava o Corre chamar a pessoa quando tem NOVIDADE PRA ELA:
--   1. o link na bio teve visita            "5 visitas no teu link na bio"
--   2. pedido novo no Mural pro corre dela  "Pedido novo no Mural pro teu corre"
--   3. faltam passos (só nas 3 semanas 1ªs) "Faltam 2 passos pro teu Corre ficar pronto" (no máximo 3 vezes)
--   4. sumiu 4 dias e quem ela segue postou "3 posts novos de quem você segue"
--   5. sumiu uma semana                     "Hoje tem Som na Concha às 20h" (o show do Correverso)
-- Regras: só pra quem ligou os avisos e não desligou os lembretes (corre_push_pref.lembra); nunca pra quem já abriu
-- o Corre hoje; no máximo 1 por dia e 3 por semana; cada tipo com o seu intervalo; nada inventado: sem novidade, sem
-- aviso. O relógio do banco chama a função "push" (acao "lembretes") todo dia às 18h07 de Brasília, e o banco só
-- solta lembrete das 17h às 20h59 (quem chamar a função fora disso não manda nada pra ninguém).
--
-- 1) corre_push_pref.lembra (desligado = sem lembrete; vazio = ligado) e os ajustes que o app lê e grava
-- 2) corre_lembretes (dono, dia, tipo, em): o que saiu, um por dia por pessoa. Ninguém do app lê; a Lojinha conta
-- 3) corre_lembretes_alvos(agora, dono, teste): quem recebe o quê, com os aparelhos (só o servidor chama)
-- 4) corre_lembretes_numeros(dias): pra Lojinha (só os donos): quantos saíram, de que tipo, quantos voltaram
-- 5) o relógio (pg_cron + pg_net, os mesmos da fila do Instagram)

do $$ begin
  if to_regclass('public.corre_push') is null or to_regclass('public.corre_push_pref') is null then
    raise exception 'falta o delta dos avisos no celular (v3.35) antes deste';
  end if;
  if to_regclass('public.corre_ativo_dia') is null or to_regprocedure('public.corre_ve_lojinha(uuid)') is null then
    raise exception 'falta o delta-v402.sql (a Lojinha) antes deste';
  end if;
end $$;

-- 1) a preferência
alter table public.corre_push_pref add column if not exists lembra boolean;

create or replace function public.corre_push_ajustes(p_endpoint text default null) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'msg', coalesce(p.msg, true), 'resp', coalesce(p.resp, true), 'seg', coalesce(p.seg, true),
    'curt', coalesce(p.curt, true), 'texto', coalesce(p.texto, true), 'lembra', coalesce(p.lembra, true),
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
  if p_campo not in ('msg', 'resp', 'seg', 'curt', 'texto', 'lembra') or p_valor is null then raise exception 'campo' using hint = 'campo'; end if;
  insert into public.corre_push_pref (dono) values (eu) on conflict (dono) do nothing;
  execute format('update public.corre_push_pref set %I = $1, updated_at = now() where dono = $2', p_campo) using p_valor, eu;
  return public.corre_push_ajustes(null);
end $$;
revoke all on function public.corre_push_ajusta(text, boolean) from public, anon;
grant execute on function public.corre_push_ajusta(text, boolean) to authenticated;

-- 2) o que saiu (um por dia por pessoa: a chave já segura a corrida de duas chamadas juntas)
create table if not exists public.corre_lembretes (
  dono uuid not null references public.corre_perfis (id) on delete cascade,
  dia  date not null,
  tipo text not null,
  em   timestamptz not null default now(),
  primary key (dono, dia)
);
alter table public.corre_lembretes enable row level security;
-- tabela nova nasce com grant demais: aqui ninguém do app lê nem escreve (quem escreve é a função, como dona)
revoke all on public.corre_lembretes from public, anon, authenticated, service_role;

-- 3) quem recebe o quê. p_teste (o "Mandar um lembrete de exemplo" do app, pela função): só pra uma pessoa, sem horário,
--    sem limite e sem gravar, e, sem novidade nenhuma, um exemplo. Devolve [{para, tipo, payload, subs}], o mesmo jeito
--    do corre_push_alvos (a função "push" cifra e entrega)
create or replace function public.corre_lembretes_alvos(p_agora timestamptz default now(), p_dono uuid default null, p_teste boolean default false)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  tz constant text := 'America/Sao_Paulo';
  hoje date := (p_agora at time zone tz)::date;
  hora int := extract(hour from (p_agora at time zone tz))::int;
  q uuid; pf record;
  out jsonb := '[]'::jsonb;
  tipo text; titulo text; corpo text; url text;
  v bigint; tq bigint; n bigint; k int; ult date; nomes text; arr text[];
  falta text[][];
  subs jsonb;
  t date;
  dias_lembra int;
  ja bigint;
begin
  if p_teste and p_dono is null then return '[]'::jsonb; end if;
  -- o horário (17h às 20h59 de Brasília): fora dele, ninguém recebe nada
  if not p_teste and (hora < 17 or hora > 20) then return '[]'::jsonb; end if;
  for q in select distinct d.dono from public.corre_push d join public.corre_perfis p on p.id = d.dono
            where (p_dono is null or d.dono = p_dono) loop
    select * into pf from public.corre_perfis where id = q;
    tipo := null;
    -- o último dia em que a pessoa abriu o Corre (o dia marcado pelo app ou a sessão do login)
    t := (select max(a.dia) from public.corre_ativo_dia a where a.dono = q);
    begin
      t := greatest(t, (select max(((coalesce(s.refreshed_at at time zone 'UTC', s.updated_at, s.created_at)) at time zone tz)::date) from auth.sessions s where s.user_id = q));
    exception when others then null;
    end;
    if not p_teste then
      continue when coalesce((select pr.lembra from public.corre_push_pref pr where pr.dono = q), true) = false;
      continue when t is not null and t >= hoje;                                   -- já abriu hoje
      continue when exists (select 1 from public.corre_lembretes l where l.dono = q and l.dia = hoje);
      continue when (select count(*) from public.corre_lembretes l where l.dono = q and l.dia > hoje - 7) >= 3;
    end if;

    -- 1. o link na bio: visitas nos últimos 7 dias (de 7 em 7 dias)
    begin
      select coalesce(sum(b.n) filter (where b.chave = 'visita'), 0), coalesce(sum(b.n) filter (where b.chave <> 'visita'), 0) into v, tq
        from public.corre_bio_conta b where b.dono = q and b.dia > hoje - 7;
    exception when others then v := 0; tq := 0;
    end;
    if v >= 1 and (p_teste or not exists (select 1 from public.corre_lembretes l where l.dono = q and l.tipo = 'bio' and l.dia > hoje - 7)) then
      tipo := 'bio';
      titulo := case when v = 1 then '1 visita no teu link na bio' else v || ' visitas no teu link na bio' end;
      corpo := 'Nos últimos 7 dias' || case when tq > 0 then ', com ' || tq || case when tq = 1 then ' toque' else ' toques' end || ' nos teus botões' else '' end
               || '. Toca pra ver.';
      url := '/#/linkbio';
    end if;

    -- 2. o Mural: pedido aberto novo (3 dias) na categoria do corre da pessoa (de 2 em 2 dias, só o que ela não viu)
    if tipo is null and to_regclass('public.corre_mural') is not null and coalesce(pf.categoria, '') not in ('', 'outros') then
      ult := (select max(l.dia) from public.corre_lembretes l where l.dono = q and l.tipo = 'mural');
      begin
        execute 'select count(*) from public.corre_mural m where m.categoria = $1 and m.st = ''aberto'' and m.created_at > $2 - interval ''3 days''
                   and (m.expira_em is null or m.expira_em > $2) and m.dono is distinct from $3 and ($4::date is null or m.created_at >= ($4::date + 1)::timestamp at time zone $5)'
          into n using pf.categoria, p_agora, q, case when p_teste then null else ult end, tz;
      exception when others then n := 0;
      end;
      if n >= 1 and (p_teste or ult is null or ult <= hoje - 2) then
        tipo := 'mural';
        titulo := case when n = 1 then 'Pedido novo no Mural pro teu corre' else n || ' pedidos novos no Mural pro teu corre' end;
        corpo := 'Alguém tá procurando o que você faz. Chega antes e manda tua proposta.';
        url := '/#/mural';
      end if;
    end if;

    -- 3. os passos que faltam (só nas 3 primeiras semanas; de 3 em 3 dias; no máximo 3 vezes)
    if tipo is null and (p_teste or (pf.created_at > p_agora - interval '21 days'
         and not exists (select 1 from public.corre_lembretes l where l.dono = q and l.tipo = 'passos' and l.dia > hoje - 3)
         and (select count(*) from public.corre_lembretes l where l.dono = q and l.tipo = 'passos') < 3)) then
      falta := array[]::text[][];
      if coalesce(btrim(pf.faz), '') = '' then falta := falta || array[['Diz o que você vende: o Corre monta teu Hórus, teu Mural e tua vitrine por isso.', '/#/editar']]; end if;
      if coalesce(btrim(pf.whats_publico), '') = '' then falta := falta || array[['Põe teu WhatsApp: vira o botão "Chamar no WhatsApp" do teu perfil e do link na bio.', '/#/editar']]; end if;
      if not public.corre_bio_montou(pf.bio_link) then falta := falta || array[['Monta teu link na bio e cola na bio do Instagram.', '/#/linkbio']]; end if;
      begin
        if not exists (select 1 from public.corre_feed f where f.dono = q) then falta := falta || array[['Faz teu primeiro post e mostra um trampo teu pra rede.', '/#/']]; end if;
      exception when others then null;
      end;
      if coalesce(pf.avatar_url, '') = '' then falta := falta || array[['Põe tua foto: gente confia em quem mostra a cara.', '/#/editar']]; end if;
      k := coalesce(array_length(falta, 1), 0);
      if k >= 1 then
        tipo := 'passos';
        titulo := case when k = 1 then 'Falta 1 passo pro teu Corre ficar pronto' else 'Faltam ' || k || ' passos pro teu Corre ficar pronto' end;
        corpo := falta[1][1]; url := falta[1][2];
      end if;
    end if;

    -- 4. sumiu 4 dias ou mais e quem a pessoa segue postou (fora de grupo) desde a última vez (de 4 em 4 dias)
    if tipo is null and (p_teste or ((t is null and pf.created_at < p_agora - interval '4 days') or t <= hoje - 4))
       and (p_teste or not exists (select 1 from public.corre_lembretes l where l.dono = q and l.tipo = 'feed' and l.dia > hoje - 4)) then
      begin
        select count(*), array_agg(distinct '@' || p2.handle) filter (where p2.handle is not null) into n, arr
          from (select f.dono from public.corre_feed f join public.corre_seguindo s on s.quem = q and s.segue = f.dono
                 where f.grupo is null and f.dono <> q
                   and f.created_at > greatest(coalesce((t + 1)::timestamp at time zone tz, p_agora - interval '7 days'), p_agora - interval '7 days')) x
          left join lateral (select pp.handle from public.corre_perfis pp where pp.id = x.dono) p2 on true;
      exception when others then n := 0;
      end;
      if n >= (case when p_teste then 1 else 2 end) then
        tipo := 'feed';
        titulo := n || case when n = 1 then ' post novo de quem você segue' else ' posts novos de quem você segue' end;
        -- só os dois primeiros @ (o resto vira "e mais gente")
        nomes := case coalesce(array_length(arr, 1), 0) when 0 then null when 1 then arr[1] when 2 then arr[1] || ' e ' || arr[2]
                 else arr[1] || ', ' || arr[2] || ' e mais gente' end;
        corpo := coalesce('De ' || nomes || '. ', '') || 'Bora ver o que rolou?';
        url := '/#/';
      end if;
    end if;

    -- 5. sumiu uma semana: o show do Correverso de hoje (de 10 em 10 dias)
    if tipo is null and not p_teste and ((t is null and pf.created_at < p_agora - interval '7 days') or t <= hoje - 7)
       and not exists (select 1 from public.corre_lembretes l where l.dono = q and l.tipo = 'concha' and l.dia > hoje - 10) then
      tipo := 'concha';
      titulo := 'Hoje tem Som na Concha às 20h';
      corpo := 'O MC Garoa sobe no palco do Correverso. Chega cedo.';
      url := '/#/verso';
    end if;

    -- o exemplo (só no teste, sem novidade nenhuma)
    if tipo is null and p_teste then
      tipo := 'exemplo';
      titulo := 'Lembrete do Corre';
      corpo := 'Nada novo agora. Quando tiver visita no teu link, pedido no Mural ou post de quem você segue, chega assim.';
      url := '/#/';
    end if;
    continue when tipo is null;

    -- grava (a chave segura a corrida: se outra chamada gravou primeiro, esta não manda)
    if not p_teste then
      insert into public.corre_lembretes (dono, dia, tipo, em) values (q, hoje, tipo, now()) on conflict do nothing;
      get diagnostics ja = row_count;
      continue when ja = 0;
    end if;
    subs := (select jsonb_agg(jsonb_build_object('endpoint', d.endpoint, 'p256dh', d.p256dh, 'auth', d.auth) order by d.visto_em desc)
               from (select * from public.corre_push d2 where d2.dono = q order by d2.visto_em desc limit 10) d);
    continue when subs is null;
    out := out || jsonb_build_array(jsonb_build_object('para', q, 'tipo', tipo, 'subs', subs,
      'payload', jsonb_build_object('titulo', left(titulo, 120), 'corpo', left(corpo, 300), 'url', url, 'tag', 'lembra-' || tipo,
                                    'renotify', true, 't', 'lembra', 'em', now())));
  end loop;
  return out;
end $$;
revoke all on function public.corre_lembretes_alvos(timestamptz, uuid, boolean) from public, anon, authenticated;
grant execute on function public.corre_lembretes_alvos(timestamptz, uuid, boolean) to service_role;

-- 4) pra Lojinha (só os donos, como ela): quantos lembretes saíram no período, de que tipo, quantos voltaram no mesmo
--    dia ou no seguinte, e quanta gente ligou os avisos. Fora da conta de gente: o fundador e o @corre (como na Lojinha)
create or replace function public.corre_lembretes_numeros(p_dias int default 30) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  fora constant uuid[] := array['d1e9f6ac-f5d7-4723-8b02-eb0d1d7137b0', '45ff37aa-aa4f-4438-9414-54b5fd94f240']::uuid[];
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  d int := greatest(7, least(coalesce(p_dias, 30), 120));
  r jsonb;
begin
  if not public.corre_ve_lojinha(auth.uid()) then
    raise exception 'A Lojinha é só do dono do Corre.' using errcode = '42501', hint = 'so_fundador';
  end if;
  select jsonb_build_object(
      'enviados', count(*), 'pessoas', count(distinct l.dono),
      'voltaram', count(*) filter (where exists (select 1 from public.corre_ativo_dia a where a.dono = l.dono and a.dia between l.dia and l.dia + 1)),
      'tipos', coalesce((select jsonb_object_agg(z.tipo, z.n) from (select l2.tipo, count(*) n from public.corre_lembretes l2
                          where l2.dia > hoje - d and l2.dono <> all (fora) group by l2.tipo) z), '{}'::jsonb))
    into r from public.corre_lembretes l where l.dia > hoje - d and l.dono <> all (fora);
  return r || jsonb_build_object(
    'avisos', (select count(distinct x.dono) from public.corre_push x where x.dono <> all (fora)),
    'aparelhos', (select count(*) from public.corre_push x where x.dono <> all (fora)),
    'desligaram', (select count(*) from public.corre_push_pref p where p.lembra = false and p.dono <> all (fora)),
    'dias_periodo', d);
end $$;
revoke all on function public.corre_lembretes_numeros(int) from public, anon, authenticated, service_role;
grant execute on function public.corre_lembretes_numeros(int) to authenticated;

-- 5) o relógio: todo dia às 21h07 UTC (18h07 de Brasília), o banco chama a função "push" (que não pede login pros
--    lembretes: quem decide é o banco, e fora do horário ele não solta nada). Vai com o mesmo cabeçalho que o relógio do
--    Instagram (corre-studio-publica) já usa e funciona: lido do job dele aqui no banco, então nenhuma chave entra no
--    repositório. Sem o pg_cron ou o pg_net (o banco de teste), passa. O schedule com o mesmo nome troca o que tinha
--    (rodar duas vezes não duplica)
do $$
declare h text; cab jsonb := '{"Content-Type": "application/json"}'::jsonb;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') and exists (select 1 from pg_extension where extname = 'pg_net') then
    begin
      select substring(j.command from 'Bearer [A-Za-z0-9._-]+') into h from cron.job j where j.jobname = 'corre-studio-publica' limit 1;
    exception when others then h := null;
    end;
    if h is not null then cab := cab || jsonb_build_object('Authorization', h); end if;
    perform cron.schedule('corre-lembretes', '7 21 * * *',
      format('select net.http_post(url := %L, headers := %L::jsonb, body := %L::jsonb, timeout_milliseconds := 120000)',
             'https://jzjsqadcwphqzxfsxxyx.supabase.co/functions/v1/push', cab::text, '{"acao": "lembretes"}'));
  end if;
end $$;

-- confere que ficou tudo no lugar
do $$ begin
  if to_regclass('public.corre_lembretes') is null or to_regprocedure('public.corre_lembretes_alvos(timestamptz, uuid, boolean)') is null
     or to_regprocedure('public.corre_lembretes_numeros(integer)') is null
     or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'corre_push_pref' and column_name = 'lembra') then
    raise exception 'delta v4.06 incompleto';
  end if;
end $$;
select 'delta v4.06 ok';
