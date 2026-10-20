-- v4.11 · O TRAMPO VIRA GTA: as missões pagam mais e pedem mais tempo, o bico paga o mínimo.
-- O Thales: "vamos aumentar a lógica dos correais pra pessoa ter que trabalhar mais e os trabalhos serem bem mais
-- complexos. Devem usar carros, NPCs, motos, patinetes, barcos". O site da 4.11 trouxe 8 missões (de carro, moto,
-- patinete e barco, com polícia na cola) e as 42 tarefas de antes viraram bico.
--
--   corre_tarefa_valor   os 42 bicos valem 1 ponto (0,03); as 8 missões valem de 6 a 8 (0,18 a 0,24). O ponto (0,03)
--                        e o teto do dia (1,00) não mudam: fechar o dia agora é umas 5 missões, ou 33 bicos.
--   corre_tarefa_min     o tempo mínimo de cada uma: bico 20 s, como antes; missão de 40 a 60 s (o banco não paga
--                        missão feita mais rápido que isso: o site espera e confere de novo, como já fazia).
--   corre_tarefa_termina igual à da v3.43, com o mínimo lido da corre_tarefa_min no lugar do 20 fixo.
--
-- Precisa da v3.43 antes (o ponto e o teto em funções). Pode rodar duas vezes. Sem DROP. Site antigo (antes da 4.11)
-- com o delta: as tarefas dele seguem funcionando e pagam 0,03 (o rótulo dele ainda mostra o valor antigo até subir o zip).
begin;

do $$
begin
  if to_regprocedure('public.corre_correal_ponto()') is null or to_regprocedure('public.corre_tarefa_termina(uuid)') is null then
    raise exception 'o delta v4.11 precisa do v3.43 antes (o correal em centavos)';
  end if;
end $$;

-- 1) O VALOR de cada tarefa, em pontos (o correal é pontos x 0,03). As missões entram aqui, senão o corre_tarefa_comeca
-- recusa (hint 'tarefa').
create or replace function public.corre_tarefa_valor(p_u text, p_k text) returns integer
language sql immutable set search_path = public as $$
  select t.v from (values
    ('policial', 'ronda', 1), ('policial', 'ladrao', 1), ('policial', 'transito', 1),
    ('bombeiro', 'fogo', 1), ('bombeiro', 'gato', 1), ('bombeiro', 'treino', 1),
    ('medico', 'socorro', 1), ('medico', 'vacina', 1), ('medico', 'plantao', 1),
    ('chef', 'pastel', 1), ('chef', 'smash', 1), ('chef', 'churros', 1),
    ('motoboy', 'entrega', 1), ('motoboy', 'acai', 1), ('motoboy', 'envelope', 1),
    ('craque', 'gols', 1), ('craque', 'peneira', 1), ('craque', 'embaixadinha', 1),
    ('ladrao', 'pipoca', 1), ('ladrao', 'churros', 1), ('ladrao', 'despista', 1),
    ('detetive', 'pistas', 1), ('detetive', 'testemunha', 1), ('detetive', 'rastro', 1),
    ('cientista', 'amostra', 1), ('cientista', 'ipe', 1), ('cientista', 'clima', 1),
    ('pirata', 'tesouro', 1), ('pirata', 'bandeira', 1), ('pirata', 'mapa', 1),
    ('astronauta', 'contagem', 1), ('astronauta', 'treino', 1), ('astronauta', 'estrelas', 1),
    ('ninja', 'pergaminho', 1), ('ninja', 'telhados', 1), ('ninja', 'meditar', 1),
    ('super', 'patrulha', 1), ('super', 'resgate', 1), ('super', 'pipa', 1),
    ('rei', 'fita', 1), ('rei', 'discurso', 1), ('rei', 'visita', 1),
    -- as missões (v4.11)
    ('motoboy', 'rush', 6), ('policial', 'perseguicao', 8), ('bombeiro', 'incendio', 8), ('medico', 'ambulancia', 7),
    ('ladrao', 'desmanche', 8), ('detetive', 'nacola', 7), ('pirata', 'contrabando', 7), ('craque', 'racha', 6)
  ) as t(u, k, v) where t.u = p_u and t.k = p_k $$;

