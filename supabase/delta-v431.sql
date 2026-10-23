-- delta v4.31 · o Corre pronto pra Google Play: denunciar e apagar a conta de verdade
--
-- A Google só aceita rede social na loja com um jeito de denunciar post e gente dentro do app (e bloquear, que o Corre
-- já tem desde a v3.34), e com o apagar a conta que apaga a conta mesmo, não só o perfil. Este delta faz os dois:
--   corre_denuncias              cada denúncia: quem denunciou, o que (post, story, perfil ou conversa), de quem é, o
--                                motivo, o que a pessoa escreveu e uma cópia do conteúdo na hora (o post pode sumir
--                                depois). Ninguém do app lê nem escreve direto: só pelas funções de baixo.
--   corre_denuncia(...)          o app denuncia (pelo login). Não denuncia a si mesmo, uma vez por coisa, 30 por dia.
--   corre_denuncias_lista(...)   a lista pros donos (a Lojinha), juntando as denúncias da mesma coisa.
--   corre_denuncia_resolve(...)  o dono decide: "tá tudo certo" ou "tirar do ar" (post e story).
--   corre_denuncias_abertas()    quantas coisas esperam o dono olhar (o sinal na Comanda; pra quem não é dono, 0).
--   corre_denuncia_alvos()       o aviso no celular dos donos quando chega denúncia (só o servidor: a função push).
--   corre_apaga_minha_conta()    apaga o perfil (com tudo que vai junto, como antes) e o login do Google no Corre.
--                                O plano pago rodando no Asaas segue barrando (o gatilho da v3.61 olha o login).
--
-- Precisa da v4.02 (corre_ve_lojinha) e da v3.35 (os avisos). Pode rodar duas vezes. Sem DROP.

begin;

do $$ begin
  if to_regprocedure('public.corre_ve_lojinha(uuid)') is null then
    raise exception 'falta o delta-v402.sql (a Lojinha): rode ele antes deste';
  end if;
end $$;

