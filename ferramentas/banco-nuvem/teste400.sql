\set ON_ERROR_STOP 1
-- v4.0: o Link na bio (o banco limpa o que chega), os números da página e o convite que rende correal
create function pg_temp.como(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false), set_config('request.jwt.claim.role', 'authenticated', false) $$;
create function pg_temp.anon() returns void language sql as $$ select set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claim.role', 'anon', false) $$;
insert into corre_perfis (id, handle, nome) values
  ('00000000-0000-0000-0000-0000000004a1', 'bio400', 'Dona da bio'),
  ('00000000-0000-0000-0000-0000000004a2', 'novo400', 'Chegou agora'),
  ('00000000-0000-0000-0000-0000000004a3', 'velho400', 'Já tava'),
  ('00000000-0000-0000-0000-0000000004a4', 'outro400', 'Outro novo') on conflict do nothing;
update corre_perfis set created_at = now() - interval '5 days' where id = '00000000-0000-0000-0000-0000000004a3';

-- 1) a página: o banco limpa os links (javascript: sai, título vazio sai, só 12), a cor fora do #RRGGBB sai, o logo de fora sai
select pg_temp.como('00000000-0000-0000-0000-0000000004a1');
set role authenticated;
update corre_perfis set bio_link = jsonb_build_object('tema', 'marca', 'frase', repeat('a', 300),
  'links', (select jsonb_agg(x) from (select jsonb_build_object('t', 'Link ' || i, 'u', 'https://exemplo.com/' || i) x from generate_series(1, 15) i) y)
           || '[{"t":"mau","u":"javascript:alert(1)"},{"t":"","u":"https://vazio.com"}]'::jsonb,
  'mv', '{"fundo":"#112233","texto":"red;}","cor":"#ABCDEF","logo":"https://outro.com/x.png","fd":"inter-black"}'::jsonb,
  'pix', '{"chave":"a@b.com","nome":"Dona","lixo":1}'::jsonb)
  where id = '00000000-0000-0000-0000-0000000004a1';
reset role;
select case when (select jsonb_array_length(bio_link->'links') = 12 and bio_link->'links'->0->>'u' = 'https://exemplo.com/1'
                     and not exists (select 1 from jsonb_array_elements(bio_link->'links') l where l->>'u' like 'javascript%')
                     and char_length(bio_link->>'frase') = 140 from corre_perfis where id = '00000000-0000-0000-0000-0000000004a1')
  then 'ok: os links: só 12, nada de javascript:, a frase cortada em 140' else 'FALHOU: limpeza dos links: ' || (select bio_link::text from corre_perfis where id = '00000000-0000-0000-0000-0000000004a1') end;
select case when (select bio_link->'mv' = '{"fundo":"#112233","cor":"#ABCDEF","fd":"inter-black"}'::jsonb and bio_link->'pix' = '{"chave":"a@b.com","nome":"Dona"}'::jsonb
                  from corre_perfis where id = '00000000-0000-0000-0000-0000000004a1')
  then 'ok: a marca congelada só com cor #RRGGBB, letra do Studio e logo do Storage; o Pix só com chave e nome' else 'FALHOU: mv/pix: ' || (select (bio_link->'mv')::text || (bio_link->'pix')::text from corre_perfis where id = '00000000-0000-0000-0000-0000000004a1') end;

-- 2) os números: o visitante marca, o dono não conta, só o dono lê, lixo não entra
select pg_temp.anon(); set role anon;
select corre_bio_marca('bio400', 'visita'); select corre_bio_marca('BIO400', 'visita'); select corre_bio_marca('bio400', 'w'); select corre_bio_marca('bio400', 'l3');
select corre_bio_marca('bio400', 'Nada Disso!'); select corre_bio_marca('ninguem400', 'visita');
reset role;
select pg_temp.como('00000000-0000-0000-0000-0000000004a1'); set role authenticated;
select corre_bio_marca('bio400', 'visita');
create temp table n1 as select corre_bio_numeros(30) r;
reset role;
select case when (select (r->>'visitas')::int = 2 and (r->'toques'->>'w')::int = 1 and (r->'toques'->>'l3')::int = 1 and jsonb_array_length(r->'porDia') = 1 from n1)
  then 'ok: duas visitas e dois toques; a visita do dono e a chave torta não contaram' else 'FALHOU: números: ' || (select r::text from n1) end;
