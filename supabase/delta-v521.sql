-- v5.21 · IBIPORÃ E CURITIBA: as missões novas pagam.
-- O Thales: "faça Ibiporã e Curitiba" e "opção de voar de avião entre todas as cidades". O site da 5.21 trouxe Ibiporã
-- (a leste, pela BR-369) e Curitiba (do outro lado da ponte do Tibagi), duas missões e um bico:
--
--   corre_tarefa_valor   tudo da v5.19 igual; entram motoboy cafe (8, as três cidades), super capelas (7, as três
--                        igrejas) e o bico chef pinhao (1, o pinhão da Rua XV).
--   corre_tarefa_min     cafe e capelas: 60 s.
--
-- O ponto, o teto e o corre_tarefa_termina não mudam. Precisa da v4.11 antes. Pode rodar duas vezes. Sem DROP.
-- Depois dele, não rodar o delta-v519 de novo (volta a lista de antes; aí é só rodar este de novo).
begin;

do $$
begin
  if to_regprocedure('public.corre_tarefa_min(text,text)') is null then
    raise exception 'o delta v5.21 precisa do v4.11 antes (as missões)';
  end if;
end $$;

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
    ('ladrao', 'desmanche', 8), ('detetive', 'nacola', 7), ('pirata', 'contrabando', 7), ('craque', 'racha', 6),
    -- Cambé (v5.19): as missões e os bicos
    ('motoboy', 'cuca', 7), ('policial', 'br369', 8), ('medico', 'transferencia', 8), ('detetive', 'dantzig', 7), ('craque', 'intermunicipal', 7),
    ('rei', 'nacoes', 1), ('cientista', 'riacho', 1), ('chef', 'cuca', 1),
    -- Ibiporã e Curitiba (v5.21)
    ('motoboy', 'cafe', 8), ('super', 'capelas', 7), ('chef', 'pinhao', 1)
  ) as t(u, k, v) where t.u = p_u and t.k = p_k $$;

create or replace function public.corre_tarefa_min(p_u text, p_k text) returns integer
language sql immutable set search_path = public as $$
  select coalesce((select t.s from (values
    ('motoboy', 'rush', 50), ('policial', 'perseguicao', 50), ('bombeiro', 'incendio', 60), ('medico', 'ambulancia', 40),
    ('ladrao', 'desmanche', 50), ('detetive', 'nacola', 60), ('pirata', 'contrabando', 50), ('craque', 'racha', 40),
    ('motoboy', 'cuca', 50), ('policial', 'br369', 50), ('medico', 'transferencia', 50), ('detetive', 'dantzig', 60), ('craque', 'intermunicipal', 40),
    ('motoboy', 'cafe', 60), ('super', 'capelas', 60)
  ) as t(u, k, s) where t.u = p_u and t.k = p_k), 20) $$;
revoke all on function public.corre_tarefa_min(text, text) from public, anon, authenticated;

commit;

select case when public.corre_tarefa_valor('motoboy', 'cafe') = 8 and public.corre_tarefa_valor('super', 'capelas') = 7
             and public.corre_tarefa_valor('chef', 'pinhao') = 1 and public.corre_tarefa_min('super', 'capelas') = 60
             and public.corre_tarefa_valor('motoboy', 'cuca') = 7 and public.corre_tarefa_valor('policial', 'br369') = 8
             and public.corre_tarefa_valor('chef', 'cuca') = 1 and public.corre_tarefa_valor('rei', 'nacoes') = 1
             and public.corre_tarefa_valor('motoboy', 'rush') = 6 and public.corre_tarefa_valor('policial', 'ronda') = 1
             and public.corre_tarefa_min('detetive', 'dantzig') = 60 and public.corre_tarefa_min('chef', 'cuca') = 20
             and public.corre_tarefa_min('pirata', 'contrabando') = 50
            then 'delta v5.21 ok' else 'delta v5.21 NÃO TERMINOU: rode o arquivo inteiro de novo.' end as status;
