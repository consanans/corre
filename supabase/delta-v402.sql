-- CORRE v4.02 · a Lojinha (o painel do dono)
-- Pode rodar duas vezes. Sem DROP (o conector do Supabase trava em comando com DROP). Termina com 'delta v4.02 ok'.
--
-- O Thales: "prioridade agora: montar meu dashboard" e "chama esse lugar de lojinha". A Lojinha é uma página só dele
-- (#/lojinha) que lê o banco ao vivo: quanta gente entrou e voltou, onde quem chega trava, o que se usa, o link na bio,
-- os convites, os planos e o uso de IA. É tudo CONTAGEM: nada do dinheiro, dos clientes ou das conversas de ninguém
-- (a grana de cada um continua só de cada um). O que sai com nome é o que já é público: o @ e o nome de quem entrou e
-- das páginas de link na bio.
--
-- 1) O DIA DE CADA UM: corre_ativo_dia (dono, dia de Brasília) ganha uma linha quando a pessoa abre o Corre (o app
--    chama corre_marca_dia() uma vez por dia por aparelho). Só isso: nem hora, nem aparelho, nem página. Ninguém lê
--    pelo app; só a Lojinha conta.
-- 2) ATIVO, ATÉ AQUI: o que a pessoa fez e já tem data no banco (post, mensagem, curtida, lead, venda, tarefa na
--    cidade...) e a sessão do login (auth.sessions renova de hora em hora com o app aberto). Com o (1), daqui pra
--    frente conta também quem só abriu e olhou.
-- 3) corre_lojinha(p_dias): o resumo inteiro num jsonb. Só os donos (corre_ve_lojinha; pra mudar quem vê, é trocar
--    essa função). O fundador e o @corre ficam fora das contas de gente (são a casa, não o público).

-- 1) o dia de cada um
create table if not exists public.corre_ativo_dia (
  dono uuid not null references public.corre_perfis (id) on delete cascade,
  dia  date not null,
  primary key (dono, dia)
);
alter table public.corre_ativo_dia enable row level security;
-- tabela nova nasce com grant demais: aqui ninguém do app lê nem escreve (quem escreve é a função, como dona)
revoke all on public.corre_ativo_dia from public, anon, authenticated, service_role;

create or replace function public.corre_marca_dia() returns void
language sql security definer set search_path = public as $$
  insert into public.corre_ativo_dia (dono, dia)
  select auth.uid(), (now() at time zone 'America/Sao_Paulo')::date
   where auth.uid() is not null and exists (select 1 from public.corre_perfis where id = auth.uid())
  on conflict do nothing $$;
revoke all on function public.corre_marca_dia() from public, anon, authenticated, service_role;
grant execute on function public.corre_marca_dia() to authenticated;

-- 2) quem vê a Lojinha: os donos (o Thales, 19/10/2026: "Lucas e Jey veem a Lojinha"). É o corre_eh_dono da v3.80: o
--    fundador, por id (o @ pode mudar), e quem tá em corre_donos (hoje o @jeydiaz e o @simonini.lucas0). Sem a v3.80,
--    só o fundador
create or replace function public.corre_ve_lojinha(p uuid) returns boolean
language plpgsql stable set search_path = public as $$
begin
  if p is null then return false; end if;
  if p = 'd1e9f6ac-f5d7-4723-8b02-eb0d1d7137b0'::uuid then return true; end if;
  if to_regprocedure('public.corre_eh_dono(uuid)') is null then return false; end if;
  return coalesce(public.corre_eh_dono(p), false);
end $$;
revoke all on function public.corre_ve_lojinha(uuid) from public, anon, authenticated, service_role;

-- 2b) "montou o link na bio": o gatilho da v4.0 grava {"links": []} em todo perfil novo, então perfil sem nada não é
--     o '{}' de antes. Montou = tem link ou mexeu em alguma outra coisa da página (tema, frase, botões, Pix...)
create or replace function public.corre_bio_montou(b jsonb) returns boolean
language sql immutable as $$
  select b is not null and jsonb_typeof(b) = 'object'
     and ((b - 'links') <> '{}'::jsonb or (jsonb_typeof(b->'links') = 'array' and jsonb_array_length(b->'links') > 0)) $$;
