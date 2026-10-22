\set ON_ERROR_STOP 1
-- v4.25: os dias em que a tarefa que repete foi feita
create function pg_temp.tenta(q text) returns text language plpgsql as $$
begin execute q; return 'passou'; exception when others then return coalesce(nullif(sqlerrm, ''), 'erro'); end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000041901', false), set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
insert into corre_caderno (titulo, dia, repete) values ('Missão diária', current_date, 'dia');
update corre_caderno set dia = current_date + 1, feitas = array[current_date] where titulo = 'Missão diária';
select case when (select feitas from corre_caderno where titulo = 'Missão diária') = array[current_date]
   and (select not feito and dia = current_date + 1 from corre_caderno where titulo = 'Missão diária')
  then 'ok: a que repete pula pro próximo dia e guarda o dia em que foi feita' else 'FALHOU: guardar o dia' end;
select case when pg_temp.tenta($$update corre_caderno set feitas = (select array_agg(current_date - g) from generate_series(1, 401) g) where titulo = 'Missão diária'$$) like '%check%'
  then 'ok: mais de 400 dias é recusado' else 'FALHOU: 401' end;
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000041902', false);
set role authenticated;
select case when (select count(*) from corre_caderno where titulo = 'Missão diária') = 0
  then 'ok: outra pessoa não vê os dias de ninguém' else 'FALHOU: alheio' end;
reset role;
