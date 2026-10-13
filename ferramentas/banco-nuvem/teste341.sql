\set ON_ERROR_STOP 1
-- a marca 'a1' é do perfil ...a (publicada); a 'b1' é do ...b
insert into corre_perfis values ('00000000-0000-0000-0000-00000000000a') on conflict do nothing;
insert into corre_perfis values ('00000000-0000-0000-0000-00000000000b') on conflict do nothing;
insert into corre_houzi_marcas (id, dono, publica) values ('a1a1a1a1-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', true), ('b1b1b1b1-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', false);
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
insert into corre_houzi_privado (marca, buyer) values ('a1a1a1a1-0000-0000-0000-000000000001', '{"nome":"Rafa"}');
insert into corre_houzi_privado (marca, buyer) values ('a1a1a1a1-0000-0000-0000-000000000001', '{"nome":"Rafa 2"}') on conflict (marca) do update set buyer = excluded.buyer, updated_at = now();
select case when (select buyer->>'nome' from corre_houzi_privado where marca = 'a1a1a1a1-0000-0000-0000-000000000001') = 'Rafa 2' then 'ok: o dono grava e regrava a buyer persona' else 'FALHOU: dono não regravou' end;
do $$ begin
  insert into corre_houzi_privado (marca, buyer) values ('b1b1b1b1-0000-0000-0000-000000000001', '{"nome":"intrusa"}');
  raise exception 'FALHOU: gravou persona na marca de outra pessoa';
exception when insufficient_privilege then raise notice 'ok: não grava na marca de outra pessoa'; end $$;
-- a outra pessoa, logada, não lê a persona da marca publicada
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select case when count(*) = 0 then 'ok: outra pessoa logada não lê a buyer persona (nem da marca publicada)' else 'FALHOU: outra pessoa leu' end from corre_houzi_privado;
select case when count(*) = 1 then 'ok: a marca publicada continua aberta pra outra pessoa' else 'FALHOU: marca publicada sumiu' end from corre_houzi_marcas where id = 'a1a1a1a1-0000-0000-0000-000000000001';
do $$ begin
  update corre_houzi_privado set buyer = '{"nome":"x"}' where marca = 'a1a1a1a1-0000-0000-0000-000000000001';
  if found then raise exception 'FALHOU: outra pessoa mexeu'; end if;
  raise notice 'ok: outra pessoa não mexe na persona';
end $$;
reset role;
-- quem não tá logado (anon) não lê nada
set role anon;
do $$ begin perform 1 from corre_houzi_privado; raise exception 'FALHOU: anon leu';
exception when insufficient_privilege then raise notice 'ok: sem login não lê a buyer persona'; end $$;
reset role;
-- apagou a marca, some a persona
delete from corre_houzi_marcas where id = 'a1a1a1a1-0000-0000-0000-000000000001';
select case when count(*) = 0 then 'ok: apagou a marca, a persona some junto' else 'FALHOU: persona ficou órfã' end from corre_houzi_privado;
