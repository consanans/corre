// renderiza o motion inteiro: cada quadro vira PNG e vai direto pro ffmpeg, depois junta a trilha
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const path = require('path');
(async () => {
  const dir = process.argv[2], FPS = 30, saida = process.argv[3] || path.join(dir, 'video-sem-som.mp4');
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 600, height: 1000 } });
  const erros = []; p.on('pageerror', e => erros.push(e.message));
  await p.goto('file://' + path.join(dir, 'motion.html')); await p.evaluate(() => window.pronto);
  const DUR = await p.evaluate(() => window.DUR), N = Math.round(DUR * FPS);
  const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', saida], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = 0; i < N; i++) {
    const b64 = await p.evaluate(t => { window.render(t); return document.getElementById('c').toDataURL('image/png').split(',')[1]; }, i / FPS);
    if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 90 === 0) console.log(`quadro ${i}/${N} · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  console.log('pronto', N, 'quadros em', ((Date.now() - t0) / 1000).toFixed(0), 's · erros:', erros); await b.close();
})();
