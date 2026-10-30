-- v5.09 · O LINK NO PERFIL, O ANIVERSÁRIO E A MULTA DE QUEM É PRESO.
-- O Thales: "usuario pode colocar link no perfil", "e data de nascimento tambem" e "quando vai preso perde correal".
--   corre_perfis.link     o link do perfil (site, portfólio, loja): só https, até 300 letras. Aparece pra todo mundo,
--        como a bio.
--   corre_perfis.aniver   o dia e o mês do aniversário ('MM-DD'), só quando a pessoa deixa mostrar. O ano nunca vai
--        pra cá: a tabela de perfis é lida por qualquer um.
--   corre_nascimento      a data inteira, guardada à parte: só a própria pessoa lê (RLS), ninguém do app escreve direto.
--   corre_nascimento_salva(p_dia, p_mostra)   pelo login: grava a data (null apaga), se mostra o aniversário, e acerta
--        o aniver do perfil junto. A data tem que estar entre 1900 e hoje (dia de Brasília). Sem DELETE: apagar deixa a
--        data vazia (o conector do Supabase não roda função com DELETE sem uma confirmação que não aparece na sessão).
--   corre_correal_multa(p_estrelas)   pelo login: o Correverso cobra quem foi preso. 0,02 de correal por estrela (até 5,
--        então até 0,10 por prisão), uma vez por prisão (uma multa a cada 60 s no máximo), até 0,30 por dia, e nunca
--        mais do que tem na carteira (o saldo não fica negativo). Extrato 'multa:preso'. Devolve ok, perdeu, saldo,
--        multas (o que já pagou hoje) e teto; recusado, o motivo 'ja' (acabou de pagar uma).
--   corre_posts.aprov_itens   o que o cliente marcou pra mudar no link de aprovação (O Thales: "na demo aparece a opção da
--        pessoa selecionar o que precisa ser mudado"): 'arte', 'texto', 'legenda', 'hashtags', 'capa', 'video', 'data',
--        'ordem', 'cores', 'logo', 'outro' e 'slide:1' a 'slide:20'. Só o cliente escreve (pelo corre_aprov_ajuste); o app
--        do dono só limpa (o gatilho corre_posts_aprov_itens). Mudar a arte ou a legenda volta o post pro cliente e os itens
--        ficam, como o recado (o "ajuste pedido antes").
--   corre_aprov_ajuste(p_codigo, p_post, p_itens, p_nota, p_quem)   a página do cliente (sem login): o ajuste com os itens
--        marcados (os que valem, sem repetir) e o recado; precisa de pelo menos um dos dois. O corre_aprov_responder (o de
--        antes) agora também limpa os itens, e o corre_aprov_ver devolve eles ('itens').
-- O correal continua NÃO sendo dinheiro: a multa só tira correal, a moeda do jogo.
--
-- (O Muralzim, mais embaixo, no item 5.)
-- Precisa da v3.43 (o correal em centavos), da v4.17 (o link de aprovação) e da v4.02 (corre_ve_lojinha). Pode rodar duas vezes. Sem DROP e sem DELETE. Site antigo com o delta: nada
-- muda pra ele. Site novo sem o delta: o link e a data avisam que ainda não tão ligados, e a prisão não cobra.
begin;

do $$
begin
  if to_regclass('public.corre_correal_log') is null or to_regclass('public.corre_correal') is null
     or to_regprocedure('public.corre_aprov_link(text,text,integer,integer)') is null then
    raise exception 'o delta v5.09 precisa do v3.43 e do v4.17 antes (o correal em centavos e o link de aprovação)';
  end if;
end $$;

-- 1) O LINK E O ANIVERSÁRIO NO PERFIL
alter table public.corre_perfis add column if not exists link text not null default '';
alter table public.corre_perfis add column if not exists aniver text not null default '';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'corre_perfis_link_ck' and conrelid = 'public.corre_perfis'::regclass) then
    alter table public.corre_perfis add constraint corre_perfis_link_ck check (link = '' or (char_length(link) <= 300
      and link ~ '^https://[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}(:[0-9]{2,5})?([/?#][^[:space:]<>"''\\]*)?$'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'corre_perfis_aniver_ck' and conrelid = 'public.corre_perfis'::regclass) then
    alter table public.corre_perfis add constraint corre_perfis_aniver_ck check (aniver = '' or aniver ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$');
  end if;
end $$;

-- 2) A DATA DE NASCIMENTO INTEIRA, SÓ DA PRÓPRIA PESSOA
create table if not exists public.corre_nascimento (
  dono uuid primary key references public.corre_perfis(id) on delete cascade,
  nasceu date,
  mostra boolean not null default true,
  mexido timestamptz not null default now()
);
alter table public.corre_nascimento enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'corre_nascimento' and policyname = 'nascimento: só eu leio') then
    create policy "nascimento: só eu leio" on public.corre_nascimento for select to authenticated using (dono = auth.uid());
  end if;
end $$;
-- o Supabase dá tudo pro anon e pro authenticated em tabela nova: aqui só o dono lê, pela política; ninguém escreve
revoke all on table public.corre_nascimento from anon, authenticated;
grant select on table public.corre_nascimento to authenticated;

create or replace function public.corre_nascimento_salva(p_dia date, p_mostra boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare eu uuid := auth.uid(); hj date := (now() at time zone 'America/Sao_Paulo')::date; m boolean := coalesce(p_mostra, true); an text;
begin
  if eu is null then return jsonb_build_object('ok', false, 'motivo', 'login'); end if;
  if not exists (select 1 from public.corre_perfis where id = eu) then return jsonb_build_object('ok', false, 'motivo', 'perfil'); end if;
  if p_dia is not null and (p_dia < date '1900-01-01' or p_dia > hj) then return jsonb_build_object('ok', false, 'motivo', 'data'); end if;
  insert into public.corre_nascimento as n (dono, nasceu, mostra, mexido) values (eu, p_dia, m, now())
    on conflict (dono) do update set nasceu = excluded.nasceu, mostra = excluded.mostra, mexido = now();
  an := case when p_dia is not null and m then to_char(p_dia, 'MM-DD') else '' end;
  update public.corre_perfis set aniver = an where id = eu and aniver is distinct from an;
  return jsonb_build_object('ok', true, 'aniver', an);
end $$;
revoke all on function public.corre_nascimento_salva(date, boolean) from public, anon;
grant execute on function public.corre_nascimento_salva(date, boolean) to authenticated;

-- 3) A MULTA DE QUEM É PRESO NO CORREVERSO, com o mesmo cadeado da carteira
create or replace function public.corre_correal_multa(p_estrelas integer) returns jsonb
language plpgsql security definer set search_path = public as $$
declare eu uuid := auth.uid(); n int := least(5, greatest(1, coalesce(p_estrelas, 1))); ult timestamptz; ja numeric; s numeric;
        teto numeric := 0.30; v numeric; perdeu numeric;
        dia timestamptz := ((now() at time zone 'America/Sao_Paulo')::date)::timestamp at time zone 'America/Sao_Paulo';
begin
  if eu is null then return jsonb_build_object('ok', false, 'motivo', 'login'); end if;
  perform pg_advisory_xact_lock(hashtext('correal:' || eu::text));
  -- uma prisão, uma multa: a segunda chamada logo em seguida (o mesmo preso mandado duas vezes) não cobra de novo
  select max(created_at) into ult from public.corre_correal_log where dono = eu and motivo like 'multa:%' and created_at > now() - interval '2 minutes';
  if ult is not null and now() - ult < interval '60 seconds' then return jsonb_build_object('ok', false, 'motivo', 'ja'); end if;
  select coalesce(-sum(valor), 0) into ja from public.corre_correal_log where dono = eu and motivo like 'multa:%' and created_at >= dia;
  select saldo into s from public.corre_correal where dono = eu;
  s := coalesce(s, 0);
  v := n * 0.02;
  perdeu := greatest(0, least(v, teto - ja, s));
  if perdeu <= 0 then
    return jsonb_build_object('ok', true, 'perdeu', 0, 'saldo', s, 'multas', ja, 'teto', teto, 'motivo', case when s <= 0 then 'liso' else 'teto' end);
  end if;
  insert into public.corre_correal_log (dono, valor, motivo) values (eu, -perdeu, 'multa:preso');
  update public.corre_correal set saldo = saldo - perdeu, gasto = coalesce(gasto, 0) + perdeu, updated_at = now() where dono = eu returning saldo into s;
  return jsonb_build_object('ok', true, 'perdeu', perdeu, 'saldo', coalesce(s, 0), 'multas', ja + perdeu, 'teto', teto);
end $$;
revoke all on function public.corre_correal_multa(integer) from public, anon;
grant execute on function public.corre_correal_multa(integer) to authenticated;

-- 4) O QUE O CLIENTE MARCOU PRA MUDAR (o link de aprovação)
alter table public.corre_posts add column if not exists aprov_itens text[] not null default '{}';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'corre_posts_aprov_itens_ck' and conrelid = 'public.corre_posts'::regclass) then
    alter table public.corre_posts add constraint corre_posts_aprov_itens_ck check (cardinality(aprov_itens) <= 24 and aprov_itens <@ array[
      'arte', 'texto', 'legenda', 'hashtags', 'capa', 'video', 'data', 'ordem', 'cores', 'logo', 'outro',
      'slide:1', 'slide:2', 'slide:3', 'slide:4', 'slide:5', 'slide:6', 'slide:7', 'slide:8', 'slide:9', 'slide:10',
      'slide:11', 'slide:12', 'slide:13', 'slide:14', 'slide:15', 'slide:16', 'slide:17', 'slide:18', 'slide:19', 'slide:20']::text[]);
  end if;