revoke all on function public.corre_bio_montou(jsonb) from public, anon, authenticated, service_role;

-- 3) o resumo. Cada pedaço confere se a tabela existe (to_regclass) e segue sem ele se não existir ou se der erro:
--    a Lojinha nunca cai inteira por causa de um número
create or replace function public.corre_lojinha(p_dias int default 30) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  fora constant uuid[] := array['d1e9f6ac-f5d7-4723-8b02-eb0d1d7137b0', '45ff37aa-aa4f-4438-9414-54b5fd94f240']::uuid[];
  tz constant text := 'America/Sao_Paulo';
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  d int := greatest(7, least(coalesce(p_dias, 30), 120));
  ini date;
  ini_ts timestamptz;
  desde timestamptz;
  -- de onde vem "fez alguma coisa no dia": [tabela, quem, quando]
  fontes constant text[] := array[
    ['corre_feed', 'dono', 'created_at'], ['corre_mensagens', 'dono', 'created_at'], ['corre_curtidas', 'dono', 'created_at'],
    ['corre_comentarios', 'dono', 'created_at'], ['corre_stories', 'dono', 'created_at'], ['corre_story_curtidas', 'dono', 'created_at'],
    ['corre_votos', 'dono', 'created_at'], ['corre_salvos', 'dono', 'created_at'], ['corre_seguindo', 'quem', 'created_at'],
    ['corre_grupo_membros', 'membro', 'created_at'], ['corre_posts', 'dono', 'updated_at'], ['corre_houzi_marcas', 'dono', 'updated_at'],
    ['corre_leads', 'dono', 'updated_at'], ['corre_vendas', 'dono', 'updated_at'], ['corre_lancamentos', 'dono', 'created_at'],
    ['corre_produtos', 'dono', 'created_at'], ['corre_mural', 'dono', 'created_at'], ['corre_mural_propostas', 'dono', 'created_at'],
    ['corre_refs', 'dono', 'created_at'], ['corre_visitas', 'dono', 'updated_at'], ['corre_tarefa_vez', 'dono', 'comecou'],
    ['corre_verso_sinal', 'de', 'criado'], ['corre_skins', 'dono', 'created_at'], ['corre_geracoes', 'dono', 'created_at']];
  -- o que se usa: [chave, tabela, quem, quando] (quantas PESSOAS usaram, nunca quanto)
  ferr constant text[] := array[
    ['feed', 'corre_feed', 'dono', 'created_at'], ['stories', 'corre_stories', 'dono', 'created_at'],
    ['msg', 'corre_mensagens', 'dono', 'created_at'], ['grupos', 'corre_grupo_membros', 'membro', 'created_at'],
    ['mural', 'corre_mural', 'dono', 'created_at'], ['propostas', 'corre_mural_propostas', 'dono', 'created_at'],
    ['studio', 'corre_posts', 'dono', 'created_at'], ['houzi', 'corre_houzi_marcas', 'dono', 'created_at'],
    ['horus', 'corre_leads', 'dono', 'created_at'], ['vendas', 'corre_vendas', 'dono', 'created_at'],
    ['grana', 'corre_lancamentos', 'dono', 'created_at'], ['catalogo', 'corre_produtos', 'dono', 'created_at'],
    ['tarefas', 'corre_tarefa_vez', 'dono', 'comecou'], ['atelie', 'corre_skins', 'dono', 'created_at'],
    ['ia', 'corre_geracoes', 'dono', 'created_at'], ['instagram', 'corre_ig_contas', 'dono', 'conectada_em'],
    ['avisos', 'corre_push', 'dono', 'created_at']];
  f text[];
  r jsonb := '{}'::jsonb;
  j jsonb;
  uso jsonb := '[]'::jsonb;
  n1 bigint; n2 bigint;
  contas bigint := null;
  sem bigint := null;
