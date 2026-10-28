\set ON_ERROR_STOP 1
-- v5.05: o Ateliê com 46 skins. As 8 fantasias novas saem no correal; as 12 de Natal são só em real (todas acima de
-- R$ 10), o correal não compra, a trava do avatar não deixa vestir sem ter, e o pedido em real nasce com o preço daqui.
create function pg_temp.como(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false), set_config('request.jwt.claim.role', 'authenticated', false) $$;
insert into corre_perfis (id) values ('00000000-0000-0000-0000-000000050501') on conflict do nothing;
delete from corre_skins where dono = '00000000-0000-0000-0000-000000050501';
delete from corre_skin_pedidos where dono = '00000000-0000-0000-0000-000000050501';
insert into corre_correal (dono, saldo, ganho) values ('00000000-0000-0000-0000-000000050501', 5, 5) on conflict (dono) do update set saldo = 5, ganho = 5, gasto = 0;
create temp table r505 (k text primary key, v jsonb);
grant all on r505 to authenticated, service_role;

select case when (select count(*) from corre_skins_loja()) = 46 and (select count(*) from corre_skins_reais()) = 20
             and corre_skin_preco('robo') = 1.00 and corre_skin_preco('sereia') = 1.00 and corre_skin_preco('dino') = 0.60 and corre_skin_preco('abelha') = 0.30
             and corre_skin_real('robo') is null and corre_skin_real('farao') is null
  then 'ok: a vitrine com 46 (8 fantasias novas no correal) e 20 em real' else 'FALHOU: a conta da vitrine' end;
select case when corre_skin_real('noel') = 24.90 and corre_skin_real('arvore') = 24.90 and corre_skin_real('boneconeve') = 19.90 and corre_skin_real('rena') = 14.90
             and corre_skin_real('presente') = 12.90 and corre_skin_real('abobora') = 14.90 and corre_skin_real('lencol') = 5.90
             and (select min(reais) from corre_skins_reais() where skin in ('noel', 'arvore', 'noelverao', 'mamaenoel', 'boneconeve', 'quebranozes', 'piscapisca', 'rena', 'duende', 'reimago', 'biscoito', 'presente')) > 10
  then 'ok: as 12 de Natal em real, todas acima de R$ 10, e o Halloween igual' else 'FALHOU: os preços de Natal' end;

set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000050501');
insert into r505 select 'robo', corre_skin_compra('robo');
insert into r505 select 'noel', corre_skin_compra('noel');
reset role;
select case when (v->>'ok')::boolean and (v->>'saldo')::numeric = 4 then 'ok: o Robô Lata sai por 1,00 de correal' else format('FALHOU: o Robô %s', v) end from r505 where k = 'robo';
select case when v->>'motivo' = 'real' and (v->>'real')::numeric = 24.90 and (v->>'saldo')::numeric = 4 then 'ok: o Papai Noel não sai no correal (é só em real) e o saldo fica'
  else format('FALHOU: comprou o Noel com correal %s', v) end from r505 where k = 'noel';

-- a trava do avatar: o Noel sem ter vira ''; o Robô, comprado, fica
update corre_perfis set verso = jsonb_build_object('skin', 'noel') where id = '00000000-0000-0000-0000-000000050501';
insert into r505 select 'v1', verso from corre_perfis where id = '00000000-0000-0000-0000-000000050501';
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000050501');
update corre_perfis set verso = jsonb_build_object('skin', 'noel') where id = '00000000-0000-0000-0000-000000050501';
insert into r505 select 'v2', verso from corre_perfis where id = '00000000-0000-0000-0000-000000050501';
update corre_perfis set verso = jsonb_build_object('skin', 'robo') where id = '00000000-0000-0000-0000-000000050501';
insert into r505 select 'v3', verso from corre_perfis where id = '00000000-0000-0000-0000-000000050501';
reset role;
select case when (select v->>'skin' from r505 where k = 'v2') = '' and (select v->>'skin' from r505 where k = 'v3') = 'robo'
  then 'ok: ninguém veste o Papai Noel sem ter, e o Robô comprado fica' else format('FALHOU: a trava do avatar (%s, %s)', (select v from r505 where k = 'v2'), (select v from r505 where k = 'v3')) end;

-- o pedido em real nasce com o valor daqui (o servidor)
set role service_role;
insert into r505 select 'p', corre_skin_pedido_novo('00000000-0000-0000-0000-000000050501', 'noel', 'pix', 'pay_505', 'https://asaas.test/i/505', '2026-10-28');
reset role;
select case when (select valor from corre_skin_pedidos where dono = '00000000-0000-0000-0000-000000050501' and skin = 'noel') = 24.90
  then 'ok: o pedido do Papai Noel nasce com R$ 24,90' else 'FALHOU: o valor do pedido do Noel' end;

-- o Studio Houzi: a primeira marca é de graça (pra sempre), a segunda é no plano
create function pg_temp.tenta(q text) returns text language plpgsql as $$ declare h text; begin execute q; return 'passou'; exception when others then get stacked diagnostics h = pg_exception_hint; return coalesce(nullif(h, ''), sqlstate); end $$;
insert into corre_perfis (id) values ('00000000-0000-0000-0000-000000050502'), ('00000000-0000-0000-0000-000000050504') on conflict do nothing;
insert into corre_assinaturas (dono, produto, status, pago_ate, valor) values ('00000000-0000-0000-0000-000000050504', 'houzi', 'ativa', (now() at time zone 'America/Sao_Paulo')::date + 20, 29.90) on conflict do nothing;
create temp table h505 (k text primary key, v text);
grant all on h505 to authenticated;
select case when (select marca from corre_houzi_gratis where dono = '00000000-0000-0000-0000-000000050503') = '00000000-0000-0000-0000-0000000505c1'
  then 'ok: quem já tinha marca ganha a mais antiga como a grátis' else 'FALHOU: a grátis de quem já tinha marca' end;

