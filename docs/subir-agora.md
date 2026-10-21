# O que falta subir (21/10/2026)

Hoje o site da 4.17 tá no ar e o delta da 4.16 rodou. Falta isto, **nesta ordem**. Leva uns 10 minutos.

Os arquivos:

| | arquivo | onde vai |
|---|---|---|
| 1 | `delta-v417.sql` | Supabase › SQL Editor |
| 2 | `delta-v418.sql` | Supabase › SQL Editor |
| 3 | `funcao-instagram.ts` | Supabase › Edge Functions › `instagram` |
| 4 | `funcao-push.ts` | Supabase › Edge Functions › `push` |
| 5 | `corre-site.zip` | Netlify |

---

## 1. O banco da 4.17 (urgente)

Sem ele, o editor do Studio não salva post nenhum agora.

1. Abre o Supabase, projeto **CORRE**.
2. Menu da esquerda › **SQL Editor** › **New query**.
3. Abre o `delta-v417.sql`, copia **tudo** e cola.
4. Toca em **Run**.
5. Embaixo tem que aparecer **`delta v4.17 ok`**.

Se aparecer "NÃO TERMINOU", roda o arquivo inteiro de novo (pode rodar duas vezes sem problema).

## 2. O banco da 4.18 (a hora de postar)

1. No mesmo SQL Editor, **New query**.
2. Cola o `delta-v418.sql` inteiro e toca em **Run**.
3. Tem que aparecer **`delta v4.18 ok`**.

Esse já liga sozinho o relógio que confere de minuto em minuto se tem post na hora.

## 3. A função do Instagram

1. Menu da esquerda › **Edge Functions** › clica em **`instagram`**.
2. Aba **Code**.
3. Abre o `funcao-instagram.ts`, copia **tudo**, apaga o código que tá lá e cola o novo.
4. Toca em **Deploy updates**.
5. Confere em **Details** (ou Settings): **Verify JWT / Enforce JWT verification** fica **desligado**.

## 4. A função dos avisos

1. **Edge Functions** › clica em **`push`**. Atenção: é a que tem o endereço `.../functions/v1/push`. Não é a "clever-processor", que também se chama push no painel.
2. Aba **Code** › apaga tudo › cola o `funcao-push.ts` inteiro › **Deploy updates**.
3. **Verify JWT desligado**, como antes.

## 5. O site

1. Abre o Netlify › projeto **elegant-churros-40301a** (é o app.corresocial.com).
2. Aba **Deploys**.
3. Arrasta o `corre-site.zip` pra área de soltar arquivo.
4. Espera aparecer **Published**.

Se aparecer "Função de desenvolvedor é insuficiente", pode ignorar: é um aviso do painel do Netlify, e o deploy entra mesmo assim. Foi o que aconteceu hoje às 16h10.

---

## Pra conferir

1. Abre o app.corresocial.com e recarrega.
2. No Studio, abre um post e salva. Tem que salvar.
3. Toca no sino › no ícone do celular, no alto (**Avisos no celular**). Tem que aparecer **"Hora de postar (Studio)"** ligado.
4. Teste de verdade: programa um post sem conta do Instagram pra daqui a 3 minutos. Na hora, o celular avisa "Hora de postar · nome da marca". Toca no aviso: o post abre com o Postar aceso.

## Se preferir

Me diz **"pode"** que eu faço os passos 1 a 4 pelo conector do Supabase. Aí só sobra o 5, que é arrastar o zip.

---

## Separado: conectar mais uma conta do Instagram

O login do Instagram tá funcionando: hoje o @nexwin.app e o @consanans conectaram (junto com o @houzirec e o @kivotrack.com.br).

Se aparecer **"Função de desenvolvedor é insuficiente"** (em inglês, "Insufficient Developer Role"), é a Meta dizendo que aquela conta ainda não é testador **aceito** do app:

1. No computador, entra no instagram.com **com a conta que vai conectar**.
2. Abre instagram.com/accounts/manage_access › aba **Convites de testador** › **Aceitar**.
3. No Corre, usa **Conectar outra conta** (ele pede o login, e aí entra a conta certa, não a que tá aberta no navegador).

Até a Meta aprovar a Análise do app, só conecta conta que é testador aceito (o passo a passo tá em `docs/meta/analise-do-app.md`).
