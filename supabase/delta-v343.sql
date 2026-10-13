-- CORRE · delta v3.43 (pode rodar mais de uma vez)
-- ===============================================================
-- CORREAL EM CENTAVOS. Dá pra mexer quase o dia todo no Corre sem correal; quando precisar, precisa de 1 só. Então a
-- tarefa do Correverso vale centavos: 3 centavos por ponto (uma tarefa de 2 a 5 pontos paga de 0,06 a 0,15) e o teto do
-- dia em tarefa é 1,00, umas 10 tarefas (antes: 1 ponto = 1 correal, teto de 40). Os preços caem na mesma conta,
-- divididos por 10, e nenhum passa de 1: imagem 1,00 · marca 0,30 · legenda 0,20 · abordagem 0,20 · voo 0,50.
--   corre_correal (saldo, ganho, gasto) e corre_correal_log (valor)   viram numeric(12,2), DIVIDIDOS por 10: quem tinha 9
--        fica com 0,90 e compra o mesmo que comprava. A guarda é o tipo da coluna: se já é numeric, não divide de novo.
--   corre_correal_log      ganha uma trava: linha nova do extrato não passa de 1 (pra mais ou pra menos) nem é zero
--   corre_correal_preco    os preços novos, com centavos (devolve numeric)
--   corre_correal_ponto()  0,03: quanto vale cada ponto de tarefa
--   corre_correal_teto()   1,00: o máximo que a tarefa paga por dia
--   corre_correal_hoje, _meu, _gasta, _devolve e corre_tarefa_termina   as contas em numeric (num int, 0,90 virava 1).
--        As chaves do que elas devolvem não mudam; a _meu ganha 'ponto' e a corre_tarefa_termina ganha 'pontos'.
-- O correal continua NÃO sendo dinheiro: não compra, não vende, não transfere. Devolução só pela chave de serviço.
-- ATENÇÃO: o delta-v340.sql NÃO pode rodar depois deste. Ele recria a corre_correal_preco devolvendo int (dá erro, porque
-- aqui ela passa a devolver numeric) e, se seguir adiante, volta a corre_correal_meu pro teto de 40 e pra conta em int.
-- Banco novo: a cadeia roda na ordem e este vem depois.
--
-- Pra rodar: SQL Editor do Supabase, colar o arquivo INTEIRO, Run. No fim aparece "delta v3.43 ok", e ele só aparece com
-- a carteira em centavos e as funções novas no lugar. Se aparecer "NÃO TERMINOU", nada mudou (ou mudou só uma parte): é
-- só rodar o arquivo inteiro de novo.
-- NÃO PARTA ESTE ARQUIVO. Pelo conector do Supabase também: o arquivo inteiro numa chamada só do execute_sql (ele é
-- pequeno), nunca em pedaços. Uma parte confirmada sem a outra deixa a carteira em centavos com a conta velha (ou o
-- contrário), e o que o app fizer nesse meio não tem como desfazer rodando de novo. Se mesmo assim ele for partido, o
-- arquivo se defende: o passo 1 fecha o correal pro app (ele dá erro em vez de errar a conta), o passo 2 não roda sem o
-- 1, e o app só volta no passo 8, depois de tudo conferido.

-- Uma transação só: ou converte a carteira e troca as funções juntas, ou nada muda. Coluna em centavos com a função
-- velha (que conta em inteiro) pagaria uma tarefa de 5 pontos com 5 correais, em vez de 0,15.
-- O cadeado: o passo 1 precisa da carteira e do extrato só pra ele por um instante (as tabelas são pequenas). Se alguém
-- estiver segurando uma delas (um painel aberto, uma consulta lenta), o delta espera no máximo 3 s por tabela, desiste e
-- desfaz tudo (aí é só rodar de novo). Enquanto ele espera, o app que mexe no correal espera junto, na fila: no pior
-- caso uns 6 s, abaixo dos 8 s que o Supabase dá pra cada pedido do app. (Com 10 s, o app dava erro antes do delta
-- desistir.)
begin;
set local lock_timeout = '3s';

