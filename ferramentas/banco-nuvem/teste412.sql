\set ON_ERROR_STOP 1
-- v4.12: o correal que cai na rua. 0,01 a moeda, até 3 por vez, 8 s entre uma vez e outra, 0,15 por dia, e tudo dentro
-- do teto de 1,00 do dia (a tarefa e a rua juntas).
create function pg_temp.como(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false), set_config('request.jwt.claim.role', 'authenticated', false) $$;
insert into corre_perfis (id) values ('00000000-0000-0000-0000-000000041201'), ('00000000-0000-0000-0000-000000041202') on conflict do nothing;
delete from corre_correal_log where dono in ('00000000-0000-0000-0000-000000041201', '00000000-0000-0000-0000-000000041202');
delete from corre_correal where dono in ('00000000-0000-0000-0000-000000041201', '00000000-0000-0000-0000-000000041202');
create temp table r412 (k text primary key, v jsonb);
grant all on r412 to authenticated;

select case when corre_achado_moeda() = 0.01 and corre_achado_teto() = 0.15 then 'ok: a moeda vale 0,01 e a rua paga até 0,15 por dia' else 'FALHOU: os números da rua' end;

set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000041201');
insert into r412 select 'a1', corre_correal_achado(2);
insert into r412 select 'a2', corre_correal_achado(1);
select case when (v->>'ok')::boolean and (v->>'ganhou')::numeric = 0.02 and (v->>'saldo')::numeric = 0.02 and (v->>'rua')::numeric = 0.02 then 'ok: duas moedas pagam 0,02' else format('FALHOU: duas moedas %s', v) end from r412 where k = 'a1';
select case when v->>'motivo' = 'devagar' and (v->>'falta')::int between 1 and 8 then 'ok: logo em seguida, o banco manda esperar (' || (v->>'falta') || ' s)' else format('FALHOU: sem intervalo %s', v) end from r412 where k = 'a2';
reset role;
update corre_correal_log set created_at = now() - interval '9 seconds' where dono = '00000000-0000-0000-0000-000000041201';
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000041201');
insert into r412 select 'a3', corre_correal_achado(50);
select case when (v->>'ganhou')::numeric = 0.03 and (v->>'saldo')::numeric = 0.05 then 'ok: pedir 50 moedas paga só 3 (0,03)' else format('FALHOU: o corte das 3 %s', v) end from r412 where k = 'a3';
reset role;

-- o teto da rua: com 0,14 da rua hoje, paga só a moeda que falta; depois, 'teto'
insert into corre_correal_log (dono, valor, motivo, created_at) values ('00000000-0000-0000-0000-000000041201', 0.09, 'achado:rua', now() - interval '30 seconds');
update corre_correal_log set created_at = now() - interval '20 seconds' where dono = '00000000-0000-0000-0000-000000041201';
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000041201');
insert into r412 select 'a4', corre_correal_achado(3);
select case when (v->>'ganhou')::numeric = 0.01 and (v->>'rua')::numeric = 0.15 then 'ok: com 0,14 da rua hoje, paga só 0,01 e chega no 0,15' else format('FALHOU: teto da rua %s', v) end from r412 where k = 'a4';
reset role;
update corre_correal_log set created_at = now() - interval '20 seconds' where dono = '00000000-0000-0000-0000-000000041201';
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000041201');
insert into r412 select 'a5', corre_correal_achado(1);
select case when v->>'motivo' = 'teto' and (v->>'ganhou')::numeric = 0 then 'ok: a rua já deu o que tinha hoje' else format('FALHOU: passou do teto da rua %s', v) end from r412 where k = 'a5';
reset role;

-- o teto do dia é um só: com 0,99 de tarefa hoje, a rua paga só 0,01; e o "hoje" da carteira conta os dois
insert into corre_correal_log (dono, valor, motivo, created_at) values ('00000000-0000-0000-0000-000000041202', 0.99, 'tarefa:chef:pastel', now() - interval '1 minute');
insert into corre_correal (dono, saldo, ganho) values ('00000000-0000-0000-0000-000000041202', 0.99, 0.99);
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000041202');
insert into r412 select 'b1', corre_correal_achado(3);
select case when (v->>'ganhou')::numeric = 0.01 and (v->>'hoje')::numeric = 1.00 and (corre_correal_meu()->>'hoje')::numeric = 1.00 then 'ok: o teto de 1,00 do dia vale pra tarefa e rua juntas' else format('FALHOU: teto do dia %s', v) end from r412 where k = 'b1';
reset role;

-- quem não entrou não chama
set role anon;
select case when not has_function_privilege('anon', 'public.corre_correal_achado(integer)', 'execute') then 'ok: sem login, a rua não paga' else 'FALHOU: anon chama a rua' end;
reset role;
select case when (select count(*) from corre_correal_log where dono = '00000000-0000-0000-0000-000000041201' and motivo = 'achado:rua' and valor > 0) = 4 then 'ok: cada pagamento é uma linha "achado:rua" no extrato' else 'FALHOU: o extrato da rua' end;
