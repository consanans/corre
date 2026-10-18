-- delta v3.80 · os donos do Corre: quem tem, nas ferramentas pagas, o mesmo acesso do fundador
--
-- O Thales: "dê acesso de dono para o jeydiaz". Até aqui só o fundador (corre_fundador()) tinha tudo liberado sem
-- pagar: Studio com quantas redes quiser, Studio Houzi e Hórus. Agora quem está em corre_donos também tem.
-- O que continua SÓ do fundador (por id, de propósito): ligar o Asaas (a função pagamento confere), a casa loft e o
-- "todo mundo segue o @consanans".
--
-- 1. corre_donos (dono, desde, obs): o app não lê nem escreve (RLS sem política); quem põe e tira é o Thales, pelo
--    SQL Editor ou pelo conector.
-- 2. corre_eh_dono(p): o fundador ou quem está na lista.
-- 3. corre_tem_acesso, corre_redes_permitidas e corre_meu_acesso: o mesmo de antes, com o dono no lugar do fundador.
--    O resumo do app ganha 'dono' (o 'fundador' segue dizendo só o fundador).
--
-- Precisa do v3.60 antes (confere sozinho). Pode rodar duas vezes. Sem DROP.

begin;

do $$ begin
  if to_regprocedure('public.corre_tem_acesso(uuid, text)') is null or to_regprocedure('public.corre_meu_acesso()') is null then
    raise exception 'falta o delta-v360.sql (os planos) antes deste';
  end if;
end $$;

-- 1) A LISTA
create table if not exists public.corre_donos (
  dono uuid primary key references public.corre_perfis(id) on delete cascade,
  desde timestamptz not null default now(),
  obs text not null default ''
);
alter table public.corre_donos enable row level security;
revoke all on public.corre_donos from anon, authenticated;

-- 2) QUEM É DONO
create or replace function public.corre_eh_dono(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p is not null and (p = public.corre_fundador() or exists (select 1 from public.corre_donos d where d.dono = p));
$$;
revoke all on function public.corre_eh_dono(uuid) from public, anon, authenticated;

-- 3) O ACESSO: o dono no lugar do fundador
create or replace function public.corre_tem_acesso(p_dono uuid, p_produto text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.corre_eh_dono(p_dono) or exists (
    select 1 from public.corre_assinaturas a
     where a.dono = p_dono and a.produto = p_produto
       and ((a.teste_ate is not null and a.teste_ate > now())
            or (a.pago_ate is not null and a.pago_ate + 3 >= (now() at time zone 'America/Sao_Paulo')::date)));
$$;
revoke all on function public.corre_tem_acesso(uuid, text) from public, anon, authenticated;

create or replace function public.corre_redes_permitidas(p_dono uuid) returns int
language sql stable security definer set search_path = public as $$
  select case
    when public.corre_eh_dono(p_dono) or coalesce((select plano from public.corre_perfis where id = p_dono), 'gratis') = 'pro' then 999
    else greatest(
      coalesce((select redes from public.corre_perfis where id = p_dono), 1), 1,
      coalesce((select case when a.nivel >= 4 then 999 else a.nivel end from public.corre_assinaturas a
                 where a.dono = p_dono and a.produto = 'studio' and public.corre_tem_acesso(p_dono, 'studio')), 1))
  end;
$$;
revoke all on function public.corre_redes_permitidas(uuid) from public, anon, authenticated;

create or replace function public.corre_meu_acesso() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null then null else jsonb_build_object(
    'fundador', auth.uid() = public.corre_fundador(),
    /* v3.80: dono tem tudo liberado, como o fundador (o app mostra "Dono: liberado, sem pagar") */
    'dono', public.corre_eh_dono(auth.uid()),
    'redes', public.corre_redes_permitidas(auth.uid()),
    'usadas', (select count(*) from public.corre_portfolio p where p.dono = auth.uid() and coalesce(p.rede, '') <> ''),
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

commit;

select case when to_regclass('public.corre_donos') is not null
  and not has_table_privilege('authenticated', 'public.corre_donos', 'select')
  and not has_table_privilege('anon', 'public.corre_donos', 'select')
  and not has_function_privilege('authenticated', 'public.corre_eh_dono(uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.corre_meu_acesso()', 'execute')
  and public.corre_eh_dono(public.corre_fundador())
  then 'delta v3.80 ok' else 'NÃO TERMINOU: os donos não ficaram certos' end as resultado;
