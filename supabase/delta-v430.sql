-- v4.30 · O BICHO DO CADERNINHO, O ESCUDO DA SEQUÊNCIA E O BOM DIA.
-- O Thales: "e também adiciona poderes conforme for concluindo tarefa, tipo evoluindo pokemons" (junto com o "bom dia"
-- no celular, o despejar a cabeça e a semana num quadro, que são só do site).
--
-- O BICHO: cada um escolhe um de três (gralha, guará, coruja) e cada tarefa feita no Caderninho alimenta ele. Quem conta
-- é o banco: as tarefas que o trampo da v4.29 já conferiu (corre_trampo, tipo 'caderno': a tarefa uma vez, a que repete
-- uma vez por dia), sem teto por dia (o Thales: "sem teto"), contadas desde o dia em que o bicho nasceu. Quem já fechava
-- tarefa antes ganha o adianto das que já fez (até a véspera da primeira evolução). É um bicho de anos: o Thales pôs a
-- lenda em 150.000 tarefas e o resto proporcional ("tudo vezes mil"). As formas (etapa):
--   0 ovo · 1 a partir de 3.000 tarefas · 2 a partir de 15.000 · 3 a partir de 50.000 · 4 (lenda) a partir de 150.000
--   corre_bicho                    o bicho de cada um (espécie, apelido, o adianto, quando nasceu, os dias que o escudo
--                                  cobriu). RLS sem política: o app não lê nem escreve direto
--   corre_bicho_xp(dono)           as tarefas que contam (só as funções daqui chamam)
--   corre_bicho_etapa(xp)          a forma pela conta acima
--   corre_bicho_nome(esp, etapa)   o nome da forma (o aviso do bom dia usa)
--   corre_bicho_meu()              o meu bicho (ou { tem: false })
--   corre_bicho_escolhe(espécie)   nasce o ovo (uma vez; já tem, devolve o que tem)
--   corre_bicho_apelido(nome)      o apelido (até 20 letras; vazio = o nome da forma)
--   corre_bicho_dias(dias)         { dia: tarefas } dos últimos dias (o mapa do ano, o poder "Memória")
--   corre_bichos_cidade()          { id: [espécie, etapa] } de quem já tem o "Passeio" (15.000 tarefas): o bicho anda
--                                  com o dono no Correverso. Só a espécie e a forma
--
-- O ESCUDO (poder do bicho a partir de 50.000 tarefas; a lenda tem dois): o dia sem trampo coberto pelo escudo não quebra a
-- sequência de dias seguidos de trampo (a placa da casa). Um por semana (sete dias corridos). O corre_correal_trampo da
-- v4.29 muda só aí, e devolve também o bicho (xp e etapa) quando é tarefa; o corre_trampo_meu e o corre_trampo_placas
-- passam a ver a sequência protegida pelo escudo.
--   corre_bicho_escudos(dono, dia) quantos escudos tem pra usar nesse dia
--
-- O BOM DIA: um aviso no celular de manhã, na hora que a pessoa escolher (das 5h às 11h30; padrão 8h), com o que tem no
-- dia: as tarefas (e as de antes), o post que sai, os clientes pra retornar e as cobranças. Só pra quem tem aparelho, não
-- desligou, não abriu o Corre hoje antes da hora e tem alguma coisa no dia (sem nada, sem aviso). Um por dia.
--   corre_push_pref.bomdia, .bomdia_hora   desligado = sem bom dia; vazio = ligado às 8h
--   corre_bomdia_hora(hora)                o app escolhe a hora ("07:30")
--   corre_bomdia_fila/tem/alvos(agora)     só o servidor (a função push entrega junto da hora de postar, acao "postar")
--   o relógio                              o corre-hora-de-postar da v4.18 passa a olhar o bom dia também
--
-- Precisa da v4.29 (o trampo), da v4.19 (o Caderninho), da v4.18 (a hora de postar) e da v4.02 (o dia de cada um). Pode
-- rodar duas vezes. Sem DROP. Site antigo com o delta: nada muda pra ele (o trampo devolve dois campos a mais).
begin;

