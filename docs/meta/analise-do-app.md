# Pacote da Análise do app: "Corre Instagram"

> **O app:** Corre Instagram · ID do app do Instagram **1763654311510527** (o painel também mostra, no topo, o "ID do app" da Meta, que é outro número) · produto "API do Instagram com login do Instagram" (Business Login for Instagram).
> **O que pedir:** `instagram_business_basic` e `instagram_business_content_publish`, as duas em **Acesso avançado**. Mais nenhuma.
> **De onde vem isto:** pesquisa de 13/10/2026 nas páginas oficiais da Meta, revisada no mesmo dia contra o código do Corre (`supabase/functions/instagram/index.ts`, `site/js/igcontas.js`, `studio.js`, `estudio.js`, `lote.js` e `supabase/delta-v340.sql`). As páginas da Meta não abriram direto nesta sessão (bloqueio de rede); li os trechos que a busca devolveu. O painel da Meta muda nome e lugar das coisas com frequência. Onde está escrito **conferir na tela da Meta**, vale o que o painel mostrar.

## Resumo: a ordem das coisas

1. **Verificação da empresa.** É a parte que mais demora, então comece hoje.
2. **Arrumar o Corre.** Política completa, ícone de 1024 e exclusão de dados mais completa: feito. Falta só você subir o zip novo da 3.42. **Não suba o `saida/corre-site.zip` que está lá agora:** ele é de 13/10 às 02:13, antes da 3.42. Peça um zip novo.
3. **Configurações básicas e caso de uso do Instagram**, deixando só as 2 permissões.
4. **Contas de teste.** Uma conta Google pro revisor e uma conta Instagram Profissional, que tem que ser **Testador do Instagram**.
5. **Gravar o vídeo.** A gravação já faz as chamadas de teste que a Meta exige. Depois, espere até 2 dias pro botão de pedir ficar azul.
6. **Enviar a Análise** com os textos da parte 2. A Meta diz "geralmente menos de uma semana"; nos fóruns, contam semanas.
7. **Se aprovar:** publicar o app, mudar pra `IG_ABERTO: true`, subir o site e avisar no Corre.

**O "em breve" já está no Corre (v3.42).** Enquanto a Meta não libera, o Studio mostra "Instagram: em breve" e o post programado vira lembrete. O testador continua conectando por **Saber mais > "Sou testador do app: conectar"**, e é por ele que o revisor vai entrar. Não tire esse botão: se o revisor não conseguir conectar, a Meta recusa o envio inteiro.

---

## 1. Antes de pedir

### 1.1 O que já está pronto (não mexe)
- Os escopos certos no "Conectar".
- O endereço de volta (`https://app.corresocial.com/ig.html`) e os dois avisos da Meta: desautorização e exclusão de dados.
- O token guardado cifrado, num lugar que o app não lê.
- Uma chamada de `instagram_business_basic` já feita, na conexão da @houzirec em 13/10. Ela vale pros 30 dias até mais ou menos 12/11. **Confira no painel:** em Análise do app, ao lado da permissão, aparece quantas chamadas foram registradas.
- O "em breve" da v3.42 (`IG_ABERTO: false` no `config.js`). **Veja se a 3.42 já está no ar:** abra `https://app.corresocial.com/config.js` no navegador e procure `IG_ABERTO: false`.
  - Se não aparecer, a 3.42 ainda não subiu. Peça o zip novo ao Claude, já com a política corrigida (1.3), e suba tudo de uma vez.

### 1.2 Verificação da empresa (Business Verification)
A Meta exige a verificação de qualquer app com Acesso avançado, e só um **admin** do portfólio empresarial consegue fazer.

**Separe antes:**
- [x] **Nome e CNPJ:** Thales Malassise Luiz, CNPJ 28.415.207/0001-46 (já na política, em "Quem é responsável"). Na verificação, use a **razão social exatamente como está no Cartão CNPJ**: se for MEI, ela costuma começar com os números do CNPJ ("28.415.207 THALES MALASSISE LUIZ").
- [ ] **Endereço e telefone** iguaizinhos aos do Cartão CNPJ.
- [ ] **Site da empresa** em https. Pode ser o site da própria empresa; não precisa ser o do Corre.
- [ ] **Documento** (só se a Meta pedir). Pro Brasil não achei a lista oficial; os terceiros citam os de baixo. **Conferir na tela da Meta.**
  - Cartão CNPJ (o comprovante de inscrição da Receita);
  - ou o CCMEI, se for MEI;
  - ou o Contrato Social;
  - se pedirem, um comprovante de endereço ou de telefone no nome da empresa (conta de luz, de telefone ou extrato).
- [ ] **Como confirmar.** A confirmação por e-mail exige um e-mail no mesmo domínio do site que você informar:
  - se a empresa for a Houzi Records e o site informado for o `houzirecords.com.br`, o teu e-mail @houzirecords.com.br bate;
  - se o site informado for o `corresocial.com`, não bate. Aí use telefone, SMS, WhatsApp ou a verificação de domínio.

  **Conferir na tela da Meta.**
- Sem CNPJ (só pessoa física): não achei se a Meta aceita. **Conferir na tela da Meta.**

**Clique a clique:**
1. Abra o business.facebook.com e vá em **Configurações > Central de segurança > Iniciar verificação**. Outro caminho: no painel do app, em **Configurações do app > Básico > Verificação**.
2. Preencha nome legal, endereço, telefone e site. Se pedir, mande o documento. Escolha como confirmar.
3. Espere a resposta. Pode levar dias, e há relatos de semanas.
4. Ligue o app ao portfólio verificado: em developers.facebook.com/apps, abra o **Corre Instagram**, vá em **Configurações do app > Básico**, seção **Verificação** (ou "Portfólio empresarial"), e escolha o portfólio. **Conferir na tela da Meta.**
5. **Access Verification (Tech Provider):** segundo a imprensa, a Meta tirou essa exigência em 09/10/2026. Se o painel ainda mostrar, faça.

