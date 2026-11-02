-- v5.19 · CAMBÉ ABRIU: as missões que cruzam a BR-369 pagam.
-- O Thales: "faz missões que vão até Cambé e voltam pra Londrina, coisas de todo tipo, pra interagir as duas cidades".
-- O site da 5.19 trouxe Cambé no Correverso (a oeste, ligada pela BR-369), cinco missões e três bicos novos:
--
--   corre_tarefa_valor   as 42 de antes e as 8 missões da v4.11 iguais; entram as missões de Cambé (motoboy cuca 7,
--                        policial br369 8, medico transferencia 8, detetive dantzig 7, craque intermunicipal 7) e os
--                        bicos (rei nacoes, cientista riacho, chef cuca: 1 ponto, 0,03).
--   corre_tarefa_min     o tempo mínimo das missões novas (a BR-369 é longe: de 40 a 60 s, como as de antes).
--
-- O ponto (0,03), o teto do dia (1,00) e o corre_tarefa_termina não mudam. Precisa da v4.11 antes. Pode rodar duas
-- vezes. Sem DROP. Site antigo com o delta: nada muda pra ele (ele não pede as tarefas novas).
begin;

do $$
begin
  if to_regprocedure('public.corre_tarefa_min(text,text)') is null then
    raise exception 'o delta v5.19 precisa do v4.11 antes (as missões)';
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
    ('rei', 'nacoes', 1), ('cientista', 'riacho', 1), ('chef', 'cuca', 1)
  ) as t(u, k, v) where t.u = p_u and t.k = p_k $$;

create or replace function public.corre_tarefa_min(p_u text, p_k text) returns integer
language sql immutable set search_path = public as $$
  select coalesce((select t.s from (values
    ('motoboy', 'rush', 50), ('policial', 'perseguicao', 50), ('bombeiro', 'incendio', 60), ('medico', 'ambulancia', 40),
    ('ladrao', 'desmanche', 50), ('detetive', 'nacola', 60), ('pirata', 'contrabando', 50), ('craque', 'racha', 40),
    ('motoboy', 'cuca', 50), ('policial', 'br369', 50), ('medico', 'transferencia', 50), ('detetive', 'dantzig', 60), ('craque', 'intermunicipal', 40)
  ) as t(u, k, s) where t.u = p_u and t.k = p_k), 20) $$;
revoke all on function public.corre_tarefa_min(text, text) from public, anon, authenticated;

commit;

select case when public.corre_tarefa_valor('motoboy', 'cuca') = 7 and public.corre_tarefa_valor('policial', 'br369') = 8
             and public.corre_tarefa_valor('chef', 'cuca') = 1 and public.corre_tarefa_valor('rei', 'nacoes') = 1
             and public.corre_tarefa_valor('motoboy', 'rush') = 6 and public.corre_tarefa_valor('policial', 'ronda') = 1
             and public.corre_tarefa_min('detetive', 'dantzig') = 60 and public.corre_tarefa_min('chef', 'cuca') = 20
             and public.corre_tarefa_min('pirata', 'contrabando') = 50
            then 'delta v5.19 ok' else 'delta v5.19 NÃO TERMINOU: rode o arquivo inteiro de novo.' end as status;
