-- CORRE · delta v5.0: Londrina no Google (o Thales escolheu: "Londrina no Google").
-- As páginas abertas app.corresocial.com/londrina/<ramo>/ mostram quem faz cada coisa na cidade, os pedidos abertos do
-- Mural e o formulário de pedido sem conta. Elas são geradas antes do zip (ferramentas/seo/gera.mjs) com estas funções e
-- se atualizam sozinhas no navegador de quem abre.
-- Quem aparece: só quem LIGOU "Aparecer no Google" (no_google, desligado pra todo mundo de início: o perfil já é público
-- dentro do Corre, mas ir pro Google é outra coisa e a pessoa escolhe), não está desbaratinado e disse o ramo. Sai só o
-- que já é público no perfil: nome, @, o que faz, a cidade, a foto e até 3 itens da vitrine.
-- Pode rodar duas vezes. Sem DROP. Precisa da v4.02 (corre_ve_lojinha) e do Mural (corre_mural).

-- 1. a escolha
alter table public.corre_perfis add column if not exists no_google boolean not null default false;

-- 2. a cidade sem acento, sem estado e em minúscula: "Londrina/pr", "Londrina, PR" e "londrina" são a mesma
create or replace function public.corre_seo_cidade(t text) returns text language sql immutable as $$
  select btrim(translate(lower(split_part(split_part(coalesce(t, ''), '/', 1), ',', 1)),
    'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'))
$$;

-- 3. o que as páginas mostram: quem ligou (os da cidade primeiro; os de fora vêm marcados, a página decide se mostra) e
-- os pedidos abertos do Mural da cidade e os que podem ser à distância (sem nome, sem WhatsApp: só o que já é público
-- no Mural)
create or replace function public.corre_seo_vitrine(p_cidade text default 'Londrina') returns jsonb
language sql stable security definer set search_path = public as $$
  with alvo as (select public.corre_seo_cidade(p_cidade) k),
  gente as (
    select p.id, p.handle, left(coalesce(p.nome, ''), 80) nome, left(btrim(coalesce(p.faz, '')), 140) faz, p.categoria,
      left(btrim(coalesce(p.cidade, '')), 60) cidade, public.corre_seo_cidade(p.cidade) = (select k from alvo) aqui,
      case when p.avatar_url ~ '^https://[A-Za-z0-9.-]+/' then p.avatar_url end avatar,
      left(btrim(coalesce(p.bio, '')), 220) bio, p.created_at
    from public.corre_perfis p
    where p.no_google and not coalesce(p.desbaratinado, false) and coalesce(p.visibilidade, 'publico') = 'publico'
      and coalesce(p.categoria, '') not in ('', 'outros')
      and (btrim(coalesce(p.faz, '')) <> '' or btrim(coalesce(p.bio, '')) <> '')
      and coalesce(p.handle, '') ~ '^[a-z0-9_.]{3,24}$'
  )
  select jsonb_build_object(
    'cidade', p_cidade,
    'gente', coalesce((select jsonb_agg(jsonb_build_object('handle', g.handle, 'nome', g.nome, 'faz', g.faz, 'categoria', g.categoria,
        'cidade', g.cidade, 'aqui', g.aqui, 'avatar', g.avatar, 'bio', g.bio,
        'itens', coalesce((select jsonb_agg(jsonb_build_object('nome', left(x.nome, 80), 'preco', x.preco, 'unidade', left(coalesce(x.unidade, ''), 20)))
          from (select pr.nome, pr.preco, pr.unidade from public.corre_produtos pr
                where pr.dono = g.id and coalesce(pr.publico, false) and btrim(coalesce(pr.nome, '')) <> ''
                order by pr.ordem nulls last, pr.created_at limit 3) x), '[]'::jsonb))
      order by g.aqui desc, g.created_at) from gente g), '[]'::jsonb),
    'pedidos', coalesce((select jsonb_agg(jsonb_build_object('codigo', m.codigo, 'categoria', m.categoria, 'titulo', left(m.titulo, 90),
        'quando', m.quando, 'remoto', m.remoto, 'em', m.created_at) order by m.created_at desc)
      from (select * from public.corre_mural m
            where m.st = 'aberto' and m.expira_em > now()
              and (public.corre_seo_cidade(m.cidade) = (select k from alvo) or coalesce(m.remoto, false))
            order by m.created_at desc limit 60) m), '[]'::jsonb),
    'em', now())