### 1.3 Arrumar o Corre antes de enviar
**Já feito pelo Claude (13/10/2026), entra no zip novo da 3.42:**
- [x] `privacidade.html`: data de publicação (13 de outubro de 2026).
- [x] As três frases que contradiziam o pedido:
  - "Studio programado" agora diz que publica pela conta do Instagram que você conectou e escolheu no "Postar em";
  - "Story do Instagram" agora diz "o Corre não posta story";
  - "Instagram como referência" deixa claro que essa consulta não usa a conta que a pessoa conectou.
- [x] A seção `#instagram` reescrita: o que vai pro Instagram (arte, legenda, texto alternativo), o que volta e fica guardado (código e link do post), onde ficam os dados (Supabase, São Paulo) e por quanto tempo, como tirar o acesso, o que é o código de confirmação da Meta. Com um resumo em inglês pro revisor.
- [x] **Função `instagram`:** o pedido de exclusão da Meta agora apaga também o código e o link dos posts publicados pela conta (antes ficavam no post do Studio). Testado e publicado (função `instagram` v15, 13/10/2026).
- [x] **Ícone 1024x1024 (PNG):** `docs/meta/icone-1024.png`, feito do `favicon.svg`. Sem logo do Instagram.

- [x] **E-mail de contato e responsável na política:** `contato@houzirecords.com.br`; Thales Malassise Luiz, CNPJ 28.415.207/0001-46. **Confira se a caixa `contato@houzirecords.com.br` existe e recebe e-mail** (a Meta e quem usa o Corre escrevem pra ela).

**Só se o painel pedir:**
- [ ] **Termos de uso:** o Corre não tem essa página. Se a Meta pedir na hora de enviar ou de publicar, o Claude faz um `termos.html`. **Conferir na tela da Meta.**

### 1.4 Configurações básicas do app
Caminho: developers.facebook.com/apps > **Corre Instagram** > **Configurações do app > Básico**.

| Campo | O que pôr |
|---|---|
| Ícone do app | `docs/meta/icone-1024.png` (1024x1024, 57 KB) |
| URL da Política de Privacidade | `https://app.corresocial.com/privacidade.html` |
| URL dos Termos de Serviço | só se pedir: `https://app.corresocial.com/termos.html` (depois de criado) |
| Exclusão de dados do usuário | callback `https://jzjsqadcwphqzxfsxxyx.supabase.co/functions/v1/instagram?meta=apagar`. Se o campo só aceitar "URL de instruções", use `https://app.corresocial.com/privacidade.html#instagram` |
| E-mail de contato | `contato@houzirecords.com.br` (o mesmo da política). Os avisos da Análise chegam nele |
| Categoria | "Negócios e páginas" (Business and pages); se não tiver, "Utilidade e produtividade". **Conferir na tela da Meta** |
| Domínios do app | `app.corresocial.com` |
| Uso comercial | "Fornecer serviços para outras empresas", porque o Corre conecta contas que não são suas. **Conferir na tela da Meta** |
| Plataforma | se pedir: **+ Adicionar plataforma > Site**, com `https://app.corresocial.com/` |

No fim, clique em **Salvar alterações**.

### 1.5 O caso de uso do Instagram
Caminho: **Casos de uso > Instagram (API com login do Instagram) > Personalizar**.
- [ ] **Permissões:** deixe só a `instagram_business_basic` e a `instagram_business_content_publish`. Se aparecer `instagram_business_manage_messages`, `_manage_comments` ou `_manage_insights`, clique em **Remover**. Pedir permissão que o app não usa é motivo comum de recusa (a Meta diz isso).
- [ ] **Configurações do login comercial** (Business login settings):
  - URI de redirecionamento OAuth: `https://app.corresocial.com/ig.html`, exatamente assim, sem barra no fim;
  - desautorização: `https://jzjsqadcwphqzxfsxxyx.supabase.co/functions/v1/instagram?meta=desautorizou`;
  - exclusão de dados: `https://jzjsqadcwphqzxfsxxyx.supabase.co/functions/v1/instagram?meta=apagar`.
- [ ] **Webhooks:** o Corre não usa. Deixe vazio.
- [ ] **Conferência rápida:** no Corre, com a @houzirec conectada na tua conta, abra **Studio > Contas > "Conferir a ligação"**. Tem que dar **"Tudo ligado"**.
  - Sem nenhuma conta conectada, o "em breve" esconde o botão Contas. É normal.
  - Depois de desconectar, o certo é aparecer "Falta 1 coisa: Conta conectada".
- [ ] Se o caso de uso tiver o passo **"Testar"** ou "Ready to test", marque depois das chamadas de teste (1.7).

### 1.6 Contas de teste e quem precisa ser testador

| Conta | Pra quê | Papel na Meta |
|---|---|---|
| Você (Facebook) | mexer no painel | admin (já é) |
| Conta Instagram de teste | gravar o vídeo e entregar pro revisor | **Testador do Instagram**. Sem isso, o login dá "função de desenvolvedor insuficiente" |
| Conta Google de teste | o revisor entrar no Corre | nenhum (é só do Corre) |

**Não use a @houzirec como conta de teste.** A Meta pede pra não mandar credencial pessoal, e o post de teste sairia no feed de verdade.

**Passo a passo:**
1. **Crie a conta Google de teste** [PREENCHER e-mail e senha]:
   - sem verificação em duas etapas;
   - entre no Corre com ela uma vez, o que cria o perfil;
   - uns dias depois, entre de novo, de outro navegador. Isso diminui o "Confirme que é você" do Google (relato de fórum, não é garantia).
