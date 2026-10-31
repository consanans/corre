// v5.16 · o jogo de ícones do Corre, todo saído do mesmo desenho (o C do site/favicon.svg). Roda: node ferramentas/icones/gera.cjs && python3 ferramentas/icones/fecha.py (o fecha junta o favicon.ico e copia tudo pro site/; depois, subir o ?v= dos ícones no index.html, no site.webmanifest, nos termos, na privacidade e no ferramentas/seo/gera.mjs)
/* precisa do Playwright: npm i playwright num lugar qualquer e NODE_PATH apontando pro node_modules de lá */
const { chromium } = require('playwright'), fs = require('fs');
const svg0 = fs.readFileSync(require('path').join(__dirname, '../../site/favicon.svg'), 'utf8');
const C = svg0.match(/<path d="([^"]+)"/)[1];
// o C com a sombra fica centrado em 256,256: escala em volta do meio
const icone = ({ k = 1, rx = 0, fundo = true, so = false }) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A68CC"/><stop offset="1" stop-color="#4FA3EE"/></linearGradient></defs>
${fundo ? `<rect width="512" height="512" rx="${rx}" fill="url(#g)"/>` : ''}
<g transform="translate(256 256) scale(${k}) translate(-256 -256)">
${so ? '' : `<path d="${C}" fill="#FF48B0" transform="translate(26 18)"/>`}<path d="${C}" fill="#fff"/></g></svg>`;
const L = [
  // o de sempre (computador, Chrome): cantos já redondos
  ['icon-512.png', 512, { rx: 116 }], ['icon-192.png', 192, { rx: 116 }],
  // Android: o celular corta do jeito dele (círculo, gota, quadrado); o C dentro do círculo seguro (80% do meio)
  ['icon-maskable-512.png', 512, { k: .84 }], ['icon-maskable-192.png', 192, { k: .84 }],
  // iPhone: quadrado cheio, sem transparência (o iPhone arredonda; transparente vira preto)
  ['apple-touch-icon.png', 180, { k: .9 }],
  // (no favicon de 16 px a sombra rosa vira borrão: só o C)
  // o selinho do aviso no Android: só a forma, branca no transparente
  ['badge-96.png', 96, { fundo: false, so: true, k: 1.15 }],
  ['f16.png', 16, { rx: 96, k: 1.2, so: true }], ['f32.png', 32, { rx: 100, k: 1.05 }], ['f48.png', 48, { rx: 110 }],
];
fs.mkdirSync(require('path').join(__dirname, 'out'), { recursive: true });
(async () => {
  const b = await chromium.launch();
  for(const [nome, px, o] of L){
    const p = await b.newPage({ viewport: { width: px, height: px }, deviceScaleFactor: 1 });
    await p.setContent(`<html><body style="margin:0;background:transparent">${icone(o).replace('<svg ', `<svg width="${px}" height="${px}" `)}</body></html>`);
    await p.screenshot({ path: require('path').join(__dirname, 'out', nome), omitBackground: true });
    await p.close();
  }
  fs.writeFileSync(require('path').join(__dirname, 'out', 'favicon.svg'), icone({ rx: 116 }).replace(/\n/g, '\n') + '\n');
  await b.close();
})();