$$;
revoke all on function public.corre_seo_vitrine(text) from public;
grant execute on function public.corre_seo_vitrine(text) to anon, authenticated;

-- 4. quantos abriram cada página e quantos tocaram em quê (ver, pedido, perfil, entrar). Só a conta do dia, sem saber
-- quem: ninguém do app lê a tabela; os donos veem os números na Lojinha
create table if not exists public.corre_seo_conta (
  dia date not null, pagina text not null, tipo text not null, n integer not null default 0,
  primary key (dia, pagina, tipo));
alter table public.corre_seo_conta enable row level security;
revoke all on public.corre_seo_conta from anon, authenticated;

create or replace function public.corre_seo_marca(p_pagina text, p_tipo text) returns void
language plpgsql security definer set search_path = public as $$
declare hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if p_pagina is null or p_pagina !~ '^/[a-z0-9/-]{1,80}$' or p_tipo is null or p_tipo not in ('ver', 'pedido', 'perfil', 'entrar') then return; end if;
  -- uma conexão não infla a conta: 60 por hora, 300 por dia (sem o registro das cotas, segue sem)
  if to_regprocedure('public.corre_ip_cota(text,integer,integer)') is not null then
    if not public.corre_ip_cota('seo', 60, 300) then return; end if;
  end if;
  if not exists (select 1 from public.corre_seo_conta where dia = hoje and pagina = p_pagina and tipo = p_tipo)
     and (select count(*) from public.corre_seo_conta where dia = hoje) >= 400 then return; end if;
  insert into public.corre_seo_conta as c (dia, pagina, tipo, n) values (hoje, p_pagina, p_tipo, 1)
    on conflict (dia, pagina, tipo) do update set n = least(c.n + 1, 1000000);
end $$;
revoke all on function public.corre_seo_marca(text, text) from public;
grant execute on function public.corre_seo_marca(text, text) to anon, authenticated;

-- 5. os números pros donos (a Lojinha): por página, nos últimos N dias, e quantos ligaram o Google
create or replace function public.corre_seo_numeros(p_dias integer default 30) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare d int := greatest(1, least(coalesce(p_dias, 30), 120)); desde date := (now() at time zone 'America/Sao_Paulo')::date - (d - 1);
begin
  if auth.uid() is null or not public.corre_ve_lojinha(auth.uid()) then raise exception 'so_dono' using hint = 'so_dono'; end if;
  return jsonb_build_object(
    'dias', d,
    'ligaram', (select count(*) from public.corre_perfis where no_google),
    'aparecem', (select count(*) from public.corre_perfis p where p.no_google and not coalesce(p.desbaratinado, false)
                   and coalesce(p.categoria, '') not in ('', 'outros') and (btrim(coalesce(p.faz, '')) <> '' or btrim(coalesce(p.bio, '')) <> '')),
    'total', (select jsonb_build_object('ver', coalesce(sum(n) filter (where tipo = 'ver'), 0), 'pedido', coalesce(sum(n) filter (where tipo = 'pedido'), 0),
                'perfil', coalesce(sum(n) filter (where tipo = 'perfil'), 0), 'entrar', coalesce(sum(n) filter (where tipo = 'entrar'), 0))
              from public.corre_seo_conta where dia >= desde),
    'paginas', coalesce((select jsonb_agg(x order by (x->>'ver')::int desc) from (
      select jsonb_build_object('pagina', pagina, 'ver', coalesce(sum(n) filter (where tipo = 'ver'), 0), 'pedido', coalesce(sum(n) filter (where tipo = 'pedido'), 0),
        'perfil', coalesce(sum(n) filter (where tipo = 'perfil'), 0), 'entrar', coalesce(sum(n) filter (where tipo = 'entrar'), 0)) x
      from public.corre_seo_conta where dia >= desde group by pagina order by sum(n) filter (where tipo = 'ver') desc nulls last limit 30) t), '[]'::jsonb));
end $$;
revoke all on function public.corre_seo_numeros(integer) from public;
grant execute on function public.corre_seo_numeros(integer) to authenticated;

select 'delta v5.0 ok';
