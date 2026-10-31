-- v5.13: o link de aprovação e a Sala do Cliente abrem de verdade.
-- Desde a v4.17 o app cria o link sem mandar o dono (quem é dono é o login), mas a coluna nasceu sem
-- valor padrão: o gatilho corre_aprovacoes_marca (que roda antes do corre_aprovacoes_ok, pela ordem
-- do nome) via dono vazio e recusava com "marca de outra pessoa". Nenhum link nem sala chegou a ser
-- criado em produção. O padrão é o login, como no corre_posts; a regra de acesso continua conferindo
-- que o dono é quem tá logado.
alter table public.corre_aprovacoes alter column dono set default auth.uid();

select case
  when (select column_default from information_schema.columns
        where table_schema = 'public' and table_name = 'corre_aprovacoes' and column_name = 'dono') like '%auth.uid()%'
  then 'delta v5.13 ok' else 'delta v5.13 FALHOU' end;
