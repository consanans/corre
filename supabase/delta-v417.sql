-- v4.17 · O STUDIO GANHA CARROSSEL, STORY E REELS, E O LINK DE APROVAÇÃO DO CLIENTE.
-- O Thales: "link de aprovação pra ontem", "adicionar opção carrossel urgente", "adicionar opção de postar story, e reels".
--
--   corre_posts.formato     feed (uma imagem, como sempre), carrossel (2 a 10), story (uma foto ou um vídeo em pé) ou reels
--                           (um vídeo). O midia_url segue sendo a imagem do post (a capa do carrossel, a capa do reels, a
--                           foto do story ou um quadro do vídeo): a agenda, a grade e os testes antigos continuam lendo ele.
--   corre_posts.midias      as mídias do carrossel, do story e do reels: [{ u: endereço https, t: img ou video }], até 10.
--   corre_posts.ig_container  o contêiner que o Instagram tá processando (vídeo demora): só a função escreve; entre uma
--                           volta e outra da fila ela confere se ficou pronto e publica. Mudou a mídia ou reprogramou, zera.
--   corre_posts_ig_ok       o gatilho de antes, com as regras novas (o app não escreve o contêiner; programado tem que estar
--                           completo: carrossel com 2 ou mais, story com 1, reels com 1 vídeo) e a aprovação (o app só limpa;
--                           mudou a legenda, a arte, as mídias ou o formato, volta pro cliente ver de novo).
--   corre-video             a pasta pública dos vídeos (mp4 ou mov, até 50 MB), cada um na pasta do próprio login.
--   corre_aprovacoes        o link de aprovação: uma marca e um período (até 3 meses), com recado. O código é sorteado
--                           pelo banco (20 letras). A dona vê, cria, desliga e apaga os dela.
--   corre_posts.aprov...    a resposta do cliente em cada post: aprovado ou ajuste (com o que mudar), quem e quando.
--   corre_aprov_ver, corre_aprov_responder, corre_aprov_fim   a página do cliente (sem login): vê os posts do período que têm
--                           arte, aprova ou pede ajuste, e avisa que terminou. Link desligado ou apagado não abre.
--   corre_aprov_alvos       o aviso no celular de quem mandou o link quando o cliente termina (só o servidor; a função push
--                           entrega junto com os pedidos, acao "pedidos").
--
-- Precisa da v4.16 antes. Pode rodar duas vezes. Sem DROP.
begin;

do $$
begin
  if to_regprocedure('public.corre_pedidos_alvos(timestamptz)') is null then
    raise exception 'o delta v4.17 precisa do v4.16 antes';
  end if;
end $$;

