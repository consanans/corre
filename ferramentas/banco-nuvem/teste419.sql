\set ON_ERROR_STOP 1
-- v4.19: o Caderninho. Três pessoas: a que usa (com aparelho), a que desligou o aviso do Caderninho e a que esconde o
-- texto. As tarefas com hora entram com a hora de agora (no horário de Brasília), então o teste não depende de quando roda.
create function pg_temp.como(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false), set_config('request.jwt.claim.role', 'authenticated', false) $$;
create function pg_temp.tenta(q text) returns text language plpgsql as $$
begin execute q; return 'passou'; exception when others then return coalesce(nullif(sqlerrm, ''), 'erro'); end $$;
-- o dia e a hora de Brasília daqui a n minutos
create function pg_temp.dia(n int) returns date language sql as $$ select ((now() + make_interval(mins => n)) at time zone 'America/Sao_Paulo')::date $$;
create function pg_temp.hr(n int) returns text language sql as $$ select to_char((now() + make_interval(mins => n)) at time zone 'America/Sao_Paulo', 'HH24:MI') $$;

insert into corre_perfis (id, handle, nome) values ('00000000-0000-0000-0000-000000041901', 'usa419', 'Usa'),
  ('00000000-0000-0000-0000-000000041902', 'desligou419', 'Desligou'), ('00000000-0000-0000-0000-000000041903', 'esconde419', 'Esconde');
insert into corre_push (endpoint, dono, p256dh, auth, visto_em)
  select 'https://web.push.apple.com/' || handle, id, 'p', 'a', now() from corre_perfis where handle in ('usa419', 'desligou419', 'esconde419');
insert into corre_push_pref (dono, caderno) values ('00000000-0000-0000-0000-000000041902', false);
insert into corre_push_pref (dono, texto) values ('00000000-0000-0000-0000-000000041903', false);

-- como a pessoa (pelo app)
select pg_temp.como('00000000-0000-0000-0000-000000041901'); set role authenticated;
insert into corre_caderno (titulo, nota, lista, dia, hora, prio) values ('  Mandar o orçamento da Padaria  ', 'O de 3 meses', 'Trabalho', pg_temp.dia(-1), pg_temp.hr(-1), 1);
insert into corre_caderno (titulo, dia, hora) values ('Ainda não', pg_temp.dia(60), pg_temp.hr(60));
insert into corre_caderno (titulo, dia, hora) values ('Velha', pg_temp.dia(-120), pg_temp.hr(-120));
insert into corre_caderno (titulo, dia, hora, feito) values ('Já fiz', pg_temp.dia(-1), pg_temp.hr(-1), true);
insert into corre_caderno (titulo, dia, hora, avisa) values ('Sem aviso', pg_temp.dia(-1), pg_temp.hr(-1), false);
insert into corre_caderno (titulo, dia) values ('Sem hora', pg_temp.dia(0));
insert into corre_caderno (titulo) values ('Algum dia');
insert into corre_caderno (titulo, pai) select 'Ligar pra confirmar', id from corre_caderno where titulo = 'Mandar o orçamento da Padaria';
insert into corre_caderno (titulo, pai) select 'Mandar o PDF', id from corre_caderno where titulo = 'Mandar o orçamento da Padaria';
select case when (select titulo from corre_caderno where nota = 'O de 3 meses') = 'Mandar o orçamento da Padaria'
   and (select quando from corre_caderno where nota = 'O de 3 meses') between now() - interval '2 minutes' and now()
   and (select quando from corre_caderno where titulo = 'Sem hora') is null
   and (select feito_em from corre_caderno where titulo = 'Já fiz') is not null
  then 'ok: o título é aparado, a hora do aviso sai do dia e da hora de Brasília, e o feito ganha a data' else 'FALHOU: gatilho' end;
select case when pg_temp.tenta($$insert into corre_caderno (titulo, hora) values ('Hora sem dia', '10:00')$$) like '%check%'
   and pg_temp.tenta($$insert into corre_caderno (titulo, dia, hora) values ('Hora torta', current_date, '25:00')$$) = 'hora'
   and pg_temp.tenta($$insert into corre_caderno (titulo) values ('   ')$$) like '%check%'
   and pg_temp.tenta($$insert into corre_caderno (titulo, repete) values ('Repete sem dia', 'dia')$$) = 'repetir sem dia'
   and pg_temp.tenta($$insert into corre_caderno (titulo, prio) values ('Prio 5', 5)$$) like '%check%'
  then 'ok: hora sem dia, hora torta, título vazio, repetir sem dia e prioridade fora recusados' else 'FALHOU: recusas' end;
select case when pg_temp.tenta($$insert into corre_caderno (titulo, pai) select 'Neta', id from corre_caderno where titulo = 'Ligar pra confirmar'$$) = 'subtarefa de subtarefa'
  then 'ok: subtarefa só tem um nível' else 'FALHOU: neta' end;
update corre_caderno set feito = false where titulo = 'Já fiz';
select case when (select feito_em from corre_caderno where titulo = 'Já fiz') is null then 'ok: desmarcar tira a data de feito' else 'FALHOU: desmarcar' end;
update corre_caderno set feito = true where titulo = 'Já fiz';

