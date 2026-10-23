-- v4.32 · O BICHO MAIS PERTO. O Thales: "vamos mudar o último pra 15 mil, se não vai demorar demais".
-- A v4.30 pôs a lenda em 150.000 tarefas e o resto proporcional. Aqui tudo cai pra um décimo, na mesma proporção:
--   as formas (etapa): 0 ovo · 1 a partir de 300 tarefas · 2 a partir de 1.500 · 3 a partir de 5.000 · 4 (lenda) a partir de 15.000
--   os poderes (só o site conta, bicho.js): Farejar 300, Memória 1.000, Passeio 1.500, Foco 3.000, Escudo 5.000,
--   Brilho 10.000, lenda 15.000
--   o escudo: 1 a partir de 5.000, 2 na lenda
--   o adianto de quem nasce: até 1.499 (a véspera da 2ª forma)
--   a cidade (o Passeio): quem tem 1.500 ou mais
--   o bom dia: "Faltam N tarefas pro ovo chocar" conta até 300
-- Só troca as funções que têm os números (as mesmas da v4.30, create or replace). O bicho que já existe fica com as
-- tarefas que tem; o adianto de quem já nasceu não muda.
-- Precisa da v4.30. Pode rodar duas vezes. Sem DROP. Depois dele, não rodar o delta-v430.sql de novo (ele volta os
-- números de antes; aí é só rodar este de novo).
begin;

do $$ begin
  if to_regclass('public.corre_bicho') is null then raise exception 'rode antes o delta-v430.sql (o bicho)'; end if;
end $$;

-- as formas (os mesmos números do site, bicho.js)
create or replace function public.corre_bicho_etapa(p_xp int) returns int language sql immutable set search_path = public as $$
  select case when p_xp >= 15000 then 4 when p_xp >= 5000 then 3 when p_xp >= 1500 then 2 when p_xp >= 300 then 1 else 0 end $$;

-- os escudos pra usar no dia: 1 a partir de 5.000 tarefas, 2 na lenda (15.000), menos os dias que ele cobriu nos últimos 7
create or replace function public.corre_bicho_escudos(p_dono uuid, p_dia date) returns int
language sql stable security definer set search_path = public as $$
  select coalesce((select greatest(0, (case when x.xp >= 15000 then 2 when x.xp >= 5000 then 1 else 0 end)
                     - (select count(*) from unnest(b.escudos) e where e > p_dia - 7 and e <= p_dia))::int
                     from public.corre_bicho b, lateral (select public.corre_bicho_xp(b.dono) as xp) x where b.dono = p_dono), 0) $$;
revoke all on function public.corre_bicho_escudos(uuid, date) from public, anon, authenticated;

-- nascer: uma vez. O adianto conta as tarefas feitas antes, até a véspera da 2ª forma (1.499)
create or replace function public.corre_bicho_escolhe(p_especie text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare eu uuid := auth.uid(); n int;
begin
  if eu is null or not exists (select 1 from public.corre_perfis where id = eu) then return jsonb_build_object('tem', false, 'motivo', 'login'); end if;
  if p_especie is null or p_especie not in ('gralha', 'guara', 'coruja') then return jsonb_build_object('tem', false, 'motivo', 'especie'); end if;
  if not exists (select 1 from public.corre_bicho where dono = eu) then
    select count(*) into n from (
      select c.id, (c.feito_em at time zone 'America/Sao_Paulo')::date as d from public.corre_caderno c where c.dono = eu and c.feito and c.feito_em is not null
      union select c.id, f.d from public.corre_caderno c, unnest(c.feitas) as f(d) where c.dono = eu
      union select t.ref, t.dia from public.corre_trampo t where t.dono = eu and t.tipo = 'caderno') x;
    insert into public.corre_bicho (dono, especie, xp_antes) values (eu, p_especie, least(1499, coalesce(n, 0))) on conflict (dono) do nothing;
  end if;
  return public.corre_bicho_meu();
end $$;
revoke all on function public.corre_bicho_escolhe(text) from public, anon;
grant execute on function public.corre_bicho_escolhe(text) to authenticated;

-- a cidade: quem tem o Passeio (1.500 tarefas), só a espécie e a forma
create or replace function public.corre_bichos_cidade() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(b.dono, jsonb_build_array(b.especie, public.corre_bicho_etapa(x.xp))), '{}'::jsonb)
    from public.corre_bicho b, lateral (select public.corre_bicho_xp(b.dono) as xp) x where x.xp >= 1500 $$;
revoke all on function public.corre_bichos_cidade() from public, anon;
grant execute on function public.corre_bichos_cidade() to authenticated;

-- o bom dia: o mesmo da v4.30, com o "faltam N pro ovo chocar" contando até 300
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
    begin
      select count(*) into nl from public.corre_leads l where l.dono = f.dono and l.prox <= hj and coalesce(l.st, '') not in ('fechado', 'perdido', 'nao_encontrado');
    exception when others then nl := 0; end;
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

commit;

select case when public.corre_bicho_etapa(299) = 0 and public.corre_bicho_etapa(300) = 1 and public.corre_bicho_etapa(1500) = 2
             and public.corre_bicho_etapa(5000) = 3 and public.corre_bicho_etapa(14999) = 3 and public.corre_bicho_etapa(15000) = 4
             and has_function_privilege('authenticated', 'public.corre_bicho_escolhe(text)', 'execute')
             and not has_function_privilege('anon', 'public.corre_bicho_escolhe(text)', 'execute')
             and has_function_privilege('authenticated', 'public.corre_bichos_cidade()', 'execute')
             and not has_function_privilege('authenticated', 'public.corre_bicho_escudos(uuid, date)', 'execute')
             and not has_function_privilege('authenticated', 'public.corre_bomdia_alvos(timestamptz)', 'execute')
            then 'delta v4.32 ok' else 'delta v4.32 FALHOU' end;
