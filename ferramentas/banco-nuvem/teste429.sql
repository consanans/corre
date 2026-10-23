\set ON_ERROR_STOP 1
-- v4.29: o trampo vira jogo. A tarefa feita, o post programado e o cliente chamado pagam 0,02 (uma vez; a que repete e o
-- cliente, uma vez por dia), até 0,20 por dia, fora do 1,00 da cidade; e contam os dias seguidos de trampo.
create function pg_temp.como(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false), set_config('request.jwt.claim.role', 'authenticated', false) $$;
insert into corre_perfis (id) values ('00000000-0000-0000-0000-000000042901'), ('00000000-0000-0000-0000-000000042902') on conflict do nothing;
delete from corre_correal_log where dono in ('00000000-0000-0000-0000-000000042901', '00000000-0000-0000-0000-000000042902');
delete from corre_correal where dono in ('00000000-0000-0000-0000-000000042901', '00000000-0000-0000-0000-000000042902');
delete from corre_trampo where dono in ('00000000-0000-0000-0000-000000042901', '00000000-0000-0000-0000-000000042902');
delete from corre_trampo_seq where dono in ('00000000-0000-0000-0000-000000042901', '00000000-0000-0000-0000-000000042902');
create temp table r429 (k text primary key, v jsonb);
grant all on r429 to authenticated;

-- o que a pessoa fez: uma tarefa por fazer, uma feita, uma que repete marcada hoje, uma de outra pessoa; um post programado
-- e um rascunho; um cliente chamado hoje e um chamado ontem
insert into corre_caderno (id, dono, titulo, dia) values
  ('00000000-0000-0000-0000-0000000429c1', '00000000-0000-0000-0000-000000042901', 'Por fazer', current_date),
  ('00000000-0000-0000-0000-0000000429c2', '00000000-0000-0000-0000-000000042901', 'Feita', current_date),
  ('00000000-0000-0000-0000-0000000429c4', '00000000-0000-0000-0000-000000042902', 'Da outra pessoa', current_date);
update corre_caderno set feito = true where id in ('00000000-0000-0000-0000-0000000429c2', '00000000-0000-0000-0000-0000000429c4');
insert into corre_caderno (id, dono, titulo, dia, repete) values ('00000000-0000-0000-0000-0000000429c3', '00000000-0000-0000-0000-000000042901', 'Todo dia', current_date + 1, 'dia');
update corre_caderno set feitas = array[(now() at time zone 'America/Sao_Paulo')::date] where id = '00000000-0000-0000-0000-0000000429c3';
insert into corre_portfolio (id, dono, marca, rede, cor) values ('00000000-0000-0000-0000-0000000429a1', '00000000-0000-0000-0000-000000042901', 'Padaria Sol', 'padariasol', '#FFE800') on conflict do nothing;
insert into corre_posts (id, dono, marca_id, data, hora, midia_url, status, ig_status) values
  ('00000000-0000-0000-0000-0000000429b1', '00000000-0000-0000-0000-000000042901', '00000000-0000-0000-0000-0000000429a1', current_date + 2, '18:00', 'https://x/a.jpg', 'pronto', 'agendado'),
  ('00000000-0000-0000-0000-0000000429b2', '00000000-0000-0000-0000-000000042901', '00000000-0000-0000-0000-0000000429a1', current_date + 3, '18:00', '', 'ideia', '');
