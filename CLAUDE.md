# Corre: guia pro Claude Code

O Corre (app.corresocial.com) é a rede social e a ferramenta de trabalho do Thales (@consanans, Londrina). É pra quem vive do próprio corre: feed, mensagens, grupos, Studio (programa e posta no Instagram), Vendas e Grana, Hórus (caça de clientes), Mural, Rolo 360, Correverso (cidade em pixel com casa 3D) e Studio Houzi (branding). Versão atual: **3.45** (14/10/2026).

**Com o Thales:** português, curto e direto. Ele não é programador: explica o que muda pra ele, não o código.

## Stack
- **Site estático (PWA)** em `site/`: HTML, CSS e JS puros, sem framework e sem módulos. Cada `site/js/*.js` é um script que se pendura em `window.Corre` (`C`). O build junta tudo em `site/js/corre.min.js`, com o Studio Houzi à parte em `houzi.min.js`, e o CSS em `site/css/corre.min.css`.
- **Supabase** (projeto "CORRE", ref `jzjsqadcwphqzxfsxxyx`, org "consanans"): Postgres com RLS, Auth (Google), Storage, Realtime e Edge Functions em Deno/TypeScript (`supabase/functions/*/index.ts`).
- **Netlify** hospeda o site. O deploy é manual: o Thales arrasta o `corre-site.zip`.

## Primeiro uso
```
npm install
npx playwright install chromium
npm run serve          # http://localhost:8080/?demo
```
Se a pasta não for um repositório git: `git init` e um primeiro commit (pergunta antes).

## Comandos
| | |
|---|---|
| `npm run build -- 3.41` | gera os .min e põe `?v=3.41` no index.html (o mesmo que `python3 build.py 3.41`) |
| `npm test` | a suíte (`test/lista.txt`), um teste por vez; `npm test -- t57.js t76.js` roda só esses; `-j 3` roda 3 juntos. Logs em `test/saida/` |
| `npm run lint` | ESLint no JS do site. Regra: **0 erros** (hoje tem 10 avisos, aceitos) |
| `npm run serve` | o site em modo demo (config.js vazio). `-- --producao` usa o Supabase de verdade |
| `npm run zip` | `saida/corre-site.zip` (site/ sem os .map), pro Netlify |
| `npm run banco -- ferramentas/banco-teste/teste340.sql` | Postgres LOCAL com Supabase de mentira + todos os deltas desde a v3.34 (cada um 2x) + o teste. Precisa do `psql`; `PGURL` aponta o servidor |

## Modo demo
O app tem três modos (`core.js`): **de verdade** (config.js com `SUPABASE_URL` e `SUPABASE_ANON_KEY`), **demo** (sem config e com `?demo` no endereço: banco de mentira no `localStorage`, chave `corre-demo-v2`, e pessoas de exemplo que respondem) e **desligado**. O botão "Entrar com Google" vira um login de mentira no demo. `&nomanual` pula o manual. Os testes usam o demo e bloqueiam a rede externa (fontes, CDN, Wikipedia, Instagram, Google).