-- 2) O TEMPO MÍNIMO de cada uma, em segundos (bico: 20, como sempre foi)
create or replace function public.corre_tarefa_min(p_u text, p_k text) returns integer
language sql immutable set search_path = public as $$
  select coalesce((select t.s from (values
    ('motoboy', 'rush', 50), ('policial', 'perseguicao', 50), ('bombeiro', 'incendio', 60), ('medico', 'ambulancia', 40),
    ('ladrao', 'desmanche', 50), ('detetive', 'nacola', 60), ('pirata', 'contrabando', 50), ('craque', 'racha', 40)
  ) as t(u, k, s) where t.u = p_u and t.k = p_k), 20) $$;
revoke all on function public.corre_tarefa_min(text, text) from public, anon, authenticated;

-- 3) A TAREFA PAGA: a mesma da v3.43, com o mínimo de cada uma
create or replace function public.corre_tarefa_termina(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare eu uuid := auth.uid(); t public.corre_tarefa_vez%rowtype; seg numeric; pts int; v numeric; teto numeric := public.corre_correal_teto();
        hoje numeric; ganhou numeric; s numeric; m int;
begin
  if eu is null then return jsonb_build_object('ok', false, 'motivo', 'login'); end if;
  select * into t from public.corre_tarefa_vez where id = p_id and dono = eu for update;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'sem_tarefa'); end if;
  seg := extract(epoch from now() - t.comecou);
  m := coalesce(public.corre_tarefa_min(t.u, t.k), 20);
  if seg < m then return jsonb_build_object('ok', false, 'motivo', 'rapido', 'falta', ceil(m - seg)::int); end if;
  delete from public.corre_tarefa_vez where id = t.id;
  if seg > 1800 then return jsonb_build_object('ok', false, 'motivo', 'velha'); end if;
  pts := coalesce(public.corre_tarefa_valor(t.u, t.k), 0);
  v := round(pts * public.corre_correal_ponto(), 2);
  perform pg_advisory_xact_lock(hashtext('correal:' || eu::text));
  hoje := public.corre_correal_hoje(eu);
  ganhou := greatest(0, least(v, teto - hoje));
  if ganhou > 0 then
    insert into public.corre_correal_log (dono, valor, motivo) values (eu, ganhou, 'tarefa:' || t.u || ':' || t.k);
    insert into public.corre_correal as c (dono, saldo, ganho) values (eu, ganhou, ganhou)
      on conflict (dono) do update set saldo = c.saldo + excluded.saldo, ganho = c.ganho + excluded.ganho, updated_at = now();
  end if;
  select saldo into s from public.corre_correal where dono = eu;
  return jsonb_build_object('ok', true, 'ganhou', ganhou, 'valia', v, 'pontos', pts, 'saldo', coalesce(s, 0),
                            'hoje', hoje + ganhou, 'teto', teto);
end $$;

commit;

select case when public.corre_tarefa_valor('motoboy', 'rush') = 6 and public.corre_tarefa_valor('policial', 'perseguicao') = 8
             and public.corre_tarefa_valor('policial', 'ronda') = 1 and public.corre_tarefa_min('pirata', 'contrabando') = 50
             and public.corre_tarefa_min('chef', 'pastel') = 20
             and position('corre_tarefa_min' in (select prosrc from pg_proc where oid = 'public.corre_tarefa_termina(uuid)'::regprocedure)) > 0
             and has_function_privilege('authenticated', 'public.corre_tarefa_termina(uuid)', 'execute')
            then 'delta v4.11 ok' else 'delta v4.11 NÃO TERMINOU: rode o arquivo inteiro de novo.' end as status;
