\set ON_ERROR_STOP 1
-- v4.30: o bicho do Caderninho (nasce, conta as tarefas do trampo sem teto por dia, evolui em 3.000, 15.000, 50.000 e 150.000), o escudo da sequência
-- de trampo e o bom dia no celular.
create function pg_temp.como(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false), set_config('request.jwt.claim.role', 'authenticated', false) $$;
create function pg_temp.hj() returns date language sql as $$ select (now() at time zone 'America/Sao_Paulo')::date $$;
-- a hora de Brasília de hoje, pro relógio do bom dia
create function pg_temp.as_(h text) returns timestamptz language sql as $$ select (pg_temp.hj() + h::time) at time zone 'America/Sao_Paulo' $$;
insert into corre_perfis (id) values ('00000000-0000-0000-0000-000000043001'), ('00000000-0000-0000-0000-000000043002'),
  ('00000000-0000-0000-0000-000000043003'), ('00000000-0000-0000-0000-000000043004'), ('00000000-0000-0000-0000-000000043005') on conflict do nothing;
create temp table r430 (k text primary key, v jsonb);
grant all on r430 to authenticated;

-- o que a A já tinha feito antes do bicho: duas tarefas feitas e uma que repete feita em três dias (5 no total)
insert into corre_caderno (id, dono, titulo, dia) values
  ('00000000-0000-0000-0000-0000000430c1', '00000000-0000-0000-0000-000000043001', 'Feita 1', pg_temp.hj()),
  ('00000000-0000-0000-0000-0000000430c2', '00000000-0000-0000-0000-000000043001', 'Feita 2', pg_temp.hj());
update corre_caderno set feito = true where id in ('00000000-0000-0000-0000-0000000430c1', '00000000-0000-0000-0000-0000000430c2');
insert into corre_caderno (id, dono, titulo, dia, repete, feitas) values ('00000000-0000-0000-0000-0000000430c3', '00000000-0000-0000-0000-000000043001', 'Todo dia', pg_temp.hj() + 1, 'dia',
  array[pg_temp.hj() - 1, pg_temp.hj() - 2, pg_temp.hj() - 3]);

select case when corre_bicho_etapa(2999) = 0 and corre_bicho_etapa(3000) = 1 and corre_bicho_etapa(14999) = 1 and corre_bicho_etapa(15000) = 2
             and corre_bicho_etapa(49999) = 2 and corre_bicho_etapa(50000) = 3 and corre_bicho_etapa(149999) = 3 and corre_bicho_etapa(150000) = 4
            then 'ok: as formas: ovo, 3.000, 15.000, 50.000 e 150.000 tarefas' else 'FALHOU: os números das formas' end;

set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000043001');
insert into r430 select 'nada', corre_bicho_meu();
insert into r430 select 'dragao', corre_bicho_escolhe('dragao');
insert into r430 select 'nasce', corre_bicho_escolhe('gralha');
insert into r430 select 'outra', corre_bicho_escolhe('coruja');
select pg_temp.como('00000000-0000-0000-0000-000000043002');
insert into r430 select 'b', corre_bicho_escolhe('guara');
select pg_temp.como('00000000-0000-0000-0000-000000043003');
insert into r430 select 'c', corre_bicho_meu();
reset role;
select case when not (select (v->>'tem')::boolean from r430 where k = 'nada') and (select v->>'motivo' from r430 where k = 'dragao') = 'especie'
            then 'ok: sem bicho, o meu diz que não tem; espécie que não existe é recusada' else 'FALHOU: sem bicho ou espécie estranha' end;
select case when (v->>'tem')::boolean and v->>'especie' = 'gralha' and (v->>'xp')::int = 5 and (v->>'antes')::int = 5 and (v->>'etapa')::int = 0 and v->>'nome' = 'Ovo'
            then 'ok: nasce o ovo da gralha, e as 5 tarefas de antes já contam' else format('FALHOU: nascer %s', v) end from r430 where k = 'nasce';
select case when (select v->>'especie' from r430 where k = 'outra') = 'gralha' and (select v->>'etapa' from r430 where k = 'b') = '0' and (select v->>'xp' from r430 where k = 'b') = '0'
             and not (select (v->>'tem')::boolean from r430 where k = 'c')
            then 'ok: escolher de novo não troca o bicho; quem não fez nada nasce ovo' else 'FALHOU: escolher de novo ou o ovo' end;

