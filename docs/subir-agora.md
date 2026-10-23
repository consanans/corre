# O que falta subir (23/10/2026, a 4.31)

A 4.31 deixa o Corre pronto pra Google Play: denunciar e bloquear, apagar a conta de verdade e, dentro do app da loja, sem botão de comprar. Leva a 4.30 junto (o bicho do Caderninho, despejar, Semana e bom dia).

Já está no ar (feito pelo conector): o banco da 4.30, o banco da 4.31 (as denúncias e o aviso pros donos) e a função `push` v18.

Falta contigo:

1. **Um pedaço do banco:** no Supabase › SQL Editor, cola o `supabase/delta-v431.sql` inteiro e roda (pode rodar de novo sem problema). Tem que terminar com `delta v4.31 ok`. É o "tirar do ar" das denúncias e o "apagar a conta" que apaga o login também. O conector não consegue rodar essa parte daqui: ele pede uma confirmação que não aparece pra mim.
2. **O site:** Netlify › projeto **elegant-churros-40301a** (é o app.corresocial.com) › aba **Deploys** › arrasta o `corre-site.zip` da 4.31 › espera aparecer **Published**.

Sem o passo 1, o site funciona: denunciar vai, a Lojinha mostra as denúncias, mas o "Tirar do ar" dá erro e o "Apagar minha conta" apaga só o perfil (como antes).

O caminho até a Google Play tá em `docs/android.md`.
