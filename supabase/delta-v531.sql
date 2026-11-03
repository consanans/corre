-- v5.31 · OS PACOTES DE CORREAL (o Thales: "pra quem tá fora do Correverso e estiver acabando a moeda pra usar IA,
-- vamo fazer pacote de comprar correal, só que cada correal deve custar uns 2 reais"; e "maravilha, mete marcha").
-- Muda uma regra da casa: até aqui o correal NÃO se comprava com real. Desde a 5.31 ele se compra em pacote, pagamento
-- único pelo Asaas (Pix ou cartão, como as skins pagas), e continua não se vendendo, não se transferindo e não voltando
-- em dinheiro (só na desistência de 7 dias, e só o que não foi gasto). É o mesmo correal de sempre: serve na IA, nos
-- voos e no Ateliê.
--   5 correais R$ 9,90 · 10 correais R$ 19,90 · 25 correais R$ 49,90 (uns R$ 1,99 cada; pacote de 1 seria quase todo
--   tarifa do Asaas)
-- O que entra:
--   corre_correal_pacotes()   os pacotes e os preços (o único lugar; a função "pagamento" lê daqui)
--   corre_correal_pedidos     cada compra: o pacote, quantos correais, o valor, Pix ou cartão, a cobrança no Asaas, a
--                             situação (pendente, paga, devolvendo, estornada, cancelada), a versão dos Termos aceita e, na
--                             desistência, quanto voltou. A pessoa lê os dela; quem escreve é a função, pelas funções daqui
--   corre_correal_loja()      o que o app lê: os pacotes e as compras dos últimos 40 dias (o link só da que espera)
--   do servidor (só a chave de serviço): corre_cp_pode, corre_cp_novo, corre_cp_paga (pagou: o correal cai no saldo,
--   uma vez), corre_cp_volta (estorno ou contestação que não foi pelo app: sai o que ainda tiver, até o pacote),
--   corre_cp_cai (venceu sem pagar), corre_cp_abertos, corre_cp_ver, corre_cp_desiste (a desistência: separa o que não
--   foi gasto e tira do saldo ANTES de devolver no Asaas), corre_cp_desfaz (o Asaas recusou: o correal volta) e
--   corre_cp_devolvido (o Asaas devolveu: fecha).
-- O correal comprado não entra no extrato (corre_correal_log): a trava de lá não deixa linha de mais de 1, e a compra
-- já fica inteira aqui, com a cobrança. Não conta pro teto do dia (o teto olha só o que a tarefa pagou).
--
-- Precisa do v3.43 (o correal em centavos) e do v3.60 (o Asaas) antes; confere sozinho.
-- Pode rodar duas vezes. Sem DROP. Pra rodar: SQL Editor do Supabase, colar o arquivo inteiro, Run. No fim aparece
-- "delta v5.31 ok".
begin;

do $$
begin
  if to_regprocedure('public.corre_correal_meu()') is null or to_regclass('public.corre_correal') is null then
    raise exception 'o delta v5.31 precisa do v3.43 antes (o correal em centavos)';
  end if;
  if to_regclass('public.corre_asaas_clientes') is null then
    raise exception 'o delta v5.31 precisa do v3.60 antes (o Asaas)';
  end if;
end $$;

-- 1) OS PACOTES (qualquer um lê: são só números)
create or replace function public.corre_correal_pacotes() returns table (pacote text, correal numeric, reais numeric)
language sql immutable set search_path = public as $$
  values ('p5'::text, 5.00::numeric, 9.90::numeric), ('p10', 10.00, 19.90), ('p25', 25.00, 49.90) $$;
revoke all on function public.corre_correal_pacotes() from public, anon, authenticated, service_role;
grant execute on function public.corre_correal_pacotes() to public;

-- 2) AS COMPRAS
create table if not exists public.corre_correal_pedidos (
  id                uuid primary key default gen_random_uuid(),
  dono              uuid not null references public.corre_perfis (id) on delete cascade,
  pacote            text not null check (pacote ~ '^p[0-9]{1,3}$'),
  correal           numeric(12,2) not null check (correal > 0 and correal <= 1000),
  valor             numeric(10,2) not null check (valor > 0 and valor < 2000),
  forma             text not null check (forma in ('pix', 'cartao')),
  status            text not null default 'pendente' check (status in ('pendente', 'paga', 'devolvendo', 'estornada', 'cancelada')),
  asaas_cobranca    text not null unique,
  link              text not null default '',
  termos            text not null check (termos ~ '^\d{4}-\d{2}-\d{2}$'),
  criado            timestamptz not null default now(),
  pago_em           timestamptz,
  desistiu_em       timestamptz,
  volta_correal     numeric(12,2),
  volta_valor       numeric(10,2),
  atualizado        timestamptz not null default now()
);
create index if not exists corre_correal_pedidos_dono on public.corre_correal_pedidos (dono, criado desc);
alter table public.corre_correal_pedidos enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'corre_correal_pedidos' and policyname = 'pedidos de correal: vejo os meus') then
    create policy "pedidos de correal: vejo os meus" on public.corre_correal_pedidos for select using (dono = auth.uid());
  end if;
