-- v4.38 · O VÍDEO DO STUDIO ATÉ 150 MB. O Thales (24/10/2026): "aumenta a capacidade de arquivo no studio de 50 mb pra
-- 150mb".
-- O tamanho máximo do vídeo passa a morar num lugar só: o limite da pasta corre-video do Storage. O app pergunta pra
-- corre_video_limite() e segue o que ela disser, então subir o limite não pede zip novo.
-- Por que a pasta não sobe pra 150 MB aqui: no plano grátis do Supabase, nenhum arquivo passa de 50 MB (o "Global file
-- size limit" do projeto, que fica fora do banco). Pôr 150 na pasta antes disso faria o app prometer 150 e o servidor
-- recusar acima de 50. Quando o projeto for pro plano Pro e o limite global for pra 150 MB (Storage › Settings), roda o
-- supabase/video-150mb.sql e o app passa a aceitar 150 na hora.
-- Pode rodar duas vezes. Sem DROP.
begin;

create or replace function public.corre_video_limite() returns bigint
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v bigint;
begin
  -- sem o Storage (o banco de teste), não tem limite pra dizer: o app fica nos 50 MB de antes
  if to_regclass('storage.buckets') is null then return null; end if;
  execute 'select file_size_limit from storage.buckets where id = $1' into v using 'corre-video';
  return v;
end $$;
revoke all on function public.corre_video_limite() from public, anon;
grant execute on function public.corre_video_limite() to authenticated;

commit;

select 'delta v4.38 ok';
