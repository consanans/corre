-- CORRE · delta v5.08: o Midas, o super avatar de ouro, a R$ 129,99 (28/10/2026)
-- O Thales: "faz um super avatar de ouro e colocar 129,99 e valor".
-- O que muda:
--   corre_skins_loja()   a vitrine passa de 46 pra 47: as 46 da v5.05 iguais e o Midas no fim. Ele entra aqui com 1,00
--                        só como marca de "skin paga": é por esta lista que a trava do avatar (delta-v366) sabe que
--                        ninguém veste sem ter. Comprar com correal ele não dá: o corre_skin_compra (delta-v413) recusa
--                        toda skin que tem preço em real.
--   corre_skins_reais()  as 20 da v5.05 iguais e o Midas a R$ 129,99. A compra, o pedido (o valor cabe na regra do
--                        corre_skin_pedidos, abaixo de R$ 1.000), o aviso do Asaas, a desistência em 7 dias e o estorno
--                        (delta-v413) leem o preço daqui. Ele não é de época: a função "pagamento" vende o ano inteiro.
-- Precisa do delta-v505 antes (confere sozinho). Depois deste, NÃO rodar o delta-v391, o delta-v413 nem o delta-v505 de
-- novo: eles voltam a vitrine e os preços de antes (aí é só rodar este de novo).
-- Sem DROP nem DELETE (o conector do Supabase trava neles). Pode rodar duas vezes.
-- Pra rodar: SQL Editor do Supabase, colar o arquivo inteiro, Run. No fim aparece "delta v5.08 ok".

begin;

do $$
begin
  if to_regprocedure('public.corre_skin_compra(text)') is null or to_regprocedure('public.corre_skin_pedido_novo(uuid,text,text,text,text,text)') is null
     or to_regclass('public.corre_houzi_gratis') is null then
    raise exception 'o delta v5.08 precisa do v3.66, do v4.13 e do v5.05 antes (a loja, as skins em real e a coleção de Natal)';
  end if;
end $$;

-- 1) A VITRINE (qualquer um lê: são só números). As 46 de antes iguais e o Midas no fim
create or replace function public.corre_skins_loja() returns table (skin text, preco numeric)
language sql immutable set search_path = public as $$
  select t.skin, t.preco::numeric from (values
    ('farao', 1.00), ('diva', 1.00), ('carnaval', 1.00), ('samurai', 1.00), ('cavaleiro', 1.00), ('galaxia', 1.00),
    ('cangaceiro', 0.60), ('peao', 0.60), ('mc', 0.60), ('mago', 0.60), ('vampiro', 0.60), ('anjo', 0.60), ('luchador', 0.60), ('fada', 0.60),
    ('capeta', 0.30), ('mumia', 0.30), ('piloto', 0.30), ('rockeiro', 0.30),
    ('abobora', 1.00), ('saci', 1.00), ('bruxa', 0.60), ('esqueleto', 0.60), ('lobisomem', 0.60), ('lencol', 0.30), ('mortovivo', 0.30), ('gatopreto', 0.30),
    ('robo', 1.00), ('sereia', 1.00), ('dino', 0.60), ('bailarina', 0.60), ('mergulhador', 0.60), ('caipira', 0.30), ('abelha', 0.30), ('palhaco', 0.30),
    ('noel', 1.00), ('arvore', 1.00), ('noelverao', 1.00), ('mamaenoel', 1.00), ('boneconeve', 1.00), ('quebranozes', 1.00),
    ('piscapisca', 1.00), ('rena', 1.00), ('duende', 1.00), ('reimago', 1.00), ('biscoito', 1.00), ('presente', 1.00),
    ('midas', 1.00)
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
    ('biscoito', 12.90), ('presente', 12.90),
    ('midas', 129.99)
  ) as t(skin, reais) $$;
revoke all on function public.corre_skins_reais() from public, anon, authenticated, service_role;
grant execute on function public.corre_skins_reais() to public;

commit;

select case when (select count(*) from public.corre_skins_loja()) = 47 and (select count(*) from public.corre_skins_reais()) = 21
  and public.corre_skin_preco('midas') = 1.00 and public.corre_skin_real('midas') = 129.99
  and public.corre_skin_real('noel') = 24.90 and public.corre_skin_real('abobora') = 14.90 and public.corre_skin_preco('farao') = 1.00
  then 'delta v5.08 ok' else 'NÃO TERMINOU: a vitrine ou o preço do Midas não bateram' end as resultado;
