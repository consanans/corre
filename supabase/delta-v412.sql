-- v4.12 · O CORREAL QUE CAI NA RUA.
-- O Thales: "quero empurrar no 3D também, e se empurrar demais cai correal da pessoa no chão". No Correverso (a cidade e o
-- Calçadão 3D), quem leva três empurrões seus em um minuto deixa cair umas moedas, e você pega andando por cima. As
-- pessoas da cidade são do aparelho de cada um: a moeda não sai da carteira de ninguém, é a rua que paga. Pouco e
-- devagar, de propósito: quem paga mesmo é o trampo.
--   corre_achado_moeda()         0,01: quanto vale cada moeda
--   corre_achado_teto()          0,15: o máximo que a rua paga por dia (15 moedas)
--   corre_correal_achado(p_n)    pelo login. Paga até 3 moedas por vez, no mínimo 8 s depois da última vez, cortado no
--        teto da rua e no teto do dia (1,00, o mesmo da tarefa). Devolve ok, ganhou, saldo, rua (o que a rua já pagou
--        hoje), teto_rua, hoje e teto; recusado, o motivo 'devagar' (com 'falta', em segundos) ou 'teto'.
--   corre_correal_hoje           passa a contar a rua junto com a tarefa: o 1,00 do dia vale pra tudo que se ganha
--        andando (a missão de quem já pegou moeda paga o que falta, como sempre).
-- O app não decide quanto ganha: diz quantas moedas pegou e o banco corta. Quem mentir pro banco ganha no máximo 0,15
-- por dia, o mesmo de quem joga limpo. O correal continua NÃO sendo dinheiro: não compra, não vende, não transfere.
--
-- Precisa da v3.43 antes (o correal em centavos). Pode rodar duas vezes. Sem DROP. Site antigo com o delta: nada muda
-- pra ele (ele não chama a função nova). Site novo sem o delta: as moedas caem, mas o app avisa que a rua ainda não paga.
begin;

do $$
begin
  if to_regprocedure('public.corre_correal_ponto()') is null or to_regprocedure('public.corre_correal_hoje(uuid)') is null then
    raise exception 'o delta v4.12 precisa do v3.43 antes (o correal em centavos)';
  end if;
end $$;

-- 1) OS NÚMEROS DA RUA (só números: qualquer um lê, como o ponto e o teto)
create or replace function public.corre_achado_moeda() returns numeric language sql immutable set search_path = public as $$
  select 0.01::numeric $$;
create or replace function public.corre_achado_teto() returns numeric language sql immutable set search_path = public as $$
  select 0.15::numeric $$;
revoke all on function public.corre_achado_moeda(), public.corre_achado_teto() from public, anon, authenticated;
grant execute on function public.corre_achado_moeda(), public.corre_achado_teto() to public;

-- 2) O QUE SE GANHOU HOJE (dia de Brasília): a tarefa e a rua. Mesma assinatura e mesmo retorno da v3.43 (replace, sem
-- DROP); ninguém de fora executa, só as funções daqui.
create or replace function public.corre_correal_hoje(p_dono uuid) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(sum(valor), 0)::numeric(12,2) from public.corre_correal_log
   where dono = p_dono and valor > 0 and (motivo like 'tarefa:%' or motivo like 'achado:%')
     and created_at >= ((now() at time zone 'America/Sao_Paulo')::date)::timestamp at time zone 'America/Sao_Paulo' $$;
revoke all on function public.corre_correal_hoje(uuid) from public, anon, authenticated, service_role;

-- 3) A RUA PAGA, com o mesmo cadeado da carteira (duas chamadas juntas esperam uma a outra)
create or replace function public.corre_correal_achado(p_n integer) returns jsonb
language plpgsql security definer set search_path = public as $$
declare eu uuid := auth.uid(); n int := least(3, greatest(1, coalesce(p_n, 1))); ult timestamptz; rua numeric; hoje numeric;
        v numeric; ganhou numeric; s numeric; teto numeric := public.corre_correal_teto(); trua numeric := public.corre_achado_teto();
        dia timestamptz := ((now() at time zone 'America/Sao_Paulo')::date)::timestamp at time zone 'America/Sao_Paulo';
begin
  if eu is null then return jsonb_build_object('ok', false, 'motivo', 'login'); end if;
  perform pg_advisory_xact_lock(hashtext('correal:' || eu::text));
  select max(created_at) into ult from public.corre_correal_log
   where dono = eu and motivo like 'achado:%' and created_at > now() - interval '1 minute';
  if ult is not null and now() - ult < interval '8 seconds' then
    return jsonb_build_object('ok', false, 'motivo', 'devagar', 'falta', greatest(1, ceil(8 - extract(epoch from now() - ult)))::int);
  end if;
  select coalesce(sum(valor), 0) into rua from public.corre_correal_log
   where dono = eu and valor > 0 and motivo like 'achado:%' and created_at >= dia;
  hoje := public.corre_correal_hoje(eu);
  v := n * public.corre_achado_moeda();
  ganhou := greatest(0, least(v, trua - rua, teto - hoje));
  if ganhou <= 0 then
    select saldo into s from public.corre_correal where dono = eu;
    return jsonb_build_object('ok', false, 'motivo', 'teto', 'ganhou', 0, 'saldo', coalesce(s, 0), 'rua', rua, 'teto_rua', trua,
                              'hoje', hoje, 'teto', teto);
  end if;
  insert into public.corre_correal_log (dono, valor, motivo) values (eu, ganhou, 'achado:rua');
  insert into public.corre_correal as c (dono, saldo, ganho) values (eu, ganhou, ganhou)
    on conflict (dono) do update set saldo = c.saldo + excluded.saldo, ganho = c.ganho + excluded.ganho, updated_at = now();
  select saldo into s from public.corre_correal where dono = eu;
  return jsonb_build_object('ok', true, 'ganhou', ganhou, 'saldo', coalesce(s, 0), 'rua', rua + ganhou, 'teto_rua', trua,
                            'hoje', hoje + ganhou, 'teto', teto);
end $$;
revoke all on function public.corre_correal_achado(integer) from public, anon;
grant execute on function public.corre_correal_achado(integer) to authenticated;

commit;

select case when public.corre_achado_moeda() = 0.01 and public.corre_achado_teto() = 0.15
             and position('achado:' in (select prosrc from pg_proc where oid = 'public.corre_correal_hoje(uuid)'::regprocedure)) > 0
             and has_function_privilege('authenticated', 'public.corre_correal_achado(integer)', 'execute')
             and not has_function_privilege('anon', 'public.corre_correal_achado(integer)', 'execute')
            then 'delta v4.12 ok' else 'delta v4.12 NÃO TERMINOU: rode o arquivo inteiro de novo.' end as status;