-- 1) A CARTEIRA E O EXTRATO EM CENTAVOS, num comando só (não dá pra partir no meio dele):
--   a) Fecha o correal pro app (meu, gasta e termina; e a devolve, da chave de serviço) até o passo 8. Rodando o arquivo
--      inteiro, ninguém de fora vê isso. Partido, o app dá erro no meio do caminho em vez de usar a função velha (em
--      int) na carteira já em centavos: a legenda de 0,20 lida como inteiro sai de graça.
--   b) Cada coluna só muda (e só é dividida) se ainda for int; na segunda rodada já é numeric e fica como está. O default
--      0 e o check do saldo (0 a 1.000.000) seguem valendo na coluna nova.
--   c) A TRAVA DO EXTRATO: linha nova não passa de 1 correal, pra mais ou pra menos, nem é zero. Nenhum preço passa de 1
--      e a tarefa paga no máximo 0,15, então nada certo esbarra nela. Ela pega o que a troca sozinha não pega: uma
--      chamada do app que já tinha começado com a função velha quando o delta rodou termina DEPOIS dele, ainda com a
--      conta velha (cobra 2 por uma legenda, paga 5 por uma tarefa, devolve 10 de uma imagem), e o zero é a função velha
--      lendo um preço novo como inteiro. Com a trava, essa chamada dá erro e é desfeita inteira, sem mexer na carteira.
--      Vale pras linhas novas (NOT VALID): as antigas, já divididas, ficam como estão. Se um dia algum preço passar de 1,
--      a trava muda junto.
do $$
declare c text; muda text[] := '{}';
begin
  revoke all on function public.corre_correal_meu(), public.corre_correal_gasta(text), public.corre_tarefa_termina(uuid),
    public.corre_correal_devolve(uuid, text) from public, anon, authenticated, service_role;
  foreach c in array array['saldo', 'ganho', 'gasto'] loop
    if exists (select 1 from pg_attribute where attrelid = 'public.corre_correal'::regclass and attname = c
                 and not attisdropped and atttypid = 'integer'::regtype) then
      muda := muda || format('alter column %I type numeric(12,2) using round(%I / 10.0, 2)', c, c);
    end if;
  end loop;
  if cardinality(muda) > 0 then execute 'alter table public.corre_correal ' || array_to_string(muda, ', '); end if;
  if exists (select 1 from pg_attribute where attrelid = 'public.corre_correal_log'::regclass and attname = 'valor'
               and not attisdropped and atttypid = 'integer'::regtype) then
    alter table public.corre_correal_log alter column valor type numeric(12,2) using round(valor / 10.0, 2);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.corre_correal_log'::regclass
                   and conname = 'corre_correal_log_valor_check') then
    alter table public.corre_correal_log add constraint corre_correal_log_valor_check
      check (valor <> 0 and valor between -1 and 1) not valid;
  end if;
end $$;

-- 2) OS NÚMEROS DO CORREAL MORAM AQUI, não no app: o preço de cada coisa, quanto vale um ponto de tarefa e o teto do dia.
-- Antes, confere que o passo 1 rodou. Preço novo com a carteira ainda em int dá coisa de graça: a função velha lê 0,20
-- como 0, e a nova tira 0,20 de 9 numa coluna int (8,80 volta a ser 9).
do $$
begin
  if exists (select 1 from pg_attribute where attrelid in ('public.corre_correal'::regclass, 'public.corre_correal_log'::regclass)
               and attname in ('saldo', 'ganho', 'gasto', 'valor') and not attisdropped and atttypid <> 'numeric'::regtype) then
    raise exception 'delta v3.43: a carteira ainda não está em centavos (o passo 1 não rodou). Rode o arquivo inteiro, de uma vez.';
  end if;
end $$;
-- O preço muda de int pra numeric, e o Postgres só deixa mudar o tipo do retorno com drop + create. Função recriada
-- (drop + create) ganha EXECUTE pra anon, authenticated e service_role pelos padrões do Supabase; então o grant de cada
-- uma volta pro de antes ali mesmo. Preço, ponto e teto: qualquer um executa (são só números).
drop function if exists public.corre_correal_preco(text);
create function public.corre_correal_preco(p_tipo text) returns numeric language sql immutable set search_path = public as $$
  select case p_tipo when 'imagem' then 1.00 when 'marca' then 0.30 when 'legenda' then 0.20 when 'abordagem' then 0.20
                     when 'voo' then 0.50 end::numeric $$;
create or replace function public.corre_correal_ponto() returns numeric language sql immutable set search_path = public as $$
  select 0.03::numeric $$;
create or replace function public.corre_correal_teto() returns numeric language sql immutable set search_path = public as $$
  select 1.00::numeric $$;
revoke all on function public.corre_correal_preco(text), public.corre_correal_ponto(), public.corre_correal_teto()
  from public, anon, authenticated, service_role;
grant execute on function public.corre_correal_preco(text), public.corre_correal_ponto(), public.corre_correal_teto() to public;

-- 3) O QUE A TAREFA JÁ PAGOU HOJE (dia de Brasília), agora com centavos. Também é drop + create (muda o retorno), e
-- ninguém de fora executa: só as funções daqui.
drop function if exists public.corre_correal_hoje(uuid);
create function public.corre_correal_hoje(p_dono uuid) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(sum(valor), 0)::numeric(12,2) from public.corre_correal_log
   where dono = p_dono and valor > 0 and motivo like 'tarefa:%'
     and created_at >= ((now() at time zone 'America/Sao_Paulo')::date)::timestamp at time zone 'America/Sao_Paulo' $$;
