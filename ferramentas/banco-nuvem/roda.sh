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
# v4.18: a hora de postar (o aviso no celular do post programado que não sai sozinho, ou que o Instagram recusou)
delta delta-v418.sql 'delta v4.18 ok'
delta delta-v418.sql 'delta v4.18 ok'
testa teste418.sql 14
# v4.19: o Caderninho (as tarefas e o aviso no celular na hora da tarefa)
delta delta-v419.sql 'delta v4.19 ok'
delta delta-v419.sql 'delta v4.19 ok'
testa teste419.sql 16
# v4.20: o "a cada N" do Caderninho
delta delta-v420.sql 'delta v4.20 ok'
delta delta-v420.sql 'delta v4.20 ok'
testa teste420.sql 6
# v4.21: endereço e arquivos no Caderninho
delta delta-v421.sql 'delta v4.21 ok'
delta delta-v421.sql 'delta v4.21 ok'
testa teste421.sql 3
# v4.25: o Caderninho conta a que repete (os dias em que foi feita)
delta delta-v425.sql 'delta v4.25 ok'
delta delta-v425.sql 'delta v4.25 ok'
testa teste425.sql 3
# v4.29: o trampo vira jogo (a tarefa, o post e o cliente pagam correal e contam os dias seguidos)
delta delta-v429.sql 'delta v4.29 ok'
delta delta-v429.sql 'delta v4.29 ok'
testa teste429.sql 17
# v4.30: o bicho do Caderninho, o escudo da sequência e o bom dia (a semente põe as colunas do retorno e da cobrança)
$P -f "$AQUI/semente430.sql"
delta delta-v430.sql 'delta v4.30 ok'
delta delta-v430.sql 'delta v4.30 ok'
testa teste430.sql 20
# v4.31: denunciar e apagar a conta de verdade (a semente põe quem tá em cada conversa e as colunas que a cópia lê)
$P -f "$AQUI/semente431.sql"
delta delta-v431.sql 'delta v4.31 ok'
delta delta-v431.sql 'delta v4.31 ok'
testa teste431.sql 13
# v4.32: o bicho mais perto (a lenda em 15.000)
delta delta-v432.sql 'delta v4.32 ok'
delta delta-v432.sql 'delta v4.32 ok'
testa teste432.sql 6
# v4.34: o Atendente 24h e o Piloto automático (a semente põe o registro das cotas, o sal das conexões e as colunas
# do lead, da venda e da marca que eles leem)
$P -f "$AQUI/semente434.sql"
delta delta-v434.sql 'delta v4.34 ok'
delta delta-v434.sql 'delta v4.34 ok'
testa teste434.sql 20
# v4.36: o Hórus de segunda a sexta (o bom dia e o piloto não contam cliente no fim de semana)
delta delta-v436.sql 'delta v4.36 ok'
delta delta-v436.sql 'delta v4.36 ok'
testa teste436.sql 5
# v4.38: o tamanho máximo do vídeo do Studio vem da pasta corre-video
delta delta-v438.sql 'delta v4.38 ok'
delta delta-v438.sql 'delta v4.38 ok'
testa teste438.sql 4
# v4.39: o carrossel até 20 (de 11 a 20 vira lembrete)
delta delta-v439.sql 'delta v4.39 ok'
delta delta-v439.sql 'delta v4.39 ok'
testa teste439.sql 5
. "$AQUI/virada343.sh"
if grep -q 'FALHOU\|ERROR' $D/saida; then echo "deu FALHOU ou erro (acima)"; exit 1; fi
echo "tudo ok: $(grep -c '^ok:' $D/saida) checagens"
