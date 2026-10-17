-- delta v3.72 · pronto pra cobrar de verdade: o aceite dos Termos e a desistência em 7 dias
--
-- 1. corre_termos_aceites: cada vez que alguém assina ou troca de plano, a função "pagamento" anota a versão dos Termos
--    de uso que a pessoa marcou ("Li e aceito"), o plano, o valor e a hora. É a prova do combinado. Ninguém do app lê nem
--    escreve (só a função, pelo servidor). Apagar o perfil apaga junto, como o resto.
-- 2. corre_assinaturas.desistiu_em: a desistência com devolução (Código de Defesa do Consumidor, art. 49) sai pelo app
--    uma vez por plano. Na segunda, a pessoa escreve pro e-mail (senão dava pra assinar, usar 6 dias, pedir de volta e
--    repetir pra sempre).
--
-- Precisa do v3.60 antes. Pode rodar duas vezes. Sem DROP (o conector do Supabase trava em comando que apaga).

begin;

do $$ begin
  if to_regclass('public.corre_assinaturas') is null then
    raise exception 'falta o delta-v360.sql (os planos) antes deste';
  end if;
end $$;

-- 1. o aceite dos Termos
create table if not exists public.corre_termos_aceites (
  id      bigint generated always as identity primary key,
  dono    uuid not null references public.corre_perfis (id) on delete cascade,
  versao  text not null check (versao ~ '^\d{4}-\d{2}-\d{2}$'),
  produto text not null check (produto in ('studio', 'houzi', 'horus')),
  nivel   int not null default 1 check (nivel between 1 and 4),
  valor   numeric(10,2) not null default 0 check (valor >= 0 and valor < 1000),
  acao    text not null default 'assinar' check (acao in ('assinar', 'trocar')),
  em      timestamptz not null default now()
);
create index if not exists corre_termos_aceites_dono on public.corre_termos_aceites (dono, em desc);
alter table public.corre_termos_aceites enable row level security;
-- sem política: o app não lê nem grava (a função usa o servidor, que passa pelo RLS)
revoke all on public.corre_termos_aceites from anon, authenticated;
-- a função grava com a chave de serviço. Neste projeto o Supabase não dá mais leitura nem escrita pro service_role em
-- tabela nova (ver o delta-v341.sql): sem este grant o aceite não seria anotado. Só gravar; ler é coisa do painel
grant insert on public.corre_termos_aceites to service_role;
revoke truncate, references, trigger on public.corre_termos_aceites from service_role;

-- 2. a desistência em 7 dias, uma vez por plano pelo app
alter table public.corre_assinaturas add column if not exists desistiu_em timestamptz;

commit;

select case when to_regclass('public.corre_termos_aceites') is not null
  and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'corre_assinaturas' and column_name = 'desistiu_em')
  and (select relrowsecurity from pg_class where oid = 'public.corre_termos_aceites'::regclass)
  and has_table_privilege('service_role', 'public.corre_termos_aceites', 'INSERT')
  then 'delta v3.72 ok' else 'NÃO TERMINOU: falta o aceite ou a desistência' end as resultado;
