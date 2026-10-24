// tira quadros do motion em tempos escolhidos e monta uma folha de contato
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const [,, dir, ...ts] = process.argv;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 600, height: 1000 } });
  const erros = []; p.on('pageerror', e => erros.push(e.message)); p.on('console', m => { if (m.type() === 'error') erros.push(m.text()); });
  await p.goto('file://' + path.join(dir, 'motion.html'));
  await p.evaluate(() => window.pronto);
  const out = path.join(dir, 'q'); fs.mkdirSync(out, { recursive: true });
  for (const t of ts) {
    const url = await p.evaluate(t => { window.render(+t); const c = document.createElement('canvas'); c.width = 540; c.height = 960; c.getContext('2d').drawImage(document.getElementById('c'), 0, 0, 540, 960); return c.toDataURL('image/png'); }, t);
    fs.writeFileSync(path.join(out, `t${String(t).padStart(5, '0')}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }
  console.log(ts.length, 'quadros em', out, erros.length ? 'erros: ' + erros.slice(0, 5).join(' | ') : 'sem erro');
  await b.close();
})();
