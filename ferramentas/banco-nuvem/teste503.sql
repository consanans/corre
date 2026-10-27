\set ON_ERROR_STOP 1
-- v5.03: Dá um Corre. A lista aberta só com as ligadas, só os donos põem e mexem, a chave e o CNPJ escritos de qualquer
-- jeito viram números, chave que não é Pix não entra, CNPJ repetido não entra, a conta dos toques sem saber quem, e os
-- números (com quantos links na bio apoiam cada uma) só pros donos.
create function pg_temp.como(u text, papel text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false), set_config('request.jwt.claim.role', papel, false) $$;
create function pg_temp.tenta(q text) returns text language plpgsql as $$
begin execute q; return 'passou'; exception when others then return coalesce(nullif(sqlerrm, ''), 'erro'); end $$;
create temp table r (k text primary key, v text);
grant all on r to authenticated, anon;

insert into corre_perfis (id, handle, nome, bio_link) values
  ('00000000-0000-0000-0000-000000050301', 'ana503', 'Ana', '{"on": true, "doa": "x"}'::jsonb),
  ('00000000-0000-0000-0000-000000050302', 'beto503', 'Beto', '{}'::jsonb)
on conflict do nothing;

-- quem não é dono não põe entidade (nem quem não entrou)
select pg_temp.como('', 'anon'); set role anon;
insert into r select 'anon_salva', pg_temp.tenta($q$select public.corre_entidade_salva('{"nome":"Golpe","cnpj":"11222333000181","pix":"golpe@x.com"}')$q$);
insert into r select 'anon_tab', pg_temp.tenta('select count(*) from corre_entidades');
insert into r select 'lista0', public.corre_entidades_lista()::text;
reset role;
select pg_temp.como('00000000-0000-0000-0000-000000050302', 'authenticated'); set role authenticated;
insert into r select 'beto_salva', pg_temp.tenta($q$select public.corre_entidade_salva('{"nome":"Golpe","cnpj":"11222333000181","pix":"golpe@x.com"}')$q$);
insert into r select 'beto_num', pg_temp.tenta('select public.corre_entidades_donos(30)');
reset role;

-- o fundador põe: o CNPJ e a chave com ponto e barra viram números, o nome do Pix sai sem acento e em maiúscula
select pg_temp.como('d1e9f6ac-f5d7-4723-8b02-eb0d1d7137b0', 'authenticated'); set role authenticated;
insert into r select 'id1', public.corre_entidade_salva('{"nome":"Lar São Vicente de Londrina","faz":"Cuida de idosos","causa":"idosos","cnpj":"12.345.678/0001-90","pix":"12.345.678/0001-90","site":"https://lar.example.org"}')::text;
insert into r select 'id2', public.corre_entidade_salva('{"nome":"Patas do Igapó","causa":"bichos","cnpj":"98765432000110","pix":"Doe@Patas.org.br","pix_nome":"Patas do Igapó Associação"}')::text;
insert into r select 'pix_ruim', pg_temp.tenta($q$select public.corre_entidade_salva('{"nome":"Outra","cnpj":"11111111000111","pix":"minha chave"}')$q$);
insert into r select 'cnpj_rep', pg_temp.tenta($q$select public.corre_entidade_salva('{"nome":"Copia","cnpj":"12345678000190","pix":"a@b.com"}')$q$);
insert into r select 'site_ruim', pg_temp.tenta($q$select public.corre_entidade_salva('{"nome":"Site","cnpj":"22222222000122","pix":"a@b.com","site":"javascript:alert(1)"}')$q$);
reset role;

select case when (select v from r where k = 'anon_salva') ~ 'permission denied' and (select v from r where k = 'anon_tab') ~ 'permission denied' and (select v from r where k = 'lista0') = '[]'
            then 'ok: quem não entrou não põe entidade nem lê a tabela, e a lista começa vazia' else format('FALHOU: o anon (%s / %s)', (select v from r where k = 'anon_salva'), (select v from r where k = 'anon_tab')) end;
select case when (select v from r where k = 'beto_salva') ~ 'so_dono' and (select v from r where k = 'beto_num') ~ 'so_dono'
            then 'ok: quem não é dono não põe entidade nem vê os números' else format('FALHOU: quem não é dono (%s)', (select v from r where k = 'beto_salva')) end;
