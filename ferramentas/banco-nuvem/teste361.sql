\set ON_ERROR_STOP 1
-- v3.61: perfil com plano rodando no Asaas não se apaga (o Asaas seguiria cobrando); cancelado, apaga
create function pg_temp.tenta(q text) returns text language plpgsql as $$ declare h text; begin execute q; return 'passou'; exception when others then get stacked diagnostics h = pg_exception_hint; return coalesce(nullif(h, ''), sqlstate); end $$;
insert into corre_perfis (id, handle, nome) values ('00000000-0000-0000-0000-0000000000b1', 'teste361', 'Teste') on conflict do nothing;
insert into corre_assinaturas (dono, produto, nivel, valor, status, asaas_assinatura) values ('00000000-0000-0000-0000-0000000000b1', 'horus', 1, 9.90, 'ativa', 'sub_1')
  on conflict (dono, produto) do update set status = 'ativa', asaas_assinatura = 'sub_1';
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', false), set_config('request.jwt.claim.role', 'authenticated', false);
select case when pg_temp.tenta($$delete from corre_perfis where id = '00000000-0000-0000-0000-0000000000b1'$$) = 'assinatura_ativa'
  and exists (select 1 from corre_perfis where id = '00000000-0000-0000-0000-0000000000b1')
  then 'ok: com plano rodando no Asaas, o perfil não se apaga' else 'FALHOU: apagou com plano ativo' end;
update corre_assinaturas set status = 'cancelada' where dono = '00000000-0000-0000-0000-0000000000b1';
create temp table r361 as select pg_temp.tenta($$delete from corre_perfis where id = '00000000-0000-0000-0000-0000000000b1'$$) as v;
select case when (select v from r361) = 'passou'
  and not exists (select 1 from corre_assinaturas where dono = '00000000-0000-0000-0000-0000000000b1')
  then 'ok: cancelado, o perfil se apaga (e o plano vai junto)' else 'FALHOU: não apagou depois de cancelar: ' || (select v from r361) end;
-- teste grátis sem assinatura no Asaas não segura o perfil
insert into corre_perfis (id, handle, nome) values ('00000000-0000-0000-0000-0000000000b2', 'teste361b', 'Teste B') on conflict do nothing;
insert into corre_assinaturas (dono, produto, status, teste_ate, valor) values ('00000000-0000-0000-0000-0000000000b2', 'houzi', 'teste', now() + interval '10 days', 29.90) on conflict do nothing;
select case when pg_temp.tenta($$delete from corre_perfis where id = '00000000-0000-0000-0000-0000000000b2'$$) = 'passou'
  then 'ok: só no teste grátis (nada no Asaas), apaga normal' else 'FALHOU: teste grátis segurou o perfil' end;
-- o servidor passa direto
insert into corre_perfis (id, handle, nome) values ('00000000-0000-0000-0000-0000000000b3', 'teste361c', 'Teste C') on conflict do nothing;
insert into corre_assinaturas (dono, produto, nivel, valor, status, asaas_assinatura) values ('00000000-0000-0000-0000-0000000000b3', 'studio', 2, 59.90, 'ativa', 'sub_3') on conflict do nothing;
select set_config('request.jwt.claim.role', 'service_role', false);
select case when pg_temp.tenta($$delete from corre_perfis where id = '00000000-0000-0000-0000-0000000000b3'$$) = 'passou'
  then 'ok: o servidor apaga direto' else 'FALHOU: servidor barrado' end;
select set_config('request.jwt.claim.role', '', false), set_config('request.jwt.claim.sub', '', false);
