-- CORRE · delta v5.12 · a Sala do Cliente
-- O Thales (30/10/2026), sobre a parte de social media: "faça o que tiver que ser feito". A Sala é um link FIXO por
-- marca, que a social media manda uma vez e o cliente guarda. Lá ele: aprova os posts que vêm aí (do jeito que ficam no
-- Instagram), manda o material (foto, vídeo, PDF) sem conta, conta as datas e os pedidos (que viram tarefa no Caderninho
-- de quem cuida da marca), vê o que já foi entregue no mês e abre a cobrança que ela escolheu mostrar.
--   1. corre_aprovacoes.sala (o link fixo: uma sala ligada por marca) e .vendas (as cobranças que a sala mostra)
--   2. a janela que rola (da semana passada até uns 3 meses pra frente): o aprovar e o ajuste de antes seguem valendo
--   3. corre_sala_ver: tudo o que o cliente vê numa chamada (aberta, pelo código, com a cota por conexão)
--   4. o material: a pasta PRIVADA corre-sala no Storage (o cliente só manda, quem cuida da marca lê) e corre_sala_material
--   5. as datas e os pedidos: corre_sala_pedidos, e cada um vira tarefa no Caderninho da dona
--   6. o aviso no celular (o corre_aprov_alvos de antes, mais o material e os pedidos: a função push não muda)
-- Precisa da v4.17 (o link de aprovação), da v4.19 (o Caderninho) e da v5.09 (o ajuste com os itens). Pode rodar duas
-- vezes. Sem DROP e sem DELETE.
begin;

do $$
begin
  if to_regclass('public.corre_aprovacoes') is null or to_regclass('public.corre_caderno') is null
     or to_regprocedure('public.corre_aprov_ajuste(text,uuid,text[],text,text)') is null then
    raise exception 'o delta v5.12 precisa da v4.17, da v4.19 e da v5.09 antes (o link de aprovação, o Caderninho e o ajuste)';
  end if;
end $$;

-- 1) a sala é um link de aprovação que não tem período: um por marca, ligado
alter table public.corre_aprovacoes add column if not exists sala boolean not null default false;
alter table public.corre_aprovacoes add column if not exists vendas uuid[] not null default '{}';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'corre_aprovacoes_vendas_ck' and conrelid = 'public.corre_aprovacoes'::regclass) then
    alter table public.corre_aprovacoes add constraint corre_aprovacoes_vendas_ck check (cardinality(vendas) <= 8);
  end if;
end $$;
create unique index if not exists corre_aprovacoes_sala_key on public.corre_aprovacoes (marca_id) where sala and ativo;

-- 2) a janela: da semana passada (o post atrasado ainda aparece) até 85 dias pra frente (cabe nos 92 do link). Quem abre
-- a sala acerta o de/ate, e por isso o responder e o ajuste da v4.17/v5.09 (que olham o de/ate) valem sem mudar nada.
create or replace function public.corre_sala_abre(p_codigo text, p_tipo text, p_hora int, p_dia int) returns public.corre_aprovacoes
language plpgsql security definer set search_path = public as $$
declare a public.corre_aprovacoes; hj date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  a := public.corre_aprov_link(p_codigo, p_tipo, p_hora, p_dia);
  if not a.sala then raise exception 'link' using errcode = 'P0001', hint = 'link'; end if;
  if a.de <> hj - 7 or a.ate <> hj + 85 then
    update public.corre_aprovacoes set de = hj - 7, ate = hj + 85 where id = a.id returning * into a;
  end if;
  return a;
end $$;
revoke all on function public.corre_sala_abre(text, text, int, int) from public, anon, authenticated;

