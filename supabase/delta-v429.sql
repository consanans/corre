-- v4.29 · O TRAMPO VIRA JOGO.
-- O Thales: "trabalho vira jogo" (fechou tarefa no Caderninho, programou post ou chamou cliente: ganha correal e coisa na
-- cidade). O trabalho de verdade, feito nas ferramentas, paga correal e conta os dias seguidos de trampo, que viram a placa
-- na frente da casa no Correverso. O app só diz o que foi feito (o tipo e o id); o banco confere que é teu e que aconteceu
-- de verdade, e paga uma vez:
--   corre_trampo_valor()     0,02: quanto vale cada trampo
--   corre_trampo_teto()      0,20: o máximo que o trampo paga por dia. É à parte do 1,00 da cidade (tarefa e rua): quem
--        já jogou o dia inteiro ainda ganha trabalhando
--   corre_trampo             o que já foi contado (dono, tipo, ref, dia, valor). A tarefa e o post contam uma vez só; a
--        tarefa que repete e o cliente chamado, uma vez por dia. RLS sem política: o app não lê nem escreve
--   corre_trampo_seq         os dias seguidos de cada um (seq, melhor, ult, n). O app também não lê direto
--   corre_correal_trampo(p_tipo, p_ref)  pelo login. tipo 'caderno' (a tarefa tua feita hoje, ou a que repete marcada
--        hoje), 'post' (o post teu programado, publicado ou marcado como postado) ou 'lead' (o cliente teu com um toque de
--        hoje na linha do tempo). Devolve ok, ganhou, saldo, trampo (o que o trampo já pagou hoje), teto_trampo, seq,
--        melhor e novo_dia (o primeiro trampo do dia, que soma um dia na sequência). Bateu o teto, segue ok com ganhou 0
--        (o dia conta pra sequência do mesmo jeito). Recusado: motivo 'login', 'tipo', 'nao' (não é teu ou não aconteceu)
--        ou 'ja' (já contou)
--   corre_trampo_meu()       a sequência (zerada se passou um dia sem trampo), o melhor, o de hoje e o teto (a carteira)
--   corre_trampo_placas()    { id: dias } de quem tá com 2 dias seguidos ou mais (o trampo de ontem ainda vale): só o
--        número, nada do que foi feito. A cidade põe a placa na frente da casa
-- O correal continua NÃO sendo dinheiro: não compra, não vende, não transfere.
--
-- Precisa da v3.43 (o correal em centavos), da v4.19 (o Caderninho) e da v4.25 (os dias da tarefa que repete). Pode
-- rodar duas vezes. Sem DROP. Site antigo com o delta: nada muda pra ele. Site novo sem o delta: o trampo não paga e a
-- placa não aparece; o resto funciona igual.
begin;

do $$
begin
  if to_regprocedure('public.corre_correal_teto()') is null or to_regclass('public.corre_correal_log') is null then
    raise exception 'o delta v4.29 precisa do v3.43 antes (o correal em centavos)';
  end if;
  if to_regclass('public.corre_caderno') is null or not exists (select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'corre_caderno' and column_name = 'feitas') then
    raise exception 'o delta v4.29 precisa do v4.19 e do v4.25 antes (o Caderninho e os dias da que repete)';
  end if;
end $$;

-- 1) OS NÚMEROS DO TRAMPO (só números: qualquer um lê)
create or replace function public.corre_trampo_valor() returns numeric language sql immutable set search_path = public as $$
  select 0.02::numeric $$;
create or replace function public.corre_trampo_teto() returns numeric language sql immutable set search_path = public as $$
  select 0.20::numeric $$;
revoke all on function public.corre_trampo_valor(), public.corre_trampo_teto() from public, anon, authenticated;
grant execute on function public.corre_trampo_valor(), public.corre_trampo_teto() to public;

