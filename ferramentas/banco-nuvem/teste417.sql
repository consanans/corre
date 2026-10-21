\set ON_ERROR_STOP 1
-- v4.17: os formatos (carrossel, story, reels), o contêiner do Instagram e o link de aprovação do cliente.
create function pg_temp.como(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false), set_config('request.jwt.claim.role', 'authenticated', false) $$;
create function pg_temp.tenta(q text) returns text language plpgsql as $$
begin execute q; return 'passou'; exception when others then return coalesce(nullif(sqlerrm, ''), 'erro'); end $$;
create temp table ids (k text primary key, v uuid);
grant all on ids to authenticated, anon;
create temp table r (k text primary key, v text);
grant all on r to authenticated, anon;

insert into corre_perfis (id, handle, nome) values ('00000000-0000-0000-0000-000000041701', 'agencia417', 'Agência'),
  ('00000000-0000-0000-0000-000000041702', 'outra417', 'Outra');
insert into corre_portfolio (id, dono, marca, rede, cor) values ('00000000-0000-0000-0000-0000000417a1', '00000000-0000-0000-0000-000000041701', 'Padaria Sol', 'padariasol', '#FFE800'),
  ('00000000-0000-0000-0000-0000000417a2', '00000000-0000-0000-0000-000000041702', 'Outra marca', 'outra', '#FF48B0');
insert into corre_push (endpoint, dono, p256dh, auth, visto_em) values ('https://web.push.apple.com/agencia417', '00000000-0000-0000-0000-000000041701', 'p', 'a', now());

-- 1) os formatos, como a dona (pelo app)
select pg_temp.como('00000000-0000-0000-0000-000000041701'); set role authenticated;
-- (o que a pg_temp.tenta grava só aparece no comando seguinte: o resultado vai pra tabela r e a conferência vem depois)
insert into r select 'feed', pg_temp.tenta($$insert into corre_posts (dono, marca_id, data, hora, midia_url, status) values ('00000000-0000-0000-0000-000000041701', '00000000-0000-0000-0000-0000000417a1', current_date + 2, '18:00', 'https://x/feed.jpg', 'pronto')$$);
select case when (select v from r where k = 'feed') = 'passou'
  and (select formato from corre_posts where midia_url = 'https://x/feed.jpg') = 'feed' then 'ok: post de antes entra como feed' else 'FALHOU: feed' end;
select case when pg_temp.tenta($$insert into corre_posts (dono, marca_id, ig_container) values ('00000000-0000-0000-0000-000000041701', '00000000-0000-0000-0000-0000000417a1', 'abc')$$) = 'ig'
  then 'ok: o app não escreve o contêiner do Instagram' else 'FALHOU: contêiner pelo app' end;
select case when pg_temp.tenta($$insert into corre_posts (dono, marca_id, formato, midias) values ('00000000-0000-0000-0000-000000041701', '00000000-0000-0000-0000-0000000417a1', 'carrossel', '[{"u":"http://x/a.jpg","t":"img"},{"u":"https://x/b.jpg","t":"img"}]')$$) = 'midias'
   and pg_temp.tenta($$insert into corre_posts (dono, marca_id, formato, midias) values ('00000000-0000-0000-0000-000000041701', '00000000-0000-0000-0000-0000000417a1', 'story', '[{"u":"https://x/a.gif","t":"gif"}]')$$) = 'midias'
  then 'ok: mídia sem https ou de tipo estranho é recusada' else 'FALHOU: mídias' end;
select case when pg_temp.tenta($$insert into corre_posts (dono, marca_id, formato, data, hora, midia_url, ig_status, midias) values ('00000000-0000-0000-0000-000000041701', '00000000-0000-0000-0000-0000000417a1', 'carrossel', current_date + 3, '10:00', 'https://x/c1.jpg', 'agendado', '[{"u":"https://x/c1.jpg","t":"img"}]')$$) = 'formato'
  then 'ok: carrossel com 1 slide não programa' else 'FALHOU: carrossel incompleto programou' end;
insert into r select 'car', pg_temp.tenta($$insert into corre_posts (dono, marca_id, formato, data, hora, midia_url, ig_status, status, midias) values ('00000000-0000-0000-0000-000000041701', '00000000-0000-0000-0000-0000000417a1', 'carrossel', current_date + 3, '10:00', 'https://x/c1.jpg', 'agendado', 'pronto', '[{"u":"https://x/c1.jpg","t":"img"},{"u":"https://x/c2.jpg","t":"img"},{"u":"https://x/c3.mp4","t":"video"}]')$$);
select case when (select v from r where k = 'car') = 'passou'
   and (select ig_quando from corre_posts where midia_url = 'https://x/c1.jpg') = ((current_date + 3) + time '10:00') at time zone 'America/Sao_Paulo'
  then 'ok: carrossel com 3 (foto e vídeo) programa, na hora de Brasília' else 'FALHOU: carrossel completo' end;
