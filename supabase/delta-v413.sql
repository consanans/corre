-- v4.13 · AS SKINS DE HALLOWEEN EM REAL.
-- O Thales: "quero que você adicione valor de real de verdade nas novas skins de Halloween". As 8 da coleção de
-- Halloween (v3.91) saem do correal e passam a ser vendidas só em real, pagamento único, pelo Asaas (Pix ou cartão):
--   Cabeça de Abóbora e Saci R$ 14,90 · Bruxa do Caldeirão, Esqueleto e Lobisomem do Tibagi R$ 9,90 ·
--   Fantasma de Lençol, Morto-Vivo e Gato Preto R$ 5,90.
-- Quem já comprou alguma com correal continua com ela. As outras 18 do Ateliê seguem no correal. O correal continua NÃO
-- sendo dinheiro: ninguém compra correal com real, e real nunca vira correal.
-- O que entra:
--   corre_skins_reais(), corre_skin_real(k)   o preço em real de cada uma (o único lugar; a função "pagamento" lê daqui)
--   corre_skin_pedidos      cada compra em real: a skin, o valor, Pix ou cartão, a cobrança no Asaas, a situação
--                           (pendente, paga, estornada, cancelada) e a versão dos Termos que a pessoa aceitou (a prova
--                           do combinado). A pessoa lê os dela; quem escreve é a função, pelas funções daqui.
--   corre_skins             ganha "pago_real" (o que foi pago em real) e "pedido" (de qual compra veio)
--   corre_skin_compra       recusa as de real (motivo 'real'); o resto igual à v3.66
--   corre_skins_minhas      mais 'reais' (os preços) e 'pedidos' (as compras em real dos últimos 40 dias, com o link
--                           da fatura em aberto e se ainda dá pra desistir)
--   do servidor (só a chave de serviço): corre_skin_pode, corre_skin_pedido_novo, corre_skin_paga (o pagamento caiu: a
--   skin é da pessoa), corre_skin_volta (o dinheiro voltou: a skin sai, e sai do avatar), corre_skin_cai (a fatura
--   venceu sem pagar), corre_skin_abertos e corre_skin_pedido_ver.
-- A época (só se vende de 1º/10 até Finados) a função confere; comprou, é da pessoa o ano inteiro.
--
-- Precisa do v3.66 (a loja), do v3.91 (a coleção de Halloween) e do v3.60 (o Asaas) antes; confere sozinho.
-- Pode rodar duas vezes. Sem DROP. Site antigo com o delta: as 8 deixam de ser vendidas por correal ("não tá à venda").
-- Pra rodar: SQL Editor do Supabase, colar o arquivo inteiro, Run. No fim aparece "delta v4.13 ok".
begin;

do $$
begin
  if to_regprocedure('public.corre_skin_compra(text)') is null or public.corre_skin_preco('abobora') is null then
    raise exception 'o delta v4.13 precisa do v3.66 e do v3.91 antes (a loja e a coleção de Halloween)';
  end if;
  if to_regclass('public.corre_asaas_clientes') is null then
    raise exception 'o delta v4.13 precisa do v3.60 antes (o Asaas)';
  end if;
end $$;

-- 1) O PREÇO EM REAL (qualquer um lê: são só números)
create or replace function public.corre_skins_reais() returns table (skin text, reais numeric)
language sql immutable set search_path = public as $$
  select t.skin, t.reais::numeric from (values
    ('abobora', 14.90), ('saci', 14.90),
    ('bruxa', 9.90), ('esqueleto', 9.90), ('lobisomem', 9.90),
    ('lencol', 5.90), ('mortovivo', 5.90), ('gatopreto', 5.90)
  ) as t(skin, reais) $$;
create or replace function public.corre_skin_real(p_skin text) returns numeric
language sql immutable set search_path = public as $$
  select r.reais from public.corre_skins_reais() r where r.skin = p_skin $$;