2. **Crie a conta Instagram de teste** [PREENCHER @ e senha], uns dias antes de gravar:
   - use um e-mail que você lê;
   - deixe sem verificação em duas etapas;
   - mude pra Profissional: **Configurações > Tipo de conta e ferramentas > Mudar para conta profissional**, como Criador de conteúdo ou Comercial;
   - ponha foto e 1 ou 2 posts. Conta vazia pode parecer falsa (relato).
3. **Adicione como testadora.** No painel da Meta: **Funções do app > Funções > Adicionar pessoas**. Escolha **"Testador do Instagram"** ("Instagram Tester", fica no fim da lista), **não** o "Testador" comum, e digite o @ da conta de teste. **Conferir na tela da Meta.**
4. **Aceite o convite.** Entre no instagram.com com a conta de teste e abra `https://www.instagram.com/accounts/manage_access/` (Apps e sites). Na aba **Convites de testador**, clique em **Aceitar**. **Conferir o caminho na tela.**
5. **Crie a marca de teste.** No Corre, logado com a conta Google de teste, vá em **Studio > Nova marca**:
   - em "Marca", ponha `Corre Review Test`;
   - em "Rede social da marca", o @ da conta Instagram de teste;
   - clique em **Adicionar**.

   Sem uma marca com @, o Studio não abre. Com o @ igual ao da conta conectada, o "Postar em" já vem marcado.

### 1.7 As chamadas de teste (obrigatório)
- A Meta exige **pelo menos 1 chamada com sucesso de cada permissão nos 30 dias antes de enviar**. O registro aparece em até 2 dias, e até lá o botão "Solicitar acesso avançado" fica cinza.
- **basic:** já tem a de 13/10, e a gravação do vídeo faz outra.
- **publish:** ainda falta. O "Publicar direto" do vídeo faz essa chamada.
- Se passar de 30 dias entre o vídeo e o envio, publique outro post de teste antes de enviar.

### 1.8 Enviar (clique a clique)
1. No painel, vá em **Análise do app > Permissões e recursos**. Pode estar dentro do caso de uso: **Personalizar > Permissões**.
2. Em `instagram_business_basic`, clique em **Solicitar acesso avançado**. Faça o mesmo em `instagram_business_content_publish`.
3. Clique em **Continuar a solicitação** e preencha:
   - as configurações do app (o painel confere o Básico);
   - se pedir uma descrição geral do app, o texto **2.1**;
   - as **instruções pro revisor**, com a plataforma **Site / Web**: o texto **2.4**;
   - **para cada permissão:**
     - a descrição: **2.2** pra basic e **2.3** pra publish;
     - o vídeo: Clipe 1 pra basic e Clipe 2 pra publish (parte 3);
     - os tempos do vídeo (**2.5**);
     - a caixinha de "de acordo" com o uso permitido;
   - as **perguntas sobre tratamento de dados**, que aparecem com a empresa verificada: dicas em **2.6**.
4. Clique em **Enviar**. Acompanhe em **Análise do app > Solicitações** e no e-mail de contato.

**Conferir na tela da Meta:** os nomes dos botões podem estar diferentes.

### 1.9 Checklist final (antes do "Enviar")
- [ ] Empresa verificada e ligada ao app.
- [ ] Básico completo: ícone, privacidade, exclusão de dados, e-mail e categoria.
- [ ] Só as 2 permissões no caso de uso.
- [ ] Política de privacidade já no ar (zip novo da 3.42): abra `https://app.corresocial.com/privacidade.html#instagram` e veja o `contato@houzirecords.com.br` e o CNPJ no fim.
- [x] Função `instagram` com a exclusão nova publicada (v15).
- [ ] Conta Google e conta Instagram de teste funcionando; a do Instagram é **Testador do Instagram**, com o convite aceito.
- [ ] **Estado limpo pro revisor, nesta ordem:**
  1. no Corre (conta Google de teste), **Studio > Contas > Desconectar** a conta de teste e clique de novo pra confirmar;
  2. **só depois**, no Instagram (conta de teste), vá em **Configurações > Apps e sites > Ativos > Corre Instagram > Remover**.

  Na ordem contrária, a conta fica no Corre marcada como "tirou a permissão" e o revisor vê um aviso de conexão vencida. Na ordem certa, ele vê a tela de permissão do começo.
- [ ] Botão "Solicitar acesso avançado" azul nas duas permissões.
- [ ] Os [PREENCHER] da parte 2 trocados.
- [ ] Você de olho no e-mail durante a análise, caso o revisor peça código de login.

---

## 2. Textos pra colar (em inglês)

### 2.1 Descrição curta do app (se o formulário pedir)
```
Corre (https://app.corresocial.com) is a web app for social media managers and small businesses in Brazil. In Corre's Studio, users plan their month of Instagram feed posts (one image and a caption each) and choose, for each post, which of their connected Instagram professional accounts it goes to. Corre publishes each post at the scheduled time, or right away when the user clicks "Publish now". Users connect their own accounts through Instagram Business Login and can disconnect at any time.
```