## Onde fica cada coisa
- `site/index.html`: o app inteiro. Os blocos `<!-- css:inicio/fim -->` e `<!-- js:inicio/fim -->` são reescritos pelo build.
- `site/js/`: `core.js` (dados: Supabase/demo, `C.st.me`, `C.saveMe`, `C.iaFn`, `C.toast`, `C.sheet`, `C.ico`, `C.esc`, `C.money`); `app.js` (rotas `#/...`, menu e os cliques: todo botão tem `data-act="x"` e `C.acts.x` responde). Uma área por arquivo: `feed`, `mensagens`, `grupos`, `avisos`, `push`, `stories`, `studio` + `estudio` + `lote` + `igcontas` + `insta`, `negocio` (Vendas), `vendas` (catálogo), `grana`, `estilo`, `marcas` (Portfólio), `horus*`, `mural`, `banca`, `refs`, `meucorre`, `visitas`, `rolo*`, `verso` (Correverso) + `verso-som` + `veiculos` + `pad` + `casa` + `moveis` + `beats`, `lab*` (Studio Houzi), `manual`. **A ordem do build importa** (lista em `build.mjs`). Arquivo novo entra lá.
- `site/config.js`: URL do Supabase e só chaves **públicas** (anon/publishable, `GOOGLE_CLIENT_ID`, `IG_APP_ID`). Nunca segredo.
- `site/sw.js` (só os avisos push), `site/ig.html` (volta do login do Instagram), `site/privacidade.html`, `site/lab/fontes/` (fontes do Studio, já prontas).
- `supabase/schema.sql`: o banco inteiro, pra projeto novo. `supabase/delta-vXXX.sql`: o que cada versão muda. Todo delta pode rodar duas vezes e termina com `select 'delta vX ok'`.
- `supabase/functions/`: `imagem` (IA via OpenAI: imagem, legenda, nomes; cobra correal), `instagram` (login do Instagram por conta, publica, renova token, callbacks da Meta; **Verify JWT desligado**), `push` (Web Push VAPID), `banca` (manchetes RSS), `mural`.
- `test/`: `tNN.js` (Playwright, um por versão, frases "ok:" e "FALHOU:"), `*.mjs` (rodam as funções no Node com `stub-supabase.js`), `pw.js` (acha Playwright e esbuild), `fixtures.js`, `fx/`.
- `ferramentas/`: o runner, o servidor, o zip, o banco de teste e `lab_fontes.py` (não precisa rodar).
- `LEIA-ME.txt`: o histórico de cada versão, com o que o Thales faz em cada uma. Versão nova ganha seção no topo.

## Fluxo de uma versão
1. Mexe em `site/js` e `site/css`, **nunca nos .min**.
2. Em `site/js/manual.js`: sobe a `VERSAO` e atualiza as `NOVIDADES`.
3. Teste novo `test/tNN.js` cobrindo o que mudou, no fim de `test/lista.txt`. Suíte inteira verde e lint com 0 erros.
4. Se mudou o banco: `supabase/delta-vXXX.sql` (idempotente; entra na `CADEIA` de `ferramentas/banco-teste/roda.mjs` e roda 2x lá), e o fim do `schema.sql` acompanha.
5. `npm run build -- X.YY`, seção no `LEIA-ME.txt` e `npm run zip`.
6. **Produção é do Thales:** subir o zip no Netlify, colar o delta no SQL Editor e dar Deploy nas funções. Se ele tiver o Netlify CLI ou o Supabase CLI logado, dá pra fazer por comando, **mas só com o ok dele, a cada vez**.

## Regras que não se negociam
**Segurança**
- Nunca a chave secreta/service_role do Supabase no site nem no repositório. Uma `sb_secret_...` que o Thales colou num chat tem que ser trocada (rotacionada) e nunca usada.
- OpenAI, tokens da Meta, `IG_APP_SECRET`, VAPID privada e `IG_CHAVE`: só nos Secrets das Edge Functions. O App Secret do Instagram nem pro Claude.
- Tokens do Instagram: só cifrados (AES-GCM) em `corre_ig_tokens`, que só a função lê. O app nunca vê.
- Produção (deploy, SQL no banco real, função, pg_cron, Google Cloud, painel da Meta): sempre o Thales, ou comando com o ok dele.
- Nunca mexer em senha dele, criar conta, publicar conteúdo público ou mandar mensagem sem ok explícito.
- O link de indicação do KivoTrack dele não entra em preset público. Imagem do Google Street View não é rehospedada. O e-mail dele não vai pra serviço de terceiro.

