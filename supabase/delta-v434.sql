-- v4.34 · O ATENDENTE 24H E O PILOTO AUTOMÁTICO.
-- O Thales: "pensa em algo pra gente fazer pra ser um app TOP DOS TOPS de funcionalidades e inteligência e conexão e
-- automatização e suporte e apoio pro usuário"; das ideias, escolheu o Atendente 24h e o Piloto automático.
--
-- O ATENDENTE 24H responde o cliente de quem usa o Corre no link na bio e na página do orçamento, de dia e de noite,
-- com o que a pessoa escreveu na ficha dela (o que faz, preços, como funciona, onde atende, as perguntas de sempre).
-- Quando o cliente quer fechar, ele pede o nome e o WhatsApp, e o cliente cai na Entrada do Hórus com o aviso no celular.
-- Quem fala com a IA é a função "atende" (sem login: o cliente não tem conta). Ela mexe no banco só por estas funções,
-- todas só pro servidor:
--   corre_atende_conversa  confere os limites (por conexão, por conversa, por dona e o total do dia), acha ou abre a
--                          conversa (a chave dela mora só no aparelho do cliente; aqui fica o md5) e anota o que o cliente
--                          escreveu. A conexão vira um md5 com o sal do banco, como o corre_ip_hash: o endereço não fica
--   corre_atende_responde  anota a resposta e, quando veio nome e WhatsApp, põe o cliente no Hórus (fonte "atende")
--   corre_atende_alvos     o aviso no celular da dona; a função push entrega junto com os pedidos (acao "pedidos")
--   corre_atende_velhas    a conversa parada há 90 dias fica vazia (o relógio do piloto chama)
-- Pro app: corre_atende_info (aberta: se o atendente daquela página tá ligado e o oi dele), corre_atende_salva (a ficha;
-- só a dona), corre_atende_visto e corre_atende_limpa (a dona limpa o que foi escrito numa conversa: a linha fica vazia,
-- só pra contagem). As tabelas o app só lê, e só as da própria dona.
--
-- O PILOTO AUTOMÁTICO põe no Caderninho o que tá esfriando, com o botão que resolve:
--   esfria    cliente do Hórus em Contatado, Interessado ou Proposta sem nada há N dias (e sem retorno marcado pra frente)
--   cobra     venda fechada que venceu (ou vence hoje) e não foi paga
--   studio    marca com o @ sem post nos próximos N dias
--   aprovado  orçamento aprovado pelo link vira as tarefas de começar e de entregar
-- corre_piloto_salva (liga e as receitas), corre_piloto_meu (como tá e o que ele fez), corre_piloto_ja (roda agora, só
-- pra quem pediu) e corre_piloto_roda (o relógio "corre-piloto", de hora em hora das 7h17 às 20h17 de Brasília, pra quem
-- ligou). A tarefa leva corre_caderno.piloto (a receita) e corre_caderno.liga (o que o botão abre: o cliente, a venda ou
-- a marca); o corre_piloto_log não deixa a mesma coisa voltar antes do tempo. O piloto nunca mexe no que já existe: só
-- anota tarefa nova.
--
-- Precisa da v4.16 (o aviso dos pedidos), da v4.19 (o Caderninho) e da v3.35 (os avisos). Pode rodar duas vezes.
-- Site antigo com o delta: nada muda pra ele. Site novo sem o delta: o atendente e o piloto dizem que falta o banco.
begin;

do $$
begin
  if to_regclass('public.corre_caderno') is null or to_regprocedure('public.corre_pedidos_alvos(timestamptz)') is null
     or to_regclass('public.corre_push_log') is null or to_regclass('public.corre_cota_log') is null then
    raise exception 'o delta v4.34 precisa da v4.16, da v4.19 e dos avisos (v3.35) antes';
  end if;
end $$;

