\set ON_ERROR_STOP 1
-- v5.05: a corre_houzi_marcas da produção tem created_at (a de mentira não tinha), e uma pessoa que já tinha duas
-- marcas antes do delta (a mais antiga vira a grátis)
alter table public.corre_houzi_marcas add column if not exists created_at timestamptz not null default now();
insert into corre_perfis (id) values ('00000000-0000-0000-0000-000000050503') on conflict do nothing;
insert into corre_houzi_marcas (id, dono, nome, created_at) values
  ('00000000-0000-0000-0000-0000000505c1', '00000000-0000-0000-0000-000000050503', 'Antiga', now() - interval '10 days'),
  ('00000000-0000-0000-0000-0000000505c2', '00000000-0000-0000-0000-000000050503', 'Nova', now() - interval '2 days')
on conflict do nothing;