select case when pg_temp.tenta($$insert into corre_posts (dono, marca_id, formato, data, hora, midia_url, ig_status, midias) values ('00000000-0000-0000-0000-000000041701', '00000000-0000-0000-0000-0000000417a1', 'reels', current_date + 4, '19:00', 'https://x/r.jpg', 'agendado', '[{"u":"https://x/r.jpg","t":"img"}]')$$) = 'formato'
   and pg_temp.tenta($$insert into corre_posts (dono, marca_id, formato, data, hora, midia_url, ig_status, status, midias) values ('00000000-0000-0000-0000-000000041701', '00000000-0000-0000-0000-0000000417a1', 'reels', current_date + 4, '19:00', 'https://x/r.jpg', 'agendado', 'pronto', '[{"u":"https://x/r.mp4","t":"video"}]')$$) = 'passou'
   and pg_temp.tenta($$insert into corre_posts (dono, marca_id, formato, data, hora, midia_url, ig_status, status, midias) values ('00000000-0000-0000-0000-000000041701', '00000000-0000-0000-0000-0000000417a1', 'story', current_date + 4, '09:00', 'https://x/s.jpg', 'agendado', 'pronto', '[{"u":"https://x/s.jpg","t":"img"}]')$$) = 'passou'
  then 'ok: reels só programa com vídeo; story com uma mídia' else 'FALHOU: reels e story' end;
reset role;

-- 2) o contêiner: a função escreve; o app não mexe; trocar a mídia ou reprogramar zera
update corre_posts set ig_container = '{"c":"17890"}' where midia_url = 'https://x/r.jpg';
select pg_temp.como('00000000-0000-0000-0000-000000041701'); set role authenticated;
select case when pg_temp.tenta($$update corre_posts set ig_container = 'x' where midia_url = 'https://x/r.jpg'$$) = 'ig'
  then 'ok: o app não troca o contêiner' else 'FALHOU: app trocou o contêiner' end;
update corre_posts set midias = '[{"u":"https://x/r2.mp4","t":"video"}]' where midia_url = 'https://x/r.jpg';
reset role;
select case when (select ig_container from corre_posts where midia_url = 'https://x/r.jpg') = '' then 'ok: trocou o vídeo, o contêiner velho sai' else 'FALHOU: contêiner ficou' end;

-- 3) o link de aprovação
select pg_temp.como('00000000-0000-0000-0000-000000041701'); set role authenticated;
insert into corre_aprovacoes (dono, marca_id, de, ate, msg, codigo, quem) values ('00000000-0000-0000-0000-000000041701', '00000000-0000-0000-0000-0000000417a1', current_date, current_date + 30, 'Oi, segue novembro', 'facil', 'Eu mesmo');
insert into ids select 'link', id from corre_aprovacoes;
select case when (select length(codigo) from corre_aprovacoes) = 20 and (select codigo from corre_aprovacoes) <> 'facil' and (select quem from corre_aprovacoes) = ''
  then 'ok: o código é sorteado pelo banco (20 letras) e o "quem" é do cliente' else 'FALHOU: código ou quem' end;
select case when pg_temp.tenta($$insert into corre_aprovacoes (dono, marca_id, de, ate) values ('00000000-0000-0000-0000-000000041701', '00000000-0000-0000-0000-0000000417a2', current_date, current_date + 5)$$) like 'marca de outra pessoa%'
   and pg_temp.tenta($$insert into corre_aprovacoes (dono, marca_id, de, ate) values ('00000000-0000-0000-0000-000000041701', '00000000-0000-0000-0000-0000000417a1', current_date, current_date + 200)$$) <> 'passou'
  then 'ok: link de marca de outra pessoa ou de mais de 3 meses é recusado' else 'FALHOU: link inválido passou' end;
reset role;
select pg_temp.como('00000000-0000-0000-0000-000000041702'); set role authenticated;
select case when (select count(*) from corre_aprovacoes) = 0 then 'ok: outra pessoa não vê o link' else 'FALHOU: link vazou' end;
reset role;
-- um post fora do período e um sem arte não aparecem
insert into corre_posts (dono, marca_id, data, hora, midia_url, legenda) values ('00000000-0000-0000-0000-000000041701', '00000000-0000-0000-0000-0000000417a1', current_date + 60, '10:00', 'https://x/longe.jpg', 'longe'),
  ('00000000-0000-0000-0000-000000041701', '00000000-0000-0000-0000-0000000417a1', current_date + 5, '10:00', '', 'sem arte');
