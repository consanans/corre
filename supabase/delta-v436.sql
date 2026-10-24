-- v4.36 · O HÓRUS DE SEGUNDA A SEXTA. O Thales (sábado, 24/10/2026): "o horus tem que funcionar de segunda a sexta,
-- amigo. entrei agora no app e tem um monte de notificação do horus".
-- O site já trata o retorno que cai no sábado ou no domingo como da segunda (C.horusDia em core.js). Aqui, o servidor:
--   o bom dia do celular (corre_bomdia_alvos) não conta "cliente pra retornar" no sábado e no domingo;
--   o piloto automático (corre_piloto_de) não põe "Retomar cliente" no Caderninho no fim de semana.
-- Pedido de orçamento, Mural e Atendente seguem avisando qualquer dia (é o cliente chamando).
-- As duas funções são as da v4.32 e da v4.34 (create or replace), só com o dia da semana a mais.
-- Precisa da v4.32 e da v4.34. Pode rodar duas vezes. Sem DROP. Depois dele, não rodar o delta-v432.sql nem o
-- delta-v434.sql de novo (eles voltam a função de antes; aí é só rodar este de novo).
begin;

do $$ begin
  if to_regprocedure('public.corre_bomdia_alvos(timestamptz)') is null then raise exception 'rode antes o delta-v432.sql (o bom dia)'; end if;
  if to_regprocedure('public.corre_piloto_de(uuid, timestamptz)') is null then raise exception 'rode antes o delta-v434.sql (o piloto)'; end if;
end $$;

-- o bom dia: o mesmo da v4.32, sem os clientes do Hórus no fim de semana
create or replace function public.corre_bomdia_alvos(p_agora timestamptz default now()) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  f record; ja bigint; subs jsonb; mostra boolean; hj date := (p_agora at time zone 'America/Sao_Paulo')::date;
  nh int; na int; np int; nl int; nv int; t1 text; ph text; pm text; b record; xp int; et int; nome text;
  partes text[]; corpo text; titulo text; out jsonb := '[]'::jsonb;
begin
  for f in select * from public.corre_bomdia_fila(p_agora) limit 500 loop
    insert into public.corre_push_log (chave, quem) values (left(f.chave, 200), null) on conflict do nothing;
    get diagnostics ja = row_count;
    continue when ja = 0;
    subs := (select jsonb_agg(jsonb_build_object('endpoint', d.endpoint, 'p256dh', d.p256dh, 'auth', d.auth) order by d.visto_em desc)
               from (select * from public.corre_push d2 where d2.dono = f.dono order by d2.visto_em desc limit 10) d);
    continue when subs is null;
    nh := 0; na := 0; np := 0; nl := 0; nv := 0; t1 := null; ph := null; pm := null; partes := '{}';
    select count(*) filter (where c.dia = hj), count(*) filter (where c.dia < hj) into nh, na
      from public.corre_caderno c where c.dono = f.dono and c.pai is null and not c.feito and c.dia <= hj;
    select c.titulo into t1 from public.corre_caderno c where c.dono = f.dono and c.pai is null and not c.feito and c.dia <= hj
     order by (c.dia < hj) desc, c.prio, c.hora nulls last, c.ordem limit 1;
    begin
      select count(*) into np from public.corre_posts p where p.dono = f.dono and p.data = hj
         and coalesce(p.ig_status, '') <> 'publicado' and coalesce(p.status, '') not in ('postado', 'ideia');
      if np = 1 then
        select nullif(left(coalesce(p.hora, ''), 5), ''), m.marca into ph, pm from public.corre_posts p
          left join public.corre_portfolio m on m.id = p.marca_id
         where p.dono = f.dono and p.data = hj and coalesce(p.ig_status, '') <> 'publicado' and coalesce(p.status, '') not in ('postado', 'ideia') limit 1;
      end if;
    exception when others then np := 0; end;
    -- v4.36: o Hórus é de segunda a sexta; no sábado e no domingo o bom dia não conta cliente pra retornar
    -- (na segunda, o retorno que caiu no fim de semana entra junto, porque o prox dele é <= hoje)
    if extract(isodow from hj) < 6 then
      begin
        select count(*) into nl from public.corre_leads l where l.dono = f.dono and l.prox <= hj and coalesce(l.st, '') not in ('fechado', 'perdido', 'nao_encontrado');
      exception when others then nl := 0; end;
    end if;
    begin
      select count(*) into nv from public.corre_vendas v where v.dono = f.dono and v.st = 'fechado' and v.vence = hj;
    exception when others then nv := 0; end;
    continue when nh + na + np + nl + nv = 0;
    mostra := coalesce((select pr.texto from public.corre_push_pref pr where pr.dono = f.dono), true);
    if nh + na > 0 then partes := partes || ((nh + na) || case when nh + na = 1 then ' tarefa' else ' tarefas' end || case when na > 0 then ' (' || na || ' de antes)' else '' end); end if;
    if np = 1 then partes := partes || ('o post' || case when mostra and pm is not null then ' da ' || left(pm, 30) else '' end
                     || case when ph ~ '^\d{1,2}:\d{2}$' then ' às ' || split_part(ph, ':', 1)::int || 'h' || case when split_part(ph, ':', 2) <> '00' then split_part(ph, ':', 2) else '' end else '' end);
    elsif np > 1 then partes := partes || (np || ' posts pra sair'); end if;
    if nl > 0 then partes := partes || (nl || case when nl = 1 then ' cliente pra retornar' else ' clientes pra retornar' end); end if;
    if nv > 0 then partes := partes || (nv || case when nv = 1 then ' cobrança pra receber' else ' cobranças pra receber' end); end if;
    corpo := 'Hoje: ' || public.corre_lista_e(partes) || '.';
    if mostra and t1 is not null then corpo := corpo || ' Começa por: ' || left(t1, 80) || '.'; end if;
    select * into b from public.corre_bicho where corre_bicho.dono = f.dono;
    if b.dono is not null then
      xp := public.corre_bicho_xp(f.dono); et := public.corre_bicho_etapa(xp);
      nome := coalesce(nullif(b.apelido, ''), public.corre_bicho_nome(b.especie, et));
      titulo := case when et = 0 then 'Bom dia! Teu ovo tá quentinho' else nome || ': bom dia!' end;
      if et = 0 then corpo := corpo || ' Faltam ' || (300 - xp)::text || case when 300 - xp = 1 then ' tarefa' else ' tarefas' end || ' pro ovo chocar.'; end if;
    else titulo := 'Bom dia!'; end if;
    out := out || jsonb_build_array(jsonb_build_object('para', f.dono, 'tipo', 'bomdia', 'subs', subs,
      'payload', jsonb_build_object('titulo', left(titulo, 120), 'corpo', left(corpo, 300), 'url', '/#/caderninho',
                                    'tag', 'bomdia', 'renotify', true, 't', 'bomdia', 'em', now())));
  end loop;
  return out;
