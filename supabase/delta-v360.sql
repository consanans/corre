-- delta v3.60 · os planos, pagos pelo Asaas
--
-- O Thales: "1 rede social de graça, 2 redes sociais 59,90, 3 redes sociais 69,90, 4 redes sociais ou mais 79,90;
-- Studio Houzi 29,90 por mês (30 dias de graça); Hórus 9,90 por mês (30 dias de graça); quero usar Asaas".
--
-- O que muda:
--   1. corre_assinaturas: um plano por pessoa e produto ('studio', 'houzi', 'horus'). Quem escreve é a função
--      "pagamento" (com a chave do servidor) e o teste grátis (corre_teste_garante); a pessoa só lê as dela.
--      teste_ate = até quando vale o teste grátis; pago_ate = até quando o que foi pago cobre (3 dias de folga).
--   2. corre_asaas_clientes (o cliente da pessoa no Asaas; o CPF/CNPJ fica só no Asaas) e corre_asaas_eventos (cada
--      aviso do Asaas uma vez só). Nenhuma das duas é lida pelo app.
--   3. corre_tem_acesso(dono, produto): o fundador sempre; senão, teste grátis valendo ou pago em dia.
--      corre_meu_acesso(): o resumo pro app. corre_teste_comeca(produto): começa os 30 dias (uma vez por pessoa).
--   4. Studio: as redes liberadas = 1 (ou o "redes" do perfil) ou o nível pago (2, 3; 4 = quantas quiser). O gatilho
--      corre_plano_rede, que já barrava a 2ª rede no grátis, passa a usar essa conta.
--   5. Hórus e Studio Houzi: lead novo e marca nova (ou mexida) só com acesso. O primeiro uso começa o teste sozinho
--      (vale pro site antigo também). Lead e marca que já existem continuam lá.
--
-- Pode rodar duas vezes.

begin;

-- 1. as assinaturas
create table if not exists public.corre_assinaturas (
  id               uuid primary key default gen_random_uuid(),
  dono             uuid not null references public.corre_perfis (id) on delete cascade,
  produto          text not null check (produto in ('studio', 'houzi', 'horus')),
  nivel            int not null default 1 check (nivel between 1 and 4),
  valor            numeric(10,2) not null default 0 check (valor >= 0 and valor < 1000),
  status           text not null default 'teste' check (status in ('teste', 'pendente', 'ativa', 'atrasada', 'cancelada')),
  teste_ate        timestamptz,
  pago_ate         date,
  asaas_assinatura text,
  link             text not null default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (dono, produto)
);
alter table public.corre_assinaturas enable row level security;
-- sem DROP: o conector do Supabase trava em comando que apaga (pede uma confirmação que não chega)
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'corre_assinaturas' and policyname = 'assinaturas: vejo as minhas') then
    create policy "assinaturas: vejo as minhas" on public.corre_assinaturas for select using (dono = auth.uid());
  end if;
end $$;
revoke all on public.corre_assinaturas from anon, authenticated;
grant select on public.corre_assinaturas to authenticated;

-- 2. o cliente no Asaas e os avisos já tratados (só a função lê e escreve)
create table if not exists public.corre_asaas_clientes (
  dono       uuid primary key references public.corre_perfis (id) on delete cascade,
  cliente    text not null,
  created_at timestamptz not null default now()
);
alter table public.corre_asaas_clientes enable row level security;
revoke all on public.corre_asaas_clientes from anon, authenticated;
create table if not exists public.corre_asaas_eventos (
  id          text primary key,
  tipo        text not null default '',
  recebido_em timestamptz not null default now()
);
alter table public.corre_asaas_eventos enable row level security;
revoke all on public.corre_asaas_eventos from anon, authenticated;

-- 3. quem tem acesso
create or replace function public.corre_fundador() returns uuid
language sql immutable as $$ select 'd1e9f6ac-f5d7-4723-8b02-eb0d1d7137b0'::uuid $$;

create or replace function public.corre_tem_acesso(p_dono uuid, p_produto text) returns boolean
language sql stable security definer set search_path = public as $$
  select p_dono = public.corre_fundador() or exists (
    select 1 from public.corre_assinaturas a
     where a.dono = p_dono and a.produto = p_produto
       and ((a.teste_ate is not null and a.teste_ate > now())
            or (a.pago_ate is not null and a.pago_ate + 3 >= (now() at time zone 'America/Sao_Paulo')::date)));
$$;
revoke all on function public.corre_tem_acesso(uuid, text) from public, anon, authenticated;

-- as redes do Studio: 1 de graça (ou o "redes" que o fundador der no perfil); pago, o nível (4 = quantas quiser)
create or replace function public.corre_redes_permitidas(p_dono uuid) returns int
language sql stable security definer set search_path = public as $$
  select case
    when p_dono = public.corre_fundador() or coalesce((select plano from public.corre_perfis where id = p_dono), 'gratis') = 'pro' then 999
    else greatest(
      coalesce((select redes from public.corre_perfis where id = p_dono), 1), 1,
      coalesce((select case when a.nivel >= 4 then 999 else a.nivel end from public.corre_assinaturas a
                 where a.dono = p_dono and a.produto = 'studio' and public.corre_tem_acesso(p_dono, 'studio')), 1))
  end;
