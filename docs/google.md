# Londrina no Google: o que o Thales faz (5.0)

As páginas abertas (app.corresocial.com/londrina/ e uma por ramo, como /londrina/design/) já sobem no zip da 5.0. O Google acha sozinho com o tempo, mas o Search Console faz ele achar em dias, e mostra quantas pessoas viram o Corre na busca e o que elas procuraram.

## 1. Pôr o Corre no Search Console (uma vez só)

1. Abre https://search.google.com/search-console com a tua conta do Google.
2. "Adicionar propriedade" › escolhe **Prefixo do URL** › digita `https://app.corresocial.com/` › Continuar.
3. Na lista de jeitos de confirmar, escolhe **Tag HTML**. Ele mostra uma linha assim:
   `<meta name="google-site-verification" content="UM-CODIGO-COMPRIDO" />`
4. Me manda essa linha aqui no chat. Eu ponho no site e te passo um zip.
5. Sobe o zip no Netlify e volta no Search Console › **Confirmar**.

(Se você mexe no DNS do corresocial.com, dá também pelo jeito "Domínio" com um registro TXT; aí vale pra tudo do domínio. Qualquer um dos dois serve.)

## 2. Mandar o mapa do site

1. No Search Console, menu da esquerda › **Sitemaps**.
2. Em "Adicionar um novo sitemap", digita `sitemap.xml` › Enviar.
3. Em uns dias, o status vira "Sucesso" com 20 páginas descobertas (a cidade, os 17 ramos, a página dos clientes e o começo do Corre). Cada pessoa que ligar o "Aparecer no Google" soma o link na bio dela.

## 3. Pedir pra olhar as páginas principais (opcional, acelera)

No alto do Search Console, na barra "Inspecionar URL", cola um endereço por vez e toca em **Solicitar indexação**:
- `https://app.corresocial.com/londrina/`
- `https://app.corresocial.com/londrina/social-media/`
- `https://app.corresocial.com/londrina/design/`
- `https://app.corresocial.com/londrina/foto-e-video/`

O Google deixa uns 10 pedidos por dia. Os outros ele acha pelos links das primeiras.

## 4. Primeiro a gente mesmo

Hoje ninguém ligou o "Aparecer no Google" (nasce desligado pra todo mundo). As páginas já servem pra quem procura (o guia de cada ramo e o pedido no Mural sem cadastro), mas ficam bem melhores com gente nelas:
- No teu perfil: Editar perfil › **Aparecer no Google** › Salvar.
- Pede pros primeiros (o Jey, o Lucas, quem é de Londrina e trabalha com social, design, foto) fazerem o mesmo.

Cada zip novo que eu gero já sai com a lista de quem ligou até ali; entre um zip e outro, a página aberta busca a lista de agora sozinha.

## Onde ver se tá funcionando

- **No Corre:** Lojinha › "Londrina no Google": quantos aparecem, as visitas, os pedidos fixados e quem foi ver alguém.
- **No Search Console:** Desempenho › as buscas que mostraram o Corre e quantas viraram clique. Leva de uma a quatro semanas pra ter número.
