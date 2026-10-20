\set ON_ERROR_STOP 1
-- v4.11: o trampo vira GTA. A missão paga de 0,18 a 0,24 e pede o tempo mínimo dela; o bico paga 0,03 e segue com 20 s;
-- o teto do dia (1,00) e o resto do correal não mudam.
create function pg_temp.como(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false), set_config('request.jwt.claim.role', 'authenticated', false) $$;
create function pg_temp.tenta(q text) returns text language plpgsql as $$ declare h text; begin execute q; return 'passou'; exception when others then get stacked diagnostics h = pg_exception_hint; return coalesce(nullif(h, ''), sqlstate); end $$;
insert into corre_perfis (id) values ('00000000-0000-0000-0000-000000041101'), ('00000000-0000-0000-0000-000000041102') on conflict do nothing;
delete from corre_correal_log where dono in ('00000000-0000-0000-0000-000000041101', '00000000-0000-0000-0000-000000041102');
delete from corre_correal where dono in ('00000000-0000-0000-0000-000000041101', '00000000-0000-0000-0000-000000041102');
create temp table r411 (k text primary key, v jsonb);
grant all on r411 to authenticated;

select case when corre_tarefa_valor('motoboy', 'rush') = 6 and corre_tarefa_valor('policial', 'perseguicao') = 8 and corre_tarefa_valor('bombeiro', 'incendio') = 8
             and corre_tarefa_valor('medico', 'ambulancia') = 7 and corre_tarefa_valor('ladrao', 'desmanche') = 8 and corre_tarefa_valor('detetive', 'nacola') = 7
             and corre_tarefa_valor('pirata', 'contrabando') = 7 and corre_tarefa_valor('craque', 'racha') = 6
  then 'ok: as 8 missões valem de 6 a 8 pontos' else 'FALHOU: o valor das missões' end;
select case when (select count(*) from (values ('policial','ronda'),('bombeiro','fogo'),('medico','socorro'),('chef','pastel'),('motoboy','entrega'),('craque','gols'),
                    ('ladrao','pipoca'),('detetive','pistas'),('cientista','amostra'),('pirata','tesouro'),('astronauta','contagem'),('ninja','pergaminho'),('super','patrulha'),('rei','fita')) b(u, k)
                  where corre_tarefa_valor(b.u, b.k) = 1) = 14
  then 'ok: os bicos de antes valem 1 ponto (0,03)' else 'FALHOU: o valor dos bicos' end;

set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000041101');
-- missão terminada na hora: o banco manda esperar o mínimo dela (50 s no rush)
insert into r411 select 'rush', to_jsonb(corre_tarefa_comeca('motoboy', 'rush'));
insert into r411 select 'rush1', corre_tarefa_termina((select (v #>> '{}')::uuid from r411 where k = 'rush'));
select case when v->>'motivo' = 'rapido' and (v->>'falta')::int between 48 and 50 then 'ok: missão rápida demais espera o mínimo dela (' || (v->>'falta') || ' s)' else format('FALHOU: rush na hora %s', v) end from r411 where k = 'rush1';
reset role;
update corre_tarefa_vez set comecou = now() - interval '55 seconds' where id = (select (v #>> '{}')::uuid from r411 where k = 'rush');
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000041101');
insert into r411 select 'rush2', corre_tarefa_termina((select (v #>> '{}')::uuid from r411 where k = 'rush'));
select case when (v->>'ok')::boolean and (v->>'ganhou')::numeric = 0.18 and (v->>'pontos')::int = 6 then 'ok: a missão de 6 pontos paga 0,18 depois do mínimo' else format('FALHOU: rush %s', v) end from r411 where k = 'rush2';
-- bico: 20 s, 0,03
insert into r411 select 'bico', to_jsonb(corre_tarefa_comeca('chef', 'pastel'));
reset role;
update corre_tarefa_vez set comecou = now() - interval '25 seconds' where id = (select (v #>> '{}')::uuid from r411 where k = 'bico');
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000041101');
insert into r411 select 'bico2', corre_tarefa_termina((select (v #>> '{}')::uuid from r411 where k = 'bico'));
select case when (v->>'ganhou')::numeric = 0.03 and (v->>'hoje')::numeric = 0.21 then 'ok: o bico paga 0,03 com os 20 s de sempre (hoje 0,21)' else format('FALHOU: bico %s', v) end from r411 where k = 'bico2';
-- missão que o banco não conhece segue recusada
select case when pg_temp.tenta($$select corre_tarefa_comeca('motoboy', 'voo')$$) = 'tarefa' then 'ok: tarefa que não existe é recusada' else 'FALHOU: aceitou tarefa inventada' end;
-- o app não chama o corre_tarefa_min (só a função de dentro)
select case when not has_function_privilege('authenticated', 'public.corre_tarefa_min(text, text)', 'execute') then 'ok: o app não chama o tempo mínimo' else 'FALHOU: o app chama o tempo mínimo' end;
reset role;

-- o teto do dia segue 1,00: com 0,95 de hoje, a missão de 8 pontos paga só o 0,05 que falta
insert into corre_correal_log (dono, valor, motivo) values ('00000000-0000-0000-0000-000000041102', 0.95, 'tarefa:chef:pastel');
insert into corre_correal (dono, saldo, ganho) values ('00000000-0000-0000-0000-000000041102', 0.95, 0.95);
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000041102');
insert into r411 select 'per', to_jsonb(corre_tarefa_comeca('policial', 'perseguicao'));
reset role;
update corre_tarefa_vez set comecou = now() - interval '70 seconds' where id = (select (v #>> '{}')::uuid from r411 where k = 'per');
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000041102');
insert into r411 select 'per2', corre_tarefa_termina((select (v #>> '{}')::uuid from r411 where k = 'per'));
select case when (v->>'ganhou')::numeric = 0.05 and (v->>'valia')::numeric = 0.24 and (v->>'hoje')::numeric = 1.00 then 'ok: a perseguição vale 0,24 e o teto de 1,00 segura (pagou 0,05)' else format('FALHOU: teto %s', v) end from r411 where k = 'per2';
reset role;