end $$;
-- quem escreve os itens é o cliente (pela função, que roda como o dono do banco); o app do dono só limpa
create or replace function public.corre_posts_aprov_itens_ok() returns trigger language plpgsql as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if tg_op = 'INSERT' then new.aprov_itens := '{}';
  elsif new.aprov_itens is distinct from old.aprov_itens and cardinality(new.aprov_itens) > 0 then new.aprov_itens := old.aprov_itens;
  end if;
  return new;
end $$;
create or replace trigger corre_posts_aprov_itens before insert or update of aprov_itens on public.corre_posts
  for each row execute function public.corre_posts_aprov_itens_ok();

create or replace function public.corre_aprov_ver(p_codigo text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a public.corre_aprovacoes; m public.corre_portfolio; pf public.corre_perfis; ps jsonb;
begin
  a := public.corre_aprov_link(p_codigo, 'aprov-ver', 120, 600);
  update public.corre_aprovacoes set aberto_em = now() where id = a.id and aberto_em is null;
  select * into m from public.corre_portfolio where id = a.marca_id;
  select * into pf from public.corre_perfis where id = a.dono;
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'data', p.data, 'hora', p.hora, 'formato', p.formato, 'titulo', p.titulo,
           'legenda', p.legenda, 'alt', p.alt, 'midia', p.midia_url, 'midias', p.midias, 'aprov', p.aprov, 'nota', p.aprov_nota,
           'itens', to_jsonb(p.aprov_itens), 'quem', p.aprov_quem, 'em', p.aprov_em, 'publicado', p.ig_status = 'publicado' or p.status = 'postado')
           order by p.data, p.hora, p.created_at), '[]'::jsonb) into ps
    from (select * from public.corre_posts q where q.dono = a.dono and q.marca_id = a.marca_id and q.data between a.de and a.ate
            and coalesce(q.midia_url, '') <> '' order by q.data, q.hora, q.created_at limit 150) p;
  return jsonb_build_object('marca', jsonb_build_object('nome', m.marca, 'rede', coalesce(m.rede, ''), 'cor', coalesce(m.cor, ''), 'logo', coalesce(m.logo_url, '')),
    'de', a.de, 'ate', a.ate, 'msg', a.msg, 'respondido_em', a.respondido_em,
    'quem', jsonb_build_object('nome', coalesce(pf.nome, ''), 'handle', coalesce(pf.handle, ''), 'avatar', coalesce(pf.avatar_url, '')),
    'posts', ps);
end $$;

create or replace function public.corre_aprov_responder(p_codigo text, p_post uuid, p_aprov text, p_nota text default '', p_quem text default '') returns jsonb
language plpgsql security definer set search_path = public as $$
declare a public.corre_aprovacoes; nota text; quem text; n int;
begin
  a := public.corre_aprov_link(p_codigo, 'aprov', 400, 3000);
  if coalesce(p_aprov, '') not in ('', 'aprovado', 'ajuste') then raise exception 'aprov' using errcode = 'P0001', hint = 'aprov'; end if;
  nota := left(btrim(coalesce(p_nota, '')), 600);
  quem := left(btrim(regexp_replace(coalesce(p_quem, ''), '\s+', ' ', 'g')), 60);
  if p_aprov = 'ajuste' and nota = '' then raise exception 'nota' using errcode = 'P0001', hint = 'nota'; end if;
  update public.corre_posts p set aprov = p_aprov, aprov_nota = case when p_aprov = '' then '' else nota end, aprov_itens = '{}',
         aprov_quem = case when p_aprov = '' then '' else quem end, aprov_em = case when p_aprov = '' then null else now() end
   where p.id = p_post and p.dono = a.dono and p.marca_id = a.marca_id and p.data between a.de and a.ate and coalesce(p.midia_url, '') <> '';
  get diagnostics n = row_count;
  if n = 0 then raise exception 'post' using errcode = 'P0001', hint = 'post'; end if;
  return jsonb_build_object('ok', true, 'aprov', p_aprov);
end $$;

create or replace function public.corre_aprov_ajuste(p_codigo text, p_post uuid, p_itens text[], p_nota text default '', p_quem text default '') returns jsonb
language plpgsql security definer set search_path = public as $$
declare a public.corre_aprovacoes; nota text; quem text; its text[]; n int;
begin
  a := public.corre_aprov_link(p_codigo, 'aprov', 400, 3000);
  nota := left(btrim(coalesce(p_nota, '')), 600);
  quem := left(btrim(regexp_replace(coalesce(p_quem, ''), '\s+', ' ', 'g')), 60);
  -- só os itens que existem, sem repetir, na ordem que vieram
  select coalesce(array_agg(x order by o), '{}') into its from (
    select x, min(o) o from unnest(coalesce(p_itens, '{}'::text[])) with ordinality as u(x, o)
     where x ~ '^(arte|texto|legenda|hashtags|capa|video|data|ordem|cores|logo|outro|slide:([1-9]|1[0-9]|20))$' group by x) z;
  its := its[1:24];
  if nota = '' and cardinality(its) = 0 then raise exception 'nota' using errcode = 'P0001', hint = 'nota'; end if;
  update public.corre_posts p set aprov = 'ajuste', aprov_nota = nota, aprov_itens = its, aprov_quem = quem, aprov_em = now()
   where p.id = p_post and p.dono = a.dono and p.marca_id = a.marca_id and p.data between a.de and a.ate and coalesce(p.midia_url, '') <> '';
  get diagnostics n = row_count;
  if n = 0 then raise exception 'post' using errcode = 'P0001', hint = 'post'; end if;
  return jsonb_build_object('ok', true, 'aprov', 'ajuste', 'itens', to_jsonb(its));
end $$;
revoke all on function public.corre_aprov_ajuste(text, uuid, text[], text, text) from public;
grant execute on function public.corre_aprov_ajuste(text, uuid, text[], text, text) to anon, authenticated;

commit;

-- 5. O MURALZIM: a agenda de eventos de Londrina, com ingresso vendido de verdade (o Thales mandou o html do Muralzim e
-- pediu: "o muralzim de verdade deve cobrar através da chave do asaas de verdade"; escolheu: o Asaas divide na hora, a
-- parte do organizador cai na conta Asaas dele, e o Corre fica com 10% pago por quem compra, no mínimo R$ 2 por
-- ingresso).
--   corre_eventos          o cartaz: quem divulga é o dono (qualquer perfil). A entrada é 'gratis', 'porta' (paga na
--        porta ou no link de fora, só aparece o preço) ou 'corre' (o ingresso é vendido aqui). Apagar é marcar
--        ('apagado'); os donos do Corre tiram do ar ('oculto'). Mudou dia, hora ou lugar com ingresso vendido: 'mudou_em'
--        (quem comprou antes pode desistir até o começo).
--   corre_evento_lotes     os tipos de ingresso (Inteira, Meia-entrada, Lote 1...): de R$ 5 a R$ 2.000, até 5.000 cada.
--        Tirar um tipo é desligar (o que já vendeu fica).
--   corre_organizadores    a conta de recebimento no Asaas de quem vende: a subconta que o Corre abre ('sub', com a
--        chave dela cifrada pela função "pagamento": o app nunca vê) ou o Wallet ID de uma conta que a pessoa já tem
--        ('propria'). Só vende com a conta 'aprovada'. O fundador vende sem divisão: é a conta da Houzi.
--   corre_ingresso_pedidos e corre_ingressos   a compra (a parte do organizador, a taxa do Corre, o total, Pix ou cartão,
--        a cobrança do Asaas) e um ingresso por pessoa, com o código de 12 letras que vira o QR. A reserva segura o lugar
--        por 20 minutos; pagou depois disso, vale se ainda tem lugar (senão a função devolve o dinheiro).
--   corre_evento_denuncias   quem achou o evento golpe, falso ou ofensivo avisa; os donos do Corre veem e tiram do ar.
-- O dinheiro nunca é decidido pelo app: o preço, a taxa e pra onde vai cada parte saem daqui, e quem fala com o Asaas é
-- a função "pagamento" (com as do servidor, só service_role).
begin;

-- 5.1 as tabelas (o app não lê nenhuma direto: tudo passa pelas funções)
create table if not exists public.corre_eventos (
  id uuid primary key default gen_random_uuid(),
  dono uuid not null references public.corre_perfis (id) on delete cascade,
  titulo text not null check (char_length(btrim(titulo)) between 3 and 80),
  categoria text not null default 'musica' check (categoria in ('musica', 'festa', 'teatro', 'arte', 'cinema', 'comida', 'esporte', 'oficina', 'infantil')),
  classif text not null default 'L' check (classif in ('L', '10', '12', '14', '16', '18')),
  dia date not null,
  inicio time not null,
  fim time,
  local text not null check (char_length(btrim(local)) between 2 and 80),
  endereco text not null default '' check (char_length(endereco) <= 120),
  bairro text not null default '' check (char_length(bairro) <= 60),
  cidade text not null default 'Londrina' check (char_length(btrim(cidade)) between 2 and 60),
  entrada text not null default 'gratis' check (entrada in ('gratis', 'porta', 'corre')),
  preco numeric(10, 2) not null default 0 check (preco >= 0 and preco <= 99999),
  preco_obs text not null default '' check (char_length(preco_obs) <= 80),
  descricao text not null default '' check (char_length(descricao) <= 1200),
  link text not null default '' check (link = '' or (char_length(link) <= 300 and link ~* '^https://[^\s<>"]{4,}$')),
  organizador text not null default '' check (char_length(organizador) <= 80),
  status text not null default 'ativo' check (status in ('ativo', 'cancelado', 'apagado')),
  oculto boolean not null default false,
  mudou_em timestamptz,
  criado_em timestamptz not null default now(),
  mexido_em timestamptz not null default now()
);
alter table public.corre_eventos enable row level security;
revoke all on public.corre_eventos from anon, authenticated;
create index if not exists corre_eventos_dia_idx on public.corre_eventos (dia) where status <> 'apagado' and not oculto;
create index if not exists corre_eventos_dono_idx on public.corre_eventos (dono);

