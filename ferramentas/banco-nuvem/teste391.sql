\set ON_ERROR_STOP 1
-- v3.91: a coleção de Halloween. h1 tem 1,30 de correal; compra o Fantasma de Lençol (0,30) e a Cabeça de Abóbora (1,00)
create function pg_temp.como(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false), set_config('request.jwt.claim.role', 'authenticated', false) $$;
insert into corre_perfis (id, handle, nome, verso) values ('00000000-0000-0000-0000-0000000000e1', 'teste391', 'Halloween', '{"pele":1}') on conflict do nothing;
insert into corre_correal (dono, saldo, ganho, gasto) values ('00000000-0000-0000-0000-0000000000e1', 1.30, 1.30, 0) on conflict (dono) do update set saldo = 1.30;

select case when (select count(*) from corre_skins_loja()) = 26 and corre_skin_preco('mortovivo') = 0.30 and corre_skin_preco('esqueleto') = 0.60 and corre_skin_preco('gatopreto') = 0.30
  then 'ok: a vitrine tem 26, com as 8 de Halloween e os preços' else 'FALHOU: vitrine de Halloween' end;
select case when corre_skin_preco('mc') = 0.60 and corre_skin_preco('rockeiro') = 0.30 and corre_skin_preco('galaxia') = 1.00
  then 'ok: as 18 de antes seguem com o mesmo preço' else 'FALHOU: mexeu no preço das de antes' end;

set role authenticated; select pg_temp.como('00000000-0000-0000-0000-0000000000e1');
create temp table h1 as select corre_skin_compra('lencol') as r;
create temp table h2 as select corre_skin_compra('abobora') as r;
create temp table h3 as select corre_skin_compra('saci') as r;
select case when (select (r->>'ok')::boolean and (r->>'saldo')::numeric = 1.00 from h1) and (select (r->>'ok')::boolean and (r->>'saldo')::numeric = 0 from h2)
  then 'ok: comprou o Lençol (0,30) e a Abóbora (1,00) com 1,30' else 'FALHOU: compra de Halloween: ' || (select r::text from h1) || ' ' || (select r::text from h2) end;
select case when (select not (r->>'ok')::boolean and (r->>'preco')::numeric = 1.00 from h3)
  then 'ok: o Saci (1,00) com saldo zerado não passou' else 'FALHOU: saldo curto no Saci: ' || (select r::text from h3) end;
create temp table h4 as select corre_skins_minhas() as r;
select case when (select r->'minhas' = '["lencol", "abobora"]'::jsonb and (r->'precos'->>'saci')::numeric = 1.00 and (r->'precos'->>'gatopreto')::numeric = 0.30 from h4)
  then 'ok: o app lê as de Halloween compradas e os preços' else 'FALHOU: corre_skins_minhas: ' || (select r::text from h4) end;
reset role;

-- a trava do avatar vale pras novas
select pg_temp.como('00000000-0000-0000-0000-0000000000e1');
update corre_perfis set verso = '{"pele":1,"skin":"abobora"}' where id = '00000000-0000-0000-0000-0000000000e1';
select case when (select verso->>'skin' from corre_perfis where id = '00000000-0000-0000-0000-0000000000e1') = 'abobora' then 'ok: veste a Abóbora que comprou' else 'FALHOU: tirou a Abóbora comprada' end;
update corre_perfis set verso = '{"pele":1,"skin":"saci"}' where id = '00000000-0000-0000-0000-0000000000e1';
select case when (select verso->>'skin' from corre_perfis where id = '00000000-0000-0000-0000-0000000000e1') = '' then 'ok: o Saci sem comprar sai do avatar' else 'FALHOU: vestiu o Saci sem comprar' end;
select set_config('request.jwt.claim.role', '', false), set_config('request.jwt.claim.sub', '', false);
select case when (select array_agg(valor || ' ' || motivo order by valor) from corre_correal_log where dono = '00000000-0000-0000-0000-0000000000e1') = array['-1.00 skin:abobora', '-0.30 skin:lencol']
  then 'ok: o extrato tem skin:abobora e skin:lencol' else 'FALHOU: extrato de Halloween' end;
