\set ON_ERROR_STOP 1
-- v5.19: as missões e os bicos de Cambé pagam; o resto segue igual.
select case when public.corre_tarefa_valor('motoboy', 'cuca') = 7 and public.corre_tarefa_valor('medico', 'transferencia') = 8 and public.corre_tarefa_valor('craque', 'intermunicipal') = 7
  then 'ok: as missões de Cambé valem de 7 a 8 pontos' else 'FALHOU: o valor das missões de Cambé' end;
select case when public.corre_tarefa_valor('cientista', 'riacho') = 1 and public.corre_tarefa_valor('rei', 'nacoes') = 1 and public.corre_tarefa_valor('chef', 'cuca') = 1
  then 'ok: os bicos de Cambé valem 1 ponto' else 'FALHOU: o valor dos bicos de Cambé' end;
select case when public.corre_tarefa_min('policial', 'br369') = 50 and public.corre_tarefa_min('detetive', 'dantzig') = 60 and public.corre_tarefa_min('rei', 'nacoes') = 20
  then 'ok: o tempo mínimo das de Cambé' else 'FALHOU: o tempo mínimo das de Cambé' end;
select case when public.corre_tarefa_valor('policial', 'perseguicao') = 8 and public.corre_tarefa_valor('ninja', 'meditar') = 1 and public.corre_tarefa_valor('policial', 'inventada') is null
  then 'ok: as de antes iguais e a inventada não existe' else 'FALHOU: mexeu nas de antes' end;
select case when not has_function_privilege('authenticated', 'public.corre_tarefa_min(text,text)', 'execute')
  then 'ok: o app não chama o tempo mínimo' else 'FALHOU: o tempo mínimo abriu pro app' end;
