/* CORRE · ESTÚDIO DE POSTS (dentro do painel de cada marca)
   Agenda de posts, criador de arte 1080×1350 com a cor e o logo da marca, legenda montada em partes
   (gancho, corpo, chamada, hashtags) e o "Postar": copia a legenda, baixa a arte e abre o Instagram. */
(function(){
  'use strict';
  const C = window.Corre, { esc, ico } = C;
  /* v4.17: o story é 1080×1920 (HH muda no render) e tem as faixas que o Instagram cobre em cima e embaixo (PT e PB) */
  const W = 1080, M = 80;
  let HH = 1350, PT = 0, PB = 0;
  /* v4.17: os formatos do post (a chave, o nome, o selo e a dica do editor) */
  const FMTS = [['feed', 'Feed', '4:5', 'Uma arte no feed, 1080×1350.'], ['carrossel', 'Carrossel', 'até 10', 'De 2 a 10 slides: arte, foto ou vídeo de até 60 s. A legenda é uma só.'], ['story', 'Story', '9:16', 'Arte 1080×1920 ou vídeo de até 60 s. Story não leva legenda: o que precisa dizer vai na arte.'], ['reels', 'Reels', 'vídeo', 'Vídeo de 3 s a 15 min, em pé. A capa é um quadro do vídeo.']];
  const MODELOS = [['capa', 'Capa'], ['imagem', 'Só imagem'], ['foto', 'Foto'], ['oferta', 'Oferta'], ['frase', 'Frase'], ['lista', 'Lista']];
  const ESTILOS = [['refs', 'Igual às referências', 'seguindo de perto o estilo visual das imagens de referência'], ['foto', 'Foto de anúncio', 'fotografia realista de publicidade, luz natural bonita, foco nítido, cores vivas'], ['riso', 'Risografia', 'ilustração em risografia com três cores chapadas, textura de impressão e granulado'], ['colagem', 'Colagem', 'colagem editorial com recortes de papel e fotografias, textura de xerox'], ['3d', '3D brinquedo', 'render 3D estilo brinquedo, cores vivas, luz de estúdio suave'], ['noite', 'Cinema noturno', 'fotografia cinematográfica noturna, luz de neon, grão de filme']];
  const IG_ERRO = { sem_chave: 'O Instagram ainda não foi ligado no Corre. Por enquanto, sobe o print do feed.', nao_comercial: 'Esse @ não é conta comercial ou de criador (ou não existe). Sobe o print do feed.', sem_posts: 'Esse perfil não tem posts com imagem.', limite: 'Hoje já deu o limite de puxadas do Instagram. Amanhã tem mais.', ocupado: 'O Instagram pediu um tempo. Tenta daqui a pouco.', usuario: 'Esse @ não parece certo.', login: 'Entra de novo pra puxar do Instagram.', provedor: 'O Instagram não respondeu. Tenta de novo.' };
  const IG_RE = /^[A-Za-z0-9_.]{1,30}$/;
  const limpaIg = v => String(v || '').trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/[/?#].*$/, '');
  const LEG_ERRO = { sem_chave: 'A IA ainda não foi ligada no Corre.', limite: 'Hoje já deu o limite de legendas. Amanhã tem mais.', login: 'Entra de novo pra escrever com IA.', prompt: 'Falta o nome da marca.', provedor: 'A IA não conseguiu escrever agora. Tenta de novo.' };
  const IA_ERRO = { sem_chave: 'A IA de imagem ainda não foi ligada no Corre.', limite: 'Hoje já deu o limite de imagens. Amanhã tem mais.', login: 'Entra de novo pra gerar imagem.', prompt: 'Descreve a imagem com um pouco mais de palavra.', provedor: 'A IA não conseguiu gerar essa. Muda a descrição e tenta de novo.', refs: 'Não consegui ler as referências. Tira e põe de novo.', bloqueada: 'A IA recusou essa cena. Muda a descrição e tenta de novo.', nofn: 'Na demonstração a imagem é desenhada pelo próprio Corre.' };
  /* conta da OpenAI sem saldo: a função devolve "provedor" com o detalhe da OpenAI; aqui vira um aviso claro */
  const SEM_CREDITO = 'A IA do Corre ficou sem crédito na OpenAI. Quem cuida do Corre recarrega em platform.openai.com › Billing e ela volta na hora.';
  const semCredito = e => !!e && (e.code === 'sem_credito' || /credit|quota|billing/i.test(String(e.detalhe || '')));
  const VERIFICAR = 'A conta da OpenAI precisa ser verificada pra usar esse modelo: platform.openai.com › Settings › Organization › Verify Organization. Leva uns minutos.';
  const naoVerificada = e => !!e && /must be verified|verify organization/i.test(String(e.detalhe || ''));
  const iaMsg = (e, MAP, fb) => semCredito(e) ? SEM_CREDITO : naoVerificada(e) ? VERIFICAR : e && e.code === 'limite' ? C.limiteMsg(e, MAP === IA_ERRO ? 'imagens' : 'legendas') : (e && (MAP[e.code] || (e.status === 404 && MAP.sem_chave))) || C.errMsg(e, fb);
  const STATUS = [['ideia', 'Ideia'], ['pronto', 'Pronto'], ['postado', 'Postado']];
  const CTAS = ['Salva pra não esquecer.', 'Manda pra quem precisa ver isso.', 'Comenta aqui embaixo.', 'Chama no direct.', 'Link na bio.', 'Passa aqui hoje.'];
  const PAL = ['#FFE800', '#FF48B0', '#0067AE', '#FF6C2F', '#765BA7', '#141216', '#F4F3EF'];
  const E = { marca: null, posts: [], visitas: [], f: '' };

  /* ---------- desenho ---------- */
  const lum = hex => { const n = parseInt(String(hex || '#000').slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
  const inkOn = bg => lum(bg) > 0.55 ? '#141216' : '#FFFFFF';
  const accentOn = bg => { const l = lum(bg); return l > 0.8 ? '#FF48B0' : (bg.toUpperCase() === '#FFE800' ? '#FF48B0' : '#FFE800'); };
  function font(ctx, w, px, stretch){ ctx.font = `${w} ${px}px Archivo, "Arial Narrow", sans-serif`; try{ ctx.fontStretch = stretch || 'normal'; }catch(e){} }
  function wrap(ctx, text, maxW){
    const out = [];
    String(text || '').split('\n').forEach(par => {
      const words = par.split(/\s+/).filter(Boolean); let line = '';
      words.forEach(w => { const t = line ? line + ' ' + w : w; if(ctx.measureText(t).width > maxW && line){ out.push(line); line = w; } else line = t; });
      out.push(line);
    });
    return out;
  }
  function fit(ctx, text, maxW, maxH, big, small, weight, stretch, lh){
    for(let px = big; px >= small; px -= 4){ font(ctx, weight, px, stretch); const lines = wrap(ctx, text, maxW); if(lines.length * px * lh <= maxH && lines.every(l => ctx.measureText(l).width <= maxW)) return { px, lines }; }
    font(ctx, weight, small, stretch); return { px: small, lines: wrap(ctx, text, maxW) };
  }
  function rr(ctx, x, y, w, h, r){ ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
  function dots(ctx, color, alpha){ ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color; for(let y = 0; y < HH; y += 14) for(let x = (y / 14) % 2 ? 7 : 0; x < W; x += 14){ ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 6.283); ctx.fill(); } ctx.restore(); }
  function cover(ctx, img, x, y, w, h){ const k = Math.max(w / img.naturalWidth, h / img.naturalHeight), sw = w / k, sh = h / k; ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h); }
  const loadImg = src => new Promise(ok => { if(!src) return ok(null); const im = new Image(); if(!/^(data|blob):/.test(src)) im.crossOrigin = 'anonymous'; im.onload = () => ok(im); im.onerror = () => ok(null); im.src = src; });
  function footer(ctx, a, ink, logo){
    const y = HH - PB - M + 6; let x = M;
    if(logo){ ctx.save(); ctx.beginPath(); ctx.arc(x + 30, y - 22, 30, 0, 6.283); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.clip(); cover(ctx, logo, x, y - 52, 60, 60); ctx.restore(); ctx.lineWidth = 4; ctx.strokeStyle = ink; ctx.beginPath(); ctx.arc(x + 30, y - 22, 30, 0, 6.283); ctx.stroke(); x += 78; }
    font(ctx, 800, 32, 'normal'); ctx.fillStyle = ink; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.fillText(a.marca, x, y - 10);
    if(a.rede){ font(ctx, 600, 26, 'normal'); ctx.textAlign = 'right'; ctx.globalAlpha = .85; ctx.fillText('@' + a.rede, W - M, y - 10); ctx.globalAlpha = 1; ctx.textAlign = 'left'; }
  }
  async function render(cv, a){
    try{ await Promise.all([document.fonts.load('900 100px Archivo'), document.fonts.load('800 40px Archivo'), document.fonts.load('600 30px Archivo')]); }catch(e){}
    const ctx = cv.getContext('2d');
    const bg = a.cor || '#FFE800', ink = inkOn(bg), acc = accentOn(bg);
    const [foto, logo] = await Promise.all([loadImg(a.foto), loadImg(a.logo ? a.logo_url : '')]);
    /* daqui pra baixo o desenho não espera mais nada: o tamanho vale até o fim dele */
    HH = a.alto === 1920 ? 1920 : 1350; PT = HH === 1920 ? 190 : 0; PB = HH === 1920 ? 250 : 0;
    cv.width = W; cv.height = HH;
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    const kicker = (y, color, fill) => { if(!a.kicker) return; font(ctx, 800, 30, 'normal'); const t = a.kicker.toUpperCase(), w = ctx.measureText(t).width + 44; ctx.fillStyle = fill; rr(ctx, M, y - 44, w, 60, 30); ctx.fill(); ctx.fillStyle = color; ctx.fillText(t, M + 22, y - 3); };
    const m = a.modelo || 'capa';
    /* v3.38: arte que a pessoa subiu (Subir artes, no Studio) vai como veio, sem título nem rodapé */
    if(m === 'subida'){ ctx.fillStyle = '#141216'; ctx.fillRect(0, 0, W, HH); if(foto) cover(ctx, foto, 0, 0, W, HH); return; }
    if(m === 'imagem'){
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, HH);
      if(foto){ cover(ctx, foto, 0, 0, W, HH); const g = ctx.createLinearGradient(0, HH - PB - 260, 0, HH); g.addColorStop(0, 'rgba(12,10,15,0)'); g.addColorStop(1, 'rgba(12,10,15,.6)'); ctx.fillStyle = g; ctx.fillRect(0, HH - PB - 260, W, PB + 260); footer(ctx, a, '#FFFFFF', logo); }
      else { dots(ctx, ink, .08); font(ctx, 800, 46, 'normal'); ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.fillText('Gera com a IA ou põe uma foto', W / 2, HH / 2); ctx.textAlign = 'left'; footer(ctx, a, ink, logo); }
      return;
    }
    if(m === 'capa' || m === 'foto'){
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, HH);
      if(foto){ cover(ctx, foto, 0, 0, W, HH); const g = ctx.createLinearGradient(0, HH * 0.3, 0, HH); g.addColorStop(0, 'rgba(12,10,15,0)'); g.addColorStop(1, 'rgba(12,10,15,.86)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, HH); }
      else dots(ctx, ink, .08);
      const tc = foto ? '#FFFFFF' : ink;
      if(m === 'foto' && foto){
        const t = fit(ctx, a.titulo || '', W - M * 2 - 60, 300, 84, 44, 900, 'condensed', 1.0);
        const sub = a.texto ? (font(ctx, 600, 34, 'normal'), wrap(ctx, a.texto, W - M * 2 - 60).slice(0, 3)) : [];
        const boxH = 60 + t.lines.length * t.px + (sub.length ? 20 + sub.length * 44 : 0) + 30, by = HH - PB - M - 90 - boxH;
        ctx.fillStyle = '#FFFFFF'; rr(ctx, M, by, W - M * 2, boxH, 28); ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = '#141216'; ctx.stroke();
        ctx.fillStyle = bg; ctx.fillRect(M + 30, by - 10, 120, 20);
        font(ctx, 900, t.px, 'condensed'); ctx.fillStyle = '#141216'; t.lines.forEach((l, i) => ctx.fillText(l.toUpperCase(), M + 30, by + 30 + t.px * (i + 0.85)));
        font(ctx, 600, 34, 'normal'); ctx.fillStyle = '#48444C'; sub.forEach((l, i) => ctx.fillText(l, M + 30, by + 50 + t.px * t.lines.length + 44 * (i + 0.8)));
        kicker(PT + M + 50, '#141216', bg);
        footer(ctx, a, '#FFFFFF', logo);
        return;
      }
      kicker(PT + M + 50, foto ? '#141216' : bg, foto ? bg : ink);
      const sub = a.texto ? (font(ctx, 600, 40, 'normal'), wrap(ctx, a.texto, W - M * 2).slice(0, 4)) : [];
      const subH = sub.length ? sub.length * 52 + 30 : 0, bottom = HH - PB - M - 90 - subH;
      const t = fit(ctx, (a.titulo || 'Título do post').toUpperCase(), W - M * 2, bottom - PT - M - 120, 190, 70, 900, 'condensed', 0.92);
      font(ctx, 900, t.px, 'condensed');
      const top = bottom - t.lines.length * t.px * 0.92;
      t.lines.forEach((l, i) => { const y = top + t.px * 0.92 * (i + 1) - t.px * 0.12; if(!foto){ ctx.fillStyle = acc; ctx.fillText(l, M + 7, y + 7); } ctx.fillStyle = tc; ctx.fillText(l, M, y); });
      font(ctx, 600, 40, 'normal'); ctx.fillStyle = tc; ctx.globalAlpha = .92; sub.forEach((l, i) => ctx.fillText(l, M, bottom + 30 + 52 * (i + 0.8))); ctx.globalAlpha = 1;
      footer(ctx, a, tc, logo);
      return;
    }
    if(m === 'frase'){
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, HH); dots(ctx, ink, .07);
      const t = fit(ctx, a.titulo || 'Uma frase que a marca diria.', W - M * 2, HH - 700, 116, 48, 800, 'normal', 1.12);
      const blockH = 300 + t.lines.length * t.px * 1.12 + (a.texto ? 90 : 0), y0 = Math.max(PT + M + 40, (HH - 120 - blockH) / 2);
      font(ctx, 900, 480, 'condensed'); ctx.fillStyle = acc; ctx.fillText('“', M - 20, y0 + 330);
      font(ctx, 800, t.px, 'normal'); ctx.fillStyle = ink; t.lines.forEach((l, i) => ctx.fillText(l, M, y0 + 330 + t.px * 1.12 * (i + 0.8)));
      if(a.texto){ font(ctx, 600, 36, 'normal'); ctx.fillStyle = ink; ctx.globalAlpha = .8; ctx.fillText('— ' + a.texto.split('\n')[0], M, y0 + 380 + t.px * 1.12 * t.lines.length + 30); ctx.globalAlpha = 1; }
      footer(ctx, a, ink, logo); return;
    }
    if(m === 'oferta'){
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, HH);
      if(foto){ ctx.save(); ctx.globalAlpha = .28; cover(ctx, foto, 0, 0, W, HH); ctx.restore(); }
      dots(ctx, ink, .08); kicker(PT + M + 50, bg, ink);
      const n = fit(ctx, a.numero || 'R$ 29,90', W - M * 2, 360, 300, 110, 900, 'expanded', 1);
      font(ctx, 900, n.px, 'expanded'); n.lines.forEach((l, i) => { const y = PT + 470 + n.px * i; ctx.fillStyle = acc; ctx.fillText(l, M + 9, y + 9); ctx.fillStyle = ink; ctx.fillText(l, M, y); });
      const t = fit(ctx, (a.titulo || 'Combo da semana').toUpperCase(), W - M * 2, 300, 110, 50, 900, 'condensed', 0.95);
      font(ctx, 900, t.px, 'condensed'); ctx.fillStyle = ink; const ty = PT + 470 + n.px * (n.lines.length - 1) + 60; t.lines.forEach((l, i) => ctx.fillText(l, M, ty + t.px * 0.95 * (i + 1)));
      if(a.texto){ ctx.save(); ctx.translate(W / 2, HH - PB - 300); ctx.rotate(-0.05); font(ctx, 900, 52, 'condensed'); const s = a.texto.split('\n')[0].toUpperCase(), w = Math.min(W + 40, ctx.measureText(s).width + 140);
        ctx.fillStyle = '#141216'; ctx.fillRect(-w / 2 + 8, -48 + 8, w, 96); ctx.fillStyle = bg.toUpperCase() === '#FFE800' ? '#FF48B0' : '#FFE800'; ctx.fillRect(-w / 2, -48, w, 96); ctx.fillStyle = '#141216'; ctx.textAlign = 'center'; ctx.fillText(s, 0, 18); ctx.restore(); ctx.textAlign = 'left'; }
      footer(ctx, a, ink, logo); return;
    }
    if(m === 'lista'){
      ctx.fillStyle = '#F4F3EF'; ctx.fillRect(0, 0, W, HH);
      const t = fit(ctx, (a.titulo || 'Três coisas que…').toUpperCase(), W - M * 2, 260, 120, 54, 900, 'condensed', 0.95);
      const kOff = a.kicker ? 50 : 0, bandH = PT + M + 40 + kOff + t.lines.length * t.px * 0.95 + 50;
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, bandH); dots(ctx, inkOn(bg), .06);
      kicker(PT + M + 40, bg, inkOn(bg));
      font(ctx, 900, t.px, 'condensed'); ctx.fillStyle = inkOn(bg); t.lines.forEach((l, i) => ctx.fillText(l, M, PT + M + 40 + kOff + t.px * 0.95 * (i + 1)));
      ctx.fillStyle = '#141216'; ctx.fillRect(0, bandH, W, 8);
      const items = String(a.texto || 'Primeiro ponto\nSegundo ponto\nTerceiro ponto').split('\n').map(s => s.trim()).filter(Boolean).slice(0, 5);
      const avail = HH - PB - bandH - 200, each = avail / Math.max(3, items.length);
      items.forEach((it, i) => {
        const y = bandH + 70 + each * i;
        font(ctx, 900, 96, 'expanded'); ctx.fillStyle = bg === '#F4F3EF' ? '#FF48B0' : bg; ctx.fillText(String(i + 1), M, y + 70); ctx.lineWidth = 3; ctx.strokeStyle = '#141216'; ctx.strokeText(String(i + 1), M, y + 70);
        const f2 = fit(ctx, it, W - M * 2 - 120, each - 20, 50, 32, 800, 'normal', 1.15); font(ctx, 800, f2.px, 'normal'); ctx.fillStyle = '#141216'; f2.lines.slice(0, 3).forEach((l, j) => ctx.fillText(l, M + 120, y + 30 + f2.px * 1.15 * (j + 0.8)));
      });
      footer(ctx, a, '#141216', logo); return;
    }
  }

  /* ---------- legenda ---------- */
  const juntar = p => [p.gancho, p.corpo, p.cta, p.tags].map(s => String(s || '').trim()).filter(Boolean).join('\n\n');
  const nTags = s => (String(s || '').match(/#[\p{L}\p{N}_]+/gu) || []).length;
  const tagify = s => '#' + C.norm(s).replace(/[^a-z0-9]+/g, '');

  /* ---------- painel ---------- */
  async function load(){
    const [ps, vs] = await Promise.all([
      C.api.q('corre_posts', { eq: { dono: C.uid(), marca_id: E.marca.id }, order: ['data', true], limit: 500 }),
      C.visitas ? C.api.q('corre_visitas', { eq: { dono: C.uid(), marca_id: E.marca.id }, order: ['data', true], limit: 500 }).catch(() => []) : []
    ]);
    E.posts = ps; E.visitas = vs; if(C.visitas) C.visitas.conhece(vs);
  }
  /* ---------- a sala do estúdio: o post em destaque com a legenda, o relógio até a hora de postar,
     a semana, o mês e a grade do perfil (como o feed vai ficar) ---------- */
  const DAY = 864e5, pad = n => String(n).padStart(2, '0');
  const DOW = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'], DOW3 = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const SV = d => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const I_UP = SV('<path d="M12 15V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5"/>');
  const I_OK = SV('<path d="m5 12.5 4.5 4.5L19 7"/>'), I_DN = SV('<path d="M12 5v14m0 0-6-6m6 6 6-6"/>');
  /* Brasília é UTC−3 o ano todo */
  const at = p => { const [y, m, d] = p.data.split('-').map(Number), [h, mi] = (p.hora || '12:00').split(':').map(Number); return Date.UTC(y, m - 1, d, h + 3, mi); };
  const isoUTC = ms => { const d = new Date(ms); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
  const hoje = () => isoUTC(Date.now() - 3 * 36e5);
  const parts = iso => { const [y, m, d] = iso.split('-').map(Number); return { y, m, d, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay(), ms: Date.UTC(y, m - 1, d) }; };
  const short = iso => { const i = parts(iso); return `${DOW3[i.dow]} ${pad(i.d)}/${pad(i.m)}`; };
  const longo = p => { const i = parts(p.data), w = DOW[i.dow]; return `${w[0].toUpperCase() + w.slice(1)}, ${pad(i.d)}/${pad(i.m)}${p.hora ? ' · ' + p.hora : ''}`; };
  const weekOf = iso => { const i = parts(iso); return i.ms - ((i.dow + 6) % 7) * DAY; };
  const LABEL = { done: 'Postado', today: 'Hoje', now: 'Hora de postar', queue: 'Na fila', late: 'Pendente', ideia: 'Rascunho' };
  const CLS = { done: 'done', today: 'today', now: 'today', queue: '', late: 'late', ideia: 'ideia' };
  function estado(p){
    if(p.status === 'postado') return 'done';
    if(!p.data || p.status === 'ideia') return 'ideia';
    const t = at(p), now = Date.now();
    if(p.data === hoje()) return now < t ? 'today' : 'now';
    return now < t ? 'queue' : 'late';
  }
  const pill = s => `<span class="pill ${CLS[s]}"><i></i>${LABEL[s]}</span>`;
  const ordenados = () => E.posts.slice().sort((a, b) => String(a.data || '9999').localeCompare(String(b.data || '9999')) || String(a.hora || '').localeCompare(String(b.hora || '')) || String(a.created_at || '').localeCompare(String(b.created_at || '')));
  const capHTML = t => esc(t).replace(/(^|\s)(#[\p{L}\p{N}_]+)/gu, '$1<span class="h">$2</span>');
  const nomeCurto = m => { const w = String(m.marca || '').trim().split(/\s+/); return w[0].length >= 3 ? w[0] : w.slice(0, 2).join(' '); };
  const arq = (p, n) => `${C.norm(E.marca.marca).replace(/[^a-z0-9]+/g, '-')}-${pad(n)}${p.data ? '-' + p.data.slice(8, 10) + '-' + p.data.slice(5, 7) : ''}.jpg`;
  const S = { sel: null, tab: 'semana', week: null, mes: null, timer: 0, sig: '', onSave: null };
  const $r = id => document.getElementById(id);
  const vivo = () => !!$r('es-list');

  function pickDefault(L){
    const t = hoje(), now = Date.now();
    return L.find(p => p.data === t && p.status !== 'postado') || L.find(p => p.data && at(p) > now && p.status !== 'postado') || L.filter(p => p.data).slice(-1)[0] || L[0] || null;
  }
  function proximo(L){ const now = Date.now(); return L.find(p => p.data && p.status !== 'postado' && p.status !== 'ideia' && at(p) > now); }
  /* visitas da marca no mesmo calendário dos posts */
  const VV = () => C.visitas;
  const visDo = iso => E.visitas.filter(v => v.data === iso).sort((a, b) => String(a.hora).localeCompare(String(b.hora)));
  const visProx = () => VV() ? E.visitas.filter(v => v.status === 'marcada' && !VV().passou(v)).sort((a, b) => VV().at(a) - VV().at(b)) : [];
  function visSec(){
    if(!VV()) return '';
    const P = visProx(), feitas = E.visitas.filter(v => v.status === 'feita').length;
    return `<section class="er-sec er-vsec" aria-labelledby="er-vis-h">
      <div class="er-sec-h"><h3 id="er-vis-h">Visitas</h3><div class="er-tools">${feitas ? `<span class="mono">${feitas === 1 ? '1 feita' : feitas + ' feitas'}</span>` : ''}<button type="button" class="btn pri" data-act="vs-nova">${ico('pin')} Marcar visita</button></div></div>
      ${P.length ? `<ul class="vs-list">${P.slice(0, 6).map(v => VV().itemHTML(v, { marca: E.marca })).join('')}</ul>${P.length > 6 ? `<p class="note">Mais ${P.length - 6} no calendário aqui embaixo.</p>` : ''}`
        : `<p class="note">Nenhuma visita marcada com a ${esc(E.marca.marca)}. Marca aqui: ela entra no calendário dos posts, nos Avisos e no teu início, com a confirmação pronta pro WhatsApp do cliente.</p>`}
    </section>`;
  }
  const vChip = v => `<button type="button" class="er-vchip ${esc(v.status)}" data-act="vs-abrir" data-id="${esc(v.id)}" aria-label="Visita às ${esc(v.hora)}: ${esc(v.pauta || 'visita')}${v.status !== 'marcada' ? ' (' + v.status + ')' : ''}">${ico('pin')}<b class="num">${VV().hh(v.hora)}</b><span>${esc(v.pauta || 'Visita')}</span></button>`;

  function sala(){
    const el = C.$('es-list'); if(!el) return;
    const L = ordenados(), mk = E.marca;
    if(!L.length){
      el.innerHTML = `<div class="es-vazio"><p>Nenhum post da <b>${esc(mk.marca)}</b> ainda.</p><p class="note">Cria o primeiro: a IA desenha a imagem com as referências da marca e já deixa a legenda pronta.</p><div class="acts"><button type="button" class="btn pri" data-act="es-novo">${ico('plus')} Primeiro post</button>${VV() && !E.visitas.length ? `<button type="button" class="btn" data-act="vs-nova">${ico('pin')} Marcar visita</button>` : ''}</div></div>${E.visitas.length ? visSec() : ''}`;
      clearInterval(S.timer); return;
    }
    if(!S.sel || !L.find(p => p.id === S.sel)) S.sel = (pickDefault(L) || L[0]).id;
    const sel = L.find(p => p.id === S.sel);
    if(S.week == null) S.week = weekOf(sel.data || hoje());
    if(!S.mes) S.mes = (sel.data || hoje()).slice(0, 7);
    el.innerHTML = `
      <header class="er-top">
        <div class="er-mark"><h2>Posts <span>${esc(nomeCurto(mk))}</span></h2><p class="mono" id="er-kick"></p></div>
        <div class="er-clock" id="er-clock" aria-live="off"></div>
      </header>
      <section class="er-stage" aria-label="Post em destaque">
        <div class="er-post"><figure class="er-shot" id="er-shot"></figure>
          <div class="er-ctrl" role="group" aria-label="Navegar pelos posts"><button type="button" class="rnd" data-act="er-nav" data-d="-1" aria-label="Post anterior">${ico('prev')}</button><span class="pos num" id="er-pos"></span><button type="button" class="rnd" data-act="er-nav" data-d="1" aria-label="Próximo post">${ico('next')}</button><span class="mono fmt">Feed 4:5 · 1080×1350</span></div>
        </div>
        <div class="er-cap" id="er-cap"></div>
      </section>
      ${visSec()}
      <section class="er-sec" id="er-todos" aria-labelledby="er-todos-h">
        <div class="er-sec-h"><h3 id="er-todos-h">Ver todos</h3>
          <div class="er-tools"><div class="er-seg" role="tablist" aria-label="Período"><button type="button" role="tab" data-act="er-tab" data-t="semana" aria-selected="${S.tab === 'semana'}">Semana</button><button type="button" role="tab" data-act="er-tab" data-t="mes" aria-selected="${S.tab === 'mes'}">Mês</button></div>
            <button type="button" class="btn" data-act="er-zip">${ico('down')} <span id="er-zip-l">${S.tab === 'semana' ? 'Baixar a semana' : 'Baixar o mês'}</span></button>
            <button type="button" class="btn pri" data-act="es-novo">${ico('plus')} Post</button>${VV() ? `<button type="button" class="btn" data-act="vs-nova">${ico('pin')} Visita</button>` : ''}${C.aprova ? `<button type="button" class="btn" data-act="ap-link" data-marca="${mk.id}">${ico('check')} Aprovação</button>` : ''}</div>
        </div>
        <div id="er-pane"></div>
      </section>`;
    renderStage(); renderPane(); relogio();
    clearInterval(S.timer); S.timer = setInterval(() => { if(!vivo()){ clearInterval(S.timer); return; } relogio(); const sig = hoje() + '|' + ordenados().map(estado).join(','); if(sig !== S.sig){ S.sig = sig; renderStage(); renderPane(); } }, 1000);
    S.sig = hoje() + '|' + L.map(estado).join(',');
  }

  function relogio(){
    const el = $r('er-clock'); if(!el) return;
    const L = ordenados(), nx = proximo(L), mk = E.marca;
    const meses = [...new Set(L.filter(p => p.data).map(p => MESES[+p.data.slice(5, 7) - 1]))];
    const vp = visProx()[0];
    $r('er-kick').textContent = [mk.rede ? `Instagram @${mk.rede}` : 'Instagram', meses.length ? `pauta de ${meses.slice(-2).join(' e ')}` : 'pauta aberta', `${L.length} ${L.length === 1 ? 'post' : 'posts'}`, vp ? `visita ${VV().quando(vp)}` : ''].filter(Boolean).join(' · ');
    if(!nx){ el.innerHTML = `<span class="mono">Nada na fila</span><b class="num">${L.filter(p => p.status === 'postado').length}/${L.length}</b><span class="mono">postados</span>`; return; }
    const n = L.indexOf(nx) + 1, ms = Math.max(0, at(nx) - Date.now());
    const d = Math.floor(ms / DAY), h = Math.floor(ms % DAY / 36e5), m = Math.floor(ms % 36e5 / 6e4), s = Math.floor(ms % 6e4 / 1e3);
    const head = nx.data === hoje() ? `Hoje · post ${pad(n)} · ${nx.hora || ''}` : `Próximo · post ${pad(n)} · ${short(nx.data)}${nx.hora ? ' · ' + nx.hora : ''}`;
    el.innerHTML = `<span class="mono">${esc(head)}</span><b class="num">${d ? d + 'd ' : ''}${pad(h)}:${pad(m)}:${pad(s)}</b><span class="mono">até a hora de postar</span>`;
  }

  function stageLabel(p, L){
    const t = hoje(); if(!p.data) return 'Sem data';
    if(p.data === t) return 'Post de hoje';
    if(at(p) > Date.now()) return (!L.some(x => x.data === t) && p === proximo(L)) ? 'Hoje não tem post · próximo' : 'Na fila';
    return 'Já passou';
  }
  function renderStage(){
    const L = ordenados(), p = L.find(x => x.id === S.sel); if(!p || !$r('er-shot')) return;
    const n = L.indexOf(p) + 1, s = estado(p), leg = p.legenda || '';
    const shot = $r('er-shot');
    const sigShot = p.id + (p.midia_url || '') + JSON.stringify(p.midias || []);
    if(shot.dataset.id !== sigShot){
      shot.dataset.id = sigShot;
      shot.className = 'er-shot f-' + fmtDe(p);
      shot.innerHTML = midiaHTML(p, 'er') || `<span class="er-noart">${ico('img')}<b>Sem arte ainda</b></span>`;
    }
    const fe = document.querySelector('.er-ctrl .fmt'); if(fe) fe.textContent = { feed: 'Feed 4:5 · 1080×1350', carrossel: `Carrossel · ${midiasDe(p).length} slides`, story: 'Story 9:16 · 1080×1920', reels: 'Reels · vídeo' }[fmtDe(p)];
    $r('er-pos').textContent = `${pad(n)} / ${pad(L.length)}`;
    $r('er-cap').innerHTML = `<span class="mono">${esc(stageLabel(p, L))} · post ${pad(n)} de ${pad(L.length)}${p.tema ? ' · ' + esc(p.tema) : ''}</span>
      <h3 class="er-title">${esc(p.titulo || 'Sem título')}</h3>
      <div class="er-when">${p.data ? `<b class="num">${esc(longo(p))}</b>` : '<b>Sem data</b>'}${pill(s)}${fmtTag(p)}${aprovTag(p)}</div>
      ${p.aprov === 'ajuste' && p.aprov_nota ? `<p class="apr-nota"><b>${esc(p.aprov_quem || 'O cliente')} pediu:</b> ${esc(p.aprov_nota)}</p>` : p.aprov === '' && p.aprov_nota ? `<p class="apr-nota velha"><b>Ajuste pedido antes:</b> ${esc(p.aprov_nota)}</p>` : ''}
      <div class="er-box">${leg ? `<p class="er-legenda">${capHTML(leg)}</p>` : `<p class="note">Sem legenda ainda. No editor, a IA escreve uma olhando a arte.</p>`}</div>
      <div class="acts er-acts">
        <button type="button" class="btn pri" data-act="er-postar">${I_UP} Postar</button>
        <button type="button" class="btn" data-act="er-copy"${leg ? '' : ' disabled'}>${ico('copy')} Copiar legenda</button>
        <button type="button" class="btn" data-act="er-dl"${p.midia_url ? '' : ' disabled'}>${ico('down')} ${fmtDe(p) === 'feed' ? 'Baixar imagem' : 'Baixar'}</button>
        <button type="button" class="btn${s === 'done' ? ' on' : ''}" data-act="er-mark" aria-pressed="${s === 'done'}">${I_OK} ${s === 'done' ? 'Postado' : 'Marcar como postado'}</button>
        <button type="button" class="btn" data-act="es-abrir" data-id="${p.id}">${ico('edit')} Editar</button>
        ${p.midia_url && C.feed ? `<button type="button" class="btn" data-act="er-feed">${ico('send')} Publicar no Corre</button>` : ''}
        <button type="button" class="btn" data-act="er-todos">Ver todos ${I_DN}</button>
      </div>
      ${p.alt ? `<details class="er-alt"><summary class="mono">Texto alternativo</summary><p>${esc(p.alt)}</p><button type="button" class="btn sm" data-act="er-copy-alt">${ico('copy')} Copiar texto alternativo</button></details>` : ''}`;
    document.querySelectorAll('#es-list [data-post]').forEach(b => b.setAttribute('aria-current', String(b.dataset.post === p.id)));
  }

  function renderPane(){
    const box = $r('er-pane'); if(!box) return;
    if(S.tab === 'semana') box.innerHTML = semana(); else box.innerHTML = mes();
    const z = $r('er-zip-l'); if(z) z.textContent = S.tab === 'semana' ? 'Baixar a semana' : 'Baixar o mês';
    document.querySelectorAll('#es-list [data-post]').forEach(b => b.setAttribute('aria-current', String(b.dataset.post === S.sel)));
    if(S.tab === 'semana'){ const r = box.querySelector('.er-route'), t = box.querySelector('[aria-current="true"]') || box.querySelector('.er-stop.today'); if(r && t && r.scrollWidth > r.clientWidth) r.scrollLeft = Math.max(0, t.closest('.er-stop').offsetLeft - 2); }
  }
  function semana(){
    const L = ordenados(), ws = S.week, t = hoje(), cells = []; let count = 0, nv = 0;
    for(let k = 0; k < 7; k++){
      const iso = isoUTC(ws + k * DAY), i = parts(iso), ps = L.filter(x => x.data === iso), isT = iso === t, vs = VV() ? visDo(iso) : [];
      count += ps.length; nv += vs.filter(v => v.status !== 'cancelada').length;
      cells.push(`<div class="er-stop${ps.length ? ' has' : ''}${vs.length ? ' vis' : ''}${isT ? ' today' : ''}"><span class="d"><i></i><b>${isT ? 'hoje' : DOW3[i.dow]} ${pad(i.d)}</b></span>
        ${ps.length ? ps.map(p => `<button type="button" class="er-tile" data-act="er-sel" data-post="${p.id}" aria-label="${esc(short(iso))}${p.hora ? ' às ' + p.hora : ''}: ${esc(p.titulo || 'post')}">${p.midia_url ? `<img src="${esc(p.midia_url)}" alt="" loading="lazy" decoding="async">` : `<span class="er-noart sm">${ico('img')}</span>`}${p.hora ? `<span class="t num">${p.hora}</span>` : ''}</button>${pill(estado(p))}<span class="ttl">${esc(p.titulo || 'Sem título')}</span>`).join('')
          : (iso >= t ? `<button type="button" class="er-empty add" data-act="es-novo" data-dia="${iso}" aria-label="Novo post em ${esc(short(iso))}">${ico('plus')}<span>post</span></button>` : (vs.length ? '' : '<span class="er-empty">sem post</span>'))}
        ${vs.map(vChip).join('')}${VV() && iso >= t ? `<button type="button" class="er-addvis" data-act="vs-nova" data-dia="${iso}" aria-label="Marcar visita em ${esc(short(iso))}">${ico('pin')} visita</button>` : ''}
      </div>`);
    }
    const a = parts(isoUTC(ws)), b = parts(isoUTC(ws + 6 * DAY));
    return `<div class="er-pane-h"><h4>Semana de ${pad(a.d)}/${pad(a.m)} a ${pad(b.d)}/${pad(b.m)}</h4><div class="er-nav"><span class="mono">${count === 1 ? '1 post' : count + ' posts'}${nv ? ` · ${nv === 1 ? '1 visita' : nv + ' visitas'}` : ''}</span><button type="button" data-act="er-wk" data-d="-1" aria-label="Semana anterior">${ico('prev')}</button><button type="button" data-act="er-wk" data-d="1" aria-label="Próxima semana">${ico('next')}</button></div></div>
      <div class="er-route"><div class="er-stops">${cells.join('')}</div></div>`;
  }
  function mes(){
    const L = ordenados(), [y, m] = S.mes.split('-').map(Number), t = hoje();
    const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(), off = (first + 6) % 7, days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const cells = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'].map(d => `<span class="wd" aria-hidden="true">${d}</span>`);
    for(let k = 0; k < off; k++) cells.push('<span class="er-day blank" aria-hidden="true"></span>');
    for(let d = 1; d <= days; d++){
      const iso = `${y}-${pad(m)}-${pad(d)}`, ps = L.filter(x => x.data === iso), p = ps[0], isT = iso === t, past = iso < t;
      const vs = VV() ? visDo(iso).filter(v => v.status !== 'cancelada') : [], v0 = vs[0];
      const vm = v0 ? `<span class="vis num">${ico('pin')}${VV().hh(v0.hora)}${vs.length > 1 ? '+' : ''}</span>` : '', va = v0 ? `, visita às ${v0.hora}${v0.pauta ? ' (' + esc(v0.pauta) + ')' : ''}` : '';
      if(p){ const s = estado(p);
        cells.push(`<button type="button" class="er-day has${v0 ? ' visd' : ''}${isT ? ' today' : ''}" data-act="er-sel" data-post="${p.id}" aria-label="${d} de ${MESES[m - 1]}${p.hora ? ', ' + p.hora : ''}, ${LABEL[s]}: ${esc(p.titulo || 'post')}${va}">${p.midia_url ? `<img src="${esc(p.midia_url)}" alt="" loading="lazy" decoding="async">` : ''}<span class="n num">${d}</span><span class="st ${CLS[s]}"></span>${p.hora ? `<span class="t num">${p.hora}</span>` : ''}${ps.length > 1 ? `<span class="mais num">+${ps.length - 1}</span>` : ''}${vm}</button>`);
      } else if(v0) cells.push(`<button type="button" class="er-day visd${past ? ' past' : ''}${isT ? ' today' : ''}" data-act="vs-abrir" data-id="${esc(v0.id)}" aria-label="${d} de ${MESES[m - 1]}${va}"><span class="n num">${d}</span>${vm}</button>`);
      else cells.push(past ? `<span class="er-day past${isT ? ' today' : ''}"><span class="n num">${d}</span></span>` : `<button type="button" class="er-day vazio${isT ? ' today' : ''}" data-act="es-novo" data-dia="${iso}" aria-label="Novo post em ${d} de ${MESES[m - 1]}"><span class="n num">${d}</span><span class="plus">${ico('plus')}</span></button>`);
    }
    while((cells.length - 7) % 7) cells.push('<span class="er-day blank" aria-hidden="true"></span>');
    const doMes = L.filter(p => p.data && p.data.startsWith(S.mes)), c = { done: 0, late: 0, queue: 0, ideia: 0 };
    doMes.forEach(p => { const s = estado(p); if(s === 'done') c.done++; else if(s === 'late') c.late++; else if(s === 'ideia') c.ideia++; else c.queue++; });
    const fim = `${S.mes}-${pad(days)}`, grade = L.filter(p => p.data && p.data <= fim && p.status !== 'ideia' && fmtDe(p) !== 'story').reverse().slice(0, 12), ult = grade[0];
    return `<div class="er-month"><div class="er-pane">
        <div class="er-pane-h"><h4>${MESES[m - 1][0].toUpperCase() + MESES[m - 1].slice(1)} ${y}</h4><div class="er-nav"><span class="mono">${[c.done === 1 ? '1 postado' : c.done + ' postados', c.late ? (c.late === 1 ? '1 pendente' : c.late + ' pendentes') : '', c.queue + ' na fila', c.ideia ? (c.ideia === 1 ? '1 rascunho' : c.ideia + ' rascunhos') : ''].filter(Boolean).join(' · ')}</span><button type="button" data-act="er-mes" data-d="-1" aria-label="Mês anterior">${ico('prev')}</button><button type="button" data-act="er-mes" data-d="1" aria-label="Próximo mês">${ico('next')}</button></div></div>
        <div class="er-cal">${cells.join('')}</div>
        <div class="er-legend" aria-label="Legenda">${pill('today').replace('Hoje', 'Hoje')}${pill('queue')}${pill('done')}${pill('late')}${pill('ideia')}${VV() ? `<span class="pill visp">${ico('pin')}Visita</span>` : ''}</div>
      </div>
      <div class="er-gridbox"><div class="er-pane-h"><h4>Grade do perfil</h4></div>
        ${grade.length ? `<div class="er-grid3">${grade.map(p => `<button type="button" data-act="er-sel" data-post="${p.id}" aria-label="${esc(p.titulo || 'post')}">${p.midia_url ? `<img src="${esc(p.midia_url)}" alt="" loading="lazy" decoding="async">` : ''}</button>`).join('')}</div>
        <p class="note">Como o perfil fica em <b>${esc(short(ult.data))}</b>, depois do post ${pad(L.indexOf(ult) + 1)}: o mais novo no canto de cima. A grade do Instagram corta cada post em 3:4, então as bordas laterais somem só na miniatura.</p>` : '<p class="note">Os posts com data aparecem aqui na ordem em que vão entrar no feed.</p>'}
      </div></div>`;
  }

  /* baixar: uma imagem ou o pacote do período (zip sem compressão, feito aqui mesmo) */
  const CRC = (() => { const t = new Uint32Array(256); for(let n = 0; n < 256; n++){ let c = n; for(let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = u8 => { let c = 0xFFFFFFFF; for(let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function zipStore(files){
    const enc = new TextEncoder(), chunks = [], central = []; let off = 0;
    const now = new Date(), dt = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate(), tm = (now.getHours() << 11) | (now.getMinutes() << 5);
    files.forEach(f => {
      const name = enc.encode(f.name), crc = crc32(f.data), size = f.data.length;
      const h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(8, 0, true); h.setUint16(10, tm, true); h.setUint16(12, dt, true); h.setUint32(14, crc, true); h.setUint32(18, size, true); h.setUint32(22, size, true); h.setUint16(26, name.length, true);
      chunks.push(new Uint8Array(h.buffer), name, f.data);
      const c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(12, tm, true); c.setUint16(14, dt, true); c.setUint32(16, crc, true); c.setUint32(20, size, true); c.setUint32(24, size, true); c.setUint16(28, name.length, true); c.setUint32(42, off, true);
      central.push(new Uint8Array(c.buffer), name); off += 30 + name.length + size;
    });
    const cs = central.reduce((a, b) => a + b.length, 0), e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cs, true); e.setUint32(16, off, true);
    return new Blob([...chunks, ...central, new Uint8Array(e.buffer)], { type: 'application/zip' });
  }
  const bytes = async u => { const r = await fetch(u); if(!r.ok) throw { code: 'fetch' }; return new Uint8Array(await r.arrayBuffer()); };
  function salvarBlob(blob, nome){ const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); }
  async function baixarUm(p){
    if(!p || !p.midia_url){ C.toast('Esse post ainda não tem arte.'); return false; }
    try{ const L = ordenados(); salvarBlob(new Blob([await bytes(p.midia_url)], { type: 'image/jpeg' }), arq(p, L.indexOf(p) + 1)); return true; }
    catch(e){ window.open(p.midia_url, '_blank', 'noopener'); C.toast('Abri a arte numa aba nova: segura nela e salva.', 4200); return false; }
  }
  async function baixarPeriodo(){
    const L = ordenados(); let ps;
    if(S.tab === 'semana'){ const a = isoUTC(S.week), b = isoUTC(S.week + 6 * DAY); ps = L.filter(p => p.data && p.data >= a && p.data <= b && p.midia_url); }
    else ps = L.filter(p => p.data && p.data.startsWith(S.mes) && p.midia_url);
    if(!ps.length){ C.toast('Nenhuma arte pronta nesse período.'); return; }
    C.toast(`Juntando ${ps.length} ${ps.length === 1 ? 'arte' : 'artes'}…`, 6000);
    try{
      const files = []; for(const p of ps) files.push({ name: arq(p, L.indexOf(p) + 1), data: await bytes(p.midia_url) });
      const leg = ps.map(p => `POST ${pad(L.indexOf(p) + 1)} · ${p.data ? longo(p) : 'sem data'}\n${p.titulo || ''}\n\n${p.legenda || ''}${p.alt ? '\n\nTexto alternativo: ' + p.alt : ''}`).join('\n\n----------------\n\n');
      files.push({ name: 'legendas.txt', data: new TextEncoder().encode(leg) });
      salvarBlob(zipStore(files), `${C.norm(E.marca.marca).replace(/[^a-z0-9]+/g, '-')}-${S.tab === 'semana' ? 'semana-' + isoUTC(S.week).slice(5).replace('-', '') : S.mes}.zip`);
      C.toast('Pacote baixado: artes e legendas.');
    }catch(e){ C.toast('Não deu pra juntar as artes agora. Tenta de novo.'); }
  }
  /* ---------- v4.17 · os formatos fora do editor: as mídias, os endereços e o postar à mão ---------- */
  const fmtDe = p => (p && p.formato) || 'feed';
  const NOME_F = { feed: 'Feed', carrossel: 'Carrossel', story: 'Story', reels: 'Reels' };
  /* o que vai pro Instagram, na ordem (o feed é a arte) */
  const midiasDe = p => { const M = (Array.isArray(p.midias) ? p.midias : []).filter(m => m && m.u); return fmtDe(p) === 'feed' || !M.length ? (p.midia_url ? [{ u: p.midia_url, t: 'img' }] : []) : M; };
  /* tudo o que o post guardou no armazenamento (pra soltar o que não serve mais depois de salvar) */
  function urlsDo(p){
    if(!p) return [];
    const a = p.arte || {}, L = [p.midia_url, a.foto].concat((p.midias || []).map(m => m && m.u));
    (a.slides || []).forEach(x => { L.push(x.u, x.capa, x.art && x.art.foto); });
    if(a.vid) L.push(a.vid.u, a.vid.capa);
    return [...new Set(L.filter(u => typeof u === 'string' && /^https:/.test(u)))];
  }
  /* o selo do formato e o da aprovação do cliente (o Studio e a sala da marca usam) */
  const fmtTag = p => { const f = fmtDe(p); if(f === 'feed') return ''; const n = f === 'carrossel' ? midiasDe(p).length : 0; return `<i class="fmt-tag f-${f}" title="${NOME_F[f]}">${ico(f === 'carrossel' ? 'img' : f === 'reels' ? 'film' : 'play')}${f === 'carrossel' && n ? `<b class="num">${n}</b>` : `<b>${NOME_F[f]}</b>`}</i>`; };
  const aprovTag = p => p.aprov === 'aprovado' ? `<i class="apr-tag ok" title="Aprovado pelo cliente">${ico('check')}<b>aprovado</b></i>` : p.aprov === 'ajuste' ? `<i class="apr-tag aj" title="O cliente pediu ajuste">${ico('edit')}<b>ajuste</b></i>` : '';
  /* a mídia do post pra ver: o carrossel desliza, o vídeo toca com a capa */
  const midiaHTML = (p, k) => {
    const f = fmtDe(p), M = midiasDe(p);
    if(!M.length) return '';
    if(f === 'carrossel') return `<div class="${k}-car" tabindex="0" aria-label="Carrossel com ${M.length} slides: desliza pro lado">${M.map((m, i) => m.t === 'video' ? `<video src="${esc(m.u)}" controls playsinline preload="metadata" aria-label="Slide ${i + 1}, vídeo"></video>` : `<img src="${esc(m.u)}" alt="Slide ${i + 1}${i === 0 && p.alt ? ': ' + esc(p.alt) : ''}" loading="lazy" decoding="async">`).join('')}</div><span class="${k}-car-n mono">${M.length} slides</span>`;
    if(M[0].t === 'video') return `<video src="${esc(M[0].u)}"${p.midia_url ? ` poster="${esc(p.midia_url)}"` : ''} controls playsinline preload="metadata" aria-label="${esc(p.titulo || 'Vídeo do post')}"></video>`;
    return `<img src="${esc(M[0].u)}" alt="${esc(p.alt || p.titulo || '')}" decoding="async">`;
  };
  const salvaArquivos = (files, nome) => { if(files.length === 1) salvarBlob(files[0], files[0].name); else salvarBlob(zipStore(files.map(f => ({ name: f.name, data: f.u8 }))), nome + '.zip'); };
  /* postar à mão: os arquivos descem (no celular, pelo compartilhar; no computador, baixam) e a legenda vai copiada */
  function entregar(p, o){
    o = o || {};
    const f = fmtDe(p), M = midiasDe(p), base = `${C.norm(o.marca || (E.marca && E.marca.marca) || 'post').replace(/[^a-z0-9]+/g, '-')}-${p.data || 'post'}`;
    const leg = f === 'story' ? '' : (p.legenda || '');
    const passos = { feed: ['No Instagram: + › Post, escolhe a arte.', leg ? 'Na legenda, cola.' : ''], carrossel: [`No Instagram: + › Post › o ícone de várias fotos, e escolhe as ${M.length} nessa ordem.`, leg ? 'Na legenda, cola.' : ''],
      story: ['No Instagram: + › Story, escolhe da galeria.', 'Link ou enquete: pelas figurinhas.'], reels: ['No Instagram: + › Reel, escolhe o vídeo.', 'Na capa, escolhe o quadro.', leg ? 'Na legenda, cola.' : ''] }[f].filter(Boolean);
    C.sheet(`<div class="form es-ent"><div class="sheet-head"><h2>${ico('ig')} Postar ${f === 'feed' ? 'no feed' : f === 'carrossel' ? 'o carrossel' : f === 'story' ? 'o story' : 'o reels'}</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <ol class="es-ent-th${f === 'carrossel' ? '' : ' um'}">${M.map((m, i) => `<li>${m.t === 'video' ? `<video src="${esc(m.u)}" muted playsinline preload="metadata"${p.midia_url && M.length === 1 ? ` poster="${esc(p.midia_url)}"` : ''}></video><i class="v">${ico('play')}</i>` : `<img src="${esc(m.u)}" alt="">`}${M.length > 1 ? `<i class="n num">${i + 1}</i>` : ''}</li>`).join('')}</ol>
      <p class="fine" id="es-ent-st" aria-live="polite">${M.length ? `Preparando ${M.length === 1 ? 'o arquivo' : `os ${M.length} arquivos`}…` : 'Esse post ainda não tem o que postar.'}</p>
      <div class="acts"><button type="button" class="btn pri" id="es-ent-ir" disabled>${ico('share')} Mandar pro celular</button><button type="button" class="btn" id="es-ent-bx" disabled>${ico('down')} ${M.length > 1 ? 'Baixar tudo' : 'Baixar'}</button>${leg ? `<button type="button" class="btn" id="es-ent-cp">${ico('copy')} Copiar legenda</button>` : ''}</div>
      <ol class="sd-pp-guia es-ent-g">${(leg ? ['A legenda vai copiada junto.'] : []).concat(passos).map(t => `<li>${esc(t)}</li>`).join('')}</ol>
      <div class="acts"><button type="button" class="btn" id="es-ent-ok">${ico('check')} Já postei</button></div></div>`);
    const st = C.$('es-ent-st'); let files = [];
    const copia = () => { if(leg){ try{ navigator.clipboard.writeText(leg).catch(() => {}); }catch(e){} } };
    /* os arquivos descem logo que a folha abre: o compartilhar do celular só funciona ainda no toque */
    (async () => {
      try{
        for(let i = 0; i < M.length; i++){
          const m = M[i], u8 = await bytes(m.u), ext = m.t === 'video' ? (/\.mov(\?|$)/i.test(m.u) ? 'mov' : 'mp4') : 'jpg';
          const fl = new File([u8], `${base}${M.length > 1 ? '-' + pad(i + 1) : ''}.${ext}`, { type: m.t === 'video' ? (ext === 'mov' ? 'video/quicktime' : 'video/mp4') : 'image/jpeg' }); fl.u8 = u8; files.push(fl);
        }
        if(!C.$('es-ent-st')) return;
        let pode = false; try{ pode = matchMedia('(pointer:coarse)').matches && !!navigator.canShare && navigator.canShare({ files }); }catch(e){}
        C.$('es-ent-ir').hidden = !pode; C.$('es-ent-ir').disabled = !pode; C.$('es-ent-bx').disabled = false;
        if(!pode) C.$('es-ent-bx').classList.add('pri');
        st.textContent = pode ? 'Pronto. No compartilhar, salva na galeria (ou escolhe o Instagram).' : `Pronto. ${M.length > 1 ? 'Baixa tudo (vem num .zip, já na ordem)' : 'Baixa o arquivo'} e posta pelo Instagram.`;
      }catch(e){ if(st.isConnected) st.textContent = 'Não deu pra preparar os arquivos agora. Abre cada um pelo Editar e baixa de lá.'; }
    })();
    C.$('es-ent-ir').addEventListener('click', async () => {
      copia();
      try{ await navigator.share({ files: files.map(x => new File([x.u8], x.name, { type: x.type })) }); st.textContent = leg ? 'Mandado. A legenda tá copiada: no Instagram, é só colar.' : 'Mandado. Agora é com o Instagram.'; }
      catch(e){ if(!(e && e.name === 'AbortError')) C.toast('O celular não deixou compartilhar. Toca em Baixar.'); }
    });
    C.$('es-ent-bx').addEventListener('click', () => { copia(); salvaArquivos(files, base); window.open('https://www.instagram.com/', '_blank', 'noopener'); C.toast(leg ? 'Baixado e a legenda copiada.' : 'Baixado.', 3600); });
    if(C.$('es-ent-cp')) C.$('es-ent-cp').addEventListener('click', () => C.copy(leg, 'Legenda copiada.'));
    C.$('es-ent-ok').addEventListener('click', async ev => {
      const b = ev.currentTarget; b.disabled = true;
      const patch = { status: 'postado' }; if(['agendado', 'erro'].includes(p.ig_status || '')) patch.ig_status = '';
      try{ await C.api.upd('corre_posts', { id: p.id }, patch); Object.assign(p, patch); C.closeSheet(); C.toast('Marcado como postado.'); if(o.depois) o.depois(p); }
      catch(e){ b.disabled = false; C.toast(C.errMsg(e, 'Não deu pra marcar agora.')); }
    });
  }
  async function marcar(p, status){
    /* marcou como postado (ou voltou pra ideia) um post que tava programado: tira da fila do Instagram, senão ele sai duas vezes */
    const patch = { status }; if(status !== 'pronto' && ['agendado', 'erro'].includes(p.ig_status || '')) patch.ig_status = '';
    try{ await C.api.upd('corre_posts', { id: p.id }, patch); Object.assign(p, patch); renderStage(); renderPane(); relogio(); }
    catch(e){ C.toast(C.errMsg(e, 'Não deu pra marcar agora.')); }
  }
  const atual = () => E.posts.find(p => p.id === S.sel);

  C.estudio = {
    async mount(el, marca){
      E.marca = marca; S.sel = null; S.week = null; S.mes = null; S.onSave = null;
      el.classList.add('es-room');
      el.innerHTML = `<div id="es-list"><p class="note">Abrindo o estúdio…</p></div>`;
      try{ await load(); }catch(e){ C.$('es-list').innerHTML = `<p class="note">${esc(C.errMsg(e, 'Não deu pra abrir os posts.'))}</p>`; return; }
      sala();
    },
    /* visita salva, apagada ou avisada: o calendário se refaz */
    async recarregar(){ if(!C.$('es-list') || !E.marca) return; try{ await load(); }catch(e){ return; } lista(); },
    marca: () => E.marca,
    /* o Studio (agenda de todas as marcas) abre o mesmo editor: o.auto = a marca publica direto; o.onSave avisa a agenda */
    abrir(marca, post, dia, o){ E.marca = marca; o = o || {}; S.onSave = o.onSave || null; editor(post || null, dia, o); }
  };
  const lista = () => { if(!C.$('es-list')) return; if(S.sel && !E.posts.find(p => p.id === S.sel)) S.sel = null; sala(); };

  function editor(p, dia, opts){
    const mk = E.marca, novo = !p, o = opts || {}, igFim = !!p && ['publicando', 'publicado'].includes(p.ig_status || '');
    const ARTE0 = () => ({ modelo: 'capa', cor: mk.cor || '#FFE800', kicker: '', titulo: '', texto: '', numero: '', foto: '', logo: !!mk.logo_url });
    let art = Object.assign(ARTE0(), (p && p.arte) || {});
    delete art.slides; delete art.vid; delete art.leg;
    /* v4.17 · os formatos: feed (uma arte 4:5), carrossel (até 10 slides: arte, foto ou vídeo), story (arte 9:16 ou
       vídeo) e reels (vídeo com a capa escolhida num quadro). Os slides e o vídeo ficam no "arte" do post pra reabrir */
    let fmt = p ? (p.formato || 'feed') : (FMTS.some(f => f[0] === o.formato) ? o.formato : 'feed'), si = 0;
    let slides = (p && p.arte && Array.isArray(p.arte.slides) ? p.arte.slides : []).map(x => x.t === 'video'
      ? { t: 'video', u: x.u || '', capa: x.capa || '', tempo: +x.tempo || 0, cs: x.cs || '' }
      : { t: 'img', u: x.u || '', sig: x.sig || '', art: Object.assign(ARTE0(), x.art || {}) });
    if(p && !slides.length && p.formato === 'carrossel') slides = (p.midias || []).map(m => m.t === 'video' ? { t: 'video', u: m.u, capa: '', tempo: 0, cs: '' } : { t: 'img', u: m.u, sig: '', art: Object.assign(ARTE0(), { modelo: 'subida', foto: m.u }) });
    const vid = Object.assign({ u: '', file: null, src: '', capa: '', tempo: 0, cs: '', dur: 0 }, (p && p.arte && p.arte.vid) || {});
    if(p && !vid.u && ['story', 'reels'].includes(p.formato) && (p.midias || [])[0] && p.midias[0].t === 'video') Object.assign(vid, { u: p.midias[0].u, capa: p.midia_url || '' });
    if(fmt === 'carrossel' && slides[0] && slides[0].t === 'img') art = slides[0].art;
    const tagsBase = [tagify(mk.marca), mk.segmento ? tagify(mk.segmento) : '', C.st.me && C.st.me.cidade ? tagify(String(C.st.me.cidade).split(',')[0]) : ''].filter(t => t.length > 2).join(' ');
    const leg = Object.assign({ gancho: '', corpo: '', cta: '', tags: tagsBase }, (p && p.arte && p.arte.leg) || {});
    if(p && !p.arte && p.legenda) leg.corpo = p.legenda;
    /* v3.38: no Studio, post novo já nasce programado (18h do dia escolhido; sem dia, o próximo 18h que ainda dá) */
    const studio = !!o.studio, dia0 = dia || (at({ data: C.hojeBR(), hora: '18:00' }) > Date.now() + 30 * 6e4 ? C.hojeBR() : isoUTC(Date.now() - 3 * 36e5 + DAY));
    const d = p || { data: studio ? dia0 : (dia || C.hojeBR()), hora: '18:00', tema: '', status: 'ideia', alt: '' };
    const progOn = !p || p.ig_status === 'agendado' || (p.status === 'pronto' && !p.ig_status && !!p.data && at(p) > Date.now());
    /* v3.40: em qual conta sai (post novo: a conta conectada com o @ da marca, à vista; a pessoa troca se quiser) */
    const contaIni = p ? (p.ig_conta || '') : ((C.ig && C.ig.daMarca(mk)) || {}).id || '';
    let fotoFile = null, dirty = true, timer = 0;
    C.sheet(`<div class="form es-ed"><div class="sheet-head"><h2>${novo ? 'Novo post' : 'Editar post'} · ${esc(mk.marca)}</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <div class="es-cols">
        <div class="es-art">
          <div class="es-fmt" role="radiogroup" aria-label="Formato">${FMTS.map(([k, n, x]) => `<label><input type="radio" name="es-f" value="${k}"${fmt === k ? ' checked' : ''}${igFim ? ' disabled' : ''}><span><b>${n}</b><small>${x}</small></span></label>`).join('')}</div>
          <p class="hint es-fmt-dica" id="es-fmt-dica">${esc((FMTS.find(x => x[0] === fmt) || FMTS[0])[3])}</p>
          <div class="es-sl" id="es-sl" hidden></div>
          <canvas id="es-cv" width="1080" height="1350" aria-label="Prévia da arte"></canvas>
          <div class="es-vid" id="es-vid" hidden><video id="es-video" playsinline muted controls preload="metadata"></video>
            <div class="es-vvz" id="es-vvz" hidden>${ico('film')}<b>Sem vídeo ainda</b><span class="hint">MP4 ou MOV, até 50 MB</span></div>
            <div class="fld es-vt"><label for="es-vt">Capa: o quadro do vídeo que aparece no perfil</label><input type="range" id="es-vt" min="0" max="1" step="0.1" value="0"></div>
            <p class="hint" id="es-vinfo" aria-live="polite"></p></div>
          <div class="seg2 es-mod" id="es-mod" role="radiogroup" aria-label="Modelo"></div>
          <div class="cores" id="es-cores">${PAL.concat(mk.cor && !PAL.includes(mk.cor) ? [mk.cor] : []).map(k => `<label class="cor"><input type="radio" name="es-cor" value="${k}"${art.cor === k ? ' checked' : ''}><i style="background:${k}"></i></label>`).join('')}</div>
          <div class="acts" id="es-fa"></div>
        </div>
        <div class="es-fields">
          <div id="es-artf"><details class="es-ia" open><summary><b>${ico('star')} Gerar imagem com IA</b><span class="hint" id="es-ia-q"></span></summary>
            <div class="fld"><span class="lbl-s">Referências da marca <small>até 9: puxa os últimos posts do Instagram, ou sobe fotos e prints do feed</small></span><div class="es-refs" id="es-refs"></div><div class="es-ig"><span class="at"><input class="inp" id="es-ig-u" maxlength="60" value="${esc(mk.rede || '')}" placeholder="perfil.da.marca" autocapitalize="none" spellcheck="false" aria-label="@ do Instagram"></span><button type="button" class="btn sm" id="es-ig-go">${ico('ig')} Puxar os últimos 9</button></div><span class="hint">Conta comercial ou de criador. Os posts mais recentes viram as referências da marca.</span></div>
            <div class="fld"><label for="es-ia-d">O que a imagem mostra</label><textarea class="inp" id="es-ia-d" rows="2" maxlength="400" placeholder="Ex.: smash burger com queijo escorrendo, na chapa, fumaça subindo">${esc(art.ia_d || '')}</textarea></div>
            <div class="fld"><label for="es-ia-e">Estilo</label><select class="inp" id="es-ia-e">${ESTILOS.map(([k, n]) => `<option value="${k}"${(art.ia_e || ((mk.refs || []).length ? 'refs' : 'foto')) === k ? ' selected' : ''}>${n}</option>`).join('')}</select></div>
            <div class="acts"><button type="button" class="btn pri" id="es-ia-go">${ico('star')} Gerar imagem</button><span class="hint" id="es-ia-st"></span></div>
          </details>
          <div class="fld"><label for="es-k">Chamada pequena (em cima)</label><input class="inp" id="es-k" maxlength="40" value="${esc(art.kicker)}" placeholder="Novidade, Bastidor, Só hoje…"></div>
          <div class="fld"><label for="es-t">Título da arte</label><textarea class="inp" id="es-t" rows="2" maxlength="140" placeholder="A frase grande do post">${esc(art.titulo)}</textarea></div>
          <div class="fld" id="es-nf"${art.modelo === 'oferta' ? '' : ' hidden'}><label for="es-n">Número em destaque</label><input class="inp" id="es-n" maxlength="18" value="${esc(art.numero)}" placeholder="R$ 29,90 · -30% · 2x1"></div>
          <div class="fld"><label for="es-x" id="es-xl">${art.modelo === 'lista' ? 'Itens da lista (um por linha)' : art.modelo === 'oferta' ? 'Faixa (ex.: Só até domingo)' : art.modelo === 'frase' ? 'Quem disse' : 'Texto de apoio'}</label><textarea class="inp" id="es-x" rows="3" maxlength="300">${esc(art.texto)}</textarea></div></div>
          <div class="es-leg-h"><h3 class="hz-sub">Legenda</h3><button type="button" class="btn sm" id="es-leg-go">${ico('star')} Escrever com IA</button><span class="hint" id="es-leg-st" aria-live="polite"></span></div>
          <div class="fld"><label for="es-g">Gancho (a primeira linha é a que aparece)</label><input class="inp" id="es-g" maxlength="150" value="${esc(leg.gancho)}" placeholder="Ninguém te contou isso sobre…"></div>
          <div class="fld"><label for="es-c">Corpo</label><textarea class="inp" id="es-c" rows="5" maxlength="1800">${esc(leg.corpo)}</textarea></div>
          <div class="fld"><label for="es-cta">Chamada</label><input class="inp" id="es-cta" list="es-ctas" maxlength="140" value="${esc(leg.cta)}" placeholder="Salva pra não esquecer."><datalist id="es-ctas">${CTAS.map(c => `<option value="${esc(c)}">`).join('')}</datalist></div>
          <div class="fld"><label for="es-h">Hashtags</label><input class="inp" id="es-h" maxlength="400" value="${esc(leg.tags)}"><span class="hint" id="es-cnt"></span></div>
          <div class="fld"><label for="es-alt">Texto alternativo (descreve a imagem pra quem não enxerga)</label><textarea class="inp" id="es-alt" rows="2" maxlength="1000">${esc(d.alt || '')}</textarea></div>
          <div class="row2"><div class="fld"><label for="es-d">Data</label><input class="inp" id="es-d" type="date" value="${esc(d.data || '')}"></div><div class="fld"><label for="es-hr">Hora</label><input class="inp" id="es-hr" type="time" value="${esc(d.hora || '')}"></div></div>
          ${o.auto || studio ? (igFim ? `<p class="fine es-auto-fim">${ico('ig')} ${p.ig_status === 'publicado' ? 'Já foi pro Instagram pelo Corre. Mudar aqui não muda o post de lá.' : 'Indo pro Instagram agora.'}</p>`
            : studio ? `<label class="switch es-auto"><input type="checkbox" id="es-auto"${progOn && !(p && p.status === 'postado') ? ' checked' : ''}><span class="sw"></span><span><b>Programar</b><small>No dia e na hora acima (horário de Brasília), na conta do "Postar em". Desligado, o post fica de rascunho.</small></span></label><div id="es-conta-w">${C.ig ? C.ig.seletor('es-conta', contaIni, mk) : ''}</div>`
            : `<label class="switch es-auto"><input type="checkbox" id="es-auto"${p && p.ig_status === 'agendado' ? ' checked' : ''}><span class="sw"></span><span><b>Publicar sozinho no Instagram</b><small>no @${esc(mk.rede)}, no dia e na hora acima (horário de Brasília)</small></span></label>`) : ''}
          ${studio ? `<div class="fld"><label for="es-tm">Tema</label><input class="inp" id="es-tm" maxlength="40" value="${esc(d.tema || '')}" placeholder="Produto, Bastidor, Dica…"></div>`
            : `<div class="row2"><div class="fld"><label for="es-tm">Tema</label><input class="inp" id="es-tm" maxlength="40" value="${esc(d.tema || '')}" placeholder="Produto, Bastidor, Dica…"></div><div class="fld"><label for="es-st">Status</label><select class="inp" id="es-st">${STATUS.map(([k, n]) => `<option value="${k}"${d.status === k ? ' selected' : ''}>${n}</option>`).join('')}</select></div></div>`}
        </div>
      </div>
      <div class="acts sticky"><button type="button" class="btn pri" id="es-ok">${studio && !igFim ? (progOn && !(p && p.status === 'postado') ? `${ico('clock')} Programar post` : 'Salvar rascunho') : 'Salvar post'}</button><button type="button" class="btn" id="es-post">${ico('ig')} ${studio ? 'Postar agora' : 'Postar'}</button><button type="button" class="btn" id="es-dl">${ico('down')} Baixar arte</button><button type="button" class="btn" id="es-cp">${ico('copy')} Copiar legenda</button>${novo ? '' : '<button type="button" class="btn ghost" id="es-del">' + ico('trash') + '</button>'}</div>
    </div>`, 'wide');
    const cv = C.$('es-cv');
    /* as contas ainda não tinham carregado: o "Postar em" redesenha quando chegarem */
    if(studio && C.ig && C.$('es-conta-w')) C.ig.carrega().then(() => { const w = C.$('es-conta-w'), at0 = C.$('es-conta'); if(w && at0 && !at0.dataset.mexeu){ const ini = p ? (p.ig_conta || '') : ((C.ig.daMarca(mk)) || {}).id || ''; w.innerHTML = C.ig.seletor('es-conta', ini, mk); const n = C.$('es-conta'); if(n) n.addEventListener('change', () => { n.dataset.mexeu = '1'; }); } });
    if(C.$('es-conta')) C.$('es-conta').addEventListener('change', e => { e.target.dataset.mexeu = '1'; });
    const read = () => {
      art.modelo = (document.querySelector('input[name="es-m"]:checked') || {}).value || (art.modelo === 'subida' ? 'subida' : 'capa');
      art.cor = (document.querySelector('input[name="es-cor"]:checked') || {}).value || art.cor;
      art.kicker = C.$('es-k').value.trim(); art.titulo = C.$('es-t').value.trim(); art.texto = C.$('es-x').value; art.numero = C.$('es-n').value.trim();
      art.logo = C.$('es-logo') ? C.$('es-logo').checked : false;
      leg.gancho = C.$('es-g').value.trim(); leg.corpo = C.$('es-c').value.trim(); leg.cta = C.$('es-cta').value.trim(); leg.tags = C.$('es-h').value.trim();
      const txt = juntar(leg), nt = nTags(leg.tags);
      C.$('es-cnt').textContent = `${txt.length}/2200 caracteres · ${nt}/30 hashtags`; C.$('es-cnt').className = 'hint' + (txt.length > 2200 || nt > 30 ? ' bad' : '');
      C.$('es-nf').hidden = art.modelo !== 'oferta';
      C.$('es-xl').textContent = art.modelo === 'lista' ? 'Itens da lista (um por linha)' : art.modelo === 'oferta' ? 'Faixa (ex.: Só até domingo)' : art.modelo === 'frase' ? 'Quem disse' : 'Texto de apoio';
    };
    const alto = () => fmt === 'story' ? 1920 : 1350;
    const paint = () => { clearTimeout(timer); timer = setTimeout(async () => {
      /* a folha já fechou (salvou ou saiu) enquanto o desenho esperava */
      if(!cv.isConnected || !C.$('es-k')) return;
      read(); if(qualItem() !== 'arte') return;
      await render(cv, Object.assign({}, art, { marca: mk.marca, rede: mk.rede, logo_url: mk.logo_url, alto: alto() })); dirty = true;
      /* a miniatura do slide que tá aberto (a lista de slides mostra) */
      const s0 = fmt === 'carrossel' && slides[si];
      if(s0 && s0.t === 'img' && s0.art === art){ try{ const t = document.createElement('canvas'); t.width = 108; t.height = 135; t.getContext('2d').drawImage(cv, 0, 0, 108, 135); s0.prev = t.toDataURL('image/jpeg', .7); slPinta(); }catch(e){ /* logo de outro site: fica sem miniatura */ } }
    }, 120); };

    /* ---------- v4.17 · os formatos ---------- */
    /* o que tá aberto no editor agora: uma arte (desenhada no canvas) ou um vídeo */
    const temVideo = () => !!(vid.u || vid.file);
    const qualItem = () => fmt === 'reels' || (fmt === 'story' && temVideo()) || (fmt === 'carrossel' && slides[si] && slides[si].t === 'video') ? 'video' : 'arte';
    const vObj = () => fmt === 'carrossel' ? slides[si] : vid;
    const modHTML = () => `${art.modelo === 'subida' ? '<label><input type="radio" name="es-m" value="subida" checked><span>Como subiu</span></label>' : ''}${MODELOS.map(([k, n]) => `<label><input type="radio" name="es-m" value="${k}"${art.modelo === k ? ' checked' : ''}><span>${n}</span></label>`).join('')}`;
    const faHTML = () => `<button type="button" class="btn sm" data-fa="foto">${ico('camera')} ${art.foto ? 'Trocar foto' : 'Pôr foto'}</button>${art.foto ? '<button type="button" class="btn sm ghost" data-fa="semfoto">Sem foto</button>' : ''}${mk.logo_url ? `<label class="switch sm"><input type="checkbox" id="es-logo"${art.logo ? ' checked' : ''}><span class="sw"></span><span><b>Logo</b></span></label>` : ''}${fmt === 'story' ? `<button type="button" class="btn sm" data-fa="video">${ico('film')} Usar vídeo</button>` : ''}`;
    /* os campos da arte mostram a arte aberta (trocou de slide, troca tudo) */
    function poeCampos(){
      C.$('es-mod').innerHTML = modHTML(); C.$('es-fa').innerHTML = faHTML();
      document.querySelectorAll('input[name="es-cor"]').forEach(r => { r.checked = r.value === art.cor; });
      C.$('es-k').value = art.kicker || ''; C.$('es-t').value = art.titulo || ''; C.$('es-x').value = art.texto || ''; C.$('es-n').value = art.numero || '';
      C.$('es-ia-d').value = art.ia_d || '';
    }
    const thumbDe = x => x.t === 'video' ? (x.prev || x.capa || '') : (x.prev || x.u || (x.art.modelo === 'subida' ? x.art.foto : '') || '');
    function slPinta(){
      const el = C.$('es-sl'); if(!el) return;
      el.hidden = fmt !== 'carrossel'; if(el.hidden) return;
      const n = slides.length;
      el.innerHTML = `<ol class="es-sl-l" aria-label="Slides do carrossel">${slides.map((x, i) => { const t = thumbDe(x); return `<li><button type="button" class="es-sl-b${i === si ? ' on' : ''}" data-si="${i}" aria-label="Slide ${i + 1}${x.t === 'video' ? ', vídeo' : ''}" aria-current="${i === si}">${t ? `<img src="${esc(t)}" alt="">` : ''}<i class="n num">${i + 1}</i>${x.t === 'video' ? `<i class="v">${ico('play')}</i>` : ''}</button></li>`; }).join('')}</ol>
        <div class="es-sl-a">${n < 10 ? `<button type="button" class="btn sm" data-sl="arte">${ico('plus')} Arte</button><button type="button" class="btn sm" data-sl="arq">${ico('up')} Foto ou vídeo</button>` : ''}
          ${n > 1 ? `<button type="button" class="rnd sm" data-sl="esq" aria-label="Levar o slide ${si + 1} pra esquerda"${si === 0 ? ' disabled' : ''}>${ico('prev')}</button><button type="button" class="rnd sm" data-sl="dir" aria-label="Levar o slide ${si + 1} pra direita"${si === n - 1 ? ' disabled' : ''}>${ico('next')}</button><button type="button" class="btn sm ghost" data-sl="tira">${ico('trash')} Tirar o ${si + 1}</button>` : ''}
          <span class="mono${n < 2 ? ' bad' : ''}">${n}/10${n < 2 ? ' · mínimo 2' : ''}</span></div>`;
    }
    /* mostra o canvas (arte) ou o vídeo, os slides do carrossel e os campos que valem pro que tá aberto */
    function mostra(){
      const v = qualItem() === 'video';
      cv.hidden = v; C.$('es-vid').hidden = !v;
      ['es-mod', 'es-cores', 'es-fa'].forEach(id => { C.$(id).hidden = v; });
      C.$('es-artf').hidden = v;
      cv.classList.toggle('alto', fmt === 'story');
      C.$('es-vid').classList.toggle('alto', fmt !== 'carrossel');
      slPinta();
      if(v) poeVideo(); else { C.$('es-video').pause(); paint(); }
      const dl = C.$('es-dl'); if(dl) dl.innerHTML = `${ico('down')} ${fmt === 'carrossel' ? 'Baixar os slides' : v ? 'Baixar o vídeo' : 'Baixar arte'}`;
      const cp = C.$('es-cp'); if(cp) cp.hidden = fmt === 'story';
    }
    /* o vídeo aberto: a prévia, a capa (o quadro escolhido) e o que o Instagram aceita */
    const LIM_V = { story: [1, 60], carrossel: [1, 60], reels: [3, 900] };
    const seg = x => x >= 60 ? `${Math.floor(x / 60)}min${String(Math.round(x % 60)).padStart(2, '0')}` : `${Math.round(x)} s`;
    function poeVideo(){
      const o = vObj(), ve = C.$('es-video'), rg = C.$('es-vt'), src = o && (o.src || o.u) || '';
      C.$('es-vvz').hidden = !!src; ve.hidden = !src; rg.closest('.fld').hidden = !src;
      C.$('es-fa').hidden = false;
      C.$('es-fa').innerHTML = `<button type="button" class="btn sm${src ? '' : ' pri'}" data-fa="trocavideo">${ico('film')} ${src ? 'Trocar vídeo' : 'Pôr vídeo'}</button>${fmt === 'story' ? `<button type="button" class="btn sm ghost" data-fa="arte">Usar arte em vez de vídeo</button>` : ''}`;
      if(ve.dataset.src !== src){ ve.dataset.src = src; if(src) ve.src = src; else ve.removeAttribute('src'); }
      infoVideo();
    }
    function infoVideo(){
      const o = vObj(), el = C.$('es-vinfo'); if(!o || !el) return;
      const [mn, mx] = LIM_V[fmt] || LIM_V.reels, d = o.dur || 0;
      el.className = 'hint' + (d && (d < mn || d > mx) ? ' bad' : '');
      el.textContent = !d ? (fmt === 'reels' ? 'Reels: de 3 s a 15 min, em pé (9:16) fica melhor.' : 'Até 60 s, em pé (9:16) fica melhor.')
        : d < mn ? `O vídeo tem ${seg(d)}: o Instagram pede no mínimo ${mn} s.` : d > mx ? `O vídeo tem ${seg(d)}: ${fmt === 'reels' ? 'o reels vai até 15 min' : 'no ' + (fmt === 'story' ? 'story' : 'carrossel') + ' vai até 60 s'}. Corta antes de subir.`
        : `${seg(d)}${o.file ? ` · ${(o.file.size / 1048576).toFixed(1).replace('.', ',')} MB` : ''} · a capa é o quadro em ${seg(o.tempo || 0)}.`;
    }
    const ve0 = C.$('es-video');
    ve0.addEventListener('loadedmetadata', () => {
      const o = vObj(); if(!o) return; o.dur = ve0.duration || 0;
      const rg = C.$('es-vt'); rg.max = String(Math.max(0.1, Math.floor(o.dur * 10) / 10)); rg.value = String(Math.min(o.tempo || 0, o.dur || 0));
      try{ ve0.currentTime = Math.max(0.05, o.tempo || 0); }catch(e){}
      infoVideo();
    });
    /* parou num quadro: vira a miniatura do slide (só dá com o vídeo do aparelho ou de onde deixa ler) */
    ve0.addEventListener('seeked', () => {
      const o = vObj(); if(!o || fmt !== 'carrossel') return;
      try{ const t = document.createElement('canvas'); t.width = 108; t.height = 135; const k = Math.max(108 / ve0.videoWidth, 135 / ve0.videoHeight), sw = 108 / k, sh = 135 / k; t.getContext('2d').drawImage(ve0, (ve0.videoWidth - sw) / 2, (ve0.videoHeight - sh) / 2, sw, sh, 0, 0, 108, 135); o.prev = t.toDataURL('image/jpeg', .7); slPinta(); }catch(e){}
    });
    C.$('es-vt').addEventListener('input', e => { const o = vObj(); if(!o) return; o.tempo = Math.round(+e.target.value * 10) / 10; o.cs = ''; try{ ve0.pause(); ve0.currentTime = Math.max(0.05, o.tempo); }catch(err){} infoVideo(); });
    /* um vídeo do aparelho: confere tipo, tamanho e duração antes de aceitar */
    const duracao = f => new Promise(ok => { const v = document.createElement('video'), u = URL.createObjectURL(f); const fim = d => { clearTimeout(t); ok({ d, u }); }; const t = setTimeout(() => fim(0), 8000); v.preload = 'metadata'; v.onloadedmetadata = () => fim(v.duration || 0); v.onerror = () => fim(0); v.src = u; });
    async function aceitaVideo(f, onde){
      if(!/^video\/(mp4|quicktime)$/.test(f.type) && !/\.(mp4|mov)$/i.test(f.name || '')){ C.toast('O Instagram aceita vídeo em MP4 ou MOV.'); return null; }
      if(f.size > 50 * 1048576){ C.toast(`Esse vídeo tem ${(f.size / 1048576).toFixed(0)} MB. O limite é 50 MB: exporta mais leve (1080p) e tenta de novo.`, 5200); return null; }
      const { d, u } = await duracao(f), [mn, mx] = LIM_V[onde] || LIM_V.reels;
      if(d && d < mn){ URL.revokeObjectURL(u); C.toast(`Esse vídeo tem ${seg(d)}: o Instagram pede no mínimo ${mn} s.`); return null; }
      if(d && d > mx){ URL.revokeObjectURL(u); C.toast(`Esse vídeo tem ${seg(d)}. ${onde === 'reels' ? 'O reels vai até 15 min.' : 'No ' + (onde === 'story' ? 'story' : 'carrossel') + ', até 60 s.'} Corta antes de subir.`, 5200); return null; }
      return { file: f, src: u, dur: d, tempo: 0, cs: '', capa: '', u: '' };
    }
    async function pegaVideo(){
      const f = await C.pickFile('video/mp4,video/quicktime,.mp4,.mov'); if(!f) return;
      const r = await aceitaVideo(f, fmt); if(!r) return;
      const o = vObj(); if(o && o.src && o.file) URL.revokeObjectURL(o.src);
      Object.assign(o, r); delete o.prev;
      mostra(); dirty = true;
    }
    C.$('es-fa').addEventListener('click', async e => {
      const b = e.target.closest('[data-fa]'); if(!b) return;
      const k = b.dataset.fa;
      if(k === 'foto'){
        const f = await C.pickFile('image/*'); if(!f) return;
        try{ fotoFile = await C.shrink(f, 1600, .86); art.foto = URL.createObjectURL(fotoFile); C.$('es-fa').innerHTML = faHTML(); paint(); }catch(err){ C.toast('Não deu pra abrir essa imagem.'); }
      } else if(k === 'semfoto'){ art.foto = ''; fotoFile = null; C.$('es-fa').innerHTML = faHTML(); paint(); }
      else if(k === 'video' || k === 'trocavideo') await pegaVideo();
      else if(k === 'arte'){ Object.assign(vid, { u: '', file: null, src: '', capa: '', cs: '', dur: 0, tempo: 0 }); C.$('es-fa').innerHTML = faHTML(); mostra(); }
    });
    /* trocou de formato: o carrossel nasce com a arte que tava aberta; voltar pro feed ou pro story leva a arte do slide aberto */
    document.querySelectorAll('input[name="es-f"]').forEach(r => r.addEventListener('change', () => {
      if(!r.checked) return;
      read(); if(fmt === 'carrossel' && slides[si]) slides[si].fotoFile = fotoFile;
      const de = fmt; fmt = r.value;
      if(fmt === 'carrossel'){
        if(!slides.length) slides = [{ t: 'img', art, u: de === 'feed' && p && p.formato !== 'carrossel' ? (p.midia_url || '') : '', sig: de === 'feed' && p && p.arte ? (p.arte.sig || '') : '', fotoFile }];
        si = Math.min(si, slides.length - 1);
        if(slides[si].t === 'img'){ art = slides[si].art; fotoFile = slides[si].fotoFile || null; }
      } else if(de === 'carrossel'){
        const s0 = slides[si] && slides[si].t === 'img' ? slides[si] : slides.find(x => x.t === 'img');
        if(s0){ art = s0.art; fotoFile = s0.fotoFile || null; }
      }
      poeCampos(); mostra(); dirty = true;
      const f = FMTS.find(x => x[0] === fmt); C.$('es-fmt-dica').textContent = f ? f[3] : '';
    }));
    /* os slides: abrir, pôr (arte, foto ou vídeo), mudar de lugar e tirar */
    function vaiSlide(i){
      read(); if(slides[si]) slides[si].fotoFile = fotoFile;
      si = Math.max(0, Math.min(i, slides.length - 1));
      const x = slides[si];
      if(x && x.t === 'img'){ art = x.art; fotoFile = x.fotoFile || null; poeCampos(); }
      mostra();
    }
    C.$('es-sl').addEventListener('click', async e => {
      const b = e.target.closest('[data-si]'); if(b){ vaiSlide(+b.dataset.si); return; }
      const a = e.target.closest('[data-sl]'); if(!a) return;
      const k = a.dataset.sl;
      if(k === 'arte' && slides.length < 10){
        read(); if(slides[si]) slides[si].fotoFile = fotoFile;
        slides.splice(si + 1, 0, { t: 'img', u: '', sig: '', art: Object.assign(ARTE0(), { cor: art.cor, modelo: art.modelo === 'subida' ? 'capa' : art.modelo, logo: art.logo }) });
        vaiSlide(si + 1); dirty = true;
      } else if(k === 'arq'){
        const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true; inp.accept = 'image/*,video/mp4,video/quicktime,.mp4,.mov';
        inp.onchange = async () => {
          const fs = [...(inp.files || [])].slice(0, 10 - slides.length); if(!fs.length) return;
          read(); if(slides[si]) slides[si].fotoFile = fotoFile;
          let pos = si + 1;
          for(const f of fs){
            if(/^video\//.test(f.type) || /\.(mp4|mov)$/i.test(f.name || '')){ const r = await aceitaVideo(f, 'carrossel'); if(r) slides.splice(pos++, 0, Object.assign({ t: 'video' }, r)); }
            else try{ const ff = await C.shrink(f, 1600, .88); slides.splice(pos++, 0, { t: 'img', u: '', sig: '', fotoFile: ff, art: Object.assign(ARTE0(), { modelo: 'subida', foto: URL.createObjectURL(ff), logo: false }) }); }catch(err){ C.toast('Uma imagem não abriu.'); }
          }
          if((inp.files || []).length > fs.length) C.toast('O carrossel vai até 10.');
          vaiSlide(pos - 1); dirty = true;
        };
        inp.click();
      } else if(k === 'esq' || k === 'dir'){
        const j = si + (k === 'esq' ? -1 : 1); if(j < 0 || j >= slides.length) return;
        read(); if(slides[si]) slides[si].fotoFile = fotoFile;
        [slides[si], slides[j]] = [slides[j], slides[si]]; si = j; slPinta(); dirty = true;
        const nb = C.$('es-sl').querySelector(`[data-sl="${k}"]`); if(nb && !nb.disabled) nb.focus(); else { const sb = C.$('es-sl').querySelector('.es-sl-b.on'); if(sb) sb.focus(); }
      } else if(k === 'tira' && slides.length > 1){
        const x = slides.splice(si, 1)[0]; if(x && x.src && x.file) URL.revokeObjectURL(x.src);
        si = Math.min(si, slides.length - 1); const y = slides[si];
        if(y.t === 'img'){ art = y.art; fotoFile = y.fotoFile || null; poeCampos(); }
        mostra(); dirty = true; C.toast('Slide tirado.');
      }
    });
    poeCampos(); read(); mostra();
    C.$('es-cv').closest('.es-ed').addEventListener('input', paint);
    C.$('es-cv').closest('.es-ed').addEventListener('change', paint);
    /* ---------- IA: referências da marca + descrição + estilo ---------- */
    let refs = Array.isArray(mk.refs) ? mk.refs.slice(0, 9) : [];
    const paintRefs = () => { C.$('es-refs').innerHTML = refs.map((u, i) => `<span class="es-ref"><img src="${esc(u)}" alt="Referência ${i + 1}"><button type="button" data-ref-del="${i}" aria-label="Tirar referência ${i + 1}">${ico('x')}</button></span>`).join('') + (refs.length < 9 ? `<button type="button" class="es-ref add" id="es-ref-add" aria-label="Pôr referência">${ico('plus')}</button>` : ''); };
    const saveRefs = async () => { try{ await C.api.upd('corre_portfolio', { id: mk.id }, { refs }); mk.refs = refs.slice(); }catch(e){ C.toast(C.errMsg(e, 'Não deu pra guardar as referências.')); } };
    paintRefs();
    C.$('es-refs').addEventListener('click', async e => {
      const del = e.target.closest('[data-ref-del]');
      if(del){ const u = refs.splice(+del.dataset.refDel, 1)[0]; paintRefs(); await saveRefs(); if(u) C.api.unlink(u); return; }
      if(!e.target.closest('#es-ref-add')) return;
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
      inp.onchange = async () => {
        const files = [...(inp.files || [])].slice(0, 9 - refs.length); if(!files.length) return;
        C.$('es-ia-st').textContent = 'Subindo referências…';
        for(const f of files){ try{ const b = await C.shrink(f, 1280, .82); refs.push(await C.api.upload(b)); paintRefs(); }catch(err){ C.toast(C.errMsg(err, 'Uma imagem não subiu.')); } }
        C.$('es-ia-st').textContent = ''; await saveRefs();
        if(refs.length) C.$('es-ia-e').value = 'refs';
      };
      inp.click();
    });
    /* Instagram: os últimos 9 posts do @ viram referência (função "instagram" no Supabase) */
    async function fakeFeed(u){
      /* demonstração: sem Instagram de verdade, o Corre desenha 9 quadradinhos com as cores da marca */
      const cores = [art.cor || mk.cor || '#FFE800', '#FF48B0', '#0067AE', '#FF6C2F', '#141216', '#765BA7'], out = [];
      for(let i = 0; i < 9; i++){
        const c = document.createElement('canvas'); c.width = c.height = 240; const x = c.getContext('2d'), r = C.rng(C.hash(u + i));
        x.fillStyle = cores[i % cores.length]; x.fillRect(0, 0, 240, 240);
        x.fillStyle = cores[(i + 2) % cores.length]; x.beginPath(); x.arc(60 + r() * 120, 60 + r() * 120, 40 + r() * 60, 0, 6.283); x.fill();
        const b = await new Promise(ok => c.toBlob(ok, 'image/jpeg', .8)); out.push(await C.api.upload(b));
      }
      return out;
    }
    C.$('es-ig-go').addEventListener('click', async ev => {
      const b = ev.currentTarget, st = C.$('es-ia-st'), u = limpaIg(C.$('es-ig-u').value);
      if(!IG_RE.test(u)){ C.toast('Coloca o @ do Instagram.'); C.$('es-ig-u').focus(); return; }
      b.disabled = true; st.textContent = `Puxando os posts de @${u}…`;
      try{
        let novas = [];
        try{ const r = await C.api.fn('instagram', { usuario: u, qtd: 9 }); novas = (r && r.urls) || []; }
        catch(e){ if(e && e.code === 'nofn' && C.DEMO){ novas = await fakeFeed(u); C.toast('Na demonstração o Corre desenha um feed de mentira.', 3600); } else throw e; }
        if(!novas.length) throw { code: 'sem_posts' };
        const velhas = refs.slice(); refs = novas.slice(0, 9); paintRefs(); await saveRefs();
        velhas.forEach(x => { if(!refs.includes(x)) C.api.unlink(x); });
        C.$('es-ia-e').value = 'refs'; st.textContent = `${refs.length} posts de @${u} viraram referência.`;
      }catch(e){ st.textContent = ''; C.toast((e && (IG_ERRO[e.code] || (e.status === 404 && IG_ERRO.sem_chave))) || C.errMsg(e, 'Não deu pra puxar agora.'), 4600); }
      finally{ b.disabled = false; }
    });
    const prompt = () => {
      const est = ESTILOS.find(x => x[0] === C.$('es-ia-e').value) || ESTILOS[1];
      const desc = C.$('es-ia-d').value.trim() || art.titulo || leg.gancho || mk.marca;
      const usaRefs = refs.length > 0;
      return `Imagem para um post de Instagram da marca "${mk.marca}"${mk.segmento ? ` (${mk.segmento})` : ''}. Cena: ${desc}. Estilo: ${est[0] === 'refs' && !usaRefs ? ESTILOS[1][2] : est[2]}.` +
        (usaRefs ? ' Use as imagens de referência como guia de identidade visual da marca (paleta de cores, luz, enquadramento, textura e clima), sem copiar nenhuma delas e sem repetir os textos que aparecem nelas.' : '') +
        ' Formato vertical. Não escreva nenhum texto, letra, número ou logotipo na imagem. Deixe a parte de baixo mais limpa, porque ela vai receber um título.';
    };
    async function fakeIA(){
      /* demonstração: sem IA de verdade, o Corre desenha uma imagem abstrata com as cores da marca */
      const c = document.createElement('canvas'); c.width = 1024; c.height = 1536; const x = c.getContext('2d'), r = C.rng(C.hash(prompt()));
      const cores = [art.cor || '#FFE800', '#FF48B0', '#0067AE', '#FF6C2F', '#141216'];
      x.fillStyle = cores[0]; x.fillRect(0, 0, 1024, 1536);
      for(let i = 0; i < 9; i++){ x.fillStyle = cores[1 + Math.floor(r() * 4)]; x.globalAlpha = .55 + r() * .4; x.beginPath(); x.arc(r() * 1024, r() * 1100, 120 + r() * 320, 0, 6.283); x.fill(); }
      x.globalAlpha = .12; x.fillStyle = '#000'; for(let y = 0; y < 1536; y += 12) for(let k = (y / 12) % 2 ? 6 : 0; k < 1024; k += 12){ x.beginPath(); x.arc(k, y, 1.6, 0, 6.283); x.fill(); }
      return await new Promise(ok => c.toBlob(ok, 'image/jpeg', .9));
    }
    C.$('es-ia-go').addEventListener('click', async ev => {
      const b = ev.currentTarget, st = C.$('es-ia-st'), rotulo = b.innerHTML; read();
      art.ia_d = C.$('es-ia-d').value.trim(); art.ia_e = C.$('es-ia-e').value;
      b.disabled = true; b.innerHTML = `${ico('star')} Gerando…`; st.className = 'hint'; st.textContent = 'A IA tá desenhando. Leva uns 20 segundos.';
      try{
        let blobIA = null, aviso = '';
        try{
          const r = await C.iaFn({ prompt: prompt(), refs, marca_id: mk.id }, { oque: 'uma imagem' }); aviso = r.aviso || '';
          const bin = atob(r.b64), arr = new Uint8Array(bin.length); for(let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          blobIA = new Blob([arr], { type: r.mime || 'image/png' });
          if(r.restam != null) C.$('es-ia-q').textContent = `${r.restam} ${r.restam === 1 ? 'imagem' : 'imagens'} hoje`;
        }catch(e){
          if(e && e.code === 'nofn' && C.DEMO){ blobIA = await fakeIA(); C.toast(IA_ERRO.nofn, 3600); }
          else throw e;
        }
        /* v3.55: a folha fechou (ou outra abriu) enquanto a IA desenhava: a imagem não cai no post errado */
        if(!cv.isConnected) return;
        fotoFile = await C.shrink(new File([blobIA], 'ia.png', { type: blobIA.type }), 1600, .88);
        art.foto = URL.createObjectURL(fotoFile);
        if(['frase', 'lista', 'oferta'].includes(art.modelo)){ const r2 = document.querySelector('input[name="es-m"][value="imagem"]'); if(r2) r2.checked = true; }
        paint(); st.textContent = aviso === 'verificar' ? 'Pronta, mas sem as referências da marca: pra IA usar as referências, a conta da OpenAI precisa ser verificada (Settings › Organization › Verify).' : 'Pronta. Escolhe o modelo e salva.';
        read(); if(!leg.gancho && !leg.corpo) setTimeout(() => escreverLegenda(true), 400);
      }catch(e){ const msg = iaMsg(e, IA_ERRO, 'Não deu pra gerar agora.'); st.className = 'hint bad'; st.textContent = msg; C.toast(msg, 6000); }
      finally{ b.disabled = false; b.innerHTML = rotulo; }
    });

    const blob = () => new Promise((ok, fail) => { try{ cv.toBlob(b => b ? ok(b) : fail({ code: 'blob' }), 'image/jpeg', .9); }catch(e){ fail(e); } });
    /* ---------- legenda com IA: lê a arte pronta + o contexto da marca, no tom das últimas legendas ---------- */
    let legBusy = false;
    const ctxLeg = () => ({
      marca: mk.marca, segmento: mk.segmento || '', rede: mk.rede || '', cidade: (C.st.me && C.st.me.cidade) || '',
      modelo: art.modelo, kicker: art.kicker, titulo: art.titulo, texto: art.texto, numero: art.numero,
      cena: C.$('es-ia-d').value.trim(), tema: C.$('es-tm').value.trim(), data: C.$('es-d').value || '',
      anteriores: E.posts.filter(x => x.legenda && (!p || x.id !== p.id)).sort((a, b) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || ''))).slice(0, 3).map(x => x.legenda)
    });
    async function arteB64(){
      if(qualItem() === 'video') return '';
      try{
        await render(cv, Object.assign({}, art, { marca: mk.marca, rede: mk.rede, logo_url: mk.logo_url, alto: alto() }));
        const b = await blob(), small = await C.shrink(new File([b], 'arte.jpg', { type: 'image/jpeg' }), 768, .8);
        return await new Promise(ok => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result || '')); fr.onerror = () => ok(''); fr.readAsDataURL(small); });
      }catch(e){ return ''; }
    }
    const fakeLeg = c => {
      const t = c.titulo || c.cena || c.marca;
      return { gancho: c.kicker ? `${c.kicker}: ${t}` : t, corpo: `${c.texto ? c.texto + '\n\n' : ''}Na ${c.marca}${c.segmento ? ` (${c.segmento.toLowerCase()})` : ''}, isso aqui não é detalhe: é o jeito da casa.`, cta: CTAS[C.hash(t) % CTAS.length], tags: [tagify(c.marca), c.tema ? tagify(c.tema) : ''].filter(x => x.length > 2).join(' '), alt: `Arte do post da ${c.marca}: ${String(t).replace(/[.!?…\s]+$/, '')}.` };
    };
    const juntaTags = (a, b) => [...new Set(`${a || ''} ${b || ''}`.split(/\s+/).filter(t => /^#[\p{L}\p{N}_]{2,}$/u.test(t)))].slice(0, 15).join(' ');
    function setLeg(r, soVazios){
      const put = (id, v) => { const el = C.$(id); if(el && v && (!soVazios || !el.value.trim())) el.value = v; };
      put('es-g', r.gancho); put('es-c', r.corpo); put('es-cta', r.cta); put('es-alt', r.alt);
      if(r.tags) C.$('es-h').value = juntaTags(soVazios ? C.$('es-h').value : tagsBase, r.tags);
      paint();
    }
    async function escreverLegenda(auto){
      if(legBusy || !C.$('es-leg-go') || !cv.isConnected) return; legBusy = true;
      const b = C.$('es-leg-go'), st = C.$('es-leg-st'); b.disabled = true; st.textContent = 'Escrevendo a legenda…';
      try{
        read(); const ctx = ctxLeg(), arte = await arteB64();
        let r;
        try{ r = await C.iaFn({ acao: 'legenda', ctx, arte, marca_id: mk.id }, { oque: 'uma legenda', auto: auto ? false : undefined }); }
        catch(e){ if(e && e.code === 'nofn' && C.DEMO){ r = fakeLeg(ctx); if(!auto) C.toast('Na demonstração a legenda sai de um modelo pronto.', 3200); } else throw e; }
        if(!C.$('es-leg-go') || !cv.isConnected) return;
        setLeg(r || {}, auto); st.textContent = 'Legenda pronta. Revisa antes de postar.';
      }catch(e){
        const semIA = e && (e.code === 'sem_chave' || e.status === 404), msg = iaMsg(e, LEG_ERRO, 'Não deu pra escrever agora.');
        if(C.$('es-leg-st')) C.$('es-leg-st').textContent = semCredito(e) ? 'IA sem crédito.' : '';
        if(!auto || !(semIA || semCredito(e))) C.toast(msg, semCredito(e) ? 6000 : 4200);
      }finally{ legBusy = false; if(C.$('es-leg-go')) C.$('es-leg-go').disabled = false; }
    }
    C.$('es-leg-go').addEventListener('click', () => escreverLegenda(false));
    /* post marcado como Pronto (no Studio: ligou o "Postar sozinho") e sem legenda: a legenda já vem escrita */
    if(C.$('es-st')) C.$('es-st').addEventListener('change', e => { if(e.target.value !== 'pronto') return; read(); if(!leg.gancho && !leg.corpo) escreverLegenda(true); });
    const rotOk = () => { const a = C.$('es-auto'), b = C.$('es-ok'); if(studio && !igFim && a && b && !b.disabled) b.innerHTML = a.checked ? `${ico('clock')} Programar post` : 'Salvar rascunho'; };
    if(studio && C.$('es-auto')) C.$('es-auto').addEventListener('change', e => { rotOk(); if(!e.target.checked) return; read(); if(!leg.gancho && !leg.corpo) escreverLegenda(true); });

    const nomeArq = () => `${C.norm(mk.marca).replace(/[^a-z0-9]+/g, '-')}-${C.$('es-d').value || 'post'}.jpg`;
    async function baixar(){ try{ const b = await blob(), u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = nomeArq(); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); return true; }catch(e){ C.toast('O logo bloqueou a exportação. Desliga o logo e tenta de novo.', 4200); return false; } }
    /* ---------- v4.17 · subir o que o formato precisa ---------- */
    /* a assinatura da arte: igual à da última vez, a imagem que já subiu fica (e a aprovação do cliente não volta pra ele) */
    const sigDe = (a, h) => JSON.stringify([a.modelo, a.cor, a.kicker, a.titulo, a.texto, a.numero, a.foto, !!a.logo, mk.marca, mk.rede || '', a.logo ? mk.logo_url || '' : '', h]);
    async function sobeArte(a, u0, sig0, h, tela){
      if(u0 && a.modelo === 'subida' && a.foto === u0 && h === 1350) return u0;
      if(u0 && sig0 && sig0 === sigDe(a, h)) return u0;
      await new Promise(r => setTimeout(r, 160));
      await render(tela, Object.assign({}, a, { marca: mk.marca, rede: mk.rede, logo_url: mk.logo_url, alto: h }));
      try{ const b = await new Promise((ok, fail) => { try{ tela.toBlob(x => x ? ok(x) : fail({ code: 'blob' }), 'image/jpeg', .9); }catch(e){ fail(e); } }); return await C.api.upload(b); }
      catch(e){ if(e && e.name === 'SecurityError'){ C.toast('O logo bloqueou a arte. Desliga o logo pra salvar a imagem.', 4200); return u0 || ''; } throw e; }
    }
    /* o quadro do vídeo que vira a capa (do aparelho, ou do armazenamento do Corre, que deixa ler) */
    function quadro(src, t, h){
      return new Promise(ok => {
        const v = document.createElement('video'), tela = document.createElement('canvas'); let feito = false;
        const fim = b => { if(feito) return; feito = true; clearTimeout(to); ok(b); };
        const to = setTimeout(() => fim(null), 9000);
        if(!/^(blob|data):/.test(src)) v.crossOrigin = 'anonymous';
        v.muted = true; v.playsInline = true; v.preload = 'auto';
        v.onloadeddata = () => { try{ v.currentTime = Math.min(Math.max(0.05, t), Math.max(0.05, (v.duration || 1) - 0.05)); }catch(e){ fim(null); } };
        v.onseeked = () => { try{ tela.width = W; tela.height = h; const x = tela.getContext('2d'), k = Math.max(W / v.videoWidth, h / v.videoHeight), sw = W / k, sh = h / k; x.fillStyle = '#141216'; x.fillRect(0, 0, W, h); x.drawImage(v, (v.videoWidth - sw) / 2, (v.videoHeight - sh) / 2, sw, sh, 0, 0, W, h); tela.toBlob(b => fim(b), 'image/jpeg', .88); }catch(e){ fim(null); } };
        v.onerror = () => fim(null);
        v.src = src;
      });
    }
    /* o navegador não conseguiu ler o quadro (formato que ele não abre): a capa vira um cartaz com a cor da marca */
    function capaVazia(h){
      const tela = document.createElement('canvas'); tela.width = W; tela.height = h; const x = tela.getContext('2d'), bg = mk.cor || '#141216', ink = inkOn(bg);
      x.fillStyle = bg; x.fillRect(0, 0, W, h);
      x.fillStyle = ink; x.beginPath(); x.arc(W / 2, h / 2, 120, 0, 6.283); x.fill(); x.fillStyle = bg; x.beginPath(); x.moveTo(W / 2 - 40, h / 2 - 66); x.lineTo(W / 2 + 70, h / 2); x.lineTo(W / 2 - 40, h / 2 + 66); x.closePath(); x.fill();
      font(x, 900, 64, 'condensed'); x.fillStyle = ink; x.textAlign = 'center'; x.fillText(String(mk.marca || 'VÍDEO').toUpperCase(), W / 2, h / 2 + 250);
      return new Promise(ok => tela.toBlob(ok, 'image/jpeg', .88));
    }
    async function sobeVideo(o, h, btn){
      if(o.file){ btn.textContent = 'Subindo o vídeo…'; o.u = await C.api.uploadVideo(o.file); o.file = null; o.cs = ''; btn.textContent = 'Salvando…'; }
      const cs = `${o.u}|${o.tempo || 0}|${h}`;
      if(!o.capa || o.cs !== cs){ const b = (await quadro(o.src || o.u, o.tempo || 0, h)) || (await capaVazia(h)); o.capa = await C.api.upload(b); o.cs = cs; }
    }
    /* sobe o que mudou e devolve a arte do post (midia_url), as mídias pro Instagram e o que fica guardado pra reabrir */
    async function montaMidias(btn){
      read();
      if(fmt === 'carrossel'){
        if(slides[si]) slides[si].fotoFile = fotoFile;
        if(!slides.length) throw { message: 'O carrossel tá sem slide.' };
        const tela = document.createElement('canvas'), out = [], meta = [];
        for(let i = 0; i < slides.length; i++){
          const x = slides[i]; btn.textContent = `Salvando o slide ${i + 1} de ${slides.length}…`;
          if(x.t === 'video'){ await sobeVideo(x, 1350, btn); out.push({ u: x.u, t: 'video' }); meta.push({ t: 'video', u: x.u, capa: x.capa, tempo: x.tempo || 0, cs: x.cs }); continue; }
          if(x.fotoFile){ x.art.foto = await C.api.upload(x.fotoFile); x.fotoFile = null; }
          x.u = await sobeArte(x.art, x.u, x.sig, 1350, tela); x.sig = sigDe(x.art, 1350);
          out.push({ u: x.u, t: 'img' }); meta.push({ t: 'img', u: x.u, sig: x.sig, art: Object.assign({}, x.art) });
        }
        fotoFile = slides[si] && slides[si].fotoFile || null;
        return { midia: out[0].t === 'img' ? out[0].u : slides[0].capa, midias: out, extra: { slides: meta, sig: '' } };
      }
      if(fmt === 'reels' || (fmt === 'story' && temVideo())){
        if(!vid.u && !vid.file) return { midia: '', midias: [], extra: { vid: null } };
        await sobeVideo(vid, 1920, btn);
        return { midia: vid.capa, midias: [{ u: vid.u, t: 'video' }], extra: { vid: { u: vid.u, capa: vid.capa, tempo: vid.tempo || 0, cs: vid.cs } } };
      }
      if(fotoFile){ art.foto = await C.api.upload(fotoFile); fotoFile = null; }
      const h = alto(), velha = p && (!p.formato || p.formato === 'feed' || (p.formato === 'story' && !(p.arte && p.arte.vid))) ? p.midia_url || '' : '';
      const midia = await sobeArte(art, velha, (p && p.arte && p.arte.sig) || '', h, cv);
      art.sig = sigDe(art, h);
      return { midia, midias: fmt === 'story' && midia ? [{ u: midia, t: 'img' }] : [], extra: { vid: null } };
    }
    async function salvar(status){
      read();
      /* publicar sozinho: precisa de dia e de hora pra frente */
      const au = C.$('es-auto'), auto = !!(au && au.checked) && status !== 'postado';
      if(auto){
        if(!C.$('es-d').value){ C.toast(studio ? 'Pra programar, escolhe o dia.' : 'Pra publicar sozinho, escolhe o dia.'); C.$('es-d').focus(); return false; }
        if(!C.$('es-hr').value) C.$('es-hr').value = '18:00';
        if(at({ data: C.$('es-d').value, hora: C.$('es-hr').value }) < Date.now() + 6e4){ C.toast(studio ? 'Essa hora já passou. Escolhe uma mais pra frente (ou desliga o "Postar sozinho" pra salvar de rascunho).' : 'Essa hora já passou. Escolhe uma mais pra frente pra publicar sozinho.', 4600); C.$('es-hr').focus(); return false; }
        /* v4.17: programado tem que estar completo pro formato (o banco recusa igual) */
        const falta = fmt === 'carrossel' && slides.length < 2 ? 'O carrossel precisa de pelo menos 2 slides pra programar.' : fmt === 'reels' && !(vid.u || vid.file) ? 'O reels precisa de um vídeo pra programar.' : '';
        if(falta){ C.toast(falta, 4200); return false; }
      }
      const btn = C.$('es-ok'), rot = btn.innerHTML; btn.disabled = true; btn.textContent = 'Salvando…';
      try{
        const velhas = urlsDo(p);
        const md = await montaMidias(btn);
        const row = { marca_id: mk.id, data: C.$('es-d').value || null, hora: C.$('es-hr').value || '', tema: C.$('es-tm').value.trim().slice(0, 40), titulo: (art.titulo || leg.gancho || '').slice(0, 140), legenda: fmt === 'story' ? '' : juntar(leg).slice(0, 2200), alt: C.$('es-alt').value.trim().slice(0, 1000), midia_url: md.midia, formato: fmt, midias: md.midias, status: status || (C.$('es-st') ? C.$('es-st').value : p && p.status === 'postado' ? 'postado' : auto ? 'pronto' : 'ideia'), arte: Object.assign({}, art, { leg }, md.extra) };
        /* o que subiu antes e não serve mais (arte refeita, slide tirado, vídeo trocado) sai do armazenamento */
        const ficam = urlsDo(Object.assign({}, row, { arte: row.arte }));
        const soltar = velhas.filter(u => !ficam.includes(u));
        if(studio && C.$('es-conta') && !igFim) row.ig_conta = C.$('es-conta').value || null;
        if(au && !igFim){
          if(auto) Object.assign(row, { ig_status: 'agendado', ig_quando: `${row.data}T${row.hora}:00-03:00`, status: row.status === 'ideia' ? 'pronto' : row.status });
          else if(p && ['agendado', 'erro'].includes(p.ig_status || '')) row.ig_status = '';
        }
        /* sem o botão de programar (painel da marca): postado à mão ou de volta pra ideia sai da fila do Instagram */
        if(!au && p && ['agendado', 'erro'].includes(p.ig_status || '') && row.status !== 'pronto') row.ig_status = '';
        /* v3.55: e se segue Pronto mas mudou o dia ou a hora, a fila vai junto (o banco refaz a hora; o demo não);
           sem dia, ou com a hora já passada, sai da fila (antes o banco recusava o post sem dia, e a hora velha publicava na hora) */
        else if(!au && p && p.ig_status === 'agendado' && row.status === 'pronto' && (row.data !== p.data || row.hora !== (p.hora || ''))){
          if(row.data && at(row) > Date.now() + 6e4) row.ig_quando = `${row.data}T${row.hora || '12:00'}:00-03:00`;
          else row.ig_status = '';
        }
        const grava = r => p ? C.api.upd('corre_posts', { id: p.id }, r) : C.api.ins('corre_posts', r).then(x => { p = x[0]; });
        try{ await grava(row); }
        catch(e){
          /* v4.18: o site da 4.17 subiu antes do delta-v417 e o editor parou de salvar até post de feed (o banco não
             conhecia as colunas novas). Post de feed salva sem elas; carrossel, story e reels esperam o banco */
          const semColuna = e && (e.code === 'PGRST204' || /column/i.test(e.message || '')) && /formato|midias/.test(e.message || '');
          if(!semColuna) throw e;
          if(fmt !== 'feed'){ const x = new Error('O Studio tá terminando de atualizar: carrossel, story e reels voltam logo. Post de feed salva normal.'); x.corre = true; throw x; }
          const velho = Object.assign({}, row); delete velho.formato; delete velho.midias;
          await grava(velho);
        }
        soltar.forEach(u => C.api.unlink(u));
        await load(); S.sel = p.id; if(p.data){ S.week = weekOf(p.data); S.mes = p.data.slice(0, 7); } lista(); dirty = false;
        if(S.onSave) try{ S.onSave(p); }catch(e){}
        btn.disabled = false; btn.innerHTML = rot;
        return true;
      }catch(e){ C.toast(e && e.corre ? e.message : C.errMsg(e, 'Não deu pra salvar o post.'), e && e.corre ? 5200 : 0); btn.disabled = false; btn.innerHTML = rot; return false; }
    }
    C.$('es-ok').addEventListener('click', async () => {
      const a = C.$('es-auto');
      if(await salvar()){
        const prog = !!(a && a.checked), d = C.$('es-d').value, h = C.$('es-hr').value; C.closeSheet();
        const ct = C.ig && C.ig.porId(p && p.ig_conta);
        C.toast(prog ? (studio ? `Programado: ${short(d)} às ${h}.${ct ? ` Sai sozinho no @${ct.username}.` : ' Sem conta: vira lembrete pra postar à mão.'}` : `Post salvo e programado: sai ${short(d)} às ${h} no Instagram.`) : studio ? 'Rascunho salvo.' : 'Post salvo.', 4600);
      }
    });
    /* v4.17: no carrossel baixa todos os slides (num .zip, na ordem); no vídeo, o vídeo */
    async function baixarFormato(){
      read(); if(fmt === 'carrossel' && slides[si]) slides[si].fotoFile = fotoFile;
      const nome = nomeArq().replace(/\.jpg$/, ''), files = [];
      try{
        const L = fmt === 'carrossel' ? slides : qualItem() === 'video' ? [Object.assign({ t: 'video' }, vid)] : null;
        if(!L) return baixar();
        const tela = document.createElement('canvas');
        for(let i = 0; i < L.length; i++){
          const x = L[i], sfx = L.length > 1 ? '-' + pad(i + 1) : '';
          if(x.t === 'video'){ const u8 = x.file ? new Uint8Array(await x.file.arrayBuffer()) : x.u ? await bytes(x.u) : null; if(u8) files.push({ name: `${nome}${sfx}.mp4`, data: u8 }); continue; }
          await render(tela, Object.assign({}, x.art, { marca: mk.marca, rede: mk.rede, logo_url: mk.logo_url, alto: 1350 }));
          const b = await new Promise((ok, fail) => { try{ tela.toBlob(z => z ? ok(z) : fail({ code: 'blob' }), 'image/jpeg', .9); }catch(e){ fail(e); } });
          files.push({ name: `${nome}${sfx}.jpg`, data: new Uint8Array(await b.arrayBuffer()) });
        }
        if(!files.length){ C.toast('Ainda não tem vídeo pra baixar.'); return false; }
        if(files.length === 1) salvarBlob(new Blob([files[0].data], { type: /\.mp4$/.test(files[0].name) ? 'video/mp4' : 'image/jpeg' }), files[0].name);
        else salvarBlob(zipStore(files), nome + '.zip');
        return true;
      }catch(e){ C.toast(e && e.name === 'SecurityError' ? 'O logo bloqueou a exportação. Desliga o logo e tenta de novo.' : 'Não deu pra baixar agora. Tenta de novo.', 4200); return false; }
    }
    C.$('es-dl').addEventListener('click', () => fmt === 'feed' ? baixar() : baixarFormato());
    C.$('es-cp').addEventListener('click', () => { read(); C.copy(juntar(leg), 'Legenda copiada.'); });
    C.$('es-post').addEventListener('click', async () => {
      /* v4.17: carrossel, story e reels: salva e abre o postar à mão com os arquivos (vários, ou vídeo) */
      if(fmt !== 'feed'){ if(await salvar()){ const q = E.posts.find(x => x.id === p.id) || p; C.closeSheet(); entregar(q, { marca: mk.marca, depois: () => { if(S.onSave) try{ S.onSave(q); }catch(e){} load().then(lista).catch(() => {}); } }); } return; }
      read(); C.copy(juntar(leg), 'Legenda copiada. Cola no Instagram.');
      /* v3.55: abre o Instagram ainda no toque (depois do download e do upload o iPhone bloqueia a janela nova) */
      window.open('https://www.instagram.com/', '_blank', 'noopener');
      const ok = await baixar();
      if(ok && await salvar('postado')){ C.closeSheet(); C.toast('Legenda copiada e arte baixada. Marcado como postado.', 4200); }
    });
    const del = C.$('es-del');
    if(del) del.addEventListener('click', async () => {
      if(del.dataset.armed !== '1'){ del.dataset.armed = '1'; del.classList.add('armed'); del.textContent = 'Apagar?'; return; }
      try{ await C.api.del('corre_posts', { id: p.id }); if(p.midia_url) C.api.unlink(p.midia_url); await load(); lista(); C.closeSheet(); C.toast('Post apagado.'); if(S.onSave) try{ S.onSave(null); }catch(e){} }catch(e){ C.toast(C.errMsg(e)); }
    });
  }

  Object.assign(C.acts, {
    'es-novo': el => editor(null, el && el.dataset && el.dataset.dia),
    'vs-nova': el => { if(C.visitas && E.marca) C.visitas.editor(null, E.marca, { dia: el && el.dataset && el.dataset.dia }); },
    'es-abrir': el => editor(E.posts.find(p => p.id === el.dataset.id)),
    'er-sel': el => { S.sel = el.dataset.post; renderStage(); renderPane(); const st = document.querySelector('.er-stage'); if(st) st.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
    'er-nav': el => { const L = ordenados(), i = L.findIndex(p => p.id === S.sel), n = L[(i + Number(el.dataset.d) + L.length) % L.length]; if(!n) return; S.sel = n.id; if(n.data){ S.week = weekOf(n.data); S.mes = n.data.slice(0, 7); } renderStage(); renderPane(); },
    'er-tab': el => { S.tab = el.dataset.t; document.querySelectorAll('[data-act="er-tab"]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.t === S.tab))); renderPane(); },
    'er-wk': el => { S.week += Number(el.dataset.d) * 7 * DAY; renderPane(); },
    'er-mes': el => { const [y, m] = S.mes.split('-').map(Number), d = new Date(Date.UTC(y, m - 1 + Number(el.dataset.d), 1)); S.mes = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`; renderPane(); },
    'er-todos': (el, ev) => { if(ev) ev.preventDefault(); const t = $r('er-todos'); if(t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
    'er-copy': () => { const p = atual(); if(p && p.legenda) C.copy(p.legenda, 'Legenda copiada.'); },
    'er-copy-alt': () => { const p = atual(); if(p && p.alt) C.copy(p.alt, 'Texto alternativo copiado.'); },
    'er-dl': () => { const p = atual(); if(p && fmtDe(p) !== 'feed') return entregar(p, { depois: () => { renderStage(); renderPane(); relogio(); } }); baixarUm(p); },
    'er-zip': () => baixarPeriodo(),
    'er-feed': async el => {
      const p = atual(); if(!p || !p.midia_url) return;
      el.disabled = true;
      try{ await C.feed.publicar({ tipo: 'arte', midia_url: p.midia_url, texto: p.legenda || p.titulo || '', ref: { marca: E.marca.marca, alt: p.alt || '' } }); C.toast('Arte no feed do Corre.'); }
      catch(e){ C.toast(C.errMsg(e, 'Não deu pra publicar agora.')); }
      finally{ el.disabled = false; }
    },
    'er-mark': () => { const p = atual(); if(p) marcar(p, p.status === 'postado' ? 'pronto' : 'postado'); },
    'er-postar': async () => {
      const p = atual(); if(!p) return;
      if(fmtDe(p) !== 'feed') return entregar(p, { depois: () => { renderStage(); renderPane(); relogio(); } });
      if(p.legenda) C.copy(p.legenda, 'Legenda copiada. Cola no Instagram.');
      window.open('https://www.instagram.com/', '_blank', 'noopener');
      const ok = await baixarUm(p);
      C.toast(`${p.legenda ? 'Legenda copiada' : 'Sem legenda'}${ok ? ' e arte baixada' : ''}. Depois de postar, toca em "Marcar como postado".`, 5200);
    }
  });
  C.estudioRender = render;
  /* v4.17: o Studio (studio.js) e o link de aprovação (aprova.js) usam os formatos daqui */
  Object.assign(C.estudio, { entregar, fmtDe, fmtTag, aprovTag, midiasDe, midiaHTML, NOME_F, FMTS });
})();
