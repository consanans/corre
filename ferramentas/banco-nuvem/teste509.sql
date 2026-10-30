\set ON_ERROR_STOP 1
-- v5.09: o link do perfil (só https), o aniversário (dia e mês no perfil; a data inteira só a pessoa lê) e a multa de
-- quem é preso no Correverso (0,02 por estrela, uma por prisão, até 0,30 por dia, nunca deixa o saldo negativo).
create function pg_temp.como(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false), set_config('request.jwt.claim.role', 'authenticated', false) $$;
insert into corre_perfis (id) values ('00000000-0000-0000-0000-000000050901'), ('00000000-0000-0000-0000-000000050902') on conflict do nothing;
update corre_perfis set link = '', aniver = '' where id in ('00000000-0000-0000-0000-000000050901', '00000000-0000-0000-0000-000000050902');
insert into corre_correal (dono, saldo, ganho, gasto) values ('00000000-0000-0000-0000-000000050901', 1, 1, 0), ('00000000-0000-0000-0000-000000050902', 0, 0, 0)
  on conflict (dono) do update set saldo = excluded.saldo, ganho = excluded.ganho, gasto = 0;
create temp table r509 (k text primary key, v jsonb);
grant all on r509 to authenticated, anon, service_role;

-- 1) o link: https de verdade entra; javascript, http e coisa sem domínio não
do $$
declare ruins int := 0; t text;
begin
  update corre_perfis set link = 'https://houzirecords.com.br/portfolio?x=1#topo' where id = '00000000-0000-0000-0000-000000050901';
  foreach t in array array['javascript:alert(1)', 'http://site.com', 'https://', 'https://semponto', 'https://site.com/"><script>'] loop
    begin
      update corre_perfis set link = t where id = '00000000-0000-0000-0000-000000050902';
    exception when check_violation then ruins := ruins + 1;
    end;
  end loop;
  insert into r509 values ('link', to_jsonb(ruins));
end $$;
select case when (select link from corre_perfis where id = '00000000-0000-0000-0000-000000050901') = 'https://houzirecords.com.br/portfolio?x=1#topo'
             and (select (v)::int from r509 where k = 'link') = 5
  then 'ok: o link https entra e os 5 ruins (javascript, http, sem domínio, aspas) não' else format('FALHOU: o link do perfil (%s recusados)', (select v from r509 where k = 'link')) end;

-- 2) o aniver do perfil só aceita MM-DD
do $$
begin
  begin
    update corre_perfis set aniver = '13-01' where id = '00000000-0000-0000-0000-000000050902';
    insert into r509 values ('aniver', '"passou"');
  exception when check_violation then insert into r509 values ('aniver', '"barrou"');
  end;
end $$;
select case when (select v #>> '{}' from r509 where k = 'aniver') = 'barrou' then 'ok: o aniver do perfil só aceita mês e dia de verdade' else 'FALHOU: o aniver aceitou 13-01' end;

-- 3) salvar a data: o perfil mostra só o dia e o mês; a data inteira fica à parte
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000050901');
insert into r509 select 's1', corre_nascimento_salva('1990-03-12', true);
insert into r509 select 'le1', to_jsonb((select nasceu from corre_nascimento where dono = '00000000-0000-0000-0000-000000050901'));
reset role;
select case when (select (v->>'ok')::boolean from r509 where k = 's1') and (select aniver from corre_perfis where id = '00000000-0000-0000-0000-000000050901') = '03-12'
             and (select v #>> '{}' from r509 where k = 'le1') = '1990-03-12'
  then 'ok: salvou 12/03/1990, o perfil mostra 03-12 e a pessoa lê a data inteira' else format('FALHOU: salvar a data %s', (select v from r509 where k = 's1')) end;

-- 4) outra pessoa não lê a data de ninguém, e ninguém do app escreve na tabela direto
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000050902');
insert into r509 select 'outro', to_jsonb((select count(*) from corre_nascimento));
reset role;
select case when (select (v)::int from r509 where k = 'outro') = 0 and not has_table_privilege('authenticated', 'corre_nascimento', 'insert')
             and not has_table_privilege('authenticated', 'corre_nascimento', 'update') and not has_table_privilege('anon', 'corre_nascimento', 'select')
  then 'ok: a data só a dona lê, e ninguém do app escreve direto' else 'FALHOU: a data de nascimento vazou ou dá pra escrever direto' end;

