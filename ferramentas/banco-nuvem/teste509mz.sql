\set ON_ERROR_STOP 1
-- v5.09 · o Muralzim: o cartaz aberto, vender só com a conta de recebimento aprovada, a taxa de 10% (mínimo R$ 2) paga
-- por quem compra, a reserva que segura o lugar, pagar, o valor menor que não libera, a portaria, a desistência e o
-- evento que não some com ingresso vendido.
create function pg_temp.como(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false), set_config('request.jwt.claim.role', 'authenticated', false) $$;
create function pg_temp.anon() returns void language sql as $$ select set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claim.role', 'anon', false) $$;
create function pg_temp.servidor() returns void language sql as $$ select set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claim.role', 'service_role', false) $$;
insert into corre_perfis (id, handle, nome) values
  ('00000000-0000-0000-0000-0000005090a1', 'casadoshow', 'Casa do Show'),
  ('00000000-0000-0000-0000-0000005090a2', 'ana509', 'Ana Souza'),
  ('00000000-0000-0000-0000-0000005090a3', 'bia509', 'Bia Lima') on conflict do nothing;
create temp table rz (k text primary key, v jsonb);
grant all on rz to authenticated, anon, service_role;
create function pg_temp.erro(f text) returns text language plpgsql as $$
begin execute f; return 'passou'; exception when others then return coalesce(nullif(sqlerrm, ''), 'erro'); end $$;

-- 1) divulgar de graça e a lista aberta
select pg_temp.como('00000000-0000-0000-0000-0000005090a1'); set role authenticated;
insert into rz select 'g', corre_evento_salva(jsonb_build_object('titulo', 'Sarau no Zerão', 'categoria', 'arte', 'classif', 'L', 'dia', current_date + 5,
  'inicio', '19:00', 'local', 'Zerão', 'cidade', 'Londrina', 'entrada', 'gratis'));
reset role; select pg_temp.anon(); set role anon;
insert into rz select 'lista', corre_eventos_lista(null);
reset role;
select case when (select (v->>'ok')::boolean from rz where k = 'g')
             and (select jsonb_array_length(v) from rz where k = 'lista') >= 1
             and (select v #>> '{0,quem,handle}' from rz where k = 'lista') = 'casadoshow'
             and not has_table_privilege('anon', 'corre_eventos', 'select')
  then 'ok: divulgou o sarau de graça e a lista abre sem login (com o @ de quem divulgou)' else format('FALHOU: divulgar e listar %s', (select v from rz where k = 'g')) end;

-- 2) vender pelo Corre sem a conta de recebimento aprovada não dá
select pg_temp.como('00000000-0000-0000-0000-0000005090a1'); set role authenticated;
insert into rz select 'semorg', to_jsonb(pg_temp.erro(format($q$select corre_evento_salva('{"titulo":"Show do Tubarão","categoria":"musica","dia":"%s","inicio":"21:00","local":"Galpão","entrada":"corre","lotes":[{"nome":"Inteira","preco":50,"qtd":3}]}'::jsonb)$q$, current_date + 20)));
reset role;
select pg_temp.servidor(); set role service_role;
insert into rz select 'o1', corre_org_salva('00000000-0000-0000-0000-0000005090a1', '{"tipo":"sub","asaas_id":"acc_1","wallet":"11111111-2222-3333-4444-555555555555","status":"pendente","nome":"Casa do Show","email":"show@exemplo.com","chave":"cifrada"}');
reset role;
select pg_temp.como('00000000-0000-0000-0000-0000005090a1'); set role authenticated;
insert into rz select 'pend', to_jsonb(pg_temp.erro(format($q$select corre_evento_salva('{"titulo":"Show do Tubarão","categoria":"musica","dia":"%s","inicio":"21:00","local":"Galpão","entrada":"corre","lotes":[{"nome":"Inteira","preco":50,"qtd":3}]}'::jsonb)$q$, current_date + 20)));
insert into rz select 'meu', corre_org_meu();
reset role;
select case when (select v #>> '{}' from rz where k = 'semorg') = 'org' and (select v #>> '{}' from rz where k = 'pend') = 'org'
             and (select v->>'status' from rz where k = 'meu') = 'pendente' and not (select v ? 'chave' from rz where k = 'meu')
             and (select v->>'wallet_fim' from rz where k = 'meu') = '5555'
  then 'ok: sem a conta aprovada não vende, e o app vê a situação sem a chave' else format('FALHOU: vender sem conta %s %s', (select v from rz where k = 'semorg'), (select v from rz where k = 'meu')) end;

-- 3) com a conta aprovada, divulga com inteira e meia; a taxa é do banco (10%, mínimo R$ 2)
select pg_temp.servidor(); set role service_role;
insert into rz select 'o2', corre_org_situacao('00000000-0000-0000-0000-0000005090a1', 'aprovada', null);
reset role;
select pg_temp.como('00000000-0000-0000-0000-0000005090a1'); set role authenticated;
insert into rz select 'v', corre_evento_salva(jsonb_build_object('titulo', 'Show do Tubarão', 'categoria', 'musica', 'classif', '16', 'dia', current_date + 10,
  'inicio', '21:00', 'local', 'Galpão', 'cidade', 'Londrina', 'entrada', 'corre',
  'lotes', jsonb_build_array(jsonb_build_object('nome', 'Inteira', 'preco', 50, 'qtd', 3), jsonb_build_object('nome', 'Meia-entrada', 'preco', 25, 'qtd', 2, 'meia', true))));
