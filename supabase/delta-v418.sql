-- v4.18 · A HORA DE POSTAR: o Studio avisa no celular na hora do post que não sai sozinho.
-- O Thales perguntou "o que dá pra fazer agora sem essa função do insta/meta?". A postagem automática depende da Meta
-- (o app em teste, a conta que não conecta); sem ela, todo post programado vira lembrete, e o app prometia "na hora, o
-- Corre avisa", mas o aviso só aparecia com o Corre aberto (a Comanda do menu). Agora chega no celular:
--
--   "Hora de postar · Padaria Sol"   o post programado sem conta conectada (ou com a conta vencida), na hora marcada.
--   "Não saiu no Instagram · Padaria Sol"   o post que ia sair sozinho e o Instagram recusou: posta à mão.
--
-- Tocou, abre o post no Studio com o Postar na mão (a legenda vai copiada; carrossel, story e reels vão pro
-- compartilhar do celular). Cada post avisa uma vez por horário (reprogramou, avisa de novo na hora nova), só pra quem
-- ligou os avisos e não desligou "Hora de postar" (corre_push_pref.postar). O ícone do aviso é o logo da marca.
--
--   corre_push_pref.postar      desligado = sem aviso de postar; vazio = ligado. Os ajustes que o app lê e grava aceitam.
--   corre_postar_fila(agora)    os posts que venceram e ainda não avisaram, de quem tem aparelho (só o servidor).
--   corre_postar_tem()          tem alguém pra avisar agora? (o relógio só chama a função quando tem)
--   corre_postar_alvos(agora)   os avisos, no jeito do corre_lembretes_alvos (só o servidor; a função push entrega,
--                               acao "postar", sem login: quem decide é o banco, e cada aviso é marcado antes de sair)
--   o relógio                   de minuto em minuto, o banco olha se tem post na hora; só quando tem, chama a função.
--
-- Precisa da v3.35 (os avisos), da v3.40 (as contas do Instagram) e da v4.17 (os formatos). Pode rodar duas vezes.
-- Sem DROP. Site antigo com o delta: o aviso chega e abre o Studio (o post aberto é coisa do site novo).
begin;

do $$
begin
  if to_regclass('public.corre_push_log') is null or to_regclass('public.corre_push_pref') is null then
    raise exception 'o delta v4.18 precisa dos avisos no celular (v3.35) antes';
  end if;
  if to_regclass('public.corre_ig_contas') is null then
    raise exception 'o delta v4.18 precisa das contas do Instagram (delta-v340.sql) antes';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'corre_posts' and column_name = 'formato') then
    raise exception 'o delta v4.18 precisa do delta-v417.sql antes (os formatos do Studio)';
  end if;
end $$;

-- 1) a preferência (o ajuste dos avisos ganha "postar"; o resto igual ao da v4.06)
alter table public.corre_push_pref add column if not exists postar boolean;

create or replace function public.corre_push_ajustes(p_endpoint text default null) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'msg', coalesce(p.msg, true), 'resp', coalesce(p.resp, true), 'seg', coalesce(p.seg, true),
    'curt', coalesce(p.curt, true), 'texto', coalesce(p.texto, true), 'lembra', coalesce(p.lembra, true),
    'postar', coalesce(p.postar, true),
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
  if p_campo not in ('msg', 'resp', 'seg', 'curt', 'texto', 'lembra', 'postar') or p_valor is null then raise exception 'campo' using hint = 'campo'; end if;
  insert into public.corre_push_pref (dono) values (eu) on conflict (dono) do nothing;
  execute format('update public.corre_push_pref set %I = $1, updated_at = now() where dono = $2', p_campo) using p_valor, eu;
  return public.corre_push_ajustes(null);
end $$;
revoke all on function public.corre_push_ajusta(text, boolean) from public, anon;
grant execute on function public.corre_push_ajusta(text, boolean) to authenticated;

-- 2) quem deu erro no Instagram sai rápido da busca (a fila do agendado já tem o índice dela, corre_posts_fila_idx)
create index if not exists corre_posts_erro_idx on public.corre_posts (updated_at) where ig_status = 'erro';

