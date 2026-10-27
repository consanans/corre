// CORRE · o gerador das páginas abertas (v5.0, "Londrina no Google"). Roda antes do zip:
//   node ferramentas/seo/gera.mjs            → lê o banco de verdade (só o público: corre_seo_vitrine, com a chave anon
//                                              do site/config.js) e escreve site/<cidade>/ e site/<cidade>/<ramo>/ e o
//                                              site/sitemap.xml
//   node ferramentas/seo/gera.mjs --dados x.json   → usa os dados do arquivo ({ "londrina": { gente, pedidos } })
//   node ferramentas/seo/gera.mjs --demo           → gente de exemplo (pros testes; nunca vai pro zip)
// A página sai pronta (é o que o Google lê) e, aberta no navegador, troca a lista pela de agora (site/seo/seo.js).
// Página nova de cidade: uma linha no CIDADES (ramos.mjs). Texto de ramo: o RAMOS.
// Atrás de proxy (a sessão do Claude na nuvem), o fetch do Node só passa com NODE_USE_ENV_PROXY=1 (e o
// NODE_EXTRA_CA_CERTS do proxy); sem isso dá "fetch failed / ENOTFOUND".
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { RAMOS, CIDADES, QUANDO, VERBA } from './ramos.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..'), SITE = join(RAIZ, 'site');
const R = createRequire(import.meta.url)(join(SITE, 'seo', 'render.js'));
const BASE = 'https://app.corresocial.com';
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const VERSAO = (readFileSync(join(SITE, 'js', 'manual.js'), 'utf8').match(/VERSAO = '([\d.]+)'/) || [])[1] || '0';
const esc = R.esc, json = o => JSON.stringify(o).replace(/</g, '\\u003c');
const hoje = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);

/* os dados: do banco (o mesmo que o navegador lê), de um arquivo, ou de exemplo */
async function dadosDe(c){
  if(process.argv.includes('--demo')) return demo(c);
  const arq = arg('--dados');
  if(arq){ const d = JSON.parse(readFileSync(arq, 'utf8')); return d[c.slug] || d; }
  const cfg = readFileSync(join(SITE, 'config.js'), 'utf8');
  const url = (cfg.match(/SUPABASE_URL:\s*'([^']+)'/) || [])[1], key = (cfg.match(/SUPABASE_ANON_KEY:\s*'([^']+)'/) || [])[1];
  if(!url || !key) throw new Error('o site/config.js não tem o endereço e a chave pública do Supabase');
  const r = await fetch(`${url}/rest/v1/rpc/corre_seo_vitrine`, { method: 'POST', headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_cidade: c.nome }) });
  if(!r.ok) throw new Error(`o banco respondeu ${r.status}: ${await r.text()} (rodou o delta-v500.sql?)`);
  return r.json();
}
function demo(c){
  return { cidade: c.nome, gente: [
    { handle: 'ana.social', nome: 'Ana Ribeiro', faz: 'Social media pra restaurante e delivery: pauta, arte e reels.', categoria: 'social', cidade: c.nome + ', ' + c.uf, aqui: true, avatar: null,
      itens: [{ nome: 'Pacote 12 posts por mês', preco: 900 }, { nome: 'Reels editado', preco: 150 }] },
    { handle: 'beto.design', nome: 'Beto Lima', faz: 'Logo e identidade visual pra marca pequena.', categoria: 'design', cidade: 'Sorocaba, SP', aqui: false, avatar: null, itens: [] },
    { handle: 'duda.foto', nome: 'Duda Alves', faz: 'Foto de cardápio e de produto, com luz de estúdio.', categoria: 'foto_video', cidade: c.nome, aqui: true, avatar: null, itens: [{ nome: 'Ensaio de cardápio (20 fotos)', preco: 1250 }] }
  ], pedidos: [{ codigo: 'DEMO1', categoria: 'social', titulo: 'Social media pra padaria no Centro', quando: 'semana', remoto: false, em: new Date().toISOString() }] };
}