**Visual e conteúdo**
- **Nada de verde**, em lugar nenhum. A grama é palha/dourada. O Studio Houzi nunca sugere verde sozinho (`semVerde`: matiz OKLCH de 116 a 186). Só a cor que o cliente escolher pode ser verde.
- **Dinheiro sempre na cor do texto, nunca vermelho.** A exceção é o número grande do "corre do mês".
- Nada de copiar Gumball, Cartoon Network ou Wix. Personagens originais, estilo de blocos sem asset de Minecraft. Veículos com nome e desenho próprios, sem marca ou modelo real (nada de HR-V ou MT-03).
- Música: domínio público ou composta/sintetizada no aparelho (WebAudio). Conteúdo de exemplo do feed: fictício.
- Correal é a moeda do Correverso e **não é dinheiro** (não compra, não vende, não transfere). O app sempre pergunta antes de gastar. Devolução só pelo service_role. Preços no banco (`corre_correal_preco`).
- No app, não citar X/Grok pelo nome. Baixar o brandbook (PDF/kit) é só pro dono.

**Código**
- Comentários em português, no tom da casa: dizem o porquê.
- Sem dependência nova no site (tudo roda no navegador, sem build de módulos). CDN só as que já estão no index.

## Onde parou (v3.45, 14/10/2026)
- **v3.45, a Casa do Hórus (zip entregue):** na Feira do Correverso, a barraca do Hórus (`BARRACAS` em verso.js, `lugar: 'horus'`) vira porta: `C.casa.abrir({ lugar: 'horus' })`. Lugar é o motor da casa (casa.js) com uma planta própria e sem dono: `LUGARES` (titulo, planta, ola, estacoes), sala da presença `lugar-horus` (todo mundo que tá lá se vê), ninguém decora, a saída diz "Sair pra Feira" e o balcão "Voltar pra sala". Por dentro é um templo egípcio do jeito rosacruz (o Thales mandou a foto de um templo da AMORC): piso de terracota, tablado de mosaico com dentes de serra preto e branco (polígonos em `PL.chao`, desenhados logo depois do piso), passadeira vermelha, cordão dourado com a passagem na frente, postes de lótus, colunas de papiro, bancos dourados, o Oriente com degraus, púlpito (cruz de ouro e rosa no pano) e castiçais, o olho de Hórus num nicho azul, o friso com o sol alado e gente e deuses pintados nas laterais. O altar do meio é a estação `radar` (triângulo de ouro com três velas em volta da tela) e abre `#/horus` no balcão. Teste: scratchpad/v345/horus3d.cjs (passa a pasta das fotos como argumento).
- **v3.45, o correal rende 10 vezes mais:** o Thales quer que 1 correal renda meio dia de trabalho. `supabase/delta-v345.sql` só troca a `corre_correal_preco`: imagem 0,10, marca 0,03, legenda 0,02, abordagem 0,02, voo 0,05 (o ganho e a carteira não mudam). Precisa do v3.43 antes (confere sozinho). No site, a reserva `CORREAL_PRECO` (core.js), o `precoVoo` (verso.js) e os textos do manual; a carteira lê os preços do banco. Teste no banco: `teste345.sql` na cadeia do `ferramentas/banco-nuvem/roda.sh` (67 checagens). Produção (lida pelo conector em 14/10): o `delta-v343.sql` já rodou inteiro (correal aberto, em centavos); falta o Thales rodar o `delta-v345.sql` e subir o zip.
- **v3.46, mais quatro lugares:** Estúdio (`studio`), Balcão (`vendas`), Cofre (`grana`) e Galeria (`marcas`), em `LUGARES` (casa.js) com `salaDe` (a planta de uma sala só), `pintaTela` (quadro de formas na parede), decoração fixa, a estação que abre a ferramenta e móveis do catálogo da casa (`itens`, formato da casa; `lerCasa({ pl, i })`). As barracas em verso.js ganharam `lugar`. O caminho até a ferramenta agora desvia de obstáculo (`desvia` em casa.js: linha reta se der; senão o mais curto na grade de 25 cm, sem cortar quina), na casa também. Teste: scratchpad/v346/lugares.cjs (50 ok, pc e celular).
- **v3.47, a Feira inteira:** Beco (`feed`, o paredão de lambe-lambe abre `#/`), Biblioteca (`nicho`, `#/refs`), Vitrine (`estilo`, a calculadora abre `#/estilo`), Escolinha (`manual`, a lousa abre o manual; a barraca do Manual agora entra no lugar) e Cineclube (`rolo`, só do fundador como a barraca; o projetor abre `#/rolo`). Amarelo na sombra fica verde-oliva: cadeira e luminária amarelas trocadas. Mural e Banca seguem prédios à parte (abrem o balcão direto).
- **v3.48, o Sebo (o Thales pediu: "no sebo a pessoa pode escolher discos pra adicionar no toca disco da casa dela"):** 10 discos novos em beats.js com `sebo: true` (samba, bossa, drill, dub, afro, dembow, chill, disco, grime, noite), todos compostos ali. `C.beats.doSebo(perfil)` lê `verso.discos` (só chaves de disco do Sebo) e `daCasa(perfil)` dá o que o toca-discos da casa mostra (os 6 de sempre + os do Sebo). A cidade sempre tem um Sebo (se o sorteio das lojas não deu, a 2ª loja do primeiro par vira SEBO), no mapa (`K.lugares`), e a porta (`tipo: 'sebo'`, `portaLoja`) entra no lugar `sebo` (casa.js: estante, capas na parede, caixotes, balcão, jukebox, gato). A estação `abre: 'sebo'` abre o `seboSheet` (Ouvir/Parar só pra você; Levar pra casa/Na tua casa grava `verso.discos` pelo `C.saveMe`; de graça). A prévia para quando a folha fecha (conferido no `laco`, porque o `C.onSheetClose` é dos stories). CSS no bloco `/* v3.48 ·` do monstra.css. Teste: scratchpad/v348/sebo.cjs (22 ok).
- **v3.49, o Torneio de Pesca do Igapó:** a placa "TORNEIO" no começo do Píer do Igapó (`c.torneio`, porta `tipo: 'torneio'`) entra no lugar `pesca` (casa.js): píer em T de polígonos (`PL.chao`), a água é o piso e quem bloqueia é o `PL.bloqueio` (marca a grade sem desenhar), estacas, placar boiando, ipês, barraquinha de isca, pódio com a Capi de ouro. Cada balde é uma ação `pesca` (a decoração tem `spot`; a ação agora leva a decoração em `a.e`). Pescando: o botão grande vira "Puxar" (espaço, Enter e o Pular do celular também puxam), a boia afunda e você tem 1,2 s. Peixes e pesos em `PEIXES`; rodada de 3 min pelo relógio (`rodadaAgora`), igual pra todo mundo; o placar (`#cs-pesca`) junta você e quem tá no píer pela presença (`m.pk` em centésimos de kg e `m.pr`, a rodada; verso.js valida). Recorde no aparelho (`localStorage` `corre-pesca`). Não vale correal. A vara é uma caixa com `roll`, a linha é traço no canvas (`linhaPesca`). Parede baixa não ganha verga de porta. Teste: scratchpad/v349/pesca.cjs (30 ok; o "Puxar!" pulsa, então o teste clica com force).
- **Próximos (a fila do Thales):** largada de moto e de patinete, quadras 3D com desafio.