-- 3) os posts que venceram e ainda não avisaram:
--    "mao"  programado (agendado), com arte, sem conta conectada que valha, e a hora chegou nos últimos 30 minutos
--           (o relógio parado por mais que isso não acorda ninguém com post de horas atrás);
--    "erro" ia sair sozinho, venceu nas últimas 6 horas e o Instagram recusou nos últimos 30 minutos (o "Publicar
--           direto" de um post de amanhã que falha não entra: a pessoa já viu o erro na tela).
--    A chave leva o horário: reprogramou, avisa de novo na hora nova.
create or replace function public.corre_postar_fila(p_agora timestamptz default now())
returns table (id uuid, dono uuid, tipo text, chave text)
language sql stable security definer set search_path = public, pg_temp as $$
  select x.id, x.dono, x.tipo, x.chave from (
    select p.id, p.dono, 'mao'::text as tipo, 'postar:' || p.id || ':' || floor(extract(epoch from p.ig_quando))::bigint as chave
      from public.corre_posts p
     where p.ig_status = 'agendado' and p.ig_quando <= p_agora + interval '30 seconds' and p.ig_quando > p_agora - interval '30 minutes'
       and coalesce(p.status, '') <> 'postado' and coalesce(p.midia_url, '') <> ''
       and not exists (select 1 from public.corre_ig_contas c where c.id = p.ig_conta and c.dono = p.dono and c.status = 'ok')
    union all
    select p.id, p.dono, 'erro', 'postar-erro:' || p.id || ':' || floor(extract(epoch from p.ig_quando))::bigint
      from public.corre_posts p
     where p.ig_status = 'erro' and p.updated_at > p_agora - interval '30 minutes'
       and p.ig_quando <= p_agora and p.ig_quando > p_agora - interval '6 hours'
       and coalesce(p.status, '') <> 'postado'
  ) x
  where coalesce((select pr.postar from public.corre_push_pref pr where pr.dono = x.dono), true)
    and exists (select 1 from public.corre_push d where d.dono = x.dono)
    and not exists (select 1 from public.corre_push_log l where l.chave = x.chave) $$;
revoke all on function public.corre_postar_fila(timestamptz) from public, anon, authenticated;
grant execute on function public.corre_postar_fila(timestamptz) to service_role;

create or replace function public.corre_postar_tem(p_agora timestamptz default now()) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.corre_postar_fila(p_agora)) $$;
revoke all on function public.corre_postar_tem(timestamptz) from public, anon, authenticated;
grant execute on function public.corre_postar_tem(timestamptz) to service_role;

-- 4) os avisos (o mesmo formato do corre_lembretes_alvos: [{ para, tipo, subs, payload }]). No máximo 10 por pessoa
--    numa volta (o lote de um mês não sai tudo de uma vez: o resto fica pra próxima, dentro dos 30 minutos)
create or replace function public.corre_postar_alvos(p_agora timestamptz default now()) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  f record; p record; ja bigint; subs jsonb; mostra boolean; n int;
  fmt text; titulo text; corpo text; marca text; logo text;
  conta jsonb := '{}'::jsonb;
  out jsonb := '[]'::jsonb;
