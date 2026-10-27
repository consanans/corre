-- o que a v5.0 lê e que o Supabase de mentira ainda não tinha (as colunas como estão na produção, lidas em 27/10/2026)
alter table public.corre_perfis add column if not exists categoria text, add column if not exists cidade text,
  add column if not exists desbaratinado boolean not null default false, add column if not exists bio text default '',
  add column if not exists avatar_url text default '', add column if not exists faz text default '';
alter table public.corre_produtos add column if not exists ordem integer, add column if not exists created_at timestamptz default now(),
  add column if not exists preco numeric, add column if not exists unidade text not null default '';
alter table public.corre_mural add column if not exists codigo text, add column if not exists cidade text, add column if not exists uf text,
  add column if not exists remoto boolean not null default false, add column if not exists quando text, add column if not exists whats text,
  add column if not exists descricao text;