create temp table cod as select codigo from corre_aprovacoes;
insert into ids select 'p:' || midia_url, id from corre_posts where midia_url in ('https://x/feed.jpg', 'https://x/c1.jpg', 'https://x/longe.jpg');
grant select on cod to anon;
set role anon;
select case when jsonb_array_length((corre_aprov_ver((select codigo from cod)) -> 'posts')) = 4
   and (corre_aprov_ver((select codigo from cod)) #>> '{marca,nome}') = 'Padaria Sol' and (corre_aprov_ver((select codigo from cod)) ->> 'msg') = 'Oi, segue novembro'
  then 'ok: o cliente (sem login) vê os 4 posts do período com arte, a marca e o recado' else 'FALHOU: ver ' || corre_aprov_ver((select codigo from cod))::text end;
select case when pg_temp.tenta($$select corre_aprov_ver('naoexiste')$$) = 'link' then 'ok: código errado não abre' else 'FALHOU: código errado' end;
select case when (corre_aprov_responder((select codigo from cod), (select v from ids where k = 'p:https://x/feed.jpg'), 'aprovado', '', 'Marina') ->> 'aprov') = 'aprovado'
  then 'ok: o cliente aprova' else 'FALHOU: aprovar' end;
select case when pg_temp.tenta($$select corre_aprov_responder((select codigo from cod), (select v from ids where k = 'p:https://x/c1.jpg'), 'ajuste', '  ', 'Marina')$$) = 'nota'
   and (corre_aprov_responder((select codigo from cod), (select v from ids where k = 'p:https://x/c1.jpg'), 'ajuste', 'Troca a foto do segundo slide', 'Marina') ->> 'aprov') = 'ajuste'
  then 'ok: ajuste precisa dizer o que mudar' else 'FALHOU: ajuste' end;
select case when pg_temp.tenta($$select corre_aprov_responder((select codigo from cod), (select v from ids where k = 'p:https://x/longe.jpg'), 'aprovado', '', 'M')$$) = 'post'
  then 'ok: post fora do período não se aprova pelo link' else 'FALHOU: fora do período' end;
select case when pg_temp.tenta($$select corre_aprov_alvos(now())$$) like 'permission denied%' and pg_temp.tenta($$select corre_aprov_link('x', 'y', 1, 1)$$) like 'permission denied%'
  then 'ok: sem login não chama a lista dos avisos nem a conferência do link' else 'FALHOU: permissões' end;
reset role;
select case when (select aprov || '|' || aprov_quem from corre_posts where midia_url = 'https://x/feed.jpg') = 'aprovado|Marina'
   and (select aprov_nota from corre_posts where midia_url = 'https://x/c1.jpg') = 'Troca a foto do segundo slide'
   and (select aberto_em is not null from corre_aprovacoes)
  then 'ok: a resposta fica no post (quem e o que mudar) e o link marca que foi aberto' else 'FALHOU: resposta' end;

-- 4) a dona não aprova no lugar do cliente; mudou o que ele viu, volta pra ele
select pg_temp.como('00000000-0000-0000-0000-000000041701'); set role authenticated;
update corre_posts set aprov = 'aprovado', aprov_quem = 'Eu' where midia_url = 'https://x/r.jpg';
update corre_posts set data = data + 1 where midia_url = 'https://x/feed.jpg';
update corre_posts set legenda = 'nova legenda' where midia_url = 'https://x/c1.jpg';
reset role;
select case when (select aprov from corre_posts where midia_url = 'https://x/r.jpg') = '' and (select aprov_quem from corre_posts where midia_url = 'https://x/r.jpg') = ''
  then 'ok: a dona não marca aprovado' else 'FALHOU: dona aprovou' end;
select case when (select aprov from corre_posts where midia_url = 'https://x/feed.jpg') = 'aprovado'
   and (select aprov || '|' || aprov_nota from corre_posts where midia_url = 'https://x/c1.jpg') = '|Troca a foto do segundo slide'
  then 'ok: mudar a data mantém; mudar a legenda volta pro cliente (a nota fica)' else 'FALHOU: volta pro cliente' end;

-- 5) terminou: o aviso no celular de quem mandou, uma vez só
set role anon;
select case when (corre_aprov_fim((select codigo from cod), 'Marina') ->> 'aprovados') = '1' then 'ok: o fim conta as respostas' else 'FALHOU: fim' end;
reset role;
select case when jsonb_array_length(corre_aprov_alvos(now())) = 1
   and (corre_aprov_alvos(now() + interval '1 second') = '[]'::jsonb)
  then 'ok: avisa quem mandou o link uma vez só' else 'FALHOU: aviso' end;
update corre_aprovacoes set respondido_em = now() where true;
select case when (select x #>> '{payload,titulo}' from jsonb_array_elements(corre_aprov_alvos(now())) x) = 'Marina respondeu a aprovação · Padaria Sol'
   and (select x #>> '{payload,url}' from jsonb_array_elements(corre_aprov_alvos(now() + interval '2 seconds')) x) is null
  then 'ok: o aviso diz quem respondeu e a marca' else 'FALHOU: texto do aviso' end;

-- 6) desligou o link: não abre mais
select pg_temp.como('00000000-0000-0000-0000-000000041701'); set role authenticated;
update corre_aprovacoes set ativo = false, codigo = 'troquei';
reset role;
set role anon;
select case when pg_temp.tenta($$select corre_aprov_ver((select codigo from cod))$$) = 'link' then 'ok: link desligado não abre (e o código não muda pelo app)' else 'FALHOU: desligado abriu' end;
reset role;
