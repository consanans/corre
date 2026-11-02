\set ON_ERROR_STOP 1
-- v5.21: as missões de Ibiporã e o bico de Curitiba pagam; as de Cambé seguem.
select case when public.corre_tarefa_valor('motoboy', 'cafe') = 8 and public.corre_tarefa_valor('super', 'capelas') = 7 and public.corre_tarefa_valor('chef', 'pinhao') = 1
  then 'ok: as novas de Ibiporã e Curitiba' else 'FALHOU: o valor das novas' end;
select case when public.corre_tarefa_min('motoboy', 'cafe') = 60 and public.corre_tarefa_min('chef', 'pinhao') = 20
  then 'ok: o tempo mínimo das novas' else 'FALHOU: o tempo mínimo das novas' end;
select case when public.corre_tarefa_valor('motoboy', 'cuca') = 7 and public.corre_tarefa_valor('policial', 'ronda') = 1
  then 'ok: as de antes iguais' else 'FALHOU: mexeu nas de antes' end;