-- a outra pessoa não vê nem pendura subtarefa nas tarefas dela
select pg_temp.como('00000000-0000-0000-0000-000000041902');
insert into corre_caderno (titulo, dia, hora) values ('Desligou o aviso', pg_temp.dia(-1), pg_temp.hr(-1));
select case when (select count(*) from corre_caderno) = 1
   and pg_temp.tenta($$insert into corre_caderno (titulo, pai) values ('Intrusa', (select id from corre_caderno limit 0))$$) = 'passou'
  then 'ok: cada um só vê as tuas tarefas' else 'FALHOU: viu a dos outros' end;
reset role;
create temp table alheio as select id from corre_caderno where titulo = 'Mandar o orçamento da Padaria';
grant select on alheio to authenticated;
set role authenticated;
select case when pg_temp.tenta($$insert into corre_caderno (titulo, pai) select 'Intrusa', id from alheio$$) = 'pai'
   and pg_temp.tenta($$update corre_caderno set titulo = 'mexi' where id = (select id from alheio)$$) = 'passou'
  then 'ok: subtarefa na tarefa de outra pessoa é recusada (e mexer na dela não acha nada)' else 'FALHOU: pai alheio' end;
select pg_temp.como('00000000-0000-0000-0000-000000041903');
insert into corre_caderno (titulo, nota, lista, dia, hora) values ('Segredo', 'nota secreta', 'Casa', pg_temp.dia(0), pg_temp.hr(0));
-- quem é do app não chama a fila
select case when pg_temp.tenta('select corre_caderno_alvos(now())') like 'permission denied%'
   and pg_temp.tenta('select corre_caderno_tem(now())') like 'permission denied%'
   and pg_temp.tenta('select * from corre_caderno_fila(now())') like 'permission denied%'
  then 'ok: o app não chama a lista, a fila nem a conferência do Caderninho' else 'FALHOU: o app chamou' end;
select case when (corre_push_ajustes(null)->>'caderno')::boolean and (corre_push_ajustes(null)->>'postar')::boolean
   and (corre_push_ajusta('caderno', false)->>'caderno')::boolean = false and (corre_push_ajusta('caderno', true)->>'caderno')::boolean
  then 'ok: o aviso do Caderninho nasce ligado e dá pra desligar e ligar' else 'FALHOU: ajustes' end;
reset role;
select case when (select count(*) from corre_caderno where titulo = 'mexi') = 0 then 'ok: a tarefa dos outros ficou como tava' else 'FALHOU: mexeu' end;

-- a volta do relógio
select case when corre_caderno_tem(now()) then 'ok: tem tarefa na hora (o relógio chama a função)' else 'FALHOU: tem' end;
create temp table av as select corre_caderno_alvos(now()) v;
create temp view vv as select x->>'para' para, x->'payload' p from av, jsonb_array_elements(av.v) x;
select case when (select string_agg(p->>'titulo', '|') from vv where para = '00000000-0000-0000-0000-000000041901') = 'Mandar o orçamento da Padaria'
   and (select p->>'corpo' from vv where para = '00000000-0000-0000-0000-000000041901') = 'Caderninho · ' || pg_temp.hr(-1) || ' · Trabalho · 2 subtarefas. O de 3 meses. Prioridade 1.'
  then 'ok: avisa a tarefa que venceu (não a de daqui a 1 hora, a velha, a feita nem a sem aviso), com a lista, as subtarefas e a nota'
  else 'FALHOU: ' || coalesce((select string_agg(p::text, ' | ') from vv where para = '00000000-0000-0000-0000-000000041901'), 'nada') end;
select case when (select p->>'url' from vv where para = '00000000-0000-0000-0000-000000041901') = '/#/caderninho/t/' || (select id from corre_caderno where nota = 'O de 3 meses')
   and (select p->>'t' from vv where para = '00000000-0000-0000-0000-000000041901') = 'caderno'
  then 'ok: o aviso abre a tarefa no Caderninho' else 'FALHOU: url' end;
select case when not exists (select 1 from vv where para = '00000000-0000-0000-0000-000000041902')
   and (select p->>'titulo' || ' / ' || (p->>'corpo') from vv where para = '00000000-0000-0000-0000-000000041903') = 'Hora de uma tarefa / Caderninho · ' || pg_temp.hr(0) || '.'
  then 'ok: quem desligou não recebe; quem esconde o texto recebe sem o título, a lista e a nota' else 'FALHOU: desligou ou escondeu' end;
select case when not corre_caderno_tem(now()) and corre_caderno_alvos(now()) = '[]'::jsonb
  then 'ok: chamar de novo não manda nada (cada uma foi marcada antes de sair)' else 'FALHOU: repetiu' end;
-- a repetição andou (o app passa pro próximo dia): avisa de novo na hora nova
update corre_caderno set dia = pg_temp.dia(-1), hora = pg_temp.hr(-1), repete = 'dia' where titulo = 'Desligou o aviso';
update corre_caderno set dia = pg_temp.dia(5), hora = pg_temp.hr(5) where titulo = 'Mandar o orçamento da Padaria';
select case when not corre_caderno_tem(now() + interval '30 seconds') and corre_caderno_tem(now() + interval '6 minutes') then 'ok: mudou a hora, avisa de novo na hora nova' else 'FALHOU: hora nova' end;
-- a hora de postar segue igual (o relógio olha as duas)
select case when to_regprocedure('public.corre_postar_tem(timestamptz)') is not null then 'ok: a hora de postar segue no lugar' else 'FALHOU: postar' end;
