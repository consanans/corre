\set ON_ERROR_STOP 1
-- v3.43: correal em centavos. Quem é quem:
--   ...c  a carteira semeada ANTES dos deltas (semente.sql): saldo 9, ganho 9, extrato 5, -2, 2 e 4 (este, de hoje)
--   ...a  ganhou 12 no teste340 (antes da v3.43)
--   ...d  faz tarefa no Correverso          ...e  gasta com a IA
insert into corre_perfis values ('00000000-0000-0000-0000-00000000000d'), ('00000000-0000-0000-0000-00000000000e');

-- 1) A CONVERSÃO: o delta rodou 2 vezes e dividiu por 10 uma vez só
select case when saldo = 0.90 and ganho = 0.90 and gasto = 0 then 'ok: carteira de 9 virou 0,90 (ganho 0,90, gasto 0) depois das 2 rodadas'
  else format('FALHOU: carteira semeada ficou saldo %s, ganho %s, gasto %s', saldo, ganho, gasto) end
  from corre_correal where dono = '00000000-0000-0000-0000-00000000000c';
select case when saldo = 1.20 then 'ok: a carteira de 12 do teste340 virou 1,20' else format('FALHOU: carteira de 12 ficou %s', saldo) end
  from corre_correal where dono = '00000000-0000-0000-0000-00000000000a';
select case when array_agg(valor order by id) = array[0.50, -0.20, 0.20, 0.40]::numeric[] and sum(valor) = 0.90
  then 'ok: extrato dividido por 10 (0,50 · -0,20 · 0,20 · 0,40), soma bate com o saldo'
  else format('FALHOU: extrato ficou %s', array_agg(valor order by id)) end
  from corre_correal_log where dono = '00000000-0000-0000-0000-00000000000c';
select case when count(*) = 4 and bool_and(t = 'numeric(12,2)') then 'ok: saldo, ganho, gasto e valor são numeric(12,2)'
  else format('FALHOU: tipos %s', string_agg(c || '=' || t, ', ')) end
  from (select attrelid::regclass || '.' || attname as c, format_type(atttypid, atttypmod) as t from pg_attribute
         where (attrelid = 'corre_correal'::regclass and attname in ('saldo', 'ganho', 'gasto'))
            or (attrelid = 'corre_correal_log'::regclass and attname = 'valor')) x;
-- default e check continuam valendo
select case when count(*) = 3 and bool_and(pg_get_expr(d.adbin, d.adrelid) ~ '^0') then 'ok: default 0 continua em saldo, ganho e gasto'
  else 'FALHOU: default sumiu' end
  from pg_attrdef d join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
 where d.adrelid = 'corre_correal'::regclass and a.attname in ('saldo', 'ganho', 'gasto');
do $$ begin
  update corre_correal set saldo = -0.01 where dono = '00000000-0000-0000-0000-00000000000c';
  raise exception 'FALHOU: saldo negativo passou';
exception when check_violation then raise notice 'ok: o check do saldo segue valendo (não fica negativo)'; end $$;
do $$ begin
  insert into corre_correal_log (dono, valor, motivo) values ('00000000-0000-0000-0000-00000000000c', 0, repeat('x', 61));
  raise exception 'FALHOU: motivo longo passou';
exception when check_violation then raise notice 'ok: o check do motivo do extrato segue valendo'; end $$;

-- 2) OS PREÇOS NOVOS, o ponto e o teto (tudo no banco)
select case when pg_get_function_result('corre_correal_preco(text)'::regprocedure) = 'numeric'
  and pg_get_function_result('corre_correal_hoje(uuid)'::regprocedure) = 'numeric'
  then 'ok: corre_correal_preco e corre_correal_hoje devolvem numeric' else 'FALHOU: tipo de retorno' end;
