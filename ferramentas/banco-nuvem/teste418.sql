\set ON_ERROR_STOP 1
-- v4.18: a hora de postar. Cinco pessoas, cada uma com um caso; os posts entram como servidor (o gatilho do Instagram só
-- calcula a hora pro app), com a hora já posta, então o teste não depende da hora em que roda.
create function pg_temp.como(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false), set_config('request.jwt.claim.role', 'authenticated', false) $$;
create function pg_temp.tenta(q text) returns text language plpgsql as $$
begin execute q; return 'passou'; exception when others then return coalesce(nullif(sqlerrm, ''), 'erro'); end $$;
create temp table av (k text primary key, v jsonb);

-- a agência (com aparelho, sem conta conectada), quem desligou "Hora de postar", quem não tem aparelho, quem tem a conta
-- conectada (e uma vencida) e quem esconde o texto
insert into corre_perfis (id, handle, nome) values ('00000000-0000-0000-0000-000000041801', 'agencia418', 'Agência'),
  ('00000000-0000-0000-0000-000000041802', 'desligou418', 'Desligou'), ('00000000-0000-0000-0000-000000041803', 'sem418', 'Sem aparelho'),
  ('00000000-0000-0000-0000-000000041804', 'conta418', 'Com conta'), ('00000000-0000-0000-0000-000000041805', 'muda418', 'Esconde');
insert into corre_portfolio (id, dono, marca, rede, cor, logo_url) values
  ('00000000-0000-0000-0000-0000000418a1', '00000000-0000-0000-0000-000000041801', 'Padaria Sol', 'padariasol', '#FFE800', 'https://x.supabase.co/storage/v1/object/public/corre/logo.png'),
  ('00000000-0000-0000-0000-0000000418a2', '00000000-0000-0000-0000-000000041802', 'Marca B', 'b', '#FF48B0', ''),
  ('00000000-0000-0000-0000-0000000418a3', '00000000-0000-0000-0000-000000041803', 'Marca C', 'c', '#FF48B0', ''),
  ('00000000-0000-0000-0000-0000000418a4', '00000000-0000-0000-0000-000000041804', 'Marca D', 'd', '#FF48B0', 'http://sem-https/logo.png'),
  ('00000000-0000-0000-0000-0000000418a5', '00000000-0000-0000-0000-000000041805', 'Marca E', 'e', '#FF48B0', '');
insert into corre_push (endpoint, dono, p256dh, auth, visto_em)
  select 'https://web.push.apple.com/' || handle, id, 'p', 'a', now() from corre_perfis where handle in ('agencia418', 'desligou418', 'conta418', 'muda418');
insert into corre_push_pref (dono, postar) values ('00000000-0000-0000-0000-000000041802', false);
insert into corre_push_pref (dono, texto) values ('00000000-0000-0000-0000-000000041805', false);
insert into corre_ig_contas (id, dono, ig_id, username, status) values
  ('00000000-0000-0000-0000-0000000418c1', '00000000-0000-0000-0000-000000041804', '1', 'marcad', 'ok'),
  ('00000000-0000-0000-0000-0000000418c2', '00000000-0000-0000-0000-000000041804', '2', 'marcad2', 'expirou');