insert into corre_leads (id, dono, nome, hist) values
  ('00000000-0000-0000-0000-0000000429d1', '00000000-0000-0000-0000-000000042901', 'Padaria do Zé', jsonb_build_array(jsonb_build_object('t', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'k', 'toque', 'v', 'WhatsApp · D0'))),
  ('00000000-0000-0000-0000-0000000429d2', '00000000-0000-0000-0000-000000042901', 'Bar da Esquina', jsonb_build_array(jsonb_build_object('t', to_char((now() - interval '2 days') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'k', 'toque', 'v', 'WhatsApp · D0')));

select case when corre_trampo_valor() = 0.02 and corre_trampo_teto() = 0.20 then 'ok: o trampo vale 0,02 e paga até 0,20 por dia' else 'FALHOU: os números do trampo' end;

set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000042901');
insert into r429 select 'nao', corre_correal_trampo('caderno', '00000000-0000-0000-0000-0000000429c1');
insert into r429 select 'outra', corre_correal_trampo('caderno', '00000000-0000-0000-0000-0000000429c4');
insert into r429 select 'c1', corre_correal_trampo('caderno', '00000000-0000-0000-0000-0000000429c2');
insert into r429 select 'c1b', corre_correal_trampo('caderno', '00000000-0000-0000-0000-0000000429c2');
insert into r429 select 'rep', corre_correal_trampo('caderno', '00000000-0000-0000-0000-0000000429c3');
insert into r429 select 'p1', corre_correal_trampo('post', '00000000-0000-0000-0000-0000000429b1');
insert into r429 select 'p1b', corre_correal_trampo('post', '00000000-0000-0000-0000-0000000429b1');
insert into r429 select 'p2', corre_correal_trampo('post', '00000000-0000-0000-0000-0000000429b2');
insert into r429 select 'l1', corre_correal_trampo('lead', '00000000-0000-0000-0000-0000000429d1');
insert into r429 select 'l1b', corre_correal_trampo('lead', '00000000-0000-0000-0000-0000000429d1');
insert into r429 select 'l2', corre_correal_trampo('lead', '00000000-0000-0000-0000-0000000429d2');
insert into r429 select 'tipo', corre_correal_trampo('feed', '00000000-0000-0000-0000-0000000429d1');
insert into r429 select 'meu', corre_trampo_meu();
reset role;
select case when (select v->>'motivo' from r429 where k = 'nao') = 'nao' and (select v->>'motivo' from r429 where k = 'outra') = 'nao' then 'ok: tarefa por fazer e tarefa dos outros não pagam' else 'FALHOU: pagou tarefa que não é tua ou não foi feita' end;
select case when (v->>'ok')::boolean and (v->>'ganhou')::numeric = 0.02 and (v->>'seq')::int = 1 and (v->>'novo_dia')::boolean then 'ok: a tarefa feita paga 0,02 e começa a sequência (1 dia)' else format('FALHOU: a primeira tarefa %s', v) end from r429 where k = 'c1';
select case when (select v->>'motivo' from r429 where k = 'c1b') = 'ja' and (select v->>'motivo' from r429 where k = 'p1b') = 'ja' and (select v->>'motivo' from r429 where k = 'l1b') = 'ja' then 'ok: a mesma tarefa, o mesmo post e o mesmo cliente no mesmo dia não pagam duas vezes' else 'FALHOU: pagou duas vezes' end;
select case when (select (v->>'ganhou')::numeric from r429 where k = 'rep') = 0.02 and not (select (v->>'novo_dia')::boolean from r429 where k = 'rep') then 'ok: a que repete, marcada hoje, paga (e o dia já tava contado)' else 'FALHOU: a que repete' end;
select case when (select (v->>'ganhou')::numeric from r429 where k = 'p1') = 0.02 and (select v->>'motivo' from r429 where k = 'p2') = 'nao' then 'ok: o post programado paga; o rascunho não' else 'FALHOU: o post' end;
select case when (select (v->>'ganhou')::numeric from r429 where k = 'l1') = 0.02 and (select v->>'motivo' from r429 where k = 'l2') = 'nao' then 'ok: o cliente chamado hoje paga; o de anteontem não' else 'FALHOU: o cliente' end;
select case when (select v->>'motivo' from r429 where k = 'tipo') = 'tipo' then 'ok: tipo que não existe é recusado' else 'FALHOU: tipo estranho' end;
select case when (v->>'seq')::int = 1 and (v->>'hoje')::numeric = 0.08 and (v->>'hoje_conta')::boolean then 'ok: a carteira vê 1 dia seguido e 0,08 do trampo hoje' else format('FALHOU: o meu %s', v) end from r429 where k = 'meu';
select case when (select saldo from corre_correal where dono = '00000000-0000-0000-0000-000000042901') = 0.08
             and (select count(*) from corre_correal_log where dono = '00000000-0000-0000-0000-000000042901' and motivo like 'trampo:%') = 4
            then 'ok: 4 trampos, 0,08 na carteira, cada um uma linha "trampo:" no extrato' else 'FALHOU: a carteira do trampo' end;

-- o teto do trampo: com 0,19 contado hoje, paga só 0,01; depois, paga 0 mas segue contando
insert into corre_trampo (dono, tipo, ref, dia, valor) values ('00000000-0000-0000-0000-000000042901', 'lead', gen_random_uuid(), (now() at time zone 'America/Sao_Paulo')::date, 0.11);
update corre_leads set hist = hist || jsonb_build_array(jsonb_build_object('t', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'k', 'toque', 'v', 'WhatsApp · D2')) where id = '00000000-0000-0000-0000-0000000429d2';
insert into corre_leads (id, dono, nome, hist) values ('00000000-0000-0000-0000-0000000429d3', '00000000-0000-0000-0000-000000042901', 'Oficina', jsonb_build_array(jsonb_build_object('t', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'k', 'toque', 'v', 'Ligação')));
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000042901');
insert into r429 select 't1', corre_correal_trampo('lead', '00000000-0000-0000-0000-0000000429d2');
insert into r429 select 't2', corre_correal_trampo('lead', '00000000-0000-0000-0000-0000000429d3');
reset role;
select case when (select (v->>'ganhou')::numeric from r429 where k = 't1') = 0.01 and (select (v->>'trampo')::numeric from r429 where k = 't1') = 0.20 then 'ok: com 0,19 do trampo hoje, paga só 0,01 e chega no 0,20' else format('FALHOU: teto do trampo %s', (select v from r429 where k = 't1')) end;
select case when (v->>'ok')::boolean and (v->>'ganhou')::numeric = 0 then 'ok: passou do teto, não paga, mas conta' else format('FALHOU: depois do teto %s', v) end from r429 where k = 't2';

-- o 1,00 da cidade não muda: o trampo é à parte
select case when public.corre_correal_hoje('00000000-0000-0000-0000-000000042901') = 0 then 'ok: o trampo não entra no 1,00 da cidade (tarefa e rua)' else 'FALHOU: o trampo comeu o teto da cidade' end;

-- os dias seguidos: ontem teve trampo, hoje soma um; três dias sem, recomeça
update corre_trampo_seq set seq = 4, melhor = 4, ult = (now() at time zone 'America/Sao_Paulo')::date - 1 where dono = '00000000-0000-0000-0000-000000042901';
insert into corre_caderno (id, dono, titulo, dia) values ('00000000-0000-0000-0000-0000000429c5', '00000000-0000-0000-0000-000000042901', 'Outra', current_date);
update corre_caderno set feito = true where id = '00000000-0000-0000-0000-0000000429c5';
insert into corre_caderno (id, dono, titulo, dia) values ('00000000-0000-0000-0000-0000000429c6', '00000000-0000-0000-0000-000000042902', 'Dela', current_date);
update corre_caderno set feito = true where id = '00000000-0000-0000-0000-0000000429c6';
insert into corre_trampo_seq (dono, seq, melhor, ult, n) values ('00000000-0000-0000-0000-000000042902', 9, 9, (now() at time zone 'America/Sao_Paulo')::date - 3, 20);
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000042901');
insert into r429 select 's1', corre_correal_trampo('caderno', '00000000-0000-0000-0000-0000000429c5');
select pg_temp.como('00000000-0000-0000-0000-000000042902');
insert into r429 select 's2', corre_correal_trampo('caderno', '00000000-0000-0000-0000-0000000429c6');
insert into r429 select 'pl', corre_trampo_placas();
reset role;
select case when (v->>'seq')::int = 5 and (v->>'melhor')::int = 5 and (v->>'novo_dia')::boolean then 'ok: trampo ontem e hoje: 5 dias seguidos' else format('FALHOU: a sequência %s', v) end from r429 where k = 's1';
select case when (v->>'seq')::int = 1 and (v->>'melhor')::int = 9 then 'ok: três dias sem trampo, a sequência recomeça (o melhor fica)' else format('FALHOU: recomeçar %s', v) end from r429 where k = 's2';
select case when (v->>'00000000-0000-0000-0000-000000042901')::int = 5 and not (v ? '00000000-0000-0000-0000-000000042902') then 'ok: a placa da cidade mostra quem tem 2 dias ou mais' else format('FALHOU: as placas %s', v) end from r429 where k = 'pl';

-- o app não lê nem escreve as tabelas, e sem login não chama
select case when not has_table_privilege('authenticated', 'public.corre_trampo', 'select') and not has_table_privilege('authenticated', 'public.corre_trampo', 'insert')
             and not has_table_privilege('authenticated', 'public.corre_trampo_seq', 'update')
             and not has_function_privilege('anon', 'public.corre_correal_trampo(text, uuid)', 'execute')
             and not has_function_privilege('anon', 'public.corre_trampo_placas()', 'execute')
            then 'ok: o app não mexe no que foi contado, e sem login não ganha' else 'FALHOU: as travas do trampo' end;
