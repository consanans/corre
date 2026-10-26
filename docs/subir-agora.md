# O que falta subir (26/10/2026, a 4.39)

A 4.39 sobe o **carrossel do Studio pra 20 slides**. Até 10, o Corre posta sozinho como antes; de 11 a 20, o Instagram não deixa o Corre postar sozinho (a porta que ele usa ainda vai até 10), então o post vira lembrete: na hora, o Corre te avisa e você posta pelo celular, com os 20 juntos. O banco já tá pronto (rodei hoje).

Junto vai a 4.38, que deixa o Studio pronto pro **vídeo de até 150 MB**: o tamanho máximo agora vem do banco, o vídeo grande sobe em pedaços (com a porcentagem no botão de salvar, e sem começar do zero se a internet cair no meio), e o story fica nos 100 MB, que é o máximo do Instagram. O banco já tá pronto (rodei em 24/10). E leva a 4.37 (os avisos no computador), a 4.36 (o Hórus de segunda a sexta) e a 4.35 (o Entrar com o Facebook).

1. **O site:** Netlify › projeto **elegant-churros-40301a** (é o app.corresocial.com) › aba **Deploys** › arrasta o `corre-site.zip` da 4.39 › espera aparecer **Published**.
2. **Pros 150 MB valerem de verdade** (o plano Pro já tá ligado desde 26/10; falta um ajuste):
   - No projeto CORRE: **Storage › Settings › Global file size limit** = 150 MB › Save. Testei em 26/10: o Supabase ainda recusa arquivo acima de 50 MB, porque esse número não sobe sozinho com o plano.
   - Me avisa: eu subo a pasta dos vídeos pra 150 MB (é um comando só) e o app passa a aceitar na hora, sem zip novo.
3. **No computador:** abre o Corre › tua foto › **Avisos no computador** › **Mandar um teste**.
4. **Ligar o Facebook (quando quiser):** o passo a passo tá em `docs/login-facebook.md`.

Pendente do teu lado, fora do zip:
- Reconectar a conta da KivoTrack no Studio (a conexão guardada parou de enxergar a conta).
- O caminho até a Google Play tá em `docs/android.md`.
