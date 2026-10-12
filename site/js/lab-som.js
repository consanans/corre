/* CORRE · STUDIO HOUZI · A ASSINATURA SONORA (v3.39).
   Cada marca ganha um som de uns 3 segundos, tirado dela mesma e explicado no brandbook:
   · o território escolhe o gênero (Rua = boom bap, Arcade = chiptune, Noir = jazz de clube…), a escala e o timbre;
   · o nome escolhe as notas: uma por sílaba; a vogal escolhe a nota e a consoante, o tempo;
   · a cor mais viva da paleta escolhe o tom (como no teclado de luz de Scriabin, uma cor pra cada tom);
   · o jeito da marca (energia, diversão) mexe no andamento, na oitava e na bateria.
   Tudo sintetizado aqui, amostra por amostra (nada é gravação de ninguém). O mesmo som toca no brandbook, vai em WAV
   no kit e entra no vídeo do logo animado. */
(function(){
  'use strict';
  const C = window.Corre, M = C.labMotor;
  if(!M) return;
  const S = C.houziSom = {};
  const SR = 44100, TAU = Math.PI * 2;
  const NOTAS = ['Dó', 'Dó♯', 'Ré', 'Mi♭', 'Mi', 'Fá', 'Fá♯', 'Sol', 'Lá♭', 'Lá', 'Si♭', 'Si'];
  S.NOTAS = NOTAS;
  /* cada escala e os degraus do acorde final (tônica, terça e quinta) */
  const ESCALAS = {
    maior: { n: 'maior', g: [0, 2, 4, 5, 7, 9, 11], ac: [0, 2, 4], d: 'aberta e solar' },
    menor: { n: 'menor', g: [0, 2, 3, 5, 7, 8, 10], ac: [0, 2, 4], d: 'séria, com peso' },
    dorico: { n: 'dórica', g: [0, 2, 3, 5, 7, 9, 10], ac: [0, 2, 4], d: 'menor com uma luz acesa, a cor do soul e do jazz' },
    mixo: { n: 'mixolídia', g: [0, 2, 4, 5, 7, 9, 10], ac: [0, 2, 4], d: 'maior com sotaque, a do baião e do rock' },
    lidio: { n: 'lídia', g: [0, 2, 4, 6, 7, 9, 11], ac: [0, 2, 4], d: 'maior suspensa, de abertura de filme' },
    penta: { n: 'pentatônica maior', g: [0, 2, 4, 7, 9], ac: [0, 2, 3], d: 'cinco notas que qualquer um assobia' },
    pentam: { n: 'pentatônica menor', g: [0, 3, 5, 7, 10], ac: [0, 1, 3], d: 'a escala do blues, do soul e do rap' }
  };
  /* o som de cada território: gênero, escala, timbre, andamento, bateria e quanto de sala (reverb) */
  const GENERO = {
    rua: { g: 'boom bap', e: 'pentam', t: 'piano', bpm: 88, bat: 'boombap', sala: 0.14, lofi: true, baixo: true, d: 'piano de sample, bumbo e caixa: o boom bap que nasceu no muro e no vinil (com o chiado e tudo)' },
    zine: { g: 'punk de garagem', e: 'mixo', t: 'guitarra', bpm: 158, bat: 'punk', sala: 0.1, d: 'guitarra suja e caixa reta: três acordes e uma ideia, do jeito que o fanzine pede' },
    arcade: { g: 'chiptune', e: 'penta', t: 'chip', bpm: 150, bat: 'chip', sala: 0.04, d: 'onda quadrada de fliperama: o som de quando a ficha cai' },
    gp: { g: 'eletrônico de largada', e: 'lidio', t: 'serra', bpm: 140, bat: 'largada', sala: 0.12, baixo: true, d: 'sintetizador que acelera antes do acorde: o ronco da largada' },
    editorial: { g: 'piano de câmara', e: 'maior', t: 'piano', bpm: 74, bat: '', sala: 0.3, d: 'piano com espaço em volta: lido devagar, como a marca' },
    noir: { g: 'jazz de clube', e: 'dorico', t: 'vibrafone', bpm: 84, bat: 'vassoura', sala: 0.26, baixo: 'acustico', setima: true, d: 'vibrafone, contrabaixo e vassourinha: fumaça de clube, luz baixa' },
    selo: { g: 'roda de violão', e: 'mixo', t: 'violao', bpm: 100, bat: 'ganza', sala: 0.18, d: 'violão de nylon e ganzá: feito à mão, de perto' },
    manuscrito: { g: 'caixinha de música', e: 'lidio', t: 'sino', bpm: 72, bat: '', sala: 0.32, pad: true, nona: true, d: 'celesta e um véu de cordas: delicado como letra escrita à mão' },
    bauhaus: { g: 'minimal de madeira', e: 'maior', t: 'marimba', bpm: 112, bat: 'bloco', sala: 0.08, d: 'marimba seca e precisa: forma, função e nenhum enfeite' },
    sinal: { g: 'tom puro', e: 'lidio', t: 'seno', bpm: 96, bat: '', sala: 0.2, d: 'senoides limpas, como um sinal de verdade: menos ruído, mais sinal' },
    classico: { g: 'fanfarra de bairro', e: 'maior', t: 'metais', bpm: 120, bat: 'fanfarra', sala: 0.2, baixo: true, d: 'metais e caixa de banda: a festa do bairro inteiro' },
    chiclete: { g: 'pop chiclete', e: 'penta', t: 'pluck', bpm: 124, bat: 'palma', sala: 0.14, baixo: true, d: 'sintetizador estalado, palma e grave: gruda na cabeça' }
  };
  S.GENERO = GENERO;
  const NOME_TIMBRE = { piano: 'piano', guitarra: 'guitarra', chip: 'onda quadrada', serra: 'sintetizador', vibrafone: 'vibrafone', violao: 'violão', sino: 'celesta', marimba: 'marimba', seno: 'senoide', metais: 'metais', pluck: 'sintetizador' };

  /* ---------- a cor vira o tom (círculo das cores ≈ círculo das quintas, como no teclado de luz de Scriabin) ---------- */
  /* faixas de matiz (OKLCH) e o tom de cada uma: vermelho Dó, laranja Sol, amarelo Ré, verde Lá, céu Mi, azul Si, anil Fá♯, violeta Ré♭, roxo Lá♭, rosa Mi♭, carmim Si♭ e Fá */
  const TONS_COR = [[10, 5], [40, 0], [75, 7], [120, 2], [175, 9], [235, 4], [275, 11], [295, 6], [315, 1], [335, 8], [350, 3], [361, 10]];
  const tomDaCor = h => { h = ((h % 360) + 360) % 360; for(const [lim, pc] of TONS_COR) if(h < lim) return pc; return 0; };
  /* a cor mais viva da paleta (a marca, o acento ou o apoio) */
  const corViva = sp => { const c = sp.cores || {}; let best = null; [['p', 1.15], ['a', 1], ['s', 0.9]].forEach(([k, peso]) => { if(!c[k]) return; const l = M.lch(c[k]), v = l.c * peso; if(!best || v > best.v) best = { k, hex: c[k], h: l.h, c: l.c, v }; }); return best; };

  /* ---------- as sílabas, as vogais e as consoantes ---------- */
  const VOG = 'aeiouyáéíóúâêôãõàü';
  const silabas = s => String(s || '').split(/\s+/).filter(Boolean).flatMap(w => { const ps = w.match(/[^aeiouáéíóúâêôãõàAEIOUÁÉÍÓÚÂÊÔÃÕÀ]*[aeiouáéíóúâêôãõàAEIOUÁÉÍÓÚÂÊÔÃÕÀ]+(?:[^aeiouáéíóúâêôãõàAEIOUÁÉÍÓÚÂÊÔÃÕÀ\s](?=[^aeiouáéíóúâêôãõàAEIOUÁÉÍÓÚÂÊÔÃÕÀ\s]))?|[^aeiouáéíóúâêôãõàAEIOUÁÉÍÓÚÂÊÔÃÕÀ\s]+$/g) || [w], out = [];
    ps.forEach(p => { if(out.length && !new RegExp('[' + VOG + ']', 'i').test(p)) out[out.length - 1] += p; else out.push(p); }); return out; });
  const semAcento = ch => ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const vogalDe = s => { const v = [...s].find(ch => VOG.includes(ch.toLowerCase())); return v ? semAcento(v) : 'a'; };
  const tipoConsoante = s => { const m = s.toLowerCase().match(/^[^aeiouyáéíóúâêôãõàü]+/); const c = m ? m[0] : ''; if(!c) return 'vogal'; if(/^(ch|lh|nh)/.test(c)) return c[0] === 'n' ? 'nasal' : 'arrasta'; if(/^[ptkbdgcq]/.test(c)) return 'bate'; if(/^[fvszxjç]/.test(c)) return 'arrasta'; if(/^[mn]/.test(c)) return 'nasal'; if(/^[lr]/.test(c)) return 'liquida'; return 'bate'; };
  const DUR_CONS = { bate: 0.5, arrasta: 0.75, nasal: 1, liquida: 0.5, vogal: 0.5 };
  /* sílaba forte: acento gráfico; sem acento, a regra do português (paroxítona, a não ser que termine em r, l, z, x, i, u, im, um, ão) */
  const forte = ss => { const i = ss.findIndex(s => /[áéíóúâêô]/i.test(s)); if(i >= 0) return i; const ult = ss[ss.length - 1].toLowerCase(); return ss.length > 1 && !/(r|l|z|x|i|u|im|um|ão|ãos|is|us)$/.test(ult) ? ss.length - 2 : ss.length - 1; };
  /* a vogal escolhe a altura, como a boca faz quando fala: o u e o o puxam pra baixo, o a é a nota da casa (a tônica),
     o e e o i sobem (degraus da escala, a partir da tônica) */
  const PASSO = { u: -2, o: -1, a: 0, e: 2, i: 4, y: 4 };
  const grauMidi = (g, k) => { const n = g.length, q = Math.floor(k / n); return g[((k % n) + n) % n] + 12 * q; };

  /* ---------- a composição (a partitura) ---------- */
  S.compoe = sp => {
    const gen = GENERO[sp.territorio] || GENERO.editorial, esc = ESCALAS[gen.e], g = esc.g;
    const pers = sp.pers || [0.5, 0.5, 0.5, 0.5, 0.5], energia = pers[3], diverte = pers[1];
    const cor = corViva(sp), viva = !!cor && cor.c >= 0.035;
    const tom = viva ? tomDaCor(cor.h) : M.hash(sp.nome || 'marca') % 12;
    let ss = silabas(sp.nome).slice(0, 7);
    if(!ss.length) ss = ['mar', 'ca'];
    if(ss.length > 6) ss = ss.slice(0, 5).concat(ss.slice(-1));
    if(ss.length === 1) ss = [ss[0], ss[0]];
    const iForte = forte(ss);
    let bpm = gen.bpm * (0.86 + 0.28 * energia);
    const brilho = ['chip', 'sino', 'pluck', 'marimba'].includes(gen.t);
    /* a tônica fica perto do Dó central (ou uma oitava acima, nos timbres que brilham) */
    let base = (brilho ? 72 : 60) + tom + (diverte > 0.72 ? 12 : 0); if(tom > 5) base -= 12;
    const batida = () => 60 / bpm;
    /* as notas, uma por sílaba; cada uma na oitava mais perto da anterior (a melodia anda, não pula) */
    const notas = []; let ant = null, t = 0.04;
    ss.forEach((s, i) => {
      const v = vogalDe(s), passo = PASSO[v] == null ? 0 : PASSO[v];
      let midi = base + grauMidi(g, passo);
      if(ant != null){ while(midi - ant > 7) midi -= 12; while(ant - midi > 7) midi += 12; }
      const cons = tipoConsoante(s), ultima = i === ss.length - 1, dur = DUR_CONS[cons] * (i === iForte ? 1.25 : 1);
      notas.push({ s, v, cons, passo, midi, t, dur: dur * batida(), vel: i === iForte ? 1 : 0.8, forte: i === iForte, ultima });
      ant = midi; if(!ultima) t += dur * batida();
    });
    /* o motivo não passa de 1,8 s: acelera se precisar */
    const ultT = notas[notas.length - 1].t;
    if(ultT > 1.8){ const k = 1.8 / ultT; notas.forEach(n => { n.t *= k; n.dur *= k; }); bpm /= k; }
    /* o acorde final (tônica, terça e quinta; sétima no jazz, nona na caixinha de música), com a última nota em cima.
       Se a última sílaba não cair numa nota do acorde, ela escorrega pra mais perto que cair. */
    const ult = notas[notas.length - 1], tA = ult.t;
    const notasAc = esc.ac.map(k => g[k]).concat(gen.setima && g.length === 7 ? [g[6]] : []).concat(gen.nona && g.length === 7 ? [g[1] + 12] : []);
    const pcUlt = ((ult.midi - tom) % 12 + 12) % 12;
    if(!notasAc.some(x => x % 12 === pcUlt)){
      const alvo = notasAc.map(x => x % 12).sort((a, b) => Math.min(Math.abs(a - pcUlt), 12 - Math.abs(a - pcUlt)) - Math.min(Math.abs(b - pcUlt), 12 - Math.abs(b - pcUlt)))[0];
      let d = alvo - pcUlt; if(d > 6) d -= 12; if(d < -6) d += 12; ult.midi += d; ult.resolve = true;
    }
    let raiz = ult.midi - (((ult.midi - tom) % 12 + 12) % 12); while(raiz > ult.midi - 5) raiz -= 12;
    const acorde = notasAc.map(x => raiz + x).filter(m => m < ult.midi && m > raiz - 1);
    const durAcorde = Math.max(1.1, Math.min(1.7, 2.6 * 60 / bpm));
    ult.dur = durAcorde;
    const menor = (g[esc.ac[1]] - g[esc.ac[0]]) === 3;
    const nomeAcorde = `${NOTAS[tom]} ${menor ? 'menor' : 'maior'}${gen.setima && g.length === 7 ? ' com sétima' : ''}${gen.nona && g.length === 7 ? ' com nona' : ''}`;
    const dur = Math.min(4.2, tA + durAcorde + 0.9);
    return { tom, nomeTom: NOTAS[tom], cor, viva, escala: esc, genero: gen, terr: sp.territorio, timbre: gen.t, bpm: Math.round(bpm), notas, acorde: { t: tA, midis: acorde, raiz, nome: nomeAcorde, dur: durAcorde },
      bateria: !!gen.bat && (energia >= 0.32 || gen.bat === 'boombap' || gen.bat === 'vassoura'), dur, energia, silabas: ss, iForte };
  };

  /* ---------- os instrumentos (cada um soma no buffer estéreo) ----------
     Rápido de propósito: cada parcial é um oscilador por rotação (sem seno por amostra) e cada envelope, uma conta de
     multiplicar. Uma marca inteira sai em alguns milissegundos. */
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  const ruido = seed => { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) / 4294967296) * 2 - 1; }; };
  const soma = (B, i0, arr, vel, pan) => { const gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4); for(let i = 0; i < arr.length; i++){ const k = i0 + i; if(k >= B.L.length) break; B.L[k] += arr[i] * vel * gl; B.R[k] += arr[i] * vel * gr; } };
  const SOLTA = 0.12;
  /* uma parcial: senoide com ataque linear, queda exponencial e, passado "dur", a soltura */
  const parcial = (o, f, a, ataque, queda, dur, solta) => {
    if(f <= 0 || f >= SR * 0.45) return;
    const w = TAU * f / SR, c = Math.cos(w), sn = Math.sin(w), kq = Math.exp(-queda / SR), ks = Math.exp(-(queda + solta) / SR), na = Math.max(1, Math.round(ataque * SR)), nd = Math.round(dur * SR);
    let x = 1, y = 0, e = 0;
    for(let i = 0; i < o.length; i++){ if(i < na) e = i / na; else e *= i < nd ? kq : ks; o[i] += a * e * y; const nx = x * c - y * sn; y = x * sn + y * c; x = nx; }
  };
  /* uma parcial com o envelope pronto (array) */
  const parcialEnv = (o, f, a, env, fase) => {
    if(f <= 0 || f >= SR * 0.45) return;
    const w = TAU * f / SR, c = Math.cos(w), sn = Math.sin(w); let x = Math.cos(fase || 0), y = Math.sin(fase || 0);
    for(let i = 0; i < o.length; i++){ o[i] += a * env[i] * y; const nx = x * c - y * sn; y = x * sn + y * c; x = nx; }
  };
  const INST = {
    piano(f, dur){ const o = new Float32Array(Math.floor((dur + 1.4) * SR)), r = ruido(Math.round(f * 7)); for(let k = 1; k <= 10; k++) parcial(o, k * f * Math.sqrt(1 + 0.0004 * k * k), (k === 1 ? 1 : 0.62) / Math.pow(k, 1.25), 0.004, 0.9 + 0.55 * k, dur, 9); const nh = Math.floor(0.006 * SR); for(let i = 0; i < nh; i++) o[i] += r() * 0.08 * (1 - i / nh); return o; },
    vibrafone(f, dur){ const o = new Float32Array(Math.floor((dur + 1.6) * SR)); parcial(o, f, 1, 0.003, 1.1, dur + 0.3, 5); parcial(o, 4 * f, 0.22, 0.002, 7, dur, 5); parcial(o, 10 * f, 0.08, 0.001, 20, dur, 5);
      const w = TAU * 5.4 / SR, c = Math.cos(w), sn = Math.sin(w); let x = 1, y = 0; for(let i = 0; i < o.length; i++){ o[i] *= 1 - 0.28 * (0.5 + 0.5 * y); const nx = x * c - y * sn; y = x * sn + y * c; x = nx; } return o; },
    sino(f, dur){ const n = Math.floor((dur + 1.8) * SR), o = new Float32Array(n), kI = Math.exp(-3 / SR), ke = Math.exp(-1.5 / SR), k2 = Math.exp(-4 / SR), na = Math.round(0.002 * SR); let I = 2.6, e = 0, e2 = 0.18;
      for(let i = 0; i < n; i++){ const t = i / SR; if(i < na) e = i / na; else e *= ke; o[i] = e * (0.8 * Math.sin(TAU * f * t + I * Math.sin(TAU * 3.5 * f * t)) + e2 * Math.sin(TAU * 2.76 * f * t)); I *= kI; e2 *= k2; } return o; },
    marimba(f, dur){ const o = new Float32Array(Math.floor((dur + 0.9) * SR)), r = ruido(Math.round(f)); parcial(o, f, 1, 0.001, 3.2, dur + 0.5, 4); parcial(o, 4 * f, 0.3, 0.001, 13, dur, 4); parcial(o, 9.9 * f, 0.1, 0.0005, 32, dur, 4); const nh = Math.round(0.003 * SR); for(let i = 0; i < nh; i++) o[i] += r() * 0.2 * (1 - i / nh); return o; },
    seno(f, dur){ const n = Math.floor((dur + 0.5) * SR), o = new Float32Array(n), env = new Float32Array(n), na = Math.round(0.012 * SR), nd = Math.round(dur * SR), kq = Math.exp(-0.6 / SR), ks = Math.exp(-7.6 / SR); let e = 0; for(let i = 0; i < n; i++){ if(i < na) e = i / na; else e *= i < nd ? kq : ks; env[i] = e; } parcialEnv(o, f, 1, env); parcialEnv(o, 2 * f, 0.06, env); return o; },
    chip(f, dur){ const n = Math.floor((dur + 0.12) * SR), o = new Float32Array(n), per = SR / f, kq = Math.exp(-9 / SR); let dec = 0.45, fase = 0; for(let i = 0; i < n; i++){ const t = i / SR, vib = t > 0.18 ? 1 + 0.006 * Math.sin(TAU * 6 * t) : 1; fase += vib / per; if(fase >= 1) fase -= 1; let e = i < 0.002 * SR ? i / (0.002 * SR) : 0.55 + dec; dec *= kq; if(t > dur) e *= Math.max(0, 1 - (t - dur) / 0.1); o[i] = e * (fase < 0.5 ? 0.5 : -0.5); } return o; },
    /* serra filtrada (sintetizador e metais): o filtro abre e fecha mexendo no peso de cada harmônico */
    serra(f, dur, o2){
      const n = Math.floor((dur + 0.6) * SR), o = new Float32Array(n), metal = o2 && o2.metais, inv = new Float32Array(n), env = new Float32Array(n), nd = Math.round(dur * SR);
      const kq = Math.exp(-(metal ? 0.5 : 2.2) / SR), ks = Math.exp(-10 / SR), kf = Math.exp(-(metal ? 11 : 7) / SR), na = Math.round((metal ? 0.04 : 0.003) * SR); let e = 0, ab = 1;
      for(let i = 0; i < n; i++){ if(i < na) e = i / na; else e *= i < nd ? kq : ks; env[i] = e; const fc = metal ? f * (1.4 + 6 * (1 - ab)) : f * (2 + 11 * ab); ab *= kf; inv[i] = 1 / (fc * fc); }
      [-6, 6].forEach(cents => { const ff = f * Math.pow(2, cents / 1200); for(let k = 1; k <= 14; k++){ const fk = k * ff; if(fk > 11000) break; const w = TAU * fk / SR, c = Math.cos(w), sn = Math.sin(w), fk2 = fk * fk, a = 0.5 / k; let x = 1, y = 0; for(let i = 0; i < n; i++){ o[i] += a * env[i] * y / (1 + fk2 * inv[i]); const nx = x * c - y * sn; y = x * sn + y * c; x = nx; } } });
      return o;
    },
    pluck(f, dur){ return INST.serra(f, Math.min(dur, 0.5)); },
    metais(f, dur){ return INST.serra(f, dur, { metais: true }); },
    violao(f, dur, o2){ const n = Math.floor((dur + 1.5) * SR), o = new Float32Array(n), N = Math.max(2, Math.round(SR / f)), r = ruido(Math.round(f * 13)), buf = new Float32Array(N); for(let i = 0; i < N; i++) buf[i] = r(); for(let p = 0; p < 2; p++) for(let i = 0; i < N; i++) buf[i] = 0.5 * (buf[i] + buf[(i + 1) % N]); const damp = f < 150 ? 0.998 : 0.9965, nd = Math.round((dur + 0.4) * SR), kf = Math.exp(-6 / SR); let j = 0, fim = 1; for(let i = 0; i < n; i++){ const a = buf[j], b = buf[(j + 1) % N]; if(i > nd) fim *= kf; o[i] = a * fim; buf[j] = damp * 0.5 * (a + b); j = (j + 1) % N; } if(o2 && o2.suja){ const k = Math.tanh(3.2); for(let i = 0; i < n; i++) o[i] = Math.tanh(3.2 * o[i]) / k; } return o; },
    guitarra(f, dur){ return INST.violao(f, dur, { suja: true }); },
    baixo(f, dur){ const n = Math.floor((dur + 0.6) * SR), o = new Float32Array(n); parcial(o, f, 1, 0.006, 1.6, dur, 8); parcial(o, 2 * f, 0.25, 0.006, 1.6, dur, 8); for(let i = 0; i < n; i++) o[i] = Math.tanh(1.8 * o[i]) * 0.8; return o; },
    pad(f, dur){ const n = Math.floor((dur + 1.2) * SR), o = new Float32Array(n), env = new Float32Array(n), na = Math.round(0.35 * SR), nd = Math.round(dur * SR), ks = Math.exp(-3 / SR); let e = 0; for(let i = 0; i < n; i++){ if(i < na) e = i / na; else if(i >= nd) e *= ks; env[i] = e; } [-9, 0, 8].forEach((c, j) => { const ff = f * Math.pow(2, c / 1200); for(let k = 1; k <= 7; k++) parcialEnv(o, ff * k, 0.28 / k / (1 + k * k * 0.08), env, j + k); }); return o; }
  };
  /* a bateria */
  const BAT = {
    bumbo(longo){ const n = Math.floor((longo ? 0.9 : 0.4) * SR), o = new Float32Array(n), kd = Math.exp(-(longo ? 3.2 : 7.5) / SR), kp = Math.exp(-32 / SR); let fase = 0, e = 1, p = 1; for(let i = 0; i < n; i++){ const f = (longo ? 46 : 52) + (longo ? 60 : 85) * p; p *= kp; fase += TAU * f / SR; o[i] = Math.tanh(2 * Math.sin(fase) * e) * 0.9 + (i < 0.002 * SR ? 0.35 : 0); e *= kd; } return o; },
    caixa(seed, suja){ const n = Math.floor(0.32 * SR), o = new Float32Array(n), r = ruido(seed), kn = Math.exp(-15 / SR), kt = Math.exp(-22 / SR), w = TAU * 188 / SR; let ant = 0, lp = 0, en = 1, et = 1, x = 1, y = 0; const c = Math.cos(w), sn = Math.sin(w); for(let i = 0; i < n; i++){ const nz = r(), hp = nz - ant; ant = nz; lp += (hp - lp) * (suja ? 0.35 : 0.8); o[i] = (suja ? lp : hp) * 0.55 * en + 0.45 * y * et; en *= kn; et *= kt; const nx = x * c - y * sn; y = x * sn + y * c; x = nx; } return o; },
    palma(seed){ const n = Math.floor(0.3 * SR), o = new Float32Array(n), r = ruido(seed); let ant = 0; for(let i = 0; i < n; i++){ const t = i / SR, nz = r(), hp = nz - ant; ant = nz; const burst = (t >= 0 ? Math.exp(-t * 90) : 0) + (t >= 0.011 ? Math.exp(-(t - 0.011) * 90) : 0) + (t >= 0.022 ? Math.exp(-(t - 0.022) * 90) : 0) + 0.5 * Math.exp(-t * 11); o[i] = hp * 0.42 * burst; } return o; },
    chimbal(seed){ const n = Math.floor(0.08 * SR), o = new Float32Array(n), r = ruido(seed), k = Math.exp(-55 / SR); let ant = 0, e = 1; for(let i = 0; i < n; i++){ const nz = r(); o[i] = (nz - ant) * 0.28 * e; e *= k; ant = nz; } return o; },
    vassoura(seed){ const n = Math.floor(0.45 * SR), o = new Float32Array(n), r = ruido(seed); let lp = 0; for(let i = 0; i < n; i++){ lp += (r() - lp) * 0.25; o[i] = lp * 0.35 * Math.sin(Math.PI * i / n); } return o; },
    ganza(seed){ const n = Math.floor(0.09 * SR), o = new Float32Array(n), r = ruido(seed); let ant = 0; for(let i = 0; i < n; i++){ const nz = r(); o[i] = (nz - ant) * 0.16 * Math.sin(Math.PI * i / n); ant = nz; } return o; },
    bloco(f){ const o = new Float32Array(Math.floor(0.08 * SR)); parcial(o, f, 0.35, 0.0002, 60, 0.08, 0); return o; },
    chipRuido(seed){ const n = Math.floor(0.09 * SR), o = new Float32Array(n), r = ruido(seed), k = Math.exp(-30 / SR); let v = 0, e = 1; for(let i = 0; i < n; i++){ if(i % 6 === 0) v = r() > 0 ? 0.3 : -0.3; o[i] = v * e; e *= k; } return o; },
    prato(seed){ const n = Math.floor(1.4 * SR), o = new Float32Array(n), r = ruido(seed), k = Math.exp(-2.6 / SR); let ant = 0, e = 1; for(let i = 0; i < n; i++){ const nz = r(); o[i] = (nz - ant) * 0.2 * e; e *= k; ant = nz; } return o; },
    subida(dur, seed){ const n = Math.floor(dur * SR), o = new Float32Array(n), r = ruido(seed); let lp = 0; for(let i = 0; i < n; i++){ const t = i / n, k = 0.05 + 0.6 * t; lp += (r() - lp) * k; o[i] = lp * 0.4 * t * t; } return o; }
  };
  /* a sala: um reverb de Schroeder (4 pentes e 2 passa-tudo por lado) */
  function sala(x, mix, desloca){
    if(mix <= 0) return x;
    const n = x.length, out = new Float32Array(n), pentes = [1116, 1188, 1277, 1356].map(d => d + desloca), acum = new Float32Array(n);
    pentes.forEach(d => { const b = new Float32Array(d); let k = 0, lp = 0; for(let i = 0; i < n; i++){ const y = b[k]; lp = y * 0.75 + lp * 0.25; b[k] = x[i] + lp * 0.8; acum[i] += y; k = (k + 1) % d; } });
    let y = acum; [556 + desloca, 441 + desloca].forEach(d => { const b = new Float32Array(d), z = new Float32Array(n); let k = 0; for(let i = 0; i < n; i++){ const bv = b[k], v = -y[i] * 0.5 + bv; b[k] = y[i] + bv * 0.5; z[i] = v; k = (k + 1) % d; } y = z; });
    for(let i = 0; i < n; i++) out[i] = x[i] * (1 - mix * 0.5) + y[i] * mix * 0.22;
    return out;
  }

  /* ---------- o som pronto (estéreo, 44,1 kHz) ---------- */
  S.render = p => {
    const n = Math.ceil(p.dur * SR), B = { L: new Float32Array(n), R: new Float32Array(n) }, gen = p.genero, inst = INST[p.timbre] || INST.piano;
    const em = t => Math.max(0, Math.round(t * SR));
    p.notas.forEach((nt, i) => soma(B, em(nt.t), inst(hz(nt.midi), nt.ultima ? nt.dur : Math.max(0.06, nt.dur - SOLTA * 0.3)), 0.32 * nt.vel, (i % 2 ? 0.16 : -0.16)));
    const a = p.acorde;
    a.midis.forEach((m, i) => soma(B, em(a.t + 0.012 * i), (gen.pad ? INST.pad : inst)(hz(m), a.dur), gen.pad ? 0.22 : 0.2, [-0.38, 0.32, -0.12, 0.42][i % 4]));
    if(gen.pad) a.midis.concat([p.notas[p.notas.length - 1].midi]).forEach((m, i) => soma(B, em(a.t), INST.sino(hz(m + 12), a.dur * 0.6), 0.05, i % 2 ? 0.5 : -0.5));
    if(gen.baixo) soma(B, em(a.t), gen.baixo === 'acustico' ? INST.violao(hz(a.raiz - 12), a.dur) : INST.baixo(hz(a.raiz - 12), a.dur), gen.baixo === 'acustico' ? 0.5 : 0.42, 0);
    if(p.bateria){
      const s = M.hash(p.notas.map(x => x.s).join('')), t0 = p.notas[0].t, tA = a.t;
      const b = gen.bat;
      if(b === 'boombap'){ soma(B, em(t0), BAT.bumbo(false), 0.5, 0); soma(B, em(tA), BAT.caixa(s, true), 0.55, 0.05); soma(B, em(tA), BAT.bumbo(false), 0.42, 0); p.notas.forEach((x, i) => { if(i) soma(B, em(x.t), BAT.chimbal(s + i), 0.5, 0.3); }); }
      if(b === 'punk'){ p.notas.forEach((x, i) => soma(B, em(x.t), i % 2 ? BAT.caixa(s + i, false) : BAT.bumbo(false), 0.4, 0)); soma(B, em(tA), BAT.prato(s), 0.5, 0.2); soma(B, em(tA), BAT.bumbo(false), 0.45, 0); }
      if(b === 'chip'){ p.notas.forEach((x, i) => soma(B, em(x.t), BAT.chipRuido(s + i), 0.45, 0)); soma(B, em(tA), BAT.chipRuido(s + 99), 0.7, 0); }
      if(b === 'largada'){ soma(B, em(Math.max(0, tA - 0.5)), BAT.subida(0.5, s), 0.55, 0); soma(B, em(tA), BAT.bumbo(true), 0.55, 0); soma(B, em(tA), BAT.prato(s), 0.3, -0.2); }
      if(b === 'vassoura'){ soma(B, em(tA), BAT.vassoura(s), 0.6, 0.25); p.notas.forEach((x, i) => { if(i % 2) soma(B, em(x.t), BAT.chimbal(s + i), 0.25, 0.35); }); }
      if(b === 'ganza'){ p.notas.forEach((x, i) => soma(B, em(x.t), BAT.ganza(s + i), 0.55, 0.3)); soma(B, em(tA), BAT.ganza(s + 77), 0.7, 0.3); }
      if(b === 'bloco') p.notas.forEach(x => soma(B, em(x.t), BAT.bloco(1800), 0.35, -0.2));
      if(b === 'fanfarra'){ for(let k = 0; k < 6; k++) soma(B, em(Math.max(0, tA - 0.3 + k * 0.05)), BAT.caixa(s + k, false), 0.18 + k * 0.04, 0); soma(B, em(tA), BAT.prato(s), 0.42, 0.15); soma(B, em(tA), BAT.bumbo(false), 0.45, 0); }
      if(b === 'palma'){ soma(B, em(t0), BAT.bumbo(true), 0.45, 0); soma(B, em(tA), BAT.palma(s), 0.6, 0); soma(B, em(tA), BAT.bumbo(true), 0.5, 0); }
    }
    /* o chiado de vinil do boom bap */
    if(gen.lofi){ const r = ruido(4242); for(let i = 0; i < n; i++){ const c = r(); if(c > 0.9993){ const v = r() * 0.18; B.L[i] += v; B.R[i] += v * 0.8; } const h = r() * 0.0035; B.L[i] += h; B.R[i] += h; } }
    let L = sala(B.L, gen.sala, 0), R = sala(B.R, gen.sala, 23);
    if(gen.lofi){ let a1 = 0, a2 = 0; for(let i = 0; i < n; i++){ a1 += (L[i] - a1) * 0.42; a2 += (R[i] - a2) * 0.42; L[i] = a1; R[i] = a2; } }
    /* saída: amacia o pico, normaliza a -1 dB e apaga o fim */
    let pico = 0; for(let i = 0; i < n; i++){ L[i] = Math.tanh(L[i] * 1.2); R[i] = Math.tanh(R[i] * 1.2); pico = Math.max(pico, Math.abs(L[i]), Math.abs(R[i])); }
    const g = pico > 0 ? 0.89 / pico : 1, fim = Math.floor(0.25 * SR);
    for(let i = 0; i < n; i++){ const f = i > n - fim ? (n - i) / fim : 1; L[i] *= g * f; R[i] *= g * f; }
    return { sr: SR, L, R, dur: n / SR };
  };
  /* WAV (PCM 16 bits, estéreo) */
  S.wav = r => {
    const n = r.L.length, dv = new DataView(new ArrayBuffer(44 + n * 4)), str = (o, s) => { for(let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); dv.setUint32(4, 36 + n * 4, true); str(8, 'WAVE'); str(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 2, true);
    dv.setUint32(24, r.sr, true); dv.setUint32(28, r.sr * 4, true); dv.setUint16(32, 4, true); dv.setUint16(34, 16, true); str(36, 'data'); dv.setUint32(40, n * 4, true);
    for(let i = 0, o = 44; i < n; i++, o += 4){ dv.setInt16(o, Math.max(-1, Math.min(1, r.L[i])) * 32767, true); dv.setInt16(o + 2, Math.max(-1, Math.min(1, r.R[i])) * 32767, true); }
    return new Blob([dv.buffer], { type: 'audio/wav' });
  };
  /* a mesma marca dá sempre o mesmo som: guarda a composição e o som pronto por marca */
  const CACHE = new Map();
  S.daMarca = sp => { const ch = JSON.stringify([sp.nome, sp.territorio, sp.pers, sp.cores && [sp.cores.p, sp.cores.a, sp.cores.s]]); if(!CACHE.has(ch)){ const p = S.compoe(sp); CACHE.set(ch, { p, r: S.render(p) }); if(CACHE.size > 8) CACHE.delete(CACHE.keys().next().value); } return CACHE.get(ch); };
  S.buffer = (ctx, r) => { const b = ctx.createBuffer(2, r.L.length, r.sr); b.copyToChannel(r.L, 0); b.copyToChannel(r.R, 1); return b; };
  let ctxG = null, tocando = null;
  S.ctx = () => { if(!ctxG){ const AC = window.AudioContext || window.webkitAudioContext; if(!AC) return null; ctxG = new AC(); } return ctxG; };
  /* toca (e devolve como parar); quando: daqui a quantos segundos */
  S.toca = async (r, quando) => {
    const ctx = S.ctx(); if(!ctx) return null;
    try{ if(ctx.state === 'suspended') await Promise.race([ctx.resume(), new Promise(ok => setTimeout(ok, 900))]); }catch(e){}
    S.para();
    const src = ctx.createBufferSource(); src.buffer = S.buffer(ctx, r); src.connect(ctx.destination);
    const t0 = ctx.currentTime + (quando || 0); src.start(t0);
    const ctl = { src, t0, ctx, para(){ try{ src.stop(); }catch(e){} }, agora: () => ctx.currentTime - t0, fim: new Promise(ok => { src.onended = ok; }) };
    tocando = ctl; ctl.fim.then(() => { if(tocando === ctl) tocando = null; });
    return ctl;
  };
  S.para = () => { if(tocando){ tocando.para(); tocando = null; } };
  S.tocando = () => !!tocando;

  /* ---------- o porquê (vai no brandbook e no PDF) ---------- */
  S.explica = (p, sp) => {
    const gen = p.genero, t = M.TERRITORIOS[sp.territorio] || {}, ss = p.silabas;
    const notas = p.notas.map(n => NOTAS[((n.midi % 12) + 12) % 12]);
    const out = [];
    out.push(`O som vem do território ${t.n || ''}: ${gen.d}. O timbre principal é ${NOME_TIMBRE[p.timbre] || p.timbre}.`);
    const ult = p.notas[p.notas.length - 1];
    out.push(`As notas vêm do nome: ${ss.join(' · ')} ${ss.length === 1 ? 'é uma sílaba só, tocada duas vezes' : `são ${ss.length} sílabas, ${ss.length} notas`} (${notas.join(', ')}). A vogal escolhe a altura, como a boca faz quando fala: o a é a nota da casa (a tônica), o e e o i sobem, o o e o u descem. A consoante escolhe o tempo: as que batem (p, t, k) tocam curto, as que arrastam (s, f, v) seguram mais, as nasais (m, n) ligam. A sílaba forte (${ss[p.iForte]}) toca mais forte e mais longa${ult.resolve ? ', e a última escorrega pra dentro do acorde, pra fechar' : ''}.`);
    out.push(p.viva ? `O tom vem da cor: ${M.nomeCor(p.cor.hex, sp.nome)} cai em ${p.nomeTom}, como no teclado de luz de Scriabin, que dava uma cor pra cada tom (o círculo das cores vira o círculo das quintas). A escala é ${p.escala.n}: ${p.escala.d}.` : `A paleta é sem cor viva, então o tom (${p.nomeTom}) sai do próprio nome. A escala é ${p.escala.n}: ${p.escala.d}.`);
    out.push(`Termina num acorde de ${p.acorde.nome}: é o ponto final da marca, o som que fica na cabeça. ${p.bpm} batidas por minuto, ${String(Math.round(p.dur * 10) / 10).replace('.', ',')} segundos${p.bateria ? ', com bateria' : ''}.`);
    return out;
  };
  /* a partitura desenhada: cada nota um bloco (tempo x altura), as sílabas embaixo e o acorde no fim */
  S.partituraEls = (p, w, h, cores, f) => {
    const els = [], ms = p.notas.map(n => n.midi).concat(p.acorde.midis), lo = Math.min(...ms) - 2, hi = Math.max(...ms) + 2, dur = p.acorde.t + p.acorde.dur;
    const X = t => 8 + (t / dur) * (w - 16), Y = m => 8 + (1 - (m - lo) / (hi - lo)) * (h - 46), alt = Math.max(5, (h - 46) / (hi - lo) * 0.9);
    for(let m = lo; m <= hi; m++) if(((m % 12) + 12) % 12 === p.tom) els.push({ d: M.forma.ret(8, Y(m) - 0.5, w - 16, 1, 0), f: cores.linha, op: 0.5 });
    p.acorde.midis.forEach(m => els.push({ d: M.forma.ret(X(p.acorde.t), Y(m) - alt / 2, X(dur) - X(p.acorde.t), alt, alt / 2), f: cores.acorde }));
    p.notas.forEach(n => { const x0 = X(n.t), x1 = n.ultima ? X(dur) : Math.max(x0 + 6, X(n.t + n.dur) - 3); els.push({ d: M.forma.ret(x0, Y(n.midi) - alt / 2, x1 - x0, alt, alt / 2), f: cores.nota }); if(f) els.push({ d: M.texto(f, n.s, { tam: 11, x: x0, y: h - 12, caixa: 'baixa' }).cmds, f: cores.texto }); });
    return els;
  };
})();