select case when corre_correal_preco('imagem') = 1.00 and corre_correal_preco('marca') = 0.30 and corre_correal_preco('legenda') = 0.20
  and corre_correal_preco('abordagem') = 0.20 and corre_correal_preco('voo') = 0.50 and corre_correal_preco('foguete') is null
  then 'ok: preços novos (imagem 1,00 · marca 0,30 · legenda 0,20 · abordagem 0,20 · voo 0,50; tipo desconhecido sem preço)'
  else 'FALHOU: preços' end;
select case when greatest(corre_correal_preco('imagem'), corre_correal_preco('marca'), corre_correal_preco('legenda'),
  corre_correal_preco('abordagem'), corre_correal_preco('voo')) <= 1 then 'ok: nenhum preço passa de 1' else 'FALHOU: preço acima de 1' end;
select case when corre_correal_teto() = 1.00 and corre_correal_ponto() = 0.03 then 'ok: teto 1,00 por dia e 0,03 por ponto'
  else 'FALHOU: teto/ponto' end;
select case when corre_correal_hoje('00000000-0000-0000-0000-00000000000c') = 0.40 then 'ok: a tarefa de hoje (4 antes) conta 0,40 no dia'
  else format('FALHOU: hoje da carteira semeada = %s', corre_correal_hoje('00000000-0000-0000-0000-00000000000c')) end;

-- 3) A CARTEIRA pelo app (logado como ...c): 0,90 e não 1 (num int, arredondava)
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select case when (w->>'saldo')::numeric = 0.90 and (w->>'hoje')::numeric = 0.40 and (w->>'teto')::numeric = 1 and (w->>'ponto')::numeric = 0.03
  and (w->'precos'->>'imagem')::numeric = 1 and (w->'precos'->>'voo')::numeric = 0.5 and (w->'precos'->>'legenda')::numeric = 0.2
  and (w->'precos'->>'abordagem')::numeric = 0.2 and (w->'precos'->>'marca')::numeric = 0.3
  and (select array_agg(k order by k) from jsonb_object_keys(w) k) = array['hoje', 'ponto', 'precos', 'saldo', 'teto']
  then 'ok: meu() mostra 0,90, hoje 0,40, teto 1, ponto 0,03 e os preços (mesmas chaves + ponto)' else format('FALHOU: meu() = %s', w) end
  from (select corre_correal_meu() as w) x;
select case when count(*) = 1 and min(saldo) = 0.90 then 'ok: logado, só vê a própria carteira' else 'FALHOU: RLS da carteira' end from corre_correal;
do $$ begin
  update corre_correal set saldo = 100 where dono = '00000000-0000-0000-0000-00000000000c';
  raise exception 'FALHOU: o app mexeu no saldo direto';
exception when insufficient_privilege then raise notice 'ok: o app não mexe no saldo direto (só lê)'; end $$;
reset role;
reset request.jwt.claim.sub;

-- 4) A TAREFA: 5 pontos pagam 0,15 (o banco confere o tempo: aqui a tarefa "começou" 30 s atrás)
do $$ declare vez uuid; r jsonb; begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000d', true);
  vez := corre_tarefa_comeca('policial', 'ladrao');
  r := corre_tarefa_termina(vez);
  if r->>'motivo' = 'rapido' and (r->>'ok')::boolean = false then raise notice 'ok: terminou rápido demais, não paga (motivo rapido)';
  else raise exception 'FALHOU: rápido demais pagou: %', r; end if;
  vez := corre_tarefa_comeca('policial', 'ladrao');
  update corre_tarefa_vez set comecou = now() - interval '30 seconds' where id = vez;
  r := corre_tarefa_termina(vez);
  if (r->>'ok')::boolean and (r->>'ganhou')::numeric = 0.15 and (r->>'valia')::numeric = 0.15 and (r->>'pontos')::int = 5
     and (r->>'saldo')::numeric = 0.15 and (r->>'hoje')::numeric = 0.15 and (r->>'teto')::numeric = 1
  then raise notice 'ok: tarefa de 5 pontos paga 0,15 (ganhou, valia, pontos, saldo, hoje e teto certos)';
  else raise exception 'FALHOU: tarefa de 5 pontos: %', r; end if;
  vez := corre_tarefa_comeca('policial', 'transito');
  update corre_tarefa_vez set comecou = now() - interval '30 seconds' where id = vez;
  r := corre_tarefa_termina(vez);
  if (r->>'ganhou')::numeric = 0.06 and (r->>'saldo')::numeric = 0.21 and (r->>'hoje')::numeric = 0.21
  then raise notice 'ok: tarefa de 2 pontos paga 0,06 (saldo 0,21)'; else raise exception 'FALHOU: tarefa de 2 pontos: %', r; end if;
