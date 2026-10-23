\set ON_ERROR_STOP 1
-- v4.32: o bicho mais perto (a lenda em 15.000 e o resto na mesma proporção: 300, 1.500, 5.000), o adianto até 1.499, o
-- Passeio na cidade com 1.500, os escudos com 5.000 e 15.000 e o "faltam N pro ovo chocar" do bom dia contando até 300.
create function pg_temp.como(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false), set_config('request.jwt.claim.role', 'authenticated', false) $$;
create function pg_temp.hj() returns date language sql as $$ select (now() at time zone 'America/Sao_Paulo')::date $$;
create function pg_temp.as_(h text) returns timestamptz language sql as $$ select (pg_temp.hj() + h::time) at time zone 'America/Sao_Paulo' $$;
insert into corre_perfis (id) values ('00000000-0000-0000-0000-000000043201'), ('00000000-0000-0000-0000-000000043202'),
  ('00000000-0000-0000-0000-000000043203') on conflict do nothing;
create temp table r432 (k text primary key, v jsonb);
grant all on r432 to authenticated;

select case when corre_bicho_etapa(0) = 0 and corre_bicho_etapa(299) = 0 and corre_bicho_etapa(300) = 1 and corre_bicho_etapa(1499) = 1
             and corre_bicho_etapa(1500) = 2 and corre_bicho_etapa(4999) = 2 and corre_bicho_etapa(5000) = 3 and corre_bicho_etapa(14999) = 3
             and corre_bicho_etapa(15000) = 4 and corre_bicho_etapa(150000) = 4
            then 'ok: as formas: ovo, 300, 1.500, 5.000 e a lenda em 15.000' else 'FALHOU: os números das formas' end;

-- a A já tinha feito 2.000 tarefas antes do bicho (pelo trampo): o adianto para na véspera da 2ª forma
insert into corre_trampo (dono, tipo, ref, dia, valor)
  select '00000000-0000-0000-0000-000000043201', 'caderno', gen_random_uuid(), pg_temp.hj() - 3, 0 from generate_series(1, 2000);
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000043201');
insert into r432 select 'nasce', corre_bicho_escolhe('gralha');
select pg_temp.como('00000000-0000-0000-0000-000000043202');
insert into r432 select 'b', corre_bicho_escolhe('coruja');
reset role;
select case when (v->>'antes')::int = 1499 and (v->>'xp')::int = 1499 and (v->>'etapa')::int = 1 and v->>'nome' = 'Pinhãozinho'
            then 'ok: quem já fazia 2.000 nasce com 1.499 (já choca, a evolução ainda é vista)' else format('FALHOU: o adianto %s', v) end from r432 where k = 'nasce';

-- o Passeio: 1.500 aparece na cidade, 1.499 não
update corre_bicho set xp_antes = 1500 where dono = '00000000-0000-0000-0000-000000043201';
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000043201');
insert into r432 select 'cidade', corre_bichos_cidade();
reset role;
select case when v->'00000000-0000-0000-0000-000000043201' = '["gralha", 2]'::jsonb and not (v ? '00000000-0000-0000-0000-000000043202')
            then 'ok: com 1.500 o bicho anda na cidade (e o ovo não)' else format('FALHOU: a cidade %s', v) end from r432 where k = 'cidade';

-- os escudos: nenhum até 4.999, 1 com 5.000, 2 na lenda
update corre_bicho set xp_antes = 4999, escudos = '{}' where dono = '00000000-0000-0000-0000-000000043201';
insert into r432 select 'e4999', to_jsonb(corre_bicho_escudos('00000000-0000-0000-0000-000000043201', pg_temp.hj()));
update corre_bicho set xp_antes = 5000 where dono = '00000000-0000-0000-0000-000000043201';
insert into r432 select 'e5000', to_jsonb(corre_bicho_escudos('00000000-0000-0000-0000-000000043201', pg_temp.hj()));
update corre_bicho set xp_antes = 15000 where dono = '00000000-0000-0000-0000-000000043201';
insert into r432 select 'e15000', to_jsonb(corre_bicho_escudos('00000000-0000-0000-0000-000000043201', pg_temp.hj()));
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000043201');
insert into r432 select 'lenda', corre_bicho_meu();
reset role;
select case when (select v from r432 where k = 'e4999') = '0' and (select v from r432 where k = 'e5000') = '1' and (select v from r432 where k = 'e15000') = '2'
            then 'ok: o escudo: nenhum até 4.999, 1 com 5.000, 2 na lenda' else 'FALHOU: os escudos' end;
select case when (v->>'etapa')::int = 4 and v->>'nome' = 'Imperatriz Araucária' and (v->>'escudos')::int = 2
            then 'ok: com 15.000, a Imperatriz Araucária com dois escudos' else format('FALHOU: a lenda %s', v) end from r432 where k = 'lenda';

-- o bom dia da C, que ainda é ovo com 10 tarefas: faltam 290
insert into corre_trampo (dono, tipo, ref, dia, valor)
  select '00000000-0000-0000-0000-000000043203', 'caderno', gen_random_uuid(), pg_temp.hj() - 1, 0 from generate_series(1, 10);
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000043203');
insert into r432 select 'c', corre_bicho_escolhe('guara');
reset role;
insert into corre_push (endpoint, dono, p256dh, auth, visto_em) values
  ('https://fcm.googleapis.com/bd432-c', '00000000-0000-0000-0000-000000043203', 'p', 'a', now()) on conflict do nothing;
insert into corre_caderno (id, dono, titulo, dia) values ('00000000-0000-0000-0000-0000000432c1', '00000000-0000-0000-0000-000000043203', 'Ligar pro contador', pg_temp.hj());
insert into r432 select 'bd', coalesce((select jsonb_agg(x) from jsonb_array_elements(corre_bomdia_alvos(pg_temp.as_('08:10'))) x
                                         where x->>'para' = '00000000-0000-0000-0000-000000043203'), '[]'::jsonb);
select case when jsonb_array_length(v) = 1 and v->0->'payload'->>'titulo' = 'Bom dia! Teu ovo tá quentinho'
             and v->0->'payload'->>'corpo' = 'Hoje: 1 tarefa. Começa por: Ligar pro contador. Faltam 290 tarefas pro ovo chocar.'
            then 'ok: o bom dia do ovo conta até 300: faltam 290' else format('FALHOU: o bom dia %s', v) end from r432 where k = 'bd';