## Antes (v3.44, 14/10/2026)
- **v3.44 (zip entregue, junto com o que falta da 3.43):**
  - **Menu ainda mais junto:** grupos Rede (Início, Mensagens, Grupos, Avisos), Laboratório (Studio, Studio Houzi, Hórus, Portfólio), Financeiro, Banca e Perfil (Meu perfil, Salvos); o Mais sumiu. Com a Rede fechada e algo não lido, um pontinho rosa no grupo (CSS `:has`). Hórus e Portfólio sem migalha.
  - **Minimapa do Correverso:** `miniMapa()` em verso.js (o `desenhaMapa` numa tela escondida, recortado em volta de você, de 330 em 330 ms), botão `.cvr-mapinha` no canto de cima à esquerda; tocou, abre o Mapa. (O nome `cvr-mini` já é dos bonequinhos do Trampo.)
  - **Login pela Apple:** botão "Continuar com a Apple" só com `APPLE_LOGIN: true` no config.js. Falta do lado do Thales: Apple Developer Program, um Services ID com o domínio app.corresocial.com e a volta `https://jzjsqadcwphqzxfsxxyx.supabase.co/auth/v1/callback`, uma chave Sign in with Apple (.p8), e ligar a Apple em Supabase › Authentication › Providers (o segredo vence a cada 6 meses). Depois, `APPLE_LOGIN: true` e subir o site.
  - **Pedidos grandes na fila (14/10):** cada ferramenta da Feira vira uma construção 3D onde se entra (começando pelo Hórus), quadras 3D com desafios entre pessoas, largada de corrida de moto e de patinete, competição de pesca no Igapó, tudo no 3D de blocos da casa (casa.js).
  - **Testes da 3.44:** scratchpad/v344 (mini.cjs, menu344.cjs, apple.cjs). Os testes de rolagem do menu da 3.43 esperavam a lista rolando em tela baixa; com o menu mais curto ela quase não rola, e essas checagens ficaram velhas.