-- 4) o material que o cliente manda
create table if not exists public.corre_sala_material (
  id uuid primary key default gen_random_uuid(),
  aprov_id uuid not null references public.corre_aprovacoes (id) on delete cascade,
  dono uuid not null references public.corre_perfis (id) on delete cascade,
  marca_id uuid not null references public.corre_portfolio (id) on delete cascade,
  caminho text not null unique check (char_length(caminho) <= 120),
  nome text not null default '' check (char_length(nome) <= 120),
  tipo text not null check (char_length(tipo) <= 60),
  tam bigint not null check (tam between 1 and 157286400),
  quem text not null default '' check (char_length(quem) <= 60),
  msg text not null default '' check (char_length(msg) <= 300),
  em timestamptz not null default now(),
  visto boolean not null default false,
  usado_em timestamptz
);
create index if not exists corre_sala_material_dono_idx on public.corre_sala_material (dono, marca_id, em desc);
create index if not exists corre_sala_material_aprov_idx on public.corre_sala_material (aprov_id, em desc);
alter table public.corre_sala_material enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'corre_sala_material' and policyname = 'sala material: so a dona') then
    create policy "sala material: so a dona" on public.corre_sala_material using (dono = auth.uid()) with check (dono = auth.uid());
  end if;
end $$;
-- (tabela nova no Supabase nasce com tudo pra todo mundo: a dona lê, marca visto/usado e apaga; quem grava é a função)
revoke all on public.corre_sala_material from anon, authenticated;
grant select, delete on public.corre_sala_material to authenticated;
grant update (visto, usado_em) on public.corre_sala_material to authenticated;

-- quem pode subir: o arquivo vai na pasta com o código de uma sala ligada, com nome que o app sorteia, e no máximo 80
-- por dia em cada sala. A dona lê e apaga o que tá registrado no nome dela. (plpgsql: o storage só é lido na hora)
create or replace function public.corre_sala_pode_subir(p_nome text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare cod text := split_part(coalesce(p_nome, ''), '/', 1); n int;
begin
  if coalesce(p_nome, '') !~ '^[0-9a-f]{20}/[a-z0-9-]{8,60}\.[a-z0-9]{2,5}$' then return false; end if;
  if not exists (select 1 from public.corre_aprovacoes a where a.codigo = cod and a.sala and a.ativo) then return false; end if;
  execute 'select count(*) from storage.objects o where o.bucket_id = ''corre-sala'' and o.name like $1 and o.created_at > now() - interval ''1 day'''
    into n using cod || '/%';
  return coalesce(n, 0) < 80;
end $$;
revoke all on function public.corre_sala_pode_subir(text) from public;
grant execute on function public.corre_sala_pode_subir(text) to anon, authenticated;
create or replace function public.corre_sala_da_dona(p_nome text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.corre_sala_material m where m.caminho = p_nome and m.dono = auth.uid()) $$;
revoke all on function public.corre_sala_da_dona(text) from public;
grant execute on function public.corre_sala_da_dona(text) to authenticated;

-- a pasta e as regras dela (só se o Storage existir: o banco de teste não tem)
do $$
begin
  if to_regclass('storage.buckets') is not null then
    execute $q$insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      values ('corre-sala', 'corre-sala', false, 157286400, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
              'video/mp4', 'video/quicktime', 'application/pdf'])
      on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types$q$;
    if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'sala: o cliente manda') then
      execute $q$create policy "sala: o cliente manda" on storage.objects for insert to anon, authenticated
        with check (bucket_id = 'corre-sala' and public.corre_sala_pode_subir(name))$q$;
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'sala: a dona le') then
      execute $q$create policy "sala: a dona le" on storage.objects for select to authenticated
        using (bucket_id = 'corre-sala' and public.corre_sala_da_dona(name))$q$;
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'sala: a dona apaga') then
      execute $q$create policy "sala: a dona apaga" on storage.objects for delete to authenticated
        using (bucket_id = 'corre-sala' and public.corre_sala_da_dona(name))$q$;
    end if;
  end if;
end $$;