### 2.2 `instagram_business_basic`: "Tell us how you're using this permission"
```
Corre (https://app.corresocial.com) is a web app for social media managers and small businesses in Brazil. In Corre's Studio, users plan their month of Instagram feed posts and schedule each one to be published on an Instagram professional account they own or manage.

We use instagram_business_basic for two things only:

1. Identifying and showing the connected account. After the user completes Instagram Business Login from Corre's Studio, our server calls GET /me with the fields user_id, username, name, profile_picture_url and account_type. The account ID is stored on our server and is the account we publish to. The username, name and profile picture are shown in the "Contas do Instagram" (Instagram accounts) panel and in the "Postar em" (Post to) field of each post, so the user can see which account is connected and choose, post by post, where each one is published.

2. Keeping the connection working. Before the long-lived token expires, our server refreshes it (refresh_access_token, which requires this permission) and re-reads the username, name and profile picture so the account card stays up to date.

Apart from these profile fields, the only reads we make with the user's token are the status of the media container we just created and the permalink of the post we just published (see instagram_business_content_publish). We do not read the account's other posts, followers, comments, messages or insights, and we never access an account the user did not connect. The token exchange happens on our server; the access token is stored encrypted (AES-GCM) in a table that only our server functions can read, and it is never sent to the browser.

The user stays in control: in Studio > "Contas" (Accounts) > "Desconectar" (Disconnect) they can remove an account at any time, which immediately deletes the stored account data and token. Removing Corre in the Instagram settings triggers our deauthorization callback, which deletes the token; data deletion requests sent by Meta delete the account data and the token.

Without this permission, Corre could not show the user which account is connected or let them choose the destination account of each post, and the connection would stop working after 60 days.
```

### 2.3 `instagram_business_content_publish`: "Tell us how you're using this permission"
```
Corre's Studio lets users publish organic single-image feed posts to their own Instagram professional account, right away or at a date and time they schedule. This is the core of the Studio: small businesses and social media managers plan a month of posts in one sitting and each post goes out on time, without logging in to Instagram for every post. Corre does not publish videos, Reels, Stories or carousels.

Step by step:

1. The user connects their Instagram professional account through Instagram Business Login from Corre's Studio and grants instagram_business_content_publish on the Instagram consent screen. If the authorization response shows that the publish permission was not granted, Corre does not save the connection and asks the user to connect again.

2. In Studio, the user creates a post ("Um post" / One post): the image (designed in Corre's editor as a 1080x1350 JPEG, optionally with a photo the user uploads, and stored at a public URL so Instagram can fetch it), the caption ("Gancho" / Hook, "Corpo" / Body, "Chamada" / Call to action and "Hashtags") and the alt text ("Texto alternativo"). The user may optionally use Corre's AI assistant to draft the image or the caption, and reviews and edits it before saving. Users can also schedule several posts at once (uploading their own images, or with an AI-assisted monthly plan that they review first); every scheduled post appears in the Studio calendar, where it can be opened, edited or removed from the schedule before its time.

3. Under "Postar em" (Post to), the user picks the connected account. Then they either:
   a) keep "Programar" (Schedule) on, set "Data" / "Hora" (Date / Time, Brasília time) and click "Programar post" (Schedule post); or
   b) open the post from the calendar, click "Publicar direto" (Publish now) and confirm with a second click ("Publicar no @username?" / Publish to @username?).

4. At the scheduled time (our server checks the schedule every 5 minutes), or when the user clicks Publish now, our server calls POST /{ig-user-id}/media with image_url, caption and alt_text (when provided), waits until the container status_code is FINISHED, calls POST /{ig-user-id}/media_publish, and then reads the new post's permalink. In Studio the post then shows "Publicado pelo Corre" (Published by Corre) and a "Ver no Instagram" (View on Instagram) button that opens the permalink.

Corre only publishes posts that the user created in Studio and assigned to a connected account under "Post to". Posts without an account are never published automatically: Corre only reminds the user to post them by hand. Corre never likes, follows, comments or sends messages. The user can take a post off the schedule ("Tirar da agenda") before its time, and can disconnect the account at any time (Studio > "Contas" > "Desconectar"), which deletes the stored token.
```

### 2.4 Instruções pro revisor (Platform: Website)
```
App URL: https://app.corresocial.com (web app; any desktop browser, Chrome recommended)

TEST CREDENTIALS
1) Corre account. Corre uses Google Sign-In (not Facebook Login):
   Google email: [PREENCHER]
   Password: [PREENCHER]
   This account already has a test brand ("Corre Review Test") set up in Studio.
2) Instagram professional (Creator/Business) test account, added to this app with the Instagram Tester role (invitation accepted):
   Username: [PREENCHER]
   Password: [PREENCHER]
   Please use this account: until this review is approved the app is in development mode, so Instagram only lets accounts with a role on the app log in to it.
If Google or Instagram asks for a verification code, please email contato@houzirecords.com.br. We monitor it throughout the review and reply quickly.

LANGUAGE
Corre's interface is in Brazilian Portuguese only. Button labels are given below in quotes, followed by the English meaning.

STEPS
1. Open https://app.corresocial.com and click "Entrar com Google" (Sign in with Google). Sign in with the Google test account above. If a welcome guide opens, close it with the X at the top right.
2. Click "Studio" in the menu (or open https://app.corresocial.com/#/studio).
3. Pre-launch notice: until this review is approved, Corre shows the line "Instagram: em breve" (Instagram: coming soon) on the Studio entrance, because only app testers can connect. Click "Saber mais" (Learn more), then "Sou testador do app: conectar" (I'm an app tester: connect). After approval this notice is removed and the button reads "Conectar o Instagram" (Connect Instagram), which opens the same login.
4. Instagram opens (instagram.com/oauth/authorize). If the browser is already logged in to another Instagram account, log out first or use a private window. Log in with the Instagram test account and allow access, granting instagram_business_basic and instagram_business_content_publish.
5. You return to Corre ("Conectando o Instagram…" / Connecting Instagram…). The "Contas do Instagram" (Instagram accounts) panel shows the connected account: username, name, profile picture and "Conectada" (Connected). This uses instagram_business_basic. Close the panel with the X.
6. Click the test brand "Corre Review Test" to enter the Studio (skip this if you are already inside), then click "Um post" (One post).
7. In the post editor:
   - Please skip the "Gerar imagem com IA" (Generate image with AI) box at the top, including "Puxar os últimos 9"; it is not part of this review.
   - "Título da arte" (Image headline): type any text; the image preview (1080x1350) updates. "Pôr foto" (Add photo) is optional.
   - Caption ("Legenda") fields: "Gancho" (Hook), "Corpo" (Body), "Chamada" (Call to action), "Hashtags" (pre-filled, editable). "Escrever com IA" (Write with AI) is optional.
   - "Texto alternativo" (Alt text): optional.
   - "Data" / "Hora" (Date / Time) are in Brasília time (UTC-3). Keep the default values.
   - Keep "Programar" (Schedule) on.
   - "Postar em" (Post to): select the connected test account (it is usually pre-selected).
   - Click "Programar post" (Schedule post). The post appears in the Studio calendar on its date.
   Please do NOT use "Postar agora" (Post now) inside the editor: that is the manual option (it copies the caption, downloads the image and opens instagram.com so the user posts by hand) and does not use the API.
8. Publish now: in the calendar ("Mês" / Month view; "Lista" / List also works), click the post. In the post panel, click "Publicar direto" (Publish now), then click the same button again, now reading "Publicar no @username?" (Publish to @username?), to confirm. Corre's server creates the media container and publishes it (instagram_business_content_publish). The message "Publicado no Instagram." (Published on Instagram) appears and the panel shows "Publicado pelo Corre." (Published by Corre). Click "Ver no Instagram" (View on Instagram) to open the post's permalink.
9. Scheduled publishing (optional): create another post as in step 7, with a time at least 3 minutes ahead in Brasília time (UTC-3), and click "Programar post". Our server checks the schedule every 5 minutes (opening or reloading the Studio also triggers a check), so the post is published within about 5 minutes after the chosen time. Reload the Studio and open the post: it shows "Publicado pelo Corre." and "Ver no Instagram".
10. Disconnect: in the Studio, click "Contas" (Accounts), then "Desconectar" (Disconnect), and click again ("Desconectar @username?") to confirm. The account and its token are deleted from Corre.
```