## Antes (v3.43, 14/10/2026)
- **v3.43, o que entrou:**
  - **Menu em grupos:** Laboratório (Studio, Studio Houzi), Financeiro (Vendas e Grana, Carteira de correal), Banca (Banca do dia, Do teu nicho, Rolo 360); Correverso e Mural em destaque (o Mural em cortiça). No celular, a barra é Início, Studio, Correverso, Mural e Mensagens, e o sino subiu pro alto. Código em `app.js` (`GRUPOS`, `LISTA`, `BARRA`, `grupoLado`, `gavetaHTML`, `aVista`, `sinalRola`), ícones `lab` e `toldo` no `core.js`, CSS no bloco `/* v3.43 ·` do fim do `monstra.css`. Em tela baixa de notebook, a lista rola com um trilho fino e um degradê só quando tem item inteiro escondido.
  - **Correal em centavos:** `supabase/delta-v343.sql` (0,03 por ponto, teto 1,00 por dia, preços divididos por 10: imagem 1,00, marca 0,30, legenda/abordagem 0,20, voo 0,50; o extrato tem trava de -1 a 1). No site, tudo passa por `C.correalFmt`/`C.correalTxt` (core.js): "0,90 correal", "2,40 correais", "0,00 correais"; as contas são em centavos inteiros. O site novo e o delta sobem JUNTOS (o delta primeiro). O delta não pode ser partido (ver o topo dele).
  - **Mural:** busca sem ninguém diz que o Corre tá no começo e crescendo.
  - **Studio Houzi (logo):** símbolo que sai do nome e do ofício (`M.partes`, `NOME_IDEIA`, `OFICIO`, fusões), letreiro com acabamento, curadoria das 6. No teste cego o motor novo ganhou todas as comparações contra o de antes (60 a 0 e 56 a 0). `M.assinatura` agora é o desenho (sem cor, fundo e território) e o "Mais 6 caminhos" só repete quando acabou tudo (0 em 3 rodadas nas 16 marcas de teste; 1 na 4ª rodada de uma marca de 4 letras). O gesto "encosta" está fora do sorteio (ficava ilegível). Galeria e harness em scratchpad/houzi-logo (não está no repositório). Falta uma 3ª volta: variedade das 6 (ainda saem 3 ou 4 só com o nome), letra que briga com a personalidade (serifa elegante pra rap/luta), escudo genérico, símbolos ambíguos (o coador do selo parece boca). As marcas já salvas reabrem com o desenho novo.
  - **Produção (14/10/2026):** depois, o Thales rodou o `delta-v343.sql` inteiro (conferido pelo conector). Antes disso: o passo 1 do `delta-v343.sql` rodou pelo conector (a carteira do Thales virou 0,90, o extrato 0,30 x 3, e o correal ficou FECHADO pro app, como o delta prevê). Os passos 2 a 8 não entraram: o conector pede confirmação pra DROP FUNCTION e a confirmação não aparece na sessão (a chamada expira em 60 s; nada fica pela metade). Falta o Thales colar o `delta-v343.sql` INTEIRO no SQL Editor (seguro: o passo 1 não divide de novo) e subir o zip da 3.43 no Netlify (a rede desta sessão bloqueia api.netlify.com). Até o SQL rodar, a carteira e o pagamento das tarefas dão erro.
  - **Testes que não estão no repositório:** scratchpad/menu343/checa.cjs (menu), scratchpad/correal-app/checa.cjs (144 ok), scratchpad/houzi-logo/repete.cjs. Os testes antigos de menu (v3.38/v3.39) precisam ser atualizados quando a pasta `test/` chegar.
