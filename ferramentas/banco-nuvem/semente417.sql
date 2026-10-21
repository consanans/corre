-- Antes da v4.17: o corre_posts e o corre_portfolio com as colunas da produção que o delta usa (o Supabase de mentira só
-- tinha o que os deltas antigos liam), a regra da marca dos posts e o gatilho do Instagram como estão lá (lidos pelo
-- conector em 21/10/2026). O delta troca o gatilho e o teste confere que o de antes continua valendo.
\set ON_ERROR_STOP 1
alter table public.corre_posts add column if not exists marca_id uuid references public.corre_portfolio (id) on delete cascade,
  add column if not exists data date, add column if not exists hora text not null default '',
  add column if not exists titulo text not null default '', add column if not exists legenda text not null default '',
  add column if not exists alt text not null default '', add column if not exists midia_url text not null default '',
  add column if not exists status text not null default 'ideia', add column if not exists ig_media_id text not null default '',
  add column if not exists ig_link text not null default '', add column if not exists ig_conta uuid,
  add column if not exists created_at timestamptz not null default now();
alter table public.corre_portfolio add column if not exists marca text not null default '', add column if not exists cor text not null default '',
  add column if not exists logo_url text not null default '';
alter table public.corre_posts enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'corre_posts' and policyname = 'posts: so a dona') then
    create policy "posts: so a dona" on public.corre_posts using (dono = auth.uid()) with check (dono = auth.uid());
  end if;
end $$;
grant select, insert, update, delete on public.corre_posts to authenticated;

create or replace function public.corre_post_marca_ok() returns trigger
language plpgsql security definer set search_path to 'public' as $function$
begin
  if not exists (select 1 from public.corre_portfolio m where m.id = new.marca_id and m.dono = new.dono) then
    raise exception 'marca de outra pessoa' using errcode = '42501';
  end if;
  return new;
end $function$;
create or replace function public.corre_posts_ig_ok() returns trigger
language plpgsql as $function$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if tg_op = 'INSERT' then
    if new.ig_status not in ('', 'agendado') or new.ig_media_id <> '' or new.ig_link <> '' or new.ig_tentativas <> 0 then
      raise exception 'ig' using errcode = 'P0001', hint = 'ig';
    end if;
    new.ig_erro := '';
  else
    if new.ig_media_id is distinct from old.ig_media_id or new.ig_link is distinct from old.ig_link or new.ig_tentativas is distinct from old.ig_tentativas then
      raise exception 'ig' using errcode = 'P0001', hint = 'ig';
    end if;
    if new.ig_status is distinct from old.ig_status then
      if old.ig_status in ('publicando', 'publicado') or new.ig_status not in ('', 'agendado') then
        raise exception 'ig' using errcode = 'P0001', hint = 'ig';
      end if;
      new.ig_erro := ''; new.ig_tentativas := 0;
    elsif new.ig_erro is distinct from old.ig_erro and new.ig_erro <> '' then
      raise exception 'ig' using errcode = 'P0001', hint = 'ig';
    end if;
  end if;
  if new.ig_status = 'agendado' then
    if new.data is null then raise exception 'ig_quando' using errcode = 'P0001', hint = 'ig_quando'; end if;
    new.ig_quando := (new.data + coalesce(nullif(new.hora, ''), '12:00')::time) at time zone 'America/Sao_Paulo';
  end if;
  return new;
end $function$;
create or replace trigger corre_posts_ig before insert or update on public.corre_posts for each row execute function public.corre_posts_ig_ok();
create or replace trigger corre_posts_marca before insert or update on public.corre_posts for each row execute function public.corre_post_marca_ok();
create or replace trigger corre_posts_touch before update on public.corre_posts for each row execute function public.corre_touch_updated_at();