### 2.5 Tempos do vídeo (troque os [m:ss] depois de editar)
**Clipe 1, pra colar em `instagram_business_basic`:**
```
Video timestamps:
[m:ss] Logged out of Corre and Instagram
[m:ss] Sign in to Corre ("Entrar com Google")
[m:ss] Studio > "Saber mais" > "Sou testador do app: conectar" (Connect Instagram)
[m:ss] Instagram login and consent screen: permissions granted
[m:ss] Connected account shown: username, name, profile picture (instagram_business_basic)
```
**Clipe 2, pra colar em `instagram_business_content_publish`:**
```
Video timestamps:
[m:ss] Logged out of Corre and Instagram
[m:ss] Sign in to Corre ("Entrar com Google")
[m:ss] Studio > "Saber mais" > "Sou testador do app: conectar" (Connect Instagram)
[m:ss] Instagram login and consent screen: permissions granted
[m:ss] Connected account shown (instagram_business_basic)
[m:ss] Post created: image, caption with hashtags, alt text
[m:ss] "Postar em" (Post to) account selected; post scheduled
[m:ss] "Publicar direto" (Publish now) > published (instagram_business_content_publish)
[m:ss] Post live on Instagram (permalink)
[m:ss] Scheduled post published automatically at the chosen time
[m:ss] "Desconectar" (Disconnect)
```

### 2.6 Perguntas sobre tratamento de dados (dicas; **conferir na tela da Meta**)
As perguntas aparecem depois da verificação. Responda só o que for verdade.
- **Processadores ou prestadores com acesso aos dados da Meta:** Sim, o **Supabase** (banco de dados e funções do servidor; é onde ficam a conta e o token cifrado). Os servidores ficam em **São Paulo, Brasil** (AWS, região sa-east-1, conferido no projeto em 13/10).
  - O Netlify só serve os arquivos do site e não recebe os dados do Instagram.
  - A OpenAI (a IA do Studio) não recebe nada da conta conectada.
- **Conferir antes de responder:** em Supabase > Edge Functions > Secrets, veja se existe um `IG_TOKEN`.
  - Ele é do "Puxar os últimos 9" (as referências) e não usa a conta conectada.
  - Se ele existir e for do próprio app "Corre Instagram", as imagens puxadas também são dados da Meta e vão pra OpenAI. Fale com o Claude antes de responder.
  - Se não existir, nada muda.
- **Quem é o responsável pelos dados:** Thales Malassise Luiz, CNPJ 28.415.207/0001-46 (a empresa verificada).
- **Pedidos de autoridades públicas nos últimos 12 meses:** [PREENCHER], provavelmente "Não".
- **Políticas pra pedidos de autoridades:** marque só o que você faz de verdade.

### 2.7 Resumo em inglês pra política de privacidade
Já está no fim da seção `#instagram` da política (13/10/2026), com o e-mail preenchido.
```
Instagram connection (English summary)
When you connect an Instagram professional account in Corre's Studio, Instagram opens, you log in to the account and choose whether to allow Corre to read its basic profile (instagram_business_basic) and publish to it (instagram_business_content_publish).
What Corre stores: the account IDs, username, name, profile picture URL, account type, connection status and expiry date (visible only to you); the access token, encrypted (AES-GCM) on our server in a table the app itself cannot read; and, for each post Corre publishes, the Instagram media ID and link, shown in your Studio.
What it is used for: only to show which account is connected and to publish the posts you created and scheduled, to the account you chose. When publishing, Corre sends Instagram the post's image (by its URL), caption and alt text. Corre does not read your messages, followers, comments or insights, does not like, follow or comment, and does not sell this data or use it for ads.
Where and for how long: in Corre's database on Supabase (servers in São Paulo, Brazil), while the account stays connected. The token is refreshed automatically before it expires (Meta grants 60 days).
How to remove it: in Studio > "Contas", tap "Desconectar" (the account data and the token are deleted immediately). If you remove Corre in Instagram (Settings > Apps and websites), Meta notifies Corre and the token is deleted immediately. Data deletion requests made through Meta are fulfilled as soon as Corre receives them; the confirmation code Meta shows you identifies the request, and this section is its status page. Deleting your Corre profile also deletes connected accounts and tokens. You can also request deletion at contato@houzirecords.com.br.
Responsible: Thales Malassise Luiz, CNPJ 28.415.207/0001-46, Londrina, Brazil.
```