-- as tarefas do trampo depois que nasceu: todas, sem teto por dia (o post não conta)
insert into corre_trampo (dono, tipo, ref, dia, valor) select '00000000-0000-0000-0000-000000043001', 'caderno', gen_random_uuid(), pg_temp.hj() - 10, 0 from generate_series(1, 25);
insert into corre_trampo (dono, tipo, ref, dia, valor) select '00000000-0000-0000-0000-000000043001', 'post', gen_random_uuid(), pg_temp.hj() - 10, 0 from generate_series(1, 4);
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000043001');
insert into r430 select 'xp25', corre_bicho_meu();
insert into r430 select 'apelido', corre_bicho_apelido('  <b>Zé do Pinhão</b> que é comprido demais ');
insert into r430 select 'dias', corre_bicho_dias(30);
reset role;
-- 15.000 (o adianto faz as vezes de anos de tarefa): a Gralhinha ganha o Passeio
update corre_bicho set xp_antes = 15000 - 25 where dono = '00000000-0000-0000-0000-000000043001';
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000043001');
insert into r430 select 'cidade', corre_bichos_cidade();
insert into r430 select 'xp15', corre_bicho_meu();
reset role;
select case when (v->>'xp')::int = 30 and (v->>'etapa')::int = 0 then 'ok: 25 tarefas num dia contam as 25 (sem teto), e post não conta: 30' else format('FALHOU: a conta %s', v) end from r430 where k = 'xp25';
select case when (v->>'xp')::int = 15000 and (v->>'etapa')::int = 2 and v->>'nome' = 'Gralhinha' then 'ok: com 15.000, a Gralhinha' else format('FALHOU: 15.000 %s', v) end from r430 where k = 'xp15';
select case when v->>'apelido' = 'bZé do Pinhão/b que' then 'ok: o apelido sem < > e cortado em 20' else format('FALHOU: apelido %s', v->>'apelido') end from r430 where k = 'apelido';
select case when (v->>(pg_temp.hj()::text))::int = 2 and (v->>((pg_temp.hj() - 1)::text))::int = 1 and (v->>((pg_temp.hj() - 10)::text))::int = 25
            then 'ok: o mapa do ano conta as tarefas de cada dia' else format('FALHOU: os dias %s', v) end from r430 where k = 'dias';
select case when v->'00000000-0000-0000-0000-000000043001' = '["gralha", 2]'::jsonb and not (v ? '00000000-0000-0000-0000-000000043002')
            then 'ok: na cidade só quem tem o Passeio (15.000 tarefas), com a espécie e a forma' else format('FALHOU: a cidade %s', v) end from r430 where k = 'cidade';
select case when not has_table_privilege('authenticated', 'public.corre_bicho', 'select') and not has_function_privilege('authenticated', 'public.corre_bicho_xp(uuid)', 'execute')
             and not has_function_privilege('anon', 'public.corre_bicho_meu()', 'execute') and not has_function_privilege('anon', 'public.corre_bichos_cidade()', 'execute')
            then 'ok: ninguém do app lê a tabela do bicho nem a conta; quem não entrou não chama nada' else 'FALHOU: direitos do bicho' end;

-- o escudo: com 50.000 tarefas, um dia sem trampo (ontem) não quebra a sequência
insert into corre_trampo (dono, tipo, ref, dia, valor) select '00000000-0000-0000-0000-000000043001', 'caderno', gen_random_uuid(), pg_temp.hj() - 6, 0 from generate_series(1, 20);
insert into corre_trampo (dono, tipo, ref, dia, valor) select '00000000-0000-0000-0000-000000043001', 'caderno', gen_random_uuid(), pg_temp.hj() - 7, 0 from generate_series(1, 5);
update corre_bicho set xp_antes = 50000 - 50 where dono = '00000000-0000-0000-0000-000000043001';
insert into corre_trampo_seq (dono, seq, melhor, ult, n) values ('00000000-0000-0000-0000-000000043001', 6, 6, pg_temp.hj() - 2, 30)
  on conflict (dono) do update set seq = 6, melhor = 6, ult = pg_temp.hj() - 2;
insert into corre_trampo_seq (dono, seq, melhor, ult, n) values ('00000000-0000-0000-0000-000000043003', 6, 6, pg_temp.hj() - 2, 30)
  on conflict (dono) do update set seq = 6, melhor = 6, ult = pg_temp.hj() - 2;
insert into corre_caderno (id, dono, titulo, dia) values ('00000000-0000-0000-0000-0000000430c5', '00000000-0000-0000-0000-000000043001', 'Hoje', pg_temp.hj()),
  ('00000000-0000-0000-0000-0000000430c6', '00000000-0000-0000-0000-000000043003', 'Dela', pg_temp.hj());
