// renderiza a trilha (som.html) num WAV
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const dir = process.argv[2]; const b = await chromium.launch(); const p = await b.newPage();
  const erros = []; p.on('pageerror', e => erros.push(e.message));
  await p.goto('file://' + path.join(dir, 'som.html'));
  const r = await p.evaluate(() => window.gera());
  fs.writeFileSync(path.join(dir, 'trilha.wav'), Buffer.from(r.b64, 'base64'));
  console.log('pico', r.pico.toFixed(3), 'erros', erros); await b.close();
})();
