\set ON_ERROR_STOP 1
-- v3.60: os planos. a2 = Gabriela, a4 = Beltrana, f = o fundador. "tenta" roda e devolve "passou" ou a dica do erro
create function pg_temp.tenta(q text) returns text language plpgsql as $$ declare h text; begin execute q; return 'passou'; exception when others then get stacked diagnostics h = pg_exception_hint; return coalesce(nullif(h, ''), sqlstate); end $$;
create function pg_temp.como(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false), set_config('request.jwt.claim.role', 'authenticated', false) $$;

set role authenticated; select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
select case when (corre_meu_acesso() -> 'acesso' ->> 'horus')::boolean = false and corre_meu_acesso() -> 'planos' = '{}'::jsonb and (corre_meu_acesso() ->> 'redes')::int = 1
  and (corre_meu_acesso() ->> 'cliente')::boolean = false
  then 'ok: antes de usar, nenhum plano, Hórus fechado e 1 rede no Studio' else 'FALHOU: o resumo de antes de usar' end;
create temp table r as select pg_temp.tenta($$insert into corre_leads (dono, nome) values ('00000000-0000-0000-0000-0000000000a2', 'padaria')$$) as v;
select case when (select v from r) = 'passou'
  and (select status = 'teste' and teste_ate between now() + interval '29 days' and now() + interval '31 days' and valor = 9.90 from corre_assinaturas where produto = 'horus')
  then 'ok: o primeiro lead começa os 30 dias grátis do Hórus sozinho' else 'FALHOU: o teste grátis do Hórus' end;
select case when (corre_meu_acesso() -> 'planos' -> 'horus' ->> 'acesso')::boolean then 'ok: no teste, o resumo diz que tem acesso' else 'FALHOU: acesso no teste' end;
select case when pg_temp.tenta($$insert into corre_assinaturas (dono, produto, status, pago_ate) values ('00000000-0000-0000-0000-0000000000a2', 'houzi', 'ativa', '2099-01-01')$$) <> 'passou'
  and pg_temp.tenta($$update corre_assinaturas set teste_ate = '2099-01-01'$$) <> 'passou'
  and pg_temp.tenta($$select corre_teste_garante('00000000-0000-0000-0000-0000000000a2', 'houzi')$$) <> 'passou'
  and pg_temp.tenta($$select corre_tem_acesso('00000000-0000-0000-0000-0000000000a4', 'horus')$$) <> 'passou'
  then 'ok: ninguém se dá plano: não grava assinatura nem chama as funções de dentro' else 'FALHOU: dá pra se dar plano' end;

-- o teste acabou
reset role; update corre_assinaturas set teste_ate = now() - interval '1 day' where dono = '00000000-0000-0000-0000-0000000000a2' and produto = 'horus';
set role authenticated; select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
select case when pg_temp.tenta($$insert into corre_leads (dono, nome) values ('00000000-0000-0000-0000-0000000000a2', 'barbearia')$$) = 'horus_assinatura'
  and (select count(*) from corre_leads) = 1 then 'ok: teste acabado e sem pagar, o Hórus não cria lead (e o que já tinha fica)' else 'FALHOU: Hórus aberto depois do teste' end;
select case when pg_temp.tenta($$select corre_teste_comeca('horus')$$) = 'passou' and pg_temp.tenta($$insert into corre_leads (dono, nome) values ('00000000-0000-0000-0000-0000000000a2', 'x')$$) = 'horus_assinatura'
  then 'ok: o teste grátis não recomeça' else 'FALHOU: dá pra ganhar outro teste' end;
-- pagou (o aviso do Asaas grava o pago_ate), e a folga de 3 dias
reset role; update corre_assinaturas set status = 'ativa', pago_ate = (now() at time zone 'America/Sao_Paulo')::date + 20 where produto = 'horus';
set role authenticated; select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
select case when pg_temp.tenta($$insert into corre_leads (dono, nome) values ('00000000-0000-0000-0000-0000000000a2', 'barbearia')$$) = 'passou' then 'ok: pago, o Hórus volta' else 'FALHOU: pagou e segue fechado' end;
reset role; update corre_assinaturas set pago_ate = (now() at time zone 'America/Sao_Paulo')::date - 2 where produto = 'horus';
set role authenticated; select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
select case when pg_temp.tenta($$insert into corre_leads (dono, nome) values ('00000000-0000-0000-0000-0000000000a2', 'acougue')$$) = 'passou' then 'ok: 2 dias depois do vencimento ainda abre (folga de 3)' else 'FALHOU: a folga' end;
reset role; update corre_assinaturas set pago_ate = (now() at time zone 'America/Sao_Paulo')::date - 4 where produto = 'horus';
set role authenticated; select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
select case when pg_temp.tenta($$insert into corre_leads (dono, nome) values ('00000000-0000-0000-0000-0000000000a2', 'otica')$$) = 'horus_assinatura' then 'ok: 4 dias atrasado, fecha' else 'FALHOU: atrasado e aberto' end;