update corre_caderno set feito = true where id in ('00000000-0000-0000-0000-0000000430c5', '00000000-0000-0000-0000-0000000430c6');
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000043001');
insert into r430 select 'meu50', corre_trampo_meu();
insert into r430 select 'placas', corre_trampo_placas();
insert into r430 select 'tr', corre_correal_trampo('caderno', '00000000-0000-0000-0000-0000000430c5');
insert into r430 select 'meu2', corre_trampo_meu();
select pg_temp.como('00000000-0000-0000-0000-000000043003');
insert into r430 select 'trc', corre_correal_trampo('caderno', '00000000-0000-0000-0000-0000000430c6');
reset role;
select case when (v->>'seq')::int = 6 and (v->>'protegida')::boolean and (v->>'escudos')::int = 1 then 'ok: com 50.000 tarefas, o dia sem trampo fica protegido pelo escudo (a sequência segue 6)' else format('FALHOU: meu com escudo %s', v) end from r430 where k = 'meu50';
select case when (v->>'00000000-0000-0000-0000-000000043001')::int = 6 and not (v ? '00000000-0000-0000-0000-000000043003') then 'ok: a placa da casa fica com o escudo; sem bicho, cai' else format('FALHOU: placas %s', v) end from r430 where k = 'placas';
select case when (v->>'seq')::int = 7 and (v->>'escudo')::int = 1 and (v->>'bicho')::int = 50001 and (v->>'bicho_etapa')::int = 3
             and (select escudos from corre_bicho where dono = '00000000-0000-0000-0000-000000043001') = array[pg_temp.hj() - 1]
            then 'ok: o trampo de hoje gasta o escudo (ontem fica coberto), a sequência vai a 7 e devolve o bicho (50.001, Gralha Braba)' else format('FALHOU: trampo com escudo %s', v) end from r430 where k = 'tr';
select case when (select (v->>'escudos')::int from r430 where k = 'meu2') = 0 and (select (v->>'seq')::int from r430 where k = 'trc') = 1 and (select v->'bicho' from r430 where k = 'trc') = 'null'::jsonb
            then 'ok: o escudo gasto some na semana; sem bicho, faltar um dia recomeça a sequência (como na v4.29)' else 'FALHOU: depois do escudo' end;
-- outro dia sem trampo na mesma semana: sem escudo, recomeça
update corre_trampo_seq set ult = pg_temp.hj() - 2 where dono = '00000000-0000-0000-0000-000000043001';
insert into corre_caderno (id, dono, titulo, dia) values ('00000000-0000-0000-0000-0000000430c7', '00000000-0000-0000-0000-000000043001', 'Mais', pg_temp.hj());
update corre_caderno set feito = true where id = '00000000-0000-0000-0000-0000000430c7';
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000043001');
insert into r430 select 'meu3', corre_trampo_meu();
insert into r430 select 'tr2', corre_correal_trampo('caderno', '00000000-0000-0000-0000-0000000430c7');
reset role;
select case when (select (v->>'seq')::int from r430 where k = 'meu3') = 0 and (select (v->>'seq')::int from r430 where k = 'tr2') = 1
            then 'ok: um escudo por semana: o segundo dia sem trampo recomeça' else 'FALHOU: o segundo dia sem trampo' end;

-- o bom dia: a A escolhe 7h30 e tem coisa no dia (tarefa, post, cliente, cobrança)
insert into corre_push (endpoint, dono, p256dh, auth, visto_em) values
  ('https://fcm.googleapis.com/bd430-a', '00000000-0000-0000-0000-000000043001', 'p', 'a', now()),
  ('https://fcm.googleapis.com/bd430-b', '00000000-0000-0000-0000-000000043002', 'p', 'a', now()),
  ('https://fcm.googleapis.com/bd430-d', '00000000-0000-0000-0000-000000043004', 'p', 'a', now()),
  ('https://fcm.googleapis.com/bd430-e', '00000000-0000-0000-0000-000000043005', 'p', 'a', now()) on conflict do nothing;
insert into corre_caderno (id, dono, titulo, dia, prio) values ('00000000-0000-0000-0000-0000000430c8', '00000000-0000-0000-0000-000000043001', 'Mandar o orçamento', pg_temp.hj(), 1);
insert into corre_portfolio (id, dono, marca, rede, cor) values ('00000000-0000-0000-0000-0000000430a1', '00000000-0000-0000-0000-000000043001', 'Padaria Sol', 'padariasol', '#FFE800') on conflict do nothing;
insert into corre_posts (id, dono, marca_id, data, hora, midia_url, status, ig_status) values
  ('00000000-0000-0000-0000-0000000430b1', '00000000-0000-0000-0000-000000043001', '00000000-0000-0000-0000-0000000430a1', pg_temp.hj(), '18:30', 'https://x/a.jpg', 'pronto', '');
