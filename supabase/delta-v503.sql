-- CORRE · delta v5.03: Dá um Corre, a doação pras entidades de Londrina (o Thales: "um local onde as pessoas fazem uma
-- doação espontânea pra ajudarmos entidades carentes de Londrina"; escolheu: o Pix direto pra entidade, a lista aprovada
-- pelo Corre e o botão no link na bio de cada um).
-- O dinheiro nunca passa pelo Corre: a página mostra a chave Pix da entidade (e o Pix copia e cola montado com ela) e quem
-- doa paga direto no banco dele. Por isso a chave mora AQUI, numa lista que só os donos (corre_ve_lojinha) mexem: o link
-- na bio de cada pessoa guarda só o id da entidade que ela apoia (bio_link.doa), e a página busca a chave na lista. Assim
-- ninguém consegue pôr o próprio Pix fingindo ser uma entidade.
-- O Corre só conta quantas vezes abriram, copiaram o Pix ou abriram o QR de cada entidade (não sabe valor nem quem).
-- Pode rodar duas vezes. Sem DROP e sem DELETE (tirar uma entidade é desligar). Precisa da v4.02 (corre_ve_lojinha).

-- 1. as entidades (o app não lê a tabela direto: a lista aberta sai pela função, só as ligadas)
create table if not exists public.corre_entidades (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(btrim(nome)) between 2 and 80),
  faz text not null default '' check (char_length(faz) <= 280),
  causa text not null default 'outra',
  cidade text not null default 'Londrina' check (char_length(cidade) between 2 and 60),
  cnpj text not null check (cnpj ~ '^\d{14}$'),
  pix text not null check (char_length(pix) between 5 and 77),
  pix_nome text not null check (pix_nome ~ '^[A-Z0-9 .&-]{2,25}$'),
  site text not null default '' check (site = '' or site ~* '^https://[^\s<>"]{3,200}$'),
  instagram text not null default '' check (instagram ~ '^[a-z0-9_.]{0,30}$'),
  foto text not null default '' check (foto = '' or foto ~ '^https://[^\s<>"]{3,300}$'),
  ativa boolean not null default true,
  ordem integer not null default 0,
  por uuid,
  criada_em timestamptz not null default now(),
  mexida_em timestamptz not null default now()
);
alter table public.corre_entidades enable row level security;
revoke all on public.corre_entidades from anon, authenticated;
create unique index if not exists corre_entidades_cnpj_idx on public.corre_entidades (cnpj);

-- as causas (a página mostra o rótulo; uma lista curta pra não virar bagunça)
create or replace function public.corre_entidade_causa_ok(c text) returns boolean language sql immutable as $$
  select coalesce(c, '') in ('criancas', 'idosos', 'animais', 'saude', 'fome', 'educacao', 'deficiencia', 'rua', 'mulheres', 'outra')
$$;

-- a chave Pix nos formatos que o Banco Central aceita: CPF, CNPJ, celular (+55), e-mail ou a aleatória
create or replace function public.corre_pix_ok(k text) returns boolean language sql immutable as $$
  select coalesce(k, '') ~* '^(\d{11}|\d{14}|\+55\d{10,11}|[^\s@]{1,64}@[^\s@]{1,180}\.[a-z]{2,}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$'
$$;

-- 2. a lista aberta (o link na bio de quem não entrou também lê): só as ligadas
create or replace function public.corre_entidades_lista() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'nome', e.nome, 'faz', e.faz, 'causa', e.causa, 'cidade', e.cidade,
      'cnpj', e.cnpj, 'pix', e.pix, 'pix_nome', e.pix_nome, 'site', e.site, 'instagram', e.instagram, 'foto', e.foto)
    order by e.ordem, e.nome), '[]'::jsonb)
  from public.corre_entidades e where e.ativa
$$;
revoke all on function public.corre_entidades_lista() from public;
grant execute on function public.corre_entidades_lista() to anon, authenticated;