-- o cliente subiu: registra (o arquivo tem que estar na pasta da sala, e no Storage de verdade, existir)
create or replace function public.corre_sala_material_poe(p_codigo text, p_caminho text, p_nome text, p_tipo text, p_tam bigint, p_quem text, p_msg text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a public.corre_aprovacoes; ok boolean := true; n int; novo uuid;
begin
  a := public.corre_sala_abre(p_codigo, 'sala-mat', 200, 600);
  if coalesce(p_caminho, '') !~ ('^' || a.codigo || '/[a-z0-9-]{8,60}\.[a-z0-9]{2,5}$') then raise exception 'caminho' using errcode = 'P0001', hint = 'caminho'; end if;
  if coalesce(p_tipo, '') !~ '^(image/(jpeg|png|webp|gif|heic|heif)|video/(mp4|quicktime)|application/pdf)$' then raise exception 'tipo' using errcode = 'P0001', hint = 'tipo'; end if;
  if coalesce(p_tam, 0) < 1 or p_tam > 157286400 then raise exception 'tam' using errcode = 'P0001', hint = 'tam'; end if;
  if to_regclass('storage.objects') is not null then
    execute 'select exists (select 1 from storage.objects o where o.bucket_id = ''corre-sala'' and o.name = $1)' into ok using p_caminho;
    if not ok then raise exception 'arquivo' using errcode = 'P0001', hint = 'arquivo'; end if;
  end if;
  select count(*) into n from public.corre_sala_material m where m.aprov_id = a.id and m.em > now() - interval '1 day';
  if n >= 80 then raise exception 'cheio' using errcode = 'P0001', hint = 'cheio'; end if;
  insert into public.corre_sala_material (aprov_id, dono, marca_id, caminho, nome, tipo, tam, quem, msg)
    values (a.id, a.dono, a.marca_id, p_caminho, left(btrim(coalesce(p_nome, '')), 120), p_tipo, p_tam,
            left(btrim(regexp_replace(coalesce(p_quem, ''), '\s+', ' ', 'g')), 60), left(btrim(coalesce(p_msg, '')), 300))
    on conflict (caminho) do nothing returning id into novo;
  return jsonb_build_object('id', novo);
end $$;
revoke all on function public.corre_sala_material_poe(text, text, text, text, bigint, text, text) from public;
grant execute on function public.corre_sala_material_poe(text, text, text, text, bigint, text, text) to anon, authenticated;

-- 5) as datas e os pedidos: cada um vira tarefa no Caderninho de quem cuida da marca (a data, 5 dias antes, pra dar
-- tempo de fazer o post; o pedido, hoje)
create table if not exists public.corre_sala_pedidos (
  id uuid primary key default gen_random_uuid(),
  aprov_id uuid not null references public.corre_aprovacoes (id) on delete cascade,
  dono uuid not null references public.corre_perfis (id) on delete cascade,
  marca_id uuid not null references public.corre_portfolio (id) on delete cascade,
  tipo text not null check (tipo in ('data', 'pedido')),
  dia date,
  texto text not null check (char_length(texto) between 3 and 500),
  quem text not null default '' check (char_length(quem) <= 60),
  em timestamptz not null default now(),
  tarefa uuid references public.corre_caderno (id) on delete set null,
  visto boolean not null default false,
  check (tipo <> 'data' or dia is not null)
);
create index if not exists corre_sala_pedidos_dono_idx on public.corre_sala_pedidos (dono, marca_id, em desc);
create index if not exists corre_sala_pedidos_aprov_idx on public.corre_sala_pedidos (aprov_id, em desc);
alter table public.corre_sala_pedidos enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'corre_sala_pedidos' and policyname = 'sala pedidos: so a dona') then
    create policy "sala pedidos: so a dona" on public.corre_sala_pedidos using (dono = auth.uid()) with check (dono = auth.uid());
  end if;
end $$;
revoke all on public.corre_sala_pedidos from anon, authenticated;
grant select, delete on public.corre_sala_pedidos to authenticated;
grant update (visto) on public.corre_sala_pedidos to authenticated;

