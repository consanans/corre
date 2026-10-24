\set ON_ERROR_STOP 1
-- v4.36: o Hórus de segunda a sexta. No sábado e no domingo o bom dia não conta cliente pra retornar e o piloto não põe
-- "Retomar"; na segunda, os dois voltam (com o retorno que caiu no fim de semana junto). O resto segue igual.
-- Os dias são o próximo sábado e a segunda seguinte (o teste vale em qualquer dia da semana).
create function pg_temp.sab() returns date language sql as $$
  select (now() at time zone 'America/Sao_Paulo')::date + ((6 - extract(isodow from (now() at time zone 'America/Sao_Paulo')::date)::int + 7) % 7) $$;
create function pg_temp.em(d date, h text) returns timestamptz language sql as $$ select (d + h::time) at time zone 'America/Sao_Paulo' $$;
insert into corre_perfis (id) values ('00000000-0000-0000-0000-0000000436a1'), ('00000000-0000-0000-0000-0000000436a2'),
  ('00000000-0000-0000-0000-0000000436a3') on conflict do nothing;
create temp table r436 (k text primary key, v jsonb);

-- ---------- o piloto ----------
insert into corre_piloto (dono, ligado, receitas) values ('00000000-0000-0000-0000-0000000436a1', true, '{"esfria": {"on": true, "dias": 5}, "cobra": {"on": true}}');
insert into corre_leads (dono, nome, st, fonte, wa, hist, updated_at) values
  ('00000000-0000-0000-0000-0000000436a1', 'Bar do Sábado', 'link', 'manual', '43988881111', '[]'::jsonb, now() - interval '20 days');
insert into corre_vendas (dono, cliente, st, vence, total, whats) values
  ('00000000-0000-0000-0000-0000000436a1', 'Ana', 'fechado', pg_temp.sab() - 2, 300, '43977771111');
insert into r436 select 'p_sab', corre_piloto_de('00000000-0000-0000-0000-0000000436a1', pg_temp.em(pg_temp.sab(), '12:00'));
select case when not exists (select 1 from corre_caderno where dono = '00000000-0000-0000-0000-0000000436a1' and piloto = 'esfria')
             and (select count(*) from corre_caderno where dono = '00000000-0000-0000-0000-0000000436a1' and piloto = 'cobra') = 1
            then 'ok: no sábado o piloto não põe "Retomar" (a cobrança sai igual)' else format('FALHOU: o piloto no sábado %s', (select v from r436 where k = 'p_sab')) end;
insert into r436 select 'p_seg', corre_piloto_de('00000000-0000-0000-0000-0000000436a1', pg_temp.em(pg_temp.sab() + 2, '12:00'));
select case when (select titulo from corre_caderno where dono = '00000000-0000-0000-0000-0000000436a1' and piloto = 'esfria') like 'Retomar Bar do Sábado (proposta parada há % dias)'
            then 'ok: na segunda o piloto põe o "Retomar"' else format('FALHOU: o piloto na segunda %s', (select v from r436 where k = 'p_seg')) end;

-- ---------- o bom dia ----------
-- A2 só tem cliente do Hórus (um de sexta, um do sábado); A3 tem uma tarefa no sábado e um cliente de sexta
insert into corre_push (endpoint, dono, p256dh, auth, visto_em) values
  ('https://fcm.googleapis.com/bd436-a2', '00000000-0000-0000-0000-0000000436a2', 'p', 'a', now()),
  ('https://fcm.googleapis.com/bd436-a3', '00000000-0000-0000-0000-0000000436a3', 'p', 'a', now()) on conflict do nothing;
insert into corre_leads (dono, nome, st, fonte, wa, prox) values
  ('00000000-0000-0000-0000-0000000436a2', 'Padaria Sexta', 'contato', 'manual', '43911112222', pg_temp.sab() - 1),
  ('00000000-0000-0000-0000-0000000436a2', 'Ótica Sábado', 'interesse', 'manual', '43911113333', pg_temp.sab()),
  ('00000000-0000-0000-0000-0000000436a3', 'Bar Sexta', 'contato', 'manual', '43911114444', pg_temp.sab() - 1);
insert into corre_caderno (dono, titulo, dia) values ('00000000-0000-0000-0000-0000000436a3', 'Feira do sábado', pg_temp.sab());
insert into r436 select 'bd_sab', coalesce((select jsonb_agg(x) from jsonb_array_elements(corre_bomdia_alvos(pg_temp.em(pg_temp.sab(), '08:10'))) x
                                             where x->>'para' in ('00000000-0000-0000-0000-0000000436a2', '00000000-0000-0000-0000-0000000436a3')), '[]'::jsonb);
select case when not exists (select 1 from jsonb_array_elements((select v from r436 where k = 'bd_sab')) x where x->>'para' = '00000000-0000-0000-0000-0000000436a2')
            then 'ok: no sábado não tem bom dia só por causa de cliente do Hórus' else format('FALHOU: o bom dia do sábado %s', (select v from r436 where k = 'bd_sab')) end;
select case when (select x->'payload'->>'corpo' from jsonb_array_elements((select v from r436 where k = 'bd_sab')) x where x->>'para' = '00000000-0000-0000-0000-0000000436a3')
                 = 'Hoje: 1 tarefa. Começa por: Feira do sábado.'
            then 'ok: no sábado o bom dia conta a tarefa e não o cliente' else format('FALHOU: o bom dia do sábado com tarefa %s', (select v from r436 where k = 'bd_sab')) end;
insert into r436 select 'bd_seg', coalesce((select jsonb_agg(x) from jsonb_array_elements(corre_bomdia_alvos(pg_temp.em(pg_temp.sab() + 2, '08:10'))) x
                                             where x->>'para' = '00000000-0000-0000-0000-0000000436a2'), '[]'::jsonb);
select case when (select v->0->'payload'->>'corpo' from r436 where k = 'bd_seg') = 'Hoje: 2 clientes pra retornar.'
            then 'ok: na segunda o bom dia conta os clientes (o do sábado junto)' else format('FALHOU: o bom dia da segunda %s', (select v from r436 where k = 'bd_seg')) end;
