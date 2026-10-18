\set ON_ERROR_STOP 1
-- v3.80: os donos. ...0d vira dono, ...0c segue gente comum. "tenta" roda e devolve "passou" ou o código do erro
create function pg_temp.tenta(q text) returns text language plpgsql as $$ begin execute q; return 'passou'; exception when others then return sqlstate; end $$;
insert into corre_perfis (id) values ('00000000-0000-0000-0000-00000000000d'), ('00000000-0000-0000-0000-00000000000c') on conflict do nothing;
-- antes de entrar na lista: como todo mundo
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
select case when not (corre_meu_acesso() ->> 'dono')::boolean and not (corre_meu_acesso() -> 'acesso' ->> 'houzi')::boolean and (corre_meu_acesso() ->> 'redes')::int = 1
  then 'ok: fora da lista, o resumo é o de todo mundo (sem dono, sem Houzi, 1 rede)' else format('FALHOU: antes %s', corre_meu_acesso()) end;
-- o app não se põe na lista nem lê ela
select case when pg_temp.tenta($$insert into corre_donos (dono) values ('00000000-0000-0000-0000-00000000000d')$$) = '42501'
  and pg_temp.tenta($$select count(*) from corre_donos$$) = '42501'
  then 'ok: o app não lê nem escreve a lista dos donos' else 'FALHOU: o app mexeu na lista' end;
select case when pg_temp.tenta($$select corre_eh_dono('00000000-0000-0000-0000-00000000000d')$$) = '42501'
  then 'ok: o app não pergunta quem é dono de outra pessoa' else 'FALHOU: o app chamou corre_eh_dono' end;
reset role;
reset request.jwt.claim.sub;
-- o Thales põe o dono (como postgres, que é o SQL Editor)
insert into corre_donos (dono, obs) values ('00000000-0000-0000-0000-00000000000d', 'teste') on conflict do nothing;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
select case when (corre_meu_acesso() ->> 'dono')::boolean and not (corre_meu_acesso() ->> 'fundador')::boolean
  and (corre_meu_acesso() -> 'acesso' ->> 'houzi')::boolean and (corre_meu_acesso() -> 'acesso' ->> 'horus')::boolean and (corre_meu_acesso() ->> 'redes')::int = 999
  then 'ok: na lista, Studio Houzi, Hórus e as redes liberados (e ele não vira fundador)' else format('FALHOU: dono %s', corre_meu_acesso()) end;
reset role;
reset request.jwt.claim.sub;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select case when not (corre_meu_acesso() ->> 'dono')::boolean and not (corre_meu_acesso() -> 'acesso' ->> 'horus')::boolean
  then 'ok: quem não tá na lista segue igual' else format('FALHOU: comum %s', corre_meu_acesso()) end;
reset role;
reset request.jwt.claim.sub;
select case when corre_eh_dono(corre_fundador()) and corre_tem_acesso(corre_fundador(), 'horus') and corre_redes_permitidas(corre_fundador()) = 999
  then 'ok: o fundador continua com tudo' else 'FALHOU: o fundador perdeu acesso' end;
-- saiu da lista: volta a ser como todo mundo
delete from corre_donos where dono = '00000000-0000-0000-0000-00000000000d';
select case when not corre_tem_acesso('00000000-0000-0000-0000-00000000000d', 'houzi') and corre_redes_permitidas('00000000-0000-0000-0000-00000000000d') = 1
  then 'ok: tirou da lista, o acesso acaba' else 'FALHOU: seguiu liberado' end;
-- apagou o perfil, sai da lista junto
insert into corre_donos (dono) values ('00000000-0000-0000-0000-00000000000c');
delete from corre_perfis where id = '00000000-0000-0000-0000-00000000000c';
select case when not exists (select 1 from corre_donos where dono = '00000000-0000-0000-0000-00000000000c')
  then 'ok: perfil apagado sai da lista dos donos' else 'FALHOU: sobrou dono sem perfil' end;