- **v3.42:** enquanto o app da Meta tá em teste, `IG_ABERTO: false` no `config.js` faz o Studio dizer que a postagem automática no Instagram "chega em breve" (linha, folha de Contas, "Postar em" e o texto da porta/Studio); o botão vira "Saber mais", com a saída "Sou testador do app: conectar". Quem já tem conta conectada segue direto. Quando a Meta aprovar e o app estiver Ao vivo: `IG_ABERTO: true` e subir o site.
- **Conta conectada em produção:** @houzirec (13/10/2026), conexão guardada cifrada, vale até 12/12 (renova sozinha).
- **Análise do app da Meta:** o pacote todo (passo a passo, textos em inglês, roteiro do vídeo) tá em `docs/meta/analise-do-app.md`, e o ícone 1024 em `docs/meta/icone-1024.png`. A `privacidade.html` foi revista pra Meta (seção `#instagram` nova, com resumo em inglês); contato `contato@houzirecords.com.br` (o Thales digitou "houzirecors", tomado como erro de digitação) e responsável "Thales Malassise Luiz, CNPJ 28.415.207/0001-46".
- **Função `instagram` v15 no ar (13/10/2026, com o ok do Thales):** o pedido de exclusão da Meta (`?meta=apagar`) também zera `ig_media_id` e `ig_link` dos posts da conta antes de apagar ela (a política promete isso). Depois do deploy, a leitura da função pelo conector foi barrada pelo modo automático; quem confere que ela responde é o "Conferir a ligação" do Studio.

## v3.41 (no ar em 13/10/2026)
- **v3.41, o que entrou:** o estado do Instagram à vista (linha na porta do Studio e dentro dele, motivo da última tentativa guardado por login, "Conferir a ligação" com a acao `status` da função `instagram`) e as personas no brandbook do Studio Houzi ("Pra quem", a buyer persona, e "Se a marca fosse gente", a brand persona: HTML, PDF, apresentação, kit em `textos/voz-e-personas.txt` e edição na aba Textos). Reserva sem IA em `M.personas` (lab-motor.js, tabelas PB por nicho e PM por território); `H.personas` junta o que a IA ou a pessoa escreveu em `m.voz.buyer_persona` e `m.voz.brand_persona` (sem mudar banco). A função `imagem` (acao `marca`) pede as duas personas.
- **Buyer persona só do dono:** a marca publicada é lida por qualquer um (inclusive anon), com a voz junto. Por isso a buyer persona escrita (IA ou dono) mora em `corre_houzi_privado` (delta-v341.sql, RLS só o dono); `H.salvar` tira ela da voz e grava lá, `H.lerPrivado` devolve pro dono. O brandbook só mostra "Pra quem" pro dono. Sem o delta, a bancada avisa e o resto da marca salva.
- **Build na nuvem:** `node ferramentas/build-nuvem/monta.mjs 3.41` refaz `corre.min.js` e `houzi.min.js` byte a byte igual ao build de verdade (esbuild 0.25.10) e põe o CSS novo (trechos `/* v3.41 ·` no fim de `site/css/*.css`) no fim do `corre.min.css`. Sem número, só confere.
- **Funções no ar (lidas pelo conector em 13/10/2026):** a `banca` foi puxada pro repositório (`supabase/functions/banca`; o agendamento dela é o job `corre-banca-de-hora-em-hora` do pg_cron). A do Mural (slug `swift-api`) volta com o código vazio pelo conector: a origem está só no computador do Thales. A "push" do painel tem o slug `clever-processor` e é o modelo "Hello" do Supabase, não a função de verdade; o site chama o slug `push`, que não existe, então os avisos no celular não saem em produção. A `rapid-function` também é o modelo "Hello" (sobra, dá pra apagar).
- **Conhecido, de antes:** a 320px, dentro do Studio, o botão "Nova marca" e a barra do calendário passam 4px da tela.
- **Produção (13/10/2026, com o ok do Thales, pelo conector):** `delta-v341.sql` aplicado (o `apply_migration` do conector estourava o tempo; foi pelo `execute_sql`, em partes, e os grants extras que o Supabase põe sozinho em tabela nova, TRUNCATE/TRIGGER/REFERENCES, foram tirados). Funções `instagram` v11 (Verify JWT desligado) e `imagem` v17 no ar. A fila do pg_cron seguiu em 200. O Thales subiu o zip da 3.41.
- **Falta do lado do Thales:** os Secrets `IG_APP_ID` e `IG_APP_SECRET` (a tentativa de conectar às 10:13 voltou `sem_app`) e a `IG_CHAVE`, no painel do Supabase; o "Conferir a ligação" do Studio diz o que falta.

