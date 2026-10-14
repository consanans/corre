-- CORRE · delta v3.45: o correal rende 10 vezes mais (14/10/2026)
-- O Thales: "com 1 correal a pessoa tem que passar pelo menos meio dia trabalhando". Na v3.43 uma imagem custava 1,00,
-- o dia inteiro de tarefa. Agora os preços caem 10 vezes: imagem 0,10, Studio Houzi 0,03, legenda ou pauta 0,02,
-- Hórus 0,02 e o voo do Correverso 0,05. Com 1,00 dá, por exemplo, 3 imagens, 10 legendas, 15 mensagens do Hórus e
-- 2 textos do Studio Houzi, e isso depois do grátis do dia (o correal só entra quando o grátis acaba).
-- O ganho não muda (0,03 por ponto, teto 1,00 por dia) e a carteira não muda: o que já tinha passa a render 10 vezes.
-- Só a corre_correal_preco muda; quem cobra (gasta, devolve, a função imagem) lê o preço dela. O "create or replace"
-- mantém as permissões que o delta v3.43 deixou (o preço todo mundo lê).
-- Precisa do delta-v343.sql antes (desde ele a função devolve numeric). Pode rodar duas vezes.
-- Pra rodar: SQL Editor do Supabase, colar o arquivo inteiro, Run. No fim aparece "delta v3.45 ok".

do $$
begin
  if pg_get_function_result('public.corre_correal_preco(text)'::regprocedure) <> 'numeric' then
    raise exception 'Roda o delta-v343.sql antes deste: o correal ainda não está em centavos.';
  end if;
end $$;

create or replace function public.corre_correal_preco(p_tipo text) returns numeric language sql immutable set search_path = public as $$
  select case p_tipo when 'imagem' then 0.10 when 'marca' then 0.03 when 'legenda' then 0.02 when 'abordagem' then 0.02
                     when 'voo' then 0.05 end::numeric $$;

select case when public.corre_correal_preco('imagem') = 0.10 and public.corre_correal_preco('marca') = 0.03
  and public.corre_correal_preco('legenda') = 0.02 and public.corre_correal_preco('abordagem') = 0.02
  and public.corre_correal_preco('voo') = 0.05
  then 'delta v3.45 ok' else 'NÃO TERMINOU: os preços não bateram' end as resultado;
