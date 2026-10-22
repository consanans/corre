\set ON_ERROR_STOP 1
-- v4.20: o "a cada N" do Caderninho
create function pg_temp.tenta(q text) returns text language plpgsql as $$
begin execute q; return 'passou'; exception when others then return coalesce(nullif(sqlerrm, ''), 'erro'); end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000041901', false), set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
insert into corre_caderno (titulo, dia, repete, cada) values ('Trocar o filtro', current_date, 'dia', 56), ('Dia útil', current_date, 'util', 5), ('Sem repetir', current_date, '', 3);
select case when (select cada from corre_caderno where titulo = 'Trocar o filtro') = 56 then 'ok: a cada 56 dias fica guardado' else 'FALHOU: 56' end;
select case when (select cada from corre_caderno where titulo = 'Dia útil') = 1 and (select cada from corre_caderno where titulo = 'Sem repetir') = 1
  then 'ok: dia útil e sem repetir voltam pra 1' else 'FALHOU: volta pra 1' end;
select case when pg_temp.tenta($$insert into corre_caderno (titulo, dia, repete, cada) values ('Mil', current_date, 'dia', 1000)$$) like '%check%'
  then 'ok: mais de 999 é recusado' else 'FALHOU: 1000' end;
reset role;
-- os avisos de antes: a tarefa daqui a 1 hora com "1h antes" avisa agora; a de amanhã com "1 dia antes" também
insert into corre_push (endpoint, dono, p256dh, auth, visto_em) values ('https://web.push.apple.com/antes420', '00000000-0000-0000-0000-000000041901', 'p', 'a', now()) on conflict do nothing;
set role authenticated;
insert into corre_caderno (titulo, dia, hora, antes) values
  ('Daqui a 1h', ((now() + interval '60 minutes') at time zone 'America/Sao_Paulo')::date, to_char((now() + interval '60 minutes') at time zone 'America/Sao_Paulo', 'HH24:MI'), '{60,1440}'),
  ('Amanhã', ((now() + interval '1440 minutes') at time zone 'America/Sao_Paulo')::date, to_char((now() + interval '1440 minutes') at time zone 'America/Sao_Paulo', 'HH24:MI'), '{1440}'),
  ('Sem antes', ((now() + interval '60 minutes') at time zone 'America/Sao_Paulo')::date, to_char((now() + interval '60 minutes') at time zone 'America/Sao_Paulo', 'HH24:MI'), '{}');
select case when pg_temp.tenta($$insert into corre_caderno (titulo, dia, hora, antes) values ('Torto', current_date, '10:00', '{61}')$$) like '%check%'
  then 'ok: "antes" fora da lista é recusado' else 'FALHOU: antes torto' end;
reset role;
create temp table av420 as select corre_caderno_alvos(now()) v;
select case when (select string_agg(x->'payload'->>'titulo' || ' / ' || (x->'payload'->>'corpo'), ' | ' order by x->'payload'->>'titulo') from av420, jsonb_array_elements(v) x)
             like 'Amanhã / Caderninho · amanhã às %. | Daqui a 1h / Caderninho · daqui a 1 hora (%).'
  then 'ok: avisa 1 hora antes e 1 dia antes, dizendo quando (e a sem antes ainda não)'
  else 'FALHOU: ' || coalesce((select string_agg(x->'payload'->>'titulo' || ' / ' || (x->'payload'->>'corpo'), ' | ') from av420, jsonb_array_elements(v) x), 'nada') end;
select case when corre_caderno_alvos(now()) = '[]'::jsonb then 'ok: o de antes não repete' else 'FALHOU: repetiu' end;
