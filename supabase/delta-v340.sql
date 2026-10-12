-- CORRE · delta v3.40 (pode rodar mais de uma vez)
-- ===============================================================
-- INSTAGRAM NO JEITO DO MLABS: cada pessoa conecta o próprio Instagram (faz login na conta, pelo login do Instagram)
-- e cada post diz em qual conta vai sair. Nada é publicado em conta que a pessoa não conectou.
--   corre_ig_contas   as contas conectadas (a pessoa vê e desconecta as dela; quem cria é a função "instagram")
--   corre_ig_tokens   o token de cada conta, CIFRADO pela função. Ninguém lê pelo app: só as funções (chave de serviço)
--   corre_posts.ig_conta   em qual conta o post sai (tem que ser uma conta da dona do post)
--   corre_ig_fila_contas   a fila nova: só pega post programado com conta conectada e em dia
--   corre_correal_preco('voo')   o voo do Aeroporto de Londrina, no Correverso: 5 correais
-- Pra rodar: SQL Editor do Supabase, colar tudo, Run. No fim aparece "delta v3.40 ok".

create table if not exists public.corre_ig_contas (
  id           uuid primary key default gen_random_uuid(),
  dono         uuid not null references public.corre_perfis (id) on delete cascade,
  ig_id        text not null check (ig_id ~ '^[0-9]{1,30}$'),
  app_uid      text not null default '' check (char_length(app_uid) <= 40),
  username     text not null check (username ~ '^[A-Za-z0-9_.]{1,30}$'),
  nome         text not null default '' check (char_length(nome) <= 120),
  foto         text not null default '' check (char_length(foto) <= 1000),
  tipo         text not null default '' check (char_length(tipo) <= 30),
  status       text not null default 'ok' check (status in ('ok', 'expirou', 'revogada')),
  erro         text not null default '' check (char_length(erro) <= 300),
  expira_em    timestamptz,
  conectada_em timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (dono, ig_id)
);
create index if not exists corre_ig_contas_app_idx on public.corre_ig_contas (app_uid);
create index if not exists corre_ig_contas_expira_idx on public.corre_ig_contas (expira_em) where status = 'ok';
alter table public.corre_ig_contas enable row level security;
revoke all on public.corre_ig_contas from anon, authenticated;
grant select, delete on public.corre_ig_contas to authenticated;
drop policy if exists "ig contas: vejo as minhas" on public.corre_ig_contas;
create policy "ig contas: vejo as minhas" on public.corre_ig_contas for select to authenticated using (dono = auth.uid());
drop policy if exists "ig contas: desconecto as minhas" on public.corre_ig_contas;
create policy "ig contas: desconecto as minhas" on public.corre_ig_contas for delete to authenticated using (dono = auth.uid());

create table if not exists public.corre_ig_tokens (
  conta       uuid primary key references public.corre_ig_contas (id) on delete cascade,
  token       text not null check (char_length(token) <= 4000),
  renovado_em timestamptz not null default now()
);
alter table public.corre_ig_tokens enable row level security;
revoke all on public.corre_ig_tokens from anon, authenticated;

-- em qual conta o post sai (desconectou a conta: o post fica sem conta e vira "postar à mão")
alter table public.corre_posts add column if not exists ig_conta uuid references public.corre_ig_contas (id) on delete set null;
create index if not exists corre_posts_ig_conta_idx on public.corre_posts (ig_conta) where ig_conta is not null;
create or replace function public.corre_post_conta_ok() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.ig_conta is not null and not exists (select 1 from public.corre_ig_contas c where c.id = new.ig_conta and c.dono = new.dono) then
    raise exception 'conta de outra pessoa' using errcode = '42501', hint = 'ig_conta';
  end if;
  return new;
end $$;
drop trigger if exists corre_posts_conta on public.corre_posts;
create trigger corre_posts_conta before insert or update of ig_conta, dono on public.corre_posts
  for each row execute function public.corre_post_conta_ok();

-- a fila nova: post programado, vencido há no máximo 3 horas, com conta conectada (da dona do post) e em dia
create or replace function public.corre_ig_fila_contas(lim int default 10) returns setof public.corre_posts
language plpgsql volatile security definer set search_path = public as $$
begin
  -- post que ficou "publicando" mais de 15 minutos (a função caiu no meio) volta como erro, pra pessoa conferir
  update public.corre_posts set ig_status = 'erro', ig_erro = 'O Instagram não confirmou a tempo. Confere no perfil antes de publicar de novo.'
   where ig_status = 'publicando' and updated_at < now() - interval '15 minutes';
  return query
  update public.corre_posts p set ig_status = 'publicando', ig_tentativas = least(p.ig_tentativas + 1, 20)
   where p.id in (select q.id from public.corre_posts q
                   join public.corre_ig_contas c on c.id = q.ig_conta and c.dono = q.dono and c.status = 'ok'
                   where q.ig_status = 'agendado' and q.ig_quando <= now() and q.ig_quando > now() - interval '3 hours'
                     and q.ig_tentativas < 5
                   order by q.ig_quando limit greatest(1, least(coalesce(lim, 10), 25))
                   for update of q skip locked)
  returning p.*;
end $$;
revoke all on function public.corre_ig_fila_contas(int) from public, anon, authenticated;
grant execute on function public.corre_ig_fila_contas(int) to service_role;

-- CORREAL: o voo do Aeroporto de Londrina (no Correverso) sai por 5 correais. O app sempre pergunta antes; quem desconta
-- é o banco (corre_correal_gasta('voo')), com o mesmo cadeado e o mesmo extrato da IA. O preço fica aqui, não no app.
create or replace function public.corre_correal_preco(p_tipo text) returns int language sql immutable set search_path = public as $$
  select case p_tipo when 'imagem' then 10 when 'legenda' then 2 when 'abordagem' then 2 when 'marca' then 3 when 'voo' then 5 end $$;
create or replace function public.corre_correal_meu() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare u uuid := auth.uid(); s int;
begin
  if u is null then return null; end if;
  select saldo into s from public.corre_correal where dono = u;
  return jsonb_build_object('saldo', coalesce(s, 0), 'hoje', public.corre_correal_hoje(u), 'teto', 40,
    'precos', jsonb_build_object('imagem', public.corre_correal_preco('imagem'), 'legenda', public.corre_correal_preco('legenda'),
                                 'abordagem', public.corre_correal_preco('abordagem'), 'marca', public.corre_correal_preco('marca'),
                                 'voo', public.corre_correal_preco('voo')));
end $$;
revoke all on function public.corre_correal_meu() from public, anon;
grant execute on function public.corre_correal_meu() to authenticated;

select 'delta v3.40 ok' as status;
