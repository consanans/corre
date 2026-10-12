/* CORRE · BEATS (v3.26) · os discos da casa.
   Cada disco é um beat original tocado na hora pelo WebAudio (bumbo, caixa, chimbal, baixo e acordes sintetizados):
   nada baixado, nada gravado, nada de música de ninguém. Quem tá na mesma casa ouve o mesmo disco (a casa manda o
   nome do disco na presença; cada aparelho toca o dele, no mesmo tempo aproximado).
   C.beats = { DISCOS, toca(k), para(), tocando(), nivel(), nome(k) } */
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
      chords: [[0, [57, 60, 64, 67, 71], 2], [6, [57, 60, 64, 67, 71], 1], [11, [55, 59, 62, 65], 2]] }
  ];
  const DISCO = {}; DISCOS.forEach(d => { DISCO[d.k] = d; });
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
    if(ac && master){ const t = ac.currentTime; if(semFade){ master.gain.setValueAtTime(.5, t); } else { master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(0, t + .25); master.gain.setValueAtTime(.5, t + .3); } }
    chiado(false);
  }
  /* 1 no bumbo, caindo a 0 em 0,3 s (pro disco girar e a caixa pulsar) */
  const nivel = () => (!ac || !atual ? 0 : Math.max(0, Math.min(1, 1 - (ac.currentTime - ultKick) / .3)));
  /* a aba foi pro fundo: o relógio continua (setInterval), mas se o contexto dormiu, acorda ao voltar */
  document.addEventListener('visibilitychange', () => { if(!document.hidden && ac && atual && ac.state === 'suspended') try{ ac.resume(); }catch(e){} });
  C.beats = { DISCOS, toca, para, tocando: () => atual, nivel, nome: k => (DISCO[k] ? DISCO[k].nome : ''), cor: k => (DISCO[k] ? DISCO[k].cor : '') };
})();