-- 1) a ficha do atendente (uma por pessoa)
create table if not exists public.corre_atendente (
  dono uuid primary key references public.corre_perfis (id) on delete cascade,
  ligado boolean not null default false,
  ficha jsonb not null default '{}'::jsonb check (jsonb_typeof(ficha) = 'object' and pg_column_size(ficha) <= 16000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.corre_atendente enable row level security;

-- 2) as conversas (msgs: [{q: c (cliente) ou a (atendente), v, t}], as 60 últimas)
create table if not exists public.corre_atende_conversas (
  id uuid primary key default gen_random_uuid(),
  dono uuid not null references public.corre_perfis (id) on delete cascade,
  chave text not null,
  origem text not null default 'bio' check (origem in ('bio', 'orcamento')),
  msgs jsonb not null default '[]'::jsonb check (jsonb_typeof(msgs) = 'array' and jsonb_array_length(msgs) <= 60),
  n smallint not null default 0,
  nome text not null default '' check (char_length(nome) <= 80),
  whats text not null default '' check (whats ~ '^([0-9]{10,11})?$'),
  resumo text not null default '' check (char_length(resumo) <= 300),
  lead_id uuid references public.corre_leads (id) on delete set null,
  avisar_em timestamptz,
  visto boolean not null default false,
  limpa boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists corre_atende_conv_dono_idx on public.corre_atende_conversas (dono, updated_at desc);
create index if not exists corre_atende_conv_aviso_idx on public.corre_atende_conversas (avisar_em) where avisar_em is not null;
alter table public.corre_atende_conversas enable row level security;

-- 3) o piloto (uma linha por pessoa) e o que ele fez
create table if not exists public.corre_piloto (
  dono uuid primary key references public.corre_perfis (id) on delete cascade,
  ligado boolean not null default false,
  receitas jsonb not null default '{}'::jsonb check (jsonb_typeof(receitas) = 'object' and pg_column_size(receitas) <= 2000),
  rodou_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.corre_piloto enable row level security;
create table if not exists public.corre_piloto_log (
  id bigserial primary key,
  dono uuid not null references public.corre_perfis (id) on delete cascade,
  receita text not null check (receita in ('esfria', 'cobra', 'studio', 'aprovado')),
  ref text not null check (char_length(ref) <= 80),
  tarefa uuid,
  titulo text not null default '' check (char_length(titulo) <= 300),
  em timestamptz not null default now()
);
create index if not exists corre_piloto_log_idx on public.corre_piloto_log (dono, receita, ref, em desc);
create index if not exists corre_piloto_log_dono_idx on public.corre_piloto_log (dono, em desc);
alter table public.corre_piloto_log enable row level security;

-- o app só lê, e só o que é dele (quem escreve são as funções de baixo)
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'corre_atendente' and policyname = 'atendente: o meu') then
    create policy "atendente: o meu" on public.corre_atendente for select using (dono = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'corre_atende_conversas' and policyname = 'atende: as minhas') then
    create policy "atende: as minhas" on public.corre_atende_conversas for select using (dono = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'corre_piloto' and policyname = 'piloto: o meu') then
    create policy "piloto: o meu" on public.corre_piloto for select using (dono = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'corre_piloto_log' and policyname = 'piloto log: o meu') then
    create policy "piloto log: o meu" on public.corre_piloto_log for select using (dono = auth.uid());
  end if;
end $$;
-- (o Supabase dá sozinho todos os direitos pro anon e pro authenticated em tabela nova: tira, e devolve só a leitura)
revoke all on public.corre_atendente, public.corre_atende_conversas, public.corre_piloto, public.corre_piloto_log from public, anon, authenticated;
grant select on public.corre_atendente, public.corre_atende_conversas, public.corre_piloto, public.corre_piloto_log to authenticated;
revoke all on sequence public.corre_piloto_log_id_seq from public, anon, authenticated;

-- 4) a tarefa do piloto: a receita e o que o botão abre ({t: lead, venda ou marca, id, wa})
alter table public.corre_caderno add column if not exists piloto text, add column if not exists liga jsonb;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'corre_caderno_piloto_check' and conrelid = 'public.corre_caderno'::regclass) then
    alter table public.corre_caderno add constraint corre_caderno_piloto_check check (piloto is null or piloto in ('esfria', 'cobra', 'studio', 'aprovado'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'corre_caderno_liga_check' and conrelid = 'public.corre_caderno'::regclass) then
    alter table public.corre_caderno add constraint corre_caderno_liga_check check (liga is null or (jsonb_typeof(liga) = 'object' and pg_column_size(liga) <= 1000));
  end if;
end $$;
create index if not exists corre_caderno_piloto_idx on public.corre_caderno (dono, piloto) where piloto is not null and not feito;

-- ============================== o atendente ==============================

-- 5) aberta: o atendente da página tá ligado? (só isso, o primeiro nome e o oi: a ficha não sai daqui)
create or replace function public.corre_atende_info(p_h text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((
    select jsonb_build_object('on', true, 'nome', split_part(btrim(coalesce(p.nome, '')), ' ', 1), 'ola', left(btrim(coalesce(a.ficha ->> 'ola', '')), 200))
      from public.corre_perfis p join public.corre_atendente a on a.dono = p.id and a.ligado
     where p.handle = regexp_replace(lower(btrim(coalesce(p_h, ''))), '^@', '') and p.visibilidade = 'publico'
     limit 1), jsonb_build_object('on', false)) $$;
revoke all on function public.corre_atende_info(text) from public;
grant execute on function public.corre_atende_info(text) to anon, authenticated;

-- 6) a ficha, limpa aqui (cada campo no tamanho; as perguntas de sempre, até 12)
create or replace function public.corre_atende_salva(p_ligado boolean, p_ficha jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare eu uuid := auth.uid(); f jsonb := coalesce(p_ficha, '{}'::jsonb); fc jsonb; faq jsonb; liga boolean := coalesce(p_ligado, false);
begin
  if eu is null or not exists (select 1 from public.corre_perfis where id = eu) then
    raise exception 'sem perfil' using errcode = '42501', hint = 'perfil';
  end if;
  if jsonb_typeof(f) <> 'object' then f := '{}'::jsonb; end if;
  select coalesce(jsonb_agg(jsonb_build_object('p', left(btrim(x ->> 'p'), 200), 'r', left(btrim(x ->> 'r'), 600)) order by i), '[]'::jsonb) into faq
    from jsonb_array_elements(case when jsonb_typeof(f -> 'faq') = 'array' then f -> 'faq' else '[]'::jsonb end) with ordinality y(x, i)
   where i <= 12 and jsonb_typeof(x) = 'object' and btrim(coalesce(x ->> 'p', '')) <> '' and btrim(coalesce(x ->> 'r', '')) <> '';
  fc := jsonb_build_object(
    'sobre', left(btrim(coalesce(f ->> 'sobre', '')), 800), 'servicos', left(btrim(coalesce(f ->> 'servicos', '')), 1500),
    'precos', left(btrim(coalesce(f ->> 'precos', '')), 1000), 'como', left(btrim(coalesce(f ->> 'como', '')), 800),
    'onde', left(btrim(coalesce(f ->> 'onde', '')), 300), 'horario', left(btrim(coalesce(f ->> 'horario', '')), 300),
    'nunca', left(btrim(coalesce(f ->> 'nunca', '')), 600), 'ola', left(btrim(coalesce(f ->> 'ola', '')), 200),
    'tom', case when f ->> 'tom' in ('perto', 'direto', 'formal') then f ->> 'tom' else 'perto' end,
    'vitrine', coalesce(f ->> 'vitrine', '') <> 'false', 'faq', faq);
  -- ligado sem dizer o que faz, ele não teria o que responder
  if liga and fc ->> 'sobre' = '' and fc ->> 'servicos' = '' then raise exception 'ficha' using hint = 'ficha'; end if;
  insert into public.corre_atendente (dono, ligado, ficha) values (eu, liga, fc)
  on conflict (dono) do update set ligado = excluded.ligado, ficha = excluded.ficha, updated_at = now();
  return jsonb_build_object('ligado', liga, 'ficha', fc);
end $$;
revoke all on function public.corre_atende_salva(boolean, jsonb) from public, anon;
grant execute on function public.corre_atende_salva(boolean, jsonb) to authenticated;

-- 7) a dona viu, ou limpou o que foi escrito (a linha fica vazia: some da lista e conta só no número)
create or replace function public.corre_atende_visto(p_id uuid) returns boolean
language sql security definer set search_path = public as $$
  update public.corre_atende_conversas set visto = true where id = p_id and dono = auth.uid() and not visto returning true $$;