revoke all on function public.corre_correal_hoje(uuid) from public, anon, authenticated, service_role;

-- 4) A CARTEIRA que o app e a função "imagem" leem: as mesmas chaves de antes, mais o 'ponto'.
create or replace function public.corre_correal_meu() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare u uuid := auth.uid(); s numeric;
begin
  if u is null then return null; end if;
  select saldo into s from public.corre_correal where dono = u;
  return jsonb_build_object('saldo', coalesce(s, 0), 'hoje', public.corre_correal_hoje(u),
    'teto', public.corre_correal_teto(), 'ponto', public.corre_correal_ponto(),
    'precos', jsonb_build_object('imagem', public.corre_correal_preco('imagem'), 'legenda', public.corre_correal_preco('legenda'),
                                 'abordagem', public.corre_correal_preco('abordagem'), 'marca', public.corre_correal_preco('marca'),
                                 'voo', public.corre_correal_preco('voo')));
end $$;

-- 5) GASTAR (pelo login de quem gasta, com o cadeado da carteira). Tipo que o banco não conhece não tem preço: não mexe em nada.
create or replace function public.corre_correal_gasta(p_tipo text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); p numeric := public.corre_correal_preco(p_tipo); s numeric;
begin
  if u is null or p is null then return jsonb_build_object('ok', false, 'saldo', 0, 'preco', p); end if;
  perform pg_advisory_xact_lock(hashtext('correal:' || u::text));
  select saldo into s from public.corre_correal where dono = u for update;
  if coalesce(s, 0) < p then return jsonb_build_object('ok', false, 'saldo', coalesce(s, 0), 'preco', p); end if;
  update public.corre_correal set saldo = saldo - p, gasto = gasto + p, updated_at = now() where dono = u returning saldo into s;
  insert into public.corre_correal_log (dono, valor, motivo) values (u, -p, 'gasto:' || p_tipo);
  return jsonb_build_object('ok', true, 'saldo', s, 'preco', p);
end $$;

-- 6) DEVOLVER (só a chave de serviço, quando a IA falha depois do desconto): o último gasto daquele tipo, dos últimos
-- 10 minutos, e uma vez só.
create or replace function public.corre_correal_devolve(p_dono uuid, p_tipo text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p numeric := public.corre_correal_preco(p_tipo); g timestamptz; s numeric;
begin
  if p is null or p_dono is null then return jsonb_build_object('ok', false); end if;
  perform pg_advisory_xact_lock(hashtext('correal:' || p_dono::text));
  select max(created_at) into g from public.corre_correal_log where dono = p_dono and motivo = 'gasto:' || p_tipo and created_at > now() - interval '10 minutes';
  if g is null or exists (select 1 from public.corre_correal_log where dono = p_dono and motivo = 'volta:' || p_tipo and created_at >= g) then
    return jsonb_build_object('ok', false);
  end if;
  update public.corre_correal set saldo = saldo + p, gasto = greatest(0, gasto - p), updated_at = now() where dono = p_dono returning saldo into s;
  insert into public.corre_correal_log (dono, valor, motivo) values (p_dono, p, 'volta:' || p_tipo);
  return jsonb_build_object('ok', true, 'saldo', s);
end $$;

-- 7) A TAREFA PAGA pelos pontos: round(pontos x 0,03, 2), cortado no que falta pro teto do dia. Devolve 'valia' (o valor
-- da tarefa em correal), 'pontos' (os pontos dela) e o resto como antes. O tempo mínimo (20 s) e o máximo (30 min) não mudam.
create or replace function public.corre_tarefa_termina(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare eu uuid := auth.uid(); t public.corre_tarefa_vez%rowtype; seg numeric; pts int; v numeric; teto numeric := public.corre_correal_teto();
        hoje numeric; ganhou numeric; s numeric;
begin
  if eu is null then return jsonb_build_object('ok', false, 'motivo', 'login'); end if;
  select * into t from public.corre_tarefa_vez where id = p_id and dono = eu for update;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'sem_tarefa'); end if;
  seg := extract(epoch from now() - t.comecou);
  if seg < 20 then return jsonb_build_object('ok', false, 'motivo', 'rapido', 'falta', ceil(20 - seg)::int); end if;
  delete from public.corre_tarefa_vez where id = t.id;
  if seg > 1800 then return jsonb_build_object('ok', false, 'motivo', 'velha'); end if;
  pts := coalesce(public.corre_tarefa_valor(t.u, t.k), 0);
  v := round(pts * public.corre_correal_ponto(), 2);
  perform pg_advisory_xact_lock(hashtext('correal:' || eu::text));
  hoje := public.corre_correal_hoje(eu);
  ganhou := greatest(0, least(v, teto - hoje));
  if ganhou > 0 then
    insert into public.corre_correal_log (dono, valor, motivo) values (eu, ganhou, 'tarefa:' || t.u || ':' || t.k);
    insert into public.corre_correal as c (dono, saldo, ganho) values (eu, ganhou, ganhou)
      on conflict (dono) do update set saldo = c.saldo + excluded.saldo, ganho = c.ganho + excluded.ganho, updated_at = now();
  end if;
  select saldo into s from public.corre_correal where dono = eu;
  return jsonb_build_object('ok', true, 'ganhou', ganhou, 'valia', v, 'pontos', pts, 'saldo', coalesce(s, 0),
                            'hoje', hoje + ganhou, 'teto', teto);
