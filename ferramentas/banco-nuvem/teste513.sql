\set ON_ERROR_STOP 1
-- v5.13: o app cria o link de aprovação e a Sala sem mandar o dono (vale o login).
create function pg_temp.como(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false), set_config('request.jwt.claim.role', 'authenticated', false) $$;
create function pg_temp.tenta(q text) returns text language plpgsql as $$
begin execute q; return 'passou'; exception when others then return coalesce(nullif(sqlerrm, ''), 'erro'); end $$;
create temp table r (k text primary key, v text);
grant all on r to authenticated, anon;

insert into corre_perfis (id, handle, nome) values ('00000000-0000-0000-0000-000000051301', 'agencia513', 'Agência 513'),
  ('00000000-0000-0000-0000-000000051302', 'outra513', 'Outra 513') on conflict do nothing;
insert into corre_portfolio (id, dono, marca, rede, cor) values ('00000000-0000-0000-0000-0000000513a1', '00000000-0000-0000-0000-000000051301', 'Padaria 513', 'padaria513', '#FF48B0'),
  ('00000000-0000-0000-0000-0000000513a2', '00000000-0000-0000-0000-000000051302', 'Alheia 513', 'alheia513', '#FFE800') on conflict do nothing;

select pg_temp.como('00000000-0000-0000-0000-000000051301'); set role authenticated;
-- do jeito que o aprova.js manda: sem o dono
insert into r select 'sala', pg_temp.tenta($$insert into corre_aprovacoes (marca_id, de, ate, sala, msg) values ('00000000-0000-0000-0000-0000000513a1', current_date, current_date, true, 'oi')$$);
insert into r select 'link', pg_temp.tenta($$insert into corre_aprovacoes (marca_id, de, ate, msg) values ('00000000-0000-0000-0000-0000000513a1', current_date, current_date + 30, '')$$);
insert into r select 'alheia', pg_temp.tenta($$insert into corre_aprovacoes (marca_id, de, ate) values ('00000000-0000-0000-0000-0000000513a2', current_date, current_date)$$);
reset role;

select case when (select v from r where k = 'sala') = 'passou' then 'ok: a sala abre sem mandar o dono' else 'FALHOU: a sala não abre: ' || (select v from r where k = 'sala') end;
select case when (select v from r where k = 'link') = 'passou' then 'ok: o link de período abre sem mandar o dono' else 'FALHOU: o link não abre: ' || (select v from r where k = 'link') end;
select case when (select count(*) from corre_aprovacoes where marca_id = '00000000-0000-0000-0000-0000000513a1' and dono = '00000000-0000-0000-0000-000000051301') = 2
  then 'ok: o dono é quem tá logado' else 'FALHOU: o dono não ficou o login' end;
select case when (select v from r where k = 'alheia') <> 'passou' then 'ok: marca de outra pessoa segue barrada' else 'FALHOU: abriu link na marca dos outros' end;
