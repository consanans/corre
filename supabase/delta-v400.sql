-- CORRE v4.0 · o Link na bio e o convite que rende
-- Pode rodar duas vezes. Sem DROP (o conector do Supabase trava em comando com DROP). Termina com 'delta v4.0 ok'.
--
-- 1) O LINK NA BIO mora no próprio perfil (corre_perfis.bio_link, jsonb), que já é público: a página
--    app.corresocial.com/@nome lê dali. O banco limpa o que chega (até 12 links, só https/mailto/tel, textos curtos):
--    o site também limpa, mas quem manda é aqui.
-- 2) OS NÚMEROS DA PÁGINA: corre_bio_conta guarda só contagem por dia e por botão (nada de quem visitou: sem IP, sem
--    aparelho). Qualquer um marca (corre_bio_marca, a página é pública); só o dono lê (corre_bio_numeros). A visita do
--    próprio dono não conta.
-- 3) O CONVITE: quem entra pelo link de alguém (?de=nome) ganha 0,50 de correal de boas-vindas, e quem chamou ganha
--    0,50 (até 10 convites pagos por pessoa). Só vale pra perfil criado há menos de 2 dias, uma vez por pessoa.
--    Correal não é dinheiro: é a moeda do Correverso (paga a IA quando acaba o grátis do dia).

-- 1) o link na bio
alter table public.corre_perfis add column if not exists bio_link jsonb not null default '{}'::jsonb;
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.corre_perfis'::regclass and conname = 'corre_perfis_bio_link_tam') then
    alter table public.corre_perfis add constraint corre_perfis_bio_link_tam check (octet_length(bio_link::text) <= 12000);
  end if;
end $$;

create or replace function public.corre_perfil_bio() returns trigger
language plpgsql set search_path = public as $$
declare b jsonb := coalesce(new.bio_link, '{}'::jsonb); l jsonb; ls jsonb := '[]'::jsonb; u text; t text; n int := 0;
begin
  if jsonb_typeof(b) <> 'object' then b := '{}'::jsonb; end if;
  -- os links: só os que começam com https://, http://, mailto: ou tel:, título até 60 letras, no máximo 12
  if jsonb_typeof(b->'links') = 'array' then
    for l in select * from jsonb_array_elements(b->'links') loop
      exit when n >= 12;
      continue when jsonb_typeof(l) <> 'object';
      u := left(btrim(coalesce(l->>'u', '')), 400); t := left(btrim(coalesce(l->>'t', '')), 60);
      continue when u !~* '^(https?://[^\s<>"]+|mailto:[^\s<>"]+|tel:[0-9+() -]+)$' or t = '';
      ls := ls || jsonb_build_array(jsonb_build_object('t', t, 'u', u));
      n := n + 1;
    end loop;
  end if;
  b := b || jsonb_build_object('links', ls);
  if b ? 'frase' then b := jsonb_set(b, '{frase}', to_jsonb(left(coalesce(b->>'frase', ''), 140))); end if;
  if b ? 'pix' then
    b := jsonb_set(b, '{pix}', case when jsonb_typeof(b->'pix') = 'object'
      then jsonb_build_object('chave', left(btrim(coalesce(b->'pix'->>'chave', '')), 120), 'nome', left(btrim(coalesce(b->'pix'->>'nome', '')), 60))
      else '{}'::jsonb end);
  end if;
  if b ? 'tema' and coalesce(b->>'tema', '') !~ '^(corre|papel|noite|rua|marca)$' then b := jsonb_set(b, '{tema}', '"corre"'); end if;
  if b ? 'marca' and coalesce(b->>'marca', '') !~ '^[0-9a-f-]{36}$' then b := b - 'marca'; end if;
  if b ? 'blocos' and jsonb_typeof(b->'blocos') <> 'array' then b := b - 'blocos'; end if;
  -- a marca do Studio Houzi congelada na hora de salvar (a página não precisa abrir o Studio): só cores #RRGGBB, ids
  -- de letra do Studio, e o logo numa imagem do Storage do Corre
  if b ? 'mv' then
    b := jsonb_set(b, '{mv}', case when jsonb_typeof(b->'mv') <> 'object' then '{}'::jsonb else jsonb_strip_nulls(jsonb_build_object(
      'fundo', case when b->'mv'->>'fundo' ~ '^#[0-9A-Fa-f]{6}$' then b->'mv'->>'fundo' end,
      'texto', case when b->'mv'->>'texto' ~ '^#[0-9A-Fa-f]{6}$' then b->'mv'->>'texto' end,
      'cor', case when b->'mv'->>'cor' ~ '^#[0-9A-Fa-f]{6}$' then b->'mv'->>'cor' end,
      'acento', case when b->'mv'->>'acento' ~ '^#[0-9A-Fa-f]{6}$' then b->'mv'->>'acento' end,
      'fd', case when b->'mv'->>'fd' ~ '^[a-z0-9-]{2,30}$' then b->'mv'->>'fd' end,
      'ft', case when b->'mv'->>'ft' ~ '^[a-z0-9-]{2,30}$' then b->'mv'->>'ft' end,
      'logo', case when b->'mv'->>'logo' ~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/[A-Za-z0-9/_.-]+$' then b->'mv'->>'logo' end,
      'nome', left(b->'mv'->>'nome', 40),
      'slug', case when b->'mv'->>'slug' ~ '^[a-z0-9-]{1,80}$' then b->'mv'->>'slug' end)) end);
  end if;
  new.bio_link := b;
  return new;
