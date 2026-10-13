-- CORRE · delta v3.41 (pode rodar mais de uma vez)
-- ===============================================================
-- A BUYER PERSONA É SÓ DO DONO. A marca publicada abre pra qualquer um com o link, e a voz vai junto (o select da
-- corre_houzi_marcas é público pra marca publicada). Então o cliente ideal que a IA ou o dono escreveu mora numa tabela
-- própria, que só o dono da marca lê e escreve. (A persona que o Studio monta sozinho sai do nicho e da cidade, que já são
-- públicos; essa nem é guardada.)
--   corre_houzi_privado   uma linha por marca: a buyer persona (jsonb). Some junto com a marca.
-- Pra rodar: SQL Editor do Supabase, colar tudo, Run. No fim aparece "delta v3.41 ok".

create table if not exists public.corre_houzi_privado (
  marca      uuid primary key references public.corre_houzi_marcas (id) on delete cascade,
  dono       uuid not null default auth.uid() references public.corre_perfis (id) on delete cascade,
  buyer      jsonb not null default '{}'::jsonb check (jsonb_typeof(buyer) = 'object' and pg_column_size(buyer) <= 16384),
  updated_at timestamptz not null default now()
);
alter table public.corre_houzi_privado enable row level security;
revoke all on public.corre_houzi_privado from anon, authenticated;
grant select, insert, update, delete on public.corre_houzi_privado to authenticated;
drop policy if exists "houzi privado: só o dono" on public.corre_houzi_privado;
create policy "houzi privado: só o dono" on public.corre_houzi_privado for all to authenticated
  using (dono = auth.uid())
  with check (dono = auth.uid() and exists (select 1 from public.corre_houzi_marcas m where m.id = marca and m.dono = auth.uid()));

select 'delta v3.41 ok' as status;
