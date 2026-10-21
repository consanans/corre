# O que falta subir (21/10/2026, 17h55)

**Já tá feito (pelo conector, com o teu "pode"):** os dois bancos (`delta-v417` e `delta-v418`) e as duas funções (`instagram` e `push`). As funções que tinham subido às 17h30 estavam vazias; agora tão com o código certo e respondendo.

**Falta só o site:**

1. Abre o Netlify › projeto **elegant-churros-40301a** (é o app.corresocial.com).
2. Aba **Deploys**.
3. Arrasta o `corre-site.zip` (o da 4.18) pra área de soltar arquivo.
4. Espera aparecer **Published**.

Depois: recarrega o app.corresocial.com e tenta conectar a conta do Instagram de novo.

---

## Da próxima vez que publicar uma função pelo painel

Abre o arquivo `.ts` **no computador**, seleciona tudo (Ctrl+A ou ⌘A), copia e cola no editor do Supabase. Depois do Deploy, abre o Studio › **Conferir a ligação**: se responder, subiu certo.

---

## Separado: conectar mais uma conta do Instagram

O login do Instagram tá funcionando: hoje o @nexwin.app e o @consanans conectaram (junto com o @houzirec e o @kivotrack.com.br).

Se aparecer **"Função de desenvolvedor é insuficiente"** (em inglês, "Insufficient Developer Role"), é a Meta dizendo que aquela conta ainda não é testador **aceito** do app:

1. No computador, entra no instagram.com **com a conta que vai conectar**.
2. Abre instagram.com/accounts/manage_access › aba **Convites de testador** › **Aceitar**.
3. No Corre, usa **Conectar outra conta** (ele pede o login, e aí entra a conta certa, não a que tá aberta no navegador).

Até a Meta aprovar a Análise do app, só conecta conta que é testador aceito (o passo a passo tá em `docs/meta/analise-do-app.md`).