create table if not exists public.corre_evento_lotes (
  id uuid primary key default gen_random_uuid(),
  evento uuid not null references public.corre_eventos (id) on delete cascade,
  nome text not null check (char_length(btrim(nome)) between 2 and 40),
  preco numeric(10, 2) not null check (preco >= 5 and preco <= 2000),
  qtd integer not null check (qtd between 1 and 5000),
  meia boolean not null default false,
  ativo boolean not null default true,
  ordem integer not null default 0,
  criado_em timestamptz not null default now()
);
alter table public.corre_evento_lotes enable row level security;
revoke all on public.corre_evento_lotes from anon, authenticated;
create index if not exists corre_evento_lotes_ev_idx on public.corre_evento_lotes (evento);

create table if not exists public.corre_organizadores (
  dono uuid primary key references public.corre_perfis (id) on delete cascade,
  tipo text not null check (tipo in ('sub', 'propria')),
  asaas_id text not null default '' check (char_length(asaas_id) <= 80),
  wallet text not null check (wallet ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  status text not null default 'pendente' check (status in ('pendente', 'analise', 'aprovada', 'recusada')),
  nome text not null default '' check (char_length(nome) <= 100),
  email text not null default '' check (char_length(email) <= 120),
  chave text not null default '' check (char_length(chave) <= 2000),
  docs text not null default '' check (docs = '' or (char_length(docs) <= 600 and docs ~* '^https://[^\s<>"]{4,}$')),
  termos text not null default '',
  conferido_em timestamptz,
  criado_em timestamptz not null default now(),
  mexido_em timestamptz not null default now()
);
alter table public.corre_organizadores enable row level security;
revoke all on public.corre_organizadores from anon, authenticated;

create table if not exists public.corre_ingresso_pedidos (
  id uuid primary key default gen_random_uuid(),
  comprador uuid references public.corre_perfis (id) on delete set null,
  evento uuid not null references public.corre_eventos (id) on delete cascade,
  itens jsonb not null default '[]'::jsonb,
  qtd integer not null check (qtd between 1 and 10),
  valor numeric(10, 2) not null check (valor >= 0),
  taxa numeric(10, 2) not null check (taxa >= 0),
  total numeric(10, 2) not null check (total > 0),
  forma text not null check (forma in ('pix', 'cartao')),
  wallet text not null default '',
  status text not null default 'reservado' check (status in ('reservado', 'pendente', 'pago', 'cancelado', 'estornado')),
  asaas_cobranca text not null default '',
  link text not null default '' check (link = '' or (char_length(link) <= 600 and link ~* '^https://[^\s<>"]{4,}$')),
  reserva_ate timestamptz not null,
  termos text not null default '',
  pago_em timestamptz,
  desistiu_em timestamptz,
  estornado_em timestamptz,
  criado_em timestamptz not null default now()
);
alter table public.corre_ingresso_pedidos enable row level security;
revoke all on public.corre_ingresso_pedidos from anon, authenticated;
create unique index if not exists corre_ingresso_pedidos_cob_idx on public.corre_ingresso_pedidos (asaas_cobranca) where asaas_cobranca <> '';
create index if not exists corre_ingresso_pedidos_ev_idx on public.corre_ingresso_pedidos (evento, status);
create index if not exists corre_ingresso_pedidos_quem_idx on public.corre_ingresso_pedidos (comprador);

create table if not exists public.corre_ingressos (
  id uuid primary key default gen_random_uuid(),
  pedido uuid not null references public.corre_ingresso_pedidos (id) on delete cascade,
  evento uuid not null references public.corre_eventos (id) on delete cascade,
  lote uuid references public.corre_evento_lotes (id) on delete set null,
  comprador uuid references public.corre_perfis (id) on delete set null,
  codigo text not null unique check (codigo ~ '^[A-HJ-NP-Z2-9]{12}$'),
  nome_lote text not null default '',
  portador text not null default '' check (char_length(portador) <= 80),
  meia boolean not null default false,
  preco numeric(10, 2) not null default 0,
  status text not null default 'pendente' check (status in ('pendente', 'valido', 'usado', 'cancelado', 'estornado')),
  usado_em timestamptz,
  usado_por uuid,
  criado_em timestamptz not null default now()
);
alter table public.corre_ingressos enable row level security;
revoke all on public.corre_ingressos from anon, authenticated;
create index if not exists corre_ingressos_ev_idx on public.corre_ingressos (evento, status);
create index if not exists corre_ingressos_lote_idx on public.corre_ingressos (lote, status);
create index if not exists corre_ingressos_pedido_idx on public.corre_ingressos (pedido);

create table if not exists public.corre_evento_denuncias (
  evento uuid not null references public.corre_eventos (id) on delete cascade,
  quem uuid not null references public.corre_perfis (id) on delete cascade,
  motivo text not null check (motivo in ('golpe', 'falso', 'ofensivo', 'ilegal', 'spam', 'outro')),
  texto text not null default '' check (char_length(texto) <= 500),
  em timestamptz not null default now(),
  primary key (evento, quem)
);
alter table public.corre_evento_denuncias enable row level security;
revoke all on public.corre_evento_denuncias from anon, authenticated;

-- 5.2 as contas (no banco, pra ninguém mudar no app): a taxa do Corre por ingresso, 10% com o mínimo de R$ 2, e quantos
-- lugares ainda restam num tipo de ingresso (o vendido e a reserva que ainda vale contam)
create or replace function public.corre_ing_taxa(p_preco numeric) returns numeric language sql immutable as $$
  select greatest(round(coalesce(p_preco, 0) * 0.10, 2), 2.00)
$$;
create or replace function public.corre_evento_restam(p_lote uuid) returns integer
language sql stable security definer set search_path = public as $$
  select greatest(0, l.qtd - (select count(*) from public.corre_ingressos i join public.corre_ingresso_pedidos p on p.id = i.pedido
          where i.lote = l.id and (i.status in ('valido', 'usado') or (i.status = 'pendente' and p.status in ('reservado', 'pendente') and p.reserva_ate > now()))))::int
  from public.corre_evento_lotes l where l.id = p_lote
$$;
revoke all on function public.corre_evento_restam(uuid) from public, anon, authenticated;
-- quem pode vender: o fundador (a conta da Houzi, sem divisão) ou quem tem a conta de recebimento aprovada
create or replace function public.corre_org_pode_vender(p_dono uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_dono = 'd1e9f6ac-f5d7-4723-8b02-eb0d1d7137b0'::uuid
      or exists (select 1 from public.corre_organizadores o where o.dono = p_dono and o.status = 'aprovada' and o.wallet <> '')
$$;
revoke all on function public.corre_org_pode_vender(uuid) from public, anon, authenticated;

-- 5.3 o cartaz em jsonb (a lista leva o resumo; o "completo" leva a descrição e os tipos de ingresso com o que resta)
create or replace function public.corre_evento_json(e public.corre_eventos, p_completo boolean) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare pf public.corre_perfis; ls jsonb := '[]'::jsonb; desde numeric; restam int := 0; eu uuid := auth.uid();
begin
  select * into pf from public.corre_perfis where id = e.dono;
  if e.entrada = 'corre' then
    select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'nome', l.nome, 'preco', l.preco, 'taxa', public.corre_ing_taxa(l.preco),
             'meia', l.meia, 'restam', public.corre_evento_restam(l.id)) order by l.ordem, l.preco), '[]'::jsonb), min(l.preco)
      into ls, desde
      from public.corre_evento_lotes l where l.evento = e.id and l.ativo;
    select coalesce(sum((x->>'restam')::int), 0) into restam from jsonb_array_elements(ls) x;
  end if;
  return jsonb_build_object('id', e.id, 'titulo', e.titulo, 'categoria', e.categoria, 'classif', e.classif,
    'dia', e.dia, 'inicio', to_char(e.inicio, 'HH24:MI'), 'fim', coalesce(to_char(e.fim, 'HH24:MI'), ''),
    'local', e.local, 'endereco', e.endereco, 'bairro', e.bairro, 'cidade', e.cidade,
    'entrada', e.entrada, 'preco', e.preco, 'preco_obs', e.preco_obs, 'link', e.link, 'organizador', e.organizador,
    'status', e.status, 'oculto', e.oculto, 'mudou_em', e.mudou_em, 'descricao', case when p_completo then e.descricao else '' end,
    'vende', e.entrada = 'corre' and e.status = 'ativo' and public.corre_org_pode_vender(e.dono),
    'desde', desde, 'esgotado', e.entrada = 'corre' and restam <= 0,
    'lotes', case when p_completo then ls else '[]'::jsonb end,
    'meu', eu is not null and eu = e.dono,
    'quem', jsonb_build_object('handle', coalesce(pf.handle, ''), 'nome', coalesce(pf.nome, ''), 'avatar', coalesce(pf.avatar_url, '')));
end $$;
revoke all on function public.corre_evento_json(public.corre_eventos, boolean) from public, anon, authenticated;

