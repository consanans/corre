#!/bin/sh
# v4.38 · quanto o Storage do Supabase aceita por arquivo, de fora, sem gravar nada.
# O limite global (Storage › Settings) não mora no banco e o conector não lê ele. Esta sonda pede pro Storage abrir um
# envio em pedaços (TUS) de N MB com a chave pública: acima do limite ele responde 413 na hora; abaixo, passa do tamanho
# e para na RLS (403), porque a chave pública não grava na pasta de ninguém. Nada fica no storage.objects.
# Uso: sh ferramentas/sonda-video.sh 60 151   (padrão: 49 51 60 150 151)
cd "$(dirname "$0")/.." || exit 1
K=$(grep -o "SUPABASE_ANON_KEY: '[^']*'" site/config.js | cut -d"'" -f2)
U=$(grep -o "SUPABASE_URL: '[^']*'" site/config.js | cut -d"'" -f2 | sed 's#\.supabase\.co#.storage.supabase.co#')
b64() { printf %s "$1" | base64 | tr -d '\n'; }
META="bucketName $(b64 corre-video),objectName $(b64 sonda-limite/nao-existe.mp4),contentType $(b64 video/mp4)"
for MB in ${@:-49 51 60 150 151}; do
  R=$(curl -sS -w ' %{http_code}' -X POST "$U/storage/v1/upload/resumable" \
    -H "apikey: $K" -H "authorization: Bearer $K" -H "Tus-Resumable: 1.0.0" \
    -H "Upload-Length: $((MB * 1048576))" -H "Upload-Metadata: $META")
  case "$R" in
    *' 413') echo "$MB MB: recusado pelo tamanho (passa do limite)" ;;
    *' 403') echo "$MB MB: cabe (parou na RLS, como devia)" ;;
    *) echo "$MB MB: resposta inesperada: $R" ;;
  esac
done