-- 1) o formato do post, as mídias e o contêiner que o Instagram tá processando
alter table public.corre_posts add column if not exists formato text not null default 'feed';
alter table public.corre_posts add column if not exists midias jsonb not null default '[]'::jsonb;
alter table public.corre_posts add column if not exists ig_container text not null default '';
-- 2) a resposta do cliente
alter table public.corre_posts add column if not exists aprov text not null default '';
alter table public.corre_posts add column if not exists aprov_nota text not null default '';
alter table public.corre_posts add column if not exists aprov_quem text not null default '';
alter table public.corre_posts add column if not exists aprov_em timestamptz;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'corre_posts_formato_check' and conrelid = 'public.corre_posts'::regclass) then
    alter table public.corre_posts add constraint corre_posts_formato_check check (formato in ('feed', 'carrossel', 'story', 'reels'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'corre_posts_midias_check' and conrelid = 'public.corre_posts'::regclass) then
    alter table public.corre_posts add constraint corre_posts_midias_check check (jsonb_typeof(midias) = 'array' and jsonb_array_length(midias) <= 10 and pg_column_size(midias) < 20000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'corre_posts_ig_container_check' and conrelid = 'public.corre_posts'::regclass) then
    alter table public.corre_posts add constraint corre_posts_ig_container_check check (char_length(ig_container) <= 1000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'corre_posts_aprov_check' and conrelid = 'public.corre_posts'::regclass) then
    alter table public.corre_posts add constraint corre_posts_aprov_check check (aprov in ('', 'aprovado', 'ajuste') and char_length(aprov_nota) <= 600 and char_length(aprov_quem) <= 60);
  end if;
end $$;

-- 3) o gatilho do Instagram (o mesmo de antes, com as regras dos formatos e da aprovação)
create or replace function public.corre_posts_ig_ok() returns trigger
language plpgsql as $$
declare i jsonb; n int;
begin
  -- a função (chave de serviço) e o próprio banco podem tudo; quem vem pelo app só programa ou cancela
  if current_user not in ('authenticated', 'anon') then return new; end if;
  -- v4.17: as mídias do carrossel, do story e do reels: endereço https e o tipo (foto ou vídeo)
  for i in select x from jsonb_array_elements(case when jsonb_typeof(new.midias) = 'array' then new.midias else '[]'::jsonb end) x loop
    if jsonb_typeof(i) <> 'object' or coalesce(i ->> 'u', '') !~ '^https://\S{3,}$' or length(i ->> 'u') > 500 or coalesce(i ->> 't', '') not in ('img', 'video') then
      raise exception 'midias' using errcode = 'P0001', hint = 'midias';
    end if;
  end loop;
  if tg_op = 'INSERT' then
    if new.ig_status not in ('', 'agendado') or new.ig_media_id <> '' or new.ig_link <> '' or new.ig_tentativas <> 0 or new.ig_container <> '' then
      raise exception 'ig' using errcode = 'P0001', hint = 'ig';
    end if;
    new.ig_erro := '';
    -- a aprovação é do cliente (pelo link): post novo nasce sem
    new.aprov := ''; new.aprov_nota := ''; new.aprov_quem := ''; new.aprov_em := null;
  else
    if new.ig_media_id is distinct from old.ig_media_id or new.ig_link is distinct from old.ig_link or new.ig_tentativas is distinct from old.ig_tentativas
       or new.ig_container is distinct from old.ig_container then
      raise exception 'ig' using errcode = 'P0001', hint = 'ig';
    end if;
    if new.ig_status is distinct from old.ig_status then
      if old.ig_status in ('publicando', 'publicado') or new.ig_status not in ('', 'agendado') then
        raise exception 'ig' using errcode = 'P0001', hint = 'ig';
      end if;
      -- programar de novo (ou cancelar) zera o erro, as tentativas e o contêiner
      new.ig_erro := ''; new.ig_tentativas := 0; new.ig_container := '';
    elsif new.ig_erro is distinct from old.ig_erro and new.ig_erro <> '' then
      raise exception 'ig' using errcode = 'P0001', hint = 'ig';
    end if;
    -- mudou a arte, as mídias ou o formato: o contêiner que o Instagram processava não vale mais
    if new.midia_url is distinct from old.midia_url or new.midias is distinct from old.midias or new.formato is distinct from old.formato then
      new.ig_container := '';
    end if;
    -- a aprovação: quem escreve é o cliente (pelo link); a dona só limpa
    new.aprov_nota := old.aprov_nota; new.aprov_quem := old.aprov_quem; new.aprov_em := old.aprov_em;
    if new.aprov is distinct from old.aprov and new.aprov <> '' then new.aprov := old.aprov; end if;
    -- mudou o que o cliente viu: volta pra ele aprovar de novo (a nota do pedido de ajuste fica, como histórico)
    if old.aprov <> '' and (new.legenda is distinct from old.legenda or new.midia_url is distinct from old.midia_url
       or new.midias is distinct from old.midias or new.formato is distinct from old.formato) then
      new.aprov := '';
    end if;
  end if;
  -- programado: a hora de publicar sai da data e da hora do post (Brasília), sempre
  if new.ig_status = 'agendado' then
    if new.data is null then raise exception 'ig_quando' using errcode = 'P0001', hint = 'ig_quando'; end if;
    -- v4.17: e o post tem que estar completo pro formato dele
    n := jsonb_array_length(new.midias);
    if (new.formato = 'carrossel' and n < 2) or (new.formato in ('story', 'reels') and n <> 1)
       or (new.formato = 'reels' and coalesce(new.midias -> 0 ->> 't', '') <> 'video') then
      raise exception 'formato' using errcode = 'P0001', hint = 'formato';
    end if;
    new.ig_quando := (new.data + coalesce(nullif(new.hora, ''), '12:00')::time) at time zone 'America/Sao_Paulo';
  end if;
  return new;
end $$;

