\set ON_ERROR_STOP 1
-- v4.13: as 8 de Halloween só em real (14,90 · 9,90 · 5,90), as outras seguem no correal; a compra em real nasce
-- pendente, o pagamento libera uma vez, o estorno tira a skin (e do avatar), a fatura vencida cancela.
create function pg_temp.como(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false), set_config('request.jwt.claim.role', 'authenticated', false) $$;
create function pg_temp.servidor() returns void language sql as $$ select set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claim.role', 'service_role', false) $$;
create function pg_temp.tenta(q text) returns text language plpgsql as $$ declare h text; begin execute q; return 'passou'; exception when others then get stacked diagnostics h = pg_exception_hint; return coalesce(nullif(h, ''), sqlstate); end $$;
insert into corre_perfis (id) values ('00000000-0000-0000-0000-000000041301'), ('00000000-0000-0000-0000-000000041302') on conflict do nothing;
delete from corre_skins where dono in ('00000000-0000-0000-0000-000000041301', '00000000-0000-0000-0000-000000041302');
delete from corre_skin_pedidos where dono in ('00000000-0000-0000-0000-000000041301', '00000000-0000-0000-0000-000000041302');
insert into corre_correal (dono, saldo, ganho) values ('00000000-0000-0000-0000-000000041301', 5, 5) on conflict (dono) do update set saldo = 5, ganho = 5, gasto = 0;
-- a 2 comprou a Abóbora com correal antes da 4.13
insert into corre_skins (dono, skin, preco) values ('00000000-0000-0000-0000-000000041302', 'abobora', 1.00);
create temp table r413 (k text primary key, v jsonb);
grant all on r413 to authenticated, service_role;

select case when corre_skin_real('abobora') = 14.90 and corre_skin_real('saci') = 14.90 and corre_skin_real('bruxa') = 9.90 and corre_skin_real('esqueleto') = 9.90
             and corre_skin_real('lobisomem') = 9.90 and corre_skin_real('lencol') = 5.90 and corre_skin_real('mortovivo') = 5.90 and corre_skin_real('gatopreto') = 5.90
             and corre_skin_real('farao') is null and (select count(*) from corre_skins_reais()) = 8
  then 'ok: as 8 de Halloween em real (14,90 · 9,90 · 5,90) e as outras não' else 'FALHOU: os preços em real' end;

-- o correal não compra mais as de Halloween; as outras seguem
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000041301');
insert into r413 select 'c1', corre_skin_compra('abobora');
insert into r413 select 'c2', corre_skin_compra('farao');
select case when v->>'motivo' = 'real' and (v->>'real')::numeric = 14.90 and v->'preco' = 'null'::jsonb and (v->>'saldo')::numeric = 5 then 'ok: com correal, a Abóbora não sai (é só em real) e o saldo fica' else format('FALHOU: comprou a Abóbora com correal %s', v) end from r413 where k = 'c1';
select case when (v->>'ok')::boolean and (v->>'saldo')::numeric = 4 then 'ok: as outras 18 seguem no correal (o Faraó saiu por 1,00)' else format('FALHOU: o Faraó %s', v) end from r413 where k = 'c2';
-- o app não chama as funções do servidor
select case when pg_temp.tenta($$select corre_skin_paga('x', 1)$$) = '42501' and pg_temp.tenta($$select corre_skin_pedido_novo('00000000-0000-0000-0000-000000041301', 'saci', 'pix', 'x', '', '2026-10-20')$$) = '42501'
             and pg_temp.tenta($$insert into corre_skin_pedidos (dono, skin, valor, forma, asaas_cobranca, termos) values ('00000000-0000-0000-0000-000000041301', 'saci', 0.01, 'pix', 'x', '2026-10-20')$$) = '42501'
  then 'ok: o app não cria pedido nem libera skin (só a função, pelo servidor)' else 'FALHOU: o app mexeu nos pedidos' end;
reset role;
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000041302');
insert into r413 select 'c3', corre_skin_compra('abobora');
select case when (v->>'ok')::boolean and (v->>'ja')::boolean then 'ok: quem comprou a Abóbora com correal antes continua com ela' else format('FALHOU: quem já tinha %s', v) end from r413 where k = 'c3';
reset role;

-- a compra em real: nasce pendente com o valor daqui, e uma segunda fatura cancela a primeira
set role service_role;
select pg_temp.servidor();
insert into r413 select 'p1', corre_skin_pedido_novo('00000000-0000-0000-0000-000000041301', 'saci', 'pix', 'pay_a', 'https://asaas/a', '2026-10-20');
insert into r413 select 'p2', corre_skin_pedido_novo('00000000-0000-0000-0000-000000041301', 'saci', 'cartao', 'pay_b', 'https://asaas/b', '2026-10-20');
insert into r413 select 'pode', corre_skin_pode('00000000-0000-0000-0000-000000041301', 'saci');
reset role;
select case when (v->>'valor')::numeric = 14.90 then 'ok: o valor do pedido é o daqui (14,90)' else format('FALHOU: pedido %s', v) end from r413 where k = 'p1';
select case when (select status from corre_skin_pedidos where asaas_cobranca = 'pay_a') = 'cancelada' and (select status from corre_skin_pedidos where asaas_cobranca = 'pay_b') = 'pendente'
             and (select v->'pendente'->>'cobranca' from r413 where k = 'pode') = 'pay_b' and not (select (v->>'ja')::boolean from r413 where k = 'pode')
  then 'ok: a segunda fatura da mesma skin cancela a primeira (uma pendente por vez)' else 'FALHOU: as pendentes' end;
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000041301');
insert into r413 select 'm1', corre_skins_minhas();
select case when (v->'reais'->>'abobora')::numeric = 14.90 and jsonb_array_length(v->'pedidos') = 2 and (v->'pedidos'->0->>'status') = 'pendente' and (v->'pedidos'->0->>'link') = 'https://asaas/b'
             and (v->'pedidos'->1->>'link') = '' and not (v->'minhas') ? 'saci'
  then 'ok: o app lê os preços em real e a compra esperando pagamento (com o link da fatura)' else format('FALHOU: minhas %s', v) end from r413 where k = 'm1';
