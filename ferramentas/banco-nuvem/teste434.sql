\set ON_ERROR_STOP 1
-- v4.34: o Atendente 24h (a ficha, as conversas com os limites, o cliente que vira lead e o aviso) e o Piloto automático
-- (as quatro receitas, sem repetir antes do tempo).
create function pg_temp.como(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false), set_config('request.jwt.claim.role', 'authenticated', false) $$;
create function pg_temp.tenta(q text) returns text language plpgsql as $$ declare h text; begin execute q; return 'passou'; exception when others then get stacked diagnostics h = pg_exception_hint; return coalesce(nullif(h, ''), sqlstate); end $$;
-- A tem o atendente e o piloto, B é outra pessoa
insert into corre_perfis (id, handle, nome) values
  ('00000000-0000-0000-0000-0000000434a1', 'ana434', 'Ana Souza'), ('00000000-0000-0000-0000-0000000434b1', 'bia434', 'Bia')
  on conflict (id) do update set handle = excluded.handle, nome = excluded.nome;
create temp table r434 (k text primary key, v jsonb);
grant all on r434 to authenticated, anon;

-- ---------- a ficha ----------
set role anon;
insert into r434 select 'info0', corre_atende_info('@ana434');
reset role;
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-0000000434a1');
insert into r434 select 'semficha', to_jsonb(pg_temp.tenta($q$select corre_atende_salva(true, '{"tom": "grito"}'::jsonb)$q$));
insert into r434 select 'salva', corre_atende_salva(true, jsonb_build_object('sobre', '  Tatuagem fineline em Londrina  ', 'tom', 'grito', 'ola', 'Oi! Sou o atendente da Ana.',
  'faq', (select jsonb_agg(jsonb_build_object('p', 'Pergunta ' || g, 'r', case when g = 2 then '' else 'Resposta' end)) from generate_series(1, 15) g)));
insert into r434 select 'minha', to_jsonb((select count(*) from corre_atendente));
insert into r434 select 'conv_ins', to_jsonb(pg_temp.tenta($q$insert into corre_atende_conversas (dono, chave) values ('00000000-0000-0000-0000-0000000434a1', 'x')$q$));
insert into r434 select 'conv_fn', to_jsonb(pg_temp.tenta($q$select corre_atende_conversa('00000000-0000-0000-0000-0000000434a1', null, null, 'bio', '1.2.3.4', 'oi')$q$));
reset role;
set role anon;
insert into r434 select 'info1', corre_atende_info('ANA434');
insert into r434 select 'anon_ler', to_jsonb(pg_temp.tenta($q$select count(*) from corre_atendente$q$));
reset role;

select case when (select v->>'on' from r434 where k = 'info0') = 'false' and (select v->>'on' from r434 where k = 'info1') = 'true'
             and (select v->>'nome' from r434 where k = 'info1') = 'Ana' and (select v->>'ola' from r434 where k = 'info1') = 'Oi! Sou o atendente da Ana.'
             and (select v from r434 where k = 'info1') ? 'ficha' = false
            then 'ok: a página sabe se o atendente tá ligado, o primeiro nome e o oi (e a ficha não sai)' else 'FALHOU: a info do atendente' end;