-- 5) esconder o aniversário, data no futuro, e apagar a data
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000050901');
insert into r509 select 's2', corre_nascimento_salva('1990-03-12', false);
insert into r509 select 'futuro', corre_nascimento_salva(((now() at time zone 'America/Sao_Paulo')::date + 1), true);
reset role;
select case when (select aniver from corre_perfis where id = '00000000-0000-0000-0000-000000050901') = ''
             and (select v->>'motivo' from r509 where k = 'futuro') = 'data'
             and (select nasceu from corre_nascimento where dono = '00000000-0000-0000-0000-000000050901') = '1990-03-12'
  then 'ok: escondeu o aniversário (a data fica) e data no futuro não entra' else format('FALHOU: esconder ou data no futuro %s', (select v from r509 where k = 'futuro')) end;
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000050901');
insert into r509 select 's3', corre_nascimento_salva(null, true);
reset role;
select case when (select nasceu from corre_nascimento where dono = '00000000-0000-0000-0000-000000050901') is null
             and (select aniver from corre_perfis where id = '00000000-0000-0000-0000-000000050901') = ''
  then 'ok: apagar a data deixa vazio, sem aniversário no perfil' else 'FALHOU: apagar a data de nascimento' end;

-- 6) a multa: 3 estrelas = 0,06; logo em seguida não cobra de novo
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000050901');
insert into r509 select 'm1', corre_correal_multa(3);
insert into r509 select 'm2', corre_correal_multa(5);
reset role;
select case when (select (v->>'perdeu')::numeric from r509 where k = 'm1') = 0.06 and (select saldo from corre_correal where dono = '00000000-0000-0000-0000-000000050901') = 0.94
             and exists (select 1 from corre_correal_log where dono = '00000000-0000-0000-0000-000000050901' and motivo = 'multa:preso' and valor = -0.06)
             and (select v->>'motivo' from r509 where k = 'm2') = 'ja'
  then 'ok: preso com 3 estrelas perdeu 0,06, no extrato, e a mesma prisão não cobra duas vezes' else format('FALHOU: a multa %s / %s', (select v from r509 where k = 'm1'), (select v from r509 where k = 'm2')) end;

-- 7) o teto do dia (0,30): com 0,26 já pago hoje, a de 5 estrelas cobra só os 0,04 que faltam
update corre_correal_log set created_at = now() - interval '3 minutes' where dono = '00000000-0000-0000-0000-000000050901' and motivo like 'multa:%';
insert into corre_correal_log (dono, valor, motivo, created_at) values ('00000000-0000-0000-0000-000000050901', -0.20, 'multa:preso', now() - interval '3 minutes');
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000050901');
insert into r509 select 'm3', corre_correal_multa(5);
reset role;
select case when (select (v->>'perdeu')::numeric from r509 where k = 'm3') = 0.04 and (select (v->>'multas')::numeric from r509 where k = 'm3') = 0.30
  then 'ok: o teto de 0,30 por dia corta a multa' else format('FALHOU: o teto da multa %s', (select v from r509 where k = 'm3')) end;

-- 8) quem tá liso não fica negativo, e o anon não chama
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-000000050902');
insert into r509 select 'liso', corre_correal_multa(5);
reset role;
select case when (select (v->>'perdeu')::numeric from r509 where k = 'liso') = 0 and (select v->>'motivo' from r509 where k = 'liso') = 'liso'
             and (select saldo from corre_correal where dono = '00000000-0000-0000-0000-000000050902') = 0
             and not has_function_privilege('anon', 'corre_correal_multa(integer)', 'execute')
             and not has_function_privilege('anon', 'corre_nascimento_salva(date, boolean)', 'execute')
  then 'ok: liso não fica negativo, e quem não entrou não chama' else format('FALHOU: a multa de quem tá liso %s', (select v from r509 where k = 'liso')) end;

