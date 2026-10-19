-- Antes da v4.0: o que o delta usa do perfil (lido na produção em 19/10/2026 pelo conector): created_at travado pelo
-- app (o corre_trava_criacao, cópia) e o avatar
\set ON_ERROR_STOP 1
alter table public.corre_perfis add column if not exists created_at timestamptz default now(), add column if not exists avatar_url text default '';
create or replace function public.corre_trava_criacao() returns trigger language plpgsql set search_path to 'public' as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then new.created_at := now(); else new.created_at := old.created_at; end if;
  end if;
  return new;
end $$;
create trigger corre_perfis_trava_criacao before insert or update on public.corre_perfis for each row execute function public.corre_trava_criacao();
grant select, insert, update on public.corre_perfis to anon, authenticated;
