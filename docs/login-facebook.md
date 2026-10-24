# Entrar com o Facebook (v4.35)

O Corre já tá pronto: quando o Facebook estiver ligado no Supabase, o botão azul "Entrar com o Facebook" aparece sozinho no login, sem precisar subir site novo (o app pergunta pro Supabase quais logins tão ligados). Antes disso, só precisa estar no ar o zip da 4.35.

Do teu lado são três partes: criar o app na Meta, colar duas chaves no Supabase e publicar o app. Uns 20 minutos.

## 1. Na Meta (developers.facebook.com)

1. Entra em developers.facebook.com com a tua conta do Facebook › **Meus apps** › **Criar app**.
2. No caso de uso, escolhe **"Autenticar e solicitar dados de usuários com o Login do Facebook"** (em inglês, "Authenticate and request data from users with Facebook Login").
   - Nome do app: **Corre**. E-mail de contato: contato@houzirecords.com.br.
   - **Não usa o app "Corre Instagram".** Ele segue em teste até a Meta aprovar o Instagram. Num app separado, o login do Facebook pode ir ao ar já.
3. **Casos de uso** › **Autenticação e criação de conta** › **Editar** (ou Personalizar): confere que `public_profile` e `email` estão "Pronto para teste". Se o `email` não estiver na lista, toca em **Adicionar** do lado dele. Não adiciona mais nenhuma permissão: com só essas duas, a Meta não pede Análise do app.
4. Ainda em **Autenticação e criação de conta**, nas **Configurações** do Login do Facebook:
   - **URIs de redirecionamento do OAuth válidos:** `https://jzjsqadcwphqzxfsxxyx.supabase.co/auth/v1/callback` (exatamente assim, sem barra no fim).
   - "Login do OAuth do cliente" e "Login do OAuth na Web" ligados.
   - **Salvar alterações**.
5. **Configurações do app** › **Básico**:
   - **Domínios do app:** `app.corresocial.com`
   - **URL da Política de Privacidade:** `https://app.corresocial.com/privacidade.html`
   - **URL dos Termos de Serviço:** `https://app.corresocial.com/termos.html`
   - **Exclusão de dados do usuário** › URL de instruções: `https://app.corresocial.com/privacidade.html#apagar`
   - **Ícone do app:** o `docs/meta/icone-1024.png`
   - **Categoria:** Negócios e páginas
   - **Salvar alterações**. Depois, copia o **ID do app** e a **Chave secreta do app** (toca em "Mostrar"). Aqui é o de Configurações › Básico mesmo (no Instagram era outro lugar; no Facebook é este).

## 2. No Supabase (2 minutos)

6. supabase.com/dashboard › projeto **CORRE** › **Authentication** › **Sign In / Providers** › **Facebook**:
   - liga o **Facebook enabled**;
   - **Facebook client ID** = o ID do app; **Facebook secret** = a chave secreta;
   - **Save**.

   (A chave secreta é contigo: a sessão do Claude não grava segredo, igual os Secrets das funções.)

## 3. Testar (ainda em modo de desenvolvimento)

7. Abre app.corresocial.com numa janela anônima. O botão azul "Entrar com o Facebook" tem que estar lá, embaixo do Google. Entra com a tua conta do Facebook: como você é o dono do app, funciona mesmo antes de publicar.
   - Se o teu Facebook usa o **mesmo e-mail** da tua conta Google do Corre, você cai no teu perfil de sempre (o Supabase junta as duas).
   - Se usa **outro e-mail**, o Corre cria uma conta nova. Dá pra apagar ela depois em Editar perfil › Apagar minha conta.

## 4. Pôr no ar pra todo mundo

8. No painel da Meta, **Publicar** o app (o modo sai de "Desenvolvimento" e vai pra "Ao vivo"). Enquanto não publicar, só você e quem tiver papel no app consegue entrar; o resto vê "App não configurado". Se a Meta pedir a verificação da empresa, é a Houzi Produtora com o CNPJ 28.415.207/0001-46.

## Se der problema

- **"App não configurado" / "App not active":** o app ainda tá em Desenvolvimento. Publica (passo 8).
- **"URL bloqueada" ou erro de redirect_uri:** o endereço do passo 4 tem que ser exatamente aquele.
- **"O Facebook não mandou o teu e-mail":** é conta de Facebook criada só com o celular. O Corre já mostra esse aviso sozinho e manda a pessoa pôr um e-mail no Facebook ou entrar pelo Google.
- **O botão não aparece:** o Facebook não tá ligado no Supabase (passo 6), ou o zip da 4.35 ainda não subiu.

O que o Corre recebe do Facebook: nome, e-mail e a foto de perfil (copiada pro Corre, porque o endereço que o Facebook manda vence em poucos dias). Não posta nada no Facebook e não lê amigos nem páginas. Tá tudo na Política de privacidade (seção do Facebook e "Como apagar tua conta").
