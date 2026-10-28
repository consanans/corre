-- CORRE · delta v5.05: o Ateliê com mais fantasias e a coleção de Natal em real (28/10/2026)
-- O Thales: "no ateliê separa o que é correal e o que é dinheiro de verdade, aumenta mais o número de fantasias e
-- adiciona um monte de Natal e tudo acima de 10 reais".
-- O que muda:
--   corre_skins_loja()   a vitrine passa de 26 pra 46: as 26 de antes iguais, mais 8 fantasias em correal (Robô Lata e
--                        Sereia do Igapó 1,00; Dino, Bailarina e Mergulhador 0,60; Caipira, Abelha e Palhaço 0,30) e as 12
--                        de Natal. As de Natal entram aqui com 1,00 só como marca de "skin paga": é por esta lista que a
--                        trava do avatar (delta-v366) sabe que ninguém veste sem ter. Comprar com correal elas não dá: o
--                        corre_skin_compra (delta-v413) recusa toda skin que tem preço em real.
--   corre_skins_reais()  as 8 de Halloween iguais e as 12 de Natal, todas acima de R$ 10: Papai Noel e Árvore Dourada
--                        24,90; Noel de Bermuda, Mamãe Noel, Boneco de Neve, Quebra-Nozes e Pisca-Pisca 19,90; Rena, Duende
--                        da Fábrica e Rei Mago 14,90; Boneco de Gengibre e Presente 12,90. A compra, o pedido, o aviso do
--                        Asaas, a desistência e o estorno (delta-v413) leem o preço daqui, então valem pras novas sem mexer
--                        em mais nada. A época (o Natal só se compra de 15/10 até o Dia de Reis) é da função "pagamento".
-- E o Studio Houzi (o Thales, no mesmo dia: "o studio houzi a pessoa tem como fazer um branding na faixa só, o segundo
-- pra frente ela paga"):
--   corre_houzi_gratis    a marca grátis de cada pessoa (uma por pessoa, pra sempre). O app não lê nem escreve: quem
--                         grava é o gatilho, na primeira marca que a pessoa cria sem plano. Quem já tinha marca ganha a
--                         mais antiga como a grátis (em 28/10 eram 2 pessoas com 1 marca cada, nenhuma com plano).
--   corre_houzi_plano     o gatilho de antes, com a regra nova: com o plano (ou dono), cria e mexe em quantas quiser; sem
--                         ele, cria e mexe só na grátis. Apagar a grátis não dá outra (é "um branding na faixa só").
--                         Publicar, despublicar e apagar seguem livres, como antes.
--   corre_teste_garante   o Studio Houzi não tem mais os 30 dias grátis (a marca grátis é o lugar dele); o Hórus segue.
--                         Quem já tem teste correndo fica com ele até o fim.
--   corre_houzi_livre     se a pessoa pode usar a IA do Studio Houzi agora (a função "imagem" pergunta antes de gastar):
--                         tem o plano, ou ainda não fez a grátis, ou a grátis existe (tá trabalhando nela).
--   corre_meu_acesso      ganha "houzi_gratis" ({ marca, existe }) e "houzi_livre", pro app saber o que mostrar.
--   corre_teste_comeca    (só a função "imagem" chama) no Studio Houzi devolve o "acesso" da IA livre, então a função
--                         no ar já segue a regra, sem subir de novo.
-- Precisa do delta-v366, do v3.91, do v4.13, do v3.60 e do v3.80 antes (confere sozinho). Depois deste, NÃO rodar o delta-v391 nem o
-- delta-v413 de novo: eles voltam a vitrine e os preços de antes (aí é só rodar este de novo).
-- Sem DROP nem DELETE (o conector do Supabase trava neles). Pode rodar duas vezes.
-- Pra rodar: SQL Editor do Supabase, colar o arquivo inteiro, Run. No fim aparece "delta v5.05 ok".

begin;

do $$
begin
  if to_regprocedure('public.corre_skin_compra(text)') is null or to_regprocedure('public.corre_skin_pedido_novo(uuid,text,text,text,text,text)') is null then
    raise exception 'o delta v5.05 precisa do v3.66, do v3.91 e do v4.13 antes (a loja, o Halloween e as skins em real)';
  end if;
  if to_regprocedure('public.corre_eh_dono(uuid)') is null or to_regclass('public.corre_assinaturas') is null or to_regclass('public.corre_houzi_marcas') is null then
    raise exception 'o delta v5.05 precisa do v3.60 e do v3.80 antes (os planos e os donos)';
  end if;
end $$;

-- 1) A VITRINE (qualquer um lê: são só números). As 26 de antes iguais, as 8 fantasias novas e as 12 de Natal no fim
create or replace function public.corre_skins_loja() returns table (skin text, preco numeric)
language sql immutable set search_path = public as $$
  select t.skin, t.preco::numeric from (values
    ('farao', 1.00), ('diva', 1.00), ('carnaval', 1.00), ('samurai', 1.00), ('cavaleiro', 1.00), ('galaxia', 1.00),
    ('cangaceiro', 0.60), ('peao', 0.60), ('mc', 0.60), ('mago', 0.60), ('vampiro', 0.60), ('anjo', 0.60), ('luchador', 0.60), ('fada', 0.60),
    ('capeta', 0.30), ('mumia', 0.30), ('piloto', 0.30), ('rockeiro', 0.30),
    ('abobora', 1.00), ('saci', 1.00), ('bruxa', 0.60), ('esqueleto', 0.60), ('lobisomem', 0.60), ('lencol', 0.30), ('mortovivo', 0.30), ('gatopreto', 0.30),
    ('robo', 1.00), ('sereia', 1.00), ('dino', 0.60), ('bailarina', 0.60), ('mergulhador', 0.60), ('caipira', 0.30), ('abelha', 0.30), ('palhaco', 0.30),
    ('noel', 1.00), ('arvore', 1.00), ('noelverao', 1.00), ('mamaenoel', 1.00), ('boneconeve', 1.00), ('quebranozes', 1.00),
    ('piscapisca', 1.00), ('rena', 1.00), ('duende', 1.00), ('reimago', 1.00), ('biscoito', 1.00), ('presente', 1.00)
  ) as t(skin, preco) $$;