-- 3. pôr e mexer numa entidade (só os donos). Volta o id. Os erros têm o motivo no hint, pro app dizer o que arrumar
create or replace function public.corre_entidade_salva(p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_nome text; v_cnpj text; v_pix text; v_pn text; v_site text; v_ig text; v_foto text; v_causa text;
begin
  if auth.uid() is null or not public.corre_ve_lojinha(auth.uid()) then raise exception 'so_dono' using hint = 'so_dono'; end if;
  if jsonb_typeof(p) <> 'object' then raise exception 'dados' using hint = 'dados'; end if;
  v_nome := btrim(coalesce(p->>'nome', ''));
  v_cnpj := regexp_replace(coalesce(p->>'cnpj', ''), '\D', '', 'g');
  v_pix := btrim(coalesce(p->>'pix', ''));
  -- chave de CPF, CNPJ ou celular escrita com ponto, traço ou parêntese vale igual
  if v_pix !~ '@' and v_pix !~* '^[0-9a-f]{8}-' then
    v_pix := case when v_pix ~ '^\+' then '+' else '' end || regexp_replace(v_pix, '\D', '', 'g');
  end if;
  v_pn := upper(btrim(translate(coalesce(nullif(btrim(p->>'pix_nome'), ''), v_nome), 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')));
  v_pn := left(btrim(regexp_replace(v_pn, '[^A-Z0-9 .&-]', ' ', 'g')), 25);
  v_site := btrim(coalesce(p->>'site', ''));
  v_ig := lower(regexp_replace(btrim(coalesce(p->>'instagram', '')), '^@', ''));
  v_foto := btrim(coalesce(p->>'foto', ''));
  v_causa := coalesce(nullif(p->>'causa', ''), 'outra');
  if char_length(v_nome) not between 2 and 80 then raise exception 'nome' using hint = 'nome'; end if;
  if v_cnpj !~ '^\d{14}$' then raise exception 'cnpj' using hint = 'cnpj'; end if;
  if not public.corre_pix_ok(v_pix) or char_length(v_pix) > 77 then raise exception 'pix' using hint = 'pix'; end if;
  if v_pn !~ '^[A-Z0-9 .&-]{2,25}$' then raise exception 'pix_nome' using hint = 'pix_nome'; end if;
  if v_site <> '' and v_site !~* '^https://[^\s<>"]{3,200}$' then raise exception 'site' using hint = 'site'; end if;
  if v_ig !~ '^[a-z0-9_.]{0,30}$' then raise exception 'instagram' using hint = 'instagram'; end if;
  if v_foto <> '' and v_foto !~ '^https://[^\s<>"]{3,300}$' then raise exception 'foto' using hint = 'foto'; end if;
  if not public.corre_entidade_causa_ok(v_causa) then v_causa := 'outra'; end if;
  if exists (select 1 from public.corre_entidades where cnpj = v_cnpj and id is distinct from nullif(p->>'id', '')::uuid) then
    raise exception 'cnpj_repetido' using hint = 'cnpj_repetido';
  end if;
  if nullif(p->>'id', '') is not null then
    update public.corre_entidades set nome = v_nome, faz = left(btrim(coalesce(p->>'faz', '')), 280), causa = v_causa,
      cidade = left(coalesce(nullif(btrim(p->>'cidade'), ''), 'Londrina'), 60), cnpj = v_cnpj, pix = v_pix, pix_nome = v_pn,
      site = v_site, instagram = v_ig, foto = v_foto, ordem = coalesce((p->>'ordem')::int, ordem),
      ativa = coalesce((p->>'ativa')::boolean, ativa), mexida_em = now()
    where id = (p->>'id')::uuid returning id into v_id;
    if v_id is null then raise exception 'nao_achou' using hint = 'nao_achou'; end if;
  else
    if (select count(*) from public.corre_entidades) >= 60 then raise exception 'limite' using hint = 'limite'; end if;
    insert into public.corre_entidades (nome, faz, causa, cidade, cnpj, pix, pix_nome, site, instagram, foto, ordem, ativa, por)
    values (v_nome, left(btrim(coalesce(p->>'faz', '')), 280), v_causa, left(coalesce(nullif(btrim(p->>'cidade'), ''), 'Londrina'), 60),
      v_cnpj, v_pix, v_pn, v_site, v_ig, v_foto, coalesce((p->>'ordem')::int, 0), coalesce((p->>'ativa')::boolean, true), auth.uid())
    returning id into v_id;
  end if;
  return v_id;
end $$;
revoke all on function public.corre_entidade_salva(jsonb) from public, anon;
grant execute on function public.corre_entidade_salva(jsonb) to authenticated;

-- 4. a conta: quantas vezes abriram a doação de cada entidade, copiaram o Pix ou abriram o QR (sem saber quem nem quanto)
create table if not exists public.corre_doacao_conta (
  dia date not null, entidade uuid not null, tipo text not null, n integer not null default 0,
  primary key (dia, entidade, tipo));
alter table public.corre_doacao_conta enable row level security;
revoke all on public.corre_doacao_conta from anon, authenticated;

create or replace function public.corre_doacao_marca(p_entidade uuid, p_tipo text) returns void
language plpgsql security definer set search_path = public as $$
declare hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if p_entidade is null or p_tipo is null or p_tipo not in ('abre', 'copia', 'qr') then return; end if;
  if not exists (select 1 from public.corre_entidades where id = p_entidade and ativa) then return; end if;
  -- uma conexão não infla a conta: 60 por hora, 300 por dia (sem o registro das cotas, segue sem)
  if to_regprocedure('public.corre_ip_cota(text,integer,integer)') is not null then
    if not public.corre_ip_cota('doa', 60, 300) then return; end if;
  end if;
  insert into public.corre_doacao_conta as c (dia, entidade, tipo, n) values (hoje, p_entidade, p_tipo, 1)
    on conflict (dia, entidade, tipo) do update set n = least(c.n + 1, 1000000);
end $$;
revoke all on function public.corre_doacao_marca(uuid, text) from public;
grant execute on function public.corre_doacao_marca(uuid, text) to anon, authenticated;

-- 5. o que os donos veem na Lojinha: todas as entidades (as desligadas também), com a conta do período e em quantos
-- links na bio ligados cada uma tá
create or replace function public.corre_entidades_donos(p_dias integer default 30) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare d int := greatest(1, least(coalesce(p_dias, 30), 120)); desde date := (now() at time zone 'America/Sao_Paulo')::date - (d - 1);
begin
  if auth.uid() is null or not public.corre_ve_lojinha(auth.uid()) then raise exception 'so_dono' using hint = 'so_dono'; end if;
  return jsonb_build_object('dias', d, 'entidades', coalesce((select jsonb_agg(jsonb_build_object(
      'id', e.id, 'nome', e.nome, 'faz', e.faz, 'causa', e.causa, 'cidade', e.cidade, 'cnpj', e.cnpj, 'pix', e.pix, 'pix_nome', e.pix_nome,
      'site', e.site, 'instagram', e.instagram, 'foto', e.foto, 'ativa', e.ativa, 'ordem', e.ordem,
      'abre', coalesce((select sum(n) from public.corre_doacao_conta c where c.entidade = e.id and c.tipo = 'abre' and c.dia >= desde), 0),
      'copia', coalesce((select sum(n) from public.corre_doacao_conta c where c.entidade = e.id and c.tipo = 'copia' and c.dia >= desde), 0),
      'qr', coalesce((select sum(n) from public.corre_doacao_conta c where c.entidade = e.id and c.tipo = 'qr' and c.dia >= desde), 0),
      'bios', (select count(*) from public.corre_perfis p where p.bio_link->>'doa' = e.id::text and coalesce((p.bio_link->>'on')::boolean, true)))
    order by e.ativa desc, e.ordem, e.nome) from public.corre_entidades e), '[]'::jsonb));
end $$;
revoke all on function public.corre_entidades_donos(integer) from public, anon;
grant execute on function public.corre_entidades_donos(integer) to authenticated;

select 'delta v5.03 ok';