## Antes (v3.40)
- **No repositório (12/10/2026):** o `site/` (do `corre-site.zip`), as funções `imagem` e `instagram` e o `supabase/delta-v340.sql`. Ainda faltam o `package.json`, `build.mjs`, `test/`, o `schema.sql` e os deltas antigos, as funções `push`/`banca`/`mural`, `ferramentas/` e o `LEIA-ME.txt` (estão no computador do Thales). Sem eles não rodam build, a suíte nem o lint.
- **Banco de teste na nuvem:** `sh ferramentas/banco-nuvem/roda.sh` sobe um Postgres descartável com um Supabase de mentira mínimo, roda o delta v3.40 2x e as checagens (7 ok). Quando o `ferramentas/banco-teste/` de verdade chegar, ele manda.
- **Instagram por conta, no jeito do mLabs.** Cada conta entra pelo login do Instagram (`ig.html` → função `instagram`, `acao: conectar`). Cada post tem "Postar em" (`corre_posts.ig_conta`). Sem conta, o post vira lembrete.
- **Correverso.** Controle de videogame no celular (`pad.js`), na cidade e na casa. Pulo. Som da cidade (`verso-som.js`). Garagem com 9 veículos próprios (`veiculos.js`). Aeroporto com voo a 5 correais.
- **Studio Houzi.** O passo "As referências" (com imagens lidas no aparelho). "Mais alternativas" nunca repete.
- **Testes:** 64/64 verdes (1.442 checagens). Lint: 0 erros.
- **Produção (12/10/2026, conferido pelo conector do Supabase):** o `delta-v340.sql` já tinha rodado. As funções `instagram` (v10, Verify JWT desligado) e `imagem` (v16, Verify JWT desligado como antes) foram atualizadas pra v3.40; as que estavam no ar eram de antes da v3.38. A fila do pg_cron (`corre-studio-publica`, de 5 em 5 min) voltou a responder 200. O site 3.40 tá no Netlify desde 12/10 às 22:03 UTC.
- **Falta do lado do Thales:**
  - Secrets `IG_APP_ID`, `IG_APP_SECRET` e `IG_CHAVE` no Supabase (a sessão do Claude não grava secret);
  - `IG_APP_ID` no `site/config.js`, que hoje tá vazio, e subir o site de novo.

  O app "Corre Instagram" na Meta já foi criado. Pra abrir pra todo mundo: Análise do app e modo Ao vivo.