-- o Studio Houzi: criar começa o teste; acabou, não mexe, mas publica e apaga
update r set v = pg_temp.tenta($$insert into corre_houzi_marcas (dono, nome) values ('00000000-0000-0000-0000-0000000000a2', 'Grão')$$);
select case when (select v from r) = 'passou'
  and (select valor = 29.90 and status = 'teste' from corre_assinaturas where produto = 'houzi') then 'ok: a primeira marca começa os 30 dias do Studio Houzi' else 'FALHOU: teste do Houzi' end;
reset role; update corre_assinaturas set teste_ate = now() - interval '1 hour' where produto = 'houzi';
set role authenticated; select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
select case when pg_temp.tenta($$update corre_houzi_marcas set spec = '{"a":1}'$$) = 'houzi_assinatura' and pg_temp.tenta($$insert into corre_houzi_marcas (dono, nome) values ('00000000-0000-0000-0000-0000000000a2', 'Outra')$$) = 'houzi_assinatura'
  and pg_temp.tenta($$update corre_houzi_marcas set publica = true$$) = 'passou' and pg_temp.tenta($$delete from corre_houzi_marcas$$) = 'passou'
  then 'ok: Houzi sem plano não cria nem mexe na marca, mas publica e apaga' else 'FALHOU: as travas do Houzi' end;

-- o Studio: 1 rede de graça; 2 pagando o nível 2; 4 = quantas quiser
select case when pg_temp.tenta($$insert into corre_portfolio (dono, rede) values ('00000000-0000-0000-0000-0000000000a2', 'instagram')$$) = 'passou'
  and pg_temp.tenta($$insert into corre_portfolio (dono, rede) values ('00000000-0000-0000-0000-0000000000a2', 'instagram')$$) = 'plano_gratis'
  and pg_temp.tenta($$insert into corre_portfolio (dono, rede) values ('00000000-0000-0000-0000-0000000000a2', '')$$) = 'passou'
  then 'ok: no grátis, 1 rede (marca sem rede não conta)' else 'FALHOU: o limite grátis do Studio' end;
reset role; insert into corre_assinaturas (dono, produto, nivel, valor, status, pago_ate) values ('00000000-0000-0000-0000-0000000000a2', 'studio', 2, 59.90, 'ativa', (now() at time zone 'America/Sao_Paulo')::date + 30);
set role authenticated; select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
update r set v = pg_temp.tenta($$insert into corre_portfolio (dono, rede) values ('00000000-0000-0000-0000-0000000000a2', 'tiktok')$$);
select case when (select v from r) = 'passou'
  and pg_temp.tenta($$insert into corre_portfolio (dono, rede) values ('00000000-0000-0000-0000-0000000000a2', 'instagram')$$) = 'plano_gratis'
  and (corre_meu_acesso() ->> 'redes')::int = 2 and (corre_meu_acesso() ->> 'usadas')::int = 2
  then 'ok: no plano de 2 redes, a 2ª entra e a 3ª não' else 'FALHOU: o plano de 2 redes' end;
reset role; insert into corre_asaas_clientes (dono, cliente) values ('00000000-0000-0000-0000-0000000000a2', 'cus_1');
set role authenticated; select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
select case when (corre_meu_acesso() ->> 'cliente')::boolean and pg_temp.tenta($$select * from corre_asaas_clientes$$) = '42501'
  then 'ok: o resumo diz que já tem cadastro no Asaas, e a tabela do cliente não abre pro app' else 'FALHOU: cliente no Asaas' end;
reset role; update corre_assinaturas set nivel = 4 where produto = 'studio';
set role authenticated; select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
select case when pg_temp.tenta($$insert into corre_portfolio (dono, rede) values ('00000000-0000-0000-0000-0000000000a2', 'instagram'), ('00000000-0000-0000-0000-0000000000a2', 'instagram'), ('00000000-0000-0000-0000-0000000000a2', 'linkedin')$$) = 'passou'
  then 'ok: no "4 ou mais", passa de 4 redes' else 'FALHOU: o 4 ou mais' end;

-- o fundador nunca paga; o servidor passa direto
select pg_temp.como('d1e9f6ac-f5d7-4723-8b02-eb0d1d7137b0');
select case when pg_temp.tenta($$insert into corre_leads (dono, nome) values ('d1e9f6ac-f5d7-4723-8b02-eb0d1d7137b0', 'a')$$) = 'passou' and (corre_meu_acesso() ->> 'fundador')::boolean
  and (corre_meu_acesso() ->> 'redes')::int = 999 and (corre_meu_acesso() -> 'acesso' ->> 'houzi')::boolean then 'ok: o fundador tem tudo, sem plano' else 'FALHOU: o fundador' end;
reset role; select set_config('request.jwt.claim.role', 'service_role', false);
select case when pg_temp.tenta($$insert into corre_leads (dono, nome) values ('00000000-0000-0000-0000-0000000000a2', 'pelo servidor')$$) = 'passou' then 'ok: o servidor não é barrado' else 'FALHOU: servidor barrado' end;
select set_config('request.jwt.claim.role', '', false), set_config('request.jwt.claim.sub', '', false);