reset role;
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000041302');
select case when (select count(*) from corre_skin_pedidos) = 0 then 'ok: ninguém vê a compra dos outros' else 'FALHOU: viu pedido de outra pessoa' end;
reset role;

-- pagou: a skin é da pessoa, uma vez só; valor menor não libera
set role service_role;
select pg_temp.servidor();
insert into r413 select 'g1', corre_skin_paga('pay_b', 14.90);
insert into r413 select 'g2', corre_skin_paga('pay_b', 14.90);
insert into r413 select 'g3', corre_skin_pedido_novo('00000000-0000-0000-0000-000000041301', 'lencol', 'pix', 'pay_c', 'https://asaas/c', '2026-10-20');
insert into r413 select 'g4', corre_skin_paga('pay_c', 1.00);
reset role;
select case when (select (v->>'ok')::boolean from r413 where k = 'g1') and (select (v->>'ja')::boolean from r413 where k = 'g2')
             and (select pago_real from corre_skins where dono = '00000000-0000-0000-0000-000000041301' and skin = 'saci') = 14.90
             and (select status from corre_skin_pedidos where asaas_cobranca = 'pay_b') = 'paga'
  then 'ok: pagou, o Saci é dela (e o aviso repetido não faz nada)' else 'FALHOU: o pagamento' end;
select case when (select v->>'motivo' from r413 where k = 'g4') = 'valor' and not exists (select 1 from corre_skins where dono = '00000000-0000-0000-0000-000000041301' and skin = 'lencol')
  then 'ok: pagamento menor que o preço não libera' else 'FALHOU: liberou com valor menor' end;
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000041301');
insert into r413 select 'm2', corre_skins_minhas();
update corre_perfis set verso = '{"skin": "saci", "cabelo": "curto"}'::jsonb where id = '00000000-0000-0000-0000-000000041301';
select case when (v->'minhas') ? 'saci' and (select e->>'desiste' from jsonb_array_elements(v->'pedidos') e where e->>'skin' = 'saci' and e->>'status' = 'paga') = (((now() at time zone 'America/Sao_Paulo')::date + 7)::text)
  then 'ok: o app vê o Saci e até quando dá pra desistir (7 dias)' else format('FALHOU: depois de pagar %s', v) end from r413 where k = 'm2';
reset role;
select case when (select verso->>'skin' from corre_perfis where id = '00000000-0000-0000-0000-000000041301') = 'saci' then 'ok: comprou, veste' else 'FALHOU: não deixou vestir o que comprou' end;

-- o dinheiro voltou: a skin sai, e sai do avatar; o que foi estornado não libera de novo
set role service_role;
select pg_temp.servidor();
insert into r413 select 'v1', corre_skin_volta('pay_b', true);
insert into r413 select 'v2', corre_skin_paga('pay_b', 14.90);
reset role;
select case when not exists (select 1 from corre_skins where dono = '00000000-0000-0000-0000-000000041301' and skin = 'saci')
             and (select verso->>'skin' from corre_perfis where id = '00000000-0000-0000-0000-000000041301') = ''
             and (select verso->>'cabelo' from corre_perfis where id = '00000000-0000-0000-0000-000000041301') = 'curto'
             and (select status = 'estornada' and desistiu_em is not null from corre_skin_pedidos where asaas_cobranca = 'pay_b')
  then 'ok: desistiu, o dinheiro volta e o Saci sai (do armário e do avatar; o resto do avatar fica)' else 'FALHOU: o estorno' end;
select case when (select v->>'motivo' from r413 where k = 'v2') = 'estornada' and not exists (select 1 from corre_skins where dono = '00000000-0000-0000-0000-000000041301' and skin = 'saci')
  then 'ok: aviso de pagamento depois do estorno não devolve a skin' else 'FALHOU: voltou depois do estorno' end;

-- a fatura venceu sem pagar: cancela
set role service_role;
select pg_temp.servidor();
insert into r413 select 'k1', corre_skin_pedido_novo('00000000-0000-0000-0000-000000041301', 'bruxa', 'pix', 'pay_d', 'https://asaas/d', '2026-10-20');
insert into r413 select 'k2', corre_skin_cai('pay_d');
insert into r413 select 'k3', corre_skin_abertos('00000000-0000-0000-0000-000000041301');
reset role;
select case when (select status from corre_skin_pedidos where asaas_cobranca = 'pay_d') = 'cancelada' and (select (v->>'mudou')::boolean from r413 where k = 'k2')
             and (select v from r413 where k = 'k3') @> '[{"cobranca": "pay_c"}]' and not (select v from r413 where k = 'k3') @> '[{"cobranca": "pay_d"}]'
  then 'ok: a fatura vencida cancela (e só as em aberto ficam pra conferir)' else 'FALHOU: a fatura vencida' end;
-- e quem salvar o avatar com uma de Halloween que não tem continua sem (a trava da v3.66 segue valendo)
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000041301');
update corre_perfis set verso = '{"skin": "bruxa"}'::jsonb where id = '00000000-0000-0000-0000-000000041301';
reset role;
select case when (select verso->>'skin' from corre_perfis where id = '00000000-0000-0000-0000-000000041301') = '' then 'ok: a Bruxa sem pagar não veste' else 'FALHOU: vestiu sem pagar' end;
