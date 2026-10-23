# O Corre na Google Play (Android)

O app da loja é o próprio site embrulhado: ele abre app.corresocial.com em tela cheia, sem barra de endereço. Cada versão nova continua sendo só subir o zip no Netlify; o app na loja não precisa ser atualizado toda vez.

A 4.31 já deixou o Corre pronto pro que a Google exige:
- **Denunciar:** dá pra denunciar post, story, perfil e conversa.
- **Bloquear:** dá pra bloquear alguém pelo perfil.
- **Apagar a conta:** apaga a conta de verdade, junto com o login.
- **Pedir pra apagar sem o app:** tem uma página que explica como.
- **Sem botão de comprar no app:** plano e skin em real só se compram pelo site.

## 1. Agora (demora uns dias): o D-U-N-S da Houzi

É um número de empresa, de graça, que a Google pede pra conta de **organização**. Com conta de organização, o app pode ir direto pra loja. Conta pessoal nova precisa antes de 12 pessoas testando por 14 dias seguidos.

- Pede em https://www.dnb.com/duns-number/get-a-duns.html com os dados da **Houzi Produtora Ltda** (CNPJ 28.415.207/0001-46, Rua Cornélio Procópio, 26, loja 34, Londrina).
- Pode levar de alguns dias a umas semanas.

## 2. A conta na Google Play

1. Entra em https://play.google.com/console/signup com a conta Google que vai cuidar do app.
2. Escolhe **Organização** e paga a taxa única de **US$ 25**.
3. Preenche com os dados da Houzi e o D-U-N-S. A Google pede documento e confirma o telefone e o site.

## 3. O pacote do app (no computador, uns 10 minutos)

1. Abre https://www.pwabuilder.com, digita `app.corresocial.com` e toca em **Start**.
2. **Package for stores** › **Android** › **Generate package**.
3. Nas opções, muda só isto:
   - **Package ID:** `com.corresocial.app`
   - **App name** e **Launcher name:** `Corre`
   - **Start URL:** `/?app=play` (é isso que esconde os botões de comprar dentro do app)
   - **Notification delegation:** ligado (os avisos no celular)
   - **Signing key:** **Create new**
4. Baixa o zip. Dentro vêm:
   - **`.aab`:** o arquivo que sobe na Google Play.
   - **`signing.keystore` e `signing-key-info.txt`:** a chave e as senhas do app. Guarda os dois num lugar seguro (um pendrive, o cofre de senhas). **Nunca manda pra ninguém, nem pra mim.** Sem eles não dá pra atualizar o app.
   - **`assetlinks.json`:** esse pode me mandar. Ele não tem segredo, só prova que o app é do site, e eu ponho no ar.

## 4. Subir o app

1. No Play Console, **Criar app**:
   - Nome: **Corre**
   - Idioma: Português (Brasil)
   - Tipo: App
   - Preço: Gratuito
2. Sobe o `.aab` primeiro em **Testes › Teste interno**, pra instalar no teu celular e conferir.
3. A Google assina o app por ela (**Play App Signing**: aceita).
4. Em **Integridade do app › Assinatura do app**, copia a **impressão digital do certificado SHA-256** e me manda. É pública também. Eu junto no `assetlinks.json`; sem ela, o app abre com uma barrinha de endereço em cima.

## 5. A ficha da loja e o formulário da Google

- **Textos, imagem de destaque (1024×500) e capturas de tela:** eu preparo, é só pedir.
- **Ícone:** o `site/icon-512.png`.
- **Categoria:** Negócios.
- **Política de privacidade:** https://app.corresocial.com/privacidade.html
- **Apagar a conta (link):** https://app.corresocial.com/privacidade.html#apagar
- **Acesso ao app:** "Entre com qualquer conta Google; o cadastro é livre e grátis."
- **Anúncios:** não tem.
- **Público-alvo:** 18 anos ou mais (é ferramenta de trabalho e tem conversa entre pessoas).
- **Classificação de conteúdo:** responder que é rede social, com conteúdo dos usuários e conversa entre usuários. Tem denúncia e bloqueio.
- **Segurança dos dados:** a gente responde junto, olhando a política de privacidade. Em resumo:
  - **O que o Corre guarda:** nome, e-mail, foto e o que a pessoa posta e manda.
  - **Localização:** só na hora de achar empresas perto no Hórus. Vai pro OpenStreetMap e não fica guardada.
  - **Proteção e exclusão:** tudo vai cifrado, e dá pra pedir pra apagar.

Depois é **Enviar pra revisão**. Na primeira vez, a Google costuma levar de alguns dias a algumas semanas.

## Os pagamentos

Dentro do app da loja, coisa digital vendida (os planos e as skins em real) teria que passar pelo pagamento da Google, com comissão de 15% a 30%. Por isso a 4.31 esconde os botões de comprar quando o Corre abre pelo app:
- Quem já assina vê o plano e pode cancelar ou desistir.
- Assinar e comprar continuam no site, pelo Asaas, como hoje.
