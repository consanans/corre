/* CORRE · STUDIO HOUZI · O BRANDBOOK (v3.37).
   #/bb/endereço: o brandbook vivo da marca (conceito, naming, pra quem, se a marca fosse gente, logo, tipografia, cores,
   elementos, voz e aplicações),
   cada parte com o texto que explica o conceito. Rascunho só o dono vê; publicada, abre pra qualquer um.
   Daqui também saem o PDF do brandbook (vetor, em curvas) e o kit da marca (ZIP: logos em SVG, PNG e PDF, redes,
   favicon, paleta pra Photoshop/Illustrator/GIMP/CSS, as letras com as licenças, o padrão e o PDF).
   As aplicações são cenas em vetor montadas com as cores e o logo da própria marca. */
(function(){
  'use strict';
  const C = window.Corre, M = C.labMotor, H = C.houzi;
  if(!M || !H) return;
  const { esc, ico } = C, F = M.forma, mx = M.mx;
  const L = C.houziLivro = {};

  /* ---------- tons e texto pras cenas ---------- */
  const tom = (hex, dl, dc) => { const c = M.lch(hex); return M.deLch(Math.max(0, Math.min(1, c.l + dl)), Math.max(0, c.c * (dc == null ? 1 : dc)), c.h); };
  const claro = hex => M.lch(hex).l > 0.62;
  const T = (f, s, x, y, tam, cor, o) => { const t = M.texto(f, s, Object.assign({ tam, x, y }, o || {})); return { d: t.cmds, f: cor, w0: t.w }; };
  const largura = (f, s, tam, o) => M.largura(f, s, Object.assign({ tam }, o || {}));
  /* o texto que cabe na largura (corta com reticências) */
  const cabe = (f, s, tam, larg, o) => { s = String(s || ''); if(largura(f, s, tam, o) <= larg) return s; while(s.length > 1 && largura(f, s + '…', tam, o) > larg) s = s.slice(0, -1).trimEnd(); return s + '…'; };
  const ret = (x, y, w, h, r, f, extra) => Object.assign({ d: F.ret(x, y, w, h, r || 0), f }, extra || {});
  const poli = (pts, f, extra) => Object.assign({ d: F.poli(pts), f }, extra || {});
  const elip = (cx, cy, rx, ry, f, extra) => Object.assign({ d: F.elipse(cx, cy, rx, ry), f }, extra || {});
  const gira = (els, g, cx, cy) => M.trEls(els, mx.r(g, cx, cy));
  /* o logo dentro de uma caixa, com o furo virando a cor do que tá embaixo */
  const logoEm = (lg, v, x, y, w, h, fundo, alinha) => M.logoNaCaixa(lg, v, x, y, w, h, fundo, alinha);
  /* padrão: o símbolo repetido numa área (recortado) */
  const padrao = (simb, v, x, y, w, h, fundo, passo, giro) => {
    const out = [], clip = F.ret(x, y, w, h, 0), p = passo || 60;
    for(let j = 0, yy = y - p / 2; yy < y + h + p; yy += p, j++) for(let xx = x - p / 2 + (j % 2 ? p / 2 : 0); xx < x + w + p; xx += p){
      let els = logoEm(simb, v, xx - p * 0.28, yy - p * 0.28, p * 0.56, p * 0.56, fundo);
      if(giro) els = gira(els, giro, xx, yy);
      els.forEach(e => out.push(Object.assign({}, e, { clip })));
    }
    return out;
  };

  /* ---------- as aplicações (cada uma numa caixa de 600 x 450) ---------- */
  const W = 600, Hh = 450;
  const MOCK = {};
  const neutro = c => M.deLch(0.93, 0.012, M.lch(c.p).h);
  MOCK.instagram = k => {
    const { c, vs, simb, logo, fs, sp, voz } = k, o = [ret(0, 0, W, Hh, 0, neutro(c))];
    o.push(ret(186, 18, 228, 470, 34, '#121214'), ret(194, 26, 212, 460, 28, '#FFFFFF'));
    o.push(elip(234, 82, 25, 25, c.p)); logoEm(simb, vs.cor, 218, 66, 32, 32, c.p).forEach(e => o.push(e));
    o.push(T(fs.texto, cabe(fs.texto, '@' + M.handleDe(sp.nome), 8.5, 128), 270, 76, 8.5, '#141414'));
    const bio = cabe(fs.texto, (voz && voz.bio) || sp.tagline || '', 6.2, 128);
    if(bio) o.push(T(fs.texto, bio, 270, 92, 6.2, '#6B6B70'));
    o.push(ret(270, 100, 60, 4, 2, '#D9D9DC'), ret(206, 118, 92, 16, 8, c.p), T(fs.texto, 'Seguir', 236, 129.5, 6.5, M.texto_em(c.p, '#141414', '#FFFFFF')), ret(302, 118, 92, 16, 8, '#EDEDF0'), T(fs.texto, 'Mensagem', 327, 129.5, 6.5, '#141414'));
    const g = 68, x0 = 198, y0 = 146, cel = (i, j) => [x0 + i * (g + 2), y0 + j * (g + 2)];
    const tiles = [
      ([x, y]) => { o.push(ret(x, y, g, g, 0, c.p)); logoEm(simb, vs.cor, x + 16, y + 16, g - 32, g - 32, c.p).forEach(e => o.push(e)); },
      ([x, y]) => { o.push(ret(x, y, g, g, 0, c.paper)); logoEm(logo, vs.principal, x + 8, y + 8, g - 16, g - 16, c.paper).forEach(e => o.push(e)); },
      ([x, y]) => { o.push(ret(x, y, g, g, 0, c.ink)); const tl = String((voz && voz.taglines && voz.taglines[0]) || sp.nome), pa = M.paragrafo(fs.display, tl, { tam: 7.5, larg: g - 14, x: x + 7, y: y + 18, entre: 10, caixa: sp.logo.caixa === 'alta' ? 'alta' : '', max: 4 }); if(pa.cmds.length) o.push({ d: pa.cmds, f: c.paper }); },
      ([x, y]) => { o.push(ret(x, y, g, g, 0, c.s)); padrao(simb, M.versoes(c).preto, x, y, g, g, c.s, 22).forEach(e => o.push(Object.assign({}, e, { f: e.f ? tom(c.s, -0.12) : e.f, s: e.s ? tom(c.s, -0.12) : e.s }))); },
      ([x, y]) => { o.push(ret(x, y, g, g, 0, c.a)); const cl = F.ret(x, y, g, g, 0); logoEm(simb, Object.assign({}, vs.cor, { marca: c.ink, texto: c.ink, acento: c.paper, sec: c.ink, sombra: c.ink, furo: c.a }), x - 8, y + 14, g + 40, g + 40, c.a).forEach(e => o.push(Object.assign({}, e, { clip: cl }))); },
      ([x, y]) => { o.push(ret(x, y, g, g, 0, c.paper)); o.push(T(fs.display, String(sp.nome).split(/\s+/)[0].slice(0, 9), x + 7, y + g - 10, 13, c.p, { caixa: sp.logo.caixa })); }
    ];
    tiles.forEach((f, i) => f(cel(i % 3, Math.floor(i / 3))));
    return o;
  };
  MOCK.cartao = k => {
    const { c, vs, logo, simb, fs, sp } = k, o = [ret(0, 0, W, Hh, 0, neutro(c))];
    const verso = [ret(34, 96, 270, 160, 6, c.p)].concat(logoEm(logo, vs.cor, 64, 126, 210, 100, c.p));
    gira(verso, -8, 169, 176).forEach(e => o.push(e));
    const sombra = gira([ret(304, 206, 270, 160, 6, 'rgba(0,0,0,.14)')], 5, 439, 286);
    sombra.forEach(e => o.push(Object.assign({}, e, { f: '#000000', op: 0.12 })));
    const fx = 300, fy = 200, frente = [ret(fx, fy, 270, 160, 6, c.paper)].concat(logoEm(simb, vs.principal, fx + 20, fy + 20, 40, 40, c.paper));
    frente.push(T(fs.display, cabe(fs.display, sp.nome, 11, 230, { caixa: sp.logo.caixa }), fx + 20, fy + 110, 11, c.ink, { caixa: sp.logo.caixa }), T(fs.texto, cabe(fs.texto, '@' + M.handleDe(sp.nome), 7, 230), fx + 20, fy + 126, 7, tom(c.ink, 0.25)), T(fs.texto, String(sp.cidade || '').split(',')[0] || 'Atendimento', fx + 20, fy + 138, 7, tom(c.ink, 0.25)), ret(fx + 20, fy + 90, 26, 2.5, 0, c.a));
    gira(frente, 4, fx + 135, fy + 80).forEach(e => o.push(e));
    return o;
  };
  MOCK.sacola = k => {
    const { c, vs, logo } = k, o = [ret(0, 0, W, Hh, 0, neutro(c))], cor = c.p, v = vs.cor;
    o.push(elip(300, 428, 150, 12, '#000000', { op: 0.1 }));
    o.push({ d: M.parse('M232 132 C232 70 368 70 368 132'), s: tom(cor, -0.18), w: 7, f: null });
    o.push(poli([[190, 128], [410, 128], [420, 424], [180, 424]], cor), poli([[410, 128], [438, 140], [446, 416], [420, 424]], tom(cor, -0.1)));
    o.push(ret(190, 128, 220, 18, 0, tom(cor, -0.05)));
    logoEm(logo, v, 214, 210, 172, 120, cor).forEach(e => o.push(e));
    return o;
  };
  MOCK.copo = k => {
    const { c, vs, simb } = k, o = [ret(0, 0, W, Hh, 0, neutro(c))];
    o.push(elip(300, 414, 92, 12, '#000000', { op: 0.12 }));
    o.push(poli([[226, 120], [374, 120], [356, 410], [244, 410]], c.paper), poli([[352, 120], [374, 120], [356, 410], [340, 410]], tom(c.paper, -0.06)));
    const banda = poli([[232, 200], [368, 200], [361, 320], [239, 320]], c.p); o.push(banda);
    logoEm(simb, vs.cor, 270, 222, 60, 76, c.p).forEach(e => o.push(e));
    o.push(ret(214, 96, 172, 26, 8, c.ink), ret(222, 84, 156, 16, 6, tom(c.ink, 0.08)));
    return o;
  };
  MOCK.camiseta = k => {
    const { c, vs, logo } = k, o = [ret(0, 0, W, Hh, 0, neutro(c))], escura = !claro(c.ink), cor = escura ? c.ink : c.paper, v = escura ? vs.negativo : vs.principal;
    o.push({ d: M.parse('M232 60 C252 76 348 76 368 60 L452 98 L486 176 L430 196 L414 170 L414 420 L186 420 L186 170 L170 196 L114 176 L148 98 Z'), f: cor });
    o.push({ d: M.parse('M262 64 C276 86 324 86 338 64'), s: tom(cor, escura ? 0.12 : -0.12), w: 6, f: null });
    logoEm(logo, v, 236, 128, 128, 74, cor).forEach(e => o.push(e));
    return o;
  };
  MOCK.fachada = k => {
    const { c, vs, logo, sp } = k, o = [ret(0, 0, W, Hh, 0, M.deLch(0.9, 0.02, 230))], parede = claro(c.s) ? c.s : c.paper;
    o.push(ret(40, 60, 520, 370, 0, parede), ret(40, 60, 520, 96, 0, c.p));
    logoEm(logo, vs.cor, 90, 72, 420, 72, c.p).forEach(e => o.push(e));
    for(let i = 0; i < 13; i++) o.push(poli([[40 + i * 40, 156], [80 + i * 40, 156], [80 + i * 40 - 6, 190], [40 + i * 40 - 6, 190]], i % 2 ? c.paper : c.p));
    o.push(ret(70, 214, 250, 180, 2, M.deLch(0.82, 0.03, 220)), ret(70, 214, 250, 180, 2, null, { s: c.ink, w: 6 }), ret(360, 214, 150, 216, 2, c.ink), elip(486, 326, 5, 5, c.a));
    o.push(T(k.fs.texto, String(sp.cidade || '').split(',')[0].toUpperCase() || 'ABERTO', 90, 380, 12, c.ink, { track: 0.2 }));
    o.push(ret(0, 430, W, 20, 0, M.deLch(0.6, 0.01, 230)));
    return o;
  };
  MOCK.cartaz = k => {
    const { c, vs, simb, logo, fs, sp, voz } = k, o = [ret(0, 0, W, Hh, 0, M.deLch(0.86, 0.01, 80))];
    o.push(ret(176, 22, 248, 350, 0, '#000000', { op: 0.12 }), ret(170, 16, 248, 350, 0, c.p));
    const cl = F.ret(170, 16, 248, 350, 0);
    logoEm(simb, vs.cor, 160, 40, 270, 210, c.p).forEach(e => o.push(Object.assign({}, e, { clip: cl })));
    const frase = String((voz && voz.taglines && voz.taglines[0]) || sp.tagline || sp.nome);
    o.push({ d: M.paragrafo(fs.display, frase, { tam: 15, larg: 210, x: 188, y: 290, entre: 19, caixa: sp.logo.caixa === 'baixa' ? 'baixa' : 'alta', max: 3 }).cmds, f: M.texto_em(c.p, c.ink, c.paper) });
    logoEm(logo, vs.cor, 188, 336, 120, 22, c.p, 'esq').forEach(e => o.push(e));
    return o;
  };
  MOCK.lambe = k => {
    const { c, vs, simb, logo } = k, o = [ret(0, 0, W, Hh, 0, '#8D8780')];
    for(let j = 0; j < 9; j++) for(let i = 0; i < 12; i++) o.push(ret(i * 50 + (j % 2) * 25, j * 50, 48, 24, 0, tom('#8D8780', ((i + j) % 3 - 1) * 0.02)));
    [[60, 40, -3], [220, 52, 2], [380, 36, -1]].forEach(([x, y, g], i) => {
      const fundo = i === 1 ? c.paper : c.p, v = i === 1 ? vs.principal : vs.cor, pg = [ret(x, y, 150, 210, 0, fundo)];
      (i === 1 ? logoEm(logo, v, x + 14, y + 70, 122, 70, fundo) : logoEm(simb, v, x + 25, y + 45, 100, 120, fundo)).forEach(e => pg.push(e));
      gira(pg, g, x + 75, y + 105).forEach(e => o.push(e));
    });
    o.push(ret(0, 300, W, 150, 0, '#3B3936'));
    return o;
  };
  MOCK.embalagem = k => {
    const { c, vs, logo, simb } = k, o = [ret(0, 0, W, Hh, 0, neutro(c))];
    o.push(elip(300, 404, 190, 16, '#000000', { op: 0.1 }));
    const fr = [[150, 170], [330, 210], [330, 400], [150, 360]], ld = [[330, 210], [460, 170], [460, 360], [330, 400]], tp = [[150, 170], [280, 130], [460, 170], [330, 210]];
    o.push(poli(fr, c.paper), poli(ld, c.p), poli(tp, tom(c.paper, -0.04)));
    const m1 = [180 / 180, 40 / 180, 0, 1, 150, 170];
    M.trEls(logoEm(logo, vs.principal, 18, 70, 144, 80, c.paper), m1).forEach(e => o.push(e));
    const m2 = [130 / 130, -40 / 130, 0, 1, 330, 210];
    M.trEls(padrao(simb, vs.cor, 0, 0, 130, 190, c.p, 46), m2).forEach(e => o.push(e));
    return o;
  };
  MOCK.app = k => {
    const { c, vs, simb, fs, sp } = k, o = [ret(0, 0, W, Hh, 0, neutro(c))];
    o.push(ret(186, 18, 228, 470, 34, '#121214'), ret(194, 26, 212, 460, 28, M.deLch(0.3, 0.04, M.lch(c.p).h)));
    for(let j = 0; j < 5; j++) for(let i = 0; i < 4; i++){
      const x = 210 + i * 48, y = 60 + j * 66;
      if(i === 1 && j === 1){ o.push(ret(x, y, 36, 36, 9, c.p)); logoEm(simb, vs.cor, x + 7, y + 7, 22, 22, c.p).forEach(e => o.push(e)); o.push(T(fs.texto, String(sp.nome).slice(0, 10), x - 2, y + 48, 5.6, '#FFFFFF')); }
      else o.push(ret(x, y, 36, 36, 9, '#FFFFFF', { op: 0.16 }));
    }
    return o;
  };
  MOCK.bone = k => {
    const { c, vs, simb } = k, o = [ret(0, 0, W, Hh, 0, neutro(c))], cor = claro(c.p) ? c.ink : c.p, v = claro(c.p) ? vs.negativo : vs.cor;
    o.push(elip(300, 352, 170, 14, '#000000', { op: 0.1 }));
    o.push({ d: M.parse('M150 300 C150 170 230 110 310 110 C400 110 450 180 452 300 Z'), f: cor }, { d: M.parse('M150 300 C230 296 360 296 452 300 C470 320 500 336 520 340 C430 352 250 350 150 330 Z'), f: tom(cor, -0.08) });
    o.push({ d: M.parse('M300 112 C296 170 296 240 300 298'), s: tom(cor, -0.1), w: 2.5, f: null }, elip(306, 112, 9, 5, tom(cor, -0.08)));
    logoEm(simb, v, 222, 168, 76, 76, cor).forEach(e => o.push(e));
    return o;
  };
  MOCK.adesivo = k => {
    const { c, vs, simb, logo } = k, o = [ret(0, 0, W, Hh, 0, neutro(c))];
    const a = [elip(226, 228, 116, 116, '#FFFFFF'), elip(226, 228, 104, 104, c.p)].concat(logoEm(simb, vs.cor, 166, 168, 120, 120, c.p));
    o.push(elip(232, 236, 116, 116, '#000000', { op: 0.12 }));
    gira(a, -10, 226, 228).forEach(e => o.push(e));
    const b = [ret(330, 250, 210, 98, 49, '#FFFFFF'), ret(338, 258, 194, 82, 41, c.paper)].concat(logoEm(logo, vs.principal, 360, 272, 150, 54, c.paper));
    gira(b, 8, 435, 299).forEach(e => o.push(e));
    return o;
  };
  MOCK.carimbo = k => {
    const { c, logo } = k, kraft = '#C9A27A', o = [ret(0, 0, W, Hh, 0, kraft)];
    const v = Object.assign({}, M.versoes(c).preto, { marca: tom(c.p, -0.1), texto: tom(c.p, -0.1), tagline: tom(c.p, -0.1), sec: tom(c.p, -0.1), acento: tom(c.p, -0.1), sombra: tom(c.p, -0.1), furo: kraft });
    gira(logoEm(logo, v, 140, 120, 320, 210, kraft), -6, 300, 225).forEach(e => o.push(Object.assign({}, e, { op: 0.86 })));
    return o;
  };
  MOCK.avental = k => {
    const { c, vs, logo } = k, o = [ret(0, 0, W, Hh, 0, neutro(c))], cor = claro(c.s) ? c.ink : c.s, v = M.contraste(cor, c.paper) > 3 ? vs.negativo : vs.principal;
    o.push({ d: M.parse('M240 40 H360 V120 C360 130 372 140 390 146 L420 160 L430 430 H170 L180 160 L210 146 C228 140 240 130 240 120 Z'), f: cor });
    o.push({ d: M.parse('M240 40 C220 20 380 20 360 40'), s: tom(cor, 0.1), w: 5, f: null }, ret(210, 300, 180, 70, 4, tom(cor, -0.06)));
    logoEm(logo, Object.assign({}, v, { furo: cor }), 236, 160, 128, 84, cor).forEach(e => o.push(e));
    return o;
  };
  MOCK.ingresso = k => {
    const { c, vs, logo, fs, sp } = k, o = [ret(0, 0, W, Hh, 0, M.deLch(0.2, 0.02, M.lch(c.p).h))];
    const forma = M.trEls([{ d: M.FORMAS.ticket.d() }], [4.4, 0, 0, 2.1, 80, 120]);
    o.push(Object.assign({}, forma[0], { f: c.p }));
    logoEm(logo, vs.cor, 120, 170, 220, 110, c.p).forEach(e => o.push(e));
    for(let y = 140; y < 320; y += 12) o.push(elip(378, y, 2.2, 2.2, M.texto_em(c.p, c.ink, c.paper), { op: 0.5 }));
    o.push(T(fs.texto, 'ADMITE 1', 400, 214, 12, M.texto_em(c.p, c.ink, c.paper), { track: 0.18 }), T(fs.display, 'Nº ' + String((sp.seed || 7) % 1000).padStart(3, '0'), 400, 252, 18, M.texto_em(c.p, c.ink, c.paper)));
    return o;
  };
  MOCK.revista = k => {
    const { c, vs, logo, simb, fs, voz } = k, o = [ret(0, 0, W, Hh, 0, neutro(c))];
    o.push(ret(196, 26, 220, 300, 0, '#000000', { op: 0.12 }), ret(190, 20, 220, 300, 0, c.paper));
    logoEm(logo, vs.principal, 206, 30, 188, 46, c.paper).forEach(e => o.push(e));
    o.push(ret(206, 90, 188, 170, 0, c.s));
    logoEm(simb, Object.assign({}, vs.cor, { marca: c.p, furo: c.s }), 236, 110, 128, 128, c.s).forEach(e => o.push(e));
    const ch = String((voz && voz.taglines && voz.taglines[1]) || (voz && voz.conceito) || '').slice(0, 60);
    o.push({ d: M.paragrafo(fs.display, ch, { tam: 9, larg: 184, x: 206, y: 280, entre: 12, max: 3 }).cmds, f: c.ink });
    return o;
  };
  MOCK.zine = k => {
    const { c, vs, logo, simb } = k, o = [ret(0, 0, W, Hh, 0, M.deLch(0.85, 0.01, 90))];
    const p1 = [ret(130, 70, 170, 240, 0, c.paper)].concat(logoEm(logo, vs.principal, 142, 140, 146, 70, c.paper));
    const p2 = [ret(300, 70, 170, 240, 0, c.p)].concat(padrao(simb, vs.cor, 300, 70, 170, 240, c.p, 54));
    gira(p1.concat(p2), -4, 300, 190).forEach(e => o.push(e));
    return o;
  };
  MOCK.neon = k => {
    const { c, logo } = k, parede = '#141416', o = [ret(0, 0, W, Hh, 0, parede)];
    for(let j = 0; j < 9; j++) for(let i = 0; i < 12; i++) o.push(ret(i * 50 + (j % 2) * 25, j * 50, 48, 24, 0, tom(parede, ((i + j) % 3) * 0.015)));
    const brilho = M.lch(c.p).l < 0.55 ? tom(c.p, 0.25) : c.p, v = Object.assign({}, M.versoes(c).branco, { marca: brilho, texto: '#FFFFFF', tagline: brilho, acento: brilho, sec: brilho, sombra: brilho, furo: parede });
    const els = logoEm(logo, v, 120, 120, 360, 210, parede);
    [18, 10, 5].forEach((w, i) => els.forEach(e => o.push(Object.assign({}, e, { f: null, s: brilho, w, op: [0.08, 0.14, 0.3][i], furo: false }))));
    els.forEach(e => o.push(e));
    return o;
  };
  MOCK.tela = MOCK.app;
  L.MOCKS = { instagram: 'Instagram', cartao: 'Cartão de visita', sacola: 'Sacola', copo: 'Copo', camiseta: 'Camiseta', fachada: 'Fachada', cartaz: 'Cartaz', lambe: 'Lambe-lambe', embalagem: 'Embalagem', app: 'Ícone de app', tela: 'Tela',
    bone: 'Boné', adesivo: 'Adesivo', carimbo: 'Carimbo', avental: 'Avental', ingresso: 'Ingresso', revista: 'Revista', zine: 'Fanzine', neon: 'Neon' };
  /* as aplicações de uma marca: as do território primeiro, depois as que toda marca precisa */
  L.aplicacoesDe = sp => { const out = []; (sp.aplic || []).concat(['instagram', 'cartao', 'app', 'sacola', 'cartaz', 'copo']).forEach(k => { if(MOCK[k] && !out.includes(k)) out.push(k); }); return out.slice(0, 10); };
  /* monta o "kit" de desenho de uma marca: letras, logos e versões */
  L.prepara = async (m) => {
    const sp = m.spec, fs = await H.fs(sp), vs = M.versoes(sp.cores);
    return { m, sp, fs, vs, c: sp.cores, voz: H.voz(m), logo: M.logo(sp, fs), simb: M.logo(sp, fs, 'simbolo'), word: M.logo(sp, fs, 'wordmark'), musica: C.houziSom ? C.houziSom.compoe(sp) : null };
  };
  L.mock = (k, ctx) => { const els = (MOCK[k] || MOCK.instagram)(ctx); return { els, svg: M.svg(els, { vb: { x: 0, y: 0, w: W, h: Hh }, titulo: L.MOCKS[k] || k }) }; };

  /* ---------- pedaços do brandbook (compartilhados pela página e pelo PDF) ---------- */
  const VOG = /[aeiouyáéíóúâêôãõàü]/i;
  const silabas = s => String(s || '').split(/\s+/).map(w => { const ps = w.match(/[^aeiouáéíóúâêôãõàAEIOUÁÉÍÓÚÂÊÔÃÕÀ]*[aeiouáéíóúâêôãõàAEIOUÁÉÍÓÚÂÊÔÃÕÀ]+(?:[^aeiouáéíóúâêôãõàAEIOUÁÉÍÓÚÂÊÔÃÕÀ\s](?=[^aeiouáéíóúâêôãõàAEIOUÁÉÍÓÚÂÊÔÃÕÀ\s]))?|[^aeiouáéíóúâêôãõàAEIOUÁÉÍÓÚÂÊÔÃÕÀ\s]+$/g) || [w], out = [];
    ps.forEach(p => { if(out.length && !VOG.test(p)) out[out.length - 1] += p; else out.push(p); }); return out.join('·'); }).join(' ');
  L.silabas = silabas;
  const PAPEL = { p: 'Cor da marca', s: 'Apoio', a: 'Acento', ink: 'Tinta', paper: 'Papel' };
  /* v3.84: o papel de cada uma das 9 cores da direção criativa e o tipo de cada jeito de vender */
  const PAPEL_P = { fundo: 'Fundo', texto: 'Texto', voz: 'A cor da marca', apoio: 'Apoio', tempero: 'Tempero', neutro: 'Neutro' };
  const TIPO_N = { ticket: 'Ticket médio', recorrencia: 'Recorrência', retencao: 'Volta', clube: 'Clube', conversao: 'Primeira compra' };
  const codigos = hex => { const rgb = M.rgb255(hex), cm = M.cmyk(hex), l = M.lch(hex); return { hex, rgb: rgb.join(' '), cmyk: cm.join(' '), oklch: `${Math.round(l.l * 100)}% ${(Math.round(l.c * 1000) / 1000).toString().replace('.', ',')} ${Math.round(l.h)}°` }; };
  L.codigos = codigos;
  /* os usos proibidos: o logo estragado de seis jeitos */
  L.proibidos = k => {
    const lg = k.logo, c = k.c, v = M.versaoPrincipal(k.sp), base = M.pinta(lg, v);
    const caixa = (els, vb, fundo) => ({ els, vb, fundo });
    const mm = 0.12 * Math.max(lg.vb.w, lg.vb.h), vb = { x: lg.vb.x - mm, y: lg.vb.y - mm, w: lg.vb.w + 2 * mm, h: lg.vb.h + 2 * mm };
    const cx = lg.vb.x + lg.vb.w / 2, cy = lg.vb.y + lg.vb.h / 2;
    const troca = Object.assign({}, v, { marca: v.acento, acento: v.marca, texto: c.s, tagline: c.s });
    return [
      ['Esticar ou espremer', caixa(M.trEls(base, [1.45, 0, 0, 0.8, -cx * 0.45, cy * 0.2]), vb, v.fundo)],
      ['Girar', caixa(M.trEls(base, mx.r(-14, cx, cy)), vb, v.fundo)],
      ['Trocar as cores', caixa(M.pinta(lg, troca), vb, v.fundo)],
      ['Pôr sombra ou efeito', caixa(M.trEls(base, mx.t(lg.vb.h * 0.05, lg.vb.h * 0.05)).map(e => Object.assign({}, e, { f: e.f ? '#000000' : e.f, s: e.s ? '#000000' : e.s, op: 0.35, furo: false })).concat(base), vb, v.fundo)],
      ['Usar em fundo sem contraste', caixa(M.pinta(lg, Object.assign({}, v, { fundo: M.contraste(c.s, v.marca) < M.contraste(c.a, v.marca) ? c.s : c.a })), vb, M.contraste(c.s, v.marca) < M.contraste(c.a, v.marca) ? c.s : c.a)],
      ['Desenhar só o contorno', caixa(base.map(e => Object.assign({}, e, { s: e.f || e.s, f: null, w: Math.max(2, lg.vb.h * 0.012) })), vb, v.fundo)]
    ];
  };
  /* as assinaturas que valem mostrar: a principal e as outras que são diferentes dela (sem símbolo, horizontal e empilhado = só o nome) */
  L.assinaturas = sp => { const temSimb = !!(sp.simbolo && sp.simbolo.tipo && sp.simbolo.tipo !== 'nenhum'), principal = sp.logo.arranjo || 'horizontal';
    const l = [[principal, M.ARRANJOS[principal] || 'Principal']].concat([['horizontal', 'Horizontal'], ['vertical', 'Empilhado'], ['wordmark', 'Só o nome'], ['simbolo', 'Só o símbolo']]);
    return l.filter((x, i, a) => a.findIndex(y => y[0] === x[0]) === i && (temSimb || i === 0 || !['horizontal', 'vertical'].includes(x[0])) && !(!temSimb && i > 0 && x[0] === 'wordmark' && ['horizontal', 'vertical'].includes(principal))); };
  /* v3.39 · a construção: o logo na grade, com as linhas que o desenharam e as medidas em "x" (a altura da maiúscula) */
  const vx = v => String(Math.round(v * 10) / 10).replace('.', ',') + 'x';
  L.construcao = k => {
    const lg = k.logo, g = lg.guia || {}, c = k.c, v = M.versaoPrincipal(k.sp), vb = lg.vb, mg = Math.max(vb.w, vb.h) * 0.14;
    const box = { x: vb.x - mg, y: vb.y - mg, w: vb.w + 2 * mg, h: vb.h + 2 * mg }, sw = Math.max(box.w, box.h) / 700;
    const acento = M.contraste(c.a, v.fundo) >= 2 ? c.a : M.contraste(c.p, v.fundo) >= 2 ? c.p : c.ink, els = [{ d: F.ret(box.x, box.y, box.w, box.h, 0), f: v.fundo }];
    const passo = 25; for(let x = Math.ceil(box.x / passo) * passo; x <= box.x + box.w; x += passo) els.push({ d: F.linha(x, box.y, x, box.y + box.h), s: c.ink, w: sw * (x % 100 ? 0.5 : 1), f: null, op: x % 100 ? 0.06 : 0.12 });
    for(let y = Math.ceil(box.y / passo) * passo; y <= box.y + box.h; y += passo) els.push({ d: F.linha(box.x, y, box.x + box.w, y), s: c.ink, w: sw * (y % 100 ? 0.5 : 1), f: null, op: y % 100 ? 0.06 : 0.12 });
    M.pintaSobre(lg, v, v.fundo).forEach(e => els.push(e));
    (C.houziFilme ? C.houziFilme.guias(lg) : []).forEach(gd => els.push({ d: gd.d, s: acento, w: sw * 1.6, f: null, op: 0.9 }));
    const medidas = [], texto = [];
    if(g.base != null){
      /* a régua do x, do lado do nome */
      const xr = (g.nome ? g.nome.x : vb.x) - mg * 0.45; els.push({ d: F.linha(xr, g.base, xr, g.cap), s: acento, w: sw * 2.4, f: null }, { d: F.linha(xr - mg * 0.12, g.base, xr + mg * 0.12, g.base), s: acento, w: sw * 2.4, f: null }, { d: F.linha(xr - mg * 0.12, g.cap, xr + mg * 0.12, g.cap), s: acento, w: sw * 2.4, f: null });
      medidas.push(['1x', 'altura da maiúscula: a medida de tudo']);
      if(g.xh != null && Math.abs(g.xh - g.cap) > 8) medidas.push([vx((g.base - g.xh) / 100), 'altura das minúsculas']);
    }
    if(g.simb){ medidas.push([vx(g.simb.h / 100), 'o símbolo']); if(g.nome){ const gap = lg.arranjo === 'vertical' ? g.nome.y - (g.simb.y + g.simb.h) : g.nome.x - (g.simb.x + g.simb.w); if(gap > 0) medidas.push([vx(gap / 100), 'entre o símbolo e o nome']); } }
    if(g.frase) medidas.push([vx(22 / 100), 'a frase (altura da letra)']);
    medidas.push([vx(vb.w / 100) + ' por ' + vx(vb.h / 100), 'o logo inteiro'], ['1x', 'de respiro em volta, sempre']);
    texto.push('A medida de tudo é o x: a altura da letra maiúscula do nome. Com ela o logo se reconstrói em qualquer tamanho, de um favicon a uma fachada, sem ninguém precisar adivinhar proporção.');
    if(g.simb) texto.push(`O símbolo cabe num quadrado de ${vx(g.simb.h / 100)}, com o círculo de dentro e as diagonais marcando o centro; ${lg.arranjo === 'vertical' ? 'o nome fica embaixo, centrado nele' : 'o nome começa depois de um respiro e se apoia na linha de base, com a maiúscula na mesma altura em todas as letras'}.`);
    else texto.push('O nome se apoia na linha de base; a maiúscula bate sempre na mesma altura e as minúsculas na linha do x. A grade é de um quarto de x.');
    return { els, box, medidas, texto, acento };
  };
  L.construcaoSvg = k => { const r = L.construcao(k); return M.svg(r.els, { vb: r.box, titulo: 'A construção do logo' }); };
  /* as combinações: cada cor de texto em cima de cada cor de fundo, com a nota de contraste */
  L.nota = r => r >= 7 ? ['AAA', 'texto'] : r >= 4.5 ? ['AA', 'texto'] : r >= 3 ? ['AA', 'título'] : ['—', 'enfeite'];
  L.combinacoes = c => { const ks = ['paper', 'p', 's', 'a', 'ink']; return ks.map(fundo => ks.map(tinta => fundo === tinta ? null : { fundo, tinta, r: M.contraste(c[tinta], c[fundo]) })); };
  L.dnaSvg = (sp, w, h) => { const d = M.dna(sp), tot = d.reduce((a, x) => a + x.w, 0); let x = 0; const els = d.map(b => { const e = { d: F.ret(x, h * (1 - b.h), b.w / tot * w + 0.4, h * b.h, 0), f: b.c }; x += b.w / tot * w; return e; }); return M.svg(els, { vb: { x: 0, y: 0, w, h } }); };

  /* ---------- #/bb/endereço: o brandbook vivo ---------- */
  C.views.bb = async function(app, slug){
    slug = decodeURIComponent(String(slug || '')).split('?')[0];
    await H.ui();
    const rota = C.rota;
    document.title = 'Brandbook · Studio Houzi';
    document.body.classList.remove('com-lado'); document.body.classList.add('em-bb');
    app.innerHTML = `<main class="bb"><p class="stz-carrega">Abrindo o brandbook…</p></main>`;
    let m = null; try{ m = await H.lerSlug(slug); if(m) await H.lerPrivado(m); }catch(e){}
    if(rota !== C.rota) return;
    if(!m || !m.spec || !m.spec.cores){
      app.innerHTML = `<main class="bb bb-vazio"><div><p class="stz-kick">Studio Houzi</p><h1>Esse brandbook não tá aqui.</h1><p>Ou o link mudou, ou o dono ainda não publicou a marca.</p><a class="stz-btn pri" href="#/houzi">Conhecer o Studio Houzi</a></div></main>`;
      return;
    }
    const k = await L.prepara(m);
    if(rota !== C.rota) return;
    const [fd, ft] = await Promise.all([M.cssPronta(m.spec.tipo.display), M.cssPronta(m.spec.tipo.texto)]);
    if(rota !== C.rota) return;
    const { sp, vs, c, voz } = k, t = M.TERRITORIOS[sp.territorio] || {}, tx = H.textos(m), dono = H.ehLocal(m) || (C.uid() && m.dono === C.uid());
    const fi = M.fonteInfo(sp.tipo.display), fti = M.fonteInfo(sp.tipo.texto), ar = M.arquetipo(sp.pers), vCor = vs.cor, vPri = M.versaoPrincipal(sp);
    document.title = m.nome + ' · Brandbook';
    const svgLogo = (lg, v, o) => M.logoSvg(lg, v, Object.assign({ titulo: m.nome }, o || {}));
    const pars = l => (l || []).map(p => `<p>${esc(p)}</p>`).join('');
    const temNaming = !!(m.naming && m.naming.nome);
    /* v3.41: as personas (o cliente ideal e a marca como gente) vêm logo depois do conceito: a estratégia antes do desenho */
    const P = H.personas(m), li = l => (l || []).map(x => `<li>${esc(x)}</li>`).join('');
    /* a buyer persona (Pra quem) só o dono vê: é estratégia, não vitrine. Quem abre o link vê a brand persona */
    /* v3.84 · a marca que nasceu da direção criativa traz a máquina dela: a direção escolhida (as camadas do nome, a
       ideia, a pergunta, a assinatura, o inimigo, a interação) e a plataforma que a IA escreveu depois (propósito,
       posicionamento, pilares, manifesto em estrofes, voz, nomes de produto, o jeito de vender, os fatos) */
    const MQ = (m.voz && m.voz.maquina && typeof m.voz.maquina === 'object') ? m.voz.maquina : null, DR = (MQ && MQ.direcao) || {}, PL = (MQ && MQ.plataforma) || {};
    const lst = v => Array.isArray(v) ? v : [], SN = PL.sistema_nomes || {};
    const temNome = lst(DR.camadas).length > 0, temPlat = !!(PL.posicionamento || DR.inimigo), temRep = lst(PL.fatos).length > 0, temProd = lst(SN.exemplos).length > 0 || lst(PL.negocio).length > 0;
    const IT = DR.interacao || {}, temAbre = !!(MQ && L.INT[IT.tipo]);
    const secs = (temAbre ? [['abertura', 'A abertura']] : []).concat([['conceito', 'Conceito']]).concat(temNome ? [['nome', 'O nome']] : temNaming ? [['naming', 'Naming']] : []).concat(temPlat ? [['plataforma', 'Plataforma']] : []).concat(temRep ? [['repertorio', 'Repertório']] : []).concat(dono ? [['publico', 'Pra quem']] : []).concat([['persona', 'Se a marca fosse gente'], ['logo', 'Logo'], ['construcao', 'Construção'], ['tipografia', 'Tipografia'], ['cores', 'Cores'], ['elementos', 'Elementos'], ['som', 'Som e movimento'], ['voz', 'Voz']]).concat(temProd ? [['produtos', 'Produtos e negócio']] : []).concat([['pratica', 'Na prática'], ['aplicacoes', 'Aplicações'], ['arquivos', 'Arquivos']]);
    const SOM = C.houziSom, mus = k.musica, PO = C.houziPost, cons = L.construcao(k), link = !H.ehLocal(m) && m.publica ? H.linkLivro(m) : '';
    const corNota = M.contraste(c.p, c.ink) >= 2 ? c.p : M.contraste(c.a, c.ink) >= 2 ? c.a : c.paper;
    const ROT_COR = { paper: 'Papel', p: 'Marca', s: 'Apoio', a: 'Acento', ink: 'Tinta' };
    const num = id => String(secs.findIndex(x => x[0] === id) + 1).padStart(2, '0');
    const cab = (id, nome, sub) => `<header class="bb-h"><span class="bb-n">${num(id)}</span><h2>${esc(nome)}</h2>${sub ? `<p>${esc(sub)}</p>` : ''}</header>`;
    const versoes = ['principal', 'negativo', 'cor', 'preto', 'branco'];
    const arranjos = L.assinaturas(sp);
    const pers = sp.pers || [.5, .5, .5, .5, .5];
    const tela = (lg, v, cls) => `<div class="bb-tela ${cls || ''}" style="background:${esc(v.fundo)}">${svgLogo(lg, v)}</div>`;
    const proib = L.proibidos(k);
    const aplic = L.aplicacoesDe(sp);
    const hd = M.handleDe(m.nome);
    app.innerHTML = `<main class="bb" style="--bb-p:${esc(c.p)};--bb-s:${esc(c.s)};--bb-a:${esc(c.a)};--bb-ink:${esc(c.ink)};--bb-paper:${esc(c.paper)};--bb-fd:'${esc(fd)}';--bb-ft:'${esc(ft)}'">
      <nav class="bb-bar"><a href="#/houzi" class="bb-marca">Studio Houzi</a><span>${esc(H.numero(m))}</span><button type="button" class="bb-bar-b so-ico" data-act="bb-apresenta" title="Apresentar em slides">${ico('tela')}<span class="bb-bar-t">Apresentar</span></button>${dono ? `<a class="bb-bar-b so-ico" href="#/houzi/m/${esc(m.id)}" title="Voltar pra bancada">${ico('edit')}<span class="bb-bar-t">Bancada</span></a><button type="button" class="bb-bar-b" data-act="bb-pdf">${ico('down')} PDF</button><button type="button" class="bb-bar-b" data-act="bb-kit">${ico('down')} Kit</button>` : `<a class="bb-bar-b" href="#/houzi">Fazer a minha</a>`}</nav>
      <section class="bb-capa" id="bb-capa" style="background:${esc(vCor.fundo)};color:${esc(M.texto_em(vCor.fundo, c.ink, c.paper))}">
        <canvas class="bb-filme" aria-hidden="true"></canvas>
        <div class="bb-filme-ctl"><button type="button" data-act="bb-filme" title="Ver de novo">${ico('play')}<span>Ver o filme</span></button>${SOM ? `<button type="button" data-act="bb-filme-som" title="Ver com o som da marca">${ico('som')}<span>Com som</span></button>` : ''}</div>
        <div class="bb-capa-top"><span>Brandbook</span><span>${esc(t.n || '')}</span><span>${esc(new Date(m.created_at || Date.now()).getFullYear())}</span></div>
        <div class="bb-capa-logo">${svgLogo(k.logo, vCor)}</div>
        <div class="bb-capa-pe"><span>${esc(voz.conceito || t.frase || '')}</span></div>
        <div class="bb-dna" aria-hidden="true">${L.dnaSvg(sp, 1200, 40)}</div>
      </section>
      <nav class="bb-indice" aria-label="Neste brandbook">${secs.map(([id, n], i) => `<button type="button" data-act="bb-ir" data-k="${id}"><span>${String(i + 1).padStart(2, '0')}</span>${esc(n)}</button>`).join('')}</nav>

      ${temAbre ? `<section class="bb-sec bb-escuro bb-abre" id="bb-abertura">${cab('abertura', 'A abertura', L.INT[IT.tipo].n + (DR.metafora ? ' · ' + DR.metafora : ''))}
        <div class="bb-int" id="bb-int" data-tipo="${esc(IT.tipo)}"><canvas aria-label="${esc('A abertura da marca: ' + (IT.como || L.INT[IT.tipo].d))}"></canvas></div>
        <div class="bb-int-ctl"><button type="button" class="stz-btn pri" data-act="bb-int-resolve">${esc(IT.nome || L.INT[IT.tipo].b)}</button><button type="button" class="stz-btn" data-act="bb-int-denovo">De novo</button></div>
        <p class="bb-nota">${esc(IT.como || L.INT[IT.tipo].d)}</p></section>` : ''}
      <section class="bb-sec bb-escuro" id="bb-conceito">${cab('conceito', 'Conceito', t.n + ' · ' + t.frase)}
        <blockquote class="bb-quote">${esc(voz.conceito || '')}</blockquote>
        ${DR.assinatura ? `<p class="bb-assina" style="font-family:var(--bb-fd)">${esc(DR.assinatura)}</p>` : ''}
        ${DR.pergunta ? `<p class="bb-pergunta"><span class="bb-k">A pergunta que decide tudo</span>${esc(DR.pergunta)}</p>` : ''}
        ${lst(PL.manifesto_estrofes).length ? `<div class="bb-estrofes">${PL.manifesto_estrofes.map(x => `<p>${esc(x)}</p>`).join('')}</div>` : `<div class="bb-txt bb-manifesto">${pars([voz.manifesto])}</div>`}
        <div class="bb-2"><div class="bb-pers">${M.EIXOS.map((e, i) => `<div class="bb-eixo"><span>${esc(e[0])}</span><i><b style="left:${Math.round(pers[i] * 100)}%"></b></i><span>${esc(e[1])}</span></div>`).join('')}</div>
        <div class="bb-arq"><span class="bb-k">Arquétipo</span><b>${esc(ar.n)}</b><p>${esc(ar.d)}</p></div></div>
      </section>
      ${temNome ? `<section class="bb-sec" id="bb-nome">${cab('nome', 'O nome', DR.metafora ? 'A metáfora · ' + DR.metafora : '')}
        <div class="bb-nome" style="font-family:var(--bb-fd)">${esc(m.nome)}</div>
        ${DR.anatomia ? `<p class="bb-anatomia">${esc(DR.anatomia)}</p>` : ''}
        <p class="bb-k">As camadas: toca em cada uma</p>
        <div class="bb-camadas" role="group" aria-label="As camadas do nome">${DR.camadas.map((x, i) => `<button type="button" class="bb-camada" data-act="bb-camada" data-i="${i}" aria-pressed="${!i}">${esc(x.sentido)}</button>`).join('')}</div>
        <p class="bb-camada-tx" id="bb-camada-tx" aria-live="polite">${esc(DR.camadas[0].explica || '')}</p>
        <div class="bb-anat"><span>${esc(silabas(m.nome))}</span><span>@${esc(hd)}</span><span>${esc(hd)}.com.br</span></div>
        ${tx.naming && tx.naming.length && String(tx.naming.join('')).trim() ? `<div class="bb-txt">${pars(tx.naming)}</div>` : ''}</section>` : ''}
      ${temPlat ? `<section class="bb-sec bb-escuro" id="bb-plataforma">${cab('plataforma', 'Plataforma', PL.essencia ? 'Essência · ' + PL.essencia : '')}
        ${DR.ideia_central ? `<blockquote class="bb-quote">${esc(DR.ideia_central)}</blockquote>` : ''}
        ${PL.proposito || PL.posicionamento ? `<div class="bb-2"><div><p class="bb-k">Propósito</p><div class="bb-txt bb-colado">${pars([PL.proposito])}</div></div><div><p class="bb-k">Posicionamento</p><div class="bb-txt bb-colado">${pars([PL.posicionamento])}</div></div></div>` : ''}
        ${lst(PL.pilares).length ? `<p class="bb-k">Os pilares</p><ol class="bb-pilares">${PL.pilares.map(x => `<li><b>${esc(x.nome)}</b><span>${esc(x.regra)}</span></li>`).join('')}</ol>` : ''}
        ${DR.inimigo ? `<div class="bb-inimigo"><div><span class="bb-k">O inimigo</span><p>${esc(DR.inimigo)}</p></div><i aria-hidden="true">×</i><div><span class="bb-k">O que a marca põe no lugar</span><p>${esc(PL.no_lugar || '')}</p></div></div>` : ''}
        <div class="bb-arq"><span class="bb-k">Arquétipo</span><b>${esc(DR.arquetipo || ar.n)}</b><p>${esc(PL.tensao || ar.d)}</p></div>
        ${MQ.estado !== 'ok' && dono ? `<p class="bb-nota">A plataforma ainda não foi escrita inteira. Abre a bancada pra terminar.</p>` : ''}</section>` : ''}
      ${temRep ? `<section class="bb-sec" id="bb-repertorio">${cab('repertorio', 'Repertório', 'O que sustenta a marca')}
        <ul class="bb-fatos">${PL.fatos.map(x => `<li>${esc(x.fato)}${x.certeza === 'mais_contada' ? '<small>a história mais contada</small>' : ''}</li>`).join('')}</ul>
        <p class="bb-nota">O que vem marcado como "a história mais contada" é o que se conta por aí: confere antes de usar em campanha.</p></section>` : ''}
      ${temNaming && !temNome ? `<section class="bb-sec" id="bb-naming">${cab('naming', 'Naming', (M.ESTRATEGIAS[m.naming.estrategia] || {}).n || '')}
        <div class="bb-nome" style="font-family:var(--bb-fd)">${esc(m.naming.nome)}</div>
        <div class="bb-anat"><span>${esc(silabas(m.naming.nome))}</span><span>@${esc(hd)}</span><span>${esc(hd)}.com.br</span></div>
        <div class="bb-txt">${pars(tx.naming)}</div></section>` : ''}

      ${dono ? `<section class="bb-sec bb-persona-b" id="bb-publico">${cab('publico', 'Pra quem', 'Buyer persona · o cliente ideal')}
        <div class="bb-2"><div class="bb-arq"><span class="bb-k">Cliente ideal</span><b>${esc(P.buyer.nome)}</b><p>${esc(P.buyer.perfil)}</p>${P.buyer.frase ? `<p class="bb-fala">“${esc(P.buyer.frase)}”</p>` : ''}</div>
          <div><p class="bb-k">O que procura</p><ul class="bb-lista">${li(P.buyer.quer)}</ul><p class="bb-k">O que incomoda hoje</p><ul class="bb-lista">${li(P.buyer.dores)}</ul></div></div>
        <div class="bb-2"><div><p class="bb-k">Onde encontra a marca</p><ul class="bb-lista">${li(P.buyer.onde)}</ul></div><div><p class="bb-k">O que faz escolher e voltar</p><div class="bb-txt bb-colado">${pars([P.buyer.decide])}</div></div></div>
        <p class="bb-nota">Uma pessoa inventada que resume quem compra: é retrato pra guiar a comunicação, não pesquisa. ${ico('lock')} Só você vê esta parte: quem abre o link do brandbook não vê o cliente ideal.</p>
      </section>` : ''}
      <section class="bb-sec bb-escuro bb-persona-g" id="bb-persona">${cab('persona', 'Se a marca fosse gente', 'Brand persona · ' + (P.brand.arquetipo || ''))}
        ${P.brand.frase ? `<blockquote class="bb-quote">${esc(P.brand.frase)}</blockquote>` : ''}
        <div class="bb-txt">${pars([P.brand.retrato])}</div>
        <div class="bb-2"><div><p class="bb-k">Como age</p><ul class="bb-lista">${li(P.brand.jeito)}</ul></div><div><p class="bb-k">Do que gosta</p><ul class="bb-lista">${li(P.brand.gosta)}</ul></div></div>
        <p class="bb-k bb-com">Com ${esc(dono && P.buyer.nome ? P.buyer.nome : 'o cliente')}</p><div class="bb-txt bb-colado">${pars([P.brand.com_o_cliente])}</div>
      </section>

      <section class="bb-sec" id="bb-logo">${cab('logo', 'Logo')}
        ${tela(k.logo, vPri, 'grande')}
        <div class="bb-txt">${pars(tx.logo)}</div>
        <h3 class="bb-h3">Versões</h3><div class="bb-versoes">${versoes.map(vk => `<figure>${tela(k.logo, vs[vk])}<figcaption>${esc(vs[vk].n)}</figcaption></figure>`).join('')}</div>
        <h3 class="bb-h3">Assinaturas</h3><div class="bb-versoes">${arranjos.map(([a, n]) => `<figure>${tela(M.logo(sp, k.fs, a), vPri)}<figcaption>${esc(n)}</figcaption></figure>`).join('')}</div>
        <h3 class="bb-h3">Respiro e tamanho mínimo</h3>
        <div class="bb-2"><div class="bb-tela bb-respiro" style="background:${esc(vPri.fundo)}">${M.logoSvg(k.logo, vPri, { margem: 100, extra: `<rect x="${k.logo.vb.x - 100}" y="${k.logo.vb.y - 100}" width="${k.logo.vb.w + 200}" height="${k.logo.vb.h + 200}" fill="none" stroke="${esc(c.a)}" stroke-width="3" stroke-dasharray="14 10"/><rect x="${k.logo.vb.x}" y="${k.logo.vb.y}" width="${k.logo.vb.w}" height="${k.logo.vb.h}" fill="none" stroke="${esc(c.a)}" stroke-width="1.5" opacity=".6"/>` })}</div>
        <div class="bb-txt"><p>Em volta do logo, sempre um respiro do tamanho da letra maiúscula do nome (a medida <b>x</b>, marcada na linha tracejada). Nada entra nesse espaço: nem texto, nem foto, nem borda.</p><p>Tamanho mínimo: 24 pixels de altura na tela e 1,5 cm impresso. Menor que isso, usa o símbolo sozinho.</p><div class="bb-min" style="background:${esc(vPri.fundo)}">${M.logoSvg(k.logo, vPri, { w: 120 })}${M.logoSvg(k.simb, vPri, { w: 28 })}</div></div></div>
        <h3 class="bb-h3">O que não fazer</h3><div class="bb-proib">${proib.map(([n, x]) => `<figure><div class="bb-tela" style="background:${esc(x.fundo)}">${M.svg(x.els, { vb: x.vb })}<i class="bb-x" aria-hidden="true"></i></div><figcaption>${esc(n)}</figcaption></figure>`).join('')}</div>
      </section>

      <section class="bb-sec" id="bb-construcao">${cab('construcao', 'Construção', 'A grade, as linhas e as medidas que desenharam o logo')}
        <div class="bb-constr">${M.svg(cons.els, { vb: cons.box, titulo: 'A construção do logo' })}</div>
        <ul class="bb-medidas">${cons.medidas.map(([v2, r]) => `<li><b>${esc(v2)}</b><span>${esc(r)}</span></li>`).join('')}</ul>
        <div class="bb-txt">${pars(cons.texto)}</div>
      </section>

      <section class="bb-sec bb-tipo" id="bb-tipografia">${cab('tipografia', 'Tipografia')}
        <div class="bb-2"><div class="bb-aa" style="font-family:var(--bb-fd)">Aa</div>
          <div><p class="bb-k">Letra da marca</p><h3 class="bb-fnome" style="font-family:var(--bb-fd)">${esc(fi.k || fi.n)}</h3><p class="bb-fonte-o">${esc(fi.id === 'pixel' ? 'Desenhada aqui no Studio Houzi' : 'Derivada da ' + fi.o)}</p>
          <p class="bb-abc" style="font-family:var(--bb-fd)">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz<br>0123456789 !?&amp;@ ÁÉÍÓÚ ÃÕ Ç</p></div></div>
        <div class="bb-txt">${pars(tx.tipografia)}</div>
        <div class="bb-hier"><p class="bb-k">Letra de texto · ${esc(fti.k || fti.n)}</p>
          <p style="font-family:var(--bb-fd);font-size:44px;line-height:1.05">${esc(voz.taglines && voz.taglines[0] || m.nome)}</p>
          <p style="font-family:var(--bb-ft);font-size:22px;line-height:1.3">${esc(voz.conceito || '')}</p>
          <p style="font-family:var(--bb-ft);font-size:16px;line-height:1.55;max-width:64ch">${esc(voz.manifesto || '')}</p></div>
        <label class="bb-teste"><span class="bb-k">Escreve aqui pra testar</span><input type="text" value="${esc(m.nome)}" maxlength="60" style="font-family:var(--bb-fd)" aria-label="Testar a letra da marca"></label>
      </section>

      <section class="bb-sec" id="bb-cores">${cab('cores', 'Cores', sp.cores.receita ? 'Paleta ' + sp.cores.receita : '')}
        <div class="bb-cores">${['p', 's', 'a', 'ink', 'paper'].map(kk => { const cc = codigos(c[kk]); return `<div class="bb-cor" style="background:${esc(c[kk])};color:${esc(M.texto_em(c[kk], '#111111', '#FFFFFF'))}"><span class="bb-k">${esc(PAPEL[kk])}</span><b>${esc(M.nomeCor(c[kk], sp.nome))}</b><dl><dt>HEX</dt><dd>${esc(cc.hex)}</dd><dt>RGB</dt><dd>${esc(cc.rgb)}</dd><dt>CMYK</dt><dd>${esc(cc.cmyk)}</dd><dt>OKLCH</dt><dd>${esc(cc.oklch)}</dd></dl></div>`; }).join('')}</div>
        ${lst(sp.paleta).some(x => x.uso) ? `<div class="bb-prop" aria-label="A proporção das cores">${sp.paleta.filter(x => /^#[0-9a-f]{6}$/i.test(String(x.hex))).map(x => `<i style="flex:${Math.max(1, Number(x.uso) || 1)};background:${esc(x.hex)}" title="${esc(x.nome)} · ${Number(x.uso) || 0}%"></i>`).join('')}</div>` : `<div class="bb-prop" aria-label="A proporção das cores"><i style="flex:60;background:${esc(c.paper)}"></i><i style="flex:25;background:${esc(c.p)}"></i><i style="flex:10;background:${esc(c.s)}"></i><i style="flex:5;background:${esc(c.a)}"></i></div>`}
        <div class="bb-txt">${pars(tx.cores)}</div>
        <h3 class="bb-h3">Combinações</h3>
        <p class="bb-nota">Cada cor de texto (nas colunas) em cima de cada cor de fundo (nas linhas), com a nota de leitura: AAA e AA seguram texto corrido; AA título, só letra grande; o resto é enfeite.</p>
        <div class="bb-comb" role="table" aria-label="Combinações de cor"><span class="bb-comb-k top"></span>${['paper', 'p', 's', 'a', 'ink'].map(kk => `<span class="bb-comb-k top">${esc(ROT_COR[kk])}</span>`).join('')}
          ${L.combinacoes(c).map((linha, i) => `<span class="bb-comb-k">${esc(ROT_COR[['paper', 'p', 's', 'a', 'ink'][i]])}</span>${linha.map(x => { if(!x) return '<span class="bb-comb-c vazio"></span>'; const nt = L.nota(x.r); return `<span class="bb-comb-c${x.r < 3 ? ' nao' : ''}" style="background:${esc(c[x.fundo])};color:${esc(c[x.tinta])}" title="${esc(ROT_COR[x.tinta])} em ${esc(ROT_COR[x.fundo])}"><b>Aa</b><small>${String(Math.round(x.r * 10) / 10).replace('.', ',')}:1 · ${esc(nt[0])} ${esc(nt[1])}</small></span>`; }).join('')}`).join('')}
        </div>
        ${lst(sp.paleta).length ? `<h3 class="bb-h3">A paleta inteira</h3><div class="bb-pal9">${sp.paleta.filter(x => /^#[0-9a-f]{6}$/i.test(String(x.hex))).map(x => `<div class="bb-pal9-c"><i style="background:${esc(x.hex)}"></i><div><b>${esc(x.nome)}</b><small>${esc(PAPEL_P[x.papel] || '')}${x.uso ? ' · ' + Number(x.uso) + '%' : ''} · ${esc(String(x.hex).toUpperCase())}</small>${x.historia ? `<p>${esc(x.historia)}</p>` : ''}</div></div>`).join('')}</div>
          ${sp.modos && (sp.modos.claro || sp.modos.escuro) ? `<p class="bb-nota">Os dois modos da marca: <b>${esc(sp.modos.claro || 'claro')}</b>, no fundo claro, e <b>${esc(sp.modos.escuro || 'escuro')}</b>, no fundo escuro.</p>` : ''}` : ''}
      </section>

      <section class="bb-sec bb-escuro" id="bb-elementos">${cab('elementos', 'Elementos', (M.TEXTURAS || {})[sp.textura] ? 'Textura: ' + M.TEXTURAS[sp.textura] : '')}
        <div class="bb-padrao" style="background:${esc(c.p)}">${M.svg(padrao(k.simb, vs.cor, 0, 0, 1200, 520, c.p, 130), { vb: { x: 0, y: 0, w: 1200, h: 520 } })}</div>
        <div class="bb-txt">${pars(tx.elementos)}</div>
        <div class="bb-dna grande" aria-hidden="true">${L.dnaSvg(sp, 1200, 90)}</div>
      </section>

      <section class="bb-sec bb-escuro" id="bb-som">${cab('som', 'Som e movimento', mus ? 'Assinatura sonora · ' + mus.genero.g : '')}
        <div class="bb-2"><div>
          ${mus ? `<div class="bb-partitura" id="bb-partitura">${M.svg(SOM.partituraEls(mus, 720, 250, { nota: corNota, acorde: c.paper, linha: c.paper, texto: c.paper }, k.fs.texto), { vb: { x: 0, y: 0, w: 720, h: 250 }, titulo: 'A assinatura sonora' })}</div>
          <div class="bb-som-k"><span>Escala ${esc(mus.escala.n)} em ${esc(mus.nomeTom)}</span><span>${mus.bpm} bpm</span><span>Acorde final: ${esc(mus.acorde.nome)}</span></div>
          <div class="bb-som-acts"><button type="button" class="stz-btn pri" data-act="bb-ouvir">${ico('play')} Ouvir</button>${dono ? `<button type="button" class="stz-btn" data-act="bb-wav">${ico('down')} Baixar o som (WAV)</button>` : ''}</div>
          <div class="bb-txt">${pars(SOM.explica(mus, sp))}</div>` : '<p class="bb-nota">O som da marca não carregou aqui.</p>'}
        </div><div>
          <div class="bb-filme-q" id="bb-filme-q"><canvas width="1080" height="1080" aria-label="O filme da marca"></canvas><button type="button" data-act="bb-filme-q">${ico('play')} Ver o filme com som</button></div>
          ${dono ? `<div class="bb-som-acts"><button type="button" class="stz-btn" data-act="bb-video" data-f="quadrado">${ico('down')} Vídeo pro feed</button><button type="button" class="stz-btn" data-act="bb-video" data-f="vertical">${ico('down')} Vídeo pro story</button></div>` : ''}
          <div class="bb-txt"><p>O movimento da marca: a grade aparece, as linhas de construção se desenham, o logo é traçado peça por peça (o símbolo primeiro, depois cada letra) e, no acorde, a cor da marca inunda a tela a partir do símbolo. É a abertura deste brandbook, a vinheta dos vídeos e o jeito de qualquer animação da marca: devagar no traço, decidida na cor.</p></div>
        </div></div>
      </section>

      <section class="bb-sec" id="bb-voz">${cab('voz', 'Voz')}
        <div class="bb-2"><div><p class="bb-k">A marca é</p><ul class="bb-lista">${(voz.e || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul><p class="bb-k">Fala assim</p><ul class="bb-lista">${(voz.fala || []).map(x => `<li>“${esc(x)}”</li>`).join('')}</ul></div>
          <div><p class="bb-k">A marca não é</p><ul class="bb-lista nao">${(voz.nao_e || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul><p class="bb-k">Nunca fala assim</p><ul class="bb-lista nao">${(voz.nao_fala || []).map(x => `<li>“${esc(x)}”</li>`).join('')}</ul></div></div>
        <p class="bb-k">Frases</p><ul class="bb-frases" style="font-family:var(--bb-fd)">${(voz.taglines || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        <div class="bb-2"><div class="bb-bio"><p class="bb-k">Bio do Instagram</p><p>${esc(voz.bio || '')}</p></div><div class="bb-wa"><p class="bb-k">Boas-vindas do WhatsApp</p><p class="bb-balao">${esc(voz.wa || '')}</p></div></div>
        ${lst(PL.principios).length ? `<p class="bb-k">Princípios</p><ol class="bb-pilares bb-princ">${PL.principios.map(x => `<li><span>${esc(x)}</span></li>`).join('')}</ol>` : ''}
        ${lst(PL.usa).length || lst(PL.evita).length ? `<div class="bb-2"><div><p class="bb-k">Palavras da marca</p><p class="bb-pal">${lst(PL.usa).map(x => `<span>${esc(x)}</span>`).join('')}</p></div><div><p class="bb-k">Palavras que ela não usa</p><p class="bb-pal nao">${lst(PL.evita).map(x => `<span>${esc(x)}</span>`).join('')}</p></div></div>` : ''}
        ${lst(PL.exemplos).length ? `<p class="bb-k">Todo mundo fala assim · ${esc(m.nome)} fala assim</p><div class="bb-gxm">${PL.exemplos.map(x => `<div><p class="g">${esc(x.generico)}</p><p class="m">${esc(x.marca)}</p></div>`).join('')}</div>` : ''}
        <div class="bb-detector"><label><span class="bb-k">Detector de clichê</span><textarea id="bb-det" rows="3" maxlength="1200" placeholder="Cola aqui uma legenda, um texto do site, um anúncio…"></textarea></label><div class="bb-det-r" id="bb-det-r" aria-live="polite"><p class="bb-nota">Cola um texto: o detector marca o clichê de marketing${lst(PL.evita).length ? ' e as palavras que essa marca não usa' : ''}, e sugere o jeito dela.</p></div></div>
      </section>
      ${temProd ? `<section class="bb-sec" id="bb-produtos">${cab('produtos', 'Produtos e negócio')}
        ${SN.regra || lst(SN.exemplos).length ? `<p class="bb-k">Como os produtos se chamam</p>${SN.regra ? `<div class="bb-txt bb-colado">${pars([SN.regra])}</div>` : ''}<div class="bb-prods">${lst(SN.exemplos).map(x => `<div class="bb-prod"><b style="font-family:var(--bb-fd)">${esc(x.nome)}</b><span>${esc(x.o_que)}</span></div>`).join('')}</div>` : ''}
        ${lst(PL.negocio).length ? `<p class="bb-k">O jeito de vender</p><div class="bb-negocio">${PL.negocio.map(x => `<div><span class="bb-k">${esc(TIPO_N[x.tipo] || '')}</span><b>${esc(x.nome)}</b><p>${esc(x.como)}</p></div>`).join('')}</div>` : ''}
        <p class="bb-nota">Nome e preço de produto aqui são ideia pra começar: confere com o que o negócio vende de verdade antes de pôr na rua.</p></section>` : ''}

      ${PO ? `<section class="bb-sec" id="bb-pratica">${cab('pratica', 'Na prática', 'O brandbook que faz post')}
        <div class="bb-pg"><div class="bb-pg-ctrl">
          <label><span class="bb-k">A frase</span><textarea id="bb-pg-t" maxlength="140" rows="3">${esc(PO.fraseDe(k))}</textarea></label>
          <label><span class="bb-k">Detalhe, preço ou chamada <em>(opcional)</em></span><input id="bb-pg-d" maxlength="60" placeholder="Ex.: Sexta, 19h · Chama no direct"></label>
          <div><span class="bb-k">O jeito</span><div class="bb-seg" role="group" aria-label="O modelo">${Object.entries(PO.MODELOS).map(([kk, n2], i) => `<button type="button" data-act="bb-pg-mod" data-k="${kk}" aria-pressed="${!i}">${esc(n2)}</button>`).join('')}</div></div>
          <div><span class="bb-k">O formato</span><div class="bb-seg" role="group" aria-label="O formato">${Object.entries(PO.FORMATOS).map(([kk, x], i) => `<button type="button" data-act="bb-pg-fmt" data-k="${kk}" aria-pressed="${!i}">${esc(x[2])}</button>`).join('')}</div></div>
          ${dono ? `<div class="bb-som-acts"><button type="button" class="stz-btn pri" data-act="bb-pg-baixa">${ico('down')} Baixar em PNG</button></div>` : `<p class="bb-nota">Escreve e vê a marca falando. Quem baixa é o dono da marca.</p>`}
          <p class="bb-nota">A letra, as cores, o símbolo e o tamanho da frase saem do brandbook: escreve o que quiser e a marca continua sendo ela.</p>
        </div><figure class="bb-pg-prev" id="bb-pg-prev" aria-live="polite"></figure></div>
      </section>` : ''}

      <section class="bb-sec" id="bb-aplicacoes">${cab('aplicacoes', 'Aplicações')}
        <div class="bb-txt">${pars(tx.aplicacoes)}</div>
        <div class="bb-mocks">${aplic.map(a => { const r = L.mock(a, k); return `<figure>${r.svg}<figcaption>${esc(L.MOCKS[a] || a)}</figcaption></figure>`; }).join('')}</div>
      </section>

      <section class="bb-sec bb-escuro" id="bb-arquivos">${cab('arquivos', 'Arquivos')}
        ${dono ? `<div class="bb-baixa"><button type="button" class="stz-btn pri" data-act="bb-kit">${ico('down')} Kit da marca (ZIP)</button><button type="button" class="stz-btn" data-act="bb-pdf">${ico('down')} Brandbook em PDF</button></div>
        <ul class="bb-entrega">
          <li><b>Logo</b>5 versões e as assinaturas, em SVG, PNG e PDF pra gráfica.</li>
          <li><b>Filme</b>O logo animado com o som, em vídeo pro feed e pro story.</li>
          <li><b>Som</b>A assinatura sonora em WAV, pra vinheta, reels e espera de telefone.</li>
          <li><b>Modelos</b>Posts e stories prontos e as capas de destaque do Instagram.</li>
          <li><b>Impressos</b>Cartão de visita com sangria e papel timbrado, em PDF vetor.</li>
          <li><b>Cores e letras</b>Paleta pra Photoshop, Illustrator, Figma (CSS e JSON) e GIMP; as letras com as licenças.</li>
          <li><b>Redes</b>Avatar, capa e favicon.</li>
          <li><b>Textos</b>A voz e as personas em texto, pra copiar na legenda, no site e no briefing.</li>
          <li><b>Brandbook</b>Este manual em PDF, com QR que abre a versão viva.</li>
        </ul>
        ${link && M.qrSvg ? `<div class="bb-qr"><span>${M.qrSvg(link, { titulo: 'QR do brandbook' })}</span><p>Aponta a câmera: abre este brandbook, com o filme, o som e o gerador de post. Vai também no PDF e no cartão de visita.</p></div>` : `<p class="bb-nota">Publica a marca pra ganhar o QR que abre este brandbook (ele vai no PDF e no cartão).</p>`}` : `<p class="bb-nota">Esse brandbook foi feito no Studio Houzi, dentro do Corre.</p><a class="stz-btn pri" href="#/houzi">Fazer a minha marca</a>`}
        ${temNaming ? `<p class="bb-k">Antes de registrar o nome</p><ul class="bb-checa"><li><a href="https://www.instagram.com/${encodeURIComponent(hd)}/" target="_blank" rel="noopener">@${esc(hd)} no Instagram ${ico('ext')}</a></li><li><a href="https://registro.br/" target="_blank" rel="noopener">${esc(hd)}.com.br no Registro.br ${ico('ext')}</a></li><li><a href="https://busca.inpi.gov.br/pePI/" target="_blank" rel="noopener">A marca no INPI ${ico('ext')}</a></li></ul>` : ''}
      </section>
      <footer class="bb-rod"><span>${esc(m.nome)}</span><span>Brandbook feito no Studio Houzi · Corre</span></footer>
      <div class="bb-show-ctl" role="toolbar" aria-label="Apresentação"><button type="button" data-act="bb-show-ant" aria-label="Anterior">${ico('prev')}</button><span id="bb-show-n">1</span><button type="button" data-act="bb-show-prox" aria-label="Próximo">${ico('next')}</button><button type="button" data-act="bb-show-sai" aria-label="Sair da apresentação">${ico('x')}</button></div>
    </main>`;
    const teste = app.querySelector('.bb-teste input'); if(teste){ const alvo = document.createElement('p'); alvo.className = 'bb-teste-v'; alvo.style.fontFamily = 'var(--bb-fd)'; alvo.textContent = teste.value; teste.parentElement.appendChild(alvo); teste.addEventListener('input', () => { alvo.textContent = teste.value; }); }
    L.atual = m; L.k = k;
    /* o gerador de post */
    L.pg = { mod: 'manchete', fmt: 'post' };
    const pgT = C.$('bb-pg-t'), pgD = C.$('bb-pg-d'); let pgTimer = 0;
    if(pgT){ L.pgDesenha(); [pgT, pgD].forEach(el => el.addEventListener('input', () => { clearTimeout(pgTimer); pgTimer = setTimeout(L.pgDesenha, 120); })); }
    /* o filme da capa (sem som; com som no botão). Quem pediu menos movimento vê o logo parado */
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches) requestAnimationFrame(() => L.filmeCapa(false));
    L.posterQ();
    /* v3.84: as estrofes do manifesto acendem com a rolagem; o detector de clichê; a abertura */
    L.depois(app, { MQ, DR, PL, IT, temAbre });
  };
  /* ---------- v3.84 · A ABERTURA: a interação-assinatura que É o conceito (o §5 do prompt-motor do Thales) ----------
     Quatro jeitos, a direção criativa escolhe um: o pó que forma o nome, o estêncil que o spray pinta, a vela que acha o
     nome no escuro e os blocos que caem e montam. O logo (vetor) vira imagem num canvas fora da tela e a interação usa
     os pixels dele (a cor de cada ponto é a do logo). Mouse e dedo (o dedo arrastando de pé continua rolando a página:
     touch-action pan-y), nasce bonita parada (serve de print), tem piloto automático, pausa fora da tela e para de
     desenhar quando assenta. Quem pediu menos movimento vê o logo pronto. */
  L.INT = {
    po: { n: 'Pó', b: 'Assentar', d: 'Passa o dedo (ou o mouse) e o pó voa; ele volta e forma o nome.' },
    estencil: { n: 'Estêncil', b: 'Pintar tudo', d: 'Passa o dedo (ou o mouse) pra pintar: o spray só pega onde o molde deixa.' },
    vela: { n: 'Vela', b: 'Acender', d: 'A página tá no escuro: a luz segue o dedo (ou o mouse) e acha o nome.' },
    blocos: { n: 'Blocos', b: 'Montar', d: 'As peças caem e se encaixam. Toca nelas pra desmontar: elas voltam pro lugar.' }
  };
  let INT = null;
  const imgDoSvg = svg => new Promise((ok, falha) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => falha(new Error('svg')); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
  const rgbDe = hex => M.rgb255(hex).join(',');
  L.intEstado = () => INT ? INT.estado() : null;
  L.abreInt = async (k, it) => {
    if(INT) INT.para();
    const box = C.$('bb-int'); if(!box || !k) return;
    const cv = box.querySelector('canvas'), g = cv.getContext('2d'), tipo = it.tipo, menos = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const vs = M.versoes(k.c), v = tipo === 'blocos' ? vs.cor : vs.negativo, fundo = v.fundo, fundoRgb = rgbDe(fundo);
    box.style.background = fundo;
    const S = { vivo: true, visivel: false, raf: 0, ponto: null, ult: 0, quieto: false, comecou: false, t: 0, n: 0 };
    let W = 0, H = 0, dpr = 1, logo = null, md = null, lb = null, P = null;
    const em = (x, y) => { x |= 0; y |= 0; return x >= 0 && y >= 0 && x < W && y < H && md[(y * W + x) * 4 + 3] > 120; };
    const corEm = (x, y) => { const i = (((y | 0) * W) + (x | 0)) * 4; return `rgb(${md[i]},${md[i + 1]},${md[i + 2]})`; };
    const monta = async () => {
      const r = box.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(2, Math.round(r.width * dpr)); H = Math.max(2, Math.round(r.height * dpr)); cv.width = W; cv.height = H;
      const lg = k.logo, vb = lg.vb, e = Math.min(W * 0.74 / vb.w, H * 0.5 / vb.h), lw = Math.max(1, Math.round(vb.w * e)), lh = Math.max(1, Math.round(vb.h * e));
      const im = await imgDoSvg(M.logoSvg(lg, v, { margem: 0, w: lw, h: lh }));
      logo = document.createElement('canvas'); logo.width = W; logo.height = H;
      const lc = logo.getContext('2d'), x0 = Math.round((W - lw) / 2), y0 = Math.round((H - lh) / 2);
      lc.drawImage(im, x0, y0, lw, lh); md = lc.getImageData(0, 0, W, H).data; lb = { x: x0, y: y0, w: lw, h: lh };
    };
    /* ---- os quatro jeitos: cada um tem o estado de partida (o print), o começo (o piloto), o passo, o desenho, resolver e de novo ---- */
    const J = {
      po: {
        cria(){ const passo = Math.max(2, Math.round(Math.sqrt(lb.w * lb.h / 6500))), grupos = {}; let n = 0;
          for(let y = lb.y; y < lb.y + lb.h; y += passo) for(let x = lb.x; x < lb.x + lb.w; x += passo){ if(!em(x, y)) continue; const c = corEm(x, y); (grupos[c] = grupos[c] || []).push({ tx: x, ty: y, x, y, vx: 0, vy: 0 }); n++; }
          P = { passo, grupos: Object.entries(grupos), n, forte: false }; },
        comeca(){ /* uma rajada atravessa o nome e o pó volta sozinho */ P.grupos.forEach(([, l]) => l.forEach(q => { const a = Math.random() * Math.PI * 2, f = (6 + Math.random() * 18) * dpr; q.vx = Math.cos(a) * f + 10 * dpr; q.vy = Math.sin(a) * f; })); },
        passo(){ const k2 = P.forte ? 0.2 : 0.035, at = P.forte ? 0.62 : 0.88, R = 74 * dpr; let mov = 0;
          P.grupos.forEach(([, l]) => l.forEach(q => { q.vx += (q.tx - q.x) * k2; q.vy += (q.ty - q.y) * k2;
            if(S.ponto){ const dx = q.x - S.ponto.x, dy = q.y - S.ponto.y, d2 = dx * dx + dy * dy; if(d2 < R * R){ const d = Math.sqrt(d2) || 1, f = (1 - d / R) * 7 * dpr; q.vx += dx / d * f + (Math.random() - .5) * dpr; q.vy += dy / d * f + (Math.random() - .5) * dpr; } }
            q.vx *= at; q.vy *= at; q.x += q.vx; q.y += q.vy; mov += Math.abs(q.vx) + Math.abs(q.vy) + Math.abs(q.tx - q.x) * .02 + Math.abs(q.ty - q.y) * .02; }));
          if(mov / Math.max(1, P.n) < 0.03 && !S.ponto){ P.grupos.forEach(([, l]) => l.forEach(q => { q.x = q.tx; q.y = q.ty; q.vx = q.vy = 0; })); P.forte = false; return true; } return false; },
        desenha(){ g.fillStyle = fundo; g.fillRect(0, 0, W, H); const sz = P.passo * 0.92; P.grupos.forEach(([c, l]) => { g.fillStyle = c; l.forEach(q => g.fillRect(q.x, q.y, sz, sz)); }); },
        resolve(){ P.forte = true; },
        denovo(){ P.forte = false; P.grupos.forEach(([, l]) => l.forEach(q => { q.x = Math.random() * W; q.y = Math.random() * H; q.vx = q.vy = 0; })); },
        pronto(){ return P.grupos.every(([, l]) => l.every(q => q.x === q.tx && q.y === q.ty)); }
      },
      estencil: {
        cria(){ const cel = Math.max(4, Math.round(6 * dpr)), cs = Math.ceil(W / cel), ls = Math.ceil(H / cel), dentro = new Uint8Array(cs * ls), feito = new Uint8Array(cs * ls); let total = 0;
          for(let j = 0; j < ls; j++) for(let i = 0; i < cs; i++) if(em(i * cel + cel / 2, j * cel + cel / 2)){ dentro[j * cs + i] = 1; total++; }
          const m2 = Math.round(Math.min(lb.w, lb.h) * 0.14);
          P = { cel, cs, dentro, feito, total, pintou: 0, cartao: { x: lb.x - m2, y: lb.y - m2, w: lb.w + 2 * m2, h: lb.h + 2 * m2 }, bico: null, rapido: false, pingos: [], hits: new Uint16Array(cs * ls) };
          this.base(); },
        base(){ /* o print: o cartão do molde com o nome recortado, quase sem tinta */
          const c2 = P.cartao, rr = Math.min(14 * dpr, c2.h * .1); g.fillStyle = fundo; g.fillRect(0, 0, W, H);
          g.fillStyle = `rgba(${rgbDe(k.c.paper)},0.07)`; g.beginPath(); if(g.roundRect) g.roundRect(c2.x, c2.y, c2.w, c2.h, rr); else g.rect(c2.x, c2.y, c2.w, c2.h); g.fill();
          g.globalAlpha = 0.13; g.drawImage(logo, 0, 0); g.globalAlpha = 1; },
        comeca(){ P.bico = { x: P.cartao.x, y: lb.y + lb.h * 0.12, dir: 1, linha: 0 }; },
        jato(x, y, n){ const R = 22 * dpr, c2 = P.cartao;
          for(let q = 0; q < n; q++){ const a = Math.random() * Math.PI * 2, r = Math.abs((Math.random() + Math.random() + Math.random()) / 3 - .5) * 2 * R, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
            if(em(px, py)){ g.fillStyle = corEm(px, py); const s = (0.8 + Math.random() * 1.6) * dpr; g.fillRect(px - s / 2, py - s / 2, s, s);
              const ci = ((py / P.cel) | 0) * P.cs + ((px / P.cel) | 0); if(P.dentro[ci] && !P.feito[ci]){ P.feito[ci] = 1; P.pintou++; }
              if(P.dentro[ci] && ++P.hits[ci] === 22 && Math.random() < 0.18) P.pingos.push({ x: px, y: py, c: corEm(px, py), resta: (6 + Math.random() * 20) * dpr }); }
            else if(px > c2.x && px < c2.x + c2.w && py > c2.y && py < c2.y + c2.h && Math.random() < 0.3){ g.fillStyle = `rgba(${rgbDe(k.c.paper)},0.16)`; g.fillRect(px, py, dpr, dpr); } } },
        passo(){
          if(S.ponto) this.jato(S.ponto.x, S.ponto.y, 150);
          else if(P.bico){ const b = P.bico, vel = (P.rapido ? 0.07 : 0.022) * P.cartao.w; for(let s = 0; s < (P.rapido ? 4 : 1); s++){ this.jato(b.x, b.y, P.rapido ? 160 : 120); b.x += b.dir * vel / (P.rapido ? 4 : 1); }
            if(b.x > P.cartao.x + P.cartao.w || b.x < P.cartao.x){ b.dir *= -1; b.linha++; b.y += Math.max(10 * dpr, lb.h * (P.rapido ? .16 : .11)); if(b.y > lb.y + lb.h * 1.05) b.y = lb.y + lb.h * 0.06; } }
          /* o escorrido: o pingo desce enquanto tá dentro do molde */
          P.pingos = P.pingos.filter(p => { if(p.resta <= 0 || !em(p.x, p.y + dpr)) return false; g.fillStyle = p.c; g.fillRect(p.x - .6 * dpr, p.y, 1.3 * dpr, 1.6 * dpr); p.y += 1.2 * dpr; p.resta -= 1.2 * dpr; return true; });
          if(P.pintou >= P.total * 0.985 && !S.ponto){ this.acaba(); return true; } return false; },
        acaba(){ g.drawImage(logo, 0, 0); P.pintou = P.total; P.bico = null; P.pingos = []; },
        desenha(){}, resolve(){ P.rapido = true; if(!P.bico) this.comeca(); }, denovo(){ P.feito.fill(0); P.hits.fill(0); P.pintou = 0; P.rapido = false; P.pingos = []; this.base(); this.comeca(); },
        pronto(){ return P.pintou >= P.total; }
      },
      vela: {
        cria(){ P = { esc: document.createElement('canvas'), luz: { x: W / 2, y: H / 2 }, r: Math.max(80 * dpr, lb.h * 0.75), alvo: null, acesa: false, tp: 0 }; P.esc.width = W; P.esc.height = H; },
        comeca(){ P.tp = 0; },
        passo(){ P.tp += 1 / 60;
          const a = P.tp * 0.55, auto = { x: lb.x + lb.w * (0.5 + 0.48 * Math.sin(a * 1.3)), y: lb.y + lb.h * (0.5 + 0.7 * Math.sin(a * 2.1 + 1)) };
          const alvo = S.ponto || (P.tp > 11 ? { x: W / 2, y: H / 2 } : auto); P.luz.x += (alvo.x - P.luz.x) * 0.12; P.luz.y += (alvo.y - P.luz.y) * 0.12;
          const rAlvo = P.acesa ? Math.hypot(W, H) : P.tp > 11 && !S.ponto ? Math.max(lb.w, lb.h) * 0.8 : Math.max(80 * dpr, lb.h * 0.75);
          P.r += (rAlvo - P.r) * (P.acesa ? 0.06 : 0.08);
          return !S.ponto && ((P.acesa && P.r > Math.hypot(W, H) * 0.97) || (P.tp > 13 && Math.abs(P.r - rAlvo) < 2)); },
        desenha(){
          g.fillStyle = fundo; g.fillRect(0, 0, W, H); g.drawImage(logo, 0, 0);
          const e = P.esc.getContext('2d'), r = P.r * (P.acesa ? 1 : 1 + Math.sin(P.tp * 13) * 0.035 + Math.sin(P.tp * 5.3) * 0.025);
          e.globalCompositeOperation = 'source-over'; e.clearRect(0, 0, W, H); e.fillStyle = `rgba(${fundoRgb},0.96)`; e.fillRect(0, 0, W, H);
          e.globalCompositeOperation = 'destination-out'; const gr = e.createRadialGradient(P.luz.x, P.luz.y, 0, P.luz.x, P.luz.y, Math.max(1, r)); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.55, 'rgba(0,0,0,.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); e.fillStyle = gr; e.fillRect(0, 0, W, H);
          g.drawImage(P.esc, 0, 0);
          /* o calor da chama: um halo âmbar por cima, somando luz */
          g.globalCompositeOperation = 'lighter'; const h = g.createRadialGradient(P.luz.x, P.luz.y, 0, P.luz.x, P.luz.y, Math.max(1, r * 0.7)); h.addColorStop(0, 'rgba(255,170,70,.16)'); h.addColorStop(1, 'rgba(255,170,70,0)'); g.fillStyle = h; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over'; },
        resolve(){ P.acesa = true; }, denovo(){ P.acesa = false; P.tp = 0; P.r = Math.max(80 * dpr, lb.h * 0.75); },
        pronto(){ return P.acesa || P.tp > 11; },
        base(){ g.fillStyle = fundo; g.fillRect(0, 0, W, H); g.globalAlpha = 0.07; g.drawImage(logo, 0, 0); g.globalAlpha = 1; }
      },
      blocos: {
        cria(){ const cols = Math.max(8, Math.min(34, Math.round(lb.w / (22 * dpr)))), tw = lb.w / cols, rows = Math.max(2, Math.round(lb.h / tw)), th = lb.h / rows, ps = [];
          for(let j = 0; j < rows; j++) for(let i = 0; i < cols; i++){ const sx = lb.x + i * tw, sy = lb.y + j * th; let tem = false; for(let a = 0; a < 4 && !tem; a++) for(let b2 = 0; b2 < 4 && !tem; b2++) tem = em(sx + (a + .5) * tw / 4, sy + (b2 + .5) * th / 4); if(tem) ps.push({ sx, sy, x: sx, y: sy, vx: 0, vy: 0, rot: 0, vr: 0, ok: true, i, j }); }
          P = { ps, tw, th, rows, rapido: false }; },
        comeca(){ P.ps.forEach(q => { q.y = q.sy - H * (0.6 + Math.random() * 0.5) - (P.rows - q.j) * P.th * 1.4; q.x = q.sx + (Math.random() - .5) * P.tw * 3; q.vy = 0; q.vx = 0; q.rot = (Math.random() - .5) * 1.2; q.vr = 0; q.ok = false; }); },
        passo(){ const gr = 0.55 * dpr, R = 80 * dpr; let todos = true;
          P.ps.forEach(q => {
            if(S.ponto && S.toque){ const dx = q.x + P.tw / 2 - S.ponto.x, dy = q.y + P.th / 2 - S.ponto.y; if(dx * dx + dy * dy < R * R){ q.vy = -(7 + Math.random() * 9) * dpr; q.vx = (Math.random() - .5) * 12 * dpr; q.vr = (Math.random() - .5) * .3; q.ok = false; } }
            if(q.ok) return; todos = false;
            if(P.rapido){ q.x += (q.sx - q.x) * .35; q.y += (q.sy - q.y) * .35; q.rot *= .6; if(Math.abs(q.sx - q.x) + Math.abs(q.sy - q.y) < .6){ q.x = q.sx; q.y = q.sy; q.rot = 0; q.ok = true; } return; }
            q.vy += gr; q.vx += (q.sx - q.x) * 0.06; q.vx *= 0.82; q.x += q.vx; q.y += q.vy; q.rot += q.vr; q.vr *= .95; q.rot *= .93;
            if(q.y >= q.sy && q.vy > 0){ q.y = q.sy; q.vy = -q.vy * 0.32; if(Math.abs(q.vy) < 1.3 * dpr && Math.abs(q.sx - q.x) < 1.5 * dpr){ q.vy = 0; q.y = q.sy; q.x = q.sx; q.rot = 0; q.ok = true; } } });
          S.toque = false;
          if(todos && P.ps.every(q => q.ok)){ P.rapido = false; return true; } return false; },
        desenha(){ g.fillStyle = fundo; g.fillRect(0, 0, W, H); const gap = Math.max(.5, .7 * dpr);
          P.ps.forEach(q => { g.save(); g.translate(q.x + P.tw / 2, q.y + P.th / 2); if(q.rot) g.rotate(q.rot); g.drawImage(logo, q.sx + gap, q.sy + gap, P.tw - 2 * gap, P.th - 2 * gap, -P.tw / 2 + gap, -P.th / 2 + gap, P.tw - 2 * gap, P.th - 2 * gap); g.restore(); }); },
        resolve(){ P.rapido = true; P.ps.forEach(q => { q.ok = q.ok && q.x === q.sx && q.y === q.sy; }); }, denovo(){ P.rapido = false; this.comeca(); },
        pronto(){ return P.ps.every(q => q.ok); }
      }
    };
    const j = J[tipo]; if(!j) return;
    const final = () => { if(tipo === 'estencil'){ j.base(); j.acaba(); } else if(tipo === 'vela'){ g.fillStyle = fundo; g.fillRect(0, 0, W, H); g.drawImage(logo, 0, 0); } else j.desenha(); };
    const roda = () => {
      if(S.raf || !S.vivo || !S.visivel || menos) return;
      const f = () => { S.raf = 0; if(!cv.isConnected){ para(); return; }
        if(S.ponto && performance.now() - S.ult > 140 && !S.preso) S.ponto = null;
        const parou = j.passo(); j.desenha(); S.n++;
        S.quieto = parou && !S.ponto; if(!S.quieto) S.raf = requestAnimationFrame(f); };
      S.raf = requestAnimationFrame(f);
    };
    const pos = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * dpr, y: (e.clientY - r.top) * dpr }; };
    const mexe = e => { if(menos) return; S.ponto = pos(e); S.ult = performance.now(); S.quieto = false; roda(); };
    cv.style.touchAction = 'pan-y';
    cv.addEventListener('pointermove', mexe);
    cv.addEventListener('pointerdown', e => { S.preso = e.pointerType !== 'mouse'; S.toque = true; mexe(e); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => cv.addEventListener(n, () => { S.preso = false; S.ponto = null; }));
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(l => { S.visivel = !!(l[0] && l[0].isIntersecting); if(S.visivel){ if(!S.comecou && !menos){ S.comecou = true; j.comeca(); } roda(); } else if(S.raf){ cancelAnimationFrame(S.raf); S.raf = 0; } }, { threshold: 0.3 }) : null;
    let rT = 0;
    const ro = 'ResizeObserver' in window ? new ResizeObserver(() => { clearTimeout(rT); rT = setTimeout(async () => { const w0 = W; const r = box.getBoundingClientRect(); if(Math.abs(Math.round(r.width * dpr) - w0) < 2) return; await monta(); j.cria(); final(); S.quieto = true; }, 220); }) : null;
    function para(){ S.vivo = false; if(S.raf) cancelAnimationFrame(S.raf); S.raf = 0; if(io) io.disconnect(); if(ro) ro.disconnect(); }
    try{ await monta(); }catch(e){ return; }
    if(!cv.isConnected) return;
    j.cria();
    /* o print: o estado de partida bonito (o pó e os blocos já formados, o molde com o nome em sombra, a vela no escuro) */
    if(menos) final(); else if(j.base && tipo !== 'estencil') j.base(); else j.desenha();
    INT = { para, tipo,
      resolve(){ if(menos){ final(); return; } j.resolve(); S.quieto = false; S.visivel = true; roda(); },
      denovo(){ if(menos){ final(); return; } j.denovo(); S.comecou = true; S.quieto = false; S.visivel = true; roda(); },
      estado: () => ({ tipo, pronto: j.pronto(), quieto: S.quieto, rodando: !!S.raf, quadros: S.n, comecou: S.comecou, w: W, h: H, pecas: tipo === 'po' ? P.n : tipo === 'blocos' ? P.ps.length : tipo === 'estencil' ? P.total : 1, cobre: tipo === 'estencil' ? P.pintou / Math.max(1, P.total) : null })
    };
    if(io) io.observe(box); else { S.visivel = true; S.comecou = true; j.comeca(); roda(); }
    if(ro) ro.observe(box);
  };
  /* depois de desenhar o brandbook: as estrofes acendem com a rolagem, o detector de clichê e a abertura */
  const CLICHE_GERAL = ['experiência única', 'experiência incrível', 'premium', 'exclusivo', 'exclusiva', 'transforme', 'transformar vidas', 'eleve', 'descubra', 'perfeito', 'perfeita', 'impecável', 'segredo', 'milagre', 'inovador', 'inovadora', 'soluções', 'qualidade e excelência', 'excelência', 'o melhor', 'a melhor', 'incrível', 'sensacional', 'imperdível', 'de outro nível', 'nunca visto', 'top de linha', 'diferenciado', 'diferenciada'];
  const baixaSem = s => String(s || '').split('').map(ch => ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().slice(0, 1) || ch).join('');
  L.detecta = (txt, PL) => {
    const box = C.$('bb-det-r'); if(!box) return;
    const T = String(txt || ''), base = baixaSem(T), evita = (PL && Array.isArray(PL.evita) ? PL.evita : []);
    if(!T.trim()){ box.innerHTML = `<p class="bb-nota">Cola um texto: o detector marca o clichê de marketing${evita.length ? ' e as palavras que essa marca não usa' : ''}, e sugere o jeito dela.</p>`; return; }
    const lista = [...new Set(CLICHE_GERAL.concat(evita).map(w => String(w).trim()).filter(w => w.length >= 3))], achados = [];
    lista.forEach(w => { const re = new RegExp('(^|[^a-z0-9])(' + baixaSem(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?=$|[^a-z0-9])', 'g'); let x; while((x = re.exec(base))){ const i0 = x.index + x[1].length; achados.push([i0, i0 + x[2].length, w]); re.lastIndex = i0 + 1; } });
    achados.sort((a, b) => a[0] - b[0] || b[1] - a[1]); const sem = []; achados.forEach(a => { if(!sem.length || a[0] >= sem[sem.length - 1][1]) sem.push(a); });
    let html = '', p = 0; sem.forEach(([a, b]) => { html += esc(T.slice(p, a)) + '<mark>' + esc(T.slice(a, b)) + '</mark>'; p = b; }); html += esc(T.slice(p));
    const usa = PL && Array.isArray(PL.usa) ? PL.usa : [], quais = [...new Set(sem.map(x => x[2]))];
    box.innerHTML = `<p class="bb-det-t">${html}</p>` + (sem.length ? `<p class="bb-nota"><b>${sem.length} ${sem.length > 1 ? 'clichês' : 'clichê'}:</b> ${esc(quais.join(', '))}. ${usa.length ? `Troca por algo que é da marca: ${esc(usa.slice(0, 6).join(', '))}.` : 'Troca por uma coisa concreta: o que é, de onde vem, pra quem.'}</p>` : '<p class="bb-nota"><b>Limpo.</b> Nenhum clichê achado.</p>');
  };
  L.depois = (app, x) => {
    const es = app.querySelectorAll('.bb-estrofes p');
    if(es.length){ if(matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) es.forEach(p => p.classList.add('on')); else { const io = new IntersectionObserver(l => l.forEach(e => { if(e.isIntersecting){ e.target.classList.add('on'); io.unobserve(e.target); } }), { threshold: 0.6 }); es.forEach(p => io.observe(p)); } }
    const det = C.$('bb-det'); if(det){ let t = 0; det.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => L.detecta(det.value, x.PL), 160); }); }
    if(x.temAbre) L.abreInt(L.k, x.IT); else if(INT){ INT.para(); INT = null; }
  };
  Object.assign(C.acts, {
    'bb-int-resolve': () => { if(INT) INT.resolve(); },
    'bb-int-denovo': () => { if(INT) INT.denovo(); },
    'bb-camada': el => { const mq = L.atual && L.atual.voz && L.atual.voz.maquina, cs = (mq && mq.direcao && mq.direcao.camadas) || [], x = cs[Number(el.dataset.i)]; if(!x) return; el.parentElement.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === el))); const t = C.$('bb-camada-tx'); if(t) t.textContent = x.explica || ''; }
  });

  /* ---------- v3.39 · o filme da capa, o som, o vídeo, o gerador de post e o modo apresentação ---------- */
  let capaCtl = null, filmeQ = null;
  L.filmeCapa = comSom => {
    const capa = C.$('bb-capa'), FI = C.houziFilme, k = L.k; if(!capa || !FI || !k) return;
    const cv = capa.querySelector('.bb-filme'), svg = capa.querySelector('.bb-capa-logo svg'); if(!cv || !svg) return;
    if(capaCtl) capaCtl.para();
    capa.classList.add('filme-on', 'filme-roda', 'filme-feito'); capa.classList.remove('filme-fim');
    const rc = capa.getBoundingClientRect(), rs = svg.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    if(!rc.width || !rs.width){ capa.classList.remove('filme-on', 'filme-roda'); return; }
    cv.width = Math.round(rc.width * dpr); cv.height = Math.round(rc.height * dpr);
    const P = FI.prepara(k, { w: cv.width, h: cv.height, formato: 'capa', som: k.musica ? { p: k.musica } : null, caixa: { x: (rs.left - rc.left) * dpr, y: (rs.top - rc.top) * dpr, w: rs.width * dpr, h: rs.height * dpr } });
    let mostrou = false;
    capaCtl = FI.toca(cv, P, { aCada: t => { if(!mostrou && t > P.tCor + 0.35){ mostrou = true; capa.classList.remove('filme-on'); } }, fim: () => { capa.classList.remove('filme-on', 'filme-roda'); capa.classList.add('filme-fim'); } });
    if(comSom && C.houziSom){ const d = C.houziSom.daMarca(k.sp); C.houziSom.toca(d.r, 0.35); }
  };
  /* o quadro parado do filme quadrado (o último), antes de tocar */
  L.posterQ = () => { const box = C.$('bb-filme-q'), FI = C.houziFilme, k = L.k; if(!box || !FI || !k) return; const cv = box.querySelector('canvas'), W = cv.width, H2 = cv.height; const P = FI.prepara(k, { w: W, h: H2, formato: 'quadrado', som: k.musica ? { p: k.musica } : null, caixa: { x: W * 0.18, y: H2 * 0.27, w: W * 0.64, h: H2 * 0.34 } }); FI.quadro(cv.getContext('2d'), P, P.dur); };
  L.pgDesenha = () => {
    const prev = C.$('bb-pg-prev'), PO = C.houziPost; if(!prev || !PO || !L.k) return;
    const t = { frase: (C.$('bb-pg-t') || {}).value || '', detalhe: (C.$('bb-pg-d') || {}).value || '' };
    prev.innerHTML = PO.cena(L.k, L.pg.mod, L.pg.fmt, t).svg;
  };
  const marcaSeg = el => el.parentElement.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === el)));
  /* o modo apresentação: cada capítulo é um slide (setas, espaço e Esc) */
  const slides = () => [...document.querySelectorAll('main.bb > section')];
  const slideAtual = () => { const l = slides(); let melhor = 0, d0 = Infinity; l.forEach((s2, i) => { const d = Math.abs(s2.getBoundingClientRect().top); if(d < d0){ d0 = d; melhor = i; } }); return melhor; };
  const vaiSlide = i => { const l = slides(); i = Math.max(0, Math.min(l.length - 1, i)); l[i].scrollIntoView({ behavior: 'smooth', block: 'start' }); const n = C.$('bb-show-n'); if(n) n.textContent = `${i + 1}/${l.length}`; };
  const saiShow = () => { const main = document.querySelector('main.bb'); if(main) main.classList.remove('bb-show'); try{ if(document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {}); }catch(e){} };
  document.addEventListener('keydown', e => {
    const main = document.querySelector('main.bb.bb-show'); if(!main) return;
    if(['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)){ e.preventDefault(); vaiSlide(slideAtual() + 1); }
    else if(['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)){ e.preventDefault(); vaiSlide(slideAtual() - 1); }
    else if(e.key === 'Escape') saiShow();
  });
  document.addEventListener('fullscreenchange', () => { if(!document.fullscreenElement){ const main = document.querySelector('main.bb.bb-show'); if(main && main.dataset.tela === '1'){ main.dataset.tela = ''; main.classList.remove('bb-show'); } } });
  document.addEventListener('scroll', () => { const main = document.querySelector('main.bb.bb-show'), n = C.$('bb-show-n'); if(main && n) n.textContent = `${slideAtual() + 1}/${slides().length}`; }, true);
  const ocupa = async (el, txt, f) => { const ant = el.innerHTML; el.disabled = true; el.textContent = txt; try{ return await f(); } finally{ el.disabled = false; el.innerHTML = ant; } };
  const nomeArq = m => M.handleDe(m.nome) || 'marca';
  Object.assign(C.acts, {
    'bb-filme': () => L.filmeCapa(false),
    'bb-filme-som': () => { window.scrollTo({ top: 0, behavior: 'smooth' }); L.filmeCapa(true); },
    'bb-ouvir': async el => {
      const S = C.houziSom; if(!S || !L.k) return;
      if(S.tocando()){ S.para(); el.innerHTML = `${ico('play')} Ouvir`; return; }
      const d = S.daMarca(L.k.sp), ctl = await S.toca(d.r, 0.05); if(!ctl){ C.toast('Este navegador não toca o som.'); return; }
      el.innerHTML = `${ico('x')} Parar`;
      ctl.fim.then(() => { el.innerHTML = `${ico('play')} Ouvir`; });
    },
    'bb-wav': async el => { const S = C.houziSom; if(!S || !L.k) return; await ocupa(el, 'Montando…', async () => { const d = S.daMarca(L.k.sp); M.baixar(S.wav(d.r), nomeArq(L.k.m) + '-assinatura-sonora.wav'); C.toast('O som da marca foi baixado (WAV).'); }); },
    'bb-filme-q': () => {
      const box = C.$('bb-filme-q'), FI = C.houziFilme, k = L.k; if(!box || !FI || !k) return;
      const cv = box.querySelector('canvas'); if(filmeQ) filmeQ.para();
      const som = C.houziSom ? C.houziSom.daMarca(k.sp) : null, W = cv.width, H2 = cv.height;
      const P = FI.prepara(k, { w: W, h: H2, formato: 'quadrado', som, caixa: { x: W * 0.18, y: H2 * 0.27, w: W * 0.64, h: H2 * 0.34 } });
      box.classList.add('tocando'); filmeQ = FI.toca(cv, P, { fim: () => box.classList.remove('tocando') });
      if(som) C.houziSom.toca(som.r, 0.35);
    },
    'bb-video': async el => {
      const FI = C.houziFilme, k = L.k; if(!FI || !k) return;
      if(!FI.tipoVideo()){ C.toast('Este navegador não grava vídeo. No Chrome ou no Safari funciona.', 4200); return; }
      await ocupa(el, 'Gravando…', async () => {
        try{ const som = C.houziSom ? C.houziSom.daMarca(k.sp) : null, v = await FI.grava(k, el.dataset.f, som); M.baixar(v.blob, `${nomeArq(k.m)}-logo-animado-${el.dataset.f === 'vertical' ? 'story' : 'feed'}.${v.ext}`); C.toast(v.ext === 'mp4' ? 'Vídeo baixado (MP4).' : 'Vídeo baixado (WebM). Se o Instagram não aceitar, converte pra MP4 no CapCut.', 5200); }
        catch(e){ C.toast('Não deu pra gravar o vídeo agora.'); }
      });
    },
    'bb-pg-mod': el => { L.pg.mod = el.dataset.k; marcaSeg(el); L.pgDesenha(); },
    'bb-pg-fmt': el => { L.pg.fmt = el.dataset.k; marcaSeg(el); L.pgDesenha(); },
    'bb-pg-baixa': async el => {
      const PO = C.houziPost, k = L.k; if(!PO || !k) return;
      await ocupa(el, 'Montando…', async () => { const t = { frase: (C.$('bb-pg-t') || {}).value || '', detalhe: (C.$('bb-pg-d') || {}).value || '' }; M.baixar(await PO.png(k, L.pg.mod, L.pg.fmt, t), `${nomeArq(k.m)}-${L.pg.mod}-${L.pg.fmt}.png`); C.toast('Post baixado em PNG.'); });
    },
    'bb-apresenta': () => { const main = document.querySelector('main.bb'); if(!main) return; main.classList.add('bb-show'); try{ if(main.requestFullscreen){ main.dataset.tela = '1'; main.requestFullscreen().catch(() => { main.dataset.tela = ''; }); } }catch(e){} vaiSlide(0); },
    'bb-show-ant': () => vaiSlide(slideAtual() - 1),
    'bb-show-prox': () => vaiSlide(slideAtual() + 1),
    'bb-show-sai': () => saiShow()
  });
  Object.assign(C.acts, {
    'bb-ir': (el, e) => { const s = document.getElementById('bb-' + el.dataset.k); if(s){ if(e) e.preventDefault(); s.scrollIntoView({ behavior: 'smooth', block: 'start' }); } },
    'bb-pdf': async el => { if(!L.atual) return; const ant = el.innerHTML; el.disabled = true; el.textContent = 'Montando…'; try{ await L.pdf(L.atual); }catch(e){ C.toast('Não deu pra montar o PDF agora.'); } finally{ el.disabled = false; el.innerHTML = ant; } },
    'bb-kit': async el => { if(!L.atual) return; const ant = el.innerHTML; el.disabled = true; el.textContent = 'Montando…'; try{ await L.kit(L.atual); }catch(e){ C.toast('Não deu pra montar o kit agora.'); } finally{ el.disabled = false; el.innerHTML = ant; } }
  });

  /* ---------- o PDF do brandbook (A4 deitado, vetor, as letras em curvas) ---------- */
  const PW = 1200, PH = 849, PT = 842 / 1200;
  const pagina = (els, fundo) => ({ w: 842, h: 595.3, esc: PT, els, fundo });
  const tx = (f, s, x, y, tam, cor, o) => ({ d: M.texto(f, s, Object.assign({ tam, x, y }, o || {})).cmds, f: cor });
  const par = (f, s, x, y, tam, larg, cor, o) => { const p = M.paragrafo(f, s, Object.assign({ tam, larg, x, y, entre: tam * 1.85 }, o || {})); return { el: { d: p.cmds, f: cor }, h: p.h }; };
  const pars = (f, lista, x, y, tam, larg, cor, gap) => { const out = []; let yy = y; (lista || []).forEach(t => { const p = par(f, t, x, yy, tam, larg, cor); out.push(p.el); yy += p.h + (gap || tam * 2.4); }); return { els: out, y: yy }; };
  const encaixaTam = (f, s, larg, tam, o) => { let t = tam; while(t > 10 && M.largura(f, s, Object.assign({ tam: t }, o || {})) > larg) t -= 2; return t; };
  L.pdfBlob = async m => {
    const k = await L.prepara(m), { sp, fs, vs, c, voz } = k, ui = await M.fonte('inter-medium'), t = M.TERRITORIOS[sp.territorio] || {}, tx2 = H.textos(m);
    const vCor = vs.cor, vPri = M.versaoPrincipal(sp), corSobre = f2 => M.texto_em(f2, c.ink, c.paper), pgs = [], link = !H.ehLocal(m) && m.publica ? H.linkLivro(m) : '';
    const rot = (n, nome, cor) => [tx(ui, n, 70, 92, 13, cor, { track: 0.2 }), tx(ui, nome.toUpperCase(), 118, 92, 13, cor, { track: 0.24 }), { d: F.ret(70, 112, 1060, 1.4, 0), f: cor, op: 0.3 }];
    const rodape = (cor, n) => [tx(ui, (m.nome + ' · brandbook').toUpperCase(), 70, PH - 42, 10, cor, { track: 0.2 }), tx(ui, 'STUDIO HOUZI · ' + String(n).padStart(2, '0'), PW - 70 - M.largura(ui, 'STUDIO HOUZI · ' + String(n).padStart(2, '0'), { tam: 10, track: 0.2 }), PH - 42, 10, cor, { track: 0.2 })];
    const dna = (y, h) => { const d = M.dna(sp), tot = d.reduce((a, x) => a + x.w, 0); let x = 0; return d.map(b => { const e = { d: F.ret(x, y + h * (1 - b.h), b.w / tot * PW + 0.5, h * b.h, 0), f: b.c }; x += b.w / tot * PW; return e; }); };
    let n = 0;
    /* 1. capa */
    { const cor = corSobre(vCor.fundo), els = [tx(ui, 'BRANDBOOK', 70, 92, 13, cor, { track: 0.3 }), tx(ui, (t.n || '').toUpperCase(), 520, 92, 13, cor, { track: 0.3 }), tx(ui, String(new Date(m.created_at || Date.now()).getFullYear()), 1080, 92, 13, cor, { track: 0.3 })];
      M.logoNaCaixa(k.logo, vCor, 170, 220, 860, 330, vCor.fundo).forEach(e => els.push(e));
      if(voz.conceito) els.push(par(fs.texto, voz.conceito, 70, 690, 15, 760, cor).el);
      dna(PH - 46, 46).forEach(e => els.push(e));
      pgs.push(pagina(els, vCor.fundo)); n++; }
    /* 2. conceito */
    { const f2 = c.ink, cor = c.paper, els = rot('0' + (++n), 'Conceito', cor);
      els.push(par(fs.display, voz.conceito || t.frase || '', 70, 200, 34, 700, cor, { entre: 52, caixa: '' }).el);
      els.push(...pars(fs.texto, [voz.manifesto], 70, 420, 14, 640, cor).els);
      els.push(tx(ui, 'TERRITÓRIO', 840, 200, 11, cor, { track: 0.24 }), tx(fs.display, t.n || '', 840, 240, 26, cor), par(fs.texto, t.frase || '', 840, 280, 13, 290, cor).el);
      const ar = M.arquetipo(sp.pers); els.push(tx(ui, 'ARQUÉTIPO', 840, 350, 11, cor, { track: 0.24 }), tx(fs.display, ar.n, 840, 390, 24, cor), par(fs.texto, ar.d, 840, 426, 13, 290, cor).el);
      (sp.pers || []).forEach((v, i) => { const y = 520 + i * 52, e = M.EIXOS[i]; els.push(tx(ui, e[0].toUpperCase(), 840, y, 9, cor, { track: 0.16 }), tx(ui, e[1].toUpperCase(), 1130 - M.largura(ui, e[1].toUpperCase(), { tam: 9, track: 0.16 }), y, 9, cor, { track: 0.16 }), { d: F.ret(840, y + 14, 290, 2, 0), f: cor, op: 0.35 }, { d: F.elipse(840 + 290 * v, y + 15, 7), f: c.a }); });
      els.push(...rodape(cor, n)); pgs.push(pagina(els, f2)); }
    /* 3. naming */
    const MQ = (m.voz && m.voz.maquina) || null, DR = (MQ && MQ.direcao) || {}, PL = (MQ && MQ.plataforma) || {}, camadas = Array.isArray(DR.camadas) ? DR.camadas.filter(x => x && x.sentido) : [];
    if(m.naming && m.naming.nome && !camadas.length){ const cor = c.ink, els = rot('0' + (++n), 'Naming', cor), nm = m.naming.nome, tam = encaixaTam(fs.display, nm, 1060, 190);
      els.push(tx(fs.display, nm, 70, 160 + tam, tam, c.p));
      els.push(tx(ui, (L.silabas(nm) + '   ·   @' + M.handleDe(nm) + '   ·   ' + ((M.ESTRATEGIAS[m.naming.estrategia] || {}).n || '')).toUpperCase(), 70, 220 + tam, 12, cor, { track: 0.2 }));
      els.push(...pars(fs.texto, tx2.naming, 70, 300 + tam, 14, 960, cor).els);
      els.push(...rodape(cor, n)); pgs.push(pagina(els, c.paper)); }
    /* v3.41 · pra quem (buyer persona) e se a marca fosse gente (brand persona). Todo bloco tem teto de linhas e nada
       passa do rodapé: texto da IA ou da pessoa pode vir comprido, e a letra da marca pode ser larga */
    const P = H.personas(m), teto = PH - 110, bloco = (els, tit, l, x, y, larg, cor, o) => { o = o || {};
      /* sem lugar pro título e ao menos uma linha embaixo, o bloco não entra (título sozinho no pé da página, não) */
      const itens = (l || []).filter(s => String(s || '').trim()).slice(0, 4); if(!itens.length || y + 34 > teto) return y;
      els.push(tx(ui, String(tit).toUpperCase(), x, y, 10.5, cor, { track: 0.2 })); let yy = y + 34;
      itens.forEach(s => { if(yy > teto) return; const p = par(fs.texto, String(s), x, yy, o.tam || 12.5, larg, cor, { max: o.max || 2 }); els.push(p.el); yy += p.h + (o.gap || 12); });
      return yy + 18; };
    /* a frase grande cabe inteira: o corpo desce até caber em 4 linhas (letra larga quebrava e cortava com reticências) */
    const encaixaPar = (f, s, larg, tam, max, piso) => { let t = tam; while(t > (piso || 16) && M.paragrafo(f, s, { tam: t, larg, entre: t * 1.43 }).linhas > max) t -= 2; return t; };
    { const cor = c.ink, els = rot(String(++n).padStart(2, '0'), 'Pra quem', cor), b = P.buyer, nome = String(b.nome || ''), tam = encaixaTam(fs.display, nome || 'x', 500, 56);
      els.push(tx(ui, 'BUYER PERSONA · O CLIENTE IDEAL', 70, 170, 11, cor, { track: 0.24 }));
      if(nome) els.push(tx(fs.display, nome, 70, 196 + tam, tam, M.contraste(c.p, c.paper) >= 3 ? c.p : cor));
      let y = 236 + tam; if(b.perfil){ const p = par(fs.texto, b.perfil, 70, y, 14, 500, cor, { max: 6 }); els.push(p.el); y += p.h + 26; }
      if(b.frase){ const p = par(fs.display, '“' + b.frase + '”', 70, y, 18, 500, cor, { max: 3, entre: 28 }); els.push(p.el); y += p.h + 34; }
      bloco(els, 'Onde encontra a marca', b.onde, 70, Math.max(y, 560), 500, cor);
      let yd = bloco(els, 'O que procura', b.quer, 640, 170, 490, cor); yd = bloco(els, 'O que incomoda hoje', b.dores, 640, yd, 490, cor); bloco(els, 'O que faz escolher e voltar', [b.decide], 640, yd, 490, cor, { max: 3 });
      els.push(...rodape(cor, n)); pgs.push(pagina(els, c.paper)); }
    { const cor = c.paper, els = rot(String(++n).padStart(2, '0'), 'Se a marca fosse gente', cor), g = P.brand;
      els.push(tx(ui, ('Brand persona · ' + (g.arquetipo || '')).toUpperCase(), 70, 170, 11, cor, { track: 0.24 }));
      let y = 232; if(g.frase){ const tf = encaixaPar(fs.display, g.frase, 520, 28, 4); const p = par(fs.display, g.frase, 70, y, tf, 520, cor, { max: 4, entre: tf * 1.43 }); els.push(p.el); y += p.h + 34; }
      if(g.retrato){ const p = par(fs.texto, g.retrato, 70, y, 14, 520, cor, { max: 8 }); els.push(p.el); }
      let yd = bloco(els, 'Como age', g.jeito, 640, 170, 490, cor); yd = bloco(els, 'Do que gosta', g.gosta, 640, yd, 490, cor, { max: 2 }); bloco(els, 'Com ' + (P.buyer.nome || 'o cliente'), [g.com_o_cliente], 640, yd, 490, cor, { max: 3 });
      els.push(...rodape(cor, n)); pgs.push(pagina(els, c.ink)); }
    /* v3.84 · a máquina da direção criativa: o nome com as camadas e a plataforma */
    if(camadas.length){ const cor = c.ink, els = rot(String(++n).padStart(2, '0'), 'O nome', cor), tam = encaixaTam(fs.display, m.nome, 1060, 150);
      els.push(tx(fs.display, m.nome, 70, 160 + tam, tam, M.contraste(c.p, c.paper) >= 3 ? c.p : cor));
      let y = 214 + tam; if(DR.anatomia){ const p = par(fs.texto, DR.anatomia, 70, y, 14, 1060, cor, { max: 2 }); els.push(p.el); y += p.h + 36; }
      camadas.slice(0, 4).forEach((x, i) => { const X = 70 + (i % 2) * 540, Y = y + Math.floor(i / 2) * 118; if(Y + 40 > teto) return; els.push(tx(fs.display, String(x.sentido), X, Y + 24, 22, cor)); if(x.explica) els.push(par(fs.texto, String(x.explica), X, Y + 52, 12.5, 480, cor, { max: 3 }).el); });
      els.push(...rodape(cor, n)); pgs.push(pagina(els, c.paper)); }
    if(PL.posicionamento || DR.inimigo){ const cor = c.paper, els = rot(String(++n).padStart(2, '0'), 'Plataforma', cor);
      let y = 170; if(DR.ideia_central){ const tf = encaixaPar(fs.display, DR.ideia_central, 520, 26, 4); const p = par(fs.display, DR.ideia_central, 70, y, tf, 520, cor, { max: 4, entre: tf * 1.43 }); els.push(p.el); y += p.h + 30; }
      y = bloco(els, 'Posicionamento', [PL.posicionamento], 70, y, 520, cor, { max: 5 }); bloco(els, 'Propósito', [PL.proposito], 70, y, 520, cor, { max: 3 });
      let yd = bloco(els, 'Os pilares', (PL.pilares || []).map(x => x.nome + ': ' + x.regra), 640, 170, 490, cor, { max: 2 });
      yd = bloco(els, 'O inimigo', [DR.inimigo], 640, yd, 490, cor, { max: 2 }); yd = bloco(els, 'O que a marca põe no lugar', [PL.no_lugar], 640, yd, 490, cor, { max: 2 }); bloco(els, 'Arquétipo · ' + (DR.arquetipo || ''), [PL.tensao], 640, yd, 490, cor, { max: 3 });
      els.push(...rodape(cor, n)); pgs.push(pagina(els, c.ink)); }
    /* 4. logo */
    { const cor = corSobre(vPri.fundo), els = rot(String(++n).padStart(2, '0'), 'Logo', cor);
      M.logoNaCaixa(k.logo, vPri, 150, 150, 900, 320, vPri.fundo).forEach(e => els.push(e));
      els.push(...pars(fs.texto, tx2.logo, 70, 560, 13, 1060, cor, 22).els);
      els.push(...rodape(cor, n)); pgs.push(pagina(els, vPri.fundo)); }
    /* 5. versões e assinaturas */
    { const cor = c.ink, els = rot(String(++n).padStart(2, '0'), 'Versões e assinaturas', cor);
      ['principal', 'negativo', 'cor', 'preto', 'branco'].forEach((vk, i) => { const v = vs[vk], x = 70 + i * 214; els.push({ d: F.ret(x, 150, 200, 150, 0), f: v.fundo }, { d: F.ret(x, 150, 200, 150, 0), f: null, s: c.ink, w: 0.6, op: 0.25 }); M.logoNaCaixa(k.logo, v, x + 18, 168, 164, 114, v.fundo).forEach(e => els.push(e)); els.push(tx(ui, v.n.toUpperCase(), x, 330, 10, cor, { track: 0.16 })); });
      L.assinaturas(sp).filter(x => x[0] !== 'horizontal' || x[0] === sp.logo.arranjo).slice(0, 4).forEach(([a, nome], i) => { const x = 70 + i * 268, lg = M.logo(sp, fs, a); els.push({ d: F.ret(x, 380, 250, 220, 0), f: vPri.fundo }, { d: F.ret(x, 380, 250, 220, 0), f: null, s: c.ink, w: 0.6, op: 0.25 }); M.logoNaCaixa(lg, vPri, x + 25, 405, 200, 170, vPri.fundo).forEach(e => els.push(e)); els.push(tx(ui, nome.toUpperCase(), x, 630, 10, cor, { track: 0.16 })); });
      els.push(...rodape(cor, n)); pgs.push(pagina(els, c.paper)); }
    /* 6. respiro e o que não fazer */
    { const cor = c.ink, els = rot(String(++n).padStart(2, '0'), 'Respiro e o que não fazer', cor);
      const lg = k.logo, mm = 100, caixa = { x: 70, y: 150, w: 470, h: 330 };
      els.push({ d: F.ret(caixa.x, caixa.y, caixa.w, caixa.h, 0), f: vPri.fundo });
      const e2 = Math.min((caixa.w - 60) / (lg.vb.w + 2 * mm), (caixa.h - 60) / (lg.vb.h + 2 * mm)), ox = caixa.x + (caixa.w - (lg.vb.w + 2 * mm) * e2) / 2, oy = caixa.y + (caixa.h - (lg.vb.h + 2 * mm) * e2) / 2;
      M.trEls(M.pintaSobre(lg, vPri, vPri.fundo), mx.x(mx.t(ox + mm * e2, oy + mm * e2), mx.x(mx.s(e2), mx.t(-lg.vb.x, -lg.vb.y)))).forEach(e => els.push(e));
      for(let i = 0; i < 40; i++){ const pw = (lg.vb.w + 2 * mm) * e2, ph = (lg.vb.h + 2 * mm) * e2, per = 2 * (pw + ph), a = i / 40 * per, b = Math.min(per, a + per / 80); const pt = d => d < pw ? [ox + d, oy] : d < pw + ph ? [ox + pw, oy + d - pw] : d < 2 * pw + ph ? [ox + pw - (d - pw - ph), oy + ph] : [ox, oy + ph - (d - 2 * pw - ph)]; const [x1, y1] = pt(a), [x2, y2] = pt(b); els.push({ d: F.linha(x1, y1, x2, y2), s: c.a, w: 2, f: null }); }
      els.push(...pars(fs.texto, ['Em volta do logo, sempre um respiro do tamanho da letra maiúscula do nome. Nada entra nesse espaço.', 'Tamanho mínimo: 24 pixels de altura na tela e 1,5 cm impresso. Menor que isso, o símbolo sozinho.'], 70, 520, 12, 470, cor, 18).els);
      L.proibidos(k).forEach(([nome, x], i) => { const cx = 600 + (i % 3) * 178, cy = 150 + Math.floor(i / 3) * 250, w2 = 166, h2 = 160; els.push({ d: F.ret(cx, cy, w2, h2, 0), f: x.fundo }); const e3 = Math.min(w2 / x.vb.w, h2 / x.vb.h) * 0.86; M.trEls(x.els.map(e => e.furo ? Object.assign({}, e, { furo: false, f: e.f ? x.fundo : null, s: e.s ? x.fundo : null }) : e), mx.x(mx.t(cx + (w2 - x.vb.w * e3) / 2, cy + (h2 - x.vb.h * e3) / 2), mx.x(mx.s(e3), mx.t(-x.vb.x, -x.vb.y)))).forEach(e => els.push(Object.assign({}, e, { clip: F.ret(cx, cy, w2, h2, 0) }))); els.push({ d: F.linha(cx + 8, cy + 8, cx + w2 - 8, cy + h2 - 8), s: '#E0281E', w: 3, f: null }, { d: F.linha(cx + w2 - 8, cy + 8, cx + 8, cy + h2 - 8), s: '#E0281E', w: 3, f: null }, par(ui, nome, cx, cy + h2 + 22, 9.5, w2, cor).el); });
      els.push(...rodape(cor, n)); pgs.push(pagina(els, c.paper)); }
    /* v3.39 · construção */
    { const cor = c.ink, els = rot(String(++n).padStart(2, '0'), 'Construção', cor), cons = L.construcao(k);
      const area = { x: 70, y: 140, w: 720, h: 470 }, e2 = Math.min(area.w / cons.box.w, area.h / cons.box.h), ox = area.x + (area.w - cons.box.w * e2) / 2 - cons.box.x * e2, oy = area.y + (area.h - cons.box.h * e2) / 2 - cons.box.y * e2;
      M.trEls(cons.els, [e2, 0, 0, e2, ox, oy]).forEach(e => els.push(e));
      cons.medidas.slice(0, 6).forEach(([v2, r2], i) => { els.push(tx(fs.display, v2, 830, 190 + i * 74, 24, cor), tx(ui, r2.toUpperCase(), 830, 213 + i * 74, 8.5, cor, { track: 0.14 })); });
      els.push(...pars(fs.texto, cons.texto, 70, 650, 11.5, 1060, cor, 14).els);
      els.push(...rodape(cor, n)); pgs.push(pagina(els, c.paper)); }
    /* 7. tipografia */
    { const cor = c.ink, els = rot(String(++n).padStart(2, '0'), 'Tipografia', cor), fi = M.fonteInfo(sp.tipo.display), fti = M.fonteInfo(sp.tipo.texto);
      els.push(tx(fs.display, 'Aa', 70, 430, 250, c.p));
      els.push(tx(ui, 'LETRA DA MARCA', 520, 170, 11, cor, { track: 0.24 }), tx(fs.display, fi.k || fi.n, 520, 220, 34, cor), tx(ui, (fi.id === 'pixel' ? 'Desenhada no Studio Houzi' : 'Derivada da ' + fi.o).toUpperCase(), 520, 252, 9.5, cor, { track: 0.16 }));
      els.push(tx(fs.display, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 520, 310, encaixaTam(fs.display, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 610, 26), cor), tx(fs.display, 'abcdefghijklmnopqrstuvwxyz', 520, 350, encaixaTam(fs.display, 'abcdefghijklmnopqrstuvwxyz', 610, 26), cor), tx(fs.display, '0123456789 !?&@ ÁÉÕÇ', 520, 390, encaixaTam(fs.display, '0123456789 !?&@ ÁÉÕÇ', 610, 26), cor));
      els.push(tx(ui, 'LETRA DE TEXTO · ' + (fti.k || fti.n).toUpperCase(), 70, 500, 11, cor, { track: 0.2 }));
      els.push(par(fs.texto, voz.manifesto || '', 70, 530, 12, 470, cor).el);
      els.push(...pars(fs.texto, tx2.tipografia, 620, 500, 12, 510, cor, 18).els);
      els.push(...rodape(cor, n)); pgs.push(pagina(els, c.paper)); }
    /* 8. cores */
    { const cor = c.ink, els = rot(String(++n).padStart(2, '0'), 'Cores' + (sp.cores.receita ? ' · paleta ' + sp.cores.receita : ''), cor);
      ['p', 's', 'a', 'ink', 'paper'].forEach((kk, i) => { const x = 70 + i * 214, cc = L.codigos(c[kk]), ct = M.texto_em(c[kk], '#111111', '#FFFFFF'); els.push({ d: F.ret(x, 150, 200, 330, 0), f: c[kk] }, { d: F.ret(x, 150, 200, 330, 0), f: null, s: c.ink, w: 0.6, op: 0.2 }); els.push(tx(ui, PAPEL[kk].toUpperCase(), x + 16, 182, 9.5, ct, { track: 0.18 }), par(fs.display, M.nomeCor(c[kk], sp.nome), x + 16, 230, 17, 168, ct).el); [['HEX', cc.hex], ['RGB', cc.rgb], ['CMYK', cc.cmyk], ['OKLCH', cc.oklch]].forEach(([a, b], j) => els.push(tx(ui, a, x + 16, 380 + j * 22, 9, ct, { track: 0.14 }), tx(ui, b, x + 70, 380 + j * 22, 9, ct))); });
      let px = 70; [['paper', 60], ['p', 25], ['s', 10], ['a', 5]].forEach(([kk, pc]) => { const w = 1060 * pc / 100; els.push({ d: F.ret(px, 510, w, 26, 0), f: c[kk] }, { d: F.ret(px, 510, w, 26, 0), f: null, s: c.ink, w: 0.6, op: 0.2 }); px += w; });
      els.push(...pars(fs.texto, tx2.cores, 70, 590, 12, 1060, cor, 16).els);
      els.push(...rodape(cor, n)); pgs.push(pagina(els, c.paper)); }
    /* v3.39 · combinações de cor */
    { const cor = c.ink, els = rot(String(++n).padStart(2, '0'), 'Combinações de cor', cor), ks = ['paper', 'p', 's', 'a', 'ink'], RC = { paper: 'PAPEL', p: 'MARCA', s: 'APOIO', a: 'ACENTO', ink: 'TINTA' };
      const x0 = 160, y0 = 168, cw = 188, ch = 96, gap = 8;
      ks.forEach((kk, j) => els.push(tx(ui, RC[kk], x0 + j * (cw + gap) + 10, y0 - 14, 9, cor, { track: 0.16 })));
      L.combinacoes(c).forEach((linha, i) => {
        els.push(tx(ui, RC[ks[i]], 70, y0 + i * (ch + gap) + ch / 2 + 4, 9, cor, { track: 0.16 }));
        linha.forEach((x, j) => { const X = x0 + j * (cw + gap), Y = y0 + i * (ch + gap);
          if(!x){ els.push({ d: F.ret(X, Y, cw, ch, 6), f: null, s: cor, w: 0.6, op: 0.25 }); return; }
          const nt = L.nota(x.r); els.push({ d: F.ret(X, Y, cw, ch, 6), f: c[x.fundo] }, { d: F.ret(X, Y, cw, ch, 6), f: null, s: c.ink, w: 0.6, op: 0.18 });
          els.push(tx(fs.display, 'Aa', X + 14, Y + 46, 26, c[x.tinta]), tx(ui, `${String(Math.round(x.r * 10) / 10).replace('.', ',')}:1 · ${nt[0]} ${nt[1]}`.toUpperCase(), X + 14, Y + ch - 14, 8.5, c[x.tinta], { track: 0.08 }));
          if(x.r < 3) els.push({ d: F.linha(X + 8, Y + ch - 8, X + cw - 8, Y + 8), s: c[x.tinta], w: 1, f: null, op: 0.5 }); });
      });
      els.push(par(fs.texto, 'Cada cor de texto (nas colunas) em cima de cada cor de fundo (nas linhas), com a nota de leitura do padrão WCAG: AAA e AA seguram texto corrido; AA título, só letra grande (a partir de 24 px); o resto é enfeite, nunca texto.', 70, y0 + 5 * (ch + gap) + 26, 11, 1060, cor).el);
      els.push(...rodape(cor, n)); pgs.push(pagina(els, c.paper)); }
    /* 9. elementos */
    { const cor = c.paper, els = rot(String(++n).padStart(2, '0'), 'Elementos', cor);
      els.push({ d: F.ret(70, 150, 1060, 330, 0), f: c.p }); padrao(k.simb, vs.cor, 70, 150, 1060, 330, c.p, 110).forEach(e => els.push(e));
      els.push(...pars(fs.texto, tx2.elementos, 70, 530, 12, 1060, cor, 16).els);
      els.push(...rodape(cor, n)); pgs.push(pagina(els, c.ink)); }
    /* v3.39 · som e movimento */
    if(C.houziSom || C.houziFilme){ const cor = c.paper, els = rot(String(++n).padStart(2, '0'), 'Som e movimento', cor);
      if(C.houziFilme) ['A grade e as linhas', 'O traço', 'A cor entra', 'Pronto'].forEach((r2, i) => { const X = 70 + i * 268, Y = 140; M.trEls(C.houziFilme.quadroEls(k, i, 250, 170), [1, 0, 0, 1, X, Y]).forEach(e => els.push(e)); els.push(tx(ui, (String(i + 1).padStart(2, '0') + ' · ' + r2).toUpperCase(), X, Y + 192, 8.5, cor, { track: 0.14 })); });
      const mus = k.musica;
      if(mus && C.houziSom){
        const corN = M.contraste(c.p, c.ink) >= 2 ? c.p : M.contraste(c.a, c.ink) >= 2 ? c.a : c.paper;
        els.push(tx(ui, ('ASSINATURA SONORA · ' + mus.genero.g + ' · ' + mus.nomeTom + ' ' + mus.escala.n + ' · ' + mus.bpm + ' BPM').toUpperCase(), 70, 380, 9.5, cor, { track: 0.16 }));
        M.trEls(C.houziSom.partituraEls(mus, 500, 190, { nota: corN, acorde: cor, linha: cor, texto: cor }, fs.texto), [1, 0, 0, 1, 70, 398]).forEach(e => els.push(e));
        els.push(...pars(fs.texto, C.houziSom.explica(mus, sp).slice(1, 3), 620, 400, 10, 510, cor, 12).els);
      }
      if(link && M.qr){ const q = M.qr(link); els.push({ d: F.ret(70, 640, 96, 96, 4), f: '#FFFFFF' }); M.qrEls(q, 76, 646, 84, '#111111').forEach(e => els.push(e)); els.push(tx(ui, 'APONTA A CÂMERA PRA OUVIR O SOM E VER O FILME', 184, 694, 9, cor, { track: 0.14 })); }
      els.push(...rodape(cor, n)); pgs.push(pagina(els, c.ink)); }
    /* 10. voz */
    { const cor = c.ink, els = rot(String(++n).padStart(2, '0'), 'Voz', cor), col = (tit, l, x, y, aspas) => { els.push(tx(ui, tit.toUpperCase(), x, y, 10.5, cor, { track: 0.2 })); let yy = y + 34; (l || []).forEach(s => { const p = par(fs.texto, aspas ? '“' + s + '”' : s, x, yy, 13, 480, cor); els.push(p.el); yy += p.h + 18; }); };
      col('A marca é', voz.e, 70, 170); col('A marca não é', voz.nao_e, 620, 170); col('Fala assim', voz.fala, 70, 330, true); col('Nunca fala assim', voz.nao_fala, 620, 330, true);
      els.push(tx(ui, 'FRASES', 70, 600, 10.5, cor, { track: 0.2 })); (voz.taglines || []).slice(0, 5).forEach((s, i) => els.push(tx(fs.display, s, 70 + (i % 2) * 550, 640 + Math.floor(i / 2) * 40, 17, c.p)));
      els.push(...rodape(cor, n)); pgs.push(pagina(els, c.paper)); }
    /* v3.39 · na prática: o brandbook que faz post */
    if(C.houziPost){ const PO = C.houziPost, cor = c.ink, els = rot(String(++n).padStart(2, '0'), 'Na prática', cor), frase = PO.fraseDe(k);
      ['manchete', 'cartaz', 'oferta', 'editorial'].forEach((mod, i) => { const r = PO.cena(k, mod, 'post', { frase }), w2 = 240, e3 = w2 / r.w, X = 70 + i * 270, Y = 150, cl = F.ret(X, Y, w2, r.h * e3, 0);
        M.trEls(r.els, [e3, 0, 0, e3, X, Y]).forEach(e => els.push(e.clip ? e : Object.assign({}, e, { clip: cl }))); els.push({ d: cl, f: null, s: c.ink, w: 0.6, op: 0.2 }); els.push(tx(ui, PO.MODELOS[mod].toUpperCase(), X, Y + r.h * e3 + 22, 9, cor, { track: 0.16 })); });
      els.push(par(fs.texto, 'O brandbook vivo faz post: escreve a frase, escolhe o jeito e o formato, e sai com a letra, as cores e o símbolo da marca. Estes modelos vão prontos no kit, junto com os stories e as capas de destaque.', 70, 560, 11.5, 1060, cor).el);
      els.push(...rodape(cor, n)); pgs.push(pagina(els, c.paper)); }
    /* 11-12. aplicações (seis por página) */
    const ap = L.aplicacoesDe(sp);
    for(let p0 = 0; p0 < ap.length; p0 += 6){
      const cor = c.ink, els = rot(String(++n).padStart(2, '0'), 'Aplicações', cor);
      if(!p0) els.push(par(fs.texto, (tx2.aplicacoes || [])[0] || '', 70, 140, 11, 1060, cor).el);
      ap.slice(p0, p0 + 6).forEach((a, i) => { const x = 70 + (i % 3) * 360, y = (p0 ? 140 : 190) + Math.floor(i / 3) * 300, e3 = 340 / 600, clip = F.ret(x, y, 340, 255, 0); M.trEls(L.mock(a, k).els, [e3, 0, 0, e3, x, y]).forEach(e => els.push(Object.assign({}, e, e.clip ? {} : { clip }))); els.push(tx(ui, (L.MOCKS[a] || a).toUpperCase(), x, y + 278, 9.5, cor, { track: 0.18 })); });
      els.push(...rodape(cor, n)); pgs.push(pagina(els, c.paper));
    }
    /* contracapa */
    { const els = [], cor = corSobre(vCor.fundo);
      M.logoNaCaixa(k.simb, vCor, 480, link ? 200 : 260, 240, 240, vCor.fundo).forEach(e => els.push(e));
      if(link && M.qr){ const q = M.qr(link); els.push({ d: F.ret(552, 500, 96, 96, 6), f: '#FFFFFF' }); M.qrEls(q, 558, 506, 84, '#111111').forEach(e => els.push(e)); const cap = 'O BRANDBOOK VIVO: O FILME, O SOM E O GERADOR DE POST'; els.push(tx(ui, cap, 600 - M.largura(ui, cap, { tam: 9, track: 0.18 }) / 2, 624, 9, cor, { track: 0.18 })); }
      els.push(tx(ui, 'STUDIO HOUZI · CORRE', 600 - M.largura(ui, 'STUDIO HOUZI · CORRE', { tam: 11, track: 0.3 }) / 2, 720, 11, cor, { track: 0.3 })); pgs.push(pagina(els, vCor.fundo)); }
    return await M.pdf(pgs, { titulo: m.nome + ' · Brandbook', autor: 'Studio Houzi' });
  };
  L.pdf = async m => { const b = await L.pdfBlob(m); M.baixar(b, (M.handleDe(m.nome) || 'marca') + '-brandbook.pdf'); C.toast('Brandbook em PDF baixado.'); };

  /* ---------- o kit da marca (ZIP) ---------- */
  const ase = (nomes, cores) => {
    const enc = new TextEncoder(), blocos = cores.map((hex, i) => { const nm = String(nomes[i] || hex); const nb = new Uint8Array((nm.length + 1) * 2); for(let j = 0; j < nm.length; j++){ const cc = nm.charCodeAt(j); nb[j * 2] = cc >> 8; nb[j * 2 + 1] = cc & 255; } const corpo = new DataView(new ArrayBuffer(2 + nb.length + 4 + 12 + 2)); let o = 0; corpo.setUint16(o, nm.length + 1); o += 2; new Uint8Array(corpo.buffer).set(nb, o); o += nb.length; new Uint8Array(corpo.buffer).set(enc.encode('RGB '), o); o += 4; M.hexRgb(hex).forEach(v => { corpo.setFloat32(o, v); o += 4; }); corpo.setUint16(o, 2); const cab = new DataView(new ArrayBuffer(6)); cab.setUint16(0, 1); cab.setUint32(2, corpo.byteLength); return [new Uint8Array(cab.buffer), new Uint8Array(corpo.buffer)]; });
    const h = new DataView(new ArrayBuffer(12)); new Uint8Array(h.buffer).set(enc.encode('ASEF'), 0); h.setUint16(4, 1); h.setUint16(6, 0); h.setUint32(8, cores.length);
    return new Blob([new Uint8Array(h.buffer)].concat(...blocos), { type: 'application/octet-stream' });
  };
  L.kit = async m => {
    const k = await L.prepara(m), { sp, vs, c } = k, base = M.handleDe(m.nome) || 'marca', pasta = base + '-kit/', arqs = [], add = (nome, dados) => arqs.push({ nome: pasta + nome, dados });
    C.toast('Montando o kit… (uns segundos)', 6000);
    const lgs = [['principal', k.logo], ['simbolo', k.simb], ['nome', k.word]];
    for(const [an, lg] of lgs){
      for(const vk of ['principal', 'negativo', 'cor', 'preto', 'branco']){
        const v = vs[vk], svg = M.logoSvg(lg, v, { titulo: m.nome });
        add(`logo/svg/${an}-${vk}.svg`, svg);
        add(`logo/pdf/${an}-${vk}.pdf`, await M.logoPdf(lg, v, { larg: 600, info: { titulo: m.nome } }));
        if(['principal', 'negativo', 'cor'].includes(vk)){ const mg = lg.x * 0.6, w = 2000, h = Math.round(w * (lg.vb.h + 2 * mg) / (lg.vb.w + 2 * mg)); add(`logo/png/${an}-${vk}.png`, await M.png(svg, w, h)); add(`logo/png/${an}-${vk}-com-fundo.png`, await M.png(M.logoSvg(lg, v, { fundo: true }), w, h)); }
      }
    }
    add('redes/avatar.png', await H.simboloPng(m, 1080, 'image/png'));
    { const v = vs.cor, w = 1500, h = 500, svg = M.svg(M.logoNaCaixa(k.logo, v, w * 0.2, h * 0.26, w * 0.6, h * 0.48, v.fundo), { vb: { x: 0, y: 0, w, h }, fundo: v.fundo }); add('redes/capa-1500x500.png', await M.png(svg, w, h)); }
    { const v = vs.cor, cena = M.logoNaCaixa(k.simb, v, 14, 14, 72, 72, v.fundo), sq = M.svg([{ d: F.squircle(50, 50, 50), f: v.fundo }].concat(cena), { vb: { x: 0, y: 0, w: 100, h: 100 } });
      add('favicon/favicon.svg', sq); for(const t of [16, 32, 180, 512]) add(`favicon/${t === 180 ? 'apple-touch-icon-180' : 'icon-' + t}.png`, await M.png(sq, t, t)); }
    const ks = ['p', 's', 'a', 'ink', 'paper'], nomes = ks.map(x => M.nomeCor(c[x], sp.nome)), rotulo = { p: 'marca', s: 'apoio', a: 'acento', ink: 'tinta', paper: 'papel' };
    add('cores/paleta.css', ':root{\n' + ks.map(x => `  --${rotulo[x]}: ${c[x]}; /* ${nomes[ks.indexOf(x)]} */`).join('\n') + '\n}\n');
    add('cores/paleta.json', JSON.stringify({ marca: m.nome, receita: sp.cores.receita || null, cores: ks.map((x, i) => Object.assign({ papel: rotulo[x], nome: nomes[i] }, L.codigos(c[x]))) }, null, 2));
    add('cores/paleta.txt', ks.map((x, i) => { const cc = L.codigos(c[x]); return `${PAPEL[x]} · ${nomes[i]}\n  HEX ${cc.hex} · RGB ${cc.rgb} · CMYK ${cc.cmyk} · OKLCH ${cc.oklch}`; }).join('\n\n') + '\n');
    add('cores/paleta.gpl', 'GIMP Palette\nName: ' + m.nome + '\nColumns: 5\n#\n' + ks.map((x, i) => M.rgb255(c[x]).map(v => String(v).padStart(3)).join(' ') + '\t' + nomes[i]).join('\n') + '\n');
    add('cores/paleta.ase', ase(nomes, ks.map(x => c[x])));
    for(const id of [...new Set([sp.tipo.display, sp.tipo.texto])]){ const fi = M.fonteInfo(id); try{ const r = await fetch('lab/fontes/' + fi.arq); if(r.ok) add('fontes/' + (fi.k || fi.id).replace(/\s+/g, '-') + fi.arq.slice(fi.arq.lastIndexOf('.')), new Uint8Array(await r.arrayBuffer())); }catch(e){} }
    try{ const r = await fetch('lab/fontes/LICENCAS.txt'); if(r.ok) add('fontes/LICENCAS.txt', await r.text()); }catch(e){}
    add('padrao.svg', M.svg(padrao(k.simb, vs.cor, 0, 0, 1200, 1200, c.p, 150), { vb: { x: 0, y: 0, w: 1200, h: 1200 }, fundo: c.p }));
    /* v3.39: o som, os modelos, as capas de destaque, os impressos, o QR e o logo animado */
    const SOM = C.houziSom, PO = C.houziPost, FI = C.houziFilme, link = !H.ehLocal(m) && m.publica ? H.linkLivro(m) : '';
    let som = null;
    if(SOM){ try{ som = SOM.daMarca(sp); add('som/assinatura-sonora.wav', SOM.wav(som.r)); }catch(e){ som = null; } }
    if(PO){
      const frase = PO.fraseDe(k);
      for(const [mod, fmt, nome] of [['manchete', 'post', 'post-manchete'], ['cartaz', 'post', 'post-cartaz'], ['editorial', 'post', 'post-editorial'], ['oferta', 'post', 'post-oferta'], ['manchete', 'story', 'story-manchete'], ['cartaz', 'story', 'story-cartaz']])
        add(`modelos/${nome}.png`, await PO.png(k, mod, fmt, { frase }));
      const ds = PO.destaques(k); for(let i = 0; i < ds.length; i++) add(`destaques/${String(i + 1).padStart(2, '0')}-${ds[i].arq}.png`, await M.png(ds[i].svg, 1080, 1920));
      add('impressos/cartao-de-visita.pdf', await PO.cartaoPdf(k, link));
      add('impressos/papel-timbrado.pdf', await PO.timbradoPdf(k));
    }
    if(link && M.qrSvg){ const qs = M.qrSvg(link, { titulo: 'Brandbook de ' + m.nome }); add('qr/brandbook-qr.svg', qs); add('qr/brandbook-qr.png', await M.png(qs, 1000, 1000)); }
    let videos = 0;
    if(FI && FI.tipoVideo()){
      C.toast('Gravando o logo animado com o som (uns 10 segundos: deixa esta aba aberta)…', 11000);
      for(const [f2, nome] of [['quadrado', 'feed'], ['vertical', 'story']]){ try{ const v = await FI.grava(k, f2, som); if(v.blob.size > 1000){ add(`video/logo-animado-${nome}.${v.ext}`, v.blob); videos++; } }catch(e){} }
    }
    /* v3.41: a voz e as personas em texto, pra quem for escrever legenda, site ou briefing */
    { const voz = k.voz || {}, P = H.personas(m), b = P.buyer, g = P.brand, l = (t, x) => (x || []).length ? [t, ...(x || []).map(s => '  - ' + s), ''] : [];
      add('textos/voz-e-personas.txt', [`${m.nome} · voz e personas`, '='.repeat(40), '', 'CONCEITO', voz.conceito || '', '', 'MANIFESTO', voz.manifesto || '', '',
        ...l('A MARCA É', voz.e), ...l('A MARCA NÃO É', voz.nao_e), ...l('FALA ASSIM', voz.fala), ...l('NUNCA FALA ASSIM', voz.nao_fala), ...l('FRASES', voz.taglines),
        'BIO DO INSTAGRAM', voz.bio || '', '', 'BOAS-VINDAS DO WHATSAPP', voz.wa || '', '',
        'PRA QUEM: A BUYER PERSONA (o cliente ideal, uma pessoa inventada que resume quem compra)', `${b.nome || ''}. ${b.perfil || ''}`.trim(), b.frase ? `"${b.frase}"` : '', '',
        ...l('O que procura', b.quer), ...l('O que incomoda hoje', b.dores), ...l('Onde encontra a marca', b.onde), 'O que faz escolher e voltar', '  ' + (b.decide || ''), '',
        `SE A MARCA FOSSE GENTE: A BRAND PERSONA (${g.arquetipo || ''})`, g.retrato || '', g.frase ? `"${g.frase}"` : '', '',
        ...l('Como age', g.jeito), ...l('Do que gosta', g.gosta), 'Com o cliente', '  ' + (g.com_o_cliente || ''), ''].join('\n')); }
    /* v3.84: a máquina da marca que a direção criativa escreveu, em texto */
    { const MQ = (m.voz && m.voz.maquina) || null, DR = (MQ && MQ.direcao) || {}, PL = (MQ && MQ.plataforma) || {}, SN = PL.sistema_nomes || {}, l = (t, x) => (x || []).length ? [t, ...(x || []).map(s => '  - ' + s), ''] : [], it = DR.interacao || {};
      if(MQ) add('textos/plataforma.txt', [`${m.nome} · a máquina da marca (direção criativa)`, '='.repeat(40), '', 'O NOME', DR.anatomia || '', ...(DR.camadas || []).map(x => `  - ${x.sentido}: ${x.explica || ''}`), '',
        'A IDEIA CENTRAL', DR.ideia_central || '', DR.pergunta ? 'A pergunta que decide tudo: ' + DR.pergunta : '', '', 'A ASSINATURA', DR.assinatura || '', '', 'A METÁFORA', DR.metafora || '', '',
        'O INIMIGO', DR.inimigo || '', 'O QUE A MARCA PÕE NO LUGAR', PL.no_lugar || '', '', 'PROPÓSITO', PL.proposito || '', '', 'ESSÊNCIA', PL.essencia || '', '', 'POSICIONAMENTO', PL.posicionamento || '', '',
        ...l('PILARES', (PL.pilares || []).map(x => x.nome + ': ' + x.regra)), 'ARQUÉTIPO', `${DR.arquetipo || ''}. ${PL.tensao || ''}`.trim(), '',
        ...l('MANIFESTO', PL.manifesto_estrofes), ...l('PRINCÍPIOS DE VOZ', PL.principios), ...l('PALAVRAS DA MARCA', PL.usa), ...l('PALAVRAS QUE ELA NÃO USA', PL.evita),
        ...l('TODO MUNDO FALA ASSIM -> A MARCA FALA ASSIM', (PL.exemplos || []).map(x => `${x.generico} -> ${x.marca}`)),
        'COMO OS PRODUTOS SE CHAMAM', SN.regra || '', ...(SN.exemplos || []).map(x => `  - ${x.nome}: ${x.o_que}`), '', ...l('O JEITO DE VENDER', (PL.negocio || []).map(x => `${x.nome}: ${x.como}`)),
        ...l('REPERTÓRIO', (PL.fatos || []).map(x => x.fato + (x.certeza === 'mais_contada' ? ' (a história mais contada: confere antes de usar)' : ''))),
        ...l('A PALETA', ((m.spec || {}).paleta || []).map(x => `${x.nome} ${x.hex} (${x.papel}${x.uso ? ', ' + x.uso + '%' : ''})${x.historia ? ': ' + x.historia : ''}`)),
        'A ABERTURA DO BRANDBOOK', `${it.nome || ''}${it.como ? ': ' + it.como : ''}`, ''].join('\n')); }
    add('brandbook.pdf', await L.pdfBlob(m));
    add('LEIA-ME.txt', [`${m.nome} · kit da marca`, '='.repeat(40), '', 'Feito no Studio Houzi (Corre).', '',
      'logo/svg   os logos em vetor (pra site e pra quem for editar). principal = a assinatura principal; simbolo = só o símbolo; nome = só o nome.',
      'logo/pdf   os mesmos em PDF vetor (pra gráfica).', 'logo/png   em imagem, 2000 px de largura, sem fundo e com fundo.',
      'Versões: principal, negativo (pra fundo escuro), cor (em cima da cor da marca), preto e branco (uma cor só).', '',
      'redes      avatar (1080 x 1080) e capa (1500 x 500).', 'favicon    o ícone do site em SVG e PNG.',
      'som        a assinatura sonora da marca (WAV, 44,1 kHz): pra abrir vídeo, reels, podcast e espera de telefone.',
      'video      o logo animado com o som: quadrado pro feed e em pé pro story/reels (MP4, ou WebM no navegador que não grava MP4; se o Instagram reclamar do WebM, converte pra MP4 no CapCut).',
      'modelos    posts (4:5) e stories prontos com a frase da marca: Manchete, Cartaz, Editorial e Oferta. No brandbook vivo dá pra escrever outra frase e baixar de novo.',
      'destaques  as capas de destaque do Instagram (1080 x 1920; o Instagram mostra o círculo do meio).',
      'impressos  cartão de visita 90 x 50 mm com 3 mm de sangria (frente e verso) e papel timbrado A4, em PDF vetor.',
      'qr         o QR que abre o brandbook vivo (quando a marca tá publicada).',
      'cores      a paleta em CSS, JSON, texto, GIMP (.gpl) e Photoshop/Illustrator (.ase).',
      'textos     a voz da marca e as personas (o cliente ideal e a marca como gente), em texto pra copiar.',
      'fontes     as letras da marca e as licenças (leia antes de usar).', 'padrao.svg o símbolo repetido, pra fundo e embalagem.', 'brandbook.pdf  o manual inteiro, com o porquê de cada escolha.', '',
      'Regra de bolso: no claro, a versão principal; no escuro, a negativa; em cima de foto, a de uma cor só. Respiro em volta do logo do tamanho da letra maiúscula do nome.'].join('\n'));
    const zip = await M.zip(arqs);
    M.baixar(zip, base + '-kit.zip');
    C.toast(`Kit baixado: ${arqs.length} arquivos${videos ? ', com o logo animado' : ''}.`, 3200);
    return arqs.length;
  };
})();
