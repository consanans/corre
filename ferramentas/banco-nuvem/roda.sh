#!/bin/sh
# Banco de teste pra sessão do Claude na nuvem (o Thales não precisa instalar nada).
# Sobe um Postgres 16 descartável, põe o Supabase de mentira, roda o delta 2x (tem que aguentar) e as checagens.
# Uso: sh ferramentas/banco-nuvem/roda.sh   → cada linha "ok:" passou; qualquer "FALHOU" ou erro para tudo.
set -e
AQUI=$(cd "$(dirname "$0")" && pwd); RAIZ=$(cd "$AQUI/../.." && pwd)
B=/usr/lib/postgresql/16/bin; D=/var/tmp/pgcorre
su postgres -c "$B/pg_ctl -D $D/data stop -m fast" >/dev/null 2>&1 || true
rm -rf $D; mkdir -p $D; chown postgres $D
su postgres -c "$B/initdb -D $D/data -A trust >/dev/null && $B/pg_ctl -D $D/data -o '-p 54329 -k $D' -l $D/log -w start >/dev/null"
P="psql -X -q -h $D -p 54329 -U postgres -d postgres -v ON_ERROR_STOP=1 -t"
$P -f "$AQUI/supabase-de-mentira.sql"
$P -f "$RAIZ/supabase/delta-v340.sql" 2>/dev/null
$P -f "$RAIZ/supabase/delta-v340.sql" 2>/dev/null
$P -f "$AQUI/teste340.sql" 2>&1 | sed -n 's/.*\(ok:.*\|FALHOU.*\)/\1/p'
