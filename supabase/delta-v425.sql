-- v4.25 · O CADERNINHO CONTA A QUE REPETE (o Thales: "o caderninho hoje marca 0 de 2 mas eu fiz uma missão diária já,
-- eu gostaria que ele contasse todas ao total").
--
-- A tarefa que repete, quando é feita, pula pro próximo dia dela e nunca fica "feita": por isso sumia da conta do dia.
--
--   corre_caderno.feitas   os dias (de Brasília) em que ela foi feita, os últimos 400. O app põe o dia de hoje quando
--                          marca e tira quando desfaz; com isso ela entra no "feitas hoje" e a diária mostra a sequência
--                          ("5 dias seguidos").
--
-- Precisa da v4.19. Pode rodar duas vezes. Sem DROP. Site antigo com o delta: nada muda pra ele (a coluna fica vazia).
begin;

do $$
begin
  if to_regclass('public.corre_caderno') is null then
    raise exception 'o delta v4.25 precisa do delta-v419.sql antes (o Caderninho)';
  end if;
end $$;

alter table public.corre_caderno add column if not exists feitas date[] not null default '{}';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'corre_caderno_feitas_check') then
    alter table public.corre_caderno add constraint corre_caderno_feitas_check check (cardinality(feitas) <= 400);
  end if;
end $$;

commit;

select case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'corre_caderno' and column_name = 'feitas')
             and exists (select 1 from pg_constraint where conname = 'corre_caderno_feitas_check')
            then 'delta v4.25 ok' else 'delta v4.25 NÃO TERMINOU: rode o arquivo inteiro de novo.' end as status;
