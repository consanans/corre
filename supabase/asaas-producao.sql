-- CORRE · sair do sandbox do Asaas (v3.61)
--
-- Rodar UMA vez, logo depois de trocar a ASAAS_API_KEY de teste ($aact_hmlg_...) pela chave de produção, e ANTES de tocar
-- em "Ligar o Asaas" no app. Os cadastros, assinaturas e pagamentos feitos no sandbox não existem na conta de verdade:
-- se ficassem, a pessoa que testou ia ter plano "pago" de mentira e o Corre tentaria cobrar num cadastro que não existe.
--
-- O que fica: o teste grátis de 30 dias do Hórus e do Studio Houzi de cada pessoa (com a data em que acaba).
-- O que sai: tudo que veio do Asaas de teste.

begin;

delete from public.corre_asaas_eventos;
delete from public.corre_asaas_clientes;
-- o Studio não tem teste grátis: a linha só existe por causa de assinatura (de teste)
delete from public.corre_assinaturas where produto = 'studio';
-- Hórus e Studio Houzi: volta pro teste grátis (que acaba na data de sempre; se já acabou, a pessoa assina de verdade)
update public.corre_assinaturas
   set asaas_assinatura = null, link = '', pago_ate = null, nivel = 1, status = 'teste', updated_at = now()
 where asaas_assinatura is not null or pago_ate is not null or status <> 'teste';

commit;

select 'sandbox limpo: ' || (select count(*) from public.corre_assinaturas) || ' testes grátis guardados';
