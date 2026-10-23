\set ON_ERROR_STOP 1
-- v4.31: denunciar (post, story, perfil e conversa), a lista e a decisão dos donos, o aviso no celular dos donos e o
-- apagar a conta que apaga o login junto.
create function pg_temp.como(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false), set_config('request.jwt.claim.role', 'authenticated', false) $$;
create function pg_temp.tenta(q text) returns text language plpgsql as $$ declare h text; begin execute q; return 'passou'; exception when others then get stacked diagnostics h = pg_exception_hint; return coalesce(nullif(h, ''), sqlstate); end $$;
-- A posta, B e C denunciam, D é de fora, E denuncia demais, F e G apagam a conta
insert into corre_perfis (id, handle, nome) values
  ('00000000-0000-0000-0000-0000000431a1', 'ana431', 'Ana'), ('00000000-0000-0000-0000-0000000431b1', 'bia431', 'Bia'),
  ('00000000-0000-0000-0000-0000000431c1', 'caio431', 'Caio'), ('00000000-0000-0000-0000-0000000431d1', 'davi431', 'Davi'),
  ('00000000-0000-0000-0000-0000000431e1', 'eva431', 'Eva'), ('00000000-0000-0000-0000-0000000431f1', 'fred431', 'Fred'),
  ('00000000-0000-0000-0000-0000000431f2', 'gil431', 'Gil'), ('d1e9f6ac-f5d7-4723-8b02-eb0d1d7137b0', 'consanans', 'Thales')
  on conflict (id) do update set handle = excluded.handle;
insert into corre_feed (id, dono, texto, midia_url) values ('00000000-0000-0000-0000-0000000431f0', '00000000-0000-0000-0000-0000000431a1', 'Ganhe 5 mil no pix agora', 'https://x.supabase.co/storage/v1/object/public/corre/a/1.jpg');
insert into corre_stories (id, dono, texto) values ('00000000-0000-0000-0000-0000000431ff', '00000000-0000-0000-0000-0000000431a1', 'story feio');
-- a conversa de C com A: as mensagens de A vão na cópia, as de C não
insert into corre_conversa_membros (conversa, membro) values ('00000000-0000-0000-0000-0000000431cc', '00000000-0000-0000-0000-0000000431a1'),
  ('00000000-0000-0000-0000-0000000431cc', '00000000-0000-0000-0000-0000000431c1');
insert into corre_mensagens (conversa, dono, texto, created_at) values
  ('00000000-0000-0000-0000-0000000431cc', '00000000-0000-0000-0000-0000000431a1', 'me passa teu cartão', now() - interval '3 minutes'),
  ('00000000-0000-0000-0000-0000000431cc', '00000000-0000-0000-0000-0000000431c1', 'não vou passar', now() - interval '2 minutes'),
  ('00000000-0000-0000-0000-0000000431cc', '00000000-0000-0000-0000-0000000431a1', 'passa logo', now() - interval '1 minute');
create temp table r431 (k text primary key, v jsonb);
grant all on r431 to authenticated;

set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-0000000431b1');
insert into r431 select 'post', corre_denuncia('post', '00000000-0000-0000-0000-0000000431f0', 'golpe', 'é golpe de pix');
insert into r431 select 'post2', corre_denuncia('post', '00000000-0000-0000-0000-0000000431f0', 'spam', 'de novo');
insert into r431 select 'story', corre_denuncia('story', '00000000-0000-0000-0000-0000000431ff', 'odio');
insert into r431 select 'nada', corre_denuncia('post', gen_random_uuid(), 'golpe');
insert into r431 select 'motivo', corre_denuncia('post', '00000000-0000-0000-0000-0000000431f0', 'chato');
insert into r431 select 'tipo', corre_denuncia('grupo', '00000000-0000-0000-0000-0000000431f0', 'golpe');
insert into r431 select 'perfil', corre_denuncia('perfil', '00000000-0000-0000-0000-0000000431a1', 'falso');
select pg_temp.como('00000000-0000-0000-0000-0000000431a1');
insert into r431 select 'proprio', corre_denuncia('post', '00000000-0000-0000-0000-0000000431f0', 'golpe');
select pg_temp.como('00000000-0000-0000-0000-0000000431c1');
insert into r431 select 'postc', corre_denuncia('post', '00000000-0000-0000-0000-0000000431f0', 'golpe');
insert into r431 select 'conversa', corre_denuncia('conversa', '00000000-0000-0000-0000-0000000431a1', 'assedio', 'tá pedindo meu cartão', '00000000-0000-0000-0000-0000000431cc');
select pg_temp.como('00000000-0000-0000-0000-0000000431d1');
insert into r431 select 'defora', corre_denuncia('conversa', '00000000-0000-0000-0000-0000000431a1', 'assedio', '', '00000000-0000-0000-0000-0000000431cc');
insert into r431 select 'lista_naodono', corre_denuncias_lista('aberta', 60);
insert into r431 select 'abertas_naodono', to_jsonb(corre_denuncias_abertas());
insert into r431 select 'resolve_naodono', corre_denuncia_resolve('post', '00000000-0000-0000-0000-0000000431f0', 'tirar');
reset role;