select case when (select v #>> '{}' from r434 where k = 'semficha') = 'ficha' and (select v #>> '{ficha,sobre}' from r434 where k = 'salva') = 'Tatuagem fineline em Londrina'
             and (select v #>> '{ficha,tom}' from r434 where k = 'salva') = 'perto' and (select jsonb_array_length(v #> '{ficha,faq}') from r434 where k = 'salva') = 11
             and (select (v #>> '{ficha,vitrine}')::boolean from r434 where k = 'salva')
            then 'ok: ligar sem dizer o que faz não vai; a ficha sai limpa (tom de fábrica, as perguntas sem resposta fora, até 12)' else 'FALHOU: salvar a ficha' end;
select case when (select v::text from r434 where k = 'minha') = '1' and (select v #>> '{}' from r434 where k = 'conv_ins') = '42501'
             and (select v #>> '{}' from r434 where k = 'conv_fn') = '42501' and (select v #>> '{}' from r434 where k = 'anon_ler') = '42501'
            then 'ok: a dona lê a ficha dela; o app não escreve conversa nem chama a função do servidor; quem não entrou não lê' else 'FALHOU: os direitos do atendente' end;

-- ---------- a dona pelo @ (o servidor: o perfil, o atendente e o catálogo numa chamada) ----------
insert into corre_produtos (dono, nome, publico, preco, unidade) values ('00000000-0000-0000-0000-0000000434a1', 'Flash do dia', true, 180, 'peça'),
  ('00000000-0000-0000-0000-0000000434a1', 'Escondido', false, 999, '');
insert into r434 select 'dona', corre_atende_dona('@ANA434');
insert into r434 select 'dona_x', coalesce(corre_atende_dona('ninguem434'), 'null'::jsonb);
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-0000000434a1');
insert into r434 select 'dona_app', to_jsonb(pg_temp.tenta($q$select corre_atende_dona('ana434')$q$));
reset role;
select case when (select (v->>'ligado')::boolean and v #>> '{ficha,sobre}' = 'Tatuagem fineline em Londrina' and jsonb_array_length(v->'itens') = 1
                    and v #>> '{itens,0,nome}' = 'Flash do dia' from r434 where k = 'dona')
             and (select v = 'null'::jsonb from r434 where k = 'dona_x') and (select v #>> '{}' from r434 where k = 'dona_app') = '42501'
            then 'ok: o servidor acha a dona pelo @ com a ficha e só o catálogo público; o app não chama' else 'FALHOU: a dona pelo @' end;

-- ---------- as conversas (como o servidor) ----------
insert into r434 select 'c1', corre_atende_conversa('00000000-0000-0000-0000-0000000434a1', null, null, 'bio', '200.1.1.1', 'Quanto custa uma fineline pequena?');
insert into r434 select 'c2', corre_atende_conversa('00000000-0000-0000-0000-0000000434a1', ((select v->>'id' from r434 where k = 'c1'))::uuid,
  (select v->>'chave' from r434 where k = 'c1'), 'bio', '200.1.1.1', 'E pra semana que vem?');
insert into r434 select 'c3', corre_atende_conversa('00000000-0000-0000-0000-0000000434a1', ((select v->>'id' from r434 where k = 'c1'))::uuid,
  'ffffffffffffffffffffffffffffffff', 'orcamento', '200.1.1.1', 'Oi');
select case when (select v->>'chave' from r434 where k = 'c1') ~ '^[0-9a-f]{32}$' and (select (v->>'ok')::boolean from r434 where k = 'c1')
             and (select v->>'id' from r434 where k = 'c2') = (select v->>'id' from r434 where k = 'c1') and (select (v->>'n')::int from r434 where k = 'c2') = 2
             and (select v->>'chave' from r434 where k = 'c2') = '' and (select jsonb_array_length(v->'msgs') from r434 where k = 'c2') = 2
             and (select v->>'id' from r434 where k = 'c3') <> (select v->>'id' from r434 where k = 'c1')
             and (select chave from corre_atende_conversas where id = ((select v->>'id' from r434 where k = 'c1'))::uuid) = md5((select v->>'chave' from r434 where k = 'c1'))
             and (select origem from corre_atende_conversas where id = ((select v->>'id' from r434 where k = 'c3'))::uuid) = 'orcamento'
            then 'ok: a conversa abre com a chave (o banco guarda só o md5), continua com ela e chave errada abre outra' else 'FALHOU: abrir e continuar a conversa' end;
select case when not exists (select 1 from corre_cota_log where chave like '%200.1.1.1%') and exists (select 1 from corre_cota_log where chave like 'ip:atende:%')
            then 'ok: a conexão vira md5, o endereço não fica' else 'FALHOU: o endereço ficou guardado' end;

-- o limite por conversa (30 do cliente) e por conexão (30 por hora)
update corre_atende_conversas set n = 30 where id = ((select v->>'id' from r434 where k = 'c1'))::uuid;
insert into r434 select 'c30', corre_atende_conversa('00000000-0000-0000-0000-0000000434a1', ((select v->>'id' from r434 where k = 'c1'))::uuid,
  (select v->>'chave' from r434 where k = 'c1'), 'bio', '200.1.1.1', 'mais uma');
update corre_atende_conversas set n = 2 where id = ((select v->>'id' from r434 where k = 'c1'))::uuid;
insert into corre_cota_log (chave) select (select chave from corre_cota_log where chave like 'ip:atende:%' limit 1) from generate_series(1, 30);
insert into r434 select 'cip', corre_atende_conversa('00000000-0000-0000-0000-0000000434a1', null, null, 'bio', '200.1.1.1', 'oi de novo');
insert into r434 select 'coutro', corre_atende_conversa('00000000-0000-0000-0000-0000000434a1', null, null, 'bio', '2804:14c:1:2:3:4:5:6', 'oi');
insert into r434 select 'cdono', corre_atende_conversa('00000000-0000-0000-0000-0000000434a1', null, null, 'bio', '10.9.9.9', 'oi', 2);
select case when (select v->>'motivo' from r434 where k = 'c30') = 'conversa' and (select v->>'motivo' from r434 where k = 'cip') = 'ip'
             and (select (v->>'ok')::boolean from r434 where k = 'coutro') and (select v->>'motivo' from r434 where k = 'cdono') = 'dono'
            then 'ok: os limites (30 por conversa, 30 por hora na mesma conexão, o teto do dia da dona)' else 'FALHOU: os limites do atendente' end;

-- o cliente deixa o nome e o WhatsApp: vira lead uma vez; de novo, não duplica
insert into corre_push (dono, endpoint, p256dh, auth) values ('00000000-0000-0000-0000-0000000434a1', 'https://fcm.googleapis.com/fcm/send/ana434', 'p', 'a');
insert into r434 select 'r1', corre_atende_responde(((select v->>'id' from r434 where k = 'c1'))::uuid, 'Fica a partir de R$ 250. Me passa teu nome e WhatsApp?');
insert into r434 select 'r2', corre_atende_responde(((select v->>'id' from r434 where k = 'c1'))::uuid, 'Anotado! A Ana te chama.', 'Marina', '+55 (43) 99988-7766', 'Quer uma fineline pequena no pulso pra semana que vem.');
insert into r434 select 'r3', corre_atende_responde(((select v->>'id' from r434 where k = 'c1'))::uuid, 'Combinado.', 'Marina', '43999887766', 'de novo');
insert into r434 select 'al1', corre_atende_alvos(now());
insert into r434 select 'al2', corre_atende_alvos(now());
select case when not (select (v->>'lead')::boolean from r434 where k = 'r1') and (select (v->>'lead')::boolean from r434 where k = 'r2')
             and not (select (v->>'lead')::boolean from r434 where k = 'r3')
             and (select count(*) from corre_leads where dono = '00000000-0000-0000-0000-0000000434a1' and fonte = 'atende') = 1
             and (select wa from corre_leads where dono = '00000000-0000-0000-0000-0000000434a1' and fonte = 'atende') = '43999887766'
             and (select st from corre_leads where dono = '00000000-0000-0000-0000-0000000434a1' and fonte = 'atende') = 'interesse'
             and (select hist -> 0 ->> 'v' from corre_leads where dono = '00000000-0000-0000-0000-0000000434a1' and fonte = 'atende') = 'Atendente 24h: Quer uma fineline pequena no pulso pra semana que vem.'
             and (select lead_id is not null and whats = '43999887766' and nome = 'Marina' from corre_atende_conversas where id = ((select v->>'id' from r434 where k = 'c1'))::uuid)
            then 'ok: nome e WhatsApp viram o cliente no Hórus (Interessado, na Entrada) uma vez só' else 'FALHOU: o cliente do atendente no Hórus' end;
select case when jsonb_array_length((select v from r434 where k = 'al1')) = 1 and jsonb_array_length((select v from r434 where k = 'al2')) = 0
             and (select v -> 0 #>> '{payload,titulo}' from r434 where k = 'al1') = 'Cliente pelo Atendente: Marina'
             and (select v -> 0 #>> '{payload,url}' from r434 where k = 'al1') like '/#/atendente/c/%'
             and (select jsonb_array_length(msgs) from corre_atende_conversas where id = ((select v->>'id' from r434 where k = 'c1'))::uuid) = 5
            then 'ok: o aviso sai uma vez pro celular da dona, com o nome; as respostas ficam na conversa' else 'FALHOU: o aviso do atendente' end;
-- o mesmo WhatsApp numa conversa nova cai no cliente que já existe
insert into r434 select 'r4', corre_atende_responde(((select v->>'id' from r434 where k = 'c3'))::uuid, 'Anotado.', 'Marina S', '43 99988-7766', 'Quer mudar o dia.');
select case when (select count(*) from corre_leads where dono = '00000000-0000-0000-0000-0000000434a1' and fonte = 'atende') = 1
             and (select hist -> 0 ->> 'v' from corre_leads where dono = '00000000-0000-0000-0000-0000000434a1' and fonte = 'atende') = 'Atendente 24h: Quer mudar o dia.'
            then 'ok: o mesmo WhatsApp não duplica o cliente (o pedido novo entra na linha do tempo)' else 'FALHOU: cliente duplicado' end;

-- a dona lê, marca e limpa; a outra pessoa não vê nem limpa
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-0000000434b1');
insert into r434 select 'b_ve', to_jsonb((select count(*) from corre_atende_conversas));
insert into r434 select 'b_limpa', to_jsonb(coalesce(corre_atende_limpa(((select v->>'id' from r434 where k = 'c1'))::uuid), false));
select pg_temp.como('00000000-0000-0000-0000-0000000434a1');
insert into r434 select 'a_ve', to_jsonb((select count(*) from corre_atende_conversas));
insert into r434 select 'a_visto', to_jsonb(corre_atende_visto(((select v->>'id' from r434 where k = 'c3'))::uuid));
insert into r434 select 'a_limpa', to_jsonb(corre_atende_limpa(((select v->>'id' from r434 where k = 'c3'))::uuid));
reset role;
update corre_atende_conversas set updated_at = now() - interval '91 days' where id = ((select v->>'id' from r434 where k = 'coutro'))::uuid;
insert into r434 select 'velhas', to_jsonb(corre_atende_velhas());
select case when (select v::text from r434 where k = 'b_ve') = '0' and (select v::text from r434 where k = 'b_limpa') = 'false'
             and (select v::text::int from r434 where k = 'a_ve') >= 3 and (select v::text from r434 where k = 'a_limpa') = 'true'
             and (select msgs = '[]'::jsonb and whats = '' and limpa from corre_atende_conversas where id = ((select v->>'id' from r434 where k = 'c3'))::uuid)
             and (select limpa and msgs = '[]'::jsonb from corre_atende_conversas where id = ((select v->>'id' from r434 where k = 'coutro'))::uuid)
             and (select v::text from r434 where k = 'velhas') = '1'
            then 'ok: só a dona vê as conversas; limpar esvazia (a outra pessoa não consegue); parada há 90 dias fica vazia' else 'FALHOU: ler e limpar as conversas' end;

-- ---------- o piloto ----------
-- o que ele vai achar: um cliente parado, um com retorno marcado pra frente, uma cobrança vencida, uma marca sem post,
-- outra com post, e um orçamento aprovado com dia de entrega
insert into corre_leads (dono, nome, st, fonte, wa, hist, updated_at) values
  ('00000000-0000-0000-0000-0000000434a1', 'Bar do Zé', 'link', 'manual', '43988887777', jsonb_build_array(jsonb_build_object('t', now() - interval '9 days', 'k', 'toque', 'v', 'WhatsApp')), now() - interval '9 days'),
  ('00000000-0000-0000-0000-0000000434a1', 'Padaria Sol', 'interesse', 'manual', '', jsonb_build_array(jsonb_build_object('t', 'lixo', 'k', 'nota', 'v', 'x')), now() - interval '20 days'),
  ('00000000-0000-0000-0000-0000000434a1', 'Ótica Nova', 'contato', 'manual', '', '[]'::jsonb, now() - interval '1 day');
update corre_leads set prox = current_date + 3 where nome = 'Padaria Sol' and dono = '00000000-0000-0000-0000-0000000434a1';
insert into corre_vendas (id, dono, cliente, st, vence, total, whats) values
  ('00000000-0000-0000-0000-0000000434e1', '00000000-0000-0000-0000-0000000434a1', 'João', 'fechado', ((now() at time zone 'America/Sao_Paulo')::date - 2), 1500, '43977776666'),
  ('00000000-0000-0000-0000-0000000434e2', '00000000-0000-0000-0000-0000000434a1', 'Pago Já', 'pago', ((now() at time zone 'America/Sao_Paulo')::date - 2), 900, '');
update corre_vendas set pago_em = current_date where id = '00000000-0000-0000-0000-0000000434e2';
insert into corre_vendas (id, dono, cliente, st, total, aprovado_em, entrega, itens) values
  ('00000000-0000-0000-0000-0000000434e3', '00000000-0000-0000-0000-0000000434a1', 'Carla', 'fechado', 800, now() - interval '2 hours',
   ((now() at time zone 'America/Sao_Paulo')::date + 4), '[{"n": "Identidade visual", "q": 1, "v": 800}]'::jsonb);
-- (duas marcas com o @: A vira dona, que o plano grátis só deixa uma rede)
insert into corre_donos (dono) values ('00000000-0000-0000-0000-0000000434a1') on conflict do nothing;
insert into corre_portfolio (id, dono, marca, rede) values
  ('00000000-0000-0000-0000-0000000434f1', '00000000-0000-0000-0000-0000000434a1', 'Nexwin', 'nexwin.app'),
  ('00000000-0000-0000-0000-0000000434f2', '00000000-0000-0000-0000-0000000434a1', 'Kivo', 'kivo'),
  ('00000000-0000-0000-0000-0000000434f3', '00000000-0000-0000-0000-0000000434a1', 'Sem rede', '');
insert into corre_posts (dono, marca_id, data, status) values ('00000000-0000-0000-0000-0000000434a1', '00000000-0000-0000-0000-0000000434f2', (now() at time zone 'America/Sao_Paulo')::date + 2, 'pronto');

set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-0000000434a1');
insert into r434 select 'p_desl', corre_piloto_ja();
insert into r434 select 'p_salva', corre_piloto_salva(true, '{"esfria": {"on": true, "dias": 99}, "studio": {"dias": 1}, "cobra": {"on": "talvez"}}'::jsonb);
insert into r434 select 'p_ja', corre_piloto_ja();
insert into r434 select 'p_cedo', corre_piloto_ja();
insert into r434 select 'p_roda', to_jsonb(pg_temp.tenta($q$select corre_piloto_roda(now())$q$));
insert into r434 select 'p_de', to_jsonb(pg_temp.tenta($q$select corre_piloto_de('00000000-0000-0000-0000-0000000434a1', now())$q$));
reset role;
select case when (select v->>'motivo' from r434 where k = 'p_desl') = 'desligado'
             and (select (v #>> '{receitas,esfria,dias}')::int from r434 where k = 'p_salva') = 30 and (select (v #>> '{receitas,studio,dias}')::int from r434 where k = 'p_salva') = 3
             and (select (v #>> '{receitas,cobra,on}')::boolean from r434 where k = 'p_salva') and (select (v #>> '{receitas,aprovado,on}')::boolean from r434 where k = 'p_salva')
             and (select (v->>'cedo')::boolean from r434 where k = 'p_cedo')
             and (select v #>> '{}' from r434 where k = 'p_roda') = '42501' and (select v #>> '{}' from r434 where k = 'p_de') = '42501'
            then 'ok: desligado não roda; as receitas saem limpas (dias no limite); rodar de novo em 2 minutos espera; o app não chama o relógio'
            else 'FALHOU: ligar e rodar o piloto' end;
-- com 30 dias de esfria, o Bar do Zé (9 dias) não entrou; com 5, entra
select case when not exists (select 1 from corre_caderno where dono = '00000000-0000-0000-0000-0000000434a1' and piloto = 'esfria')
            then 'ok: o cliente parado há menos que os dias escolhidos não vira tarefa' else 'FALHOU: esfria antes do tempo' end;
update corre_piloto set receitas = jsonb_set(receitas, '{esfria,dias}', '5'), rodou_em = null where dono = '00000000-0000-0000-0000-0000000434a1';
insert into r434 select 'p_2', corre_piloto_de('00000000-0000-0000-0000-0000000434a1', now());
insert into r434 select 'p_3', corre_piloto_de('00000000-0000-0000-0000-0000000434a1', now());
select case when (select count(*) from corre_caderno where dono = '00000000-0000-0000-0000-0000000434a1' and piloto = 'esfria') = 1
             and (select titulo from corre_caderno where dono = '00000000-0000-0000-0000-0000000434a1' and piloto = 'esfria') = 'Retomar Bar do Zé (proposta parada há 9 dias)'
             and (select liga ->> 't' = 'lead' and liga ->> 'wa' = '43988887777' from corre_caderno where dono = '00000000-0000-0000-0000-0000000434a1' and piloto = 'esfria')
             and (select dia from corre_caderno where dono = '00000000-0000-0000-0000-0000000434a1' and piloto = 'esfria') = (now() at time zone 'America/Sao_Paulo')::date
            then 'ok: esfria: o cliente parado vira "Retomar" pra hoje com o WhatsApp (o de retorno marcado e o recente ficam fora)'
            else format('FALHOU: a receita esfria (%s)', (select string_agg(titulo, ' | ') from corre_caderno where dono = '00000000-0000-0000-0000-0000000434a1' and piloto = 'esfria')) end;
select case when (select count(*) from corre_caderno where dono = '00000000-0000-0000-0000-0000000434a1' and piloto = 'cobra') = 1
             and (select titulo from corre_caderno where dono = '00000000-0000-0000-0000-0000000434a1' and piloto = 'cobra') = 'Cobrar João (venceu ' || to_char((now() at time zone 'America/Sao_Paulo')::date - 2, 'DD/MM') || ')'
             and (select prio from corre_caderno where dono = '00000000-0000-0000-0000-0000000434a1' and piloto = 'cobra') = 1
            then 'ok: cobra: a venda vencida e não paga vira "Cobrar", sem o valor no título (a paga fica fora)' else 'FALHOU: a receita cobra' end;
select case when (select count(*) from corre_caderno where dono = '00000000-0000-0000-0000-0000000434a1' and piloto = 'studio') = 1
             and (select titulo from corre_caderno where dono = '00000000-0000-0000-0000-0000000434a1' and piloto = 'studio') = 'Programar os posts da Nexwin (nada nos próximos 3 dias)'
            then 'ok: studio: só a marca com o @ e sem post na frente vira tarefa' else 'FALHOU: a receita studio' end;
select case when (select count(*) from corre_caderno where dono = '00000000-0000-0000-0000-0000000434a1' and piloto = 'aprovado') = 2
             and exists (select 1 from corre_caderno where dono = '00000000-0000-0000-0000-0000000434a1' and piloto = 'aprovado' and titulo = 'Começar Identidade visual de Carla')
             and (select dia from corre_caderno where dono = '00000000-0000-0000-0000-0000000434a1' and titulo = 'Entregar pra Carla') = (now() at time zone 'America/Sao_Paulo')::date + 4
            then 'ok: aprovado: o orçamento aprovado vira começar (hoje) e entregar (no dia da entrega)' else 'FALHOU: a receita aprovado' end;
select case when jsonb_array_length((select v from r434 where k = 'p_3')) = 0
             and (select count(*) from corre_caderno where dono = '00000000-0000-0000-0000-0000000434a1' and piloto is not null) = 5
            then 'ok: rodar de novo não repete nada' else 'FALHOU: o piloto repetiu' end;
-- feita a tarefa da cobrança, ela não volta antes de 3 dias; depois, volta (ainda não pagou)
update corre_caderno set feito = true where dono = '00000000-0000-0000-0000-0000000434a1' and piloto = 'cobra';
insert into r434 select 'p_4', corre_piloto_de('00000000-0000-0000-0000-0000000434a1', now());
update corre_piloto_log set em = now() - interval '4 days' where dono = '00000000-0000-0000-0000-0000000434a1' and receita = 'cobra';
insert into r434 select 'p_5', corre_piloto_de('00000000-0000-0000-0000-0000000434a1', now());
select case when jsonb_array_length((select v from r434 where k = 'p_4')) = 0 and jsonb_array_length((select v from r434 where k = 'p_5')) = 1
             and (select v -> 0 ->> 'receita' from r434 where k = 'p_5') = 'cobra'
            then 'ok: a tarefa feita não volta antes do tempo; passou o tempo e ainda tá aberta, volta' else 'FALHOU: o tempo de espera do piloto' end;
set role authenticated;
select pg_temp.como('00000000-0000-0000-0000-0000000434a1');
insert into r434 select 'p_meu', corre_piloto_meu();
select pg_temp.como('00000000-0000-0000-0000-0000000434b1');
insert into r434 select 'p_meu_b', corre_piloto_meu();
insert into r434 select 'log_b', to_jsonb((select count(*) from corre_piloto_log));
reset role;
-- o relógio: B liga também; quem rodou há menos de 50 minutos fica pra próxima
insert into corre_piloto (dono, ligado, receitas) values ('00000000-0000-0000-0000-0000000434b1', true, '{}');
insert into corre_vendas (dono, cliente, st, vence, total) values ('00000000-0000-0000-0000-0000000434b1', 'Rui', 'fechado', (now() at time zone 'America/Sao_Paulo')::date, 100);
insert into r434 select 'roda', to_jsonb(corre_piloto_roda(now()));
select case when (select (v->>'ligado')::boolean and (v->>'abertas')::int = 5 and (v->>'feitas')::int = 1 and jsonb_array_length(v->'log') = 6 from r434 where k = 'p_meu')
             and (select (v->>'ligado')::boolean = false and (v->>'existe')::boolean = false from r434 where k = 'p_meu_b') and (select v::text from r434 where k = 'log_b') = '0'
             and (select v::text from r434 where k = 'roda') = '1'
             and (select titulo from corre_caderno where dono = '00000000-0000-0000-0000-0000000434b1' and piloto = 'cobra') = 'Cobrar Rui (vence hoje)'
            then 'ok: o app vê como tá e o que o piloto fez (só o dele); o relógio roda pra quem ligou e pula quem acabou de rodar'
            else 'FALHOU: o resumo e o relógio do piloto' end;
