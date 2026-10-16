-- delta v3.61 · a revisão do pagamento
--
-- Apagar o perfil com um plano pago rodando no Asaas fazia o Corre esquecer a assinatura (ela sai junto com o perfil),
-- mas o Asaas seguia cobrando a pessoa todo mês. Agora o banco não deixa: primeiro cancela o plano (o app faz isso
-- sozinho antes de apagar), depois apaga. Quem não é a pessoa (o painel, a função do servidor) passa direto.
--
-- Pode rodar duas vezes. Sem DROP (o conector do Supabase trava em comando que apaga).

begin;

create or replace function public.corre_perfil_sem_assinatura() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(), '') not in ('anon', 'authenticated') then return old; end if;
  if exists (select 1 from public.corre_assinaturas a
              where a.dono = old.id and a.asaas_assinatura is not null and a.status <> 'cancelada') then
    raise exception 'tem plano ativo no Asaas: cancela antes de apagar o perfil' using errcode = 'P0001', hint = 'assinatura_ativa';
  end if;
  return old;
end $$;
revoke all on function public.corre_perfil_sem_assinatura() from public, anon, authenticated;
create or replace trigger corre_perfis_sem_assinatura before delete on public.corre_perfis
  for each row execute function public.corre_perfil_sem_assinatura();

commit;

select 'delta v3.61 ok';
