\set ON_ERROR_STOP 1
-- v3.74: a devolução de correal pelo recibo do gasto. ...f gasta duas imagens e as duas falham: as duas voltam
create function pg_temp.tenta(q text) returns text language plpgsql as $$ declare h text; begin execute q; return 'passou'; exception when others then get stacked diagnostics h = pg_exception_hint; return coalesce(nullif(h, ''), sqlstate); end $$;
insert into corre_perfis (id) values ('00000000-0000-0000-0000-00000000000f') on conflict do nothing;
insert into corre_correal (dono, saldo, ganho, gasto) values ('00000000-0000-0000-0000-00000000000f', 1.00, 1.00, 0)
  on conflict (dono) do update set saldo = 1.00, ganho = 1.00, gasto = 0;
-- dois gastos de imagem (preço da v3.45: 0,10 cada), cada um com o seu recibo
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000f';
create temp table g374 as select corre_correal_gasta('imagem') as a, corre_correal_gasta('imagem') as b;
grant select on g374 to service_role;
select case when (a->>'ok')::boolean and (b->>'ok')::boolean and (a->>'gasto')::bigint > 0 and (b->>'gasto')::bigint > (a->>'gasto')::bigint and (b->>'saldo')::numeric = 0.80
  then 'ok: cada gasto devolve o seu recibo (e o saldo desce 0,10 de cada vez)' else format('FALHOU: gastos %s / %s', a, b) end from g374;
select case when pg_temp.tenta($$select corre_correal_devolve_gasto('00000000-0000-0000-0000-00000000000f', 1)$$) = '42501'
  then 'ok: o app não devolve correal pelo recibo (só a chave de serviço)' else 'FALHOU: o app chamou a devolução' end;
reset role;
reset request.jwt.claim.sub;
-- as duas IAs falharam ao mesmo tempo: as duas voltam (antes, só uma)
set role service_role;
select case when (corre_correal_devolve_gasto('00000000-0000-0000-0000-00000000000f', (select (a->>'gasto')::bigint from g374))->>'ok')::boolean
  and (corre_correal_devolve_gasto('00000000-0000-0000-0000-00000000000f', (select (b->>'gasto')::bigint from g374))->>'ok')::boolean
  then 'ok: dois gastos do mesmo tipo, as duas devoluções valem' else 'FALHOU: uma das devoluções não passou' end;
reset role;
select case when saldo = 1.00 and gasto = 0 then 'ok: a carteira voltou inteira (1,00, gasto 0)' else format('FALHOU: carteira %s, gasto %s', saldo, gasto) end
  from corre_correal where dono = '00000000-0000-0000-0000-00000000000f';
set role service_role;
select case when (corre_correal_devolve_gasto('00000000-0000-0000-0000-00000000000f', (select (a->>'gasto')::bigint from g374))->>'ja')::boolean
  then 'ok: o mesmo recibo não volta duas vezes' else 'FALHOU: devolveu de novo' end;
select case when not (corre_correal_devolve_gasto('00000000-0000-0000-0000-00000000000e', (select (b->>'gasto')::bigint from g374))->>'ok')::boolean
  then 'ok: recibo de outra pessoa não devolve' else 'FALHOU: devolveu pro dono errado' end;
-- a devolução de antes (por tipo) não devolve de novo o que já voltou pelo recibo
select case when not (corre_correal_devolve('00000000-0000-0000-0000-00000000000f', 'imagem')->>'ok')::boolean
  then 'ok: a devolução antiga enxerga a volta pelo recibo' else 'FALHOU: a devolução antiga devolveu de novo' end;
reset role;
select case when count(*) = 2 and bool_and(motivo ~ '^volta:imagem:[0-9]+$') and sum(valor) = 0.20
  then 'ok: o extrato mostra as duas voltas, com o recibo' else format('FALHOU: voltas %s', string_agg(motivo || '=' || valor, ', ')) end
  from corre_correal_log where dono = '00000000-0000-0000-0000-00000000000f' and motivo like 'volta:imagem%';
-- gasto de mais de 10 minutos não volta
update corre_correal_log set created_at = now() - interval '11 minutes' where dono = '00000000-0000-0000-0000-00000000000f' and motivo = 'gasto:imagem';
delete from corre_correal_log where dono = '00000000-0000-0000-0000-00000000000f' and motivo like 'volta:imagem%';
set role service_role;
select case when not (corre_correal_devolve_gasto('00000000-0000-0000-0000-00000000000f', (select (a->>'gasto')::bigint from g374))->>'ok')::boolean
  then 'ok: gasto de mais de 10 minutos não volta' else 'FALHOU: devolveu gasto velho' end;
reset role;