create or replace function public.corre_sala_pede(p_codigo text, p_tipo text, p_dia date, p_texto text, p_quem text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a public.corre_aprovacoes; m public.corre_portfolio; hj date := (now() at time zone 'America/Sao_Paulo')::date;
        tx text; quem text; n int; t uuid; dt date; novo uuid;
begin
  a := public.corre_sala_abre(p_codigo, 'sala-pede', 30, 100);
  if coalesce(p_tipo, '') not in ('data', 'pedido') then raise exception 'tipo' using errcode = 'P0001', hint = 'tipo'; end if;
  tx := btrim(regexp_replace(coalesce(p_texto, ''), '[[:cntrl:]]+', ' ', 'g'));
  if char_length(tx) < 3 then raise exception 'texto' using errcode = 'P0001', hint = 'texto'; end if;
  tx := left(tx, 500);
  if p_tipo = 'data' and (p_dia is null or p_dia < hj or p_dia > hj + 400) then raise exception 'dia' using errcode = 'P0001', hint = 'dia'; end if;
  select count(*) into n from public.corre_sala_pedidos x where x.aprov_id = a.id and x.em > now() - interval '1 day';
  if n >= 20 then raise exception 'cheio' using errcode = 'P0001', hint = 'cheio'; end if;
  quem := left(btrim(regexp_replace(coalesce(p_quem, ''), '\s+', ' ', 'g')), 60);
  select * into m from public.corre_portfolio where id = a.marca_id;
  dt := case when p_tipo = 'data' then greatest(hj, p_dia - 5) else hj end;
  insert into public.corre_caderno (dono, titulo, nota, lista, dia, prio)
    values (a.dono, left(coalesce(m.marca, 'Cliente') || ': ' || tx, 300),
            left(concat_ws(E'\n',
              case when p_tipo = 'data' then 'Data importante: ' || to_char(p_dia, 'DD/MM') || '. Bom post pra preparar.' else 'Pedido do cliente.' end,
              'Veio pela Sala do Cliente' || case when quem <> '' then ', de ' || quem else '' end || '.'), 2000),
            'Sala do Cliente', dt, case when p_tipo = 'pedido' then 2 else 3 end)
    returning id into t;
  insert into public.corre_sala_pedidos (aprov_id, dono, marca_id, tipo, dia, texto, quem, tarefa)
    values (a.id, a.dono, a.marca_id, p_tipo, case when p_tipo = 'data' then p_dia end, tx, quem, t) returning id into novo;
  return jsonb_build_object('id', novo, 'tarefa_dia', dt);
end $$;
revoke all on function public.corre_sala_pede(text, text, date, text, text) from public;
grant execute on function public.corre_sala_pede(text, text, date, text, text) to anon, authenticated;

-- 3) o que o cliente vê: a marca, quem cuida, os posts que vêm aí, o que já saiu no mês (com a conta da aprovação), o
-- material que mandou, os pedidos e as cobranças que a dona escolheu
create or replace function public.corre_sala_ver(p_codigo text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a public.corre_aprovacoes; m public.corre_portfolio; pf public.corre_perfis; hj date := (now() at time zone 'America/Sao_Paulo')::date;
        mes date; ps jsonb; ent jsonb; conta record; mats jsonb; peds jsonb; vds jsonb;
begin
  a := public.corre_sala_abre(p_codigo, 'sala-ver', 120, 600);
  update public.corre_aprovacoes set aberto_em = now() where id = a.id;
  mes := date_trunc('month', hj)::date;
  select * into m from public.corre_portfolio where id = a.marca_id;
  select * into pf from public.corre_perfis where id = a.dono;
  -- pra aprovar: o que tem arte e ainda não saiu (o que já saiu vai pro "entregue")
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'data', p.data, 'hora', p.hora, 'formato', p.formato, 'titulo', p.titulo,
           'legenda', p.legenda, 'alt', p.alt, 'midia', p.midia_url, 'midias', p.midias, 'aprov', p.aprov, 'nota', p.aprov_nota,
           'itens', to_jsonb(p.aprov_itens), 'quem', p.aprov_quem, 'em', p.aprov_em, 'publicado', false)
           order by p.data, p.hora, p.created_at), '[]'::jsonb) into ps
    from (select * from public.corre_posts q where q.dono = a.dono and q.marca_id = a.marca_id and q.data between a.de and a.ate
            and coalesce(q.midia_url, '') <> '' and not (coalesce(q.ig_status, '') = 'publicado' or q.status = 'postado')
            order by q.data, q.hora, q.created_at limit 150) p;
  -- o entregue no mês: o que saiu, e a conta da aprovação (quantos aprovados, quantos ajustes, com quantos dias de
  -- antecedência o cliente aprovou, em média)
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'data', p.data, 'formato', p.formato, 'titulo', p.titulo, 'midia', p.midia_url,
           'link', case when coalesce(p.ig_link, '') ~ '^https://' then p.ig_link else '' end) order by p.data desc, p.hora desc), '[]'::jsonb) into ent
    from (select * from public.corre_posts q where q.dono = a.dono and q.marca_id = a.marca_id and q.data >= mes and q.data <= hj
            and coalesce(q.midia_url, '') <> '' and (coalesce(q.ig_status, '') = 'publicado' or q.status = 'postado')
            order by q.data desc limit 60) p;
  select count(*) filter (where q.aprov = 'aprovado') ap, count(*) filter (where q.aprov = 'ajuste') aj,
         round(avg(q.data - (q.aprov_em at time zone 'America/Sao_Paulo')::date) filter (where q.aprov = 'aprovado' and q.aprov_em is not null), 1) ant
    into conta from public.corre_posts q
    where q.dono = a.dono and q.marca_id = a.marca_id and q.data >= mes and q.data < (mes + interval '1 month')::date and coalesce(q.midia_url, '') <> '';
  select coalesce(jsonb_agg(jsonb_build_object('nome', x.nome, 'tipo', x.tipo, 'tam', x.tam, 'quem', x.quem, 'msg', x.msg, 'em', x.em,
           'usado', x.usado_em is not null) order by x.em desc), '[]'::jsonb) into mats
    from (select * from public.corre_sala_material y where y.aprov_id = a.id order by y.em desc limit 40) x;
  select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'tipo', x.tipo, 'dia', x.dia, 'texto', x.texto, 'quem', x.quem, 'em', x.em,
           'feito', coalesce(c.feito, false)) order by x.em desc), '[]'::jsonb) into peds
    from (select * from public.corre_sala_pedidos y where y.aprov_id = a.id order by y.em desc limit 30) x
    left join public.corre_caderno c on c.id = x.tarefa;
  -- só o que a dona escolheu, só dela, e só o que ainda faz sentido (orçamento, a receber e o pago dos últimos 60 dias)
  select coalesce(jsonb_agg(jsonb_build_object('codigo', v.codigo, 'total', v.total, 'st', v.st, 'vence', v.vence, 'validade', v.validade,
           'pago_em', v.pago_em, 'recorrente', v.recorrente, 'sinal', v.sinal, 'sinal_em', v.sinal_em,
           'resumo', left(coalesce((select string_agg(e ->> 'n', ', ') from jsonb_array_elements(case when jsonb_typeof(v.itens) = 'array' then v.itens else '[]'::jsonb end) e), ''), 120))
           order by v.created_at desc), '[]'::jsonb) into vds
    from public.corre_vendas v where v.id = any(a.vendas) and v.dono = a.dono
      and (v.st in ('orcamento', 'fechado') or (v.st = 'pago' and v.pago_em >= hj - 60));
  return jsonb_build_object('marca', jsonb_build_object('nome', m.marca, 'rede', coalesce(m.rede, ''), 'cor', coalesce(m.cor, ''), 'logo', coalesce(m.logo_url, '')),
    'de', a.de, 'ate', a.ate, 'msg', a.msg, 'respondido_em', a.respondido_em, 'hoje', hj, 'mes', mes,
    'quem', jsonb_build_object('nome', coalesce(pf.nome, ''), 'handle', coalesce(pf.handle, ''), 'avatar', coalesce(pf.avatar_url, ''),
                               'whats', coalesce(pf.whats_publico, '')),
    'posts', ps, 'entregue', ent, 'conta', jsonb_build_object('aprovados', coalesce(conta.ap, 0), 'ajustes', coalesce(conta.aj, 0), 'antecedencia', conta.ant),
    'materiais', mats, 'pedidos', peds, 'vendas', vds);
