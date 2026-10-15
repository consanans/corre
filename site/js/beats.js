/* CORRE · BEATS (v3.26) · os discos da casa.
   Cada disco é um beat original tocado na hora pelo WebAudio (bumbo, caixa, chimbal, baixo e acordes sintetizados):
   nada baixado, nada gravado, nada de música de ninguém. Quem tá na mesma casa ouve o mesmo disco (a casa manda o
   nome do disco na presença; cada aparelho toca o dele, no mesmo tempo aproximado).
   C.beats = { DISCOS, toca(k), para(), tocando(), nivel(), nome(k), cor(k), doSebo(perfil), daCasa(perfil), SEBO } */
(() => {
  const C = window.Corre;
  /* padrões de 16 passos (semicolcheias) por compasso; `len` = quantos passos tem o laço.
     k: bumbo, s: caixa, h: chimbal (x = aberto, . = nada), b: baixo [passo, nota MIDI, duração em passos],
     a: acordes [passo, [notas], duração], t: tom extra (percussão), swing: 0..1, 808: bumbo comprido */
  const DISCOS = [
    { k: 'boombap', nome: 'Boom bap 90', bpm: 90, cor: '#F2EC54', swing: .14, len: 32,
      kick: '1000001010000010' + '1000001000100010', snare: '0000100000001000' + '0000100000001001', hat: '1010101010101010' + '1010101010101x10',
      bass: [[0, 38, 3], [6, 38, 1], [8, 45, 2], [12, 41, 3], [16, 38, 3], [22, 36, 2], [26, 43, 2], [28, 41, 3]],
      chords: [[0, [62, 65, 69, 72], 8], [8, [60, 65, 69, 72], 8], [16, [58, 62, 65, 69], 8], [24, [57, 60, 64, 67], 8]] },
    { k: 'lofi', nome: 'Lo-fi 74', bpm: 74, cor: '#C6A6FF', swing: .26, len: 32, crackle: true, suave: true,
      kick: '1000000010100000' + '1000000010000010', snare: '0000100000001000' + '0000100000001000', hat: '1010101010101010' + '1010101010101010',
      bass: [[0, 41, 6], [8, 41, 2], [12, 43, 3], [16, 40, 6], [24, 36, 4], [28, 38, 3]],
      chords: [[0, [65, 69, 72, 76], 14], [16, [64, 67, 71, 74], 8], [24, [60, 64, 67, 71], 8]] },
    { k: 'trap', nome: 'Trap 140', bpm: 140, cor: '#2E5BFF', swing: 0, len: 32, oitocentos: true,
      kick: '1000000000100100' + '1000001000100000', snare: '0000000010000000' + '0000000010000000', hat: '1010101010101111' + '1010101011111111',
      bass: [[0, 36, 5], [10, 36, 2], [13, 39, 2], [16, 34, 5], [22, 34, 1], [26, 36, 4]],
      chords: [[0, [60, 63, 67], 4], [16, [58, 62, 65], 4], [26, [60, 63, 67], 3]] },
    { k: 'funk', nome: 'Funk 130', bpm: 130, cor: '#FF4F9A', swing: 0, len: 16, oitocentos: true,
      kick: '1001001010010010', snare: '0000100000001000', hat: '0010001000100010', tom: '0100000001000100',
      bass: [[0, 36, 1], [3, 36, 1], [6, 43, 1], [9, 36, 1], [12, 36, 1], [14, 43, 1]],
      chords: [[4, [60, 64, 67], 1], [12, [60, 64, 67], 1]] },
    { k: 'jazz', nome: 'Jazz 118', bpm: 118, cor: '#FF8A3D', swing: .34, len: 32, ride: true, suave: true,
      kick: '1000000010000000' + '1000000000000000', snare: '0000001000000010' + '0000001000001000', hat: '1011101110111011' + '1011101110111011',
      bass: [[0, 36, 4], [4, 40, 4], [8, 43, 4], [12, 45, 4], [16, 41, 4], [20, 45, 4], [24, 48, 4], [28, 47, 4]],
      chords: [[0, [60, 64, 67, 71], 12], [16, [65, 69, 72, 76], 12]] },
    { k: 'house', nome: 'House 124', bpm: 124, cor: '#38E1FF', swing: 0, len: 16, clap: true,
      kick: '1000100010001000', snare: '0000100000001000', hat: '0010001000100010', hatAberto: true,
      bass: [[2, 33, 1], [6, 33, 1], [10, 33, 1], [14, 36, 1]],
      chords: [[0, [57, 60, 64, 67, 71], 2], [6, [57, 60, 64, 67, 71], 1], [11, [55, 59, 62, 65], 2]] },
    /* v3.48 · os discos do Sebo da cidade: também originais, compostos aqui (padrões e acordes próprios). Ninguém nasce
       com eles: a pessoa escolhe no Sebo e leva pro toca-discos de casa (perfil, verso.discos) */
    { k: 'samba', nome: 'Samba de quintal 100', estilo: 'samba', sebo: true, bpm: 100, cor: '#E8643A', swing: .08, len: 16, suave: true,
      kick: '1000000010000010', snare: '0010010100100101', hat: '1111111111111111', tom: '0000001000000010',
      bass: [[0, 43, 2], [6, 38, 1], [8, 43, 2], [14, 38, 1]],
      chords: [[2, [67, 71, 74], 1], [5, [67, 71, 74], 1], [10, [66, 69, 72, 74], 1], [13, [66, 69, 72, 74], 1]] },
    { k: 'bossa', nome: 'Bossa da varanda 128', estilo: 'bossa', sebo: true, bpm: 128, cor: '#D9C27F', swing: .1, len: 32, ride: true, suave: true,
      kick: '1000001010000010' + '1000001010000010', snare: '1001001000100100' + '1001001000100100', hat: '1010101010101010' + '1010101010101010',
      bass: [[0, 38, 5], [6, 45, 2], [8, 43, 5], [14, 38, 2], [16, 36, 5], [22, 43, 2], [24, 45, 5], [30, 40, 2]],
      chords: [[0, [62, 65, 69, 72], 6], [6, [62, 65, 69, 72], 2], [8, [62, 65, 67, 71], 8], [16, [60, 64, 67, 71], 6], [22, [60, 64, 67, 71], 2], [24, [61, 64, 67, 69], 8]] },
    { k: 'drill', nome: 'Drill 142', estilo: 'drill', sebo: true, bpm: 142, cor: '#8F86E8', swing: 0, len: 32, oitocentos: true,
      kick: '1000000000000000' + '0010000000100000', snare: '0000000010000000' + '0000000000001000', hat: '1001001010010010' + '1010010010100100',
      bass: [[0, 37, 6], [10, 37, 2], [16, 35, 5], [24, 40, 3], [28, 38, 3]],
      chords: [[0, [61, 64, 68], 8], [16, [59, 62, 66], 8]] },
    { k: 'dub', nome: 'Dub do Igapó 72', estilo: 'dub', sebo: true, bpm: 72, cor: '#2F5DA8', swing: .12, len: 32, suave: true, crackle: true,
      kick: '0000000010000000' + '0000000010000000', snare: '0000000010000000' + '0000000010000001', hat: '0010001000100010' + '0010001000100010',
      bass: [[0, 38, 3], [3, 38, 1], [6, 41, 2], [10, 43, 2], [16, 36, 3], [19, 36, 1], [22, 40, 2], [26, 43, 2]],
      chords: [[4, [62, 65, 69], 1], [12, [62, 65, 69], 1], [20, [60, 64, 67], 1], [28, [60, 64, 67], 1]] },
    { k: 'afro', nome: 'Afrobeat 104', estilo: 'afrobeat', sebo: true, bpm: 104, cor: '#E8A33A', swing: .06, len: 32,
      kick: '1000001000100000' + '1000001000101000', snare: '0000100000001000' + '0000100000001001', hat: '1011101110111011' + '1011101110111011', tom: '0001000100000100' + '0001000100000100',
      bass: [[0, 40, 2], [3, 40, 1], [6, 43, 1], [8, 45, 2], [12, 43, 2], [16, 40, 2], [19, 40, 1], [22, 47, 1], [24, 45, 2], [28, 43, 2]],
      chords: [[2, [64, 67, 71], 1], [7, [64, 67, 71], 1], [10, [62, 66, 69], 1], [15, [64, 67, 71], 1], [18, [64, 67, 71], 1], [23, [64, 67, 71], 1], [26, [62, 66, 69], 1]] },
    { k: 'dembow', nome: 'Dembow 96', estilo: 'dembow', sebo: true, bpm: 96, cor: '#FF6FB0', swing: 0, len: 16, oitocentos: true,
      kick: '1000100010001000', snare: '0001001000010010', hat: '1010101010101010',
      bass: [[0, 38, 2], [4, 38, 2], [8, 41, 2], [12, 43, 2]],
      chords: [[0, [62, 65, 69], 4], [8, [60, 64, 67], 4]] },
    { k: 'chill', nome: 'Chillhop da chuva 84', estilo: 'chillhop', sebo: true, bpm: 84, cor: '#9CC9F0', swing: .22, len: 32, crackle: true, suave: true,
      kick: '1000000100100000' + '1000000000100100', snare: '0000100000001000' + '0000100000001000', hat: '1010101010101010' + '1010101010101011',
      bass: [[0, 45, 4], [6, 45, 1], [8, 43, 4], [16, 41, 6], [24, 40, 4], [28, 43, 2]],
      chords: [[0, [64, 67, 69, 72], 8], [8, [62, 65, 67, 71], 8], [16, [60, 64, 65, 69], 8], [24, [59, 62, 64, 68], 8]] },
    { k: 'disco', nome: 'Discoteca 118', estilo: 'disco', sebo: true, bpm: 118, cor: '#FFB3D1', swing: 0, len: 16, clap: true, hatAberto: true,
      kick: '1000100010001000', snare: '0000100000001000', hat: '0010001000100010',
      bass: [[0, 41, 1], [2, 53, 1], [4, 41, 1], [6, 53, 1], [8, 43, 1], [10, 55, 1], [12, 43, 1], [14, 55, 1]],
      chords: [[0, [65, 69, 72, 76], 2], [6, [65, 69, 72, 76], 1], [8, [67, 71, 74, 77], 2], [14, [67, 71, 74, 77], 1]] },
    { k: 'grime', nome: 'Grime 140', estilo: 'grime', sebo: true, bpm: 140, cor: '#E7B734', swing: 0, len: 32,
      kick: '1000000000100000' + '1000000000000100', snare: '0000000010000000' + '0000000010000000', hat: '1000100010001000' + '1010100010001010',
      bass: [[0, 36, 2], [3, 36, 1], [6, 39, 1], [8, 36, 2], [12, 41, 2], [16, 36, 2], [19, 43, 1], [22, 39, 1], [24, 36, 2], [28, 34, 3]],
      chords: [[0, [60, 63, 67], 1], [3, [60, 63, 67], 1], [10, [58, 62, 65], 1], [16, [60, 63, 67], 1], [26, [63, 67, 70], 1]] },
    { k: 'noite', nome: 'Noite em Londrina 64', estilo: 'ambiente', sebo: true, bpm: 64, cor: '#1C2350', swing: 0, len: 32, suave: true, crackle: true,
      kick: '1000000000000000' + '0000000000000000', snare: '0'.repeat(32), hat: '0000000010000000' + '0000000010000000',
      bass: [[0, 33, 16], [16, 31, 16]],
      chords: [[0, [57, 64, 67, 71], 16], [16, [55, 62, 65, 69], 16]] }
  ];
  /* v3.55: sem protótipo: disco "constructor" vindo da presença não acha nada (antes tocava um disco quebrado em loop) */
  const DISCO = Object.create(null); DISCOS.forEach(d => { DISCO[d.k] = d; });
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  let ac = null, master = null, comp = null, ruido = null, crack = null, timer = 0, atual = '', passo = 0, prox = 0, ultKick = -9;

  function liga(){
    if(ac) return ac;
    const AC = window.AudioContext || window.webkitAudioContext; if(!AC) return null;
    ac = new AC();
    comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    master = ac.createGain(); master.gain.value = .5;
    master.connect(comp); comp.connect(ac.destination);
    /* um ruído branco de 1 s pra caixa, chimbal e chiado de vinil */
    const n = ac.sampleRate, b = ac.createBuffer(1, n, n), d = b.getChannelData(0); for(let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    ruido = b;
    return ac;
  }
  const env = (g, t, a, pico, dec, fim) => { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(pico, t + a); g.gain.exponentialRampToValueAtTime(Math.max(1e-4, fim || 1e-4), t + a + dec); };
  function kick(t, longo, vel){
    const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(longo ? 120 : 160, t); o.frequency.exponentialRampToValueAtTime(longo ? 38 : 48, t + (longo ? .12 : .07));
    env(g, t, .003, (vel || 1) * (longo ? 1.1 : .95), longo ? .55 : .28);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + (longo ? .7 : .35));
    ultKick = t;
  }
  function snare(t, suave, clap){
    const s = ac.createBufferSource(); s.buffer = ruido; const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = clap ? 1400 : 1900; f.Q.value = .8;
    const g = ac.createGain(); s.connect(f); f.connect(g); g.connect(master);
    if(clap){ [0, .012, .026].forEach((d, i) => { g.gain.setValueAtTime(i === 2 ? .5 : .32, t + d); g.gain.exponentialRampToValueAtTime(1e-3, t + d + (i === 2 ? .18 : .012)); }); }
    else env(g, t, .002, suave ? .32 : .55, suave ? .12 : .18);
    s.start(t); s.stop(t + .3);
    if(!clap){ const o = ac.createOscillator(), og = ac.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(suave ? 170 : 200, t); o.frequency.exponentialRampToValueAtTime(120, t + .08); env(og, t, .002, suave ? .25 : .4, .09); o.connect(og); og.connect(master); o.start(t); o.stop(t + .15); }
  }
  function hat(t, aberto, ride, vel){
    const s = ac.createBufferSource(); s.buffer = ruido; const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = ride ? 5200 : 7600;
    const g = ac.createGain(); s.connect(f); f.connect(g); g.connect(master);
    env(g, t, .001, (vel || 1) * (ride ? .14 : .2), aberto ? .26 : ride ? .16 : .045);
    s.start(t); s.stop(t + .35);
  }
  function tom(t){
    const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(110, t + .12);
    env(g, t, .002, .5, .16); o.connect(g); g.connect(master); o.start(t); o.stop(t + .25);
  }
  function baixo(t, nota, dur, oitocentos){
    const o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
    if(oitocentos){ o.type = 'sine'; o.frequency.setValueAtTime(hz(nota) * 1.6, t); o.frequency.exponentialRampToValueAtTime(hz(nota), t + .06); f.type = 'lowpass'; f.frequency.value = 600; env(g, t, .004, .62, Math.max(.25, dur * .9)); }
    else { o.type = 'triangle'; o.frequency.value = hz(nota); f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(260, t + .25); env(g, t, .006, .45, Math.max(.18, dur * .85)); }
    o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .1);
  }
  function acorde(t, notas, dur, suave){
    const g = ac.createGain(), f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(suave ? 1100 : 1900, t); f.frequency.exponentialRampToValueAtTime(suave ? 500 : 800, t + Math.min(1.2, dur));
    env(g, t, suave ? .03 : .008, suave ? .09 : .11, dur, 1e-4);
    notas.forEach((n, i) => { const o = ac.createOscillator(); o.type = i === 0 ? 'sine' : 'triangle'; o.frequency.value = hz(n); o.detune.value = (i % 2 ? 6 : -6); o.connect(f); o.start(t); o.stop(t + dur + .2); });
    f.connect(g); g.connect(master);
  }
  function chiado(on){
    if(crack){ try{ crack.stop(); }catch(e){} crack = null; }
    if(!on) return;
    const s = ac.createBufferSource(); s.buffer = ruido; s.loop = true; const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 3000;
    const g = ac.createGain(); g.gain.value = .012; s.connect(f); f.connect(g); g.connect(master); s.start(); crack = s;
  }
  /* o relógio: agenda com 120 ms de antecedência, de 25 em 25 ms (não trava com a aba pesada) */
  function agenda(){
    const d = DISCO[atual]; if(!d || !ac) return;
    const semi = 60 / d.bpm / 4;
    while(prox < ac.currentTime + .12){
      const i = passo % d.len, impar = i % 2 === 1, t = prox + (impar ? semi * d.swing : 0);
      if(d.kick[i] === '1') kick(t, !!d.oitocentos, 1);
      if(d.snare[i] === '1') snare(t, !!d.suave, !!d.clap);
      const h = d.hat[i]; if(h === '1' || h === 'x') hat(t, h === 'x' || (d.hatAberto && h === '1'), !!d.ride, i % 4 === 0 ? 1 : .6);
      if(d.tom && d.tom[i] === '1') tom(t);
      d.bass.forEach(([p, n, dur]) => { if(p === i) baixo(t, n, dur * semi, !!d.oitocentos); });
      d.chords.forEach(([p, ns, dur]) => { if(p === i) acorde(t, ns, dur * semi, !!d.suave); });
      prox += semi; passo++;
    }
  }
  function toca(k){
    const d = DISCO[k]; if(!d) return false;
    if(!liga()) return false;
    try{ if(ac.state === 'suspended') ac.resume(); }catch(e){}
    if(atual === k && timer) return true;
    para(true);
    atual = k; passo = 0; prox = ac.currentTime + .05;
    master.gain.cancelScheduledValues(ac.currentTime); master.gain.setValueAtTime(.5, ac.currentTime);
    chiado(!!d.crackle);
    timer = setInterval(agenda, 25); agenda();
    return true;
  }
  function para(semFade){
    if(timer){ clearInterval(timer); timer = 0; }
    atual = '';
    if(ac && master){ const t = ac.currentTime; if(semFade){ master.gain.setValueAtTime(.5, t); } else { master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(0, t + .25); master.gain.setValueAtTime(.5, t + 4.5); } }
    /* v3.55: o volume só volta depois do rabo das notas longas (em .3 s o acorde do disco tirado voltava alto por uns segundos); o toca() refaz o volume na hora */
    chiado(false);
  }
  /* 1 no bumbo, caindo a 0 em 0,3 s (pro disco girar e a caixa pulsar) */
  const nivel = () => (!ac || !atual ? 0 : Math.max(0, Math.min(1, 1 - (ac.currentTime - ultKick) / .3)));
  /* a aba foi pro fundo: o relógio continua (setInterval), mas se o contexto dormiu, acorda ao voltar */
  document.addEventListener('visibilitychange', () => { if(!document.hidden && ac && atual && ac.state === 'suspended') try{ ac.resume(); }catch(e){} });
  /* v3.48: o que toca no toca-discos de uma casa: os de sempre (todo mundo tem) e os que o dono trouxe do Sebo */
  const BASE = DISCOS.filter(d => !d.sebo).map(d => d.k);
  const doSebo = p => { const v = p && p.verso && typeof p.verso === 'object' && Array.isArray(p.verso.discos) ? p.verso.discos : []; return [...new Set(v.filter(k => typeof k === 'string' && DISCO[k] && DISCO[k].sebo))]; };
  const daCasa = p => BASE.concat(doSebo(p)).map(k => DISCO[k]);
  C.beats = { DISCOS, toca, para, tocando: () => atual, nivel, nome: k => (DISCO[k] ? DISCO[k].nome : ''), cor: k => (DISCO[k] ? DISCO[k].cor : ''), doSebo, daCasa, SEBO: DISCOS.filter(d => d.sebo) };
})();
