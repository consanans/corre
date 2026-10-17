-- delta v3.74 · a faxina: a devolução de correal pelo recibo do gasto
--
-- Antes, a função "imagem" devolvia "o último gasto daquele tipo dos últimos 10 minutos". Duas IAs do mesmo tipo falhando
-- ao mesmo tempo (duas imagens, por exemplo) achavam o MESMO gasto: a primeira devolvia e a segunda via a volta e desistia.
-- A pessoa perdia um. Agora o gasto devolve o número da linha do extrato (o recibo) e a devolução vai por ele: cada gasto
-- volta uma vez, o valor que foi pago (não o preço de hoje).
--
-- 1. corre_correal_gasta: igual, e a resposta ganha 'gasto' (o id da linha do extrato).
-- 2. corre_correal_devolve_gasto(dono, gasto): devolve aquele gasto, uma vez, até 10 minutos depois. Só a chave de serviço.
-- 3. corre_correal_devolve (a de antes, que a função velha ainda chama): também enxerga a volta pelo recibo, pra não
--    devolver duas vezes se as duas versões rodarem juntas na troca.
--
-- Precisa do v3.43 antes (confere sozinho). Pode rodar duas vezes. Sem DROP.

begin;

do $$ begin
  if to_regprocedure('public.corre_correal_devolve(uuid, text)') is null or to_regprocedure('public.corre_correal_gasta(text)') is null then
    raise exception 'falta o delta-v343.sql (o correal em centavos) antes deste';
  end if;
end $$;

-- 1) GASTAR: o mesmo de antes, e o recibo na resposta
create or replace function public.corre_correal_gasta(p_tipo text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); p numeric := public.corre_correal_preco(p_tipo); s numeric; gid bigint;
begin
  if u is null or p is null then return jsonb_build_object('ok', false, 'saldo', 0, 'preco', p); end if;
  perform pg_advisory_xact_lock(hashtext('correal:' || u::text));
  select saldo into s from public.corre_correal where dono = u for update;
  if coalesce(s, 0) < p then return jsonb_build_object('ok', false, 'saldo', coalesce(s, 0), 'preco', p); end if;
  update public.corre_correal set saldo = saldo - p, gasto = gasto + p, updated_at = now() where dono = u returning saldo into s;
  insert into public.corre_correal_log (dono, valor, motivo) values (u, -p, 'gasto:' || p_tipo) returning id into gid;
  return jsonb_build_object('ok', true, 'saldo', s, 'preco', p, 'gasto', gid);
end $$;

-- 2) DEVOLVER PELO RECIBO (só a chave de serviço): aquele gasto, dos últimos 10 minutos, uma vez só. A volta leva o recibo
-- no motivo ("volta:imagem:123"), que é como se sabe que ele já voltou
create or replace function public.corre_correal_devolve_gasto(p_dono uuid, p_gasto bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare g public.corre_correal_log%rowtype; tipo text; s numeric;
begin
  if p_dono is null or p_gasto is null then return jsonb_build_object('ok', false); end if;
  perform pg_advisory_xact_lock(hashtext('correal:' || p_dono::text));
  select * into g from public.corre_correal_log
   where id = p_gasto and dono = p_dono and valor < 0 and motivo like 'gasto:%' and created_at > now() - interval '10 minutes';
  if not found then return jsonb_build_object('ok', false); end if;
  tipo := substr(g.motivo, 7);
  if exists (select 1 from public.corre_correal_log where dono = p_dono and motivo = left('volta:' || tipo || ':' || p_gasto, 60)) then
    return jsonb_build_object('ok', false, 'ja', true);
  end if;
  update public.corre_correal set saldo = saldo - g.valor, gasto = greatest(0, gasto + g.valor), updated_at = now() where dono = p_dono returning saldo into s;
  insert into public.corre_correal_log (dono, valor, motivo) values (p_dono, -g.valor, left('volta:' || tipo || ':' || p_gasto, 60));
  return jsonb_build_object('ok', true, 'saldo', s);
end $$;

-- 3) A DEVOLUÇÃO DE ANTES (por tipo): igual, mas a volta pelo recibo também conta como volta daquele tipo
create or replace function public.corre_correal_devolve(p_dono uuid, p_tipo text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p numeric := public.corre_correal_preco(p_tipo); g timestamptz; s numeric;
begin
  if p is null or p_dono is null then return jsonb_build_object('ok', false); end if;
  perform pg_advisory_xact_lock(hashtext('correal:' || p_dono::text));
  select max(created_at) into g from public.corre_correal_log where dono = p_dono and motivo = 'gasto:' || p_tipo and created_at > now() - interval '10 minutes';
  if g is null or exists (select 1 from public.corre_correal_log where dono = p_dono and (motivo = 'volta:' || p_tipo or motivo like 'volta:' || p_tipo || ':%') and created_at >= g) then
    return jsonb_build_object('ok', false);
  end if;
  update public.corre_correal set saldo = saldo + p, gasto = greatest(0, gasto - p), updated_at = now() where dono = p_dono returning saldo into s;
  insert into public.corre_correal_log (dono, valor, motivo) values (p_dono, p, 'volta:' || p_tipo);
  return jsonb_build_object('ok', true, 'saldo', s);
end $$;

-- função nova ganha EXECUTE pra todo mundo pelos padrões do Supabase: aqui, só a chave de serviço
revoke all on function public.corre_correal_devolve_gasto(uuid, bigint) from public, anon, authenticated;
grant execute on function public.corre_correal_devolve_gasto(uuid, bigint) to service_role;

commit;

select case when to_regprocedure('public.corre_correal_devolve_gasto(uuid, bigint)') is not null
  and has_function_privilege('service_role', 'public.corre_correal_devolve_gasto(uuid, bigint)', 'execute')
  and not has_function_privilege('authenticated', 'public.corre_correal_devolve_gasto(uuid, bigint)', 'execute')
  and not has_function_privilege('anon', 'public.corre_correal_devolve_gasto(uuid, bigint)', 'execute')
  and has_function_privilege('authenticated', 'public.corre_correal_gasta(text)', 'execute')
  then 'delta v3.74 ok' else 'NÃO TERMINOU: a devolução pelo recibo não ficou certa' end as resultado;