end $$;
create or replace trigger corre_perfis_bio before insert or update of bio_link on public.corre_perfis
  for each row execute function public.corre_perfil_bio();

-- 2) os números da página
create table if not exists public.corre_bio_conta (
  dono  uuid not null references public.corre_perfis(id) on delete cascade,
  dia   date not null,
  chave text not null check (chave ~ '^[a-z0-9:_-]{1,48}$'),
  n     int not null default 0,
  primary key (dono, dia, chave)
);
alter table public.corre_bio_conta enable row level security;
do $$ begin
  if not exists (select 1 from pg_policy where polrelid = 'public.corre_bio_conta'::regclass and polname = 'bio: vejo os meus números') then
    create policy "bio: vejo os meus números" on public.corre_bio_conta for select using (dono = auth.uid());
  end if;
end $$;
-- tabela nova nasce com grant demais (TRUNCATE/REFERENCES/TRIGGER): o app só lê, e só o que é dele
revoke all on public.corre_bio_conta from public, anon, authenticated;
grant select on public.corre_bio_conta to authenticated;

-- marca uma visita ('visita') ou um toque num botão. Pela @ (a página só sabe o nome). O dono não conta.
-- No máximo 80 chaves diferentes por dia por perfil (ninguém enche a tabela de lixo) e um teto por contador.
create or replace function public.corre_bio_marca(p_handle text, p_chave text) returns void
language plpgsql security definer set search_path = public as $$
declare d uuid; hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if p_chave is null or p_chave !~ '^[a-z0-9:_-]{1,48}$' then return; end if;
  select id into d from public.corre_perfis where handle = lower(btrim(coalesce(p_handle, '')));
  if d is null or d = auth.uid() then return; end if;
  if not exists (select 1 from public.corre_bio_conta where dono = d and dia = hoje and chave = p_chave)
     and (select count(*) from public.corre_bio_conta where dono = d and dia = hoje) >= 80 then return; end if;
  insert into public.corre_bio_conta as c (dono, dia, chave, n) values (d, hoje, p_chave, 1)
    on conflict (dono, dia, chave) do update set n = least(c.n + 1, 1000000);
end $$;
revoke all on function public.corre_bio_marca(text, text) from public, anon, authenticated, service_role;
grant execute on function public.corre_bio_marca(text, text) to anon, authenticated;

-- o que o dono vê: as visitas por dia e os toques por botão, nos últimos N dias (até 90)
create or replace function public.corre_bio_numeros(p_dias int default 30) returns jsonb
language sql stable security definer set search_path = public as $$
  with j as (select greatest(1, least(coalesce(p_dias, 30), 90)) as nd),
  c as (select b.dia, b.chave, b.n from public.corre_bio_conta b, j
         where b.dono = auth.uid() and b.dia > (now() at time zone 'America/Sao_Paulo')::date - j.nd)
  select case when auth.uid() is null then null else jsonb_build_object(
    'dias', (select nd from j),
    'visitas', coalesce((select sum(n) from c where chave = 'visita'), 0),
    'porDia', coalesce((select jsonb_agg(jsonb_build_object('dia', dia, 'n', s) order by dia)
                          from (select dia, sum(n) s from c where chave = 'visita' group by dia) x), '[]'::jsonb),
    'toques', coalesce((select jsonb_object_agg(chave, s) from (select chave, sum(n) s from c where chave <> 'visita' group by chave) y), '{}'::jsonb)
  ) end $$;
revoke all on function public.corre_bio_numeros(int) from public, anon, authenticated, service_role;
grant execute on function public.corre_bio_numeros(int) to authenticated;

-- 3) o convite
create table if not exists public.corre_convites (
  quem  uuid primary key references public.corre_perfis(id) on delete cascade,
  por   uuid not null references public.corre_perfis(id) on delete cascade,
  em    timestamptz not null default now(),
  pago  numeric(12,2) not null default 0,
  check (quem <> por)
);
create index if not exists corre_convites_por_idx on public.corre_convites (por);
alter table public.corre_convites enable row level security;
do $$ begin
  if not exists (select 1 from pg_policy where polrelid = 'public.corre_convites'::regclass and polname = 'convites: os meus') then
    create policy "convites: os meus" on public.corre_convites for select using (quem = auth.uid() or por = auth.uid());
  end if;