revoke all on function public.corre_skins_reais(), public.corre_skin_real(text) from public, anon, authenticated, service_role;
grant execute on function public.corre_skins_reais(), public.corre_skin_real(text) to public;

-- 2) AS COMPRAS EM REAL
create table if not exists public.corre_skin_pedidos (
  id             uuid primary key default gen_random_uuid(),
  dono           uuid not null references public.corre_perfis (id) on delete cascade,
  skin           text not null check (char_length(skin) between 1 and 30),
  valor          numeric(10,2) not null check (valor > 0 and valor < 1000),
  forma          text not null check (forma in ('pix', 'cartao')),
  status         text not null default 'pendente' check (status in ('pendente', 'paga', 'estornada', 'cancelada')),
  asaas_cobranca text not null unique,
  link           text not null default '',
  termos         text not null check (termos ~ '^\d{4}-\d{2}-\d{2}$'),
  criado         timestamptz not null default now(),
  pago_em        timestamptz,
  desistiu_em    timestamptz,
  atualizado     timestamptz not null default now()
);
create index if not exists corre_skin_pedidos_dono on public.corre_skin_pedidos (dono, criado desc);
alter table public.corre_skin_pedidos enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'corre_skin_pedidos' and policyname = 'pedidos de skin: vejo os meus') then
    create policy "pedidos de skin: vejo os meus" on public.corre_skin_pedidos for select using (dono = auth.uid());
  end if;
end $$;
-- a pessoa só lê; ninguém do app escreve. A função escreve pelas funções abaixo (que rodam como dono do banco), então o
-- service_role não precisa de nada na tabela
revoke all on public.corre_skin_pedidos from anon, authenticated;
grant select on public.corre_skin_pedidos to authenticated;
revoke truncate, references, trigger on public.corre_skin_pedidos from service_role;

alter table public.corre_skins add column if not exists pago_real numeric(10,2);
alter table public.corre_skins add column if not exists pedido uuid;

-- 3) O CORREAL NÃO COMPRA AS DE REAL (o resto igual à v3.66: o mesmo cadeado da carteira, já tinha não cobra)
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
  -- v4.13: as de Halloween são só em real ('preco' null: o site antigo diz que não tá à venda)
  if public.corre_skin_real(p_skin) is not null then
    select saldo into s from public.corre_correal where dono = u;
    return jsonb_build_object('ok', false, 'motivo', 'real', 'real', public.corre_skin_real(p_skin), 'saldo', coalesce(s, 0), 'preco', null);
  end if;
  select saldo into s from public.corre_correal where dono = u for update;
  if coalesce(s, 0) < p then return jsonb_build_object('ok', false, 'saldo', coalesce(s, 0), 'preco', p); end if;
  update public.corre_correal set saldo = saldo - p, gasto = gasto + p, updated_at = now() where dono = u returning saldo into s;
  insert into public.corre_correal_log (dono, valor, motivo) values (u, -p, 'skin:' || p_skin);
  insert into public.corre_skins (dono, skin, preco) values (u, p_skin, p);
  return jsonb_build_object('ok', true, 'saldo', s, 'preco', p);
end $$;

-- 4) O QUE O APP LÊ: o de antes, mais os preços em real e as compras em real (o link só da que tá esperando o
-- pagamento; "desiste" diz até quando dá pra desistir com devolução, 7 dias do pagamento)
create or replace function public.corre_skins_minhas() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare u uuid := auth.uid();
begin
  return jsonb_build_object(
    'minhas', coalesce((select jsonb_agg(s.skin order by s.created_at) from public.corre_skins s where s.dono = u), '[]'::jsonb),
    'precos', (select jsonb_object_agg(l.skin, l.preco) from public.corre_skins_loja() l),
    'reais', (select jsonb_object_agg(r.skin, r.reais) from public.corre_skins_reais() r),
    'pedidos', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'skin', p.skin, 'valor', p.valor, 'forma', p.forma, 'status', p.status,
        'link', case when p.status = 'pendente' then p.link else '' end, 'criado', p.criado, 'pago_em', p.pago_em, 'desistiu_em', p.desistiu_em,
        'desiste', case when p.status = 'paga' and p.desistiu_em is null
                          and (p.pago_em at time zone 'America/Sao_Paulo')::date + 7 >= (now() at time zone 'America/Sao_Paulo')::date
                        then ((p.pago_em at time zone 'America/Sao_Paulo')::date + 7)::text end) order by p.criado desc)
      from public.corre_skin_pedidos p where p.dono = u and p.criado > now() - interval '40 days'), '[]'::jsonb),
    'saldo', coalesce((select c.saldo from public.corre_correal c where c.dono = u), 0));