revoke all on function public.corre_atende_visto(uuid) from public, anon;
grant execute on function public.corre_atende_visto(uuid) to authenticated;

create or replace function public.corre_atende_limpa(p_id uuid) returns boolean
language sql security definer set search_path = public as $$
  update public.corre_atende_conversas set msgs = '[]'::jsonb, nome = '', whats = '', resumo = '', limpa = true, visto = true, avisar_em = null, updated_at = now()
   where id = p_id and dono = auth.uid() returning true $$;
revoke all on function public.corre_atende_limpa(uuid) from public, anon;
grant execute on function public.corre_atende_limpa(uuid) to authenticated;

-- 8) o servidor: confere os limites, acha ou abre a conversa e anota o que o cliente escreveu
create or replace function public.corre_atende_conversa(p_dono uuid, p_conversa uuid, p_chave text, p_origem text, p_ip text,
  p_msg text, p_lim_dono integer default 300, p_lim_geral integer default 5000) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  rede inet; sal text; hh text := ''; kip text; kdono text; nh int; nd int; nc int; ini timestamptz; c record;
  nova text := ''; msg text := left(btrim(coalesce(p_msg, '')), 500); ms jsonb;
begin
  if p_dono is null or msg = '' then return jsonb_build_object('ok', false, 'motivo', 'msg'); end if;
  ini := ((now() at time zone 'America/Sao_Paulo')::date)::timestamp at time zone 'America/Sao_Paulo';
  -- a conexão vira um md5 com o sal do banco (o jeito do corre_ip_hash; IPv6 conta pelo /64)
  begin rede := nullif(btrim(coalesce(p_ip, '')), '')::inet; exception when others then rede := null; end;
  if rede is not null then
    if family(rede) = 6 then rede := network(set_masklen(rede, 64)); end if;
    begin select pv.v into sal from public.corre_priv pv where pv.k = 'ip_sal'; exception when others then sal := null; end;
    hh := md5(host(rede) || '/' || masklen(rede) || '/' || coalesce(sal, ''));
  end if;
  kip := 'ip:atende:' || hh; kdono := 'atd:' || p_dono::text;
  perform pg_advisory_xact_lock(hashtext('cota:' || kdono));
  -- por conexão: 30 por hora e 120 por dia (sem conexão conhecida, vale o mesmo balde pra todo mundo)
  select count(*) filter (where created_at > now() - interval '1 hour'), count(*) into nh, nd
    from public.corre_cota_log where chave = kip and created_at > now() - interval '24 hours';
  if nh >= 30 or nd >= 120 then return jsonb_build_object('ok', false, 'motivo', 'ip'); end if;
  -- (o select roda sempre: sem conversa, o registro fica vazio, e não "sem valor")
  select x.* into c from public.corre_atende_conversas x
   where p_conversa is not null and coalesce(p_chave, '') ~ '^[0-9a-f]{32}$'
     and x.id = p_conversa and x.dono = p_dono and x.chave = md5(p_chave) and not x.limpa;
  if c.id is not null and c.n >= 30 then return jsonb_build_object('ok', false, 'motivo', 'conversa', 'id', c.id); end if;
  -- por dona (o padrão: 300 respostas por dia) e no total do Corre (o custo da IA tem teto)
  select count(*) into nc from public.corre_cota_log where chave = kdono and created_at >= ini;
  if nc >= greatest(1, least(coalesce(p_lim_dono, 300), 2000)) then return jsonb_build_object('ok', false, 'motivo', 'dono'); end if;
  select count(*) into nc from public.corre_cota_log where chave = 'atd:geral' and created_at >= ini;
  if nc >= greatest(1, least(coalesce(p_lim_geral, 5000), 50000)) then return jsonb_build_object('ok', false, 'motivo', 'geral'); end if;
  if c.id is null then
    -- conversa nova: no máximo 12 por conexão por dia
    select count(*) into nc from public.corre_cota_log where chave = 'ip:atendec:' || hh and created_at > now() - interval '24 hours';
    if nc >= 12 then return jsonb_build_object('ok', false, 'motivo', 'ip'); end if;
    insert into public.corre_cota_log (chave) values ('ip:atendec:' || hh);
    nova := md5(gen_random_uuid()::text || clock_timestamp()::text || random()::text);
    insert into public.corre_atende_conversas (dono, chave, origem) values (p_dono, md5(nova), case when p_origem = 'orcamento' then 'orcamento' else 'bio' end)
    returning * into c;
  end if;
  insert into public.corre_cota_log (chave) values (kip), (kdono), ('atd:geral');
  ms := c.msgs || jsonb_build_array(jsonb_build_object('q', 'c', 'v', msg, 't', now()));
  if jsonb_array_length(ms) > 58 then
    ms := (select jsonb_agg(e order by i) from jsonb_array_elements(ms) with ordinality z(e, i) where i > jsonb_array_length(ms) - 58);
  end if;
  update public.corre_atende_conversas set msgs = ms, n = n + 1, visto = false, updated_at = now() where id = c.id;
  return jsonb_build_object('ok', true, 'id', c.id, 'chave', nova, 'n', c.n + 1, 'lead', c.lead_id is not null, 'nome', c.nome, 'whats', c.whats,
    'msgs', (select coalesce(jsonb_agg(e order by i), '[]'::jsonb) from jsonb_array_elements(ms) with ordinality z(e, i) where i > jsonb_array_length(ms) - 16));
