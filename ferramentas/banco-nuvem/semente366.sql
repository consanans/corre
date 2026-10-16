-- Antes da v3.66: o avatar mora em corre_perfis.verso (jsonb, como na produção, lida em 16/10/2026 pelo conector)
\set ON_ERROR_STOP 1
alter table public.corre_perfis add column if not exists verso jsonb;