revoke all on function public.corre_skins_loja() from public, anon, authenticated, service_role;
grant execute on function public.corre_skins_loja() to public;

-- 2) O PREÇO EM REAL (qualquer um lê: são só números). O único lugar do preço: o site e a função leem daqui
create or replace function public.corre_skins_reais() returns table (skin text, reais numeric)
language sql immutable set search_path = public as $$
  select t.skin, t.reais::numeric from (values
    ('abobora', 14.90), ('saci', 14.90),
    ('bruxa', 9.90), ('esqueleto', 9.90), ('lobisomem', 9.90),
    ('lencol', 5.90), ('mortovivo', 5.90), ('gatopreto', 5.90),
    ('noel', 24.90), ('arvore', 24.90),
    ('noelverao', 19.90), ('mamaenoel', 19.90), ('boneconeve', 19.90), ('quebranozes', 19.90), ('piscapisca', 19.90),
    ('rena', 14.90), ('duende', 14.90), ('reimago', 14.90),
    ('biscoito', 12.90), ('presente', 12.90)
  ) as t(skin, reais) $$;
revoke all on function public.corre_skins_reais() from public, anon, authenticated, service_role;
grant execute on function public.corre_skins_reais() to public;

-- 3) O STUDIO HOUZI: A PRIMEIRA MARCA É DE GRAÇA, DA SEGUNDA EM DIANTE É NO PLANO
create table if not exists public.corre_houzi_gratis (
  dono  uuid primary key references public.corre_perfis (id) on delete cascade,
  marca uuid not null,                       -- sem referência: apagar a marca não devolve a vaga
  em    timestamptz not null default now()
);
alter table public.corre_houzi_gratis enable row level security;
revoke all on public.corre_houzi_gratis from public, anon, authenticated;

-- quem já tinha marca: a mais antiga é a grátis
insert into public.corre_houzi_gratis (dono, marca, em)
select distinct on (m.dono) m.dono, m.id, m.created_at from public.corre_houzi_marcas m
 where m.dono is not null and exists (select 1 from public.corre_perfis p where p.id = m.dono)
 order by m.dono, m.created_at, m.id
on conflict (dono) do nothing;