end $$;
-- o corte no teto: com 0,95 hoje, a de 5 pontos paga só 0,05; com 1,00, paga 0
insert into corre_correal_log (dono, valor, motivo) values ('00000000-0000-0000-0000-00000000000d', 0.74, 'tarefa:teste:enche');
do $$ declare vez uuid; r jsonb; begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000d', true);
  if corre_correal_hoje('00000000-0000-0000-0000-00000000000d') <> 0.95 then raise exception 'FALHOU: preparo do teto'; end if;
  vez := corre_tarefa_comeca('bombeiro', 'fogo');
  update corre_tarefa_vez set comecou = now() - interval '30 seconds' where id = vez;
  r := corre_tarefa_termina(vez);
  if (r->>'ganhou')::numeric = 0.05 and (r->>'valia')::numeric = 0.15 and (r->>'hoje')::numeric = 1 and (r->>'saldo')::numeric = 0.26
  then raise notice 'ok: com 0,95 hoje, a de 5 pontos paga só 0,05 (fecha o dia em 1,00)'; else raise exception 'FALHOU: corte no teto: %', r; end if;
  vez := corre_tarefa_comeca('medico', 'socorro');
  update corre_tarefa_vez set comecou = now() - interval '30 seconds' where id = vez;
  r := corre_tarefa_termina(vez);
  if (r->>'ok')::boolean and (r->>'ganhou')::numeric = 0 and (r->>'hoje')::numeric = 1 and (r->>'saldo')::numeric = 0.26
  then raise notice 'ok: com 1,00 hoje, a tarefa paga 0 e o saldo não muda'; else raise exception 'FALHOU: passou do teto: %', r; end if;
end $$;
select case when count(*) = 4 and sum(valor) = 0.95 + 0.05 then 'ok: o extrato da tarefa fecha o dia em 1,00 (nenhuma linha de 0)'
  else format('FALHOU: extrato da tarefa %s linhas, soma %s', count(*), sum(valor)) end
  from corre_correal_log where dono = '00000000-0000-0000-0000-00000000000d';

-- 5) GASTAR E DEVOLVER: imagem (1,00) com 0,90 não passa; com 1,20 deixa 0,20
insert into corre_correal (dono, saldo, ganho) values ('00000000-0000-0000-0000-00000000000e', 0.90, 0.90);
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
select case when not (g->>'ok')::boolean and (g->>'saldo')::numeric = 0.90 and (g->>'preco')::numeric = 1
  then 'ok: imagem com 0,90 na carteira: recusa (saldo fica 0,90)' else format('FALHOU: gastou sem ter: %s', g) end
  from (select corre_correal_gasta('imagem') as g) x;
reset role;
select case when saldo = 0.90 and gasto = 0 and (select count(*) from corre_correal_log where dono = c.dono) = 0
  then 'ok: a recusa não mexeu na carteira nem no extrato' else 'FALHOU: a recusa mexeu' end
  from corre_correal c where dono = '00000000-0000-0000-0000-00000000000e';
update corre_correal set saldo = 1.20, ganho = 1.20 where dono = '00000000-0000-0000-0000-00000000000e';
set role authenticated;
select case when (g->>'ok')::boolean and (g->>'saldo')::numeric = 0.20 and (g->>'preco')::numeric = 1
  then 'ok: imagem com 1,20 na carteira: paga 1,00 e deixa 0,20' else format('FALHOU: gasta imagem: %s', g) end
  from (select corre_correal_gasta('imagem') as g) x;