begin
  for f in select * from public.corre_postar_fila(p_agora) order by 1 limit 200 loop
    continue when coalesce((conta ->> f.dono::text)::int, 0) >= 10;
    -- a marca antes de sair: outra chamada ao mesmo tempo não manda de novo
    insert into public.corre_push_log (chave, quem) values (left(f.chave, 200), null) on conflict do nothing;
    get diagnostics ja = row_count;
    continue when ja = 0;
    select q.*, m.marca as m_nome, m.logo_url as m_logo into p
      from public.corre_posts q left join public.corre_portfolio m on m.id = q.marca_id where q.id = f.id;
    continue when p.id is null;
    subs := (select jsonb_agg(jsonb_build_object('endpoint', d.endpoint, 'p256dh', d.p256dh, 'auth', d.auth) order by d.visto_em desc)
               from (select * from public.corre_push d2 where d2.dono = f.dono order by d2.visto_em desc limit 10) d);
    continue when subs is null;
    conta := conta || jsonb_build_object(f.dono::text, coalesce((conta ->> f.dono::text)::int, 0) + 1);
    mostra := coalesce((select pr.texto from public.corre_push_pref pr where pr.dono = f.dono), true);
    marca := left(coalesce(nullif(btrim(p.m_nome), ''), 'tua marca'), 60);
    logo := case when coalesce(p.m_logo, '') ~ '^https://' and length(p.m_logo) <= 500 then p.m_logo else '' end;
    n := case when jsonb_typeof(p.midias) = 'array' then jsonb_array_length(p.midias) else 0 end;
    fmt := case p.formato when 'carrossel' then 'Carrossel' || case when n > 1 then ' de ' || n else '' end
                          when 'story' then 'Story' when 'reels' then 'Reels' else 'Post' end;
    if f.tipo = 'erro' then
      titulo := 'Não saiu no Instagram · ' || marca;
      corpo := fmt || ' das ' || coalesce(nullif(p.hora, ''), to_char(p.ig_quando at time zone 'America/Sao_Paulo', 'HH24:MI'))
               || case when mostra and btrim(coalesce(p.titulo, '')) <> '' then ': ' || left(btrim(p.titulo), 80) else '' end
               || '. O Instagram recusou; toca pra postar à mão.';
    else
      titulo := 'Hora de postar · ' || marca;
      corpo := fmt || case when mostra and btrim(coalesce(p.titulo, '')) <> '' then ': ' || left(btrim(p.titulo), 80) else '' end
               || case when p.formato = 'story' then '. Toca e já vai pro story.' else '. Toca pra postar: a legenda vai copiada.' end;
    end if;
    out := out || jsonb_build_array(jsonb_build_object('para', f.dono, 'tipo', f.tipo, 'subs', subs,
      'payload', jsonb_build_object('titulo', left(titulo, 120), 'corpo', left(corpo, 300), 'url', '/#/studio/postar/' || p.id,
                                    'icone', logo, 'tag', 'postar-' || p.id, 'renotify', true, 't', 'postar', 'em', now())));
  end loop;
  return out;
end $$;
revoke all on function public.corre_postar_alvos(timestamptz) from public, anon, authenticated;
grant execute on function public.corre_postar_alvos(timestamptz) to service_role;

commit;

-- 5) o relógio: de minuto em minuto o banco confere (corre_postar_tem, barato: os índices da fila) e, só quando tem post
--    na hora, chama a função "push" (acao "postar", sem login). Vai com o mesmo cabeçalho que o relógio do Instagram
--    (corre-studio-publica) já usa: lido do job dele aqui no banco, então nenhuma chave entra no repositório. Sem o
--    pg_cron ou o pg_net (o banco de teste), passa. O schedule com o mesmo nome troca o que tinha (rodar 2x não duplica)
do $$
declare h text; cab jsonb := '{"Content-Type": "application/json"}'::jsonb;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') and exists (select 1 from pg_extension where extname = 'pg_net') then
    begin
      select substring(j.command from 'Bearer [A-Za-z0-9._-]+') into h from cron.job j
       where j.jobname in ('corre-studio-publica', 'corre-lembretes') and j.command ~ 'Bearer ' order by j.jobname = 'corre-studio-publica' desc limit 1;
    exception when others then h := null;
    end;
    if h is not null then cab := cab || jsonb_build_object('Authorization', h); end if;
    perform cron.schedule('corre-hora-de-postar', '* * * * *',
      format('select net.http_post(url := %L, headers := %L::jsonb, body := %L::jsonb, timeout_milliseconds := 60000) where public.corre_postar_tem()',
             'https://jzjsqadcwphqzxfsxxyx.supabase.co/functions/v1/push', cab::text, '{"acao": "postar"}'));
  end if;
end $$;

select case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'corre_push_pref' and column_name = 'postar')
             and to_regprocedure('public.corre_postar_alvos(timestamptz)') is not null
             and to_regprocedure('public.corre_postar_tem(timestamptz)') is not null
             and not has_function_privilege('authenticated', 'public.corre_postar_alvos(timestamptz)', 'execute')
             and not has_function_privilege('anon', 'public.corre_postar_alvos(timestamptz)', 'execute')
             and not has_function_privilege('anon', 'public.corre_postar_fila(timestamptz)', 'execute')
             and position('postar' in (select prosrc from pg_proc where oid = 'public.corre_push_ajusta(text,boolean)'::regprocedure)) > 0
            then 'delta v4.18 ok' else 'delta v4.18 NÃO TERMINOU: rode o arquivo inteiro de novo.' end as status;
