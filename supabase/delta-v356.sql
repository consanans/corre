-- delta v3.56 · perfil sempre público; "Desbaratinado" fecha os dados pra quem não segue
--
-- O Thales: "o mocado era apenas pra mocar o número da conta, não o perfil. Eles devem ser públicos e o que a pessoa
-- pode fazer é privar os dados pra quem não segue. Ela deve me seguir como todos os outros e aparecer na minha lista
-- de seguidores." E: "vai nomear ele de desbaratinado".
--
-- O que muda:
--   1. corre_perfis.desbaratinado (novo): o perfil aparece pra todo mundo (busca, cidade, listas de seguidores, Mural),
--      mas posts, stories, destaques, posts do Instagram, portfólio, recomendações, grupos e a grana do perfil só quem
--      segue vê. O catálogo (vitrine) e o orçamento seguem abertos: é de venda, e cada produto já tem o "público" dele.
--   2. visibilidade vira sempre 'publico'. Quem tava 'mocado' (perfil escondido de todo mundo) vira desbaratinado, que é
--      o mais perto do que escolheu. Site antigo que ainda mande 'mocado' cai no mesmo lugar (trigger).
--   3. corre_ve_conteudo(p): eu vejo os dados de p? (p público e não desbaratinado, ou sou eu, ou eu sigo p).
--      corre_visivel(p) segue sendo "o perfil existe pra todo mundo" (com todo mundo público, é sempre verdade).
--   4. As políticas de leitura de feed, stories, destaques, insta, portfólio e recomendações e as funções
--      corre_grana_publica, corre_grupos_de, corre_enquetes, corre_em_alta e corre_pra_voce passam a usar a regra nova.
--      As funções são remendadas no lugar (troca de um trecho conferido na produção em 16/10/2026): se o trecho não
--      estiver lá nem o novo, o delta para e desfaz tudo (tá numa transação).
--
-- Pode rodar duas vezes. A grana "mocada" (Grana › No teu perfil › Mocado) não muda: é o grana_mostra = 'nada'.

begin;

-- 1. a coluna
alter table public.corre_perfis add column if not exists desbaratinado boolean not null default false;

-- 2. quem tava mocado vira desbaratinado, e todo perfil fica público
update public.corre_perfis set desbaratinado = true, visibilidade = 'publico' where visibilidade = 'mocado';

create or replace function public.corre_perfil_publico() returns trigger
language plpgsql set search_path = public as $$
begin
  -- o perfil é sempre público; quem pedir 'mocado' (o site de antes da v3.56) fica desbaratinado
  if new.visibilidade is distinct from 'publico' then
    if new.visibilidade = 'mocado' then new.desbaratinado := true; end if;
    new.visibilidade := 'publico';
  end if;
  new.desbaratinado := coalesce(new.desbaratinado, false);
  return new;
end $$;
drop trigger if exists corre_perfis_publico on public.corre_perfis;
create trigger corre_perfis_publico before insert or update on public.corre_perfis
  for each row execute function public.corre_perfil_publico();

-- 3. quem vê os dados
create or replace function public.corre_ve_conteudo(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.corre_perfis f
     where f.id = p and f.visibilidade = 'publico'
       and (not f.desbaratinado or f.id = auth.uid()
            or exists (select 1 from public.corre_seguindo s where s.quem = auth.uid() and s.segue = p)));
$$;
revoke all on function public.corre_ve_conteudo(uuid) from public;
grant execute on function public.corre_ve_conteudo(uuid) to anon, authenticated, service_role;

-- 4a. as políticas de leitura (alter policy mantém o nome e pra quem vale)
-- post de grupo segue a regra do grupo; post do perfil, a do desbaratinado
alter policy "feed: vejo" on public.corre_feed
  using ((dono = auth.uid()) or (corre_visivel(dono) and corre_grupo_ve(grupo) and (grupo is not null or corre_ve_conteudo(dono))));
alter policy "stories: vejo" on public.corre_stories
  using ((dono = auth.uid()) or (((expira_em > now()) or (destaque_id is not null)) and corre_ve_conteudo(dono)));
alter policy "destaques: vejo" on public.corre_destaques
  using ((dono = auth.uid()) or corre_ve_conteudo(dono));
alter policy "insta: vejo" on public.corre_insta
  using ((dono = auth.uid()) or corre_ve_conteudo(dono));
alter policy "portfolio: vejo" on public.corre_portfolio
  using ((dono = auth.uid()) or (publico and corre_ve_conteudo(dono)));
alter policy "recomendacoes: vejo" on public.corre_recomendacoes
  using ((dono = auth.uid()) or (para = auth.uid()) or ((status = 'aceita') and corre_ve_conteudo(para) and corre_visivel(dono)));

-- 4b. as funções: troca um trecho por outro no corpo que tá no banco (nas duas rodadas, a segunda acha o novo e passa)
do $$
declare
  t record; d text;
begin
  for t in select * from (values
    ('public.corre_grana_publica',
     $a$if vis <> 'publico' and p is distinct from auth.uid() then return null; end if;$a$,
     $b$if not public.corre_ve_conteudo(p) then return null; end if;$b$),
    ('public.corre_grupos_de',
     $a$and (public.corre_visivel(p_perfil) or p_perfil = auth.uid())$a$,
     $b$and (public.corre_ve_conteudo(p_perfil))$b$),
    ('public.corre_enquetes',
     $a$(public.corre_visivel(f.dono) and public.corre_grupo_ve(f.grupo))$a$,
     $b$(public.corre_visivel(f.dono) and public.corre_grupo_ve(f.grupo) and (f.grupo is not null or public.corre_ve_conteudo(f.dono)))$b$),
    ('public.corre_em_alta',
     $a$join public.corre_perfis p on p.id = f.dono and p.visibilidade = 'publico'$a$,
     $b$join public.corre_perfis p on p.id = f.dono and p.visibilidade = 'publico' and not p.desbaratinado$b$),
    ('public.corre_pra_voce',
     $a$and (a.visibilidade = 'publico' or f.dono = (select id from eu))$a$,
     $b$and ((a.visibilidade = 'publico' and public.corre_ve_conteudo(a.id)) or f.dono = (select id from eu))$b$)
  ) v(f, velho, novo) loop
    d := pg_get_functiondef(t.f::regproc);
    if position(t.novo in d) > 0 then continue; end if;
    if position(t.velho in d) = 0 then raise exception 'delta v3.56: o trecho de % não tá no banco (a função mudou?)', t.f; end if;
    execute replace(d, t.velho, t.novo);
  end loop;
end $$;

commit;

select 'delta v3.56 ok';
