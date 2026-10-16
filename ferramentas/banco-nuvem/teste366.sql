\set ON_ERROR_STOP 1
-- v3.66: a loja de skins. c1 compra com 2,00; c2 é outra pessoa. "tenta" roda e devolve "passou" ou o erro
create function pg_temp.tenta(q text) returns text language plpgsql as $$ declare h text; begin execute q; return 'passou'; exception when others then get stacked diagnostics h = pg_exception_hint; return coalesce(nullif(h, ''), sqlstate); end $$;
create function pg_temp.como(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false), set_config('request.jwt.claim.role', 'authenticated', false) $$;
insert into corre_perfis (id, handle, nome, verso) values ('00000000-0000-0000-0000-0000000000c1', 'teste366', 'Compradora', '{"pele":2}'), ('00000000-0000-0000-0000-0000000000c2', 'teste366b', 'Outra', null) on conflict do nothing;
insert into corre_correal (dono, saldo, ganho, gasto) values ('00000000-0000-0000-0000-0000000000c1', 2.00, 2.00, 0) on conflict (dono) do update set saldo = 2.00;
grant select on corre_skins to authenticated;

set role authenticated; select pg_temp.como('00000000-0000-0000-0000-0000000000c1');
create temp table r1 as select corre_skin_compra('farao') as r;
select case when (select (r->>'ok')::boolean and (r->>'saldo')::numeric = 1.00 and (r->>'preco')::numeric = 1.00 from r1)
  then 'ok: comprou o Faraó por 1,00 (sobra 1,00)' else 'FALHOU: compra do Faraó: ' || (select r::text from r1) end;
select case when (select count(*) from corre_skins where dono = '00000000-0000-0000-0000-0000000000c1' and skin = 'farao') = 1
  then 'ok: a compradora vê a skin dela' else 'FALHOU: a skin comprada não aparece' end;
create temp table r2 as select corre_skin_compra('farao') as r;
select case when (select (r->>'ok')::boolean and (r->>'ja')::boolean and (r->>'saldo')::numeric = 1.00 from r2)
  then 'ok: comprar de novo não cobra' else 'FALHOU: cobrou de novo: ' || (select r::text from r2) end;
create temp table r3 as select corre_skin_compra('mc') as r;
create temp table r4 as select corre_skin_compra('diva') as r;
select case when (select (r->>'ok')::boolean and (r->>'saldo')::numeric = 0.40 from r3) and (select not (r->>'ok')::boolean and (r->>'saldo')::numeric = 0.40 and (r->>'preco')::numeric = 1.00 from r4)
  then 'ok: MC por 0,60 passou; a Diva (1,00) com 0,40 não passou' else 'FALHOU: saldo curto: ' || (select r::text from r3) || ' ' || (select r::text from r4) end;
create temp table r5 as select corre_skin_compra('policial') as r, corre_skin_compra('nada-disso') as r2;
select case when (select not (r->>'ok')::boolean and r->'preco' = 'null'::jsonb and not (r2->>'ok')::boolean from r5)
  then 'ok: uniforme de graça e skin que não existe não se compram' else 'FALHOU: comprou o que não é da loja' end;
create temp table r6 as select corre_skins_minhas() as r;
select case when (select r->'minhas' = '["farao", "mc"]'::jsonb and (r->'precos'->>'galaxia')::numeric = 1.00 and (r->>'saldo')::numeric = 0.40 from r6)
  then 'ok: o app lê as compradas, os preços e o saldo' else 'FALHOU: corre_skins_minhas: ' || (select r::text from r6) end;
select case when pg_temp.tenta($$insert into corre_skins (dono, skin) values ('00000000-0000-0000-0000-0000000000c1', 'galaxia')$$) <> 'passou'
  then 'ok: o app não grava skin direto na tabela' else 'FALHOU: o app gravou skin sem pagar' end;

reset role;
select case when (select saldo from corre_correal where dono = '00000000-0000-0000-0000-0000000000c1') = 0.40
  and (select gasto from corre_correal where dono = '00000000-0000-0000-0000-0000000000c1') = 1.60
  and (select array_agg(valor || ' ' || motivo order by valor) from corre_correal_log where dono = '00000000-0000-0000-0000-0000000000c1' and motivo like 'skin:%') = array['-1.00 skin:farao', '-0.60 skin:mc']
  then 'ok: a carteira e o extrato batem (skin:farao -1,00 e skin:mc -0,60)' else 'FALHOU: carteira ou extrato' end;

-- outra pessoa não vê as compras da primeira
set role authenticated; select pg_temp.como('00000000-0000-0000-0000-0000000000c2');
select case when (select count(*) from corre_skins) = 0 then 'ok: ninguém vê o que o outro comprou' else 'FALHOU: viu a skin dos outros' end;
create temp table r7 as select corre_skin_compra('mumia') as r;
select case when (select not (r->>'ok')::boolean and (r->>'saldo')::numeric = 0 from r7) then 'ok: sem carteira, não compra' else 'FALHOU: comprou sem carteira' end;
reset role;
select case when pg_temp.tenta($$set role anon; select corre_skin_compra('mumia')$$) <> 'passou' then 'ok: sem login, nem chama a compra' else 'FALHOU: anon chamou a compra' end;
reset role;

-- a trava do avatar (o papel do login vem do token: auth.role())
select pg_temp.como('00000000-0000-0000-0000-0000000000c1');
update corre_perfis set verso = '{"pele":2,"skin":"farao"}' where id = '00000000-0000-0000-0000-0000000000c1';
select case when (select verso->>'skin' from corre_perfis where id = '00000000-0000-0000-0000-0000000000c1') = 'farao' then 'ok: veste a skin que comprou' else 'FALHOU: tirou a skin comprada' end;
update corre_perfis set verso = '{"pele":3,"skin":"galaxia"}' where id = '00000000-0000-0000-0000-0000000000c1';
select case when (select verso from corre_perfis where id = '00000000-0000-0000-0000-0000000000c1') = '{"pele":3,"skin":""}'::jsonb then 'ok: skin paga sem comprar sai (o resto do avatar salva)' else 'FALHOU: vestiu sem comprar: ' || (select verso::text from corre_perfis where id = '00000000-0000-0000-0000-0000000000c1') end;
update corre_perfis set verso = '{"skin":"policial"}' where id = '00000000-0000-0000-0000-0000000000c1';
select case when (select verso->>'skin' from corre_perfis where id = '00000000-0000-0000-0000-0000000000c1') = 'policial' then 'ok: uniforme de graça segue livre' else 'FALHOU: mexeu no uniforme de graça' end;
select pg_temp.como('00000000-0000-0000-0000-0000000000c2');
update corre_perfis set verso = '{"skin":"farao"}' where id = '00000000-0000-0000-0000-0000000000c2';
select case when (select verso->>'skin' from corre_perfis where id = '00000000-0000-0000-0000-0000000000c2') = '' then 'ok: a skin que a outra comprou não vale pra mim' else 'FALHOU: vestiu a skin da outra' end;
select set_config('request.jwt.claim.role', 'service_role', false);
update corre_perfis set verso = '{"skin":"galaxia"}' where id = '00000000-0000-0000-0000-0000000000c2';
select case when (select verso->>'skin' from corre_perfis where id = '00000000-0000-0000-0000-0000000000c2') = 'galaxia' then 'ok: o servidor passa direto' else 'FALHOU: barrou o servidor' end;
select set_config('request.jwt.claim.role', '', false), set_config('request.jwt.claim.sub', '', false);