insert into corre_leads (id, dono, nome, prox, st) values ('00000000-0000-0000-0000-0000000430d1', '00000000-0000-0000-0000-000000043001', 'Oficina', pg_temp.hj(), 'contatado');
insert into corre_vendas (id, dono, total, vence, st, cliente) values ('00000000-0000-0000-0000-0000000430e1', '00000000-0000-0000-0000-000000043001', 500, pg_temp.hj(), 'fechado', 'Bar');
-- a D abriu o Corre hoje; a E não tem nada no dia
insert into corre_ativo_dia (dono, dia) values ('00000000-0000-0000-0000-000000043004', pg_temp.hj()) on conflict do nothing;
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000043001');
do $$ begin perform corre_bomdia_hora('04:00'); raise exception 'passou'; exception when others then if sqlerrm = 'passou' then raise; end if; end $$;
insert into r430 select 'hora', corre_bomdia_hora('07:30');
select pg_temp.como('00000000-0000-0000-0000-000000043002');
insert into r430 select 'desliga', corre_push_ajusta('bomdia', false);
reset role;
select case when v->>'bomdia_hora' = '07:30' and (v->>'bomdia')::boolean and not (select (v->>'bomdia')::boolean from r430 where k = 'desliga')
            then 'ok: a hora do bom dia (só de 5h às 11h30) e o desligar' else format('FALHOU: a hora %s', v) end from r430 where k = 'hora';
select case when not exists (select 1 from corre_bomdia_fila(pg_temp.as_('07:20')) where dono = '00000000-0000-0000-0000-000000043001')
             and exists (select 1 from corre_bomdia_fila(pg_temp.as_('07:40')) where dono = '00000000-0000-0000-0000-000000043001')
             and not exists (select 1 from corre_bomdia_fila(pg_temp.as_('08:05')) where dono = '00000000-0000-0000-0000-000000043001')
             and not exists (select 1 from corre_bomdia_fila(pg_temp.as_('08:10')) where dono in ('00000000-0000-0000-0000-000000043002', '00000000-0000-0000-0000-000000043004'))
             and exists (select 1 from corre_bomdia_fila(pg_temp.as_('08:10')) where dono = '00000000-0000-0000-0000-000000043005')
            then 'ok: a fila: na hora escolhida (até 30 min depois), nunca pra quem desligou nem pra quem já abriu o Corre hoje' else 'FALHOU: a fila do bom dia' end;
insert into r430 select 'a1', corre_bomdia_alvos(pg_temp.as_('07:40'));
insert into r430 select 'a2', corre_bomdia_alvos(pg_temp.as_('07:41'));
insert into r430 select 'e', corre_bomdia_alvos(pg_temp.as_('08:05'));
select case when jsonb_array_length(v) = 1 and v->0->'payload'->>'titulo' = 'bZé do Pinhão/b que: bom dia!'
             and v->0->'payload'->>'corpo' like 'Hoje: 1 tarefa, o post da Padaria Sol às 18h30, 1 cliente pra retornar e 1 cobrança pra receber. Começa por: Mandar o orçamento.%'
             and v->0->'payload'->>'url' = '/#/caderninho' and jsonb_array_length(v->0->'subs') = 1
            then 'ok: o bom dia vem do bicho e diz o dia: as tarefas, o post, o cliente, a cobrança e por onde começar' else format('FALHOU: o aviso %s', v) end from r430 where k = 'a1';
select case when (select jsonb_array_length(v) from r430 where k = 'a2') = 0 and not (select v @> '[{"para": "00000000-0000-0000-0000-000000043005"}]' from r430 where k = 'e')
             and exists (select 1 from corre_push_log where chave = 'bomdia:00000000-0000-0000-0000-000000043005:' || pg_temp.hj())
             and not exists (select 1 from corre_bomdia_fila(pg_temp.as_('08:06')) where dono = '00000000-0000-0000-0000-000000043005')
            then 'ok: um por dia; quem não tem nada no dia não recebe (e não volta pra fila)' else 'FALHOU: repetiu ou mandou vazio' end;
select case when not has_function_privilege('authenticated', 'public.corre_bomdia_alvos(timestamptz)', 'execute') and not has_function_privilege('anon', 'public.corre_bomdia_hora(text)', 'execute')
             and has_function_privilege('service_role', 'public.corre_bomdia_tem(timestamptz)', 'execute')
            then 'ok: o bom dia só o servidor solta' else 'FALHOU: direitos do bom dia' end;