end $$;

-- 8) O CORREAL VOLTA PRO APP, igual a antes: meu, gasta e termina pra quem tá logado; devolve só pra chave de serviço.
-- Mas só depois de conferir que tudo acima ficou certo: a carteira em centavos, a trava do extrato, o preço e o hoje em
-- numeric e as funções novas no lugar. Se não ficou (arquivo partido, um pedaço perdido), dá erro e o correal segue
-- fechado pro app até o arquivo rodar inteiro. (O revoke vem antes e separado de propósito: mesmo num cliente que segue
-- depois do erro, a porta fica fechada.)
revoke all on function public.corre_correal_meu(), public.corre_correal_gasta(text), public.corre_tarefa_termina(uuid),
  public.corre_correal_devolve(uuid, text) from public, anon, authenticated, service_role;
do $$
begin
  if exists (select 1 from pg_attribute where attrelid in ('public.corre_correal'::regclass, 'public.corre_correal_log'::regclass)
               and attname in ('saldo', 'ganho', 'gasto', 'valor') and not attisdropped and atttypid <> 'numeric'::regtype)
     or not exists (select 1 from pg_constraint where conrelid = 'public.corre_correal_log'::regclass
                      and conname = 'corre_correal_log_valor_check')
     or pg_get_function_result('public.corre_correal_preco(text)'::regprocedure) <> 'numeric'
     or pg_get_function_result('public.corre_correal_hoje(uuid)'::regprocedure) <> 'numeric'
     or (select count(*) from pg_proc where oid in ('public.corre_correal_meu()'::regprocedure, 'public.corre_correal_gasta(text)'::regprocedure,
                                                    'public.corre_tarefa_termina(uuid)'::regprocedure, 'public.corre_correal_devolve(uuid, text)'::regprocedure)
           and prosrc ~ '\ms numeric;') < 4 then   -- as 4 do app são as novas: o saldo delas é 's numeric' (nas velhas, 's int')
    raise exception 'delta v3.43 pela metade: o correal fica fechado pro app. Rode o arquivo inteiro, de uma vez.';
  end if;
  grant execute on function public.corre_correal_meu(), public.corre_correal_gasta(text), public.corre_tarefa_termina(uuid) to authenticated;
  grant execute on function public.corre_correal_devolve(uuid, text) to service_role;
end $$;

commit;

-- O "ok" prova o estado final, não só que o arquivo chegou ao fim: a carteira em centavos, o preço novo e o correal aberto
-- de novo pro app (o passo 8 só abre depois de conferir tudo). Se o delta desistiu no meio (o cadeado, um erro) e o
-- cliente seguiu adiante, o commit acima vira rollback e aqui sai "NÃO TERMINOU".
select case when not exists (select 1 from pg_attribute where attrelid in ('public.corre_correal'::regclass, 'public.corre_correal_log'::regclass)
                               and attname in ('saldo', 'ganho', 'gasto', 'valor') and not attisdropped and atttypid <> 'numeric'::regtype)
             and pg_get_function_result(to_regprocedure('public.corre_correal_preco(text)')) = 'numeric'
             and has_function_privilege('authenticated', 'public.corre_correal_meu()', 'execute')
             and has_function_privilege('authenticated', 'public.corre_correal_gasta(text)', 'execute')
             and has_function_privilege('authenticated', 'public.corre_tarefa_termina(uuid)', 'execute')
             and has_function_privilege('service_role', 'public.corre_correal_devolve(uuid, text)', 'execute')
            then 'delta v3.43 ok'
            else 'delta v3.43 NÃO TERMINOU: nada mudou, ou mudou só uma parte. Rode o arquivo inteiro de novo, de uma vez.' end as status;