-- 5.4 a lista aberta (sem login também): do mês que passou até 6 meses pra frente, sem os apagados e os tirados do ar
create or replace function public.corre_eventos_lista(p_cidade text default null) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(s.j order by s.d, s.i), '[]'::jsonb)
  from (select public.corre_evento_json(x, false) j, x.dia d, x.inicio i from public.corre_eventos x
         where x.status <> 'apagado' and not x.oculto
           and x.dia >= (now() at time zone 'America/Sao_Paulo')::date - 30
           and x.dia <= (now() at time zone 'America/Sao_Paulo')::date + 180
           and (coalesce(btrim(p_cidade), '') = '' or lower(x.cidade) = lower(btrim(p_cidade)))
         order by x.dia, x.inicio limit 400) s
$$;
revoke all on function public.corre_eventos_lista(text) from public;
grant execute on function public.corre_eventos_lista(text) to anon, authenticated;

-- um cartaz inteiro (o tirado do ar só o dono do evento e os donos do Corre abrem)
create or replace function public.corre_evento_ver(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare e public.corre_eventos; eu uuid := auth.uid();
begin
  select * into e from public.corre_eventos where id = p_id and status <> 'apagado';
  if not found then return null; end if;
  if e.oculto and (eu is null or (eu <> e.dono and not public.corre_ve_lojinha(eu))) then return null; end if;
  return public.corre_evento_json(e, true);
end $$;
revoke all on function public.corre_evento_ver(uuid) from public;
grant execute on function public.corre_evento_ver(uuid) to anon, authenticated;

-- 5.5 divulgar e mexer (pelo login). Os erros vêm com o motivo no hint, pro app dizer o que arrumar
create or replace function public.corre_evento_salva(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  eu uuid := auth.uid(); hoje date := (now() at time zone 'America/Sao_Paulo')::date; e public.corre_eventos; v_id uuid;
  v_tit text; v_cat text; v_cl text; v_dia date; v_ini time; v_fim time; v_local text; v_end text; v_bai text; v_cid text;
  v_ent text; v_preco numeric; v_pobs text; v_desc text; v_link text; v_org text; vendidos int := 0; muda boolean := false;
  l jsonb; lid uuid; ln text; lp numeric; lq int; ls int; n int := 0; vistos uuid[] := '{}';
begin
  if eu is null or not exists (select 1 from public.corre_perfis where id = eu) then raise exception 'login' using hint = 'login'; end if;
  if jsonb_typeof(p) <> 'object' then raise exception 'dados' using hint = 'dados'; end if;
  v_tit := left(btrim(regexp_replace(coalesce(p->>'titulo', ''), '\s+', ' ', 'g')), 80);
  v_cat := coalesce(nullif(p->>'categoria', ''), 'musica');
  v_cl := coalesce(nullif(p->>'classif', ''), 'L');
  begin v_dia := (p->>'dia')::date; exception when others then v_dia := null; end;
  begin v_ini := (p->>'inicio')::time; exception when others then v_ini := null; end;
  begin v_fim := nullif(p->>'fim', '')::time; exception when others then v_fim := null; end;
  v_local := left(btrim(regexp_replace(coalesce(p->>'local', ''), '\s+', ' ', 'g')), 80);
  v_end := left(btrim(coalesce(p->>'endereco', '')), 120);
  v_bai := left(btrim(coalesce(p->>'bairro', '')), 60);
  v_cid := left(coalesce(nullif(btrim(p->>'cidade'), ''), 'Londrina'), 60);
  v_ent := coalesce(nullif(p->>'entrada', ''), 'gratis');
  begin v_preco := round(coalesce(nullif(p->>'preco', '')::numeric, 0), 2); exception when others then v_preco := -1; end;
  v_pobs := left(btrim(coalesce(p->>'preco_obs', '')), 80);
  v_desc := left(btrim(coalesce(p->>'descricao', '')), 1200);
  v_link := btrim(coalesce(p->>'link', ''));
  v_org := left(btrim(coalesce(p->>'organizador', '')), 80);
  if char_length(v_tit) < 3 then raise exception 'titulo' using hint = 'titulo'; end if;
  if v_cat not in ('musica', 'festa', 'teatro', 'arte', 'cinema', 'comida', 'esporte', 'oficina', 'infantil') then raise exception 'categoria' using hint = 'categoria'; end if;
  if v_cl not in ('L', '10', '12', '14', '16', '18') then raise exception 'classif' using hint = 'classif'; end if;
  if v_dia is null or v_dia > hoje + 365 then raise exception 'dia' using hint = 'dia'; end if;
  if v_ini is null then raise exception 'inicio' using hint = 'inicio'; end if;
  if char_length(v_local) < 2 then raise exception 'local' using hint = 'local'; end if;
  if v_ent not in ('gratis', 'porta', 'corre') then raise exception 'entrada' using hint = 'entrada'; end if;
  if v_preco < 0 or v_preco > 99999 or (v_ent = 'porta' and not v_preco > 0) then raise exception 'preco' using hint = 'preco'; end if;
  if v_ent <> 'porta' then v_preco := 0; end if;
  if v_link <> '' and (char_length(v_link) > 300 or v_link !~* '^https://[^\s<>"]{4,}$') then raise exception 'link' using hint = 'link'; end if;
  if nullif(p->>'id', '') is not null then
    select * into e from public.corre_eventos where id = (p->>'id')::uuid and dono = eu and status <> 'apagado' for update;
    if not found then raise exception 'nao_achou' using hint = 'nao_achou'; end if;
    vendidos := (select count(*) from public.corre_ingressos where evento = e.id and status in ('valido', 'usado'));
    if vendidos > 0 and v_ent <> 'corre' then raise exception 'tem_vendidos' using hint = 'tem_vendidos'; end if;
    if v_dia < hoje and v_dia <> e.dia then raise exception 'dia_passou' using hint = 'dia_passou'; end if;
    -- mudou quando, onde ou a hora com ingresso vendido: quem comprou antes ganha o direito de desistir até o começo
    muda := vendidos > 0 and (v_dia, v_ini, lower(v_local), lower(v_end), lower(v_cid)) is distinct from (e.dia, e.inicio, lower(e.local), lower(e.endereco), lower(e.cidade));
    update public.corre_eventos set titulo = v_tit, categoria = v_cat, classif = v_cl, dia = v_dia, inicio = v_ini, fim = v_fim, local = v_local,
      endereco = v_end, bairro = v_bai, cidade = v_cid, entrada = v_ent, preco = v_preco, preco_obs = v_pobs, descricao = v_desc, link = v_link,
      organizador = v_org, mudou_em = case when muda then now() else mudou_em end, mexido_em = now()
    where id = e.id;
    v_id := e.id;
  else
    if v_dia < hoje then raise exception 'dia_passou' using hint = 'dia_passou'; end if;
    if (select count(*) from public.corre_eventos where dono = eu and status = 'ativo' and dia >= hoje) >= 30 then raise exception 'limite' using hint = 'limite'; end if;
    if (select count(*) from public.corre_eventos where dono = eu and criado_em > now() - interval '1 day') >= 15 then raise exception 'limite_dia' using hint = 'limite_dia'; end if;
    insert into public.corre_eventos (dono, titulo, categoria, classif, dia, inicio, fim, local, endereco, bairro, cidade, entrada, preco, preco_obs, descricao, link, organizador)
    values (eu, v_tit, v_cat, v_cl, v_dia, v_ini, v_fim, v_local, v_end, v_bai, v_cid, v_ent, v_preco, v_pobs, v_desc, v_link, v_org)
    returning id into v_id;
  end if;
  -- os tipos de ingresso (só no "ingresso pelo Corre", e só com a conta de recebimento aprovada)
  if v_ent = 'corre' then
    if not public.corre_org_pode_vender(eu) then raise exception 'org' using hint = 'org'; end if;
    if jsonb_typeof(p->'lotes') <> 'array' or jsonb_array_length(p->'lotes') = 0 or jsonb_array_length(p->'lotes') > 8 then raise exception 'lotes' using hint = 'lotes'; end if;
    for l in select x from jsonb_array_elements(p->'lotes') x loop
      n := n + 1;
      ln := left(btrim(regexp_replace(coalesce(l->>'nome', ''), '\s+', ' ', 'g')), 40);
      begin lp := round((l->>'preco')::numeric, 2); exception when others then lp := null; end;
      begin lq := (l->>'qtd')::int; exception when others then lq := null; end;
      if char_length(ln) < 2 then raise exception 'lote_nome' using hint = 'lote_nome'; end if;
      if lp is null or lp < 5 or lp > 2000 then raise exception 'lote_preco' using hint = 'lote_preco'; end if;
      if lq is null or lq < 1 or lq > 5000 then raise exception 'lote_qtd' using hint = 'lote_qtd'; end if;
      lid := null;
      if nullif(l->>'id', '') is not null then
        begin select id into lid from public.corre_evento_lotes where id = (l->>'id')::uuid and evento = v_id; exception when others then lid := null; end;
      end if;
      if lid is not null then
        ls := (select count(*) from public.corre_ingressos where lote = lid and status in ('valido', 'usado'));
        if lq < ls then raise exception 'lote_vendido' using hint = 'lote_vendido'; end if;
        update public.corre_evento_lotes set nome = ln, preco = lp, qtd = lq, meia = coalesce((l->>'meia')::boolean, false),
          ativo = coalesce((l->>'ativo')::boolean, true), ordem = n where id = lid;
      else
        insert into public.corre_evento_lotes (evento, nome, preco, qtd, meia, ativo, ordem)
        values (v_id, ln, lp, lq, coalesce((l->>'meia')::boolean, false), coalesce((l->>'ativo')::boolean, true), n) returning id into lid;
      end if;
      vistos := vistos || lid;
    end loop;
    update public.corre_evento_lotes set ativo = false where evento = v_id and not (id = any (vistos));
  else
    update public.corre_evento_lotes set ativo = false where evento = v_id;
  end if;
  return jsonb_build_object('ok', true, 'id', v_id, 'mudou', muda);
end $$;
revoke all on function public.corre_evento_salva(jsonb) from public, anon;
grant execute on function public.corre_evento_salva(jsonb) to authenticated;

-- cancelar sem ingresso vendido, apagar ou pôr de volta (com ingresso vendido, cancelar é pela função "pagamento", que
-- devolve o dinheiro de todo mundo). As reservas abertas caem junto; quem pagar uma delas depois recebe de volta
create or replace function public.corre_evento_status(p_id uuid, p_status text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare eu uuid := auth.uid(); e public.corre_eventos;
begin
  if eu is null then raise exception 'login' using hint = 'login'; end if;
  if p_status not in ('ativo', 'cancelado', 'apagado') then raise exception 'status' using hint = 'status'; end if;
  perform pg_advisory_xact_lock(hashtext('corre-ing:' || p_id::text));
  select * into e from public.corre_eventos where id = p_id and dono = eu and status <> 'apagado' for update;
  if not found then raise exception 'nao_achou' using hint = 'nao_achou'; end if;
  if p_status <> 'ativo' and exists (select 1 from public.corre_ingressos where evento = e.id and status in ('valido', 'usado')) then
    raise exception 'tem_vendidos' using hint = 'tem_vendidos';
  end if;
  if p_status <> 'ativo' then
    update public.corre_ingresso_pedidos set status = 'cancelado' where evento = e.id and status in ('reservado', 'pendente');
    update public.corre_ingressos set status = 'cancelado' where evento = e.id and status = 'pendente';
  end if;
  update public.corre_eventos set status = p_status, mexido_em = now() where id = e.id;
  return jsonb_build_object('ok', true, 'status', p_status);
end $$;
revoke all on function public.corre_evento_status(uuid, text) from public, anon;
grant execute on function public.corre_evento_status(uuid, text) to authenticated;

-- os meus eventos (o painel de quem divulga): com quanto vendeu e quantos entraram
create or replace function public.corre_eventos_meus() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(public.corre_evento_json(e, true) || jsonb_build_object(
      'vendidos', (select count(*) from public.corre_ingressos i where i.evento = e.id and i.status in ('valido', 'usado')),
      'usados', (select count(*) from public.corre_ingressos i where i.evento = e.id and i.status = 'usado'),
      'receita', (select coalesce(sum(i.preco), 0) from public.corre_ingressos i where i.evento = e.id and i.status in ('valido', 'usado')),
      'denuncias', (select count(*) from public.corre_evento_denuncias d where d.evento = e.id))
    order by e.dia desc, e.inicio desc), '[]'::jsonb)
  from public.corre_eventos e where e.dono = auth.uid() and e.status <> 'apagado'
$$;
revoke all on function public.corre_eventos_meus() from public, anon;
grant execute on function public.corre_eventos_meus() to authenticated;

-- as vendas de um evento (só o dono dele): por tipo e cada ingresso, pra conferir na portaria
create or replace function public.corre_evento_vendas(p_evento uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare e public.corre_eventos;
begin
  select * into e from public.corre_eventos where id = p_evento and dono = auth.uid() and status <> 'apagado';
  if not found then return null; end if;
  return jsonb_build_object('evento', public.corre_evento_json(e, true),
    'lotes', coalesce((select jsonb_agg(jsonb_build_object('id', l.id, 'nome', l.nome, 'preco', l.preco, 'qtd', l.qtd, 'meia', l.meia, 'ativo', l.ativo,
        'vendidos', (select count(*) from public.corre_ingressos i where i.lote = l.id and i.status in ('valido', 'usado')),
        'usados', (select count(*) from public.corre_ingressos i where i.lote = l.id and i.status = 'usado')) order by l.ordem) from public.corre_evento_lotes l where l.evento = e.id), '[]'::jsonb),
    'ingressos', coalesce((select jsonb_agg(jsonb_build_object('codigo', i.codigo, 'portador', i.portador, 'lote', i.nome_lote, 'meia', i.meia,
        'status', i.status, 'usado_em', i.usado_em, 'quem', coalesce(pf.handle, '')) order by i.status = 'usado', i.portador)
        from (select * from public.corre_ingressos x where x.evento = e.id and x.status in ('valido', 'usado', 'estornado') limit 3000) i
        left join public.corre_perfis pf on pf.id = i.comprador), '[]'::jsonb),
    'pendentes', (select count(*) from public.corre_ingresso_pedidos p where p.evento = e.id and p.status in ('reservado', 'pendente') and p.reserva_ate > now()));
end $$;
revoke all on function public.corre_evento_vendas(uuid) from public, anon;
grant execute on function public.corre_evento_vendas(uuid) to authenticated;

-- 5.6 os donos do Corre tiram do ar (e põem de volta); qualquer um logado denuncia
create or replace function public.corre_evento_oculta(p_id uuid, p_oculto boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.corre_ve_lojinha(auth.uid()) then raise exception 'so_dono' using hint = 'so_dono'; end if;
  update public.corre_eventos set oculto = coalesce(p_oculto, true), mexido_em = now() where id = p_id;
  return jsonb_build_object('ok', found);
end $$;
revoke all on function public.corre_evento_oculta(uuid, boolean) from public, anon;
grant execute on function public.corre_evento_oculta(uuid, boolean) to authenticated;

create or replace function public.corre_evento_denuncia(p_evento uuid, p_motivo text, p_texto text default '') returns jsonb
language plpgsql security definer set search_path = public as $$
declare eu uuid := auth.uid();
begin
  if eu is null or not exists (select 1 from public.corre_perfis where id = eu) then return jsonb_build_object('ok', false, 'motivo', 'login'); end if;
  if coalesce(p_motivo, '') not in ('golpe', 'falso', 'ofensivo', 'ilegal', 'spam', 'outro') then return jsonb_build_object('ok', false, 'motivo', 'motivo'); end if;
  if not exists (select 1 from public.corre_eventos where id = p_evento and status <> 'apagado' and dono <> eu) then return jsonb_build_object('ok', false, 'motivo', 'evento'); end if;
  if (select count(*) from public.corre_evento_denuncias where quem = eu and em > now() - interval '1 day') >= 20 then return jsonb_build_object('ok', false, 'motivo', 'limite'); end if;
  insert into public.corre_evento_denuncias (evento, quem, motivo, texto) values (p_evento, eu, p_motivo, left(btrim(coalesce(p_texto, '')), 500))
    on conflict (evento, quem) do update set motivo = excluded.motivo, texto = excluded.texto, em = now();
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.corre_evento_denuncia(uuid, text, text) from public, anon;
grant execute on function public.corre_evento_denuncia(uuid, text, text) to authenticated;

create or replace function public.corre_eventos_denunciados() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.corre_ve_lojinha(auth.uid()) then raise exception 'so_dono' using hint = 'so_dono'; end if;
  return coalesce((select jsonb_agg(public.corre_evento_json(e, false) || jsonb_build_object('denuncias', d.n, 'motivos', d.m, 'textos', d.t) order by d.ult desc)
    from (select evento, count(*) n, jsonb_agg(distinct motivo) m, jsonb_agg(texto) filter (where texto <> '') t, max(em) ult
            from public.corre_evento_denuncias group by evento) d
    join public.corre_eventos e on e.id = d.evento where e.status <> 'apagado'), '[]'::jsonb);
end $$;
revoke all on function public.corre_eventos_denunciados() from public, anon;
grant execute on function public.corre_eventos_denunciados() to authenticated;

-- 5.7 a conta de recebimento: o que o app vê (nunca a chave) e o que só o servidor mexe
create or replace function public.corre_org_meu() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare eu uuid := auth.uid(); o public.corre_organizadores;
begin
  if eu is null then return null; end if;
  if eu = 'd1e9f6ac-f5d7-4723-8b02-eb0d1d7137b0'::uuid then return jsonb_build_object('houzi', true, 'pode', true, 'status', 'aprovada', 'tipo', 'houzi'); end if;
  select * into o from public.corre_organizadores where dono = eu;
  if not found then return jsonb_build_object('pode', false, 'status', '', 'tipo', ''); end if;
  return jsonb_build_object('pode', o.status = 'aprovada', 'status', o.status, 'tipo', o.tipo, 'email', o.email, 'nome', o.nome, 'docs', o.docs,
    'wallet_fim', right(o.wallet, 4), 'conferido_em', o.conferido_em, 'desde', o.criado_em);
end $$;
revoke all on function public.corre_org_meu() from public, anon;
grant execute on function public.corre_org_meu() to authenticated;

create or replace function public.corre_org_salva(p_dono uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  insert into public.corre_organizadores as o (dono, tipo, asaas_id, wallet, status, nome, email, chave, docs, termos, conferido_em)
  values (p_dono, p->>'tipo', left(coalesce(p->>'asaas_id', ''), 80), p->>'wallet', coalesce(nullif(p->>'status', ''), 'pendente'),
          left(coalesce(p->>'nome', ''), 100), left(coalesce(p->>'email', ''), 120), coalesce(p->>'chave', ''), coalesce(p->>'docs', ''), coalesce(p->>'termos', ''), now())
  on conflict (dono) do update set tipo = excluded.tipo, asaas_id = excluded.asaas_id, wallet = excluded.wallet, status = excluded.status,
    nome = excluded.nome, email = excluded.email, chave = excluded.chave,
    docs = excluded.docs, termos = excluded.termos, conferido_em = now(), mexido_em = now();
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.corre_org_salva(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.corre_org_salva(uuid, jsonb) to service_role;

create or replace function public.corre_org_conta(p_dono uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(o) from public.corre_organizadores o where o.dono = p_dono
$$;
revoke all on function public.corre_org_conta(uuid) from public, anon, authenticated;
grant execute on function public.corre_org_conta(uuid) to service_role;

create or replace function public.corre_org_situacao(p_dono uuid, p_status text, p_docs text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if p_status not in ('pendente', 'analise', 'aprovada', 'recusada') then return jsonb_build_object('ok', false); end if;
  update public.corre_organizadores set status = p_status, docs = case when p_docs is null then docs when char_length(p_docs) <= 600 and p_docs ~* '^https://[^\s<>"]{4,}$' then p_docs else '' end,
    conferido_em = now(), mexido_em = now() where dono = p_dono;
  return jsonb_build_object('ok', found);
end $$;
revoke all on function public.corre_org_situacao(uuid, text, text) from public, anon, authenticated;
grant execute on function public.corre_org_situacao(uuid, text, text) to service_role;

-- 5.8 a compra (só o servidor): reserva os lugares, guarda a cobrança, paga, cai, volta
create or replace function public.corre_ingresso_reserva(p_comprador uuid, p_evento uuid, p_itens jsonb, p_forma text, p_termos text, p_portador text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  e public.corre_eventos; wal text := ''; it jsonb; l public.corre_evento_lotes; lid uuid; q int; tot int := 0; v_valor numeric := 0; v_taxa numeric := 0;
  itens jsonb := '[]'::jsonb; pid uuid; velhos jsonb := '[]'::jsonb; x record; cod text; b bytea; j int; k int; tent int; port text;
  alfa constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if p_comprador is null or not exists (select 1 from public.corre_perfis where id = p_comprador) then return jsonb_build_object('ok', false, 'motivo', 'perfil'); end if;
  if coalesce(p_forma, '') not in ('pix', 'cartao') then return jsonb_build_object('ok', false, 'motivo', 'forma'); end if;
  if coalesce(p_termos, '') !~ '^\d{4}-\d{2}-\d{2}$' then return jsonb_build_object('ok', false, 'motivo', 'termos'); end if;
  -- uma compra por vez em cada evento (dois toques ao mesmo tempo não vendem o mesmo lugar)
  perform pg_advisory_xact_lock(hashtext('corre-ing:' || p_evento::text));
  -- as reservas que venceram (de todo mundo) e as abertas da mesma pessoa nesse evento caem; a função apaga as cobranças
  for x in select id, asaas_cobranca from public.corre_ingresso_pedidos
            where evento = p_evento and status in ('reservado', 'pendente') and (reserva_ate <= now() or comprador = p_comprador) limit 60 loop
    update public.corre_ingresso_pedidos set status = 'cancelado' where id = x.id;
    update public.corre_ingressos set status = 'cancelado' where pedido = x.id and status = 'pendente';
    if x.asaas_cobranca <> '' then velhos := velhos || jsonb_build_array(jsonb_build_object('id', x.id, 'cobranca', x.asaas_cobranca)); end if;
  end loop;
  select * into e from public.corre_eventos where id = p_evento;
  if not found or e.status <> 'ativo' or e.oculto or e.entrada <> 'corre' then return jsonb_build_object('ok', false, 'motivo', 'evento', 'velhos', velhos); end if;
  if ((e.dia + e.inicio) at time zone 'America/Sao_Paulo') <= now() then return jsonb_build_object('ok', false, 'motivo', 'passou', 'velhos', velhos); end if;
  if e.dono <> 'd1e9f6ac-f5d7-4723-8b02-eb0d1d7137b0'::uuid then
    select o.wallet into wal from public.corre_organizadores o where o.dono = e.dono and o.status = 'aprovada' and o.wallet <> '';
    if coalesce(wal, '') = '' then return jsonb_build_object('ok', false, 'motivo', 'org', 'velhos', velhos); end if;
  end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 or jsonb_array_length(p_itens) > 8 then return jsonb_build_object('ok', false, 'motivo', 'itens', 'velhos', velhos); end if;
  port := left(btrim(regexp_replace(coalesce(nullif(btrim(p_portador), ''), (select nome from public.corre_perfis where id = p_comprador), ''), '\s+', ' ', 'g')), 80);
  for it in select y from jsonb_array_elements(p_itens) y loop
    begin q := (it->>'qtd')::int; exception when others then q := 0; end;
    continue when coalesce(q, 0) <= 0;
    if q > 10 then return jsonb_build_object('ok', false, 'motivo', 'qtd', 'velhos', velhos); end if;
    begin lid := (it->>'lote')::uuid; exception when others then lid := null; end;
    select * into l from public.corre_evento_lotes where id = lid and evento = p_evento and ativo;
    if not found then return jsonb_build_object('ok', false, 'motivo', 'lote', 'velhos', velhos); end if;
    if public.corre_evento_restam(l.id) < q then return jsonb_build_object('ok', false, 'motivo', 'esgotou', 'lote', l.nome, 'velhos', velhos); end if;
    tot := tot + q;
    v_valor := v_valor + l.preco * q;
    v_taxa := v_taxa + public.corre_ing_taxa(l.preco) * q;
    itens := itens || jsonb_build_array(jsonb_build_object('lote', l.id, 'nome', l.nome, 'preco', l.preco, 'taxa', public.corre_ing_taxa(l.preco), 'qtd', q, 'meia', l.meia));
  end loop;
  if tot = 0 then return jsonb_build_object('ok', false, 'motivo', 'itens', 'velhos', velhos); end if;
  if tot > 10 then return jsonb_build_object('ok', false, 'motivo', 'qtd', 'velhos', velhos); end if;
  insert into public.corre_ingresso_pedidos (comprador, evento, itens, qtd, valor, taxa, total, forma, wallet, status, reserva_ate, termos)
  values (p_comprador, p_evento, itens, tot, v_valor, v_taxa, v_valor + v_taxa, p_forma, coalesce(wal, ''), 'reservado', now() + interval '20 minutes', p_termos)
  returning id into pid;
  -- um ingresso por pessoa, com o código de 12 letras (sem I e O, pra ninguém confundir com 1 e 0) que vira o QR
  for it in select y from jsonb_array_elements(itens) y loop
    for k in 1 .. (it->>'qtd')::int loop
      tent := 0;
      loop
        b := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
        cod := '';
        for j in 0 .. 11 loop cod := cod || substr(alfa, (get_byte(b, case when j < 6 then j else j + 4 end) % 32) + 1, 1); end loop;
        begin
          insert into public.corre_ingressos (pedido, evento, lote, comprador, codigo, nome_lote, portador, meia, preco, status)
          values (pid, p_evento, (it->>'lote')::uuid, p_comprador, cod, it->>'nome', port, (it->>'meia')::boolean, (it->>'preco')::numeric, 'pendente');
          exit;
        exception when unique_violation then
          tent := tent + 1;
          if tent > 5 then raise; end if;
        end;
      end loop;
    end loop;
  end loop;
  return jsonb_build_object('ok', true, 'pedido', pid, 'valor', v_valor, 'taxa', v_taxa, 'total', v_valor + v_taxa, 'qtd', tot, 'wallet', coalesce(wal, ''),
    'titulo', e.titulo, 'dia', e.dia, 'inicio', to_char(e.inicio, 'HH24:MI'), 'local', e.local, 'velhos', velhos);
end $$;
revoke all on function public.corre_ingresso_reserva(uuid, uuid, jsonb, text, text, text) from public, anon, authenticated;
grant execute on function public.corre_ingresso_reserva(uuid, uuid, jsonb, text, text, text) to service_role;

create or replace function public.corre_ingresso_cobranca(p_pedido uuid, p_cobranca text, p_link text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  update public.corre_ingresso_pedidos set status = 'pendente', asaas_cobranca = left(coalesce(p_cobranca, ''), 80),
    link = case when char_length(coalesce(p_link, '')) <= 600 and coalesce(p_link, '') ~* '^https://[^\s<>"]{4,}$' then p_link else '' end
  where id = p_pedido and status = 'reservado';
  return jsonb_build_object('ok', found);
end $$;
revoke all on function public.corre_ingresso_cobranca(uuid, text, text) from public, anon, authenticated;
grant execute on function public.corre_ingresso_cobranca(uuid, text, text) to service_role;

-- a cobrança venceu sem pagar, ou foi apagada: os lugares voltam
create or replace function public.corre_ingresso_cai(p_pedido uuid default null, p_cobranca text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  select id into pid from public.corre_ingresso_pedidos
   where (p_pedido is not null and id = p_pedido) or (coalesce(p_cobranca, '') <> '' and asaas_cobranca = p_cobranca) limit 1;
  if pid is null then return jsonb_build_object('ok', false); end if;
  update public.corre_ingresso_pedidos set status = 'cancelado' where id = pid and status in ('reservado', 'pendente');
  update public.corre_ingressos set status = 'cancelado' where pedido = pid and status = 'pendente';
  return jsonb_build_object('ok', true, 'pedido', pid);
end $$;
revoke all on function public.corre_ingresso_cai(uuid, text) from public, anon, authenticated;
grant execute on function public.corre_ingresso_cai(uuid, text) to service_role;

-- pagou: os ingressos valem. Pagou um valor menor: não libera. Pagou depois de a reserva vencer: vale se ainda tem lugar;
-- senão (ou se o evento foi cancelado), devolve 'devolver' e a função estorna
create or replace function public.corre_ingresso_paga(p_cobranca text, p_valor numeric) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p public.corre_ingresso_pedidos; e public.corre_eventos; r record; falta boolean := false; ev uuid;
begin
  -- a mesma tranca da reserva primeiro (na mesma ordem dela: o evento, depois o pedido)
  select evento into ev from public.corre_ingresso_pedidos where asaas_cobranca = p_cobranca and coalesce(p_cobranca, '') <> '';
  if ev is null then return jsonb_build_object('ok', false, 'motivo', 'nao_achou'); end if;
  perform pg_advisory_xact_lock(hashtext('corre-ing:' || ev::text));
  select * into p from public.corre_ingresso_pedidos where asaas_cobranca = p_cobranca for update;
  if p.status = 'pago' then return jsonb_build_object('ok', true, 'ja', true, 'pedido', p.id); end if;
  if p.status = 'estornado' then return jsonb_build_object('ok', false, 'motivo', 'estornado', 'pedido', p.id); end if;
  if coalesce(p_valor, 0) + 0.009 < p.total then return jsonb_build_object('ok', false, 'motivo', 'valor', 'pedido', p.id); end if;
  select * into e from public.corre_eventos where id = p.evento;
  if e.status <> 'ativo' then return jsonb_build_object('ok', true, 'devolver', true, 'motivo', 'evento', 'pedido', p.id); end if;
  if p.status = 'cancelado' then
    for r in select lote, count(*) n from public.corre_ingressos where pedido = p.id group by lote loop
      if r.lote is null or public.corre_evento_restam(r.lote) < r.n then falta := true; end if;
    end loop;
    if falta then return jsonb_build_object('ok', true, 'devolver', true, 'motivo', 'esgotou', 'pedido', p.id); end if;
  end if;
  update public.corre_ingresso_pedidos set status = 'pago', pago_em = now() where id = p.id;
  update public.corre_ingressos set status = 'valido' where pedido = p.id and status in ('pendente', 'cancelado');
  return jsonb_build_object('ok', true, 'pedido', p.id, 'comprador', p.comprador, 'dono', e.dono, 'titulo', e.titulo, 'qtd', p.qtd, 'valor', p.valor);
end $$;
revoke all on function public.corre_ingresso_paga(text, numeric) from public, anon, authenticated;
grant execute on function public.corre_ingresso_paga(text, numeric) to service_role;

-- o dinheiro voltou (desistência, evento cancelado, estorno ou contestação): os ingressos deixam de valer
create or replace function public.corre_ingresso_volta(p_cobranca text, p_desistiu boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  update public.corre_ingresso_pedidos set status = 'estornado', estornado_em = coalesce(estornado_em, now()),
    desistiu_em = case when p_desistiu then coalesce(desistiu_em, now()) else desistiu_em end
  where asaas_cobranca = p_cobranca and coalesce(p_cobranca, '') <> '' returning id into pid;
  if pid is null then return jsonb_build_object('ok', false); end if;
  update public.corre_ingressos set status = 'estornado' where pedido = pid;
  return jsonb_build_object('ok', true, 'pedido', pid);
end $$;
revoke all on function public.corre_ingresso_volta(text, boolean) from public, anon, authenticated;
grant execute on function public.corre_ingresso_volta(text, boolean) to service_role;

-- o pedido pro servidor decidir a desistência: quando pagou, quando começa o evento, se mudou depois da compra, se
-- alguém já entrou com um dos ingressos
create or replace function public.corre_ingresso_pedido(p_comprador uuid, p_pedido uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(p) || jsonb_build_object('comeca', (e.dia + e.inicio) at time zone 'America/Sao_Paulo', 'mudou_em', e.mudou_em, 'evento_status', e.status,
           'titulo', e.titulo, 'usados', (select count(*) from public.corre_ingressos i where i.pedido = p.id and i.status = 'usado'))
  from public.corre_ingresso_pedidos p join public.corre_eventos e on e.id = p.evento
  where p.id = p_pedido and p.comprador = p_comprador
$$;
revoke all on function public.corre_ingresso_pedido(uuid, uuid) from public, anon, authenticated;
grant execute on function public.corre_ingresso_pedido(uuid, uuid) to service_role;

create or replace function public.corre_ingresso_abertos(p_comprador uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'cobranca', p.asaas_cobranca)), '[]'::jsonb)
  from public.corre_ingresso_pedidos p
  where p.comprador = p_comprador and p.asaas_cobranca <> '' and p.criado_em > now() - interval '3 days'
    and (p.status = 'pendente' or (p.status = 'cancelado' and p.pago_em is null and p.reserva_ate > now() - interval '1 day'))
$$;
revoke all on function public.corre_ingresso_abertos(uuid) from public, anon, authenticated;
grant execute on function public.corre_ingresso_abertos(uuid) to service_role;

-- cancelar o evento com ingresso vendido: o evento fica cancelado e a função devolve o dinheiro de cada pedido pago
-- (de 30 em 30) e apaga as cobranças abertas
create or replace function public.corre_evento_cancela(p_dono uuid, p_evento uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e public.corre_eventos; abertos jsonb := '[]'::jsonb; x record;
begin
  perform pg_advisory_xact_lock(hashtext('corre-ing:' || p_evento::text));
  select * into e from public.corre_eventos where id = p_evento and dono = p_dono and status <> 'apagado' for update;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'nao_achou'); end if;
  update public.corre_eventos set status = 'cancelado', mexido_em = now() where id = e.id;
  for x in select id, asaas_cobranca from public.corre_ingresso_pedidos where evento = e.id and status in ('reservado', 'pendente') loop
    update public.corre_ingresso_pedidos set status = 'cancelado' where id = x.id;
    update public.corre_ingressos set status = 'cancelado' where pedido = x.id and status = 'pendente';
    if x.asaas_cobranca <> '' then abertos := abertos || jsonb_build_array(jsonb_build_object('id', x.id, 'cobranca', x.asaas_cobranca)); end if;
  end loop;
  return jsonb_build_object('ok', true, 'titulo', e.titulo, 'abertos', abertos,
    'pagos', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'cobranca', p.asaas_cobranca, 'total', p.total))
      from (select * from public.corre_ingresso_pedidos q where q.evento = e.id and q.status = 'pago' order by q.pago_em limit 30) p), '[]'::jsonb),
    'faltam', (select count(*) from public.corre_ingresso_pedidos q where q.evento = e.id and q.status = 'pago'));
end $$;
revoke all on function public.corre_evento_cancela(uuid, uuid) from public, anon, authenticated;
grant execute on function public.corre_evento_cancela(uuid, uuid) to service_role;

-- 5.9 os ingressos de quem comprou, e um ingresso pelo código (o QR leva pra ele)
create or replace function public.corre_ingressos_meus() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'status', p.status, 'qtd', p.qtd, 'valor', p.valor, 'taxa', p.taxa, 'total', p.total,
      'forma', p.forma, 'link', case when p.status = 'pendente' then p.link else '' end, 'reserva_ate', p.reserva_ate, 'pago_em', p.pago_em,
      'desistiu_em', p.desistiu_em, 'estornado_em', p.estornado_em, 'criado_em', p.criado_em,
      'evento', jsonb_build_object('id', e.id, 'titulo', e.titulo, 'categoria', e.categoria, 'dia', e.dia, 'inicio', to_char(e.inicio, 'HH24:MI'),
        'local', e.local, 'endereco', e.endereco, 'bairro', e.bairro, 'cidade', e.cidade, 'status', e.status, 'mudou_em', e.mudou_em,
        'comeca', (e.dia + e.inicio) at time zone 'America/Sao_Paulo'),
      'ingressos', coalesce((select jsonb_agg(jsonb_build_object('codigo', i.codigo, 'portador', i.portador, 'lote', i.nome_lote, 'meia', i.meia,
          'preco', i.preco, 'status', i.status, 'usado_em', i.usado_em) order by i.criado_em) from public.corre_ingressos i where i.pedido = p.id), '[]'::jsonb))
    order by e.dia desc, p.criado_em desc), '[]'::jsonb)
  from public.corre_ingresso_pedidos p join public.corre_eventos e on e.id = p.evento
  where p.comprador = auth.uid() and (p.status in ('pago', 'estornado') or (p.status = 'pendente' and p.reserva_ate > now() - interval '1 day'))
    and e.dia >= (now() at time zone 'America/Sao_Paulo')::date - 365
$$;
revoke all on function public.corre_ingressos_meus() from public, anon;
grant execute on function public.corre_ingressos_meus() to authenticated;

create or replace function public.corre_ingresso_ver(p_codigo text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare eu uuid := auth.uid(); c text := upper(btrim(coalesce(p_codigo, ''))); i public.corre_ingressos; e public.corre_eventos; meu boolean; org boolean;
begin
  if c !~ '^[A-HJ-NP-Z2-9]{12}$' then return null; end if;
  -- quem não entrou abre poucos por hora (o código já é difícil de adivinhar; isto é a tranca a mais)
  if eu is null and to_regprocedure('public.corre_ip_cota(text,integer,integer)') is not null then
    if not public.corre_ip_cota('ingver', 60, 300) then return jsonb_build_object('erro', 'devagar'); end if;
  end if;
  select * into i from public.corre_ingressos where codigo = c;
  if not found then return null; end if;
  select * into e from public.corre_eventos where id = i.evento;
  meu := eu is not null and eu = i.comprador;
  org := eu is not null and eu = e.dono;
  return jsonb_build_object('codigo', i.codigo, 'lote', i.nome_lote, 'meia', i.meia, 'status', i.status, 'usado_em', i.usado_em,
    'portador', case when meu or org then i.portador else split_part(i.portador, ' ', 1) end, 'meu', meu, 'organizador', org,
    'evento', jsonb_build_object('id', e.id, 'titulo', e.titulo, 'categoria', e.categoria, 'dia', e.dia, 'inicio', to_char(e.inicio, 'HH24:MI'),
      'local', e.local, 'endereco', e.endereco, 'bairro', e.bairro, 'cidade', e.cidade, 'status', e.status, 'classif', e.classif));
end $$;
revoke all on function public.corre_ingresso_ver(text) from public;
grant execute on function public.corre_ingresso_ver(text) to anon, authenticated;

-- a portaria: o dono do evento confere o código (do QR ou digitado). Já entrou: diz quando. Desfazer vale por 15 minutos
create or replace function public.corre_ingresso_valida(p_codigo text, p_desfaz boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare eu uuid := auth.uid(); c text := upper(regexp_replace(coalesce(p_codigo, ''), '[^A-Za-z0-9]', '', 'g')); i public.corre_ingressos; dono uuid;
begin
  if eu is null then raise exception 'login' using hint = 'login'; end if;
  if c !~ '^[A-HJ-NP-Z2-9]{12}$' then return jsonb_build_object('ok', false, 'motivo', 'codigo'); end if;
  select * into i from public.corre_ingressos where codigo = c for update;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'nao_achou'); end if;
  select e.dono into dono from public.corre_eventos e where e.id = i.evento;
  if dono is distinct from eu then return jsonb_build_object('ok', false, 'motivo', 'outro_evento'); end if;
  if p_desfaz then
    if i.status = 'usado' and i.usado_em > now() - interval '15 minutes' then
      update public.corre_ingressos set status = 'valido', usado_em = null, usado_por = null where id = i.id;
      return jsonb_build_object('ok', true, 'desfez', true, 'portador', i.portador);
    end if;
    return jsonb_build_object('ok', false, 'motivo', 'desfaz');
  end if;
  if i.status = 'usado' then return jsonb_build_object('ok', false, 'motivo', 'usado', 'usado_em', i.usado_em, 'portador', i.portador, 'lote', i.nome_lote); end if;
  if i.status <> 'valido' then return jsonb_build_object('ok', false, 'motivo', i.status, 'portador', i.portador); end if;
  update public.corre_ingressos set status = 'usado', usado_em = now(), usado_por = eu where id = i.id;
  return jsonb_build_object('ok', true, 'portador', i.portador, 'lote', i.nome_lote, 'meia', i.meia, 'evento', i.evento);
end $$;
revoke all on function public.corre_ingresso_valida(text, boolean) from public, anon;
grant execute on function public.corre_ingresso_valida(text, boolean) to authenticated;

-- 5.10 o aviso no celular de quem vendeu e de quem comprou (a função "push", junto com os pedidos de orçamento): um por
-- pedido pago nos últimos 10 minutos, pra cada lado
create or replace function public.corre_ingresso_alvos(p_agora timestamptz default now()) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare p record; subs jsonb; k text; ja bigint; out jsonb := '[]'::jsonb; quando text; valor text;
begin
  for p in select q.id, q.comprador, q.qtd, q.valor, e.id evento, e.dono, e.titulo, e.dia, e.inicio, e.local
             from public.corre_ingresso_pedidos q join public.corre_eventos e on e.id = q.evento
            where q.status = 'pago' and q.pago_em > p_agora - interval '10 minutes' order by q.pago_em limit 200 loop
    quando := to_char(p.dia, 'DD/MM') || ' às ' || to_char(p.inicio, 'HH24:MI');
    valor := 'R$ ' || replace(to_char(p.valor, 'FM999999990.00'), '.', ',');
    -- quem divulgou: vendeu
    if coalesce((select pr.msg from public.corre_push_pref pr where pr.dono = p.dono), true) then
      subs := (select jsonb_agg(jsonb_build_object('endpoint', d.endpoint, 'p256dh', d.p256dh, 'auth', d.auth) order by d.visto_em desc)
                 from (select * from public.corre_push d2 where d2.dono = p.dono order by d2.visto_em desc limit 10) d);
      if subs is not null then
        k := 'ing:' || p.id || ':org';
        insert into public.corre_push_log (chave, quem) values (k, null) on conflict do nothing;
        get diagnostics ja = row_count;
        if ja > 0 then
          out := out || jsonb_build_array(jsonb_build_object('para', p.dono, 'tipo', 'ingresso', 'subs', subs, 'payload', jsonb_build_object(
            'titulo', left('Vendeu ' || p.qtd || case when p.qtd = 1 then ' ingresso: ' else ' ingressos: ' end || p.titulo, 120),
            'corpo', case when p.valor > 0 then valor || ' na tua conta. ' else '' end || 'Toca pra ver as vendas.',
            'url', '/#/muralzim/vendas/' || p.evento, 'tag', 'ing-' || p.id, 'renotify', true, 't', 'pedido', 'em', now())));
        end if;
      end if;
    end if;
    -- quem comprou: o ingresso chegou
    continue when p.comprador is null or p.comprador = p.dono;
    continue when not coalesce((select pr.msg from public.corre_push_pref pr where pr.dono = p.comprador), true);
    subs := (select jsonb_agg(jsonb_build_object('endpoint', d.endpoint, 'p256dh', d.p256dh, 'auth', d.auth) order by d.visto_em desc)
               from (select * from public.corre_push d2 where d2.dono = p.comprador order by d2.visto_em desc limit 10) d);
    continue when subs is null;
    k := 'ing:' || p.id || ':cli';
    insert into public.corre_push_log (chave, quem) values (k, null) on conflict do nothing;
    get diagnostics ja = row_count;
    continue when ja = 0;
    out := out || jsonb_build_array(jsonb_build_object('para', p.comprador, 'tipo', 'ingresso', 'subs', subs, 'payload', jsonb_build_object(
      'titulo', left('Teu ingresso chegou: ' || p.titulo, 120), 'corpo', left(quando || ' · ' || p.local || '. Toca pra ver o QR.', 300),
      'url', '/#/muralzim/ingressos', 'tag', 'ing-' || p.id, 'renotify', true, 't', 'pedido', 'em', now())));
  end loop;
  return out;
end $$;
revoke all on function public.corre_ingresso_alvos(timestamptz) from public, anon, authenticated;
grant execute on function public.corre_ingresso_alvos(timestamptz) to service_role;

-- 5.11 quem tem evento com ingresso vendido pela frente não apaga a conta (quem comprou ficaria sem o evento e sem o
-- dinheiro): cancela o evento antes, e o dinheiro volta pra todo mundo. O servidor passa
create or replace function public.corre_perfil_sem_ingresso() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(), '') not in ('anon', 'authenticated') then return old; end if;
  if exists (select 1 from public.corre_eventos e where e.dono = old.id and e.status = 'ativo'
              and ((e.dia + e.inicio) at time zone 'America/Sao_Paulo') > now() - interval '1 day'
              and exists (select 1 from public.corre_ingressos i where i.evento = e.id and i.status = 'valido')) then
    raise exception 'tem evento com ingresso vendido: cancela o evento antes de apagar a conta' using errcode = 'P0001', hint = 'eventos_vendidos';
  end if;
  return old;
end $$;
revoke all on function public.corre_perfil_sem_ingresso() from public, anon, authenticated;
create or replace trigger corre_perfis_sem_ingresso before delete on public.corre_perfis
  for each row execute function public.corre_perfil_sem_ingresso();

commit;

select case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'corre_perfis' and column_name = 'link')
             and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'corre_perfis' and column_name = 'aniver')
             and (select relrowsecurity from pg_class where oid = 'public.corre_nascimento'::regclass)
             and not has_table_privilege('anon', 'public.corre_nascimento', 'select')
             and not has_table_privilege('authenticated', 'public.corre_nascimento', 'insert')
             and has_function_privilege('authenticated', 'public.corre_nascimento_salva(date, boolean)', 'execute')
             and not has_function_privilege('anon', 'public.corre_nascimento_salva(date, boolean)', 'execute')
             and has_function_privilege('authenticated', 'public.corre_correal_multa(integer)', 'execute')
             and not has_function_privilege('anon', 'public.corre_correal_multa(integer)', 'execute')
             and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'corre_posts' and column_name = 'aprov_itens')
             and has_function_privilege('anon', 'public.corre_aprov_ajuste(text, uuid, text[], text, text)', 'execute')
             and position('aprov_itens' in (select prosrc from pg_proc where oid = 'public.corre_aprov_ver(text)'::regprocedure)) > 0
             and (select relrowsecurity from pg_class where oid = 'public.corre_eventos'::regclass)
             and (select relrowsecurity from pg_class where oid = 'public.corre_organizadores'::regclass)
             and (select relrowsecurity from pg_class where oid = 'public.corre_ingressos'::regclass)
             and not has_table_privilege('anon', 'public.corre_eventos', 'select')
             and not has_table_privilege('authenticated', 'public.corre_organizadores', 'select')
             and not has_table_privilege('authenticated', 'public.corre_ingressos', 'select')
             and has_function_privilege('anon', 'public.corre_eventos_lista(text)', 'execute')
             and has_function_privilege('authenticated', 'public.corre_evento_salva(jsonb)', 'execute')
             and not has_function_privilege('anon', 'public.corre_evento_salva(jsonb)', 'execute')
             and not has_function_privilege('authenticated', 'public.corre_ingresso_reserva(uuid, uuid, jsonb, text, text, text)', 'execute')
             and has_function_privilege('service_role', 'public.corre_ingresso_reserva(uuid, uuid, jsonb, text, text, text)', 'execute')
             and not has_function_privilege('authenticated', 'public.corre_ingresso_paga(text, numeric)', 'execute')
             and not has_function_privilege('authenticated', 'public.corre_org_conta(uuid)', 'execute')
             and public.corre_ing_taxa(50) = 5 and public.corre_ing_taxa(10) = 2
             and exists (select 1 from pg_trigger where tgname = 'corre_perfis_sem_ingresso')
            then 'delta v5.09 ok' else 'delta v5.09 NÃO TERMINOU: rode o arquivo inteiro de novo.' end as status;