-- 9) o ajuste com o que mudar (o link de aprovação): os itens que valem, sem repetir; o aprovar limpa; o app do dono só limpa
insert into corre_perfis (id, handle, nome) values ('00000000-0000-0000-0000-000000050903', 'agencia509', 'Agência 509') on conflict do nothing;
insert into corre_portfolio (id, dono, marca, rede, cor) values ('00000000-0000-0000-0000-0000000509a1', '00000000-0000-0000-0000-000000050903', 'Café 509', 'cafe509', '#FF48B0') on conflict do nothing;
insert into corre_posts (id, dono, marca_id, data, hora, midia_url, formato, midias, status) values ('00000000-0000-0000-0000-0000000509b1', '00000000-0000-0000-0000-000000050903', '00000000-0000-0000-0000-0000000509a1', current_date + 2, '18:00', 'https://x/c509-1.jpg', 'carrossel', '[{"u":"https://x/c509-1.jpg","t":"img"},{"u":"https://x/c509-2.jpg","t":"img"}]', 'pronto') on conflict do nothing;
select pg_temp.como('00000000-0000-0000-0000-000000050903'); set role authenticated;
insert into corre_aprovacoes (dono, marca_id, de, ate) values ('00000000-0000-0000-0000-000000050903', '00000000-0000-0000-0000-0000000509a1', current_date, current_date + 30);
reset role;
insert into r509 select 'cod', to_jsonb((select codigo from corre_aprovacoes where marca_id = '00000000-0000-0000-0000-0000000509a1' limit 1));
set role anon;
insert into r509 select 'aj', corre_aprov_ajuste((select v #>> '{}' from r509 where k = 'cod'), '00000000-0000-0000-0000-0000000509b1', array['legenda', 'slide:2', 'zz', 'legenda'], '', 'Marina');
insert into r509 select 'ver', corre_aprov_ver((select v #>> '{}' from r509 where k = 'cod'));
reset role;
select case when (select aprov from corre_posts where id = '00000000-0000-0000-0000-0000000509b1') = 'ajuste'
             and (select aprov_itens from corre_posts where id = '00000000-0000-0000-0000-0000000509b1') = array['legenda', 'slide:2']
             and (select v #> '{posts,0,itens}' from r509 where k = 'ver') = '["legenda", "slide:2"]'::jsonb
  then 'ok: o cliente marcou a legenda e o slide 2 (o item que não existe e o repetido saem) e a página devolve os itens' else format('FALHOU: o ajuste com itens %s', (select v from r509 where k = 'aj')) end;
do $$
begin
  begin
    set local role anon;
    perform corre_aprov_ajuste((select v #>> '{}' from r509 where k = 'cod'), '00000000-0000-0000-0000-0000000509b1', '{}', '', 'Marina');
    insert into r509 values ('vazio', '"passou"');
  exception when others then insert into r509 values ('vazio', to_jsonb(sqlerrm));
  end;
end $$;
reset role;
select case when (select v #>> '{}' from r509 where k = 'vazio') = 'nota' then 'ok: ajuste sem item e sem recado não vale' else format('FALHOU: ajuste vazio %s', (select v from r509 where k = 'vazio')) end;

-- o dono, pelo app: escrever itens não pega; limpar pega
select pg_temp.como('00000000-0000-0000-0000-000000050903'); set role authenticated;
update corre_posts set aprov_itens = array['arte'] where id = '00000000-0000-0000-0000-0000000509b1';
reset role;
select case when (select aprov_itens from corre_posts where id = '00000000-0000-0000-0000-0000000509b1') = array['legenda', 'slide:2']
  then 'ok: o dono não escreve o que o cliente marcou' else 'FALHOU: o app escreveu os itens' end;
set role anon;
insert into r509 select 'ok', corre_aprov_responder((select v #>> '{}' from r509 where k = 'cod'), '00000000-0000-0000-0000-0000000509b1', 'aprovado', '', 'Marina');
reset role;
select case when (select aprov from corre_posts where id = '00000000-0000-0000-0000-0000000509b1') = 'aprovado'
             and cardinality((select aprov_itens from corre_posts where id = '00000000-0000-0000-0000-0000000509b1')) = 0
  then 'ok: aprovar limpa o que tinha sido marcado' else 'FALHOU: aprovar não limpou os itens' end;
do $$
begin
  begin
    update corre_posts set aprov_itens = array['zz'] where id = '00000000-0000-0000-0000-0000000509b1';
    insert into r509 values ('ck', '"passou"');
  exception when check_violation then insert into r509 values ('ck', '"barrou"');
  end;
end $$;
select case when (select v #>> '{}' from r509 where k = 'ck') = 'barrou' then 'ok: item que não existe não entra nem pelo servidor' else 'FALHOU: a regra dos itens' end;