do $$
begin
  if to_regclass('public.corre_trampo') is null or to_regprocedure('public.corre_correal_trampo(text,uuid)') is null then
    raise exception 'o delta v4.30 precisa do v4.29 antes (o trampo)';
  end if;
  if to_regclass('public.corre_caderno') is null or to_regprocedure('public.corre_caderno_tem(timestamptz)') is null then
    raise exception 'o delta v4.30 precisa do v4.19 antes (o Caderninho)';
  end if;
  if to_regprocedure('public.corre_postar_tem(timestamptz)') is null or to_regclass('public.corre_ativo_dia') is null then
    raise exception 'o delta v4.30 precisa do v4.18 e do v4.02 antes (a hora de postar e o dia de cada um)';
  end if;
end $$;

-- 1) O BICHO
create table if not exists public.corre_bicho (
  dono uuid primary key references public.corre_perfis (id) on delete cascade,
  especie text not null check (especie in ('gralha', 'guara', 'coruja')),
  apelido text not null default '' check (char_length(apelido) <= 20),
  xp_antes int not null default 0 check (xp_antes >= 0),
  nasceu timestamptz not null default now(),
  escudos date[] not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.corre_bicho enable row level security;
revoke all on public.corre_bicho from public, anon, authenticated;

-- as formas (os mesmos números do site, bicho.js)
create or replace function public.corre_bicho_etapa(p_xp int) returns int language sql immutable set search_path = public as $$
  select case when p_xp >= 150000 then 4 when p_xp >= 50000 then 3 when p_xp >= 15000 then 2 when p_xp >= 3000 then 1 else 0 end $$;
create or replace function public.corre_bicho_nome(p_esp text, p_etapa int) returns text language sql immutable set search_path = public as $$
  select case when p_etapa <= 0 then 'Ovo' else (case p_esp
    when 'gralha' then array['Pinhãozinho', 'Gralhinha', 'Gralha Braba', 'Imperatriz Araucária']
    when 'guara' then array['Brasinha', 'Guarazinho', 'Guará Corredor', 'Guará Lua Cheia']
    else array['Pipoquinha', 'Buraqueira', 'Coruja Vigia', 'Oráculo do Campo'] end)[least(p_etapa, 4)] end $$;
revoke all on function public.corre_bicho_etapa(int), public.corre_bicho_nome(text, int) from public, anon, authenticated;
grant execute on function public.corre_bicho_etapa(int), public.corre_bicho_nome(text, int) to public;

-- as tarefas que contam: o adianto + as do trampo desde que nasceu, sem teto por dia (null = sem bicho)
create or replace function public.corre_bicho_xp(p_dono uuid) returns int
language sql stable security definer set search_path = public as $$
  select b.xp_antes + (select count(*) from public.corre_trampo t
     where t.dono = p_dono and t.tipo = 'caderno' and t.created_at >= b.nasceu)::int
    from public.corre_bicho b where b.dono = p_dono $$;
revoke all on function public.corre_bicho_xp(uuid) from public, anon, authenticated;

-- os escudos pra usar no dia: 1 a partir de 50.000 tarefas, 2 na lenda (150.000), menos os dias que ele cobriu nos últimos 7
create or replace function public.corre_bicho_escudos(p_dono uuid, p_dia date) returns int
language sql stable security definer set search_path = public as $$
  select coalesce((select greatest(0, (case when x.xp >= 150000 then 2 when x.xp >= 50000 then 1 else 0 end)
                     - (select count(*) from unnest(b.escudos) e where e > p_dia - 7 and e <= p_dia))::int
                     from public.corre_bicho b, lateral (select public.corre_bicho_xp(b.dono) as xp) x where b.dono = p_dono), 0) $$;
revoke all on function public.corre_bicho_escudos(uuid, date) from public, anon, authenticated;

-- o meu
create or replace function public.corre_bicho_meu() returns jsonb
language sql stable security definer set search_path = public as $$
  with h as (select (now() at time zone 'America/Sao_Paulo')::date as d)
  select coalesce((select jsonb_build_object('tem', true, 'especie', b.especie, 'apelido', b.apelido, 'xp', x.xp,
      'etapa', public.corre_bicho_etapa(x.xp), 'nome', public.corre_bicho_nome(b.especie, public.corre_bicho_etapa(x.xp)),
      'nasceu', b.nasceu, 'antes', b.xp_antes,
      'hoje', (select count(*) from public.corre_trampo t where t.dono = b.dono and t.tipo = 'caderno' and t.dia = h.d and t.created_at >= b.nasceu),
      'escudos', public.corre_bicho_escudos(b.dono, h.d), 'cobriu', to_jsonb(b.escudos[greatest(1, cardinality(b.escudos) - 9):]))
    from public.corre_bicho b, h, lateral (select public.corre_bicho_xp(b.dono) as xp) x where b.dono = auth.uid()),
    jsonb_build_object('tem', false)) $$;
revoke all on function public.corre_bicho_meu() from public, anon;
grant execute on function public.corre_bicho_meu() to authenticated;

-- nascer: uma vez. O adianto conta as tarefas feitas antes (os dias da que repete inclusive), até a véspera da primeira
-- evolução (14.999): quem já trabalhava muito vê o ovo chocar na hora, mas a evolução ainda é vista
create or replace function public.corre_bicho_escolhe(p_especie text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare eu uuid := auth.uid(); n int;
begin
  if eu is null or not exists (select 1 from public.corre_perfis where id = eu) then return jsonb_build_object('tem', false, 'motivo', 'login'); end if;
  if p_especie is null or p_especie not in ('gralha', 'guara', 'coruja') then return jsonb_build_object('tem', false, 'motivo', 'especie'); end if;
  if not exists (select 1 from public.corre_bicho where dono = eu) then
    select count(*) into n from (
      select c.id, (c.feito_em at time zone 'America/Sao_Paulo')::date as d from public.corre_caderno c where c.dono = eu and c.feito and c.feito_em is not null
      union select c.id, f.d from public.corre_caderno c, unnest(c.feitas) as f(d) where c.dono = eu
      union select t.ref, t.dia from public.corre_trampo t where t.dono = eu and t.tipo = 'caderno') x;
    insert into public.corre_bicho (dono, especie, xp_antes) values (eu, p_especie, least(14999, coalesce(n, 0))) on conflict (dono) do nothing;
  end if;
  return public.corre_bicho_meu();
end $$;
revoke all on function public.corre_bicho_escolhe(text) from public, anon;
grant execute on function public.corre_bicho_escolhe(text) to authenticated;

create or replace function public.corre_bicho_apelido(p_nome text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare eu uuid := auth.uid(); v text := btrim(left(btrim(regexp_replace(coalesce(p_nome, ''), '[[:cntrl:]<>]', '', 'g')), 20));
begin
  if eu is null then return jsonb_build_object('tem', false, 'motivo', 'login'); end if;
  update public.corre_bicho set apelido = v, updated_at = now() where dono = eu;
  return public.corre_bicho_meu();
end $$;
revoke all on function public.corre_bicho_apelido(text) from public, anon;
grant execute on function public.corre_bicho_apelido(text) to authenticated;

-- o mapa do ano: quantas tarefas por dia (as feitas, os dias da que repete e as do trampo, cada tarefa uma vez por dia)
create or replace function public.corre_bicho_dias(p_dias int default 182) returns jsonb
language sql stable security definer set search_path = public as $$
  with h as (select (now() at time zone 'America/Sao_Paulo')::date as d), x as (
    select c.id, (c.feito_em at time zone 'America/Sao_Paulo')::date as dia from public.corre_caderno c where c.dono = auth.uid() and c.feito and c.feito_em is not null
    union select c.id, f.d from public.corre_caderno c, unnest(c.feitas) as f(d) where c.dono = auth.uid()
    union select t.ref, t.dia from public.corre_trampo t where t.dono = auth.uid() and t.tipo = 'caderno')
  select coalesce(jsonb_object_agg(z.dia, z.n), '{}'::jsonb) from (
    select x.dia, count(*) as n from x, h where x.dia > h.d - least(greatest(coalesce(p_dias, 182), 7), 400) and x.dia <= h.d group by x.dia) z $$;
revoke all on function public.corre_bicho_dias(int) from public, anon;
grant execute on function public.corre_bicho_dias(int) to authenticated;

-- a cidade: quem tem o Passeio (15.000 tarefas), só a espécie e a forma
create or replace function public.corre_bichos_cidade() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(b.dono, jsonb_build_array(b.especie, public.corre_bicho_etapa(x.xp))), '{}'::jsonb)
    from public.corre_bicho b, lateral (select public.corre_bicho_xp(b.dono) as xp) x where x.xp >= 15000 $$;
revoke all on function public.corre_bichos_cidade() from public, anon;
grant execute on function public.corre_bichos_cidade() to authenticated;

-- 2) O TRAMPO COM O ESCUDO (o mesmo da v4.29; muda a conta dos dias seguidos e devolve o bicho quando é tarefa)
create or replace function public.corre_correal_trampo(p_tipo text, p_ref uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare eu uuid := auth.uid(); hj date := (now() at time zone 'America/Sao_Paulo')::date;
        dia0 timestamptz := (((now() at time zone 'America/Sao_Paulo')::date)::timestamp) at time zone 'America/Sao_Paulo';
        ok boolean; rep boolean := false; ja boolean; tr numeric; ganhou numeric; s numeric; teto numeric := public.corre_trampo_teto();
        q record; nseq int; mel int; novo boolean := false; vao int; usou int := 0; bx int;
begin
  if eu is null then return jsonb_build_object('ok', false, 'motivo', 'login'); end if;
  if p_tipo is null or p_tipo not in ('caderno', 'post', 'lead') or p_ref is null then return jsonb_build_object('ok', false, 'motivo', 'tipo'); end if;
  perform pg_advisory_xact_lock(hashtext('correal:' || eu::text));
  -- o trampo aconteceu de verdade, e é teu
  if p_tipo = 'caderno' then
    select true, c.repete <> '' into ok, rep from public.corre_caderno c
     where c.id = p_ref and c.dono = eu and ((c.feito and c.feito_em >= dia0) or (c.repete <> '' and hj = any(c.feitas)));
  elsif p_tipo = 'post' then
    select true into ok from public.corre_posts p
     where p.id = p_ref and p.dono = eu and (p.status = 'postado' or coalesce(p.ig_media_id, '') <> '' or p.ig_status in ('agendado', 'publicado'));
  else
    rep := true;
    select true into ok from public.corre_leads l
     where l.id = p_ref and l.dono = eu and exists (
       select 1 from jsonb_array_elements(case when jsonb_typeof(l.hist) = 'array' then l.hist else '[]'::jsonb end) e
        where e->>'k' = 'toque' and coalesce(e->>'t', '') ~ '^\d{4}-\d{2}-\d{2}T' and (e->>'t')::timestamptz >= dia0);
  end if;
  if not coalesce(ok, false) then return jsonb_build_object('ok', false, 'motivo', 'nao'); end if;
  -- uma vez: a tarefa e o post, uma vez só; a que repete e o cliente, uma vez por dia
  select exists (select 1 from public.corre_trampo t where t.dono = eu and t.tipo = p_tipo and t.ref = p_ref and (not rep or t.dia = hj)) into ja;
  if ja then return jsonb_build_object('ok', false, 'motivo', 'ja'); end if;
  -- quanto: 0,02, cortado no teto do trampo do dia
  select coalesce(sum(valor), 0) into tr from public.corre_trampo where dono = eu and dia = hj;
  ganhou := greatest(0, least(public.corre_trampo_valor(), teto - tr));
  insert into public.corre_trampo (dono, tipo, ref, dia, valor) values (eu, p_tipo, p_ref, hj, ganhou);
  if ganhou > 0 then
    insert into public.corre_correal_log (dono, valor, motivo) values (eu, ganhou, 'trampo:' || p_tipo);
    insert into public.corre_correal as c (dono, saldo, ganho) values (eu, ganhou, ganhou)
      on conflict (dono) do update set saldo = c.saldo + excluded.saldo, ganho = c.ganho + excluded.ganho, updated_at = now();
  end if;
  -- os dias seguidos: o primeiro trampo do dia soma um. Faltou dia: o escudo do bicho cobre (um por dia que faltou, se
  -- tiver escudo pra todos); sem escudo, recomeça
  select * into q from public.corre_trampo_seq where dono = eu for update;
  if not found then
    nseq := 1; mel := 1; novo := true;
    insert into public.corre_trampo_seq (dono, seq, melhor, ult, n) values (eu, 1, 1, hj, 1);
  elsif q.ult = hj then
    nseq := q.seq; mel := q.melhor;
    update public.corre_trampo_seq set n = n + 1, updated_at = now() where dono = eu;
  else
    vao := hj - q.ult - 1;
    if vao <= 0 then nseq := q.seq + 1;
    elsif q.seq > 0 and vao <= public.corre_bicho_escudos(eu, hj) then
      nseq := q.seq + 1; usou := vao;
      update public.corre_bicho set escudos = (select coalesce(array_agg(d order by d), '{}') from (
          select e as d from unnest(escudos) e where e > hj - 60
          union select g::date from generate_series(q.ult + 1, hj - 1, interval '1 day') g) z), updated_at = now()
       where dono = eu;
    else nseq := 1; end if;
    mel := greatest(q.melhor, nseq); novo := true;
    update public.corre_trampo_seq set seq = nseq, melhor = mel, ult = hj, n = n + 1, updated_at = now() where dono = eu;
  end if;
  select saldo into s from public.corre_correal where dono = eu;
  if p_tipo = 'caderno' then bx := public.corre_bicho_xp(eu); end if;
  return jsonb_build_object('ok', true, 'ganhou', ganhou, 'saldo', coalesce(s, 0), 'trampo', tr + ganhou, 'teto_trampo', teto,
                            'seq', nseq, 'melhor', mel, 'novo_dia', novo, 'escudo', usou,
                            'bicho', bx, 'bicho_etapa', case when bx is not null then public.corre_bicho_etapa(bx) end);
end $$;
revoke all on function public.corre_correal_trampo(text, uuid) from public, anon;
grant execute on function public.corre_correal_trampo(text, uuid) to authenticated;

-- a sequência que ainda vale: o trampo de ontem, ou os dias que faltaram cabem nos escudos do bicho
create or replace function public.corre_trampo_meu() returns jsonb
language sql stable security definer set search_path = public as $$
  with h as (select (now() at time zone 'America/Sao_Paulo')::date as d),
       s as (select s.*, (h.d - s.ult - 1) as vao, public.corre_bicho_escudos(s.dono, h.d) as esc from public.corre_trampo_seq s, h where s.dono = auth.uid())
  select jsonb_build_object(
    'seq', coalesce((select case when s.vao <= 0 or s.vao <= s.esc then s.seq else 0 end from s), 0),
    'protegida', coalesce((select s.vao > 0 and s.vao <= s.esc from s), false),
    'escudos', public.corre_bicho_escudos(auth.uid(), h.d),
    'hoje_conta', exists (select 1 from public.corre_trampo_seq s2 where s2.dono = auth.uid() and s2.ult = h.d),
    'melhor', coalesce((select s.melhor from s), 0),
    'hoje', coalesce((select sum(t.valor) from public.corre_trampo t where t.dono = auth.uid() and t.dia = h.d), 0),
    'teto', public.corre_trampo_teto(), 'valor', public.corre_trampo_valor())
  from h $$;
revoke all on function public.corre_trampo_meu() from public, anon;
grant execute on function public.corre_trampo_meu() to authenticated;

create or replace function public.corre_trampo_placas() returns jsonb
language sql stable security definer set search_path = public as $$
  with h as (select (now() at time zone 'America/Sao_Paulo')::date as d)
  select coalesce(jsonb_object_agg(s.dono, s.seq), '{}'::jsonb) from public.corre_trampo_seq s, h
   where s.seq >= 2 and (s.ult >= h.d - 1 or (h.d - s.ult - 1) <= public.corre_bicho_escudos(s.dono, h.d)) $$;
revoke all on function public.corre_trampo_placas() from public, anon;
grant execute on function public.corre_trampo_placas() to authenticated;

-- 3) O BOM DIA: a preferência e a hora (o ajuste dos avisos ganha "bomdia"; o resto igual ao da v4.19)
alter table public.corre_push_pref add column if not exists bomdia boolean;
alter table public.corre_push_pref add column if not exists bomdia_hora text;

create or replace function public.corre_push_ajustes(p_endpoint text default null) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'msg', coalesce(p.msg, true), 'resp', coalesce(p.resp, true), 'seg', coalesce(p.seg, true),
    'curt', coalesce(p.curt, true), 'texto', coalesce(p.texto, true), 'lembra', coalesce(p.lembra, true),
    'postar', coalesce(p.postar, true), 'caderno', coalesce(p.caderno, true),
    'bomdia', coalesce(p.bomdia, true), 'bomdia_hora', coalesce(p.bomdia_hora, '08:00'),
    'aparelhos', (select count(*) from public.corre_push d where d.dono = auth.uid()),
    'este', p_endpoint is not null and exists (select 1 from public.corre_push d where d.dono = auth.uid() and d.endpoint = p_endpoint))
  from (select auth.uid() as uid) u
  left join public.corre_push_pref p on p.dono = u.uid
  where u.uid is not null $$;
