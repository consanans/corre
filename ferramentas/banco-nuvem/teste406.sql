\set ON_ERROR_STOP 1
-- v4.06: os lembretes. Dez pessoas, cada uma com um caso; o relógio é passado na mão (19h de Brasília de hoje, e dias
-- depois), então o teste não depende da hora em que roda.
create function pg_temp.como(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false), set_config('request.jwt.claim.role', 'authenticated', false) $$;
create temp table rel as select (now() at time zone 'America/Sao_Paulo')::date as hoje;
create function pg_temp.ag(d int, h int default 19) returns timestamptz language sql as $$
  select ((now() at time zone 'America/Sao_Paulo')::date + d + make_time(h, 0, 0)) at time zone 'America/Sao_Paulo' $$;
create function pg_temp.de(r jsonb, h text) returns jsonb language sql as $$
  select x from jsonb_array_elements(r) x where x->>'para' = (select id::text from corre_perfis where handle = h) $$;

-- 1 bio (5 visitas na semana, dois aparelhos), 2 mural (corre de design, pedido novo de outra pessoa), 3 passos (chegou há
-- 5 dias e não fez nada), 4 feed (sumiu 5 dias; dois que ele segue postaram, mais um post de grupo que não conta),
-- 5 concha (sumiu 10 dias), 6 abriu hoje, 7 desligou os lembretes, 8 já recebeu 3 na semana, 9 sem aparelho,
-- 10 tudo feito e abriu hoje (o exemplo do teste)
insert into corre_perfis (id, handle, nome, created_at, avatar_url, faz, whats_publico, categoria) values
  ('00000000-0000-0000-0000-000000040601', 'bio406', 'Bio', now() - interval '30 days', 'https://x/a.png', 'Bolo', '43999990001', ''),
  ('00000000-0000-0000-0000-000000040602', 'mural406', 'Mural', now() - interval '30 days', 'https://x/a.png', 'Logo', '43999990002', 'design'),
  ('00000000-0000-0000-0000-000000040603', 'passos406', 'Passos', now() - interval '5 days', '', '', '', ''),
  ('00000000-0000-0000-0000-000000040604', 'feed406', 'Feed', now() - interval '30 days', 'https://x/a.png', 'Foto', '43999990004', ''),
  ('00000000-0000-0000-0000-000000040605', 'concha406', 'Concha', now() - interval '30 days', 'https://x/a.png', 'Som', '43999990005', ''),
  ('00000000-0000-0000-0000-000000040606', 'hoje406', 'Hoje', now() - interval '30 days', 'https://x/a.png', 'X', '43999990006', ''),
  ('00000000-0000-0000-0000-000000040607', 'desligou406', 'Desligou', now() - interval '30 days', 'https://x/a.png', 'X', '43999990007', ''),
  ('00000000-0000-0000-0000-000000040608', 'cheio406', 'Cheio', now() - interval '30 days', 'https://x/a.png', 'X', '43999990008', ''),
  ('00000000-0000-0000-0000-000000040609', 'semaparelho406', 'Sem', now() - interval '30 days', 'https://x/a.png', 'X', '43999990009', ''),
  ('00000000-0000-0000-0000-000000040610', 'completo406', 'Completo', now() - interval '30 days', 'https://x/a.png', 'X', '43999990010', '');
update corre_perfis set bio_link = '{"tema":"papel","links":[{"t":"Loja","u":"https://exemplo.com"}]}' where handle = 'completo406';
insert into corre_feed (dono, texto, created_at) values ('00000000-0000-0000-0000-000000040610', 'meu', now() - interval '20 days');
insert into corre_push (endpoint, dono, p256dh, auth, visto_em)
  select 'https://web.push.apple.com/' || handle, id, 'p', 'a', now() from corre_perfis where handle like '%406' and handle <> 'semaparelho406';
