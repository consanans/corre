# v3.43 · A VIRADA COM O APP NO MEIO. O roda.sh lê este arquivo (usa D, PORTA, RAIZ, delta e falha). Cada cenário começa
# de uma cópia do banco antes da v3.43 (antes343: o Supabase de mentira, a semente, v3.40 e v3.41, igual à produção hoje).
# O teste343.sql confere o delta rodado do jeito certo; aqui é o que acontece quando ele espera um cadeado, desiste, é
# partido, ou quando uma chamada do app já estava no meio.
V343="$RAIZ/supabase/delta-v343.sql"
C=00000000-0000-0000-0000-00000000000c
ok(){ echo "ok: $*" | tee -a $D/saida; }
# banco NOME: uma cópia nova do antes343. PB roda parando no primeiro erro; SOLTO segue depois do erro, comando por comando,
# como o psql sem ON_ERROR_STOP e muito cliente por aí.
banco(){
  psql -X -q -h $D -p $PORTA -U postgres -d template1 -c "create database $1 template antes343"
  PB="psql -X -q -h $D -p $PORTA -U postgres -d $1 -v ON_ERROR_STOP=1 -t -A"
  SOLTO="psql -X -q -h $D -p $PORTA -U postgres -d $1 -t -A"
}
q(){ $PB -c "$1"; }
# o tipo das 4 colunas do correal: saldo, ganho, gasto (corre_correal) e valor (corre_correal_log)
tipos(){ q "select string_agg(format_type(atttypid, atttypmod), ' ' order by attrelid::regclass::text, attnum) from pg_attribute
            where attrelid in ('corre_correal'::regclass, 'corre_correal_log'::regclass) and attname in ('saldo', 'ganho', 'gasto', 'valor')"; }
# o app chamando o correal logado como a carteira semeada, com os 8 s que o Supabase dá pra cada pedido do authenticated
app(){ $PB -c "set statement_timeout = '8s'; set role authenticated; set request.jwt.claim.sub = '$C'; select $1" 2>&1 || true; }
fechado(){
  for f in "corre_correal_meu()" "corre_correal_gasta('legenda')" "corre_correal_gasta('marca')" "corre_tarefa_termina(gen_random_uuid())"; do
    app "$f" | grep -q 'permission denied' || falha "$2: o app chamou $f: $(app "$f")"
  done
  $PB -c "set role service_role; select corre_correal_devolve('$C', 'legenda')" 2>&1 | grep -q 'permission denied' || falha "$2: a devolve abriu"
  [ "$(q "select count(*) from corre_correal_log where dono = '$C'")" = 4 ] || falha "$2: o extrato ganhou linha"
}

# 1) O CADEADO. Alguém segura o extrato por mais tempo que os 8 s do app (um painel aberto, uma consulta lenta). O delta
# espera 3 s, desiste e desfaz tudo; o app, na fila atrás dele, recebe a carteira sem estourar os 8 s. (Com o delta
# esperando 10 s, o app dava erro.) E, num cliente que segue depois do erro, o fim diz "NÃO TERMINOU", e não "ok".
banco v1
$PB -c "begin; select count(*) from corre_correal_log; select pg_sleep(12); commit;" >/dev/null 2>&1 &
sleep 0.5; $SOLTO -f "$V343" > $D/v1.delta 2>&1 & DELTA=$!
sleep 0.5; app "corre_correal_meu()" > $D/v1.app & APP=$!
wait $DELTA $APP
q "select pg_terminate_backend(pid) from pg_stat_activity where datname = 'v1' and pid <> pg_backend_pid() and query like '%pg_sleep(12)%'" > /dev/null
wait
grep -q 'lock timeout' $D/v1.delta || falha "o delta não esbarrou no cadeado: $(cat $D/v1.delta)"
if grep -q 'delta v3.43 ok' $D/v1.delta || ! grep -q 'NÃO TERMINOU' $D/v1.delta; then falha "o delta desistiu e o fim não disse NÃO TERMINOU"; fi
grep -q '"teto": 40' $D/v1.app || falha "o app na fila atrás do delta não recebeu a carteira: $(cat $D/v1.app)"
[ "$(tipos)" = "integer integer integer integer" ] || falha "o delta desistiu e a carteira mudou: $(tipos)"
ok "o cadeado: o delta desiste em 3 s e desfaz tudo, o app na fila recebe a carteira antes dos 8 s e o fim diz NÃO TERMINOU"

# 2) PARTIDO, A PARTE 2 SEM A 1 (a conversão se perdeu). Do "-- 2)" pra baixo, parando no erro: para na conferência do
# começo e não troca nada. Num cliente que segue depois do erro, o resto roda comando por comando, mas o passo 8 não
# devolve o correal pro app: ele dá erro em vez de usar a conta nova na carteira ainda em int, e o fim diz NÃO TERMINOU.
banco v2
if sed -n '/^-- 2)/,$p' "$V343" | $PB -f - > $D/v2 2>&1; then falha "a parte 2 rodou sem a parte 1"; fi
grep -q 'ainda não está em centavos' $D/v2 || falha "a parte 2 não disse por que parou: $(cat $D/v2)"
[ "$(q "select pg_get_function_result('corre_correal_preco(text)'::regprocedure)")" = integer ] || falha "a parte 2 trocou o preço"
app "corre_correal_meu()" | grep -q '"teto": 40' || falha "a parte 2 parada mexeu no app"
ok "partido: a parte 2 sozinha para na conferência do começo e não troca nada"
sed -n '/^-- 2)/,$p' "$V343" | $SOLTO -f - > $D/v2b 2>&1
if grep -q 'delta v3.43 ok' $D/v2b || ! grep -q 'NÃO TERMINOU' $D/v2b; then falha "a parte 2 solta não disse NÃO TERMINOU"; fi
fechado v2 "parte 2 solta"
ok "partido, num cliente que segue depois do erro: o correal fica fechado pro app (meu, gasta, termina e devolve) e o fim diz NÃO TERMINOU"

# 3) PARTIDO EM ORDEM, A PARTE 1 CONFIRMADA SOZINHA (como o conector, que confirma no fim de cada chamada). A carteira já
# está em centavos e as funções ainda são as velhas: até a parte 2 rodar, o app dá erro, e nada sai de graça nem entra no
# extrato. A parte 2 em seguida termina o serviço; o arquivo inteiro de novo não muda nada.
banco v3
{ sed '/^-- 2)/,$d' "$V343"; echo 'commit;'; } | $PB -f - > $D/v3 2>&1 || falha "a parte 1 deu erro: $(cat $D/v3)"
[ "$(tipos)" = "numeric(12,2) numeric(12,2) numeric(12,2) numeric(12,2)" ] || falha "a parte 1 não converteu: $(tipos)"
fechado v3 "só a parte 1"
ok "partido em ordem: com só a parte 1, a carteira já em centavos e o app dá erro (meu, gasta, termina e devolve), sem linha nova"
# um pedaço do meio se perde (as funções novas, passos 4 a 7) e o passo 8 roda: ele confere, não devolve o correal pro app
# (meu, gasta, termina e devolve seriam as velhas, em int, na carteira em centavos) e diz por quê
{ sed -n '/^-- 2)/,/^-- 4)/p' "$V343" | sed '$d'; sed -n '/^-- 8)/,/^commit;/p' "$V343" | sed '$d'; } | $PB -f - > $D/v3m 2>&1 \
  && falha "o passo 8 abriu sem as funções novas"
grep -q 'pela metade' $D/v3m || falha "o passo 8 não disse por que parou: $(cat $D/v3m)"
fechado v3 "sem os passos 4 a 7"
ok "partido, com os passos 4 a 7 perdidos: o passo 8 confere, diz \"pela metade\" e o correal segue fechado pro app"
sed -n '/^-- 2)/,$p' "$V343" | $PB -f - > $D/v3b 2>&1 || falha "a parte 2 depois da 1 deu erro: $(cat $D/v3b)"
grep -q 'delta v3.43 ok' $D/v3b || falha "a parte 2 depois da 1 não disse ok: $(cat $D/v3b)"
$PB -f "$V343" | grep -q 'delta v3.43 ok' || falha "o arquivo inteiro depois das partes não disse ok"
[ "$(q "select saldo || ' ' || (select string_agg(valor::text, ' ' order by id) from corre_correal_log where dono = '$C') from corre_correal where dono = '$C'")" \
  = "0.90 0.50 -0.20 0.20 0.40" ] || falha "a carteira depois das partes: $(q "select saldo from corre_correal where dono = '$C'")"
app "corre_correal_gasta('legenda')" | grep -q '"preco": 0.20, "saldo": 0.70' || falha "o app não voltou: $(app "corre_correal_gasta('legenda')")"
ok "partido em ordem: a parte 2 termina o serviço, a carteira fica 0,90 com o extrato certo e o app volta (legenda 0,20)"

# 4) A CHAMADA QUE JÁ TINHA COMEÇADO. Três chamadas com a função velha (em int) entram antes do delta e ficam esperando o
# cadeado da carteira (seguro aqui por 3 s): uma tarefa de 5 pontos, a devolução de uma imagem e o gasto de outra. O
# delta roda e confirma enquanto elas esperam. Quando seguem, ainda com a conta velha (pagariam 5, devolveriam 10,
# cobrariam 10), esbarram na trava do extrato e são desfeitas inteiras: nenhuma carteira muda, e a tarefa pode ser
# terminada de novo, já com a conta nova.
banco v4
T=00000000-0000-0000-0000-0000000000b1; V=00000000-0000-0000-0000-0000000000b2; G=00000000-0000-0000-0000-0000000000b3
q "insert into corre_perfis values ('$T'), ('$V'), ('$G');
   insert into corre_correal (dono, saldo, ganho) values ('$V', 20, 20), ('$G', 150, 150);
   insert into corre_tarefa_vez (dono, u, k, comecou) values ('$T', 'policial', 'ladrao', now() - interval '30 seconds')"
q "set role authenticated; set request.jwt.claim.sub = '$V'; select corre_correal_gasta('imagem')" > /dev/null
VEZ=$(q "select id from corre_tarefa_vez where dono = '$T'")
for u in $T $V $G; do $PB -c "begin; select pg_advisory_xact_lock(hashtext('correal:$u')); select pg_sleep(3); commit;" > /dev/null & done
sleep 0.3
$PB -c "set role authenticated; set request.jwt.claim.sub = '$T'; select corre_tarefa_termina('$VEZ')" > $D/v4.t 2>&1 &
$PB -c "set role service_role; select corre_correal_devolve('$V', 'imagem')" > $D/v4.v 2>&1 &
$PB -c "set role authenticated; set request.jwt.claim.sub = '$G'; select corre_correal_gasta('imagem')" > $D/v4.g 2>&1 &
sleep 0.3
$PB -f "$V343" > $D/v4.delta 2>&1 &
wait
grep -q 'delta v3.43 ok' $D/v4.delta || falha "o delta com as chamadas esperando: $(cat $D/v4.delta)"
for x in t v g; do grep -q 'corre_correal_log_valor_check' $D/v4.$x || falha "a chamada velha ($x) passou: $(cat $D/v4.$x)"; done
[ "$(q "select string_agg(saldo || ' ' || ganho || ' ' || gasto, ' | ' order by dono) from corre_correal where dono in ('$T', '$V', '$G')")" \
  = "1.00 2.00 1.00 | 15.00 15.00 0.00" ] || falha "as carteiras mudaram: $(q "select string_agg(dono || ' ' || saldo, ' | ') from corre_correal")"
[ "$(q "select string_agg(valor || ' ' || motivo, ' | ' order by id) from corre_correal_log where dono in ('$T', '$V', '$G')")" \
  = "-1.00 gasto:imagem" ] || falha "o extrato mudou: $(q "select string_agg(valor || ' ' || motivo, ' | ' order by id) from corre_correal_log where dono in ('$T', '$V', '$G')")"
q "set role authenticated; set request.jwt.claim.sub = '$T'; select corre_tarefa_termina('$VEZ')" | grep -q '"ganhou": 0.15' \
  || falha "a tarefa não pôde ser terminada de novo com a conta nova"
ok "a chamada velha no meio do delta (tarefa 5, devolve 10, gasta 10) esbarra na trava e é desfeita; terminada de novo, a tarefa paga 0,15"