select case when (select cnpj = '12345678000190' and pix = '12345678000190' and pix_nome = 'LAR SAO VICENTE DE LONDRI' from corre_entidades where nome = 'Lar São Vicente de Londrina')
            then 'ok: CNPJ e chave com ponto e barra viram números, e o nome do Pix sai sem acento, em maiúscula, até 25 letras' else 'FALHOU: a arrumação do CNPJ, da chave ou do nome do Pix' end;
select case when (select causa from corre_entidades where nome = 'Patas do Igapó') = 'outra' and (select pix_nome from corre_entidades where nome = 'Patas do Igapó') = 'PATAS DO IGAPO ASSOCIACAO'
            then 'ok: causa fora da lista vira "outra" e o nome do Pix escolhido vale' else 'FALHOU: a causa ou o nome do Pix escolhido' end;
select case when (select v from r where k = 'pix_ruim') ~ 'pix' and (select v from r where k = 'cnpj_rep') ~ 'cnpj_repetido' and (select v from r where k = 'site_ruim') ~ 'site'
            and (select count(*) from corre_entidades) = 2
            then 'ok: chave que não é Pix, CNPJ repetido e site que não é https não entram' else format('FALHOU: as travas (%s | %s | %s)', (select v from r where k = 'pix_ruim'), (select v from r where k = 'cnpj_rep'), (select v from r where k = 'site_ruim')) end;

-- desliga a segunda: a lista aberta mostra só a ligada; a Ana apoia a primeira no link na bio
select pg_temp.como('d1e9f6ac-f5d7-4723-8b02-eb0d1d7137b0', 'authenticated'); set role authenticated;
select public.corre_entidade_salva(jsonb_build_object('id', (select v from r where k = 'id2'), 'nome', 'Patas do Igapó', 'cnpj', '98765432000110', 'pix', 'doe@patas.org.br', 'ativa', false));
reset role;
update corre_perfis set bio_link = jsonb_build_object('on', true, 'doa', (select v from r where k = 'id1')) where id = '00000000-0000-0000-0000-000000050301';
select pg_temp.como('', 'anon'); set role anon;
insert into r select 'lista1', public.corre_entidades_lista()::text;
insert into r select 'marca', pg_temp.tenta(format($q$select public.corre_doacao_marca('%1$s', 'abre'); select public.corre_doacao_marca('%1$s', 'abre'); select public.corre_doacao_marca('%1$s', 'copia'); select public.corre_doacao_marca('%1$s', 'apagar'); select public.corre_doacao_marca('%2$s', 'abre')$q$,
  (select v from r where k = 'id1'), (select v from r where k = 'id2')));
insert into r select 'conta_tab', pg_temp.tenta('select count(*) from corre_doacao_conta');
reset role;
select case when jsonb_array_length((select v::jsonb from r where k = 'lista1')) = 1 and (select v::jsonb->0->>'pix' from r where k = 'lista1') = '12345678000190'
            then 'ok: a lista aberta mostra só a ligada, com a chave Pix' else format('FALHOU: a lista aberta (%s)', (select v from r where k = 'lista1')) end;
select case when (select v from r where k = 'marca') = 'passou' and (select sum(n) from corre_doacao_conta where tipo = 'abre') = 2 and (select sum(n) from corre_doacao_conta where tipo = 'copia') = 1
            and (select count(*) from corre_doacao_conta) = 2 and (select v from r where k = 'conta_tab') ~ 'permission denied'
            then 'ok: abrir e copiar contam, tipo esquisito e entidade desligada não entram, e ninguém do app lê a conta' else 'FALHOU: a conta dos toques' end;

-- o dono vê: as duas, a conta e quantos links na bio apoiam
select pg_temp.como('d1e9f6ac-f5d7-4723-8b02-eb0d1d7137b0', 'authenticated'); set role authenticated;
insert into r select 'num', public.corre_entidades_donos(30)::text;
reset role;
select case when jsonb_array_length((select v::jsonb->'entidades' from r where k = 'num')) = 2
            and (select (e->>'abre')::int = 2 and (e->>'copia')::int = 1 and (e->>'bios')::int = 1 from r, jsonb_array_elements(v::jsonb->'entidades') e where k = 'num' and e->>'id' = (select v from r where k = 'id1'))
            then 'ok: o dono vê todas (a desligada também), os toques e quantos links na bio apoiam' else format('FALHOU: os números do dono (%s)', (select v from r where k = 'num')) end;
