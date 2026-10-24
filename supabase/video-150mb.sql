-- v4.38 · rodar SÓ depois que o projeto estiver no plano Pro do Supabase e o "Global file size limit" (Storage ›
-- Settings) estiver em 150 MB ou mais. Sobe a pasta dos vídeos do Studio pra 150 MB; o app lê na hora (sem zip novo).
-- Pra voltar: o mesmo com 52428800 (50 MB). Pode rodar duas vezes.
update storage.buckets set file_size_limit = 157286400 where id = 'corre-video';

select id, file_size_limit / 1048576 as mb from storage.buckets where id = 'corre-video';