end $$;
revoke all on function public.corre_atende_conversa(uuid, uuid, text, text, text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.corre_atende_conversa(uuid, uuid, text, text, text, text, integer, integer) to service_role;

-- 8b) o servidor: a dona da página pelo @ (o perfil público, o atendente e o catálogo com preço, numa chamada só; a chave
--     do servidor não lê as tabelas direto, só por função)
create or replace function public.corre_atende_dona(p_h text) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare r jsonb;
begin
  select jsonb_build_object('id', p.id, 'handle', p.handle, 'nome', p.nome, 'faz', p.faz, 'cidade', p.cidade, 'whats_publico', p.whats_publico,
           'ligado', coalesce(a.ligado, false), 'ficha', coalesce(a.ficha, '{}'::jsonb),
           'itens', case when coalesce(a.ficha ->> 'vitrine', '') = 'false' then '[]'::jsonb else
             coalesce((select jsonb_agg(jsonb_build_object('nome', x.nome, 'preco', x.preco, 'unidade', x.unidade, 'descricao', x.descricao) order by x.ordem, x.created_at)
                         from (select * from public.corre_produtos pr where pr.dono = p.id and pr.publico order by pr.ordem, pr.created_at limit 30) x), '[]'::jsonb) end)
    into r
    from public.corre_perfis p left join public.corre_atendente a on a.dono = p.id
   where p.handle = regexp_replace(lower(btrim(coalesce(p_h, ''))), '^@', '') and p.visibilidade = 'publico'
   limit 1;
  return r;
end $$;
revoke all on function public.corre_atende_dona(text) from public, anon, authenticated;
grant execute on function public.corre_atende_dona(text) to service_role;

-- 9) o servidor: anota a resposta; veio nome e WhatsApp, o cliente vai pro Hórus (uma vez por conversa)
create or replace function public.corre_atende_responde(p_conversa uuid, p_resposta text, p_nome text default '', p_whats text default '',
  p_resumo text default '') returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  c record; ms jsonb; d text := regexp_replace(coalesce(p_whats, ''), '[^0-9]', '', 'g'); nm text := left(btrim(coalesce(p_nome, '')), 80);
  rs text := left(btrim(coalesce(p_resumo, '')), 280); reg jsonb; lid uuid; n24 int; novo boolean := false;
