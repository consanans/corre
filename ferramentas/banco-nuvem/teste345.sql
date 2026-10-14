\set ON_ERROR_STOP 1
-- v3.45: o correal rende 10 vezes mais. Quem é quem: ...f gasta com a IA depois do grátis
insert into corre_perfis values ('00000000-0000-0000-0000-00000000000f');

-- 1) OS PREÇOS: tudo 10 vezes mais barato, e tipo desconhecido segue sem preço
select case when corre_correal_preco('imagem') = 0.10 and corre_correal_preco('marca') = 0.03 and corre_correal_preco('legenda') = 0.02
  and corre_correal_preco('abordagem') = 0.02 and corre_correal_preco('voo') = 0.05 and corre_correal_preco('foguete') is null
  then 'ok: preços novos (imagem 0,10 · marca 0,03 · legenda 0,02 · abordagem 0,02 · voo 0,05; tipo desconhecido sem preço)'
  else 'FALHOU: preços' end;
-- o "meio dia de trabalho" do Thales cabe em 1,00: 3 imagens, 10 legendas, 15 do Hórus e 2 do Studio Houzi
select case when 3 * corre_correal_preco('imagem') + 10 * corre_correal_preco('legenda') + 15 * corre_correal_preco('abordagem')
  + 2 * corre_correal_preco('marca') <= corre_correal_teto()
  then 'ok: meio dia de trabalho (3 imagens, 10 legendas, 15 do Hórus, 2 do Studio Houzi) cabe em 1,00' else 'FALHOU: meio dia não cabe' end;
-- as permissões continuam as do v3.43: o preço todo mundo lê; a devolução, só a chave de serviço
select case when has_function_privilege('anon', 'public.corre_correal_preco(text)', 'execute')
  and has_function_privilege('authenticated', 'public.corre_correal_preco(text)', 'execute')
  and not has_function_privilege('authenticated', 'public.corre_correal_devolve(uuid, text)', 'execute')
  then 'ok: as permissões não mudaram' else 'FALHOU: permissões' end;

-- 2) A CARTEIRA E O GASTO: com 0,90, a imagem passa e deixa 0,80; a legenda depois deixa 0,78
insert into corre_correal (dono, saldo, ganho) values ('00000000-0000-0000-0000-00000000000f', 0.90, 0.90);
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000f';
select case when (w->'precos'->>'imagem')::numeric = 0.10 and (w->'precos'->>'voo')::numeric = 0.05 and (w->'precos'->>'marca')::numeric = 0.03
  then 'ok: a carteira (corre_correal_meu) já mostra os preços novos' else format('FALHOU: meu: %s', w) end
  from (select corre_correal_meu() as w) x;
select case when (g->>'ok')::boolean and (g->>'saldo')::numeric = 0.80 and (g->>'preco')::numeric = 0.10
  then 'ok: imagem com 0,90 na carteira: paga 0,10 e deixa 0,80' else format('FALHOU: gasta imagem: %s', g) end
  from (select corre_correal_gasta('imagem') as g) x;
select case when (g->>'ok')::boolean and (g->>'saldo')::numeric = 0.78 then 'ok: legenda depois: paga 0,02 e deixa 0,78'
  else format('FALHOU: gasta legenda: %s', g) end
  from (select corre_correal_gasta('legenda') as g) x;
reset role;
-- 3) A DEVOLUÇÃO devolve o preço novo (a IA falhou depois do desconto)
set role service_role;
select case when (d->>'ok')::boolean and (d->>'saldo')::numeric = 0.80 then 'ok: devolve a legenda: volta 0,02 (saldo 0,80)'
  else format('FALHOU: devolve: %s', d) end from (select corre_correal_devolve('00000000-0000-0000-0000-00000000000f', 'legenda') as d) x;
reset role;
select case when saldo = 0.80 and gasto = 0.10
  and (select array_agg(valor || ' ' || motivo order by id) from corre_correal_log where dono = c.dono) = array['-0.10 gasto:imagem', '-0.02 gasto:legenda', '0.02 volta:legenda']
  then 'ok: extrato e carteira batem (saldo 0,80, gasto 0,10)' else format('FALHOU: carteira: saldo %s, gasto %s', saldo, gasto) end
  from corre_correal c where dono = '00000000-0000-0000-0000-00000000000f';
