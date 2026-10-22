-- v4.21 · O CADERNINHO COM ENDEREÇO E ARQUIVOS (o Thales: "endereço puxa o endereço no google maps e pode adicionar
-- arquivos/documentos também").
--
--   corre_caderno.endereco   até 300 letras. No app vira o botão do Google Maps (busca e rota); nada vai pro Google
--                            antes da pessoa tocar.
--   corre_caderno.anexos     até 10 arquivos: [{ p (o caminho na pasta), n (o nome), t (o tipo), s (o tamanho) }].
--   corre-anexos             a pasta dos arquivos, PRIVADA (documento é coisa da pessoa): cada um sobe, lê e apaga só
--                            na pasta do próprio login; o app abre com link assinado que vence em 1 hora. Até 20 MB.
--
-- Precisa da v4.19. Pode rodar duas vezes. Sem DROP.
begin;

do $$
begin
  if to_regclass('public.corre_caderno') is null then
    raise exception 'o delta v4.21 precisa do delta-v419.sql antes (o Caderninho)';
  end if;
end $$;

alter table public.corre_caderno add column if not exists endereco text not null default '';
alter table public.corre_caderno add column if not exists anexos jsonb not null default '[]'::jsonb;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'corre_caderno_endereco_check') then
    alter table public.corre_caderno add constraint corre_caderno_endereco_check check (char_length(endereco) <= 300);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'corre_caderno_anexos_check') then
    alter table public.corre_caderno add constraint corre_caderno_anexos_check
      check (jsonb_typeof(anexos) = 'array' and jsonb_array_length(anexos) <= 10 and pg_column_size(anexos) <= 8000);
  end if;
end $$;

-- o arquivo tem que ser da pasta da própria dona (ninguém pendura o documento dos outros na tarefa)
create or replace function public.corre_caderno_anexos_ok() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare a jsonb;
begin
  for a in select * from jsonb_array_elements(new.anexos) loop
    if jsonb_typeof(a) <> 'object' or coalesce(a->>'p', '') !~ ('^' || new.dono::text || '/[A-Za-z0-9._-]{1,120}$')
       or char_length(coalesce(a->>'n', '')) not between 1 and 120 then
      raise exception 'anexo' using hint = 'anexo';
    end if;
  end loop;
  return new;
end $$;
create or replace trigger corre_caderno_anexos_ok before insert or update of anexos on public.corre_caderno
  for each row execute function public.corre_caderno_anexos_ok();

-- a pasta privada
do $$
begin
  if to_regclass('storage.buckets') is null then return; end if;
  insert into storage.buckets (id, name, public, file_size_limit)
  values ('corre-anexos', 'corre-anexos', false, 20971520)
  on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'corre-anexos: subo na minha pasta') then
    execute $p$create policy "corre-anexos: subo na minha pasta" on storage.objects for insert to authenticated with check (bucket_id = 'corre-anexos' and (storage.foldername(name))[1] = (auth.uid())::text)$p$;
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'corre-anexos: vejo minha pasta') then
    execute $p$create policy "corre-anexos: vejo minha pasta" on storage.objects for select to authenticated using (bucket_id = 'corre-anexos' and (storage.foldername(name))[1] = (auth.uid())::text)$p$;
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'corre-anexos: apago na minha pasta') then
    execute $p$create policy "corre-anexos: apago na minha pasta" on storage.objects for delete to authenticated using (bucket_id = 'corre-anexos' and (storage.foldername(name))[1] = (auth.uid())::text)$p$;
  end if;
end $$;

commit;

select case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'corre_caderno' and column_name = 'endereco')
             and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'corre_caderno' and column_name = 'anexos')
             and exists (select 1 from pg_trigger where tgname = 'corre_caderno_anexos_ok')
             -- (a pasta só existe no Supabase: no banco de teste não tem storage, e ela é conferida só se tiver)
             and case when to_regclass('storage.buckets') is null then true
                      else (xpath('/row/n/text()', query_to_xml('select count(*) as n from storage.buckets where id = ''corre-anexos'' and not public', false, true, '')))[1]::text = '1' end
            then 'delta v4.21 ok' else 'delta v4.21 NÃO TERMINOU: rode o arquivo inteiro de novo.' end as status;
