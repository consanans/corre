/* CORRE · cenário: Londrina desenhada (céu, prédios e o lago) com a Monstra morando atrás das torres.
   Enquadra a foto no tamanho da tela e faz os olhos da Monstra seguirem o ponteiro. */
(function scene(){
  'use strict';
  const svg = document.getElementById('scene-svg'); if(!svg) return;
  /* o enquadramento puxa pro céu, pras nuvens e pros prédios: corta as árvores da esquerda
     e, quando sobra altura, mostra o céu primeiro e deixa o lago pra baixo */
  const W = 2370, H = 1575, X0 = 860, FOCUS = 1720;
  function fit(){
    const vw = innerWidth, vh = innerHeight, RW = W - X0, k = Math.max(vw / RW, vh / H);
    const visW = Math.min(RW, vw / k), visH = Math.min(H, vh / k);
    const x = Math.min(W - visW, Math.max(X0, FOCUS - visW * 0.5));
    svg.setAttribute('viewBox', `${Math.round(x)} 0 ${Math.round(visW)} ${Math.round(visH)}`);
  }
  fit(); let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(fit, 80); });
  const eyes = [...svg.querySelectorAll('.sc-eye')]; if(!eyes.length) return;
  const ctr = eyes.map(e => [+e.getAttribute('cx') + 7, +e.getAttribute('cy') - 11]);
  let raf = 0, px = 0, py = 0;
  addEventListener('pointermove', e => { px = e.clientX; py = e.clientY; if(!raf) raf = requestAnimationFrame(look); }, { passive: true });
  function look(){
    raf = 0; const m = svg.getScreenCTM(); if(!m) return;
    eyes.forEach((el, i) => { const [cx, cy] = ctr[i], dx = px - (m.a * cx + m.e), dy = py - (m.d * cy + m.f), d = Math.hypot(dx, dy) || 1, r = Math.min(10, d / 30);
      el.setAttribute('cx', (cx + dx / d * r).toFixed(1)); el.setAttribute('cy', (cy + dy / d * r).toFixed(1)); });
  }
})();
