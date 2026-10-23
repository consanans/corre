/* CORRE · O BICHO DO CADERNINHO (v4.30)
   O Thales: "adiciona poderes conforme for concluindo tarefa, tipo evoluindo pokemons". Um ovo aparece no Caderninho e a
   pessoa escolhe um de três bichos daqui (a gralha-azul do Paraná, o lobo-guará do cerrado e a coruja-buraqueira dos
   campos de Londrina; desenho nosso, nada de Pokémon). Cada tarefa feita alimenta o bicho: ele choca, cresce e evolui em
   quatro formas, e no caminho aprende poderes que mudam o Caderninho de verdade (aponta a tarefa da vez, o mapa do ano,
   anda contigo no Correverso, o modo foco, o escudo da sequência de trampo). Quem conta as tarefas é o banco
   (delta-v430.sql: as tarefas que o trampo da 4.29 já conferiu, sem teto por dia). Na 4.30 a lenda era em 150.000; na
   4.32 o Thales baixou pra 15.000 ("se não vai demorar demais") e o resto na mesma proporção: choca com 300, evolui com
   1.500 e 5.000 (delta-v432.sql).
   Aqui: o desenho (figurinha com
   contorno grosso no Caderninho e o mesmo desenho em pixel na cidade), a escolha, a folha do bicho e a evolução. */
