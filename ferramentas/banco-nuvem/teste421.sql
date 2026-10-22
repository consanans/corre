\set ON_ERROR_STOP 1
-- v4.21: endereço e arquivos no Caderninho
create function pg_temp.tenta(q text) returns text language plpgsql as $$
begin execute q; return 'passou'; exception when others then return coalesce(nullif(sqlerrm, ''), 'erro'); end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000041901', false), set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
insert into corre_caderno (titulo, endereco, anexos) values ('Reunião na Padaria', 'Av. Higienópolis, 1000, Londrina', '[{"p":"00000000-0000-0000-0000-000000041901/contrato.pdf","n":"Contrato.pdf","t":"application/pdf","s":1200}]');
select case when (select endereco from corre_caderno where titulo = 'Reunião na Padaria') like 'Av. Higienópolis%'
   and (select jsonb_array_length(anexos) from corre_caderno where titulo = 'Reunião na Padaria') = 1
  then 'ok: guarda o endereço e o arquivo' else 'FALHOU: guardar' end;
select case when pg_temp.tenta($$insert into corre_caderno (titulo, anexos) values ('Alheio', '[{"p":"00000000-0000-0000-0000-000000041902/x.pdf","n":"x.pdf"}]')$$) = 'anexo'
   and pg_temp.tenta($$insert into corre_caderno (titulo, anexos) values ('Torto', '[{"p":"00000000-0000-0000-0000-000000041901/../x","n":"x"}]')$$) = 'anexo'
  then 'ok: arquivo da pasta de outra pessoa ou caminho torto é recusado' else 'FALHOU: anexo alheio' end;
select case when pg_temp.tenta($$insert into corre_caderno (titulo, anexos) select 'Muitos', jsonb_agg(jsonb_build_object('p', '00000000-0000-0000-0000-000000041901/a' || g || '.pdf', 'n', 'a.pdf')) from generate_series(1, 11) g$$) like '%check%'
  then 'ok: mais de 10 arquivos é recusado' else 'FALHOU: 11' end;
reset role;
