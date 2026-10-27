\set ON_ERROR_STOP 1
-- v5.0: Londrina no Google. Só quem ligou aparece (e não o desbaratinado, nem quem não disse o ramo), a cidade escrita
-- de qualquer jeito bate, os pedidos abertos do Mural sem o nome nem o WhatsApp, a conta das visitas e os números só pros donos.
create function pg_temp.como(u text, papel text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false), set_config('request.jwt.claim.role', papel, false) $$;
create function pg_temp.tenta(q text) returns text language plpgsql as $$
begin execute q; return 'passou'; exception when others then return coalesce(nullif(sqlerrm, ''), 'erro'); end $$;
create temp table r (k text primary key, v text);
grant all on r to authenticated, anon;

insert into corre_perfis (id, handle, nome, categoria, cidade, faz, no_google, avatar_url) values
  ('00000000-0000-0000-0000-000000050001', 'ana500', 'Ana', 'social', 'Londrina/pr', 'social media pra restaurante', true, 'https://x.supabase.co/a.jpg'),
  ('00000000-0000-0000-0000-000000050002', 'beto500', 'Beto', 'design', 'Sorocaba, SP', 'logo e identidade', true, 'javascript:alert(1)'),
  ('00000000-0000-0000-0000-000000050003', 'caio500', 'Caio', 'social', 'Londrina', 'reels', false, ''),
  ('00000000-0000-0000-0000-000000050004', 'duda500', 'Duda', 'social', 'Londrina', 'stories', true, ''),
  ('00000000-0000-0000-0000-000000050005', 'eli500', 'Eli', '', 'Londrina', 'tudo', true, '')
on conflict do nothing;
update corre_perfis set desbaratinado = true where id = '00000000-0000-0000-0000-000000050004';
insert into corre_produtos (dono, nome, publico, preco, ordem) values
  ('00000000-0000-0000-0000-000000050001', 'Pacote 12 posts', true, 900, 1), ('00000000-0000-0000-0000-000000050001', 'Escondido', false, 1, 0),
  ('00000000-0000-0000-0000-000000050001', 'Reels', true, 300, 2), ('00000000-0000-0000-0000-000000050001', 'Stories', true, 200, 3),
  ('00000000-0000-0000-0000-000000050001', 'Quarto item', true, 100, 4);
insert into corre_mural (codigo, nome, whats, categoria, titulo, cidade, uf, remoto, st, expira_em) values
  ('P500A', 'Fulana', '43999990000', 'social', 'Social media pra padaria', 'Londrina', 'PR', false, 'aberto', now() + interval '5 days'),
  ('P500B', 'Ciclano', '43999990001', 'design', 'Logo pra loja', 'Curitiba', 'PR', true, 'aberto', now() + interval '5 days'),
  ('P500C', 'Beltrano', '43999990002', 'site', 'Site de outra cidade', 'Curitiba', 'PR', false, 'aberto', now() + interval '5 days'),
  ('P500D', 'Velho', '43999990003', 'social', 'Venceu', 'Londrina', 'PR', false, 'aberto', now() - interval '1 day');

-- quem não tem conta lê a vitrine
select pg_temp.como('', 'anon'); set role anon;
insert into r select 'vit', (public.corre_seo_vitrine('londrina, PR'))::text;
insert into r select 'tab', pg_temp.tenta('select count(*) from corre_seo_conta');
insert into r select 'marca', pg_temp.tenta($q$select public.corre_seo_marca('/londrina/social-media/', 'ver'); select public.corre_seo_marca('/londrina/social-media/', 'ver'); select public.corre_seo_marca('/londrina/social-media/', 'pedido'); select public.corre_seo_marca('javascript:x', 'ver'); select public.corre_seo_marca('/londrina/', 'apagar')$q$);
insert into r select 'num_anon', pg_temp.tenta('select public.corre_seo_numeros(30)');
reset role;

select case when (select v::jsonb->'gente' from r where k = 'vit') @> '[{"handle":"ana500","aqui":true}]' then 'ok: quem ligou o Google aparece, com a cidade escrita de outro jeito (Londrina/pr = londrina, PR)' else 'FALHOU: a Ana não apareceu' end;
select case when not ((select v from r where k = 'vit') ~ 'caio500|duda500|eli500') then 'ok: não aparece quem não ligou, quem tá desbaratinado e quem não disse o ramo' else 'FALHOU: apareceu quem não devia' end;
select case when (select v::jsonb->'gente' from r where k = 'vit') @> '[{"handle":"beto500","aqui":false}]' and (select (v::jsonb->'gente'->1->>'avatar') is null from r where k = 'vit')
            then 'ok: quem é de fora vem marcado (a página decide), e foto que não é https não sai' else 'FALHOU: o de fora ou a foto' end;
select case when (select jsonb_agg(i->>'nome') from r, jsonb_array_elements(v::jsonb->'gente'->0->'itens') i where k = 'vit') = '["Pacote 12 posts", "Reels", "Stories"]'::jsonb
            then 'ok: até 3 itens da vitrine, só os públicos, na ordem' else 'FALHOU: os itens da vitrine' end;
select case when (select jsonb_agg(p->>'codigo' order by p->>'codigo') from r, jsonb_array_elements(v::jsonb->'pedidos') p where k = 'vit') = '["P500A", "P500B"]'::jsonb
            and not ((select v from r where k = 'vit') ~ 'Fulana|4399999') then 'ok: pedidos abertos da cidade e os à distância, sem nome nem WhatsApp' else 'FALHOU: os pedidos do Mural' end;
select case when (select v from r where k = 'tab') like '%permission denied%' then 'ok: ninguém do app lê a conta das visitas' else format('FALHOU: a conta abriu (%s)', (select v from r where k = 'tab')) end;
select case when (select v from r where k = 'marca') = 'passou' and (select n from corre_seo_conta where pagina = '/londrina/social-media/' and tipo = 'ver') = 2
            and (select n from corre_seo_conta where tipo = 'pedido') = 1 and (select count(*) from corre_seo_conta) = 2
            then 'ok: a visita e o toque contam, e página ou tipo esquisito não entra' else 'FALHOU: a conta das visitas' end;
select case when (select v from r where k = 'num_anon') ~ 'so_dono|permission' then 'ok: quem não é dono não vê os números' else format('FALHOU: os números abriram (%s)', (select v from r where k = 'num_anon')) end;
-- o dono vê
insert into corre_donos (dono) select '00000000-0000-0000-0000-000000050001' where to_regclass('public.corre_donos') is not null on conflict do nothing;
select pg_temp.como('00000000-0000-0000-0000-000000050001', 'authenticated'); set role authenticated;
insert into r select 'num', (public.corre_seo_numeros(30))::text;
reset role;
select case when (select (v::jsonb->'total'->>'ver')::int = 2 and (v::jsonb->>'aparecem')::int >= 2 from r where k = 'num') then 'ok: o dono vê as visitas e quantos aparecem' else format('FALHOU: os números do dono (%s)', (select v from r where k = 'num')) end;