begin
  select x.* into c from public.corre_atende_conversas x where x.id = p_conversa for update;
  if c.id is null or c.limpa then return jsonb_build_object('ok', false); end if;
  ms := c.msgs || jsonb_build_array(jsonb_build_object('q', 'a', 'v', left(btrim(coalesce(p_resposta, '')), 1200), 't', now()));
  if jsonb_array_length(ms) > 60 then
    ms := (select jsonb_agg(e order by i) from jsonb_array_elements(ms) with ordinality z(e, i) where i > jsonb_array_length(ms) - 60);
  end if;
  if length(d) > 11 and left(d, 2) = '55' then d := substr(d, 3); end if;
  if length(d) not in (10, 11) then d := ''; end if;
  if char_length(nm) < 2 then nm := ''; end if;
  if c.lead_id is null and d <> '' and nm <> '' then
    select count(*) into n24 from public.corre_leads where dono = c.dono and fonte = 'atende' and created_at > now() - interval '24 hours';
    if n24 < 40 then
      reg := jsonb_build_object('t', now(), 'k', 'res', 'v', left('Atendente 24h: ' || coalesce(nullif(rs, ''), 'deixou o WhatsApp pra você chamar.'), 300));
      select id into lid from public.corre_leads where dono = c.dono and (wa = d or fixo = d) limit 1;
      if lid is not null then
        update public.corre_leads l
           set st = case when l.st in ('fechado', 'link') then l.st else 'interesse' end, prox = (now() at time zone 'America/Sao_Paulo')::date,
               obs = left('Pelo Atendente 24h (' || nm || '): ' || rs || E'\n' || coalesce(l.obs, ''), 1000),
               hist = (select coalesce(jsonb_agg(e order by i), '[]'::jsonb) from jsonb_array_elements(jsonb_build_array(reg) || coalesce(l.hist, '[]'::jsonb)) with ordinality x(e, i) where i <= 40)
         where l.id = lid;
      else
        insert into public.corre_leads (dono, nome, wa, fixo, tel, obs, st, prox, fonte, potencial, hist)
        values (c.dono, nm, case when length(d) = 11 then d else '' end, case when length(d) = 10 then d else '' end, d,
                left('Pelo Atendente 24h (' || nm || '): ' || rs, 1000), 'interesse', (now() at time zone 'America/Sao_Paulo')::date, 'atende', 1, jsonb_build_array(reg))
        returning id into lid;
      end if;
      novo := true;
    end if;
  end if;
  update public.corre_atende_conversas
     set msgs = ms, updated_at = now(),
         nome = case when nm <> '' then nm else nome end, whats = case when d <> '' then d else whats end,
         resumo = case when rs <> '' then rs else resumo end,
         lead_id = coalesce(lead_id, lid), avisar_em = case when novo then now() else avisar_em end
   where id = c.id;
  return jsonb_build_object('ok', true, 'lead', novo, 'lead_id', coalesce(c.lead_id, lid));
end $$;
revoke all on function public.corre_atende_responde(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.corre_atende_responde(uuid, text, text, text, text) to service_role;

-- 10) o aviso no celular da dona: o cliente deixou o WhatsApp (o mesmo formato do corre_pedidos_alvos)
create or replace function public.corre_atende_alvos(p_agora timestamptz default now()) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare c record; subs jsonb; ja bigint; mostra boolean; out jsonb := '[]'::jsonb; quem text;
begin
  for c in select x.id, x.dono, x.nome, x.resumo from public.corre_atende_conversas x
            where x.avisar_em > p_agora - interval '10 minutes' and x.avisar_em <= p_agora + interval '1 minute' and not x.limpa
            order by x.avisar_em limit 200 loop
    continue when coalesce((select pr.msg from public.corre_push_pref pr where pr.dono = c.dono), true) = false;
    subs := (select jsonb_agg(jsonb_build_object('endpoint', d.endpoint, 'p256dh', d.p256dh, 'auth', d.auth) order by d.visto_em desc)
               from (select * from public.corre_push d2 where d2.dono = c.dono order by d2.visto_em desc limit 10) d);
    continue when subs is null;
    insert into public.corre_push_log (chave, quem) values ('atd:' || c.id, null) on conflict do nothing;
    get diagnostics ja = row_count;
    continue when ja = 0;
    mostra := coalesce((select pr.texto from public.corre_push_pref pr where pr.dono = c.dono), true);
    quem := left(btrim(coalesce(c.nome, '')), 60);
    out := out || jsonb_build_array(jsonb_build_object('para', c.dono, 'tipo', 'atende', 'subs', subs,
      'payload', jsonb_build_object('titulo', left('Cliente pelo Atendente' || case when quem <> '' then ': ' || quem else '' end, 120),
        'corpo', left(case when mostra and btrim(coalesce(c.resumo, '')) <> '' then c.resumo || ' Chama no WhatsApp.' else 'Deixou o WhatsApp. Toca pra ver a conversa.' end, 300),
        'url', '/#/atendente/c/' || c.id, 'tag', 'atd-' || c.id, 'renotify', true, 't', 'pedido', 'em', now())));
  end loop;
  return out;
end $$;
revoke all on function public.corre_atende_alvos(timestamptz) from public, anon, authenticated;
grant execute on function public.corre_atende_alvos(timestamptz) to service_role;

-- 11) a conversa parada há 90 dias fica vazia (o que o cliente escreveu não fica guardado pra sempre)
create or replace function public.corre_atende_velhas() returns integer
language sql security definer set search_path = public as $$
  with v as (update public.corre_atende_conversas set msgs = '[]'::jsonb, nome = '', whats = '', resumo = '', limpa = true, avisar_em = null
              where not limpa and updated_at < now() - interval '90 days' returning 1)
  select count(*)::int from v $$;
revoke all on function public.corre_atende_velhas() from public, anon, authenticated;
grant execute on function public.corre_atende_velhas() to service_role;

-- ============================== o piloto ==============================

