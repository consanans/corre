/* CORRE · CORREVERSO
   Uma cidadezinha do Corre, em pixel: cada perfil da vitrine ganha um quarteirão inteiro com uma casa moderna
   (concreto, aço preto, vidro, madeira, corten) com a cara do corre dele (a categoria). O tamanho cresce com o que a
   pessoa faz no Corre (posts, seguidores, catálogo, escolhas no Mural); dinheiro NUNCA entra na conta.
   Quem fez o Corre tem dois quarteirões, um do lado do outro, ligados por uma passarela de vidro por cima da rua.
   Você monta o avatar, sai pela porta da tua casa e anda pela cidade. Chegou perto de alguém e os dois estão com
   o mic ligado: a conversa abre sozinha (voz direto entre os dois, WebRTC), com o "AO VIVO", silenciar e bloquear.
   Rede: Supabase Realtime (presença + broadcast) no site; na demonstração, as abas conversam pelo BroadcastChannel. */
(function(){
  'use strict';
  const C = window.Corre, { esc, ico } = C;

  /* ---------- números da cidade ---------- */
  const PX = 3;                       /* cada pixel do mundo vira um quadradinho de 3x3 na tela */
  const LW = 300, LH = 270, RUA = 96, COLS = 13, TOPO = 360, CALC = 12;
  const R_ABRE = 150, R_FECHA = 230, VEL = 170, PORTA_R = 58, AV_S = 1.2;
  const ICE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
  /* quem tem dois quarteirões: quem fez o Corre */
  const ESPECIAL = { consanans: 'dois' };
  /* casas com estilo próprio */
  const ESTILOS = { maiacrds: 'tinta', 'tropicalink.00': 'tropical', lolouzimaki: 'blocos', playboy: 'pimp', apenassantoro: 'dj', jeydiaz: 'brutal' };
  /* v3.55: @ chamado "constructor" ou "__proto__" não vira fundador nem estilo */
  Object.setPrototypeOf(ESPECIAL, null); Object.setPrototypeOf(ESTILOS, null);
  const ESTILO_SPRITE = () => ({ tinta: spriteTinta, tropical: spriteTropical, blocos: spriteBlocos, pimp: spritePimp, dj: spriteDJ, brutal: spriteBrutal });
  /* v3.80: a mansão brutalista do @jeydiaz ocupa quase o lote inteiro, seja qual for o tamanho da casa */
  const LARG_ESTILO = { brutal: 288 };
  const INK = '#0F1218', PAPEL = '#FFFFFF', AMARELO = '#F2EC54', ROSA = '#FF4F9A', AZUL = '#2E5BFF', LARANJA = '#FF8A3D', LILAS = '#C6A6FF';

  const hash = s => { let h = 2166136261; for(const ch of String(s)){ h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rng = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const escala = ctx => { const m = ctx.getTransform(); return Math.hypot(m.a, m.b) || 1; };
  /* v3.52 · a base: a tela da cidade agora tem fx pontos de verdade pra cada "pixel" do desenho de antes (o mundo fica
     mais nítido: bola redonda, diagonal lisa, detalhe que antes sumia). Quem desenha ponto a ponto (a letra, o boneco,
     o avião, as placas) continua no pixel de antes, e a base multiplica: o tamanho na tela é o mesmo */
  const BASE = ctx => ctx.__b || 1;
  const naBase = ctx => { const b = BASE(ctx); ctx.setTransform(b, 0, 0, b, 0, 0); };
  const ptBase = (ctx, x, y) => { const m = ctx.getTransform(), b = BASE(ctx); return [Math.round((m.a * x + m.e) / b), Math.round((m.d * y + m.f) / b), m.d / b]; };
  /* v3.87 · o Natal (o Thales: "colocar decoração de natal na cidade e o papai noel flutuante no igapó, maior papai noel
     do mundo"). A cidade se enfeita sozinha de 15 de outubro até o Dia de Reis (6 de janeiro, quando o Papai Noel de
     verdade sai do Igapó), pelo dia de Brasília; o resto do ano ela volta ao normal. natalForca é o gancho dos testes */
  let natalForca = null, natalVisto = { t: 0, v: false }, NT = 0;
  /* &natal=1 no endereço mostra o Natal fora de época (pra conferir antes); &natal=0 desliga */
  try{ const q = new URLSearchParams(location.search).get('natal'); if(q === '1' || q === '0') natalForca = q === '1'; }catch(e){}
  function natal(){
    if(natalForca != null) return natalForca;
    const agora = Date.now(); if(agora - natalVisto.t < 60e3) return natalVisto.v;
    const d = new Date(agora - 3 * 3600e3), m = d.getUTCMonth() + 1, dia = d.getUTCDate();
    natalVisto = { t: agora, v: (m === 10 && dia >= 15) || m === 11 || m === 12 || (m === 1 && dia <= 6) };
    return natalVisto.v;
  }
  /* v3.91 · o Halloween (o Thales: "adiciona opções de skin de halloween e faz algumas decorações em algumas casas"): de
     1º de outubro até Finados (2/11), pelo dia de Brasília. Nessa época o Ateliê vende a coleção de Halloween e algumas
     casas se enfeitam; o resto do ano a coleção some da vitrine (quem comprou continua vestindo) e as casas voltam.
     &halloween=1 ou 0 no endereço força, como o Natal */
  let hallForca = null, hallVisto = { t: 0, v: false };
  try{ const q = new URLSearchParams(location.search).get('halloween'); if(q === '1' || q === '0') hallForca = q === '1'; }catch(e){}
  function halloween(){
    if(hallForca != null) return hallForca;
    const agora = Date.now(); if(agora - hallVisto.t < 60e3) return hallVisto.v;
    const d = new Date(agora - 3 * 3600e3), m = d.getUTCMonth() + 1, dia = d.getUTCDate();
    hallVisto = { t: agora, v: m === 10 || (m === 11 && dia <= 2) };
    return hallVisto.v;
  }

  /* ---------- texturas de bloco (16x16, feitas aqui mesmo, cada material com o seu ruído e as juntas) ---------- */
  const TEXB = { concreto: '#A4A8AE', escuro: '#4A4E56', branco: '#EEEBE4', preto: '#1B1D22', corten: '#8E4B2B', madeira: '#B3793F', lote: '#E6DECD', calcada: '#C9D0D8', rua: '#2B2F38', dois: '#3A3E45', tronco: '#6B4A32', vidroOn: '#FFD37A', vidroOff: '#2A3442', praca: '#DCCFB6', gramado: '#D9C27F', terra: '#A4553A', agua: '#2F7FC1', mosaico: '#F1EDE4', tijolo: '#8C3B2E', zinco: '#9AA0A8' };
  const rgbDe = hex => { const n = parseInt(String(hex).slice(1, 7), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const sombra = (hex, f) => { const [r, g, b] = rgbDe(hex); return `rgb(${clamp(Math.round(r * f), 0, 255)},${clamp(Math.round(g * f), 0, 255)},${clamp(Math.round(b * f), 0, 255)})`; };
  const TILES = {};
  function tile(nome){
    if(TILES[nome]) return TILES[nome];
    const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d');
    const folha = nome.startsWith('folha'), cor = folha ? nome.slice(5) : nome.startsWith('#') ? nome : TEXB[nome] || '#888888';
    const r = rng(hash('tex:' + nome)), [R, G, B] = rgbDe(cor), img = x.createImageData(16, 16), d = img.data;
    for(let yy = 0; yy < 16; yy++) for(let xx = 0; xx < 16; xx++){
      const n = r() - .5; let f = 1;
      if(folha){ f = 1 + n * .34; if(r() < .1) f *= .72; if(r() < .05) f = 1.32; }
      else switch(nome){
        case 'concreto': case 'escuro': f = 1 + n * .12; if(yy % 8 === 7 || xx === (yy < 8 ? 15 : 7)) f *= .84; break;
        case 'branco': f = 1 + n * .05; if(yy === 15 || xx === 15) f *= .92; break;
        case 'preto': f = 1 + n * .22; if(xx % 4 === 3) f = 1.9; break;
        case 'corten': f = 1 + n * .3 + (r() < .07 ? -.25 : 0); if(xx % 8 === 7) f *= .78; break;
        case 'madeira': { const pr = yy >> 2; f = 1 + n * .1 + ((pr * 7) % 3 - 1) * .05; if(yy % 4 === 3) f = .7; else if(xx === (pr * 5) % 16) f *= .75; break; }
        case 'lote': case 'praca': f = 1 + n * .07; if(yy % 8 === 7 || xx % 8 === 7) f *= .92; break;
        case 'calcada': f = 1 + n * .07; if(yy % 8 === 7 || xx === (yy < 8 ? 7 : 15)) f *= .86; break;
        case 'rua': f = 1 + n * .24; if(r() < .03) f = 1.5; break;
        case 'dois': f = 1 + n * .12; if(yy % 8 === 7 || xx % 8 === 7) f *= .76; break;
        case 'tronco': f = 1 + n * .16; if(xx % 4 === 0) f *= .76; break;
        case 'vidroOn': f = 1 + n * .07; break;
        case 'vidroOff': f = 1 + n * .12; if((xx + yy) % 11 === 0) f = 1.8; break;
        case 'gramado': f = 1 + n * .2; if(r() < .1) f *= .82; break;
        case 'tijolo': f = 1 + n * .16; if(yy % 4 === 3 || xx === ((yy >> 2) % 2 ? 3 : 11)) f = 1.55; break;
        case 'zinco': f = 1 + n * .06; if(yy % 3 === 0) f = 1.22; else if(yy % 3 === 2) f = .76; break;
        case 'terra': f = 1 + n * .2; if(r() < .05) f *= .75; break;
        case 'agua': f = 1 + n * .07; if((yy * 3 + (xx >> 2)) % 7 === 0) f = 1.16; break;
        /* v3.77: a pedra portuguesa do Calçadão é preta e branca (a vermelha era chute; a pesquisa do 3D achou o original) */
        case 'mosaico': { const onda = Math.floor((xx + Math.round(3 * Math.sin(yy / 2.6))) / 4) % 2 === 0; const i0 = (yy * 16 + xx) * 4, [tr, tg, tb] = rgbDe('#2A2B31'), q = 1 + n * .08; d[i0] = clamp((onda ? tr : R) * q, 0, 255); d[i0 + 1] = clamp((onda ? tg : G) * q, 0, 255); d[i0 + 2] = clamp((onda ? tb : B) * q, 0, 255); d[i0 + 3] = 255; continue; }
        default: f = 1 + n * .1; if(xx % 8 === 7 || yy % 8 === 7) f *= .87;
      }
      const i = (yy * 16 + xx) * 4; d[i] = clamp(R * f, 0, 255); d[i + 1] = clamp(G * f, 0, 255); d[i + 2] = clamp(B * f, 0, 255); d[i + 3] = 255;
    }
    x.putImageData(img, 0, 0); return (TILES[nome] = c);
  }
  /* o padrão sempre na grade dos pixels de verdade (1 ponto da textura = 1 quadradinho da tela) */
  const PADS = new Map();
  function pad(ctx, nome){
    const s = escala(ctx), chave = ctx === V.ctx ? nome + '@' + s : '';
    if(chave && PADS.has(chave)) return PADS.get(chave);
    const p = ctx.createPattern(tile(nome), 'repeat');
    if(p && p.setTransform) p.setTransform(new DOMMatrix([1 / s, 0, 0, 1 / s, 0, 0]));
    if(chave) PADS.set(chave, p);
    return p;
  }

  /* ---------- letra de pixel (3x5) ---------- */
  const FONTE = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
    I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
    Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
    Y: '101101010010010', Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110', 4: '101101111001001', 5: '111100110001110',
    6: '011100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001110', '@': '011101111100011', '.': '000000000000010', '_': '000000000000111', '-': '000000111000000',
    ' ': '000000000000000', ':': '000010000010000', '!': '010010010000010', '?': '110001010000010', '/': '001001010100100', '+': '000010111010000', ',': '000000000010100', "'": '010010000000000'
  };
  /* M, N, V e W ficam mais largas pra não virar borrão */
  Object.assign(FONTE, { $: '01110|10100|01110|00101|01110', M: '10001|11011|10101|10001|10001', N: '1001|1101|1011|1001|1001', W: '10001|10001|10101|11011|10001', V: '10001|10001|10001|01010|00100' });
  const GL = {}; Object.keys(FONTE).forEach(k => { const g = FONTE[k]; GL[k] = g.includes('|') ? g.split('|') : [g.slice(0, 3), g.slice(3, 6), g.slice(6, 9), g.slice(9, 12), g.slice(12, 15)]; });
  const txtN = t => String(t == null ? '' : t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const pixLarg = (t, s) => { t = txtN(t); let w = 0; for(const ch of t) w += ((GL[ch] || GL['?'])[0].length + 1) * s; return w ? w - s : 0; };
  /* texto em pixel: x, y no mundo (centro); s = tamanho do ponto em pixels de verdade */
  function pixTxt(ctx, t, x, y, s, cor, al){
    t = txtN(t); s = s || 1;
    const w = pixLarg(t, s), h = 5 * s, pb = ptBase(ctx, x, y);
    let ix = pb[0]; const iy = pb[1] - Math.floor(h / 2);
    if(al !== 'e') ix -= al === 'd' ? w : Math.floor(w / 2);
    ctx.save(); naBase(ctx); ctx.fillStyle = cor;
    let cx = ix; for(const ch of t){ const g = GL[ch] || GL['?']; g.forEach((row, ry) => { for(let j = 0; j < row.length; j++) if(row.charCodeAt(j) === 49) ctx.fillRect(cx + j * s, iy + ry * s, s, s); }); cx += (g[0].length + 1) * s; }
    ctx.restore(); return w;
  }
  function pixPlaca(ctx, t, x, y, o){
    o = o || {}; t = txtN(t); const s = o.s || 1;
    if(o.max && t.length > o.max) t = t.slice(0, Math.max(1, o.max - 2)) + '..';
    const w = pixLarg(t, s), h = 5 * s, pad = o.pad == null ? 2 : o.pad, pb = ptBase(ctx, x, y);
    const cx = pb[0], cy = pb[1], x0 = cx - Math.floor(w / 2) - pad, y0 = cy - Math.floor(h / 2) - pad;
    ctx.save(); naBase(ctx);
    if(o.borda !== false){ ctx.fillStyle = o.borda || INK; ctx.fillRect(x0 - 1, y0 - 1, w + pad * 2 + 2, h + pad * 2 + 2); }
    ctx.fillStyle = o.fundo || PAPEL; ctx.fillRect(x0, y0, w + pad * 2, h + pad * 2);
    ctx.restore(); pixTxt(ctx, t, x, y, s, o.cor || INK, 'c');
    return { ix: x0 - 1, iy: y0 - 1, w: w + pad * 2 + 2, h: h + pad * 2 + 2 };
  }

  /* ---------- skin: boneco de blocos (cabeça 8x8, tronco 8x8, braços 3x8, pernas 4x7), desenhado ponto a ponto ---------- */
  const PELES = ['#FFDDC4', '#F1C19B', '#D9A07A', '#B97B55', '#8D5A3B', '#5E3A26'];
  const CAB_CORES = ['#141216', '#4A2E1E', '#8A5A2B', '#E2B04A', '#C8C8CF', ROSA, AZUL, AMARELO];
  const ROUPA_CORES = [INK, AMARELO, ROSA, AZUL, LARANJA, LILAS, PAPEL, '#B4152E'];
  const CALCA_CORES = ['#1B1F27', '#2E4A7A', '#6B7480', '#C9B79C', '#3A2A4A'];
  const TENIS_CORES = [PAPEL, INK, ROSA, AMARELO, AZUL];
  const CABELOS = [['raspado', 'Raspado'], ['curto', 'Curto'], ['cacheado', 'Cacheado'], ['black', 'Black'], ['trancas', 'Tranças'], ['coque', 'Coque'], ['longo', 'Longo'], ['moicano', 'Moicano']];
  const BARBAS = [['nada', 'Sem'], ['cavanhaque', 'Cavanhaque'], ['barba', 'Barba']];
  const TOPOS = [['nada', 'Nada'], ['bone', 'Boné'], ['bonetras', 'Boné pra trás'], ['gorro', 'Gorro'], ['fone', 'Fone'], ['bandana', 'Bandana']];
  const OCULOS = [['nada', 'Sem'], ['escuro', 'Escuro'], ['grau', 'De grau']];
  const ROUPAS = [['camiseta', 'Camiseta'], ['regata', 'Regata'], ['moletom', 'Moletom'], ['jaqueta', 'Jaqueta']];
  const ESTAMPAS = [['nada', 'Lisa'], ['listras', 'Listras'], ['raio', 'Raio'], ['estrela', 'Estrela']];
  const CORRENTES = [['nada', 'Sem'], ['ouro', 'Corrente']];
  const PERNAS = [['calca', 'Calça'], ['bermuda', 'Bermuda']];
  /* os personagens do Correverso (todos daqui, desenhados pro Corre): no lugar do boneco, você anda pela cidade como um deles */
  const PERSONAGENS = [['', 'Você mesmo'], ['capivara', 'Capi, a capivara do Igapó'], ['tucano', 'Tuca, o tucano'], ['robo', 'Bip, o robô'], ['fantasma', 'Bu, o fantasminha'], ['pastel', 'Pastelzinho da feira'], ['ipe', 'Ipê, o pé de ipê']];
  const PERSONAGEM = {};
  {
    const BR = '#F4F3EF';
    /* cada um recebe px(x, y, w, h, cor) (pés em y = 0, pra cima é negativo; de lado o px já espelha) e o estado:
       lado, costas, l1/l2 (perna levantada), sentado */
    PERSONAGEM.capivara = (px, o) => {
      const B1 = '#8E6B45', B2 = '#6E5033', B3 = '#B49472';
      if(!o.sentado){ px(-4, -4 - o.l1, 2, 3, B2); px(2, -4 - o.l2, 2, 3, B2); }
      if(o.lado){
        px(-5, -12, 10, 1, B1); px(-6, -11, 12, 7, B1); px(-7, -9, 1, 2, B2); px(-3, -7, 6, 3, B3);
        px(2, -19, 6, 1, B1); px(1, -18, 8, 6, B1); px(1, -20, 2, 2, B2); px(6, -16, 3, 3, B3); px(8, -16, 1, 1, INK); px(4, -17, 1, 1, INK);
      } else {
        px(-4, -12, 8, 1, B1); px(-5, -11, 10, 7, B1); px(-3, -8, 6, 3, B3);
        px(-4, -20, 8, 1, B1); px(-5, -19, 10, 6, B1); px(-5, -21, 2, 2, B2); px(3, -21, 2, 2, B2);
        if(!o.costas){ px(-3, -17, 1, 1, INK); px(2, -17, 1, 1, INK); px(-2, -16, 4, 3, B3); px(-1, -16, 2, 1, INK); px(-4, -15, 1, 1, B2); px(3, -15, 1, 1, B2); }
      }
    };
    PERSONAGEM.tucano = (px, o) => {
      const PE = '#6B7480', BI = '#FF8A3D', BI2 = '#E2412E', BI3 = '#C96A2A', OL = '#38E1FF';
      if(!o.sentado){ px(-3, -4 - o.l1, 2, 3, PE); px(1, -4 - o.l2, 2, 3, PE); px(-4, -2 - o.l1, 3, 1, PE); px(1, -2 - o.l2, 3, 1, PE); }
      if(o.lado){
        px(-4, -13, 8, 1, INK); px(-5, -12, 9, 8, INK); px(-7, -12, 2, 3, INK); px(1, -11, 3, 6, BR);
        px(-1, -20, 6, 1, INK); px(-2, -19, 7, 6, INK); px(2, -18, 2, 2, OL); px(3, -17, 1, 1, INK); px(5, -18, 6, 3, BI); px(10, -17, 1, 2, BI2); px(5, -15, 4, 1, BI3);
      } else {
        px(-3, -13, 6, 1, INK); px(-4, -12, 8, 8, INK); px(-2, -11, 4, 6, BR); px(-5, -11, 1, 5, INK); px(4, -11, 1, 5, INK);
        px(-3, -20, 6, 1, INK); px(-4, -19, 8, 6, INK);
        if(!o.costas){ px(-3, -18, 3, 3, OL); px(-2, -17, 1, 1, INK); px(1, -18, 5, 3, BI); px(5, -17, 2, 2, BI2); px(1, -15, 4, 1, BI3); }
      }
    };
    PERSONAGEM.robo = (px, o) => {
      const C1 = '#C9CDD3', C2 = '#8F96A0', C3 = '#6B7480', TELA = '#101318', OL = '#38E1FF';
      if(!o.sentado){ px(-4, -5 - o.l1, 3, 4, C3); px(1, -5 - o.l2, 3, 4, C3); px(-5, -1 - o.l1, 4, 1, INK); px(1, -1 - o.l2, 4, 1, INK); }
      if(o.lado){
        px(-4, -14, 8, 9, C2); px(-3, -13, 6, 6, C1); px(-1, -13, 3, 6, C2); px(-1, -7, 3, 1, C3); px(-2, -7, 1, 1, ROSA);
        px(-4, -22, 8, 7, C1); px(0, -21, 4, 5, TELA); px(1, -20, 2, 2, OL); px(1, -17, 2, 1, OL); px(0, -24, 1, 2, INK); px(-1, -25, 3, 1, ROSA);
      } else {
        px(-5, -14, 10, 9, C2); px(-4, -13, 8, 6, C1); px(-3, -7, 1, 1, ROSA); px(-1, -7, 1, 1, AMARELO); px(1, -7, 1, 1, OL);
        px(-7, -13, 2, 6, C2); px(5, -13, 2, 6, C2); px(-7, -7, 2, 1, C3); px(5, -7, 2, 1, C3);
        px(-5, -22, 10, 7, C1); px(0, -24, 1, 2, INK); px(-1, -25, 3, 1, ROSA);
        if(!o.costas){ px(-4, -21, 8, 5, TELA); px(-3, -20, 2, 2, OL); px(1, -20, 2, 2, OL); px(-2, -17, 4, 1, OL); } else px(-4, -21, 8, 5, C2);
      }
    };
    PERSONAGEM.fantasma = (px, o) => {
      const SH = '#D9DEE6';
      const y0 = o.sentado ? 2 : 0;
      px(-4, -21 + y0, 8, 1, PAPEL); px(-5, -20 + y0, 10, 13, PAPEL); px(4, -19 + y0, 1, 12, SH);
      px(-5, -7 + y0, 2, 2, PAPEL); px(-1, -7 + y0, 2, 2, PAPEL); px(3, -7 + y0, 2, 2, PAPEL);
      if(o.lado){ px(1, -17 + y0, 2, 3, INK); px(1, -17 + y0, 1, 1, BR); px(2, -13 + y0, 2, 1, INK); px(0, -14 + y0, 1, 1, ROSA); }
      else if(!o.costas){ px(-3, -17 + y0, 2, 3, INK); px(1, -17 + y0, 2, 3, INK); px(-3, -17 + y0, 1, 1, BR); px(1, -17 + y0, 1, 1, BR); px(-1, -13 + y0, 2, 1, INK); px(-4, -14 + y0, 1, 1, ROSA); px(3, -14 + y0, 1, 1, ROSA); }
    };
    PERSONAGEM.pastel = (px, o) => {
      const G1 = '#F2CF6B', G2 = '#C9933A', G3 = '#FFE59A';
      if(!o.sentado){ px(-4, -4 - o.l1, 3, 3, G2); px(1, -4 - o.l2, 3, 3, G2); }
      if(o.lado){
        px(-4, -19, 8, 11, G1); for(let r = 0; r < 11; r += 2){ px(4, -19 + r, 1, 1, G2); px(-5, -18 + r, 1, 1, G2); } px(-3, -18, 2, 1, G3); px(-2, -10, 1, 1, G2); px(2, -16, 1, 1, G2);
        px(1, -16, 2, 2, INK); px(1, -12, 2, 1, INK); px(-1, -13, 1, 1, ROSA); px(-6, -14, 2, 4, G2);
      } else {
        px(-6, -19, 12, 11, G1); for(let r = 0; r < 11; r += 2){ px(6, -19 + r, 1, 1, G2); px(-7, -18 + r, 1, 1, G2); } px(-5, -20, 2, 1, G2); px(-1, -20, 2, 1, G2); px(3, -20, 2, 1, G2);
        px(-5, -18, 2, 1, G3); px(-4, -10, 1, 1, G2); px(3, -17, 1, 1, G2); px(1, -9, 1, 1, G2);
        px(-8, -14, 2, 4, G2); px(6, -14, 2, 4, G2);
        if(!o.costas){ px(-3, -16, 2, 2, INK); px(1, -16, 2, 2, INK); px(-2, -12, 4, 1, INK); px(-3, -13, 1, 1, INK); px(2, -13, 1, 1, INK); px(-5, -13, 1, 1, ROSA); px(4, -13, 1, 1, ROSA); }
      }
    };
    PERSONAGEM.ipe = (px, o) => {
      const TR = '#7A4E2A', TR2 = '#5A3A1E', CO = ROSA, CO2 = '#D93A80', FL = '#FFB3D1';
      if(!o.sentado){ px(-4, -3 - o.l1, 3, 3, TR2); px(1, -3 - o.l2, 3, 3, TR2); }
      px(-2, -17, 4, 14, TR); px(1, -17, 1, 14, TR2); px(-5, -16, 3, 1, TR); px(2, -16, 3, 1, TR);
      px(-4, -26, 8, 1, CO); px(-6, -25, 12, 7, CO); px(-5, -18, 10, 2, CO); px(4, -24, 2, 7, CO2); px(-4, -24, 1, 1, FL); px(1, -23, 1, 1, FL); px(-2, -20, 1, 1, FL); px(3, -19, 1, 1, AMARELO); px(-5, -21, 1, 1, AMARELO);
      if(o.lado){ px(1, -14, 1, 1, INK); px(1, -11, 1, 1, INK); }
      else if(!o.costas){ px(-2, -14, 1, 1, INK); px(1, -14, 1, 1, INK); px(-1, -11, 2, 1, INK); }
    };
  }
  const enumOk = (L, v, d) => L.some(x => x[0] === v) ? v : d;
  /* ---------- os uniformes: por cima do teu boneco (pele, cabelo e barba ficam), com chapéu, capacete, crachá, capa…
     Todos desenhados pro Corre. px(x, y, w, h, cor) como nos personagens; o = { lado, costas, hy, fase, sentado } ---------- */
  const SKINS = [['', 'Sem uniforme'], ['policial', 'Policial'], ['bombeiro', 'Bombeiro'], ['ladrao', 'Ladrão'], ['medico', 'Médico'], ['chef', 'Chef'], ['astronauta', 'Astronauta'], ['pirata', 'Pirata'],
    ['ninja', 'Ninja'], ['super', 'Super Corre'], ['motoboy', 'Motoboy'], ['craque', 'Craque'], ['detetive', 'Detetive'], ['cientista', 'Cientista'], ['rei', 'Rei']];
  /* v3.66 · as skins da loja: [chave, nome, preço de reserva, raridade, a frase da vitrine]. Quem manda no preço é o banco
     (corre_skins_loja, delta-v366.sql); esse aqui só aparece se o banco não responder. Lendária 1,00, rara 0,60, estilo 0,30 */
  const SKINS_LOJA = [
    ['farao', 'Faraó', 1, 'lendaria', 'Nemes listrado de azul e ouro, colar largo e o brilho do templo.'],
    ['diva', 'Diva do Calçadão', 1, 'lendaria', 'Vestido longo de paetê rosa, estola de pluma e tiara de strass.'],
    ['carnaval', 'Destaque da Avenida', 1, 'lendaria', 'Leque de plumas maior que você e macacão de lantejoula dourada.'],
    ['samurai', 'Samurai do Igapó', 1, 'lendaria', 'Armadura vermelha, elmo com crista de ouro e a bandeira do ipê nas costas.'],
    ['cavaleiro', 'Cavaleiro de Prata', 1, 'lendaria', 'Armadura que reluz, elmo com pluma rosa e capa azul.'],
    ['galaxia', 'Galáxia', 1, 'lendaria', 'Roupa de céu de noite com estrelas que piscam e capacete-bolha.'],
    ['cangaceiro', 'Cangaceiro', .6, 'rara', 'Chapéu de couro meia-lua com estrela, cartucheira e lenço vermelho.'],
    ['peao', 'Peão da Expo', .6, 'rara', 'Chapéu de caubói, camisa xadrez, fivela gigante e bota.'],
    ['mc', 'MC de Ouro', .6, 'rara', 'Moletom preto, corrente grossa, boné de aba reta e óculos dourados.'],
    ['mago', 'Mago Lilás', .6, 'rara', 'Túnica de estrelas, chapéu com lua e cajado de cristal.'],
    ['vampiro', 'Vampiro Chique', .6, 'rara', 'Capa preta, gola vermelha alta, colete vinho e caninos.'],
    ['anjo', 'Anjo', .6, 'rara', 'Asas brancas, auréola de ouro e túnica até o chão.'],
    ['luchador', 'Lutador Mascarado', .6, 'rara', 'Máscara de luta livre, capa curta e cinturão de campeão.'],
    ['fada', 'Fada do Ipê', .6, 'rara', 'Asas de borboleta, saia de tule e coroa de flor de ipê.'],
    ['capeta', 'Capetinha', .3, 'estilo', 'Chifrinhos, colete vermelho e rabo de seta.'],
    ['mumia', 'Múmia', .3, 'estilo', 'Enrolada da cabeça aos pés, com o olho aceso.'],
    ['piloto', 'Piloto Turbo', .3, 'estilo', 'Macacão branco com faixa quadriculada e capacete rosa.'],
    ['rockeiro', 'Rockeiro', .3, 'estilo', 'Jaqueta de couro com tachas, bandana e a guitarra nas costas.'],
    /* v3.91 · a coleção de Halloween: só se compra de 1º/10 até Finados (halloween()); comprou, é tua pra sempre */
    ['abobora', 'Cabeça de Abóbora', 1, 'halloween', 'Abóbora entalhada com a vela acesa por dentro, gravata-borboleta e tênis laranja.'],
    ['saci', 'Saci', 1, 'halloween', 'Carapuça vermelha, cachimbo soltando fumaça e o redemoinho em volta. 31 de outubro também é o Dia do Saci.'],
    ['bruxa', 'Bruxa do Caldeirão', .6, 'halloween', 'Chapéu pontudo de fivela, vestido roxo de estrelinhas e a vassoura nas costas.'],
    ['esqueleto', 'Esqueleto', .6, 'halloween', 'Macacão preto com os ossos pintados e a caveira com o olho que acende.'],
    ['lobisomem', 'Lobisomem do Tibagi', .6, 'halloween', 'Orelha, focinho, olho amarelo e a camisa rasgada de quem virou na sexta de lua cheia.'],
    ['lencol', 'Fantasma de Lençol', .3, 'halloween', 'O lençol da cama com dois furos pros olhos. O tênis aparece embaixo.'],
    ['mortovivo', 'Morto-Vivo', .3, 'halloween', 'Roupa em farrapo, pele lilás, um olho arregalado e a costura no rosto.'],
    ['gatopreto', 'Gato Preto', .3, 'halloween', 'Orelhinhas, coleira com sino e o rabo pra cima.']
  ];
  const LOJA = {}; SKINS_LOJA.forEach(x => { LOJA[x[0]] = x; }); Object.setPrototypeOf(LOJA, null);
  const RARIDADE = { lendaria: 'Lendária', rara: 'Rara', estilo: 'Estilo', halloween: 'Halloween' };
  /* v3.91: a de Halloween fora da época não se compra (quem já tem segue vestindo) */
  const foraDeEpoca = k => !!LOJA[k] && LOJA[k][3] === 'halloween' && !halloween();
  /* todas as skins que o avatar aceita (o desenho de quem passa na cidade também passa por aqui) */
  const SKINS_TODAS = SKINS.concat(SKINS_LOJA.map(x => [x[0], x[1]]));
  const SKIN = {};
  {
    const NAVY = '#1F3D7A', VERM = '#E2412E', OURO = '#E2B04A', BR = '#F4F3EF', CEU = '#9CC9F0', ACO = '#8F96A0', BEGE = '#C9B79C', VINHO = '#7A1F3D', CIANO = '#38E1FF', MARROM = '#8C5A2E', VISOR = '#1B2A5A', CHUMBO = '#2B2F38';
    const faixas = (px, o, ys, c) => ys.forEach(y => { if(o.lado) px(-2, y, 4, 1, c); else { px(-4, y, 8, 1, c); px(-7, y, 3, 1, c); px(4, y, 3, 1, c); } });
    const cinto = (px, o, c, fivela) => { if(o.lado){ px(-2, -9, 4, 1, c); if(fivela) px(0, -9, 1, 1, fivela); } else { px(-4, -9, 8, 1, c); if(fivela) px(-1, -9, 2, 1, fivela); } };
    const bone = (px, o, c, aba, emblema) => { const hy = o.hy, d = sombra(c, .78); if(o.lado){ px(-4, hy - 1, 8, 3, c); px(4, hy + 1, 3, 1, aba); if(emblema) px(1, hy, 1, 1, emblema); return; } px(-4, hy - 1, 8, 3, c); px(3, hy - 1, 1, 3, d); if(!o.costas){ px(-5, hy + 2, 10, 1, aba); if(emblema) px(-1, hy, 2, 1, emblema); } else px(-2, hy + 1, 4, 1, aba); };
    const mascara = (px, o, c) => { const hy = o.hy; if(o.lado){ px(0, hy + 4, 4, 1, c); px(3, hy + 4, 1, 1, BR); } else if(!o.costas){ px(-4, hy + 4, 8, 1, c); px(-2, hy + 4, 1, 1, BR); px(1, hy + 4, 1, 1, BR); } else px(-4, hy + 4, 8, 1, c); };
    const capacete = (px, o, c, visor, listra) => { const hy = o.hy; px(-5, hy - 2, 10, 10, c); if(o.lado){ px(1, hy + 2, 4, 4, visor); px(2, hy + 3, 1, 1, CIANO); } else if(!o.costas){ px(-4, hy + 2, 8, 4, visor); px(-3, hy + 3, 2, 1, CIANO); } else if(listra) px(-1, hy - 2, 2, 10, listra); px(-5, hy + 6, 10, 2, sombra(c, .8)); };
    SKIN.policial = { R: NAVY, L: '#1B1F27', T: INK, cobre: true,
      tronco: (px, o) => { cinto(px, o, INK, OURO); if(!o.lado && !o.costas){ px(-3, -14, 1, 1, OURO); px(-4, -15, 1, 7, sombra(NAVY, .8)); px(3, -15, 1, 7, sombra(NAVY, .8)); px(1, -13, 2, 1, sombra(NAVY, .7)); } if(o.lado) px(0, -14, 1, 1, OURO); },
      cabeca: (px, o) => bone(px, o, NAVY, INK, OURO) };
    SKIN.bombeiro = { R: VERM, L: INK, T: INK, cobre: true,
      tronco: (px, o) => { faixas(px, o, [-12, -10], AMARELO); if(!o.lado && !o.costas) px(-4, -15, 1, 7, sombra(VERM, .8)); },
      cabeca: (px, o) => { const hy = o.hy; px(-5, hy - 2, 10, 4, VERM); px(-5, hy, 10, 1, AMARELO); px(-6, hy + 2, 12, 1, sombra(VERM, .7)); if(!o.lado && !o.costas) px(-1, hy - 1, 2, 1, OURO); if(o.lado) px(2, hy - 1, 1, 1, OURO); } };
    SKIN.ladrao = { R: INK, L: INK, T: INK, cobre: true,
      tronco: (px, o) => { faixas(px, o, [-14, -12, -10], BR); if(o.costas){ px(-6, -16, 7, 7, MARROM); px(-5, -15, 1, 5, sombra(MARROM, .8)); px(-3, -17, 2, 1, '#5A3A1E'); } else if(o.lado){ px(-6, -15, 4, 6, MARROM); px(-5, -16, 2, 1, '#5A3A1E'); } else px(2, -15, 1, 7, '#5A3A1E'); },
      cabeca: (px, o) => { const hy = o.hy; px(-4, hy - 2, 8, 4, INK); px(-4, hy + 1, 8, 1, CHUMBO); mascara(px, o, INK); } };
    SKIN.medico = { R: PAPEL, L: CEU, T: PAPEL, cobre: true,
      tronco: (px, o) => { if(o.lado){ px(1, -15, 1, 4, CEU); px(0, -14, 1, 3, INK); return; } if(o.costas) return; px(-3, -15, 1, 3, CEU); px(2, -15, 1, 3, CEU); px(-1, -15, 2, 4, CEU); px(0, -11, 1, 4, sombra(PAPEL, .85)); px(-2, -15, 1, 4, INK); px(1, -15, 1, 4, INK); px(-2, -11, 4, 1, INK); px(1, -10, 1, 1, ACO); px(-3, -10, 2, 1, CEU); px(2, -14, 1, 1, VERM); },
      cabeca: (px, o) => { const hy = o.hy; px(-4, hy - 1, 8, 3, CEU); px(3, hy - 1, 1, 3, sombra(CEU, .85)); if(!o.lado && !o.costas) px(-1, hy, 2, 1, PAPEL); } };
    SKIN.chef = { R: PAPEL, L: CHUMBO, T: INK, cobre: true,
      tronco: (px, o) => { if(o.lado){ px(-2, -10, 4, 6, ROSA); px(-1, -15, 2, 1, VERM); return; } px(-4, -10, 8, 6, ROSA); if(o.costas) return; px(-2, -15, 4, 1, VERM); px(-2, -13, 1, 1, INK); px(1, -13, 1, 1, INK); px(-2, -11, 1, 1, INK); px(1, -11, 1, 1, INK); px(-3, -8, 6, 1, sombra(ROSA, .8)); },
      cabeca: (px, o) => { const hy = o.hy; px(-4, hy - 1, 8, 2, PAPEL); px(-3, hy - 6, 6, 5, PAPEL); px(-4, hy - 7, 8, 2, PAPEL); px(2, hy - 6, 1, 5, sombra(PAPEL, .85)); } };
    SKIN.astronauta = { R: PAPEL, L: PAPEL, T: ACO, cobre: true,
      tronco: (px, o) => { if(o.costas){ px(-4, -15, 8, 7, ACO); px(-3, -14, 6, 5, '#AEB4BD'); px(-2, -13, 1, 1, VERM); px(1, -13, 1, 1, CIANO); return; } if(o.lado){ px(-5, -15, 3, 7, ACO); px(-2, -11, 2, 1, ACO); return; } px(-3, -14, 2, 2, AZUL); px(1, -14, 2, 1, ROSA); px(-1, -11, 2, 2, ACO); px(-1, -11, 1, 1, CIANO); px(-4, -9, 8, 1, ACO); },
      cabeca: (px, o) => { const hy = o.hy; px(-5, hy - 2, 10, 2, PAPEL); px(-5, hy, 1, 9, PAPEL); px(4, hy, 1, 9, PAPEL); px(-5, hy + 8, 10, 1, PAPEL); if(o.costas){ px(-4, hy, 8, 8, PAPEL); px(-2, hy + 1, 4, 3, ACO); } else if(o.lado){ px(-4, hy, 4, 8, PAPEL); px(0, hy + 2, 4, 5, VISOR); px(1, hy + 3, 1, 1, CIANO); } else { px(-4, hy, 8, 2, PAPEL); px(-4, hy + 2, 8, 5, VISOR); px(-3, hy + 3, 1, 1, CIANO); px(-2, hy + 3, 2, 1, AZUL); px(-4, hy + 7, 8, 1, PAPEL); } } };
    SKIN.pirata = { R: PAPEL, L: INK, T: MARROM, cobre: true,
      tronco: (px, o) => { faixas(px, o, [-14, -12, -10], VERM); cinto(px, o, '#5A3A1E', OURO); },
      cabeca: (px, o) => { const hy = o.hy; px(-4, hy - 1, 8, 3, VERM); if(o.lado){ px(-6, hy, 2, 2, VERM); px(-4, hy + 3, 8, 1, INK); px(3, hy + 4, 1, 1, INK); px(-5, hy + 6, 1, 1, OURO); return; } if(o.costas){ px(-1, hy + 1, 3, 2, VERM); px(-4, hy + 3, 8, 1, INK); return; } px(4, hy, 2, 2, VERM); px(-4, hy + 3, 8, 1, INK); px(1, hy + 4, 2, 1, INK); px(-5, hy + 6, 1, 1, OURO); } };
    SKIN.ninja = { R: INK, L: INK, T: INK, cobre: true,
      tronco: (px, o) => { if(!o.lado){ for(let i = 0; i < 6; i++) px(-3 + i, -15 + i, 1, 1, VERM); } cinto(px, o, VERM); },
      cabeca: (px, o) => { const hy = o.hy; if(o.costas){ px(-4, hy - 1, 8, 9, INK); px(-4, hy + 2, 8, 1, VERM); px(-1, hy + 3, 2, 3, VERM); return; } px(-4, hy - 1, 8, 4, INK); px(-4, hy + 5, 8, 3, INK); px(-4, hy + 2, 8, 1, VERM); if(o.lado) px(-6, hy + 2, 2, 2, VERM); } };
    SKIN.super = { R: ROSA, L: ROSA, T: AMARELO,
      atras: (px, o) => { if(o.costas) return; if(o.lado) px(-6, -16, 4, 11, AMARELO); else px(-7, -16, 14, 10, AMARELO); },
      tronco: (px, o) => { if(o.costas){ px(-6, -16, 12, 11, AMARELO); px(-6, -16, 12, 1, sombra(AMARELO, .8)); px(-6, -6, 12, 1, sombra(AMARELO, .85)); return; } cinto(px, o, AMARELO); if(o.lado) return; px(0, -14, 1, 1, AMARELO); px(-1, -13, 2, 1, AMARELO); px(-2, -12, 3, 1, AMARELO); px(0, -11, 1, 1, AMARELO); },
      cabeca: (px, o) => mascara(px, o, INK) };
    SKIN.motoboy = { R: INK, L: INK, T: INK, cobre: true,
      tronco: (px, o) => { faixas(px, o, [-11], AMARELO); if(o.costas){ px(-4, -16, 8, 8, VERM); px(-3, -15, 6, 1, sombra(VERM, .8)); px(-1, -13, 2, 2, PAPEL); } else if(o.lado) px(-6, -15, 3, 7, VERM); else { px(-3, -15, 1, 7, CHUMBO); px(2, -15, 1, 7, CHUMBO); } },
      cabeca: (px, o) => capacete(px, o, AMARELO, VISOR, INK) };
    SKIN.craque = { R: ROSA, L: INK, T: INK, manga: 'curta', perna: 'bermuda',
      tronco: (px, o) => { if(o.lado){ px(-2, -4, 3, 2, ROSA); px(0, -4, 3, 2, ROSA); return; } px(-4, -4, 4, 2, ROSA); px(0, -4, 4, 2, ROSA); px(-3, -15, 1, 8, INK); px(0, -15, 1, 8, INK); if(o.costas){ px(-3, -13, 1, 5, PAPEL); px(0, -13, 3, 5, PAPEL); px(1, -12, 1, 3, ROSA); } } };
    SKIN.detetive = { R: BEGE, L: INK, T: INK, cobre: true,
      tronco: (px, o) => { if(o.lado){ px(-2, -7, 4, 3, BEGE); px(-2, -10, 4, 1, sombra(BEGE, .7)); return; } px(-4, -7, 8, 3, BEGE); px(-4, -10, 8, 1, sombra(BEGE, .7)); px(-1, -10, 2, 1, INK); if(o.costas) return; px(-3, -15, 2, 2, sombra(BEGE, .8)); px(1, -15, 2, 2, sombra(BEGE, .8)); px(-1, -15, 2, 1, PAPEL); px(0, -14, 1, 4, VERM); },
      cabeca: (px, o) => { const hy = o.hy; px(-3, hy - 3, 6, 3, '#5A4634'); px(-3, hy - 1, 6, 1, INK); px(-6, hy, 12, 1, '#5A4634'); } };
    SKIN.cientista = { R: PAPEL, L: '#6B7480', T: BR, luva: AMARELO,
      tronco: (px, o) => { if(o.lado || o.costas) return; px(0, -11, 1, 4, sombra(PAPEL, .85)); px(-3, -12, 2, 2, sombra(PAPEL, .9)); px(-3, -13, 1, 1, AZUL); px(-2, -13, 1, 1, VERM); px(-1, -15, 2, 1, CEU); },
      cabeca: (px, o) => { const hy = o.hy; if(o.costas){ px(-4, hy + 2, 8, 1, INK); return; } px(-4, hy + 2, 8, 1, INK); if(o.lado) px(1, hy + 2, 2, 1, CIANO); else { px(-3, hy + 2, 2, 1, CIANO); px(1, hy + 2, 2, 1, CIANO); } } };
    SKIN.rei = { R: VERM, L: INK, T: INK,
      atras: (px, o) => { if(o.costas) return; if(o.lado) px(-6, -16, 4, 12, VINHO); else px(-7, -16, 14, 12, VINHO); },
      tronco: (px, o) => { if(o.costas){ px(-6, -16, 12, 12, VINHO); px(-6, -5, 12, 1, PAPEL); px(-4, -5, 1, 1, INK); px(1, -5, 1, 1, INK); return; } if(o.lado){ px(-2, -7, 4, 4, VERM); px(-2, -4, 4, 1, PAPEL); cinto(px, o, OURO); return; } px(-4, -7, 8, 4, VERM); px(-4, -4, 8, 1, PAPEL); px(-4, -15, 1, 8, PAPEL); px(3, -15, 1, 8, PAPEL); px(-4, -13, 1, 1, INK); px(3, -11, 1, 1, INK); px(-4, -9, 1, 1, INK); cinto(px, o, OURO); },
      cabeca: (px, o) => { const hy = o.hy; px(-4, hy - 2, 8, 2, OURO); px(-4, hy - 3, 1, 1, OURO); px(-1, hy - 3, 2, 1, OURO); px(3, hy - 3, 1, 1, OURO); if(!o.costas) px(-1, hy - 2, 2, 1, ROSA); } };
    /* ---------- v3.66 · as skins da loja (o Thales: "coloca muitas skins fabulosas para serem compradas") ----------
       18 uniformes pagos em correal, todos desenhados pro Corre. Mesmo jeito dos de cima, mais duas coisas: a saia
       comprida (diva, mago, anjo) cobre as pernas, e o "fx" desenha por cima de tudo o brilho que pisca (o boneco é
       desenhado a cada quadro, então o brilho anda sozinho). Nada passa de 31 pontos de altura (cabe na prévia). */
    const LAPIS = '#1F4FA8', OURO2 = '#F2D06B', PRATA = '#DDE3EA', COURO = '#8C5A2E', COURO2 = '#5A3A1E', VINHO2 = '#5A1428', SANGUE = '#B4152E',
      ROXO = '#6A4FB3', ROXO2 = '#4A3585', NOITE = '#1B1440', PLUMA = '#FFF1F7', BAND = '#E8DFC8', BAND2 = '#C9B79C', ASA = '#F4F3EF', ASA2 = '#D3D8E0',
      BOLHA = 'rgba(206,232,255,.7)', FADA = 'rgba(255,79,154,.5)', FADA2 = 'rgba(198,166,255,.55)';
    /* o brilho: dois pontinhos que acendem em cruz, apagam e pulam pra outro lugar da lista */
    const brilho = (px, L, c, n) => { const t = Math.floor(performance.now() / 150); for(let i = 0; i < (n || 2); i++){ const p = L[(t * 3 + i * 7) % L.length], f = (t + i * 2) % 4; if(f === 3) continue; px(p[0], p[1], 1, 1, '#FFFFFF'); if(f === 1){ px(p[0] - 1, p[1], 1, 1, c); px(p[0] + 1, p[1], 1, 1, c); px(p[0], p[1] - 1, 1, 1, c); px(p[0], p[1] + 1, 1, 1, c); } } };
    /* saia até o chão (sentado, só até o joelho): na frente, de costas e de lado */
    const saia = (px, o, c, c2) => {
      if(o.sentado){ if(o.lado) px(-3, -8, 7, 3, c); else px(-5, -8, 10, 3, c); return; }
      if(o.lado){ px(-3, -8, 6, 5, c); px(-4, -3, 8, 2, c); px(2, -8, 1, 5, c2); return; }
      px(-5, -8, 10, 5, c); px(-6, -3, 12, 2, c); px(4, -8, 1, 5, c2); px(5, -3, 1, 2, c2);
    };
    SKIN.farao = { R: '#F3E9D2', L: '#F3E9D2', T: OURO, cobre: true, manga: 'curta', perna: 'bermuda', loja: true,
      tronco: (px, o) => {
        if(o.lado){ px(-2, -15, 4, 1, OURO); px(-2, -14, 4, 1, LAPIS); px(-2, -13, 4, 1, OURO); px(-1, -12, 3, 1, OURO); cinto(px, o, OURO, LAPIS); return; }
        px(-4, -15, 8, 1, OURO); px(-4, -14, 8, 1, LAPIS); px(-3, -13, 6, 1, OURO); if(!o.costas){ px(-2, -12, 4, 1, LAPIS); px(-1, -11, 2, 1, OURO); }
        px(-7, -12, 3, 1, OURO); px(4, -12, 3, 1, OURO); cinto(px, o, OURO, LAPIS); if(!o.costas) px(-1, -8, 2, 3, OURO);
      },
      cabeca: (px, o) => {
        const hy = o.hy;
        if(o.lado){ px(-5, hy - 1, 9, 3, OURO); px(-5, hy, 9, 1, LAPIS); for(let r = 0; r < 9; r++) px(-5, hy + 2 + r, 3, 1, r % 2 ? LAPIS : OURO); px(3, hy - 2, 1, 2, OURO); px(3, hy + 4, 1, 1, INK); return; }
        px(-5, hy - 1, 10, 3, OURO); px(-5, hy, 10, 1, LAPIS);
        for(let r = 0; r < 9; r++){ const c = r % 2 ? LAPIS : OURO; px(-6, hy + 2 + r, 2, 1, c); px(4, hy + 2 + r, 2, 1, c); }
        if(o.costas){ px(-4, hy + 2, 8, 6, OURO); for(let r = 0; r < 6; r += 2) px(-4, hy + 2 + r, 8, 1, LAPIS); px(-2, hy + 8, 4, 2, OURO); return; }
        px(-1, hy - 3, 2, 2, OURO); px(0, hy - 3, 1, 1, SANGUE); px(-4, hy + 4, 1, 1, INK); px(3, hy + 4, 1, 1, INK); px(-1, hy + 7, 2, 2, LAPIS);
      },
      fx: (px, o) => brilho(px, o.lado ? [[-1, -15], [1, -13], [-4, -22], [2, -23], [-4, -16]] : [[-3, -15], [2, -13], [-5, -22], [4, -16], [-6, -18], [0, -11], [5, -12]], OURO2) };
    SKIN.diva = { R: ROSA, L: ROSA, T: PRATA, luva: PAPEL, manga: 'curta', loja: true,
      tronco: (px, o) => {
        saia(px, o, ROSA, '#D93A80');
        if(o.lado){ px(-3, -16, 5, 2, PLUMA); px(-4, -15, 1, 1, PLUMA); for(let r = -14; r < -2; r += 3) px(-2 + (r & 1), r, 1, 1, '#FFB3D1'); return; }
        for(let r = -14; r < -2; r += 2) for(let x = -4 + (r & 2 ? 1 : 0); x < 4; x += 3) px(x, r, 1, 1, '#FFB3D1');
        px(-6, -16, 12, 2, PLUMA); px(-7, -15, 1, 1, PLUMA); px(6, -15, 1, 1, PLUMA); px(-7, -14, 2, 4, PLUMA); px(5, -14, 2, 4, PLUMA); px(-7, -11, 1, 1, '#FFE0EE'); px(6, -11, 1, 1, '#FFE0EE');
      },
      cabeca: (px, o) => {
        const hy = o.hy;
        if(o.lado){ px(-3, hy - 1, 6, 1, PRATA); px(0, hy - 2, 1, 1, PRATA); px(-1, hy + 5, 1, 2, PRATA); return; }
        px(-3, hy - 1, 6, 1, PRATA); px(-1, hy - 2, 2, 1, PRATA); if(!o.costas){ px(0, hy - 3, 1, 1, '#38E1FF'); px(-5, hy + 5, 1, 2, PRATA); px(4, hy + 5, 1, 2, PRATA); }
      },
      fx: (px, o) => brilho(px, o.lado ? [[-2, -12], [1, -9], [-3, -5], [2, -3], [0, -24]] : [[-3, -13], [2, -11], [-4, -7], [3, -5], [0, -9], [-5, -3], [4, -2], [0, -26]], '#FFB3D1', 3) };
    SKIN.carnaval = { R: OURO, L: OURO, T: OURO, manga: 'curta', loja: true,
      atras: (px, o) => {
        const P = [ROSA, AMARELO, LILAS, LARANJA, ROSA, AMARELO, LILAS, LARANJA, ROSA];
        if(o.lado){ for(let i = 0; i < 4; i++) px(-6 - i, -30 + i * 3, 2, 16 - i * 2, P[i]); return; }
        if(o.costas) return;
        for(let i = 0; i < 9; i++){ const x = -13 + i * 3, top = -30 + Math.abs(i - 4) * 2; px(x, top, 2, -12 - top, P[i]); px(x, top - 1, 2, 1, PAPEL); }
      },
      tronco: (px, o) => {
        if(o.costas){ const P = [ROSA, AMARELO, LILAS, LARANJA, ROSA, AMARELO, LILAS, LARANJA, ROSA]; for(let i = 0; i < 9; i++){ const x = -13 + i * 3, top = -30 + Math.abs(i - 4) * 2; px(x, top, 2, -12 - top, P[i]); px(x, top - 1, 2, 1, PAPEL); } return; }
        if(o.lado){ px(-2, -9, 4, 1, ROSA); px(-1, -14, 1, 1, OURO2); px(0, -11, 1, 1, OURO2); return; }
        for(let r = -15; r < -8; r += 2) for(let x = -4 + (r & 2 ? 1 : 0); x < 4; x += 2) px(x, r, 1, 1, OURO2);
        px(-4, -9, 8, 1, ROSA); px(-1, -9, 2, 1, LILAS); px(-7, -13, 3, 1, ROSA); px(4, -13, 3, 1, ROSA);
      },
      cabeca: (px, o) => { const hy = o.hy; px(-4, hy, 8, 1, OURO); if(o.lado){ px(-4, hy - 3, 2, 3, ROSA); return; } if(!o.costas){ px(-1, hy - 1, 2, 2, ROSA); px(-3, hy - 3, 1, 3, AMARELO); px(2, hy - 3, 1, 3, LILAS); } },
      fx: (px, o) => brilho(px, o.lado ? [[-1, -13], [0, -10], [-7, -26], [-8, -20]] : [[-3, -14], [2, -12], [-12, -22], [11, -22], [-1, -30], [0, -10], [-6, -28], [6, -27]], OURO2, 3) };
    SKIN.samurai = { R: SANGUE, L: INK, T: COURO2, cobre: true, loja: true,
      atras: (px, o) => { if(o.lado){ px(-4, -29, 1, 15, COURO2); px(-8, -29, 4, 6, INK); px(-7, -27, 2, 2, ROSA); px(-7, -27, 1, 1, AMARELO); return; } if(o.costas) return; px(5, -29, 1, 15, COURO2); px(6, -29, 4, 6, INK); px(7, -27, 2, 2, ROSA); px(8, -26, 1, 1, AMARELO); },
      tronco: (px, o) => {
        const d = sombra(SANGUE, .65);
        if(o.lado){ [-14, -12, -10].forEach(y => px(-2, y, 4, 1, d)); px(-3, -15, 4, 4, SANGUE); px(-3, -12, 4, 1, INK); cinto(px, o, INK, OURO); px(-3, -8, 6, 3, SANGUE); px(-3, -6, 6, 1, INK); return; }
        [-14, -12, -10].forEach(y => { px(-4, y, 8, 1, d); if(!o.costas){ px(-3, y, 1, 1, OURO); px(2, y, 1, 1, OURO); } });
        px(-8, -15, 4, 4, SANGUE); px(-8, -12, 4, 1, INK); px(4, -15, 4, 4, SANGUE); px(4, -12, 4, 1, INK); px(-8, -14, 4, 1, d); px(4, -14, 4, 1, d);
        cinto(px, o, INK, OURO); px(-5, -8, 10, 3, SANGUE); px(-5, -6, 10, 1, INK); px(-1, -8, 1, 3, INK);
        if(o.costas){ px(-6, -29, 1, 15, COURO2); px(-10, -29, 4, 6, INK); px(-9, -27, 2, 2, ROSA); px(-9, -26, 1, 1, AMARELO); }
      },
      cabeca: (px, o) => {
        const hy = o.hy;
        if(o.lado){ px(-5, hy - 2, 9, 4, INK); px(-6, hy + 2, 4, 4, INK); px(-6, hy + 3, 4, 1, SANGUE); px(3, hy - 5, 1, 3, OURO); px(1, hy + 5, 3, 3, SANGUE); px(2, hy + 6, 2, 1, INK); return; }
        px(-5, hy - 2, 10, 4, INK); px(-1, hy - 2, 2, 1, OURO);
        if(o.costas){ px(-6, hy + 2, 12, 4, INK); px(-6, hy + 3, 12, 1, SANGUE); px(-6, hy + 5, 12, 1, SANGUE); return; }
        px(-6, hy + 1, 2, 2, INK); px(4, hy + 1, 2, 2, INK);
        px(-3, hy - 4, 1, 2, OURO); px(-4, hy - 6, 1, 2, OURO); px(2, hy - 4, 1, 2, OURO); px(3, hy - 6, 1, 2, OURO);
        px(-4, hy + 5, 8, 3, SANGUE); px(-2, hy + 6, 4, 1, INK); px(-4, hy + 5, 1, 1, sombra(SANGUE, .7));
      },
      fx: (px, o) => brilho(px, o.lado ? [[3, -28], [3, -26], [-1, -13]] : [[-4, -29], [3, -29], [-3, -27], [2, -27], [-3, -14], [2, -12]], OURO2) };
    SKIN.cavaleiro = { R: '#C9CDD3', L: '#AEB4BD', T: '#6B7480', luva: ACO, cobre: true, loja: true,
      atras: (px, o) => { if(o.costas) return; if(o.lado) px(-5, -15, 3, 12, AZUL); else px(-7, -15, 14, 12, AZUL); },
      tronco: (px, o) => {
        if(o.costas){ px(-6, -15, 12, 13, AZUL); px(-3, -14, 1, 11, sombra(AZUL, .75)); px(2, -14, 1, 11, sombra(AZUL, .75)); return; }
        if(o.lado){ px(-2, -14, 1, 4, PAPEL); cinto(px, o, COURO2, OURO); return; }
        px(-3, -14, 2, 4, PAPEL); px(0, -15, 1, 7, ACO); px(-1, -12, 2, 2, ROSA); px(-7, -15, 3, 2, '#E9ECF0'); px(4, -15, 3, 2, '#E9ECF0'); cinto(px, o, COURO2, OURO);
        px(-4, -6, 4, 1, '#E9ECF0'); px(0, -6, 4, 1, '#E9ECF0');
      },
      cabeca: (px, o) => {
        const hy = o.hy, R = '#C9CDD3';
        if(o.lado){ px(-5, hy - 1, 9, 9, R); px(0, hy + 3, 4, 1, INK); px(2, hy + 5, 1, 1, INK); px(-3, hy - 5, 3, 4, ROSA); px(-5, hy - 4, 2, 4, ROSA); px(-4, hy, 1, 3, PAPEL); return; }
        px(-5, hy - 1, 10, 9, R); px(4, hy - 1, 1, 9, ACO); px(-1, hy - 5, 2, 4, ROSA);
        if(o.costas){ px(-1, hy - 1, 2, 6, ROSA); return; }
        px(0, hy - 6, 3, 2, ROSA); px(-4, hy + 3, 8, 1, INK); px(-1, hy + 5, 1, 2, INK); px(1, hy + 5, 1, 2, INK); px(-4, hy, 1, 3, PAPEL);
      },
      fx: (px, o) => brilho(px, o.lado ? [[-2, -13], [-4, -22], [1, -18]] : [[-3, -14], [-4, -22], [3, -20], [-6, -15], [5, -15], [0, -10]], '#FFFFFF') };
    SKIN.galaxia = { R: NOITE, L: NOITE, T: LILAS, loja: true,
      tronco: (px, o) => {
        if(o.lado){ px(-2, -15, 4, 1, LILAS); px(-2, -9, 4, 1, LILAS); return; }
        px(-4, -15, 8, 1, LILAS); px(-4, -9, 8, 1, LILAS); px(-1, -9, 2, 1, ROSA);
        if(!o.costas){ px(-3, -13, 1, 1, '#8F86E8'); px(-2, -12, 1, 1, '#8F86E8'); px(0, -12, 1, 1, '#8F86E8'); px(1, -11, 1, 1, '#8F86E8'); }
      },
      cabeca: (px, o) => {
        const hy = o.hy;
        if(o.lado){ px(-4, hy - 3, 8, 1, BOLHA); px(-5, hy - 2, 1, 1, BOLHA); px(4, hy - 2, 1, 1, BOLHA); px(-6, hy - 1, 1, 8, BOLHA); px(5, hy - 1, 1, 8, BOLHA); px(4, hy, 1, 2, 'rgba(255,255,255,.85)'); return; }
        px(-4, hy - 3, 8, 1, BOLHA); px(-5, hy - 2, 1, 1, BOLHA); px(4, hy - 2, 1, 1, BOLHA); px(-6, hy - 1, 1, 8, BOLHA); px(5, hy - 1, 1, 8, BOLHA); px(-5, hy + 7, 1, 1, BOLHA); px(4, hy + 7, 1, 1, BOLHA);
        if(!o.costas) px(-5, hy - 1, 1, 2, 'rgba(255,255,255,.85)');
      },
      /* a roupa é o céu: estrelas que acendem e apagam no corpo todo */
      fx: (px, o) => {
        const t = Math.floor(performance.now() / 220), L = o.lado ? [[-1, -13], [0, -11], [-1, -6], [0, -3], [1, -14]] : [[-3, -14], [2, -13], [-2, -10], [3, -11], [-3, -5], [2, -4], [-6, -12], [5, -10], [1, -6], [-1, -3]];
        L.forEach((p, i) => { const f = (t + i * 3) % 5; if(f < 2) px(p[0], p[1], 1, 1, f ? AMARELO : '#FFFFFF'); else if(f === 2) px(p[0], p[1], 1, 1, ROSA); });
        brilho(px, o.lado ? [[-5, -24], [4, -20]] : [[-5, -24], [4, -19]], '#CDE6FF', 1);
      } };
    SKIN.cangaceiro = { R: COURO, L: '#6B4A2E', T: '#3B2D22', cobre: true, loja: true,
      tronco: (px, o) => {
        if(o.lado){ for(let i = 0; i < 7; i++) px(-2 + (i >> 1), -15 + i, 1, 1, i % 2 ? '#3B2D22' : OURO); px(0, -15, 2, 2, VERM); cinto(px, o, '#3B2D22', OURO); return; }
        for(let i = 0; i < 7; i++){ const c = i % 2 ? '#3B2D22' : OURO; px(-4 + i, -15 + i, 1, 1, c); if(!o.costas) px(3 - i, -15 + i, 1, 1, c); }
        if(!o.costas){ px(-2, -15, 4, 2, VERM); px(-1, -13, 2, 1, VERM); px(-4, -15, 1, 8, sombra(COURO, .75)); px(3, -15, 1, 8, sombra(COURO, .75)); }
        cinto(px, o, '#3B2D22', OURO); px(-7, -11, 3, 1, OURO); px(4, -11, 3, 1, OURO);
      },
      cabeca: (px, o) => {
        const hy = o.hy, d = sombra(COURO, .72);
        if(o.lado){ px(-5, hy - 3, 9, 3, COURO); px(-6, hy - 1, 12, 1, d); px(1, hy - 6, 3, 3, COURO); px(2, hy - 5, 1, 1, OURO); px(-3, hy - 2, 1, 1, OURO); return; }
        if(o.costas){ px(-6, hy - 4, 12, 4, COURO); px(-3, hy - 6, 6, 2, COURO); px(-6, hy - 1, 12, 1, d); return; }
        px(-7, hy - 2, 14, 2, COURO); px(-6, hy - 4, 12, 2, COURO); px(-4, hy - 6, 8, 2, COURO); px(-2, hy - 7, 4, 1, COURO); px(-7, hy - 1, 14, 1, d);
        px(-1, hy - 5, 2, 2, OURO); px(0, hy - 6, 1, 1, OURO); px(-2, hy - 4, 1, 1, OURO); px(1, hy - 4, 1, 1, OURO);
        px(-5, hy - 3, 1, 1, OURO); px(4, hy - 3, 1, 1, OURO); px(-3, hy - 5, 1, 1, OURO); px(2, hy - 5, 1, 1, OURO);
      } };
    SKIN.peao = { R: '#C8322E', L: '#2F4F8F', T: '#6B4A2E', loja: true,
      tronco: (px, o) => {
        const X = '#7A1F1F';
        if(o.lado){ px(0, -15, 1, 8, X); px(-2, -12, 4, 1, X); cinto(px, o, COURO2); px(0, -9, 2, 2, OURO); px(-2, -4, 3, 2, '#6B4A2E'); return; }
        px(-3, -15, 1, 8, X); px(1, -15, 1, 8, X); px(-4, -13, 8, 1, X); px(-4, -10, 8, 1, X); px(-7, -12, 3, 1, X); px(4, -12, 3, 1, X);
        if(!o.costas){ px(-2, -15, 1, 1, PAPEL); px(1, -15, 1, 1, PAPEL); }
        cinto(px, o, COURO2); if(!o.costas){ px(-2, -9, 4, 2, OURO); px(-1, -9, 2, 1, OURO2); }
        px(-4, -4, 4, 2, '#6B4A2E'); px(0, -4, 4, 2, '#6B4A2E');
      },
      cabeca: (px, o) => {
        const hy = o.hy, CH = '#C9A46A', d = sombra(CH, .72);
        if(o.lado){ px(-4, hy - 3, 7, 3, CH); px(-7, hy, 13, 1, CH); px(5, hy - 1, 1, 1, CH); px(-7, hy - 1, 1, 1, CH); px(-4, hy - 1, 7, 1, COURO2); return; }
        px(-4, hy - 3, 8, 3, CH); px(-1, hy - 3, 2, 1, d); px(-7, hy, 14, 1, CH); px(-7, hy - 1, 1, 1, CH); px(6, hy - 1, 1, 1, CH); px(-4, hy - 1, 8, 1, COURO2);
      } };
    SKIN.mc = { R: '#16181E', L: '#2B2F38', T: PAPEL, loja: true,
      tronco: (px, o) => {
        if(o.lado){ px(-2, -15, 2, 1, '#2B2F38'); px(1, -14, 1, 2, OURO); px(1, -12, 1, 2, OURO2); return; }
        if(o.costas){ px(-3, -15, 6, 2, '#2B2F38'); return; }
        px(-2, -10, 4, 2, '#2B2F38');
        px(-3, -15, 1, 2, OURO); px(2, -15, 1, 2, OURO); px(-2, -13, 1, 1, OURO); px(1, -13, 1, 1, OURO); px(-1, -12, 2, 1, OURO); px(-1, -11, 2, 2, OURO2); px(4, -9, 3, 1, OURO);
      },
      cabeca: (px, o) => {
        const hy = o.hy;
        if(o.lado){ px(-4, hy - 1, 8, 3, INK); px(4, hy + 2, 3, 1, OURO); px(1, hy + 4, 3, 1, OURO); px(2, hy + 4, 1, 1, INK); return; }
        px(-4, hy - 1, 8, 3, INK); px(3, hy - 1, 1, 3, '#2B2F38');
        if(o.costas){ px(-2, hy + 1, 4, 1, OURO); return; }
        px(-5, hy + 2, 10, 1, OURO); px(-1, hy, 2, 1, OURO); px(-4, hy + 4, 8, 1, OURO); px(-3, hy + 4, 2, 1, INK); px(1, hy + 4, 2, 1, INK);
      },
      fx: (px, o) => { if(!o.costas) brilho(px, o.lado ? [[1, -12], [1, -14]] : [[-1, -11], [0, -10], [-3, -15], [2, -14]], OURO2, 1); } };
    SKIN.mago = { R: ROXO, L: ROXO, T: '#3B2D22', loja: true,
      tronco: (px, o) => {
        saia(px, o, ROXO, ROXO2); cinto(px, o, OURO);
        if(o.lado){ px(-1, -13, 1, 1, AMARELO); px(0, -6, 1, 1, AMARELO); return; }
        px(-3, -13, 1, 1, AMARELO); px(2, -11, 1, 1, AMARELO); px(-2, -6, 1, 1, PAPEL); px(2, -4, 1, 1, AMARELO); px(-4, -3, 1, 1, PAPEL);
        if(!o.costas){ px(7, -15, 1, 9, COURO); px(6, -17, 3, 2, '#38E1FF'); px(7, -18, 1, 1, '#9CEBFF'); }
      },
      cabeca: (px, o) => {
        const hy = o.hy;
        px(-6, hy, 12, 1, ROXO); px(-4, hy - 1, 8, 1, ROXO2); px(-4, hy - 3, 8, 2, ROXO); px(-3, hy - 5, 6, 2, ROXO); px(-2, hy - 7, 4, 2, ROXO); px(-1, hy - 8, 2, 1, ROXO); px(1, hy - 8, 2, 1, ROXO);
        if(!o.costas){ px(-1, hy - 4, 2, 2, AMARELO); px(-1, hy - 4, 1, 1, ROXO); px(2, hy - 2, 1, 1, AMARELO); }
      },
      fx: (px, o) => { if(!o.costas && !o.lado) brilho(px, [[7, -18], [6, -17], [8, -16]], '#9CEBFF', 1); } };
    SKIN.vampiro = { R: VINHO2, L: INK, T: INK, loja: true,
      atras: (px, o) => { if(o.costas) return; if(o.lado){ px(-6, -16, 4, 15, INK); px(-3, -16, 1, 15, SANGUE); } else px(-8, -16, 16, 15, INK); },
      tronco: (px, o) => {
        if(o.costas){ px(-7, -16, 14, 15, INK); px(-6, -18, 12, 3, SANGUE); px(-6, -18, 1, 1, INK); px(5, -18, 1, 1, INK); return; }
        if(o.lado){ px(-3, -18, 2, 4, SANGUE); px(1, -15, 1, 3, PAPEL); return; }
        px(-1, -15, 2, 3, PAPEL); px(-1, -12, 2, 1, OURO); px(-4, -15, 1, 8, INK); px(3, -15, 1, 8, INK);
        px(-7, -18, 2, 4, SANGUE); px(5, -18, 2, 4, SANGUE); px(-7, -19, 1, 1, SANGUE); px(6, -19, 1, 1, SANGUE);
      },
      cabeca: (px, o) => { if(o.lado || o.costas) return; const hy = o.hy; px(-1, hy + 6, 1, 1, PAPEL); px(1, hy + 6, 1, 1, PAPEL); px(-1, hy, 2, 1, INK); } };
    SKIN.anjo = { R: PAPEL, L: PAPEL, T: OURO, loja: true,
      atras: (px, o) => {
        if(o.costas) return;
        if(o.lado){ px(-7, -20, 5, 12, ASA); px(-8, -18, 1, 8, ASA2); px(-6, -9, 3, 2, ASA2); return; }
        [[-11, -19, 5, 2], [-12, -17, 6, 3], [-11, -14, 5, 3], [-10, -11, 4, 2]].forEach(([x, y, w, h]) => { px(x, y, w, h, ASA); px(-x - w, y, w, h, ASA); });
        px(-12, -15, 1, 3, ASA2); px(11, -15, 1, 3, ASA2); px(-10, -12, 1, 1, ASA2); px(9, -12, 1, 1, ASA2);
      },
      tronco: (px, o) => {
        saia(px, o, PAPEL, '#DDE3EA'); cinto(px, o, OURO);
        if(o.costas){ px(-9, -19, 7, 11, ASA); px(2, -19, 7, 11, ASA); px(-9, -11, 1, 3, ASA2); px(8, -11, 1, 3, ASA2); px(-3, -18, 1, 9, ASA2); px(2, -18, 1, 9, ASA2); }
      },
      cabeca: (px, o) => { const hy = o.hy; if(o.lado){ px(-3, hy - 5, 6, 1, OURO); px(-2, hy - 4, 4, 1, OURO2); return; } px(-3, hy - 5, 6, 1, OURO); px(-4, hy - 4, 1, 1, OURO); px(3, hy - 4, 1, 1, OURO); px(-3, hy - 3, 6, 1, OURO2); },
      fx: (px, o) => brilho(px, [[-3, -28], [2, -28], [0, -26]], OURO2, 1) };
    SKIN.luchador = { R: AZUL, L: AZUL, T: PAPEL, cobre: true, manga: 'curta', loja: true,
      atras: (px, o) => { if(o.costas) return; if(o.lado) px(-5, -16, 3, 9, OURO); else px(-6, -16, 12, 9, OURO); },
      tronco: (px, o) => {
        if(o.costas){ px(-6, -16, 12, 9, OURO); px(-6, -8, 12, 1, AZUL); return; }
        if(o.lado){ px(-2, -10, 4, 2, OURO); px(1, -10, 1, 2, OURO2); px(-2, -4, 3, 1, AZUL); return; }
        px(-4, -15, 1, 2, OURO); px(3, -15, 1, 2, OURO); px(-4, -10, 8, 2, OURO); px(-2, -10, 4, 2, OURO2); px(-1, -10, 2, 1, ROSA);
        px(-4, -4, 4, 1, AZUL); px(0, -4, 4, 1, AZUL);
      },
      cabeca: (px, o) => {
        const hy = o.hy;
        if(o.lado){ px(-4, hy, 8, 8, AZUL); px(2, hy + 3, 2, 2, PAPEL); px(3, hy + 4, 1, 1, INK); px(1, hy + 2, 3, 1, OURO); px(-4, hy + 3, 2, 1, OURO); px(2, hy + 6, 1, 1, '#3B1A1A'); return; }
        px(-4, hy, 8, 8, AZUL); px(-1, hy, 2, 3, OURO);
        if(o.costas){ for(let r = 2; r < 7; r++) px(-1 + (r % 2), hy + r, 1, 1, PAPEL); return; }
        px(-3, hy + 3, 2, 2, PAPEL); px(1, hy + 3, 2, 2, PAPEL); px(-2, hy + 4, 1, 1, INK); px(1, hy + 4, 1, 1, INK);
        px(-4, hy + 2, 2, 1, OURO); px(2, hy + 2, 2, 1, OURO); px(-4, hy + 5, 1, 1, ROSA); px(3, hy + 5, 1, 1, ROSA); px(-1, hy + 6, 2, 1, '#3B1A1A');
      } };
    SKIN.fada = { R: LILAS, L: '#FFB3D1', T: ROSA, manga: 'curta', loja: true,
      atras: (px, o) => {
        if(o.costas) return;
        if(o.lado){ px(-7, -21, 4, 7, FADA); px(-6, -14, 3, 5, FADA2); px(-7, -21, 1, 1, ROSA); return; }
        px(-11, -21, 6, 7, FADA); px(5, -21, 6, 7, FADA); px(-10, -13, 5, 5, FADA2); px(5, -13, 5, 5, FADA2);
        px(-11, -21, 1, 1, ROSA); px(10, -21, 1, 1, ROSA); px(-9, -18, 1, 1, AMARELO); px(8, -18, 1, 1, AMARELO);
      },
      tronco: (px, o) => {
        if(o.costas){ px(-9, -21, 7, 7, FADA); px(2, -21, 7, 7, FADA); px(-8, -13, 5, 5, FADA2); px(3, -13, 5, 5, FADA2); }
        if(o.lado){ px(-3, -9, 6, 2, '#E8D4FF'); return; }
        px(-6, -9, 12, 2, '#E8D4FF'); px(-5, -7, 10, 1, '#E8D4FF'); px(-6, -9, 1, 1, LILAS); px(5, -9, 1, 1, LILAS);
        if(!o.costas){ px(-1, -15, 2, 1, ROSA); px(-1, -13, 2, 2, '#FFB3D1'); }
      },
      cabeca: (px, o) => {
        const hy = o.hy;
        if(o.lado){ px(-4, hy - 1, 8, 1, '#FFB3D1'); px(-3, hy - 2, 2, 2, ROSA); px(1, hy - 2, 2, 2, AMARELO); return; }
        px(-4, hy - 1, 8, 1, '#FFB3D1'); px(-4, hy - 2, 2, 2, ROSA); px(-1, hy - 2, 2, 2, AMARELO); px(2, hy - 2, 2, 2, ROSA);
      },
      fx: (px, o) => brilho(px, o.lado ? [[-6, -19], [-5, -12], [-7, -16]] : [[-9, -19], [8, -19], [-7, -11], [7, -11], [-11, -15], [10, -15]], '#FFB3D1') };
    SKIN.capeta = { R: VERM, L: SANGUE, T: INK, loja: true,
      atras: (px, o) => {
        if(o.costas) return;
        if(o.lado){ px(-5, -7, 2, 1, VERM); px(-6, -9, 1, 2, VERM); px(-7, -11, 1, 2, VERM); px(-8, -12, 3, 1, VERM); px(-7, -13, 1, 1, VERM); return; }
        px(4, -7, 2, 1, VERM); px(6, -8, 1, 2, VERM); px(7, -10, 1, 2, VERM); px(6, -12, 3, 2, VERM); px(7, -13, 1, 1, VERM);
      },
      tronco: (px, o) => {
        if(o.costas){ px(-1, -8, 2, 1, VERM); px(0, -7, 1, 3, VERM); px(-1, -4, 3, 1, VERM); return; }
        if(o.lado) return;
        px(-2, -15, 4, 1, SANGUE); px(-1, -14, 2, 1, SANGUE); px(-4, -9, 8, 1, INK);
      },
      cabeca: (px, o) => {
        const hy = o.hy, C2 = '#E2412E';
        if(o.lado){ px(1, hy - 2, 1, 2, C2); px(2, hy - 3, 1, 1, C2); return; }
        px(-4, hy - 2, 1, 2, C2); px(-5, hy - 3, 1, 1, C2); px(3, hy - 2, 1, 2, C2); px(4, hy - 3, 1, 1, C2);
      } };
    SKIN.mumia = { R: BAND, L: BAND, T: BAND2, luva: BAND, cobre: true, loja: true,
      tronco: (px, o) => {
        if(o.lado){ px(-2, -14, 3, 1, BAND2); px(-1, -11, 3, 1, BAND2); px(-2, -5, 3, 1, BAND2); px(-2, -8, 1, 3, BAND); return; }
        px(-4, -14, 5, 1, BAND2); px(-1, -12, 5, 1, BAND2); px(-4, -10, 4, 1, BAND2); px(-7, -13, 3, 1, BAND2); px(4, -11, 3, 1, BAND2);
        px(-4, -5, 4, 1, BAND2); px(0, -3, 4, 1, BAND2);
        if(!o.costas){ px(4, -10, 2, 1, BAND); px(5, -9, 1, 2, BAND); }
      },
      cabeca: (px, o) => {
        const hy = o.hy;
        px(-4, hy, 8, 8, BAND); px(-4, hy + 1, 8, 1, BAND2); px(-4, hy + 6, 8, 1, BAND2);
        if(o.lado){ px(2, hy + 3, 2, 2, '#2B2F38'); px(3, hy + 4, 1, 1, AMARELO); return; }
        if(o.costas){ px(-4, hy + 3, 8, 1, BAND2); px(3, hy + 4, 2, 1, BAND); return; }
        px(-3, hy + 3, 6, 2, '#2B2F38'); px(-2, hy + 4, 1, 1, AMARELO); px(1, hy + 4, 1, 1, AMARELO);
      } };
    SKIN.piloto = { R: PAPEL, L: PAPEL, T: INK, luva: ROSA, cobre: true, loja: true,
      tronco: (px, o) => {
        if(o.lado){ px(-2, -15, 1, 8, ROSA); for(let i = 0; i < 4; i++) px(-2 + i, -11, 1, 1, i % 2 ? INK : PAPEL); px(-2, -7, 1, 5, ROSA); return; }
        px(-1, -15, 2, 8, ROSA); for(let i = 0; i < 8; i++) px(-4 + i, -11, 1, 1, i % 2 ? INK : PAPEL);
        if(!o.costas){ px(2, -14, 2, 1, AMARELO); px(-4, -14, 2, 1, AZUL); }
        px(-4, -7, 1, 5, ROSA); px(3, -7, 1, 5, ROSA); px(-7, -15, 3, 1, ROSA); px(4, -15, 3, 1, ROSA);
      },
      cabeca: (px, o) => { capacete(px, o, PAPEL, VISOR, ROSA); if(!o.costas && !o.lado) px(-1, o.hy - 2, 2, 3, ROSA); if(o.lado) px(-2, o.hy - 2, 2, 3, ROSA); } };
    SKIN.rockeiro = { R: INK, L: '#2B2F38', T: INK, loja: true,
      atras: (px, o) => { if(o.costas || o.lado) return; px(4, -24, 1, 9, COURO2); px(4, -26, 2, 2, INK); px(3, -25, 1, 1, PRATA); },
      tronco: (px, o) => {
        const TA = '#C9CDD3';
        if(o.costas){ px(-3, -12, 6, 4, '#E2412E'); px(-2, -14, 4, 2, '#E2412E'); px(-1, -12, 2, 1, INK); px(-2, -10, 4, 1, INK); px(-4, -16, 1, 2, COURO2); px(-5, -24, 1, 8, COURO2); px(-6, -26, 2, 2, INK); return; }
        if(o.lado){ px(1, -14, 1, 4, TA); px(-2, -15, 1, 1, TA); px(-1, -5, 2, 1, PAPEL); return; }
        px(-1, -15, 2, 8, '#F4F3EF'); px(-1, -12, 2, 1, ROSA); px(-3, -15, 1, 3, '#2B2F38'); px(2, -15, 1, 3, '#2B2F38'); px(2, -12, 1, 4, TA);
        px(-7, -15, 1, 1, TA); px(-5, -15, 1, 1, TA); px(4, -15, 1, 1, TA); px(6, -15, 1, 1, TA);
        px(-3, -5, 2, 1, PAPEL); px(1, -4, 2, 1, PAPEL);
      },
      cabeca: (px, o) => {
        const hy = o.hy;
        if(o.lado){ px(-4, hy + 1, 8, 1, INK); px(-5, hy + 1, 1, 2, INK); return; }
        px(-4, hy + 1, 8, 1, INK); px(-2, hy + 1, 1, 1, PAPEL); px(1, hy + 1, 1, 1, PAPEL); px(4, hy + 1, 1, 2, INK);
        if(!o.costas) px(-5, hy + 5, 1, 1, PRATA);
      } };
    /* ---------- v3.91 · a coleção de Halloween ----------
       Oito, desenhadas pro Corre, no mesmo jeito das de cima (as duas de 1,00 têm o "fx" que mexe). Duas do Brasil: o
       Saci (31/10 é o Dia do Saci) e o Lobisomem. Nada de verde: o talo da abóbora é marrom, a bruxa não é verde, e o
       morto-vivo é lilás. A vela da abóbora tremula (brasa(), a cada quadro) */
    const ABO = '#FF7A1A', ABO2 = '#D9580B', ABO3 = '#A8420A', TALO = '#6B4A32', OSSO = '#EDE6D6', OSSO2 = '#BFB6A2', BRUXA = '#3B2466', BRUXA2 = '#2A1A4A',
      PELO = '#6B4A32', PELO2 = '#4A3424', PELO3 = '#A07A55', PALIDO = '#A9A3BF', PALIDO2 = '#8A83A3', TRAPO = '#6B5B7A', PALHA = '#D9C27F', COSTURA = '#5E3A4A', BOCA = '#3B1A1A';
    const brasa = () => { const f = Math.floor(performance.now() / 110) % 7; return f === 0 ? '#FFF2A8' : f < 4 ? '#FFD23F' : '#FFB02E'; };
    SKIN.abobora = { R: INK, L: BRUXA, T: ABO, cobre: true, loja: true,
      tronco: (px, o) => {
        if(o.lado){ px(0, -15, 2, 1, ABO); cinto(px, o, ABO2); return; }
        if(!o.costas){ px(-2, -15, 1, 2, ABO); px(1, -15, 1, 2, ABO); px(-1, -14, 2, 1, ABO2); px(-1, -12, 1, 1, ABO2); px(-1, -10, 1, 1, ABO2); }
        cinto(px, o, ABO2, OURO);
      },
      cabeca: (px, o) => {
        const hy = o.hy, b = brasa();
        px(-4, hy - 1, 8, 1, ABO); px(-5, hy, 10, 7, ABO); px(-4, hy + 7, 8, 1, ABO2); px(-1, hy - 3, 2, 2, TALO); px(1, hy - 3, 1, 1, TALO);
        if(o.lado){ px(-5, hy + 1, 1, 5, ABO2); px(-1, hy - 1, 1, 8, ABO2); px(4, hy + 1, 1, 5, ABO2); px(2, hy + 2, 1, 1, b); px(2, hy + 3, 2, 1, b); px(1, hy + 5, 4, 1, b); px(2, hy + 6, 1, 1, b); return; }
        px(-2, hy - 1, 1, 8, ABO2); px(1, hy - 1, 1, 8, ABO2); px(4, hy, 1, 7, ABO2);
        if(o.costas) return;
        px(-3, hy + 2, 1, 1, b); px(-4, hy + 3, 2, 1, b); px(2, hy + 2, 1, 1, b); px(2, hy + 3, 2, 1, b); px(-1, hy + 4, 2, 1, b);
        px(-3, hy + 5, 6, 1, b); px(-2, hy + 6, 1, 1, b); px(1, hy + 6, 1, 1, b); px(-1, hy + 5, 1, 1, ABO3);
      },
      fx: (px, o) => brilho(px, o.lado ? [[0, -26], [3, -21], [-4, -12]] : [[-4, -24], [4, -22], [0, -26], [-3, -13], [3, -10]], '#FFB02E') };
    SKIN.saci = { R: '#E8DFC8', L: VERM, T: '#5E3A26', manga: 'curta', perna: 'bermuda', loja: true,
      tronco: (px, o) => {
        if(o.lado){ px(-2, -9, 4, 1, MARROM); px(-1, -13, 2, 2, BEGE); return; }
        cinto(px, o, MARROM); if(o.costas) return;
        px(-3, -13, 2, 2, BEGE); px(-3, -13, 1, 1, MARROM); px(2, -11, 1, 2, BEGE);
      },
      cabeca: (px, o) => {
        const hy = o.hy;
        if(o.lado){
          px(-4, hy - 1, 8, 2, VERM); px(-4, hy, 8, 1, SANGUE); px(-4, hy - 2, 7, 1, VERM); px(-5, hy - 3, 5, 1, VERM); px(-6, hy - 4, 4, 1, VERM); px(-7, hy - 3, 2, 1, VERM); px(-7, hy - 2, 1, 2, SANGUE);
          px(4, hy + 6, 2, 1, COURO2); px(5, hy + 4, 2, 2, '#3B2D22'); px(5, hy + 4, 2, 1, ABO); return;
        }
        px(-4, hy - 1, 8, 2, VERM); px(-4, hy, 8, 1, SANGUE); px(-3, hy - 2, 7, 1, VERM); px(-1, hy - 3, 5, 1, VERM); px(1, hy - 4, 4, 1, VERM); px(3, hy - 5, 3, 1, VERM); px(5, hy - 4, 2, 1, VERM); px(6, hy - 3, 1, 2, SANGUE);
        if(o.costas) return;
        px(1, hy + 6, 3, 1, COURO2); px(3, hy + 4, 2, 2, '#3B2D22'); px(3, hy + 4, 2, 1, ABO);
      },
      /* a fumaça do cachimbo sobe torta, e o redemoinho gira em volta das pernas (a poeira de trás some atrás delas) */
      fx: (px, o) => {
        const t = performance.now() / 1000;
        if(!o.costas){ const bx = o.lado ? 5.5 : 3.5, by = o.hy + 3; for(let i = 0; i < 3; i++){ const f = (t * .7 + i / 3) % 1; px(Math.round(bx + Math.sin(f * 7 + i) * 1.2), Math.round(by - f * 7), f > .6 ? 1 : 2, 1, f > .7 ? 'rgba(220,221,227,.45)' : 'rgba(220,221,227,.85)'); } }
        if(o.sentado) return;
        for(let k = 0; k < 16; k++){ const a = t * 7 + k * .9, y = -1 - (k % 8), r = 4.5 + (k % 8) * .4; if(Math.sin(a) < -.25) continue; px(Math.round(Math.cos(a) * r) - 1, y, 1, 1, k % 3 ? 'rgba(201,183,156,.85)' : 'rgba(217,194,127,.95)'); }
      } };
    SKIN.bruxa = { R: BRUXA, L: BRUXA, T: INK, loja: true,
      atras: (px, o) => { if(o.costas) return; if(o.lado){ px(-4, -27, 1, 21, COURO); px(-5, -7, 3, 6, PALHA); px(-5, -7, 3, 1, COURO2); return; } px(6, -27, 1, 21, COURO); px(5, -7, 3, 6, PALHA); px(5, -7, 3, 1, COURO2); },
      tronco: (px, o) => {
        saia(px, o, BRUXA, BRUXA2); cinto(px, o, LARANJA, OURO);
        if(o.costas){ px(-6, -27, 1, 21, COURO); px(-7, -7, 3, 6, PALHA); px(-7, -7, 3, 1, COURO2); return; }
        if(o.lado){ px(-1, -13, 1, 1, LARANJA); px(0, -5, 1, 1, LARANJA); return; }
        px(-2, -15, 4, 1, LARANJA); px(-3, -12, 1, 1, LARANJA); px(2, -11, 1, 1, LARANJA); px(-2, -5, 1, 1, LARANJA); px(3, -3, 1, 1, LARANJA); px(-5, -2, 1, 1, LARANJA);
      },
      cabeca: (px, o) => {
        const hy = o.hy;
        if(o.lado){ px(-7, hy, 13, 1, INK); px(-4, hy - 2, 8, 2, INK); px(-4, hy - 1, 8, 1, LARANJA); px(-3, hy - 4, 6, 2, INK); px(-3, hy - 6, 5, 2, INK); px(-4, hy - 7, 3, 1, INK); px(-6, hy - 6, 2, 1, INK); return; }
        px(-7, hy, 14, 1, INK); px(-4, hy - 2, 8, 2, INK); px(-4, hy - 1, 8, 1, LARANJA); if(!o.costas) px(-1, hy - 1, 2, 1, OURO);
        px(-3, hy - 4, 6, 2, INK); px(-2, hy - 6, 4, 2, INK); px(0, hy - 7, 3, 1, INK); px(2, hy - 8, 2, 1, INK);
      } };
    SKIN.esqueleto = { R: INK, L: INK, T: INK, luva: OSSO, cobre: true, loja: true,
      tronco: (px, o) => {
        if(o.lado){ px(-2, -15, 1, 8, OSSO); [-14, -12, -10].forEach(y => px(-1, y, 2, 1, OSSO)); px(-2, -8, 3, 1, OSSO); px(-1, -7, 1, 5, OSSO2); return; }
        if(o.costas){ px(-1, -15, 2, 8, OSSO); px(-3, -14, 2, 2, OSSO2); px(1, -14, 2, 2, OSSO2); px(-3, -8, 6, 1, OSSO); px(-6, -14, 1, 6, OSSO2); px(5, -14, 1, 6, OSSO2); px(-3, -7, 1, 5, OSSO2); px(2, -7, 1, 5, OSSO2); return; }
        px(-1, -15, 2, 6, OSSO); [-14, -12, -10].forEach(y => { px(-3, y, 2, 1, OSSO); px(1, y, 2, 1, OSSO); });
        px(-3, -8, 6, 1, OSSO); px(-2, -9, 1, 1, OSSO2); px(1, -9, 1, 1, OSSO2);
        px(-6, -14, 1, 6, OSSO); px(5, -14, 1, 6, OSSO); px(-3, -7, 1, 5, OSSO); px(2, -7, 1, 5, OSSO);
      },
      cabeca: (px, o) => {
        const hy = o.hy;
        px(-4, hy, 8, 7, OSSO); px(-3, hy + 7, 6, 1, OSSO); px(3, hy, 1, 7, OSSO2);
        if(o.lado){ px(1, hy + 3, 2, 2, INK); px(3, hy + 5, 1, 1, INK); px(0, hy + 6, 4, 1, OSSO2); px(1, hy + 6, 1, 1, INK); px(3, hy + 6, 1, 1, INK); return; }
        if(o.costas) return;
        px(-3, hy + 3, 2, 2, INK); px(1, hy + 3, 2, 2, INK); px(-1, hy + 5, 2, 1, INK);
        px(-3, hy + 6, 6, 1, OSSO2); px(-2, hy + 6, 1, 1, INK); px(0, hy + 6, 1, 1, INK); px(2, hy + 6, 1, 1, INK);
      },
      /* o olho que acende no fundo da órbita, de vez em quando */
      fx: (px, o) => { if(o.costas || Math.floor(performance.now() / 260) % 9 > 1) return; if(o.lado) px(2, o.hy + 4, 1, 1, ROSA); else { px(-2, o.hy + 4, 1, 1, ROSA); px(1, o.hy + 4, 1, 1, ROSA); } } };
    SKIN.lobisomem = { R: VINHO, L: '#2E4A7A', T: PELO2, luva: PELO, cobre: true, loja: true,
      atras: (px, o) => { if(o.lado){ px(-4, -9, 2, 2, PELO); px(-6, -11, 2, 3, PELO); px(-7, -12, 1, 2, PELO3); } },
      tronco: (px, o) => {
        if(o.costas){ px(-1, -9, 2, 2, PELO); px(-1, -7, 2, 3, PELO); px(-1, -4, 2, 1, PELO3); px(-3, -12, 2, 2, PELO); return; }
        if(o.lado){ px(-1, -12, 2, 2, PELO); px(-2, -8, 1, 1, PELO); return; }
        px(-2, -15, 4, 1, PELO); px(-3, -13, 2, 2, PELO); px(1, -11, 2, 2, PELO);
        px(-4, -8, 1, 1, PELO); px(-1, -8, 1, 1, PELO); px(2, -8, 1, 1, PELO); px(-4, -3, 1, 1, PELO); px(3, -4, 1, 1, PELO);
      },
      cabeca: (px, o) => {
        const hy = o.hy, ORE = '#C46A8A';
        px(-4, hy, 8, 8, PELO); px(3, hy, 1, 8, PELO2);
        if(o.lado){ px(-2, hy - 3, 2, 3, PELO); px(-1, hy - 2, 1, 1, ORE); px(4, hy + 4, 3, 3, PELO3); px(6, hy + 4, 1, 1, INK); px(4, hy + 7, 3, 1, PAPEL); px(2, hy + 3, 1, 1, AMARELO); px(-5, hy + 2, 1, 4, PELO2); return; }
        px(-4, hy - 3, 2, 3, PELO); px(2, hy - 3, 2, 3, PELO);
        if(o.costas){ px(-4, hy + 2, 8, 6, PELO2); return; }
        px(-3, hy - 2, 1, 2, ORE); px(2, hy - 2, 1, 2, ORE);
        px(-3, hy + 3, 2, 1, AMARELO); px(1, hy + 3, 2, 1, AMARELO); px(-2, hy + 3, 1, 1, INK); px(1, hy + 3, 1, 1, INK);
        px(-2, hy + 4, 4, 3, PELO3); px(-1, hy + 4, 2, 1, INK); px(-2, hy + 7, 4, 1, BOCA); px(-2, hy + 7, 1, 1, PAPEL); px(1, hy + 7, 1, 1, PAPEL);
        px(-5, hy + 4, 1, 3, PELO); px(4, hy + 4, 1, 3, PELO2);
      } };
    SKIN.lencol = { R: PAPEL, L: PAPEL, T: INK, luva: PAPEL, cobre: true, loja: true,
      tronco: (px, o) => {
        const SH = '#D9DEE6';
        if(o.sentado){ if(o.lado) px(-3, -16, 7, 13, PAPEL); else { px(-6, -16, 12, 13, PAPEL); px(4, -16, 2, 13, SH); } return; }
        if(o.lado){ px(-3, -16, 7, 14, PAPEL); px(3, -16, 1, 14, SH); px(-3, -2, 2, 1, PAPEL); px(1, -2, 2, 1, PAPEL); return; }
        px(-6, -16, 12, 14, PAPEL); px(4, -16, 2, 14, SH); px(-6, -2, 2, 1, PAPEL); px(-2, -2, 3, 1, PAPEL); px(3, -2, 2, 1, SH);
      },
      cabeca: (px, o) => {
        const hy = o.hy, SH = '#D9DEE6';
        px(-3, hy - 2, 6, 1, PAPEL); px(-4, hy - 1, 8, 1, PAPEL); px(-5, hy, 10, 9, PAPEL); px(3, hy, 2, 9, SH);
        if(o.costas) return;
        if(o.lado){ px(1, hy + 3, 2, 2, INK); return; }
        px(-3, hy + 3, 2, 2, INK); px(1, hy + 3, 2, 2, INK);
      } };
    SKIN.mortovivo = { R: TRAPO, L: '#4A4E56', T: '#5A4634', luva: PALIDO, cobre: true, loja: true,
      tronco: (px, o) => {
        if(o.lado){ px(-1, -12, 1, 2, PALIDO); px(-2, -8, 1, 1, PALIDO); px(0, -4, 1, 1, PALIDO); return; }
        if(o.costas){ px(1, -13, 2, 1, PALIDO); px(-4, -8, 2, 1, PALIDO); return; }
        px(-1, -15, 2, 1, PALIDO2); px(-2, -13, 1, 2, PALIDO); px(2, -10, 1, 1, PALIDO); px(-4, -8, 1, 1, PALIDO); px(0, -8, 2, 1, PALIDO); px(3, -8, 1, 1, PALIDO);
        px(-3, -5, 1, 1, PALIDO); px(1, -3, 2, 1, PALIDO);
      },
      cabeca: (px, o) => {
        const hy = o.hy, CAB = '#3B2D22';
        px(-4, hy, 8, 8, PALIDO); px(3, hy, 1, 8, PALIDO2);
        px(-4, hy, 8, 1, CAB); px(-4, hy + 1, 2, 1, CAB); px(1, hy + 1, 1, 1, CAB); px(-2, hy - 1, 1, 1, CAB); px(2, hy - 1, 1, 1, CAB);
        if(o.lado){ px(2, hy + 3, 2, 2, PAPEL); px(3, hy + 4, 1, 1, INK); px(1, hy + 6, 3, 1, BOCA); px(-2, hy + 4, 1, 3, COSTURA); px(-3, hy + 5, 3, 1, COSTURA); return; }
        if(o.costas){ px(-4, hy + 1, 8, 2, CAB); px(0, hy + 4, 3, 1, COSTURA); return; }
        px(-3, hy + 3, 2, 2, PAPEL); px(-3, hy + 4, 1, 1, INK); px(1, hy + 4, 2, 1, INK);
        px(-2, hy + 6, 3, 1, BOCA); px(-1, hy + 7, 1, 1, PAPEL); px(1, hy + 6, 3, 1, COSTURA); px(2, hy + 5, 1, 1, COSTURA); px(2, hy + 7, 1, 1, COSTURA);
      } };
    SKIN.gatopreto = { R: INK, L: INK, T: INK, loja: true,
      atras: (px, o) => {
        if(o.costas) return;
        if(o.lado){ px(-4, -8, 2, 1, INK); px(-5, -10, 1, 2, INK); px(-6, -13, 1, 3, INK); px(-5, -14, 1, 1, INK); return; }
        px(4, -7, 2, 1, INK); px(6, -9, 1, 2, INK); px(7, -12, 1, 3, INK); px(6, -13, 1, 1, INK);
      },
      tronco: (px, o) => {
        if(o.costas){ px(-3, -15, 6, 1, ROSA); px(4, -9, 2, 1, INK); px(6, -12, 1, 3, INK); px(5, -13, 1, 1, INK); return; }
        if(o.lado){ px(-2, -15, 4, 1, ROSA); px(1, -14, 1, 1, OURO); return; }
        px(-3, -15, 6, 1, ROSA); px(-1, -14, 2, 1, OURO);
      },
      cabeca: (px, o) => {
        const hy = o.hy, BIG = '#2B2F38';
        if(o.lado){ px(0, hy - 3, 1, 1, INK); px(-1, hy - 2, 2, 2, INK); px(0, hy - 2, 1, 1, ROSA); px(3, hy + 5, 1, 1, ROSA); px(4, hy + 5, 2, 1, BIG); return; }
        px(-4, hy - 3, 1, 1, INK); px(-4, hy - 2, 2, 2, INK); px(-3, hy - 2, 1, 1, ROSA); px(3, hy - 3, 1, 1, INK); px(2, hy - 2, 2, 2, INK); px(2, hy - 2, 1, 1, ROSA);
        if(o.costas) return;
        px(-1, hy + 5, 2, 1, ROSA); px(-6, hy + 5, 2, 1, BIG); px(4, hy + 5, 2, 1, BIG); px(-6, hy + 7, 2, 1, BIG); px(4, hy + 7, 2, 1, BIG);
      } };
  }
  const idx = (L, v, d) => Number.isInteger(v) && v >= 0 && v < L.length ? v : d;
  function avPadrao(seed){
    const r = rng(hash(seed || 'corre')), pick = L => Math.floor(r() * L.length), e = L => L[pick(L)][0];
    return { pele: pick(PELES), cabelo: e(CABELOS), corCabelo: pick(CAB_CORES.slice(0, 5)), barba: r() < .3 ? e(BARBAS) : 'nada', topo: e(TOPOS), oculos: r() < .25 ? 'escuro' : 'nada',
      roupa: e(ROUPAS), corRoupa: pick(ROUPA_CORES), estampa: e(ESTAMPAS), corrente: r() < .2 ? 'ouro' : 'nada', perna: r() < .3 ? 'bermuda' : 'calca', corCalca: pick(CALCA_CORES), tenis: pick(TENIS_CORES) };
  }
  function avLimpo(v, seed){
    const d = avPadrao(seed); v = v && typeof v === 'object' ? v : {};
    return { pele: idx(PELES, v.pele, d.pele), cabelo: enumOk(CABELOS, v.cabelo, d.cabelo), corCabelo: idx(CAB_CORES, v.corCabelo, d.corCabelo), barba: enumOk(BARBAS, v.barba, 'nada'), topo: enumOk(TOPOS, v.topo, d.topo), oculos: enumOk(OCULOS, v.oculos === 'redondo' ? 'grau' : v.oculos, d.oculos),
      roupa: enumOk(ROUPAS, v.roupa, d.roupa), corRoupa: idx(ROUPA_CORES, v.corRoupa, d.corRoupa), estampa: enumOk(ESTAMPAS, v.estampa, 'nada'), corrente: enumOk(CORRENTES, v.corrente, 'nada'), perna: enumOk(PERNAS, v.perna, 'calca'), corCalca: idx(CALCA_CORES, v.corCalca, d.corCalca), tenis: idx(TENIS_CORES, v.tenis, d.tenis),
      skate: v.skate === true, personagem: enumOk(PERSONAGENS, v.personagem, ''), skin: enumOk(SKINS_TODAS, v.skin, ''),
      veiculo: typeof v.veiculo === 'string' && C.veiculos && C.veiculos.porK(v.veiculo) ? v.veiculo : '', vcor: Number.isInteger(v.vcor) && v.vcor >= 0 && v.vcor < 24 ? v.vcor : null };
  }
  /* o que o boneco leva na mão (comida dos trucks e quiosques, o peixe do píer), em pixels a partir da mão */
  const ITEM_MAO = {
    pastel: (px, x, y) => { px(x, y + 1, 5, 1, '#E7B84A'); px(x, y + 2, 5, 2, '#F2CF6B'); px(x + 4, y + 2, 1, 2, '#C9933A'); px(x + 1, y + 1, 1, 1, '#FFF1B0'); },
    smash: (px, x, y) => { px(x, y, 5, 1, '#D9A066'); px(x, y + 1, 5, 1, '#F2EC54'); px(x, y + 2, 5, 1, '#6B3A1E'); px(x, y + 3, 5, 1, '#D9A066'); px(x + 1, y, 1, 1, '#F4F3EF'); },
    churros: (px, x, y) => { px(x + 1, y - 2, 2, 7, '#B5722E'); px(x + 1, y - 1, 1, 1, '#F4F3EF'); px(x + 2, y + 1, 1, 1, '#F4F3EF'); px(x + 1, y + 3, 1, 1, '#F4F3EF'); },
    coco: (px, x, y) => { px(x, y, 5, 4, '#8C5A2E'); px(x + 1, y + 1, 1, 1, '#A8743F'); px(x + 3, y - 3, 1, 3, '#F4F3EF'); },
    sorvete: (px, x, y) => { px(x + 1, y + 1, 3, 3, '#D9A066'); px(x + 2, y + 3, 1, 1, '#B5722E'); px(x, y - 2, 5, 3, '#FF4F9A'); px(x + 1, y - 3, 3, 1, '#FF4F9A'); px(x + 1, y - 2, 1, 1, '#FFB3D1'); },
    pipoca: (px, x, y) => { px(x, y, 5, 4, '#E2412E'); px(x + 1, y, 1, 4, '#F4F3EF'); px(x + 3, y, 1, 4, '#F4F3EF'); px(x, y - 2, 5, 2, '#F4F3EF'); px(x + 1, y - 3, 1, 1, '#F2EC54'); px(x + 3, y - 2, 1, 1, '#F2EC54'); },
    acai: (px, x, y) => { px(x, y, 5, 4, '#5B3D8A'); px(x + 1, y + 1, 3, 2, '#C6A6FF'); px(x + 2, y - 2, 1, 2, '#F4F3EF'); px(x, y - 1, 5, 1, '#F4F3EF'); },
    caldo: (px, x, y) => { px(x + 1, y - 1, 3, 5, '#E8D9A0'); px(x + 1, y - 1, 3, 1, '#F4F3EF'); px(x + 3, y - 4, 1, 3, '#FF4F9A'); },
    peixe: (px, x, y) => { px(x, y, 5, 2, '#7FA7C9'); px(x + 5, y - 1, 1, 4, '#5C86A8'); px(x + 1, y, 1, 1, '#0F1218'); px(x, y + 1, 5, 1, '#B7D3E8'); },
    bota: (px, x, y) => { px(x + 1, y - 3, 2, 5, '#5A4634'); px(x + 1, y + 2, 4, 1, '#3B2D22'); px(x + 1, y - 3, 2, 1, '#8C7A66'); },
    /* v3.75: os peixes do Tibagi: a piapara (prata, três manchas e a nadadeira amarelada) e o lambari (rabo vermelho) */
    piapara: (px, x, y) => { px(x - 1, y, 8, 2, '#DDE2E8'); px(x, y - 1, 6, 1, '#C9CED6'); px(x - 1, y + 2, 7, 1, '#B7BEC7'); px(x, y, 1, 1, '#0F1218'); px(x + 2, y + 1, 1, 1, '#1B1D22'); px(x + 4, y + 1, 1, 1, '#1B1D22'); px(x + 7, y - 1, 1, 5, '#E8A04A'); px(x + 2, y - 2, 2, 1, '#E8A04A'); },
    lambari: (px, x, y) => { px(x, y, 4, 2, '#E6EAEE'); px(x + 4, y - 1, 1, 4, '#E2412E'); px(x + 1, y, 1, 1, '#0F1218'); px(x, y + 1, 4, 1, '#C9CED6'); },
    /* as coisas das tarefas: o gato resgatado, a caixa da entrega, a amostra do lago, o pergaminho */
    gato: (px, x, y) => { px(x, y, 6, 3, '#FF8A3D'); px(x + 1, y - 3, 4, 3, '#FF8A3D'); px(x + 1, y - 4, 1, 1, '#FF8A3D'); px(x + 4, y - 4, 1, 1, '#FF8A3D'); px(x + 2, y - 2, 1, 1, '#0F1218'); px(x + 4, y - 2, 1, 1, '#0F1218'); px(x + 6, y + 1, 2, 1, '#FF8A3D'); },
    caixa: (px, x, y) => { px(x, y - 1, 6, 5, '#E2412E'); px(x + 1, y, 4, 3, '#F4F3EF'); px(x + 2, y + 1, 2, 1, '#E2412E'); },
    amostra: (px, x, y) => { px(x + 1, y - 2, 3, 6, '#9CC9F0'); px(x + 1, y + 1, 3, 3, '#2F7FC1'); px(x + 1, y - 3, 3, 1, '#0F1218'); },
    pergaminho: (px, x, y) => { px(x, y - 1, 6, 4, '#F3E9D2'); px(x, y - 2, 6, 1, '#C9B79C'); px(x, y + 3, 6, 1, '#C9B79C'); px(x + 2, y, 2, 2, '#E2412E'); },
    envelope: (px, x, y) => { px(x, y - 1, 6, 4, '#F4F3EF'); px(x, y - 1, 6, 1, '#C9B79C'); px(x + 1, y, 1, 1, '#C9B79C'); px(x + 4, y, 1, 1, '#C9B79C'); px(x + 2, y + 1, 2, 1, '#C9B79C'); px(x + 2, y + 2, 2, 1, '#E2412E'); }
  };
  /* v3.55: sem protótipo: um vizinho mandando item "__proto__" ou "valueOf" achava uma "função" aqui e travava a cidade de todo mundo */
  Object.setPrototypeOf(ITEM_MAO, null);
  /* comida: o nome na placa do truck/quiosque → o item */
  const COMIDA_DE = { SMASH: 'smash', PASTEL: 'pastel', CHURROS: 'churros', COCO: 'coco', SORVETE: 'sorvete', PIPOCA: 'pipoca', ACAI: 'acai', 'CALDO DE CANA': 'caldo' };
  const COMIDAS = { smash: ['Comer um smash', 'Smash'], pastel: ['Comer um pastel', 'Pastel'], churros: ['Comer churros', 'Churros'], coco: ['Tomar água de coco', 'Água de coco'], sorvete: ['Tomar um sorvete', 'Sorvete'], pipoca: ['Comer pipoca', 'Pipoca'], acai: ['Tomar um açaí', 'Açaí'], caldo: ['Tomar caldo de cana', 'Caldo de cana'] };
  const lum = hex => { const n = parseInt(String(hex).slice(1), 16); return (0.2126 * (n >> 16 & 255) + 0.7152 * (n >> 8 & 255) + 0.0722 * (n & 255)) / 255; };
  const EST = { raio: ['0011', '0110', '1111', '0100'], estrela: ['0110', '1111', '0110', '1001'] };
  /* (fx, fy) = pés em pixels de verdade; e = tamanho do ponto; passo = fase da caminhada (ou null parado) */
  function skin(ctx, av, fx, fy, dir, passo, e, pose, ex){
    e = e || 1; const sentado = pose === 'sentado'; ex = ex || {};
    const lado = dir === 'esq' || dir === 'dir', costas = dir === 'cima', esp = dir === 'esq' ? -1 : 1, vista = lado ? 'lado' : costas ? 'costas' : 'frente';
    /* v3.40: o veículo (skate, patinete, bike, scooter, moto, carro) e o pulo */
    const VC = C.veiculos, VK = !sentado && ex.vc && VC && VC.porK(ex.vc) ? ex.vc : '', VD = VK ? VC.porK(VK) : null, PO = VK ? VC.pose(VK, vista) : null;
    const skate = VK === 'skate', salto = Math.max(0, Math.round(ex.pulo || 0)), sobe = PO ? PO.sobe : 0, rx = PO ? PO.rx : 0, capacete = !!(VD && VD.capacete) && !av.personagem;
    const P = PELES[av.pele], Pd = sombra(P, .82), Pb = sombra(P, .6), H = CAB_CORES[av.corCabelo], Hd = sombra(H, .72);
    /* o uniforme manda na roupa, na calça, no tênis e no que vai na cabeça (o personagem ganha dele) */
    const SK = !av.personagem && av.skin && SKIN[av.skin] ? SKIN[av.skin] : null;
    const R = SK ? SK.R : ROUPA_CORES[av.corRoupa], Rd = sombra(R, .78), L = SK ? SK.L : CALCA_CORES[av.corCalca], T = SK ? SK.T : TENIS_CORES[av.tenis];
    const roupa = SK ? (SK.manga === 'curta' ? 'camiseta' : 'uniforme') : av.roupa, pernaAv = SK && SK.perna ? SK.perna : av.perna, estampa = SK ? 'nada' : av.estampa, corrente = SK ? 'nada' : av.corrente, topo = capacete || (SK && SK.cabeca) ? 'nada' : av.topo, MAO = SK && SK.luva ? SK.luva : P, cobre = !!(SK && SK.cobre) || capacete;
    const CAP = R === PAPEL ? ROSA : R, OLHO = '#2B1A12', BR = '#F4F3EF';
    const st = passo == null ? 0 : Math.sin(passo), fase = (PO && !PO.pedala) ? 0 : st > .35 ? 1 : st < -.35 ? -1 : 0, bob = skate ? (passo != null && Math.sin(passo * .5) > .6 ? 1 : 0) : PO ? 0 : passo != null && Math.abs(Math.cos(passo)) > .75 ? 1 : 0;
    ctx.save(); naBase(ctx);
    /* o desenho do veículo: no chão (sobe junto no pulo), espelhado de lado como o boneco */
    const vy0 = fy - salto * e, pv = (x, y, w, h, c) => { ctx.fillStyle = c; const X = lado && esp < 0 ? -(x + w) : x; ctx.fillRect(fx + X * e, vy0 + y * e, w * e, h * e); };
    const pvC = (x, y, w, h, c) => { ctx.fillStyle = c; const X = lado && esp < 0 ? -(x + w) : x; ctx.fillRect(fx + X * e, fy + y * e, w * e, h * e); };
    const oV = VK ? { vista, ci: ex.vcor, giro: (passo || 0) * .9, pedal: (passo || 0) * .8, ri: { R, MAO }, bau: av.skin === 'motoboy' } : null;
    /* a sombra fica no chão (no pulo, encolhe) */
    if(!sentado && !ex.semSombra){ if(VK) VC.desenha(pvC, VK, oV, 'sombra'); else { const enc = Math.min(4, salto >> 2); ctx.fillStyle = 'rgba(15,18,24,.3)'; ctx.fillRect(fx - (6 - enc) * e, fy - e, (12 - enc * 2) * e, 2 * e); } }
    const oy = fy - bob * e + (sentado ? 3 * e : 0) - (sobe + salto) * e;
    const px = (x, y, w, h, c) => { ctx.fillStyle = c; const xx = x + rx, X = lado && esp < 0 ? -(xx + w) : xx; ctx.fillRect(fx + X * e, oy + y * e, w * e, h * e); };
    if(VK) VC.desenha(pv, VK, oV, 'atras');
    const fimVeiculo = () => { if(VK) VC.desenha(pv, VK, oV, 'frente'); };
    /* um personagem no lugar do boneco */
    const pers = av.personagem && PERSONAGEM[av.personagem];
    if(pers){
      pers(px, { lado, costas, l1: fase > 0 ? 1 : 0, l2: fase < 0 ? 1 : 0, sentado });
      const it = ex.item && ITEM_MAO[ex.item] ? ITEM_MAO[ex.item] : null; if(it && dir !== 'cima' && !(PO && PO.dentro)) it(px, lado ? 4 : 6, -11);
      if((ex.pesca || ex.vara) && sentado){ for(let i = 0; i < 8; i++) px(5 + (i >> 1), -8 - i, 1, 1, '#8C5A2E'); px(9, -15, 1, 1, '#8C5A2E'); if(!ex.vara){ for(let i = 0; i < 9; i++) px(10, -14 + i, 1, 1, 'rgba(15,18,24,.45)'); px(10, -5, 1, 1, '#FF4F9A'); } }
      fimVeiculo(); ctx.restore(); return;
    }
    /* o que leva na mão: na frente, do lado direito; de lado, na frente do braço; de costas não aparece */
    const item = ex.item && ITEM_MAO[ex.item] ? ITEM_MAO[ex.item] : null;
    const extras = () => {
      if(item && dir !== 'cima') item(px, lado ? 3 : 5, -11);
      /* a vara de pescar: sobe pra direita, a linha desce até a água com a boia rosa */
      if((ex.pesca || ex.vara) && sentado){ for(let i = 0; i < 8; i++) px(5 + (i >> 1), -8 - i, 1, 1, '#8C5A2E'); px(9, -15, 1, 1, '#8C5A2E'); if(!ex.vara){ for(let i = 0; i < 9; i++) px(10, -14 + i, 1, 1, 'rgba(15,18,24,.45)'); px(10, -5, 1, 1, '#FF4F9A'); } }
    };
    const contraste = lum(R) > .55 ? INK : BR, acento = R === AMARELO ? ROSA : AMARELO;
    const hy = -23, o = { lado, costas, esp, hy, fase, sentado };
    if(SK && SK.atras) SK.atras(px, o);
    if(!lado){
      /* pernas */
      const perna = (x0, lift) => { const bot = -1 - lift - (sentado ? 3 : 0); for(let r = -7; r <= bot; r++){ let c; if(r >= bot - 1) c = r === bot ? sombra(T, .72) : T; else if(pernaAv === 'bermuda' && r > -5) c = r === bot - 2 ? BR : P; else c = L; px(x0, r, 4, 1, c); px(x0 + 3, r, 1, 1, sombra(c.startsWith('#') ? c : '#888888', .82)); } };
      perna(-4, fase > 0 ? 1 : 0); perna(0, fase < 0 ? 1 : 0);
      /* braços */
      const braco = (x0, dy) => { for(let r = 0; r < 8; r++){ const c = r === 7 ? MAO : roupa === 'regata' ? P : roupa === 'camiseta' && r >= 3 ? P : R; px(x0, -15 + r + dy, 3, 1, c); px(x0 + 2, -15 + r + dy, 1, 1, sombra(c, .8)); } };
      braco(-7, fase < 0 ? 1 : 0); braco(4, fase > 0 ? 1 : 0);
      /* cabelo comprido e tranças: por trás do tronco */
      if(av.cabelo === 'longo' && costas) px(-4, -15, 8, 4, H);
      /* tronco */
      px(-4, -15, 8, 8, R); px(3, -15, 1, 8, Rd);
      if(!costas){
        if(roupa === 'camiseta') px(-1, -15, 2, 1, P);
        if(roupa === 'regata'){ px(-4, -15, 1, 2, P); px(3, -15, 1, 2, Pd); px(-2, -15, 4, 1, P); }
        if(roupa === 'moletom'){ px(-3, -15, 2, 1, Rd); px(1, -15, 2, 1, Rd); px(-2, -14, 1, 3, BR); px(1, -14, 1, 3, BR); px(-2, -10, 4, 2, Rd); }
        if(roupa === 'jaqueta'){ px(-1, -15, 2, 8, lum(R) > .5 ? INK : BR); px(-3, -15, 1, 2, Rd); px(2, -15, 1, 2, Rd); }
        if(estampa === 'listras' && roupa !== 'jaqueta'){ [-13, -11, -9].forEach(y => px(-4, y, 8, 1, contraste)); }
        if(EST[estampa] && roupa !== 'jaqueta') EST[estampa].forEach((row, i) => { for(let j = 0; j < 4; j++) if(row[j] === '1') px(-2 + j, -13 + i, 1, 1, acento); });
        if(corrente === 'ouro'){ px(-3, -15, 1, 1, '#E2B04A'); px(2, -15, 1, 1, '#E2B04A'); px(-2, -14, 1, 1, '#E2B04A'); px(1, -14, 1, 1, '#E2B04A'); px(-1, -13, 2, 1, '#F2D06B'); }
      }else if(roupa === 'moletom') px(-3, -15, 6, 2, Rd);
      if(SK && SK.tronco) SK.tronco(px, o);
      /* atrás da cabeça (capacete e touca cobrem) */
      if(!cobre){
        if(av.cabelo === 'black') px(-6, hy - 3, 12, 10, H);
        if(av.cabelo === 'longo') px(-5, hy, 10, 11, H);
        if(av.cabelo === 'trancas'){ for(let r = 0; r < 10; r++){ px(-6, hy + 2 + r, 2, 1, r % 2 ? Hd : H); px(4, hy + 2 + r, 2, 1, r % 2 ? Hd : H); } }
        if(av.cabelo === 'coque') px(-2, hy - 3, 4, 3, H);
        if(av.cabelo === 'cacheado') px(-5, hy - 1, 10, 6, H);
      }
      /* cabeça */
      px(-4, hy, 8, 8, P); px(3, hy, 1, 8, Pd);
      if(costas){
        if(av.cabelo === 'raspado') px(-4, hy, 8, 2, sombra(H, .9));
        else if(av.cabelo === 'moicano'){ px(-1, hy - 3, 2, 10, H); px(-4, hy, 8, 1, Pd); }
        else { px(-4, hy, 8, 7, H); px(3, hy, 1, 7, Hd); }
      }else{
        if(av.cabelo === 'raspado'){ px(-4, hy, 8, 1, Hd); }
        else if(av.cabelo === 'moicano'){ px(-1, hy - 3, 2, 4, H); px(-4, hy, 8, 1, Pd); }
        else if(av.cabelo === 'cacheado'){ for(let r = 0; r < 3; r++) for(let j = 0; j < 8; j++) px(-4 + j, hy - 1 + r, 1, 1, (r + j) % 2 ? Hd : H); px(-4, hy + 2, 1, 2, H); px(3, hy + 2, 1, 2, Hd); }
        else if(av.cabelo === 'longo'){ px(-4, hy, 8, 3, H); px(-4, hy + 3, 1, 5, H); px(3, hy + 3, 1, 5, Hd); }
        else { px(-4, hy, 8, 2, H); px(-4, hy + 2, 1, av.cabelo === 'black' ? 3 : 1, H); px(3, hy + 2, 1, av.cabelo === 'black' ? 3 : 1, Hd); if(av.cabelo === 'curto') px(-3, hy + 2, 2, 1, H); }
        /* rosto */
        px(-3, hy + 3, 2, 1, Hd); px(1, hy + 3, 2, 1, Hd);
        px(-3, hy + 4, 1, 1, BR); px(-2, hy + 4, 1, 1, OLHO); px(1, hy + 4, 1, 1, OLHO); px(2, hy + 4, 1, 1, BR);
        px(-1, hy + 5, 2, 1, Pd); px(-1, hy + 6, 2, 1, Pb);
        if(av.barba === 'cavanhaque'){ px(-2, hy + 7, 4, 1, H); px(-2, hy + 6, 1, 1, H); px(1, hy + 6, 1, 1, H); }
        if(av.barba === 'barba'){ px(-4, hy + 5, 1, 3, H); px(3, hy + 5, 1, 3, Hd); px(-4, hy + 7, 8, 1, H); px(-3, hy + 6, 2, 1, H); px(1, hy + 6, 2, 1, H); }
        if(av.oculos === 'escuro'){ px(-4, hy + 4, 8, 1, INK); px(-3, hy + 4, 1, 1, '#5A6070'); px(1, hy + 4, 1, 1, '#5A6070'); }
        if(av.oculos === 'grau'){ px(-4, hy + 4, 1, 1, INK); px(-1, hy + 4, 2, 1, INK); px(3, hy + 4, 1, 1, INK); px(-3, hy + 3, 2, 1, INK); px(1, hy + 3, 2, 1, INK); }
      }
      /* na cabeça */
      if(SK && SK.cabeca && !capacete) SK.cabeca(px, o);
      if(capacete) capaceteDe(px, o, VC.cor(VK, ex.vcor));
      if(topo === 'bone'){ px(-4, hy - 1, 8, 3, CAP); px(3, hy - 1, 1, 3, sombra(CAP, .8)); if(!costas){ px(-5, hy + 2, 10, 1, sombra(CAP, .65)); px(-1, hy, 2, 1, CAP === AMARELO ? ROSA : AMARELO); } else px(-2, hy + 1, 4, 1, sombra(CAP, .6)); }
      if(topo === 'bonetras'){ px(-4, hy - 1, 8, 3, CAP); px(3, hy - 1, 1, 3, sombra(CAP, .8)); if(costas) px(-5, hy + 2, 10, 1, sombra(CAP, .65)); else px(-2, hy + 1, 4, 1, sombra(CAP, .6)); }
      if(topo === 'gorro'){ px(-4, hy - 2, 8, 4, ROSA); px(-4, hy + 1, 8, 1, sombra(ROSA, .78)); px(3, hy - 2, 1, 3, sombra(ROSA, .85)); }
      if(topo === 'fone'){ px(-3, hy - 1, 6, 1, INK); px(-5, hy + 3, 2, 3, AMARELO); px(3, hy + 3, 2, 3, sombra(AMARELO, .85)); }
      if(topo === 'bandana'){ px(-4, hy + 1, 8, 1, ROSA); px(4, hy + 1, 1, 2, sombra(ROSA, .8)); }
      if(!(PO && PO.dentro)) extras();
    }else{
      /* de lado (olhando pra direita; pra esquerda é o espelho) */
      const perna = (x0, c0) => { for(let r = -7; r <= -1; r++){ const c = r >= -2 ? (r === -1 ? sombra(T, .72) : T) : pernaAv === 'bermuda' && r > -5 ? (r === -3 ? BR : P) : L; px(x0, r, 3, 1, c0 ? sombra(c.startsWith('#') ? c : '#888888', .8) : c); } px(x0 + 3, -2, 1, 2, c0 ? sombra(T, .6) : T); };
      perna(-2 - fase, true); perna(-1 + fase, false);
      if(av.cabelo === 'longo' && !cobre) px(-4, -15, 2, 4, H);
      px(-2, -15, 4, 8, R); px(1, -15, 1, 8, Rd);
      if(roupa === 'jaqueta') px(1, -15, 1, 8, lum(R) > .5 ? INK : BR);
      if(corrente === 'ouro') px(1, -14, 1, 1, '#E2B04A');
      if(SK && SK.tronco) SK.tronco(px, o);
      if(!cobre){
        if(av.cabelo === 'black') px(-6, hy - 3, 11, 10, H);
        if(av.cabelo === 'cacheado') px(-5, hy - 1, 9, 6, H);
        if(av.cabelo === 'coque') px(-5, hy - 2, 3, 3, H);
      }
      px(-4, hy, 8, 8, P);
      if(av.cabelo === 'raspado') px(-4, hy, 8, 1, Hd);
      else if(av.cabelo === 'moicano') px(-2, hy - 3, 2, 4, H);
      else { px(-4, hy, 8, 2, H); px(-4, hy + 2, 4, av.cabelo === 'longo' ? 9 : 4, H); if(av.cabelo === 'trancas') for(let r = 0; r < 8; r++) px(-5, hy + 4 + r, 2, 1, r % 2 ? Hd : H); }
      px(-1, hy + 4, 1, 2, Pd);
      px(1, hy + 3, 2, 1, Hd); px(2, hy + 4, 1, 1, BR); px(3, hy + 4, 1, 1, OLHO); px(3, hy + 6, 1, 1, Pb);
      if(av.barba !== 'nada'){ px(1, hy + 7, 3, 1, H); if(av.barba === 'barba') px(-1, hy + 5, 1, 3, H); }
      if(av.oculos !== 'nada') px(1, hy + 4, 3, 1, av.oculos === 'escuro' ? INK : 'rgba(15,18,24,.55)');
      if(SK && SK.cabeca && !capacete) SK.cabeca(px, o);
      if(capacete) capaceteDe(px, o, VC.cor(VK, ex.vcor));
      if(topo === 'bone'){ px(-4, hy - 1, 8, 3, CAP); px(4, hy + 1, 3, 1, sombra(CAP, .65)); }
      if(topo === 'bonetras'){ px(-4, hy - 1, 8, 3, CAP); px(-7, hy + 1, 3, 1, sombra(CAP, .65)); }
      if(topo === 'gorro') px(-4, hy - 2, 8, 4, ROSA);
      if(topo === 'fone'){ px(-2, hy - 1, 4, 1, INK); px(-2, hy + 3, 2, 3, AMARELO); }
      if(topo === 'bandana'){ px(-4, hy + 1, 8, 1, ROSA); px(-5, hy + 1, 1, 2, ROSA); }
      /* o braço balança na frente do tronco (na bike, no patinete e na moto, quem desenha o braço na manopla é o veículo) */
      if(!PO || PO.braco) for(let r = 0; r < 8; r++){ const c = r === 7 ? MAO : roupa === 'regata' ? P : roupa === 'camiseta' && r >= 3 ? P : R; px(-1 + (r > 3 ? fase : 0), -15 + r, 3, 1, c); }
      if(!(PO && PO.dentro)) extras();
    }
    /* v3.66 · o brilho das skins da loja, por cima de tudo */
    if(SK && SK.fx && !(PO && PO.dentro)) SK.fx(px, o);
    fimVeiculo();
    ctx.restore();
  }
  /* o capacete de quem vai de moto ou de scooter: casco na cor da moto, viseira escura */
  function capaceteDe(px, o, c){
    const hy = o.hy, cl = sombra(c, 1.25), ce = sombra(c, .72), vis = 'rgba(28,36,52,.82)';
    if(o.lado){ px(-5, hy - 2, 10, 9, c); px(-5, hy - 2, 9, 1, cl); px(1, hy + 2, 4, 3, vis); px(2, hy + 2, 2, 1, 'rgba(255,255,255,.3)'); px(-5, hy + 6, 8, 1, ce); return; }
    px(-5, hy - 2, 10, 9, c); px(-4, hy - 2, 8, 1, cl);
    if(o.costas){ px(-5, hy + 6, 10, 1, ce); px(-1, hy - 1, 2, 4, cl); return; }
    px(-4, hy + 2, 8, 3, vis); px(-3, hy + 2, 2, 1, 'rgba(255,255,255,.3)'); px(-5, hy + 6, 10, 1, ce);
  }

  function rrect(ctx, x, y, w, h, r){ ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
  /* contorno de no mínimo 1 pixel de verdade */
  function forma(ctx, cor, lw){ ctx.fillStyle = cor; ctx.fill(); ctx.lineWidth = Math.max(lw || 2, 1.05 / escala(ctx)); ctx.strokeStyle = INK; ctx.stroke(); }
  function traco(ctx, cor, lw){ ctx.lineWidth = Math.max(lw || 2, 1.05 / escala(ctx)); ctx.strokeStyle = cor; ctx.stroke(); }

  /* ---------- as casas: todo mundo tem uma casa moderna num quarteirão ---------- */
  const MAT = { concreto: '#A4A8AE', escuro: '#4A4E56', branco: '#EEEBE4', preto: '#1B1D22', corten: '#8E4B2B', madeira: '#B3793F' };
  const CASA = {
    social: { b: 'branco', u: ROSA, a: ROSA, g: 'cel', f: 'telao' }, design: { b: 'concreto', u: AMARELO, a: AMARELO, g: 'pena', f: 'vitrine' },
    foto_video: { b: 'preto', u: AZUL, a: AZUL, g: 'cam', f: 'lamina' }, site: { b: 'branco', u: LILAS, a: LILAS, g: 'code', f: 'telao' },
    trafego: { b: 'concreto', u: LARANJA, a: LARANJA, g: 'seta', f: 'lamina' }, musica: { b: 'preto', u: 'preto', a: ROSA, g: 'disco', f: 'neon' },
    eventos: { b: 'branco', u: ROSA, a: AMARELO, g: 'balao', f: 'luzes' }, reforma: { b: 'escuro', u: 'corten', a: AMARELO, g: 'martelo', f: 'andaime' },
    tecnica: { b: 'concreto', u: 'preto', a: LARANJA, g: 'chave', f: 'lamina' }, aulas: { b: 'branco', u: 'madeira', a: AZUL, g: 'livro', f: 'vitrine' },
    beleza: { b: 'branco', u: ROSA, a: ROSA, g: 'tesoura', f: 'marquise' }, tattoo: { b: 'preto', u: 'preto', a: ROSA, g: 'gota', f: 'neon' },
    moda: { b: 'branco', u: 'preto', a: AMARELO, g: 'cabide', f: 'vitrine' }, comida: { b: 'corten', u: 'madeira', a: '#E2412E', g: 'garfo', f: 'marquise', chamine: 1 },
    frete: { b: 'escuro', u: AMARELO, a: AMARELO, g: 'caixa', f: 'garagem' }, juridico: { b: 'branco', u: 'concreto', a: INK, g: 'balanca', f: 'pilotis' },
    casa: { b: 'branco', u: '#9CC9F0', a: AZUL, g: 'brilho', f: 'vasos' }, outros: { b: 'concreto', u: ROSA, a: ROSA, g: 'estrela', f: 'vitrine' }
  };
  /* v3.55: sem protótipo: categoria "constructor" não vira casa quebrada */
  Object.setPrototypeOf(CASA, null);
  const GLIFO = {
    cel: 'M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2', pena: 'M12 3l6 7-6 11-6-11zM12 10v5', cam: 'M4 8h4l2-3h4l2 3h4v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
    code: 'M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16', seta: 'M3 20l6-6 4 4 8-9M15 9h6v6', disco: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    balao: 'M12 3a6 6 0 0 1 6 6c0 4-3 7-6 7s-6-3-6-7a6 6 0 0 1 6-6zM12 16v6', martelo: 'M5 20l8-8M10 7l3-3 7 7-3 3z', chave: 'M15 4a5 5 0 0 0-4.6 6.9L4 17.3V20h2.7l6.4-6.4A5 5 0 0 0 20 9l-3 1-2-2 1-3z',
    livro: 'M4 5c3-1 6-1 8 1 2-2 5-2 8-1v14c-3-1-6-1-8 1-2-2-5-2-8-1zM12 6v14', tesoura: 'M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.5 7.5L20 18M8.5 16.5L20 6',
    gota: 'M12 3c3 4 5 7 5 10a5 5 0 0 1-10 0c0-3 2-6 5-10z', cabide: 'M10 5a2 2 0 1 1 2 2v2L3 16h18l-9-7', garfo: 'M7 3v6a2 2 0 0 0 2 2v10M11 3v6M9 3v6M16 3c2.5 2 2.5 7 0 9v9',
    caixa: 'M3 8l9-5 9 5v9l-9 5-9-5zM3 8l9 5 9-5M12 13v9', balanca: 'M12 4v16M7 20h10M4 8h16M6 8l-3 6h6zM18 8l-3 6h6z', brilho: 'M12 3v6M12 15v6M3 12h6M15 12h6M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3',
    estrela: 'M12 3l2.8 5.8 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.3l1.1-6.2L3 9.7l6.2-.9z'
  };
  const P2D = {}; const glifo = k => P2D[k] || (P2D[k] = new Path2D(GLIFO[k] || GLIFO.estrela));
  function desenhaGlifo(ctx, k, x, y, tam, cor){ ctx.save(); ctx.translate(x - tam / 2, y - tam / 2); ctx.scale(tam / 24, tam / 24); ctx.lineWidth = Math.max(2.4, 1.1 / escala(ctx)); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = cor; ctx.stroke(glifo(k)); ctx.restore(); }
  /* o quarteirão é de todo mundo; o que cresce é a casa (andares, terraço, letreiro no topo) */
  const LARG = [null, 228, 244, 260, 272];
  const nivel = p => { const s = (p.posts || 0) + 2 * (p.seg || 0) + 3 * (p.itens || 0) + 5 * (p.esc || 0); return s >= 90 ? 4 : s >= 30 ? 3 : s >= 8 ? 2 : 1; };
  const mat = v => MAT[v] || v;
  /* material de bloco: preenche com a textura (na grade dos pixels) */
  function textura(ctx, x, y, w, h, m){ ctx.fillStyle = pad(ctx, m); ctx.fillRect(x, y, w, h); }
  /* bloco com cara de cubo: frente com textura, topo mais claro e lateral mais escura */
  function bloco(ctx, x, y, w, h, m, plano){
    const dep = plano ? 0 : 4 / escala(ctx);
    if(dep){
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dep, y - dep); ctx.lineTo(x + w + dep, y - dep); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fillStyle = pad(ctx, m); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.24)'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w + dep, y - dep); ctx.lineTo(x + w + dep, y + h - dep); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fillStyle = pad(ctx, m); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.34)'; ctx.fill();
    }
    ctx.fillStyle = pad(ctx, m); ctx.fillRect(x, y, w, h);
    ctx.beginPath(); ctx.rect(x, y, w, h); traco(ctx, 'rgba(15,18,24,.85)', 1);
  }
  /* janela de caixilho preto: vidro aceso (quente) ou escuro com brilho */
  function vidro(ctx, x, y, w, h, acesa, passo){
    passo = passo || 24; const u = 1 / escala(ctx);
    ctx.fillStyle = pad(ctx, acesa ? 'vidroOn' : 'vidroOff'); ctx.fillRect(x, y, w, h);
    if(acesa){ ctx.fillStyle = 'rgba(255,140,60,.28)'; ctx.fillRect(x, y + h * .55, w, h * .45); }
    else { ctx.fillStyle = 'rgba(210,230,255,.45)'; for(let i = 0; i < 3; i++) ctx.fillRect(x + w * .18 + i * u, y + u * (2 + i * 2), u, u * 2); }
    const lw = Math.max(2, u); ctx.fillStyle = '#121419';
    for(let xx = x + passo; xx < x + w - 4; xx += passo) ctx.fillRect(xx - lw / 2, y, lw, h);
    if(h > 34) for(let yy = y + Math.round(h / 2); yy < y + h - 4; yy += h) ctx.fillRect(x, yy - lw / 2, w, lw);
    ctx.beginPath(); ctx.rect(x, y, w, h); traco(ctx, '#121419', 3);
  }
  function luzParede(ctx, x, base, alt){ const g = ctx.createLinearGradient(0, base, 0, base - alt); g.addColorStop(0, 'rgba(255,214,140,.55)'); g.addColorStop(1, 'rgba(255,214,140,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 4, base); ctx.lineTo(x + 4, base); ctx.lineTo(x + 16, base - alt); ctx.lineTo(x - 16, base - alt); ctx.closePath(); ctx.fill(); }
  function porta(ctx, x, base, w, h, cor){ ctx.beginPath(); ctx.rect(x - w / 2, base - h, w, h); forma(ctx, cor || '#121419', 2.4); ctx.fillStyle = '#FFD37A'; ctx.fillRect(x + w / 2 - 5, base - h + 4, 3, h - 8); ctx.fillStyle = '#C8CDD4'; ctx.fillRect(x - w / 2 + 6, base - h * .62, 3, h * .3); }
  /* a casa de cada um: térreo + volume de cima em balanço (outro material), caixilho preto, porta pivotante */
  function spriteCasa(c, k){
    const S = CASA[c.cat] || CASA.outros, w = c.w, tier = c.tier, r = rng(hash(c.id));
    const gH = 74, fH = 58, andares = tier >= 3 ? 3 : 2, terraco = tier === 2 || tier === 4, topoL = tier === 4;
    const corpo = gH + fH * (andares - 1), M = 40, extra = (terraco ? 30 : 6) + (topoL ? 46 : 0) + (S.chamine ? 26 : 0);
    const W = w + M * 2, H = corpo + extra + M + 24;
    const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.ceil(W * k)); cv.height = Math.max(1, Math.ceil(H * k));
    const ctx = cv.getContext('2d'); ctx.__b = V.fx || 1; ctx.scale(k, k); ctx.lineJoin = 'miter'; ctx.imageSmoothingEnabled = false;
    const x0 = M, base = H - M, px = c.portaX - c.x, lado = px > w / 2 ? 1 : -1;
    ctx.fillStyle = 'rgba(15,18,24,.22)'; ctx.fillRect(x0 - 10, base - 2, w + 20, 10);
    /* volume de cima, em balanço pro lado da porta */
    const uw = Math.round(w * .84), off = Math.round(w * .1) * lado, ux = x0 + (w - uw) / 2 + off, uy = base - corpo, uh = fH * (andares - 1);
    if(S.chamine){ const cx = ux + (lado > 0 ? 18 : uw - 30); ctx.beginPath(); ctx.rect(cx, uy - 30, 12, 34); forma(ctx, '#2B2F38', 2); }
    /* térreo */
    const recuo = S.f === 'pilotis' ? 14 : 0;
    bloco(ctx, x0 + recuo, base - gH, w - recuo * 2, gH, S.b);
    bloco(ctx, ux, uy, uw, uh, S.u);
    /* janelas em fita no volume de cima */
    for(let a = 0; a < andares - 1; a++){
      const yy = uy + a * fH + 13, jh = fH - 26;
      if(S.f === 'telao' && a === 0){ const tw = Math.round(uw * .38), tx = lado > 0 ? ux + 12 : ux + uw - 12 - tw; vidro(ctx, lado > 0 ? tx + tw + 10 : ux + 12, yy, uw - tw - 34, jh, r() < .7, 26); ctx.beginPath(); ctx.rect(tx, yy - 4, tw, jh + 8); forma(ctx, '#121419', 2.4); ctx.fillStyle = S.a; ctx.fillRect(tx + 4, yy, tw - 8, jh); desenhaGlifo(ctx, S.g, tx + tw / 2, yy + jh / 2, Math.min(24, jh - 6), INK); continue; }
      vidro(ctx, ux + 12, yy, uw - 24, jh, r() < .65, 26);
    }
    ctx.fillStyle = '#121419'; ctx.fillRect(ux - 3, uy - 6, uw + 6, 7);
    /* luz de LED embaixo do balanço */
    ctx.fillStyle = '#FFF3C4'; ctx.fillRect(ux + 4, uy + uh, uw - 8, Math.max(2, 1.05 / k));
    /* térreo: porta pivotante, vidro grande do outro lado */
    const pw = 28, ph = 58;
    if(S.f === 'garagem'){ const gx = lado > 0 ? x0 + 12 : x0 + w - 12 - 96; ctx.beginPath(); ctx.rect(gx, base - 52, 96, 52); forma(ctx, '#C9CED6', 2.4); ctx.fillStyle = 'rgba(15,18,24,.35)'; for(let yy = base - 46; yy < base; yy += 8) ctx.fillRect(gx + 3, yy, 90, Math.max(1.4, 1 / k)); }
    else { const vw = Math.round(w * .46), vx = lado > 0 ? x0 + 12 + recuo : x0 + w - 12 - vw - recuo; vidro(ctx, vx, base - gH + 14, vw, gH - 22, true, 30);
      if(S.f === 'vitrine') desenhaGlifo(ctx, S.g, vx + vw / 2, base - gH / 2 - 2, 22, INK);
      if(S.f === 'neon'){ ctx.save(); ctx.shadowColor = S.a; ctx.shadowBlur = 8; ctx.beginPath(); ctx.rect(vx - 4, base - gH + 10, vw + 8, gH - 14); traco(ctx, S.a, 3); desenhaGlifo(ctx, S.g, vx + vw / 2, base - gH / 2 - 2, 24, S.a); ctx.restore(); }
    }
    if(S.f === 'pilotis'){ ctx.fillStyle = '#121419'; [x0 + 4, x0 + w - 12].forEach(xx => ctx.fillRect(xx, base - gH, 8, gH)); }
    porta(ctx, x0 + px, base, pw, ph, S.f === 'neon' ? S.a : '#121419');
    /* marquise / luzes / andaime / lâmina / vasos */
    if(S.f === 'marquise'){ ctx.beginPath(); ctx.rect(x0 - 8, base - gH + 6, w + 16, 8); forma(ctx, S.a, 2); }
    if(S.f === 'luzes'){ ctx.fillStyle = AMARELO; for(let xx = x0 + 6; xx < x0 + w - 4; xx += 12){ const yy = base - gH + 6 + Math.abs(Math.sin((xx - x0) / 30)) * 8; ctx.fillRect(xx, yy, 4, 4); } }
    if(S.f === 'andaime'){ const ax = lado > 0 ? x0 + w - 4 : x0 - 30; ctx.save(); ctx.strokeStyle = '#9AA3AD'; ctx.lineWidth = Math.max(2, 1.05 / k); for(let yy = base; yy > uy; yy -= 40){ ctx.beginPath(); ctx.rect(ax, yy - 40, 34, 40); ctx.moveTo(ax, yy); ctx.lineTo(ax + 34, yy - 40); ctx.stroke(); } ctx.restore(); }
    if(S.f === 'lamina'){ const lx = lado > 0 ? ux + uw - 4 : ux - 18; ctx.beginPath(); ctx.rect(lx, uy + 6, 22, uh - 12); forma(ctx, S.a, 2.4); desenhaGlifo(ctx, S.g, lx + 11, uy + uh / 2, 16, INK); }
    if(S.f === 'vasos'){ [x0 + 6, x0 + w - 40].forEach(xx => { ctx.beginPath(); ctx.rect(xx, base - 18, 34, 18); forma(ctx, MAT.concreto, 2); ctx.fillStyle = ROSA; for(let i = 0; i < 4; i++) ctx.fillRect(xx + 4 + i * 8, base - 26 - (i % 2) * 4, 6, 6); }); }
    /* selo do corre na quina do volume de cima */
    if(S.f !== 'telao' && S.f !== 'lamina'){ const sx = lado > 0 ? ux + uw - 30 : ux + 6; ctx.beginPath(); ctx.rect(sx, uy + 6, 24, 24); forma(ctx, S.a === INK ? AMARELO : S.a, 2); desenhaGlifo(ctx, S.g, sx + 12, uy + 18, 17, INK); }
    /* terraço com guarda-corpo de vidro */
    if(terraco){ ctx.fillStyle = 'rgba(170,215,255,.55)'; ctx.fillRect(ux + 8, uy - 26, uw - 16, 20); ctx.fillStyle = '#121419'; ctx.fillRect(ux + 8, uy - 27, uw - 16, Math.max(2, 1.05 / k)); for(let xx = ux + 8; xx <= ux + uw - 8; xx += 40) ctx.fillRect(xx, uy - 27, Math.max(2, 1.05 / k), 21); }
    /* nível 4: letreiro no topo */
    if(topoL){ const lx = ux + uw / 2 - 52, ly = uy - (terraco ? 28 : 6) - 44; ctx.fillStyle = '#121419'; ctx.fillRect(lx + 14, ly + 30, Math.max(2, 1 / k), 16); ctx.fillRect(lx + 88, ly + 30, Math.max(2, 1 / k), 16); ctx.beginPath(); ctx.rect(lx, ly, 104, 32); forma(ctx, '#121419', 2); pixTxt(ctx, (c.nome || c.handle || '').split(' ')[0].slice(0, 8), lx + 52, ly + 16, 1, S.a === INK ? AMARELO : S.a, 'c'); }
    /* luz de chão nas paredes */
    luzParede(ctx, x0 + 14, base, 60); luzParede(ctx, x0 + w - 14, base, 60);
    /* placa com o @, do lado da porta */
    const maxC = Math.max(4, Math.floor((w * .9 * k) / 4.4));
    pixPlaca(ctx, '@' + (c.handle || ''), x0 + w / 2 - lado * Math.min(w * .22, Math.abs(px - w / 2) + 8), base - gH - 10, { max: maxC });
    return { cv, W, H, M, base };
  }

  /* ---------- dois quarteirões de quem fez o Corre: a casa (concreto, corten em balanço, vidro de caixilho preto,
     cobertura) e o estúdio (estrutura de aço aparente, vidro, piscina na cobertura e o nome em letra iluminada),
     ligados por uma passarela de vidro por cima da rua. Industrial moderno, nada de fábrica velha. ---------- */
  function spriteDois(k){
    const TW = 2 * LW + RUA, M = 44, W = TW + M * 2, H = 420 + M + 24, base = H - M;
    const cv = document.createElement('canvas'); cv.width = Math.ceil(W * k); cv.height = Math.ceil(H * k);
    const ctx = cv.getContext('2d'); ctx.__b = V.fx || 1; ctx.scale(k, k); ctx.lineJoin = 'miter'; ctx.imageSmoothingEnabled = false;
    const L = Math.max(2, 1.05 / k), ACO = '#121419';
    const ax = M + 10, aw = 280, bx = M + LW + RUA + 10, bw = 280;
    ctx.fillStyle = 'rgba(15,18,24,.25)'; ctx.fillRect(ax - 30, base - 2, aw + 40, 12); ctx.fillRect(bx - 10, base - 2, bw + 40, 12);
    /* ===== A CASA (quarteirão da esquerda) ===== */
    /* cobertura de vidro recuada */
    vidro(ctx, ax + 46, base - 262, 220, 56, true, 28); ctx.fillStyle = ACO; ctx.fillRect(ax + 40, base - 270, 232, 8);
    for(let xx = ax + 52; xx < ax + 270; xx += 36) ctx.fillRect(xx, base - 288, L, 18); ctx.fillRect(ax + 52, base - 290, 214, L);
    /* corten em balanço (2 andares), saindo pra esquerda */
    bloco(ctx, ax - 26, base - 206, 270, 122, 'corten');
    vidro(ctx, ax - 8, base - 190, 120, 88, true, 30);
    for(let i = 0; i < 4; i++){ ctx.fillStyle = i % 2 ? '#FFD37A' : '#2A3442'; ctx.fillRect(ax + 132 + i * 24, base - 192, 10, 92); ctx.beginPath(); ctx.rect(ax + 132 + i * 24, base - 192, 10, 92); traco(ctx, ACO, 2); }
    /* terraço sobre o corten, guarda-corpo de vidro */
    ctx.fillStyle = 'rgba(170,215,255,.55)'; ctx.fillRect(ax - 22, base - 226, 60, 20); ctx.fillStyle = ACO; ctx.fillRect(ax - 22, base - 227, 60, L); ctx.fillRect(ax - 22, base - 227, L, 21); ctx.fillRect(ax + 37, base - 227, L, 21);
    ctx.fillStyle = ACO; ctx.fillRect(ax - 30, base - 210, 278, 6);
    /* LED embaixo do balanço */
    ctx.fillStyle = '#FFF3C4'; ctx.fillRect(ax - 22, base - 84, 262, L);
    /* térreo: concreto de fôrma, ripado de madeira, pano de vidro e a porta pivotante */
    bloco(ctx, ax, base - 84, aw, 84, 'escuro');
    ctx.beginPath(); ctx.rect(ax + 8, base - 76, 52, 76); forma(ctx, MAT.madeira, 2); textura(ctx, ax + 8, base - 76, 52, 76, 'madeira');
    vidro(ctx, ax + 68, base - 76, 52, 66, true, 26); vidro(ctx, ax + 168, base - 76, 100, 66, true, 25);
    porta(ctx, ax + 144, base, 34, 76, ACO);
    luzParede(ctx, ax + 4, base, 80); luzParede(ctx, ax + aw - 4, base, 80);
    /* ===== O ESTÚDIO (quarteirão da direita) ===== */
    const tH = 352, top = base - tH;
    /* núcleo de concreto à direita */
    bloco(ctx, bx + 212, top, 68, tH, 'concreto');
    for(let yy = top + 30; yy < base - 40; yy += 64){ ctx.fillStyle = '#FFD37A'; ctx.fillRect(bx + 240, yy, 10, 36); ctx.beginPath(); ctx.rect(bx + 240, yy, 10, 36); traco(ctx, ACO, 2); }
    /* caixa de vidro com estrutura de aço aparente */
    const andares = [{ y: base - 84, h: 84 }, { y: base - 148, h: 64 }, { y: base - 212, h: 64 }, { y: base - 276, h: 64 }, { y: top, h: 76 }];
    const luzes = [1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1];
    andares.forEach((a, i) => { if(i === 0) return; for(let j = 0; j < 3; j++) vidro(ctx, bx + j * 70 + 4, a.y + 6, 62, a.h - 12, !!luzes[(i * 3 + j) % luzes.length], 31); });
    ctx.fillStyle = ACO;
    for(let j = 0; j <= 3; j++) ctx.fillRect(bx + j * 70 - 3, top, 7, tH);
    andares.forEach(a => ctx.fillRect(bx - 4, a.y - 3, 216, 7));
    /* contraventamento em X num vão */
    ctx.save(); ctx.beginPath(); ctx.moveTo(bx + 144, base - 148); ctx.lineTo(bx + 206, base - 212); ctx.moveTo(bx + 206, base - 148); ctx.lineTo(bx + 144, base - 212); traco(ctx, ACO, 3); ctx.restore();
    /* térreo: garagem de vidro com o carro, recepção */
    vidro(ctx, bx + 6, base - 76, 124, 72, false, 31);
    ctx.fillStyle = '#0B0C10'; ctx.beginPath(); ctx.moveTo(bx + 18, base - 10); ctx.lineTo(bx + 22, base - 30); ctx.lineTo(bx + 46, base - 44); ctx.lineTo(bx + 92, base - 44); ctx.lineTo(bx + 112, base - 30); ctx.lineTo(bx + 118, base - 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2A3442'; ctx.fillRect(bx + 50, base - 40, 38, 10); ctx.fillStyle = AMARELO; ctx.fillRect(bx + 20, base - 24, 8, 4); ctx.fillRect(bx + 108, base - 24, 8, 4);
    ctx.fillStyle = '#0B0C10'; [bx + 34, bx + 102].forEach(xx => { ctx.beginPath(); ctx.arc(xx, base - 9, 8, 0, Math.PI * 2); ctx.fill(); });
    vidro(ctx, bx + 144, base - 76, 62, 72, true, 31);
    /* escada de aço por fora, no núcleo */
    ctx.save(); ctx.strokeStyle = ACO; ctx.lineWidth = Math.max(2.4, 1.05 / k);
    for(let i = 0; i < 4; i++){ const y0 = base - i * 64, y1 = y0 - 64, xa = i % 2 ? bx + 300 : bx + 282, xb = i % 2 ? bx + 282 : bx + 300; ctx.beginPath(); ctx.moveTo(xa, y0); ctx.lineTo(xb, y1); ctx.stroke(); for(let s = 1; s < 8; s++){ const t = s / 8, sx = xa + (xb - xa) * t, sy = y0 + (y1 - y0) * t; ctx.beginPath(); ctx.moveTo(sx - 5, sy); ctx.lineTo(sx + 5, sy); ctx.stroke(); } }
    ctx.restore();
    /* cobertura: piscina com borda de vidro e o nome em letra iluminada */
    ctx.fillStyle = ACO; ctx.fillRect(bx - 6, top - 8, 292, 8);
    ctx.fillStyle = '#3EC1FF'; ctx.fillRect(bx + 10, top - 26, 180, 18); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(bx + 10, top - 26, 180, L);
    ctx.fillStyle = 'rgba(170,215,255,.5)'; ctx.fillRect(bx + 8, top - 30, 184, 22); ctx.fillStyle = ACO; ctx.fillRect(bx + 8, top - 31, 184, L);
    const pool = { x: bx + 10, y: top - 26, w: 180, h: 18 };
    ctx.beginPath(); ctx.rect(bx + 200, top - 54, 84, 46); forma(ctx, '#2B2F38', 2.4);
    const letreiro = { x: bx + 140, y: top - 74 };
    /* ===== A PASSARELA por cima da rua ===== */
    const px0 = ax + aw - 6, px1 = bx + 6, py = base - 196, ph = 40;
    ctx.fillStyle = '#FFD37A'; ctx.fillRect(px0, py, px1 - px0, ph); ctx.fillStyle = 'rgba(255,140,60,.3)'; ctx.fillRect(px0, py + ph * .55, px1 - px0, ph * .45);
    ctx.save(); ctx.strokeStyle = ACO; ctx.lineWidth = Math.max(2, 1.05 / k); for(let xx = px0, i = 0; xx < px1; xx += 22, i++){ ctx.beginPath(); ctx.moveTo(xx, i % 2 ? py : py + ph); ctx.lineTo(xx + 22, i % 2 ? py + ph : py); ctx.stroke(); } ctx.restore();
    ctx.fillStyle = ACO; ctx.fillRect(px0, py - 5, px1 - px0, 6); ctx.fillRect(px0, py + ph - 1, px1 - px0, 6);
    ctx.fillStyle = '#FFF3C4'; ctx.fillRect(px0 + 4, py + ph + 5, px1 - px0 - 8, L);
    pixPlaca(ctx, '@consanans', ax + 196, base - 96, { max: 14 });
    return { cv, W, H, M, base, pool, letreiro, ponte: { x0: px0, x1: px1, y: py, h: ph }, farol: { x: bx + 280, y: top - 58 }, porta: ax + 144 - M };
  }
  function overlayDois(ctx, s, ox, oy, t){
    /* água da piscina mexendo */
    const p = s.pool; for(let i = 0; i < 6; i++){ const xx = ox + p.x + ((t * 22 + i * 37) % p.w); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(xx, oy + p.y + 6 + (i % 3) * 4, 10, 2); }
    /* alguém atravessando a passarela */
    const b = s.ponte, f = (t * .12) % 2, pos = f < 1 ? f : 2 - f, xx = ox + b.x0 + 10 + pos * (b.x1 - b.x0 - 20);
    ctx.fillStyle = '#1B1D22'; ctx.fillRect(xx - 3, oy + b.y + 12, 6, 22); ctx.beginPath(); ctx.arc(xx, oy + b.y + 9, 4, 0, Math.PI * 2); ctx.fill();
    /* farol de topo piscando */
    if(Math.floor(t * 1.1) % 2 === 0){ ctx.save(); ctx.shadowColor = '#FF3B3B'; ctx.shadowBlur = 10; ctx.fillStyle = '#FF5A5A'; ctx.fillRect(ox + s.farol.x - 3, oy + s.farol.y - 3, 6, 6); ctx.restore(); }
    /* o nome em letra iluminada (luz quente atrás) */
    /* o nome em letra iluminada, numa chapa de aço na cobertura */
    const L = s.letreiro, w = pixLarg('CONSANANS', 2) / V.k;
    ctx.fillStyle = '#121419'; ctx.fillRect(ox + L.x - w / 2 - 12, oy + L.y - 20, w + 24, 38);
    ctx.fillStyle = '#121419'; ctx.fillRect(ox + L.x - w / 2, oy + L.y + 18, 4, 18); ctx.fillRect(ox + L.x + w / 2 - 4, oy + L.y + 18, 4, 18);
    pixTxt(ctx, 'CONSANANS', ox + L.x, oy + L.y - 1, 2, Math.sin(t * 1.3) > -.9 ? '#FFF1D2' : '#FFC98A', 'c');
  }

  /* ---------- estado ---------- */
  const V = {
    vivo: false, cv: null, ctx: null, z: 1, k: 1 / PX, cssW: 0, cssH: 0, cid: null, eu: null, remotos: new Map(), rede: null, raf: 0, t0: 0, cam: { x: 0, y: 0 },
    teclas: new Set(), alvo: null, sprites: new Map(), doisS: null, porta: null, entrando: 0, bots: [], carros: [],
    mic: false, stream: null, ac: null, nivelEu: 0, peers: new Map(), bloq: new Set(), mudos: new Set(), espera: new Map(), ultEnvio: 0, ultPres: 0
  };
  /* o código desta aba na cidade: novo a cada abertura do app (aba duplicada não divide código).
     No ar, ele é registrado no teu nome (corre_verso_entrar): é o servidor que diz quem é quem. */
  const novoSid = () => { const A = 'abcdefghijklmnopqrstuvwxyz0123456789'; try{ const b = new Uint8Array(12); crypto.getRandomValues(b); return Array.from(b, x => A[x % 36]).join(''); }catch(e){ let t = ''; for(let i = 0; i < 12; i++) t += A[Math.floor(Math.random() * 36)]; return t; } };
  let sid = novoSid();
  /* quem é quem (no ar): sid → { ok, uid, handle, nome, bloq, eu }, perguntado ao servidor */
  const QUEM = new Map(); let quemT = 0;

  /* ---------- volta pra cidade: saiu (pela porta do Mural, da Banca, da casa de alguém ou pelo menu)
     e voltou em até 20 min, você aparece onde tava, não em casa. Quem saiu por uma porta da cidade
     ganha o botão "Voltar pro Correverso" nas outras páginas. ---------- */
  const VOLTA_K = 'corre-verso-volta', VOLTA_MS = 20 * 60e3;
  const voltaLe = () => { try{ const v = JSON.parse(sessionStorage.getItem(VOLTA_K) || 'null'); return v && Number.isFinite(v.x) && Number.isFinite(v.y) && Date.now() - v.t < VOLTA_MS ? v : null; }catch(e){ return null; } };
  const voltaGrava = v => { try{ if(v) sessionStorage.setItem(VOLTA_K, JSON.stringify(v)); else sessionStorage.removeItem(VOLTA_K); }catch(e){} };
  function chipVolta(){
    if(C.EMBED) return;
    let el = document.getElementById('cvr-volta');
    const v = voltaLe(), mostra = !!(v && v.porta && C.st.user && C.st.me && !/^#\/verso/.test(location.hash));
    if(!mostra){ if(el) el.hidden = true; return; }
    if(!el){
      el = document.createElement('div'); el.id = 'cvr-volta'; el.className = 'cvr-volta';
      el.innerHTML = `<a href="#/verso" class="cvr-volta-ir">${ico('verso')}<span>Voltar pro Correverso</span></a><button type="button" class="cvr-volta-x" data-act="cvr-volta-x" aria-label="Fechar">${ico('x')}</button>`;
      document.body.appendChild(el);
    }
    el.hidden = false;
  }
  addEventListener('hashchange', () => setTimeout(chipVolta, 0));

  function meta(){
    const me = C.st.me || {}, pub = me.visibilidade === 'publico';
    const m = { sid, av: V.eu ? V.eu.av : avLimpo(me.verso, me.id), mic: V.mic, x: V.eu ? Math.round(V.eu.x) : 0, y: V.eu ? Math.round(V.eu.y) : 0 };
    const pt = minhaPatente(); if(pt) m.pt = pt;
    /* v3.75: de barco no Tibagi, e a maior piapara do dia (centésimos de kg) */
    if(V.eu && V.eu.barco){ m.bc = 1; m.bl = V.eu.barco.lado < 0 ? -1 : 1; }
    { const kg = piaparaHoje(); if(kg > 0){ m.pp = Math.round(kg * 100); m.pd = diaBR() % 1e5; } }
    /* no balcão de uma barraca: quem passa vê "trampando" (sem dizer qual barraca) */
    if(BC.aberto) m.tr = 1;
    if(V.jogo) m.jg = 1;
    /* dentro de uma casa: quem passa vê "em casa"; quem tá na mesma casa te vê lá dentro (e a voz fica entre vocês) */
    if(C.casa && C.casa.aberta()){ m.ec = 1; m.casa = C.casa.sala(); const pq = C.casa.placar ? C.casa.placar() : null; if(pq && pq.c > 0){ m.pk = pq.c; m.pr = pq.r; } const cr = C.casa.corrida ? C.casa.corrida() : null; if(cr && cr.tc > 0){ m.tc = cr.tc; m.td = cr.td; if(cr.tv) m.tv = cr.tv; } const qd = C.casa.quadra ? C.casa.quadra() : null; if(qd && qd.qp > 0){ m.qp = qd.qp; m.qd = qd.qd; } const km = C.casa.kartMeta ? C.casa.kartMeta() : null; if(km){ m.kp = km.kp; m.kpt = km.kpt; } const q = C.casa.pos(); if(q){ m.cx = Math.round(q.x * 10) / 10; m.cz = Math.round(q.z * 10) / 10; m.cy = Math.round((q.y || 0) * 10) / 10; m.cd = Math.round(q.yaw * 100) / 100; if(q.sit) m.cs = 1; }
      const dsc = C.casa.disco && C.casa.disco(); if(dsc && dsc.t){ m.disco = dsc.k || ''; m.discoT = dsc.t; } }
    /* no ar, o teu nome e o teu @ não viajam na presença (qualquer um escreveria qualquer coisa ali): vêm do servidor */
    return C.LIVE ? m : Object.assign(m, { uid: me.id || '', handle: pub ? me.handle : '', nome: pub ? String(me.nome || '').slice(0, 40) : 'perfil mocado' });
  }

  /* ---------- rede: Supabase Realtime no site, BroadcastChannel na demonstração ---------- */
  function redeLive(h){
    if(!C.api.canal) return null;
    const CFG = () => ({ config: { presence: { key: sid }, broadcast: { self: false, ack: false } } });
    let ch = null, sc = null, fim = false, pronto = false, entrou = false, tent = 0, vigia = 0;
    /* o código fica no teu nome enquanto você tá na cidade: renova de 2 em 2 minutos e quando a aba volta.
       Sem isso, quem abre o Corre em vários aparelhos (ou recarrega muito) tinha a aba mais velha apagada
       do banco, e ela virava "visitante" pros outros */
    const renova = () => { if(!fim) Promise.resolve(C.api.rpc('corre_verso_entrar', { p_sid: sid })).catch(() => {}); };
    const vida = setInterval(renova, 2 * 60e3);
    const aoVoltar = () => { if(document.visibilityState === 'visible') renova(); };
    document.addEventListener('visibilitychange', aoVoltar);
    /* registra o código desta aba no teu nome; se o sorteio bateu com o de outra pessoa, sorteia de novo */
    async function registra(){
      for(let i = 0; i < 3 && !fim; i++){
        let ok = null; try{ ok = await C.api.rpc('corre_verso_entrar', { p_sid: sid }); }catch(e){ setTimeout(renova, 5000); return; }
        if(ok !== false) return;
        sid = novoSid(); if(V.eu) V.eu.sid = sid;
      }
    }
    /* a voz combina pelo banco (corre_verso_sinal): o servidor confere quem mandou e só entrega pra quem recebe */
    function ligaSinais(){
      const uid = C.uid(); if(!uid || fim) return;
      try{
        sc = C.api.canal('verso-sinal-' + sid);
        sc.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'corre_verso_sinal', filter: 'para=eq.' + uid }, ({ new: r }) => {
          if(fim || !r || r.para_sid !== sid || !sidOk(r.de_sid) || !r.m || typeof r.m !== 'object') return;
          h.sig(r.de_sid, r.m);
        }).subscribe();
      }catch(e){ sc = null; }
    }
    /* não entrou no ar: tenta de novo uma vez com canal novo; na segunda, avisa e a cidade segue sem rede */
    const falhou = () => {
      if(fim || pronto) return; clearTimeout(vigia);
      if(tent < 2){ const v = ch; ch = null; Promise.resolve(v && C.api.semCanal(v)).then(() => setTimeout(liga, 800)); }
      else h.ok(false);
    };
    function liga(){
      if(fim) return; tent++;
      let este = null;
      try{
        este = ch = C.api.canal('correverso', CFG());
        /* o código de cada um é a CHAVE da presença (não o que vem escrito dentro). Duas pessoas na mesma chave
           (alguém copiando o código de outro) = ninguém confia: aparece como visitante e sem voz */
        este.on('presence', { event: 'sync' }, () => {
          if(fim || ch !== este) return;
          const st = este.presenceState();
          h.presenca(Object.entries(st).map(([k, a]) => { const m = a && a[a.length - 1]; if(!m || k === sid) return null; const dup = a.length > 1 && a.some(x => JSON.stringify(x.av) !== JSON.stringify(m.av)); return Object.assign({}, m, { sid: k, dup }); }).filter(Boolean));
        })
          .on('broadcast', { event: 'mv' }, ({ payload }) => { if(!fim && ch === este) h.mv(payload); })
          .on('broadcast', { event: 'emo' }, ({ payload }) => { if(!fim && ch === este) h.emo(payload); })
          .on('broadcast', { event: 'kart' }, ({ payload }) => { if(!fim && ch === este) h.kart(payload); })
          .subscribe(async s => {
            if(fim || ch !== este) return;
            if(s === 'SUBSCRIBED'){ clearTimeout(vigia); pronto = true; entrou = true; try{ await este.track(meta()); }catch(e){} h.ok(true); }
            else if(s === 'CHANNEL_ERROR' || s === 'TIMED_OUT'){ pronto = false; if(!entrou) falhou(); /* depois de entrar, o próprio Realtime reconecta */ }
            else if(s === 'CLOSED') pronto = false;
          });
      }catch(e){ if(este) C.api.semCanal(este); ch = null; }
      clearTimeout(vigia); vigia = setTimeout(falhou, 10000);
    }
    /* o supabase-js devolve o MESMO canal quando ainda existe um "correverso" aberto (o de quando você saiu agorinha,
       ainda fechando): aí a cidade abria sem rede ou nem abria. Tira os velhos e só depois entra. */
    (async () => {
      await registra(); if(fim) return;
      const velhos = (C.api.canais ? C.api.canais() : []).filter(c => c && (c.topic === 'realtime:correverso' || /^realtime:verso-sinal-/.test(c.topic)));
      if(velhos.length) await Promise.race([Promise.all(velhos.map(c => C.api.semCanal(c))), new Promise(r => setTimeout(r, 2500))]).catch(() => {});
      if(fim) return;
      ligaSinais(); liga();
    })();
    /* antes de entrar no ar não manda nada (senão o supabase-js cai pro envio por HTTP, um por passo) */
    const manda = (event, payload) => { if(pronto && ch && !fim) Promise.resolve(ch.send({ type: 'broadcast', event, payload })).catch(() => {}); };
    return {
      mv: d => manda('mv', d),
      sig: (to, m) => { if(!fim && sidOk(to)) C.api.rpc('corre_verso_sinal', { p_de: sid, p_para: to, p_m: m }).catch(() => {}); },
      emo: i => manda('emo', { sid, i }),
      kart: d => manda('kart', d),
      track: m => { if(pronto && ch && !fim) Promise.resolve(ch.track(m)).catch(() => {}); },
      sair: () => {
        fim = true; pronto = false; clearTimeout(vigia); clearInterval(vida); document.removeEventListener('visibilitychange', aoVoltar);
        const v = ch, s2 = sc; ch = null; sc = null;
        if(v){ try{ Promise.resolve(v.untrack()).catch(() => {}); }catch(e){} C.api.semCanal(v); }
        if(s2) C.api.semCanal(s2);
      }
    };
  }
  function redeDemo(h){
    if(!('BroadcastChannel' in window)){ setTimeout(() => h.ok(true)); return { mv(){}, sig(){}, emo(){}, kart(){}, track(){}, sair(){} }; }
    const bc = new BroadcastChannel('corre-verso'), vivos = new Map();
    const pres = () => h.presenca([...vivos.values()].map(v => v.m));
    bc.onmessage = ({ data: d }) => {
      if(!d) return;
      if(d.t === 'oi' || d.t === 'aqui' || d.t === 'meta'){ if(d.m.sid === sid) return; vivos.set(d.m.sid, { m: d.m, t: Date.now() }); pres(); if(d.t === 'oi') bc.postMessage({ t: 'aqui', m: meta() }); }
      else if(d.t === 'tchau'){ vivos.delete(d.sid); pres(); }
      else if(d.t === 'mv'){ const v = vivos.get(d.d.sid); if(v){ v.t = Date.now(); h.mv(d.d); } else bc.postMessage({ t: 'oi', m: meta() }); }
      else if(d.t === 'sig' && d.to === sid) h.sig(d.from, d.m);
      else if(d.t === 'emo') h.emo(d.d);
      else if(d.t === 'kart') h.kart(d.d);
    };
    bc.postMessage({ t: 'oi', m: meta() }); setTimeout(() => h.ok(true), 50);
    const lim = setInterval(() => { const n = Date.now(); let mudou = false; for(const [k, v] of vivos) if(n - v.t > 25000){ vivos.delete(k); mudou = true; } if(mudou) pres(); }, 3000);
    return { mv: d => bc.postMessage({ t: 'mv', d }), emo: i => bc.postMessage({ t: 'emo', d: { sid, i } }), kart: d => bc.postMessage({ t: 'kart', d }), sig: (to, m) => bc.postMessage({ t: 'sig', to, from: sid, m }), track: m => bc.postMessage({ t: 'meta', m }), sair: () => { bc.postMessage({ t: 'tchau', sid }); clearInterval(lim); bc.close(); } };
  }
  /* o que chega dos outros pela rede é de qualquer um: número tem que ser número dentro da cidade, texto curto */
  const coordOk = (x, y) => Number.isFinite(x) && Number.isFinite(y) && V.cid && x >= 0 && y >= TOPO - 200 && x <= V.cid.W && y <= V.cid.H;
  const sidOk = s => typeof s === 'string' && /^[a-z0-9-]{4,24}$/i.test(s);
  const txtCurto = (t, n) => typeof t === 'string' ? t.replace(/[\u0000-\u001f]/g, '').slice(0, n) : '';
  const H = {
    ok(bom){ V.online = bom; ui(); if(!bom) C.toast('Não deu pra entrar no ar agora. Você anda pela cidade, mas sem ver ninguém.', 4200); },
    presenca(lista){
      const vistos = new Set();
      lista.slice(0, 200).forEach(m => {
        if(!m || !sidOk(m.sid)) return;
        vistos.add(m.sid);
        const ok = coordOk(m.x, m.y), novo = !V.remotos.has(m.sid), r = V.remotos.get(m.sid) || { sid: m.sid, desde: Date.now(), x: ok ? m.x : -9999, y: ok ? m.y : -9999, tx: ok ? m.x : -9999, ty: ok ? m.y : -9999, dir: 'baixo', passo: 0, mov: false, nivel: 0 };
        if(C.LIVE){ r.dup = !!m.dup; aplicaQuem(r); }
        else{ const uid = typeof m.uid === 'string' && /^[0-9a-z-]{1,40}$/i.test(m.uid) ? m.uid : '', handle = txtCurto(m.handle, 30).replace(/[^a-z0-9_.]/gi, ''); Object.assign(r, { ok: true, uid, eu: !!uid && uid === (C.st.me && C.st.me.id), handle, nome: handle ? txtCurto(m.nome, 40) : 'perfil mocado' }); }
        const assin = [m.x, m.y, JSON.stringify(m.av), m.mic ? 1 : 0, m.tr === 1 ? 1 : 0].join('|');
        if(novo || assin !== r.assin){ r.assin = assin; r.sinal = Date.now(); }
        Object.assign(r, { av: avLimpo(m.av, r.uid || m.sid), mic: !!m.mic, tr: m.tr === 1, jg: m.jg === 1, ec: m.ec === 1, pt: Number.isInteger(m.pt) ? Math.max(0, Math.min(3, m.pt)) : 0, naCasa: typeof m.casa === 'string' && /^[0-9a-z-]{1,40}$/i.test(m.casa) ? m.casa : '', visto: Date.now(),
          /* v3.49: o peso da rodada no Torneio de Pesca (centésimos de kg) e a rodada; fora do comum, vira zero */
          pk: Number.isInteger(m.pk) && m.pk > 0 && m.pk < 100000 ? m.pk : 0, pr: Number.isInteger(m.pr) && m.pr >= 0 && m.pr < 1e6 ? m.pr : -1,
          /* v3.50: o melhor tempo do dia na pista (centésimos) e o dia */
          tc: Number.isInteger(m.tc) && m.tc > 0 && m.tc < 360000 ? m.tc : 0, td: Number.isInteger(m.td) && m.td >= 0 ? m.td : -1,
          /* v3.62: de qual veículo é o tempo (1 moto, 3 hatch, 4 SUV, 5 picape; sem nada, era moto) */
          tv: Number.isInteger(m.tv) && m.tv >= 1 && m.tv <= 5 ? m.tv : 1,
          /* v3.51: os pontos do melhor desafio do dia na quadra e o dia */
          qp: Number.isInteger(m.qp) && m.qp > 0 && m.qp <= 40 ? m.qp : 0, qd: Number.isInteger(m.qd) && m.qd >= 0 ? m.qd : -1,
          /* v3.53: o bicho da corrida de kart (0 a 5) e quando ele foi escolhido (desempata quem pegou primeiro) */
          kp: Number.isInteger(m.kp) && m.kp >= 0 && m.kp < 6 ? m.kp : null, kpt: Number.isInteger(m.kpt) && m.kpt >= 0 ? m.kpt : 0,
          /* v3.75: de barco no Tibagi, o lado do barco e a maior piapara do dia (até 8 kg) */
          barco: m.bc === 1, bl: m.bl === -1 ? -1 : 1, pp: Number.isInteger(m.pp) && m.pp > 0 && m.pp <= 800 ? m.pp : 0, pd: Number.isInteger(m.pd) && m.pd >= 0 ? m.pd : -1,
          disco: typeof m.disco === 'string' && /^[a-z0-9]{0,16}$/.test(m.disco) ? m.disco : '', discoT: Number.isFinite(m.discoT) && m.discoT > 0 && m.discoT < Date.now() + 6e5 ? m.discoT : 0 });
        if(r.naCasa && Number.isFinite(m.cx) && Number.isFinite(m.cz)){ if(r.hx == null){ r.hxv = m.cx; r.hzv = m.cz; r.hyv = Number.isFinite(m.cy) ? clamp(m.cy, 0, 8) : 0; } r.hx = clamp(m.cx, -1, 81); r.hz = clamp(m.cz, -1, 81); r.hy = Number.isFinite(m.cy) ? clamp(m.cy, 0, 8) : 0; r.hyaw = Number.isFinite(m.cd) ? m.cd : 0; r.hsit = m.cs === 1; }
        else if(!r.naCasa){ r.hx = r.hz = null; }
        confereAv(r);
        /* posição da presença só vale quando muda (a pessoa se anunciou de novo: chegou, viajou pelo Mapa, foi pra casa) */
        if(ok && (novo || m.x !== r.px || m.y !== r.py)){ if(novo || Math.hypot(m.x - r.x, m.y - r.y) > 700){ r.x = m.x; r.y = m.y; } r.tx = m.x; r.ty = m.y; }
        if(ok){ r.px = m.x; r.py = m.y; }
        V.remotos.set(m.sid, r);
      });
      /* v3.55: quem saiu leva junto o "quem é" (o código dele, que é público, não fica valendo @ dele pra outro) */
      for(const k of [...V.remotos.keys()]) if(!vistos.has(k) && !V.remotos.get(k).bot){ fechar(k, false); V.remotos.delete(k); QUEM.delete(k); }
      if(C.LIVE) pedeQuem();
      ui();
    },
    /* passo a passo vem por broadcast (qualquer um manda): salto grande não vale, quem viaja se anuncia pela presença */
    mv(d){ if(!d || d.sid === sid) return; const r = V.remotos.get(d.sid); if(!r || !coordOk(d.x, d.y)) return; if(Math.hypot(d.x - r.tx, d.y - r.ty) > 700) return; r.tx = d.x; r.ty = d.y; if(['baixo', 'cima', 'esq', 'dir'].includes(d.dir)) r.dir = d.dir; r.mov = !!d.mov; r.sit = !!d.sit; if(d.mic != null && !!d.mic !== r.mic){ r.mic = !!d.mic; ui(); } if(Number.isFinite(d.cx) && Number.isFinite(d.cz)){ if(r.hx == null){ r.hxv = d.cx; r.hzv = d.cz; r.hyv = Number.isFinite(d.cy) ? clamp(d.cy, 0, 8) : 0; } r.hx = clamp(d.cx, -1, 81); r.hz = clamp(d.cz, -1, 81); r.hy = Number.isFinite(d.cy) ? clamp(d.cy, 0, 8) : 0; r.hyaw = Number.isFinite(d.cd) ? d.cd : 0; r.hmov = d.cm === 1; r.hsit = d.cs === 1; r.hmt = Number.isInteger(d.mt) && d.mt >= 1 && d.mt <= 5 ? d.mt : 0; kartMv(r, d); } r.item = typeof d.it === 'string' && ITEM_MAO[d.it] ? d.it : null; r.pesca = d.pe === 1; r.barco = d.bc === 1; r.bl = d.bl === -1 ? -1 : 1; r.visto = r.sinal = Date.now();
      /* v3.40: o pulo (cada pulo novo tem um número) e o avião/paraquedas */
      if(Number.isInteger(d.pu)){ if(r.puN != null && d.pu !== r.puN) r.puT = performance.now(); r.puN = d.pu; }
      r.vo = d.vo === 1 || d.vo === 2 ? d.vo : 0; r.pq = d.pq === 1; },
    sig(from, m){ aoSinal(from, m).catch(() => {}); },
    /* v3.53: os eventos da corrida ao vivo (largada, chiclete, grave, chegada): só de quem tá na mesma sala que você */
    kart(d){
      if(!d || !sidOk(d.sid) || d.sid === sid || !['larga', 'chic', 'grave', 'fim', 'cpu'].includes(d.t) || !Number.isInteger(d.id) || d.id < 0 || d.id > 1e9) return;
      const r = V.remotos.get(d.sid); if(!r || !C.casa || !C.casa.aberta() || !r.naCasa || r.naCasa !== C.casa.sala()) return;
      const n = { t: d.t, id: d.id };
      const int = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
      if(d.t === 'larga'){ if(!Array.isArray(d.quem) || !d.quem.length || d.quem.length > 6 || !d.quem.every(sidOk) || !Number.isFinite(d.em) || !Array.isArray(d.bichos) || d.bichos.length !== d.quem.length || !d.bichos.every(b => int(b, 0, 5))
        /* v3.55: sem repetido, e quem manda a largada é o primeiro da lista (o que roda a máquina) */
        || new Set(d.bichos).size !== d.bichos.length || new Set(d.quem).size !== d.quem.length || d.quem[0] !== d.sid) return; n.quem = d.quem.slice(); n.bichos = d.bichos.slice(); n.em = clamp(d.em, 1000, 10000); }
      if(d.t === 'cpu'){ if(!Array.isArray(d.l) || d.l.length > 6 || !d.l.every(o => Array.isArray(o) && o.length === 6 && int(o[0], 0, 5) && int(o[1], -1e5, 1e6) && int(o[2], -600, 600) && int(o[3], -100, 400) && int(o[4], 0, 1) && int(o[5], 0, 36e5))) return; n.l = d.l.map(o => o.slice()); }
      if(d.t === 'chic' || d.t === 'grave'){ if(!Number.isFinite(d.x) || !Number.isFinite(d.z)) return; n.x = clamp(d.x, -1, 81); n.z = clamp(d.z, -1, 81); if(d.t === 'grave' && int(d.de, 0, 5)) n.de = d.de; }
      if(d.t === 'fim'){ if(!Number.isFinite(d.ms) || d.ms < 5000 || d.ms > 36e5) return; n.ms = d.ms; }
      if(C.casa.kartEvento) C.casa.kartEvento(n, r);
    },
    emo(d){
      if(!d || !Number.isInteger(d.i)) return; const r = V.remotos.get(d.sid); const t = d.i >= 100 ? FALAS_AUTO[d.i - 100] : FALAS[d.i]; if(r && !bloqueado(r) && t) r.fala = { t, ate: Date.now() + 4500 };
      /* a buzina (ou a campainha) de quem tá perto: você ouve, mais baixo quanto mais longe */
      /* v3.55: buzina dos outros no máximo uma a cada 0,9 s (igual à tua): ninguém enche o ouvido dos outros */
      if(r && !bloqueado(r) && (d.i === 107 || d.i === 108) && V.eu && C.versoSom && Date.now() - (r.buzT || 0) > 900){ r.buzT = Date.now(); const dd = dist(V.eu, r), vi = veiculoInfo(r); if(dd < 340) C.versoSom.buzina(d.i === 108 ? 'bike' : (vi && vi.buzina) || 'carro', Math.max(.2, 1 - dd / 340)); }
    }
  };
  /* v3.53: o que a corrida ao vivo manda no movimento: o bicho, quanto andou (decímetros), a corrida e a chegada (centésimos) */
  function kartMv(r, d){
    r.kp = Number.isInteger(d.kp) && d.kp >= 0 && d.kp < 6 ? d.kp : r.kp;
    /* v3.55: parou de mandar a corrida (desceu do patinete, saiu): não conta mais como correndo ao vivo */
    if(!Number.isInteger(d.kl)) r.kl = null;
    if(Number.isInteger(d.kl) && d.kl >= 0 && d.kl <= 1e9){ r.kl = d.kl; r.kg = Number.isInteger(d.kg) && Math.abs(d.kg) < 1e6 ? d.kg : r.kg; if(Number.isInteger(d.kf) && d.kf > 500 && d.kf < 36e4){ r.kfT = d.kf * 10; r.kfId = d.kl; } }
  }
  const FALAS = ['Oi!', 'Bora trocar ideia?', 'Top!', 'Haha', 'Valeu!', 'Partiu lago?', 'Liga o mic!'];
  /* balões que a cidade solta sozinha (comendo, pescando, gol); viajam como 100 + índice */
  const FALAS_AUTO = ['nham nham', 'fisgou!', 'hmm… nada', 'uma bota…', 'golaço!', 'na cesta!', 'tarefa feita!', 'bi-bi!', 'trim-trim!', 'uhuuu!',
    /* v3.76: as manobras da pista de skate */
    'ollie!', 'kickflip!', 'heelflip!', 'shove-it!', 'tre flip!', 'air!', 'frontside 180!', 'indy grab!', '540 do zerão!', '50-50 grind!', 'caiu!',
    /* v3.85: a piapara de 4,850 (21) */
    'a mais pesada! 4,850 kg!'];
  function falaAuto(i){ if(!V.eu || !FALAS_AUTO[i]) return; V.eu.fala = { t: FALAS_AUTO[i], ate: Date.now() + 3500 }; if(V.rede && V.rede.emo) try{ V.rede.emo(100 + i); }catch(e){} }
  /* quem é quem: o nome e o @ de cada um vêm do servidor. Enquanto não vem (ou se ninguém confirmou), é visitante */
  function aplicaQuem(r){
    if(!C.LIVE || r.bot) return;
    const q = !r.dup && QUEM.get(r.sid), ok = !!(q && q.ok);
    Object.assign(r, { ok, uid: ok ? q.uid : '', handle: ok ? q.handle : '', nome: ok ? (q.handle ? q.nome || '' : 'perfil mocado') : 'visitante', eu: ok && q.eu, bloqS: ok && q.bloq });
    confereAv(r);
  }
  /* o mesmo boneco em todo aparelho: quem manda é o banco. Outra aba ou aparelho teu aparece na cidade com outro avatar
     (ou você volta pra esta aba): relê o perfil e, se mudou, troca o teu boneco aqui também */
  let avT = 0;
  function sincronizaAvatar(){
    clearTimeout(avT);
    avT = setTimeout(async () => {
      if(!V.vivo || !V.eu || !C.recarregaMe) return;
      await C.recarregaMe().catch(() => {});
      const me = C.st.me; if(!me || !V.vivo || !V.eu) return;
      const novo = avLimpo(me.verso, me.id);
      if(JSON.stringify(novo) !== JSON.stringify(V.eu.av)){ V.eu.av = novo; anunciar(); }
    }, 1200);
  }
  function confereAv(r){
    if(!r || r.bot || !V.eu || !C.st.me) return;
    if(r.eu && r.av && JSON.stringify(r.av) !== JSON.stringify(V.eu.av)) sincronizaAvatar();
  }
  document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible' && V.vivo) sincronizaAvatar(); });
  function pedeQuem(){ clearTimeout(quemT); quemT = setTimeout(() => { resolveQuem().catch(() => {}); }, 250); }
  async function resolveQuem(){
    if(!C.LIVE || !V.vivo) return;
    const agora = Date.now();
    const pend = [...V.remotos.values()].filter(r => !r.bot && !r.dup && !(QUEM.get(r.sid) || {}).ok);
    const sids = pend.filter(r => { const q = QUEM.get(r.sid); return !q || q.prox <= agora; }).map(r => r.sid).slice(0, 200);
    if(!sids.length){ quemDepois(); return; }
    let rs = null; try{ rs = await C.api.rpc('corre_verso_quem', { p_sids: sids }); }catch(e){ rs = null; }
    /* v3.55: a rede piscou: pergunta de novo daqui a 5 s (antes quem chegou nessa hora ficava invisível até outra mudança) */
    if(!Array.isArray(rs)){ clearTimeout(quemR); quemR = setTimeout(pedeQuem, 5000); return; }
    const achou = new Set();
    rs.forEach(x => { if(!x || !sidOk(x.sid)) return; achou.add(x.sid); QUEM.set(x.sid, { ok: true, uid: typeof x.uid === 'string' && /^[0-9a-f-]{36}$/i.test(x.uid) ? x.uid : '', handle: txtCurto(x.handle || '', 30).replace(/[^a-z0-9_.]/gi, ''), nome: txtCurto(x.nome || '', 40), bloq: !!x.bloq, eu: !!x.eu }); });
    /* código que ninguém registrou (ou acabou de entrar): tenta de novo daqui a pouco, cada vez mais devagar */
    sids.forEach(k => { if(achou.has(k)) return; const q = QUEM.get(k) || { ok: false, n: 0 }; q.n = (q.n || 0) + 1; q.prox = agora + (q.n < 6 ? 3000 * q.n : 30000); QUEM.set(k, q); });
    for(const r of V.remotos.values()) aplicaQuem(r);
    ui();
    quemDepois();
  }
  /* a próxima pergunta sai na hora certa (antes, depois da segunda tentativa ninguém perguntava mais) */
  let quemR = 0;
  function quemDepois(){
    clearTimeout(quemR); if(!C.LIVE || !V.vivo) return;
    const prox = [...V.remotos.values()].filter(r => !r.bot && !r.dup).map(r => QUEM.get(r.sid)).filter(q => q && !q.ok).reduce((m, q) => Math.min(m, q.prox), Infinity);
    if(prox < Infinity) quemR = setTimeout(pedeQuem, Math.max(400, prox - Date.now() + 50));
  }

  /* ---------- voz por proximidade (WebRTC, direto entre os dois) ---------- */
  const bloqueado = r => !!r && (V.bloq.has(r.uid) || V.bloq.has('s:' + r.sid) || !!r.bloqS);
  /* no ar, voz só com quem o servidor confirmou (e nunca com outra aba tua) */
  const confia = r => !!r && (r.bot || !C.LIVE || (r.ok && !r.eu && !r.dup));
  /* visitante = quem o servidor não confirmou (código sem dono, ou dois na mesma chave). Aparece 5 s, pra você
     ver que alguém chegou, e some: não anda pela tua cidade, não entra na lista nem no mapa e nunca conta como gente.
     Se o servidor confirmar depois, a pessoa volta normal. Perfil mocado não é visitante: é gente, só sem o @ */
  const VIS_MS = 5000, FANTASMA_MS = 10 * 60e3;
  const visitante = r => !!r && !r.bot && (!r.ok || !!r.dup);
  /* fantasma = quem fechou o app sem sair direito e o servidor ainda não tirou da presença: sem sinal nenhum por
     10 minutos, sai da tua cidade (volta sozinho se der sinal de novo). A presença do servidor costuma tirar antes. */
  const fantasma = (r, agora) => !!r && !r.bot && C.LIVE && (agora || Date.now()) - (r.sinal || r.desde || 0) > FANTASMA_MS;
  const sumiu = (r, agora) => (visitante(r) && (agora || Date.now()) - (r.desde || 0) > VIS_MS) || fantasma(r, agora);
  /* uma conta = um boneco pros outros: quem tá em dois aparelhos aparece pros outros só no que deu sinal por último.
     O teu outro aparelho aparece pra você ("você · outro aparelho"), mas não conta. (Na demonstração, outra aba vira outra pessoa.) */
  function quemAparece(agora){
    agora = agora || Date.now();
    const por = new Map(), out = new Set();
    for(const r of V.remotos.values()){
      if(bloqueado(r) || sumiu(r, agora)) continue;
      if(r.bot || !r.uid || !C.LIVE || r.eu){ out.add(r.sid); continue; }
      const o = por.get(r.uid); if(!o || (r.sinal || 0) > (o.sinal || 0)) por.set(r.uid, r);
    }
    por.forEach(r => out.add(r.sid));
    return out;
  }
  /* gente de verdade na cidade: você + cada pessoa que aparece (visitante e tua outra aba não contam) */
  function contaGente(agora){
    let n = 1;
    for(const k of quemAparece(agora)){ const r = V.remotos.get(k); if(r && !visitante(r) && !r.eu && !r.npc) n++; }
    return n;
  }
  async function ligarMic(){
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.RTCPeerConnection){ C.toast('Esse navegador não deixa usar o microfone aqui.', 4200); return; }
    if(V.pedindoMic || V.mic) return; V.pedindoMic = true;
    let st = null;
    try{ st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false }); }
    catch(e){ V.pedindoMic = false; C.toast('O microfone ficou bloqueado. Libera nas permissões do navegador e tenta de novo.', 4800); return; }
    V.pedindoMic = false;
    if(!V.vivo || V.mic){ st.getTracks().forEach(t => t.stop()); return; }
    V.stream = st; V.mic = true;
    try{ V.ac = V.ac || new (window.AudioContext || window.webkitAudioContext)(); if(V.ac.state === 'suspended') V.ac.resume(); V.anEu = medidor(V.stream); }catch(e){ V.anEu = null; }
    anunciar(); ui(); C.toast('Mic ligado. Chega perto de alguém com o mic ligado e a conversa abre.', 3600);
  }
  function desligarMic(){
    V.mic = false; if(V.stream) V.stream.getTracks().forEach(t => t.stop()); V.stream = null; V.anEu = null;
    for(const k of [...V.peers.keys()]) fechar(k, true);
    anunciar(); ui();
  }
  function medidor(stream){ const src = V.ac.createMediaStreamSource(stream), an = V.ac.createAnalyser(); an.fftSize = 256; src.connect(an); const buf = new Uint8Array(an.fftSize); return () => { an.getByteTimeDomainData(buf); let s = 0; for(const v of buf){ const d = (v - 128) / 128; s += d * d; } return Math.sqrt(s / buf.length); }; }
  function novoPeer(rsid, inicia){
    const pc = new RTCPeerConnection({ iceServers: ICE }), p = { sid: rsid, pc, audio: null, an: null, estado: 'abrindo', inicia, desde: Date.now(), fila: [] };
    V.peers.set(rsid, p);
    if(V.stream) V.stream.getTracks().forEach(t => pc.addTrack(t, V.stream));
    pc.onicecandidate = e => { if(e.candidate && V.rede) V.rede.sig(rsid, { k: 'ice', c: e.candidate.toJSON() }); };
    pc.ontrack = e => {
      const st = e.streams[0] || new MediaStream([e.track]);
      if(!p.audio){ p.audio = new Audio(); p.audio.autoplay = true; p.audio.playsInline = true; }
      p.audio.srcObject = st; p.audio.play().catch(() => {});
      try{ if(V.ac) p.an = medidor(st); }catch(err){}
      p.estado = 'aovivo'; ui();
    };
    pc.onconnectionstatechange = () => { const s = pc.connectionState; if(s === 'connected'){ p.estado = 'aovivo'; ui(); } else if(s === 'failed' || s === 'closed'){ fechar(rsid, false); V.espera.set(rsid, Date.now() + 8000); } };
    return p;
  }
  async function chamar(rsid){
    const p = novoPeer(rsid, true);
    const of = await p.pc.createOffer({ offerToReceiveAudio: true }); await p.pc.setLocalDescription(of);
    V.rede.sig(rsid, { k: 'oferta', sdp: of.sdp });
  }
  async function aoSinal(from, m){
    if(!m || !V.vivo) return;
    const r = V.remotos.get(from);
    if(m.k === 'oferta'){
      /* v3.55: na mesma casa/lugar vale a sala (quem entrou por portas longe uma da outra se ouve lá dentro, como no proximidade) */
      const minha = C.casa && C.casa.aberta() ? C.casa.sala() : '', dele = (r && r.naCasa) || '';
      const perto = !!r && (minha || dele ? minha === dele : dist(V.eu, r) <= R_FECHA);
      if(!V.mic || !r || bloqueado(r) || !confia(r) || !perto){ V.rede.sig(from, { k: 'nao' }); return; }
      if(V.peers.has(from)) fechar(from, false);
      const p = novoPeer(from, false);
      await p.pc.setRemoteDescription({ type: 'offer', sdp: m.sdp });
      for(const c of p.fila) await p.pc.addIceCandidate(c).catch(() => {}); p.fila = [];
      const an = await p.pc.createAnswer(); await p.pc.setLocalDescription(an);
      V.rede.sig(from, { k: 'resposta', sdp: an.sdp });
    }else if(m.k === 'resposta'){
      const p = V.peers.get(from); if(!p || p.pc.signalingState !== 'have-local-offer') return;
      await p.pc.setRemoteDescription({ type: 'answer', sdp: m.sdp });
      for(const c of p.fila) await p.pc.addIceCandidate(c).catch(() => {}); p.fila = [];
    }else if(m.k === 'ice'){
      const p = V.peers.get(from); if(!p) return;
      if(p.pc.remoteDescription) await p.pc.addIceCandidate(m.c).catch(() => {}); else p.fila.push(m.c);
    }else if(m.k === 'tchau' || m.k === 'nao'){ fechar(from, false); if(m.k === 'nao') V.espera.set(from, Date.now() + 4000); }
  }
  function fechar(rsid, avisa){
    const p = V.peers.get(rsid); if(!p) return;
    V.peers.delete(rsid);
    if(p.pc){ try{ p.pc.close(); }catch(e){} if(avisa && V.rede) V.rede.sig(rsid, { k: 'tchau' }); }
    if(p.audio){ try{ p.audio.pause(); p.audio.srcObject = null; }catch(e){} }
    ui();
  }
  /* quem entra na conversa: os dois de mic ligado, perto, ninguém bloqueado. Quem tem o sid menor chama. */
  function proximidade(){
    if(!V.eu) return;
    try{ ambienteDaCidade(); }catch(e){}
    const agora = Date.now(), mostra = quemAparece(agora), minha = C.casa && C.casa.aberta() ? C.casa.sala() : '';
    for(const r of V.remotos.values()){
      /* numa casa, a conversa é da casa: todo mundo que tá nela se ouve, de qualquer canto, e a rua não entra */
      const dele = r.naCasa || '', mesma = dele === minha, d = minha || dele ? (mesma ? 0 : 1e9) : dist(V.eu, r);
      const p = V.peers.get(r.sid), pode = V.mic && r.mic && mostra.has(r.sid) && confia(r) && mesma;
      if(r.bot){
        if(pode && d < R_ABRE && !p){ V.peers.set(r.sid, { sid: r.sid, bot: true, estado: 'aovivo', desde: agora }); ui(); }
        else if(p && (!pode || !(d <= R_FECHA))){ V.peers.delete(r.sid); ui(); }
        continue;
      }
      if(pode && d < R_ABRE && !p && !(V.espera.get(r.sid) > agora) && sid < r.sid && V.rede) chamar(r.sid).catch(() => fechar(r.sid, false));
      if(p && (!pode || !(d <= R_FECHA))) fechar(r.sid, true);
      if(p && p.estado === 'abrindo' && agora - p.desde > 15000){ fechar(r.sid, true); V.espera.set(r.sid, agora + 5000); }
      if(p && p.audio) p.audio.volume = V.mudos.has(r.sid) ? 0 : minha ? 1 : clamp(1.2 - d / R_FECHA, .15, 1);
    }
    for(const k of [...V.peers.keys()]) if(!V.remotos.has(k)) fechar(k, false);
  }
  function anunciar(){ if(V.rede) V.rede.track(meta()); enviaPos(true); }
  function enviaPos(forca){
    if(!V.rede || !V.eu) return; const t = performance.now();
    const q = C.casa && C.casa.aberta() ? C.casa.pos() : null, mov = q ? q.andando : V.eu.mov || !!V.voo;
    if(!forca && t - V.ultEnvio < (mov ? 100 : 2000)) return;
    const m = { sid, x: Math.round(V.eu.x), y: Math.round(V.eu.y), dir: V.eu.dir, mov: V.eu.mov, mic: V.mic, sit: !!V.eu.sit };
    if(q){ m.cx = Math.round(q.x * 20) / 20; m.cz = Math.round(q.z * 20) / 20; m.cy = Math.round((q.y || 0) * 20) / 20; m.cd = Math.round(q.yaw * 100) / 100; m.cm = q.andando ? 1 : 0; if(q.mt) m.mt = q.mt; if(q.sit) m.cs = 1; ['kp', 'kg', 'kl', 'kf'].forEach(k => { if(Number.isInteger(q[k])) m[k] = q[k]; }); }
    if(V.eu.item && V.eu.item.ate > Date.now()) m.it = V.eu.item.k;
    if(V.eu.pesca && V.eu.sit) m.pe = 1;
    if(V.eu.barco){ m.bc = 1; m.bl = V.eu.barco.lado < 0 ? -1 : 1; if(V.rio && V.rio.fase && V.rio.fase !== 'salto') m.pe = 1; }
    if(V.eu.puN) m.pu = V.eu.puN;
    if(V.voo){ m.mov = true; if(V.voo.fase === 'para') m.pq = 1; else m.vo = V.voo.fase === 'cruzeiro' ? 1 : 2; }
    V.ultEnvio = t; V.rede.mv(m);
  }

  /* ---------- a cidade, inspirada em Londrina ----------
     Grade grande e fixa (13 colunas), pensada pra crescer sem apertar nada. O Centro numa fileira (Teatro Ouro Verde,
     Concha Acústica, Calçadão, Catedral, Museu Histórico e Museu de Arte), os dois quarteirões do @consanans logo acima,
     e os lugares grandes ocupando vários quarteirões: Bosque dos Ipês, Zerão, Lago Igapó (orla, pista, pontes, píer,
     ilha, chafariz e pedalinho), Gleba Palhano e Estádio do Café. As casas entram do Centro pra fora, na mesma ordem
     pra todo mundo; o que sobra vira cidade (prédios, lojas, pracinhas, quadras, feira, bosquinhos) e, perto do
     Centro, uns lotes livres pra quem chegar. Banco é ponto de encontro: senta, acena, liga o mic e troca ideia. */
  const lotXY = (c, r) => ({ x: RUA + c * (LW + RUA), y: TOPO + r * (LH + RUA) });
  const ret = (c0, r0, c1, r1) => { const a = lotXY(c0, r0); return { x: a.x, y: a.y, w: (c1 - c0 + 1) * (LW + RUA) - RUA, h: (r1 - r0 + 1) * (LH + RUA) - RUA }; };
  const ruaY = s => TOPO - RUA / 2 + s * (LH + RUA), ruaX = i => RUA / 2 + i * (LW + RUA);
  const CENTRO = { teatro: [4, 3], concha: [5, 3], praca: [6, 3], catedral: [7, 3], museu: [8, 3], arte: [9, 3], aquario: [1, 8], delegacia: [4, 2], bombeiros: [5, 2], hospital: [8, 2] };
  const NOME_C = { teatro: 'Teatro Ouro Verde', concha: 'Concha Acústica', praca: 'Calçadão', catedral: 'Catedral', museu: 'Museu Histórico', arte: 'Museu de Arte', aquario: 'Aquário do Igapó', delegacia: 'Delegacia', bombeiros: 'Corpo de Bombeiros', hospital: 'Hospital do Corre' };
  /* o jogo do aquário: o Killer Ocean (feito pelo Lorenzo), servido daqui mesmo (site/jogos/) */
  /* v3.82: o Elo Perdido (o jogo que o Thales mandou) roda na Jaula dos Macacos do Parque Arthur Thomas; onde, sair e carrega
     dizem de onde é a moldura (sem eles, é a do Aquário) */
  const JOGOS = { killer: { id: 'killer', titulo: 'Killer Ocean', sub: 'por Lorenzo Malassise', src: 'jogos/killer-ocean.html' },
    elo: { id: 'elo', titulo: 'Elo Perdido', sub: 'simulador de primata quase humano', src: 'jogos/elo-perdido.html', onde: 'Jaula dos Macacos', sair: 'Sair da jaula', carrega: 'Abrindo o portão…' } };
  /* v3.83 (o Thales, com o mapa de Londrina: "coloque as coisas da cidade mais ou menos onde elas estão em Londrina mesmo"):
     o Centro no meio, em cima; o Estádio do Café (e o Autódromo, na porta dele) na zona norte; o Bosque colado no Centro;
     o Zerão do lado do Moringão, na Higienópolis, entre o Centro e o começo do Igapó; o Igapó descendo pro sudeste até o
     Parque Arthur Thomas (de onde vem o Ribeirão Cambé); a Gleba Palhano no sudoeste do lago; o Aeroporto a leste do
     Centro, no canto de cima à direita; a ACEL embaixo dele. O Tibagi segue embaixo de tudo (o Thales pediu assim na 3.75) */
  const REGIOES = [
    { k: 'bosque', nome: 'Bosque dos Ipês', c0: 2, r0: 1, c1: 3, r1: 2 },
    { k: 'zerao', nome: 'Zerão', c0: 3, r0: 4, c1: 4, r1: 6 },
    { k: 'lago', nome: 'Lago Igapó', c0: 2, r0: 7, c1: 10, r1: 9 },
    { k: 'gleba', nome: 'Gleba Palhano', c0: 0, r0: 10, c1: 5, r1: 10 },
    { k: 'estadio', nome: 'Estádio do Café', c0: 5, r0: 0, c1: 6, r1: 1 },
    { k: 'feira', nome: 'Feira do Corre', c0: 6, r0: 4, c1: 7, r1: 4 },
    /* o Thales: "joga o aeroporto pra cima e a ACEL pra baixo" */
    { k: 'aeroporto', nome: 'Aeroporto de Londrina', c0: 10, r0: 0, c1: 12, r1: 1 },
    { k: 'acel', nome: 'ACEL', c0: 11, r0: 4, c1: 12, r1: 5 },
    { k: 'arthur', nome: 'Parque Arthur Thomas', c0: 11, r0: 7, c1: 12, r1: 9 }
  ];
  /* ---------- a Feira do Corre: o menu inteiro em barracas, logo abaixo do Calçadão ----------
     Duas fileiras, uma barraca pra cada ferramenta. Chegou perto e tocou: a ferramenta abre num balcão por cima da
     cidade (o próprio Corre, sem menu) e você continua na rua, de barraca em barraca. O Rolo 360 só aparece pro @consanans. */
  const BARRACAS = [
    { id: 'feed', titulo: 'Feed', placa: 'FEED', rota: '#/', ico: 'chat', botao: 'Entrar no Beco', cor: ROSA, fundo: '#2B2F38', coisa: 'cartaz', lugar: 'feed' },
    { id: 'studio', titulo: 'Studio', placa: 'STUDIO', rota: '#/studio', ico: 'magia', botao: 'Entrar no Estúdio', cor: AMARELO, fundo: '#F4F1EA', coisa: 'cavalete', lugar: 'studio' },
    { id: 'horus', titulo: 'Hórus', placa: 'HORUS', rota: '#/horus', ico: 'eye', botao: 'Entrar na Casa do Hórus', cor: INK, fundo: '#1B1D22', coisa: 'olho', pf: INK, pc: AMARELO, lugar: 'horus' },
    { id: 'vendas', titulo: 'Vendas', placa: 'VENDAS', rota: '#/vendas', ico: 'recibo', botao: 'Entrar no Balcão', cor: LARANJA, fundo: '#F4F1EA', coisa: 'recibos', lugar: 'vendas' },
    { id: 'grana', titulo: 'Grana', placa: 'GRANA', rota: '#/grana', ico: 'grana', botao: 'Entrar no Cofre', cor: AZUL, fundo: '#F4F1EA', coisa: 'moedas', lugar: 'grana' },
    { id: 'estilo', titulo: 'Estilo de vida', placa: 'ESTILO', rota: '#/estilo', ico: 'calc', botao: 'Entrar na Vitrine', cor: LILAS, fundo: '#F4F1EA', coisa: 'casinha', lugar: 'estilo' },
    { id: 'marcas', titulo: 'Portfólio e catálogo', placa: 'MARCAS', rota: '#/marcas', ico: 'marcas', botao: 'Entrar na Galeria', cor: '#E2412E', fundo: '#F4F1EA', coisa: 'pastas', lugar: 'marcas' },
    { id: 'nicho', titulo: 'Do teu nicho', placa: 'NICHO', rota: '#/refs', ico: 'marcador', botao: 'Entrar na Biblioteca', cor: '#8F86E8', fundo: '#F2D8A7', coisa: 'revistas', lugar: 'nicho' },
    { id: 'manual', titulo: 'Manual', placa: 'MANUAL', rota: '', ico: 'manual', botao: 'Entrar na Escolinha', cor: '#9CC9F0', fundo: PAPEL, coisa: 'duvida', lugar: 'manual' },
    { id: 'rolo', titulo: 'Rolo 360', placa: 'ROLO 360', rota: '#/rolo', ico: 'rolo', botao: 'Entrar no Cineclube', cor: '#8E4B2B', fundo: '#1B1D22', coisa: 'filme', so: 'fundador', pf: INK, pc: AMARELO, lugar: 'rolo' }
  ];
  const BC_MURAL = { id: 'mural', titulo: 'Mural', rota: '#/mural', cor: ROSA }, BC_BANCA = { id: 'banca', titulo: 'Banca do dia', rota: '#/banca', cor: AZUL };
  /* barraca que é só de alguém (o Rolo) some pros outros, inclusive a colisão; o Hórus desligado fica de porta baixada */
  const paraMim = b => b.so !== 'fundador' || !!(C.ehFundador && C.ehFundador());
  const aberta = b => b.id !== 'horus' || !C.ferr || C.ferr('horus');
  const MEIO = { c: 6.5, r: 3 }, LIVRES = 3;
  const ENCHE = [['predio', 6], ['loja', 5], ['pracinha', 3], ['bosquinho', 3], ['quadra', 2], ['feira', 2]];
  /* ipê rosa, amarelo, roxo e branco, flamboyant e jacarandá: árvore aqui sempre floresce, e nunca de verde */
  const IPES = [ROSA, AMARELO, LILAS, '#F4F1EA', '#E8643A', '#8F86E8'];
  const LOJAS = ['PADARIA', 'MERCADINHO', 'LANCHES', 'BARBEARIA', 'SORVETES', 'PASTEL', 'BAR', 'ACAI', 'SEBO', 'DISCOS', 'SKATE SHOP', 'FARMACIA', 'BRECHO', 'CAFE', 'PIZZA', 'PAPELARIA', 'GRAFICA', 'BICICLETARIA'];
  const PAREDES = ['branco', 'tijolo', '#E8D7C3', '#B8C4CF', '#F2D8A7', 'concreto'];
  const TOLDOS = [ROSA, AZUL, LARANJA, AMARELO, '#E2412E', LILAS, INK];
  const PREDIOS = ['branco', 'concreto', 'tijolo', '#D9B48F', '#B8C4CF', '#E8D7C3'];
  const CORES_CARRO = [AZUL, AMARELO, '#EEEBE4', '#1B1D22', LARANJA, '#C9CED6', ROSA, LILAS, '#8E4B2B'];
  const pega = (L, q) => L[Math.floor(q() * L.length)];
  /* v3.83: os bairros pelo mapa de Londrina (o Centro em cima, a Higienópolis e o Kennedy a oeste, a Vila Brasil a leste,
     o Lago Parque entre o Centro e o Igapó, e do outro lado do lago a Gleba, a Bela Suíça, o Colonial, o Caiçaras e o
     Inglaterra) */
  function bairro(c, r){
    if(r <= 3) return c <= 3 ? 'Kennedy' : c <= 9 ? 'Centro' : 'Vila Brasil';
    if(r <= 6) return c <= 4 ? 'Higienópolis' : c <= 8 ? 'Lago Parque' : c === 9 ? 'Jardim América' : 'Santos Dumont';
    if(r <= 9) return c <= 1 ? 'Residencial do Lago' : c >= 11 ? 'Igapó' : 'Lago Igapó';
    return c <= 5 ? 'Gleba Palhano' : c <= 7 ? 'Bela Suíça' : c <= 9 ? 'Colonial' : c === 10 ? 'Jardim Caiçaras' : 'Inglaterra';
  }
  const arvRua = (K, o, q, p) => [0, 1].forEach(lado => { if(q() < (p || .55)) K.arv.push({ x: o.x + (lado ? LW - 18 : 18), y: o.y + LH + 6, cor: pega(IPES, q) }); });

  function montaCidade(perfis){
    const esp = perfis.find(p => ESPECIAL[String(p.handle || '').toLowerCase()]);
    /* a ordem é a mesma pra todo mundo (casa maior fica mais perto do Centro); quem tá mocado entra por último, e só na tela dele */
    const resto = perfis.filter(p => p !== esp).sort((a, b) => (!!a.soEu - !!b.soEu) || nivel(b) - nivel(a) || hash(a.id) - hash(b.id));
    const regEm = (c, r) => REGIOES.find(g => c >= g.c0 && c <= g.c1 && r >= g.r0 && r <= g.r1);
    const centroEm = (c, r) => Object.values(CENTRO).some(([cc, rr]) => cc === c && rr === r);
    const reservado = (c, r) => !!regEm(c, r) || centroEm(c, r) || (!!esp && r === 2 && (c === 6 || c === 7));
    const livresAte = n => { let q = 0; for(let r = 0; r < n; r++) for(let c = 0; c < COLS; c++) if(!reservado(c, r)) q++; return q; };
    let rows = 12; while(livresAte(rows) < resto.length + LIVRES) rows++;
    /* v3.75: embaixo da última rua corre o Rio Tibagi, de ponta a ponta (a cidade cresce pra baixo e ele desce junto) */
    const W = RUA + COLS * (LW + RUA), yRio = TOPO + rows * (LH + RUA), H = yRio + RIO_H;
    const grade = Array.from({ length: rows }, () => Array(COLS).fill(null));
    const K = { arv: [], bancos: [], zonas: [], sol: [], lugares: [], decor: [], quiosques: [], trucks: [], barracas: [], postes: [], torneio: null };
    const slots = []; for(let r = 0; r < rows; r++) for(let c = 0; c < COLS; c++) if(!reservado(c, r)) slots.push({ c, r });
    const dm = s => Math.hypot((s.c - MEIO.c) * (LW + RUA), (s.r - MEIO.r) * (LH + RUA));
    slots.sort((a, b) => dm(a) - dm(b) || a.r - b.r || a.c - b.c);
    /* as casas */
    const casas = [];
    resto.forEach((p, i) => {
      const s = slots[i], o = lotXY(s.c, s.r), tier = nivel(p), est = ESTILOS[String(p.handle || '').toLowerCase()] || '', w = LARG_ESTILO[est] || LARG[tier], x = o.x + (LW - w) / 2, dir = hash(p.id + 'p') & 1;
      const h = { id: p.id, p, cat: CASA[p.categoria] ? p.categoria : 'outros', tier, handle: p.handle, nome: p.nome, x, w, base: o.y + LH - 34, lote: o, c: s.c, r: s.r, portaX: Math.round(x + (dir ? w * .72 : w * .28)), estilo: est };
      casas.push(h); grade[s.r][s.c] = { t: 'casa', h }; arvRua(K, o, rng(hash('rua' + s.c + ',' + s.r)));
    });
    const vazios = slots.slice(resto.length, resto.length + LIVRES).map(s => { grade[s.r][s.c] = { t: 'vazio' }; return Object.assign(lotXY(s.c, s.r), { c: s.c, r: s.r }); });
    const tot = ENCHE.reduce((a, e) => a + e[1], 0);
    const enche = slots.slice(resto.length + LIVRES).map(s => {
      const sd = hash('enche' + s.c + ',' + s.r), q = rng(sd); let v = q() * tot, t = ENCHE[0][0];
      for(const [nm, p] of ENCHE){ if(v < p){ t = nm; break; } v -= p; }
      const o = lotXY(s.c, s.r), f = { id: 'f' + s.c + ',' + s.r, t, c: s.c, r: s.r, x: o.x, y: o.y, sd };
      grade[s.r][s.c] = { t: 'enche', f }; montaEnche(f, K, rng(sd + 1)); return f;
    });
    /* v3.48: o Sebo é onde se escolhe disco pra casa. A cidade sempre tem pelo menos um (se o sorteio não deu, a loja da
       direita do primeiro par vira Sebo) e ele aparece no mapa */
    if(!enche.some(f => f.t === 'loja' && f.lojas.some(l => l.nome === 'SEBO'))){ const f = enche.find(x => x.t === 'loja'); if(f) f.lojas[1].nome = 'SEBO'; }
    enche.forEach(f => { if(f.t === 'loja') f.lojas.forEach((l, i) => { if(l.nome === 'SEBO') K.lugares.push({ nome: 'Sebo', x: portaLoja(f, i), y: f.base + 22 }); }); });
    /* v3.66: o Ateliê é a loja de skins. A cidade sempre tem um: uma loja de um par sem Sebo (ou a outra do par do Sebo),
       de vitrine alta, toldo rosa e placa preta */
    if(!enche.some(f => f.t === 'loja' && f.lojas.some(l => l.nome === 'ATELIE'))){
      const fs = enche.filter(x => x.t === 'loja'), f = fs.find(x => !x.lojas.some(l => l.nome === 'SEBO')) || fs[0];
      if(f){ const i = f.lojas[0].nome === 'SEBO' ? 1 : 0; if(f.lojas[i].nome !== 'SEBO') Object.assign(f.lojas[i], { nome: 'ATELIE', toldo: ROSA, placa: INK, placaCor: AMARELO, alto: true, luz: true }); }
    }
    enche.forEach(f => { if(f.t === 'loja') f.lojas.forEach((l, i) => { if(l.nome === 'ATELIE') K.lugares.push({ nome: 'Ateliê', x: portaLoja(f, i), y: f.base + 22 }); }); });
    /* os dois quarteirões */
    let dois = null;
    if(esp){ const a = lotXY(6, 2), b = lotXY(7, 2); dois = { id: esp.id, p: esp, handle: esp.handle, nome: esp.nome, x: a.x, w: 2 * LW + RUA, base: a.y + LH - 34, blocos: [a, b], portaX: a.x + 154 }; grade[2][6] = grade[2][7] = { t: 'dois' }; }
    /* o Centro */
    const centro = {};
    Object.keys(CENTRO).forEach(nm => {
      const [cc, rr] = CENTRO[nm], o = lotXY(cc, rr); grade[rr][cc] = { t: 'centro', k: nm };
      centro[nm] = { k: nm, x: o.x, y: o.y, base: o.y + LH - (nm === 'concha' ? 120 : 34) };
      K.zonas.push({ nome: NOME_C[nm], x: o.x - 20, y: o.y - 20, w: LW + 40, h: LH + 40 });
      K.lugares.push({ nome: NOME_C[nm], x: o.x + LW / 2, y: o.y + LH + 6 });
      if(nm !== 'praca' && nm !== 'concha') arvRua(K, o, rng(hash('centro' + nm)), .7);
    });
    const praca = lotXY(...CENTRO.praca); praca.cx = praca.x + LW / 2; praca.cy = praca.y + LH / 2;
    const cc = centro.concha; [0, 1, 2].forEach(i => [-60, 0, 60].forEach(dx => K.bancos.push({ x: cc.x + LW / 2 + dx, y: cc.base + 46 + i * 30, lugar: 'Concha Acústica', degrau: true })));
    [[praca.x + 52, praca.y + 220], [praca.x + LW - 70, praca.y + 236]].forEach(([x, y]) => K.bancos.push({ x, y, lugar: 'Calçadão' }));
    /* os lugares grandes */
    const regs = REGIOES.map(g => { const R = Object.assign(ret(g.c0, g.r0, g.c1, g.r1), g); for(let r = g.r0; r <= g.r1; r++) for(let c = g.c0; c <= g.c1; c++) grade[r][c] = { t: 'reg', R }; return R; });
    const RG = nm => regs.find(R => R.k === nm), sorte = rng(hash('londrina'));
    const lago = montaLago(RG('lago'), K, sorte), zerao = montaZerao(RG('zerao'), K, sorte), bosque = montaBosque(RG('bosque'), K, sorte), glebaR = montaGleba(RG('gleba'), K, sorte), estadio = montaEstadio(RG('estadio'), K), feira = montaFeira(RG('feira'), K), aeroporto = montaAeroporto(RG('aeroporto'), K), acel = montaAcel(RG('acel'), K), arthur = montaArthur(RG('arthur'), K), rio = montaRio(W, yRio, K);
    regs.forEach(R => K.zonas.push({ nome: R.nome, x: R.x - 10, y: R.y - 10, w: R.w + 20, h: R.h + 20 }));
    /* postes nas esquinas e na beira dos lugares grandes */
    for(let r = 0; r < rows; r++) for(let c = 0; c < COLS; c++){
      const g = grade[r][c]; if(g && g.t === 'reg') continue; const o = lotXY(c, r);
      K.postes.push({ x: o.x - 7, y: o.y - 5 });
      const viz = c < COLS - 1 && grade[r][c + 1]; if(c === COLS - 1 || (viz && viz.t === 'reg')) K.postes.push({ x: o.x + LW + 7, y: o.y - 5 });
    }
    regs.forEach(R => { for(let x = R.x + 180; x < R.x + R.w - 80; x += 420) K.postes.push({ x, y: R.y - 5 }); });
    /* ruas onde passa carro: as que atravessam a cidade inteira */
    const ruasLivres = []; for(let s = 0; s <= rows; s++) if(!REGIOES.some(g => g.r0 <= s - 1 && g.r1 >= s)) ruasLivres.push(s);
    return { W, H, rows, grade, casas, dois, vazios, enche, praca, centro, regs, lago, zerao, bosque, gleba: glebaR.torres, glebaR, estadio, feira, aeroporto, acel, arthur, rio, ruasLivres,
      arv: K.arv, bancos: K.bancos, zonas: K.zonas, sol: K.sol, lugares: K.lugares, torneio: K.torneio, decor: K.decor, quiosques: K.quiosques, trucks: K.trucks, barracas: K.barracas, postes: K.postes };
  }

  /* a porta de cada loja do par (a mesma conta do desenho: 14 de margem, 140 por loja e a porta a 80% da fachada) */
  const portaLoja = (f, i) => Math.round(f.x + 14 + i * 140 + 132 * .8);
  /* o que sobra vira cidade */
  function montaEnche(f, K, q){
    const cx = f.x + LW / 2, cy = f.y + LH / 2; f.base = f.y + LH - 34;
    switch(f.t){
      case 'predio':
        f.pw = 190 + Math.round(q() * 50); f.px = f.x + Math.round((LW - f.pw) / 2); f.andares = 3 + Math.floor(q() * 4); f.cor = pega(PREDIOS, q); f.varanda = q() < .6; f.marquise = pega(TOLDOS, q);
        K.sol.push({ x: f.px, y: f.base - 34, w: f.pw, h: 34 }); arvRua(K, f, q); break;
      case 'loja':
        f.lojas = [0, 1].map(() => { const placa = pega([PAPEL, INK, AMARELO], q); return { nome: pega(LOJAS, q), cor: pega(PAREDES, q), toldo: pega(TOLDOS, q), alto: q() < .5, luz: q() < .6, placa, placaCor: placa === INK ? AMARELO : INK }; });
        if(f.lojas[0].nome === f.lojas[1].nome) f.lojas[1].nome = LOJAS[(LOJAS.indexOf(f.lojas[0].nome) + 5) % LOJAS.length];
        K.sol.push({ x: f.x + 14, y: f.base - 34, w: LW - 28, h: 34 }); arvRua(K, f, q, .4); break;
      case 'pracinha':
        f.fonte = q() < .55; K.decor.push({ tipo: f.fonte ? 'fonte' : 'estatua', x: cx, y: cy + 16 }); K.sol.push({ x: cx - 28, y: cy, w: 56, h: 20 });
        [[f.x + 52, f.y + 66], [f.x + LW - 52, f.y + 66], [f.x + 52, f.y + LH - 30], [f.x + LW - 52, f.y + LH - 30]].forEach(([x, y]) => K.arv.push({ x, y, cor: pega(IPES, q), g: q() < .4 }));
        [[cx - 66, cy - 30], [cx + 66, cy - 30], [cx - 66, cy + 78], [cx + 66, cy + 78]].forEach(([x, y]) => K.bancos.push({ x, y, lugar: 'Pracinha' }));
        K.zonas.push({ nome: 'Pracinha', x: f.x, y: f.y, w: LW, h: LH }); break;
      case 'bosquinho':
        for(let i = 0; i < 9; i++){ if(i === 4) continue; K.arv.push({ x: Math.round(f.x + 46 + (i % 3) * 104 + (q() - .5) * 36), y: Math.round(f.y + 70 + Math.floor(i / 3) * 84 + (q() - .5) * 24), cor: pega(IPES, q), g: q() < .35 }); }
        K.bancos.push({ x: cx, y: cy + 24, lugar: 'Bosquinho' }); K.zonas.push({ nome: 'Bosquinho', x: f.x, y: f.y, w: LW, h: LH }); break;
      case 'quadra':
        f.court = { tipo: q() < .5 ? 'futsal' : 'basquete', x: f.x + 34, y: f.y + 44, w: LW - 68, h: LH - 104 };
        if(f.court.tipo === 'basquete') K.decor.push({ tipo: 'tabela', x: f.court.x + 10, y: f.court.y + f.court.h / 2 + 8, lado: 1 }, { tipo: 'tabela', x: f.court.x + f.court.w - 10, y: f.court.y + f.court.h / 2 + 8, lado: -1 });
        K.bancos.push({ x: cx - 60, y: f.y + LH - 18, lugar: 'Quadra' }, { x: cx + 60, y: f.y + LH - 18, lugar: 'Quadra' });
        K.zonas.push({ nome: f.court.tipo === 'futsal' ? 'Quadra de futsal' : 'Quadra de basquete', x: f.x, y: f.y, w: LW, h: LH }); break;
      case 'feira':
        [[-75, 0], [75, 0], [-75, 1], [75, 1]].forEach(([dx, lin], i) => { const b = { id: f.id + 'b' + i, x: cx + dx, base: f.y + 112 + lin * 112, cor: pega(TOLDOS, q), coisa: Math.floor(q() * 4) }; K.barracas.push(b); K.sol.push({ x: b.x - 34, y: b.base - 20, w: 68, h: 20 }); });
        K.zonas.push({ nome: 'Feira', x: f.x, y: f.y, w: LW, h: LH }); break;
    }
  }

  /* Lago Igapó: comprido e sinuoso, com a margem em blocos */
  function montaLago(R, K, sorte){
    const B = 12, x0 = R.x + 150, n = Math.floor((R.w - 300) / B), x1 = x0 + n * B, meio = R.y + R.h / 2, tMin = R.y + 140, bMax = R.y + R.h - 140;
    /* v3.83: o lago desce pro sudeste (a ponta de cá, perto da Higienópolis, fica mais alta; a de lá, perto do Arthur Thomas, mais baixa) */
    const cyF = x => meio + 92 * Math.sin(x / 560 + 1.7) + 30 * Math.sin(x / 240 + .6) + (x - (R.x + R.w / 2)) * .07;
    const hwF = x => { const e = clamp(Math.min(x - x0, x1 - x) / 320, 0, 1); return Math.max(36, (172 + 68 * Math.sin(x / 410 + 2.3)) * (.3 + .7 * Math.sqrt(e))); };
    const cols = [];
    for(let i = 0; i < n; i++){
      const x = x0 + i * B, xm = x + B / 2, cy = cyF(xm), hw = hwF(xm);
      let t = Math.round(Math.max(tMin, cy - hw) / B) * B, b = Math.round(Math.min(bMax, cy + hw) / B) * B;
      if(b - t < B * 3){ const m = Math.round(cy / B) * B; t = m - B; b = m + 2 * B; }
      cols.push({ x, t, b });
    }
    /* as faixas da orla: a margem crescida pra fora (calçada, pista de caminhada, calçada e as pedras) */
    const dil = off => { const out = [], m = Math.ceil(off / B) + 1; for(let i = -m; i < n + m; i++){ const x = x0 + i * B, xm = x + B / 2; let t = Infinity, b = -Infinity; for(let j = Math.max(0, i - m); j <= Math.min(n - 1, i + m); j++){ const cj = cols[j], dx = Math.max(0, Math.abs(cj.x + B / 2 - xm) - B / 2); if(dx > off) continue; const dy = Math.sqrt(off * off - dx * dx); if(cj.t - dy < t) t = cj.t - dy; if(cj.b + dy > b) b = cj.b + dy; } if(t < b) out.push({ x, t: Math.round(t / B) * B, b: Math.round(b / B) * B }); } return out; };
    const L = { R, x: R.x, y: R.y, w: R.w, h: R.h, B, x0, x1, cols, cyF, hwF, secos: [], ilha: null, chafariz: null };
    L.bandas = [['calcada', dil(72)], ['terra', dil(58)], ['calcada', dil(42)], ['concreto', dil(12)]];
    const fora = L.bandas[0][1], foraEm = x => fora.find(c => x >= c.x && x < c.x + B), colEm = x => cols[clamp(Math.floor((x - x0) / B), 0, n - 1)];
    const busca = (f0, f1, maior) => { let bi = Math.floor(n * f0), bv = maior ? -1 : 1e9; for(let i = Math.floor(n * f0); i < Math.min(n, Math.ceil(n * f1)); i++){ const v = cols[i].b - cols[i].t; if(maior ? v > bv : v < bv){ bv = v; bi = i; } } return bi; };
    /* duas pontes nos trechos mais estreitos */
    [[.17, .29], [.62, .74]].forEach(([a, b]) => { const c = cols[busca(a, b, false)], xb = c.x + B / 2; L.secos.push({ tipo: 'ponte', x: xb - 24, y: c.t - 52, w: 48, h: c.b - c.t + 104 }); });
    /* píer no meio, saindo da orla norte, e um deck saindo da orla sul */
    { const c = cols[busca(.44, .56, true)], xp = c.x + B / 2, lp = Math.min(160, Math.round((c.b - c.t) * .42)); L.secos.push({ tipo: 'pier', x: xp - 22, y: c.t - 16, w: 44, h: lp + 16 }); K.bancos.push({ x: xp, y: c.t + lp - 16, lugar: 'Píer do Igapó' }); K.torneio = { x: xp, y: c.t + 8 }; K.zonas.push({ nome: 'Píer do Igapó', x: xp - 44, y: c.t - 24, w: 88, h: lp + 30 }); K.lugares.push({ nome: 'Píer do Igapó', x: xp, y: c.t + lp - 46 }); }
    { const c = cols[busca(.84, .94, true)], xp = c.x + B / 2, lp = Math.min(140, Math.round((c.b - c.t) * .38)); L.secos.push({ tipo: 'pier', x: xp - 22, y: c.b - lp, w: 44, h: lp + 16 }); K.bancos.push({ x: xp, y: c.b - lp + 26, lugar: 'Deck do Igapó' }); K.zonas.push({ nome: 'Deck do Igapó', x: xp - 44, y: c.b - lp - 10, w: 88, h: lp + 30 }); }
    /* a ilhinha com ipês e o chafariz */
    { const c = cols[busca(.33, .43, true)], ix = c.x + B / 2, iy = (c.t + c.b) / 2, rad = Math.min(88, (c.b - c.t) / 2 - 70);
      if(rad >= 36){ const ic = []; cols.forEach(q => { const dx = Math.abs(q.x + B / 2 - ix); if(dx < rad){ const hh = Math.sqrt(rad * rad - dx * dx) * .7, t = Math.round((iy - hh) / B) * B, b = Math.round((iy + hh) / B) * B; if(b > t) ic.push({ x: q.x, t, b }); } });
        L.ilha = { x: ix, y: iy, rad, cols: ic }; K.arv.push({ x: Math.round(ix - rad * .3), y: Math.round(iy + 6), cor: ROSA, ilha: true, g: true }, { x: Math.round(ix + rad * .45), y: Math.round(iy + rad * .3), cor: AMARELO, ilha: true }); } }
    { const c = cols[busca(.76, .83, true)]; L.chafariz = { x: c.x + B / 2, y: Math.round((c.t + c.b) / 2) }; }
    L.barcos = [{ f: .1, v: .016, lado: -1, cor: AMARELO }, { f: .9, v: .012, lado: 1, cor: ROSA }, { f: 1.4, v: .014, lado: -1, cor: AZUL }, { f: .55, v: .011, lado: 1, cor: LARANJA }];
    const evita = (x, m) => L.secos.some(s => x > s.x - m && x < s.x + s.w + m);
    /* a placa do lago, num trecho com espaço na orla norte */
    let sx = 0; for(let x = x0 + 360; x < x1 - 300; x += 40){ const f = foraEm(x); if(f && f.t - R.y >= 130 && !evita(x, 180)){ sx = x; break; } }
    if(sx) K.decor.push({ tipo: 'placa', x: sx, y: foraEm(sx).t - 14, txt: 'LAGO IGAPO', s: 2, fundo: PAPEL, h: 26 });
    /* quiosques */
    const QS = [['COCO', AMARELO], ['SORVETE', ROSA], ['PASTEL', LARANJA], ['PIPOCA', '#E2412E'], ['ACAI', LILAS], ['CALDO DE CANA', AZUL]];
    let qi = 0;
    for(let x = x0 + 300; x < x1 - 200; x += 620){
      if(evita(x, 110) || (sx && Math.abs(x - sx) < 240)) continue; const f = foraEm(x); if(!f) continue; const [nm, cor] = QS[qi % QS.length];
      if(f.t - R.y >= 124){ K.quiosques.push({ id: 'q' + qi, x: Math.round(x), base: f.t - 12, nome: nm, cor }); qi++; }
      else if(R.y + R.h - f.b >= 150){ K.quiosques.push({ id: 'q' + qi, x: Math.round(x), base: f.b + 110, nome: nm, cor }); qi++; }
    }
    K.quiosques.forEach(q => K.sol.push({ x: q.x - 34, y: q.base - 26, w: 68, h: 26 }));
    /* bancos na orla, de frente pra água */
    const topo = x => Math.min(colEm(x - 24).t, colEm(x).t, colEm(x + 24).t), fundo = x => Math.max(colEm(x - 24).b, colEm(x).b, colEm(x + 24).b);
    for(let x = x0 + 110; x < x1 - 60; x += 172){ if(evita(x, 46)) continue; K.bancos.push({ x: Math.round(x), y: topo(x) - 24, lugar: 'Lago Igapó' }); }
    for(let x = x0 + 196; x < x1 - 60; x += 214){ if(evita(x, 46)) continue; K.bancos.push({ x: Math.round(x), y: fundo(x) + 32, lugar: 'Lago Igapó' }); }
    /* postes na calçada de fora */
    for(let x = x0 + 150; x < x1 - 60; x += 330){ if(evita(x, 40)) continue; const f = foraEm(x); if(f) K.postes.push({ x: Math.round(x), y: f.t + 8, orla: true }); }
    /* v3.87: o Papai Noel do Igapó, no trecho mais largo da água que sobra longe das pontes, do píer e da ilhinha (o
       "Igapó 2" daqui), em pé na balsa no meio do lago. Só aparece no Natal, mas o lugar (e a placa da orla de baixo, de frente pra ele) fica
       guardado o ano inteiro, pra cidade não mudar de cara quando ele chega */
    { const yDe = c => Math.round(Math.min(c.b - 40, (c.t + c.b) / 2 + 36));
      /* a balsa inteira (uns 190 px pra cada lado) tem que ficar na água */
      const ok = i => { const c = cols[i], xm = c.x + B / 2, y = yDe(c); return c.b - c.t >= 150 && !evita(xm, 280) && !(L.ilha && Math.abs(xm - L.ilha.x) < L.ilha.rad + 260) && cols.every(q => Math.abs(q.x + B / 2 - xm) > 240 || (q.t < y - 36 && q.b > y + 8)); };
      let bi = -1; for(let i = Math.floor(n * .18); i < Math.ceil(n * .75); i++) if(ok(i) && (bi < 0 || cols[i].b - cols[i].t > cols[bi].b - cols[bi].t)) bi = i;
      if(bi >= 0){ const c = cols[bi], xn = c.x + B / 2, yn = yDe(c), sul = x => { const f = foraEm(x); return f ? f.b - 16 : null; };
        const livreP = x => sul(x) != null && !K.bancos.some(b => Math.abs(b.x - x) < 60 && b.y > yn) && !K.postes.some(p => Math.abs(p.x - x) < 30 && p.y > yn) && !K.quiosques.some(q => Math.abs(q.x - x) < 80 && q.base > yn);
        const px = [-90, 90, -170, 170, -250, 250].map(d => xn + d).find(livreP), lx = px == null ? null : [-260, 260, -340, 340, -420, 420].map(d => xn + d).find(x => livreP(x) && Math.abs(x - px) > 150);
        /* na água em volta: as árvores de luz, os presentes boiando e os cisnes (cada um só onde é água de verdade) */
        const naAgua = (x, y, m) => { const q = colEm(x); return x > x0 + 40 && x < x1 - 40 && q.t + 26 + m < y && y < q.b - 14 - m && !evita(x, 60) && !(L.ilha && Math.hypot(x - L.ilha.x, y - L.ilha.y) < L.ilha.rad + 70); };
        const agua = [];
        [['palma', -330, -70], ['palma', -250, 72], ['palma', 262, 62], ['palma', 340, -60], ['palma', -470, 10], ['palma', 470, 22],
          ['presente', -196, 74], ['presente', -404, -112], ['presente', 204, 98], ['presente', 412, 92], ['presente', -560, -56], ['presente', 560, -48], ['presente', -300, 150], ['presente', 330, -150],
          ['cisne', -390, 124], ['cisne', 430, 156]].forEach(([k, dx, dy], i) => { const x = xn + dx, y = yn + dy; if(naAgua(x, y, k === 'cisne' ? 14 : 0) && (k !== 'cisne' || (naAgua(x - 44, y, 14) && naAgua(x + 44, y, 14)))) agua.push({ k, x, y, i }); });
        L.noel = { x: xn, y: yn, agua, placa: px != null ? { x: Math.round(px), y: Math.round(sul(px)) } : null, letreiro: lx != null ? { x: Math.round(lx), y: Math.round(sul(lx)) } : null };
        if(L.noel.placa) K.decor.push({ tipo: 'placaNoel', x: L.noel.placa.x, y: L.noel.placa.y });
        /* v4.03: a barraquinha da foto com o Papai Noel, na mesma orla, o mais de frente pra ele que der (longe da placa e
           do letreiro). O lugar fica guardado o ano inteiro, como o dele; a barraquinha só monta no Natal */
        /* (o livreP da placa olha qualquer banco abaixo do lago, até os de outro quarteirão; aqui só o que tá em volta) */
        const livreF = x => { const y = sul(x); return y != null && !K.bancos.some(b => Math.abs(b.x - x) < 58 && Math.abs(b.y - y) < 110) && !K.postes.some(q => Math.abs(q.x - x) < 34 && Math.abs(q.y - y) < 80) && !K.quiosques.some(q => Math.abs(q.x - x) < 90 && Math.abs(q.base - y) < 100); };
        const fx = [0, 30, -30, 60, -60, 130, -130, 160, -160, 200, -200, 240, -240, 420, -420, 470, -470].map(d => xn + d).find(x => livreF(x) && (px == null || Math.abs(x - px) > 104) && (lx == null || Math.abs(x - lx) > 130));
        if(fx != null){ L.noel.foto = { x: Math.round(fx), y: Math.round(sul(fx)) }; K.decor.push({ tipo: 'fotoNoel', x: L.noel.foto.x, y: L.noel.foto.y }); } } }
    /* muita árvore na beira */
    const np = L.noel && L.noel.placa, nl = L.noel && L.noel.letreiro, nf = L.noel && L.noel.foto;
    const ocupado = (x, y) => K.quiosques.some(q => Math.abs(q.x - x) < 64 && y > q.base - 40 && y < q.base + 44) || evita(x, 26) || (sx && Math.abs(x - sx) < 150 && y < foraEm(sx).t + 10) || (np && Math.abs(x - np.x) < 90 && Math.abs(y - np.y) < 80) || (nl && Math.abs(x - nl.x) < 100 && Math.abs(y - nl.y) < 90) || (nf && Math.abs(x - nf.x) < 90 && Math.abs(y - nf.y) < 96);
    for(let x = R.x + 30; x < R.x + R.w - 16; x += 56 + Math.floor(sorte() * 32)){
      const f = foraEm(x);
      if(!f){ for(let y = R.y + 70; y < R.y + R.h - 12; y += 84 + sorte() * 40) if(sorte() < .75) K.arv.push({ x: Math.round(x + (sorte() - .5) * 18), y: Math.round(y), cor: pega(IPES, sorte), g: sorte() < .3 }); continue; }
      const nTop = f.t - 22, sTop = f.b + 40, sBot = R.y + R.h - 14;
      if(nTop - (R.y + 50) > 8 && sorte() < .85){ const y = R.y + 50 + sorte() * (nTop - R.y - 50); if(!ocupado(x, y)) K.arv.push({ x: Math.round(x), y: Math.round(y), cor: pega(IPES, sorte), g: sorte() < .25 }); }
      if(sBot - sTop > 8 && sorte() < .85){ const y = sTop + sorte() * (sBot - sTop); if(!ocupado(x, y)) K.arv.push({ x: Math.round(x), y: Math.round(y), cor: pega(IPES, sorte), g: sorte() < .25 }); }
    }
    const bn = K.bancos.filter(b => b.lugar === 'Lago Igapó'), b0 = bn[Math.floor(bn.length * .3)] || bn[0];
    if(b0) K.lugares.push({ nome: 'Lago Igapó', x: b0.x + 34, y: b0.y + 12 });
    return L;
  }
  /* Zerão: a pista oval de terra roxa, quadras, parquinho, academia ao ar livre e food truck */
  function montaZerao(R, K, sorte){
    const z = { R, cx: R.x + R.w / 2, cy: R.y + R.h / 2 + 26, rx: 296, ry: 436 };
    /* v3.50: a largada da corrida de patinete, em cima da pista de caminhada (do lado direito do oval) */
    z.largada = { x: z.cx + z.rx - 19, y: z.cy }; K.lugares.push({ nome: 'Pista do Zerão', x: z.largada.x, y: z.largada.y + 20 });
    /* v3.76 (o Thales: "a quadra de basquete do lado da pista de skate, que é como é hoje, e lá em cima um campo de
       futebol"): o campo em cima (é ele que leva pro desafio de pênalti), os trucks, o parquinho e as barras no meio,
       e embaixo a quadra de basquete colada na pista de skate */
    /* o campo cabe dentro da grama do oval (a quina de cima fica a 18 da pista de caminhada) e termina antes das placas dos trucks */
    z.quadras = [{ tipo: 'futsal', campo: true, x: z.cx - 120, y: z.cy - 336, w: 240, h: 160 }, { tipo: 'basquete', x: z.cx - 196, y: z.cy + 120, w: 168, h: 100 }];
    z.areia = { x: z.cx - 200, y: z.cy - 28, w: 146, h: 96 };
    const qb = z.quadras[1];
    K.decor.push({ tipo: 'tabela', x: qb.x + 10, y: qb.y + qb.h / 2 + 8, lado: 1 }, { tipo: 'tabela', x: qb.x + qb.w - 10, y: qb.y + qb.h / 2 + 8, lado: -1 });
    K.decor.push({ tipo: 'escorrega', x: z.areia.x + 40, y: z.areia.y + 62 }, { tipo: 'balanco', x: z.areia.x + 110, y: z.areia.y + 64 });
    /* v3.76: a pista de skate no quarto de baixo à direita (as barras da academia foram pra baixo do parquinho, e a árvore
       e o banco que ficavam ali saíram). Bowl, rampa (quarter), caixote com rampa dos dois lados, corrimão e borda */
    const sk = z.skate = { x0: z.cx - 20, y0: z.cy + 80, x1: z.cx + 240, y1: z.cy + 290, erx: z.rx - 46, ery: z.ry - 46 };
    sk.bowl = { x: z.cx + 178, y: z.cy + 140, rx: 46, ry: 30 };
    sk.caixote = { x: z.cx + 72, y: z.cy + 168, w: 52, h: 24, r: 18 };
    sk.quarter = { x0: z.cx - 10, x1: z.cx + 118, y0: z.cy + 236, y1: z.cy + 266 };
    sk.trilhos = [{ x0: z.cx + 52, x1: z.cx + 128, y: z.cy + 214, tipo: 'corrimao' }, { x0: z.cx - 6, x1: z.cx + 44, y: z.cy + 122, tipo: 'borda' }];
    K.lugares.push({ nome: 'Pista de skate', x: z.cx + 60, y: z.cy + 205 }); K.zonas.push({ nome: 'Pista de skate', x: sk.x0, y: sk.y0, w: sk.x1 - sk.x0, h: sk.y1 - sk.y0 });
    K.decor.push({ tipo: 'placa', x: z.cx + 112, y: z.cy + 98, txt: 'SKATE', s: 2, fundo: ROSA, h: 26 });
    [0, 1, 2].forEach(i => K.decor.push({ tipo: 'barra', x: z.cx + 80 + i * 40, y: z.cy + 34 - (i % 2) * 14 }));
    [['SMASH', '#E2412E'], ['PASTEL', AMARELO], ['CHURROS', ROSA]].forEach(([nome, cor], i) => { const tr = { id: 'tr' + i, x: z.cx + (i - 1) * 104, base: z.cy - 60, nome, cor }; K.trucks.push(tr); K.sol.push({ x: tr.x - 42, y: tr.base - 22, w: 84, h: 22 }); });
    [200, 160, -20, 120, 60].forEach(a => { const an = a * Math.PI / 180; K.bancos.push({ x: Math.round(z.cx + Math.cos(an) * (z.rx - 62)), y: Math.round(z.cy + Math.sin(an) * (z.ry - 62)), lugar: 'Zerão' }); });
    for(let y = R.y + 60; y < R.y + R.h - 10; y += 80) for(let x = R.x + 30; x < R.x + R.w - 20; x += 76){
      const jx = x + (sorte() - .5) * 30, jy = y + (sorte() - .5) * 30, e = ((jx - z.cx) / z.rx) ** 2 + ((jy - z.cy) / z.ry) ** 2;
      if(e > 1.18 && sorte() < .8 && Math.abs(jx - z.cx) > (jy < z.cy - z.ry + 30 ? 90 : 40)) K.arv.push({ x: Math.round(jx), y: Math.round(jy), cor: pega(IPES, sorte), g: sorte() < .3 });
    }
    [[z.cx + 205, z.cy - 104], [z.cx - 212, z.cy - 108], [z.cx + 206, z.cy + 46]].forEach(([x, y]) => K.arv.push({ x, y, cor: pega(IPES, sorte), g: true }));
    K.decor.push({ tipo: 'placa2', x: z.cx, y: z.cy - z.ry - 4, txt: 'ZERAO', s: 2, fundo: AMARELO, h: 30 });
    K.lugares.push({ nome: 'Zerão', x: z.cx, y: z.cy - z.ry + 18 });
    return z;
  }
  /* Bosque dos Ipês: trilha de terra roxa em cruz, uma roda no meio e o ipê gigante */
  function montaBosque(R, K, sorte){
    const b = { R, cx: R.x + R.w / 2, cy: R.y + R.h / 2, anel: 130 }, px = b.cx + 96;
    const livre = (x, y) => { const d = Math.hypot(x - b.cx, y - b.cy); return Math.abs(x - b.cx) < 50 || Math.abs(y - b.cy) < 50 || Math.abs(d - b.anel) < 50 || d < b.anel || (Math.abs(x - px) < 100 && y < R.y + 120); };
    for(let y = R.y + 64; y < R.y + R.h - 8; y += 76) for(let x = R.x + 34; x < R.x + R.w - 16; x += 80){ const jx = x + (sorte() - .5) * 44, jy = y + (sorte() - .5) * 36; if(livre(jx, jy) || sorte() < .1) continue; K.arv.push({ x: Math.round(jx), y: Math.round(jy), cor: pega(IPES, sorte), g: sorte() < .32 }); }
    K.decor.push({ tipo: 'ipe', x: b.cx, y: b.cy + 14 }); K.sol.push({ x: b.cx - 10, y: b.cy + 4, w: 20, h: 12 });
    for(let i = 0; i < 8; i++){ const a = (i + .5) / 8 * Math.PI * 2; K.bancos.push({ x: Math.round(b.cx + Math.cos(a) * 76), y: Math.round(b.cy + Math.sin(a) * 76) + 10, lugar: 'Bosque dos Ipês' }); }
    K.decor.push({ tipo: 'placa', x: px, y: R.y + 34, txt: 'BOSQUE DOS IPES', fundo: PAPEL, h: 26 });
    K.lugares.push({ nome: 'Bosque dos Ipês', x: b.cx, y: b.cy + b.anel });
    return b;
  }
  /* Gleba Palhano: as torres de frente pro lago */
  function montaGleba(R, K, sorte){
    const torres = [], base = R.y + R.h - 34;
    for(let x = R.x + 36, i = 0; x < R.x + R.w - 130; i++){ const w = [128, 112, 146, 120, 136, 150][i % 6], h = [300, 382, 336, 420, 290, 360][i % 6]; torres.push({ id: 'gleba' + i, x, w, h, base, cor: ['branco', 'concreto', 'escuro', 'branco', '#D9B48F', 'concreto'][i % 6] }); x += w + 70; }
    torres.forEach((t, i) => { K.sol.push({ x: t.x, y: t.base - 34, w: t.w, h: 34 }); if(i < torres.length - 1) K.arv.push({ x: Math.round(t.x + t.w + 35), y: base + 4, cor: pega(IPES, sorte) }); if(i % 2 === 0) K.bancos.push({ x: Math.round(t.x + t.w / 2), y: base + 28, lugar: 'Gleba Palhano' }); });
    const t2 = torres[Math.min(2, torres.length - 1)]; K.lugares.push({ nome: 'Gleba Palhano', x: t2.x + t2.w / 2, y: base + 50 });
    return { R, torres, base };
  }
  /* Estádio do Café: arquibancada azul e branca, campo de grama seca e portões dos lados */
  /* duas fileiras de cinco, de frente pro sul: a de cima abre pro corredor, a de baixo pra rua */
  function montaFeira(R, K){
    const linhas = [R.y + 116, R.y + 250], passo = R.w / 5;
    const barracas = BARRACAS.map((d, i) => Object.assign({}, d, { x: Math.round(R.x + passo * (i % 5) + passo / 2), base: linhas[Math.floor(i / 5)] }));
    K.lugares.push({ nome: 'Feira do Corre', x: R.x + R.w / 2, y: R.y + 176 });
    return { R, barracas };
  }
  function montaEstadio(R, K){
    const e = { R, fx: R.x + 14, fy: R.y + 14, fw: R.w - 28, fh: R.h - 28 };
    const c = e.campo = { x: e.fx + 80, y: e.fy + 120, w: e.fw - 160, h: e.fh - 200 };
    e.portao = { y: c.y + c.h / 2 - 36, h: 72 };
    /* v3.50: a largada da corrida, no portão da esquerda do Estádio (o Autódromo do Café é do lado). v3.64: a placa diz CORRIDA (tem moto e carro) */
    e.largada = { x: R.x + 34, y: e.portao.y + e.portao.h / 2 + 10 }; K.lugares.push({ nome: 'Autódromo do Café', x: e.largada.x, y: e.largada.y + 20 });
    const fim = e.fy + e.fh, dx = e.fx + e.fw, sul = c.y + c.h;
    K.sol.push({ x: e.fx, y: e.fy, w: e.fw, h: c.y - e.fy });
    K.sol.push({ x: e.fx, y: c.y, w: c.x - e.fx, h: e.portao.y - c.y }, { x: e.fx, y: e.portao.y + e.portao.h, w: c.x - e.fx, h: fim - e.portao.y - e.portao.h });
    K.sol.push({ x: c.x + c.w, y: c.y, w: dx - c.x - c.w, h: e.portao.y - c.y }, { x: c.x + c.w, y: e.portao.y + e.portao.h, w: dx - c.x - c.w, h: fim - e.portao.y - e.portao.h });
    K.sol.push({ x: c.x, y: sul, w: c.w, h: fim - sul });
    K.lugares.push({ nome: 'Estádio do Café', x: c.x + c.w / 2, y: c.y + c.h / 2 });
    return e;
  }
  /* v3.57 · a ACEL: o campo de beisebol em pixel (a casa embaixo, a cerca em arco em cima), a sede de telhado de beiral
     e a arquibancada atrás da casa. O chão é calculado uma vez, em colunas de 8 px (cada coluna, os trechos de terra) */
  function montaAcel(R, K){
    if(!R) return null;
    const hp = { x: R.x + R.w / 2, y: R.y + R.h - 120 }, raio = th => 300 + 70 * Math.cos(2 * th), BQ = 8, monte = { x: hp.x, y: hp.y - 75 };
    const em = (th, r) => ({ x: hp.x + Math.sin(th) * r, y: hp.y - Math.cos(th) * r });
    const bases = [em(Math.PI / 4, 112), em(0, 158), em(-Math.PI / 4, 112)];
    /* cada quadradinho: 1 = terra roxa (pista de aviso, o arco do infield, o círculo da casa), 2 = o montinho e as bases */
    const tipo = (x, y) => {
      const dx = x - hp.x, dy = hp.y - y, d = Math.hypot(dx, dy), th = Math.atan2(dx, dy), dentro = Math.abs(th) <= Math.PI / 4 + .02;
      if(Math.hypot(x - monte.x, y - monte.y) <= 13 || bases.some(b => Math.hypot(x - b.x, y - b.y) <= 12)) return 2;
      if(d <= 26) return 1;
      if(dentro && d < raio(th) && d > raio(th) - 22) return 1;
      const losango = Math.abs(dx) + Math.abs(dy - 79) <= 66;
      if(!losango && Math.abs(th) <= Math.PI / 4 + .14 && Math.hypot(x - monte.x, y - monte.y) <= 104 && dy > 0) return 1;
      return 0;
    };
    const runs = { 1: [], 2: [] };
    for(let x = R.x; x < R.x + R.w; x += BQ){ let cur = 0, y0 = 0;
      for(let y = R.y; y <= R.y + R.h; y += BQ){ const k = y < R.y + R.h ? tipo(x + BQ / 2, y + BQ / 2) : 0; if(k !== cur){ if(cur) runs[cur].push([x, y0, y - y0]); cur = k; y0 = y; } } }
    /* a cerca: um ponto a cada ~10 px, e cada um é parede */
    const cerca = []; for(let i = 0; i <= 64; i++){ const th = -Math.PI / 4 + Math.PI / 2 * i / 64, p = em(th, raio(th)); cerca.push(p); K.sol.push({ x: p.x - 5, y: p.y - 4, w: 10, h: 6 }); }
    const arq = [{ x: hp.x - 34 - 206, y: hp.y + 30, w: 206, h: 44 }, { x: hp.x + 34, y: hp.y + 30, w: 206, h: 44 }];
    const banco = [{ x: hp.x - 176, y: hp.y - 40, w: 90, h: 16 }, { x: hp.x + 86, y: hp.y - 40, w: 90, h: 16 }];
    const sede = { x: R.x + 14, base: R.y + 196, w: 180 }, placar = { x: hp.x, base: R.y + 122 }, portal = { x: hp.x, base: R.y + R.h - 10 };
    const torres = [{ x: R.x + 40, base: R.y + 430 }, { x: R.x + R.w - 40, base: R.y + 430 }, { x: R.x + 46, base: hp.y + 20 }, { x: R.x + R.w - 46, base: hp.y + 20 }];
    K.sol.push(...arq, ...banco, { x: sede.x, y: sede.base - 34, w: sede.w, h: 34 }, { x: placar.x - 60, y: placar.base - 8, w: 120, h: 8 }, { x: portal.x - 46, y: portal.base - 6, w: 10, h: 6 }, { x: portal.x + 36, y: portal.base - 6, w: 10, h: 6 },
      ...torres.map(o => ({ x: o.x - 4, y: o.base - 5, w: 8, h: 6 })));
    K.lugares.push({ nome: 'ACEL · Beisebol', x: hp.x, y: hp.y + 104 });
    return { R, hp, raio, bases, monte, runs, cerca, arq, banco, sede, placar, portal, torres, porta: { x: hp.x, y: R.y + R.h - 4 }, casa: { x: hp.x - 22, y: hp.y + 14 } };
  }
  /* ---------- v3.82 · o Parque Arthur Thomas (o Thales: "faça o parque Arthur Thomas porque lá tem macaco") ----------
     A mata do Ribeirão Cambé, do lado do Igapó (é o mesmo ribeirão que, mais pra baixo, vira o lago). Tudo do guia
     "Descobrindo o Parque" da Prefeitura (2026): criado em 1975 numa doação da Companhia de Terras Norte do Paraná,
     aberto pra visita em 1987, 85 hectares de Mata Atlântica a 6 km do Centro. Na entrada, o busto do Arthur Thomas, o
     CEA (o Centro de Educação Ambiental, de 2004), o Jardim dos Sentidos e o Jardim Água e Mel (três colmeias de abelha
     sem ferrão); a Trilha do Tatu com o mirante, o Espaço Ipê-Amarelo na beira do lago assoreado (as ilhinhas), o
     Córrego Piza, a Trilha da Capivara, a Ponte da Barragem, a Usina Cambé (1939, a primeira de Londrina) e o Salto
     Beija-Flor (uns 20 metros, no basalto). Os macacos-prego e os quatis andam soltos. A Jaula dos Macacos é cenário:
     os macacos daqui são livres, quem entra nela é você, pra jogar o Elo Perdido.
     Tudo em coordenadas do parque (0 a 696, 0 a 1002), somadas ao canto do quarteirão. */
  function montaArthur(R, K){
    if(!R) return null;
    const q = rng(hash('arthur')), X = x => R.x + x, Y = y => R.y + y, pt = (x, y) => ({ x: X(x), y: Y(y) });
    const P = { R, trilhas: [], riachos: [], secos: [], galhos: [], bichos: [], sol: [] };
    /* o lago: colunas de 12 px, como o Igapó; a ponta da esquerda, estreita, é a da barragem */
    const B = 12, x0 = X(216), x1 = X(600), n = Math.round((x1 - x0) / B);
    const cyF = x => Y(690) + 22 * Math.sin((x - R.x) / 80), hwF = x => Math.max(20, (95 + 18 * Math.sin((x - R.x) / 60 + 1)) * Math.min(1, Math.sqrt(Math.max(0, Math.min(x - x0, x1 - x)) / 90)));
    const cols = []; for(let i = 0; i < n; i++){ const xm = x0 + i * B + B / 2, cy = cyF(xm), hw = hwF(xm); cols.push({ x: x0 + i * B, t: Math.round((cy - hw) / B) * B, b: Math.round((cy + hw) / B) * B }); }
    P.lago = { x0, x1, B, cols };
    /* as ilhinhas do assoreamento (terra e lixo que a chuva traz) */
    P.ilhas = [{ x: X(330), y: Y(694), r: 22 }, { x: X(468), y: Y(708), r: 15 }, { x: X(540), y: Y(676), r: 10 }];
    /* o Ribeirão Cambé sai da barragem pelo vertedouro, desce até o Salto e vai embora pro lado do Igapó; o Córrego
       Piza chega no lago pela direita */
    P.riachos = [
      { w: 18, pts: [pt(198, 692), pt(182, 700), pt(176, 744), pt(180, 800), pt(186, 846)] },
      { w: 22, pts: [pt(186, 920), pt(150, 936), pt(90, 952), pt(0, 962)] },
      { w: 12, pts: [pt(696, 640), pt(662, 652), pt(632, 668), pt(600, 690)] }
    ];
    P.salto = { x: X(186), y0: Y(846), y1: Y(902), x0: X(128), x1: X(236) };
    P.poco = { x: X(186), y: Y(916), rx: 38, ry: 15 };
    /* o que é seco por cima da água: a barragem (a ponte) e os dois pontilhões */
    P.barragem = { x: X(198), y: Y(632), w: 20, h: 118 };
    P.secos.push(P.barragem, { x: X(162), y: Y(784), w: 36, h: 24, ponte: true }, { x: X(620), y: Y(648), w: 32, h: 36, ponte: true });
    /* as trilhas de terra roxa */
    const T = (w, nome, ...ps) => P.trilhas.push({ w, nome, pts: ps.map(([x, y]) => pt(x, y)) });
    T(34, '', [348, 0], [348, 160]);
    T(30, 'Trilha do Tatu', [300, 146], [210, 215], [140, 300], [118, 380], [128, 470], [170, 548], [200, 598], [207, 634]);
    T(28, '', [404, 146], [452, 214], [470, 280], [520, 334]);
    T(30, 'Trilha da Capivara', [556, 330], [608, 420], [632, 520], [636, 600], [636, 700], [612, 776], [480, 818], [330, 816], [240, 794], [208, 750]);
    T(26, '', [348, 158], [352, 262], [336, 420], [404, 500], [500, 524]);
    T(24, '', [208, 750], [232, 800], [258, 850], [268, 880]);
    T(22, '', [232, 800], [150, 798], [104, 850]);
    /* a praça da entrada, a clareira da jaula e a do Espaço Ipê-Amarelo */
    P.praca = { x: X(150), y: Y(0), w: 396, h: 156 };
    P.clareiras = [{ x: X(540), y: Y(300), rx: 92, ry: 62 }, { x: X(520), y: Y(520), rx: 64, ry: 34 }];
    P.jardim = [{ x: X(30), y: Y(46), w: 46, h: 30 }, { x: X(86), y: Y(46), w: 46, h: 30 }, { x: X(30), y: Y(90), w: 102, h: 30 }];
    /* as construções (o ponto é o meio da base) e a colisão de cada uma */
    P.portal = { x: X(348), base: Y(44) };
    P.busto = { x: X(242), base: Y(122) };
    P.cea = { x: X(494), base: Y(132), w: 168 };
    P.colmeias = [{ x: X(616), base: Y(112) }, { x: X(642), base: Y(124) }, { x: X(668), base: Y(112) }];
    P.mirante = { x: X(66), base: Y(398) };
    P.gazebo = { x: X(520), base: Y(522) };
    P.usina = { x: X(84), base: Y(832), w: 116 };
    P.jaula = { x: X(540), base: Y(298), w: 120 };
    P.deck = { x: X(238), y: Y(876), w: 62, h: 30 };
    P.sol.push({ x: P.portal.x - 52, y: P.portal.base - 6, w: 10, h: 6 }, { x: P.portal.x + 42, y: P.portal.base - 6, w: 10, h: 6 },
      { x: P.busto.x - 13, y: P.busto.base - 10, w: 26, h: 10 }, { x: P.cea.x - P.cea.w / 2, y: P.cea.base - 30, w: P.cea.w, h: 30 },
      ...P.colmeias.map(c => ({ x: c.x - 7, y: c.base - 5, w: 14, h: 5 })), { x: P.mirante.x - 22, y: P.mirante.base - 22, w: 44, h: 22 },
      { x: P.gazebo.x - 30, y: P.gazebo.base - 6, w: 6, h: 6 }, { x: P.gazebo.x + 24, y: P.gazebo.base - 6, w: 6, h: 6 },
      { x: P.usina.x - P.usina.w / 2, y: P.usina.base - 34, w: P.usina.w, h: 34 }, { x: P.jaula.x - P.jaula.w / 2, y: P.jaula.base - 34, w: P.jaula.w, h: 34 },
      { x: P.salto.x0, y: P.salto.y0, w: P.deck.x - P.salto.x0, h: P.salto.y1 - P.salto.y0 });
    K.sol.push(...P.sol);
    /* as placas: as de ler (a porta "Ler") e as de nome */
    P.placas = [
      { x: P.busto.x + 22, y: P.busto.base + 10, titulo: 'Arthur Thomas', txt: 'Arthur Hugh Miller Thomas, escocês de Edimburgo (1889), fundou a Companhia de Terras Norte do Paraná, a que abriu Londrina. O parque nasceu em 1975, numa doação de terra da companhia, e abriu pra visita em 1987.' },
      { x: P.colmeias[1].x, y: P.colmeias[1].base + 16, titulo: 'Jardim Água e Mel', txt: 'Três colmeias de abelha sem ferrão: jataí, mirim e mandaçaia. Abelha nativa poliniza a mata e não pica.' },
      { x: P.mirante.x + 34, y: P.mirante.base + 8, titulo: 'Mirante', txt: 'Lá de cima é mata até onde a vista alcança: 85 hectares de Mata Atlântica a 6 km do Centro, um dos últimos pedaços dela no Paraná.' },
      { x: P.gazebo.x - 46, y: P.gazebo.base + 18, titulo: 'O lago', txt: 'As ilhinhas do lago são assoreamento: terra e lixo que a chuva traz pros córregos. Mata na beira do rio (a mata ciliar) é o que segura isso.' },
      { x: P.usina.x + 20, y: P.usina.base + 18, titulo: 'Usina Cambé', txt: 'A primeira usina hidrelétrica de Londrina, inaugurada em 8 de fevereiro de 1939. Aproveitava a queda de 50 metros do Ribeirão Cambé e parou 28 anos depois.' },
      { x: P.deck.x + P.deck.w / 2, y: P.deck.y + P.deck.h + 10, titulo: 'Salto Beija-Flor', txt: 'Uns 20 metros de queda no basalto, a rocha do derramamento vulcânico que, desmanchando, vira a terra roxa. Os buracos redondos na pedra são as panelas, que a água cavou.' }
    ];
    K.decor.push({ tipo: 'placa', x: X(196), y: Y(626), txt: 'PONTE DA BARRAGEM', fundo: PAPEL, h: 22 }, { tipo: 'placa', x: X(168), y: Y(262), txt: 'TRILHA DO TATU', fundo: PAPEL, h: 24 },
      { tipo: 'placa', x: X(622), y: Y(474), txt: 'TRILHA DA CAPIVARA', fundo: PAPEL, h: 24 }, { tipo: 'placa', x: X(448), y: Y(400), txt: 'NAO DE COMIDA AOS BICHOS', fundo: AMARELO, h: 24 },
      { tipo: 'placa', x: X(286), y: Y(866), txt: 'SALTO BEIJA-FLOR', fundo: PAPEL, h: 22 }, { tipo: 'placa', x: X(84), y: Y(36), txt: 'JARDIM DOS SENTIDOS', fundo: PAPEL, h: 20 });
    /* bancos: na praça, no Espaço Ipê-Amarelo e no mirante da cachoeira */
    [[X(196), Y(64), 'Parque Arthur Thomas'], [X(500), Y(70), 'Parque Arthur Thomas'], [X(488), Y(548), 'Parque Arthur Thomas'], [X(556), Y(548), 'Parque Arthur Thomas'], [X(270), Y(900), 'Salto Beija-Flor']].forEach(([x, y, lugar]) => K.bancos.push({ x, y, lugar }));
    /* a mata: ipê, flamboyant e jacarandá bem juntos (só o tronco bate), fora da trilha, da água e das construções */
    const dSeg = (x, y, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy || 1, u = clamp(((x - a.x) * dx + (y - a.y) * dy) / L, 0, 1); return Math.hypot(x - a.x - dx * u, y - a.y - dy * u); };
    const longe = (x, y) => {
      if(x < R.x + 10 || x > R.x + R.w - 10 || y < R.y + 26 || y > R.y + R.h - 6) return false;
      if(x > P.praca.x - 16 && x < P.praca.x + P.praca.w + 16 && y < P.praca.y + P.praca.h + 22) return false;
      if(x < X(150) && y < Y(150)) return false;
      if(x > X(590) && y < Y(150)) return false;
      for(const t of P.trilhas) for(let i = 1; i < t.pts.length; i++) if(dSeg(x, y, t.pts[i - 1], t.pts[i]) < t.w / 2 + 16) return false;
      for(const r of P.riachos) for(let i = 1; i < r.pts.length; i++) if(dSeg(x, y, r.pts[i - 1], r.pts[i]) < r.w / 2 + 22) return false;
      if(x > x0 - 30 && x < x1 + 30){ const c = cols[clamp(Math.floor((x - x0) / B), 0, n - 1)]; if(y > c.t - 30 && y < c.b + 26) return false; }
      for(const c of P.clareiras) if(((x - c.x) / (c.rx + 18)) ** 2 + ((y - c.y) / (c.ry + 26)) ** 2 < 1) return false;
      if(y > P.salto.y0 - 30 && y < P.poco.y + 40 && x > P.salto.x0 - 10 && x < P.deck.x + P.deck.w + 20) return false;
      /* na frente das construções (que é pra onde a câmera olha) a mata abre: nada de árvore até 120 px abaixo da base */
      for(const s of P.sol) if(x > s.x - 34 && x < s.x + s.w + 34 && y > s.y - 4 && y < s.y + s.h + 120) return false;
      if(x > P.salto.x0 - 30 && x < P.deck.x + P.deck.w + 30 && y > P.salto.y0 - 30) return false;
      for(const s of P.secos) if(x > s.x - 20 && x < s.x + s.w + 20 && y > s.y - 10 && y < s.y + s.h + 30) return false;
      for(const p of P.placas) if(Math.abs(x - p.x) < 24 && y > p.y - 10 && y < p.y + 30) return false;
      return !K.bancos.some(b => Math.abs(b.x - x) < 30 && Math.abs(b.y - y) < 26);
    };
    const minhas = [];
    for(let y = R.y + 40; y < R.y + R.h; y += 38) for(let x = R.x + 16 + (Math.round(y / 38) % 2) * 20; x < R.x + R.w - 8; x += 40){
      const jx = Math.round(x + (q() - .5) * 22), jy = Math.round(y + (q() - .5) * 18); if(!longe(jx, jy) || q() < .12) continue;
      const g = q() < .3 ? (q() < .25 ? 2 : true) : false, perto = P.sol.some(s => jx > s.x - 70 && jx < s.x + s.w + 70 && jy > s.y && jy < s.y + s.h + 240);
      const a = { x: jx, y: jy, cor: pega(IPES, q), g: perto ? false : g, parque: true }; K.arv.push(a); minhas.push(a);
    }
    /* os galhos dos macacos: as copas perto da jaula e da Trilha da Capivara, e o teto da jaula (eles sentam em cima dela) */
    const capivara = P.trilhas.find(t => t.nome === 'Trilha da Capivara');
    minhas.forEach(a => { const s = a.g === 2 ? 2 : a.g ? 1.3 : 1, perto = Math.hypot(a.x - P.jaula.x, a.y - P.jaula.base) < 240 || capivara.pts.some((p, i) => i && dSeg(a.x, a.y, capivara.pts[i - 1], p) < 80);
      if(perto) P.galhos.push({ x: a.x + Math.round((q() - .5) * 16 * s), y: a.y - Math.round(64 * s), base: a.y + .5 }); });
    [-34, 30].forEach(dx => P.galhos.push({ x: P.jaula.x + dx, y: P.jaula.base - 64, base: P.jaula.base + .5, jaula: true }));
    P.galhos.forEach(g => { g.viz = P.galhos.filter(o => o !== g && Math.hypot(o.x - g.x, o.y - g.y) < 150).map(o => P.galhos.indexOf(o)); });
    /* onde eles descem pra fuçar: pontos da trilha perto dos galhos */
    P.chao = []; capivara.pts.concat(P.trilhas[2].pts).forEach((p, i, L) => { if(i && L[i - 1]) for(let u = 0; u < 1; u += .34){ const x = L[i - 1].x + (p.x - L[i - 1].x) * u, y = L[i - 1].y + (p.y - L[i - 1].y) * u; if(P.galhos.some(g => Math.hypot(g.x - x, g.base - y) < 120)) P.chao.push({ x: Math.round(x), y: Math.round(y) }); } });
    /* os bichos parados: capivara na beira do lago (a família toda), garça na ilha e no poço do Salto */
    [[X(300), Y(782), 3], [X(436), Y(786), 2]].forEach(([x, y, k]) => P.bichos.push({ tipo: 'capivara', x, y, n: k, sd: Math.floor(q() * 1e6) }));
    P.bichos.push({ tipo: 'garca', x: P.ilhas[0].x + 4, y: P.ilhas[0].y + 4, sd: Math.floor(q() * 1e6) }, { tipo: 'garca', x: P.poco.x + 30, y: P.poco.y + 12, sd: Math.floor(q() * 1e6) });
    /* o caminho dos quatis (o bando anda na Trilha do Tatu, vai e volta) */
    P.quatiRota = P.trilhas[1].pts;
    P.dSeg = dSeg;
    K.zonas.push({ nome: 'Salto Beija-Flor', x: X(110), y: Y(836), w: 210, h: 120 }, { nome: 'Jaula dos Macacos', x: P.jaula.x - 100, y: P.jaula.base - 90, w: 200, h: 160 }, { nome: 'Usina Cambé', x: P.usina.x - 70, y: P.usina.base - 70, w: 140, h: 100 });
    K.lugares.push({ nome: 'Parque Arthur Thomas', x: X(348), y: Y(176) }, { nome: 'Jaula dos Macacos', x: P.jaula.x, y: P.jaula.base + 36 }, { nome: 'Salto Beija-Flor', x: P.deck.x + P.deck.w / 2, y: P.deck.y + 12 });
    return P;
  }
  /* a água do parque: o lago, o ribeirão, o Córrego Piza e o poço do Salto (a barragem e os pontilhões são secos) */
  const naParque = (x, y) => {
    const p = V.cid && V.cid.arthur; if(!p || x < p.R.x - 8 || x > p.R.x + p.R.w + 8 || y < p.R.y || y > p.R.y + p.R.h) return false;
    for(const s of p.secos) if(x > s.x && x < s.x + s.w && y > s.y && y < s.y + s.h) return false;
    const l = p.lago; if(x >= l.x0 && x < l.x1){ const c = l.cols[Math.floor((x - l.x0) / l.B)]; if(c && y > c.t + 4 && y < c.b - 2) return true; }
    for(const r of p.riachos) for(let i = 1; i < r.pts.length; i++) if(p.dSeg(x, y, r.pts[i - 1], r.pts[i]) < r.w / 2 + 2) return true;
    const po = p.poco; return ((x - po.x) / po.rx) ** 2 + ((y - po.y) / po.ry) ** 2 < 1;
  };
  /* v3.40 · o Aeroporto de Londrina: a pista embaixo, o terminal e a torre em cima, o pátio com o teco-teco do Corre */
  function montaAeroporto(R, K){
    if(!R) return null;
    const pista = { x: R.x + 60, y: R.y + R.h - 150, w: R.w - 120, h: 58 };
    const term = { x: R.x + 60, base: R.y + 236, w: 300 }, torre = { x: R.x + 430, base: R.y + 226 };
    const patio = { x: R.x + 400, y: R.y + 262, w: R.w - 470, h: 120 }, vaga = { x: R.x + 640, y: R.y + 352 };
    const biruta = { x: R.x + R.w - 96, y: pista.y - 34 };
    K.sol.push({ x: term.x, y: term.base - 34, w: term.w, h: 34 }, { x: torre.x - 20, y: torre.base - 22, w: 40, h: 22 }, { x: vaga.x - 26, y: vaga.y - 10, w: 54, h: 12 }, { x: biruta.x - 4, y: biruta.y - 6, w: 8, h: 8 });
    K.lugares.push({ nome: 'Aeroporto', x: term.x + term.w / 2, y: term.base + 46 });
    [term.x + 34, term.x + term.w - 34].forEach(x => K.bancos.push({ x, y: term.base + 30, lugar: 'Aeroporto' }));
    return { R, pista, term, torre, patio, vaga, biruta, porta: { x: term.x + term.w / 2, y: term.base + 8 } };
  }
  /* ---------- v3.75 · o Rio Tibagi: atravessa a cidade inteira embaixo, de ponta a ponta ----------
     A margem de cima é a da cidade: calçada, a trilha de terra, bancos de frente pra água, a prainha e os dois portos
     (de onde sai o barquinho). A de baixo é a mata: só se chega de barco, e lá ninguém desce (capivara, garça e ipê).
     A água é feita de colunas de 12 px, como o Igapó; pedra, píer e barco amarrado são o que o barquinho não atravessa.
     Perto das pedras a água corre (a corredeira), e é ali que a piapara grande gosta de ficar. */
  const RIO_H = 640;
  function montaRio(W, y0, K){
    const B = 12, n = Math.ceil(W / B), q = rng(hash('tibagi'));
    const cyF = x => y0 + 300 + 34 * Math.sin(x / 620 + .8) + 16 * Math.sin(x / 230 + 2.1);
    const hwF = x => 118 + 26 * Math.sin(x / 480 + 1.3) + 10 * Math.sin(x / 170);
    const cols = []; for(let i = 0; i < n; i++){ const xm = i * B + B / 2, cy = cyF(xm), hw = hwF(xm); cols.push({ x: i * B, t: Math.round((cy - hw) / B) * B, b: Math.round((cy + hw) / B) * B }); }
    const colEm = x => cols[clamp(Math.floor(x / B), 0, n - 1)];
    const R = { y0, B, n, W, cols, colEm, cyF, hwF, piers: [], pedras: [], amarrados: [], prainha: null, barracao: null, mata: [], bichos: [] };
    /* os dois portos: onde a margem é mais estreita perto do ponto escolhido (o píer fica curto e o barco, perto da rua) */
    const porto = (f, nome, k) => {
      let best = null; for(let x = W * f - 240; x <= W * f + 240; x += B){ const c = colEm(x); if(!best || c.t < best.t) best = { x: c.x + B / 2, t: c.t }; }
      const xp = Math.round(best.x), t = best.t, p = { k, nome, x: xp - 20, y: t - 30, w: 40, h: 106, xp, t, ponta: { x: xp, y: t + 66 } };
      R.piers.push(p);
      /* dois barcos amarrados do lado esquerdo do píer (o direito fica livre pra quem sai remando) */
      R.amarrados.push({ p, dy: 38, lado: 1, cor: k === 'porto' ? AMARELO : ROSA }, { p, dy: 82, lado: 1, cor: k === 'porto' ? AZUL : LARANJA });
      K.zonas.push({ nome, x: xp - 170, y: y0 + 14, w: 340, h: t + 110 - y0 });
      K.lugares.push({ nome, x: xp, y: t - 40 });
      return p;
    };
    const P1 = porto(.37, 'Porto do Tibagi', 'porto'), P2 = porto(.79, 'Prainha do Tibagi', 'prainha');
    /* o barracão do porto (barco, isca, colete), na margem, do lado esquerdo do píer */
    R.barracao = { x: P1.xp - 142, base: P1.t - 22 }; K.sol.push({ x: R.barracao.x - 76, y: R.barracao.base - 26, w: 152, h: 26 });
    K.decor.push({ tipo: 'placa', x: P1.xp + 150, y: P1.t - 20, txt: 'RIO TIBAGI', s: 2, fundo: PAPEL, h: 28 });
    /* a prainha: areia em volta do segundo píer, guarda-sol e duas cadeiras de frente pro rio */
    R.prainha = { x0: P2.xp - 300, x1: P2.xp + 210 };
    [[-230, ROSA], [-130, AMARELO], [130, AZUL]].forEach(([dx, cor]) => { const x = P2.xp + dx, c = colEm(x); K.decor.push({ tipo: 'guardasol', x, y: c.t - 22, cor }); K.sol.push({ x: x - 3, y: c.t - 26, w: 6, h: 6 }); K.bancos.push({ x: x + 24, y: c.t - 14, lugar: 'Prainha do Tibagi' }); });
    const perto = (x, m) => R.piers.some(p => Math.abs(x - p.xp) < m) || (x > R.prainha.x0 - 30 && x < R.prainha.x1 + 30) || Math.abs(x - R.barracao.x) < 80;
    /* bancos de frente pra água ao longo da trilha, poste na calçada e ipê entre a calçada e a trilha */
    for(let x = 150; x < W - 100; x += 380){ if(perto(x, 120)) continue; K.bancos.push({ x, y: colEm(x).t - 18, lugar: 'Rio Tibagi' }); }
    for(let x = 90; x < W - 40; x += 330){ if(perto(x, 50)) continue; K.postes.push({ x, y: y0 + 12 }); }
    for(let x = 60 + q() * 60; x < W - 40; x += 150 + q() * 120){ const c = colEm(x), y = y0 + 34 + q() * Math.max(0, c.t - y0 - 96); if(perto(x, 60) || c.t - y0 < 96) continue; K.arv.push({ x: Math.round(x), y: Math.round(y), cor: pega(IPES, q), g: q() < .25 }); }
    /* as pedras no meio da água (longe dos portos), cada grupo com uma, duas ou três */
    for(let x = 260 + q() * 200; x < W - 200; x += 420 + q() * 360){
      if(perto(x, 260)) continue; const c = colEm(x), cy = (c.t + c.b) / 2, hw = (c.b - c.t) / 2, y = cy + (q() - .5) * hw;
      const k = 1 + Math.floor(q() * 3); for(let i = 0; i < k; i++) R.pedras.push({ x: Math.round(x + (i ? (q() - .5) * 40 : 0)), y: Math.round(y + (i ? (q() - .5) * 26 : 0)), r: Math.round(9 + q() * (i ? 5 : 9)) });
    }
    /* a mata da outra margem: ipê, flamboyant e jacarandá em fileiras tortas (sem colisão: ninguém chega lá a pé) */
    for(let fila = 0; fila < 4; fila++) for(let x = q() * 40; x < W; x += 44 + q() * 30){ const c = colEm(x), y = c.b + 34 + fila * 52 + q() * 26; if(y > y0 + RIO_H - 6) continue; K.arv.push({ x: Math.round(x), y: Math.round(y), cor: pega(IPES, q), g: q() < .45 ? (q() < .3 ? 2 : true) : false, mata: true }); }
    /* capivaras na beira da mata, garças nas pedras e na beirada */
    for(let x = 400 + q() * 300; x < W - 200; x += 900 + q() * 700){ const c = colEm(x); R.bichos.push({ tipo: 'capivara', x: Math.round(x), y: c.b + 12, n: 2 + Math.floor(q() * 3), sd: Math.floor(q() * 1e6) }); }
    R.pedras.filter((p, i) => i % 3 === 0).forEach(p => R.bichos.push({ tipo: 'garca', x: p.x, y: p.y - p.r * .4, sd: Math.floor(q() * 1e6) }));
    for(let x = 700 + q() * 400; x < W - 200; x += 1300 + q() * 600){ const c = colEm(x); R.bichos.push({ tipo: 'garca', x: Math.round(x), y: c.b + 6, sd: Math.floor(q() * 1e6) }); }
    K.zonas.push({ nome: 'Rio Tibagi', x: 0, y: y0 + 14, w: W, h: RIO_H - 14 });
    return R;
  }
  /* o barco (como o boneco) é desenhado em pontos da tela: no mundo, o tamanho dele muda com o zoom. Por isso a vaga do
     amarrado e a do barco de quem sai remando são contadas na hora, encostadas no píer */
  const amarradoXY = a => ({ x: a.p.x - 20 / V.k - 3, y: a.p.t + a.dy, lado: a.lado });
  const naRio = (x, y) => { const r = V.cid && V.cid.rio; if(!r || y < r.y0 + 20) return false; if(y <= r.colEm(x).t + 6) return false; for(const p of r.piers) if(x > p.x + 4 && x < p.x + p.w - 4 && y > p.y && y < p.y + p.h) return false; return true; };
  const zonaDe = (x, y) => { const c = V.cid, z = c.zonas.find(z => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h); if(z) return z.nome; return bairro(clamp(Math.floor((x - RUA / 2) / (LW + RUA)), 0, COLS - 1), clamp(Math.floor((y - TOPO + RUA / 2) / (LH + RUA)), 0, c.rows - 1)); };
  const naAgua = (x, y) => { const l = V.cid.lago; if(!l || x < l.x0 || x >= l.x1) return false; const c = l.cols[Math.floor((x - l.x0) / l.B)]; if(!c || y <= c.t + 6 || y >= c.b - 2) return false; for(const s of l.secos) if(x > s.x + 4 && x < s.x + s.w - 4 && y > s.y && y < s.y + s.h) return false; return true; };

  /* ---------- colisão e portas ---------- */
  function solidos(){
    const S = [], c = V.cid;
    c.casas.forEach(h => S.push({ x: h.x, y: h.base - 34, w: h.w, h: 34 }));
    if(c.dois){ const d = c.dois; S.push({ x: d.x + 10, y: d.base - 40, w: 280, h: 40 }, { x: d.x + LW + RUA + 10, y: d.base - 40, w: 300, h: 40 }); }
    const pr = c.praca; S.push({ x: pr.x + 30, y: pr.y + 140, w: 110, h: 16 }, { x: pr.x + LW - 112, y: pr.y + 150, w: 88, h: 26 });
    const ce = c.centro;
    S.push({ x: ce.teatro.x + 30, y: ce.teatro.base - 34, w: 240, h: 34 }, { x: ce.concha.x + 40, y: ce.concha.base - 34, w: 220, h: 34 }, { x: ce.catedral.x + 50, y: ce.catedral.base - 40, w: 200, h: 40 }, { x: ce.museu.x + 20, y: ce.museu.base - 36, w: 260, h: 36 }, { x: ce.arte.x + 20, y: ce.arte.base - 30, w: 260, h: 30 });
    if(ce.aquario) S.push({ x: ce.aquario.x + 20, y: ce.aquario.base - 36, w: 260, h: 36 });
    ['delegacia', 'bombeiros', 'hospital'].forEach(k => { if(ce[k]) S.push({ x: ce[k].x + 20, y: ce[k].base - 36, w: 260, h: 36 }); });
    c.arv.forEach(a => { if(!a.ilha && !a.mata) S.push({ x: a.x - 5, y: a.y - 6, w: 10, h: 8 }); });
    if(c.feira) c.feira.barracas.filter(paraMim).forEach(b => S.push({ x: b.x - 44, y: b.base - 22, w: 88, h: 22 }));
    return S.concat(c.sol);
  }
  function portas(){
    const c = V.cid, P = c.casas.map(h => ({ x: h.portaX, y: h.base + 8, tipo: 'casa', c: h }));
    if(c.dois){ const d = c.dois; P.push({ x: d.portaX, y: d.base + 8, tipo: 'casa', c: d, dois: true }); }
    const pr = c.praca; P.push({ x: pr.x + 85, y: pr.y + 168, tipo: 'mural' }, { x: pr.x + LW - 68, y: pr.y + 190, tipo: 'banca' });
    c.vazios.forEach(o => P.push({ x: o.x + LW / 2, y: o.y + LH - 40, tipo: 'lote' }));
    c.vazios.forEach(o => P.push({ x: o.x + LW / 2, y: o.y + LH * .55 + 14, tipo: 'publi', k: 'nexwin' }));
    if(c.feira) c.feira.barracas.filter(paraMim).forEach(b => P.push({ x: b.x, y: b.base + 10, tipo: 'barraca', b }));
    c.bancos.forEach(b => P.push({ x: b.x, y: b.y + 4, tipo: 'banco', b, pesca: /^(Píer|Deck) do Igapó$/.test(b.lugar || '') }));
    /* v3.51: toda quadra tem a entrada do desafio 3D, no canto de baixo à esquerda (o meio é da bola) */
    quadrasDaCidade(c).forEach(q => P.push({ x: q.x + 16, y: q.y + q.h - 10, tipo: 'quadra', k: q.tipo === 'futsal' ? 'quadra-futsal' : 'quadra-basquete' }));
    /* v3.50: as largadas das corridas (moto no Estádio do Café, patinete no Zerão) */
    if(c.estadio && c.estadio.largada) P.push({ x: c.estadio.largada.x, y: c.estadio.largada.y, tipo: 'pista', k: 'moto' });
    if(c.zerao && c.zerao.largada) P.push({ x: c.zerao.largada.x, y: c.zerao.largada.y, tipo: 'pista', k: 'patinete' });
    /* v3.49: no começo do Píer do Igapó, a entrada do Torneio de Pesca */
    if(c.torneio) P.push({ x: c.torneio.x, y: c.torneio.y, tipo: 'torneio' });
    /* v3.48: a porta do Sebo entra no Sebo (os caixotes de disco) */
    c.enche.forEach(f => { if(f.t === 'loja') f.lojas.forEach((l, i) => { if(l.nome === 'SEBO') P.push({ x: portaLoja(f, i), y: f.base + 8, tipo: 'sebo' }); else if(l.nome === 'ATELIE') P.push({ x: portaLoja(f, i), y: f.base + 8, tipo: 'atelie' }); }); });
    /* v3.77: no meio do Calçadão, a entrada do Calçadão em 3D */
    if(c.centro.praca) P.push({ x: c.centro.praca.x + LW / 2, y: c.centro.praca.y + LH / 2 + 46, tipo: 'calcadao' });
    /* v3.75: na ponta de cada píer do Tibagi, o barquinho */
    if(c.rio) c.rio.piers.forEach(pr => P.push({ x: pr.ponta.x, y: pr.ponta.y, tipo: 'barco', k: pr.k, pier: pr }));
    /* o aquário: na porta, o jogo */
    if(c.centro.aquario) P.push({ x: c.centro.aquario.x + LW / 2, y: c.centro.aquario.base + 8, tipo: 'aquario', jogo: 'killer' });
    /* v3.40: o embarque do aeroporto */
    if(c.aeroporto) P.push({ x: c.aeroporto.porta.x, y: c.aeroporto.porta.y, tipo: 'aeroporto' });
    /* v3.57: a ACEL tem duas entradas pro campo 3D: o portal e a casa (onde se rebate) */
    if(c.acel) P.push({ x: c.acel.porta.x, y: c.acel.porta.y, tipo: 'beisebol' }, { x: c.acel.casa.x, y: c.acel.casa.y, tipo: 'beisebol' });
    /* v3.82: no Parque Arthur Thomas, a Jaula dos Macacos (o Elo Perdido) e as placas de ler */
    if(c.arthur){ const a = c.arthur; P.push({ x: a.jaula.x, y: a.jaula.base + 14, tipo: 'jogo', jogo: 'elo' }); a.placas.forEach(o => P.push({ x: o.x, y: o.y + 6, tipo: 'placa', titulo: o.titulo, txt: o.txt })); }
    /* v3.87: no Natal, a placa do Papai Noel do Igapó (os números são os do de verdade) */
    const np = c.lago && c.lago.noel && c.lago.noel.placa, nfo = c.lago && c.lago.noel && c.lago.noel.foto;
    /* v4.03: a barraquinha da foto, de frente pro Papai Noel */
    if(nfo && natal()) P.push({ x: nfo.x, y: nfo.y + 10, tipo: 'polaroid' });
    if(np && natal()) P.push({ x: np.x, y: np.y + 6, tipo: 'placa', noel: true, titulo: 'O maior Papai Noel do mundo', txt: '27 metros, 15 toneladas e uns 450 mil pontos de LED, em pé numa balsa presa por quatro âncoras no Lago Igapó 2. Acendeu em 30/11/2025, no LondriNatal, e o Guinness confirmou o recorde em 5/12 (o de antes era de Águeda, em Portugal, com 21 m).' });
    /* a Delegacia, o quartel e o Hospital: na porta, o trampo de cada uniforme */
    ['delegacia', 'bombeiros', 'hospital'].forEach(k => { if(c.centro[k]) P.push({ x: c.centro[k].x + LW / 2, y: c.centro[k].base + 8, tipo: 'civico', k }); });
    /* comida: trucks do Zerão e quiosques do lago */
    c.trucks.forEach(tr => { const k = COMIDA_DE[tr.nome]; if(k) P.push({ x: tr.x, y: tr.base + 10, tipo: 'comida', k, nome: tr.nome }); });
    c.quiosques.forEach(q => { const k = COMIDA_DE[q.nome]; if(k) P.push({ x: q.x, y: q.base + 14, tipo: 'comida', k, nome: q.nome }); });
    return P;
  }
  /* as quadras da cidade (as do Zerão e as dos bairros), cada uma com a sua bola */
  const quadrasDaCidade = c => [...(c.zerao && c.zerao.quadras ? c.zerao.quadras : []), ...c.enche.filter(f => f.court).map(f => f.court)];
  const novasBolas = c => quadrasDaCidade(c).map(q => ({ q, x: q.x + q.w / 2, y: q.y + q.h / 2, vx: 0, vy: 0, rot: 0, gol: 0, chute: 0 }));
  /* a bola: quem anda nela chuta (na direção que ia); quica nas linhas; no futsal, entrou na meta = gol; na cesta, passou pela tabela = ponto */
  function bolas(dt){
    const agora = Date.now();
    (V.bolas || []).forEach(b => {
      const q = b.q, futsal = q.tipo === 'futsal';
      if(b.gol){ if(agora - b.gol > 1100){ b.gol = 0; b.x = q.x + q.w / 2; b.y = q.y + q.h / 2; b.vx = b.vy = 0; } return; }
      const chuta = (o, eu) => { if(!o || o.sit || !o.mov) return; const d = Math.hypot(b.x - o.x, b.y - (o.y - 3)); if(d > 13 || agora - b.chute < 180) return; const ang = Math.atan2(b.y - (o.y - 3), b.x - o.x), sp = futsal ? 250 : 210; b.vx = Math.cos(ang) * sp; b.vy = Math.sin(ang) * sp; b.chute = agora; b.meu = !!eu; };
      chuta(V.eu, true);
      /* v3.55: quem você bloqueou não mexe na tua bola */
      for(const r of V.remotos.values()){ if(bloqueado(r) || (!r.bot && Math.hypot(r.x - b.x, r.y - b.y) > 60)) continue; chuta(r, false); }
      const v = Math.hypot(b.vx, b.vy); if(v < 2){ b.vx = b.vy = 0; return; }
      const f = Math.max(0, 1 - (futsal ? 1.6 : 2.1) * dt); b.vx *= f; b.vy *= f;
      b.x += b.vx * dt; b.y += b.vy * dt; b.rot += v * dt / 6;
      const m = 7, cy = q.y + q.h / 2;
      /* a meta do futsal (no meio das laterais curtas) e a cesta do basquete (perto da tabela) */
      if(futsal && Math.abs(b.y - cy) < (q.campo ? 18 : 15) && ((b.x <= q.x + m && b.vx < 0) || (b.x >= q.x + q.w - m && b.vx > 0))){ b.gol = agora; if(b.meu){ falaAuto(4); V.gols = (V.gols || 0) + 1; } return; }
      if(!futsal && Math.abs(b.y - (cy + 4)) < 9 && ((b.x <= q.x + 16 && b.x >= q.x + 8 && b.vx < 0) || (b.x >= q.x + q.w - 16 && b.x <= q.x + q.w - 8 && b.vx > 0)) && v > 90){ b.gol = agora; if(b.meu) falaAuto(5); return; }
      if(b.x < q.x + m){ b.x = q.x + m; b.vx = -b.vx * .62; } else if(b.x > q.x + q.w - m){ b.x = q.x + q.w - m; b.vx = -b.vx * .62; }
      if(b.y < q.y + m){ b.y = q.y + m; b.vy = -b.vy * .62; } else if(b.y > q.y + q.h - m){ b.y = q.y + q.h - m; b.vy = -b.vy * .62; }
    });
  }
  /* v3.52 · a bola da quadra: redonda de verdade, com luz (o brilho em cima à esquerda), os gomos do futsal ou a
     costura do basquete girando com ela, e a sombra que encolhe quando ela sobe */
  function desenhaBola(ctx, b){
    const futsal = b.q.tipo === 'futsal', r = futsal ? 5 : 5.5, u = 1 / escala(ctx);
    const alt = b.gol ? Math.sin(Math.min(1, (Date.now() - b.gol) / 1100) * Math.PI) * 10 : 0, x = b.x, y = b.y - 4 - alt;
    ctx.fillStyle = `rgba(15,18,24,${.3 - alt * .012})`; ctx.beginPath(); ctx.ellipse(x, b.y + 2, r + 1 - alt * .15, 2.6 - alt * .06, 0, 0, Math.PI * 2); ctx.fill();
    const base = futsal ? '#F4F3EF' : '#E3732E', g = ctx.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r);
    g.addColorStop(0, futsal ? '#FFFFFF' : '#F59A5A'); g.addColorStop(.6, base); g.addColorStop(1, futsal ? '#B9BCC4' : '#A9471B');
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.clip();
    if(futsal){
      /* os gomos pretos, um no meio e cinco em volta, girando */
      ctx.fillStyle = '#23252C';
      const gomo = (cx, cy, rr, a0) => { ctx.beginPath(); for(let i = 0; i < 5; i++){ const a = a0 + i * Math.PI * .4; ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); };
      gomo(x + Math.cos(b.rot) * 1.2, y + Math.sin(b.rot) * .8, r * .3, b.rot);
      for(let i = 0; i < 5; i++){ const a = b.rot + i * Math.PI * .4; gomo(x + Math.cos(a) * r * .86, y + Math.sin(a) * r * .86, r * .26, a + Math.PI); }
    } else {
      /* a costura: duas linhas que cruzam e as curvas dos lados */
      ctx.strokeStyle = '#2A160C'; ctx.lineWidth = Math.max(u, .7);
      ctx.translate(x, y); ctx.rotate(b.rot); ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.stroke();
      ctx.beginPath(); ctx.arc(-r * 1.25, 0, r * .85, -1, 1); ctx.stroke(); ctx.beginPath(); ctx.arc(r * 1.25, 0, r * .85, Math.PI - 1, Math.PI + 1); ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.strokeStyle = INK; ctx.lineWidth = Math.max(u, .8); ctx.stroke();
  }
  const bate = (x, y) => { if(x < 14 || y < TOPO - 70 || x > V.cid.W - 14 || y > V.cid.H - 14) return true; if(naAgua(x, y) || naRio(x, y) || naParque(x, y)) return true; for(const s of V.sol) if(x > s.x - 8 && x < s.x + s.w + 8 && y > s.y && y < s.y + s.h + 4) return true; return false; };
  function mover(o, dx, dy){ if(!dx && !dy) return; if(!bate(o.x + dx, o.y)) o.x += dx; if(!bate(o.x, o.y + dy)) o.y += dy; }

  /* ---------- desenho do chão ---------- */
  const sn = v => Math.round(v * V.k) / V.k;
  const h2 = (x, y) => { let n = Math.imul(x | 0, 374761393) ^ Math.imul((y | 0) + 7919, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  /* capim e florzinha no gramado seco */
  function capim(ctx, R, vx, vy, vw, vh){
    const x0 = Math.max(R.x, vx - 10), x1 = Math.min(R.x + R.w, vx + vw + 10), y0 = Math.max(R.y, vy - 10), y1 = Math.min(R.y + R.h, vy + vh + 10);
    if(x0 >= x1 || y0 >= y1) return;
    const u = 1 / V.k, S = 30;
    for(let gy = Math.floor(y0 / S) * S; gy < y1; gy += S) for(let gx = Math.floor(x0 / S) * S; gx < x1; gx += S){
      const h = h2(gx, gy); if(h > .45) continue;
      const x = sn(gx + h2(gy, gx) * S), y = sn(gy + h2(gx + 7, gy + 3) * S);
      if(x < R.x + 4 || x > R.x + R.w - 8 || y < R.y + 6 || y > R.y + R.h - 4) continue;
      if(h < .04){ ctx.fillStyle = h < .02 ? '#F4F1EA' : h < .03 ? ROSA : AMARELO; ctx.fillRect(x, y, u, u); ctx.fillRect(x - u, y + u, u * 3, u); continue; }
      ctx.fillStyle = '#B49A55'; ctx.fillRect(x, y, u, u * 2); ctx.fillRect(x + u * 2, y - u, u, u * 3); if(h > .25) ctx.fillRect(x - u * 2, y + u, u, u);
    }
  }
  /* oval em blocos (nada de curva lisa) */
  function oval(ctx, cx, cy, rx, ry, m){ const B = 12; ctx.fillStyle = pad(ctx, m); for(let x = Math.floor((cx - rx) / B) * B; x < cx + rx; x += B){ const dx = (x + B / 2 - cx) / rx; if(Math.abs(dx) >= 1) continue; const h = ry * Math.sqrt(1 - dx * dx), t = Math.round((cy - h) / B) * B, b = Math.round((cy + h) / B) * B; if(b > t) ctx.fillRect(x, t, B, b - t); } }
  function linhas(ctx, x, y, w, h){ const L = Math.max(2, 1.05 / V.k); ctx.fillRect(x, y, w, L); ctx.fillRect(x, y + h - L, w, L); ctx.fillRect(x, y, L, h); ctx.fillRect(x + w - L, y, L, h); }
  function quadraChao(ctx, q){
    const L = Math.max(2, 1.05 / V.k), cx = q.x + q.w / 2, cy = q.y + q.h / 2;
    /* v3.76 · o campo de futebol do Zerão: grama em faixas, as linhas, o círculo, as duas áreas, a marca do pênalti e as traves */
    if(q.campo){
      /* a grama do campo é palha mais escura que a do parque (senão o campo some), com as faixas do corte */
      ctx.fillStyle = pad(ctx, '#C4A25A'); ctx.fillRect(q.x, q.y, q.w, q.h);
      ctx.fillStyle = 'rgba(255,236,170,.22)'; for(let x = q.x + 8; x < q.x + q.w - 8; x += 32) ctx.fillRect(x, q.y + 8, 16, q.h - 16);
      ctx.beginPath(); ctx.rect(q.x, q.y, q.w, q.h); traco(ctx, '#9C7C3A', 2);
      ctx.fillStyle = '#F4F3EF'; linhas(ctx, q.x + 8, q.y + 8, q.w - 16, q.h - 16); ctx.fillRect(cx - L / 2, q.y + 8, L, q.h - 16);
      for(let a = 0; a < 36; a++){ const an = a / 36 * Math.PI * 2; ctx.fillRect(sn(cx + Math.cos(an) * 26), sn(cy + Math.sin(an) * 26), L, L); }
      ctx.fillRect(cx - L, cy - L, L * 2, L * 2);
      [1, -1].forEach(l => { const xg = l > 0 ? q.x + 8 : q.x + q.w - 8, dir = l; linhas(ctx, dir > 0 ? xg : xg - 40, cy - 46, 40, 92); linhas(ctx, dir > 0 ? xg : xg - 16, cy - 24, 16, 48); ctx.fillRect(xg + dir * 28 - L, cy - L, L * 2, L * 2); });
      ctx.fillStyle = '#E6E9EE'; linhas(ctx, q.x - 6, cy - 18, 14, 36); linhas(ctx, q.x + q.w - 8, cy - 18, 14, 36);
      ctx.fillStyle = 'rgba(244,243,239,.35)'; for(let y = cy - 16; y < cy + 16; y += 4){ ctx.fillRect(q.x - 6, y, 12, L / 2); ctx.fillRect(q.x + q.w - 6, y, 12, L / 2); }
      pixPlaca(ctx, 'DESAFIO', q.x + 30, q.y + q.h - 16, { fundo: AMARELO, cor: INK, max: 10 });
      return;
    }
    ctx.fillStyle = pad(ctx, q.tipo === 'futsal' ? '#3D6FB6' : '#C8643B'); ctx.fillRect(q.x, q.y, q.w, q.h);
    ctx.fillStyle = '#F4F3EF'; linhas(ctx, q.x + 6, q.y + 6, q.w - 12, q.h - 12); ctx.fillRect(cx - L / 2, q.y + 6, L, q.h - 12);
    const rr = Math.min(q.w, q.h) * .16; for(let a = 0; a < 28; a++){ const an = a / 28 * Math.PI * 2; ctx.fillRect(sn(cx + Math.cos(an) * rr), sn(cy + Math.sin(an) * rr), L, L); }
    const ah = q.h * .44, aw = q.w * .14; linhas(ctx, q.x + 6, cy - ah / 2, aw, ah); linhas(ctx, q.x + q.w - 6 - aw, cy - ah / 2, aw, ah);
    if(q.tipo === 'futsal'){ ctx.fillStyle = '#E6E9EE'; linhas(ctx, q.x - 6, cy - 16, 12, 32); linhas(ctx, q.x + q.w - 6, cy - 16, 12, 32); }
    /* v3.51: a plaquinha do desafio, no canto onde fica a entrada da quadra 3D */
    pixPlaca(ctx, 'DESAFIO', q.x + 30, q.y + q.h - 16, { fundo: AMARELO, cor: INK, max: 10 });
  }
  function chao(ctx, vx, vy, vw, vh){
    const c = V.cid, { W, rows } = c;
    ctx.fillStyle = pad(ctx, 'rua'); ctx.fillRect(vx, vy, vw, vh);
    if(vy < TOPO){ const g = ctx.createLinearGradient(0, TOPO - RUA - 500, 0, TOPO - RUA); g.addColorStop(0, '#5C9BC4'); g.addColorStop(1, '#A9CBE2'); ctx.fillStyle = g; ctx.fillRect(vx, Math.min(vy, 0) - 400, vw, TOPO - RUA + 400 - Math.min(vy, 0));
      const r = rng(77), u = 1 / V.k; for(let x = 0; x < W; x += 34 + Math.floor(r() * 30)){ const h = 60 + r() * 140, w = 26 + r() * 20; if(x > vx + vw || x + w < vx){ for(let i = 0; i < 12; i++) r(); continue; } ctx.fillStyle = '#7F98B3'; ctx.fillRect(x, TOPO - RUA - h, w, h); ctx.fillStyle = 'rgba(255,255,255,.28)'; for(let yy = TOPO - RUA - h + 8; yy < TOPO - RUA - 10; yy += 12) for(let xx = x + 5; xx < x + w - 5; xx += 9) if(r() < .5) ctx.fillRect(xx, yy, 2 * u, 2 * u); }
      ctx.fillStyle = pad(ctx, 'calcada'); ctx.fillRect(0, TOPO - RUA - 6, W, 10); }
    ctx.fillStyle = 'rgba(242,236,84,.85)'; const t = Math.max(3, 1.05 / V.k);
    for(let s = 0; s <= rows; s++){ const y = ruaY(s); if(y < vy - 10 || y > vy + vh + 10) continue; for(let x = Math.floor(Math.max(vx, 0) / 36) * 36; x < Math.min(vx + vw, W); x += 36) ctx.fillRect(x, y - t / 2, 18, t); }
    for(let i = 0; i <= COLS; i++){ const x = ruaX(i); if(x < vx - 10 || x > vx + vw + 10) continue; for(let y = Math.floor(Math.max(vy, TOPO - RUA) / 36) * 36; y < Math.min(vy + vh, c.rio ? c.rio.y0 - 18 : c.H); y += 36) ctx.fillRect(x - t / 2, y, t, 18); }
    const P = LW + RUA, Q = LH + RUA;
    const c0 = clamp(Math.floor((vx - RUA) / P), 0, COLS - 1), c1 = clamp(Math.floor((vx + vw) / P), 0, COLS - 1), r0 = clamp(Math.floor((vy - TOPO) / Q) - 1, 0, rows - 1), r1 = clamp(Math.floor((vy + vh - TOPO) / Q) + 1, 0, rows - 1);
    for(let r = r0; r <= r1; r++) for(let cc = c0; cc <= c1; cc++){
      const g = c.grade[r][cc]; if(g && g.t === 'reg') continue;
      const o = lotXY(cc, r);
      ctx.fillStyle = pad(ctx, 'calcada'); ctx.fillRect(o.x - CALC, o.y - CALC, LW + CALC * 2, LH + CALC * 2);
      chaoLote(ctx, g, o, vx, vy, vw, vh);
    }
    c.regs.forEach(R => { if(R.x - CALC > vx + vw || R.x + R.w + CALC < vx || R.y - CALC > vy + vh || R.y + R.h + CALC < vy) return; ctx.fillStyle = pad(ctx, 'calcada'); ctx.fillRect(R.x - CALC, R.y - CALC, R.w + CALC * 2, R.h + CALC * 2); CHAO[R.k](ctx, R, vx, vy, vw, vh); });
    if(c.rio) chaoRio(ctx, vx, vy, vw, vh);
  }
  function chaoLote(ctx, g, o, vx, vy, vw, vh){
    const t = g ? g.t : '', R = { x: o.x, y: o.y, w: LW, h: LH }, cx = o.x + LW / 2, cy = o.y + LH / 2;
    const chapa = m => { ctx.fillStyle = pad(ctx, m); ctx.fillRect(o.x, o.y, LW, LH); };
    if(t === 'dois') return chapa('dois');
    if(t === 'centro') return chapa(g.k === 'praca' ? 'mosaico' : 'praca');
    if(t !== 'enche') return chapa('lote');
    const f = g.f;
    switch(f.t){
      case 'pracinha': chapa('gramado'); capim(ctx, R, vx, vy, vw, vh); ctx.fillStyle = pad(ctx, 'praca'); ctx.fillRect(cx - 18, o.y, 36, LH); ctx.fillRect(o.x, cy - 18, LW, 36); oval(ctx, cx, cy + 4, 62, 50, 'praca'); break;
      case 'bosquinho': chapa('gramado'); capim(ctx, R, vx, vy, vw, vh); ctx.fillStyle = pad(ctx, 'terra'); ctx.fillRect(cx - 14, cy, 28, LH / 2); break;
      case 'quadra': { chapa('concreto'); const q = f.court, L = Math.max(2, 1.05 / V.k); quadraChao(ctx, q); ctx.fillStyle = '#7C838C'; linhas(ctx, q.x - 14, q.y - 14, q.w + 28, q.h + 28); for(let x = q.x - 14; x <= q.x + q.w + 14; x += 36){ ctx.fillRect(x, q.y - 17, L * 1.5, L * 1.5); ctx.fillRect(x, q.y + q.h + 12, L * 1.5, L * 1.5); } break; }
      case 'feira': chapa('praca'); break;
      default: chapa('lote');
    }
  }
  const CHAO = {
    /* a Feira: piso de praça e o corredor no mosaico do Calçadão */
    feira(ctx, R){
      ctx.fillStyle = pad(ctx, 'praca'); ctx.fillRect(R.x, R.y, R.w, R.h);
      ctx.fillStyle = pad(ctx, 'mosaico'); ctx.fillRect(R.x, R.y + 134, R.w, 82);
    },
    lago(ctx, R, vx, vy, vw, vh){
      const l = V.cid.lago, B = l.B, a = vx - B, b = vx + vw + B;
      ctx.fillStyle = pad(ctx, 'gramado'); ctx.fillRect(R.x, R.y, R.w, R.h); capim(ctx, R, vx, vy, vw, vh);
      l.bandas.forEach(([m, cols]) => { ctx.fillStyle = pad(ctx, m); cols.forEach(c => { if(c.x > a && c.x < b) ctx.fillRect(c.x, c.t, B, c.b - c.t); }); });
      ctx.fillStyle = pad(ctx, 'agua'); l.cols.forEach(c => { if(c.x > a && c.x < b) ctx.fillRect(c.x, c.t, B, c.b - c.t); });
      ctx.fillStyle = 'rgba(15,40,80,.32)'; l.cols.forEach(c => { if(c.x > a && c.x < b) ctx.fillRect(c.x, c.t, B, 8); });
      if(l.ilha){ ctx.fillStyle = pad(ctx, 'concreto'); l.ilha.cols.forEach(c => ctx.fillRect(c.x, c.t - 6, B, c.b - c.t + 10)); ctx.fillStyle = pad(ctx, 'gramado'); l.ilha.cols.forEach(c => ctx.fillRect(c.x, c.t, B, c.b - c.t)); }
    },
    zerao(ctx, R, vx, vy, vw, vh){
      const z = V.cid.zerao, u = 1 / V.k;
      ctx.fillStyle = pad(ctx, 'gramado'); ctx.fillRect(R.x, R.y, R.w, R.h); capim(ctx, R, vx, vy, vw, vh);
      ctx.fillStyle = pad(ctx, 'praca'); ctx.fillRect(z.cx - 22, R.y, 44, R.h);
      oval(ctx, z.cx, z.cy, z.rx, z.ry, 'terra'); oval(ctx, z.cx, z.cy, z.rx - 38, z.ry - 38, 'gramado');
      capim(ctx, { x: z.cx - z.rx * .6, y: z.cy - z.ry * .6, w: z.rx * 1.2, h: z.ry * 1.2 }, vx, vy, vw, vh);
      ctx.fillStyle = '#F4F3EF'; for(let i = 0; i < 140; i += 2){ const an = i / 140 * Math.PI * 2; ctx.fillRect(sn(z.cx + Math.cos(an) * (z.rx - 19)), sn(z.cy + Math.sin(an) * (z.ry - 19)), u * 2, u * 2); }
      z.quadras.forEach(q => quadraChao(ctx, q));
      ctx.fillStyle = pad(ctx, '#E8D29A'); ctx.fillRect(z.areia.x, z.areia.y, z.areia.w, z.areia.h); ctx.beginPath(); ctx.rect(z.areia.x, z.areia.y, z.areia.w, z.areia.h); traco(ctx, '#B89A5A', 2);
      pistaSkate(ctx, z);
      placaLargada(ctx, z.largada, 'PATINETE');
    },
    bosque(ctx, R, vx, vy, vw, vh){
      const b = V.cid.bosque;
      ctx.fillStyle = pad(ctx, 'gramado'); ctx.fillRect(R.x, R.y, R.w, R.h); capim(ctx, R, vx, vy, vw, vh);
      ctx.fillStyle = pad(ctx, 'terra'); ctx.fillRect(b.cx - 24, R.y, 48, R.h); ctx.fillRect(R.x, b.cy - 24, R.w, 48);
      oval(ctx, b.cx, b.cy, b.anel + 26, b.anel + 26, 'terra'); oval(ctx, b.cx, b.cy, b.anel - 26, b.anel - 26, 'gramado');
      capim(ctx, { x: b.cx - 70, y: b.cy - 70, w: 140, h: 140 }, vx, vy, vw, vh);
    },
    gleba(ctx, R){
      const g = V.cid.glebaR; ctx.fillStyle = pad(ctx, 'praca'); ctx.fillRect(R.x, R.y, R.w, R.h);
      ctx.fillStyle = pad(ctx, 'gramado'); g.torres.forEach((t, i) => { if(i < g.torres.length - 1) ctx.fillRect(t.x + t.w + 8, g.base - 30, 54, 44); });
    },
    estadio(ctx, R){
      const e = V.cid.estadio, c = e.campo, L = Math.max(2, 1.05 / V.k), fim = e.fy + e.fh, sul = c.y + c.h;
      ctx.fillStyle = pad(ctx, 'concreto'); ctx.fillRect(R.x, R.y, R.w, R.h);
      const fileiras = (x, y, w, h, vert) => { ctx.fillStyle = pad(ctx, 'concreto'); ctx.fillRect(x, y, w, h); for(let i = 0; i < (vert ? w : h) - 4; i += 10){ ctx.fillStyle = Math.floor(i / 10) % 3 === 2 ? '#EEEBE4' : '#2E5BFF'; if(vert) ctx.fillRect(x + i + 2, y + 2, 6, h - 4); else ctx.fillRect(x + 2, y + i + 2, w - 4, 6); } };
      fileiras(e.fx, c.y, c.x - e.fx, fim - c.y, true); fileiras(c.x + c.w, c.y, e.fx + e.fw - c.x - c.w, fim - c.y, true); fileiras(c.x, sul, c.w, fim - sul, false);
      ctx.fillStyle = pad(ctx, 'praca'); ctx.fillRect(R.x, e.portao.y, c.x - R.x, e.portao.h); ctx.fillRect(c.x + c.w, e.portao.y, R.x + R.w - c.x - c.w, e.portao.h);
      ctx.fillStyle = pad(ctx, 'gramado'); ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.fillStyle = 'rgba(120,90,30,.12)'; for(let x = c.x; x < c.x + c.w; x += 56) ctx.fillRect(x, c.y, 28, c.h);
      ctx.fillStyle = '#F4F3EF'; linhas(ctx, c.x + 14, c.y + 14, c.w - 28, c.h - 28); ctx.fillRect(c.x + c.w / 2 - L / 2, c.y + 14, L, c.h - 28);
      const cx = c.x + c.w / 2, cy = c.y + c.h / 2; for(let a = 0; a < 44; a++){ const an = a / 44 * Math.PI * 2; ctx.fillRect(sn(cx + Math.cos(an) * 48), sn(cy + Math.sin(an) * 48), L, L); }
      const ah = c.h * .5, aw = c.w * .13; linhas(ctx, c.x + 14, cy - ah / 2, aw, ah); linhas(ctx, c.x + c.w - 14 - aw, cy - ah / 2, aw, ah);
      ctx.fillStyle = '#E6E9EE'; linhas(ctx, c.x + 2, cy - 22, 12, 44); linhas(ctx, c.x + c.w - 14, cy - 22, 12, 44);
      placaLargada(ctx, e.largada, 'CORRIDA');
    },
    /* v3.40 · o aeroporto: grama seca, o pátio de concreto, a pista com as faixas, a cabeceira e as luzes */
    aeroporto(ctx, R, vx, vy, vw, vh){
      const a = V.cid.aeroporto, L = Math.max(2, 1.05 / V.k); if(!a) return;
      ctx.fillStyle = pad(ctx, 'gramado'); ctx.fillRect(R.x, R.y, R.w, R.h); capim(ctx, R, vx, vy, vw, vh);
      ctx.fillStyle = pad(ctx, 'praca'); ctx.fillRect(R.x + 20, a.term.base - 6, a.term.w + 80, 74); ctx.fillRect(a.term.x + a.term.w / 2 - 30, a.term.base + 60, 60, R.y + R.h - a.term.base - 60);
      ctx.fillStyle = pad(ctx, 'concreto'); ctx.fillRect(a.patio.x, a.patio.y, a.patio.w, a.patio.h); ctx.fillRect(a.vaga.x - 34, a.patio.y + a.patio.h, 68, a.pista.y - a.patio.y - a.patio.h);
      ctx.fillStyle = '#F2C230'; ctx.fillRect(a.vaga.x - 1, a.patio.y + 10, L, a.pista.y - a.patio.y - 10); linhas(ctx, a.vaga.x - 40, a.vaga.y - 22, 80, 34);
      const p = a.pista; ctx.fillStyle = pad(ctx, 'rua'); ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = '#F4F3EF'; ctx.fillRect(p.x, p.y + 3, p.w, L); ctx.fillRect(p.x, p.y + p.h - 3 - L, p.w, L);
      for(let x = p.x + 110; x < p.x + p.w - 110; x += 64) ctx.fillRect(x, p.y + p.h / 2 - L / 2, 32, L);
      for(let i = 0; i < 6; i++){ const y = p.y + 9 + i * 7; ctx.fillRect(p.x + 14, y, 46, Math.max(L, 3)); ctx.fillRect(p.x + p.w - 60, y, 46, Math.max(L, 3)); }
      pixTxt(ctx, '09', p.x + 84, p.y + p.h / 2, 2, '#F4F3EF', 'c'); pixTxt(ctx, '27', p.x + p.w - 84, p.y + p.h / 2, 2, '#F4F3EF', 'c');
      ctx.fillStyle = '#F2C230'; for(let x = p.x + 6; x < p.x + p.w; x += 48){ ctx.fillRect(x, p.y - 6, L * 1.5, L * 1.5); ctx.fillRect(x, p.y + p.h + 4, L * 1.5, L * 1.5); }
    },
    /* v3.57 · a ACEL: gramado dourado com o corte em faixas, terra roxa no infield, a cerca, as linhas e a arquibancada */
    acel(ctx, R, vx, vy, vw, vh){
      const a = V.cid.acel; if(!a) return; const L = Math.max(2, 1.05 / V.k), hp = a.hp;
      ctx.fillStyle = pad(ctx, 'gramado'); ctx.fillRect(R.x, R.y, R.w, R.h); capim(ctx, R, vx, vy, vw, vh);
      ctx.save(); ctx.beginPath(); ctx.moveTo(hp.x, hp.y); a.cerca.forEach(p => ctx.lineTo(p.x, p.y)); ctx.closePath(); ctx.clip();
      ctx.fillStyle = 'rgba(120,90,30,.13)'; for(let y = R.y; y < hp.y; y += 48) ctx.fillRect(R.x, y, R.w, 24); ctx.restore();
      ctx.fillStyle = pad(ctx, 'praca'); ctx.fillRect(hp.x - 34, hp.y + 28, 68, R.y + R.h - hp.y - 28);
      ctx.fillStyle = pad(ctx, 'terra'); a.runs[1].forEach(([x, y, h]) => ctx.fillRect(x, y, 8, h));
      ctx.fillStyle = pad(ctx, '#B0603F'); a.runs[2].forEach(([x, y, h]) => ctx.fillRect(x, y, 8, h));
      /* as linhas de falta (pontilhado), as caixas do rebatedor, a casa, o pino do lançador e as bases */
      ctx.fillStyle = '#F4F3EF'; [-1, 1].forEach(l => { for(let d = 6; d < 296; d += 4) ctx.fillRect(sn(hp.x + l * d * Math.SQRT1_2), sn(hp.y - d * Math.SQRT1_2), L, L); });
      linhas(ctx, hp.x - 22, hp.y - 9, 12, 18); linhas(ctx, hp.x + 10, hp.y - 9, 12, 18);
      ctx.fillRect(hp.x - 4, hp.y - 4, 8, 5); ctx.fillRect(hp.x - 2, hp.y + 1, 4, 2); ctx.fillRect(a.monte.x - 4, a.monte.y - 1, 8, L);
      a.bases.forEach(b => { ctx.fillRect(b.x - 3, b.y - 3, 6, 6); });
      /* v3.57: o escudo do Londrina Red Sharks pintado no gramado do meio do campo */
      { const im = logoSharks(); if(im){ const w = 150, h = w * im.naturalHeight / im.naturalWidth; ctx.save(); ctx.imageSmoothingEnabled = true; ctx.globalAlpha = .92; ctx.drawImage(im, hp.x - w / 2, hp.y - 262 - h / 2, w, h); ctx.restore(); } }
      /* a cerca escura com o friso amarelo (por cima de tudo do chão) e os números */
      a.cerca.forEach(p => { ctx.fillStyle = '#2B2F38'; ctx.fillRect(sn(p.x - 5), sn(p.y - 9), 10, 9); ctx.fillStyle = '#F2C230'; ctx.fillRect(sn(p.x - 5), sn(p.y - 10), 10, 2); });
      [[-Math.PI / 4, '36'], [0, '42'], [Math.PI / 4, '36']].forEach(([th, n]) => { const r = a.raio(th) + 1; pixTxt(ctx, n, hp.x + Math.sin(th) * r, hp.y - Math.cos(th) * r - 5, 1, '#F4F3EF', 'c'); });
      /* a arquibancada em fileiras de vermelho e branco, com a torcida em pontinhos, e os bancos de reserva */
      const tor = rng(57);
      a.arq.forEach(q => { ctx.fillStyle = pad(ctx, 'concreto'); ctx.fillRect(q.x, q.y, q.w, q.h);
        for(let i = 0; i < 4; i++){ ctx.fillStyle = i % 2 ? '#EEEBE4' : '#D9452B'; ctx.fillRect(q.x + 2, q.y + 2 + i * 10, q.w - 4, 8); }
        for(let i = 0; i < 4; i++) for(let x = q.x + 6; x < q.x + q.w - 6; x += 7){ const r = tor(); if(r < .45) continue; ctx.fillStyle = [INK, '#5E3A26', '#8D5A3B', AMARELO, ROSA, PAPEL, AZUL][Math.floor(tor() * 7)]; ctx.fillRect(x, q.y + 3 + i * 10, 4, 4); } });
      a.banco.forEach(q => { ctx.fillStyle = '#2B2F38'; ctx.fillRect(q.x, q.y, q.w, q.h); ctx.fillStyle = '#D9452B'; ctx.fillRect(q.x - 2, q.y - 3, q.w + 4, 5); ctx.fillStyle = '#8E5B33'; ctx.fillRect(q.x + 4, q.y + 8, q.w - 8, 5); });
    },
    /* v3.82 · o Parque Arthur Thomas: chão de mata (folha seca), a praça da entrada, os canteiros do Jardim dos
       Sentidos, as clareiras, as trilhas de terra roxa, a margem e a água (o lago com as ilhinhas, o ribeirão, o
       córrego e o poço) e o paredão de basalto do Salto, com as panelas que a água cavou */
    arthur(ctx, R, vx, vy, vw, vh){
      const p = V.cid.arthur; if(!p) return;
      ctx.fillStyle = pad(ctx, '#8E7236'); ctx.fillRect(R.x, R.y, R.w, R.h);
      const fq = rng(82); for(let i = 0; i < 900; i++){ const x = R.x + fq() * R.w, y = R.y + fq() * R.h, c = fq(); if(x < vx - 10 || x > vx + vw + 10 || y < vy - 10 || y > vy + vh + 10) continue; ctx.fillStyle = c < .4 ? '#A8873F' : c < .75 ? '#6F5428' : '#B3793F'; ctx.fillRect(x, y, 3, 2); }
      const pr = p.praca; ctx.fillStyle = pad(ctx, 'praca'); ctx.fillRect(pr.x, pr.y, pr.w, pr.h);
      p.jardim.forEach(j => { ctx.fillStyle = pad(ctx, 'terra'); ctx.fillRect(j.x, j.y, j.w, j.h); const jq = rng(j.x + j.y); for(let k = 0; k < j.w * j.h / 40; k++){ ctx.fillStyle = [ROSA, AMARELO, LILAS, PAPEL, LARANJA][Math.floor(jq() * 5)]; ctx.fillRect(j.x + 3 + jq() * (j.w - 6), j.y + 3 + jq() * (j.h - 6), 3, 3); } });
      p.clareiras.forEach(c => oval(ctx, c.x, c.y, c.rx, c.ry, 'terra'));
      const linha = (pts, w, estilo) => { ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)); ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = estilo; ctx.stroke(); };
      p.trilhas.forEach(t => linha(t.pts, t.w + 6, 'rgba(60,30,10,.22)')); p.trilhas.forEach(t => linha(t.pts, t.w, pad(ctx, 'terra')));
      /* a margem barrenta, depois a água */
      const l = p.lago, po = p.poco, B = l.B, margem = pad(ctx, '#7E3F2A'), agua = pad(ctx, 'agua');
      ctx.fillStyle = margem; l.cols.forEach(c => ctx.fillRect(c.x - 4, c.t - 10, B + 8, c.b - c.t + 20));
      p.riachos.forEach(r => linha(r.pts, r.w + 10, margem));
      ctx.beginPath(); ctx.ellipse(po.x, po.y, po.rx + 6, po.ry + 5, 0, 0, Math.PI * 2); ctx.fillStyle = margem; ctx.fill();
      ctx.fillStyle = agua; l.cols.forEach(c => ctx.fillRect(c.x, c.t, B, c.b - c.t));
      p.riachos.forEach(r => linha(r.pts, r.w, agua));
      ctx.beginPath(); ctx.ellipse(po.x, po.y, po.rx, po.ry, 0, 0, Math.PI * 2); ctx.fillStyle = agua; ctx.fill();
      ctx.fillStyle = 'rgba(15,40,80,.32)'; l.cols.forEach(c => ctx.fillRect(c.x, c.t, B, 8));
      p.ilhas.forEach(i => { ctx.fillStyle = 'rgba(164,85,58,.38)'; ctx.beginPath(); ctx.ellipse(i.x, i.y, i.r * 1.9, i.r * 1.1, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = pad(ctx, '#C9A95E'); ctx.beginPath(); ctx.ellipse(i.x, i.y, i.r, i.r * .62, 0, 0, Math.PI * 2); ctx.fill(); });
      /* o paredão de basalto (as colunas da rocha) e as panelas */
      const s = p.salto; ctx.fillStyle = '#3B3640'; ctx.fillRect(s.x0, s.y0, s.x1 - s.x0, s.y1 - s.y0);
      ctx.fillStyle = '#4E4856'; for(let y = s.y0 + 4, k = 0; y < s.y1 - 4; y += 9, k++) for(let x = s.x0 + (k % 2) * 6; x < s.x1 - 6; x += 14) ctx.fillRect(x, y, 10, 4);
      ctx.fillStyle = '#26222A'; ctx.fillRect(s.x0, s.y1 - 4, s.x1 - s.x0, 4); [[-30, 16], [26, 30], [-14, 40]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.ellipse(s.x + dx, s.y0 + dy, 5, 3, 0, 0, Math.PI * 2); ctx.fill(); });
    },
  };
  /* a água mexendo, o chafariz e os pedalinhos */
  function aguaViva(ctx, t, vx, vy, vw, vh){
    const l = V.cid.lago; if(!l || l.y > vy + vh || l.y + l.h < vy) return;
    const u = 1 / V.k, r = rng(9), span = l.x1 - l.x0;
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    for(let i = 0; i < 220; i++){ const x = l.x0 + ((r() * span + t * (8 + r() * 10)) % span), c = l.cols[Math.floor((x - l.x0) / l.B)], yr = r(); if(!c || x < vx - 20 || x > vx + vw + 20) continue; const y = c.t + 12 + yr * Math.max(1, c.b - c.t - 24); if(Math.sin(t * 2 + i) > .2) ctx.fillRect(sn(x), sn(y), u * (2 + (i % 3)), u); }
    const ch = l.chafariz;
    if(ch && ch.x > vx - 80 && ch.x < vx + vw + 80){
      ctx.fillStyle = pad(ctx, 'concreto'); ctx.fillRect(ch.x - 18, ch.y - 4, 36, 8);
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(sn(ch.x - u), ch.y - 56, u * 2, 52);
      for(let i = 0; i < 18; i++){ const f = (t * .8 + i / 18) % 1, lado = i % 2 ? 1 : -1, x = ch.x + lado * (2 + f * 26), y = ch.y - 56 + f * 52 - Math.sin(f * Math.PI) * 10; ctx.fillRect(sn(x), sn(y), u * 2, u * 2); }
      ctx.fillStyle = 'rgba(255,255,255,.4)'; const rr = 14 + (t * 20) % 14; ctx.fillRect(sn(ch.x - rr), ch.y + 4, rr * 2, u);
    }
    /* v3.87: o reflexo do Papai Noel na água (faixas de vermelho e de luz que tremem) */
    const nn = l.noel;
    if(nn && natal() && nn.x > vx - 700 && nn.x < vx + vw + 700){
      for(let i = 0; i < 7; i++){ const w = 300 - i * 34, dx = Math.sin(t * 2 + i * .9) * 7; ctx.fillStyle = i % 3 === 2 ? 'rgba(255,243,196,.34)' : i % 3 === 1 ? 'rgba(227,169,52,.3)' : 'rgba(212,42,53,.32)'; ctx.fillRect(sn(nn.x - w / 2 + dx), sn(nn.y + 6 + i * 5), w, u); }
      /* o reflexo dourado das árvores de luz e dos presentes */
      nn.agua.forEach(o => { if(o.k === 'cisne') return; const pal = o.k === 'palma'; for(let i = 0; i < (pal ? 6 : 3); i++){ const w = (pal ? 34 : 14) - i * (pal ? 5 : 3), dx = Math.sin(t * 2.2 + i + o.i) * 3; ctx.fillStyle = pal ? 'rgba(255,214,120,.36)' : 'rgba(255,140,100,.3)'; ctx.fillRect(sn(o.x - w / 2 + dx), sn(o.y + 4 + i * 5), w, u); } });
    }
    (l.barcos || []).forEach(b => {
      const s = (b.f + t * b.v) % 2, p = s < 1 ? s : 2 - s, dir = s < 1 ? 1 : -1, x = l.x0 + 160 + p * (span - 320);
      if(x < vx - 60 || x > vx + vw + 60) return;
      const c = l.cols[Math.floor((x - l.x0) / l.B)]; if(!c) return;
      const y = clamp(l.cyF(x) + b.lado * l.hwF(x) * .62, c.t + 30, c.b - 18);
      barco(ctx, x, y, dir, b.cor, t);
    });
  }
  function barco(ctx, x, y, d, cor, t){
    const u = 1 / V.k; x = sn(x); y = sn(y + (Math.sin(t * 2.2 + x * .01) > 0 ? u : 0));
    ctx.fillStyle = 'rgba(15,40,80,.35)'; ctx.fillRect(x - 19, y + u, 38, u * 2);
    ctx.fillStyle = '#F4F3EF'; ctx.fillRect(x - 16, y - 8, 32, 8); ctx.fillStyle = '#C9CED6'; ctx.fillRect(x - 16, y - 3, 32, 3);
    ctx.fillStyle = '#F4F3EF'; ctx.fillRect(d > 0 ? x + 12 : x - 16, y - 20, 4, 12); ctx.fillStyle = LARANJA; ctx.fillRect(d > 0 ? x + 16 : x - 19, y - 19, 3, 3);
    ctx.fillStyle = INK; ctx.fillRect(x - 10, y - 22, 2, 14); ctx.fillRect(x + 6, y - 22, 2, 14); ctx.fillStyle = cor; ctx.fillRect(x - 13, y - 25, 24, 4);
    ctx.fillStyle = '#8D5A3B'; ctx.fillRect(x - 6, y - 15, 4, 7); ctx.fillStyle = '#F1C19B'; ctx.fillRect(x + 1, y - 15, 4, 7);
  }
  /* pontes e píer por cima da água (o pedalinho passa por baixo) */
  /* v3.50: a placa de largada (mastro, bandeira quadriculada e o nome) */
  function placaLargada(ctx, p, txt){
    if(!p) return; ctx.fillStyle = '#121419'; ctx.fillRect(p.x + 24, p.y - 40, 4, 44);
    for(let i = 0; i < 4; i++) for(let j = 0; j < 3; j++){ ctx.fillStyle = (i + j) % 2 ? '#121419' : '#F4F3EF'; ctx.fillRect(p.x + 28 + i * 5, p.y - 40 + j * 5, 5, 5); }
    pixPlaca(ctx, txt, p.x + 26, p.y - 48, { fundo: AMARELO, cor: INK, max: 10 });
  }
  function sobreAgua(ctx, vx, vy, vw, vh){
    const l = V.cid.lago; if(!l) return;
    l.secos.forEach(s => {
      if(s.x > vx + vw || s.x + s.w < vx || s.y > vy + vh || s.y + s.h < vy) return;
      ctx.fillStyle = 'rgba(15,18,24,.3)'; ctx.fillRect(s.x + 4, s.y + 6, s.w, s.h);
      ctx.fillStyle = pad(ctx, 'madeira'); ctx.fillRect(s.x, s.y, s.w, s.h);
      if(s.tipo === 'ponte'){ ctx.fillStyle = pad(ctx, 'concreto'); ctx.fillRect(s.x - 5, s.y, 7, s.h); ctx.fillRect(s.x + s.w - 2, s.y, 7, s.h); ctx.fillStyle = '#121419'; for(let y = s.y + 10; y < s.y + s.h - 6; y += 40){ ctx.fillRect(s.x - 6, y, 9, 7); ctx.fillRect(s.x + s.w - 3, y, 9, 7); }
        /* v3.87: no Natal, o pisca-pisca no guarda-corpo das pontes */
        if(natal()) for(let y = s.y + 6, j = 0; y < s.y + s.h - 4; y += 11, j++){ lampada(ctx, s.x - 3, y, j); lampada(ctx, s.x + s.w + 1, y, j + 4); } }
      else { ctx.fillStyle = '#5A3A22'; for(let y = s.y + 30; y < s.y + s.h; y += 48){ ctx.fillRect(s.x - 4, y, 4, 10); ctx.fillRect(s.x + s.w, y, 4, 10); } }
    });
    /* v3.49: a placa do Torneio de Pesca, no começo do Píer do Igapó */
    const tn = V.cid.torneio;
    if(tn && tn.x > vx - 90 && tn.x < vx + vw + 90 && tn.y > vy - 90 && tn.y < vy + vh + 90){ ctx.fillStyle = '#5A3A22'; ctx.fillRect(tn.x + 30, tn.y - 26, 4, 30); pixPlaca(ctx, 'TORNEIO', tn.x + 32, tn.y - 30, { fundo: AMARELO, cor: INK, max: 10 }); }
  }
  /* ---------- v3.75 · o desenho do Rio Tibagi ----------
     O chão: a margem dourada com capim, a calçada no pé da última rua, a trilha de terra roxa que acompanha a água, a
     prainha, o barranco, a água (mais funda no meio do canal) e o chão da mata do outro lado */
  function chaoRio(ctx, vx, vy, vw, vh){
    const r = V.cid.rio; if(!r || vy + vh < r.y0 || vy > r.y0 + RIO_H) return;
    const B = r.B, x0 = Math.max(0, Math.floor((vx - B) / B) * B), x1 = Math.min(r.W, vx + vw + B), i0 = Math.floor(x0 / B), i1 = Math.min(r.n - 1, Math.ceil(x1 / B)), fim = r.y0 + RIO_H, pr = r.prainha;
    const cada = f => { for(let i = i0; i <= i1; i++) f(r.cols[i]); };
    ctx.fillStyle = pad(ctx, 'gramado'); ctx.fillRect(x0, r.y0, x1 - x0, RIO_H);
    capim(ctx, { x: x0, y: r.y0 + 16, w: x1 - x0, h: RIO_H - 16 }, vx, vy, vw, vh);
    ctx.fillStyle = pad(ctx, 'calcada'); ctx.fillRect(x0, r.y0, x1 - x0, 14); ctx.fillStyle = 'rgba(15,18,24,.22)'; ctx.fillRect(x0, r.y0 + 14, x1 - x0, 2);
    ctx.fillStyle = pad(ctx, '#9C7E3E'); cada(c => ctx.fillRect(c.x, c.b, B, fim - c.b));
    ctx.fillStyle = pad(ctx, 'terra'); cada(c => { if(!(pr && c.x > pr.x0 && c.x < pr.x1)) ctx.fillRect(c.x, c.t - 42, B, 26); });
    if(pr){ ctx.fillStyle = pad(ctx, '#E8D29A'); cada(c => { if(c.x > pr.x0 && c.x < pr.x1) ctx.fillRect(c.x, c.t - 58, B, 60); }); }
    ctx.fillStyle = pad(ctx, '#7E3F2A'); cada(c => { if(!(pr && c.x > pr.x0 && c.x < pr.x1)) ctx.fillRect(c.x, c.t - 10, B, 10); ctx.fillRect(c.x, c.b, B, 10); });
    ctx.fillStyle = pad(ctx, 'agua'); cada(c => ctx.fillRect(c.x, c.t, B, c.b - c.t));
    ctx.fillStyle = 'rgba(12,40,90,.2)'; cada(c => { const xm = c.x + B / 2, cy = r.cyF(xm), hw = r.hwF(xm) * .42; ctx.fillRect(c.x, Math.round((cy - hw) / 4) * 4, B, Math.round(hw * 2 / 4) * 4); });
    ctx.fillStyle = 'rgba(15,40,80,.32)'; cada(c => ctx.fillRect(c.x, c.t, B, 8));
    ctx.fillStyle = 'rgba(255,255,255,.12)'; cada(c => ctx.fillRect(c.x, c.b - 6, B, 6));
    if(pr){ ctx.fillStyle = 'rgba(232,210,154,.4)'; cada(c => { if(c.x > pr.x0 && c.x < pr.x1) ctx.fillRect(c.x, c.t, B, 10); }); }
  }
  /* a correnteza (os tracinhos descem o rio, da esquerda pra direita), as pedras com a corredeira e o rastro dos barcos */
  function aguaRio(ctx, t, vx, vy, vw, vh){
    const r = V.cid.rio; if(!r || vy + vh < r.y0 + 60 || vy > r.y0 + RIO_H) return;
    const u = 1 / V.k, q = rng(23), W = r.W;
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    for(let i = 0; i < 560; i++){ const s = q(), v = 12 + q() * 24, yr = q(), ln = 2 + (i % 4), x = (s * W + t * v) % W; if(x < vx - 20 || x > vx + vw + 20) continue; const c = r.colEm(x), y = c.t + 10 + yr * Math.max(1, c.b - c.t - 18); if(Math.sin(t * 1.7 + i) > -.2) ctx.fillRect(sn(x), sn(y), u * ln, u); }
    r.pedras.forEach(p => { if(p.x > vx - 70 && p.x < vx + vw + 70 && p.y > vy - 40 && p.y < vy + vh + 40) pedra(ctx, p, t); });
    rastros(ctx);
  }
  function pedra(ctx, p, t){
    const u = 1 / V.k;
    /* rio abaixo, o rastro claro da água que passou pela pedra; rio acima, a espuma batendo */
    for(let k = 1; k < 7; k++){ ctx.fillStyle = `rgba(255,255,255,${(.42 - k * .05).toFixed(2)})`; const dx = p.r + k * 8 + (t * 22) % 8; ctx.fillRect(sn(p.x + dx), sn(p.y - p.r * .3 + Math.sin(t * 3 + k) * 2), u * (4 + k), u); ctx.fillRect(sn(p.x + dx + 3), sn(p.y + p.r * .3 + Math.cos(t * 3 + k) * 2), u * (3 + k), u); }
    ctx.fillStyle = PAPEL; for(let k = 0; k < 6; k++){ const a = Math.PI * (.6 + k * .16), w = Math.sin(t * 9 + k * 1.7) > 0 ? 2 : 1; ctx.fillRect(sn(p.x + Math.cos(a) * (p.r + 2)), sn(p.y + Math.sin(a) * (p.r * .6 + 1)), u * w, u * w); }
    for(let dy = -Math.round(p.r * .7); dy < Math.round(p.r * .5); dy += 2){ const w = p.r * Math.sqrt(Math.max(0, 1 - (dy / p.r) * (dy / p.r))); ctx.fillStyle = dy < -p.r * .35 ? '#A3A8AF' : dy < p.r * .1 ? '#7A7E86' : '#565A62'; ctx.fillRect(sn(p.x - w), sn(p.y + dy), Math.max(u, sn(w * 2)), 2); }
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(sn(p.x - p.r * .9), sn(p.y + p.r * .5), sn(p.r * 1.8), u);
  }
  /* o rastro do barco: anéis que abrem e somem (cada barco solta um a cada 90 ms andando) */
  function rastro(x, y){ const L = V.rastro || (V.rastro = []); L.push({ x, y, t: performance.now() }); if(L.length > 120) L.shift(); }
  function rastros(ctx){
    const L = V.rastro; if(!L || !L.length) return; const agora = performance.now(), lw = Math.max(1, 1.05 / V.k);
    while(L.length && agora - L[0].t > 1600) L.shift();
    ctx.lineWidth = lw; L.forEach(o => { const a = (agora - o.t) / 1600; ctx.strokeStyle = `rgba(255,255,255,${(.5 * (1 - a)).toFixed(2)})`; ctx.beginPath(); ctx.ellipse(o.x, o.y, 4 + a * 18, 1.5 + a * 6, 0, 0, Math.PI * 2); ctx.stroke(); });
  }
  /* os píeres de madeira (com as estacas) e os barcos amarrados do lado */
  function sobreRio(ctx, vx, vy, vw, vh, t){
    const r = V.cid.rio; if(!r) return;
    r.piers.forEach(s => {
      if(s.x > vx + vw + 80 || s.x + s.w < vx - 80 || s.y > vy + vh || s.y + s.h < vy - 40) return;
      ctx.fillStyle = 'rgba(15,18,24,.3)'; ctx.fillRect(s.x + 4, s.y + 6, s.w, s.h);
      ctx.fillStyle = pad(ctx, 'madeira'); ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = '#5A3A22'; for(let y = s.y + 34; y < s.y + s.h; y += 36){ ctx.fillRect(s.x - 4, y, 4, 10); ctx.fillRect(s.x + s.w, y, 4, 10); }
      ctx.fillStyle = '#3B2D22'; ctx.fillRect(s.x + s.w - 9, s.y + s.h - 12, 5, 5); ctx.fillRect(s.x + 4, s.y + s.h - 12, 5, 5);
    });
    r.amarrados.forEach(a0 => { const a = amarradoXY(a0); if(a.x < vx - 60 || a.x > vx + vw + 60 || a.y < vy - 40 || a.y > vy + vh + 40) return;
      const [ix, iy] = ptBase(ctx, a.x, a.y), bob = Math.sin(t * 2 + a.x * .02) > .3 ? 1 : 0;
      ctx.save(); naBase(ctx); const P = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(ix + (a.lado < 0 ? -(x + w) : x), iy + bob + y, w, h); };
      casco(P, 'atras', a0.cor, t, false); casco(P, 'frente', a0.cor, t, false);
      /* a corda até a estaca do píer */
      ctx.fillStyle = '#C9B79C'; for(let k = 0; k < 6; k++) ctx.fillRect(ix + 18 + k * 2, iy + bob - 5 + (k > 2 ? 1 : 0), 2, 1);
      ctx.restore(); });
  }
  /* o barquinho de alumínio com motor de rabeta (o barco de pesca do Tibagi), em pixel. "atras" é a sombra, o fundo e o
     motor; "frente" é o costado, que esconde as pernas de quem tá sentado. P pinta já espelhado pro lado do barco */
  function casco(P, parte, cor, t, mexe){
    if(parte === 'atras'){
      P(-19, 1, 40, 2, 'rgba(15,40,80,.35)');
      P(-15, -7, 30, 3, '#4C545D'); P(-14, -7, 28, 1, '#5E6670'); P(-2, -7, 5, 1, '#B3793F');
      /* o motor em cima da popa e a cana comprida (a rabeta) descendo até a água */
      P(-21, -11, 5, 5, '#1B1D22'); P(-21, -12, 5, 1, AMARELO); P(-17, -10, 4, 1, '#2B2F38');
      for(let i = 0; i < 6; i++) P(-21 - i, -6 + i, 1, 1, '#2B2F38');
      if(mexe){ const f = Math.floor(t * 18) % 2; P(-29 - f, -1, 2, 1, PAPEL); P(-31 + f, 0, 2, 1, 'rgba(255,255,255,.8)'); P(-28, 1, 1, 1, PAPEL); }
      return;
    }
    P(-16, -5, 33, 1, '#E6EAEE'); P(-16, -4, 33, 1, '#B8C0C8'); P(-15, -3, 32, 1, cor); P(-15, -2, 31, 1, '#9EA6AF'); P(-13, -1, 27, 1, '#7E8790');
    P(17, -6, 2, 1, '#E6EAEE'); P(17, -5, 1, 2, '#B8C0C8');
    for(let x = -12; x < 16; x += 6) P(x, -4, 1, 1, '#D7DDE2');
    if(mexe){ const f = Math.floor(t * 14) % 2; P(18 + f, -1, 2, 1, PAPEL); P(16, 0, 3, 1, 'rgba(255,255,255,.7)'); }
  }
  /* o barracão do porto: tábua, telhado de zinco, a porta aberta, os remos encostados, a boia salva-vidas e a placa */
  function barracao(ctx, b, t){
    const w = 150, x = b.x - w / 2, y = b.base;
    ctx.fillStyle = 'rgba(15,18,24,.25)'; ctx.fillRect(x - 6, y - 3, w + 14, 8);
    bloco(ctx, x, y - 64, w, 64, 'madeira');
    ctx.fillStyle = 'rgba(40,24,12,.3)'; for(let k = x + 12; k < x + w - 4; k += 12) ctx.fillRect(k, y - 62, 1.5, 60);
    /* a porta aberta, com o escuro lá dentro e o remo e o puçá pendurados */
    ctx.fillStyle = '#2B1E14'; ctx.fillRect(x + 58, y - 44, 36, 44); ctx.fillStyle = '#4A3424'; ctx.fillRect(x + 60, y - 42, 32, 5);
    ctx.fillStyle = '#C9B79C'; ctx.fillRect(x + 66, y - 36, 2, 26); ctx.fillStyle = '#8C5A2E'; ctx.fillRect(x + 64, y - 12, 6, 8);
    /* a janelinha da isca e a caixa de isopor na porta */
    ctx.fillStyle = '#2A3442'; ctx.fillRect(x + 108, y - 46, 30, 18); ctx.fillStyle = '#8C5A2E'; ctx.fillRect(x + 106, y - 28, 34, 4);
    bloco(ctx, x + 102, y - 16, 22, 14, '#EEEBE4'); ctx.fillStyle = AZUL; ctx.fillRect(x + 102, y - 16, 22, 3);
    /* os remos encostados e a boia salva-vidas */
    ctx.fillStyle = '#C9B79C'; ctx.fillRect(x + 10, y - 50, 3, 48); ctx.fillRect(x + 18, y - 54, 3, 52); ctx.fillStyle = '#8C5A2E'; ctx.fillRect(x + 8, y - 56, 7, 9); ctx.fillRect(x + 16, y - 60, 7, 9);
    ctx.save(); ctx.translate(x + 40, y - 34); ctx.fillStyle = LARANJA; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.arc(0, 0, 4.5, 0, Math.PI * 2, true); ctx.fill();
    ctx.fillStyle = PAPEL; [0, 1, 2, 3].forEach(i => { const a = i * Math.PI / 2 + .4; ctx.fillRect(Math.cos(a) * 6.8 - 1.8, Math.sin(a) * 6.8 - 1.8, 3.6, 3.6); }); ctx.restore();
    /* o telhado de zinco, a placa na frente dele e a da isca na janela */
    bloco(ctx, x - 10, y - 84, w + 20, 20, 'zinco');
    pixPlaca(ctx, 'PORTO DO TIBAGI', b.x, y - 74, { fundo: AMARELO, cor: INK });
    pixPlaca(ctx, 'ISCA', x + 123, y - 52, { fundo: PAPEL, cor: INK });
  }
  /* os bichos do rio: capivara deitada na beira da mata (a família toda) e garça parada esperando peixe */
  function bicho(ctx, b, t){
    const [ix, iy] = ptBase(ctx, b.x, b.y), q = rng(b.sd);
    ctx.save(); naBase(ctx); const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(ix + x, iy + y, w, h); };
    if(b.tipo === 'capivara'){
      for(let i = 0; i < b.n; i++){
        const f = i >= 2, s = f ? .7 : 1, dx = Math.round((i - (b.n - 1) / 2) * 18 + (q() - .5) * 6), dy = Math.round((q() - .5) * 6), esq = q() < .5, w = Math.round(14 * s), h = Math.round(6 * s), mx = (x, ww) => esq ? dx - x - ww : dx + x;
        const C2 = (x, y, ww, hh, c) => R(mx(x, ww), dy + y, ww, hh, c);
        R(dx - w / 2 - 1, dy, w + 4, 2, 'rgba(15,18,24,.25)');
        C2(-w / 2, -h, w, h, '#8C5A2E'); C2(-w / 2 + 1, -h, w - 2, 1, '#A06A38'); C2(-w / 2 + 2, -1, w - 4, 1, '#6E4426');
        const hx = w / 2 - 1, cab = Math.round(6 * s), mexe = Math.sin(t * 1.3 + i * 2 + b.sd) > .93;
        C2(hx, -h - 1, cab, Math.round(5 * s), '#7A4C27'); C2(hx + cab - 1, -h + 1, 2, 2, '#5A3A1E'); C2(hx + 1, -h - 2 - (mexe ? 1 : 0), 1, 1, '#6E4426'); C2(hx + cab - 3, -h, 1, 1, INK);
      }
    } else {
      const pesca = Math.sin(t * .7 + b.sd) > .8, by = pesca ? 3 : 0;
      R(-3, 0, 9, 1, 'rgba(255,255,255,.35)'); R(0, -6, 1, 6, '#1B1D22'); R(2, -6, 1, 6, '#1B1D22');
      R(-2, -12, 7, 6, '#F4F3EF'); R(-2, -9, 4, 2, '#D9DCE1'); R(-3, -8, 2, 1, '#D9DCE1');
      R(4, -16 + by, 1, 5 - by, '#F4F3EF'); R(3, -18 + by, 1, 3, '#F4F3EF'); R(3, -19 + by, 3, 2, '#F4F3EF'); R(6, -18 + by, 3, 1, AMARELO); R(4, -19 + by, 1, 1, INK);
    }
    ctx.restore();
  }
  /* ---------- v3.82 · o desenho do Parque Arthur Thomas ----------
     A água mexendo (o lago, o ribeirão e o córrego correndo pro lado certo, o Salto caindo no basalto), o que fica por
     cima da água (a barragem, os pontilhões, o deck do mirante da cachoeira, a tubulação da usina e a boca da galeria) e
     o que entra na fila por altura (as construções, as placas e os bichos) */
  function aguaParque(ctx, t, vx, vy, vw, vh){
    const p = V.cid.arthur; if(!p || p.R.x > vx + vw || p.R.x + p.R.w < vx || p.R.y > vy + vh || p.R.y + p.R.h < vy) return;
    const u = 1 / V.k, l = p.lago, r = rng(31), span = l.x1 - l.x0;
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    for(let i = 0; i < 70; i++){ const x = l.x0 + ((r() * span + t * (5 + r() * 6)) % span), yr = r(), c = l.cols[Math.floor((x - l.x0) / l.B)]; if(!c) continue; const y = c.t + 10 + yr * Math.max(1, c.b - c.t - 20); if(Math.sin(t * 2 + i) > .3) ctx.fillRect(sn(x), sn(y), u * 3, u); }
    p.riachos.forEach((rc, k) => { for(let i = 1; i < rc.pts.length; i++){ const a = rc.pts[i - 1], b = rc.pts[i], L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      for(let d = (t * 30 + k * 7) % 14; d < L; d += 14){ const f = d / L, off = Math.sin(d * .7 + k + i) * rc.w * .25; ctx.fillRect(sn(a.x + (b.x - a.x) * f + off * (b.y - a.y) / L), sn(a.y + (b.y - a.y) * f - off * (b.x - a.x) / L), u * 2, u); } } });
    /* o Salto: a água caindo (tracinhos que descem) e a espuma no poço */
    const s = p.salto, w = 18;
    ctx.fillStyle = 'rgba(200,230,255,.85)'; ctx.fillRect(s.x - w / 2, s.y0 - 2, w, s.y1 - s.y0 + 6);
    ctx.fillStyle = PAPEL; for(let i = 0; i < 16; i++){ const x = s.x - w / 2 + 1 + (i * 5.3) % (w - 3), y = s.y0 + ((t * 90 + i * 37) % (s.y1 - s.y0)); ctx.fillRect(sn(x), sn(y), u * 2, u * 6); }
    for(let i = 0; i < 14; i++){ const a = i / 14 * Math.PI * 2 + t, rr = 6 + (t * 14 + i * 5) % 14; ctx.fillStyle = `rgba(255,255,255,${(.7 - rr / 28).toFixed(2)})`; ctx.fillRect(sn(s.x + Math.cos(a) * rr * 1.6), sn(p.poco.y - 6 + Math.sin(a) * rr * .5), u * 2, u * 2); }
  }
  function sobreParque(ctx, vx, vy, vw, vh){
    const p = V.cid.arthur; if(!p || p.R.x > vx + vw + 40 || p.R.x + p.R.w < vx - 40 || p.R.y > vy + vh + 40 || p.R.y + p.R.h < vy - 40) return;
    const b = p.barragem;
    /* a tubulação, da barragem até a usina (a água descia 50 metros por ela) */
    ctx.lineCap = 'round'; ctx.strokeStyle = '#4A4E56'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(b.x - 2, b.y + 92); ctx.lineTo(p.usina.x + 34, p.usina.base - 58); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 2; ctx.stroke(); ctx.lineCap = 'butt';
    /* a barragem: concreto com guarda-corpo dos dois lados e a água escorrendo pelo vertedouro */
    ctx.fillStyle = 'rgba(15,18,24,.3)'; ctx.fillRect(b.x + 4, b.y + 6, b.w, b.h);
    ctx.fillStyle = pad(ctx, 'concreto'); ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = '#2B2F38'; ctx.fillRect(b.x - 2, b.y, 2, b.h); ctx.fillRect(b.x + b.w, b.y, 2, b.h);
    for(let y = b.y + 4; y < b.y + b.h - 4; y += 12){ ctx.fillRect(b.x - 3, y, 3, 5); ctx.fillRect(b.x + b.w, y, 3, 5); }
    ctx.fillStyle = 'rgba(200,230,255,.85)'; ctx.fillRect(b.x - 8, b.y + 54, 7, 16);
    /* os pontilhões de madeira (a tábua atravessada ao caminho e o corrimão dos lados) */
    p.secos.forEach(s => { if(!s.ponte) return; const hor = s.w > s.h;
      ctx.fillStyle = 'rgba(15,18,24,.3)'; ctx.fillRect(s.x + 3, s.y + 5, s.w, s.h); ctx.fillStyle = pad(ctx, 'madeira'); ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = 'rgba(40,24,12,.35)'; for(let k = 4; k < (hor ? s.w : s.h); k += 6){ if(hor) ctx.fillRect(s.x + k, s.y, 1.5, s.h); else ctx.fillRect(s.x, s.y + k, s.w, 1.5); }
      ctx.fillStyle = '#5A3A22'; if(hor){ ctx.fillRect(s.x, s.y - 2, s.w, 3); ctx.fillRect(s.x, s.y + s.h - 1, s.w, 3); } else { ctx.fillRect(s.x - 2, s.y, 3, s.h); ctx.fillRect(s.x + s.w - 1, s.y, 3, s.h); } });
    /* o deck do mirante da cachoeira, com o guarda-corpo do lado do Salto */
    const d = p.deck; ctx.fillStyle = 'rgba(15,18,24,.3)'; ctx.fillRect(d.x + 3, d.y + 5, d.w, d.h); ctx.fillStyle = pad(ctx, 'madeira'); ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.fillStyle = '#5A3A22'; ctx.fillRect(d.x - 2, d.y - 2, 3, d.h + 2); ctx.fillRect(d.x, d.y - 2, d.w, 3);
    /* a boca da galeria, onde o ribeirão sai do parque */
    const L = p.riachos[1].pts, fim = L[L.length - 1]; bloco(ctx, fim.x - 4, fim.y - 16, 12, 30, 'concreto');
  }
  /* o que entra na fila por altura (a base decide quem fica na frente) */
  function parqueNaFila(L, ctx, t, vis){
    const p = V.cid.arthur; if(!p) return;
    const poe = (o, base, m, f) => { if(vis(o.x, base, m)) L.push({ y: base, f }); };
    poe(p.portal, p.portal.base, 160, () => portalParque(ctx, p.portal));
    poe(p.busto, p.busto.base, 80, () => bustoParque(ctx, p.busto));
    poe(p.cea, p.cea.base, 220, () => ceaParque(ctx, p.cea));
    p.colmeias.forEach(c => poe(c, c.base, 60, () => colmeia(ctx, c, t)));
    poe(p.mirante, p.mirante.base, 140, () => mirante(ctx, p.mirante));
    poe(p.gazebo, p.gazebo.base, 120, () => gazebo(ctx, p.gazebo));
    poe(p.usina, p.usina.base, 180, () => usinaParque(ctx, p.usina));
    poe(p.jaula, p.jaula.base, 180, () => jaulaParque(ctx, p.jaula));
    p.placas.forEach(o => poe(o, o.y, 50, () => placaLer(ctx, o)));
    p.bichos.forEach(o => poe(o, o.y, 90, () => bicho(ctx, o, t)));
    const Q = V.pq; if(!Q) return;
    Q.mac.forEach(m => poe(m, m.base, 80, () => macaco(ctx, m, t)));
    Q.quatis.forEach(o => { if(o.x != null) poe(o, o.y, 60, () => quati(ctx, o, t)); });
    poe(p.salto, p.poco.y + 20, 140, () => beijaFlores(ctx, p, t));
  }
  /* o portal da entrada: dois troncos, a viga e a placa de madeira escura */
  function portalParque(ctx, o){
    const x = o.x, y = o.base;
    ctx.fillStyle = 'rgba(15,18,24,.25)'; ctx.fillRect(x - 58, y - 3, 116, 7);
    bloco(ctx, x - 52, y - 72, 10, 72, 'tronco'); bloco(ctx, x + 42, y - 72, 10, 72, 'tronco');
    bloco(ctx, x - 64, y - 84, 128, 12, 'madeira');
    bloco(ctx, x - 60, y - 104, 120, 20, '#5A3A22');
    pixPlaca(ctx, 'PARQUE ARTHUR THOMAS', x, y - 94, { fundo: '#5A3A22', cor: '#F2D8A7', borda: false });
  }
  /* o busto de bronze do Arthur Thomas no pedestal */
  function bustoParque(ctx, o){
    const x = o.x, y = o.base;
    ctx.fillStyle = 'rgba(15,18,24,.25)'; ctx.fillRect(x - 15, y - 3, 30, 6);
    bloco(ctx, x - 12, y - 30, 24, 30, 'concreto'); ctx.fillStyle = '#B8964C'; ctx.fillRect(x - 7, y - 20, 14, 7);
    ctx.fillStyle = '#6E5B3E'; ctx.fillRect(x - 10, y - 40, 20, 10); ctx.fillRect(x - 5, y - 54, 10, 14); ctx.fillRect(x - 3, y - 42, 6, 3);
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x - 5, y - 54, 3, 14); ctx.fillRect(x - 10, y - 40, 4, 10);
  }
  /* o CEA: o Centro de Educação Ambiental, de telhado de barro */
  function ceaParque(ctx, o){
    const w = o.w, x = o.x - w / 2, y = o.base;
    ctx.fillStyle = 'rgba(15,18,24,.25)'; ctx.fillRect(x - 4, y - 3, w + 12, 7);
    bloco(ctx, x, y - 46, w, 46, '#E8D7C3');
    vidro(ctx, x + 12, y - 36, 42, 22, false, 14); vidro(ctx, x + w - 54, y - 36, 42, 22, false, 14);
    porta(ctx, o.x, y, 24, 32, '#5A3A22');
    bloco(ctx, x - 10, y - 64, w + 20, 18, 'tijolo');
    pixPlaca(ctx, 'CEA', o.x, y - 55, { fundo: PAPEL, cor: INK });
  }
  /* a colmeia de abelha sem ferrão (caixinha de madeira no cavalete) e as abelhas rodando */
  function colmeia(ctx, o, t){
    const x = o.x, y = o.base, u = 1 / V.k;
    ctx.fillStyle = '#5A3A22'; ctx.fillRect(x - 6, y - 12, 2, 12); ctx.fillRect(x + 4, y - 12, 2, 12);
    bloco(ctx, x - 8, y - 24, 16, 12, 'madeira'); ctx.fillStyle = '#5A3A22'; ctx.fillRect(x - 9, y - 26, 18, 3); ctx.fillStyle = INK; ctx.fillRect(x - 1, y - 16, 3, 2);
    ctx.fillStyle = '#F2C230'; for(let i = 0; i < 4; i++){ const a = t * (2 + i * .4) + i * 1.7 + o.x; ctx.fillRect(sn(x + Math.cos(a) * (10 + i * 3)), sn(y - 22 + Math.sin(a * 1.3) * 7), u * 2, u * 2); }
  }
  /* o mirante: torre de madeira com escada, plataforma e telhadinho */
  function mirante(ctx, o){
    const x = o.x, y = o.base;
    ctx.fillStyle = 'rgba(15,18,24,.25)'; ctx.fillRect(x - 26, y - 3, 52, 7);
    ctx.fillStyle = '#6B4A32'; [-20, 16].forEach(dx => ctx.fillRect(x + dx, y - 74, 5, 74));
    ctx.strokeStyle = '#6B4A32'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 18, y - 4); ctx.lineTo(x + 18, y - 36); ctx.moveTo(x + 18, y - 4); ctx.lineTo(x - 18, y - 36); ctx.moveTo(x - 18, y - 40); ctx.lineTo(x + 18, y - 70); ctx.moveTo(x + 18, y - 40); ctx.lineTo(x - 18, y - 70); ctx.stroke();
    /* a escada subindo pela direita */
    ctx.fillStyle = '#B3793F'; for(let i = 0; i < 9; i++) ctx.fillRect(x + 22 + i * 1.5, y - 8 - i * 7, 10, 2);
    bloco(ctx, x - 26, y - 82, 52, 8, 'madeira');
    ctx.fillStyle = '#5A3A22'; ctx.fillRect(x - 26, y - 96, 2, 14); ctx.fillRect(x + 24, y - 96, 2, 14); ctx.fillRect(x - 26, y - 96, 52, 2);
    ctx.fillRect(x - 24, y - 112, 3, 16); ctx.fillRect(x + 21, y - 112, 3, 16);
    bloco(ctx, x - 32, y - 118, 64, 8, 'tijolo');
  }
  /* o Espaço Ipê-Amarelo: o quiosque de telhado amarelo com as mesas embaixo */
  function gazebo(ctx, o){
    const x = o.x, y = o.base;
    ctx.fillStyle = 'rgba(15,18,24,.25)'; ctx.fillRect(x - 40, y - 3, 80, 7);
    ctx.fillStyle = '#5A3A22'; ctx.fillRect(x - 30, y - 44, 5, 44); ctx.fillRect(x + 25, y - 44, 5, 44);
    bloco(ctx, x - 18, y - 16, 36, 4, 'madeira'); ctx.fillStyle = '#5A3A22'; ctx.fillRect(x - 15, y - 12, 2, 12); ctx.fillRect(x + 13, y - 12, 2, 12);
    [[-42, 84, 8], [-32, 64, 7], [-18, 36, 6]].forEach(([dx, w, h], i) => { ctx.fillStyle = i ? AMARELO : '#E0A92A'; ctx.fillRect(x + dx, y - 50 - i * 7, w, h); ctx.fillStyle = 'rgba(15,18,24,.18)'; ctx.fillRect(x + dx, y - 50 - i * 7 + h - 2, w, 2); });
    pixPlaca(ctx, 'IPE-AMARELO', x, y - 40, { fundo: PAPEL, cor: INK });
  }
  /* a Usina Cambé: tijolo, as janelas altas, o telhado de zinco e a placa de 1939 */
  function usinaParque(ctx, o){
    const w = o.w, x = o.x - w / 2, y = o.base;
    ctx.fillStyle = 'rgba(15,18,24,.25)'; ctx.fillRect(x - 4, y - 3, w + 12, 7);
    bloco(ctx, x, y - 58, w, 58, 'tijolo');
    for(let i = 0; i < 4; i++) if(i !== 3) vidro(ctx, x + 8 + i * 26, y - 48, 14, 32, false, 14);
    porta(ctx, o.x + 34, y, 18, 30, '#3B2D22');
    ctx.fillStyle = 'rgba(15,18,24,.18)'; ctx.fillRect(x + 6, y - 58, 10, 18); ctx.fillRect(x + w - 30, y - 22, 16, 22);
    bloco(ctx, x - 6, y - 74, w + 12, 16, 'zinco');
    pixPlaca(ctx, 'USINA CAMBE 1939', o.x, y - 66, { fundo: PAPEL, cor: INK });
  }
  /* a Jaula 01 do Elo Perdido: parede de bloco pichada, a palha, o pneu pendurado e a grade na frente. Vazia: os
     macacos daqui são livres (e às vezes sentam em cima dela) */
  function jaulaParque(ctx, o){
    const w = o.w, x = o.x - w / 2, y = o.base, h = 60;
    ctx.fillStyle = 'rgba(15,18,24,.28)'; ctx.fillRect(x - 4, y - 3, w + 12, 8);
    bloco(ctx, x, y - h, w, h, '#66676B');
    ctx.fillStyle = 'rgba(15,18,24,.16)'; for(let yy = y - h + 8; yy < y; yy += 8){ ctx.fillRect(x, yy, w, 1); for(let xx = x + ((yy / 8) % 2 ? 8 : 0); xx < x + w; xx += 16) ctx.fillRect(xx, yy - 8, 1, 8); }
    pixTxt(ctx, 'JAULA 01', x + 32, y - h + 12, 2, '#E8C547', 'c'); pixTxt(ctx, 'UH UH', x + w - 26, y - 30, 1, ROSA, 'c');
    ctx.fillStyle = '#B9A45A'; ctx.fillRect(x + 3, y - 9, w - 6, 7);
    ctx.fillStyle = '#9A8A64'; ctx.fillRect(o.x + 22, y - h, 1.5, 26); ctx.strokeStyle = '#161616'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(o.x + 23, y - h + 30, 7, 6, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#23272A'; for(let xx = x + 3; xx < x + w; xx += 7) ctx.fillRect(xx, y - h - 4, 2.5, h + 4); ctx.fillRect(x - 2, y - h - 7, w + 4, 4); ctx.fillRect(x - 2, y - 3, w + 4, 3);
    /* o portão aberto e a placa do jogo */
    ctx.fillStyle = 'rgba(15,18,24,.55)'; ctx.fillRect(o.x - 10, y - 44, 20, 41);
    pixPlaca(ctx, 'ELO PERDIDO', o.x, y - h - 16, { fundo: AMARELO, cor: INK });
  }
  /* a placa de ler: tábua em dois pés, com o "i" */
  function placaLer(ctx, o){
    const x = o.x, y = o.y;
    ctx.fillStyle = 'rgba(15,18,24,.2)'; ctx.fillRect(x - 12, y - 2, 24, 4);
    ctx.fillStyle = '#5A3A22'; ctx.fillRect(x - 9, y - 18, 2, 18); ctx.fillRect(x + 7, y - 18, 2, 18);
    bloco(ctx, x - 12, y - 28, 24, 14, 'madeira'); pixTxt(ctx, 'I', x, y - 21, 1, PAPEL, 'c');
  }
  /* o macaco-prego (Sapajus nigritus): o topete preto, a cara clara, o rabo enrolando. No ar, braços pra cima */
  function macaco(ctx, m, t){
    const [ix, iy] = ptBase(ctx, m.x, m.y), d = m.dir || 1;
    ctx.save(); naBase(ctx); const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(ix + (d < 0 ? -(x + w) : x), iy + y, w, h); };
    const ar = !!m.hop, rabo = Math.sin(t * 3 + m.sd) > 0 ? 0 : 1, E = '#4A3424';
    if(m.chao && !ar) R(-4, 0, 9, 1, 'rgba(15,18,24,.25)');
    R(-5, -3, 1, 1, E); R(-6, -6 + rabo, 1, 4, E); R(-5, -8 + rabo, 2, 1, E);
    R(-3, -6, 6, 5, '#6B4A32'); R(-2, -5, 4, 3, '#8C6A48');
    if(ar){ R(-4, -10, 1, 5, E); R(3, -10, 1, 5, E); R(-3, -1, 2, 2, E); R(1, -1, 2, 2, E); }
    else { R(-4, -5, 1, 4, E); R(3, -5, 1, 4, E); R(-3, -1, 2, 1, E); R(1, -1, 2, 1, E); }
    R(-3, -11, 6, 5, '#5A3A22'); R(-2, -12, 4, 2, '#1B1D22'); R(-2, -10, 4, 3, '#E8CFA8'); R(-1, -9, 1, 1, INK); R(1, -9, 1, 1, INK);
    if(m.come > 0) R(3, -8, 3, 3, AMARELO);
    ctx.restore();
  }
  /* o quati: focinho comprido, a máscara, o rabo listrado pra cima */
  function quati(ctx, o, t){
    const [ix, iy] = ptBase(ctx, o.x, o.y), d = o.dir || 1, pe = o.anda && Math.sin(t * 14 + o.sd) > 0 ? 1 : 0;
    ctx.save(); naBase(ctx); const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(ix + (d < 0 ? -(x + w) : x), iy + y, w, h); };
    R(-6, 0, 13, 1, 'rgba(15,18,24,.25)');
    for(let i = 0; i < 4; i++) R(-7, -5 - i * 2, 2, 2, i % 2 ? '#C9A06A' : '#3B2414'); R(-6, -12, 1, 2, '#3B2414');
    R(-5, -5, 10, 4, '#8E5A2E'); R(-4, -2, 8, 1, '#C9A06A');
    R(-4 + pe, -1, 1, 1, '#3B2414'); R(3 - pe, -1, 1, 1, '#3B2414');
    R(4, -6, 3, 3, '#6E4426'); R(7, -5, 3, 2, '#C9A06A'); R(10, -5, 1, 1, INK); R(5, -6, 1, 1, INK); R(4, -7, 1, 1, '#3B2414');
    ctx.restore();
  }
  /* os beija-flores do Salto (é deles o nome): três paradinhos no ar, mudando de lugar */
  function beijaFlores(ctx, p, t){
    const s = p.salto;
    [0, 1, 2].forEach(i => { const x = s.x + 40 + Math.sin(t * .7 + i * 2.1) * 40 + Math.sin(t * 9 + i) * 1.5, y = s.y0 + 6 + i * 14 + Math.cos(t * 1.1 + i) * 8, [ix, iy] = ptBase(ctx, x, y), asa = Math.sin(t * 60 + i) > 0;
      ctx.save(); naBase(ctx); ctx.fillStyle = '#8F86E8'; ctx.fillRect(ix - 2, iy, 4, 2); ctx.fillStyle = '#5E3A9E'; ctx.fillRect(ix + 2, iy, 2, 1); ctx.fillStyle = 'rgba(244,241,234,.7)'; ctx.fillRect(ix - 1, iy - (asa ? 2 : 1), 2, asa ? 2 : 1); ctx.restore(); });
  }
  /* os bichos que andam: os macacos pulam de copa em copa (e no teto da jaula), descem pra fuçar a trilha e sobem
     quando você chega perto; quem passa com comida na mão perde a comida (o guia pede: não alimente os animais). O
     bando de quatis vai e volta na Trilha do Tatu. Tudo do aparelho de cada um, como o trânsito */
  const NA_MAO = { smash: 'o teu smash', pastel: 'o teu pastel', churros: 'os teus churros', coco: 'a tua água de coco', sorvete: 'o teu sorvete', pipoca: 'a tua pipoca', acai: 'o teu açaí', caldo: 'o teu caldo de cana' };
  function criaBichosParque(p){
    const q = rng(hash('macacos')), G = p.galhos, mac = [], livres = G.map((g, i) => i);
    for(let i = 0; i < Math.min(9, G.length); i++){ const k = livres.splice(Math.floor(q() * livres.length), 1)[0], g = G[k]; mac.push({ g: k, x: g.x, y: g.y, base: g.base, hop: null, esp: 1 + q() * 6, dir: q() < .5 ? -1 : 1, sd: Math.floor(q() * 1e6), come: 0, chao: false }); }
    const rota = p.quatiRota; let total = 0; for(let i = 1; i < rota.length; i++) total += Math.hypot(rota[i].x - rota[i - 1].x, rota[i].y - rota[i - 1].y);
    return { p, mac, quatis: [0, 1, 2, 3, 4].map(i => ({ i, sd: i * 97, x: null, y: null, dir: 1, anda: true })), lider: { s: total * .3, dir: 1, para: 0 }, total, roubaT: 0, pioT: 0 };
  }
  function noCaminho(L, s){ for(let i = 1; i < L.length; i++){ const a = L[i - 1], b = L[i], d = Math.hypot(b.x - a.x, b.y - a.y); if(s <= d || i === L.length - 1){ const f = clamp(s / (d || 1), 0, 1); return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, dx: b.x - a.x }; } s -= d; } return { x: L[0].x, y: L[0].y, dx: 1 }; }
  function passoArthur(dt){
    const p = V.cid && V.cid.arthur, e = V.eu; if(!p || !e) return;
    const R = p.R; if(e.x < R.x - 900 || e.x > R.x + R.w + 900 || e.y < R.y - 900 || e.y > R.y + R.h + 900) return;
    if(!V.pq || V.pq.p !== p) V.pq = criaBichosParque(p);
    const Q = V.pq, G = p.galhos, agora = Date.now(), dentro = e.x > R.x && e.x < R.x + R.w && e.y > R.y && e.y < R.y + R.h;
    const pula = (m, x1, y1, b1, g, rouba) => { const dd = Math.hypot(x1 - m.x, y1 - m.y); m.hop = { x0: m.x, y0: m.y, b0: m.base, x1, y1, b1, g, t: 0, d: .4 + dd / 380, h: 14 + dd * .14, rouba: !!rouba }; m.chao = false;
      if(Math.hypot(e.x - m.x, e.y - m.y) < 320 && agora > Q.pioT && C.versoSom){ Q.pioT = agora + 1800 + Math.random() * 2500; C.versoSom.macaco(); } };
    const sobe = m => { let best = -1, bd = 1e9; G.forEach((g, i) => { if(Q.mac.some(o => o !== m && (o.g === i || (o.hop && o.hop.g === i)))) return; const d = Math.hypot(g.x - m.x, g.base - m.y); if(d < bd){ bd = d; best = i; } }); if(best >= 0) pula(m, G[best].x, G[best].y, G[best].base, best); };
    /* comida na mão dentro do parque: o macaco mais perto desce e pega */
    const comida = e.item && NA_MAO[e.item.k] && e.item.ate > agora && !e.barco && dentro;
    if(comida && agora > Q.roubaT && !Q.mac.some(m => m.vaiRoubar)){ let alvo = null, dm = 240; for(const m of Q.mac){ if(m.hop) continue; const d = Math.hypot(e.x - m.x, e.y - m.y); if(d < dm){ dm = d; alvo = m; } } if(alvo){ alvo.vaiRoubar = true; pula(alvo, e.x + 10, e.y - 1, e.y + .5, -1, true); Q.roubaT = agora + 6000; } }
    for(const m of Q.mac){
      if(m.come > 0) m.come -= dt;
      if(m.hop){ const h = m.hop; h.t += dt / h.d; const u = Math.min(1, h.t); m.x = h.x0 + (h.x1 - h.x0) * u; m.y = h.y0 + (h.y1 - h.y0) * u - Math.sin(Math.PI * u) * h.h; m.base = h.b0 + (h.b1 - h.b0) * u; if(Math.abs(h.x1 - h.x0) > 2) m.dir = h.x1 > h.x0 ? 1 : -1;
        if(u >= 1){ m.hop = null; m.g = h.g; m.chao = h.g < 0; m.esp = m.chao ? 2.5 + Math.random() * 3 : 2 + Math.random() * 7;
          if(h.rouba){ m.vaiRoubar = false; m.esp = .7;
            if(e.item && NA_MAO[e.item.k] && Math.hypot(e.x - m.x, e.y - m.y) < 44){ const o = NA_MAO[e.item.k]; e.item = null; enviaPos(true); m.come = 9; C.toast(`Um macaco-prego levou ${o}. No Arthur Thomas não se dá comida pros bichos: eles aprendem a pegar.`, 4800); if(C.versoSom) C.versoSom.macaco(); } } }
        continue; }
      if(m.chao && Math.hypot(e.x - m.x, e.y - m.y) < 46){ sobe(m); continue; }
      m.esp -= dt; if(m.esp > 0) continue;
      if(m.chao){ sobe(m); continue; }
      const g = G[m.g]; if(!g){ sobe(m); continue; }
      if(Math.random() < .2 && p.chao.length){ const c = p.chao.filter(o => Math.hypot(o.x - g.x, o.y - g.base) < 130); if(c.length){ const o = c[Math.floor(Math.random() * c.length)], x = o.x + (Math.random() - .5) * 18; pula(m, x, o.y, o.y, -1); continue; } }
      const v = g.viz.filter(i => !Q.mac.some(o => o !== m && (o.g === i || (o.hop && o.hop.g === i))));
      if(v.length){ const i = v[Math.floor(Math.random() * v.length)]; pula(m, G[i].x, G[i].y, G[i].base, i); } else m.esp = 2;
    }
    /* o bando de quatis: o primeiro anda e às vezes para pra fuçar, os outros vão atrás na mesma trilha */
    const Ld = Q.lider, rota = p.quatiRota;
    if(Ld.para > 0) Ld.para -= dt; else { Ld.s += Ld.dir * 34 * dt; if(Ld.s > Q.total - 4 || Ld.s < 70){ Ld.dir *= -1; Ld.s = clamp(Ld.s, 70, Q.total - 4); } if(Math.random() < dt * .09) Ld.para = 2 + Math.random() * 3; }
    Q.quatis.forEach(o => { const s = clamp(Ld.s - Ld.dir * o.i * 15, 0, Q.total), c = noCaminho(rota, s); o.x = c.x + Math.sin(o.sd) * 5; o.y = c.y + Math.cos(o.sd) * 4; o.dir = (c.dx >= 0 ? 1 : -1) * Ld.dir; o.anda = Ld.para <= 0; });
  }
  function arvore(ctx, a){
    const s = a.g === 2 ? 2 : a.g ? 1.3 : 1, f = 'folha' + a.cor;
    ctx.fillStyle = 'rgba(15,18,24,.25)'; ctx.fillRect(a.x - 18 * s, a.y - 3, 36 * s, 7);
    bloco(ctx, a.x - 4 * s, a.y - 30 * s, 9 * s, 30 * s, 'tronco', true);
    bloco(ctx, a.x - 22 * s, a.y - 62 * s, 44 * s, 34 * s, f); bloco(ctx, a.x - 13 * s, a.y - 80 * s, 26 * s, 18 * s, f);
    /* v3.87: no Natal, um ipê em cada três ganha pisca-pisca (a mata do Tibagi e a do Arthur Thomas ficam no escuro) */
    if(natal() && !a.mata && !a.parque && (a.g === 2 || hash('n' + a.x + ':' + a.y) % 3 === 0)) copaNatal(ctx, a, s);
  }
  function banco(ctx, b){
    if(b.degrau) return;
    ctx.fillStyle = 'rgba(15,18,24,.25)'; ctx.fillRect(b.x - 22, b.y - 2, 44, 5);
    bloco(ctx, b.x - 18, b.y - 10, 4, 10, 'preto', true); bloco(ctx, b.x + 14, b.y - 10, 4, 10, 'preto', true);
    bloco(ctx, b.x - 22, b.y - 18, 44, 8, 'madeira');
  }
  function poste(ctx, p){ luz(p.x + 8, p.y - 30, 122, .95); if(p.orla && natal()){ arcoLuz(ctx, p); return; } ctx.fillStyle = 'rgba(15,18,24,.2)'; ctx.fillRect(p.x - 4, p.y - 1, 10, 3); ctx.fillStyle = '#2B2F38'; ctx.fillRect(p.x - 2, p.y - 56, 4, 56); ctx.fillRect(p.x - 2, p.y - 56, 13, 3); ctx.fillStyle = '#FFE7A8'; ctx.fillRect(p.x + 5, p.y - 53, 9, 3); if(natal()) posteNatal(ctx, p); }
  /* ---------- v3.87 · os enfeites de Natal ----------
     Nada de verde, nem no Natal (regra do Corre): o pisca-pisca é branco quente, vermelho, dourado, azul e rosa; a
     árvore de Natal é dourada (pinheiro seria verde); a guirlanda da porta é de fita vermelha com laço de ouro; e o
     Bosque não tem pinheiro: o ipê gigante vira a árvore de Natal da cidade, com a estrela no alto */
  const LUZES = ['#FFF3C4', '#FF4A4A', '#FFC93D', '#6FB6FF', '#FF7AB8'], VERM_N = '#D42A35', OURO_N = '#FFC93D';
  /* uma lâmpada do pisca-pisca: cada uma pisca no seu tempo e a cor anda devagar pela fileira */
  function lampada(ctx, x, y, i){
    if((Math.floor(NT * 2.6) + i * 3) % 7 === 0) return;
    luz(x, y, 13, .85);
    const u = 1 / V.k; ctx.fillStyle = LUZES[(i + Math.floor(NT * .5)) % LUZES.length]; ctx.fillRect(sn(x), sn(y), u, u);
  }
  function lacoNatal(ctx, x, y){
    ctx.fillStyle = VERM_N; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 8, y - 5); ctx.lineTo(x - 8, y + 5); ctx.closePath(); ctx.moveTo(x, y); ctx.lineTo(x + 8, y - 5); ctx.lineTo(x + 8, y + 5); ctx.closePath(); ctx.fill();
    ctx.fillRect(x - 4, y + 1, 3, 9); ctx.fillRect(x + 1, y + 1, 3, 8); ctx.fillStyle = OURO_N; ctx.fillRect(x - 2, y - 2, 4, 4);
  }
  /* o poste vira bengala doce (a faixa vermelha em espiral) e ganha o laço */
  function posteNatal(ctx, p){
    ctx.fillStyle = VERM_N; for(let y = p.y - 50; y < p.y - 4; y += 9){ ctx.beginPath(); ctx.moveTo(p.x - 2, y + 4); ctx.lineTo(p.x + 2, y); ctx.lineTo(p.x + 2, y + 3); ctx.lineTo(p.x - 2, y + 7); ctx.closePath(); ctx.fill(); }
    lacoNatal(ctx, p.x, p.y - 46);
  }
  /* o festão de luz de um poste pro vizinho da mesma calçada (feito uma vez por cidade) */
  function fiosDe(c){
    if(c.fios) return c.fios; const F = [];
    c.postes.forEach(p => { let m = null; c.postes.forEach(q => { const dx = q.x - p.x; if(dx > 60 && dx < 430 && Math.abs(q.y - p.y) < 3 && (!m || dx < m.x - p.x)) m = q; }); if(m) F.push({ a: p, b: m, s: hash(p.x + ':' + p.y) % 97 }); });
    return (c.fios = F);
  }
  function festao(ctx, f){
    const ax = f.a.x + 2, bx = f.b.x - 2, y0 = f.a.y - 50, L = bx - ax, cai = Math.min(24, 8 + L * .04), n = Math.max(5, Math.round(L / 14));
    ctx.strokeStyle = 'rgba(20,22,28,.7)'; ctx.lineWidth = Math.max(1, .5 / V.k); ctx.beginPath(); ctx.moveTo(ax, y0); ctx.quadraticCurveTo((ax + bx) / 2, y0 + cai * 2, bx, y0); ctx.stroke();
    for(let j = 1; j < n; j++){ const s = j / n; lampada(ctx, ax + L * s - .5 / V.k, y0 + 4 * cai * s * (1 - s), f.s + j); }
  }
  /* o pisca-pisca na copa do ipê (um em cada três; o ipê gigante sempre) */
  function copaNatal(ctx, a, s){
    const r = rng(hash('luz:' + a.x + ':' + a.y)), n = Math.round(11 * s);
    for(let j = 0; j < n; j++){ const top = r() < .3; lampada(ctx, a.x + (r() - .5) * (top ? 22 : 40) * s, a.y - (top ? 66 + r() * 10 : 34 + r() * 26) * s, j + Math.floor(r() * 40)); }
  }
  function estrela(ctx, x, y, r){
    ctx.beginPath(); for(let i = 0; i < 10; i++){ const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); forma(ctx, OURO_N, 1.4);
    const brilha = .5 + .5 * Math.sin(NT * 3), u = 1 / V.k; ctx.fillStyle = `rgba(255,243,196,${(.35 + .5 * brilha).toFixed(2)})`;
    ctx.fillRect(sn(x - u / 2), sn(y - r * 2.1), u, r * 1.1); ctx.fillRect(sn(x - u / 2), sn(y + r), u, r * 1.1); ctx.fillRect(sn(x - r * 2.1), sn(y - u / 2), r * 1.1, u); ctx.fillRect(sn(x + r), sn(y - u / 2), r * 1.1, u);
  }
  /* a árvore de Natal dourada (fica no lugar da estátua das pracinhas): quatro andares de festão de ouro, bola vermelha,
     rosa e azul, o pisca-pisca, a estrela e os presentes no pé */
  function arvNatal(ctx, x, y){
    ctx.fillStyle = 'rgba(15,18,24,.25)'; ctx.fillRect(x - 34, y - 3, 68, 7);
    bloco(ctx, x - 5, y - 16, 10, 14, 'tronco', true);
    [[64, 0], [50, 20], [36, 38], [22, 54]].forEach(([w, dy]) => { const yb = y - 10 - dy; ctx.beginPath(); ctx.moveTo(x - w / 2, yb); ctx.lineTo(x + w / 2, yb); ctx.lineTo(x + w * .2, yb - 26); ctx.lineTo(x - w * .2, yb - 26); ctx.closePath(); forma(ctx, '#D9A93A', 1.6);
      ctx.fillStyle = '#B8862A'; ctx.fillRect(x - w / 2 + 3, yb - 4, w - 6, 2); ctx.fillStyle = '#F2D27A'; ctx.fillRect(x - w * .2 + 2, yb - 25, w * .16, 3); });
    [[-22, -18, VERM_N], [14, -24, ROSA], [-8, -40, AZUL], [16, -52, VERM_N], [-12, -62, ROSA], [6, -76, AZUL], [-24, -14, AZUL], [24, -14, ROSA]].forEach(([dx, dy, c]) => { ctx.beginPath(); ctx.arc(x + dx, y + dy, 3.4, 0, Math.PI * 2); forma(ctx, c, 1); });
    for(let j = 0; j < 16; j++){ const f = j / 16, w = 60 - f * 44; lampada(ctx, x + Math.sin(j * 2.4) * w * .4, y - 16 - f * 72, j + 5); }
    estrela(ctx, x, y - 96, 9);
    [[-26, 12, ROSA], [12, 14, AZUL], [-6, 10, AMARELO]].forEach(([dx, w, c], i) => { const bx = x + dx, by = y - 12 + i % 2 * 2; ctx.beginPath(); ctx.rect(bx, by, w, 12 - i % 2 * 2); forma(ctx, c, 1.2); ctx.fillStyle = c === AMARELO ? VERM_N : PAPEL; ctx.fillRect(bx + w / 2 - 1, by, 2, 12 - i % 2 * 2); });
  }
  /* ---------- v3.87 · o maior Papai Noel do mundo, no Igapó ----------
     O de verdade (LondriNatal 2025): 27 metros, 15 toneladas, uns 450 mil pontos de LED, em pé numa balsa presa por
     quatro âncoras no Lago Igapó 2; acendeu em 30/11/2025 e o Guinness confirmou o recorde em 5/12 (o de antes era o de
     Águeda, em Portugal, com 21 m). Pelas fotos que o Thales mandou ("o papai noel é em formato de cone, árvore de
     Natal"): o corpo é um cone vermelho com arabescos brancos, os lados e os braços (verdes no de verdade, dourados
     aqui, que verde não entra no Corre), as luvas de ouro segurando o painel do coração, a barba, o gorro caído pro lado,
     os dois arcos escuros no pé e os presentes na balsa. Em volta, no lago: as árvores de luz, os presentes boiando e os
     cisnes; na orla, o letreiro #EU ❤ LONDRINA e os postes curvos de luz. E os fogos, de tempo em tempo */
  const NOEL = { V: '#D42A35', VE: '#9E1C26', L: '#E3A934', LE: '#B37A1E', B: '#F6F3EC', BE: '#D7D2C8', P: '#F1C19B', K: '#17181D' };
  const NOEL_W = 520, NOEL_ESQ = 260, NOEL_TOPO = 532, NOEL_BAIXO = 40;
  /* o sino do corpo (lados dourados) e o painel vermelho do meio, do ombro (-330) até a balsa (-22) */
  const sinoNoel = (ctx, a, b) => { ctx.beginPath(); ctx.moveTo(-a, -330); ctx.quadraticCurveTo(-a - 40, -150, -b, -22); ctx.lineTo(b, -22); ctx.quadraticCurveTo(a + 40, -150, a, -330); ctx.closePath(); };
  function spriteNoel(k){
    const M = 16, W = NOEL_W + M * 2, H = NOEL_TOPO + NOEL_BAIXO + M * 2, { cv, ctx } = folha(W, H, k), cx = M + NOEL_ESQ, by = M + NOEL_TOPO;
    ctx.translate(cx, by);
    const elip = (x, y, rx, ry, cor, lw) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); forma(ctx, cor, lw || 2.4); };
    const ret = (x, y, w, h, cor, lw) => { ctx.beginPath(); ctx.rect(x, y, w, h); forma(ctx, cor, lw || 2.4); };
    const risco = (cor, lw) => { ctx.strokeStyle = cor; ctx.lineWidth = lw; ctx.stroke(); };
    /* as quatro âncoras (os cabos somem na água) e a balsa */
    ctx.strokeStyle = 'rgba(30,34,42,.8)'; ctx.lineWidth = 2; [[-180, -236, 30], [-150, -178, 36], [150, 178, 36], [180, 236, 30]].forEach(([a, b, d]) => { ctx.beginPath(); ctx.moveTo(a, -6); ctx.lineTo(b, d); ctx.stroke(); });
    ret(-198, -24, 396, 24, '#2B2F38'); ctx.fillStyle = '#4A4E56'; for(let x = -190; x < 190; x += 46) ctx.fillRect(x, -8, 32, 3);
    /* o corpo: o sino dourado, o painel vermelho com a sombra e os pontinhos de LED, e o pelo branco nas bordas */
    sinoNoel(ctx, 72, 178); forma(ctx, NOEL.L); ctx.save(); sinoNoel(ctx, 72, 178); ctx.clip(); ctx.fillStyle = NOEL.LE; ctx.fillRect(110, -340, 120, 330); ctx.restore();
    sinoNoel(ctx, 44, 120); ctx.fillStyle = NOEL.VE; ctx.fill(); ctx.save(); sinoNoel(ctx, 44, 120); ctx.clip();
    ctx.fillStyle = NOEL.V; ctx.beginPath(); ctx.ellipse(-24, -170, 120, 210, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,190,190,.3)'; for(let y = -326; y < -24; y += 10) for(let x = -124 + (Math.abs(y / 10) % 2 ? 5 : 0); x < 124; x += 10) ctx.fillRect(x, y, 2, 2);
    /* os arabescos brancos do painel */
    ctx.lineCap = 'round'; ctx.strokeStyle = NOEL.B; ctx.lineWidth = 3.2;
    [[-40, -150, 1], [36, -116, -1], [-56, -84, -1], [52, -184, 1], [0, -62, 1]].forEach(([x, y, d]) => { ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 1.6 * d, d < 0); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + 9 * d, y); ctx.bezierCurveTo(x + 30 * d, y - 6, x + 26 * d, y + 30, x + 4 * d, y + 34); ctx.stroke(); ctx.beginPath(); ctx.arc(x + 4 * d, y + 40, 6, -Math.PI / 2, Math.PI, d > 0); ctx.stroke(); });
    ctx.restore(); ctx.lineCap = 'butt';
    sinoNoel(ctx, 44, 120); risco(NOEL.B, 5); sinoNoel(ctx, 72, 178); risco(INK, 2.4);
    ret(-180, -34, 360, 14, NOEL.B, 2); ctx.fillStyle = NOEL.BE; for(let x = -172; x < 172; x += 16) ctx.fillRect(x, -26, 8, 3);
    /* os dois arcos escuros no pé (como no de verdade) */
    [-48, 48].forEach(x => { ctx.beginPath(); ctx.moveTo(x - 26, -34); ctx.lineTo(x - 26, -66); ctx.arc(x, -66, 26, Math.PI, 0); ctx.lineTo(x + 26, -34); ctx.closePath(); ctx.fillStyle = '#2A1418'; ctx.fill(); risco(NOEL.B, 3); });
    /* os presentes na frente da balsa */
    [[-172, 30, 26], [-140, 24, 20], [116, 26, 22], [146, 30, 28]].forEach(([x, w, h], i) => { ret(x, -22 - h, w, h, i % 2 ? '#FFB347' : NOEL.L, 2); ctx.fillStyle = NOEL.V; ctx.fillRect(x + w / 2 - 2, -22 - h, 4, h); ctx.fillRect(x, -22 - h / 2 - 2, w, 4); });
    /* os braços dourados descendo do ombro, as luvas de ouro e o painel do coração no meio */
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    [-1, 1].forEach(l => { ctx.beginPath(); ctx.moveTo(l * 66, -328); ctx.lineTo(l * 100, -286); ctx.lineTo(l * 84, -246); risco(INK, 39); risco(NOEL.L, 34); });
    ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
    ret(-64, -300, 128, 96, NOEL.B, 2.4); ret(-56, -292, 112, 80, '#BFE3FF', 1.6);
    ctx.beginPath(); ctx.moveTo(0, -224); ctx.bezierCurveTo(-46, -252, -40, -290, -16, -284); ctx.quadraticCurveTo(-4, -282, 0, -270); ctx.quadraticCurveTo(4, -282, 16, -284); ctx.bezierCurveTo(40, -290, 46, -252, 0, -224); ctx.closePath(); forma(ctx, NOEL.V, 2);
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(-26, -276, 8, 4);
    elip(-70, -252, 20, 20, '#F2C14E'); elip(70, -252, 20, 20, '#F2C14E');
    /* a cabeça: o laço vermelho embaixo da barba, o rosto, a barba, o bigode, o nariz, as bochechas e os olhos */
    ctx.fillStyle = NOEL.V; ctx.beginPath(); ctx.moveTo(0, -308); ctx.lineTo(-22, -318); ctx.lineTo(-22, -298); ctx.closePath(); ctx.moveTo(0, -308); ctx.lineTo(22, -318); ctx.lineTo(22, -298); ctx.closePath(); forma(ctx, NOEL.V, 1.6);
    elip(0, -372, 40, 34, NOEL.P);
    ctx.beginPath(); ctx.moveTo(-44, -378); ctx.quadraticCurveTo(-54, -318, 0, -306); ctx.quadraticCurveTo(54, -318, 44, -378); ctx.quadraticCurveTo(24, -352, 0, -354); ctx.quadraticCurveTo(-24, -352, -44, -378); ctx.closePath(); forma(ctx, NOEL.B);
    ctx.strokeStyle = NOEL.BE; ctx.lineWidth = 2; for(let i = 0; i < 5; i++){ ctx.beginPath(); ctx.arc(-28 + i * 14, -332 + (i % 2) * 8, 6, .2, Math.PI - .2); ctx.stroke(); }
    elip(-14, -360, 17, 8, NOEL.B, 2); elip(14, -360, 17, 8, NOEL.B, 2); elip(0, -369, 8, 7, '#E9917C', 2);
    ctx.fillStyle = 'rgba(240,120,120,.55)'; ctx.beginPath(); ctx.ellipse(-24, -372, 7, 5, 0, 0, Math.PI * 2); ctx.ellipse(24, -372, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = NOEL.K; ctx.fillRect(-18, -392, 6, 8); ctx.fillRect(12, -392, 6, 8); ctx.fillStyle = PAPEL; ctx.fillRect(-16, -391, 2, 2); ctx.fillRect(14, -391, 2, 2);
    ret(-24, -402, 15, 5, NOEL.B, 1.4); ret(9, -402, 15, 5, NOEL.B, 1.4);
    /* o gorro caindo pro lado, a aba de pelo e o pompom */
    ctx.beginPath(); ctx.moveTo(-42, -414); ctx.quadraticCurveTo(-32, -482, 20, -502); ctx.quadraticCurveTo(66, -514, 86, -472); ctx.lineTo(72, -464); ctx.quadraticCurveTo(54, -482, 32, -474); ctx.quadraticCurveTo(46, -442, 44, -414); ctx.closePath(); forma(ctx, NOEL.V);
    ctx.fillStyle = NOEL.VE; ctx.beginPath(); ctx.moveTo(30, -472); ctx.quadraticCurveTo(44, -444, 42, -416); ctx.lineTo(32, -416); ctx.quadraticCurveTo(32, -446, 22, -468); ctx.closePath(); ctx.fill();
    ret(-48, -420, 96, 22, NOEL.B); ctx.fillStyle = NOEL.BE; for(let x = -42; x < 44; x += 13) ctx.fillRect(x, -405, 7, 3);
    elip(84, -466, 16, 15, NOEL.B);
    return { cv, W, H, M: cx, base: by };
  }
  /* o contorno de luz: os pontos são contados uma vez (o gorro, o pompom, a aba, a barba, o sino, o painel vermelho, a
     barra, os arcos, o painel do coração e a balsa); a cada quadro uma falha escura corre em volta, como o pisca-pisca
     que "anda" */
  let NOEL_LUZ = null;
  function luzesNoel(){
    if(NOEL_LUZ) return NOEL_LUZ; const P = [];
    const arco = (cx, cy, rx, ry, a0, a1, p) => { const n = Math.max(3, Math.round(Math.abs(a1 - a0) * (rx + ry) / 2 / p)); for(let i = 0; i <= n; i++){ const a = a0 + (a1 - a0) * i / n; P.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } };
    const reta = (x0, y0, x1, y1, p) => { const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / p)); for(let i = 0; i <= n; i++) P.push([x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n]); };
    const curva = (x0, y0, qx, qy, x1, y1, p) => { const n = Math.max(3, Math.round(Math.hypot(x1 - x0, y1 - y0) / p)); for(let i = 0; i <= n; i++){ const s = i / n, m = 1 - s; P.push([m * m * x0 + 2 * m * s * qx + s * s * x1, m * m * y0 + 2 * m * s * qy + s * s * y1]); } };
    curva(-46, -416, -36, -486, 20, -506, 10); curva(20, -506, 70, -518, 90, -474, 10); arco(84, -466, 19, 18, 0, Math.PI * 2, 8);
    reta(-52, -422, 52, -422, 10); curva(-46, -378, -58, -314, 0, -302, 10); curva(0, -302, 58, -314, 46, -378, 10);
    [[72, 178, 12], [44, 120, 12]].forEach(([a, b, p]) => { curva(-a, -330, -a - 40, -150, -b, -24, p); curva(a, -330, a + 40, -150, b, -24, p); });
    reta(-184, -36, 184, -36, 12); reta(-196, -26, 196, -26, 14); arco(-48, -66, 30, 30, Math.PI, Math.PI * 2, 8); arco(48, -66, 30, 30, Math.PI, Math.PI * 2, 8);
    reta(-68, -304, 68, -304, 10); reta(-68, -200, 68, -200, 10); reta(-68, -304, -68, -200, 10); reta(68, -304, 68, -200, 10);
    return (NOEL_LUZ = P);
  }
  function luzesVivas(ctx, n, t){
    const u = 1 / V.k, cab = Math.floor(t * 9), P = luzesNoel();
    P.forEach(([x, y], i) => { const f = ((cab - i) % 26 + 26) % 26; if(f < 3) return; ctx.fillStyle = f < 6 ? PAPEL : i % 7 === 0 ? OURO_N : '#FFF3C4'; ctx.fillRect(sn(n.x + x - u / 2), sn(n.y + y - u / 2), u, u); });
    /* o brilho que pisca solto pelo corpo */
    const r = rng(Math.floor(t * 4) + 7); ctx.fillStyle = PAPEL;
    for(let i = 0; i < 22; i++){ const y = -40 - r() * 280, a = 72 + (178 - 72) * (y + 330) / 308, x = (r() - .5) * 2 * a; ctx.fillRect(sn(n.x + x), sn(n.y + y), u, u); }
  }
  /* os fogos: de tempo em tempo uma rajada dourada (às vezes com vermelho) estoura em volta dele, como na foto */
  function fogosNoel(ctx, n, t){
    const u = 1 / V.k;
    for(let j = 0; j < 3; j++){
      const ciclo = 3.4, fase = t / ciclo + j / 3, i = Math.floor(fase), f = fase - i; if(f > .55) continue;
      const r = rng(i * 7 + j * 131), cx = n.x + (r() < .5 ? -1 : 1) * (150 + r() * 160), cy = n.y - 380 - r() * 200, raio = 50 + r() * 50, vermelho = r() < .3;
      if(f < .12){ const s = f / .12; ctx.fillStyle = 'rgba(255,230,170,.9)'; ctx.fillRect(sn(cx), sn(n.y - 40 - (n.y - 40 - cy) * s), u, u * 4); continue; }
      const p = (f - .12) / .43, a = 1 - p, R = raio * Math.sqrt(p);
      if(f - .12 < .02 && V.eu && Math.hypot(V.eu.x - n.x, V.eu.y - n.y) < 700 && C.versoSom && V.fogoT !== i * 3 + j){ V.fogoT = i * 3 + j; C.versoSom.rio('fogo'); }
      for(let q = 0; q < 26; q++){ const ang = q / 26 * Math.PI * 2 + i, x = cx + Math.cos(ang) * R, y = cy + Math.sin(ang) * R + p * p * 30;
        ctx.fillStyle = `rgba(${vermelho && q % 3 === 0 ? '255,90,90' : q % 2 ? '255,214,120' : '255,243,196'},${a.toFixed(2)})`; ctx.fillRect(sn(x), sn(y), u, u);
        ctx.fillStyle = `rgba(255,214,120,${(a * .5).toFixed(2)})`; ctx.fillRect(sn(cx + Math.cos(ang) * R * .7), sn(cy + Math.sin(ang) * R * .7 + p * p * 20), u, u); }
    }
  }
  /* o que fica na água em volta (as árvores de luz, os presentes boiando e os cisnes) e o reflexo de cada um */
  function palmaLuz(ctx, x, y, t, i){
    const u = 1 / V.k; ctx.fillStyle = 'rgba(15,18,24,.4)'; ctx.fillRect(x - 10, y - 2, 20, 4); ctx.fillStyle = '#EEEBE4'; ctx.fillRect(x - 1, y - 64, 3, 64);
    ctx.lineWidth = Math.max(1, .6 / V.k); for(let a = 0; a < 9; a++){ const d = (a - 4) / 4, ex = x + d * 30, ey = y - 46 + Math.abs(d) * 18; ctx.strokeStyle = a % 2 ? 'rgba(255,214,120,.9)' : 'rgba(255,243,196,.95)'; ctx.beginPath(); ctx.moveTo(x, y - 64); ctx.quadraticCurveTo(x + d * 22, y - 76, ex, ey); ctx.stroke(); if((Math.floor(t * 3) + a + i) % 4) { ctx.fillStyle = PAPEL; ctx.fillRect(sn(ex - u / 2), sn(ey), u, u); } }
  }
  function presenteBoia(ctx, x, y, t, i){
    const b = Math.sin(t * 1.8 + i) * 1.5; ctx.fillStyle = 'rgba(15,40,80,.35)'; ctx.fillRect(x - 11, y + 1, 22, 3);
    ctx.beginPath(); ctx.rect(x - 9, y - 16 + b, 18, 16); forma(ctx, i % 3 === 1 ? '#FFB347' : NOEL.V, 1.4); ctx.fillStyle = OURO_N; ctx.fillRect(x - 1.5, y - 16 + b, 3, 16); ctx.fillRect(x - 9, y - 9.5 + b, 18, 3); ctx.fillRect(x - 5, y - 20 + b, 4, 4); ctx.fillRect(x + 1, y - 20 + b, 4, 4);
  }
  function cisne(ctx, x, y, t, i){
    const d = Math.sin(t * .12 + i * 2) > 0 ? 1 : -1, b = Math.sin(t * 1.5 + i) > .2 ? 1 / V.k : 0; y += b;
    ctx.fillStyle = 'rgba(15,40,80,.3)'; ctx.fillRect(x - 14, y + 1, 28, 3);
    ctx.beginPath(); ctx.ellipse(x, y - 6, 13, 7, 0, 0, Math.PI * 2); forma(ctx, '#F6F3EC', 1.4);
    ctx.fillStyle = '#F6F3EC'; ctx.fillRect(x + d * 7 - 2, y - 22, 4, 14); ctx.fillRect(x + d * 7 - 2 + d * 2, y - 24, 6 * d, 4); ctx.fillStyle = LARANJA; ctx.fillRect(x + d * 13 - (d < 0 ? 4 : 0), y - 23, 4, 2); ctx.fillStyle = INK; ctx.fillRect(x + d * 9, y - 23, 1.5, 1.5);
  }
  function enfeiteAgua(ctx, o, t){ if(o.k === 'palma') palmaLuz(ctx, o.x, o.y, t, o.i); else if(o.k === 'presente') presenteBoia(ctx, o.x, o.y, t, o.i); else cisne(ctx, o.x + Math.sin(t * .1 + o.i) * 40, o.y + Math.cos(t * .13 + o.i) * 10, t, o.i); }
  /* o letreiro #EU ❤ LONDRINA da orla (letra grande de pixel, o coração vermelho) */
  function letreiroLondrina(ctx, x, y){
    ctx.fillStyle = 'rgba(15,18,24,.3)'; ctx.fillRect(x - 70, y - 2, 140, 5); bloco(ctx, x - 66, y - 8, 132, 8, 'concreto', true);
    pixTxt(ctx, 'LONDRINA', x, y - 18, 3, PAPEL); pixTxt(ctx, 'EU', x - 16, y - 40, 3, PAPEL);
    const u = 1 / V.k, hx = x + 14, hy = y - 46; ctx.fillStyle = VERM_N; [[1, 0, 2], [4, 0, 2], [0, 1, 7], [0, 2, 7], [1, 3, 5], [2, 4, 3], [3, 5, 1]].forEach(([dx, dy, w]) => ctx.fillRect(sn(hx + dx * u * 1.5), sn(hy + dy * u * 1.5), w * u * 1.5, u * 1.5));
    ctx.fillStyle = PAPEL; ctx.fillRect(sn(x - 44), sn(y - 46), u * 1.5, u * 6); ctx.fillRect(sn(x - 47), sn(y - 43), u * 6, u * 1.5); ctx.fillRect(sn(x - 47), sn(y - 39), u * 6, u * 1.5); ctx.fillRect(sn(x - 41), sn(y - 46), u * 1.5, u * 6);
  }
  /* o poste curvo de luz da orla (o de verdade é um arco branco aceso) */
  function arcoLuz(ctx, p){
    ctx.lineWidth = 3; ctx.strokeStyle = '#EEEBE4'; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo(p.x - 18, p.y - 40, p.x + 10, p.y - 78); ctx.stroke();
    for(let j = 0; j < 8; j++){ const s = j / 7, m = 1 - s, x = m * m * p.x + 2 * m * s * (p.x - 18) + s * s * (p.x + 10), y = m * m * p.y + 2 * m * s * (p.y - 40) + s * s * (p.y - 78); lampada(ctx, x - .5 / V.k, y, j + p.x); }
  }
  /* olhar o Papai Noel: a câmera se afasta (zoom 1, sem gravar a preferência da pessoa) e sobe até ele; voltaZoom devolve */
  const olhaNoel = ms => { if(!(V.cid && V.cid.lago && V.cid.lago.noel)) return; if(!V.olhaNoel && !V.zoomAntes && zoomFator() > 1.02){ V.zoomAntes = zoomFator(); V.zoomF = 1; tamanhoTela(); } V.olhaNoel = Date.now() + ms; };
  function voltaZoom(){ V.olhaNoel = 0; if(V.zoomAntes){ V.zoomF = V.zoomAntes; V.zoomAntes = 0; if(V.vivo) tamanhoTela(); } }
  function noelNaFila(L, ctx, t, vis){
    const l = V.cid.lago, n = l && l.noel; if(!n || !natal()) return;
    n.agua.forEach(o => { if(vis(o.x, o.y, 120)){ L.push({ y: o.y, f: () => enfeiteAgua(ctx, o, t) }); if(o.k === 'palma') luz(o.x, o.y - 34, 70, .85); } });
    if(n.letreiro && vis(n.letreiro.x, n.letreiro.y, 120)){ L.push({ y: n.letreiro.y, f: () => letreiroLondrina(ctx, n.letreiro.x, n.letreiro.y) }); luz(n.letreiro.x, n.letreiro.y - 24, 110, .9); }
    if(!vis(n.x, n.y, 420)) return;
    L.push({ y: n.y, f: () => {
      /* o ar em volta acende (a luz dele de longe) */
      const g = ctx.createRadialGradient(n.x, n.y - 290, 40, n.x, n.y - 290, 340); g.addColorStop(0, 'rgba(255,214,150,.2)'); g.addColorStop(1, 'rgba(255,214,150,0)'); ctx.fillStyle = g; ctx.fillRect(n.x - 340, n.y - 630, 680, 640);
      const k = V.kr || V.k; let s = V.sprites.get('noel'); if(!s){ s = spriteNoel(k); guardaSprite('noel', s); }
      ctx.drawImage(s.cv, n.x - s.M, n.y - s.base, s.cv.width / k, s.cv.height / k); luz(n.x, n.y - 260, 380, 1);
      luzesVivas(ctx, n, t); fogosNoel(ctx, n, t);
    } });
  }
  /* ---------------- v4.03 · o Lambe-Lambe do Noel (a barraquinha da foto) ----------------
     O Thales: "um lugar onde as pessoas podem tirar foto em frente ao papai noel, a foto sai revelada tipo polaroid e a
     pessoa pode compartilhar no insta"; "o personagem dele na frente e o papai noel em segundo plano"; "tipo uma
     barraquinha"; "uma experiência que todo londrinense gostaria de ter". Na barraquinha da orla do Igapó: escolhe o
     acessório (gorro do Noel ou chifre de rena) e a legenda, o Seu Zé do Lambe-Lambe grita "olha o passarinho!", 3, 2, 1,
     o flash, sai um passarinho da câmera e a polaroid desliza pra fora e revela devagar (do escuro pra cor, como a de
     verdade; chacoalhar não adianta, mas pode). A foto é montada aqui, não é print da tela: o céu da hora, os prédios da
     Gleba acesos do outro lado do lago, o Papai Noel desfocado lá atrás com o reflexo na água, os fogos de noite, a grade
     da orla com o #EU ❤ LONDRINA no canto e o teu boneco grande na frente, com quem tiver do teu lado (até 3, gente de
     verdade, sem morador). Postar no Insta manda a imagem pronta (1080x1350: a polaroid inclinada num fundo de luzinhas
     e "feito no Correverso") pelo compartilhar do celular; sem ele, baixa o arquivo. Nada vai pro banco. */
  const PO = { on: false, el: null, foto: null, card: null, t: [], aces: 'gorro', leg: 0, gente: [] };
  const POLA_LEG = ['Natal pé-vermelho', 'Eu e o maior Papai Noel do mundo', 'Feliz Natal, Londrina!'];
  const POLA_ACES = [['gorro', 'Gorro do Noel'], ['rena', 'Chifre de rena'], ['nada', 'Sem nada']];
  const POLA_CHACO = ['Não precisa chacoalhar. Mas pode.', 'Chacoalhar não acelera, mas o OutKast mandou.', 'A química é que revela, viu? Calma.'];
  try{ const o = JSON.parse(localStorage.getItem('corre-pola') || 'null'); if(o){ if(POLA_ACES.some(a => a[0] === o.aces)) PO.aces = o.aces; if(o.leg >= 0 && o.leg < POLA_LEG.length) PO.leg = o.leg; } }catch(e){}
  let POLA_FONTE = null;
  /* a letra da legenda é a de pixel do Studio (lab/fontes), a mesma cara do Correverso */
  function fontePola(){
    if(!POLA_FONTE){ POLA_FONTE = { pronta: Promise.resolve() }; if(window.FontFace && document.fonts){ const f = new FontFace('CorrePixel', 'url(lab/fontes/pixel.ttf)'); POLA_FONTE.pronta = f.load().then(x => { document.fonts.add(x); }).catch(() => {}); } }
    return POLA_FONTE.pronta;
  }
  /* o boneco num quadrinho de 40x44 (sobra em cima pro gorro e o chifre), de frente, com o acessório */
  function bonecoPola(av, aces){
    const cv = document.createElement('canvas'); cv.width = 40; cv.height = 44; const g = cv.getContext('2d');
    skin(g, av, 20, 42, 'baixo', null, 1);
    const px = g.getImageData(0, 0, 40, 44).data, cheio = (x, y) => px[(y * 40 + x) * 4 + 3] > 40;
    let topo = -1; for(let y = 0; y < 44 && topo < 0; y++) for(let x = 0; x < 40; x++) if(cheio(x, y)){ topo = y; break; }
    if(topo < 0 || aces === 'nada') return cv;
    let e = 40, d = -1; for(let y = topo; y < topo + 4; y++) for(let x = 0; x < 40; x++) if(cheio(x, y)){ e = Math.min(e, x); d = Math.max(d, x); }
    const cx = Math.round((e + d) / 2), w = Math.max(6, d - e + 1), R = (x, y, ww, hh, c) => { g.fillStyle = c; g.fillRect(x, y, ww, hh); };
    if(aces === 'gorro'){
      R(cx - Math.ceil(w / 2) - 1, topo, w + 2, 2, '#F6F3EC');
      R(cx - Math.ceil(w / 2) + 1, topo - 3, w - 2, 3, '#D42A35'); R(cx - 2, topo - 5, Math.ceil(w / 2) + 1, 2, '#D42A35'); R(cx + Math.ceil(w / 2) - 1, topo - 4, 2, 2, '#D42A35');
      R(cx + Math.ceil(w / 2), topo - 3, 2, 2, '#F6F3EC'); R(cx - Math.ceil(w / 2) + 1, topo - 1, w - 2, 1, '#9E1C26');
    }else if(aces === 'rena'){
      /* (o chifre nasce 2 pontos pra dentro: o contorno escuro da cabeça some no céu de noite e ele parecia boiar) */
      const M = '#7A4A2A', tb = topo + 2; [-1, 1].forEach(l => { const bx = cx + l * Math.max(2, Math.floor(w / 2) - 1); R(bx, tb - 5, 1, 5, M); R(bx + l, tb - 6, 1, 2, M); R(bx + l * 2, tb - 7, 1, 2, M); R(bx - l, tb - 7, 1, 2, M); R(bx + l, tb - 4, 2, 1, M); });
      R(cx - 1, topo + 7, 2, 2, '#E8303A');
    }
    return cv;
  }
  /* a foto (quadrada): S pontos de lado */
  function retratoNoel(S, gente, aces){
    const cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d'), c = ceuAgora(), nt = c.escuro > .45, tarde = !nt && c.quente > .3;
    const r = rng(hash('pola:' + C.hojeBR())), agua = S * .64;
    /* o céu da hora */
    const ce = g.createLinearGradient(0, 0, 0, agua);
    if(nt){ ce.addColorStop(0, '#080B26'); ce.addColorStop(1, '#2B2766'); } else if(tarde){ ce.addColorStop(0, '#3A3C8C'); ce.addColorStop(.62, '#E2687E'); ce.addColorStop(1, '#FFB36E'); } else { ce.addColorStop(0, '#5E9AD8'); ce.addColorStop(1, '#D3E6F7'); }
    g.fillStyle = ce; g.fillRect(0, 0, S, agua);
    if(nt){ g.fillStyle = '#FFFFFF'; for(let i = 0; i < 70; i++){ const s = r() < .15 ? 2 : 1; g.globalAlpha = .4 + r() * .6; g.fillRect(r() * S, r() * agua * .7, s * S / 600, s * S / 600); } g.globalAlpha = 1; }
    /* os prédios da Gleba do outro lado do lago (acesos de noite) */
    const pr = rng(hash('gleba-pola')); let x = -S * .02;
    while(x < S){ const w = S * (.035 + pr() * .05), h = S * (.06 + pr() * pr() * .2), y0 = agua - S * .015 - h;
      g.fillStyle = nt ? '#171A3C' : tarde ? '#5A4A78' : '#9DB3CC'; g.fillRect(x, y0, w, h + S * .02);
      g.fillStyle = nt ? 'rgba(255,214,140,.85)' : tarde ? 'rgba(255,200,150,.5)' : 'rgba(255,255,255,.45)';
      const jw = Math.max(1, w / 9), jh = Math.max(1, S / 300); for(let yy = y0 + S * .01; yy < agua - S * .02; yy += jh * 3) for(let xx = x + jw; xx < x + w - jw; xx += jw * 2.2) if(pr() < (nt ? .45 : .7)) g.fillRect(xx, yy, jw, jh);
      x += w + S * (.004 + pr() * .02); }
    /* a margem do lado de lá (ipê amarelo e rosa, nada de verde) e o lago */
    g.fillStyle = nt ? '#151633' : '#4A3F5C'; g.fillRect(0, agua - S * .018, S, S * .022);
    for(let i = 0; i < 26; i++){ const tx = r() * S, tr = S * (.012 + r() * .016); g.fillStyle = nt ? 'rgba(90,70,40,.9)' : r() < .5 ? '#E8B83A' : '#E07AA6'; g.beginPath(); g.arc(tx, agua - S * .016, tr, Math.PI, 0); g.fill(); }
    const ag = g.createLinearGradient(0, agua, 0, S); ag.addColorStop(0, nt ? '#151B44' : tarde ? '#6A5A8E' : '#4D7FB5'); ag.addColorStop(1, nt ? '#0A0E26' : '#2C4E7E'); g.fillStyle = ag; g.fillRect(0, agua, S, S - agua);
    /* o Papai Noel lá atrás, desfocado (a foto foca em quem tá na frente), com o ar aceso em volta */
    const nx = S * .6, nb = agua + S * .02, k = (S * .5) / NOEL_TOPO, sp = spriteNoel(k);
    const luzG = g.createRadialGradient(nx, nb - S * .3, S * .02, nx, nb - S * .3, S * .42); luzG.addColorStop(0, nt ? 'rgba(255,214,150,.45)' : 'rgba(255,230,190,.22)'); luzG.addColorStop(1, 'rgba(255,214,150,0)'); g.fillStyle = luzG; g.fillRect(0, 0, S, agua + S * .1);
    const temFiltro = 'filter' in g;
    if(temFiltro) g.filter = `blur(${Math.max(1, S / 520).toFixed(1)}px)`;
    g.drawImage(sp.cv, nx - sp.M * k, nb - sp.base * k, sp.cv.width, sp.cv.height);
    /* o reflexo na água (de cabeça pra baixo, apagado e cortado em listras) */
    g.save(); g.beginPath(); g.rect(0, nb, S, S - nb); g.clip(); g.globalAlpha = nt ? .32 : .2; g.translate(0, nb * 2); g.scale(1, -1); g.drawImage(sp.cv, nx - sp.M * k, nb - sp.base * k, sp.cv.width, sp.cv.height); g.restore();
    if(temFiltro) g.filter = 'none';
    g.fillStyle = nt ? 'rgba(10,14,38,.5)' : 'rgba(40,70,110,.35)'; for(let yy = nb + 2; yy < S; yy += S / 90) g.fillRect(0, yy, S, S / 360);
    /* as luzinhas do contorno dele (de noite brilham mais) */
    luzesNoel().forEach(([px, py], i) => { if(i % 2) return; const lx = nx + px * k, ly = nb + py * k; g.fillStyle = nt ? 'rgba(255,240,200,.95)' : 'rgba(255,250,230,.7)'; g.beginPath(); g.arc(lx, ly, S / 520, 0, Math.PI * 2); g.fill(); if(nt){ g.fillStyle = 'rgba(255,214,140,.18)'; g.beginPath(); g.arc(lx, ly, S / 160, 0, Math.PI * 2); g.fill(); } });
    /* os fogos (de noite): duas rajadas douradas */
    if(nt) [[S * .2, S * .16, S * .1], [S * .88, S * .1, S * .08]].forEach(([fx, fy, fr], j) => { for(let q = 0; q < 28; q++){ const a = q / 28 * Math.PI * 2, rr = fr * (.75 + (q % 3) * .12); g.fillStyle = j && q % 4 === 0 ? 'rgba(255,110,110,.9)' : q % 2 ? 'rgba(255,214,120,.95)' : 'rgba(255,243,196,.95)'; g.fillRect(fx + Math.cos(a) * rr, fy + Math.sin(a) * rr, S / 300, S / 300); g.fillStyle = 'rgba(255,214,120,.35)'; g.fillRect(fx + Math.cos(a) * rr * .55, fy + Math.sin(a) * rr * .55, S / 400, S / 400); } });
    /* a calçada e a grade da orla, com o #EU ❤ LONDRINA no canto */
    const ch = S * .84; g.fillStyle = nt ? '#3A3A4A' : '#B9B2A6'; g.fillRect(0, ch, S, S - ch); g.fillStyle = nt ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.08)'; for(let xx = 0; xx < S; xx += S / 14) g.fillRect(xx, ch, S / 400, S - ch);
    g.fillStyle = nt ? '#C9C6D6' : '#F2EFE8'; g.fillRect(0, S * .79, S, S / 110); g.fillRect(0, S * .815, S, S / 160); for(let xx = S * .02; xx < S; xx += S / 13) g.fillRect(xx, S * .79, S / 150, ch - S * .79);
    g.save(); g.font = `${Math.round(S * .03)}px CorrePixel, monospace`; g.textAlign = 'right'; g.fillStyle = '#FFFFFF'; g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = S / 120;
    g.fillText('EU', S * .9, S * .735); g.fillStyle = '#E8303A'; g.fillText('♥', S * .945, S * .735); g.fillStyle = '#FFFFFF'; g.fillText('LONDRINA', S * .985, S * .775); g.restore();
    /* a gente, grande, na frente (o pixel esticado sem alisar) */
    const n = gente.length, e = Math.max(2, Math.floor(Math.min(S * .66 / 40, S * .92 / (n * 26)))), larg = n * 26 * e, x0 = (n === 1 ? S * .34 : S / 2) - larg / 2;
    g.imageSmoothingEnabled = false;
    gente.forEach((p, i) => { const b = bonecoPola(p.av, p.eu ? aces : 'nada'), bx = x0 + i * 26 * e - 7 * e, by = S * 1.005 - 44 * e;
      g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(bx + 20 * e, by + 42 * e, 9 * e, 2 * e, 0, 0, Math.PI * 2); g.fill();
      g.drawImage(b, bx, by, 40 * e, 44 * e); });
    g.imageSmoothingEnabled = true;
    /* o flash: a frente mais clara, as bordas mais escuras, um tom quente de filme e o grão */
    const fl = g.createRadialGradient(S * .4, S * .78, S * .05, S * .4, S * .78, S * .5); fl.addColorStop(0, 'rgba(255,255,255,.14)'); fl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = fl; g.fillRect(0, 0, S, S);
    const vg = g.createRadialGradient(S / 2, S / 2, S * .35, S / 2, S / 2, S * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.35)'); g.fillStyle = vg; g.fillRect(0, 0, S, S);
    g.fillStyle = 'rgba(255,214,170,.06)'; g.fillRect(0, 0, S, S);
    const gr = rng(hash('grao')); for(let i = 0; i < S * 3; i++){ g.fillStyle = gr() < .5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)'; g.fillRect(gr() * S, gr() * S, S / 400, S / 400); }
    return cv;
  }
  /* a imagem pra postar (1080x1350, o 4:5 do feed; no story fica no meio): a polaroid inclinada num fundo de luzinhas */
  function cartaoPola(foto, handle, leg, data){
    const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    const bg = g.createRadialGradient(W / 2, H * .45, 60, W / 2, H * .45, H * .8); bg.addColorStop(0, '#2A2766'); bg.addColorStop(1, '#090B22'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const r = rng(hash('bokeh')); ['255,214,120', '255,90,90', '255,243,196', '255,122,184'].forEach((cor, j) => { for(let i = 0; i < 9; i++){ const x = r() * W, y = r() * H, rr = 20 + r() * 70, b = g.createRadialGradient(x, y, 0, x, y, rr); b.addColorStop(0, `rgba(${cor},.35)`); b.addColorStop(1, `rgba(${cor},0)`); g.fillStyle = b; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); } });
    const cw = 820, fp = 44, fs = cw - fp * 2, chh = fs + fp + 210;
    g.save(); g.translate(W / 2, H * .47); g.rotate(-.04);
    g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 50; g.shadowOffsetY = 18; g.fillStyle = '#F7F4EC'; g.fillRect(-cw / 2, -chh / 2, cw, chh); g.shadowColor = 'transparent';
    g.drawImage(foto, -cw / 2 + fp, -chh / 2 + fp, fs, fs);
    g.fillStyle = '#1B1D24'; g.textAlign = 'center'; g.font = '52px CorrePixel, monospace'; g.fillText(leg, 0, -chh / 2 + fp + fs + 92, cw - 80);
    g.fillStyle = '#5A5D66'; g.font = '30px CorrePixel, monospace'; g.fillText(`@${handle} · Igapó, Londrina · ${data}`, 0, -chh / 2 + fp + fs + 150, cw - 80);
    g.restore();
    g.fillStyle = 'rgba(255,255,255,.75)'; g.textAlign = 'center'; g.font = '28px CorrePixel, monospace'; g.fillText('FEITO NO CORREVERSO · APP.CORRESOCIAL.COM', W / 2, H - 58);
    return cv;
  }
  const dataPola = () => { const d = C.hojeBR().split('-'); return `${d[2]}/${d[1]}/${d[0]}`; };
  /* quem sai na foto: você e até 3 pessoas de verdade a menos de 90 px (os moradores não) */
  function quemNaFoto(){
    const L = [{ eu: true, av: V.eu.av || avLimpo(C.st.me.verso, C.st.me.id), h: C.st.me.handle }];
    [...V.remotos.values()].filter(r => r && !r.bot && !r.npc && r.av && r.handle && Math.hypot(r.x - V.eu.x, r.y - V.eu.y) < 90).sort((a, b) => Math.hypot(a.x - V.eu.x, a.y - V.eu.y) - Math.hypot(b.x - V.eu.x, b.y - V.eu.y)).slice(0, 3)
      .forEach(r => L.push({ av: r.av, h: r.handle }));
    return L;
  }
  const prevAces = (cv, k) => { const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, cv.width, cv.height); g.fillStyle = '#E6DECD'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(bonecoPola(V.eu.av || avLimpo(C.st.me.verso, C.st.me.id), k), 0, 0, cv.width, cv.height); };
  /* a barraquinha: o acessório, a legenda e quem vai sair na foto */
  function fotoNoel(){
    if(PO.on || !V.eu || !C.st.me) return;
    V.alvo = null; V.eu.mov = false; V.teclas.clear(); fontePola();
    PO.gente = quemNaFoto();
    const outros = PO.gente.slice(1).map(p => '@' + p.h);
    C.sheet(`<div class="form pola-s"><div class="sheet-head"><h2>${ico('camera')} Lambe-Lambe do Noel</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p class="pola-ze">"Chega mais, que o Papai Noel não sai daí não. Escolhe o enfeite e olha o passarinho!" <small>Seu Zé do Lambe-Lambe</small></p>
      <fieldset class="pola-esc"><legend>Na cabeça</legend><div class="pola-aces" role="radiogroup">${POLA_ACES.map(([k, t]) => `<button type="button" role="radio" data-act="cvr-pola-aces" data-k="${k}" aria-checked="${PO.aces === k}"><canvas width="80" height="88" data-k="${k}" aria-hidden="true"></canvas><span>${t}</span></button>`).join('')}</div></fieldset>
      <fieldset class="pola-esc"><legend>A legenda</legend><div class="pola-legs" role="radiogroup">${POLA_LEG.map((t, i) => `<button type="button" role="radio" data-act="cvr-pola-leg" data-i="${i}" aria-checked="${PO.leg === i}">${esc(t)}</button>`).join('')}</div></fieldset>
      <p class="fine">${outros.length ? `Vai sair na foto: você e ${esc(outros.join(', '))}.` : 'Tá sozinho? Chama alguém pra chegar perto da barraquinha que sai junto na foto.'}</p>
      <div class="acts"><button type="button" class="btn pri" data-act="cvr-pola-tira">${ico('camera')} Tirar a foto</button></div></div>`, 'pola-folha');
    document.querySelectorAll('.pola-aces canvas').forEach(cv => prevAces(cv, cv.dataset.k));
  }
  const poAgenda = (f, ms) => { PO.t.push(setTimeout(f, ms)); };
  function fechaPola(){ PO.t.forEach(clearTimeout); PO.t = []; if(PO.el) PO.el.remove(); PO.el = null; PO.on = false; PO.foto = null; PO.card = null; }
  /* 3, 2, 1, o flash, o passarinho e a polaroid saindo */
  function tiraPola(){
    if(PO.on) return; C.closeSheet(); PO.on = true;
    const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches, som = k => { if(C.versoSom && C.versoSom.foto) C.versoSom.foto(k); };
    const el = document.createElement('div'); el.id = 'cvr-pola'; el.className = 'pola'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Foto com o Papai Noel');
    el.innerHTML = `<button type="button" class="pola-x" data-act="cvr-pola-x" aria-label="Fechar">${ico('x')}</button><p class="pola-grito">Olha o passarinho!</p><div class="pola-conta" aria-live="assertive"></div><div class="pola-flash"></div>`;
    document.body.appendChild(el); PO.el = el;
    const conta = el.querySelector('.pola-conta');
    const seq = ['3', '2', '1']; let i = 0;
    const vai = () => { if(!PO.on) return; if(i < seq.length){ conta.textContent = seq[i]; conta.classList.remove('pula'); void conta.offsetWidth; conta.classList.add('pula'); som('bip'); i++; poAgenda(vai, 750); } else fontePola().then(() => { if(PO.on) dispara(calmo, som); }); };
    poAgenda(vai, 500);
  }
  function dispara(calmo, som){
    const el = PO.el; if(!el) return;
    PO.foto = retratoNoel(960, PO.gente, PO.aces);
    const leg = POLA_LEG[PO.leg], h = C.st.me.handle, data = dataPola();
    PO.card = cartaoPola(PO.foto, h, leg, data);
    som('clique'); el.querySelector('.pola-conta').textContent = ''; el.querySelector('.pola-grito').hidden = true;
    const fl = el.querySelector('.pola-flash'); fl.classList.add('on'); poAgenda(() => fl.classList.remove('on'), 90);
    if(!calmo){ const p = document.createElement('i'); p.className = 'pola-passaro'; p.setAttribute('aria-hidden', 'true'); p.innerHTML = '<svg viewBox="0 0 16 12" width="48" height="36" shape-rendering="crispEdges"><path fill="#FFC93D" d="M4 4h6v1h2v1h2v1h-2v1H9v1H5V8H3V6h1z"/><path fill="#0F1218" d="M10 5h1v1h-1z"/><path fill="#FF8A3D" d="M14 6h2v1h-2z"/><path fill="#E8A92A" d="M5 2h3v2H5z"/></svg>'; el.appendChild(p); som('passarinho'); }
    poAgenda(() => {
      if(!PO.on) return; som('sai');
      el.insertAdjacentHTML('beforeend', `<div class="pola-palco"><figure class="pola-card${calmo ? ' pronta' : ''}"><div class="pola-foto"><img alt="${esc(`@${h} na frente do Papai Noel do Igapó`)}"><i class="pola-veu" aria-hidden="true"></i></div>
        <figcaption><b>${esc(leg)}</b><small>@${esc(h)} · Igapó, Londrina · ${esc(data)}</small></figcaption></figure></div>
        <p class="pola-st" aria-live="polite">${calmo ? 'Pronta!' : 'Revelando…'}${calmo ? '' : ` <button type="button" class="btn sm" data-act="cvr-pola-chaco">Chacoalhar</button>`}</p>
        <div class="pola-acts"${calmo ? '' : ' hidden'}><button type="button" class="btn pri" data-act="cvr-pola-insta">${ico('share')} Postar no Insta</button><button type="button" class="btn" data-act="cvr-pola-baixa">${ico('down')} Baixar</button>
          <button type="button" class="btn" data-act="cvr-pola-outra">${ico('camera')} Outra foto</button><button type="button" class="btn ghost" data-act="cvr-pola-x">Fechar</button></div>`);
      el.querySelector('.pola-foto img').src = PO.foto.toDataURL('image/jpeg', .9);
      if(calmo) return;
      const card = el.querySelector('.pola-card'); requestAnimationFrame(() => card.classList.add('sai'));
      poAgenda(() => card.classList.add('revela'), 1100);
      poAgenda(() => prontaPola(), 6200);
    }, calmo ? 200 : 700);
  }
  function prontaPola(){
    const el = PO.el; if(!el) return; const card = el.querySelector('.pola-card'); if(card) card.classList.add('revela', 'pronta');
    const st = el.querySelector('.pola-st'); if(st) st.textContent = 'Pronta! Ficou boa, hein.';
    const a = el.querySelector('.pola-acts'); if(a && a.hidden){ a.hidden = false; const b = a.querySelector('button'); if(b) b.focus({ preventScroll: true }); }
  }
  const blobPola = () => new Promise(r => PO.card ? PO.card.toBlob(r, 'image/jpeg', .92) : r(null));
  function baixaPola(b){ const u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = `corre-noel-${C.st.me.handle}.jpg`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); }
  Object.assign(C.acts, {
    'cvr-pola-aces': el => { PO.aces = el.dataset.k; document.querySelectorAll('.pola-aces [role="radio"]').forEach(b => b.setAttribute('aria-checked', String(b === el))); try{ localStorage.setItem('corre-pola', JSON.stringify({ aces: PO.aces, leg: PO.leg })); }catch(e){} },
    'cvr-pola-leg': el => { PO.leg = Number(el.dataset.i) || 0; document.querySelectorAll('.pola-legs [role="radio"]').forEach(b => b.setAttribute('aria-checked', String(b === el))); try{ localStorage.setItem('corre-pola', JSON.stringify({ aces: PO.aces, leg: PO.leg })); }catch(e){} },
    'cvr-pola-tira': () => tiraPola(),
    'cvr-pola-x': () => fechaPola(),
    'cvr-pola-outra': () => { fechaPola(); fotoNoel(); },
    'cvr-pola-chaco': () => { const c = PO.el && PO.el.querySelector('.pola-card'); if(!c) return; c.classList.remove('chacoalha'); void c.offsetWidth; c.classList.add('chacoalha'); const st = PO.el.querySelector('.pola-st'); if(st && st.firstChild) st.firstChild.textContent = POLA_CHACO[(PO.chaco = ((PO.chaco || 0) + 1)) % POLA_CHACO.length] + ' '; if(C.versoSom && C.versoSom.foto) C.versoSom.foto('chaco'); },
    'cvr-pola-insta': async () => {
      const b = await blobPola(); if(!b) return;
      const F = window.File, arq = F ? new F([b], `corre-noel-${C.st.me.handle}.jpg`, { type: 'image/jpeg' }) : null;
      if(arq && navigator.canShare && navigator.canShare({ files: [arq] })){
        try{ await navigator.share({ files: [arq], text: `${POLA_LEG[PO.leg]} 🎅 Eu e o maior Papai Noel do mundo, no Igapó. #Londrina #Natal #Correverso` }); return; }catch(e){ if(e && e.name === 'AbortError') return; }
      }
      baixaPola(b); C.toast('A foto foi pro teu aparelho. Abre o Instagram e posta ela no story ou no feed.', 6000);
    },
    'cvr-pola-baixa': async () => { const b = await blobPola(); if(b){ baixaPola(b); C.toast('Foto baixada.', 2500); } }
  });
  /* a guirlanda da porta: anel de fita vermelha com bolinhas de ouro e o laço embaixo */
  function guirlanda(ctx, x, y){
    ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 2.6; ctx.strokeStyle = VERM_N; ctx.stroke();
    ctx.fillStyle = OURO_N; for(let i = 0; i < 6; i++){ const a = i / 6 * Math.PI * 2 + .3; ctx.fillRect(x + Math.cos(a) * 8 - 1, y + Math.sin(a) * 8 - 1, 2, 2); }
    ctx.fillStyle = OURO_N; ctx.beginPath(); ctx.moveTo(x, y + 8); ctx.lineTo(x - 5, y + 4); ctx.lineTo(x - 5, y + 12); ctx.closePath(); ctx.moveTo(x, y + 8); ctx.lineTo(x + 5, y + 4); ctx.lineTo(x + 5, y + 12); ctx.closePath(); ctx.fill();
  }
  /* ---------- v3.91 · o Halloween nas casas (o Thales: "faz algumas decorações em algumas casas") ----------
     Umas 4 em cada 10 casas se enfeitam, sempre as mesmas (o sorteio é pelo id, igual em todo aparelho), de 1º/10 até
     Finados (halloween()). Toda casa enfeitada tem abóbora de vela acesa do lado da porta; o sorteio ainda dá umas
     coisas a mais: teia no canto do térreo com a aranha subindo e descendo, fantasminha de lençol pendurado balançando,
     morcegos voando em volta, lápides no jardim, varal de luzinha laranja e roxa e o caldeirão borbulhando. Convive com
     o Natal (a guirlanda da porta fica). Nada de verde: o talo da abóbora é marrom e a poção do caldeirão é roxa */
  const HW_LUZ = ['#FF7A1A', '#9B6BFF', '#FFB02E', '#C6A6FF'], HW_ABO = '#FF7A1A', HW_ABO2 = '#D9580B', HW_TALO = '#6B4A32';
  const hwBrasa = (t, i) => { const f = Math.floor(t * 9 + i * 3) % 7; return f === 0 ? '#FFF2A8' : f < 4 ? '#FFD23F' : '#FFB02E'; };
  function halloweenDe(h){
    if(h.hw !== undefined) return h.hw;
    const r = rng(hash('halloween:' + h.id));
    if(r() > .42){ h.hw = null; return null; }
    const lado = h.portaX > h.x + h.w / 2 ? 1 : -1, o = { ab: 1 + Math.floor(r() * 3), teia: r() < .55, fant: r() < .45, morc: r() < .6, lap: r() < .5, luz: r() < .45, cald: r() < .3, lado, sd: r() * 10 };
    /* pelo menos duas coisas além das abóboras (uma casa só com abóbora passa batido) */
    const extras = ['teia', 'fant', 'morc', 'lap', 'luz', 'cald']; let n = extras.filter(k => o[k]).length, i = Math.floor(r() * extras.length);
    while(n < 2){ if(!o[extras[i % extras.length]]){ o[extras[i % extras.length]] = true; n++; } i++; }
    const altura = 74 + 58 * ((h.tier || 0) >= 3 ? 2 : 1);
    o.topo = h.base - altura;
    /* o caldeirão do outro lado das abóboras; as lápides no jardim, fora do caminho da porta e longe do caldeirão */
    o.cx = h.portaX - lado * 60; if(o.cx < h.x + 14 || o.cx > h.x + h.w - 14) o.cx = h.portaX + lado * 60;
    o.lapides = [h.x + 16, h.x + h.w * .5, h.x + h.w - 16].filter(x => Math.abs(x - h.portaX) > 30 && (!o.cald || Math.abs(x - o.cx) > 26)).slice(0, 2 + (r() < .5 ? 1 : 0)).map((x, j) => ({ x: x + (r() - .5) * 8, y: h.base + 15 + j * 3, inc: (r() - .5) * .12 }));
    h.hw = o; return o;
  }
  /* a abóbora de vela acesa (pixel por pixel, numa grade de 9 x 7), com a luz no chão */
  function aboboraChao(ctx, x, y, p, t, i){
    const b = hwBrasa(t, i), w = 9 * p, h = 7 * p; luz(x, y - 6, 34 * p, .85);
    const g = ctx.createRadialGradient(x, y - h * .5, 1, x, y - h * .5, 30 * p / 1.6); g.addColorStop(0, 'rgba(255,176,46,.3)'); g.addColorStop(1, 'rgba(255,176,46,0)'); ctx.fillStyle = g; ctx.fillRect(x - 30, y - h - 24, 60, 50);
    ctx.fillStyle = 'rgba(15,18,24,.3)'; ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 3);
    const P = (gx, gy, gw, gh, c) => { ctx.fillStyle = c; ctx.fillRect(x + (gx - 4.5) * p, y - (7 - gy) * p, gw * p, gh * p); };
    ctx.fillStyle = INK; ctx.fillRect(x - w / 2 - .8, y - h + p - .8, w + 1.6, h - p + 1.6); ctx.fillRect(x - w / 2 + p - .8, y - h - .8, w - 2 * p + 1.6, h + 1.6);
    P(1, 0, 7, 1, HW_ABO); P(0, 1, 9, 5, HW_ABO); P(1, 6, 7, 1, HW_ABO2); P(3, 0, 1, 7, HW_ABO2); P(5, 0, 1, 7, HW_ABO2); P(8, 1, 1, 5, HW_ABO2);
    P(4, -1, 1, 1, HW_TALO); P(4, -2, 2, 1, HW_TALO);
    P(1, 2, 2, 1, b); P(2, 1.5, 1, .5, b); P(6, 2, 2, 1, b); P(6, 1.5, 1, .5, b); P(4, 3, 1, 1, b); P(2, 4, 5, 1, b); P(3, 5, 1, 1, b); P(5, 5, 1, 1, b);
  }
  /* a teia no canto, com a aranha no fio (sobe e desce devagar) */
  function teia(ctx, cx, cy, dir, t, sd){
    const R = 24, u = 1 / V.k; ctx.strokeStyle = 'rgba(238,235,228,.85)'; ctx.lineWidth = Math.max(u, .7);
    const ang = j => Math.PI / 2 * (j / 4);
    ctx.beginPath(); for(let j = 0; j <= 4; j++){ const a = ang(j); ctx.moveTo(cx, cy); ctx.lineTo(cx + dir * Math.cos(a) * R, cy + Math.sin(a) * R); } ctx.stroke();
    [.35, .65, .95].forEach(f => { ctx.beginPath(); for(let j = 0; j <= 4; j++){ const a = ang(j), px = cx + dir * Math.cos(a) * R * f, py = cy + Math.sin(a) * R * f; if(j) ctx.quadraticCurveTo(cx + dir * Math.cos(a - Math.PI / 16) * R * f * .86, cy + Math.sin(a - Math.PI / 16) * R * f * .86, px, py); else ctx.moveTo(px, py); } ctx.stroke(); });
    const ax = cx + dir * 12, ay = cy + 16 + (Math.sin(t * .9 + sd) * .5 + .5) * 22;
    ctx.beginPath(); ctx.moveTo(ax, cy + 9); ctx.lineTo(ax, ay); ctx.stroke();
    ctx.fillStyle = INK; ctx.fillRect(ax - 2.5, ay, 5, 4); ctx.fillRect(ax - 1.5, ay - 2, 3, 2);
    ctx.fillRect(ax - 5, ay + 1, 2.5, 1); ctx.fillRect(ax + 2.5, ay + 1, 2.5, 1); ctx.fillRect(ax - 5, ay + 3, 2.5, 1); ctx.fillRect(ax + 2.5, ay + 3, 2.5, 1);
    ctx.fillStyle = '#FF4A4A'; ctx.fillRect(ax - 1.5, ay + .5, 1, 1); ctx.fillRect(ax + .5, ay + .5, 1, 1);
  }
  /* o fantasminha de lençol pendurado no beiral, balançando */
  function fantasmaPendurado(ctx, x, y, t, sd){
    const u = 1 / V.k; ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 1.6 + sd) * .16);
    ctx.fillStyle = '#9AA0A8'; ctx.fillRect(-u / 2, 0, u, 10);
    ctx.fillStyle = INK; ctx.fillRect(-7.5, 9, 15, 17); ctx.fillStyle = PAPEL; ctx.fillRect(-6.5, 10, 13, 15); ctx.fillRect(-5, 9.5, 10, 1);
    ctx.fillStyle = '#D9DEE6'; ctx.fillRect(4, 11, 2.5, 14);
    ctx.fillStyle = PAPEL; const o = Math.sin(t * 5 + sd) > 0 ? 1 : 0; for(let i = 0; i < 4; i++) ctx.fillRect(-6.5 + i * 3.5, 25, 2.5, 2 + ((i + o) % 2) * 1.5);
    ctx.fillStyle = INK; ctx.fillRect(-4, 14, 2.5, 3.5); ctx.fillRect(1.5, 14, 2.5, 3.5); ctx.fillRect(-1.5, 19.5, 3, 2);
    ctx.restore();
  }
  /* os morcegos: voam em oito em volta do alto da casa, batendo a asa */
  function morcegos(ctx, h, o, t){
    const cx = h.x + h.w / 2, cy = o.topo - 18;
    for(let i = 0; i < 3; i++){
      const a = t * 1.3 + i * 2.1 + o.sd, x = cx + Math.cos(a) * h.w * .42, y = cy + Math.sin(a * 2) * 16 - i * 6, sobe = Math.sin(t * 13 + i * 2) > 0;
      ctx.fillStyle = INK; ctx.fillRect(x - 1.5, y - 1.5, 3, 4); ctx.fillRect(x - 1.5, y - 3, 1, 1.5); ctx.fillRect(x + .5, y - 3, 1, 1.5);
      if(sobe){ ctx.fillRect(x - 6, y - 4, 4.5, 2); ctx.fillRect(x - 8, y - 6, 3, 2); ctx.fillRect(x + 1.5, y - 4, 4.5, 2); ctx.fillRect(x + 5, y - 6, 3, 2); }
      else { ctx.fillRect(x - 6, y, 4.5, 2); ctx.fillRect(x - 8, y + 2, 3, 2); ctx.fillRect(x + 1.5, y, 4.5, 2); ctx.fillRect(x + 5, y + 2, 3, 2); }
      ctx.fillStyle = '#FFD23F'; ctx.fillRect(x - 1, y - .8, .9, .9); ctx.fillRect(x + .1, y - .8, .9, .9);
    }
  }
  /* a lápide no jardim (pedra cinza com a cruz riscada e o musgo... roxo) */
  function lapide(ctx, l){
    ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.inc);
    ctx.fillStyle = 'rgba(15,18,24,.28)'; ctx.fillRect(-8, -1, 16, 3);
    ctx.fillStyle = INK; ctx.fillRect(-7, -15, 14, 15); ctx.fillRect(-5, -18, 10, 3);
    ctx.fillStyle = '#9AA0A8'; ctx.fillRect(-6, -14, 12, 14); ctx.fillRect(-4, -17, 8, 3); ctx.fillStyle = '#7B818A'; ctx.fillRect(4, -14, 2, 14);
    ctx.fillStyle = '#5A6070'; ctx.fillRect(-.75, -14, 1.5, 9); ctx.fillRect(-3.5, -11.5, 7, 1.5);
    ctx.fillStyle = '#8A6BB5'; ctx.fillRect(-6, -2, 5, 2); ctx.fillRect(2, -1.5, 4, 1.5);
    ctx.restore();
  }
  /* o varal de luzinha embaixo do balanço do térreo, piscando em laranja e roxo */
  function varalHw(ctx, h, t){
    const x1 = h.x + 6, x2 = h.x + h.w - 6, y0 = h.base - 70, n = Math.max(3, Math.floor((x2 - x1) / 10)), u = 1 / V.k;
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(u, .8); ctx.beginPath(); ctx.moveTo(x1, y0); ctx.quadraticCurveTo((x1 + x2) / 2, y0 + 12, x2, y0); ctx.stroke();
    for(let i = 0; i <= n; i++){ const f = i / n, m = 1 - f, x = m * m * x1 + 2 * m * f * (x1 + x2) / 2 + f * f * x2, y = m * m * y0 + 2 * m * f * (y0 + 12) + f * f * y0, on = (i + Math.floor(t * 2.5)) % 4 !== 0;
      ctx.fillStyle = on ? HW_LUZ[i % 4] : '#3B2D22'; ctx.fillRect(x - 1.5, y + .5, 3, 3.5); if(on){ ctx.fillStyle = 'rgba(255,190,90,.22)'; ctx.fillRect(x - 3.5, y - 1, 7, 7); } }
  }
  /* o caldeirão: o fogo embaixo, a poção roxa e as bolhas subindo */
  function caldeirao(ctx, x, y, t, sd){
    const g = ctx.createRadialGradient(x, y - 14, 2, x, y - 14, 30); g.addColorStop(0, 'rgba(155,107,255,.3)'); g.addColorStop(1, 'rgba(155,107,255,0)'); ctx.fillStyle = g; ctx.fillRect(x - 30, y - 44, 60, 50);
    ctx.fillStyle = 'rgba(15,18,24,.3)'; ctx.fillRect(x - 11, y - 1, 22, 3);
    for(let i = 0; i < 3; i++){ const hh = 4 + ((Math.floor(t * 10) + i) % 3) * 1.5; ctx.fillStyle = i === 1 ? '#FFD23F' : '#FF7A1A'; ctx.fillRect(x - 6 + i * 4, y - hh, 3, hh); }
    ctx.fillStyle = INK; ctx.fillRect(x - 11, y - 18, 22, 12); ctx.fillRect(x - 9, y - 6, 18, 2); ctx.fillRect(x - 12, y - 20, 24, 3); ctx.fillRect(x - 9, y - 3, 2, 3); ctx.fillRect(x + 7, y - 3, 2, 3);
    ctx.fillStyle = '#2B2F38'; ctx.fillRect(x - 9, y - 16, 4, 8); ctx.fillStyle = '#9B6BFF'; ctx.fillRect(x - 10, y - 20, 20, 2);
    for(let i = 0; i < 4; i++){ const f = (t * .6 + i / 4 + sd) % 1, bx = x - 6 + i * 4 + Math.sin(f * 9 + i) * 1.5, by = y - 21 - f * 18; ctx.fillStyle = f > .7 ? 'rgba(198,166,255,.5)' : '#C6A6FF'; const r = f > .5 ? 1.5 : 2.5; ctx.fillRect(bx - r / 2, by - r / 2, r, r); }
  }
  function hwNaFila(L, ctx, h, o, t, vis){
    const yb = h.base;
    if(o.luz) L.push({ y: yb + .6, f: () => varalHw(ctx, h, t) });
    if(o.teia) L.push({ y: yb + .6, f: () => teia(ctx, o.lado > 0 ? h.x + 3 : h.x + h.w - 3, yb - 73, o.lado > 0 ? 1 : -1, t, o.sd) });
    if(o.fant) L.push({ y: yb + .6, f: () => fantasmaPendurado(ctx, o.lado > 0 ? h.x + h.w * .22 : h.x + h.w * .78, yb - 74, t, o.sd) });
    if(o.morc && vis(h.x + h.w / 2, o.topo, 120)) L.push({ y: yb + .6, f: () => morcegos(ctx, h, o, t) });
    [24, -24, 38].slice(0, o.ab).forEach((dx, i) => L.push({ y: yb + 1, f: () => aboboraChao(ctx, h.portaX + dx * o.lado, yb + 2, i === 2 ? 1.25 : 1.6, t, i + o.sd) }));
    if(o.lap) o.lapides.forEach(l => L.push({ y: l.y, f: () => lapide(ctx, l) }));
    if(o.cald) L.push({ y: yb + 12, f: () => caldeirao(ctx, o.cx, yb + 12, t, o.sd) });
  }
  /* coisas soltas pela cidade (placa, fonte, estátua, tabela, parquinho, academia, o ipê gigante) */
  function decor(ctx, d, t){
    const u = 1 / V.k;
    switch(d.tipo){
      case 'placa': case 'placa2': { const s = d.s || 1, h = d.h || 30; ctx.fillStyle = INK; if(d.tipo === 'placa2'){ ctx.fillRect(d.x - 44, d.y - h, 5, h); ctx.fillRect(d.x + 40, d.y - h, 5, h); } else ctx.fillRect(d.x - 2, d.y - h, 4, h); pixPlaca(ctx, d.txt, d.x, d.y - h - (5 * s + 6) / 2 * u, { fundo: d.fundo || PAPEL, s }); break; }
      case 'fonte': { bloco(ctx, d.x - 28, d.y - 16, 56, 16, 'concreto'); ctx.fillStyle = pad(ctx, 'agua'); ctx.fillRect(d.x - 22, d.y - 16, 44, 6); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(sn(d.x - u), d.y - 42, u * 2, 26); for(let i = 0; i < 10; i++){ const f = (t * 1.1 + i / 10) % 1, lado = i % 2 ? 1 : -1; ctx.fillRect(sn(d.x + lado * (3 + f * 15)), sn(d.y - 42 + f * 26 - Math.sin(f * Math.PI) * 5), u, u); } break; }
      case 'estatua': { if(natal()){ arvNatal(ctx, d.x, d.y); break; } bloco(ctx, d.x - 14, d.y - 26, 28, 26, 'concreto'); ctx.fillStyle = '#6E5B3E'; ctx.fillRect(d.x - 5, d.y - 52, 10, 26); ctx.fillRect(d.x - 4, d.y - 62, 8, 9); ctx.fillRect(d.x + 5, d.y - 56, 4, 14); ctx.fillRect(d.x + 6, d.y - 66, 3, 12); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(d.x - 5, d.y - 52, 3, 26); break; }
      case 'tabela': { const L = d.lado; ctx.fillStyle = '#2B2F38'; ctx.fillRect(d.x - 2, d.y - 62, 4, 62); ctx.fillRect(L > 0 ? d.x : d.x - 10, d.y - 62, 10, 3); ctx.fillStyle = '#F4F3EF'; ctx.fillRect(L > 0 ? d.x + 8 : d.x - 11, d.y - 76, 3, 24); ctx.fillStyle = LARANJA; ctx.fillRect(L > 0 ? d.x + 11 : d.x - 21, d.y - 58, 10, 2); break; }
      case 'escorrega': { ctx.fillStyle = '#2B2F38'; ctx.fillRect(d.x - 14, d.y - 40, 3, 40); ctx.fillRect(d.x - 2, d.y - 40, 3, 40); for(let i = 0; i < 4; i++) ctx.fillRect(d.x - 14, d.y - 34 + i * 9, 15, 2); bloco(ctx, d.x - 16, d.y - 46, 20, 6, AMARELO, true); ctx.fillStyle = ROSA; for(let i = 0; i < 7; i++) ctx.fillRect(d.x + 4 + i * 4, d.y - 44 + i * 6, 6, 6); break; }
      case 'balanco': { ctx.fillStyle = '#2B2F38'; ctx.fillRect(d.x - 22, d.y - 46, 3, 46); ctx.fillRect(d.x + 19, d.y - 46, 3, 46); ctx.fillRect(d.x - 22, d.y - 46, 44, 3); const sw = sn(Math.sin(t * 2.4) * 5); ctx.fillStyle = '#9AA0A8'; ctx.fillRect(d.x - 10 + sw, d.y - 43, u, 30); ctx.fillRect(d.x + 8 + sw, d.y - 43, u, 30); ctx.fillStyle = AZUL; ctx.fillRect(d.x - 12 + sw, d.y - 14, 24, 4); break; }
      case 'barra': { ctx.fillStyle = AMARELO; ctx.fillRect(d.x - 12, d.y - 30, 3, 30); ctx.fillRect(d.x + 9, d.y - 30, 3, 30); ctx.fillRect(d.x - 12, d.y - 30, 24, 3); ctx.fillStyle = 'rgba(15,18,24,.25)'; ctx.fillRect(d.x - 14, d.y - 1, 28, 3); break; }
      case 'ipe': arvore(ctx, { x: d.x, y: d.y, cor: ROSA, g: 2 }); if(natal()) estrela(ctx, d.x, d.y - 170, 13); break;
      /* v3.87: a placa do Papai Noel do Igapó, na orla de baixo (só no Natal) */
      case 'placaNoel': if(natal()){ ctx.fillStyle = INK; ctx.fillRect(d.x - 40, d.y - 30, 4, 30); ctx.fillRect(d.x + 36, d.y - 30, 4, 30); pixPlaca(ctx, 'O MAIOR PAPAI NOEL', d.x, d.y - 40, { fundo: VERM_N, cor: PAPEL }); pixPlaca(ctx, 'DO MUNDO: 27 M', d.x, d.y - 28, { fundo: PAPEL }); } break;
      /* v4.03: a barraquinha da foto com o Papai Noel (só no Natal): toldo listrado de vermelho e branco, a placa, o varal
         com as polaroides do dia, o balcão e a câmera no tripé com a luzinha vermelha piscando */
      case 'fotoNoel': if(natal()){
        const x = d.x, y = d.y;
        ctx.fillStyle = 'rgba(15,18,24,.25)'; ctx.fillRect(x - 44, y - 3, 88, 6);
        ctx.fillStyle = INK; ctx.fillRect(x - 38, y - 60, 3, 60); ctx.fillRect(x + 35, y - 60, 3, 60);
        /* o varal com as polaroides balançando um tiquinho */
        ctx.fillStyle = '#6B5A48'; ctx.fillRect(x - 35, y - 44, 70, 1);
        [-26, -12, 2, 16].forEach((dx, i) => { const b = Math.sin(t * 1.6 + i) > .6 ? u : 0; ctx.fillStyle = '#F6F3EC'; ctx.fillRect(x + dx, y - 43 + b, 9, 11); ctx.fillStyle = i % 2 ? '#3B4A7A' : '#7A3B4A'; ctx.fillRect(x + dx + 1.5, y - 41.5 + b, 6, 6); ctx.fillStyle = OURO_N; ctx.fillRect(x + dx + 3.5, y - 45 + b, 2, 3); });
        /* o balcão de madeira com a frente branca e a polaroid desenhada */
        ctx.beginPath(); ctx.rect(x - 32, y - 24, 64, 24); forma(ctx, '#8A5A3C', 1.4); ctx.fillStyle = '#F6F3EC'; ctx.fillRect(x - 28, y - 20, 56, 16);
        ctx.fillStyle = VERM_N; ctx.fillRect(x - 8, y - 18, 16, 12); ctx.fillStyle = '#F6F3EC'; ctx.fillRect(x - 6, y - 16, 12, 7); ctx.fillStyle = '#2B2F38'; ctx.fillRect(x - 4, y - 15, 8, 5);
        /* o toldo de gomos e a placa em cima */
        for(let i = 0; i < 8; i++){ ctx.fillStyle = i % 2 ? PAPEL : VERM_N; ctx.fillRect(x - 42 + i * 10.5, y - 70, 10.5, 12); ctx.beginPath(); ctx.arc(x - 36.75 + i * 10.5, y - 58, 5.25, 0, Math.PI); ctx.fill(); }
        ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, 1.05 / V.k); ctx.strokeRect(x - 42, y - 70, 84, 12);
        pixPlaca(ctx, 'FOTO COM O NOEL', x, y - 80, { fundo: VERM_N, cor: PAPEL });
        /* a câmera no tripé, do lado de fora, virada pro lago */
        ctx.fillStyle = '#2B2F38'; ctx.fillRect(x + 44, y - 22, 2, 22); ctx.fillRect(x + 38, y - 2, 14, 2); ctx.fillRect(x + 40, y - 12, 2, 10); ctx.fillRect(x + 48, y - 12, 2, 10);
        ctx.beginPath(); ctx.rect(x + 37, y - 32, 16, 11); forma(ctx, '#F6F3EC', 1.2); ctx.fillStyle = '#2B2F38'; ctx.beginPath(); ctx.arc(x + 45, y - 26.5, 3.4, 0, Math.PI * 2); ctx.fill();
        if(Math.floor(t * 2) % 2){ ctx.fillStyle = '#FF4A4A'; ctx.fillRect(x + 49, y - 31, 2, 2); }
        luz(x, y - 40, 96, .85);
      } break;
      /* v3.75: o guarda-sol da prainha do Tibagi, de gomos (a cor e o branco) */
      case 'guardasol': { ctx.fillStyle = 'rgba(15,18,24,.2)'; ctx.fillRect(d.x - 24, d.y - 3, 48, 6); ctx.fillStyle = '#EEEBE4'; ctx.fillRect(d.x - 1, d.y - 40, 3, 40);
        [[-24, -44, 48, 4], [-19, -48, 38, 4], [-11, -51, 22, 3]].forEach(([x, y, w, h]) => { ctx.fillStyle = d.cor; ctx.fillRect(d.x + x, d.y + y, w, h); ctx.fillStyle = PAPEL; for(let k = x + 6; k < x + w - 4; k += 12) ctx.fillRect(d.x + k, d.y + y, 6, h); });
        ctx.fillStyle = 'rgba(15,18,24,.25)'; ctx.fillRect(d.x - 24, d.y - 41, 48, 1); break; }
    }
  }
  /* carro passando nas ruas que cortam a cidade inteira (para quando tem gente na frente) */
  function montaCarros(c){
    const L = [], q = rng(hash('carros'));
    c.ruasLivres.forEach(s => [1, -1].forEach(dir => L.push({ s, dir, x: q() * c.W, y: ruaY(s) + (dir > 0 ? 22 : -12), v: 70 + q() * 50, cor: pega(CORES_CARRO, q), van: q() < .25 })));
    return L;
  }
  function carros(dt){
    const gente = [V.eu, ...V.remotos.values()].filter(r => r && (r === V.eu || !bloqueado(r))), W = V.cid.W;
    for(const car of V.carros){
      const para = gente.some(o => { const d = (o.x - car.x) * car.dir; return d > -12 && d < 78 && Math.abs(o.y - car.y) < 30; });
      if(!para){ car.x += car.dir * car.v * dt; if(car.x > W + 90) car.x = -90; else if(car.x < -90) car.x = W + 90; }
      /* v3.40: o carro que vem vindo e passa do teu lado faz barulho (vento e motor, cruzando de um lado pro outro) */
      if(V.eu && !para && !V.voo && C.versoSom){ const dx = car.x - V.eu.x, dy = Math.abs(car.y - V.eu.y); if(dy < 100 && dx * car.dir < 0 && Math.abs(dx) < 175 && Math.abs(dx) > 115 && (!car.som || Date.now() - car.som > 5000)){ car.som = Date.now(); C.versoSom.carroPassa(car.dir, 1 - dy / 120); } }
    }
  }
  function carro(ctx, car){
    const d = car.dir, L = car.van ? 58 : 50, x0 = sn(car.x - L / 2), y = car.y;
    ctx.fillStyle = 'rgba(15,18,24,.28)'; ctx.fillRect(x0 + 2, y - 2, L, 5);
    if(car.van){ bloco(ctx, x0, y - 30, L, 24, car.cor); ctx.fillStyle = '#2A3442'; ctx.fillRect(d > 0 ? x0 + L - 15 : x0 + 4, y - 26, 11, 10); ctx.fillRect(x0 + 16, y - 26, 20, 8); }
    else { bloco(ctx, x0, y - 18, L, 12, car.cor); bloco(ctx, x0 + (d > 0 ? 10 : 14), y - 28, 26, 10, car.cor); ctx.fillStyle = '#2A3442'; ctx.fillRect(x0 + (d > 0 ? 13 : 17), y - 26, 9, 7); ctx.fillRect(x0 + (d > 0 ? 24 : 28), y - 26, 9, 7); }
    ctx.fillStyle = '#0B0C10'; ctx.fillRect(x0 + 6, y - 8, 10, 9); ctx.fillRect(x0 + L - 16, y - 8, 10, 9); ctx.fillStyle = '#9AA0A8'; ctx.fillRect(x0 + 9, y - 5, 4, 3); ctx.fillRect(x0 + L - 13, y - 5, 4, 3);
    ctx.fillStyle = '#FFF3C4'; ctx.fillRect(d > 0 ? x0 + L - 3 : x0, y - 15, 3, 4); ctx.fillStyle = '#FF5A5A'; ctx.fillRect(d > 0 ? x0 : x0 + L - 3, y - 15, 3, 4);
    /* v4.0: o farol de noite */
    luz(car.x + d * (L / 2 + 30), y - 8, 52, .8); luz(car.x, y - 14, 30, .35);
  }
  function praca(ctx){
    const p = V.cid.praca;
    const mx = p.x + 30, my = p.y + 56;
    bloco(ctx, mx + 8, my + 60, 6, 44, 'preto', true); bloco(ctx, mx + 96, my + 60, 6, 44, 'preto', true);
    bloco(ctx, mx, my, 110, 70, 'madeira');
    const cores = [AMARELO, ROSA, PAPEL, LILAS, AZUL]; for(let i = 0; i < 6; i++){ const nx = mx + 8 + (i % 3) * 34, ny = my + 18 + Math.floor(i / 3) * 26; bloco(ctx, nx, ny, 24, 18, cores[i % 5], true); ctx.fillStyle = ROSA; ctx.fillRect(nx + 10, ny - 2, 4, 4); }
    pixPlaca(ctx, 'MURAL', mx + 55, my - 8, { fundo: INK, cor: AMARELO });
    const bx = p.x + LW - 112, by = p.y + 118;
    bloco(ctx, bx, by, 88, 58, AZUL);
    for(let i = 0; i < 4; i++) bloco(ctx, bx + 8 + i * 19, by + 18, 15, 22, [AMARELO, ROSA, PAPEL, LARANJA][i], true);
    bloco(ctx, bx - 8, by - 14, 104, 14, AMARELO);
    pixTxt(ctx, 'BANCA', bx + 44, by - 7, 1, INK, 'c');
    pixPlaca(ctx, 'CALCADAO', p.x + LW / 2, p.y + 16, { fundo: PAPEL });
  }
  /* ---------- v3.53 · as placas de publicidade dos parceiros ----------
     O Thales: "onde for terreno vazio, placa de publicidade; começa com a nexwin.app, com o QR pra baixar o app (sou
     sócio)" e a Arena JET (parceria). Cada placa é um desenho de canvas feito aqui (o nome da marca em letra, sem
     baixar logo de ninguém) e vale na cidade (os lotes livres) e no 3D (as pistas). Tocou ou chegou perto: a folha com
     o QR grande e os links. As cores são as de cada marca, menos o verde (no Corre não entra verde: a NexWin vai no
     azul e no roxo dela) */
  const QR_NEXWIN = 'jtv27.a5nwh.eknkt.ek4t9.ekfh9.a7bcx.jvfy7.1gjk.euruk.6nrj6.6hw4b.8g1yp.w4wn.hwwbu.cn6t7.e5bw1.do3qs.24go.jujiv.a7vh4.el6ut.ek3j3.ek0wd.a5d6h.jvsfz';
  const qrLinhas = cod => cod.split('.').map(x => parseInt(x, 36).toString(2).padStart(25, '0'));
  const PUBLI = {
    nexwin: { nome: 'NexWin', site: 'nexwin.app', url: 'https://nexwin.app/', qr: qrLinhas(QR_NEXWIN), frase: 'Conectando Campeões',
      sobre: 'Campeonatos de EA FC 26, eFootball, Free Fire, Clash Royale e mais, no celular. Dispute, ganhe Nexcoins e use na Store e na Academy.',
      lojas: [['App Store', 'https://apps.apple.com/br/app/nexwin/id6749592307'], ['Google Play', 'https://play.google.com/store/apps/details?id=br.com.nexwin.app']],
      cores: { fundo: '#070C12', a: '#2F80ED', b: '#8B5CF6', txt: '#FFFFFF' },
      frases: [['nexwin', 'CONECTANDO CAMPEÕES'], ['CAMPEONATO NO CELULAR', 'EA FC 26 · FREE FIRE · CLASH ROYALE'], ['DO DOWNLOAD AO PÓDIO', 'GANHE NEXCOINS']] },
    jet: { nome: 'JET', site: 'jetshr.com', url: 'https://jetshr.com/#/pt', frase: 'Patinete elétrico no app',
      sobre: 'Alugue um patinete elétrico pelo app: encontre no mapa, escaneie o código e comece a viagem. A JET tá em 40 cidades do Brasil, com mais de 40 mil patinetes.',
      cores: { fundo: '#181818', a: '#307FE2', b: '#307FE2', txt: '#FFFFFF' },
      frases: [['JET', 'ALUGUE UM PATINETE ELÉTRICO'], ['ESCANEIE. ANDE. ESTACIONE.', 'BAIXE O APP JET'], ['40 CIDADES', '40 MIL PATINETES JET'], ['SEM CNH', 'PRA ANDAR DE PATINETE JET'], ['SE BEBER, NÃO USE O PATINETE', 'JET · PROIBIDO PRA MENOR DE 18'], ['JET POWER BANK', 'BATERIA ONDE VOCÊ ESTIVER']] }
  };
  const PUBLI_IMG = new Map(), PUBLI_LED = new Map();
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(() => PUBLI_IMG.clear()).catch(() => {});
  function qrNoCanvas(x, linhas, px, py, tam){ const n = linhas.length, m = tam / (n + 2); x.fillStyle = '#FFFFFF'; x.fillRect(px, py, tam, tam); x.fillStyle = '#0F1218'; linhas.forEach((l, j) => { for(let i = 0; i < n; i++) if(l[i] === '1') x.fillRect(Math.floor(px + (i + 1) * m), Math.floor(py + (j + 1) * m), Math.ceil(m), Math.ceil(m)); }); }
  /* a placa pronta (canvas), por marca e por variação; LED = a faixa comprida que corre o texto (redesenhada a cada passo) */
  function publiImg(k, v, W, H, led){
    const P = PUBLI[k]; if(!P) return null; W = W || 512; H = H || 256; const fr = P.frases[((v || 0) % P.frases.length + P.frases.length) % P.frases.length], chave = [k, v, W, H, led ? Math.floor(led) : ''].join('|');
    let cv = led ? PUBLI_LED.get(k + W + 'x' + H) : PUBLI_IMG.get(chave); if(cv && (!led || cv._led === Math.floor(led))) return cv;
    if(!cv){ cv = document.createElement('canvas'); cv.width = W; cv.height = H; if(led) PUBLI_LED.set(k + W + 'x' + H, cv); }
    const x = cv.getContext('2d'), Co = P.cores; if(led) cv._led = Math.floor(led);
    x.fillStyle = Co.fundo; x.fillRect(0, 0, W, H);
    const g = x.createLinearGradient(0, 0, W, 0); g.addColorStop(0, Co.a); g.addColorStop(1, Co.b);
    const fonte = (peso, tam, it) => `${it ? 'italic ' : ''}${peso} ${Math.round(tam)}px "Archivo", "Big Shoulders Display", system-ui, sans-serif`;
    const cabe = (txt, peso, max, larg, it) => { let t = max; x.font = fonte(peso, t, it); while(t > 8 && x.measureText(txt).width > larg){ t -= 2; x.font = fonte(peso, t, it); } return t; };
    if(led){
      /* a faixa de LED: o texto passando, com a marca no começo */
      const txt = `${P.nome}   ·   ${P.frases.map(f => f.join(' · ')).join('   ·   ')}   ·   `; x.font = fonte(900, H * .62, k === 'jet'); const w = x.measureText(txt).width, off = -((led * 3) % w);
      x.fillStyle = g; x.fillRect(0, H * .86, W, H * .14); x.fillStyle = Co.txt; x.textBaseline = 'middle'; for(let p = off; p < W; p += w) x.fillText(txt, p, H * .45);
      return cv;
    }
    x.fillStyle = g; x.fillRect(0, H - H * .08, W, H * .08); x.fillRect(0, 0, W * .025, H);
    const qr = P.qr && H >= 120, aq = qr ? H * .72 : 0, larg = W - (qr ? aq + W * .13 : W * .1);
    x.fillStyle = Co.txt; x.textBaseline = 'alphabetic';
    /* as linhas: a frase grande, a de baixo e o endereço, sem encostar uma na outra */
    let t1 = cabe(fr[0], 900, H * (fr[0].length < 8 ? .44 : .25), larg, k === 'jet'); const t2 = cabe(fr[1], 700, H * .11, larg);
    if(H * .1 + t1 * .82 + t2 * 1.45 > H * .72) t1 = Math.max(10, (H * .72 - H * .1 - t2 * 1.45) / .82);
    const b1 = H * .1 + t1 * .82, b2 = b1 + t2 * 1.45;
    x.font = fonte(900, t1, k === 'jet'); x.fillText(fr[0], W * .06, b1);
    x.font = fonte(700, t2); x.fillStyle = Co.a === Co.b ? Co.a : '#B7C9FF'; x.fillText(fr[1], W * .06, b2);
    x.font = fonte(600, H * .065); x.fillStyle = 'rgba(255,255,255,.75)'; x.fillText(qr ? `BAIXE O APP · ${P.site}` : P.site, W * .06, H * .86);
    if(qr){ const px = W - aq - W * .05, py = (H - aq) / 2 - H * .03; qrNoCanvas(x, P.qr, px, py, aq); x.font = fonte(700, H * .055); x.fillStyle = Co.txt; x.textAlign = 'center'; x.fillText('APONTA A CÂMERA', px + aq / 2, py + aq + H * .07); x.textAlign = 'left'; }
    PUBLI_IMG.set(chave, cv); if(PUBLI_IMG.size > 300) PUBLI_IMG.delete(PUBLI_IMG.keys().next().value);
    return cv;
  }
  /* a marca sozinha (o patinete da JET leva no guidão, no deque, atrás e na bandeirinha): letra branca no azul */
  /* v3.57 · os símbolos do Londrina Red Sharks (o time de beisebol da ACEL), que o Thales mandou: o escudo (o tubarão
     sobre o escudo, vai pintado no meio do campo) e o monograma RS (vai no uniforme). Os arquivos estão em site/img, com
     o fundo tirado; enquanto não carregam, devolve null e quem desenha pula */
  const SHARKS = Object.create(null);
  function logoSharks(k){
    k = k === 'rs' ? 'rs' : 'escudo'; let im = SHARKS[k];
    if(!im){ im = SHARKS[k] = new Image(); im.decoding = 'async'; im.src = `img/redsharks-${k}.png?v=3.57`; }
    return im.complete && im.naturalWidth ? im : null;
  }
  function publiLogo(k, W, H){
    const P = PUBLI[k]; if(!P) return null; W = W || 256; H = H || 128; const chave = 'logo|' + k + W + 'x' + H; let cv = PUBLI_IMG.get(chave); if(cv) return cv;
    cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
    x.fillStyle = P.cores.a; x.fillRect(0, 0, W, H); x.fillStyle = '#FFFFFF'; x.textAlign = 'center'; x.textBaseline = 'middle';
    let t = H * .78; x.font = `italic 900 ${t}px "Archivo", "Big Shoulders Display", system-ui, sans-serif`; while(t > 8 && x.measureText(P.nome).width > W * .82){ t -= 2; x.font = `italic 900 ${t}px "Archivo", "Big Shoulders Display", system-ui, sans-serif`; }
    x.fillText(P.nome, W / 2, H * .48); x.fillRect(W * .18, H * .84, W * .64, H * .05);
    PUBLI_IMG.set(chave, cv); return cv;
  }
  /* a folha da propaganda: o QR grande e os links (abre fora do Corre) */
  function publiSheet(k){
    const P = PUBLI[k]; if(!P) return; const n = P.qr ? P.qr.length : 0;
    const qr = P.qr ? `<svg class="cvr-publi-qr" viewBox="-2 -2 ${n + 4} ${n + 4}" aria-label="QR code do ${esc(P.nome)}"><rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" fill="#FFFFFF"/>${P.qr.map((l, j) => [...l].map((b, i) => (b === '1' ? `<rect x="${i}" y="${j}" width="1.02" height="1.02" fill="#0F1218"/>` : '')).join('')).join('')}</svg>` : '';
    C.sheet(`<div class="form cvr-publi"><div class="sheet-head"><h2>${esc(P.nome)} · ${esc(P.frase)}</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p class="note">${esc(P.sobre)}</p>${qr}${qr ? '<p class="note">Aponta a câmera do celular pro QR pra baixar o app.</p>' : ''}
      <div class="acts"><a class="btn primary" href="${P.url}" target="_blank" rel="noopener">${ico('ext')} Abrir ${esc(P.site)}</a>${(P.lojas || []).map(([n2, u]) => `<a class="btn" href="${u}" target="_blank" rel="noopener">${esc(n2)}</a>`).join('')}</div>
      <p class="fine">Parceiro do Corre.</p></div>`);
  }
  /* o outdoor do lote livre: dois postes e a placa (o desenho da placa é o canvas da marca, liso, sem pixel) */
  function outdoor(ctx, o, i){
    const cx = o.x + LW / 2, base = o.y + LH * .55, w = 230, h = 115, top = base - 58 - h, img = publiImg('nexwin', i, 512, 256);
    ctx.fillStyle = 'rgba(15,18,24,.25)'; ctx.fillRect(cx - w / 2, base - 2, w, 8);
    ctx.fillStyle = INK; ctx.fillRect(cx - w * .32 - 4, top + h, 8, 58); ctx.fillRect(cx + w * .32 - 4, top + h, 8, 58);
    ctx.fillStyle = INK; ctx.fillRect(cx - w / 2 - 5, top - 5, w + 10, h + 10);
    if(img){ const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true; ctx.drawImage(img, cx - w / 2, top, w, h); ctx.imageSmoothingEnabled = sm; }
    ctx.fillStyle = '#3A3E45'; ctx.fillRect(cx - w / 2 - 5, top - 9, w + 10, 4); [-.3, 0, .3].forEach(f => { ctx.fillStyle = '#8F96A0'; ctx.fillRect(cx + w * f - 2, top - 16, 4, 10); ctx.fillStyle = '#FFE9B0'; ctx.fillRect(cx + w * f - 6, top - 18, 12, 4); });
  }
  function loteLivre(ctx, o){
    const x = o.x + LW / 2, y = o.y + LH - 90;
    ctx.fillStyle = INK; ctx.fillRect(x - 3, y, 6, 44);
    pixPlaca(ctx, 'LOTE LIVRE', x, y - 8, { fundo: PAPEL });
    pixTxt(ctx, 'CHAMA ALGUEM', x, y + 54, 1, '#6B7480', 'c');
  }
  /* ---------- os lugares de Londrina (cada um vira uma folha desenhada uma vez só) ---------- */
  function folha(W, H, k){ const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.ceil(W * k)); cv.height = Math.max(1, Math.ceil(H * k)); const ctx = cv.getContext('2d'); ctx.__b = V.fx || 1; ctx.scale(k, k); ctx.lineJoin = 'miter'; ctx.imageSmoothingEnabled = false; return { cv, ctx }; }
  /* Catedral: o salão branco e a agulha alta */
  function spriteCatedral(k){
    const W = LW, M = 20, H = 470, base = H - M, { cv, ctx } = folha(W + M * 2, H, k), x0 = M, cx = x0 + W / 2;
    ctx.fillStyle = 'rgba(15,18,24,.22)'; ctx.fillRect(x0 + 40, base - 2, W - 80, 10);
    bloco(ctx, x0 + 50, base - 92, 200, 92, 'branco');
    ctx.beginPath(); ctx.moveTo(cx - 40, base - 92); ctx.lineTo(cx, base - 400); ctx.lineTo(cx + 40, base - 92); ctx.closePath(); ctx.fillStyle = pad(ctx, 'branco'); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.beginPath(); ctx.moveTo(cx, base - 400); ctx.lineTo(cx + 40, base - 92); ctx.lineTo(cx, base - 92); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx - 40, base - 92); ctx.lineTo(cx, base - 400); ctx.lineTo(cx + 40, base - 92); traco(ctx, INK, 2);
    ctx.fillStyle = '#7FA7D6'; for(let y = base - 120; y > base - 330; y -= 30){ const w = Math.max(4, 40 * (y - (base - 400)) / 308 - 18); ctx.fillRect(cx - w / 2, y, w, 16); }
    ctx.fillStyle = INK; ctx.fillRect(cx - 2, base - 432, 4, 34); ctx.fillRect(cx - 10, base - 422, 20, 4);
    vidro(ctx, x0 + 70, base - 74, 40, 50, true, 20); vidro(ctx, x0 + 190, base - 74, 40, 50, true, 20);
    ctx.beginPath(); ctx.rect(cx - 18, base - 64, 36, 64); forma(ctx, '#6B4A32', 2);
    pixPlaca(ctx, 'CATEDRAL', cx, base - 104, { fundo: PAPEL });
    return { cv, W: W + M * 2, H, M, base };
  }
  /* Concha Acústica: a concha branca sobre o palco, com os degraus na frente */
  function spriteConcha(k){
    const W = LW, M = 20, H = 300, base = H - M, { cv, ctx } = folha(W + M * 2, H, k), x0 = M, cx = x0 + W / 2;
    ctx.beginPath(); ctx.ellipse(cx, base - 30, 128, 196, 0, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fillStyle = pad(ctx, 'branco'); ctx.fill(); traco(ctx, INK, 2);
    ctx.beginPath(); ctx.ellipse(cx, base - 30, 104, 162, 0, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fillStyle = pad(ctx, 'escuro'); ctx.fill();
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = Math.max(2, 1.05 / k); for(let i = 1; i < 6; i++){ const a = Math.PI + i * Math.PI / 6; ctx.beginPath(); ctx.moveTo(cx, base - 30); ctx.lineTo(cx + Math.cos(a) * 104, base - 30 + Math.sin(a) * 162); ctx.stroke(); } ctx.restore();
    ctx.fillStyle = 'rgba(255,214,140,.35)'; ctx.beginPath(); ctx.moveTo(cx - 70, base - 30); ctx.lineTo(cx - 20, base - 150); ctx.lineTo(cx + 20, base - 150); ctx.lineTo(cx + 70, base - 30); ctx.closePath(); ctx.fill();
    bloco(ctx, x0 + 40, base - 30, 220, 30, 'madeira');
    pixPlaca(ctx, 'CONCHA ACUSTICA', cx, base - 238, { fundo: PAPEL });
    return { cv, W: W + M * 2, H, M, base };
  }
  /* Museu Histórico: a antiga estação, com a torre do relógio */
  /* o Aquário do Igapó: um volume de concreto com o tanque de vidro na frente. Lá dentro, o fundo do mar do Killer
     Ocean: a água escurecendo, a serpente com as luzinhas ciano no corpo e os três pontos vermelhos na cabeça, peixes,
     algas, bolhas. Em cima, a placa; embaixo, o letreiro do jogo. */
  function spriteAquario(k){
    const W = LW, M = 20, H = 270, base = H - M, { cv, ctx } = folha(W + M * 2, H, k), x0 = M, cx = x0 + W / 2;
    ctx.fillStyle = 'rgba(15,18,24,.22)'; ctx.fillRect(x0 + 14, base - 2, W - 28, 10);
    bloco(ctx, x0 + 20, base - 112, 260, 112, 'concreto');
    ctx.fillStyle = pad(ctx, '#2A3442'); ctx.fillRect(x0 + 20, base - 120, 260, 8);
    /* o tanque */
    const gx = x0 + 36, gy = base - 98, gw = 228, gh = 70;
    const g = ctx.createLinearGradient(0, gy, 0, gy + gh); g.addColorStop(0, '#0E6C7C'); g.addColorStop(.5, '#06404F'); g.addColorStop(1, '#010C12');
    ctx.fillStyle = g; ctx.fillRect(gx, gy, gw, gh);
    ctx.strokeStyle = '#0B2A3A'; ctx.lineWidth = 3;
    [14, 40, 70, 150, 190, 214].forEach((ax, i) => { ctx.beginPath(); ctx.moveTo(gx + ax, gy + gh); ctx.quadraticCurveTo(gx + ax + 6, gy + gh - 18, gx + ax + (i % 2 ? -8 : 10), gy + gh - 32 - (i % 3) * 6); ctx.stroke(); });
    /* a serpente */
    ctx.strokeStyle = '#071A20'; ctx.lineWidth = 11; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(gx + 24, gy + 44); ctx.bezierCurveTo(gx + 60, gy + 8, gx + 100, gy + 62, gx + 140, gy + 30); ctx.bezierCurveTo(gx + 170, gy + 8, gx + 190, gy + 30, gx + 206, gy + 24); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.fillStyle = '#38E1FF'; [[46, 26], [72, 36], [100, 48], [128, 36], [156, 20], [182, 24]].forEach(([a, b]) => ctx.fillRect(gx + a, gy + b, 2, 2));
    ctx.fillStyle = '#FF4A5C'; ctx.fillRect(gx + 204, gy + 20, 3, 3); ctx.fillRect(gx + 208, gy + 24, 3, 3); ctx.fillRect(gx + 204, gy + 28, 3, 3);
    /* peixes, uma relíquia âmbar e bolhas */
    const peixe = (px, py, c, d) => { ctx.fillStyle = c; ctx.fillRect(px, py, 7, 3); ctx.fillRect(px + (d > 0 ? -3 : 7), py - 1, 3, 5); ctx.fillStyle = INK; ctx.fillRect(px + (d > 0 ? 5 : 1), py + 1, 1, 1); };
    peixe(gx + 30, gy + 14, AMARELO, 1); peixe(gx + 176, gy + 50, ROSA, -1); peixe(gx + 110, gy + 12, PAPEL, 1); peixe(gx + 60, gy + 58, LARANJA, -1);
    ctx.save(); ctx.translate(gx + 150, gy + 60); ctx.rotate(Math.PI / 4); ctx.fillStyle = '#FFB04A'; ctx.fillRect(-3, -3, 6, 6); ctx.restore();
    ctx.strokeStyle = 'rgba(200,250,250,.5)'; ctx.lineWidth = 1; [[20, 30], [24, 20], [196, 44], [200, 36], [92, 24]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(gx + a, gy + b, 2, 0, Math.PI * 2); ctx.stroke(); });
    /* o vidro: reflexo, caixilho e montantes */
    ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(gx + 6, gy + 4, 40, gh - 8);
    ctx.beginPath(); ctx.rect(gx, gy, gw, gh); traco(ctx, INK, 2.4);
    ctx.fillStyle = INK; ctx.fillRect(gx + 76 - 1, gy, 3, gh); ctx.fillRect(gx + 152 - 1, gy, 3, gh);
    /* a porta e o letreiro */
    ctx.fillStyle = '#121419'; ctx.fillRect(cx - 16, base - 26, 32, 26); ctx.fillStyle = '#2A3442'; ctx.fillRect(cx - 12, base - 22, 10, 16); ctx.fillRect(cx + 2, base - 22, 10, 16); ctx.beginPath(); ctx.rect(cx - 16, base - 26, 32, 26); traco(ctx, INK, 2);
    pixPlaca(ctx, 'AQUARIO DO IGAPO', cx, base - 132, { fundo: PAPEL });
    pixPlaca(ctx, 'KILLER OCEAN', cx, base - 12, { fundo: '#010C12', cor: '#38E1FF', borda: '#38E1FF' });
    return { cv, W: W + M * 2, H, M, base };
  }
  /* ---------- os prédios cívicos: Delegacia, Corpo de Bombeiros e Hospital do Corre (todos desenhados daqui) ---------- */
  function spriteDelegacia(k){
    const W = LW, M = 20, H = 290, base = H - M, { cv, ctx } = folha(W + M * 2, H, k), x0 = M, cx = x0 + W / 2;
    ctx.fillStyle = 'rgba(15,18,24,.22)'; ctx.fillRect(x0 + 14, base - 2, W - 28, 10);
    /* dois andares de concreto azulado, escada na frente, janelas com grade */
    bloco(ctx, x0 + 20, base - 150, 260, 150, '#B8C4CF');
    ctx.fillStyle = pad(ctx, '#1F3D7A'); ctx.fillRect(x0 + 20, base - 158, 260, 8);
    ctx.fillStyle = pad(ctx, '#1F3D7A'); ctx.fillRect(x0 + 20, base - 84, 260, 6);
    [[40, 110], [96, 110], [172, 110], [228, 110]].forEach(([x, y]) => { vidro(ctx, x0 + x, base - y, 40, 30, false, 20); ctx.fillStyle = '#121419'; for(let i = 1; i < 4; i++) ctx.fillRect(x0 + x + i * 10 - 1, base - y, 2, 30); });
    [[40, 66], [228, 66]].forEach(([x, y]) => { vidro(ctx, x0 + x, base - y, 40, 36, true, 20); ctx.fillStyle = '#121419'; for(let i = 1; i < 4; i++) ctx.fillRect(x0 + x + i * 10 - 1, base - y, 2, 36); });
    /* a porta dupla com a escadinha e os pilares */
    ctx.fillStyle = pad(ctx, 'concreto'); ctx.fillRect(cx - 54, base - 8, 108, 8); ctx.fillRect(cx - 48, base - 14, 96, 6);
    bloco(ctx, cx - 60, base - 78, 12, 64, '#EEEBE4', true); bloco(ctx, cx + 48, base - 78, 12, 64, '#EEEBE4', true);
    ctx.fillStyle = '#121419'; ctx.fillRect(cx - 24, base - 56, 48, 42); ctx.fillStyle = '#2A3442'; ctx.fillRect(cx - 20, base - 52, 18, 34); ctx.fillRect(cx + 2, base - 52, 18, 34); ctx.fillStyle = '#FFD37A'; ctx.fillRect(cx - 3, base - 40, 2, 10); ctx.fillRect(cx + 1, base - 40, 2, 10);
    ctx.beginPath(); ctx.rect(cx - 24, base - 56, 48, 42); traco(ctx, INK, 2);
    /* o brasão (uma estrela de 8 pontas, nossa) e o giroflex no teto */
    ctx.save(); ctx.translate(cx, base - 100); ctx.fillStyle = '#E2B04A'; ctx.fillRect(-9, -2, 18, 4); ctx.fillRect(-2, -9, 4, 18); ctx.rotate(Math.PI / 4); ctx.fillRect(-8, -2, 16, 4); ctx.fillRect(-2, -8, 4, 16); ctx.restore();
    ctx.fillStyle = '#1F3D7A'; ctx.fillRect(cx - 5, base - 105, 10, 10);
    ctx.fillStyle = '#4A4E56'; ctx.fillRect(cx - 14, base - 166, 28, 8); ctx.fillStyle = '#2E5BFF'; ctx.fillRect(cx - 12, base - 172, 10, 6); ctx.fillStyle = '#E2412E'; ctx.fillRect(cx + 2, base - 172, 10, 6);
    /* a viatura na frente: branca com a faixa azul */
    const vx = x0 + 196, vy = base + 2;
    ctx.fillStyle = 'rgba(15,18,24,.25)'; ctx.fillRect(vx - 2, vy - 2, 70, 6);
    ctx.fillStyle = '#EEEBE4'; ctx.fillRect(vx, vy - 20, 66, 18); ctx.fillStyle = '#1F3D7A'; ctx.fillRect(vx, vy - 12, 66, 5); ctx.fillStyle = '#2A3442'; ctx.fillRect(vx + 12, vy - 30, 40, 11); ctx.fillStyle = '#9CC9F0'; ctx.fillRect(vx + 15, vy - 28, 14, 8); ctx.fillRect(vx + 33, vy - 28, 16, 8);
    ctx.fillStyle = '#2E5BFF'; ctx.fillRect(vx + 26, vy - 34, 6, 4); ctx.fillStyle = '#E2412E'; ctx.fillRect(vx + 33, vy - 34, 6, 4);
    ctx.fillStyle = INK; ctx.fillRect(vx + 8, vy - 4, 12, 8); ctx.fillRect(vx + 46, vy - 4, 12, 8); ctx.fillStyle = '#C9CED6'; ctx.fillRect(vx + 11, vy - 2, 6, 4); ctx.fillRect(vx + 49, vy - 2, 6, 4);
    ctx.beginPath(); ctx.rect(vx, vy - 20, 66, 18); traco(ctx, INK, 2); ctx.beginPath(); ctx.rect(vx + 12, vy - 30, 40, 11); traco(ctx, INK, 2);
    pixPlaca(ctx, 'DELEGACIA', cx, base - 184, { fundo: '#1F3D7A', cor: PAPEL, borda: PAPEL });
    pixPlaca(ctx, 'POLICIA DO CORRE', cx, base - 124, { fundo: PAPEL });
    return { cv, W: W + M * 2, H, M, base };
  }
  function spriteBombeiros(k){
    const W = LW, M = 20, H = 290, base = H - M, { cv, ctx } = folha(W + M * 2, H, k), x0 = M, cx = x0 + W / 2;
    ctx.fillStyle = 'rgba(15,18,24,.22)'; ctx.fillRect(x0 + 14, base - 2, W - 28, 10);
    /* tijolo, duas garagens de portão vermelho (uma aberta, com o caminhão), a torre do sino do lado */
    bloco(ctx, x0 + 20, base - 130, 230, 130, 'tijolo');
    bloco(ctx, x0 + 236, base - 190, 44, 190, 'tijolo');
    ctx.fillStyle = pad(ctx, '#EEEBE4'); ctx.fillRect(x0 + 20, base - 138, 230, 8); ctx.fillRect(x0 + 236, base - 198, 44, 8);
    ctx.fillStyle = '#121419'; ctx.fillRect(x0 + 248, base - 180, 20, 26); ctx.fillStyle = '#E2B04A'; ctx.fillRect(x0 + 254, base - 176, 8, 10); ctx.fillRect(x0 + 256, base - 166, 4, 4);
    vidro(ctx, x0 + 244, base - 118, 28, 30, true, 14);
    /* o portão fechado (direita) e o aberto (esquerda) */
    ctx.fillStyle = '#E2412E'; ctx.fillRect(x0 + 140, base - 94, 92, 94); ctx.fillStyle = '#B4152E'; for(let y = base - 84; y < base - 6; y += 16) ctx.fillRect(x0 + 140, y, 92, 3); ctx.fillStyle = '#F2EC54'; ctx.fillRect(x0 + 140, base - 40, 92, 6); ctx.beginPath(); ctx.rect(x0 + 140, base - 94, 92, 94); traco(ctx, INK, 2.4);
    ctx.fillStyle = '#121419'; ctx.fillRect(x0 + 34, base - 94, 92, 94); ctx.fillStyle = '#E2412E'; ctx.fillRect(x0 + 34, base - 94, 92, 12);
    /* o caminhão dentro: vermelho, escada em cima, faróis */
    const tx = x0 + 40, ty = base - 6;
    ctx.fillStyle = '#E2412E'; ctx.fillRect(tx, ty - 46, 80, 40); ctx.fillStyle = '#B4152E'; ctx.fillRect(tx, ty - 24, 80, 6); ctx.fillStyle = '#F2EC54'; ctx.fillRect(tx, ty - 18, 80, 4);
    ctx.fillStyle = '#9CC9F0'; ctx.fillRect(tx + 50, ty - 42, 24, 14); ctx.fillStyle = '#C9CED6'; ctx.fillRect(tx + 4, ty - 52, 60, 4); for(let i = 0; i < 6; i++) ctx.fillRect(tx + 8 + i * 10, ty - 56, 3, 8);
    ctx.fillStyle = '#FFF1A8'; ctx.fillRect(tx + 74, ty - 22, 5, 6); ctx.fillStyle = '#2E5BFF'; ctx.fillRect(tx + 56, ty - 48, 8, 4);
    ctx.fillStyle = INK; ctx.fillRect(tx + 8, ty - 8, 14, 10); ctx.fillRect(tx + 56, ty - 8, 14, 10); ctx.fillStyle = '#C9CED6'; ctx.fillRect(tx + 12, ty - 5, 6, 4); ctx.fillRect(tx + 60, ty - 5, 6, 4);
    ctx.beginPath(); ctx.rect(tx, ty - 46, 80, 40); traco(ctx, INK, 2);
    ctx.beginPath(); ctx.rect(x0 + 34, base - 94, 92, 94); traco(ctx, INK, 2.4);
    /* o hidrante e a mangueira enrolada */
    ctx.fillStyle = '#E2412E'; ctx.fillRect(x0 + 262, base - 18, 8, 16); ctx.fillRect(x0 + 258, base - 14, 16, 4); ctx.fillStyle = '#F2EC54'; ctx.fillRect(x0 + 262, base - 22, 8, 4);
    pixPlaca(ctx, 'BOMBEIROS', cx - 20, base - 156, { fundo: '#E2412E', cor: PAPEL, borda: PAPEL });
    pixPlaca(ctx, 'CORPO DE BOMBEIROS DO CORRE', cx - 20, base - 104, { fundo: PAPEL });
    return { cv, W: W + M * 2, H, M, base };
  }
  function spriteHospital(k){
    const W = LW, M = 20, H = 300, base = H - M, { cv, ctx } = folha(W + M * 2, H, k), x0 = M, cx = x0 + W / 2;
    ctx.fillStyle = 'rgba(15,18,24,.22)'; ctx.fillRect(x0 + 14, base - 2, W - 28, 10);
    /* branco, três andares, um H azul no alto e o heliponto; a marquise da emergência com a ambulância */
    bloco(ctx, x0 + 20, base - 190, 260, 190, 'branco');
    ctx.fillStyle = pad(ctx, '#9CC9F0'); ctx.fillRect(x0 + 20, base - 198, 260, 8);
    ctx.fillStyle = pad(ctx, '#9CC9F0'); ctx.fillRect(x0 + 20, base - 128, 260, 5); ctx.fillRect(x0 + 20, base - 70, 260, 5);
    [[38, 182], [94, 182], [172, 182], [228, 182], [38, 120], [94, 120], [172, 120], [228, 120]].forEach(([x, y], i) => vidro(ctx, x0 + x, base - y, 40, 34, i % 3 !== 1, 20));
    /* o H do hospital e a cruz */
    ctx.fillStyle = '#2E5BFF'; ctx.fillRect(cx - 24, base - 236, 48, 40); ctx.beginPath(); ctx.rect(cx - 24, base - 236, 48, 40); traco(ctx, INK, 2);
    ctx.fillStyle = PAPEL; ctx.fillRect(cx - 14, base - 228, 7, 24); ctx.fillRect(cx + 7, base - 228, 7, 24); ctx.fillRect(cx - 14, base - 219, 28, 6);
    ctx.fillStyle = '#38E1FF'; ctx.fillRect(cx - 6, base - 100, 12, 36); ctx.fillRect(cx - 18, base - 88, 36, 12);
    /* o heliponto: um círculo no telhado */
    ctx.fillStyle = '#C9CED6'; ctx.fillRect(x0 + 180, base - 206, 90, 8); ctx.fillStyle = '#F2EC54'; ctx.fillRect(x0 + 186, base - 204, 78, 2); ctx.fillStyle = INK; ctx.fillRect(x0 + 220, base - 205, 10, 4);
    /* a marquise da emergência e a porta de vidro */
    ctx.fillStyle = pad(ctx, '#2E5BFF'); ctx.fillRect(cx - 70, base - 60, 140, 8); ctx.fillStyle = pad(ctx, '#9CC9F0'); ctx.fillRect(cx - 64, base - 52, 6, 52); ctx.fillRect(cx + 58, base - 52, 6, 52);
    ctx.fillStyle = '#121419'; ctx.fillRect(cx - 26, base - 50, 52, 50); ctx.fillStyle = '#9CC9F0'; ctx.fillRect(cx - 22, base - 46, 21, 42); ctx.fillRect(cx + 1, base - 46, 21, 42); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(cx - 20, base - 44, 6, 36);
    ctx.beginPath(); ctx.rect(cx - 26, base - 50, 52, 50); traco(ctx, INK, 2);
    /* a ambulância: branca com a faixa azul e o giroflex */
    const vx = x0 + 28, vy = base + 2;
    ctx.fillStyle = 'rgba(15,18,24,.25)'; ctx.fillRect(vx - 2, vy - 2, 76, 6);
    ctx.fillStyle = '#EEEBE4'; ctx.fillRect(vx, vy - 30, 72, 28); ctx.fillStyle = '#2E5BFF'; ctx.fillRect(vx, vy - 16, 72, 5); ctx.fillStyle = '#9CC9F0'; ctx.fillRect(vx + 52, vy - 27, 16, 9); ctx.fillStyle = '#38E1FF'; ctx.fillRect(vx + 14, vy - 26, 10, 10); ctx.fillStyle = '#EEEBE4'; ctx.fillRect(vx + 18, vy - 24, 2, 6); ctx.fillRect(vx + 16, vy - 22, 6, 2);
    ctx.fillStyle = '#E2412E'; ctx.fillRect(vx + 30, vy - 35, 8, 5); ctx.fillStyle = INK; ctx.fillRect(vx + 8, vy - 4, 12, 8); ctx.fillRect(vx + 52, vy - 4, 12, 8); ctx.fillStyle = '#C9CED6'; ctx.fillRect(vx + 11, vy - 2, 6, 4); ctx.fillRect(vx + 55, vy - 2, 6, 4);
    ctx.beginPath(); ctx.rect(vx, vy - 30, 72, 28); traco(ctx, INK, 2);
    pixPlaca(ctx, 'HOSPITAL DO CORRE', cx, base - 148, { fundo: '#2E5BFF', cor: PAPEL, borda: PAPEL });
    pixPlaca(ctx, 'EMERGENCIA', cx + 70, base - 66, { fundo: '#E2412E', cor: PAPEL, borda: PAPEL });
    return { cv, W: W + M * 2, H, M, base };
  }
  /* v3.57 · a sede da ACEL (parede branca, janelas de papel, o beiral escuro e as lanternas), o portal vermelho da
     entrada, o placar do fundo e as torres de luz do campo */
  function spriteSedeAcel(k){
    const W = 180, M = 22, H = 150, base = H - M, { cv, ctx } = folha(W + M * 2, H, k), x0 = M, cx = x0 + W / 2;
    ctx.fillStyle = 'rgba(15,18,24,.22)'; ctx.fillRect(x0 + 6, base - 2, W - 12, 10);
    bloco(ctx, x0, base - 64, W, 64, 'branco');
    ctx.fillStyle = '#5A3A22'; ctx.fillRect(x0, base - 6, W, 6); for(let x = x0; x <= x0 + W - 4; x += 44) ctx.fillRect(x, base - 64, 4, 64);
    [[x0 + 12, 52], [x0 + W - 64, 52]].forEach(([x, w]) => { ctx.fillStyle = '#F4E9D8'; ctx.fillRect(x, base - 52, w, 30); ctx.fillStyle = '#5A3A22'; for(let i = 0; i <= 4; i++) ctx.fillRect(x + i * (w - 2) / 4, base - 52, 2, 30); for(let j = 0; j <= 3; j++) ctx.fillRect(x, base - 52 + j * 9.4, w, 2); });
    ctx.fillStyle = '#121419'; ctx.fillRect(cx - 18, base - 40, 36, 40); ctx.fillStyle = '#D9452B'; ctx.fillRect(cx - 22, base - 46, 44, 5);
    /* o telhado: duas águas largas com a ponta levantada (beiral) */
    ctx.beginPath(); ctx.moveTo(x0 - 18, base - 60); ctx.lineTo(x0 - 12, base - 68); ctx.lineTo(x0 + 20, base - 98); ctx.lineTo(x0 + W - 20, base - 98); ctx.lineTo(x0 + W + 12, base - 68); ctx.lineTo(x0 + W + 18, base - 60); ctx.lineTo(x0 + W, base - 64); ctx.lineTo(x0, base - 64); ctx.closePath(); forma(ctx, '#3A3E45', 2);
    ctx.fillStyle = '#4A4E56'; for(let y = base - 92; y < base - 66; y += 6) ctx.fillRect(x0 + 6, y, W - 12, 2);
    ctx.fillStyle = '#121419'; ctx.fillRect(x0 + 16, base - 102, W - 32, 5);
    pixPlaca(ctx, 'ACEL', cx, base - 78, { fundo: '#D9452B', cor: PAPEL, borda: PAPEL, s: 2 });
    [x0 + 6, x0 + W - 6].forEach(x => { ctx.fillStyle = INK; ctx.fillRect(x - 1, base - 60, 2, 6); ctx.beginPath(); ctx.ellipse(x, base - 47, 6, 8, 0, 0, Math.PI * 2); forma(ctx, '#E2412E', 1.5); ctx.fillStyle = INK; ctx.fillRect(x - 5, base - 56, 10, 2); ctx.fillRect(x - 5, base - 40, 10, 2); });
    return { cv, W: W + M * 2, H, M, base };
  }
  function spritePortalAcel(k){
    const W = 104, M = 10, H = 120, base = H - M, { cv, ctx } = folha(W + M * 2, H, k), x0 = M, cx = x0 + W / 2;
    ctx.fillStyle = 'rgba(15,18,24,.22)'; ctx.fillRect(cx - 46, base - 2, 92, 8);
    [cx - 40, cx + 32].forEach(x => { bloco(ctx, x, base - 86, 8, 86, '#D9452B'); ctx.fillStyle = INK; ctx.fillRect(x - 2, base - 8, 12, 8); });
    bloco(ctx, cx - 48, base - 74, 96, 7, '#D9452B');
    ctx.beginPath(); ctx.moveTo(cx - 58, base - 92); ctx.lineTo(cx - 52, base - 86); ctx.lineTo(cx + 52, base - 86); ctx.lineTo(cx + 58, base - 92); ctx.lineTo(cx + 54, base - 98); ctx.lineTo(cx - 54, base - 98); ctx.closePath(); forma(ctx, INK, 2);
    ctx.fillStyle = '#D9452B'; ctx.fillRect(cx - 50, base - 86, 100, 4);
    pixPlaca(ctx, 'ACEL', cx, base - 78, { fundo: INK, cor: PAPEL, borda: PAPEL });
    [cx - 22, cx, cx + 22].forEach(x => { ctx.fillStyle = INK; ctx.fillRect(x - 1, base - 67, 2, 5); ctx.beginPath(); ctx.ellipse(x, base - 56, 5, 7, 0, 0, Math.PI * 2); forma(ctx, '#E2412E', 1.5); });
    return { cv, W: W + M * 2, H, M, base };
  }
  function spritePlacarAcel(k){
    const W = 130, M = 10, H = 104, base = H - M, { cv, ctx } = folha(W + M * 2, H, k), x0 = M, cx = x0 + W / 2;
    ctx.fillStyle = 'rgba(15,18,24,.22)'; ctx.fillRect(x0 + 10, base - 2, W - 20, 8);
    bloco(ctx, x0 + 18, base - 40, 6, 40, 'escuro'); bloco(ctx, x0 + W - 24, base - 40, 6, 40, 'escuro');
    bloco(ctx, x0, base - 92, W, 54, 'preto'); ctx.fillStyle = '#D9452B'; ctx.fillRect(x0 + 2, base - 90, W - 4, 13);
    pixTxt(ctx, 'ACEL', cx, base - 83, 1, PAPEL, 'c');
    pixTxt(ctx, 'CASA', x0 + 30, base - 66, 1, '#FFB347', 'c'); pixTxt(ctx, 'VISITA', x0 + W - 34, base - 66, 1, '#FFB347', 'c');
    pixTxt(ctx, '0', x0 + 30, base - 52, 2, '#FFE9B0', 'c'); pixTxt(ctx, '0', x0 + W - 34, base - 52, 2, '#FFE9B0', 'c');
    return { cv, W: W + M * 2, H, M, base };
  }
  function spriteTorreLuz(k){
    const W = 44, M = 6, H = 210, base = H - M, { cv, ctx } = folha(W + M * 2, H, k), x0 = M, cx = x0 + W / 2;
    ctx.fillStyle = 'rgba(15,18,24,.22)'; ctx.fillRect(cx - 8, base - 2, 16, 6);
    bloco(ctx, cx - 2, base - 170, 4, 170, 'escuro');
    bloco(ctx, cx - 20, base - 196, 40, 26, 'preto');
    ctx.fillStyle = '#FFF3C4'; for(let i = 0; i < 4; i++) for(let j = 0; j < 2; j++) ctx.fillRect(cx - 17 + i * 9, base - 193 + j * 11, 7, 8);
    return { cv, W: W + M * 2, H, M, base };
  }
  /* v3.40 · o terminal do aeroporto (vidro de ponta a ponta, a marquise rosa e o letreiro) e a torre de controle */
  function spriteTerminal(k){
    const W = 300, M = 24, H = 200, base = H - M, { cv, ctx } = folha(W + M * 2, H, k), x0 = M, cx = x0 + W / 2;
    ctx.fillStyle = 'rgba(15,18,24,.22)'; ctx.fillRect(x0 + 10, base - 2, W - 20, 10);
    bloco(ctx, x0, base - 112, W, 112, 'branco');
    vidro(ctx, x0 + 12, base - 96, W - 24, 52, true, 28);
    ctx.fillStyle = INK; for(let x = x0 + 12; x <= x0 + W - 14; x += 28) ctx.fillRect(x, base - 96, 2, 52);
    ctx.fillRect(x0 + 12, base - 46, W - 24, 2);
    bloco(ctx, x0 - 16, base - 128, W + 32, 16, 'concreto');
    ctx.fillStyle = pad(ctx, ROSA); ctx.fillRect(cx - 70, base - 40, 140, 8); ctx.fillStyle = pad(ctx, '#9CC9F0'); ctx.fillRect(cx - 64, base - 32, 5, 32); ctx.fillRect(cx + 59, base - 32, 5, 32);
    ctx.fillStyle = '#121419'; ctx.fillRect(cx - 28, base - 30, 56, 30); ctx.fillStyle = '#9CC9F0'; ctx.fillRect(cx - 24, base - 27, 23, 27); ctx.fillRect(cx + 1, base - 27, 23, 27);
    ctx.beginPath(); ctx.rect(cx - 28, base - 30, 56, 30); traco(ctx, INK, 2);
    pixPlaca(ctx, 'AEROPORTO  LDB', cx, base - 120, { fundo: INK, cor: AMARELO, borda: AMARELO });
    pixPlaca(ctx, 'EMBARQUE', cx, base - 52, { fundo: AMARELO, cor: INK });
    return { cv, W: W + M * 2, H, M, base };
  }
  function spriteTorreAero(k){
    const W = 70, M = 10, H = 250, base = H - M, { cv, ctx } = folha(W + M * 2, H, k), x0 = M, cx = x0 + W / 2;
    ctx.fillStyle = 'rgba(15,18,24,.22)'; ctx.fillRect(cx - 24, base - 2, 48, 8);
    bloco(ctx, cx - 14, base - 170, 28, 170, 'concreto');
    ctx.fillStyle = '#2E5BFF'; for(let y = base - 150; y < base - 20; y += 34) ctx.fillRect(cx - 4, y, 8, 12);
    bloco(ctx, cx - 30, base - 186, 60, 16, 'branco');
    ctx.fillStyle = pad(ctx, '#9CC9F0'); ctx.fillRect(cx - 28, base - 214, 56, 28); ctx.fillStyle = INK; [-28, -10, 8, 26].forEach(d => ctx.fillRect(cx + d, base - 214, 2, 28));
    ctx.beginPath(); ctx.rect(cx - 28, base - 214, 56, 28); traco(ctx, INK, 2);
    bloco(ctx, cx - 34, base - 224, 68, 10, 'escuro');
    ctx.fillStyle = INK; ctx.fillRect(cx - 1, base - 246, 3, 22); ctx.fillStyle = '#FF4A3D'; ctx.fillRect(cx - 2, base - 248, 5, 4);
    return { cv, W: W + M * 2, H, M, base };
  }
  /* a biruta: o mastro e o cone listrado, que balança com o vento */
  function biruta(ctx, b, t){
    const u = 1 / V.k, sw = Math.sin(t * 1.7) * 3 + Math.sin(t * 4.1) * 1.2;
    ctx.fillStyle = 'rgba(15,18,24,.2)'; ctx.fillRect(b.x - 3, b.y - 1, 22, 3);
    ctx.fillStyle = '#4A4E56'; ctx.fillRect(sn(b.x - u), b.y - 70, Math.max(2, 2 * u), 70);
    for(let i = 0; i < 5; i++){ ctx.fillStyle = i % 2 ? '#F4F3EF' : '#FF8A3D'; const x = b.x + 2 + i * 8, y = b.y - 68 + Math.round((sw * i / 4) * .9), h = 12 - i * 1.4; ctx.fillRect(sn(x), sn(y + (12 - h) / 2), 8, h); }
  }
  function spriteMuseu(k){
    const W = LW, M = 20, H = 270, base = H - M, { cv, ctx } = folha(W + M * 2, H, k), x0 = M, cx = x0 + W / 2;
    ctx.fillStyle = 'rgba(15,18,24,.22)'; ctx.fillRect(x0 + 14, base - 2, W - 28, 10);
    bloco(ctx, x0 + 20, base - 84, 260, 84, 'branco');
    ctx.fillStyle = pad(ctx, '#B5562F'); ctx.beginPath(); ctx.moveTo(x0 + 10, base - 84); ctx.lineTo(x0 + 40, base - 116); ctx.lineTo(x0 + 260, base - 116); ctx.lineTo(x0 + 290, base - 84); ctx.closePath(); ctx.fill(); traco(ctx, INK, 2);
    ctx.fillStyle = pad(ctx, '#9A4A3A'); ctx.fillRect(x0 + 20, base - 16, 260, 16);
    for(let i = 0; i < 6; i++){ if(i === 2 || i === 3) continue; const wx = x0 + 34 + i * 42; ctx.fillStyle = '#2A3442'; ctx.fillRect(wx, base - 66, 22, 40); ctx.beginPath(); ctx.arc(wx + 11, base - 66, 11, Math.PI, 0); ctx.fill(); ctx.beginPath(); ctx.rect(wx, base - 66, 22, 40); traco(ctx, '#6B4A32', 2); }
    bloco(ctx, cx - 22, base - 168, 44, 168, 'branco');
    ctx.fillStyle = pad(ctx, '#B5562F'); ctx.beginPath(); ctx.moveTo(cx - 28, base - 168); ctx.lineTo(cx, base - 196); ctx.lineTo(cx + 28, base - 168); ctx.closePath(); ctx.fill(); traco(ctx, INK, 2);
    ctx.beginPath(); ctx.arc(cx, base - 140, 14, 0, Math.PI * 2); forma(ctx, PAPEL, 2); ctx.fillStyle = INK; ctx.fillRect(cx - 1, base - 150, 2, 10); ctx.fillRect(cx - 1, base - 141, 9, 2);
    ctx.beginPath(); ctx.rect(cx - 14, base - 56, 28, 56); forma(ctx, '#6B4A32', 2);
    pixPlaca(ctx, 'MUSEU HISTORICO', cx, base - 98, { fundo: PAPEL });
    return { cv, W: W + M * 2, H, M, base };
  }
  /* a casa da @maiacrds: blackwork líquido, no estilo das tattoos dela. Um volume moderno com a tinta preta
     derramada do telhado pra baixo, cheia de veios brancos que correm feito mármore, gotas escorrendo no
     térreo branco, uma poça na calçada e um óculo redondo aceso no meio do preto. Só preto e branco. */
  function ruido(seed){
    const h = (x, y) => { let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + seed) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
    const sm = t => t * t * (3 - 2 * t);
    const v = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = sm(x - xi), fy = sm(y - yi), a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1); return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; };
    return (x, y) => v(x, y) * .78 + v(x * 2.03 + 17.3, y * 2.03 + 5.1) * .22;
  }
  function spriteTinta(c, k){
    const w = c.w, gH = 84, uH = 132, corpo = gH + uH, M = 40, W = w + M * 2, H = corpo + 96 + M + 24;
    const { cv, ctx } = folha(W, H, k), x0 = M, base = H - M, top = base - corpo, px = c.portaX - c.x, lado = px > w / 2 ? 1 : -1;
    const sd = hash(c.id + 'tinta'), r = rng(sd), PRETO = [13, 13, 15], BRANCO = [242, 240, 234], BRILHO = [58, 62, 70];
    ctx.fillStyle = 'rgba(15,18,24,.3)'; ctx.fillRect(x0 - 10, base - 2, w + 20, 10);
    /* o volume inteiro em concreto branco; a tinta vem por cima */
    bloco(ctx, x0, top, w, corpo, 'branco');
    const dep = 4 / k;
    ctx.fillStyle = '#16171B'; ctx.beginPath(); ctx.moveTo(x0, top); ctx.lineTo(x0 + dep, top - dep); ctx.lineTo(x0 + w + dep, top - dep); ctx.lineTo(x0 + w, top); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#060607'; ctx.beginPath(); ctx.moveTo(x0 + w, top); ctx.lineTo(x0 + w + dep, top - dep); ctx.lineTo(x0 + w + dep, base - gH + 6 - dep); ctx.lineTo(x0 + w, base - gH + 6); ctx.closePath(); ctx.fill();
    /* térreo: vitrine do estúdio e a porta */
    const vw = Math.round(w * .44), vx = lado > 0 ? x0 + 14 : x0 + w - 14 - vw, vy = base - gH + 30;
    vidro(ctx, vx, vy, vw, base - 6 - vy, true, 30);
    porta(ctx, x0 + px, base, 30, 60, '#0B0B0D');
    luzParede(ctx, x0 + 12, base, 64); luzParede(ctx, x0 + w - 12, base, 64);
    /* a tinta, ponto a ponto */
    const fx0 = Math.round(x0 * k), fx1 = Math.round((x0 + w) * k), ftop = Math.round(top * k), fbase = Math.round(base * k), fib = Math.round((base - gH + 8) * k);
    const gx0 = fx0 - 12, gy0 = ftop - 6, gw = fx1 - fx0 + 24, gh = fbase - gy0 + 8;
    const img = ctx.createImageData(gw, gh), d = img.data;
    const put = (i, j, cor) => { const x = i - gx0, y = j - gy0; if(x < 0 || y < 0 || x >= gw || y >= gh) return; const o = (y * gw + x) * 4; d[o] = cor[0]; d[o + 1] = cor[1]; d[o + 2] = cor[2]; d[o + 3] = 255; };
    const n1 = ruido(sd), n2 = ruido(sd ^ 0x5bd1e995), n3 = ruido(sd + 77), n4 = ruido(sd + 1234), s = 1 / 96;
    const veio = (i, j) => { const wx = (i - fx0 + .5) / k * s, wy = (j - ftop + .5) / k * s, q1 = n1(wx, wy), q2 = n2(wx + 5.2, wy + 1.3), f = n3(wx + 2.6 * q1, wy + 2.6 * q2) * 5.2, fr = f - Math.floor(f), lg = .2 + .34 * n4(wx * 1.3, wy * 1.3); return fr < lg && !(lg > .4 && Math.abs(fr - lg / 2) < .05); };
    /* gotas: compridas nas paredes, curtas em cima da vitrine e da porta */
    const sobre = (ix, a, b) => { const wx = ix / k; return wx > a - 4 && wx < b + 4; };
    const gotas = [], nG = Math.max(6, Math.round((fx1 - fx0) / 6));
    for(let g = 0; g < nG; g++){
      const dc = fx0 + 2 + r() * (fx1 - fx0 - 4), hw = 1.1 + r() * 1.5, sobreVidro = sobre(dc, vx, vx + vw), curta = sobreVidro || sobre(dc, x0 + px - 19, x0 + px + 19);
      const L = sobreVidro ? 3 + r() * 8 : curta ? 2 + r() * 4 : 6 + r() * (fbase - fib - 6);
      gotas.push({ dc, hw, L: Math.min(L, fbase - fib), pinga: !curta && r() < .45 });
    }
    const longa = gotas.filter(g => !sobre(g.dc, vx, vx + vw) && !sobre(g.dc, x0 + px - 19, x0 + px + 19)).sort((a, b) => b.hw - a.hw)[0];
    if(longa){ longa.L = fbase - fib; longa.poca = true; longa.pinga = false; }
    const borda = i => fib + Math.round(n1(i * .21, 9.7) * 3 - 1);
    const fundo = i => { let b = borda(i); for(const g of gotas){ const dx = Math.abs(i + .5 - g.dc); if(dx <= g.hw) b = Math.max(b, Math.round(fib + g.L - g.hw + Math.sqrt(g.hw * g.hw - dx * dx))); else if(dx <= g.hw + 1.2) b = Math.max(b, borda(i) + 1); } return b; };
    const coroa = i => ftop - Math.round(Math.max(0, n2(i * .17, 3.3) - .52) * 7);
    /* o óculo: janela redonda acesa, com anel branco */
    const oc = { x: lado > 0 ? fx1 - (fx1 - fx0) * .3 : fx0 + (fx1 - fx0) * .3, y: ftop + (fib - ftop) * .46, R: 6.2 };
    for(let i = fx0; i < fx1; i++){
      const fim = fundo(i);
      for(let j = coroa(i); j < fim; j++){
        const ox = i + .5 - oc.x, oy = j + .5 - oc.y, od = Math.hypot(ox, oy);
        if(od < oc.R - 1.6){ const q = clamp(1 - (oy + oc.R) / (oc.R * 2), 0, 1); put(i, j, [255, 200 + Math.round(q * 30), 110 + Math.round(q * 40)]); continue; }
        if(od < oc.R){ put(i, j, BRANCO); continue; }
        if(od < oc.R + 1.4){ put(i, j, PRETO); continue; }
        put(i, j, j < fib - 1 && veio(i, j) ? BRANCO : PRETO);
      }
    }
    /* brilho de tinta molhada nas gotas grossas, e o pingo caindo */
    gotas.forEach(g => {
      if(g.hw >= 1.4 && g.L > 5){ const bx = Math.floor(g.dc - g.hw + .9); for(let j = fib + 2; j < fib + g.L - 2; j++) put(bx, j, BRILHO); }
      if(g.pinga){ const py = Math.round(fib + g.L + 3 + r() * 4); if(py < fbase - 2){ const bx = Math.round(g.dc - .5); put(bx, py, PRETO); put(bx, py + 1, PRETO); put(bx + 1, py + 1, PRETO); put(bx, py + 2, PRETO); } }
      /* poça na calçada: preta com um veio branco */
      if(g.poca){ const cx = g.dc, cy = fbase + 1.5, rx = 7 + r() * 2, ry = 2.4;
        for(let i = Math.floor(cx - rx - 1); i <= Math.ceil(cx + rx); i++) for(let j = fbase - 1; j <= fbase + 4; j++){ const e = ((i + .5 - cx) / rx) ** 2 + ((j + .5 - cy) / ry) ** 2; if(e <= 1) put(i, j, Math.abs(e - .38) < .1 && i > cx - rx * .6 ? BRANCO : PRETO); } }
    });
    const tmp = document.createElement('canvas'); tmp.width = gw; tmp.height = gh; tmp.getContext('2d').putImageData(img, 0, 0);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(tmp, gx0, gy0); ctx.restore();
    /* letreiro TATTOO em neon branco sobre o telhado */
    const u = 1 / k, tw = pixLarg('TATTOO', 2) * u + 20, ty = top - dep - 46;
    ctx.fillStyle = '#0B0B0D'; ctx.fillRect(x0 + w / 2 - tw / 2 + 8, ty + 30, 4, top - dep - ty - 30); ctx.fillRect(x0 + w / 2 + tw / 2 - 12, ty + 30, 4, top - dep - ty - 30);
    ctx.fillStyle = '#0B0B0D'; ctx.fillRect(x0 + w / 2 - tw / 2, ty, tw, 32);
    ctx.fillStyle = '#F2F0EA'; ctx.fillRect(x0 + w / 2 - tw / 2, ty, tw, u); ctx.fillRect(x0 + w / 2 - tw / 2, ty + 32 - u, tw, u);
    ctx.save(); ctx.shadowColor = '#FFFFFF'; ctx.shadowBlur = 8; pixTxt(ctx, 'TATTOO', x0 + w / 2, ty + 16, 2, '#FFFFFF', 'c'); ctx.restore();
    pixPlaca(ctx, '@' + (c.handle || ''), x0 + px - lado * 2, base - gH + 16, { fundo: '#0E0E10', cor: '#F2F0EA', borda: '#F2F0EA', max: Math.max(6, Math.floor(w * .6 * k / 4.4)) });
    return { cv, W, H, M, base };
  }
  /* a casa da @tropicalink.00: tattoo tropical em cor, o avesso da casa da @maiacrds (que é só preto e branco).
     A fachada de cima é uma folha de flash: pôr do sol listrado, mar com as ondas do traço tradicional,
     coqueiros e andorinhas em preto chapado, moldura de papel e a faixa TROPICAL INK. No térreo, toldo listrado,
     tochas tiki, prancha e o TATTOO em neon rosa na vitrine. No telhado, um flamingo de neon. Verde, nenhum. */
  function spriteTropical(c, k){
    const w = c.w, gH = 80, uH = 124, corpo = gH + uH, M = 40, CIMA = 78, W = w + M * 2, H = corpo + CIMA + M + 24;
    const { cv, ctx } = folha(W, H, k), x0 = M, base = H - M, top = base - corpo, px = c.portaX - c.x, lado = px > w / 2 ? 1 : -1;
    const r = rng(hash(c.id + 'tropical')), dep = 4 / k;
    const INDIGO = '#2B2350', PAP = '#F6EBD9', PAP_D = '#E2CFAE', PAP_DD = '#B89C74', VERM = '#C8102E', NEON = '#FF5FA2';
    ctx.fillStyle = 'rgba(15,18,24,.3)'; ctx.fillRect(x0 - 10, base - 2, w + 20, 10);
    bloco(ctx, x0, top, w, corpo, INDIGO);
    /* ---- a folha de flash, ponto a ponto ---- */
    const fx0 = Math.round(x0 * k), fy0 = Math.round(top * k), mw = Math.round((x0 + w) * k) - fx0, mh = Math.round((top + uH) * k) - fy0;
    const img = ctx.createImageData(mw, mh), d = img.data;
    const put = (i, j, cor) => { if(i < 0 || j < 0 || i >= mw || j >= mh) return; const o = (j * mw + i) * 4; d[o] = cor[0]; d[o + 1] = cor[1]; d[o + 2] = cor[2]; d[o + 3] = 255; };
    const ob = Math.max(1, Math.round(1.3 * k)), pm = Math.max(3, Math.round(7 * k)), ib = Math.max(1, Math.round(1.3 * k)), fr = ob + pm + ib;
    const ax0 = fr, ay0 = fr, ax1 = mw - fr, ay1 = mh - fr, aw = ax1 - ax0, ah = ay1 - ay0;
    const em = (i, j) => i >= ax0 && j >= ay0 && i < ax1 && j < ay1, putA = (i, j, cor) => { if(em(i, j)) put(i, j, cor); };
    const CEU = ['#2A1B5C', '#4B2380', '#7E2A8E', '#C23A86', '#F0577A', '#FF8A5B', '#FFB347'].map(rgbDe);
    const SOL = ['#FFF07A', '#FFD23F', '#FFB627', '#FF9F1C'].map(rgbDe);
    const MAR = rgbDe('#162F73'), MAR2 = rgbDe('#2E5BFF'), ESPUMA = rgbDe('#F2F0EA'), PRETO = rgbDe('#0F1218'), PAPEL_C = rgbDe(PAP), REFLEXO = rgbDe('#FFB347');
    const hz = ay0 + Math.round(ah * .6), sunR = Math.min(aw * .25, (hz - ay0) * .84), sunX = ax0 + aw / 2 - lado * aw * .06, olw = Math.max(1, Math.round(1.3 * k));
    const rh = Math.max(4, Math.round(8.5 * k)), sw = Math.max(8, Math.round(15 * k)), cw = Math.max(1, Math.round(1.1 * k));
    for(let j = 0; j < mh; j++) for(let i = 0; i < mw; i++){
      const borda = Math.min(i, j, mw - 1 - i, mh - 1 - j);
      if(borda < ob){ put(i, j, PRETO); continue; }
      if(borda < ob + pm){ put(i, j, PAPEL_C); continue; }
      if(borda < fr){ put(i, j, PRETO); continue; }
      if(j < hz){
        /* céu em faixas, com um degrau de pontinhos entre uma e outra */
        const t = (j - ay0) / (hz - ay0) * CEU.length; let b = Math.floor(t);
        if(t - b > .8 && ((i + j) & 1)) b++;
        b = clamp(b, 0, CEU.length - 1);
        /* o sol listrado: as faixas abrem perto do horizonte */
        const dx = i + .5 - sunX, dy = j + .5 - hz, dd = Math.hypot(dx, dy);
        if(dd < sunR){
          const q = (hz - j - .5) / sunR, sq = q * 10, si = Math.floor(sq), corte = q < .5 && sq - si < .52 - si * .09;
          if(corte){ put(i, j, CEU[b]); continue; }
          put(i, j, dd > sunR - olw ? PRETO : SOL[q > .78 ? 0 : q > .52 ? 1 : q > .3 ? 2 : 3]); continue;
        }
        put(i, j, CEU[b]); continue;
      }
      /* mar: fileiras de ondas no traço de tattoo tradicional (crista branca, miolo azul) */
      const yy = j - hz, rw = Math.floor(yy / rh), ly = yy - rw * rh, off = (rw & 1) ? sw / 2 : 0, lx = ((i - ax0 + off) % sw + sw) % sw;
      const cd = Math.hypot(lx + .5 - sw / 2, ly + .5 - rh * 1.25), R = sw / 2;
      let cor = MAR;
      if(cd < R - cw) cor = MAR2; else if(cd < R + .2) cor = ESPUMA;
      /* o reflexo do sol na água, em traços que encurtam pra perto */
      const lr = sunR * (.85 - rw * .17);
      if(lr > 2 && Math.abs(ly - Math.floor(rh * .55)) < Math.max(1, Math.round(k * .8)) && Math.abs(i + .5 - sunX) < lr && cor !== ESPUMA) cor = REFLEXO;
      put(i, j, cor);
    }
    /* estrelinhas no alto */
    for(let n = Math.round(aw * (hz - ay0) / 1400), a = 0; a < n; a++){ const sx = ax0 + Math.floor(r() * aw), sy = ay0 + Math.floor(r() * (hz - ay0) * .32); if(Math.hypot(sx - sunX, sy - hz) > sunR + 4) put(sx, sy, PAPEL_C); }
    /* pincel redondo (em pontos de verdade) pra desenhar em preto chapado */
    const disco = (cx, cy, rad) => { const r0 = Math.max(.6, rad); for(let j = Math.floor(cy - r0); j <= Math.ceil(cy + r0); j++) for(let i = Math.floor(cx - r0); i <= Math.ceil(cx + r0); i++) if(Math.hypot(i + .5 - cx, j + .5 - cy) <= r0) putA(i, j, PRETO); };
    const curva = (p0, p1, p2, r0, r1, f) => { const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), n = Math.max(8, Math.ceil(L * 1.5)); for(let a = 0; a <= n; a++){ const t = a / n, mt = 1 - t, x = mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0], y = mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1]; disco(x, y, r0 + (r1 - r0) * t); if(f) f(t, x, y, 2 * mt * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]), 2 * mt * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1])); } };
    /* coqueiro: tronco curvo e grosso embaixo, palmas compridas que arqueiam e caem, folhinhas penteadas pra ponta */
    const coqueiro = (bx, by, cx, cy, esc, sd) => {
      curva([bx, by], [bx - sd * aw * .06, (by + cy) / 2], [cx, cy], 3.1 * k * esc, 1.7 * k * esc);
      const folha = k * esc >= 1.7, FR = [[-2.95, .27], [-2.45, .22], [-1.95, .17], [-1.2, .17], [-.7, .22], [-.2, .27], [3.1, .2], [.05, .2]];
      FR.forEach(([an, lf]) => {
        const L = aw * lf * esc, ca = Math.cos(an), sa = Math.sin(an), cai = L * (.42 - Math.min(.3, Math.abs(sa) * .3));
        const tip = [cx + ca * L, cy + sa * L * .55 + cai], ctl = [cx + ca * L * .55, cy + sa * L * .55 - L * .16];
        let passo = 0;
        curva([cx, cy], ctl, tip, 1.7 * k * esc, .5 * k, folha ? (t, x, y, tx, ty) => {
          if(t < .18 || t > .94 || (passo++ % Math.max(2, Math.round(2.2 * k))) !== 0) return;
          const n = Math.hypot(tx, ty) || 1, ux = tx / n, uy = ty / n, fl = 3.2 * (1 - t * .55) * k * esc;
          [-1, 1].forEach(lado2 => { const nx = -uy * lado2, ny = ux * lado2, dx = nx * .8 + ux * .6, dy = ny * .8 + uy * .6 + .35; for(let e = 0; e < fl; e += .5) disco(x + dx * e, y + dy * e, .45 * k); });
        } : null);
      });
      for(let a = 0; a < 3; a++) disco(cx + (a - 1) * 2.4 * k * esc, cy + 2.6 * k * esc, 1.6 * k * esc);
    };
    const pAlto = lado > 0 ? 1 : -1;
    coqueiro(lado > 0 ? ax0 + aw * .09 : ax1 - aw * .09, ay1 + 4, lado > 0 ? ax0 + aw * .19 : ax1 - aw * .19, ay0 + ah * .24, 1, -pAlto);
    coqueiro(lado > 0 ? ax1 - aw * .07 : ax0 + aw * .07, ay1 + 4, lado > 0 ? ax1 - aw * .15 : ax0 + aw * .15, ay0 + ah * .4, .78, pAlto);
    /* duas andorinhas */
    const ave = (cx, cy, e) => { const P = ['0110000110', '1001001001', '0000110000']; P.forEach((row, yy) => { for(let xx = 0; xx < row.length; xx++) if(row[xx] === '1') for(let a = 0; a < e; a++) for(let b2 = 0; b2 < e; b2++) putA(Math.round(cx) + (xx - 5) * e + a, Math.round(cy) + yy * e + b2, PRETO); }); };
    const ae = Math.max(1, Math.round(k * .9));
    ave(sunX + lado * aw * .2, ay0 + ah * .14, ae); ave(sunX + lado * aw * .29, ay0 + ah * .24, Math.max(1, ae - (k > 1.6 ? 1 : 0)));
    const tmp = document.createElement('canvas'); tmp.width = mw; tmp.height = mh; tmp.getContext('2d').putImageData(img, 0, 0);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(tmp, fx0, fy0); ctx.restore();
    /* a faixa TROPICAL INK, de flash tradicional, com as pontas dobradas pra trás */
    const ts = Math.max(1, Math.round(k * 1.4)), txt = 'TROPICAL INK', tw = pixLarg(txt, ts) / k, bh = (5 * ts) / k + 9, bw = Math.min(w - 52, tw + 22), bcx = x0 + w / 2, bcy = top + uH - 12;
    [-1, 1].forEach(sd => {
      const ex = bcx + sd * bw / 2, yb = bcy - bh / 2 + 6, yb2 = bcy + bh / 2 + 6;
      ctx.beginPath(); ctx.moveTo(ex - sd * 6, yb); ctx.lineTo(ex + sd * 17, yb); ctx.lineTo(ex + sd * 11, (yb + yb2) / 2); ctx.lineTo(ex + sd * 17, yb2); ctx.lineTo(ex - sd * 6, yb2); ctx.closePath(); forma(ctx, PAP_D, 1.6);
      ctx.beginPath(); ctx.moveTo(ex, bcy + bh / 2); ctx.lineTo(ex - sd * 6, yb2); ctx.lineTo(ex - sd * 6, bcy + bh / 2); ctx.closePath(); forma(ctx, PAP_DD, 1.2);
    });
    ctx.beginPath(); ctx.rect(bcx - bw / 2, bcy - bh / 2, bw, bh); forma(ctx, PAP, 1.6);
    pixTxt(ctx, txt, bcx, bcy, ts, VERM, 'c');
    /* ---- térreo ---- */
    const vw = Math.round(w * .42), vx = lado > 0 ? x0 + 18 : x0 + w - 18 - vw, vy = base - gH + 34, vh = base - 8 - vy;
    vidro(ctx, vx, vy, vw, vh, true, 34);
    ctx.save(); ctx.shadowColor = '#FF4F9A'; ctx.shadowBlur = 9; pixTxt(ctx, 'TATTOO', vx + vw / 2, vy + vh * .42, Math.max(1, Math.round(k)), NEON, 'c'); ctx.restore();
    /* toldo listrado rosa e papel, com a barra recortada */
    const ta = vx - 7, tb = vw + 14, tt = vy - 21, th = 12, nE = Math.max(5, Math.round(tb / 11)), se = tb / nE;
    ctx.fillStyle = 'rgba(15,18,24,.28)'; ctx.fillRect(ta + 3, vy - 3, tb - 6, 5);
    for(let e = 0; e < nE; e++){
      const ex = ta + e * se, cor = e % 2 ? PAP : ROSA;
      ctx.beginPath(); ctx.moveTo(ex + 1.5, tt); ctx.lineTo(ex + se + 1.5, tt); ctx.lineTo(ex + se, tt + th); ctx.lineTo(ex, tt + th); ctx.closePath(); ctx.fillStyle = cor; ctx.fill();
      ctx.beginPath(); ctx.arc(ex + se / 2, tt + th, se / 2, 0, Math.PI); ctx.fillStyle = cor; ctx.fill(); traco(ctx, INK, 1.2);
    }
    ctx.beginPath(); ctx.moveTo(ta + 1.5, tt); ctx.lineTo(ta + tb + 1.5, tt); ctx.lineTo(ta + tb, tt + th); ctx.lineTo(ta, tt + th); ctx.closePath(); traco(ctx, INK, 1.4);
    /* a porta, a placa e as tochas */
    porta(ctx, x0 + px, base, 30, 62, '#14102A');
    pixPlaca(ctx, '@' + (c.handle || ''), x0 + px, base - gH + 16, { fundo: PAP, cor: INK, borda: INK, max: Math.max(6, Math.floor(w * .5 * k / 4.4)) });
    const tocha = tx => {
      ctx.fillStyle = pad(ctx, 'madeira'); ctx.fillRect(tx - 2, base - 42, 4, 42); ctx.beginPath(); ctx.rect(tx - 2, base - 42, 4, 42); traco(ctx, INK, 1.2);
      ctx.beginPath(); ctx.moveTo(tx - 5, base - 50); ctx.lineTo(tx + 5, base - 50); ctx.lineTo(tx + 4, base - 42); ctx.lineTo(tx - 4, base - 42); ctx.closePath(); forma(ctx, '#6B4A32', 1.4);
      ctx.save(); ctx.shadowColor = '#FF8A3D'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.moveTo(tx, base - 66); ctx.quadraticCurveTo(tx + 7, base - 56, tx + 4, base - 50); ctx.lineTo(tx - 4, base - 50); ctx.quadraticCurveTo(tx - 6, base - 57, tx, base - 66); ctx.fillStyle = '#FF8A3D'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(tx, base - 60); ctx.quadraticCurveTo(tx + 3.5, base - 54, tx + 2, base - 50.5); ctx.lineTo(tx - 2, base - 50.5); ctx.quadraticCurveTo(tx - 3, base - 55, tx, base - 60); ctx.fillStyle = '#FFE45E'; ctx.fill();
      ctx.restore();
    };
    tocha(x0 + px - 25); tocha(x0 + px + 25);
    /* a prancha encostada na parede */
    const sx = lado > 0 ? x0 + 9 : x0 + w - 9;
    ctx.save(); ctx.translate(sx, base - 27); ctx.rotate(lado * -.1);
    ctx.beginPath(); ctx.ellipse(0, 0, 5.5, 27, 0, 0, Math.PI * 2); forma(ctx, AMARELO, 1.6);
    ctx.fillStyle = ROSA; ctx.fillRect(-1.2, -24, 2.4, 48); ctx.fillStyle = '#FF8A3D'; ctx.fillRect(-5, 8, 10, 2.4);
    ctx.restore();
    /* ---- no telhado, o flamingo de neon numa armação preta ---- */
    const fcx = x0 + w * (lado > 0 ? .7 : .3), fy = top - dep - 8;
    ctx.fillStyle = '#0B0B0D'; ctx.fillRect(fcx - 14, fy, 2.4, 8 + dep); ctx.fillRect(fcx + 11, fy, 2.4, 8 + dep); ctx.fillRect(fcx - 18, fy - 2, 34, 3);
    const flamingo = () => {
      ctx.beginPath();
      ctx.moveTo(-11, -31); ctx.bezierCurveTo(-13, -41, 5, -43, 12, -37); ctx.lineTo(20, -35); ctx.lineTo(12, -31); ctx.bezierCurveTo(6, -24, -7, -23, -11, -31);
      ctx.moveTo(-3, -35); ctx.bezierCurveTo(2, -38, 8, -36, 10, -33);
      ctx.moveTo(-11, -33); ctx.bezierCurveTo(-21, -41, -3, -48, -9, -56); ctx.bezierCurveTo(-12, -61, -5, -65, -2, -61);
      ctx.moveTo(-2, -61); ctx.lineTo(2, -58); ctx.lineTo(1, -54);
      ctx.moveTo(1, -24); ctx.lineTo(1, -2); ctx.moveTo(-3, -2); ctx.lineTo(5, -2);
      ctx.moveTo(3, -24); ctx.lineTo(9, -15); ctx.lineTo(1, -13);
    };
    ctx.save(); ctx.translate(fcx - 2, fy - 2); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = '#FF4F9A'; ctx.shadowBlur = 12; flamingo(); ctx.strokeStyle = 'rgba(255,79,154,.55)'; ctx.lineWidth = 3.8; ctx.stroke();
    ctx.shadowBlur = 5; flamingo(); ctx.strokeStyle = NEON; ctx.lineWidth = 2.1; ctx.stroke();
    ctx.shadowBlur = 0; flamingo(); ctx.strokeStyle = '#FFE1EF'; ctx.lineWidth = .8; ctx.stroke();
    ctx.fillStyle = '#FFE1EF'; ctx.fillRect(-7.5, -59.5, 1.6, 1.6);
    ctx.restore();
    return { cv, W, H, M, base };
  }
  /* a casa do @lolouzimaki: um prédio gigante de blocos, cubo por cubo. Pedra com pilar de tronco embaixo, tábua com
     faixas de tronco no meio, quartzo com vidro aceso em cima, coroa de ouro e um facho de luz no topo. Tochas na
     fachada e porta dupla de madeira. Mais de duas vezes a altura das outras casas: dá pra ver de longe. */
  function spriteBlocos(c, k){
    const B = 16, w = c.w, n = Math.floor(w / B), larg = n * B, M = 40, u = 1 / k, dep = 4 / k;
    const SEC = [{ h: 7, ins: 0 }, { h: 9, ins: 1 }, { h: 8, ins: 2 }, { h: 3, ins: 4 }];
    const alt = SEC.reduce((a, q) => a + q.h, 0) * B, FACHO = 120, W = w + M * 2, H = alt + FACHO + M + 24;
    const { cv, ctx } = folha(W, H, k), base = H - M, x0 = M + Math.round((w - larg) / 2), r = rng(hash(c.id + 'blocos'));
    const MAT = { pedra: '#8C9097', tronco: '#6B4A32', tabua: '#B5824A', quartzo: '#ECE7DC', ouro: '#F2C230' };
    const doorC = clamp(Math.round((c.portaX - c.x - (x0 - M)) / B) - 1, 1, n - 3);
    ctx.fillStyle = 'rgba(15,18,24,.3)'; ctx.fillRect(x0 - 10, base - 2, larg + 20, 10);
    /* o facho de luz do topo, atrás de tudo */
    const fx = x0 + larg / 2, fyTopo = base - alt;
    const gf = ctx.createLinearGradient(0, fyTopo, 0, fyTopo - FACHO);
    gf.addColorStop(0, 'rgba(120,230,255,.85)'); gf.addColorStop(1, 'rgba(120,230,255,0)');
    ctx.save(); ctx.shadowColor = '#78E6FF'; ctx.shadowBlur = 14; ctx.fillStyle = gf; ctx.fillRect(fx - B * .45, fyTopo - FACHO, B * .9, FACHO); ctx.restore();
    const cubo = (x, y, mat) => {
      ctx.fillStyle = pad(ctx, mat); ctx.fillRect(x, y, B, B);
      ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(x, y, B, u); ctx.fillRect(x, y, u, B);
      ctx.fillStyle = 'rgba(0,0,0,.26)'; ctx.fillRect(x, y + B - u, B, u); ctx.fillRect(x + B - u, y, u, B);
    };
    const vidroB = (x, y, aceso) => {
      ctx.fillStyle = aceso ? '#FFD37A' : '#9FD3EA'; ctx.fillRect(x, y, B, B);
      if(aceso){ ctx.fillStyle = 'rgba(255,140,60,.3)'; ctx.fillRect(x, y + B * .55, B, B * .45); }
      ctx.fillStyle = 'rgba(255,255,255,.65)'; ctx.fillRect(x + B * .2, y + B * .2, Math.max(u, B * .12), B * .3); ctx.fillRect(x + B * .32, y + B * .2, Math.max(u, B * .12), B * .12);
      ctx.fillStyle = '#5C6470'; ctx.fillRect(x, y, B, u); ctx.fillRect(x, y + B - u, B, u); ctx.fillRect(x, y, u, B); ctx.fillRect(x + B - u, y, u, B);
    };
    const tocha = (x, y) => {
      ctx.fillStyle = '#7A5230'; ctx.fillRect(x - B * .09, y - B * .1, B * .18, B * .55);
      ctx.save(); ctx.shadowColor = '#FF8A3D'; ctx.shadowBlur = 10; ctx.fillStyle = '#FF8A3D'; ctx.fillRect(x - B * .13, y - B * .32, B * .26, B * .24); ctx.fillStyle = '#FFE45E'; ctx.fillRect(x - B * .06, y - B * .26, B * .12, B * .14); ctx.restore();
    };
    let y = base;
    SEC.forEach((q, si) => {
      const sx = x0 + q.ins * B, sn = n - q.ins * 2, sh = q.h * B, sy = y - sh;
      /* o volume: lado e topo, como os outros blocos */
      ctx.beginPath(); ctx.moveTo(sx + sn * B, sy); ctx.lineTo(sx + sn * B + dep, sy - dep); ctx.lineTo(sx + sn * B + dep, sy + sh - dep); ctx.lineTo(sx + sn * B, sy + sh); ctx.closePath(); ctx.fillStyle = '#2A2D33'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + dep, sy - dep); ctx.lineTo(sx + sn * B + dep, sy - dep); ctx.lineTo(sx + sn * B, sy); ctx.closePath(); ctx.fillStyle = si === SEC.length - 1 ? '#FFE07A' : '#C9CDD3'; ctx.fill();
      for(let row = 0; row < q.h; row++) for(let col = 0; col < sn; col++){
        const bx = sx + col * B, by = sy + row * B, canto = col === 0 || col === sn - 1, debaixo = q.h - 1 - row;
        if(si === 0){
          const porta = col + q.ins >= doorC && col + q.ins <= doorC + 1 && debaixo < 3;
          if(porta) continue;
          if(canto) cubo(bx, by, MAT.tronco);
          else if((row === 1 || row === 2) && col % 4 >= 2 && !(col + q.ins >= doorC - 1 && col + q.ins <= doorC + 2)) vidroB(bx, by, r() < .6);
          else cubo(bx, by, MAT.pedra);
        } else if(si === 1){
          if(canto || row % 3 === 0) cubo(bx, by, MAT.tronco);
          else if(col % 3 === 1 || col % 3 === 2) vidroB(bx, by, r() < .45);
          else cubo(bx, by, MAT.tabua);
        } else if(si === 2){
          if(canto || row === 0 || row === q.h - 1) cubo(bx, by, MAT.quartzo);
          else if(col % 2 === 1) vidroB(bx, by, r() < .55);
          else cubo(bx, by, MAT.quartzo);
        } else {
          if(row === 1 && col % 2 === 1) vidroB(bx, by, true);
          else cubo(bx, by, MAT.ouro);
        }
      }
      ctx.beginPath(); ctx.rect(sx, sy, sn * B, sh); traco(ctx, 'rgba(15,18,24,.9)', 1.2);
      y = sy;
    });
    /* porta dupla de madeira com a verga de tronco, tochas e placa */
    const dx = x0 + doorC * B, dy = base - 3 * B;
    ctx.fillStyle = '#4A2F1B'; ctx.fillRect(dx, dy, 2 * B, 3 * B);
    ctx.fillStyle = '#5E3C22'; for(let a = 0; a < 2; a++) for(let b2 = 0; b2 < 3; b2++) ctx.fillRect(dx + a * B + B * .18, dy + b2 * B + B * .18, B * .64, B * .64);
    ctx.fillStyle = '#C8CDD4'; ctx.fillRect(dx + B - B * .28, dy + B * 1.5, B * .12, B * .3); ctx.fillRect(dx + B + B * .16, dy + B * 1.5, B * .12, B * .3);
    ctx.beginPath(); ctx.rect(dx, dy, 2 * B, 3 * B); traco(ctx, INK, 1.4);
    for(let col = 2; col < n - 1; col += 4) if(col < doorC - 1 || col > doorC + 2) tocha(x0 + col * B + B * .5, base - 3.5 * B);
    tocha(dx - B * .5, dy + B * .6); tocha(dx + 2.5 * B, dy + B * .6);
    pixPlaca(ctx, '@' + (c.handle || ''), dx + B, dy - B * .55, { fundo: PAPEL, cor: INK, borda: INK, max: Math.max(6, Math.floor(larg * .95 * k / 4.4)) });
    return { cv, W, H, M, base };
  }
  /* a casa do @playboy: mansão no estilo pimp. Veludo roxo capitonê com botão de ouro, colunas e frisos dourados,
     térreo de oncinha, porta de ouro com tapete vermelho e cordão de veludo, janelas em arco com neon rosa e lustre,
     corrente de ouro com medalhão de cifrão, coroa de neon e globo espelhado no telhado, holofotes cruzando o céu
     e o carro roxo de roda dourada parado na porta. */
  function spritePimp(c, k){
    const w = c.w, gH = 84, uH = 96, corpo = gH + uH, M = 40, CIMA = 104, W = w + M * 2, H = corpo + CIMA + M + 24;
    const { cv, ctx } = folha(W, H, k), x0 = M, base = H - M, top = base - corpo, px = c.portaX - c.x, lado = px > w / 2 ? 1 : -1, u = 1 / k, dep = 4 / k;
    const r = rng(hash(c.id + 'pimp')), ROXO = '#4A1D5E', OURO = '#E7B734', OURO_C = '#FFE08A', OURO_E = '#9C7215', VERM = '#B4152E';
    /* holofotes cruzando atrás da casa */
    [[x0 + w * .18, .5], [x0 + w * .82, -.5]].forEach(([hx, inc]) => {
      ctx.save(); ctx.translate(hx, top - dep); ctx.rotate(inc);
      const g = ctx.createLinearGradient(0, 0, 0, -CIMA - 30); g.addColorStop(0, 'rgba(255,240,190,.55)'); g.addColorStop(1, 'rgba(255,240,190,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(3, 0); ctx.lineTo(16, -CIMA - 30); ctx.lineTo(-16, -CIMA - 30); ctx.closePath(); ctx.fill(); ctx.restore();
    });
    ctx.fillStyle = 'rgba(15,18,24,.3)'; ctx.fillRect(x0 - 10, base - 2, w + 20, 10);
    bloco(ctx, x0, top, w, corpo, ROXO);
    /* veludo capitonê em cima: losangos com botão de ouro */
    ctx.save(); ctx.beginPath(); ctx.rect(x0, top, w, uH); ctx.clip();
    ctx.strokeStyle = 'rgba(20,4,30,.55)'; ctx.lineWidth = Math.max(u, 1.2);
    for(let d = -uH; d < w + uH; d += 14){ ctx.beginPath(); ctx.moveTo(x0 + d, top); ctx.lineTo(x0 + d + uH, top + uH); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x0 + d, top + uH); ctx.lineTo(x0 + d + uH, top); ctx.stroke(); }
    ctx.fillStyle = OURO; for(let yy = top + 7; yy < top + uH; yy += 7) for(let xx = x0 + ((yy - top) / 7 % 2 ? 7 : 0); xx < x0 + w; xx += 14) ctx.fillRect(xx - .9, yy - .9, 1.8, 1.8);
    ctx.restore();
    /* térreo de oncinha */
    const gy = base - gH;
    ctx.fillStyle = '#D9A55B'; ctx.fillRect(x0, gy, w, gH);
    for(let a = 0; a < Math.round(w * gH / 70); a++){
      const ox = x0 + r() * w, oy = gy + r() * gH, rr = 2.2 + r() * 1.6;
      ctx.fillStyle = '#3B2414'; for(let b2 = 0; b2 < 4; b2++){ const an = b2 * 1.6 + r(); ctx.beginPath(); ctx.ellipse(ox + Math.cos(an) * rr, oy + Math.sin(an) * rr, 1.3, .9, an, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#B7783A'; ctx.beginPath(); ctx.ellipse(ox, oy, rr * .55, rr * .45, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.beginPath(); ctx.rect(x0, gy, w, gH); traco(ctx, 'rgba(15,18,24,.85)', 1);
    /* frisos de ouro: no topo e entre os andares; colunas nas pontas */
    const friso = (yy, h) => { ctx.fillStyle = OURO; ctx.fillRect(x0 - 3, yy, w + 6, h); ctx.fillStyle = OURO_C; ctx.fillRect(x0 - 3, yy, w + 6, Math.max(u, h * .25)); ctx.fillStyle = OURO_E; ctx.fillRect(x0 - 3, yy + h - Math.max(u, h * .22), w + 6, Math.max(u, h * .22)); ctx.beginPath(); ctx.rect(x0 - 3, yy, w + 6, h); traco(ctx, INK, 1.2); };
    const coluna = xx => { ctx.fillStyle = OURO; ctx.fillRect(xx - 4, gy, 8, gH); ctx.fillStyle = OURO_C; ctx.fillRect(xx - 4, gy, 2, gH); ctx.fillStyle = OURO_E; ctx.fillRect(xx + 2, gy, 2, gH); ctx.beginPath(); ctx.rect(xx - 4, gy, 8, gH); traco(ctx, INK, 1.1); };
    coluna(x0 + 4); coluna(x0 + w - 4);
    /* janelas em arco com neon rosa e lustre */
    const nJ = 3, jw = Math.min(40, (w - 50) / nJ - 14), jh = uH * .62;
    for(let a = 0; a < nJ; a++){
      const cx = x0 + w * (a + .5) / nJ, jy = top + 16;
      ctx.beginPath(); ctx.moveTo(cx - jw / 2, jy + jh); ctx.lineTo(cx - jw / 2, jy + jw / 2); ctx.arc(cx, jy + jw / 2, jw / 2, Math.PI, 0); ctx.lineTo(cx + jw / 2, jy + jh); ctx.closePath();
      ctx.fillStyle = '#FFD37A'; ctx.fill(); ctx.fillStyle = 'rgba(255,79,154,.25)'; ctx.fill();
      ctx.save(); ctx.shadowColor = '#FF4F9A'; ctx.shadowBlur = 10; ctx.strokeStyle = '#FF5FA2'; ctx.lineWidth = 2.2; ctx.stroke(); ctx.restore();
      ctx.fillStyle = OURO_E; ctx.fillRect(cx - .6, jy + 4, 1.2, jw * .35);
      ctx.fillStyle = OURO; ctx.beginPath(); ctx.moveTo(cx - 6, jy + jw * .45); ctx.lineTo(cx + 6, jy + jw * .45); ctx.lineTo(cx + 3, jy + jw * .62); ctx.lineTo(cx - 3, jy + jw * .62); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#FFF6D8'; [-4, 0, 4].forEach(dx2 => ctx.fillRect(cx + dx2 - .7, jy + jw * .62, 1.4, 2.2));
    }
    friso(top - 2, 7); friso(gy - 4, 6);
    /* corrente de ouro com medalhão */
    const cA = x0 + 14, cB = x0 + w - 14, cY = top + 8, caida = uH * .62;
    const pt = t => [cA + (cB - cA) * t, cY + caida * 4 * t * (1 - t)];
    for(let t = 0; t <= 1.0001; t += .032){ const [lx, ly] = pt(t), i = Math.round(t / .032); ctx.beginPath(); ctx.ellipse(lx, ly, i % 2 ? 2.6 : 1.4, i % 2 ? 1.4 : 2.6, 0, 0, Math.PI * 2); ctx.strokeStyle = OURO; ctx.lineWidth = 1.4; ctx.stroke(); }
    const [mx, my] = pt(.5);
    ctx.save(); ctx.shadowColor = '#FFE08A'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(mx, my + 9, 9, 0, Math.PI * 2); forma(ctx, OURO, 1.6); ctx.restore();
    ctx.beginPath(); ctx.arc(mx, my + 9, 6.5, 0, Math.PI * 2); traco(ctx, OURO_E, 1); pixTxt(ctx, '$', mx, my + 9, Math.max(1, Math.round(k * 1.6)), INK, 'c');
    /* a porta de ouro, o tapete vermelho e o cordão */
    const dX = x0 + px, dW = 34, dH = 64;
    ctx.beginPath(); ctx.moveTo(dX - dW / 2 - 5, base); ctx.lineTo(dX - dW / 2 - 5, base - dH); ctx.arc(dX, base - dH, dW / 2 + 5, Math.PI, 0); ctx.lineTo(dX + dW / 2 + 5, base); ctx.closePath(); forma(ctx, ROXO, 1.4);
    ctx.beginPath(); ctx.rect(dX - dW / 2, base - dH, dW, dH); forma(ctx, OURO, 1.6);
    ctx.fillStyle = OURO_E; ctx.fillRect(dX - .6, base - dH, 1.2, dH); [[-1, 1]].forEach(() => { ctx.fillStyle = OURO_C; ctx.fillRect(dX - dW / 2 + 4, base - dH + 6, dW / 2 - 8, dH * .4); ctx.fillRect(dX + 4, base - dH + 6, dW / 2 - 8, dH * .4); });
    ctx.fillStyle = INK; ctx.fillRect(dX - 4, base - dH * .5, 2, 6); ctx.fillRect(dX + 2, base - dH * .5, 2, 6);
    /* coroa em cima da porta */
    const coroa = (cx, cy, s2, cor, brilho) => { ctx.beginPath(); ctx.moveTo(cx - 10 * s2, cy); ctx.lineTo(cx - 10 * s2, cy - 8 * s2); ctx.lineTo(cx - 5 * s2, cy - 3 * s2); ctx.lineTo(cx, cy - 11 * s2); ctx.lineTo(cx + 5 * s2, cy - 3 * s2); ctx.lineTo(cx + 10 * s2, cy - 8 * s2); ctx.lineTo(cx + 10 * s2, cy); ctx.closePath(); if(brilho){ ctx.save(); ctx.shadowColor = cor; ctx.shadowBlur = 12; ctx.strokeStyle = cor; ctx.lineWidth = 2.2; ctx.stroke(); ctx.restore(); ctx.strokeStyle = '#FFF6D8'; ctx.lineWidth = .8; ctx.stroke(); } else forma(ctx, cor, 1.2); };
    coroa(dX, base - dH - 9, .7, OURO, false);
    pixPlaca(ctx, '@' + (c.handle || ''), dX, base - dH - 24, { fundo: OURO, cor: INK, borda: INK, max: Math.max(6, Math.floor(w * .95 * k / 4.4)) });
    ctx.fillStyle = VERM; ctx.beginPath(); ctx.moveTo(dX - dW / 2, base); ctx.lineTo(dX + dW / 2, base); ctx.lineTo(dX + dW / 2 + 8, base + 30); ctx.lineTo(dX - dW / 2 - 8, base + 30); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = OURO; ctx.lineWidth = 1.2; ctx.stroke();
    [-1, 1].forEach(sd => {
      const p1 = dX + sd * (dW / 2 + 14), p2 = dX + sd * (dW / 2 + 18);
      [[p1, base + 6], [p2, base + 26]].forEach(([sx2, sy2]) => { ctx.fillStyle = OURO; ctx.fillRect(sx2 - 1.5, sy2 - 14, 3, 14); ctx.beginPath(); ctx.arc(sx2, sy2 - 15, 2.6, 0, Math.PI * 2); forma(ctx, OURO_C, 1); });
      ctx.beginPath(); ctx.moveTo(p1, base - 6); ctx.quadraticCurveTo((p1 + p2) / 2 + sd * 2, base + 12, p2, base + 14); ctx.strokeStyle = VERM; ctx.lineWidth = 2; ctx.stroke();
    });
    /* no telhado: coroa de neon e o globo espelhado */
    const rcx = x0 + w * (lado > 0 ? .3 : .7), rcy = top - dep - 10;
    ctx.fillStyle = '#0B0B0D'; ctx.fillRect(rcx - 1.5, rcy, 3, 10 + dep);
    coroa(rcx, rcy, 2.1, '#FFC93C', true);
    const gx = x0 + w * (lado > 0 ? .78 : .22), gyb = top - dep - 30;
    ctx.fillStyle = '#0B0B0D'; ctx.fillRect(gx - .8, gyb + 12, 1.6, 30 - 12 + dep);
    ctx.beginPath(); ctx.arc(gx, gyb, 12, 0, Math.PI * 2); ctx.fillStyle = '#C9D1DC'; ctx.fill();
    ctx.save(); ctx.clip(); for(let yy = -12; yy < 12; yy += 3.2) for(let xx = -12; xx < 12; xx += 3.2){ const q = r(); ctx.fillStyle = q < .2 ? '#FFFFFF' : q < .4 ? '#9FB4D6' : q < .55 ? '#FFB3D9' : q < .75 ? '#AEB6C4' : '#7C8697'; ctx.fillRect(gx + xx, gyb + yy, 2.8, 2.8); } ctx.restore();
    ctx.beginPath(); ctx.arc(gx, gyb, 12, 0, Math.PI * 2); traco(ctx, INK, 1.2);
    ctx.fillStyle = '#FFFFFF'; [[-14, -8], [13, -3], [-9, 13], [16, 11]].forEach(([sx2, sy2]) => { ctx.fillRect(gx + sx2 - 2.5, gyb + sy2 - .5, 5, 1); ctx.fillRect(gx + sx2 - .5, gyb + sy2 - 2.5, 1, 5); });
    /* o carro roxo de roda dourada, do outro lado da porta */
    const carX = x0 + (lado > 0 ? w * .26 : w * .74), carY = base + 22;
    ctx.fillStyle = 'rgba(15,18,24,.3)'; ctx.fillRect(carX - 36, carY + 6, 72, 5);
    ctx.beginPath(); ctx.moveTo(carX - 36, carY + 2); ctx.lineTo(carX - 36, carY - 8); ctx.lineTo(carX - 18, carY - 10); ctx.lineTo(carX - 10, carY - 20); ctx.lineTo(carX + 14, carY - 20); ctx.lineTo(carX + 22, carY - 10); ctx.lineTo(carX + 36, carY - 8); ctx.lineTo(carX + 36, carY + 2); ctx.closePath(); forma(ctx, '#6B2A8A', 1.4);
    ctx.fillStyle = '#2B1838'; ctx.beginPath(); ctx.moveTo(carX - 8, carY - 18); ctx.lineTo(carX + 12, carY - 18); ctx.lineTo(carX + 18, carY - 10); ctx.lineTo(carX - 14, carY - 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#DDE3EA'; ctx.fillRect(carX - 35, carY - 4, 70, 1.6);
    [carX - 22, carX + 22].forEach(rx => { ctx.beginPath(); ctx.arc(rx, carY + 3, 6.5, 0, Math.PI * 2); forma(ctx, '#121419', 1); ctx.beginPath(); ctx.arc(rx, carY + 3, 3.8, 0, Math.PI * 2); ctx.fillStyle = OURO; ctx.fill(); ctx.fillStyle = OURO_C; ctx.fillRect(rx - .6, carY - .6, 1.2, 7.2); ctx.fillRect(rx - 3.6, carY + 2.4, 7.2, 1.2); });
    return { cv, W, H, M, base };
  }
  /* a casa do @apenassantoro: casa de DJ. O andar de cima é um rádio gigante: duas caixas de som enormes, o visor com
     o equalizador aceso, o deck de fita, os botões coloridos, a antena e a alça em cima. Embaixo, a entrada do clube
     em tijolo preto com DJ em neon, cartaz colado e uma pilha de caixas do lado da porta. Do telhado saem lasers. */
  function spriteDJ(c, k){
    const w = c.w, gH = 80, uH = 112, corpo = gH + uH, M = 46, CIMA = 110, W = w + M * 2, H = corpo + CIMA + M + 24;
    const { cv, ctx } = folha(W, H, k), x0 = M, base = H - M, top = base - corpo, px = c.portaX - c.x, lado = px > w / 2 ? 1 : -1, dep = 4 / k;
    const r = rng(hash(c.id + 'dj')), CIANO = '#38E1FF', PRATA = '#BFC3CA', PRATA_E = '#7C828C', GRAF = '#2A2D33';
    /* lasers saindo de trás da alça */
    const lx = x0 + w / 2, ly = top - 30;
    [[ROSA, -1.05], [CIANO, -.55], [LILAS, -.08], [AMARELO, .42], [LARANJA, .9]].forEach(([cor, an]) => {
      ctx.save(); ctx.shadowColor = cor; ctx.shadowBlur = 8; ctx.strokeStyle = cor; ctx.globalAlpha = .75; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + Math.sin(an) * (CIMA + 60), ly - Math.cos(an) * (CIMA + 40)); ctx.stroke(); ctx.restore();
    });
    ctx.fillStyle = 'rgba(15,18,24,.3)'; ctx.fillRect(x0 - 10, base - 2, w + 20, 10);
    /* térreo: tijolo preto do clube */
    bloco(ctx, x0, base - gH, w, gH, 'preto');
    /* o rádio gigante em cima (um pouco mais largo que o térreo) */
    const bx = x0 - 6, bw = w + 12, by = top;
    bloco(ctx, bx, by, bw, uH, PRATA);
    ctx.fillStyle = PRATA_E; ctx.fillRect(bx, by + uH - 6, bw, 6); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(bx, by, bw, 2);
    /* a alça e a antena */
    ctx.fillStyle = GRAF; ctx.fillRect(bx + bw * .22, by - 22 - dep, 6, 22); ctx.fillRect(bx + bw * .78 - 6, by - 22 - dep, 6, 22); ctx.fillRect(bx + bw * .22, by - 28 - dep, bw * .56, 7);
    ctx.beginPath(); ctx.rect(bx + bw * .22, by - 28 - dep, bw * .56, 7); traco(ctx, INK, 1.2);
    ctx.strokeStyle = '#D9DDE3'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(bx + bw - 14, by - dep); ctx.lineTo(bx + bw + 18, by - 50); ctx.stroke(); ctx.beginPath(); ctx.arc(bx + bw + 18, by - 50, 2, 0, Math.PI * 2); ctx.fillStyle = '#D9DDE3'; ctx.fill();
    /* as duas caixas de som */
    const R = Math.min(uH * .36, w * .2), cy = by + uH * .55;
    [bx + R + 12, bx + bw - R - 12].forEach(cx => {
      ctx.beginPath(); ctx.arc(cx, cy, R + 4, 0, Math.PI * 2); forma(ctx, GRAF, 1.6);
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R + 3, 0, Math.PI * 2); ctx.clip(); ctx.fillStyle = '#3B3F47'; for(let yy = -R; yy < R; yy += 3) for(let xx = -R; xx < R; xx += 3) ctx.fillRect(cx + xx, cy + yy, 1.2, 1.2); ctx.restore();
      ctx.beginPath(); ctx.arc(cx, cy, R * .78, 0, Math.PI * 2); ctx.fillStyle = '#1C1E22'; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, R * .62, 0, Math.PI * 2); ctx.fillStyle = '#34383F'; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, R * .62, Math.PI * 1.1, Math.PI * 1.6); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, R * .2, 0, Math.PI * 2); ctx.fillStyle = '#121316'; ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(cx - R * .1, cy - R * .12, R * .08, R * .08);
    });
    /* no meio: botões, o visor com o equalizador e o deck de fita */
    const mx0 = bx + 2 * R + 26, mx1 = bx + bw - 2 * R - 26, mw = mx1 - mx0;
    if(mw > 24){
      [ROSA, AMARELO, AZUL, LARANJA, LILAS].forEach((cor, i) => { const bb = Math.min(8, mw / 6); ctx.beginPath(); ctx.rect(mx0 + i * (bb + 2), by - dep - 4, bb, 4); forma(ctx, cor, 1); });
      const vy = by + 12, vh = uH * .34;
      ctx.beginPath(); ctx.rect(mx0, vy, mw, vh); forma(ctx, '#101318', 1.4);
      const nb = Math.max(4, Math.floor(mw / 5)), CORES = ['#38E1FF', AMARELO, LARANJA, ROSA];
      for(let i = 0; i < nb; i++){ const hb = (.25 + r() * .7) * (vh - 6), xb = mx0 + 3 + i * (mw - 6) / nb; for(let yy = 0; yy < hb; yy += 3){ const q = yy / (vh - 6); ctx.fillStyle = CORES[Math.min(3, Math.floor(q * 4))]; ctx.fillRect(xb, vy + vh - 3 - yy - 2, (mw - 6) / nb - 1.2, 2); } }
      const dy0 = vy + vh + 8, dh = uH * .3;
      ctx.beginPath(); ctx.rect(mx0, dy0, mw, dh); forma(ctx, GRAF, 1.4);
      ctx.beginPath(); ctx.rect(mx0 + 4, dy0 + 4, mw - 8, dh - 8); ctx.fillStyle = '#5A4A3A'; ctx.fill();
      [mx0 + mw * .32, mx0 + mw * .68].forEach(rx => { ctx.beginPath(); ctx.arc(rx, dy0 + dh / 2, Math.min(dh * .28, mw * .12), 0, Math.PI * 2); forma(ctx, '#EDEAE3', 1); ctx.fillStyle = INK; ctx.fillRect(rx - .6, dy0 + dh / 2 - 2, 1.2, 4); });
    }
    /* térreo: porta com moldura de neon, DJ em neon, cartaz e a pilha de caixas */
    const dX = x0 + px;
    porta(ctx, dX, base, 30, 60, '#0E0F12');
    ctx.save(); ctx.shadowColor = ROSA; ctx.shadowBlur = 10; ctx.strokeStyle = ROSA; ctx.lineWidth = 1.8; ctx.strokeRect(dX - 18, base - 64, 36, 64); ctx.restore();
    pixPlaca(ctx, '@' + (c.handle || ''), dX, base - 72, { fundo: PAPEL, cor: INK, borda: INK, max: Math.max(6, Math.floor(w * .95 * k / 4.4)) });
    /* o DJ em neon no alto da parede, longe da porta, e os cartazes colados embaixo dele */
    const cX = x0 + (lado > 0 ? w * .22 : w * .78), ds = Math.max(1, Math.round(k * 3.2));
    ctx.save(); ctx.shadowColor = CIANO; ctx.shadowBlur = 12; pixTxt(ctx, 'DJ', cX, base - gH + 18, ds, CIANO, 'c'); ctx.restore();
    ctx.save(); ctx.shadowColor = CIANO; ctx.shadowBlur = 4; pixTxt(ctx, 'DJ', cX, base - gH + 18, ds, '#E6FCFF', 'c'); ctx.restore();
    [[cX - 22, base - 42, '#F2EC54', -.05], [cX + 2, base - 38, '#FF8A3D', .06]].forEach(([qx, qy, cor, an]) => { ctx.save(); ctx.translate(qx, qy); ctx.rotate(an); ctx.beginPath(); ctx.rect(0, 0, 20, 28); forma(ctx, cor, 1.2); ctx.fillStyle = INK; ctx.fillRect(3, 4, 14, 3); ctx.fillRect(3, 10, 10, 2); ctx.beginPath(); ctx.arc(10, 19, 5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = cor; ctx.beginPath(); ctx.arc(10, 19, 1.5, 0, Math.PI * 2); ctx.fill(); ctx.restore(); });
    const sX = x0 + (lado > 0 ? w * .47 : w * .53);
    [[0, 0], [0, 1]].forEach(([, i]) => { const sy = base - 22 - i * 22; ctx.beginPath(); ctx.rect(sX - 13, sy, 26, 22); forma(ctx, '#15171B', 1.4); ctx.beginPath(); ctx.arc(sX, sy + 13, 7, 0, Math.PI * 2); ctx.fillStyle = '#34383F'; ctx.fill(); ctx.beginPath(); ctx.arc(sX, sy + 13, 2.2, 0, Math.PI * 2); ctx.fillStyle = '#121316'; ctx.fill(); ctx.beginPath(); ctx.arc(sX, sy + 4.5, 2.2, 0, Math.PI * 2); ctx.fillStyle = '#34383F'; ctx.fill(); });
    luzParede(ctx, x0 + 14, base, 60); luzParede(ctx, x0 + w - 14, base, 60);
    return { cv, W, H, M, base };
  }
  /* v3.80 · a casa do @jeydiaz: mansão brutalista soviética (o Thales pediu). Concreto aparente com a marca das
     tábuas da forma e as manchas de chuva, o térreo de vidro recuado em cima de pilares em V, o bloco em balanço com as
     janelas em fita atrás dos brises, o painel de mosaico do lado (um foguete subindo num sol de raios, em pastilha,
     desenho nosso), a marquise grossa com a escadaria, a torre redonda com as aletas no telhado, o letreiro de neon
     vermelho na treliça (o @ dele) e a estrela vermelha no mastro. */
  function spriteBrutal(c, k){
    const w = c.w, gH = 64, mH = 118, CIMA = 150, M = 52, W = w + M * 2, H = gH + mH + CIMA + M + 24;
    const { cv, ctx } = folha(W, H, k), x0 = M, base = H - M, px = c.portaX - c.x, lado = px > w / 2 ? 1 : -1, u = 1 / k, dep = 4 / k;
    const r = rng(hash(c.id + 'brutal')), CONC = '#9EA1A6', CONC_C = '#B9BBBE', CONC_E = '#6E7177', VERM = '#C8102E', OURO = '#F2C230', CEU = '#6FA8FF';
    const marcas = (x, y, ww, hh, passo) => {
      /* a marca das tábuas (linhas finas na horizontal) e as manchas de chuva escorrendo das quinas */
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, ww, hh); ctx.clip();
      ctx.fillStyle = 'rgba(15,18,24,.09)'; for(let yy = y + passo; yy < y + hh; yy += passo) ctx.fillRect(x, yy, ww, Math.max(u, .7));
      ctx.fillStyle = 'rgba(255,255,255,.07)'; for(let yy = y + passo + 1; yy < y + hh; yy += passo) ctx.fillRect(x, yy, ww, Math.max(u, .5));
      for(let a = 0; a < Math.round(ww / 26); a++){ const sx = x + r() * ww, sw = 2 + r() * 5, sh = hh * (.2 + r() * .55); const g = ctx.createLinearGradient(0, y, 0, y + sh); g.addColorStop(0, 'rgba(40,42,48,.26)'); g.addColorStop(1, 'rgba(40,42,48,0)'); ctx.fillStyle = g; ctx.fillRect(sx, y, sw, sh); }
      ctx.restore();
    };
    /* concreto de forma é liso: a textura de bloco fica só um fundo (sem parecer tijolo) */
    const laje = (x, y, ww, hh) => { bloco(ctx, x, y, ww, hh, 'concreto'); ctx.fillStyle = 'rgba(158,161,166,.74)'; ctx.fillRect(x, y, ww, hh); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x, y, ww, Math.max(u, 1.4)); ctx.fillStyle = 'rgba(15,18,24,.22)'; ctx.fillRect(x, y + hh - 2, ww, 2); };
    ctx.fillStyle = 'rgba(15,18,24,.32)'; ctx.fillRect(x0 - 16, base - 2, w + 32, 11);
    /* ---- o mastro e a estrela, atrás de tudo ---- */
    const tX = x0 + w * (lado > 0 ? .3 : .7), topoBloco = base - gH - mH, tW = Math.min(78, w * .3), tH = 58, tY = topoBloco - tH;
    const mX = tX, mTopo = tY - 74;
    ctx.fillStyle = '#3A3D44'; ctx.fillRect(mX - 1.6, mTopo, 3.2, tY - mTopo);
    for(let yy = mTopo + 10; yy < tY; yy += 9){ ctx.fillStyle = '#5A5E66'; ctx.fillRect(mX - 4, yy, 8, Math.max(u, 1)); }
    const estrela = (cx, cy, R, cor) => { ctx.beginPath(); for(let i = 0; i < 10; i++){ const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? R * .42 : R; ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } ctx.closePath(); ctx.save(); ctx.shadowColor = '#FF3B4E'; ctx.shadowBlur = 14; ctx.fillStyle = cor; ctx.fill(); ctx.restore(); ctx.lineWidth = Math.max(u, 1.1); ctx.strokeStyle = '#7A0A18'; ctx.stroke(); };
    estrela(mX, mTopo - 4, 13, VERM);
    ctx.beginPath(); for(let i = 0; i < 10; i++){ const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 2.6 : 6.4; ctx.lineTo(mX + Math.cos(a) * rr, mTopo - 4 + Math.sin(a) * rr); } ctx.closePath(); ctx.fillStyle = 'rgba(255,190,190,.65)'; ctx.fill();
    /* ---- o letreiro de neon na treliça, do outro lado do telhado ---- */
    const nome = String(c.handle || '').toUpperCase().replace(/[^A-Z0-9._]/g, '').slice(0, 12) || 'CORRE';
    const lX = x0 + w * (lado > 0 ? .72 : .28), lW = w * .4, ls = Math.max(1, Math.floor(Math.min(lW * .9 * k / pixLarg(nome, 1), k * 2.6))), lAlt = 5 * ls / k + 10, lY = topoBloco - dep - 26;
    ctx.strokeStyle = '#2A2D33'; ctx.lineWidth = Math.max(u, 1);
    ctx.beginPath(); for(let xx = lX - lW / 2; xx <= lX + lW / 2 + .1; xx += 10){ ctx.moveTo(xx, topoBloco - dep); ctx.lineTo(xx, lY - lAlt / 2); } for(let xx = lX - lW / 2; xx < lX + lW / 2 - 1; xx += 10){ ctx.moveTo(xx, topoBloco - dep); ctx.lineTo(xx + 10, lY - lAlt / 2); ctx.moveTo(xx + 10, topoBloco - dep); ctx.lineTo(xx, lY - lAlt / 2); } ctx.stroke();
    ctx.fillStyle = '#2A2D33'; ctx.fillRect(lX - lW / 2 - 2, lY - lAlt / 2 - 2, lW + 4, 3);
    ctx.save(); ctx.shadowColor = '#FF3B4E'; ctx.shadowBlur = 12; pixTxt(ctx, nome, lX, lY - lAlt / 2 - 10, ls, '#FF4458', 'c'); ctx.restore();
    ctx.save(); ctx.shadowColor = '#FF3B4E'; ctx.shadowBlur = 3; pixTxt(ctx, nome, lX, lY - lAlt / 2 - 10, ls, '#FFD6DB', 'c'); ctx.restore();
    /* ---- a torre redonda com as aletas ---- */
    bloco(ctx, tX - tW / 2, tY, tW, tH, 'concreto');
    for(let a = 0; a < 9; a++){ const f = (a + .5) / 9, xx = tX - tW / 2 + f * tW, larg = tW / 9 * .5, luz = Math.cos((f - .3) * Math.PI); ctx.fillStyle = luz > .4 ? CONC_C : luz > 0 ? CONC : CONC_E; ctx.fillRect(xx - larg / 2, tY + 4, larg, tH - 8); ctx.fillStyle = 'rgba(15,18,24,.3)'; ctx.fillRect(xx + larg / 2, tY + 4, Math.max(u, larg * .25), tH - 8); }
    ctx.fillStyle = 'rgba(15,18,24,.55)'; ctx.fillRect(tX - tW / 2 + 3, tY + tH * .45, tW - 6, 6); vidro(ctx, tX - tW / 2 + 3, tY + tH * .45, tW - 6, 6, r() < .7, 9);
    ctx.beginPath(); ctx.ellipse(tX, tY, tW / 2 + 3, 5, 0, 0, Math.PI * 2); forma(ctx, CONC_C, 1.2);
    /* ---- o bloco em balanço (mais largo que o térreo) ---- */
    const bx = x0 - 10, bw = w + 20, by = topoBloco;
    laje(bx, by, bw, mH); marcas(bx, by, bw, mH, 7);
    /* o mosaico: no lado sem a porta, uma placa de pastilha de 3 px */
    const mw = Math.round(bw * .3), mx = lado > 0 ? bx + 12 : bx + bw - 12 - mw, my = by + 10, mh = mH - 20, P = 3;
    ctx.fillStyle = '#2A2D33'; ctx.fillRect(mx - 3, my - 3, mw + 6, mh + 6);
    const sol = [mx + mw * .5, my + mh * .3], ang = -1.05, ca = Math.cos(ang), sa = Math.sin(ang), fg = [mx + mw * .5, my + mh * .62];
    for(let yy = 0; yy < mh; yy += P) for(let xx = 0; xx < mw; xx += P){
      const X = mx + xx + P / 2, Y = my + yy + P / 2, dx = X - sol[0], dy = Y - sol[1], d = Math.hypot(dx, dy), raio = ((Math.atan2(dy, dx) + Math.PI) / (Math.PI / 8)) | 0;
      let cor = Y > my + mh * .82 ? (((xx / P) + (yy / P)) % 3 ? '#2E5BFF' : '#1E3FB8') : d < mw * .16 ? OURO : raio % 2 ? '#FF8A3D' : CEU;
      /* o foguete: um corpo inclinado com a ponta vermelha e o fogo atrás */
      const lx = (X - fg[0]) * ca + (Y - fg[1]) * sa, ly = -(X - fg[0]) * sa + (Y - fg[1]) * ca;
      if(Math.abs(ly) < mw * .09 && lx > -mw * .3 && lx < mw * .24) cor = lx > mw * .12 ? VERM : Math.abs(ly) < mw * .03 && lx > -mw * .05 && lx < mw * .05 ? CEU : '#EEEBE4';
      if(lx >= mw * .24 && lx < mw * .34 && Math.abs(ly) < (mw * .34 - lx) * .9) cor = VERM;
      if(lx < -mw * .3 && lx > -mw * .62 && Math.abs(ly) < (lx + mw * .62) * .32) cor = (xx + yy) % 2 ? '#FFE45E' : '#FF8A3D';
      if(Math.abs(ly) > mw * .09 && Math.abs(ly) < mw * .17 && lx > -mw * .3 && lx < -mw * .18) cor = VERM;
      ctx.fillStyle = cor; ctx.fillRect(mx + xx, my + yy, P - Math.max(u, .5), P - Math.max(u, .5));
    }
    [[.15, .12], [.84, .2], [.1, .55], [.88, .5]].forEach(([fx, fy]) => { const sx = mx + mw * fx, sy = my + mh * fy; ctx.fillStyle = '#FFFFFF'; ctx.fillRect(sx - 1.5, sy - .5, 3, 1); ctx.fillRect(sx - .5, sy - 1.5, 1, 3); });
    /* as janelas em fita, fundas, com a sombra da laje e os brises na frente */
    const fx0 = lado > 0 ? mx + mw + 14 : bx + 12, fx1 = lado > 0 ? bx + bw - 12 : mx - 14;
    [[by + 16, 26], [by + 64, 26]].forEach(([fy, fh]) => {
      vidro(ctx, fx0, fy, fx1 - fx0, fh, r() < .65, 40);
      ctx.fillStyle = 'rgba(15,18,24,.45)'; ctx.fillRect(fx0, fy, fx1 - fx0, 5);
      for(let xx = fx0 + 4; xx < fx1 - 3; xx += 11){ ctx.fillStyle = CONC; ctx.fillRect(xx, fy - 3, 4, fh + 6); ctx.fillStyle = CONC_E; ctx.fillRect(xx + 3, fy - 3, 1.6, fh + 6); ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(xx, fy - 3, Math.max(u, .8), fh + 6); }
      ctx.fillStyle = CONC_C; ctx.fillRect(fx0 - 4, fy + fh + 3, fx1 - fx0 + 8, 4); ctx.fillStyle = 'rgba(15,18,24,.3)'; ctx.fillRect(fx0 - 4, fy + fh + 7, fx1 - fx0 + 8, 2);
    });
    /* a sombra que o balanço faz no térreo */
    const gy = base - gH;
    /* ---- o térreo: vidro recuado e os pilares em V ---- */
    ctx.fillStyle = '#3A3D44'; ctx.fillRect(x0 + 6, gy, w - 12, gH);
    vidro(ctx, x0 + 14, gy + 10, w - 28, gH - 10, true, 30);
    const sg = ctx.createLinearGradient(0, gy, 0, gy + 22); sg.addColorStop(0, 'rgba(15,18,24,.55)'); sg.addColorStop(1, 'rgba(15,18,24,0)'); ctx.fillStyle = sg; ctx.fillRect(x0 + 6, gy, w - 12, 22);
    const nP = 5;
    for(let a = 0; a < nP; a++){
      const cx = x0 + 14 + a * (w - 28) / (nP - 1); if(Math.abs(cx - (x0 + px)) < 34) continue;
      ctx.beginPath(); ctx.moveTo(cx - 3, base); ctx.lineTo(cx + 3, base); ctx.lineTo(cx + 9, gy); ctx.lineTo(cx - 9, gy); ctx.closePath(); forma(ctx, CONC, 1.2);
      ctx.beginPath(); ctx.moveTo(cx + 1, base); ctx.lineTo(cx + 3, base); ctx.lineTo(cx + 9, gy); ctx.lineTo(cx + 5, gy); ctx.closePath(); ctx.fillStyle = 'rgba(15,18,24,.28)'; ctx.fill();
    }
    /* a porta, a marquise grossa e a escadaria */
    const dX = x0 + px;
    porta(ctx, dX, base, 34, 50, '#1B1D22');
    ctx.fillStyle = '#FFD37A'; ctx.fillRect(dX - 15, base - 48, 30, 3);
    const mqW = 74, mqY = base - 62;
    laje(dX - mqW / 2, mqY, mqW, 9);
    ctx.fillStyle = 'rgba(15,18,24,.35)'; ctx.fillRect(dX - mqW / 2 + 3, mqY + 9, mqW - 6, 3);
    ctx.fillStyle = CONC; ctx.fillRect(dX - mqW / 2 + 4, mqY + 9, 4, base - mqY - 9); ctx.fillRect(dX + mqW / 2 - 8, mqY + 9, 4, base - mqY - 9);
    [0, 1, 2].forEach(d => { const sw = 44 + d * 12, sy = base + d * 4; ctx.beginPath(); ctx.rect(dX - sw / 2, sy, sw, 4); forma(ctx, d % 2 ? CONC_C : CONC, 1); });
    pixPlaca(ctx, '@' + (c.handle || ''), dX, mqY - 7, { fundo: VERM, cor: '#FFFFFF', borda: INK, max: Math.max(6, Math.floor(w * .5 * k / 4.4)) });
    luzParede(ctx, dX - 26, base, 50); luzParede(ctx, dX + 26, base, 50);
    /* os holofotes do chão que lavam o concreto */
    [x0 + 10, x0 + w - 10].forEach(hx => { const g = ctx.createLinearGradient(0, base, 0, by); g.addColorStop(0, 'rgba(255,226,170,.32)'); g.addColorStop(1, 'rgba(255,226,170,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(hx - 3, base); ctx.lineTo(hx + 3, base); ctx.lineTo(hx + 22, by); ctx.lineTo(hx - 22, by); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#2A2D33'; ctx.fillRect(hx - 4, base - 4, 8, 4); });
    return { cv, W, H, M, base };
  }
  /* Gleba Palhano: as torres da beira do lago */
  function spriteTorre(g, k){
    const M = 24, H = g.h + 70, base = H - M, { cv, ctx } = folha(g.w + M * 2, H, k), x0 = M, r = rng(hash(g.id));
    ctx.fillStyle = 'rgba(15,18,24,.25)'; ctx.fillRect(x0 - 6, base - 2, g.w + 12, 10);
    bloco(ctx, x0, base - g.h, g.w, g.h, g.cor);
    for(let y = base - g.h + 16; y < base - 40; y += 26){ vidro(ctx, x0 + 10, y, g.w - 20, 14, r() < .55, 28); ctx.fillStyle = '#121419'; ctx.fillRect(x0 - 3, y + 16, g.w + 6, 3); }
    vidro(ctx, x0 + 14, base - 34, g.w - 28, 34, true, 30);
    bloco(ctx, x0 + g.w / 2 - 20, base - g.h - 22, 40, 22, 'escuro');
    return { cv, W: g.w + M * 2, H, M, base };
  }
  /* abóbada em blocos (Museu de Arte) */
  function arco(ctx, x, y, w, h, m){ const u = 1 / escala(ctx), s = u * 2, pat = pad(ctx, m); for(let xx = x; xx < x + w - .01; xx += s){ const dx = (xx + s / 2 - x - w / 2) / (w / 2), hh = Math.round(h * Math.sqrt(Math.max(0, 1 - dx * dx)) / u) * u; ctx.fillStyle = pat; ctx.fillRect(xx, y - hh, s, hh); ctx.fillStyle = '#121419'; ctx.fillRect(xx, y - hh, s, u); } }
  /* Teatro Ouro Verde: fachada branca modernista, brises na frente do vidro, o nome na faixa e a marquise */
  function spriteTeatro(k){
    const W = LW, M = 20, H = 320, base = H - M, { cv, ctx } = folha(W + M * 2, H, k), x0 = M, cx = x0 + W / 2, L = Math.max(2, 1.05 / k);
    ctx.fillStyle = 'rgba(15,18,24,.22)'; ctx.fillRect(x0 + 20, base - 2, W - 40, 10);
    bloco(ctx, x0 + 30, base - 226, 240, 226, 'branco');
    vidro(ctx, x0 + 46, base - 210, 208, 92, true, 400);
    ctx.fillStyle = '#F4F1EA'; for(let xx = x0 + 50; xx < x0 + 250; xx += 16) ctx.fillRect(xx, base - 212, 7, 96);
    ctx.fillStyle = 'rgba(15,18,24,.22)'; for(let xx = x0 + 50; xx < x0 + 250; xx += 16) ctx.fillRect(xx + 6, base - 212, 2, 96);
    ctx.fillStyle = '#121419'; ctx.fillRect(x0 + 30, base - 112, 240, 32);
    pixTxt(ctx, 'OURO VERDE', cx, base - 96, pixLarg('OURO VERDE', 2) / k <= 226 ? 2 : 1, '#FFE7A8', 'c');
    bloco(ctx, x0 + 12, base - 64, 276, 10, 'branco'); ctx.fillStyle = '#FFF3C4'; ctx.fillRect(x0 + 16, base - 54, 268, L);
    vidro(ctx, x0 + 62, base - 50, 176, 50, true, 29);
    [[x0 + 34, ROSA], [x0 + 246, AMARELO]].forEach(([x, cor]) => { ctx.beginPath(); ctx.rect(x, base - 46, 20, 30); forma(ctx, cor, 2); ctx.fillStyle = INK; ctx.fillRect(x + 4, base - 40, 12, 2); ctx.fillRect(x + 4, base - 34, 8, 2); ctx.fillRect(x + 4, base - 28, 10, 2); });
    pixPlaca(ctx, 'TEATRO', cx, base - 240, { fundo: PAPEL });
    return { cv, W: W + M * 2, H, M, base };
  }
  /* Museu de Arte: a antiga rodoviária, com as abóbadas de concreto em fila sobre o vidro */
  function spriteArte(k){
    const W = LW, M = 20, H = 240, base = H - M, { cv, ctx } = folha(W + M * 2, H, k), x0 = M, cx = x0 + W / 2;
    ctx.fillStyle = 'rgba(15,18,24,.22)'; ctx.fillRect(x0 + 10, base - 2, W - 20, 10);
    bloco(ctx, x0 + 18, base - 74, 264, 74, 'concreto');
    vidro(ctx, x0 + 28, base - 64, 244, 58, true, 30);
    for(let i = 0; i < 4; i++) arco(ctx, x0 + 12 + i * 69, base - 74, 69, 40, 'branco');
    ctx.fillStyle = '#121419'; ctx.fillRect(x0 + 10, base - 78, 280, 5);
    ctx.fillStyle = '#121419'; for(let i = 0; i <= 4; i++) ctx.fillRect(x0 + 12 + i * 69 - 2, base - 74, 4, 74);
    porta(ctx, cx, base, 34, 52, '#121419');
    pixPlaca(ctx, 'MUSEU DE ARTE', cx, base - 134, { fundo: PAPEL });
    return { cv, W: W + M * 2, H, M, base };
  }
  /* Estádio do Café: a arquibancada de frente, com a cobertura, o nome, as bandeiras e os refletores */
  function spriteEstadio(e, k){
    const w = e.fw, sh = e.campo.y - e.fy, rise = sh + 70, M = 30, H = rise + 200 + M, W = w + M * 2, base = H - M, { cv, ctx } = folha(W, H, k), x0 = M, L = Math.max(2, 1.05 / k);
    const deg = 10, dh = rise / deg, pc = pad(ctx, 'concreto');
    for(let i = 0; i < deg; i++){ const y = base - (i + 1) * dh; ctx.fillStyle = pc; ctx.fillRect(x0, y, w, dh); ctx.fillStyle = i % 3 === 2 ? '#EEEBE4' : '#2E5BFF'; for(let xx = x0 + 4; xx < x0 + w - 6; xx += 9) ctx.fillRect(xx, y + 2, 6, dh - 5); ctx.fillStyle = 'rgba(15,18,24,.35)'; ctx.fillRect(x0, y + dh - 2, w, 2); }
    const r = rng(42); for(let i = 0; i < 170; i++){ const xx = x0 + 6 + r() * (w - 12), yy = base - 6 - r() * (rise - 10); ctx.fillStyle = [PAPEL, '#1B1D22', AZUL, AMARELO, '#8D5A3B', '#F1C19B'][Math.floor(r() * 6)]; ctx.fillRect(xx, yy, 4, 5); }
    ctx.fillStyle = 'rgba(15,18,24,.25)'; ctx.fillRect(x0, base - 3, w, 3);
    const top = base - rise;
    ctx.fillStyle = '#121419'; for(let xx = x0 + 30; xx < x0 + w - 20; xx += 110) ctx.fillRect(xx, top - 44, 6, 44 + dh * 2);
    bloco(ctx, x0 - 8, top - 58, w + 16, 16, 'escuro'); ctx.fillStyle = '#FFF3C4'; ctx.fillRect(x0, top - 42, w, L);
    pixPlaca(ctx, 'ESTADIO DO CAFE', x0 + w / 2, top - 80, { fundo: PAPEL, s: 2 });
    [[x0 + 60, AZUL], [x0 + w - 86, PAPEL]].forEach(([xx, cor]) => { ctx.fillStyle = '#2B2F38'; ctx.fillRect(xx, top - 104, 3, 46); ctx.fillStyle = cor; ctx.fillRect(xx + 3, top - 104, 22, 14); ctx.beginPath(); ctx.rect(xx + 3, top - 104, 22, 14); traco(ctx, INK, 1.5); });
    [x0 + 4, x0 + w - 9].forEach(xx => { ctx.fillStyle = '#2B2F38'; ctx.fillRect(xx, top - 170, 5, 170 + rise * .3); ctx.fillRect(xx - 16, top - 192, 37, 26); ctx.fillStyle = '#FFF3C4'; for(let i = 0; i < 4; i++) for(let j = 0; j < 2; j++) ctx.fillRect(xx - 13 + i * 9, top - 189 + j * 11, 6, 8); });
    return { cv, W, H, M, base };
  }
  /* prédio de apartamento, com varanda, marquise e caixa d'água */
  function spritePredio(f, k){
    const q = rng(f.sd + 7), w = f.pw, fh = 30, gH = 48, corpo = gH + f.andares * fh, M = 30, W = w + M * 2, H = corpo + 40 + M + 20;
    const { cv, ctx } = folha(W, H, k), x0 = M, base = H - M, top = base - corpo, L = Math.max(2, 1.05 / k);
    ctx.fillStyle = 'rgba(15,18,24,.25)'; ctx.fillRect(x0 - 8, base - 2, w + 16, 10);
    bloco(ctx, x0, top, w, corpo, f.cor);
    const nj = Math.max(2, Math.round(w / 64)), jw = (w - 20) / nj;
    for(let a = 0; a < f.andares; a++){
      const y = top + 8 + a * fh;
      for(let j = 0; j < nj; j++) vidro(ctx, x0 + 10 + j * jw + 4, y + 2, jw - 8, fh - 13, q() < .5, 400);
      if(f.varanda){ ctx.fillStyle = 'rgba(170,215,255,.45)'; ctx.fillRect(x0 + 6, y + fh - 17, w - 12, 8); ctx.fillStyle = '#121419'; ctx.fillRect(x0 + 6, y + fh - 18, w - 12, L); for(let xx = x0 + 6; xx <= x0 + w - 6; xx += 12) ctx.fillRect(xx, y + fh - 18, L, 9); }
      ctx.fillStyle = 'rgba(15,18,24,.16)'; ctx.fillRect(x0, y + fh - 8, w, 3);
    }
    vidro(ctx, x0 + 12, base - gH + 12, Math.round(w * .42), gH - 16, true, 30);
    ctx.beginPath(); ctx.rect(x0 + w * .58, base - gH + 4, w * .34, 7); forma(ctx, f.marquise === INK ? '#2B2F38' : f.marquise, 2);
    porta(ctx, x0 + w * .75, base, 26, 40, '#121419');
    bloco(ctx, x0 + w * .18, top - 20, 36, 20, 'concreto'); ctx.fillStyle = '#121419'; ctx.fillRect(x0 + w * .62, top - 12, 3, 12); ctx.fillRect(x0 + w * .62, top - 12, 16, L);
    return { cv, W, H, M, base };
  }
  /* duas lojas lado a lado: toldo listrado, vitrine e letreiro */
  function spriteLoja(f, k){
    const M = 24, W = LW + M * 2, H = 180 + M, base = H - M, { cv, ctx } = folha(W, H, k);
    ctx.fillStyle = 'rgba(15,18,24,.25)'; ctx.fillRect(M + 8, base - 2, LW - 16, 10);
    f.lojas.forEach((l, i) => {
      const x0 = M + 14 + i * 140, w = 132, h = l.alto ? 126 : 92;
      bloco(ctx, x0, base - h, w, h, l.cor);
      if(l.alto) vidro(ctx, x0 + 14, base - h + 10, w - 28, 22, l.luz, 34);
      vidro(ctx, x0 + 10, base - 44, Math.round(w * .52), 38, true, 32);
      porta(ctx, x0 + w * .8, base, 24, 44, '#121419');
      const tw = (w - 8) / 8; for(let s = 0; s < 8; s++){ ctx.fillStyle = s % 2 ? PAPEL : l.toldo; ctx.fillRect(x0 + 4 + s * tw, base - 58, tw + .5, 12); }
      ctx.fillStyle = 'rgba(15,18,24,.25)'; ctx.fillRect(x0 + 4, base - 46, w - 8, 3); ctx.beginPath(); ctx.rect(x0 + 4, base - 58, w - 8, 12); traco(ctx, INK, 1.5);
      pixPlaca(ctx, l.nome, x0 + w / 2, base - 74, { fundo: l.placa, cor: l.placaCor, max: 12 });
    });
    return { cv, W, H, M, base };
  }
  /* quiosque da orla */
  function spriteQuiosque(q, k){
    const M = 20, w = 70, W = w + M * 2, H = 124 + M, base = H - M, { cv, ctx } = folha(W, H, k), x0 = M;
    ctx.fillStyle = 'rgba(15,18,24,.25)'; ctx.fillRect(x0 - 6, base - 2, w + 12, 8);
    bloco(ctx, x0 + 4, base - 34, w - 8, 34, 'madeira');
    ctx.fillStyle = '#121419'; ctx.fillRect(x0 + 6, base - 74, 4, 40); ctx.fillRect(x0 + w - 10, base - 74, 4, 40);
    ctx.fillStyle = '#FFD37A'; ctx.fillRect(x0 + 12, base - 62, w - 24, 26); ctx.fillStyle = 'rgba(255,140,60,.25)'; ctx.fillRect(x0 + 12, base - 48, w - 24, 12);
    const tw = (w + 8) / 6; for(let s = 0; s < 6; s++){ ctx.fillStyle = s % 2 ? PAPEL : q.cor; ctx.fillRect(x0 - 4 + s * tw, base - 88, tw + .5, 14); }
    ctx.beginPath(); ctx.rect(x0 - 4, base - 88, w + 8, 14); traco(ctx, INK, 1.5);
    ctx.fillStyle = q.cor; ctx.fillRect(x0 + 14, base - 42, 8, 8); ctx.fillStyle = PAPEL; ctx.fillRect(x0 + 28, base - 42, 8, 8); ctx.fillStyle = AMARELO; ctx.fillRect(x0 + 42, base - 42, 8, 8);
    pixPlaca(ctx, q.nome, x0 + w / 2, base - 100, { fundo: PAPEL, max: 14 });
    return { cv, W, H, M, base };
  }
  /* food truck do Zerão */
  function spriteTruck(tr, k){
    const M = 20, w = 84, W = w + M * 2, H = 112 + M, base = H - M, { cv, ctx } = folha(W, H, k), x0 = M;
    ctx.fillStyle = 'rgba(15,18,24,.25)'; ctx.fillRect(x0 - 4, base - 2, w + 8, 7);
    bloco(ctx, x0, base - 58, w - 18, 50, tr.cor);
    bloco(ctx, x0 + w - 18, base - 42, 18, 34, tr.cor); ctx.fillStyle = '#2A3442'; ctx.fillRect(x0 + w - 14, base - 38, 11, 12);
    ctx.fillStyle = '#FFD37A'; ctx.fillRect(x0 + 10, base - 46, 42, 18); ctx.beginPath(); ctx.rect(x0 + 10, base - 46, 42, 18); traco(ctx, INK, 1.5);
    const tw = 50 / 6; for(let s = 0; s < 6; s++){ ctx.fillStyle = s % 2 ? PAPEL : INK; ctx.fillRect(x0 + 6 + s * tw, base - 55, tw + .5, 7); }
    ctx.fillStyle = '#0B0C10'; ctx.fillRect(x0 + 8, base - 10, 12, 10); ctx.fillRect(x0 + w - 22, base - 10, 12, 10);
    pixPlaca(ctx, tr.nome, x0 + (w - 18) / 2, base - 70, { fundo: PAPEL });
    return { cv, W, H, M, base };
  }
  /* barraca de feira */
  function spriteBarraca(b, k){
    const M = 16, w = 72, W = w + M * 2, H = 96 + M, base = H - M, { cv, ctx } = folha(W, H, k), x0 = M;
    ctx.fillStyle = 'rgba(15,18,24,.22)'; ctx.fillRect(x0 - 4, base - 2, w + 8, 7);
    ctx.fillStyle = '#2B2F38'; ctx.fillRect(x0 + 2, base - 62, 3, 62); ctx.fillRect(x0 + w - 5, base - 62, 3, 62);
    bloco(ctx, x0 + 4, base - 22, w - 8, 14, 'madeira');
    const cores = [[LARANJA, AMARELO, '#E2412E'], [ROSA, LILAS, PAPEL], ['#8E4B2B', AMARELO, LARANJA], [AZUL, PAPEL, ROSA]][b.coisa % 4];
    for(let i = 0; i < 6; i++){ ctx.fillStyle = cores[i % 3]; ctx.fillRect(x0 + 8 + i * 10, base - 30, 8, 8); }
    const tw = (w + 8) / 6; for(let s = 0; s < 6; s++){ ctx.fillStyle = s % 2 ? PAPEL : b.cor; ctx.fillRect(x0 - 4 + s * tw, base - 74, tw + .5, 12); }
    ctx.beginPath(); ctx.rect(x0 - 4, base - 74, w + 8, 12); traco(ctx, INK, 1.5);
    return { cv, W, H, M, base };
  }
  /* barraca da Feira do Corre: toldo listrado da cor da ferramenta, placa, balcão de madeira e, no fundo,
     o que ela "vende" (cartaz, cavalete, olho, recibo, moeda...). Fechada: porta de aço baixada */
  function spriteBanca(b, k, ab){
    const M = 20, w = 92, W = w + M * 2, H = 122 + M, base = H - M, { cv, ctx } = folha(W, H, k), x0 = M, cx = x0 + w / 2;
    ctx.fillStyle = 'rgba(15,18,24,.24)'; ctx.fillRect(x0 - 6, base - 2, w + 12, 7);
    ctx.fillStyle = '#2B2F38'; ctx.fillRect(x0 + 1, base - 76, 4, 76); ctx.fillRect(x0 + w - 5, base - 76, 4, 76);
    bloco(ctx, x0 + 6, base - 66, w - 12, 44, b.fundo || '#F4F1EA', true);
    if(ab) coisa(ctx, b.coisa, cx, base - 44);
    bloco(ctx, x0 + 2, base - 24, w - 4, 18, 'madeira');
    if(!ab){
      ctx.fillStyle = pad(ctx, 'zinco'); ctx.fillRect(x0 + 6, base - 66, w - 12, 60); ctx.beginPath(); ctx.rect(x0 + 6, base - 66, w - 12, 60); traco(ctx, INK, 1.5);
      ctx.fillStyle = '#121419'; ctx.fillRect(cx - 7, base - 12, 14, 3);
      pixPlaca(ctx, 'FECHADO', cx, base - 40, { fundo: PAPEL });
    }
    const n = 7, tw = (w + 10) / n;
    for(let i = 0; i < n; i++){ ctx.fillStyle = i % 2 ? PAPEL : b.cor; ctx.fillRect(x0 - 5 + i * tw, base - 90, tw + .5, 14); }
    for(let i = 0; i < n; i++){ ctx.beginPath(); ctx.arc(x0 - 5 + i * tw + tw / 2, base - 76, tw / 2, 0, Math.PI); ctx.fillStyle = i % 2 ? PAPEL : b.cor; ctx.fill(); ctx.lineWidth = Math.max(1.2, 1.05 / escala(ctx)); ctx.strokeStyle = INK; ctx.stroke(); }
    ctx.beginPath(); ctx.rect(x0 - 5, base - 90, w + 10, 14); traco(ctx, INK, 1.5);
    pixPlaca(ctx, b.placa, cx, base - 102, { fundo: b.pf || PAPEL, cor: b.pc || INK });
    return { cv, W, H, M, base };
  }
  /* o que cada barraca "vende", em blocos (cx, cy = meio do fundo) */
  function coisa(ctx, q, cx, cy){
    const R = (x, y, w, h, c, borda) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); if(borda){ ctx.beginPath(); ctx.rect(x, y, w, h); traco(ctx, INK, 1.2); } };
    switch(q){
      case 'cartaz': /* lambe-lambe na parede */
        R(cx - 34, cy - 18, 20, 26, ROSA, 1); R(cx - 30, cy - 12, 12, 3, INK); R(cx - 30, cy - 6, 9, 3, INK);
        R(cx - 10, cy - 20, 20, 28, AMARELO, 1); R(cx - 4, cy - 12, 8, 8, INK);
        R(cx + 14, cy - 17, 20, 25, AZUL, 1); R(cx + 18, cy - 11, 12, 3, PAPEL); R(cx + 18, cy - 5, 8, 3, PAPEL); break;
      case 'cavalete': /* tela no cavalete, com brilho */
        R(cx - 15, cy + 6, 3, 14, INK); R(cx + 12, cy + 6, 3, 14, INK); R(cx - 1, cy - 22, 3, 6, INK);
        R(cx - 20, cy - 16, 40, 24, PAPEL, 1); R(cx - 14, cy - 2, 16, 5, ROSA); R(cx - 6, cy - 10, 3, 9, AMARELO); R(cx - 10, cy - 7, 11, 3, AMARELO); R(cx + 8, cy - 10, 6, 6, AZUL); break;
      case 'olho': /* o olho do Hórus, aceso */
        R(cx - 22, cy - 8, 44, 16, AMARELO, 1); R(cx - 26, cy - 4, 4, 8, AMARELO); R(cx + 22, cy - 4, 4, 8, AMARELO);
        R(cx - 7, cy - 7, 14, 14, INK); R(cx - 4, cy - 5, 4, 4, PAPEL); R(cx - 12, cy + 12, 24, 3, AMARELO); break;
      case 'recibos': /* rolo de recibo e a maquininha */
        R(cx - 30, cy - 18, 14, 30, PAPEL, 1); [-12, -6, 0].forEach(d => R(cx - 27, cy + d, 8, 2, INK));
        R(cx - 12, cy - 14, 14, 26, PAPEL, 1); [-8, -2].forEach(d => R(cx - 9, cy + d, 8, 2, INK));
        R(cx + 8, cy - 6, 24, 18, LARANJA, 1); R(cx + 12, cy - 2, 16, 5, INK); [0, 1, 2].forEach(i => R(cx + 12 + i * 6, cy + 6, 4, 3, PAPEL)); break;
      case 'moedas': /* pilhas de moeda e uma nota */
        [[-26, 4], [-12, 6], [2, 3]].forEach(([dx, n]) => { for(let i = 0; i < n; i++) R(cx + dx, cy + 12 - i * 5, 12, 5, AMARELO, 1); });
        R(cx + 14, cy - 14, 20, 12, PAPEL, 1); R(cx + 20, cy - 10, 8, 4, AZUL); break;
      case 'casinha': /* a casa e o calendário do mês */
        R(cx - 30, cy - 4, 22, 18, LILAS, 1); ctx.beginPath(); ctx.moveTo(cx - 33, cy - 4); ctx.lineTo(cx - 19, cy - 16); ctx.lineTo(cx - 5, cy - 4); ctx.closePath(); forma(ctx, ROSA, 1.2); R(cx - 22, cy + 4, 6, 10, INK);
        R(cx + 2, cy - 16, 28, 28, PAPEL, 1); R(cx + 2, cy - 16, 28, 7, ROSA); for(let i = 0; i < 6; i++) R(cx + 6 + (i % 3) * 8, cy - 4 + Math.floor(i / 3) * 8, 4, 4, i === 4 ? AMARELO : '#6B7480'); break;
      case 'pastas': /* as maletas das marcas */
        [[ROSA, -30], [AMARELO, -9], [AZUL, 12]].forEach(([c, dx]) => { R(cx + dx, cy - 8, 20, 20, c, 1); R(cx + dx + 6, cy - 13, 8, 5, INK); R(cx + dx + 2, cy, 16, 2, INK); }); break;
      case 'revistas': /* a pilha de referência e a estrela */
        [[LILAS, 10], [ROSA, 4], [AZUL, -2], [AMARELO, -8]].forEach(([c, dy], i) => R(cx - 30 + (i % 2) * 3, cy + dy, 34, 6, c, 1));
        ctx.save(); ctx.translate(cx + 20, cy - 4); ctx.beginPath(); for(let i = 0; i < 10; i++){ const r = i % 2 ? 5 : 12, a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); forma(ctx, AMARELO, 1.2); ctx.restore(); break;
      case 'duvida': /* o "?" do manual */
        R(cx - 16, cy - 20, 32, 34, AZUL, 1); pixTxt(ctx, '?', cx, cy - 3, 3, PAPEL, 'c'); break;
      case 'filme': /* rolo de filme e a película */
        [[-14, 0], [12, 0]].forEach(([dx]) => { ctx.beginPath(); ctx.arc(cx + dx, cy - 6, 11, 0, Math.PI * 2); forma(ctx, '#C8CDD4', 1.2); ctx.fillStyle = INK; ctx.fillRect(cx + dx - 2, cy - 8, 4, 4); [[-6, -6], [6, -6], [-6, 4], [6, 4]].forEach(([a, b2]) => ctx.fillRect(cx + dx + a - 1.5, cy - 6 + b2 - 1.5, 3, 3)); });
        R(cx - 34, cy + 8, 68, 10, INK); for(let i = 0; i < 9; i++) R(cx - 31 + i * 7.5, cy + 10, 3, 2, PAPEL); for(let i = 0; i < 9; i++) R(cx - 31 + i * 7.5, cy + 14, 3, 2, PAPEL); break;
    }
  }
  /* v3.52: os desenhos prontos (casas, prédios) agora são maiores; a memória guarda os 160 usados por último */
  function guardaSprite(chave, s){ V.sprites.set(chave, s); if(V.sprites.size > 160){ const velho = V.sprites.keys().next().value; V.sprites.delete(velho); } }
  /* ---------- v4.0 · o Correverso 4.0: o dia e a noite, a chuva e os eventos ao vivo ----------
     A terceira frente da 4.0. Tudo sai do relógio de Brasília, igual em todo aparelho (nada novo na rede nem no banco):
     - o céu: amanhece entre 5h e 7h30, o sol vai até as 17h, o fim de tarde puxa pro laranja e às 19h30 é noite. A noite é
       uma máscara roxa por cima da cidade, com buracos onde tem luz: poste, varanda das casas, farol dos carros, vitrine,
       a Concha, as torres da ACEL, o pisca-pisca do Natal, as abóboras e o Papai Noel. Você leva uma luzinha também. Lá
       em cima, as estrelas e a lua;
     - a chuva: a cada 2 horas o céu sorteia (o mesmo sorteio em todo aparelho) sol, garoa ou chuva, com mais água de
       outubro a março, como em Londrina. Entra e sai devagar (15 minutos), escurece um pouco e tem o som;
     - os eventos: o Som na Concha (12h30 e 20h, meia hora: luz de palco, plateia, o MC Garoa e a música "Concha ao Vivo")
       e os Fogos no Igapó (21h, 5 minutos). A faixa AO VIVO no alto leva até lá; a Agenda da cidade fica no Mapa.
     &hora=21.5 e &clima=chuva no endereço forçam a hora e o tempo (C.verso.hora e C.verso.clima, pros testes) */
  let horaForca = (() => { const m = /[?&]hora=(\d{1,2}(?:\.\d+)?)/.exec(location.search); return m ? Math.min(23.99, +m[1]) : null; })();
  let climaForca = (() => { const m = /[?&]clima=(sol|garoa|chuva)\b/.exec(location.search); return m ? m[1] : null; })();
  const agoraBR = () => new Date(Date.now() - 3 * 3600e3);
  const horaBR = () => { if(horaForca != null) return horaForca; const d = agoraBR(); return d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600; };
  const frac = x => x - Math.floor(x);
  /* [hora, escuro, quente]: o quanto a noite cobre e o laranja do sol baixo */
  const CEU_K = [[0, 1, 0], [5, 1, 0], [5.8, .7, .4], [6.6, .2, .5], [7.4, 0, .1], [8.2, 0, 0], [16.7, 0, 0], [17.5, .06, .5], [18.2, .32, .8], [18.8, .66, .45], [19.4, .92, .12], [19.9, 1, 0], [24, 1, 0]];
  function ceuDe(h){
    for(let i = 1; i < CEU_K.length; i++){ const [h1, e1, q1] = CEU_K[i]; if(h <= h1){ const [h0, e0, q0] = CEU_K[i - 1], s = (h - h0) / ((h1 - h0) || 1); return { escuro: e0 + (e1 - e0) * s, quente: q0 + (q1 - q0) * s }; } }
    return { escuro: 1, quente: 0 };
  }
  /* a chuva: um sorteio a cada 2 horas do dia de Brasília (mais água de outubro a março) */
  function climaDe(){
    if(climaForca) return { tipo: climaForca, f: climaForca === 'sol' ? 0 : 1 };
    const d = agoraBR(), dia = Math.floor(d.getTime() / 864e5), h = horaBR(), bloco = Math.floor(h / 2), dentro = h - bloco * 2;
    const mes = d.getUTCMonth(), aguas = mes >= 9 || mes <= 2, r = (hash('clima:' + dia + ':' + bloco) % 1000) / 1000;
    const tipo = r < (aguas ? .12 : .05) ? 'chuva' : r < (aguas ? .3 : .14) ? 'garoa' : 'sol';
    return { tipo, f: tipo === 'sol' ? 0 : clamp(Math.min(dentro / .25, (2 - dentro) / .25), 0, 1) };
  }
  function ceuAgora(){
    const n = performance.now(); if(V.ceu && n - V.ceu.em < 1000) return V.ceu;
    const h = horaBR(), c = ceuDe(h), cl = climaDe(), nuvem = cl.tipo === 'chuva' ? .38 * cl.f : cl.tipo === 'garoa' ? .18 * cl.f : 0;
    return (V.ceu = { em: n, h, escuro: c.escuro, quente: c.quente * (1 - Math.min(1, nuvem * 2)), clima: cl, nuvem, ativo: c.escuro > .02 || nuvem > .01 || c.quente > .02 });
  }
  const noite = () => !!(V.ceu && V.ceu.escuro > .5);
  const chovendo = () => !!(V.ceu && V.ceu.clima.f > .3);
  /* a cor da máscara: branco (não muda nada) até o roxo da noite, e o cinza da nuvem por cima */
  function corMascara(c){
    const a = c.escuro * .9, N = [54, 46, 112], G = [190, 186, 206];
    const v = N.map((x, i) => (255 * (1 - a) + x * a) * (1 - c.nuvem * (1 - G[i] / 255)));
    return `rgb(${v.map(x => Math.round(x)).join(',')})`;
  }
  /* uma luz: um buraco na noite (x, y no mundo, raio, força). Lista plana: x, y, r, a */
  const luz = (x, y, r, a) => { const c = V.ceu; if(c && c.escuro > .04 && V.luz) V.luz.push(x, y, r, a); };
  let GLOW = null, GLOW_Q = null;
  function brilhoSprite(cor){
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, `rgba(${cor},1)`); r.addColorStop(.42, `rgba(${cor},.72)`); r.addColorStop(1, `rgba(${cor},0)`); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return c;
  }
  function noiteDesenha(ctx, k, ox, oy){
    const c = V.ceu; if(!c || !c.ativo) return;
    const cv = V.cv, W = cv.width, H = cv.height, Q = 4, mw = Math.max(1, Math.ceil(W / Q)), mh = Math.max(1, Math.ceil(H / Q));
    let m = V.masc; if(!m || m.width !== mw || m.height !== mh){ m = V.masc = document.createElement('canvas'); m.width = mw; m.height = mh; }
    const mc = m.getContext('2d'), L = V.luz || [];
    mc.globalCompositeOperation = 'source-over'; mc.globalAlpha = 1; mc.fillStyle = corMascara(c); mc.fillRect(0, 0, mw, mh);
    if(L.length && c.escuro > .04){
      const g = GLOW || (GLOW = brilhoSprite('255,255,255')); mc.globalCompositeOperation = 'destination-out';
      for(let i = 0; i < L.length; i += 4){ const r = L[i + 2] * k / Q, x = (L[i] * k + ox) / Q, y = (L[i + 1] * k + oy) / Q; if(x + r < 0 || y + r < 0 || x - r > mw || y - r > mh) continue; mc.globalAlpha = Math.min(1, L[i + 3]); mc.drawImage(g, x - r, y - r, r * 2, r * 2); }
      mc.globalAlpha = 1; mc.globalCompositeOperation = 'source-over';
    }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = true;
    ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(m, 0, 0, W, H);
    if(c.quente > .02){ ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = `rgba(255,128,64,${(c.quente * .5).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
    /* o brilho quente em volta das luzes pequenas (de noite) */
    if(c.escuro > .3 && L.length){
      const gq = GLOW_Q || (GLOW_Q = brilhoSprite('255,206,130')), al = (c.escuro - .3) / .7 * .3; ctx.globalCompositeOperation = 'lighter';
      for(let i = 0; i < L.length; i += 4){ if(L[i + 2] > 140) continue; const r = L[i + 2] * k * .5, x = L[i] * k + ox, y = L[i + 1] * k + oy; if(x + r < 0 || y + r < 0 || x - r > W || y - r > H) continue; ctx.globalAlpha = al * Math.min(1, L[i + 3]); ctx.drawImage(gq, x - r, y - r, r * 2, r * 2); }
    }
    ctx.restore();
  }
  /* as estrelas e a lua (no céu de cima da cidade) */
  function estrelas(ctx, t, vx, vy, vw){
    const c = V.ceu, topo = TOPO - RUA; if(!c || c.escuro < .35 || vy > topo) return;
    const a = (c.escuro - .35) / .65 * clamp(1 - c.nuvem * 2.4, 0, 1); if(a <= .02) return;
    const u = 1 / V.k, r = rng(4242);
    for(let i = 0; i < 150; i++){ const x = r() * V.cid.W, y = topo - 30 - r() * 900, br = r(); if(x < vx - 4 || x > vx + vw + 4 || y < vy - 4) continue; const tw = .55 + .45 * Math.sin(t * (1 + br * 2) + i), q = br > .92 ? 2 : 1; ctx.fillStyle = `rgba(255,248,230,${(a * tw * (.35 + br * .65)).toFixed(2)})`; ctx.fillRect(sn(x), sn(y), u * q, u * q); }
    const lx = V.cid.W * .7, ly = topo - 330;
    if(lx > vx - 60 && lx < vx + vw + 60 && ly > vy - 60){ ctx.fillStyle = `rgba(255,244,214,${a.toFixed(2)})`; ctx.beginPath(); ctx.arc(lx, ly, 22, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = `rgba(52,44,96,${(a * .92).toFixed(2)})`; ctx.beginPath(); ctx.arc(lx + 10, ly - 6, 19, 0, Math.PI * 2); ctx.fill(); }
  }
  /* a chuva na tela (sem guardar gota nenhuma: cada uma sai da conta com o tempo) */
  function chuvaDesenha(ctx, t){
    const c = V.ceu; if(!c || c.clima.f <= 0) return;
    const cl = c.clima, forte = cl.tipo === 'chuva', W = V.cv.width, H = V.cv.height, fx = V.fx || 1, menos = (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) ? .4 : 1;
    const n = Math.round(((forte ? 230 : 80) * cl.f * Math.min(2.2, (V.cssW * V.cssH) / (1366 * 860)) + 8) * menos);
    const vy = (forte ? 1100 : 420) * fx, vx = vy * .16, len = (forte ? 16 : 7) * fx;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.strokeStyle = forte ? 'rgba(212,216,240,.5)' : 'rgba(222,224,240,.36)'; ctx.lineWidth = fx * (forte ? 1.2 : 1); ctx.beginPath();
    for(let i = 0; i < n; i++){ const a = frac(i * .6180339887 + .13), b = frac(i * .7548776662 + .41), sp = .75 + frac(i * .569840291) * .5;
      const y = (b * (H + len) + t * vy * sp) % (H + len) - len, x = (a * (W + 200) + t * vx * sp) % (W + 200) - 100;
      ctx.moveTo(x, y); ctx.lineTo(x - len * .16, y - len); }
    ctx.stroke();
    if(forte){ ctx.fillStyle = 'rgba(222,226,246,.42)'; const r = rng(Math.floor(t * 8)); for(let i = 0; i < 26 * cl.f * menos; i++){ const x = r() * W, y = r() * H; ctx.fillRect(x - 3 * fx, y, 6 * fx, fx); ctx.fillRect(x - fx, y - fx, 2 * fx, fx); } }
    ctx.restore();
  }
  /* ---------- os eventos ---------- */
  const EVENTOS = [
    { k: 'show', nome: 'Som na Concha', onde: 'Concha Acústica', ini: [12.5, 20], dur: .5, diz: 'O MC Garoa e o Tonhão do Som ao vivo na Concha Acústica, com luz de palco e plateia.' },
    { k: 'fogos', nome: 'Fogos no Igapó', onde: 'Lago Igapó', ini: [21], dur: 5 / 60, diz: 'Cinco minutos de fogos em cima do Lago Igapó. A melhor vista é da orla.' }
  ];
  function eventoAgora(h){ h = h == null ? horaBR() : h; for(const e of EVENTOS) for(const i of e.ini) if(h >= i && h < i + e.dur) return { e, i, seg: (h - i) * 3600 }; return null; }
  const proximos = h => { h = h == null ? horaBR() : h; const L = []; EVENTOS.forEach(e => e.ini.forEach(i => L.push({ e, i, em: ((i - h) % 24 + 24) % 24 }))); return L.sort((a, b) => a.em - b.em); };
  const hhmm = h => { const m = Math.round(frac(h) * 60); return `${String(Math.floor(h)).padStart(2, '0')}h${m ? String(m).padStart(2, '0') : ''}`; };
  const quantoFalta = em => em < 1 ? `${Math.max(1, Math.round(em * 60))} min` : `${Math.floor(em)}h${Math.round(frac(em) * 60) ? String(Math.round(frac(em) * 60)).padStart(2, '0') : ''}`;
  const ceuNome = () => { const c = ceuAgora(), cl = c.clima.f > .3 ? c.clima.tipo : 'sol'; const quando = c.escuro > .6 ? 'noite' : c.quente > .3 ? (c.h < 12 ? 'amanhecer' : 'fim de tarde') : 'dia'; return cl === 'chuva' ? `${quando} de chuva` : cl === 'garoa' ? `${quando} de garoa` : quando === 'dia' ? 'dia de sol' : quando === 'noite' ? 'noite' : quando; };
  /* o palco da Concha: o MC no palco e a plateia na frente (só enquanto tem show; ninguém disso vai pra rede) */
  const LETRA = ['Londrina de noite, o corre não para', 'Do Calçadão ao Igapó, a cidade é nossa', 'Quem vende o almoço paga o jantar', 'Pé vermelho, cabeça erguida', 'Trampo de dia, rima de noite', 'Café, garoa e boleto vencendo', 'A Concha canta e a cidade responde', 'Barulho pro Tonhão do Som', 'Mão pro alto quem fez o corre hoje', 'Terra roxa no tênis, ouro na ideia'];
  function palco(){
    if(V.palco) return V.palco;
    const cc = V.cid.centro.concha, cx = cc.x + LW / 2, P = [];
    const mc = { sid: 'mc-garoa', bot: true, npc: true, nome: 'MC Garoa', av: avLimpo({ pele: 4, cabelo: 'trancas', corCabelo: 0, topo: 'bone', roupa: 'moletom', corRoupa: 1, corrente: 'ouro', perna: 'calca', corCalca: 0, tenis: 2 }, 'mc-garoa'), x: cx, y: cc.base - 28, dir: 'baixo', passo: 0, mov: false, sit: false, mic: false, fala: null };
    const r = rng(2026);
    /* a plateia em pé nos degraus (três fileiras de seis) */
    for(let i = 0; i < 18; i++){ const fil = Math.floor(i / 6), x = cx - 110 + (i % 6) * 44 + (r() - .5) * 16, y = cc.base + 48 + fil * 30 + (r() - .5) * 6;
      P.push({ sid: 'plateia-' + i, bot: true, npc: true, nome: '', av: avLimpo({}, 'plateia' + i), x, y, y0: y, dir: 'cima', passo: 0, mov: false, sit: false, mic: false, fase: r() * 6 }); }
    return (V.palco = { mc, P, cx, cc, linha: 0, prox: 0 });
  }
  function showNaFila(L, ctx, t, vis){
    const ag = eventoAgora(); if(!ag || ag.e.k !== 'show') { V.palco = null; return; }
    const p = palco(), cc = p.cc; if(!vis(p.cx, cc.base, 520)) return;
    const agora = Date.now();
    if(agora > p.prox){ p.prox = agora + 4200; p.mc.fala = { t: LETRA[p.linha++ % LETRA.length], ate: agora + 3800 }; }
    p.P.forEach(o => { o.y = o.y0 - Math.abs(Math.sin(t * 4.2 + o.fase)) * 3; L.push({ y: o.y0, f: () => boneco(ctx, o, t, false) }); });
    /* o MC no palco: desenhado depois da Concha (senão o palco cobria ele) */
    L.push({ y: cc.base + 1, f: () => { p.mc.dir = Math.sin(t * .7) > .6 ? 'esq' : Math.sin(t * .7) < -.6 ? 'dir' : 'baixo'; boneco(ctx, p.mc, t, false); } });
    luz(p.cx, cc.base - 60, 230, 1);
  }
  /* a luz de palco: quatro fachos que varrem a plateia (rosa, amarelo, lilás e azul; nunca verde) */
  function palcoLuzes(ctx, t){
    const p = V.palco; if(!p) return;
    const cc = p.cc, x0 = p.cx, y0 = cc.base - 150, cores = ['255,72,176', '255,232,0', '180,162,218', '111,182,255'];
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    cores.forEach((cor, i) => { const a = Math.sin(t * (.9 + i * .23) + i * 1.7) * .55, len = 330, dx = Math.sin(a) * len, dy = Math.cos(a) * len, lx = Math.cos(a) * 34, ly = -Math.sin(a) * 34;
      const g = ctx.createLinearGradient(x0, y0, x0 + dx, y0 + dy); g.addColorStop(0, `rgba(${cor},.34)`); g.addColorStop(1, `rgba(${cor},0)`); ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(x0 - 6 + i * 4, y0); ctx.lineTo(x0 + dx - lx, y0 + dy - ly); ctx.lineTo(x0 + dx + lx, y0 + dy + ly); ctx.closePath(); ctx.fill(); });
    ctx.restore();
  }
  /* os fogos do Igapó: a luz deles vai pra máscara antes (acende o lago) e o desenho vem depois, por cima da noite */
  const FOGO_COR = ['255,72,176', '255,232,0', '180,162,218', '111,182,255', '255,243,196', '255,108,47'];
  function fogosDe(t){
    const ag = eventoAgora(); if(!ag || ag.e.k !== 'fogos') return null;
    const l = V.cid.lago; if(!l) return null; const n = l.noel, cx = n ? n.x : l.x + l.w / 2, cy = (n ? n.y : l.y + l.h / 2) - 300, R = [];
    for(let j = 0; j < 6; j++){ const ciclo = 2.6, fase = t / ciclo + j / 6, i = Math.floor(fase), f = fase - i; if(f > .62) continue;
      const r = rng(i * 13 + j * 977), x = cx + (r() - .5) * 900, y = cy - 80 - r() * 300, raio = 60 + r() * 70, cor = FOGO_COR[Math.floor(r() * FOGO_COR.length)], cor2 = FOGO_COR[Math.floor(r() * FOGO_COR.length)];
      R.push({ i, j, f, x, y, raio, cor, cor2, base: (n ? n.y : l.y + l.h / 2) }); }
    return R;
  }
  function fogosLuz(t){ const R = fogosDe(t); if(!R) return; R.forEach(b => { if(b.f > .14) luz(b.x, b.y + 40, b.raio * 1.8, (1 - (b.f - .14) / .48) * .55); }); }
  function fogosDesenha(ctx, t){
    const R = fogosDe(t); if(!R) return; const u = 1 / V.k;
    R.forEach(b => {
      if(b.f < .14){ const s = b.f / .14; ctx.fillStyle = 'rgba(255,236,190,.95)'; ctx.fillRect(sn(b.x), sn(b.base - (b.base - b.y) * s), u, u * 5); return; }
      const p = (b.f - .14) / .48, a = 1 - p, R2 = b.raio * Math.sqrt(p);
      if(b.f - .14 < .03 && V.eu && Math.hypot(V.eu.x - b.x, V.eu.y - b.y) < 1100 && C.versoSom && V.fogoEv !== b.i * 7 + b.j){ V.fogoEv = b.i * 7 + b.j; C.versoSom.rio('fogo'); }
      for(let q = 0; q < 34; q++){ const ang = q / 34 * Math.PI * 2 + b.i, x = b.x + Math.cos(ang) * R2, y = b.y + Math.sin(ang) * R2 + p * p * 40;
        ctx.fillStyle = `rgba(${q % 3 ? b.cor : b.cor2},${a.toFixed(2)})`; ctx.fillRect(sn(x), sn(y), u * 2, u * 2);
        ctx.fillStyle = `rgba(${b.cor},${(a * .45).toFixed(2)})`; ctx.fillRect(sn(b.x + Math.cos(ang) * R2 * .62), sn(b.y + Math.sin(ang) * R2 * .62 + p * p * 26), u, u); }
    });
  }
  /* a faixa no alto: AO VIVO durante o evento, "Em N min" nos 10 minutos antes. Um aviso por evento */
  function evtTick(){
    if(!V.vivo || !V.cid) return;
    const b = C.$('cvr-evento'), h = horaBR(), ag = eventoAgora(h), px = proximos(h).find(x => !ag || x.e !== ag.e || x.i !== ag.i);
    let txt = '', cls = '';
    if(ag){ txt = `AO VIVO · ${ag.e.nome}`; cls = 'vivo'; }
    else if(px && px.em <= 10 / 60){ txt = `Em ${quantoFalta(px.em)} · ${px.e.nome}`; cls = 'logo'; }
    if(b){ b.hidden = !txt; if(txt && b.textContent !== txt) b.textContent = txt; b.className = 'cvr-evento' + (cls ? ' ' + cls : ''); b.dataset.k = ag ? ag.e.k : px ? px.e.k : ''; }
    const chave = ag ? `${ag.e.k}:${ag.i}:${Math.floor(agoraBR().getTime() / 864e5)}` : '';
    if(ag && V.evAvisou !== chave){ V.evAvisou = chave; C.toast(ag.seg < 150 ? `Começou: ${ag.e.nome}. Toca no AO VIVO pra ir.` : `Tá rolando: ${ag.e.nome}. Toca no AO VIVO pra ir.`, 4600); }
    /* o som do show sobe com a distância até a Concha */
    const S = C.versoSom;
    if(S && S.show){ let nv = 0; if(ag && ag.e.k === 'show' && V.eu && !V.voo){ const cc = V.cid.centro.concha, d = Math.hypot(V.eu.x - (cc.x + LW / 2), V.eu.y - (cc.base + 100)); nv = clamp(1 - (d - 240) / 900, 0, 1); } S.show(nv); }
  }
  function agendaSheet(){
    const h = horaBR(), ag = eventoAgora(h), L = EVENTOS.flatMap(e => e.ini.map(i => ({ e, i }))).sort((a, b) => a.i - b.i);
    C.sheet(`<div class="form cvr-agenda"><div class="sheet-head"><h2>Agenda da cidade</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p class="fine">Todo dia, pelo relógio de Brasília. Agora: <b>${hhmm(h)}</b>, ${esc(ceuNome())}.</p>
      <ul class="cvr-ag">${L.map(({ e, i }) => { const vivo = !!ag && ag.e === e && ag.i === i, foi = !vivo && h >= i + e.dur, em = ((i - h) % 24 + 24) % 24;
        return `<li class="${vivo ? 'vivo' : foi ? 'foi' : ''}"><b class="cvr-ag-h num">${hhmm(i)}</b><span class="cvr-ag-t"><b>${esc(e.nome)}</b><small>${esc(e.diz)}</small></span>
          ${vivo ? `<button type="button" class="btn sm pri" data-act="cvr-ev-ir" data-k="${e.k}">Ir agora</button>` : `<small class="cvr-ag-q">${foi ? 'amanhã de novo' : 'daqui a ' + quantoFalta(em)}</small>`}</li>`; }).join('')}</ul>
      <p class="fine">De noite a cidade acende; com chuva, ela molha. O céu é o mesmo pra todo mundo que tá na cidade.</p></div>`, 'cvr-agenda-sh');
  }
  function vaiEvento(k){
    const e = EVENTOS.find(x => x.k === k); if(!e) return;
    const l = lugares().find(x => x.nome === e.onde), cc = V.cid.centro.concha;
    const alvo = k === 'show' ? { x: cc.x + LW / 2 + 40, y: cc.base + 120 } : l ? { x: l.x, y: l.y } : null; if(!alvo) return;
    const p = pertoLivre(alvo.x, alvo.y); if(p){ C.closeSheet(); teleporta(p.x, p.y); }
  }
  const FRASES_NOITE = ['De noite Londrina fica mais bonita. E mais fria.', 'Já jantou? Porque eu já tô pensando no café da manhã.', 'A Concha de noite é outra coisa.', 'Quem trabalha de dia faz o corre de noite.', 'Olha a lua em cima do Igapó, minha gente.', 'Esse grilo canta mais que o Tonhão.'];
  const FRASES_CHUVA = ['Esse céu de Londrina não avisa nada.', 'Choveu, o Calçadão esvazia e o pastel esfria.', 'Garoa fina é a que mais molha.', 'Terra roxa molhada gruda até na alma.', 'Pega o guarda-chuva que o tempo virou.'];
  function quadro(t){
    const { ctx } = V, z = V.z, k0 = V.k, fx = V.fx || 1, k = V.kr || k0, vw = V.cssW / z, vh = V.cssH / z, c = V.cid; NT = t;
    const vx = V.cam.x - vw / 2, vy = V.cam.y - vh / 2, ox = -Math.round(vx * k0) * fx, oy = -Math.round(vy * k0) * fx;
    ctx.setTransform(k, 0, 0, k, ox, oy); ctx.imageSmoothingEnabled = false;
    /* v4.0: o céu da hora (a lista de luzes da noite começa vazia a cada quadro) */
    ceuAgora(); V.luz = V.luz || []; V.luz.length = 0;
    chao(ctx, vx, vy, vw, vh); aguaViva(ctx, t, vx, vy, vw, vh); sobreAgua(ctx, vx, vy, vw, vh); aguaRio(ctx, t, vx, vy, vw, vh); sobreRio(ctx, vx, vy, vw, vh, t); aguaParque(ctx, t, vx, vy, vw, vh); sobreParque(ctx, vx, vy, vw, vh);
    const L = [];
    const vis = (x, y, m) => x > vx - m && x < vx + vw + m && y > vy - 40 && y < vy + vh + m * 1.6;
    const sprite = (chave, fazer, x, base) => L.push({ y: base, f: () => { let s = V.sprites.get(chave); if(!s){ s = fazer(); guardaSprite(chave, s); } ctx.drawImage(s.cv, x - s.M, base - s.base, s.cv.width / k, s.cv.height / k); } });
    c.casas.forEach(h => { if(vis(h.x + h.w / 2, h.base, 320)){ sprite(h.id, () => (ESTILO_SPRITE()[h.estilo] || spriteCasa)(h, k), h.x, h.base); luz(h.portaX, h.base - 24, 66, .75); } });
    if(c.dois){ const d = c.dois; if(vis(d.x + d.w / 2, d.base, 700)) L.push({ y: d.base, f: () => { if(!V.doisS) V.doisS = spriteDois(k); const s = V.doisS, sx = d.x - s.M, sy = d.base - s.base; ctx.drawImage(s.cv, sx, sy, s.cv.width / k, s.cv.height / k); overlayDois(ctx, s, sx, sy, t); } }); }
    const ce = c.centro, FZ = { teatro: spriteTeatro, concha: spriteConcha, catedral: spriteCatedral, museu: spriteMuseu, arte: spriteArte, aquario: spriteAquario, delegacia: spriteDelegacia, bombeiros: spriteBombeiros, hospital: spriteHospital };
    Object.keys(FZ).forEach(nm => { const o = ce[nm]; if(vis(o.x + LW / 2, o.base, nm === 'catedral' ? 520 : 340)){ sprite('c:' + nm, () => FZ[nm](k), o.x, o.base); luz(o.x + LW / 2, o.base - (nm === 'concha' ? 90 : 20), nm === 'concha' ? 190 : 130, nm === 'concha' ? .75 : .55); } });
    /* os degraus da Concha */
    if(vis(ce.concha.x + LW / 2, ce.concha.base + 80, 300)) [0, 1, 2].forEach(i => L.push({ y: ce.concha.base + 34 + i * 30, f: () => bloco(ctx, ce.concha.x + 40, ce.concha.base + 34 + i * 30 - 14, 220, 14, 'concreto') }));
    c.gleba.forEach(g => { if(vis(g.x + g.w / 2, g.base, 440)){ sprite(g.id, () => spriteTorre(g, k), g.x, g.base); luz(g.x + g.w / 2, g.base - 20, 110, .6); } });
    c.enche.forEach(f => { if((f.t === 'predio' || f.t === 'loja') && vis(f.x + LW / 2, f.base, 360)){ sprite(f.id, () => f.t === 'predio' ? spritePredio(f, k) : spriteLoja(f, k), f.t === 'predio' ? f.px : f.x, f.base); if(f.t === 'loja') luz(f.x + LW / 2, f.base - 20, 100, .7); } });
    c.quiosques.forEach(q => { if(vis(q.x, q.base, 160)){ sprite(q.id, () => spriteQuiosque(q, k), q.x - 35, q.base); luz(q.x, q.base - 22, 72, .8); } });
    c.trucks.forEach(tr => { if(vis(tr.x, tr.base, 160)){ sprite(tr.id, () => spriteTruck(tr, k), tr.x - 42, tr.base); luz(tr.x, tr.base - 22, 72, .8); } });
    c.barracas.forEach(b => { if(vis(b.x, b.base, 120)){ sprite(b.id, () => spriteBarraca(b, k), b.x - 36, b.base); luz(b.x, b.base - 20, 64, .75); } });
    if(c.feira) c.feira.barracas.forEach(b => { if(!paraMim(b) || !vis(b.x, b.base, 150)) return; const ab = aberta(b); sprite('fb:' + b.id + (ab ? '' : ':f'), () => spriteBanca(b, k, ab), b.x - 46, b.base); luz(b.x, b.base - 22, 80, .8); });
    const e = c.estadio; if(vis(e.fx + e.fw / 2, e.campo.y, 720)) sprite('estadio', () => spriteEstadio(e, k), e.fx, e.campo.y);
    /* v3.40: o aeroporto (terminal, torre, biruta e o teco-teco parado no pátio, quando não é você que tá voando nele) */
    const ae = c.aeroporto;
    if(ae){
      if(vis(ae.term.x + ae.term.w / 2, ae.term.base, 380)){ sprite('aero:t', () => spriteTerminal(k), ae.term.x, ae.term.base); luz(ae.term.x + ae.term.w / 2, ae.term.base - 20, 170, .7); }
      if(vis(ae.torre.x, ae.torre.base, 280)) sprite('aero:r', () => spriteTorreAero(k), ae.torre.x - 35, ae.torre.base);
      if(vis(ae.biruta.x, ae.biruta.y, 120)) L.push({ y: ae.biruta.y, f: () => biruta(ctx, ae.biruta, t) });
      if(!V.voo && vis(ae.vaga.x, ae.vaga.y, 180)) L.push({ y: ae.vaga.y, f: () => desenhaAviao(ctx, ae.vaga.x, ae.vaga.y, 0, 1, t, false, true) });
    }
    /* v3.57: a ACEL (sede, portal, placar e as torres de luz) */
    const ac = c.acel;
    if(ac){
      if(vis(ac.sede.x + ac.sede.w / 2, ac.sede.base, 280)) sprite('acel:s', () => spriteSedeAcel(k), ac.sede.x, ac.sede.base);
      if(vis(ac.portal.x, ac.portal.base, 200)) sprite('acel:p', () => spritePortalAcel(k), ac.portal.x - 52, ac.portal.base);
      if(vis(ac.placar.x, ac.placar.base, 200)) sprite('acel:q', () => spritePlacarAcel(k), ac.placar.x - 65, ac.placar.base);
      ac.torres.forEach(o => { if(vis(o.x, o.base, 260)){ sprite('acel:l', () => spriteTorreLuz(k), o.x - 22, o.base); luz(o.x, o.base - 40, 300, .9); } });
    }
    c.decor.forEach(d => { if(vis(d.x, d.y, 180)) L.push({ y: d.y, f: () => decor(ctx, d, t) }); });
    /* v3.75: o barracão do porto e os bichos do rio */
    const rio = c.rio;
    if(rio){ const b = rio.barracao; if(b && vis(b.x, b.base, 220)) L.push({ y: b.base, f: () => barracao(ctx, b, t) }); rio.bichos.forEach(o => { if(vis(o.x, o.y, 90)) L.push({ y: o.y, f: () => bicho(ctx, o, t) }); }); }
    /* v3.82: o Parque Arthur Thomas (as construções e os bichos) */
    parqueNaFila(L, ctx, t, vis);
    c.postes.forEach(p => { if(vis(p.x, p.y, 70)) L.push({ y: p.y, f: () => poste(ctx, p) }); });
    V.carros.forEach(car => { if(vis(car.x, car.y, 90)) L.push({ y: car.y, f: () => carro(ctx, car) }); });
    c.bancos.forEach(b => { if(vis(b.x, b.y, 60)) L.push({ y: b.y - 1, f: () => banco(ctx, b) }); });
    (V.bolas || []).forEach(b => { if(vis(b.x, b.y, 40)) L.push({ y: b.y, f: () => desenhaBola(ctx, b) }); });
    c.vazios.forEach((o, i) => { if(vis(o.x + LW / 2, o.y + LH, 260)){ L.push({ y: o.y + LH - 40, f: () => loteLivre(ctx, o) }); L.push({ y: o.y + LH * .55, f: () => outdoor(ctx, o, i) }); luz(o.x + LW / 2, o.y + LH * .55 - 70, 150, .6); } });
    c.arv.forEach(a => { if(vis(a.x, a.y, 90)) L.push({ y: a.y, f: () => arvore(ctx, a) }); });
    if(vis(c.praca.cx, c.praca.cy, 220)) L.push({ y: c.praca.y + 150, f: () => praca(ctx) });
    const agora = Date.now(), mostra = quemAparece(agora), gente = [...V.remotos.values()].filter(r => mostra.has(r.sid) && vis(r.x, r.y, 60));
    gente.forEach(r => L.push({ y: r.y + (r.sit ? 1 : 0), f: () => boneco(ctx, r, t, false) }));
    if(V.eu){ L.push({ y: V.eu.y + (V.eu.sit ? 1 : 0), f: () => boneco(ctx, V.eu, t, true) }); luz(V.eu.x, V.eu.y - 16, 60, .5); }
    /* v4.0: o show da Concha (o MC e a plateia) e a luz dos fogos */
    showNaFila(L, ctx, t, vis); fogosLuz(t);
    if(V.eu && V.sk && V.sk.grind) L.push({ y: V.eu.y + 2, f: () => faiscas(ctx, V.eu.x, V.eu.y, t) });
    desenhaTarefa(L, ctx, t, vis);
    /* v3.87: o Natal (o festão de poste em poste, a guirlanda nas portas e o Papai Noel do Igapó) */
    if(natal()){
      fiosDe(c).forEach(f => { if(vis((f.a.x + f.b.x) / 2, f.a.y, 240)) L.push({ y: f.a.y - .5, f: () => festao(ctx, f) }); });
      c.casas.concat(c.dois ? [c.dois] : []).forEach(h => { if(vis(h.portaX, h.base, 60)) L.push({ y: h.base + .5, f: () => guirlanda(ctx, h.portaX, h.base - 44) }); });
      noelNaFila(L, ctx, t, vis);
    }
    /* v3.91: o Halloween nas casas sorteadas */
    if(halloween()) c.casas.concat(c.dois ? [c.dois] : []).forEach(h => { const o = halloweenDe(h); if(o && vis(h.x + h.w / 2, h.base, Math.max(240, h.w))) hwNaFila(L, ctx, h, o, t, vis); });
    L.sort((a, b) => a.y - b.y).forEach(o => o.f());
    /* v4.0: a noite (e a nuvem) por cima de tudo, com os buracos de luz; depois o que brilha: estrelas, palco, fogos e a chuva */
    noiteDesenha(ctx, k, ox, oy); estrelas(ctx, t, vx, vy, vw); palcoLuzes(ctx, t); fogosDesenha(ctx, t); chuvaDesenha(ctx, t);
    if(V.rio && V.rio.fase === 'salto') saltoPeixe(ctx, t);
    if(V.alvo){ ctx.strokeStyle = ROSA; ctx.lineWidth = Math.max(2, 1.05 / k0); ctx.beginPath(); ctx.ellipse(V.alvo.x, V.alvo.y, 10 + Math.sin(t * 6) * 2, 4, 0, 0, Math.PI * 2); ctx.stroke(); }
    if(V.porta && !(V.eu && V.eu.sit)){ const p = V.porta; ctx.save(); ctx.translate(p.x, p.y - (p.tipo === 'banco' ? 34 : p.tipo === 'morador' ? 48 / V.k : 4) + Math.round(Math.sin(t * 4) * 2)); ctx.beginPath(); ctx.moveTo(-8, -12); ctx.lineTo(8, -12); ctx.lineTo(0, 0); ctx.closePath(); forma(ctx, AMARELO, 2); ctx.restore(); }
    desenhaVoos(ctx, t, gente);
    /* nomes e balões por cima de tudo */
    gente.forEach(r => nomeDe(ctx, r, false, agora)); if(V.eu) nomeDe(ctx, V.eu, true, agora);
    if(V.palco) nomeDe(ctx, V.palco.mc, false, agora);
    if(V.baloes && V.baloes.length){ V.baloes.forEach(b => balaoLongo(ctx, b[0], b[1], b[2])); V.baloes.length = 0; }
  }
  /* ---------- mapa: a cidade inteira numa tela, com viagem rápida ---------- */
  /* v3.87: no Natal, o Papai Noel do Igapó entra na lista (o lugar é a placa da orla, de frente pra ele) */
  const noelLugar = () => { const n = V.cid.lago && V.cid.lago.noel; return n && n.placa && natal() ? [{ nome: 'Papai Noel do Igapó', x: n.placa.x, y: n.placa.y + 24 }] : []; };
  const lugares = () => (V.casa ? [{ nome: 'Tua casa', x: V.casa.x, y: V.casa.y }] : []).concat(V.cid.lugares, noelLugar());
  function pertoLivre(x, y){ for(let r = 0; r < 300; r += 14){ for(let a = 0; a < 16; a++){ const px = x + Math.cos(a / 8 * Math.PI) * r, py = y + Math.sin(a / 8 * Math.PI) * r; if(!bate(px, py)) return { x: px, y: py }; if(!r) break; } } return null; }
  function teleporta(x, y){ if(!V.eu) return; saiDoBarco(); V.alvo = null; V.eu.sit = false; V.eu.mov = false; V.eu.x = x; V.eu.y = y; V.cam.x = x; V.cam.y = y - 40; anunciar(); portaUI(); C.closeSheet(); }
  function desenhaMapa(cv, S){
    const c = V.cid, ctx = cv.getContext('2d'), oy = TOPO - RUA, X = x => Math.round(x / S), Y = y => Math.round((y - oy) / S), meu = C.st.me && C.st.me.id;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#2B2F38'; ctx.fillRect(0, 0, cv.width, cv.height);
    const COR_E = { predio: '#A4A8AE', loja: '#F2D8A7', pracinha: '#D9C27F', bosquinho: '#C9A95E', quadra: '#3D6FB6', feira: '#FF8A3D' };
    for(let r = 0; r < c.rows; r++) for(let cc = 0; cc < COLS; cc++){
      const g = c.grade[r][cc]; if(g && g.t === 'reg') continue; const o = lotXY(cc, r); let cor = '#E6DECD';
      if(g && g.t === 'casa'){ const a = (CASA[g.h.cat] || CASA.outros).a; cor = a === INK ? '#FFFFFF' : a; }
      else if(g && g.t === 'dois') cor = '#121419'; else if(g && g.t === 'centro') cor = '#F4F1EA'; else if(g && g.t === 'enche') cor = COR_E[g.f.t] || cor;
      ctx.fillStyle = cor; ctx.fillRect(X(o.x), Y(o.y), Math.round(LW / S), Math.round(LH / S));
      if(g && g.t === 'casa' && g.h.id === meu){ ctx.fillStyle = INK; ctx.fillRect(X(o.x) + 4, Y(o.y) + 4, Math.round(LW / S) - 8, Math.round(LH / S) - 8); ctx.fillStyle = AMARELO; ctx.fillRect(X(o.x) + 6, Y(o.y) + 6, Math.round(LW / S) - 12, Math.round(LH / S) - 12); }
    }
    c.regs.forEach(R => { ctx.fillStyle = { lago: '#D9C27F', zerao: '#D9C27F', bosque: '#B8964C', gleba: '#DCCFB6', estadio: '#A4A8AE', feira: '#F2D8A7', aeroporto: '#CDBB86', acel: '#D9C27F', arthur: '#9C7E3E' }[R.k] || '#E6DECD'; ctx.fillRect(X(R.x), Y(R.y), Math.round(R.w / S), Math.round(R.h / S)); });
    if(c.acel){ const a = c.acel, h = a.hp; ctx.fillStyle = '#A4553A'; ctx.beginPath(); ctx.moveTo(X(h.x), Y(h.y + 6)); a.bases.forEach(b => ctx.lineTo(X(b.x) + (b.x > h.x ? 2 : b.x < h.x ? -2 : 0), Y(b.y) - (b.x === h.x ? 2 : 0))); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#2B2F38'; ctx.lineWidth = 2; ctx.beginPath(); a.cerca.forEach((p, i) => (i ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y)))); ctx.stroke(); }
    if(c.aeroporto){ const p = c.aeroporto.pista; ctx.fillStyle = '#2B2F38'; ctx.fillRect(X(p.x), Y(p.y), Math.round(p.w / S), Math.max(2, Math.round(p.h / S))); }
    if(c.feira) c.feira.barracas.filter(paraMim).forEach(b => { ctx.fillStyle = INK; ctx.fillRect(X(b.x) - 3, Y(b.base) - 4, 7, 5); ctx.fillStyle = b.cor === INK ? AMARELO : b.cor; ctx.fillRect(X(b.x) - 2, Y(b.base) - 3, 5, 3); });
    /* v3.75: o Rio Tibagi embaixo, de ponta a ponta, com os dois píeres */
    const rio = c.rio; if(rio){ ctx.fillStyle = '#D9C27F'; ctx.fillRect(0, Y(rio.y0), cv.width, Math.ceil(RIO_H / S)); ctx.fillStyle = '#9C7E3E'; rio.cols.forEach(q => ctx.fillRect(X(q.x), Y(q.b), 1, Math.max(1, Math.round((rio.y0 + RIO_H - q.b) / S))));
      ctx.fillStyle = '#2F7FC1'; rio.cols.forEach(q => ctx.fillRect(X(q.x), Y(q.t), 1, Math.max(1, Math.round((q.b - q.t) / S)))); ctx.fillStyle = '#8E5B33'; rio.piers.forEach(p => ctx.fillRect(X(p.xp) - 1, Y(p.y), 3, Math.max(2, Math.round(p.h / S)))); }
    /* v3.82: o lago e o ribeirão do Arthur Thomas */
    if(c.arthur){ const a = c.arthur; ctx.fillStyle = '#2F7FC1'; a.lago.cols.forEach(q => ctx.fillRect(X(q.x), Y(q.t), 1, Math.max(1, Math.round((q.b - q.t) / S)))); ctx.strokeStyle = '#2F7FC1'; ctx.lineWidth = 1; a.riachos.forEach(r => { ctx.beginPath(); r.pts.forEach((q, i) => i ? ctx.lineTo(X(q.x), Y(q.y)) : ctx.moveTo(X(q.x), Y(q.y))); ctx.stroke(); }); }
    const l = c.lago; ctx.fillStyle = '#C9D0D8'; l.bandas[0][1].forEach(q => ctx.fillRect(X(q.x), Y(q.t), 1, Math.max(1, Math.round((q.b - q.t) / S))));
    ctx.fillStyle = '#2F7FC1'; l.cols.forEach(q => ctx.fillRect(X(q.x), Y(q.t), 1, Math.max(1, Math.round((q.b - q.t) / S))));
    /* v3.87: no Natal, o Papai Noel em pé na balsa, no meio do lago */
    if(l.noel && natal()){ const nx = X(l.noel.x), ny = Y(l.noel.y); ctx.fillStyle = '#2B2F38'; ctx.fillRect(nx - 9, ny - 2, 19, 3); ctx.fillStyle = '#E3A934'; [[-8, 17], [-7, 15], [-6, 13], [-5, 11], [-5, 11], [-4, 9]].forEach(([d, w], i) => ctx.fillRect(nx + d, ny - 3 - i * 2, w, 2));
      ctx.fillStyle = '#D42A35'; [[-5, 11], [-5, 11], [-4, 9], [-4, 9], [-3, 7], [-3, 7]].forEach(([d, w], i) => ctx.fillRect(nx + d, ny - 3 - i * 2, w, 2)); ctx.fillStyle = '#F6F3EC'; ctx.fillRect(nx - 3, ny - 18, 7, 4); ctx.fillStyle = '#F1C19B'; ctx.fillRect(nx - 2, ny - 20, 5, 2); ctx.fillStyle = '#D42A35'; ctx.fillRect(nx - 2, ny - 24, 5, 3); ctx.fillStyle = '#F6F3EC'; ctx.fillRect(nx - 3, ny - 21, 7, 1); ctx.fillRect(nx + 3, ny - 24, 2, 2); }
    const z = c.zerao; ctx.strokeStyle = '#A4553A'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(X(z.cx), Y(z.cy), z.rx / S - 1, z.ry / S - 1, 0, 0, Math.PI * 2); ctx.stroke();
    if(z.skate){ const s = z.skate; ctx.fillStyle = '#A4A8AE'; ctx.fillRect(X(s.x0), Y(s.y0), Math.round((s.x1 - s.x0 - 30) / S), Math.round((s.y1 - s.y0 - 50) / S)); ctx.fillStyle = '#6A7078'; ctx.fillRect(X(s.bowl.x) - 2, Y(s.bowl.y) - 1, 4, 3); }
    const e = c.estadio.campo; ctx.fillStyle = '#2E5BFF'; ctx.fillRect(X(e.x) - 4, Y(e.y) - 6, Math.round(e.w / S) + 8, Math.round(e.h / S) + 10); ctx.fillStyle = '#D9C27F'; ctx.fillRect(X(e.x), Y(e.y), Math.round(e.w / S), Math.round(e.h / S));
    ctx.fillStyle = '#7F8A96'; c.gleba.forEach(g => ctx.fillRect(X(g.x), Y(g.base - 40), Math.max(2, Math.round(g.w / S)), 3));
    [['LAGO IGAPO', l.x + l.w / 2, l.y + l.h / 2], ['ZERAO', z.cx, z.cy], ['BOSQUE', c.bosque.cx, c.bosque.cy], ['CENTRO', c.praca.cx, c.praca.y + LH + 40], ['ESTADIO', c.estadio.campo.x + c.estadio.campo.w / 2, c.estadio.campo.y + c.estadio.campo.h / 2], ['GLEBA', c.glebaR.R.x + c.glebaR.R.w / 2, c.glebaR.R.y + LH / 2]].concat(c.feira ? [['FEIRA', c.feira.R.x + c.feira.R.w / 2, c.feira.R.y + c.feira.R.h + 30]] : []).concat(c.aeroporto ? [['AEROPORTO', c.aeroporto.R.x + c.aeroporto.R.w / 2, c.aeroporto.R.y + 120]] : []).concat(c.acel ? [['ACEL', c.acel.hp.x, c.acel.hp.y - 250]] : []).concat(c.arthur ? [['ARTHUR THOMAS', c.arthur.R.x + c.arthur.R.w / 2, c.arthur.R.y + 300]] : []).concat(rio ? [['RIO TIBAGI', c.W * .55, rio.cyF(c.W * .55)]] : []).forEach(([t, x, y]) => pixPlaca(ctx, t, X(x), Y(y), { fundo: PAPEL }));
    const mostra = quemAparece(); ctx.fillStyle = PAPEL; for(const r of V.remotos.values()) if(mostra.has(r.sid) && !r.npc) ctx.fillRect(X(r.x) - 1, Y(r.y) - 1, 3, 3);
    if(V.eu && Date.now() % 1000 < 650){ ctx.fillStyle = INK; ctx.fillRect(X(V.eu.x) - 3, Y(V.eu.y) - 3, 7, 7); ctx.fillStyle = ROSA; ctx.fillRect(X(V.eu.x) - 2, Y(V.eu.y) - 2, 5, 5); }
  }
  function mapaSheet(){
    const c = V.cid, S = 16, mw = Math.ceil(c.W / S), mh = Math.ceil((c.H - TOPO + RUA) / S), L = lugares();
    C.sheet(`<div class="form cvr-mapa"><div class="sheet-head"><h2>Mapa</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <canvas id="cvr-mapa-cv" width="${mw}" height="${mh}" aria-label="Mapa da cidade. Toca num lugar pra ir direto pra lá."></canvas>
      <p class="fine">Toca no mapa pra ir direto pra lá, ou escolhe um lugar. Você é o quadradinho rosa; os brancos são quem tá na cidade.</p>
      <button type="button" class="btn sm cvr-ag-bt" data-act="cvr-agenda">${ico('cal')} Agenda da cidade${eventoAgora() ? ` <b class="cvr-ag-vivo">AO VIVO: ${esc(eventoAgora().e.nome)}</b>` : ''}</button>
      ${c.feira ? `<p class="lbl-s">Feira do Corre: vai direto pra barraca</p><div class="cvr-lugares cvr-fb">${c.feira.barracas.filter(paraMim).map(b => `<button type="button" class="btn sm" data-act="cvr-ir-barraca" data-id="${esc(b.id)}">${ico(b.ico)} ${esc(b.titulo)}</button>`).join('')}</div><p class="lbl-s">Lugares</p>` : ''}
      <div class="cvr-lugares">${L.map((l, i) => `<button type="button" class="btn sm" data-act="cvr-ir-lugar" data-i="${i}">${esc(l.nome)}</button>`).join('')}</div></div>`, 'wide');
    const cv = C.$('cvr-mapa-cv'); if(!cv) return;
    const ajusta = () => { const box = cv.parentElement.clientWidth, alt = Math.max(220, innerHeight * .58); cv.style.width = Math.min(box, alt * mw / mh) + 'px'; }; ajusta();
    desenhaMapa(cv, S);
    cv.addEventListener('click', ev => { const r = cv.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width * mw * S, y = TOPO - RUA + (ev.clientY - r.top) / r.height * mh * S, p = pertoLivre(x, y); if(p) teleporta(p.x, p.y); });
    const pisca = () => { if(!cv.isConnected || !V.vivo) return; desenhaMapa(cv, S); setTimeout(pisca, 400); }; setTimeout(pisca, 400);
  }
  /* v3.43 · o minimapa: a cidade em miniatura no canto da tela, ao vivo (você piscando em rosa, quem tá na cidade em
     branco). É o mesmo desenho do Mapa (desenhaMapa), feito numa tela escondida e recortado em volta de você; perto da
     borda da cidade o recorte para na borda (você sai do meio, mas o mapa não mostra o vazio). Tocou, abre o Mapa grande */
  function miniMapa(){
    const cv = C.$('cvr-mapinha-cv'); if(!cv || !V.cid || !V.eu) return;
    const c = V.cid, S = 16, mw = Math.ceil(c.W / S), mh = Math.ceil((c.H - TOPO + RUA) / S);
    if(!V.miniTudo || V.miniTudo.width !== mw || V.miniTudo.height !== mh){ V.miniTudo = document.createElement('canvas'); V.miniTudo.width = mw; V.miniTudo.height = mh; }
    desenhaMapa(V.miniTudo, S);
    const ctx = cv.getContext('2d'), w = cv.width, h = cv.height, px = V.eu.x / S, py = (V.eu.y - (TOPO - RUA)) / S;
    const sx = mw <= w ? (mw - w) / 2 : clamp(Math.round(px - w / 2), 0, mw - w), sy = mh <= h ? (mh - h) / 2 : clamp(Math.round(py - h / 2), 0, mh - h);
    ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#2B2F38'; ctx.fillRect(0, 0, w, h);
    ctx.drawImage(V.miniTudo, Math.round(sx), Math.round(sy), w, h, 0, 0, w, h);
    /* v3.89 · o minimapa desce até onde a faixa de cima acaba: ela quebra em mais linhas quando aparece a zona, a tarefa ou
       o botão da tela cheia, e com a altura fixa o minimapa tampava o que caía na linha de baixo */
    const tp = cv.closest('.cvr-stage'), fx = tp && tp.querySelector('.cvr-top');
    if(fx){ const t = Math.round(fx.offsetTop + fx.offsetHeight + 10) + 'px'; if(tp.style.getPropertyValue('--mini-t') !== t) tp.style.setProperty('--mini-t', t); }
  }
  function falando(o, eu){ if(eu) return V.mic && V.nivelEu > .035; const p = V.peers.get(o.sid); return !!p && (p.bot ? Math.sin(performance.now() / 260) > .2 : (p.nivel || 0) > .03); }
  function boneco(ctx, o, t, eu){
    const [ix, iy] = ptBase(ctx, o.x, o.y);
    /* no avião (ou de paraquedas) quem desenha é o voo */
    if(emVoo(o)) return;
    if(falando(o, eu)){ ctx.save(); naBase(ctx); ctx.fillStyle = ROSA; const w = 9 + (Math.sin(t * 14) > 0 ? 1 : 0); ctx.fillRect(ix - w, iy + 1, w * 2, 1); ctx.fillRect(ix - w, iy - 1, 1, 2); ctx.fillRect(ix + w - 1, iy - 1, 1, 2); ctx.restore(); }
    const item = o.item && (eu ? o.item.ate > Date.now() && o.item.k : o.item) || null;
    if(o.barco){ barquinho(ctx, o, t, eu, item); return; }
    skin(ctx, o.av, ix, iy, o.sit ? 'baixo' : o.dir, o.mov && !o.sit ? o.passo : null, 1, o.sit ? 'sentado' : '', { item, pesca: !!(o.pesca && o.sit), vc: o.sit ? '' : veiculoDe(o), vcor: o.av && o.av.vcor, pulo: alturaPulo(o) * PULO_PX });
  }
  /* ---------- v3.40 · o pulo, o veículo de cada um ---------- */
  const PULO_MS = 480, PULO_PX = 11;
  /* a altura do pulo agora (0 a 1, uma parábola) */
  const alturaPulo = o => { const t0 = o && o.puT; if(!t0) return 0; const f = (performance.now() - t0) / (o.puMs || PULO_MS); return f > 0 && f < 1 ? 4 * f * (1 - f) * (o.puH || 1) : 0; };
  /* o veículo de alguém: o da garagem (ou o skate de antes da garagem) */
  const veiculoDe = o => { const av = o && o.av; if(!av) return ''; if(!o.barco && !o.sit && naPistaSkate(o.x, o.y)) return 'skate'; return av.veiculo && C.veiculos && C.veiculos.porK(av.veiculo) ? av.veiculo : av.skate ? 'skate' : ''; };
  const veiculoInfo = o => { const k = veiculoDe(o); return k && C.veiculos ? C.veiculos.porK(k) : null; };
  const MIC_B = ['01110', '01110', '01110', '10001', '01110', '00100', '01110'];
  /* v3.76 · o balão de fala comprida (os moradores): quebra em linhas de até 24 letras (no máximo 4), numa caixa só,
     com o biquinho embaixo apontando pra quem fala. yb é onde ficaria o meio do balão de uma linha */
  function quebraLinhas(t, n){
    const L = []; let l = '';
    txtN(t).split(/\s+/).forEach(w => { while(w.length > n){ if(l){ L.push(l); l = ''; } L.push(w.slice(0, n)); w = w.slice(n); } if(!w) return; if(!l) l = w; else if((l + ' ' + w).length <= n) l += ' ' + w; else { L.push(l); l = w; } });
    if(l) L.push(l); return L.slice(0, 4);
  }
  function balaoLongo(ctx, t, x, yb){
    const L = quebraLinhas(t, 24), [cx, cy, md] = ptBase(ctx, x, yb), w = Math.max(...L.map(l => pixLarg(l, 1))), pad = 3, lh = 7, h = L.length * lh - 2 + pad * 2;
    const x0 = cx - Math.floor(w / 2) - pad, y0 = cy + 4 - h;
    ctx.save(); naBase(ctx);
    ctx.fillStyle = INK; ctx.fillRect(x0 - 1, y0 - 1, w + pad * 2 + 2, h + 2); ctx.fillStyle = PAPEL; ctx.fillRect(x0, y0, w + pad * 2, h);
    ctx.fillStyle = INK; ctx.fillRect(cx - 1, y0 + h + 1, 3, 1); ctx.fillRect(cx, y0 + h + 2, 1, 1);
    ctx.restore();
    L.forEach((l, i) => pixTxt(ctx, l, x, yb + (y0 + pad + i * lh + 2 - cy) / md, 1, INK, 'c'));
  }
  function nomeDe(ctx, o, eu, agora){
    /* v3.76: dois moradores conversando: só aparece o nome de quem tá falando (lado a lado, as plaquinhas se encavalavam) */
    if(o.morador && o.papo && !o.papo.eu && !(o.fala && o.fala.ate > (agora || Date.now()))) return;
    const vk = o.sit || o.barco ? '' : veiculoDe(o), sobe = vk && C.veiculos ? C.veiculos.pose(vk, 'frente').sobe : 0;
    const nm = eu ? 'voce' : o.eu ? 'voce · outro aparelho' : o.handle ? '@' + o.handle : (o.nome || 'visitante'), y = o.y - ((o.sit || o.barco ? 28 : 31) + sobe + alturaPulo(o) * PULO_PX + (emParaquedas(o) ? 22 : 0)) / V.k - altVoo(o);
    let yb = y - 13 / V.k;
    if(!eu && o.tr){ pixPlaca(ctx, 'TRAMPANDO', o.x, yb, { fundo: AMARELO }); yb -= 13 / V.k; }
    else if(!eu && o.ec){ pixPlaca(ctx, 'EM CASA', o.x, yb, { fundo: LILAS }); yb -= 13 / V.k; }
    else if(!eu && o.jg){ pixPlaca(ctx, 'NO AQUARIO', o.x, yb, { fundo: '#38E1FF' }); yb -= 13 / V.k; }
    else if(!eu && o.pt > 0 && o.av && o.av.skin && !o.av.personagem && PATENTES[o.av.skin]){ pixPlaca(ctx, PATENTES[o.av.skin][o.pt].toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''), o.x, yb, { fundo: '#38E1FF' }); yb -= 13 / V.k; }
    /* v3.75: no barco, a maior piapara do dia vai em cima do nome */
    /* v3.85: quem tirou a de 4,850 hoje leva a plaquinha amarela */
    if(o.barco){ const kg = eu ? piaparaHoje() : o.pd === diaBR() % 1e5 ? o.pp / 100 : 0; if(kg > 0){ const top = kg >= PIAPARA_MAX - .001; pixPlaca(ctx, top ? 'PIAPARA 4,850KG' : 'PIAPARA ' + kgTxt(kg) + 'KG', o.x, yb, { fundo: top ? AMARELO : '#9CC9F0' }); yb -= 13 / V.k; } }
    /* v3.76: o balão comprido fica pra depois de todos os nomes (senão a plaquinha de quem tá do lado tampa a fala) */
    if(o.fala && o.fala.ate > (agora || Date.now()) && txtN(o.fala.t).length > 24) (V.baloes || (V.baloes = [])).push([o.fala.t, o.x, yb]);
    else if(o.fala && o.fala.ate > (agora || Date.now())){ const b = pixPlaca(ctx, o.fala.t, o.x, yb, { fundo: PAPEL, max: 24 }); ctx.save(); naBase(ctx); ctx.fillStyle = INK; const tx = b.ix + Math.floor(b.w / 2); ctx.fillRect(tx - 1, b.iy + b.h, 3, 1); ctx.fillRect(tx, b.iy + b.h + 1, 1, 1); ctx.restore(); }
    const r = pixPlaca(ctx, nm, o.x, y, { fundo: eu ? AMARELO : o.eu ? '#FFF7A8' : o.morador ? '#F2D8A7' : PAPEL, max: o.eu ? 22 : 16 });
    /* v3.54: de patinete (o da JET), a marca vai do lado do nome */
    if(vk === 'patinete') pixPlaca(ctx, 'JET', o.x - (r.w / 2 + 11) / V.k, y, { fundo: '#307FE2', cor: PAPEL, borda: INK });
    if(eu ? V.mic : o.mic){
      const p = !eu && V.peers.get(o.sid), vivo = (p && p.estado === 'aovivo') || (eu && [...V.peers.values()].some(q => q.estado === 'aovivo'));
      ctx.save(); naBase(ctx); const bx = r.ix + r.w + 1, by = r.iy;
      ctx.fillStyle = INK; ctx.fillRect(bx, by, 9, r.h); ctx.fillStyle = vivo ? ROSA : PAPEL; ctx.fillRect(bx + 1, by + 1, 7, r.h - 2);
      ctx.fillStyle = INK; const y0 = by + Math.floor((r.h - 7) / 2); MIC_B.forEach((row, i) => { for(let j = 0; j < 5; j++) if(row[j] === '1') ctx.fillRect(bx + 2 + j, y0 + i, 1, 1); });
      ctx.restore();
    }
  }

  /* ---------- o laço ---------- */
  /* de skate anda mais rápido; comeu alguma coisa, mais ainda (por 1 minuto); os dois juntos têm teto */
  /* v3.40: cada veículo da garagem tem a sua velocidade (o carro e a naked são os mais rápidos) */
  const ritmo = e => { const vi = veiculoInfo(e); return Math.min(2.8, (vi ? vi.vel : 1) * (e.turboAte && e.turboAte > Date.now() ? 1.3 : 1)); };
  /* o teu boneco num passo (de até 50 ms); fator = quanto o direcional da tela tá empurrado (1 = tudo) */
  function andaEu(e, kx, ky, dt, fator){
    let dx = kx, dy = ky;
    if(e.sit) dx = dy = 0;
    if(V.entrando > 0){ V.entrando -= dt; dy = 1; dx = 0; }
    else if(dx || dy) V.alvo = null;
    else if(V.alvo){ const ax = V.alvo.x - e.x, ay = V.alvo.y - e.y, d = Math.hypot(ax, ay); if(d < 6){ V.alvo = null; } else { dx = ax / d; dy = ay / d; } }
    const n = Math.hypot(dx, dy); e.mov = n > 0;
    if(e.mov){
      dx /= n; dy /= n; const f = fator || 1, rt = ritmo(e), v = VEL * (V.entrando > 0 ? .6 : 1) * rt * f * dt, ox = e.x, oy = e.y;
      mover(e, dx * v, dy * v); e.passo += dt * 11 * (veiculoInfo(e) ? clamp(rt * f * .8, .6, 1.7) : f);
      e.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'esq' : 'dir') : (dy < 0 ? 'cima' : 'baixo');
      if(V.alvo && Math.hypot(e.x - ox, e.y - oy) < .2) V.alvo = null;
    }
  }
  function passo(dtReal, t){
    const e = V.eu; if(!e) return;
    const dt = Math.min(.05, dtReal);
    let kx = 0, ky = 0;
    const K = V.teclas;
    if(K.has('ArrowLeft') || K.has('a')) kx -= 1; if(K.has('ArrowRight') || K.has('d')) kx += 1;
    if(K.has('ArrowUp') || K.has('w')) ky -= 1; if(K.has('ArrowDown') || K.has('s')) ky += 1;
    /* o direcional da tela (celular): a direção e a força */
    let fator = 1; const pdv = V.pad && !BC.aberto ? V.pad.vetor() : null;
    if(pdv && pdv.m && !kx && !ky){ kx = pdv.x; ky = pdv.y; fator = Math.min(1, .35 + pdv.m * .8); }
    V.fatorAnda = fator;
    if(V.voo){ kx = ky = 0; V.alvo = null; }
    if(e.sit && (kx || ky || V.alvo)){ e.sit = false; e.pesca = null; portaUI(); enviaPos(true); }
    /* pescando: na hora certa, fisga (ou não) e joga a linha de novo */
    if(e.pesca && e.sit && Date.now() > e.pesca.ate){ const agora = Date.now(), r = Math.random(); if(r < .6){ e.item = { k: 'peixe', ate: agora + 8000 }; falaAuto(1); } else if(r < .7){ e.item = { k: 'bota', ate: agora + 8000 }; falaAuto(3); } else falaAuto(2); e.pesca = { ate: agora + 6000 + Math.random() * 5000 }; enviaPos(true); }
    /* quadro lento (celular fraco): o boneco anda em passos de até 50 ms, pra a velocidade não depender do quadro */
    /* v3.58: no minijogo parado o boneco não anda (as setas são do jogo) */
    if(V.tarefa && V.tarefa.fase === 'jogando'){ kx = ky = 0; V.alvo = null; }
    const np = Math.max(1, Math.ceil(dtReal / .05 - 1e-9));
    if(V.voo) passoVoo(dtReal);
    else if(e.barco) for(let i = 0; i < np; i++) andaBarco(e, kx, ky, dtReal / np, fator);
    else for(let i = 0; i < np; i++) andaEu(e, kx, ky, dtReal / np, fator);
    somDoPasso(e);
    for(const r of V.remotos.values()){
      if(r.bot) continue;
      const ax = r.tx - r.x, ay = r.ty - r.y, d = Math.hypot(ax, ay);
      if(d > 400){ r.x = r.tx; r.y = r.ty; } else if(d > .5){ const k = Math.min(1, dt * 10); r.x += ax * k; r.y += ay * k; }
      r.mov = d > 1.5 || r.mov && d > .5; if(r.mov){ r.passo += dt * 11; if(Math.abs(ax) > Math.abs(ay)) r.dir = ax < 0 ? 'esq' : 'dir'; else if(Math.abs(ay) > .5) r.dir = ay < 0 ? 'cima' : 'baixo'; }
      if(r.mic && V.peers.get(r.sid)){ const p = V.peers.get(r.sid); if(p.an) p.nivel = p.an(); }
      /* v3.75: o barco dos outros também deixa rastro na água */
      if(r.barco && r.mov && performance.now() - (r.raT || 0) > 110){ r.raT = performance.now(); rastro(r.x - (r.bl < 0 ? -1 : 1) * meioBarco(), r.y + 1); }
    }
    if(e.mov || V.voo) V.paradoT = 0; else if(!V.paradoT) V.paradoT = Date.now();
    skatePasso(dtReal);
    bots(dt); passoMoradores(dt); carros(dt); bolas(dt); passoNpcs(dt); passoTarefa(dt); mjUI(); rioPasso(dt); rioUI(); passoArthur(dt);
    if(V.tarefa && (!V.tarefaUiT || t - V.tarefaUiT > .25)){ V.tarefaUiT = t; tarefaUI(); }
    if(V.anEu) V.nivelEu = V.anEu();
    const z = V.z, cw = V.cssW, ch = V.cssH;
    /* no voo, a câmera acompanha o avião lá em cima (não a sombra no chão) */
    const altC = V.voo ? V.voo.alt * .85 : 0;
    /* v3.75: pescando, a câmera desce um tanto: o barco sobe na tela e o painel da pesca não tampa a boia (no celular,
       onde o painel e o botão ficam no meio da tela, desce mais) */
    const rioC = e.barco && V.rio && V.rio.fase ? ch / z * (V.pad ? .26 : .1) : 0;
    /* v3.87: lendo a placa do Papai Noel do Igapó (ou chegando nele pelo Mapa), a câmera se afasta e sobe até o meio dele,
       pra ver o gigante inteiro; andou ou deu o tempo, ela volta */
    const nl = V.cid.lago && V.cid.lago.noel; if(V.olhaNoel && (e.mov || Date.now() > V.olhaNoel)) voltaZoom();
    const noelC = V.olhaNoel && nl ? Math.max(0, e.y - 40 - (nl.y - 236)) : 0;
    const tx = clamp(V.olhaNoel && nl ? nl.x : e.x, cw / 2 / z, Math.max(cw / 2 / z, V.cid.W - cw / 2 / z)), ty = clamp(e.y - 40 - altC + rioC - noelC, TOPO - RUA - 300 + ch / 2 / z, Math.max(TOPO, V.cid.H - ch / 2 / z));
    const k = Math.min(1, dt * 6); V.cam.x += (tx - V.cam.x) * k; V.cam.y += (ty - V.cam.y) * k;
    /* v3.75: no barco, a única porta é a do píer (pra descer), e de um pouco mais longe (o barco não encosta) */
    let melhor = null, md = e.barco ? 100 : PORTA_R; if(!V.voo) for(const p of V.portas){ if(e.barco && (p.tipo !== 'barco' || !e.barco.livre)) continue; const d = Math.hypot(p.x - e.x, p.y - e.y); if(d < md){ md = d; melhor = p; } }
    /* v3.76: perto de um morador (e de nenhuma porta mais perto), o botão é "Trocar ideia".
       v3.77: entrada de verdade (loja, Sebo, Ateliê, casa, o Calçadão 3D) ganha sempre de morador, mesmo ele falando com
       você: o Rafa do Pix mora na porta do Sebo e tomava o botão de entrar. Só o banco (sentar) cede pra quem conversa */
    const firme = melhor && melhor.tipo !== 'banco' && md < 40;
    if(!e.barco && !V.voo && V.moradores && !firme){ let fala = null, df = 80; for(const m of V.moradores){ const d = Math.hypot(m.x - e.x, m.y - e.y); if(m.papo && m.papo.eu && d < df){ df = d; fala = m; } else if(!fala && d < Math.min(md, 56)){ md = d; melhor = m.porta; } } if(fala) melhor = fala.porta; }
    if(V.portaT && !V.voo && !e.barco) melhor = V.portaT;
    if(melhor !== V.porta){ V.porta = melhor; portaUI(); }
    const zn = zonaDe(e.x, e.y); if(zn !== V.zona){ V.zona = zn; const zb = C.$('cvr-zona'); if(zb){ zb.hidden = !zn; zb.innerHTML = zn ? `${ico('pin')} ${esc(zn)}` : ''; } }
    enviaPos(false);
  }
  /* ---------- v3.40 · os sons: o passo (cada chão o seu), o motor do veículo, o ambiente de cada lugar ---------- */
  function chaoDe(x, y){
    const c = V.cid, l = c.lago, rio = c.rio;
    if(l) for(const s of l.secos) if(x > s.x && x < s.x + s.w && y > s.y && y < s.y + s.h) return 'madeira';
    /* v3.75: na beira do Tibagi, o píer é madeira, a prainha é areia e a trilha é terra */
    if(rio && y > rio.y0 + 14){ for(const p of rio.piers) if(x > p.x && x < p.x + p.w && y > p.y && y < p.y + p.h) return 'madeira'; if(rio.prainha && x > rio.prainha.x0 && x < rio.prainha.x1) return 'areia'; const t = rio.colEm(x).t; return y > t - 44 ? 'terra' : 'grama'; }
    for(const R of c.regs) if(x >= R.x && x <= R.x + R.w && y >= R.y && y <= R.y + R.h){
      if(R.k === 'bosque') return 'terra';
      /* v3.82: no Arthur Thomas, madeira nos pontilhões, na barragem e nos decks; pedra na praça; o resto é terra */
      if(R.k === 'arthur'){ const a = c.arthur; if(!a) return 'terra'; const d = a.deck; if(a.secos.some(s => x > s.x && x < s.x + s.w && y > s.y && y < s.y + s.h) || (x > d.x && x < d.x + d.w && y > d.y && y < d.y + d.h)) return 'madeira'; const pr = a.praca; return x > pr.x && x < pr.x + pr.w && y < pr.y + pr.h ? 'pedra' : 'terra'; }
      if(R.k === 'zerao' || R.k === 'lago') return 'grama';
      if(R.k === 'acel'){ const a = c.acel; return a && x > a.hp.x - 34 && x < a.hp.x + 34 && y > a.hp.y + 28 ? 'pedra' : 'grama'; }
      if(R.k === 'estadio'){ const f = c.estadio.campo; return x > f.x && x < f.x + f.w && y > f.y && y < f.y + f.h ? 'grama' : 'pedra'; }
      if(R.k === 'aeroporto'){ const a = c.aeroporto; if(!a) return 'pedra'; const naPista = y > a.pista.y - 8 && y < a.pista.y + a.pista.h + 8, noPatio = x > a.patio.x - 40 && y > a.patio.y && y < a.pista.y; return y > a.term.base + 70 && !naPista && !noPatio ? 'grama' : 'pedra'; }
      return 'pedra';
    }
    const cc = Math.floor((x - RUA) / (LW + RUA)), rr = Math.floor((y - TOPO) / (LH + RUA)), g = c.grade[rr] && c.grade[rr][cc];
    if(g && g.t === 'enche' && (g.f.t === 'pracinha' || g.f.t === 'bosquinho')){ const o = lotXY(cc, rr); if(x > o.x && x < o.x + LW && y > o.y && y < o.y + LH) return 'grama'; }
    return 'pedra';
  }
  function somDoPasso(e){
    const S = C.versoSom; if(!S || !S.ativo()) return;
    if(e.barco){ S.motor('rabeta', clamp(Math.hypot(e.barco.vx, e.barco.vy) / BARCO_MAX, 0, 1)); return; }
    const vi = veiculoInfo(e), andando = !!(e.mov && !e.sit && !V.voo);
    S.motor(vi && !V.voo && !e.sit ? vi.som : null, andando ? Math.min(1, ritmo(e) / 2.4 * (V.fatorAnda || 1) + .12) : 0);
    const n = Math.floor(e.passo / Math.PI);
    if(!vi && andando && alturaPulo(e) === 0 && n !== V.passoN) S.passo(chaoDe(e.x, e.y), .9);
    V.passoN = n;
  }
  /* o ambiente de onde você tá: trânsito na cidade, passarinho no verde, gente no Calçadão e na Feira, água no lago */
  function ambienteDaCidade(){
    const S = C.versoSom; if(!S || !V.eu || !V.cid) return;
    const c = V.cid, x = V.eu.x, y = V.eu.y, perto = (p, r) => p ? clamp(1 - Math.hypot(x - p.x, y - p.y) / r, 0, 1) : 0;
    const R = c.regs.find(R => x >= R.x - 80 && x <= R.x + R.w + 80 && y >= R.y - 80 && y <= R.y + R.h + 80);
    const g = c.grade[Math.floor((y - TOPO) / (LH + RUA))], f = g && g[Math.floor((x - RUA) / (LW + RUA))];
    /* v3.82: o rio é lido antes (o verde usava ele uma linha antes de existir: fora do verde, dava erro e o ambiente parava) */
    const lg = c.lago, rio = c.rio, ar = c.arthur;
    const verde = (R && /bosque|zerao|lago|acel|arthur/.test(R.k)) || !!(f && f.t === 'enche' && /pracinha|bosquinho/.test(f.f.t)) || (rio && y > rio.y0 - 20);
    const beira = rio && y > rio.y0 - 60, agua = (lg && x > lg.x - 60 && x < lg.x + lg.w + 60 && y > lg.y - 60 && y < lg.y + lg.h + 60) || beira ? 1 : 0;
    const gente = Math.max(perto({ x: c.praca.cx, y: c.praca.cy }, 700), c.feira ? perto({ x: c.feira.R.x + c.feira.R.w / 2, y: c.feira.R.y + c.feira.R.h / 2 }, 600) : 0, perto(c.centro.concha ? { x: c.centro.concha.x + LW / 2, y: c.centro.concha.base + 60 } : null, 420) * .7);
    const trafego = rio && y > rio.y0 + 60 ? .2 : R ? ({ lago: .3, bosque: .4, zerao: .55, aeroporto: .45, acel: .5, arthur: .15 }[R.k] || .7) : 1;
    const aguaAr = ar ? Math.max(perto({ x: (ar.lago.x0 + ar.lago.x1) / 2, y: ar.R.y + 690 }, 330), perto({ x: ar.salto.x, y: ar.salto.y1 }, 260)) : 0;
    /* v4.0: de noite menos trânsito e passarinho, mais grilo onde tem mato; com chuva, o som dela */
    const cu = ceuAgora(), ch = cu.clima.f * (cu.clima.tipo === 'chuva' ? 1 : cu.clima.tipo === 'garoa' ? .45 : 0);
    S.ambiente({ trafego: trafego * (1 - .45 * cu.escuro), passaros: (verde ? 1 : .2) * (1 - .9 * cu.escuro) * (1 - .7 * ch), gente, agua: Math.max(agua * ((R && R.k === 'lago') || (rio && y > rio.y0 + 60) ? 1 : .5), aguaAr), chuva: ch, grilo: cu.escuro * (verde ? 1 : .3) * (1 - ch) });
  }
  function laco(ts){
    if(!V.vivo) return;
    if(!V.cv || !V.cv.isConnected){ sair(); return; }
    const t = ts / 1000, dt = Math.min(.25, V.tAnt ? Math.max(0, t - V.tAnt) : .016); V.tAnt = t;
    if(BC.aberto || V.jogo || (C.casa && C.casa.aberta())){
      /* no balcão ou dentro de casa a cidade não desenha; quem anda chega direto onde tá (a voz por proximidade continua certa) */
      for(const r of V.remotos.values()) if(!r.bot){ r.x = r.tx; r.y = r.ty; r.mov = false; }
      V.raf = requestAnimationFrame(laco); return;
    }
    /* v3.55: um quadro que dá erro não para a cidade (o próximo quadro sempre fica marcado; o erro vai pro console uma vez) */
    try{ passo(dt, t); quadro(t); ajustaFx(dt, t); if(ts - (V.miniT || 0) > 330){ V.miniT = ts; miniMapa(); } }
    catch(e){ if(!V.erroQ){ V.erroQ = 1; try{ console.error('[corre] cidade', e); }catch(_){} } }
    V.raf = requestAnimationFrame(laco);
  }
  function bots(dt){
    const agora = Date.now();
    V.bots.forEach(b => {
      b.esp -= dt;
      if(b.esp <= 0 && !b.alvo){
        b.sit = false;
        const r = Math.random, bancos = V.cid.bancos.filter(x => !x.degrau);
        if(r() < .45 && bancos.length){ const bc = bancos[Math.floor(r() * bancos.length)]; b.alvo = { x: bc.x, y: bc.y + 2, banco: true }; }
        else b.alvo = { x: clamp(b.casa.x + (r() - .5) * 460, 30, V.cid.W - 30), y: clamp(b.casa.y + 40 + r() * 200, TOPO, V.cid.H - 30) };
      }
      if(b.alvo){ const ax = b.alvo.x - b.x, ay = b.alvo.y - b.y, d = Math.hypot(ax, ay); if(d < 5){ b.sit = !!b.alvo.banco; b.dir = 'baixo'; b.alvo = null; b.esp = (b.sit ? 8 : 2) + Math.random() * 4; b.mov = false; } else { const ox = b.x, oy = b.y; mover(b, ax / d * 90 * dt, ay / d * 90 * dt); b.mov = true; b.passo += dt * 9; b.dir = Math.abs(ax) > Math.abs(ay) ? (ax < 0 ? 'esq' : 'dir') : (ay < 0 ? 'cima' : 'baixo'); if(Math.hypot(b.x - ox, b.y - oy) < .1){ b.alvo = null; b.esp = 1; b.mov = false; } } }
      /* chegou perto de você: puxa assunto */
      if(V.eu && dist(b, V.eu) < 150 && !(b.fala && b.fala.ate > agora) && (!b.falou || agora - b.falou > 9000) && Math.random() < dt * .4){ b.falou = agora; b.fala = { t: FALAS[Math.floor(Math.random() * 5)], ate: agora + 4000 }; }
    });
  }

  /* ---------- o trampo: a Delegacia, o Corpo de Bombeiros, o Hospital e as tarefas de cada uniforme ----------
     Cada uniforme tem um lugar e tarefas (ir até, agir no ponto, levar algo, pegar alguém, fazer gol). A tarefa é uma
     por vez: o alvo aparece no mapa (seta rosa) e no chip do alto; chegou perto, o botão amarelo faz a ação (uns segundos
     parado). Feita: ponto na carteira (corre_perfis.verso.tarefas) e a patente sobe. Quem passa vê a patente na plaquinha. */
  const CIVICOS = { delegacia: { u: 'policial', nome: 'Delegacia', veste: 'Vestir a farda', entra: 'Entrar na Delegacia' }, bombeiros: { u: 'bombeiro', nome: 'Corpo de Bombeiros', veste: 'Vestir o uniforme', entra: 'Entrar nos Bombeiros' }, hospital: { u: 'medico', nome: 'Hospital do Corre', veste: 'Vestir o jaleco', entra: 'Entrar no Hospital' } };
  const PATENTES = { policial: ['Recruta', 'Soldado', 'Sargento', 'Delegado'], bombeiro: ['Aspirante', 'Cabo', 'Sargento', 'Comandante'], medico: ['Residente', 'Plantonista', 'Chefe de equipe', 'Diretor'], chef: ['Ajudante', 'Cozinheiro', 'Sous-chef', 'Chef de cozinha'],
    motoboy: ['Novato', 'Entregador', 'Veterano', 'Rei da entrega'], craque: ['Peneira', 'Reserva', 'Titular', 'Craque'], ladrao: ['Trombadinha', 'Batedor', 'Mão leve', 'Lenda'], detetive: ['Estagiário', 'Investigador', 'Inspetor', 'Mestre'], cientista: ['Bolsista', 'Mestre', 'Doutor', 'Gênio'],
    pirata: ['Grumete', 'Marujo', 'Imediato', 'Capitão'], astronauta: ['Cadete', 'Piloto', 'Comandante', 'Lenda da Lua'], ninja: ['Aprendiz', 'Sombra', 'Mestre', 'Lenda'], super: ['Ajudante', 'Herói', 'Super', 'Lenda'], rei: ['Príncipe', 'Rei', 'Imperador', 'Rei dos reis'] };
  const NIVEIS = [0, 3, 8, 15];
  const patenteDe = (u, n) => { const P = PATENTES[u]; if(!P) return ''; let i = 0; for(let j = 0; j < NIVEIS.length; j++) if(n >= NIVEIS[j]) i = j; return P[i]; };
  const patenteIdx = (u, n) => { if(!PATENTES[u]) return 0; let i = 0; for(let j = 0; j < NIVEIS.length; j++) if(n >= NIVEIS[j]) i = j; return i; };
  const tarefasFeitas = () => { const v = C.st.me && C.st.me.verso && typeof C.st.me.verso.tarefas === 'object' && C.st.me.verso.tarefas ? C.st.me.verso.tarefas : {}; const o = {}; Object.keys(PATENTES).forEach(u => { o[u] = Number.isInteger(v[u]) && v[u] > 0 ? v[u] : 0; }); return o; };
  const meuUniforme = () => (V.eu && V.eu.av && !V.eu.av.personagem && V.eu.av.skin) || '';
  const lugarNome = nm => { const l = V.cid.lugares.find(x => x.nome === nm); return l ? { x: l.x, y: l.y } : null; };
  const portaCivica = k => { const o = V.cid.centro[k]; return o ? { x: o.x + LW / 2, y: o.base + 14 } : null; };
  const sorteio = L => L[Math.floor(Math.random() * L.length)];
  const truckDe = nome => { const tr = V.cid.trucks.find(t => t.nome === nome); return tr ? { x: tr.x, y: tr.base + 14 } : null; };
  const quiosqueDe = nome => { const q = V.cid.quiosques.find(t => t.nome === nome); return q ? { x: q.x, y: q.base + 18 } : null; };
  const livre = p => (p ? pertoLivre(p.x, p.y) || p : null);
  /* cada tarefa monta as etapas na hora (sorteando lugares da cidade); etapa = { x, y, rotulo, acao?, dur?, efeito?, item?, perto? } */
  const TAREFAS = {
    policial: [
      { k: 'ronda', nome: 'Ronda do Centro', desc: 'Passa pelo Calçadão, pela Catedral e pela Concha Acústica.', pontos: 3, monta: () => [['Calçadão'], ['Catedral'], ['Concha Acústica']].map(([n]) => { const c = V.cid.centro[{ 'Calçadão': 'praca', Catedral: 'catedral', 'Concha Acústica': 'concha' }[n]]; return Object.assign(livre({ x: c.x + LW / 2, y: c.base + 40 }), { rotulo: n }); }) },
      { k: 'ladrao', nome: 'Pegar o ladrão', desc: 'Tem um ladrão à solta perto daqui. Corre atrás e prende (chega encostado).', pontos: 5, tempo: 90, monta: () => { const e = V.eu, a = Math.random() * Math.PI * 2, p = pertoLivre(clamp(e.x + Math.cos(a) * 420, 40, V.cid.W - 40), clamp(e.y + Math.sin(a) * 300, TOPO + 20, V.cid.H - 40)) || { x: e.x + 200, y: e.y }; return [Object.assign(p, { rotulo: 'o ladrão', npc: 'ladrao', pegar: 26 })]; } },
      { k: 'transito', nome: 'Trânsito no cruzamento', desc: 'Um semáforo pifou. Fica no cruzamento organizando o trânsito.', pontos: 2, monta: () => { const c = 1 + Math.floor(Math.random() * (COLS - 2)), r = 1 + Math.floor(Math.random() * 2), o = lotXY(c, r); return [Object.assign(livre({ x: o.x - RUA / 2, y: o.y - RUA / 2 + 10 }), { rotulo: 'o cruzamento', acao: 'Organizar o trânsito', dur: 6, efeito: 'apito' })]; } }
    ],
    bombeiro: [
      { k: 'fogo', nome: 'Fogo no prédio', desc: 'Chamou no rádio: fogo num prédio da cidade. Vai lá e apaga.', pontos: 5, tempo: 150, monta: () => { const fs = V.cid.enche.filter(f => f.t === 'predio' || f.t === 'loja'); const f = sorteio(fs.length ? fs : V.cid.enche); const x = f.t === 'predio' ? f.px + f.pw / 2 : f.x + LW / 2; return [Object.assign(livre({ x, y: f.base + 16 }), { rotulo: f.t === 'predio' ? 'o prédio' : 'a loja', acao: 'Apagar o fogo', dur: 4, efeito: 'fogo', fx: x, fy: f.base - 70 })]; } },
      { k: 'gato', nome: 'Gato na árvore', desc: 'Um gato subiu num ipê e não desce. Resgata ele.', pontos: 3, monta: () => { const as = V.cid.arv.filter(a => !a.ilha && !a.g && a.y > TOPO + 40); const a = sorteio(as); return [Object.assign(livre({ x: a.x, y: a.y + 8 }), { rotulo: 'o ipê', acao: 'Resgatar o gato', dur: 3, efeito: 'gato', fx: a.x, fy: a.y - 44, item: 'gato' })]; } },
      { k: 'treino', nome: 'Treino na torre', desc: 'Sobe a escada da torre do quartel, de equipamento completo.', pontos: 2, monta: () => [Object.assign(livre(portaCivica('bombeiros')), { rotulo: 'o quartel', acao: 'Subir na escada', dur: 5, efeito: 'suor' })] }
    ],
    medico: [
      { k: 'socorro', nome: 'Passou mal no Zerão', desc: 'Alguém passou mal no Zerão. Vai lá e atende.', pontos: 5, monta: () => { const b = sorteio(V.cid.bancos.filter(x => x.lugar === 'Zerão')); return [Object.assign(livre({ x: b.x, y: b.y + 14 }), { rotulo: 'o Zerão', acao: 'Atender', dur: 4, efeito: 'paciente', npc: 'paciente', fx: b.x, fy: b.y + 4 })]; } },
      { k: 'vacina', nome: 'Vacinação na Feira', desc: 'Dia de vacina na Feira do Corre. Leva a caixa e vacina a galera.', pontos: 3, monta: () => [Object.assign(livre(lugarNome('Feira do Corre')), { rotulo: 'a Feira', acao: 'Vacinar a galera', dur: 5, efeito: 'suor' })] },
      { k: 'plantao', nome: 'Plantão', desc: 'Uma hora de plantão (em segundos de Correverso) na emergência.', pontos: 2, monta: () => [Object.assign(livre(portaCivica('hospital')), { rotulo: 'a emergência', acao: 'Fazer o plantão', dur: 8, efeito: 'suor' })] }
    ],
    chef: [
      { k: 'pastel', nome: 'Fritar pastel', desc: 'A fila do truck tá grande. Vinte pastéis, dourados.', pontos: 3, monta: () => [Object.assign(livre(truckDe('PASTEL')), { rotulo: 'o truck do pastel', acao: 'Fritar 20 pastéis', dur: 5, efeito: 'vapor' })] },
      { k: 'smash', nome: 'Chapa do smash', desc: 'Smash atrás de smash, na chapa.', pontos: 3, monta: () => [Object.assign(livre(truckDe('SMASH')), { rotulo: 'o truck do smash', acao: 'Virar os smashes', dur: 5, efeito: 'vapor' })] },
      { k: 'churros', nome: 'Recheio de churros', desc: 'O truck do churros ficou sem doce de leite. Recheia a fornada inteira.', pontos: 3, monta: () => [Object.assign(livre(truckDe('CHURROS')), { rotulo: 'o truck do churros', acao: 'Rechear os churros', dur: 5, efeito: 'vapor' })] }
    ],
    motoboy: [
      { k: 'entrega', nome: 'Entrega', desc: 'Pega o pedido no truck do smash e entrega na casa de alguém. Rápido, que esfria.', pontos: 4, tempo: 150, monta: () => { const h = sorteio(V.cid.casas); return [Object.assign(livre(truckDe('SMASH')), { rotulo: 'o truck', acao: 'Pegar o pedido', dur: 1.5, item: 'caixa', some: false }), Object.assign(livre({ x: h.portaX, y: h.base + 14 }), { rotulo: 'a casa de @' + h.handle, acao: 'Entregar', dur: 1.5, tira: true })]; } },
      { k: 'acai', nome: 'Açaí pra Gleba', desc: 'Pega o açaí no quiosque do lago e entrega na portaria de uma torre da Gleba. Derrete rápido.', pontos: 4, tempo: 150, monta: () => { const t = sorteio(V.cid.glebaR.torres); return [Object.assign(livre(quiosqueDe('ACAI') || truckDe('SMASH')), { rotulo: 'o quiosque do açaí', acao: 'Pegar o açaí', dur: 1.5, item: 'acai' }), Object.assign(livre({ x: t.x + t.w / 2, y: t.base + 18 }), { rotulo: 'a portaria da Gleba', acao: 'Entregar', dur: 1.5, tira: true })]; } },
      { k: 'envelope', nome: 'Documento urgente', desc: 'Busca um envelope no Teatro Ouro Verde e entrega no Hospital do Corre. Tá com pressa.', pontos: 3, tempo: 120, monta: () => [Object.assign(livre(portaCivica('teatro')), { rotulo: 'o Teatro', acao: 'Pegar o envelope', dur: 1, item: 'envelope' }), Object.assign(livre(portaCivica('hospital')), { rotulo: 'o Hospital', acao: 'Entregar', dur: 1, tira: true })] }
    ],
    craque: [
      { k: 'gols', nome: 'Treino de finalização', desc: 'Na quadra do Zerão: faz dois gols (anda na bola pra chutar).', pontos: 4, monta: () => { const q = V.cid.zerao.quadras[0]; return [Object.assign({ x: q.x + q.w / 2, y: q.y + q.h / 2 }, { rotulo: 'a quadra do Zerão', gols: 2, perto: 140 })]; } },
      { k: 'peneira', nome: 'Peneira no Estádio', desc: 'Tem olheiro no Estádio do Café. Pique de uma linha de fundo à outra e volta pro meio-campo, no tempo.', pontos: 4, tempo: 90, monta: () => { const c = V.cid.estadio.campo, y = c.y + c.h / 2; return [[c.x + 40, 'a linha de fundo'], [c.x + c.w - 40, 'a outra linha de fundo'], [c.x + c.w / 2, 'o meio-campo']].map(([x, r]) => Object.assign(livre({ x, y }), { rotulo: r })); } },
      { k: 'embaixadinha', nome: 'Embaixadinha', desc: 'No meio do campo do Estádio: embaixadinha atrás de embaixadinha, sem deixar a bola cair.', pontos: 3, monta: () => { const c = V.cid.estadio.campo; return [Object.assign(livre({ x: c.x + c.w / 2, y: c.y + c.h / 2 + 40 }), { rotulo: 'o meio do campo', acao: 'Fazer embaixadinhas', dur: 6, efeito: 'suor' })]; } }
    ],
    ladrao: [
      { k: 'pipoca', nome: 'Mão leve', desc: 'Surrupia a pipoca do quiosque e some pro esconderijo antes que a polícia veja.', pontos: 3, tempo: 70, monta: () => { const v = sorteio(V.cid.vazios.length ? V.cid.vazios : [{ x: V.cid.praca.x, y: V.cid.praca.y }]); return [Object.assign(livre(quiosqueDe('PIPOCA') || truckDe('CHURROS')), { rotulo: 'o quiosque', acao: 'Surrupiar a pipoca', dur: 2, item: 'pipoca' }), Object.assign(livre({ x: v.x + LW / 2, y: v.y + LH - 60 }), { rotulo: 'o esconderijo' })]; } },
      { k: 'churros', nome: 'Churros sumido', desc: 'Some com um churros do truck do Zerão e se esconde no meio do Bosque dos Ipês.', pontos: 4, tempo: 110, monta: () => { const b = V.cid.bosque; return [Object.assign(livre(truckDe('CHURROS')), { rotulo: 'o truck do churros', acao: 'Surrupiar um churros', dur: 2, item: 'churros' }), Object.assign(livre({ x: b.cx + 40, y: b.cy + 60 }), { rotulo: 'o esconderijo no Bosque' })]; } },
      { k: 'despista', nome: 'Despistar a ronda', desc: 'A polícia tá na tua cola: passa pela Catedral, pelo Teatro e some no Lago antes do tempo acabar.', pontos: 3, tempo: 140, monta: () => [Object.assign(livre(portaCivica('catedral')), { rotulo: 'a Catedral' }), Object.assign(livre(portaCivica('teatro')), { rotulo: 'o Teatro' }), Object.assign(livre(lugarNome('Lago Igapó') || portaCivica('aquario')), { rotulo: 'o Lago' })] }
    ],
    detetive: [
      { k: 'pistas', nome: 'Pistas no Centro', desc: 'Três pistas brilhando perto dos museus e do teatro. Examina cada uma.', pontos: 4, monta: () => ['museu', 'arte', 'teatro'].map(k => Object.assign(livre({ x: V.cid.centro[k].x + 60 + Math.random() * 180, y: V.cid.centro[k].base + 30 }), { rotulo: NOME_C[k], acao: 'Examinar a pista', dur: 2, efeito: 'brilho' })) },
      { k: 'testemunha', nome: 'Ouvir a testemunha', desc: 'Uma testemunha te espera num banco do Calçadão. Chega perto e escuta a história toda, sem pressa.', pontos: 3, monta: () => { const bs = V.cid.bancos.filter(x => x.lugar === 'Calçadão'), b = sorteio(bs.length ? bs : V.cid.bancos.filter(x => x.lugar === 'Pracinha' || x.lugar === 'Lago Igapó')); return [Object.assign(livre({ x: b.x, y: b.y + 14 }), { rotulo: 'o banco da testemunha', acao: 'Ouvir a testemunha', dur: 6, npc: 'testemunha', fx: b.x, fy: b.y + 4 })]; } },
      { k: 'rastro', nome: 'Seguir o rastro', desc: 'Pegadas saindo da Feira do Corre. Segue até o Estádio e depois até a Gleba, examinando cada uma.', pontos: 4, monta: () => [['Feira do Corre', 'a pegada na Feira'], ['Estádio do Café', 'a pegada no Estádio'], ['Gleba Palhano', 'a pegada na Gleba']].map(([n, r]) => Object.assign(livre(lugarNome(n)), { rotulo: r, acao: 'Examinar a pegada', dur: 2, efeito: 'brilho' })) }
    ],
    cientista: [
      { k: 'amostra', nome: 'Amostra do lago', desc: 'Coleta uma amostra de água no píer e leva pro Aquário analisar.', pontos: 4, monta: () => { const b = sorteio(V.cid.bancos.filter(x => /^(Píer|Deck) do Igapó$/.test(x.lugar || ''))); return [Object.assign(livre({ x: b.x, y: b.y + 10 }), { rotulo: 'o píer', acao: 'Coletar a amostra', dur: 3, item: 'amostra' }), Object.assign(livre(portaCivica('aquario')), { rotulo: 'o Aquário', acao: 'Entregar no Aquário', dur: 1.5, tira: true })]; } },
      { k: 'ipe', nome: 'Florada do ipê', desc: 'Mede a florada do ipê gigante do Bosque dos Ipês e anota tudo no caderno.', pontos: 3, monta: () => { const b = V.cid.bosque; return [Object.assign(livre({ x: b.cx, y: b.cy + 48 }), { rotulo: 'o ipê gigante', acao: 'Medir a florada', dur: 5, efeito: 'brilho' })]; } },
      { k: 'clima', nome: 'Estação do tempo', desc: 'Lê os sensores do Zerão, do Estádio e do Calçadão antes que o vento mude.', pontos: 4, tempo: 170, monta: () => [['Zerão', 'o sensor do Zerão'], ['Estádio do Café', 'o sensor do Estádio'], ['Calçadão', 'o sensor do Calçadão']].map(([n, r]) => Object.assign(livre(lugarNome(n)), { rotulo: r, acao: 'Ler o sensor', dur: 2, efeito: 'brilho' })) }
    ],
    pirata: [
      { k: 'tesouro', nome: 'Tesouro enterrado', desc: 'O mapa diz que tem um baú na areia do Zerão. Cava.', pontos: 4, monta: () => { const a = V.cid.zerao.areia; return [Object.assign(livre({ x: a.x + 20 + Math.random() * (a.w - 40), y: a.y + 20 + Math.random() * (a.h - 30) }), { rotulo: 'a areia', acao: 'Cavar', dur: 4, efeito: 'brilho' })]; } },
      { k: 'bandeira', nome: 'Bandeira no píer', desc: 'Um barco atracou no Píer do Igapó. Sobe a bandeira pirata e toma o leme.', pontos: 3, monta: () => { const b = sorteio(V.cid.bancos.filter(x => /^(Píer|Deck) do Igapó$/.test(x.lugar || ''))); return [Object.assign(livre({ x: b.x, y: b.y + 10 }), { rotulo: 'o píer', acao: 'Hastear a bandeira', dur: 4, efeito: 'brilho' })]; } },
      { k: 'mapa', nome: 'O mapa rasgado', desc: 'O mapa do tesouro rasgou em três: um pedaço no Calçadão, um na Concha e o último no Bosque. Junta tudo.', pontos: 4, tempo: 180, monta: () => { const b = V.cid.bosque, cc = V.cid.centro.concha; return [Object.assign(livre(lugarNome('Calçadão')), { rotulo: 'o Calçadão', acao: 'Pegar o pedaço', dur: 1.5, efeito: 'brilho', item: 'pergaminho' }), Object.assign(livre({ x: cc.x + LW / 2, y: cc.base + 120 }), { rotulo: 'a Concha', acao: 'Pegar o pedaço', dur: 1.5, efeito: 'brilho' }), Object.assign(livre({ x: b.cx - 60, y: b.cy + 40 }), { rotulo: 'o Bosque', acao: 'Juntar o mapa', dur: 2, efeito: 'brilho', tira: true })]; } }
    ],
    astronauta: [
      { k: 'contagem', nome: 'Contagem regressiva', desc: 'Na Concha Acústica: dez segundos de contagem e decola.', pontos: 3, monta: () => [Object.assign(livre({ x: V.cid.centro.concha.x + LW / 2, y: V.cid.centro.concha.base + 120 }), { rotulo: 'a Concha', acao: 'Contagem regressiva', dur: 10, efeito: 'contagem' })] },
      { k: 'treino', nome: 'Treino de gravidade', desc: 'Na academia do Zerão: três séries nas barras, de traje e capacete.', pontos: 3, monta: () => { const z = V.cid.zerao; return [Object.assign(livre({ x: z.cx + 110, y: z.cy + 256 }), { rotulo: 'as barras do Zerão', acao: 'Fazer as séries', dur: 6, efeito: 'suor' })]; } },
      { k: 'estrelas', nome: 'Mapa das estrelas', desc: 'No pé da torre mais alta da Gleba Palhano, aponta o telescópio e mapeia o céu da cidade.', pontos: 4, monta: () => { const t = V.cid.glebaR.torres.reduce((a, b) => b.h > a.h ? b : a); return [Object.assign(livre({ x: t.x + t.w / 2, y: t.base + 20 }), { rotulo: 'a torre da Gleba', acao: 'Mapear as estrelas', dur: 7, efeito: 'brilho' })]; } }
    ],
    ninja: [
      { k: 'pergaminho', nome: 'O pergaminho', desc: 'Pega o pergaminho na Catedral e leva pro Museu de Arte sem demorar.', pontos: 4, tempo: 60, monta: () => [Object.assign(livre(portaCivica('catedral')), { rotulo: 'a Catedral', acao: 'Pegar o pergaminho', dur: 1, item: 'pergaminho' }), Object.assign(livre(portaCivica('arte')), { rotulo: 'o Museu de Arte', acao: 'Entregar', dur: 1, tira: true })] },
      { k: 'telhados', nome: 'Pelos telhados', desc: 'Teatro, Museu Histórico e Museu de Arte, um atrás do outro, sem ninguém ver. O relógio tá valendo.', pontos: 4, tempo: 90, monta: () => ['teatro', 'museu', 'arte'].map(k => Object.assign(livre(portaCivica(k)), { rotulo: NOME_C[k] })) },
      { k: 'meditar', nome: 'Meditação no lago', desc: 'No Deck do Igapó: dez segundos parado, olhando a água.', pontos: 3, monta: () => { const b = V.cid.bancos.find(x => x.lugar === 'Deck do Igapó') || sorteio(V.cid.bancos.filter(x => x.lugar === 'Lago Igapó')); return [Object.assign(livre({ x: b.x, y: b.y + 10 }), { rotulo: 'o deck', acao: 'Meditar', dur: 10, efeito: 'brilho' })]; } }
    ],
    super: [
      { k: 'patrulha', nome: 'Patrulha veloz', desc: 'Zerão, Bosque e Gleba, correndo. O relógio tá valendo.', pontos: 5, tempo: 110, monta: () => ['Zerão', 'Bosque dos Ipês', 'Gleba Palhano'].map(n => Object.assign(livre(lugarNome(n)), { rotulo: n })) },
      { k: 'resgate', nome: 'Resgate no lago', desc: 'Um barquinho perdeu o remo no meio do Igapó. Vai até o píer e puxa ele pra margem.', pontos: 4, monta: () => { const b = V.cid.bancos.find(x => x.lugar === 'Píer do Igapó') || sorteio(V.cid.bancos.filter(x => x.lugar === 'Lago Igapó')); return [Object.assign(livre({ x: b.x, y: b.y + 10 }), { rotulo: 'o píer', acao: 'Puxar o barco', dur: 4, efeito: 'suor' })]; } },
      { k: 'pipa', nome: 'Pipa no fio', desc: 'Uma pipa enroscou no fio de um poste do Centro. Voa até lá e solta ela.', pontos: 3, monta: () => { const c = V.cid.praca, ps = V.cid.postes.filter(q => Math.hypot(q.x - c.cx, q.y - c.cy) < 900), q = sorteio(ps.length ? ps : V.cid.postes); return [Object.assign(livre({ x: q.x, y: q.y + 16 }), { rotulo: 'o poste', acao: 'Soltar a pipa', dur: 3, efeito: 'brilho' })]; } }
    ],
    rei: [
      { k: 'fita', nome: 'Cortar a fita', desc: 'Inaugura um lote livre da cidade, com fita e tudo.', pontos: 3, monta: () => { const v = sorteio(V.cid.vazios.length ? V.cid.vazios : [{ x: V.cid.praca.x, y: V.cid.praca.y }]); return [Object.assign(livre({ x: v.x + LW / 2, y: v.y + LH - 60 }), { rotulo: 'o lote', acao: 'Cortar a fita', dur: 3, efeito: 'fita' })]; } },
      { k: 'discurso', nome: 'Discurso na Concha', desc: 'O povo tá esperando na Concha Acústica. Sobe no palco e fala bonito.', pontos: 3, monta: () => { const cc = V.cid.centro.concha; return [Object.assign(livre({ x: cc.x + LW / 2, y: cc.base + 24 }), { rotulo: 'o palco da Concha', acao: 'Fazer o discurso', dur: 8, efeito: 'brilho' })]; } },
      { k: 'visita', nome: 'Visita aos súditos', desc: 'Passa na Feira do Corre, no Lago e no Estádio, acenando pro povo.', pontos: 4, monta: () => [['Feira do Corre', 'a Feira'], ['Lago Igapó', 'o Lago'], ['Estádio do Café', 'o Estádio']].map(([n, r]) => Object.assign(livre(lugarNome(n) || lugarNome('Calçadão')), { rotulo: r, acao: 'Acenar pro povo', dur: 2, efeito: 'brilho' })) }
    ]
  };
  const RAIO_T = 46;
  const nomeUni = u => (SKINS.find(s => s[0] === u) || [])[1] || '';
  /* v3.39.1 · o rodízio: a tarefa que você pegou vai pro fim da fila do uniforme (fica guardado no aparelho), pra não cair
     sempre a mesma; quem nunca foi feita vem primeiro */
  const ULT_K = 'corre-trampo-ult';
  const ultimas = (() => { try{ const o = JSON.parse(localStorage.getItem(ULT_K) || '{}'); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; }catch(e){ return {}; } })();
  const ultDe = u => (Array.isArray(ultimas[u]) ? ultimas[u].filter(k => typeof k === 'string') : []);
  const marcaPegou = (u, k) => { ultimas[u] = ultDe(u).filter(x => x !== k).concat(k).slice(-8); try{ localStorage.setItem(ULT_K, JSON.stringify(ultimas)); }catch(e){} };
  const naOrdem = u => { const R = ultDe(u), pos = t => R.indexOf(t.k); return (TAREFAS[u] || []).slice().sort((a, b) => pos(a) - pos(b)); };
  /* veste na hora (a cidade já vê) e guarda no perfil por trás */
  function vesteLocal(u){
    const me = C.st.me; if(!me) return null;
    const verso = Object.assign({}, me.verso && typeof me.verso === 'object' ? me.verso : {}, { skin: u, personagem: '' });
    if(V.eu){ V.eu.av = avLimpo(verso, me.id); anunciar(); }
    return verso;
  }
  function pegaTarefa(u, k){
    if(!V.vivo || !V.eu) return false;
    const def = (TAREFAS[u] || []).find(t => t.k === k); if(!def) return false;
    /* v3.39.1: pegou tarefa de outro uniforme (ou tava de roupa normal)? o boneco troca sozinho */
    let vestiu = false;
    if(meuUniforme() !== u){
      const verso = vesteLocal(u); if(!verso) return false; vestiu = true;
      C.saveMe({ verso }).then(() => { if(V.eu && meuUniforme() === u){ V.eu.av = avLimpo(C.st.me.verso, C.st.me.id); anunciar(); } }).catch(e => C.toast(C.errMsg(e, 'Não deu pra guardar o uniforme no perfil.')));
    }
    if(V.tarefa) largaTarefa(true);
    let etapas; try{ etapas = def.monta().filter(Boolean); }catch(e){ etapas = null; }
    if(!etapas || !etapas.length){ C.toast('Essa tarefa não deu pra montar agora. Tenta outra.'); return false; }
    /* v3.58: o minijogo de cada etapa e a entrega que pode mudar de endereço no caminho */
    const MJ = MJ_JOGOS[u + ':' + k]; if(MJ) etapas.forEach((e, i) => { if(MJ[i]) e.jogo = Object.assign({}, MJ[i]); });
    if(u === 'motoboy' && (k === 'entrega' || k === 'acai') && Math.random() < .55) etapas[etapas.length - 1].troca = k;
    V.tarefa = { u, k, def, etapas, i: 0, fase: 'ir', desde: Date.now(), ate: def.tempo ? Date.now() + def.tempo * 1000 : 0, gols0: V.gols || 0 };
    marcaPegou(u, k);
    /* v3.38: o banco marca o começo (é ele que paga o correal no fim, conferindo o tempo). Tarefa que o banco ainda não
       conhece (o delta novo não rodou) vale patente, mas não paga: avisa uma vez */
    const T0 = V.tarefa; C.api.rpc('corre_tarefa_comeca', { p_u: u, p_k: k }).then(id => { if(id) T0.vez = id; }).catch(e => { if(e && (e.hint === 'tarefa' || e.message === 'tarefa')){ T0.semCorreal = true; C.toast('Essa tarefa é nova: conta pra patente, mas ainda não paga correal.', 4200); } });
    etapas.forEach(e => { if(e.npc) montaNpc(e); });
    C.closeSheet(); tarefaUI(); portaUI();
    C.toast(`${vestiu ? `Vestiu ${nomeUni(u).toLowerCase()}. ` : ''}${def.nome}: vai até ${etapas[0].rotulo}. Segue a seta rosa.`, 3400);
    return true;
  }
  function largaTarefa(quieto){
    const T = V.tarefa; if(!T) return;
    T.etapas.forEach(e => { if(e.sid) tiraNpc(e.sid); });
    if(T.mj && T.mj.P) T.mj.P.forEach(p => { if(p.sid) tiraNpc(p.sid); });
    V.tarefa = null; V.portaT = null; if(V.eu && V.eu.item && V.eu.item.tarefa) V.eu.item = null;
    tarefaUI(); portaUI(); mjUI(true); if(!quieto) C.toast('Largou a tarefa.');
  }
  /* os figurantes das tarefas (o ladrão que foge, quem passou mal): bonecos locais, só na tua tela */
  const pele6 = () => Math.floor(Math.random() * 6);
  const NPCS = {
    ladrao: { nome: 'Ladrão', av: () => ({ pele: pele6(), cabelo: 'raspado', skin: 'ladrao' }), foge: true, depois: 'ih, me pegou' },
    paciente: { nome: 'Dona Cida', av: () => ({ pele: pele6(), cabelo: 'coque', roupa: 'camiseta', corRoupa: 5 }), fala: 'ai ai…', depois: 'valeu, doutor!' },
    testemunha: { nome: 'Seu Zé', av: () => ({ pele: pele6(), cabelo: 'curto', barba: 'barba', oculos: 'grau', topo: 'bone', roupa: 'jaqueta', corRoupa: 2 }), fala: 'eu vi tudo…', depois: 'foi isso, detetive!' }
  };
  function montaNpc(e){
    const sid = 'npc-' + Math.random().toString(36).slice(2, 8), N = NPCS[e.npc] || NPCS.paciente, ladrao = !!N.foge;
    const av = avLimpo(N.av(), sid);
    const b = { sid, bot: true, npc: true, nome: N.nome, av, x: ladrao ? e.x : (e.fx || e.x), y: ladrao ? e.y : (e.fy || e.y), dir: 'baixo', passo: 0, mov: false, sit: !ladrao, foge: ladrao, fala: ladrao ? null : { t: N.fala, ate: Date.now() + 9e9 } };
    V.remotos.set(sid, b); e.sid = sid;
  }
  function tiraNpc(sid){ V.remotos.delete(sid); }
  function passoNpcs(dt){
    const T = V.tarefa, e = V.eu; if(!e) return;
    for(const r of V.remotos.values()){
      if(!r.npc) continue;
      if(r.foge){
        /* o ladrão foge de você, com uns picos de velocidade; perto de parede, muda de ideia */
        const dx = r.x - e.x, dy = r.y - e.y, d = Math.hypot(dx, dy) || 1;
        if(d < 260){ r.ang = Math.atan2(dy, dx) + Math.sin(Date.now() / 700) * .7; } else if(!r.ang || Math.random() < dt * .6) r.ang = Math.random() * Math.PI * 2;
        const v = (d < 120 ? 150 : 95) * dt, ox = r.x, oy = r.y; mover(r, Math.cos(r.ang) * v, Math.sin(r.ang) * v);
        if(Math.hypot(r.x - ox, r.y - oy) < v * .3) r.ang += Math.PI / 2 + Math.random();
        r.mov = true; r.passo += dt * 10; r.dir = Math.abs(Math.cos(r.ang)) > Math.abs(Math.sin(r.ang)) ? (Math.cos(r.ang) < 0 ? 'esq' : 'dir') : (Math.sin(r.ang) < 0 ? 'cima' : 'baixo');
        if(T){ const et = T.etapas[T.i]; if(et && et.sid === r.sid){ et.x = r.x; et.y = r.y; } }
      } else if(r.vai){
        const dx = r.vai.x - r.x, dy = r.vai.y - r.y, d = Math.hypot(dx, dy);
        if(d < 6 || Date.now() > r.vai.ate){ tiraNpc(r.sid); continue; }
        mover(r, dx / d * 80 * dt, dy / d * 80 * dt); r.mov = true; r.passo += dt * 9; r.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'esq' : 'dir') : (dy < 0 ? 'cima' : 'baixo');
      }
    }
  }
  /* ---------- v3.76 · a pista de skate do Zerão ----------
     Concreto com junta, o bowl, a rampa (quarter), o caixote com rampa dos dois lados, o corrimão e a borda, tudo baixo:
     o skate passa por cima e ninguém bate em nada. Dentro da pista todo mundo anda de skate (até quem tá a pé ou de
     carro: é pela posição, então os outros veem igual, sem nada novo na rede).
     O jogo: espaço (ou o Pular do celular) é ollie; a rampa, as rampas do caixote e a beira do bowl jogam pro alto
     sozinhas. No ar, apertar de novo é a manobra: cedo (até 35% do pulo) sai kickflip, heelflip, shove-it, 180 ou indy;
     no meio (35% a 60%) sai tre flip ou 540; depois disso é tarde e você cai. Andando ao longo do corrimão ou da borda,
     grind. Manobra emendada em menos de 2,6 s sobe o combo (até x8); cair zera. A sessão acaba quando sai da pista,
     e o recorde do dia e da vida ficam no aparelho. O nome da manobra aparece em cima de você pra quem tá perto. */
  const naPistaSkate = (x, y) => { const z = V.cid && V.cid.zerao, s = z && z.skate; if(!s || x < s.x0 || x > s.x1 || y < s.y0 || y > s.y1) return false; const dx = (x - z.cx) / s.erx, dy = (y - z.cy) / s.ery; return dx * dx + dy * dy < 1; };
  const MANOBRAS = { ollie: ['ollie!', 50], kickflip: ['kickflip!', 100], heelflip: ['heelflip!', 100], shove: ['shove-it!', 80], tre: ['tre flip!', 250], air: ['air!', 150], f180: ['frontside 180!', 200], indy: ['indy grab!', 300], d540: ['540 do zerão!', 600], grind: ['50-50 grind!', 0], caiu: ['caiu!', 0] };
  const SK_K = 'corre-skate';
  const ptsTxt = n => Math.round(n).toLocaleString('pt-BR');
  /* o oval em blocos de 6 (o do Zerão é de 12: no bowl ficava quadrado demais) */
  function ovalFino(ctx, cx, cy, rx, ry, cor){ const B = 6; ctx.fillStyle = cor; for(let x = Math.floor((cx - rx) / B) * B; x < cx + rx; x += B){ const dx = (x + B / 2 - cx) / rx; if(Math.abs(dx) >= 1) continue; const h = ry * Math.sqrt(1 - dx * dx), t = Math.round((cy - h) / 2) * 2, b = Math.round((cy + h) / 2) * 2; if(b > t) ctx.fillRect(x, t, B, b - t); } }
  function pistaSkate(ctx, z){
    const s = z.skate; if(!s) return; const B = 12, u = 1 / V.k;
    /* o concreto vai até a beira do oval (em blocos, como o resto do Zerão), com junta e o meio-fio escuro na beirada */
    const borda = x => { const f = (x + B / 2 - z.cx) / s.erx; if(Math.abs(f) >= 1) return s.y0; return Math.min(s.y1, Math.round((z.cy + s.ery * Math.sqrt(1 - f * f)) / B) * B); };
    ctx.fillStyle = pad(ctx, 'concreto'); for(let x = s.x0; x < s.x1; x += B){ const yb = borda(x); if(yb > s.y0) ctx.fillRect(x, s.y0, B, yb - s.y0); }
    ctx.fillStyle = 'rgba(15,18,24,.12)'; for(let x = s.x0; x < s.x1; x += B){ const yb = borda(x); if(yb <= s.y0) continue; if((x - s.x0) % 48 === 0) ctx.fillRect(x, s.y0, u, yb - s.y0); for(let y = s.y0 + 48; y < yb; y += 48) ctx.fillRect(x, y, B, u); }
    ctx.fillStyle = 'rgba(15,18,24,.3)'; for(let x = s.x0; x < s.x1; x += B){ const yb = borda(x); if(yb > s.y0) ctx.fillRect(x, yb - 3, B, 3); }
    /* o bowl: a beira clara, a parede e o fundo mais escuros, a luz na parede de cima e o ralo */
    const b = s.bowl;
    ovalFino(ctx, b.x, b.y, b.rx + 4, b.ry + 3, '#D6D9DE'); ovalFino(ctx, b.x, b.y, b.rx, b.ry, '#8A9098'); ovalFino(ctx, b.x, b.y, b.rx - 9, b.ry - 7, '#777D85'); ovalFino(ctx, b.x, b.y, b.rx - 20, b.ry - 15, '#676D75');
    ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(b.x - b.rx + 12, b.y - b.ry + 2, b.rx * 2 - 24, 4);
    ctx.fillStyle = '#2B2F38'; ctx.fillRect(b.x - 3, b.y - 2, 6, 4);
    /* a rampa: a parede sobe clareando até a cantoneira de ferro e o deck em cima */
    const q = s.quarter, H = q.y1 - q.y0;
    [['#A4A9B0', 0], ['#B0B5BC', .22], ['#BCC1C7', .44], ['#C9CDD3', .62]].forEach(([c, f]) => { ctx.fillStyle = c; ctx.fillRect(q.x0, q.y0 + H * f, q.x1 - q.x0, H * .24 + 1); });
    ctx.fillStyle = '#E6E9EE'; ctx.fillRect(q.x0, q.y1 - 9, q.x1 - q.x0, 2 * u + 1); ctx.fillStyle = '#2B2F38'; ctx.fillRect(q.x0, q.y1 - 7, q.x1 - q.x0, u + .5);
    ctx.fillStyle = pad(ctx, 'escuro'); ctx.fillRect(q.x0, q.y1 - 6, q.x1 - q.x0, 6);
    /* o caixote: rampa dos dois lados, o tampo com cantoneira, a frente e a pichação */
    const f = s.caixote, x0 = f.x - f.w / 2, y0 = f.y - f.h / 2;
    ctx.fillStyle = '#B2B7BE'; ctx.fillRect(x0 - f.r, y0, f.r / 2, f.h); ctx.fillRect(x0 + f.w + f.r / 2, y0, f.r / 2, f.h);
    ctx.fillStyle = '#C4C8CE'; ctx.fillRect(x0 - f.r / 2, y0, f.r / 2, f.h); ctx.fillRect(x0 + f.w, y0, f.r / 2, f.h);
    ctx.fillStyle = '#D3D6DB'; ctx.fillRect(x0, y0, f.w, f.h - 7); ctx.fillStyle = '#7D838B'; ctx.fillRect(x0, y0 + f.h - 7, f.w, 7);
    ctx.fillStyle = '#EEF0F3'; ctx.fillRect(x0, y0, f.w, 2 * u + 1);
    pixTxt(ctx, 'CORRE', f.x, y0 + f.h - 3.5, 1, ROSA, 'c');
    /* o corrimão (três pés e o cano) e a borda (o banco de concreto baixo com a quina de ferro) */
    s.trilhos.forEach(t => {
      ctx.fillStyle = 'rgba(15,18,24,.25)'; ctx.fillRect(t.x0 + 2, t.y + 1, t.x1 - t.x0, 4);
      if(t.tipo === 'corrimao'){ ctx.fillStyle = '#2B2F38'; [t.x0 + 3, (t.x0 + t.x1) / 2, t.x1 - 5].forEach(x => ctx.fillRect(x, t.y - 8, 2 * u + 1, 9)); ctx.fillStyle = '#D6D9DE'; ctx.fillRect(t.x0, t.y - 10, t.x1 - t.x0, 3 * u + 1); ctx.fillStyle = '#8E949C'; ctx.fillRect(t.x0, t.y - 10 + 3 * u + 1, t.x1 - t.x0, u); }
      else { ctx.fillStyle = '#9AA0A8'; ctx.fillRect(t.x0, t.y - 9, t.x1 - t.x0, 10); ctx.fillStyle = '#C9CED6'; ctx.fillRect(t.x0, t.y - 9, t.x1 - t.x0, 3); ctx.fillStyle = '#EEF0F3'; ctx.fillRect(t.x0, t.y - 9, t.x1 - t.x0, u + .5); }
    });
  }
  function faiscas(ctx, x, y, t){ const u = Math.max(1, 1.05 / V.k), K = [AMARELO, LARANJA, PAPEL]; for(let i = 0; i < 7; i++){ const a = t * 23 + i * 1.9, r = 3 + (i * 7 + Math.floor(t * 40)) % 9; ctx.fillStyle = K[i % 3]; ctx.fillRect(Math.round(x - 8 + Math.cos(a) * r) - u, Math.round(y - 1 - Math.abs(Math.sin(a)) * r * .6), 2 * u, 2 * u); } }
  function skRec(){ try{ const o = JSON.parse(localStorage.getItem(SK_K) || 'null'); return o && typeof o === 'object' ? o : {}; }catch(e){ return {}; } }
  const skHoje = () => { const o = skRec(); return o.dia === diaBR() ? Number(o.pts) || 0 : 0; };
  const falaSkate = k => { const i = FALAS_AUTO.indexOf(MANOBRAS[k][0]); if(i >= 0) falaAuto(i); };
  /* o pulo da pista: ollie (no chão) ou rampa (a rampa, o caixote, a beira do bowl), cada um com duração e altura */
  function skSalta(tipo, dur, alt){
    const e = V.eu, S = V.sk, agora = performance.now(); if(!e || !S) return;
    e.puT = agora; e.puMs = dur; e.puH = alt; e.puN = ((e.puN || 0) % 999) + 1; enviaPos(true);
    S.ar = { tipo, t0: agora, dur, extra: 0, bail: false };
    if(C.versoSom) C.versoSom.pulo('skate');
  }
  /* apertou no ar: cedo é manobra, no meio é manobra grande, tarde é queda */
  function skManobra(){
    const A = V.sk && V.sk.ar; if(!A || A.extra || A.bail) return;
    const f = (performance.now() - A.t0) / A.dur;
    if(f < .35) A.extra = 1; else if(f < .6) A.extra = 2; else A.bail = true;
    if(C.versoSom && !A.bail) C.versoSom.passo('madeira', .7);
  }
  function skPontua(k, base){
    const S = V.sk, agora = performance.now();
    S.mult = agora - (S.ultimo || 0) < 2600 ? Math.min(8, S.mult + 1) : 1; S.ultimo = agora;
    const p = Math.round(base * S.mult); S.pts += p; S.ult = { k, p, mult: S.mult, ate: agora + 1600 };
    falaSkate(k); skUI(true);
  }
  function skAterrissa(){
    const S = V.sk, A = S.ar, e = V.eu; S.ar = null; S.pousou = performance.now(); e.puMs = 0; e.puH = 0;
    if(A.bail){ S.mult = 1; S.ultimo = 0; S.ult = { k: 'caiu', p: 0, mult: 1, ate: performance.now() + 1600 }; falaSkate('caiu'); if(C.versoSom){ C.versoSom.erro(); C.versoSom.cai(1); } skUI(true); return; }
    const k = A.tipo === 'ollie' ? (A.extra === 2 ? 'tre' : A.extra === 1 ? sorteio(['kickflip', 'heelflip', 'shove']) : 'ollie') : (A.extra === 2 ? 'd540' : A.extra === 1 ? sorteio(['f180', 'indy']) : 'air');
    if(C.versoSom) C.versoSom.cai(.55);
    skPontua(k, MANOBRAS[k][1]);
  }
  function skFim(){
    const S = V.sk; S.on = false; S.ar = null; S.grind = null; if(V.eu){ V.eu.puMs = 0; V.eu.puH = 0; }
    if(!(S.pts > 0)) return;
    const o = skRec(), hoje = diaBR(); if(o.dia !== hoje){ o.dia = hoje; o.pts = 0; }
    const dia = S.pts > o.pts, vida = S.pts > (o.max || 0); if(dia) o.pts = S.pts; if(vida) o.max = S.pts;
    try{ localStorage.setItem(SK_K, JSON.stringify(o)); }catch(e){}
    C.toast(`Sessão de skate: ${ptsTxt(S.pts)} pontos.${vida ? ' O teu recorde de todos os tempos!' : dia ? ' O teu recorde de hoje!' : ''}`, 3600);
  }
  function skatePasso(dt){
    const e = V.eu; if(!e) return;
    const S = V.sk || (V.sk = { on: false }), agora = performance.now();
    if(S.px != null && dt > 0){ const vx = (e.x - S.px) / dt, vy = (e.y - S.py) / dt; S.vx = S.vx == null ? vx : S.vx * .6 + vx * .4; S.vy = S.vy == null ? vy : S.vy * .6 + vy * .4; }
    S.px = e.x; S.py = e.y;
    const dentro = !e.barco && !V.voo && !e.sit && naPistaSkate(e.x, e.y);
    if(!dentro){ if(S.on) skFim(); skUI(); return; }
    if(!S.on){ Object.assign(S, { on: true, pts: 0, mult: 1, ultimo: 0, ar: null, grind: null, ult: null, noBowl: false, pousou: 0 });
      let ja = '1'; try{ ja = localStorage.getItem(SK_K + '-dica'); if(!ja) localStorage.setItem(SK_K + '-dica', '1'); }catch(err){}
      if(!ja) C.toast('Pista de skate! Espaço pula (no celular, o Pular); no ar, aperta de novo pra manobra. Tarde demais, cai. As rampas te jogam pro alto.', 6000); }
    const s = V.cid.zerao.skate, v = Math.hypot(S.vx || 0, S.vy || 0);
    if(S.ar){ if(agora >= S.ar.t0 + S.ar.dur) skAterrissa(); skUI(); return; }
    /* a rampa (descendo pra ela), as rampas do caixote (de lado, indo pro caixote) e a beira do bowl (saindo dele) */
    const q = s.quarter, f = s.caixote, b = s.bowl, noBowl = ((e.x - b.x) / b.rx) ** 2 + ((e.y - b.y) / b.ry) ** 2 < 1;
    let lanca = null;
    if(v > 100 && S.vy > 70 && e.x > q.x0 && e.x < q.x1 && e.y > q.y0 && e.y < q.y1 - 4) lanca = 'quarter';
    else if(v > 100 && Math.abs(e.y - f.y) < f.h / 2 + 3 && ((S.vx > 80 && e.x > f.x - f.w / 2 - f.r && e.x < f.x - f.w / 2 + 2) || (S.vx < -80 && e.x < f.x + f.w / 2 + f.r && e.x > f.x + f.w / 2 - 2))) lanca = 'caixote';
    else if(S.noBowl && !noBowl && v > 110) lanca = 'bowl';
    S.noBowl = noBowl;
    if(lanca && agora - (S.pousou || 0) > 300){ if(S.grind) S.grind = null; skSalta('rampa', lanca === 'caixote' ? 720 : 880, lanca === 'caixote' ? 2.1 : 2.7); skUI(); return; }
    /* o corrimão e a borda: andando ao longo deles, grind (faísca e o barulho do ferro) */
    const t = v > 100 && Math.abs(S.vx) > Math.abs(S.vy) * 2 ? s.trilhos.find(r => e.x > r.x0 && e.x < r.x1 && Math.abs(e.y - r.y) < 8) : null;
    if(t){ if(!S.grind) S.grind = { t0: agora }; if(agora - (S.chT || 0) > 75){ S.chT = agora; if(C.versoSom && C.versoSom.grind) C.versoSom.grind(); } }
    else if(S.grind){ const g = S.grind; S.grind = null; if(agora - g.t0 > 140) skPontua('grind', Math.max(60, Math.round((agora - g.t0) / 1000 * 300))); }
    skUI();
  }
  /* o placar da sessão, em cima do botão amarelo (as peças do minijogo das tarefas) */
  function skUI(forca){
    const el = C.$('cvr-sk'); if(!el) return;
    const S = V.sk; if(!S || !S.on){ if(!el.hidden){ el.hidden = true; el.dataset.k = ''; el.innerHTML = ''; } return; }
    const agora = performance.now(), ult = S.ult && S.ult.ate > agora ? S.ult : null, rec = Math.max(skHoje(), S.pts);
    const linha = ult ? (ult.k === 'caiu' ? 'CAIU! O combo zerou.' : `${MANOBRAS[ult.k][0].replace('!', '').toUpperCase()} +${ptsTxt(ult.p)}${ult.mult > 1 ? ' · combo x' + ult.mult : ''}`) : S.grind ? 'GRIND…' : 'Espaço pula; no ar, aperta de novo pra manobra.';
    const k = [ptsTxt(S.pts), linha, rec].join('|'); if(!forca && el.dataset.k === k) return;
    el.dataset.k = k; el.hidden = false;
    el.innerHTML = `<div class="mj-h"><b>Pista de skate</b><span>${ptsTxt(S.pts)}</span></div><small>${esc(linha)} · recorde de hoje ${ptsTxt(rec)}</small>`;
    el.classList.toggle('caiu', !!(ult && ult.k === 'caiu'));
  }
  /* ---------- v3.76 · os moradores: gente da cidade que anda, senta e, quando para, troca ideia ----------
     São do aparelho de cada um (como o trânsito): cada morador tem um canto da cidade, anda por ali, senta nos bancos e
     tem o seu jeito de falar. Você parou perto, ele puxa assunto; o botão amarelo pede mais uma ("Trocar ideia com...").
     Quando dois se cruzam, às vezes param e conversam entre eles. Fala comprida vai num balão de até 4 linhas.
     A letra da cidade não tem aspas, parênteses nem porcentagem: as frases ficam sem eles. */
  const MORADORES = [
    { nome: 'Seu Nenê', onde: 'Feira do Corre', voz: 150, av: { pele: 3, cabelo: 'raspado', corCabelo: 4, barba: 'barba', skin: 'chef' },
      frases: ['Pastel de vento não tem aqui. Aqui o vento é de graça.', 'Caldo de cana com limão cura tudo. Menos boleto.', 'Pastel de queijo, de carne e de queijo com mais queijo.', 'Na feira é freguês. No Insta é seguidor. A fome é a mesma.', 'Trinta anos de feira e ainda não sei fechar pastel calado.'] },
    { nome: 'Dona Cida', onde: 'Calçadão', voz: 330, av: { pele: 1, cabelo: 'coque', corCabelo: 4, oculos: 'grau', roupa: 'moletom', corRoupa: 5, corCalca: 3 },
      frases: ['No meu tempo o Calçadão era chique. Continua, eu que fiquei mais.', 'Fiquei sabendo de tudo. Não contei nada. Ainda.', 'Meu neto falou que eu viralizei. Fui no posto ver se tem vacina.', 'Tá comendo direito, criatura? Tá com cara de quem vive de café.', 'Fofoca não, minha filha. É jornalismo de calçada.'] },
    { nome: 'Kauê', onde: 'Pista de skate', voz: 240, av: { pele: 4, cabelo: 'cacheado', corCabelo: 0, topo: 'bonetras', roupa: 'regata', corRoupa: 1, perna: 'bermuda', corCalca: 1, tenis: 1, skate: true },
      frases: ['Caí três vezes hoje. Uma foi de propósito, pra filmar.', 'Shape novo, joelho velho.', 'No Zerão o vento empurra. Eu digo que foi manobra.', 'Minha mãe acha que skate é fase. Tô na fase faz doze anos.'] },
    { nome: 'Tia Neide', onde: 'Gleba Palhano', voz: 290, av: { pele: 5, cabelo: 'black', corCabelo: 0, roupa: 'camiseta', corRoupa: 2, estampa: 'estrela', corCalca: 4 },
      frases: ['Bolo de pote de ninho com morango. Aceito pix e elogio.', 'Já vendi bolo pro prédio inteiro. O porteiro virou meu gerente.', 'A dieta começa segunda. Faz quinze anos que é segunda.', 'Bolo no pote é bolo que não aceita bagunça.'] },
    /* v3.85: era o Seu Massao; o Thales pediu o Seu Pedro no lugar */
    { nome: 'Seu Pedro', onde: 'Porto do Tibagi', voz: 160, av: { pele: 0, cabelo: 'curto', corCabelo: 4, topo: 'bone', roupa: 'jaqueta', corRoupa: 3, corCalca: 3 },
      frases: ['Piapara grande gosta de corredeira. Joga perto das pedras.', 'A melhor isca é paciência. A segunda é massa de pão.', 'Quem puxa na beliscada volta com história, não com peixe.', 'No Tibagi o peixe te observa. Fala baixo.', 'Pescador não mente. Só arredonda o peso pra cima.', 'A mais pesada desse rio deu 4,850 na balança. Eu vi. Quase.'] },
    { nome: 'Lari', onde: 'Museu de Arte', voz: 300, av: { pele: 2, cabelo: 'longo', corCabelo: 5, oculos: 'grau', roupa: 'moletom', corRoupa: 0, corCalca: 0, tenis: 2 },
      frases: ['Fiz o logo em cinco minutos. Levei dez anos pra fazer em cinco.', 'Cliente pediu pra deixar mais clean. Tirei ele do projeto.', 'Minha paleta não tem verde. Questão de princípio.', 'Cobrei por hora, achou caro. Cobrei por projeto, achou demorado.', 'Aumenta o logo? Aumento. O preço junto.'] },
    { nome: 'Juninho Coach', onde: 'Calçadão', voz: 210, av: { pele: 1, cabelo: 'moicano', corCabelo: 3, oculos: 'escuro', roupa: 'jaqueta', corRoupa: 6, corrente: 'ouro', corCalca: 0, tenis: 0 },
      frases: ['Acordo cinco da manhã, banho gelado, sete dígitos. Os dígitos são da senha do wi-fi.', 'Não existe crise. Existe você sem a minha mentoria.', 'Tô vendendo curso de como vender curso.', 'Mindset de tubarão. Conta de sardinha.'] },
    { nome: 'Valdir do Dogão', onde: 'Autódromo do Café', voz: 140, av: { pele: 2, cabelo: 'curto', corCabelo: 1, barba: 'cavanhaque', topo: 'bone', roupa: 'camiseta', corRoupa: 7, corCalca: 2 },
      frases: ['Aqui é salsicha, sem frescura. Vina é lá em Curitiba.', 'Purê, batata palha, milho, ervilha e fé.', 'Dogão duplo pra quem perdeu o ônibus e a paciência.', 'Curitibano pede vina, eu entrego salsicha e ele nem percebe.', 'Dia de jogo eu vendo o dobro. Dia de derrota, o triplo.'] },
    { nome: 'Seu Bené', onde: 'Catedral', voz: 130, av: { pele: 3, cabelo: 'raspado', corCabelo: 4, barba: 'barba', roupa: 'camiseta', corRoupa: 3, corCalca: 2, tenis: 1 },
      frases: ['Saí de casa às sete e cheguei às sete. Da noite.', 'Rotatória em Londrina é labirinto: todo mundo entra, ninguém sai.', 'Buzinei pra capivara. Ela nem olhou. Respeito.', 'Trinta anos de volante e o GPS ainda quer me ensinar.'] },
    { nome: 'Brenda', onde: 'Lago Igapó', voz: 340, av: { pele: 2, cabelo: 'longo', corCabelo: 3, oculos: 'escuro', roupa: 'camiseta', corRoupa: 2, perna: 'bermuda', corCalca: 4, tenis: 2 },
      frases: ['Olha essa luz no Igapó. Sem filtro. Mentira, são três.', 'Ganhei um copo de uma marca. Agradeci em quatro stories.', 'Tô de detox digital. Posto tudo amanhã.', 'Meu engajamento caiu. Acho que foi Mercúrio. Ou o almoço.'] },
    /* o professor só conta coisa que é verdade */
    { nome: 'Prof. Ataíde', onde: 'Bosque dos Ipês', voz: 175, av: { pele: 4, cabelo: 'curto', corCabelo: 4, barba: 'barba', oculos: 'grau', roupa: 'jaqueta', corRoupa: 7, corCalca: 3 },
      frases: ['Londrina quer dizer pequena Londres. Quem fundou foi uma companhia inglesa.', 'Terra roxa é vermelha. Os italianos diziam terra rossa, e rossa virou roxa.', 'O Igapó é lago feito: represaram o ribeirão Cambé no fim dos anos 50.', 'Capivara é o maior roedor do mundo. E o mais calmo do Igapó.', 'O ipê floresce sem folha. Primeiro a festa, depois a roupa.'] },
    { nome: 'Gabi', onde: 'Zerão', voz: 310, av: { pele: 4, cabelo: 'trancas', corCabelo: 0, topo: 'fone', roupa: 'regata', corRoupa: 4, perna: 'bermuda', corCalca: 0, tenis: 3 },
      frases: ['Três voltas no Zerão: duas correndo, uma procurando o fone.', 'Meu relógio disse que eu dormi mal. Concordei com ele.', 'Corro pra pagar os pecados do pastel de domingo.'] },
    { nome: 'Tonhão do Som', onde: 'Concha Acústica', voz: 120, av: { pele: 5, cabelo: 'black', corCabelo: 0, topo: 'fone', roupa: 'regata', corRoupa: 0, corrente: 'ouro', corCalca: 0, tenis: 3 },
      frases: ['Meio-dia e meia e oito da noite tem som aqui. Chega cedo.', 'Esse som aqui toca até pensamento.', 'A cidade tocou Bach hoje. Eu dancei arrocha mesmo.', 'Grave bom é o que faz a pipoca pular do saco.'] },
    /* v3.82: a bióloga do Arthur Thomas. Os fatos são do guia "Descobrindo o Parque" da Prefeitura (2026); as piadas são piada */
    { nome: 'Bióloga Iara', onde: 'Parque Arthur Thomas', voz: 280, av: { pele: 3, cabelo: 'trancas', corCabelo: 0, topo: 'bone', roupa: 'camiseta', corRoupa: 3, corCalca: 3, tenis: 1 },
      frases: ['O parque nasceu em 1975, numa doação da Companhia de Terras Norte do Paraná. Abriu em 1987.', 'Aqui funcionou a primeira usina de Londrina, a Usina Cambé, de 1939.', 'O Salto Beija-Flor tem uns 20 metros. A pedra é basalto, a mesma que vira a terra roxa.',
        'São 85 hectares de Mata Atlântica a seis quilômetros do Centro.', 'Não dá comida pros macacos, viu? Eles aprendem a pedir. E depois a pegar.', 'Macaco-prego quebra coquinho com pedra. Pra abrir tua sacola, só a cara de pau.', 'A jaula tá vazia: os macacos daqui são livres. Quem entra nela é gente.',
        'As ilhinhas do lago são assoreamento: terra e lixo que a chuva arrasta pra dentro.', 'Arthur Thomas era escocês, de Edimburgo. Nasceu em 1889.', 'Na Trilha do Tatu tem peroba-rosa centenária. Tatu mesmo eu nunca vi.'] },
    { nome: 'Rafa do Pix', onde: 'Sebo', voz: 230, av: { pele: 3, cabelo: 'curto', corCabelo: 0, skin: 'motoboy' },
      frases: ['Aceito pix, débito, crédito e elogio. Elogio não volta troco.', 'Tô devendo pra mim mesmo. Já negociei os juros.', 'Entrego em quinze minutos. Ou em quinze minutos e meia hora.'] }
  ];
  /* as que qualquer morador pode soltar (entram de vez em quando no meio das dele) */
  const FRASES_TODOS = ['Tô no corre desde as seis. Do sofá pro celular, mas é corre.', 'Cliente pediu pra ontem. Entreguei anteontem que vem.', 'Meu chefe é exigente. Sou eu.', 'Mandei orçamento faz três dias. Visualizou e foi ver o mar.',
    'O algoritmo me ama. Só esqueceu de avisar.', 'Café é meu sócio majoritário.', 'Calorão em Londrina: até a sombra procura sombra.', 'Choveu terra vermelha no meu tênis branco. De novo.',
    'Freela bom é o que paga. O resto é portfólio.', 'Já seguiu o @consanans? Foi ele que fez a cidade.'];
  /* quando dois moradores se cruzam: um fala, o outro responde (e às vezes o primeiro fecha) */
  const PAPOS = [
    ['Viu a piapara do Seu Pedro?', 'Vi a foto. Tava de lado pra parecer maior.'],
    ['Bora no Zerão amanhã cedo?', 'Cedo que horas? Antes do meio-dia é madrugada.'],
    ['Calor, né?', 'Calor? Eu tô é assando.'],
    ['Fechei um freela de logo.', 'Pagou?', 'Pagou em exposição.'],
    ['Me empresta um correal?', 'Correal não é dinheiro, mano.', 'Então me empresta dinheiro.'],
    ['Dizem que tem rio novo na cidade.', 'O rio é velho. A gente que descobriu agora.'],
    ['Cadê o busão?', 'Passou.', 'Quando?', 'Ano passado.'],
    ['Vamos de pastel?', 'Pastel é refeição completa: massa, recheio e ar.'],
    ['A capivara tá me olhando.', 'Ela olha todo mundo. É fiscal do Igapó.'],
    ['Postou hoje?', 'Postei ontem. Hoje eu tô vendo quem curtiu.'],
    ['Viu o kart dos bichos?', 'Vi. Perdi pra uma capivara de patinete.'],
    ['Fui no Arthur Thomas.', 'E os macacos?', 'Levaram meu pastel e meu orgulho.']
  ];
  /* v3.87 · o que se fala no Natal (entra no meio das frases de sempre, de 15/10 até o Dia de Reis) */
  const FRASES_NATAL = ['Já viu o Papai Noel do Igapó? 27 metros. Eu tenho 1,62 e me sinto igual.', 'Amigo secreto da firma: ganhei um pano de prato. Dei um pano de prato.',
    'Trinta e quatro graus e o Papai Noel de casaco. Isso é profissionalismo.', 'Chester é um bicho que só existe em dezembro.', 'Panetone ou chocotone? Não respondo sem advogado.',
    'Pedi um cliente que paga em dia. O Papai Noel visualizou.', 'Uva-passa no arroz divide família.', 'Esse pisca-pisca é igual meu Wi-Fi: liga, desliga, liga.'];
  const PAPOS_NATAL = [
    ['Vai passar o Natal onde?', 'Na casa da minha vó.', 'Com uva-passa?', 'Com tudo. Inclusive a tia do zap.'],
    ['O Papai Noel do Igapó é o maior do mundo.', 'Maior que o de Águeda?', 'O de Águeda tinha 21. O nosso tem 27.'],
    ['Já montou a árvore?', 'Montei. O gato desmontou.'],
    ['Comprou presente?', 'Comprei pra mim. Pra garantir.']
  ];
  const embaralha = L => { const a = L.slice(); for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function criaMoradores(){
    const c = V.cid, L = lugares(), calcadao = L.find(l => l.nome === 'Calçadão') || { x: c.praca.cx, y: c.praca.cy };
    return MORADORES.map((d, i) => {
      const o = L.find(l => l.nome === d.onde) || calcadao, p = pertoLivre(o.x + (i % 3 - 1) * 40, o.y + 30) || { x: o.x, y: o.y + 30 };
      const m = { sid: 'mor-' + i, bot: true, npc: true, morador: true, nome: d.nome, d, av: avLimpo(d.av, 'morador' + i), x: p.x, y: p.y, dir: 'baixo', passo: 0, mov: false, sit: false, mic: false,
        casa: { x: p.x, y: p.y }, esp: 1 + Math.random() * 4, alvo: null, papo: null, papoT: 0, falouEu: 0, fila: [], vel: 58 + Math.random() * 18 };
      m.porta = { tipo: 'morador', m, x: m.x, y: m.y };
      return m;
    });
  }
  /* a próxima frase do morador: as dele, embaralhadas, com duas das de todo mundo no meio */
  function proximaFrase(m){ if(!m.fila.length) m.fila = embaralha(m.d.frases.concat(embaralha(FRASES_TODOS).slice(0, 2), natal() ? embaralha(FRASES_NATAL).slice(0, 2) : [], noite() ? embaralha(FRASES_NOITE).slice(0, 2) : [], chovendo() ? embaralha(FRASES_CHUVA).slice(0, 2) : [])); return m.fila.pop(); }
  const olhaPra = (m, x, y) => { if(m.sit) return; const dx = x - m.x, dy = y - m.y; m.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'esq' : 'dir') : (dy < 0 ? 'cima' : 'baixo'); };
  function comecaPapo(quem, linhas, eu){
    const agora = Date.now(), p = { dono: quem[0], quem, linhas, i: 0, prox: agora + (eu ? 0 : 350), eu: !!eu };
    quem.forEach(m => { m.papo = p; m.alvo = null; m.mov = false; });
  }
  /* o botão amarelo perto de um morador: mais uma (se ele tá no meio de um papo com outro, espera acabar) */
  function trocaIdeia(m){
    if(!m || (m.papo && !m.papo.eu)) return;
    const agora = Date.now(); if(agora - (m.botaoT || 0) < 1000) return; m.botaoT = agora;
    comecaPapo([m], [[m, proximaFrase(m)]], true);
  }
  function passoMoradores(dt){
    const L = V.moradores, e = V.eu; if(!L || !L.length || !e) return;
    const agora = Date.now(), parado = !e.mov && !e.barco && !V.voo && V.paradoT && agora - V.paradoT > 650;
    /* só um puxa assunto com você por vez: o mais perto (senão dois falavam junto e o botão ia pro outro) */
    let puxa = null; if(parado && !L.some(x => x.papo && x.papo.eu)){ let dm = 70; for(const m of L){ const d = Math.hypot(e.x - m.x, e.y - m.y); if(!m.papo && agora - m.falouEu > 40000 && d < dm){ dm = d; puxa = m; } } }
    for(const m of L){
      m.porta.x = m.x; m.porta.y = m.y;
      const p = m.papo;
      if(p){
        m.mov = false;
        /* cada um olha pra quem tá falando com ele; quem conduz o papo é o primeiro */
        if(p.eu) olhaPra(m, e.x, e.y); else { const o = p.quem.find(x => x !== m); if(o) olhaPra(m, o.x, o.y); }
        /* alguém da roda já tá noutro papo: este acaba (senão ele falava as duas conversas, ou ficava sem quem conduz) */
        if(p.quem.some(x => x.papo !== p)){ fimPapo(p, agora); continue; }
        if(p.dono !== m) continue;
        if(p.eu && Math.hypot(e.x - m.x, e.y - m.y) > 220){ fimPapo(p, agora); continue; }
        if(agora >= p.prox){
          if(p.i < p.linhas.length){
            const [quem, t] = p.linhas[p.i++], dur = 1800 + t.length * 60;
            quem.fala = { t, ate: agora + dur }; p.prox = agora + dur + 250;
            if(C.versoSom && C.versoSom.papo && Math.hypot(quem.x - e.x, quem.y - e.y) < 320) C.versoSom.papo(t.length, quem.d.voz);
          } else fimPapo(p, agora);
        }
        continue;
      }
      /* você parou perto: ele puxa assunto (cada morador, no máximo uma vez a cada 40 s) */
      if(m === puxa){ m.falouEu = agora; comecaPapo([m], [[m, proximaFrase(m)]], true); continue; }
      /* cruzou com outro morador: às vezes param e conversam */
      if(agora - m.papoT > 35000){
        const o = L.find(x => x !== m && !x.papo && agora - x.papoT > 35000 && Math.hypot(x.x - m.x, x.y - m.y) < 46);
        if(o && Math.random() < dt * 1.5){ const d = sorteio(natal() ? PAPOS.concat(PAPOS_NATAL) : PAPOS); comecaPapo([m, o], d.map((t, k) => [k % 2 ? o : m, t])); continue; }
      }
      /* o passeio: banco, encontrar alguém ou um canto perto de casa */
      m.esp -= dt;
      if(m.esp <= 0 && !m.alvo){
        m.sit = false; const r = Math.random;
        const bancos = V.cid.bancos.filter(b => !b.degrau && Math.hypot(b.x - m.casa.x, b.y - m.casa.y) < 520);
        const perto = L.filter(x => x !== m && Math.hypot(x.x - m.x, x.y - m.y) < 650);
        if(r() < .35 && bancos.length){ const b = sorteio(bancos); m.alvo = { x: b.x, y: b.y + 2, banco: true }; }
        else if(r() < .25 && perto.length){ const o = sorteio(perto); m.alvo = { x: o.x + (r() < .5 ? -30 : 30), y: o.y + 6 }; }
        else m.alvo = { x: clamp(m.casa.x + (r() - .5) * 520, 30, V.cid.W - 30), y: clamp(m.casa.y + (r() - .5) * 300, TOPO, V.cid.H - 30) };
      }
      if(m.alvo){
        const ax = m.alvo.x - m.x, ay = m.alvo.y - m.y, d = Math.hypot(ax, ay);
        if(d < 5){ m.sit = !!m.alvo.banco; m.dir = 'baixo'; m.alvo = null; m.esp = (m.sit ? 9 : 2.5) + Math.random() * 6; m.mov = false; }
        else { const ox = m.x, oy = m.y; mover(m, ax / d * m.vel * dt, ay / d * m.vel * dt); m.mov = true; m.passo += dt * (m.av.skate ? 7 : 9); m.dir = Math.abs(ax) > Math.abs(ay) ? (ax < 0 ? 'esq' : 'dir') : (ay < 0 ? 'cima' : 'baixo'); if(Math.hypot(m.x - ox, m.y - oy) < .05){ m.alvo = null; m.esp = .8; m.mov = false; } }
      }
    }
  }
  /* só solta quem ainda tá neste papo (quem já entrou noutro segue nele) */
  function fimPapo(p, agora){ p.quem.forEach(m => { if(m.papo !== p) return; m.papo = null; m.papoT = agora; m.esp = 1.2 + Math.random() * 2.5; }); }
  function passoTarefa(dt){
    const T = V.tarefa, e = V.eu; if(!T || !e) return;
    const agora = Date.now();
    if(T.ate && agora > T.ate){ const nome = T.def.nome; largaTarefa(true); C.toast(`Não deu tempo: ${nome}. Pega de novo quando quiser.`, 3600); return; }
    const et = T.etapas[T.i]; if(!et){ concluiTarefa(); return; }
    /* v3.58: o minijogo parado (o boneco fica no lugar até acabar ou largar) */
    if(T.fase === 'jogando'){ mjPasso(T, et, dt); return; }
    const d = Math.hypot(et.x - e.x, et.y - e.y);
    /* v3.58: a entrega que muda de endereço quando você chega perto (uma vez só, e o relógio ganha 35 s) */
    if(et.troca && !et.trocou && T.fase === 'ir' && d < 170){ et.trocou = true; const n = trocaEndereco(et); if(n){ Object.assign(et, n); if(T.ate) T.ate += 35000; V.portaT = null; C.toast(`${n.aviso} +35 s no relógio.`, 3800); tarefaUI(); portaUI(); return; } }
    /* v3.58: o minijogo que anda (focos, pontos, quente ou frio) começa quando você chega perto */
    if(et.jogo && andaNoJogo(et.jogo) && T.fase === 'ir'){
      if(!T.mj && d < (et.jogo.t === 'caca' ? et.jogo.r * 1.3 : 230)){ T.mj = mjAnda(et); C.toast(et.jogo.dica, 3400); }
      if(T.mj) mjPasso(T, et, dt);
      if(V.tarefa !== T || T.etapas[T.i] !== et || !et.jogo) return;
      const j = T.mj, porta = !!(j && j.t === 'focos' && j.F.some(f => f.vida > 0 && Math.hypot(f.x - e.x, f.y - e.y) < 42));
      if(porta && !V.portaT){ V.portaT = { tipo: 'tarefa', x: e.x, y: e.y, et, focos: true }; portaUI(); }
      else if(!porta && V.portaT){ V.portaT = null; if(j) j.hold = false; portaUI(); }
      return;
    }
    if(T.fase === 'agindo'){
      if(d > RAIO_T + 30 || e.mov){ T.fase = 'ir'; T.agir0 = 0; tarefaUI(); portaUI(); C.toast('Fica parado no lugar pra terminar.', 1800); return; }
      if(agora - T.agir0 >= et.dur * 1000) etapaFeita();
      return;
    }
    if(et.gols != null){
      if(d < (et.perto || RAIO_T)){ if((V.gols || 0) - T.gols0 >= et.gols) etapaFeita(); }
      V.portaT = null; return;
    }
    if(et.pegar){ if(d < et.pegar){ etapaFeita(); } V.portaT = null; return; }
    if(d < RAIO_T){
      if(!et.acao){ etapaFeita(); return; }
      if(!V.portaT || V.portaT.et !== et){ V.portaT = { tipo: 'tarefa', x: et.x, y: et.y, et }; portaUI(); }
    } else if(V.portaT){ V.portaT = null; portaUI(); }
  }
  /* o botão amarelo da etapa: começa a ação (fica uns segundos parado) */
  function agirTarefa(){
    const T = V.tarefa; if(!T || !V.eu) return; const et = T.etapas[T.i]; if(!et || !et.acao) return;
    /* v3.58: no minijogo, o botão é do jogo */
    if(T.fase === 'jogando'){ if(T.mj && T.mj.t === 'tempo') mjToque(); return; }
    if(T.mj && T.mj.anda) return;
    if(Math.hypot(et.x - V.eu.x, et.y - V.eu.y) > RAIO_T + 10){ C.toast('Chega mais perto.'); return; }
    V.alvo = null; V.eu.mov = false;
    if(et.jogo && !andaNoJogo(et.jogo)){ T.fase = 'jogando'; T.mj = mjNovo(et); tarefaUI(); portaUI(); mjUI(true); C.toast(et.jogo.dica, 3200); return; }
    T.fase = 'agindo'; T.agir0 = Date.now(); tarefaUI(); portaUI();
  }
  function etapaFeita(){
    const T = V.tarefa, e = V.eu; if(!T) return; const et = T.etapas[T.i];
    if(et.item){ e.item = { k: et.item, ate: Date.now() + (et.tira === false ? 9e9 : 9e9), tarefa: true }; enviaPos(true); }
    if(et.tira && e.item && e.item.tarefa){ e.item = null; enviaPos(true); }
    if(et.sid){ const r = V.remotos.get(et.sid); if(r){ r.foge = false; r.sit = false; r.fala = { t: (NPCS[et.npc] || NPCS.paciente).depois, ate: Date.now() + 3500 }; const dest = et.npc === 'ladrao' ? portaCivica('delegacia') : null; r.vai = { x: dest ? dest.x : r.x + (Math.random() - .5) * 600, y: dest ? dest.y : r.y + 300, ate: Date.now() + 25000 }; } }
    T.feita = { x: et.x, y: et.y, ate: Date.now() + 1500, efeito: et.efeito };
    T.i++; T.fase = 'ir'; T.agir0 = 0; V.portaT = null;
    if(T.i >= T.etapas.length){ concluiTarefa(); return; }
    tarefaUI(); portaUI(); C.toast(`Feito. Agora: ${T.etapas[T.i].rotulo}.`, 2400);
  }
  /* ---------- v3.58 · os minijogos das tarefas ----------
     O Thales: "melhorar as missões na cidade pra que elas se tornem minimamente mais complexas do que ficar parado em
     um lugar". Cada ação que era "fica uns segundos parado" virou um minijogo curto, do jeito da história:
       tempo   a faixa rosa: o ponteiro vai e volta e o botão acerta quando ele passa nela (virar o smash, apitar,
               massagem, embaixadinha). Cada acerto acelera; errou demais, começa de novo
       seq     as setas: digita a sequência antes do tempo acabar (triagem, sensor, painel do foguete, mão leve)
       segura  a força: segurar sobe, soltar desce, e o nível tem que ficar na faixa que anda (rechear, encher o frasco,
               hastear, puxar o barco, respirar)
       focos   o fogo em 3 focos na fachada: chega em cada um e segura o botão (a mangueira); largou, o fogo cresce
       pontos  gente ou coisa espalhada em volta: passa em cada uma (vacina, galhos floridos)
       caca    quente ou frio: a coisa tá escondida numa área e o placar diz se tá esquentando (pista, pegada, baú)
     Os três últimos deixam andar; os outros seguram o boneco no lugar. A entrega do motoboy pode mudar de endereço no
     meio do caminho (o relógio ganha um tempo). A chave é "uniforme:tarefa", e cada item é a etapa (null = sem jogo) */
  const MJ_JOGOS = {
    'policial:transito': [{ t: 'tempo', n: 5, e: 3, per: 1.1, faixa: .22, verbo: 'Apitar!', dica: 'Apita quando o carro passar na faixa rosa.' }],
    'bombeiro:fogo': [{ t: 'focos', dica: 'São 3 focos na fachada: chega em cada um e segura o botão (a mangueira). Largou, o fogo cresce.' }],
    'bombeiro:gato': [{ t: 'tempo', n: 3, e: 3, per: .9, faixa: .2, verbo: 'Pegar!', dica: 'O gato pula de galho em galho: pega quando ele passar na faixa.' }],
    'bombeiro:treino': [{ t: 'tempo', n: 6, e: 3, per: .7, faixa: .28, verbo: 'Subir!', dica: 'Um degrau por vez, no ritmo da faixa.' }],
    'medico:socorro': [{ t: 'tempo', n: 8, e: 3, per: .62, faixa: .3, verbo: 'Massagem!', dica: 'Massagem no ritmo: aperta quando o ponteiro passar na faixa.' }],
    'medico:vacina': [{ t: 'pontos', n: 5, r: 210, marca: 'gente', dica: 'Tem 5 pessoas esperando a vacina pela Feira: chega perto de cada uma.' }],
    'medico:plantao': [{ t: 'seq', n: 3, tam: 3, dica: 'Cada paciente da triagem tem um código: as setas na ordem, antes do tempo.' }],
    'chef:pastel': [{ t: 'tempo', n: 5, e: 3, per: 1, faixa: .2, verbo: 'Tirar!', dica: 'Tira o pastel do óleo quando ele dourar (a faixa rosa).' }],
    'chef:smash': [{ t: 'tempo', n: 5, e: 3, per: .85, faixa: .16, verbo: 'Virar!', dica: 'Vira o smash na hora: nem cru, nem queimado.' }],
    'chef:churros': [{ t: 'segura', meta: 4, lim: 22, verbo: 'Rechear', dica: 'Segura pra apertar o bico: o recheio tem que ficar na faixa rosa.' }],
    'craque:embaixadinha': [{ t: 'tempo', n: 8, e: 3, per: .75, faixa: .26, verbo: 'Toque!', dica: 'Toca na bola quando ela descer na faixa. Deixou cair 4 vezes, recomeça.' }],
    'ladrao:pipoca': [{ t: 'seq', n: 1, tam: 4, dica: 'Mão leve: as setas na ordem antes do pipoqueiro virar.' }, null],
    'ladrao:churros': [{ t: 'seq', n: 1, tam: 5, dica: 'Mão leve: as setas na ordem antes do tio do churros virar.' }, null],
    'detetive:pistas': [0, 1, 2].map(() => ({ t: 'caca', r: 110, dica: 'A pista tá escondida por aqui: anda e vê se tá quente ou frio.' })),
    'detetive:testemunha': [{ t: 'tempo', n: 4, e: 3, per: 1.2, faixa: .2, verbo: 'Anotar!', dica: 'Anota quando ele falar o detalhe importante (a faixa rosa).' }],
    'detetive:rastro': [0, 1, 2].map(() => ({ t: 'caca', r: 90, dica: 'A pegada tá por aqui: anda e vê se tá quente ou frio.' })),
    'cientista:amostra': [{ t: 'segura', meta: 3.5, lim: 20, verbo: 'Encher', dica: 'Segura pra encher o frasco devagar: a água tem que ficar na faixa rosa.' }, null],
    'cientista:ipe': [{ t: 'pontos', n: 5, r: 150, marca: 'flor', dica: 'Tem 5 galhos floridos marcados em volta do ipê: passa em cada um.' }],
    'cientista:clima': [0, 1, 2].map(() => ({ t: 'seq', n: 1, tam: 4, dica: 'Digita o código do sensor: as setas na ordem.' })),
    'pirata:tesouro': [{ t: 'caca', r: 120, dica: 'O baú tá enterrado na areia: anda e vê se tá quente ou frio.' }],
    'pirata:bandeira': [{ t: 'segura', meta: 4, lim: 22, verbo: 'Hastear', dica: 'Segura pra puxar a corda: a bandeira tem que subir na faixa rosa.' }],
    'pirata:mapa': [0, 1, 2].map(() => ({ t: 'caca', r: 80, dica: 'O pedaço do mapa tá por aqui: quente ou frio.' })),
    'astronauta:contagem': [{ t: 'seq', n: 3, tam: 3, dica: 'Liga o painel do foguete: as setas na ordem, três vezes.' }],
    'astronauta:treino': [{ t: 'tempo', n: 6, e: 3, per: .8, faixa: .26, verbo: 'Puxar!', dica: 'Uma barra por vez, no ritmo da faixa.' }],
    'astronauta:estrelas': [{ t: 'seq', n: 2, tam: 5, dica: 'Liga as estrelas da constelação: as setas na ordem.' }],
    'ninja:meditar': [{ t: 'segura', meta: 6, lim: 28, verbo: 'Respirar', calmo: true, dica: 'Segura pra puxar o ar, solta pra soltar: a respiração acompanha a faixa.' }],
    'super:resgate': [{ t: 'segura', meta: 4, lim: 22, verbo: 'Puxar', dica: 'Segura pra puxar o barco: a força tem que ficar na faixa rosa.' }],
    'super:pipa': [{ t: 'tempo', n: 3, e: 3, per: .9, faixa: .18, verbo: 'Soltar!', dica: 'A pipa balança no vento: solta quando ela passar na faixa.' }],
    'rei:fita': [{ t: 'tempo', n: 2, e: 2, per: 1, faixa: .14, verbo: 'Cortar!', dica: 'Corta a fita bem no laço: dos dois lados.' }],
    'rei:discurso': [{ t: 'seq', n: 3, tam: 3, dica: 'Cada frase do discurso é uma sequência: errou, o povo vaia e você recomeça a frase.' }],
    'rei:visita': [0, 1, 2].map(() => ({ t: 'tempo', n: 2, e: 3, per: 1, faixa: .26, verbo: 'Acenar!', dica: 'Acena quando o povo olhar pra você (a faixa rosa).' }))
  };
  /* o jeito de cada minijogo, numa palavra (a folha do Trampo mostra) */
  const MJ_ROTULO = { tempo: 'na hora certa', seq: 'setas', segura: 'na força certa', focos: 'focos de fogo', pontos: 'espalhados', caca: 'quente ou frio' };
  const mjDe = (u, k) => { const L = MJ_JOGOS[u + ':' + k]; return L ? L.find(Boolean) || null : null; };
  const DIRS = ['cima', 'dir', 'baixo', 'esq'], SETA = { cima: '↑', dir: '→', baixo: '↓', esq: '←' };
  const SETAK = { ArrowUp: 'cima', w: 'cima', ArrowRight: 'dir', d: 'dir', ArrowDown: 'baixo', s: 'baixo', ArrowLeft: 'esq', a: 'esq' };
  const andaNoJogo = j => !!j && (j.t === 'focos' || j.t === 'pontos' || j.t === 'caca');
  const deSegurar = j => !!j && (j.t === 'segura' || j.t === 'focos');
  /* quente ou frio: cinco faixas, do azul ao vermelho (nada de verde) */
  const TEMPS = [['Gelado', '#38E1FF'], ['Frio', '#9CC9F0'], ['Morno', '#F2EC54'], ['Quente', '#FF8A3D'], ['Fervendo', '#E2412E']];
  const tempDe = (j, e) => { const d = Math.hypot(j.alvo.x - e.x, j.alvo.y - e.y), f = d / Math.max(40, j.r); return f > 1.15 ? 0 : f > .75 ? 1 : f > .45 ? 2 : f > .22 ? 3 : 4; };
  const somMj = bom => { const S = C.versoSom; if(S && S[bom ? 'acerto' : 'erro']) S[bom ? 'acerto' : 'erro'](); };
  function mjAviso(msg){ C.toast(msg, 1800); }
  function seqRodada(j){ const L = j.tam + j.i; j.seq = Array.from({ length: L }, () => DIRS[Math.floor(Math.random() * 4)]); j.pos = 0; j.t0 = Date.now(); j.lim = 2600 + 650 * L; }
  /* o jogo parado (tempo, seq, segura) começa no botão amarelo */
  function mjNovo(et){
    const j = Object.assign({}, et.jogo), agora = Date.now();
    if(j.t === 'tempo') Object.assign(j, { ok: 0, err: 0, per0: j.per, u: 0, dir: 1, zc: .25 + Math.random() * .5, flash: null });
    if(j.t === 'seq') Object.assign(j, { i: 0, err: 0 }), seqRodada(j);
    if(j.t === 'segura') Object.assign(j, { nivel: 0, hold: false, acc: 0, t0: agora, ph: Math.random() * 6, faixa: j.faixa || .26 });
    return j;
  }
  /* o figurante da vacina: fica em pé esperando e depois vai embora */
  function npcParado(p){
    const sid = 'npc-' + Math.random().toString(36).slice(2, 8);
    const av = avLimpo({ pele: pele6(), cabelo: sorteio(['curto', 'coque', 'raspado']), roupa: 'camiseta', corRoupa: Math.floor(Math.random() * 8) }, sid);
    V.remotos.set(sid, { sid, bot: true, npc: true, nome: sorteio(['Dona Lurdes', 'Seu Tião', 'Kauã', 'Bia', 'Seu Nakamura', 'Dona Rosa']), av, x: p.x, y: p.y, dir: 'baixo', passo: 0, mov: false, sit: false, fala: { t: 'vacina aqui!', ate: Date.now() + 9e9 } });
    return sid;
  }
  /* o jogo que anda (focos, pontos, caca) começa sozinho quando você chega perto */
  function mjAnda(et){
    const j = Object.assign({}, et.jogo), cx = et.x, cy = et.y;
    if(j.t === 'caca'){ const a = Math.random() * Math.PI * 2, r = j.r * (.4 + Math.random() * .55); j.alvo = pertoLivre(cx + Math.cos(a) * r, cy + Math.sin(a) * r * .7) || { x: cx, y: cy }; j.cx = cx; j.cy = cy; j.temp = -1; }
    if(j.t === 'pontos'){
      j.P = [];
      for(let i = 0; i < j.n; i++){ const a = i / j.n * Math.PI * 2 + Math.random() * .7, r = j.r * (.45 + Math.random() * .5), p = pertoLivre(cx + Math.cos(a) * r, cy + Math.sin(a) * r * .7) || { x: cx + (i - 2) * 30, y: cy }; const q = { x: p.x, y: p.y, ok: false }; if(j.marca === 'gente') q.sid = npcParado(q); j.P.push(q); }
    }
    if(j.t === 'focos'){
      const fx0 = et.fx != null ? et.fx : cx, fy0 = et.fy != null ? et.fy : cy - 70;
      j.F = [-1, 0, 1].map(k => { const p = pertoLivre(cx + k * 78, cy) || { x: cx + k * 78, y: cy }; return { x: p.x, y: p.y, fx: fx0 + k * 78, fy: fy0 + (k ? 10 : -16), vida: 1 }; }); j.hold = false;
    }
    j.anda = true; return j;
  }
  function mjFim(T){
    const j = T.mj; T.mj = null; T.fase = 'ir';
    if(j && j.P) j.P.forEach(p => { if(p.sid){ const r = V.remotos.get(p.sid); if(r && !r.vai) tiraNpc(p.sid); } });
    somMj(true); mjUI(true); etapaFeita();
  }
  /* um quadro do jogo */
  function mjPasso(T, et, dt){
    const j = T.mj, e = V.eu, agora = Date.now(); if(!j || !e) return;
    if(j.t === 'tempo'){ j.u += j.dir * dt / j.per; if(j.u >= 1){ j.u = 2 - j.u; j.dir = -1; } if(j.u <= 0){ j.u = -j.u; j.dir = 1; } }
    else if(j.t === 'seq'){ if(agora - j.t0 > j.lim){ j.err++; somMj(false); mjAviso('Acabou o tempo: outra sequência.'); seqRodada(j); } }
    else if(j.t === 'segura'){
      j.nivel = clamp(j.nivel + (j.hold ? 1.15 : -.95) * dt * (j.calmo ? .7 : 1), 0, 1);
      if(Math.abs(j.nivel - mjZona(j, agora)) <= j.faixa / 2) j.acc += dt;
      if(j.acc >= j.meta){ mjFim(T); return; }
      if(agora - j.t0 > j.lim * 1000){ somMj(false); mjAviso('Perdeu o ritmo: começa de novo.'); Object.assign(j, { acc: 0, t0: agora }); }
    } else if(j.t === 'focos'){
      let vivos = 0;
      j.F.forEach(f => { if(f.vida <= 0) return; const perto = Math.hypot(f.x - e.x, f.y - e.y) < 42;
        if(perto && j.hold) f.vida = Math.max(0, f.vida - dt / 1.7); else f.vida = Math.min(1, f.vida + dt * .07);
        if(f.vida <= 0){ somMj(true); if(j.F.some(g => g.vida > 0)) C.toast(`Um foco apagado. Faltam ${j.F.filter(g => g.vida > 0).length}.`, 1600); } else vivos++; });
      if(!vivos){ mjFim(T); return; }
    } else if(j.t === 'pontos'){
      j.P.forEach(p => { if(p.ok || Math.hypot(p.x - e.x, p.y - e.y) > 30) return; p.ok = true; somMj(true);
        if(p.sid){ const r = V.remotos.get(p.sid); if(r){ r.fala = { t: sorteio(['valeu!', 'nem doeu', 'obrigado!', 'ufa']), ate: Date.now() + 3000 }; r.vai = { x: r.x + (Math.random() - .5) * 500, y: r.y + 260, ate: Date.now() + 20000 }; } }
        const falta = j.P.filter(q => !q.ok).length; if(falta) C.toast(`${j.n - falta}/${j.n}. Falta${falta > 1 ? 'm' : ''} ${falta}.`, 1400); });
      if(j.P.every(p => p.ok)){ mjFim(T); return; }
    } else if(j.t === 'caca'){
      const tp = tempDe(j, e); if(tp !== j.temp){ if(j.temp >= 0 && tp > j.temp && tp >= 3) somMj(true); j.temp = tp; }
      /* achou: a etapa volta a ser a de sempre (o botão amarelo examina/cava ali) */
      if(Math.hypot(j.alvo.x - e.x, j.alvo.y - e.y) < 26){ et.x = j.alvo.x; et.y = j.alvo.y; et.dur = Math.min(et.dur || 2, 1.5); et.jogo = null; T.mj = null; somMj(true); C.toast('Achou! Agora: ' + (et.acao || 'pega') + '.', 1800); mjUI(true); }
    }
  }
  const mjProg = j => (j.t === 'tempo' ? j.ok / j.n : j.t === 'seq' ? (j.i + j.pos / Math.max(1, j.seq.length)) / j.n : j.t === 'segura' ? j.acc / j.meta : 0);
  const mjZona = (j, agora) => .5 + (j.calmo ? .26 : .3) * Math.sin((agora - j.t0) / 1000 * (j.calmo ? .55 : .95) + j.ph);
  /* o toque na hora certa (botão amarelo, espaço, Enter, o Pular do celular) */
  function mjToque(){
    const T = V.tarefa, j = T && T.mj; if(!j || j.t !== 'tempo' || T.fase !== 'jogando') return false;
    const agora = Date.now();
    if(Math.abs(j.u - j.zc) <= j.faixa / 2){
      j.ok++; j.flash = { bom: true, ate: agora + 280 }; j.per = Math.max(.4, j.per * .93); somMj(true);
      /* a faixa nova cai longe do ponteiro (não dá pra ficar martelando no mesmo lugar) */
      let zc = j.zc; for(let k = 0; k < 8 && Math.abs(zc - j.u) < .3; k++) zc = .15 + Math.random() * .7; j.zc = zc;
      if(j.ok >= j.n){ mjFim(T); return true; }
    } else {
      j.err++; j.flash = { bom: false, ate: agora + 280 }; somMj(false);
      if(j.err > j.e){ mjAviso('Errou demais: começa de novo.'); Object.assign(j, { ok: 0, err: 0, per: j.per0 }); }
    }
    mjUI(true); return true;
  }
  function mjSeta(d){
    const T = V.tarefa, j = T && T.mj; if(!j || j.t !== 'seq' || T.fase !== 'jogando') return false;
    if(j.seq[j.pos] === d){ j.pos++; somMj(true); if(j.pos >= j.seq.length){ j.i++; if(j.i >= j.n){ mjFim(T); return true; } seqRodada(j); } }
    else { j.err++; somMj(false); mjAviso('Seta errada: outra sequência.'); seqRodada(j); }
    mjUI(true); return true;
  }
  /* segurar (a força, a mangueira): o botão amarelo, o espaço, o Enter ou o Pular */
  function mjHold(on){ const T = V.tarefa, j = T && T.mj; if(!deSegurar(j)) return false; j.hold = !!on; return true; }
  /* o que o botão faz quando aperta: tempo toca, segura e focos começam a segurar */
  function mjAperta(){ const T = V.tarefa, j = T && T.mj; if(!j) return false; if(j.t === 'tempo') return mjToque(); if(j.t === 'focos' && !V.portaT) return false; if(deSegurar(j)) return mjHold(true); return j.t === 'seq' && T.fase === 'jogando'; }
  function mjLarga(){ const T = V.tarefa; if(!T || T.fase !== 'jogando') return; T.mj = null; T.fase = 'ir'; mjUI(true); tarefaUI(); portaUI(); C.toast('Largou o jogo. O botão amarelo começa de novo.', 2200); }
  /* quanto falta, em poucas letras (o chip do alto) */
  function mjResumo(j, e){
    if(j.t === 'tempo') return `${j.ok}/${j.n}`;
    if(j.t === 'seq') return `${j.i + 1}/${j.n}`;
    if(j.t === 'segura') return `${Math.min(100, Math.round(j.acc / j.meta * 100))}%`;
    if(j.t === 'focos') return `focos ${j.F.filter(f => f.vida <= 0).length}/${j.F.length}`;
    if(j.t === 'pontos') return `${j.P.filter(p => p.ok).length}/${j.n}`;
    if(j.t === 'caca') return TEMPS[Math.max(0, tempDe(j, e))][0].toLowerCase();
    return '';
  }
  /* o painel do minijogo, em cima do botão amarelo. Refaz o HTML só quando muda o placar; o ponteiro anda a cada quadro */
  function mjUI(forca){
    const el = C.$('cvr-mj'); if(!el) return;
    const T = V.tarefa, j = T && T.mj, e = V.eu, mostra = !!(j && e && (T.fase === 'jogando' || j.anda));
    if(!mostra){ if(!el.hidden){ el.hidden = true; el.dataset.k = ''; el.innerHTML = ''; } return; }
    el.hidden = false;
    const et = T.etapas[T.i] || {}, agora = Date.now(), tp = j.t === 'caca' ? tempDe(j, e) : 0;
    const k = [j.t, T.i, j.ok, j.err, j.i, j.pos, j.seq && j.seq.join(''), j.F && j.F.map(f => (f.vida > 0 ? 1 : 0)).join(''), j.P && j.P.filter(p => p.ok).length, tp, j.flash && j.flash.ate > agora ? (j.flash.bom ? 'b' : 'm') : ''].join('|');
    if(forca || el.dataset.k !== k){
      el.dataset.k = k;
      const titulo = j.t === 'focos' ? 'Apagar o fogo' : j.t === 'caca' ? `Procurando ${et.rotulo || ''}` : et.acao || T.def.nome;
      let corpo = '';
      if(j.t === 'tempo') corpo = `<div class="mj-barra${j.flash && j.flash.ate > agora ? (j.flash.bom ? ' bom' : ' mau') : ''}"><i class="mj-zona" style="left:${((j.zc - j.faixa / 2) * 100).toFixed(1)}%;width:${(j.faixa * 100).toFixed(1)}%"></i><i class="mj-cur"></i></div>
        <div class="mj-pips">${Array.from({ length: j.n }, (_, i) => `<i class="${i < j.ok ? 'on' : ''}"></i>`).join('')}<span>${j.err ? `erros ${j.err}/${j.e + 1}` : ''}</span></div>`;
      if(j.t === 'seq') corpo = `<div class="mj-seq">${j.seq.map((d, i) => `<i class="${i < j.pos ? 'on' : i === j.pos ? 'vez' : ''}">${SETA[d]}</i>`).join('')}</div><div class="mj-tempo"><i></i></div>
        <div class="mj-setas">${['esq', 'cima', 'baixo', 'dir'].map(d => `<button type="button" tabindex="-1" data-act="cvr-mj-seta" data-d="${d}" aria-label="Seta ${d}">${SETA[d]}</button>`).join('')}</div>`;
      if(j.t === 'segura') corpo = `<div class="mj-barra"><i class="mj-zona"></i><i class="mj-nivel"></i></div><div class="mj-prog"><i></i></div>`;
      if(j.t === 'focos') corpo = `<div class="mj-pips">${j.F.map(f => `<i class="${f.vida <= 0 ? 'on' : ''}"></i>`).join('')}<span>${j.F.filter(f => f.vida <= 0).length} de ${j.F.length} apagados</span></div>`;
      if(j.t === 'pontos') corpo = `<div class="mj-pips">${j.P.map(p => `<i class="${p.ok ? 'on' : ''}"></i>`).join('')}<span>${j.P.filter(p => p.ok).length} de ${j.n}</span></div>`;
      if(j.t === 'caca') corpo = `<div class="mj-temp" style="--c:${TEMPS[tp][1]}"><b>${TEMPS[tp][0]}</b><i><i style="width:${(tp + 1) * 20}%"></i></i></div>`;
      el.className = 'cvr-mj mj-' + j.t;
      el.innerHTML = `<div class="mj-h"><b>${esc(titulo)}</b><span>${esc(mjResumo(j, e))}</span>${T.fase === 'jogando' ? '<button type="button" class="mj-x" tabindex="-1" data-act="cvr-mj-larga" aria-label="Largar o jogo">×</button>' : ''}</div>${corpo}<small>${esc(j.dica || '')}</small>`;
    }
    /* o que anda a cada quadro, só no estilo */
    if(j.t === 'tempo'){ const c = el.querySelector('.mj-cur'); if(c) c.style.left = (j.u * 100).toFixed(1) + '%'; }
    if(j.t === 'seq'){ const b = el.querySelector('.mj-tempo i'); if(b) b.style.width = Math.max(0, 100 - (agora - j.t0) / j.lim * 100).toFixed(1) + '%'; }
    if(j.t === 'segura'){ const zc = mjZona(j, agora), z = el.querySelector('.mj-zona'), n = el.querySelector('.mj-nivel'), p = el.querySelector('.mj-prog i');
      if(z){ z.style.left = ((zc - j.faixa / 2) * 100).toFixed(1) + '%'; z.style.width = (j.faixa * 100).toFixed(1) + '%'; } if(n) n.style.left = (j.nivel * 100).toFixed(1) + '%'; if(p) p.style.width = Math.min(100, j.acc / j.meta * 100).toFixed(1) + '%';
      el.classList.toggle('dentro', Math.abs(j.nivel - zc) <= j.faixa / 2); }
  }
  /* a entrega que muda de endereço no meio do caminho (o motoboy ganha um tempo no relógio) */
  function trocaEndereco(et){
    if(et.troca === 'acai'){ const ts = V.cid.glebaR.torres.filter(t => Math.hypot(t.x + t.w / 2 - et.x, t.base + 18 - et.y) > 150); if(!ts.length) return null; const t = sorteio(ts); return Object.assign(livre({ x: t.x + t.w / 2, y: t.base + 18 }), { rotulo: 'outra torre da Gleba', aviso: 'Mudou de torre: o açaí é na outra portaria da Gleba.' }); }
    const hs = V.cid.casas.filter(h => Math.hypot(h.portaX - et.x, h.base + 14 - et.y) > 400); if(!hs.length) return null;
    const h = sorteio(hs); return Object.assign(livre({ x: h.portaX, y: h.base + 14 }), { rotulo: 'a casa de @' + h.handle, aviso: `O cliente mudou o endereço: agora é na casa de @${h.handle}.` });
  }
  /* no mundo: os focos com a água, a gente e as flores pra visitar, a área da procura */
  function desenhaMj(L, ctx, t, vis, T){
    const j = T.mj, e = V.eu; if(!j || !e) return;
    if(j.t === 'focos') j.F.forEach(f => { if(f.vida <= 0 || !vis(f.fx, f.fy, 160)) return;
      L.push({ y: f.fy + 200, f: () => fogo(ctx, f.fx, f.fy, t, .25 + f.vida * .75) });
      L.push({ y: f.y + 1, f: () => { ctx.strokeStyle = ROSA; ctx.lineWidth = Math.max(2, 1.05 / V.k); ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.ellipse(f.x, f.y, 26, 10, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); } });
      if(j.hold && Math.hypot(f.x - e.x, f.y - e.y) < 42) L.push({ y: 9e6, f: () => agua(ctx, e.x, e.y - 14, f.fx, f.fy + 16, t) }); });
    if(j.t === 'pontos') j.P.forEach(p => { if(p.ok || !vis(p.x, p.y, 80)) return;
      L.push({ y: p.y + 1, f: () => { ctx.strokeStyle = ROSA; ctx.lineWidth = Math.max(2, 1.05 / V.k); ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.ellipse(p.x, p.y, 20, 8, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); } });
      if(!p.sid) L.push({ y: p.y, f: () => { flor(ctx, p.x, p.y, t); brilho(ctx, p.x, p.y - 10, t); } }); });
    if(j.t === 'caca' && vis(j.cx, j.cy, j.r + 60)){
      L.push({ y: j.cy - j.r, f: () => { ctx.strokeStyle = 'rgba(255,79,154,.75)'; ctx.lineWidth = Math.max(2, 1.05 / V.k); ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.ellipse(j.cx, j.cy, j.r, j.r * .62, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); } });
      /* fervendo, o chão brilha de leve em volta (perto, mas sem entregar o ponto) */
      if(tempDe(j, e) >= 4) L.push({ y: j.alvo.y, f: () => brilho(ctx, j.alvo.x + Math.sin(t * 2) * 10, j.alvo.y - 4, t) });
    }
  }
  function flor(ctx, x, y, t){
    const u = Math.max(1, 1.05 / V.k), b = Math.round(Math.sin(t * 2 + x) * 1.5);
    ctx.fillStyle = '#8D5A3B'; ctx.fillRect(x - u, y - 12, 2 * u, 12);
    [[-4, -16], [4, -16], [0, -20], [0, -12]].forEach(([dx, dy], i) => { ctx.fillStyle = i % 2 ? ROSA : AMARELO; ctx.fillRect(x + dx - 2 + b, y + dy - 2, 4, 4); });
  }
  async function concluiTarefa(){
    const T = V.tarefa; if(!T) return; V.tarefa = null; V.portaT = null;
    if(V.eu && V.eu.item && V.eu.item.tarefa){ V.eu.item = null; }
    V.festa = { x: V.eu.x, y: V.eu.y, ate: Date.now() + 1800 };
    T.etapas.forEach(e => { if(e.sid){ const r = V.remotos.get(e.sid); if(r && !r.vai) tiraNpc(e.sid); } });
    const feitas = tarefasFeitas(); feitas[T.u] = (feitas[T.u] || 0) + 1;
    const antes = patenteDe(T.u, feitas[T.u] - 1), depois = patenteDe(T.u, feitas[T.u]);
    const me = C.st.me, uAgora = meuUniforme(), verso = Object.assign({}, me && me.verso && typeof me.verso === 'object' ? me.verso : {}, uAgora ? { skin: uAgora, personagem: '' } : {}, { tarefas: feitas, pontos: ((me && me.verso && me.verso.pontos) || 0) + T.def.pontos });
    tarefaUI(); portaUI(); mjUI(true); falaAuto(6);
    const prox = naOrdem(T.u).find(t => t.k !== T.k);
    C.toast(`Tarefa feita: ${T.def.nome}${depois !== antes ? ` · subiu pra ${depois}!` : '.'}${prox ? ` Próxima no Trampo: ${prox.nome}.` : ''}`, 3800);
    try{ await C.saveMe({ verso }); if(V.eu) anunciar(); }catch(e){ C.toast(C.errMsg(e, 'Não deu pra guardar a tarefa na carteira.')); }
    pagaTarefa(T, 0);
  }
  /* v3.38 · o correal da tarefa: o banco confere o tempo (se foi rápido demais, espera e confere de novo) e credita até o teto */
  async function pagaTarefa(T, tent){
    if(!T.vez){ if(tent < 4) setTimeout(() => pagaTarefa(T, tent + 1), 1500); return; }
    let r = null; try{ r = await C.api.rpc('corre_tarefa_termina', { p_id: T.vez }); }catch(e){ return; }
    if(r && r.motivo === 'rapido' && tent < 6){ setTimeout(() => pagaTarefa(T, tent + 1), Math.max(1, r.falta || 3) * 1000 + 400); return; }
    if(!r || !r.ok) return;
    C.correalLe({ saldo: r.saldo, hoje: r.hoje, teto: r.teto }); correalUI(true);
    /* v3.43: em centavos. A tarefa que fecha o dia pode pagar só o que faltava pro teto (0,04 de uma de 0,15) */
    const F = C.correalFmt, ganhou = C.correalCent(r.ganhou), bateu = C.correalCent(r.hoje) >= C.correalCent(r.teto);
    C.toast(!ganhou ? `Bateu o teto de hoje (${C.correalTxt(r.teto)}). A carteira tá com ${F(r.saldo)}; amanhã tem mais.`
      : bateu ? `+${C.correalTxt(r.ganhou)} na carteira · bateu o teto de hoje (${F(r.teto)}). Amanhã tem mais.`
      : `+${C.correalTxt(r.ganhou)} na carteira · hoje ${F(r.hoje)} de ${F(r.teto)}`, 4200);
  }
  /* v3.43 · quanto uma tarefa vale em correal: os pontos dela x o ponto do banco (3 centavos), em centavos inteiros,
     a mesma conta do corre_tarefa_termina. Se o dia já bateu o teto, ela vale patente, mas não paga */
  const valorTarefa = pontos => Math.round((Number(pontos) || 0) * (Number(C.correal.ponto) || 0.03) * 100) / 100;
  const bateuTeto = () => C.correal.saldo != null && C.correalCent(C.correal.hoje) >= C.correalCent(C.correal.teto);
  /* o jeito de ganhar, em 2 linhas sem jargão (a carteira). As contas saem do próprio Trampo, pra não mentir se o banco
     mudar o ponto ou o teto: a tarefa mais barata e a mais cara, e "umas 10 tarefas" é o teto dividido pela média */
  const comoGanha = () => {
    const L = Object.keys(TAREFAS).reduce((a, k) => a.concat((TAREFAS[k] || []).map(t => Number(t.pontos) || 0)), []).filter(Boolean);
    const min = L.length ? Math.min.apply(null, L) : 2, max = L.length ? Math.max.apply(null, L) : 5, media = L.length ? L.reduce((a, b) => a + b, 0) / L.length : 3.5;
    const F = C.correalFmt, n = Math.max(1, Math.round((Number(C.correal.teto) || 1) / ((Number(C.correal.ponto) || 0.03) * media)));
    return [`Cada tarefa paga de ${F(valorTarefa(min))} a ${F(valorTarefa(max))} de correal: a mais difícil paga mais.`,
      `Umas ${n} tarefas fecham o dia em ${C.correalTxt(C.correal.teto)}, o teto; amanhã começa de novo.`];
  };
  /* a moedinha no alto da cidade */
  function correalUI(pula){
    const b = C.$('cvr-correal'); if(!b) return;
    b.hidden = false; C.correalSet();
    if(pula){ b.classList.remove('pula'); void b.offsetWidth; b.classList.add('pula'); }
  }
  /* o nome de cada linha do extrato */
  const rotuloCorreal = m => {
    const [tipo, a, b] = String(m || '').split(':');
    if(tipo === 'tarefa'){ const t = (TAREFAS[a] || []).find(x => x.k === b); return t ? t.nome : 'Tarefa'; }
    /* v3.74: a compra no Ateliê aparecia como "IA" no extrato (o "skin:farao" caía no rótulo da IA) */
    if(tipo === 'skin'){ const sk = LOJA[a]; return sk ? `Ateliê: ${sk[1]}` : 'Ateliê'; }
    const ia = { imagem: 'Imagem com IA', legenda: 'Legenda ou pauta com IA', abordagem: 'Hórus com IA', marca: 'Studio Houzi com IA', voo: 'Voo no Aeroporto' }[a] || 'IA';
    if(a === 'voo') return tipo === 'volta' ? 'Voo no Aeroporto: devolvido' : ia;
    return tipo === 'volta' ? `${ia}: devolvido (a IA falhou)` : ia;
  };
  /* a carteira (abre daqui da cidade, do perfil e do Financeiro no menu). v3.43: morando no Financeiro, ela diz com
     todas as letras que correal não é dinheiro, que é a regra da casa */
  async function carteiraSheet(){
    await C.correalCarrega();
    let L = []; try{ L = await C.api.q('corre_correal_log', { eq: { dono: C.uid() }, order: ['created_at', false], limit: 10 }); }catch(e){}
    const w = C.correal, P = w.precos, naCidade = !!C.$('cvr-stage'), F = C.correalFmt, cm = comoGanha();
    /* v3.43: tudo em centavos ("0,90", "+0,15"), escrito pelo C.correalFmt; a barra do dia também conta em centavos */
    const preco = (t, v) => `<li><span>${t}</span><b class="num">${F(v)}</b><small>${C.correalUnid(v)}</small></li>`;
    C.sheet(`<div class="form cvr-cart"><div class="sheet-head"><h2>${ico('correal')} Carteira</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <div class="cart-topo"><div class="cart-saldo"><b class="num" data-correal-saldo>${F(w.saldo || 0)}</b><span data-correal-unid>${C.correalUnid(w.saldo || 0)}</span></div>
        <div class="cart-hoje"><span>Hoje, em tarefa: <b class="num">${F(Math.min(C.correalCent(w.hoje || 0), C.correalCent(w.teto)) / 100)}</b> de ${F(w.teto)}</span><i aria-hidden="true"><i style="width:${Math.min(100, Math.round(C.correalCent(w.hoje) / Math.max(1, C.correalCent(w.teto)) * 100))}%"></i></i></div></div>
      <h3 class="cart-h">Como ganha</h3>
      <p class="cart-p">Fazendo tarefa no Correverso: abre o Trampo, escolhe o uniforme (o boneco troca na hora) e pega uma tarefa.</p>
      <p class="cart-p cart-conta">${esc(cm[0])}<br>${esc(cm[1])}</p>
      <h3 class="cart-h">Onde usa</h3>
      <ul class="cart-precos">${preco('Imagem com IA (Studio)', P.imagem)}${preco('Legenda ou pauta com IA', P.legenda)}${preco('Mensagem ou leitura do Hórus', P.abordagem)}${preco('Textos e nomes do Studio Houzi', P.marca)}${P.voo ? preco('Voo no Aeroporto (Correverso)', P.voo) : ''}</ul>
      <p class="fine">Correal é a moeda do Correverso, não é dinheiro: não compra, não vende e não passa pra ninguém. Na IA, só entra depois que o grátis do dia acaba; o voo cobra sempre. O Corre pergunta antes de gastar, e se a IA falhar, o correal volta.</p>
      ${L.length ? `<h3 class="cart-h">Extrato</h3><ul class="cart-ext">${L.map(l => `<li><span>${esc(rotuloCorreal(l.motivo))}</span><small>${esc(C.rel(l.created_at))}</small><b class="num${l.valor > 0 ? ' mais' : ''}">${l.valor > 0 ? '+' : ''}${F(l.valor)}</b></li>`).join('')}</ul>` : ''}
      <div class="acts">${naCidade ? `<button type="button" class="btn pri" data-act="cvr-trampo">${ico('raio')} Pegar tarefa</button>` : `<a class="btn pri" href="#/verso">${ico('verso')} Ir pro Correverso</a>`}</div></div>`);
  }
  C.acts.carteira = () => carteiraSheet();
  /* a patente de quem tá na cidade vai na presença (pt), só quando a pessoa tá de uniforme */
  const minhaPatente = () => { const u = meuUniforme(); return u ? patenteIdx(u, tarefasFeitas()[u]) : 0; };
  /* o chip do alto: a tarefa, a etapa, a distância, o tempo */
  function tarefaUI(){
    const el = C.$('cvr-tarefa'); if(!el) return;
    const T = V.tarefa; el.hidden = !T; if(!T || !V.eu) return;
    const et = T.etapas[T.i]; if(!et) return;
    const d = Math.hypot(et.x - V.eu.x, et.y - V.eu.y), m = Math.round(d / 10), ang = Math.atan2(et.y - V.eu.y, et.x - V.eu.x), seta = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'][((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8];
    const resto = T.ate ? Math.max(0, Math.ceil((T.ate - Date.now()) / 1000)) : 0;
    const prog = T.fase === 'agindo' ? Math.min(1, (Date.now() - T.agir0) / (et.dur * 1000)) : 0;
    const txt = T.mj ? `${T.mj.t === 'caca' ? 'procurando ' + et.rotulo : T.mj.t === 'focos' ? 'apagando o fogo' : T.mj.t === 'pontos' ? et.rotulo : et.acao} · ${mjResumo(T.mj, V.eu)}` : T.fase === 'agindo' ? `${et.acao}… ${Math.round(prog * 100)}%` : et.gols != null ? `${et.rotulo} · gols ${Math.min(et.gols, (V.gols || 0) - T.gols0)}/${et.gols}` : `${et.rotulo} · ${seta} ${m} m`;
    el.innerHTML = `<b>${esc(T.def.nome)}</b><span>${esc(txt)}${T.etapas.length > 1 ? ` · ${T.i + 1}/${T.etapas.length}` : ''}${resto ? ` · ${Math.floor(resto / 60)}:${String(resto % 60).padStart(2, '0')}` : ''}</span>`;
  }
  /* o alvo no mapa (seta rosa), os efeitos (fogo, gato, pista, fita, contagem, água na hora de apagar) e a festa */
  function desenhaTarefa(L, ctx, t, vis){
    const T = V.tarefa, agora = Date.now();
    if(T){
      const et = T.etapas[T.i], j = T.mj, escondeAlvo = !!(j && j.anda);
      /* v3.58: com o minijogo que anda, o alvo vira os focos, a gente espalhada ou a área da procura */
      if(et && vis(et.x, et.y, 120) && !escondeAlvo){
        L.push({ y: et.y + 1, f: () => { ctx.strokeStyle = ROSA; ctx.lineWidth = Math.max(2, 1.05 / V.k); ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.ellipse(et.x, et.y, RAIO_T * .6, RAIO_T * .25, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); } });
      }
      if(et && vis(et.x, et.y, 120)){
        if(!escondeAlvo) L.push({ y: et.y + 9e5, f: () => { ctx.save(); ctx.translate(et.x, et.y - 46 + Math.round(Math.sin(t * 4) * 3)); ctx.beginPath(); ctx.moveTo(-9, -14); ctx.lineTo(9, -14); ctx.lineTo(0, 0); ctx.closePath(); forma(ctx, ROSA, 2); ctx.restore(); } });
        const ef = et.efeito, fx = et.fx != null ? et.fx : et.x, fy = et.fy != null ? et.fy : et.y;
        if(ef === 'fogo' && !(j && j.F)) L.push({ y: fy + 200, f: () => fogo(ctx, fx, fy, t, T.fase === 'agindo' ? 1 - (agora - T.agir0) / (et.dur * 1000) : 1) });
        if(ef === 'gato') L.push({ y: fy + 200, f: () => gatinho(ctx, fx, fy, t) });
        if(ef === 'brilho' && !escondeAlvo) L.push({ y: et.y, f: () => brilho(ctx, et.x, et.y - 6, t) });
        const pj = j && T.fase === 'jogando' ? mjProg(j) : null;
        if(ef === 'fita') L.push({ y: et.y - 1, f: () => fita(ctx, et.x, et.y, pj != null ? pj : T.fase === 'agindo' ? (agora - T.agir0) / (et.dur * 1000) : 0) });
        if(T.fase === 'agindo' || pj != null){
          const p = pj != null ? pj : (agora - T.agir0) / (et.dur * 1000);
          if(ef === 'fogo') L.push({ y: 9e6, f: () => agua(ctx, V.eu.x, V.eu.y - 14, fx, fy + 20, t) });
          if(ef === 'contagem') L.push({ y: 9e6, f: () => pixPlaca(ctx, String(Math.max(0, Math.ceil(et.dur - p * et.dur))), V.eu.x, V.eu.y - 58, { fundo: INK, cor: '#38E1FF', borda: '#38E1FF' }) });
          if(ef === 'suor' || ef === 'vapor' || ef === 'apito') L.push({ y: 9e6, f: () => gotas(ctx, V.eu.x, V.eu.y - 36, t, ef) });
        }
      }
      if(T.mj) desenhaMj(L, ctx, t, vis, T);
      if(T.feita && T.feita.ate > agora && vis(T.feita.x, T.feita.y, 60)){ const f = T.feita; L.push({ y: 9e6, f: () => brilho(ctx, f.x, f.y - 12, t, true) }); }
    }
    if(V.festa && V.festa.ate > agora && vis(V.festa.x, V.festa.y, 80)){ const f = V.festa, p = 1 - (f.ate - agora) / 1800; L.push({ y: 9e6, f: () => confete(ctx, f.x, f.y - 20, p) }); }
  }
  function fogo(ctx, x, y, t, forca){
    const u = Math.max(1, 1.05 / V.k), n = Math.max(1, Math.round(5 * forca));
    for(let i = 0; i < n; i++){ const ph = t * 7 + i * 1.3, h = (16 + Math.sin(ph) * 6 + i * 3) * forca, w = 9 + (i % 2) * 4; const bx = x - 22 + i * 11 + Math.sin(ph * .5) * 3;
      ctx.fillStyle = '#E2412E'; ctx.fillRect(bx - w / 2, y - h, w, h); ctx.fillStyle = '#FF8A3D'; ctx.fillRect(bx - w / 2 + u, y - h * .7, w - 2 * u, h * .7); ctx.fillStyle = '#F2EC54'; ctx.fillRect(bx - u, y - h * .4, 2 * u, h * .4); }
    ctx.fillStyle = 'rgba(60,60,70,.35)'; for(let i = 0; i < 4; i++){ const ph = (t * .6 + i * .25) % 1; ctx.fillRect(x - 14 + i * 10 + Math.sin(t + i) * 5, y - 22 - ph * 50, 7 + ph * 8, 7 + ph * 8); }
  }
  function gatinho(ctx, x, y, t){
    const c = '#FF8A3D', u = Math.max(1, 1.05 / V.k);
    ctx.fillStyle = c; ctx.fillRect(x - 6, y - 4, 12, 7); ctx.fillRect(x - 5, y - 9, 8, 6); ctx.fillRect(x - 5, y - 11, 2, 2); ctx.fillRect(x + 1, y - 11, 2, 2);
    ctx.fillStyle = INK; ctx.fillRect(x - 3, y - 7, u, u); ctx.fillRect(x, y - 7, u, u);
    ctx.fillStyle = c; ctx.fillRect(x + 6, y - 3 + Math.round(Math.sin(t * 3)) , 5, 2);
    if(Math.sin(t * 1.3) > .6) pixPlaca(ctx, 'MIAU', x, y - 18, { fundo: PAPEL });
  }
  function brilho(ctx, x, y, t, grande){
    const u = Math.max(1, 1.05 / V.k), n = grande ? 7 : 4;
    for(let i = 0; i < n; i++){ const a = t * 2 + i * Math.PI * 2 / n, r = (grande ? 14 : 8) + Math.sin(t * 5 + i) * 3; ctx.fillStyle = i % 2 ? AMARELO : '#38E1FF'; ctx.fillRect(Math.round(x + Math.cos(a) * r) - u, Math.round(y + Math.sin(a) * r * .5) - u, 2 * u, 2 * u); }
    if(!grande){ ctx.fillStyle = PAPEL; ctx.fillRect(x - u, y - u, 2 * u, 2 * u); }
  }
  function fita(ctx, x, y, p){
    const w = 90, L = Math.max(2, 1.05 / V.k);
    ctx.fillStyle = '#4A4E56'; ctx.fillRect(x - w / 2 - 3, y - 30, 6, 30); ctx.fillRect(x + w / 2 - 3, y - 30, 6, 30);
    ctx.fillStyle = ROSA; if(p < 1){ const corte = p > 0 ? w * (1 - p) / 2 : w / 2; ctx.fillRect(x - w / 2, y - 22, corte, 4 * L / 2 + 2); ctx.fillRect(x + w / 2 - corte, y - 22, corte, 4 * L / 2 + 2); if(p > 0){ ctx.fillRect(x - w / 2 + corte - 4, y - 22, 4, 10 * p); ctx.fillRect(x + w / 2 - corte, y - 22, 4, 10 * p); } }
  }
  function agua(ctx, x0, y0, x1, y1, t){
    const u = Math.max(1, 1.05 / V.k);
    for(let i = 0; i < 9; i++){ const f = ((t * 1.6 + i * .11) % 1), x = x0 + (x1 - x0) * f, y = y0 + (y1 - y0) * f - Math.sin(f * Math.PI) * 30 + (i % 3) * 2; ctx.fillStyle = i % 3 ? '#38E1FF' : PAPEL; ctx.fillRect(Math.round(x) - u, Math.round(y) - u, 2 * u, 2 * u); }
  }
  function gotas(ctx, x, y, t, ef){
    const u = Math.max(1, 1.05 / V.k);
    for(let i = 0; i < 3; i++){ const f = (t * .9 + i * .33) % 1; ctx.fillStyle = ef === 'vapor' ? 'rgba(255,255,255,.7)' : ef === 'apito' ? AMARELO : '#38E1FF'; ctx.fillRect(Math.round(x - 8 + i * 8 + Math.sin(t * 3 + i) * 2) - u, Math.round(y - f * 18) - u, 2 * u, 2 * u); }
  }
  function confete(ctx, x, y, p){
    const u = Math.max(1, 1.05 / V.k), K = [ROSA, AMARELO, '#38E1FF', LILAS, PAPEL, LARANJA];
    for(let i = 0; i < 14; i++){ const a = i / 14 * Math.PI * 2, r = 10 + p * 34, g = p * p * 40; ctx.fillStyle = K[i % K.length]; ctx.fillRect(Math.round(x + Math.cos(a) * r) - u, Math.round(y + Math.sin(a) * r * .6 - 20 * p + g) - u, 2 * u, 2 * u); }
  }
  /* a folha do trampo: o uniforme (troca ali mesmo: o boneco veste na hora, sem passar pelo Avatar), a patente, as tarefas
     no rodízio (a que você pegou vai pro fim da fila) e a carteira */
  function trampoSheet(civ){
    const me = C.st.me; if(!me) return;
    const u = meuUniforme(), feitas = tarefasFeitas(), T = V.tarefa, c = civ ? CIVICOS[civ] : null, souPers = !!(V.eu && V.eu.av && V.eu.av.personagem);
    const foco = c ? c.u : u, nomeU = foco ? nomeUni(foco) : '';
    const pat = foco ? patenteDe(foco, feitas[foco]) : '', prox = foco ? NIVEIS.find(n => n > feitas[foco]) : null;
    const lista = foco ? naOrdem(foco) : [], R = foco ? ultDe(foco) : [], ultima = R[R.length - 1];
    const avDe = k => esc(JSON.stringify(avLimpo(Object.assign({}, me.verso, { skin: k, personagem: '' }), me.id)));
    const unis = SKINS.map(([k, n]) => { const on = !souPers && k === u, f = !on && k && k === foco;
      return `<button type="button" class="cvr-uni${on ? ' on' : ''}${f ? ' foco' : ''}" data-act="cvr-uni" data-u="${esc(k)}" aria-pressed="${on}" title="${esc(k ? 'Vestir: ' + n : 'Tirar o uniforme (a tua roupa)')}"><canvas class="cvr-mini" data-av="${avDe(k)}" width="18" height="28" aria-hidden="true"></canvas><b>${esc(k ? n : 'Minha roupa')}</b><small>${k ? (feitas[k] ? esc(patenteDe(k, feitas[k])) : `${(TAREFAS[k] || []).length} tarefas`) : 'sem uniforme'}</small></button>`; }).join('');
    const tarefa = (t, i) => { const ativa = T && T.u === foco && T.k === t.k;
      return `<li class="cvr-tf${ativa ? ' on' : ''}"><div><b>${esc(t.nome)}</b><small>${esc(t.desc)}</small><span class="tag">+${C.correalTxt(valorTarefa(t.pontos))}${t.tempo ? ` · ${t.tempo} s` : ''}</span>${mjDe(foco, t.k) ? `<span class="tag cvr-tf-mj">${MJ_ROTULO[mjDe(foco, t.k).t]}</span>` : foco === 'motoboy' && (t.k === 'entrega' || t.k === 'acai') ? '<span class="tag cvr-tf-mj">pode mudar o endereço</span>' : ''}${!ativa && lista.length > 1 && t.k === ultima ? '<span class="tag cvr-tf-ult">a última que você pegou</span>' : ''}</div>${ativa ? `<button type="button" class="btn sm ghost" data-act="cvr-larga-tarefa">Largar</button>` : `<button type="button" class="btn sm${i === 0 ? ' pri' : ''}" data-act="cvr-pega-tarefa" data-u="${esc(foco)}" data-k="${esc(t.k)}">${u === foco ? 'Pegar' : 'Vestir e pegar'}</button>`}</li>`; };
    const carteira = Object.keys(PATENTES).filter(k => feitas[k] > 0).map(k => `<span class="tag">${esc(nomeUni(k))}: ${feitas[k]} · ${esc(patenteDe(k, feitas[k]))}</span>`).join('');
    C.sheet(`<div class="form cvr-trampo"><div class="sheet-head"><h2>${ico('raio')} ${c ? esc(c.nome) : 'Trampo'}</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <div class="cvr-unis-w"><span class="lbl-s">Uniforme: toca e o boneco troca na hora</span><div class="cvr-unis" role="group" aria-label="Uniforme">${unis}</div></div>
      ${foco ? `<div class="cvr-casa-h"><canvas class="cvr-mini" data-av="${avDe(foco)}" width="18" height="28" aria-hidden="true"></canvas><div><b>${esc(nomeU)}${u === foco ? ' · você' : ''}</b><small>${esc(pat)} · ${feitas[foco]} ${feitas[foco] === 1 ? 'tarefa feita' : 'tarefas feitas'}${prox != null ? ` · faltam ${prox - feitas[foco]} pra subir` : ' · patente máxima'}</small></div></div>` : ''}
      ${!foco ? `<p class="note">Escolhe um uniforme aqui em cima: o boneco veste na hora e as tarefas dele aparecem. Policial na Delegacia, bombeiro no quartel, médico no Hospital; chef nos trucks, motoboy nas entregas, craque no Zerão e no Estádio, cientista no lago e no Bosque, detetive nos museus…</p>` : c && u !== foco ? `<p class="note">Aqui é lugar de ${esc(nomeU.toLowerCase())}. Você tá de ${esc(u ? nomeUni(u).toLowerCase() : 'roupa normal')}: o Vestir e pegar já troca o uniforme.</p>` : ''}
      ${c && u !== c.u ? `<div class="acts"><button type="button" class="btn" data-act="cvr-veste" data-u="${esc(c.u)}">${ico('eu')} ${esc(c.veste)}</button></div>` : ''}
      ${lista.length ? `<ul class="cvr-tfs">${lista.map(tarefa).join('')}</ul>` : ''}
      ${T && (!foco || T.u !== foco) ? `<p class="note">Em andamento: ${esc(T.def.nome)} (${esc(nomeUni(T.u))}). <button type="button" class="btn sm ghost" data-act="cvr-larga-tarefa">Largar</button></p>` : ''}
      <p class="fine">Patentes: ${carteira || 'nenhuma tarefa feita ainda'}. Uma tarefa por vez; a seta rosa mostra o alvo, e a que você pegou vai pro fim da fila, pra variar. A patente aparece na tua plaquinha pra quem passa. Cada tarefa paga centavos de correal, até ${C.correalFmt(C.correal.teto)} por dia${bateuTeto() ? ' (hoje já bateu: as tarefas seguem valendo patente)' : ''}: <button type="button" class="lnk" data-act="carteira">ver a carteira (${C.correal.saldo == null ? '…' : C.correalFmt(C.correal.saldo)})</button>.</p></div>`);
    document.querySelectorAll('.cvr-trampo .cvr-mini').forEach(cv => { try{ miniAvatar(cv, avLimpo(JSON.parse(cv.dataset.av))); }catch(e){} });
    const sel = document.querySelector('.cvr-unis .cvr-uni.foco') || document.querySelector('.cvr-unis .cvr-uni.on'), fila = sel && sel.parentElement;
    if(sel && fila) fila.scrollLeft = Math.max(0, sel.offsetLeft - (fila.clientWidth - sel.offsetWidth) / 2);
  }
  /* trocar de uniforme pelo Trampo (ou na porta da Delegacia, do quartel e do Hospital): veste na hora e guarda no perfil */
  async function vesteUniforme(u){
    if(!(u === '' || SKINS.some(s => s[0] === u)) || !C.st.me) return;
    const verso = vesteLocal(u); if(!verso) return;
    trampoSheet(u ? (Object.keys(CIVICOS).find(k => CIVICOS[k].u === u) || null) : null);
    try{ await C.saveMe({ verso }); if(V.eu && meuUniforme() === u){ V.eu.av = avLimpo(C.st.me.verso, C.st.me.id); anunciar(); } C.toast(u ? `Agora você tá de ${nomeUni(u).toLowerCase()}.` : 'De volta pra tua roupa.', 1800); }
    catch(e){ C.toast(C.errMsg(e, 'Não deu pra guardar o uniforme agora.')); }
  }
  /* ---------- tela ---------- */
  function ui(){
    if(!V.vivo) return;
    const on = C.$('cvr-on'); if(on){ const n = contaGente(); on.textContent = `${n} ${n === 1 ? 'pessoa' : 'pessoas'} na cidade${V.online === false ? ' · fora do ar' : ''}`; }
    const mb = C.$('cvr-mic'); if(mb){ mb.setAttribute('aria-pressed', String(V.mic)); mb.innerHTML = `${ico(V.mic ? 'mic' : 'micoff')}<span>${V.mic ? 'Mic ligado' : 'Mic desligado'}</span>`; }
    const vivos = [...V.peers.values()].filter(p => p.estado === 'aovivo'), lv = C.$('cvr-live');
    if(lv){ lv.hidden = !vivos.length; if(vivos.length) lv.innerHTML = `<i></i><b>AO VIVO</b><span>${vivos.map(p => { const r = V.remotos.get(p.sid); return esc(r ? (r.handle ? '@' + r.handle : r.nome) : '…') + (p.bot ? ' (demonstração, sem som)' : '') + (V.mudos.has(p.sid) ? ' (silenciado)' : ''); }).join(', ')}</span>`; }
    const hint = C.$('cvr-hint');
    if(hint){
      const mostra = quemAparece(), perto = V.eu ? [...V.remotos.values()].filter(r => mostra.has(r.sid) && r.mic && confia(r) && dist(V.eu, r) < R_ABRE * 1.4) : [];
      const msg = !V.mic && perto.length ? `${esc(perto[0].handle ? '@' + perto[0].handle : perto[0].nome)} tá com o mic ligado. Liga o teu pra conversar.` : V.mic && !V.peers.size && perto.length ? 'Conectando a voz…' : '';
      hint.hidden = !msg; hint.innerHTML = msg;
    }
  }
  function portaUI(){
    const b = C.$('cvr-porta'); if(!b) return;
    b.classList.remove('rio-ja');
    /* v3.75: no barco, o botão é da pesca (e de descer quando tá perto do píer) */
    if(V.eu && V.eu.barco){
      const f = V.rio && V.rio.fase, porto = !f && V.porta && V.porta.tipo === 'barco' && V.eu.barco.livre;
      b.hidden = false; b.disabled = f === 'lanca' || f === 'salto';
      b.innerHTML = porto ? `${ico('up')} Descer ${V.porta.k === 'prainha' ? 'na prainha' : 'no porto'}` : !f ? `${ico('peixe')} Jogar a linha` : f === 'lanca' ? `${ico('peixe')} Jogando…` : f === 'espera' ? `${ico('peixe')} Puxar` : f === 'fisgou' ? `${ico('raio')} Puxa!` : f === 'briga' ? `${ico('raio')} Segura: recolher` : `${ico('peixe')} Pegou!`;
      b.classList.toggle('rio-ja', f === 'fisgou'); padRotulo(); return;
    }
    if(V.eu && V.eu.sit){ b.hidden = false; b.innerHTML = `${ico('up')} Levantar`; return; }
    const p = V.porta; b.hidden = !p; if(!p) return;
    const meu = p.tipo === 'casa' && p.c.id === (C.st.me && C.st.me.id);
    if(p.tipo === 'tarefa'){ const T = V.tarefa, ag = T && T.fase === 'agindo', j = T && T.mj;
      /* v3.58: no minijogo o botão diz o que fazer agora (as setas não usam ele) */
      if(j && j.t === 'focos'){ b.innerHTML = `${ico('raio')} Segura: apagar`; b.disabled = false; return; }
      if(j && T.fase === 'jogando'){ b.disabled = j.t === 'seq'; b.innerHTML = `${ico('raio')} ${esc(j.t === 'tempo' ? j.verbo : j.t === 'segura' ? 'Segura: ' + j.verbo.toLowerCase() : 'Usa as setas')}`; return; }
      b.innerHTML = `${ico('raio')} ${esc(p.et.acao)}${ag ? '…' : ''}`; b.disabled = !!ag; return; }
    b.disabled = false;
    b.innerHTML = p.tipo === 'morador' ? `${ico('chat')} Trocar ideia com ${esc(p.m.nome)}` : p.tipo === 'barco' ? `${ico('peixe')} Pegar um barquinho` : p.tipo === 'aeroporto' ? `${ico('aviao')} Voar (${C.correalTxt(precoVoo())})` : p.tipo === 'sebo' ? `${ico('musica')} Entrar no Sebo` : p.tipo === 'calcadao' ? `${ico('gente')} Entrar no Calçadão 3D` : p.tipo === 'atelie' ? `${ico('star')} Ateliê: skins` : p.tipo === 'torneio' ? `${ico('peixe')} Torneio de Pesca` : p.tipo === 'beisebol' ? `${ico('raio')} Jogar beisebol na ACEL` : p.tipo === 'quadra' ? `${ico('raio')} ${p.k === 'quadra-futsal' ? 'Desafio de pênalti' : 'Desafio de arremesso'}` : p.tipo === 'publi' ? `${ico('ext')} ${esc((PUBLI[p.k] || {}).nome || '')}: baixar o app` : p.tipo === 'pista' ? `${ico('raio')} ${p.k === 'moto' ? 'Autódromo do Café' : 'Corrida de patinete'}` : p.tipo === 'civico' ? `${ico('raio')} ${esc(CIVICOS[p.k].entra)}` : p.tipo === 'barraca' ? (aberta(p.b) ? `${ico(p.b.ico)} ${esc(p.b.botao)}` : `${ico('eye')} Hórus desligado: ligar`) : p.tipo === 'comida' ? `${ico('banca')} ${esc(COMIDAS[p.k][0])}` : p.tipo === 'aquario' || p.tipo === 'jogo' ? `${ico('play')} Jogar ${esc(JOGOS[p.jogo].titulo)}` : p.tipo === 'placa' ? `${ico('eye')} Ler: ${esc(p.titulo)}` : p.tipo === 'polaroid' ? `${ico('camera')} Tirar foto com o Papai Noel` : p.tipo === 'banco' ? (p.pesca ? `${ico('gente')} Pescar no ${p.b.lugar.startsWith('Deck') ? 'deck' : 'píer'}` : `${ico('gente')} Sentar ${p.b.degrau ? 'na Concha' : 'no banco'}`) : p.tipo === 'mural' ? `${ico('tacha')} Abrir o Mural` : p.tipo === 'banca' ? `${ico('banca')} Banca do dia` : p.tipo === 'lote' ? `${ico('plus')} Lote livre` : meu ? `${ico('home')} Tua casa` : `${ico('home')} Bater na porta de @${esc(p.c.handle)}`;
  }
  function tamanhoTela(){
    const st = C.$('cvr-stage'); if(!st || !V.cv) return;
    const r = st.getBoundingClientRect(), tb = document.querySelector('.tabbar'), tbH = tb && getComputedStyle(tb).display !== 'none' ? tb.getBoundingClientRect().height + 18 : 18;
    /* v3.89: na tela cheia da cidade, o palco é a tela inteira */
    const h = document.body.classList.contains('cvr-cheia') ? innerHeight : Math.max(320, Math.round(innerHeight - r.top - tbH)); st.style.height = h + 'px';
    const w = st.clientWidth, iw = Math.max(80, Math.floor(w / PX)), ih = Math.max(80, Math.floor(h / PX)), fx = V.fx = fxCidade();
    V.cv.width = iw * fx; V.cv.height = ih * fx; V.cv.style.width = iw * PX + 'px'; V.cv.style.height = ih * PX + 'px'; V.ctx.__b = fx;
    V.cssW = iw * PX; V.cssH = ih * PX; V.z = (w < 560 ? .82 : 1) * zoomFator(); V.k = V.z / PX; V.kr = V.k * fx;
    V.sprites.clear(); V.doisS = null; PADS.clear();
  }
  /* v3.52 · quantos pontos de verdade por pixel de antes: 3 (a tela inteira, nítida); se os quadros ficam lentos, desce
     pra 1,5 e depois pra 1 (o de antes). O degrau fica guardado no aparelho por uma semana e aí tenta de novo */
  const FX_K = 'corre-verso-fx', FX_DEGRAUS = [1, 1.5, 3];
  function fxCidade(){
    if(V.fxAgora) return V.fxAgora;
    let f = 3; try{ const o = JSON.parse(localStorage.getItem(FX_K) || 'null'); if(o && FX_DEGRAUS.includes(o.f) && Date.now() - o.t < 7 * 864e5) f = o.f; }catch(e){}
    return (V.fxAgora = f);
  }
  function ajustaFx(dt, t){
    if(V.fxFixo || !(dt > 0) || dt > .2) return;
    V.fxMed = V.fxMed == null ? dt : V.fxMed * .95 + dt * .05;
    if(t - (V.fxT || 0) < 3 || V.fxMed < .04) return;
    const i = FX_DEGRAUS.indexOf(V.fxAgora); if(i <= 0) return;
    V.fxAgora = FX_DEGRAUS[i - 1]; V.fxT = t; V.fxMed = null;
    try{ localStorage.setItem(FX_K, JSON.stringify({ f: V.fxAgora, t: Date.now() })); }catch(e){}
    tamanhoTela();
  }
  /* o zoom da cidade: mais perto do boneco por padrão; roda do mouse ou pinça mudam, e fica guardado no aparelho */
  const ZOOM_K = 'corre-verso-zoom';
  function zoomFator(){ if(V.zoomF) return V.zoomF; let f = 1.5; try{ const v = parseFloat(localStorage.getItem(ZOOM_K)); if(Number.isFinite(v)) f = v; }catch(e){} V.zoomF = Math.max(.8, Math.min(2.4, f)); return V.zoomF; }
  let zoomT = 0;
  function poeZoom(f){
    V.zoomAntes = 0; V.zoomF = Math.max(.8, Math.min(2.4, f)); try{ localStorage.setItem(ZOOM_K, String(Math.round(V.zoomF * 100) / 100)); }catch(e){}
    clearTimeout(zoomT); zoomT = setTimeout(() => { if(V.vivo) tamanhoTela(); }, 90);
  }
  function rodaCidade(e){ if(!V.vivo) return; e.preventDefault(); poeZoom(zoomFator() * (e.deltaY < 0 ? 1.1 : 1 / 1.1)); }
  const pinca = { a: null, b: null, d0: 0, z0: 1 };
  function pincaBaixo(e){ if(!pinca.a){ pinca.a = { id: e.pointerId, x: e.clientX, y: e.clientY }; return; } if(!pinca.b && e.pointerId !== pinca.a.id){ pinca.b = { id: e.pointerId, x: e.clientX, y: e.clientY }; pinca.d0 = Math.hypot(pinca.a.x - pinca.b.x, pinca.a.y - pinca.b.y); pinca.z0 = zoomFator(); } }
  function pincaMove(e){ if(!pinca.a || !pinca.b) return; if(e.pointerId === pinca.a.id){ pinca.a.x = e.clientX; pinca.a.y = e.clientY; } else if(e.pointerId === pinca.b.id){ pinca.b.x = e.clientX; pinca.b.y = e.clientY; } else return; const d = Math.hypot(pinca.a.x - pinca.b.x, pinca.a.y - pinca.b.y); if(pinca.d0 > 20) poeZoom(pinca.z0 * d / pinca.d0); }
  function pincaSolta(e){ if(pinca.a && e.pointerId === pinca.a.id) pinca.a = null; if(pinca.b && e.pointerId === pinca.b.id) pinca.b = null; if(!pinca.a && pinca.b){ pinca.a = pinca.b; pinca.b = null; } }
  async function cidade(){
    let lista = [];
    try{ lista = (await C.api.rpc('corre_verso_cidade', { lim: 120 })) || []; }catch(e){ lista = []; }
    const me = C.st.me;
    if(me && !lista.some(p => p.id === me.id)) lista.push({ id: me.id, handle: me.handle, nome: me.nome, categoria: me.categoria || 'outros', verso: me.verso, posts: 0, seg: 0, itens: 0, esc: 0, soEu: true });
    return lista;
  }
  async function bloqueios(){
    try{ const rs = await C.api.q('corre_verso_bloq', { eq: { dono: C.uid() }, limit: 500 }); V.bloq = new Set(rs.map(r => r.quem)); }catch(e){ V.bloq = new Set(); }
  }

  /* ---------- o balcão: a barraca abre a ferramenta por cima da cidade ----------
     É o próprio Corre num iframe (?embed): sem menu, só a página da barraca. A cidade para de desenhar mas continua
     no ar (presença e voz) e, pra quem passa, você aparece "trampando". O mesmo iframe vai de barraca em barraca;
     fechou (Voltar pra rua, Esc, voltar do celular), você tá na frente da barraca, pronto pra próxima. */
  const BC = { el: null, fr: null, pronto: false, aberto: null, quer: '', inicial: '', timer: 0, hist: false, ignora: 0, titulo: '' };
  const urlBalcao = rota => location.pathname + location.search + (location.search ? '&' : '?') + 'embed&nomanual' + rota;
  function balcaoEl(){
    if(BC.el && BC.el.isConnected) return BC.el;
    const el = document.createElement('div'); el.className = 'cvr-balcao'; el.id = 'cvr-balcao'; el.hidden = true;
    el.innerHTML = `<section class="cvr-bc" role="dialog" aria-modal="true" aria-labelledby="cvr-bc-t">
      <div class="cvr-bc-toldo" aria-hidden="true"></div>
      <div class="cvr-bc-top"><button type="button" class="cvr-bc-b cvr-bc-volta" data-act="cvr-bc-fecha">${ico('prev')}<span class="cvr-bc-l">Voltar pra rua</span><span class="cvr-bc-s">Rua</span></button>
        <b class="cvr-bc-t" id="cvr-bc-t"></b>
        <button type="button" class="cvr-bc-b cvr-bc-pag" data-act="cvr-bc-pagina" title="Abrir na página inteira" aria-label="Abrir na página inteira">${ico('ext')}<span class="cvr-bc-l">Página</span></button></div>
      <div class="cvr-bc-corpo" id="cvr-bc-corpo"><div class="cvr-bc-load" id="cvr-bc-load"><i aria-hidden="true"></i><span>Abrindo a barraca…</span><p class="note" id="cvr-bc-dem" hidden>Tá demorando. <button type="button" class="btn sm" data-act="cvr-bc-pagina">Abrir na página</button></p></div></div>
    </section>`;
    document.body.appendChild(el); BC.el = el; return el;
  }
  function carregando(on){
    const l = C.$('cvr-bc-load'); if(l) l.hidden = !on;
    const d = C.$('cvr-bc-dem'); if(d) d.hidden = true;
    clearTimeout(BC.timer);
    if(on) BC.timer = setTimeout(() => { const dd = C.$('cvr-bc-dem'); if(dd && BC.aberto) dd.hidden = false; }, 9000);
  }
  const mandaBalcao = h => { try{ BC.fr.contentWindow.postMessage({ corre: 'balcao', t: 'ir', h }, location.origin); }catch(e){} };
  function abreBalcao(d){
    if(!V.vivo || !d || !d.rota) return;
    const el = balcaoEl(), novo = !BC.aberto;
    BC.aberto = d; V.teclas.clear(); V.alvo = null;
    if(V.eu){ V.eu.mov = false; V.eu.sit = false; V.eu.dir = 'cima'; }
    el.style.setProperty('--toldo', d.cor || AMARELO);
    C.$('cvr-bc-t').textContent = d.titulo;
    /* de dentro de casa, o botão volta pra casa (não pra rua) */
    const emCasa = !!(C.casa && C.casa.aberta()), noLugar = emCasa && C.casa.lugar && C.casa.lugar(), lb = el.querySelector('.cvr-bc-volta .cvr-bc-l'), ls = el.querySelector('.cvr-bc-volta .cvr-bc-s'); if(lb) lb.textContent = noLugar ? 'Voltar pra sala' : emCasa ? 'Voltar pra casa' : 'Voltar pra rua'; if(ls) ls.textContent = noLugar ? 'Sala' : emCasa ? 'Casa' : 'Rua';
    if(novo) BC.titulo = document.title;
    document.title = d.titulo + ' · Correverso';
    el.hidden = false;
    /* o "voltar" do celular fecha o balcão (e não sai da cidade) */
    if(novo && !BC.hist){ try{ history.pushState({ cvrBalcao: 1 }, ''); BC.hist = true; }catch(e){} }
    carregando(true);
    BC.quer = d.rota;
    if(!BC.fr){
      const fr = document.createElement('iframe');
      fr.title = 'Ferramenta da barraca'; fr.setAttribute('allow', 'clipboard-read; clipboard-write; geolocation; fullscreen');
      fr.src = urlBalcao(d.rota); BC.fr = fr; BC.pronto = false; BC.inicial = d.rota;
      C.$('cvr-bc-corpo').appendChild(fr);
    } else if(BC.pronto) mandaBalcao(d.rota);
    if(novo){ anunciar(); }
    setTimeout(() => { try{ if(BC.aberto === d) (BC.pronto ? BC.fr : el.querySelector('.cvr-bc-volta')).focus(); }catch(e){} }, 80);
  }
  function fechaBalcao(dePop){
    if(!BC.aberto) return;
    BC.aberto = null; clearTimeout(BC.timer);
    if(BC.el) BC.el.hidden = true;
    if(BC.titulo){ document.title = BC.titulo; BC.titulo = ''; }
    /* a página de dentro para (Studio, mapa do Hórus...): nada fica rodando escondido */
    BC.quer = '#/fechado'; if(BC.fr && BC.pronto) mandaBalcao('#/fechado');
    if(BC.hist){ BC.hist = false; if(!dePop){ BC.ignora = Date.now(); try{ history.back(); }catch(e){ BC.ignora = 0; } } }
    V.tAnt = 0; V.teclas.clear();
    if(V.vivo){ anunciar(); portaUI(); }
    /* o que mudou lá dentro (ligou o Hórus, mexeu no perfil) vale aqui fora também */
    if(C.recarregaMe) C.recarregaMe().then(() => { if(!V.vivo || !V.cid) return; V.sol = solidos(); V.portas = portas(); V.porta = null; portaUI(); }).catch(() => {});
    setTimeout(() => { const b = C.$('cvr-porta'); if(b && !b.hidden) try{ b.focus({ preventScroll: true }); }catch(e){} }, 0);
  }
  /* "Página": a ferramenta na página inteira (sai da cidade, com o "Voltar pro Correverso" pra voltar na barraca) */
  function paginaBalcao(){
    const d = BC.aberto; if(!d) return;
    const tinha = BC.hist; BC.hist = false;
    V.saiPor = d.id || 'barraca';
    fechaBalcao(true);
    /* troca a marca do balcão pela página: o "voltar" de lá cai na cidade, não num balcão fantasma */
    if(tinha) location.replace(d.rota); else C.go(d.rota);
  }
  function desmontaBalcao(){
    clearTimeout(BC.timer);
    if(BC.el){ try{ BC.el.remove(); }catch(e){} }
    if(BC.titulo){ document.title = BC.titulo; }
    Object.assign(BC, { el: null, fr: null, pronto: false, aberto: null, quer: '', inicial: '', hist: false, titulo: '' });
  }
  addEventListener('message', e => {
    if(e.origin !== location.origin || !BC.fr || e.source !== BC.fr.contentWindow) return;
    const m = e.data; if(!m || m.corre !== 'balcao') return;
    if(m.t === 'pronto'){
      BC.pronto = true;
      if(!BC.aberto) mandaBalcao('#/fechado');
      else if(BC.quer !== BC.inicial) mandaBalcao(BC.quer);
      else { carregando(false); try{ BC.fr.focus(); }catch(err){} }
    }
    else if(m.t === 'rota'){ if(BC.aberto && BC.pronto && m.h !== '#/fechado') carregando(false); }
    else if(m.t === 'fechar') fechaBalcao();
  });
  addEventListener('popstate', () => {
    if(BC.ignora && Date.now() - BC.ignora < 1500){ BC.ignora = 0; return; }
    BC.ignora = 0;
    if(BC.aberto){ BC.hist = false; fechaBalcao(true); }
  });

  C.views.verso = async function(app){
    sair();
    document.title = 'Correverso · Corre';
    app.innerHTML = C.header('verso') + `<main class="wrap cvr" id="cvr"><div class="cvr-stage" id="cvr-stage"><div class="cvr-load"><b>Correverso</b><span>Abrindo a cidade…</span></div></div></main>`;
    chipVolta();
    if(!C.st.me) return;
    /* v3.90: a tela cheia do navegador sai aqui, ainda no toque que trouxe pra cidade (depois das esperas do banco o
       navegador já não deixa); a cidade cobrindo o Corre entra no abreCidade */
    V.telaFalta = true; if(C.tela){ C.tela.fica = 'cidade'; C.tela.poe('cidade'); }
    const gen = V.gen;
    let lista = [];
    /* o avatar vem sempre do banco: o boneco que você montou no celular é o mesmo no computador
       (antes, uma aba aberta há dias andava com o avatar velho, e às vezes até pedia pra montar outro) */
    try{ const r = await Promise.all([cidade(), bloqueios(), C.recarregaMe ? C.recarregaMe().catch(() => {}) : null]); lista = r[0] || []; }catch(e){ lista = lista || []; }
    if(gen !== V.gen || !C.$('cvr-stage')) return;
    if(!C.st.me.verso){ avatarSheet(true); }
    /* se alguma coisa quebrar no meio da montagem, a cidade não fica preta: avisa e deixa tentar de novo */
    try{ abreCidade(lista); }
    catch(e){
      try{ console.error('[correverso]', e); }catch(_){}
      sair(); cidadeCheia(false);
      const st = C.$('cvr-stage');
      if(st) st.innerHTML = `<div class="cvr-load cvr-erro"><b>Correverso</b><span>A cidade travou ao abrir.</span><button type="button" class="btn sm pri" data-act="cvr-de-novo">Tentar de novo</button><small>${esc(String((e && e.message) || e).slice(0, 140))}</small></div>`;
    }
  };
  function abreCidade(lista){
    const me = C.st.me;
    V.cid = montaCidade(lista); V.sol = solidos(); V.portas = portas(); V.carros = montaCarros(V.cid); V.bolas = novasBolas(V.cid);
    const st = C.$('cvr-stage');
    st.innerHTML = `<canvas id="cvr-cv" aria-label="A cidade do Correverso. Anda com as setas ou W A S D, ou toca onde quer ir."></canvas>
      <div class="cvr-top"><button type="button" class="cvr-sair" data-act="cvr-sai-cidade" aria-label="Sair do Correverso">${ico('prev')}<span class="cvr-sair-l">Sair do Correverso</span><span class="cvr-sair-c" aria-hidden="true">Sair</span></button><span class="cvr-sair-dica" id="cvr-sair-dica" role="status" hidden></span><span class="cvr-tt">${ico('verso')} Correverso</span><span class="cvr-on" id="cvr-on"></span><button type="button" class="cvr-live" id="cvr-live" data-act="cvr-gente" hidden></button><span class="cvr-zona" id="cvr-zona" hidden></span><button type="button" class="cvr-evento" id="cvr-evento" data-act="cvr-evento" hidden></button><button type="button" class="cvr-tarefa" id="cvr-tarefa" data-act="cvr-trampo" hidden></button><button type="button" class="cvr-correal" id="cvr-correal" data-act="carteira" title="Carteira de correal" aria-label="Carteira de correal">${ico('correal')}<b class="num" data-correal-saldo>${C.correal.saldo == null ? '…' : C.correalFmt(C.correal.saldo)}</b></button><button type="button" class="cvr-som" id="cvr-som" data-act="cvr-som" aria-pressed="false" hidden></button><button type="button" class="cvr-som cvr-tela" id="cvr-tela" data-act="cvr-tela" aria-pressed="false"></button></div>
      <p class="cvr-hint" id="cvr-hint" hidden></p>
      <button type="button" class="cvr-mapinha" id="cvr-mapinha" data-act="cvr-mapa" title="Mapa" aria-label="Minimapa: onde você tá na cidade. Toca pra abrir o mapa grande e viajar"><canvas id="cvr-mapinha-cv" width="140" height="104" aria-hidden="true"></canvas></button>
      <div class="cvr-mj" id="cvr-mj" hidden></div><div class="cvr-mj cvr-rio" id="cvr-rio" hidden></div><div class="cvr-mj cvr-sk" id="cvr-sk" hidden></div>
      <button type="button" class="cvr-porta" id="cvr-porta" data-act="cvr-porta" hidden></button>
      <div class="cvr-bar"><button type="button" class="cvr-b mic" id="cvr-mic" data-act="cvr-mic" aria-pressed="false"></button><button type="button" class="cvr-b" data-act="cvr-avatar" title="Avatar" aria-label="Avatar">${ico('eu')}<span>Avatar</span></button><button type="button" class="cvr-b" data-act="cvr-garagem" title="Garagem: como você anda pela cidade" aria-label="Garagem">${ico('carro')}<span>Garagem</span></button><button type="button" class="cvr-b" data-act="cvr-casa" title="Voltar pra casa" aria-label="Voltar pra casa">${ico('home')}<span>Pra casa</span></button><button type="button" class="cvr-b" data-act="cvr-mapa" title="Mapa" aria-label="Mapa">${ico('mapa')}<span>Mapa</span></button><button type="button" class="cvr-b" data-act="cvr-falar" title="Falar uma frase" aria-label="Falar uma frase" aria-expanded="false">${ico('chat')}<span>Falar</span></button><button type="button" class="cvr-b" data-act="cvr-gente" title="Quem tá na cidade" aria-label="Quem tá na cidade">${ico('gente')}<span>Gente</span></button><button type="button" class="cvr-b" data-act="cvr-trampo" title="Trampo: as tarefas do teu uniforme" aria-label="Trampo">${ico('raio')}<span>Trampo</span></button></div>
      <div class="cvr-falas" id="cvr-falas" hidden>${FALAS.map((f, i) => `<button type="button" data-act="cvr-fala" data-i="${i}">${esc(f)}</button>`).join('')}</div>`;
    V.cv = C.$('cvr-cv'); V.ctx = V.cv.getContext('2d');
    /* v3.58: o botão amarelo no minijogo responde no toque (não espera o clique) e segura enquanto o dedo tá nele */
    { const bp = C.$('cvr-porta'); bp.addEventListener('pointerdown', () => { if(mjAperta() || rioAperta()) V.mjIgn = Date.now(); }); ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => bp.addEventListener(ev, () => { mjHold(false); rioSolta(); })); }
    tamanhoTela();
    C.correalCarrega().then(() => correalUI(false)).catch(() => {});
    /* você sai pela porta da tua casa; se acabou de sair da cidade (Mural, Banca, casa de alguém...), volta pra onde tava */
    const d = V.cid.dois, minha = d && d.id === me.id ? d : V.cid.casas.find(x => x.id === me.id) || V.cid.casas[0];
    const casa = minha ? { x: minha.portaX, y: minha.base + 12 } : { x: V.cid.praca.cx, y: V.cid.praca.cy + 130 };
    V.casa = casa;
    const vt = voltaLe(), lv = vt && vt.x >= 0 && vt.x <= V.cid.W && vt.y <= V.cid.H ? pertoLivre(vt.x, vt.y) : null, ini = lv || casa;
    voltaGrava(null); V.saiPor = '';
    V.eu = { sid, x: ini.x, y: ini.y, dir: 'baixo', passo: 0, mov: false, av: avLimpo(me.verso, me.id) };
    V.cam.x = ini.x; V.cam.y = ini.y - 40; V.entrando = lv && !vt.porta ? 0 : .55; V.alvo = null; V.remotos = new Map(); V.peers = new Map(); V.espera = new Map(); V.mudos = new Set();
    V.vivo = true; V.online = null; V.tarefa = null; V.portaT = null; V.festa = null; V.gols = 0; V.rio = null; V.rastro = []; V.sk = null;
    V.bots = [];
    /* v3.76: os moradores (do aparelho de cada um, como os bots da demonstração: entram no V.remotos com npc) */
    V.moradores = criaMoradores(); V.moradores.forEach(m => V.remotos.set(m.sid, m)); V.paradoT = 0;
    if(C.DEMO){
      V.cid.casas.filter(c => c.p.ex || /^ex\d/.test(c.id)).slice(0, 3).forEach((c, i) => {
        const b = { sid: 'bot-' + c.id, bot: true, uid: c.id, handle: c.handle, nome: c.nome, av: avLimpo(c.p.verso, c.id), mic: i === 0, x: c.portaX, y: c.base + 40, dir: 'baixo', passo: 0, mov: false, esp: 1 + i, casa: { x: c.portaX, y: c.base } };
        V.bots.push(b); V.remotos.set(b.sid, b);
      });
    }
    V.rede = C.LIVE ? redeLive(H) : redeDemo(H);
    if(!V.rede){ V.online = false; }
    V.prox = setInterval(proximidade, 400);
    /* v4.0: a faixa dos eventos (AO VIVO) e o som do show, de segundo em segundo */
    clearInterval(V.evT); V.palco = null; V.evAvisou = ''; V.evT = setInterval(evtTick, 1000); setTimeout(evtTick, 600);
    V.bate = setInterval(() => { if(V.vivo){ enviaPos(true); ui(); } }, 10e3);
    V.avSync = setInterval(() => { if(V.vivo && document.visibilityState === 'visible') sincronizaAvatar(); }, 60e3);
    addEventListener('keydown', tecla); addEventListener('keyup', tecla); addEventListener('blur', soltar); addEventListener('resize', tamanhoTela); addEventListener('hashchange', aoSairDaRota); addEventListener('pagehide', sair);
    V.cv.addEventListener('pointerdown', toque);
    V.cv.addEventListener('wheel', rodaCidade, { passive: false });
    V.cv.addEventListener('pointerdown', pincaBaixo); V.cv.addEventListener('pointermove', pincaMove); V.cv.addEventListener('pointerup', pincaSolta); V.cv.addEventListener('pointercancel', pincaSolta);
    ui(); portaUI();
    V.tAnt = 0; V.fxT = performance.now() / 1000; V.fxMed = null; V.raf = requestAnimationFrame(laco);
    /* v3.40: o controle de videogame na tela (celular), a música e os sons da cidade */
    V.voo = null; V.passoN = 0;
    if(C.pad && C.pad.toque()){ V.pad = C.pad.cria(st, { pula: () => { if(!mjAperta() && !rioAperta()) pula(); }, soltou: () => { mjHold(false); rioSolta(); } }); st.classList.add('toque'); padRotulo(); }
    if(C.versoSom) C.versoSom.entra(C.$('cvr-som'), () => ({ voz: [...V.peers.values()].some(p => p.estado === 'aovivo'), pausa: !!V.jogo, casa: !!(C.casa && C.casa.aberta()), balcao: !!BC.aberto }));
    /* v3.90: o Correverso é tela cheia do começo ao fim (a do navegador já foi pedida no C.views.verso, ainda no toque) */
    cidadeCheia(true); sairDica(); dicaIphone();
    st.addEventListener('pointerdown', telaToque, true); st.addEventListener('pointerup', telaToque, true);
  }
  function aoSairDaRota(){ if(!/^#\/verso/.test(location.hash)) sair(); }
  /* ---------- v3.89/v3.90 · a tela cheia da cidade ----------
     v3.89 (o Thales: "coloca opção de full screen do jogo todo no celular"): o botão dos cantos, no alto da cidade. v3.90
     (o Thales: "faça o jogo inteiro full screen, desde que entra no Correverso fica tudo full"): toda entrada na cidade
     já é tela cheia, sem perguntar e sem lembrar o contrário. São duas coisas juntas: a cidade cobre a tela toda (some o
     cabeçalho, o menu e a barra de baixo do Corre; vale em qualquer celular, o iPhone inclusive) e, onde o navegador
     deixa, a barra dele some também (C.tela, dono e fica 'cidade': o 3D e os jogos que abrem e fecham devolvem a tela
     cheia pra cidade). Pra voltar pro Corre, o Sair amarelo no alto à esquerda (só aparece em tela cheia) ou o voltar.
     Os cantinhos tiram a tela cheia até sair da cidade (o menu do Corre volta a aparecer do lado) */
  function cidadeCheia(on){
    document.body.classList.toggle('cvr-cheia', !!on);
    if(C.tela){ C.tela.fica = on ? 'cidade' : null; if(on) C.tela.poe('cidade'); else C.tela.tira('cidade'); }
    const b = C.$('cvr-tela'); if(b){ b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.title = on ? 'Sair da tela cheia (fica na cidade, com o menu do Corre)' : 'Tela cheia: a cidade na tela toda'; b.setAttribute('aria-label', b.title); b.innerHTML = ico(on ? 'janela' : 'cheia'); }
    if(V.vivo) tamanhoTela();
  }
  /* a tela cheia do navegador que não veio (a cidade aberta sem toque: recarregou, link direto) ou que caiu (no celular:
     trocou de app, o voltar) volta no próximo toque na cidade. Com o mouse e o teclado, só a que nunca veio: no
     computador o Esc é pedido da pessoa. O navegador só conta como toque o pointerdown do mouse e o pointerup do dedo */
  function telaToque(ev){
    if(!document.body.classList.contains('cvr-cheia') || !C.tela || !C.tela.pode() || C.tela.el()) return;
    const rato = ev.type === 'keydown' || ev.pointerType === 'mouse';
    if(ev.type === 'pointerdown' ? !rato : ev.type === 'pointerup' && rato) return;
    if(rato && !V.telaFalta) return;
    if(ev.target && ev.target.closest && ev.target.closest('.cvr-tela, .cvr-sair')) return;
    C.tela.poe('cidade');
  }
  addEventListener('keydown', ev => { if(V.vivo && V.telaFalta && ev.key !== 'Escape' && !(ev.target && ev.target.closest && ev.target.closest('input, textarea, select, [contenteditable]'))) telaToque(ev); });
  if(C.tela) C.tela.ouve(() => { if(C.tela.el()) V.telaFalta = false; });
  /* de onde a pessoa veio, pro Sair levar de volta; e saindo da cidade por qualquer caminho (até no meio do "Abrindo a
     cidade…", antes de ela montar), a tela cheia sai junto */
  addEventListener('hashchange', ev => {
    const aqui = /^#\/verso/.test(location.hash);
    if(aqui){ try{ const de = new URL(ev.oldURL).hash; if(de && !/^#\/verso/.test(de)) V.de = de; }catch(e){} return; }
    if(document.body.classList.contains('cvr-cheia') || (C.tela && C.tela.fica === 'cidade')) cidadeCheia(false);
  });
  /* o balão que aponta o Sair, nas três primeiras vezes */
  const SAIR_DICA_K = 'corre-cidade-dica';
  function sairDica(){
    const d = C.$('cvr-sair-dica'); if(!d) return; let n = 0; try{ n = +localStorage.getItem(SAIR_DICA_K) || 0; }catch(e){}
    if(n >= 3){ d.hidden = true; return; }
    try{ localStorage.setItem(SAIR_DICA_K, String(n + 1)); }catch(e){}
    d.textContent = 'Pra voltar pro Corre, é aqui' + (V.pad ? ' (ou o voltar do celular)' : ' (ou o voltar do navegador)'); d.hidden = false;
    /* logo embaixo do Sair (a faixa de cima quebra em duas linhas no celular, e embaixo dela o bico apontaria pra outra coisa) */
    const sa = d.parentElement && d.parentElement.querySelector('.cvr-sair'); if(sa && sa.offsetHeight) d.style.top = (sa.offsetTop + sa.offsetHeight + 12) + 'px';
    clearTimeout(V.sairDicaT); V.sairDicaT = setTimeout(() => { d.classList.add('some'); setTimeout(() => { d.hidden = true; d.classList.remove('some'); }, 450); }, 7000);
  }
  /* v4.0 · o Thales: "no cel não tá abrindo full screen". No iPhone, o Safari não deixa site nenhum esconder as barras
     (só vídeo vai pra tela cheia); com o Corre na Tela de Início, a barra do relógio fica transparente por cima da cidade
     (black-translucent no index.html) e aí é a tela inteira. Então, no Safari do iPhone, ensina o caminho (3 vezes) */
  function dicaIphone(){
    const ua = navigator.userAgent || '', ios = /iPhone|iPod/.test(ua) || (/iPad|Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    let app = false; try{ app = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches; }catch(e){}
    if(!ios || app || (C.tela && C.tela.pode())) return;
    let n = 0; try{ n = +localStorage.getItem('corre-ios-cheia') || 0; if(n >= 3) return; localStorage.setItem('corre-ios-cheia', String(n + 1)); }catch(e){ return; }
    clearTimeout(V.iosT); V.iosT = setTimeout(() => { if(/^#\/verso/.test(location.hash)) C.toast('No iPhone, a tela cheia de verdade é com o Corre na Tela de Início: toca em Compartilhar e depois em Adicionar à Tela de Início.', 9000); }, 7600);
  }
  /* sair da cidade nunca pode travar no meio: cada passo da limpeza é independente
     (antes, um erro aqui deixava a rede e os ouvintes pendurados e a cidade não abria de novo) */
  function sair(){
    V.gen = (V.gen || 0) + 1;
    /* v3.55: o "quem é quem" e a placa do bairro começam do zero na próxima entrada */
    QUEM.clear(); clearTimeout(quemR); V.zona = null;
    if(C.casa && C.casa.aberta()) try{ C.casa.fechar(true); }catch(e){}
    const tenta = f => { try{ f(); }catch(e){} };
    tenta(() => fechaJogo(true));
    tenta(() => fechaPola());
    tenta(() => { if(V.pad){ V.pad.destroi(); V.pad = null; } });
    tenta(() => { if(C.versoSom) C.versoSom.sai(); });
    /* saiu no meio do voo: chega no destino (o voo tava pago) */
    if(V.voo){ const d = V.voo.ate; if(V.eu && d){ V.eu.x = d.x; V.eu.y = d.y; } V.voo = null; }
    if(V.vivo && V.eu && V.cid) tenta(() => voltaGrava({ x: Math.round(V.eu.x), y: Math.round(V.eu.y), t: Date.now(), porta: V.saiPor || '' }));
    if(V.stream){ const s = V.stream; tenta(() => s.getTracks().forEach(t => t.stop())); }
    V.stream = null; V.mic = false; V.anEu = null; V.pedindoMic = false;
    if(!V.vivo && !V.rede) return;
    voltaZoom(); V.vivo = false; tenta(() => cancelAnimationFrame(V.raf)); clearInterval(V.prox); clearInterval(V.bate); clearInterval(V.avSync); clearInterval(V.evT); V.palco = null; if(C.versoSom && C.versoSom.show) tenta(() => C.versoSom.show(0));
    for(const k of [...V.peers.keys()]) tenta(() => fechar(k, true));
    V.peers = new Map();
    const r = V.rede; V.rede = null; if(r) tenta(() => r.sair());
    tenta(() => { removeEventListener('keydown', tecla); removeEventListener('keyup', tecla); removeEventListener('blur', soltar); removeEventListener('resize', tamanhoTela); removeEventListener('hashchange', aoSairDaRota); removeEventListener('pagehide', sair); });
    V.teclas.clear(); V.remotos = new Map(); V.bots = []; V.moradores = []; V.carros = []; V.bolas = []; V.tarefa = null; V.portaT = null; V.porta = null;
    tenta(desmontaBalcao);
  }
  const TECLAS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'a', 'd', 'w', 's']);
  function tecla(e){
    if(V.jogo){ V.teclas.clear(); return; }
    /* v4.03: com a polaroid na tela a cidade não anda; o Esc fecha ela */
    if(PO.on){ V.teclas.clear(); if(e.type === 'keydown' && e.key === 'Escape'){ e.preventDefault(); fechaPola(); } return; }
    if(BC.aberto){ V.teclas.clear(); if(e.type === 'keydown' && e.key === 'Escape'){ e.preventDefault(); fechaBalcao(); } return; }
    if(C.casa && C.casa.aberta()){ V.teclas.clear(); return; }
    const alvo = e.target, digitando = alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.tagName === 'SELECT' || alvo.isContentEditable);
    const sh = C.$('sheet'); if(digitando || (sh && !sh.hidden)){ V.teclas.clear(); return; }
    /* v3.43: Espaço ou Enter num grupo do menu (ou na Carteira, no sino) que a pessoa alcançou pelo Tab abre ele, não pula */
    if(C.teclaDoMenu && C.teclaDoMenu(e)) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    /* v3.58: no minijogo da tarefa, as setas digitam a sequência e o espaço/Enter tocam ou seguram */
    const Tm = V.tarefa, mj = Tm && Tm.mj && (Tm.fase === 'jogando' || Tm.mj.t === 'focos') ? Tm.mj : null;
    if(mj){
      if(mj.t === 'seq' && SETAK[k]){ e.preventDefault(); V.teclas.clear(); if(e.type === 'keydown' && !e.repeat) mjSeta(SETAK[k]); return; }
      if(k === ' ' || k === 'Enter'){
        if(mj.t === 'tempo'){ e.preventDefault(); if(e.type === 'keydown' && !e.repeat) mjToque(); return; }
        if(deSegurar(mj) && (mj.t !== 'focos' || V.portaT || e.type === 'keyup')){ e.preventDefault(); if(e.type === 'keyup' || !e.repeat) mjHold(e.type === 'keydown'); return; }
        if(mj.t === 'seq'){ e.preventDefault(); return; }
      }
      if(mj.t !== 'focos' && TECLAS.has(k)){ e.preventDefault(); V.teclas.clear(); return; }
    }
    /* v3.75: no barco, espaço e Enter são da pesca (jogar, puxar, segurar na briga e soltar) */
    if(V.eu && V.eu.barco && !mj && (k === ' ' || k === 'Enter')){ e.preventDefault(); if(e.type === 'keydown' && !e.repeat) rioAperta(); else if(e.type === 'keyup') rioSolta(); return; }
    if(TECLAS.has(k)){ e.preventDefault(); if(e.type === 'keydown') V.teclas.add(k); else V.teclas.delete(k); }
    /* v3.40: espaço pula (de moto e de carro, buzina); B buzina (ou toca a campainha da bike) */
    else if(k === ' '){ e.preventDefault(); if(e.type === 'keydown' && !e.repeat) pula(); }
    else if(e.type === 'keydown' && k === 'b' && !e.repeat){ buzina(); }
    else if(e.type === 'keydown' && (k === 'Enter' || k === 'e') && V.porta){ e.preventDefault(); abrePorta(); }
  }
  /* ---------- v3.40 · pular e buzinar ---------- */
  function pula(){
    const e = V.eu; if(!e || V.voo || !V.vivo) return;
    if(e.sit){ e.sit = false; e.pesca = null; portaUI(); enviaPos(true); return; }
    /* v3.76: na pista de skate o pulo é ollie; no ar, apertar de novo é a manobra */
    if(V.sk && V.sk.on && !e.barco){ if(V.sk.ar) skManobra(); else if(alturaPulo(e) === 0) skSalta('ollie', 540, 1.1); return; }
    const vi = veiculoInfo(e);
    if(vi && vi.botao === 'buzina'){ buzina(); return; }
    if(alturaPulo(e) > 0) return;
    e.puT = performance.now(); e.puN = ((e.puN || 0) % 999) + 1; enviaPos(true);
    const S = C.versoSom; if(S){ S.pulo(vi && vi.k === 'skate' ? 'skate' : ''); setTimeout(() => { if(V.vivo && S.ativo()) S.cai(vi ? .55 : 1); }, PULO_MS - 40); }
  }
  function buzina(){
    const e = V.eu, vi = veiculoInfo(e); if(!e || !vi || !vi.buzina || V.voo) return;
    const agora = Date.now(); if(V.buzT && agora - V.buzT < 900) return; V.buzT = agora;
    if(C.versoSom) C.versoSom.buzina(vi.buzina);
    falaAuto(vi.buzina === 'bike' ? 8 : 7);
  }
  /* o botão da direita do controle: Pular, ou Buzinar de moto e de carro */
  function padRotulo(){ if(!V.pad) return; if(V.eu && V.eu.barco){ const f = V.rio && V.rio.fase; V.pad.rotulo('peixe', !f ? 'Pescar' : f === 'espera' ? 'Puxar' : f === 'fisgou' ? 'Puxa!' : f === 'briga' ? 'Segura' : 'Pescar'); return; } const vi = veiculoInfo(V.eu); if(vi && vi.botao === 'buzina') V.pad.rotulo('buzina', 'Buzinar'); else V.pad.rotulo('up', 'Pular'); }
  /* trocou de veículo na garagem (ou pegou o skate em casa): o boneco troca na hora e todo mundo vê */
  function trocaVeiculo(){ const me = C.st.me; if(!V.eu || !me) return; V.eu.av = avLimpo(me.verso, me.id); padRotulo(); anunciar(); }
  /* a miniatura da garagem: o teu boneco no veículo, de lado */
  function miniVeiculo(cv, k, ci){
    const ctx = cv.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = '#E6DECD'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.fillStyle = '#D5CBB5'; ctx.fillRect(0, cv.height - 6, cv.width, 6);
    const me = C.st.me || {}, av = avLimpo(me.verso, me.id || 'x');
    skin(ctx, av, Math.floor(cv.width / 2) + (k && C.veiculos && C.veiculos.porK(k) && C.veiculos.porK(k).tipo === 'carro' ? 0 : 2), cv.height - 6, 'dir', .4, 1, '', { vc: k || '', vcor: ci });
  }
  function soltar(){ V.teclas.clear(); }
  function toque(e){
    if(pinca.a && pinca.b) return;
    const r = V.cv.getBoundingClientRect(), z = V.z;
    const x = V.cam.x + (e.clientX - r.left - r.width / 2) / z, y = V.cam.y + (e.clientY - r.top - r.height / 2) / z;
    let alvo = { x, y }; for(const p of V.portas){ if(Math.hypot(p.x - x, p.y - 30 - y) < 70){ alvo = { x: p.x, y: p.y }; break; } }
    V.alvo = alvo;
  }

  /* ---------- folhas ---------- */
  /* desenho pequeno em pixel: avatar numa telinha que o CSS aumenta sem borrar */
  function miniAvatar(cv, av, dir, fase){ const ctx = cv.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.fillStyle = '#E6DECD'; ctx.fillRect(0, 0, cv.width, cv.height); skin(ctx, av, Math.floor(cv.width / 2), cv.height - 2, dir || 'baixo', fase == null ? null : fase, 1); }
  /* ---------- o jogo do aquário: abre por cima da cidade, numa moldura com o botão de sair; a cidade espera ----------
     v3.89 (o Thales: "você esqueceu de colocar full screen no jogo do macaco, que é 3D também"): os jogos entram em tela
     cheia como o 3D da casa (C.tela, no core.js, no toque de abrir) e a moldura ficou no jeito dele: o Sair amarelo no
     alto à esquerda, sempre escrito, o botão dos cantos na direita e o balão que aponta o Sair nas três primeiras vezes.
     O Esc aqui não fecha o jogo (o teclado é do jogo, lá dentro); em tela cheia, o primeiro Esc do navegador só tira
     ela. Fechar o jogo (o Sair ou o voltar) tira a tela cheia junto */
  function abreJogo(id){
    const j = JOGOS[id]; if(!j || !V.vivo) return;
    fechaJogo(true, true); if(C.tela && C.tela.quer()) C.tela.poe('jogo');
    let el = document.getElementById('cvr-jogo');
    if(!el){ el = document.createElement('div'); el.id = 'cvr-jogo'; el.className = 'cvr-jogo'; document.body.appendChild(el); }
    const sai = j.sair || 'Sair do aquário';
    el.innerHTML = `<div class="cvr-jogo-top"><button type="button" class="cvr-bc-b cvr-jogo-x" data-act="cvr-jogo-sair" aria-label="${esc(sai)}">${ico('prev')}<span class="cvr-jogo-xl">${esc(sai)}</span><span class="cvr-jogo-xc" aria-hidden="true">Sair</span></button><span class="cvr-jogo-t"><b>${esc(j.titulo)}</b><small>${esc(j.onde || NOME_C.aquario)} · ${esc(j.sub)}</small></span><button type="button" class="cvr-bc-b cvr-jogo-tela" id="cvr-jogo-tela" data-act="cvr-jogo-tela" aria-pressed="false" hidden></button><span class="cvr-jogo-dica" id="cvr-jogo-dica" role="status" hidden></span></div>
      <div class="cvr-jogo-corpo"><div class="cvr-jogo-load" id="cvr-jogo-load">${esc(j.carrega || 'Enchendo o tanque…')}</div><iframe id="cvr-jogo-fr" src="${esc(j.src)}" title="${esc(j.titulo)}" allow="autoplay; fullscreen"></iframe></div>`;
    el.hidden = false; jogoTela();
    const fr = el.querySelector('iframe'); fr.addEventListener('load', () => { const l = document.getElementById('cvr-jogo-load'); if(l) l.hidden = true; try{ fr.contentWindow.focus(); }catch(e){} });
    V.jogo = { id, hist: false, ignora: 0 }; V.teclas.clear();
    try{ history.pushState({ cvrJogo: 1 }, ''); V.jogo.hist = true; }catch(e){}
    anunciar(); jogoDica();
  }
  const jogoTela = () => { if(C.tela) C.tela.botao(document.getElementById('cvr-jogo-tela')); };
  if(C.tela) C.tela.ouve(jogoTela);
  /* o balão das três primeiras vezes (a mesma conta pros dois jogos) */
  function jogoDica(){
    let n = 0; try{ n = parseInt(localStorage.getItem('corre-jogo-dica'), 10) || 0; }catch(e){} if(n >= 3) return;
    try{ localStorage.setItem('corre-jogo-dica', String(n + 1)); }catch(e){}
    const d = document.getElementById('cvr-jogo-dica'); if(!d) return;
    d.textContent = C.pad && C.pad.toque() ? 'Pra voltar pra cidade, é aqui (ou o voltar do celular)' : 'Pra voltar pra cidade, é aqui';
    d.hidden = false; clearTimeout(V.jogoDicaT); V.jogoDicaT = setTimeout(() => { d.classList.add('some'); V.jogoDicaT = setTimeout(() => { d.hidden = true; }, 400); }, 7000);
  }
  /* fica: trocando de um jogo pro outro (a tela cheia continua) */
  function fechaJogo(dePop, fica){
    const j = V.jogo; if(!j) return;
    V.jogo = null; clearTimeout(V.jogoDicaT); if(!fica && C.tela) C.tela.tira('jogo');
    const el = document.getElementById('cvr-jogo'); if(el){ el.innerHTML = ''; el.hidden = true; }
    if(j.hist && !dePop){ V.jogoIgnora = Date.now(); try{ history.back(); }catch(e){ V.jogoIgnora = 0; } }
    V.tAnt = 0; V.teclas.clear();
    if(V.vivo){ anunciar(); portaUI(); }
  }
  addEventListener('popstate', () => {
    if(V.jogoIgnora && Date.now() - V.jogoIgnora < 1500){ V.jogoIgnora = 0; return; }
    if(V.jogo) fechaJogo(true);
  });
  /* comer: a comida vai pra mão por uns segundos, "nham nham" pra todo mundo ver, e 1 minuto de turbo na caminhada */
  function come(k){
    const e = V.eu; if(!e || !COMIDAS[k]) return; const agora = Date.now();
    e.item = { k, ate: agora + 9000 }; e.turboAte = agora + 60000; falaAuto(0); enviaPos(true);
    C.toast(`${COMIDAS[k][1]}: 1 minuto de turbo na caminhada.`, 3000);
  }
  /* ---------- v3.40 · o avião: sai do Aeroporto de Londrina, cruza a cidade por cima e te solta de paraquedas ----------
     O voo é passeio: sai por uns centavos de correal (o preço é do banco: corre_correal_preco('voo'), 0,05 desde a v3.45), e o app
     sempre pergunta antes.
     Fases: embarca (a hélice liga) → taxi (até a pista) → corrida (acelera e tira as rodas do chão) → cruzeiro (em linha
     reta até o destino) → para (você pula de paraquedas; o avião segue subindo e some) → no chão, onde você escolheu.
     Quem tá na cidade vê o avião passando (e o paraquedas), com o teu nome em cima. */
  const VOO_ALT = 170;
  const emVoo = o => !!(o && (o === V.eu ? !!V.voo : (o.vo || o.pq)));
  const emParaquedas = o => !!(o && (o === V.eu ? V.voo && V.voo.fase === 'para' : o.pq));
  function altVoo(o){ if(!o) return 0; if(o === V.eu){ const v = V.voo; return v ? v.alt : 0; } return o.vo === 1 ? VOO_ALT * .9 : o.pq ? 70 : 0; }
  const precoVoo = () => Number(C.correal && C.correal.precos && C.correal.precos.voo) || 0.05;
  const destinosVoo = () => { const vistos = new Set(['Aeroporto']); return lugares().filter(l => { if(vistos.has(l.nome)) return false; vistos.add(l.nome); return true; }); };
  function aeroportoSheet(){
    const preco = precoVoo(), saldo = C.correal.saldo, L = destinosVoo();
    C.sheet(`<div class="form cvr-aero"><div class="sheet-head"><h2>${ico('aviao')} Aeroporto de Londrina</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p>O teco-teco do Corre decola daqui, cruza a cidade por cima e te solta de paraquedas onde você escolher. Cada voo sai por <b>${C.correalTxt(preco)}</b>; você tem <b class="num" data-correal-saldo>${saldo == null ? '…' : C.correalFmt(saldo)}</b>.</p>
      <p class="lbl-s">Pra onde?</p>
      <div class="cvr-lugares cvr-aero-l">${L.map((l, i) => `<button type="button" class="btn sm" data-act="cvr-voar" data-i="${i}">${ico('aviao')} ${esc(l.nome)}</button>`).join('')}</div>
      <p class="fine">Correal não é dinheiro: se ganha fazendo trampo no Correverso (centavos por tarefa, até ${C.correalFmt(C.correal.teto)} por dia). O voo é passeio; o app sempre pergunta antes de descontar.</p></div>`);
    C.correalCarrega().catch(() => {});
  }
  async function voar(i){
    const d = destinosVoo()[i]; if(!d || V.voo || !V.vivo) return;
    await C.correalCarrega().catch(() => {});
    const preco = precoVoo(), saldo = Number(C.correal.saldo) || 0;
    if(!C.correalCobre(saldo, preco)){ C.toast(`O voo sai por ${C.correalTxt(preco)} e você tem ${C.correalFmt(saldo)}. Faz um trampo no Correverso e volta.`, 4200); return; }
    const sim = await C.confirma({ ico: 'aviao', titulo: 'Voo pra ' + d.nome, texto: `Sai por <b>${C.correalTxt(preco)}</b>. Você tem <b>${C.correalFmt(saldo)}</b>.`, sim: `Pagar ${C.correalFmt(preco)} e voar`, nao: 'Agora não' });
    if(!sim || !V.vivo || V.voo) return;
    let r = null; try{ r = await C.api.rpc('corre_correal_gasta', { p_tipo: 'voo' }); }catch(e){ C.toast(C.errMsg(e, 'Não deu pra pagar o voo agora.')); return; }
    if(!r || !r.ok){ if(r && r.saldo != null) C.correalSet(r.saldo); C.toast(r && r.preco == null ? 'O voo ainda não tá liberado no servidor.' : 'Não deu: o saldo não cobre o voo.', 3600); return; }
    C.correalSet(r.saldo); correalUI(false); C.closeSheet();
    if(C.versoSom) C.versoSom.moeda();
    decola(d);
  }
  function decola(d){
    const a = V.cid.aeroporto, e = V.eu; if(!a || !e || V.voo) return;
    const alvo = pertoLivre(d.x, d.y) || { x: d.x, y: d.y };
    V.voo = { fase: 'embarca', t: 0, x: a.vaga.x, y: a.vaga.y, alt: 0, dir: 1, x0: a.vaga.x, y0: a.vaga.y, pistaY: a.pista.y + a.pista.h / 2 + 10, fim: a.pista.x + a.pista.w - 160, ate: { x: alvo.x, y: alvo.y, nome: d.nome } };
    saiDoBarco(); e.sit = false; e.pesca = null; e.item = null; V.alvo = null; V.porta = null; V.portaT = null; portaUI();
    e.x = a.vaga.x; e.y = a.vaga.y; e.mov = true;
    if(V.pad) V.pad.solta();
    if(C.versoSom) C.versoSom.aviao('liga');
    enviaPos(true);
  }
  function passoVoo(dt){
    const v = V.voo, e = V.eu; if(!v || !e) return;
    v.t += dt; const S = C.versoSom, liso = f => f * f * (3 - 2 * f);
    if(v.fase === 'embarca'){ if(v.t >= .7){ v.fase = 'taxi'; v.t = 0; } }
    else if(v.fase === 'taxi'){ const f = Math.min(1, v.t / 1.4); v.y = v.y0 + (v.pistaY - v.y0) * liso(f); if(f >= 1){ v.fase = 'corrida'; v.t = 0; v.xs = v.x; if(S) S.aviao('decola'); } }
    else if(v.fase === 'corrida'){
      const f = Math.min(1, v.t / 2.4); v.x = v.xs + (v.fim - v.xs) * f * f; v.y = v.pistaY; v.alt = f > .55 ? 60 * liso((f - .55) / .45) : 0;
      if(f >= 1){ v.fase = 'cruzeiro'; v.t = 0; v.xa = v.x; v.ya = v.y; v.alt0 = v.alt; v.T = clamp(Math.hypot(v.ate.x - v.xa, v.ate.y - v.ya) / 640, 2.4, 9); v.dir = v.ate.x >= v.xa ? 1 : -1; if(S) S.aviao('voa'); enviaPos(true); }
    }
    else if(v.fase === 'cruzeiro'){
      const f = Math.min(1, v.t / v.T); v.x = v.xa + (v.ate.x - v.xa) * f; v.y = v.ya + (v.ate.y - v.ya) * f; v.alt = v.alt0 + (VOO_ALT - v.alt0) * liso(Math.min(1, v.t / 1.6));
      if(f >= 1){ v.fase = 'para'; v.t = 0; v.altP = v.alt; v.a = { x: v.x, y: v.y, alt: v.alt, vx: (v.ate.x - v.xa) / v.T, vy: (v.ate.y - v.ya) / v.T, dir: v.dir }; if(S) S.aviao('pula'); falaAuto(9); enviaPos(true); }
    }
    else if(v.fase === 'para'){
      const f = Math.min(1, v.t / 2.8); v.alt = v.altP * (1 - liso(f)); v.x = v.ate.x; v.y = v.ate.y;
      if(v.a){ v.a.x += v.a.vx * dt; v.a.y += v.a.vy * dt; v.a.alt += 45 * dt; }
      if(f >= 1){ pousa(); return; }
    }
    e.x = v.x; e.y = v.y; e.mov = true; e.dir = v.dir < 0 ? 'esq' : 'dir';
  }
  function pousa(){
    const v = V.voo, e = V.eu; V.voo = null; if(!e || !v) return;
    const p = pertoLivre(v.ate.x, v.ate.y) || v.ate; e.x = p.x; e.y = p.y; e.mov = false; e.dir = 'baixo';
    if(C.versoSom){ C.versoSom.aviao('para'); C.versoSom.cai(1); }
    C.toast(`Pousou: ${v.ate.nome}.`, 2600); anunciar(); portaUI();
  }
  /* o avião num ponto do mundo (no chão, ou a "alt" de altura com a sombra embaixo) */
  function desenhaAviao(ctx, x, y, alt, dir, t, helice, trem){
    const [ix, iy, md] = ptBase(ctx, x, y), ia = Math.round(alt * md);
    ctx.save(); naBase(ctx);
    const pc = (X, Y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(ix + (dir < 0 ? -(X + w) : X), iy + Y, w, h); };
    if(alt > 3) C.veiculos.sombraAviao(pc);
    const pa = (X, Y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(ix + (dir < 0 ? -(X + w) : X), iy - ia + Y, w, h); };
    C.veiculos.aviao(pa, { t, helice, trem });
    ctx.restore();
  }
  function desenhaParaquedas(ctx, o, x, y, alt, t){
    const [ix, iy, md] = ptBase(ctx, x, y), ia = Math.round(alt * md), bal = Math.round(Math.sin(t * 2.2) * 2);
    ctx.save(); naBase(ctx);
    const enc = Math.max(2, 8 - Math.round(ia / 10)); ctx.fillStyle = 'rgba(15,18,24,.22)'; ctx.fillRect(ix - enc, iy - 1, enc * 2, 2);
    C.veiculos.paraquedas((X, Y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(ix + bal + X, iy - ia + Y, w, h); });
    ctx.restore();
    skin(ctx, o.av, ix + bal, iy - ia, 'baixo', null, 1, '', { semSombra: true });
  }
  /* os aviões e os paraquedas (o teu e o de quem tá voando), por cima de tudo */
  function desenhaVoos(ctx, t, gente){
    const v = V.voo;
    if(v){
      if(v.fase !== 'para') desenhaAviao(ctx, v.x, v.y, v.alt, v.dir, t, v.fase !== 'embarca', v.alt < 30);
      else { if(v.a && v.t < 3) desenhaAviao(ctx, v.a.x, v.a.y, v.a.alt, v.a.dir, t, true, false); desenhaParaquedas(ctx, V.eu, v.x, v.y, v.alt, t); }
    }
    gente.forEach(r => { if(r.vo) desenhaAviao(ctx, r.x, r.y, r.vo === 1 ? VOO_ALT * .9 : 0, r.dir === 'esq' ? -1 : 1, t, true, r.vo !== 1); else if(r.pq) desenhaParaquedas(ctx, r, r.x, r.y, 70, t); });
  }
  /* ---------- v3.75 · o barquinho e a pesca da piapara no Tibagi ----------
     No píer de cada porto tem barco de alumínio com motor de rabeta: pegou, você tá na água e anda pelo rio inteiro (as
     setas, o direcional ou um toque; o barco tem embalo e para devagar). Quem tá na cidade te vê no barco.
     Parado, o botão amarelo joga a linha, e a pesca tem quatro tempos:
       espera: a boia boia; às vezes ela só treme (a piapara belisca a isca). Puxou na beliscada, ela leva a isca.
       fisgou: a boia afunda de vez, e você tem um segundo pra puxar.
       briga: segurando o botão você recolhe a linha e a tensão sobe; de tempo em tempo a piapara corre, e aí tem que
         soltar (segurando na corrida, a linha arrebenta). Solto demais, a linha afrouxa e ela cospe o anzol.
       salto: pegou! Ela pula da água até a tua mão, com o peso.
     Perto das pedras (a corredeira) a piapara vem maior e morde mais rápido. Lambari e bota velha também aparecem.
     O recorde do dia fica no aparelho e vai na presença (quem passa vê "PIAPARA 2,40KG" em cima do teu barco).
     Não vale correal. */
  const BARCO_MAX = 165, BARCO_ACEL = 290, RIO_K = 'corre-tibagi';
  const CORES_BARCO = [AMARELO, ROSA, AZUL, LARANJA, LILAS, '#E2412E'];
  const diaBR = () => Math.floor((Date.now() - 3 * 3600e3) / 864e5);
  const kgTxt = kg => (Math.round(kg * 100) / 100).toFixed(2).replace('.', ',');
  /* v3.85: a mais pesada do Tibagi tem 4,850 kg (o Thales), e só ela; o peso com três casas é o da balança */
  const PIAPARA_MAX = 4.85, RIO_TETO = 4.79, kg3 = kg => kg.toFixed(3).replace('.', ',');
  const somRio = k => { if(C.versoSom && C.versoSom.rio) C.versoSom.rio(k); };
  /* o barco (desenhado em pontos da tela, como o boneco) ocupa no mundo um tamanho que muda com o zoom */
  const meioBarco = () => clamp(17 / V.k, 20, 48);
  /* onde o barco (ou a boia) não entra: barranco, píer, pedra e barco amarrado */
  function bateBarco(x, y, boia){
    const r = V.cid && V.cid.rio; if(!r) return true;
    const hl = boia ? 4 : meioBarco(), cima = boia ? 6 : 7 / V.k, baixo = boia ? 4 : 3 / V.k;
    if(x - hl < 10 || x + hl > r.W - 10) return true;
    for(const dx of boia ? [0] : [-hl, -hl / 2, 0, hl / 2, hl]){ const c = r.colEm(x + dx); if(y - cima < c.t + 4 || y + baixo > c.b - 3) return true; }
    for(const p of r.piers) if(x + hl > p.x - 2 && x - hl < p.x + p.w + 2 && y - cima < p.y + p.h + 4 && y + baixo > p.y) return true;
    for(const p of r.pedras){ const dx = (x - p.x) / (p.r + hl * .85), dy = (y - p.y) / (p.r * .7 + (boia ? 2 : 8)); if(dx * dx + dy * dy < 1) return true; }
    if(!boia) for(const a0 of r.amarrados){ const a = amarradoXY(a0); if(Math.abs(x - a.x) < hl * 2 && Math.abs(y - a.y) < 11 / V.k) return true; }
    return false;
  }
  /* a vaga de quem sai remando: do lado direito do píer (o esquerdo é dos amarrados) */
  function vagaBarco(p){
    const hl = meioBarco();
    for(const y of [p.t + 62, p.t + 86, p.t + 40, p.t + 110]) for(const dx of [4, 30, 60]){ const x = p.x + p.w + hl + dx; if(!bateBarco(x, y)) return { x, y }; }
    return null;
  }
  function embarca(p){
    const e = V.eu; if(!e || e.barco || !p || V.voo) return;
    const v = vagaBarco(p); if(!v){ C.toast('Os barcos tão todos na água agora. Tenta de novo daqui a pouco.', 2600); return; }
    e.sit = false; e.pesca = null; V.alvo = null; V.portaT = null; V.rio = null;
    e.x = v.x; e.y = v.y; e.mov = false; e.dir = 'baixo';
    /* "livre": o "Descer no porto" só aparece depois que você saiu da vaga (senão ele é a primeira coisa que o botão diz) */
    e.barco = { vx: 0, vy: 0, lado: 1, x0: v.x, y0: v.y, livre: false };
    V.porta = null; if(C.versoSom) C.versoSom.porta();
    portaUI(); rioUI(true); anunciar();
    let ja = '1'; try{ ja = localStorage.getItem(RIO_K + '-dica'); if(!ja) localStorage.setItem(RIO_K + '-dica', '1'); }catch(err){}
    C.toast(ja ? 'No barquinho. Bom rio!' : 'No barquinho! Anda com as setas (no celular, o direcional). Parado, o botão amarelo joga a linha. Perto das pedras a piapara é maior.', ja ? 1800 : 5600);
  }
  function desembarca(p){
    const e = V.eu; if(!e || !e.barco || !p) return;
    saiDoBarco(); e.x = p.ponta.x; e.y = p.ponta.y - 6; e.dir = 'cima'; e.mov = false;
    if(C.versoSom) C.versoSom.porta();
    portaUI(); anunciar(); C.toast('De volta pro píer.', 1600);
  }
  /* sai do barco sem cerimônia (o Mapa, o "Pra casa", sair da cidade): a linha vem junto */
  function saiDoBarco(){ const e = V.eu; if(e) e.barco = null; V.rio = null; rioUI(); padRotulo(); }
  /* o barco num passo: o empurrão vai pra direção apertada, a água segura (o embalo), e barranco/pedra/píer devolvem */
  function andaBarco(e, kx, ky, dt, fator){
    const b = e.barco, R = V.rio; let dx = kx, dy = ky;
    if(dx || dy) V.alvo = null;
    else if(V.alvo){ const ax = V.alvo.x - e.x, ay = V.alvo.y - e.y, d = Math.hypot(ax, ay); if(d < 10) V.alvo = null; else { dx = ax / d; dy = ay / d; } }
    /* pescando, o barco fica parado: na briga nem mexe; esperando, andar recolhe a linha */
    if(R && R.fase){ if(R.fase === 'espera' || R.fase === 'lanca'){ if(dx || dy) recolheRio('Recolheu a linha pra sair remando.'); } else { dx = dy = 0; V.alvo = null; } }
    const n = Math.hypot(dx, dy), f = fator || 1;
    if(n){ b.vx += dx / n * BARCO_ACEL * f * dt; b.vy += dy / n * BARCO_ACEL * .8 * f * dt; }
    const at = Math.exp(-dt * (n ? .9 : 1.7)); b.vx *= at; b.vy *= at;
    const sp = Math.hypot(b.vx, b.vy), max = BARCO_MAX * Math.max(.5, f); if(sp > max){ b.vx *= max / sp; b.vy *= max / sp; }
    const ox = e.x, oy = e.y;
    if(bateBarco(e.x + b.vx * dt, e.y)) b.vx *= -.25; else e.x += b.vx * dt;
    if(bateBarco(e.x, e.y + b.vy * dt)) b.vy *= -.25; else e.y += b.vy * dt;
    if(V.alvo && n && Math.hypot(e.x - ox, e.y - oy) < .05) V.alvo = null;
    const v = Math.hypot(b.vx, b.vy); e.mov = v > 12;
    if(Math.abs(b.vx) > 10) b.lado = b.vx < 0 ? -1 : 1;
    e.dir = e.mov ? (b.lado < 0 ? 'esq' : 'dir') : 'baixo'; e.passo += dt * 6;
    if(!b.livre && Math.hypot(e.x - b.x0, e.y - b.y0) > 70) b.livre = true;
    if(e.mov && performance.now() - (V.rastroT || 0) > 90){ V.rastroT = performance.now(); rastro(e.x - b.lado * meioBarco(), e.y + 1); }
  }
  /* ---- a pesca ---- */
  function rioRec(){
    try{ const o = JSON.parse(localStorage.getItem(RIO_K) || 'null'); if(!o || typeof o !== 'object') return {};
      /* v3.85: antes a corredeira dava até 5,4 kg; o recorde de antes fica abaixo da de 4,850, pra ela ainda ser recorde */
      ['kg', 'max'].forEach(k => { if(Number(o[k]) > RIO_TETO && Number(o[k]) !== PIAPARA_MAX) o[k] = RIO_TETO; });
      return o; }catch(e){ return {}; }
  }
  function rioGuarda(kg){
    const o = rioRec(), hoje = diaBR(); if(o.dia !== hoje){ o.dia = hoje; o.kg = 0; }
    const dia = kg > (o.kg || 0), vida = kg > (o.max || 0); if(dia) o.kg = kg; if(vida) o.max = kg; o.n = (o.n || 0) + 1;
    try{ localStorage.setItem(RIO_K, JSON.stringify(o)); }catch(e){}
    return { dia, vida };
  }
  const piaparaHoje = () => { const o = rioRec(); return o.dia === diaBR() ? Number(o.kg) || 0 : 0; };
  /* o que morde: quase sempre piapara (a maioria de meio a dois quilos, de vez em quando uma de quatro), às vezes
     lambari e, de vez em nunca, uma bota. Na corredeira a piapara vem 25% maior.
     v3.85: a de 4,850 kg é a mais pesada e é rara (1 em 20 piaparas na corredeira, 1 em 70 no remanso); as outras
     param antes dela (até 4,6 no remanso e 4,79 na corredeira) */
  function sorteiaPeixe(corre){
    const r = Math.random();
    if(r < .05) return { k: 'bota', kg: .9, forca: .16, d0: .5 };
    if(r < .2){ const kg = .04 + Math.random() * .14; return { k: 'lambari', kg, forca: .2, d0: .35 }; }
    const pia = kg => ({ k: 'piapara', kg, forca: .35 + kg / 6, d0: Math.min(1.1, .7 + kg * .07) });
    if(Math.random() < (corre ? .05 : .015)) return Object.assign(pia(PIAPARA_MAX), { trofeu: true });
    let kg = .5 + Math.pow(Math.random(), 2.2) * 4.1; if(corre) kg = Math.min(RIO_TETO, kg * 1.25);
    return pia(Math.round(kg * 100) / 100);
  }
  function lanca(){
    const e = V.eu, b = e && e.barco; if(!b) return;
    b.vx = b.vy = 0; e.mov = false; V.alvo = null; e.dir = 'baixo';
    /* a boia cai na frente e pro lado da vara; se ali não é água boa, do outro lado, ou pra cima */
    const k = V.k; let ponto = null;
    for(const [dx, dy] of [[30, 18], [-30, 18], [34, -16], [-34, -16], [0, 26]]){ const x = e.x + (dx + (Math.random() - .5) * 6) / k, y = e.y + (dy + (Math.random() - .5) * 4) / k; if(!bateBarco(x, y, true)){ ponto = { x, y }; break; } }
    if(!ponto){ C.toast('Aqui não dá pra jogar: chega mais pro meio do rio.', 2400); return; }
    const corre = V.cid.rio.pedras.some(p => Math.hypot(p.x - ponto.x, p.y - ponto.y) < 120);
    V.rio = { fase: 'lanca', t0: Date.now(), bx: ponto.x, by: ponto.y, corre };
    somRio('lanca'); portaUI(); rioUI(true); enviaPos(true);
  }
  function recolheRio(msg){ V.rio = null; if(msg) C.toast(msg, 1600); portaUI(); rioUI(); enviaPos(true); }
  function perdeRio(msg, som){ V.rio = null; somRio(som || 'erro'); C.toast(msg, 2800); portaUI(); rioUI(); enviaPos(true); }
  function comecaBriga(){
    const R = V.rio, e = V.eu, P = R.peixe, agora = Date.now();
    Object.assign(R, { fase: 'briga', t0: agora, hold: true, ten: .4, d: P.d0, d0: P.d0, metros: 6 + P.kg * 3, corrida: false, prox: agora + 700 + Math.random() * 900, estoura: 0, frouxo: 0, fase2: Math.random() * 6, raio0: Math.max(24, Math.hypot(R.bx - e.x, R.by - e.y)) });
    somRio('fisga'); portaUI(); rioUI(true);
  }
  function pegou(){
    const R = V.rio, e = V.eu;
    R.fase = 'salto'; R.t0 = Date.now(); R.salto = { x0: R.bx, y0: R.by, x1: e.x + 6 / V.k, y1: e.y - 14 / V.k };
    somRio('tchibum'); portaUI(); rioUI(true);
  }
  function fimSalto(){
    const R = V.rio, e = V.eu, P = R.peixe; V.rio = null;
    e.item = { k: P.k, ate: Date.now() + 9000 };
    /* v3.85: a de 4,850 vai pra balança (e fica mais tempo na mão, pra foto) */
    if(P.k === 'piapara' && (P.trofeu || P.kg >= PIAPARA_MAX)){ const g = rioGuarda(PIAPARA_MAX); e.item.ate = Date.now() + 20000; falaAuto(21); anunciar(); balanca(g); }
    else if(P.k === 'piapara'){ const g = rioGuarda(P.kg); falaAuto(1); if(C.versoSom) C.versoSom.acerto(); C.toast(`Piapara de ${kgTxt(P.kg)} kg!${g.vida ? ' O teu recorde de todos os tempos.' : g.dia ? ' O teu recorde de hoje.' : ''}`, 4000); anunciar(); }
    else if(P.k === 'lambari'){ falaAuto(1); C.toast(`Um lambari de ${Math.round(P.kg * 1000)} g. A piapara grande gosta da corredeira.`, 3200); }
    else { falaAuto(3); C.toast('Uma bota velha. O rio agradece a faxina.', 2800); }
    portaUI(); rioUI(); enviaPos(true);
  }
  /* o botão amarelo (ou o espaço, o Enter, o Pular do celular) no barco: o que ele faz depende da hora */
  function rioAperta(){
    const e = V.eu; if(!e || !e.barco || V.voo) return false;
    const R = V.rio, f = R && R.fase, b = e.barco;
    if(!f){ if(V.porta && V.porta.tipo === 'barco' && b.livre && Math.hypot(b.vx, b.vy) < 50){ desembarca(V.porta.pier); return true; } lanca(); return true; }
    if(f === 'espera'){ if(R.beliscando) perdeRio('Cedo demais: era só a beliscada, e ela levou a isca.'); else recolheRio('Recolheu a linha.'); return true; }
    if(f === 'fisgou'){ comecaBriga(); return true; }
    if(f === 'briga'){ R.hold = true; return true; }
    return true;
  }
  function rioSolta(){ const R = V.rio; if(R && R.fase === 'briga') R.hold = false; }
  function rioPasso(dt){
    const R = V.rio, e = V.eu; if(!R || !e || !e.barco) return; const agora = Date.now();
    if(R.fase === 'lanca'){ if(agora - R.t0 > 650){ R.fase = 'espera'; R.t0 = agora; R.morde = agora + (R.corre ? 1800 : 2600) + Math.random() * (R.corre ? 3600 : 5600); R.bel = []; const nb = Math.floor(Math.random() * 3); for(let i = 0; i < nb; i++) R.bel.push(agora + 900 + Math.random() * Math.max(400, R.morde - agora - 1700)); somRio('plop'); portaUI(); rioUI(true); } return; }
    if(R.fase === 'espera'){
      const bel = R.bel.some(t0 => agora > t0 && agora < t0 + 420); if(bel && !R.beliscando) somRio('belisca'); R.beliscando = bel;
      if(agora >= R.morde){ R.fase = 'fisgou'; R.t0 = agora; R.beliscando = false; R.peixe = sorteiaPeixe(R.corre); somRio('fisga'); try{ if(navigator.vibrate) navigator.vibrate(70); }catch(err){} portaUI(); rioUI(true); }
      return;
    }
    if(R.fase === 'fisgou'){ if(agora - R.t0 > 1000) perdeRio('Demorou: ela levou a isca. Joga de novo.'); return; }
    if(R.fase === 'salto'){ if(agora - R.t0 > 900) fimSalto(); return; }
    if(R.fase !== 'briga') return;
    const P = R.peixe;
    /* de tempo em tempo ela corre (a piapara grande corre mais e mais forte) */
    /* v3.85: e cansa: cada corrida tira 8% da força dela, até 60% (a de 4,850 cansa devagar: 5%, até 70%). Sem isso a
       piapara de mais de 4 kg levava de um a dois minutos de briga perfeita */
    if(agora > R.prox){ R.corrida = !R.corrida; R.prox = agora + (R.corrida ? 450 + Math.random() * 900 * (.6 + P.forca) : 1200 + Math.random() * 2000);
      if(R.corrida && P.k === 'piapara'){ somRio('corre'); if(P.f0 == null) P.f0 = P.forca; P.forca = Math.max(P.f0 * (P.trofeu ? .7 : .6), P.forca * (P.trofeu ? .95 : .92)); }
      rioUI(true); }
    const puxa = P.forca * (R.corrida ? .95 + Math.random() * .25 : .22), alvo = R.hold ? .3 + puxa * .62 : puxa * .42;
    R.ten += (alvo - R.ten) * Math.min(1, dt * 3.2);
    if(R.hold && R.ten < 1) R.d -= dt * (R.corrida ? .025 : .1) * (1.2 - Math.min(.6, P.forca * .4));
    else if(!R.hold) R.d = Math.min(R.d0, R.d + dt * puxa * (R.corrida ? .08 : .02));
    if(R.ten >= 1){ R.estoura += dt; if(R.estoura > .28){ perdeRio(P.k === 'piapara' ? 'Arrebentou a linha! Quando ela correr, solta o botão.' : 'Arrebentou a linha!', 'arrebenta'); return; } } else R.estoura = Math.max(0, R.estoura - dt);
    if(R.ten < .1){ R.frouxo += dt; if(R.frouxo > 1.8){ perdeRio('A linha afrouxou demais e ela cuspiu o anzol. Segura quando ela acalmar.'); return; } } else R.frouxo = Math.max(0, R.frouxo - dt * 2);
    /* o peixe nada de um lado pro outro na frente do barco, cada vez mais perto */
    R.fase2 += dt * (R.corrida ? 2.6 : 1.1);
    const ang = Math.PI / 2 + Math.sin(R.fase2) * 1.05, raio = (14 / V.k) + (R.d / R.d0) * Math.max(0, R.raio0 - 14 / V.k), nx = e.x + Math.cos(ang) * raio * 1.3, ny = e.y + 4 / V.k + Math.sin(ang) * raio * .55;
    if(!bateBarco(nx, ny, true)){ R.bx = nx; R.by = ny; }
    if(R.hold && agora - (R.clT || 0) > 85){ R.clT = agora; somRio('clique'); }
    if(R.d <= 0) pegou();
  }
  /* o painel da pesca, em cima do botão amarelo (as mesmas peças do minijogo das tarefas) */
  function rioUI(forca){
    const el = C.$('cvr-rio'); if(!el) return;
    const R = V.rio, f = R && R.fase, mostra = !!(f && f !== 'lanca' && V.eu && V.eu.barco);
    if(!mostra){ if(!el.hidden){ el.hidden = true; el.dataset.k = ''; el.innerHTML = ''; } return; }
    el.hidden = false;
    const P = R.peixe, k = [f, R.corrida ? 1 : 0, P ? P.k : ''].join('|');
    if(forca || el.dataset.k !== k){
      el.dataset.k = k;
      let titulo = '', chip = '', corpo = '', dica = '';
      if(f === 'espera'){ titulo = 'Esperando a piapara'; chip = R.corre ? 'corredeira' : 'remanso'; dica = 'Quando a boia afundar de vez, puxa. Se ela só tremer, é beliscada: não puxa.' + (R.corre ? ' Perto da pedra a água corre: é onde a piapara grande fica.' : ''); }
      else if(f === 'fisgou'){ titulo = 'Afundou! Puxa!'; chip = 'agora'; dica = 'Toca no botão amarelo (ou espaço) agora.'; }
      else if(f === 'briga'){ titulo = P.k === 'piapara' ? (R.corrida ? 'Ela correu! Solta!' : 'Piapara na linha!') : P.k === 'lambari' ? 'Peixinho na linha' : 'Tá pesado e não briga…';
        corpo = '<div class="mj-barra"><i class="mj-zona"></i><i class="mj-nivel"></i></div><div class="mj-prog"><i></i></div>';
        dica = R.corrida && P.k === 'piapara' ? 'Segurando na corrida, a linha arrebenta. Solta e espera ela cansar.' : 'Segura o botão pra recolher, com a agulha na faixa rosa. Quando ela correr, solta.'; }
      else { titulo = P && P.trofeu ? 'Pegou! A mais pesada do Tibagi' : P && P.k === 'piapara' ? `Pegou! Piapara de ${kgTxt(P.kg)} kg` :P && P.k === 'lambari' ? 'Pegou um lambari' : 'Pegou… uma bota'; chip = ''; dica = ''; }
      el.className = 'cvr-mj cvr-rio' + (f === 'briga' && R.corrida && P.k === 'piapara' ? ' corre' : '');
      el.innerHTML = `<div class="mj-h"><b>${esc(titulo)}</b>${chip || f === 'briga' ? `<span class="rio-chip">${esc(chip)}</span>` : ''}</div>${corpo}${dica ? `<small>${esc(dica)}</small>` : ''}`;
    }
    if(f === 'briga'){
      const n = el.querySelector('.mj-nivel'), p = el.querySelector('.mj-prog i'), ch = el.querySelector('.rio-chip');
      if(n) n.style.left = (clamp(R.ten, 0, 1) * 100).toFixed(1) + '%'; if(p) p.style.width = clamp((1 - R.d / R.d0) * 100, 0, 100).toFixed(1) + '%'; if(ch) ch.textContent = Math.max(0, Math.round(R.d / R.d0 * R.metros)) + ' m';
      el.classList.toggle('dentro', R.ten >= .25 && R.ten <= .8); el.classList.toggle('perigo', R.ten > .86);
    }
  }
  /* o barco de alguém, com a pessoa sentada no meio; pescando, a vara, a linha e a boia */
  function barquinho(ctx, o, t, eu, item){
    const R = eu ? V.rio : null, [ix, iy0] = ptBase(ctx, o.x, o.y), lado = eu ? (o.barco.lado < 0 ? -1 : 1) : (o.bl < 0 ? -1 : 1), mexe = !!o.mov;
    const iy = iy0 + (!mexe && Math.sin(t * 2.4 + o.x * .013) > .25 ? 1 : 0), pesca = eu ? !!(R && R.fase && R.fase !== 'salto') : !!o.pesca;
    /* a boia: a minha, onde eu joguei (voando até lá no lance); a dos outros, num lugar de sempre na frente do barco */
    let boia = null;
    if(R && pesca){ const f = R.fase === 'lanca' ? Math.min(1, (Date.now() - R.t0) / 650) : 1, [bx, by] = ptBase(ctx, R.bx, R.by); boia = { x: Math.round(ix + (bx - ix) * f), y: Math.round(iy + (by - iy) * f - Math.sin(f * Math.PI) * (R.fase === 'lanca' ? 22 : 0)), f }; }
    else if(pesca) boia = { x: ix + 30, y: iy + 18, f: 1 };
    const cor = CORES_BARCO[hash(o.uid || o.sid || 'x') % CORES_BARCO.length], dir = mexe && !pesca ? (lado < 0 ? 'esq' : 'dir') : 'baixo';
    const P = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(ix + (lado < 0 ? -(x + w) : x), iy + y, w, h); };
    ctx.save(); naBase(ctx); casco(P, 'atras', cor, t, mexe); ctx.restore();
    skin(ctx, o.av, ix - 2 * lado, iy - 1, dir, null, 1, 'sentado', { item, vara: pesca && dir === 'baixo', semSombra: true });
    ctx.save(); naBase(ctx); casco(P, 'frente', cor, t, mexe); if(boia) linhaRio(ctx, ix - 2 * lado + 9, iy - 13, boia, R, t); ctx.restore();
    if(eu && R && R.fase === 'fisgou') pixPlaca(ctx, '!', o.x + 16 / V.k, o.y - 34 / V.k, { fundo: AMARELO, cor: INK, s: 2 });
  }
  /* a linha da vara até a boia (em pontos da tela). Na briga ela fica esticada e a água ferve onde o peixe tá */
  function linhaRio(ctx, tx, ty, b, R, t){
    const fase = R ? R.fase : 'espera', sag = fase === 'briga' || fase === 'fisgou' ? 0 : fase === 'lanca' ? 2 : 5;
    const n = Math.max(Math.abs(b.x - tx), Math.abs(b.y - ty), 1); ctx.fillStyle = 'rgba(15,18,24,.55)';
    for(let k = 0; k <= n; k++){ const f = k / n; ctx.fillRect(Math.round(tx + (b.x - tx) * f), Math.round(ty + (b.y - ty) * f + Math.sin(f * Math.PI) * sag), 1, 1); }
    if(fase === 'briga'){
      for(let k = 0; k < 8; k++){ const a = t * 9 + k * 2.1, rr = 2 + (k % 3) * 2; ctx.fillStyle = k % 2 ? PAPEL : 'rgba(255,255,255,.6)'; ctx.fillRect(Math.round(b.x + Math.cos(a) * rr * 1.6), Math.round(b.y + Math.sin(a) * rr * .6), 1, 1); }
      if(R.corrida && Math.sin(t * 7) > 0){ ctx.fillStyle = '#C9CED6'; ctx.fillRect(b.x - 3, b.y - 2, 7, 2); ctx.fillStyle = '#E8A04A'; ctx.fillRect(b.x, b.y - 3, 2, 1); }
      return;
    }
    if(fase === 'fisgou'){ ctx.fillStyle = PAPEL; for(let k = 0; k < 8; k++){ const a = k / 8 * Math.PI * 2 + t * 3, rr = 3 + ((t * 12 + k) % 4); ctx.fillRect(Math.round(b.x + Math.cos(a) * rr * 1.4), Math.round(b.y - 1 + Math.sin(a) * rr * .5), 1, 1); } return; }
    /* a boia: o palito, o rosa e o branco. Boiando, sobe e desce; na beliscada afunda um ponto e solta um anel */
    const bel = !!(R && R.beliscando), dy = b.f < 1 ? 0 : bel ? 1 : (Math.sin(t * 3) > .6 ? 1 : 0);
    if(b.f >= 1){ ctx.fillStyle = 'rgba(255,255,255,.45)'; const rr = bel ? 4 : 2 + ((t * 2) % 3); for(let k = 0; k < 10; k++){ const a = k / 10 * Math.PI * 2; ctx.fillRect(Math.round(b.x + Math.cos(a) * rr * 1.6), Math.round(b.y + 1 + Math.sin(a) * rr * .5), 1, 1); } }
    ctx.fillStyle = INK; ctx.fillRect(b.x, b.y - 5 + dy, 1, 2); ctx.fillStyle = ROSA; ctx.fillRect(b.x - 1, b.y - 3 + dy, 3, 2); ctx.fillStyle = PAPEL; ctx.fillRect(b.x - 1, b.y - 1 + dy, 3, 1);
  }
  /* o peixe de lado, em pontos da tela, olhando pra esquerda (dir < 0 vira pra direita) */
  function peixePx(ctx, x, y, k, dir){
    const R = (dx, dy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(dir < 0 ? x - dx - w : x + dx, y + dy, w, h); };
    if(k === 'bota'){ R(-2, -6, 4, 8, '#5A4634'); R(-2, 1, 8, 2, '#3B2D22'); R(-2, -6, 4, 1, '#8C7A66'); return; }
    if(k === 'lambari'){ R(-4, -1, 7, 2, '#E6EAEE'); R(-3, 1, 6, 1, '#C9CED6'); R(3, -2, 2, 4, '#E2412E'); R(-3, -1, 1, 1, INK); return; }
    /* a piapara: prateada, as três manchas pretas do lado, nadadeira amarelada e o rabo de forquilha */
    R(-6, -3, 10, 1, '#C9CED6'); R(-7, -2, 12, 1, '#DDE2E8'); R(-8, -1, 14, 2, '#EEF1F4'); R(-7, 1, 12, 1, '#C9CED6'); R(-5, 2, 8, 1, '#B7BEC7');
    R(-4, 0, 1, 1, '#1B1D22'); R(-1, 0, 1, 1, '#1B1D22'); R(2, 0, 1, 1, '#1B1D22');
    R(-1, -4, 3, 1, '#E8A04A'); R(-2, 3, 2, 1, '#E8A04A'); R(6, -3, 1, 2, '#E8A04A'); R(7, -4, 1, 2, '#E8A04A'); R(6, 1, 1, 2, '#E8A04A'); R(7, 2, 1, 2, '#E8A04A'); R(6, -1, 1, 2, '#D9902F');
    R(-7, -2, 1, 1, INK); R(-9, -1, 1, 1, '#9AA0A8');
  }
  /* pegou: o peixe pula da água em arco até a tua mão, com o tchibum de onde saiu e as gotas atrás */
  function saltoPeixe(ctx, t){
    const R = V.rio, s = R && R.salto; if(!s || !R.peixe) return;
    const f = Math.min(1, (Date.now() - R.t0) / 900), pos = g => [s.x0 + (s.x1 - s.x0) * g, s.y0 + (s.y1 - s.y0) * g - Math.sin(g * Math.PI) * 46 / V.k];
    const [ix, iy] = ptBase(ctx, ...pos(f)), [sx, sy] = ptBase(ctx, s.x0, s.y0), gotas = [1, 2, 3, 4].map(k => ptBase(ctx, ...pos(Math.max(0, f - k * .06))));
    ctx.save(); naBase(ctx);
    if(f < .55){ ctx.fillStyle = PAPEL; for(let k = 0; k < 9; k++){ const a = Math.PI * (1.05 + k / 8 * .9), rr = 3 + f * 18; ctx.fillRect(Math.round(sx + Math.cos(a) * rr), Math.round(sy + Math.sin(a) * rr * .8), 1, 2); } }
    ctx.fillStyle = '#9CC9F0'; gotas.forEach(([gx, gy], k) => ctx.fillRect(gx + (k % 2 ? 2 : -2), gy + 2, 1, 1));
    peixePx(ctx, ix, iy, R.peixe.k, s.x1 >= s.x0 ? -1 : 1);
    ctx.restore();
  }
  /* ---------- v3.85 · a balança da piapara de 4,850 kg ----------
     Pegou a mais pesada do Tibagi: a tela vira a pesagem. A balancinha digital desce pendurada na corda, a piapara pula
     da água pro gancho, a mola sacode e os números correm até travar em 4,850 (o HOLD acende, bip-bip). Aí é festa:
     o carimbo de RECORDE, a faixa em cima, confete estourando da balança e chovendo, fogos dos dois lados, as capivaras
     pulando de bandeirinha nos barrancos, os flashes dos fotógrafos da beira, o sol de raios girando, bolhas subindo e
     gota pingando do rabo. Tudo em pixel grande (uma tela pequena esticada sem borrar), no jeito da cidade.
     Tocou antes de travar, pula pro 4,850; depois, fecha (Esc, espaço e Enter também). Os primeiros 1,2 s não contam, pra
     quem ainda tá segurando o botão da briga não pular sem ver. Sozinha, some em uns 10 s. Com "reduzir movimento", ela
     já aparece travada e parada, sem confete, fogos nem flash. Os fatos ficam em V.balanca (pros testes). */
  const SEG7 = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
  const FESTA = [AMARELO, ROSA, AZUL, LARANJA, LILAS, PAPEL];
  /* a piapara grande (a do troféu): de lado, cabeça pra esquerda, com contorno; a boca fica em (1, 15) */
  let PIA_G = null;
  function piaparaGrande(){
    if(PIA_G) return PIA_G;
    const cv = document.createElement('canvas'); cv.width = 48; cv.height = 30; const g = cv.getContext('2d'), my = 15, ox = 1;
    const P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(ox + x, y, w, h); };
    const FIN = '#E8A04A', FIN2 = '#D9902F';
    /* a meia altura do corpo em cada coluna: a cabeça redonda, o mais alto perto de um terço, afinando até o rabo */
    const meia = x => Math.round(x < 4 ? 2.5 + x * .9 : x < 14 ? 6 + (x - 4) * .25 : 8.5 - (x - 14) * .27);
    for(let x = 12; x <= 20; x++){ const alt = Math.round(4.5 - Math.abs(x - 15) * .6); if(alt > 0) P(x, my - meia(x) - alt, 1, alt, x % 2 ? FIN : FIN2); }
    for(let d = 0; d <= 9; d++){ const sp = Math.round(d * .8); P(36 + d, my - 3 - sp, 1, 3, FIN); P(36 + d, my + 1 + sp, 1, 3, FIN); if(d > 6){ P(36 + d, my - 3 - sp, 1, 1, FIN2); P(36 + d, my + 3 + sp, 1, 1, FIN2); } }
    for(let x = 0; x <= 36; x++){ const h = meia(x);
      for(let y = my - h; y <= my + h; y++){ const f = (y - (my - h)) / Math.max(1, 2 * h); P(x, y, 1, 1, f < .2 ? '#6E7888' : f < .42 ? '#B9C0CA' : f < .76 ? ((x + y) % 3 ? '#E9EDF2' : '#F8FAFC') : '#C7CDD5'); } }
    for(let x = 19; x <= 22; x++) P(x, my + meia(x) + 1, 1, x < 21 ? 2 : 1, FIN);
    for(let x = 28; x <= 31; x++) P(x, my + meia(x) + 1, 1, x < 30 ? 2 : 1, FIN);
    P(8, my + 2, 3, 1, FIN); P(9, my + 3, 3, 1, FIN); P(10, my + 4, 2, 1, FIN2);
    for(let y = my - 4; y <= my + 4; y++) P(8 + (Math.abs(y - my) > 2 ? 1 : 0), y, 1, 1, '#9AA2AD');
    [15, 22, 29].forEach(x => P(x, my - 1, 2, 2, '#1B1D22'));
    P(4, my - 3, 2, 2, PAPEL); P(5, my - 2, 1, 1, INK); P(0, my, 2, 1, '#5A606A');
    /* o contorno: todo ponto vazio encostado no peixe vira tinta */
    const im = g.getImageData(0, 0, cv.width, cv.height), d = im.data, W = cv.width, cheio = (x, y) => x >= 0 && y >= 0 && x < W && y < cv.height && d[(y * W + x) * 4 + 3] > 0 && !(d[(y * W + x) * 4] === 15 && d[(y * W + x) * 4 + 1] === 18);
    const borda = [];
    for(let y = 0; y < cv.height; y++) for(let x = 0; x < W; x++) if(!d[(y * W + x) * 4 + 3] && (cheio(x - 1, y) || cheio(x + 1, y) || cheio(x, y - 1) || cheio(x, y + 1))) borda.push([x, y]);
    g.fillStyle = INK; borda.forEach(([x, y]) => g.fillRect(x, y, 1, 1));
    return (PIA_G = cv);
  }
  /* texto de pixel numa tela qualquer (x, y é o meio, ou a ponta com al 'e'/'d'), com contorno e sombra se pedir */
  function txtV(g, t, x, y, s, cor, al, borda){
    t = txtN(t); const w = pixLarg(t, s); const ix = al === 'e' ? x : al === 'd' ? x - w : Math.round(x - w / 2), iy = Math.round(y - 5 * s / 2);
    const vai = (dx, dy, c) => { g.fillStyle = c; let cx = ix + dx; for(const ch of t){ const gl = GL[ch] || GL['?']; gl.forEach((row, ry) => { for(let j = 0; j < row.length; j++) if(row.charCodeAt(j) === 49) g.fillRect(cx + j * s, iy + dy + ry * s, s, s); }); cx += (gl[0].length + 1) * s; } };
    if(borda){ vai(1, 2, 'rgba(0,0,0,.45)'); for(const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) vai(dx, dy, borda); }
    vai(0, 0, cor); return w;
  }
  /* um dígito de sete segmentos (10 x 18): os apagados ficam de fantasma, como num visor de verdade */
  function dig7(g, x, y, ch, on, off){
    const S = { a: [2, 0, 6, 2], b: [8, 2, 2, 6], c: [8, 10, 2, 6], d: [2, 16, 6, 2], e: [0, 10, 2, 6], f: [0, 2, 2, 6], g: [2, 8, 6, 2] }, acesos = SEG7[ch] || '';
    for(const k in S){ const s = S[k]; g.fillStyle = acesos.includes(k) ? on : off; g.fillRect(x + s[0], y + s[1], s[2], s[3]); }
  }
  /* retângulo de canto redondo em pontos (linha por linha) */
  function cantoR(g, x, y, w, h, r, c){ g.fillStyle = c; for(let i = 0; i < h; i++){ const k = i < r ? r - i - .5 : i >= h - r ? i - (h - r) + .5 : 0, ins = k ? Math.round(r - Math.sqrt(Math.max(0, r * r - k * k))) : 0; g.fillRect(x + ins, y + i, w - ins * 2, 1); } }
  /* a balancinha: argola em cima, corpo amarelo com o visor, os dois botões e o gancho embaixo. (cx, y) é o alto da argola */
  function desenhaBalanca(g, cx, y, vis){
    const bx = cx - 44, by = y + 10;
    g.fillStyle = INK; g.fillRect(cx - 8, y - 1, 16, 12); g.fillStyle = '#C9CED6'; g.fillRect(cx - 7, y, 14, 3); g.fillRect(cx - 7, y, 3, 10); g.fillRect(cx + 4, y, 3, 10); g.fillStyle = '#EEF1F4'; g.fillRect(cx - 6, y + 1, 4, 1);
    cantoR(g, bx - 1, by - 1, 90, 68, 7, INK); cantoR(g, bx, by, 88, 66, 6, AMARELO);
    g.fillStyle = '#FBF7A6'; g.fillRect(bx + 6, by + 2, 76, 2); g.fillStyle = '#E8B53A'; g.fillRect(bx + 4, by + 61, 80, 3); g.fillRect(bx + 84, by + 8, 2, 52);
    txtV(g, 'CORRE', cx, by + 8, 1, INK);
    const lx = bx + 6, ly = by + 13;
    g.fillStyle = INK; g.fillRect(lx, ly, 76, 32); g.fillStyle = vis.claro ? '#FFF1D6' : vis.lit ? '#24170C' : '#14171E'; g.fillRect(lx + 2, ly + 2, 72, 28);
    const on = vis.claro ? INK : vis.lit ? '#FFB23D' : '#B88A4A', off = vis.claro ? '#E9D9BC' : '#2C2117';
    txtV(g, 'HOLD', lx + 4, ly + 6, 1, vis.hold ? on : off, 'e'); txtV(g, 'KG', lx + 70, ly + 25, 1, on, 'd');
    const ds = vis.txt.replace(',', ''), xs = [lx + 5, lx + 20, lx + 33, lx + 46];
    for(let i = 0; i < 4; i++) dig7(g, xs[i], ly + 10, ds[i], on, off);
    g.fillStyle = on; g.fillRect(lx + 16, ly + 25, 2, 2); g.fillRect(lx + 15, ly + 27, 2, 1);
    g.fillStyle = INK; g.fillRect(bx + 23, by + 47, 9, 7); g.fillRect(bx + 56, by + 47, 9, 7); g.fillStyle = ROSA; g.fillRect(bx + 24, by + 48, 7, 5); g.fillStyle = AZUL; g.fillRect(bx + 57, by + 48, 7, 5);
    g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(bx + 25, by + 48, 3, 1); g.fillRect(bx + 58, by + 48, 3, 1);
    txtV(g, 'MAX 50KG', cx, by + 58, 1, '#8A6A1E');
    /* o gancho: a haste e o J, a ponta pro lado */
    const hy = by + 66; g.fillStyle = INK; g.fillRect(cx - 2, hy, 4, 9); g.fillStyle = '#C9CED6'; g.fillRect(cx - 1, hy, 2, 8);
    g.fillStyle = INK; [[0, 9], [0, 10], [0, 11], [1, 12], [2, 13], [3, 13], [4, 12], [5, 11], [5, 10]].forEach(([dx, dy]) => g.fillRect(cx - 1 + dx, hy + dy, 2, 1));
    return hy + 12;
  }
  /* a capivara torcedora de bandeirinha, de pé no barranco (x, y = os pés) */
  function capiTorce(g, x, y, lado, ban, t){
    const R = (dx, dy, w, h, c) => { g.fillStyle = c; g.fillRect(lado > 0 ? x + dx : x - dx - w, y + dy, w, h); };
    const M = '#8A5A3B', E = '#6B4429', C2 = '#A87652';
    R(-9, -10, 15, 8, INK); R(-8, -9, 13, 6, M); R(-8, -4, 13, 1, E); R(3, -14, 8, 8, INK); R(4, -13, 6, 6, M); R(9, -12, 2, 4, C2);
    R(5, -15, 2, 2, INK); R(7, -11, 1, 1, INK); R(10, -10, 1, 1, INK);
    R(-7, -2, 2, 2, E); R(-3, -2, 2, 2, E); R(1, -2, 2, 2, E);
    R(5, -24, 1, 14, INK); const on = Math.sin(t * 9) > 0 ? 1 : 0; R(6, -24 + on, 6, 4, ban); R(6, -24 + on, 6, 1, 'rgba(255,255,255,.35)');
  }
  /* o carimbo, pronto uma vez */
  let CARIMBO = null;
  function carimbo(){
    if(CARIMBO) return CARIMBO;
    const w = pixLarg('RECORDE!', 2) + 14, cv = document.createElement('canvas'); cv.width = w + 4; cv.height = 24; const g = cv.getContext('2d');
    g.fillStyle = INK; g.fillRect(0, 0, w + 4, 24); g.fillStyle = ROSA; g.fillRect(2, 2, w, 20); g.fillStyle = PAPEL; g.fillRect(4, 4, w - 4, 1); g.fillRect(4, 19, w - 4, 1);
    txtV(g, 'RECORDE!', Math.round((w + 4) / 2), 12, 2, PAPEL, 'c', INK);
    return (CARIMBO = cv);
  }
  /* a câmera do fotógrafo da beira, no tripé (o flash é um sol branco pequeno em cima) */
  function camera(g, x, y, flash){
    g.fillStyle = INK; g.fillRect(x, y + 4, 1, 9); g.fillRect(x - 4, y + 12, 2, 1); g.fillRect(x + 3, y + 12, 2, 1); [[-1, 7], [-2, 9], [-3, 11], [1, 7], [2, 9], [3, 11]].forEach(([dx, dy]) => g.fillRect(x + dx, y + dy, 1, 2));
    g.fillRect(x - 7, y - 4, 14, 9); g.fillRect(x - 4, y - 6, 5, 2); g.fillRect(x + 3, y - 6, 3, 2);
    g.fillStyle = '#3A3F4A'; g.fillRect(x - 6, y - 3, 12, 7); g.fillStyle = '#C9CED6'; g.fillRect(x - 3, y - 5, 3, 1); g.fillRect(x + 4, y - 5, 1, 1);
    g.fillStyle = INK; g.fillRect(x - 3, y - 2, 6, 5); g.fillStyle = '#9CC9F0'; g.fillRect(x - 2, y - 1, 4, 3); g.fillStyle = PAPEL; g.fillRect(x - 2, y - 1, 1, 1);
    if(flash > 0){ const r = Math.round(3 + flash * 7), fx = x + 4, fy = y - 8; g.fillStyle = 'rgba(255,255,255,' + (.35 + flash * .65).toFixed(2) + ')'; g.fillRect(fx - 1, fy - r, 3, r * 2 + 1); g.fillRect(fx - r, fy - 1, r * 2 + 1, 3); g.fillRect(fx - 2, fy - 2, 5, 5); }
  }
  function balanca(rec){
    const velho = document.getElementById('cvr-balanca'); if(velho) velho.remove();
    const el = document.createElement('div'); el.id = 'cvr-balanca'; el.className = 'cvr-balanca'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'A mais pesada do Tibagi');
    el.innerHTML = `<canvas aria-hidden="true"></canvas><p class="sr-only" aria-live="assertive">Piapara de 4,850 quilos: a mais pesada do Tibagi.${rec && rec.vida ? ' O teu recorde de todos os tempos.' : ''} Toca pra fechar.</p>`;
    document.body.appendChild(el);
    const cv = el.querySelector('canvas'), gt = cv.getContext('2d'), buf = document.createElement('canvas'), g = buf.getContext('2d');
    const calmo = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    const TRAVA = calmo ? 0 : 2750, FIM = calmo ? 7000 : 10200, ESPERA = calmo ? 600 : 1200;
    const B = V.balanca = { t0: performance.now(), fase: calmo ? 'travou' : 'pesando', txt: calmo ? '4850' : '0000', vida: !!(rec && rec.vida), calmo, px: 1, W: 0, H: 0 };
    let raf = 0, fim = false, ult = B.t0, travouEm = 0, txtT = 0, fogoT = 0, fogoLado = 0, fotoT = 0, gotaT = 0, chuvaT = 0, molou = false;
    const conf = [], fogos = [], fogs = [], bolhas = [], gotas = [], fotos = [], brilhos = [];
    /* a escala do pixel: a cena inteira (uns 250 de altura) cabe na tela, com o maior pixel inteiro que der */
    let L = {};
    const tam = () => {
      const d = Math.min(2, window.devicePixelRatio || 1), W = Math.round(innerWidth * d), H = Math.round(innerHeight * d);
      cv.width = W; cv.height = H; const px = Math.max(1, Math.min(Math.floor(H / 252), Math.floor(W / 172)));
      buf.width = Math.ceil(W / px); buf.height = Math.ceil(H / px); Object.assign(B, { px, W: buf.width, H: buf.height });
      /* a faixa de cima numa linha, ou em duas, ou miúda */
      const BW = buf.width, f1 = 'A MAIS PESADA DO TIBAGI'; let faixa = [f1], fs = 2;
      if(pixLarg(f1, 2) + 22 > BW - 6){ faixa = ['A MAIS PESADA', 'DO TIBAGI']; if(pixLarg(faixa[0], 2) + 22 > BW - 6){ faixa = [f1]; fs = 1; } }
      const fh = faixa.length * 5 * fs + (faixa.length - 1) * 3 + 10, total = fh + 6 + 10 + 66 + 12 + 96 + 8 + 30;
      const top = Math.max(2, Math.round((buf.height - total) / 2));
      L = { cx: Math.round(BW / 2), faixa, fs, fh, fy: top, anel: top + fh + 6, txy: top + fh + 6 + 10 + 66 + 12 + 96 + 8, chao: buf.height - 9 };
      L.capis = [[Math.max(16, Math.round(BW * .1)), 1, ROSA], [BW - Math.max(16, Math.round(BW * .1)), -1, AZUL]];
      /* os fotógrafos dos lados, na altura do peixe (entre a balança e o texto de baixo, pra não tampar nada) */
      const y1 = L.anel + 100, y2 = Math.max(y1 + 20, L.txy - 22);
      L.cams = [[Math.round(BW * .08), y1], [Math.round(BW * .2), y2], [Math.round(BW * .92), y1 + 8], [Math.round(BW * .8), y2 - 6]];
    }; tam();
    const fecha = () => { if(fim) return; fim = true; B.fase = 'fim'; el.classList.add('sai'); removeEventListener('keydown', tecla, true); removeEventListener('resize', tam); removeEventListener('hashchange', fecha); setTimeout(() => { cancelAnimationFrame(raf); el.remove(); if(V.balanca === B) V.balanca = null; }, 650); };
    const trava = agora => { if(travouEm) return; travouEm = agora; B.fase = 'travou'; B.txt = '4850'; somRio('bip'); setTimeout(() => somRio('trofeu'), 220); estoura(); };
    const toque = () => { const ag = performance.now(); if(ag - B.t0 < ESPERA) return; if(!travouEm) trava(ag); else if(ag - travouEm > 600 || calmo) fecha(); };
    const tecla = e => { if(e.repeat) { if(e.key === ' ' || e.key === 'Enter') e.preventDefault(); return; } if(e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); if(performance.now() - B.t0 > 300) fecha(); } else if(e.key === ' ' || e.key === 'Enter'){ e.preventDefault(); e.stopPropagation(); toque(); } };
    /* saiu da cidade no meio (outra página), a balança vai junto */
    addEventListener('keydown', tecla, true); addEventListener('resize', tam); addEventListener('hashchange', fecha);
    el.addEventListener('pointerdown', ev => { ev.preventDefault(); toque(); });
    /* travou: o confete estoura da balança, e começa o resto */
    function estoura(){
      if(calmo) return;
      const ox = L.cx, oy = L.anel + 10 + 30;
      for(let i = 0; i < 170; i++){ const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 150; conf.push({ x: ox, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 70, c: FESTA[i % FESTA.length], ph: Math.random() * 6, vida: 5 + Math.random() * 2 }); }
      for(let i = 0; i < 14; i++) brilhos.push({ x: ox + (Math.random() - .5) * 150, y: L.anel + Math.random() * 170, ph: Math.random() * 6, c: i % 3 ? PAPEL : AMARELO });
    }
    for(let i = 0; i < 18; i++) bolhas.push({ x: Math.random() * B.W, y: B.H - Math.random() * B.H * .5, v: 10 + Math.random() * 20, ph: Math.random() * 6 });
    somRio('tchibum');
    const ease = f => { const c = 1.6; f -= 1; return 1 + (c + 1) * f * f * f + c * f * f; };
    const passo = agora => {
      if(!el.isConnected) return;
      const dt = Math.min(.05, (agora - ult) / 1000); ult = agora; const t = agora - B.t0, s = t / 1000, BW = B.W, BH = B.H;
      if(!calmo && !molou && t >= 950){ molou = true; somRio('mola'); }
      if(!travouEm && t >= TRAVA) trava(agora);
      const tt = travouEm ? (agora - travouEm) / 1000 : -1;
      if(t > FIM) fecha();
      /* o fundo: a noite azul do rio, a luz atrás da balança e o sol de raios (fraco pesando, forte depois de travar) */
      const fundo = g.createLinearGradient(0, 0, 0, BH); fundo.addColorStop(0, '#0B1633'); fundo.addColorStop(1, '#06091A'); g.fillStyle = fundo; g.fillRect(0, 0, BW, BH);
      const lcx = L.cx, lcy = L.anel + 40, R = Math.hypot(BW, BH);
      g.save(); g.translate(lcx, lcy); g.rotate(calmo ? 0 : s * .25);
      /* rosa e laranja: amarelo fraquinho em cima do azul vira verde-oliva */
      for(let i = 0; i < 16; i++){ g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R, i / 16 * Math.PI * 2, (i + .5) / 16 * Math.PI * 2); g.closePath(); g.fillStyle = i % 2 ? ROSA : LARANJA; g.globalAlpha = tt >= 0 ? .14 + (calmo ? 0 : .05 * Math.sin(s * 3)) : .04; g.fill(); }
      g.restore(); g.globalAlpha = 1;
      const luz = g.createRadialGradient(lcx, lcy, 0, lcx, lcy, 120); luz.addColorStop(0, tt >= 0 ? 'rgba(255,170,120,.32)' : 'rgba(156,201,240,.18)'); luz.addColorStop(1, 'rgba(255,170,120,0)'); g.fillStyle = luz; g.fillRect(0, 0, BW, BH);
      /* a água embaixo, os barrancos de terra roxa dos lados e as bolhas subindo */
      g.fillStyle = '#173A7A'; g.fillRect(0, L.chao, BW, BH - L.chao); g.fillStyle = '#2E5BFF';
      for(let x = 0; x < BW; x += 6) g.fillRect(x + Math.round(Math.sin(s * 2 + x * .3) * 2), L.chao + 2 + (x % 12 ? 0 : 3), 3, 1);
      L.capis.forEach(([x, lado]) => { const w = 34, x0 = lado > 0 ? x - 14 : x - 20; g.fillStyle = INK; g.fillRect(x0 - 1, L.chao - 6, w + 2, 7); g.fillStyle = '#7A3A28'; g.fillRect(x0, L.chao - 5, w, 6); g.fillStyle = '#C9B26A'; g.fillRect(x0, L.chao - 5, w, 1); });
      if(!calmo) bolhas.forEach(b => { b.y -= b.v * dt; if(b.y < -4){ b.y = BH + 2; b.x = Math.random() * BW; } const bx = Math.round(b.x + Math.sin(s * 2 + b.ph) * 3), by = Math.round(b.y); g.fillStyle = 'rgba(156,201,240,.55)'; g.fillRect(bx, by, 2, 2); g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(bx, by, 1, 1); });
      /* os fogos dos dois lados (de 0,55 a 0,9 s um do outro, lado sim lado não) */
      if(tt >= 0 && !calmo && agora > fogoT){ fogoT = agora + 550 + Math.random() * 350; fogoLado ^= 1; const esq = !!fogoLado, x = esq ?BW * (.08 + Math.random() * .22) : BW * (.7 + Math.random() * .22); fogos.push({ x, y: L.chao - 4, vy: -(BH * .55 + Math.random() * BH * .25), alvo: BH * (.12 + Math.random() * .25), c: FESTA[Math.floor(Math.random() * 5)] }); }
      for(let i = fogos.length - 1; i >= 0; i--){ const f = fogos[i]; f.y += f.vy * dt; f.vy *= .985; g.fillStyle = '#FFE7A8'; g.fillRect(Math.round(f.x), Math.round(f.y), 1, 3);
        if(f.y <= f.alvo){ fogos.splice(i, 1); somRio('fogo'); const n = 28; for(let k = 0; k < n; k++){ const a = k / n * Math.PI * 2, v = 38 + Math.random() * 30; fogs.push({ x: f.x, y: f.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, c: k % 4 ? f.c : PAPEL, vida: 1.1 + Math.random() * .4, t: 0 }); } } }
      for(let i = fogs.length - 1; i >= 0; i--){ const p = fogs[i]; p.t += dt; if(p.t > p.vida){ fogs.splice(i, 1); continue; } p.vx *= .97; p.vy = p.vy * .97 + 40 * dt; p.x += p.vx * dt; p.y += p.vy * dt; g.globalAlpha = Math.max(0, 1 - p.t / p.vida); g.fillStyle = p.c; const z = p.t < .25 ? 2 : 1; g.fillRect(Math.round(p.x), Math.round(p.y), z, z); }
      g.globalAlpha = 1;
      /* a corda e a balança descendo (com a mola sacudindo quando a piapara engancha) */
      const desce = calmo ? 1 : Math.min(1, t / 650), queda = calmo ? 0 : Math.round((1 - ease(desce)) * -(L.anel + 120));
      const tm = calmo ? 99 : (t - 950) / 1000, amp = tm > 0 ? Math.exp(-1.9 * tm) : 0, mola = tm > 0 ? Math.round(7 * amp * Math.cos(8.5 * tm)) : 0;
      const tremor = !calmo && tt >= 0 && tt < .45 ? Math.round((Math.random() - .5) * 8 * (1 - tt / .45)) : 0;
      const ay = L.anel + queda + mola, ax = L.cx + tremor;
      g.fillStyle = '#B79C6A'; g.fillRect(ax - 1, 0, 2, ay); g.fillStyle = '#7E6A44'; for(let y = (Math.floor(s * 30) % 4); y < ay; y += 4) g.fillRect(ax - 1, y, 1, 2);
      /* os números: zero até ela enganchar, depois correm com a mola e travam em 4,850 */
      if(!travouEm){ if(tm <= 0) B.txt = '0000'; else if(agora > txtT){ txtT = agora + 70; let v = (PIAPARA_MAX + 2.6 * amp * Math.cos(8.5 * tm) + (Math.random() - .5) * .06 * (amp + .1)) * Math.min(1, tm / .12); v = clamp(v, 0, 9.999); B.txt = v.toFixed(3).replace('.', ''); somRio('tique'); } }
      const claro = tt >= 0 && tt < .16 && !calmo;
      const gancho = desenhaBalanca(g, ax, ay, { txt: B.txt.slice(0, 1) + ',' + B.txt.slice(1), lit: tm > 0 || calmo, hold: tt >= 0 && (calmo || Math.floor(tt * 2.5) % 2 === 0 || tt > 2), claro });
      /* a piapara: voa da água até o gancho (de 0,5 a 0,95 s), engancha e fica balançando, pingando do rabo */
      const spr = piaparaGrande(); let px0 = ax, py0 = gancho, giro = Math.PI / 2;
      if(!calmo && t < 950){ const f = clamp((t - 500) / 450, 0, 1); px0 = Math.round(ax + (1 - f) * BW * .28); py0 = Math.round(BH + 30 + (gancho - BH - 30) * f - Math.sin(f * Math.PI) * 40); giro = Math.PI / 2 * f - (1 - f) * .3; }
      else giro += (calmo ? 0 : .35 * Math.exp(-.8 * Math.max(0, tm)) * Math.sin(3.1 * Math.max(0, tm)) + .05 * Math.sin(s * 1.4));
      if(calmo || t >= 500){ g.save(); g.imageSmoothingEnabled = false; g.translate(px0, py0); g.rotate(giro); g.scale(2, 2); g.drawImage(spr, -1, -15); g.restore(); }
      if(!calmo && t >= 950 && agora > gotaT){ gotaT = agora + 180 + Math.random() * 260; const cauda = 92; gotas.push({ x: px0 - Math.sin(giro - Math.PI / 2) * cauda, y: py0 + Math.cos(giro - Math.PI / 2) * cauda, vy: 0 }); }
      for(let i = gotas.length - 1; i >= 0; i--){ const d = gotas[i]; d.vy += 260 * dt; d.y += d.vy * dt; if(d.y >= L.chao){ gotas.splice(i, 1); g.fillStyle = '#9CC9F0'; g.fillRect(Math.round(d.x) - 2, L.chao - 1, 1, 1); g.fillRect(Math.round(d.x) + 2, L.chao - 1, 1, 1); continue; } g.fillStyle = '#9CC9F0'; g.fillRect(Math.round(d.x), Math.round(d.y), 1, 2); }
      /* as capivaras da beira pulando de bandeirinha e as câmeras dos fotógrafos (o flash, no máximo uns três por segundo) */
      L.capis.forEach(([x, lado, ban], k) => capiTorce(g, x, L.chao - 5 - (tt >= 0 && !calmo ? Math.round(Math.abs(Math.sin(s * 6 + k * 1.7)) * 7) : 0), lado, ban, s + k));
      if(tt >= 0 && !calmo && agora > fotoT){ fotoT = agora + 330 + Math.random() * 380; fotos.push({ i: Math.floor(Math.random() * L.cams.length), t0: agora }); }
      L.cams.forEach(([x, y], i) => { const u = fotos.filter(o => o.i === i).pop(); camera(g, x, y, u ? Math.max(0, 1 - (agora - u.t0) / 160) : 0); });
      while(fotos.length > 8) fotos.shift();
      /* a faixa de cima: "PESANDO..." piscando; travou, a faixa rosa cai do alto */
      if(tt < 0){ if(Math.floor(s * 3) % 3 !== 2) txtV(g, 'PESANDO' + '...'.slice(0, 1 + Math.floor(s * 3) % 3), L.cx, L.fy + L.fh / 2, 2, PAPEL, 'c', INK); }
      else { const f = calmo ? 1 : ease(Math.min(1, tt / .45)), fy = Math.round(L.fy + (1 - f) * -(L.fh + 20)), larg = Math.max(...L.faixa.map(x => pixLarg(x, L.fs))) + 18;
        g.fillStyle = INK; g.fillRect(L.cx - larg / 2 - 7, fy + 3, 9, L.fh); g.fillRect(L.cx + larg / 2 - 2, fy + 3, 9, L.fh); g.fillStyle = '#C23574'; g.fillRect(L.cx - larg / 2 - 6, fy + 4, 7, L.fh - 2); g.fillRect(L.cx + larg / 2 - 1, fy + 4, 7, L.fh - 2);
        g.fillStyle = INK; g.fillRect(Math.round(L.cx - larg / 2) - 1, fy - 1, larg + 2, L.fh + 2); g.fillStyle = ROSA; g.fillRect(Math.round(L.cx - larg / 2), fy, larg, L.fh); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(Math.round(L.cx - larg / 2), fy, larg, 2);
        L.faixa.forEach((linha, k) => txtV(g, linha, L.cx, fy + 5 + k * (5 * L.fs + 3) + 5 * L.fs / 2, L.fs, AMARELO, 'c', INK)); }
      /* o carimbo RECORDE! cai na ponta da faixa, de lado, no vão entre a faixa e a balança (desenhado reto numa tela à
         parte e girado sem alisar, pra continuar pixel) */
      if(tt >= 0){ const f = calmo ? 1 : Math.min(1, tt / .18), esc = calmo ? 1 : 1 + (1 - f) * 2.2 + (tt > .18 && tt < .5 ? Math.sin((tt - .18) * 30) * .05 : 0);
        const cb = carimbo(), larg = Math.max(...L.faixa.map(x => pixLarg(x, L.fs))) + 18, sx = Math.min(BW - cb.width / 2 - 2, L.cx + larg / 2 - 12);
        g.save(); g.imageSmoothingEnabled = false; g.translate(Math.round(sx), L.fy + L.fh + 9); g.rotate(-.2); g.scale(esc, esc); g.drawImage(cb, -Math.round(cb.width / 2), -Math.round(cb.height / 2)); g.restore(); }
      /* embaixo: o peso, o recorde e o "toca pra fechar" */
      if(tt >= 0){ const ap = calmo ? 1 : Math.min(1, (tt - .35) / .3); if(ap > 0){ g.globalAlpha = ap; const s1 = pixLarg('PIAPARA DE 4,850 KG', 2) > BW - 6 ? 1 : 2;
        txtV(g, 'PIAPARA DE 4,850 KG', L.cx, L.txy + 5, s1, AMARELO, 'c', INK);
        txtV(g, B.vida ? 'O TEU RECORDE DE TODOS OS TEMPOS' : 'DE NOVO A MAIS PESADA!', L.cx, L.txy + 17, 1, PAPEL, 'c', INK);
        if((calmo || tt > 1.6) && Math.floor(s * 2) % 2 === 0) txtV(g, 'TOCA PRA FECHAR', L.cx, L.txy + 27, 1, '#9CC9F0', 'c', INK);
        g.globalAlpha = 1; } }
      /* o confete (o estouro e a chuva que vem depois) e os brilhos piscando em volta */
      if(tt >= 0 && !calmo && agora > chuvaT && tt < 6){ chuvaT = agora + 45; conf.push({ x: Math.random() * BW, y: -4, vx: (Math.random() - .5) * 20, vy: 20 + Math.random() * 30, c: FESTA[Math.floor(Math.random() * FESTA.length)], ph: Math.random() * 6, vida: 6 }); }
      for(let i = conf.length - 1; i >= 0; i--){ const c = conf[i]; c.vida -= dt; if(c.vida <= 0 || c.y > BH + 4){ conf.splice(i, 1); continue; } c.vx *= .985; c.vy = Math.min(c.vy + 90 * dt, 55); c.x += (c.vx + Math.sin(s * 5 + c.ph) * 14) * dt; c.y += c.vy * dt;
        const vira = Math.sin(s * 9 + c.ph); g.fillStyle = c.c; g.fillRect(Math.round(c.x), Math.round(c.y), vira > .3 ? 2 : 1, vira < -.3 ? 2 : 1); }
      brilhos.forEach(b => { const k = Math.sin(s * 4 + b.ph); if(k < .2) return; const r = k > .8 ? 2 : 1, x = Math.round(b.x), y = Math.round(b.y); g.fillStyle = b.c; g.fillRect(x, y - r, 1, r * 2 + 1); g.fillRect(x - r, y, r * 2 + 1, 1); });
      B.part = conf.length + fogs.length;
      /* o clarão de quando trava (um só, e curto) */
      if(claro){ g.fillStyle = 'rgba(255,255,255,' + (.4 * (1 - tt / .16)).toFixed(2) + ')'; g.fillRect(0, 0, BW, BH); }
      gt.imageSmoothingEnabled = false; gt.drawImage(buf, 0, 0, BW * B.px, BH * B.px);
      raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
  }
  function abrePorta(){
    if(V.voo) return;
    /* v3.75: o toque que o minijogo ou a pesca já usou (no pointerdown) não vale de novo no clique que vem depois (senão
       quem desce do barco no píer já pegava outro barco no mesmo toque). No barco, o botão amarelo é da pesca */
    if(V.mjIgn && Date.now() - V.mjIgn < 800){ V.mjIgn = 0; return; }
    if(V.eu && V.eu.barco){ rioAperta(); return; }
    if(V.eu && V.eu.sit){ V.eu.sit = false; V.eu.pesca = null; portaUI(); enviaPos(true); return; }
    const p = V.porta; if(!p) return;
    if(p.tipo === 'aeroporto'){ aeroportoSheet(); return; }
    /* v3.45: barraca com lugar (o Hórus) é porta: entra na construção 3D, e a ferramenta tá lá dentro. Desligada, segue
       pro balcão de sempre (que manda ligar) */
    if(p.tipo === 'barraca'){ if(p.b.id === 'manual' && !(p.b.lugar && C.casa && C.casa.LUGARES && C.casa.LUGARES[p.b.lugar])){ if(C.manual) C.manual.abrir(); return; }
      if(p.b.lugar && aberta(p.b) && C.casa && C.casa.LUGARES && C.casa.LUGARES[p.b.lugar]){ if(C.versoSom) C.versoSom.porta(); C.casa.abrir({ lugar: p.b.lugar }); return; }
      abreBalcao(p.b); return; }
    if(p.tipo === 'beisebol'){ if(C.casa && C.casa.LUGARES && C.casa.LUGARES.beisebol){ if(C.versoSom) C.versoSom.porta(); C.casa.abrir({ lugar: 'beisebol' }); } return; }
    if(p.tipo === 'quadra'){ if(C.casa && C.casa.LUGARES && C.casa.LUGARES[p.k]){ if(C.versoSom) C.versoSom.porta(); C.casa.abrir({ lugar: p.k }); } return; }
    if(p.tipo === 'publi'){ publiSheet(p.k); return; }
    /* v3.53: a placa do patinete abre a escolha entre as pistas de kart */
    if(p.tipo === 'pista' && p.k === 'patinete' && C.casa && C.casa.escolhePista){ C.casa.escolhePista(); return; }
    if(p.tipo === 'pista'){ if(C.casa && C.casa.LUGARES && C.casa.LUGARES[p.k]){ if(C.versoSom) C.versoSom.porta(); C.casa.abrir({ lugar: p.k }); } return; }
    if(p.tipo === 'torneio'){ if(C.casa && C.casa.LUGARES && C.casa.LUGARES.pesca){ if(C.versoSom) C.versoSom.porta(); C.casa.abrir({ lugar: 'pesca' }); } return; }
    if(p.tipo === 'atelie'){ if(C.versoSom) C.versoSom.porta(); lojaSheet(); return; }
    if(p.tipo === 'barco'){ embarca(p.pier); return; }
    if(p.tipo === 'morador'){ trocaIdeia(p.m); return; }
    if(p.tipo === 'sebo'){ if(C.casa && C.casa.LUGARES && C.casa.LUGARES.sebo){ if(C.versoSom) C.versoSom.porta(); C.casa.abrir({ lugar: 'sebo' }); } return; }
    if(p.tipo === 'calcadao'){ if(C.casa && C.casa.LUGARES && C.casa.LUGARES.calcadao){ if(C.versoSom) C.versoSom.porta(); C.casa.abrir({ lugar: 'calcadao' }); } return; }
    if(p.tipo === 'mural'){ abreBalcao(BC_MURAL); return; }
    if(p.tipo === 'banca'){ abreBalcao(BC_BANCA); return; }
    if(p.tipo === 'banco'){ const b = p.b; V.alvo = null; V.eu.x = b.x; V.eu.y = b.y + (b.degrau ? 0 : 2); V.eu.sit = true; V.eu.mov = false; V.eu.dir = 'baixo'; V.eu.pesca = p.pesca ? { ate: Date.now() + 3500 + Math.random() * 3500 } : null; portaUI(); enviaPos(true); if(p.pesca) C.toast('Jogou a linha. Espera que uma hora fisga.', 2800); return; }
    if(p.tipo === 'comida'){ come(p.k); return; }
    if(p.tipo === 'aquario' || p.tipo === 'jogo'){ abreJogo(p.jogo); return; }
    /* v3.82: as placas do Parque Arthur Thomas */
    if(p.tipo === 'placa'){ C.toast(p.txt, 8000); if(p.noel) olhaNoel(9000); return; }
    if(p.tipo === 'polaroid'){ fotoNoel(); return; }
    if(p.tipo === 'civico'){ trampoSheet(p.k); return; }
    if(p.tipo === 'tarefa'){ if(V.mjIgn && Date.now() - V.mjIgn < 800){ V.mjIgn = 0; return; } agirTarefa(); return; }
    if(p.tipo === 'lote'){
      C.sheet(`<div class="form"><div class="sheet-head"><h2>Lote livre</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
        <p>Cada perfil novo na vitrine do Corre ganha um quarteirão aqui, com casa própria. Chama quem faz corre contigo.</p>
        <div class="acts"><button type="button" class="btn pri" data-act="cvr-convite">${ico('copy')} Copiar convite</button></div></div>`);
      return;
    }
    const c = p.c, f = c.p || {}, meu = c.id === (C.st.me && C.st.me.id), cat = ((C.mural && C.mural.CATS || []).find(x => x[0] === f.categoria) || [])[1] || '';
    const nums = [[f.posts, 'post', 'posts'], [f.seg, 'seguidor', 'seguidores'], [f.itens, 'item no catálogo', 'itens no catálogo'], [f.esc, 'escolha no Mural', 'escolhas no Mural']].filter(([n]) => n).map(([n, a, b]) => `<span class="tag">${n} ${n === 1 ? a : b}</span>`).join('');
    /* a porta: a prévia da casa por dentro com o botão de entrar em cima, e o perfil embaixo */
    const PV = C.casa, pl = PV && PV.plantaDe ? PV.plantaDe(c) : null, loft = !!(pl && pl.mezanino), mansao = !!(pl && pl.k === 'brutal'), templo = !!(pl && pl.k === 'templo'), luxo = !!(pl && pl.k === 'luxo');
    C.sheet(`<div class="form cvr-porta-s"><div class="sheet-head"><h2>${meu ? 'Tua casa' : 'Casa de @' + esc(c.handle)}</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      ${PV ? `<div class="cvr-previa"><canvas id="cvr-previa" width="320" height="180" aria-label="A casa por dentro, vista de cima"></canvas><span class="cvr-previa-t">${mansao ? 'mansão brutalista · 2 andares' : templo ? 'o templo · 2 andares' : luxo ? 'mansão de 20 milhões · 2 andares' : loft ? 'loft · 2 andares' : 'por dentro · 3D'}</span>
        <button type="button" class="btn pri cvr-entrar" data-act="cvr-casa-entrar" data-id="${esc(c.id)}">${ico('home')} ${meu ? 'Entrar na casa' : 'Visitar a casa'}</button></div>` : ''}
      <div class="cvr-casa-h">${C.avatar(f, 'l')}<div><b>${esc(f.nome || c.handle)}</b><small>@${esc(c.handle)}${f.cidade ? ' · ' + esc(f.cidade) : ''}</small>${cat ? `<span class="tag cat">${esc(cat)}</span>` : ''}</div></div>
      ${f.faz ? `<p>${esc(f.faz)}</p>` : ''}
      <div class="meta">${nums || '<span class="note">Casa nova no pedaço.</span>'}</div>
      ${p.dois ? '<p class="fine">Dois quarteirões, um do lado do outro, ligados pela passarela por cima da rua: a casa e o estúdio. Só tem um desses no Correverso.</p>' : meu ? `<p class="fine">Todo mundo tem um quarteirão. A casa cresce com o que você faz no Corre: posts, seguidores, itens no catálogo e escolhas no Mural. Dinheiro não conta. Nível ${c.tier} de 4.</p>` : ''}
      <div class="acts">${PV ? '' : `<button type="button" class="btn pri" data-act="cvr-casa-entrar" data-id="${esc(c.id)}">${ico('home')} ${meu ? 'Entrar na casa' : 'Visitar a casa'}</button>`}<button type="button" class="btn" data-act="cvr-perfil" data-h="${esc(c.handle)}" data-meu="${meu ? '1' : ''}" data-cor="${esc((CASA[c.cat] || CASA.outros).a)}">${ico('eu')} ${meu ? 'Meu perfil' : 'Ver perfil'}</button>${meu ? `<button type="button" class="btn" data-act="cvr-avatar">${ico('edit')} Mudar avatar</button>` : ''}${!meu && C.msg && C.uid() && c.handle ? `<button type="button" class="btn" data-act="cvr-msg" data-h="${esc(c.handle)}" data-cor="${esc((CASA[c.cat] || CASA.outros).a)}">${ico('send')} Mensagem</button>` : ''}</div>
      ${(meu || mansao || templo || luxo) && PV ? `<p class="fine">${luxo ? 'Beverly Hills em Londrina: o hall de mármore com a rosa dos ventos, o lustre de cristal e a escadaria de passadeira roxa e corrimão de ouro; o living com a lareira e o piano branco, a cozinha de chef com a ilha de mármore, a mesa de 12 lugares, a piscina coberta com o spa, o cinema de veludo roxo, a adega de vidro e a garagem dos esportivos. Em cima, a suíte master, o gabinete com todas as ferramentas e o closet-boutique.' : templo ? 'Egito e Rosacruz: o templo de 7 metros com o tablado de dentes de serra, a passadeira vermelha, a Shekinah e as três velas, o Oriente com a rosa-cruz e o sol alado, e o mural do Egito; a biblioteca hermética com o sarcófago, a sala do Umbral, o quarto do faraó, o estúdio, o closet e, no mezanino, o gabinete com todas as ferramentas.' : mansao ? 'Concreto aparente do chão ao teto: o salão de 7 metros com o mural de mosaico do cosmos, a lareira, o lustre Sputnik e o piano; a bânia, a biblioteca com a radiola e, no mezanino, o gabinete com todas as ferramentas e o telefone vermelho.' : loft ? 'Lá dentro: sala com pé-direito duplo, cozinha, estúdio, closet e o escritório no mezanino, com todas as tuas ferramentas.' : 'Por dentro, a casa é em 3D: o escritório tem as tuas ferramentas e a loja tem os móveis (de graça por enquanto).'}</p>` : ''}</div>`);
    if(PV && PV.previa){
      const cv = C.$('cvr-previa'), dono0 = meu ? C.st.me : { id: c.id, handle: c.handle };
      requestAnimationFrame(() => { if(cv && cv.isConnected) PV.previa(cv, dono0); });
      if(!meu && C.api && C.api.one) C.api.one('corre_perfis', { eq: { id: c.id } }).then(d => { if(d && d.casa && cv && cv.isConnected) PV.previa(cv, d); }).catch(() => {});
    }
  }
  function genteSheet(){
    const mostra = quemAparece(), lista = [...V.remotos.values()].filter(r => mostra.has(r.sid) && !r.npc).sort((a, b) => dist(V.eu, a) - dist(V.eu, b));
    const linha = r => { const p = V.peers.get(r.sid), b = bloqueado(r), d = Math.round(dist(V.eu, r) / 10);
      return `<li class="cvr-p${p && p.estado === 'aovivo' ? ' vivo' : ''}"><canvas class="cvr-mini" data-av="${esc(JSON.stringify(r.av))}" width="18" height="28" aria-hidden="true"></canvas>
        <div><b>${esc(r.handle ? '@' + r.handle : r.nome || 'visitante')}</b><small>${r.eu ? 'você, em outra aba ou aparelho' : b ? 'bloqueado' : p && p.estado === 'aovivo' ? 'conversando agora' : r.mic ? 'mic ligado' : 'mic desligado'} · ${d} m${r.bot ? ' · exemplo' : ''}${C.LIVE && !r.bot && !r.ok ? ' · sem confirmação' : ''}</small></div>
        <div class="cvr-p-a">${!b ? `<button type="button" class="btn sm" data-act="cvr-ir" data-sid="${esc(r.sid)}">Ir até</button>` : ''}${p && !b ? `<button type="button" class="btn sm" data-act="cvr-mudo" data-sid="${esc(r.sid)}" aria-pressed="${V.mudos.has(r.sid)}">${V.mudos.has(r.sid) ? 'Ouvir' : 'Silenciar'}</button>` : ''}${!r.eu && (r.uid !== (C.st.me && C.st.me.id) || r.bot) ? `<button type="button" class="btn sm ghost" data-act="cvr-bloq" data-sid="${esc(r.sid)}">${b ? 'Desbloquear' : 'Bloquear'}</button>` : ''}</div></li>`; };
    C.sheet(`<div class="form"><div class="sheet-head"><h2>Quem tá na cidade</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      ${lista.length ? `<ul class="cvr-gente">${lista.map(linha).join('')}</ul>` : '<p class="note">Só você por enquanto. Quem entrar aparece aqui.</p>'}
      <p class="fine">A voz abre sozinha quando os dois estão perto e de mic ligado, e fecha quando alguém se afasta ou desliga. Ela vai direto entre os dois aparelhos: o Corre não grava nada. Bloquear esconde a pessoa pra você e ela nunca mais conecta a voz contigo.</p></div>`);
    document.querySelectorAll('.cvr-mini').forEach(cv => { try{ miniAvatar(cv, avLimpo(JSON.parse(cv.dataset.av))); }catch(e){} });
  }
  /* ---------- v3.66 · o Ateliê: a loja de skins ----------
     As 18 skins da loja (SKINS_LOJA) se compram com correal e são da pessoa pra sempre. Quem diz o que ela tem e quanto
     custa é o banco (corre_skins_minhas e corre_skin_compra, delta-v366.sql); o banco também tira a skin paga de quem
     salvar o avatar sem ter comprado. Sem o delta, a loja mostra tudo e diz que abre em breve. v3.91: mais as 8 de
     Halloween (delta-v391.sql), que só se compram de 1º/10 até Finados. */
  const LJ = { uid: '', minhas: new Set(), precos: {}, ok: null, carregando: null };
  const precoSkin = k => { const v = Number(LJ.precos[k]); return v > 0 ? v : (LOJA[k] ? LOJA[k][2] : 0); };
  const tenhoSkin = k => !k || !LOJA[k] || LJ.minhas.has(k);
  /* v3.91: o banco respondeu e não tem o preço dela (a coleção nova chegou no site antes do delta do banco) */
  const semPreco = k => LJ.ok === true && !(Number(LJ.precos[k]) > 0);
  function carregaLoja(){
    const u = C.uid() || ''; if(LJ.uid !== u){ LJ.uid = u; LJ.minhas = new Set(); LJ.ok = null; }
    if(!u) return Promise.resolve(LJ);
    return LJ.carregando || (LJ.carregando = C.api.rpc('corre_skins_minhas', {}).then(r => {
      if(LJ.uid !== u) return LJ;
      LJ.minhas = new Set(Array.isArray(r && r.minhas) ? r.minhas.map(String) : []); LJ.precos = (r && r.precos && typeof r.precos === 'object') ? r.precos : {}; LJ.ok = true;
      if(r && r.saldo != null) C.correalSet(r.saldo);
      return LJ;
    }).catch(() => { LJ.ok = false; return LJ; }).finally(() => { LJ.carregando = null; }));
  }
  /* vestir (ou tirar, com k = ''): grava no perfil e troca o boneco na cidade e na casa. O personagem sai, senão a skin
     não aparece (o personagem ganha do uniforme) */
  async function vesteSkin(k){
    const me = C.st.me; if(!me || !tenhoSkin(k)) return false;
    const v = Object.assign({}, me.verso && typeof me.verso === 'object' ? me.verso : {}, { skin: k || '', personagem: '' });
    await C.saveMe({ verso: v });
    if(V.eu){ V.eu.av = avLimpo(C.st.me.verso, me.id); anunciar(); }
    const S3 = C.casa && C.casa.estado && C.casa.estado(); if(S3 && S3.eu && C.casa.aberta && C.casa.aberta()) S3.eu.av = avLimpo(C.st.me.verso, me.id);
    return true;
  }
  /* comprar: confere a carteira, pergunta sempre, e o banco desconta (ou não mexe em nada) */
  async function compraSkin(k){
    const x = LOJA[k]; if(!x) return false;
    await Promise.all([carregaLoja(), C.correalCarrega().catch(() => {})]);
    if(tenhoSkin(k)) return true;
    if(LJ.ok === false){ C.toast('O Ateliê ainda tá arrumando a vitrine. As skins chegam já, já.', 3800); return false; }
    /* v3.91: a de Halloween só na época; e a que o banco ainda não tem preço (o delta novo não rodou) espera */
    if(foraDeEpoca(k)){ C.toast(`${x[1]} é da coleção de Halloween: volta pra vitrine em outubro.`, 4200); return false; }
    if(semPreco(k)){ C.toast(`${x[1]} chega no Ateliê já, já.`, 3600); return false; }
    const preco = precoSkin(k), saldo = Number(C.correal.saldo) || 0;
    if(!C.correalCobre(saldo, preco)){ C.toast(`${x[1]} sai por ${C.correalTxt(preco)} e você tem ${C.correalFmt(saldo)}. Faz uns trampos no Correverso (até ${C.correalFmt(C.correal.teto)} por dia) e volta.`, 5200); return false; }
    const sim = await C.confirma({ ico: 'correal', titulo: 'Comprar ' + x[1], texto: `Sai por <b>${C.correalTxt(preco)}</b>. Você tem <b>${C.correalFmt(saldo)}</b>. Comprou, é tua pra sempre.`, sim: `Comprar por ${C.correalFmt(preco)}`, nao: 'Agora não' });
    if(!sim) return false;
    let r = null; try{ r = await C.api.rpc('corre_skin_compra', { p_skin: k }); }catch(e){ C.toast(C.errMsg(e, 'Não deu pra comprar agora.')); return false; }
    if(!r || !r.ok){ if(r && r.saldo != null) C.correalSet(r.saldo); C.toast(r && r.preco == null ? 'Essa skin não tá à venda.' : 'Não deu: o saldo não cobre.', 3600); return false; }
    LJ.minhas.add(k); C.correalSet(r.saldo); if(V.vivo) correalUI(true);
    if(C.versoSom) C.versoSom.moeda();
    return true;
  }
  /* o botão de cada skin na vitrine: comprar, vestir ou tirar */
  function acaoLoja(k){
    const av = C.st.me ? avLimpo(C.st.me.verso, C.st.me.id) : null, vestindo = !!av && !av.personagem && av.skin === k;
    if(LJ.ok === null) return '<span class="lj-msg">…</span>';
    if(LJ.ok === false && !tenhoSkin(k)) return `<span class="lj-preco">${ico('correal')} ${C.correalFmt(precoSkin(k))}</span><span class="lj-msg">em breve</span>`;
    if(!tenhoSkin(k) && foraDeEpoca(k)) return '<span class="lj-msg">volta em outubro</span>';
    if(!tenhoSkin(k) && semPreco(k)) return `<span class="lj-preco">${ico('correal')} ${C.correalFmt(precoSkin(k))}</span><span class="lj-msg">em breve</span>`;
    if(tenhoSkin(k)) return vestindo ? `<span class="lj-tua">${ico('check')} Vestindo</span><button type="button" class="btn sm" data-act="cvr-lj-tira">Tirar</button>`
      : `<span class="lj-tua">${ico('check')} É tua</span><button type="button" class="btn sm pri" data-act="cvr-lj-veste" data-k="${k}">Vestir</button>`;
    return `<button type="button" class="btn sm pri lj-compra" data-act="cvr-lj-compra" data-k="${k}" aria-label="Comprar ${esc(LOJA[k][1])} por ${C.correalTxt(precoSkin(k))}">${ico('correal')} ${C.correalFmt(precoSkin(k))}</button>`;
  }
  const pintaLoja = () => document.querySelectorAll('.lj-acao[data-k]').forEach(el => { el.innerHTML = acaoLoja(el.dataset.k); el.closest('.lj-card').classList.toggle('tua', tenhoSkin(el.dataset.k)); });
  function lojaSheet(){
    const me = C.st.me; if(!me){ C.toast('Entra no Corre pra abrir o Ateliê.'); return; }
    const tenhoLoja = k => LJ.minhas.has(k);
    const card = x => `<li class="lj-card lj-${x[3]}"><canvas class="lj-cv" width="32" height="34" data-k="${x[0]}" aria-hidden="true"></canvas><div class="lj-tx"><span class="lj-rar">${RARIDADE[x[3]]}</span><b>${esc(x[1])}</b><small>${esc(x[4])}</small></div><div class="lj-acao" data-k="${x[0]}"></div></li>`;
    const grupo = (r, t, so) => { const L = SKINS_LOJA.filter(x => x[3] === r && (!so || so(x[0]))); return L.length ? `<h3 class="lj-g lj-g-${r}">${t}</h3><ul class="lj-l">${L.map(card).join('')}</ul>` : ''; };
    /* v3.91: na época, a coleção de Halloween vem primeiro; fora dela, só aparecem as que a pessoa já tem */
    const hall = halloween() ? grupo('halloween', `${ico('star')} Halloween · só até Finados (2/11)`) : grupo('halloween', 'Halloween · da tua coleção', tenhoLoja);
    C.sheet(`<div class="form lj"><div class="sheet-head"><h2>${ico('star')} Ateliê do Corre</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p class="lj-topo">Skins pra vestir na cidade e dentro das casas, desenhadas aqui. Paga uma vez em correal e é tua pra sempre. Você tem <b class="num" data-correal-saldo>${C.correal.saldo == null ? '…' : C.correalFmt(C.correal.saldo)}</b> <span data-correal-unid>${C.correalUnid(C.correal.saldo || 0)}</span>.</p>
      ${halloween() ? hall : ''}${grupo('lendaria', 'Lendárias · com brilho')}${grupo('rara', 'Raras')}${grupo('estilo', 'Estilo')}${halloween() ? '' : hall}
      <p class="fine">Correal não é dinheiro: se ganha fazendo trampo no Correverso (até ${C.correalFmt(C.correal.teto)} por dia). O Ateliê sempre pergunta antes de descontar. Os 14 uniformes de antes seguem de graça, no teu avatar.</p></div>`, 'wide lj-sheet');
    pintaLoja();
    carregaLoja().then(pintaLoja); C.correalCarrega().catch(() => {});
    /* o provador: cada skin no teu boneco, girando devagar */
    const cvs = [...document.querySelectorAll('.lj-cv')], base = avLimpo(me.verso, me.id), dirs = ['baixo', 'dir', 'cima', 'esq'];
    let ult = 0, f = 0;
    const roda = ts => {
      if(!cvs.length || !cvs[0].isConnected) return;
      if(ts - ult > 120){
        ult = ts; f++;
        cvs.forEach((cv, i) => { const av = Object.assign({}, base, { personagem: '', skin: cv.dataset.k }); miniAvatar(cv, av, dirs[(Math.floor(f / 12) + i) % 4], f * .8); });
      }
      requestAnimationFrame(roda);
    };
    requestAnimationFrame(roda);
  }
  /* v3.81: "armario" é o guarda-roupa da casa: o mesmo avatar, com outro nome (é ali que se troca a skin) */
  function avatarSheet(primeira, deOnde){
    const me = C.st.me; let av = avLimpo(me.verso, me.id); const armario = deOnde === 'armario';
    const sw = (k, L) => `<div class="cvr-sw" role="radiogroup">${L.map((c, i) => `<button type="button" role="radio" data-k="${k}" data-v="${i}" aria-checked="${av[k] === i}" style="--c:${c}" aria-label="${k} ${i + 1}"></button>`).join('')}</div>`;
    const ch = (k, L) => `<div class="cvr-ch" role="radiogroup">${L.map(([v, n]) => `<button type="button" role="radio" data-k="${k}" data-s="${v}" aria-checked="${av[k] === v}">${n}</button>`).join('')}</div>`;
    /* v3.66: as skins do Ateliê, com o cadeado e o preço de quem ainda não tem */
    const chLoja = () => `<div class="cvr-ch cvr-ch-loja" role="radiogroup">${SKINS_LOJA.filter(x => !foraDeEpoca(x[0]) || LJ.minhas.has(x[0]) || av.skin === x[0]).map(x => `<button type="button" role="radio" data-k="skin" data-s="${x[0]}" data-loja="${x[0]}" aria-checked="${av.skin === x[0]}">${tenhoSkin(x[0]) ? '' : ico('lock')}${esc(x[1])}${tenhoSkin(x[0]) ? '' : `<i>${C.correalFmt(precoSkin(x[0]))}</i>`}</button>`).join('')}</div>`;
    C.sheet(`<div class="form cvr-av"><div class="sheet-head"><h2>${primeira ? 'Monta teu avatar' : armario ? 'O armário' : 'Teu avatar'}</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <div class="cvr-av-cols"><div class="cvr-av-prev"><canvas id="cvr-prev" width="32" height="34" aria-label="Prévia do avatar"></canvas><div class="acts"><button type="button" class="btn sm" id="cvr-gira">Girar</button><button type="button" class="btn sm" id="cvr-sorte">Sortear</button></div></div>
      <div class="cvr-av-f">
        <div class="fld"><span class="lbl-s">Personagem</span>${ch('personagem', PERSONAGENS)}<small class="fine">Escolhe um e anda pela cidade como ele. "Você mesmo" usa o boneco montado aqui embaixo.</small></div>
        <div class="fld"><span class="lbl-s">Uniforme</span>${ch('skin', SKINS)}<small class="fine">Vai por cima do teu boneco (pele, cabelo e barba ficam). Na cidade e dentro das casas.</small></div>
        <div class="fld cvr-av-loja"><span class="lbl-s">${ico('star')} Do Ateliê</span>${chLoja()}<small class="fine">Toca pra provar. A que tem cadeado se compra com correal na hora de salvar. <button type="button" class="lnk" data-act="cvr-loja">Abrir o Ateliê</button></small></div>
        <div class="fld"><span class="lbl-s">Pele</span>${sw('pele', PELES)}</div>
        <div class="fld"><span class="lbl-s">Cabelo</span>${ch('cabelo', CABELOS)}${sw('corCabelo', CAB_CORES)}</div>
        <div class="fld"><span class="lbl-s">Barba</span>${ch('barba', BARBAS)}</div>
        <div class="fld"><span class="lbl-s">Na cabeça</span>${ch('topo', TOPOS)}</div>
        <div class="fld"><span class="lbl-s">Óculos</span>${ch('oculos', OCULOS)}</div>
        <div class="fld"><span class="lbl-s">Roupa</span>${ch('roupa', ROUPAS)}${sw('corRoupa', ROUPA_CORES)}</div>
        <div class="fld"><span class="lbl-s">Estampa</span>${ch('estampa', ESTAMPAS)}${ch('corrente', CORRENTES)}</div>
        <div class="fld"><span class="lbl-s">Calça ou bermuda</span>${ch('perna', PERNAS)}${sw('corCalca', CALCA_CORES)}</div>
        <div class="fld"><span class="lbl-s">Tênis</span>${sw('tenis', TENIS_CORES)}</div>
      </div></div>
      <div class="acts sticky"><button type="button" class="btn pri" id="cvr-av-ok">${primeira ? 'Salvar e entrar na cidade' : 'Salvar avatar'}</button></div></div>`, 'wide');
    const cv = C.$('cvr-prev'), dirs = ['baixo', 'dir', 'cima', 'esq']; let di = 0, fase = 0, raf = 0, ult = 0;
    const pinta = ts => { if(!cv.isConnected){ cancelAnimationFrame(raf); return; } if(!ult || ts - ult > 110){ ult = ts; fase += .8; miniAvatar(cv, av, dirs[di], fase); } raf = requestAnimationFrame(pinta); };
    raf = requestAnimationFrame(pinta);
    const marca = () => document.querySelectorAll('.cvr-av [data-k]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.s != null ? av[b.dataset.k] === b.dataset.s : av[b.dataset.k] === Number(b.dataset.v))));
    document.querySelector('.cvr-av').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if(!b) return; av[b.dataset.k] = b.dataset.s != null ? b.dataset.s : Number(b.dataset.v); marca(); });
    C.$('cvr-gira').addEventListener('click', () => { di = (di + 1) % 4; });
    C.$('cvr-sorte').addEventListener('click', () => { av = avPadrao(Math.random()); marca(); });
    /* a fileira do Ateliê pinta o cadeado de novo quando o banco responde o que a pessoa tem */
    carregaLoja().then(() => document.querySelectorAll('.cvr-av [data-loja]').forEach(b => { const k = b.dataset.loja, x = LOJA[k]; b.innerHTML = `${tenhoSkin(k) ? '' : ico('lock')}${esc(x[1])}${tenhoSkin(k) ? '' : `<i>${C.correalFmt(precoSkin(k))}</i>`}`; }));
    C.$('cvr-av-ok').addEventListener('click', async ev => {
      const bt = ev.currentTarget; if(bt.disabled) return; bt.disabled = true;
      /* v3.66: provou uma skin do Ateliê que não é tua: compra antes (o banco tiraria ela do avatar) */
      if(av.skin && LOJA[av.skin] && !tenhoSkin(av.skin)){ const ok = await compraSkin(av.skin).catch(() => false); if(!ok){ bt.disabled = false; return; } av.personagem = ''; }
      try{ await C.saveMe({ verso: Object.assign({}, me.verso && typeof me.verso === 'object' ? me.verso : {}, av) }); if(V.eu) V.eu.av = avLimpo(C.st.me.verso, me.id);
        /* v3.81: salvou dentro de casa (o armário): o boneco da casa troca na hora */
        const S3 = C.casa && C.casa.estado && C.casa.aberta && C.casa.aberta() ? C.casa.estado() : null; if(S3 && S3.eu) S3.eu.av = avLimpo(C.st.me.verso, me.id);
        anunciar(); C.closeSheet(); C.toast(armario ? 'Trocou de roupa.' : 'Avatar salvo.'); }
      catch(e){ bt.disabled = false; C.toast(C.errMsg(e, 'Não deu pra salvar o avatar.')); }
    });
  }

  Object.assign(C.acts, {
    /* saiu da cidade por um link de dentro dela (casa → perfil): marca pra mostrar o "Voltar pro Correverso" */
    'cvr-sai': () => { V.saiPor = 'perfil'; },
    /* a casa de alguém: o perfil abre no balcão, você continua na porta */
    'cvr-voar': el => voar(Number(el.dataset.i)),
    'cvr-casa-entrar': el => { C.closeSheet(); if(C.versoSom) C.versoSom.porta(); if(!C.casa){ C.toast('A casa não carregou neste aparelho. Recarrega a página.', 4000); return; } C.toast('Abrindo a casa…', 1200); const p = C.casa.abrir({ id: el.dataset.id }); if(p && p.catch) p.catch(e => C.toast('Não deu pra abrir a casa: ' + String((e && e.message) || e).slice(0, 120), 6000)); },
    'cvr-perfil': el => { const h = el.dataset.h; if(!h) return; C.closeSheet(); abreBalcao({ id: 'perfil', titulo: el.dataset.meu ? 'Tua casa' : 'Casa de @' + h, rota: '#/@' + h, cor: el.dataset.cor || ROSA }); },
    /* mensagem pra dona da casa sem sair da cidade: a conversa abre no balcão */
    'cvr-msg': el => { const h = el.dataset.h === 'corre' ? 'consanans' : el.dataset.h; if(!h) return; C.closeSheet(); abreBalcao({ id: 'msg', titulo: 'Mensagem pra @' + h, rota: '#/msg/@' + h, cor: el.dataset.cor || ROSA }); },
    'cvr-bc-fecha': () => fechaBalcao(),
    'cvr-bc-pagina': () => paginaBalcao(),
    'cvr-ir-barraca': el => { const b = V.cid && V.cid.feira && V.cid.feira.barracas.find(x => x.id === el.dataset.id); if(!b || !paraMim(b)) return; const p = pertoLivre(b.x, b.base + 16); if(p){ teleporta(p.x, p.y); if(V.eu) V.eu.dir = 'cima'; } },
    'cvr-volta-x': () => { voltaGrava(null); chipVolta(); },
    'cvr-de-novo': () => C.refresh(),
    'cvr-mic': () => { if(V.mic) desligarMic(); else ligarMic(); },
    'cvr-jogo-sair': () => fechaJogo(),
    'cvr-jogo-tela': () => { if(C.tela) C.tela.alterna('jogo'); },
    /* v3.89: a tela cheia da cidade (o jogo todo) */
    'cvr-tela': () => cidadeCheia(!document.body.classList.contains('cvr-cheia')),
    'cvr-sai-cidade': () => { location.hash = V.de || '#/'; },
    'cvr-trampo': () => { if(V.vivo) trampoSheet(null); },
    'cvr-pega-tarefa': el => pegaTarefa(el.dataset.u, el.dataset.k),
    'cvr-larga-tarefa': () => { largaTarefa(false); C.closeSheet(); },
    'cvr-veste': el => vesteUniforme(el.dataset.u),
    'cvr-uni': el => vesteUniforme(el.dataset.u || ''),
    'cvr-avatar': () => avatarSheet(false),
    /* v3.66: o Ateliê (a loja de skins) */
    'cvr-loja': () => lojaSheet(),
    /* v4.0 · a faixa do evento (ao vivo, leva até lá; antes, abre a agenda) e a agenda */
    'cvr-evento': el => { const ag = eventoAgora(); if(ag) vaiEvento(ag.e.k); else agendaSheet(); },
    'cvr-agenda': () => agendaSheet(),
    'cvr-ev-ir': el => vaiEvento(el.dataset.k),
    'cvr-lj-compra': async el => { const k = el.dataset.k; el.disabled = true; try{ if(await compraSkin(k)){ await vesteSkin(k); C.toast(`${LOJA[k][1]} é tua e já tá vestindo.`, 3600); } }catch(e){ C.toast(C.errMsg(e, 'Não deu pra vestir agora.')); }finally{ pintaLoja(); } },
    'cvr-lj-veste': async el => { el.disabled = true; try{ await vesteSkin(el.dataset.k); }catch(e){ C.toast(C.errMsg(e, 'Não deu pra vestir agora.')); } pintaLoja(); },
    'cvr-lj-tira': async el => { el.disabled = true; try{ await vesteSkin(''); }catch(e){ C.toast(C.errMsg(e, 'Não deu agora.')); } pintaLoja(); },
    /* v3.55: "Pra casa" levanta do banco e larga a vara (antes chegava sentado, pescando na porta) */
    'cvr-casa': () => { if(!V.eu || !V.casa) return; saiDoBarco(); V.alvo = null; V.eu.sit = false; V.eu.pesca = null; V.eu.x = V.casa.x; V.eu.y = V.casa.y; V.entrando = .55; anunciar(); portaUI(); },
    'cvr-gente': () => genteSheet(),
    'cvr-mapa': () => { if(V.cid) mapaSheet(); },
    'cvr-ir-lugar': el => { const l = lugares()[Number(el.dataset.i)]; if(!l) return; const p = pertoLivre(l.x, l.y); if(p){ teleporta(p.x, p.y); if(l.nome === 'Papai Noel do Igapó') olhaNoel(7000); } },
    'cvr-porta': () => abrePorta(),
    'cvr-mj-seta': el => mjSeta(el.dataset.d),
    'cvr-mj-larga': () => mjLarga(),
    'cvr-falar': el => { const m = C.$('cvr-falas'); if(!m) return; m.hidden = !m.hidden; el.setAttribute('aria-expanded', String(!m.hidden)); },
    'cvr-fala': el => { const i = Number(el.dataset.i); if(!FALAS[i] || !V.eu) return; V.eu.fala = { t: FALAS[i], ate: Date.now() + 4500 }; if(V.rede && V.rede.emo) V.rede.emo(i); const m = C.$('cvr-falas'); if(m) m.hidden = true; const b = document.querySelector('[data-act="cvr-falar"]'); if(b) b.setAttribute('aria-expanded', 'false'); },
    'cvr-convite': () => C.copy(`Bora pro Corre: ${location.origin}${location.pathname}`, 'Convite copiado.'),
    'cvr-ir': el => { const r = V.remotos.get(el.dataset.sid); if(r){ V.alvo = { x: r.x, y: r.y + 24 }; C.closeSheet(); } },
    'cvr-mudo': el => { const s = el.dataset.sid; if(V.mudos.has(s)) V.mudos.delete(s); else V.mudos.add(s); proximidade(); ui(); genteSheet(); },
    'cvr-bloq': async el => {
      const r = V.remotos.get(el.dataset.sid); if(!r) return;
      const chave = r.uid && r.uid !== (C.st.me && C.st.me.id) ? r.uid : 's:' + r.sid, ja = bloqueado(r);
      if(!ja && el.dataset.armed !== '1'){ el.dataset.armed = '1'; el.classList.add('armed'); el.textContent = 'Bloquear mesmo?'; return; }
      if(ja){ V.bloq.delete(chave); V.bloq.delete('s:' + r.sid); if(r.uid) V.bloq.delete(r.uid); r.bloqS = false; const q = QUEM.get(r.sid); if(q) q.bloq = false; }
      else { V.bloq.add(chave); fechar(r.sid, true); }
      if(!r.bot){
        try{
          if(C.LIVE) await C.api.rpc('corre_verso_bloquear', { p_sid: r.sid, p_bloq: !ja });
          else if(!chave.startsWith('s:')){ if(ja) await C.api.del('corre_verso_bloq', { dono: C.uid(), quem: chave }); else await C.api.ins('corre_verso_bloq', { quem: chave }); }
        }catch(e){}
      }
      ui(); genteSheet(); C.toast(ja ? 'Desbloqueado.' : 'Bloqueado. Essa pessoa some da tua cidade e não conecta mais a voz contigo.', 3800);
    }
  });

  C.verso = { miniVeiculo, trocaVeiculo, veiculoDe, alturaPulo, PULO_MS, SKINS_LOJA,
    /* v4.03 · o Lambe-Lambe do Noel (pros testes) */
    fotoNoel, tiraPola, fechaPola, retratoNoel, pola: () => ({ on: PO.on, aces: PO.aces, leg: PO.leg, gente: PO.gente.map(p => p.h), foto: !!PO.foto, card: PO.card ? [PO.card.width, PO.card.height] : null }), noelFoto: () => (V.cid && V.cid.lago && V.cid.lago.noel && V.cid.lago.noel.foto) || null,
    /* v4.0 · o céu e os eventos (pros testes: hora(21.5), clima('chuva'), null volta pro relógio e pro sorteio) */
    hora: v => { if(v !== undefined){ horaForca = v; V.ceu = null; } return horaBR(); }, clima: v => { if(v !== undefined){ climaForca = v; V.ceu = null; } return climaDe(); },
    ceu: () => ceuAgora(), evento: () => { const a = eventoAgora(); return a ? { k: a.e.k, nome: a.e.nome, seg: a.seg } : null; }, luzes: () => (V.luz || []).length / 4, palco: () => V.palco, agenda: agendaSheet, EVENTOS, halloween: v => { if(v !== undefined){ hallForca = v; hallVisto.t = 0; } return halloween(); }, halloweenDe, loja: lojaSheet, compraSkin, vesteSkin, carregaLoja, skinsMinhas: () => [...LJ.minhas],
    /* v3.65 · a busca do Corre leva direto pra um lugar da cidade (o mesmo "ir pra lá" do Mapa, de graça). false = a cidade
       ainda não tá pronta (ou você tá dentro de um lugar 3D); null = esse lugar não existe aqui (ex.: sem casa ainda) */
    irPara: nome => {
      if(!V.vivo || !V.cid || !V.eu || (C.casa && C.casa.aberta && C.casa.aberta())) return false;
      const l = lugares().find(x => x.nome === nome), p = l && pertoLivre(l.x, l.y); if(!p) return null;
      teleporta(p.x, p.y); if(nome === 'Papai Noel do Igapó') olhaNoel(7000); return true;
    },
    /* a casa avisa que você pulou lá dentro (quem tá na casa vê) */
    marcaPulo: () => { if(!V.eu) return; V.eu.puN = ((V.eu.puN || 0) % 999) + 1; enviaPos(true); },
    publiImg, publiLogo, publiSheet, PUBLI, logoSharks, meuSid: () => sid, kartManda: d => { if(V.rede && V.rede.kart && C.casa && C.casa.aberta()) V.rede.kart(Object.assign({ sid }, d)); },
    skin, avLimpo, nivel, cores: { PELES, CAB_CORES, ROUPA_CORES, CALCA_CORES, TENIS_CORES }, anunciar, enviaPos, retoma: () => { V.tAnt = 0; V.teclas.clear(); portaUI(); }, mic: () => V.mic, peers: () => V.peers, remotos: () => V.remotos, montaCidade, desenhaCasa: (c, k) => (ESTILO_SPRITE()[c.estilo] || spriteCasa)(c, k).cv, estado: () => V, vivo: () => !!V.vivo, chip: chipVolta, balcao: () => BC, abreBalcao, fechaBalcao, gente: () => contaGente(), aparece: () => [...quemAparece()], PERSONAGENS,
    atualizaAv: () => { if(V.eu && C.st.me){ V.eu.av = avLimpo(C.st.me.verso, C.st.me.id); anunciar(); } }, avatar: deOnde => avatarSheet(false, deOnde), come, falaAuto, bolas: () => V.bolas || [], COMIDAS, JOGOS, abreJogo, fechaJogo, jogo: () => V.jogo, zoom: poeZoom, zoomFator, SKINS, SKIN, TAREFAS, CIVICOS, PATENTES, patenteDe, pegaTarefa, largaTarefa, agirTarefa, tarefa: () => V.tarefa, trampoSheet,
    /* v3.85: o sorteio do rio e a balança (pros testes) */
    sorteiaPeixe, balanca,
    /* v3.87: é Natal na cidade? natal(true/false) força (pros testes), natal(null) volta pro calendário */
    natal: v => { if(v !== undefined){ natalForca = v; if(V.cid) V.portas = portas(); } return natal(); }, olhaNoel: ms => olhaNoel(ms || 9000) };
})();