-- os posts (titulo = o caso)
insert into corre_posts (dono, marca_id, titulo, formato, midias, data, hora, midia_url, status, ig_status, ig_quando, ig_conta) values
  ('00000000-0000-0000-0000-000000041801', '00000000-0000-0000-0000-0000000418a1', 'Promo de sexta', 'feed', '[]', current_date, '18:00', 'https://x/1.jpg', 'pronto', 'agendado', now() - interval '2 minutes', null),
  ('00000000-0000-0000-0000-000000041801', '00000000-0000-0000-0000-0000000418a1', 'Ainda não', 'feed', '[]', current_date, '23:00', 'https://x/2.jpg', 'pronto', 'agendado', now() + interval '1 hour', null),
  ('00000000-0000-0000-0000-000000041801', '00000000-0000-0000-0000-0000000418a1', 'Velho', 'feed', '[]', current_date, '08:00', 'https://x/3.jpg', 'pronto', 'agendado', now() - interval '2 hours', null),
  ('00000000-0000-0000-0000-000000041801', '00000000-0000-0000-0000-0000000418a1', 'Já postei', 'feed', '[]', current_date, '18:00', 'https://x/4.jpg', 'postado', 'agendado', now() - interval '1 minute', null),
  ('00000000-0000-0000-0000-000000041801', '00000000-0000-0000-0000-0000000418a1', 'Sem arte', 'feed', '[]', current_date, '18:00', '', 'pronto', 'agendado', now() - interval '1 minute', null),
  ('00000000-0000-0000-0000-000000041801', '00000000-0000-0000-0000-0000000418a1', 'O carrossel', 'carrossel', '[{"u":"https://x/c1.jpg","t":"img"},{"u":"https://x/c2.jpg","t":"img"},{"u":"https://x/c3.mp4","t":"video"}]', current_date, '18:00', 'https://x/c1.jpg', 'pronto', 'agendado', now() - interval '1 minute', null),
  ('00000000-0000-0000-0000-000000041801', '00000000-0000-0000-0000-0000000418a1', 'O story', 'story', '[{"u":"https://x/s.jpg","t":"img"}]', current_date, '18:00', 'https://x/s.jpg', 'pronto', 'agendado', now(), null),
  ('00000000-0000-0000-0000-000000041801', '00000000-0000-0000-0000-0000000418a1', 'Recusado', 'reels', '[{"u":"https://x/r.mp4","t":"video"}]', current_date, '17:40', 'https://x/r.jpg', 'pronto', 'erro', now() - interval '20 minutes', null),
  ('00000000-0000-0000-0000-000000041802', '00000000-0000-0000-0000-0000000418a2', 'Desligou', 'feed', '[]', current_date, '18:00', 'https://x/b.jpg', 'pronto', 'agendado', now() - interval '1 minute', null),
  ('00000000-0000-0000-0000-000000041803', '00000000-0000-0000-0000-0000000418a3', 'Sem aparelho', 'feed', '[]', current_date, '18:00', 'https://x/c.jpg', 'pronto', 'agendado', now() - interval '1 minute', null),
  ('00000000-0000-0000-0000-000000041804', '00000000-0000-0000-0000-0000000418a4', 'Sai sozinho', 'feed', '[]', current_date, '18:00', 'https://x/d1.jpg', 'pronto', 'agendado', now() - interval '1 minute', '00000000-0000-0000-0000-0000000418c1'),
  ('00000000-0000-0000-0000-000000041804', '00000000-0000-0000-0000-0000000418a4', 'Conta vencida', 'feed', '[]', current_date, '18:00', 'https://x/d2.jpg', 'pronto', 'agendado', now() - interval '1 minute', '00000000-0000-0000-0000-0000000418c2'),
  ('00000000-0000-0000-0000-000000041805', '00000000-0000-0000-0000-0000000418a5', 'Segredo', 'feed', '[]', current_date, '18:00', 'https://x/e.jpg', 'pronto', 'agendado', now() - interval '1 minute', null);

-- quem é do app não chama nada disso
select pg_temp.como('00000000-0000-0000-0000-000000041801'); set role authenticated;
select case when pg_temp.tenta('select corre_postar_alvos(now())') like 'permission denied%'
   and pg_temp.tenta('select corre_postar_tem(now())') like 'permission denied%'
   and pg_temp.tenta('select * from corre_postar_fila(now())') like 'permission denied%'
  then 'ok: o app não chama a lista, a fila nem a conferência da hora de postar' else 'FALHOU: o app chamou' end;
-- os ajustes: "postar" nasce ligado, a pessoa desliga e liga, e campo desconhecido segue recusado
select case when (corre_push_ajustes(null)->>'postar')::boolean and (corre_push_ajustes(null)->>'lembra')::boolean
  then 'ok: os ajustes trazem "Hora de postar" ligado (e os lembretes como antes)' else 'FALHOU: ajustes ' || corre_push_ajustes(null)::text end;
select case when (corre_push_ajusta('postar', false)->>'postar')::boolean = false and (corre_push_ajusta('postar', true)->>'postar')::boolean
  then 'ok: dá pra desligar e ligar a hora de postar' else 'FALHOU: desligar' end;
select case when pg_temp.tenta($$select corre_push_ajusta('postaar', false)$$) = 'campo' then 'ok: campo desconhecido segue recusado' else 'FALHOU: campo' end;
reset role;