insert into corre_push (endpoint, dono, p256dh, auth, visto_em) values ('https://fcm.googleapis.com/bio406-2', '00000000-0000-0000-0000-000000040601', 'p', 'a', now() - interval '1 day');
insert into corre_bio_conta (dono, dia, chave, n)
  select id, (select hoje from rel) - 2, 'visita', 5 from corre_perfis where handle in ('bio406', 'hoje406', 'desligou406', 'cheio406', 'semaparelho406');
insert into corre_bio_conta (dono, dia, chave, n) values ('00000000-0000-0000-0000-000000040601', (select hoje from rel) - 1, 'w', 2),
  ('00000000-0000-0000-0000-000000040601', (select hoje from rel) - 9, 'visita', 40);
insert into corre_mural (dono, categoria, titulo, created_at) values (null, 'design', 'Preciso de um logo', now() - interval '1 day'),
  ('00000000-0000-0000-0000-000000040602', 'design', 'O meu mesmo', now()), (null, 'foto', 'Outro corre', now()),
  (null, 'design', 'Velho', now() - interval '6 days');
insert into corre_seguindo (quem, segue) values ('00000000-0000-0000-0000-000000040604', '00000000-0000-0000-0000-000000040601'),
  ('00000000-0000-0000-0000-000000040604', '00000000-0000-0000-0000-000000040602');
insert into corre_feed (dono, texto, grupo, created_at) values ('00000000-0000-0000-0000-000000040601', 'a', null, now() - interval '1 day'),
  ('00000000-0000-0000-0000-000000040602', 'b', null, now() - interval '2 days'),
  ('00000000-0000-0000-0000-000000040602', 'c', gen_random_uuid(), now() - interval '1 day');
insert into corre_ativo_dia (dono, dia) values ('00000000-0000-0000-0000-000000040601', (select hoje from rel) - 1),
  ('00000000-0000-0000-0000-000000040602', (select hoje from rel) - 2), ('00000000-0000-0000-0000-000000040604', (select hoje from rel) - 5),
  ('00000000-0000-0000-0000-000000040605', (select hoje from rel) - 10), ('00000000-0000-0000-0000-000000040606', (select hoje from rel)),
  ('00000000-0000-0000-0000-000000040607', (select hoje from rel) - 1), ('00000000-0000-0000-0000-000000040608', (select hoje from rel) - 1),
  ('00000000-0000-0000-0000-000000040610', (select hoje from rel));
insert into corre_lembretes (dono, dia, tipo) select '00000000-0000-0000-0000-000000040608', (select hoje from rel) - g, 'concha' from generate_series(1, 3) g;

-- os ajustes: o "lembra" nasce ligado, a pessoa desliga, e campo desconhecido segue recusado
select pg_temp.como('00000000-0000-0000-0000-000000040607'); set role authenticated;
select case when (corre_push_ajustes(null)->>'lembra')::boolean and (corre_push_ajustes(null)->>'msg')::boolean
  then 'ok: os ajustes trazem os lembretes ligados (e o resto como antes)' else 'FALHOU: ajustes ' || corre_push_ajustes(null)::text end;
select case when (corre_push_ajusta('lembra', false)->>'lembra')::boolean = false
  then 'ok: dá pra desligar os lembretes' else 'FALHOU: desligar' end;
do $$ begin perform corre_push_ajusta('lembrete', false); raise notice 'FALHOU: aceitou campo desconhecido';
exception when others then if sqlerrm = 'campo' then raise notice 'ok: campo desconhecido segue recusado'; else raise; end if; end $$;
-- quem é do app não chama a lista nem lê o que saiu
do $$ begin perform corre_lembretes_alvos(now(), null, false); raise notice 'FALHOU: o app chamou a lista';
exception when insufficient_privilege then raise notice 'ok: o app não chama a lista dos lembretes'; end $$;
do $$ begin perform count(*) from corre_lembretes; raise notice 'FALHOU: o app leu os lembretes';
exception when insufficient_privilege then raise notice 'ok: o app não lê o que saiu'; end $$;
reset role;

