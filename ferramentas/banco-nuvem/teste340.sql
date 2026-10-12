\set ON_ERROR_STOP 1
insert into corre_perfis values ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b');
insert into corre_ig_contas (id, dono, ig_id, username) values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-00000000000a', '123', 'consanans');
insert into corre_correal values ('00000000-0000-0000-0000-00000000000a', 12);
-- post da dona da conta: passa
insert into corre_posts (dono, ig_conta, ig_status, ig_quando) values ('00000000-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111', 'agendado', now() - interval '1 minute');
-- post de outra pessoa na mesma conta: tem que barrar
do $$ begin
  insert into corre_posts (dono, ig_conta) values ('00000000-0000-0000-0000-00000000000b', '11111111-1111-1111-1111-111111111111');
  raise exception 'FALHOU: aceitou conta de outra pessoa';
exception when insufficient_privilege then raise notice 'ok: barrou conta de outra pessoa'; end $$;
select case when count(*) = 1 then 'ok: fila pegou o post vencido' else 'FALHOU: fila' end from corre_ig_fila_contas(10);
select case when count(*) = 0 then 'ok: fila não pega duas vezes' else 'FALHOU: fila repetiu' end from corre_ig_fila_contas(10);
select case when corre_correal_preco('voo') = 5 then 'ok: voo custa 5' else 'FALHOU: preço do voo' end;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select case when (corre_correal_meu()->>'saldo')::int = 12 and (corre_correal_meu()->'precos'->>'voo')::int = 5 then 'ok: carteira mostra saldo e voo' else 'FALHOU: carteira' end;
reset request.jwt.claim.sub;
-- quem usa o app nunca lê o token, nem chama a fila
set role authenticated;
do $$ begin perform 1 from corre_ig_tokens; raise exception 'FALHOU: app leu token';
exception when insufficient_privilege then raise notice 'ok: app não lê corre_ig_tokens'; end $$;
do $$ begin perform corre_ig_fila_contas(1); raise exception 'FALHOU: app chamou a fila';
exception when insufficient_privilege then raise notice 'ok: app não chama a fila'; end $$;
reset role;