/* o pedaço de cima e o de baixo, iguais em todas */
const cabeca = ({ titulo, desc, canon, ld }) => `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(canon)}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Corre">
<meta property="og:locale" content="pt_BR">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canon)}">
<meta property="og:image" content="${BASE}/icon-512.png">
<meta name="theme-color" content="#0C0A0F">
<link rel="icon" href="/favicon.ico?v=1" sizes="32x32">
<link rel="icon" href="/favicon.svg?v=1" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&display=swap">
<link rel="stylesheet" href="/seo/seo.css?v=${VERSAO}">
<script type="application/ld+json">${json(ld)}</script>
</head>
<body>
`;
const topo = c => `<header class="sx-top"><a class="sx-wm" href="/" aria-label="Corre, a rede de quem vive do próprio corre">Corre</a>
  <nav aria-label="Corre"><a class="sx-cid" href="/${c.slug}/">Quem faz em ${esc(c.nome)}</a><a class="sx-entrar" href="/" data-marca="entrar">Entrar</a></nav></header>
`;
const pe = (c, seo) => `<footer class="sx-pe"><span>O Corre é de ${esc(c.nome)}: a rede e a ferramenta de quem vive do próprio corre.</span><a href="/privacidade.html">Privacidade</a><a href="/termos.html">Termos de uso</a></footer>
<script>window.SEO=${json(seo)};</script>
<script src="/config.js?v=${VERSAO}"></script>
<script src="/seo/render.js?v=${VERSAO}"></script>
<script src="/seo/seo.js?v=${VERSAO}" defer></script>
</body>
</html>
`;
/* o formulário do pedido (o mesmo do Mural, sem conta) */
const form = (c, ramo) => `<form class="sx-f" id="sx-f" novalidate>
      ${ramo ? '' : `<label class="sx-fld"><span>O que é</span><select name="categoria" required><option value="">Escolhe o tipo de serviço</option>${RAMOS.map(r => `<option value="${r.k}">${esc(r.nome)}</option>`).join('')}<option value="outros">Outra coisa</option></select></label>`}
      <label class="sx-fld"><span>Em uma linha, o que você precisa?</span><input type="text" name="titulo" maxlength="90" required placeholder="Ex.: ${esc(ramo ? ramo.exemplos[0] : 'Fotos pro cardápio do meu restaurante')}"></label>
      ${ramo ? `<div class="sx-ex" aria-label="Exemplos (tocar preenche)">${ramo.exemplos.map(e => `<button type="button" data-ex="${esc(e)}">${esc(e)}</button>`).join('')}</div>` : ''}
      <label class="sx-fld"><span>Conta mais <small>(quanto mais claro, melhor a proposta)</small></span><textarea name="descricao" maxlength="1200" placeholder="${esc(ramo ? ramo.pedir.slice(0, 2).join(' ') : 'O que é, quantidade, onde vai ser, o que não pode faltar.')}"></textarea></label>
      <fieldset><legend>Pra quando</legend><div class="sx-chips">${QUANDO.map(([k, n]) => `<label><input type="radio" name="quando" value="${k}"${k === 'semana' ? ' checked' : ''}><span>${esc(n)}</span></label>`).join('')}</div></fieldset>
      <label class="sx-fld"><span>Quanto quer investir</span><select name="verba">${VERBA.map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join('')}</select></label>
      <label class="sx-check"><input type="checkbox" name="remoto"${ramo && ramo.digital ? ' checked' : ''}> Pode ser feito à distância</label>
      <div class="sx-row"><label class="sx-fld"><span>Teu nome</span><input type="text" name="nome" maxlength="80" autocomplete="name" required></label>
        <label class="sx-fld"><span>WhatsApp</span><input type="tel" name="whats" inputmode="tel" autocomplete="tel" maxlength="20" placeholder="(43) 9 9999-9999" required></label></div>
      <input type="text" name="website" class="sx-mel" tabindex="-1" autocomplete="off" aria-hidden="true">
      <p class="sx-msg" id="sx-f-msg" role="alert" hidden></p>
      <div class="sx-acts"><button type="submit" class="sx-bt pri">Fixar meu pedido no Mural</button></div>
      <p class="sx-fine">Sem cadastro e de graça. Teu WhatsApp não aparece: só vai pra quem você escolher. No Mural aparece só teu primeiro nome, e o pedido sai sozinho em 15 dias.</p>
    </form>`;
/* quantos tem em cada ramo (os da cidade) e quantos pedidos abertos: a mesma conta do seo.js, que refaz na hora */
const contaDe = (d, k) => { const n = (d.gente || []).filter(p => p.categoria === k && p.aqui).length, m = (d.pedidos || []).filter(p => p.categoria === k).length;
  return [n ? `${n} no Corre` : '', m ? `${m} ${m === 1 ? 'pedido aberto' : 'pedidos abertos'}` : ''].filter(Boolean).join(' · '); };
const ramosNav = (c, menos, d) => `<nav class="sx-sec sx-ramos" aria-labelledby="sx-mais"><h2 id="sx-mais">${menos ? `Mais em ${esc(c.nome)}` : 'O que você precisa?'}</h2>
    <ul>${RAMOS.filter(r => r.k !== menos).map(r => `<li><a href="/${c.slug}/${r.slug}/">${esc(r.nome)}<small data-conta="${r.k}">${esc(contaDe(d, r.k))}</small></a></li>`).join('')}</ul></nav>`;

