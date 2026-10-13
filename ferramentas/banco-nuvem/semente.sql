-- Semente: o que já existe ANTES dos deltas, como em produção antes da v3.43. Roda logo depois do Supabase de mentira.
-- A carteira "do Thales" (perfil ...c): saldo 9, ganho 9, gasto 0, e o extrato em correal inteiro, com tarefa de ontem,
-- um gasto que voltou (valor negativo no extrato) e uma tarefa de HOJE (conta no teto do dia depois da conversão).
-- Serve pra provar que o delta v3.43 divide por 10 uma vez só, mesmo rodando duas vezes.
insert into public.corre_perfis (id) values ('00000000-0000-0000-0000-00000000000c');
insert into public.corre_correal (dono, saldo, ganho, gasto) values ('00000000-0000-0000-0000-00000000000c', 9, 9, 0);
insert into public.corre_correal_log (dono, valor, motivo, created_at) values
  ('00000000-0000-0000-0000-00000000000c', 5, 'tarefa:policial:ladrao', now() - interval '1 day'),
  ('00000000-0000-0000-0000-00000000000c', -2, 'gasto:legenda', now() - interval '1 day'),
  ('00000000-0000-0000-0000-00000000000c', 2, 'volta:legenda', now() - interval '1 day'),
  ('00000000-0000-0000-0000-00000000000c', 4, 'tarefa:motoboy:entrega', now());
