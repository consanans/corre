\set ON_ERROR_STOP 1
-- v3.56: perfil sempre público; Desbaratinado = os dados só pra quem segue. t = Thales, g = Gabriela (era mocada), x = Fulano
select case when (select visibilidade = 'publico' and desbaratinado from corre_perfis where handle = 'gabriela')
  and (select visibilidade = 'publico' and not desbaratinado from corre_perfis where handle = 'consanans')
  then 'ok: a Gabriela (mocada) virou pública e desbaratinada; o Thales segue sem mudança' else 'FALHOU: a virada do mocado' end;

-- o Fulano, que não segue a Gabriela
set role authenticated; select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a3', false);
select case when (select count(*) from corre_perfis where handle = 'gabriela') = 1 then 'ok: quem não segue acha o perfil dela' else 'FALHOU: perfil dela escondido' end;
select case when (select count(*) from corre_feed f join corre_perfis p on p.id = f.dono where p.handle = 'gabriela') = 0
  and (select count(*) from corre_stories) = 0 and (select count(*) from corre_destaques) = 0 and (select count(*) from corre_insta) = 0
  and (select count(*) from corre_portfolio) = 0 and (select count(*) from corre_recomendacoes) = 0
  then 'ok: quem não segue não vê post, story, destaque, Instagram, portfólio nem recomendação dela' else 'FALHOU: dado dela vazou pra quem não segue' end;
select case when (select count(*) from corre_feed f join corre_perfis p on p.id = f.dono where p.handle = 'consanans') = 1
  then 'ok: o post do Thales (público) segue aberto' else 'FALHOU: post público sumiu' end;
select case when corre_grana_publica('00000000-0000-0000-0000-0000000000a2') is null and not corre_grupos_de('00000000-0000-0000-0000-0000000000a2')
  and not corre_enquetes((select id from corre_feed where texto = 'post da gabi'))
  and not exists (select 1 from corre_pra_voce() v join corre_feed f on f.id = v where f.texto = 'post da gabi')
  then 'ok: grana, grupos, enquete e Pra você dela fechados pra quem não segue' else 'FALHOU: função vazando dado dela' end;
select case when corre_em_alta() = 1 then 'ok: o Em alta não conta post de desbaratinado' else 'FALHOU: Em alta com post dela' end;
-- e pode seguir (antes, perfil mocado não deixava)
insert into corre_seguindo (segue) values ('00000000-0000-0000-0000-0000000000a2');
select case when (select count(*) from corre_feed f join corre_perfis p on p.id = f.dono where p.handle = 'gabriela') = 1
  and (select count(*) from corre_stories) = 1 and (select count(*) from corre_portfolio) = 1 and (select count(*) from corre_recomendacoes) = 1
  and corre_grana_publica('00000000-0000-0000-0000-0000000000a2') ->> 'modo' = 'faixa' and corre_grupos_de('00000000-0000-0000-0000-0000000000a2')
  and exists (select 1 from corre_pra_voce() v join corre_feed f on f.id = v where f.texto = 'post da gabi')
  then 'ok: seguiu, vê tudo dela (post, story, portfólio, recomendação, grana, grupos, Pra você)' else 'FALHOU: seguiu e não vê' end;
delete from corre_seguindo where segue = '00000000-0000-0000-0000-0000000000a2';
select case when (select count(*) from corre_stories) = 0 then 'ok: deixou de seguir, fecha de novo' else 'FALHOU: deixou de seguir e ainda vê' end;

-- o Thales: a Gabriela aparece na lista de quem segue ele
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
select case when exists (select 1 from corre_seguindo s join corre_perfis p on p.id = s.quem where s.segue = auth.uid() and p.handle = 'gabriela')
  then 'ok: a Gabriela aparece nos seguidores do Thales, com nome' else 'FALHOU: ela não aparece pro Thales' end;

-- a Gabriela vê tudo dela; site antigo mandando 'mocado' não esconde o perfil de novo
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', false);
select case when (select count(*) from corre_stories) = 1 and corre_grana_publica(auth.uid()) is not null then 'ok: a dona vê os próprios dados' else 'FALHOU: a dona não vê' end;
update corre_perfis set visibilidade = 'mocado', desbaratinado = false where id = auth.uid();
select case when (select visibilidade = 'publico' and desbaratinado from corre_perfis where id = auth.uid())
  then 'ok: pedir "mocado" (site antigo) fica público e desbaratinado' else 'FALHOU: o trigger deixou mocar o perfil' end;
update corre_perfis set desbaratinado = false where id = auth.uid();
select case when (select not desbaratinado from corre_perfis where id = auth.uid()) then 'ok: dá pra sair do desbaratinado' else 'FALHOU: não sai' end;
reset role;
select case when has_function_privilege('anon', 'public.corre_ve_conteudo(uuid)', 'execute') and has_function_privilege('authenticated', 'public.corre_ve_conteudo(uuid)', 'execute')
  then 'ok: anon e logado podem usar a corre_ve_conteudo (as políticas precisam)' else 'FALHOU: grant da corre_ve_conteudo' end;
