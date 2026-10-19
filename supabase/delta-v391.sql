-- CORRE · delta v3.91: a coleção de Halloween no Ateliê (19/10/2026)
-- O Thales: "adiciona opções de skin de halloween". São 8 skins novas, pagas em correal (a moeda do Correverso, que não
-- é dinheiro), no mesmo jeito das 18 da v3.66: comprou, é tua pra sempre. Preços: Cabeça de Abóbora e Saci 1,00;
-- Bruxa do Caldeirão, Esqueleto e Lobisomem do Tibagi 0,60; Fantasma de Lençol, Morto-Vivo e Gato Preto 0,30.
-- O que muda: só a vitrine (corre_skins_loja), que passa de 18 pra 26. A compra, a carteira, o extrato e a trava do
-- avatar (delta-v366.sql) leem o preço dela, então valem pras novas sem mexer em mais nada. A época (só se compra de
-- 1º/10 até Finados) é do site; o banco vende o ano inteiro, porque correal não é dinheiro e o pior que acontece é
-- alguém comprar uma abóbora em março.
-- Precisa do delta-v366.sql antes (confere sozinho). Depois deste, NÃO rodar o delta-v366.sql de novo: ele volta a
-- vitrine pra 18 (aí é só rodar este de novo).
-- Sem DROP (o conector do Supabase trava nele). Pode rodar duas vezes.
-- Pra rodar: SQL Editor do Supabase, colar o arquivo inteiro, Run. No fim aparece "delta v3.91 ok".

begin;

do $$
begin
  if to_regprocedure('public.corre_skin_compra(text)') is null then
    raise exception 'falta o delta-v366.sql (a loja de skins): rode ele antes deste';
  end if;
end $$;

-- A VITRINE E O PREÇO (qualquer um lê: são só números). As 18 de antes, iguais, e as 8 de Halloween no fim
create or replace function public.corre_skins_loja() returns table (skin text, preco numeric)
language sql immutable set search_path = public as $$
  select t.skin, t.preco::numeric from (values
    ('farao', 1.00), ('diva', 1.00), ('carnaval', 1.00), ('samurai', 1.00), ('cavaleiro', 1.00), ('galaxia', 1.00),
    ('cangaceiro', 0.60), ('peao', 0.60), ('mc', 0.60), ('mago', 0.60), ('vampiro', 0.60), ('anjo', 0.60), ('luchador', 0.60), ('fada', 0.60),
    ('capeta', 0.30), ('mumia', 0.30), ('piloto', 0.30), ('rockeiro', 0.30),
    ('abobora', 1.00), ('saci', 1.00), ('bruxa', 0.60), ('esqueleto', 0.60), ('lobisomem', 0.60), ('lencol', 0.30), ('mortovivo', 0.30), ('gatopreto', 0.30)
  ) as t(skin, preco) $$;
revoke all on function public.corre_skins_loja() from public, anon, authenticated, service_role;
grant execute on function public.corre_skins_loja() to public;

commit;

select case when (select count(*) from public.corre_skins_loja()) = 26
  and public.corre_skin_preco('abobora') = 1.00 and public.corre_skin_preco('saci') = 1.00 and public.corre_skin_preco('bruxa') = 0.60
  and public.corre_skin_preco('lencol') = 0.30 and public.corre_skin_preco('farao') = 1.00 and public.corre_skin_preco('policial') is null
  then 'delta v3.91 ok' else 'NÃO TERMINOU: a vitrine de Halloween não bateu' end as resultado;