create table if not exists public.corre_denuncias (
  id uuid primary key default gen_random_uuid(),
  quem uuid references public.corre_perfis (id) on delete set null,
  tipo text not null check (tipo in ('post', 'story', 'perfil', 'conversa')),
  alvo uuid not null,
  dono uuid references public.corre_perfis (id) on delete cascade,
  motivo text not null check (motivo in ('golpe', 'odio', 'assedio', 'nudez', 'violencia', 'menor', 'spam', 'falso', 'outro')),
  texto text not null default '' check (char_length(texto) <= 500),
  trecho text not null default '' check (char_length(trecho) <= 2000),
  midia text not null default '' check (char_length(midia) <= 600),
  status text not null default 'aberta' check (status in ('aberta', 'ok', 'tirada')),
  visto_por uuid references public.corre_perfis (id) on delete set null,
  visto_em timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists corre_denuncias_uma_vez on public.corre_denuncias (quem, tipo, alvo);
create index if not exists corre_denuncias_abertas_idx on public.corre_denuncias (status, created_at desc);
alter table public.corre_denuncias enable row level security;
-- o Supabase dá direito sozinho pra tabela nova (pegadinha da v3.41 e da v4.17): ninguém do app mexe direto
revoke all on table public.corre_denuncias from anon, authenticated;

/* o app denuncia. p_alvo: o post, o story ou a pessoa (perfil e conversa); p_ctx: na conversa, qual conversa (a cópia
   leva as últimas mensagens DA PESSOA denunciada, e só se quem denuncia estiver na conversa) */
create or replace function public.corre_denuncia(p_tipo text, p_alvo uuid, p_motivo text, p_texto text default '', p_ctx uuid default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  eu uuid := auth.uid(); r jsonb; d uuid; tr text := ''; md text := ''; novo uuid;
begin
  if eu is null then return jsonb_build_object('ok', false, 'motivo', 'login'); end if;
  if p_tipo is null or p_tipo not in ('post', 'story', 'perfil', 'conversa') then return jsonb_build_object('ok', false, 'motivo', 'tipo'); end if;
  if p_motivo is null or p_motivo not in ('golpe', 'odio', 'assedio', 'nudez', 'violencia', 'menor', 'spam', 'falso', 'outro') then
    return jsonb_build_object('ok', false, 'motivo', 'motivo');
  end if;
  if p_alvo is null then return jsonb_build_object('ok', false, 'motivo', 'nao'); end if;
  if (select count(*) from public.corre_denuncias x where x.quem = eu and x.created_at > now() - interval '1 day') >= 30 then
    return jsonb_build_object('ok', false, 'motivo', 'devagar');
  end if;
  -- quem é o dono e a cópia do que foi denunciado (pela linha inteira: a coluna que não existir só fica vazia)
  if p_tipo = 'post' then
    select to_jsonb(f) into r from public.corre_feed f where f.id = p_alvo;
    if r is null then return jsonb_build_object('ok', false, 'motivo', 'nao'); end if;
    d := (r ->> 'dono')::uuid; tr := coalesce(r ->> 'texto', ''); md := coalesce(r ->> 'midia_url', '');
  elsif p_tipo = 'story' then
    select to_jsonb(s) into r from public.corre_stories s where s.id = p_alvo;
    if r is null then return jsonb_build_object('ok', false, 'motivo', 'nao'); end if;
    d := (r ->> 'dono')::uuid; tr := coalesce(r ->> 'texto', ''); md := coalesce(r ->> 'midia_url', '');
  else
    select to_jsonb(p) into r from public.corre_perfis p where p.id = p_alvo;
    if r is null then return jsonb_build_object('ok', false, 'motivo', 'nao'); end if;
    d := p_alvo;
    tr := concat_ws(' · ', nullif('@' || coalesce(r ->> 'handle', ''), '@'), nullif(r ->> 'nome', ''), nullif(r ->> 'bio', ''), nullif(r ->> 'faz', ''));
    md := coalesce(r ->> 'avatar_url', '');
    if p_tipo = 'conversa' then
      if p_ctx is null or to_regclass('public.corre_conversa_membros') is null
         or not exists (select 1 from public.corre_conversa_membros m where m.conversa = p_ctx and m.membro = eu)
         or not exists (select 1 from public.corre_conversa_membros m where m.conversa = p_ctx and m.membro = d) then
        return jsonb_build_object('ok', false, 'motivo', 'nao');
      end if;
      tr := coalesce((select string_agg(x.t, E'\n' order by x.em) from (
              select left(coalesce(m.texto, ''), 240) as t, m.created_at as em from public.corre_mensagens m
               where m.conversa = p_ctx and m.dono = d and coalesce(m.texto, '') <> '' order by m.created_at desc limit 8) x), '');
      md := '';
    end if;
  end if;
  if d is null then return jsonb_build_object('ok', false, 'motivo', 'nao'); end if;
  if d = eu then return jsonb_build_object('ok', false, 'motivo', 'proprio'); end if;
  insert into public.corre_denuncias (quem, tipo, alvo, dono, motivo, texto, trecho, midia)
  values (eu, p_tipo, p_alvo, d, p_motivo, left(btrim(coalesce(p_texto, '')), 500), left(tr, 2000), case when md ~ '^https://' then left(md, 600) else '' end)
  on conflict (quem, tipo, alvo) do nothing
  returning id into novo;
  if novo is null then return jsonb_build_object('ok', true, 'ja', true); end if;
  return jsonb_build_object('ok', true, 'id', novo);
end $$;
revoke all on function public.corre_denuncia(text, uuid, text, text, uuid) from public, anon;
grant execute on function public.corre_denuncia(text, uuid, text, text, uuid) to authenticated;

/* a lista pros donos: uma linha por coisa denunciada (as denúncias da mesma coisa juntas), a mais nova em cima */
create or replace function public.corre_denuncias_lista(p_status text default 'aberta', p_lim int default 60)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare st text := case when p_status in ('aberta', 'ok', 'tirada') then p_status else 'aberta' end;
begin
  if not public.corre_ve_lojinha(auth.uid()) then return null; end if;
  return coalesce((select jsonb_agg(y order by (y ->> 'ultima') desc) from (
    select jsonb_build_object(
      'tipo', g.tipo, 'alvo', g.alvo, 'n', g.n, 'ultima', g.ultima, 'motivos', g.motivos,
      'textos', g.textos, 'trecho', g.trecho, 'midia', g.midia, 'status', st,
      'dono', g.dono, 'handle', p.handle, 'nome', p.nome,
      'quem', g.quem,
      'existe', case g.tipo when 'post' then exists (select 1 from public.corre_feed f where f.id = g.alvo)
                            when 'story' then exists (select 1 from public.corre_stories s where s.id = g.alvo)
                            else exists (select 1 from public.corre_perfis q where q.id = g.alvo) end) as y
      from (select d.tipo, d.alvo, d.dono, count(*) as n, max(d.created_at) as ultima,
                   array_agg(distinct d.motivo) as motivos,
                   (array_agg(d.texto order by d.created_at desc) filter (where d.texto <> ''))[1:3] as textos,
                   (array_agg(d.trecho order by d.created_at desc))[1] as trecho,
                   (array_agg(d.midia order by d.created_at desc))[1] as midia,
                   (array_agg(distinct q.handle) filter (where q.handle is not null))[1:3] as quem
              from public.corre_denuncias d left join public.corre_perfis q on q.id = d.quem
             where d.status = st
             group by d.tipo, d.alvo, d.dono
             order by max(d.created_at) desc
             limit greatest(1, least(coalesce(p_lim, 60), 200))) g
      left join public.corre_perfis p on p.id = g.dono) z(y)), '[]'::jsonb);
end $$;
revoke all on function public.corre_denuncias_lista(text, int) from public, anon;
grant execute on function public.corre_denuncias_lista(text, int) to authenticated;

/* o dono decide: 'ok' (tá tudo certo) ou 'tirar' (apaga o post ou o story; perfil e conversa só dão 'ok': pra gente,
   a saída é a pessoa bloquear, e o dono fala com quem foi denunciado). Vale pra todas as denúncias abertas da coisa. */
create or replace function public.corre_denuncia_resolve(p_tipo text, p_alvo uuid, p_acao text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare eu uuid := auth.uid(); n int;
begin
  if not public.corre_ve_lojinha(eu) then return jsonb_build_object('ok', false, 'motivo', 'dono'); end if;
  if p_acao not in ('ok', 'tirar') then return jsonb_build_object('ok', false, 'motivo', 'acao'); end if;
  if p_acao = 'tirar' and p_tipo not in ('post', 'story') then return jsonb_build_object('ok', false, 'motivo', 'acao'); end if;
  if p_acao = 'tirar' then
    if p_tipo = 'post' then delete from public.corre_feed where id = p_alvo;
    else delete from public.corre_stories where id = p_alvo; end if;
  end if;
  update public.corre_denuncias set status = case when p_acao = 'tirar' then 'tirada' else 'ok' end, visto_por = eu, visto_em = now()
   where tipo = p_tipo and alvo = p_alvo and status = 'aberta';
  get diagnostics n = row_count;
  return jsonb_build_object('ok', true, 'n', n);
end $$;
revoke all on function public.corre_denuncia_resolve(text, uuid, text) from public, anon;
grant execute on function public.corre_denuncia_resolve(text, uuid, text) to authenticated;

create or replace function public.corre_denuncias_abertas() returns int
language sql stable security definer set search_path = public, pg_temp as $$
  select case when public.corre_ve_lojinha(auth.uid())
              then (select count(*)::int from (select distinct tipo, alvo from public.corre_denuncias where status = 'aberta') x)
              else 0 end;
$$;
revoke all on function public.corre_denuncias_abertas() from public, anon;
grant execute on function public.corre_denuncias_abertas() to authenticated;

/* o aviso dos donos: denúncia dos últimos 10 minutos, um aviso por denúncia e por dono (marcado antes de sair) */
create or replace function public.corre_denuncia_alvos(p_agora timestamptz default now()) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  x record; dn uuid; subs jsonb; ja bigint; h text;
  out jsonb := '[]'::jsonb;
begin
  for x in select d.* from public.corre_denuncias d
            where d.status = 'aberta' and d.created_at > p_agora - interval '10 minutes'
            order by d.created_at limit 50 loop
    h := (select p.handle from public.corre_perfis p where p.id = x.dono);
    for dn in select public.corre_fundador() union select o.dono from public.corre_donos o loop
      continue when dn is null or dn = x.dono;
      subs := (select jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth))
                 from (select * from public.corre_push s2 where s2.dono = dn order by s2.visto_em desc limit 10) s);
      continue when subs is null;
      insert into public.corre_push_log (chave, quem) values ('den:' || x.id || ':' || dn, null) on conflict do nothing;
      get diagnostics ja = row_count;
      continue when ja = 0;
      out := out || jsonb_build_array(jsonb_build_object('para', dn, 'tipo', 'denuncia', 'subs', subs,
        'payload', jsonb_build_object(
          'titulo', 'Denúncia no Corre',
          'corpo', case x.tipo when 'post' then 'Um post' when 'story' then 'Um story' when 'conversa' then 'Uma conversa' else 'Um perfil' end
                   || coalesce(' de @' || h, '') || ' foi denunciado (' ||
                   case x.motivo when 'golpe' then 'golpe' when 'odio' then 'ódio' when 'assedio' then 'assédio' when 'nudez' then 'nudez'
                                 when 'violencia' then 'violência' when 'menor' then 'menor de idade' when 'spam' then 'spam'
                                 when 'falso' then 'perfil falso' else 'outro motivo' end || '). Toca pra ver.',
          'url', '/#/lojinha', 'tag', 'den-' || x.tipo || '-' || x.alvo, 'renotify', true, 't', 'denuncia', 'em', now())));
    end loop;
  end loop;
  return out;
end $$;
revoke all on function public.corre_denuncia_alvos(timestamptz) from public, anon, authenticated;
grant execute on function public.corre_denuncia_alvos(timestamptz) to service_role;

/* apagar a conta de verdade: o perfil (e tudo que sai junto com ele, como antes) e o login do Google no Corre.
   O gatilho da v3.61 continua valendo: com plano pago rodando no Asaas, para aqui (hint assinatura_ativa). */
create or replace function public.corre_apaga_minha_conta() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare eu uuid := auth.uid();
begin
  if eu is null then return jsonb_build_object('ok', false, 'motivo', 'login'); end if;
  delete from public.corre_perfis where id = eu;
  delete from auth.users where id = eu;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.corre_apaga_minha_conta() from public, anon;
grant execute on function public.corre_apaga_minha_conta() to authenticated;

commit;

select case when to_regclass('public.corre_denuncias') is not null
             and (select relrowsecurity from pg_class where oid = 'public.corre_denuncias'::regclass)
             and not has_table_privilege('authenticated', 'public.corre_denuncias', 'select')
             and not has_table_privilege('anon', 'public.corre_denuncias', 'insert')
             and has_function_privilege('authenticated', 'public.corre_denuncia(text, uuid, text, text, uuid)', 'execute')
             and not has_function_privilege('anon', 'public.corre_denuncia(text, uuid, text, text, uuid)', 'execute')
             and not has_function_privilege('authenticated', 'public.corre_denuncia_alvos(timestamptz)', 'execute')
             and has_function_privilege('authenticated', 'public.corre_apaga_minha_conta()', 'execute')
             and not has_function_privilege('anon', 'public.corre_apaga_minha_conta()', 'execute')
            then 'delta v4.31 ok' else 'delta v4.31 NÃO TERMINOU: rode o arquivo inteiro de novo.' end as status;