function paginaRamo(c, ramo, d){
  const x = R.doRamo(d, ramo), canon = `${BASE}/${c.slug}/${ramo.slug}/`, nomeMin = (ramo.curto || ramo.nome).toLowerCase();
  const titulo = `${ramo.nome} em ${c.nome}: quem faz e pedido de orçamento | Corre`;
  const desc = `${ramo.nome} em ${c.nome}: veja quem faz no Corre, o que contar no pedido e como comparar propostas. Fixa teu pedido de graça e recebe proposta.`;
  const ld = [{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Corre', item: BASE + '/' }, { '@type': 'ListItem', position: 2, name: c.nome, item: `${BASE}/${c.slug}/` },
      { '@type': 'ListItem', position: 3, name: ramo.nome, item: canon }] }];
  const lista = x.aqui.concat(x.longe);
  if(lista.length) ld.push({ '@context': 'https://schema.org', '@type': 'ItemList', name: `${ramo.nome} em ${c.nome}`, itemListElement: lista.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${BASE}/@${p.handle}`, name: p.nome || '@' + p.handle })) });
  const seo = { cidade: c.nome, uf: c.uf, pagina: `/${c.slug}/${ramo.slug}/`, ramo: { k: ramo.k, nome: ramo.nome, curto: ramo.curto || '', digital: !!ramo.digital } };
  return cabeca({ titulo, desc, canon, ld }) + topo(c) + `<main class="sx">
  <nav class="sx-mig" aria-label="Você está em"><a href="/">Corre</a> › <a href="/${c.slug}/">${esc(c.nome)}</a> › <span aria-current="page">${esc(ramo.nome)}</span></nav>
  <section class="sx-hero">
    <span class="sx-k">${esc(c.nome)}, ${esc(c.uf)}</span>
    <h1>${esc(ramo.nome)} em <em>${esc(c.nome)}</em></h1>
    <p>${esc(ramo.intro)}</p>
    <span class="sx-n" id="sx-n">${x.aqui.length ? `${x.aqui.length} ${x.aqui.length === 1 ? 'pessoa' : 'pessoas'} no Corre` : ''}</span>
    <div class="sx-acts"><a class="sx-bt pri" href="#pedido">Fixar meu pedido, de graça</a><a class="sx-bt" href="#quem">Ver quem faz</a></div>
    <p class="sx-fine">Sem cadastro. Quem faz te manda proposta e você escolhe com quem falar.</p>
  </section>
  <section class="sx-sec" id="quem" aria-labelledby="sx-quem-t">
    <h2 id="sx-quem-t">Quem faz ${esc(nomeMin)} em ${esc(c.nome)}</h2>
    <div class="sx-gente" id="sx-gente">${x.aqui.length ? x.aqui.map(p => R.cartao(p, ramo)).join('') : R.vazioGente(ramo, c.nome)}</div>
    <div id="sx-longe-w"${x.longe.length ? '' : ' hidden'}><h3>De outras cidades, à distância</h3><div class="sx-gente" id="sx-longe">${x.longe.map(p => R.cartao(p, ramo)).join('')}</div></div>
  </section>
  <section class="sx-sec sx-form-w" id="pedido" aria-labelledby="sx-ped-t"><div id="sx-f-w">
    <h2 id="sx-ped-t">Conta o que você precisa</h2>
    ${form(c, ramo)}
  </div></section>
  <section class="sx-sec" aria-labelledby="sx-guia-t">
    <h2 id="sx-guia-t">Como contratar ${esc(nomeMin)} sem dor de cabeça</h2>
    <div class="sx-guia">
      <div><h3>O que contar no pedido</h3><ul>${ramo.pedir.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>
      <div><h3>Como comparar as propostas</h3><ul>${ramo.comparar.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>
      <div><h3>Cuidado com</h3><ul>${ramo.cuidado.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>
    </div>
  </section>
  <section class="sx-sec" aria-labelledby="sx-abertos-t">
    <h2 id="sx-abertos-t">Pedidos de ${esc(nomeMin)} abertos agora</h2>
    <ul class="sx-pedidos" id="sx-pedidos">${x.pedidos.length ? x.pedidos.slice(0, 12).map(R.pedido).join('') : R.vazioPedidos()}</ul>
  </section>
  <section class="sx-sec sx-pro" aria-labelledby="sx-pro-t">
    <h2 id="sx-pro-t">Faz ${esc(nomeMin)} em ${esc(c.nome)}?</h2>
    <p>Cria teu perfil de graça no Corre, diz o que você faz e liga "Aparecer no Google": teu trabalho aparece aqui, e os pedidos de quem procura chegam no teu celular.</p>
    <div class="sx-acts"><a class="sx-bt pri" href="/" data-marca="entrar">Entrar no Corre</a></div>
  </section>
  ${ramosNav(c, ramo.k, d)}
</main>
` + pe(c, seo);
}

function paginaCidade(c, d){
  const canon = `${BASE}/${c.slug}/`;
  const titulo = `Quem faz em ${c.nome}: serviço, orçamento e gente do corre | Corre`;
  const desc = `Social media, design, foto, reforma, eventos, aulas e mais em ${c.nome}. Veja quem faz no Corre e fixa teu pedido de graça: quem faz te manda proposta.`;
  const ld = [{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Corre', item: BASE + '/' }, { '@type': 'ListItem', position: 2, name: c.nome, item: canon }] },
    { '@context': 'https://schema.org', '@type': 'ItemList', name: `Quem faz em ${c.nome}`, itemListElement: RAMOS.map((r, i) => ({ '@type': 'ListItem', position: i + 1, url: `${canon}${r.slug}/`, name: `${r.nome} em ${c.nome}` })) }];
  const seo = { cidade: c.nome, uf: c.uf, pagina: `/${c.slug}/`, ramo: null };
  return cabeca({ titulo, desc, canon, ld }) + topo(c) + `<main class="sx">
  <nav class="sx-mig" aria-label="Você está em"><a href="/">Corre</a> › <span aria-current="page">${esc(c.nome)}</span></nav>
  <section class="sx-hero">
    <span class="sx-k">${esc(c.nome)}, ${esc(c.uf)}${c.perto ? ' e região' : ''}</span>
    <h1>Quem faz em <em>${esc(c.nome)}</em></h1>
    <p>Gente de ${esc(c.nome)}${c.perto ? ` (e de ${esc(c.perto)})` : ''} que vive do próprio corre: quem faz social media, logo, foto, reforma, festa, aula e o resto. Escolhe o que você precisa, vê quem faz e fixa teu pedido de graça.</p>
    <div class="sx-acts"><a class="sx-bt pri" href="#pedido">Fixar meu pedido, de graça</a></div>
  </section>
  ${ramosNav(c, null, d)}
  <section class="sx-sec sx-form-w" id="pedido" aria-labelledby="sx-ped-t"><div id="sx-f-w">
    <h2 id="sx-ped-t">Conta o que você precisa</h2>
    ${form(c, null)}
  </div></section>
  <section class="sx-sec sx-pro" aria-labelledby="sx-pro-t">
    <h2 id="sx-pro-t">Você faz o corre em ${esc(c.nome)}?</h2>
    <p>Cria teu perfil de graça no Corre, diz o que você faz e liga "Aparecer no Google": teu trabalho aparece na página do teu ramo, e os pedidos de quem procura chegam no teu celular.</p>
    <div class="sx-acts"><a class="sx-bt pri" href="/" data-marca="entrar">Entrar no Corre</a></div>
  </section>
</main>
` + pe(c, seo);
}

const urls = [`${BASE}/`, `${BASE}/clientes`];
let total = 0;
for(const c of CIDADES){
  const d = await dadosDe(c);
  const pasta = join(SITE, c.slug); mkdirSync(pasta, { recursive: true });
  writeFileSync(join(pasta, 'index.html'), paginaCidade(c, d)); urls.push(`${BASE}/${c.slug}/`); total++;
  for(const r of RAMOS){
    mkdirSync(join(pasta, r.slug), { recursive: true });
    writeFileSync(join(pasta, r.slug, 'index.html'), paginaRamo(c, r, d)); urls.push(`${BASE}/${c.slug}/${r.slug}/`); total++;
  }
  /* o link na bio de quem ligou o Google também entra no mapa do site */
  for(const p of d.gente || []) if(/^[a-z0-9_.]{3,24}$/.test(p.handle || '')) urls.push(`${BASE}/@${p.handle}`);
  console.log(`${c.nome}: ${(d.gente || []).filter(p => p.aqui).length} da cidade e ${(d.gente || []).filter(p => !p.aqui).length} de fora que ligaram o Google, ${(d.pedidos || []).length} ${(d.pedidos || []).length === 1 ? 'pedido aberto' : 'pedidos abertos'}`);
}
const unicas = [...new Set(urls)];
writeFileSync(join(SITE, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${unicas.map(u => `  <url><loc>${esc(u)}</loc><lastmod>${hoje}</lastmod></url>`).join('\n')}
</urlset>
`);
if(!existsSync(join(SITE, 'robots.txt'))) console.log('aviso: falta o site/robots.txt');
console.log(`${total} páginas e o sitemap.xml (${unicas.length} endereços), versão ${VERSAO}${process.argv.includes('--demo') ? ' (EXEMPLO: não vai pro zip)' : ''}`);