end $$;
revoke all on function public.corre_bomdia_alvos(timestamptz) from public, anon, authenticated;
grant execute on function public.corre_bomdia_alvos(timestamptz) to service_role;

-- o piloto: o mesmo da v4.34, sem o "esfria" no fim de semana
create or replace function public.corre_piloto_de(p_dono uuid, p_agora timestamptz default now()) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  cfg jsonb; hj date := (p_agora at time zone 'America/Sao_Paulo')::date; r record; tid uuid; tit text; dias int; out jsonb := '[]'::jsonb;
  nome text; quanto int; etapa text;
begin
  select public.corre_piloto_limpa(p.receitas) into cfg from public.corre_piloto p where p.dono = p_dono and p.ligado;
  if cfg is null then return out; end if;

  -- esfria: o cliente em andamento parado há N dias (sem retorno marcado pra frente)
  -- v4.36: o Hórus é de segunda a sexta; no fim de semana o piloto não põe "Retomar" (na segunda ele olha de novo)
  if (cfg #>> '{esfria,on}')::boolean and extract(isodow from hj) < 6 then
    dias := (cfg #>> '{esfria,dias}')::int;
    for r in select l.id, l.nome, l.st, l.wa, l.fixo, coalesce(u.t, l.updated_at) as ult
               from public.corre_leads l
               left join lateral (select max(public.corre_piloto_ts(e ->> 't')) as t
                                    from jsonb_array_elements(case when jsonb_typeof(l.hist) = 'array' then l.hist else '[]'::jsonb end) e) u on true
              where l.dono = p_dono and l.st in ('contato', 'interesse', 'link') and (l.prox is null or l.prox <= hj)
                and coalesce(u.t, l.updated_at) < p_agora - make_interval(days => dias)
              order by (l.st = 'link') desc, l.valor desc nulls last, coalesce(u.t, l.updated_at)
              limit 5 loop
      nome := left(btrim(coalesce(r.nome, 'o cliente')), 60);
      quanto := greatest(dias, hj - (r.ult at time zone 'America/Sao_Paulo')::date);
      etapa := case r.st when 'contato' then 'contatado, sem resposta' when 'interesse' then 'interessado, parado' else 'proposta parada' end;
      tit := 'Retomar ' || nome || ' (' || etapa || ' há ' || quanto || ' dias)';
      tid := public.corre_piloto_poe(p_dono, 'esfria', r.id::text, tit,
        'O piloto viu que esse cliente esfriou. Uma mensagem curta agora vale mais que a perfeita depois.', hj, 2::smallint,
        jsonb_build_object('t', 'lead', 'id', r.id, 'wa', coalesce(nullif(r.wa, ''), nullif(r.fixo, ''), '')), make_interval(days => dias));
      if tid is not null then out := out || jsonb_build_array(jsonb_build_object('receita', 'esfria', 'titulo', tit, 'tarefa', tid)); end if;
    end loop;
  end if;

  -- cobra: venda fechada que venceu (ou vence hoje) e não foi paga. O valor não vai no título: aparece na tela do celular
  if (cfg #>> '{cobra,on}')::boolean then
    for r in select v.id, v.cliente, v.vence, v.whats from public.corre_vendas v
              where v.dono = p_dono and v.st = 'fechado' and v.pago_em is null and v.vence is not null and v.vence <= hj and v.vence >= hj - 120
              order by v.vence limit 5 loop
      tit := 'Cobrar ' || left(btrim(coalesce(nullif(r.cliente, ''), 'o cliente')), 60) || case when r.vence = hj then ' (vence hoje)' else ' (venceu ' || to_char(r.vence, 'DD/MM') || ')' end;
      tid := public.corre_piloto_poe(p_dono, 'cobra', r.id::text, tit,
        'O piloto achou essa cobrança em aberto. Manda o lembrete com o Pix ou o link do orçamento.', hj,
        (case when r.vence < hj then 1 else 2 end)::smallint, jsonb_build_object('t', 'venda', 'id', r.id, 'wa', coalesce(r.whats, '')), interval '3 days');
      if tid is not null then out := out || jsonb_build_array(jsonb_build_object('receita', 'cobra', 'titulo', tit, 'tarefa', tid)); end if;
    end loop;
  end if;

  -- studio: a marca com o @ que não tem post nos próximos N dias
  if (cfg #>> '{studio,on}')::boolean then
    dias := (cfg #>> '{studio,dias}')::int;
    for r in select m.id, m.marca from public.corre_portfolio m
              where m.dono = p_dono and btrim(coalesce(m.rede, '')) <> ''
                and not exists (select 1 from public.corre_posts x where x.marca_id = m.id and x.data between hj and hj + dias and coalesce(x.status, '') <> 'ideia')
              order by m.ordem nulls last, m.created_at limit 3 loop
      tit := 'Programar os posts da ' || left(btrim(coalesce(nullif(r.marca, ''), 'marca')), 60) || ' (nada nos próximos ' || dias || ' dias)';
      tid := public.corre_piloto_poe(p_dono, 'studio', r.id::text, tit,
        'O piloto viu a agenda da marca vazia. O Mês com IA do Studio enche a semana numa tacada.', hj, 2::smallint,
        jsonb_build_object('t', 'marca', 'id', r.id), interval '7 days');
      if tid is not null then out := out || jsonb_build_array(jsonb_build_object('receita', 'studio', 'titulo', tit, 'tarefa', tid)); end if;
    end loop;
  end if;

  -- aprovado: o cliente aprovou o orçamento pelo link; vira começar (hoje) e entregar (no dia da entrega)
  if (cfg #>> '{aprovado,on}')::boolean then
    for r in select v.id, v.cliente, v.entrega, v.whats, coalesce(v.itens -> 0 ->> 'n', '') as item from public.corre_vendas v
              where v.dono = p_dono and v.aprovado_em > p_agora - interval '3 days' and v.st in ('fechado', 'pago')
              order by v.aprovado_em limit 5 loop
      nome := left(btrim(coalesce(nullif(r.cliente, ''), 'o cliente')), 60);
      tit := 'Começar ' || case when btrim(r.item) <> '' then left(btrim(r.item), 60) || ' de ' else 'o trabalho de ' end || nome;
      tid := public.corre_piloto_poe(p_dono, 'aprovado', r.id::text || ':comeca', tit,
        'Aprovou o orçamento pelo link. Combina os detalhes e o começo com o cliente.', hj, 2::smallint,
        jsonb_build_object('t', 'venda', 'id', r.id, 'wa', coalesce(r.whats, '')), interval '3650 days');
      if tid is not null then out := out || jsonb_build_array(jsonb_build_object('receita', 'aprovado', 'titulo', tit, 'tarefa', tid)); end if;
      if r.entrega is not null and r.entrega >= hj then
        tit := 'Entregar pra ' || nome;
        tid := public.corre_piloto_poe(p_dono, 'aprovado', r.id::text || ':entrega', tit, 'O dia da entrega que tá no orçamento.', r.entrega, 2::smallint,
          jsonb_build_object('t', 'venda', 'id', r.id, 'wa', coalesce(r.whats, '')), interval '3650 days');
        if tid is not null then out := out || jsonb_build_array(jsonb_build_object('receita', 'aprovado', 'titulo', tit, 'tarefa', tid)); end if;
      end if;
    end loop;
  end if;

  update public.corre_piloto set rodou_em = now() where dono = p_dono;
  return out;
end $$;
revoke all on function public.corre_piloto_de(uuid, timestamptz) from public, anon, authenticated;

commit;

select case when has_function_privilege('service_role', 'public.corre_bomdia_alvos(timestamptz)', 'execute')
             and not has_function_privilege('authenticated', 'public.corre_bomdia_alvos(timestamptz)', 'execute')
             and not has_function_privilege('authenticated', 'public.corre_piloto_de(uuid,timestamptz)', 'execute')
             and position('isodow' in pg_get_functiondef('public.corre_bomdia_alvos(timestamptz)'::regprocedure)) > 0
             and position('isodow' in pg_get_functiondef('public.corre_piloto_de(uuid,timestamptz)'::regprocedure)) > 0
            then 'delta v4.36 ok' else 'delta v4.36 FALHOU' end;