select pg_temp.como('00000000-0000-0000-0000-0000000004a2'); set role authenticated;
create temp table n2 as select (select count(*) from corre_bio_conta) c, corre_bio_numeros(30) r;
reset role;
select case when (select c = 0 and (r->>'visitas')::int = 0 from n2) then 'ok: os números da Dona são só dela' else 'FALHOU: outro lê os números' end;
select pg_temp.anon(); set role anon;
do $$ begin perform corre_bio_numeros(30); raise notice 'FALHOU: anon leu números'; exception when insufficient_privilege then raise notice 'ok: sem login não lê números'; end $$;
reset role;
select case when has_function_privilege('anon', 'corre_bio_numeros(integer)', 'execute') then 'FALHOU: anon executa corre_bio_numeros' else 'ok: sem login não executa corre_bio_numeros' end;

-- 3) o convite: o novo ganha as boas-vindas e quem chamou ganha; uma vez só; perfil velho não; a si mesmo não
select pg_temp.como('00000000-0000-0000-0000-0000000004a2'); set role authenticated;
create temp table c1 as select corre_convite_aceita('bio400') r;
create temp table c2 as select corre_convite_aceita('bio400') r;
reset role;
select case when (select (r->>'ok')::boolean and (r->>'ganhou')::numeric = 0.50 and (r->>'pagou_quem_chamou')::boolean from c1)
              and (select saldo from corre_correal where dono = '00000000-0000-0000-0000-0000000004a2') = 0.50
              and (select saldo from corre_correal where dono = '00000000-0000-0000-0000-0000000004a1') = 0.50
  then 'ok: entrou pelo convite: 0,50 pra quem chegou e 0,50 pra quem chamou' else 'FALHOU: convite: ' || (select r::text from c1) end;
select case when (select r->>'motivo' = 'ja' from c2) and (select saldo from corre_correal where dono = '00000000-0000-0000-0000-0000000004a1') = 0.50
  then 'ok: o mesmo convite não paga duas vezes' else 'FALHOU: pagou de novo: ' || (select r::text from c2) end;
select pg_temp.como('00000000-0000-0000-0000-0000000004a3'); set role authenticated;
create temp table c3 as select corre_convite_aceita('bio400') r;
reset role;
select pg_temp.como('00000000-0000-0000-0000-0000000004a4'); set role authenticated;
create temp table c4 as select corre_convite_aceita('outro400') r;
create temp table c5 as select corre_convites_meus() r;
reset role;
select case when (select r->>'motivo' = 'velho' from c3) and (select r->>'motivo' = 'quem' from c4)
  then 'ok: perfil de 5 dias e convite de si mesmo não valem' else 'FALHOU: velho/si mesmo: ' || (select r::text from c3) || (select r::text from c4) end;
select pg_temp.como('00000000-0000-0000-0000-0000000004a1'); set role authenticated;
create temp table c6 as select corre_convites_meus() r;
reset role;
select case when (select (r->>'n')::int = 1 and (r->>'ganho')::numeric = 0.50 and r->'gente'->0->>'handle' = 'novo400' from c6) and (select (r->>'n')::int = 0 from c5)
  then 'ok: quem chamou vê quem entrou e quanto rendeu' else 'FALHOU: convites_meus: ' || (select r::text from c6) end;
-- o teto: depois de 10 pagos, quem chamou não ganha mais (quem chega ganha)
insert into corre_perfis (id, handle, nome) select ('00000000-0000-0000-0000-0000000005' || lpad(i::text, 2, '0'))::uuid, 'teto400_' || i, 'T' || i from generate_series(1, 11) i on conflict do nothing;
do $$ declare i int; r jsonb; begin
  for i in 1..11 loop
    perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000005' || lpad(i::text, 2, '0'), false);
    set local role authenticated; r := corre_convite_aceita('velho400'); reset role;
  end loop;
  raise notice '%', case when (select ganho from corre_correal where dono = '00000000-0000-0000-0000-0000000004a3') = 5.00
                          and (select saldo from corre_correal where dono = '00000000-0000-0000-0000-000000000511') = 0.50
    then 'ok: o teto: quem chamou ganha até 10 convites (5,00); o 11º que chegou ganha as boas-vindas' else 'FALHOU: teto do convite' end;
end $$;
select case when (select count(*) from corre_correal_log where motivo like 'convite:%' and (valor > 1 or valor < -1)) = 0
  then 'ok: cada linha do extrato do convite cabe na trava (-1 a 1)' else 'FALHOU: linha do convite fora da trava' end;
select case when not has_table_privilege('authenticated', 'corre_convites', 'insert') and not has_table_privilege('anon', 'corre_bio_conta', 'select')
  then 'ok: ninguém escreve convite direto e sem login não lê os números' else 'FALHOU: grants das tabelas novas' end;