-- fora do horário, ninguém (16h59 e 21h)
set role service_role;
select case when corre_lembretes_alvos(pg_temp.ag(0, 16) + interval '59 minutes') = '[]' and corre_lembretes_alvos(pg_temp.ag(0, 21)) = '[]'
  then 'ok: fora das 17h às 20h59 não sai nada' else 'FALHOU: saiu fora do horário' end;
create temp table r0 as select corre_lembretes_alvos(pg_temp.ag(0)) r;
reset role;
select case when (select count(*) from corre_lembretes where dia = (select hoje from rel)) = 5
  then 'ok: hoje saíram 5' else 'FALHOU: saíram ' || (select count(*) from corre_lembretes where dia = (select hoje from rel)) || ': ' || (select r::text from r0) end;
select case when pg_temp.de(r, 'bio406')->'payload'->>'titulo' = '5 visitas no teu link na bio'
  and pg_temp.de(r, 'bio406')->'payload'->>'corpo' = 'Nos últimos 7 dias, com 2 toques nos teus botões. Toca pra ver.'
  and pg_temp.de(r, 'bio406')->'payload'->>'url' = '/#/linkbio' and pg_temp.de(r, 'bio406')->'payload'->>'tag' = 'lembra-bio'
  and pg_temp.de(r, 'bio406')->'payload'->>'t' = 'lembra' and jsonb_array_length(pg_temp.de(r, 'bio406')->'subs') = 2
  then 'ok: o link na bio: 5 visitas (as de 9 dias atrás não contam), 2 toques, os dois aparelhos' else 'FALHOU: bio ' || coalesce(pg_temp.de(r, 'bio406')::text, 'nada') end from r0;
select case when pg_temp.de(r, 'mural406')->'payload'->>'titulo' = 'Pedido novo no Mural pro teu corre' and pg_temp.de(r, 'mural406')->'payload'->>'url' = '/#/mural'
  then 'ok: o Mural: 1 pedido novo do corre dele (o dele, o de outro corre e o velho não contam)' else 'FALHOU: mural ' || coalesce(pg_temp.de(r, 'mural406')::text, 'nada') end from r0;
select case when pg_temp.de(r, 'passos406')->'payload'->>'titulo' = 'Faltam 5 passos pro teu Corre ficar pronto'
  and pg_temp.de(r, 'passos406')->'payload'->>'corpo' like 'Diz o que você vende%' and pg_temp.de(r, 'passos406')->'payload'->>'url' = '/#/editar'
  then 'ok: os passos: faltam 5, começando pelo que vende' else 'FALHOU: passos ' || coalesce(pg_temp.de(r, 'passos406')::text, 'nada') end from r0;
select case when pg_temp.de(r, 'feed406')->'payload'->>'titulo' = '2 posts novos de quem você segue'
  and pg_temp.de(r, 'feed406')->'payload'->>'corpo' = 'De @bio406 e @mural406. Bora ver o que rolou?'
  then 'ok: o feed: 2 posts de quem segue (o do grupo não conta)' else 'FALHOU: feed ' || coalesce(pg_temp.de(r, 'feed406')::text, 'nada') end from r0;
select case when pg_temp.de(r, 'concha406')->'payload'->>'titulo' = 'Hoje tem Som na Concha às 20h' and pg_temp.de(r, 'concha406')->'payload'->>'url' = '/#/verso'
  then 'ok: sumiu 10 dias: o show da Concha' else 'FALHOU: concha ' || coalesce(pg_temp.de(r, 'concha406')::text, 'nada') end from r0;
select case when pg_temp.de(r, 'hoje406') is null and pg_temp.de(r, 'desligou406') is null and pg_temp.de(r, 'cheio406') is null
  and pg_temp.de(r, 'semaparelho406') is null and pg_temp.de(r, 'completo406') is null
  then 'ok: quem abriu hoje, desligou, já teve 3 na semana ou não tem aparelho fica sem' else 'FALHOU: saiu pra quem não devia ' || r::text end from r0;