(function(){
  'use strict';
  const C = window.Corre;
  const TAU = Math.PI * 2;

  /* ---------- o desenho ----------
     Tudo num quadro de uns 110 de largura, com o chão no y = 0 e o bicho subindo pro y negativo. Contorno grosso
     escuro, cor chapada com uma sombra e um brilho (figurinha). F = { t (segundos), humor, pulo (0 a 1) } */
  const K = '#141216';
  let X = null, LW = 3;
  const caminho = () => X.beginPath();
  function pinta(fill, lw){ if(fill){ X.fillStyle = fill; X.fill(); } if(lw !== 0){ X.lineWidth = lw || LW; X.strokeStyle = K; X.lineJoin = 'round'; X.stroke(); } }
  function el(x, y, rx, ry, fill, rot, lw){ caminho(); X.ellipse(x, y, Math.max(rx, .1), Math.max(ry, .1), rot || 0, 0, TAU); pinta(fill, lw); }
  /* a forma lisa que passa pelo meio de cada lado (os pontos puxam a curva) */
  function blob(pts, fill, lw){
    const n = pts.length, m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    caminho(); const s = m(pts[n - 1], pts[0]); X.moveTo(s[0], s[1]);
    for(let i = 0; i < n; i++){ const p = pts[i], q = m(p, pts[(i + 1) % n]); X.quadraticCurveTo(p[0], p[1], q[0], q[1]); }
    X.closePath(); pinta(fill, lw);
  }
  function poli(pts, fill, lw){ caminho(); X.moveTo(pts[0][0], pts[0][1]); for(let i = 1; i < pts.length; i++) X.lineTo(pts[i][0], pts[i][1]); X.closePath(); pinta(fill, lw); }
  function traco(pts, lw, cor, cap){
    caminho(); X.moveTo(pts[0][0], pts[0][1]); for(let i = 1; i < pts.length; i++) X.lineTo(pts[i][0], pts[i][1]);
    X.lineWidth = lw || LW; X.strokeStyle = cor || K; X.lineCap = cap || 'round'; X.lineJoin = 'round'; X.stroke(); X.lineCap = 'butt';
  }
  /* a perna/o traço com contorno: o escuro largo e a cor por cima */
  function osso(pts, lw, cor){ traco(pts, lw + LW * 1.4, K); traco(pts, lw, cor); }
  /* o pelo e a penugem: a borda em ondinhas */
  function fofo(cx, cy, rx, ry, n, amp, fill, fase){
    const pts = []; for(let i = 0; i < n * 2; i++){ const a = (i / (n * 2)) * TAU + (fase || 0), k = i % 2 ? 1 + amp : 1 - amp * .25; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    blob(pts, fill);
  }
  function com(f){ X.save(); f(); X.restore(); }
  function recorta(fn, desenho){ X.save(); caminho(); fn(); X.clip(); desenho(); X.restore(); }
  /* o olho: o oval preto com dois brilhos; fecha (piscar), feliz (o arquinho), anel (a íris clara em volta) */
  function olho(x, y, r, o){
    o = o || {};
    if(o.feliz){ caminho(); X.arc(x, y + r * .5, r * .82, Math.PI * 1.12, Math.PI * 1.88); X.lineWidth = LW * 1.2; X.lineCap = 'round'; X.strokeStyle = o.risco || K; X.stroke(); X.lineCap = 'butt'; return; }
    const ry = r * (1 - (o.fecha || 0));
    if(ry < r * .2){ traco([[x - r * .8, y + r * .1], [x + r * .8, y + r * .1]], LW * 1.15, o.risco || K); return; }
    if(o.anel) el(x, y, r * 1.3, ry * 1.25, o.anel, 0, 0);
    el(x, y, r * .82, ry, o.cor || K, 0, 0);
    if(ry > r * .5){ el(x - r * .28, y - ry * .38, r * .3, r * .3 * ry / r, '#fff', 0, 0); el(x + r * .26, y + ry * .34, r * .13, r * .13, '#fff', 0, 0); }
  }
  /* o olho da coruja: grande e amarelo, com a pupila; aceso no Oráculo */
  function olhoCoruja(x, y, r, o){
    o = o || {};
    if(o.feliz){ el(x, y, r, r, o.disco || '#F5E8CF', 0, 0); caminho(); X.arc(x, y + r * .45, r * .7, Math.PI * 1.12, Math.PI * 1.88); X.lineWidth = LW * 1.2; X.lineCap = 'round'; X.strokeStyle = K; X.stroke(); X.lineCap = 'butt'; return; }
    const f = o.fecha || 0;
    /* fechado de vez: o disco da pena com o risquinho da pálpebra */
    if(f >= .95){ el(x, y, r, r, o.pena || '#8B5E3C'); caminho(); X.arc(x, y - r * .25, r * .62, Math.PI * .18, Math.PI * .82); X.lineWidth = LW * 1.1; X.lineCap = 'round'; X.strokeStyle = K; X.stroke(); X.lineCap = 'butt'; return; }
    if(o.brilho){ com(() => { const g = X.createRadialGradient(x, y, 0, x, y, r * 2.4); g.addColorStop(0, 'rgba(255,214,90,.55)'); g.addColorStop(1, 'rgba(255,214,90,0)'); X.fillStyle = g; X.fillRect(x - r * 2.5, y - r * 2.5, r * 5, r * 5); }); }
    el(x, y, r, r, o.iris || '#FFD321');
    el(x + (o.olha || 0) * r * .18, y + r * .05, r * .5, r * .55, K, 0, 0);
    el(x - r * .32, y - r * .36, r * .22, r * .22, '#fff', 0, 0);
    /* a pálpebra desce de cima (piscar, sono) */
    if(f > 0) recorta(() => X.ellipse(x, y, r, r, 0, 0, TAU), () => { X.fillStyle = o.pena || '#8B5E3C'; X.fillRect(x - r - 1, y - r - 1, r * 2 + 2, r * 2 * f + 1); traco([[x - r, y - r + r * 2 * f], [x + r, y - r + r * 2 * f]], LW * .9); });
    el(x, y, r, r, null);
  }
  /* SEMFX: desenhando a silhueta (a linha de evolução, os que ainda não vieram): sem sombra, aura nem brilho */
  let SEMFX = false;
  const sombra = (rx, ry) => { if(!SEMFX) el(0, 1, rx, ry, 'rgba(20,18,22,.18)', 0, 0); };
  const bochecha = (x, y, rx) => el(x, y, rx, rx * .55, 'rgba(255,72,176,.32)', 0, 0);
  function brilhos(t, pts, cor){
    if(SEMFX) return;
    pts.forEach(([x, y, r, fase], i) => {
      const k = (Math.sin(t * 3 + (fase || i * 1.7)) + 1) / 2; if(k < .25) return;
      const s = r * k; com(() => { X.translate(x, y); X.rotate(Math.PI / 4 * (i % 2)); poli([[0, -s], [s * .28, -s * .28], [s, 0], [s * .28, s * .28], [0, s], [-s * .28, s * .28], [-s, 0], [-s * .28, -s * .28]], cor || '#FFE800', LW * .6); });
    });
  }
  function aura(y, r, cores){
    if(SEMFX) return;
    com(() => { const g = X.createRadialGradient(0, y, r * .1, 0, y, r); cores.forEach((c, i) => g.addColorStop(i / (cores.length - 1), c)); X.fillStyle = g; X.beginPath(); X.arc(0, y, r, 0, TAU); X.fill(); });
  }
  function zzz(x, y, t){
    com(() => { X.fillStyle = K; X.font = '700 11px "Archivo", system-ui, sans-serif'; for(let i = 0; i < 3; i++){ const k = ((t * .45 + i / 3) % 1); X.globalAlpha = Math.sin(k * Math.PI); X.font = `800 ${8 + k * 7}px "Archivo", system-ui, sans-serif`; X.fillText('z', x + k * 14 + Math.sin(k * 6) * 2, y - k * 22); } });
  }
  /* a cara de cada humor: feliz (os olhos de arquinho), sono (fechado, com os zzz), saudade (meio fechado), normal (pisca) */
  function cara(F){
    const pisca = (F.t % 4.3) < .13 || ((F.t + 1.9) % 7.1) < .11;
    if(F.humor === 'feliz') return { feliz: true };
    if(F.humor === 'sono') return { fecha: 1 };
    if(F.humor === 'saudade') return { fecha: pisca ? 1 : .45 };
    return { fecha: pisca ? 1 : 0 };
  }

  /* ---------- os ovos (a cor e a pinta de cada um; trinca conforme chega a hora) ---------- */
  const OVO = {
    gralha: { a: '#3F7BF0', b: '#2A57C2', p: '#8A4B2A' },
    guara: { a: '#F27A2E', b: '#C9541A', p: '#FFD27A' },
    coruja: { a: '#F3E6C8', b: '#D8C49C', p: '#8B5E3C' },
    /* o ovo de antes de escolher: nas cores do Corre */
    surpresa: { a: '#FFE800', b: '#F2C200', p: '#FF48B0' }
  };
  function ovo(esp, F, prog){
    const c = OVO[esp] || OVO.gralha, p = Math.max(0, Math.min(1, prog || 0));
    /* balança mais quando tá quase chocando (a pausa entre uma balançada e outra também encurta) */
    const ciclo = 3.2 - p * 1.8, fase = F.t % ciclo, bal = fase < .9 ? Math.sin(fase / .9 * TAU * 2) * (.05 + p * .16) * (1 - fase / .9) : 0;
    sombra(18, 4);
    com(() => {
      X.rotate(bal);
      const forma = () => { const pts = []; for(let i = 0; i < 24; i++){ const a = i / 24 * TAU, s = Math.sin(a), k = s < 0 ? 1 - .2 * -s : 1; pts.push([Math.cos(a) * 19 * k, -27 + s * 27]); } return pts; };
      blob(forma(), c.a);
      recorta(() => { const pts = forma(), n = pts.length, m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; const s = m(pts[n - 1], pts[0]); X.moveTo(s[0], s[1]); for(let i = 0; i < n; i++){ const q = m(pts[i], pts[(i + 1) % n]); X.quadraticCurveTo(pts[i][0], pts[i][1], q[0], q[1]); } }, () => {
        el(6, -10, 20, 14, c.b, 0, 0);
        if(esp === 'guara'){ [[-8, -34, 5], [6, -22, 4], [-4, -14, 3.5], [9, -40, 3]].forEach(([x, y, r]) => poli([[x, y - r * 1.6], [x + r, y], [x, y + r * .6], [x - r, y]], c.p, 0)); }
        else if(esp === 'gralha' || esp === 'surpresa'){ [[-7, -36, 3], [5, -30, 2.4], [-2, -18, 2.6], [9, -16, 2], [-10, -24, 2], [3, -44, 2]].forEach(([x, y, r]) => el(x, y, r, r * .8, c.p, .4, 0)); }
        else { [[-6, -38, 3.4], [6, -32, 2.6], [-8, -20, 2.4], [4, -16, 3], [9, -24, 2], [0, -46, 2.2]].forEach(([x, y, r]) => el(x, y, r, r * .85, c.p, -.3, 0)); }
        el(-7, -40, 5, 8, 'rgba(255,255,255,.45)', -.4, 0);
      });
      blob(forma(), null);
      /* as trincas */
      if(p >= .3) traco([[-6, -44], [-2, -38], [-7, -33], [-1, -28]], LW * .8);
      if(p >= .62) traco([[16, -30], [10, -27], [13, -21], [7, -17]], LW * .8);
      if(p >= .9) traco([[-18, -22], [-12, -20], [-14, -14]], LW * .8);
    });
  }

  /* ---------- a gralha-azul (Pinhãozinho, Gralhinha, Gralha Braba, Imperatriz Araucária) ---------- */
  const G = { az: '#2F6FEB', az2: '#1F4BB0', az3: '#6E9DF7', pr: '#29242E', pr2: '#4A4452', bico: '#3A3540', anel: '#9EC2FF', pin: '#B0663A', pin2: '#7E4424', ouro: '#E2B04A', ouro2: '#FFE08A' };
  /* a cauda comprida da gralha: as penas em leque saindo de (x, y) pra trás e pra baixo (ang em radianos, n penas) */
  function cauda(x, y, ang, comp, larg, n){
    com(() => {
      X.translate(x, y); X.rotate(Math.PI - ang);
      for(let i = n - 1; i >= 0; i--){
        const a = (i - (n - 1) / 2) * .16, w = larg * (i === Math.floor(n / 2) ? 1 : .8);
        com(() => { X.rotate(a); poli([[0, -w * .35], [comp * .96, -w / 2], [comp, 0], [comp * .96, w / 2], [0, w * .35]], i % 2 ? G.az2 : G.az); el(comp * .86, 0, comp * .1, w * .36, G.pr, 0, 0); });
      }
    });
  }
  /* a asa dobrada do lado do corpo, com três pontas de pena */
  function asaDobrada(x, y, s){
    com(() => {
      X.translate(x, y); X.scale(s, s);
      blob([[-12, -4], [2, -8], [10, 2], [6, 16], [-2, 26], [-8, 20], [-14, 26], [-18, 14]], G.az2);
      traco([[-2, 4], [-3, 18]], LW * .65, K); traco([[-9, 6], [-10, 18]], LW * .65, K);
      el(-1, -2, 7, 3.5, G.az, -.3, 0);
    });
  }
  function gralha(e, F){
    const o = cara(F), t = F.t;
    if(e === 1){
      sombra(22, 4);
      el(-21, -30, 7, 10, G.az2, -.5); el(21, -30, 7, 10, G.az2, .5);
      el(0, -34, 22, 22, G.az);
      recorta(() => X.ellipse(0, -34, 22, 22, 0, 0, TAU), () => { el(1, -48, 21, 14, G.pr, 0, 0); el(-7, -27, 9, 6, G.az3, 0, 0); });
      el(0, -34, 22, 22, null);
      /* a casca do pinhão por fora */
      poli([[-25, -27], [-18, -24], [-12, -29], [-5, -24], [2, -29], [9, -24], [16, -29], [25, -27], [17, -8], [0, 2], [-17, -8]], G.pin);
      traco([[-12, -18], [-4, -4]], LW * .7, G.pin2); traco([[10, -19], [4, -4]], LW * .7, G.pin2);
      const b = Math.sin(t * 3) * 1.2;
      blob([[-6, -54], [-3, -64 + b], [0, -55], [3, -63 + b], [6, -54], [0, -50]], G.pr);
      olho(-8, -42, 4.2, Object.assign({ anel: G.anel }, o)); olho(8, -42, 4.2, Object.assign({ anel: G.anel }, o));
      poli([[-3.5, -37], [3.5, -37], [0, -32]], G.bico, LW * .8);
      bochecha(-13, -33, 4); bochecha(13, -33, 4);
      return;
    }
    if(e === 2){
      sombra(20, 4);
      cauda(-10, -20, .55, 30, 9, 2);
      osso([[-4, -12], [-5, -1]], 2.4, G.pr); osso([[6, -12], [7, -1]], 2.4, G.pr);
      traco([[-9, 0], [-1, 0]], LW, K); traco([[3, 0], [11, 0]], LW, K);
      el(0, -26, 19, 17, G.az);
      el(5, -22, 10, 10, G.az3, 0, 0);
      blob([[-15, -31], [-4, -35], [4, -26], [-5, -15], [-17, -20]], G.az2);
      const b = Math.sin(t * 2.6) * 1.4;
      blob([[-7, -59], [-4, -71 + b], [0, -61], [4, -70 + b], [8, -60], [2, -56]], G.pr);
      el(4, -47, 16, 15, G.pr);
      el(-1, -55, 6, 3.5, G.pr2, -.3, 0);
      olho(-1, -48, 3.8, Object.assign({ anel: G.anel }, o)); olho(11, -48, 4.2, Object.assign({ anel: G.anel }, o));
      poli([[17, -48], [27, -44.5], [17, -41]], G.bico, LW * .8);
      bochecha(-3, -40, 3.4); bochecha(13, -40, 3.4);
      return;
    }
    if(e === 3){
      sombra(28, 5);
      cauda(-12, -26, .5, 46, 13, 3);
      /* em cima de um pinhão, de peito estufado */
      blob([[-20, -6], [-8, -14], [14, -13], [24, -6], [12, 0], [-14, 0]], G.pin);
      traco([[-6, -10], [-2, -2]], LW * .7, G.pin2); traco([[8, -11], [10, -3]], LW * .7, G.pin2);
      osso([[-6, -24], [-7, -12]], 2.8, G.pr); osso([[8, -24], [9, -12]], 2.8, G.pr);
      traco([[-12, -11], [-2, -11]], LW, K); traco([[4, -11], [14, -11]], LW, K);
      blob([[-22, -46], [-6, -60], [18, -54], [26, -36], [12, -20], [-14, -22]], G.az);
      blob([[4, -52], [20, -46], [20, -30], [8, -24], [0, -36]], G.az3, 0);
      asaDobrada(-6, -46, 1.15);
      const b = Math.sin(t * 2.4) * 1.6;
      poli([[-4, -74], [-8, -92 + b], [2, -80], [5, -97 + b], [10, -81], [18, -92 + b], [17, -74]], G.pr);
      el(8, -66, 17, 16, G.pr);
      el(2, -75, 6, 3.5, G.pr2, -.3, 0);
      olho(2, -67, 4.1, Object.assign({ anel: G.anel }, o)); olho(15, -67, 4.5, Object.assign({ anel: G.anel }, o));
      /* a cara de brava: a pálpebra entra em diagonal por cima */
      if(!o.feliz && !(o.fecha >= .8)){ poli([[-4, -75], [6, -70.5], [6, -76]], G.pr, 0); poli([[21, -76], [10, -70.5], [10, -77]], G.pr, 0); }
      poli([[23, -67], [38, -62], [23, -58]], G.bico, LW * .8);
      return;
    }
    /* 4 · a Imperatriz Araucária: as asas abertas, a coroa de araucária em ouro */
    aura(-58, 66, ['rgba(255,232,0,.42)', 'rgba(255,72,176,.18)', 'rgba(255,72,176,0)']);
    sombra(28, 5);
    const bat = Math.sin(t * 2.2) * .07;
    [-1, 1].forEach(s => com(() => {
      X.translate(s * 10, -54); X.rotate(s * bat); X.scale(s, 1);
      poli([[0, -4], [24, -26], [46, -30], [52, -20], [44, -16], [50, -8], [40, -4], [44, 4], [32, 4], [34, 12], [18, 8], [2, 10]], G.az2);
      poli([[6, -2], [26, -18], [42, -22], [36, -12], [24, -6], [26, 2], [10, 4]], G.az, 0);
      [[46, -30, 52, -20], [44, -16, 50, -8], [40, -4, 44, 4], [32, 4, 34, 12]].forEach(([a, b2, c2, d]) => traco([[a - 3, b2 + 2], [c2, d]], LW * 1.4, G.ouro));
    }));
    poli([[-10, -20], [-16, 0], [-6, -4], [0, 4], [6, -4], [16, 0], [10, -20]], G.az2);
    osso([[-6, -20], [-7, -2]], 2.6, G.pr); osso([[6, -20], [7, -2]], 2.6, G.pr);
    blob([[-16, -48], [0, -60], [16, -48], [14, -24], [0, -16], [-14, -24]], G.az);
    poli([[-9, -46], [0, -32], [9, -46], [5, -46], [0, -38], [-5, -46]], G.ouro, LW * .7);
    el(0, -70, 15, 14, G.pr);
    el(-4, -77, 6, 3.4, G.pr2, -.3, 0);
    olho(-6, -71, 3.8, Object.assign({ anel: G.anel }, o)); olho(6, -71, 3.8, Object.assign({ anel: G.anel }, o));
    poli([[-3.5, -64], [3.5, -64], [0, -58]], G.bico, LW * .8);
    /* a coroa: o tronco e três andares de galho pra cima, como a araucária */
    const cb = Math.sin(t * 1.8) * .8;
    const galho = (y, w) => { osso([[0, y], [-w * .6, y - 3], [-w, y - 8 + cb]], 1.8, G.ouro); osso([[0, y], [w * .6, y - 3], [w, y - 8 + cb]], 1.8, G.ouro); };
    osso([[0, -83], [0, -104]], 2, G.ouro);
    galho(-86, 13); galho(-94, 10); galho(-101, 6);
    el(0, -106, 2.6, 2.6, G.ouro2, 0, LW * .7);
    brilhos(t, [[-40, -86, 5], [42, -92, 6, 1], [-30, -20, 4, 2], [36, -30, 4.5, .5], [0, -116, 4, 3]], '#FFE800');
  }

  /* ---------- o lobo-guará (Brasinha, Guarazinho, Guará Corredor, Guará Lua Cheia) ---------- */
  const L = { la: '#F06A1E', la2: '#C64E10', la3: '#F7A04A', cr: '#FCE7C8', pr: '#2A2228', pr2: '#4A4048', brasa: '#FFD27A' };
  function guara(e, F){
    const o = cara(F), t = F.t, rabo = Math.sin(t * (F.humor === 'feliz' ? 9 : 4)) * (F.humor === 'sono' ? .03 : .16);
    if(e === 1){
      sombra(22, 4);
      com(() => { X.translate(16, -10); X.rotate(rabo - .3); fofo(10, -6, 12, 8, 6, .14, L.la); fofo(19, -9, 5, 4.5, 4, .16, L.brasa); });
      fofo(0, -20, 20, 17, 9, .1, L.la);
      el(0, -16, 11, 9, L.cr, 0, 0);
      /* as orelhas grandes */
      poli([[-19, -46], [-25, -76], [-5, -57]], L.la); poli([[-17, -50], [-21, -68], [-9, -56]], L.cr, 0);
      poli([[5, -57], [24, -78], [19, -46]], L.la); poli([[9, -56], [21, -70], [17, -50]], L.cr, 0);
      fofo(0, -42, 21, 18, 10, .07, L.la);
      el(2, -35, 10, 7, L.cr);
      el(3, -39.5, 3.6, 2.6, K, 0, 0);
      traco([[0, -35], [3, -33], [6, -35]], LW * .8);
      olho(-8, -45, 4, o); olho(13, -45, 4, o);
      bochecha(-13, -37, 3.6); bochecha(17, -37, 3.6);
      el(-8, -3, 6, 4, L.pr); el(8, -3, 6, 4, L.pr);
      /* as faíscas de brasa subindo */
      for(let i = 0; i < 3; i++){ const k = (t * .5 + i / 3) % 1, x = -22 + i * 20 + Math.sin(k * 7 + i) * 3, y = -26 - k * 40; com(() => { X.globalAlpha = Math.sin(k * Math.PI) * .9; poli([[x, y - 3], [x + 2, y], [x, y + 3], [x - 2, y]], L.brasa, 0); }); }
      return;
    }
    if(e === 2){
      sombra(26, 4);
      com(() => { X.translate(-18, -28); X.rotate(rabo + .5); blob([[0, -3], [-14, 2], [-22, 12], [-16, 16], [-4, 8], [2, 4]], L.la); el(-19, 13, 4.6, 4, L.cr, .4); });
      osso([[-14, -22], [-15, -2]], 4, L.pr); osso([[-6, -22], [-7, -2]], 4, L.pr);
      osso([[8, -22], [9, -2]], 4, L.pr); osso([[15, -22], [16, -2]], 4, L.pr);
      blob([[-20, -32], [-6, -38], [14, -36], [20, -26], [8, -18], [-16, -18]], L.la);
      el(4, -21, 10, 4, L.la3, 0, 0);
      blob([[8, -38], [14, -46], [22, -40], [16, -32]], L.pr, 0);
      poli([[12, -54], [11, -72], [20, -58]], L.la); poli([[13.5, -57], [13, -67], [18, -58]], L.cr, 0);
      poli([[20, -57], [26, -74], [28, -55]], L.la); poli([[22, -57], [26, -68], [26.5, -57]], L.cr, 0);
      el(19, -46, 12, 11, L.la);
      el(28, -42, 9, 6, L.la);
      el(26, -39, 7, 4, L.cr, 0, 0);
      el(36, -43, 3, 2.4, K, 0, 0);
      olho(21, -48, 3.6, o);
      bochecha(18, -40, 3);
      return;
    }
    if(e === 3){
      sombra(34, 5);
      com(() => { X.translate(-26, -46); X.rotate(rabo * .8 + .2); blob([[2, -2], [-12, 0], [-20, 12], [-18, 22], [-10, 16], [2, 4]], L.la); el(-17, 20, 5, 4.6, L.cr, .3); });
      osso([[-22, -36], [-25, -1]], 4, L.pr); osso([[-13, -36], [-14, -1]], 4, L.pr);
      osso([[14, -36], [16, -1]], 4, L.pr); osso([[23, -36], [25, -1]], 4, L.pr);
      blob([[-28, -50], [-8, -56], [20, -54], [28, -42], [18, -32], [-22, -32]], L.la);
      el(0, -35, 18, 4.5, L.la3, 0, 0);
      /* a crina preta no pescoço */
      blob([[4, -56], [14, -70], [24, -66], [20, -52], [8, -50]], L.pr);
      poli([[22, -80], [19, -101], [30, -84]], L.la); poli([[23, -83], [21, -96], [28, -85]], L.cr, 0);
      poli([[30, -82], [35, -102], [39, -80]], L.la); poli([[32, -82], [35, -97], [37.5, -81]], L.cr, 0);
      el(30, -71, 12, 11, L.la);
      el(42, -67, 10, 6, L.la);
      el(40, -63.5, 8, 3.6, L.cr, 0, 0);
      el(50, -68, 3, 2.6, K, 0, 0);
      olho(32, -73, 3.6, o);
      if(!o.feliz && !(o.fecha >= .8)) traco([[28, -78], [36, -77]], LW * .9);
      return;
    }
    /* 4 · o Guará Lua Cheia: sentado, uivando pra lua */
    aura(-70, 72, ['rgba(180,162,218,.35)', 'rgba(255,72,176,.14)', 'rgba(255,72,176,0)']);
    if(!SEMFX){ el(-22, -84, 30, 30, '#F4EFD8', 0, LW * .8); el(-32, -92, 6, 5, '#E2D8BC', 0, 0); el(-12, -74, 7, 5.5, '#E2D8BC', 0, 0); el(-34, -72, 4, 3.4, '#E2D8BC', 0, 0); }
    sombra(28, 5);
    com(() => {
      X.scale(1.14, 1.14);
      com(() => { X.translate(-14, -8); X.rotate(rabo * .5); blob([[0, -6], [-16, -2], [-24, 6], [-6, 8], [18, 6], [8, -2]], L.la); el(-20, 4, 5, 4, L.cr); });
      blob([[-16, -46], [0, -58], [14, -46], [16, -12], [8, 0], [-14, 0], [-18, -16]], L.la);
      el(0, -26, 8, 16, L.cr, 0, 0);
      osso([[-6, -30], [-7, -1]], 4.4, L.pr); osso([[6, -30], [7, -1]], 4.4, L.pr);
      blob([[-12, -54], [0, -66], [14, -60], [12, -48], [-4, -46]], L.pr);
      com(() => {
        X.translate(4, -66); X.rotate(-.7 + Math.sin(t * 1.4) * .03);
        poli([[-13, -6], [-22, -24], [-5, -11]], L.la); poli([[-12, -9], [-18, -20], [-8, -11]], L.cr, 0);
        poli([[-3, -11], [0, -30], [7, -9]], L.la); poli([[-1, -11], [.5, -25], [4.5, -10]], L.cr, 0);
        /* o uivo: o queixo desce e a boca abre */
        el(13, 7, 8, 3.4, L.la, .25);
        el(12, 4.5, 6, 2.6, '#5A1E2A', .1, 0);
        el(0, 0, 12, 11, L.la);
        el(14, 1, 10, 5, L.la, -.05);
        el(23, .4, 3, 2.6, K, 0, 0);
        olho(2, -2, 3.4, { fecha: 1 });
      });
    });
    if(F.humor !== 'sono'){ const k = (t * .6) % 1; com(() => { X.globalAlpha = 1 - k; X.strokeStyle = K; X.lineWidth = LW * .8; X.lineCap = 'round'; for(let i = 0; i < 2; i++){ X.beginPath(); X.arc(34, -104, 7 + i * 6 + k * 10, -1.3, .2); X.stroke(); } }); }
    brilhos(t, [[-48, -112, 4.6, .3], [42, -58, 4.5, 1.1], [-46, -30, 4, 2], [36, -16, 3.6, .8]], '#FFE800');
  }

  /* ---------- a coruja-buraqueira (Pipoquinha, Buraqueira, Coruja Vigia, Oráculo do Campo) ---------- */
  const W = { ma: '#8B5E3C', ma2: '#6A4329', ma3: '#B98A5E', cr: '#F5E8CF', br: '#FFFFFF', bico: '#E5C46A', pe: '#D9C9A8', terra: '#7A2E26', terra2: '#5E211B', noite: '#765BA7' };
  const pintas = pts => pts.forEach(([x, y, r]) => el(x, y, r, r * .8, W.cr, 0, 0));
  function coruja(e, F){
    const o = cara(F), t = F.t, gira = Math.sin(Math.max(0, (t % 6.5) - 5) * Math.PI) * .22;
    const olhos = (x1, x2, y, r, extra) => {
      const p = Object.assign({ pena: extra && extra.pena }, o, extra || {});
      olhoCoruja(x1, y, r, p); olhoCoruja(x2, y, r, p);
    };
    if(e === 1){
      sombra(20, 4);
      traco([[-6, -6], [-7, 0]], LW, W.pe); traco([[6, -6], [7, 0]], LW, W.pe);
      fofo(0, -24, 22, 21, 11, .13, W.cr);
      el(-4, -40, 3, 2.4, W.ma3, 0, 0); el(5, -42, 2.4, 2, W.ma3, 0, 0); el(0, -44, 2, 1.6, W.ma3, 0, 0);
      olhos(-8, 8, -27, 6.6, { pena: W.cr });
      poli([[-2.5, -20], [2.5, -20], [0, -15]], W.bico, LW * .7);
      bochecha(-14, -17, 3.6); bochecha(14, -17, 3.6);
      return;
    }
    if(e === 2){
      sombra(18, 4);
      osso([[-5, -14], [-6, -1]], 2, W.pe); osso([[5, -14], [6, -1]], 2, W.pe);
      el(0, -28, 17, 19, W.ma);
      el(0, -24, 10, 13, W.cr, 0, 0);
      [[-23, -27], [-20, -22]].forEach(() => {});
      traco([[-5, -28], [-2, -26]], LW * .8, W.ma3); traco([[3, -23], [6, -21]], LW * .8, W.ma3); traco([[-4, -18], [-1, -16]], LW * .8, W.ma3);
      blob([[-17, -36], [-11, -38], [-9, -22], [-15, -14], [-19, -24]], W.ma2);
      blob([[17, -36], [11, -38], [9, -22], [15, -14], [19, -24]], W.ma2);
      com(() => {
        X.translate(0, -52); X.rotate(gira); X.translate(0, 52);
        el(0, -52, 16, 14, W.ma);
        pintas([[-9, -61, 1.6], [-3, -64, 1.4], [4, -63, 1.6], [10, -59, 1.3], [-12, -55, 1.2]]);
        el(0, -49, 12, 9, W.ma3, 0, 0);
        olhos(-6, 6, -50, 5.2, { pena: W.ma3 });
        traco([[-11, -57], [-3, -58]], LW * 1.1, W.br); traco([[3, -58], [11, -57]], LW * 1.1, W.br);
        poli([[-2.4, -45], [2.4, -45], [0, -40]], W.bico, LW * .7);
      });
      return;
    }
    if(e === 3){
      /* o buraco de terra roxa, a casa dela */
      blob([[-36, 0], [-26, -12], [-6, -16], [16, -14], [34, -6], [38, 0]], W.terra);
      el(-14, -5, 9, 5, W.terra2, 0, LW * .8);
      el(18, -10, 4, 2, '#9A3E33', 0, 0);
      osso([[-6, -34], [-7, -14]], 2.2, W.pe); osso([[6, -34], [7, -14]], 2.2, W.pe);
      traco([[-11, -14], [-3, -14]], LW, K); traco([[3, -14], [11, -14]], LW, K);
      el(0, -50, 18, 22, W.ma);
      el(0, -45, 11, 15, W.cr, 0, 0);
      [[-5, -50], [4, -46], [-3, -40], [5, -38], [-6, -34]].forEach(([x, y]) => traco([[x, y], [x + 3, y + 1.5]], LW * .8, W.ma3));
      blob([[-18, -58], [-12, -62], [-10, -38], [-14, -28], [-20, -42]], W.ma2);
      blob([[18, -58], [12, -62], [10, -38], [14, -28], [20, -42]], W.ma2);
      pintas([[-15, -50, 1.4], [-14, -42, 1.2], [15, -50, 1.4], [14, -42, 1.2]]);
      com(() => {
        X.translate(0, -76); X.rotate(gira * 1.3); X.translate(0, 76);
        el(0, -76, 17, 15, W.ma);
        pintas([[-10, -86, 1.7], [-3, -89, 1.5], [5, -88, 1.7], [11, -83, 1.4], [-13, -79, 1.3], [13, -76, 1.2]]);
        el(0, -73, 13, 10, W.ma3, 0, 0);
        olhos(-6.5, 6.5, -74, 5.6, { pena: W.ma3 });
        /* as sobrancelhas brancas, de vigia */
        traco([[-13, -83], [-3, -80]], LW * 1.2, W.br); traco([[3, -80], [13, -83]], LW * 1.2, W.br);
        poli([[-2.6, -69], [2.6, -69], [0, -63]], W.bico, LW * .7);
      });
      return;
    }
    /* 4 · o Oráculo do Campo: as asas abertas na noite, os olhos acesos, a lua em cima */
    aura(-56, 70, ['rgba(118,91,167,.5)', 'rgba(118,91,167,.2)', 'rgba(118,91,167,0)']);
    sombra(26, 5);
    const bat = Math.sin(t * 2) * .06;
    [-1, 1].forEach(s => com(() => {
      X.translate(s * 12, -56); X.rotate(s * bat); X.scale(s, 1);
      poli([[0, -8], [22, -22], [44, -22], [50, -12], [42, -10], [46, -2], [36, 0], [38, 8], [26, 6], [24, 14], [10, 10], [0, 12]], W.ma2);
      poli([[4, -4], [22, -14], [38, -14], [30, -6], [20, -2], [18, 6], [6, 6]], W.ma, 0);
      pintas([[20, -10, 1.6], [30, -10, 1.4], [14, -2, 1.4]]);
    }));
    osso([[-6, -26], [-7, -2]], 2.2, W.pe); osso([[6, -26], [7, -2]], 2.2, W.pe);
    el(0, -44, 17, 22, W.ma);
    el(0, -39, 11, 15, W.cr, 0, 0);
    [[-5, -44], [4, -40], [-3, -34], [5, -32]].forEach(([x, y]) => traco([[x, y], [x + 3, y + 1.5]], LW * .8, W.ma3));
    el(0, -72, 17, 15, W.ma);
    pintas([[-10, -82, 1.7], [-3, -85, 1.5], [5, -84, 1.7], [11, -79, 1.4]]);
    el(0, -69, 13, 10, W.ma3, 0, 0);
    olhos(-6.5, 6.5, -70, 5.8, { pena: W.ma3, brilho: true, iris: '#FFE08A' });
    traco([[-13, -79], [-3, -76]], LW * 1.2, W.br); traco([[3, -76], [13, -79]], LW * 1.2, W.br);
    poli([[-2.6, -65], [2.6, -65], [0, -59]], W.bico, LW * .7);
    /* a lua crescente e as estrelas */
    com(() => { caminho(); X.arc(0, -104, 9, 0, TAU); X.arc(4, -107, 8, 0, TAU, true); X.fillStyle = '#FFE08A'; X.fill('evenodd'); });
    brilhos(t, [[-42, -92, 5, .2], [44, -86, 5.5, 1], [-38, -24, 4, 2.2], [40, -26, 4, .7], [20, -110, 3.4, 1.6]], '#FFE800');
  }

  const ARTE = { gralha, guara, coruja };
  /* desenha(ctx, espécie, etapa (0 = ovo), x, y (o chão), escala, F, prog (do ovo)) */
  function desenha(ctx, esp, etapa, x, y, s, F, prog){
    if(!ctx || !(ARTE[esp] || (etapa <= 0 && OVO[esp]))) return;
    F = Object.assign({ t: 0, humor: 'normal', pulo: 0 }, F || {});
    const prev = X; X = ctx;
    ctx.save();
    ctx.translate(x, y);
    const pu = Math.max(0, Math.min(1, F.pulo || 0)), dy = -Math.sin(pu * Math.PI) * 16;
    /* respirando (e o pulo de alegria) */
    const resp = F.humor === 'sono' ? Math.sin(F.t * 1.3) * .025 : Math.sin(F.t * 2.4) * .018;
    ctx.translate(0, dy * s);
    ctx.scale(s, s * (1 + resp));
    LW = 3;
    try{ if(etapa <= 0) ovo(esp, F, prog); else ARTE[esp](Math.min(4, etapa), F); }
    finally{ ctx.restore(); X = prev; }
    if(F.humor === 'sono' && etapa > 0){ X = ctx; ctx.save(); ctx.translate(x, y); ctx.scale(s, s); zzz(16, ALT[Math.min(4, etapa)] * -1 + 6, F.t); ctx.restore(); X = prev; }
  }
  /* a altura de cada forma no quadro (pra caber na moldura e pros zzz) */
  const ALT = [56, 62, 74, 94, 116];
  /* e a largura (a cauda, as asas): pra ninguém sair da moldura e o pequeno não ficar miúdo */
  const LARG = [50, 62, 84, 104, 124];

  /* o mesmo desenho em pixel (a cidade): desenha pequeno, e o que é meio transparente vira cheio ou vazio. alt é a altura
     do bicho em pontos da cidade (o boneco tem uns 31); a tela é quadrada, com folga pras asas */
  const PIX = new Map();
  function pixel(esp, etapa, quadro, lado, alt){
    alt = alt || 26; etapa = Math.max(0, Math.min(4, etapa));
    const k = `${esp}:${etapa}:${quadro}:${lado}:${alt}`; if(PIX.has(k)) return PIX.get(k);
    const N = Math.round(alt * 1.2) + 2, cv = document.createElement('canvas'); cv.width = N; cv.height = N;
    const c = cv.getContext('2d'), s = alt / (ALT[etapa] + 4);
    if(lado < 0){ c.translate(N, 0); c.scale(-1, 1); }
    desenha(c, esp, etapa, N / 2, N - 1, s, { t: quadro * .5, humor: 'normal' });
    try{
      const d = c.getImageData(0, 0, N, N), a = d.data;
      for(let i = 3; i < a.length; i += 4){ if(a[i] < 110) a[i] = 0; else { a[i] = 255; } }
      c.setTransform(1, 0, 0, 1, 0, 0); c.putImageData(d, 0, 0);
    }catch(e){}
    if(PIX.size > 80) PIX.delete(PIX.keys().next().value);
    PIX.set(k, cv); return cv;
  }

  /* a silhueta (o que ainda não veio na linha de evolução, e o pisca-pisca da evolução): desenha numa tela à parte e
     pinta tudo de uma cor só */
  const OFF = document.createElement('canvas');
  function silhueta(ctx, esp, etapa, x, y, s, F, cor){
    const W = ctx.canvas.width, H = ctx.canvas.height; if(OFF.width !== W) OFF.width = W; if(OFF.height !== H) OFF.height = H;
    const o = OFF.getContext('2d'); o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, W, H); o.setTransform(ctx.getTransform());
    SEMFX = true; try{ desenha(o, esp, etapa, x, y, s, F); } finally { SEMFX = false; }
    o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = 'source-in'; o.fillStyle = cor; o.fillRect(0, 0, W, H); o.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(OFF, 0, 0); ctx.restore();
  }

  C.bichoArte = { desenha, pixel, silhueta, ALT };

  /* ---------- as espécies, as formas e os poderes ---------- */
  const ESP = {
    gralha: { nome: 'Gralha-azul', ovo: 'Ovo azul de pinhão', de: 'do Paraná', frase: 'Planta hoje pra colher amanhã. Boa pra quem organiza a semana.',
      formas: ['Ovo', 'Pinhãozinho', 'Gralhinha', 'Gralha Braba', 'Imperatriz Araucária'],
      golpes: { farejar: 'Olho de Gralha', memoria: 'Memória de Pinhão', passeio: 'Voo Rasante', foco: 'Bico Certeiro', escudo: 'Asa de Escudo', brilho: 'Penas de Ouro', lenda: 'Coroa de Araucária' } },
    guara: { nome: 'Lobo-guará', ovo: 'Ovo de brasa', de: 'do cerrado', frase: 'Corre longe atrás do que quer. Bom pra quem caça cliente.',
      formas: ['Ovo', 'Brasinha', 'Guarazinho', 'Guará Corredor', 'Guará Lua Cheia'],
      golpes: { farejar: 'Faro de Guará', memoria: 'Trilha no Cerrado', passeio: 'Corrida Longa', foco: 'Caçada', escudo: 'Couro Grosso', brilho: 'Brasa Viva', lenda: 'Uivo da Lua Cheia' } },
    coruja: { nome: 'Coruja-buraqueira', ovo: 'Ovo pintado do campo', de: 'dos campos de Londrina', frase: 'Não esquece nada. Boa pra quem tem mil coisas na cabeça.',
      formas: ['Ovo', 'Pipoquinha', 'Buraqueira', 'Coruja Vigia', 'Oráculo do Campo'],
      golpes: { farejar: 'Olhar de Coruja', memoria: 'Memória da Noite', passeio: 'Voo Baixo', foco: 'Olho Fixo', escudo: 'Toca Segura', brilho: 'Olhos de Ouro', lenda: 'Oráculo' } }
  };
  const ORDEM = ['gralha', 'guara', 'coruja'];
  /* os marcos (as mesmas contas do banco, corre_bicho_etapa): onde ele evolui e onde aprende cada poder */
  const MARCOS = [
    { xp: 300, etapa: 1, poder: 'farejar' }, { xp: 1000, poder: 'memoria' }, { xp: 1500, etapa: 2, poder: 'passeio' },
    { xp: 3000, poder: 'foco' }, { xp: 5000, etapa: 3, poder: 'escudo' }, { xp: 10000, poder: 'brilho' }, { xp: 15000, etapa: 4, poder: 'lenda' }
  ];
  const CHOCA = MARCOS[0].xp;
  /* os números grandes com o ponto do milhar: 1.500, 15.000 */
  const mil = n => Math.round(Number(n) || 0).toLocaleString('pt-BR');
  const PODER = {
    farejar: { ico: 'eye', nome: 'Farejar', txt: 'Aponta a tarefa da vez no alto do Hoje.' },
    memoria: { ico: 'cal', nome: 'Memória', txt: 'O mapa do ano: cada dia que você fechou tarefa fica pintado.' },
    passeio: { ico: 'pin', nome: 'Passeio', txt: 'Anda contigo no Correverso, e quem passa vê.' },
    foco: { ico: 'clock', nome: 'Foco', txt: 'O modo foco: 25 minutos só com uma tarefa, e ele te faz companhia.' },
    escudo: { ico: 'escudo', nome: 'Escudo', txt: 'Um dia sem trampo por semana não quebra a sequência (a placa da tua casa).' },
    brilho: { ico: 'magia', nome: 'Brilho', txt: 'Brilha no Caderninho e na cidade.' },
    lenda: { ico: 'star', nome: 'Forma lendária', txt: 'A última forma, e dois escudos por semana.' }
  };
  const etapaDe = xp => xp >= 15000 ? 4 : xp >= 5000 ? 3 : xp >= 1500 ? 2 : xp >= CHOCA ? 1 : 0;
  const temPoder = (xp, k) => { const m = MARCOS.find(x => x.poder === k); return !!m && xp >= m.xp; };
  const proxMarco = xp => MARCOS.find(m => m.xp > xp) || null;
  const golpe = (esp, k) => (ESP[esp] && ESP[esp].golpes[k]) || (PODER[k] && PODER[k].nome) || k;
  const formaNome = (esp, e) => (ESP[esp] || ESP.gralha).formas[Math.max(0, Math.min(4, e))];
  /* o artigo da forma: "a Gralhinha", "o Brasinha" (o ovo é "o") */
  const FEM = ['Pinhãozinho', 'Gralhinha', 'Gralha Braba', 'Imperatriz Araucária', 'Pipoquinha', 'Buraqueira', 'Coruja Vigia'];
  const art = n => FEM.includes(n) ? 'a' : 'o';

  /* ---------- o meu bicho (delta-v430.sql) ---------- */
  const B = { uid: '', me: null, ok: false, off: false, ind: null, em: 0, pulo: 0, festa: 0 };
  const semFuncao = e => !!e && (e.code === 'PGRST202' || e.code === '42883' || /corre_bicho/.test(String(e.message || '')));
  async function carrega(forca){
    const u = (C.uid && C.uid()) || ''; if(B.uid !== u) Object.assign(B, { uid: u, me: null, ok: false, em: 0 });
    if(!u || B.off) return B.me;
    if(B.ind) return B.ind;
    if(!forca && B.ok && Date.now() - B.em < 6e4) return B.me;
    return (B.ind = (async () => {
      try{ const r = await C.api.rpc('corre_bicho_meu', {}); if(B.uid !== u) return null; B.me = r && r.tem ? r : null; B.ok = true; B.em = Date.now(); }
      catch(e){ if(semFuncao(e)){ B.off = true; B.ok = true; } }
      repintaCapa();
      return B.me;
    })().finally(() => { B.ind = null; }));
  }
  const etapa = () => B.me ? etapaDe(Number(B.me.xp) || 0) : -1;
  const tem = k => !!B.me && temPoder(Number(B.me.xp) || 0, k);
  const nome = () => B.me ? (B.me.apelido || formaNome(B.me.especie, etapa())) : '';

  /* o humor: dormindo de noite; com saudade de tarde sem nenhuma tarefa no dia; feliz (pula de vez em quando) quando já
     teve tarefa hoje */
  function humor(){
    const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false }).format(new Date())) % 24;
    if(h >= 23 || h < 6) return 'sono';
    if(B.me && !Number(B.me.hoje) && h >= 15) return 'saudade';
    return 'normal';
  }

  /* ---------- o desenho vivo (cada canvas[data-bx] na tela se mexe; o que tem data-parado é desenhado uma vez) ---------- */
  const VIVOS = new Set(); let raf = 0; const T0 = performance.now();
  const calmo = () => { try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } };
  function liga(raiz){
    (raiz || document).querySelectorAll('canvas[data-bx]').forEach(cv => VIVOS.add(cv));
    if(!raf && VIVOS.size) raf = requestAnimationFrame(quadro);
  }
  function quadro(now){
    raf = 0; const t = (now - T0) / 1000;
    VIVOS.forEach(cv => {
      if(!cv.isConnected){ VIVOS.delete(cv); return; }
      pintaCv(cv, cv.dataset.parado || calmo() ? 1.2 : t, now);
      if(cv.dataset.parado || calmo()) VIVOS.delete(cv);
    });
    if(VIVOS.size) raf = requestAnimationFrame(quadro);
  }
  function pintaCv(cv, t, now){
    const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth || 80, h = cv.clientHeight || 80;
    const W = Math.round(w * dpr), H = Math.round(h * dpr);
    if(cv.width !== W) cv.width = W; if(cv.height !== H) cv.height = H;
    const c = cv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H); c.scale(dpr, dpr);
    const esp = cv.dataset.esp || 'surpresa', e = Math.max(0, Math.min(4, Number(cv.dataset.etapa) || 0));
    const s = Math.min((h - 6) / (ALT[e] + 10), (w - 4) / LARG[e]);
    let hu = cv.dataset.humor || (cv.dataset.meu ? humor() : 'normal'), pulo = 0;
    if(cv.dataset.meu){
      /* tarefa feita agora: três pulos de alegria; tarefa feita hoje: um pulinho de vez em quando */
      const dt = now - B.pulo;
      if(B.pulo && dt < 1800){ pulo = (dt % 600) / 600; hu = 'feliz'; }
      else if(B.me && Number(B.me.hoje) > 0 && hu === 'normal'){ const k = t % 6; if(k < .55){ pulo = k / .55 * .6; hu = 'feliz'; } }
    }
    const F = { t: t + (Number(cv.dataset.fase) || 0), humor: hu, pulo };
    if(cv.dataset.sil) silhueta(c, esp, e, w / 2, h - 3, s, F, cv.dataset.sil === '1' ? '#2A2630' : cv.dataset.sil);
    else desenha(c, esp, e, w / 2, h - 3, s, F, Number(cv.dataset.prog) || 0);
  }
  const cvHTML = (o, cls) => `<canvas class="bx-cv${cls ? ' ' + cls : ''}" data-bx${Object.keys(o).map(k => ` data-${k}="${esc(String(o[k]))}"`).join('')} aria-hidden="true"></canvas>`;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

  /* ---------- na capa do Caderninho ---------- */
  function faltaTxt(xp){
    const m = proxMarco(xp); if(!m) return 'na forma final';
    const n = m.xp - xp, tt = n === 1 ? '1 tarefa' : `${mil(n)} tarefas`;
    if(m.etapa === 1) return `${tt} pra chocar`;
    if(m.etapa) return `${tt} pra evoluir`;
    return `${tt} pro ${PODER[m.poder].nome}`;
  }
  function barra(xp){
    const m = proxMarco(xp); if(!m) return 100;
    const ant = [...MARCOS].reverse().find(x => x.xp <= xp), base = ant ? ant.xp : 0;
    return Math.round(100 * (xp - base) / (m.xp - base));
  }
  function capaInner(){
    if(B.off || !B.ok) return '';
    if(!B.me) return `<button type="button" class="bx-capa bx-novo" data-act="bx-escolhe">${cvHTML({ esp: 'surpresa', etapa: 0, prog: .25 })}<span class="bx-tx"><b>Um ovo apareceu</b><small>Toca pra escolher teu bicho</small></span></button>`;
    const xp = Number(B.me.xp) || 0, e = etapaDe(xp), n = nome();
    return `<button type="button" class="bx-capa bx-e${e}${temPoder(xp, 'brilho') ? ' bx-brilho' : ''}" data-act="bx-abre" aria-label="${esc(`O teu bicho: ${n}. ${mil(xp)} tarefas; ${faltaTxt(xp)}.`)}">
      ${cvHTML({ esp: B.me.especie, etapa: e, prog: e ? 0 : xp / CHOCA, meu: 1 })}
      <span class="bx-tx"><b>${esc(n)}</b><small>${esc(faltaTxt(xp))}</small><i class="bx-barra" aria-hidden="true"><b style="width:${barra(xp)}%"></b></i></span></button>`;
  }
  /* o lugar do bicho na capa: vazio até o banco responder (aí ele se preenche sozinho) */
  const capaHTML = () => `<div class="bx-capa-w" id="bx-capa-w">${capaInner()}</div>`;
  function repintaCapa(){ const w = document.getElementById('bx-capa-w'); if(!w) return; w.innerHTML = capaInner(); liga(w); }

  /* ---------- escolher o ovo ---------- */
  function escolhe(){
    if(B.off){ C.toast('O bicho do Caderninho chega quando o banco do Corre atualizar.'); return; }
    C.sheet(`<div class="bx-f bx-esc"><h2 class="bx-h">Um ovo apareceu no teu Caderninho</h2>
      <p class="bx-intro">Cada tarefa que você fechar alimenta ele. É bicho pra vida toda: choca com 300 tarefas, evolui com 1.500 e 5.000 e vira lenda com 15.000. No caminho, aprende poderes que mudam o teu Caderninho. Escolhe um:</p>
      <div class="bx-ovos" role="radiogroup" aria-label="Os ovos">${ORDEM.map(k => { const sp = ESP[k]; return `<button type="button" role="radio" aria-checked="false" class="bx-ovo" data-act="bx-pega" data-k="${k}">
        ${cvHTML({ esp: k, etapa: 0, prog: .15, fase: ORDEM.indexOf(k) * .9 })}<b>${esc(sp.ovo)}</b><small>${esc(sp.nome)} ${esc(sp.de)}</small><span>${esc(sp.frase)}</span></button>`; }).join('')}</div>
      <p class="fine">Bicho daqui, desenho nosso. Escolheu, é teu: não troca.</p>
      <div class="acts"><button type="button" class="btn pri" data-act="bx-choca" disabled>Chocar esse ovo</button><button type="button" class="btn ghost" data-close>Depois</button></div></div>`, 'bx-folha');
    liga(document.getElementById('sheet'));
  }
  async function choca(k){
    if(!ESP[k]) return;
    let r; try{ r = await C.api.rpc('corre_bicho_escolhe', { p_especie: k }); }
    catch(e){ if(semFuncao(e)){ B.off = true; C.toast('O bicho do Caderninho chega quando o banco do Corre atualizar.'); return; } C.toast(C.errMsg ? C.errMsg(e) : 'Não deu agora.'); return; }
    if(!r || !r.tem){ C.toast('Não deu pra chocar agora.'); return; }
    B.me = r; B.ok = true; B.em = Date.now();
    C.closeSheet(); repintaCapa();
    const xp = Number(r.xp) || 0;
    /* quem já fechava tarefa: o ovo choca na hora (e aprende o que já dava) */
    if(xp >= CHOCA) celebra(0, xp);
    else C.toast(`O ${ESP[k].ovo.toLowerCase()} é teu. ${xp ? `As ${mil(xp)} tarefas que você já fez contam. ` : ''}Fecha ${CHOCA - xp === 1 ? 'mais 1 tarefa' : `mais ${mil(CHOCA - xp)} tarefas`} e ele choca.`, 5200);
  }

  /* ---------- a folha do bicho ---------- */
  function folha(){
    if(!B.me){ escolhe(); return; }
    const me = B.me, xp = Number(me.xp) || 0, e = etapaDe(xp), sp = ESP[me.especie] || ESP.gralha, n = nome();
    const proxE = MARCOS.filter(m => m.etapa);
    C.sheet(`<div class="bx-f">
      <div class="bx-f-top">${cvHTML({ esp: me.especie, etapa: e, prog: e ? 0 : xp / CHOCA, meu: 1 }, 'bx-grande')}
        <div class="bx-f-id"><p class="bx-f-k">${esc(sp.nome)} · ${e ? `forma ${e} de 4` : 'ainda no ovo'}</p>
          <h2 class="bx-h" id="bx-nome">${esc(n)}</h2>
          ${me.apelido ? `<p class="bx-f-forma">É ${art(formaNome(me.especie, e))} ${esc(formaNome(me.especie, e))}.</p>` : ''}
          <button type="button" class="lnk bx-ap" data-act="bx-apelido">${me.apelido ? 'Mudar o apelido' : 'Dar um apelido'}</button>
          <p class="bx-f-xp"><b class="num">${mil(xp)}</b> ${xp === 1 ? 'tarefa' : 'tarefas'} no bucho · <b class="num">${mil(me.hoje)}</b> hoje</p>
          <i class="bx-barra" aria-hidden="true"><b style="width:${barra(xp)}%"></b></i><p class="bx-f-falta">${esc(faltaTxt(xp)).replace(/^./, c => c.toUpperCase())}</p></div></div>
      <h3 class="bx-sh">A linha</h3>
      <ol class="bx-linha">${[0, 1, 2, 3, 4].map(k => { const ja = k <= e, m = proxE.find(x => x.etapa === k); return `<li class="${ja ? 'ja' : ''}${k === e ? ' aqui' : ''}">${cvHTML(Object.assign({ esp: me.especie, etapa: k, parado: 1 }, ja ? {} : { sil: 1 }))}<b>${ja ? esc(formaNome(me.especie, k)) : '???'}</b><small>${k === 0 ? 'o começo' : `${mil(m.xp)} tarefas`}</small></li>`; }).join('')}</ol>
      <h3 class="bx-sh">Os poderes</h3>
      <ul class="bx-poderes">${MARCOS.map(m => { const ja = xp >= m.xp, P = PODER[m.poder]; return `<li class="${ja ? 'ja' : ''}"><i>${C.ico(ja ? P.ico : 'lock')}</i><span><b>${esc(golpe(me.especie, m.poder))}</b> <small>${esc(P.nome)}</small><br>${esc(P.txt)}</span><em>${ja ? 'aprendeu' : `com ${mil(m.xp)}`}</em></li>`; }).join('')}</ul>
      <div class="bx-seq" id="bx-seq" aria-live="polite"></div>
      <div class="bx-mem" id="bx-mem">${temPoder(xp, 'memoria') ? '<p class="fine">Lendo o teu ano…</p>' : ''}</div>
      <div class="acts"><button type="button" class="btn" data-close>Fechar</button><button type="button" class="btn ghost bx-som" data-act="bx-som" aria-pressed="${somOn()}">${C.ico(somOn() ? 'som' : 'mudo')} Som ${somOn() ? 'ligado' : 'desligado'}</button></div>
    </div>`, 'bx-folha');
    liga(document.getElementById('sheet'));
    /* a sequência de trampo e o escudo; o mapa do ano */
    if(C.trampo && C.trampo.meu) C.trampo.meu().then(t => {
      const el = document.getElementById('bx-seq'); if(!el || !t) return;
      const seq = Number(t.seq) || 0, esc2 = Number(t.escudos) || 0;
      el.innerHTML = `<p>${C.ico('fogo')}<span><b class="num">${seq}</b> ${seq === 1 ? 'dia' : 'dias'} seguidos de trampo${t.protegida ? ' · <b>protegida pelo escudo</b>: um trampo hoje e ela segue' : ''}${temPoder(xp, 'escudo') ? ` · ${esc2 ? `${esc2 === 1 ? 'escudo pronto' : `${esc2} escudos prontos`}` : 'escudo usado nesta semana'}` : ''}</span></p>`;
    });
    if(temPoder(xp, 'memoria')) memoria(document.getElementById('bx-mem'));
  }

  /* o mapa do ano (o poder Memória): 26 semanas, um quadradinho por dia, mais forte quanto mais tarefa */
  async function memoria(el){
    if(!el) return;
    let d = {}; try{ d = (await C.api.rpc('corre_bicho_dias', { p_dias: 182 })) || {}; }catch(e){ el.innerHTML = ''; return; }
    if(!el.isConnected) return;
    const hj = C.hojeBR(), base = new Date(hj + 'T12:00:00Z'), dow = (base.getUTCDay() + 6) % 7;
    const ini = new Date(base); ini.setUTCDate(ini.getUTCDate() - dow - 25 * 7);
    const cor = n => !n ? '' : n >= 7 ? ' n4' : n >= 4 ? ' n3' : n >= 2 ? ' n2' : ' n1';
    let cel = '', dias = 0, total = 0, melhor = ['', 0];
    for(let i = 0; i < 26 * 7; i++){
      const x = new Date(ini); x.setUTCDate(ini.getUTCDate() + i); const iso = x.toISOString().slice(0, 10);
      if(iso > hj){ cel += '<i class="fora"></i>'; continue; }
      const n = Number(d[iso]) || 0; if(n){ dias++; total += n; if(n > melhor[1]) melhor = [iso, n]; }
      cel += `<i class="${cor(n).trim()}" title="${iso.slice(8, 10)}/${iso.slice(5, 7)}: ${n ? `${n} ${n === 1 ? 'tarefa' : 'tarefas'}` : 'nada'}"></i>`;
    }
    el.innerHTML = `<h3 class="bx-sh">${C.ico('cal')} ${esc(golpe(B.me.especie, 'memoria'))}</h3>
      <div class="bx-ano" role="img" aria-label="${esc(`Nas últimas 26 semanas: ${dias} dias com tarefa feita, ${total} tarefas.`)}">${cel}</div>
      <p class="fine">${dias ? `${dias} ${dias === 1 ? 'dia' : 'dias'} com tarefa feita nas últimas 26 semanas${melhor[1] > 1 ? `; o dia mais cheio foi ${melhor[0].slice(8, 10)}/${melhor[0].slice(5, 7)}, com ${melhor[1]}` : ''}.` : 'Ainda em branco: cada dia com tarefa feita ganha cor.'}</p>`;
  }

  /* ---------- a evolução (e o ovo chocando, e o poder novo) ---------- */
  const SOM_K = 'corre-bicho-som';
  const somOn = () => { try{ return localStorage.getItem(SOM_K) !== '0'; }catch(e){ return true; } };
  let AC = null;
  function nota(f, ini, dur, tipo, vol){
    if(!AC) return;
    const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime + ini;
    o.type = tipo || 'triangle'; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol || .12, t + .015); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
    o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + dur + .05);
  }
  function som(k){
    if(!somOn()) return;
    try{ AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if(AC.state === 'suspended') AC.resume(); }catch(e){ return; }
    const N = m => 440 * Math.pow(2, (m - 69) / 12);
    if(k === 'pio'){ nota(N(84), 0, .09, 'sine', .08); nota(N(88), .07, .12, 'sine', .07); }
    else if(k === 'sobe'){ for(let i = 0; i < 14; i++) nota(N(60 + i * 2), i * .2, .18, 'square', .035); }
    else if(k === 'revela'){ [72, 76, 79, 84].forEach((m, i) => nota(N(m), i * .09, .5, 'triangle', .11)); nota(N(48), 0, .9, 'triangle', .1); nota(N(91), .38, .6, 'sine', .05); }
    else if(k === 'poder'){ nota(N(79), 0, .2, 'triangle', .1); nota(N(86), .12, .45, 'triangle', .1); }
    else if(k === 'trinca'){ nota(N(96), 0, .05, 'square', .04); }
  }

  let EVO = null;
  /* de, para: as formas; xpAntes/xpAgora: pra saber os poderes que vieram no caminho */
  function celebra(xpAntes, xpAgora){
    if(!B.me) return;
    const de = etapaDe(xpAntes), para = etapaDe(xpAgora), poderes = MARCOS.filter(m => m.xp > xpAntes && m.xp <= xpAgora).map(m => m.poder);
    if(!poderes.length && de === para) return;
    if(EVO) EVO.fecha(true);
    const esp = B.me.especie, nomeAntes = B.me.apelido || formaNome(esp, de), nomeDepois = B.me.apelido || formaNome(esp, para);
    const muda = para !== de, choca = de === 0 && para > 0;
    const box = document.createElement('div'); box.className = 'bx-evo'; box.id = 'bx-evo';
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'bx-evo-t');
    box.innerHTML = `<div class="bx-evo-raios" aria-hidden="true"></div><canvas class="bx-evo-cv" aria-hidden="true"></canvas>
      <p class="bx-evo-t" id="bx-evo-t" aria-live="assertive"></p><div class="bx-evo-p"></div>
      <button type="button" class="btn pri bx-evo-ok" hidden>Boa!</button>`;
    document.body.appendChild(box);
    const cv = box.querySelector('canvas'), tx = box.querySelector('.bx-evo-t'), pp = box.querySelector('.bx-evo-p'), ok = box.querySelector('.bx-evo-ok');
    const foco = document.activeElement;
    const DUR = !muda ? 0 : calmo() ? 0 : choca ? 2.6 : 4.4;
    let t0 = performance.now(), fim = false, rf = 0, somFoi = { sobe: false, revela: false }, trincas = 0;
    tx.textContent = !muda ? `${nomeDepois} aprendeu ${poderes.length === 1 ? 'um poder novo' : 'poderes novos'}!` : choca ? 'O ovo tá chocando…' : `Opa… ${art(nomeAntes)} ${nomeAntes} tá mudando!`;
    const revela = () => {
      if(fim) return; fim = true;
      box.classList.add('pronto');
      tx.textContent = !muda ? tx.textContent : choca ? `Chocou! É ${art(formaNome(esp, para))} ${formaNome(esp, para)}.` : `${art(nomeAntes).toUpperCase()} ${nomeAntes} virou ${formaNome(esp, para)}!`;
      pp.innerHTML = poderes.map(k => `<p><i>${C.ico(PODER[k].ico)}</i><span><b>Aprendeu ${esc(golpe(esp, k))}</b> <small>${esc(PODER[k].nome)}</small><br>${esc(PODER[k].txt)}</span></p>`).join('');
      ok.hidden = false; ok.focus();
      if(!somFoi.revela){ somFoi.revela = true; som(muda ? 'revela' : 'poder'); }
      if(navigator.vibrate) try{ navigator.vibrate([20, 50, 20, 50, 40]); }catch(e){}
      B.pulo = performance.now();
    };
    const desenhaEvo = now => {
      rf = 0; if(!box.isConnected) return;
      const T = (now - t0) / 1000, dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth || 260, h = cv.clientHeight || 260;
      if(cv.width !== Math.round(w * dpr)){ cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      const c = cv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height); c.scale(dpr, dpr);
      const sz = e2 => Math.min((h - 16) / (ALT[e2] + 10), (w - 10) / LARG[e2]);
      if(!fim && T >= DUR){ if(muda) box.classList.add('clarao'); revela(); }
      if(!fim){
        if(choca){
          const p = .55 + .45 * Math.min(1, T / DUR), tr = Math.floor(p * 10);
          if(tr > trincas){ trincas = tr; som('trinca'); }
          desenha(c, esp, 0, w / 2, h - 8, sz(0), { t: T * 2.6 }, p);
        } else if(T < 1){ desenha(c, esp, de, w / 2, h - 8, sz(de), { t: T }); }
        else {
          if(!somFoi.sobe){ somFoi.sobe = true; som('sobe'); }
          /* o pisca-pisca: a forma de antes e a de depois em branco, cada vez mais rápido */
          const u = (T - 1) / (DUR - 1), fase = Math.sin((T - 1) * (4 + u * u * 34));
          const e2 = fase > 0 ? de : para;
          silhueta(c, esp, e2, w / 2, h - 8, sz(e2), { t: T }, '#FFFFFF');
        }
      } else {
        desenha(c, esp, para, w / 2, h - 8, sz(para), { t: T, humor: (T % 2.4) < .6 ? 'feliz' : 'normal', pulo: (T % 2.4) < .6 ? (T % 2.4) / .6 : 0 }, 0);
      }
      rf = requestAnimationFrame(desenhaEvo);
    };
    const fecha = sem => {
      cancelAnimationFrame(rf); box.remove(); document.removeEventListener('keydown', tecla, true); EVO = null;
      repintaCapa(); if(!sem && foco && foco.isConnected) try{ foco.focus(); }catch(e){}
    };
    const tecla = ev => { if(ev.key === 'Escape' || (fim && (ev.key === 'Enter' || ev.key === ' '))){ ev.preventDefault(); ev.stopPropagation(); if(fim) fecha(); } };
    document.addEventListener('keydown', tecla, true);
    box.addEventListener('click', ev => { if(fim && (ev.target === ok || ev.target === box)) fecha(); });
    ok.addEventListener('click', () => fecha());
    EVO = { fecha, box };
    if(!DUR) revela();
    rf = requestAnimationFrame(desenhaEvo);
  }

  /* a tarefa feita (o trampo da 4.29 conferiu e devolveu o bicho): pulo de alegria e, se cruzou um marco, a festa */
  function ganhou(r){
    if(!r || r.bicho == null || !B.me) return;
    const antes = Number(B.me.xp) || 0, agora = Number(r.bicho) || 0;
    B.me.xp = agora; B.me.etapa = etapaDe(agora); if(agora > antes) B.me.hoje = (Number(B.me.hoje) || 0) + 1;
    B.pulo = performance.now();
    if(Number(r.escudo) > 0) C.toast(`${golpe(B.me.especie, 'escudo')}: ${art(nome())} ${nome()} cobriu ${Number(r.escudo) === 1 ? 'o dia' : 'os dias'} sem trampo. A sequência segue: ${r.seq} dias.`, 5200);
    repintaCapa();
    if(agora > antes) celebra(antes, agora);
  }

  /* ---------- o Correverso: quem tem o Passeio leva o bicho junto (as espécies e as formas de todo mundo) ---------- */
  let CID = null;
  async function cidade(){
    if(B.off) return {};
    try{ CID = (await C.api.rpc('corre_bichos_cidade', {})) || {}; }catch(e){ if(semFuncao(e)) B.off = true; CID = {}; }
    return CID;
  }
  const passeio = () => B.me && tem('passeio') ? [B.me.especie, etapa()] : null;

  Object.assign(C.acts, {
    'bx-abre': () => { B.pulo = performance.now(); som('pio'); folha(); },
    'bx-escolhe': () => escolhe(),
    'bx-pega': el => {
      document.querySelectorAll('.bx-ovo').forEach(b => b.setAttribute('aria-checked', b === el ? 'true' : 'false'));
      const ok = document.querySelector('[data-act="bx-choca"]'); if(ok){ ok.disabled = false; ok.dataset.k = el.dataset.k; ok.textContent = `Chocar o ${ESP[el.dataset.k].ovo.toLowerCase()}`; }
    },
    'bx-choca': el => choca(el.dataset.k),
    'bx-apelido': el => {
      const h = document.getElementById('bx-nome'); if(!h || !B.me) return;
      h.outerHTML = `<form class="bx-ap-f" id="bx-ap-f"><label class="sr-only" for="bx-ap-i">Apelido</label><input id="bx-ap-i" maxlength="20" value="${esc(B.me.apelido || '')}" placeholder="${esc(formaNome(B.me.especie, etapa()))}" autocomplete="off"><button type="submit" class="btn sm pri">Salvar</button></form>`;
      el.hidden = true;
      const f = document.getElementById('bx-ap-f'), i = document.getElementById('bx-ap-i'); i.focus(); i.select();
      f.addEventListener('submit', async ev => {
        ev.preventDefault();
        try{ const r = await C.api.rpc('corre_bicho_apelido', { p_nome: i.value }); if(r && r.tem) B.me = r; }catch(e){ C.toast(C.errMsg ? C.errMsg(e) : 'Não deu agora.'); return; }
        repintaCapa(); folha();
      });
    },
    'bx-som': () => { try{ localStorage.setItem(SOM_K, somOn() ? '0' : '1'); }catch(e){} const b = document.querySelector('.bx-som'); if(b){ b.setAttribute('aria-pressed', somOn()); b.innerHTML = `${C.ico(somOn() ? 'som' : 'mudo')} Som ${somOn() ? 'ligado' : 'desligado'}`; } som('pio'); }
  });

  C.bicho = { carrega, me: () => B.me, off: () => B.off, ok: () => B.ok, tem, nome, etapa, capaHTML, repintaCapa, liga, folha, escolhe, ganhou, celebra,
    cidade, passeio, golpe, humor, cvHTML, ESP, PODER, MARCOS, etapaDe };
})();