end $$;
revoke all on function public.corre_skin_compra(text), public.corre_skins_minhas() from public, anon, authenticated, service_role;
grant execute on function public.corre_skin_compra(text), public.corre_skins_minhas() to authenticated;

-- 5) O SERVIDOR (só a função "pagamento", com a chave de serviço)
-- dá pra comprar? o preço, se já tem, e a compra que tá esperando pagamento (pra não abrir duas faturas)
create or replace function public.corre_skin_pode(p_dono uuid, p_skin text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('real', public.corre_skin_real(p_skin),
    'ja', exists (select 1 from public.corre_skins s where s.dono = p_dono and s.skin = p_skin),
    'pendente', (select jsonb_build_object('id', p.id, 'cobranca', p.asaas_cobranca, 'forma', p.forma, 'link', p.link, 'criado', p.criado)
                   from public.corre_skin_pedidos p where p.dono = p_dono and p.skin = p_skin and p.status = 'pendente' order by p.criado desc limit 1)) $$;
-- a compra nova (o valor é sempre o daqui; as pendentes da mesma skin, que a função já apagou no Asaas, viram cancelada)
create or replace function public.corre_skin_pedido_novo(p_dono uuid, p_skin text, p_forma text, p_cobranca text, p_link text, p_termos text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v numeric := public.corre_skin_real(p_skin); i uuid;
begin
  if v is null then return jsonb_build_object('ok', false, 'motivo', 'skin'); end if;
  update public.corre_skin_pedidos set status = 'cancelada', link = '', atualizado = now() where dono = p_dono and skin = p_skin and status = 'pendente';
  insert into public.corre_skin_pedidos (dono, skin, valor, forma, asaas_cobranca, link, termos)
    values (p_dono, p_skin, v, p_forma, p_cobranca, coalesce(p_link, ''), p_termos) returning id into i;
  return jsonb_build_object('ok', true, 'id', i, 'valor', v);
end $$;
-- pagou: a skin é da pessoa (uma vez só; pagamento menor que o pedido não libera; o que foi estornado não volta)
create or replace function public.corre_skin_paga(p_cobranca text, p_valor numeric) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p public.corre_skin_pedidos%rowtype;
begin
  select * into p from public.corre_skin_pedidos where asaas_cobranca = p_cobranca for update;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'sem_pedido'); end if;
  if p.status = 'paga' then return jsonb_build_object('ok', true, 'ja', true, 'dono', p.dono, 'skin', p.skin); end if;
  if p.status = 'estornada' then return jsonb_build_object('ok', false, 'motivo', 'estornada'); end if;
  if coalesce(p_valor, 0) < p.valor - 0.005 then return jsonb_build_object('ok', false, 'motivo', 'valor'); end if;
  update public.corre_skin_pedidos set status = 'paga', pago_em = now(), link = '', atualizado = now() where id = p.id;
  insert into public.corre_skins (dono, skin, preco, pago_real, pedido) values (p.dono, p.skin, 0, p.valor, p.id)
    on conflict (dono, skin) do update set pago_real = excluded.pago_real, pedido = excluded.pedido;
  return jsonb_build_object('ok', true, 'dono', p.dono, 'skin', p.skin);
end $$;
-- o dinheiro voltou (desistência, estorno ou contestação no cartão): a skin sai, e sai do avatar se tava vestindo
create or replace function public.corre_skin_volta(p_cobranca text, p_desistiu boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p public.corre_skin_pedidos%rowtype;
begin
  select * into p from public.corre_skin_pedidos where asaas_cobranca = p_cobranca for update;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'sem_pedido'); end if;
  update public.corre_skin_pedidos set status = 'estornada', link = '', atualizado = now(),
    desistiu_em = case when coalesce(p_desistiu, false) then coalesce(desistiu_em, now()) else desistiu_em end where id = p.id;
  delete from public.corre_skins where dono = p.dono and skin = p.skin and pedido = p.id;
  if not exists (select 1 from public.corre_skins where dono = p.dono and skin = p.skin) then
    update public.corre_perfis set verso = jsonb_set(verso, '{skin}', '""'::jsonb)
     where id = p.dono and jsonb_typeof(verso) = 'object' and verso ->> 'skin' = p.skin;
  end if;
  return jsonb_build_object('ok', true, 'dono', p.dono, 'skin', p.skin);
end $$;
-- a fatura venceu (ou sumiu) sem pagar
create or replace function public.corre_skin_cai(p_cobranca text) returns jsonb
language sql security definer set search_path = public as $$
  with m as (update public.corre_skin_pedidos set status = 'cancelada', link = '', atualizado = now()
              where asaas_cobranca = p_cobranca and status = 'pendente' returning id)
  select jsonb_build_object('ok', true, 'mudou', exists (select 1 from m)) $$;
-- as que esperam pagamento (pra conferir no Asaas quando o aviso não chegou) e uma compra da pessoa
create or replace function public.corre_skin_abertos(p_dono uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'skin', p.skin, 'cobranca', p.asaas_cobranca, 'valor', p.valor)), '[]'::jsonb)
    from public.corre_skin_pedidos p where p.dono = p_dono and p.status = 'pendente' and p.criado > now() - interval '3 days' $$;
