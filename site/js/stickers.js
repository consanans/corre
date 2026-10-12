/* CORRE · adesivos originais (die-cut branco, holográfico, cromado, retícula) e o céu de nuvens.
   Tudo desenhado aqui, sem imagem de terceiros. */
(function(){
  'use strict';
  const INK = '#0F1218';
  /* gradientes compartilhados vão num <svg> escondido (index.html: #defs) */
  const DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <linearGradient id="g-holo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FF9BE3"/><stop offset=".28" stop-color="#9FF2FF"/><stop offset=".55" stop-color="#E4FF8A"/><stop offset=".8" stop-color="#C6A6FF"/><stop offset="1" stop-color="#FF9BE3"/>
    </linearGradient>
    <linearGradient id="g-chrome" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/><stop offset=".45" stop-color="#C9D3DE"/><stop offset=".55" stop-color="#8E9CAD"/><stop offset="1" stop-color="#F2F6FA"/>
    </linearGradient>
    <linearGradient id="g-sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF36B"/><stop offset="1" stop-color="#FFB627"/></linearGradient>
    <linearGradient id="g-pink" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF7CC4"/><stop offset="1" stop-color="#FF3D8E"/></linearGradient>
    <linearGradient id="g-lime" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFEA8A"/><stop offset="1" stop-color="#FFB627"/></linearGradient>
    <pattern id="p-dots" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.6" fill="#000" opacity=".18"/></pattern>
    <pattern id="p-dotsw" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.5" fill="#fff" opacity=".45"/></pattern>
  </defs></svg>`;

  /* cada adesivo: forma (com contorno branco grosso = o corte do adesivo) + desenho por cima */
  const cut = d => `<path d="${d}" fill="#fff" stroke="#fff" stroke-width="16" stroke-linejoin="round"/>`;
  const S = {
    /* a Monstra do Corre */
    monstra: () => `<svg viewBox="0 0 200 200">${cut('M40 170 C34 90 64 40 100 40 C136 40 166 90 160 170 Z')}
      <path d="M62 62 C52 40 54 24 64 16 C70 34 76 48 80 58 Z M138 62 C148 40 146 24 136 16 C130 34 124 48 120 58 Z" fill="url(#g-sun)" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M40 170 C34 90 64 40 100 40 C136 40 166 90 160 170 Z" fill="url(#g-pink)" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M40 170 C34 90 64 40 100 40 C136 40 166 90 160 170 Z" fill="url(#p-dotsw)"/>
      <ellipse cx="80" cy="96" rx="18" ry="22" fill="#fff" stroke="${INK}" stroke-width="5"/><ellipse cx="122" cy="96" rx="18" ry="22" fill="#fff" stroke="${INK}" stroke-width="5"/>
      <circle cx="84" cy="102" r="8" fill="${INK}"/><circle cx="126" cy="102" r="8" fill="${INK}"/><circle cx="81" cy="98" r="3" fill="#fff"/><circle cx="123" cy="98" r="3" fill="#fff"/>
      <path d="M72 130 Q101 158 130 130 Q101 140 72 130 Z" fill="${INK}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M86 134 l6 11 l6 -9 Z M106 136 l6 9 l6 -11 Z" fill="#fff"/>
      <ellipse cx="62" cy="122" rx="9" ry="5" fill="#FFC1E3"/><ellipse cx="140" cy="122" rx="9" ry="5" fill="#FFC1E3"/></svg>`,
    /* explosão holográfica escrita HYPE */
    hype: () => { const pts = []; for(let i = 0; i < 24; i++){ const a = i / 24 * Math.PI * 2, r = i % 2 ? 62 : 92; pts.push((100 + Math.cos(a) * r).toFixed(1) + ' ' + (100 + Math.sin(a) * r).toFixed(1)); } const d = 'M' + pts.join(' L') + ' Z';
      return `<svg viewBox="0 0 200 200">${cut(d)}<path d="${d}" fill="url(#g-holo)" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="${d}" fill="url(#p-dots)"/>
      <text x="100" y="116" text-anchor="middle" font-family="Bagel Fat One, Archivo, sans-serif" font-size="46" fill="${INK}" transform="rotate(-8 100 100)">HYPE</text></svg>`; },
    /* etiqueta cromada MOCADO com cadeado */
    mocado: () => `<svg viewBox="0 0 240 120">${cut('M24 30 H216 a20 20 0 0 1 20 20 V70 a20 20 0 0 1 -20 20 H24 a20 20 0 0 1 -20 -20 V50 a20 20 0 0 1 20 -20 Z')}
      <path d="M24 30 H216 a20 20 0 0 1 20 20 V70 a20 20 0 0 1 -20 20 H24 a20 20 0 0 1 -20 -20 V50 a20 20 0 0 1 20 -20 Z" fill="url(#g-chrome)" stroke="${INK}" stroke-width="4"/>
      <rect x="22" y="52" width="30" height="24" rx="5" fill="${INK}"/><path d="M28 52 v-7 a9 9 0 0 1 18 0 v7" fill="none" stroke="${INK}" stroke-width="5"/>
      <text x="140" y="74" text-anchor="middle" font-family="Bagel Fat One, Archivo, sans-serif" font-size="30" fill="#FF3D8E" stroke="${INK}" stroke-width="1.5">MOCADO</text></svg>`,
    /* nota de dinheiro */
    grana: () => `<svg viewBox="0 0 220 140">${cut('M14 26 H206 V114 H14 Z')}
      <path d="M14 26 H206 V114 H14 Z" fill="url(#g-lime)" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><path d="M14 26 H206 V114 H14 Z" fill="url(#p-dots)"/>
      <rect x="28" y="38" width="164" height="64" rx="10" fill="none" stroke="${INK}" stroke-width="3" stroke-dasharray="6 5"/>
      <circle cx="110" cy="70" r="26" fill="#fff" stroke="${INK}" stroke-width="4"/>
      <text x="110" y="82" text-anchor="middle" font-family="Bagel Fat One, Archivo, sans-serif" font-size="30" fill="${INK}">R$</text>
      <text x="44" y="64" font-family="Bagel Fat One, Archivo, sans-serif" font-size="18" fill="${INK}">100</text><text x="150" y="96" font-family="Bagel Fat One, Archivo, sans-serif" font-size="18" fill="${INK}">100</text></svg>`,
    /* balão de notificação com coração */
    like: () => `<svg viewBox="0 0 200 170">${cut('M30 20 H170 a22 22 0 0 1 22 22 V100 a22 22 0 0 1 -22 22 H96 L70 150 L72 122 H30 a22 22 0 0 1 -22 -22 V42 a22 22 0 0 1 22 -22 Z')}
      <path d="M30 20 H170 a22 22 0 0 1 22 22 V100 a22 22 0 0 1 -22 22 H96 L70 150 L72 122 H30 a22 22 0 0 1 -22 -22 V42 a22 22 0 0 1 22 -22 Z" fill="#FF4757" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M58 58 c-10 -14 -32 -4 -24 14 l24 24 l24 -24 c8 -18 -14 -28 -24 -14 Z" fill="#fff" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
      <text x="138" y="86" text-anchor="middle" font-family="Bagel Fat One, Archivo, sans-serif" font-size="40" fill="#fff" stroke="${INK}" stroke-width="2">+1K</text></svg>`,
    /* câmera analógica */
    camera: () => `<svg viewBox="0 0 220 170">${cut('M20 50 H70 L84 30 H136 L150 50 H200 V146 H20 Z')}
      <path d="M20 50 H70 L84 30 H136 L150 50 H200 V146 H20 Z" fill="#F26B3A" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M20 112 H200 V146 H20 Z" fill="#2B2F38" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><path d="M20 112 H200 V146 H20 Z" fill="url(#p-dotsw)"/>
      <circle cx="110" cy="98" r="40" fill="url(#g-chrome)" stroke="${INK}" stroke-width="5"/><circle cx="110" cy="98" r="24" fill="#1C2A44" stroke="${INK}" stroke-width="4"/><circle cx="102" cy="90" r="7" fill="#9FF2FF"/>
      <rect x="164" y="60" width="22" height="14" rx="3" fill="#FFF36B" stroke="${INK}" stroke-width="3"/></svg>`,
    /* sol de óculos */
    sol: () => { let rays = ''; for(let i = 0; i < 12; i++){ const a = i / 12 * Math.PI * 2, x = 100 + Math.cos(a) * 86, y = 100 + Math.sin(a) * 86, x1 = 100 + Math.cos(a - .14) * 62, y1 = 100 + Math.sin(a - .14) * 62, x2 = 100 + Math.cos(a + .14) * 62, y2 = 100 + Math.sin(a + .14) * 62; rays += `M${x1.toFixed(1)} ${y1.toFixed(1)} L${x.toFixed(1)} ${y.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} Z `; }
      return `<svg viewBox="0 0 200 200"><path d="${rays}" fill="#fff" stroke="#fff" stroke-width="16" stroke-linejoin="round"/><circle cx="100" cy="100" r="66" fill="#fff" stroke="#fff" stroke-width="16"/>
      <path d="${rays}" fill="url(#g-sun)" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><circle cx="100" cy="100" r="58" fill="url(#g-sun)" stroke="${INK}" stroke-width="5"/>
      <path d="M62 86 h32 q2 24 -16 24 q-18 0 -16 -24 Z M106 86 h32 q2 24 -16 24 q-18 0 -16 -24 Z" fill="${INK}"/><path d="M94 90 h12" stroke="${INK}" stroke-width="5"/>
      <path d="M80 130 Q100 146 120 130" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/></svg>`; },
    /* bolha laranja TRAMPO */
    trampo: () => { const d = 'M22 96 C14 60 46 34 84 42 C104 18 150 22 162 52 C196 56 204 98 182 118 C186 150 146 166 118 152 C96 172 54 164 48 136 C20 132 12 112 22 96 Z';
      return `<svg viewBox="0 0 210 180">${cut(d)}<path d="${d}" fill="#FF8A3D" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><path d="${d}" fill="url(#p-dots)"/>
      <text x="104" y="112" text-anchor="middle" font-family="Bagel Fat One, Archivo, sans-serif" font-size="40" fill="#2E5BFF" stroke="${INK}" stroke-width="2" transform="rotate(-6 104 100)">TRAMPO</text></svg>`; },
    /* raio holográfico */
    raio: () => `<svg viewBox="0 0 140 200">${cut('M86 8 L22 112 H66 L48 192 L120 78 H74 Z')}<path d="M86 8 L22 112 H66 L48 192 L120 78 H74 Z" fill="url(#g-holo)" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><path d="M86 8 L22 112 H66 L48 192 L120 78 H74 Z" fill="url(#p-dots)"/></svg>`,
    /* pílula rosa POSTA AÍ */
    posta: () => `<svg viewBox="0 0 240 110">${cut('M55 14 H185 a41 41 0 0 1 0 82 H55 a41 41 0 0 1 0 -82 Z')}
      <path d="M55 14 H185 a41 41 0 0 1 0 82 H55 a41 41 0 0 1 0 -82 Z" fill="url(#g-pink)" stroke="${INK}" stroke-width="5"/><path d="M60 24 H180" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".6"/>
      <text x="120" y="72" text-anchor="middle" font-family="Bagel Fat One, Archivo, sans-serif" font-size="34" fill="#FFF36B" stroke="${INK}" stroke-width="2">POSTA AÍ</text></svg>`,
    /* olho holográfico */
    olho: () => `<svg viewBox="0 0 220 140">${cut('M10 70 C50 10 170 10 210 70 C170 130 50 130 10 70 Z')}
      <path d="M10 70 C50 10 170 10 210 70 C170 130 50 130 10 70 Z" fill="#fff" stroke="${INK}" stroke-width="5"/>
      <circle cx="110" cy="70" r="40" fill="url(#g-holo)" stroke="${INK}" stroke-width="4"/><circle cx="110" cy="70" r="18" fill="${INK}"/><circle cx="100" cy="60" r="7" fill="#fff"/></svg>`,
    /* xícara de café da madrugada */
    cafe: () => `<svg viewBox="0 0 200 200">${cut('M40 80 H150 V150 a30 30 0 0 1 -30 30 H70 a30 30 0 0 1 -30 -30 Z')}
      <path d="M150 96 c34 0 34 44 0 44" fill="none" stroke="#fff" stroke-width="30" stroke-linecap="round"/><path d="M150 96 c34 0 34 44 0 44" fill="none" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M150 96 c34 0 34 44 0 44" fill="none" stroke="#9FF2FF" stroke-width="5" stroke-linecap="round"/>
      <path d="M40 80 H150 V150 a30 30 0 0 1 -30 30 H70 a30 30 0 0 1 -30 -30 Z" fill="#9FF2FF" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><path d="M40 80 H150 V150 a30 30 0 0 1 -30 30 H70 a30 30 0 0 1 -30 -30 Z" fill="url(#p-dots)"/>
      <path d="M72 64 c-10 -14 10 -22 0 -40 M98 64 c-10 -14 10 -22 0 -40 M124 64 c-10 -14 10 -22 0 -40" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
      <text x="95" y="140" text-anchor="middle" font-family="Bagel Fat One, Archivo, sans-serif" font-size="24" fill="${INK}">24/7</text></svg>`,
    /* barquinho de papel do Igapó */
    barco: () => `<svg viewBox="0 0 200 180">${cut('M24 120 H176 L150 160 H50 Z M96 120 V24 L36 120 Z')}
      <path d="M96 120 V24 L36 120 Z" fill="#F4F2EC" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M96 24 V8" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M96 8 L134 20 L96 32 Z" fill="#FF4757" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M24 120 H176 L150 160 H50 Z" fill="url(#g-chrome)" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/></svg>`
  };

  /* posição de cada adesivo (em % da tela), tamanho e giro; "sm" = aparece também no celular */
  const LAYOUT = {
    login: [
      ['monstra', 6, 14, 150, -8, 1], ['hype', 74, 8, 150, 10, 1], ['grana', 80, 62, 170, -12, 0], ['like', 12, 66, 140, 8, 0],
      ['camera', 30, 6, 120, 6, 0], ['sol', 86, 30, 120, 0, 1], ['trampo', 58, 74, 160, -6, 1], ['raio', 4, 40, 70, 14, 0],
      ['posta', 40, 84, 150, 4, 0], ['olho', 62, 14, 110, -10, 0], ['cafe', 90, 82, 90, 10, 0], ['mocado', 20, 88, 150, -4, 1]
    ],
    /* no celular: poucos adesivos, nos cantos, longe da marca e do cartão */
    loginSm: [
      ['monstra', 86, 13, 92, 8, 1], ['hype', 10, 92, 96, -10, 1], ['sol', 88, 94, 84, 0, 1], ['raio', 6, 50, 46, 14, 1]
    ],
    /* dentro do app o cenário já tem a Monstra, o sol e as nuvens: adesivo só nos cartões */
    app: []
  };

  const small = () => innerWidth <= 640;
  function scatter(el, page){
    const key = small() && LAYOUT[page + 'Sm'] ? page + 'Sm' : page;
    el.innerHTML = (LAYOUT[key] || []).map(([k, x, y, w, r, sm], i) =>
      `<span class="stk${sm ? '' : ' hide-sm'}" style="left:${x}%;top:${y}%;--w:${w}px;--r:${r}deg;--d:${(i % 5) * .7}s">${S[k]()}</span>`).join('');
    el.dataset.page = page; el.dataset.key = key;
  }
  /* girar o celular ou redimensionar troca o arranjo quando cruza o limite */
  let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { const el = document.getElementById('stickers'); if(!el || !el.dataset.page) return; const want = small() && LAYOUT[el.dataset.page + 'Sm'] ? el.dataset.page + 'Sm' : el.dataset.page; if(want !== el.dataset.key) scatter(el, el.dataset.page); }, 150); });

  /* céu: degradê azul, nuvens fofas (manchas brancas sobrepostas e borradas) e retícula de impressão */
  function sky(canvas){
    const ctx = canvas.getContext('2d'); if(!ctx) return;
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    function draw(){
      const dpr = Math.min(2, window.devicePixelRatio || 1), w = innerWidth, h = innerHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); seed = 7;
      const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#3A7FB0'); g.addColorStop(.55, '#6EA8CB'); g.addColorStop(1, '#AFD3E3');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      try{ ctx.filter = 'blur(10px)'; }catch(e){}
      const clouds = Math.round(6 + w / 180);
      for(let c = 0; c < clouds; c++){
        const cx = rnd() * w, cy = rnd() * h, sw = 120 + rnd() * 260, sh = sw * (.35 + rnd() * .25);
        for(let k = 0; k < 26; k++){
          const x = cx + (rnd() - .5) * sw, y = cy + (rnd() - .7) * sh, r = 24 + rnd() * sw * .28;
          const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
          rg.addColorStop(0, `rgba(255,255,255,${.30 + rnd() * .25})`); rg.addColorStop(.6, 'rgba(240,248,252,.16)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        }
        // base levemente cinza-azulada, como nuvem de verdade
        const by = cy + sh * .25, bg = ctx.createRadialGradient(cx, by, 0, cx, by, sw * .5);
        bg.addColorStop(0, 'rgba(120,150,175,.16)'); bg.addColorStop(1, 'rgba(120,150,175,0)');
        ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(cx, by, sw * .5, sh * .3, 0, 0, Math.PI * 2); ctx.fill();
      }
      try{ ctx.filter = 'none'; }catch(e){}
    }
    draw(); let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(draw, 120); });
  }

  window.CorreStickers = { DEFS, svg: k => S[k] ? S[k]() : '', scatter, sky };
})();