end $$;
-- a pessoa só lê; ninguém do app escreve. A função escreve pelas funções abaixo (que rodam como dono do banco)
revoke all on public.corre_correal_pedidos from anon, authenticated;
grant select on public.corre_correal_pedidos to authenticated;
revoke truncate, references, trigger on public.corre_correal_pedidos from service_role;

-- 3) O QUE O APP LÊ: os pacotes e as compras dos últimos 40 dias (o link só da que tá esperando o pagamento; a
-- desistência a função confere de novo no Asaas: aqui é só pra mostrar o botão)
create or replace function public.corre_correal_loja() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'pacotes', (select coalesce(jsonb_agg(jsonb_build_object('pacote', k.pacote, 'correal', k.correal, 'reais', k.reais) order by k.correal), '[]'::jsonb) from public.corre_correal_pacotes() k),
    'pedidos', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'pacote', p.pacote, 'correal', p.correal, 'valor', p.valor, 'forma', p.forma,
                  'status', p.status, 'link', case when p.status = 'pendente' then p.link else '' end, 'criado', p.criado, 'pago_em', p.pago_em,
                  'volta_correal', p.volta_correal, 'volta_valor', p.volta_valor,
                  'desiste', case when p.status = 'paga' and p.desistiu_em is null and p.pago_em > now() - interval '7 days'
                                  then ((p.pago_em at time zone 'America/Sao_Paulo')::date + 7) end) order by p.criado desc), '[]'::jsonb)
                  from public.corre_correal_pedidos p where p.dono = auth.uid() and p.criado > now() - interval '40 days'
                    and p.status <> 'cancelada'),
    'saldo', (select coalesce(saldo, 0) from public.corre_correal where dono = auth.uid())) $$;
revoke all on function public.corre_correal_loja() from public, anon, authenticated, service_role;
grant execute on function public.corre_correal_loja() to authenticated;

-- 4) O SERVIDOR (só a função "pagamento", com a chave de serviço)
-- o pacote existe? quanto custa, e a compra do mesmo pacote que tá esperando pagamento (pra não abrir duas faturas)
create or replace function public.corre_cp_pode(p_dono uuid, p_pacote text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('reais', (select reais from public.corre_correal_pacotes() where pacote = p_pacote),
    'correal', (select correal from public.corre_correal_pacotes() where pacote = p_pacote),
    'pendente', (select jsonb_build_object('id', p.id, 'cobranca', p.asaas_cobranca, 'forma', p.forma, 'link', p.link, 'criado', p.criado)
                   from public.corre_correal_pedidos p where p.dono = p_dono and p.pacote = p_pacote and p.status = 'pendente' order by p.criado desc limit 1)) $$;
-- a compra nova (o valor e os correais são sempre os daqui; a pendente do mesmo pacote, que a função já apagou no Asaas,
-- vira cancelada)
create or replace function public.corre_cp_novo(p_dono uuid, p_pacote text, p_forma text, p_cobranca text, p_link text, p_termos text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k record; i uuid;
begin
  select * into k from public.corre_correal_pacotes() where pacote = p_pacote;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'pacote'); end if;
  update public.corre_correal_pedidos set status = 'cancelada', link = '', atualizado = now() where dono = p_dono and pacote = p_pacote and status = 'pendente';
  insert into public.corre_correal_pedidos (dono, pacote, correal, valor, forma, asaas_cobranca, link, termos)
    values (p_dono, p_pacote, k.correal, k.reais, p_forma, p_cobranca, coalesce(p_link, ''), p_termos) returning id into i;
  return jsonb_build_object('ok', true, 'id', i, 'valor', k.reais, 'correal', k.correal);
end $$;
-- pagou: o correal cai no saldo (uma vez só; pagamento menor que o pedido não libera; o que foi estornado não volta).
-- O mesmo cadeado da carteira (o gasto da IA e a tarefa usam ele)
create or replace function public.corre_cp_paga(p_cobranca text, p_valor numeric) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p public.corre_correal_pedidos%rowtype; s numeric;
begin
  select * into p from public.corre_correal_pedidos where asaas_cobranca = p_cobranca for update;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'sem_pedido'); end if;
  if p.status in ('paga', 'devolvendo') then return jsonb_build_object('ok', true, 'ja', true, 'dono', p.dono, 'correal', p.correal); end if;
  if p.status = 'estornada' then return jsonb_build_object('ok', false, 'motivo', 'estornada'); end if;
  if coalesce(p_valor, 0) < p.valor - 0.005 then return jsonb_build_object('ok', false, 'motivo', 'valor'); end if;
  perform pg_advisory_xact_lock(hashtext('correal:' || p.dono::text));
  update public.corre_correal_pedidos set status = 'paga', pago_em = now(), link = '', atualizado = now() where id = p.id;
  insert into public.corre_correal (dono, saldo) values (p.dono, p.correal)
    on conflict (dono) do update set saldo = public.corre_correal.saldo + excluded.saldo, updated_at = now()
    returning saldo into s;
  return jsonb_build_object('ok', true, 'dono', p.dono, 'correal', p.correal, 'saldo', s);