create or replace function public.corre_skin_pedido_ver(p_dono uuid, p_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(p) from public.corre_skin_pedidos p where p.dono = p_dono and p.id = p_id $$;
revoke all on function public.corre_skin_pode(uuid, text), public.corre_skin_pedido_novo(uuid, text, text, text, text, text), public.corre_skin_paga(text, numeric),
  public.corre_skin_volta(text, boolean), public.corre_skin_cai(text), public.corre_skin_abertos(uuid), public.corre_skin_pedido_ver(uuid, uuid) from public, anon, authenticated;
grant execute on function public.corre_skin_pode(uuid, text), public.corre_skin_pedido_novo(uuid, text, text, text, text, text), public.corre_skin_paga(text, numeric),
  public.corre_skin_volta(text, boolean), public.corre_skin_cai(text), public.corre_skin_abertos(uuid), public.corre_skin_pedido_ver(uuid, uuid) to service_role;

commit;

select case when public.corre_skin_real('abobora') = 14.90 and public.corre_skin_real('saci') = 14.90 and public.corre_skin_real('bruxa') = 9.90
             and public.corre_skin_real('lencol') = 5.90 and public.corre_skin_real('farao') is null and (select count(*) from public.corre_skins_reais()) = 8
             and to_regclass('public.corre_skin_pedidos') is not null
             and has_function_privilege('service_role', 'public.corre_skin_paga(text, numeric)', 'execute')
             and not has_function_privilege('authenticated', 'public.corre_skin_paga(text, numeric)', 'execute')
             and position('motivo'', ''real' in (select prosrc from pg_proc where oid = 'public.corre_skin_compra(text)'::regprocedure)) > 0
            then 'delta v4.13 ok' else 'delta v4.13 NÃO TERMINOU: rode o arquivo inteiro de novo.' end as status;
