/* CORRE · STUDIO HOUZI · O BRANDBOOK QUE FAZ POST (v3.39).
   Quem abre o brandbook escreve uma frase e sai um post, um story ou um quadrado com a cara da marca (a letra, as cores,
   o símbolo e o jeito de cada modelo). O dono baixa em PNG. No kit vão os modelos prontos, as capas de destaque do
   Instagram e os impressos (cartão de visita com sangria e papel timbrado, em PDF vetor). */
(function(){
  'use strict';
  const C = window.Corre, M = C.labMotor;
  if(!M) return;
  const PO = C.houziPost = {};
  const F = M.forma;
  PO.FORMATOS = { post: [1080, 1350, 'Post 4:5'], story: [1080, 1920, 'Story'], quadrado: [1080, 1080, 'Quadrado'] };
  PO.MODELOS = { manchete: 'Manchete', cartaz: 'Cartaz', oferta: 'Oferta', editorial: 'Editorial' };
  const ret = (x, y, w, h, f, extra) => Object.assign({ d: F.ret(x, y, w, h, 0), f }, extra || {});
  /* o espaço entre as linhas: o acento da maiúscula (Ó, É, Ã) sobe acima da letra e encostaria na linha de cima */
  const entreDe = (txt, tam, o) => (o && o.caixa === 'alta' && /[À-ÖÙ-Ýà-öù-ý]/.test(String(txt || ''))) ? tam * 1.42 : /[ÀÁÂÃÉÊÍÓÔÕÚ]/.test(String(txt || '').replace(/^\S+/, '')) ? tam * 1.32 : tam * 1.22;
  /* a maior letra em que a frase cabe (no máximo maxL linhas e maxH de altura) */
  const encaixa = (f, txt, larg, maxH, maxL, tam0, o) => {
    let tam = tam0;
    for(; tam > 20; tam -= 4){ const p = M.paragrafo(f, txt, Object.assign({ tam, larg, entre: entreDe(txt, tam, o) }, o)); if(p.linhas <= maxL && p.h <= maxH) return tam; }
    return tam;
  };
  const bloco = (f, txt, x, yTopo, larg, tam, o) => M.paragrafo(f, txt, Object.assign({ tam, larg, x, y: yTopo + tam, entre: entreDe(txt, tam, o) }, o || {}));
  const caixaDe = sp => (sp.logo && sp.logo.caixa === 'alta') ? 'alta' : '';
  /* o número da oferta (R$ 29,90, 50%, 2 por 1…) sai da frase pra virar o destaque */
  const numero = s => { const m = String(s || '').match(/R\$\s?\d+(?:[.,]\d{1,2})?|\d+\s?%|\d+\s?por\s?\d+|\d+[.,]\d{2}/i); return m ? m[0].replace(/\s+/g, ' ') : ''; };
  PO.numero = numero;
  /* o símbolo repetido numa área, bem de leve (textura) */
  const textura = (k, x, y, w, h, fundo, cor, passo, op) => {
    const out = [], clip = F.ret(x, y, w, h, 0), v = Object.assign({}, M.versoes(k.c).preto, { marca: cor, texto: cor, tagline: cor, sec: cor, acento: cor, sombra: cor, furo: fundo });
    for(let j = 0, yy = y - passo / 2; yy < y + h + passo; yy += passo, j++) for(let xx = x - passo / 2 + (j % 2 ? passo / 2 : 0); xx < x + w + passo; xx += passo)
      M.logoNaCaixa(k.simb, v, xx - passo * 0.26, yy - passo * 0.26, passo * 0.52, passo * 0.52, fundo).forEach(e => out.push(Object.assign({}, e, { clip, op })));
    return out;
  };

  const MOD = {
    /* MANCHETE: a frase grande na cor da marca, o símbolo em cima, a assinatura e o @ embaixo */
    manchete(k, W, H, t){
      const { c, vs, fs, sp } = k, fundo = c.p, tinta = M.texto_em(fundo, c.ink, c.paper), v = vs.cor, mg = Math.round(W * 0.083), out = [ret(0, 0, W, H, fundo)];
      textura(k, W * 0.55, 0, W * 0.45, H * 0.22, fundo, tinta, 120, 0.08).forEach(e => out.push(e));
      M.logoNaCaixa(k.simb, v, mg, mg, W * 0.13, W * 0.13, fundo, 'esq').forEach(e => out.push(e));
      const larg = W - 2 * mg, y0 = H * (H > W * 1.5 ? 0.3 : 0.25), maxH = H * (H > W * 1.5 ? 0.42 : 0.46), tam = encaixa(fs.display, t.frase, larg, maxH, 6, 150, { caixa: caixaDe(sp) });
      const p = bloco(fs.display, t.frase, mg, y0, larg, tam, { caixa: caixaDe(sp), max: 6 }); out.push({ d: p.cmds, f: tinta });
      if(t.detalhe){ const d = bloco(fs.texto, t.detalhe, mg, y0 + p.h + tam * 0.7, larg, 34, { entre: 48, max: 2 }); out.push({ d: d.cmds, f: tinta, op: 0.85 }); }
      M.logoNaCaixa(k.word, v, mg, H - mg - 64, W * 0.42, 64, fundo, 'esq').forEach(e => out.push(e));
      const ar = M.texto(fs.texto, '@' + M.handleDe(sp.nome), { tam: 24 }); out.push({ d: M.tr(ar.cmds, M.mx.t(W - mg - ar.w, H - mg - 20)), f: tinta, op: 0.8 });
      return out;
    },
    /* CARTAZ: o símbolo enorme, cortado pela borda; a frase numa faixa escura embaixo */
    cartaz(k, W, H, t){
      const { c, vs, fs, sp } = k, fundo = c.paper, mg = Math.round(W * 0.083), out = [ret(0, 0, W, H, fundo)], faixa = H * 0.36, clip = F.ret(0, 0, W, H - faixa, 0);
      const v = Object.assign({}, vs.principal);
      M.logoNaCaixa(k.simb, v, W * 0.2, -H * 0.04, W * 0.98, H - faixa + H * 0.08, fundo).forEach(e => out.push(Object.assign({}, e, { clip })));
      M.logoNaCaixa(k.word, vs.principal, mg, mg, W * 0.4, 56, fundo, 'esq').forEach(e => out.push(e));
      out.push(ret(0, H - faixa, W, faixa, c.ink));
      const larg = W - 2 * mg, tam = encaixa(fs.display, t.frase, larg, faixa * 0.62, 4, 120, { caixa: caixaDe(sp) });
      const p = bloco(fs.display, t.frase, mg, H - faixa + mg * 0.8, larg, tam, { caixa: caixaDe(sp), max: 4 }); out.push({ d: p.cmds, f: c.paper });
      if(t.detalhe){ const d = bloco(fs.texto, t.detalhe, mg, H - faixa + mg * 0.8 + p.h + 34, larg, 30, { entre: 44, max: 1 }); out.push({ d: d.cmds, f: M.contraste(c.a, c.ink) >= 3 ? c.a : c.paper }); }
      return out;
    },
    /* OFERTA: o número numa explosão, a frase em cima e a chamada num botão */
    oferta(k, W, H, t){
      const { c, vs, fs, sp } = k, fundo = c.ink, papel = c.paper, mg = Math.round(W * 0.083), out = [ret(0, 0, W, H, fundo)];
      const num = numero(t.frase), resto = num ? String(t.frase).replace(num, '').replace(/\s{2,}/g, ' ').replace(/^[\s,:;-]+|[\s,:;-]+$/g, '') : t.frase;
      const corE = M.contraste(c.p, fundo) >= 2.2 ? c.p : M.contraste(c.a, fundo) >= 2.2 ? c.a : papel, tintaE = M.texto_em(corE, c.ink, papel);
      const larg = W - 2 * mg, tamF = encaixa(fs.display, resto || sp.nome, larg, H * 0.2, 3, 96, { caixa: caixaDe(sp) });
      const p = bloco(fs.display, resto || sp.nome, mg, mg * 1.6, larg, tamF, { caixa: caixaDe(sp), max: 3, alinha: 'centro' }); out.push({ d: p.cmds, f: papel });
      /* a explosão ocupa o meio que sobra entre a frase e a chamada (a chamada fica acima da assinatura, sem encostar) */
      const topo = mg * 1.6 + p.h + 50, baseCta = H - mg - 52 - 30, yc = baseCta - 84, fundoE = yc - 46;
      const R = Math.max(80, Math.min(W * 0.36, (fundoE - topo) / 2)), cx = W / 2, cy = (topo + fundoE) / 2;
      out.push({ d: F.estrela(cx, cy, R, R * 0.84, 18, -90), f: corE });
      if(num){ let tn = R * 0.62; while(tn > 30 && M.largura(fs.display, num, { tam: tn }) > R * 1.4) tn -= 4; const tx = M.texto(fs.display, num, { tam: tn }); out.push({ d: M.tr(tx.cmds, M.mx.t(cx - tx.w / 2, cy + tn / 2)), f: tintaE }); }
      else { const vv = corE === c.p ? vs.cor : Object.assign({}, vs.cor, { marca: tintaE, texto: tintaE, acento: tintaE, sec: tintaE, sombra: tintaE, furo: corE }); M.logoNaCaixa(k.simb, vv, cx - R * 0.5, cy - R * 0.5, R, R, corE).forEach(e => out.push(e)); }
      const cta = t.detalhe || 'Chama no direct', tc = 34, wc = M.largura(fs.texto, cta, { tam: tc }) + 80;
      out.push({ d: F.ret((W - wc) / 2, yc, wc, 84, 42), f: papel }, { d: M.tr(M.texto(fs.texto, cta, { tam: tc }).cmds, M.mx.t((W - wc) / 2 + 40, yc + 42 + tc / 2)), f: c.ink });
      M.logoNaCaixa(k.word, vs.negativo, (W - W * 0.34) / 2, H - mg - 52, W * 0.34, 52, fundo).forEach(e => out.push(e));
      return out;
    },
    /* EDITORIAL: papel, fios de revista, a frase na letra da marca e o logo no canto */
    editorial(k, W, H, t){
      const { c, vs, fs, sp } = k, fundo = c.paper, tinta = c.ink, mg = Math.round(W * 0.083), out = [ret(0, 0, W, H, fundo)];
      out.push(ret(mg, mg, W - 2 * mg, 3, tinta));
      const cab = M.texto(fs.texto, (sp.nome + '  ·  Nº 01').toUpperCase(), { tam: 20, track: 0.24 }); out.push({ d: M.tr(cab.cmds, M.mx.t(mg, mg + 46)), f: tinta });
      out.push({ d: F.elipse(W - mg - 12, mg + 36, 12), f: M.contraste(c.a, fundo) >= 1.6 ? c.a : c.p });
      const larg = W - 2 * mg, y0 = mg + 130, tam = encaixa(fs.display, t.frase, larg, H * 0.5, 6, 132, { caixa: caixaDe(sp) });
      const p = bloco(fs.display, t.frase, mg, y0, larg, tam, { caixa: caixaDe(sp), max: 6 }); out.push({ d: p.cmds, f: tinta });
      if(t.detalhe){ const d = bloco(fs.texto, t.detalhe, mg, y0 + p.h + 60, larg * 0.8, 32, { entre: 48, max: 3 }); out.push({ d: d.cmds, f: tinta, op: 0.82 }); }
      out.push(ret(mg, H - mg - 96, W - 2 * mg, 3, tinta));
      M.logoNaCaixa(k.logo, vs.principal, W - mg - W * 0.36, H - mg - 72, W * 0.36, 60, fundo).forEach(e => out.push(e));
      return out;
    }
  };
  /* a cena pronta: { els, w, h, svg } */
  PO.cena = (k, modelo, formato, t) => {
    const [W, H] = PO.FORMATOS[formato] || PO.FORMATOS.post, txt = { frase: String((t && t.frase) || k.sp.nome).trim() || k.sp.nome, detalhe: String((t && t.detalhe) || '').trim() };
    const els = (MOD[modelo] || MOD.manchete)(k, W, H, txt);
    return { els, w: W, h: H, svg: M.svg(els, { vb: { x: 0, y: 0, w: W, h: H }, titulo: (PO.MODELOS[modelo] || 'Post') + ' · ' + k.sp.nome }) };
  };
  PO.png = async (k, modelo, formato, t) => { const r = PO.cena(k, modelo, formato, t); return await M.png(r.svg, r.w, r.h); };
  /* a frase de partida: a primeira frase da voz, a frase do logo, o conceito, o nome */
  PO.fraseDe = k => String((k.voz && k.voz.taglines && k.voz.taglines[0]) || k.sp.tagline || (k.voz && k.voz.conceito) || k.sp.nome);

  /* ---------- as capas de destaque do Instagram (1080 x 1920; o Instagram mostra o círculo do meio) ---------- */
  const DESTAQUE_NICHO = { comida: 'Cardápio', cafe: 'Cardápio', doces: 'Doces', bebidas: 'Drinks', beleza: 'Serviços', moda: 'Peças', fitness: 'Treinos', saude: 'Cuidados', pet: 'Pets', casa: 'Obras',
    tech: 'Projetos', criativo: 'Trabalhos', musica: 'Som', educacao: 'Cursos', agro: 'Campo', auto: 'Serviços', servicos: 'Serviços', varejo: 'Produtos', eventos: 'Eventos', arte: 'Trabalhos', outro: 'Produtos' };
  PO.destaques = k => {
    const sp = k.sp, ic = ((M.NICHOS[sp.nicho] || M.NICHOS.outro).ic || ['estrela'])[0];
    return [['novidades', 'Novidades', 'estrela'], [M.handleDe(DESTAQUE_NICHO[sp.nicho] || 'Produtos'), DESTAQUE_NICHO[sp.nicho] || 'Produtos', ic], ['clientes', 'Clientes', 'coracao'], ['bastidores', 'Bastidores', 'camera'], ['onde-fica', 'Onde fica', 'casa'], ['dicas', 'Dicas', 'lampada']]
      .map(([arq, nome, icone]) => {
        const W = 1080, H = 1920, fundo = k.c.p, tinta = M.texto_em(fundo, k.c.ink, k.c.paper), i = M.icone(icone, W / 2 - 230, H / 2 - 230, 460);
        const els = [ret(0, 0, W, H, fundo), { d: F.anel(W / 2, H / 2, 420, 410), f: tinta, op: 0.22 }, { d: i.cmds, s: tinta, w: i.w, f: null }];
        return { arq, nome, els, svg: M.svg(els, { vb: { x: 0, y: 0, w: W, h: H }, titulo: nome }) };
      });
  };

  /* ---------- impressos em PDF vetor (mm): cartão 90 x 50 com 3 mm de sangria, e papel timbrado A4 ---------- */
  const MM = 72 / 25.4;
  PO.cartaoPdf = async (k, link) => {
    const { c, vs, fs, sp } = k, W = 96, H = 56, fundoF = c.p;
    const frente = [ret(0, 0, W, H, fundoF)].concat(M.logoNaCaixa(k.logo, vs.cor, 18, 13, 60, 30, fundoF));
    const tx = (f, s, x, y, tam, cor, o) => ({ d: M.texto(f, s, Object.assign({ tam, x, y }, o || {})).cmds, f: cor });
    const verso = [ret(0, 0, W, H, c.paper)].concat(M.logoNaCaixa(k.simb, vs.principal, 9, 9, 11, 11, c.paper, 'esq'));
    verso.push(tx(fs.display, sp.nome, 9, 31, 3.6, c.ink, { caixa: sp.logo && sp.logo.caixa }), ret(9, 34.2, 7, 0.6, M.contraste(c.a, c.paper) >= 1.6 ? c.a : c.p));
    verso.push(tx(fs.texto, '@' + M.handleDe(sp.nome), 9, 40.5, 2.1, c.ink), tx(fs.texto, String(sp.cidade || '').split(',')[0] || ' ', 9, 44.6, 2.1, c.ink));
    if(link && M.qr){ const q = M.qr(link), lado = 13; verso.push(ret(W - 9 - lado - 1, H - 9 - lado - 1, lado + 2, lado + 2, '#FFFFFF')); M.qrEls(q, W - 9 - lado, H - 9 - lado, lado, c.ink).forEach(e => verso.push(e)); }
    const dna = M.dna(sp), tot = dna.reduce((a, x) => a + x.w, 0); let x0 = 0; dna.forEach(b => { verso.push(ret(x0, H - 3, b.w / tot * W + 0.05, 3, b.c)); x0 += b.w / tot * W; });
    return await M.pdf([{ w: W * MM, h: H * MM, esc: MM, els: frente }, { w: W * MM, h: H * MM, esc: MM, els: verso }], { titulo: sp.nome + ' · cartão de visita', autor: 'Studio Houzi' });
  };
  PO.timbradoPdf = async k => {
    const { c, vs, fs, sp } = k, W = 210, H = 297, els = [ret(0, 0, W, H, '#FFFFFF')];
    M.logoNaCaixa(k.logo, vs.principal, 20, 16, 58, 16, '#FFFFFF', 'esq').forEach(e => els.push(e));
    els.push(ret(20, 40, 170, 0.5, c.p));
    els.push(ret(20, 274, 170, 0.3, c.ink));
    const rod = [sp.nome, '@' + M.handleDe(sp.nome), String(sp.cidade || '').split(',')[0], sp.tagline].filter(Boolean).join('  ·  ');
    els.push({ d: M.texto(fs.texto, rod, { tam: 2.3, x: 20, y: 281, track: 0.06 }).cmds, f: c.ink });
    const dna = M.dna(sp), tot = dna.reduce((a, x) => a + x.w, 0); let x0 = 0; dna.forEach(b => { els.push(ret(x0, H - 4, b.w / tot * W + 0.05, 4, b.c)); x0 += b.w / tot * W; });
    return await M.pdf([{ w: W * MM, h: H * MM, esc: MM, els }], { titulo: sp.nome + ' · papel timbrado', autor: 'Studio Houzi' });
  };
})();