-- 2) O QUE JÁ FOI CONTADO E OS DIAS SEGUIDOS (o app não lê: quem lê e escreve são as funções daqui)
create table if not exists public.corre_trampo (
  dono uuid not null references public.corre_perfis (id) on delete cascade,
  tipo text not null check (tipo in ('caderno', 'post', 'lead')),
  ref uuid not null,
  dia date not null,
  valor numeric(6,2) not null default 0 check (valor >= 0),
  created_at timestamptz not null default now(),
  primary key (dono, tipo, ref, dia)
);
create index if not exists corre_trampo_dia_idx on public.corre_trampo (dono, dia);
alter table public.corre_trampo enable row level security;
create table if not exists public.corre_trampo_seq (
  dono uuid primary key references public.corre_perfis (id) on delete cascade,
  seq int not null default 0,
  melhor int not null default 0,
  ult date,
  n int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.corre_trampo_seq enable row level security;
-- o Supabase dá sozinho direitos em tabela nova pro app; aqui ninguém de fora mexe
revoke all on public.corre_trampo, public.corre_trampo_seq from public, anon, authenticated;

-- 3) O TRAMPO PAGA, com o mesmo cadeado da carteira (duas chamadas juntas esperam uma a outra)
create or replace function public.corre_correal_trampo(p_tipo text, p_ref uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare eu uuid := auth.uid(); hj date := (now() at time zone 'America/Sao_Paulo')::date;
        dia0 timestamptz := (((now() at time zone 'America/Sao_Paulo')::date)::timestamp) at time zone 'America/Sao_Paulo';
        ok boolean; rep boolean := false; ja boolean; tr numeric; ganhou numeric; s numeric; teto numeric := public.corre_trampo_teto();
        q record; nseq int; mel int; novo boolean := false;
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
  -- os dias seguidos: o primeiro trampo do dia soma um (ou recomeça, se passou um dia sem)
  select * into q from public.corre_trampo_seq where dono = eu for update;
  if not found then
    nseq := 1; mel := 1; novo := true;
    insert into public.corre_trampo_seq (dono, seq, melhor, ult, n) values (eu, 1, 1, hj, 1);
  elsif q.ult = hj then
    nseq := q.seq; mel := q.melhor;
    update public.corre_trampo_seq set n = n + 1, updated_at = now() where dono = eu;
  else
    nseq := case when q.ult = hj - 1 then q.seq + 1 else 1 end; mel := greatest(q.melhor, nseq); novo := true;
    update public.corre_trampo_seq set seq = nseq, melhor = mel, ult = hj, n = n + 1, updated_at = now() where dono = eu;
  end if;
  select saldo into s from public.corre_correal where dono = eu;
  return jsonb_build_object('ok', true, 'ganhou', ganhou, 'saldo', coalesce(s, 0), 'trampo', tr + ganhou, 'teto_trampo', teto,
                            'seq', nseq, 'melhor', mel, 'novo_dia', novo);
end $$;
revoke all on function public.corre_correal_trampo(text, uuid) from public, anon;
grant execute on function public.corre_correal_trampo(text, uuid) to authenticated;

-- 4) O MEU (a carteira): a sequência que ainda vale, o melhor e o de hoje
create or replace function public.corre_trampo_meu() returns jsonb
language sql stable security definer set search_path = public as $$
  with h as (select (now() at time zone 'America/Sao_Paulo')::date as d)
  select jsonb_build_object(
    'seq', coalesce((select case when s.ult >= h.d - 1 then s.seq else 0 end from public.corre_trampo_seq s where s.dono = auth.uid()), 0),
    'hoje_conta', exists (select 1 from public.corre_trampo_seq s where s.dono = auth.uid() and s.ult = h.d),
    'melhor', coalesce((select s.melhor from public.corre_trampo_seq s where s.dono = auth.uid()), 0),
    'hoje', coalesce((select sum(t.valor) from public.corre_trampo t where t.dono = auth.uid() and t.dia = h.d), 0),
    'teto', public.corre_trampo_teto(), 'valor', public.corre_trampo_valor())
  from h $$;
revoke all on function public.corre_trampo_meu() from public, anon;
grant execute on function public.corre_trampo_meu() to authenticated;

-- 5) AS PLACAS DA CIDADE: só o número de dias seguidos, de quem tá com 2 ou mais (o de ontem ainda vale)
create or replace function public.corre_trampo_placas() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(s.dono, s.seq), '{}'::jsonb) from public.corre_trampo_seq s
   where s.seq >= 2 and s.ult >= (now() at time zone 'America/Sao_Paulo')::date - 1 $$;
revoke all on function public.corre_trampo_placas() from public, anon;
grant execute on function public.corre_trampo_placas() to authenticated;

commit;

select case when public.corre_trampo_valor() = 0.02 and public.corre_trampo_teto() = 0.20
             and to_regclass('public.corre_trampo') is not null and to_regclass('public.corre_trampo_seq') is not null
             and has_function_privilege('authenticated', 'public.corre_correal_trampo(text, uuid)', 'execute')
             and not has_function_privilege('anon', 'public.corre_correal_trampo(text, uuid)', 'execute')
             and not has_table_privilege('authenticated', 'public.corre_trampo', 'select')
             and not has_table_privilege('authenticated', 'public.corre_trampo_seq', 'select')
            then 'delta v4.29 ok' else 'delta v4.29 NÃO TERMINOU: rode o arquivo inteiro de novo.' end as status;
