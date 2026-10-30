\set ON_ERROR_STOP 1
-- v5.10: o Studio Cria por rede (o nível é o número de redes, até 100) e o interruptor do Instagram no banco.
create function pg_temp.como(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false), set_config('request.jwt.claim.role', 'authenticated', false) $$;
create function pg_temp.tenta(q text) returns text language plpgsql as $$
begin execute q; return 'passou'; exception when others then return coalesce(nullif(sqlerrm, ''), 'erro'); end $$;
insert into corre_perfis (id) values ('00000000-0000-0000-0000-000000051001') on conflict do nothing;
delete from corre_assinaturas where dono = '00000000-0000-0000-0000-000000051001';
insert into corre_assinaturas (dono, produto, nivel, valor, status, pago_ate) values ('00000000-0000-0000-0000-000000051001', 'studio', 4, 79.90, 'ativa', (now() at time zone 'America/Sao_Paulo')::date + 20);

select case when corre_redes_permitidas('00000000-0000-0000-0000-000000051001') = 4
  then 'ok: o nível 4 libera 4 redes (não mais quantas quiser)' else format('FALHOU: o nível 4 libera %s', corre_redes_permitidas('00000000-0000-0000-0000-000000051001')) end;

update corre_assinaturas set nivel = 37, valor = 324.90 where dono = '00000000-0000-0000-0000-000000051001';
select case when corre_redes_permitidas('00000000-0000-0000-0000-000000051001') = 37
  then 'ok: 37 redes no plano, 37 liberadas' else 'FALHOU: o nível 37' end;

select case when (select pg_temp.tenta($$update corre_assinaturas set nivel = 101 where dono = '00000000-0000-0000-0000-000000051001'$$)) <> 'passou'
  then 'ok: o nível não passa de 100' else 'FALHOU: aceitou o nível 101' end;

select case when corre_flags() ->> 'ig_aberto' = 'false' then 'ok: o Instagram nasce fechado (testador)' else 'FALHOU: o interruptor do Instagram' end;

set role anon;
select case when corre_flags() ? 'ig_aberto' then 'ok: quem não entrou lê os interruptores' else 'FALHOU: o anon não lê os interruptores' end;
select case when pg_temp.tenta($$update corre_flags set v = 'true' where k = 'ig_aberto'$$) <> 'passou' then 'ok: ninguém do app liga o interruptor' else 'FALHOU: o anon ligou o Instagram' end;
reset role;
delete from corre_assinaturas where dono = '00000000-0000-0000-0000-000000051001';