-- tipo que o banco não conhece: não mexe em nada
select case when not (g->>'ok')::boolean and g->>'preco' is null then 'ok: gasta com tipo desconhecido diz não (sem preço)'
  else format('FALHOU: gasta tipo desconhecido: %s', g) end
  from (select corre_correal_gasta('foguete') as g) x;
do $$ begin perform corre_correal_devolve('00000000-0000-0000-0000-00000000000e', 'imagem'); raise exception 'FALHOU: o app devolveu correal';
exception when insufficient_privilege then raise notice 'ok: o app não chama a devolução'; end $$;
reset role;
select case when saldo = 0.20 and gasto = 1.00
  and (select array_agg(valor || ' ' || motivo order by id) from corre_correal_log where dono = c.dono) = array['-1.00 gasto:imagem']
  then 'ok: depois do gasto e do tipo desconhecido: saldo 0,20, gasto 1,00 e uma linha só no extrato (-1,00)'
  else format('FALHOU: carteira depois do gasto: saldo %s, gasto %s', saldo, gasto) end
  from corre_correal c where dono = '00000000-0000-0000-0000-00000000000e';
-- a devolução é da chave de serviço, e uma vez só
set role service_role;
select case when (d->>'ok')::boolean and (d->>'saldo')::numeric = 1.20 then 'ok: devolve volta 1,00 (saldo 1,20)'
  else format('FALHOU: devolve: %s', d) end from (select corre_correal_devolve('00000000-0000-0000-0000-00000000000e', 'imagem') as d) x;
select case when not (d->>'ok')::boolean then 'ok: devolver de novo não volta nada' else format('FALHOU: devolveu 2 vezes: %s', d) end
  from (select corre_correal_devolve('00000000-0000-0000-0000-00000000000e', 'imagem') as d) x;
reset role;
select case when saldo = 1.20 and gasto = 0 then 'ok: depois da devolução: saldo 1,20 e gasto 0' else format('FALHOU: saldo %s gasto %s', saldo, gasto) end
  from corre_correal where dono = '00000000-0000-0000-0000-00000000000e';
-- preço com centavos de verdade (0,20): num int, a legenda sairia de graça
set role authenticated;
select case when (g->>'ok')::boolean and (g->>'saldo')::numeric = 1.00 and (g->>'preco')::numeric = 0.20
  then 'ok: legenda paga 0,20 (1,20 vira 1,00)' else format('FALHOU: gasta legenda: %s', g) end
  from (select corre_correal_gasta('legenda') as g) x;
reset role;
set role service_role;
select case when (d->>'ok')::boolean and (d->>'saldo')::numeric = 1.20 then 'ok: devolve a legenda: volta 0,20 (saldo 1,20)'
  else format('FALHOU: devolve legenda: %s', d) end from (select corre_correal_devolve('00000000-0000-0000-0000-00000000000e', 'legenda') as d) x;
reset role;

-- 6) QUEM EXECUTA O QUÊ: igual à foto da produção
select case when bool_and(pode = deve) then 'ok: grants das funções do correal iguais aos de antes (e ponto/teto abertos como o preço)'
  else 'FALHOU: grants ' || string_agg(case when pode <> deve then format('%s/%s=%s', f, r, pode) end, ', ') end
  from (select f, r, has_function_privilege(r, f, 'execute') as pode,
               case when f in ('corre_correal_preco(text)', 'corre_correal_ponto()', 'corre_correal_teto()', 'corre_tarefa_valor(text, text)') then true
                    when f in ('corre_correal_meu()', 'corre_correal_gasta(text)', 'corre_tarefa_termina(uuid)', 'corre_tarefa_comeca(text, text)') then r = 'authenticated'
                    when f = 'corre_correal_devolve(uuid, text)' then r = 'service_role'
                    else false end as deve
          from unnest(array['corre_correal_preco(text)', 'corre_correal_ponto()', 'corre_correal_teto()', 'corre_tarefa_valor(text, text)',
                            'corre_correal_meu()', 'corre_correal_gasta(text)', 'corre_tarefa_termina(uuid)', 'corre_tarefa_comeca(text, text)',
                            'corre_correal_devolve(uuid, text)', 'corre_correal_hoje(uuid)']) f,
               unnest(array['public', 'anon', 'authenticated', 'service_role']) r) x;
