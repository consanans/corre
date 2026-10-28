\set ON_ERROR_STOP 1
-- v5.08: o Midas, o super avatar de ouro a R$ 129,99. Só em real (o correal não compra), a trava do avatar não deixa
-- vestir sem ter, o pedido nasce com R$ 129,99, e o pagamento de valor menor não libera.
create function pg_temp.como(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false), set_config('request.jwt.claim.role', 'authenticated', false) $$;
insert into corre_perfis (id) values ('00000000-0000-0000-0000-000000050801') on conflict do nothing;
delete from corre_skins where dono = '00000000-0000-0000-0000-000000050801';
delete from corre_skin_pedidos where dono = '00000000-0000-0000-0000-000000050801';
insert into corre_correal (dono, saldo, ganho) values ('00000000-0000-0000-0000-000000050801', 5, 5) on conflict (dono) do update set saldo = 5, ganho = 5, gasto = 0;
create temp table r508 (k text primary key, v jsonb);
grant all on r508 to authenticated, service_role;

select case when (select count(*) from corre_skins_loja()) = 47 and (select count(*) from corre_skins_reais()) = 21
             and corre_skin_real('midas') = 129.99 and corre_skin_preco('midas') = 1.00
             and corre_skin_real('noel') = 24.90 and corre_skin_preco('robo') = 1.00 and corre_skin_real('robo') is null
  then 'ok: a vitrine com 47 e 21 em real, o Midas a R$ 129,99 e o resto igual' else 'FALHOU: a conta da vitrine com o Midas' end;

set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000050801');
insert into r508 select 'c', corre_skin_compra('midas');
reset role;
select case when v->>'motivo' = 'real' and (v->>'real')::numeric = 129.99 and (v->>'saldo')::numeric = 5 then 'ok: o Midas não sai no correal e o saldo fica'
  else format('FALHOU: comprou o Midas com correal %s', v) end from r508 where k = 'c';

set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000050801');
update corre_perfis set verso = jsonb_build_object('skin', 'midas') where id = '00000000-0000-0000-0000-000000050801';
insert into r508 select 'v1', verso from corre_perfis where id = '00000000-0000-0000-0000-000000050801';
reset role;
select case when (select v->>'skin' from r508 where k = 'v1') = '' then 'ok: ninguém veste o Midas sem ter' else format('FALHOU: a trava do Midas %s', (select v from r508 where k = 'v1')) end;

set role service_role;
insert into r508 select 'p', corre_skin_pedido_novo('00000000-0000-0000-0000-000000050801', 'midas', 'cartao', 'pay_508', 'https://asaas.test/i/508', '2026-10-28');
insert into r508 select 'menos', corre_skin_paga('pay_508', 12.99);
reset role;
select case when (select valor from corre_skin_pedidos where dono = '00000000-0000-0000-0000-000000050801' and skin = 'midas') = 129.99
             and (select v->>'motivo' from r508 where k = 'menos') = 'valor'
             and not exists (select 1 from corre_skins where dono = '00000000-0000-0000-0000-000000050801' and skin = 'midas')
  then 'ok: o pedido nasce com R$ 129,99 e pagar menos não libera' else format('FALHOU: o pedido do Midas %s', (select v from r508 where k = 'menos')) end;

set role service_role;
insert into r508 select 'paga', corre_skin_paga('pay_508', 129.99);
reset role;
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000050801');
update corre_perfis set verso = jsonb_build_object('skin', 'midas') where id = '00000000-0000-0000-0000-000000050801';
insert into r508 select 'v2', verso from corre_perfis where id = '00000000-0000-0000-0000-000000050801';
reset role;
select case when (select (v->>'ok')::boolean from r508 where k = 'paga') and (select v->>'skin' from r508 where k = 'v2') = 'midas'
             and (select pago_real from corre_skins where dono = '00000000-0000-0000-0000-000000050801' and skin = 'midas') = 129.99
  then 'ok: pagou os R$ 129,99, o Midas é dele e veste' else format('FALHOU: o Midas pago %s', (select v from r508 where k = 'v2')) end;
