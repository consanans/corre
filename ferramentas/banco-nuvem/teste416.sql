\set ON_ERROR_STOP 1
-- v4.16: o valor do negócio e o aviso na hora do pedido. Seis pessoas, cada uma com um caso; o relógio é o de agora.
create function pg_temp.como(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false), set_config('request.jwt.claim.role', 'authenticated', false) $$;
create function pg_temp.de(r jsonb, h text) returns jsonb language sql as $$
  select x from jsonb_array_elements(r) x where x->>'para' = (select id::text from corre_perfis where handle = h) $$;
create function pg_temp.reg(v text, atras interval default '0'::interval) returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object('t', now() - atras, 'k', 'res', 'v', v)) $$;

-- 1 pediu orçamento agora, 2 escolheram no Mural, 3 aprovaram o orçamento, 4 desligou as Mensagens, 5 escondeu o texto,
-- 6 sem aparelho; mais leads que não avisam (pedido velho, toque comum, lead da caça)
insert into corre_perfis (id, handle, nome) values
  ('00000000-0000-0000-0000-000000041601', 'pede416', 'Pede'), ('00000000-0000-0000-0000-000000041602', 'mural416', 'Mural'),
  ('00000000-0000-0000-0000-000000041603', 'aprova416', 'Aprova'), ('00000000-0000-0000-0000-000000041604', 'calado416', 'Calado'),
  ('00000000-0000-0000-0000-000000041605', 'sigilo416', 'Sigilo'), ('00000000-0000-0000-0000-000000041606', 'sem416', 'Sem');
insert into corre_push (endpoint, dono, p256dh, auth, visto_em)
  select 'https://web.push.apple.com/' || handle, id, 'p', 'a', now() from corre_perfis where handle like '%416' and handle <> 'sem416';
insert into corre_push_pref (dono, msg) values ('00000000-0000-0000-0000-000000041604', false);
insert into corre_push_pref (dono, texto) values ('00000000-0000-0000-0000-000000041605', false);
insert into corre_leads (dono, nome, fonte, st, hist) values
  ('00000000-0000-0000-0000-000000041601', 'Padaria Sol', 'link', 'interesse', pg_temp.reg('Pediu orçamento pelo link: quero um logo pra padaria')),
  ('00000000-0000-0000-0000-000000041601', 'Velho', 'link', 'interesse', pg_temp.reg('Pediu orçamento pelo link: antigo', '30 minutes')),
  ('00000000-0000-0000-0000-000000041601', 'Caça', 'caca', 'contato', pg_temp.reg('Respondeu')),
  ('00000000-0000-0000-0000-000000041602', 'Ana', 'mural', 'interesse', pg_temp.reg('Mural: Ana escolheu tua proposta. Chama no WhatsApp.')),
  ('00000000-0000-0000-0000-000000041603', 'Bar do Zé', 'caca', 'fechado', pg_temp.reg('Aprovou o orçamento pelo link.')),
  ('00000000-0000-0000-0000-000000041604', 'Calado', 'link', 'interesse', pg_temp.reg('Pediu orçamento pelo link: oi')),
  ('00000000-0000-0000-0000-000000041605', 'Sigilo', 'link', 'interesse', pg_temp.reg('Pediu orçamento pelo link: segredo')),
  ('00000000-0000-0000-0000-000000041606', 'Sem', 'link', 'interesse', pg_temp.reg('Pediu orçamento pelo link: sem aparelho'));

-- o valor: a dona grava, outra pessoa não mexe, e o banco recusa negativo e número absurdo
select pg_temp.como('00000000-0000-0000-0000-000000041601'); set role authenticated;
update corre_leads set valor = 1500.50 where nome = 'Padaria Sol';
reset role;
select case when (select valor from corre_leads where nome = 'Padaria Sol') = 1500.50
  then 'ok: a dona grava o valor do negócio' else 'FALHOU: valor da dona' end;
select pg_temp.como('00000000-0000-0000-0000-000000041602'); set role authenticated;
update corre_leads set valor = 1 where nome = 'Padaria Sol';
reset role;
select case when (select valor from corre_leads where nome = 'Padaria Sol') = 1500.50
  then 'ok: outra pessoa não mexe no valor' else 'FALHOU: outra pessoa mexeu' end;