end $$;
-- o dinheiro voltou sem ser pela desistência do app (estorno no painel ou contestação no cartão): sai do saldo o que
-- ainda tiver, até o tamanho do pacote (o que já foi gasto não tem como sair). Desistência do app já tirou antes: só fecha
create or replace function public.corre_cp_volta(p_cobranca text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p public.corre_correal_pedidos%rowtype; s numeric; tira numeric;
begin
  select * into p from public.corre_correal_pedidos where asaas_cobranca = p_cobranca for update;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'sem_pedido'); end if;
  if p.status in ('devolvendo', 'estornada') then
    update public.corre_correal_pedidos set status = 'estornada', link = '', atualizado = now() where id = p.id;
    return jsonb_build_object('ok', true, 'ja', true);
  end if;
  if p.status <> 'paga' then
    update public.corre_correal_pedidos set status = 'cancelada', link = '', atualizado = now() where id = p.id;
    return jsonb_build_object('ok', true, 'tirou', 0);
  end if;
  perform pg_advisory_xact_lock(hashtext('correal:' || p.dono::text));
  select saldo into s from public.corre_correal where dono = p.dono for update;
  tira := least(coalesce(s, 0), p.correal);
  if tira > 0 then update public.corre_correal set saldo = saldo - tira, updated_at = now() where dono = p.dono returning saldo into s; end if;
  update public.corre_correal_pedidos set status = 'estornada', link = '', volta_correal = tira, atualizado = now() where id = p.id;
  return jsonb_build_object('ok', true, 'tirou', tira, 'saldo', s);
end $$;
-- a fatura venceu (ou sumiu) sem pagar
create or replace function public.corre_cp_cai(p_cobranca text) returns jsonb
language sql security definer set search_path = public as $$
  with m as (update public.corre_correal_pedidos set status = 'cancelada', link = '', atualizado = now()
              where asaas_cobranca = p_cobranca and status = 'pendente' returning id)
  select jsonb_build_object('ok', true, 'mudou', exists (select 1 from m)) $$;
-- as que esperam pagamento (pra conferir no Asaas quando o aviso não chegou) e uma compra da pessoa
create or replace function public.corre_cp_abertos(p_dono uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'pacote', p.pacote, 'cobranca', p.asaas_cobranca, 'valor', p.valor, 'correal', p.correal)), '[]'::jsonb)
    from public.corre_correal_pedidos p where p.dono = p_dono and p.status = 'pendente' and p.criado > now() - interval '3 days' $$;
