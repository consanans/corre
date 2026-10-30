-- CORRE · delta v5.10 · o Studio Cria cobra por rede e o Instagram abre pelo banco
-- O Thales (30/10/2026): "2 redes sociais 59, 3 69, 4 79, 5 89, 6 99, a cada rede adiciona"; fechado em R$ 59,90 com
-- 2 redes, R$ 10 por rede a mais e R$ 5 da 21ª em diante (até 100). Antes o nível ia de 1 a 4 e o 4 era "4 ou mais"
-- (quantas quisesse, 999); agora o nível é o número de redes. Em 30/10 ninguém assinava o Studio, então nenhum plano
-- muda de sentido.
-- E o interruptor da Meta: com o app da Meta em teste, só testador conecta o Instagram (IG_ABERTO: false no config.js).
-- No dia que a Meta aprovar, liga aqui (corre_flags.ig_aberto = true) e todo mundo vê o Conectar, sem zip novo.
-- Pode rodar duas vezes. Precisa da v3.60 (corre_assinaturas) e da v3.72 (corre_termos_aceites).
begin;

-- 1. o nível do Studio é o número de redes (de 1 a 100)
alter table public.corre_assinaturas drop constraint if exists corre_assinaturas_nivel_check,
  add constraint corre_assinaturas_nivel_check check (nivel >= 1 and nivel <= 100);
alter table public.corre_termos_aceites drop constraint if exists corre_termos_aceites_nivel_check,
  add constraint corre_termos_aceites_nivel_check check (nivel >= 1 and nivel <= 100);

-- 2. quantas redes o plano libera: o próprio nível (o 4 não é mais "quantas quiser"). Dono e Pro seguem com tudo
create or replace function public.corre_redes_permitidas(p_dono uuid)
 returns integer
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select case
    when public.corre_eh_dono(p_dono) or coalesce((select plano from public.corre_perfis where id = p_dono), 'gratis') = 'pro' then 999
    else greatest(
      coalesce((select redes from public.corre_perfis where id = p_dono), 1), 1,
      coalesce((select least(a.nivel, 100) from public.corre_assinaturas a
                 where a.dono = p_dono and a.produto = 'studio' and public.corre_tem_acesso(p_dono, 'studio')), 1))
  end;
$function$;

-- 3. os interruptores do Corre que valem pra todo mundo, sem zip (o app lê na abertura). Só o servidor escreve
create table if not exists public.corre_flags (
  k text primary key check (k ~ '^[a-z_]{1,40}$'),
  v jsonb not null default 'false'::jsonb,
  em timestamptz not null default now()
);
alter table public.corre_flags enable row level security;
revoke all on public.corre_flags from anon, authenticated;
insert into public.corre_flags (k, v) values ('ig_aberto', 'false'::jsonb) on conflict (k) do nothing;

create or replace function public.corre_flags()
 returns jsonb
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) from public.corre_flags;
$function$;
revoke all on function public.corre_flags() from public;
grant execute on function public.corre_flags() to anon, authenticated;

commit;

select case when (select pg_get_constraintdef(oid) from pg_constraint where conname = 'corre_assinaturas_nivel_check') ~ '100'
             and (select pg_get_constraintdef(oid) from pg_constraint where conname = 'corre_termos_aceites_nivel_check') ~ '100'
             and position('999 else a.nivel' in (select prosrc from pg_proc where oid = 'public.corre_redes_permitidas(uuid)'::regprocedure)) = 0
             and (select relrowsecurity from pg_class where oid = 'public.corre_flags'::regclass)
             and not has_table_privilege('anon', 'public.corre_flags', 'select')
             and not has_table_privilege('authenticated', 'public.corre_flags', 'update')
             and has_function_privilege('anon', 'public.corre_flags()', 'execute')
             and public.corre_flags() ? 'ig_aberto'
            then 'delta v5.10 ok' else 'delta v5.10 NÃO TERMINOU: rode o arquivo inteiro de novo.' end as status;