---

## 3. Roteiro do vídeo

**As regras da Meta:**
- mostrar cada permissão pedida (a que ficar de fora não é aprovada);
- gravar do **deslogado ao logado**;
- mostrar o botão de login e a pessoa concedendo a permissão, e depois a função que usa essa permissão;
- pra `instagram_business_basic`, mostrar o app pegando os dados básicos (o @ e o ID);
- pra `instagram_business_content_publish`, mostrar a criação de um post de foto no feed, com legenda, hashtags e outros dados, e a publicação;
- 1080p ou mais, com a tela em 1440 de largura ou menos;
- cursor grande, e usar o mouse em vez do teclado sempre que der;
- **sem áudio**, porque o revisor não escuta;
- interface em inglês ou, se não der, **legendas em inglês na tela**.

O Corre é só em português, então na prática as legendas abaixo são obrigatórias.

**Recomendo dois arquivos**, porque cada permissão tem o próprio campo de vídeo:
- **Clipe 1**, pra `instagram_business_basic`: cenas 1 a 7, e a 14 pra fechar. Uns 2 minutos.
- **Clipe 2**, pra `instagram_business_content_publish`: o vídeo inteiro, cenas 1 a 14. Uns 4 a 5 minutos.

Grave uma vez só e corte os dois no editor.

### Preparação (antes de apertar o gravar)
- **Computador (recomendado):**
  - Chrome num **perfil novo**, só com a conta Google de teste, sem abas, favoritos ou nada pessoal;
  - notificações desligadas;
  - cursor grande (no Windows, Acessibilidade > Ponteiro do mouse; no Mac, Acessibilidade > Monitor > Tamanho do cursor);
  - se a letra ficar pequena, zoom do navegador entre 110 e 125%;
  - gravador: Win+Alt+R (Windows), Cmd+Shift+5 (Mac) ou OBS;
  - legendas depois, em qualquer editor que ponha texto (Clipchamp, iMovie, CapCut).
- **Celular (se for o jeito):**
  - gravador de tela do sistema, com o "Não perturbe" ligado;
  - use o **navegador** (Chrome ou Safari), não o ícone do app instalado;
  - se o login do Instagram abrir no app do Instagram e não voltar pro Corre, grave no computador;
  - legendas depois, no editor.
- **Estado de partida:**
  - deslogado do Corre e do instagram.com;
  - a conta Instagram de teste **não conectada** ao Corre e com o Corre removido em Apps e sites, pra tela de permissão aparecer;
  - a marca "Corre Review Test" já criada.
- **Deixe a barra de endereço à vista**, pra aparecer app.corresocial.com e instagram.com/oauth/authorize.
- **Sem narração.** O que você "falaria" vira legenda.
- **No editor, não toque no "Puxar os últimos 9"** nem no quadro "Gerar imagem com IA". Eles não fazem parte do pedido e podem confundir o revisor.

### Cenas

**1. Abertura** (cartão de texto, 5 s)
- Mostrar: só o texto.
- Legenda: *"Corre (app.corresocial.com): Instagram API with Instagram Login. App: Corre Instagram (Instagram app ID 1763654311510527). Permissions shown: instagram_business_basic, instagram_business_content_publish. Corre's interface is in Portuguese; captions explain each step."*

**2. Deslogado** (5 a 10 s)
- Mostrar: a tela de entrar do Corre. Depois, outra aba com o instagram.com na tela de login.
- Legenda: *"Start: logged out of Corre and Instagram."*
- A Meta precisa ver: o começo deslogado.

**3. Entrar no Corre**
- Mostrar: clicar em **"Entrar com Google"**, escolher a conta de teste e cair dentro do Corre. Se o manual abrir, feche no X.
- Legenda: *"'Entrar com Google' = Sign in with Google (Corre account login; not Facebook Login)."*
- A Meta precisa ver: o caminho do deslogado ao logado.

**4. O Studio**
- Mostrar: menu > **Studio**. A porta, com a marca de teste e a linha **"Instagram: em breve"**.
- Legenda: *"Studio: where users plan and schedule their Instagram posts. 'Instagram: em breve' = Instagram auto-posting coming soon (a pre-launch notice shown while this review is pending)."*

**5. Conectar**
- Mostrar: **"Saber mais"**, a folha abrindo e **"Sou testador do app: conectar"**.
- Legenda: *"Before approval, only app testers can connect: 'Sou testador do app: conectar' = I'm an app tester: connect. After approval, the 'Conectar o Instagram' (Connect Instagram) button opens this same login."*
- A Meta precisa ver: o botão de login comercial no app.

**6. Login e permissão no Instagram** (a cena mais importante)
- Mostrar: a página do Instagram (com o endereço à vista), o usuário e a senha da conta de teste, e **a tela de permissão com a lista do que o Corre pede, parada uns 3 segundos**. Depois, **Permitir**.
- Legenda: *"Instagram Business Login: the user logs in to their professional account and grants instagram_business_basic and instagram_business_content_publish."*
- A Meta precisa ver: a pessoa concedendo **as duas** permissões.