end $$;
revoke all on function public.corre_sala_ver(text) from public;
grant execute on function public.corre_sala_ver(text) to anon, authenticated;

-- 6) o aviso no celular: o de antes (o cliente terminou a aprovação), mais o material (um aviso a cada 10 minutos por
-- sala, com a conta dos arquivos) e cada pedido. A função push já chama este (acao "pedidos"), então ela não muda.
create or replace function public.corre_aprov_alvos(p_agora timestamptz default now()) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a record; k text; ja bigint; subs jsonb; r record; mostra boolean; titulo text; corpo text; out jsonb := '[]'::jsonb;
begin
  for a in select x.*, m.marca as marca_nome from public.corre_aprovacoes x join public.corre_portfolio m on m.id = x.marca_id
            where x.respondido_em > p_agora - interval '10 minutes' and x.respondido_em <= p_agora + interval '1 minute' order by x.respondido_em limit 100 loop
    continue when coalesce((select pr.msg from public.corre_push_pref pr where pr.dono = a.dono), true) = false;
    subs := (select jsonb_agg(jsonb_build_object('endpoint', d.endpoint, 'p256dh', d.p256dh, 'auth', d.auth) order by d.visto_em desc)
               from (select * from public.corre_push d2 where d2.dono = a.dono order by d2.visto_em desc limit 10) d);
    continue when subs is null;
    k := 'aprov:' || a.id || ':' || a.respondido_em;
    insert into public.corre_push_log (chave, quem) values (left(k, 200), null) on conflict do nothing;
    get diagnostics ja = row_count;
    continue when ja = 0;
    select count(*) filter (where p.aprov = 'aprovado') ap, count(*) filter (where p.aprov = 'ajuste') aj, count(*) filter (where p.aprov = '') falta into r
      from public.corre_posts p where p.dono = a.dono and p.marca_id = a.marca_id and p.data between a.de and a.ate and coalesce(p.midia_url, '') <> '';
    mostra := coalesce((select pr.texto from public.corre_push_pref pr where pr.dono = a.dono), true);
    titulo := coalesce(nullif(a.quem, ''), 'O cliente') || ' respondeu a aprovação · ' || a.marca_nome;
    corpo := case when mostra then
               concat_ws(', ', case when r.ap = 1 then '1 aprovado' when r.ap > 1 then r.ap || ' aprovados' end,
                               case when r.aj = 1 then '1 pede ajuste' when r.aj > 1 then r.aj || ' pedem ajuste' end,
                               case when r.falta = 1 then '1 sem resposta' when r.falta > 1 then r.falta || ' sem resposta' end) || '. Toca pra ver.'
             else 'Toca pra ver as respostas.' end;
    out := out || jsonb_build_array(jsonb_build_object('para', a.dono, 'tipo', 'aprovacao', 'subs', subs,
      'payload', jsonb_build_object('titulo', left(titulo, 120), 'corpo', left(corpo, 300), 'url', '/#/studio/' || a.marca_id,
                                    'tag', 'aprov-' || a.id, 'renotify', true, 't', 'aprovacao', 'em', now())));
  end loop;
  -- v5.12: o material da Sala do Cliente
  for a in select x.aprov_id, x.dono, x.marca_id, max(m.marca) as marca_nome, count(*) as n, max(x.em) as ult,
                  (array_agg(x.quem order by x.em desc))[1] as quem
             from public.corre_sala_material x join public.corre_portfolio m on m.id = x.marca_id
            where x.em > p_agora - interval '10 minutes' and x.em <= p_agora + interval '1 minute'
            group by x.aprov_id, x.dono, x.marca_id limit 100 loop
    continue when coalesce((select pr.msg from public.corre_push_pref pr where pr.dono = a.dono), true) = false;
    subs := (select jsonb_agg(jsonb_build_object('endpoint', d.endpoint, 'p256dh', d.p256dh, 'auth', d.auth) order by d.visto_em desc)
               from (select * from public.corre_push d2 where d2.dono = a.dono order by d2.visto_em desc limit 10) d);
    continue when subs is null;
    k := 'sala-mat:' || a.aprov_id || ':' || floor(extract(epoch from a.ult) / 600)::bigint;
    insert into public.corre_push_log (chave, quem) values (left(k, 200), null) on conflict do nothing;
    get diagnostics ja = row_count;
    continue when ja = 0;
    titulo := coalesce(nullif(a.quem, ''), 'O cliente') || ' mandou material · ' || a.marca_nome;
    corpo := case when a.n = 1 then '1 arquivo' else a.n || ' arquivos' end || ' na Sala do Cliente. Toca pra ver.';
    out := out || jsonb_build_array(jsonb_build_object('para', a.dono, 'tipo', 'sala', 'subs', subs,
      'payload', jsonb_build_object('titulo', left(titulo, 120), 'corpo', left(corpo, 300), 'url', '/#/studio/sala/' || a.marca_id,
                                    'tag', 'sala-' || a.aprov_id, 'renotify', true, 't', 'sala', 'em', now())));
  end loop;
  -- v5.12: as datas e os pedidos da Sala (cada um, uma vez)
  for a in select x.*, m.marca as marca_nome from public.corre_sala_pedidos x join public.corre_portfolio m on m.id = x.marca_id
            where x.em > p_agora - interval '10 minutes' and x.em <= p_agora + interval '1 minute' order by x.em limit 100 loop
    continue when coalesce((select pr.msg from public.corre_push_pref pr where pr.dono = a.dono), true) = false;
    subs := (select jsonb_agg(jsonb_build_object('endpoint', d.endpoint, 'p256dh', d.p256dh, 'auth', d.auth) order by d.visto_em desc)
               from (select * from public.corre_push d2 where d2.dono = a.dono order by d2.visto_em desc limit 10) d);
    continue when subs is null;
    k := 'sala-ped:' || a.id;
    insert into public.corre_push_log (chave, quem) values (left(k, 200), null) on conflict do nothing;
    get diagnostics ja = row_count;
    continue when ja = 0;
    mostra := coalesce((select pr.texto from public.corre_push_pref pr where pr.dono = a.dono), true);
    titulo := (case when a.tipo = 'data' then 'Data importante' else 'Pedido' end) || ' na Sala do Cliente · ' || a.marca_nome;
    corpo := case when mostra then (case when a.tipo = 'data' then to_char(a.dia, 'DD/MM') || ': ' else '' end) || a.texto || ' Já tá no teu Caderninho.'
             else 'Já tá no teu Caderninho. Toca pra ver.' end;
    out := out || jsonb_build_array(jsonb_build_object('para', a.dono, 'tipo', 'sala', 'subs', subs,
      'payload', jsonb_build_object('titulo', left(titulo, 120), 'corpo', left(corpo, 300), 'url', '/#/studio/sala/' || a.marca_id,
                                    'tag', 'sala-ped-' || a.id, 'renotify', true, 't', 'sala', 'em', now())));
  end loop;
  return out;