-- de novo no mesmo dia: nada (um por dia)
set role service_role;
select case when corre_lembretes_alvos(pg_temp.ag(0, 20)) = '[]' then 'ok: chamar de novo no mesmo dia não manda outro' else 'FALHOU: mandou dois no dia' end;
-- no dia seguinte o link na bio não repete (de 7 em 7)
select case when corre_lembretes_alvos(pg_temp.ag(1), '00000000-0000-0000-0000-000000040601') = '[]'
  then 'ok: o link na bio não repete no dia seguinte' else 'FALHOU: bio repetiu' end;
-- os passos: de 3 em 3 dias, no máximo 3 vezes (depois, sumido há 9 dias, vem a Concha)
create temp table rp (d int, r jsonb);
insert into rp select 1, corre_lembretes_alvos(pg_temp.ag(1), '00000000-0000-0000-0000-000000040603');
insert into rp select 3, corre_lembretes_alvos(pg_temp.ag(3), '00000000-0000-0000-0000-000000040603');
insert into rp select 6, corre_lembretes_alvos(pg_temp.ag(6), '00000000-0000-0000-0000-000000040603');
insert into rp select 9, corre_lembretes_alvos(pg_temp.ag(9), '00000000-0000-0000-0000-000000040603');
reset role;
select case when (select r from rp where d = 1) = '[]' and (select r->0->>'tipo' from rp where d = 3) = 'passos'
  and (select r->0->>'tipo' from rp where d = 6) = 'passos' and (select r->0->>'tipo' from rp where d = 9) = 'concha'
  then 'ok: os passos de 3 em 3 dias, só 3 vezes' else 'FALHOU: passos ' || (select string_agg(d || ':' || r::text, ' ' order by d) from rp) end;

-- o "Mandar um lembrete de exemplo": pra uma pessoa só, sem horário, sem limite, sem gravar
set role service_role;
create temp table rt as select corre_lembretes_alvos(pg_temp.ag(0, 9), '00000000-0000-0000-0000-000000040606', true) a,
  corre_lembretes_alvos(pg_temp.ag(0, 9), '00000000-0000-0000-0000-000000040610', true) b, corre_lembretes_alvos(now(), null, true) c;
reset role;
select case when a->0->>'tipo' = 'bio' and b->0->>'tipo' = 'exemplo' and c = '[]'
  and not exists (select 1 from corre_lembretes where dono in ('00000000-0000-0000-0000-000000040606', '00000000-0000-0000-0000-000000040610'))
  then 'ok: o exemplo vai na hora pra quem pediu (sem novidade, o texto de exemplo) e não conta' else 'FALHOU: exemplo ' || a::text || b::text || c::text end from rt;

-- os números da Lojinha: só os donos; quem recebeu e abriu no mesmo dia ou no seguinte voltou
insert into corre_ativo_dia (dono, dia) values ('00000000-0000-0000-0000-000000040602', (select hoje from rel) + 1),
  ('00000000-0000-0000-0000-000000040605', (select hoje from rel)) on conflict do nothing;
select pg_temp.como('d1e9f6ac-f5d7-4723-8b02-eb0d1d7137b0'); set role authenticated;
create temp table rn as select corre_lembretes_numeros(30) n;
reset role;
select case when (n->>'enviados')::int = 11 and (n->>'pessoas')::int = 6 and (n->>'voltaram')::int = 4 and (n->'tipos'->>'passos')::int = 3
  and (n->>'avisos')::int = 9 and (n->>'aparelhos')::int = 10 and (n->>'desligaram')::int = 1
  then 'ok: os números da Lojinha (11 lembretes, 6 pessoas, 4 voltaram, 9 com avisos)' else 'FALHOU: números ' || n::text end from rn;
select pg_temp.como('00000000-0000-0000-0000-000000040601'); set role authenticated;
do $$ begin perform corre_lembretes_numeros(30); raise notice 'FALHOU: quem não é dono viu os números';
exception when others then if sqlerrm like 'A Lojinha%' then raise notice 'ok: os números são só dos donos'; else raise; end if; end $$;
reset role;