end $$;
revoke all on public.corre_convites from public, anon, authenticated;
grant select on public.corre_convites to authenticated;

create or replace function public.corre_convite_valor() returns numeric language sql immutable set search_path = public as $$ select 0.50::numeric $$;
create or replace function public.corre_convite_teto() returns int language sql immutable set search_path = public as $$ select 10 $$;

-- quem acabou de criar o perfil diz quem chamou (a @ do ?de=). Paga as boas-vindas pra ele e o convite pra quem chamou.
create or replace function public.corre_convite_aceita(p_handle text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); p uuid; criado timestamptz; v numeric := public.corre_convite_valor(); pagos int; paga_por numeric := 0; s numeric;
begin
  if u is null then return jsonb_build_object('ok', false, 'motivo', 'login'); end if;
  select created_at into criado from public.corre_perfis where id = u;
  if criado is null then return jsonb_build_object('ok', false, 'motivo', 'sem_perfil'); end if;
  if criado < now() - interval '2 days' then return jsonb_build_object('ok', false, 'motivo', 'velho'); end if;
  select id into p from public.corre_perfis where handle = lower(btrim(coalesce(p_handle, '')));
  if p is null or p = u then return jsonb_build_object('ok', false, 'motivo', 'quem'); end if;
  perform pg_advisory_xact_lock(hashtext('convite:' || u::text));
  if exists (select 1 from public.corre_convites where quem = u) then return jsonb_build_object('ok', false, 'motivo', 'ja'); end if;
  perform pg_advisory_xact_lock(hashtext('convite-por:' || p::text));
  select count(*) into pagos from public.corre_convites where por = p and pago > 0;
  if pagos < public.corre_convite_teto() then paga_por := v; end if;
  insert into public.corre_convites (quem, por, pago) values (u, p, paga_por);
  -- as boas-vindas de quem chegou
  perform pg_advisory_xact_lock(hashtext('correal:' || u::text));
  insert into public.corre_correal_log (dono, valor, motivo) values (u, v, 'convite:chegou');
  insert into public.corre_correal as c (dono, saldo, ganho) values (u, v, v)
    on conflict (dono) do update set saldo = c.saldo + excluded.saldo, ganho = c.ganho + excluded.ganho, updated_at = now();
  -- o de quem chamou (até o teto)
  if paga_por > 0 then
    perform pg_advisory_xact_lock(hashtext('correal:' || p::text));
    insert into public.corre_correal_log (dono, valor, motivo) values (p, paga_por, 'convite:trouxe');
    insert into public.corre_correal as c (dono, saldo, ganho) values (p, paga_por, paga_por)
      on conflict (dono) do update set saldo = c.saldo + excluded.saldo, ganho = c.ganho + excluded.ganho, updated_at = now();
  end if;
  select saldo into s from public.corre_correal where dono = u;
  return jsonb_build_object('ok', true, 'ganhou', v, 'saldo', coalesce(s, 0), 'pagou_quem_chamou', paga_por > 0);
end $$;
revoke all on function public.corre_convite_aceita(text) from public, anon, authenticated, service_role;
grant execute on function public.corre_convite_aceita(text) to authenticated;

-- quantos entraram pelo teu link e quanto rendeu (pra folha do convite)
create or replace function public.corre_convites_meus() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null then null else jsonb_build_object(
    'n', (select count(*) from public.corre_convites where por = auth.uid()),
    'ganho', coalesce((select sum(pago) from public.corre_convites where por = auth.uid()), 0),
    'valor', public.corre_convite_valor(), 'teto', public.corre_convite_teto(),
    'gente', coalesce((select jsonb_agg(jsonb_build_object('handle', pf.handle, 'nome', pf.nome, 'avatar_url', pf.avatar_url, 'em', c.em) order by c.em desc)
                         from (select * from public.corre_convites where por = auth.uid() order by em desc limit 30) c
                         join public.corre_perfis pf on pf.id = c.quem), '[]'::jsonb)
  ) end $$;
revoke all on function public.corre_convites_meus() from public, anon, authenticated, service_role;
grant execute on function public.corre_convites_meus() to authenticated;

-- confere que ficou tudo no lugar
do $$ begin
  if not exists (select 1 from pg_attribute where attrelid = 'public.corre_perfis'::regclass and attname = 'bio_link' and not attisdropped)
     or not exists (select 1 from pg_trigger where tgrelid = 'public.corre_perfis'::regclass and tgname = 'corre_perfis_bio')
     or to_regprocedure('public.corre_bio_marca(text, text)') is null or to_regprocedure('public.corre_bio_numeros(integer)') is null
     or to_regprocedure('public.corre_convite_aceita(text)') is null or to_regprocedure('public.corre_convites_meus()') is null then
    raise exception 'delta v4.0 incompleto';
  end if;
end $$;
select 'delta v4.0 ok';
