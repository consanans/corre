-- CORRE · a fila de posts agendados (16/10/2026)
-- O Thales pediu os posts da conta @corre "até dia 31". Post com data no futuro gravado agora apareceria já, no topo do
-- feed (o feed ordena pela data e não esconde o que é do futuro). Por isso os posts que ainda não chegaram ficam numa
-- fila e um relógio (pg_cron, de 10 em 10 minutos) solta cada um quando a hora dele passa, com a data marcada.
--   corre_feed_fila           a fila: dono, texto, quando e o post que saiu (null = ainda esperando). O app não lê nem
--                             escreve (RLS ligada e sem política); quem mexe é o SQL Editor ou o conector.
--   corre_feed_fila_solta()   solta o que já venceu; devolve quantos saíram. O relógio chama ela.
--   job "corre-fila-posts"    o relógio. Pra parar: select cron.unschedule('corre-fila-posts');
-- Pra tirar um post da fila antes de sair: delete from corre_feed_fila where post is null and texto like '...%';
-- Sem DROP. Pode rodar duas vezes. No fim aparece "fila de posts ok".

begin;

create table if not exists public.corre_feed_fila (
  id         bigint generated always as identity primary key,
  dono       uuid not null references public.corre_perfis (id) on delete cascade,
  texto      text not null check (char_length(texto) between 1 and 500),
  quando     timestamptz not null,
  post       uuid,
  created_at timestamptz not null default now()
);
create index if not exists corre_feed_fila_esperando on public.corre_feed_fila (quando) where post is null;
alter table public.corre_feed_fila enable row level security;
revoke all on public.corre_feed_fila from anon, authenticated;

-- solta em ordem; "skip locked" pra duas rodadas do relógio ao mesmo tempo não soltarem o mesmo post duas vezes
create or replace function public.corre_feed_fila_solta() returns int
language plpgsql security definer set search_path = public as $$
declare r record; n int := 0; pid uuid;
begin
  for r in select * from public.corre_feed_fila where post is null and quando <= now() order by quando for update skip locked loop
    insert into public.corre_feed (dono, tipo, texto, midia_url, created_at) values (r.dono, 'post', r.texto, '', r.quando) returning id into pid;
    update public.corre_feed_fila set post = pid where id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.corre_feed_fila_solta() from public, anon, authenticated;

commit;

-- o relógio (só onde tem pg_cron, como na produção; o nome igual atualiza o job em vez de criar outro)
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('corre-fila-posts', '*/10 * * * *', 'select public.corre_feed_fila_solta()');
  end if;
end $$;

select 'fila de posts ok' as resultado;