-- o teste grátis de 30 dias agora é só do Hórus
create or replace function public.corre_teste_garante(p_dono uuid, p_produto text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_dono is null or p_produto <> 'horus' then return; end if;
  if not exists (select 1 from public.corre_perfis where id = p_dono) then return; end if;
  insert into public.corre_assinaturas (dono, produto, status, teste_ate, valor)
  values (p_dono, p_produto, 'teste', now() + interval '30 days', 9.90)
  on conflict (dono, produto) do nothing;
end $$;
revoke all on function public.corre_teste_garante(uuid, text) from public, anon, authenticated;

-- o gatilho: com o plano, quantas quiser; sem ele, só a grátis (a primeira que a pessoa cria vira ela)
create or replace function public.corre_houzi_plano() returns trigger
language plpgsql security definer set search_path = public as $$
declare g uuid;
begin
  if coalesce(auth.role(), '') not in ('anon', 'authenticated') then return new; end if;
  /* publicar, despublicar e apagar seguem livres: o que trava é criar e mexer na marca */
  if tg_op = 'UPDATE' and new.nome is not distinct from old.nome and new.spec is not distinct from old.spec
     and new.voz is not distinct from old.voz and new.naming is not distinct from old.naming then return new; end if;
  if public.corre_tem_acesso(new.dono, 'houzi') then return new; end if;
  if tg_op = 'INSERT' then
    insert into public.corre_houzi_gratis (dono, marca) values (new.dono, new.id) on conflict (dono) do nothing;
  end if;
  select marca into g from public.corre_houzi_gratis where dono = new.dono;
  if g = new.id then return new; end if;
  raise exception 'a marca grátis do Studio Houzi já foi usada' using errcode = 'P0001', hint = 'houzi_assinatura';
end $$;
revoke all on function public.corre_houzi_plano() from public, anon, authenticated;
create or replace trigger corre_houzi_plano before insert or update on public.corre_houzi_marcas for each row execute function public.corre_houzi_plano();

-- a IA do Studio Houzi: o plano, ou a grátis por fazer, ou a grátis que existe
create or replace function public.corre_houzi_livre(p_dono uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_dono is not null and (public.corre_tem_acesso(p_dono, 'houzi')
    or not exists (select 1 from public.corre_houzi_gratis g where g.dono = p_dono)
    or exists (select 1 from public.corre_houzi_gratis g join public.corre_houzi_marcas m on m.id = g.marca where g.dono = p_dono));
$$;
revoke all on function public.corre_houzi_livre(uuid) from public, anon, authenticated;

-- a função "imagem" pergunta por aqui antes de gastar IA (só ela chama: o app não usa) e trava quando o "acesso" do
-- produto vem false. No Studio Houzi, o "acesso" que ela recebe passa a ser se a IA tá livre (o corre_houzi_livre):
-- assim a função que tá no ar já segue a regra da marca grátis, sem precisar subir de novo
create or replace function public.corre_teste_comeca(p_produto text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  if auth.uid() is null then raise exception 'login' using hint = 'login'; end if;
  perform public.corre_teste_garante(auth.uid(), p_produto);
  r := public.corre_meu_acesso();
  if p_produto = 'houzi' and r is not null then
    r := jsonb_set(r, '{acesso,houzi}', to_jsonb(public.corre_houzi_livre(auth.uid())));
  end if;
  return r;
end $$;
revoke all on function public.corre_teste_comeca(text) from public, anon;
grant execute on function public.corre_teste_comeca(text) to authenticated;

-- o resumo pro app (o da v3.80, igual, mais a marca grátis e a IA livre)
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
    'acesso', jsonb_build_object('studio', true, 'houzi', public.corre_tem_acesso(auth.uid(), 'houzi'), 'horus', public.corre_tem_acesso(auth.uid(), 'horus')),
    /* v5.05: a marca grátis do Studio Houzi (null = ainda não fez) e se a IA dele tá livre */
    'houzi_gratis', (select jsonb_build_object('marca', g.marca, 'existe', exists (select 1 from public.corre_houzi_marcas m where m.id = g.marca))
                       from public.corre_houzi_gratis g where g.dono = auth.uid()),
    'houzi_livre', public.corre_houzi_livre(auth.uid())
  ) end;
$$;
revoke all on function public.corre_meu_acesso() from public, anon;
grant execute on function public.corre_meu_acesso() to authenticated;

commit;

select case when (select count(*) from public.corre_skins_loja()) = 46 and (select count(*) from public.corre_skins_reais()) = 20
  and public.corre_skin_preco('robo') = 1.00 and public.corre_skin_preco('dino') = 0.60 and public.corre_skin_preco('palhaco') = 0.30
  and public.corre_skin_preco('farao') = 1.00 and public.corre_skin_preco('noel') = 1.00
  and public.corre_skin_real('noel') = 24.90 and public.corre_skin_real('presente') = 12.90 and public.corre_skin_real('abobora') = 14.90
  and public.corre_skin_real('robo') is null
  and to_regclass('public.corre_houzi_gratis') is not null and to_regprocedure('public.corre_houzi_livre(uuid)') is not null
  and (select count(*) from public.corre_houzi_marcas m where m.dono is not null and not exists (select 1 from public.corre_houzi_gratis g where g.dono = m.dono)
         and exists (select 1 from public.corre_perfis p where p.id = m.dono)) = 0
  and (select min(r.reais) from public.corre_skins_reais() r join public.corre_skins_loja() l using (skin) where l.skin in
       ('noel', 'arvore', 'noelverao', 'mamaenoel', 'boneconeve', 'quebranozes', 'piscapisca', 'rena', 'duende', 'reimago', 'biscoito', 'presente')) > 10
  then 'delta v5.05 ok' else 'NÃO TERMINOU: a vitrine, os preços ou a marca grátis do Studio Houzi não bateram' end as resultado;