do $$ begin update corre_leads set valor = -1 where nome = 'Velho'; raise notice 'FALHOU: aceitou valor negativo';
exception when check_violation then raise notice 'ok: valor negativo recusado'; end $$;
do $$ begin update corre_leads set valor = 100000000 where nome = 'Velho'; raise notice 'FALHOU: aceitou cem milhões';
exception when check_violation then raise notice 'ok: valor absurdo recusado'; end $$;

-- o app não chama a lista dos avisos
select pg_temp.como('00000000-0000-0000-0000-000000041601'); set role authenticated;
do $$ begin perform corre_pedidos_alvos(now()); raise notice 'FALHOU: o app chamou a lista dos pedidos';
exception when insufficient_privilege then raise notice 'ok: o app não chama a lista dos pedidos'; end $$;
reset role;

-- a lista: quem recebe e o que diz
create temp table r1 as select corre_pedidos_alvos(now()) as r;
select case when jsonb_array_length((select r from r1)) = 4 then 'ok: 4 avisos (pedido, Mural, aprovado, texto escondido)'
  else 'FALHOU: avisos ' || (select r from r1)::text end;
select case when pg_temp.de((select r from r1), 'pede416') #>> '{payload,titulo}' = 'Pedido de orçamento: Padaria Sol'
             and pg_temp.de((select r from r1), 'pede416') #>> '{payload,corpo}' = 'quero um logo pra padaria'
             and pg_temp.de((select r from r1), 'pede416') #>> '{payload,url}' = '/#/horus/entrada'
             and jsonb_array_length(pg_temp.de((select r from r1), 'pede416') -> 'subs') = 1
  then 'ok: o pedido chega com o nome, o que pediu e leva pra Entrada' else 'FALHOU: pedido ' || coalesce(pg_temp.de((select r from r1), 'pede416')::text, 'nada') end;
select case when pg_temp.de((select r from r1), 'mural416') #>> '{payload,titulo}' = 'Te escolheram no Mural'
             and pg_temp.de((select r from r1), 'mural416') #>> '{payload,corpo}' like 'Ana escolheu tua proposta.%'
  then 'ok: o Mural avisa quem escolheu' else 'FALHOU: mural ' || coalesce(pg_temp.de((select r from r1), 'mural416')::text, 'nada') end;
select case when pg_temp.de((select r from r1), 'aprova416') #>> '{payload,titulo}' = 'Orçamento aprovado: Bar do Zé'
             and pg_temp.de((select r from r1), 'aprova416') #>> '{payload,url}' = '/#/corre'
  then 'ok: orçamento aprovado avisa e leva pras Vendas' else 'FALHOU: aprovado ' || coalesce(pg_temp.de((select r from r1), 'aprova416')::text, 'nada') end;
select case when pg_temp.de((select r from r1), 'sigilo416') #>> '{payload,corpo}' not like '%segredo%'
             and pg_temp.de((select r from r1), 'calado416') is null and pg_temp.de((select r from r1), 'sem416') is null
  then 'ok: texto escondido não mostra o pedido; Mensagens desligadas e sem aparelho não recebem' else 'FALHOU: preferências' end;
select case when not exists (select 1 from jsonb_array_elements((select r from r1)) x where x #>> '{payload,corpo}' like '%antigo%' or x #>> '{payload,titulo}' like '%Caça%')
  then 'ok: pedido de meia hora atrás e resposta comum não avisam' else 'FALHOU: avisou o que não devia' end;
select case when jsonb_array_length(corre_pedidos_alvos(now())) = 0 then 'ok: chamar de novo não repete'
  else 'FALHOU: repetiu' end;

-- o mesmo cliente pede de novo (o pedido novo vai na frente do histórico): avisa outra vez
update corre_leads set hist = pg_temp.reg('Pediu orçamento pelo link: mudei de ideia, quero cardápio') || hist where nome = 'Padaria Sol';
select case when jsonb_array_length(corre_pedidos_alvos(now())) = 1 then 'ok: pedido novo do mesmo cliente avisa de novo'
  else 'FALHOU: pedido novo' end;
