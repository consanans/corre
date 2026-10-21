#!/bin/sh
# Banco de teste pra sessão do Claude na nuvem (o Thales não precisa instalar nada).
# Sobe um Postgres 16 descartável, põe o Supabase de mentira e a semente (o que já existia antes dos deltas), roda cada
# delta 2x (tem que aguentar) e as checagens (a v3.45 baixa os preços do correal). Depois, a virada da v3.43 com o app
# no meio (virada343.sh).
# Uso: sh ferramentas/banco-nuvem/roda.sh   → cada linha "ok:" passou; qualquer "FALHOU" ou erro para tudo e diz onde.
# Pasta e porta: /var/tmp/pgcorre e 54329. Duas rodadas ao mesmo tempo: a outra escolhe as dela
# (CORRE_PG_DIR=/var/tmp/pgoutra CORRE_PG_PORTA=54330 sh ...). Na mesma pasta, a segunda espera a primeira acabar.
set -e
AQUI=$(cd "$(dirname "$0")" && pwd); RAIZ=$(cd "$AQUI/../.." && pwd)
B=/usr/lib/postgresql/16/bin; D=${CORRE_PG_DIR:-/var/tmp/pgcorre}; PORTA=${CORRE_PG_PORTA:-54329}
exec 9>"$D.trava"; flock 9
P="psql -X -q -h $D -p $PORTA -U postgres -d postgres -v ON_ERROR_STOP=1 -t"
su postgres -c "$B/pg_ctl -D $D/data stop -m fast" >/dev/null 2>&1 || true
rm -rf $D; mkdir -p $D; chown postgres $D
# (o servidor não herda a trava: ele segue de pé depois da rodada, e a próxima ficaria esperando por ela pra sempre)
su postgres -c "$B/initdb -D $D/data -A trust >/dev/null && $B/pg_ctl -D $D/data -o '-p $PORTA -k $D' -l $D/log -w start >/dev/null" 9>&-
falha(){ echo "FALHOU: $*" | tee -a $D/saida; echo "deu FALHOU ou erro (acima)"; exit 1; }
# um delta: os avisos (NOTICE) ficam de fora, mas um erro aparece e para tudo, e o "delta vX ok" do fim tem que sair
delta(){
  PGOPTIONS='-c client_min_messages=warning' $P -f "$RAIZ/supabase/$1" > $D/delta.saida 2>&1 || { cat $D/delta.saida; falha "o $1 deu erro"; }
  grep -q "$2" $D/delta.saida || { cat $D/delta.saida; falha "o $1 não disse \"$2\""; }
  echo "$2"
}
# as checagens: mostra cada "ok:", "FALHOU" ou erro do Postgres (um erro no meio de um teste também conta como falha) e
# confere quantos "ok:" saíram, porque uma checagem que some sem dizer nada também é falha. Checagem nova: a conta muda aqui.
testa(){
  $P -f "$AQUI/$1" 2>&1 | sed -n 's/.*\(ok:.*\|FALHOU.*\|ERROR.*\)/\1/p' > $D/teste.saida
  tee -a $D/saida < $D/teste.saida
  n=$(grep -c '^ok:' $D/teste.saida || true)
  [ "$n" = "$2" ] || falha "o $1 deu $n \"ok:\" e eram $2"
}
$P -f "$AQUI/supabase-de-mentira.sql"
$P -f "$AQUI/semente.sql"
delta delta-v340.sql 'delta v3.40 ok'
delta delta-v340.sql 'delta v3.40 ok'
testa teste340.sql 7
delta delta-v341.sql 'delta v3.41 ok'
delta delta-v341.sql 'delta v3.41 ok'
testa teste341.sql 7
# a foto de antes da v3.43 (igual à produção hoje), pra virada começar dela
psql -X -q -h $D -p $PORTA -U postgres -d template1 -c "create database antes343 template postgres"
delta delta-v343.sql 'delta v3.43 ok'
delta delta-v343.sql 'delta v3.43 ok'
testa teste343.sql 38
delta delta-v345.sql 'delta v3.45 ok'
delta delta-v345.sql 'delta v3.45 ok'
testa teste345.sql 8
# v3.56: o pedaço da produção que o delta mexe (cópia), o delta 2x e as checagens
$P -f "$AQUI/semente356.sql"
delta delta-v356.sql 'delta v3.56 ok'
delta delta-v356.sql 'delta v3.56 ok'
testa teste356.sql 13
# v3.60: os planos (o pedaço da produção que o delta usa), o delta 2x e as checagens
$P -f "$AQUI/semente360.sql"
delta delta-v360.sql 'delta v3.60 ok'
delta delta-v360.sql 'delta v3.60 ok'
testa teste360.sql 17
# v3.61: perfil com plano rodando no Asaas não se apaga
delta delta-v361.sql 'delta v3.61 ok'
delta delta-v361.sql 'delta v3.61 ok'
testa teste361.sql 4
# v3.66: a loja de skins (o avatar em corre_perfis.verso, como na produção), o delta 2x e as checagens
$P -f "$AQUI/semente366.sql"
delta delta-v366.sql 'delta v3.66 ok'
delta delta-v366.sql 'delta v3.66 ok'
testa teste366.sql 16
# v3.72: o aceite dos Termos e a marca da desistência em 7 dias
delta delta-v372.sql 'delta v3.72 ok'
delta delta-v372.sql 'delta v3.72 ok'
testa teste372.sql 10
# v3.74: a devolução de correal pelo recibo do gasto
delta delta-v374.sql 'delta v3.74 ok'
delta delta-v374.sql 'delta v3.74 ok'
testa teste374.sql 9
# v3.80: os donos (o acesso do fundador nas ferramentas pagas)
delta delta-v380.sql 'delta v3.80 ok'
delta delta-v380.sql 'delta v3.80 ok'
testa teste380.sql 8
# v3.91: a coleção de Halloween no Ateliê (só a vitrine muda)
delta delta-v391.sql 'delta v3.91 ok'
delta delta-v391.sql 'delta v3.91 ok'
testa teste391.sql 8
# v4.0: o Link na bio (o perfil já tem created_at travado e avatar, como na produção), os números e o convite
$P -f "$AQUI/semente400.sql"
delta delta-v400.sql 'delta v4.0 ok'
delta delta-v400.sql 'delta v4.0 ok'
testa teste400.sql 13
# v4.02: a Lojinha (o painel do dono): o que ela lê e o Supabase de mentira não tinha, o delta 2x e as checagens
$P -f "$AQUI/semente402.sql"
delta delta-v402.sql 'delta v4.02 ok'
delta delta-v402.sql 'delta v4.02 ok'
testa teste402.sql 19
# v4.06: os lembretes (os avisos no celular da v3.35 e o Mural, como na produção), o delta 2x e as checagens
$P -f "$AQUI/semente406.sql"
delta delta-v406.sql 'delta v4.06 ok'
delta delta-v406.sql 'delta v4.06 ok'
testa teste406.sql 19
# v4.11: o trampo vira GTA (a missão paga mais e pede o tempo mínimo dela; o bico paga 0,03)
delta delta-v411.sql 'delta v4.11 ok'
delta delta-v411.sql 'delta v4.11 ok'
testa teste411.sql 8
# v4.12: o correal que cai na rua (0,01 a moeda, até 3 por vez, 8 s entre uma e outra, 0,15 por dia, dentro do 1,00)
delta delta-v412.sql 'delta v4.12 ok'
delta delta-v412.sql 'delta v4.12 ok'
testa teste412.sql 9
# v4.13: as 8 de Halloween em real (o pedido, o pagamento que libera, o estorno que tira, a fatura vencida)
delta delta-v413.sql 'delta v4.13 ok'
delta delta-v413.sql 'delta v4.13 ok'
testa teste413.sql 17
# v4.16: o Hórus vira CRM (o valor do negócio e o aviso do pedido que acabou de chegar); a semente põe no corre_leads
# as colunas da produção que a semente da v3.60 não tinha
$P -f "$AQUI/semente416.sql"
delta delta-v416.sql 'delta v4.16 ok'
delta delta-v416.sql 'delta v4.16 ok'
testa teste416.sql 13
# v4.17: o Studio com carrossel, story e reels e o link de aprovação pro cliente; a semente põe no corre_posts as
# colunas da produção e o gatilho do Instagram como tá lá
$P -f "$AQUI/semente417.sql"
delta delta-v417.sql 'delta v4.17 ok'
delta delta-v417.sql 'delta v4.17 ok'
testa teste417.sql 24
. "$AQUI/virada343.sh"
if grep -q 'FALHOU\|ERROR' $D/saida; then echo "deu FALHOU ou erro (acima)"; exit 1; fi
echo "tudo ok: $(grep -c '^ok:' $D/saida) checagens"
