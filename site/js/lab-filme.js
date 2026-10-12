/* CORRE · STUDIO HOUZI · O FILME DA MARCA (v3.39).
   A abertura do brandbook: no escuro, a grade aparece, as linhas de construção se desenham, o logo é traçado peça por
   peça (o símbolo primeiro, depois cada letra) e, no acorde da assinatura sonora, a cor da marca inunda a tela a partir
   do símbolo. O mesmo filme toca na capa do brandbook (em cima do logo de verdade, que fica no lugar quando acaba) e sai
   em vídeo no kit (quadrado pro feed e em pé pro story/reels), com o som junto. Tudo desenhado aqui, num canvas. */
(function(){
  'use strict';
  const C = window.Corre, M = C.labMotor;
  if(!M) return;
  const FI = C.houziFilme = {};
  const ease = t => t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(1 - t, 3);
  const entre = (t, a, b) => ease((t - a) / Math.max(0.001, b - a));
  const VIDEO = { quadrado: [1080, 1080], vertical: [1080, 1920] };
  FI.VIDEO = VIDEO;

  /* o comprimento de um caminho (amostra as curvas): o traço se desenha do começo ao fim */
  const comprimento = cmds => {
    let L = 0, x = 0, y = 0, sx = 0, sy = 0;
    for(const c of M.parse(cmds)){
      if(c[0] === 'M'){ x = c[1]; y = c[2]; sx = x; sy = y; }
      else if(c[0] === 'L'){ L += Math.hypot(c[1] - x, c[2] - y); x = c[1]; y = c[2]; }
      else if(c[0] === 'C' || c[0] === 'Q'){
        const fim = c[0] === 'C' ? [c[5], c[6]] : [c[3], c[4]]; let px = x, py = y;
        for(let k = 1; k <= 8; k++){ const t = k / 8, u = 1 - t; let qx, qy;
          if(c[0] === 'C'){ qx = u * u * u * x + 3 * u * u * t * c[1] + 3 * u * t * t * c[3] + t * t * t * c[5]; qy = u * u * u * y + 3 * u * u * t * c[2] + 3 * u * t * t * c[4] + t * t * t * c[6]; }
          else { qx = u * u * x + 2 * u * t * c[1] + t * t * c[3]; qy = u * u * y + 2 * u * t * c[2] + t * t * c[4]; }
          L += Math.hypot(qx - px, qy - py); px = qx; py = qy; }
        x = fim[0]; y = fim[1];
      }
      else if(c[0] === 'Z'){ L += Math.hypot(sx - x, sy - y); x = sx; y = sy; }
    }
    return Math.max(1, L);
  };
  const rgba = (hex, a) => { const [r, g, b] = M.rgb255(hex); return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`; };

  /* as linhas de construção (no sistema do logo): linha de base, altura da maiúscula e do x, o começo e o fim do nome,
     a caixa do símbolo com as diagonais e o círculo de dentro */
  FI.guias = lg => {
    const g = lg.guia || {}, vb = lg.vb, out = [], m = Math.max(vb.w, vb.h) * 0.08;
    const linha = (x1, y1, x2, y2, k) => out.push({ d: M.forma.linha(x1, y1, x2, y2), k: k || 'linha' });
    if(g.base != null){
      linha(vb.x - m, g.base, vb.x + vb.w + m, g.base, 'base'); linha(vb.x - m, g.cap, vb.x + vb.w + m, g.cap, 'cap');
      if(g.xh != null && Math.abs(g.xh - g.cap) > 8) linha(vb.x - m, g.xh, vb.x + vb.w + m, g.xh, 'xh');
      if(g.nome){ linha(g.nome.x, vb.y - m, g.nome.x, vb.y + vb.h + m); linha(g.nome.x + g.nome.w, vb.y - m, g.nome.x + g.nome.w, vb.y + vb.h + m); }
    }
    if(g.simb){ const s = g.simb; out.push({ d: M.forma.ret(s.x, s.y, s.w, s.h, 0), k: 'caixa' }); linha(s.x, s.y, s.x + s.w, s.y + s.h); linha(s.x + s.w, s.y, s.x, s.y + s.h); out.push({ d: M.forma.elipse(s.x + s.w / 2, s.y + s.h / 2, s.w / 2), k: 'circulo' }); }
    if(!out.length){ linha(vb.x - m, vb.y + vb.h / 2, vb.x + vb.w + m, vb.y + vb.h / 2); linha(vb.x + vb.w / 2, vb.y - m, vb.x + vb.w / 2, vb.y + vb.h + m); out.push({ d: M.forma.ret(vb.x, vb.y, vb.w, vb.h, 0), k: 'caixa' }); }
    return out;
  };

  /* prepara um filme: k (o "kit" de desenho do lab-livro), o: { w, h, caixa: {x,y,w,h} (onde o logo fica), formato, som } */
  FI.prepara = (k, o) => {
    const sp = k.sp, c = k.c, vs = k.vs, lg = k.logo, vF = vs.cor, mg = lg.x * 0.6;
    const vb = { x: lg.vb.x - mg, y: lg.vb.y - mg, w: lg.vb.w + 2 * mg, h: lg.vb.h + 2 * mg };
    const W = o.w, H = o.h, cx = o.caixa || { x: W * 0.18, y: H * 0.3, w: W * 0.64, h: H * 0.4 };
    const e = Math.min(cx.w / vb.w, cx.h / vb.h), dx = cx.x + (cx.w - vb.w * e) / 2 - vb.x * e, dy = cx.y + (cx.h - vb.h * e) / 2 - vb.y * e;
    const P = { W, H, e, dx, dy, c, sp, vF, fundo0: c.ink, linha: M.texto_em(c.ink, c.ink, c.paper), acento: M.contraste(c.a, c.ink) >= 2.2 ? c.a : c.paper, fundo1: vF.fundo, formato: o.formato || 'capa' };
    /* as peças do logo, na ordem: símbolo, nome (da esquerda pra direita), frase */
    const ord = { simbolo: 0, nome: 1, frase: 2 };
    const pecas = M.pinta(lg, vF).map((el, i) => ({ el, i, b: M.caixa(el.d) })).filter(x => x.el.f || x.el.s);
    pecas.sort((a, b) => (ord[a.el.parte] || 1) - (ord[b.el.parte] || 1) || (a.el.parte === 'nome' ? a.b.x - b.b.x : a.i - b.i));
    P.pecas = pecas.map(x => ({ p: new Path2D(M.d(x.el.d)), len: comprimento(x.el.d), furo: x.el.furo, parte: x.el.parte, traco: x.el.s ? (x.el.w || 2) : 0 }));
    P.guias = FI.guias(lg).map(g => ({ p: new Path2D(M.d(g.d)), len: comprimento(g.d), k: g.k }));
    const gs = lg.guia && lg.guia.simb ? lg.guia.simb : null, cen = gs ? [gs.x + gs.w / 2, gs.y + gs.h / 2] : [lg.vb.x + lg.vb.w / 2, lg.vb.y + lg.vb.h / 2];
    P.centro = [dx + cen[0] * e, dy + cen[1] * e];
    P.raio = Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map(([x, y]) => Math.hypot(x - P.centro[0], y - P.centro[1])));
    /* a camada do logo pronto (com os furos vazados), desenhada uma vez */
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    g.setTransform(e, 0, 0, e, dx, dy);
    M.pinta(lg, vF).forEach(el => { if(el.furo) return; const p = new Path2D(M.d(el.d)); if(el.clip){ g.save(); g.clip(new Path2D(M.d(el.clip)), el.clipEo ? 'evenodd' : 'nonzero'); } if(el.f){ g.fillStyle = el.f; g.fill(p, el.eo ? 'evenodd' : 'nonzero'); } if(el.s){ g.strokeStyle = el.s; g.lineWidth = el.w || 1; g.lineCap = el.cap || 'round'; g.lineJoin = 'round'; g.stroke(p); } if(el.clip) g.restore(); });
    g.globalCompositeOperation = 'destination-out';
    M.pinta(lg, vF).forEach(el => { if(!el.furo) return; const p = new Path2D(M.d(el.d)); g.fillStyle = '#000'; g.strokeStyle = '#000'; if(el.f) g.fill(p); if(el.s){ g.lineWidth = el.w || 1; g.lineCap = el.cap || 'round'; g.stroke(p); } });
    P.camada = cv;
    /* o tempo: com a assinatura sonora, a cor entra no acorde */
    P.som = o.som || null;
    const tA = P.som ? P.som.p.acorde.t : 1.25;
    P.tCor = Math.max(1.25, Math.min(2.3, 0.35 + tA));
    P.dur = Math.max(4.4, P.tCor + 2.4);
    const n = P.pecas.length, janela = Math.max(0.3, P.tCor - 0.25 - 0.3);
    P.passo = n > 1 ? Math.min(0.09, Math.max(0.02, (janela - 0.55) / (n - 1))) : 0;
    /* o vídeo leva a frase e a paleta embaixo (a capa do brandbook já tem as dela) */
    if(P.formato !== 'capa'){
      const frase = String((k.voz && k.voz.conceito) || sp.tagline || (M.TERRITORIOS[sp.territorio] || {}).frase || '').trim();
      const corTx = M.texto_em(vF.fundo, c.ink, c.paper), tam = P.formato === 'vertical' ? 30 : 24, larg = W * 0.72;
      const pa = frase ? M.paragrafo(k.fs.texto, frase, { tam, larg, x: (W - larg) / 2, y: cx.y + cx.h + tam * 3.2, entre: tam * 1.75, alinha: 'centro', max: 3 }) : null;
      P.frase = pa && pa.cmds.length ? { p: new Path2D(M.d(pa.cmds)), cor: corTx } : null;
      const nm = M.texto(k.fs.texto, ('@' + M.handleDe(sp.nome)).toUpperCase(), { tam: 15, track: 0.24 });
      P.arroba = { p: new Path2D(M.d(M.tr(nm.cmds, M.mx.t((W - nm.w) / 2, H - 120)))), cor: corTx };
      P.paleta = ['p', 's', 'a', 'ink', 'paper'].map(kk => c[kk]);
    }
    return P;
  };

  /* um quadro do filme no tempo t (segundos) */
  FI.quadro = (ctx, P, t) => {
    const { W, H, e, dx, dy } = P;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = P.fundo0; ctx.fillRect(0, 0, W, H);
    const someGrade = 1 - entre(t, P.tCor + 0.35, P.tCor + 0.8);
    /* a grade fina do fundo */
    const aG = 0.07 * entre(t, 0, 0.5) * someGrade;
    if(aG > 0.002){ ctx.strokeStyle = rgba(P.linha, aG); ctx.lineWidth = 1; const passo = Math.max(24, Math.round(Math.min(W, H) / 14)); ctx.beginPath(); for(let x = (W % passo) / 2; x <= W; x += passo){ ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); } for(let y = (H % passo) / 2; y <= H; y += passo){ ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); } ctx.stroke(); }
    /* as linhas de construção */
    ctx.setTransform(e, 0, 0, e, dx, dy);
    P.guias.forEach((g, i) => {
      const pr = entre(t, 0.15 + i * 0.07, 0.95 + i * 0.07); if(pr <= 0) return;
      ctx.strokeStyle = rgba(P.acento, 0.55 * someGrade); ctx.lineWidth = 1.2 / e; ctx.setLineDash([g.len, g.len]); ctx.lineDashOffset = g.len * (1 - pr); ctx.stroke(g.p);
    });
    /* o logo traçado, peça por peça */
    const someTraco = 1 - entre(t, P.tCor + 0.1, P.tCor + 0.6);
    if(someTraco > 0.01) P.pecas.forEach((pc, i) => {
      const t0 = 0.3 + i * P.passo, pr = entre(t, t0, t0 + 0.55); if(pr <= 0) return;
      ctx.strokeStyle = rgba(P.linha, 0.92 * someTraco); ctx.lineWidth = (pc.traco ? Math.max(1.4 / e, pc.traco * 0.35) : 1.6 / e); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.setLineDash([pc.len, pc.len]); ctx.lineDashOffset = pc.len * (1 - pr); ctx.stroke(pc.p);
      /* um véu de preenchimento antes da cor (a peça "acende") */
      const vela = entre(t, t0 + 0.4, t0 + 0.9) * 0.16 * someTraco; if(vela > 0.005 && !pc.traco && !pc.furo){ ctx.fillStyle = rgba(P.linha, vela); ctx.fill(pc.p); }
    });
    ctx.setLineDash([]);
    /* a cor da marca inunda a tela a partir do símbolo, com o logo pronto dentro */
    const pr = entre(t, P.tCor, P.tCor + 0.65);
    if(pr > 0){
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.save(); ctx.beginPath(); ctx.arc(P.centro[0], P.centro[1], Math.max(0.5, P.raio * pr), 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = P.fundo1; ctx.fillRect(0, 0, W, H);
      const lgA = entre(t, P.tCor + 0.05, P.tCor + 0.4); ctx.globalAlpha = lgA; ctx.drawImage(P.camada, 0, 0); ctx.globalAlpha = 1;
      ctx.restore();
    }
    /* no vídeo: a frase, o @ e a paleta embaixo */
    if(P.formato !== 'capa' && t > P.tCor + 0.6){
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const a1 = entre(t, P.tCor + 0.6, P.tCor + 1.2), sobe = (1 - a1) * 24;
      if(P.frase){ ctx.save(); ctx.globalAlpha = a1; ctx.translate(0, sobe); ctx.fillStyle = P.frase.cor; ctx.fill(P.frase.p); ctx.restore(); }
      const a2 = entre(t, P.tCor + 0.9, P.tCor + 1.5);
      ctx.save(); ctx.globalAlpha = a2; ctx.fillStyle = P.arroba.cor; ctx.fill(P.arroba.p); ctx.restore();
      const bw = Math.min(W * 0.5, 520), bx = (W - bw) / 2, by = H - 80, n = P.paleta.length;
      P.paleta.forEach((cor, i) => { const a3 = entre(t, P.tCor + 0.9 + i * 0.08, P.tCor + 1.3 + i * 0.08); if(a3 <= 0) return; ctx.fillStyle = cor; ctx.fillRect(bx + i * bw / n, by + 14 * (1 - a3), bw / n * a3 + 0.5, 14 * a3); });
    }
  };

  /* toca na tela (requestAnimationFrame); devolve como parar. o.fim é chamado no último quadro */
  FI.toca = (cv, P, o) => {
    o = o || {}; const ctx = cv.getContext('2d'); let rodando = true, t0 = null;
    const passo = agora => { if(!rodando) return; if(t0 == null) t0 = agora; const t = (agora - t0) / 1000; FI.quadro(ctx, P, Math.min(t, P.dur)); if(o.aCada) o.aCada(t); if(t >= P.dur){ rodando = false; if(o.fim) o.fim(); return; } requestAnimationFrame(passo); };
    requestAnimationFrame(passo);
    return { para(){ rodando = false; } };
  };

  /* o vídeo (o filme com o som): MP4 quando o navegador grava MP4, senão WebM */
  FI.tipoVideo = () => { const MR = window.MediaRecorder; if(!MR) return ''; return ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(t => { try{ return MR.isTypeSupported(t); }catch(e){ return false; } }) || ''; };
  FI.grava = async (k, formato, som) => {
    const tipo = FI.tipoVideo(); if(!tipo) throw new Error('Este navegador não grava vídeo.');
    const [W, H] = VIDEO[formato] || VIDEO.quadrado, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const lw = W * (formato === 'vertical' ? 0.74 : 0.64), lh = H * (formato === 'vertical' ? 0.22 : 0.34);
    const P = FI.prepara(k, { w: W, h: H, formato, som, caixa: { x: (W - lw) / 2, y: H * (formato === 'vertical' ? 0.34 : 0.27), w: lw, h: lh } });
    const ctx = cv.getContext('2d'); FI.quadro(ctx, P, 0);
    const stream = cv.captureStream(30);
    let ac = null, src = null;
    if(som && C.houziSom){ try{ const AC = window.AudioContext || window.webkitAudioContext; ac = new AC(); if(ac.state === 'suspended') await Promise.race([ac.resume(), new Promise(ok => setTimeout(ok, 900))]); const dest = ac.createMediaStreamDestination(); src = ac.createBufferSource(); src.buffer = C.houziSom.buffer(ac, som.r); src.connect(dest); dest.stream.getAudioTracks().forEach(tr => stream.addTrack(tr)); }catch(e){ ac = null; src = null; } }
    const rec = new window.MediaRecorder(stream, { mimeType: tipo, videoBitsPerSecond: 8e6, audioBitsPerSecond: 192e3 }), partes = [];
    rec.ondataavailable = ev => { if(ev.data && ev.data.size) partes.push(ev.data); };
    const parou = new Promise(ok => { rec.onstop = ok; });
    rec.start(250);
    if(src) src.start(ac.currentTime + 0.35);
    await new Promise(ok => FI.toca(cv, P, { fim: ok }));
    await new Promise(ok => setTimeout(ok, 200));
    rec.stop(); await parou;
    stream.getTracks().forEach(tr => tr.stop()); if(ac) try{ ac.close(); }catch(e){}
    const mime = tipo.split(';')[0];
    return { blob: new Blob(partes, { type: mime }), ext: mime === 'video/mp4' ? 'mp4' : 'webm', dur: P.dur };
  };

  /* quadros parados do filme, em vetor (pro PDF): 0 = construção, 1 = o logo traçado, 2 = a cor entrando, 3 = pronto */
  FI.quadroEls = (k, n, w, h) => {
    const lg = k.logo, c = k.c, vF = k.vs.cor, mg = lg.x * 0.6, vb = { x: lg.vb.x - mg, y: lg.vb.y - mg, w: lg.vb.w + 2 * mg, h: lg.vb.h + 2 * mg };
    const e = Math.min(w * 0.7 / vb.w, h * 0.6 / vb.h), dx = (w - vb.w * e) / 2 - vb.x * e, dy = (h - vb.h * e) / 2 - vb.y * e, m = [e, 0, 0, e, dx, dy];
    const linha = M.texto_em(c.ink, c.ink, c.paper), acento = M.contraste(c.a, c.ink) >= 2.2 ? c.a : c.paper, out = [{ d: M.forma.ret(0, 0, w, h, 0), f: n === 3 ? vF.fundo : c.ink }];
    if(n === 3) return out.concat(M.trEls(M.pintaSobre(lg, vF, vF.fundo), m));
    FI.guias(lg).forEach(g => out.push({ d: M.tr(g.d, m), s: acento, w: 0.8, f: null, op: 0.6 }));
    if(n >= 1) M.pinta(lg, vF).forEach(el => out.push({ d: M.tr(el.d, m), s: linha, w: 1, f: null, op: 0.9 }));
    if(n === 2){ const gs = lg.guia && lg.guia.simb, cx = gs ? dx + (gs.x + gs.w / 2) * e : w / 2, cy = gs ? dy + (gs.y + gs.h / 2) * e : h / 2, circ = M.forma.elipse(cx, cy, Math.max(4, Math.min(Math.max(w, h) * 0.32, cx, cy, w - cx, h - cy)));
      out.push({ d: M.forma.ret(0, 0, w, h, 0), f: vF.fundo, clip: circ }); M.trEls(M.pintaSobre(lg, vF, vF.fundo), m).forEach(el => out.push(Object.assign({}, el, { clip: circ }))); }
    return out;
  };
})();