set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000050502');
insert into h505 select 'a0', corre_meu_acesso()::text;
insert into h505 select 'a1', pg_temp.tenta($$insert into corre_houzi_marcas (id, dono, nome) values ('00000000-0000-0000-0000-0000000505a1', '00000000-0000-0000-0000-000000050502', 'Primeira')$$);
insert into h505 select 'a2', pg_temp.tenta($$update corre_houzi_marcas set spec = '{"x":1}' where id = '00000000-0000-0000-0000-0000000505a1'$$);
insert into h505 select 'a3', pg_temp.tenta($$insert into corre_houzi_marcas (dono, nome) values ('00000000-0000-0000-0000-000000050502', 'Segunda')$$);
insert into h505 select 'a4', corre_meu_acesso()::text;
insert into h505 select 'a4t', corre_teste_comeca('houzi')::text;
insert into h505 select 'a5', pg_temp.tenta($$update corre_houzi_marcas set publica = true where id = '00000000-0000-0000-0000-0000000505a1'$$);
insert into h505 select 'a6', pg_temp.tenta($$delete from corre_houzi_marcas where id = '00000000-0000-0000-0000-0000000505a1'$$);
insert into h505 select 'a7', pg_temp.tenta($$insert into corre_houzi_marcas (dono, nome) values ('00000000-0000-0000-0000-000000050502', 'De novo')$$);
insert into h505 select 'a8', corre_meu_acesso()::text;
insert into h505 select 'a8t', corre_teste_comeca('houzi')::text;
insert into h505 select 'a9', pg_temp.tenta($$select corre_teste_comeca('houzi')$$);
reset role;
select case when (select v::jsonb from h505 where k = 'a0') -> 'houzi_gratis' = 'null'::jsonb and ((select v::jsonb from h505 where k = 'a0') ->> 'houzi_livre')::boolean
  then 'ok: antes da primeira marca, a grátis tá por fazer e a IA livre' else format('FALHOU: o resumo de antes (%s)', (select v from h505 where k = 'a0')) end;
select case when (select v from h505 where k = 'a1') = 'passou' and (select v from h505 where k = 'a2') = 'passou'
  and (select marca from corre_houzi_gratis where dono = '00000000-0000-0000-0000-000000050502') = '00000000-0000-0000-0000-0000000505a1'
  and not exists (select 1 from corre_assinaturas where dono = '00000000-0000-0000-0000-000000050502' and produto = 'houzi')
  then 'ok: sem plano, a primeira marca sai de graça e dá pra mexer nela (sem os 30 dias de teste)' else 'FALHOU: a marca grátis' end;
select case when (select v from h505 where k = 'a3') = 'houzi_assinatura'
  and ((select v::jsonb from h505 where k = 'a4') -> 'houzi_gratis' ->> 'existe')::boolean and ((select v::jsonb from h505 where k = 'a4') ->> 'houzi_livre')::boolean
  and ((select v::jsonb from h505 where k = 'a4t') -> 'acesso' ->> 'houzi')::boolean and ((select v::jsonb from h505 where k = 'a4') -> 'acesso' ->> 'houzi')::boolean = false
  then 'ok: a segunda marca pede o plano (e a IA segue livre pra mexer na grátis)' else format('FALHOU: a segunda marca (%s)', (select v from h505 where k = 'a3')) end;
select case when (select v from h505 where k = 'a5') = 'passou' and (select v from h505 where k = 'a6') = 'passou' and (select v from h505 where k = 'a7') = 'houzi_assinatura'
  and ((select v::jsonb from h505 where k = 'a8') -> 'houzi_gratis' ->> 'existe')::boolean = false and ((select v::jsonb from h505 where k = 'a8') ->> 'houzi_livre')::boolean = false
  and ((select v::jsonb from h505 where k = 'a8t') -> 'acesso' ->> 'houzi')::boolean = false
  then 'ok: publica e apaga livre; apagou a grátis, a próxima já é no plano (e a IA fecha)' else 'FALHOU: apagar a grátis' end;
select case when (select v from h505 where k = 'a9') = 'passou' and not exists (select 1 from corre_assinaturas where dono = '00000000-0000-0000-0000-000000050502' and produto = 'houzi')
  then 'ok: o Studio Houzi não começa mais teste de 30 dias' else 'FALHOU: começou teste do Houzi' end;

-- com o plano: quantas quiser; a de quem já tinha: a antiga mexe, a nova não
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000050504');
insert into h505 select 'b1', pg_temp.tenta($$insert into corre_houzi_marcas (dono, nome) values ('00000000-0000-0000-0000-000000050504', 'Um')$$);
insert into h505 select 'b2', pg_temp.tenta($$insert into corre_houzi_marcas (dono, nome) values ('00000000-0000-0000-0000-000000050504', 'Dois')$$);
select pg_temp.como('00000000-0000-0000-0000-000000050503');
insert into h505 select 'c1', pg_temp.tenta($$update corre_houzi_marcas set spec = '{"y":1}' where id = '00000000-0000-0000-0000-0000000505c1'$$);
insert into h505 select 'c2', pg_temp.tenta($$update corre_houzi_marcas set spec = '{"y":1}' where id = '00000000-0000-0000-0000-0000000505c2'$$);
reset role;
select case when (select v from h505 where k = 'b1') = 'passou' and (select v from h505 where k = 'b2') = 'passou'
  and (select v from h505 where k = 'c1') = 'passou' and (select v from h505 where k = 'c2') = 'houzi_assinatura'
  then 'ok: com o plano faz quantas quiser; sem ele, só a grátis mexe' else 'FALHOU: o plano e as marcas de antes' end;