-- 4) a pasta dos vídeos (pública, como a das imagens; cada um sobe e apaga só na pasta do próprio login)
do $$
begin
  if to_regclass('storage.buckets') is null then return; end if;
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('corre-video', 'corre-video', true, 52428800, array['video/mp4', 'video/quicktime'])
  on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'corre-video: subo na minha pasta') then
    execute $p$create policy "corre-video: subo na minha pasta" on storage.objects for insert with check (bucket_id = 'corre-video' and (storage.foldername(name))[1] = (auth.uid())::text)$p$;
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'corre-video: vejo minha pasta') then
    execute $p$create policy "corre-video: vejo minha pasta" on storage.objects for select using (bucket_id = 'corre-video' and (storage.foldername(name))[1] = (auth.uid())::text)$p$;
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'corre-video: apago na minha pasta') then
    execute $p$create policy "corre-video: apago na minha pasta" on storage.objects for delete using (bucket_id = 'corre-video' and (storage.foldername(name))[1] = (auth.uid())::text)$p$;
  end if;
end $$;

-- 5) o link de aprovação
create table if not exists public.corre_aprovacoes (
  id uuid primary key default gen_random_uuid(),
  dono uuid not null references public.corre_perfis (id) on delete cascade,
  marca_id uuid not null references public.corre_portfolio (id) on delete cascade,
  codigo text not null default left(replace(gen_random_uuid()::text, '-', ''), 20),
  de date not null,
  ate date not null,
  msg text not null default '' check (char_length(msg) <= 600),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  aberto_em timestamptz,
  respondido_em timestamptz,
  quem text not null default '' check (char_length(quem) <= 60),
  check (ate >= de and ate - de <= 92)
);
create unique index if not exists corre_aprovacoes_codigo_key on public.corre_aprovacoes (codigo);
create index if not exists corre_aprovacoes_dono_idx on public.corre_aprovacoes (dono, marca_id);
alter table public.corre_aprovacoes enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'corre_aprovacoes' and policyname = 'aprovacoes: so a dona') then
    create policy "aprovacoes: so a dona" on public.corre_aprovacoes using (dono = auth.uid()) with check (dono = auth.uid());
  end if;
end $$;
revoke all on public.corre_aprovacoes from anon;
grant select, insert, update, delete on public.corre_aprovacoes to authenticated;
-- o código é do banco (sorteado), e o que o cliente faz (abriu, respondeu, quem) a dona não escreve
create or replace function public.corre_aprov_ok() returns trigger
language plpgsql as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if tg_op = 'INSERT' then
    new.codigo := left(replace(gen_random_uuid()::text, '-', ''), 20);
    new.aberto_em := null; new.respondido_em := null; new.quem := ''; new.created_at := now();
  else
    new.codigo := old.codigo; new.dono := old.dono; new.aberto_em := old.aberto_em; new.respondido_em := old.respondido_em; new.quem := old.quem; new.created_at := old.created_at;
  end if;
  return new;
end $$;
create or replace trigger corre_aprovacoes_ok before insert or update on public.corre_aprovacoes for each row execute function public.corre_aprov_ok();
-- a marca tem que ser da dona (a mesma regra dos posts)
create or replace trigger corre_aprovacoes_marca before insert or update on public.corre_aprovacoes for each row execute function public.corre_post_marca_ok();
do $$
begin
  if to_regprocedure('public.corre_limite()') is not null then
    execute 'create or replace trigger corre_aprovacoes_lim before insert on public.corre_aprovacoes for each row execute function public.corre_limite(''300'')';
  end if;
end $$;

-- 6) a página do cliente (sem login): ver, responder e terminar
-- um link que existe e tá ligado (senão, 'link'); a cota por conexão segura quem tenta adivinhar código
create or replace function public.corre_aprov_link(p_codigo text, p_tipo text, p_hora int, p_dia int) returns public.corre_aprovacoes
language plpgsql security definer set search_path = public as $$
declare a public.corre_aprovacoes; deixa boolean := true;
begin
  -- por execute: chamada direta não compila num banco sem a cota
  if to_regprocedure('public.corre_ip_cota(text,integer,integer)') is not null then
    execute 'select public.corre_ip_cota($1, $2, $3)' into deixa using p_tipo, p_hora, p_dia;
    if not coalesce(deixa, true) then raise exception 'limite' using errcode = 'P0001', hint = 'limite'; end if;
  end if;
  select * into a from public.corre_aprovacoes where codigo = lower(btrim(coalesce(p_codigo, '')));
  if a.id is null or not a.ativo then raise exception 'link' using errcode = 'P0001', hint = 'link'; end if;
  return a;
end $$;
revoke all on function public.corre_aprov_link(text, text, int, int) from public, anon, authenticated;