$$;
revoke all on function public.corre_redes_permitidas(uuid) from public, anon, authenticated;

-- o teste grátis de 30 dias (Studio Houzi e Hórus): uma vez por pessoa, nunca recomeça
create or replace function public.corre_teste_garante(p_dono uuid, p_produto text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_dono is null or p_produto not in ('houzi', 'horus') then return; end if;
  if not exists (select 1 from public.corre_perfis where id = p_dono) then return; end if;
  insert into public.corre_assinaturas (dono, produto, status, teste_ate, valor)
  values (p_dono, p_produto, 'teste', now() + interval '30 days', case p_produto when 'houzi' then 29.90 else 9.90 end)
  on conflict (dono, produto) do nothing;
end $$;
revoke all on function public.corre_teste_garante(uuid, text) from public, anon, authenticated;

-- o resumo pro app: cada plano, se tem acesso, e as redes do Studio (liberadas e usadas)
create or replace function public.corre_meu_acesso() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null then null else jsonb_build_object(
    'fundador', auth.uid() = public.corre_fundador(),
    'redes', public.corre_redes_permitidas(auth.uid()),
    'usadas', (select count(*) from public.corre_portfolio p where p.dono = auth.uid() and coalesce(p.rede, '') <> ''),
    /* já tem cadastro no Asaas: o app não pede nome e CPF/CNPJ de novo */
    'cliente', exists (select 1 from public.corre_asaas_clientes c where c.dono = auth.uid()),
    'planos', coalesce((select jsonb_object_agg(a.produto, jsonb_build_object('status', a.status, 'nivel', a.nivel, 'valor', a.valor,
        'teste_ate', a.teste_ate, 'pago_ate', a.pago_ate, 'link', a.link, 'assinado', a.asaas_assinatura is not null,
        'acesso', public.corre_tem_acesso(a.dono, a.produto)))
      from public.corre_assinaturas a where a.dono = auth.uid()), '{}'::jsonb),
    'acesso', jsonb_build_object('studio', true, 'houzi', public.corre_tem_acesso(auth.uid(), 'houzi'), 'horus', public.corre_tem_acesso(auth.uid(), 'horus'))
  ) end;
$$;
revoke all on function public.corre_meu_acesso() from public, anon;
grant execute on function public.corre_meu_acesso() to authenticated;

create or replace function public.corre_teste_comeca(p_produto text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'login' using hint = 'login'; end if;
  perform public.corre_teste_garante(auth.uid(), p_produto);
  return public.corre_meu_acesso();
end $$;
revoke all on function public.corre_teste_comeca(text) from public, anon;
grant execute on function public.corre_teste_comeca(text) to authenticated;

-- 4. o limite de redes do Studio (o gatilho que já existia, agora pela conta do plano)
create or replace function public.corre_plano_rede() returns trigger
language plpgsql security definer set search_path = public as $$
declare lim int;
begin
  if tg_op = 'UPDATE' and new.rede is not distinct from old.rede then return new; end if;  -- só confere quando liga/troca a rede
  if coalesce(new.rede, '') = '' then return new; end if;
  lim := public.corre_redes_permitidas(new.dono);
  if (select count(*) from public.corre_portfolio p where p.dono = new.dono and coalesce(p.rede, '') <> '' and p.id <> new.id) >= lim then
    raise exception 'limite de % rede(s) social(is) do plano', lim using errcode = 'P0001', hint = 'plano_gratis';
  end if;
  return new;
end $$;
revoke all on function public.corre_plano_rede() from public, anon, authenticated;

-- 5. o Hórus e o Studio Houzi: o primeiro uso começa o teste; acabou o teste sem pagar, não cria nem mexe.
--    Quem não é a pessoa (a função do servidor, o painel) passa direto.
create or replace function public.corre_horus_plano() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(), '') not in ('anon', 'authenticated') then return new; end if;
  perform public.corre_teste_garante(new.dono, 'horus');
  if not public.corre_tem_acesso(new.dono, 'horus') then
    raise exception 'o teste grátis do Hórus acabou' using errcode = 'P0001', hint = 'horus_assinatura';
  end if;
  return new;
end $$;
revoke all on function public.corre_horus_plano() from public, anon, authenticated;
create or replace trigger corre_leads_plano before insert on public.corre_leads for each row execute function public.corre_horus_plano();

create or replace function public.corre_houzi_plano() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(), '') not in ('anon', 'authenticated') then return new; end if;
  /* publicar, despublicar e apagar seguem livres: o que trava é criar e mexer na marca */
  if tg_op = 'UPDATE' and new.nome is not distinct from old.nome and new.spec is not distinct from old.spec
     and new.voz is not distinct from old.voz and new.naming is not distinct from old.naming then return new; end if;
  perform public.corre_teste_garante(new.dono, 'houzi');
  if not public.corre_tem_acesso(new.dono, 'houzi') then
    raise exception 'o teste grátis do Studio Houzi acabou' using errcode = 'P0001', hint = 'houzi_assinatura';
  end if;
  return new;
end $$;
revoke all on function public.corre_houzi_plano() from public, anon, authenticated;
create or replace trigger corre_houzi_plano before insert or update on public.corre_houzi_marcas for each row execute function public.corre_houzi_plano();

commit;

select 'delta v3.60 ok';