revoke all on function public.corre_push_ajustes(text) from public, anon;
grant execute on function public.corre_push_ajustes(text) to authenticated;

create or replace function public.corre_push_ajusta(p_campo text, p_valor boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare eu uuid := auth.uid();
begin
  if eu is null or not exists (select 1 from public.corre_perfis where id = eu) then
    raise exception 'sem perfil' using errcode = '42501', hint = 'perfil';
  end if;
  if p_campo not in ('msg', 'resp', 'seg', 'curt', 'texto', 'lembra', 'postar', 'caderno', 'bomdia') or p_valor is null then raise exception 'campo' using hint = 'campo'; end if;
  insert into public.corre_push_pref (dono) values (eu) on conflict (dono) do nothing;
  execute format('update public.corre_push_pref set %I = $1, updated_at = now() where dono = $2', p_campo) using p_valor, eu;
  return public.corre_push_ajustes(null);
end $$;
revoke all on function public.corre_push_ajusta(text, boolean) from public, anon;
grant execute on function public.corre_push_ajusta(text, boolean) to authenticated;

-- a hora do bom dia: das 5h às 11h30, de meia em meia hora
create or replace function public.corre_bomdia_hora(p_hora text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare eu uuid := auth.uid();
begin
  if eu is null or not exists (select 1 from public.corre_perfis where id = eu) then
    raise exception 'sem perfil' using errcode = '42501', hint = 'perfil';
  end if;
  if p_hora is null or p_hora !~ '^(0[5-9]|1[01]):(00|30)$' then raise exception 'hora' using hint = 'hora'; end if;
  insert into public.corre_push_pref (dono) values (eu) on conflict (dono) do nothing;
  update public.corre_push_pref set bomdia_hora = p_hora, bomdia = true, updated_at = now() where dono = eu;
  return public.corre_push_ajustes(null);
end $$;
revoke all on function public.corre_bomdia_hora(text) from public, anon;
grant execute on function public.corre_bomdia_hora(text) to authenticated;

-- quem recebe agora: tem aparelho, não desligou, a hora dele chegou (até 30 minutos depois: o relógio parado não acorda
-- ninguém de tarde), não abriu o Corre hoje e ainda não recebeu hoje
create or replace function public.corre_bomdia_fila(p_agora timestamptz default now())
returns table (dono uuid, chave text)
language sql stable security definer set search_path = public, pg_temp as $$
  with h as (select (p_agora at time zone 'America/Sao_Paulo') as l)
  select d.dono, 'bomdia:' || d.dono || ':' || (h.l)::date
    from (select distinct x.dono from public.corre_push x) d cross join h
    left join public.corre_push_pref pr on pr.dono = d.dono
   where coalesce(pr.bomdia, true)
     and ((h.l)::date + coalesce(pr.bomdia_hora, '08:00')::time) <= h.l
     and ((h.l)::date + coalesce(pr.bomdia_hora, '08:00')::time) > h.l - interval '30 minutes'
     and not exists (select 1 from public.corre_ativo_dia a where a.dono = d.dono and a.dia = (h.l)::date)
     and not exists (select 1 from public.corre_push_log g where g.chave = 'bomdia:' || d.dono || ':' || (h.l)::date) $$;
revoke all on function public.corre_bomdia_fila(timestamptz) from public, anon, authenticated;
grant execute on function public.corre_bomdia_fila(timestamptz) to service_role;

create or replace function public.corre_bomdia_tem(p_agora timestamptz default now()) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.corre_bomdia_fila(p_agora)) $$;
revoke all on function public.corre_bomdia_tem(timestamptz) from public, anon, authenticated;
grant execute on function public.corre_bomdia_tem(timestamptz) to service_role;

-- "e" no fim de uma lista: "a, b e c"
create or replace function public.corre_lista_e(p text[]) returns text language sql immutable set search_path = public as $$
  select case when coalesce(cardinality(p), 0) = 0 then '' when cardinality(p) = 1 then p[1]
              else array_to_string(p[1:cardinality(p) - 1], ', ') || ' e ' || p[cardinality(p)] end $$;
revoke all on function public.corre_lista_e(text[]) from public, anon, authenticated;

-- os avisos ([{ para, tipo, subs, payload }], como o corre_caderno_alvos). Quem não tem nada no dia fica marcado e sem
-- aviso (não volta a cada minuto)
create or replace function public.corre_bomdia_alvos(p_agora timestamptz default now()) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  f record; ja bigint; subs jsonb; mostra boolean; hj date := (p_agora at time zone 'America/Sao_Paulo')::date;
  nh int; na int; np int; nl int; nv int; t1 text; ph text; pm text; b record; xp int; et int; nome text;
  partes text[]; corpo text; titulo text; out jsonb := '[]'::jsonb;
begin
  for f in select * from public.corre_bomdia_fila(p_agora) limit 500 loop
    insert into public.corre_push_log (chave, quem) values (left(f.chave, 200), null) on conflict do nothing;
    get diagnostics ja = row_count;
    continue when ja = 0;
    subs := (select jsonb_agg(jsonb_build_object('endpoint', d.endpoint, 'p256dh', d.p256dh, 'auth', d.auth) order by d.visto_em desc)
               from (select * from public.corre_push d2 where d2.dono = f.dono order by d2.visto_em desc limit 10) d);
    continue when subs is null;
    nh := 0; na := 0; np := 0; nl := 0; nv := 0; t1 := null; ph := null; pm := null; partes := '{}';
    select count(*) filter (where c.dia = hj), count(*) filter (where c.dia < hj) into nh, na
      from public.corre_caderno c where c.dono = f.dono and c.pai is null and not c.feito and c.dia <= hj;
    select c.titulo into t1 from public.corre_caderno c where c.dono = f.dono and c.pai is null and not c.feito and c.dia <= hj
     order by (c.dia < hj) desc, c.prio, c.hora nulls last, c.ordem limit 1;
    begin
      select count(*) into np from public.corre_posts p where p.dono = f.dono and p.data = hj
         and coalesce(p.ig_status, '') <> 'publicado' and coalesce(p.status, '') not in ('postado', 'ideia');
      if np = 1 then
        select nullif(left(coalesce(p.hora, ''), 5), ''), m.marca into ph, pm from public.corre_posts p
          left join public.corre_portfolio m on m.id = p.marca_id
         where p.dono = f.dono and p.data = hj and coalesce(p.ig_status, '') <> 'publicado' and coalesce(p.status, '') not in ('postado', 'ideia') limit 1;
      end if;
    exception when others then np := 0; end;
    begin
      select count(*) into nl from public.corre_leads l where l.dono = f.dono and l.prox <= hj and coalesce(l.st, '') not in ('fechado', 'perdido', 'nao_encontrado');
    exception when others then nl := 0; end;
    begin
      select count(*) into nv from public.corre_vendas v where v.dono = f.dono and v.st = 'fechado' and v.vence = hj;
    exception when others then nv := 0; end;
    continue when nh + na + np + nl + nv = 0;
    mostra := coalesce((select pr.texto from public.corre_push_pref pr where pr.dono = f.dono), true);
    if nh + na > 0 then partes := partes || ((nh + na) || case when nh + na = 1 then ' tarefa' else ' tarefas' end || case when na > 0 then ' (' || na || ' de antes)' else '' end); end if;
    if np = 1 then partes := partes || ('o post' || case when mostra and pm is not null then ' da ' || left(pm, 30) else '' end
                     || case when ph ~ '^\d{1,2}:\d{2}$' then ' às ' || split_part(ph, ':', 1)::int || 'h' || case when split_part(ph, ':', 2) <> '00' then split_part(ph, ':', 2) else '' end else '' end);
    elsif np > 1 then partes := partes || (np || ' posts pra sair'); end if;
    if nl > 0 then partes := partes || (nl || case when nl = 1 then ' cliente pra retornar' else ' clientes pra retornar' end); end if;
    if nv > 0 then partes := partes || (nv || case when nv = 1 then ' cobrança pra receber' else ' cobranças pra receber' end); end if;
    corpo := 'Hoje: ' || public.corre_lista_e(partes) || '.';
    if mostra and t1 is not null then corpo := corpo || ' Começa por: ' || left(t1, 80) || '.'; end if;
    select * into b from public.corre_bicho where corre_bicho.dono = f.dono;
    if b.dono is not null then
      xp := public.corre_bicho_xp(f.dono); et := public.corre_bicho_etapa(xp);
      nome := coalesce(nullif(b.apelido, ''), public.corre_bicho_nome(b.especie, et));
      titulo := case when et = 0 then 'Bom dia! Teu ovo tá quentinho' else nome || ': bom dia!' end;
      if et = 0 then corpo := corpo || ' Faltam ' || (case when 3000 - xp >= 1000 then ((3000 - xp) / 1000)::text || '.' || lpad(((3000 - xp) % 1000)::text, 3, '0') else (3000 - xp)::text end) || case when 3000 - xp = 1 then ' tarefa' else ' tarefas' end || ' pro ovo chocar.'; end if;
    else titulo := 'Bom dia!'; end if;
    out := out || jsonb_build_array(jsonb_build_object('para', f.dono, 'tipo', 'bomdia', 'subs', subs,
      'payload', jsonb_build_object('titulo', left(titulo, 120), 'corpo', left(corpo, 300), 'url', '/#/caderninho',
                                    'tag', 'bomdia', 'renotify', true, 't', 'bomdia', 'em', now())));
  end loop;
  return out;
end $$;
revoke all on function public.corre_bomdia_alvos(timestamptz) from public, anon, authenticated;
grant execute on function public.corre_bomdia_alvos(timestamptz) to service_role;

commit;

-- 4) o relógio: o mesmo da hora de postar e do Caderninho, agora chamando a função também na hora do bom dia. O
--    cabeçalho é o que o relógio do Instagram já usa, lido aqui no banco: nenhuma chave entra no repositório. Sem o pg_cron
--    ou o pg_net (o banco de teste), passa. O schedule com o mesmo nome troca o que tinha (rodar 2x não duplica)
do $$
declare h text; cab jsonb := '{"Content-Type": "application/json"}'::jsonb;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') and exists (select 1 from pg_extension where extname = 'pg_net') then
    begin
      select substring(j.command from 'Bearer [A-Za-z0-9._-]+') into h from cron.job j
       where j.jobname in ('corre-studio-publica', 'corre-hora-de-postar', 'corre-lembretes') and j.command ~ 'Bearer '
       order by j.jobname = 'corre-studio-publica' desc limit 1;
    exception when others then h := null;
    end;
    if h is not null then cab := cab || jsonb_build_object('Authorization', h); end if;
    perform cron.schedule('corre-hora-de-postar', '* * * * *',
      format('select net.http_post(url := %L, headers := %L::jsonb, body := %L::jsonb, timeout_milliseconds := 60000) where public.corre_postar_tem() or public.corre_caderno_tem() or public.corre_bomdia_tem()',
             'https://jzjsqadcwphqzxfsxxyx.supabase.co/functions/v1/push', cab::text, '{"acao": "postar"}'));
  end if;
end $$;

select case when to_regclass('public.corre_bicho') is not null
             and has_function_privilege('authenticated', 'public.corre_bicho_meu()', 'execute')
             and not has_function_privilege('anon', 'public.corre_bicho_escolhe(text)', 'execute')
             and not has_function_privilege('authenticated', 'public.corre_bicho_xp(uuid)', 'execute')
             and not has_table_privilege('authenticated', 'public.corre_bicho', 'select')
             and not has_function_privilege('authenticated', 'public.corre_bomdia_alvos(timestamptz)', 'execute')
             and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'corre_push_pref' and column_name = 'bomdia_hora')
             and position('escudo' in (select prosrc from pg_proc where oid = 'public.corre_correal_trampo(text,uuid)'::regprocedure)) > 0
             and position('bomdia' in (select prosrc from pg_proc where oid = 'public.corre_push_ajusta(text,boolean)'::regprocedure)) > 0
            then 'delta v4.30 ok' else 'delta v4.30 NÃO TERMINOU: rode o arquivo inteiro de novo.' end as status;
