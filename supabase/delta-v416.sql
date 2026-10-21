-- v4.16 · O HÓRUS VIRA CRM: o valor de cada negócio e o aviso na hora em que chega pedido.
-- O Thales: "vamos crescer!", "talvez melhorar o hórus", "questão é mensagens, leads", "fazer tipo um RD Station".
-- O site da 4.16 trouxe o funil (arrastar o cliente entre Contatado, Interessado, Proposta e Fechado, com o valor em R$ e
-- a previsão do mês), a Entrada (quem chegou sozinho: pedido de orçamento, Mural, mensagem no Corre) e o relatório do
-- funil. Aqui:
--
--   corre_leads.valor    quanto vale o negócio (R$, até 99.999.999,99; vazio = ainda sem valor). O app grava como os
--                        outros campos do lead (só a dona, a política de sempre).
--   corre_pedidos_alvos  o aviso no celular do que o cliente acabou de fazer: pediu orçamento pelo link, escolheu tua
--                        proposta no Mural ou aprovou o orçamento (o link da venda), nos últimos 10 minutos, um aviso
--                        por vez (marcado no corre_push_log antes de sair, então chamar de novo não repete). Só o
--                        servidor chama: a função push (acao "pedidos", sem login, porque o cliente não tem conta)
--                        entrega. Quem desligou as Mensagens nos avisos não recebe; quem escondeu o texto das mensagens
--                        recebe sem o pedido escrito.
--
-- Precisa da v3.35 (os avisos no celular). Pode rodar duas vezes. Sem DROP. Site antigo com o delta: nada muda pra ele.
begin;

do $$
begin
  if to_regclass('public.corre_push_log') is null or to_regclass('public.corre_push_pref') is null then
    raise exception 'o delta v4.16 precisa dos avisos no celular (v3.35) antes';
  end if;
end $$;

-- 1) o valor do negócio
alter table public.corre_leads add column if not exists valor numeric(12,2);
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'corre_leads_valor_check' and conrelid = 'public.corre_leads'::regclass) then
    alter table public.corre_leads add constraint corre_leads_valor_check check (valor is null or (valor >= 0 and valor <= 99999999.99));
  end if;
end $$;

-- 2) o que mexeu agora (a busca do aviso olha só os leads mexidos nos últimos minutos)
create index if not exists corre_leads_mexido_idx on public.corre_leads (updated_at);

-- 3) os avisos dos pedidos que acabaram de chegar (o mesmo formato do corre_lembretes_alvos: [{ para, subs, payload }])
create or replace function public.corre_pedidos_alvos(p_agora timestamptz default now()) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  l record; e jsonb; t timestamptz; v text; k text; ja bigint; subs jsonb; mostra boolean;
  titulo text; corpo text; quem text;
  out jsonb := '[]'::jsonb;
begin
  for l in select x.id, x.dono, x.nome, x.fonte, x.hist from public.corre_leads x
            where x.updated_at > p_agora - interval '10 minutes'
              and jsonb_typeof(x.hist) = 'array' and jsonb_array_length(x.hist) > 0
            order by x.updated_at limit 200 loop
    -- o registro de cima é o que o cliente acabou de pôr (corre_pedir_orcamento, corre_mural_escolher e
    -- corre_orcamento_aprovar põem na frente, com estes textos)
    e := l.hist -> 0;
    continue when coalesce(e ->> 'k', '') <> 'res';
    t := null;
    begin t := (e ->> 't')::timestamptz; exception when others then t := null; end;
    continue when t is null or t < p_agora - interval '10 minutes' or t > p_agora + interval '1 minute';
    v := coalesce(e ->> 'v', '');
    continue when not (v like 'Pediu orçamento pelo link%' or v ~ '^Mural: .* escolheu tua proposta' or v = 'Aprovou o orçamento pelo link.');
    continue when coalesce((select pr.msg from public.corre_push_pref pr where pr.dono = l.dono), true) = false;
    subs := (select jsonb_agg(jsonb_build_object('endpoint', d.endpoint, 'p256dh', d.p256dh, 'auth', d.auth) order by d.visto_em desc)
               from (select * from public.corre_push d2 where d2.dono = l.dono order by d2.visto_em desc limit 10) d);
    continue when subs is null;
    -- um aviso por pedido: a marca entra antes de sair (outra chamada ao mesmo tempo não manda de novo)
    k := 'ped:' || l.id || ':' || (e ->> 't');
    insert into public.corre_push_log (chave, quem) values (left(k, 200), null) on conflict do nothing;
    get diagnostics ja = row_count;
    continue when ja = 0;
    mostra := coalesce((select pr.texto from public.corre_push_pref pr where pr.dono = l.dono), true);
    quem := left(btrim(coalesce(l.nome, '')), 60);
    if v = 'Aprovou o orçamento pelo link.' then
      titulo := 'Orçamento aprovado' || case when quem <> '' then ': ' || quem else '' end;
      corpo := 'Fechou! Toca pra ver a venda.';
    elsif v ~ '^Mural: ' then
      titulo := 'Te escolheram no Mural';
      corpo := case when mostra then coalesce(nullif(substring(v from '^Mural: (.*) escolheu tua proposta'), '') || ' escolheu tua proposta. ', '')
                                     || 'Chama no WhatsApp antes de esfriar.'
                    else 'Escolheram tua proposta. Toca pra ver.' end;
    else
      titulo := 'Pedido de orçamento' || case when quem <> '' then ': ' || quem else '' end;
      corpo := case when mostra and v like 'Pediu orçamento pelo link: %' then substring(v from length('Pediu orçamento pelo link: ') + 1)
                    else 'Chegou pelo teu link. Toca pra responder no WhatsApp.' end;
    end if;
    out := out || jsonb_build_array(jsonb_build_object('para', l.dono, 'tipo', case when v = 'Aprovou o orçamento pelo link.' then 'aprovou' when v ~ '^Mural: ' then 'mural' else 'link' end, 'subs', subs,
      'payload', jsonb_build_object('titulo', left(titulo, 120), 'corpo', left(corpo, 300),
                                    'url', case when v = 'Aprovou o orçamento pelo link.' then '/#/corre' else '/#/horus/entrada' end,
                                    'tag', 'ped-' || l.id, 'renotify', true, 't', 'pedido', 'em', now())));
  end loop;
  return out;
end $$;
revoke all on function public.corre_pedidos_alvos(timestamptz) from public, anon, authenticated;
grant execute on function public.corre_pedidos_alvos(timestamptz) to service_role;

commit;

select case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'corre_leads' and column_name = 'valor')
             and exists (select 1 from pg_constraint where conname = 'corre_leads_valor_check')
             and to_regprocedure('public.corre_pedidos_alvos(timestamptz)') is not null
             and not has_function_privilege('authenticated', 'public.corre_pedidos_alvos(timestamptz)', 'execute')
             and not has_function_privilege('anon', 'public.corre_pedidos_alvos(timestamptz)', 'execute')
            then 'delta v4.16 ok' else 'delta v4.16 NÃO TERMINOU: rode o arquivo inteiro de novo.' end as status;
