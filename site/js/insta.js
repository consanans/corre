/* CORRE · LEVA PRO STORY DO INSTAGRAM.
   O post, o teu story ou o teu perfil viram uma imagem 9:16 com a cara do Corre: o céu, a marca, o cartão de adesivo
   e a seta pro sticker de link. O Instagram não deixa site nenhum postar por você: a imagem vai pela folha de
   compartilhar do celular e o link vai copiado, pronto pro sticker. Quem toca cai direto no post, no story ou no perfil,
   com o @ de quem chamou (?de=): se entrar no Corre, já sai seguindo quem chamou. */
(function(){
  'use strict';
  const C = window.Corre, { esc, ico } = C, ST = window.CorreStickers;
  const W = 1080, H = 1920;
  const INK = '#0F1218', INK2 = '#3C4450', MUDO = '#6B7480', AMARELO = '#F2EC54', ROSA = '#FF4F9A', AZUL = '#2E5BFF', LINHA = '#E3E8EE', PAPEL2 = '#F3F6F9';
  const F = { disp: '"Playfair Display", Georgia, "Times New Roman", serif', corpo: 'Archivo, "Helvetica Neue", Arial, sans-serif', mono: '"IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace' };
  const est = (peso, fs, lh, fam, it) => ({ fs, lh, font: `${it ? 'italic ' : ''}${peso} ${fs}px ${fam || F.corpo}` });
  const MES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const HANDLE = /^[a-z0-9_.]{3,24}$/;

  /* ---------- links: o @ de quem chamou vai junto (perfil mocado não chama ninguém) ---------- */
  const base = () => location.origin + location.pathname;
  const deMim = () => { const me = C.st.me; return me && me.handle && me.visibilidade !== 'mocado' ? '?de=' + encodeURIComponent(me.handle) : ''; };
  function linkDe(kind, d){
    const rota = kind === 'post' ? '#/p/' + d.p.id : kind === 'story' ? `#/s/${(d.perfil || {}).handle}/${d.s.id}` : '#/@' + d.p.handle;
    return base() + deMim() + rota;
  }
  const linkPerfil = h => base() + deMim() + '#/@' + h;

  /* ---------- a chegada: quem tocou no link ----------
     ?de=@ fica guardado 14 dias (o login do Google volta sem o endereço); ?ir= é a rota pra quem veio pelo
     "Abrir no Chrome" (o intent do Android não leva o #). Os dois saem da barra de endereço. */
  const CONVITE = 'corre-convite', DIAS = 14;
  const ROTA_OK = /^(p\/[\w-]{1,40}|s\/[a-z0-9_.]{3,24}\/[\w-]{1,40}|@[a-z0-9_.]{3,24}|mural(\/[\w-]{0,60})?|g\/[a-z0-9-]{3,40}(\/(membros|sobre))?|grupos|houzi|bb\/[a-z0-9-]{3,48})$/i;
  (function chegada(){
    if(C.EMBED) return;
    let q; try{ q = new URLSearchParams(location.search); }catch(e){ return; }
    if(!q.has('de') && !q.has('ir')) return;
    const de = String(q.get('de') || '').toLowerCase().replace(/^@/, ''), ir = String(q.get('ir') || '').replace(/^#?\/?/, '');
    if(HANDLE.test(de)) try{ localStorage.setItem(CONVITE, JSON.stringify({ h: de, em: Date.now() })); }catch(e){}
    q.delete('de'); q.delete('ir');
    const rota = !location.hash && ROTA_OK.test(ir) ? '#/' + ir : location.hash;
    try{ history.replaceState(null, '', location.pathname + (String(q) ? '?' + q : '') + rota); }catch(e){}
  })();
  function convite(){
    try{ const c = JSON.parse(localStorage.getItem(CONVITE) || 'null'); if(c && HANDLE.test(c.h || '') && Date.now() - (Number(c.em) || 0) < DIAS * 864e5) return c; }catch(e){}
    return null;
  }
  const limpaConvite = () => { try{ localStorage.removeItem(CONVITE); }catch(e){} };
  /* acabou de criar o perfil: segue quem chamou (o @consanans já vem seguido pelo banco; repetido não dá erro) */
  async function segueQuemChamou(me){
    const c = convite(); limpaConvite();
    if(!c || !me || c.h === me.handle) return null;
    try{
      const p = await C.api.one('corre_perfis', { eq: { handle: c.h } });
      if(!p || p.id === me.id) return null;
      try{ await C.api.ins('corre_seguindo', { segue: p.id }); if(C.push) C.push.avisa('seguiu', p.id); }catch(e){ if(!(e && e.code === '23505')) return null; }
      return p;
    }catch(e){ return null; }
  }

  /* navegador de dentro do Instagram/Facebook/WhatsApp: o Google não deixa entrar ali */
  const dentroDeApp = () => /Instagram|FBAN|FBAV|FB_IAB|FBIOS|Line\/|WhatsApp|musical_ly|TikTok|BytedanceWebview|; wv\)/i.test(navigator.userAgent || '');
  const android = () => /Android/i.test(navigator.userAgent || '');
  /* o endereço de onde a pessoa tá, com o convite junto (pra colar no navegador de verdade) */
  const linkAqui = () => { const c = convite(); return base() + (c ? '?de=' + encodeURIComponent(c.h) : '') + (location.hash || ''); };
  function intentUrl(){
    const c = convite(), q = new URLSearchParams(), ir = (location.hash || '').replace(/^#\/?/, '');
    if(c) q.set('de', c.h);
    if(ROTA_OK.test(ir)) q.set('ir', ir);
    return `intent://${location.host}${location.pathname}${String(q) ? '?' + q : ''}#Intent;scheme=https;package=com.android.chrome;end`;
  }
  const botaoEntrar = (txt, cls) => dentroDeApp()
    ? `<button type="button" class="btn pri${cls ? ' ' + cls : ''}" data-act="cv-fora">${ico('ext')}<span>Abrir no navegador</span></button>`
    : `<button type="button" class="btn pri${cls ? ' ' + cls : ''}" data-act="google"><span>${esc(txt || 'Entrar com Google')}</span></button>`;

  /* a barra de baixo pra quem chegou deslogado num post, story, perfil, no Mural ou num grupo */
  const ROTAS_BARRA = /^#\/(p\/|s\/|@|mural|g\/|grupos|houzi$|bb\/)/;
  const B = { p: null };
  function barra(){
    let el = C.$('cv-barra');
    const mostra = !C.st.user && !C.EMBED && ROTAS_BARRA.test(location.hash || '');
    document.body.classList.toggle('com-convite', mostra);
    if(!mostra){ if(el) el.remove(); return; }
    const c = convite(), ok = c && B.p && B.p.handle === c.h;
    const av = c ? C.avatar(ok ? B.p : { nome: c.h }, 's') : `<span class="cv-stk">${ST ? ST.svg('monstra') : ''}</span>`;
    if(!el){ el = document.createElement('aside'); el.id = 'cv-barra'; el.className = 'cv-barra'; el.setAttribute('aria-label', 'Entrar no Corre'); document.body.appendChild(el); }
    el.innerHTML = `<span class="cv-av" id="cv-av">${av}</span><p><b>${c ? `@${esc(c.h)} te chamou pro Corre.` : 'Isso aqui é o Corre.'}</b><small>A rede de quem faz corre: mostra o que faz, acha trampo e anda pela cidade.</small></p>${botaoEntrar('Entrar', 'sm')}`;
    if(c && !ok) C.api.one('corre_perfis', { eq: { handle: c.h } }).then(p => { if(!p) return; B.p = p; const a = C.$('cv-av'); if(a) a.innerHTML = C.avatar(p, 's'); }).catch(() => {});
  }

  /* o story que veio do Instagram (#/s/@/ID): o perfil já tá na tela; abre o story por cima */
  async function abreStory(h, id){
    id = String(id || '').replace(/[^0-9a-zA-Z-]/g, '').slice(0, 40); if(!id) return;
    const rota = C.rota;
    let s = null; try{ s = await C.api.one('corre_stories', { join: 'perfil', eq: { id } }); }catch(e){ s = null; }
    if(rota !== C.rota) return;
    if(!s || !s.perfil || s.perfil.handle !== h){ C.toast('Esse story já saiu do ar. Mas o perfil tá aqui.', 4200); return; }
    const g = C.st.pfStories && C.st.pfStories[0], i = g ? g.stories.findIndex(x => x.id === id) : -1;
    if(i >= 0) C.storyOpen(C.st.pfStories, 0, 'feed', i);
    else C.storyOpen([{ perfil: s.perfil, titulo: 'Destaque', stories: [s] }], 0, 'destaque');
  }

  /* ---------- desenho: utilidades ---------- */
  function rr(x, X, Y, w, h, r){
    x.beginPath();
    const k = Math.max(0, Math.min(r, w / 2, h / 2));
    x.moveTo(X + k, Y); x.arcTo(X + w, Y, X + w, Y + h, k); x.arcTo(X + w, Y + h, X, Y + h, k); x.arcTo(X, Y + h, X, Y, k); x.arcTo(X, Y, X + w, Y, k); x.closePath();
  }
  const nat = im => [im.naturalWidth || im.width || 1, im.naturalHeight || im.height || 1];
  function cobre(x, im, X, Y, w, h){
    const [iw, ih] = nat(im), s = Math.max(w / iw, h / ih), sw = w / s, sh = h / s;
    x.drawImage(im, (iw - sw) / 2, (ih - sh) / 2, sw, sh, X, Y, w, h);
  }
  /* borrão que funciona em qualquer navegador (o filtro de canvas não roda no Safari): encolhe e estica */
  function borrado(im){
    const a = document.createElement('canvas'); a.width = 27; a.height = 48; cobre(a.getContext('2d'), im, 0, 0, 27, 48);
    const b = document.createElement('canvas'); b.width = 135; b.height = 240; const g = b.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(a, 0, 0, 135, 240);
    return b;
  }
  /* retícula de impressão, como no fundo do app */
  function pontos(x, cor, alfa, passo, r){
    x.save(); x.globalAlpha = alfa; x.fillStyle = cor; x.beginPath();
    for(let y = passo / 2, i = 0; y < H + passo; y += passo, i++) for(let X = (i % 2 ? passo / 2 : 0); X < W + passo; X += passo){ x.moveTo(X + r, y); x.arc(X, y, r, 0, 6.2832); }
    x.fill(); x.restore();
  }
  /* nuvens do céu do Corre (manchas brancas sobrepostas), longe da marca lá de cima */
  function nuvens(x){
    let s = 11; const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    [[150, 1720, 460], [930, 1640, 500], [540, 1900, 560], [40, 980, 300], [1040, 1180, 340], [760, 660, 240]].forEach(([cx, cy, sw]) => {
      const sh = sw * .45;
      for(let k = 0; k < 22; k++){
        const X = cx + (r() - .5) * sw, Y = cy + (r() - .7) * sh, R = 40 + r() * sw * .3, g = x.createRadialGradient(X, Y, 0, X, Y, R);
        g.addColorStop(0, `rgba(255,255,255,${(.32 + r() * .22).toFixed(2)})`); g.addColorStop(.6, 'rgba(240,248,252,.15)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = g; x.beginPath(); x.arc(X, Y, R, 0, 6.2832); x.fill();
      }
    });
  }
  const luz = hex => { const n = parseInt(String(hex).slice(1), 16) || 0; return (.2126 * (n >> 16 & 255) + .7152 * (n >> 8 & 255) + .0722 * (n & 255)) / 255; };
  function corta(x, s, max){
    s = String(s || ''); if(x.measureText(s).width <= max) return s;
    while(s.length > 1 && x.measureText(s + '…').width > max) s = s.slice(0, -1);
    return s.replace(/\s+$/, '') + '…';
  }
  /* quebra em linhas que cabem em `max` (palavra maior que a linha, tipo link, quebra no meio); linha vazia = parágrafo */
  function linhas(x, texto, max){
    const out = [];
    String(texto || '').replace(/\r/g, '').split('\n').forEach(par => {
      const ws = par.split(/\s+/).filter(Boolean);
      if(!ws.length){ if(out.length && out[out.length - 1] !== '') out.push(''); return; }
      let ln = '';
      ws.forEach(w => {
        const t = ln ? ln + ' ' + w : w;
        if(x.measureText(t).width <= max){ ln = t; return; }
        if(ln){ out.push(ln); ln = ''; }
        while(w.length > 1 && x.measureText(w).width > max){
          let k = w.length - 1; while(k > 1 && x.measureText(w.slice(0, k)).width > max) k--;
          out.push(w.slice(0, k)); w = w.slice(k);
        }
        ln = w;
      });
      if(ln) out.push(ln);
    });
    while(out.length && out[out.length - 1] === '') out.pop();
    return out;
  }
  const alt = (ls, lh) => ls.reduce((h, s) => h + (s === '' ? lh * .45 : lh), 0);
  /* o maior estilo em que o texto cabe na altura; se nem o menor couber, corta com reticências */
  function cabe(x, texto, larg, estilos, maxH){
    let r = null;
    for(const e of estilos){ x.font = e.font; const ls = linhas(x, texto, larg); r = { e, ls, h: alt(ls, e.lh) }; if(r.h <= maxH) return r; }
    const e = r.e, ls = []; let h = 0; x.font = e.font;
    for(const s of r.ls){ const dh = s === '' ? e.lh * .45 : e.lh; if(h + dh > Math.max(maxH, e.lh)) break; ls.push(s); h += dh; }
    while(ls.length && ls[ls.length - 1] === ''){ ls.pop(); h -= e.lh * .45; }
    if(ls.length){ let s = ls[ls.length - 1]; while(s && x.measureText(s + '…').width > larg) s = s.slice(0, -1); ls[ls.length - 1] = s.replace(/[\s.,;:!?-]+$/, '') + '…'; }
    return { e, ls, h };
  }
  const TAG = /^([#@][\p{L}\p{N}_.]{2,}|https?:\/\/\S{3,})/u;
  /* escreve o bloco: #hashtag, @menção e link na cor de link do Corre */
  function escreve(x, b, X, top, cor, corTag, centro){
    const { e, ls } = b; let y = top;
    x.font = e.font; x.textAlign = 'left'; x.textBaseline = 'alphabetic';
    ls.forEach(s => {
      if(s === ''){ y += e.lh * .45; return; }
      const bl = y + (e.lh - e.fs) / 2 + e.fs * .84;
      let cx = centro ? X - x.measureText(s).width / 2 : X;
      s.split(/(\s+)/).forEach(pt => { if(!pt) return; x.fillStyle = corTag && TAG.test(pt) ? corTag : cor; x.fillText(pt, cx, bl); cx += x.measureText(pt).width; });
      y += e.lh;
    });
  }
  const iniciais = n => (String(n || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('') || '?').toUpperCase();
  /* avatar redondo com contorno de tinta (o aro amarelo é o "aberto pra trampo", como no app) */
  function avatar(x, im, p, cx, cy, r, aro){
    x.save();
    if(aro){ x.beginPath(); x.arc(cx, cy, r + aro, 0, 6.2832); x.fillStyle = INK; x.fill(); x.beginPath(); x.arc(cx, cy, r + aro - 4, 0, 6.2832); x.fillStyle = p && p.aberto ? AMARELO : '#fff'; x.fill(); }
    x.beginPath(); x.arc(cx, cy, r, 0, 6.2832); x.closePath(); x.fillStyle = ROSA; x.fill();
    if(im){ x.save(); x.clip(); cobre(x, im, cx - r, cy - r, r * 2, r * 2); x.restore(); }
    else { x.fillStyle = '#fff'; x.font = `italic 900 ${Math.round(r * .8)}px ${F.disp}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(iniciais(p && p.nome), cx, cy + r * .05); x.textBaseline = 'alphabetic'; }
    x.beginPath(); x.arc(cx, cy, r, 0, 6.2832); x.lineWidth = Math.max(4, r * .06); x.strokeStyle = INK; x.stroke();
    x.restore();
  }
  /* o cartão de adesivo: branco, contorno de tinta, sombra dura e meio torto */
  function cartao(x, X, Y, w, h, gira, dentro, fora){
    x.save(); x.translate(X + w / 2, Y + h / 2); x.rotate(gira); x.translate(-w / 2, -h / 2);
    rr(x, 0, 16, w, h, 46); x.fillStyle = INK; x.fill();
    rr(x, 0, 0, w, h, 46); x.fillStyle = '#fff'; x.fill();
    x.save(); rr(x, 0, 0, w, h, 46); x.clip(); dentro(x); x.restore();
    rr(x, 0, 0, w, h, 46); x.lineWidth = 6; x.strokeStyle = INK; x.stroke();
    if(fora) fora(x);
    x.restore();
  }
  function adesivoEm(x, im, cx, cy, tam, gira){
    if(!im) return; const [iw, ih] = nat(im), k = tam / Math.max(iw, ih);
    x.save(); x.translate(cx, cy); x.rotate(gira); x.shadowColor = 'rgba(10,22,40,.28)'; x.shadowBlur = 18; x.shadowOffsetY = 8; x.drawImage(im, -iw * k / 2, -ih * k / 2, iw * k, ih * k); x.restore();
  }
  /* a marca lá em cima, com a etiqueta "rede" torta, como no app */
  function marca(x, t, y, tam){
    x.save(); x.font = `italic 900 ${tam}px ${F.disp}`; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    x.fillStyle = t.sombra; x.fillText('CORRE', W / 2 + 4, y + Math.round(tam * .07));
    x.fillStyle = t.marca; x.fillText('CORRE', W / 2, y);
    const w = x.measureText('CORRE').width;
    x.translate(W / 2 + w / 2 + 4, y - tam * .66); x.rotate(-.09);
    x.font = `900 ${Math.round(tam * .25)}px ${F.corpo}`; const tw = x.measureText('REDE').width, ph = Math.round(tam * .36);
    x.fillStyle = ROSA; x.fillRect(-tw / 2 - 14 + 5, -ph / 2 + 5, tw + 28, ph);
    x.fillStyle = t.tag; x.fillRect(-tw / 2 - 14, -ph / 2, tw + 28, ph);
    x.fillStyle = INK; x.textBaseline = 'middle'; x.fillText('REDE', 0, 2);
    x.restore();
  }
  /* a chamada em marca-texto e a seta riscada à mão apontando pro sticker de link */
  function chamada(x, t, txt, y){
    x.save(); let tam = 60; x.font = `italic 900 ${tam}px ${F.disp}`;
    while(x.measureText(txt).width > 900 && tam > 40){ tam -= 2; x.font = `italic 900 ${tam}px ${F.disp}`; }
    const w = x.measureText(txt).width, px = Math.round(tam * .3), h = Math.round(tam * 1.24);
    x.translate(W / 2, y); x.rotate(-.02);
    x.fillStyle = t.eF; x.fillRect(-w / 2 - px, -h / 2, w + px * 2, h);
    x.fillStyle = t.eT; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, 0, Math.round(tam * .05));
    x.restore();
    const y0 = y + h / 2 + 20, y1 = y0 + 96, cx = W / 2;
    x.save(); x.strokeStyle = t.seta; x.lineWidth = 12; x.lineCap = 'round'; x.lineJoin = 'round';
    x.beginPath(); x.moveTo(cx - 10, y0); x.bezierCurveTo(cx + 40, y0 + 34, cx - 40, y0 + 64, cx, y1); x.stroke();
    x.beginPath(); x.moveTo(cx - 32, y1 - 34); x.lineTo(cx, y1); x.lineTo(cx + 32, y1 - 34); x.stroke();
    x.restore();
    return y1;
  }
  const dataCurta = ts => { try{ const p = {}; new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'numeric', year: 'numeric' }).formatToParts(new Date(ts)).forEach(o => { p[o.type] = o.value; }); return `${p.day} ${MES[Number(p.month) - 1]} ${p.year}`; }catch(e){ return ''; } };
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  const midiaDe = p => p ? (p.midia_url || (p.tipo === 'rolo' && p.ref && p.ref.src) || '') : '';
  const fotoOk = u => /^(https:\/\/|data:image\/|blob:)/.test(u || '');

  /* ---------- os fundos (post e perfil; o story usa o dele) ---------- */
  const FUNDOS = [['ceu', 'Céu'], ['noite', 'Noite'], ['rosa', 'Rosa'], ['amarelo', 'Amarelo'], ['foto', 'Foto']];
  const TEMA = {
    ceu: { marca: AMARELO, sombra: INK, tag: AMARELO, eF: AMARELO, eT: INK, seta: INK },
    escuro: { marca: AMARELO, sombra: '#000', tag: AMARELO, eF: AMARELO, eT: INK, seta: '#fff' },
    cor: { marca: AMARELO, sombra: INK, tag: '#fff', eF: AMARELO, eT: INK, seta: '#fff' },
    claro: { marca: INK, sombra: ROSA, tag: '#fff', eF: INK, eT: AMARELO, seta: INK }
  };
  function fundo(x, k, foto){
    if(k === 'foto' && foto){ x.drawImage(borrado(foto), 0, 0, W, H); x.fillStyle = 'rgba(15,18,24,.45)'; x.fillRect(0, 0, W, H); pontos(x, '#fff', .08, 44, 4); return TEMA.escuro; }
    if(k === 'noite'){ x.fillStyle = INK; x.fillRect(0, 0, W, H); pontos(x, '#fff', .08, 44, 4); return TEMA.escuro; }
    if(k === 'rosa'){ x.fillStyle = ROSA; x.fillRect(0, 0, W, H); pontos(x, '#fff', .2, 44, 4.5); return TEMA.cor; }
    if(k === 'amarelo'){ x.fillStyle = AMARELO; x.fillRect(0, 0, W, H); pontos(x, INK, .09, 44, 4); return TEMA.claro; }
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1A68CC'); g.addColorStop(.55, '#4FA3EE'); g.addColorStop(1, '#B2E0FF');
    x.fillStyle = g; x.fillRect(0, 0, W, H); nuvens(x); pontos(x, '#fff', .16, 44, 4.5);
    return TEMA.ceu;
  }
  /* o cartão e a chamada andam juntos, no meio do que sobra embaixo da marca */
  const TOPO = 420, PE = 1740;
  const topoDoGrupo = (hCartao, extra) => Math.max(TOPO + (extra || 0), Math.round(TOPO + (extra || 0) + (PE - TOPO - (extra || 0) - (hCartao + 16 + 90 + 74 + 110 + 120)) / 2));

  /* ---------- post ---------- */
  function estilosPost(L, junto){
    const e = [];
    if(L <= 90 && !junto) e.push(est(900, 76, 88, F.disp, true));
    if(L <= 150) e.push(est(800, 58, 70));
    if(L <= 300) e.push(est(700, 48, 62));
    e.push(est(500, 42, 56), est(500, 37, 50), est(500, 33, 45));
    return e;
  }
  function credito(ref){ const a = String(ref.autor || '').replace(/<[^>]*>/g, '').trim(), l = String(ref.lic || '').trim(); return a || l ? `FOTO: ${a}${a && l ? ' · ' : ''}${l}`.toUpperCase() : ''; }
  function desenhaPost(x, d, im, t){
    const p = d.p, a = p.perfil || {}, CW = 900, X0 = (W - CW) / 2, PAD = 58, IW = CW - PAD * 2, G = 30, HEAD = 112, LIM = 900;
    const enq = p.enquete && Array.isArray(p.enquete.ops) ? p.enquete.ops.slice(0, 4).map(String) : null;
    const q = p.tipo === 'fortalece' ? d.orig : null;
    let mid = null;
    if(midiaDe(p)){
      if(im.midia){ const [iw, ih] = nat(im.midia); mid = { im: im.midia, h: Math.round(Math.min(Math.max(IW * ih / iw, 340), p.texto ? 520 : 760)) }; }
      else mid = { im: null, h: 200 };
      mid.cred = p.tipo === 'rolo' && p.ref ? credito(p.ref) : ''; mid.hc = mid.cred ? 36 : 0;
    }
    const enqH = enq ? enq.length * 78 + (enq.length - 1) * 14 : 0;
    let qb = null;
    if(q){
      const P = 26, IQ = IW - P * 2; let h = P + 52, tb = null;
      if(q.texto){ tb = cabe(x, q.texto, IQ, [est(500, 34, 46)], 46 * 4); h += 14 + tb.h; }
      const tm = !!midiaDe(q); if(tm) h += 16 + 230;
      qb = { h: h + P, tb, tm, P, IQ };
    }
    let fixo = PAD + HEAD + G + 30 + PAD;
    [mid ? mid.h + mid.hc : 0, enqH, qb ? qb.h : 0].forEach(h => { if(h) fixo += G + h; });
    let tb = null;
    if(p.texto){ const es = estilosPost(p.texto.length, !!(mid || enq || qb)); tb = cabe(x, p.texto, IW, es, Math.max(es[es.length - 1].lh * 2, LIM - fixo - G)); fixo += G + tb.h; }
    const CH = Math.round(fixo), Y0 = topoDoGrupo(CH);
    const nums = [d.likes ? plural(d.likes, 'curtida', 'curtidas') : '', d.resp ? plural(d.resp, 'resposta', 'respostas') : ''].filter(Boolean).join(' · ').toUpperCase();
    const tipo = enq ? 'ENQUETE' : p.tipo === 'rolo' ? 'ROLO 360' : p.tipo === 'arte' ? 'ESTÚDIO' : q ? 'CITAÇÃO' : '';
    cartao(x, X0, Y0, CW, CH, -.018, c => {
      let y = PAD;
      avatar(c, im.av, a, PAD + 56, y + 56, 56);
      c.textAlign = 'left'; c.fillStyle = INK; c.font = `800 44px ${F.corpo}`; c.fillText(corta(c, a.nome || '', IW - 138 - 130), PAD + 138, y + 50);
      c.fillStyle = INK2; c.font = `500 31px ${F.mono}`; c.fillText(corta(c, '@' + (a.handle || ''), IW - 138 - 40), PAD + 138, y + 96);
      y += HEAD;
      if(tb){ y += G; escreve(c, tb, PAD, y, INK, AZUL); y += tb.h; }
      if(mid){
        y += G;
        c.save(); rr(c, PAD, y, IW, mid.h, 26); c.clip(); if(mid.im) cobre(c, mid.im, PAD, y, IW, mid.h); else { c.fillStyle = PAPEL2; c.fillRect(PAD, y, IW, mid.h); } c.restore();
        rr(c, PAD, y, IW, mid.h, 26); c.lineWidth = 4; c.strokeStyle = INK; c.stroke();
        if(!mid.im){ c.fillStyle = INK2; c.font = `600 28px ${F.mono}`; c.textAlign = 'center'; c.fillText('A FOTO TÁ LÁ NO CORRE', PAD + IW / 2, y + mid.h / 2 + 10); c.textAlign = 'left'; }
        if(mid.cred){ c.font = `500 21px ${F.mono}`; c.fillStyle = MUDO; c.fillText(corta(c, mid.cred, IW), PAD, y + mid.h + 28); }
        y += mid.h + mid.hc;
      }
      if(enq){
        y += G;
        enq.forEach((o, i) => {
          const yy = y + i * 92; rr(c, PAD, yy, IW, 78, 39); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 4; c.strokeStyle = INK; c.stroke();
          c.beginPath(); c.arc(PAD + 44, yy + 39, 13, 0, 6.2832); c.stroke();
          c.fillStyle = INK; c.font = `700 34px ${F.corpo}`; c.textAlign = 'left'; c.fillText(corta(c, o, IW - 110), PAD + 76, yy + 51);
        });
        y += enqH;
      }
      if(qb){
        y += G; const oa = q.perfil || {}, P = qb.P;
        rr(c, PAD, y, IW, qb.h, 26); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 3; c.strokeStyle = LINHA; c.stroke();
        let yy = y + P; avatar(c, im.qa, oa, PAD + P + 26, yy + 26, 26);
        c.textAlign = 'left'; c.fillStyle = INK; c.font = `800 30px ${F.corpo}`; const nm = corta(c, oa.nome || '', qb.IQ - 70 - 200); c.fillText(nm, PAD + P + 70, yy + 36);
        const wn = c.measureText(nm).width; c.fillStyle = MUDO; c.font = `500 24px ${F.mono}`; c.fillText(corta(c, '@' + (oa.handle || ''), qb.IQ - 70 - wn - 16), PAD + P + 70 + wn + 14, yy + 36);
        yy += 52;
        if(qb.tb){ yy += 14; escreve(c, qb.tb, PAD + P, yy, INK2, AZUL); yy += qb.tb.h; }
        if(qb.tm){ yy += 16; c.save(); rr(c, PAD + P, yy, qb.IQ, 230, 16); c.clip(); if(im.qm) cobre(c, im.qm, PAD + P, yy, qb.IQ, 230); else { c.fillStyle = PAPEL2; c.fillRect(PAD + P, yy, qb.IQ, 230); } c.restore(); }
        y += qb.h;
      }
      y += G;
      c.font = `500 26px ${F.mono}`; c.fillStyle = MUDO; c.textAlign = 'left'; c.fillText([dataCurta(p.created_at), tipo].filter(Boolean).join(' · '), PAD, y + 24);
      if(nums){ c.textAlign = 'right'; c.fillText(nums, CW - PAD, y + 24); }
    }, c => adesivoEm(c, im.adesivo, CW - 46, 12, 210, .2));
    chamada(x, t, enq ? 'VOTA LÁ NO CORRE' : 'RESPONDE LÁ NO CORRE', Y0 + CH + 16 + 90);
  }

  /* ---------- perfil ---------- */
  function desenhaPerfil(x, d, im, t){
    const p = d.p, CW = 900, X0 = (W - CW) / 2, PAD = 58, IW = CW - PAD * 2, BANDA = 280, R = 124;
    const nome = cabe(x, p.nome || '', IW, [est(900, 70, 78, F.disp, true), est(900, 58, 66, F.disp, true)], 78 * 2);
    const faz = p.faz ? cabe(x, p.faz, IW, [est(700, 44, 56), est(700, 38, 50)], 56 * 3) : null;
    const bio = p.bio ? cabe(x, p.bio, IW, [est(400, 34, 46)], 46 * (faz ? 2 : 3)) : null;
    const cat = C.meuCorre && p.categoria && p.categoria !== 'outros' ? C.meuCorre.catNome(p.categoria) : '';
    const tags = [p.aberto ? ['ABERTO PRA TRAMPO', 1] : null, p.cidade ? [String(p.cidade), 0] : null, cat ? [String(cat), 0] : null].filter(Boolean);
    x.font = `800 28px ${F.corpo}`;
    const filas = []; let fila = [], lw = 0;
    tags.forEach(([s, on]) => { const w = Math.min(IW, x.measureText(s).width + 48); if(fila.length && lw + 14 + w > IW){ filas.push({ fila, lw }); fila = []; lw = 0; } fila.push({ s, on, w }); lw += (fila.length > 1 ? 14 : 0) + w; });
    if(fila.length) filas.push({ fila, lw });
    let CH = BANDA + R + 30 + nome.h + 10 + 44;
    if(faz) CH += 26 + faz.h;
    if(bio) CH += 18 + bio.h;
    if(filas.length) CH += 30 + filas.length * 56 + (filas.length - 1) * 12;
    CH += PAD + 6;
    const Y0 = topoDoGrupo(CH);
    cartao(x, X0, Y0, CW, CH, .016, c => {
      if(im.capa) cobre(c, im.capa, 0, 0, CW, BANDA);
      else { c.fillStyle = INK; c.fillRect(0, 0, CW, BANDA); c.save(); c.globalAlpha = .16; c.fillStyle = '#fff'; c.beginPath(); for(let yy = 14, i = 0; yy < BANDA; yy += 28, i++) for(let xx = i % 2 ? 14 : 0; xx < CW; xx += 28){ c.moveTo(xx + 4.5, yy); c.arc(xx, yy, 4.5, 0, 6.2832); } c.fill(); c.restore(); }
      c.fillStyle = INK; c.fillRect(0, BANDA - 3, CW, 6);
      avatar(c, im.av, p, CW / 2, BANDA, R, 16);
      let y = BANDA + R + 30;
      escreve(c, nome, CW / 2, y, INK, null, true); y += nome.h + 10;
      c.font = `600 34px ${F.mono}`; c.fillStyle = INK2; c.textAlign = 'center'; c.fillText(corta(c, '@' + p.handle, IW), CW / 2, y + 34); y += 44;
      if(faz){ y += 26; escreve(c, faz, CW / 2, y, INK, null, true); y += faz.h; }
      if(bio){ y += 18; escreve(c, bio, CW / 2, y, INK2, null, true); y += bio.h; }
      if(filas.length){
        y += 30;
        filas.forEach(({ fila, lw }) => {
          let xx = CW / 2 - lw / 2;
          fila.forEach(({ s, on, w }) => {
            rr(c, xx, y, w, 56, 28); c.fillStyle = on ? AMARELO : PAPEL2; c.fill(); c.lineWidth = on ? 4 : 3; c.strokeStyle = on ? INK : LINHA; c.stroke();
            c.fillStyle = INK; c.font = `800 28px ${F.corpo}`; c.textAlign = 'center'; c.fillText(corta(c, s, w - 40), xx + w / 2, y + 38);
            xx += w + 14;
          });
          y += 68;
        });
      }
    }, c => adesivoEm(c, im.adesivo, CW - 46, 12, 210, .18));
    chamada(x, t, 'ME ACHA NO CORRE', Y0 + CH + 16 + 90);
  }

  /* ---------- story: tela cheia, como ele é no Corre ---------- */
  function desenhaStory(x, d, im){
    const s = d.s, p = d.perfil || {};
    let t = TEMA.escuro;
    if(im.midia){
      const [iw, ih] = nat(im.midia), ar = ih / iw;
      if(ar >= 1.45) cobre(x, im.midia, 0, 0, W, H);
      else { x.drawImage(borrado(im.midia), 0, 0, W, H); x.fillStyle = 'rgba(15,18,24,.3)'; x.fillRect(0, 0, W, H); const h = Math.round(W * ar); x.drawImage(im.midia, 0, Math.round((H - h) / 2) - 60, W, h); }
      let g = x.createLinearGradient(0, 0, 0, 470); g.addColorStop(0, 'rgba(10,12,16,.55)'); g.addColorStop(1, 'rgba(10,12,16,0)'); x.fillStyle = g; x.fillRect(0, 0, W, 470);
      g = x.createLinearGradient(0, 1120, 0, H); g.addColorStop(0, 'rgba(10,12,16,0)'); g.addColorStop(1, 'rgba(10,12,16,.84)'); x.fillStyle = g; x.fillRect(0, 1120, W, H - 1120);
      if(s.texto){
        const b = cabe(x, s.texto, 820, [est(700, 42, 54)], 54 * 4), bw = Math.min(900, Math.max(...b.ls.map(l => { x.font = b.e.font; return x.measureText(l).width; })) + 60), bh = b.h + 44, by = 1196 - bh;
        rr(x, (W - bw) / 2, by, bw, bh, 24); x.fillStyle = 'rgba(255,255,255,.94)'; x.fill();
        escreve(x, b, W / 2, by + 22, INK, AZUL, true);
      }
    }else{
      const cor = /^#[0-9a-f]{6}$/i.test(s.fundo || '') ? s.fundo : '#0F1218', claro = luz(cor) > .62;
      t = claro ? TEMA.claro : luz(cor) < .12 ? TEMA.escuro : TEMA.cor;
      x.fillStyle = cor; x.fillRect(0, 0, W, H); pontos(x, claro ? INK : '#fff', claro ? .08 : .1, 44, 4.5);
      const b = cabe(x, s.texto || '', 900, [96, 84, 72, 62, 54, 46].map(fs => est(900, fs, Math.round(fs * 1.13), F.disp, true)), 760);
      escreve(x, b, W / 2, Math.round(820 - b.h / 2), claro ? INK : '#fff', null, true);
    }
    /* o @ de quem postou, em adesivo, lá em cima */
    x.save(); x.font = `600 36px ${F.mono}`; const hd = corta(x, '@' + (p.handle || ''), 640), tw = x.measureText(hd).width, cw = 24 + 72 + 20 + tw + 36, cx0 = (W - cw) / 2, cy = 240;
    rr(x, cx0, cy + 6, cw, 96, 48); x.fillStyle = INK; x.fill();
    rr(x, cx0, cy, cw, 96, 48); x.fillStyle = '#fff'; x.fill(); x.lineWidth = 4; x.strokeStyle = INK; x.stroke();
    avatar(x, im.av, p, cx0 + 24 + 36, cy + 48, 36);
    x.fillStyle = INK; x.textAlign = 'left'; x.textBaseline = 'middle'; x.font = `600 36px ${F.mono}`; x.fillText(hd, cx0 + 24 + 72 + 20, cy + 50); x.restore();
    marca(x, t, 1356, 124);
    adesivoEm(x, im.adesivo, 236, 1392, 150, -.2);
    chamada(x, t, 'TEM MAIS NO CORRE', 1442);
  }

  /* ---------- imagens: CORS, cache e tempo limite (sem CORS a foto some e o resto continua) ---------- */
  const CACHE = new Map();
  function carrega(src){
    if(!src || !fotoOk(src)) return Promise.resolve(null);
    if(CACHE.has(src)) return CACHE.get(src);
    const uma = u => new Promise(ok => { const i = new Image(); let t = 0; const fim = v => { clearTimeout(t); ok(v); }; t = setTimeout(() => fim(null), 9000); if(!/^(data|blob):/.test(u)) i.crossOrigin = 'anonymous'; i.referrerPolicy = 'no-referrer'; i.onload = () => fim(i); i.onerror = () => fim(null); i.src = u; });
    /* a 2ª tentativa fura o cache (a resposta guardada pelo <img> da página pode ter vindo sem o cabeçalho de CORS) */
    const pr = uma(src).then(i => i || (/^https:/.test(src) ? uma(src + (src.includes('?') ? '&' : '?') + 'corre-ig=1') : null));
    CACHE.set(src, pr); pr.then(i => { if(!i) CACHE.delete(src); }); return pr;
  }
  const ADES = {};
  function adesivo(k){
    if(ADES[k]) return ADES[k];
    if(!ST) return Promise.resolve(null);
    let s = ST.svg(k); if(!s) return Promise.resolve(null);
    const defs = (ST.DEFS.match(/<defs>[\s\S]*<\/defs>/) || [''])[0], vb = /viewBox="0 0 (\d+) (\d+)"/.exec(s) || [0, 200, 200];
    s = s.replace(/^<svg /, `<svg xmlns="http://www.w3.org/2000/svg" width="${vb[1] * 3}" height="${vb[2] * 3}" `).replace(/^(<svg[^>]*>)/, '$1' + defs);
    return (ADES[k] = new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s); }));
  }
  async function imagens(kind, d){
    const out = {}, L = [], add = (k, src) => L.push(carrega(src).then(i => { out[k] = i; }));
    if(kind === 'post'){ add('av', (d.p.perfil || {}).avatar_url); add('midia', midiaDe(d.p)); if(d.orig && d.p.tipo === 'fortalece'){ add('qa', (d.orig.perfil || {}).avatar_url); add('qm', midiaDe(d.orig)); } }
    else if(kind === 'story'){ add('av', (d.perfil || {}).avatar_url); add('midia', d.s.midia_url); }
    else { add('av', d.p.avatar_url); add('capa', d.p.capa_url); }
    L.push(adesivo('monstra').then(i => { out.adesivo = i; }));
    await Promise.all(L); return out;
  }
  async function fontes(){
    if(!document.fonts || !document.fonts.load) return;
    const fs = [`italic 900 120px ${F.disp}`, `800 58px ${F.corpo}`, `700 48px ${F.corpo}`, `500 42px ${F.corpo}`, `400 34px ${F.corpo}`, `900 30px ${F.corpo}`, `600 34px ${F.mono}`, `500 26px ${F.mono}`];
    await Promise.race([Promise.all(fs.map(f => document.fonts.load(f).catch(() => null))), new Promise(r => setTimeout(r, 2500))]);
  }
  function desenha(x, kind, d, fd, im){
    x.textBaseline = 'alphabetic'; x.imageSmoothingQuality = 'high';
    if(kind === 'story') return desenhaStory(x, d, im);
    const foto = kind === 'post' ? im.midia : (im.capa || im.av);
    const t = fundo(x, fd, foto);
    marca(x, t, 336, 136);
    if(kind === 'perfil') desenhaPerfil(x, d, im, t); else desenhaPost(x, d, im, t);
  }
  const blob = cv => new Promise((ok, no) => { try{ cv.toBlob(b => b ? ok(b) : no(new Error('blob')), 'image/jpeg', .92); }catch(e){ no(e); } });
  /* a imagem pronta (File). Se uma foto de fora sujar o canvas, refaz sem o adesivo e, no fim, sem as fotos */
  async function gera(kind, d, fd){
    await fontes();
    const im = await imagens(kind, d);
    for(const sem of ['', 'adesivo', 'tudo']){
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const x = cv.getContext('2d');
      desenha(x, kind, d, fd, sem === 'tudo' ? {} : sem ? Object.assign({}, im, { adesivo: null }) : im);
      try{ const b = await blob(cv); const id = kind === 'perfil' ? d.p.handle : kind === 'story' ? d.s.id : d.p.id; return new File([b], `corre-story-${kind}-${String(id).replace(/[^\w.-]/g, '').slice(0, 40)}.jpg`, { type: 'image/jpeg' }); }
      catch(e){ /* tenta de novo, mais simples */ }
    }
    throw new Error('imagem');
  }

  /* ---------- a folha: prévia, fundo, compartilhar, baixar, copiar ---------- */
  const E = { kind: '', d: null, fundo: 'ceu', file: null, url: '', link: '', seq: 0 };
  const podeArquivo = () => { try{ return !!(navigator.share && navigator.canShare && navigator.canShare({ files: [new File([new Uint8Array(4)], 'corre.jpg', { type: 'image/jpeg' })] })); }catch(e){ return false; } };
  const lerFundo = () => { try{ return localStorage.getItem('corre-ig-fundo') || 'ceu'; }catch(e){ return 'ceu'; } };
  const fotoDoFundo = (kind, d) => kind === 'post' ? midiaDe(d.p) : kind === 'perfil' ? (d.p.capa_url || d.p.avatar_url || '') : '';
  /* cópia na hora do toque (síncrona): o compartilhar abre logo depois e tira o foco da página */
  function copiaJa(txt){
    let ok = false;
    try{
      const ta = document.createElement('textarea'); ta.value = txt; ta.setAttribute('readonly', ''); ta.setAttribute('aria-hidden', 'true');
      ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px;border:0;padding:0';
      document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, txt.length);
      ok = document.execCommand('copy'); ta.remove();
    }catch(e){ ok = false; }
    if(!ok){ try{ if(navigator.clipboard) navigator.clipboard.writeText(txt).catch(() => {}); }catch(e){} }
    return ok;
  }
  function baixa(file){
    const u = URL.createObjectURL(file), a = document.createElement('a'); a.href = u; a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 4000);
  }
  function abrir(kind, d){
    if(E.url){ URL.revokeObjectURL(E.url); E.url = ''; }
    E.kind = kind; E.d = d; E.file = null; E.link = linkDe(kind, d);
    const foto = fotoDoFundo(kind, d), temFoto = fotoOk(foto);
    let fd = lerFundo(); if(!FUNDOS.some(f => f[0] === fd) || (fd === 'foto' && !temFoto)) fd = 'ceu'; E.fundo = fd;
    const pode = podeArquivo(), me = C.st.me, publico = !!(me && me.visibilidade !== 'mocado');
    const alvo = kind === 'post' ? 'nesse post' : kind === 'story' ? 'no teu story' : 'no teu perfil';
    const meu = kind === 'post' ? !!(me && d.p.dono === me.id) : true;
    const aviso = meu && me && !publico ? `<p class="ig-aviso">Teu perfil tá <b>mocado</b>: quem tocar no link não vai ver nada. Põe na vitrine em <a href="#/editar">Editar perfil</a>.</p>`
      : kind === 'story' && Date.parse(d.s.expira_em) - Date.now() < 3 * 36e5 && !d.s.destaque_id ? `<p class="ig-aviso">Esse story sai do ar em menos de 3 horas. Destaca ele pra quem tocar no link ainda ver; se não, o link cai no teu perfil.</p>` : '';
    const sw = FUNDOS.filter(f => f[0] !== 'foto' || temFoto).map(([k, n]) => `<label class="cor ig-cor" title="${n}"><input type="radio" name="ig-f" value="${k}"${k === fd ? ' checked' : ''} aria-label="Fundo ${n}"><i class="ig-sw-${k}"${k === 'foto' ? ` style="background-image:url('${esc(String(foto).replace(/'/g, '%27').replace(/"/g, '%22').replace(/\\/g, '%5C'))}')"` : ''}></i></label>`).join('');
    const passos = pode
      ? `<li>Toca em <b>Compartilhar no Instagram</b> e escolhe <b>Story</b>.</li><li>No story, põe o sticker <b>Link</b> embaixo da seta e cola: o link já vai copiado.</li>`
      : `<li><b>Baixa a imagem</b> e manda pro teu celular.</li><li>No Instagram, posta no story e põe o sticker <b>Link</b> com o link do Corre (o botão <b>Copiar link</b> pega ele).</li>`;
    const panel = C.sheet(`<div class="form ig-sheet">
      <div class="sheet-head"><h2>${ico('ig')} Story do Instagram</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <div class="ig-wrap">
        <figure class="ig-prev" id="ig-prev" aria-live="polite"><span class="ig-load">Montando a imagem…</span></figure>
        <div class="ig-lado">
          ${kind !== 'story' ? `<fieldset class="ig-fundos"><legend class="mono">Fundo</legend><div class="cores">${sw}</div></fieldset>` : ''}
          ${aviso}
          <ol class="ig-passos">${passos}<li>Quem tocar cai direto ${alvo}, aqui no Corre.${publico ? ' E se entrar, já sai te seguindo.' : ''}</li></ol>
          <div class="ig-acts">${pode ? `<button type="button" class="btn pri" id="ig-share" disabled>${ico('ig')} Compartilhar no Instagram</button>` : ''}<button type="button" class="btn${pode ? '' : ' pri'}" id="ig-baixar" disabled>${ico('down')} Baixar imagem</button><button type="button" class="btn ghost" id="ig-copia">${ico('copy')} Copiar link</button></div>
        </div>
      </div></div>`, kind === 'story' ? 'over-story' : '');
    panel.addEventListener('change', e => { if(e.target.name !== 'ig-f') return; E.fundo = e.target.value; try{ localStorage.setItem('corre-ig-fundo', E.fundo); }catch(err){} pinta(); });
    const sh = C.$('ig-share');
    if(sh) sh.addEventListener('click', () => {
      if(!E.file){ C.toast('Só um segundo: a imagem tá terminando.'); return; }
      /* tudo no mesmo toque: copia, avisa e abre a folha do celular (se esperar qualquer coisa, o iPhone bloqueia) */
      const ok = copiaJa(E.link);
      C.toast(ok ? 'Link copiado. No story: sticker Link › colar.' : 'Depois toca em Copiar link pra pôr no sticker.', 6000);
      navigator.share({ files: [E.file] }).catch(err => { if(err && err.name === 'AbortError') return; baixa(E.file); C.toast('Não abriu o compartilhar: baixei a imagem. O link tá copiado.', 5000); });
    });
    C.$('ig-baixar').addEventListener('click', () => { if(!E.file) return; baixa(E.file); C.toast('Imagem baixada. Agora é postar no story e pôr o sticker Link.', 4200); });
    C.$('ig-copia').addEventListener('click', () => { if(copiaJa(E.link)) C.toast('Link copiado. Cola no sticker Link do story.', 3600); else C.copy(E.link, 'Link copiado. Cola no sticker Link do story.'); });
    pinta();
  }
  async function pinta(){
    const seq = ++E.seq, prev = C.$('ig-prev'); E.file = null;
    ['ig-share', 'ig-baixar'].forEach(id => { const b = C.$(id); if(b) b.disabled = true; });
    if(prev) prev.classList.add('carregando');
    try{
      const file = await gera(E.kind, E.d, E.fundo);
      if(seq !== E.seq) return;
      E.file = file; if(E.url) URL.revokeObjectURL(E.url); E.url = URL.createObjectURL(file);
      const pv = C.$('ig-prev'); if(!pv) return;
      pv.classList.remove('carregando');
      pv.innerHTML = `<img src="${E.url}" alt="Prévia do story: ${E.kind === 'post' ? 'o post' : E.kind === 'story' ? 'o teu story' : 'o teu perfil'} com a marca do Corre e uma seta pro sticker de link">`;
      ['ig-share', 'ig-baixar'].forEach(id => { const b = C.$(id); if(b) b.disabled = false; });
    }catch(e){
      if(seq !== E.seq) return;
      const pv = C.$('ig-prev'); if(pv){ pv.classList.remove('carregando'); pv.innerHTML = '<span class="ig-load">Não deu pra montar a imagem. Fecha e tenta de novo.</span>'; }
    }
  }

  Object.assign(C.acts, {
    'ig-story': el => {
      const k = el.dataset.k;
      if(k === 'post'){ const info = C.feed && C.feed.info ? C.feed.info(el.dataset.id) : null; if(!info){ C.toast('Esse post não tá mais aqui.'); return; } abrir('post', info); return; }
      if(k === 'story'){ const at = C.storyAtual ? C.storyAtual() : null; if(!at || !at.s) return; if(C.storyPausa) C.storyPausa(); abrir('story', { s: at.s, perfil: at.perfil }); return; }
      if(k === 'perfil'){ const me = C.st.me; if(!me) return; abrir('perfil', { p: me }); }
    },
    /* dentro do Instagram: o Google não deixa entrar. No Android abre o Chrome; no iPhone, o menu ••• */
    'cv-fora': () => {
      C.sheet(`<div class="form cv-fsheet"><div class="sheet-head"><h2>Abre no navegador</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
        <p class="note">O Instagram não deixa o Google entrar por dentro dele. No navegador você entra em segundos e cai de volta aqui.${convite() ? ` Conta nova já entra seguindo @${esc(convite().h)}.` : ''}</p>
        ${android() ? `<div class="acts"><a class="btn pri" href="${esc(intentUrl())}">${ico('ext')} Abrir no Chrome</a><button type="button" class="btn" data-act="cv-copia">${ico('copy')} Copiar o link</button></div>`
          : `<ol class="ig-passos"><li>Toca nos <b>•••</b> lá em cima.</li><li>Escolhe <b>Abrir no navegador</b>.</li></ol><div class="acts"><button type="button" class="btn pri" data-act="cv-copia">${ico('copy')} Copiar o link</button></div><p class="fine">Ou copia o link e cola no Safari.</p>`}</div>`);
    },
    'cv-copia': () => { if(copiaJa(linkAqui())) C.toast('Link copiado. Cola no navegador.'); else C.copy(linkAqui(), 'Link copiado. Cola no navegador.'); }
  });

  C.insta = { abrir, gera, linkDe, linkPerfil, convite, limpaConvite, segueQuemChamou, barra, botaoEntrar, dentroDeApp, abreStory, linkAqui, intentUrl, estado: () => E };
})();
