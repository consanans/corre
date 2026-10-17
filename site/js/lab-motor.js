/* CORRE · STUDIO HOUZI · o motor de marca (v3.37).
   Tudo em vetor e tudo no aparelho: as letras vêm em curvas das fontes do Studio (lab/fontes/*.json),
   o símbolo é construído em geometria, a paleta sai do OKLCH e as saídas (SVG, PDF vetor, PNG e ZIP) são montadas
   aqui mesmo, sem servidor e sem biblioteca de fora.
   Uma cena é uma lista de elementos { d (caminho), f (preenchimento), s (traço), w (largura do traço), furo, op }.
   "furo" é o que vaza: no SVG e no PNG vira máscara (fica transparente); no PDF é pintado com a cor do fundo. */
(function(){
  'use strict';
  const C = window.Corre;
  const M = C.labMotor = {};
  const r3 = v => Math.round(v * 100) / 100;

  /* ---------------- sorteio com semente (o mesmo nome dá a mesma marca) ---------------- */
  const hash = s => { let h = 2166136261; s = String(s); for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rng = seed => { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const pega = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];
  M.hash = hash; M.rng = rng; M.pega = pega;

  /* ---------------- caminhos: lê qualquer "d" de SVG e deixa só M L C Q Z absolutos ---------------- */
  function arcoPraCurva(x1, y1, rx, ry, fi, large, sweep, x2, y2){
    const out = [];
    if(rx === 0 || ry === 0){ out.push(['L', x2, y2]); return out; }
    const cf = Math.cos(fi * Math.PI / 180), sf = Math.sin(fi * Math.PI / 180);
    const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
    const x1p = cf * dx + sf * dy, y1p = -sf * dx + cf * dy;
    rx = Math.abs(rx); ry = Math.abs(ry);
    const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
    if(lam > 1){ rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
    const sgn = large === sweep ? -1 : 1;
    const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p, den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
    const co = sgn * Math.sqrt(Math.max(0, num / den));
    const cxp = co * rx * y1p / ry, cyp = -co * ry * x1p / rx;
    const cx = cf * cxp - sf * cyp + (x1 + x2) / 2, cy = sf * cxp + cf * cyp + (y1 + y2) / 2;
    const ang = (ux, uy, vx, vy) => { const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy); return a; };
    let t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
    let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
    if(!sweep && dt > 0) dt -= 2 * Math.PI; else if(sweep && dt < 0) dt += 2 * Math.PI;
    const n = Math.ceil(Math.abs(dt) / (Math.PI / 2) - 1e-9) || 1, d = dt / n, k = 4 / 3 * Math.tan(d / 4);
    for(let i = 0; i < n; i++){
      const a1 = t1, a2 = t1 + d;
      const c1x = Math.cos(a1) - k * Math.sin(a1), c1y = Math.sin(a1) + k * Math.cos(a1);
      const c2x = Math.cos(a2) + k * Math.sin(a2), c2y = Math.sin(a2) - k * Math.cos(a2);
      const ex = Math.cos(a2), ey = Math.sin(a2);
      const tp = (x, y) => [cf * rx * x - sf * ry * y + cx, sf * rx * x + cf * ry * y + cy];
      const [q1x, q1y] = tp(c1x, c1y), [q2x, q2y] = tp(c2x, c2y), [qx, qy] = i === n - 1 ? [x2, y2] : tp(ex, ey);
      out.push(['C', q1x, q1y, q2x, q2y, qx, qy]); t1 = a2;
    }
    return out;
  }
  function parse(d){
    if(Array.isArray(d)) return d;
    const tok = String(d || '').match(/[MmLlHhVvCcSsQqTtAaZz]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) || [];
    const out = []; let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, lcx = null, lcy = null, lqx = null, lqy = null;
    const num = () => parseFloat(tok[i++]);
    while(i < tok.length){
      if(/[A-Za-z]/.test(tok[i])) cmd = tok[i++];
      const rel = cmd === cmd.toLowerCase(), U = cmd.toUpperCase();
      if(U === 'Z'){ out.push(['Z']); x = sx; y = sy; lcx = lqx = null; if(i < tok.length && !/[A-Za-z]/.test(tok[i])) cmd = rel ? 'l' : 'L'; continue; }
      if(U === 'M'){ x = num() + (rel ? x : 0); y = num() + (rel ? y : 0); sx = x; sy = y; out.push(['M', x, y]); cmd = rel ? 'l' : 'L'; lcx = lqx = null; continue; }
      if(U === 'L'){ x = num() + (rel ? x : 0); y = num() + (rel ? y : 0); out.push(['L', x, y]); lcx = lqx = null; continue; }
      if(U === 'H'){ x = num() + (rel ? x : 0); out.push(['L', x, y]); lcx = lqx = null; continue; }
      if(U === 'V'){ y = num() + (rel ? y : 0); out.push(['L', x, y]); lcx = lqx = null; continue; }
      if(U === 'C' || U === 'S'){
        let x1, y1;
        if(U === 'C'){ x1 = num() + (rel ? x : 0); y1 = num() + (rel ? y : 0); }
        else { x1 = lcx === null ? x : 2 * x - lcx; y1 = lcy === null ? y : 2 * y - lcy; }
        const x2 = num() + (rel ? x : 0), y2 = num() + (rel ? y : 0), ex = num() + (rel ? x : 0), ey = num() + (rel ? y : 0);
        out.push(['C', x1, y1, x2, y2, ex, ey]); lcx = x2; lcy = y2; lqx = null; x = ex; y = ey; continue;
      }
      if(U === 'Q' || U === 'T'){
        let x1, y1;
        if(U === 'Q'){ x1 = num() + (rel ? x : 0); y1 = num() + (rel ? y : 0); }
        else { x1 = lqx === null ? x : 2 * x - lqx; y1 = lqy === null ? y : 2 * y - lqy; }
        const ex = num() + (rel ? x : 0), ey = num() + (rel ? y : 0);
        out.push(['Q', x1, y1, ex, ey]); lqx = x1; lqy = y1; lcx = null; x = ex; y = ey; continue;
      }
      if(U === 'A'){
        const rx = num(), ry = num(), fi = num(), la = num(), sw = num(), ex = num() + (rel ? x : 0), ey = num() + (rel ? y : 0);
        arcoPraCurva(x, y, rx, ry, fi, la ? 1 : 0, sw ? 1 : 0, ex, ey).forEach(c => out.push(c));
        x = ex; y = ey; lcx = lqx = null; continue;
      }
      i++;
    }
    return out;
  }
  M.parse = parse;
  /* matriz [a b c d e f]: x' = a x + c y + e; y' = b x + d y + f */
  const mx = {
    id: () => [1, 0, 0, 1, 0, 0],
    t: (x, y) => [1, 0, 0, 1, x, y],
    s: (sx, sy) => [sx, 0, 0, sy === undefined ? sx : sy, 0, 0],
    r: (graus, cx, cy) => { const a = graus * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); cx = cx || 0; cy = cy || 0; return [c, s, -s, c, cx - c * cx + s * cy, cy - s * cx - c * cy]; },
    k: (graus) => [1, 0, Math.tan(graus * Math.PI / 180), 1, 0, 0],
    x: (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]]
  };
  M.mx = mx;
  /* aplica a matriz em todos os pontos (m depois de n: mx.x(m, n)) */
  function tr(cmds, m){
    const p = (x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
    return parse(cmds).map(c => {
      if(c[0] === 'Z') return c;
      const o = [c[0]];
      for(let i = 1; i < c.length; i += 2){ const [a, b] = p(c[i], c[i + 1]); o.push(a, b); }
      return o;
    });
  }
  M.tr = tr;
  /* caixa: os extremos de verdade das curvas, não só os pontos de controle */
  function caixa(cmds){
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, px = 0, py = 0;
    const add = (x, y) => { if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y; };
    const cub = (p0, p1, p2, p3) => { const out = []; const a = -p0 + 3 * p1 - 3 * p2 + p3, b = 2 * (p0 - 2 * p1 + p2), c = p1 - p0;
      if(Math.abs(a) < 1e-9){ if(Math.abs(b) > 1e-9) out.push(-c / b); } else { const dd = b * b - 4 * a * c; if(dd >= 0){ const q = Math.sqrt(dd); out.push((-b + q) / (2 * a), (-b - q) / (2 * a)); } }
      return out.filter(t => t > 0 && t < 1); };
    const vc = (p0, p1, p2, p3, t) => { const u = 1 - t; return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3; };
    for(const c of parse(cmds)){
      if(c[0] === 'M' || c[0] === 'L'){ add(c[1], c[2]); px = c[1]; py = c[2]; }
      else if(c[0] === 'C'){
        add(c[5], c[6]);
        cub(px, c[1], c[3], c[5]).forEach(t => add(vc(px, c[1], c[3], c[5], t), vc(py, c[2], c[4], c[6], t)));
        cub(py, c[2], c[4], c[6]).forEach(t => add(vc(px, c[1], c[3], c[5], t), vc(py, c[2], c[4], c[6], t)));
        px = c[5]; py = c[6];
      } else if(c[0] === 'Q'){
        add(c[3], c[4]);
        [[px, c[1], c[3]], [py, c[2], c[4]]].forEach(([p0, p1, p2]) => { const den = p0 - 2 * p1 + p2; if(Math.abs(den) > 1e-9){ const t = (p0 - p1) / den; if(t > 0 && t < 1){ const u = 1 - t; add(u * u * px + 2 * u * t * c[1] + t * t * c[3], u * u * py + 2 * u * t * c[2] + t * t * c[4]); } } });
        px = c[3]; py = c[4];
      }
    }
    return x0 === Infinity ? { x: 0, y: 0, w: 0, h: 0 } : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  M.caixa = caixa;
  const juntaCaixas = bs => { const v = bs.filter(b => b && (b.w || b.h)); if(!v.length) return { x: 0, y: 0, w: 0, h: 0 }; const x0 = Math.min(...v.map(b => b.x)), y0 = Math.min(...v.map(b => b.y)), x1 = Math.max(...v.map(b => b.x + b.w)), y1 = Math.max(...v.map(b => b.y + b.h)); return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; };
  M.juntaCaixas = juntaCaixas;
  const dDe = (cmds, p) => { const f = v => { const k = Math.pow(10, p === undefined ? 2 : p); return String(Math.round(v * k) / k); }; return parse(cmds).map(c => c[0] + c.slice(1).map(f).join(' ')).join(''); };
  M.d = dDe;

  /* ---------------- formas prontas (sempre em comandos absolutos) ---------------- */
  const K = 0.5522847498;
  const F = M.forma = {
    ret: (x, y, w, h, r) => {
      r = Math.max(0, Math.min(r || 0, w / 2, h / 2));
      if(!r) return [['M', x, y], ['L', x + w, y], ['L', x + w, y + h], ['L', x, y + h], ['Z']];
      const k = r * (1 - K);
      return [['M', x + r, y], ['L', x + w - r, y], ['C', x + w - k, y, x + w, y + k, x + w, y + r], ['L', x + w, y + h - r], ['C', x + w, y + h - k, x + w - k, y + h, x + w - r, y + h],
        ['L', x + r, y + h], ['C', x + k, y + h, x, y + h - k, x, y + h - r], ['L', x, y + r], ['C', x, y + k, x + k, y, x + r, y], ['Z']];
    },
    elipse: (cx, cy, rx, ry) => { ry = ry === undefined ? rx : ry; const kx = rx * K, ky = ry * K;
      return [['M', cx + rx, cy], ['C', cx + rx, cy + ky, cx + kx, cy + ry, cx, cy + ry], ['C', cx - kx, cy + ry, cx - rx, cy + ky, cx - rx, cy], ['C', cx - rx, cy - ky, cx - kx, cy - ry, cx, cy - ry], ['C', cx + kx, cy - ry, cx + rx, cy - ky, cx + rx, cy], ['Z']]; },
    /* círculo no sentido contrário (pra furar com a regra nonzero) */
    elipseInv: (cx, cy, rx, ry) => { ry = ry === undefined ? rx : ry; const kx = rx * K, ky = ry * K;
      return [['M', cx + rx, cy], ['C', cx + rx, cy - ky, cx + kx, cy - ry, cx, cy - ry], ['C', cx - kx, cy - ry, cx - rx, cy - ky, cx - rx, cy], ['C', cx - rx, cy + ky, cx - kx, cy + ry, cx, cy + ry], ['C', cx + kx, cy + ry, cx + rx, cy + ky, cx + rx, cy], ['Z']]; },
    poli: (pts, aberto) => { const o = pts.map((p, i) => [i ? 'L' : 'M', p[0], p[1]]); if(!aberto) o.push(['Z']); return o; },
    linha: (x1, y1, x2, y2) => [['M', x1, y1], ['L', x2, y2]],
    /* estrela/explosão com n pontas */
    estrela: (cx, cy, R, r, n, rot) => { const pts = []; rot = rot === undefined ? -90 : rot; for(let i = 0; i < n * 2; i++){ const a = (rot + i * 180 / n) * Math.PI / 180, rr = i % 2 ? r : R; pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); } return F.poli(pts); },
    /* polígono regular */
    regular: (cx, cy, R, n, rot) => { const pts = []; rot = rot === undefined ? -90 : rot; for(let i = 0; i < n; i++){ const a = (rot + i * 360 / n) * Math.PI / 180; pts.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); } return F.poli(pts); },
    /* superelipse (o "squircle" dos ícones de app) */
    squircle: (cx, cy, R) => { const pts = []; for(let i = 0; i < 64; i++){ const t = i / 64 * Math.PI * 2, c = Math.cos(t), s = Math.sin(t); pts.push([cx + R * Math.sign(c) * Math.pow(Math.abs(c), 0.5), cy + R * Math.sign(s) * Math.pow(Math.abs(s), 0.5)]); } return F.poli(pts); },
    /* arco de anel (pra selo e borda) */
    anel: (cx, cy, R, r) => F.elipse(cx, cy, R).concat(F.elipseInv(cx, cy, r))
  };

  /* ---------------- cena -> SVG ---------------- */
  let uid = 0;
  /* v3.55: tudo que vai dentro de atributo ou texto do SVG passa por aqui: a cor vem da marca salva no banco (uma cor com aspas
     abria código na vitrine e no brandbook de quem visita) e o nome com "&" deixava o SVG inválido (kit e PNG falhavam) */
  const at = s => String(s).replace(/[&"<>]/g, c => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' })[c]);
  const attrs = el => {
    const a = [];
    a.push(`fill="${at(el.f || 'none')}"`);
    if(el.eo) a.push('fill-rule="evenodd"');
    if(el.s){ a.push(`stroke="${at(el.s)}" stroke-width="${r3(el.w || 1)}" stroke-linecap="${at(el.cap || 'round')}" stroke-linejoin="${at(el.join || 'round')}"`); }
    if(el.op !== undefined && el.op < 1) a.push(`opacity="${r3(el.op)}"`);
    return a.join(' ');
  };
  /* els: elementos; o: { w, h, vb: {x,y,w,h}, fundo, titulo } */
  M.svg = (els, o) => {
    o = o || {};
    const vb = o.vb || juntaCaixas(els.map(e => caixa(e.d)));
    const id = 'lm' + (++uid).toString(36);
    const furos = els.filter(e => e.furo), cheios = els.filter(e => !e.furo);
    const clips = [];
    const corpo = cheios.map(e => { if(!e.clip) return `<path d="${dDe(e.d)}" ${attrs(e)}/>`; const cid = id + 'c' + clips.length; clips.push(`<clipPath id="${cid}"><path d="${dDe(e.clip)}"${e.clipEo ? ' clip-rule="evenodd"' : ''}/></clipPath>`); return `<path d="${dDe(e.d)}" ${attrs(e)} clip-path="url(#${cid})"/>`; }).join('');
    /* v3.43: o furo com recorte (a onda e os riscos da grelha dentro do círculo) fica dentro do recorte também na máscara;
       sem isso ele vazava e furava a letra do lado */
    const mclips = [];
    const furoSvg = e => { const p = `<path d="${dDe(e.d)}" ${attrs(Object.assign({}, e, { f: e.f ? '#000' : 'none', s: e.s ? '#000' : null }))}/>`; if(!e.clip) return p; const cid = id + 'm' + mclips.length; mclips.push(`<clipPath id="${cid}"><path d="${dDe(e.clip)}"${e.clipEo ? ' clip-rule="evenodd"' : ''}/></clipPath>`); return `<g clip-path="url(#${cid})">${p}</g>`; };
    const mask = furos.length ? (() => { const fx = furos.map(furoSvg).join(''); return `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="${r3(vb.x - 10)}" y="${r3(vb.y - 10)}" width="${r3(vb.w + 20)}" height="${r3(vb.h + 20)}">${mclips.length ? `<defs>${mclips.join('')}</defs>` : ''}<rect x="${r3(vb.x - 10)}" y="${r3(vb.y - 10)}" width="${r3(vb.w + 20)}" height="${r3(vb.h + 20)}" fill="#fff"/>${fx}</mask></defs>`; })() : '';
    const fundo = (clips.length ? `<defs>${clips.join('')}</defs>` : '') + (o.fundo ? `<rect x="${r3(vb.x)}" y="${r3(vb.y)}" width="${r3(vb.w)}" height="${r3(vb.h)}" fill="${at(o.fundo)}"/>` : '');
    const wh = o.w ? ` width="${r3(o.w)}" height="${r3(o.h || o.w * vb.h / vb.w)}"` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${r3(vb.x)} ${r3(vb.y)} ${r3(vb.w)} ${r3(vb.h)}"${wh}${o.cls ? ` class="${o.cls}"` : ''}${o.titulo ? ` role="img" aria-label="${at(o.titulo)}"` : ' aria-hidden="true"'}>${o.titulo ? `<title>${at(o.titulo)}</title>` : ''}${mask}${fundo}${furos.length ? `<g mask="url(#${id})">${corpo}</g>` : corpo}${o.extra || ''}</svg>`;
  };
  /* recorta uma cena: soma margem em volta */
  M.margem = (els, m) => { const b = juntaCaixas(els.map(e => caixa(e.d))); return { x: b.x - m, y: b.y - m, w: b.w + 2 * m, h: b.h + 2 * m }; };
  /* move/escala uma cena inteira */
  M.trEls = (els, m) => els.map(e => Object.assign({}, e, { d: tr(e.d, m), clip: e.clip ? tr(e.clip, m) : e.clip, w: e.w ? e.w * Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) : e.w }));
})();

/* ---------------- LETRAS: as fontes do Studio e o texto em curvas ---------------- */
(function(){
  'use strict';
  const C = window.Corre, M = C.labMotor;
  const { parse, tr } = M;
  const BASE = 'lab/fontes/';
  /* o catálogo. v = a cara da letra em 5 eixos (0..1): clássico→moderno, sério→divertido, sofisticado→popular,
     calmo→energia, artesanal→tech. d = serve pra logo (1) ou só pra texto (0) */
  const FONTES = [
    { id: 'inter-black', k: 'Houzi Grotesca Pesada', n: 'Grotesca Pesada', o: 'Inter Display Black', e: 'sem', d: 1, v: [.9, .45, .62, .92, .78] },
    { id: 'inter-bold', k: 'Houzi Grotesca', n: 'Grotesca', o: 'Inter Display Bold', e: 'sem', d: 1, v: [.86, .38, .5, .62, .78] },
    { id: 'inter-light', k: 'Houzi Grotesca Fina', n: 'Grotesca Fina', o: 'Inter Display Light', e: 'sem', d: 1, v: [.82, .2, .12, .18, .62] },
    { id: 'poppins-bold', k: 'Houzi Geométrica', n: 'Geométrica', o: 'Poppins Bold', e: 'sem', d: 1, v: [.76, .72, .66, .62, .55] },
    { id: 'poppins-light', k: 'Houzi Geométrica Leve', n: 'Geométrica Leve', o: 'Poppins Light', e: 'sem', d: 1, v: [.72, .55, .38, .22, .5] },
    { id: 'adventor-bold', k: 'Houzi Avant', n: 'Avant', o: 'TeX Gyre Adventor Bold', e: 'sem', d: 1, v: [.58, .66, .55, .62, .42] },
    { id: 'heroscn-bold', k: 'Houzi Condensada', n: 'Condensada', o: 'TeX Gyre Heros Cn Bold', e: 'sem', d: 1, v: [.7, .35, .78, .96, .5] },
    { id: 'lora-bold', k: 'Houzi Editorial', n: 'Editorial', o: 'Lora Bold', e: 'serifa', d: 1, v: [.36, .34, .34, .4, .22] },
    { id: 'lora-bolditalic', k: 'Houzi Editorial Itálica', n: 'Editorial Itálica', o: 'Lora Bold Italic', e: 'serifa', d: 1, v: [.34, .58, .3, .52, .18] },
    { id: 'schola-bold', k: 'Houzi Escolar', n: 'Escolar', o: 'TeX Gyre Schola Bold', e: 'serifa', d: 1, v: [.14, .24, .46, .4, .2] },
    { id: 'bonum-bold', k: 'Houzi Setentinha', n: 'Setentinha', o: 'TeX Gyre Bonum Bold', e: 'serifa', d: 1, v: [.22, .78, .72, .56, .14] },
    { id: 'pagella-bold', k: 'Houzi Palácio', n: 'Palácio', o: 'TeX Gyre Pagella Bold', e: 'serifa', d: 1, v: [.1, .14, .1, .3, .2] },
    { id: 'chorus', k: 'Houzi Caligrafia', n: 'Caligrafia', o: 'TeX Gyre Chorus', e: 'manuscrita', d: 1, v: [.08, .56, .24, .34, .0] },
    { id: 'cursor-bold', k: 'Houzi Máquina', n: 'Máquina de Escrever', o: 'TeX Gyre Cursor Bold', e: 'mono', d: 1, v: [.3, .52, .62, .44, .36] },
    { id: 'pixel', k: 'Houzi Pixel', n: 'Pixel', o: 'Houzi Pixel', e: 'pixel', d: 1, v: [.96, .86, .72, .82, 1] },
    { id: 'inter-regular', k: 'Houzi Texto', n: 'Inter', o: 'Inter', e: 'sem', d: 0 },
    { id: 'inter-medium', k: 'Houzi Texto Média', n: 'Inter Média', o: 'Inter Medium', e: 'sem', d: 0 },
    { id: 'poppins-regular', k: 'Houzi Geométrica Texto', n: 'Poppins', o: 'Poppins', e: 'sem', d: 0 },
    { id: 'lora-regular', k: 'Houzi Editorial Texto', n: 'Lora', o: 'Lora', e: 'serifa', d: 0 },
    { id: 'heros-regular', k: 'Houzi Grotesca Texto', n: 'Heros', o: 'TeX Gyre Heros', e: 'sem', d: 0 },
    { id: 'schola-regular', k: 'Houzi Escolar Texto', n: 'Schola', o: 'TeX Gyre Schola', e: 'serifa', d: 0 },
    { id: 'pagella-regular', k: 'Houzi Palácio Texto', n: 'Pagella', o: 'TeX Gyre Pagella', e: 'serifa', d: 0 },
    { id: 'cursor-regular', k: 'Houzi Máquina Texto', n: 'Cursor', o: 'TeX Gyre Cursor', e: 'mono', d: 0 }
  ];
  const TTF = /^(lora|poppins|pixel)/;
  FONTES.forEach(f => { f.arq = f.id + (TTF.test(f.id) ? '.ttf' : '.otf'); f.fam = 'lab-' + f.id; });
  const POR_ID = Object.fromEntries(FONTES.map(f => [f.id, f]));
  /* o par de texto de cada letra de logo */
  const PAR = { 'inter-black': 'inter-regular', 'inter-bold': 'inter-regular', 'inter-light': 'inter-regular', 'poppins-bold': 'poppins-regular', 'poppins-light': 'poppins-regular',
    'adventor-bold': 'inter-regular', 'heroscn-bold': 'heros-regular', 'lora-bold': 'lora-regular', 'lora-bolditalic': 'lora-regular', 'schola-bold': 'schola-regular',
    'bonum-bold': 'schola-regular', 'pagella-bold': 'pagella-regular', chorus: 'pagella-regular', 'cursor-bold': 'cursor-regular', pixel: 'inter-medium' };
  M.FONTES = FONTES; M.fonteInfo = id => POR_ID[id] || POR_ID['inter-black']; M.parTexto = id => PAR[id] || 'inter-regular';

  const cache = {};
  /* carrega os contornos (uma vez por fonte) */
  M.fonte = id => {
    if(!POR_ID[id]) id = 'inter-black';
    if(!cache[id]) cache[id] = fetch(BASE + id + '.json').then(r => { if(!r.ok) throw new Error('fonte ' + id); return r.json(); })
      .then(j => { j.cmds = {}; j.info = POR_ID[id]; return j; })
      .catch(e => { delete cache[id]; throw e; });
    return cache[id];
  };
  M.fontes = ids => Promise.all([...new Set(ids.filter(Boolean))].map(M.fonte)).then(l => Object.fromEntries(l.map(f => [f.id, f])));
  /* a fonte de verdade (pra CSS e canvas): injeta o @font-face uma vez */
  const css = new Set();
  M.css = id => {
    const f = POR_ID[id]; if(!f || css.has(id)) return f ? f.fam : '';
    css.add(id);
    const st = document.createElement('style');
    st.textContent = `@font-face{font-family:'${f.fam}';src:url('${BASE}${f.arq}') format('${/\.ttf$/.test(f.arq) ? 'truetype' : 'opentype'}');font-display:swap}`;
    document.head.appendChild(st);
    return f.fam;
  };
  /* espera a fonte de verdade carregar (pro canvas desenhar com ela) */
  M.cssPronta = async id => { const fam = M.css(id); try{ if(document.fonts && document.fonts.load) await document.fonts.load(`40px '${fam}'`); }catch(e){} return fam; };

  const semAcento = ch => ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
  function glifo(f, ch){
    let g = f.g[ch], k = ch;
    if(!g){ k = semAcento(ch); g = f.g[k]; }
    if(!g){ k = ch.toUpperCase(); g = f.g[k]; }
    if(!g){ k = '?'; g = f.g['?']; }
    if(!g) return null;
    if(!f.cmds[k]) f.cmds[k] = g[1] ? parse(g[1]) : [];
    return { adv: g[0], cmds: f.cmds[k] };
  }
  M.glifo = glifo;
  const kern = (f, a, b) => (f.k && (f.k[semAcento(a) + semAcento(b)] || 0)) || 0;
  /* v3.43: a sigla que a pessoa escreveu toda em maiúscula (KVRA, GP, MV) continua em maiúscula na caixa baixa e na de
     título: sigla em minúscula vira outra palavra ("kvra", "Mv") */
  const SIGLA = /^(?=.*\p{Lu})[\p{Lu}\p{N}]{2,5}$/u;
  M.SIGLA = SIGLA;
  M.caixaAlta = (s, caixa) => {
    s = String(s || '');
    if(caixa === 'alta') return s.toLocaleUpperCase('pt-BR');
    if(caixa !== 'baixa' && caixa !== 'titulo') return s;
    let primeira = true;
    return s.split(/(\s+)/).map(tk => {
      if(!tk || /^\s+$/.test(tk)) return tk;
      const era = primeira; primeira = false;
      if(SIGLA.test(tk)) return tk;
      const lo = tk.toLocaleLowerCase('pt-BR');
      if(caixa === 'baixa') return lo;
      return lo.replace(/(^|[\-/])(\p{L}+)/gu, (m, a, w, i) => a + (!(era && i === 0) && /^(da|de|do|das|dos|e|em|na|no|nas|nos|à|a|o|of|the)$/.test(w) ? w : w[0].toLocaleUpperCase('pt-BR') + w.slice(1)));
    }).join('');
  };
  /* texto em curvas. tam = altura da maiúscula (em unidades); track em eme; x,y = começo da linha de base */
  M.texto = (f, str, o) => {
    o = o || {};
    const tam = o.tam || 100, esc = tam / (f.cap || 700), track = (o.track || 0) * 1000;
    const s = [...M.caixaAlta(str, o.caixa)];
    let x = 0; const cmds = [], letras = [];
    s.forEach((ch, i) => {
      if(i) x += kern(f, s[i - 1], ch) * esc;
      const g = glifo(f, ch);
      if(!g){ x += 300 * esc; return; }
      const lc = g.cmds.length ? tr(g.cmds, [esc, 0, 0, esc, (o.x || 0) + x, o.y || 0]) : [];
      lc.forEach(c => cmds.push(c));
      letras.push({ ch, i, x: (o.x || 0) + x, w: g.adv * esc, cmds: lc });
      x += g.adv * esc + (i < s.length - 1 ? track * esc : 0);
    });
    return { cmds, w: x, letras, esc, cap: (f.cap || 700) * esc, xh: (f.xh || 500) * esc, asc: (f.asc || 900) * esc, desc: (f.desc || 250) * esc, x: o.x || 0, y: o.y || 0 };
  };
  /* largura de um texto sem montar as curvas (pra quebrar linha) */
  M.largura = (f, str, o) => {
    o = o || {}; const esc = (o.tam || 100) / (f.cap || 700), track = (o.track || 0) * 1000;
    const s = [...M.caixaAlta(str, o.caixa)]; let x = 0;
    s.forEach((ch, i) => { if(i) x += kern(f, s[i - 1], ch) * esc; const g = f.g[ch] || f.g[semAcento(ch)] || f.g['?']; x += (g ? g[0] : 300) * esc + (i < s.length - 1 ? track * esc : 0); });
    return x;
  };
  /* v3.43 · MEDIR A LETRA. corteH: achata o contorno (as curvas em 12 passos) e devolve, em ordem, os x onde a linha y
     corta. É a régua de tudo que precisa saber onde tem tinta: a haste, a largura de dentro do emblema, a fatia */
  M.corteH = (cmds, y) => {
    const xs = []; let px = 0, py = 0, sx = 0, sy = 0;
    const seg = (x1, y1, x2, y2) => { if((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) xs.push(x1 + (y - y1) * (x2 - x1) / (y2 - y1)); };
    for(const c of parse(cmds)){
      if(c[0] === 'M'){ if(px !== sx || py !== sy) seg(px, py, sx, sy); px = sx = c[1]; py = sy = c[2]; }
      else if(c[0] === 'L'){ seg(px, py, c[1], c[2]); px = c[1]; py = c[2]; }
      else if(c[0] === 'C' || c[0] === 'Q'){
        let ax = px, ay = py;
        for(let i = 1; i <= 12; i++){
          const t = i / 12, u = 1 - t; let x, yy;
          if(c[0] === 'C'){ x = u * u * u * px + 3 * u * u * t * c[1] + 3 * u * t * t * c[3] + t * t * t * c[5]; yy = u * u * u * py + 3 * u * u * t * c[2] + 3 * u * t * t * c[4] + t * t * t * c[6]; }
          else { x = u * u * px + 2 * u * t * c[1] + t * t * c[3]; yy = u * u * py + 2 * u * t * c[2] + t * t * c[4]; }
          seg(ax, ay, x, yy); ax = x; ay = yy;
        }
        px = c[0] === 'C' ? c[5] : c[3]; py = c[0] === 'C' ? c[6] : c[4];
      } else if(c[0] === 'Z'){ seg(px, py, sx, sy); px = sx; py = sy; }
    }
    if(px !== sx || py !== sy) seg(px, py, sx, sy);
    return xs.sort((a, b) => a - b);
  };
  /* a tinta de uma linha: a soma das corridas cheias (entre um corte e o próximo) */
  M.tintaH = (cmds, y) => { const xs = M.corteH(cmds, y); let s = 0; for(let i = 0; i + 1 < xs.length; i += 2) s += xs[i + 1] - xs[i]; return s; };
  /* haste: a corrida de tinta do "I" cortado na meia altura da maiúscula, com a maiúscula em 100. Todo traço e sinal do
     logo (fio, sublinhado, colchete, o traço do símbolo em linha) sai dela: é ela que diz se a letra é fina ou gorda */
  M.haste = f => {
    if(!f) return 14;
    if(f._haste) return f._haste;
    const t = M.texto(f, 'I', { tam: 100 }), xs = M.corteH(t.cmds, -50); let h = 0;
    for(let i = 0; i + 1 < xs.length; i += 2) h = Math.max(h, xs[i + 1] - xs[i]);
    f._haste = h > 1 ? h : 14;
    return f._haste;
  };

  /* parágrafo: quebra em linhas que cabem em "larg"; alinha à esquerda, ao centro ou à direita */
  M.paragrafo = (f, str, o) => {
    o = o || {}; const tam = o.tam || 12, larg = o.larg || 400, entre = o.entre || tam * 1.9;
    const linhas = [];
    String(str || '').split(/\n/).forEach(par => {
      const pals = par.split(/\s+/).filter(Boolean); let cur = '';
      pals.forEach(p => { const t = cur ? cur + ' ' + p : p; if(cur && M.largura(f, t, o) > larg){ linhas.push(cur); cur = p; } else cur = t; });
      linhas.push(cur);
    });
    if(o.max && linhas.length > o.max){ linhas.length = o.max; linhas[o.max - 1] = linhas[o.max - 1].replace(/\s*\S*$/, '') + '…'; }
    const cmds = [];
    linhas.forEach((l, i) => {
      const w = M.largura(f, l, o), x0 = (o.x || 0) + (o.alinha === 'centro' ? (larg - w) / 2 : o.alinha === 'dir' ? larg - w : 0);
      M.texto(f, l, Object.assign({}, o, { x: x0, y: (o.y || 0) + i * entre })).cmds.forEach(c => cmds.push(c));
    });
    return { cmds, linhas: linhas.length, h: (linhas.length - 1) * entre + tam };
  };
  /* texto em volta de um círculo (selo). centro em graus (-90 = em cima); embaixo = lido da esquerda pra direita por dentro */
  M.textoArco = (f, str, o) => {
    const t = M.texto(f, str, { tam: o.tam, track: o.track, caixa: o.caixa });
    const r = o.r, cx = o.cx || 0, cy = o.cy || 0, span = t.w / r, cmds = [];
    t.letras.forEach(l => {
      const g = glifo(f, l.ch); if(!g || !g.cmds.length) return;
      const meio = l.x + l.w / 2;
      let m;
      if(!o.baixo){
        const ang = (o.centro === undefined ? -90 : o.centro) * Math.PI / 180 - span / 2 + meio / r;
        /* a letra em pé, com a base no círculo, girada pra fora */
        m = M.mx.x(M.mx.t(cx + r * Math.cos(ang), cy + r * Math.sin(ang)), M.mx.x(M.mx.r(ang * 180 / Math.PI + 90), M.mx.t(-l.w / 2, 0)));
      } else {
        const ang = (o.centro === undefined ? 90 : o.centro) * Math.PI / 180 + span / 2 - meio / r;
        /* embaixo: a letra fica de cabeça pra dentro, lida da esquerda pra direita; a altura sobe pro centro */
        m = M.mx.x(M.mx.t(cx + r * Math.cos(ang), cy + r * Math.sin(ang)), M.mx.x(M.mx.r(ang * 180 / Math.PI - 90), M.mx.t(-l.w / 2, t.cap)));
      }
      tr(g.cmds, M.mx.x(m, [t.esc, 0, 0, t.esc, 0, 0])).forEach(c => cmds.push(c));
    });
    return { cmds, cap: t.cap, span };
  };
})();

/* ---------------- COR: OKLCH, paleta, nome de cada cor, contraste e CMYK ---------------- */
(function(){
  'use strict';
  const C = window.Corre, M = C.labMotor;
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  const lin = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const gam = c => c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  const hexRgb = h => { h = String(h || '').replace('#', ''); if(h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16) || 0; return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
  const rgbHex = rgb => '#' + rgb.map(v => Math.round(cl(v, 0, 1) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
  function oklab(rgb){
    const [r, g, b] = rgb.map(lin);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
  }
  function deLab(L, a, b){
    const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3), m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3), s = Math.pow(L - 0.0894841775 * a - 1.2914855480 * b, 3);
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s].map(gam);
  }
  const lch = hex => { const [L, a, b] = oklab(hexRgb(hex)); return { l: L, c: Math.hypot(a, b), h: (Math.atan2(b, a) * 180 / Math.PI + 360) % 360 }; };
  const dentro = rgb => rgb.every(v => v >= -0.0005 && v <= 1.0005);
  /* OKLCH -> hex, puxando o croma pra dentro do sRGB quando precisa */
  function deLch(l, c, h){
    l = cl(l, 0, 1); const hr = h * Math.PI / 180;
    let rgb = deLab(l, c * Math.cos(hr), c * Math.sin(hr));
    if(!dentro(rgb)){ let lo = 0, hi = c; for(let i = 0; i < 22; i++){ const mid = (lo + hi) / 2; const t = deLab(l, mid * Math.cos(hr), mid * Math.sin(hr)); if(dentro(t)) lo = mid; else hi = mid; } rgb = deLab(l, lo * Math.cos(hr), lo * Math.sin(hr)); }
    return rgbHex(rgb);
  }
  const lum = hex => { const [r, g, b] = hexRgb(hex).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const contraste = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const cmyk = hex => { const [r, g, b] = hexRgb(hex); const k = 1 - Math.max(r, g, b); if(k >= 1) return [0, 0, 0, 100]; return [(1 - r - k) / (1 - k), (1 - g - k) / (1 - k), (1 - b - k) / (1 - k), k].map(v => Math.round(v * 100)); };
  Object.assign(M, { hexRgb, rgbHex, lch, deLch, contraste, cmyk, lum });
  M.rgb255 = hex => hexRgb(hex).map(v => Math.round(v * 255));
  /* a cor de texto que dá mais leitura em cima de uma cor */
  M.texto_em = (fundo, tinta, papel) => contraste(fundo, tinta) >= contraste(fundo, papel) ? tinta : papel;

  /* verde fica fora do que o Studio sugere sozinho (se a pessoa escolher verde pra marca dela, pode) */
  /* no OKLCH o amarelo puro fica perto de 105-110; daí até ~178 é amarelo-esverdeado, verde e verde-água */
  /* v3.40: a borda de cima foi pra 186 (no 178 a cor ainda lia como verde-petróleo) */
  /* v3.43: a faixa proibida depende da luz (l, opcional; sem ela a cor conta como escura). No lado amarelo, amarelo
     escuro vira oliva: abaixo de l .85 a faixa começa em 100, e a cor desviada vai pro ocre (85); clara, começa em 116 e
     vai pro amarelo limpo (106). No lado azul, de 196 a 205 ainda sai verde-água e petróleo: a faixa vai até 210 em
     qualquer luz e a cor desviada vai pro azul (222) */
  const semVerde = (h, l) => {
    h = ((h % 360) + 360) % 360;
    const claro = l !== undefined && l >= 0.85;
    if(h > (claro ? 116 : 100) && h < 210) return h < 150 ? (claro ? 106 : 85) : 222;
    return h;
  };
  M.semVerde = semVerde;

  /* matiz de partida por nicho (graus no OKLCH) */
  const MATIZ = { comida: [29, 45, 20, 60], cafe: [55, 45, 35], doces: [355, 340, 20, 300], bebidas: [310, 20, 55, 265], beleza: [350, 330, 20, 300], moda: [25, 265, 350, 60],
    fitness: [35, 250, 20, 285], saude: [235, 205, 350, 260], pet: [55, 215, 30, 300], casa: [45, 245, 25, 60], tech: [265, 285, 215, 330], criativo: [330, 60, 280, 25],
    musica: [295, 330, 60, 250], educacao: [255, 60, 25, 300], agro: [70, 50, 230, 30], auto: [25, 250, 60, 0], servicos: [255, 220, 40, 290], varejo: [350, 60, 255, 30],
    eventos: [330, 70, 290, 20], arte: [20, 290, 60, 340], outro: [255, 25, 330, 60] };
  M.MATIZ = MATIZ;
  /* p: personalidade 0..1 [moderno, divertido, popular, energia, tech] */
  M.paleta = (o) => {
    const p = o.pers || [.5, .5, .5, .5, .5], r = M.rng(o.seed || 1);
    const [mod, div, pop, ene, tec] = p;
    const sof = 1 - pop;
    /* croma: energia e diversão acendem; sofisticado e calmo apagam */
    const cp = cl(0.08 + 0.13 * ene + 0.05 * div - 0.04 * sof, 0.05, 0.24);
    /* a luz vem antes da matiz: a faixa sem verde depende dela */
    const lp = cl(0.66 - 0.2 * sof + 0.06 * div - 0.06 * (1 - mod) * sof, 0.38, 0.8);
    let h;
    const base = o.cor ? lch(o.cor) : null;
    if(base && base.c > 0.03) h = base.h; else h = semVerde(M.pega(r, MATIZ[o.nicho] || MATIZ.outro) + (r() - 0.5) * 16 + (o.giro || 0), lp);
    let P = base && o.manter ? o.cor.toUpperCase() : deLch(lp, cp, h);
    const hp = base && o.manter ? base.h : h;
    /* o esquema de cores pela personalidade */
    let esq = o.esquema;
    if(!esq) esq = ene < 0.35 ? 'analoga' : (sof > 0.65 && div < 0.45) ? 'mono' : tec > 0.65 ? 'dividida' : (div > 0.6 && ene > 0.55) ? 'complementar' : 'triade';
    const H2 = { analoga: [hp + 32, hp - 38], mono: [hp, hp], dividida: [hp + 150, hp + 210], complementar: [hp + 180, hp + 40], triade: [hp + 120, hp + 240] }[esq] || [hp + 120, hp + 240];
    /* as cores que o Studio deriva nunca caem no verde; só a cor que a própria pessoa escolheu pode ser verde */
    const livre = (h2, l2) => semVerde(h2, l2);
    let S, A;
    if(esq === 'mono'){
      S = deLch(cl(lp + 0.2, 0, 0.92), cp * 0.45, hp);
      A = deLch(0.78, 0.12, 82); /* um ouro pra dar o detalhe */
    } else {
      const ls = cl(lp + (div > 0.5 ? 0.1 : -0.12), 0.3, 0.86), la = cl(0.82 - 0.1 * sof, 0.55, 0.9);
      S = deLch(ls, cp * 0.8, livre(H2[0], ls));
      A = deLch(la, cl(cp + 0.03, 0.08, 0.22), livre(H2[1], la));
    }
    const INK = deLch(cl(0.17 + 0.05 * div, 0.12, 0.26), Math.min(0.035, cp * 0.22), hp);
    const quente = tec < 0.45 || (MATIZ[o.nicho] && ['comida', 'cafe', 'doces', 'agro', 'arte'].includes(o.nicho));
    const PAPER = deLch(0.975, quente ? 0.016 : 0.01, quente ? 85 : hp);
    const cores = { p: P, s: S, a: A, ink: INK, paper: PAPER };
    /* o primário precisa segurar texto: se ficou no meio do caminho, escurece ou clareia um pouco */
    if(!(base && o.manter)){
      const melhor = Math.max(contraste(P, INK), contraste(P, PAPER));
      if(melhor < 3.2){ const c0 = lch(P); cores.p = deLch(c0.l > 0.6 ? c0.l + 0.1 : c0.l - 0.12, c0.c, c0.h); }
    }
    cores.esquema = esq;
    return M.tiraVerde(cores, o.pessoa ? base : null);
  };
  /* v3.43 · a checagem final das cores que o Studio gera (apoio e acento): o croma ou a volta pra dentro do sRGB podem
     empurrar a matiz pra perto do verde; aí ela volta pela regra. Fica de fora o que é da pessoa: a cor que ela escolheu
     e os tons dela (mesma matiz), que podem ser verdes porque foi ela que quis */
  M.tiraVerde = (cores, daPessoa) => {
    ['s', 'a'].forEach(q => {
      const x = cores[q] && lch(cores[q]); if(!x || x.c < 0.05) return;
      if(daPessoa && daPessoa.c > 0.03){ const d = Math.abs(x.h - daPessoa.h); if(Math.min(d, 360 - d) < 8) return; }
      const h2 = semVerde(x.h, x.l); if(h2 !== x.h) cores[q] = deLch(x.l, x.c, h2);
    });
    return cores;
  };
  /* tira as cores de um logo antigo (rebranding): agrupa os pixels no OKLab e devolve as mais presentes */
  M.coresDaImagem = img => {
    const cv = document.createElement('canvas'), k = Math.min(1, 160 / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
    cv.width = Math.max(1, Math.round((img.naturalWidth || img.width) * k)); cv.height = Math.max(1, Math.round((img.naturalHeight || img.height) * k));
    const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0, cv.width, cv.height);
    let px; try{ px = cx.getImageData(0, 0, cv.width, cv.height).data; }catch(e){ return []; }
    const pts = [];
    for(let i = 0; i < px.length; i += 4){
      if(px[i + 3] < 200) continue;
      const lab = oklab([px[i] / 255, px[i + 1] / 255, px[i + 2] / 255]);
      if(lab[0] > 0.95 && Math.hypot(lab[1], lab[2]) < 0.03) continue; /* fundo branco */
      pts.push(lab);
    }
    if(pts.length < 12) return [];
    let cs = [pts[0], pts[Math.floor(pts.length / 3)], pts[Math.floor(pts.length * 2 / 3)], pts[pts.length - 1]].map(p => p.slice());
    let grupo = new Array(pts.length).fill(0);
    for(let it = 0; it < 12; it++){
      grupo = pts.map(p => { let b = 0, bd = Infinity; cs.forEach((c, j) => { const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2; if(d < bd){ bd = d; b = j; } }); return b; });
      cs = cs.map((c, j) => { const m = pts.filter((p, i) => grupo[i] === j); if(!m.length) return c; return [0, 1, 2].map(k2 => m.reduce((s, p) => s + p[k2], 0) / m.length); });
    }
    const n = cs.map((c, j) => grupo.filter(g => g === j).length);
    return cs.map((c, j) => ({ hex: rgbHex(deLab(c[0], c[1], c[2])), n: n[j] })).filter(x => x.n > pts.length * 0.04).sort((a, b) => b.n - a.n)
      .filter((x, i, arr) => arr.findIndex(y => contraste(x.hex, y.hex) < 1.25) === i).slice(0, 4);
  };

  /* v3.40 · uma imagem de referência lida no aparelho: as cores fortes, a luz, o contraste, a saturação, se é quente
     e o quanto é "suja" (textura, grão, detalhe). Nada sobe: só esses números entram no motor */
  M.lerImagemRef = img => {
    const W0 = img.naturalWidth || img.width, H0 = img.naturalHeight || img.height; if(!W0 || !H0) return null;
    const cv = document.createElement('canvas'), k = Math.min(1, 96 / Math.max(W0, H0));
    cv.width = Math.max(4, Math.round(W0 * k)); cv.height = Math.max(4, Math.round(H0 * k));
    const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0, cv.width, cv.height);
    let d; try{ d = cx.getImageData(0, 0, cv.width, cv.height).data; }catch(e){ return null; }
    const W = cv.width, H = cv.height, n = W * H, Ls = new Float32Array(n); let sl = 0, sc = 0, quentes = 0, comCor = 0;
    for(let i = 0, p = 0; p < n; i += 4, p++){
      const lab = oklab([d[i] / 255, d[i + 1] / 255, d[i + 2] / 255]), c = Math.hypot(lab[1], lab[2]); Ls[p] = lab[0]; sl += lab[0]; sc += c;
      if(c > .04){ comCor++; const h = (Math.atan2(lab[2], lab[1]) * 180 / Math.PI + 360) % 360; if(h < 100 || h > 330) quentes++; }
    }
    const l = sl / n, c = sc / n; let v = 0; for(let p = 0; p < n; p++) v += (Ls[p] - l) ** 2;
    let ru = 0, nr = 0; for(let y = 1; y < H - 1; y++) for(let x = 1; x < W - 1; x++){ const p = y * W + x; ru += Math.abs(4 * Ls[p] - Ls[p - 1] - Ls[p + 1] - Ls[p - W] - Ls[p + W]); nr++; }
    const r3 = x => Math.round(x * 1000) / 1000;
    return { cores: M.coresDaImagem(cv).map(x => x.hex), l: r3(l), c: r3(c), contr: r3(Math.sqrt(v / n)), quente: r3(comCor ? quentes / comCor : 0), ruido: r3(nr ? ru / nr : 0) };
  };
  /* o nome de cada cor: a família pela matiz e pela luz, e um apelido que puxa pro nicho */
  /* o apelido depende da luz da cor: vivo, escuro ou claro (um azul elétrico não é "madrugada") */
  const APELIDO = {
    vermelho: { vivo: ['Pimenta', 'Tomate', 'Sinal', 'Paixão', 'Brasa'], escuro: ['Ferrugem', 'Tijolo', 'Rubi'], claro: ['Melancia', 'Morango'] },
    laranja: { vivo: ['Fogo', 'Laranjada', 'Abóbora', 'Pôr do Sol', 'Cone'], escuro: ['Telha', 'Tijolo'], claro: ['Pêssego', 'Damasco'] },
    amarelo: { vivo: ['Gema', 'Sol', 'Táxi', 'Milho', 'Canário'], escuro: ['Mostarda'], claro: ['Manteiga', 'Baunilha'] },
    ouro: { vivo: ['Ouro', 'Mel', 'Trigo'], escuro: ['Bronze', 'Ocre'], claro: ['Palha', 'Champanhe'] },
    verde: { vivo: ['Folha', 'Limão'], escuro: ['Mata'], claro: ['Menta'] },
    agua: { vivo: ['Piscina', 'Turquesa', 'Mar'], escuro: ['Abismo', 'Fundo do Mar'], claro: ['Água', 'Gelo'] },
    azul: { vivo: ['Elétrico', 'Anil', 'Cobalto', 'Jeans', 'Royal'], escuro: ['Madrugada', 'Oceano', 'Noite'], claro: ['Céu', 'Névoa', 'Bebê'] },
    roxo: { vivo: ['Uva', 'Ametista', 'Neon'], escuro: ['Açaí', 'Berinjela'], claro: ['Lavanda', 'Lilás'] },
    rosa: { vivo: ['Chiclete', 'Flamingo', 'Goiaba', 'Batom'], escuro: ['Framboesa', 'Amora'], claro: ['Algodão-doce', 'Pétala'] },
    marrom: { vivo: ['Caramelo', 'Canela', 'Terra'], escuro: ['Café', 'Couro', 'Cacau'], claro: ['Areia', 'Biscoito'] },
    escuro: ['Asfalto', 'Carvão', 'Nanquim', 'Noite', 'Grafite'], claro: ['Papel', 'Creme', 'Algodão', 'Areia', 'Marfim', 'Leite'], cinza: ['Concreto', 'Cimento', 'Fumaça', 'Aço']
  };
  M.nomeCor = (hex, seed) => {
    const { l, c, h } = lch(hex), r = M.rng(M.hash(hex + (seed || '')));
    let fam, nome;
    if(c < 0.035){ fam = l > 0.86 ? 'claro' : l < 0.3 ? 'escuro' : 'cinza'; nome = { claro: l > 0.95 ? 'Branco' : 'Creme', escuro: 'Preto', cinza: 'Cinza' }[fam]; }
    else if(l < 0.3 && c < 0.08){ fam = 'escuro'; nome = h > 200 && h < 300 ? 'Azul-noite' : 'Preto'; }
    else if(h < 35 || h >= 350){ if(l < 0.45 && c < 0.16){ fam = 'marrom'; nome = 'Vinho'; } else { fam = 'vermelho'; nome = 'Vermelho'; } }
    else if(h < 68){ if(l < 0.55){ fam = 'marrom'; nome = c < 0.1 ? 'Marrom' : 'Terracota'; } else { fam = 'laranja'; nome = 'Laranja'; } }
    else if(h < 100){ if(l < 0.72){ fam = 'ouro'; nome = 'Ouro'; } else { fam = 'amarelo'; nome = 'Amarelo'; } }
    else if(h < 172){ fam = 'verde'; nome = 'Verde'; }
    else if(h < 222){ fam = 'agua'; nome = l > 0.7 ? 'Azul-piscina' : 'Petróleo'; }
    else if(h < 272){ fam = 'azul'; nome = l < 0.35 ? 'Azul-marinho' : 'Azul'; }
    else if(h < 312){ fam = 'roxo'; nome = 'Roxo'; }
    else { fam = 'rosa'; nome = l < 0.5 ? 'Magenta' : 'Rosa'; }
    if(fam === 'claro' && c >= 0.012 && h > 40 && h < 110) nome = 'Creme';
    const ap = APELIDO[fam], lista = Array.isArray(ap) ? ap : (l < 0.45 ? ap.escuro : l > 0.84 ? ap.claro : ap.vivo);
    return nome + ' ' + M.pega(r, lista);
  };
})();

/* ---------------- SÍMBOLO: pictogramas, monograma, letra, geométrico ---------------- */
(function(){
  'use strict';
  const C = window.Corre, M = C.labMotor;
  const { parse, tr, caixa, mx } = M, F = M.forma;
  /* pictogramas em traço (grade 48, traço 3.6, ponta redonda). "l.01 0" vira um ponto */
  const engrenagem = () => { const pts = [], n = 8; for(let i = 0; i < n * 4; i++){ const a = (i / (n * 4)) * Math.PI * 2 - Math.PI / 2 + Math.PI / (n * 4); const r = (i % 4 === 0 || i % 4 === 1) ? 18 : 13.5; pts.push([24 + r * Math.cos(a), 24 + r * Math.sin(a)]); } return 'M' + pts.map(p => p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join('L') + 'Z M30 24a6 6 0 1 1-12 0a6 6 0 1 1 12 0Z'; };
  const sol = () => { let d = 'M32 24a8 8 0 1 1-16 0a8 8 0 1 1 16 0Z'; for(let i = 0; i < 8; i++){ const a = i * Math.PI / 4; d += `M${(24 + 13 * Math.cos(a)).toFixed(2)} ${(24 + 13 * Math.sin(a)).toFixed(2)}L${(24 + 19 * Math.cos(a)).toFixed(2)} ${(24 + 19 * Math.sin(a)).toFixed(2)}`; } return d; };
  const ICONES = {
    burger: { n: 'Hambúrguer', d: 'M8 21C8 12 15 7 24 7s16 5 16 14ZM7 27c3-3 5 3 8 0s5 3 8 0 5 3 8 0 5 3 8 0 3 2 3 2M8 33h32M9 38h30a4 4 0 0 1-4 4H13a4 4 0 0 1-4-4ZM19 13l.01 0M25 11l.01 0M29 15l.01 0' },
    pizza: { n: 'Pizza', d: 'M24 43L8 11c10-5 22-5 32 0ZM11 16c8-4 18-4 26 0M20 21l.01 0M28 24l.01 0M23 31l.01 0' },
    garfo: { n: 'Talheres', d: 'M15 6v10M11 6v9a4 4 0 0 0 8 0V6M15 19v23M33 42V6c4 3 6 9 6 16h-6' },
    chama: { n: 'Chama', d: 'M24 43c-8 0-14-6-14-13 0-7 5-11 8-17 1 4 3 6 5 7-.5-6 2-11 7-15 0 7 3 11 6 15 2 3 3 6 3 10 0 8-6 13-15 13ZM24 43c-3.5 0-6-2.4-6-6 0-4 3-5.8 4.5-9 2 2.5 7.5 4.7 7.5 9.3 0 3.2-2.6 5.7-6 5.7Z' },
    xicara: { n: 'Xícara', d: 'M8 19h26v9a11 11 0 0 1-11 11h-4A11 11 0 0 1 8 28ZM34 22h3a5 5 0 0 1 0 10h-3M6 44h32M15 6c-2 2 2 4 0 7M21 6c-2 2 2 4 0 7M27 6c-2 2 2 4 0 7' },
    trigo: { n: 'Trigo', d: 'M24 44V10M24 18c-5-1-7-5-7-9 4 0 7 4 7 9 5-1 7-5 7-9-4 0-7 4-7 9M24 27c-5-1-7-5-7-9 4 0 7 4 7 9 5-1 7-5 7-9-4 0-7 4-7 9M24 36c-5-1-7-5-7-9 4 0 7 4 7 9 5-1 7-5 7-9-4 0-7 4-7 9M24 10c-2-2-2-5 0-6 2 1 2 4 0 6' },
    pao: { n: 'Pão', d: 'M8 30c0-9 7-15 16-15s16 6 16 15v8a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3ZM17 22l3 4M23 20l3 4M29 22l3 4' },
    cupcake: { n: 'Cupcake', d: 'M12 27h24l-4 15H16ZM19 27l1.5 15M24 27v15M29 27l-1.5 15M10 27c-2-5 2-9 6-8 0-6 6-9 10-6 3-4 10-2 10 4 4 0 6 5 2 10M24 9l.01 0' },
    coracao: { n: 'Coração', d: 'M24 41S8 31 8 19a8 8 0 0 1 16-4 8 8 0 0 1 16 4c0 12-16 22-16 22Z' },
    estrela: { n: 'Estrela', d: 'M24 6l5.3 11.1 12.2 1.6-8.9 8.5 2.2 12.1L24 33.4l-10.8 5.9 2.2-12.1-8.9-8.5 12.2-1.6Z' },
    taca: { n: 'Drink', d: 'M8 8h32L24 26ZM24 26v14M16 42h16M30 4l-4 8' },
    raio: { n: 'Raio', d: 'M27 4L10 27h13l-3 17 18-24H25Z' },
    tesoura: { n: 'Tesoura', d: 'M19 36a6 6 0 1 1-12 0 6 6 0 1 1 12 0ZM41 36a6 6 0 1 1-12 0 6 6 0 1 1 12 0ZM17 31L36 6M31 31L12 6' },
    diamante: { n: 'Diamante', d: 'M14 9h20l8 10-18 23L6 19ZM6 19h36M19 9l-4 10 9 23M29 9l4 10-9 23' },
    coroa: { n: 'Coroa', d: 'M8 35L6 13l11 9 7-13 7 13 11-9-2 22ZM8 41h32' },
    camiseta: { n: 'Camiseta', d: 'M17 7L6 13l4 9 5-2v21h18V20l5 2 4-9-11-6c-1 4-4 6-7 6s-6-2-7-6Z' },
    skate: { n: 'Skate', d: 'M4 23c2 4 4 5 7 5h26c3 0 5-1 7-5M14 28v4M34 28v4M18 36a4 4 0 1 1-8 0 4 4 0 1 1 8 0ZM38 36a4 4 0 1 1-8 0 4 4 0 1 1 8 0Z' },
    haltere: { n: 'Haltere', d: 'M15 24h18M10 14h5v20h-5ZM33 14h5v20h-5ZM5 19v10M43 19v10' },
    dente: { n: 'Dente', d: 'M12 9c4-3 8-2 12 0 4-2 8-3 12 0 4 4 2 12 0 16-1 4-1 9-3 14-1 3-4 3-5 0l-2-8c-1-2-3-2-4 0l-2 8c-1 3-4 3-5 0-2-5-2-10-3-14-2-4-4-12 0-16Z' },
    folha: { n: 'Folha', d: 'M39 8C20 8 9 18 9 31c0 5 2 9 2 9s4-2 9-2c13 0 19-14 19-30ZM11 40c7-10 14-18 21-25' },
    pata: { n: 'Pata', d: 'M24 25c-6 0-11 6-11 11 0 4 3 5 6 4.5 2-.4 3.5-1 5-1s3 .6 5 1c3 .5 6-.5 6-4.5 0-5-5-11-11-11ZM12 21l.01 0M19 13l.01 0M29 13l.01 0M36 21l.01 0' },
    casa: { n: 'Casa', d: 'M6 23L24 8l18 15M11 19v22h26V19M20 41V30h8v11' },
    chave: { n: 'Chave', d: 'M23 24a8 8 0 1 1-16 0 8 8 0 1 1 16 0ZM23 24h19M36 24v6M41 24v5' },
    engrenagem: { n: 'Engrenagem', d: engrenagem() },
    codigo: { n: 'Código', d: 'M17 14L7 24l10 10M31 14l10 10-10 10M27 9l-6 30' },
    foguete: { n: 'Foguete', d: 'M24 5c7 6 9 14 8 24H16c-1-10 1-18 8-24ZM27 18a3 3 0 1 1-6 0 3 3 0 1 1 6 0ZM16 24l-6 8h7M32 24l6 8h-7M21 34c0 4 3 6 3 9 0-3 3-5 3-9' },
    olho: { n: 'Olho', d: 'M4 24s7-12 20-12 20 12 20 12-7 12-20 12S4 24 4 24ZM30 24a6 6 0 1 1-12 0 6 6 0 1 1 12 0Z' },
    camera: { n: 'Câmera', d: 'M7 16h8l3-4h12l3 4h8v24H7ZM31 28a7 7 0 1 1-14 0 7 7 0 1 1 14 0Z' },
    pincel: { n: 'Pincel', d: 'M40 6L24 22M21 21l6 6M22 25c-6-1-10 3-10 8 0 3-2 6-5 7 7 2 15 0 18-5 2-3 2-6 1-8' },
    lampada: { n: 'Lâmpada', d: 'M17 32c0-4-6-7-6-15a13 13 0 0 1 26 0c0 8-6 11-6 15ZM18 37h12M20 42h8M21 26l3-5 3 5' },
    microfone: { n: 'Microfone', d: 'M18 11a6 6 0 0 1 12 0v9a6 6 0 0 1-12 0ZM12 20a12 12 0 0 0 24 0M24 32v9M17 42h14' },
    fone: { n: 'Fone', d: 'M8 31v-7a16 16 0 0 1 32 0v7M6 28h8v13H9a3 3 0 0 1-3-3ZM42 28h-8v13h5a3 3 0 0 0 3-3Z' },
    onda: { n: 'Onda', d: 'M4 22c6 0 6-8 12-8s6 8 12 8 6-8 12-8 4 4 4 4M4 34c6 0 6-8 12-8s6 8 12 8 6-8 12-8 4 4 4 4' },
    livro: { n: 'Livro', d: 'M24 12c-5-4-12-4-18-2v26c6-2 13-2 18 2 5-4 12-4 18-2V10c-6-2-13-2-18 2ZM24 12v26' },
    sol: { n: 'Sol', d: sol() },
    montanha: { n: 'Montanha', d: 'M4 40L18 16l8 12 5-7 13 19ZM14 23l4 3 4-3' },
    carro: { n: 'Carro', d: 'M6 32v-6l5-9h20l7 9h4a2 2 0 0 1 2 2v4H6ZM18 33a4 4 0 1 1-8 0 4 4 0 1 1 8 0ZM38 33a4 4 0 1 1-8 0 4 4 0 1 1 8 0ZM14 18l-3 7h22l-5-7' },
    sacola: { n: 'Sacola', d: 'M10 16h28l-2 26H12ZM18 16v-3a6 6 0 0 1 12 0v3' },
    copo: { n: 'Chope', d: 'M10 10h20v28a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3ZM30 16h4a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4h-4M16 17v17M24 17v17' }
  };
  M.ICONES = ICONES;
  /* os pictogramas que fazem sentido pra cada nicho */
  M.NICHOS = {
    comida: { n: 'Comida e lanche', ic: ['burger', 'pizza', 'garfo', 'chama'] }, cafe: { n: 'Café e padaria', ic: ['xicara', 'trigo', 'pao'] },
    doces: { n: 'Doces e confeitaria', ic: ['cupcake', 'coracao', 'estrela'] }, bebidas: { n: 'Bar e bebidas', ic: ['taca', 'copo', 'raio'] },
    beleza: { n: 'Beleza e estética', ic: ['tesoura', 'diamante', 'coroa'] }, moda: { n: 'Moda e streetwear', ic: ['camiseta', 'coroa', 'raio', 'skate'] },
    fitness: { n: 'Esporte e academia', ic: ['haltere', 'raio', 'chama'] }, saude: { n: 'Saúde e cuidado', ic: ['coracao', 'dente', 'folha'] },
    pet: { n: 'Pet', ic: ['pata', 'coracao', 'casa'] }, casa: { n: 'Casa, obra e imóveis', ic: ['casa', 'chave', 'engrenagem'] },
    tech: { n: 'Tecnologia', ic: ['codigo', 'raio', 'foguete', 'olho'] }, criativo: { n: 'Criativo, foto e vídeo', ic: ['camera', 'pincel', 'olho', 'lampada'] },
    musica: { n: 'Música e som', ic: ['microfone', 'fone', 'onda'] }, educacao: { n: 'Educação e cursos', ic: ['livro', 'lampada', 'estrela'] },
    agro: { n: 'Agro e campo', ic: ['trigo', 'sol', 'montanha', 'folha'] }, auto: { n: 'Carro, moto e frete', ic: ['carro', 'raio', 'engrenagem'] },
    servicos: { n: 'Serviços e consultoria', ic: ['chave', 'estrela', 'olho'] }, varejo: { n: 'Loja e varejo', ic: ['sacola', 'estrela', 'coracao'] },
    eventos: { n: 'Festa e eventos', ic: ['estrela', 'taca', 'coroa'] }, arte: { n: 'Arte, tattoo e artesanato', ic: ['pincel', 'olho', 'chama', 'diamante'] },
    outro: { n: 'Outro', ic: ['estrela', 'raio', 'coracao', 'sol'] }
  };
  const CACHE_IC = {};
  const icone = (k, x, y, tam) => { const i = ICONES[k] || ICONES.estrela; if(!CACHE_IC[k]) CACHE_IC[k] = parse(i.d); const e = tam / 48; return { cmds: tr(CACHE_IC[k], [e, 0, 0, e, x, y]), w: 3.6 * e }; };
  M.icone = icone;

  /* as formas de recipiente (caixa 100x100) */
  const FORMAS = {
    circulo: { n: 'Círculo', d: () => F.elipse(50, 50, 50), dentro: 0.7 },
    quadrado: { n: 'Quadrado', d: () => F.ret(0, 0, 100, 100, 18), dentro: 0.78 },
    squircle: { n: 'Ícone de app', d: () => F.squircle(50, 50, 50), dentro: 0.78 },
    hexagono: { n: 'Hexágono', d: () => F.regular(50, 50, 52, 6, -90), dentro: 0.66 },
    escudo: { n: 'Escudo', d: () => parse('M50 0 L96 14 L96 46 C96 74 76 92 50 100 C24 92 4 74 4 46 L4 14 Z'), dentro: 0.66 },
    arco: { n: 'Arco', d: () => parse('M0 100 L0 50 A50 50 0 0 1 100 50 L100 100 Z'), dentro: 0.72 },
    losango: { n: 'Losango', d: () => F.poli([[50, 0], [100, 50], [50, 100], [0, 50]]), dentro: 0.52 },
    ticket: { n: 'Tíquete', d: () => parse('M10 8 H90 A10 10 0 0 1 100 18 V40 A10 10 0 0 0 100 60 V82 A10 10 0 0 1 90 92 H10 A10 10 0 0 1 0 82 V60 A10 10 0 0 0 0 40 V18 A10 10 0 0 1 10 8 Z'), dentro: 0.7 },
    explosao: { n: 'Explosão', d: () => F.estrela(50, 50, 50, 41, 16, -90), dentro: 0.66 },
    gota: { n: 'Gota', d: () => parse('M50 0 C50 0 90 42 90 64 A40 36 0 0 1 10 64 C10 42 50 0 50 0 Z'), dentro: 0.56 }
  };
  M.FORMAS = FORMAS;

  /* encaixa um texto (já em curvas) no meio de uma caixa */
  function encaixa(t, cx, cy, maxW, maxH){
    const b = caixa(t.cmds); if(!b.w) return [];
    const e = Math.min(maxW / b.w, maxH / b.h);
    return tr(t.cmds, mx.x(mx.t(cx, cy), mx.x(mx.s(e), mx.t(-(b.x + b.w / 2), -(b.y + b.h / 2)))));
  }
  M.encaixa = encaixa;

  /* GEOMÉTRICO: grade 2x2 com peças (quarto de círculo, meio círculo, triângulo, quadrado, círculo, anel) */
  /* v3.43: as peças em células de 47 com junta de 6 (em uma cor só elas continuam separadas), no máximo dois tipos de
     peça (a composição fica um sistema, não um sorteio) e a célula vazia nunca na diagonal principal */
  function geo(seed, pers){
    const r = M.rng(seed), s = 47, passo = 53, els = [];
    const curvo = pers ? (1 - pers[4]) * 0.6 + (1 - pers[0]) * 0.4 : 0.5;
    const pecas = r() < curvo ? ['q', 'q', 'h', 'c', 'a', 's'] : ['t', 't', 'q', 's', 'h', 'c'];
    const duas = [M.pega(r, pecas)]; for(let k = 0; k < 6 && duas.length < 2; k++){ const p = M.pega(r, pecas); if(!duas.includes(p)) duas.push(p); }
    const papeis = ['marca', 'marca', 'sec', 'acento'];
    const celulas = [[0, 0], [1, 0], [0, 1], [1, 1]];
    let vazias = 0;
    celulas.forEach(([i, j], n) => {
      const x = i * passo, y = j * passo, o = Math.floor(r() * 4);
      const p = M.pega(r, duas);
      if(r() < 0.12 && vazias < 1 && i !== j){ vazias++; return; }
      let d;
      if(p === 'q'){ const cx = x + (o === 1 || o === 2 ? s : 0), cy = y + (o >= 2 ? s : 0); const sx = cx === x ? 1 : -1, sy = cy === y ? 1 : -1; d = parse(`M${cx} ${cy} L${cx + sx * s} ${cy} A${s} ${s} 0 0 ${sx * sy > 0 ? 1 : 0} ${cx} ${cy + sy * s} Z`); }
      else if(p === 'h'){ const lado = o; d = lado === 0 ? parse(`M${x} ${y + s} A${s / 2} ${s / 2} 0 0 1 ${x + s} ${y + s} Z`) : lado === 1 ? parse(`M${x} ${y} A${s / 2} ${s / 2} 0 0 0 ${x + s} ${y} Z`) : lado === 2 ? parse(`M${x} ${y} A${s / 2} ${s / 2} 0 0 1 ${x} ${y + s} Z`) : parse(`M${x + s} ${y} A${s / 2} ${s / 2} 0 0 0 ${x + s} ${y + s} Z`); }
      else if(p === 't'){ const c = [[x, y], [x + s, y], [x + s, y + s], [x, y + s]]; c.splice(o, 1); d = F.poli(c); }
      else if(p === 'c') d = F.elipse(x + s / 2, y + s / 2, s / 2);
      else if(p === 'a') d = F.anel(x + s / 2, y + s / 2, s / 2, s / 4);
      else d = F.ret(x, y, s, s, 0);
      els.push({ d, papel: papeis[(n + Math.floor(r() * 4)) % 4] });
    });
    if(!els.some(e => e.papel === 'marca')) els[0].papel = 'marca';
    return els;
  }

  /* PIXEL: ícones 8-bit desenhados casa por casa no Studio (# = cor da marca, + = acento) */
  const PX = {
    coracao: ['..##...##..', '.####.####.', '##.########', '#.#########', '###########', '.#########.', '..#######..', '...#####...', '....###....', '.....#.....'],
    estrela: ['.....#.....', '....###....', '....###....', '###########', '.#########.', '..#######..', '..#######..', '.####.####.', '.###...###.', '.##.....##.', '.#.......#.'],
    raio: ['......####.', '.....####..', '....####...', '...####....', '..#########', '.#########.', '......###..', '.....###...', '....###....', '...##......', '..#........'],
    coroa: ['#....#....#', '##..###..##', '###.###.###', '###########', '#+###+###+#', '###########', '...........', '###########'],
    burger: ['...#####...', '.#########.', '##.###.####', '#####.###.#', '###########', '...........', '+++++++++++', '###########', '###########', '...........', '###########', '.#########.'],
    xicara: ['..#..#..#..', '.#..#..#...', '..#..#..#..', '...........', '#########..', '##########.', '#########.#', '#########.#', '##########.', '.#######...', '..#####....', '##########.'],
    chama: ['.....#.....', '....##.....', '....###....', '...####.#..', '...######..', '..#######..', '.####+####.', '.###+++###.', '.##+++++##.', '.##+++++##.', '..##+++##..', '...#####...'],
    diamante: ['..#######..', '.#+#####+#.', '###########', '.#########.', '..#######..', '...#####...', '....###....', '.....#.....'],
    nota: ['...########', '...########', '...#......#', '...#......#', '...#......#', '.###....###', '####...####', '####...####', '.##.....##.'],
    foguete: ['.....#.....', '....###....', '...#####...', '...##.##...', '...#####...', '...#####...', '..#######..', '.##.###.##.', '.#..###..#.', '....+.+....', '...+...+...'],
    olho: ['....#####....', '..##.....##..', '.#...###...#.', '#...##+##...#', '.#...###...#.', '..##.....##..', '....#####....'],
    pata: ['..##...##..', '.####.####.', '.####.####.', '..##...##..', '##.......##', '##..###..##', '...#####...', '..#######..', '.#########.', '.#########.', '..###.###..'],
    casa: ['.....#.....', '....###....', '...#####...', '..#######..', '.#########.', '###########', '.#########.', '.#++###++#.', '.#++###++#.', '.###...###.', '.###...###.'],
    chave: ['..####.....', '.##..##....', '##....#####', '##....#####', '.##..##.#.#', '..####..#.#'],
    gota: ['.....#.....', '....###....', '....###....', '...#####...', '..#######..', '.##.######.', '.##.######.', '.#########.', '..#######..', '...#####...'],
    taca: ['###########', '.#+++++++#.', '..#+++++#..', '...#+++#...', '....###....', '.....#.....', '.....#.....', '.....#.....', '...#####...'],
    pizza: ['###########', '#+++++++++#', '.#++#++++#.', '.#+++++#+#.', '..#++#++#..', '..#+++++#..', '...#+#+#...', '...#+++#...', '....#+#....', '....#+#....', '.....#.....'],
    cupcake: ['.....+.....', '....+++....', '..#######..', '.#########.', '###########', '###########', '.+++++++++.', '.+.+.+.+.+.', '..+++++++..', '..+.+.+.+..', '...+++++...'],
    haltere: ['.##.....##.', '###.....###', '###########', '###.....###', '.##.....##.'],
    camera: ['..###......', '###########', '####...####', '###.###.###', '###.###.###', '####...####', '###########'],
    livro: ['.####.####.', '#....#....#', '#.##.#.##.#', '#....#....#', '#.##.#.##.#', '#....#....#', '.####.####.'],
    lampada: ['...#####...', '..##+++##..', '.##+++++##.', '.##+++++##.', '..##+++##..', '...#####...', '....###....', '....###....', '.....#.....'],
    carro: ['...#####...', '..#++#++#..', '.#########.', '###########', '###########', '.##.....##.', '.##.....##.'],
    sacola: ['...#####...', '...#...#...', '.#########.', '.#########.', '.#########.', '.#########.', '.#########.', '.#########.']
  };
  const PXDE = { burger: 'burger', pizza: 'pizza', garfo: 'burger', chama: 'chama', xicara: 'xicara', trigo: 'xicara', pao: 'xicara', cupcake: 'cupcake', coracao: 'coracao', estrela: 'estrela',
    taca: 'taca', raio: 'raio', tesoura: 'diamante', diamante: 'diamante', coroa: 'coroa', camiseta: 'estrela', skate: 'raio', haltere: 'haltere', dente: 'coracao', folha: 'gota', pata: 'pata',
    casa: 'casa', chave: 'chave', engrenagem: 'chave', codigo: 'raio', foguete: 'foguete', olho: 'olho', camera: 'camera', pincel: 'gota', lampada: 'lampada', microfone: 'nota', fone: 'nota',
    onda: 'nota', livro: 'livro', sol: 'estrela', montanha: 'estrela', carro: 'carro', sacola: 'sacola', copo: 'taca' };
  M.PX = PX; M.pxDe = k => PXDE[k] || (PX[k] ? k : 'estrela');
  /* o ícone em quadradinhos (as casas iguais lado a lado viram um retângulo só); moldura = borda de pixel em volta */
  function pixel(s){
    const g = PX[M.pxDe(s.icone)], h = g.length, w = g[0].length, moldura = s.forma === 'moldura';
    const N = Math.max(w, h) + (moldura ? 4 : 0), p = 100 / N, ox = Math.floor((N - w) / 2) * p, oy = Math.floor((N - h) / 2) * p, els = [];
    g.forEach((linha, y) => { let x = 0; while(x < w){ const c = linha[x]; if(c !== '#' && c !== '+'){ x++; continue; } let x2 = x; while(x2 < w && linha[x2] === c) x2++; els.push({ d: F.ret(ox + x * p, oy + y * p, (x2 - x) * p + 0.02, p + 0.02, 0), papel: c === '+' ? 'acento' : 'marca' }); x = x2; } });
    if(moldura){ const a = 0, b = (N - 1) * p; els.push({ d: F.ret(a + p, a, b - p, p, 0), papel: 'marca' }, { d: F.ret(a + p, b, b - p, p, 0), papel: 'marca' }, { d: F.ret(a, a + p, p, b - p, 0), papel: 'marca' }, { d: F.ret(b, a + p, p, b - p, 0), papel: 'marca' }); }
    return els;
  }
  /* IDEIAS: marcas mínimas, cada uma é um conceito (caixa 100x100, desenhadas a régua e compasso).
     Sólida: forma cheia e o detalhe vazado. Linha: o mesmo desenho em traço (o vazado vira linha).
     redonda = lê como um O dentro da palavra (grelha, onda, lua, vinil); o sol tem uma versão própria pra isso (noO) */
  const P = d => M.parse(d), rot = (cmds, g) => tr(cmds, mx.r(g, 50, 50));
  const IDEIAS = {
    /* os três riscos passam do disco e são cortados por ele, com ponta reta: morrem juntos na borda, como a marca da grelha */
    grelha: { n: 'Grelha', redonda: true, t: 'um círculo cortado por três riscos na diagonal: a marca da grelha, o selo de quem leva a brasa a sério', el: () => { const c = F.elipse(50, 50, 46); return [{ d: c, papel: 'marca' }].concat([-17, 0, 17].map(o => ({ d: rot(F.linha(-10, 50 + o, 110, 50 + o), -45), papel: 'furo', traco: 7.5, clip: c, ponta: 'butt' }))); } },
    chama: { n: 'Chama', t: 'uma chama dentro da outra: o fogo de fora e o calor de dentro', el: () => [{ d: P('M54 3 C58 20 74 30 81 46 C89 64 84 82 70 91 C63 95 57 97 50 97 C33 97 17 85 17 65 C17 50 25 40 33 31 C33 41 37 47 43 50 C39 33 44 16 54 3 Z'), papel: 'marca' }, { d: P('M51 54 C57 62 64 68 64 77 A14 14 0 0 1 36 77 C36 71 39 67 43 63 C45 67 47 68 49 69 C47 64 48 59 51 54 Z'), papel: 'furo' }] },
    grao: { n: 'Grão', t: 'o grão de café desenhado com duas curvas: o começo de tudo, antes da torra', el: () => [{ d: rot(F.elipse(50, 50, 31, 46), 32), papel: 'marca' }, { d: rot(P('M50 6 C37 30 63 70 50 94'), 32), papel: 'furo', traco: 6 }] },
    xicara: { n: 'Xícara', slot: [17, 38, 54, 30], tira: [2], t: 'a xícara reduzida a três formas e um fio de vapor: a pausa do dia num desenho só', el: () => [{ d: P('M12 34 H76 V54 C76 73 62 86 44 86 C26 86 12 73 12 54 Z'), papel: 'marca' }, { d: F.anel(78, 52, 13, 6.5), papel: 'marca' }, { d: P('M44 6 C37 14 51 19 44 27'), papel: 'acento', traco: 5 }, { d: F.ret(4, 90, 80, 6, 3), papel: 'marca' }] },
    bala: { n: 'Bala', t: 'a bala embrulhada: um círculo e duas pontas de papel torcido. É doce antes de ser marca', el: () => { const c = F.elipse(50, 50, 25); return [{ d: c, papel: 'marca' }, { d: F.poli([[28, 50], [5, 31], [5, 69]]), papel: 'marca' }, { d: F.poli([[72, 50], [95, 31], [95, 69]]), papel: 'marca' }, { d: P('M39 57 A13 13 0 0 1 61 43'), papel: 'furo', traco: 5, clip: c }]; } },
    coracao: { n: 'Coração', slot: [27, 32, 46, 30], t: 'um coração feito de dois círculos e um ponto: o desenho mais simples do cuidado', el: () => [{ d: P('M50 88 L16.5 50.5 A20 20 0 1 1 50 28 A20 20 0 1 1 83.5 50.5 Z'), papel: 'marca' }] },
    onda: { n: 'Onda', redonda: true, t: 'o sol sobre o mar: um círculo cortado por duas ondas', el: () => { const c = F.elipse(50, 50, 46); return [{ d: c, papel: 'marca' }, { d: P('M0 56 C16 47 34 47 50 56 S84 65 100 56'), papel: 'furo', traco: 6.5, clip: c }, { d: P('M0 74 C16 65 34 65 50 74 S84 83 100 74'), papel: 'furo', traco: 6.5, clip: c }]; } },
    /* v3.43: sem os raios em cima da meia-lua (liam como campainha de balcão de hotel): o sol inteiro, cortado por baixo
       pelas faixas do horizonte, como sol de cartaz */
    sol: { n: 'Sol no horizonte', redonda: true, noO: () => { const c = F.elipse(50, 50, 46); return [{ d: c, papel: 'marca' }, { d: F.ret(0, 60, 100, 7, 0), papel: 'furo', clip: c }, { d: F.ret(0, 75, 100, 7, 0), papel: 'furo', clip: c }]; }, t: 'o sol inteiro, cortado por baixo pelas faixas do horizonte: começo de dia, calor e trabalho', el: () => { const c = F.elipse(50, 50, 46); return [{ d: c, papel: 'marca' }].concat([[56, 5], [68, 6.5], [81, 8]].map(([y, h]) => ({ d: F.ret(-2, y, 104, h, 0), papel: 'furo', clip: c }))); } },
    lua: { n: 'Lua', redonda: true, solida: true, t: 'uma lua crescente e uma faísca: a noite começando', el: () => [{ d: F.elipse(46, 52, 41), papel: 'marca' }, { d: F.elipse(63, 41, 34), papel: 'furo' }, { d: P('M80 62 Q81.5 72.5 92 74 Q81.5 75.5 80 86 Q78.5 75.5 68 74 Q78.5 72.5 80 62 Z'), papel: 'acento' }] },
    estrela4: { n: 'Brilho', t: 'um brilho de quatro pontas: o instante em que alguma coisa fica bonita', el: () => [{ d: P('M50 4 Q56 44 96 50 Q56 56 50 96 Q44 56 4 50 Q44 44 50 4 Z'), papel: 'marca' }, { d: P('M84 6 Q85.5 14.5 94 16 Q85.5 17.5 84 26 Q82.5 17.5 74 16 Q82.5 14.5 84 6 Z'), papel: 'acento' }] },
    estrela: { n: 'Estrela', t: 'uma estrela de cinco pontas, cheia: nota máxima, sem explicação', el: () => [{ d: F.estrela(50, 53, 47, 20, 5, -90), papel: 'marca' }] },
    cursor: { n: 'Cursor', t: 'o sinal de "maior que" e o cursor piscando: a linha de comando, onde tudo começa a ser feito', el: () => [{ d: P('M16 24 L44 50 L16 76'), papel: 'marca', traco: 11, ponta: 'square' }, { d: F.ret(54, 66, 32, 11, 2), papel: 'acento' }] },
    grade: { n: 'Grade', t: 'uma grade de nove pontos com um aceso: dado organizado e o que importa em destaque', el: () => { const o = []; [22, 50, 78].forEach((y, j) => [22, 50, 78].forEach((x, i) => o.push({ d: F.elipse(x, y, 8.5), papel: i === 2 && j === 0 ? 'acento' : 'marca' }))); return o; } },
    avanco: { n: 'Avanço', so: ['auto'], t: 'duas setas de avanço, uma na frente da outra: movimento sem precisar de palavra', el: () => [{ d: P('M8 18 H32 L58 50 L32 82 H8 L34 50 Z'), papel: 'marca' }, { d: P('M44 18 H68 L94 50 L68 82 H44 L70 50 Z'), papel: 'acento' }] },
    faixas: { n: 'Faixas', so: ['auto'], t: 'três faixas inclinadas, cada uma mais curta: a velocidade deixando rastro', el: () => [[24, 92], [46, 72], [68, 52]].map(([y, w], i) => ({ d: F.poli([[96 - w + 8, y], [96, y], [88, y + 12], [96 - w, y + 12]]), papel: i ? 'marca' : 'acento' })) },
    diamante: { n: 'Lapidado', t: 'uma pedra lapidada em poucas faces: valor que se vê de longe', el: () => [{ d: P('M24 16 H76 L95 40 L50 90 L5 40 Z'), papel: 'marca' }, { d: P('M5 40 H95 M30 40 L50 90 L70 40 M24 16 L30 40 L50 16 L70 40 L76 16'), papel: 'furo', traco: 3.6 }] },
    coroa: { n: 'Coroa', t: 'uma coroa de três pontas: quem manda no próprio bairro', el: () => [{ d: P('M10 74 L10 28 L32 50 L50 18 L68 50 L90 28 L90 74 Z'), papel: 'marca' }, { d: F.ret(10, 81, 80, 8, 2), papel: 'marca' }, { d: F.elipse(50, 9, 6), papel: 'acento' }] },
    cone: { n: 'Cone', so: ['casa', 'auto'], t: 'o cone de obra: a rua em construção, o aviso de que tem coisa acontecendo', el: () => { const c = P('M40 8 H60 L80 82 H20 Z'); return [{ d: c, papel: 'marca' }, { d: F.ret(10, 30, 80, 11, 0), papel: 'furo', clip: c }, { d: F.ret(10, 54, 80, 11, 0), papel: 'furo', clip: c }, { d: F.ret(8, 84, 84, 9, 2), papel: 'marca' }]; } },
    seta: { n: 'Seta', t: 'a seta pintada no asfalto, virando: o caminho certo, mesmo quando faz curva', el: () => [{ d: P('M22 94 V48 A22 22 0 0 1 44 26 H60 V8 L92 37 L60 66 V48 H48 A4 4 0 0 0 44 52 V94 Z'), papel: 'marca' }] },
    vinil: { n: 'Vinil', redonda: true, t: 'o disco de vinil: o sulco, o selo no meio e o furo do eixo. O som antes de tocar', el: () => [{ d: F.elipse(50, 50, 46), papel: 'marca' }, { d: F.elipse(50, 50, 33), papel: 'furo', traco: 2.6, vazio: true }, { d: F.elipse(50, 50, 15), papel: 'acento' }, { d: F.elipse(50, 50, 3.4), papel: 'furo' }] },
    /* v3.73: o ponto com três arcos saindo dele lia como o ícone do Wi-Fi. O som agora é o equalizador: barras de alturas
       diferentes, a do meio na cor de acento, como o painel da mesa quando a música toca */
    ondas: { n: 'Equalizador', solida: true, t: 'as barras do equalizador subindo e descendo, a mais alta acesa: o som tocando agora', el: () => [[8, 36], [26, 62], [44, 88], [62, 54], [80, 72]].map(([x, h], i) => ({ d: F.ret(x, 94 - h, 12, h, 6), papel: i === 2 ? 'acento' : 'marca' })) },
    cruz: { n: 'Cruz', t: 'a cruz de cuidado vazada num círculo: saúde sem drama, de perto', el: () => [{ d: F.elipse(50, 50, 46), papel: 'marca' }, { d: F.ret(42, 22, 16, 56, 4), papel: 'furo' }, { d: F.ret(22, 42, 56, 16, 4), papel: 'furo' }] },
    folha: { n: 'Folha', t: 'uma folha em duas curvas e o veio no meio: o que nasce da terra', el: () => [{ d: P('M16 84 C16 40 46 14 88 14 C88 58 58 84 16 84 Z'), papel: 'marca' }, { d: P('M24 76 C44 58 62 40 80 22'), papel: 'furo', traco: 4.5 }] },
    pata: { n: 'Pata', t: 'a pata de bicho em cinco formas: carinho que se reconhece de longe', el: () => [{ d: F.elipse(50, 67, 23, 19), papel: 'marca' }, { d: F.elipse(20, 42, 9, 11), papel: 'marca' }, { d: F.elipse(37, 23, 9.5, 12), papel: 'marca' }, { d: F.elipse(63, 23, 9.5, 12), papel: 'marca' }, { d: F.elipse(80, 42, 9, 11), papel: 'marca' }] },
    taca: { n: 'Taça', so: ['bebidas', 'eventos'], t: 'a taça de coquetel em linhas puras e a azeitona no ponto: a noite servida', el: () => [{ d: P('M12 14 H88 L50 54 Z'), papel: 'marca' }, { d: F.ret(47, 52, 6, 30, 0), papel: 'marca' }, { d: F.ret(30, 82, 40, 6, 3), papel: 'marca' }, { d: F.elipse(66, 24, 7), papel: 'acento' }] },
    cabide: { n: 'Cabide', t: 'o cabide em uma linha só: a roupa que ainda vai encontrar um dono', el: () => [{ d: P('M50 34 V27 A9 9 0 1 1 59 18'), papel: 'marca', traco: 5.5 }, { d: P('M50 34 L8 68 H92 Z'), papel: 'marca', traco: 5.5, vazio: true }] },
    casa: { n: 'Casa', slot: [22, 50, 56, 36], tira: [1], t: 'a casa reduzida a cinco linhas e uma porta: o lugar onde a gente chega', el: () => [{ d: P('M50 8 L92 44 V92 H8 V44 Z'), papel: 'marca' }, { d: F.ret(40, 58, 20, 34, 0), papel: 'furo' }] },
    quadro: { n: 'Enquadramento', t: 'os quatro cantos do visor e o ponto de foco no meio: o olhar que escolhe o que mostrar', el: () => ['M8 30 V8 H30', 'M70 8 H92 V30', 'M92 70 V92 H70', 'M30 92 H8 V70'].map(d => ({ d: P(d), papel: 'marca', traco: 8, ponta: 'square' })).concat([{ d: F.elipse(50, 50, 9), papel: 'acento' }]) },
    livro: { n: 'Livro aberto', t: 'o livro aberto em duas páginas: aprender como quem conversa', el: () => [{ d: P('M6 22 L47 29 V88 L6 81 Z'), papel: 'marca' }, { d: P('M94 22 L53 29 V88 L94 81 Z'), papel: 'marca' }] },
    check: { n: 'Feito', t: 'o sinal de feito vazado num círculo: o serviço resolvido de primeira', el: () => [{ d: F.elipse(50, 50, 46), papel: 'marca' }, { d: P('M28 52 L43 67 L73 35'), papel: 'furo', traco: 9 }] },
    sacola: { n: 'Sacola', t: 'a sacola e a alça: a compra indo pra casa', el: () => [{ d: P('M34 40 V30 A16 16 0 0 1 66 30 V40'), papel: 'marca', traco: 6.5 }, { d: F.ret(14, 38, 72, 54, 5), papel: 'marca' }] },
    gota: { n: 'Gota', slot: [29, 50, 42, 34], tira: [1], t: 'uma gota de tinta com o brilho de quem acabou de cair: o começo de qualquer desenho', el: () => [{ d: P('M50 6 C50 6 84 44 84 64 A34 34 0 0 1 16 64 C16 44 50 6 50 6 Z'), papel: 'marca' }, { d: P('M33 64 A17 17 0 0 0 45 80'), papel: 'furo', traco: 4.5 }] },
    /* v3.43 · as ideias que saem do nome e do ofício. Mesma gramática: caixa 100, forma cheia e o detalhe vazado (todo
       vazado com 6 ou mais, pra ainda ler a 32 px); a versão em linha sai do M.ideia */
    prumo: { n: 'Prumo', slot: [35, 39, 30, 24], tira: [3], t: 'o prumo de pedreiro: um fio descendo reto e o peso que não deixa mentir. É a régua de quem faz direito', el: () => { const corpo = P('M34 36 H66 Q72 36 72 42 V50 L52.5 93 Q50 98 47.5 93 L28 50 V42 Q28 36 34 36 Z'); return [{ d: F.ret(48.5, 3, 3, 26, 0), papel: 'marca' }, { d: F.ret(42, 26, 16, 8, 2), papel: 'marca' }, { d: corpo, papel: 'marca' }, { d: F.ret(10, 50, 80, 6.5, 0), papel: 'furo', clip: corpo }]; } },
    /* v3.43: o pilar em cima do bloco lia como carimbo. O alicerce é a base de tijolo em três fiadas, cada uma mais curta,
       com as juntas desencontradas como na obra de verdade */
    base: { n: 'Alicerce', t: 'três fiadas de tijolo, a de baixo mais larga, com as juntas desencontradas como na obra: o que segura a casa antes de qualquer parede', slot: null, el: () => { const o = [{ d: F.ret(30, 20, 40, 24, 1.5), papel: 'marca' }, { d: F.ret(17, 48, 66, 22, 1.5), papel: 'marca' }, { d: F.ret(4, 74, 92, 22, 1.5), papel: 'marca' }];
      [[50, 20, 24], [39, 48, 22], [61, 48, 22], [27, 74, 22], [50, 74, 22], [73, 74, 22]].forEach(([x, y, h]) => o.push({ d: F.ret(x - 2, y - 1, 4, h + 2, 0), papel: 'furo' })); return o; } },
    /* v3.73: a fenda começava na borda de cima e partia o quadrado em dois (grande, lia como duas peças soltas, um "N").
       Agora ela nasce embaixo da verga: o batente fica inteiro e a luz abre até o chão */
    fresta: { n: 'Fresta', t: 'a luz entrando pela porta entreaberta: um feixe que sai de uma fenda e abre no chão', el: () => { const q = F.ret(8, 8, 84, 84, 6); return [{ d: q, papel: 'marca' }, { d: F.poli([[46, 24], [54, 24], [74, 92], [30, 92]]), papel: 'furo', clip: q }]; } },
    morro: { n: 'Morro', slot: [14, 52, 42, 24], t: 'dois morros, um atrás do outro, em cima da linha do chão: o lugar de onde a marca vem', el: () => { const fr = 'M2 80 C5 55 19 38 36 38 C53 38 67 55 70 80'; return [{ d: P('M34 80 C37 47 51 20 66 20 C81 20 95 47 98 80 Z'), papel: 'acento' }, { d: P(fr), papel: 'furo', traco: 7 }, { d: P(fr + ' Z'), papel: 'marca' }, { d: F.ret(2, 84, 96, 7, 0), papel: 'marca' }]; } },
    /* v3.43: a agulha de tatuagem (não a de costura): o grip com três frisos, a ponta afinando e a gota de tinta saindo dela.
       É a fusão do ofício com o que ele deixa */
    agulha: { n: 'Agulha e tinta', t: 'a agulha de tatuagem na diagonal, com o grip de frisos e a gota de tinta saindo da ponta: o traço que fica pra sempre', el: () => { const g = 28, o = [{ d: F.ret(41, 2, 18, 38, 5), papel: 'marca' }, { d: F.poli([[42.5, 42], [57.5, 42], [51.4, 79], [48.6, 79]]), papel: 'marca' }, { d: P('M50 82 C50 82 57.5 90.5 57.5 94.5 A7.5 7.5 0 0 1 42.5 94.5 C42.5 90.5 50 82 50 82 Z'), papel: 'acento' }];
      [12, 21, 30].forEach(y => o.push({ d: F.ret(38, y, 24, 3.4, 0), papel: 'furo' })); return o.map(e => Object.assign(e, { d: rot(e.d, g) })); } },
    laje: { n: 'Laje', slot: [22, 50, 56, 38], tira: [5, 6], t: 'a casa de bloco com a laje passando dos lados, a caixa-d\'água em cima e o ferro esperando o próximo andar', el: () => [{ d: F.ret(16, 44, 68, 50, 0), papel: 'marca' }, { d: F.ret(6, 34, 88, 10, 0), papel: 'marca' }, { d: F.ret(58, 16, 22, 16, 3), papel: 'acento' }, { d: F.linha(22, 33, 22, 18), papel: 'marca', traco: 4, ponta: 'butt' }, { d: F.linha(32, 33, 32, 22), papel: 'marca', traco: 4, ponta: 'butt' }, { d: F.ret(28, 64, 15, 30, 0), papel: 'furo' }, { d: F.ret(54, 58, 18, 13, 0), papel: 'furo' }] },
    /* v3.43: o nó na cor da faixa (de outra cor ele virava laço de presente), separado por um vão; as pontas caindo abertas e
       os dois graus de faixa na ponta da direita */
    faixa: { n: 'Faixa', t: 'a faixa amarrada: a tira, o nó no meio, as duas pontas caindo e os graus na ponta. É o tempo de quem treinou', el: () => { const pe = F.poli([[45, 52], [55, 52], [37, 95], [27, 90]]), pd = F.poli([[45, 52], [55, 52], [73, 90], [63, 95]]);
      return [{ d: F.ret(2, 32, 96, 17, 3), papel: 'marca' }, { d: pe, papel: 'marca' }, { d: pd, papel: 'marca' }, { d: F.ret(35.5, 22, 4, 36, 0), papel: 'furo' }, { d: F.ret(60.5, 22, 4, 36, 0), papel: 'furo' }, { d: F.ret(36, 53.5, 28, 4, 0), papel: 'furo' }, { d: F.ret(40, 25, 20, 30, 4), papel: 'marca' }
      ].concat([[63, 80.5], [65.4, 86.5]].map(([x, y]) => ({ d: tr(F.ret(x - 20, y - 1.8, 40, 3.6, 0), mx.r(-24, x, y)), papel: 'furo', clip: pd }))); } },
    focinho: { n: 'Focinho', noO: () => [{ d: P('M14 26 H86 Q100 26 92 40 L60 80 Q50 92 40 80 L8 40 Q0 26 14 26 Z'), papel: 'marca' }, { d: F.elipse(32, 40, 8, 6), papel: 'furo' }], t: 'o focinho de frente: o nariz com brilho e a boca em um traço só. Alegria de quem chega abanando', el: () => [{ d: P('M24 24 H76 Q90 24 82 37 L58 66 Q50 75 42 66 L18 37 Q10 24 24 24 Z'), papel: 'marca' }, { d: F.elipse(34, 35, 7, 5), papel: 'furo' }, { d: P('M50 68 V80 M24 76 Q37 94 50 80 Q63 94 76 76'), papel: 'marca', traco: 7 }] },
    balao: { n: 'Prosa', slot: [12, 40, 52, 32], t: 'dois balões de conversa, um por cima do outro: a prosa que faz o cliente voltar', el: () => { const fr = P('M18 34 H58 Q70 34 70 46 V66 Q70 78 58 78 H34 L18 92 V78 Q6 76 6 66 V46 Q6 34 18 34 Z'); return [{ d: P('M42 8 H82 Q94 8 94 20 V40 Q94 52 82 52 H82 V66 L68 52 H42 Q30 52 30 40 V20 Q30 8 42 8 Z'), papel: 'acento' }, { d: fr, papel: 'furo', traco: 8 }, { d: fr, papel: 'marca' }]; } },
    /* v3.73: o de antes (aro grosso, cone e um vinco curvo no meio) lia como boca sorrindo, ainda mais dentro do selo. Agora é
       o coador de pano de verdade: o cabo de madeira saindo do aro, o pano caindo em cone com dois vincos RETOS fechando na
       ponta e a gota embaixo. Curva no meio, nunca mais */
    coador: { n: 'Coador', slot: [38, 25, 42, 20], tira: [3, 4], t: 'o coador de pano: o cabo de madeira, o aro, o pano caindo em cone e a primeira gota. O café no tempo dele', el: () => [{ d: F.ret(2, 15, 28, 8, 4), papel: 'marca' }, { d: F.ret(24, 12, 70, 9, 4.5), papel: 'marca' }, { d: P('M28 21 H90 C86 45 72 63 59 69 C46 63 32 45 28 21 Z'), papel: 'marca' }, { d: F.linha(45, 28, 55, 61), papel: 'furo', traco: 4.5, ponta: 'butt' }, { d: F.linha(73, 28, 63, 61), papel: 'furo', traco: 4.5, ponta: 'butt' }, { d: P('M59 76 C59 76 66.5 84.5 66.5 88.5 A7.5 7.5 0 0 1 51.5 88.5 C51.5 84.5 59 76 59 76 Z'), papel: 'acento' }] },
    navalha: { n: 'Navalha', t: 'a navalha aberta: a lâmina de fio reto, o pino e o cabo. O corte de quem faz há anos', el: () => [{ d: P('M20 31 Q50 23 84 24 C94 25 98 34 95 42 L93 48 H20 Z'), papel: 'marca' }, { d: tr(F.ret(17, 34, 74, 13, 6.5), mx.r(35, 25, 40.5)), papel: 'marca' }, { d: F.elipse(25, 40.5, 4.5), papel: 'furo' }] },
    dente: { n: 'Dente', slot: [26, 15, 48, 30], tira: [1], t: 'o dente desenhado em duas curvas e duas raízes, com o brilho de quem acabou de sair do consultório', el: () => [{ d: P('M18 24 C18 8 36 6 50 15 C64 6 82 8 82 24 C82 38 76 48 73 60 L67 89 C65 96 57 96 56 89 L53 68 C52 63 48 63 47 68 L44 89 C43 96 35 96 33 89 L27 60 C24 48 18 38 18 24 Z'), papel: 'marca' }, { d: P('M29 28 Q30 19 39 18'), papel: 'furo', traco: 6.5 }] },
    coluna: { n: 'Coluna', t: 'a coluna de pé: capitel, três caneluras e a base. O que sustenta sem precisar aparecer', el: () => [{ d: F.ret(12, 8, 76, 12, 2), papel: 'marca' }, { d: F.ret(22, 23, 56, 55, 0), papel: 'marca' }, { d: F.ret(12, 81, 76, 11, 2), papel: 'marca' }].concat([33, 50, 67].map(x => ({ d: F.ret(x - 3.5, 29, 7, 43, 3.5), papel: 'furo' }))) },
    /* v3.73 · mais ofício, menos clichê: o salão só tinha a tesoura (que fica de reserva) e saía com as seis alternativas só
       com o nome; a barbearia só tinha a navalha. Agora o salão tem o secador e o pente, e a barbearia tem o poste listrado */
    secador: { n: 'Secador', t: 'o secador de cabelo de lado: o corpo, o bico, o cabo e o vento saindo em três fios. O salão funcionando', el: () => [{ d: P('M26 18 H62 L80 24 V50 L62 56 H26 A19 19 0 0 1 26 18 Z'), papel: 'marca' }, { d: tr(F.ret(26, 46, 15, 46, 6), mx.r(-14, 33, 46)), papel: 'marca' }, { d: F.anel(26, 37, 10, 4.5), papel: 'furo' }, { d: F.ret(84, 27, 14, 5, 2.5), papel: 'acento' }, { d: F.ret(86, 35, 12, 5, 2.5), papel: 'acento' }, { d: F.ret(84, 43, 14, 5, 2.5), papel: 'acento' }] },
    pente: { n: 'Pente', t: 'o pente de dentes finos e o lombo cheio: o acabamento, o último toque antes do espelho', el: () => { const o = [{ d: F.ret(4, 22, 92, 20, 7), papel: 'marca' }]; for(let i = 0; i < 9; i++) o.push({ d: F.ret(8 + i * 10, 38, 6, i % 2 ? 40 : 46, 3), papel: 'marca' }); return o; } },
    poste: { n: 'Poste de barbeiro', t: 'o poste listrado da porta da barbearia: a cúpula, o cilindro com as listras subindo e a base. O sinal de que tem cadeira livre', el: () => { const c = F.ret(33, 20, 34, 62, 3); return [{ d: P('M30 20 A20 16 0 0 1 70 20 Z'), papel: 'marca' }, { d: F.ret(27, 16, 46, 7, 3.5), papel: 'marca' }, { d: c, papel: 'marca' }].concat([20, 38, 56, 74].map(y => ({ d: F.poli([[20, y + 14], [80, y - 6], [80, y + 4], [20, y + 24]]), papel: 'furo', clip: c })), [{ d: F.ret(27, 80, 46, 7, 3.5), papel: 'marca' }, { d: F.ret(36, 89, 28, 8, 3), papel: 'acento' }]); } },
    luva: { n: 'Luva', t: 'a luva de boxe de lado: o punho fechado, o polegar colado e o cano com o velcro. O treino de quem não foge da luta', el: () => [{ d: P('M28 12 C40 4 66 4 80 14 C92 22 94 42 86 56 C82 64 74 68 66 68 H36 C30 68 26 64 25 58 C17 57 11 50 12 42 C13 34 19 30 25 31 C24 24 24 16 28 12 Z'), papel: 'marca' }, { d: P('M25 31 C30 32 34 37 34 44'), papel: 'furo', traco: 5 }, { d: F.ret(30, 70, 40, 24, 4), papel: 'marca' }, { d: F.ret(30, 77, 40, 6, 0), papel: 'acento' }] },
    tesoura: { n: 'Tesoura', t: 'a tesoura aberta: duas argolas e as lâminas cruzando no pino. O ofício na mão', el: () => [{ d: F.poli([[38, 62], [46, 66], [86, 8], [80, 6]]), papel: 'marca' }, { d: F.poli([[62, 62], [54, 66], [14, 8], [20, 6]]), papel: 'marca' }, { d: F.anel(30, 76, 16, 8.5), papel: 'marca' }, { d: F.anel(70, 76, 16, 8.5), papel: 'marca' }, { d: F.elipse(50, 47, 4), papel: 'furo' }] },
    /* v3.43 · AS FUSÕES: duas ideias num desenho só (o que vem do nome com o que vem do ofício). É a fusão que faz o logo
       virar de autor; o motor só cai no pictograma sozinho quando não tem par */
    tigela: { n: 'Tigela do morro', t: 'a tigela de açaí servida em dois morros, um atrás do outro: o pote e o lugar de onde a marca vem, num desenho só', slot: [24, 68, 52, 20], el: () => { const fr = 'M6 58 C9 42 21 31 36 31 C51 31 61 42 64 58'; return [{ d: P('M30 58 C33 35 47 17 64 17 C81 17 92 36 95 58 Z'), papel: 'acento' }, { d: P(fr), papel: 'furo', traco: 7 }, { d: P(fr + ' Z'), papel: 'marca' }, { d: P('M3 64 H97 C95 82 76 95 50 95 C24 95 5 82 3 64 Z'), papel: 'marca' }]; } },
    solpauta: { n: 'Sol na pauta', t: 'o sol atrás das cinco linhas da pauta: onde as linhas passam, ele abre. A música e a luz no mesmo desenho', noO: () => { const c = F.elipse(50, 50, 46); return [{ d: c, papel: 'marca' }].concat([[52, 5], [63, 6], [75, 7.5]].map(([y, h]) => ({ d: F.ret(-2, y, 104, h, 0), papel: 'furo', clip: c }))); },
      el: () => { const c = F.elipse(50, 44, 37), ys = [46, 56, 66, 76, 86]; return [{ d: c, papel: 'acento' }].concat(ys.map(y => ({ d: F.ret(0, y, 100, 4.4, 0), papel: 'marca' })), ys.map(y => ({ d: F.ret(-2, y - 0.5, 104, 5.4, 0), papel: 'furo', clip: c }))); } },
    paoprosa: { n: 'Pão de prosa', t: 'o pão de pontas finas, com os três cortes da fornada, ganhando o rabinho do balão de conversa: o pão que sai do forno junto com a prosa', slot: [20, 32, 60, 26], tira: [1, 2, 3],
      el: () => [{ d: P('M2 47 C10 29 30 20 52 20 C74 20 92 29 98 44 C94 59 76 67 56 68 H42 L22 86 L27 67 C14 64 5 57 2 47 Z'), papel: 'marca' }].concat([[20, 50], [41, 47], [62, 45]].map(([x, y]) => ({ d: F.linha(x, y, x + 15, y - 17), papel: 'furo', traco: 6.5 }))) },
    /* o tatame visto de cima: quatro placas em roda em volta da meia placa do centro, como se monta o chão do dojo */
    tatame: { n: 'Tatame', t: 'o tatame visto de cima: quatro placas em roda em volta do quadrado do centro, do jeito que se monta o chão do dojo', slot: [38, 38, 24, 24], tira: [4],
      el: () => [{ d: F.ret(2, 2, 62, 30, 2), papel: 'marca' }, { d: F.ret(68, 2, 30, 62, 2), papel: 'marca' }, { d: F.ret(36, 68, 62, 30, 2), papel: 'marca' }, { d: F.ret(2, 36, 30, 62, 2), papel: 'marca' }, { d: F.ret(36, 36, 28, 28, 2), papel: 'acento' }],
      cheio: () => [{ d: F.ret(2, 2, 62, 30, 2), papel: 'marca' }, { d: F.ret(68, 2, 30, 62, 2), papel: 'marca' }, { d: F.ret(36, 68, 62, 30, 2), papel: 'marca' }, { d: F.ret(2, 36, 30, 62, 2), papel: 'marca' }, { d: F.ret(36, 36, 28, 28, 2), papel: 'marca' }] },
    /* a chapa que dá nome à casa, com o calor subindo dela: a grelha e o "quente" num desenho só */
    chapaquente: { n: 'Chapa quente', t: 'a marca da grelha num disco e o calor subindo dela em três fios: a chapa e o quente num desenho só', el: () => { const c = F.elipse(50, 64, 33); return [{ d: c, papel: 'marca' }].concat([-13, 0, 13].map(o => ({ d: rot(F.linha(4, 64 + o, 96, 64 + o), -45), papel: 'furo', traco: 6.5, clip: c, ponta: 'butt' })), [32, 50, 68].map(x => ({ d: P(`M${x} 26 C${x - 7} 20 ${x + 7} 14 ${x} 6`), papel: 'acento', traco: 6 }))); } },
    dentluz: { n: 'Dente de luz', t: 'o dente com uma fresta de luz entrando por cima e abrindo pra baixo: o sorriso que acende', el: () => [{ d: P('M18 24 C18 8 36 6 50 15 C64 6 82 8 82 24 C82 38 76 48 73 60 L67 89 C65 96 57 96 56 89 L53 68 C52 63 48 63 47 68 L44 89 C43 96 35 96 33 89 L27 60 C24 48 18 38 18 24 Z'), papel: 'marca' }, { d: F.poli([[48.4, 25], [51.6, 25], [58, 66], [42, 66]]), papel: 'furo' }] }
  };
  M.IDEIAS = IDEIAS;
  /* a ideia desenhada: sólida ou em linha (o cheio vira contorno, o vazado vira linha) */
  /* k = o traço da linha na caixa 100 (v3.43: sai da haste da letra do nome, pelo M.logo; sem ele, 4,5 como antes) */
  M.ideia = (k, estilo, noO, traco) => {
    const i = IDEIAS[k] || IDEIAS.estrela4, els = noO && i.noO ? i.noO() : i.el(), tk = traco || 4.5;
    if(estilo !== 'linha' || i.solida) return els;
    /* em linha: o cheio vira contorno; o risco vazado vira risco; a forma vazada vira forma cheia por dentro */
    return els.map(e => {
      if(e.papel === 'acento') return e;
      if(e.papel === 'furo') return e.traco ? Object.assign({}, e, { papel: 'marca', traco: traco ? Math.max(3.5, tk * 0.65) : Math.max(3.5, e.traco * 0.62) }) : Object.assign({}, e, { papel: 'marca' });
      if(e.traco) return Object.assign({}, e, traco && e.papel === 'marca' ? { traco: tk } : {});
      /* forma que já é fina (menos de 3 traços de largura) não vira contorno: com o traço da letra ela entupiria. Fica cheia,
         e lê como linha do mesmo peso */
      const b = caixa(e.d); if(Math.min(b.w, b.h) < tk * 3.2) return e;
      return Object.assign({}, e, { traco: tk, vazio: true });
    });
  };
  /* v3.43 · A LETRA DENTRO DA IDEIA: a ideia vira o recipiente e a inicial do próprio entra vazada nela (o P dentro do
     prumo, o M na tigela, o L na laje, P&P no pão). É a fusão de letra com objeto: o lugar do escudo com monograma,
     mas o escudo é o conceito da marca. Só nas ideias que têm um "miolo" grande o bastante (slot); o que atrapalharia a
     letra (a porta, o brilho, a cinta) sai. O alicerce é ao contrário: a inicial em pé sobre as fiadas de tijolo */
  M.cabeLetra = k => !!(IDEIAS[k] && (IDEIAS[k].slot || k === 'base'));
  M.ideiaLetra = (s, f, nome) => {
    /* (o número do nome, quando tem, é a "inicial" que entra: Tatame 43 leva o 43 no centro do tatame) */
    const num = (M.partes(nome).palavras.find(x => x.c === 'numero' && x.w.length <= 3) || {}).w;
    const id = IDEIAS[s.ideia], letras = [...(s.letras || num || M.iniciais(nome))].slice(0, 3).join(''), linha = s.estilo === 'linha';
    const t = M.texto(f, letras, { tam: 100, caixa: 'alta', track: [...letras].length > 1 ? 0.02 : 0 });
    if(s.ideia === 'base'){
      const d = encaixa(t, 50, 36, 76, 64), b = caixa(d), y0 = b.y + b.h + 6, w = Math.max(b.w + 34, 70), x0 = 50 - w / 2, out = [{ d, papel: 'marca' }];
      /* duas fiadas, juntas desencontradas: a de cima com junta no meio, a de baixo nos terços */
      out.push({ d: F.ret(x0 + 8, y0, w - 16, 12, 1), papel: 'marca' }, { d: F.ret(x0, y0 + 15, w, 12, 1), papel: 'marca' });
      [[50, y0], [x0 + w / 3, y0 + 15], [x0 + 2 * w / 3, y0 + 15]].forEach(([x, y]) => out.push({ d: F.ret(x - 1.8, y - 1, 3.6, 14, 0), papel: 'furo' }));
      return out;
    }
    /* a versão cheia (quando a ideia tem uma) já vem pronta pra receber a letra; da comum sai o que atrapalha (tira) */
    const [sx, sy, sw, sh] = id.slot, cheia = !linha && id.cheio, base = linha ? M.ideia(s.ideia, 'linha', false, s.traco) : cheia ? id.cheio() : id.el();
    const els = cheia ? base : base.filter((e, i) => !(id.tira || []).includes(i));
    els.push({ d: encaixa(t, sx + sw / 2, sy + sh / 2, sw, sh), papel: linha ? 'marca' : 'furo' });
    return els;
  };
  /* v3.43 · o molde só onde a letra aguenta: a fatia só em letra de estrutura horizontal ou redonda; o corte diagonal só em
     letra de haste reta. Fora disso a letra ganha a barra embaixo (que não quebra letra nenhuma) */
  M.detalheLetra = (detalhe, letra) => { const L0 = String(letra || '').normalize('NFD')[0] || '';
    if(detalhe === 'fatia' && !/[BCDEGOPQRS38]/.test(L0)) return 'barra';
    if(detalhe === 'corte' && !/[ILTHEFNMU]/.test(L0)) return 'barra';
    return detalhe; };
  /* a órbita só em inicial redonda (ou no nicho de tecnologia): é a letra que pede o anel em volta */
  /* v3.43: só em tecnologia (fora dela, anel com bolinha em volta da inicial é o carimbo de gerador) */
  M.orbitaCabe = (letra, nicho) => nicho === 'tech' && !!String(letra || '');
  /* o símbolo inteiro (caixa 100x100). fs = { display, texto: fontes carregadas }; s = spec.simbolo */
  M.simbolo = (s, fs, nome, spec) => {
    const f = fs.display, tipo = s.tipo || 'monograma', els = [];
    const letras = (s.letras || M.iniciais(nome)).slice(0, 3);
    if(tipo === 'nenhum') return [];
    if(tipo === 'geo') return geo(s.seed || M.hash(nome), s.pers);
    if(tipo === 'pixel') return pixel(s);
    if(tipo === 'ideia') return s.letra && M.cabeLetra(s.ideia) ? M.ideiaLetra(s, f, nome) : M.ideia(s.ideia, s.estilo, false, s.traco);
    /* EMBLEMA: a forma cheia, um fio por dentro, as iniciais vazadas e o ano (ou três estrelas) embaixo */
    if(tipo === 'emblema'){
      const forma = FORMAS[s.forma] || FORMAS.escudo, fd = forma.d(), k = 0.86;
      els.push({ d: fd, papel: 'marca' }, { d: tr(fd, [k, 0, 0, k, 50 * (1 - k), 50 * (1 - k)]), papel: 'furo', traco: 2.4, vazio: true });
      const t = M.texto(f, letras, { tam: 100, caixa: 'alta', track: letras.length > 1 ? 0.02 : 0 }), lado = 100 * forma.dentro * 0.82;
      /* sem ano, a inicial fica no centro ótico da forma e cresce (não sobra um buraco embaixo dela) */
      const temAno = !!(spec && String(spec.desde || '').replace(/\D/g, '').length >= 4 && fs.texto);
      let bIni;
      /* v3.73: com o conceito da marca, ele entra no lugar da inicial, gravado em traço (tudo vazado: o fio do desenho é o
         fundo aparecendo, como emblema de metal gravado). O traço fica fino e igual em qualquer desenho */
      if(s.ideia && IDEIAS[s.ideia]){
        const cy = temAno ? (s.forma === 'escudo' ? 40 : 42) : (s.forma === 'escudo' ? 46 : 50), alvo = lado * (temAno ? 0.78 : 0.96);
        const crua = M.ideia(s.ideia, 'linha', false, 3.4), bc = M.juntaCaixas(crua.map(e => caixa(e.d))), e = alvo / Math.max(bc.w, bc.h || 1);
        const m = mx.x(mx.t(50, cy), mx.x(mx.s(e), mx.t(-(bc.x + bc.w / 2), -(bc.y + bc.h / 2))));
        const gravada = M.trEls(crua, m).map(x => Object.assign({}, x, { papel: 'furo' }));
        gravada.forEach(x => els.push(x)); bIni = M.juntaCaixas(gravada.map(x => caixa(x.d)));
      } else {
        const iniD = encaixa(t, 50, temAno ? (s.forma === 'escudo' ? 39 : 42) : (s.forma === 'escudo' ? 45 : 50), lado, lado * (letras.length > 1 ? (temAno ? 0.5 : 0.56) : (temAno ? 0.6 : 0.7)));
        bIni = caixa(iniD); els.push({ d: iniD, papel: 'furo' });
      }
      /* v3.43: só o ano, espaçado, encaixado na largura de dentro da forma naquela altura (medida no fio de dentro, menos os
         dois fios e com folga): ele nunca encosta no fio. Sem ano, ou se não couber com a maiúscula de 10, dois fios curtos */
      const ano = spec && spec.desde ? String(spec.desde).replace(/\D/g, '').slice(0, 4) : '', yb = s.forma === 'escudo' ? 68 : 70;
      const fio = tr(fd, [k, 0, 0, k, 50 * (1 - k), 50 * (1 - k)]), dentroEm = y => { const xs = M.corteH(fio, y); return xs.length >= 2 ? xs[xs.length - 1] - xs[0] : 0; };
      let poe = false;
      if(ano.length === 4 && fs.texto){
        const tt = M.texto(fs.texto, ano, { tam: 100, caixa: 'alta', track: 0.3 }), bt = caixa(tt.cmds);
        for(let cap = 16; cap >= 10 && !poe; cap -= 1){
          const e = cap / (bt.h || 100), y0 = bIni.y + bIni.h + 7, y1 = y0 + cap, larg = (Math.min(dentroEm(y0), dentroEm(y1)) - 2 * 2.4) * 0.8;
          if(bt.w * e <= larg){ els.push({ d: tr(tt.cmds, mx.x(mx.t(50 - bt.w * e / 2, y1), mx.x(mx.s(e), mx.t(-bt.x, -(bt.y + bt.h))))), papel: 'furo' }); poe = true; }
        }
      }
      /* v3.43: sem ano, nada embaixo (os dois fios curtos liam como dois olhos debaixo da letra) */
      return els;
    }
    /* ÓRBITA: um anel aberto com um ponto na ponta e a inicial no centro (sinal, radar, rota) */
    if(tipo === 'orbita'){
      /* v3.43: a abertura do anel fica do lado aberto da letra (C e G abrem pra direita; as outras, em cima à direita), o ponto
         pousa num de quatro lugares do anel, pela semente, e a letra ocupa 52 da caixa */
      const L0 = letras.slice(0, 1).toLocaleUpperCase('pt-BR'), gc = /[CG]/.test(L0) ? 0 : -45, rr = M.rng((s.seed || M.hash(nome)) + 11), R = 41;
      const pt = a => [50 + R * Math.cos(a * Math.PI / 180), 50 + R * Math.sin(a * Math.PI / 180)];
      const [x0, y0] = pt(gc + 40), [x1, y1] = pt(gc + 320), ap = [gc + 40, gc + 320, gc + 130, gc + 230][Math.floor(rr() * 4)], [xp, yp] = pt(ap);
      els.push({ d: M.parse(`M${x0} ${y0} A${R} ${R} 0 1 1 ${x1} ${y1}`), papel: 'marca', traco: s.haste ? s.haste * (s.escTraco || 100 / 130) : 7.5 }, { d: F.elipse(xp, yp, 8), papel: 'acento' });
      els.push({ d: encaixa(M.texto(f, L0, { tam: 100, caixa: 'alta' }), 50, 50, 52, 52), papel: 'marca' });
      return els;
    }
    if(tipo === 'icone'){
      const forma = FORMAS[s.forma];
      if(forma && s.forma !== 'nenhuma'){
        els.push({ d: forma.d(), papel: 'marca' });
        const t = 100 * forma.dentro, ic = icone(s.icone, 50 - t / 2, 50 - t / 2 + (s.forma === 'arco' ? 6 : s.forma === 'escudo' ? -3 : 0), t);
        els.push({ d: ic.cmds, papel: 'furo', traco: ic.w });
      } else {
        const ic = icone(s.icone, 0, 0, 100);
        els.push({ d: ic.cmds, papel: 'marca', traco: ic.w });
      }
      return els;
    }
    if(tipo === 'letra'){
      const L0 = letras.slice(0, 1), t = M.texto(f, L0, { tam: 100, caixa: 'alta' });
      const d = encaixa(t, 46, 52, 84, 84), b = caixa(d), det = M.detalheLetra(s.detalhe, L0.toLocaleUpperCase('pt-BR'));
      const hasteB = (s.haste || 18) * b.h / 100;
      /* a tinta da letra linha a linha (de 2 em 2), pra saber onde ela é fina (onde a fatia corta) e onde é cheia (onde o corte passa) */
      const linhas = []; for(let y = b.y + b.h * 0.12; y <= b.y + b.h * 0.88; y += 2) linhas.push({ y, t: M.tintaH(d, y) });
      /* fatiada: a letra em três faixas cortadas nas linhas de menos tinta dela; a do meio desliza um quarto da haste.
         Tudo na mesma cor (trocar a cor de uma faixa fica pra bancada) e o recorte passa 1 pra fora (sem costura) */
      if(det === 'fatia'){
        const ord = linhas.slice().sort((p, q) => p.t - q.t), c1 = ord[0], c2 = ord.find(x => Math.abs(x.y - c1.y) >= b.h * 0.25) || ord[1];
        const ys = [c1.y, c2.y].sort((p, q) => p - q), gap = 3.4, dz = Math.min(0.25 * hasteB, 6);
        const faixas = [[b.y - 1, ys[0] - gap / 2], [ys[0] + gap / 2, ys[1] - gap / 2], [ys[1] + gap / 2, b.y + b.h + 1]];
        faixas.forEach(([a, z], i) => { const m = mx.t(i === 1 ? dz : 0, 0); els.push({ d: tr(d, m), clip: tr(F.ret(b.x - 30, a, b.w + 60, z - a, 0), m), papel: 'marca' }); });
        return els;
      }
      if(det === 'sombra') els.push({ d: tr(d, mx.t(6, 6)), papel: 'acento' });
      els.push({ d, papel: 'marca' });
      if(det === 'barra') els.push({ d: F.ret(b.x, b.y + b.h + 6, b.w, 9, 4.5), papel: 'acento' });
      /* o corte diagonal passa pela linha de mais tinta da letra (a barra do H, os braços do E), como estêncil de verdade */
      else if(det === 'corte'){ const cheia = linhas.reduce((m, x) => x.t > m.t ? x : m, linhas[0] || { y: b.y + b.h / 2 }), cx = b.x + b.w / 2, inc = b.h * 0.44 / (b.w + 12); els.push({ d: F.linha(b.x - 6, cheia.y + (cx - b.x + 6) * inc, b.x + b.w + 6, cheia.y - (b.x + b.w + 6 - cx) * inc), papel: 'furo', traco: 7 }); }
      else if(det !== 'sombra') els.push({ d: F.elipse(Math.min(98, b.x + b.w + 9), b.y + 9, 9), papel: 'acento' });
      return els;
    }
    /* v3.43 · MONOGRAMA SOBREPOSTO: as duas iniciais (sem o "&") uma por cima da outra, a segunda entrando na primeira
       com um vão em volta (o contorno dela na cor do fundo), como monograma de alfaiate e de escritório antigo. Sem
       moldura: a ligação das duas letras é o desenho */
    if(tipo === 'monograma' && s.estilo === 'liga'){
      const duas = [...letras].filter(c => c !== '&' && c.trim()).slice(0, 2);
      if(duas.length === 2){
        const tA = M.texto(f, duas[0], { tam: 100, caixa: 'alta' }).cmds, tB = M.texto(f, duas[1], { tam: 100, caixa: 'alta' }).cmds, bA = caixa(tA), bB = caixa(tB);
        const B = tr(tB, mx.t(bA.x + bA.w * 0.6 - bB.x, bA.h * 0.24)), tudo = M.juntaCaixas([bA, caixa(B)]), e = 96 / Math.max(tudo.w, tudo.h);
        const m = mx.x(mx.t(50, 50), mx.x(mx.s(e), mx.t(-(tudo.x + tudo.w / 2), -(tudo.y + tudo.h / 2)))), vao = Math.max(5, (s.haste || 18) * 0.38) * e;
        return [{ d: tr(tA, m), papel: 'marca' }, { d: tr(B, m), papel: 'fundo', traco: vao * 2 }, { d: tr(B, m), papel: 'marca' }];
      }
    }
    /* monograma */
    const forma = FORMAS[s.forma] || FORMAS.circulo;
    const fd = forma.d(), contorno = s.estilo === 'contorno';
    if(contorno){ els.push({ d: fd, papel: 'marca', traco: 6, vazio: true }); }
    else els.push({ d: fd, papel: 'marca' });
    const t = M.texto(f, letras, { tam: 100, caixa: s.caixa || 'alta', track: letras.length > 1 ? 0.01 : 0 });
    const lado = 100 * forma.dentro;
    const dy = s.forma === 'arco' ? 7 : s.forma === 'escudo' ? -3 : s.forma === 'gota' ? 12 : 0;
    els.push({ d: encaixa(t, 50, 50 + dy, lado, lado * (letras.length > 1 ? 0.62 : 0.8)), papel: contorno ? 'marca' : 'furo' });
    return els;
  };
  /* v3.43 · A ANATOMIA DO NOME: o motor lê o nome antes de desenhar. Cada palavra ganha uma classe: liga (de, do, &...),
     número, sigla (como a pessoa escreveu: KVRA, GP), descritor (o ofício ou o produto: Advogados, Barbearia, Records,
     Açaí) ou nome. O "próprio" é o que a marca tem de só dela (Tonho, Lumi, Sol Maior, Moraes & Valente); o descritor
     diz o que ela faz. É o próprio que leva o peso, a letra em destaque, a inicial e o símbolo.
     A lista de descritores é própria do logo (copiada do naming, mais os ofícios): o naming soma palavra na dele em
     tempo de uso, e o logo não pode depender do que o naming rodou antes. Casa a palavra inteira ("Bar" não pega Barbara) */
  const semAc = w => String(w).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const LIGA = /^(de|da|do|das|dos|e|&|em|na|no|nas|nos)$/, SIGLA = M.SIGLA;
  const DESCR = /^(advogad\w*|advocacia|associad[oa]s|imoveis|imobiliaria|contabilidade|contabil|consultoria|assessoria|records|escola|musica|studio|estudio|barbearia|barber|salao|clinica|odonto\w*|academia|padaria|cafeteria|cafe|confeitaria|doceria|doces|lanchonete|lanches?|burger|hamburgueria|grill|bar|boteco|drinks|pet|petshop|shop|store|loja|emporio|atelie|tattoo|estetica|cursos?|aula|produtora|producoes|solucoes|servicos|engenharia|arquitetura|construtora|obras|auto|center|express|garagem|oficina|moda|modas|beauty|hair|spa|bistro|pizzaria|restaurante|acougue|mercado|mercearia|farmacia|otica|eventos|festas|buffet|fotografia|filmes|labs?|tech|sistemas|saude|fisioterapia|nutricao|psicologia|veterinaria|vet|club|treino|crossfit|agro|sementes|som|arte|acai|pao|paes|pizza|sorvete|sorveteria|casa|co\.?)$/;
  M.partes = nome => {
    const str = String(nome || ''), ps = [...str.matchAll(/\S+/g)].map(m => ({ w: m[0], i0: m.index, i1: m.index + m[0].length }));
    ps.forEach(x => { const s0 = semAc(x.w).replace(/[.,;:!?]+$/, ''); x.c = LIGA.test(s0) ? 'liga' : /^\d+$/.test(s0) ? 'numero' : SIGLA.test(x.w) ? 'sigla' : DESCR.test(s0) ? 'descr' : 'nome'; });
    const bl = [], tipo = c => c === 'sigla' ? 'nome' : c;
    for(let i = 0; i < ps.length; i++){
      const ult = bl[bl.length - 1], c = ps[i].c;
      /* número gruda no bloco de antes (Tatame 43) */
      if(c === 'numero' && ult){ ult.fim = i + 1; continue; }
      /* "X & Y", uma palavra de cada lado: um bloco de nome (Pão & Prosa, Moraes & Valente) */
      if(ps[i].w === '&' && ult && ult.fim - ult.ini === 1 && ps[i + 1] && ps[i + 1].c !== 'liga'){ ult.fim = i + 2; ult.t = 'nome'; ult.e = true; i++; continue; }
      if(c === 'liga'){
        /* a liga gruda na palavra seguinte; fica dentro do bloco quando junta duas da mesma classe (Escola de Música) */
        let j = i; while(j < ps.length && ps[j].c === 'liga') j++;
        if(j >= ps.length){ if(ult) ult.fim = ps.length; else bl.push({ ini: i, fim: ps.length, t: 'nome' }); break; }
        const t = tipo(ps[j].c);
        if(ult && ult.t === t) ult.fim = j + 1; else bl.push({ ini: i, fim: j + 1, t, liga: true });
        i = j; continue;
      }
      if(ult && ult.t === tipo(c)) ult.fim = i + 1; else bl.push({ ini: i, fim: i + 1, t: tipo(c) });
    }
    const letras = b => ps.slice(b.ini, b.fim).reduce((n, x) => n + (x.c === 'liga' ? 0 : [...x.w].length), 0);
    const nomes = bl.filter(b => b.t === 'nome'), forte = nomes.length ? nomes.reduce((m, b) => letras(b) > letras(m) ? b : m, nomes[0]) : null;
    bl.forEach(b => { b.txt = str.slice(ps[b.ini].i0, ps[b.fim - 1].i1); });
    if(!forte) return { palavras: ps, blocos: bl, iP: -1, proprio: str.trim(), pi0: ps.length ? ps[0].i0 : 0, pi1: ps.length ? ps[ps.length - 1].i1 : 0, descritor: '', lado: 'depois' };
    /* o próprio sem a liga da frente ("do Tonho" -> Tonho) */
    let k = forte.ini; while(k < forte.fim - 1 && ps[k].c === 'liga' && ps[k].w !== '&') k++;
    const iP = bl.indexOf(forte);
    return { palavras: ps, blocos: bl, iP, proprio: str.slice(ps[k].i0, ps[forte.fim - 1].i1), pi0: ps[k].i0, pi1: ps[forte.fim - 1].i1,
      descritor: bl.filter(b => b.t === 'descr').map(b => b.txt).join(' '), lado: iP === 0 ? 'depois' : 'antes' };
  };
  /* as iniciais saem só do próprio (Barbearia do Tonho -> T; Escola de Música Sol Maior -> SM); "X & Y" -> X&Y;
     a sigla curta fica como a pessoa escreveu, menos a que lê como palavra (AI, EM, OK...), que cai pra uma letra */
  const LE_PALAVRA = /^(AI|IA|EM|OK|UP|PC|OI|EU|OU|AO|NO|NA|DA|DE|DO|SE|SO|UM|ME|TE)$/;
  M.iniciais = nome => {
    const pt = M.partes(nome), p = pt.proprio.replace(/[^\p{L}\p{N}\s&]/gu, ' ').trim().split(/\s+/).filter(Boolean);
    const alta = s => s.toLocaleUpperCase('pt-BR'), sai = s => LE_PALAVRA.test(semAc(s).toUpperCase()) ? [...s][0] : s;
    if(p.length === 1 && /^[\p{Lu}\p{N}]{2,3}$/u.test(p[0])) return sai(p[0]);
    if(p.length === 3 && p[1] === '&') return alta([...p[0]][0] + '&' + [...p[2]][0]);
    const sem = p.filter(w => !LIGA.test(semAc(w)) && !/^\d+$/.test(w) && w.length > 1);
    const q = sem.length ? sem : p.filter(w => w !== '&');
    return sai(alta(q.length > 1 ? [...q[0]][0] + [...q[1]][0] : [...(q[0] || '?')][0]));
  };
})();

/* ---------------- LOGO: o nome com gesto, os arranjos (horizontal, empilhado, só nome, só símbolo, selo) e as versões ----------------
   Tudo com a maiúscula do nome em 100 unidades e a linha de base em y = 0. O gesto é a ideia tipográfica de cada
   território: letra em destaque, o "O" virando forma, palavras empilhadas no mesmo tamanho, estêncil, recorte de
   bilhete, pulo, linhas de velocidade, fios de revista, colchetes, ponto final e sublinhado. */
(function(){
  'use strict';
  const C = window.Corre, M = C.labMotor;
  const { tr, caixa, mx } = M, F = M.forma;
  /* v3.43: a frase nasce com 0,25 da maiúscula (com 0,22 ela sumia no logo pequeno) */
  const TAG = { tam: 25, track: 0.18, gap: 44 };
  M.GESTOS = { '': 'Nenhum', hierarquia: 'Hierarquia', pesos: 'Dois pesos', separador: 'Separador', bolha: 'Bolha', destaque: 'Letra em destaque', troca: 'O vira forma', empilha: 'Empilhado', estencil: 'Estêncil', recorte: 'Recorte de bilhete', pulo: 'Pulo',
    velocidade: 'Velocidade', fios: 'Fios de revista', colchetes: 'Colchetes', ponto: 'Ponto final', sublinha: 'Sublinhado',
    encosta: 'Letras encostadas', corte: 'Corte de navalha', pendente: 'O conceito pendurado', versalete: 'Versalete', fiolado: 'Fio ao lado' };
  const temDescida = s => /[gjpqyç,;Ç]/.test(s);
  /* v3.43 · O GESTO TEM QUE CABER. Gesto anunciado que não aparece no desenho (hierarquia num nome de uma palavra, troca
     sem "O", dois pesos com a letra fina por cima da gorda) é promessa quebrada: o território passa pro próximo gesto
     da lista dele, e "nenhum" só no fim. o = { caixa, cores } */
  const PESO_PAR = ['inter-black', 'inter-bold', 'poppins-bold', 'lora-bold', 'lora-bolditalic', 'pagella-bold', 'schola-bold', 'cursor-bold'];
  const COM_MIOLO = /[ABDOPQRÁÀÂÃÄÓÒÔÕÖabdegopqáàâãäéêóôõö0689]/, CORTE_HASTE = /[EFHKLÉÊ]/;
  /* a largura média de cada letra de logo (maiúscula, minúscula, espaço; maiúscula em 100), medida nas fontes: pra saber
     antes de carregar a fonte se o nome cabe numa linha */
  const LARG_MEDIA = { 'inter-black': [96, 78, 25], 'inter-bold': [93, 73, 29], 'inter-light': [88, 66, 33], 'poppins-bold': [97, 84, 30], 'poppins-light': [89, 79, 39],
    'adventor-bold': [86, 74, 38], 'heroscn-bold': [79, 62, 32], 'lora-bold': [99, 77, 38], 'lora-bolditalic': [98, 74, 38], 'schola-bold': [107, 82, 40], 'bonum-bold': [107, 86, 50],
    'pagella-bold': [105, 78, 37], chorus: [106, 69, 38], 'cursor-bold': [103, 103, 103], pixel: [86, 86, 57] };
  M.largEst = (fonte, str, caixa, track) => { const m = LARG_MEDIA[fonte] || LARG_MEDIA['inter-black'], cs = [...M.caixaAlta(String(str || ''), caixa)];
    return cs.reduce((w, ch) => w + (/\s/.test(ch) ? m[2] : ch !== ch.toLocaleLowerCase('pt-BR') ? m[0] * 0.94 : m[1]), 0) + Math.max(0, cs.length - 1) * (track || 0) * 143; };
  M.cabeGesto = (g, partes, nome, fonte, o) => {
    o = o || {};
    if(!g) return true;
    const pt = partes || M.partes(nome), ps = pt.palavras, nomeC = M.caixaAlta(String(nome || ''), o.caixa), letras = [...nomeC.replace(/\s/g, '')];
    const ehLiga = w => /^(de|da|do|das|dos|e|&|em|na|no|nas|nos)$/i.test(String(w).normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
    if(g === 'hierarquia') return !!pt.descritor && pt.blocos.length >= 2;
    if(g === 'pesos') return !!pt.descritor && pt.blocos.length >= 2 && PESO_PAR.includes(fonte);
    if(g === 'separador'){
      /* o "&" pintado de outra cor é piscadela: marca séria não pisca */
      if(ps.some(x => x.w === '&')) return !(o.pers && o.pers[1] < 0.3);
      /* v3.43: o sinal só vale numa linha. Se o nome com o sinal não cabe, o separador não cabe (o travessão, que vira fio
         entre as duas linhas, é a exceção) */
      if(o.sep !== '—' && M.largEst(fonte, nome + ' / ', o.caixa, o.track) > (o.arranjo === 'horizontal' ? 900 : 800)) return false;
      const bl = pt.blocos, k = pt.iP;
      return k >= 0 && [k - 1, k + 1].some(j => bl[j] && bl[j].t === 'descr' && !ehLiga(ps[Math.min(k, j) === k ? bl[k].fim - 1 : bl[j].fim - 1].w) && !ehLiga(ps[Math.max(k, j) === k ? bl[k].ini : bl[j].ini].w));
    }
    if(g === 'empilha') return ps.length >= 2;
    /* v3.43 · o gesto passa pela personalidade e pelo sentido: rastro de velocidade só em marca que é de velocidade
       (frete, moto, corrida, "express"); estêncil é letra de caixote e de muro, não de pet shop alegre nem de clínica */
    if(g === 'velocidade' && !o.veloz) return false;
    /* o pulo (as letras saltando da linha) só na marca muito divertida: é alegria de bicho, de doce, de festa */
    if(g === 'pulo' && !(o.pers && o.pers[1] >= 0.8)) return false;
    /* o sublinhado é o traço de assinatura: só na letra escrita à mão (embaixo de letra de forma ele é só um risco) */
    if(g === 'sublinha') return fonte === 'chorus';
    /* os gestos de letreiro desenhado (v3.43) */
    if(g === 'versalete') return !['chorus', 'pixel', 'cursor-bold'].includes(fonte) && ps.some(x => [...x.w].length >= 3) && !ps.every(x => x.c === 'sigla');
    if(g === 'fiolado') return !!pt.descritor && pt.iP === 0 && pt.blocos.length >= 2 && !['chorus', 'pixel'].includes(fonte);
    /* fora do sorteio até ter um teste de legibilidade: no teste cego, as letras encostadas viraram bloco ilegível
       ("focnho feiz", "aguha preta"). O desenho continua aqui pra voltar quando o teste existir */
    if(g === 'encosta') return false;
    if(g === 'corte') return !!o.corte && !['chorus', 'pixel'].includes(fonte);
    /* o pendente pendura na última linha: o próprio tem que estar nela (Prumo em cima de Contabilidade não segura fio) */
    if(g === 'pendente') return !!o.pende && !['pixel'].includes(fonte) && (M.largEst(fonte, nome, o.caixa, o.track) <= 700 || pt.iP === pt.blocos.length - 1);
    if(g === 'estencil' && o.pers && (o.pers[1] > 0.7 || o.pers[2] < 0.35)) return false;
    if(g === 'troca'){ const cs = [...nomeC]; return cs.some((ch, i) => /[oO0]/.test(ch) && i >= pt.pi0 && i < pt.pi1 && !(i && /[ãõÃÕ]/.test(cs[i - 1])) && !ehLiga((ps.find(x => i >= x.i0 && i < x.i1) || {}).w || '')); }
    if(g === 'colchetes' || g === 'recorte') return letras.length <= 14;
    if(g === 'estencil') return letras.length && letras.filter(ch => COM_MIOLO.test(ch) || CORTE_HASTE.test(ch)).length >= letras.length * 0.4;
    if(g === 'destaque' && o.cores){ const v = M.versaoPrincipal({ cores: o.cores }); return M.contraste(v.acento, v.texto) >= 1.6; }
    return true;
  };
  /* os miolos de uma letra: o subcaminho cuja caixa fica dentro da caixa de outro (o buraco do A, do P, do o) */
  M.miolos = cmds => {
    const partes = []; let cur = null;
    M.parse(cmds).forEach(c => { if(c[0] === 'M'){ cur = [c]; partes.push(cur); } else if(cur) cur.push(c); });
    const bs = partes.map(p => caixa(p)), dentro = (a, b) => a.x >= b.x - 0.5 && a.y >= b.y - 0.5 && a.x + a.w <= b.x + b.w + 0.5 && a.y + a.h <= b.y + b.h + 0.5 && a.w * a.h < b.w * b.h;
    return bs.filter(a => a.w > 1 && bs.some(b => b !== a && dentro(a, b)));
  };
  /* ESTÊNCIL de verdade (v3.43, desenhado por letra): a ponte fica onde o molde de estêncil teria. Letra de haste (B D E F
     H K L M N P R) ganha o corte rente à haste, de cima a baixo, que solta a barriga e os braços; O e Q, as duas pontes no
     meio (em cima e embaixo); o A, a ponte na barra (o ápice cortado deixava duas orelhas, lia como trema); V e U, o corte
     no pé, pelo ritmo. As outras ficam inteiras, como no molde. A ponte tem 0,055 da maiúscula (ou 0,28 da haste) */
  const pontesEstencil = (ls, haste, cap, anda) => {
    const w = Math.max(cap * 0.055, haste * 0.28), out = [];
    const corte = (x, y0, y1) => out.push({ d: F.ret(x - w / 2, y0, w, y1 - y0, 0), papel: 'furo' });
    ls.forEach(l => {
      const d = anda ? tr(l.cmds, mx.t(anda, 0)) : l.cmds, b = caixa(d), ch = String(l.ch).normalize('NFD')[0];
      const runs = y => { const xs = M.corteH(d, y), r = []; for(let i = 0; i + 1 < xs.length; i += 2) r.push([xs[i], xs[i + 1]]); return r; };
      if(/[BDEFHKLMNPRbhkmnpr]/.test(ch)){
        /* a 0,22 do pé a corrida da esquerda é a haste (acima da serifa, abaixo da barriga) */
        const r = runs(b.y + b.h * 0.78)[0];
        if(r && r[1] - r[0] < haste * 2) corte(r[1] + w / 2 - 0.6, b.y - 2, b.y + b.h + 2);
      } else if(/[OQ0o]/.test(ch)){ const mi = M.miolos(d)[0], cx = b.x + b.w / 2; if(mi){ corte(cx, b.y - 2, mi.y + 1.2); corte(cx, mi.y + mi.h - 1.2, b.y + b.h + 2); } }
      else if(ch === 'A'){ const mi = M.miolos(d)[0]; if(mi) corte(mi.x + mi.w / 2, mi.y + mi.h - 1.2, b.y + b.h + 2); }
      else if(/[VUvu]/.test(ch)) corte(b.x + b.w / 2, b.y + b.h * 0.78, b.y + b.h + 2);
      else M.miolos(d).forEach(m => { const cx = m.x + m.w / 2; corte(cx, b.y - 2, m.y + 1.2); corte(cx, m.y + m.h - 1.2, b.y + b.h + 2); });
    });
    return out;
  };
  /* v3.43 · O PERFIL DA LETRA: onde a tinta começa e termina em cada altura (de 3 em 3, da maiúscula com acento à
     descendente). É a régua do kerning ótico: o vão entre duas letras é o menor vão entre os perfis na mesma altura */
  /* (a grade de alturas é a mesma pras duas letras: começa num múltiplo de 3 e cobre as duas caixas, em qualquer linha) */
  const vaoEntre = (ca, cb) => { const ba = caixa(ca), bb = caixa(cb), y0 = Math.floor(Math.max(ba.y, bb.y) / 3) * 3, y1 = Math.min(ba.y + ba.h, bb.y + bb.h); let m = Infinity;
    for(let y = y0 + 1.5; y <= y1; y += 3){ const a = M.corteH(ca, y), b = M.corteH(cb, y); if(a.length >= 2 && b.length >= 2) m = Math.min(m, b[0] - a[a.length - 1]); }
    return m; };
  /* ENCOSTA: as letras da mesma palavra chegam até se tocar (o vão ótico vai a "alvo"), como letreiro cortado num bloco
     só; entre palavras fica o espaço da fonte. Cada linha recentra depois */
  const encostaLetras = (ls, nomeC, alvo, centra) => {
    const linhas = new Map(); ls.forEach(l => { const k = l.linha || 0; if(!linhas.has(k)) linhas.set(k, []); linhas.get(k).push(l); });
    const out = [];
    linhas.forEach(lin => {
      let anda = 0; const nov = [];
      lin.forEach((l, k) => {
        if(k && !/\s/.test(nomeC.slice(lin[k - 1].i + 1, l.i))){ const v = vaoEntre(nov[k - 1].cmds, anda ? tr(l.cmds, mx.t(anda, 0)) : l.cmds); if(isFinite(v)) anda += alvo - v; }
        nov.push(Object.assign({}, l, { x: l.x + anda, cmds: anda ? tr(l.cmds, mx.t(anda, 0)) : l.cmds }));
      });
      out.push(nov);
    });
    if(out.length < 2) return out.flat();
    const bs = out.map(lin => M.juntaCaixas(lin.map(l => caixa(l.cmds)))), W = Math.max(...bs.map(b => b.w)), x0 = Math.min(...bs.map(b => b.x));
    return out.flatMap((lin, i) => { const dx = (centra ? x0 + (W - bs[i].w) / 2 : x0) - bs[i].x; return lin.map(l => Object.assign({}, l, { x: l.x + dx, cmds: tr(l.cmds, mx.t(dx, 0)) })); });
  };
  /* PENDENTE: o conceito pendurado na letra. O prumo desce num fio da haste do P; a gota do coado pinga do pé da letra
     redonda; a tinta escorre do pé da haste da Agulha. Só entra quando a ideia do nome tem o que pendurar (o mapa PEND,
     em aplicaTerritorio) */
  const PENDE = {
    prumo: { ancora: 'haste', fio: 0.3, el: () => [{ d: F.ret(42, 26, 16, 8, 2), papel: 'acento' }, { d: M.parse('M34 36 H66 Q72 36 72 42 V50 L52.5 93 Q50 98 47.5 93 L28 50 V42 Q28 36 34 36 Z'), papel: 'acento' }], alto: 0.62, topo: 26 },
    gota: { ancora: 'pe', fio: 0, el: () => [{ d: M.parse('M50 0 C50 0 64 18 64 27 A14 14 0 0 1 36 27 C36 18 50 0 50 0 Z'), papel: 'acento' }], alto: 0.36, topo: 0 },
    /* a gota de tinta da agulha: na cor da marca (preta, na Agulha Preta), saindo do pé da haste */
    tinta: { ancora: 'haste', fio: 0.2, largFio: 0.42, el: () => [{ d: M.parse('M50 0 C50 0 64 18 64 27 A14 14 0 0 1 36 27 C36 18 50 0 50 0 Z'), papel: 'marca' }], alto: 0.44, topo: 0 }
  };
  M.PENDE = PENDE;
  /* a letra que segura: "haste" = a primeira com um pé reto na linha de base (o P, o r, o h); "pe" = a primeira redonda
     (o C, o o, o a), pelo meio do pé */
  const ancoraPende = (ls, tipo, haste, ok) => {
    for(const l of ls){
      if(!ok(l)) continue;
      const b = caixa(l.cmds), xs = M.corteH(l.cmds, -18);
      /* a 0,18 da maiúscula a serifa do pé já ficou pra trás: a corrida que sobra é a haste */
      if(tipo === 'haste'){ if(xs.length === 2 && xs[1] - xs[0] >= haste * 0.55 && xs[1] - xs[0] <= haste * 1.8 && !/[CcOoGgQqSsUuaeod]/.test(l.ch.normalize('NFD')[0])) return { x: (xs[0] + xs[1]) / 2, y: b.y + b.h, w: xs[1] - xs[0] }; }
      /* a gota não pinga do C nem do S (vira "Ç" e "Ş"), nem do G e do Q, que já têm rabo embaixo */
      else if(/[OoUuaeod]/.test(l.ch.normalize('NFD')[0])) return { x: b.x + b.w * 0.5, y: b.y + b.h, w: 0 };
    }
    return null;
  };
  /* a palavra com o gesto: devolve elementos com papel e a caixa */
  function wordmark(spec, fs, arranjo){
    const L = spec.logo || {}, g = L.gesto || '', f = fs.display, centra = arranjo !== 'horizontal';
    const papel = L.corTexto === 'marca' ? 'marca' : 'texto', corG = L.corGesto || 'acento';
    const nome = String(spec.nome || 'Marca').trim() || 'Marca';
    /* v3.43: a caixa vale pro nome inteiro antes de partir (o "do" sozinho virava "Do"); as partes saem já na caixa */
    const nomeC = M.caixaAlta(nome, L.caixa), pt = M.partes(nome), ps = pt.palavras;
    const op = { tam: 100, caixa: '', track: L.track || 0 };
    const antesP = nomeC.slice(0, pt.pi0).trim(), proprioC = nomeC.slice(pt.pi0, pt.pi1), depoisP = nomeC.slice(pt.pi1).trim();
    const ehLiga = w => /^(de|da|do|das|dos|e|&|em|na|no|nas|nos)$/i.test(String(w).normalize('NFD').replace(/[̀-ͯ]/g, ''));
    let els = [], gg = g;
    /* v3.43 · NOME COMPRIDO EM DUAS LINHAS. Passou de 7 maiúsculas de largura, o nome quebra entre blocos (ou palavras), no
       ponto que deixa as duas linhas mais parecidas, e a liga e o "&" descem. A entrelinha é medida na tinta (0,14 da
       maiúscula entre a cedilha de cima e o acento de baixo), a linha de baixo fica na base e o alinhamento segue o
       arranjo: à esquerda do lado do símbolo, ao centro no resto. grupos = pedaços que não se separam, na ordem */
    const LARG_MAX = 700;
    /* v3.43 · A ENTRELINHA se mede duas vezes e fica a que der mais ar: na tinta (do pé da cedilha e da descendente de cima
       até o acento de baixo, 0,18 da maiúscula) e na linha de base (da base de cima até a maiúscula de baixo). Caixa alta
       pede mais: 0,22 na letra pesada (o bloco ainda lê como bloco) e 0,34 na serifa e na fina, que sem ar viram uma
       linha só. É ela que separa letreiro de etiqueta espremida */
    const hasteF = M.haste(f), haste0 = hasteF, serifaF = (f.info && f.info.e) === 'serifa';
    const altaN = L.caixa === 'alta' || !/[a-zà-ÿ]/.test(nomeC);
    const gBase = altaN ? (serifaF || hasteF < 16 ? 34 : 22) : L.caixa === 'titulo' ? 22 : 18;
    const entreL = (b1, b2) => Math.min(b2.y - 18 - (b1.y + b1.h), -100 - gBase);
    const empilhaGrupos = (grupos, lim) => {
      const bx = gr => M.juntaCaixas(gr.map(e => caixa(e.d)));
      const tudo = bx(grupos.flat()); if(tudo.w <= (lim || LARG_MAX) || grupos.length < 2) return grupos.flat();
      let melhor = 1, dif = Infinity;
      for(let k = 1; k < grupos.length; k++){ const a = bx(grupos.slice(0, k).flat()), b = bx(grupos.slice(k).flat()); const d = Math.abs(a.w - b.w); if(d < dif){ dif = d; melhor = k; } }
      const l1 = grupos.slice(0, melhor).flat(), l2 = grupos.slice(melhor).flat(), b1 = bx(l1), b2 = bx(l2), W = Math.max(b1.w, b2.w);
      const y1 = entreL(b1, b2);
      const m1 = mx.t((centra ? (W - b1.w) / 2 : 0) - b1.x + tudo.x, y1), m2 = mx.t((centra ? (W - b2.w) / 2 : 0) - b2.x + tudo.x, 0);
      return l1.map(e => Object.assign({}, e, { d: tr(e.d, m1) })).concat(l2.map(e => Object.assign({}, e, { d: tr(e.d, m2) })));
    };
    /* HIERARQUIA: o próprio vem grande; o descritor (com a liga) vem pequeno, na ordem do nome (em cima quando vem antes),
       na letra de texto, em caixa alta e centrado. Ele não estica até a largura do próprio: o tamanho é que separa */
    if(g === 'hierarquia' && pt.descritor && (antesP || depoisP)){
      /* o próprio comprido (Moraes & Valente) quebra em duas linhas centradas, com o "&" descendo */
      const pw = proprioC.split(/\s+/), t1 = M.texto(f, proprioC, op), ft = fs.texto;
      let grandes = [t1.cmds];
      if(t1.w > LARG_MAX && pw.length >= 2){
        let melhor = 1, dif = Infinity;
        for(let k = 1; k < pw.length; k++){ if(ehLiga(pw[k - 1])) continue; const d = Math.abs(M.largura(f, pw.slice(0, k).join(' '), op) - M.largura(f, pw.slice(k).join(' '), op)); if(d < dif){ dif = d; melhor = k; } }
        const a = M.texto(f, pw.slice(0, melhor).join(' '), op).cmds, z = M.texto(f, pw.slice(melhor).join(' '), op).cmds, ba = caixa(a), bz = caixa(z), W = Math.max(ba.w, bz.w);
        grandes = [tr(a, mx.t((W - ba.w) / 2 - ba.x, entreL(ba, bz))), tr(z, mx.t((W - bz.w) / 2 - bz.x, 0))];
      }
      const b1 = M.juntaCaixas(grandes.map(caixa));
      grandes.forEach(d => els.push({ d, papel }));
      [[antesP, true], [depoisP, false]].forEach(([str, emCima]) => {
        if(!str) return;
        /* v3.43: o descritor nasce com 0,34 da maiúscula (no logo a 96 px ele ainda lê) e só encolhe até 0,24 */
        const s2 = M.caixaAlta(str, 'alta'); let tam2 = 34, tk = 0.2;
        const larg = () => M.largura(ft, s2, { tam: tam2, track: tk });
        while(larg() > b1.w * 0.98 && tk > 0.08) tk -= 0.02;
        while(larg() > b1.w * 0.98 && tam2 > 24) tam2 -= 1;
        const t2 = M.texto(ft, s2, { tam: tam2, track: tk }), b2 = caixa(t2.cmds), gap = 20 + tam2 * 0.1;
        const y2 = emCima ? b1.y - gap - (b2.y + b2.h) : b1.y + b1.h + gap - b2.y, x2 = b1.x + (b1.w - b2.w) / 2 - b2.x;
        els.push({ d: tr(t2.cmds, mx.t(x2, y2)), papel: L.cor2 || papel });
      });
    }
    /* DOIS PESOS: o próprio na letra forte, o resto na letra de texto, onde ele estiver. Só cola as partes em caixa baixa
       e nome curto; em caixa alta fica o espaço normal (colado, vira uma palavra que não existe) */
    else if(g === 'pesos' && pt.descritor && (antesP || depoisP)){
      const ft = fs.texto, segs = [[antesP, ft, L.cor2 || papel], [proprioC, f, papel], [depoisP, ft, L.cor2 || papel]].filter(x => x[0]);
      const letrasN = [...nomeC.replace(/\s/g, '')].length, junto = L.caixa === 'baixa' && letrasN <= 12 && !ehLiga(antesP.split(/\s+/).pop() || '') && !ehLiga((depoisP.split(/\s+/)[0]) || '');
      let x = 0; const grupos = [];
      segs.forEach(([str, fo, pp], i) => {
        const t = M.texto(fo, str, op);
        if(i){ x += (op.track || 0) * 1000 * t.esc; if(!junto) x += M.largura(fo, ' ', op); }
        grupos.push([{ d: tr(t.cmds, mx.t(x, 0)), papel: pp }]); x += t.w;
      });
      empilhaGrupos(grupos).forEach(e => els.push(e));
    }
    /* SEPARADOR: um sinal só, entre o próprio e o descritor, nunca encostado em liga ou "&". Quando o nome já tem "&",
       o "&" é o separador: o gesto só pinta ele na cor do gesto */
    else if(g === 'separador' && ps.some(x => x.w === '&')) gg = 'e-comercial';
    else if(g === 'separador' && (() => { const bl = pt.blocos, k = pt.iP; return k >= 0 && [k - 1, k + 1].some(j => bl[j] && bl[j].t === 'descr' && !ehLiga(ps[Math.min(k, j) === k ? bl[k].fim - 1 : bl[j].fim - 1].w) && !ehLiga(ps[Math.max(k, j) === k ? bl[k].ini : bl[j].ini].w)); })()){
      const bl = pt.blocos, k = pt.iP, j = [k - 1, k + 1].find(j2 => bl[j2] && bl[j2].t === 'descr' && !ehLiga(ps[Math.min(k, j2) === k ? bl[k].fim - 1 : bl[j2].fim - 1].w) && !ehLiga(ps[Math.max(k, j2) === k ? bl[k].ini : bl[j2].ini].w));
      const corte = ps[bl[Math.max(k, j)].ini].i0, partesS = [nomeC.slice(0, corte).trim(), nomeC.slice(corte).trim()];
      const sep = L.sep || '/', cap = 100, xh = M.texto(f, 'x', op).xh || 52, tE = M.texto(f, ' ', op);
      /* o sinal é o elo entre as duas partes: antes de quebrar, o espaço aberto entre as letras fecha (até 0,02). Se ainda
         passar (8 maiúsculas, ou 9 do lado do símbolo), quebra: o sinal fecha a linha de cima, como etiqueta; o travessão fica
         sozinho entre as duas linhas, como fio de capa */
      const largS = M.largura(f, partesS.join(' '), op), nS = [...partesS.join(' ')].length;
      const opS = (largS > 800 && (op.track || 0) > 0.02) ? Object.assign({}, op, { track: Math.max(0.02, op.track - (largS - 800) / (nS * 1000 * tE.esc)) }) : op;
      const folga = (opS.track || 0) * 1000 * tE.esc + 0.3 * M.largura(f, ' ', { tam: 100 });
      /* nas maiúsculas, o ponto do meio, o travessão e o mais sobem pro meio da maiúscula (a fonte desenha no meio do x) */
      const sobe = (L.caixa === 'alta' && /[·—+]/.test(sep)) ? -(cap - xh) / 2 : 0;
      let x = 0; const g1 = [], g2 = [];
      partesS.forEach((w, i) => {
        const t = M.texto(f, w, opS); (i ? g2 : g1).push({ d: tr(t.cmds, mx.t(x, 0)), papel }); x += t.w;
        if(i) return;
        const g = M.glifo(f, sep);
        if(g && g.cmds.length){ const tg = M.texto(f, sep, { tam: 100 }); g1.push({ d: tr(tg.cmds, mx.t(x + folga, sobe)), papel: corG }); x += folga * 2 + tg.w; return; }
        const pad = cap * (sep === '/' ? 0.06 : 0.1), alto = L.caixa === 'alta' || L.caixa === 'titulo' ? cap : xh;
        let d, w2;
        if(sep === '/'){ const sw = cap * 0.13, inc = cap * 0.42; w2 = inc + sw; d = F.poli([[x + pad + inc, -cap - 4], [x + pad + inc + sw, -cap - 4], [x + pad + sw, 6], [x + pad, 6]]); }
        else if(sep === '_'){ w2 = cap * 0.46; d = F.ret(x + pad, -cap * 0.02, w2, cap * 0.1, 0); }
        else if(sep === '.'){ const r = cap * 0.085; w2 = 2 * r; d = F.elipse(x + pad + r, -r, r); }
        else if(sep === '·'){ const r = cap * 0.075; w2 = 2 * r; d = F.elipse(x + pad + r, -alto / 2, r); }
        else if(sep === '+'){ const a2 = cap * 0.34, e = cap * 0.09; w2 = a2; d = F.ret(x + pad, -alto / 2 - e / 2, a2, e, 0).concat(F.ret(x + pad + a2 / 2 - e / 2, -alto / 2 - a2 / 2, e, a2, 0)); }
        else { w2 = cap * 0.5; d = F.ret(x + pad, -alto / 2 - cap * 0.035, w2, cap * 0.07, 0); }
        g1.push({ d, papel: corG }); x += pad * 2 + w2;
      });
      const limS = arranjo === 'horizontal' ? 900 : 800, todo = M.juntaCaixas(g1.concat(g2).map(e => caixa(e.d)));
      if(todo.w > limS && sep === '—' && g1.length > 1){
        /* três andares: a parte de cima, o sinal e a parte de baixo, com 0,2 da maiúscula de ar em volta do sinal */
        const sinalE = g1.pop(), bA = M.juntaCaixas(g1.map(e => caixa(e.d))), bS = caixa(sinalE.d), bB = M.juntaCaixas(g2.map(e => caixa(e.d))), W = Math.max(bA.w, bB.w);
        const ar = Math.max(26, gBase), yS = (bB.y - ar) - (bS.y + bS.h), yA = yS + bS.y - ar - (bA.y + bA.h), al = (w, b) => (centra ? (W - w) / 2 : 0) - b.x;
        g1.forEach(e => els.push(Object.assign({}, e, { d: tr(e.d, mx.t(al(bA.w, bA), yA)) })));
        els.push(Object.assign({}, sinalE, { d: tr(sinalE.d, mx.t(al(bS.w, bS), yS)) }));
        g2.forEach(e => els.push(Object.assign({}, e, { d: tr(e.d, mx.t(al(bB.w, bB), 0)) })));
      } else if(todo.w > limS){
        /* v3.43: sinal que não seja o travessão não desce de linha: barra ou ponto pendurado no fim da linha de cima é resto de
           montagem. Quando o nome quebra, a própria quebra separa as partes, e o sinal sai */
        const a = M.texto(f, partesS[0], opS), z = M.texto(f, partesS[1], opS);
        empilhaGrupos([[{ d: a.cmds, papel }], [{ d: z.cmds, papel }]], 0).forEach(e => els.push(e));
      } else empilhaGrupos([g1, g2], limS).forEach(e => els.push(e));
    }
    /* EMPILHADO: o corte cai entre blocos (Moraes & Valente / Advogados); num bloco só, entre palavras, e a liga e o "&"
       descem junto com a palavra deles (PÃO / & PROSA). As duas linhas ficam no mesmo corpo: a de baixo casa a largura
       primeiro abrindo o espaço entre as letras, depois crescendo até 1,1x (mais que isso a haste engorda e as linhas
       deixam de ser da mesma letra); o que sobrar, centra. A entrelinha é medida
       na tinta: da cedilha de cima ao acento de baixo */
    else if(g === 'empilha' && ps.length >= 2){
      const cortes = pt.blocos.length >= 2 ? pt.blocos.slice(1).map(b => b.ini) : ps.map((x, k) => k).filter(k => k > 0 && !ehLiga(ps[k - 1].w));
      const linhas = k => [nomeC.slice(0, ps[k].i0).trim(), nomeC.slice(ps[k].i0).trim()];
      let melhor = cortes[0] || 1, dif = Infinity;
      cortes.forEach(k => { const [a, b] = linhas(k), d = Math.abs(M.largura(f, a, op) - M.largura(f, b, op)); if(d < dif){ dif = d; melhor = k; } });
      const [l1, l2] = linhas(melhor), w1 = M.largura(f, l1, op), w2 = M.largura(f, l2, op);
      const casa = (str, w, W) => {
        const n = [...str].length, esc = 100 / (f.cap || 700);
        let tk = op.track || 0, s2 = 1;
        /* v3.43: linha curta (até 3 sinais, como o "43") não abre o espaço entre as letras ("4 3" vira nota de rodapé): ela
           cresce até 1,5x e vira o número do cartaz */
        const curta = [...str.replace(/\s/g, '')].length <= 3;
        if(w < W && n > 1 && !curta){ tk += Math.min(0.08, (W - w) / ((n - 1) * 1000 * esc)); }
        const t = M.texto(f, str, Object.assign({}, op, { track: tk })), b = caixa(t.cmds);
        if(b.w < W) s2 = Math.min(curta ? 1.5 : 1.1, W / Math.max(1, b.w));
        return { t, s2 };
      };
      const W = Math.max(w1, w2), A = casa(l1, w1, W), B = casa(l2, w2, W);
      const bA = caixa(tr(A.t.cmds, mx.s(A.s2))), bB = caixa(tr(B.t.cmds, mx.s(B.s2))), Wt = Math.max(bA.w, bB.w);
      const yA = entreL(bA, bB);
      els.push({ d: tr(A.t.cmds, [A.s2, 0, 0, A.s2, (Wt - bA.w) / 2 - bA.x, yA]), papel }, { d: tr(B.t.cmds, [B.s2, 0, 0, B.s2, (Wt - bB.w) / 2 - bB.x, 0]), papel: L.destaque === 'linha2' ? 'acento' : papel });
    }
    /* VERSALETE (v3.43): cada palavra em maiúscula, com a primeira letra inteira e as outras em versalete (0,78 da
       maiúscula, um pouco mais abertas, como a letra pede quando encolhe). A liga entra toda em versalete e o "&" inteiro.
       É o letreiro de placa de bronze e de capa de livro: nobre sem precisar de enfeite */
    else if(g === 'versalete'){
      const kv = 0.78, esp = M.largura(f, ' ', op), tkV = (op.track || 0) * 1000 * (100 / (f.cap || 700));
      const ws = nome.split(/\s+/).filter(Boolean), grupos = []; let x = 0, junta = false;
      ws.forEach((w, i) => {
        const liga = ehLiga(w), cs = [...w.toLocaleUpperCase('pt-BR')], gr = [];
        if(i) x += esp;
        cs.forEach((ch, j) => {
          const peq = (j > 0 || liga) && /\p{L}/u.test(ch), tam = peq ? 100 * kv : 100, t = M.texto(f, ch, { tam });
          if(j){ const a = cs[j - 1]; x += M.largura(f, a + ch, { tam }) - M.largura(f, a, { tam }) - M.largura(f, ch, { tam }) + (peq ? tkV + 0.035 * 1000 * (100 / (f.cap || 700)) * kv : tkV); }
          gr.push({ d: tr(t.cmds, mx.t(x, 0)), papel }); x += t.w;
        });
        /* a liga e o "&" descem junto com a palavra seguinte */
        if(junta) grupos[grupos.length - 1].push(...gr); else grupos.push(gr);
        junta = liga;
      });
      empilhaGrupos(grupos).forEach(e => els.push(e));
    }
    /* FIO AO LADO (v3.43): o próprio grande à esquerda, um fio em pé e, à direita, o ofício em caixa alta pequena com a
       cidade ou o ano embaixo. É a assinatura de escritório e de editora: alinhada à esquerda, sem centralizar tudo */
    else if(g === 'fiolado' && pt.descritor && pt.iP === 0 && depoisP){
      const ft = fs.texto, pw = proprioC.split(/\s+/), t1 = M.texto(f, proprioC, op);
      let grandes = [t1.cmds];
      if(t1.w > 560 && pw.length >= 2){
        let melhor = 1, dif = Infinity;
        for(let k = 1; k < pw.length; k++){ if(ehLiga(pw[k - 1])) continue; const d = Math.abs(M.largura(f, pw.slice(0, k).join(' '), op) - M.largura(f, pw.slice(k).join(' '), op)); if(d < dif){ dif = d; melhor = k; } }
        const a = M.texto(f, pw.slice(0, melhor).join(' '), op).cmds, z = M.texto(f, pw.slice(melhor).join(' '), op).cmds, ba = caixa(a), bz = caixa(z);
        grandes = [tr(a, mx.t(-ba.x, entreL(ba, bz))), tr(z, mx.t(-bz.x, 0))];
      }
      const bP = M.juntaCaixas(grandes.map(caixa)), esp = Math.max(2.5, haste0 * 0.26), xF = bP.x + bP.w + 38;
      grandes.forEach(d => els.push({ d, papel }));
      els.push({ d: F.ret(xF, bP.y - 6, esp, bP.h + 12, 0), papel });
      const s2 = M.caixaAlta(depoisP, 'alta'), ws2 = s2.split(/\s+/);
      let tam2 = Math.min(40, Math.max(30, bP.h * 0.2)), linhas2 = [s2];
      if(ws2.length >= 2 && M.largura(ft, s2, { tam: tam2, track: 0.14 }) > bP.w * 0.55){ let m2 = 1, d2 = Infinity; for(let k = 1; k < ws2.length; k++){ if(ehLiga(ws2[k - 1])) continue; const d = Math.abs(M.largura(ft, ws2.slice(0, k).join(' '), { tam: tam2 }) - M.largura(ft, ws2.slice(k).join(' '), { tam: tam2 })); if(d < d2){ d2 = d; m2 = k; } } linhas2 = [ws2.slice(0, m2).join(' '), ws2.slice(m2).join(' ')]; }
      const sub = M.linhaFios(spec), blocos = linhas2.map(l => ({ t: M.texto(ft, l, { tam: tam2, caixa: 'alta', track: 0.14 }), tam: tam2 })).concat(sub ? [{ t: M.texto(ft, sub, { tam: 26, caixa: 'alta', track: 0.16 }), tam: 26, sub: true }] : []);
      const passo = b => b.tam * 1.62, hB = blocos.reduce((h, b, i) => h + (i ? passo(b) : b.tam), 0) + (sub ? 6 : 0);
      let y = bP.y + (bP.h - hB) / 2 + blocos[0].tam;
      blocos.forEach((b, i) => { if(i) y += passo(b) + (b.sub ? 6 : 0); const bt = caixa(b.t.cmds); els.push({ d: tr(b.t.cmds, mx.t(xF + esp + 30 - bt.x, y)), papel: b.sub ? (L.cor2 || papel) : papel }); });
    }
    if(!els.length){
      if(['hierarquia', 'pesos', 'separador', 'empilha', 'versalete', 'fiolado'].includes(gg)) gg = '';
      let t = M.texto(f, nomeC, op);
      const cap = t.cap, xh = t.xh, haste = M.haste(f);
      /* nome que não quebra (uma palavra, ou palavra e número) e ficou mais de 8 vezes mais largo que alto: o espaço aberto
         entre as letras fecha até caber (nunca abaixo de 0,02) */
      const cortaveis = (pt.blocos.length >= 2 ? pt.blocos.slice(1).map(b => b.ini) : ps.map((x, k) => k).filter(k => k > 0 && !ehLiga(ps[k - 1].w) && ps[k].c !== 'numero'));
      const altT = Math.max(100, caixa(t.cmds).h), limL = 7.8 * altT - (gg === 'velocidade' ? 1.5 * cap : 0), largo = t.w > limL;
      if(largo && !cortaveis.length && (op.track || 0) > -0.01){ const n = [...nomeC].length - 1, tk = Math.max(Math.min(op.track, 0.02) - 0.03, op.track - (t.w - limL) / (n * 1000 * t.esc)); t = M.texto(f, nomeC, Object.assign({}, op, { track: tk })); }
      let ls = t.letras.filter(l => l.cmds.length);
      /* nome comprido: as letras das duas linhas entram na mesma lista (o destaque, a troca, o estêncil e o recorte
         continuam valendo), com a linha de baixo na base */
      const nLetras = [...nomeC.replace(/\s/g, '')].length;
      if(t.w > LARG_MAX && cortaveis.length && (pt.blocos.length >= 2 || nLetras > 16 || largo) && !['recorte', 'pulo'].includes(gg)){
        const cortes = cortaveis;
        let melhor = cortes[0], dif = Infinity;
        cortes.forEach(k => { const a = M.largura(f, nomeC.slice(0, ps[k].i0).trim(), op), b = M.largura(f, nomeC.slice(ps[k].i0), op); if(Math.abs(a - b) < dif){ dif = Math.abs(a - b); melhor = k; } });
        const c = ps[melhor].i0, t1 = M.texto(f, nomeC.slice(0, c).replace(/\s+$/, ''), op), t2 = M.texto(f, nomeC.slice(c), op);
        const l1 = t1.letras.filter(l => l.cmds.length), l2 = t2.letras.filter(l => l.cmds.length).map(l => Object.assign({}, l, { i: l.i + c }));
        const b1 = M.juntaCaixas(l1.map(l => caixa(l.cmds))), b2 = M.juntaCaixas(l2.map(l => caixa(l.cmds))), W = Math.max(b1.w, b2.w);
        const y1 = entreL(b1, b2), dx1 = (centra ? (W - b1.w) / 2 : 0) - b1.x, dx2 = (centra ? (W - b2.w) / 2 : 0) - b2.x;
        ls = l1.map(l => Object.assign({}, l, { x: l.x + dx1, cmds: tr(l.cmds, mx.t(dx1, y1)), linha: 0 })).concat(l2.map(l => Object.assign({}, l, { x: l.x + dx2, cmds: tr(l.cmds, mx.t(dx2, 0)), linha: 1 })));
      }
      /* ENCOSTA (v3.43): o kerning ótico leva as letras da palavra até se tocarem */
      if(gg === 'encosta') ls = encostaLetras(ls, nomeC, -Math.max(0.6, haste * 0.03), centra);
      /* a letra do próprio: o destaque e o "O" que vira forma moram nele, nunca no descritor nem na liga */
      const palDe = i => ps.find(x => i >= x.i0 && i < x.i1), doProprio = l => l.i >= pt.pi0 && l.i < pt.pi1 && !(palDe(l.i) && palDe(l.i).c === 'liga');
      /* o "O" que pode virar forma: sem acento, no próprio, nunca depois de ã ou õ (o "ão" não é um O) */
      const oOk = (l, k) => /^[oO0]$/.test(l.ch) && doProprio(l) && !(k && /[ãõÃÕ]/.test(ls[k - 1].ch) && ls[k - 1].i === l.i - 1);
      let idxO = L.trocaEm !== undefined ? ls.findIndex((l, k) => l.i >= L.trocaEm && oOk(l, k)) : -1;
      if(idxO < 0) idxO = ls.findIndex(oOk);
      const doP = ls.map((l, k) => k).filter(k => doProprio(ls[k])), daVez = doP.length ? doP : ls.map((l, k) => k);
      const vog = daVez.find(k => /[aeiouáéíóúâêôãõAEIOUÁÉÍÓÚÂÊÔÃÕ]/.test(ls[k].ch));
      const iDest = L.destaque === 'vogal' && vog !== undefined ? vog : L.destaque === 'ultima' ? daVez[daVez.length - 1] : daVez[0];
      if(gg === 'troca' && idxO < 0) gg = 'destaque';
      if(gg === 'recorte' && ls.length > 14) gg = 'destaque';
      /* v3.43: o "O" que vira forma ocupa a tinta do O (a altura dele, e no máximo 6% mais largo); as letras de depois
         andam essa diferença. Letra fina (haste abaixo de 14) ganha anel da espessura da haste, não disco */
      let anda = 0;
      ls.forEach((l, i) => {
        const andaAqui = anda && (ls[idxO] || {}).linha === l.linha ? anda : 0;
        let d = andaAqui ? tr(l.cmds, mx.t(andaAqui, 0)) : l.cmds, pp = papel;
        if(gg === 'destaque' && i === iDest) pp = 'acento';
        if(gg === 'e-comercial' && l.ch === '&') pp = corG;
        if(gg === 'troca' && i === idxO){
          const b = caixa(d), diam = Math.min(b.h, b.w * 1.06), cx = b.x + diam / 2, cy = b.y + b.h / 2;
          const por = L.trocaPor || 'circulo';
          if(por === 'anel') els.push({ d: F.anel(cx, cy, diam / 2, diam / 2 - Math.max(haste, diam * 0.16)), papel: 'acento' });
          else if(por === 'alvo') els.push({ d: F.anel(cx, cy, diam / 2, diam / 2 * 0.72), papel: 'acento' }, { d: F.elipse(cx, cy, diam / 2 * 0.4), papel: 'acento' });
          else if(por === 'ideia' && spec.simbolo && M.IDEIAS[spec.simbolo.ideia]){ const dd = diam * 1.08; poeSimbolo(M.ideia(spec.simbolo.ideia, spec.simbolo.estilo, true, haste * 100 / dd), cx - dd / 2, cy - dd / 2, dd).forEach(e => els.push(e)); }
          else if(por === 'icone' && spec.simbolo && M.ICONES[spec.simbolo.icone]){ els.push({ d: F.elipse(cx, cy, diam / 2), papel: 'acento' }); const ic = M.icone(spec.simbolo.icone, cx - diam * 0.33, cy - diam * 0.33, diam * 0.66); els.push({ d: ic.cmds, papel: 'furo', traco: ic.w * 1.15 }); }
          else if(haste < 14) els.push({ d: F.anel(cx, cy, diam / 2, diam / 2 - haste), papel: 'acento' });
          else els.push({ d: F.elipse(cx, cy, diam / 2), papel: 'acento' });
          anda += diam - b.w;
          return;
        }
        if(gg === 'pulo'){ const b = caixa(d), sobe = i % 2 ? -7 : 5, gira = i % 2 ? -5 : 4; d = tr(d, mx.x(mx.t(0, sobe), mx.r(gira, b.x + b.w / 2, -cap / 2))); }
        if(gg === 'recorte'){
          const b = caixa(d), pad = 11, cores = ['texto', 'marca', 'acento'], c0 = cores[(i + (spec.seed || 0)) % 3], gira = ((i * 37 + (spec.seed || 0)) % 7) - 3;
          const m = mx.r(gira, b.x + b.w / 2, b.y + b.h / 2);
          els.push({ d: tr(F.ret(b.x - pad, -cap - pad, b.w + 2 * pad, cap + 2 * pad + (temDescida(l.ch) ? t.desc * 0.8 : 0), 3), m), papel: c0 });
          els.push({ d: tr(d, m), papel: 'auto', sobre: c0 });
          return;
        }
        els.push({ d, papel: pp });
      });
      /* v3.43: tudo que acompanha o nome se mede na TINTA das letras (sem a pontuação), não no avanço da última letra */
      const tinta = M.juntaCaixas(ls.filter(l => !/[.,;:!?'"’]/.test(l.ch)).map((l, k) => { const b = caixa(l.cmds); return gg === 'troca' && l.i > (ls[idxO] || {}).i && (ls[idxO] || {}).linha === l.linha ? Object.assign({}, b, { x: b.x + anda }) : b; }));
      const x0 = tinta.x, x1 = tinta.x + tinta.w, fundoT = tinta.y + tinta.h, topoT = tinta.y;
      /* um sinal da própria fonte (ponto, barra, colchete): pesa igual à letra porque é desenhado por quem desenhou a letra */
      const glifoEm = (ch, x, y, e) => { const g = M.glifo(f, ch); if(!g || !g.cmds.length) return null; const tt = M.texto(f, ch, { tam: 100 * (e || 1) }), m = mx.t(x || 0, y || 0); return { d: tr(tt.cmds, m), w: tt.w, b: caixa(tr(tt.cmds, m)) }; };
      if(gg === 'ponto'){
        /* o ponto da fonte, 15% maior, encostado com o kerning dela */
        const ult = ls[ls.length - 1], kx = ult ? (f.k && (f.k[(ult.ch.normalize('NFD')[0]) + '.'] || 0)) * t.esc : 0;
        const g = glifoEm('.', 0, 0, 1.15);
        if(g){ const xp = (ult ? ult.x + ult.w + (gg === 'troca' && (ls[idxO] || {}).linha === ult.linha ? anda : 0) : x1) + kx; els.push({ d: tr(g.d, mx.t(xp, 0)), papel: corG }); }
        else { const r = cap * 0.11, cx = x1 + r + cap * 0.06; els.push({ d: F.elipse(cx, -r, r), papel: corG }); }
      }
      if(gg === 'sublinha'){
        /* a espessura sai da haste e o fio passa abaixo da descendente (nunca encostando no g, no p, no ç) */
        const esp = Math.max(4, haste * 0.8), y = fundoT + Math.max(6, haste * 0.6) + (f.info && f.info.e === 'manuscrita' ? esp * 1.3 : 0);
        if(f.info && f.info.e === 'manuscrita'){
          /* traço de assinatura: grosso no meio, fino nas pontas (v3.43: ele sobe no meio, então desce o que sobe: nunca
             encosta na descendente) */
          const a = x0 - 6, b = x1 + 10, m = (a + b) / 2;
          els.push({ d: M.parse(`M${a} ${y + esp} Q${m} ${y - esp * 2.2} ${b} ${y} Q${m} ${y + esp * 0.6} ${a} ${y + esp}Z`), papel: corG });
        } else els.push({ d: F.ret(x0, y, x1 - x0, esp, 0), papel: corG });
      }
      if(gg === 'estencil') pontesEstencil(ls, haste, cap, 0).forEach(e => els.push(e));
      /* CORTE (v3.43): um risco fino atravessa o próprio na diagonal, como a navalha passando. Ele só aparece onde corta
         letra: o nome leva o corte que dá nome ao ofício */
      if(gg === 'corte'){
        const lp = ls.filter(doProprio), bp = M.juntaCaixas((lp.length ? lp : ls).map(l => caixa(l.cmds))), ext = 30;
        const inc = Math.min(Math.tan(16 * Math.PI / 180), bp.h * 0.5 / (bp.w + 2 * ext)), yc = bp.y + bp.h * 0.54, cx = bp.x + bp.w / 2;
        els.push({ d: F.linha(bp.x - ext, yc + (cx - bp.x + ext) * inc, bp.x + bp.w + ext, yc - (bp.x + bp.w + ext - cx) * inc), papel: 'furo', traco: Math.max(3.5, haste * 0.3), ponta: 'butt' });
      }
      /* PENDENTE (v3.43): o conceito do nome pendurado na letra (o prumo no fio da haste do P, a gota pingando do C) */
      /* (na bancada, quem escolhe o gesto à mão leva o pendente da ideia do símbolo) */
      const pd = gg === 'pendente' && PENDE[L.pende || ({ prumo: 'prumo', coador: 'gota', agulha: 'tinta', gota: 'gota' })[(spec.simbolo || {}).ideia]];
      if(pd){
        const ult = Math.max(...ls.map(l => l.linha || 0)), an = ancoraPende(ls.filter(l => (l.linha || 0) === ult), pd.ancora, haste, doProprio);
        if(an){
          const forma = pd.el(), bf = M.juntaCaixas(forma.map(e => caixa(e.d))), k = pd.alto * cap / bf.h, y0 = an.y + (pd.fio ? pd.fio * cap : cap * 0.07);
          const lf = Math.max(2.2, an.w * (pd.largFio || 0.28));
          if(pd.fio) els.push({ d: F.ret(an.x - lf / 2, an.y - 3, lf, y0 - an.y + (pd.largFio ? 8 : 4), 0), papel: pd.largFio ? forma[0].papel : papel });
          forma.forEach(e => els.push({ d: tr(e.d, [k, 0, 0, k, an.x - (bf.x + bf.w / 2) * k, y0 - bf.y * k]), papel: e.papel }));
        }
      }
      /* VELOCIDADE: três rastros com a grossura da letra, do mais comprido (em cima) ao mais curto, parando meia haste antes
         da primeira letra. No horizontal com símbolo, o M.logo leva os rastros pra trás do símbolo (rastro: true) */
      if(gg === 'velocidade'){
        /* num nome que já é comprido os rastros encurtam (até 60%), pra marca não passar de 8 vezes a altura */
        const e = haste * 0.55, xf = x0 - haste * 0.5, sobra = 7.8 * Math.max(100, tinta.h) - (x1 - x0) - haste * 0.5, enc = Math.max(0.6, Math.min(1, sobra / (1.4 * cap)));
        [[1.4, -0.78], [1.0, -0.5], [0.6, -0.22]].forEach(([c, y]) => els.push({ d: F.ret(xf - c * enc * cap, y * cap - e / 2, c * enc * cap, e, e / 2), papel: corG, rastro: true }));
      }
      if(gg === 'bolha'){ const r = cap * 0.2, cx = x1 + r + cap * 0.08; els.push({ d: F.elipse(cx, -r * 1.1, r), papel: corG }); }
      if(gg === 'fios'){
        /* dois fios a 0,24 da maiúscula da tinta, com a espessura tirada da haste; o texto do fio só entra se couber grande */
        /* v3.43: o texto do fio nasce com 0,3 da maiúscula (no tamanho de uso ele ainda lê) e o fio de baixo desce o que o
           texto precisa pra não encostar na base do nome */
        const esp = Math.max(2.5, haste * 0.3), linha = M.linhaFios(spec), lt = linha ? M.texto(fs.texto, linha, { tam: 34, caixa: 'alta', track: 0.14 }) : null;
        const cabeT = lt && lt.w + 2 * 30 <= x1 - x0, y1 = topoT - cap * 0.26 - esp, y2 = fundoT + cap * 0.26 + (cabeT ? 17 : 0);
        els.push({ d: F.ret(x0, y1, x1 - x0, esp, 0), papel });
        if(cabeT){
          const lx = x0 + (x1 - x0 - lt.w) / 2, gap = 16;
          els.push({ d: F.ret(x0, y2, Math.max(0, lx - gap - x0), esp, 0), papel }, { d: F.ret(lx + lt.w + gap, y2, Math.max(0, x1 - lx - lt.w - gap), esp, 0), papel });
          els.push({ d: tr(lt.cmds, mx.t(lx, y2 + esp / 2 + 17)), papel });
        } else els.push({ d: F.ret(x0, y2, x1 - x0, esp, 0), papel });
      }
      if(gg === 'colchetes'){
        /* os colchetes da própria fonte, a 0,25 da maiúscula da tinta, dos dois lados igual */
        /* (nome em duas linhas: os colchetes são desenhados na altura do bloco, com a espessura da haste) */
        const ga = glifoEm('['), gb = glifoEm(']'), folga = cap * 0.25, duas = ls.some(l => l.linha === 1);
        if(ga && gb && !duas){ els.push({ d: tr(ga.d, mx.t(x0 - folga - (ga.b.x + ga.b.w), 0)), papel: corG }, { d: tr(gb.d, mx.t(x1 + folga - gb.b.x, 0)), papel: corG }); }
        else {
          const w = Math.max(5, haste * 0.8), y1 = topoT - 14 + w / 2, y2 = fundoT + 14 - w / 2, perna = Math.max(22, haste * 1.6);
          els.push({ d: M.parse(`M${x0 - folga} ${y1} H${x0 - folga - perna}V${y2}H${x0 - folga}`), papel: corG, traco: w, ponta: 'butt' },
            { d: M.parse(`M${x1 + folga} ${y1} H${x1 + folga + perna}V${y2}H${x1 + folga}`), papel: corG, traco: w, ponta: 'butt' });
        }
      }
    }
    /* os efeitos valem pra tudo que é letra */
    const letra = e => e.papel === papel || e.papel === 'acento' || e.papel === 'auto';
    if(L.efeito === 'inclinado') els = els.map(e => Object.assign({}, e, { d: tr(e.d, mx.k(-12)) }));
    if(L.efeito === 'curvado' && g !== 'empilha'){
      const b0 = M.juntaCaixas(els.map(e => caixa(e.d))), r = Math.max(b0.w * 1.5, 420), cx = b0.x + b0.w / 2;
      /* entorta: cada ponto desce conforme a distância do centro (arco) */
      const arqueia = d => M.parse(d).map(c => { if(c[0] === 'Z') return c; const o2 = [c[0]]; for(let i = 1; i < c.length; i += 2){ const dx = c[i] - cx, a = dx / r, y = c[i + 1]; o2.push(cx + (r - y) * Math.sin(a), r - (r - y) * Math.cos(a)); } return o2; });
      els = els.map(e => Object.assign({}, e, { d: arqueia(e.d) }));
      const b1 = M.juntaCaixas(els.map(e => caixa(e.d))); els = els.map(e => Object.assign({}, e, { d: tr(e.d, mx.t(0, -(b1.y + b1.h) + (b1.h - (b0.h)) * 0)) }));
    }
    if(L.efeito === 'sombra'){ const sombra = els.filter(e => letra(e) && !e.traco).map(e => ({ d: tr(e.d, mx.t(8, 8)), papel: 'sombra' })); els = sombra.concat(els); }
    if(L.efeito === 'contorno') els = els.map(e => e.papel === papel ? Object.assign({}, e, { traco: 5.5, vazio: true }) : e);
    const b = M.juntaCaixas(els.filter(e => e.papel !== 'furo').map(e => caixa(e.d)));
    /* bN: a caixa só do nome (sem os rastros de velocidade), pra encaixar símbolo e frase na tinta */
    const bN = M.juntaCaixas(els.filter(e => e.papel !== 'furo' && !e.rastro).map(e => caixa(e.d)));
    return { els, b, bN, cap: 100, xh: M.texto(f, 'x', { tam: 100 }).xh };
  }
  M.wordmark = wordmark;
  /* a frase: alinha pela tinta das letras (sem a pontuação), inclina junto quando o nome inclina e nunca fica mais larga que
     o nome (primeiro fecha o espaço entre as letras até 0,08, depois diminui até 18) */
  function tagline(spec, fs, larg, inclina){
    const L = spec.logo || {};
    if(!L.tagline || !String(spec.tagline || '').trim()) return null;
    let tam = TAG.tam, track = TAG.track, t;
    const tinta = () => M.juntaCaixas(t.letras.filter(l => l.cmds.length && !/[.,;:!?'"’…]/.test(l.ch)).map(l => caixa(l.cmds)));
    const monta = () => { t = M.texto(fs.texto, spec.tagline, { tam, caixa: 'alta', track }); };
    monta();
    while(larg && tinta().w > larg && track > 0.08){ track = Math.max(0.08, track - 0.02); monta(); }
    while(larg && tinta().w > larg && tam > 18){ tam -= 1; monta(); }
    const d = inclina ? tr(t.cmds, mx.k(-12)) : t.cmds, bi = tinta(), b = inclina ? caixa(tr(F.ret(bi.x, bi.y, bi.w, bi.h, 0), mx.k(-12))) : bi;
    return { d, w: b.w, b, tam };
  }
  const poeSimbolo = (els, x, y, tam) => els.map(e => Object.assign({}, e, { d: tr(e.d, [tam / 100, 0, 0, tam / 100, x, y]), clip: e.clip ? tr(e.clip, [tam / 100, 0, 0, tam / 100, x, y]) : e.clip, traco: e.traco ? e.traco * tam / 100 : e.traco }));
  M.poeSimbolo = poeSimbolo;

  /* o texto do fio de baixo (gesto "fios"): o ano de fundação; se o emblema já mostra o ano, a cidade (nunca o ano duas vezes) */
  M.anoNoSimbolo = spec => !!(spec && spec.simbolo && spec.simbolo.tipo === 'emblema' && String(spec.desde || '').replace(/\D/g, '').length >= 4);
  M.linhaFios = spec => { const cid = String(spec.cidade || '').split(',')[0].trim(); return String(spec.desde && !M.anoNoSimbolo(spec) ? 'desde ' + spec.desde : cid).trim(); };
  M.logo = (spec, fs, arranjo) => {
    arranjo = arranjo || (spec.logo && spec.logo.arranjo) || 'horizontal';
    const s = spec.simbolo || {};
    const temSimb = s.tipo && s.tipo !== 'nenhum';
    /* v3.43: o traço do símbolo em linha sai da haste da letra do nome (130 = o tamanho de referência do símbolo do lado
       do nome): o símbolo pesa igual à letra, e o valor é o mesmo em todo arranjo */
    const haste = M.haste(fs.display);
    /* a referência é o tamanho do símbolo no horizontal desta marca (1,3 maiúscula, ou a altura do nome em duas linhas):
       lá o traço fica com 0,9 da haste. O mesmo valor vale pra todos os arranjos (o símbolo é um só) */
    let tracoS = haste * 0.9 * 100 / 130, alvoR = 130;
    if(temSimb){
      const s0 = M.simbolo(Object.assign({ pers: spec.pers }, s, { traco: tracoS, haste }), fs, spec.nome, spec);
      const t0 = M.juntaCaixas(s0.filter(e => e.papel !== 'furo').map(e => caixa(e.d))), wmR = wordmark(spec, fs, 'horizontal');
      alvoR = Math.max(130, (wmR.bN.w ? wmR.bN : wmR.b).h);
      if(t0.h > 1) tracoS = haste * 0.9 * t0.h / alvoR;
    }
    const simb = temSimb ? M.simbolo(Object.assign({ pers: spec.pers }, s, { traco: tracoS, haste, escTraco: tracoS / (haste * 0.9) }), fs, spec.nome, spec) : [];
    const out = [];
    let x = 100, guia = null;
    /* v3.39: cada pedaço sabe o que é (símbolo, nome ou frase): o filme da marca monta um de cada vez */
    const parte = (lg, f) => { lg.els.forEach(e => { if(!e.parte) e.parte = f(e); }); return lg; };
    if(arranjo === 'selo') return parte(selo(spec, fs, simb), e => e.papel === 'tagline' ? 'frase' : e.papel === 'texto' ? 'nome' : 'simbolo');
    if(arranjo === 'placa') return parte(placa(spec, fs), e => e.papel === 'tagline' ? 'frase' : e.papel === 'auto' ? 'nome' : 'simbolo');
    if(arranjo === 'simbolo'){
      if(temSimb){ poeSimbolo(simb, 0, 0, 300).forEach(e => out.push(Object.assign(e, { parte: 'simbolo' }))); x = 75; guia = { simb: { x: 0, y: 0, w: 300, h: 300 } }; }
      else { const t = M.texto(fs.display, M.iniciais(spec.nome), { tam: 100, caixa: 'alta' }); out.push({ d: M.encaixa(t, 150, 150, 260, 260), papel: (spec.logo && spec.logo.corTexto) === 'marca' ? 'marca' : 'texto', parte: 'nome' }); x = 75; }
    } else {
      /* v3.43: com o símbolo do lado (horizontal e empilhado), o "O" que vira símbolo volta a ser letra: o símbolo aparece
         uma vez só. No "só o nome" a fusão continua: lá o O é o símbolo */
      const Lg = spec.logo || {}, dobra = temSimb && (arranjo === 'horizontal' || arranjo === 'vertical') && Lg.gesto === 'troca' && (Lg.trocaPor === 'ideia' || Lg.trocaPor === 'icone');
      let specW = dobra ? Object.assign({}, spec, { logo: Object.assign({}, Lg, { gesto: '' }) }) : spec;
      /* v3.43: sem capitular. A inicial do lado do nome que começa com ela (K + KVRA, C + HAPA) lê como letra dobrada ou
         nome quebrado; o motor não põe mais a inicial do lado do nome (aplicaTerritorio troca pelo outro molde) */
      const wm = wordmark(specW, fs, temSimb ? arranjo : 'wordmark'), nb = wm.bN.w ? wm.bN : wm.b;
      const inclina = Lg.efeito === 'inclinado', tg = tagline(spec, fs, nb.w, inclina);
      const fundo = Math.max(0, nb.y + nb.h), tgY = fundo + TAG.gap + (tg ? tg.tam : TAG.tam);
      const blocoT = nb.y, blocoB = tg ? tgY + tg.b.y + tg.b.h : nb.y + nb.h;
      const centro = (spec.logo && spec.logo.alinha) || (arranjo === 'vertical' ? 'centro' : 'esq');
      /* o nome entra com a TINTA dele em dx; a frase alinha pela tinta dela */
      const textoEls = (dx, dy) => {
        const o = wm.els.map(e => Object.assign({}, e, { d: tr(e.d, mx.t(dx - nb.x, dy)), parte: e.rastro ? 'rastro' : 'nome' }));
        if(tg){ const tx = (centro === 'centro' ? dx + (nb.w - tg.b.w) / 2 : dx) - tg.b.x; o.push({ d: tr(tg.d, mx.t(tx, dy + tgY)), papel: 'tagline', parte: 'frase' }); }
        /* a construção (v3.39): a linha de base do nome (a última, se ele quebra), a altura da maiúscula (a medida x = 100) e a do "x" */
        guia = { base: dy, cap: dy - 100, xh: dy - (wm.xh || 52), unidade: 100 };
        return o;
      };
      /* a TINTA do símbolo na caixa 100 (com meio traço e sem os furos): é ela que encaixa, não a caixa */
      const tintaS = M.juntaCaixas(simb.filter(e => e.papel !== 'furo').map(e => { const b = caixa(e.d), w = e.traco ? e.traco / 2 : 0; return { x: b.x - w, y: b.y - w, w: b.w + 2 * w, h: b.h + 2 * w }; }));
      const ponta = s.tipo === 'ideia' && ['avanco', 'faixas', 'chama', 'estrela', 'agulha'].includes(s.ideia) ? 1.06 : 1;
      const emLinha = s.estilo === 'linha' || s.tipo === 'orbita';
      if(arranjo === 'vertical' && temSimb && tintaS.w){
        /* empilhado: a tinta do símbolo até metade da largura do nome, entre 1,4 e 2,6 maiúsculas de altura (o de traço fino
           com a altura que ele tem do lado do nome, pra o traço continuar com o peso da letra); 0,6 de vão até a tinta do nome */
        const larg = Math.max(nb.w, tg ? tg.b.w : 0);
        let k = emLinha ? Math.min(260, Math.max(140, alvoR)) / tintaS.h : Math.min(0.5 * nb.w / tintaS.w, 260 / tintaS.h); k = Math.max(k, 140 / tintaS.h) * ponta;
        const sx = larg / 2 - (tintaS.x + tintaS.w / 2) * k, sy = -tintaS.y * k;
        poeSimbolo(simb, sx, sy, 100 * k).forEach(e => out.push(Object.assign(e, { parte: 'simbolo' })));
        textoEls((larg - nb.w) / 2, tintaS.h * k + 60 - nb.y).forEach(e => out.push(e));
        guia.simb = { x: larg / 2 - tintaS.w * k / 2, y: 0, w: tintaS.w * k, h: tintaS.h * k };
      } else if(arranjo === 'horizontal' && temSimb && tintaS.w){
        /* horizontal: a tinta do símbolo com a altura do bloco (1,3 maiúscula sem frase), centrada nele, e meia maiúscula de
           vão até a tinta do nome. Forma de ponta ganha 6% de correção ótica */
        const alvo = tg ? blocoB - blocoT : Math.max(130, nb.h);
        let k = Math.min(alvo / tintaS.h, 1.5 * alvo / tintaS.w) * ponta;
        const cyB = (blocoT + blocoB) / 2, sy = cyB - (tintaS.y + tintaS.h / 2) * k;
        const sx = -tintaS.x * k, simbEls = poeSimbolo(simb, sx, sy, 100 * k).map(e => Object.assign(e, { parte: 'simbolo' }));
        const tx = textoEls(tintaS.w * k + 50, 0);
        /* os rastros de velocidade saem de trás do símbolo, terminando meia haste antes da tinta dele */
        const rastros = tx.filter(e => e.parte === 'rastro');
        if(rastros.length){ const rb = M.juntaCaixas(rastros.map(e => caixa(e.d))), dxr = -haste * 0.5 - (rb.x + rb.w); rastros.forEach(e => { e.d = tr(e.d, mx.t(dxr, 0)); out.push(e); }); }
        simbEls.forEach(e => out.push(e));
        tx.filter(e => e.parte !== 'rastro').forEach(e => out.push(e));
        guia.simb = { x: 0, y: cyB - tintaS.h * k / 2, w: tintaS.w * k, h: tintaS.h * k };
      } else {
        textoEls(0, 0).forEach(e => out.push(e));
      }
    }
    const vb = M.juntaCaixas(out.filter(e => e.papel !== 'furo').map(e => { const b = caixa(e.d); const w = e.traco ? e.traco / 2 : 0; return { x: b.x - w, y: b.y - w, w: b.w + 2 * w, h: b.h + 2 * w }; }));
    if(guia){ const cx = l => M.juntaCaixas(out.filter(e => e.parte === l && e.papel !== 'furo').map(e => caixa(e.d))); const n = cx('nome'), f = cx('frase'); if(n.w) guia.nome = n; if(f.w) guia.frase = f; }
    return { els: out, vb, x, arranjo, guia };
  };

  /* PLACA: o nome numa placa de cor sólida com um fio por dentro, como placa de rua (lê de longe, vira sinalização) */
  function placa(spec, fs){
    const L = Object.assign({}, spec.logo, { gesto: '', efeito: spec.logo && spec.logo.efeito === 'inclinado' ? 'inclinado' : '' });
    const wm = wordmark(Object.assign({}, spec, { logo: L }), fs, 'placa'), tg = tagline(spec, fs, wm.b.w + 104);
    const px = 52, py = 38, x0 = wm.b.x - px, y0 = wm.b.y - py, w = wm.b.w + 2 * px, h = wm.b.h + 2 * py, out = [];
    out.push({ d: F.ret(x0, y0, w, h, 16), papel: 'marca' }, { d: F.ret(x0 + 13, y0 + 13, w - 26, h - 26, 8), papel: 'auto', sobre: 'marca', traco: 6, vazio: true });
    wm.els.forEach(e => out.push(Object.assign({}, e, e.papel === 'furo' ? {} : { papel: 'auto', sobre: 'marca' })));
    if(tg) out.push({ d: tr(tg.d, mx.t(x0 + (w - tg.w) / 2 - tg.b.x, y0 + h + 30 + tg.tam)), papel: 'tagline' });
    const vb = M.juntaCaixas(out.map(e => caixa(e.d)));
    return { els: out, vb: { x: vb.x - 4, y: vb.y - 4, w: vb.w + 8, h: vb.h + 8 }, x: 60, arranjo: 'placa' };
  }
  /* SELO: anel com o nome em volta e o símbolo no meio; ou a fita atravessando com o nome (estilo "fita") */
  function selo(spec, fs, simb){
    const R = 260, out = [], fita = spec.logo && spec.logo.selo === 'fita';
    out.push({ d: F.anel(0, 0, R, R - 11), papel: 'marca' });
    const nome = String(spec.nome || 'Marca'), cid = spec.cidade ? String(spec.cidade).split(',')[0].trim() : '', ano = String(spec.desde || '').trim(), tg = String(spec.tagline || '').trim();
    /* as linhas em volta, sem repetir nada: no selo simples, o nome em cima; na fita (o nome tá nela), a cidade ou o ano em cima */
    const linhaCima = fita ? (cid || (ano ? 'desde ' + ano : '')) : nome;
    const linhaBaixo = tg || (fita ? (cid && ano ? 'desde ' + ano : '') : [ano ? 'desde ' + ano : '', cid].filter(Boolean).join(' · '));
    const fCima = fita ? fs.texto : fs.display;
    /* sem nada pra escrever num arco: três estrelas no lugar */
    const estrelas = centro => [-1, 0, 1].forEach(k => { const a = (centro + k * 9) * Math.PI / 180, rr = R - 48; out.push({ d: F.estrela(rr * Math.cos(a), rr * Math.sin(a), 11, 4.6, 5, -90), papel: 'marca' }); });
    if(linhaCima){
      let tam = fita ? 26 : 42;
      const largMax = (R - 70) * Math.PI * 0.95;
      while(tam > 16 && M.largura(fCima, linhaCima, { tam, caixa: 'alta', track: fita ? 0.18 : 0.08 }) > largMax) tam -= 2;
      out.push({ d: M.textoArco(fCima, linhaCima, { tam, caixa: 'alta', track: fita ? 0.18 : 0.08, r: R - 36 - tam, centro: -90 }).cmds, papel: fita ? 'tagline' : 'texto' });
    } else estrelas(-90);
    if(linhaBaixo){
      let t2 = 20; const larg2 = (R - 64) * Math.PI * 0.62;
      while(t2 > 12 && M.largura(fs.texto, linhaBaixo, { tam: t2, caixa: 'alta', track: 0.16 }) > larg2) t2 -= 1;
      out.push({ d: M.textoArco(fs.texto, linhaBaixo, { tam: t2, caixa: 'alta', track: 0.16, r: R - 40 - t2, centro: 90, baixo: true }).cmds, papel: 'tagline' });
    } else estrelas(90);
    [180, 0].forEach(g => { const a = g * Math.PI / 180, rr = R - 46; out.push({ d: F.elipse(rr * Math.cos(a), rr * Math.sin(a), 5), papel: 'marca' }); });
    const miolo = R - 86;
    if(fita){
      /* a fita: um retângulo que passa do anel, com as pontas dobradas pra trás */
      const h = 92, w = 2 * R + 70, y0 = 18;
      [[-1], [1]].forEach(([lado]) => {
        const xe = lado * (R + 35), xi = lado * (R - 8);
        out.push({ d: F.poli([[xe, y0 + 26], [xe + lado * 46, y0 + 26], [xe + lado * 26, y0 + 26 + h / 2], [xe + lado * 46, y0 + 26 + h], [xe, y0 + 26 + h]]), papel: 'sec' });
        out.push({ d: F.poli([[xi, y0 + h], [xe, y0 + h], [xe, y0 + 26 + h]]), papel: 'texto' });
      });
      out.push({ d: F.ret(-w / 2, y0, w, h, 0), papel: 'marca' });
      let tf = 64; while(tf > 22 && M.largura(fs.display, nome, { tam: tf, caixa: 'alta', track: 0.04 }) > w - 70) tf -= 2;
      const tn = M.texto(fs.display, nome, { tam: tf, caixa: 'alta', track: 0.04 });
      out.push({ d: tr(tn.cmds, mx.t(-tn.w / 2, y0 + h / 2 + tf / 2)), papel: 'furo' });
      if(simb.length){ const S = miolo * 0.95; poeSimbolo(simb, -S / 2, -S - 6, S).forEach(e => out.push(e)); }
      else { const t = M.texto(fs.display, M.iniciais(nome), { tam: 100, caixa: 'alta' }); out.push({ d: M.encaixa(t, 0, -miolo * 0.5, miolo, miolo * 0.6), papel: 'texto' }); }
    } else if(simb.length){ const S = miolo * 1.32; poeSimbolo(simb, -S / 2, -S / 2, S).forEach(e => out.push(e)); }
    else { const t = M.texto(fs.display, M.iniciais(nome), { tam: 100, caixa: 'alta' }); out.push({ d: M.encaixa(t, 0, 0, miolo * 1.2, miolo * 0.9), papel: 'texto' }); }
    const vb = M.juntaCaixas(out.filter(e => e.papel !== 'furo').map(e => caixa(e.d)));
    return { els: out, vb: { x: vb.x - 4, y: vb.y - 4, w: vb.w + 8, h: vb.h + 8 }, x: R * 0.2, arranjo: 'selo' };
  }

  /* as versões: cada papel vira uma cor (tinta e papel servem pro "auto": a cor que mais lê em cima de outra) */
  M.versoes = c => {
    const ink = c.ink, pap = c.paper, txtP = M.texto_em(c.p, ink, pap);
    const pNoEscuro = M.contraste(c.p, ink) >= 2.6 ? c.p : pap;
    const aNoEscuro = M.contraste(c.a, ink) >= 2 ? c.a : pap;
    const aNoClaro = M.contraste(c.a, pap) >= 1.6 ? c.a : c.p;
    return {
      principal: { n: 'Principal', fundo: pap, marca: c.p, texto: ink, tagline: ink, sec: c.s, acento: aNoClaro, sombra: c.a === aNoClaro ? c.a : c.s, furo: pap, tinta: ink, papel: pap },
      negativo: { n: 'Negativo', fundo: ink, marca: pNoEscuro, texto: pap, tagline: pap, sec: c.s, acento: aNoEscuro, sombra: pNoEscuro === pap ? c.a : c.p, furo: ink, tinta: ink, papel: pap },
      cor: { n: 'Na cor da marca', fundo: c.p, marca: txtP, texto: txtP, tagline: txtP, sec: txtP, acento: M.contraste(c.a, c.p) >= 1.8 ? c.a : txtP, sombra: M.contraste(c.a, c.p) > 1.6 ? c.a : (txtP === ink ? pap : ink), furo: c.p, tinta: ink, papel: pap },
      preto: { n: 'Uma cor (escura)', fundo: '#FFFFFF', marca: ink, texto: ink, tagline: ink, sec: ink, acento: ink, sombra: ink, furo: '#FFFFFF', mono: true, tinta: ink, papel: '#FFFFFF' },
      branco: { n: 'Uma cor (clara)', fundo: ink, marca: '#FFFFFF', texto: '#FFFFFF', tagline: '#FFFFFF', sec: '#FFFFFF', acento: '#FFFFFF', sombra: '#FFFFFF', furo: ink, mono: true, tinta: ink, papel: '#FFFFFF' }
    };
  };
  M.versaoPrincipal = sp => { const vs = M.versoes(sp.cores); return sp.cores.fundo === 'ink' ? vs.negativo : sp.cores.fundo === 'p' ? vs.cor : vs.principal; };
  /* na vitrine (amostras e prancha), cada uma num fundo: a principal, na cor da marca e no escuro */
  M.versaoVitrine = (sp, i) => { const vs = M.versoes(sp.cores), lista = [M.versaoPrincipal(sp), vs.cor, vs.negativo].filter((v, j, a) => a.findIndex(x => x.fundo === v.fundo) === j); return lista[(i || 0) % lista.length]; };
  /* pinta um logo numa versão: devolve a cena (com os furos marcados) */
  M.pinta = (lg, v) => lg.els.filter(e => !(v.mono && e.papel === 'sombra')).map(e => {
    let cor;
    if(e.papel === 'auto'){ const base = v[e.sobre] || v.marca; cor = v.mono ? (base === v.papel || base === '#FFFFFF' ? v.tinta : '#FFFFFF') : (M.contraste(base, v.tinta) >= M.contraste(base, v.papel) ? v.tinta : v.papel); }
    else cor = e.papel === 'furo' ? '#000' : (v[e.papel] || v.marca);
    const furo = e.papel === 'furo';
    const base = { d: e.d, furo, cf: furo ? v.furo : null, clip: e.clip, clipEo: e.clipEo, parte: e.parte };
    /* v3.43: o papel "fundo" pinta com a cor do fundo (o vão do monograma sobreposto); no mockup vira a cor de lá */
    if(e.papel === 'fundo') base.vao = true;
    if(e.traco) return Object.assign(base, { f: e.vazio || furo || e.papel !== 'furo' ? null : null, s: cor, w: e.traco, cap: e.ponta || 'round' });
    return Object.assign(base, { f: cor });
  });
  /* pinta sobre um fundo conhecido (mockup): o furo vira a cor do que tá embaixo */
  M.pintaSobre = (lg, v, fundoLocal) => M.pinta(lg, v).map(e => e.furo || e.vao ? Object.assign({}, e, { furo: false, f: e.f ? fundoLocal : null, s: e.s ? fundoLocal : null }) : e);
  /* o SVG pronto de um logo numa versão (fundo opcional) */
  M.logoSvg = (lg, v, o) => { o = o || {}; const m = o.margem === undefined ? lg.x * 0.6 : o.margem; const vb = { x: lg.vb.x - m, y: lg.vb.y - m, w: lg.vb.w + 2 * m, h: lg.vb.h + 2 * m }; return M.svg(M.pinta(lg, v), Object.assign({ vb, fundo: o.fundo ? v.fundo : null }, o)); };
  /* encaixa um logo numa caixa (pra mockup): els já pintados e posicionados */
  M.logoNaCaixa = (lg, v, x, y, w, h, fundoLocal, alinha) => {
    const e = Math.min(w / lg.vb.w, h / lg.vb.h), lw = lg.vb.w * e, lh = lg.vb.h * e;
    const dx = alinha === 'esq' ? x : x + (w - lw) / 2, dy = y + (h - lh) / 2;
    return M.trEls(fundoLocal ? M.pintaSobre(lg, v, fundoLocal) : M.pinta(lg, v), mx.x(mx.t(dx, dy), mx.x(mx.s(e), mx.t(-lg.vb.x, -lg.vb.y))));
  };
})();

/* ---------------- SAÍDAS: PNG, PDF vetor e ZIP ---------------- */
(function(){
  'use strict';
  const C = window.Corre, M = C.labMotor;
  const { parse } = M;
  const enc = new TextEncoder();
  /* SVG -> PNG (transparente, a não ser que o SVG tenha fundo) */
  M.png = (svg, w, h, tipo, q) => new Promise((ok, falha) => {
    const s = String(svg).replace(/<svg\b([^>]*)>/, (m, at) => `<svg width="${w}" height="${h}"${at.replace(/\s(width|height)="[^"]*"/g, '')}>`);
    const im = new Image();
    im.onload = () => { try{ const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const cx = cv.getContext('2d'); if(tipo === 'image/jpeg'){ cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h); } cx.drawImage(im, 0, 0, w, h); cv.toBlob(b => b ? ok(b) : falha(new Error('png')), tipo || 'image/png', q || 0.9); }catch(e){ falha(e); } };
    im.onerror = () => falha(new Error('svg'));
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  });
  M.canvasBlob = (cv, tipo, q) => new Promise((ok, falha) => cv.toBlob(b => b ? ok(b) : falha(new Error('blob')), tipo || 'image/png', q || 0.9));
  M.bytes = async b => b instanceof Uint8Array ? b : typeof b === 'string' ? enc.encode(b) : new Uint8Array(await b.arrayBuffer());
  const comprime = async (bytes, modo) => {
    if(typeof CompressionStream === 'undefined') return null;
    try{ const s = new Blob([bytes]).stream().pipeThrough(new CompressionStream(modo)); return new Uint8Array(await new Response(s).arrayBuffer()); }catch(e){ return null; }
  };
  M.baixar = (blob, nome) => { const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = nome; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(u); a.remove(); }, 4000); };

  /* ---------- PDF de verdade, em curvas ---------- */
  const n2 = v => { const r = Math.round(v * 100) / 100; return Object.is(r, -0) ? '0' : String(r); };
  const corPdf = hex => M.hexRgb(hex).map(v => n2(Math.round(v * 1000) / 1000)).join(' ');
  const pdfTexto = s => { /* texto com acento vai em UTF-16 */ const h = ['FEFF']; for(const ch of String(s)){ const c = ch.codePointAt(0); if(c > 0xFFFF){ const v = c - 0x10000; h.push(((v >> 10) + 0xD800).toString(16).padStart(4, '0'), ((v & 0x3FF) + 0xDC00).toString(16).padStart(4, '0')); } else h.push(c.toString(16).padStart(4, '0')); } return '<' + h.join('').toUpperCase() + '>'; };
  function caminhoPdf(cmds){
    const o = []; let x = 0, y = 0;
    for(const c of parse(cmds)){
      if(c[0] === 'M'){ o.push(n2(c[1]) + ' ' + n2(c[2]) + ' m'); x = c[1]; y = c[2]; }
      else if(c[0] === 'L'){ o.push(n2(c[1]) + ' ' + n2(c[2]) + ' l'); x = c[1]; y = c[2]; }
      else if(c[0] === 'C'){ o.push([c[1], c[2], c[3], c[4], c[5], c[6]].map(n2).join(' ') + ' c'); x = c[5]; y = c[6]; }
      else if(c[0] === 'Q'){ const c1x = x + 2 / 3 * (c[1] - x), c1y = y + 2 / 3 * (c[2] - y), c2x = c[3] + 2 / 3 * (c[1] - c[3]), c2y = c[4] + 2 / 3 * (c[2] - c[4]); o.push([c1x, c1y, c2x, c2y, c[3], c[4]].map(n2).join(' ') + ' c'); x = c[3]; y = c[4]; }
      else if(c[0] === 'Z') o.push('h');
    }
    return o.join('\n');
  }
  /* paginas: [{ w, h (em pontos), esc (unidade da cena -> ponto), els, imgs: [{ x, y, w, h, jpg: Uint8Array, iw, ih }] }] */
  M.pdf = async (paginas, info) => {
    info = info || {};
    const objs = []; /* cada um: Uint8Array */
    const novo = () => { objs.push(null); return objs.length; };
    const poe = (n, partes) => { objs[n - 1] = partes; };
    const cat = novo(), pags = novo(), inf = novo();
    const kids = [];
    const gsCache = {};
    for(const pg of paginas){
      const pn = novo(), cn = novo();
      kids.push(pn);
      const esc = pg.esc || 1, recs = { img: [], gs: [] };
      const o = [`q ${n2(esc)} 0 0 ${n2(-esc)} 0 ${n2(pg.h)} cm`];
      if(pg.fundo) o.push(`${corPdf(pg.fundo)} rg 0 0 ${n2(pg.w / esc)} ${n2(pg.h / esc)} re f`);
      const desenha = (el) => {
        if(el.img){
          const im = el.img, nome = 'Im' + (recs.img.length + 1), on = novo();
          poe(on, [`<< /Type /XObject /Subtype /Image /Width ${im.iw} /Height ${im.ih} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.jpg.length} >>\nstream\n`, im.jpg, '\nendstream']);
          recs.img.push([nome, on]);
          o.push(`q ${n2(im.w)} 0 0 ${n2(-im.h)} ${n2(im.x)} ${n2(im.y + im.h)} cm /${nome} Do Q`);
          return;
        }
        const f = el.furo ? (el.f ? el.cf : null) : el.f, s = el.furo ? (el.s ? el.cf : null) : el.s;
        if(!f && !s) return;
        const p = caminhoPdf(el.d); if(!p) return;
        const g = [];
        if(el.clip){ const cp = caminhoPdf(el.clip); if(cp) g.push(cp + (el.clipEo ? ' W* n' : ' W n')); }
        if(el.op !== undefined && el.op < 1){ const k = n2(el.op); if(!gsCache[k]){ const gn = novo(); poe(gn, [`<< /Type /ExtGState /ca ${k} /CA ${k} >>`]); gsCache[k] = gn; } const nome = 'G' + k.replace('.', '_'); if(!recs.gs.find(x => x[0] === nome)) recs.gs.push([nome, gsCache[k]]); g.push(`/${nome} gs`); }
        if(f) g.push(corPdf(f) + ' rg');
        if(s) g.push(corPdf(s) + ' RG', n2(el.w || 1) + ' w', (el.cap === 'butt' ? 0 : el.cap === 'square' ? 2 : 1) + ' J', (el.join === 'miter' ? 0 : 1) + ' j');
        o.push('q ' + g.join(' ') + '\n' + p + '\n' + (f && s ? (el.eo ? 'B*' : 'B') : f ? (el.eo ? 'f*' : 'f') : 'S') + ' Q');
      };
      (pg.els || []).forEach(desenha);
      o.push('Q');
      const conteudo = enc.encode(o.join('\n'));
      const z = await comprime(conteudo, 'deflate');
      poe(cn, z ? [`<< /Length ${z.length} /Filter /FlateDecode >>\nstream\n`, z, '\nendstream'] : [`<< /Length ${conteudo.length} >>\nstream\n`, conteudo, '\nendstream']);
      const res = `<< ${recs.img.length ? '/XObject << ' + recs.img.map(([nm, on]) => `/${nm} ${on} 0 R`).join(' ') + ' >> ' : ''}${recs.gs.length ? '/ExtGState << ' + recs.gs.map(([nm, on]) => `/${nm} ${on} 0 R`).join(' ') + ' >> ' : ''}>>`;
      poe(pn, [`<< /Type /Page /Parent ${pags} 0 R /MediaBox [0 0 ${n2(pg.w)} ${n2(pg.h)}] /Contents ${cn} 0 R /Resources ${res} >>`]);
    }
    poe(cat, [`<< /Type /Catalog /Pages ${pags} 0 R >>`]);
    poe(pags, [`<< /Type /Pages /Kids [${kids.map(k => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`]);
    poe(inf, [`<< /Title ${pdfTexto(info.titulo || 'Marca')} /Author ${pdfTexto(info.autor || 'Studio Houzi')} /Producer ${pdfTexto('Corre · Studio Houzi')} /Creator ${pdfTexto('Corre · Studio Houzi')} >>`]);
    /* monta com o xref */
    const partes = [enc.encode('%PDF-1.4\n%âãÏÓ\n')]; let pos = partes[0].length; const xref = [];
    objs.forEach((ps, i) => {
      xref.push(pos);
      const cab = enc.encode(`${i + 1} 0 obj\n`); partes.push(cab); pos += cab.length;
      ps.forEach(p => { const b = typeof p === 'string' ? enc.encode(p) : p; partes.push(b); pos += b.length; });
      const fim = enc.encode('\nendobj\n'); partes.push(fim); pos += fim.length;
    });
    const xs = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + xref.map(p => String(p).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size ${objs.length + 1} /Root ${cat} 0 R /Info ${inf} 0 R >>\nstartxref\n${pos}\n%%EOF\n`;
    partes.push(enc.encode(xs));
    return new Blob(partes, { type: 'application/pdf' });
  };
  /* um logo numa página do tamanho dele (arquivo "em curvas" pra gráfica) */
  M.logoPdf = (lg, v, o) => {
    o = o || {}; const m = lg.x * 0.6, vb = { x: lg.vb.x - m, y: lg.vb.y - m, w: lg.vb.w + 2 * m, h: lg.vb.h + 2 * m };
    const larg = o.larg || 600, esc = larg / vb.w, els = M.trEls(M.pinta(lg, v).map(e => Object.assign({}, e, { cf: e.furo ? (o.fundo ? v.fundo : v.furo) : e.cf })), M.mx.t(-vb.x, -vb.y));
    return M.pdf([{ w: larg, h: vb.h * esc, esc, els, fundo: o.fundo ? v.fundo : null }], o.info);
  };

  /* ---------- ZIP (sem biblioteca) ---------- */
  const CRC = (() => { const t = new Uint32Array(256); for(let n = 0; n < 256; n++){ let c = n; for(let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = b => { let c = 0xFFFFFFFF; for(let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  M.zip = async arquivos => {
    const d = new Date(), tempo = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2), data = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    const partes = [], central = []; let pos = 0;
    for(const a of arquivos){
      const dados = await M.bytes(a.dados), nome = enc.encode(a.nome), crc = crc32(dados);
      const jaComp = /\.(png|jpe?g|pdf|zip|woff2?|gif|webp|mp4|webm|m4a)$/i.test(a.nome);
      const z = jaComp ? null : await comprime(dados, 'deflate-raw');
      const usa = z && z.length < dados.length ? z : null, met = usa ? 8 : 0, corpo = usa || dados;
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, met, true); h.setUint16(10, tempo, true); h.setUint16(12, data, true);
      h.setUint32(14, crc, true); h.setUint32(18, corpo.length, true); h.setUint32(22, dados.length, true); h.setUint16(26, nome.length, true); h.setUint16(28, 0, true);
      partes.push(new Uint8Array(h.buffer), nome, corpo);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, met, true); c.setUint16(12, tempo, true); c.setUint16(14, data, true);
      c.setUint32(16, crc, true); c.setUint32(20, corpo.length, true); c.setUint32(24, dados.length, true); c.setUint16(28, nome.length, true); c.setUint16(30, 0, true); c.setUint16(32, 0, true);
      c.setUint16(34, 0, true); c.setUint16(36, 0, true); c.setUint32(38, 0, true); c.setUint32(42, pos, true);
      central.push(new Uint8Array(c.buffer), nome);
      pos += 30 + nome.length + corpo.length;
    }
    const tamC = central.reduce((s, b) => s + b.length, 0);
    const fim = new DataView(new ArrayBuffer(22));
    fim.setUint32(0, 0x06054b50, true); fim.setUint16(8, arquivos.length, true); fim.setUint16(10, arquivos.length, true); fim.setUint32(12, tamC, true); fim.setUint32(16, pos, true);
    return new Blob([...partes, ...central, new Uint8Array(fim.buffer)], { type: 'application/zip' });
  };

})();

/* ---------------- O EXPERIMENTO: territórios criativos, as 6 amostras e o porquê de cada escolha ---------------- */
(function(){
  'use strict';
  const C = window.Corre, M = C.labMotor;
  /* eixos da personalidade (0..1): [clássico→moderno, sério→divertido, sofisticado→popular, calmo→energia, artesanal→tech] */
  M.EIXOS = [['Clássica', 'Moderna'], ['Séria', 'Divertida'], ['Sofisticada', 'Popular'], ['Calma', 'Energia'], ['Artesanal', 'Tech']];
  /* cada território é um conceito com regra própria (letra, símbolo, cor, textura e onde ele vive) */
  const T = M.TERRITORIOS = {
    rua: { n: 'Rua', frase: 'A marca que nasce no muro.', v: [.75, .62, .86, .92, .42], ni: ['comida', 'moda', 'bebidas', 'musica', 'fitness', 'arte', 'auto'],
      fontes: ['heroscn-bold', 'inter-black'], caixa: 'alta', track: -0.005, efeitos: [''], arranjos: ['horizontal', 'vertical'],
      gestos: [['separador', { sep: '/' }], ['hierarquia'], ['estencil'], ['empilha'], ['encosta'], ['corte']],
      simbs: [{ tipo: 'ideia' }, { tipo: 'ideia', letra: true }, { tipo: 'nenhum' }], pal: { esquema: 'complementar', mais: 0.12 }, textura: 'xerox', fundo: 'paper',
      receitas: [{ n: 'Lambe-lambe', p: '#E4322B', s: '#F2D43D', a: '#2A57E6', ink: '#151413', paper: '#F1ECE1', h: 'o vermelho e o amarelo dos cartazes de show colados um em cima do outro no tapume' },
        { n: 'Muro de Cal', p: '#F5C518', s: '#E4322B', a: '#2A57E6', ink: '#151413', paper: '#EFEBE3', fundo: 'p', h: 'o amarelo de pintura de muro de esquina, aquele que anuncia de longe' },
        { n: 'Spray Azul', p: '#2B50E8', s: '#FF5A36', a: '#F5C518', ink: '#12131A', paper: '#F2EFE8', h: 'o azul de lata de spray, com o laranja de cone de obra pra esquentar' },
        { n: 'Porta de Aço', p: '#FF5A1F', s: '#3B3F46', a: '#F5C518', ink: '#17181B', paper: '#EDEAE4', h: 'o laranja de letreiro pintado à mão em porta de aço de comércio' }],
      aplic: ['lambe', 'adesivo', 'camiseta', 'fachada', 'instagram', 'copo'],
      ideia: 'A marca como letreiro de rua: feita pra ser lida do outro lado da avenida, colada em poste, pintada em porta de aço e repetida em adesivo. Peso, contraste e atitude, sem pedir licença.',
      vive: 'Ela vive na rua e no feed com a mesma cara: lambe, adesivo, camiseta, copo e fachada. A regra é uma só: grande, contrastado e repetido até virar paisagem do bairro.',
      elem: 'Os elementos de apoio vêm do muro: o grão de xerox por cima das cores, o corte de estêncil virando faixa e o nome repetido como lambe.',
      porque: { letra: 'Condensada e pesada, como letreiro pintado em porta de aço: cabe grande em qualquer muro e lê do outro lado da rua.', cor: 'Contraste de cartaz: {p} pra chamar, {ink} pra segurar. Sobrevive a xerox, a sol e a tela de celular com brilho no mínimo.' } },
    zine: { n: 'Zine', frase: 'Faz você mesmo. Faz bem feito.', v: [.5, .72, .8, .74, .3], ni: ['musica', 'arte', 'moda', 'criativo', 'bebidas', 'educacao'],
      fontes: ['cursor-bold', 'inter-bold'], caixa: 'baixa', track: -0.02, efeitos: [''], arranjos: ['horizontal', 'vertical'],
      gestos: [['empilha'], ['encosta'], ['separador', { sep: '+' }], ['']],
      simbs: [{ tipo: 'nenhum' }, { tipo: 'ideia', estilo: 'linha' }], pal: { fluor: true }, textura: 'xerox', fundo: 'paper',
      receitas: [{ n: 'Xerox Rosa', p: '#141414', s: '#D9D6CE', a: '#FF2E93', ink: '#141414', paper: '#F4F1EA', h: 'preto de fotocópia com um rosa fluorescente de marca-texto' },
        { n: 'Xerox Amarelo', p: '#141414', s: '#D9D6CE', a: '#F2E94E', ink: '#141414', paper: '#F4F1EA', h: 'preto de fotocópia com o amarelo de bloquinho adesivo e de fita de aviso' },
        { n: 'Xerox Laranja', p: '#141414', s: '#D9D6CE', a: '#FF5A1F', ink: '#141414', paper: '#F4F1EA', h: 'preto de fotocópia com o laranja de fita de obra e de brasa' },
        { n: 'Papel Carbono', p: '#2335C8', s: '#D7D4CC', a: '#FF4F2E', ink: '#141414', paper: '#F3EFE6', h: 'o azul de papel carbono e de caneta esferográfica, com laranja de etiqueta' }],
      aplic: ['zine', 'lambe', 'adesivo', 'camiseta', 'instagram', 'sacola'],
      ideia: 'A marca como fanzine: cola, tesoura e intenção. Nada de perfeição de máquina; o charme tá no que parece feito à mão, com recorte, grampo e rabisco, mas com olho de editor por trás.',
      vive: 'Vive no papel e no improviso: fanzine, lambe, adesivo, sacola de pano, camiseta de serigrafia e post de feed com cara de colagem.',
      elem: 'Os elementos de apoio são de mesa de colagem: grão de xerox, pedaços de papel recortado, colchetes de edição e o símbolo carimbado torto de propósito.',
      porque: { letra: 'Letra de máquina de escrever: cara de recado datilografado, de fanzine grampeado, de coisa feita com a mão e com intenção.', cor: 'Preto de xerox e uma cor fluorescente ({a}) que grita no meio do cinza. Dá pra imprimir em qualquer copiadora e continua sendo a marca.' } },
    arcade: { n: 'Arcade', frase: 'Aperta start.', v: [.96, .88, .7, .84, .96], ni: ['tech', 'musica', 'bebidas', 'eventos', 'criativo'],
      fontes: ['pixel'], caixa: 'alta', track: 0.02, efeitos: [''], arranjos: ['horizontal', 'vertical'],
      gestos: [['separador', { sep: '_' }], ['']],
      simbs: [{ tipo: 'pixel' }, { tipo: 'pixel' }, { tipo: 'nenhum' }], pal: { esquema: 'dividida', mais: 0.08 }, textura: 'scan', fundo: 'ink',
      receitas: [{ n: 'Fliperama', p: '#FF2E88', s: '#3A1F7A', a: '#FFE14D', ink: '#0E0B1F', paper: '#F4F1FF', h: 'o magenta e o amarelo das luzes de fliperama num salão escuro' },
        { n: 'Tubo de Imagem', p: '#38E1FF', s: '#7B2CFF', a: '#FF4FA3', ink: '#0B0F1C', paper: '#EEF6FF', h: 'o ciano e o violeta de tela de tubo ligada no escuro' },
        { n: 'Ficha Dourada', p: '#FFB800', s: '#FF3D3D', a: '#4D7CFF', ink: '#120E0A', paper: '#FFF6E0', h: 'o dourado de ficha de fliperama, com o vermelho do botão de start' }],
      aplic: ['tela', 'adesivo', 'neon', 'camiseta', 'instagram', 'bone'],
      ideia: 'A marca como tela de abertura de jogo: começa quando você aperta start. Tudo é desenhado em pixel, numa grade, com a precisão de quem monta fase e a alegria de quem joga.',
      vive: 'Vive na tela e no escuro: avatar, tela de abertura, adesivo, neon, camiseta e boné. Funciona melhor em fundo escuro, onde as cores acendem.',
      elem: 'Os elementos de apoio vêm do jogo: a grade de pixels, linhas de varredura de tela antiga, o ícone 8-bit desenhado casa por casa e o brilho em volta do que importa.',
      porque: { letra: 'A Houzi Pixel foi desenhada no Studio Houzi, casa por casa, numa grade de 5x7: memória de fliperama, de videogame portátil, de letreiro de painel. É uma letra que só existe aqui.', cor: 'Fundo escuro de tela e {p} acendendo em cima, com {a} de brilho: a paleta já nasce com cara de neon.' } },
    gp: { n: 'Grand Prix', frase: 'Rápido no nome, rápido na entrega.', v: [.8, .55, .72, 1, .62], ni: ['comida', 'auto', 'fitness', 'moda', 'servicos'],
      fontes: ['inter-black', 'heroscn-bold'], caixa: 'alta', track: -0.01, efeitos: ['inclinado'], arranjos: ['horizontal'],
      gestos: [['velocidade'], ['pesos'], ['encosta'], ['separador', { sep: '/' }], ['']],
      simbs: [{ tipo: 'ideia' }, { tipo: 'ideia' }, { tipo: 'nenhum' }], pal: { corrida: true }, textura: 'xadrez', fundo: 'paper',
      receitas: [{ n: 'Largada', p: '#E3170A', s: '#141414', a: '#F2D43D', ink: '#141414', paper: '#FAF7F0', h: 'o vermelho do semáforo de largada, com o preto do asfalto e a faixa amarela da pista' },
        { n: 'Pit Lane', p: '#FF6B00', s: '#1B1E24', a: '#2F6BFF', ink: '#15171B', paper: '#F5F3EE', h: 'o laranja de macacão de equipe de box, com o azul da telemetria' },
        { n: 'Pódio', p: '#1446E0', s: '#F2D43D', a: '#E3170A', ink: '#10131C', paper: '#F6F4EE', h: 'o azul de carro de corrida antigo, com o amarelo e o vermelho do pódio' }],
      aplic: ['bone', 'adesivo', 'camiseta', 'copo', 'instagram', 'fachada'],
      ideia: 'A marca como carro de corrida: inclinada pra frente, pesada e sem enfeite. Ela já aparece andando, porque o assunto é chegar antes.',
      vive: 'Vive em movimento: boné, adesivo, copo, camiseta, fachada e embalagem pra viagem. O quadriculado aparece como fita de apoio, nunca no lugar do logo.',
      elem: 'Os elementos de apoio vêm da pista: o quadriculado da bandeira de chegada, faixas de velocidade, numeração de carro e a inclinação de 12 graus que vale pra tudo.',
      porque: { letra: 'Pesada e inclinada pra frente, como número pintado na lateral do carro: a marca já parece estar andando.', cor: '{p} de largada, {ink} de asfalto e {a} de faixa de pódio. O quadriculado entra como apoio, nunca no lugar do logo.' } },
    editorial: { n: 'Editorial', frase: 'Feita pra ser lida devagar.', v: [.4, .3, .22, .34, .28], ni: ['cafe', 'beleza', 'moda', 'educacao', 'criativo', 'saude'],
      fontes: ['lora-bolditalic', 'pagella-bold', 'lora-bold'], caixa: 'titulo', track: 0.005, efeitos: [''], arranjos: ['vertical', 'horizontal'],
      gestos: [['hierarquia'], ['fios'], ['versalete'], ['pendente'], ['fiolado'], ['separador', { sep: '—' }], ['corte'], ['']],
      simbs: [{ tipo: 'nenhum' }, { tipo: 'ideia', estilo: 'linha' }, { tipo: 'monograma', estilo: 'liga' }], pal: { esquema: 'mono' }, textura: 'papel', fundo: 'paper',
      receitas: [{ n: 'Tinta Azul', p: '#1F3A93', s: '#C9D2EA', a: '#C79A3B', ink: '#1A1C24', paper: '#F7F4EC', h: 'o azul de tinta de caneta-tinteiro em papel bom, com um fio de ouro' },
        { n: 'Bordô', p: '#7A1F2B', s: '#E7D3D0', a: '#B88A3E', ink: '#1E1617', paper: '#F8F3EC', h: 'o bordô de capa de livro de biblioteca, com o dourado da letra gravada' },
        { n: 'Grafite e Ouro', p: '#2B2B2E', s: '#D8D4CB', a: '#B8913A', ink: '#161618', paper: '#F6F2EA', h: 'grafite de lápis bom e ouro de título gravado em capa dura' }],
      aplic: ['revista', 'sacola', 'cartao', 'instagram', 'copo', 'fachada'],
      ideia: 'A marca como capa de revista: uma serifa com ritmo, muito respiro e fios finos organizando tudo. Ela não grita; ela é lida com calma, e por isso é lembrada.',
      vive: 'Vive no detalhe: sacola de papel, cartão, etiqueta, revista, copo e fachada com letra gravada. Pede papel bom e bastante espaço em branco.',
      elem: 'Os elementos de apoio vêm da diagramação: fios finos, numeração de página, capitulares, grade de colunas e a textura de papel encorpado.',
      porque: { letra: 'Uma serifa com ritmo de revista: tem contraste, tem respiro e tem calma. A marca fala baixo e todo mundo escuta.', cor: 'Uma cor principal ({p}) em vários tons, com {a} de detalhe: a elegância vem do que fica de fora.' } },
    noir: { n: 'Noir', frase: 'Toda marca tem sua cena.', v: [.36, .14, .14, .56, .36], ni: ['bebidas', 'beleza', 'moda', 'criativo', 'musica', 'arte'],
      fontes: ['pagella-bold', 'lora-bold'], caixa: 'alta', track: 0.14, efeitos: [''], arranjos: ['vertical', 'horizontal'],
      gestos: [['hierarquia'], ['versalete'], ['corte'], ['separador', { sep: '·' }], ['']],
      simbs: [{ tipo: 'nenhum' }, { tipo: 'ideia', estilo: 'linha' }, { tipo: 'monograma', estilo: 'liga' }], pal: { esquema: 'mono', escuro: true }, textura: 'grao', fundo: 'ink',
      receitas: [{ n: 'Luz Vermelha', p: '#E0364B', s: '#2A2224', a: '#E8C07A', ink: '#0F0C0D', paper: '#F2ECE4', h: 'a única luz vermelha acesa num corredor escuro' },
        { n: 'Azul de Cinema', p: '#5B7BFF', s: '#22263A', a: '#E9D8A6', ink: '#0C0E16', paper: '#EEF0F6', h: 'o azul da luz do projetor atravessando a fumaça da sala' },
        { n: 'Âmbar', p: '#F2A541', s: '#2A2016', a: '#F4E9D8', ink: '#110D09', paper: '#F3EEE6', h: 'o âmbar de lâmpada de filamento num bar de porta fechada' }],
      aplic: ['cartaz', 'ingresso', 'fachada', 'instagram', 'sacola', 'cartao'],
      ideia: 'A marca como abertura de filme: maiúsculas espaçadas, muito escuro em volta e uma única luz acesa. O que ela não mostra também conta, e é isso que dá vontade de entrar.',
      vive: 'Vive à meia-luz: cartaz, ingresso, fachada com letreiro, cartão, sacola preta e post que parece fotograma.',
      elem: 'Os elementos de apoio vêm do cinema: grão de filme, barras de tela larga, créditos espaçados e um único ponto de luz na cor da marca.',
      porque: { letra: 'Maiúsculas espaçadas, como crédito de abertura de filme: cada letra entra em cena sozinha.', cor: 'Quase tudo no escuro e {p} como a única luz acesa. É cinema: o que a marca não mostra também conta.' } },
    selo: { n: 'Selo de Origem', frase: 'Feito à mão, assinado embaixo.', v: [.14, .55, .62, .38, .05], ni: ['cafe', 'doces', 'comida', 'agro', 'bebidas', 'arte'],
      fontes: ['bonum-bold', 'schola-bold', 'cursor-bold'], caixa: 'alta', track: 0.04, efeitos: [''], arranjos: ['selo'],
      gestos: [['']],
      simbs: [{ tipo: 'ideia' }], pal: { esquema: 'analoga', quente: true }, textura: 'carimbo', fundo: 'paper',
      receitas: [{ n: 'Forno', p: '#B4442A', s: '#E9B44C', a: '#2E4A8C', ink: '#2A1A12', paper: '#F6EEDF', h: 'a terracota de forno a lenha e a mostarda de pão saindo, com um azul de azulejo' },
        { n: 'Kraft', p: '#7A4A2A', s: '#D9A35B', a: '#C8352E', ink: '#24170F', paper: '#EFE3CC', h: 'o marrom de papel pardo e barbante, com o vermelho de etiqueta de preço' },
        { n: 'Anil de Feira', p: '#24427A', s: '#E7C47A', a: '#C8352E', ink: '#1A1F2E', paper: '#F5EEDD', h: 'o anil de toalha de feira, com palha e um vermelho de fita' }],
      aplic: ['embalagem', 'carimbo', 'sacola', 'copo', 'instagram', 'avental'],
      ideia: 'A marca como selo de origem: o nome em volta, o desenho no meio e a promessa embaixo. É o formato mais antigo da confiança, o de quem assina embaixo do que faz.',
      vive: 'Vive no produto: embalagem, carimbo, etiqueta, sacola de papel, copo e avental. Sai bonita em papel pardo, numa cor só, até carimbada à mão.',
      elem: 'Os elementos de apoio vêm do armazém: tinta de carimbo falhando nas bordas, estrelas de rótulo, a fita do selo e o ano de fundação como assinatura.',
      porque: { letra: 'Serifa gorda e simpática, de rótulo antigo e de placa de armazém: dá confiança antes de dar o preço.', cor: 'Cores de terra e de forno: {p} com {s} e um toque de {a}. Ficam bonitas até impressas em papel pardo.' } },
    manuscrito: { n: 'Manuscrito', frase: 'Escrita à mão, de perto.', v: [.14, .5, .3, .24, 0], ni: ['doces', 'beleza', 'cafe', 'saude', 'eventos'],
      fontes: ['chorus'], caixa: 'titulo', track: 0, efeitos: [''], arranjos: ['vertical', 'horizontal'],
      gestos: [['sublinha'], ['sublinha'], ['']],
      simbs: [{ tipo: 'nenhum' }], pal: { esquema: 'analoga', suave: true }, textura: 'papel', fundo: 'paper',
      receitas: [{ n: 'Pétala', p: '#C9566C', s: '#F3D5D0', a: '#B98A3E', ink: '#3A2328', paper: '#FBF5F1', h: 'o rosa de pétala seca com um fio de ouro de papelaria fina' },
        { n: 'Lavanda', p: '#7D5CC0', s: '#E6DDF5', a: '#E0A458', ink: '#2A2238', paper: '#FAF7FC', h: 'o lilás de lavanda com o mel da luz de fim de tarde' },
        { n: 'Pêssego', p: '#D9744A', s: '#F8DCCB', a: '#7A4E9C', ink: '#3A241B', paper: '#FCF6F0', h: 'pêssego maduro com um roxo de tinta de caneta' }],
      aplic: ['cartao', 'sacola', 'embalagem', 'instagram', 'copo', 'avental'],
      ideia: 'A marca como bilhete escrito à mão: cada letra tem mão, tem pressa boa e tem carinho. O sublinhado é a assinatura de quem confirma o que escreveu.',
      vive: 'Vive de perto: cartão escrito à mão, sacola, embalagem de presente, copo, etiqueta e avental. Pede papel bom e espaço pra respirar.',
      elem: 'Os elementos de apoio vêm da papelaria: o traço de assinatura, fitas e laços, papel com fibra e pequenas anotações à mão.',
      porque: { letra: 'Caligrafia de quem escreve o nome do cliente no bilhete: cada letra tem mão, tem pressa boa e tem carinho.', cor: '{p} suave com {s}: tons que parecem papel bom, laço e luz de tarde.' } },
    bauhaus: { n: 'Bauhaus de Bairro', frase: 'Forma, cor e função, do jeito do bairro.', v: [.72, .62, .55, .56, .62], ni: ['casa', 'criativo', 'educacao', 'tech', 'varejo', 'arte'],
      fontes: ['adventor-bold', 'poppins-bold'], caixa: 'baixa', track: -0.02, efeitos: [''], arranjos: ['horizontal', 'vertical'],
      gestos: [['pesos'], ['empilha'], ['encosta'], ['']],
      simbs: [{ tipo: 'ideia', letra: true }, { tipo: 'ideia' }, { tipo: 'nenhum' }], pal: { esquema: 'triade', mais: 0.04 }, textura: 'grade', fundo: 'paper',
      receitas: [{ n: 'Primárias', p: '#E63025', s: '#1F4FD8', a: '#F5C21B', ink: '#141414', paper: '#F3EFE6', h: 'as três primárias de cartaz de escola de arte, sem meio-termo' },
        { n: 'Laranja e Anil', p: '#F0642A', s: '#233C8E', a: '#F2C14E', ink: '#17171A', paper: '#F4F0E8', h: 'o laranja de tijolo com o anil de azulejo e um ouro de sol' },
        { n: 'Rosa e Cobalto', p: '#E94E8B', s: '#2348C9', a: '#F5B92E', ink: '#151418', paper: '#F5F1EA', h: 'o rosa de neon com azul cobalto e o amarelo do giz' }],
      aplic: ['cartaz', 'fachada', 'sacola', 'instagram', 'camiseta', 'cartao'],
      ideia: 'A marca como peça de montar: círculo, quadrado e triângulo, cada um com sua cor e sua função. Forma segue função, do jeito do bairro: moderna, mas sem frieza.',
      vive: 'Vive em cartaz e fachada: cada aplicação é uma composição nova com as mesmas peças. Sacola, camiseta, cartão e post viram variações do mesmo jogo.',
      elem: 'Os elementos de apoio são peças de geometria pura em volta da marca (quartos de círculo, meias-luas e quadrados numa grade), que viram padrão, borda e animação. O símbolo é a ideia; as peças são o jogo.',
      porque: { letra: 'Geométrica, de círculo e régua, em caixa baixa: moderna sem ser fria, como cartaz de escola de arte colado na padaria.', cor: 'Três cores puras ({p}, {s}, {a}) que se revezam nas peças do símbolo: a marca vira um jogo de montar.' } },
    sinal: { n: 'Sinal', frase: 'Menos ruído, mais sinal.', v: [.9, .2, .2, .3, .86], ni: ['tech', 'saude', 'servicos', 'casa', 'educacao'],
      fontes: ['inter-light', 'poppins-light'], caixa: 'alta', track: 0.2, efeitos: [''], arranjos: ['horizontal', 'vertical'],
      gestos: [['separador', { sep: '·' }], ['pesos'], ['fiolado'], ['pendente'], ['']],
      simbs: [{ tipo: 'ideia', estilo: 'linha' }, { tipo: 'orbita' }], pal: { esquema: 'mono', frio: true }, textura: 'limpo', fundo: 'paper',
      receitas: [{ n: 'Cobalto', p: '#2F5BFF', s: '#DCE4FF', a: '#FF6B4A', ink: '#10131A', paper: '#F7F8FB', h: 'o azul de interface em que todo mundo confia, com um coral pra chamar atenção' },
        { n: 'Grafite', p: '#22252B', s: '#E3E6EA', a: '#3D7BFF', ink: '#111317', paper: '#F6F7F8', h: 'o grafite de aparelho bem feito, com um azul só onde precisa' },
        { n: 'Coral', p: '#F2493F', s: '#FFE1DC', a: '#2F5BFF', ink: '#15161A', paper: '#FAF9F7', h: 'o coral de botão de ação, com o azul de link' }],
      aplic: ['app', 'cartao', 'instagram', 'fachada', 'sacola', 'camiseta'],
      ideia: 'A marca como sinal: menos ruído, mais clareza. Letra fina, espaço aberto e um ponto que diz "é aqui". Funciona igual num ícone de 16 pixels e numa placa de vidro.',
      vive: 'Vive na tela e na recepção: ícone de app, cartão, post, fachada de vidro, sacola e crachá. Pede muito branco em volta e cor só onde importa.',
      elem: 'Os elementos de apoio vêm da interface: pontos de status, linhas finas de grade e ícones de traço único, do mesmo peso da letra.',
      porque: { letra: 'Fina, aberta e espaçada: a marca não precisa gritar pra ser lembrada. Funciona igual num ícone de app e numa placa de vidro.', cor: '{p} com muito branco em volta e {a} só onde precisa de atenção.' } },
    classico: { n: 'Clássico de Bairro', frase: 'O bairro inteiro conhece.', v: [.1, .26, .56, .36, .14], ni: ['servicos', 'casa', 'saude', 'educacao', 'auto', 'varejo', 'pet'],
      fontes: ['schola-bold', 'pagella-bold'], caixa: 'titulo', track: 0.01, efeitos: [''], arranjos: ['vertical', 'horizontal'],
      gestos: [['fios', { fiosTexto: true }], ['hierarquia'], ['fiolado'], ['versalete'], ['pendente']],
      simbs: [{ tipo: 'ideia', letra: true }, { tipo: 'ideia' }, { tipo: 'monograma', estilo: 'liga' }, { tipo: 'emblema', formas: ['escudo', 'circulo'] }], pal: { esquema: 'mono', profundo: true }, textura: 'papel', fundo: 'paper',
      receitas: [{ n: 'Marinho e Ouro', p: '#1C2E5A', s: '#D8DDE8', a: '#C59B3E', ink: '#141824', paper: '#F7F4EC', h: 'o marinho de uniforme e o ouro de placa de bronze na porta' },
        { n: 'Vinho de Família', p: '#6E1E2A', s: '#EAD9D3', a: '#C59B3E', ink: '#1E1416', paper: '#F8F3EA', h: 'o vinho de cortina de cartório antigo, com o dourado da moldura' },
        { n: 'Petróleo', p: '#1D4E63', s: '#D5E3EA', a: '#D9A441', ink: '#12202A', paper: '#F6F4EE', h: 'o azul petróleo de tinta de fachada antiga, com a mostarda do letreiro' }],
      aplic: ['fachada', 'avental', 'cartao', 'instagram', 'sacola', 'copo'],
      ideia: 'A marca como placa de bronze na porta: serifa firme, emblema e ano de fundação. Ela diz que tá ali há anos e que vai continuar, e é exatamente isso que o cliente quer ouvir.',
      vive: 'Vive no dia a dia do bairro: fachada, avental, cartão, sacola, copo e post. A regra é a constância: sempre igual, sempre no lugar.',
      elem: 'Os elementos de apoio vêm da tradição: o emblema com o ano, fios duplos de moldura, estrelas de rótulo e papel com textura.',
      porque: { letra: 'Serifa de livro escolar e de placa de consultório: séria sem ser fria, a letra de quem tá ali há anos.', cor: '{p} profundo com {a} de detalhe: as cores da confiança, que não saem de moda.' } },
    chiclete: { n: 'Chiclete', frase: 'Dá vontade de morder.', v: [.7, .96, .86, .76, .4], ni: ['doces', 'comida', 'pet', 'varejo', 'eventos', 'bebidas'],
      fontes: ['poppins-bold', 'bonum-bold'], caixa: 'baixa', track: -0.03, efeitos: [''], arranjos: ['horizontal', 'vertical'],
      gestos: [['pesos'], ['empilha'], ['encosta'], ['pendente'], ['pulo'], ['']],
      simbs: [{ tipo: 'ideia' }, { tipo: 'ideia', letra: true }, { tipo: 'nenhum' }], pal: { esquema: 'complementar', claro: true }, textura: 'reticula', fundo: 'paper',
      receitas: [{ n: 'Tutti-frutti', p: '#FF4F9A', s: '#FFD84D', a: '#4D6BFF', ink: '#2A1630', paper: '#FFF6F9', h: 'o rosa de chiclete, o amarelo de bala e o azul de pirulito' },
        { n: 'Algodão-doce', p: '#8E7CFF', s: '#FFC4E1', a: '#FF7A3D', ink: '#24183A', paper: '#FBF7FF', h: 'o lilás e o rosa de algodão-doce de parque, com laranja de picolé' },
        { n: 'Picolé', p: '#FF6B3D', s: '#FFE08A', a: '#2E8CFF', ink: '#2B1A14', paper: '#FFF8F0', h: 'o laranja de picolé, o creme de baunilha e o azul da embalagem' }],
      aplic: ['copo', 'adesivo', 'embalagem', 'instagram', 'sacola', 'camiseta'],
      ideia: 'A marca como bala de goma: redonda, gorda, em caixa baixa, com uma bolha de cor estourando no fim do nome. É doce sem enfeite: a graça tá numa ideia só.',
      vive: 'Vive na mão: copo, adesivo, embalagem, sacola, camiseta e post. Quanto mais colorido o mundo em volta, mais ela aparece.',
      elem: 'Os elementos de apoio vêm da doceria: a bolha do logo virando confete e padrão, retícula de embalagem antiga e formas redondas como bala.',
      porque: { letra: 'Redonda, gorda e em caixa baixa: parece bala, parece brinquedo, dá vontade de pegar.', cor: '{p} e {a} brigando de propósito, com {ink} de contorno: é a paleta mais feliz do Studio Houzi.' } }
  };
  /* o artigo certo de cada desenho e de cada forma (o hambúrguer, a xícara, os talheres; o círculo, a gota) */
  const FEM_IC = new Set(['pizza', 'chama', 'xicara', 'estrela', 'tesoura', 'coroa', 'camiseta', 'folha', 'pata', 'casa', 'chave', 'engrenagem', 'camera', 'lampada', 'onda', 'montanha', 'sacola']);
  const FEM_FORMA = new Set(['explosao', 'gota']);
  const artIc = k => k === 'garfo' ? 'os' : FEM_IC.has(k) ? 'a' : 'o', fimDe = a => a === 'os' ? 'os' : a;
  const ic = k => { const a = artIc(k); return { a, A: a[0].toUpperCase() + a.slice(1), n: M.ICONES[k] ? M.ICONES[k].n.toLowerCase() : 'desenho', fim: fimDe(a), pl: a === 'os' }; };
  const fo = k => ({ n: M.FORMAS[k] ? M.FORMAS[k].n.toLowerCase() : 'círculo', de: FEM_FORMA.has(k) ? 'da' : 'do', a: FEM_FORMA.has(k) ? 'a' : 'o', fim: FEM_FORMA.has(k) ? 'a' : 'o' });
  const SIMB_TXT = {
    icone: s => { const i = ic(s.icone); if(s.forma && s.forma !== 'nenhuma'){ const f = fo(s.forma); return `${i.A} ${i.n} vazad${i.fim} dentro ${f.de} ${f.n} ${i.pl ? 'viram' : 'vira'} um adesivo que se segura sozinho: do avatar do Instagram à tampa do copo.`; } return `${i.A} ${i.n} em traço único, sem moldura, ${i.pl ? 'contam' : 'conta'} o que a marca faz antes de qualquer palavra.`; },
    geo: () => 'Peças de geometria pura (quarto de círculo, meia-lua, triângulo, quadrado) montadas numa grade 2x2: dá pra animar, recortar, virar padrão e trocar a cor de cada peça.',
    monograma: (s, sp) => { if(s.estilo === 'liga') return `As iniciais ${[...M.iniciais(sp.nome)].filter(c => c !== '&').join(' e ')} entram uma na outra, com um vão em volta da segunda: monograma de alfaiate e de escritório antigo, sem moldura. A ligação das duas letras é o desenho.`; const f = fo(s.forma); return `As iniciais ${M.iniciais(sp.nome)} viram carimbo dentro ${f.de} ${f.n}: assinam embalagem, avatar, bordado e etiqueta.`; },
    letra: (s, sp) => { const L0 = [...(s.letras || M.iniciais(sp.nome))][0]; s = Object.assign({}, s, { detalhe: M.detalheLetra(s.detalhe, L0) }); return s.detalhe === 'fatia' ? `A inicial ${L0} cortada em três faixas, nas linhas onde ela é mais fina, com a do meio deslizando: uma letra que parece estar em movimento, como cartaz moderno.` : `A inicial ${L0} sozinha segura a marca, com um detalhe ${s.detalhe === 'barra' ? 'de faixa embaixo, como risco de pista' : s.detalhe === 'corte' ? 'de corte na diagonal, como estêncil' : s.detalhe === 'sombra' ? 'de sombra deslocada' : 'de ponto, como assinatura'}.`; },
    pixel: s => { const i = ic(s.icone); return `${i.A} ${i.n} redesenhad${i.fim} em pixel, casa por casa, como personagem de jogo antigo${s.forma === 'moldura' ? ', dentro de uma moldura de pixels' : ''}: lê em 16 pixels e fica enorme numa parede.`; },
    emblema: (s, sp) => { const f = fo(s.forma || 'escudo'), ano = String(sp.desde || '').replace(/\D/g, '').length === 4, id = s.ideia && M.IDEIAS[s.ideia];
      /* v3.73: o emblema com o conceito gravado no meio */
      if(id) return `Um emblema: ${f.a} ${f.n} chei${f.fim}, um fio fino por dentro e, gravad${id.n.endsWith('a') ? 'a' : 'o'} no meio, ${id.t}${ano ? '; o ano de fundação vai embaixo' : ''}. A tradição do emblema, com o desenho que só essa marca tem.`;
      return `Um emblema: ${f.a} ${f.n} chei${f.fim}, um fio fino por dentro, as iniciais ${M.iniciais(sp.nome)} vazadas${ano ? ' e o ano de fundação embaixo' : ''}. É o desenho de quem tem tradição pra mostrar.`; },
    ideia: (s, sp) => { const id = M.IDEIAS[s.ideia] || M.IDEIAS.estrela4, ini = [...(s.letras || M.iniciais((sp && sp.nome) || ''))].join('');
      const base = `${s.de === 'nome' ? 'Sai do próprio nome: ' + id.t : id.t[0].toUpperCase() + id.t.slice(1)}.`;
      if(s.letra && M.cabeLetra(s.ideia)) return s.ideia === 'base' ? `${base} A inicial ${ini} fica em pé sobre as fiadas, como prédio no alicerce: a letra é a casa, o tijolo é a promessa.` : `${base} A inicial ${ini} entra vazada dentro do desenho: é monograma de quem tem história, mas o escudo aqui é a própria ideia da marca.`;
      return `${base}${s.estilo === 'linha' ? ' Em traço fino, do mesmo peso da letra: o desenho fala baixo, como o resto da marca.' : ' Uma forma cheia, sem enfeite: funciona do tamanho de um botão até o tamanho de uma fachada.'}`; },
    orbita: (s, sp) => `Um anel aberto, com um ponto pousado nele e a inicial ${[...(s.letras || M.iniciais(sp.nome))][0]} no centro: é sinal, é radar, é rota. Mostra movimento sem precisar de seta.`,
    nenhum: () => 'Sem símbolo: o nome é a marca. A força tá inteira na letra, no espaço e na cor.',
    selo: () => 'Selo de origem: o nome em volta, a promessa embaixo e o desenho no meio. É o formato que sai bonito em carimbo, adesivo, etiqueta e embalagem.'
  };
  M.simboloTxt = sp => { const s = sp.simbolo || {}, arr = sp.logo && sp.logo.arranjo; return arr === 'selo' ? SIMB_TXT.selo() : (SIMB_TXT[s.tipo] || SIMB_TXT.nenhum)(s, sp); };
  /* ---------- COERÊNCIA: o território tem que fazer sentido pro negócio (brasa não combina com neon) ----------
     Duas fontes: o nicho (no quadro: 2 combina muito, 1 combina, 0 neutro, -1 estranho, -9 nunca) e o sentido das
     palavras do nome, da frase e das palavras que a pessoa deu (fogo, doce, café, mar, noite...). A personalidade só
     desempata entre os que fazem sentido. */
  const ORDEM = ['rua', 'zine', 'arcade', 'gp', 'editorial', 'noir', 'selo', 'manuscrito', 'bauhaus', 'sinal', 'classico', 'chiclete'];
  const COER = {
    comida: [2, 0, -9, 2, 1, 0, 1, -1, 1, -9, 1, 1], cafe: [0, 0, -9, -9, 2, 1, 1, 1, 1, 1, 1, -1], doces: [0, 0, -1, -9, 1, -1, 1, 1, 1, -9, 0, 2],
    bebidas: [2, 1, 0, 0, 1, 2, 0, -1, 0, -9, 0, 0], beleza: [0, 0, -9, -9, 2, 2, -1, 2, 0, 1, 0, 1], moda: [2, 2, 0, 1, 2, 2, -1, 0, 1, 1, -1, 0],
    fitness: [2, 0, 0, 2, -1, 0, -9, -9, 1, 1, 0, 0], saude: [-9, -9, -9, -9, 1, -1, -1, 1, 0, 2, 2, -1], pet: [0, 0, -1, -1, 0, -9, 1, 0, 2, 1, 1, 2],
    casa: [0, -1, -9, -1, 1, 0, 0, -9, 2, 2, 2, -9], tech: [0, 0, 1, 1, 1, 1, -9, -9, 2, 2, -1, -1], criativo: [1, 1, 0, 0, 2, 2, -1, 0, 2, 1, -1, 0],
    musica: [2, 1, 1, 0, 1, 2, 0, -1, 1, 0, -1, 0], educacao: [-1, 1, 0, -1, 1, -9, -1, 0, 2, 2, 2, 1], agro: [0, -1, -9, -1, 1, -9, 2, -1, 0, 0, 2, -9],
    auto: [2, -1, -1, 2, -1, 0, -1, -9, 0, 1, 1, -9], servicos: [0, -1, -1, 0, 1, 0, -1, -1, 1, 2, 2, -1], varejo: [1, 0, 0, 0, 1, 0, 0, 0, 2, 1, 1, 1],
    eventos: [1, 1, 1, 0, 1, 2, -1, 1, 1, -1, -1, 2], arte: [2, 2, 0, -1, 1, 2, 0, 1, 2, 0, -1, 0], outro: [1, 1, 0, 0, 2, 1, 1, 1, 2, 2, 1, 1]
  };
  /* campos de sentido: o que a palavra puxa (território, faixa de cor no círculo do OKLCH e as ideias de símbolo) */
  const CAMPOS = [
    { k: 'fogo', n: 'fogo e brasa', re: /(brasa|braseir|brasinh|chama|fogo|fogu|grelh|grill|churras|carv[aã]o|fuma[cç]|lenha|forno|pimenta|smoke|burn|flame|fire|parrill|assad|espeto|chapa|smash|\bhot\b)/, t: { rua: 2, selo: 1, classico: 1, gp: 1, noir: 1, bauhaus: -1, arcade: -9, chiclete: -9, sinal: -9, manuscrito: -9 }, h: [[12, 62]], id: ['grelha', 'chama'] },
    { k: 'doce', n: 'doce', re: /(doce|a[cç][uú]car|\bbalas?\b|\bmel\b|choco|brigad|\bbolo|cupcake|confeit|cereja|morang|sorvet|gelat|cacau|caramel|candy|sugar|sweet|docinh|\btorta|pudim|beijinho|trufa)/, t: { chiclete: 2, manuscrito: 2, selo: 1, editorial: 1, noir: -9, gp: -9, sinal: -9, arcade: -1, rua: -1 }, h: [[330, 360], [0, 32], [285, 330]], id: ['bala', 'coracao'] },
    { k: 'cafe', n: 'café', re: /(caf[eé]|gr[aã]o|torra|coado|x[ií]car|expres|barist|coffee|\bbean|moka|cappucc)/, t: { editorial: 2, selo: 1, manuscrito: 1, classico: 1, noir: 1, zine: 0, arcade: -9, gp: -9, chiclete: -1 }, h: [[28, 75]], id: ['grao', 'xicara'] },
    { k: 'mar', n: 'mar', re: /(\bmar\b|praia|\bonda|oceano|peixe|\bsurf|\bilha|\bporto|barco|[aá]gua|maresia|litoral|baleia|[aâ]ncora)/, t: { sinal: 1, editorial: 1, rua: 1, zine: 1, bauhaus: 1, gp: -1 }, h: [[195, 258]], id: ['onda', 'sol'] },
    { k: 'noite', n: 'noite', re: /(noite|\blua\b|neon|\bclube?\b|night|\bdose|\bgin\b|drink|\bbar\b|boate|\bdark|\bblack\b|preto|sombra|madrug)/, t: { noir: 2, arcade: 1, rua: 1, manuscrito: -1, selo: -1, classico: -1, chiclete: -1 }, h: [[270, 360], [200, 265]], id: ['lua', 'taca'] },
    { k: 'tech', n: 'tecnologia', re: /(\bdados?\b|c[oó]dig|\bbits?\b|pixel|nuvem|\brede\b|\bapps?\b|tech|digit|sistem|\blabs?\b|\bdata\b|cloud|\bnet\b|smart|\bia\b|rob[oô]|byte|\bcode|soft|\bnexo|vetor|algoritm)/, t: { sinal: 2, arcade: 1, bauhaus: 1, noir: 1, editorial: -1, selo: -9, manuscrito: -9, classico: -1, chiclete: -1 }, h: [[215, 300]], id: ['cursor', 'grade'] },
    { k: 'veloz', n: 'velocidade', re: /(turbo|r[aá]pid|express|flash|\bmotos?\b|frete|pista|corrid|\bgp\b|motor|speed|\bfast|veloz|\bjato|foguet|\braio|\brun\b|largada|\bpole\b)/, t: { gp: 2, rua: 1, sinal: 1, manuscrito: -9, selo: -1, editorial: -1 }, h: [[0, 45]], id: ['avanco', 'faixas'] },
    { k: 'luxo', n: 'luxo', re: /(\bouro|gold|diamant|nobre|premium|royal|\brei\b|rainha|coroa|luxo|\blux|prime|elite|\bvip\b|crown|king|queen|majest|imperial|grife)/, t: { noir: 2, editorial: 2, classico: 1, chiclete: -1, zine: -1, arcade: -1, rua: -1 }, h: [[70, 95], [290, 360], [0, 20]], id: ['diamante', 'coroa'] },
    { k: 'rua', n: 'rua', re: /(\brua\b|quebrad|\bmuro|esquina|skate|spray|grafit|graffit|street|favela|\bbeco|\bbonde|underground|periferi)/, t: { rua: 2, zine: 2, classico: -1, editorial: -1, manuscrito: -1 }, h: [], id: ['cone', 'seta'] },
    { k: 'som', n: 'som', re: /(\bsom\b|\bbeats?\b|vinil|\bdisco|m[uú]sic|records|\brec\b|faixa|\bgrave\b|batida|r[aá]dio|sound|[aá]udio|\bdj\b|groove|hip.?hop|\brap\b|samba|\bfunk)/, t: { zine: 2, rua: 1, noir: 1, arcade: 1, classico: -1, selo: -1 }, h: [], id: ['vinil', 'ondas'] },
    { k: 'cuidado', n: 'cuidado', re: /(cuid|sa[uú]de|\bvida|cl[ií]nic|\bbem\b|vital|\bcare\b|health|odont|dentist|dental|\bdentes?\b|fisio|terap|psic|nutri|sorriso|derma)/, t: { sinal: 2, classico: 1, manuscrito: 1, editorial: 1, rua: -9, zine: -9, arcade: -9, gp: -9, noir: -1 }, h: [[180, 265], [330, 360]], id: ['cruz', 'coracao'] },
    { k: 'natureza', n: 'natureza', re: /(folha|\bflor|jardim|\bra[ií]z|\bterra\b|\bmata\b|verde|semente|org[aâ]nic|natur|\beco\b|planta|\bcampo|\bro[cç]a\b|horta|colheit|safra|bosque|\bserra\b)/, t: { selo: 2, editorial: 1, manuscrito: 1, classico: 1, arcade: -9, gp: -1, noir: -1, chiclete: -1 }, h: [[25, 90]], id: ['folha', 'sol'] },
    { k: 'infantil', n: 'infância', re: /(kids?\b|crian[cç]|\bbaby|beb[eê]|brinqu|\btoys?\b|pequenin|infantil|mirim|turminha)/, t: { chiclete: 2, bauhaus: 2, noir: -9, classico: -1, editorial: -1 }, h: [], id: ['estrela', 'coracao'] },
    { k: 'jogo', n: 'jogo', re: /(\bgames?\b|\bjogos?\b|\bplay|arcade|fliper|gamer|console|\bnerd|\bgeek|8.?bits?)/, t: { arcade: 3, chiclete: 1, sinal: 1 }, h: [[280, 340], [180, 230]], id: ['grade', 'estrela'] },
    { k: 'pet', n: 'bicho', re: /(\bpets?\b|\bpata|\bc[aã]o\b|cachorr|\bgatos?\b|latid|\bdogs?\b|\bcats?\b|focinh|bicho|\bvet\b)/, t: { chiclete: 1, bauhaus: 1, classico: 1, noir: -9 }, h: [], id: ['pata'] }
  ];
  M.CAMPOS = CAMPOS;
  /* v3.43: sem os clichês (o "feito" de serviço, o brilho de beleza): nicho sem ideia boa fica vazio, e aí o símbolo
     sai do nome, do ofício ou de outro molde do território */
  const IDEIA_NICHO = { comida: ['grelha', 'chama'], cafe: ['grao', 'xicara'], doces: ['bala', 'coracao'], bebidas: ['taca', 'lua'], beleza: [], moda: ['cabide'],
    fitness: [], saude: ['cruz', 'coracao'], pet: ['pata', 'coracao'], casa: ['base', 'casa'], tech: ['cursor', 'grade'], criativo: ['quadro'], musica: ['vinil', 'ondas'],
    educacao: ['livro', 'estrela'], agro: ['sol', 'folha'], auto: ['avanco', 'seta'], servicos: [], varejo: ['sacola', 'estrela'], eventos: ['taca'], arte: [], outro: [] };
  /* v3.43 · o símbolo sai primeiro do NOME: a palavra inteira do próprio, sem acento (Prumo, Lumi, Laje, Focinho, Coado...).
     Nunca prefixo solto: Clara não acende luz, Soldado não acende sol, Barbara não acende barba */
  const NOME_IDEIA = [[/^prumo$/, 'prumo'], [/^(alicerce|base|pilar|esteio)$/, 'base'], [/^(lumi|lume|luz|brilho|farol)$/, 'fresta'], [/^(sol|solar|aurora)$/, 'sol'], [/^(lua|luar)$/, 'lua'],
    [/^(morro|serra|monte|colina|ladeira)$/, 'morro'], [/^laje$/, 'laje'], [/^agulha$/, 'agulha'], [/^(tatame|dojo)$/, 'tatame'], [/^focinho$/, 'focinho'], [/^(pata|patinha)$/, 'pata'],
    [/^(prosa|papo|resenha|conversa)$/, 'balao'], [/^(coado|coador|filtro)$/, 'coador'], [/^(navalha|barba)$/, 'navalha'], [/^(dente|sorriso)$/, 'dente'], [/^coluna$/, 'coluna'], [/^tesoura$/, 'tesoura'],
    [/^(brasa|chapa|grelha)$/, 'grelha'], [/^(chama|fogo)$/, 'chama'], [/^(onda|mar|mare)$/, 'onda'], [/^grao$/, 'grao'], [/^(coroa|rei|rainha)$/, 'coroa'], [/^(folha|flor|raiz|semente)$/, 'folha'],
    [/^(disco|vinil)$/, 'vinil'], [/^livro$/, 'livro'], [/^bala$/, 'bala'], [/^(casa|lar)$/, 'casa']];
  /* depois, do OFÍCIO (o descritor e a descrição): só palavra de ofício, nunca de clima */
  /* v3.73: o salão ganha o secador e o pente (a tesoura segue de reserva) e a barbearia ganha o poste listrado: com um desenho
     só, as seis alternativas saíam quase todas só com o nome */
  const OFICIO = [[/\b(barbearia|barbeiro|navalha)/, 'navalha'], [/\b(barbearia|barbeiro|barber)/, 'poste'], [/\b(odonto|dentista|dental|implante)/, 'dente'], [/\b(advogad|advocacia|juridic)/, 'coluna'], [/\b(tatuage|tattoo)/, 'agulha'],
    [/\b(jiu|judo|karate|muay|boxe|luta)/, 'faixa'], [/\b(boxe|muay|kickbox|luta|lutas)/, 'luva'], [/\b(salao|cabeleireir|cabelo|escova|penteado)/, 'secador'], [/\b(salao|cabeleireir|cabelo|escova|penteado)/, 'pente'], [/\b(salao|cabeleireir|cabelo)/, 'tesoura'], [/\bacai/, 'tigela'], [/\b(alvenaria|construtora|obras?|pedreiro)\b/, 'base']];
  /* v3.43 · AS FUSÕES: quando a ideia do nome encontra o ofício, as duas viram um desenho só, que vem antes de cada uma
     sozinha (o sol do nome com a pauta da escola de música; o balão da prosa com o pão da padaria; a luz do Lumi com o dente
     da clínica; o morro com a tigela do açaí) */
  const FUSOES = [['sol', /\b(music|musica|canto|piano|violao|bateria|coral|orquestra|banda)/, 'solpauta'], ['balao', /\b(pao|paes|padaria|panific|fornada|forno)/, 'paoprosa'],
    ['fresta', /\b(odonto|dentist|dental|implante|sorriso)/, 'dentluz'], ['morro', /\bacai/, 'tigela'], ['grelha', /\b(quente|brasa|fogo|smash|burger|hamburg)/, 'chapaquente']];
  /* v3.43 · o pictograma óbvio do nicho (a coluna do advogado, a tesoura do salão, o dente, a xícara, a pata, a chama) é a
     primeira solução que qualquer um teria: fica de RESERVA. Só entra quando não há ideia do nome, do ofício ou de fusão, e
     nunca nas primeiras versões. Vindo do próprio nome (uma doceria chamada Coração), ele vale */
  const CLICHE = new Set(['coluna', 'tesoura', 'dente', 'cruz', 'coracao', 'pata', 'xicara', 'grao', 'chama', 'cabide', 'livro', 'casa', 'gota', 'bala', 'quadro', 'estrela', 'estrela4', 'check', 'sacola', 'taca', 'avanco', 'faixas', 'seta', 'cone', 'ondas', 'grade', 'cursor', 'vinil', 'diamante', 'coroa']);
  M.CLICHE = CLICHE;
  const semAcI = w => String(w || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  /* os campos de sentido de um texto (nome, frase, palavras) */
  M.sentido = (...txt) => { const s = txt.filter(Boolean).join(' ').toLocaleLowerCase('pt-BR'); return CAMPOS.filter(c => c.re.test(s)); };
  const dist = (a, b) => a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0);
  /* o gosto do Studio: entre os que fazem sentido, primeiro os mais refinados (letra boa, espaço, uma ideia só) */
  const REFINO = { sinal: 1.2, editorial: 1.2, noir: 1, rua: 0.8, gp: 0.6, bauhaus: 0.4, classico: 0, chiclete: 0, zine: -0.3, manuscrito: -0.7, selo: -0.7, arcade: -0.7 };
  /* v3.73 · a letra elegante (serifa de cinema e de revista, caligrafia, a grotesca fina espaçada) e a marca "bruta": popular e
     de energia ao mesmo tempo (selo de rap, academia de luta, hamburgueria). Juntas, a letra briga com a personalidade */
  const ELEGANTE = new Set(['pagella-bold', 'lora-bold', 'lora-bolditalic', 'chorus', 'inter-light', 'poppins-light']);
  const bruta = pers => (pers[2] || 0) >= 0.7 && (pers[3] || 0) >= 0.7;
  M.ELEGANTE = ELEGANTE;
  /* v3.43: a personalidade pesa mais (2,4 no lugar de 1,4) e o gosto do Studio vira só desempate (x0,25). E ganha o "longe":
     o território que briga com a personalidade em sério x divertido ou em calma x energia (escritório sério não vira
     Chiclete, pet shop alegre não vira Sinal). Não é veto: a bancada e o naming seguem vendo; só as amostras cortam.
     abre = o quanto o leque já abriu ("Mais alternativas"), que afrouxa o corte aos poucos */
  M.ranking = (pers, nicho, campos, refT, abre) => {
    const lin = COER[nicho] || COER.outro, rt = refT || {}, ab = abre || 0;
    return Object.entries(T).map(([k, t]) => {
      const cn = lin[ORDEM.indexOf(k)] ?? 0;
      let sem = 0, veta = cn <= -9;
      (campos || []).forEach(c => { const v = c.t[k]; if(v === undefined) return; if(v <= -9) veta = true; else sem += v; });
      /* v3.40: o que as referências da pessoa puxam (palavras, o que não quer, imagens); -9 ou menos é "não quero isso" */
      const ref = rt[k] || 0; if(ref <= -9) veta = true;
      /* v3.43: e a marca sóbria (séria e sem pressa: escritório, imobiliária, contabilidade) não vira cartaz de escola de arte
         nem lambe; a muito calma (cafeteria de coado) não vira nada de energia alta */
      const sobria = pers[1] <= 0.3 && pers[3] < 0.45, quieta = pers[3] < 0.2;
      /* v3.73: e o eixo sofisticado x popular também separa (o bairro inteiro não lê a marca de cinema), e marca bruta não
         cai em território que só tem letra elegante (Noir, Editorial, Manuscrito, Sinal). Do 3º "Mais 6 caminhos" em diante
         o território volta (senão o leque acaba e repete), mas a letra segue trocada pela popular (no aplicaTerritorio) */
      const longe = Math.abs(pers[1] - t.v[1]) > 0.45 + 0.1 * ab || Math.abs(pers[3] - t.v[3]) > 0.5 + 0.1 * ab || (sobria && t.v[1] > 0.55 + 0.1 * ab) || (quieta && t.v[3] > 0.55 + 0.1 * ab)
        || Math.abs(pers[2] - t.v[2]) > 0.6 + 0.1 * ab || (bruta(pers) && !ab && t.fontes.every(f => ELEGANTE.has(f)));
      return { k, veta, longe, coer: cn, sem, ref, nota: cn + Math.min(4, sem) * 1.1 + Math.max(-4, Math.min(4, ref)) * 0.9 - dist(pers, t.v) * 2.4 + (REFINO[k] || 0) * 0.25 };
    }).sort((a, b) => (a.veta - b.veta) || (b.nota - a.nota));
  };
  /* ---------- v3.40 · REFERÊNCIAS: o clima em palavras, o que não pode parecer, as cores, o peso da letra, onde a marca
     vive e as imagens que a pessoa trouxe. Tudo vira peso de território e faixa de cor (preferida ou evitada) ---------- */
  const ESTILOS = [
    { re: /(minimal|limp[oa]|clean|simples|essencial|respir|neutr|clar[oa]\b)/, t: { editorial: 2, sinal: 2, bauhaus: 1, zine: -1, rua: -1, chiclete: -1 } },
    { re: /(retr[oô]|vintage|antig|nost[aá]lg|cl[aá]ssic|tradi[cç]|vov[oó]|anos ?[5-8]0|de [eé]poca|old ?school|velha guarda)/, t: { classico: 2, selo: 2, manuscrito: 1, sinal: -1, arcade: -1 } },
    { re: /(industrial|bruto|brutal|\bcru\b|\bcrua\b|concreto|metal|oficina|ferro|graxa|pesad[oa]|forte)/, t: { rua: 2, noir: 1, gp: 1, chiclete: -2, manuscrito: -2 } },
    { re: /(divertid|colorid|alegr|brincalh|feliz|vibrante|festa|\bpop\b|leveza|irreverent)/, t: { chiclete: 2, bauhaus: 2, arcade: 1, noir: -2, classico: -1 } },
    { re: /(elegan|sofistic|chique|refinad|discret|s[oó]bri|alto padr|exclusiv|cl[aá]ss[eu])/, t: { editorial: 2, noir: 2, classico: 1, chiclete: -2, zine: -2, arcade: -2, rua: -1 } },
    { re: /(artesanal|feito a m[aã]o|caseir|manual|afetiv|aconcheg|r[uú]stic|fazenda|interior|ro[cç]a)/, t: { manuscrito: 2, selo: 2, classico: 1, sinal: -1, arcade: -2 } },
    { re: /(futur|tecnol[oó]g|digital|inova|ciber|cyber|sci.?fi|espacial|rob[oô])/, t: { sinal: 2, arcade: 1, bauhaus: 1, classico: -2, selo: -2, manuscrito: -2 } },
    { re: /(esport|atl[eé]tic|corrida|velocid|motor|automob|pista|competi|garra)/, t: { gp: 2, rua: 1, manuscrito: -2 } },
    { re: /(punk|underground|independ|\bdiy\b|faz voc[eê]|colagem|xerox|recorte|fanzine|\bzine)/, t: { zine: 3, rua: 1, editorial: -1, classico: -1 } },
    { re: /(geom[eé]tric|formas?\b|bauhaus|construt|modular|\bgrid)/, t: { bauhaus: 3, sinal: 1 } },
    { re: /(noturn|escur|sombri|misteri|\bdark|noir|\bpret[oa])/, t: { noir: 3, chiclete: -2 } },
    { re: /(\bgames?\b|8.?bits?|pixel|arcade|fliper)/, t: { arcade: 3 } },
    { re: /(\bselo|carimbo|emblema|bras[aã]o|de origem|desde \d)/, t: { selo: 2, classico: 1 } },
    /* v3.43: no "não pode parecer", corporativo frio e genérico tira o Sinal (a letra fina de interface) do caminho */
    { re: /(corporativ|\bfri[oa]s?\b|gen[eé]ric|sem alma|engessad)/, t: { sinal: 2, bauhaus: 1 } },
    { re: /(sinaliza|\bplacas?\b|metr[oô]|aeroporto|transporte|sistema|informa)/, t: { sinal: 3 } },
    { re: /(grafit|graffit|pixa[cç]|muro|\bspray|lambe|skate|hip.?hop|\brap\b|quebrada)/, t: { rua: 3, zine: 1, classico: -2, editorial: -1 } }
  ];
  const COR_NOME = [
    [/vermelh|rubro|sangue|\bred\b/, [[15, 40]]], [/laranj|tangerina|c[oô]bre|terracota/, [[40, 62]]], [/amarel|dourad|\bouro|mostarda/, [[70, 108]]],
    [/azul|marinho|anil|celeste|turquesa/, [[200, 265]]], [/roxo|lil[aá]s|violeta|\buva\b|ameixa/, [[285, 322]]], [/\brosa\b|\bpink|magenta|chiclete/, [[330, 360], [0, 12]]],
    [/marrom|\bcaf[eé]\b|chocolate|caramelo|\bterra\b/, [[40, 72]]], [/neon|fl[uú]or/, [[100, 108], [330, 350]]]
  ];
  const ONDE_T = { instagram: { chiclete: 1, zine: 1, arcade: 1, bauhaus: 1 }, fachada: { rua: 1, sinal: 1, gp: 1, classico: 1 }, embalagem: { selo: 1, manuscrito: 1, classico: 1, editorial: 1 }, uniforme: { selo: 1, gp: 1, sinal: 1 }, site: { sinal: 1, editorial: 1, bauhaus: 1 } };
  M.ONDE = [['instagram', 'Instagram'], ['fachada', 'Fachada'], ['embalagem', 'Embalagem'], ['uniforme', 'Uniforme'], ['site', 'Site']];
  M.PESOS = [['', 'Tanto faz'], ['leve', 'Leve, fina'], ['media', 'No meio'], ['pesada', 'Pesada, gorda']];
  const PESO_F = { leve: ['inter-light', 'poppins-light', 'chorus', 'lora-bolditalic'], pesada: ['inter-black', 'heroscn-bold', 'adventor-bold', 'poppins-bold', 'bonum-bold'], media: ['inter-bold', 'lora-bold', 'schola-bold', 'pagella-bold', 'cursor-bold', 'poppins-bold', 'adventor-bold'] };
  M.lerRefs = refs => {
    const out = { t: {}, gosta: [], evita: [], peso: '', campos: [] };
    if(!refs || typeof refs !== 'object') return out;
    const soma = (t, f) => Object.entries(t).forEach(([k, v]) => { out.t[k] = (out.t[k] || 0) + v * f; });
    const pos = [refs.clima, refs.marcas].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR'), neg = String(refs.nao || '').toLocaleLowerCase('pt-BR');
    ESTILOS.forEach(e => {
      if(pos && e.re.test(pos)) soma(e.t, 1);
      if(neg && e.re.test(neg)) Object.entries(e.t).forEach(([k, v]) => { if(v > 0) out.t[k] = (out.t[k] || 0) - (v >= 2 ? 9 : 3); });
    });
    out.campos = pos ? M.sentido(pos) : [];
    if(neg) M.sentido(neg).forEach(c => Object.entries(c.t).forEach(([k, v]) => { if(v > 0) out.t[k] = (out.t[k] || 0) - 2 * v; }));
    COR_NOME.forEach(([re, fx]) => { if(neg && re.test(neg)) out.evita.push(...fx); else if(pos && re.test(pos)) out.gosta.push(...fx); });
    (Array.isArray(refs.cores) ? refs.cores : []).slice(0, 6).forEach(h => { if(!/^#[0-9a-f]{6}$/i.test(h)) return; const l = M.lch(h); if(l.c >= .05) out.gosta.push([l.h - 16, l.h + 16]); });
    (Array.isArray(refs.naoCores) ? refs.naoCores : []).slice(0, 6).forEach(h => { if(!/^#[0-9a-f]{6}$/i.test(h)) return; const l = M.lch(h); if(l.c >= .05) out.evita.push([l.h - 20, l.h + 20]); });
    (Array.isArray(refs.onde) ? refs.onde : []).forEach(o => { if(ONDE_T[o]) soma(ONDE_T[o], 1); });
    /* as imagens: o clima de cada uma vira peso de território; as cores fortes viram faixa preferida (o verde vira outra coisa) */
    const ims = (Array.isArray(refs.imgs) ? refs.imgs : []).slice(0, 6), f = ims.length ? 2.2 / ims.length : 0;
    ims.forEach(im => {
      if(!im || typeof im !== 'object') return;
      (Array.isArray(im.cores) ? im.cores : []).slice(0, 2).forEach(h => { if(!/^#[0-9a-f]{6}$/i.test(h)) return; const l = M.lch(h); if(l.c >= .06){ const hh = M.semVerde(l.h); out.gosta.push([hh - 14, hh + 14]); } });
      const t2 = {}, ad = (k, v) => { t2[k] = (t2[k] || 0) + v; };
      /* (calibrado com foto de verdade: OKLab L abaixo de .42 já lê como escura; ruído acima de .1 é grão, cartaz, muro) */
      if(im.l < .42){ ad('noir', 2); ad('rua', 1); ad('chiclete', -1); }
      if(im.l > .78 && im.c < .06){ ad('editorial', 2); ad('sinal', 1); }
      if(im.contr > .2 && im.c < .06){ ad('noir', 1); ad('editorial', 1); ad('zine', 1); }
      if(im.c > .14){ ad('chiclete', 1); ad('bauhaus', 1); ad('arcade', 1); ad('rua', 1); }
      if(im.c > .2){ ad('arcade', 1); ad('rua', 1); }
      if(im.quente > .62 && im.c < .12 && im.l >= .45 && im.l <= .82){ ad('selo', 2); ad('classico', 1); ad('manuscrito', 1); }
      if(im.ruido > .1){ ad('rua', 1); ad('zine', 2); }
      if(im.ruido < .03){ ad('sinal', 1); ad('bauhaus', 1); ad('editorial', 1); }
      soma(t2, f);
    });
    out.peso = PESO_F[refs.peso] ? refs.peso : '';
    return out;
  };
  /* o que o Studio entendeu das referências (aparece no passo, pra pessoa conferir) */
  M.resumoRefs = refs => {
    const rf = M.lerRefs(refs), ts = Object.entries(rf.t), nomeT = k => (T[k] || {}).n || k;
    const puxa = ts.filter(([, v]) => v >= 1).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => nomeT(k));
    const longe = ts.filter(([, v]) => v <= -3).sort((a, b) => a[1] - b[1]).slice(0, 3).map(([k]) => nomeT(k));
    const meio = f => { const a = ((f[0] % 360) + 360) % 360, b = ((f[1] % 360) + 360) % 360; return a <= b ? (a + b) / 2 : ((a + b + 360) / 2) % 360; };
    const unicas = arr => arr.filter((c, i) => arr.findIndex(d => M.contraste(c, d) < 1.15) === i);
    const cores = unicas(rf.gosta.map(f => M.deLch(0.66, 0.15, meio(f)))).slice(0, 5), semCores = unicas(rf.evita.map(f => M.deLch(0.66, 0.15, meio(f)))).slice(0, 4);
    return { tem: M.temRefs(refs), puxa, longe, cores, semCores, peso: { leve: 'leve e fina', media: 'no meio', pesada: 'pesada e gorda' }[rf.peso] || '' };
  };
  /* o clima de uma imagem de referência, em poucas palavras */
  M.climaImg = im => { if(!im) return ''; const p = [im.l < .42 ? 'escura' : im.l > .78 ? 'clara' : 'meio-tom']; if(im.c > .14) p.push('saturada'); else if(im.c < .05) p.push('quase sem cor'); if(im.contr > .2) p.push('contrastada'); if(im.quente > .62) p.push('quente'); else if(im.quente < .3 && im.c >= .05) p.push('fria'); if(im.ruido > .1) p.push('com textura'); else if(im.ruido < .03) p.push('lisa'); return p.join(', '); };
  /* tem alguma referência de verdade? (pra explicar na amostra) */
  M.temRefs = refs => !!(refs && (String(refs.clima || '').trim() || String(refs.nao || '').trim() || String(refs.marcas || '').trim() || (refs.cores || []).length || (refs.naoCores || []).length || (refs.imgs || []).length || refs.peso || (refs.onde || []).length));
  /* as faixas de cor que fazem sentido: as do sentido do nome; sem isso, as do nicho */
  const faixas = (campos, nicho, rf) => { const hs = []; (rf && rf.gosta || []).forEach(x => hs.push(x)); (campos || []).forEach(c => c.h.forEach(x => hs.push(x))); if(!hs.length) (M.MATIZ[nicho] || []).slice(0, 2).forEach(h => hs.push([h - 18, h + 18])); return hs; };
  const n360 = x => ((x % 360) + 360) % 360;
  const naFaixa = (h, f) => { const H = n360(h), A = n360(f[0]), B = n360(f[1]); return A <= B ? H >= A && H <= B : H >= A || H <= B; };
  const longe = (h, hs) => Math.min(...hs.map(f => { if(naFaixa(h, f)) return 0; const H = n360(h), d = x => { const t = Math.abs(H - n360(x)); return Math.min(t, 360 - t); }; return Math.min(d(f[0]), d(f[1])); }));

  /* paleta de cada território. Sem cor da pessoa: uma das receitas do Studio (escolhidas a dedo, com nome e história),
     a que mais combina com o sentido do nome e com o nicho. Com a cor da pessoa: a paleta sai da cor dela */
  const ESQUEMAS = ['analoga', 'triade', 'complementar', 'dividida', 'mono'];
  /* v3.43 · A COR QUE O NOME JÁ TEM. Agulha Preta é preta, Sol Maior é amarela, Lumi é luz: quando uma palavra do próprio
     diz a cor, ela entra. Preto vira a cor principal; cor de verdade puxa a escolha da paleta e, se nem a principal nem o
     acento são dela, vira o acento (o sol, a luz). Palavra inteira, sem acento, e só no próprio (não no ofício) */
  const NOME_COR = [[/^(preta|preto|negra|negro|black|noir|breu|carvao|nanquim)$/, { escuro: true }], [/^(sol|solar|ouro|dourada|dourado|amarela|amarelo|girassol|aurora|mel|gema)$/, { h: [70, 95] }],
    [/^(lumi|lume|luz|brilho|farol|clarao|candeia|lampiao)$/, { h: [72, 90], luz: true }], [/^(vermelha|vermelho|rubi|rubra|rubro|sangue)$/, { h: [18, 36] }], [/^(brasa|fogo|chama)$/, { h: [28, 48] }],
    [/^(azul|anil|celeste|mar|ceu|oceano|marinho)$/, { h: [228, 262] }], [/^(roxa|roxo|acai|uva|violeta|lilas|ameixa|jabuticaba)$/, { h: [292, 318] }], [/^(rosa|pink|flamingo)$/, { h: [348, 8] }],
    [/^(laranja|tangerina|abobora|cobre|ferrugem)$/, { h: [44, 60] }], [/^(cafe|coado|cacau|chocolate|torra|canela|barro|terra)$/, { h: [48, 66] }]];
  M.corDoNome = nome => { const pt = M.partes(nome); let out = null; pt.palavras.filter(x => x.i0 >= pt.pi0 && x.i1 <= pt.pi1).forEach(x => { const w = semAcI(x.w).replace(/[^a-z]/g, ''); NOME_COR.forEach(([re, v]) => { if(!out && re.test(w)) out = Object.assign({ palavra: x.w }, v); }); }); return out; };
  const meioFx = f => { const a = n360(f[0]), b = n360(f[1]); return a <= b ? (a + b) / 2 : n360((a + b + 360) / 2); };
  const corNome = (c, nc) => {
    if(!nc) return c;
    if(nc.escuro) return Object.assign({}, c, { p: c.ink, fundo: c.fundo === 'p' ? 'paper' : c.fundo });
    const em = cor => { const l = M.lch(cor); return l.c >= 0.06 && naFaixa(l.h, nc.h); };
    if(em(c.p)) return c;
    const la = M.lch(c.a), c2 = em(c.a) ? c : Object.assign({}, c, { a: M.deLch(Math.max(0.74, Math.min(0.84, la.l)), Math.max(0.12, Math.min(0.16, la.c)), meioFx(nc.h)) });
    /* a cor do nome que some no papel (o amarelo do Sol em cima do creme) vai pro fundo escuro, onde ela acende */
    return !nc.luz && c2.fundo === 'paper' && M.contraste(c2.a, c2.paper) < 1.6 ? Object.assign({}, c2, { fundo: 'ink' }) : c2;
  };
  /* v3.43 · O ACENTO FICA NA FAMÍLIA. Na paleta gerada, o ciano que a tríade do roxo e do bordô dava (a matiz caía no verde e a
     regra empurrava pro azul-piscina) e o acento de outro mundo em marca séria ou calma viram o ouro, ou, se a principal já é
     quente e clara, um tom fundo dela. Paleta de receita fica como o Studio escolheu */
  const acentoNaFamilia = (c, r, t) => {
    const lp = M.lch(c.p), la = M.lch(c.a); if(la.c < 0.06) return c;
    const dh = (() => { const x = Math.abs(n360(lp.h) - n360(la.h)); return Math.min(x, 360 - x); })();
    const ciano = la.h >= 192 && la.h <= 240 && la.l > 0.66 && la.c > 0.08 && r.nicho !== 'tech';
    const sobria = (r.pers[1] < 0.4 || r.pers[3] < 0.4) && ![T.bauhaus, T.chiclete, T.zine, T.arcade].includes(t);
    if(!((ciano && (lp.c < 0.06 || dh > 25 && (sobria || dh > 50))) || (sobria && lp.c >= 0.06 && dh > 70))) return c;
    const quente = lp.c >= 0.06 && lp.h > 40 && lp.h < 110;
    /* (o complemento do rosa é o próprio ciano: fora da marca sóbria, o acento vira o vizinho quente da principal) */
    const viz = M.semVerde(lp.h + 48, 0.8), vizCiano = viz >= 192 && viz <= 240;
    return Object.assign({}, c, { a: quente ? M.deLch(0.4, Math.min(0.1, lp.c), lp.h - 25) : sobria || vizCiano ? M.deLch(0.76, 0.12, 80) : M.deLch(0.8, 0.15, viz) });
  };
  function paletaDe(t, r, seed, campos, variante){
    const rf = r.rf || {}, vv = variante || 0, evita = rf.evita || [];
    const evitada = cor => { const l = M.lch(cor); return l.c >= 0.06 && evita.some(f => naFaixa(l.h, f)); };
    const nc = r.cor ? null : M.corDoNome(r.nome);
    const hs = nc && nc.h && !nc.luz ? [nc.h].concat(rf.gosta || []) : faixas(campos, r.nicho, rf);
    let tom = '';
    if(!r.cor && t.receitas && t.receitas.length){
      /* a cor da marca manda; o acento e o apoio também contam (barra azul em marca de brasa não passa) */
      const fora = cor => { const l = M.lch(cor); return l.c >= 0.06 ? longe(l.h, hs) : 0; };
      const nota = rc => { let l = M.lch(rc.p); if(l.c < 0.04) l = M.lch(rc.a); return (hs.length ? longe(l.h, hs) + 0.35 * Math.max(fora(rc.a), fora(rc.s)) : 0) + (evitada(rc.p) ? 90 : 0) + (evitada(rc.a) || evitada(rc.s) ? 25 : 0); };
      const ord = t.receitas.slice().sort((x, y) => nota(x) - nota(y)), melhor = nota(ord[0]);
      const boas = ord.filter(rc => nota(rc) <= melhor + 8), resto = ord.filter(rc => !boas.includes(rc) && nota(rc) < 60), i0 = Math.floor(M.rng(seed + 7)() * boas.length);
      /* v3.40: primeiro as receitas que mais combinam, depois as outras do território; esgotou, o Studio gera paletas novas */
      let rc = null;
      if(vv < boas.length) rc = boas[(i0 + vv) % boas.length];
      else if(vv < boas.length + resto.length) rc = resto[vv - boas.length];
      if(rc) return corNome({ p: rc.p, s: rc.s, a: rc.a, ink: rc.ink, paper: rc.paper, fundo: rc.fundo || t.fundo || 'paper', esquema: 'receita', receita: rc.n }, nc);
    }
    /* paleta gerada: sem cor da pessoa, a matiz sai de uma faixa que faz sentido (as das referências primeiro), nunca verde */
    if(!r.cor && hs.length){ const rr2 = M.rng(seed + 31 + vv * 7), f = hs[(Math.floor(rr2() * hs.length) + vv) % hs.length], a0 = n360(f[0]), a1 = n360(f[1]), larg = a0 <= a1 ? a1 - a0 : a1 + 360 - a0; let h = M.semVerde(a0 + rr2() * larg, 0.62); if(evita.some(x => naFaixa(h, x))) h = M.semVerde(h + 150, 0.62); tom = M.deLch(0.62, 0.15, h); }
    const pm = t.pal || {};
    const persCor = r.pers.map((v, i) => (v + t.v[i]) / 2);
    if(pm.mais) persCor[3] = Math.min(1, persCor[3] + pm.mais);
    let c = M.paleta({ nicho: r.nicho, pers: persCor, cor: r.cor || tom, pessoa: !!r.cor, manter: !!r.cor && r.manterCor, esquema: vv ? ESQUEMAS[(vv + seed % 5) % 5] : pm.esquema, seed });
    const base = M.lch(c.p);
    if(pm.fluor && !r.manterCor){
      const fl = r.cor ? c.p : (base.h > 30 && base.h < 200 ? '#F2EC54' : '#FF2E93');
      c = Object.assign({}, c, { p: '#141414', s: M.deLch(0.86, 0.01, 90), a: fl, ink: '#141414', paper: '#F4F1EA' });
    }
    if(pm.escuro){ c = Object.assign({}, c, { ink: M.deLch(0.16, 0.012, base.h) }); }
    if(pm.quente){ c = Object.assign({}, c, { paper: '#F6EEDF' }); }
    if(pm.frio){ c = Object.assign({}, c, { paper: M.deLch(0.98, 0.006, 250) }); }
    if(pm.profundo && !r.manterCor){ c = Object.assign({}, c, { p: M.deLch(Math.min(base.l, 0.42), Math.max(0.08, base.c * 0.8), base.h) }); }
    if(pm.suave && !r.manterCor){ c = Object.assign({}, c, { p: M.deLch(Math.max(base.l, 0.62), Math.min(base.c, 0.11), base.h) }); }
    if(pm.claro && !r.manterCor){ c = Object.assign({}, c, { p: M.deLch(Math.max(base.l, 0.66), Math.max(base.c, 0.17), base.h) }); }
    c.fundo = t.fundo || 'paper';
    /* v3.40: com a cor da pessoa fixa, as outras versões mudam o fundo (no papel, na cor, no escuro) e o tom do papel */
    if(r.cor && r.manterCor && vv){ c.fundo = ['paper', 'p', 'ink'][vv % 3]; if(vv % 2) c.paper = M.deLch(0.965, 0.018, 85); }
    /* amarelo e cor clara de marca não seguram o logo em cima do papel: aí a versão principal é na cor */
    if(c.fundo === 'paper' && M.contraste(c.p, c.paper) < 1.7) c.fundo = 'p';
    /* os ajustes do território (flúor, profundo, claro) também passam pela regra do verde */
    c = acentoNaFamilia(M.tiraVerde(c, r.cor ? M.lch(r.cor) : null), r, t);
    return M.tiraVerde(corNome(c, nc), r.cor ? M.lch(r.cor) : null);
  }
  M.receitaDe = sp => { const t = T[sp.territorio]; return (t && t.receitas || []).find(x => x.n === (sp.cores && sp.cores.receita)) || null; };
  /* as ideias de símbolo que fazem sentido: as do sentido do nome primeiro, depois as do nicho */
  /* v3.43: as ideias na ordem de força: do próprio nome, do ofício, do sentido do próprio (e da frase e das palavras) e do
     nicho. Cada uma guarda de onde veio (out.de) e, a do nome, a palavra que acendeu (out.palavra: { w, i0 }).
     Ideia com "so" (taça, cone, avanço, faixas) só entra pelos campos e pelo nicho quando o nicho é dela */
  M.ideiasDe = (o, nicho0) => {
    if(!o || Array.isArray(o)) o = { campos: o, nicho: nicho0 };
    const nicho = o.nicho, out = [], de = {}, palavra = {}, reserva = [];
    const poe = (k, d, filtra, w) => { const id = M.IDEIAS[k]; if(!id || out.includes(k)) return; if(filtra && id.so && !id.so.includes(nicho)) return;
      if(CLICHE.has(k) && d !== 'nome'){ if(!reserva.includes(k)){ reserva.push(k); de[k] = de[k] || d; } return; }
      out.push(k); de[k] = d; if(w) palavra[k] = w; };
    if(o.nome){ const pt = M.partes(o.nome); pt.palavras.filter(x => x.i0 >= pt.pi0 && x.i1 <= pt.pi1 && x.c !== 'liga').forEach(x => { const w = semAcI(x.w).replace(/[^a-z0-9]/g, ''); NOME_IDEIA.forEach(([re, k]) => { if(re.test(w)) poe(k, 'nome', false, x); }); }); }
    /* a fusão entra na frente da ideia do nome que ela funde */
    const txO = semAcI([o.oficio, o.nome].filter(Boolean).join(' '));
    FUSOES.forEach(([a, re, k]) => { const i = out.indexOf(a); if(i < 0 || !re.test(txO) || out.includes(k)) return; out.splice(i, 0, k); de[k] = 'nome'; if(palavra[a]) palavra[k] = palavra[a]; });
    if(o.oficio){ const tx = semAcI(o.oficio); OFICIO.forEach(([re, k]) => { if(re.test(tx)) poe(k, 'oficio'); }); }
    /* a velocidade (as setas e os rastros) só vem do sentido de velocidade, nunca do nicho */
    const dn = IDEIA_NICHO[nicho] || [], cs = (o.campos || []).slice().sort((a, b) => b.id.filter(k => dn.includes(k)).length - a.id.filter(k => dn.includes(k)).length);
    cs.forEach(c => c.id.forEach(k => poe(k, 'campo', c.k !== 'veloz')));
    (IDEIA_NICHO[nicho] || IDEIA_NICHO.outro).forEach(k => poe(k, 'nicho', true));
    out.de = de; out.palavra = palavra; out.reserva = reserva;
    return out;
  };
  /* as 6 amostras: r = respostas { nome, tagline, nicho, pers, cor, manterCor, letra, cidade, desde, palavras }.
     Só entram territórios coerentes; se forem menos de 6, os melhores aparecem em outra versão (outra receita, outro gesto) */
  /* v3.40: cada rodada gera bem mais candidatas do que mostra (todos os territórios que fazem sentido, em várias versões),
     tira as que já apareceram em rodadas anteriores (vistos = as assinaturas) e escolhe as 6 mais diferentes entre si.
     A cada rodada o leque abre um pouco mais (territórios no limite da coerência, letras irmãs, ideias além das duas
     primeiras, paletas geradas): mais caminhos sem repetir, sempre dentro do que faz sentido pro negócio. */
  M.amostras = (r, rodada, vistos) => {
    rodada = rodada || 0;
    const ja = vistos instanceof Set ? vistos : new Set(Array.isArray(vistos) ? vistos : []);
    const rf = r.rf || M.lerRefs(r.refs); r = Object.assign({}, r, { rf, rodada });
    const campos = M.sentido(r.nome, r.tagline, r.palavras, r.descr).concat(rf.campos.filter(c => !M.sentido(r.nome, r.tagline, r.palavras, r.descr).some(x => x.k === c.k)));
    const abre = Math.min(3, Math.floor(rodada / 2));
    const rank = M.ranking(r.pers, r.nicho, campos, rf.t, abre), notaT = Object.fromEntries(rank.map(x => [x.k, x.nota]));
    let ks = rank.filter(x => !x.veta && !x.longe && x.coer + x.sem + Math.min(0, x.ref || 0) >= -abre * .5 && x.nota > -1.6 - abre * 1.1).map(x => x.k);
    if(ks.length < 2) ks = rank.filter(x => !x.veta && !x.longe).slice(0, 3).map(x => x.k);
    if(ks.length < 2) ks = rank.filter(x => !x.veta).slice(0, 3).map(x => x.k);
    if(!ks.length) ks = rank.slice(0, 3).map(x => x.k);
    if(r.letra){ const ok = k => T[k].fontes.some(f => M.fonteInfo(f).e === r.letra); ks = ks.filter(ok).concat(ks.filter(k => !ok(k))); }
    ks = ks.slice(0, 8 + abre * 2);
    /* com poucos territórios (personalidade extrema), cada um gera mais versões: o leque precisa de saída pra não repetir ideia */
    /* v3.43: mais versões por território (os gestos novos e as formas do conceito precisam de vaga pra aparecer) */
    const cand = [], aqui = new Set(), nv = Math.max(5, Math.ceil(30 / Math.max(1, ks.length))) + Math.min(10, rodada * 2);
    const gera = (de, ate) => ks.forEach((k, ti) => { for(let v = de; v < ate; v++){
      const vr = v + rodada, sp = M.aplicaTerritorio(k, r, M.hash(r.nome + ':' + k + ':' + rodada + ':' + v), 0, campos, vr, ti === 0 && v === 0 && !rodada), a = M.assinatura(sp);
      if(aqui.has(a)) continue; aqui.add(a); cand.push({ sp, a, ti, v, novo: !ja.has(a) });
    } });
    gera(0, nv);
    /* v3.43: depois de umas rodadas, a fila acaba ficando só com o que já passou e o "Mais 6 caminhos" repetia logo.
       Antes de aceitar repetir, gera mais versões dos mesmos territórios (até 4 vezes o tanto) atrás de novas */
    for(let extra = 1; extra <= 3 && cand.filter(c => c.novo).length < 9; extra++) gera(nv * extra, nv * (extra + 1));
    /* escolhe uma por vez: a nova vale mais que a repetida, o território mais coerente vale mais, e parecer com uma já
       escolhida tira ponto (no máximo duas do mesmo território, se der) */
    /* v3.43: o território vale pelo quanto ele fica atrás do melhor (não pela posição na fila), e a alternativa cujo
       símbolo sai do nome (ou do ofício) sobe: é o conceito que só essa marca tem */
    const topo = notaT[ks[0]] || 0, origem = { nome: 4.5, oficio: 1.5 };
    const finaAberta = sp => sp.logo.caixa === 'alta' && (Number(sp.logo.track) || 0) > 0.1 && PESO_F.leve.includes(sp.tipo.display);
    const soNome = sp => !sp.simbolo || !sp.simbolo.tipo || sp.simbolo.tipo === 'nenhum';
    const out = [], usados = {};
    for(let n = 0; n < 6 && cand.length; n++){
      let melhor = null, mn = -Infinity;
      /* a mesma ideia de símbolo duas vezes, ou duas caixas altas finas e espaçadas, só quando não sobra outra saída */
      /* (e o mesmo desenho com outra roupa: mesmo território, mesmo gesto e o mesmo símbolo, só mudando cor ou arranjo) */
      const gemeo = (a, b) => a.territorio === b.territorio && a.logo.gesto === b.logo.gesto && (a.simbolo || {}).tipo === (b.simbolo || {}).tipo && (a.simbolo || {}).ideia === (b.simbolo || {}).ideia;
      /* v3.43: a mesma ideia pode voltar em outra forma (do lado do nome, com a inicial dentro, pendurada na letra, no lugar
         do O): é o conceito da marca atravessando o conjunto. O mesmo desenho na mesma forma, nunca */
      const mesmaIdeia = (a, b) => (a.simbolo || {}).tipo === 'ideia' && (b.simbolo || {}).tipo === 'ideia' && a.simbolo.ideia === b.simbolo.ideia && formaC(a) === formaC(b);
      /* v3.43: e o mesmo gesto duas vezes (dois colchetes, dois "SALÃO DA / Neide"), dois emblemas ou dois selos: a rodada
         gasta a vaga com variação de enfeite, não de ideia */
      const mesmoGesto = c => !!c.sp.logo.gesto && out.some(o => o.logo.gesto === c.sp.logo.gesto && (cara(o) === cara(c.sp) || o.territorio === c.sp.territorio || ['versalete', 'fiolado', 'pendente', 'corte', 'troca', 'fios'].includes(o.logo.gesto)));
      const molde = sp => ['emblema', 'monograma'].includes((sp.simbolo || {}).tipo) ? 'emblema' : sp.logo.arranjo === 'selo' ? 'selo' : '';
      const repete = c => { return out.some(o => mesmaIdeia(o, c.sp)) || (finaAberta(c.sp) && out.some(finaAberta)) || out.some(o => gemeo(o, c.sp)) || mesmoGesto(c) || (!!molde(c.sp) && out.some(o => molde(o) === molde(c.sp))); };
      /* v3.43: um desenho que já passou numa rodada anterior só volta quando não sobra NENHUM novo. Antes disso as regras
         de variedade afrouxam (gesto e molde repetidos), mas o "Mais 6 caminhos" não mostra de novo o que a pessoa já viu */
      const fila = cand.some(c => !c.usado && c.novo) ? cand.filter(c => c.novo) : cand;
      let livres = fila.filter(c => !c.usado && !repete(c));
      /* sem saída: primeiro afrouxa o gesto e o molde repetidos (nunca o mesmo desenho duas vezes) */
      if(!livres.length) livres = fila.filter(c => !c.usado && !out.some(o => gemeo(o, c.sp) || mesmaIdeia(o, c.sp)) && !(!!molde(c.sp) && out.some(o => molde(o) === molde(c.sp))));
      if(!livres.length) livres = fila.filter(c => !c.usado && !out.some(o => gemeo(o, c.sp) || mesmaIdeia(o, c.sp)));
      /* sem saída (nome com uma ideia só e poucos territórios): a candidata que repetiria a ideia troca pelo outro molde
         do território (ou fica sem símbolo), em vez de mostrar o mesmo desenho duas vezes */
      if(!livres.length) livres = fila.filter(c => !c.usado && c.sp.simbolo && c.sp.simbolo.tipo === 'ideia').map(c => {
        const sp = JSON.parse(JSON.stringify(c.sp)), t = T[sp.territorio], alt = t.simbs.find(x => x.tipo !== 'ideia' && (x.tipo !== 'orbita' || M.orbitaCabe(M.iniciais(r.nome), r.nicho)));
        if(alt && alt.tipo !== 'nenhum') sp.simbolo = Object.assign({}, sp.simbolo, { tipo: alt.tipo, ideia: undefined, de: undefined, detalhe: alt.detalhe, estilo: alt.estilo, forma: alt.formas ? alt.formas[0] : undefined });
        else { sp.simbolo = { tipo: 'nenhum', seed: sp.simbolo.seed }; sp.logo.arranjo = 'wordmark'; }
        if(sp.logo.gesto === 'troca' && sp.logo.trocaPor === 'ideia') sp.logo.trocaPor = 'circulo';
        const a = M.assinatura(sp); return Object.assign({}, c, { sp, a, novo: !ja.has(a), gemea: c });
      }).filter(c => !repete(c));
      (livres.length ? livres : fila).forEach(c => {
        if(c.usado) return;
        const S = c.sp.simbolo || {};
        let nota = (c.novo ? 20 : 0) - Math.max(0, topo - (notaT[c.sp.territorio] || 0)) * 0.8 - c.v * .18 + (rodada === 0 && n === 0 && c.ti === 0 && c.v === 0 && S.tipo !== 'emblema' ? 8 : 0) + (S.tipo === 'ideia' ? origem[S.de] || 0 : 0) + (c.sp.logo.gesto === 'corte' ? 3 : 0) + (c.sp.logo.gesto ? 1.5 : 0);
        out.forEach(o => { nota -= parecida(c.sp, o) * 1.35; });
        /* o O virando símbolo é ideia forte: uma vez por rodada basta */
        const funde = sp => sp.logo.gesto === 'troca' && sp.logo.trocaPor === 'ideia';
        if(funde(c.sp) && out.some(funde)) nota -= 10;
        if((usados[c.sp.territorio] || 0) >= 2) nota -= 6;
        /* (quando falta saída e o gesto repete, cada repetição custa: três versaletes numa rodada não) */
        if(c.sp.logo.gesto) nota -= 4 * out.filter(o => o.logo.gesto === c.sp.logo.gesto).length;
        /* o escudo com monograma e ano é a resposta automática do clássico: entra, mas atrás do que tem conceito */
        /* (v3.73: com o conceito gravado no meio, ele já é ideia da marca: perde menos) */
        if(S.tipo === 'emblema') nota -= S.ideia ? 1 : 2.5;
        /* v3.73 · SÓ O NOME, NO MÁXIMO DUAS: o leque saía com três, quatro (no salão, as seis) alternativas sem símbolo. A
           terceira só entra quando não sobra nenhuma com desenho */
        if(soNome(c.sp)){ const q = out.filter(soNome).length; nota -= q >= 2 ? 14 : q ? 3 : 0; }
        if(nota > mn){ mn = nota; melhor = c; }
      });
      if(!melhor) break;
      melhor.usado = true; if(melhor.gemea) melhor.gemea.usado = true; usados[melhor.sp.territorio] = (usados[melhor.sp.territorio] || 0) + 1; out.push(melhor.sp);
    }
    out.forEach((sp, i) => { sp.amostra = i + 1; });
    return out;
  };
  /* um território aplicado a uma marca. campos = o sentido do nome; variante = a outra versão do mesmo território */
  M.aplicaTerritorio = (k, r, seed, i, campos, variante, forcaNome) => {
    const t = T[k], rr = M.rng(seed), pega = arr => arr[Math.floor(rr() * arr.length) % arr.length], vv = variante || 0;
    if(!r.rf && r.refs) r = Object.assign({}, r, { rf: M.lerRefs(r.refs) });
    const rf = r.rf || {};
    if(!campos) campos = M.sentido(r.nome, r.tagline, r.palavras, r.descr).concat(rf.campos || []);
    /* v3.40: depois das primeiras versões, entram as letras irmãs do território (mesmo estilo, jeito parecido) */
    const irmas = M.FONTES.filter(f => f.d && !t.fontes.includes(f.id) && t.fontes.some(id => M.fonteInfo(id).e === f.e)).sort((a, b) => dist(a.v, t.v) - dist(b.v, t.v)).slice(0, 3).map(f => f.id);
    const fontesT = vv >= 2 ? t.fontes.concat(irmas) : t.fontes;
    let fonte = fontesT[(Math.floor(rr() * fontesT.length) + vv) % fontesT.length];
    if(r.letra && M.fonteInfo(fonte).e !== r.letra){ const alts = M.FONTES.filter(f => f.d && f.e === r.letra).sort((a, b) => dist(a.v, t.v) - dist(b.v, t.v)); if(alts.length) fonte = alts[(Math.floor(rr() * Math.min(alts.length, 1 + vv))) % alts.length].id; }
    /* v3.73: marca bruta (popular e de energia) troca a letra elegante por outra do território (ou irmã) que não seja;
       só fica se a pessoa pediu um estilo que só existe elegante (a caligrafia) */
    if(bruta(r.pers) && ELEGANTE.has(fonte) && !(r.letra && !M.FONTES.some(f => f.d && f.e === r.letra && !ELEGANTE.has(f.id)))){
      const ok = t.fontes.concat(irmas).filter(id => !ELEGANTE.has(id) && (!r.letra || M.fonteInfo(id).e === r.letra)), daLetra = r.letra ? M.FONTES.filter(f => f.d && f.e === r.letra && !ELEGANTE.has(f.id)).map(f => f.id) : [];
      const lista = ok.length ? ok : daLetra; if(lista.length) fonte = lista[vv % lista.length];
    }
    /* o peso de letra que a pessoa pediu (leve, no meio, pesada) */
    if(rf.peso && !(r.letra && r.letra !== 'sem' && r.letra !== 'serifa')){ const ok = PESO_F[rf.peso] || []; if(!ok.includes(fonte)){ const cand = fontesT.concat(irmas).filter(id => ok.includes(id)), daLetra = r.letra ? ok.filter(id => M.fonteInfo(id).e === r.letra) : ok; const lista = cand.length ? cand : daLetra.slice().sort((a, b) => dist(M.fonteInfo(a).v, t.v) - dist(M.fonteInfo(b).v, t.v)); if(lista.length) fonte = lista[vv % lista.length]; } }
    /* v3.43: o símbolo sai do nome e do ofício; o que a descrição e as referências puxam pesa no território e na cor,
       mas não vira desenho (palavra solta da descrição dava taça em salão e seta em pet shop) */
    const pt = M.partes(r.nome);
    const ideias = M.ideiasDe({ nome: r.nome, oficio: [pt.descritor, r.descr].join(' '), campos: M.sentido(pt.proprio, r.tagline, r.palavras), nicho: r.nicho }), icones = (M.NICHOS[r.nicho] || M.NICHOS.outro).ic;
    let s0 = t.simbs[(Math.floor(rr() * t.simbs.length) + vv) % t.simbs.length];
    const ri = rr(), doNome = ideias.filter(x => ideias.de[x] === 'nome');
    /* v3.43: sem ideia de nome, de ofício ou de fusão, o pictograma do nicho (a reserva) só entra depois das primeiras versões */
    /* v3.73: marca que não é sóbria e tem menos de duas ideias boas (o nome não dá desenho, o ofício só dá um) pode usar a
       reserva já na primeira rodada, a partir da 2ª versão de cada território (com menos de três): melhor um pictograma bem desenhado na
       quarta alternativa do que a quarta alternativa só com o nome. Escritório sério segue sem (lá o nome sozinho é o certo).
       O pictograma genérico do nicho (a bala da doceria, o livro da escola) só quando a marca tem uma ideia ou nenhuma: no
       açaí com tigela e morro, a bala era desenho de outro negócio */
    const sobriaR = r.pers[1] <= 0.3 && r.pers[3] < 0.45;
    const lista = ideias.length >= 3 || sobriaR ? (ideias.length ? ideias : (r.rodada || 0) >= 1 && vv >= 2 ? ideias.reserva : [])
      : vv >= 1 ? ideias.concat(ideias.reserva.filter(k => ideias.de[k] !== 'nicho' || ideias.length < 2)) : ideias;
    let ideia = lista.length ? lista[(Math.floor(ri * Math.min(4 + Math.floor(vv / 2), lista.length)) + vv) % lista.length] : undefined;
    /* v3.43: a primeira alternativa do território mais coerente mostra o conceito que sai do nome, do lado dele */
    const vaiNome = !!(forcaNome && doNome.length && t.simbs.some(x => x.tipo === 'ideia'));
    if(vaiNome){ s0 = t.simbs.find(x => x.tipo === 'ideia'); ideia = doNome[0]; }
    /* sem ideia que faça sentido, o molde "ideia" do território vira o outro molde dele (ou nenhum): nada de símbolo genérico */
    if(s0.tipo === 'ideia' && !ideia) s0 = t.simbs.find(x => x.tipo !== 'ideia') || { tipo: 'nenhum' };
    /* a órbita é rara: só com inicial redonda ou em tecnologia; fora disso, o outro molde do território */
    if(s0.tipo === 'orbita' && !M.orbitaCabe(M.iniciais(r.nome), r.nicho)){ const alt = t.simbs.find(x => x.tipo !== 'orbita' && (x.tipo !== 'ideia' || ideia)); s0 = alt || { tipo: 'nenhum' }; }
    /* o monograma sobreposto só com duas iniciais (Moraes & Valente, Sol Maior); com uma, fica o outro molde */
    const duasIni = [...M.iniciais(r.nome)].filter(c => c !== '&');
    if(s0.tipo === 'monograma' && s0.estilo === 'liga' && (duasIni.length < 2 || semAcI(duasIni[0]) === semAcI(duasIni[1]))){ const alt = t.simbs.find(x => !(x.tipo === 'monograma' && x.estilo === 'liga') && (x.tipo !== 'ideia' || ideia)); s0 = alt || { tipo: 'nenhum' }; }
    /* v3.43: o desenho em pixel também só sai de uma ideia de verdade (o pictograma do nicho em pixel é o mesmo clichê) */
    if(s0.tipo === 'pixel' && !ideia) s0 = { tipo: 'nenhum' };
    const icCampo = { grelha: 'chama', chama: 'chama', grao: 'xicara', xicara: 'xicara', bala: 'coracao', coracao: 'coracao', vinil: 'fone', ondas: 'onda', cursor: 'codigo', grade: 'codigo', avanco: 'raio', faixas: 'raio', cruz: 'coracao', folha: 'folha', sol: 'sol', pata: 'pata', taca: 'taca', lua: 'estrela', coroa: 'coroa', diamante: 'diamante', casa: 'casa', livro: 'livro', sacola: 'sacola', quadro: 'camera', gota: 'pincel', cone: 'raio', seta: 'raio', onda: 'onda', estrela: 'estrela', estrela4: 'estrela', check: 'chave', cabide: 'camiseta',
      dente: 'dente', tesoura: 'tesoura', navalha: 'tesoura', secador: 'tesoura', pente: 'tesoura', poste: 'tesoura', focinho: 'pata', laje: 'casa', base: 'casa', fresta: 'sol', agulha: 'pincel', morro: 'montanha', coador: 'xicara',
      tigela: 'cupcake', luva: 'haltere', solpauta: 'sol', paoprosa: 'pao', dentluz: 'dente', chapaquente: 'chama', tatame: 'haltere' }[ideia];
    const simbolo = { tipo: s0.tipo, forma: s0.formas ? pega(s0.formas) : undefined, icone: s0.icone || icCampo || pega(icones), ideia: s0.tipo === 'ideia' || s0.tipo === 'icone' ? ideia : undefined, detalhe: s0.detalhe, estilo: s0.estilo, seed: seed % 100000 };
    if(simbolo.tipo === 'ideia'){ simbolo.ideia = ideia; simbolo.de = ideias.de[ideia]; if((s0.letra || ideia === 'base') && M.cabeLetra(ideia)) simbolo.letra = true; }
    /* v3.73 · O ESCUDO GENÉRICO: escudo com a inicial é a resposta automática do clássico (o "C" no escudo do Coado). O
       emblema agora leva no meio o conceito da marca (o que sai do nome ou do ofício), gravado em traço; sem conceito, ele
       fica no círculo com a inicial (o escudo vazio de ideia não entra) */
    if(simbolo.tipo === 'emblema'){
      const forte = ideias.filter(x => ['nome', 'oficio'].includes(ideias.de[x]))[vv % Math.max(1, ideias.filter(x => ['nome', 'oficio'].includes(ideias.de[x])).length)];
      if(forte){ simbolo.ideia = forte; simbolo.de = ideias.de[forte]; }
      else simbolo.forma = 'circulo';
    }
    /* a fatia e o corte só onde a letra aguenta (senão, a barra) */
    if(simbolo.tipo === 'letra') simbolo.detalhe = M.detalheLetra(simbolo.detalhe, [...M.iniciais(r.nome)][0]);
    let arranjo = simbolo.tipo === 'nenhum' ? 'wordmark' : t.arranjos[(Math.floor(rr() * t.arranjos.length) + vv) % t.arranjos.length];
    /* o gesto tipográfico do território (empilhado só com duas palavras ou mais; recorte só em nome curto) */
    const nome = String(r.nome || '').trim(), gs = t.gestos || [['']];
    const cores = paletaDe(t, r, seed, campos, vv);
    /* v3.43: a partir do gesto sorteado, fica o primeiro da lista que cabe no nome, na letra e nas cores */
    /* v3.43: o corte de navalha só onde ele é o ofício (salão, barbearia, luta); o pendente só quando a ideia do nome tem o que
       pendurar (o prumo, a gota do coado) */
    const corteOk = r.nicho === 'beleza' || /\b(corte|navalha|barb|cabel|tesoura|luta|jiu|muay|boxe|karate|judo)/.test(semAcI([r.nome, r.descr, pt.descritor].join(' ')));
    const PEND = { prumo: 'prumo', coador: 'gota', agulha: 'tinta' }, pende = PEND[ideias.find(x => ideias.de[x] === 'nome' && PEND[x])] || '';
    const ig = (Math.floor(rr() * gs.length) + vv) % gs.length;
    let g = [''];
    /* v3.43: entre os gestos que cabem, um sorteado (antes era o primeiro da lista depois do sorteio, e o gesto do começo da
       lista ganhava quase sempre: rua era sempre empilhado, grand prix sempre encostado) */
    const cabem = gs.filter(c => M.cabeGesto(c[0], pt, nome, fonte, { caixa: t.caixa, cores, arranjo, sep: (c[1] || {}).sep, track: t.track, pers: r.pers, veloz: r.nicho === 'auto' || M.sentido(r.nome, r.tagline, r.palavras, r.descr).some(x => x.k === 'veloz'), corte: corteOk, pende }));
    if(cabem.length) g = cabem[(ig + vv) % cabem.length];
    /* O "O" VIRA O SÍMBOLO só quando o conceito vem do nome: a ideia saiu de uma palavra do próprio, essa palavra tem um O
       de verdade (sem acento, fora do "ão") e o desenho lê como O (grelha, onda, lua, vinil, o sol no horizonte). Aí o nome
       sozinho já é a marca. Nunca na primeira alternativa (ela mostra o conceito do lado do nome) e só de vez em quando */
    const FUSAO = ['rua', 'gp', 'bauhaus', 'sinal', 'editorial', 'chiclete', 'zine', 'classico', 'noir'];
    const temOde = w => { const cs = w ? [...w.w] : []; return cs.some((ch, j) => /[oO0]/.test(ch) && !(j && /[ãõÃÕ]/.test(cs[j - 1]))); };
    const fundiveis = doNome.filter(x => M.IDEIAS[x] && (M.IDEIAS[x].redonda || M.IDEIAS[x].noO) && temOde(ideias.palavra[x]));
    if(!vaiNome && FUSAO.includes(k) && fundiveis.length && vv >= 1 && rr() < 0.35){
      Object.assign(simbolo, { tipo: 'ideia', ideia: fundiveis[0], de: 'nome', forma: undefined, detalhe: undefined, estilo: ['sinal', 'editorial', 'noir', 'zine'].includes(k) ? 'linha' : undefined });
      g = ['troca', { trocaPor: 'ideia', trocaEm: ideias.palavra[fundiveis[0]].i0 }]; arranjo = 'wordmark';
    }
    if(arranjo === 'placa' && [...nome].length > 18) arranjo = 'horizontal';
    /* v3.43: nome com ofício que não cabe numa linha e ficou sem gesto vira hierarquia: quebrado em duas linhas do mesmo
       tamanho, o ofício (Contabilidade) ficava maior que o próprio (Prumo) */
    if(!g[0] && pt.descritor && M.largEst(fonte, nome, t.caixa, t.track) > 760 && M.cabeGesto('hierarquia', pt, nome, fonte)) g = ['hierarquia'];
    /* v3.43 · um gesto por marca: com símbolo do lado, o enfeite do nome (sublinhado, colchete, ponto, letra pintada) sai.
       Símbolo + letra em destaque + sublinhado é três ideias brigando; fica o símbolo */
    if(simbolo.tipo !== 'nenhum' && ['sublinha', 'colchetes', 'ponto', 'destaque', 'bolha', 'corte'].includes(g[0])) g = [''];
    /* o pendente é o símbolo morando no letreiro: a assinatura principal fica só o nome (o desenho continua no avatar) */
    if(g[0] === 'pendente' && pende){ const k2 = ideias.find(x => ideias.de[x] === 'nome' && PEND[x]); Object.assign(simbolo, { tipo: 'ideia', ideia: k2, de: 'nome', letra: undefined, forma: undefined, detalhe: undefined }); arranjo = 'wordmark'; }
    /* v3.43: a inicial sozinha do lado do nome nunca: ela já está no nome (K + KVRA lê "KKVRA", M + açaí do morro lê
       "Maçaí"). O molde "letra" vira o outro molde do território; a inicial fica pro avatar */
    if(simbolo.tipo === 'letra'){
      const alt = t.simbs.find(x => x.tipo !== 'letra' && (x.tipo !== 'ideia' || ideia) && (x.tipo !== 'orbita' || M.orbitaCabe(M.iniciais(r.nome), r.nicho)));
      if(alt && alt.tipo !== 'nenhum') Object.assign(simbolo, { tipo: alt.tipo, detalhe: alt.detalhe, estilo: alt.estilo, forma: alt.formas ? pega(alt.formas) : undefined, ideia: alt.tipo === 'ideia' ? ideia : undefined, de: alt.tipo === 'ideia' ? ideias.de[ideia] : undefined });
      else { simbolo.tipo = 'nenhum'; arranjo = 'wordmark'; }
    }
    /* v3.43: o espaço aberto entre letras encolhe com o tamanho do nome (o 0,2 do Sinal fica 0,2 em KVRA e cai pra perto de
       0,08 num nome de 26 letras); letra fina em caixa alta com mais de 12 letras não passa de 0,1 */
    const nL = [...nome].length, fina = PESO_F.leve.includes(fonte) && t.caixa === 'alta';
    const track = t.track > 0 ? Math.round(Math.min(t.track * Math.max(0.35, Math.min(1, 11 / Math.max(1, nL))), fina && nL > 12 ? 0.1 : 9) * 1000) / 1000 : t.track;
    const logo = Object.assign({ arranjo, caixa: t.caixa, track, efeito: pega(t.efeitos), gesto: g[0], tagline: !!String(r.tagline || '').trim(), corTexto: k === 'gp' ? 'marca' : 'texto' }, g[1] || {});
    if(g[0] === 'pendente') logo.pende = pende;
    /* v3.43: o selo alterna entre o anel com o nome em volta e a fita atravessando (o mesmo molde em toda marca vira carimbo de gerador) */
    if(k === 'selo') logo.selo = (seed >> 3) % 2 ? 'fita' : '';
    if(k === 'manuscrito') logo.corGesto = 'marca';
    /* o gesto (barra, ponto, bolha, fio) sai na cor do acento; se o acento foge do sentido e a cor da marca não, o gesto vai na cor da marca */
    { const hs = faixas(campos, r.nicho), la = M.lch(cores.a), lp = M.lch(cores.p);
      if(!logo.corGesto && hs.length && la.c >= 0.06 && longe(la.h, hs) > 40 && lp.c >= 0.06 && longe(lp.h, hs) <= 15) logo.corGesto = 'marca'; }
    return {
      v: 1, territorio: k, amostra: i === undefined ? 0 : i + 1, nome: r.nome, tagline: r.tagline || '', nicho: r.nicho, cidade: r.cidade || '', desde: r.desde || '', pers: r.pers.slice(), modo: r.modo || 'branding',
      campos: campos.map(c => c.k), logo, simbolo, tipo: { display: fonte, texto: M.parTexto(fonte) }, cores, textura: t.textura, aplic: t.aplic.slice(), seed, variante: vv
    };
  };
  /* v3.40 · a assinatura de uma amostra: o que faz duas parecerem a mesma (território, letra, cores, gesto, símbolo, arranjo) */
  /* v3.43: só o que se DESENHA (letra, caixa, gesto, símbolo e o molde do arranjo). Com a cor, o fundo e o território na
     conta, a mesma letra com o mesmo símbolo voltava no "Mais 6 caminhos" como se fosse nova, só trocando a bolinha de
     cor ou o deitado pelo empilhado. Símbolo "nenhum" não carrega a ideia que ficou guardada nele */
  const MOLDE_ARR = { horizontal: 'trava', vertical: 'trava' };
  M.assinatura = sp => {
    const s = sp.simbolo || {}, sem = !s.tipo || s.tipo === 'nenhum', arr = (sp.logo && sp.logo.arranjo) || '';
    /* v3.73: o pixel conta pelo desenho que sai (onda e fone viram a mesma nota: duas assinaturas, um desenho só, e o "Mais 6
       caminhos" repetia) e o traço fino conta como outro desenho (a mesma ideia em linha é outra alternativa) */
    const chave = s.tipo === 'pixel' && s.icone ? M.pxDe(s.icone) + (s.forma === 'moldura' ? ':moldura' : '') : (s.ideia || s.icone || s.forma || '');
    const simb = sem ? '' : s.tipo + ':' + chave + (s.letra ? '+letra' : '') + (s.detalhe ? ':' + s.detalhe : '') + (s.estilo === 'linha' && s.tipo === 'ideia' && !(M.IDEIAS[s.ideia] || {}).solida ? ':linha' : '') + (s.tipo === 'geo' || (s.tipo === 'pixel' && !s.icone && !s.ideia) ? ':' + s.seed : '');
    return [sp.tipo && sp.tipo.display, sp.logo && sp.logo.caixa, sp.logo && sp.logo.gesto, simb, sem ? '' : (MOLDE_ARR[arr] || arr)].join('|');
  };
  /* o quanto duas amostras se parecem (0 = nada a ver) */
  /* v3.43: a "cara da letra" (estilo, classe de peso, caixa e se é espaçada) conta no lugar da fonte exata: Grotesca Fina e
     Geométrica Leve em caixa alta espaçada são a mesma cara. Mesma ideia de símbolo pesa muito (o leque mostra conceitos
     diferentes) e o mesmo molde (letra, órbita, emblema, geo, monograma) também */
  const pesoF = id => PESO_F.leve.includes(id) ? 'leve' : PESO_F.pesada.includes(id) ? 'pesada' : 'media';
  /* (v3.43: grotesca média e pesada em caixa baixa são a mesma cara pra quem olha a folha: o peso conta só leve x cheia) */
  const cara = sp => [M.fonteInfo(sp.tipo.display).e, pesoF(sp.tipo.display) === 'leve' ? 'leve' : 'cheia', sp.logo.caixa || '', (Number(sp.logo.track) || 0) > 0.1].join('|');
  const MOLDES = ['letra', 'orbita', 'emblema', 'geo', 'monograma'];
  /* a forma em que a ideia aparece: do lado do nome, com a inicial dentro, pendurada na letra ou no lugar do O */
  /* (v3.73: o conceito no meio do selo e gravado no emblema são formas próprias: o coador do lado do nome e o coador no selo
     são duas alternativas, não a mesma) */
  const formaC = sp => (sp.simbolo || {}).letra ? 'letra' : sp.logo.arranjo === 'selo' ? 'selo' : (sp.simbolo || {}).tipo === 'emblema' ? 'emblema' : sp.logo.gesto === 'pendente' ? 'pende' : sp.logo.gesto === 'troca' && sp.logo.trocaPor === 'ideia' ? 'troca' : (sp.simbolo || {}).estilo === 'linha' ? 'linha' : 'lado';
  const parecida = (a, b) => { const A = a.simbolo || {}, B = b.simbolo || {};
    return (a.territorio === b.territorio ? 2 : 0) + (cara(a) === cara(b) ? 3 : 0) + (a.tipo.display === b.tipo.display ? 2.5 : 0) + ((a.cores.receita || a.cores.p) === (b.cores.receita || b.cores.p) ? 2.2 : M.contraste(a.cores.p, b.cores.p) < 1.25 ? 1.2 : 0) + (a.logo.gesto === b.logo.gesto ? (a.logo.gesto ? 3 : 1) : 0) + (a.logo.arranjo === b.logo.arranjo ? .5 : 0)
      + (A.ideia && A.ideia === B.ideia ? (A.tipo === 'ideia' && B.tipo === 'ideia' && formaC(a) === formaC(b) ? 5 : 2) : 0) + (A.tipo === B.tipo && MOLDES.includes(A.tipo) ? 2.5 : 0) + (A.tipo === B.tipo && (A.tipo === 'icone' || A.tipo === 'pixel') && A.icone === B.icone ? 1 : 0); };
  M.parecida = parecida;
  /* o porquê de cada escolha (vai na abertura do brandbook e na prancha da amostra) */
  M.porque = sp => {
    const t = T[sp.territorio] || T.rua, c = sp.cores, nm = h => M.nomeCor(h, sp.nome);
    const troca = s => s.replace('{p}', nm(c.p)).replace('{s}', nm(c.s)).replace('{a}', nm(c.a)).replace('{ink}', nm(c.ink));
    const fi = M.fonteInfo(sp.tipo.display), rc = M.receitaDe(sp);
    return { letra: `${fi.k || fi.n} (derivada de ${fi.o}). ` + t.porque.letra, cor: (rc ? `Paleta ${rc.n}: ${rc.h}. ` : '') + troca(t.porque.cor), simbolo: M.simboloTxt(sp), gesto: M.gestoTxt(sp) };
  };
  /* arquétipo: a personalidade com nome (vai no brandbook) */
  const ARQ = [
    ['Fora-da-lei', 'Quebra a regra pra abrir caminho.', [.8, .5, .8, .95, .5]], ['Herói', 'Chega e resolve.', [.7, .3, .6, .9, .6]], ['Bobo da corte', 'Leva a sério não se levar a sério.', [.6, .95, .85, .8, .4]],
    ['Gente como a gente', 'É da turma, fala a língua da turma.', [.5, .6, .95, .45, .4]], ['Cuidador', 'Cuida de perto, lembra do nome.', [.3, .4, .6, .2, .3]], ['Inocente', 'Simples, honesto e do jeito certo.', [.4, .62, .6, .25, .2]],
    ['Explorador', 'Vai além do mapa.', [.7, .6, .5, .75, .55]], ['Criador', 'Inventa o que ainda não existe.', [.8, .6, .4, .6, .7]], ['Mago', 'Transforma o comum em outra coisa.', [.9, .5, .3, .6, .95]],
    ['Sábio', 'Explica o mundo sem complicar.', [.4, .2, .3, .3, .6]], ['Governante', 'Define o padrão do bairro.', [.3, .1, .1, .4, .5]], ['Amante', 'Faz sentir antes de fazer pensar.', [.4, .5, .15, .45, .15]]
  ];
  M.arquetipo = pers => { const a = ARQ.slice().sort((x, y) => dist(pers, x[2]) - dist(pers, y[2]))[0]; return { n: a[0], d: a[1] }; };
  /* a DNA da marca: uma tira única feita dos parâmetros (vai na capa e no rodapé do brandbook) */
  M.dna = sp => { const r = M.rng(M.hash(JSON.stringify([sp.nome, sp.territorio, sp.cores.p, sp.cores.s, sp.cores.a, sp.tipo.display]))), cs = [sp.cores.p, sp.cores.s, sp.cores.a, sp.cores.ink], out = []; for(let i = 0; i < 48; i++) out.push({ w: 1 + Math.floor(r() * 4), c: cs[Math.floor(r() * cs.length)], h: 0.35 + r() * 0.65 }); return out; };
})();

/* ---------------- A VOZ (sem IA): conceito, manifesto, frases, tom e as mensagens prontas ----------------
   É o texto de reserva: a IA da função "imagem" (acao "marca") escreve por cima quando tá ligada. */
(function(){
  'use strict';
  const C = window.Corre, M = C.labMotor;
  const NT = {
    comida: ['a casa de lanche', 'lanche', 'quem tem fome', 'a chapa quente', 'comida de verdade, rápida e quente'],
    cafe: ['o café', 'café', 'quem acorda cedo', 'o cheiro de pão saindo', 'a pausa boa do dia'],
    doces: ['a doceria', 'doce', 'quem merece um agrado', 'a bancada de confeitar', 'o pedaço que salva o dia'],
    bebidas: ['o bar', 'drink', 'quem ainda não quer ir pra casa', 'o balcão', 'a noite começando do jeito certo'],
    beleza: ['o salão', 'cuidado', 'quem quer se ver diferente', 'a cadeira', 'sair melhor do que entrou'],
    moda: ['a marca', 'roupa', 'quem se veste pra dizer alguma coisa', 'a rua', 'roupa com assunto'],
    fitness: ['o treino', 'movimento', 'quem quer ir além', 'o chão do treino', 'mais fôlego e mais força'],
    saude: ['a clínica', 'cuidado', 'quem precisa de atenção de verdade', 'o consultório', 'cuidado de perto'],
    pet: ['o pet', 'cuidado de bicho', 'quem tem bicho em casa', 'o rabo abanando', 'bicho feliz e dono tranquilo'],
    casa: ['a casa', 'obra', 'quem tá construindo um lugar', 'a obra', 'casa bem feita, sem dor de cabeça'],
    tech: ['a tecnologia', 'solução', 'quem tem pressa de resolver', 'a tela', 'o difícil ficando simples'],
    criativo: ['o estúdio', 'imagem', 'quem quer ser visto', 'o set', 'imagem que para o dedo'],
    musica: ['o som', 'música', 'quem vive de ouvido', 'o palco', 'som que fica na cabeça'],
    educacao: ['a escola', 'aula', 'quem quer aprender de verdade', 'a sala', 'aprender sem medo'],
    agro: ['a marca do campo', 'trabalho no campo', 'quem acorda antes do sol', 'a lavoura', 'campo produzindo mais'],
    auto: ['a oficina', 'estrada', 'quem não pode parar', 'a estrada', 'chegar inteiro e no horário'],
    servicos: ['o serviço', 'solução', 'quem precisa de alguém de confiança', 'o atendimento', 'problema resolvido de primeira'],
    varejo: ['a loja', 'compra', 'quem gosta de achar o que procura', 'a vitrine', 'achar fácil e levar feliz'],
    eventos: ['a festa', 'celebração', 'quem tem o que comemorar', 'a pista', 'noite pra lembrar'],
    arte: ['o ateliê', 'arte', 'quem quer carregar uma história', 'a bancada', 'arte que fica'],
    outro: ['a marca', 'trabalho', 'quem precisa', 'o balcão', 'trabalho bem feito']
  };
  const cap = s => s ? s[0].toLocaleUpperCase('pt-BR') + s.slice(1) : s;
  /* por território: [é, não é, fala assim, não fala, frases (tagline), manifesto, oi do WhatsApp] */
  const V = {
    rua: [['direta', 'de igual pra igual', 'com gíria na medida'], ['engomada', 'em cima do muro', 'cheia de termo técnico'],
      ['Chegou quente. Pode vir.', 'Hoje tem. Amanhã, só se der.', '{P}. Sem enrolação.'], ['Prezado cliente, informamos que…', 'Soluções inovadoras para o seu dia a dia.', 'Confira nossas ofertas imperdíveis!!!'],
      ['{N}. Sem rodeio.', 'Direto da rua pra {g}.', '{P}.', 'Feito pra quem não espera.', 'Do muro pro mundo.'],
      '{N} não pediu licença. Nasceu{em} no meio da rua, falando alto e entregando {p}. Aqui não tem cerimônia: tem {c} bem feito, preço que faz sentido e gente que conhece gente. Se é pra lembrar, que seja de longe. Se é pra voltar, que seja amanhã.',
      'Fala! Aqui é {o} {N}. Manda o que você quer que a gente já te responde.'],
    zine: [['crua', 'curiosa', 'feita à mão'], ['polida demais', 'corporativa', 'genérica'],
      ['Feito aqui, do zero, com o que tinha.', 'Menos anúncio, mais assunto.', 'Se não existe, a gente faz.'], ['Somos líderes de mercado.', 'Experiência premium e exclusiva.', 'A solução definitiva.'],
      ['{N}: faz você mesmo, faz bem feito.', 'Recortado à mão{em}.', 'Edição limitada todo dia.', '{P}, sem filtro.', 'Grampeado, xerocado, original.'],
      '{N} é cola, tesoura e intenção. Começou pequeno{em}, do jeito que dava, e continua assim de propósito: cada coisa feita por gente, pra gente. Não tem departamento de marketing; tem {c} com assunto. Se você entendeu, já faz parte.',
      'Oi! Aqui é {o} {N}. Conta o que você precisa que a gente responde de verdade, sem robô.'],
    arcade: [['brincalhona', 'rápida', 'nerd sem vergonha'], ['séria demais', 'lenta', 'complicada'],
      ['Player 2 entrou no jogo.', 'Fase nova liberada.', 'Combo: {p}.'], ['Atenciosamente, a diretoria.', 'Processo em análise.', 'Aguarde nosso retorno em até 30 dias úteis.'],
      ['Aperta start.', '{N}: nível {P2}.', 'Insert coin. {P}.', 'Fase bônus todo dia.', 'Ninguém joga sozinho.'],
      '{N} é o botão de start de {g}. Tem cor de fliperama, som de vitória e a regra mais simples do mundo: chegou, jogou, ganhou. Aqui {p} vem com recompensa. Pega a ficha, chama o player 2 e vem.',
      'Player 1 conectado! Aqui é {o} {N}. Diz o que você quer e a gente libera a próxima fase.'],
    gp: [['rápida', 'precisa', 'competitiva'], ['lenta', 'enrolada', 'insegura'],
      ['Largou, chegou.', 'Pit stop de 5 minutos.', '{P}: sai na frente.'], ['Assim que possível retornaremos.', 'Prazo a combinar.', 'Pedimos a gentileza de aguardar.'],
      ['{N}. Rápido no nome.', 'Largada {em2}.', 'Do pit stop pra sua mão.', '{P}, na pole.', 'Bandeira quadriculada pra fome.'],
      '{N} corre. Não por pressa, por respeito: o tempo de {g} vale ouro. Equipe afinada, pit stop curto e {p} chegando na frente. Cada detalhe é volta rápida. No fim, quem ganha o pódio é quem tava esperando.',
      'Largada! Aqui é {o} {N}. Manda o pedido que a gente já acelera.'],
    editorial: [['calma', 'precisa', 'elegante'], ['barulhenta', 'apressada', 'exagerada'],
      ['Pensado com calma, feito pra durar.', 'Nem tudo precisa ser pra ontem.', '{P}, no detalhe.'], ['IMPERDÍVEL!!!', 'Só hoje, corre!', 'O melhor do Brasil.'],
      ['{N}. Pra ler devagar.', '{P}, com tempo.', 'O detalhe é a história.', 'Feito com atenção{em}.', 'Menos, e melhor.'],
      '{N} acredita que pressa é inimiga do bom. Por isso cada {c} é pensado como uma página de revista: com respiro, com ritmo, com intenção. É pra {g} que repara. Que lê a legenda inteira. Que volta pela segunda vez.',
      'Olá, que bom ter você aqui. Aqui é {o} {N}. Me conta o que procura e eu te ajudo com calma.'],
    noir: [['misteriosa', 'segura', 'cinematográfica'], ['explicada demais', 'colorida demais', 'apressada'],
      ['A luz acende às oito.', 'Nem todo mundo conhece. Quem conhece, volta.', '{P}. Em cartaz.'], ['Venha conferir nossas promoções!', 'Atendimento de qualidade.', 'Preço baixo é aqui!'],
      ['{N}. Em cartaz.', 'Toda noite tem uma cena.', '{P}, a portas fechadas.', 'Entre. A sessão já começou.', 'Pra quem sabe onde fica.'],
      '{N} é cena. Luz baixa, som certo e uma porta que não precisa de placa grande. {Cp} aqui tem roteiro: entrada, clímax e o final que você leva pra casa. Quem conhece, indica baixinho. Quem chega, entende na primeira cena.',
      'Boa noite. Aqui é {o} {N}. Diga o que procura e eu preparo tudo.'],
    selo: [['acolhedora', 'honesta', 'de origem'], ['industrial', 'fria', 'apressada'],
      ['Feito hoje cedo, do jeito de sempre.', 'A receita é a mesma. O carinho também.', '{P}, com assinatura.'], ['Produto de alta performance.', 'Tecnologia de ponta.', 'Escalável e disruptivo.'],
      ['{N}: feito à mão, assinado embaixo.', 'Origem garantida{em}.', '{P}, de verdade.', 'Receita de casa, padrão de casa.', 'Desde sempre, pra sempre.'],
      '{N} carrega a assinatura de quem faz. Nada sai daqui sem passar pela mão, pelo olho e pelo cheiro. {Cp} tem origem, tem nome e tem história{em}. O selo não é enfeite: é promessa. Se tá marcado, tá do jeito certo.',
      'Oi, tudo bem? Aqui é {o} {N}. Me diz o que você precisa que eu separo com carinho.'],
    manuscrito: [['carinhosa', 'próxima', 'delicada'], ['distante', 'robótica', 'genérica'],
      ['Escrevi seu nome com cuidado.', 'Feito pensando em você.', '{P}, com um bilhete.'], ['Prezado(a) consumidor(a),', 'Seu protocolo é 0001234.', 'Aproveite agora!!!'],
      ['{N}, escrito à mão.', 'De perto, com carinho.', '{P}.', 'Cada detalhe tem assinatura.', 'Feito pra você.'],
      '{N} é aquele bilhete que vem junto do pedido. Escrito à mão, com o seu nome, sem pressa. A gente acredita que {c} bom começa no cuidado e termina num sorriso. Cada entrega é pessoal. Cada cliente vira história.',
      'Oi, que alegria seu contato! Aqui é {o} {N}. Me conta como posso deixar seu dia mais bonito?'],
    bauhaus: [['clara', 'inventiva', 'organizada'], ['bagunçada', 'decorativa sem motivo', 'confusa'],
      ['Forma segue função. A gente segue você.', 'Simples é difícil. A gente faz.', '{P}, em três passos.'], ['Inovação disruptiva de vanguarda.', 'Venha viver essa experiência única!', 'Somos diferenciados.'],
      ['{N}: forma, cor e função.', 'Do jeito do bairro{em}.', '{P}, bem montado.', 'Cada peça no lugar.', 'Simples de usar, bonito de ver.'],
      '{N} monta tudo como um cartaz bem feito: cada peça no lugar, cada cor com função. Sem enfeite que não ajuda, sem regra que atrapalha. É {c} pensado pra {g}, com a clareza de quem desenha antes de construir.',
      'Oi! Aqui é {o} {N}. Me diz o que você precisa em uma frase que a gente monta o resto.'],
    sinal: [['clara', 'calma', 'precisa'], ['barulhenta', 'confusa', 'exagerada'],
      ['Resolvido em poucos passos.', 'Você pergunta, a gente responde.', '{P}, sem ruído.'], ['Não perca essa oportunidade única!!!', 'Clique, compartilhe, marque 3 amigos!', 'Revolucionário!'],
      ['{N}. Menos ruído.', '{P}, com clareza.', 'Simples assim.', 'O essencial, bem feito.', 'Sinal aberto pra você.'],
      '{N} existe pra tirar o ruído do caminho. Menos etapa, menos letra miúda, menos espera. {Cp} aqui é desenhado pra funcionar sem manual. Pra {g}, isso vira tempo de volta. Pra gente, é o único jeito de fazer.',
      'Olá. Aqui é {o} {N}. Em que posso ajudar?'],
    classico: [['confiável', 'respeitosa', 'presente'], ['modinha', 'informal demais', 'instável'],
      ['Estamos aqui há anos e vamos continuar.', 'Pode confiar: a gente cuida.', '{P}, como sempre.'], ['Bora que bora!!!', 'Vem que tá bombando!', 'Hype total!'],
      ['{N}. O bairro inteiro conhece.', 'Tradição{em}.', '{P}, com confiança.', 'De geração pra geração.', 'Sempre por perto.'],
      '{N} é daqueles nomes que o bairro inteiro conhece. Não pela propaganda: pelo atendimento, pela palavra cumprida e pelo {c} feito do jeito certo, todo dia. Tem coisa que não sai de moda. Confiança é uma delas.',
      'Bom dia! Aqui é {o} {N}. Como podemos ajudar?'],
    chiclete: [['divertida', 'colorida', 'gulosa'], ['séria demais', 'cinza', 'chata'],
      ['Ai, que delícia!', 'Já pediu o seu hoje?', '{P}, com cobertura.'], ['Informamos que o atendimento será encerrado.', 'Prezado cliente,', 'Conforme normas vigentes…'],
      ['{N}: dá vontade de morder.', 'Felicidade em formato de {c}.', '{P}!', 'Pega um, leva dois.', 'Doce pra todo dia.'],
      '{N} é o lado colorido do dia. Tem cor de bala, cheiro de festa e aquela vontade boa de pedir mais um. {Cp} aqui é feito pra fazer {g} sorrir antes mesmo da primeira mordida.',
      'Oiii! Aqui é {o} {N}! Me conta o que vai ser hoje?']
  };
  const artigo = nome => /^(a|as)\b/i.test(nome) ? '' : /a$/i.test(String(nome).split(/\s+/)[0]) ? 'a' : 'o';
  M.vozLocal = sp => {
    const v = V[sp.territorio] || V.rua, nt = NT[sp.nicho] || NT.outro, N = sp.nome || 'Marca';
    const em = sp.cidade ? ' em ' + sp.cidade.split(',')[0].trim() : '', em2 = sp.cidade ? 'em ' + sp.cidade.split(',')[0].trim() : 'todo dia';
    const sub = s => s.replace(/\{N\}/g, N).replace(/\{P\}/g, cap(nt[4])).replace(/\{p\}/g, nt[4]).replace(/\{P2\}/g, cap(nt[1])).replace(/\{c\}/g, nt[1]).replace(/\{Cp\}/g, cap(nt[1]))
      .replace(/\{g\}/g, nt[2]).replace(/\{em\}/g, em).replace(/\{em2\}/g, em2).replace(/\{o\} /g, artigo(N) ? artigo(N) + ' ' : '');
    const taglines = v[4].map(sub);
    const t0 = String(sp.tagline || '').trim();
    const conceito = `${N} é ${nt[0]} que ${({ rua: 'fala a língua da rua', zine: 'faz do jeito dela, à mão', arcade: 'transforma cada visita em fase nova', gp: 'chega antes', editorial: 'trata cada detalhe como página de revista', noir: 'acontece à meia-luz', selo: 'assina embaixo do que faz', manuscrito: 'escreve à mão pra cada cliente', bauhaus: 'monta tudo com forma, cor e função', sinal: 'tira o ruído do caminho', classico: 'o bairro inteiro conhece', chiclete: 'dá vontade de morder' })[sp.territorio] || 'tem assunto'}.`;
    return {
      conceito, manifesto: sub(v[5]), taglines, e: v[0], nao_e: v[1], fala: v[2].map(sub), nao_fala: v[3],
      bio: (t0 || taglines[0]) + ' · ' + cap(nt[1]) + (sp.cidade ? ' em ' + sp.cidade.split(',')[0].trim() : '') + '. Chama no direct.',
      wa: sub(v[6]), ia: false
    };
  };

  /* v3.41 · AS PERSONAS de reserva (sem IA): o cliente ideal, por nicho, e a marca como gente, por território.
     Servem pra qualquer marca do nicho (ou do território): nada de número, preço ou marca. Gênero neutro de propósito:
     o apelido não diz se é ele ou ela, e o texto não marca. A IA da função "imagem" (acao "marca") escreve por cima. */
  const PB = {
    comida: { faixa: '20 a 40 anos', quem: 'sai do trabalho com fome e sem tempo, pede o lanche pelo WhatsApp no caminho e come no balcão ou no sofá, de olho no relógio',
      quer: ['Lanche que chega quente, do jeito que saiu da chapa', 'Pedir rápido, sem cardápio confuso nem vácuo no WhatsApp', 'Porção que mata a fome, sem miséria no prato'],
      dores: ['Lanche que chega frio, murcho e com a batata mole', 'Pedido que atrasa e ninguém dá notícia', 'Escolhe pelo cardápio do story e o item já acabou'],
      onde: ['Story do Instagram com a chapa ligada na hora da fome', 'WhatsApp do cardápio, salvo nos contatos', 'Cheiro de lanche na esquina, no caminho de casa'],
      decide: 'Volta quando o lanche chega quente, o pedido vem certo e quem atende lembra do jeito que a pessoa gosta, sem precisar repetir.', frase: 'Manda aquele de sempre e capricha no molho, que hoje o dia foi longo.' },
    cafe: { faixa: '25 a 55 anos', quem: 'acorda cedo, passa na padaria antes do trabalho atrás do pão quente e do café, e volta no meio da tarde pra uma pausa curta',
      quer: ['Café passado na hora, forte e sem gosto de queimado', 'Pão quentinho na hora em que passa, não só de manhã', 'Um canto pra sentar um pouco sem ninguém apressar'],
      dores: ['Café requentado na garrafa térmica parada desde cedo', 'Fila no balcão justo quando o tempo tá contado', 'Pão de ontem vendido como se fosse de hoje'],
      onde: ['Pelo cheiro na calçada, a caminho do trabalho', 'Story do Instagram avisando que a fornada saiu', 'WhatsApp pra encomendar o pão e o bolo do domingo'],
      decide: 'Volta pelo café que tem sempre o mesmo gosto, pelo pão que sai na hora certa e pelo bom dia de quem já sabe o pedido.', frase: 'Me vê um pingado e um pão na chapa, que sem isso o dia nem começa.' },
    doces: { faixa: '20 a 45 anos', quem: 'encomenda o bolo dos aniversários da família e do trabalho, e no meio da semana compra um doce só pra si, pra salvar um dia ruim',
      quer: ['Doce bonito na foto e melhor ainda na boca', 'Encomenda que chega no dia e na hora combinados', 'Recheio de verdade, sem aquele creme com gosto de margarina'],
      dores: ['Bolo que chega torto e nada parecido com a foto', 'Confeitaria que some do WhatsApp na semana da festa', 'Doce tão açucarado que enjoa antes de acabar o pedaço'],
      onde: ['Foto do bolo cortado no Instagram, recheio à mostra', 'Na mesa de uma festa, perguntando quem fez o bolo', 'WhatsApp pra fechar encomenda e mandar referência'],
      decide: 'Volta quando o doce sai igual à foto, a encomenda chega sem susto e quem faz responde rápido e lembra do sabor preferido da casa.', frase: 'Quero um bolo que todo mundo pergunte de onde veio e que acabe antes do parabéns.' },
    bebidas: { faixa: '21 a 40 anos', quem: 'sai do trabalho e chama a turma pelo WhatsApp, escolhe o bar pelo story da noite e fica no balcão até a conversa acabar',
      quer: ['Bebida trincando de gelada e drink feito com capricho', 'Lugar onde dá pra conversar sem gritar por cima do som', 'Petisco honesto pra dividir enquanto a noite rende'],
      dores: ['Cerveja que chega morna e drink aguado de tanto gelo', 'Copo vazio na mesa e ninguém passando pra ver', 'Conta que chega com item que ninguém pediu'],
      onde: ['Story do Instagram mostrando a casa cheia na sexta', 'Convite da turma no grupo do WhatsApp', 'Na calçada, vendo o balcão aceso e a mesa rindo'],
      decide: 'Volta quando a bebida chega no ponto, quem tá no balcão lembra do pedido e a conta fecha sem surpresa no fim da noite.', frase: 'Só mais uma pra fechar a semana e depois eu vou embora. Juro.' },
    beleza: { faixa: '20 a 50 anos', quem: 'encaixa o horário do salão entre o trabalho e a casa, marca pelo WhatsApp e passa a semana salvando foto de referência no Instagram',
      quer: ['Sair da cadeira com o que pediu, não com o que inventaram', 'Horário marcado que é cumprido, sem chá de cadeira', 'Alguém que olha, escuta e diz com sinceridade o que fica bom'],
      dores: ['Corte que fica bom no salão e desanda na lavada em casa', 'Serviço feito correndo porque já tem gente esperando', 'Produto empurrado no fim do atendimento sem ter pedido'],
      onde: ['Antes e depois no Instagram de alguém conhecido', 'Indicação de quem mudou o visual e chamou atenção', 'WhatsApp pra marcar e remarcar horário'],
      decide: 'Volta pela mão de quem atende, pela agenda que anda no horário e pela conversa boa na cadeira, que faz a hora passar rápido.', frase: 'Pode mexer, só não faz nada que eu vá me arrepender amanhã.' },
    moda: { faixa: '18 a 35 anos', quem: 'monta o look pensando no rolê e no story, garimpa peça no Instagram de madrugada e compra quando a marca responde rápido no direct',
      quer: ['Peça com ideia por trás, não só estampa da moda', 'Não cruzar com a mesma roupa no mesmo rolê', 'Tabela de medida que bate, pra acertar sem provar'],
      dores: ['Malha fina que desbota e torce a costura na lavagem', 'Drop que esgota antes de o direct ter resposta', 'Foto bonita que não mostra como a peça cai no corpo'],
      onde: ['Post de lançamento no Instagram, com aviso no story', 'Na rua, vendo a peça em alguém do rolê', 'Direct e WhatsApp pra tirar dúvida de tamanho'],
      decide: 'Volta quando a peça tem assunto, o caimento é o da foto e a marca trata quem compra como parte da turma, não como pedido.', frase: 'Quero uma peça que faça alguém me parar na rua pra perguntar de onde é.' },
    fitness: { faixa: '18 a 45 anos', quem: 'encaixa o treino antes ou depois do trabalho, chega de fone e com uma meta na cabeça, e manda print do progresso no grupo da turma',
      quer: ['Treino que cabe na rotina e mostra evolução, semana a semana', 'Alguém que corrija a execução, não só conte repetição', 'Começar do zero sem ninguém olhando torto'],
      dores: ['Academia lotada justo na única hora que sobra no dia', 'Ficha igual pra todo mundo, sem olhar pra quem treina', 'Equipe que só aparece pra oferecer plano novo'],
      onde: ['Vídeo de treino no Instagram, salvo pra testar depois', 'Convite de alguém do trabalho pra treinar junto', 'Passando na frente e ouvindo o som lá de dentro'],
      decide: 'Volta quando sente o corpo responder, a equipe chama pelo nome e o treino muda antes de virar rotina chata.', frase: 'Hoje não tô com vontade nenhuma, mas eu vou, porque depois eu agradeço.' },
    saude: { faixa: '28 a 55 anos', quem: 'encaixa a consulta no almoço ou no fim do expediente, marca pelo WhatsApp entre uma tarefa e outra e chega já de olho no relógio',
      quer: ['Hora marcada que é cumprida, sem sala de espera lotada', 'Alguém que explique sem pressa e sem palavra difícil', 'Mensagem lembrando da consulta e do retorno'],
      dores: ['Consulta que termina antes da dúvida terminar', 'Recepção que não atende o telefone nem responde mensagem', 'Descobrir quanto custa só na hora de pagar'],
      onde: ['Indicação de alguém da família ou do trabalho', 'Instagram, em post que tira dúvida de verdade', 'WhatsApp da recepção, pra marcar e confirmar'],
      decide: 'Escolhe quem chama pelo nome, explica com calma e lembra do retorno. Volta porque é cuidado de perto, não senha no balcão.', frase: 'Só quero alguém que me escute até o fim e me diga o que fazer depois.' },
    pet: { faixa: '22 a 45 anos', quem: 'acorda com o bicho pedindo comida, passeia antes do trabalho e chama o pet shop no WhatsApp quando a ração acaba ou o pelo passa do ponto',
      quer: ['Gente que chama o bicho pelo nome e tem paciência', 'Foto do bicho no meio do banho, pra ficar em paz', 'Ração e petisco entregues antes de acabar em casa'],
      dores: ['Buscar o bicho com medo no olho e a tosa diferente do pedido', 'Ração que acaba no domingo à noite, com tudo fechado', 'Banho e tosa no esquema de esteira, sem olhar pro bicho'],
      onde: ['Na calçada, passeando com o bicho pelo bairro', 'Instagram, na foto do bicho de cliente saindo do banho', 'Indicação no grupo de WhatsApp do bairro'],
      decide: 'Escolhe o lugar onde o bicho entra abanando o rabo, não arrastado. Volta porque recebe foto, recado e o bicho cheiroso na hora certa.', frase: 'Bicho aqui é da família. Cuidou bem, ganhou cliente pra vida toda.' },
    casa: { faixa: '28 a 55 anos', quem: 'passa a semana no trabalho e o sábado na obra ou visitando imóvel, com o celular cheio de foto, medida anotada e orçamento pra comparar',
      quer: ['Orçamento claro, por escrito, sem item escondido', 'Prazo cumprido, ou aviso antes quando for atrasar', 'Obra limpa no fim do dia, sem entulho na calçada'],
      dores: ['Profissional que some no meio da obra e não atende mais', 'Orçamento que cresce depois que a parede já tá aberta', 'Material comprado errado e a obra parada esperando'],
      onde: ['Placa no tapume de obra do bairro', 'Indicação de quem mora perto e acabou de reformar', 'Instagram, em vídeo de antes e depois'],
      decide: 'Escolhe quem manda orçamento detalhado e aparece no dia combinado. Volta e indica quando a obra acaba no prazo e sem sujeira pra trás.', frase: 'Só quero alguém que fale a verdade sobre o prazo e não suma no meio da obra.' },
    tech: { faixa: '25 a 50 anos', quem: 'toca o próprio negócio ou passa o dia no computador e perde tempo com sistema travado, planilha remendada e senha que ninguém lembra',
      quer: ['Resolver sem precisar entender termo técnico', 'Suporte que responde no WhatsApp, não num chamado eterno', 'Ferramenta que funciona no celular, sem manual'],
      dores: ['Sistema que trava justo na hora de fechar o caixa', 'Pagar por ferramenta que ninguém da equipe sabe usar', 'Suporte que fala difícil e some depois de instalar'],
      onde: ['Indicação de quem já usa e não reclama', 'Instagram, em vídeo curto mostrando a tela', 'WhatsApp, quando o problema aperta no meio do dia'],
      decide: 'Escolhe quem resolve na primeira conversa e explica em português. Volta porque o problema não repete e alguém responde quando chama.', frase: 'Não quero aprender programação, quero que funcione amanhã cedo.' },
    criativo: { faixa: '22 a 40 anos', quem: 'toca o negócio e o Instagram ao mesmo tempo, fotografa o produto no celular na luz que dá e sente que o perfil não mostra o que entrega',
      quer: ['Foto e vídeo com cara própria, longe de banco de imagem', 'Material pronto pro feed, pros stories e pro WhatsApp', 'Direção na hora: onde ficar, o que vestir, pra onde olhar'],
      dores: ['Perfil bonito de longe e igual a todo mundo de perto', 'Travar na frente da câmera e sair com cara de foto de documento', 'Receber arquivo atrasado e no tamanho errado pra postar'],
      onde: ['Instagram, no portfólio e nos bastidores', 'Indicação de quem já fez ensaio e postou', 'Crédito na legenda de post de outra marca'],
      decide: 'Escolhe quem mostra bastidor, entende o negócio antes de clicar e entrega no prazo. Volta quando o post novo faz gente perguntar quem fez.', frase: 'Eu sei fazer o que eu faço. Só não tô sabendo mostrar.' },
    musica: { faixa: '18 a 40 anos', quem: 'trabalha de dia, ensaia à noite e passa o fim de semana entre show pequeno, estúdio de ensaio e fone no ouvido no caminho de casa',
      quer: ['Som que soa bem no fone, no carro e na caixinha', 'Gente do meio que entende a ideia sem precisar desenhar', 'Estúdio com horário que encaixa depois do expediente'],
      dores: ['Gravar, mixar e no fim soar diferente do que tava na cabeça', 'Cabo chiando e retorno ruim derrubando o ensaio inteiro', 'Gente que trata música como passatempo e não leva a sério'],
      onde: ['Na saída de show, no boca a boca do público', 'Instagram, em vídeo curto de ensaio ou gravação', 'Indicação de quem divide palco ou estúdio'],
      decide: 'Escolhe quem tem ouvido de verdade e mostra trabalho que soa bem. Volta porque sai com o som do jeito que imaginou, ou melhor.', frase: 'Quero chegar com a ideia na cabeça e sair com o som tocando no fone.' },
    educacao: { faixa: '18 a 45 anos', quem: 'trabalha o dia todo e estuda no que sobra: à noite, no ônibus ou no sábado de manhã, atrás de algo que dê pra usar logo',
      quer: ['Aula que vai direto ao ponto e serve no dia seguinte', 'Tirar dúvida sem vergonha de perguntar o básico', 'Horário que respeita quem trabalha'],
      dores: ['Aula gravada sem ninguém pra responder quando a dúvida aparece', 'Conteúdo bonito no papel que não serve pra vida real', 'Medo de travar na frente da turma e passar vergonha'],
      onde: ['Indicação de colega que fez o curso e gostou', 'Instagram, em dica rápida que já resolve algo', 'Faixa ou cartaz na porta, no caminho de casa'],
      decide: 'Escolhe quem mostra aula de verdade antes de cobrar e responde dúvida rápido. Volta porque sente que aprendeu e já usa o que viu.', frase: 'Eu aprendo, só preciso de alguém que não faça pouco da minha dúvida.' },
    agro: { faixa: '30 a 55 anos', quem: 'levanta antes do sol, passa o dia entre lavoura, galpão e estrada de terra e resolve compra e peça pelo WhatsApp no intervalo do almoço.',
      quer: ['Quem entenda de safra, não só de catálogo', 'Resposta rápida quando a máquina para no meio da colheita', 'Entrega que chega na porteira, sem desculpa de estrada'],
      dores: ['Atendimento que some depois que a nota sai', 'Peça que atrasa justo na janela do plantio', 'Conselho de quem nunca pisou numa lavoura'],
      onde: ['WhatsApp, num áudio entre uma tarefa e outra', 'Indicação do vizinho de cerca ou da cooperativa', 'Dia de campo, feira agro e balcão da revenda'],
      decide: 'Escolhe quem fala a língua do campo, cumpre o prazo combinado e atende o telefone em domingo de colheita.', frase: 'Na roça não tem amanhã: se a máquina parou, eu preciso de ajuda é agora.' },
    auto: { faixa: '25 a 50 anos', quem: 'vive em cima do carro ou da moto pra trabalhar, entre entrega, cliente e trânsito, e só lembra da revisão quando o painel acende.',
      quer: ['Orçamento claro antes de mexer em qualquer coisa', 'Serviço feito no dia, sem o veículo parado à toa', 'Alguém que explique o defeito sem falar difícil'],
      dores: ['Cada dia com o veículo parado é dia sem trabalhar', 'Peça trocada sem avisar e conta que cresce no fim', 'Ficar na mão no meio do caminho, sem saber pra quem ligar'],
      onde: ['Placa na rua, no caminho de todo dia', 'Indicação de colega de rota ou de trabalho', 'WhatsApp, com vídeo do barulho e foto do painel'],
      decide: 'Volta onde o preço combinado é o preço cobrado, o prazo é cumprido e o veículo sai rodando redondo.', frase: 'Me fala quanto fica e quando fica pronto, que eu não posso ficar a pé.' },
    servicos: { faixa: '28 a 55 anos', quem: 'toca casa e negócio pequeno no braço, empurra o problema enquanto dá e só chama alguém de fora quando ele já tá travando o dia.',
      quer: ['Alguém que resolva de primeira, sem precisar chamar de novo', 'Prazo claro e preço combinado antes de começar', 'Explicação simples, sem termo técnico pra impressionar'],
      dores: ['Profissional que marca, não aparece e nem avisa', 'Orçamento que muda depois que o serviço começou', 'Ter que correr atrás pra saber em que pé tá'],
      onde: ['Indicação no grupo do prédio ou de quem já contratou', 'WhatsApp, pedindo orçamento antes de decidir', 'Instagram, conferindo trabalho entregue e comentário'],
      decide: 'Fica com quem aparece na hora, explica o que vai fazer, cumpre o combinado e deixa tudo funcionando.', frase: 'Eu só quero alguém que resolva e me avise, sem eu precisar ficar cobrando.' },
    varejo: { faixa: '22 a 45 anos', quem: 'resolve compra no intervalo do trabalho ou no caminho de casa e, antes de sair, pergunta no direct se tem do jeito que quer.',
      quer: ['Saber se tem antes de atravessar a cidade', 'Preço na foto, sem ter que perguntar', 'Troca fácil quando o presente não serve'],
      dores: ['Loja que responde o direct só no dia seguinte', 'Chegar lá e o produto da foto já ter acabado', 'Atendimento que não sabe o que tem no estoque'],
      onde: ['Vitrine na rua, passando a pé ou de ônibus', 'Instagram, nos stories de novidade e reposição', 'WhatsApp, separando o produto antes de ir buscar'],
      decide: 'Volta onde acha fácil o que procura, recebe resposta rápida e consegue trocar sem cara feia.', frase: 'Antes de sair de casa eu pergunto se tem. Se tiver, já separa que eu passo aí.' },
    eventos: { faixa: '25 a 45 anos', quem: 'organiza a comemoração no tempo que sobra do trabalho, com orçamento, lista de convidados e ideia salva do Instagram, tudo no celular.',
      quer: ['Uma festa com a cara de quem comemora, não de catálogo', 'Alguém que segure o dia pra poder curtir também', 'Orçamento fechado, sem item surpresa na conta final'],
      dores: ['Fornecedor que some bem perto da data', 'Passar a própria festa resolvendo pepino', 'Foto de divulgação que não bate com o que chega'],
      onde: ['Instagram, salvando foto da festa dos outros', 'Na festa de alguém, perguntando quem fez', 'WhatsApp, pedindo orçamento e mandando referência'],
      decide: 'Fecha com quem entende a ideia de primeira, cumpre o combinado e faz o dia acontecer sem dor de cabeça.', frase: 'No dia, eu quero estar na pista, não na cozinha resolvendo problema.' },
    arte: { faixa: '20 a 40 anos', quem: 'guarda referência no celular por meses, segue artista local no Instagram e só fecha quando sente que a peça conta a própria história.',
      quer: ['Uma peça que ninguém mais tem igual', 'Conversar com quem faz antes de fechar', 'Saber de onde veio a ideia e como foi feito'],
      dores: ['Trabalho bonito na foto e sem alma de perto', 'Artista que some no meio da encomenda', 'Prazo que estica sem ninguém dar notícia'],
      onde: ['Instagram, salvando trabalho no perfil de quem faz', 'Feira de rua, ateliê aberto e evento de arte', 'Indicação de quem mostrou a peça de perto'],
      decide: 'Escolhe quem escuta a ideia, mostra o rascunho antes de começar e entrega uma peça que dá gosto de mostrar anos depois.', frase: 'Eu não quero só bonito. Quero algo que tenha a ver comigo e que dure.' },
    outro: { faixa: '25 a 50 anos', quem: 'corre entre trabalho, casa e compromisso, decide quase tudo pelo celular e confia mais em indicação de conhecido do que em anúncio.',
      quer: ['Resposta rápida e direta, sem enrolação', 'Preço claro antes de fechar qualquer coisa', 'Um lugar de confiança pra voltar sem pensar'],
      dores: ['Mandar mensagem e ficar sem resposta', 'Promessa grande na foto e entrega pequena', 'Ter que explicar tudo de novo a cada contato'],
      onde: ['Indicação de gente conhecida, no boca a boca', 'Instagram, vendo se o perfil tá vivo e responde', 'WhatsApp, tirando dúvida antes de decidir'],
      decide: 'Fica com quem responde rápido, cumpre o que promete e trata cada cliente pelo nome.', frase: 'Se você me atende bem e faz direito, eu volto e ainda indico pra todo mundo.' }
  };
  const PM = {
    rua: { retrato: 'Se {N} fosse gente, tinha uns 25 anos, usava camiseta larga, tênis gasto e boné. Ouvia rap e samba no fone e passava o dia entre a esquina, o ponto de ônibus e a quadra do bairro.',
      jeito: ['Fala reto, com gíria na medida e sem termo difícil.', 'Cumprimenta meio bairro pelo nome no caminho.', 'Diz o que pensa na lata e nunca fica em cima do muro.'],
      gosta: ['lambe-lambe colado em tapume', 'letreiro pintado à mão em porta de aço', 'esquina com movimento até tarde'],
      com_o_cliente: 'Trata de igual pra igual: responde na hora, sem textão, e fala a real mesmo quando a resposta é não.', frase: 'Aqui ninguém precisa de cerimônia: chega, fala o que quer e sai resolvido.' },
    zine: { retrato: 'Se {N} fosse gente, tinha uns 20 e poucos anos, usava camiseta de serigrafia e mochila cheia de papel. Ouvia punk e rock de garagem e vivia entre a copiadora, a feira de impresso e o show de porão.',
      jeito: ['Faz com o que tem e mostra antes de ficar tudo perfeito.', 'Pergunta o porquê de tudo e anota no canto do caderno.', 'Recorta, cola, grampeia e assina cada coisa que solta.'],
      gosta: ['cópia saindo quente da máquina', 'grampeador de braço comprido', 'caderno cheio de recorte e rabisco'],
      com_o_cliente: 'Conversa como quem troca zine na porta do show: sem roteiro, com assunto e com vontade de saber o que a pessoa pensa.', frase: 'Prefiro uma coisa torta e verdadeira a uma perfeita e sem alma.' },
    arcade: { retrato: 'Se {N} fosse gente, tinha uns 25 anos, usava moletom com estampa de pixel e fone no pescoço. Ouvia trilha de videogame antigo e eletrônica e passava a noite no fliperama ou em torneio de bairro.',
      jeito: ['Transforma qualquer tarefa chata em fase com recompensa.', 'Responde rápido e explica a regra numa frase só.', 'Assume o lado nerd sem vergonha e chama todo mundo pra jogar junto.'],
      gosta: ['som de ficha caindo na máquina', 'placar de recorde piscando na tela', 'controle com fio e botão gasto'],
      com_o_cliente: 'Recebe quem chega como player 2: explica a regra rápido, comemora cada vitória e guarda uma fase bônus pra quem volta.', frase: 'Perdeu? Faz parte. Aqui todo mundo tem mais uma vida, e eu guardo o seu recorde.' },
    gp: { retrato: 'Se {N} fosse gente, tinha uns 30 anos, usava jaqueta de equipe, boné e relógio no pulso. Ouvia rock e eletrônica de batida rápida e vivia entre a pista, a garagem e a estrada.',
      jeito: ['Chega antes do combinado e já com tudo no jeito.', 'Mede o tempo de cada etapa e corta o que atrasa.', 'Compete limpo, comemora o pódio e já pensa na próxima volta.'],
      gosta: ['bandeira quadriculada balançando', 'cheiro de pneu quente na pista', 'cronômetro zerado antes da largada'],
      com_o_cliente: 'Respeita o tempo de quem espera: confirma rápido, avisa cada etapa e entrega antes do prazo, sem enrolação.', frase: 'Cada segundo conta, mas eu não troco o capricho por meia volta a menos.' },
    editorial: { retrato: 'Se {N} fosse gente, tinha uns 35 anos, usava camisa de linho e óculos de armação fina. Ouvia bossa nova e música de câmara baixinho e passava a tarde entre a livraria, a banca de revista e o café da esquina.',
      jeito: ['Escolhe cada palavra com calma e corta o que sobra.', 'Repara no detalhe que ninguém viu e arruma sem alarde.', 'Faz menos coisa e capricha em cada uma.'],
      gosta: ['papel encorpado com cheiro de livro novo', 'revista folheada devagar no domingo', 'margem larga e fio fino na página'],
      com_o_cliente: 'Escuta até o fim antes de responder, explica com calma e lembra do que a pessoa gostou da última vez.', frase: 'Gosto de quem repara no detalhe. É pra essa gente que eu acerto a última vírgula.' },
    noir: { retrato: 'Se {N} fosse gente, tinha uns 35 anos, usava roupa preta bem cortada e casaco nos ombros. Ouvia jazz e trilha de cinema e só aparecia à noite, entre o cinema de rua e o bar de porta fechada.',
      jeito: ['Fala pouco, em voz baixa, e todo mundo presta atenção.', 'Mostra só metade e deixa o resto pra curiosidade.', 'Chega sem pressa e sabe exatamente onde bate a luz.'],
      gosta: ['luz de abajur num canto escuro', 'chiado de projetor antes do filme', 'porta sem placa que só quem sabe acha'],
      com_o_cliente: 'Recebe à meia-luz, indica sem explicar demais e deixa a pessoa descobrir o resto no tempo dela.', frase: 'Não conto tudo de uma vez. Chega mais perto, que a melhor parte vem depois.' },
    selo: { retrato: 'Se {N} fosse gente, tinha uns 45 anos, usava avental de lona e manga arregaçada. Ouvia choro e samba antigo no rádio da bancada e acordava cedo pra ir à feira e ao armazém de sempre.',
      jeito: ['Faz do jeito de sempre e não pula etapa pra ganhar tempo.', 'Passa tudo pela mão e pelo olho antes de entregar.', 'Assina embaixo do que faz e conta de onde veio cada coisa.'],
      gosta: ['papel pardo amarrado com barbante', 'carimbo com a tinta falhando na borda', 'pote de vidro com etiqueta escrita à mão'],
      com_o_cliente: 'Separa o pedido com carinho, embrulha no papel pardo e já sabe o de sempre de quem volta toda semana.', frase: 'Antes de sair daqui, passa pela minha mão. É assim que eu sei que tá pronto.' },
    manuscrito: { retrato: 'Se {N} fosse gente, tinha uns 30 anos, usava camisa de algodão, cardigã e caneta sempre no bolso. Ouvia MPB e folk acústico baixinho e passava a tarde entre a papelaria, o ateliê e a floricultura.',
      jeito: ['Escreve o nome de cada cliente com letra caprichada.', 'Lembra de data, de preferência e do recado que ficou.', 'Embrulha devagar e sempre deixa um bilhete junto.'],
      gosta: ['papel de carta com fibra aparente', 'laço de fita feito sem pressa', 'caneta de tinta que desliza no papel'],
      com_o_cliente: 'Responde como quem escreve carta: pergunta como foi o dia, lembra do último pedido e põe o nome da pessoa no pacote.', frase: 'Lembro do seu nome, do seu pedido e daquele detalhe que você comentou uma vez.' },
    bauhaus: { retrato: 'Se {N} fosse gente, tinha uns 30 anos, usava macacão de cor forte e lápis atrás da orelha. Ouvia eletrônica minimalista e pop de sintetizador e circulava entre a oficina, a escola de arte e a padaria do bairro.',
      jeito: ['Desenha antes de construir e confere a medida antes de cortar.', 'Tira o enfeite que não ajuda e deixa só o que funciona.', 'Arruma a bagunça dos outros sem fazer sermão.'],
      gosta: ['régua, compasso e papel quadriculado', 'cartaz de cores puras colado no muro', 'prateleira onde cada coisa tem lugar'],
      com_o_cliente: 'Ouve o problema em uma frase, desenha a saída na frente da pessoa e explica cada passo sem complicar.', frase: 'Se um enfeite não ajuda em nada, eu tiro. O que fica tem motivo pra estar ali.' },
    sinal: { retrato: 'Se {N} fosse gente, tinha uns 30 anos, usava camiseta lisa, tênis branco e relógio discreto. Ouvia lo-fi e som ambiente no fone e andava por lugar claro: biblioteca, mesa de janela e parque no fim do dia.',
      jeito: ['Responde em poucas palavras e sem letra miúda.', 'Corta etapa à toa até sobrar só o que precisa.', 'Mantém a calma quando todo mundo tá correndo.'],
      gosta: ['mesa vazia e luz de janela', 'ícone que se entende sem legenda', 'placa que aponta o caminho certo'],
      com_o_cliente: 'Resolve em poucos passos: pergunta só o que precisa, avisa o que vem depois e devolve o tempo de quem procurou.', frase: 'Uma resposta clara vale mais que três parágrafos bonitos. Pergunta, que eu digo.' },
    classico: { retrato: 'Se {N} fosse gente, tinha uns 50 e poucos anos, usava camisa passada, sapato engraxado e molho de chave no cinto. Ouvia samba-canção e MPB das antigas no rádio e passava todo dia pela praça, pela padaria e pela feira.',
      jeito: ['Abre sempre no mesmo horário e cumpre a palavra dada.', 'Conhece cada cliente pelo pedido de sempre.', 'Muda devagar, só quando a mudança faz sentido.'],
      gosta: ['placa de bronze polida na porta', 'aperto de mão que fecha negócio', 'calçada varrida antes de abrir a porta'],
      com_o_cliente: 'Atende com respeito e sem pressa: cumpre o combinado, dá satisfação de tudo e trata quem volta como gente da casa.', frase: 'Aperto de mão e palavra cumprida. O resto a gente resolve conversando.' },
    chiclete: { retrato: 'Se {N} fosse gente, tinha uns 20 anos, usava roupa de cor viva, pochete e meia colorida. Ouvia pop e disco no último volume e vivia entre a sorveteria, o parque de diversões e as festas de aniversário.',
      jeito: ['Ri alto, puxa conversa e transforma fila em festa.', 'Inventa uma cor nova ou uma brincadeira por dia.', 'Pede mais um sem culpa e divide com quem tá do lado.'],
      gosta: ['confete caindo no meio da festa', 'bala de goma de todas as cores', 'embalagem que dá pena de abrir'],
      com_o_cliente: 'Recebe com festa: conta a novidade do dia, ajuda a escolher sem pressa e sempre arruma um agrado pra quem volta.', frase: 'Se for pra escolher entre sério e divertido, eu fico com os dois, com granulado.' }
  };
  const APELIDOS = ['Rafa', 'Dani', 'Duda', 'Alex', 'Cris', 'Lu', 'Fê', 'Sam', 'Jô', 'Val'];
  const ponto = s => String(s || '').trim().replace(/[.\s]+$/, '');
  M.personas = sp => {
    sp = sp || {};
    const b = PB[sp.nicho] || PB.outro, g = PM[sp.territorio] || PM.rua, N = sp.nome || 'A marca', cid = sp.cidade ? String(sp.cidade).split(',')[0].trim() : '';
    /* o apelido sai do nome e do nicho da marca: muda de marca pra marca, mas não muda a cada vez que abre */
    const r = M.rng(M.hash([sp.nome || '', sp.nicho || ''].join(':')) || 1), nome = APELIDOS[Math.floor(r() * APELIDOS.length) % APELIDOS.length];
    const ar = M.arquetipo(sp.pers || [.5, .5, .5, .5, .5]);
    return {
      buyer: { nome, perfil: `${b.faixa}${cid ? ', ' + cid : ''}. ${cap(ponto(b.quem))}.`, quer: b.quer.slice(), dores: b.dores.slice(), onde: b.onde.slice(), decide: b.decide, frase: b.frase },
      brand: { retrato: g.retrato.replace(/\{N\}/g, N), jeito: g.jeito.slice(), gosta: g.gosta.slice(), com_o_cliente: g.com_o_cliente, frase: g.frase, arquetipo: ar.n }
    };
  };
})();

/* ---------------- CONCEITOS: o texto que explica cada parte do brandbook (naming, logo, tipografia, cores, elementos
   e aplicações). É o texto de reserva, montado das escolhas da marca; a IA (acao "marca") pode reescrever por cima. ---------------- */
(function(){
  'use strict';
  const C = window.Corre, M = C.labMotor, T = M.TERRITORIOS;
  const GESTO = {
    '': () => 'O nome entra limpo, sem truque: a força tá no desenho da letra e no espaço entre elas.',
    destaque: sp => { const q = sp.logo && sp.logo.destaque; return `${q === 'vogal' ? 'Uma vogal' : q === 'ultima' ? 'A última letra' : 'A primeira letra'} muda de cor e vira o ponto de atenção: é ali que o olho pousa primeiro, e é ela que vira atalho da marca nas peças pequenas.`; },
    troca: sp => {
      if(!/[oO0ºÓÒÔÕÖóòôõö]/.test(sp.nome || '')) return GESTO.destaque(sp);
      const por = (sp.logo && sp.logo.trocaPor) || 'circulo';
      if(por === 'ideia' && sp.simbolo && M.IDEIAS[sp.simbolo.ideia]){ const id = M.IDEIAS[sp.simbolo.ideia]; return `O "O" do nome vira ${id.n.toLowerCase()}: ${id.t}. A palavra continua lendo igual, mas carrega o símbolo dentro dela; o nome sozinho já é a marca inteira.`; }
      return `O "O" do nome vira ${por === 'anel' ? 'um anel, como um holofote aceso no meio da palavra' : por === 'alvo' ? 'um alvo, círculo dentro de círculo' : por === 'icone' ? 'o próprio ícone da marca, dentro de um círculo' : 'um círculo perfeito, cheio, na cor de acento'}: a palavra continua lendo igual, mas ganha um símbolo escondido dentro dela.`;
    },
    empilha: () => 'As palavras sobem uma em cima da outra, na mesma largura, como letreiro pintado: o bloco vira um carimbo compacto que cabe em qualquer canto.',
    estencil: () => 'As letras ganham as pontes do molde de estêncil onde ele cortaria de verdade: no miolo do A, do P e do O, e rente à haste do E e do H. Cada letra fica de pé, e a marca já nasce com cara de spray, de caixote de feira, de pintura de muro.',
    recorte: () => 'Cada letra vem num pedaço de papel recortado, de cor e ângulo diferentes, como bilhete montado com letra de revista: impossível confundir com outra marca.',
    pulo: () => 'As letras pulam fora da linha, uma pra cima, outra pra baixo: a marca tem ritmo, parece que tá dançando.',
    bolha: () => 'Uma bolha de cor estoura no fim do nome, como chiclete: a marca termina num sorriso.',
    hierarquia: sp => { const pt = M.partes(sp.nome || ''); return `O nome próprio (${pt.proprio}) vem grande; o que a marca faz (${pt.descritor ? pt.descritor.toLowerCase() : 'o resto'}) vem pequeno, em caixa alta, na letra de texto. É hierarquia de capa de revista: o olho guarda o nome e entende o ofício de passagem.`; },
    pesos: sp => { const pt = M.partes(sp.nome || ''); return `O nome vem em dois pesos da mesma família: o próprio (${pt.proprio}) na letra forte, o resto na leve. A troca de peso diz o que é nome e o que é ofício sem precisar de mais nada.`; },
    separador: sp => /(^|\s)&(\s|$)/.test(sp.nome || '') ? 'O "&" do nome vira o sinal da marca, pintado na cor de destaque: é ele que junta os dois lados, e o olho para ali.' : ({ '/': 'Uma barra entre o nome e o ofício, como em placa de rua e etiqueta de roupa: o nome vira endereço.', '_': 'Um sublinhado entre o nome e o ofício, como nome de arquivo e de comando: a marca fala a língua de quem programa.', '.': 'Um ponto entre o nome e o ofício: cada parte vira uma afirmação.', '·': 'Um ponto no meio entre o nome e o ofício, como letreiro de bar e crédito de filme: a separação vira charme.', '—': 'Um travessão entre o nome e o ofício, como título de capítulo: a marca ganha pausa e respiro.', '+': 'Um sinal de mais entre o nome e o ofício, como colagem: a marca é uma soma.' })[(sp.logo && sp.logo.sep) || '/'] + ' O sinal é o da própria letra, então pesa igual a ela.',
    velocidade: () => 'Três rastros saem de trás do nome, do mais comprido ao mais curto, com a grossura da própria letra: a marca já aparece andando, como carro passando na reta.',
    fios: sp => { const l = M.linhaFios(sp); return `Dois fios finos seguram o nome${l ? `, com ${/^desde /.test(l) ? 'o ano de fundação' : 'a cidade'} no meio do fio de baixo` : ''}, como cabeçalho de revista: é o desenho de quem tem história pra contar.`; },
    colchetes: () => 'Colchetes abraçam o nome, como anotação de quem edita: a marca parece um destaque marcado à mão no meio do texto.',
    ponto: () => 'Um ponto final fecha o nome: a marca termina a frase. É afirmação, não pergunta.',
    sublinha: () => 'Um traço sublinha o nome, como assinatura: é o gesto de quem escreve à mão e confirma o que escreveu.',
    encosta: () => 'As letras se encostam umas nas outras, no kerning ótico (medido na tinta, letra a letra): o nome vira um bloco só, como letreiro recortado numa chapa. Lê de longe e não parece fonte digitada.',
    corte: sp => `Um risco fino atravessa ${M.partes(sp.nome || '').proprio} na diagonal, como a navalha passando: o nome leva o corte que dá nome ao ofício, e só aparece onde corta letra.`,
    pendente: sp => ({ prumo: 'O prumo desce num fio da haste da letra: o nome vira a ferramenta que dá nome à marca, e a régua de quem faz direito fica pendurada nele.', tinta: 'Uma gota de tinta escorre do pé da letra, como da ponta da agulha: o nome já sai tatuado.' })[sp.logo && sp.logo.pende] || 'Uma gota pinga do pé da letra, como o café passando no coador: o conceito mora no próprio letreiro.',
    versalete: () => 'Cada palavra em maiúscula, com a primeira letra inteira e as outras em versalete: o letreiro de placa de bronze e de capa de livro. Nobre sem precisar de enfeite.',
    fiolado: () => 'O nome grande à esquerda, um fio em pé e o ofício pequeno do outro lado, com a cidade embaixo: a assinatura de escritório e de editora, alinhada como placa na porta.'
  };
  M.gestoTxt = sp => (GESTO[(sp.logo && sp.logo.gesto) || ''] || GESTO[''])(sp);
  const ARRANJO = {
    horizontal: 'Na assinatura principal o símbolo vai do lado do nome, na altura do bloco de texto: é a versão de fachada, cabeçalho de site e assinatura de e-mail.',
    vertical: 'Na assinatura principal o símbolo vem em cima e o nome embaixo, centralizados: é a versão de embalagem, cartaz e de tudo que é mais alto que largo.',
    wordmark: 'A assinatura principal é só o nome: a marca é a palavra.',
    simbolo: 'A assinatura principal é o símbolo sozinho.',
    selo: 'A assinatura principal é um selo redondo, com o nome girando em volta do desenho: vira carimbo, adesivo, etiqueta e tampa de embalagem sem mudar nada.',
    placa: 'A assinatura principal é uma placa: o nome numa chapa de cor sólida com um fio por dentro, como placa de rua. Lê de longe e vira sinalização da própria marca.'
  };
  M.ARRANJOS = { horizontal: 'Horizontal', vertical: 'Empilhado', wordmark: 'Só o nome', simbolo: 'Só o símbolo', selo: 'Selo', placa: 'Placa' };
  const EFEITO = { sombra: 'A sombra dura, deslocada pra baixo e pra direita, dá cara de adesivo e de letreiro em relevo.', inclinado: 'Tudo inclina 12 graus pra frente: a marca nunca fica parada.', contorno: 'O nome em contorno, vazado por dentro, como letreiro de neon apagado.', curvado: 'O nome se curva, como letreiro em arco.' };
  const TEXTURA = {
    xerox: 'grão de fotocópia: o preto que estoura e o cinza que some. É a textura do lambe e do fanzine, e faz a marca parecer impressa de verdade, mesmo na tela',
    scan: 'linhas de varredura de tela antiga: o brilho de fliperama e de monitor de tubo por cima das cores',
    xadrez: 'o quadriculado da bandeira de chegada, usado como fita e como fundo, nunca no lugar do logo',
    papel: 'fibra de papel bom: a marca respira como página impressa',
    grao: 'grão de filme: as cores ganham profundidade de cinema e o escuro fica aveludado',
    carimbo: 'tinta de carimbo falhando nas bordas: cada aplicação parece marcada à mão',
    grade: 'a grade de construção aparecendo como desenho: a marca mostra que foi feita com régua e compasso',
    limpo: 'nenhuma: o branco é o elemento. A marca ganha precisão e silêncio',
    reticula: 'retícula de impressão, os pontinhos de gibi e de embalagem antiga: dá cor de banca de jornal e humor'
  };
  M.TEXTURAS = { xerox: 'Xerox', scan: 'Varredura', xadrez: 'Quadriculado', papel: 'Papel', grao: 'Grão de filme', carimbo: 'Carimbo', grade: 'Grade', limpo: 'Limpa', reticula: 'Retícula' };
  const CLASSE = { sem: 'sem serifa', serifa: 'com serifa', manuscrita: 'manuscrita', mono: 'monoespaçada (cada letra ocupa o mesmo espaço)', pixel: 'em pixel' };
  const fmt = v => String(Math.round(v * 10) / 10).replace('.', ',');
  const nivel = r => r >= 7 ? 'passa no teste mais exigente de leitura (AAA)' : r >= 4.5 ? 'passa no teste de leitura pra texto (AA)' : r >= 3 ? 'serve pra título e letra grande' : 'fica só pra detalhe, nunca pra texto';
  M.nivelContraste = r => r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'AA grande' : '—';
  M.nomeLetra = fi => fi.id === 'pixel' ? 'Houzi Pixel (desenhada aqui no Studio)' : `${fi.k} (derivada da ${fi.o})`;
  /* sp = spec; nm = o naming (se teve); devolve { naming?, logo, tipografia, cores, elementos, aplicacoes }: cada um uma lista de parágrafos */
  M.conceitos = (sp, nm) => {
    const t = T[sp.territorio] || T.rua, c = sp.cores, L = sp.logo || {}, fi = M.fonteInfo(sp.tipo.display), ft = M.fonteInfo(sp.tipo.texto), cn = h => M.nomeCor(h, sp.nome);
    const rc = M.receitaDe(sp), arranjo = L.arranjo || 'horizontal', out = {};
    if(nm && nm.nome) out.naming = M.namingTxt(nm);
    out.logo = [t.ideia, M.gestoTxt(sp) + (EFEITO[L.efeito] ? ' ' + EFEITO[L.efeito] : ''), M.simboloTxt(sp) + ' ' + (ARRANJO[arranjo] || ARRANJO.horizontal)];
    const caixaTxt = L.caixa === 'alta' ? 'Em caixa alta: o nome vira bloco, cada letra com o mesmo peso.' : L.caixa === 'baixa' ? 'Em caixa baixa: mais simpática, mais perto, fala sem levantar a voz.' : 'Com a primeira letra de cada palavra em maiúscula: nome próprio, dito com respeito.';
    const track = Number(L.track) || 0, trackTxt = track >= 0.08 ? ' E com espaço aberto entre as letras: cada uma entra sozinha, com tempo.' : track <= -0.015 ? ' E com as letras apertadas, quase se tocando: o nome vira um bloco só.' : '';
    out.tipografia = [
      `A letra da marca é a ${M.nomeLetra(fi)}, uma letra ${CLASSE[fi.e] || ''}. ${t.porque.letra}`,
      caixaTxt + trackTxt,
      `Pro texto corrido (legenda, cardápio, site, orçamento) entra a ${M.nomeLetra(ft)}: ${ft.e === fi.e ? 'da mesma família de desenho, mais leve, pra ler sem cansar' : 'um contraponto calmo à letra do logo, feito pra ler em tamanho pequeno'}. Título na letra da marca, texto na de texto, e nunca mais de duas letras na mesma peça.`
    ];
    const rIP = M.contraste(c.ink, c.paper), rPP = M.contraste(c.p, c.paper), rPI = M.contraste(c.p, c.ink);
    out.cores = [
      (rc ? `A paleta se chama ${rc.n}: ${rc.h}. ` : '') + t.porque.cor.replace('{p}', cn(c.p)).replace('{s}', cn(c.s)).replace('{a}', cn(c.a)).replace('{ink}', cn(c.ink)),
      `Cada cor tem uma função. ${cn(c.p)} é a cor da marca: aparece primeiro e mais vezes. ${cn(c.s)} é a de apoio: fundo, faixa, segunda leitura. ${cn(c.a)} é o acento: pouco, no detalhe, onde precisa de atenção. ${cn(c.ink)} é a tinta de todo texto e ${cn(c.paper)} é o papel onde tudo respira. A proporção que segura a marca: 60% de papel, 25% da cor da marca, 10% de apoio e 5% de acento.`,
      `Texto em ${cn(c.ink)} sobre ${cn(c.paper)} dá ${fmt(rIP)}:1 de contraste e ${nivel(rIP)}. ${cn(c.p)} sobre ${cn(c.paper)} dá ${fmt(rPP)}:1 (${nivel(rPP)}); sobre ${cn(c.ink)}, ${fmt(rPI)}:1.`
    ];
    out.elementos = [t.elem, `A textura da marca é ${TEXTURA[sp.textura] || TEXTURA.limpo}.`, 'O símbolo vira padrão, repetido em grade, pra fundo de embalagem, papel de seda, forro de sacola e capa de destaque. E a tira de cores da capa é o DNA da marca: sai dos próprios parâmetros dela e não se repete em nenhuma outra.'];
    out.aplicacoes = [t.vive, 'Regra de bolso: no claro, a versão principal; no escuro, a negativa; em cima de foto ou de cor que briga, a versão de uma cor só. Em volta do logo, um respiro de pelo menos a altura da letra maiúscula do nome; e nunca menor que 24 pixels de altura na tela (ou 1,5 cm impresso).'];
    return out;
  };

  /* ---------------- NAMING: candidatos por estratégia, cada um com o porquê ---------------- */
  M.ESTRATEGIAS = {
    descritivo: { n: 'Descritivo', d: 'diz o que é na primeira leitura' }, evocativo: { n: 'Evocativo', d: 'não descreve: cria um clima' },
    inventado: { n: 'Inventado', d: 'uma palavra nova, só tua' }, origem: { n: 'De origem', d: 'puxa o lugar pro nome' }, giria: { n: 'Gíria', d: 'fala a língua da rua' },
    composto: { n: 'Composto', d: 'duas ideias numa palavra só' }, metafora: { n: 'Metáfora', d: 'uma imagem que conta a história' }, proprio: { n: 'Teu', d: 'veio de você' }
  };
  const semAc = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
  const cap = s => s ? s[0].toLocaleUpperCase('pt-BR') + s.slice(1) : s;
  M.handleDe = nome => semAc(nome).toLowerCase().replace(/&/g, 'e').replace(/[^a-z0-9]+/g, '').slice(0, 30);
  M.silabas = w => (semAc(w).toLowerCase().match(/[aeiouy]+/g) || []).length;
  const PROD = { comida: ['Lanches', 'Burger', 'Grill'], cafe: ['Café', 'Padaria', 'Cafeteria'], doces: ['Doceria', 'Confeitaria', 'Doces'], bebidas: ['Bar', 'Boteco', 'Drinks'],
    beleza: ['Studio', 'Salão', 'Estética'], moda: ['Ateliê', 'Store', 'Moda'], fitness: ['Club', 'Treino', 'Academia'], saude: ['Clínica', 'Saúde', 'Cuidado'], pet: ['Pet', 'Petshop', 'Vet'],
    casa: ['Obras', 'Imóveis', 'Construtora'], tech: ['Labs', 'Tech', 'Sistemas'], criativo: ['Studio', 'Filmes', 'Criativo'], musica: ['Records', 'Estúdio', 'Som'], educacao: ['Escola', 'Cursos', 'Aula'],
    agro: ['Agro', 'Campo', 'Sementes'], auto: ['Garagem', 'Auto', 'Express'], servicos: ['Soluções', 'Serviços', 'Consultoria'], varejo: ['Empório', 'Loja', 'Store'], eventos: ['Produções', 'Festas', 'Eventos'],
    arte: ['Ateliê', 'Tattoo', 'Arte'], outro: ['Studio', 'Casa', 'Co.'] };
  const ANTES = new Set(['Café', 'Padaria', 'Cafeteria', 'Doceria', 'Confeitaria', 'Bar', 'Boteco', 'Studio', 'Salão', 'Ateliê', 'Clínica', 'Escola', 'Garagem', 'Empório', 'Loja', 'Casa', 'Academia', 'Estúdio']);
  const RAIZ = { comida: ['Brasa', 'Chapa', 'Fome', 'Grelha', 'Smash', 'Lanchão', 'Fumaça', 'Tempero'], cafe: ['Grão', 'Torra', 'Coado', 'Fornada', 'Pausa', 'Xícara', 'Aroma'], doces: ['Calda', 'Granulado', 'Fornada', 'Açúcar', 'Cereja', 'Cobertura', 'Recheio'],
    bebidas: ['Balcão', 'Gole', 'Brinde', 'Saideira', 'Gelo', 'Esquina', 'Rodada'], beleza: ['Navalha', 'Espelho', 'Bossa', 'Laço', 'Seda', 'Cacho', 'Brilho'], moda: ['Costura', 'Avesso', 'Bainha', 'Estampa', 'Molde', 'Retalho', 'Trama'],
    fitness: ['Fôlego', 'Pulso', 'Arrancada', 'Base', 'Ritmo', 'Força', 'Suor'], saude: ['Cuidar', 'Pulso', 'Raiz', 'Vital', 'Abrigo', 'Alento'], pet: ['Focinho', 'Latido', 'Rabo', 'Bigode', 'Patota', 'Pelo', 'Patinha'],
    casa: ['Prumo', 'Tijolo', 'Esquadro', 'Alicerce', 'Viga', 'Telha', 'Planta'], tech: ['Sinal', 'Pixel', 'Código', 'Nuvem', 'Circuito', 'Bit', 'Rede'], criativo: ['Quadro', 'Foco', 'Lente', 'Corte', 'Cena', 'Traço', 'Take'],
    musica: ['Faixa', 'Grave', 'Agulha', 'Vinil', 'Batida', 'Eco', 'Compasso'], educacao: ['Lousa', 'Caderno', 'Rascunho', 'Saber', 'Giz', 'Recreio', 'Estudo'], agro: ['Safra', 'Sementeira', 'Colheita', 'Porteira', 'Roça', 'Terra Roxa', 'Lavoura'],
    auto: ['Rota', 'Embreagem', 'Pista', 'Motor', 'Estrada', 'Chave'], servicos: ['Ponto', 'Chave', 'Prumo', 'Feito', 'Certo', 'Atalho', 'Ofício'], varejo: ['Vitrine', 'Sacola', 'Balaio', 'Prateleira', 'Achado', 'Esquina', 'Vitrola'],
    eventos: ['Pista', 'Brinde', 'Confete', 'Festa', 'Salão', 'Serpentina', 'Palco'], arte: ['Agulha', 'Tinta', 'Traço', 'Pincel', 'Ateliê', 'Rabisco', 'Nanquim'], outro: ['Ponto', 'Esquina', 'Traço', 'Sinal', 'Feito', 'Ofício'] };
  M.RAIZ = RAIZ;
  /* os eixos da personalidade: [pólo de baixo, pólo de cima] (palavras e o que elas evocam) */
  const EVOCA = [
    [['Relíquia', 'Armazém', 'Oficina', 'Botica', 'Almanaque'], ['Vetor', 'Eixo', 'Órbita', 'Nexo', 'Módulo']],
    [['Prumo', 'Esteio', 'Norte', 'Pilar', 'Âncora'], ['Pipoca', 'Confete', 'Fuzuê', 'Xodó', 'Cafuné']],
    [['Sépia', 'Âmbar', 'Veludo', 'Marfim', 'Cristal'], ['Bamba', 'Raiz', 'Bonde', 'Resenha', 'Responsa']],
    [['Brisa', 'Remanso', 'Sereno', 'Maré', 'Orvalho'], ['Faísca', 'Turbo', 'Trovão', 'Arrancada', 'Rojão']],
    [['Tear', 'Barro', 'Alinhavo', 'Ofício', 'Fornalha'], ['Pixel', 'Código', 'Circuito', 'Rede', 'Sinal']]
  ];
  const SENTIDO = [['tradição e tempo', 'movimento e futuro'], ['firmeza e confiança', 'leveza e graça'], ['requinte e cuidado', 'bairro, turma e gente'], ['calma e respiro', 'energia e pressa boa'], ['mão, ofício e matéria', 'tecnologia e precisão']];
  const GIRIA = [['Firmeza', 'tá tudo certo, pode confiar'], ['Responsa', 'quem assume e entrega'], ['Resenha', 'a conversa boa entre amigos'], ['Quebrada', 'o bairro, a área, de onde a gente vem'], ['Bonde', 'a turma que anda junto'],
    ['Pique', 'disposição, energia'], ['Brabo', 'muito bom, acima da média'], ['Massa', 'bom demais'], ['Rolê', 'o passeio, a saída com a turma'], ['Trampo', 'o trabalho de todo dia'], ['Na Régua', 'tudo certo, alinhado'],
    ['Sossego', 'tranquilidade'], ['Xodó', 'o queridinho de todo mundo'], ['Chave', 'o que é bom, o que resolve'], ['Da Hora', 'bom, bacana']];
  const META = {
    rua: [['Lambe-Lambe', 'o cartaz colado na rua, que todo mundo vê'], ['Muro', 'onde a rua escreve'], ['Spray', 'a tinta de quem assina a cidade'], ['Esquina', 'onde tudo se encontra'], ['Calçada', 'o chão de quem passa']],
    zine: [['Grampo', 'o que segura o fanzine'], ['Recorte', 'o pedaço escolhido a dedo'], ['Xerox', 'a cópia que espalha a ideia'], ['Rascunho', 'a ideia ainda quente']],
    arcade: [['Start', 'o botão que começa o jogo'], ['Ficha', 'o que dá direito a mais uma'], ['Fase 2', 'o que vem depois de passar da primeira'], ['Combo', 'a sequência perfeita'], ['Pixel', 'o menor pedaço de toda imagem']],
    gp: [['Pole', 'a primeira posição do grid: quem larga na frente'], ['Box', 'onde o carro para rápido e sai melhor'], ['Largada', 'o começo de tudo, com o motor quente'], ['Volta Rápida', 'a melhor volta da corrida'], ['Pit Stop', 'a parada curta que resolve']],
    editorial: [['Edição', 'o que foi escolhido com cuidado'], ['Página', 'onde a história acontece'], ['Margem', 'o respiro em volta do que importa'], ['Capítulo', 'uma parte da história'], ['Rodapé', 'o detalhe que explica tudo']],
    noir: [['Meia-Luz', 'a luz baixa de quem sabe receber'], ['Sessão', 'o horário marcado da cena'], ['Contraluz', 'quando a sombra vira desenho'], ['Matinê', 'a sessão da tarde, de quem chega cedo'], ['Cena', 'o momento que fica']],
    selo: [['Fornada', 'o que sai do forno de uma vez'], ['Assinado', 'feito e garantido por quem fez'], ['Safra', 'a colheita do ano'], ['Lote', 'o que sai junto, numerado'], ['Origem', 'de onde vem']],
    manuscrito: [['Bilhete', 'o recado escrito à mão'], ['Laço', 'o que fecha o presente'], ['Dedicatória', 'a frase escrita pra alguém'], ['Carta', 'o que se escreve com tempo'], ['Caligrafia', 'a letra de quem tem cuidado']],
    bauhaus: [['Forma', 'o desenho essencial'], ['Módulo', 'a peça que monta o todo'], ['Compasso', 'o círculo perfeito'], ['Esquadro', 'o ângulo certo'], ['Prisma', 'a luz que se divide em cor']],
    sinal: [['Sinal', 'o aviso claro'], ['Eixo', 'o centro de tudo'], ['Foco', 'onde a atenção mora'], ['Linha', 'o caminho mais curto'], ['Clara', 'o que se entende de primeira']],
    classico: [['Tradição', 'o que passa de geração pra geração'], ['Armazém', 'onde tinha de tudo'], ['Empório', 'a loja de confiança'], ['Esquina', 'o ponto que todo mundo conhece'], ['Casa', 'onde a gente se sente bem']],
    chiclete: [['Bala', 'o doce que cabe no bolso'], ['Tutti', 'todos os sabores juntos'], ['Granulado', 'o detalhe que deixa tudo melhor'], ['Pirulito', 'a alegria com cabo'], ['Confeito', 'o enfeite que se come']]
  };
  const SUF = ['ô', 'ita', 'ix', 'ola', 'el', 'ê', 'on', 'eta', 'aê'];
  const FEIO = /(merd|bost|porr|cacet|puta|fod|bucet|caralh|xoxot|piroc|pica|bund|cagad|peid|^cu|^rol[aoi]|^pint|^xot|^xan|^pic|^cag)/;
  const base = w => { let b = semAc(w).toLowerCase().replace(/[^a-z]/g, '').replace(/[aeiou]+$/, ''); if(b.length > 6) b = b.slice(0, 5).replace(/[aeiou]+$/, ''); return b.length >= 2 ? b : ''; };
  const inventa = (w, suf) => { const b = base(w); if(!b) return ''; const nome = cap(b + suf); return nome.length >= 4 && nome.length <= 9 && !FEIO.test(semAc(nome).toLowerCase()) ? nome : ''; };
  const junta = (a, b2) => { const x = semAc(a), y = semAc(b2); const i = x.toLowerCase().search(/[aeiou]+[^aeiou]*$/); const j = y.toLowerCase().search(/[aeiou]/); if(i < 1 || j < 0) return ''; const r = a.slice(0, i) + b2.slice(j).toLowerCase(); return r.length >= 5 && r.length <= 8 && !FEIO.test(semAc(r).toLowerCase()) && r.toLowerCase() !== a.toLowerCase() && r.toLowerCase() !== b2.toLowerCase() ? cap(r) : ''; };
  /* o vocabulário de cada campo de sentido: palavras que evocam o campo, cada uma com o que ela quer dizer */
  const VOC = {
    fogo: [['Tição', 'o pedaço de lenha que segura o fogo aceso'], ['Rescaldo', 'a brasa que fica depois da chama, a mais quente de todas'], ['Fagulha', 'o começo de todo fogo'], ['Braseiro', 'onde a carne encontra o fogo'], ['Labareda', 'o fogo alto, que chama de longe'], ['Lenha', 'o que alimenta o fogo e dá o sabor'], ['Carvão', 'o fogo que trabalha em silêncio'], ['Fornalha', 'o calor que não apaga']],
    doce: [['Glacê', 'a cobertura que deixa tudo brilhando'], ['Merengue', 'o doce que é quase nuvem'], ['Ponto de Bala', 'o ponto exato da calda, nem antes nem depois'], ['Calda', 'o que escorre e faz voltar'], ['Confeito', 'o detalhe que se come'], ['Fornada', 'o que sai do forno de uma vez']],
    cafe: [['Torra', 'onde o grão vira café'], ['Coado', 'o café sem pressa, passado no pano'], ['Crema', 'a espuma dourada do espresso bem tirado'], ['Moenda', 'o moinho que acorda o grão'], ['Pausa', 'o intervalo bom do dia'], ['Terroir', 'o lugar que dá gosto ao grão']],
    mar: [['Maré', 'o vai e vem que nunca para'], ['Farol', 'a luz que guia quem chega'], ['Cais', 'onde tudo chega e de onde tudo sai'], ['Âncora', 'o que segura firme'], ['Brisa', 'o vento leve que vem do mar'], ['Ressaca', 'o mar que vem com força']],
    noite: [['Madrugada', 'a hora em que só fica quem gosta'], ['Penumbra', 'a luz baixa, na medida'], ['Lua Cheia', 'a noite clara, de casa cheia'], ['Breu', 'o escuro que guarda segredo'], ['Sereno', 'a noite caindo devagar'], ['Saideira', 'a última, que nunca é a última']],
    tech: [['Nexo', 'a ligação que faz tudo fazer sentido'], ['Vetor', 'direção e força juntas'], ['Módulo', 'a peça que monta o todo'], ['Órbita', 'o caminho certo em volta do que importa'], ['Eixo', 'o centro de tudo'], ['Sinal', 'o aviso claro no meio do ruído']],
    veloz: [['Largada', 'o começo de tudo, com o motor quente'], ['Pole', 'a primeira posição do grid'], ['Arrancada', 'a saída rápida, sem hesitar'], ['Vácuo', 'o atalho de quem anda colado no da frente'], ['Reta', 'onde se ganha tempo'], ['Turbo', 'o empurrão a mais']],
    luxo: [['Quilate', 'a medida do que é raro'], ['Brasão', 'a marca de quem tem nome'], ['Veludo', 'o toque que se reconhece no escuro'], ['Âmbar', 'a luz dourada que guarda o tempo'], ['Lapidado', 'o que foi trabalhado até brilhar'], ['Marfim', 'o branco de quem tem tempo']],
    rua: [['Esquina', 'onde tudo se encontra'], ['Calçada', 'o chão de quem passa'], ['Meio-Fio', 'a linha entre a rua e a calçada'], ['Viela', 'o caminho que só quem é de lá conhece'], ['Muro', 'onde a rua escreve'], ['Lambe', 'o cartaz colado que todo mundo vê']],
    som: [['Lado B', 'a faixa que só quem conhece sabe'], ['Agulha', 'o que faz o disco tocar'], ['Grave', 'o som que se sente no peito'], ['Rotação', 'o giro certo do disco'], ['Compasso', 'o tempo que segura a música'], ['Eco', 'o som que volta']],
    cuidado: [['Alento', 'o fôlego que volta'], ['Zelo', 'o cuidado em cada detalhe'], ['Colo', 'onde a gente se sente seguro'], ['Abrigo', 'o lugar que protege'], ['Prumo', 'o equilíbrio certo'], ['Pulso', 'o sinal de que tá tudo vivo']],
    natureza: [['Seiva', 'o que corre por dentro e dá vida'], ['Broto', 'o começo de tudo que cresce'], ['Raiz', 'o que segura e alimenta'], ['Orvalho', 'a água da manhã'], ['Semente', 'o que guarda o futuro'], ['Safra', 'a colheita do ano']],
    infantil: [['Recreio', 'a hora mais esperada do dia'], ['Ciranda', 'a roda de todo mundo junto'], ['Pião', 'o brinquedo que gira e prende o olho'], ['Peteca', 'o jogo que não deixa cair'], ['Gangorra', 'o sobe e desce de quem brinca junto'], ['Cambalhota', 'a virada mais divertida']],
    jogo: [['Start', 'o botão que começa o jogo'], ['Ficha', 'o que dá direito a mais uma'], ['Combo', 'a sequência perfeita'], ['Checkpoint', 'o ponto que garante o progresso'], ['Continue', 'a segunda chance'], ['Fase 2', 'o que vem depois de passar da primeira']],
    pet: [['Focinho', 'o nariz que chega primeiro'], ['Bigode', 'o detalhe que todo bicho tem'], ['Patota', 'a turma de quatro patas'], ['Latido', 'o oi mais animado'], ['Faro', 'o nariz que acha tudo'], ['Ronrom', 'o barulho de bicho satisfeito']]
  };
  /* sem pista no texto, o campo que o nicho puxa */
  const CAMPO_NICHO = { comida: 'fogo', cafe: 'cafe', doces: 'doce', bebidas: 'noite', tech: 'tech', musica: 'som', saude: 'cuidado', agro: 'natureza', pet: 'pet', auto: 'veloz', fitness: 'veloz', moda: 'rua' };
  /* o = { nicho, pers, cidade, palavras (as da pessoa), descr (o que vende), rodada } -> 12 candidatos { nome, estrategia, porque, raiz }.
     O sentido vem do que a pessoa vende (descr e palavras): brasa puxa brasa, café puxa café. A personalidade só entra quando
     ela foi marcada de verdade (slider no meio não é opinião). */
  M.nomes = o => {
    const nicho = o.nicho || 'outro', pers = o.pers || [.5, .5, .5, .5, .5], r = M.rng(M.hash(nicho + ':' + (o.rodada || 0) + ':' + (o.palavras || '') + ':' + (o.descr || '')) || 1);
    const pega = arr => arr[Math.floor(r() * arr.length) % arr.length], mexe = arr => arr.slice().sort(() => r() - 0.5);
    const campos = M.sentido(o.descr, o.palavras), kc = campos.map(c => c.k);
    if(!kc.length && CAMPO_NICHO[nicho]) kc.push(CAMPO_NICHO[nicho]);
    const nomeCampo = k => (M.CAMPOS.find(c => c.k === k) || {}).n || k;
    const voc = mexe(kc.flatMap(k => (VOC[k] || []).map(x => [x[0], x[1], k])));
    const casa = w => M.sentido(w).some(c => kc.includes(c.k)), raiz0 = mexe(RAIZ[nicho] || RAIZ.outro);
    /* o tipo de casa que a pessoa escreveu (barbearia, pizzaria, sorveteria...) vira o primeiro sobrenome do nome descritivo */
    const tipo = (String(o.descr || '').match(/(?:^|[^\p{L}])(\p{L}{3,}(?:aria|eria))(?![\p{L}])/iu) || [])[1], prod = (tipo ? [cap(tipo.toLocaleLowerCase('pt-BR'))] : []).concat(PROD[nicho] || PROD.outro);
    if(tipo) ANTES.add(prod[0]);
    const raiz = raiz0.filter(casa).concat(raiz0.filter(w => !casa(w))), cid = String(o.cidade || '').split(',')[0].trim();
    const terr = M.ranking(pers, nicho, campos)[0].k, out = [], visto = new Set();
    const poe = (nome, estrategia, porque, raizUsada) => { nome = String(nome || '').replace(/\s+/g, ' ').trim(); const k = semAc(nome).toLowerCase(); if(!nome || visto.has(k) || nome.length > 26) return false; visto.add(k); out.push({ nome, estrategia, porque, raiz: raizUsada || '' }); return true; };
    const delas = String(o.palavras || '').split(/[,;\n]/).map(s => s.trim()).filter(s => s.length >= 2 && s.length <= 24).slice(0, 4);
    delas.slice(0, 2).forEach(w => poe(cap(w), 'proprio', `"${w}" já carrega o que a marca quer dizer; o Studio só testa a palavra em letra, cor e símbolo.`, w));
    const fontes = delas.concat(raiz);
    /* descritivo */
    for(let i = 0, n = 0; i < raiz.length && n < 2; i++){ const p = prod[(i + n) % prod.length], nome = ANTES.has(p) ? `${p} ${raiz[i]}` : `${raiz[i]} ${p}`; if(poe(nome, 'descritivo', `Diz o que é na primeira leitura: "${p.toLowerCase()}" conta o que você vende e "${raiz[i].toLowerCase()}" dá o sabor. Fácil de achar na busca e fácil de indicar.`, raiz[i])) n++; }
    /* evocativo: o campo do negócio e, se a personalidade foi marcada, o eixo mais forte dela */
    const eixos = pers.map((v, i) => ({ i, d: Math.abs(v - 0.5), pol: v >= 0.5 ? 1 : 0 })).sort((a, b) => b.d - a.d), marcada = eixos[0].d >= 0.15;
    const doCampo = () => { while(voc.length){ const [w, d, k] = voc.shift(); if(poe(w, 'evocativo', `Não descreve o produto: evoca ${nomeCampo(k)}. ${w} é ${d}. É nome que cria clima antes de explicar o que você vende, e cresce junto com a marca.`, w)) return true; } return false; };
    const doEixo = e => { const ax = eixos[e], w = pega(EVOCA[ax.i][ax.pol]); return poe(w, 'evocativo', `Não descreve o produto: evoca ${SENTIDO[ax.i][ax.pol]}. É nome que cria clima antes de explicar o que você vende, e cresce junto com a marca.`, w); };
    if(marcada){ doEixo(0); if(!doCampo()) doEixo(1); doCampo(); }
    else { if(!doCampo()) doEixo(0); if(!doCampo()) doEixo(1); doCampo(); }
    /* inventado */
    for(let i = 0, n = 0; i < fontes.length * 3 && n < 2; i++){ const w = fontes[i % fontes.length], s = SUF[Math.floor(r() * SUF.length)], nome = inventa(w, s); if(nome && poe(nome, 'inventado', `Uma palavra nova, feita de "${w.toLowerCase()}": soa familiar na primeira vez que alguém fala, mas é só tua. É o tipo de nome mais fácil de registrar e de achar o @ livre.`, w)) n++; }
    /* metáfora do território que mais combina com o negócio */
    mexe(META[terr] || META.rua).slice(0, voc.length ? 1 : 2).forEach(([w, d]) => { poe(w, 'metafora', `Uma imagem no lugar da descrição: ${w.toLowerCase()} é ${d}. Conta a história da marca em uma palavra.`, w); });
    /* gíria */
    const RUA = ['comida', 'bebidas', 'moda', 'musica', 'fitness', 'eventos', 'arte', 'cafe', 'beleza', 'varejo', 'doces', 'pet', 'criativo'];
    const gs = mexe(GIRIA).slice(0, RUA.includes(nicho) ? 2 : 1); gs.forEach(([w, d], i) => { const p0 = pega(prod), nome = i ? (ANTES.has(p0) ? `${p0} ${w}` : `${w} ${p0}`) : w; poe(nome, 'giria', `Gíria que a rua já entende: ${w.toLowerCase()} é ${d}. Dá intimidade na hora e faz o cliente falar o nome do jeito que fala com amigo.`, w); });
    /* composto: uma raiz do negócio com uma palavra do campo (ou do eixo marcado) */
    const segundas = marcada || !voc.length ? raiz.concat(EVOCA[eixos[0].i][eixos[0].pol]) : raiz.concat(kc.flatMap(k => (VOC[k] || []).map(x => x[0])));
    for(let i = 0, n = 0; i < 16 && n < 1; i++){ const a = pega(fontes.slice(0, 5)), b2 = pega(segundas), nome = a !== b2 ? junta(a, b2) : ''; if(nome && poe(nome, 'composto', `Duas palavras viram uma: ${a.toLowerCase()} + ${b2.toLowerCase()}. Junta as duas ideias num nome só, que ninguém mais tem.`, a + ' + ' + b2)) n++; }
    /* origem */
    if(cid){ const w = raiz[0], nome = r() < 0.5 ? `${w} ${cid}` : `${pega(prod)} ${cid}`; poe(nome, 'origem', `Puxa o lugar pro nome: ${cid} vira parte da marca. Bom pra quem quer ser a referência da região e aparecer quando alguém procura pela cidade.`, cid); }
    /* sobrou espaço: mais uma do campo */
    while(out.length < 12 && doCampo());
    return out.slice(0, 12);
  };
  /* v3.40 · "Mais nomes" de verdade: roda o gerador com outras sementes até juntar n nomes que ainda não apareceram
     (evita = tudo que já foi mostrado). Antes, a lista encolhia e os nomes de duas rodadas atrás voltavam */
  M.nomesNovos = (o, evita, n) => {
    const ja = evita instanceof Set ? evita : new Set((evita || []).map(x => String(x).toLowerCase())), out = [], aqui = new Set();
    n = n || 12;
    for(let k = 0; k < 16 && out.length < n; k++){
      M.nomes(Object.assign({}, o, { rodada: (o.rodada || 0) * 17 + k })).forEach(x => { const c = String(x.nome).toLowerCase(); if(ja.has(c) || aqui.has(c) || out.length >= n) return; aqui.add(c); out.push(x); });
    }
    return out;
  };
  /* o texto do naming no brandbook */
  M.namingTxt = nm => {
    const e = M.ESTRATEGIAS[nm.estrategia] || M.ESTRATEGIAS.proprio, n = String(nm.nome || ''), sil = M.silabas(n.replace(/&/g, 'e')), letras = [...n.replace(/[^\p{L}\p{N}]/gu, '')].length;
    const fim = semAc(n).toLowerCase().replace(/[^a-z]/g, '').slice(-1);
    const som = /a/.test(fim) ? 'termina aberto, em A, como quem chama alguém' : /o/.test(fim) ? 'termina redondo, em O' : /[ei]/.test(fim) ? 'termina num som agudo e rápido' : /u/.test(fim) ? 'termina num U, fechado e curto' : 'termina seco, numa consoante: tem ponto final';
    const ROT = { descritivo: 'um nome descritivo', evocativo: 'um nome evocativo', inventado: 'um nome inventado', origem: 'um nome de origem', giria: 'um nome de gíria', composto: 'um nome composto', metafora: 'um nome de metáfora', proprio: 'o nome que veio de você' };
    const out = [`${n} é ${ROT[nm.estrategia] || 'o nome da marca'}. ${nm.porque || e.d}`.trim(),
      `Tem ${sil} ${sil === 1 ? 'sílaba' : 'sílabas'} e ${letras} letras, e ${som}. ${sil <= 3 ? 'Cabe na boca de quem indica, no @ e no copo.' : 'É nome pra ser dito inteiro e lembrado pelo som; o símbolo e a sigla seguram as peças pequenas.'}`];
    if(nm.outros && nm.outros.length) out.push(`Também passaram pela bancada: ${nm.outros.slice(0, 5).join(', ')}.`);
    out.push(`Antes de registrar, confere o @ (${M.handleDe(n)}), o domínio (${M.handleDe(n)}.com.br) e a marca no INPI. O Studio não consulta esses cadastros por você: os links estão no fim do brandbook.`);
    return out;
  };
})();