create or replace function public.corre_aprov_ver(p_codigo text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a public.corre_aprovacoes; m public.corre_portfolio; pf public.corre_perfis; ps jsonb;
begin
  a := public.corre_aprov_link(p_codigo, 'aprov-ver', 120, 600);
  update public.corre_aprovacoes set aberto_em = now() where id = a.id and aberto_em is null;
  select * into m from public.corre_portfolio where id = a.marca_id;
  select * into pf from public.corre_perfis where id = a.dono;
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'data', p.data, 'hora', p.hora, 'formato', p.formato, 'titulo', p.titulo,
           'legenda', p.legenda, 'alt', p.alt, 'midia', p.midia_url, 'midias', p.midias, 'aprov', p.aprov, 'nota', p.aprov_nota,
           'quem', p.aprov_quem, 'em', p.aprov_em, 'publicado', p.ig_status = 'publicado' or p.status = 'postado')
           order by p.data, p.hora, p.created_at), '[]'::jsonb) into ps
    from (select * from public.corre_posts q where q.dono = a.dono and q.marca_id = a.marca_id and q.data between a.de and a.ate
            and coalesce(q.midia_url, '') <> '' order by q.data, q.hora, q.created_at limit 150) p;
  return jsonb_build_object('marca', jsonb_build_object('nome', m.marca, 'rede', coalesce(m.rede, ''), 'cor', coalesce(m.cor, ''), 'logo', coalesce(m.logo_url, '')),
    'de', a.de, 'ate', a.ate, 'msg', a.msg, 'respondido_em', a.respondido_em,
    'quem', jsonb_build_object('nome', coalesce(pf.nome, ''), 'handle', coalesce(pf.handle, ''), 'avatar', coalesce(pf.avatar_url, '')),
    'posts', ps);
end $$;

create or replace function public.corre_aprov_responder(p_codigo text, p_post uuid, p_aprov text, p_nota text default '', p_quem text default '') returns jsonb
language plpgsql security definer set search_path = public as $$
declare a public.corre_aprovacoes; nota text; quem text; n int;
begin
  a := public.corre_aprov_link(p_codigo, 'aprov', 400, 3000);
  if coalesce(p_aprov, '') not in ('', 'aprovado', 'ajuste') then raise exception 'aprov' using errcode = 'P0001', hint = 'aprov'; end if;
  nota := left(btrim(coalesce(p_nota, '')), 600);
  quem := left(btrim(regexp_replace(coalesce(p_quem, ''), '\s+', ' ', 'g')), 60);
  if p_aprov = 'ajuste' and nota = '' then raise exception 'nota' using errcode = 'P0001', hint = 'nota'; end if;
  update public.corre_posts p set aprov = p_aprov, aprov_nota = case when p_aprov = '' then '' else nota end,
         aprov_quem = case when p_aprov = '' then '' else quem end, aprov_em = case when p_aprov = '' then null else now() end
   where p.id = p_post and p.dono = a.dono and p.marca_id = a.marca_id and p.data between a.de and a.ate and coalesce(p.midia_url, '') <> '';
  get diagnostics n = row_count;
  if n = 0 then raise exception 'post' using errcode = 'P0001', hint = 'post'; end if;
  return jsonb_build_object('ok', true, 'aprov', p_aprov);
end $$;

create or replace function public.corre_aprov_fim(p_codigo text, p_quem text default '') returns jsonb
language plpgsql security definer set search_path = public as $$
declare a public.corre_aprovacoes; r record;
begin
  a := public.corre_aprov_link(p_codigo, 'aprov-fim', 20, 60);
  update public.corre_aprovacoes set respondido_em = now(), quem = left(btrim(regexp_replace(coalesce(p_quem, ''), '\s+', ' ', 'g')), 60) where id = a.id;
  select count(*) filter (where p.aprov = 'aprovado') ap, count(*) filter (where p.aprov = 'ajuste') aj, count(*) filter (where p.aprov = '') falta into r
    from public.corre_posts p where p.dono = a.dono and p.marca_id = a.marca_id and p.data between a.de and a.ate and coalesce(p.midia_url, '') <> '';
  return jsonb_build_object('ok', true, 'aprovados', r.ap, 'ajustes', r.aj, 'faltam', r.falta);
