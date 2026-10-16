-- CORRE · delta v3.66: a loja de skins do Correverso (16/10/2026)
-- O Thales: "coloca muitas skins fabulosas para serem compradas". São 18 uniformes novos, pagos em correal (a moeda do
-- Correverso, que não é dinheiro): estilo 0,30, raro 0,60 e lendário 1,00. Nenhum passa de 1, porque a linha do
-- extrato (corre_correal_log) tem trava de -1 a 1. Comprou, é teu pra sempre. Os 14 uniformes de antes seguem de graça.
-- O que entra:
--   corre_skins             o que cada pessoa comprou (uma linha por skin). A pessoa só lê as dela; ninguém escreve
--                           direto: quem grava é a corre_skin_compra.
--   corre_skins_loja()      a vitrine: cada skin paga e o preço dela. É o único lugar com preço (o app só mostra).
--   corre_skin_preco(k)     o preço de uma skin (null = não é da loja: os uniformes de graça e qualquer outra coisa).
--   corre_skin_compra(k)    compra pelo login: desconta o correal com o mesmo cadeado da carteira, anota no extrato
--                           ("skin:k") e guarda a skin. Já tinha: não cobra de novo. Saldo curto: não mexe em nada.
--   corre_skins_minhas()    o que o app lê: as compradas, os preços e o saldo.
--   gatilho corre_perfis_skin   quem salva o avatar (corre_perfis.verso) com uma skin paga que não comprou fica sem
--                           uniforme (o resto do avatar salva normal). O servidor (função, painel) passa direto.
-- Sem DROP (o conector do Supabase trava nele). Pode rodar duas vezes.
-- Pra rodar: SQL Editor do Supabase, colar o arquivo inteiro, Run. No fim aparece "delta v3.66 ok".

begin;

-- 1) O QUE CADA UM COMPROU
create table if not exists public.corre_skins (
  dono       uuid not null references public.corre_perfis (id) on delete cascade,
  skin       text not null check (char_length(skin) between 1 and 30),
  preco      numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  primary key (dono, skin)
);
alter table public.corre_skins enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'corre_skins' and policyname = 'skins: vejo as minhas') then
    create policy "skins: vejo as minhas" on public.corre_skins for select using (dono = auth.uid());
  end if;
end $$;
-- tabela nova ganha tudo pra anon e authenticated pelos padrões do Supabase: aqui só a leitura (e a RLS acima) fica
revoke all on public.corre_skins from anon, authenticated;
grant select on public.corre_skins to authenticated;
revoke truncate, references, trigger on public.corre_skins from service_role;

-- 2) A VITRINE E O PREÇO (qualquer um lê: são só números)
create or replace function public.corre_skins_loja() returns table (skin text, preco numeric)
language sql immutable set search_path = public as $$
  select t.skin, t.preco::numeric from (values
    ('farao', 1.00), ('diva', 1.00), ('carnaval', 1.00), ('samurai', 1.00), ('cavaleiro', 1.00), ('galaxia', 1.00),
    ('cangaceiro', 0.60), ('peao', 0.60), ('mc', 0.60), ('mago', 0.60), ('vampiro', 0.60), ('anjo', 0.60), ('luchador', 0.60), ('fada', 0.60),
    ('capeta', 0.30), ('mumia', 0.30), ('piloto', 0.30), ('rockeiro', 0.30)
  ) as t(skin, preco) $$;
create or replace function public.corre_skin_preco(p_skin text) returns numeric
language sql immutable set search_path = public as $$
  select l.preco from public.corre_skins_loja() l where l.skin = p_skin $$;
revoke all on function public.corre_skins_loja(), public.corre_skin_preco(text) from public, anon, authenticated, service_role;
grant execute on function public.corre_skins_loja(), public.corre_skin_preco(text) to public;

-- 3) COMPRAR (pelo login de quem compra). O cadeado é o mesmo da corre_correal_gasta: duas compras ao mesmo tempo
-- (ou uma compra e um voo) não gastam o mesmo saldo duas vezes
create or replace function public.corre_skin_compra(p_skin text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); p numeric := public.corre_skin_preco(p_skin); s numeric;
begin
  if u is null or p is null then return jsonb_build_object('ok', false, 'saldo', 0, 'preco', p); end if;
  perform pg_advisory_xact_lock(hashtext('correal:' || u::text));
  if exists (select 1 from public.corre_skins where dono = u and skin = p_skin) then
    select saldo into s from public.corre_correal where dono = u;
    return jsonb_build_object('ok', true, 'ja', true, 'saldo', coalesce(s, 0), 'preco', p);
  end if;
  select saldo into s from public.corre_correal where dono = u for update;
  if coalesce(s, 0) < p then return jsonb_build_object('ok', false, 'saldo', coalesce(s, 0), 'preco', p); end if;
  update public.corre_correal set saldo = saldo - p, gasto = gasto + p, updated_at = now() where dono = u returning saldo into s;
  insert into public.corre_correal_log (dono, valor, motivo) values (u, -p, 'skin:' || p_skin);
  insert into public.corre_skins (dono, skin, preco) values (u, p_skin, p);
  return jsonb_build_object('ok', true, 'saldo', s, 'preco', p);
end $$;

-- 4) O QUE O APP LÊ
create or replace function public.corre_skins_minhas() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare u uuid := auth.uid();
begin
  return jsonb_build_object(
    'minhas', coalesce((select jsonb_agg(s.skin order by s.created_at) from public.corre_skins s where s.dono = u), '[]'::jsonb),
    'precos', (select jsonb_object_agg(l.skin, l.preco) from public.corre_skins_loja() l),
    'saldo', coalesce((select c.saldo from public.corre_correal c where c.dono = u), 0));
end $$;
revoke all on function public.corre_skin_compra(text), public.corre_skins_minhas() from public, anon, authenticated, service_role;
grant execute on function public.corre_skin_compra(text), public.corre_skins_minhas() to authenticated;

-- 5) A TRAVA DO AVATAR: skin paga só pra quem comprou
create or replace function public.corre_perfil_skin() returns trigger
language plpgsql security definer set search_path = public as $$
declare k text;
begin
  if coalesce(auth.role(), '') not in ('anon', 'authenticated') then return new; end if;
  if new.verso is null or jsonb_typeof(new.verso) <> 'object' then return new; end if;
  k := new.verso ->> 'skin';
  if k is null or public.corre_skin_preco(k) is null then return new; end if;
  if exists (select 1 from public.corre_skins s where s.dono = new.id and s.skin = k) then return new; end if;
  new.verso := jsonb_set(new.verso, '{skin}', '""'::jsonb);
  return new;
end $$;
revoke all on function public.corre_perfil_skin() from public, anon, authenticated;
create or replace trigger corre_perfis_skin before insert or update of verso on public.corre_perfis
  for each row execute function public.corre_perfil_skin();

commit;

select case when public.corre_skin_preco('farao') = 1.00 and public.corre_skin_preco('mc') = 0.60 and public.corre_skin_preco('mumia') = 0.30
  and public.corre_skin_preco('policial') is null and (select count(*) from public.corre_skins_loja()) = 18
  and exists (select 1 from pg_trigger where tgname = 'corre_perfis_skin')
  then 'delta v3.66 ok' else 'NÃO TERMINOU: a loja não bateu' end as resultado;
