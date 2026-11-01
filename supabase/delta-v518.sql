-- v5.18 · o número no ícone do Corre no celular (o Thales: "colocar notificação no ícone do celular")
-- O app já punha o número quando tava aberto; com ele fechado, o aviso chegava sem o número e o ícone não mudava.
-- Agora a função push pergunta, pra cada pessoa que recebe o aviso, quanto ela tem esperando: as mensagens não lidas,
-- os pedidos de conversa e os avisos novos do sino (as mesmas contas do app: corre_msg_badge e corre_avisos_n, que
-- leem o login; aqui o login é o de cada pessoa, só dentro desta chamada, e volta como tava). Só o servidor chama.
-- Pode rodar duas vezes.
create or replace function public.corre_icone_n(p_donos uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  d uuid; m jsonb; a int; out jsonb := '{}'::jsonb;
  c0 text := current_setting('request.jwt.claims', true);
  s0 text := current_setting('request.jwt.claim.sub', true);
begin
  foreach d in array coalesce(p_donos[1:200], '{}'::uuid[]) loop
    perform set_config('request.jwt.claims', jsonb_build_object('sub', d, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', d::text, true);
    begin m := public.corre_msg_badge(); exception when others then m := '{}'::jsonb; end;
    begin a := public.corre_avisos_n(); exception when others then a := 0; end;
    out := out || jsonb_build_object(d::text, coalesce((m ->> 'n')::int, 0) + coalesce((m ->> 'pedidos')::int, 0) + coalesce(a, 0));
  end loop;
  perform set_config('request.jwt.claims', coalesce(c0, ''), true);
  perform set_config('request.jwt.claim.sub', coalesce(s0, ''), true);
  return out;
end $$;
revoke all on function public.corre_icone_n(uuid[]) from public, anon, authenticated;
grant execute on function public.corre_icone_n(uuid[]) to service_role;

select 'delta v5.18 ok';
