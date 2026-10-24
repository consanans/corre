\set ON_ERROR_STOP 1
-- v4.38: o tamanho máximo do vídeo do Studio é o da pasta corre-video, lido pela corre_video_limite(). Sem o Storage
-- (este banco de teste não tem), ela não diz nada e o app fica nos 50 MB. Com a pasta, diz o limite dela, e subir a
-- pasta muda o que ela diz. Só quem tá logado pergunta.
select case when public.corre_video_limite() is null then 'ok: sem o Storage, a função não inventa limite' else 'FALHOU: sem o Storage devolveu ' || public.corre_video_limite() end;
select case when has_function_privilege('authenticated', 'public.corre_video_limite()', 'execute') and not has_function_privilege('anon', 'public.corre_video_limite()', 'execute')
            then 'ok: quem tá logado pergunta o limite, o anônimo não' else 'FALHOU: a permissão da corre_video_limite' end;
begin;
create schema if not exists storage;
create table if not exists storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
insert into storage.buckets (id, name, public, file_size_limit) values ('corre-video', 'corre-video', true, 52428800), ('corre', 'corre', true, 5242880)
  on conflict (id) do update set file_size_limit = excluded.file_size_limit;
select case when public.corre_video_limite() = 52428800 then 'ok: com a pasta de 50 MB, diz 50 MB' else 'FALHOU: com a pasta devolveu ' || coalesce(public.corre_video_limite()::text, 'nada') end;
\ir ../../supabase/video-150mb.sql
select case when public.corre_video_limite() = 157286400 then 'ok: o video-150mb.sql sobe a pasta e a função passa a dizer 150 MB' else 'FALHOU: depois do video-150mb.sql devolveu ' || coalesce(public.corre_video_limite()::text, 'nada') end;
rollback;