create or replace function public.corre_cp_ver(p_dono uuid, p_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(p) || jsonb_build_object('saldo', (select coalesce(saldo, 0) from public.corre_correal where dono = p_dono))
    from public.corre_correal_pedidos p where p.dono = p_dono and p.id = p_id $$;
-- a desistência (7 dias, CDC art. 49): devolve o que NÃO foi gasto. Separa os correais (o que tiver no saldo, até o
-- pacote), tira do saldo agora (pra não dar pra gastar enquanto o dinheiro volta) e diz quanto volta em real
-- (proporcional: 3 de 5 correais de R$ 9,90 = R$ 5,94). A função devolve no Asaas e chama o corre_cp_devolvido; se o
-- Asaas recusar, o corre_cp_desfaz põe o correal de volta. Com p_ver, só conta (não mexe em nada)
create or replace function public.corre_cp_desiste(p_dono uuid, p_id uuid, p_ver boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p public.corre_correal_pedidos%rowtype; s numeric; tira numeric; v numeric;
begin
  select * into p from public.corre_correal_pedidos where id = p_id and dono = p_dono for update;
  if not found then return jsonb_build_object('pode', false, 'motivo', 'sem_pagamento'); end if;
  if p.status in ('estornada', 'devolvendo') then return jsonb_build_object('pode', false, 'motivo', 'devolvido'); end if;
  if p.status <> 'paga' then return jsonb_build_object('pode', false, 'motivo', 'sem_pagamento'); end if;
  if p.desistiu_em is not null then return jsonb_build_object('pode', false, 'motivo', 'ja'); end if;
  perform pg_advisory_xact_lock(hashtext('correal:' || p_dono::text));
  select saldo into s from public.corre_correal where dono = p_dono for update;
  tira := least(coalesce(s, 0), p.correal);
  if tira <= 0 then return jsonb_build_object('pode', false, 'motivo', 'gasto'); end if;
  v := round(p.valor * tira / p.correal, 2);
  if v < 0.01 then return jsonb_build_object('pode', false, 'motivo', 'gasto'); end if;
  if coalesce(p_ver, false) then return jsonb_build_object('pode', true, 'correal', tira, 'valor', v, 'cobranca', p.asaas_cobranca, 'total', p.valor); end if;
  update public.corre_correal set saldo = saldo - tira, updated_at = now() where dono = p_dono returning saldo into s;
  update public.corre_correal_pedidos set status = 'devolvendo', volta_correal = tira, volta_valor = v, desistiu_em = now(), atualizado = now() where id = p.id;
  return jsonb_build_object('pode', true, 'correal', tira, 'valor', v, 'cobranca', p.asaas_cobranca, 'total', p.valor, 'saldo', s);
end $$;
-- o Asaas recusou a devolução: o correal separado volta pro saldo e a compra volta a ser paga
create or replace function public.corre_cp_desfaz(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p public.corre_correal_pedidos%rowtype; s numeric;
begin
  select * into p from public.corre_correal_pedidos where id = p_id for update;
  if not found or p.status <> 'devolvendo' then return jsonb_build_object('ok', false); end if;
  perform pg_advisory_xact_lock(hashtext('correal:' || p.dono::text));
  update public.corre_correal set saldo = saldo + coalesce(p.volta_correal, 0), updated_at = now() where dono = p.dono returning saldo into s;
  update public.corre_correal_pedidos set status = 'paga', volta_correal = null, volta_valor = null, desistiu_em = null, atualizado = now() where id = p.id;
  return jsonb_build_object('ok', true, 'saldo', s);
end $$;
-- o Asaas devolveu: fecha
create or replace function public.corre_cp_devolvido(p_id uuid) returns jsonb
language sql security definer set search_path = public as $$
  with m as (update public.corre_correal_pedidos set status = 'estornada', atualizado = now() where id = p_id and status = 'devolvendo' returning id)
  select jsonb_build_object('ok', true, 'mudou', exists (select 1 from m)) $$;
revoke all on function public.corre_cp_pode(uuid, text), public.corre_cp_novo(uuid, text, text, text, text, text), public.corre_cp_paga(text, numeric),
  public.corre_cp_volta(text), public.corre_cp_cai(text), public.corre_cp_abertos(uuid), public.corre_cp_ver(uuid, uuid),
  public.corre_cp_desiste(uuid, uuid, boolean), public.corre_cp_desfaz(uuid), public.corre_cp_devolvido(uuid) from public, anon, authenticated;
grant execute on function public.corre_cp_pode(uuid, text), public.corre_cp_novo(uuid, text, text, text, text, text), public.corre_cp_paga(text, numeric),
  public.corre_cp_volta(text), public.corre_cp_cai(text), public.corre_cp_abertos(uuid), public.corre_cp_ver(uuid, uuid),
  public.corre_cp_desiste(uuid, uuid, boolean), public.corre_cp_desfaz(uuid), public.corre_cp_devolvido(uuid) to service_role;

commit;

select case when (select count(*) from public.corre_correal_pacotes()) = 3
             and (select reais from public.corre_correal_pacotes() where pacote = 'p5') = 9.90
             and (select correal from public.corre_correal_pacotes() where pacote = 'p25') = 25
             and to_regclass('public.corre_correal_pedidos') is not null
             and has_function_privilege('service_role', 'public.corre_cp_paga(text, numeric)', 'execute')
             and not has_function_privilege('authenticated', 'public.corre_cp_paga(text, numeric)', 'execute')
             and not has_function_privilege('anon', 'public.corre_cp_desiste(uuid, uuid, boolean)', 'execute')
             and has_function_privilege('authenticated', 'public.corre_correal_loja()', 'execute')
             and not has_function_privilege('anon', 'public.corre_correal_loja()', 'execute')
             and not has_table_privilege('authenticated', 'public.corre_correal_pedidos', 'insert')
            then 'delta v5.31 ok' else 'delta v5.31 NÃO TERMINOU: rode o arquivo inteiro de novo.' end as status;