**7. Conta conectada** (fim do Clipe 1)
- Mostrar: a volta pro Corre ("Conectando o Instagram…") e a folha **"Contas do Instagram"** com o @, o nome, a foto e "Conectada".
- Legenda: *"instagram_business_basic: Corre reads the account ID (stored on the server; it is the account Corre publishes to), username, name, profile picture and account type, to show the connected account and offer it under 'Postar em' (Post to)."*
- A Meta precisa ver: o app usando os dados básicos do perfil (o @ e o ID).

**8. Criar o post A (o programado)**
- Mostrar: fechar a folha, clicar na marca e em **"Um post"**. Digitar o "Título da arte" e ver a arte se formando. Preencher "Gancho", "Corpo", "Chamada", **"Hashtags"** e **"Texto alternativo"**.
- Legenda: *"The user creates a feed photo post: image (1080×1350 JPEG), caption with hashtags, and alt text."*
- A Meta precisa ver: a criação do post, com legenda, hashtags e outros dados.

**9. Escolher a conta e programar o post A**
- Mostrar: **"Postar em"** com o @ de teste, a data de hoje e a **hora uns 5 minutos à frente** (horário de Brasília), com o "Programar" ligado. Clicar em **"Programar post"**, e o post aparece na agenda.
- Legenda: *"'Postar em' = Post to: the user picks the connected account. 'Programar post' = Schedule post. Corre's server publishes it at that time."*

**10. Criar o post B e publicar agora**
- Mostrar: outro **"Um post"**, com título, legenda e hashtags. Deixe a data e a hora que vierem (o padrão é 18h, pelo menos meia hora à frente) e clique em **"Programar post"**. Clique no post B na agenda, depois em **"Publicar direto"**, e clique de novo em **"Publicar no @…?"**.
- Legenda: *"'Publicar direto' = Publish now. Corre's server creates the media container (image_url, caption, alt_text) and calls media_publish (instagram_business_content_publish)."*
- A Meta precisa ver: a publicação no feed em nome da conta.

**11. O post no Instagram**
- Mostrar: o aviso "Publicado no Instagram." e o painel com "Publicado pelo Corre.". Depois, **"Ver no Instagram"**, que abre o post no instagram.com com a imagem, a legenda e as hashtags.
- Legenda: *"The post is live on the account's feed (permalink)."*

**12. O programado saindo sozinho**
- Mostrar: um corte com a legenda "about 6 minutes later". Volte pro Corre, recarregue o Studio e abra o post A: "Publicado pelo Corre.". Clique em **"Ver no Instagram"** e, se der, mostre o perfil da conta de teste com os dois posts.
- Legenda: *"About 6 minutes later: the scheduled post was published automatically at the chosen time by Corre's server (it checks the schedule every 5 minutes)."*
- Observação: a lista oficial não pede essa cena, mas há relato de recusa por falta da demonstração do agendamento.

**13. Desconectar**
- Mostrar: **Studio > "Contas" > "Desconectar"**, clicar de novo pra confirmar e a conta sumindo da lista.
- Legenda: *"The user can disconnect at any time: 'Desconectar' = Disconnect. Corre deletes the stored account data and access token."*

**14. Fim** (2 s)
- Legenda: *"End of demo."*

**Depois de gravar:**
- A cena 13 já desconectou no Corre. Agora remova o Corre da conta de teste no Instagram (Configurações > Apps e sites), pra o revisor ver a tela de permissão.
- Anote os tempos de cada cena no texto 2.5.

**Outro jeito (não recomendo):** gravar com `IG_ABERTO: true` por uns minutos, pra aparecer direto o "Conectar o Instagram". O risco é que, nesse intervalo, quem não é testador e tocar no botão bate na tela de erro da Meta. Além disso, o vídeo deixaria de bater com o que o revisor vai ver.

---

## 4. Depois de aprovado

1. **Pôr o app no ar.** No painel, menu da esquerda > **Publicar**: revise os casos de uso e os requisitos e clique em **Publicar** (canto de baixo, à direita).
   - Se o teu app tiver a chave "Desenvolvimento/Ao vivo", mude pra **Ao vivo**.
   - Se for do tipo Empresa, ele vive de níveis de acesso e não tem chave.

   **Conferir na tela da Meta.**
2. **Abrir pra todo mundo no Corre.** Peça ao Claude a versão seguinte, com:
   - `IG_ABERTO: true` no `config.js`, o que tira o "em breve" e o "Sou testador";
   - a novidade no manual;
   - build e zip.

   Depois, suba o zip no Netlify.
3. **Testar com quem não é testador.** Uma conta Profissional que não esteja em Funções do app (de um amigo, por exemplo) tem que conectar e publicar um post. Se der "função de desenvolvedor insuficiente", o app ainda não está ao vivo ou as permissões não estão em Acesso avançado.
4. **Avisar no Corre** (você posta; o Claude não publica nada sem o teu ok). Sugestão de texto:
   > Chegou: o Studio agora posta sozinho no Instagram. Conecta a conta Profissional da marca (Studio > Conectar o Instagram), programa o mês e cada post sai na hora marcada, na conta que você escolher. Dá pra desconectar quando quiser.
5. **Manter:**
   - responda o e-mail de contato. A Meta faz uma revisão anual de uso de dados (Data Use Checkup, que está virando a "Data access renewal") com prazo pra responder, e quem não responde perde o acesso;
   - mantenha a política de privacidade e a verificação em dia;
   - o limite da Meta é de 100 posts por conta a cada 24 horas, e a imagem tem que ser JPEG, de 4:5 a 1,91:1. A arte do Studio já sai em JPEG 1080x1350.
