\set ON_ERROR_STOP 1
-- v5.12: a Sala do Cliente (o link fixo por marca, a janela que rola, o material, os pedidos que viram tarefa, o
-- entregue do mês, a cobrança escolhida e o aviso no celular).
create function pg_temp.como(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false), set_config('request.jwt.claim.role', 'authenticated', false) $$;
create function pg_temp.tenta(q text) returns text language plpgsql as $$
begin execute q; return 'passou'; exception when others then return coalesce(nullif(sqlerrm, ''), 'erro'); end $$;
create temp table r (k text primary key, v text);
grant all on r to authenticated, anon;

insert into corre_perfis (id, handle, nome, whats_publico) values ('00000000-0000-0000-0000-000000051201', 'agencia512', 'Ana Agência', '43999990000'),
  ('00000000-0000-0000-0000-000000051202', 'outra512', 'Outra', '') on conflict do nothing;
insert into corre_portfolio (id, dono, marca, rede, cor) values ('00000000-0000-0000-0000-0000000512a1', '00000000-0000-0000-0000-000000051201', 'Bar do Zé', 'bardoze', '#FF48B0'),
  ('00000000-0000-0000-0000-0000000512a2', '00000000-0000-0000-0000-000000051202', 'Outra marca', 'outra', '#FFE800') on conflict do nothing;
insert into corre_push (endpoint, dono, p256dh, auth, visto_em) values ('https://web.push.apple.com/agencia512', '00000000-0000-0000-0000-000000051201', 'p', 'a', now()) on conflict do nothing;
-- os posts: 2 que vêm aí (com arte), 1 sem arte, 1 que já saiu no mês, e 1 de daqui a 4 meses (fora da janela)
insert into corre_posts (dono, marca_id, data, hora, midia_url, status, titulo, aprov, aprov_em) values
  ('00000000-0000-0000-0000-000000051201', '00000000-0000-0000-0000-0000000512a1', (now() at time zone 'America/Sao_Paulo')::date + 2, '18:00', 'https://x/s1.jpg', 'pronto', 'Promo', '', null),
  ('00000000-0000-0000-0000-000000051201', '00000000-0000-0000-0000-0000000512a1', (now() at time zone 'America/Sao_Paulo')::date + 5, '18:00', 'https://x/s2.jpg', 'pronto', 'Show', '', null),
  ('00000000-0000-0000-0000-000000051201', '00000000-0000-0000-0000-0000000512a1', (now() at time zone 'America/Sao_Paulo')::date + 6, '18:00', '', 'ideia', 'Sem arte', '', null),
  ('00000000-0000-0000-0000-000000051201', '00000000-0000-0000-0000-0000000512a1', date_trunc('month', (now() at time zone 'America/Sao_Paulo'))::date, '10:00', 'https://x/s0.jpg', 'postado', 'Saiu', 'aprovado', now() - interval '3 days'),
  ('00000000-0000-0000-0000-000000051201', '00000000-0000-0000-0000-0000000512a1', (now() at time zone 'America/Sao_Paulo')::date + 120, '18:00', 'https://x/s9.jpg', 'pronto', 'Longe', '', null);
insert into corre_vendas (id, dono, codigo, cliente, st, total, itens) values
  ('00000000-0000-0000-0000-0000000512b1', '00000000-0000-0000-0000-000000051201', 'orc512', 'Zé', 'orcamento', 900, '[{"n":"Social media","q":1,"v":900}]'),
  ('00000000-0000-0000-0000-0000000512b2', '00000000-0000-0000-0000-000000051202', 'alheia', 'X', 'orcamento', 100, '[]');

-- 1) a dona abre a sala (uma ligada por marca) e escolhe a cobrança
select pg_temp.como('00000000-0000-0000-0000-000000051201'); set role authenticated;
insert into corre_aprovacoes (dono, marca_id, de, ate, sala, vendas) values ('00000000-0000-0000-0000-000000051201', '00000000-0000-0000-0000-0000000512a1', current_date, current_date, true,
  array['00000000-0000-0000-0000-0000000512b1', '00000000-0000-0000-0000-0000000512b2']::uuid[]);
insert into r select 'dupla', pg_temp.tenta($$insert into corre_aprovacoes (dono, marca_id, de, ate, sala) values ('00000000-0000-0000-0000-000000051201', '00000000-0000-0000-0000-0000000512a1', current_date, current_date, true)$$);
reset role;
select case when (select v from r where k = 'dupla') <> 'passou' then 'ok: uma sala ligada por marca' else 'FALHOU: duas salas na mesma marca' end;
create temp table cod as select codigo from corre_aprovacoes where marca_id = '00000000-0000-0000-0000-0000000512a1' and sala and ativo;
grant select on cod to anon;