end $$;
revoke all on function public.corre_aprov_ver(text) from public;
revoke all on function public.corre_aprov_responder(text, uuid, text, text, text) from public;
revoke all on function public.corre_aprov_fim(text, text) from public;
grant execute on function public.corre_aprov_ver(text) to anon, authenticated;
grant execute on function public.corre_aprov_responder(text, uuid, text, text, text) to anon, authenticated;
grant execute on function public.corre_aprov_fim(text, text) to anon, authenticated;

-- 7) o aviso de quem mandou o link quando o cliente termina (o mesmo formato do corre_pedidos_alvos)
create or replace function public.corre_aprov_alvos(p_agora timestamptz default now()) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a record; k text; ja bigint; subs jsonb; r record; mostra boolean; titulo text; corpo text; out jsonb := '[]'::jsonb;
begin
  for a in select x.*, m.marca as marca_nome from public.corre_aprovacoes x join public.corre_portfolio m on m.id = x.marca_id
            where x.respondido_em > p_agora - interval '10 minutes' and x.respondido_em <= p_agora + interval '1 minute' order by x.respondido_em limit 100 loop
    continue when coalesce((select pr.msg from public.corre_push_pref pr where pr.dono = a.dono), true) = false;
    subs := (select jsonb_agg(jsonb_build_object('endpoint', d.endpoint, 'p256dh', d.p256dh, 'auth', d.auth) order by d.visto_em desc)
               from (select * from public.corre_push d2 where d2.dono = a.dono order by d2.visto_em desc limit 10) d);
    continue when subs is null;
    k := 'aprov:' || a.id || ':' || a.respondido_em;
    insert into public.corre_push_log (chave, quem) values (left(k, 200), null) on conflict do nothing;
    get diagnostics ja = row_count;
    continue when ja = 0;
    select count(*) filter (where p.aprov = 'aprovado') ap, count(*) filter (where p.aprov = 'ajuste') aj, count(*) filter (where p.aprov = '') falta into r
      from public.corre_posts p where p.dono = a.dono and p.marca_id = a.marca_id and p.data between a.de and a.ate and coalesce(p.midia_url, '') <> '';
    mostra := coalesce((select pr.texto from public.corre_push_pref pr where pr.dono = a.dono), true);
    titulo := coalesce(nullif(a.quem, ''), 'O cliente') || ' respondeu a aprovação · ' || a.marca_nome;
    corpo := case when mostra then
               concat_ws(', ', case when r.ap = 1 then '1 aprovado' when r.ap > 1 then r.ap || ' aprovados' end,
                               case when r.aj = 1 then '1 pede ajuste' when r.aj > 1 then r.aj || ' pedem ajuste' end,
                               case when r.falta = 1 then '1 sem resposta' when r.falta > 1 then r.falta || ' sem resposta' end) || '. Toca pra ver.'
             else 'Toca pra ver as respostas.' end;
    out := out || jsonb_build_array(jsonb_build_object('para', a.dono, 'tipo', 'aprovacao', 'subs', subs,
      'payload', jsonb_build_object('titulo', left(titulo, 120), 'corpo', left(corpo, 300), 'url', '/#/studio/' || a.marca_id,
                                    'tag', 'aprov-' || a.id, 'renotify', true, 't', 'aprovacao', 'em', now())));
  end loop;
  return out;
end $$;
revoke all on function public.corre_aprov_alvos(timestamptz) from public, anon, authenticated;
grant execute on function public.corre_aprov_alvos(timestamptz) to service_role;

commit;

select case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'corre_posts' and column_name = 'formato')
             and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'corre_posts' and column_name = 'aprov_em')
             and to_regclass('public.corre_aprovacoes') is not null
             and position('formato' in (select prosrc from pg_proc where oid = 'public.corre_posts_ig_ok()'::regprocedure)) > 0
             and has_function_privilege('anon', 'public.corre_aprov_ver(text)', 'execute')
             and not has_function_privilege('anon', 'public.corre_aprov_alvos(timestamptz)', 'execute')
             and not has_function_privilege('anon', 'public.corre_aprov_link(text,text,integer,integer)', 'execute')
             -- o storage só é lido se existir (um select direto nele não roda num Postgres sem o Supabase)
             and (to_regclass('storage.buckets') is null
                  or (xpath('/row/n/text()', query_to_xml($q$select count(*) as n from storage.buckets where id = 'corre-video'$q$, false, true, '')))[1]::text::int > 0)
            then 'delta v4.17 ok' else 'delta v4.17 NÃO TERMINOU: rode o arquivo inteiro de novo.' end as status;
