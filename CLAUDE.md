# Corre: guia pro Claude Code

O Corre (app.corresocial.com) é a rede social e a ferramenta de trabalho do Thales (@consanans, Londrina). É pra quem vive do próprio corre: feed, mensagens, grupos, Studio (programa e posta no Instagram), Vendas e Grana, Hórus (caça de clientes), Mural, Rolo 360, Correverso (cidade em pixel com casa 3D) e Studio Houzi (branding). Versão atual: **3.40** (12/10/2026).

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

## Onde parou (v3.42, pronta em 13/10/2026)
- **v3.42:** enquanto o app da Meta tá em teste, `IG_ABERTO: false` no `config.js` faz o Studio dizer que a postagem automática no Instagram "chega em breve" (linha, folha de Contas, "Postar em" e o texto da porta/Studio); o botão vira "Saber mais", com a saída "Sou testador do app: conectar". Quem já tem conta conectada segue direto. Quando a Meta aprovar e o app estiver Ao vivo: `IG_ABERTO: true` e subir o site.
- **Conta conectada em produção:** @houzirec (13/10/2026), conexão guardada cifrada, vale até 12/12 (renova sozinha).

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