begin
  if not public.corre_ve_lojinha(auth.uid()) then
    raise exception 'A Lojinha é só do dono do Corre.' using errcode = '42501', hint = 'so_fundador';
  end if;
  ini := hoje - (d - 1);
  ini_ts := ini::timestamp at time zone tz;
  desde := (hoje - greatest(d, 30))::timestamp at time zone tz;

  -- quem fez alguma coisa em cada dia (uma tabela de trabalho, some no fim da chamada)
  drop table if exists pg_temp.lj_atv;
  create temp table lj_atv (dono uuid, dia date) on commit drop;
  foreach f slice 1 in array fontes loop
    continue when to_regclass('public.' || f[1]) is null;
    begin
      execute format('insert into pg_temp.lj_atv select %I, (%I at time zone %L)::date from public.%I where %I >= $1', f[2], f[3], tz, f[1], f[3]) using desde;
    exception when others then null;
    end;
  end loop;
  insert into pg_temp.lj_atv select dono, dia from public.corre_ativo_dia where dia >= (desde at time zone tz)::date;
  -- o login: a sessão renova com o app aberto (refreshed_at é sem fuso, em UTC)
  begin
    insert into pg_temp.lj_atv
      select user_id, (coalesce(refreshed_at at time zone 'UTC', updated_at, created_at) at time zone tz)::date from auth.sessions
       where coalesce(refreshed_at at time zone 'UTC', updated_at, created_at) >= desde
      union all
      select user_id, (created_at at time zone tz)::date from auth.sessions where created_at >= desde;
  exception when others then null;
  end;
  begin
    insert into pg_temp.lj_atv select id, (last_sign_in_at at time zone tz)::date from auth.users where last_sign_in_at >= desde;
  exception when others then null;
  end;
  -- só gente com perfil, sem a casa
  delete from pg_temp.lj_atv a where a.dono is null or a.dono = any (fora) or not exists (select 1 from public.corre_perfis p where p.id = a.dono);

  -- a gente
  -- as contas do Google (auth.users): quem entrou e não terminou o perfil fica de fora do resto
  begin
    select count(*), count(*) filter (where not exists (select 1 from public.corre_perfis p where p.id = u.id))
      into contas, sem from auth.users u where u.id <> all (fora);
  exception when others then contas := null; sem := null;
  end;
  select jsonb_build_object(
      'perfis', count(*),
      'novos', count(*) filter (where p.created_at >= ini_ts),
      'novos7', count(*) filter (where (p.created_at at time zone tz)::date > hoje - 7),
      'novos7_antes', count(*) filter (where (p.created_at at time zone tz)::date > hoje - 14 and (p.created_at at time zone tz)::date <= hoje - 7),
      'contas', contas,
      'sem_perfil', sem,
      'ativos_hoje', (select count(distinct dono) from pg_temp.lj_atv where dia = hoje),
      'ativos7', (select count(distinct dono) from pg_temp.lj_atv where dia > hoje - 7),
      'ativos30', (select count(distinct dono) from pg_temp.lj_atv where dia > hoje - 30),
      'ativos_periodo', (select count(distinct dono) from pg_temp.lj_atv where dia >= ini),
      -- voltaram: de quem entrou há mais de 7 dias, quantos fizeram alguma coisa nos últimos 7
      'voltaram_base', count(*) filter (where (p.created_at at time zone tz)::date <= hoje - 7),
      'voltaram', count(*) filter (where (p.created_at at time zone tz)::date <= hoje - 7
                                     and exists (select 1 from pg_temp.lj_atv a where a.dono = p.id and a.dia > hoje - 7)))
    into j from public.corre_perfis p where p.id <> all (fora);
  r := r || jsonb_build_object('gente', j);

  -- dia a dia: quem entrou e quem fez alguma coisa
  select jsonb_agg(jsonb_build_object('dia', g::date,
           'novos', (select count(*) from public.corre_perfis p where p.id <> all (fora) and (p.created_at at time zone tz)::date = g::date),
           'ativos', (select count(distinct dono) from pg_temp.lj_atv a where a.dia = g::date)) order by g)
    into j from generate_series(ini::timestamp, hoje::timestamp, interval '1 day') g;
  r := r || jsonb_build_object('dias', coalesce(j, '[]'::jsonb));

  -- o caminho de quem chega (os Primeiros passos, somados): onde o pessoal para
  select jsonb_build_object(
      'contas', contas, 'perfil', count(*),
      'foto', count(*) filter (where coalesce(p.avatar_url, '') <> ''),
      'faz', count(*) filter (where coalesce(btrim(p.faz), '') <> ''),
      'whats', count(*) filter (where coalesce(btrim(p.whats_publico), '') <> ''),
      'bio', count(*) filter (where public.corre_bio_montou(p.bio_link)),
      'verso', count(*) filter (where p.verso is not null and p.verso::text not in ('{}', 'null')))
    into j from public.corre_perfis p where p.id <> all (fora);
  begin
    j := j || jsonb_build_object('vitrine', (select count(distinct pr.dono) from public.corre_produtos pr where pr.publico and pr.dono <> all (fora)));
  exception when others then null;
  end;
  begin
    j := j || jsonb_build_object('post', (select count(distinct x.dono) from public.corre_feed x where x.dono <> all (fora)));
  exception when others then null;
  end;
  begin
    j := j || jsonb_build_object('convidou', (select count(distinct c.por) from public.corre_convites c where c.por <> all (fora)));
  exception when others then null;
  end;
  r := r || jsonb_build_object('funil', j);

  -- o que se usa: quantas pessoas usaram no período e desde sempre
  foreach f slice 1 in array ferr loop
    continue when to_regclass('public.' || f[2]) is null;
    begin
      execute format('select count(distinct %1$I) filter (where %2$I >= $1), count(distinct %1$I) from public.%3$I where %1$I <> all ($2)', f[3], f[4], f[2])
        into n1, n2 using ini_ts, fora;
      uso := uso || jsonb_build_array(jsonb_build_object('k', f[1], 'n', n1, 'total', n2));
    exception when others then null;
    end;
  end loop;
  begin
    uso := uso || jsonb_build_array(jsonb_build_object('k', 'linkbio',
      'n', (select count(distinct b.dono) from public.corre_bio_conta b where b.chave = 'visita' and b.dia >= ini and b.dono <> all (fora)),
      'total', (select count(*) from public.corre_perfis p where p.id <> all (fora) and public.corre_bio_montou(p.bio_link))));
  exception when others then null;
  end;
  r := r || jsonb_build_object('uso', uso);

  -- o link na bio: as visitas e os toques (as páginas são públicas; aqui entra todo mundo, a casa também)
  begin
    select jsonb_build_object(
        'visitas', coalesce(sum(n) filter (where chave = 'visita'), 0),
        'toques', coalesce(sum(n) filter (where chave <> 'visita'), 0),
        'top', coalesce((select jsonb_agg(t order by (t->>'n')::int desc) from (
                 select jsonb_build_object('handle', p.handle, 'nome', p.nome, 'avatar_url', p.avatar_url, 'n', sum(b.n)) t
                   from public.corre_bio_conta b join public.corre_perfis p on p.id = b.dono
                  where b.chave = 'visita' and b.dia >= ini group by p.id, p.handle, p.nome, p.avatar_url order by sum(b.n) desc limit 5) z), '[]'::jsonb))
      into j from public.corre_bio_conta where dia >= ini;
    r := r || jsonb_build_object('bio', j);
  exception when others then null;
  end;

  -- os convites
  begin
    select jsonb_build_object(
        'total', count(*), 'periodo', count(*) filter (where c.em >= ini_ts), 'pagos', count(*) filter (where coalesce(c.pago, 0) > 0),
        'top', coalesce((select jsonb_agg(t order by (t->>'n')::int desc) from (
                 select jsonb_build_object('handle', p.handle, 'nome', p.nome, 'avatar_url', p.avatar_url, 'n', count(*)) t
                   from public.corre_convites c2 join public.corre_perfis p on p.id = c2.por
                  group by p.id, p.handle, p.nome, p.avatar_url order by count(*) desc limit 5) z), '[]'::jsonb))
      into j from public.corre_convites c;
    r := r || jsonb_build_object('convites', j);
  exception when others then null;
  end;

  -- os planos (o dinheiro do Corre, não o de ninguém): quantos pagando por produto, a receita do mês, testes e atrasos
  begin
    select jsonb_build_object(
        'studio', count(*) filter (where a.produto = 'studio' and a.status = 'ativa' and a.pago_ate + 3 >= hoje),
        'houzi', count(*) filter (where a.produto = 'houzi' and a.status = 'ativa' and a.pago_ate + 3 >= hoje),
        'horus', count(*) filter (where a.produto = 'horus' and a.status = 'ativa' and a.pago_ate + 3 >= hoje),
        'mrr', coalesce(sum(a.valor) filter (where a.status = 'ativa' and a.pago_ate + 3 >= hoje), 0),
        'teste', count(*) filter (where a.status = 'teste' and a.teste_ate > now()),
        'pendentes', count(*) filter (where a.status = 'pendente'),
        'atrasados', count(*) filter (where a.status = 'atrasada'),
        'cancelados', count(*) filter (where a.status = 'cancelada' and a.updated_at >= ini_ts))
      into j from public.corre_assinaturas a where a.dono <> all (fora);
    begin j := j || jsonb_build_object('donos', (select count(*) from public.corre_donos)); exception when others then null; end;
    r := r || jsonb_build_object('planos', j);
  exception when others then null;
  end;

  -- a IA (é o que custa): quantas vezes cada uma rodou no período, a casa também (custo é custo)
  begin
    select jsonb_build_object('pessoas', count(distinct g.dono), 'total', count(*),
        'tipos', coalesce((select jsonb_object_agg(k, n) from (
          select case when g2.tipo = 'marca' then case when g2.prompt like 'direcao ·%' then 'direcao' when g2.prompt like 'maquina ·%' then 'maquina'
                                                       when g2.prompt like 'nomes ·%' then 'nomes' else 'marca' end
                      else coalesce(nullif(g2.tipo, ''), 'imagem') end k, count(*) n
            from public.corre_geracoes g2 where g2.created_at >= ini_ts group by 1) z), '{}'::jsonb))
      into j from public.corre_geracoes g where g.created_at >= ini_ts;
    r := r || jsonb_build_object('ia', j);
  exception when others then null;
  end;

  -- quem chegou por último (o @ e o nome são públicos): pra dar boas-vindas na mão
  select coalesce(jsonb_agg(t order by (t->>'criado') desc), '[]'::jsonb) into j from (
    select jsonb_build_object('id', p.id, 'handle', p.handle, 'nome', p.nome, 'avatar_url', p.avatar_url, 'categoria', p.categoria,
             'criado', p.created_at,
             'ultimo', (select max(a.dia) from pg_temp.lj_atv a where a.dono = p.id),
             'passos', (case when coalesce(p.avatar_url, '') <> '' then 1 else 0 end) + (case when coalesce(btrim(p.faz), '') <> '' then 1 else 0 end)
                     + (case when coalesce(btrim(p.whats_publico), '') <> '' then 1 else 0 end)
                     + (case when public.corre_bio_montou(p.bio_link) then 1 else 0 end)
                     + (case when p.verso is not null and p.verso::text not in ('{}', 'null') then 1 else 0 end)) t
      from public.corre_perfis p where p.id <> all (fora) order by p.created_at desc limit 12) z;
  r := r || jsonb_build_object('chegaram', j);

  return r || jsonb_build_object('hoje', hoje, 'dias_periodo', d, 'agora', now());
end $$;
revoke all on function public.corre_lojinha(int) from public, anon, authenticated, service_role;
grant execute on function public.corre_lojinha(int) to authenticated;

-- confere que ficou tudo no lugar
do $$ begin
  if to_regclass('public.corre_ativo_dia') is null or to_regprocedure('public.corre_marca_dia()') is null
     or to_regprocedure('public.corre_ve_lojinha(uuid)') is null or to_regprocedure('public.corre_bio_montou(jsonb)') is null or to_regprocedure('public.corre_lojinha(integer)') is null then
    raise exception 'delta v4.02 incompleto';
  end if;
end $$;
select 'delta v4.02 ok';