-- a volta do relógio
select case when corre_postar_tem(now()) then 'ok: tem post na hora (o relógio chama a função)' else 'FALHOU: tem' end;
insert into av select 'r1', corre_postar_alvos(now());
create temp view vv as select x->>'para' para, x->>'tipo' tipo, x->'payload' p, x->'subs' subs from av, jsonb_array_elements(av.v) x where av.k = 'r1';
select case when (select string_agg(p->>'corpo', ' | ' order by p->>'corpo') from vv where para = '00000000-0000-0000-0000-000000041801')
             = 'Carrossel de 3: O carrossel. Toca pra postar: a legenda vai copiada. | Post: Promo de sexta. Toca pra postar: a legenda vai copiada. | Reels das 17:40: Recusado. O Instagram recusou; toca pra postar à mão. | Story: O story. Toca e já vai pro story.'
  then 'ok: a agência recebe os 3 que venceram e o recusado (não o de daqui a 1 hora, o velho, o postado nem o sem arte)'
  else 'FALHOU: agência ' || coalesce((select string_agg(p->>'corpo', ' | ' order by p->>'corpo') from vv where para = '00000000-0000-0000-0000-000000041801'), 'nada') end;
select case when (select count(*) from vv where p->>'titulo' = 'Hora de postar · Padaria Sol') = 3
   and (select count(*) from vv where p->>'titulo' = 'Não saiu no Instagram · Padaria Sol' and tipo = 'erro') = 1
  then 'ok: o título diz a marca, e o recusado diz que não saiu' else 'FALHOU: títulos' end;
select case when (select bool_and(p->>'url' = '/#/studio/postar/' || (select id from corre_posts where titulo = 'Promo de sexta')) from vv where p->>'corpo' like 'Post: Promo%')
   and (select bool_and(p->>'icone' = 'https://x.supabase.co/storage/v1/object/public/corre/logo.png' and p->>'t' = 'postar' and p->>'tag' like 'postar-%') from vv where para = '00000000-0000-0000-0000-000000041801')
  then 'ok: o aviso abre o post no Studio e o ícone é o logo da marca' else 'FALHOU: url ou ícone' end;
select case when not exists (select 1 from vv where para in ('00000000-0000-0000-0000-000000041802', '00000000-0000-0000-0000-000000041803'))
  then 'ok: quem desligou ou não tem aparelho não recebe' else 'FALHOU: desligou ou sem aparelho' end;
select case when (select string_agg(p->>'corpo', '|') from vv where para = '00000000-0000-0000-0000-000000041804') = 'Post: Conta vencida. Toca pra postar: a legenda vai copiada.'
   and (select p->>'icone' from vv where para = '00000000-0000-0000-0000-000000041804') = ''
  then 'ok: post com conta que vale sai sozinho (sem aviso); com a conta vencida, avisa (logo sem https não vai)' else 'FALHOU: conta' end;
select case when (select p->>'corpo' from vv where para = '00000000-0000-0000-0000-000000041805') = 'Post. Toca pra postar: a legenda vai copiada.'
  then 'ok: quem esconde o texto recebe sem o título do post' else 'FALHOU: texto escondido' end;
select case when not corre_postar_tem(now()) and corre_postar_alvos(now()) = '[]'::jsonb
  then 'ok: chamar de novo não manda nada (cada um foi marcado antes de sair)' else 'FALHOU: repetiu' end;

-- reprogramou (a pessoa mudou a hora): avisa de novo na hora nova; marcou como postado: não avisa
update corre_posts set ig_quando = now() - interval '30 seconds' where titulo = 'Promo de sexta';
update corre_posts set ig_quando = now() - interval '30 seconds', status = 'postado' where titulo = 'O carrossel';
select case when (select string_agg(x->'payload'->>'corpo', '|') from jsonb_array_elements(corre_postar_alvos(now())) x) = 'Post: Promo de sexta. Toca pra postar: a legenda vai copiada.'
  then 'ok: reprogramado avisa de novo; postado à mão não' else 'FALHOU: reprogramado' end;

-- um mês inteiro na mesma hora: 10 por volta, o resto na próxima
insert into corre_posts (dono, marca_id, titulo, formato, midias, data, hora, midia_url, status, ig_status, ig_quando)
  select '00000000-0000-0000-0000-000000041801', '00000000-0000-0000-0000-0000000418a1', 'Lote ' || g, 'feed', '[]', current_date, '18:00', 'https://x/l' || g || '.jpg', 'pronto', 'agendado', now() - interval '1 minute'
    from generate_series(1, 12) g;
select case when jsonb_array_length(corre_postar_alvos(now())) = 10 and jsonb_array_length(corre_postar_alvos(now())) = 2
  then 'ok: no máximo 10 avisos por pessoa numa volta, o resto na seguinte' else 'FALHOU: lote' end;