reset role;
insert into rz select 'ev', corre_evento_ver(((select v->>'id' from rz where k = 'v'))::uuid);
select case when (select v->>'vende' from rz where k = 'ev') = 'true'
             and (select v #>> '{lotes,0,taxa}' from rz where k = 'ev')::numeric = 5 and (select v #>> '{lotes,1,taxa}' from rz where k = 'ev')::numeric = 2.5
             and corre_ing_taxa(12) = 2 and (select v #>> '{lotes,0,restam}' from rz where k = 'ev')::int = 3
  then 'ok: com a conta aprovada vende; taxa de R$ 5 na inteira de 50, R$ 2,50 na meia e o mínimo de R$ 2' else format('FALHOU: o evento com ingresso %s', (select v from rz where k = 'ev')) end;

-- 4) a compra: 2 inteiras e 1 meia (o app não chama; o servidor reserva)
do $$ begin
  perform pg_temp.servidor(); set local role authenticated;
  begin perform corre_ingresso_reserva('00000000-0000-0000-0000-0000005090a2', (select (v->>'id')::uuid from rz where k = 'v'), '[]', 'pix', '2026-10-29', '');
    insert into rz values ('appres', '"passou"');
  exception when insufficient_privilege then insert into rz values ('appres', '"barrou"'); end;
end $$;
reset role;
select pg_temp.servidor(); set role service_role;
insert into rz select 'r1', corre_ingresso_reserva('00000000-0000-0000-0000-0000005090a2', (select (v->>'id')::uuid from rz where k = 'v'),
  jsonb_build_array(jsonb_build_object('lote', (select v #>> '{lotes,0,id}' from rz where k = 'ev'), 'qtd', 2), jsonb_build_object('lote', (select v #>> '{lotes,1,id}' from rz where k = 'ev'), 'qtd', 1)),
  'pix', '2026-10-29', 'Ana Souza');
insert into rz select 'r2', corre_ingresso_reserva('00000000-0000-0000-0000-0000005090a3', (select (v->>'id')::uuid from rz where k = 'v'),
  jsonb_build_array(jsonb_build_object('lote', (select v #>> '{lotes,0,id}' from rz where k = 'ev'), 'qtd', 2)), 'cartao', '2026-10-29', '');
reset role;
select case when (select v #>> '{}' from rz where k = 'appres') = 'barrou'
             and (select (v->>'total')::numeric from rz where k = 'r1') = 137.5 and (select (v->>'valor')::numeric from rz where k = 'r1') = 125
             and (select (v->>'taxa')::numeric from rz where k = 'r1') = 12.5 and (select v->>'wallet' from rz where k = 'r1') = '11111111-2222-3333-4444-555555555555'
             and (select count(*) from corre_ingressos where pedido = (select (v->>'pedido')::uuid from rz where k = 'r1') and codigo ~ '^[A-HJ-NP-Z2-9]{12}$' and status = 'pendente') = 3
             and (select v->>'motivo' from rz where k = 'r2') = 'esgotou'
  then 'ok: reservou 3 (R$ 125 do organizador + R$ 12,50 de taxa = R$ 137,50), um código por ingresso, e a reserva segura o lugar' else format('FALHOU: a reserva %s / %s', (select v from rz where k = 'r1'), (select v from rz where k = 'r2')) end;

-- 5) a cobrança, o valor menor que não libera, e o pago
select pg_temp.servidor(); set role service_role;
insert into rz select 'cb', corre_ingresso_cobranca((select (v->>'pedido')::uuid from rz where k = 'r1'), 'pay_509a', 'https://www.asaas.com/i/509a');
insert into rz select 'menor', corre_ingresso_paga('pay_509a', 125);
insert into rz select 'pg', corre_ingresso_paga('pay_509a', 137.5);
insert into rz select 'pg2', corre_ingresso_paga('pay_509a', 137.5);
reset role;
select case when (select v->>'motivo' from rz where k = 'menor') = 'valor' and (select (v->>'ok')::boolean from rz where k = 'pg')
             and (select (v->>'ja')::boolean from rz where k = 'pg2')
             and (select count(*) from corre_ingressos where pedido = (select (v->>'pedido')::uuid from rz where k = 'r1') and status = 'valido') = 3
             and (select status from corre_ingresso_pedidos where asaas_cobranca = 'pay_509a') = 'pago'
  then 'ok: pagou menos não libera; pagou o total, os 3 valem (e o aviso repetido não muda nada)' else format('FALHOU: pagar %s %s', (select v from rz where k = 'menor'), (select v from rz where k = 'pg')) end;

-- 6) o aviso no celular: um pro organizador e um pra quem comprou, uma vez só
insert into corre_push (endpoint, dono, p256dh, auth) values ('https://fcm.googleapis.com/x509a1', '00000000-0000-0000-0000-0000005090a1', 'k', 'a'),
  ('https://fcm.googleapis.com/x509a2', '00000000-0000-0000-0000-0000005090a2', 'k', 'a') on conflict do nothing;
insert into rz select 'al1', corre_ingresso_alvos(now());
insert into rz select 'al2', corre_ingresso_alvos(now());
select case when (select jsonb_array_length(v) from rz where k = 'al1') = 2 and (select jsonb_array_length(v) from rz where k = 'al2') = 0
             and (select v #>> '{0,payload,titulo}' from rz where k = 'al1') = 'Vendeu 3 ingressos: Show do Tubarão'
             and (select v #>> '{1,payload,url}' from rz where k = 'al1') = '/#/muralzim/ingressos'
             and not has_function_privilege('authenticated', 'corre_ingresso_alvos(timestamptz)', 'execute')
  then 'ok: o aviso de quem vendeu e de quem comprou sai uma vez' else format('FALHOU: os avisos %s', (select v from rz where k = 'al1')) end;

-- 7) os meus ingressos e o ingresso pelo código: quem não é dono nem comprador vê só o primeiro nome
select pg_temp.como('00000000-0000-0000-0000-0000005090a2'); set role authenticated;
insert into rz select 'meus', corre_ingressos_meus();
reset role;
insert into rz select 'cod', to_jsonb((select codigo from corre_ingressos where pedido = (select (v->>'pedido')::uuid from rz where k = 'r1') order by criado_em limit 1));
select pg_temp.como('00000000-0000-0000-0000-0000005090a3'); set role authenticated;
insert into rz select 'outro', corre_ingresso_ver((select v #>> '{}' from rz where k = 'cod'));
reset role;
select case when (select jsonb_array_length(v #> '{0,ingressos}') from rz where k = 'meus') = 3 and (select v #>> '{0,status}' from rz where k = 'meus') = 'pago'
             and (select v->>'portador' from rz where k = 'outro') = 'Ana' and (select v->>'meu' from rz where k = 'outro') = 'false'
  then 'ok: Ana vê os 3 ingressos; outra pessoa com o código vê só o primeiro nome' else format('FALHOU: ingressos %s', (select v from rz where k = 'outro')) end;

-- 8) a portaria: só o dono do evento valida; entrou, não entra de novo; desfazer
select pg_temp.como('00000000-0000-0000-0000-0000005090a3'); set role authenticated;
insert into rz select 'pt0', corre_ingresso_valida((select v #>> '{}' from rz where k = 'cod'), false);
reset role;
select pg_temp.como('00000000-0000-0000-0000-0000005090a1'); set role authenticated;
insert into rz select 'pt1', corre_ingresso_valida(lower((select v #>> '{}' from rz where k = 'cod')), false);
insert into rz select 'pt2', corre_ingresso_valida((select v #>> '{}' from rz where k = 'cod'), false);
insert into rz select 'pt3', corre_ingresso_valida((select v #>> '{}' from rz where k = 'cod'), true);
insert into rz select 'pt4', corre_ingresso_valida((select v #>> '{}' from rz where k = 'cod'), false);
insert into rz select 'vd', corre_evento_vendas((select (v->>'id')::uuid from rz where k = 'v'));
reset role;
select case when (select v->>'motivo' from rz where k = 'pt0') = 'outro_evento' and (select (v->>'ok')::boolean from rz where k = 'pt1')
             and (select v->>'motivo' from rz where k = 'pt2') = 'usado' and (select (v->>'desfez')::boolean from rz where k = 'pt3')
             and (select (v->>'ok')::boolean from rz where k = 'pt4')
             and (select (v #>> '{lotes,0,vendidos}')::int from rz where k = 'vd') = 2 and (select (v #>> '{lotes,0,usados}')::int from rz where k = 'vd') + (select (v #>> '{lotes,1,usados}')::int from rz where k = 'vd') = 1
  then 'ok: a portaria: outro evento não valida, entrou uma vez, desfazer e as vendas por tipo' else format('FALHOU: a portaria %s %s', (select v from rz where k = 'pt1'), (select v from rz where k = 'pt2')) end;

-- 9) com ingresso vendido, o evento não some nem é cancelado pelo app; nem a conta do organizador é apagada
select pg_temp.como('00000000-0000-0000-0000-0000005090a1'); set role authenticated;
insert into rz select 'apaga', to_jsonb(pg_temp.erro(format($q$select corre_evento_status('%s', 'apagado')$q$, (select v->>'id' from rz where k = 'v'))));
insert into rz select 'gratis', to_jsonb(pg_temp.erro(format($q$select corre_evento_salva('{"id":"%s","titulo":"Show do Tubarão","categoria":"musica","dia":"%s","inicio":"21:00","local":"Galpão","entrada":"gratis"}'::jsonb)$q$,
  (select v->>'id' from rz where k = 'v'), current_date + 10)));
reset role;
-- (apagar a conta é pelo servidor, com o login de quem pede: o gatilho olha o papel do login, como o da v3.61)
insert into rz select 'conta', to_jsonb(pg_temp.erro($q$delete from corre_perfis where id = '00000000-0000-0000-0000-0000005090a1'$q$));
select case when (select v #>> '{}' from rz where k = 'apaga') = 'tem_vendidos' and (select v #>> '{}' from rz where k = 'gratis') = 'tem_vendidos'
             and (select v #>> '{}' from rz where k = 'conta') ~ 'ingresso vendido'
  then 'ok: com ingresso vendido não apaga, não vira grátis, e a conta do organizador não some' else format('FALHOU: proteger quem comprou %s / %s / %s', (select v from rz where k = 'apaga'), (select v from rz where k = 'gratis'), (select v from rz where k = 'conta')) end;

-- 10) a reserva que venceu: o lugar volta; pagou depois e ainda tem lugar, vale; o dinheiro voltou, deixa de valer
select pg_temp.servidor(); set role service_role;
insert into rz select 'r3', corre_ingresso_reserva('00000000-0000-0000-0000-0000005090a3', (select (v->>'id')::uuid from rz where k = 'v'),
  jsonb_build_array(jsonb_build_object('lote', (select v #>> '{lotes,1,id}' from rz where k = 'ev'), 'qtd', 1)), 'cartao', '2026-10-29', 'Bia Lima');
insert into rz select 'cb3', corre_ingresso_cobranca((select (v->>'pedido')::uuid from rz where k = 'r3'), 'pay_509b', '');
reset role;
update corre_ingresso_pedidos set reserva_ate = now() - interval '1 minute' where asaas_cobranca = 'pay_509b';
select pg_temp.servidor(); set role service_role;
insert into rz select 'r4', corre_ingresso_reserva('00000000-0000-0000-0000-0000005090a2', (select (v->>'id')::uuid from rz where k = 'v'),
  jsonb_build_array(jsonb_build_object('lote', (select v #>> '{lotes,1,id}' from rz where k = 'ev'), 'qtd', 1)), 'pix', '2026-10-29', '');
insert into rz select 'tarde', corre_ingresso_paga('pay_509b', 27.5);
insert into rz select 'volta', corre_ingresso_volta('pay_509a', true);
reset role;
select case when (select v #>> '{velhos,0,cobranca}' from rz where k = 'r4') = 'pay_509b' and (select (v->>'ok')::boolean from rz where k = 'r4')
             and (select (v->>'devolver')::boolean from rz where k = 'tarde') and (select v->>'motivo' from rz where k = 'tarde') = 'esgotou'
             and (select count(*) from corre_ingressos where pedido = (select (v->>'pedido')::uuid from rz where k = 'r1') and status = 'estornado') = 3
             and (select desistiu_em is not null from corre_ingresso_pedidos where asaas_cobranca = 'pay_509a')
  then 'ok: a reserva vencida liberou a meia pra outra pessoa; quem pagou atrasado sem lugar recebe de volta; o estorno tira os ingressos' else format('FALHOU: reserva vencida %s / %s', (select v from rz where k = 'r4'), (select v from rz where k = 'tarde')) end;

-- 11) denunciar e tirar do ar (só os donos do Corre)
select pg_temp.como('00000000-0000-0000-0000-0000005090a3'); set role authenticated;
insert into rz select 'den', corre_evento_denuncia((select (v->>'id')::uuid from rz where k = 'g'), 'golpe', 'não existe');
insert into rz select 'ocu', to_jsonb(pg_temp.erro(format($q$select corre_evento_oculta('%s', true)$q$, (select v->>'id' from rz where k = 'g'))));
reset role;
select case when (select (v->>'ok')::boolean from rz where k = 'den') and (select v #>> '{}' from rz where k = 'ocu') = 'so_dono'
             and (select count(*) from corre_evento_denuncias where evento = (select (v->>'id')::uuid from rz where k = 'g')) = 1
  then 'ok: qualquer um denuncia; tirar do ar é só dos donos do Corre' else format('FALHOU: denunciar %s / %s', (select v from rz where k = 'den'), (select v from rz where k = 'ocu')) end;
