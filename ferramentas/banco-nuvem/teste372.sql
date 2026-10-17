\set ON_ERROR_STOP 1
-- v3.72: o aceite dos Termos (só o servidor escreve e lê) e a marca de quem desistiu em 7 dias
create function pg_temp.tenta(q text) returns text language plpgsql as $$ declare h text; begin execute q; return 'passou'; exception when others then get stacked diagnostics h = pg_exception_hint; return coalesce(nullif(h, ''), sqlstate); end $$;
insert into corre_perfis (id, handle, nome) values ('00000000-0000-0000-0000-0000000000c1', 'teste372', 'Teste') on conflict do nothing;
-- o servidor (a função) anota o aceite
insert into corre_termos_aceites (dono, versao, produto, nivel, valor, acao) values ('00000000-0000-0000-0000-0000000000c1', '2026-10-17', 'horus', 1, 9.90, 'assinar');
select case when (select count(*) from corre_termos_aceites where dono = '00000000-0000-0000-0000-0000000000c1' and versao = '2026-10-17' and em > now() - interval '1 minute') = 1
  then 'ok: o servidor anota o aceite (versão, plano, valor e hora)' else 'FALHOU: o aceite não ficou' end;
select case when pg_temp.tenta($$insert into corre_termos_aceites (dono, versao, produto) values ('00000000-0000-0000-0000-0000000000c1', 'sim', 'horus')$$) = '23514'
  then 'ok: versão que não é data é recusada' else 'FALHOU: aceitou versão qualquer' end;
-- o app (authenticated e anon) não lê nem escreve
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', false), set_config('request.jwt.claim.role', 'authenticated', false);
select case when pg_temp.tenta($$select count(*) from corre_termos_aceites$$) = '42501'
  then 'ok: o app não lê os aceites (nem os próprios)' else 'FALHOU: o app leu os aceites' end;
select case when pg_temp.tenta($$insert into corre_termos_aceites (dono, versao, produto) values ('00000000-0000-0000-0000-0000000000c1', '2026-10-17', 'horus')$$) = '42501'
  then 'ok: o app não grava aceite' else 'FALHOU: o app gravou aceite' end;
select case when pg_temp.tenta($$update corre_assinaturas set desistiu_em = null$$) = '42501'
  then 'ok: o app não mexe na marca da desistência' else 'FALHOU: o app mexeu na desistência' end;
reset role;
set role anon;
select case when pg_temp.tenta($$select count(*) from corre_termos_aceites$$) = '42501'
  then 'ok: anon não lê os aceites' else 'FALHOU: anon leu' end;
reset role;
select set_config('request.jwt.claim.role', '', false), set_config('request.jwt.claim.sub', '', false);
-- a marca da desistência
insert into corre_assinaturas (dono, produto, nivel, valor, status, asaas_assinatura) values ('00000000-0000-0000-0000-0000000000c1', 'horus', 1, 9.90, 'cancelada', 'sub_c1')
  on conflict (dono, produto) do update set status = 'cancelada';
update corre_assinaturas set desistiu_em = now() where dono = '00000000-0000-0000-0000-0000000000c1';
select case when (select desistiu_em is not null from corre_assinaturas where dono = '00000000-0000-0000-0000-0000000000c1' and produto = 'horus')
  then 'ok: a desistência fica marcada no plano' else 'FALHOU: sem desistiu_em' end;
-- apagar o perfil leva os aceites junto
delete from corre_perfis where id = '00000000-0000-0000-0000-0000000000c1';
select case when not exists (select 1 from corre_termos_aceites where dono = '00000000-0000-0000-0000-0000000000c1')
  then 'ok: apagar o perfil apaga os aceites' else 'FALHOU: os aceites ficaram' end;