-- 2) o cliente, sem login
set role anon;
insert into r select 'ver', corre_sala_ver((select codigo from cod))::text;
reset role;
select case when jsonb_array_length((select v from r where k = 'ver')::jsonb -> 'posts') = 2
   and ((select v from r where k = 'ver')::jsonb #>> '{marca,nome}') = 'Bar do Zé'
   and ((select v from r where k = 'ver')::jsonb #>> '{quem,whats}') = '43999990000'
  then 'ok: o cliente vê os 2 posts que vêm aí (com arte, dentro da janela), a marca e o WhatsApp de quem cuida' else 'FALHOU: ver ' || (select v from r where k = 'ver') end;
select case when (select de from corre_aprovacoes where codigo = (select codigo from cod)) = (now() at time zone 'America/Sao_Paulo')::date - 7
   and (select ate - de from corre_aprovacoes where codigo = (select codigo from cod)) = 92
  then 'ok: a janela rola sozinha (da semana passada a 3 meses)' else 'FALHOU: a janela' end;
select case when jsonb_array_length((select v from r where k = 'ver')::jsonb -> 'entregue') = 1
   and ((select v from r where k = 'ver')::jsonb #>> '{conta,aprovados}')::int = 1
   and ((select v from r where k = 'ver')::jsonb #>> '{conta,antecedencia}') is not null
  then 'ok: o entregue do mês (o post que saiu) e a conta da aprovação' else 'FALHOU: entregue ' || ((select v from r where k = 'ver')::jsonb -> 'conta')::text end;
select case when jsonb_array_length((select v from r where k = 'ver')::jsonb -> 'vendas') = 1
   and ((select v from r where k = 'ver')::jsonb #>> '{vendas,0,codigo}') = 'orc512'
  then 'ok: a cobrança: só a que a dona escolheu e que é dela' else 'FALHOU: vendas ' || ((select v from r where k = 'ver')::jsonb -> 'vendas')::text end;

-- o aprovar de antes vale na sala (a janela foi acertada no ver)
create temp table pid as select id from corre_posts where midia_url = 'https://x/s1.jpg';
grant select on pid to anon;
set role anon;
insert into r select 'aprova', pg_temp.tenta(format($$select corre_aprov_responder(%L, %L, 'aprovado', '', 'Zé')$$, (select codigo from cod), (select id from pid)));
reset role;
select case when (select v from r where k = 'aprova') = 'passou' and (select aprov from corre_posts where midia_url = 'https://x/s1.jpg') = 'aprovado'
  then 'ok: o cliente aprova pela sala' else 'FALHOU: aprovar pela sala ' || (select v from r where k = 'aprova') end;

-- 3) os pedidos viram tarefa no Caderninho da dona
set role anon;
insert into r select 'data', corre_sala_pede((select codigo from cod), 'data', ((now() at time zone 'America/Sao_Paulo')::date + 20), 'Aniversário do bar, 10 anos', 'Zé')::text;
insert into r select 'ped', corre_sala_pede((select codigo from cod), 'pedido', null, 'Divulgar o show de sexta', 'Zé')::text;
insert into r select 'dia-ruim', pg_temp.tenta(format($$select corre_sala_pede(%L, 'data', current_date - 3, 'Ontem', 'Zé')$$, (select codigo from cod)));
reset role;
select case when (select dia from corre_caderno where titulo = 'Bar do Zé: Aniversário do bar, 10 anos' and dono = '00000000-0000-0000-0000-000000051201') = (now() at time zone 'America/Sao_Paulo')::date + 15
   and (select lista from corre_caderno where titulo = 'Bar do Zé: Divulgar o show de sexta') = 'Sala do Cliente'
   and (select dia from corre_caderno where titulo = 'Bar do Zé: Divulgar o show de sexta') = (now() at time zone 'America/Sao_Paulo')::date
  then 'ok: a data vira tarefa 5 dias antes e o pedido, hoje, na lista Sala do Cliente' else 'FALHOU: as tarefas' end;
select case when (select v from r where k = 'dia-ruim') like '%dia%' then 'ok: data que já passou não entra' else 'FALHOU: data no passado ' || (select v from r where k = 'dia-ruim') end;

-- 4) o material (sem o Storage no banco de teste, confere só o caminho, o tipo e o tamanho)
set role anon;
insert into r select 'mat', pg_temp.tenta(format($$select corre_sala_material_poe(%L, %L, 'foto do cardápio.jpg', 'image/jpeg', 120000, 'Zé', 'o cardápio novo')$$,
  (select codigo from cod), (select codigo from cod) || '/a1b2c3d4e5-foto.jpg'));
insert into r select 'mat-fora', pg_temp.tenta(format($$select corre_sala_material_poe(%L, 'outra/a1b2c3d4e5.jpg', 'x', 'image/jpeg', 10, '', '')$$, (select codigo from cod)));
insert into r select 'mat-exe', pg_temp.tenta(format($$select corre_sala_material_poe(%L, %L, 'x', 'application/x-msdownload', 10, '', '')$$, (select codigo from cod), (select codigo from cod) || '/a1b2c3d4e6-x.exe'));
reset role;
select case when (select v from r where k = 'mat') = 'passou' and (select count(*) from corre_sala_material where marca_id = '00000000-0000-0000-0000-0000000512a1') = 1
   and (select v from r where k = 'mat-fora') like '%caminho%' and (select v from r where k = 'mat-exe') like '%tipo%'
  then 'ok: o material entra só na pasta da sala e só foto, vídeo ou PDF' else 'FALHOU: material ' || (select v from r where k = 'mat-fora') || ' / ' || (select v from r where k = 'mat-exe') end;

-- 5) quem lê: a dona sim, a outra pessoa e o anon não
select pg_temp.como('00000000-0000-0000-0000-000000051202'); set role authenticated;
insert into r select 'outra', (select count(*) from corre_sala_material)::text || '/' || (select count(*) from corre_sala_pedidos)::text;
reset role;
select pg_temp.como('00000000-0000-0000-0000-000000051201'); set role authenticated;
insert into r select 'dona', (select count(*) from corre_sala_material)::text || '/' || (select count(*) from corre_sala_pedidos)::text;
insert into r select 'dona-grava', pg_temp.tenta($$update corre_sala_material set tam = 1$$);
reset role;
select case when (select v from r where k = 'outra') = '0/0' and (select v from r where k = 'dona') = '1/2' and (select v from r where k = 'dona-grava') <> 'passou'
   and pg_temp.tenta($$set role anon; select count(*) from corre_sala_pedidos$$) like 'permission denied%'
  then 'ok: só a dona vê o material e os pedidos (e não muda o que o cliente mandou)' else 'FALHOU: quem lê ' || (select v from r where k = 'outra') || ' ' || (select v from r where k = 'dona') end;
reset role;

-- 6) o aviso no celular: material e os dois pedidos, uma vez cada
insert into r select 'av', corre_aprov_alvos(now())::text;
insert into r select 'av2', corre_aprov_alvos(now())::text;
select case when (select count(*) from jsonb_array_elements((select v from r where k = 'av')::jsonb) e where e #>> '{payload,t}' = 'sala') = 3
   and (select v from r where k = 'av')::jsonb @> '[{"payload": {"url": "/#/studio/sala/00000000-0000-0000-0000-0000000512a1"}}]'
   and jsonb_array_length((select v from r where k = 'av2')::jsonb) = 0
  then 'ok: o celular avisa do material e de cada pedido, uma vez só' else 'FALHOU: avisos ' || (select v from r where k = 'av') end;

-- 7) a sala desligada não abre; o link de período de antes não abre como sala
update corre_aprovacoes set ativo = false where codigo = (select codigo from cod);
select case when pg_temp.tenta(format($$select corre_sala_ver(%L)$$, (select codigo from cod))) = 'link' then 'ok: sala desligada não abre' else 'FALHOU: sala desligada abriu' end;
insert into corre_aprovacoes (dono, marca_id, de, ate) values ('00000000-0000-0000-0000-000000051201', '00000000-0000-0000-0000-0000000512a1', current_date, current_date + 30);
select case when pg_temp.tenta(format($$select corre_sala_ver(%L)$$, (select codigo from corre_aprovacoes where marca_id = '00000000-0000-0000-0000-0000000512a1' and not sala limit 1))) = 'link'
  then 'ok: link de período não abre como sala' else 'FALHOU: link de período abriu como sala' end;

delete from corre_aprovacoes where marca_id in ('00000000-0000-0000-0000-0000000512a1', '00000000-0000-0000-0000-0000000512a2');
delete from corre_caderno where dono = '00000000-0000-0000-0000-000000051201';
delete from corre_posts where dono = '00000000-0000-0000-0000-000000051201';
delete from corre_vendas where id in ('00000000-0000-0000-0000-0000000512b1', '00000000-0000-0000-0000-0000000512b2');
