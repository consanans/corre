/* CORRE · núcleo: dados (Supabase de verdade, demonstração ou desligado), estado e utilidades.
   Os módulos (rolo, banca, grana, marcas, stories) se penduram em window.Corre. */
(function(){
  'use strict';
  const CFG = window.CORRE_CONFIG || {};
  const LIVE = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY);
  /* simulação completa só na prévia (claude.ai) ou com ?demo no endereço */
  const DEMO = !LIVE && (/claude/.test(location.hostname) || /[?&]demo\b/.test(location.search));
  /* v3.20: dentro do balcão de uma barraca do Correverso (iframe com ?embed) o app mostra só a página da barraca */
  const EMBED = /[?&]embed\b/.test(location.search) && window.parent !== window;
  if(EMBED) document.documentElement.classList.add('embed');
  const C = window.Corre = { CFG, LIVE, DEMO, EMBED, views: {}, acts: {}, home: [], st: { user: null, me: null, loadedFor: null } };
  /* recado pra cidade em volta (pronto, rota, fechar). Só vai pra mesma origem */
  C.pai = (t, x) => { if(!EMBED) return; try{ window.parent.postMessage(Object.assign({ corre: 'balcao', t, h: location.hash }, x || {}), location.origin); }catch(e){} };

  /* ---------------- utilidades ---------------- */
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const rid = () => (crypto.randomUUID ? crypto.randomUUID() : 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
  function hash(str){ let h = 2166136261; for(let i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed){ let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function shuffle(arr, seed){ const a = arr.slice(), r = rng(seed); for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  /* "esconder valores": cada algarismo vira uma bolinha, então a quantidade de algarismos continua a mesma */
  const OCULTO = { on: false };
  try{ OCULTO.on = localStorage.getItem('corre-oculto') === '1'; }catch(e){}
  const money = v => { const s = BRL.format(Number(v) || 0); return OCULTO.on ? s.replace(/\d/g, '•') : s; };
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const MESES_L = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  /* "hoje" no fuso de Brasília, como AAAA-MM-DD */
  const hojeBR = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d || new Date());
  const ddmm = iso => { const [y, m, d] = String(iso).slice(0, 10).split('-'); return `${d}/${m}`; };
  function rel(iso){
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if(s < 60) return 'agora'; if(s < 3600) return Math.floor(s / 60) + ' min';
    if(s < 86400) return Math.floor(s / 3600) + ' h'; if(s < 86400 * 7) return Math.floor(s / 86400) + ' d';
    const d = new Date(iso); return isNaN(d) ? '' : ddmm(hojeBR(d));
  }

  let toastT = 0;
  /* v3.63: o aviso de cima entra deslizando, mostra o tempo que falta numa linha embaixo e some com um toque
     (o Thales: "acabamento horrível"; antes era uma pílula que, com texto comprido, virava um oval). "♪ " na frente
     ganha o ícone da música */
  function toast(msg, ms){
    const t = $('toast'); if(!t) return;
    ms = ms || 2800;
    let txt = String(msg == null ? '' : msg), ic = '';
    if(/^♪\s*/.test(txt)){ txt = txt.replace(/^♪\s*/, ''); ic = 'musica'; }
    t.innerHTML = `${ic ? `<span class="toast-i">${ico(ic)}</span>` : ''}<span class="toast-tx"></span><i class="toast-t" style="animation-duration:${ms}ms" aria-hidden="true"></i>`;
    t.querySelector('.toast-tx').textContent = txt;
    if(!t.dataset.toque){ t.dataset.toque = '1'; t.addEventListener('click', fechaToast); }
    t.classList.remove('on'); t.hidden = false; void t.offsetWidth; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(fechaToast, ms);
  }
  function fechaToast(){ const t = $('toast'); if(!t) return; t.classList.remove('on'); clearTimeout(toastT); toastT = setTimeout(() => { if(!t.classList.contains('on')) t.hidden = true; }, 220); }
  function copy(text, ok){
    try{ const pr = navigator.clipboard && navigator.clipboard.writeText(text); if(!pr) throw 0; pr.then(() => toast(ok), () => toast(text, 6000)); }
    catch(e){ toast(text, 6000); }
  }
  const initials = n => (String(n || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('') || '?').toUpperCase();
  const avatar = (p, size, ring) => `<span class="av ${size || ''}${ring ? ' ring' : ''}${p && p.aberto ? ' trampo' : ''}"${p && p.aberto ? ' title="Aberto pra trampo"' : ''}>${p && p.avatar_url ? `<img src="${esc(p.avatar_url)}" alt="" referrerpolicy="no-referrer" loading="lazy">` : esc(initials(p && p.nome))}</span>`;
  const firstName = n => String(n || '').trim().split(/\s+/)[0] || 'você';
  const profileUrl = h => location.origin + location.pathname + '#/@' + h;

  const I = {
    houzi: '<circle cx="12" cy="5.2" r="1.9"/><path d="M11 7l-5.5 14M13 7l5.5 14M8 15.5h8"/>',
    cel: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.2"/><path d="M10.5 18.5h3"/>',
    vistas: '<path d="M4 20V13M9.3 20V8M14.7 20v-9M20 20V4"/>',
    enquete: '<path d="M4 6.5h9M4 12h13M4 17.5h6"/><circle cx="18.5" cy="6.5" r="1.4" fill="currentColor"/><circle cx="14.5" cy="17.5" r="1.4" fill="currentColor"/>',
    fio: '<circle cx="6" cy="5.5" r="2.2"/><circle cx="6" cy="18.5" r="2.2"/><path d="M6 7.7v8.6M11 5.5h8M11 18.5h8M11 12h6"/>',
    rolo: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.5"/><path d="M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4"/>',
    verso: '<path d="M3 20.5h18"/><path d="M4.5 20.5v-8l4.5-3.5 4.5 3.5v8"/><path d="M13.5 20.5v-6.5h6v6.5"/><path d="M15.5 14V9.5l2-1.5 2 1.5V14"/><path d="M8 20.5v-3.5h2v3.5"/>',
    manual: '<path d="M4 5.5c2.8-1 5.6-1 8 .8 2.4-1.8 5.2-1.8 8-.8v13c-2.8-1-5.6-1-8 .8-2.4-1.8-5.2-1.8-8-.8z"/><path d="M12 6.3v13M7 9.5h2.5M7 12.5h2.5M14.5 9.5H17M14.5 12.5H17"/>',
    mic: '<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"/>',
    micoff: '<path d="M15 10V6.5a3 3 0 0 0-5.6-1.5M9 9v2.5a3 3 0 0 0 4.7 2.5M5.5 11.5a6.5 6.5 0 0 0 10.4 5.2M18.5 11.5a6.4 6.4 0 0 1-.6 2.7M12 18v3M4 4l16 16"/>',
    gente: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19.5c.6-3.3 2.8-5 5.5-5s4.9 1.7 5.5 5"/><circle cx="16.8" cy="9.2" r="2.5"/><path d="M15.6 14.6c2.6-.3 4.5 1.3 5 4.4"/>',
    banca: '<path d="M4 5.5h13v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M17 9h3v9.5a2 2 0 0 1-2 2"/><path d="M7.5 9h6M7.5 12.5h6M7.5 16h4"/>',
    grana: '<path d="M3.5 7.5h17v11h-17z"/><circle cx="12" cy="13" r="2.6"/><path d="M6 4.5h12"/>',
    marcas: '<rect x="3.5" y="7" width="17" height="12.5" rx="2"/><path d="M9 7V5h6v2M3.5 12.5h17"/>',
    home: '<path d="M4 11.5 12 4.5l8 7"/><path d="M6.5 10v9.5h11V10"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    prev: '<path d="m15 5-7 7 7 7"/>', next: '<path d="m9 5 7 7-7 7"/>',
    musica: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z"/>', pause: '<path d="M9 5v14M15 5v14"/>', tela: '<path d="M3 4h18M4.5 4v10.5h15V4M12 14.5V18M8.5 21l3.5-3 3.5 3"/>',
    save: '<path d="M7 4.5h10v15l-5-3.5-5 3.5z"/>',
    ext: '<path d="M14 4.5h5.5V10M19.5 4.5 11 13M17 14v5.5H4.5V7H10"/>',
    edit: '<path d="M4.5 19.5h4l10-10-4-4-10 10z"/><path d="M13 7l4 4"/>',
    trash: '<path d="M5 7h14M10 7V4.5h4V7M7 7l1 12.5h8L17 7"/>',
    up: '<path d="M12 16V5M7 9.5 12 4.5l5 5"/><path d="M5 19.5h14"/>',
    ig: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="1" fill="currentColor"/>',
    lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    star: '<path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z"/>',
    camera: '<path d="M4 8h3.5L9 5.5h6L16.5 8H20v11H4z"/><circle cx="12" cy="13.2" r="3.4"/>',
    img: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="m20.5 16-5-5-8 8.5"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
    down: '<path d="M12 4v11M7 10.5l5 5 5-5"/><path d="M5 19.5h14"/>',
    magia: '<path d="M10.5 3.5 12.2 8l4.5 1.7-4.5 1.7-1.7 4.5-1.7-4.5L4.3 9.7 8.8 8z"/><path d="M17.5 13.5l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9z"/>',
    eu: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c.8-3.9 3.8-6 7.5-6s6.7 2.1 7.5 6"/>',
    raio: '<path d="M13.5 3 5.5 13.5h6L10.5 21l8-10.5h-6z"/>',
    fogo: '<path d="M12 21c-3.6 0-6.5-2.6-6.5-6.2 0-3.3 2.4-5.2 3.6-7.8.5 1.7 1.5 2.8 2.6 3.4-.2-2.7 1-5.3 3.3-7.4.1 3.2 1.4 5 2.8 6.8 1 1.3 1.7 2.8 1.7 4.9 0 3.7-3 6.3-7.5 6.3z"/><path d="M12 21c-1.6 0-2.8-1.1-2.8-2.7 0-1.8 1.4-2.6 2.1-4.1.9 1.1 3.5 2.2 3.5 4.3 0 1.4-1.2 2.5-2.8 2.5z"/>',
    heart: '<path d="M12 19.5s-7.5-4.4-7.5-9.6A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7.5 2.3c0 5.2-7.5 9.6-7.5 9.6z"/>',
    chat: '<path d="M4.5 5.5h15v10h-8l-4 3.5v-3.5h-3z"/>',
    film: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M7.5 5v14M16.5 5v14M3.5 9.5h4M3.5 14.5h4M16.5 9.5h4M16.5 14.5h4"/>',
    share: '<circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="M8.3 10.8l7.4-4.4M8.3 13.2l7.4 4.4"/>',
    send: '<path d="M4.5 12 20 4.5 15 19.5l-3.5-6z"/><path d="m11.5 13.5 8.5-9"/>',
    dots: '<circle cx="6" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="18" cy="12" r="1.3" fill="currentColor"/>',
    bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>',
    recibo: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    marcador: '<path d="M7 3.5h10v17l-5-4-5 4z"/>',
    cartao: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>',
    calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h2M12 12h0M14 12h2M8 16h2M12 16h0M14 16h2"/>',
    tacha: '<path d="M9 3.5h6"/><path d="M10 3.5v5.2L7 12h10l-3-3.3V3.5"/><path d="M12 12v8.5"/>',
    pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    mapa: '<path d="M3 6.5l6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
    troca: '<path d="M4 8h13"/><path d="M14 4.5L17.5 8 14 11.5"/><path d="M20 16H7"/><path d="M10 12.5L6.5 16 10 19.5"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    wa: '<path d="M4.5 19.5l1.2-3.6A8 8 0 1 1 8.4 18.6z"/><path d="M9.2 8.6c.3 2.9 2.4 5 5.3 5.6l1.1-1.3-1.8-.9-.8.8c-1-.4-1.9-1.3-2.3-2.3l.8-.8-.9-1.8z"/>',
    eyeoff: '<path d="M4 4l16 16"/><path d="M9.9 5.7A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3.2 3.9M6.4 7.6A16.6 16.6 0 0 0 2.5 12S6 18.5 12 18.5a9.3 9.3 0 0 0 4.3-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    som: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    mudo: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>',
    correal: '<circle cx="12" cy="12" r="8.5"/><path d="M15.3 9.4a3.8 3.8 0 1 0 0 5.2"/><path d="M12.6 6.4v2M12.6 15.6v2"/>',
    /* v3.40: a garagem (veículos) e o avião do Correverso */
    carro: '<path d="M3.5 16.5v-4.2l2.1-4.4a2 2 0 0 1 1.8-1.1h9.2a2 2 0 0 1 1.8 1.1l2.1 4.4v4.2z"/><path d="M3.5 12.3h17"/><circle cx="7.5" cy="16.8" r="1.7"/><circle cx="16.5" cy="16.8" r="1.7"/>',
    aviao: '<path d="M12 2.8c.9 0 1.5 1 1.5 2.4v4.9l7.2 4v2l-7.2-2.1v4.2l2.1 1.6v1.6L12 20.3l-3.6 1.1v-1.6l2.1-1.6V14L3.3 16.1v-2l7.2-4V5.2c0-1.4.6-2.4 1.5-2.4z"/>',
    buzina: '<path d="M3.5 10h3l7-4.5v13l-7-4.5h-3z"/><path d="M17 9.5l2.5-1.5M17.5 12h3M17 14.5l2.5 1.5"/>',
    /* v3.43: os grupos do menu têm ícone próprio (o frasco do Laboratório e a banca com toldo), pra não repetir o de
       um item de dentro quando o menu é só ícone */
    lab: '<path d="M9.5 3.5h5"/><path d="M10.5 3.5v5.4L5.2 18.2a1.6 1.6 0 0 0 1.4 2.3h10.8a1.6 1.6 0 0 0 1.4-2.3L13.5 8.9V3.5"/><path d="M7.6 14.5h8.8"/>',
    toldo: '<path d="M3.5 9 5.2 4.5h13.6L20.5 9"/><path d="M3.5 9a2.83 2.83 0 0 0 5.67 0 2.83 2.83 0 0 0 5.66 0 2.83 2.83 0 0 0 5.67 0"/><path d="M5 11.6v8.9h14v-8.9"/><path d="M10 20.5v-5h4v5"/>',
    /* v3.49 · o peixe do Torneio de Pesca do Igapó */
    peixe: '<path d="M3 12c3.2-4.6 9.2-5.4 13.8-1.2L21 8v8l-4.2-2.8C12.2 17.4 6.2 16.6 3 12z"/><circle cx="8" cy="11.2" r=".9"/>',
    /* v3.65 · a lupa da busca */
    lupa: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20.5 20.5-5.4-5.4"/>'
  };
  const ico = (k, cls) => `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[k] || ''}</svg>`;

  /* imagem: corta/encolhe no navegador antes de subir (story até 1080x1920, logo e foto quadradas) */
  function loadImg(file){
    return new Promise((ok, fail) => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => ok({ im, u }); im.onerror = () => { URL.revokeObjectURL(u); fail({ code: 'decode' }); }; im.src = u; });
  }
  /* square: corta quadrado; ou um número = proporção largura/altura (a capa usa 3) */
  async function shrink(file, max, q, square){
    if(!file || (file.type && !/^image\//.test(file.type))) throw { code: 'tipo' };
    const { im, u } = await loadImg(file);
    try{
      let sw = im.naturalWidth, sh = im.naturalHeight, sx = 0, sy = 0;
      const a = square === true ? 1 : Number(square) || 0;
      if(a){ if(sw / sh > a){ const nw = sh * a; sx = (sw - nw) / 2; sw = nw; } else { const nh = sw / a; sy = (sh - nh) / 2; sh = nh; } }
      const k = Math.min(1, max / Math.max(sw, sh)), w = Math.round(sw * k), h = Math.round(sh * k);
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h); cx.drawImage(im, sx, sy, sw, sh, 0, 0, w, h);
      return await new Promise((ok, fail) => cv.toBlob(b => b ? ok(b) : fail({ code: 'blob' }), 'image/jpeg', q || .84));
    } finally { URL.revokeObjectURL(u); }
  }
  /* o input fica na página até escolher: no celular (Safari e alguns Android) um input solto às vezes nem avisa que a foto foi escolhida */
  const pickFile = accept => new Promise(ok => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = accept || 'image/*';
    i.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0';
    let feito = false; const fim = f => { if(feito) return; feito = true; i.remove(); ok(f || null); };
    i.addEventListener('change', () => fim(i.files && i.files[0]));
    i.addEventListener('cancel', () => fim(null));
    document.body.appendChild(i); i.click();
  });

  /* folha (modal) reaproveitável */
  let lastFocus = null;
  function sheet(html, cls){
    const sh = $('sheet'); lastFocus = document.activeElement;
    sh.className = 'sheet' + (cls ? ' ' + cls : '');
    sh.innerHTML = `<div class="scrim" data-close></div><div class="panel" role="dialog" aria-modal="true">${html}</div>`;
    sh.hidden = false; document.body.classList.add('locked');
    const f = sh.querySelector('[autofocus], .panel button, .panel input'); if(f) setTimeout(() => f.focus(), 30);
    return sh.querySelector('.panel');
  }
  function closeSheet(){ const sh = $('sheet'); if(!sh || sh.hidden) return; sh.hidden = true; sh.innerHTML = ''; const st = $('story'); if(!st || st.hidden) document.body.classList.remove('locked'); if(lastFocus && lastFocus.focus) try{ lastFocus.focus(); }catch(e){} if(C.onSheetClose) C.onSheetClose(); }

  /* v3.38 · CORREAL: os preços da IA em correal (os mesmos do banco; quem manda é o banco) */
  /* v3.40: o voo do Aeroporto de Londrina (Correverso) também sai em correal */
  /* v3.43: o correal tem centavos (delta-v343.sql). Os preços caíram na mesma conta da carteira (divididos por 10) e
     nenhum passa de 1. Estes são só a reserva pra quando o banco não responder: o que vale é o corre_correal_meu.
     v3.45 (delta-v345.sql): caíram 10 vezes de novo, porque o Thales quer que 1 correal renda meio dia de trabalho */
  const CORREAL_PRECO = { imagem: 0.10, legenda: 0.02, abordagem: 0.02, marca: 0.03, voo: 0.05 };
  /* quanto vale um ponto de tarefa e o máximo que a tarefa paga por dia (corre_correal_ponto e corre_correal_teto) */
  const CORREAL_PONTO = 0.03, CORREAL_TETO = 1.00;
  /* toda conta de correal é em centavos inteiros: em número quebrado, 0,1 + 0,2 dá 0,30000000000000004 e 0,90 - 0,20
     dá 0,7000000000000001; em centavos, 10 + 20 dá 30 e 90 - 20 dá 70. O banco guarda numeric(12,2), que é isso */
  const centDe = v => { const n = Number(v); return isFinite(n) ? Math.round(n * 100) : 0; };
  /* erros do banco em português de gente */
  function errMsg(e, fallback){
    const m = (e && (e.message || '')) + ' ' + (e && (e.hint || ''));
    if(e && e.code === 'off') return 'O Corre ainda não tá ligado neste endereço.';
    if(/plano_gratis/.test(m)) return 'Chegou no limite de redes sociais do teu plano.';
    /* v3.60: acabou o teste grátis (o banco diz no hint; a função imagem, no código) */
    if(/horus_assinatura/.test(m) || (e && e.code === 'horus_assinatura')) return 'O teste grátis do Hórus acabou. Assina em Planos (R$ 9,90 por mês) pra seguir caçando; os leads que você tem continuam aqui.';
    if(/assinatura_ativa/.test(m)) return 'Tem plano pago rodando. Cancela em Financeiro › Planos antes de apagar o perfil.';
    if(/houzi_assinatura/.test(m) || (e && e.code === 'houzi_assinatura')) return 'O teste grátis do Studio Houzi acabou. Assina em Planos (R$ 29,90 por mês) pra criar e mexer nas marcas; as que você fez continuam aqui.';
    if(/limite de (\d+)/.test(m)) return `Chegou no limite (${RegExp.$1}).`;
    if(e && e.code === '23505') return 'Isso já tá aqui.';
    if(/quota|QuotaExceeded/i.test(m) || (e && e.name === 'QuotaExceededError')) return 'Sem espaço neste navegador pra mais imagens.';
    if(/Payload too large|exceeded the maximum/i.test(m)) return 'Imagem grande demais.';
    if(e && e.code === 'tipo') return 'Esse arquivo não é uma foto.';
    if(e && e.code === 'decode') return 'Não deu pra abrir essa foto aqui. Tenta uma em JPG ou PNG.';
    /* código do erro no fim ajuda a achar o problema sem abrir o console */
    const cod = e && (e.code || e.status) ? ` (${e.code || e.status})` : '';
    if(/permission denied/i.test(m)) return 'O banco do Corre ainda não liberou esse acesso.' + cod;
    return (fallback || 'Não deu agora. Tenta de novo.') + cod;
  }

  /* ---------------- dados: Supabase ---------------- */
  function liveApi(){
    let sb = null, uid = null;
    /* supabase-js com a versão travada: o navegador guarda o arquivo de vez, e o index já começa a baixar ele cedo
       (antes era "@2": cada abertura perguntava qual era a versão mais nova, e uma versão nova podia mudar o app sozinha) */
    const SB_LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/dist/umd/supabase.js';
    const loadLib = () => new Promise((ok, fail) => {
      if(window.supabase && window.supabase.createClient) return ok();
      const s = document.createElement('script');
      s.src = SB_LIB;
      s.onload = ok; s.onerror = () => fail(new Error('lib'));
      document.head.appendChild(s);
    });
    /* v3.38: o login pelo botão do próprio Google (Google Identity Services). A janela do Google mostra o endereço do
       Corre, e não o do Supabase. Precisa do GOOGLE_CLIENT_ID no config.js (o mesmo cliente que tá no Supabase, em
       Authentication > Providers > Google) e do endereço do site nas "Origens JavaScript autorizadas" desse cliente no
       Google Cloud. Sem isso (ou se o Google não carregar), fica o login de antes. */
    const GSI = 'https://accounts.google.com/gsi/client';
    let gsiP = null;
    const temGsi = () => !!(window.google && window.google.accounts && window.google.accounts.id);
    const carregaGsi = () => gsiP || (gsiP = new Promise((ok, falha) => {
      if(temGsi()) return ok();
      const s = document.createElement('script'); s.src = GSI; s.async = true;
      const erro = () => { gsiP = null; falha(new Error('gsi')); };
      const t = setTimeout(erro, 9000);
      s.onload = () => { clearTimeout(t); if(temGsi()) ok(); else erro(); };
      s.onerror = () => { clearTimeout(t); erro(); };
      document.head.appendChild(s);
    }));
    const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
    const need = r => { if(r.error) throw r.error; return r.data; };
    /* !dono: feed e stories também se ligam ao perfil pelas curtidas e comentários; sem a dica o PostgREST não sabe qual caminho usar (PGRST201) */
    const JOIN = { perfil: 'perfil:corre_perfis!dono!inner(id,handle,nome,avatar_url,aberto)' };
    function build(t, o){
      let q = sb.from(t).select(o.select || (o.join ? '*, ' + JOIN[o.join] : '*'));
      const ops = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'ilike'];
      ops.forEach(op => Object.entries(o[op] || {}).forEach(([k, v]) => { q = q[op](k, v); }));
      Object.entries(o.is || {}).forEach(([k, v]) => { q = q.is(k, v); });
      if(o.order) q = q.order(o.order[0], { ascending: !!o.order[1] });
      if(o.limit) q = q.limit(o.limit);
      return q;
    }
    const match = (q, m) => { Object.entries(m).forEach(([k, v]) => { q = q.eq(k, v); }); return q; };
    /* leitura repetida em pouco tempo sai da memória: voltar pra uma tela abre na hora. Qualquer escrita (ou troca
       de conta) limpa tudo, e duas telas pedindo a mesma coisa ao mesmo tempo dividem o mesmo pedido */
    const CACHE = new Map(), CACHE_MS = 15e3; let geracao = 0;
    const LEITURA = new Set(['corre_vitrine', 'corre_enquetes', 'corre_verso_cidade', 'corre_seguidores_n', 'corre_seguidores_lista', 'corre_quem_faz', 'corre_pra_voce', 'corre_grana_publica', 'corre_em_alta', 'corre_mural_lista', 'corre_mural_candidatos',
      'corre_grupo_ver', 'corre_grupos_lista', 'corre_grupos_de', 'corre_grupo_membros_lista']);
    /* chamadas que não mudam nada que a tela leia (ou que precisam vir sempre fresquinhas): não usam nem limpam a memória */
    const AO_VIVO = new Set(['corre_feed_viu', 'corre_verso_sinal', 'corre_verso_entrar', 'corre_verso_quem', 'corre_handle_livre', 'corre_avisos_n', 'corre_avisos',
      'corre_msg_abrir', 'corre_msg_enviar', 'corre_msg_caixa', 'corre_msg_lista', 'corre_msg_lida', 'corre_msg_estado', 'corre_msg_apagar', 'corre_msg_badge', 'corre_grupo_papo', 'corre_meu_acesso']);
    const copia = v => { if(v == null || typeof v !== 'object') return v; try{ return structuredClone(v); }catch(e){ return JSON.parse(JSON.stringify(v)); } };
    const limpa = () => { geracao++; CACHE.clear(); };
    function lido(chave, faz){
      chave = (uid || '-') + '|' + chave;
      const c = CACHE.get(chave);
      if(c && c.p) return c.p.then(copia);
      if(c && Date.now() - c.t < CACHE_MS) return Promise.resolve(copia(c.v));
      const g = geracao;
      const p = faz().then(v => { const e = CACHE.get(chave); if(g === geracao) CACHE.set(chave, { t: Date.now(), v }); else if(e && e.p === p) CACHE.delete(chave); return v; },
        er => { const e = CACHE.get(chave); if(e && e.p === p) CACHE.delete(chave); throw er; });
      CACHE.set(chave, { p });
      return p.then(copia);
    }
    const escreve = async f => { limpa(); try{ return await f(); }finally{ limpa(); } };
    return {
      async init(){
        await loadLib();
        sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: true, autoRefreshToken: true } });
        const { data } = await sb.auth.getSession();
        const u = data.session ? data.session.user : null; uid = u && u.id; return u;
      },
      onAuth(cb){ sb.auth.onAuthStateChange((ev, s) => { const novo = s && s.user ? s.user.id : null; if(novo !== uid) limpa(); uid = novo; cb(s ? s.user : null, ev); }); },
      /* v3.44: login("apple") entra pela Apple (o Supabase precisa do provedor Apple ligado; no site, CFG.APPLE_LOGIN) */
      async login(prov){
        const apple = prov === 'apple';
        const r = await sb.auth.signInWithOAuth({ provider: apple ? 'apple' : 'google', options: Object.assign({ redirectTo: location.origin + location.pathname }, apple ? {} : { queryParams: { prompt: 'select_account' } }) });
        if(r.error) throw r.error;
      },
      /* desenha o botão do Google em "alvo". o.entrando: tocou e escolheu a conta; o.falhou(erro): não entrou.
         Cada desenho leva um nonce novo (o Supabase confere o hash dele dentro do token do Google). */
      googleLigado(){ return !!CFG.GOOGLE_CLIENT_ID && !!(window.crypto && crypto.subtle); },
      async googleBotao(alvo, o){
        if(!CFG.GOOGLE_CLIENT_ID || !alvo || !(window.crypto && crypto.subtle)) return false;
        await carregaGsi();
        o = o || {};
        const cru = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
        const nonce = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(cru)));
        window.google.accounts.id.initialize({ client_id: CFG.GOOGLE_CLIENT_ID, nonce, ux_mode: 'popup', auto_select: false, context: 'signin', itp_support: true,
          callback: async r => {
            if(o.entrando) o.entrando();
            try{ const x = await sb.auth.signInWithIdToken({ provider: 'google', token: r && r.credential, nonce: cru }); if(x.error) throw x.error; }
            catch(e){ if(o.falhou) o.falhou(e); }
          } });
        alvo.innerHTML = '';
        window.google.accounts.id.renderButton(alvo, { type: 'standard', theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', logo_alignment: 'left',
          width: Math.max(220, Math.min(400, Math.round(alvo.getBoundingClientRect().width || 320))), locale: 'pt-BR' });
        return true;
      },
      async logout(){ limpa(); try{ if(temGsi()) window.google.accounts.id.disableAutoSelect(); }catch(e){} await sb.auth.signOut(); uid = null; limpa(); },
      async q(t, o){ return lido('q:' + t + ':' + JSON.stringify(o || {}), async () => need(await build(t, o || {})) || []); },
      async one(t, o){ return lido('1:' + t + ':' + JSON.stringify(o || {}), async () => need(await build(t, o || {}).maybeSingle())); },
      async ins(t, row){ return escreve(async () => need(await sb.from(t).insert(row).select()) || []); },
      async upsert(t, rows, onConflict, ignore){ return escreve(async () => need(await sb.from(t).upsert(rows, { onConflict, ignoreDuplicates: !!ignore }).select()) || []); },
      async upd(t, m, patch){ return escreve(async () => need(await match(sb.from(t).update(patch), m).select()) || []); },
      async del(t, m){ return escreve(async () => { need(await match(sb.from(t).delete(), m)); }); },
      async rpc(n, a){
        if(LEITURA.has(n)) return lido('r:' + n + ':' + JSON.stringify(a || {}), async () => need(await sb.rpc(n, a)));
        if(AO_VIVO.has(n)) return need(await sb.rpc(n, a));
        return escreve(async () => need(await sb.rpc(n, a)));
      },
      esquece: limpa,
      /* Correverso: canal de tempo real (presença e broadcast) */
      canal(n, cfg){ return sb.channel(n, cfg); },
      /* devolve a promessa: quem vai abrir o mesmo canal de novo espera o velho fechar */
      semCanal(ch){ try{ return Promise.resolve(sb.removeChannel(ch)).catch(() => {}); }catch(e){ return Promise.resolve(); } },
      canais(){ try{ return sb.getChannels() || []; }catch(e){ return []; } },
      /* Mensagens: mensagem nova chega pelo banco (só pra quem pode ler); digitando, visto e "aqui agora" vão pela sala
         da conversa; a foto vai num balde privado e abre por link assinado (1 h) */
      msg: {
        ouve(cb){
          if(!uid) return () => {};
          const ch = sb.channel('msg-u-' + uid + '-' + Math.random().toString(36).slice(2, 8));
          ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'corre_mensagens' }, p => cb('ins', p.new))
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'corre_mensagens' }, p => cb('upd', p.new))
            .subscribe();
          return () => { try{ return Promise.resolve(sb.removeChannel(ch)).catch(() => {}); }catch(e){ return Promise.resolve(); } };
        },
        sala(id, h){
          const ch = sb.channel('msg-c-' + id, { config: { broadcast: { self: false, ack: false }, presence: { key: uid || 'x' } } });
          ch.on('broadcast', { event: 'dig' }, m => { if(h.dig) h.dig(m.payload || {}); })
            .on('broadcast', { event: 'li' }, m => { if(h.li) h.li(m.payload || {}); })
            .on('presence', { event: 'sync' }, () => { try{ if(h.aqui) h.aqui(Object.keys(ch.presenceState())); }catch(e){} })
            .subscribe(st => { if(st === 'SUBSCRIBED') Promise.resolve(ch.track({ em: Date.now() })).catch(() => {}); });
          return {
            envia(ev, payload){ try{ Promise.resolve(ch.send({ type: 'broadcast', event: ev, payload: Object.assign({ u: uid }, payload || {}) })).catch(() => {}); }catch(e){} },
            sai(){ try{ ch.untrack(); }catch(e){} try{ return Promise.resolve(sb.removeChannel(ch)).catch(() => {}); }catch(e){ return Promise.resolve(); } }
          };
        },
        async sobe(blob, conversa){
          const path = `${conversa}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}.jpg`;
          need(await sb.storage.from('corre-msg').upload(path, blob, { contentType: 'image/jpeg', upsert: false }));
          return path;
        },
        async assina(paths){
          const out = {}; if(!paths.length) return out;
          const r = need(await sb.storage.from('corre-msg').createSignedUrls(paths, 3600)) || [];
          r.forEach(x => { if(x && x.signedUrl && x.path) out[x.path] = x.signedUrl; });
          return out;
        },
        async tira(path){ try{ await sb.storage.from('corre-msg').remove([path]); }catch(e){} }
      },
      async upload(blob){
        const path = `${uid}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        need(await sb.storage.from('corre').upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: false, cacheControl: '31536000' }));
        return sb.storage.from('corre').getPublicUrl(path).data.publicUrl;
      },
      async unlink(url){ const m = /\/object\/public\/corre\/(.+)$/.exec(url || ''); if(m) try{ await sb.storage.from('corre').remove([decodeURIComponent(m[1])]); }catch(e){} limpa(); },
      /* CORRE_CONFIG.FUNCOES troca o endereço de uma função (ex.: { mural: 'swift-api' }, quando o painel do Supabase
         criou a função com outro nome). Se o endereço trocado não existir (404), tenta o nome de sempre.
         "fica": a função não grava nada que o app leia (os avisos no celular), então a memória não precisa sair. */
      async fn(name, body, fica){
        const alt = CFG.FUNCOES && typeof CFG.FUNCOES[name] === 'string' && /^[a-z0-9_-]{2,60}$/i.test(CFG.FUNCOES[name]) ? CFG.FUNCOES[name] : '';
        const nomes = alt && alt !== name ? [alt, name] : [name];
        let erro = null;
        for(const n of nomes){
          const r = await sb.functions.invoke(n, { body });
          /* a função pode ter gravado alguma coisa (post publicado, IA, Banca): o que tava na memória sai */
          if(!fica) limpa();
          if(!r.error) return r.data;
          const status = r.error.context && r.error.context.status;
          let info = null; try{ if(r.error.context && r.error.context.json) info = await r.error.context.json(); }catch(e){}
          erro = Object.assign({ code: (info && info.erro) || 'fn', status }, info || {});
          if(status !== 404) break;
        }
        throw erro;
      }
    };
  }

  /* ---------------- dados: demonstração (tudo no navegador) ---------------- */
  /* a marca de exemplo do Studio Houzi (feita pelo próprio motor) */
  const HOUZI_EX = {"spec":{"v":1,"territorio":"editorial","amostra":1,"nome":"Grão Torto","tagline":"café de esquina","nicho":"cafe","cidade":"Londrina, PR","desde":"2021","pers":[0.35,0.55,0.55,0.35,0.2],"modo":"branding","campos":["cafe","rua"],"logo":{"arranjo":"wordmark","caixa":"titulo","track":0.005,"efeito":"","gesto":"troca","tagline":true,"corTexto":"texto","trocaPor":"ideia"},"simbolo":{"tipo":"ideia","icone":"xicara","ideia":"grao","estilo":"linha","seed":84829},"tipo":{"display":"lora-bolditalic","texto":"lora-regular"},"cores":{"p":"#2B2B2E","s":"#D8D4CB","a":"#B8913A","ink":"#161618","paper":"#F6F2EA","fundo":"paper","esquema":"receita","receita":"Grafite e Ouro"},"textura":"papel","aplic":["revista","sacola","cartao","instagram","copo","fachada"],"seed":273184829,"descr":"Café de bairro, torra própria"},"voz":{"conceito":"Grão Torto é o café que trata cada detalhe como página de revista.","manifesto":"Grão Torto acredita que pressa é inimiga do bom. Por isso cada café é pensado como uma página de revista: com respiro, com ritmo, com intenção. É pra quem acorda cedo que repara. Que lê a legenda inteira. Que volta pela segunda vez.","taglines":["Grão Torto. Pra ler devagar.","A pausa boa do dia, com tempo.","O detalhe é a história.","Feito com atenção em Londrina.","Menos, e melhor."],"e":["calma","precisa","elegante"],"nao_e":["barulhenta","apressada","exagerada"],"fala":["Pensado com calma, feito pra durar.","Nem tudo precisa ser pra ontem.","A pausa boa do dia, no detalhe."],"nao_fala":["IMPERDÍVEL!!!","Só hoje, corre!","O melhor do Brasil."],"bio":"café de esquina · Café em Londrina. Chama no direct.","wa":"Olá, que bom ter você aqui. Aqui é o Grão Torto. Me conta o que procura e eu te ajudo com calma.","ia":false}};
  function demoApi(){
    const KEY = 'corre-demo-v2', mem = {};
    const T = ['corre_perfis', 'corre_portfolio', 'corre_destaques', 'corre_stories', 'corre_insta', 'corre_contas', 'corre_lancamentos', 'corre_rolo_salvos', 'corre_leads', 'corre_posts', 'corre_feed', 'corre_curtidas', 'corre_comentarios', 'corre_seguindo', 'corre_story_curtidas', 'corre_visitas', 'corre_estilo', 'corre_produtos', 'corre_mural', 'corre_mural_propostas', 'corre_vendas', 'corre_refs', 'corre_lead_fotos', 'corre_mural_chat', 'corre_verso_bloq', 'corre_votos', 'corre_salvos', 'corre_recomendacoes', 'corre_feed_vistas', 'corre_avisos_lidos', 'corre_conversas', 'corre_conversa_membros', 'corre_mensagens', 'corre_push', 'corre_push_pref', 'corre_grupos', 'corre_grupo_membros', 'corre_houzi_marcas', 'corre_correal', 'corre_correal_log', 'corre_tarefa_vez', 'corre_ig_contas', 'corre_houzi_privado', 'corre_assinaturas', 'corre_asaas_clientes', 'corre_skins'];
    const PRIV = ['corre_contas', 'corre_lancamentos', 'corre_rolo_salvos', 'corre_leads', 'corre_posts', 'corre_visitas', 'corre_estilo', 'corre_produtos', 'corre_mural', 'corre_mural_propostas', 'corre_vendas', 'corre_refs', 'corre_lead_fotos', 'corre_verso_bloq', 'corre_votos', 'corre_salvos', 'corre_feed_vistas', 'corre_avisos_lidos', 'corre_push', 'corre_push_pref', 'corre_correal', 'corre_correal_log', 'corre_tarefa_vez', 'corre_ig_contas', 'corre_houzi_privado', 'corre_assinaturas', 'corre_asaas_clientes', 'corre_skins'];
    const now = () => new Date().toISOString();
    const inH = h => new Date(Date.now() + h * 36e5).toISOString();
    /* o mesmo do corre_tarefa_valor (delta-v338 + delta-v3391: 3 tarefas por uniforme) */
    const CORREAL_TAREFA = { policial: { ronda: 3, ladrao: 5, transito: 2 }, bombeiro: { fogo: 5, gato: 3, treino: 2 }, medico: { socorro: 5, vacina: 3, plantao: 2 }, chef: { pastel: 3, smash: 3, churros: 3 }, motoboy: { entrega: 4, acai: 4, envelope: 3 }, craque: { gols: 4, peneira: 4, embaixadinha: 3 },
      ladrao: { pipoca: 3, churros: 4, despista: 3 }, detetive: { pistas: 4, testemunha: 3, rastro: 4 }, cientista: { amostra: 4, ipe: 3, clima: 4 }, pirata: { tesouro: 4, bandeira: 3, mapa: 4 }, astronauta: { contagem: 3, treino: 3, estrelas: 4 },
      ninja: { pergaminho: 4, telhados: 4, meditar: 3 }, super: { patrulha: 5, resgate: 4, pipa: 3 }, rei: { fita: 3, discurso: 3, visita: 4 } };
    function seed(){
      const P = (id, handle, nome, cidade, bio, extra) => Object.assign({ id, handle, nome, cidade, bio, instagram: '', avatar_url: '', visibilidade: 'publico', grana_mostra: 'nada', plano: 'gratis', rolo_temas: [], banca_temas: [], banca_assuntos: [], ex: true, created_at: now() }, extra || {});
      const d = { user: null, t: {} }; T.forEach(t => d.t[t] = []);
      d.t.corre_perfis = [
        P('ex1', 'luiza.reels', 'Luiza Prado', 'Londrina, PR', 'Social media de cafeteria e restaurante. Reels todo dia.', { grana_mostra: 'faixa' }),
        P('ex2', 'nego.filma', 'Diego Matos', 'Maringá, PR', 'Vídeo vertical pra marca de rua. Câmera na mão.'),
        P('ex3', 'ana.trafego', 'Ana Ruiz', 'Curitiba, PR', 'Tráfego pago e funil pra loja de bairro.')
      ];
      const M = (dono, marca, segmento, papel, cor) => ({ id: rid(), dono, marca, segmento, papel, desde: '2026', link: '', logo_url: '', cor, rede: '', publico: true, ordem: 0, created_at: now(), ex: true });
      d.t.corre_portfolio = [M('ex1', 'Café Grão Torto', 'Cafeteria', 'Social media', '#FF6C2F'), M('ex1', 'Pizzaria do Bairro', 'Restaurante', 'Reels', '#FF48B0'), M('ex2', 'Ladeira Skate Shop', 'Skate', 'Vídeo', '#0067AE'), M('ex3', 'Ótica Central', 'Varejo', 'Tráfego pago', '#765BA7')];
      const S = (dono, texto, fundo) => ({ id: rid(), dono, midia_url: '', texto, fundo, destaque_id: null, created_at: now(), expira_em: inH(20), ex: true });
      d.t.corre_stories = [S('ex1', 'Gravando 3 reels de uma vez no café. Luz das 16h é ouro.', '#FF4F9A'), S('ex2', 'Primeiro corte do vídeo da skate shop saindo hoje.', '#2E5BFF'), S('ex3', 'CPA caiu 38% trocando o criativo. Só isso.', '#0F1218')];
      const ago = h => new Date(Date.now() - h * 36e5).toISOString();
      const FP = (id, dono, texto, h) => ({ id, dono, tipo: 'post', texto, midia_url: '', ref: null, created_at: ago(h), ex: true });
      d.t.corre_feed = [
        FP('fx1', 'ex3', 'Troquei o criativo do anúncio da ótica por um vídeo de 6 segundos do vendedor limpando a lente na frente do cliente. CPA caiu 38%. Nada de foto de banco de imagem.\n\n#trafegopago #lojadebairro', 2),
        FP('fx2', 'ex1', 'Regra da casa: reel de cafeteria só com a luz das 16h. Às 16h10 o café já virou outro produto.', 5),
        FP('fx3', 'ex2', 'Primeiro corte do vídeo da Ladeira Skate Shop saiu. Câmera na mão, zero tripé, 14 quedas até a manobra entrar.', 26)
      ];
      d.t.corre_curtidas = [{ post_id: 'fx1', dono: 'ex1', created_at: ago(1) }, { post_id: 'fx1', dono: 'ex2', created_at: ago(1) }, { post_id: 'fx2', dono: 'ex3', created_at: ago(3) }];
      d.t.corre_comentarios = [{ id: 'cx1', post_id: 'fx1', dono: 'ex1', texto: 'Vou roubar essa ideia pra pizzaria.', created_at: ago(1) }];
      return d;
    }
    function read(){
      let d = null;
      try{ d = JSON.parse(localStorage.getItem(KEY)); }catch(e){}
      d = d || mem.d || seed();
      T.forEach(t => { if(!d.t[t]) d.t[t] = []; });
      /* v3.56: perfil mocado (escondido) virou público e desbaratinado, como no banco (delta-v356.sql) */
      d.t.corre_perfis.forEach(p => { if(p.visibilidade === 'mocado'){ p.visibilidade = 'publico'; p.desbaratinado = true; } });
      /* v3.43: o correal ganhou centavos e o que já existia foi dividido por 10, como no banco (delta-v343.sql): quem
         tinha 9 na demonstração fica com 0,90, que compra o mesmo que os 9 compravam */
      if(!d.v343){
        d.v343 = true;
        const div = v => Math.round((Number(v) || 0) * 10) / 100;
        d.t.corre_correal.forEach(w => { w.saldo = div(w.saldo); w.ganho = div(w.ganho); w.gasto = div(w.gasto); });
        d.t.corre_correal_log.forEach(l => { l.valor = div(l.valor); });
      }
      if(!d.v337){
        d.v337 = true;
        /* Studio Houzi (v3.37): uma marca de exemplo, publicada, da Luiza */
        if(d.t.corre_perfis.some(p => p.id === 'ex1') && !d.t.corre_houzi_marcas.some(x => x.id === 'hzx1')){ const ag = new Date(Date.now() - 2 * 864e5).toISOString(); d.t.corre_houzi_marcas.push({ id: 'hzx1', dono: 'ex1', numero: 1, slug: 'grao-torto', nome: 'Grão Torto', modo: 'branding', spec: HOUZI_EX.spec, voz: HOUZI_EX.voz, naming: {}, publica: true, created_at: ag, updated_at: ag, ex: true }); }
      }
      if(!d.v38){
        d.v38 = true;
        const EXC = { ex1: ['social', 'Social media de cafeteria e restaurante', 'empresas', '43911110001'], ex2: ['foto_video', 'Vídeo vertical pra marca de rua', 'empresas', '44922220002'], ex3: ['trafego', 'Tráfego pago pra loja de bairro', 'empresas', '41933330003'] };
        d.t.corre_perfis.forEach(p => { const e = EXC[p.id]; if(e && !p.categoria) Object.assign(p, { categoria: e[0], faz: e[1], vende_pra: e[2], whats_publico: e[3], horus: Object.assign({}, p.horus, { orcamento: 'on' }) }); });
        const IT = (dono, nome, preco, unidade, tipo, mensal) => d.t.corre_produtos.push({ id: rid(), dono, marca_id: null, nome, preco, custo: 0, ganho: preco, tipo, unidade, descricao: '', publico: true, mensal: !!mensal, ordem: 0, ex: true, created_at: now() });
        if(!d.t.corre_produtos.some(x => x.ex)){ IT('ex1', 'Pacote social media (12 posts)', 1200, 'mês', 'servico', true); IT('ex1', 'Reels avulso', 180, 'un', 'servico'); IT('ex2', 'Diária de filmagem', 900, 'diária', 'servico'); IT('ex2', 'Reels editado', 250, 'un', 'servico'); IT('ex3', 'Gestão de tráfego', 900, 'mês', 'servico', true); }
      }
      if(!d.v312){
        d.v312 = true;
        const ago = h => new Date(Date.now() - h * 36e5).toISOString();
        d.t.corre_perfis.forEach(p => { if(p.ex) p.no_mural = true; });
        if(!d.t.corre_mural_chat.length) d.t.corre_mural_chat.push(
          { id: 'qx1', quem: null, chave: 'x', nome: 'Paula', cidade: 'Londrina', uf: 'PR', pergunta: 'Quem faz social media pra cafeteria em Londrina?', resposta: 'A Luiza é daqui e faz social media justamente pra cafeteria e restaurante, com pacote mensal e reels avulso.', indicados: [{ handle: 'luiza.reels', motivo: 'Social media de cafeteria e restaurante, em Londrina' }], categoria: 'social', pedido: false, oculto: false, created_at: ago(3) },
          { id: 'qx2', quem: null, chave: 'y', nome: 'Rafa', cidade: 'Maringá', uf: 'PR', pergunta: 'Preciso de alguém pra filmar um vídeo vertical da minha loja de tênis', resposta: 'O Diego filma vídeo vertical pra marca de rua, câmera na mão, e é de Maringá. Tem diária e reels editado no perfil.', indicados: [{ handle: 'nego.filma', motivo: 'Vídeo vertical pra marca de rua, em Maringá' }], categoria: 'foto_video', pedido: false, oculto: false, created_at: ago(9) });
      }
      if(!d.v311){
        d.v311 = true;
        const ago = h => new Date(Date.now() - h * 36e5).toISOString();
        const FX = (id, dono, texto, h, alvo) => ({ id, dono, tipo: alvo ? 'fortalece' : 'post', alvo: alvo || null, texto, midia_url: '', ref: null, created_at: ago(h), ex: true });
        if(d.t.corre_feed.some(f => f.id === 'fx1') && !d.t.corre_feed.some(f => f.id === 'fx4')){
          d.t.corre_feed.push(FX('fx4', 'ex2', '', 1.5, 'fx1'),
            FX('fx5', 'ex1', 'Vale pra cafeteria também: o barista na frente da máquina vende mais que foto de cardápio. #lojadebairro', 1, 'fx1'),
            FX('fx6', 'ex2', 'Alguém indica tatuador em Maringá pra um flash day na skate shop? Sexta 13 tá chegando. #flashday #skate', 3));
          d.t.corre_comentarios.push({ id: 'cx2', post_id: 'fx1', dono: 'ex3', pai: 'cx1', texto: 'Rouba mesmo. Grava o forno abrindo, 6 segundos.', created_at: ago(0.8) },
            { id: 'cx3', post_id: 'fx1', dono: 'ex1', pai: 'cx2', texto: 'Fechou. Amanhã testo e te conto o CPA.', created_at: ago(0.5) },
            { id: 'cx4', post_id: 'fx6', dono: 'ex1', texto: 'Pede no Mural, categoria Tatuagem e piercing: chove proposta.', created_at: ago(2) });
        }
      }
      /* v3.36: três grupos de exemplo (dois abertos e um fechado), com posts, enquete e papo */
      if(!d.v336){
        d.v336 = true;
        const ago = h => new Date(Date.now() - h * 36e5).toISOString();
        if(d.t.corre_perfis.some(p => p.id === 'ex1') && !d.t.corre_grupos.length){
          const GR = (id, slug, nome, descricao, regras, tags, cor, fechado, membros, h) => {
            const c = { id: 'gc-' + id, tipo: 'grupo', par: null, criada_por: membros[0], created_at: ago(h), ultima_em: null, ultima_txt: '', ultima_de: null };
            d.t.corre_conversas.push(c);
            d.t.corre_grupos.push({ id, slug, nome, descricao, regras, tags, cor, capa_url: '', fechado, dono: membros[0], conversa: c.id, fixo: null, membros_n: membros.length, ativo_em: ago(1), created_at: ago(h), ex: true });
            membros.forEach((u, i) => {
              d.t.corre_grupo_membros.push({ grupo: id, membro: u, papel: i ? 'membro' : 'dono', estado: 'ativo', recado: '', aceito_por: null, aceito_em: null, created_at: ago(h - i) });
              d.t.corre_conversa_membros.push({ conversa: c.id, membro: u, estado: 'aceita', lida_em: ago(1), silenciada: false, apagada_em: null, created_at: ago(h) });
            });
            return c;
          };
          const c1 = GR('gx1', 'social-media-de-comida', 'Social media de comida', 'Pra quem cuida de restaurante, café, hamburgueria e delivery: pauta, preço, reels e cliente que some.', 'Sem spam de curso. Pergunta boba não existe. Print de cliente, só sem o nome.', ['comida', 'reels', 'delivery'], '#FF4F9A', false, ['ex1', 'ex2'], 200);
          const c2 = GR('gx2', 'video-vertical-na-rua', 'Vídeo vertical na rua', 'Câmera na mão, marca de rua, skate, tênis e evento. Troca de corte, trilha e equipamento barato.', 'Mostra o corte, não só fala dele.', ['video', 'reels', 'rua'], '#2E5BFF', false, ['ex2', 'ex3'], 150);
          const c3 = GR('gx3', 'trafego-pra-loja-de-bairro', 'Tráfego pra loja de bairro', 'Anúncio pequeno, verba curta, venda no direct. Aqui a gente abre os números.', 'O que é falado aqui fica aqui. Número de cliente, sem o nome.', ['trafego', 'meta-ads'], '#FF8A3D', true, ['ex3', 'ex1'], 120);
          const P = (id, dono, grupo, texto, h, extra) => d.t.corre_feed.push(Object.assign({ id, dono, tipo: 'post', alvo: null, texto, midia_url: '', ref: null, created_at: ago(h), grupo, fio: null, fio_n: null, enquete: null, vistas: 0, ex: true }, extra || {}));
          P('gp1', 'ex1', 'gx1', 'Pauta da semana pra quem atende comida: segunda é bastidor da cozinha, quarta é o prato do dia em 6 segundos, sexta é cliente comendo (com autorização). Repete o formato, troca o prato.', 30);
          P('gp2', 'ex2', 'gx1', 'Quanto vocês cobram por um reels avulso pra hamburgueria? Tô entre 180 e 250 com roteiro incluso.', 6, { enquete: { ops: ['Até R$ 150', 'R$ 150 a 250', 'Mais de R$ 250'], fim: new Date(Date.now() + 3 * 864e5).toISOString() } });
          P('gp3', 'ex2', 'gx2', 'Teste de hoje: gimbal barato x mão livre andando de skate. A mão livre ganhou no Instagram (mais real), o gimbal ganhou no TikTok. Vai entender.', 9);
          P('gp4', 'ex3', 'gx3', 'Abrindo os números da ótica: R$ 25 por dia, 14 dias, 31 conversas no direct, 7 vendas. O criativo que segurou foi o vendedor limpando a lente.', 4);
          d.t.corre_grupos.find(g => g.id === 'gx1').fixo = 'gp1';
          d.t.corre_comentarios.push({ id: 'gcx1', post_id: 'gp2', dono: 'ex1', pai: null, texto: 'Cobro 220 com roteiro e uma refação. Abaixo disso vira hobby.', created_at: ago(5) });
          d.t.corre_curtidas.push({ post_id: 'gp1', dono: 'ex2', created_at: ago(20) }, { post_id: 'gp4', dono: 'ex1', created_at: ago(3) });
          const M = (c, dono, texto, h) => { const m = { id: rid(), conversa: c.id, dono, texto, midia: '', ref: null, apagada: false, created_at: ago(h) }; d.t.corre_mensagens.push(m); const pf = d.t.corre_perfis.find(x => x.id === dono) || {}; Object.assign(c, { ultima_em: m.created_at, ultima_txt: (String(pf.nome || '').split(' ')[0] + ': ' + texto).slice(0, 140), ultima_de: dono }); };
          M(c1, 'ex1', 'Bom dia! Alguém tem modelo de contrato de social media pra restaurante?', 3);
          M(c1, 'ex2', 'Tenho um simples, depois te mando no privado.', 2.5);
          M(c2, 'ex3', 'Qual microfone de lapela vocês usam? O meu chia demais na rua.', 8);
          M(c3, 'ex1', 'Ana, esse teu teste da ótica com R$ 25 por dia funcionaria pra pizzaria?', 2);
        }
      }
      d.t.corre_stories.forEach(s => { if(s.ex) s.expira_em = inH(20); });
      return d;
    }
    function write(d){ mem.d = d; try{ localStorage.setItem(KEY, JSON.stringify(d)); }catch(e){ throw { name: 'QuotaExceededError', message: 'quota' }; } }
    const uidOf = d => d.user && d.user.id;
    /* grupos (v3.36): quem tá dentro, quem enxerga e quem modera (as mesmas regras do delta-v336.sql) */
    const gMembro = (d, g, u) => !!u && d.t.corre_grupo_membros.find(m => m.grupo === g && m.membro === u && m.estado === 'ativo');
    const gVe = (d, g, u) => { if(!g) return true; const x = d.t.corre_grupos.find(y => y.id === g); return !!x && (!x.fechado || !!gMembro(d, g, u)); };
    const gMod = (d, g, u) => { const m = gMembro(d, g, u); return !!m && (m.papel === 'dono' || m.papel === 'mod'); };
    /* v3.56: os dados de um desbaratinado só pra quem segue (e pra ele mesmo); igual à corre_ve_conteudo do banco */
    const veDados = (d, id, u) => { const p = d.t.corre_perfis.find(x => x.id === id); return !!p && p.visibilidade === 'publico' && (!p.desbaratinado || id === u || d.t.corre_seguindo.some(s => s.quem === u && s.segue === id)); };
    function visible(t, r, d){
      const uid = uidOf(d);
      if(t === 'corre_grupos') return true;
      if(t === 'corre_houzi_marcas') return !!r.publica || r.dono === uid;
      if(t === 'corre_grupo_membros') return r.membro === uid || (r.estado === 'ativo' && gVe(d, r.grupo, uid)) || gMod(d, r.grupo, uid);
      if(t === 'corre_feed' && r.grupo && r.dono !== uid && !gVe(d, r.grupo, uid)) return false;
      if(t === 'corre_perfis') return r.visibilidade === 'publico' || r.id === uid;
      if(t === 'corre_conversas') return d.t.corre_conversa_membros.some(m => m.conversa === r.id && m.membro === uid);
      if(t === 'corre_conversa_membros' || t === 'corre_mensagens') return d.t.corre_conversa_membros.some(m => m.conversa === r.conversa && m.membro === uid);
      const pub = id => { const p = d.t.corre_perfis.find(x => x.id === id); return !!p && (p.visibilidade === 'publico' || p.id === uid); };
      if(t === 'corre_seguindo') return r.quem === uid || r.segue === uid || (pub(r.quem) && pub(r.segue));
      if(t === 'corre_curtidas') return d.t.corre_feed.some(f => f.id === r.post_id && visible('corre_feed', f, d));
      if(t === 'corre_comentarios') return d.t.corre_feed.some(f => f.id === r.post_id && visible('corre_feed', f, d)) && (r.dono === uid || pub(r.dono));
      if(t === 'corre_story_curtidas') return r.dono === uid || d.t.corre_stories.some(s => s.id === r.story_id && s.dono === uid);
      if(t === 'corre_mural_chat') return !r.oculto;
      if(t === 'corre_recomendacoes') return r.dono === uid || r.para === uid || (r.status === 'aceita' && veDados(d, r.para, uid) && pub(r.dono));
      if(r.dono === uid) return true;
      if(PRIV.includes(t)) return false;
      const p = d.t.corre_perfis.find(x => x.id === r.dono);
      if(!p || p.visibilidade !== 'publico') return false;
      if(!(t === 'corre_feed' && r.grupo) && !veDados(d, p.id, uid)) return false;
      if(t === 'corre_portfolio') return !!r.publico;
      if(t === 'corre_stories') return new Date(r.expira_em) > new Date() || !!r.destaque_id;
      return true;
    }
    const cmp = { eq: (a, b) => a === b, neq: (a, b) => a !== b, gt: (a, b) => a > b, gte: (a, b) => a >= b, lt: (a, b) => a < b, lte: (a, b) => a <= b, in: (a, b) => b.includes(a), ilike: (a, b) => new RegExp('^' + String(b).split('%').map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/_/g, '.')).join('.*') + '$', 'is').test(String(a == null ? '' : a)) };
    function select(t, o, d){
      let rows = d.t[t].filter(r => visible(t, r, d));
      Object.entries(o.is || {}).forEach(([k, v]) => { rows = rows.filter(r => (r[k] == null ? null : r[k]) === v); });
      Object.keys(cmp).forEach(op => Object.entries(o[op] || {}).forEach(([k, v]) => { rows = rows.filter(r => cmp[op](r[k], v)); }));
      if(o.order){ const [k, asc] = o.order; rows = rows.slice().sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * (asc ? 1 : -1)); }
      if(o.limit) rows = rows.slice(0, o.limit);
      rows = rows.map(r => Object.assign({}, r));
      if(o.join === 'perfil') rows = rows.map(r => Object.assign(r, { perfil: d.t.corre_perfis.find(p => p.id === r.dono && visible('corre_perfis', p, d)) })).filter(r => r.perfil);
      return rows;
    }
    /* ---- v3.60: os planos na demonstração (as mesmas contas do delta-v360.sql). O fundador é o @consanans ---- */
    const PL_FUND = 'd1e9f6ac-f5d7-4723-8b02-eb0d1d7137b0';
    const plFund = (d, u) => { const p = d.t.corre_perfis.find(x => x.id === u); return u === PL_FUND || !!(p && p.handle === 'consanans'); };
    const plMais = (dia, n) => new Date(Date.parse(dia + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
    const plAcesso = (d, u, prod) => plFund(d, u) || d.t.corre_assinaturas.some(a => a.dono === u && a.produto === prod
      && ((a.teste_ate && Date.parse(a.teste_ate) > Date.now()) || (a.pago_ate && plMais(a.pago_ate, 3) >= hojeBR())));
    const plRedes = (d, u) => {
      const p = d.t.corre_perfis.find(x => x.id === u) || {};
      if(plFund(d, u) || p.plano === 'pro') return 999;
      const a = d.t.corre_assinaturas.find(x => x.dono === u && x.produto === 'studio');
      return Math.max(Number(p.redes) || 1, 1, a && plAcesso(d, u, 'studio') ? (a.nivel >= 4 ? 999 : a.nivel) : 1);
    };
    const plGarante = (d, u, prod) => {
      if(!u || !['houzi', 'horus'].includes(prod) || !d.t.corre_perfis.some(p => p.id === u) || d.t.corre_assinaturas.some(a => a.dono === u && a.produto === prod)) return;
      d.t.corre_assinaturas.push({ id: rid(), dono: u, produto: prod, nivel: 1, valor: prod === 'houzi' ? 29.90 : 9.90, status: 'teste', teste_ate: new Date(Date.now() + 30 * 864e5).toISOString(), pago_ate: null, asaas_assinatura: null, link: '', created_at: now(), updated_at: now() });
    };
    /* v3.66 · o preço de uma skin da loja no demo, em centavos (0 = não é da loja). A vitrine mora no verso.js */
    const skinPrecoDemo = k => { const x = ((C.verso && C.verso.SKINS_LOJA) || []).find(s => s[0] === k); return x ? centDe(x[2]) : 0; };
    const plTrava = (d, u, prod) => { plGarante(d, u, prod); if(!plAcesso(d, u, prod)) throw { message: 'o teste grátis acabou', hint: prod + '_assinatura', code: 'P0001' }; };
    const plMeu = (d, u) => {
      if(!u) return null;
      const planos = {};
      d.t.corre_assinaturas.filter(a => a.dono === u).forEach(a => { planos[a.produto] = { status: a.status, nivel: a.nivel, valor: a.valor, teste_ate: a.teste_ate, pago_ate: a.pago_ate, link: a.link, assinado: !!a.asaas_assinatura, acesso: plAcesso(d, u, a.produto) }; });
      return { fundador: plFund(d, u), redes: plRedes(d, u), usadas: d.t.corre_portfolio.filter(x => x.dono === u && x.rede).length, cliente: d.t.corre_asaas_clientes.some(c => c.dono === u),
        planos, acesso: { studio: true, houzi: plAcesso(d, u, 'houzi'), horus: plAcesso(d, u, 'horus') } };
    };
    function rules(t, r, d, isNew){
      const uid = uidOf(d);
      const mine = t === 'corre_perfis' ? null : d.t[t].filter(x => x.dono === uid && x !== r);
      const LIM = { corre_portfolio: 40, corre_destaques: 20, corre_stories: 300, corre_insta: 12, corre_contas: 2, corre_lancamentos: 20000, corre_rolo_salvos: 500, corre_leads: 5000, corre_posts: 2000, corre_visitas: 2000, corre_estilo: 1, corre_produtos: 300, corre_vendas: 3000, corre_refs: 500, corre_verso_bloq: 500 };
      if(isNew && LIM[t] && mine.length >= LIM[t]) throw { message: `limite de ${LIM[t]} itens` };
      if(t === 'corre_portfolio' && r.rede){
        const me = d.t.corre_perfis.find(p => p.id === uid);
        if((!me || me.plano !== 'pro') && mine.filter(x => x.rede && x.id !== r.id).length >= plRedes(d, uid)) throw { message: 'plano gratis', hint: 'plano_gratis' };
      }
      if(t === 'corre_produtos' && r.preco != null && r.preco !== '') r.ganho = Math.max(Number(r.preco) - (Number(r.custo) || 0), 0);
      /* v3.40: o post só sai em conta do Instagram da própria dona (delta-v340.sql) */
      if(t === 'corre_posts' && r.ig_conta && !(d.t.corre_ig_contas || []).some(c => c.id === r.ig_conta && c.dono === (r.dono || uid))) throw { message: 'conta de outra pessoa', hint: 'ig_conta', code: '42501' };
      if(t === 'corre_vendas'){
        let tot = 0, cus = 0;
        (r.itens || []).forEach(e => { if(!e || !String(e.n || '').trim() || !(Number(e.q) > 0) || !(Number(e.v) >= 0)) throw { message: 'item', hint: 'item' }; tot += Number(e.q) * Number(e.v); cus += Number(e.q) * (Number(e.c) || 0); });
        r.total = Math.round(Math.max(tot - (Number(r.desconto) || 0), 0) * 100) / 100; r.custo = Math.round(cus * 100) / 100;
        r.sinal = Math.round(Math.min(Math.max(Number(r.sinal) || 0, 0), r.total) * 100) / 100;
        if(!r.codigo) r.codigo = Array.from({ length: 12 }, () => '0123456789ABCDEF'[Math.floor(Math.random() * 16)]).join('');
        if(!r.st) r.st = 'orcamento'; r.updated_at = now();
      }
      if(t === 'corre_insta' && mine.some(x => x.url === r.url)) throw { code: '23505' };
      if(t === 'corre_feed'){
        r.texto = r.texto || ''; r.midia_url = r.midia_url || ''; r.ref = r.ref || null; r.tipo = r.tipo || 'post'; r.alvo = r.alvo || null;
        /* fortalecer/citar: mesmas regras do banco (delta-v311.sql) */
        if(r.alvo){
          let o = d.t.corre_feed.find(x => x.id === r.alvo);
          if(o && o.tipo === 'fortalece' && !o.texto && !o.midia_url && o.alvo) o = d.t.corre_feed.find(x => x.id === o.alvo);
          if(!o || (o.dono !== r.dono && !visible('corre_feed', o, d))) throw { message: 'post', hint: 'post' };
          r.alvo = o.id; r.tipo = 'fortalece';
          if(!r.texto && !r.midia_url && d.t.corre_feed.some(x => x !== r && x.dono === r.dono && x.alvo === r.alvo && x.tipo === 'fortalece' && !x.texto && !x.midia_url)) throw { code: '23505' };
        }else if(r.tipo === 'fortalece' && isNew) throw { message: 'fortalece', hint: 'fortalece' };
        if(!r.texto && !r.midia_url && !r.ref && !r.alvo) throw { message: 'post vazio' };
        /* v3.36: post de grupo só de quem tá dentro; pedaço de fio fica no grupo do primeiro; grupo fechado não sai */
        if(isNew){
          if(r.fio){ const raiz0 = d.t.corre_feed.find(x => x.id === r.fio); r.grupo = raiz0 ? raiz0.grupo || null : null; }
          r.grupo = r.grupo || null;
          if(r.grupo && !gMembro(d, r.grupo, uid)) throw { message: 'grupo', hint: 'grupo' };
          if(r.alvo){ const o = d.t.corre_feed.find(x => x.id === r.alvo), og = o && o.grupo && d.t.corre_grupos.find(x => x.id === o.grupo); if(og && og.fechado && o.grupo !== r.grupo) throw { message: 'post', hint: 'post' }; }
          if(r.grupo){ const g = d.t.corre_grupos.find(x => x.id === r.grupo); if(g) g.ativo_em = now(); }
        }
        /* v3.21: post novo até 500 letras, fio, enquete e visualizações (mesmas regras do delta-v321.sql) */
        if(isNew){
          r.vistas = 0;
          if((r.tipo === 'post' || r.tipo === 'fortalece') && r.texto.length > 500) throw { message: 'texto', hint: 'texto' };
          if(r.fio){
            const raiz = d.t.corre_feed.find(x => x.id === r.fio);
            if(!raiz || raiz.dono !== r.dono || raiz.fio || r.tipo !== 'post' || r.alvo || r.enquete) throw { message: 'fio', hint: 'fio' };
            const n = d.t.corre_feed.filter(x => x.fio === r.fio).length; if(n >= 19) throw { message: 'fio', hint: 'fio' };
            r.fio_n = n + 1;
          }else{ r.fio = null; r.fio_n = null; }
          if(r.enquete){
            const e = r.enquete, ops = Array.isArray(e.ops) ? e.ops.map(x => typeof x === 'string' ? x.trim() : '') : [], fim = Date.parse(e.fim);
            if(r.tipo !== 'post' || r.alvo || ops.length < 2 || ops.length > 4 || ops.some(x => !x || x.length > 40) || !(fim > Date.now() + 5 * 60e3) || fim > Date.now() + (7 * 24 + 1) * 36e5) throw { message: 'enquete', hint: 'enquete' };
            r.enquete = { ops, fim: new Date(fim).toISOString() };
          }else r.enquete = null;
        }
      }
      if(t === 'corre_votos'){
        const f = d.t.corre_feed.find(x => x.id === r.post_id);
        if(!f || !f.enquete || Date.parse(f.enquete.fim) <= Date.now() || !(r.op >= 0 && r.op < f.enquete.ops.length) || !(f.dono === uid || visible('corre_feed', f, d))) throw { message: 'row-level security', code: '42501' };
        if(d.t.corre_votos.some(x => x !== r && x.post_id === r.post_id && x.dono === r.dono)) throw { code: '23505' };
      }
      if(t === 'corre_salvos'){
        const f = d.t.corre_feed.find(x => x.id === r.post_id);
        if(!f || !(f.dono === uid || visible('corre_feed', f, d))) throw { message: 'row-level security', code: '42501' };
        if(d.t.corre_salvos.some(x => x !== r && x.post_id === r.post_id && x.dono === r.dono)) throw { code: '23505' };
      }
      if(t === 'corre_recomendacoes' && isNew){
        const alvo = d.t.corre_perfis.find(x => x.id === r.para);
        r.texto = String(r.texto || '').trim(); r.status = 'pendente'; r.relacao = ['cliente', 'parceiro', 'colega'].includes(r.relacao) ? r.relacao : 'cliente';
        if(!alvo || alvo.id === uid || alvo.visibilidade !== 'publico') throw { message: 'row-level security', code: '42501' };
        if(r.texto.length < 20 || r.texto.length > 600) throw { message: 'texto', hint: 'texto' };
        if(d.t.corre_recomendacoes.some(x => x !== r && x.dono === r.dono && x.para === r.para)) throw { code: '23505' };
      }
      /* a casa por dentro: um objeto de até 30 KB (o banco confere a mesma coisa) */
      if(t === 'corre_perfis' && r.casa != null && (typeof r.casa !== 'object' || Array.isArray(r.casa) || JSON.stringify(r.casa).length > 30000)) throw { message: 'casa', hint: 'casa' };
      if(t === 'corre_perfis' && r.post_fixo){
        const f = d.t.corre_feed.find(x => x.id === r.post_fixo);
        if(!f || f.dono !== r.id || f.fio || (f.tipo === 'fortalece' && !f.texto && !f.midia_url)) throw { message: 'fixo', hint: 'fixo' };
      }
      if(t === 'corre_mural_chat'){ r.chave = r.chave || rid().replace(/-/g, ''); r.quem = uid || null; r.oculto = false; r.indicados = Array.isArray(r.indicados) ? r.indicados.slice(0, 6) : []; }
      if(t === 'corre_comentarios' && r.pai && !d.t.corre_comentarios.some(c => c.id === r.pai && c.post_id === r.post_id)) throw { message: 'resposta', hint: 'resposta' };
      if((t === 'corre_comentarios' || t === 'corre_curtidas') && isNew){
        const f = d.t.corre_feed.find(x => x.id === r.post_id);
        if(!f || !(f.dono === uid || visible('corre_feed', f, d))) throw { message: 'row-level security', code: '42501' };
        if(t === 'corre_comentarios' && f.grupo){ if(!gMembro(d, f.grupo, uid)) throw { message: 'grupo', hint: 'grupo' }; const g = d.t.corre_grupos.find(x => x.id === f.grupo); if(g) g.ativo_em = now(); }
      }
      if(t === 'corre_curtidas' && d.t.corre_curtidas.some(x => x !== r && x.post_id === r.post_id && x.dono === r.dono)) throw { code: '23505' };
      if(t === 'corre_story_curtidas' && d.t.corre_story_curtidas.some(x => x !== r && x.story_id === r.story_id && x.dono === r.dono)) throw { code: '23505' };
      if(t === 'corre_seguindo' && (r.quem === r.segue || d.t.corre_seguindo.some(x => x !== r && x.quem === r.quem && x.segue === r.segue))) throw { code: '23505' };
      if(t === 'corre_rolo_salvos' && mine.some(x => x.frame_id === r.frame_id)) throw { code: '23505' };
      if(t === 'corre_leads' && r.ref && mine.some(x => x.ref === r.ref && x.id !== r.id)) throw { code: '23505' };
      if(t === 'corre_leads' && isNew) plTrava(d, uid, 'horus');
      if(t === 'corre_perfis' && d.t.corre_perfis.some(x => x.handle === r.handle && x.id !== r.id)) throw { code: '23505' };
      /* v3.66: a trava do avatar (gatilho corre_perfis_skin): skin da loja que a pessoa não comprou sai, o resto salva */
      if(t === 'corre_perfis' && r.verso && typeof r.verso === 'object' && skinPrecoDemo(r.verso.skin) && !(d.t.corre_skins || []).some(x => x.dono === r.id && x.skin === r.verso.skin)) r.verso = Object.assign({}, r.verso, { skin: '' });
    }
    /* MURAL na demonstração: as mesmas regras das funções do banco (delta-mural.sql) */
    const MU_CATS = ['social', 'design', 'foto_video', 'site', 'trafego', 'musica', 'eventos', 'reforma', 'tecnica', 'aulas', 'beleza', 'tattoo', 'moda', 'comida', 'frete', 'juridico', 'casa', 'outros'];
    const MU_ALF = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const muCod = d => { let c; do{ c = Array.from({ length: 6 }, () => MU_ALF[Math.floor(Math.random() * MU_ALF.length)]).join(''); }while(d.t.corre_mural.some(m => m.codigo === c)); return c; };
    const muChave = () => Array.from({ length: 32 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
    const muSemAcento = t => norm(t);
    const muWa = w => { let x = String(w || '').replace(/\D/g, ''); if(x.length > 11 && x.startsWith('55')) x = x.slice(2); return x; };
    const muErr = h => ({ message: h, hint: h });
    function muSeed(d){
      if(d.muralSeed) return; d.muralSeed = true;
      const ago = h => new Date(Date.now() - h * 36e5).toISOString(), em = h => new Date(Date.now() + h * 36e5).toISOString();
      const EX = [
        ['Rafael Lima', 'foto_video', 'Fotos pro cardápio novo da hamburgueria', 'São 18 lanches e 6 porções. Quero foto de cima e de lado, fundo escuro. O espaço é nosso, a luz é com você.', 'Londrina', 'PR', false, 'urgente', '300_1000', 2],
        ['Júlia Andrade', 'design', 'Logo e identidade pra minha doceria', 'Doceria de bairro abrindo em dezembro. Preciso de logo, cores e etiqueta pros potes.', 'Cambé', 'PR', false, 'mes', '1000_3000', 5],
        ['Paula Ribeiro', 'social', 'Social media 3x por semana pra clínica odontológica', 'Instagram parado faz 6 meses. Quero alguém que grave na clínica uma vez por mês e poste o resto.', 'Maringá', 'PR', false, 'semana', '1000_3000', 9],
        ['Antônio Souza', 'tecnica', 'Conserto de ar-condicionado split 12 mil BTUs', 'Parou de gelar do nada. Preciso de alguém hoje ou amanhã.', 'Londrina', 'PR', false, 'urgente', 'combinar', 1],
        ['Camila Torres', 'musica', 'DJ pra aniversário de 30 anos', 'Festa pra 80 pessoas no salão do prédio, sábado 14/11, das 21h às 3h. Funk, pop e anos 2000.', 'Londrina', 'PR', false, 'mes', '1000_3000', 20],
        ['Bruno Kato', 'site', 'Landing page pro lançamento do meu curso', 'Curso online de confeitaria. Página de vendas com vídeo, depoimentos e o checkout da Hotmart.', '', '', true, 'semana', '3000_10000', 30],
        ['Marcos Vieira', 'foto_video', 'Vídeo vertical pra inauguração da loja', 'Loja de tênis na Rua XV. Inauguração no sábado. 3 reels de 30 segundos.', 'Curitiba', 'PR', false, 'urgente', '1000_3000', 3],
        ['Renata Lopes', 'trafego', 'Anúncio no Instagram pra loja de roupa', 'Já tenho as fotos. Quero vender mais pelo direct.', 'Arapongas', 'PR', false, 'semana', 'ate_300', 40]
      ];
      EX.forEach(([nome, categoria, titulo, descricao, cidade, uf, remoto, quando, verba, h], i) => d.t.corre_mural.push({ id: 'mx' + i, codigo: muCod(d), chave: muChave(), dono: null, nome, whats: '4390000' + String(1000 + i), categoria, titulo, descricao, cidade, uf, remoto, quando, verba, vagas: 6, st: 'aberto', created_at: ago(h), expira_em: em(15 * 24 - h), ex: true }));
      const P = (pedido, dono, msg, valor, prazo) => d.t.corre_mural_propostas.push({ id: rid(), pedido, dono, msg, valor, prazo, whats: '', st: 'enviada', lead: null, created_at: ago(1), escolhida_em: null, ex: true });
      P('mx2', 'ex1', 'Oi, Paula! Faço social media de restaurante e clínica. Gravo uma tarde por mês e entrego 12 posts e 4 reels.', 1800, 'Começo na segunda');
      P('mx2', 'ex3', 'Paula, junto com o conteúdo eu rodo anúncio pra agenda lotar. Te mostro os números da ótica que atendo.', 2200, '1 semana');
      P('mx6', 'ex2', 'Marcos, gravo os 3 reels no sábado e entrego editados no domingo. Câmera na mão, pegada de rua.', 1500, 'Entrego domingo');
    }
    function muJson(d, m, completo, uid){
      const ps = d.t.corre_mural_propostas.filter(p => p.pedido === m.id && p.st !== 'recusada'), n = ps.length;
      return { codigo: m.codigo, categoria: m.categoria, titulo: m.titulo, descricao: completo ? m.descricao : String(m.descricao).slice(0, 280), cidade: m.cidade, uf: m.uf, remoto: m.remoto, quando: m.quando, verba: m.verba,
        nome: String(m.nome).split(' ')[0], vagas: m.vagas, created_at: m.created_at, expira_em: m.expira_em, propostas: n,
        st: m.st === 'fechado' ? 'fechado' : new Date(m.expira_em) <= new Date() ? 'expirado' : n >= m.vagas ? 'lotado' : 'aberto',
        ja: !!uid && d.t.corre_mural_propostas.some(p => p.pedido === m.id && p.dono === uid), meu: !!uid && m.dono === uid };
    }
    function muralRpc(n, a, d, uid){
      muSeed(d);
      const pf = uid ? d.t.corre_perfis.find(p => p.id === uid) : null;
      const pelaChave = () => { const m = d.t.corre_mural.find(x => x.chave === String(a.p_chave || '').trim().toLowerCase()); if(!m) throw muErr('pedido'); return m; };
      if(n === 'corre_mural_fixar'){
        const w = muWa(a.whats), nome = String(a.nome || '').trim().slice(0, 80), titulo = String(a.titulo || '').trim().slice(0, 90), cidade = String(a.cidade || '').trim().slice(0, 60), remoto = !!a.remoto;
        if(nome.length < 2 || (w.length !== 10 && w.length !== 11) || titulo.length < 6) throw muErr('dados');
        if(!cidade && !remoto) throw muErr('cidade');
        const meus = d.t.corre_mural.filter(m => m.whats === w);
        if(meus.filter(m => m.st === 'aberto' && new Date(m.expira_em) > new Date()).length >= 3 || meus.filter(m => Date.now() - Date.parse(m.created_at) < 864e5).length >= 6) throw muErr('limite');
        const m = { id: rid(), codigo: muCod(d), chave: muChave(), dono: pf ? uid : null, nome, whats: w, categoria: MU_CATS.includes(a.categoria) ? a.categoria : 'outros', titulo, descricao: String(a.descricao || '').trim().slice(0, 1200),
          cidade, uf: /^[A-Z]{2}$/.test(String(a.uf || '').toUpperCase()) ? String(a.uf).toUpperCase() : '', remoto, quando: ['urgente', 'semana', 'mes', 'sem_pressa'].includes(a.quando) ? a.quando : 'semana',
          verba: ['', 'ate_300', '300_1000', '1000_3000', '3000_10000', 'mais_10000', 'combinar'].includes(a.verba) ? a.verba : '', vagas: 6, st: 'aberto', created_at: now(), expira_em: inH(15 * 24) };
        d.t.corre_mural.push(m);
        /* demonstração: duas pessoas de exemplo já mandam proposta, pra dar pra ver o resto do caminho */
        const v = { ate_300: 250, '300_1000': 700, '1000_3000': 1900, '3000_10000': 5200, mais_10000: 12000 }[m.verba] || null;
        [['ex1', 'Oi, ' + nome.split(' ')[0] + '! Já fiz isso pra cafeteria e pizzaria aqui no Corre, tá no meu portfólio. Consigo começar essa semana.', v, 'Essa semana', '43911110001'],
         ['ex2', nome.split(' ')[0] + ', topo fazer. Te mando duas ideias antes de fechar e o valor já inclui os ajustes.', v ? Math.round(v * 1.2) : null, 'Em 5 dias', '44922220002']]
          .forEach(([dono, msg, valor, prazo, wa], i) => d.t.corre_mural_propostas.push({ id: rid(), pedido: m.id, dono, msg, valor, prazo, whats: wa, st: 'enviada', lead: null, created_at: new Date(Date.now() + (i + 1) * 1000).toISOString(), escolhida_em: null, ex: true }));
        return { codigo: m.codigo, chave: m.chave };
      }
      if(n === 'corre_mural_lista'){
        const uf = String(a.p_uf || '').toUpperCase(), cid = muSemAcento(a.p_cidade), cats = Array.isArray(a.p_cats) && a.p_cats.length ? a.p_cats : null, q = String(a.p_q || '').trim().toLowerCase();
        return d.t.corre_mural.filter(m => m.st === 'aberto' && new Date(m.expira_em) > new Date()
            && d.t.corre_mural_propostas.filter(p => p.pedido === m.id && p.st !== 'recusada').length < m.vagas
            && (!uf || m.uf === uf || m.remoto) && (!cid || m.remoto || muSemAcento(m.cidade) === cid)
            && (!cats || cats.includes(m.categoria)) && (!q || (m.titulo + ' ' + m.descricao).toLowerCase().includes(q))
            && (!a.p_antes || m.created_at < a.p_antes))
          .sort((x, y) => String(y.created_at).localeCompare(String(x.created_at))).slice(0, 60).map(m => muJson(d, m, false, uid));
      }
      if(n === 'corre_mural_ver'){ const m = d.t.corre_mural.find(x => x.codigo === String(a.p_codigo || '').trim().toUpperCase()); return m ? muJson(d, m, true, uid) : null; }
      if(n === 'corre_mural_propor'){
        if(!uid) throw muErr('entrar'); if(!pf) throw muErr('perfil'); if(pf.visibilidade !== 'publico') throw muErr('mocado');
        const m = d.t.corre_mural.find(x => x.codigo === String(a.p_codigo || '').trim().toUpperCase());
        if(!m || m.st !== 'aberto' || new Date(m.expira_em) <= new Date()) throw muErr('fechado');
        if(m.dono === uid) throw muErr('meu');
        if(d.t.corre_mural_propostas.some(p => p.pedido === m.id && p.dono === uid)) throw muErr('ja');
        if(d.t.corre_mural_propostas.filter(p => p.pedido === m.id && p.st !== 'recusada').length >= m.vagas) throw muErr('lotado');
        const lim = pf.plano === 'pro' ? 60 : 3, hoje = d.t.corre_mural_propostas.filter(p => p.dono === uid && Date.now() - Date.parse(p.created_at) < 864e5).length;
        if(hoje >= lim) throw muErr(pf.plano === 'pro' ? 'limite_pro' : 'limite');
        const msg = String(a.p_msg || '').trim().slice(0, 800); if(msg.length < 10) throw muErr('msg');
        let w = muWa(a.p_whats); if(w.length !== 10 && w.length !== 11) w = '';
        const valor = Number(a.p_valor) > 0 && Number(a.p_valor) <= 1e7 ? Number(a.p_valor) : null;
        let lead = d.t.corre_leads.find(l => l.dono === uid && l.ref === 'mural:' + m.codigo);
        if(!lead && d.t.corre_leads.filter(l => l.dono === uid).length < 5000){
          lead = { id: rid(), dono: uid, nome: (String(m.nome).split(' ')[0] + ' · ' + m.titulo).slice(0, 120), nicho: '', bairro: '', endereco: '', tel: '', wa: '', fixo: '', insta: '', cidade: m.cidade, uf: m.uf,
            obs: ('Mural ' + m.codigo + ': ' + m.titulo + (m.descricao ? '\n' + m.descricao : '')).slice(0, 1000), st: 'contato', prox: (() => { const t = new Date(hojeBR() + 'T12:00:00'); t.setDate(t.getDate() + 2); return t.toISOString().slice(0, 10); })(),
            fonte: 'mural', ref: 'mural:' + m.codigo, potencial: ['3000_10000', 'mais_10000'].includes(m.verba) ? 3 : m.verba === '1000_3000' ? 2 : 1, sinais: [], hist: [{ t: now(), k: 'toque', v: ('Mural · proposta: ' + msg).slice(0, 300) }], created_at: now() };
          d.t.corre_leads.push(lead);
        }
        const p = { id: rid(), pedido: m.id, dono: uid, msg, valor, prazo: String(a.p_prazo || '').trim().slice(0, 60), whats: w, st: 'enviada', lead: lead ? lead.id : null, created_at: now(), escolhida_em: null };
        d.t.corre_mural_propostas.push(p);
        /* demonstração: quem pediu (exemplo) escolhe a tua na hora, pra dar pra ver o WhatsApp chegar */
        if(m.ex && m.quando === 'urgente'){ p.st = 'escolhida'; p.escolhida_em = now(); if(lead){ lead.wa = m.whats; lead.tel = m.whats; lead.st = 'interesse'; lead.prox = hojeBR(); lead.hist = [{ t: now(), k: 'res', v: 'Mural: ' + String(m.nome).split(' ')[0] + ' escolheu tua proposta. Chama no WhatsApp.' }].concat(lead.hist).slice(0, 40); } }
        return { ok: true, id: p.id, lead: p.lead, restam: Math.max(lim - hoje - 1, 0) };
      }
      if(n === 'corre_mural_minhas'){
        if(!uid) return [];
        return d.t.corre_mural_propostas.filter(p => p.dono === uid).map(p => { const m = d.t.corre_mural.find(x => x.id === p.pedido); return m && { id: p.id, st: p.st, msg: p.msg, valor: p.valor, prazo: p.prazo, created_at: p.created_at, escolhida_em: p.escolhida_em, lead: p.lead, pedido: muJson(d, m, false, uid), cliente: p.st === 'escolhida' ? { nome: m.nome, whats: m.whats } : null }; })
          .filter(Boolean).sort((x, y) => String(y.escolhida_em || y.created_at).localeCompare(String(x.escolhida_em || x.created_at)));
      }
      if(n === 'corre_mural_meus'){ if(!uid) return []; return d.t.corre_mural.filter(m => m.dono === uid).sort((x, y) => String(y.created_at).localeCompare(String(x.created_at))).map(m => Object.assign(muJson(d, m, false, uid), { chave: m.chave })); }
      if(n === 'corre_mural_pedido'){
        const m = d.t.corre_mural.find(x => x.chave === String(a.p_chave || '').trim().toLowerCase()); if(!m) return null;
        const lista = d.t.corre_mural_propostas.filter(p => p.pedido === m.id && p.st !== 'recusada').sort((x, y) => (y.st === 'escolhida') - (x.st === 'escolhida') || String(x.created_at).localeCompare(String(y.created_at))).map(p => {
          const f = d.t.corre_perfis.find(x => x.id === p.dono) || {};
          return { id: p.id, st: p.st, msg: p.msg, valor: p.valor, prazo: p.prazo, created_at: p.created_at, whats: p.st === 'escolhida' ? p.whats : '',
            perfil: { handle: f.handle, nome: f.nome, avatar_url: f.avatar_url || '', cidade: f.cidade || '', bio: f.bio || '', instagram: f.instagram || '', desde: f.created_at,
              marcas: d.t.corre_portfolio.filter(x => x.dono === f.id && x.publico !== false).length, escolhido: d.t.corre_mural_propostas.filter(y => y.dono === f.id && y.st === 'escolhida').length + (f.ex ? 3 : 0) } };
        });
        return Object.assign(muJson(d, m, true, uid), { chave: m.chave, whats: m.whats, nome_todo: m.nome, lista });
      }
      if(n === 'corre_mural_escolher'){
        const m = pelaChave(), p = d.t.corre_mural_propostas.find(x => x.id === a.p_proposta && x.pedido === m.id);
        if(!p || p.st === 'recusada') throw muErr('proposta'); if(p.st === 'escolhida') return { ok: true, whats: p.whats };
        if(d.t.corre_mural_propostas.filter(x => x.pedido === m.id && x.st === 'escolhida').length >= 3) throw muErr('tres');
        p.st = 'escolhida'; p.escolhida_em = now();
        const l = p.lead && d.t.corre_leads.find(x => x.id === p.lead && x.dono === p.dono);
        if(l){ if(m.whats.length === 11) l.wa = m.whats; else l.fixo = m.whats; l.tel = m.whats; if(l.st !== 'fechado') l.st = 'interesse'; l.prox = hojeBR(); l.hist = [{ t: now(), k: 'res', v: 'Mural: ' + String(m.nome).split(' ')[0] + ' escolheu tua proposta. Chama no WhatsApp.' }].concat(l.hist || []).slice(0, 40); }
        return { ok: true, whats: p.whats };
      }
      if(n === 'corre_mural_recusar'){ const m = pelaChave(), p = d.t.corre_mural_propostas.find(x => x.id === a.p_proposta && x.pedido === m.id && x.st === 'enviada'); if(p) p.st = 'recusada'; return { ok: true }; }
      if(n === 'corre_mural_status'){
        const m = pelaChave();
        if(a.p_st === 'apagar'){ d.t.corre_mural = d.t.corre_mural.filter(x => x !== m); d.t.corre_mural_propostas = d.t.corre_mural_propostas.filter(p => p.pedido !== m.id); return { ok: true, st: 'apagado' }; }
        if(a.p_st === 'fechado') m.st = 'fechado'; else if(a.p_st === 'aberto'){ m.st = 'aberto'; if(new Date(m.expira_em) < new Date(Date.now() + 15 * 864e5)) m.expira_em = inH(15 * 24); } else throw muErr('st');
        return { ok: true, st: a.p_st };
      }
      throw { message: 'rpc' };
    }
    /* ---- v3.34: mensagens (mesmas regras do delta-v334.sql). Na demonstração a turma de exemplo responde ---- */
    const BUS = { subs: new Set(), salas: new Set(), bot: new Set() };
    const BOT = {
      ex1: ['Opa! Tô no meio de uma gravação, já te respondo direitinho.', 'Fechado. Me conta o que você precisa que eu monto um orçamento.', 'Boa! Vi teu perfil e curti o trampo.'],
      ex2: ['Salve! Tô editando um corte aqui, já te chamo.', 'Bora. Qual é o prazo?', 'Manda as referências que eu vejo hoje ainda.'],
      ex3: ['Oi! Me conta o que você vende que eu te digo por onde começar.', 'Dá pra começar com pouco: R$ 20 por dia já testa.', 'Show. Te mando um plano amanhã cedo.']
    };
    const parDe = (x, y) => [String(x), String(y)].sort().join(':');
    function conversaCom(d, eu, outro, criar){
      const k = parDe(eu, outro); let c = d.t.corre_conversas.find(x => x.par === k);
      if(!c && criar){
        c = { id: rid(), tipo: 'dm', par: k, criada_por: eu, created_at: now(), ultima_em: null, ultima_txt: '', ultima_de: null }; d.t.corre_conversas.push(c);
        const segue = d.t.corre_seguindo.some(s => s.quem === outro && s.segue === eu);
        d.t.corre_conversa_membros.push({ conversa: c.id, membro: eu, estado: 'aceita', lida_em: null, silenciada: false, apagada_em: null, created_at: now() },
          { conversa: c.id, membro: outro, estado: segue ? 'aceita' : 'pedido', lida_em: null, silenciada: false, apagada_em: null, created_at: now() });
      }
      return c;
    }
    function botFala(d, c, quem, texto, quando){
      const m = { id: rid(), conversa: c.id, dono: quem, texto, midia: '', ref: null, apagada: false, created_at: quando || now() };
      d.t.corre_mensagens.push(m); Object.assign(c, { ultima_em: m.created_at, ultima_txt: texto.slice(0, 120), ultima_de: quem });
      const eu = d.t.corre_conversa_membros.find(x => x.conversa === c.id && x.membro === quem); if(eu){ eu.lida_em = m.created_at; if(eu.estado === 'pedido') eu.estado = 'aceita'; }
      return m;
    }
    /* a primeira vez: a Ana (que você não segue) te chama, e cai nos Pedidos */
    function semente(d, uid){
      d.msgSemente = d.msgSemente || [];
      if(d.msgSemente.includes(uid) || !d.t.corre_perfis.some(p => p.id === 'ex3') || !d.t.corre_perfis.some(p => p.id === uid)) return;
      d.msgSemente.push(uid);
      if(d.t.corre_conversas.some(c => c.par === parDe(uid, 'ex3'))) return;
      const c = conversaCom(d, 'ex3', uid, true);
      botFala(d, c, 'ex3', 'Oi! Vi teu perfil aqui no Corre. Tu faz identidade visual pra ótica? Tô abrindo a segunda loja e quero mudar a fachada.', new Date(Date.now() - 35 * 6e4).toISOString());
    }
    /* ---------- GRUPOS na demonstração: as mesmas regras das funções do banco (delta-v336.sql) ---------- */
    const G_ACENTO = 'áàâãäåéèêëíìîïóòôõöúùûüçñý', G_SEM = 'aaaaaaeeeeiiiiooooouuuucny';
    const gSlug = t => String(t || '').toLowerCase().split('').map(ch => { const i = G_ACENTO.indexOf(ch); return i >= 0 ? G_SEM[i] : ch; }).join('')
      .replace(/[^a-z0-9]+/g, '-').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '').slice(0, 36).replace(/^-+|-+$/g, '');
    const gTags = L => { const out = []; (Array.isArray(L) ? L : []).forEach(x => { const t = String(x || '').trim().toLowerCase().replace(/[^\p{L}\p{N}_-]+/gu, '').slice(0, 24); if(t.length >= 2 && !out.includes(t) && out.length < 5) out.push(t); }); return out; };
    /* o papo e o número de membros acompanham quem tá dentro (o trigger do banco) */
    function gSync(d, g){
      const x = d.t.corre_grupos.find(y => y.id === g); if(!x) return;
      const ativos = d.t.corre_grupo_membros.filter(m => m.grupo === g && m.estado === 'ativo');
      x.membros_n = ativos.length;
      if(!x.conversa) return;
      const ids = new Set(ativos.map(m => m.membro));
      d.t.corre_conversa_membros = d.t.corre_conversa_membros.filter(m => m.conversa !== x.conversa || ids.has(m.membro));
      ids.forEach(u => { if(!d.t.corre_conversa_membros.some(m => m.conversa === x.conversa && m.membro === u)) d.t.corre_conversa_membros.push({ conversa: x.conversa, membro: u, estado: 'aceita', lida_em: now(), silenciada: false, apagada_em: null, created_at: now() }); });
    }
    const gPub = (p, uid, sempre) => p && (sempre || p.visibilidade === 'publico' || p.id === uid) ? { id: p.id, handle: p.handle, nome: p.nome, avatar_url: p.avatar_url || '', faz: p.faz || '' } : { nome: 'Perfil mocado' };
    const gOrd = x => (x.papel === 'dono' ? 0 : x.papel === 'mod' ? 1 : 2);
    function gVer(d, g, uid){
      if(!g) return null;
      const m = uid ? d.t.corre_grupo_membros.find(x => x.grupo === g.id && x.membro === uid) : null, ve = !g.fechado || !!(m && m.estado === 'ativo');
      const rosto = ve ? d.t.corre_grupo_membros.filter(x => x.grupo === g.id && x.estado === 'ativo').sort((a, b) => gOrd(a) - gOrd(b) || String(a.created_at).localeCompare(String(b.created_at)))
        .map(x => d.t.corre_perfis.find(p => p.id === x.membro)).filter(p => p && p.visibilidade === 'publico').slice(0, 8).map(p => ({ id: p.id, handle: p.handle, nome: p.nome, avatar_url: p.avatar_url || '' })) : [];
      return { id: g.id, slug: g.slug, nome: g.nome, descricao: g.descricao, regras: g.regras, tags: g.tags.slice(), cor: g.cor, capa_url: g.capa_url, fechado: g.fechado,
        membros_n: g.membros_n, created_at: g.created_at, ativo_em: g.ativo_em, ve, fixo: ve ? g.fixo || null : null,
        dono: gPub(d.t.corre_perfis.find(p => p.id === g.dono), uid), eu: m ? { papel: m.papel, estado: m.estado } : null,
        pedidos: m && m.estado === 'ativo' && (m.papel === 'dono' || m.papel === 'mod') ? d.t.corre_grupo_membros.filter(x => x.grupo === g.id && x.estado === 'pedido').length : null, rosto };
    }
    /* na demonstração, o dono de exemplo aceita o pedido em uns segundos (pra dar pra ver o caminho inteiro) */
    function gDemoAceita(g, u){
      setTimeout(() => {
        const d = read(), x = d.t.corre_grupos.find(y => y.id === g), m = x && d.t.corre_grupo_membros.find(y => y.grupo === g && y.membro === u && y.estado === 'pedido');
        const dono = x && d.t.corre_perfis.find(p => p.id === x.dono);
        if(!m || !dono || !dono.ex) return;
        Object.assign(m, { estado: 'ativo', aceito_por: dono.id, aceito_em: now() }); gSync(d, g); write(d);
        try{ window.dispatchEvent(new CustomEvent('corre-demo-grupo', { detail: { grupo: g, slug: x.slug, nome: x.nome, quem: dono.nome } })); }catch(e){}
      }, 3500);
    }
    /* a turma de exemplo também conversa no papo do grupo */
    const GBOT = ['Boa! Alguém mais testou isso?', 'Salvei aqui pra ver depois.', 'Semana passada aconteceu igualzinho comigo.', 'Fechou. Bora testar e trazer os números aqui.', 'Isso vale ouro, valeu por mandar.'];
    function gBotResponde(cid, g, autor){
      if(BUS.bot.has(cid)) return; BUS.bot.add(cid);
      setTimeout(() => BUS.salas.forEach(sl => { if(sl.id === cid && sl.h.dig) try{ sl.h.dig({ u: 'ex' }); }catch(e){} }), 900);
      setTimeout(() => {
        BUS.bot.delete(cid);
        const d = read(), c = d.t.corre_conversas.find(x => x.id === cid); if(!c) return;
        const exs = d.t.corre_grupo_membros.filter(m => m.grupo === g && m.estado === 'ativo' && m.membro !== autor && (d.t.corre_perfis.find(p => p.id === m.membro) || {}).ex);
        if(!exs.length) return;
        const quem = exs[Math.floor(Math.random() * exs.length)].membro, pf = d.t.corre_perfis.find(x => x.id === quem) || {};
        const ditas = d.t.corre_mensagens.filter(k => k.conversa === cid && k.dono === quem).length;
        const m = { id: rid(), conversa: cid, dono: quem, texto: GBOT[ditas % GBOT.length], midia: '', ref: null, apagada: false, created_at: now() };
        d.t.corre_mensagens.push(m); Object.assign(c, { ultima_em: m.created_at, ultima_txt: ((String(pf.nome || '').split(' ')[0] || 'Alguém') + ': ' + m.texto).slice(0, 140), ultima_de: quem });
        const eu = d.t.corre_conversa_membros.find(x => x.conversa === cid && x.membro === quem); if(eu) eu.lida_em = m.created_at;
        write(d);
        BUS.subs.forEach(f => f('ins', Object.assign({}, m)));
      }, 2600 + Math.round(Math.random() * 900));
    }
    function grupoRpc(n, a, d, uid){
      const G = d.t.corre_grupos, GM = d.t.corre_grupo_membros, err = h => ({ message: h, hint: h }), proibido = h => ({ message: h, hint: h, code: '42501' });
      const papel = g => { const m = gMembro(d, g, uid); return m ? m.papel : null; };
      const capaOk = u => !u || /^data:image\//.test(u) || (String(u).length <= 500 && /^https:\/\/[a-z0-9.-]+\/storage\/v1\/object\/public\/corre\/\S+$/.test(u));
      const meuJ = g => { const m = uid && GM.find(x => x.grupo === g.id && x.membro === uid); return m ? { papel: m.papel, estado: m.estado } : null; };
      const linha = g => ({ id: g.id, slug: g.slug, nome: g.nome, descricao: g.descricao, tags: g.tags.slice(), cor: g.cor, capa_url: g.capa_url, fechado: g.fechado, membros_n: g.membros_n, ativo_em: g.ativo_em, eu: meuJ(g) });
      const novoMembro = (g, u, papelX, estado, recado) => GM.push({ grupo: g, membro: u, papel: papelX, estado, recado: recado || '', aceito_por: null, aceito_em: null, created_at: now() });
      if(n === 'corre_grupo_ver') return gVer(d, G.find(g => g.slug === String(a.p_slug || '').trim().toLowerCase()), uid);
      if(n === 'corre_grupos_lista'){
        const b = String(a.p_busca || '').trim().toLowerCase();
        const ok = g => !b || g.nome.toLowerCase().includes(b) || g.descricao.toLowerCase().includes(b) || g.tags.includes(b) || (gSlug(b) && g.slug.includes(gSlug(b)));
        const meu = g => { const m = meuJ(g); return m && (m.estado === 'ativo' || m.estado === 'pedido') ? 1 : 0; };
        return G.filter(ok).sort((x, y) => meu(y) - meu(x) || y.membros_n - x.membros_n || String(y.ativo_em).localeCompare(String(x.ativo_em))).slice(0, Math.min(Math.max(Number(a.p_lim) || 60, 1), 200)).map(linha);
      }
      if(n === 'corre_grupos_de'){
        const p = d.t.corre_perfis.find(x => x.id === a.p_perfil); if(!p || !veDados(d, p.id, uid)) return [];
        return GM.filter(m => m.membro === p.id && m.estado === 'ativo').map(m => ({ m, g: G.find(x => x.id === m.grupo) })).filter(o => o.g && gVe(d, o.g.id, uid))
          .sort((x, y) => (x.m.papel === 'dono' ? 0 : 1) - (y.m.papel === 'dono' ? 0 : 1) || y.g.membros_n - x.g.membros_n)
          .map(o => ({ id: o.g.id, slug: o.g.slug, nome: o.g.nome, cor: o.g.cor, capa_url: o.g.capa_url, fechado: o.g.fechado, membros_n: o.g.membros_n, papel: o.m.papel }));
      }
      if(n === 'corre_grupo_membros_lista'){
        const est = a.p_estado || 'ativo'; if(!['ativo', 'pedido', 'banido'].includes(est)) throw err('estado');
        if(est !== 'ativo' && !gMod(d, a.p_grupo, uid)) throw proibido('mod');
        if(est === 'ativo' && !gVe(d, a.p_grupo, uid)) return [];
        return GM.filter(m => m.grupo === a.p_grupo && m.estado === est).sort((x, y) => gOrd(x) - gOrd(y) || String(x.created_at).localeCompare(String(y.created_at)))
          .map(m => { const p = d.t.corre_perfis.find(x => x.id === m.membro); return p ? { id: m.membro, papel: m.papel, estado: m.estado, desde: m.created_at, recado: est === 'pedido' ? m.recado || '' : '', perfil: gPub(p, uid, est !== 'ativo') } : null; }).filter(Boolean);
      }
      if(!uid || !d.t.corre_perfis.some(p => p.id === uid)) throw proibido('perfil');
      if(n === 'corre_grupo_criar'){
        const nm = String(a.p_nome || '').replace(/\s+/g, ' ').trim();
        if(nm.length < 3 || nm.length > 60) throw err('nome');
        if(G.filter(g => g.dono === uid).length >= 10) throw err('limite_grupos');
        if(G.filter(g => g.dono === uid && Date.now() - Date.parse(g.created_at) < 864e5).length >= 3) throw err('limite_dia');
        if(!capaOk(a.p_capa_url)) throw err('capa');
        let base = gSlug(nm); if(base.length < 3) base = ('grupo-' + base).replace(/-+$/, '');
        let sl = base, i = 1; while(G.some(g => g.slug === sl)){ i++; sl = base.slice(0, 33).replace(/-+$/, '') + '-' + i; }
        const c = { id: rid(), tipo: 'grupo', par: null, criada_por: uid, created_at: now(), ultima_em: null, ultima_txt: '', ultima_de: null };
        d.t.corre_conversas.push(c);
        const g = { id: rid(), slug: sl, nome: nm, descricao: String(a.p_descricao || '').trim().slice(0, 300), regras: String(a.p_regras || '').trim().slice(0, 1500), tags: gTags(a.p_tags),
          cor: /^#[0-9a-f]{6}$/i.test(a.p_cor || '') ? a.p_cor.toUpperCase() : '#2E5BFF', capa_url: a.p_capa_url || '', fechado: !!a.p_fechado, dono: uid, conversa: c.id, fixo: null, membros_n: 0, ativo_em: now(), created_at: now() };
        G.push(g); novoMembro(g.id, uid, 'dono', 'ativo'); gSync(d, g.id);
        write(d); return gVer(d, g, uid);
      }
      if(n === 'corre_grupo_editar'){
        const g = G.find(x => x.id === a.p_grupo); if(!g || papel(g.id) !== 'dono') throw proibido('dono');
        const nm = String(a.p_nome || '').replace(/\s+/g, ' ').trim(); if(nm.length < 3 || nm.length > 60) throw err('nome');
        if(!capaOk(a.p_capa_url)) throw err('capa');
        Object.assign(g, { nome: nm, descricao: String(a.p_descricao || '').trim().slice(0, 300), regras: String(a.p_regras || '').trim().slice(0, 1500), tags: gTags(a.p_tags),
          cor: /^#[0-9a-f]{6}$/i.test(a.p_cor || '') ? a.p_cor.toUpperCase() : g.cor, capa_url: a.p_capa_url || '', fechado: a.p_fechado == null ? g.fechado : !!a.p_fechado });
        if(!g.fechado) GM.forEach(m => { if(m.grupo === g.id && m.estado === 'pedido') Object.assign(m, { estado: 'ativo', aceito_por: uid, aceito_em: now() }); });
        gSync(d, g.id); write(d); return gVer(d, g, uid);
      }
      if(n === 'corre_grupo_entrar'){
        const g = G.find(x => x.id === a.p_grupo); if(!g) throw err('grupo');
        const m = GM.find(x => x.grupo === g.id && x.membro === uid), rec = String(a.p_recado || '').trim().slice(0, 200);
        if(m && m.estado === 'banido') throw err('banido');
        if(m && m.estado === 'ativo') return { estado: 'ativo', papel: m.papel };
        if(GM.filter(x => x.membro === uid && x.estado === 'ativo').length >= 100) throw err('limite_entrar');
        if(g.fechado){
          if(!m && GM.filter(x => x.membro === uid && x.estado === 'pedido').length >= 20) throw err('limite_pedidos');
          if(m) m.recado = rec; else novoMembro(g.id, uid, 'membro', 'pedido', rec);
          write(d); gDemoAceita(g.id, uid); return { estado: 'pedido', papel: 'membro' };
        }
        if(m) m.estado = 'ativo'; else novoMembro(g.id, uid, 'membro', 'ativo');
        gSync(d, g.id); write(d); return { estado: 'ativo', papel: 'membro' };
      }
      if(n === 'corre_grupo_sair'){
        const m = GM.find(x => x.grupo === a.p_grupo && x.membro === uid); if(!m) return { estado: null };
        if(m.estado === 'banido') throw err('banido'); if(m.papel === 'dono') throw err('dono');
        d.t.corre_grupo_membros = GM.filter(x => x !== m); gSync(d, a.p_grupo); write(d); return { estado: null };
      }
      if(n === 'corre_grupo_decide'){
        const meu = papel(a.p_grupo); if(meu !== 'dono' && meu !== 'mod') throw proibido('mod');
        if(a.p_membro === uid) throw err('eu');
        const alvo = GM.find(x => x.grupo === a.p_grupo && x.membro === a.p_membro), ac = a.p_acao;
        const tira = () => { d.t.corre_grupo_membros = d.t.corre_grupo_membros.filter(x => x !== alvo); };
        if(!alvo){
          if(ac !== 'banir' || !d.t.corre_perfis.some(p => p.id === a.p_membro)) throw err('membro');
          novoMembro(a.p_grupo, a.p_membro, 'membro', 'banido');
        }else{
          if(alvo.papel === 'dono') throw proibido('dono');
          if(alvo.papel === 'mod' && meu !== 'dono') throw proibido('mod');
          if(ac === 'aceitar'){ if(alvo.estado !== 'pedido') throw err('estado'); Object.assign(alvo, { estado: 'ativo', aceito_por: uid, aceito_em: now() }); }
          else if(ac === 'recusar'){ if(alvo.estado !== 'pedido') throw err('estado'); tira(); }
          else if(ac === 'tirar'){ if(alvo.estado !== 'ativo') throw err('estado'); tira(); }
          else if(ac === 'banir') Object.assign(alvo, { estado: 'banido', papel: 'membro' });
          else if(ac === 'desbanir'){ if(alvo.estado !== 'banido') throw err('estado'); tira(); }
          else if(['mod', 'desmod', 'dono'].includes(ac)){
            if(meu !== 'dono') throw proibido('dono');
            if(alvo.estado !== 'ativo') throw err('estado');
            if(ac === 'mod') alvo.papel = 'mod'; else if(ac === 'desmod') alvo.papel = 'membro';
            else { GM.find(x => x.grupo === a.p_grupo && x.membro === uid).papel = 'mod'; alvo.papel = 'dono'; G.find(x => x.id === a.p_grupo).dono = a.p_membro; }
          }else throw err('acao');
        }
        gSync(d, a.p_grupo); write(d); return { ok: true, acao: ac };
      }
      /* tira um post (e o que pendura nele): o fio, os "fortaleceu", as respostas e as curtidas; citação fica sem o original */
      const tiraPosts = ids => {
        d.t.corre_feed.forEach(x => { if(x.fio && ids.has(x.fio)) ids.add(x.id); });
        d.t.corre_feed.forEach(x => { if(x.alvo && ids.has(x.alvo) && x.tipo === 'fortalece' && !x.texto && !x.midia_url) ids.add(x.id); });
        d.t.corre_feed = d.t.corre_feed.filter(x => !ids.has(x.id));
        d.t.corre_feed.forEach(x => { if(ids.has(x.alvo)) x.alvo = null; });
        d.t.corre_comentarios = d.t.corre_comentarios.filter(c => !ids.has(c.post_id)); d.t.corre_curtidas = d.t.corre_curtidas.filter(c => !ids.has(c.post_id));
        d.t.corre_grupos.forEach(g => { if(ids.has(g.fixo)) g.fixo = null; });
      };
      if(n === 'corre_grupo_tira_post'){
        const f = d.t.corre_feed.find(x => x.id === a.p_post); if(!f || !f.grupo) throw err('post');
        if(!(f.dono === uid || gMod(d, f.grupo, uid))) throw proibido('mod');
        tiraPosts(new Set([f.id])); write(d); return { ok: true };
      }
      if(n === 'corre_grupo_tira_resp'){
        const c = d.t.corre_comentarios.find(x => x.id === a.p_resp), f = c && d.t.corre_feed.find(x => x.id === c.post_id);
        if(!c || !f || !f.grupo) throw err('resposta');
        if(!(c.dono === uid || gMod(d, f.grupo, uid))) throw proibido('mod');
        const fora = new Set([c.id]); let mudou = true;
        while(mudou){ mudou = false; d.t.corre_comentarios.forEach(x => { if(x.pai && fora.has(x.pai) && !fora.has(x.id)){ fora.add(x.id); mudou = true; } }); }
        d.t.corre_comentarios = d.t.corre_comentarios.filter(x => !fora.has(x.id)); write(d); return { ok: true };
      }
      if(n === 'corre_grupo_fixa'){
        if(!gMod(d, a.p_grupo, uid)) throw proibido('mod');
        if(a.p_post){ const f = d.t.corre_feed.find(x => x.id === a.p_post); if(!f || f.grupo !== a.p_grupo || f.fio || (f.tipo === 'fortalece' && !f.texto && !f.midia_url)) throw err('fixo'); }
        const g = G.find(x => x.id === a.p_grupo); g.fixo = a.p_post || null; write(d); return { fixo: g.fixo };
      }
      if(n === 'corre_grupo_apagar'){
        const g = G.find(x => x.id === a.p_grupo); if(!g) throw err('grupo'); if(g.dono !== uid) throw proibido('dono');
        tiraPosts(new Set(d.t.corre_feed.filter(f => f.grupo === g.id).map(f => f.id)));
        d.t.corre_grupo_membros = d.t.corre_grupo_membros.filter(m => m.grupo !== g.id); d.t.corre_grupos = d.t.corre_grupos.filter(x => x !== g);
        if(g.conversa){ d.t.corre_conversas = d.t.corre_conversas.filter(c => c.id !== g.conversa); d.t.corre_conversa_membros = d.t.corre_conversa_membros.filter(m => m.conversa !== g.conversa); d.t.corre_mensagens = d.t.corre_mensagens.filter(m => m.conversa !== g.conversa); }
        write(d); return { ok: true };
      }
      if(n === 'corre_grupo_papo'){
        const g = G.find(x => x.slug === String(a.p_slug || '').trim().toLowerCase()); if(!g) throw err('grupo');
        if(!gMembro(d, g.id, uid)) throw { message: 'grupo', hint: 'fora', code: '42501' };
        if(!g.conversa){ const c = { id: rid(), tipo: 'grupo', par: null, criada_por: g.dono, created_at: now(), ultima_em: null, ultima_txt: '', ultima_de: null }; d.t.corre_conversas.push(c); g.conversa = c.id; }
        gSync(d, g.id); write(d);
        const me = d.t.corre_conversa_membros.find(m => m.conversa === g.conversa && m.membro === uid);
        return { conversa: g.conversa, tipo: 'grupo', grupo: { id: g.id, slug: g.slug, nome: g.nome, cor: g.cor, capa_url: g.capa_url, membros_n: g.membros_n, fechado: g.fechado },
          eu: { estado: 'aceita', silenciada: !!me.silenciada, apagada_em: me.apagada_em || null, lida_em: me.lida_em || null }, ele: { estado: 'aceita', lida_em: null }, bloqueei: false };
      }
      throw { message: 'rpc' };
    }
    function msgRpc(n, a, d, uid){
      const MB = d.t.corre_conversa_membros, MS = d.t.corre_mensagens;
      const mb = (c, m) => MB.find(x => x.conversa === c && x.membro === m), dele = (c, m) => MB.find(x => x.conversa === c && x.membro !== m);
      const bloq = (dono, quem) => d.t.corre_verso_bloq.some(b => b.dono === dono && b.quem === quem);
      const segue = (quem, alvo) => d.t.corre_seguindo.some(s => s.quem === quem && s.segue === alvo);
      const err = h => ({ message: h, hint: h });
      const pub = p => ({ id: p.id, handle: p.handle, nome: p.nome, avatar_url: p.avatar_url || '', aberto: !!p.aberto, faz: p.faz || '' });
      const naoLidas = (m, c, grupo) => MS.filter(k => k.conversa === c && k.dono !== m.membro && !k.apagada && k.created_at > ([m.lida_em, m.apagada_em].filter(Boolean).sort().pop() || '') && !(grupo && bloq(m.membro, k.dono))).length;
      const ehGrupo = c => !!c && c.tipo === 'grupo';
      if(!uid) throw { message: 'login', hint: 'login', code: '42501' };
      semente(d, uid);
      if(n === 'corre_msg_abrir'){
        const h = String(a.p_handle || '').replace(/^@/, '').trim().toLowerCase(), o = d.t.corre_perfis.find(p => p.handle === h);
        if(!o) throw err('perfil'); if(o.id === uid) throw err('eu');
        let c = d.t.corre_conversas.find(x => x.par === parDe(uid, o.id));
        if(!c){
          if(o.visibilidade !== 'publico') throw err('perfil');
          if(d.t.corre_conversas.filter(x => x.criada_por === uid && Date.now() - Date.parse(x.created_at) < 864e5).length >= 60) throw err('limite_conversas');
          c = conversaCom(d, uid, o.id, true);
        }
        const eu = mb(c.id, uid), ele = mb(c.id, o.id);
        return { conversa: c.id, outro: pub(o), eu: { estado: eu.estado, silenciada: eu.silenciada, apagada_em: eu.apagada_em, lida_em: eu.lida_em }, ele: { estado: ele.estado, lida_em: ele.estado === 'aceita' ? ele.lida_em : null },
          bloqueei: bloq(uid, o.id), me_segue: segue(o.id, uid), sigo: segue(uid, o.id) };
      }
      if(n === 'corre_msg_enviar' && ehGrupo(d.t.corre_conversas.find(x => x.id === a.p_conversa))){
        const c = d.t.corre_conversas.find(x => x.id === a.p_conversa), eu = mb(c.id, uid), g = d.t.corre_grupos.find(x => x.conversa === c.id);
        if(!eu || !g || !gMembro(d, g.id, uid)) throw { message: 'grupo', hint: 'fora', code: '42501' };
        const t = String(a.p_texto || '').trim(), md = String(a.p_midia || ''), ref = a.p_ref || null;
        if(t.length > 2000) throw err('texto');
        if(md && !/^data:image\//.test(md) && !new RegExp('^' + c.id + '/[A-Za-z0-9_-]{6,80}\\.jpg$').test(md)) throw err('midia');
        if(ref && !(typeof ref === 'object' && ['post', 'perfil'].includes(ref.tipo))) throw err('ref');
        if(!t && !md && !ref) throw err('vazia');
        if(MS.filter(k => k.dono === uid && Date.now() - Date.parse(k.created_at) < 6e4).length >= 30) throw err('devagar');
        const m = { id: rid(), conversa: c.id, dono: uid, texto: t, midia: md, ref, apagada: false, created_at: now() };
        const pf = d.t.corre_perfis.find(p => p.id === uid) || {}, prev = t ? t.replace(/\s+/g, ' ').slice(0, 120) : md ? 'Foto' : ref.tipo === 'post' ? 'Post' : 'Perfil';
        MS.push(m); Object.assign(c, { ultima_em: m.created_at, ultima_txt: (((pf.visibilidade === 'publico' ? String(pf.nome || '').trim().split(' ')[0] : 'Perfil mocado') || 'Alguém') + ': ' + prev).slice(0, 140), ultima_de: uid });
        eu.lida_em = m.created_at; g.ativo_em = now();
        gBotResponde(c.id, g.id, uid);
        BUS.subs.forEach(f => setTimeout(() => f('ins', Object.assign({}, m)), 0));
        return Object.assign({}, m);
      }
      if(n === 'corre_msg_enviar'){
        const c = d.t.corre_conversas.find(x => x.id === a.p_conversa), eu = c && mb(c.id, uid), ele = c && dele(c.id, uid);
        if(!eu || !ele) throw err('conversa');
        if(bloq(uid, ele.membro)) throw err('voce_bloqueou');
        if(ele.estado === 'recusada' || bloq(ele.membro, uid)) throw err('nao_recebe');
        const t = String(a.p_texto || '').trim(), md = String(a.p_midia || ''), ref = a.p_ref || null;
        if(t.length > 2000) throw err('texto');
        if(md && !/^data:image\//.test(md) && !new RegExp('^' + c.id + '/[A-Za-z0-9_-]{6,80}\\.jpg$').test(md)) throw err('midia');
        if(ref && !(typeof ref === 'object' && ['post', 'perfil'].includes(ref.tipo))) throw err('ref');
        if(!t && !md && !ref) throw err('vazia');
        if(MS.filter(k => k.dono === uid && Date.now() - Date.parse(k.created_at) < 6e4).length >= 30) throw err('devagar');
        if(ele.estado === 'pedido' && segue(ele.membro, uid)) ele.estado = 'aceita';
        if(ele.estado === 'pedido' && MS.filter(k => k.conversa === c.id && k.dono === uid).length >= 5) throw err('espera_aceitar');
        const m = { id: rid(), conversa: c.id, dono: uid, texto: t, midia: md, ref, apagada: false, created_at: now() };
        MS.push(m); Object.assign(c, { ultima_em: m.created_at, ultima_txt: t ? t.replace(/\s+/g, ' ').slice(0, 120) : md ? 'Foto' : ref.tipo === 'post' ? 'Post' : 'Perfil', ultima_de: uid });
        eu.lida_em = m.created_at; if(eu.estado === 'pedido') eu.estado = 'aceita';
        const o = d.t.corre_perfis.find(p => p.id === ele.membro);
        if(o && o.ex && BOT[o.id] && !BUS.bot.has(c.id)) botResponde(c.id, o.id);
        BUS.subs.forEach(f => setTimeout(() => f('ins', Object.assign({}, m)), 0));
        return Object.assign({}, m);
      }
      if(n === 'corre_msg_caixa'){
        return MB.filter(m => m.membro === uid && m.estado !== 'recusada').map(m => {
          const c = d.t.corre_conversas.find(x => x.id === m.conversa);
          if(ehGrupo(c)){
            const g = d.t.corre_grupos.find(x => x.conversa === c.id);
            if(!g || !c.ultima_em || (m.apagada_em && !(c.ultima_em > m.apagada_em))) return null;
            return { id: c.id, tipo: 'grupo', ultima_em: c.ultima_em, ultima_txt: c.ultima_txt, minha: c.ultima_de === uid, estado: m.estado, silenciada: !!m.silenciada, ele_estado: null, ele_lida_em: null,
              nao_lidas: naoLidas(m, c.id, true), bloqueei: false, outro: null, grupo: { id: g.id, slug: g.slug, nome: g.nome, cor: g.cor, capa_url: g.capa_url, membros_n: g.membros_n } };
          }
          const o = c && dele(c.id, uid), p = o && d.t.corre_perfis.find(x => x.id === o.membro);
          if(!c || !c.ultima_em || !p || (m.apagada_em && !(c.ultima_em > m.apagada_em))) return null;
          return { id: c.id, tipo: 'dm', ultima_em: c.ultima_em, ultima_txt: c.ultima_txt, minha: c.ultima_de === uid, estado: m.estado, silenciada: !!m.silenciada, ele_estado: o.estado, ele_lida_em: o.estado === 'aceita' ? o.lida_em : null,
            nao_lidas: naoLidas(m, c.id), bloqueei: bloq(uid, o.membro), outro: pub(p) };
        }).filter(Boolean).sort((x, y) => String(y.ultima_em).localeCompare(String(x.ultima_em))).slice(0, Math.min(Math.max(Number(a.p_lim) || 100, 1), 300));
      }
      if(n === 'corre_msg_lista'){
        const eu = mb(a.p_conversa, uid); if(!eu) return [];
        const gr = ehGrupo(d.t.corre_conversas.find(x => x.id === a.p_conversa));
        return MS.filter(k => k.conversa === a.p_conversa && (!eu.apagada_em || k.created_at > eu.apagada_em) && (!a.p_antes || k.created_at < a.p_antes) && !(gr && bloq(uid, k.dono)))
          .sort((x, y) => String(y.created_at).localeCompare(String(x.created_at))).slice(0, Math.min(Math.max(Number(a.p_lim) || 50, 1), 100)).map(k => Object.assign({}, k));
      }
      if(n === 'corre_msg_lida'){ const eu = mb(a.p_conversa, uid), t = now(); if(eu && eu.estado === 'aceita') eu.lida_em = t; return t; }
      if(n === 'corre_msg_estado'){
        const eu = mb(a.p_conversa, uid); if(!eu) throw err('conversa');
        const ac = a.p_acao;
        if(ac === 'aceitar'){ eu.estado = 'aceita'; eu.lida_em = now(); } else if(ac === 'recusar') eu.estado = 'recusada'; else if(ac === 'silenciar') eu.silenciada = true; else if(ac === 'dessilenciar') eu.silenciada = false;
        else if(ac === 'apagar'){ eu.apagada_em = now(); eu.lida_em = eu.apagada_em; } else throw err('acao');
        return { estado: eu.estado, silenciada: eu.silenciada, apagada_em: eu.apagada_em };
      }
      if(n === 'corre_msg_apagar'){
        const m = MS.find(k => k.id === a.p_msg && k.dono === uid); if(!m) throw err('mensagem');
        const antiga = m.midia; Object.assign(m, { texto: '', midia: '', ref: null, apagada: true });
        const c = d.t.corre_conversas.find(x => x.id === m.conversa); if(c && c.ultima_em === m.created_at) c.ultima_txt = 'Mensagem apagada';
        BUS.subs.forEach(f => setTimeout(() => f('upd', Object.assign({}, m)), 0));
        return Object.assign({ midia_antiga: antiga }, m);
      }
      if(n === 'corre_msg_badge'){
        const minhas = MB.filter(m => m.membro === uid && m.estado !== 'recusada').map(m => { const c = d.t.corre_conversas.find(x => x.id === m.conversa); if(ehGrupo(c)) return c.ultima_em ? { m, n: naoLidas(m, c.id, true) } : null; const o = c && dele(c.id, uid); return c && c.ultima_em && o && !bloq(uid, o.membro) ? { m, n: naoLidas(m, c.id) } : null; }).filter(Boolean);
        return { n: minhas.filter(x => x.m.estado === 'aceita' && !x.m.silenciada).reduce((s, x) => s + x.n, 0), conversas: minhas.filter(x => x.m.estado === 'aceita' && !x.m.silenciada && x.n).length, pedidos: minhas.filter(x => x.m.estado === 'pedido' && x.n).length };
      }
      throw { message: 'rpc' };
    }
    /* a turma de exemplo "digita", lê e responde (uma resposta por vez) */
    function botResponde(cid, exId){
      BUS.bot.add(cid);
      const sala = f => BUS.salas.forEach(s => { if(s.id === cid) try{ f(s.h); }catch(e){} });
      setTimeout(() => sala(h => { if(h.aqui) h.aqui([exId]); if(h.dig) h.dig({ u: exId }); }), 700);
      setTimeout(() => {
        BUS.bot.delete(cid);
        const d = read(), c = d.t.corre_conversas.find(x => x.id === cid); if(!c) return;
        const ditas = d.t.corre_mensagens.filter(k => k.conversa === cid && k.dono === exId).length, L = BOT[exId];
        const m = botFala(d, c, exId, L[ditas % L.length]); write(d);
        sala(h => { if(h.li) h.li({ u: exId, em: m.created_at }); });
        BUS.subs.forEach(f => f('ins', Object.assign({}, m)));
        setTimeout(() => sala(h => { if(h.aqui) h.aqui([]); }), 2500);
      }, 2100 + Math.round(Math.random() * 600));
    }
    let cb = null;
    const wait = ms => new Promise(r => setTimeout(r, ms));
    return {
      async init(){ return read().user; },
      onAuth(f){ cb = f; },
      async login(){
        await wait(300);
        const d = read(); d.user = { id: 'demo-voce', email: 'voce@exemplo.com', user_metadata: { full_name: 'Você no Corre', avatar_url: '' } };
        write(d); cb && cb(d.user, 'SIGNED_IN');
      },
      async logout(){ const d = read(); d.user = null; write(d); cb && cb(null, 'SIGNED_OUT'); },
      async q(t, o){ return select(t, o || {}, read()); },
      async one(t, o){ return select(t, o || {}, read())[0] || null; },
      async ins(t, rows){
        const d = read(), uid = uidOf(d), out = [];
        [].concat(rows).forEach(row => {
          const r = Object.assign({ created_at: now() }, row);
          if(t === 'corre_seguindo'){ r.quem = uid; }
          else if(t !== 'corre_perfis'){ r.dono = uid; if(!['corre_rolo_salvos', 'corre_curtidas', 'corre_story_curtidas'].includes(t) && !r.id) r.id = rid(); }
          else { r.plano = 'gratis'; r.redes = 1; r.id = uid; }
          if(t === 'corre_stories'){ r.expira_em = inH(24); r.destaque_id = r.destaque_id || null; }
          rules(t, r, d, true); d.t[t].push(r); out.push(Object.assign({}, r));
        });
        write(d); return out;
      },
      async upsert(t, rows, onConflict, ignore){
        const d = read(), uid = uidOf(d), keys = onConflict.split(','), out = [];
        rows.forEach(row => {
          const r = Object.assign({ id: rid(), dono: uid, created_at: now() }, row);
          const hit = d.t[t].find(x => x.dono === uid && keys.every(k => x[k] === r[k]));
          if(hit){ if(!ignore){ Object.assign(hit, row); out.push(Object.assign({}, hit)); } return; }
          rules(t, r, d, true); d.t[t].push(r); out.push(Object.assign({}, r));
        });
        write(d); return out;
      },
      async upd(t, m, patch){
        const d = read(), uid = uidOf(d), out = [];
        if(t === 'corre_recomendacoes'){
          if(Object.keys(patch).some(k => k !== 'status') || !['pendente', 'aceita', 'oculta'].includes(patch.status)) throw { message: 'recomendacao', hint: 'recomendacao' };
          d.t[t].forEach(r => { if(r.para === uid && Object.entries(m).every(([k, v]) => r[k] === v)){ r.status = patch.status; out.push(Object.assign({}, r)); } });
          write(d); return out;
        }
        if(t === 'corre_votos') return out;
        if(t === 'corre_houzi_marcas' && Object.keys(patch).some(k => !['nome', 'spec', 'voz', 'naming', 'publica'].includes(k))) throw { message: 'permission denied', code: '42501' };
        d.t[t].forEach(r => {
          const own = t === 'corre_perfis' ? r.id === uid : r.dono === uid;
          if(!own || !Object.entries(m).every(([k, v]) => r[k] === v)) return;
          const next = Object.assign({}, r, patch);
          if(t === 'corre_perfis'){ next.plano = r.plano; next.redes = r.redes; }
          if(t === 'corre_stories'){ next.expira_em = r.expira_em; next.created_at = r.created_at; }
          if(t === 'corre_houzi_marcas'){ next.updated_at = now(); next.slug = r.slug; next.numero = r.numero; if(['nome', 'spec', 'voz', 'naming'].some(k => k in patch)) plTrava(d, uid, 'houzi'); }
          rules(t, next, d, false); Object.assign(r, next); out.push(Object.assign({}, r));
        });
        write(d); return out;
      },
      async del(t, m){
        const d = read(), uid = uidOf(d);
        const dona = r => t === 'corre_perfis' ? r.id === uid : t === 'corre_seguindo' ? r.quem === uid : t === 'corre_comentarios' ? (r.dono === uid || d.t.corre_feed.some(f => f.id === r.post_id && f.dono === uid)) : t === 'corre_recomendacoes' ? (r.dono === uid || r.para === uid) : t === 'corre_votos' ? false : r.dono === uid;
        const kill = r => dona(r) && Object.entries(m).every(([k, v]) => r[k] === v);
        if(t === 'corre_perfis' && d.t.corre_perfis.some(kill)) T.forEach(x => { if(x !== 'corre_perfis') d.t[x] = d.t[x].filter(r => r.dono !== uid && r.quem !== uid && r.segue !== uid); });
        if(t === 'corre_feed'){
          let ids = d.t.corre_feed.filter(kill).map(f => f.id);
          /* o fio vai junto com o post que começa ele */
          ids = ids.concat(d.t.corre_feed.filter(f => f.fio && ids.includes(f.fio)).map(f => f.id));
          d.t.corre_feed = d.t.corre_feed.filter(f => !(f.fio && ids.includes(f.fio)));
          /* post apagado: os "fortaleceu" dele somem; as citações ficam sem o post */
          const rts = d.t.corre_feed.filter(f => ids.includes(f.alvo) && f.tipo === 'fortalece' && !f.texto && !f.midia_url).map(f => f.id);
          d.t.corre_feed = d.t.corre_feed.filter(f => !rts.includes(f.id));
          d.t.corre_feed.forEach(f => { if(ids.includes(f.alvo)) f.alvo = null; });
          ids = ids.concat(rts);
          d.t.corre_curtidas = d.t.corre_curtidas.filter(c => !ids.includes(c.post_id)); d.t.corre_comentarios = d.t.corre_comentarios.filter(c => !ids.includes(c.post_id));
          ['corre_votos', 'corre_salvos', 'corre_feed_vistas'].forEach(x => { d.t[x] = (d.t[x] || []).filter(c => !ids.includes(c.post_id)); });
        }
        if(t === 'corre_comentarios'){
          const fora = new Set(d.t.corre_comentarios.filter(kill).map(c => c.id)); let m = true;
          while(m){ m = false; d.t.corre_comentarios.forEach(c => { if(c.pai && fora.has(c.pai) && !fora.has(c.id)){ fora.add(c.id); m = true; } }); }
          d.t.corre_comentarios = d.t.corre_comentarios.filter(c => !fora.has(c.id));
        }
        if(t === 'corre_portfolio'){ const ids = d.t.corre_portfolio.filter(kill).map(x => x.id); d.t.corre_posts = d.t.corre_posts.filter(x => !ids.includes(x.marca_id)); d.t.corre_visitas = d.t.corre_visitas.filter(x => !ids.includes(x.marca_id)); d.t.corre_produtos = (d.t.corre_produtos || []).filter(x => !ids.includes(x.marca_id)); }
        if(t === 'corre_ig_contas'){ const ids = d.t.corre_ig_contas.filter(kill).map(x => x.id); d.t.corre_posts.forEach(x => { if(ids.includes(x.ig_conta)) x.ig_conta = null; }); }
        if(t === 'corre_leads'){ const ids = d.t.corre_leads.filter(kill).map(x => x.id); d.t.corre_lead_fotos = (d.t.corre_lead_fotos || []).filter(x => !ids.includes(x.lead_id)); }
        if(t === 'corre_contas'){ const ids = d.t.corre_contas.filter(kill).map(c => c.id); d.t.corre_lancamentos = d.t.corre_lancamentos.filter(l => !ids.includes(l.conta_id)); }
        if(t === 'corre_destaques'){ const ids = d.t.corre_destaques.filter(kill).map(c => c.id); d.t.corre_stories.forEach(s => { if(ids.includes(s.destaque_id)) s.destaque_id = null; }); }
        d.t[t] = d.t[t].filter(r => !kill(r)); write(d);
      },
      async rpc(n, a){
        const d = read();
        /* ---- v3.66: a loja de skins (mesma conta do delta-v366.sql: o preço é o da vitrine, o cadeado é o da carteira,
           comprar de novo não cobra, saldo curto não mexe em nada) ---- */
        if(n === 'corre_skins_minhas' || n === 'corre_skin_compra'){
          const eu = uidOf(d); if(!eu) throw { message: 'permission denied', code: '42501' };
          d.t.corre_skins = d.t.corre_skins || [];
          const precos = {}; ((C.verso && C.verso.SKINS_LOJA) || []).forEach(x => { precos[x[0]] = x[2]; });
          const w = d.t.corre_correal.find(x => x.dono === eu), saldoC = () => centDe(w ? w.saldo : 0), minhas = () => d.t.corre_skins.filter(x => x.dono === eu).map(x => x.skin);
          if(n === 'corre_skins_minhas') return { minhas: minhas(), precos, saldo: saldoC() / 100 };
          const k = String(a.p_skin || ''), p = skinPrecoDemo(k);
          if(!p) return { ok: false, saldo: 0, preco: null };
          if(minhas().includes(k)) return { ok: true, ja: true, saldo: saldoC() / 100, preco: p / 100 };
          if(saldoC() < p) return { ok: false, saldo: saldoC() / 100, preco: p / 100 };
          w.saldo = (saldoC() - p) / 100; w.gasto = (centDe(w.gasto) + p) / 100; w.updated_at = now();
          d.t.corre_correal_log.push({ id: rid(), dono: eu, valor: -p / 100, motivo: 'skin:' + k, created_at: now() });
          d.t.corre_skins.push({ dono: eu, skin: k, preco: p / 100, created_at: now() }); write(d);
          return { ok: true, saldo: w.saldo, preco: p / 100 };
        }
        /* ---- v3.38: o correal (mesma conta do delta-v338.sql: 20 segundos no mínimo). v3.43 (delta-v343.sql): em
           centavos. A tarefa paga 3 centavos por ponto, cortado no teto de 1,00 por dia; o gasto tira o preço inteiro
           ou não tira nada. As contas aqui dentro são em centavos inteiros e só viram número com vírgula na saída,
           igual ao numeric do banco (nada de 0,30000000000000004 guardado na carteira) ---- */
        if(/^corre_(correal|tarefa)_/.test(n)){
          const eu = uidOf(d); if(!eu) throw { message: 'login', code: '42501' };
          const real = c => c / 100, PONTO = centDe(CORREAL_PONTO), TETO = centDe(CORREAL_TETO);
          const ini = Date.parse(hojeBR() + 'T03:00:00Z'), hojeC = () => d.t.corre_correal_log.filter(l => l.dono === eu && l.valor > 0 && /^tarefa:/.test(l.motivo) && Date.parse(l.created_at) >= ini).reduce((x, l) => x + centDe(l.valor), 0);
          const cart = () => { let w = d.t.corre_correal.find(x => x.dono === eu); if(!w){ w = { dono: eu, saldo: 0, ganho: 0, gasto: 0, updated_at: now() }; d.t.corre_correal.push(w); } return w; };
          const meu = () => ({ saldo: real(centDe(cart().saldo)), hoje: real(hojeC()), teto: real(TETO), ponto: real(PONTO), precos: Object.assign({}, CORREAL_PRECO) });
          if(n === 'corre_correal_meu') return meu();
          if(n === 'corre_tarefa_comeca'){
            if(!(CORREAL_TAREFA[a.p_u] && CORREAL_TAREFA[a.p_u][a.p_k])) throw { message: 'tarefa', hint: 'tarefa', code: 'P0001' };
            d.t.corre_tarefa_vez = d.t.corre_tarefa_vez.filter(x => x.dono !== eu);
            const id = rid(); d.t.corre_tarefa_vez.push({ id, dono: eu, u: a.p_u, k: a.p_k, comecou: now() }); write(d); return id;
          }
          if(n === 'corre_tarefa_termina'){
            const t = d.t.corre_tarefa_vez.find(x => x.id === a.p_id && x.dono === eu); if(!t) return { ok: false, motivo: 'sem_tarefa' };
            const seg = (Date.now() - Date.parse(t.comecou)) / 1000;
            if(seg < 20) return { ok: false, motivo: 'rapido', falta: Math.ceil(20 - seg) };
            d.t.corre_tarefa_vez = d.t.corre_tarefa_vez.filter(x => x !== t);
            if(seg > 1800){ write(d); return { ok: false, motivo: 'velha' }; }
            const pts = CORREAL_TAREFA[t.u][t.k], v = pts * PONTO, hoje = hojeC(), ganhou = Math.max(0, Math.min(v, TETO - hoje)), w = cart();
            if(ganhou){ d.t.corre_correal_log.push({ id: rid(), dono: eu, valor: real(ganhou), motivo: `tarefa:${t.u}:${t.k}`, created_at: now() }); w.saldo = real(centDe(w.saldo) + ganhou); w.ganho = real(centDe(w.ganho) + ganhou); w.updated_at = now(); }
            write(d); return { ok: true, ganhou: real(ganhou), valia: real(v), pontos: pts, saldo: real(centDe(w.saldo)), hoje: real(hoje + ganhou), teto: real(TETO) };
          }
          if(n === 'corre_correal_gasta'){
            /* tipo que o banco não conhece não tem preço: não mexe em nada (e o saldo volta 0, como lá) */
            const p = centDe(CORREAL_PRECO[a.p_tipo]); if(!p) return { ok: false, saldo: 0, preco: null };
            const w = cart(), s = centDe(w.saldo); if(s < p) return { ok: false, saldo: real(s), preco: real(p) };
            w.saldo = real(s - p); w.gasto = real(centDe(w.gasto) + p); d.t.corre_correal_log.push({ id: rid(), dono: eu, valor: real(-p), motivo: 'gasto:' + a.p_tipo, created_at: now() }); write(d); return { ok: true, saldo: w.saldo, preco: real(p) };
          }
          throw { message: 'permission denied', code: '42501' };
        }
        /* ---- v3.21: a rede (mesma conta do delta-v321.sql) ---- */
        const uidR = uidOf(d), visF = f => !!f && (f.dono === uidR || visible('corre_feed', f, d));
        const puroR = f => f.tipo === 'fortalece' && !f.texto && !f.midia_url;
        if(n === 'corre_pra_voce'){
          const me = d.t.corre_perfis.find(p => p.id === uidR) || {}, sigo = new Set(d.t.corre_seguindo.filter(x => x.quem === uidR).map(x => x.segue));
          const lim = Math.min(Math.max(Number(a && a.p_lim) || 60, 1), 200), agora = Date.now();
          return d.t.corre_feed.filter(f => !f.fio && !f.grupo && !puroR(f) && visF(f) && agora - Date.parse(f.created_at) < 45 * 864e5).map(f => {
            const au = d.t.corre_perfis.find(p => p.id === f.dono) || {}, h = (agora - Date.parse(f.created_at)) / 36e5;
            const cur = d.t.corre_curtidas.filter(c => c.post_id === f.id).length, resp = d.t.corre_comentarios.filter(c => c.post_id === f.id).length, forts = d.t.corre_feed.filter(x => x.alvo === f.id).length;
            const sc = (1 + cur + 2 * forts + 1.5 * resp + (f.vistas || 0) / 25) / Math.pow(h + 2, 1.35) * (sigo.has(f.dono) ? 1.8 : 1) * (au.categoria && au.categoria === me.categoria ? 1.25 : 1) * (au.cidade && au.cidade === me.cidade ? 1.15 : 1) * (f.dono === uidR ? .6 : 1);
            return [f.id, sc];
          }).sort((x, y) => y[1] - x[1]).slice(0, lim).map(x => x[0]);
        }
        if(n === 'corre_feed_viu'){
          if(!uidR) return 0; let k = 0; d.t.corre_feed_vistas = d.t.corre_feed_vistas || [];
          [...new Set((a && a.p_ids) || [])].slice(0, 40).forEach(id => { const f = d.t.corre_feed.find(x => x.id === id); if(!f || f.dono === uidR || !visible('corre_feed', f, d) || d.t.corre_feed_vistas.some(v => v.post_id === id && v.quem === uidR)) return; d.t.corre_feed_vistas.push({ post_id: id, quem: uidR }); f.vistas = (f.vistas || 0) + 1; k++; });
          write(d); return k;
        }
        if(n === 'corre_enquetes'){
          const out = {};
          ((a && a.p_ids) || []).slice(0, 60).forEach(id => { const f = d.t.corre_feed.find(x => x.id === id); if(!f || !f.enquete || !visF(f)) return; const vs = d.t.corre_votos.filter(v => v.post_id === id), meu = vs.find(v => v.dono === uidR);
            out[id] = { n: f.enquete.ops.map((_, i) => vs.filter(v => v.op === i).length), total: vs.length, meu: meu ? meu.op : null }; });
          return out;
        }
        if(n === 'corre_avisos' || n === 'corre_avisos_n'){
          if(!uidR) return n === 'corre_avisos' ? [] : 0;
          const me = d.t.corre_perfis.find(p => p.id === uidR) || {}, h = String(me.handle || ''), desde = Date.now() - 30 * 864e5;
          const lidoR = (d.t.corre_avisos_lidos || []).find(l => l.dono === uidR), lido = lidoR ? Date.parse(lidoR.em) : Date.now() - 2 * 864e5;
          const re = h ? new RegExp('(^|[^a-z0-9_.])@' + h.replace(/\./g, '\\.') + '\\.?([^a-z0-9_.]|$)', 'i') : null;
          const meus = new Set(d.t.corre_feed.filter(f => f.dono === uidR).map(f => f.id));
          const rec = (f, t) => Date.parse(t) > desde, ev = [];
          d.t.corre_curtidas.forEach(c => { if(meus.has(c.post_id) && c.dono !== uidR && rec(c, c.created_at)){ const f = d.t.corre_feed.find(x => x.id === c.post_id); ev.push({ t: 'curtiu', em: c.created_at, quem: c.dono, post: c.post_id, ref: null, txt: String(f.texto || '').slice(0, 90) }); } });
          d.t.corre_feed.forEach(r => { if(r.alvo && meus.has(r.alvo) && r.dono !== uidR && rec(r, r.created_at)){ const f = d.t.corre_feed.find(x => x.id === r.alvo); ev.push({ t: puroR(r) ? 'fortaleceu' : 'citou', em: r.created_at, quem: r.dono, post: r.alvo, ref: r.id, txt: (r.texto ? r.texto : String(f.texto || '')).slice(0, r.texto ? 140 : 90) }); } });
          d.t.corre_comentarios.forEach(c => { const pai = c.pai && d.t.corre_comentarios.find(x => x.id === c.pai); if(c.dono !== uidR && rec(c, c.created_at) && (meus.has(c.post_id) || (pai && pai.dono === uidR))) ev.push({ t: 'respondeu', em: c.created_at, quem: c.dono, post: c.post_id, ref: c.id, txt: String(c.texto).slice(0, 140) }); });
          d.t.corre_seguindo.forEach(x => { if(x.segue === uidR && rec(x, x.created_at)) ev.push({ t: 'seguiu', em: x.created_at, quem: x.quem, post: null, ref: null, txt: null }); });
          if(re){
            d.t.corre_feed.forEach(f => { const al = f.alvo && d.t.corre_feed.find(x => x.id === f.alvo); if(f.dono !== uidR && rec(f, f.created_at) && visible('corre_feed', f, d) && re.test(f.texto || '') && !(al && al.dono === uidR)) ev.push({ t: 'mencionou', em: f.created_at, quem: f.dono, post: f.id, ref: null, txt: String(f.texto).slice(0, 140) }); });
            d.t.corre_comentarios.forEach(c => { const f = d.t.corre_feed.find(x => x.id === c.post_id), pai = c.pai && d.t.corre_comentarios.find(x => x.id === c.pai); if(f && c.dono !== uidR && f.dono !== uidR && !(pai && pai.dono === uidR) && rec(c, c.created_at) && visible('corre_feed', f, d) && re.test(c.texto || '')) ev.push({ t: 'mencionou', em: c.created_at, quem: c.dono, post: c.post_id, ref: c.id, txt: String(c.texto).slice(0, 140) }); });
          }
          (d.t.corre_recomendacoes || []).forEach(r => { if(r.para === uidR && r.status === 'pendente') ev.push({ t: 'recomendou', em: r.created_at, quem: r.dono, post: null, ref: r.id, txt: String(r.texto).slice(0, 140) }); });
          d.t.corre_grupo_membros.forEach(m => {
            const g = d.t.corre_grupos.find(x => x.id === m.grupo); if(!g) return;
            if(m.estado === 'pedido' && gMod(d, g.id, uidR) && rec(m, m.created_at)) ev.push({ t: 'grupo_pedido', em: m.created_at, quem: m.membro, post: null, ref: g.id, txt: g.nome, g: g.slug });
            if(m.membro === uidR && m.estado === 'ativo' && m.aceito_em && m.aceito_por && m.aceito_por !== uidR && rec(m, m.aceito_em)) ev.push({ t: 'grupo_aceito', em: m.aceito_em, quem: m.aceito_por, post: null, ref: g.id, txt: g.nome, g: g.slug });
          });
          const out = ev.sort((x, y) => Date.parse(y.em) - Date.parse(x.em)).slice(0, Math.min(Math.max(Number(a && a.p_lim) || 60, 1), 150)).map(e => {
            const q = d.t.corre_perfis.find(p => p.id === e.quem);
            return Object.assign(e, { novo: Date.parse(e.em) > lido, quem: q && (q.visibilidade === 'publico' || e.t === 'grupo_pedido') ? { id: q.id, handle: q.handle, nome: q.nome, avatar_url: q.avatar_url || '' } : { nome: 'Perfil mocado' } });
          }).filter(e => e.quem);
          return n === 'corre_avisos' ? out : out.filter(e => e.novo).length;
        }
        if(n === 'corre_avisos_visto'){
          if(!uidR) return null; d.t.corre_avisos_lidos = (d.t.corre_avisos_lidos || []).filter(l => l.dono !== uidR); const t = now(); d.t.corre_avisos_lidos.push({ dono: uidR, em: t }); write(d); return t;
        }
        if(n === 'corre_handle_livre') return !d.t.corre_perfis.some(p => p.handle === String(a.h).toLowerCase());
        if(n === 'corre_grana_publica'){
          const p = d.t.corre_perfis.find(x => x.id === a.p);
          const est = (d.t.corre_estilo || []).find(x => x.dono === a.p) || {};
          const mostraMeta = !!est.meta_perfil && Number(est.meta_dia) > 0;
          if(!p || (p.grana_mostra === 'nada' && !mostraMeta) || !veDados(d, p.id, uidOf(d))) return null;
          const metaDe = tudo => { if(!mostraMeta) return null; const [y, m, dd] = hojeBR().split('-').map(Number); let tot = 0, ant = 0, hj = 0;
            for(let dt = new Date(y, m - 1, 1); dt.getMonth() === m - 1; dt.setDate(dt.getDate() + 1)){ const w = dt.getDay(), ok = est.meta_dias === 'todos' || (est.meta_dias === 'seg_sab' ? w !== 0 : w !== 0 && w !== 6); if(!ok) continue; tot++; if(dt.getDate() < dd) ant++; else if(dt.getDate() === dd) hj = 1; }
            return { pct: Math.min(999, Math.floor(tudo / (Number(est.meta_dia) * Math.max(tot, 1)) * 100)), ritmo: Math.round((ant + hj) / Math.max(tot, 1) * 100) }; };
          const nada = p.grana_mostra === 'nada';
          const ini = hojeBR().slice(0, 7);
          const bolas = t => 'R$ ' + Math.floor(t).toLocaleString('pt-BR').replace(/\d/g, '•') + ',••';
          if(p.ex) return { mes: ini, modo: p.grana_mostra, marcas: 2, faixa: p.grana_mostra === 'bolinhas' ? null : 'R$ 5 a 10 mil', valor: p.grana_mostra === 'valor' ? 7400 : null, mascara: p.grana_mostra === 'bolinhas' ? bolas(7400) : null, meta: p.id === 'ex1' ? { pct: 64, ritmo: 23 } : null };
          const doMes = d.t.corre_lancamentos.filter(l => l.dono === p.id && l.valor > 0 && l.categoria !== 'transferencia' && String(l.data).slice(0, 7) === ini);
          const ls = doMes.filter(l => l.cliente), tudo = doMes.reduce((s, l) => s + Number(l.valor), 0);
          const total = ls.reduce((s, l) => s + Number(l.valor), 0), marcas = nada ? null : d.t.corre_portfolio.filter(m => m.dono === p.id && m.publico !== false).length;
          const faixa = total <= 0 ? null : total < 2000 ? 'até R$ 2 mil' : total < 5000 ? 'R$ 2 a 5 mil' : total < 10000 ? 'R$ 5 a 10 mil' : total < 20000 ? 'R$ 10 a 20 mil' : total < 50000 ? 'R$ 20 a 50 mil' : 'mais de R$ 50 mil';
          return { mes: ini, modo: p.grana_mostra, marcas, faixa: nada || p.grana_mostra === 'bolinhas' ? null : faixa, valor: p.grana_mostra === 'valor' ? total : null, mascara: p.grana_mostra === 'bolinhas' && total > 0 ? bolas(total) : null, meta: metaDe(tudo) };
        }
        if(n === 'corre_pedir_orcamento'){
          const h = String(a.h || '').replace(/^@/, '').toLowerCase(), p = d.t.corre_perfis.find(x => x.handle === h);
          if(!p || !p.horus || p.horus.orcamento !== 'on') throw { message: 'link desligado', hint: 'desligado' };
          let w = String(a.whats || '').replace(/\D/g, ''); if(w.length > 11 && w.startsWith('55')) w = w.slice(2);
          if(String(a.nome || '').trim().length < 2 || (w.length !== 10 && w.length !== 11)) throw { message: 'dados', hint: 'dados' };
          const reg = { t: now(), k: 'res', v: ('Pediu orçamento pelo link' + (a.msg ? ': ' + a.msg : '')).slice(0, 300) };
          const ja = d.t.corre_leads.find(l => l.dono === p.id && (l.wa === w || l.fixo === w));
          let lid = ja ? ja.id : rid();
          if(ja){ ja.st = ja.st === 'fechado' ? ja.st : 'interesse'; ja.prox = hojeBR(); ja.hist = [reg].concat(ja.hist || []).slice(0, 40); ja.obs = (`Pedido pelo link (${a.nome}): ${a.msg || ''}\n` + (ja.obs || '')).slice(0, 1000); }
          else d.t.corre_leads.push({ id: lid, dono: p.id, nome: String(a.empresa || a.nome).slice(0, 120), wa: w.length === 11 ? w : '', fixo: w.length === 10 ? w : '', tel: w, cidade: String(a.cidade || '').slice(0, 60), uf: /^[A-Z]{2}$/.test(String(a.uf || '').toUpperCase()) ? String(a.uf).toUpperCase() : '', obs: `Pedido pelo link (${a.nome}): ${a.msg || ''}`.slice(0, 1000), st: 'interesse', prox: hojeBR(), fonte: 'link', potencial: 1, nicho: '', bairro: '', endereco: '', insta: '', sinais: [], hist: [reg], created_at: now() });
          /* até 3 fotos de referência, no máximo 6 por lead (mesma regra do banco) */
          (Array.isArray(a.fotos) ? a.fotos.slice(0, 3) : []).forEach(f => { if(/^data:image\/jpeg;base64,/.test(f || '') && f.length <= 400000 && d.t.corre_lead_fotos.filter(x => x.lead_id === lid).length < 6) d.t.corre_lead_fotos.push({ id: rid(), dono: p.id, lead_id: lid, img: f, created_at: now() }); });
          write(d); return { ok: true, nome: String(p.nome || '').split(' ')[0] };
        }
        if(n === 'corre_seguidores_lista'){
          const uid = uidOf(d), seg = a.tipo === 'seguindo', rel = d.t.corre_seguindo.filter(x => seg ? x.quem === a.p : x.segue === a.p).map(x => ({ pid: seg ? x.segue : x.quem, desde: x.created_at || now() }));
          const vis = rel.map(r => ({ r, f: d.t.corre_perfis.find(f => f.id === r.pid) })).filter(o => o.f && (o.f.visibilidade === 'publico' || o.f.id === uid)).sort((x, y) => String(y.r.desde).localeCompare(String(x.r.desde)));
          const itens = vis.filter(o => !a.antes || String(o.r.desde) < String(a.antes)).slice(0, Math.max(1, Math.min(Number(a.lim) || 60, 200))).map(o => ({ id: o.f.id, handle: o.f.handle, nome: o.f.nome, avatar_url: o.f.avatar_url || '', categoria: o.f.categoria || '', cidade: o.f.cidade || '', desde: o.r.desde }));
          return { itens, total: rel.length, visiveis: vis.length };
        }
        if(n === 'corre_seguidores_n'){ return { seguidores: d.t.corre_seguindo.filter(x => x.segue === a.p).length, seguindo: d.t.corre_seguindo.filter(x => x.quem === a.p).length }; }
        /* Correverso: a cidade (perfis da vitrine + o meu), com o que cada um faz no Corre. Dinheiro não entra. */
        if(n === 'corre_verso_cidade'){
          const uid = uidOf(d);
          return d.t.corre_perfis.filter(f => f.visibilidade === 'publico' || f.id === uid).map(f => {
            const posts = d.t.corre_feed.filter(x => x.dono === f.id).length + (f.ex ? 6 : 0), seg = d.t.corre_seguindo.filter(x => x.segue === f.id).length + (f.ex ? 4 : 0);
            const itens = d.t.corre_produtos.filter(x => x.dono === f.id && x.publico).length, esc = (d.t.corre_mural_propostas || []).filter(y => y.dono === f.id && y.st === 'escolhida').length + (f.ex ? 1 : 0);
            return { id: f.id, handle: f.handle, nome: f.nome, avatar_url: f.avatar_url || '', categoria: f.categoria || '', faz: f.faz || '', cidade: f.cidade || '', verso: f.verso || null, ex: !!f.ex, posts, seg, itens, esc, score: posts + 2 * seg + 3 * itens + 5 * esc };
          }).sort((x, y) => (y.id === uid) - (x.id === uid) || y.score - x.score).slice(0, Math.max(1, Math.min(Number(a && a.lim) || 80, 200)));
        }
        if(n === 'corre_mural_candidatos'){
          return d.t.corre_perfis.filter(f => f.no_mural && f.visibilidade === 'publico' && f.categoria).map(f => ({
            handle: f.handle, nome: f.nome, avatar_url: f.avatar_url || '', categoria: f.categoria, faz: f.faz || '', cidade: f.cidade || '', bio: String(f.bio || '').slice(0, 160), vende_pra: f.vende_pra || '',
            orc: !!(f.horus && f.horus.orcamento === 'on'), whats: !!f.whats_publico,
            itens: d.t.corre_produtos.filter(x => x.dono === f.id && x.publico).slice(0, 6).map(x => ({ nome: x.nome, preco: x.preco == null ? null : Number(x.preco), unidade: x.unidade || '' })),
            escolhido: (d.t.corre_mural_propostas || []).filter(y => y.dono === f.id && y.st === 'escolhida').length + (f.ex ? 3 : 0) })).slice(0, Math.max(1, Math.min(Number(a && a.lim) || 120, 300)));
        }
        if(n === 'corre_mural_chat_apagar'){
          const uid = uidOf(d), r = d.t.corre_mural_chat.find(x => x.id === a.p_id && !x.oculto);
          if(!r || !((uid && r.quem === uid) || (a.p_chave && r.chave === a.p_chave))) return false;
          r.oculto = true; write(d); return true;
        }
        if(n === 'corre_em_alta'){
          const lim = Date.now() - Math.min(Math.max(Number(a && a.dias) || 7, 1), 30) * 864e5, m = {};
          d.t.corre_feed.forEach(f => {
            const p = d.t.corre_perfis.find(x => x.id === f.dono); if(!p || p.visibilidade !== 'publico' || p.desbaratinado || f.grupo || Date.parse(f.created_at) < lim) return;
            (String(f.texto || '').match(/#[\p{L}\p{N}_]{2,40}/gu) || []).forEach(hs => { const k = hs.slice(1).toLowerCase(), e = m[k] = m[k] || { tag: k, n: 0, g: new Set() }; e.n++; e.g.add(f.dono); });
          });
          return Object.values(m).map(e => ({ tag: e.tag, n: e.n, gente: e.g.size })).sort((x, y) => y.gente - x.gente || y.n - x.n || x.tag.localeCompare(y.tag)).slice(0, 10);
        }
        if(n === 'corre_vitrine'){
          const p = d.t.corre_perfis.find(x => x.id === a.p); if(!p || (p.visibilidade !== 'publico' && p.id !== uidOf(d))) return null;
          return { itens: d.t.corre_produtos.filter(x => x.dono === p.id && x.publico).sort((x, y) => (x.ordem || 0) - (y.ordem || 0) || String(x.created_at).localeCompare(String(y.created_at))).map(x => ({ id: x.id, nome: x.nome, tipo: x.tipo || 'servico', preco: x.preco == null ? null : Number(x.preco), unidade: x.unidade || '', descricao: x.descricao || '', mensal: !!x.mensal, foto_url: x.foto_url || '' })),
            escolhido: (d.t.corre_mural_propostas || []).filter(y => y.dono === p.id && y.st === 'escolhida').length + (p.ex ? 3 : 0) };
        }
        if(n === 'corre_quem_faz'){
          const cat = a.p_cat || '', uf = /^[A-Za-z]{2}$/.test(a.p_uf || '') ? a.p_uf.toUpperCase() : '', cid = norm(a.p_cidade || ''), q = norm(a.p_q || '');
          return d.t.corre_perfis.filter(f => f.visibilidade === 'publico' && f.categoria && (!cat || f.categoria === cat) && (!uf || new RegExp('[,/-]\\s*' + uf + '\\s*$').test(String(f.cidade || '').toUpperCase()))
              && (!cid || norm(f.cidade).startsWith(cid)) && (!q || norm([f.nome, f.faz, f.bio].join(' ')).includes(q)))
            .map(f => { const it = d.t.corre_produtos.filter(x => x.dono === f.id && x.publico), pr = it.map(x => Number(x.preco)).filter(x => x > 0);
              return { handle: f.handle, nome: f.nome, avatar_url: f.avatar_url || '', cidade: f.cidade || '', categoria: f.categoria, faz: f.faz || '', bio: f.bio || '', itens: it.length, desde: pr.length ? Math.min(...pr) : null,
                escolhido: (d.t.corre_mural_propostas || []).filter(y => y.dono === f.id && y.st === 'escolhida').length + (f.ex ? 3 : 0), whats: !!f.whats_publico, orc: !!(f.horus && f.horus.orcamento === 'on') }; })
            .sort((x, y) => y.escolhido - x.escolhido || y.itens - x.itens || x.nome.localeCompare(y.nome)).slice(0, 60);
        }
        if(n === 'corre_orcamento_ver' || n === 'corre_orcamento_aprovar'){
          const v = d.t.corre_vendas.find(x => x.codigo === String(a.p_codigo || '').trim().toUpperCase());
          if(n === 'corre_orcamento_ver'){
            if(!v) return null; const f = d.t.corre_perfis.find(x => x.id === v.dono) || {}, es = d.t.corre_estilo.find(x => x.dono === v.dono) || {};
            return { codigo: v.codigo, st: v.st, cliente: String(v.cliente || '').split(' ')[0], itens: (v.itens || []).map(e => ({ n: e.n, q: Number(e.q), v: Number(e.v), u: e.u || '' })), desconto: Number(v.desconto) || 0, total: v.total,
              validade: v.validade || null, entrega: v.entrega || null, vence: v.vence || null, forma: v.forma || '', obs: v.obs || '', recorrente: !!v.recorrente, created_at: v.created_at, aprovado_em: v.aprovado_em || null, sinal: Number(v.sinal) || 0, sinal_pago: !!v.sinal_em,
              pix: ['orcamento', 'fechado'].includes(v.st) ? (es.pix || '') : '', de: { nome: f.nome, handle: f.handle, avatar_url: f.avatar_url || '', cidade: f.cidade || '', faz: f.faz || '', publico: f.visibilidade === 'publico', whats: f.whats_publico || '' } };
          }
          if(!v) throw { message: 'orcamento', hint: 'orcamento' };
          if(v.st !== 'orcamento'){ return { ok: true, st: v.st }; }
          if(v.validade && v.validade < hojeBR()) throw { message: 'vencido', hint: 'vencido' };
          v.st = 'fechado'; v.aprovado_em = now(); v.vence = v.vence || (v.entrega && v.entrega >= hojeBR() ? v.entrega : hojeBR());
          const l = v.lead_id && d.t.corre_leads.find(x => x.id === v.lead_id && x.dono === v.dono);
          if(l){ l.st = 'fechado'; l.prox = null; l.hist = [{ t: now(), k: 'res', v: 'Aprovou o orçamento pelo link.' }].concat(l.hist || []).slice(0, 40); }
          write(d); return { ok: true, st: 'fechado' };
        }
        if(n === 'corre_meu_acesso') return plMeu(d, uidOf(d));
        if(n === 'corre_teste_comeca'){ if(!uidOf(d)) throw { message: 'login', hint: 'login' }; plGarante(d, uidOf(d), a && a.p_produto); write(d); return plMeu(d, uidOf(d)); }
        if(/^corre_mural_/.test(n)){ const r = muralRpc(n, a || {}, d, uidOf(d)); write(d); return r; }
        if(/^corre_msg_/.test(n)){ const r = msgRpc(n, a || {}, d, uidOf(d)); write(d); return r; }
        if(/^corre_grupos?_/.test(n)) return grupoRpc(n, a || {}, d, uidOf(d));
        /* ---- v3.37: Studio Houzi (as mesmas regras do delta-v337.sql) ---- */
        if(n === 'corre_houzi_criar'){
          const A = a || {}, u = uidR, err = h => ({ message: h, hint: h });
          if(!u) throw err('login'); if(!d.t.corre_perfis.some(p => p.id === u)) throw err('perfil');
          const nome = String(A.p_nome || '').trim(); if(nome.length < 1 || nome.length > 40) throw err('nome');
          const minhas = d.t.corre_houzi_marcas.filter(x => x.dono === u);
          if(minhas.length >= 30) throw err('limite_marcas');
          plTrava(d, u, 'houzi'); write(d);
          if(minhas.filter(x => Date.now() - Date.parse(x.created_at) < 864e5).length >= 20) throw err('limite_dia');
          let base = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
          if(base.length < 3) base = ('marca-' + base).replace(/-+$/, '');
          base = base.slice(0, 40).replace(/-+$/, '');
          let slug = base, i = 1; while(d.t.corre_houzi_marcas.some(x => x.slug === slug)){ i++; slug = base + '-' + i; }
          const numero = d.t.corre_houzi_marcas.reduce((m2, x) => Math.max(m2, x.numero || 0), 0) + 1, agora = now();
          const r = { id: rid(), dono: u, numero, slug, nome, modo: A.p_modo === 'rebranding' ? 'rebranding' : 'branding', spec: A.p_spec || {}, voz: A.p_voz || {}, naming: A.p_naming || {}, publica: false, created_at: agora, updated_at: agora };
          d.t.corre_houzi_marcas.push(r); write(d); return Object.assign({}, r);
        }
        /* ---- v3.35: avisos no celular (mesmas regras do delta-v335.sql; a demonstração não manda aviso de verdade) ---- */
        if(/^corre_push_/.test(n)){
          if(!uidR || !d.t.corre_perfis.some(p => p.id === uidR)) throw { message: 'sem perfil', hint: 'perfil' };
          const A = a || {}, PADRAO = { msg: true, resp: true, seg: true, curt: true, texto: true };
          const pref = () => Object.assign({}, PADRAO, d.t.corre_push_pref.find(x => x.dono === uidR) || {});
          const ajustes = ep => { const p = pref(); delete p.dono; delete p.updated_at; return Object.assign(p, { aparelhos: d.t.corre_push.filter(x => x.dono === uidR).length, este: !!ep && d.t.corre_push.some(x => x.dono === uidR && x.endpoint === ep) }); };
          if(n === 'corre_push_ajustes') return ajustes(A.p_endpoint || null);
          if(n === 'corre_push_salvar'){
            const ep = String(A.p_endpoint || ''), k = String(A.p_p256dh || '').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_'), au = String(A.p_auth || '').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
            if(!/^https:\/\/(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)\/\S{8,}$/.test(ep) || ep.length > 1000) throw { message: 'endpoint', hint: 'endpoint' };
            if(!/^[A-Za-z0-9_-]{87}$/.test(k) || !/^[A-Za-z0-9_-]{22}$/.test(au)) throw { message: 'chave', hint: 'chave' };
            d.t.corre_push = d.t.corre_push.filter(x => x.endpoint !== ep);
            d.t.corre_push.push({ endpoint: ep, dono: uidR, p256dh: k, auth: au, ua: String(A.p_ua || '').slice(0, 200), created_at: now(), visto_em: now() });
            const meus = d.t.corre_push.filter(x => x.dono === uidR).sort((x, y) => (x.visto_em < y.visto_em ? 1 : -1));
            if(meus.length > 10){ const fora = new Set(meus.slice(10)); d.t.corre_push = d.t.corre_push.filter(x => !fora.has(x)); }
            if(!d.t.corre_push_pref.some(x => x.dono === uidR)) d.t.corre_push_pref.push(Object.assign({ dono: uidR, updated_at: now() }, PADRAO));
            write(d); return ajustes(ep);
          }
          if(n === 'corre_push_tirar'){ const antes = d.t.corre_push.length; d.t.corre_push = d.t.corre_push.filter(x => !(x.endpoint === A.p_endpoint && x.dono === uidR)); write(d); return d.t.corre_push.length < antes; }
          if(n === 'corre_push_ajusta'){
            if(!['msg', 'resp', 'seg', 'curt', 'texto'].includes(A.p_campo) || typeof A.p_valor !== 'boolean') throw { message: 'campo', hint: 'campo' };
            let p = d.t.corre_push_pref.find(x => x.dono === uidR); if(!p){ p = Object.assign({ dono: uidR }, PADRAO); d.t.corre_push_pref.push(p); }
            p[A.p_campo] = A.p_valor; p.updated_at = now(); write(d); return ajustes(null);
          }
        }
        throw { message: 'rpc' };
      },
      msg: {
        ouve(cb){ BUS.subs.add(cb); return () => { BUS.subs.delete(cb); return Promise.resolve(); }; },
        sala(id, h){ const s = { id, h }; BUS.salas.add(s); return { envia(){}, sai(){ BUS.salas.delete(s); return Promise.resolve(); } }; },
        async sobe(blob){ const small = blob.size > 260000 ? await shrink(new File([blob], 'x.jpg', { type: 'image/jpeg' }), 900, .72) : blob; return await new Promise((ok, fail) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = fail; fr.readAsDataURL(small); }); },
        async assina(paths){ const o = {}; paths.forEach(x => { o[x] = x; }); return o; },
        async tira(){},
        /* pros testes: alguém de exemplo manda mensagem pra você */
        simula(exId, texto){ const d = read(), uid = uidOf(d); if(!uid) return null; const c = conversaCom(d, exId, uid, true); const m = botFala(d, c, exId, texto); write(d); BUS.subs.forEach(f => f('ins', Object.assign({}, m))); return m; }
      },
      async upload(blob){
        const small = blob.size > 260000 ? await shrink(new File([blob], 'x.jpg', { type: 'image/jpeg' }), 900, .72) : blob;
        return await new Promise((ok, fail) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = fail; fr.readAsDataURL(small); });
      },
      async unlink(){},
      /* v3.60: a função "pagamento" de mentira: as mesmas regras e respostas, sem Asaas e sem cobrar. Assinou fora do
         teste grátis, já conta como pago (pra dar pra ver o plano funcionando) */
      async fn(name, b){
        if(name !== 'pagamento') throw { code: 'nofn' };
        const d = read(), u = uidOf(d), B = b || {}, prod = String(B.produto || '');
        if(!u) throw { code: 'login', status: 401 };
        if(B.acao === 'asaas'){ if(!plFund(d, u)) throw { code: 'fundador', status: 403 }; return { ok: true, ambiente: 'demo', webhook: 'criado' }; }
        if(!['studio', 'houzi', 'horus'].includes(prod)) throw { code: 'produto', status: 400 };
        let a = d.t.corre_assinaturas.find(x => x.dono === u && x.produto === prod);
        if(B.acao === 'link'){ if(!a || !a.asaas_assinatura) throw { code: 'sem_assinatura', status: 404 }; return { ok: true, link: '', vence: '', demo: true }; }
        if(B.acao === 'confere') return { ok: true, ativou: false, demo: true };
        if(B.acao === 'cancelar'){ if(!a || !a.asaas_assinatura || a.status === 'cancelada') return { ok: true, ja: true }; a.status = 'cancelada'; a.link = ''; a.updated_at = now(); write(d); return { ok: true, pago_ate: a.pago_ate, teste_ate: a.teste_ate, demo: true }; }
        if(B.acao !== 'assinar') throw { code: 'acao', status: 400 };
        const nivel = prod === 'studio' ? Math.max(2, Math.min(4, Math.round(Number(B.nivel) || 2))) : 1;
        const valor = prod === 'houzi' ? 29.90 : prod === 'horus' ? 9.90 : { 2: 59.90, 3: 69.90, 4: 79.90 }[nivel];
        if(a && a.asaas_assinatura && a.status !== 'cancelada'){ const trocou = prod === 'studio' && nivel !== a.nivel; Object.assign(a, { nivel, valor, updated_at: now() }); write(d); return { ok: true, link: '', trocou, demo: true }; }
        if(!d.t.corre_asaas_clientes.some(c => c.dono === u)){
          if(String(B.nome || '').replace(/\s+/g, ' ').trim().length < 3) throw { code: 'nome', status: 400 };
          if(!C.docOk(B.doc)) throw { code: 'doc', status: 400 };
          d.t.corre_asaas_clientes.push({ dono: u, cliente: 'cus_demo_' + rid().slice(0, 8), created_at: now() });
        }
        const noTeste = !!(a && a.teste_ate && Date.parse(a.teste_ate) > Date.now());
        const vence = noTeste ? hojeBR(new Date(Date.parse(a.teste_ate))) : hojeBR();
        const linha = { nivel, valor, status: noTeste ? 'teste' : 'ativa', asaas_assinatura: 'sub_demo_' + rid().slice(0, 8), link: '', updated_at: now() };
        /* pago agora: vale até o mesmo dia do mês que vem (31/01 vira 28/02), como o aviso do Asaas faz na função */
        if(!noTeste){ const [y, m, dd] = vence.split('-').map(Number), ult = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); linha.pago_ate = new Date(Date.UTC(y, m, Math.min(dd, ult))).toISOString().slice(0, 10); }
        if(a) Object.assign(a, linha); else { a = Object.assign({ id: rid(), dono: u, produto: prod, teste_ate: null, pago_ate: null, created_at: now() }, linha); d.t.corre_assinaturas.push(a); }
        write(d); return { ok: true, link: '', vence, teste: noTeste, demo: true };
      }
    };
  }

  /* ---------------- sem Supabase e fora da prévia: login avisa que não tá ligado ---------------- */
  function offApi(){
    const nope = async () => { throw { code: 'off' }; };
    return { async init(){ return null; }, onAuth(){}, login: nope, async logout(){}, async q(){ return []; }, async one(){ return null; }, ins: nope, upsert: nope, upd: nope, del: nope, rpc: async (n) => n === 'corre_handle_livre' ? true : null, upload: nope, async unlink(){}, fn: nope };
  }

  C.api = LIVE ? liveApi() : DEMO ? demoApi() : offApi();
  Object.defineProperty(C, 'oculto', { get: () => OCULTO.on, set: v => { OCULTO.on = !!v; try{ localStorage.setItem('corre-oculto', v ? '1' : '0'); }catch(e){} } });
  /* v3.55: formulário que grava no banco manda uma vez só: toque duplo ou rede lenta não criam dois (o botão apaga até voltar) */
  const umaVez = (form, fn) => { if(form) form.addEventListener('submit', async e => {
    e.preventDefault(); if(form.dataset.indo === '1') return; form.dataset.indo = '1'; const b = e.submitter; if(b) b.disabled = true;
    try{ await fn(e); }finally{ form.dataset.indo = ''; if(b && b.isConnected) b.disabled = false; }
  }); };
  /* v3.55: endereço com % quebrado (#/@ana%) não derruba a rota: devolve o texto como veio */
  const decURI = s => { try{ return decodeURIComponent(s); }catch(e){ return String(s); } };
  Object.assign(C, { $, esc, decURI, umaVez, norm, rid, hash, rng, shuffle, money, MESES, MESES_L, hojeBR, ddmm, rel, toast, copy, initials, avatar, firstName, profileUrl, ico, shrink, pickFile, sheet, closeSheet, errMsg });
  C.uid = () => C.st.user && C.st.user.id;

  /* ---------- v3.38 · CORREAL: a moeda do Correverso ----------
     Ganha fazendo tarefa na cidade (o banco confere o tempo e paga). A IA do Corre (Studio, Studio Houzi, Hórus) tem
     um limite grátis por dia; acabou, dá pra continuar gastando correal: o app pergunta antes, a função desconta no
     servidor e, se a IA falhar, devolve.
     v3.43: com centavos. Cada ponto de tarefa vale 3 centavos de correal (uma tarefa paga de 0,06 a 0,15) e o teto do
     dia em tarefa é 1,00, umas 10 tarefas. Nenhum preço passa de 1. Os números vêm do banco (corre_correal_meu: ponto,
     teto e precos); os daqui são a reserva. v3.45: imagem 0,10 e o resto de 0,02 a 0,05, então 1,00 rende meio dia
     de trabalho além do grátis. */
  C.correal = { saldo: null, hoje: 0, teto: CORREAL_TETO, ponto: CORREAL_PONTO, precos: Object.assign({}, CORREAL_PRECO) };
  /* um jeito só de escrever correal, em todo lugar: sempre 2 casas, com vírgula ("0,90", "12,40", "1.250,00").
     A conta é em centavos inteiros, então nunca aparece 0,30000000000000004 nem "0.9" */
  C.correalCent = centDe;
  C.correalFmt = v => {
    const c = centDe(v), a = Math.abs(c);
    return (c < 0 ? '-' : '') + String(Math.floor(a / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + String(a % 100).padStart(2, '0');
  };
  /* com a palavra: "0,90 correal", "1,50 correal", "2,40 correais" (plural a partir de 2, como "1,5 milhão"; e no zero,
     como "zero reais": "0,00 correais") */
  C.correalUnid = v => { const c = Math.abs(centDe(v)); return c === 0 || c >= 200 ? 'correais' : 'correal'; };
  C.correalTxt = v => `${C.correalFmt(v)} ${C.correalUnid(v)}`;
  /* pode pagar? (saldo e preço em centavos: 0,90 nunca paga 1,00, e 0,20 + 0,10 paga 0,30) */
  C.correalCobre = (saldo, preco) => centDe(saldo) >= centDe(preco);
  C.correalSet = (saldo, hoje) => {
    if(saldo != null && !isNaN(saldo)) C.correal.saldo = centDe(saldo) / 100;
    if(hoje != null && !isNaN(hoje)) C.correal.hoje = centDe(hoje) / 100;
    const s = C.correal.saldo;
    document.querySelectorAll('[data-correal-saldo]').forEach(el => { el.textContent = s == null ? '…' : C.correalFmt(s); });
    document.querySelectorAll('[data-correal-unid]').forEach(el => { el.textContent = C.correalUnid(s || 0); });
  };
  /* lê a carteira que o banco devolve (corre_correal_meu, ou a "cotas" da função imagem): teto, ponto, preços e saldo */
  C.correalLe = w => {
    if(!w || typeof w !== 'object') return;
    if(Number(w.teto) > 0) C.correal.teto = centDe(w.teto) / 100;
    /* o ponto fica como o banco manda (0,025 seria 0,025): a tarefa faz pontos x ponto e só então arredonda, na mesma
       ordem do corre_tarefa_termina */
    if(Number(w.ponto) > 0) C.correal.ponto = Number(w.ponto);
    if(w.precos && typeof w.precos === 'object') Object.keys(w.precos).forEach(k => { const v = Number(w.precos[k]); if(v > 0) C.correal.precos[k] = centDe(v) / 100; });
    C.correalSet(w.saldo, w.hoje);
  };
  C.correalCarrega = async () => {
    try{ C.correalLe(await C.api.rpc('corre_correal_meu', {})); }catch(e){}
    return C.correal;
  };
  /* uma pergunta por cima de tudo (até de uma folha aberta): devolve true ou false */
  C.confirma = o => new Promise(ok => {
    const d = document.createElement('dialog'); d.className = 'dlg';
    d.innerHTML = `<form method="dialog" class="dlg-c">${o.ico ? `<span class="dlg-i">${ico(o.ico)}</span>` : ''}<h2>${esc(o.titulo || '')}</h2>${o.texto ? `<p>${o.texto}</p>` : ''}<div class="acts"><button type="submit" value="sim" class="btn pri">${esc(o.sim || 'Sim')}</button><button type="submit" value="nao" class="btn ghost">${esc(o.nao || 'Agora não')}</button></div></form>`;
    document.body.appendChild(d);
    d.addEventListener('close', () => { const v = d.returnValue === 'sim'; d.remove(); ok(v); }, { once: true });
    try{ d.showModal(); d.querySelector('.btn.pri').focus(); }catch(e){ d.remove(); ok(window.confirm(o.titulo || '')); }
  });
  /* a IA (função "imagem"): no limite grátis, pergunta se quer usar correal (o.auto: true = já topou; false = nunca) */
  C.iaFn = async (body, o) => {
    o = o || {};
    const lido = r => { if(r && r.correal != null) C.correalSet(r.correal); return r; };
    try{ return lido(await C.api.fn('imagem', body)); }
    catch(e){
      if(e && e.correal != null) C.correalSet(e.correal);
      if(!(e && e.code === 'limite' && centDe(e.preco) > 0) || o.auto === false) throw e;
      const saldo = Number(e.correal) || 0, preco = Number(e.preco);
      if(!C.correalCobre(saldo, preco)){ e.semCorreal = true; throw e; }
      if(o.auto !== true){
        const sim = await C.confirma({ ico: 'correal', titulo: 'Acabou o grátis de hoje', texto: `${o.oque ? `Gerar ${esc(o.oque)}` : 'Continuar'} sai por <b>${C.correalTxt(preco)}</b>. Você tem <b>${C.correalFmt(saldo)}</b>.`, sim: `Usar ${C.correalTxt(preco)}`, nao: 'Agora não' });
        if(!sim){ e.recusou = true; throw e; }
      }
      try{ return lido(await C.api.fn('imagem', Object.assign({}, body, { correal: true }))); }
      catch(e2){ if(e2 && e2.correal != null) C.correalSet(e2.correal); throw e2; }
    }
  };
  /* a mensagem do limite: com o preço e o saldo quando a função já fala correal */
  C.limiteMsg = (e, oque) => {
    if(e && e.recusou) return 'Tudo bem. O grátis de hoje acabou; amanhã tem mais (ou usa correal quando quiser).';
    if(e && e.preco != null) return `Acabou o grátis de hoje${oque ? ` (${oque})` : ''}. Cada pedido a mais sai por ${C.correalTxt(e.preco)} e você tem ${C.correalFmt(Number(e.correal) || 0)}. Correal se ganha fazendo tarefa no Correverso: centavos por tarefa, até ${C.correalFmt(C.correal.teto)} por dia.`;
    return `Hoje já deu o limite${oque ? ` de ${oque}` : ''}. Amanhã tem mais.`;
  };
  /* ---------------- v3.60 · os planos ----------------
     C.acesso é o resumo do banco (corre_meu_acesso): os planos da pessoa, se tem acesso a cada um e as redes do
     Studio. null = o banco ainda não tem o delta v3.60 (ou não respondeu): o app segue como antes, sem cobrar nada */
  C.acesso = null;
  C.acessoCarrega = async () => {
    if(!C.uid()){ C.acesso = null; return null; }
    try{ C.acesso = (await C.api.rpc('corre_meu_acesso', {})) || null; }catch(e){ C.acesso = null; }
    return C.acesso;
  };
  /* começa os 30 dias grátis (Hórus e Studio Houzi; só uma vez por pessoa). O banco também começa sozinho no
     primeiro lead ou na primeira marca; aqui é pra quem entrou e quer ver a faixa certa */
  C.acessoComeca = async prod => {
    try{ C.acesso = (await C.api.rpc('corre_teste_comeca', { p_produto: prod })) || C.acesso; }catch(e){}
    return C.acesso;
  };
  /* CPF (11) ou CNPJ (14): só os números, com os dígitos verificadores certos (a mesma conta da função pagamento) */
  C.docOk = v => {
    const s = String(v || '').replace(/\D/g, '');
    if(!/^(\d{11}|\d{14})$/.test(s) || /^(\d)\1+$/.test(s)) return '';
    const dv = (pesos) => { const r = pesos.reduce((t, p, i) => t + Number(s[i]) * p, 0) % 11; return r < 2 ? 0 : 11 - r; };
    if(s.length === 11) return dv([10, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(s[9]) && dv([11, 10, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(s[10]) ? s : '';
    return dv([5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(s[12]) && dv([6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(s[13]) ? s : '';
  };
  /* salva um pedaço do meu perfil e mantém o estado em dia */
  C.saveMe = async patch => {
    const r = await C.api.upd('corre_perfis', { id: C.uid() }, patch);
    if(r && r[0]) C.st.me = Object.assign({}, C.st.me, r[0]); else C.st.me = Object.assign({}, C.st.me, patch);
    return C.st.me;
  };
})();
