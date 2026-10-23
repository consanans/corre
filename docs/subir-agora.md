# O que falta subir (23/10/2026, a 4.30)

A 4.30 traz o bicho do Caderninho, o despejar várias de uma vez, a Semana com arrastar e o bom dia no celular. São três passos, nesta ordem:

1. **O banco:** no Supabase › SQL Editor, cola o `supabase/delta-v430.sql` inteiro e roda. Tem que terminar com `delta v4.30 ok`. (Se você me der o "pode", eu rodo pelo conector.)
2. **A função `push`:** Edge Functions › `push` › colar o `supabase/functions/push/index.ts` inteiro (aberto no computador) › Deploy, com o Verify JWT desligado, como antes. Depois, confere que ela responde (o "Mandar um teste" dos Avisos no celular). (Também dá pelo conector, com o teu "pode".)
3. **O site:** Netlify › projeto **elegant-churros-40301a** (é o app.corresocial.com) › aba **Deploys** › arrasta o `corre-site.zip` da 4.30 › espera aparecer **Published**.

Sem o passo 1, o site da 4.30 funciona: o despejar e a Semana vão, mas o bicho e o bom dia não aparecem. Sem o passo 2, o bom dia não sai (o resto dos avisos segue igual).
