-- v4.39 · O CARROSSEL ATÉ 20. O Thales (25/10/2026): "na verdade o insta permite subir 20 imagens por carrossel,
-- precisa corrigir no studio".
-- O app do Instagram aceita 20 por carrossel; a API da Meta, que o Corre usa pra postar sozinho, ainda vai até 10.
--   corre_posts_midias_check  as mídias do post vão até 20 (eram 10).
--   corre_posts_ig_ok         o gatilho da v4.17, igual, mais: carrossel com mais de 10 fica sem conta do Instagram, então
--                             vira lembrete (a hora de postar da v4.18 avisa no celular e a fila do Instagram não pega).
-- Precisa da v4.17. Pode rodar duas vezes. Troca uma regra da tabela (a de antes sai e a nova entra no mesmo comando).
-- Depois dele, não rodar o delta-v417.sql de novo (ele volta o gatilho de antes; aí é só rodar este de novo).
begin;

do $$ begin
  if to_regprocedure('public.corre_posts_ig_ok()') is null then raise exception 'rode antes o delta-v417.sql (os formatos)'; end if;
end $$;

-- 1) até 20 mídias
alter table public.corre_posts drop constraint if exists corre_posts_midias_check,
  add constraint corre_posts_midias_check check (jsonb_typeof(midias) = 'array' and jsonb_array_length(midias) <= 20 and pg_column_size(midias) < 20000);

-- 2) o gatilho
create or replace function public.corre_posts_ig_ok() returns trigger
language plpgsql as $$
declare i jsonb; n int;
begin
  -- a função (chave de serviço) e o próprio banco podem tudo; quem vem pelo app só programa ou cancela
  if current_user not in ('authenticated', 'anon') then return new; end if;
  -- v4.17: as mídias do carrossel, do story e do reels: endereço https e o tipo (foto ou vídeo)
  for i in select x from jsonb_array_elements(case when jsonb_typeof(new.midias) = 'array' then new.midias else '[]'::jsonb end) x loop
    if jsonb_typeof(i) <> 'object' or coalesce(i ->> 'u', '') !~ '^https://\S{3,}$' or length(i ->> 'u') > 500 or coalesce(i ->> 't', '') not in ('img', 'video') then
      raise exception 'midias' using errcode = 'P0001', hint = 'midias';
    end if;
  end loop;
  if tg_op = 'INSERT' then
    if new.ig_status not in ('', 'agendado') or new.ig_media_id <> '' or new.ig_link <> '' or new.ig_tentativas <> 0 or new.ig_container <> '' then
      raise exception 'ig' using errcode = 'P0001', hint = 'ig';
    end if;
    new.ig_erro := '';
    -- a aprovação é do cliente (pelo link): post novo nasce sem
    new.aprov := ''; new.aprov_nota := ''; new.aprov_quem := ''; new.aprov_em := null;
  else
    if new.ig_media_id is distinct from old.ig_media_id or new.ig_link is distinct from old.ig_link or new.ig_tentativas is distinct from old.ig_tentativas
       or new.ig_container is distinct from old.ig_container then
      raise exception 'ig' using errcode = 'P0001', hint = 'ig';
    end if;
    if new.ig_status is distinct from old.ig_status then
      if old.ig_status in ('publicando', 'publicado') or new.ig_status not in ('', 'agendado') then
        raise exception 'ig' using errcode = 'P0001', hint = 'ig';
      end if;
      -- programar de novo (ou cancelar) zera o erro, as tentativas e o contêiner
      new.ig_erro := ''; new.ig_tentativas := 0; new.ig_container := '';
    elsif new.ig_erro is distinct from old.ig_erro and new.ig_erro <> '' then
      raise exception 'ig' using errcode = 'P0001', hint = 'ig';
    end if;
    -- mudou a arte, as mídias ou o formato: o contêiner que o Instagram processava não vale mais
    if new.midia_url is distinct from old.midia_url or new.midias is distinct from old.midias or new.formato is distinct from old.formato then
      new.ig_container := '';
    end if;
    -- a aprovação: quem escreve é o cliente (pelo link); a dona só limpa
    new.aprov_nota := old.aprov_nota; new.aprov_quem := old.aprov_quem; new.aprov_em := old.aprov_em;
    if new.aprov is distinct from old.aprov and new.aprov <> '' then new.aprov := old.aprov; end if;
    -- mudou o que o cliente viu: volta pra ele aprovar de novo (a nota do pedido de ajuste fica, como histórico)
    if old.aprov <> '' and (new.legenda is distinct from old.legenda or new.midia_url is distinct from old.midia_url
       or new.midias is distinct from old.midias or new.formato is distinct from old.formato) then
      new.aprov := '';
    end if;
  end if;
  -- v4.39: carrossel de 11 a 20 não sai sozinho (a API do Instagram vai até 10): fica sem conta e vira lembrete (a hora
  -- de postar avisa no celular, e a fila do Instagram não pega post sem conta)
  if new.formato = 'carrossel' and jsonb_array_length(coalesce(new.midias, '[]'::jsonb)) > 10 then new.ig_conta := null; end if;
  -- programado: a hora de publicar sai da data e da hora do post (Brasília), sempre
  if new.ig_status = 'agendado' then
    if new.data is null then raise exception 'ig_quando' using errcode = 'P0001', hint = 'ig_quando'; end if;
    -- v4.17: e o post tem que estar completo pro formato dele
    n := jsonb_array_length(new.midias);
    if (new.formato = 'carrossel' and n < 2) or (new.formato in ('story', 'reels') and n <> 1)
       or (new.formato = 'reels' and coalesce(new.midias -> 0 ->> 't', '') <> 'video') then
      raise exception 'formato' using errcode = 'P0001', hint = 'formato';
    end if;
    new.ig_quando := (new.data + coalesce(nullif(new.hora, ''), '12:00')::time) at time zone 'America/Sao_Paulo';
  end if;
  return new;
end $$;

commit;

select 'delta v4.39 ok';