end $$;
revoke all on function public.corre_aprov_alvos(timestamptz) from public, anon, authenticated;
grant execute on function public.corre_aprov_alvos(timestamptz) to service_role;

commit;

select case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'corre_aprovacoes' and column_name = 'sala')
             and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'corre_aprovacoes' and column_name = 'vendas')
             and to_regclass('public.corre_aprovacoes_sala_key') is not null
             and (select relrowsecurity from pg_class where oid = 'public.corre_sala_material'::regclass)
             and (select relrowsecurity from pg_class where oid = 'public.corre_sala_pedidos'::regclass)
             and not has_table_privilege('anon', 'public.corre_sala_material', 'select')
             and not has_table_privilege('anon', 'public.corre_sala_pedidos', 'select')
             and not has_table_privilege('authenticated', 'public.corre_sala_material', 'insert')
             and has_function_privilege('anon', 'public.corre_sala_ver(text)', 'execute')
             and has_function_privilege('anon', 'public.corre_sala_pede(text,text,date,text,text)', 'execute')
             and has_function_privilege('anon', 'public.corre_sala_material_poe(text,text,text,text,bigint,text,text)', 'execute')
             and not has_function_privilege('anon', 'public.corre_sala_abre(text,text,integer,integer)', 'execute')
             and not has_function_privilege('anon', 'public.corre_aprov_alvos(timestamptz)', 'execute')
             and position('sala-ped:' in (select prosrc from pg_proc where oid = 'public.corre_aprov_alvos(timestamptz)'::regprocedure)) > 0
             and (to_regclass('storage.buckets') is null
                  or (xpath('/row/n/text()', query_to_xml($q$select count(*) as n from storage.buckets where id = 'corre-sala' and not public$q$, false, true, '')))[1]::text::int > 0)
            then 'delta v5.12 ok' else 'delta v5.12 NÃO TERMINOU: rode o arquivo inteiro de novo.' end as status;