select case when (select (v->>'ok')::boolean and v ? 'id' from r431 where k = 'post') and (select (v->>'ja')::boolean from r431 where k = 'post2')
            then 'ok: denuncia o post uma vez; de novo, diz que já denunciou' else 'FALHOU: denunciar o post' end;
select case when (select trecho from corre_denuncias where tipo = 'post' and quem = '00000000-0000-0000-0000-0000000431b1') = 'Ganhe 5 mil no pix agora'
             and (select midia from corre_denuncias where tipo = 'post' and quem = '00000000-0000-0000-0000-0000000431b1') like 'https://%'
             and (select dono from corre_denuncias where tipo = 'post' and quem = '00000000-0000-0000-0000-0000000431b1') = '00000000-0000-0000-0000-0000000431a1'
            then 'ok: a denúncia guarda a cópia do post, a foto e de quem é' else 'FALHOU: a cópia do post' end;
select case when (select v->>'motivo' from r431 where k = 'nada') = 'nao' and (select v->>'motivo' from r431 where k = 'motivo') = 'motivo'
             and (select v->>'motivo' from r431 where k = 'tipo') = 'tipo' and (select v->>'motivo' from r431 where k = 'proprio') = 'proprio'
            then 'ok: recusa o que não existe, o motivo e o tipo estranhos, e denunciar a si mesmo' else 'FALHOU: as recusas' end;
select case when (select trecho from corre_denuncias where tipo = 'perfil') like '@ana431%' and (select (v->>'ok')::boolean from r431 where k = 'story')
            then 'ok: denuncia o perfil (com o @ na cópia) e o story' else 'FALHOU: perfil ou story' end;
select case when (select trecho from corre_denuncias where tipo = 'conversa') = E'me passa teu cartão\npassa logo'
             and (select v->>'motivo' from r431 where k = 'defora') = 'nao'
            then 'ok: a conversa leva só as mensagens de quem foi denunciado, e quem não tá na conversa não denuncia por ela'
            else format('FALHOU: a conversa (%s)', (select trecho from corre_denuncias where tipo = 'conversa')) end;
select case when (select v is null from r431 where k = 'lista_naodono') and (select v from r431 where k = 'abertas_naodono') = '0'::jsonb
             and (select v->>'motivo' from r431 where k = 'resolve_naodono') = 'dono'
             and exists (select 1 from corre_feed where id = '00000000-0000-0000-0000-0000000431f0')
            then 'ok: quem não é dono não vê a lista nem tira nada do ar' else 'FALHOU: quem não é dono' end;
select case when not has_table_privilege('authenticated', 'corre_denuncias', 'select') and not has_table_privilege('authenticated', 'corre_denuncias', 'insert')
             and not has_function_privilege('anon', 'corre_denuncia(text, uuid, text, text, uuid)', 'execute')
             and not has_function_privilege('authenticated', 'corre_denuncia_alvos(timestamptz)', 'execute')
            then 'ok: o app não lê nem escreve a tabela direto; sem login não denuncia' else 'FALHOU: os direitos' end;

-- o aviso dos donos: o fundador tem aparelho; a primeira volta avisa, a segunda não repete
insert into corre_push (endpoint, dono, p256dh, auth) values ('https://fcm.googleapis.com/fcm/send/teste431', 'd1e9f6ac-f5d7-4723-8b02-eb0d1d7137b0', 'p', 'a') on conflict do nothing;
create temp table a431 as select corre_denuncia_alvos() as v1;
alter table a431 add column v2 jsonb; update a431 set v2 = corre_denuncia_alvos();
select case when jsonb_array_length(v1) = 5 and (select bool_and(x->>'para' = 'd1e9f6ac-f5d7-4723-8b02-eb0d1d7137b0' and x->'payload'->>'url' = '/#/lojinha') from jsonb_array_elements(v1) x)
             and jsonb_array_length(v2) = 0
             and (select bool_or(x->'payload'->>'corpo' like 'Um post de @ana431 foi denunciado (golpe)%') from jsonb_array_elements(v1) x)
            then 'ok: o dono recebe um aviso por denúncia, e a segunda volta não repete' else format('FALHOU: o aviso dos donos %s / %s', jsonb_array_length(v1), jsonb_array_length(v2)) end from a431;