set role authenticated;
do $$ begin perform corre_correal_hoje('00000000-0000-0000-0000-00000000000c'); raise exception 'FALHOU: authenticated executou corre_correal_hoje';
exception when insufficient_privilege then raise notice 'ok: authenticated não executa corre_correal_hoje'; end $$;
reset role;
set role anon;
do $$ begin perform corre_correal_meu(); raise exception 'FALHOU: sem login leu a carteira';
exception when insufficient_privilege then raise notice 'ok: sem login não chama corre_correal_meu'; end $$;
reset role;
select case when has_table_privilege('authenticated', 'corre_correal', 'select') and not has_table_privilege('authenticated', 'corre_correal', 'update')
  and has_table_privilege('authenticated', 'corre_correal_log', 'select') and not has_table_privilege('authenticated', 'corre_correal_log', 'insert')
  and not has_table_privilege('service_role', 'corre_correal', 'update') and not has_table_privilege('anon', 'corre_correal', 'select')
  and (select bool_and(relrowsecurity) from pg_class where oid in ('corre_correal'::regclass, 'corre_correal_log'::regclass))
  and (select count(*) from pg_policies where tablename in ('corre_correal', 'corre_correal_log')) = 2
  then 'ok: grants de tabela e RLS da carteira e do extrato iguais aos de antes' else 'FALHOU: grants/RLS de tabela' end;

-- 7) A TRAVA DO EXTRATO: linha nova não passa de 1 (pra mais ou pra menos) nem é zero. É o que a função velha (em int)
-- gravaria se ainda estivesse rodando quando o delta confirmou: tarefa 5, devolução 10, gasto -10 e -2, e o zero da
-- legenda nova (0,20) lida como inteiro. A virada de verdade, com a chamada no meio do delta, está no virada343.sh.
select case when not convalidated and contype = 'c'
  then 'ok: a trava do extrato existe (NOT VALID: vale pras linhas novas; o que ela recusa vem logo abaixo)'
  else format('FALHOU: trava do extrato = %s', pg_get_constraintdef(oid)) end
  from pg_constraint where conrelid = 'corre_correal_log'::regclass and conname = 'corre_correal_log_valor_check';
do $$ declare v numeric; n int := 0; begin
  foreach v in array array[5, 10, -10, -2, 0, 1.01, -1.01] loop
    begin
      insert into corre_correal_log (dono, valor, motivo) values ('00000000-0000-0000-0000-00000000000c', v, 'tarefa:trava');
      raise exception 'FALHOU: o extrato aceitou %', v;
    exception when check_violation then n := n + 1; end;
  end loop;
  -- e o que é certo passa: o preço mais alto (1,00), a devolução dele e a tarefa mais cara (0,15); desfeito no fim
  begin
    insert into corre_correal_log (dono, valor, motivo) values ('00000000-0000-0000-0000-00000000000c', -1.00, 'gasto:imagem'),
      ('00000000-0000-0000-0000-00000000000c', 1.00, 'volta:imagem'), ('00000000-0000-0000-0000-00000000000c', 0.15, 'tarefa:trava');
    raise exception using errcode = 'P0001', message = 'desfaz';
  exception when sqlstate 'P0001' then null; end;
  if n = 7 then raise notice 'ok: a trava recusa 5, 10, -10, -2, 0, 1,01 e -1,01, e deixa passar -1,00, 1,00 e 0,15';
  else raise exception 'FALHOU: a trava recusou % de 7', n; end if;
end $$;
