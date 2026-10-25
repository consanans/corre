\set ON_ERROR_STOP 1
-- v4.39: o carrossel até 20. De 11 a 20 fica sem conta do Instagram (a API da Meta vai até 10) e vira lembrete: a hora
-- de postar enxerga ele como "postar à mão". Até 10, a conta escolhida fica. 21 não entra.
create function pg_temp.como(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false), set_config('request.jwt.claim.role', 'authenticated', false) $$;
create function pg_temp.tenta(q text) returns text language plpgsql as $$
begin execute q; return 'passou'; exception when others then return coalesce(nullif(sqlerrm, ''), 'erro'); end $$;
create function pg_temp.slides(n int, tag text) returns jsonb language sql as $$
  select jsonb_agg(jsonb_build_object('u', 'https://x/' || tag || '-' || i || '.jpg', 't', 'img')) from generate_series(1, n) i $$;
create temp table r (k text primary key, v text);
grant all on r to authenticated, anon;
grant execute on function pg_temp.slides(int, text) to authenticated;

insert into corre_perfis (id, handle, nome) values ('00000000-0000-0000-0000-000000043901', 'agencia439', 'Agência') on conflict do nothing;
insert into corre_portfolio (id, dono, marca, rede, cor) values ('00000000-0000-0000-0000-0000000439a1', '00000000-0000-0000-0000-000000043901', 'Padaria Sol', 'padariasol', '#FFE800');
insert into corre_ig_contas (id, dono, ig_id, username) values ('00000000-0000-0000-0000-0000000439c1', '00000000-0000-0000-0000-000000043901', '439', 'padariasol');
insert into corre_push (endpoint, dono, p256dh, auth, visto_em) values ('https://web.push.apple.com/agencia439', '00000000-0000-0000-0000-000000043901', 'p', 'a', now()) on conflict do nothing;

select pg_temp.como('00000000-0000-0000-0000-000000043901'); set role authenticated;
-- daqui a 5 minutos no passado (Brasília): a hora de postar já venceu
insert into r select 'c15', pg_temp.tenta(format($q$insert into corre_posts (dono, marca_id, formato, data, hora, midia_url, ig_status, status, ig_conta, midias)
  values ('00000000-0000-0000-0000-000000043901', '00000000-0000-0000-0000-0000000439a1', 'carrossel', %L, %L, 'https://x/c15-1.jpg', 'agendado', 'pronto', '00000000-0000-0000-0000-0000000439c1', pg_temp.slides(15, 'c15'))$q$,
  ((now() - interval '5 minutes') at time zone 'America/Sao_Paulo')::date, to_char((now() - interval '5 minutes') at time zone 'America/Sao_Paulo', 'HH24:MI')));
insert into r select 'c21', pg_temp.tenta($q$insert into corre_posts (dono, marca_id, formato, midia_url, midias) values ('00000000-0000-0000-0000-000000043901', '00000000-0000-0000-0000-0000000439a1', 'carrossel', 'https://x/c21-1.jpg', pg_temp.slides(21, 'c21'))$q$);
insert into r select 'c10', pg_temp.tenta($q$insert into corre_posts (dono, marca_id, formato, data, hora, midia_url, ig_status, status, ig_conta, midias)
  values ('00000000-0000-0000-0000-000000043901', '00000000-0000-0000-0000-0000000439a1', 'carrossel', current_date + 3, '10:00', 'https://x/c10-1.jpg', 'agendado', 'pronto', '00000000-0000-0000-0000-0000000439c1', pg_temp.slides(10, 'c10'))$q$);
insert into r select 'c3', pg_temp.tenta($q$insert into corre_posts (dono, marca_id, formato, data, hora, midia_url, ig_status, status, ig_conta, midias)
  values ('00000000-0000-0000-0000-000000043901', '00000000-0000-0000-0000-0000000439a1', 'carrossel', current_date + 4, '10:00', 'https://x/c3-1.jpg', 'agendado', 'pronto', '00000000-0000-0000-0000-0000000439c1', pg_temp.slides(3, 'c3'))$q$);
insert into r select 'c3up', pg_temp.tenta($q$update corre_posts set midias = pg_temp.slides(12, 'c3') where midia_url = 'https://x/c3-1.jpg'$q$);
reset role;

select case when (select v from r where k = 'c15') = 'passou' and (select ig_conta from corre_posts where midia_url = 'https://x/c15-1.jpg') is null
              and (select jsonb_array_length(midias) from corre_posts where midia_url = 'https://x/c15-1.jpg') = 15
            then 'ok: carrossel de 15 entra programado e fica sem conta (vira lembrete)' else format('FALHOU: carrossel de 15 (%s)', (select v from r where k = 'c15')) end;
select case when (select v from r where k = 'c21') like '%corre_posts_midias_check%' then 'ok: carrossel de 21 não entra' else format('FALHOU: carrossel de 21 (%s)', (select v from r where k = 'c21')) end;
select case when (select v from r where k = 'c10') = 'passou' and (select ig_conta from corre_posts where midia_url = 'https://x/c10-1.jpg') = '00000000-0000-0000-0000-0000000439c1'
            then 'ok: carrossel de 10 segue com a conta (sai sozinho)' else format('FALHOU: carrossel de 10 (%s)', (select v from r where k = 'c10')) end;
select case when (select v from r where k = 'c3up') = 'passou' and (select ig_conta from corre_posts where midia_url = 'https://x/c3-1.jpg') is null
            then 'ok: o de 3 que vira 12 perde a conta' else format('FALHOU: de 3 pra 12 (%s)', (select v from r where k = 'c3up')) end;
select case when exists (select 1 from corre_postar_fila(now()) f join corre_posts p on p.id = f.id where p.midia_url = 'https://x/c15-1.jpg' and f.tipo = 'mao')
            then 'ok: na hora, o de 15 entra no aviso de postar à mão' else 'FALHOU: a hora de postar não viu o de 15' end;