set role authenticated;
select pg_temp.como('d1e9f6ac-f5d7-4723-8b02-eb0d1d7137b0');
insert into r431 select 'abertas', to_jsonb(corre_denuncias_abertas());
insert into r431 select 'lista', corre_denuncias_lista('aberta', 60);
insert into r431 select 'tira_perfil', corre_denuncia_resolve('perfil', '00000000-0000-0000-0000-0000000431a1', 'tirar');
insert into r431 select 'tira_post', corre_denuncia_resolve('post', '00000000-0000-0000-0000-0000000431f0', 'tirar');
insert into r431 select 'ok_conversa', corre_denuncia_resolve('conversa', '00000000-0000-0000-0000-0000000431a1', 'ok');
insert into r431 select 'abertas2', to_jsonb(corre_denuncias_abertas());
insert into r431 select 'tiradas', corre_denuncias_lista('tirada', 60);
reset role;
select case when (select v from r431 where k = 'abertas') = '4'::jsonb
             and (select (x->>'n')::int = 2 and x->'motivos' @> '["golpe"]' and (x->>'existe')::boolean and x->>'handle' = 'ana431'
                    from r431, jsonb_array_elements(v) x where k = 'lista' and x->>'tipo' = 'post')
            then 'ok: o dono vê 4 coisas abertas, e o post junta as duas denúncias' else 'FALHOU: a lista do dono' end;
select case when (select v->>'motivo' from r431 where k = 'tira_perfil') = 'acao' and (select (v->>'n')::int from r431 where k = 'tira_post') = 2
             and not exists (select 1 from corre_feed where id = '00000000-0000-0000-0000-0000000431f0')
             and (select (v->>'n')::int from r431 where k = 'ok_conversa') = 1 and (select v from r431 where k = 'abertas2') = '2'::jsonb
             and (select not (x->>'existe')::boolean from r431, jsonb_array_elements(v) x where k = 'tiradas' and x->>'tipo' = 'post')
            then 'ok: tirar do ar apaga o post e fecha as duas denúncias; perfil não se tira; conversa fica vista'
            else 'FALHOU: a decisão do dono' end;

-- 30 por dia: a 31ª espera
insert into corre_denuncias (quem, tipo, alvo, dono, motivo) select '00000000-0000-0000-0000-0000000431e1', 'perfil', gen_random_uuid(), '00000000-0000-0000-0000-0000000431a1', 'spam' from generate_series(1, 30);
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-0000000431e1');
insert into r431 select 'devagar', corre_denuncia('perfil', '00000000-0000-0000-0000-0000000431a1', 'spam');
reset role;
select case when (select v->>'motivo' from r431 where k = 'devagar') = 'devagar' then 'ok: depois de 30 denúncias no dia, espera' else 'FALHOU: o limite do dia' end;

-- apagar a conta: o perfil e o login somem; com plano rodando no Asaas, nada some
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000431f1'), ('00000000-0000-0000-0000-0000000431f2') on conflict do nothing;
insert into corre_assinaturas (dono, produto, nivel, valor, status, asaas_assinatura) values ('00000000-0000-0000-0000-0000000431f2', 'horus', 1, 9.90, 'ativa', 'sub_431')
  on conflict (dono, produto) do update set status = 'ativa', asaas_assinatura = 'sub_431';
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-0000000431f1');
insert into r431 select 'apaga', corre_apaga_minha_conta();
select pg_temp.como('00000000-0000-0000-0000-0000000431f2');
insert into r431 select 'apaga_plano', to_jsonb(pg_temp.tenta('select corre_apaga_minha_conta()'));
reset role;
select case when (select (v->>'ok')::boolean from r431 where k = 'apaga')
             and not exists (select 1 from corre_perfis where id = '00000000-0000-0000-0000-0000000431f1')
             and not exists (select 1 from auth.users where id = '00000000-0000-0000-0000-0000000431f1')
            then 'ok: apagar a conta tira o perfil e o login' else 'FALHOU: apagar a conta' end;
select case when (select v from r431 where k = 'apaga_plano') = '"assinatura_ativa"'::jsonb
             and exists (select 1 from corre_perfis where id = '00000000-0000-0000-0000-0000000431f2')
             and exists (select 1 from auth.users where id = '00000000-0000-0000-0000-0000000431f2')
             and not has_function_privilege('anon', 'corre_apaga_minha_conta()', 'execute')
            then 'ok: com plano rodando no Asaas não apaga nada; sem login não chama' else 'FALHOU: apagar com plano ativo' end;
select set_config('request.jwt.claim.role', '', false), set_config('request.jwt.claim.sub', '', false);