6. **Se a Meta recusar:** o motivo aparece em **Análise do app > Solicitações**. Corrija exatamente aquilo e envie de novo. Os motivos mais comuns:
   - permissão que o app não usa;
   - vídeo sem o login ou sem a tela de permissão;
   - revisor que não conseguiu entrar (Google pedindo código, Instagram pedindo verificação, conta de teste sem o papel de Testador do Instagram);
   - política de privacidade que contradiz o pedido.

   **Plano B pro login do revisor:** se o Google travar o revisor, dá pra pedir ao Claude uma entrada por e-mail e senha só pra conta de revisão. É mudança no Supabase de produção, então só com o teu ok.

---

## 5. Fontes

A rede desta sessão bloqueou a leitura direta das páginas da Meta. O que está acima vem dos trechos oficiais que a busca devolveu, em 13/10/2026.

**Oficiais (Meta):**
- Níveis de acesso (Standard × Advanced; Advanced exige Análise e Business Verification): https://developers.facebook.com/docs/instagram-platform/overview/
- API do Instagram com login do Instagram: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/
- Business Login, escopos, token de 60 dias e renovação (exige instagram_business_basic): https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login
- Criar o app do Instagram, configurações do login comercial e "Go to app review": https://developers.facebook.com/docs/instagram-platform/create-an-instagram-app/
- Análise do app pro Instagram: https://developers.facebook.com/docs/instagram-platform/app-review
- Publicação de conteúdo (limite de 100 por 24 h, JPEG, proporção, alt_text desde 24/03/2025): https://developers.facebook.com/docs/instagram-platform/content-publishing/
- Referência de permissões (uso permitido e vídeo de cada permissão, recusa por permissão sem uso, Business Verification): https://developers.facebook.com/docs/permissions/
- Guia de envio (1 chamada por permissão em 30 dias, registro em até 2 dias, ícone 1024, acesso ao app): https://developers.facebook.com/docs/resp-plat-initiatives/individual-processes/app-review/submission-guide
- Introdução à Análise (prazo): https://developers.facebook.com/docs/resp-plat-initiatives/app-review/introduction
- Regras do vídeo: https://developers.facebook.com/docs/app-review/submission-guide/screen-recordings/
- Exemplo de envio com tempos do vídeo: https://developers.facebook.com/docs/apps/review/server-to-server-apps/sample-submission
- Um vídeo por permissão (página do WhatsApp): https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/app-review
- Business Verification: https://developers.facebook.com/docs/development/release/business-verification/ e https://developers.facebook.com/documentation/development/release/business-verification
- Central de Ajuda, verificação da empresa: https://www.facebook.com/business/help/2058515294227817 e https://www.facebook.com/business/help/2342133782492969
- Funções do app: https://developers.facebook.com/documentation/development/build-and-test/app-roles
- Painel do app, modos e publicação: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/
- Configurações básicas: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/basic-settings
- Requisitos de publicação (ícone, privacidade, exclusão de dados): https://developers.facebook.com/documentation/pages-api/create-an-app
- Modo ao vivo (2019): https://developers.facebook.com/blog/post/2019/09/23/live-mode-for-production-use/
- Exclusão de dados obrigatória (Graph v9.0): https://developers.facebook.com/blog/post/2020/11/10/introducing-graph-v9-marketing-api-v9/
- Termos da Plataforma (política de privacidade): https://developers.facebook.com/terms
- Revisão anual (Data access renewal): https://developers.facebook.com/documentation/resp-plat-initiatives/data-access-renewal
- Access Verification (origem e fim): https://developers.facebook.com/blog/post/2022/06/02/access-verification-process-for-tech-provider-apps/ e https://developers.facebook.com/documentation/business-messaging/whatsapp/changelog
- Fórum oficial:
  - recusa por não conseguir conectar a conta: https://developers.facebook.com/community/threads/1418343268305761
  - convite de "Instagram Tester": https://developers.facebook.com/community/threads/2645731442173067/
  - formato do callback de exclusão: https://developers.facebook.com/community/threads/1268480088629667/

**Imprensa (fim da Access Verification, 09/10/2026):**
- https://www.socialmediatoday.com/news/meta-removes-access-verification-for-developers/832678/
- https://www.socialsamosa.com/news-2/meta-removes-access-verification-tech-provider-app-onboarding-12667685

**Relatos de terceiros (não oficiais; usados só nos motivos de recusa):**
- https://woopsocial.com/blog/meta-app-review-rejected-2026-fix-guide
- https://www.postmoo.re/blogs/meta-app-review-disapproved-how-to-get-approved
- https://singhamandeep.com/meta-app-review-screencast-why-your-demo-video-gets-rejected-2026/
- https://dojolabs.co/blog/meta-app-review-rejected-what-to-fix/
- https://www.saurabhdhar.com/blog/meta-app-review-rejected-twice-to-approval-case-study

**No código do Corre** (pra quem conferir):
- `site/js/igcontas.js`: os escopos, o "em breve", o "Sou testador", a folha de Contas e o Desconectar;
- `supabase/functions/instagram/index.ts`: conectar, publicar, a fila, a renovação e os avisos da Meta;
- `supabase/delta-v340.sql`: as tabelas. Desconectar apaga o token junto e deixa os posts sem conta; a fila só pega post com conta conectada;
- `site/js/estudio.js` e `site/js/studio.js`: o editor, o "Postar em", o "Publicar direto" e o "Ver no Instagram";
- `site/js/lote.js`: programar vários de uma vez (Mês com IA e Subir artes);
- `site/privacidade.html`, seção `#instagram`.

**Não deu pra confirmar** (conferir na tela da Meta):
- se os Termos de uso são obrigatórios;
- a lista de documentos aceitos no Brasil;
- se o revisor usa a conta Instagram dele ou a nossa (o pacote manda a nossa, já testadora);
- o texto exato do "uso permitido" de cada permissão;
- se o painel do app mostra "Publicar" ou a chave "Ao vivo";
- o caminho exato do convite de testador no Instagram.
