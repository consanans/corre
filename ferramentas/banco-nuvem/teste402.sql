\set ON_ERROR_STOP 1
-- v4.02: a Lojinha (o painel do dono). O banco de teste já tem gente dos testes de antes, então as contas são conferidas
-- pela diferença: a Lojinha antes (l0) e depois (l1) de pôr quatro pessoas novas com o que cada uma fez.
create function pg_temp.como(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false), set_config('request.jwt.claim.role', 'authenticated', false) $$;
create function pg_temp.anon() returns void language sql as $$ select set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claim.role', 'anon', false) $$;
create function pg_temp.dif(a jsonb, b jsonb, k text[]) returns numeric language sql as $$ select coalesce((b #>> k)::numeric, 0) - coalesce((a #>> k)::numeric, 0) $$;
-- o fundador e o @corre (a casa) e a quantidade de gente que já tinha
insert into corre_perfis (id, handle, nome) values ('d1e9f6ac-f5d7-4723-8b02-eb0d1d7137b0', 'consanans', 'Thales'),
  ('45ff37aa-aa4f-4438-9414-54b5fd94f240', 'corre', 'Corre') on conflict do nothing;
select pg_temp.como('d1e9f6ac-f5d7-4723-8b02-eb0d1d7137b0'); set role authenticated;
create temp table l0 as select corre_lojinha(30) r;
reset role;
select case when (select (r #>> '{gente,perfis}')::int from l0) = (select count(*) from corre_perfis) - 2
  then 'ok: o fundador e o @corre ficam fora da conta de gente' else 'FALHOU: perfis: ' || (select r #>> '{gente,perfis}' from l0) || ' de ' || (select count(*) from corre_perfis) end;

-- quatro pessoas: A entrou hoje e postou, B entrou há 10 dias e mandou mensagem anteontem (voltou), D entrou há 20 dias
-- e sumiu (o último post foi há 15), E entrou há 3 dias e só abriu o app hoje. X entrou com o Google e não fez o perfil.
insert into corre_perfis (id, handle, nome, created_at, avatar_url, faz, whats_publico, categoria) values
  ('00000000-0000-0000-0000-0000000402a1', 'chegou402', 'Chegou Hoje', now(), 'https://exemplo.com/a.png', 'Tatuagem', '', 'tattoo'),
  ('00000000-0000-0000-0000-0000000402b1', 'voltou402', 'Voltou', now() - interval '10 days', '', 'Bolo de pote', '43999990000', 'comida'),
  ('00000000-0000-0000-0000-0000000402d1', 'sumiu402', 'Sumiu', now() - interval '20 days', '', '', '', ''),
  ('00000000-0000-0000-0000-0000000402e1', 'abriu402', 'Só Abriu', now() - interval '3 days', '', '', '', '');
update corre_perfis set bio_link = '{"tema":"papel","links":[{"t":"Cardápio","u":"https://exemplo.com/bolo"}]}' where id = '00000000-0000-0000-0000-0000000402b1';
insert into auth.users (id, last_sign_in_at) values ('00000000-0000-0000-0000-0000000402a1', now()),
  ('00000000-0000-0000-0000-0000000402b1', now() - interval '9 days'), ('00000000-0000-0000-0000-0000000402d1', now() - interval '19 days'),
  ('00000000-0000-0000-0000-0000000402e1', now() - interval '3 days'), ('00000000-0000-0000-0000-0000000402f1', now() - interval '1 day');
insert into auth.sessions (user_id, created_at, updated_at, refreshed_at) values
  ('00000000-0000-0000-0000-0000000402b1', now() - interval '9 days', now() - interval '9 days', (now() - interval '1 day') at time zone 'UTC');
insert into corre_feed (dono, texto, created_at) values ('00000000-0000-0000-0000-0000000402a1', 'oi', now()),
  ('00000000-0000-0000-0000-0000000402d1', 'velho', now() - interval '15 days');
insert into corre_mensagens (dono, texto, created_at) values ('00000000-0000-0000-0000-0000000402b1', 'e aí', now() - interval '2 days');
insert into corre_produtos (dono, nome, publico, created_at) values ('00000000-0000-0000-0000-0000000402b1', 'Bolo de pote', true, now() - interval '2 days'),
  ('00000000-0000-0000-0000-0000000402d1', 'Rascunho', false, now() - interval '15 days');
insert into corre_geracoes (dono, tipo, prompt, created_at) values ('00000000-0000-0000-0000-0000000402a1', 'legenda', 'x', now()),
  ('00000000-0000-0000-0000-0000000402a1', 'marca', 'direcao · Bolo · 1', now()), ('00000000-0000-0000-0000-0000000402b1', 'imagem', 'y', now() - interval '2 days'),
  ('d1e9f6ac-f5d7-4723-8b02-eb0d1d7137b0', 'marca', 'maquina · Casa', now());
insert into corre_bio_conta (dono, dia, chave, n) values ('00000000-0000-0000-0000-0000000402b1', (now() at time zone 'America/Sao_Paulo')::date, 'visita', 7),
  ('00000000-0000-0000-0000-0000000402b1', (now() at time zone 'America/Sao_Paulo')::date, 'w', 2);
insert into corre_convites (quem, por, pago) values ('00000000-0000-0000-0000-0000000402a1', '00000000-0000-0000-0000-0000000402b1', 0.50);
insert into corre_assinaturas (dono, produto, valor, status, pago_ate) values ('00000000-0000-0000-0000-0000000402b1', 'horus', 9.90, 'ativa', current_date + 20);
insert into corre_assinaturas (dono, produto, status, teste_ate) values ('00000000-0000-0000-0000-0000000402e1', 'houzi', 'teste', now() + interval '20 days');

-- o dia de cada um: E abre o app (duas vezes no dia conta uma); X, sem perfil, não marca
select pg_temp.como('00000000-0000-0000-0000-0000000402e1'); set role authenticated;
select corre_marca_dia(); select corre_marca_dia();
reset role;
select pg_temp.como('00000000-0000-0000-0000-0000000402f1'); set role authenticated;
select corre_marca_dia();
reset role;
select case when (select count(*) from corre_ativo_dia where dono = '00000000-0000-0000-0000-0000000402e1') = 1
              and (select count(*) from corre_ativo_dia where dono = '00000000-0000-0000-0000-0000000402f1') = 0
  then 'ok: abrir o app marca o dia uma vez só; sem perfil não marca' else 'FALHOU: marca do dia' end;
select pg_temp.como('00000000-0000-0000-0000-0000000402e1'); set role authenticated;
do $$ begin perform count(*) from corre_ativo_dia; raise notice 'FALHOU: o app lê corre_ativo_dia'; exception when insufficient_privilege then raise notice 'ok: o app não lê o dia de ninguém'; end $$;
reset role;

-- a Lojinha depois
select pg_temp.como('d1e9f6ac-f5d7-4723-8b02-eb0d1d7137b0'); set role authenticated;
create temp table l1 as select corre_lojinha(30) r;
reset role;
create temp table dd as select l0.r a, l1.r b from l0, l1;
select case when (select pg_temp.dif(a, b, '{gente,perfis}') = 4 and pg_temp.dif(a, b, '{gente,novos7}') = 2 and pg_temp.dif(a, b, '{gente,novos7_antes}') = 1
                     and pg_temp.dif(a, b, '{gente,contas}') = 5 and pg_temp.dif(a, b, '{gente,sem_perfil}') = 1 from dd)
  then 'ok: gente: 4 perfis, 2 novos na semana, 1 na de antes, 5 contas e 1 sem perfil' else 'FALHOU: gente: ' || (select (b->'gente')::text from dd) end;
select case when (select pg_temp.dif(a, b, '{gente,ativos_hoje}') = 2 and pg_temp.dif(a, b, '{gente,ativos7}') = 3 and pg_temp.dif(a, b, '{gente,ativos30}') = 4 from dd)
  then 'ok: ativos: hoje A e E (o post e o abrir), na semana mais B (a mensagem e o login), no mês mais D' else 'FALHOU: ativos: ' || (select (a->'gente')::text || ' → ' || (b->'gente')::text from dd) end;
select case when (select pg_temp.dif(a, b, '{gente,voltaram_base}') = 2 and pg_temp.dif(a, b, '{gente,voltaram}') = 1 from dd)
  then 'ok: voltaram: dos que entraram há mais de 7 dias (B e D), só B voltou' else 'FALHOU: voltaram: ' || (select (b->'gente')::text from dd) end;
select case when (select jsonb_array_length(b->'dias') = 30 and (b->'dias'->29->>'dia')::date = (now() at time zone 'America/Sao_Paulo')::date
                     and (b->'dias'->29->>'novos')::int - (a->'dias'->29->>'novos')::int = 1
                     and (b->'dias'->29->>'ativos')::int - (a->'dias'->29->>'ativos')::int = 2 from dd)
  then 'ok: dia a dia: 30 dias, o último é hoje, com A entrando e A e E ativos' else 'FALHOU: dias: ' || (select (b->'dias'->29)::text from dd) end;
select case when (select pg_temp.dif(a, b, '{funil,foto}') = 1 and pg_temp.dif(a, b, '{funil,faz}') = 2 and pg_temp.dif(a, b, '{funil,whats}') = 1
                     and pg_temp.dif(a, b, '{funil,vitrine}') = 1 and pg_temp.dif(a, b, '{funil,post}') = 2 and pg_temp.dif(a, b, '{funil,convidou}') = 1
                     and pg_temp.dif(a, b, '{funil,bio}') = 1 from dd)
  then 'ok: o caminho de quem chega: foto, o que vende, WhatsApp, link na bio só de quem montou (perfil novo nasce com {"links": []}), vitrine só a pública, post e convite' else 'FALHOU: funil: ' || (select (b->'funil')::text from dd) end;
create temp table uso as select x->>'k' k, (x->>'n')::int n, (x->>'total')::int t, 'b' q from dd, jsonb_array_elements(b->'uso') x
  union all select x->>'k', (x->>'n')::int, (x->>'total')::int, 'a' from dd, jsonb_array_elements(a->'uso') x;
create function pg_temp.u(k text, c text) returns int language sql as $$
  select coalesce((select case when c = 'n' then n else t end from uso where uso.k = $1 and q = 'b'), 0) - coalesce((select case when c = 'n' then n else t end from uso where uso.k = $1 and q = 'a'), 0) $$;
select case when pg_temp.u('feed', 'n') = 2 and pg_temp.u('msg', 'n') = 1 and pg_temp.u('catalogo', 'total') = 2 and pg_temp.u('ia', 'n') = 2
              and pg_temp.u('linkbio', 'n') = 1 and pg_temp.u('linkbio', 'total') = 1
  then 'ok: o que se usa conta pessoas: post (A e D), mensagem (B), catálogo (B e D), IA (A e B, sem a casa), link na bio visitado (B)'
  else 'FALHOU: uso: ' || (select string_agg(k || '=' || n || '/' || t, ' ') from uso where q = 'b') end;
select case when (select pg_temp.dif(a, b, '{bio,visitas}') = 7 and pg_temp.dif(a, b, '{bio,toques}') = 2 and b->'bio'->'top' @> '[{"handle":"voltou402","n":7}]' from dd)
  then 'ok: link na bio: 7 visitas, 2 toques e a página de B no topo' else 'FALHOU: bio: ' || (select (b->'bio')::text from dd) end;
select case when (select pg_temp.dif(a, b, '{convites,total}') = 1 and pg_temp.dif(a, b, '{convites,pagos}') = 1 and b->'convites'->'top' @> '[{"handle":"voltou402","n":1}]' from dd)
  then 'ok: convites: 1 pago, quem chamou no topo' else 'FALHOU: convites: ' || (select (b->'convites')::text from dd) end;
select case when (select pg_temp.dif(a, b, '{planos,horus}') = 1 and pg_temp.dif(a, b, '{planos,mrr}') = 9.90 and pg_temp.dif(a, b, '{planos,teste}') = 1 from dd)
  then 'ok: planos: 1 Hórus pago (9,90 no mês) e 1 teste grátis rolando' else 'FALHOU: planos: ' || (select (b->'planos')::text from dd) end;
select case when (select pg_temp.dif(a, b, '{ia,tipos,legenda}') = 1 and pg_temp.dif(a, b, '{ia,tipos,direcao}') = 1 and pg_temp.dif(a, b, '{ia,tipos,imagem}') = 1
                     and pg_temp.dif(a, b, '{ia,tipos,maquina}') = 1 and pg_temp.dif(a, b, '{ia,total}') = 4 from dd)
  then 'ok: IA por tipo (a direção criativa e a máquina separadas), a casa contando no custo' else 'FALHOU: ia: ' || (select (b->'ia')::text from dd) end;
select case when (select b->'chegaram'->0->>'handle' = 'chegou402' and (b->'chegaram'->0->>'passos')::int = 2
                     and (b->'chegaram'->0->>'ultimo')::date = (now() at time zone 'America/Sao_Paulo')::date
                     and not (b->'chegaram' @> '[{"handle":"consanans"}]') from dd)
  then 'ok: quem chegou por último vem primeiro, com os passos e o último dia' else 'FALHOU: chegaram: ' || (select (b->'chegaram'->0)::text from dd) end;

-- o período: de 7 a 120 dias
select pg_temp.como('d1e9f6ac-f5d7-4723-8b02-eb0d1d7137b0'); set role authenticated;
create temp table l2 as select corre_lojinha(3) a, corre_lojinha(500) b;
reset role;
select case when (select (a->>'dias_periodo')::int = 7 and jsonb_array_length(a->'dias') = 7 and (b->>'dias_periodo')::int = 120 from l2)
  then 'ok: o período fica entre 7 e 120 dias' else 'FALHOU: período: ' || (select (a->>'dias_periodo') || ' / ' || (b->>'dias_periodo') from l2) end;

-- só o fundador
select pg_temp.como('00000000-0000-0000-0000-0000000402b1'); set role authenticated;
do $$ begin perform corre_lojinha(30); raise notice 'FALHOU: outra pessoa abriu a Lojinha'; exception when insufficient_privilege then raise notice 'ok: só o fundador abre a Lojinha'; end $$;
reset role;
-- e quem tá em corre_donos (v3.80) também abre; saiu da lista, não abre mais
insert into corre_donos (dono, obs) values ('00000000-0000-0000-0000-0000000402b1', 'teste402') on conflict do nothing;
select pg_temp.como('00000000-0000-0000-0000-0000000402b1'); set role authenticated;
do $$ begin perform corre_lojinha(30); raise notice 'ok: quem é dono (corre_donos) abre a Lojinha'; exception when insufficient_privilege then raise notice 'FALHOU: o dono não abriu a Lojinha'; end $$;
reset role;
delete from corre_donos where dono = '00000000-0000-0000-0000-0000000402b1';
select pg_temp.como('00000000-0000-0000-0000-0000000402b1'); set role authenticated;
do $$ begin perform corre_lojinha(30); raise notice 'FALHOU: saiu de dono e ainda abre'; exception when insufficient_privilege then raise notice 'ok: saiu da lista de donos, não abre mais'; end $$;
reset role;
select case when has_function_privilege('anon', 'corre_lojinha(integer)', 'execute') or has_function_privilege('anon', 'corre_marca_dia()', 'execute')
  then 'FALHOU: sem login executa a Lojinha ou a marca do dia' else 'ok: sem login não executa a Lojinha nem a marca do dia' end;