-- 12) liga e as receitas ({esfria: {on, dias}, cobra: {on}, studio: {on, dias}, aprovado: {on}})
create or replace function public.corre_piloto_limpa(p jsonb) returns jsonb
language sql immutable set search_path = public as $$
  select jsonb_build_object(
    'esfria', jsonb_build_object('on', coalesce(p #>> '{esfria,on}', '') <> 'false',
                                 'dias', case when coalesce(p #>> '{esfria,dias}', '') ~ '^[0-9]{1,2}$' then least(30, greatest(2, (p #>> '{esfria,dias}')::int)) else 5 end),
    'cobra', jsonb_build_object('on', coalesce(p #>> '{cobra,on}', '') <> 'false'),
    'studio', jsonb_build_object('on', coalesce(p #>> '{studio,on}', '') <> 'false',
                                 'dias', case when coalesce(p #>> '{studio,dias}', '') ~ '^[0-9]{1,2}$' then least(14, greatest(3, (p #>> '{studio,dias}')::int)) else 7 end),
    'aprovado', jsonb_build_object('on', coalesce(p #>> '{aprovado,on}', '') <> 'false')) $$;

create or replace function public.corre_piloto_salva(p_ligado boolean, p_receitas jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare eu uuid := auth.uid(); r jsonb := public.corre_piloto_limpa(coalesce(p_receitas, '{}'::jsonb));
begin
  if eu is null or not exists (select 1 from public.corre_perfis where id = eu) then
    raise exception 'sem perfil' using errcode = '42501', hint = 'perfil';
  end if;
  insert into public.corre_piloto (dono, ligado, receitas) values (eu, coalesce(p_ligado, false), r)
  on conflict (dono) do update set ligado = excluded.ligado, receitas = excluded.receitas, updated_at = now();
  return jsonb_build_object('ligado', coalesce(p_ligado, false), 'receitas', r);
end $$;
revoke all on function public.corre_piloto_salva(boolean, jsonb) from public, anon;
grant execute on function public.corre_piloto_salva(boolean, jsonb) to authenticated;

-- 13) anota uma tarefa do piloto, se ela ainda não tá aberta e não voltou antes do tempo
create or replace function public.corre_piloto_poe(p_dono uuid, p_receita text, p_ref text, p_titulo text, p_nota text, p_dia date,
  p_prio smallint, p_liga jsonb, p_espera interval) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare tid uuid;
begin
  if exists (select 1 from public.corre_caderno t where t.dono = p_dono and t.piloto = p_receita and not t.feito and t.liga ->> 'ref' = p_ref) then return null; end if;
  if exists (select 1 from public.corre_piloto_log g where g.dono = p_dono and g.receita = p_receita and g.ref = p_ref and g.em > now() - p_espera) then return null; end if;
  -- no máximo 25 do piloto abertas: ele ajuda, não entope
  if (select count(*) from public.corre_caderno t where t.dono = p_dono and t.piloto is not null and not t.feito) >= 25 then return null; end if;
  insert into public.corre_caderno (dono, titulo, nota, lista, dia, prio, piloto, liga)
  values (p_dono, left(p_titulo, 300), left(coalesce(p_nota, ''), 2000), '', p_dia, least(4, greatest(1, coalesce(p_prio, 2))), p_receita,
          coalesce(p_liga, '{}'::jsonb) || jsonb_build_object('ref', p_ref))
  returning id into tid;
  insert into public.corre_piloto_log (dono, receita, ref, tarefa, titulo) values (p_dono, p_receita, left(p_ref, 80), tid, left(p_titulo, 300));
  return tid;
end $$;
revoke all on function public.corre_piloto_poe(uuid, text, text, text, text, date, smallint, jsonb, interval) from public, anon, authenticated;

-- (a hora de cada registro do lead: texto que não é data não derruba a conta)
create or replace function public.corre_piloto_ts(p text) returns timestamptz
language plpgsql immutable as $$
begin
  if p is null or p !~ '^\d{4}-\d{2}-\d{2}' then return null; end if;
  return p::timestamptz;
exception when others then return null;
end $$;

-- 14) as receitas de uma pessoa (devolve o que anotou)
create or replace function public.corre_piloto_de(p_dono uuid, p_agora timestamptz default now()) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  cfg jsonb; hj date := (p_agora at time zone 'America/Sao_Paulo')::date; r record; tid uuid; tit text; dias int; out jsonb := '[]'::jsonb;
  nome text; quanto int; etapa text;
begin
  select public.corre_piloto_limpa(p.receitas) into cfg from public.corre_piloto p where p.dono = p_dono and p.ligado;
  if cfg is null then return out; end if;

  -- esfria: o cliente em andamento parado há N dias (sem retorno marcado pra frente)
  if (cfg #>> '{esfria,on}')::boolean then
    dias := (cfg #>> '{esfria,dias}')::int;
    for r in select l.id, l.nome, l.st, l.wa, l.fixo, coalesce(u.t, l.updated_at) as ult
               from public.corre_leads l
               left join lateral (select max(public.corre_piloto_ts(e ->> 't')) as t
                                    from jsonb_array_elements(case when jsonb_typeof(l.hist) = 'array' then l.hist else '[]'::jsonb end) e) u on true
              where l.dono = p_dono and l.st in ('contato', 'interesse', 'link') and (l.prox is null or l.prox <= hj)
                and coalesce(u.t, l.updated_at) < p_agora - make_interval(days => dias)
              order by (l.st = 'link') desc, l.valor desc nulls last, coalesce(u.t, l.updated_at)
              limit 5 loop
      nome := left(btrim(coalesce(r.nome, 'o cliente')), 60);
      quanto := greatest(dias, hj - (r.ult at time zone 'America/Sao_Paulo')::date);
      etapa := case r.st when 'contato' then 'contatado, sem resposta' when 'interesse' then 'interessado, parado' else 'proposta parada' end;
      tit := 'Retomar ' || nome || ' (' || etapa || ' há ' || quanto || ' dias)';
      tid := public.corre_piloto_poe(p_dono, 'esfria', r.id::text, tit,
        'O piloto viu que esse cliente esfriou. Uma mensagem curta agora vale mais que a perfeita depois.', hj, 2::smallint,
        jsonb_build_object('t', 'lead', 'id', r.id, 'wa', coalesce(nullif(r.wa, ''), nullif(r.fixo, ''), '')), make_interval(days => dias));
      if tid is not null then out := out || jsonb_build_array(jsonb_build_object('receita', 'esfria', 'titulo', tit, 'tarefa', tid)); end if;
    end loop;
  end if;

  -- cobra: venda fechada que venceu (ou vence hoje) e não foi paga. O valor não vai no título: aparece na tela do celular
  if (cfg #>> '{cobra,on}')::boolean then
    for r in select v.id, v.cliente, v.vence, v.whats from public.corre_vendas v
              where v.dono = p_dono and v.st = 'fechado' and v.pago_em is null and v.vence is not null and v.vence <= hj and v.vence >= hj - 120
              order by v.vence limit 5 loop
      tit := 'Cobrar ' || left(btrim(coalesce(nullif(r.cliente, ''), 'o cliente')), 60) || case when r.vence = hj then ' (vence hoje)' else ' (venceu ' || to_char(r.vence, 'DD/MM') || ')' end;
      tid := public.corre_piloto_poe(p_dono, 'cobra', r.id::text, tit,
        'O piloto achou essa cobrança em aberto. Manda o lembrete com o Pix ou o link do orçamento.', hj,
        (case when r.vence < hj then 1 else 2 end)::smallint, jsonb_build_object('t', 'venda', 'id', r.id, 'wa', coalesce(r.whats, '')), interval '3 days');
      if tid is not null then out := out || jsonb_build_array(jsonb_build_object('receita', 'cobra', 'titulo', tit, 'tarefa', tid)); end if;
    end loop;
  end if;

  -- studio: a marca com o @ que não tem post nos próximos N dias
  if (cfg #>> '{studio,on}')::boolean then
    dias := (cfg #>> '{studio,dias}')::int;
    for r in select m.id, m.marca from public.corre_portfolio m
              where m.dono = p_dono and btrim(coalesce(m.rede, '')) <> ''
                and not exists (select 1 from public.corre_posts x where x.marca_id = m.id and x.data between hj and hj + dias and coalesce(x.status, '') <> 'ideia')
              order by m.ordem nulls last, m.created_at limit 3 loop
      tit := 'Programar os posts da ' || left(btrim(coalesce(nullif(r.marca, ''), 'marca')), 60) || ' (nada nos próximos ' || dias || ' dias)';
      tid := public.corre_piloto_poe(p_dono, 'studio', r.id::text, tit,
        'O piloto viu a agenda da marca vazia. O Mês com IA do Studio enche a semana numa tacada.', hj, 2::smallint,
        jsonb_build_object('t', 'marca', 'id', r.id), interval '7 days');
      if tid is not null then out := out || jsonb_build_array(jsonb_build_object('receita', 'studio', 'titulo', tit, 'tarefa', tid)); end if;
    end loop;
  end if;

  -- aprovado: o cliente aprovou o orçamento pelo link; vira começar (hoje) e entregar (no dia da entrega)
  if (cfg #>> '{aprovado,on}')::boolean then
    for r in select v.id, v.cliente, v.entrega, v.whats, coalesce(v.itens -> 0 ->> 'n', '') as item from public.corre_vendas v
              where v.dono = p_dono and v.aprovado_em > p_agora - interval '3 days' and v.st in ('fechado', 'pago')
              order by v.aprovado_em limit 5 loop
      nome := left(btrim(coalesce(nullif(r.cliente, ''), 'o cliente')), 60);
      tit := 'Começar ' || case when btrim(r.item) <> '' then left(btrim(r.item), 60) || ' de ' else 'o trabalho de ' end || nome;
      tid := public.corre_piloto_poe(p_dono, 'aprovado', r.id::text || ':comeca', tit,
        'Aprovou o orçamento pelo link. Combina os detalhes e o começo com o cliente.', hj, 2::smallint,
        jsonb_build_object('t', 'venda', 'id', r.id, 'wa', coalesce(r.whats, '')), interval '3650 days');
      if tid is not null then out := out || jsonb_build_array(jsonb_build_object('receita', 'aprovado', 'titulo', tit, 'tarefa', tid)); end if;
      if r.entrega is not null and r.entrega >= hj then
        tit := 'Entregar pra ' || nome;
        tid := public.corre_piloto_poe(p_dono, 'aprovado', r.id::text || ':entrega', tit, 'O dia da entrega que tá no orçamento.', r.entrega, 2::smallint,
          jsonb_build_object('t', 'venda', 'id', r.id, 'wa', coalesce(r.whats, '')), interval '3650 days');
        if tid is not null then out := out || jsonb_build_array(jsonb_build_object('receita', 'aprovado', 'titulo', tit, 'tarefa', tid)); end if;
      end if;
    end loop;
  end if;

  update public.corre_piloto set rodou_em = now() where dono = p_dono;
  return out;
end $$;
revoke all on function public.corre_piloto_de(uuid, timestamptz) from public, anon, authenticated;

-- 15) o app: como tá e o que ele fez nos últimos 30 dias
create or replace function public.corre_piloto_meu() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'ligado', coalesce((select p.ligado from public.corre_piloto p where p.dono = auth.uid()), false),
    'existe', exists (select 1 from public.corre_piloto p where p.dono = auth.uid()),
    'receitas', public.corre_piloto_limpa(coalesce((select p.receitas from public.corre_piloto p where p.dono = auth.uid()), '{}'::jsonb)),
    'rodou_em', (select p.rodou_em from public.corre_piloto p where p.dono = auth.uid()),
    'abertas', (select count(*) from public.corre_caderno t where t.dono = auth.uid() and t.piloto is not null and not t.feito),
    'feitas', (select count(*) from public.corre_caderno t where t.dono = auth.uid() and t.piloto is not null and t.feito and t.feito_em > now() - interval '30 days'),
    'log', coalesce((select jsonb_agg(jsonb_build_object('receita', g.receita, 'titulo', g.titulo, 'tarefa', g.tarefa, 'em', g.em) order by g.em desc)
                       from (select * from public.corre_piloto_log g2 where g2.dono = auth.uid() and g2.em > now() - interval '30 days' order by g2.em desc limit 30) g), '[]'::jsonb))
  where auth.uid() is not null $$;
revoke all on function public.corre_piloto_meu() from public, anon;
grant execute on function public.corre_piloto_meu() to authenticated;

-- 16) o app: roda agora (só pra quem pediu, uma vez a cada 2 minutos)
create or replace function public.corre_piloto_ja() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare eu uuid := auth.uid(); p record;
begin
  if eu is null then raise exception 'login' using errcode = '42501', hint = 'login'; end if;
  select * into p from public.corre_piloto where dono = eu;
  if p.dono is null or not p.ligado then return jsonb_build_object('ok', false, 'motivo', 'desligado', 'feitas', '[]'::jsonb); end if;
  perform pg_advisory_xact_lock(hashtext('piloto:' || eu::text));
  if p.rodou_em > now() - interval '2 minutes' then return jsonb_build_object('ok', true, 'cedo', true, 'feitas', '[]'::jsonb); end if;
  return jsonb_build_object('ok', true, 'feitas', public.corre_piloto_de(eu, now()));
end $$;
revoke all on function public.corre_piloto_ja() from public, anon;
grant execute on function public.corre_piloto_ja() to authenticated;

-- 17) o relógio: pra todo mundo que ligou (quem rodou há menos de 50 minutos, pelo app, fica pra próxima)
create or replace function public.corre_piloto_roda(p_agora timestamptz default now()) returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare p record; n int := 0;
begin
  for p in select x.dono from public.corre_piloto x where x.ligado and (x.rodou_em is null or x.rodou_em < p_agora - interval '50 minutes') limit 2000 loop
    begin
      n := n + jsonb_array_length(public.corre_piloto_de(p.dono, p_agora));
    exception when others then
      raise warning '[piloto] %: %', p.dono, sqlerrm;
    end;
  end loop;
  return n;
end $$;
revoke all on function public.corre_piloto_roda(timestamptz) from public, anon, authenticated;
grant execute on function public.corre_piloto_roda(timestamptz) to service_role;

commit;

-- 18) o relógio do piloto (e a limpeza das conversas velhas do atendente), de hora em hora das 7h17 às 20h17 de
--     Brasília. Sem o pg_cron (o banco de teste), passa. O schedule com o mesmo nome troca o que tinha
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('corre-piloto', '17 10-23 * * *', 'select public.corre_piloto_roda(now()); select public.corre_atende_velhas();');
  end if;
end $$;

select case when to_regclass('public.corre_atendente') is not null and to_regclass('public.corre_atende_conversas') is not null
             and to_regclass('public.corre_piloto') is not null and to_regclass('public.corre_piloto_log') is not null
             and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'corre_caderno' and column_name = 'liga')
             and has_function_privilege('anon', 'public.corre_atende_info(text)', 'execute')
             and not has_function_privilege('anon', 'public.corre_atende_conversa(uuid,uuid,text,text,text,text,integer,integer)', 'execute')
             and not has_function_privilege('anon', 'public.corre_atende_dona(text)', 'execute')
             and has_function_privilege('service_role', 'public.corre_atende_dona(text)', 'execute')
             and not has_function_privilege('authenticated', 'public.corre_atende_responde(uuid,text,text,text,text)', 'execute')
             and not has_function_privilege('authenticated', 'public.corre_atende_alvos(timestamptz)', 'execute')
             and not has_function_privilege('authenticated', 'public.corre_piloto_roda(timestamptz)', 'execute')
             and not has_function_privilege('authenticated', 'public.corre_piloto_de(uuid,timestamptz)', 'execute')
             and not has_table_privilege('authenticated', 'public.corre_atende_conversas', 'insert')
             and not has_table_privilege('anon', 'public.corre_atendente', 'select')
            then 'delta v4.34 ok' else 'delta v4.34 NÃO TERMINOU: rode o arquivo inteiro de novo.' end as status;
