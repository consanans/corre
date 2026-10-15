/* CORRE · CORREVERSO · O SOM DA CIDADE (v3.40).
   Tudo aqui é tocado ao vivo no aparelho pelo WebAudio: nada é baixado, nada é gravação de ninguém.
   · A musiquinha "Rua do Corre": trilha original do Corre, num clima de videogame de pixel com um pé no lo-fi
     (96 batidas por minuto, com balanço). Fica baixinha quando tem conversa no mic e pausa dentro das casas (lá tocam
     os discos) e no aquário.
   · Os sons da cidade: passo (muda na calçada, na grama, na madeira do píer, no piso de casa), pulo e aterrissagem,
     carro passando perto, buzina ao longe, passarinho nos parques, gente no Calçadão e na Feira, água no Lago, o motor
     do teu veículo (carro, moto, scooter), a catraca da bike, o zumbido do patinete, o skate rolando, a buzina e a
     campainha, o avião e o paraquedas.
   O botão de som (no alto) troca entre "Música" (tudo), "Só sons" (sem a música) e "Mudo", e o aparelho lembra.
   C.versoSom = { entra(botao, estado), sai(), alterna(), modo(), tocando(), passo(), pulo(), cai(), buzina(),
                  carroPassa(), motor(), ambiente(), aviao(), moeda(), porta(), amostra(seg), amostraFx() } */
(function(){
  'use strict';
  const C = window.Corre; if(!C) return;
  const { ico } = C;
  const PREF_K = 'corre-verso-som', VOL = .2, VOZ_BAIXA = .28;
  const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const midi = n => { const m = /^([A-G])([#b]?)(\d)$/.exec(n); return (Number(m[3]) + 1) * 12 + SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); };
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  const sorte = (a, b) => a + Math.random() * (b - a);

  /* ---------- a música: 16 compassos (A e B), em loop ---------- */
  const BPM = 96, BT = 60 / BPM, BAR = 4 * BT, E8 = BT / 2, SW = .17;
  const pos8 = (bar, k) => bar * BAR + k * E8 + (k % 2 ? SW * E8 : 0);
  const ACORDES = ['F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'C', 'Dm', 'G', 'C', 'Am', 'Dm', 'E', 'Am', 'G'];
  const VOZES = { F: ['F3', 'A3', 'C4'], G: ['G3', 'B3', 'D4'], Em: ['E3', 'G3', 'B3'], Am: ['A3', 'C4', 'E4'], C: ['G3', 'C4', 'E4'], Dm: ['F3', 'A3', 'D4'], E: ['E3', 'G#3', 'B3'] };
  const RAIZ = { F: 'F2', G: 'G2', Em: 'E2', Am: 'A2', C: 'C2', Dm: 'D2', E: 'E2' };
  /* a melodia, compasso por compasso: [nota, colcheias] ('-' é pausa) */
  const MEL = [
    'C5:1 F5:1 A5:2 G5:1 F5:1 E5:2', 'D5:1 G5:1 B5:2 A5:1 G5:1 D5:2', 'E5:2 G5:1 B5:1 A5:2 G5:2', 'E5:3 C5:1 A4:4',
    'C5:1 F5:1 A5:2 G5:1 A5:1 C6:2', 'B5:2 A5:1 G5:1 F5:2 D5:2', 'E5:1 G5:1 C6:2 B5:1 G5:1 E5:2', 'C5:6 -:2',
    'A4:1 D5:1 F5:2 E5:1 D5:1 A4:2', 'B4:1 D5:1 G5:2 F5:1 D5:1 B4:2', 'C5:1 E5:1 G5:2 A5:2 G5:2', 'E5:4 -:2 C5:1 D5:1',
    'F5:2 E5:1 D5:1 A5:2 F5:2', 'G#5:2 B5:1 G#5:1 E5:4', 'A5:1 G5:1 E5:2 C5:2 E5:2', 'D5:2 G4:1 B4:1 D5:4'
  ];
  function partitura(){
    const ev = [];
    ACORDES.forEach((a, bar) => {
      const t0 = bar * BAR, r = midi(RAIZ[a]), B = bar >= 8;
      ev.push([t0 + .01, 'pad', VOZES[a].map(midi), BAR * .96, .07]);
      [[0, r, 3, .3], [3, r + 12, 1, .2], [4, r + 7, 2, .26], [6, r, 2, .24]].forEach(([k, m, d, v]) => ev.push([pos8(bar, k), 'baixo', m, d * E8 * .9, v]));
      [0, 4].concat(B && bar % 2 ? [7] : []).forEach(k => ev.push([pos8(bar, k), 'bumbo', .5]));
      [2, 6].forEach(k => ev.push([pos8(bar, k), 'caixa', .16]));
      for(let k = 0; k < 8; k++) ev.push([pos8(bar, k), 'chimbal', k % 2 ? .035 : .05]);
      let k = 0;
      MEL[bar].split(' ').forEach(tk => { const [n, q] = tk.split(':'), d = Number(q); if(n !== '-') ev.push([pos8(bar, k), 'lead', midi(n), d * E8 * .92, B ? .13 : .14]); k += d; });
    });
    ev.push([15 * BAR + 6 * E8, 'brilho', midi('D6'), .5, .05], [15 * BAR + 7 * E8, 'brilho', midi('G6'), .5, .045]);
    return ev.sort((a, b) => a[0] - b[0]);
  }
  const VOLTA = 16 * BAR;

  /* ---------- a mesa: música, efeitos e ambiente, cada um no seu canal ---------- */
  let ac = null, master = null, bus = null, musOut = null, fx = null, amb = null, ruido = null, marrom = null, onda = null;
  let timer = 0, ev = [], i = 0, t0 = 0, musicaOn = false;
  let ativo = false, esperando = false, estado = null, vigia = 0, modoAtual = 'tudo';
  const lePref = () => { try{ const v = localStorage.getItem(PREF_K); return v === '0' ? 'mudo' : v === 'fx' ? 'fx' : 'tudo'; }catch(e){ return 'tudo'; } };
  const salvaPref = m => { try{ localStorage.setItem(PREF_K, m === 'mudo' ? '0' : m === 'fx' ? 'fx' : '1'); }catch(e){} };
  modoAtual = lePref();
  const st = () => { const s = estado ? estado() : null; return s || {}; };
  const fxOk = () => !!(ac && ativo && modoAtual !== 'mudo' && ac.state === 'running' && !st().pausa);
  function mesa(){
    master = ac.createGain(); master.gain.value = 1; master.connect(ac.destination);
    musOut = ac.createGain(); musOut.gain.value = 0;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.knee.value = 14; comp.ratio.value = 3;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7800;
    const seco = ac.createGain(), molhado = ac.createGain(), rev = ac.createConvolver();
    seco.gain.value = .86; molhado.gain.value = .2;
    const n = Math.floor(ac.sampleRate * 1.6), b = ac.createBuffer(2, n, ac.sampleRate);
    for(let c = 0; c < 2; c++){ const d = b.getChannelData(c); for(let k = 0; k < n; k++) d[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / n, 3.2); }
    rev.buffer = b;
    bus = ac.createGain();
    bus.connect(seco); bus.connect(rev); rev.connect(molhado);
    seco.connect(lp); molhado.connect(lp); lp.connect(comp); comp.connect(musOut); musOut.connect(master);
    /* efeitos e ambiente passam por um limitador, pra nada estourar no fone */
    const lim = ac.createDynamicsCompressor(); lim.threshold.value = -10; lim.knee.value = 6; lim.ratio.value = 8; lim.connect(master);
    fx = ac.createGain(); fx.gain.value = 0; fx.connect(lim);
    amb = ac.createGain(); amb.gain.value = 0; amb.connect(lim);
    /* o ruído branco (bateria, passos), o marrom (trânsito, água) e a onda de pulso (25%), o timbre de videogame */
    ruido = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const r = ruido.getChannelData(0); for(let k = 0; k < r.length; k++) r[k] = Math.random() * 2 - 1;
    marrom = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const m = marrom.getChannelData(0); let ult = 0; for(let k = 0; k < m.length; k++){ ult = (ult + .02 * (Math.random() * 2 - 1)) / 1.02; m[k] = ult * 3.2; }
    const N = 32, re = new Float32Array(N), im = new Float32Array(N); for(let h = 1; h < N; h++) im[h] = (2 / (h * Math.PI)) * Math.sin(h * Math.PI * .25);
    onda = ac.createPeriodicWave(re, im);
  }
  function env(g, t, a, pk, d, sus, fim){ g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(pk, t + a); g.gain.exponentialRampToValueAtTime(Math.max(.0001, pk * sus), t + a + d); g.gain.setTargetAtTime(.0001, fim, .06); }
  /* os instrumentos da música */
  function lead(t, m, d, v){
    const o = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter(), lfo = ac.createOscillator(), lg = ac.createGain();
    o.setPeriodicWave(onda); o.frequency.value = hz(m);
    lfo.frequency.value = 5.5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(hz(m) * .006, t + Math.min(.35, d * .7)); lfo.connect(lg); lg.connect(o.frequency);
    lp.type = 'lowpass'; lp.frequency.value = 3200; lp.Q.value = .4;
    env(g, t, .008, v, .12, .62, t + d);
    o.connect(lp); lp.connect(g); g.connect(bus);
    o.start(t); lfo.start(t); o.stop(t + d + .5); lfo.stop(t + d + .5);
  }
  function pad(t, ms, d, v){
    ms.forEach((m, j) => [-4, 4].forEach(cents => {
      const o = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter();
      o.type = 'triangle'; o.frequency.value = hz(m); o.detune.value = cents + (j - 1) * 2;
      lp.type = 'lowpass'; lp.frequency.value = 1500;
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v * .5, t + .35); g.gain.setTargetAtTime(.0001, t + d - .2, .25);
      o.connect(lp); lp.connect(g); g.connect(bus); o.start(t); o.stop(t + d + 1.2);
    }));
  }
  function baixo(t, m, d, v){
    const o = ac.createOscillator(), s = ac.createOscillator(), g = ac.createGain(), gs = ac.createGain(), lp = ac.createBiquadFilter();
    o.type = 'triangle'; o.frequency.value = hz(m); s.type = 'sine'; s.frequency.value = hz(m) / 2; gs.gain.value = .3;
    lp.type = 'lowpass'; lp.frequency.value = 700;
    env(g, t, .01, v, .2, .55, t + d);
    o.connect(g); s.connect(gs); gs.connect(g); g.connect(lp); lp.connect(bus);
    o.start(t); s.start(t); o.stop(t + d + .4); s.stop(t + d + .4);
  }
  function brilho(t, m, d, v, saida){
    const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = hz(m);
    env(g, t, .004, v, .25, .2, t + d); o.connect(g); g.connect(saida || bus); o.start(t); o.stop(t + d + .5);
  }
  function bumbo(t, v){
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + .12);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .005); g.gain.exponentialRampToValueAtTime(.0001, t + .28);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + .3);
  }
  function batida(t, v, tipo){
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = ruido; const caixa = tipo === 'caixa';
    f.type = caixa ? 'bandpass' : 'highpass'; f.frequency.value = caixa ? 1900 : 7200; f.Q.value = caixa ? .8 : .3;
    const dur = caixa ? .16 : .035;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .003); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus); s.start(t, Math.random() * .5); s.stop(t + dur + .02);
    if(caixa){ const o = ac.createOscillator(), go = ac.createGain(); o.type = 'triangle'; o.frequency.value = 190; go.gain.setValueAtTime(.0001, t); go.gain.exponentialRampToValueAtTime(v * .5, t + .004); go.gain.exponentialRampToValueAtTime(.0001, t + .08); o.connect(go); go.connect(bus); o.start(t); o.stop(t + .1); }
  }
  function toca(e, base){
    const t = base + e[0], tipo = e[1];
    if(tipo === 'lead') lead(t, e[2], e[3], e[4]);
    else if(tipo === 'pad') pad(t, e[2], e[3], e[4]);
    else if(tipo === 'baixo') baixo(t, e[2], e[3], e[4]);
    else if(tipo === 'brilho') brilho(t, e[2], e[3], e[4]);
    else if(tipo === 'bumbo') bumbo(t, e[2]);
    else batida(t, e[2], tipo);
  }
  function tick(){
    if(!ac || !musicaOn || ac.state !== 'running') return;
    const ate = ac.currentTime + .8;
    while(true){
      if(i >= ev.length){ i = 0; t0 += VOLTA; }
      if(t0 + ev[i][0] >= ate) break;
      if(t0 + ev[i][0] > ac.currentTime - .05) try{ toca(ev[i], t0); }catch(e){}
      i++;
    }
  }

  /* ---------- os efeitos ---------- */
  /* um estalo de ruído filtrado (passo, pouso, clack do skate) */
  function estalo(t, f, q, dur, v, tipo, saida){
    const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = ruido; fl.type = tipo || 'bandpass'; fl.frequency.value = f; fl.Q.value = q;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(.0002, v), t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(saida || fx); s.start(t, Math.random() * .8); s.stop(t + dur + .03);
  }
  function tom(t, f0, f1, dur, v, tipo, saida, a){
    const o = ac.createOscillator(), g = ac.createGain();
    if(tipo === 'pulso') o.setPeriodicWave(onda); else o.type = tipo || 'sine';
    o.frequency.setValueAtTime(f0, t); if(f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur * .85);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(.0002, v), t + (a || .005)); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(saida || fx); o.start(t); o.stop(t + dur + .03);
    return o;
  }
  /* o passo: cada chão tem o seu */
  const PASSOS = {
    pedra: { f: 2300, q: 1.1, dur: .07, v: .085, tom: 150 },
    grama: { f: 1100, q: .5, dur: .14, v: .06 },
    terra: { f: 820, q: .6, dur: .11, v: .07, tom: 95 },
    madeira: { f: 880, q: 2.4, dur: .1, v: .09, tom: 210 },
    piso: { f: 1650, q: 1.5, dur: .07, v: .075, tom: 175 },
    areia: { f: 3000, q: .4, dur: .17, v: .045 }
  };
  function passo(chao, forca){
    if(!fxOk()) return;
    const P = PASSOS[chao] || PASSOS.pedra, t = ac.currentTime + .004, v = P.v * (forca == null ? 1 : forca) * sorte(.8, 1.15);
    estalo(t, P.f * sorte(.88, 1.12), P.q, P.dur, v);
    if(P.tom) tom(t, P.tom * sorte(.9, 1.1), P.tom * .6, .08, v * .6);
  }
  function pulo(tipo){
    if(!fxOk()) return;
    const t = ac.currentTime + .004;
    if(tipo === 'skate'){ estalo(t, 2600, 2, .05, .12); tom(t, 320, 130, .07, .06, 'triangle'); return; }
    const o = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter();
    o.setPeriodicWave(onda); o.frequency.setValueAtTime(250, t); o.frequency.exponentialRampToValueAtTime(700, t + .13);
    lp.type = 'lowpass'; lp.frequency.value = 2600;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.05, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + .17);
    o.connect(lp); lp.connect(g); g.connect(fx); o.start(t); o.stop(t + .2);
  }
  function cai(forca){
    if(!fxOk()) return;
    const t = ac.currentTime + .004, f = forca == null ? 1 : forca;
    estalo(t, 380, .7, .11, .08 * f, 'lowpass'); tom(t, 82, 48, .09, .09 * f);
  }
  /* a buzina do carro (bi-bi), da moto, a campainha da bike e o bipe do patinete */
  function buzina(tipo, vol){
    if(!fxOk()) return;
    const t = ac.currentTime + .004, k = vol == null ? 1 : Math.max(.05, Math.min(1, vol));
    if(tipo === 'bike'){ [0, .2].forEach(dt => { tom(t + dt, 2350, 2350, .55, .045 * k); tom(t + dt, 3530, 3530, .35, .018 * k); }); return; }
    if(tipo === 'patinete'){ [0, .14].forEach(dt => tom(t + dt, 1320, 1320, .08, .035 * k, 'square')); return; }
    const notas = tipo === 'moto' ? [523, 659] : [392, 494], d = tipo === 'moto' ? .14 : .2, v = .03 * k;
    [0, d + .07].forEach(dt => notas.forEach(f => {
      const o = ac.createOscillator(), g = ac.createGain(), bp = ac.createBiquadFilter();
      o.type = 'square'; o.frequency.value = f; bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = .6;
      g.gain.setValueAtTime(.0001, t + dt); g.gain.exponentialRampToValueAtTime(v, t + dt + .01); g.gain.setValueAtTime(v, t + dt + d - .03); g.gain.exponentialRampToValueAtTime(.0001, t + dt + d);
      o.connect(bp); bp.connect(g); g.connect(fx); o.start(t + dt); o.stop(t + dt + d + .02);
    }));
  }
  /* carro passando perto: o vento e o motor, que cruzam de um lado pro outro e caem de tom (efeito Doppler) */
  function carroPassa(lado, perto){
    if(!fxOk()) return;
    const t = ac.currentTime + .01, p = Math.max(.15, Math.min(1, perto == null ? 1 : perto)), dur = 1.4;
    const pan = ac.createStereoPanner ? ac.createStereoPanner() : null;
    const s = ac.createBufferSource(), bp = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = marrom; s.loop = true; bp.type = 'bandpass'; bp.Q.value = .9;
    bp.frequency.setValueAtTime(320, t); bp.frequency.linearRampToValueAtTime(1150, t + dur * .45); bp.frequency.linearRampToValueAtTime(360, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.07 * p, t + dur * .45); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    const o = ac.createOscillator(), og = ac.createGain(), lp = ac.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(62, t); o.frequency.setValueAtTime(62, t + dur * .42); o.frequency.exponentialRampToValueAtTime(47, t + dur * .6);
    lp.type = 'lowpass'; lp.frequency.value = 320;
    og.gain.setValueAtTime(.0001, t); og.gain.exponentialRampToValueAtTime(.05 * p, t + dur * .45); og.gain.exponentialRampToValueAtTime(.0001, t + dur);
    const fim = pan || fx;
    s.connect(bp); bp.connect(g); g.connect(fim); o.connect(lp); lp.connect(og); og.connect(fim);
    if(pan){ const l = lado < 0 ? -1 : 1; pan.pan.setValueAtTime(-.8 * l, t); pan.pan.linearRampToValueAtTime(.8 * l, t + dur); pan.connect(fx); }
    s.start(t); o.start(t); s.stop(t + dur + .05); o.stop(t + dur + .05);
  }
  /* o motor do teu veículo (contínuo): chama com o tipo e a velocidade (0 parado, 1 no máximo); null desliga */
  let mot = null, motUlt = 0;
  function paraMotor(){
    if(!mot) return; const m = mot; mot = null;
    try{ const t = ac.currentTime; m.g.gain.cancelScheduledValues(t); m.g.gain.setTargetAtTime(.0001, t, .12); setTimeout(() => { m.nos.forEach(n => { try{ n.stop(); }catch(e){} }); clearInterval(m.tic); }, 700); }catch(e){}
  }
  function criaMotor(tipo){
    const g = ac.createGain(); g.gain.value = .0001; g.connect(fx);
    const m = { tipo, g, nos: [], vel: 0 };
    if(tipo === 'carro' || tipo === 'moto' || tipo === 'scooter' || tipo === 'naked'){
      const o1 = ac.createOscillator(), o2 = ac.createOscillator(), lp = ac.createBiquadFilter(), g2 = ac.createGain();
      o1.type = 'sawtooth'; o2.type = tipo === 'carro' ? 'square' : 'sawtooth'; o2.detune.value = tipo === 'carro' ? 1200 : 9; g2.gain.value = tipo === 'carro' ? .25 : .6;
      lp.type = tipo === 'scooter' ? 'bandpass' : 'lowpass'; lp.Q.value = tipo === 'scooter' ? 1.2 : .7;
      /* o pulso dos cilindros: um tremolo na batida do motor */
      const trem = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain(); trem.gain.value = .75; lfo.type = 'square'; lg.gain.value = .25; lfo.connect(lg); lg.connect(trem.gain);
      o1.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(trem); trem.connect(g);
      o1.start(); o2.start(); lfo.start(); m.nos.push(o1, o2, lfo); Object.assign(m, { o1, o2, lp, lfo });
    }else if(tipo === 'patinete'){
      const o = ac.createOscillator(), og = ac.createGain(); o.type = 'sine'; og.gain.value = .35; o.connect(og); og.connect(g);
      const s = ac.createBufferSource(), bp = ac.createBiquadFilter(); s.buffer = marrom; s.loop = true; bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = .8; s.connect(bp); bp.connect(g);
      o.start(); s.start(); m.nos.push(o, s); m.o1 = o;
    }else if(tipo === 'skate' || tipo === 'bike'){
      const s = ac.createBufferSource(), bp = ac.createBiquadFilter(); s.buffer = marrom; s.loop = true; bp.type = 'bandpass'; bp.frequency.value = tipo === 'skate' ? 380 : 650; bp.Q.value = .7; s.connect(bp); bp.connect(g);
      s.start(); m.nos.push(s);
      /* o skate passa nas juntas da calçada (clack); a bike, a catraca girando solta */
      m.tic = setInterval(() => { if(!fxOk() || mot !== m || m.vel < .2) return; const t = ac.currentTime + .01; if(tipo === 'skate'){ if(Math.random() < .5) estalo(t, 1800, 1.4, .04, .05 * m.vel); } else for(let k = 0; k < 3; k++) estalo(t + k * .045, 4200, 3, .015, .018 * m.vel); }, 380);
    }
    return m;
  }
  function motor(tipo, vel){
    if(!ac) return;
    if(!tipo || !fxOk()){ paraMotor(); return; }
    const agora = performance.now(); if(mot && mot.tipo === tipo && agora - motUlt < 90) return; motUlt = agora;
    if(!mot || mot.tipo !== tipo){ paraMotor(); mot = criaMotor(tipo); }
    const v = Math.max(0, Math.min(1, vel || 0)), t = ac.currentTime, m = mot; m.vel = v;
    const alvo = (x, y, tc) => { x.cancelScheduledValues(t); x.setTargetAtTime(y, t, tc || .12); };
    if(tipo === 'carro'){ alvo(m.o1.frequency, 36 + 40 * v); alvo(m.o2.frequency, 36 + 40 * v); alvo(m.lp.frequency, 320 + 520 * v); alvo(m.lfo.frequency, 18 + 20 * v); alvo(m.g.gain, .035 + .04 * v); }
    else if(tipo === 'naked'){ alvo(m.o1.frequency, 62 + 120 * v); alvo(m.o2.frequency, 62 + 120 * v); alvo(m.lp.frequency, 700 + 1300 * v); alvo(m.lfo.frequency, 14 + 26 * v); alvo(m.g.gain, .03 + .045 * v); }
    else if(tipo === 'moto'){ alvo(m.o1.frequency, 52 + 92 * v); alvo(m.o2.frequency, 52 + 92 * v); alvo(m.lp.frequency, 600 + 1000 * v); alvo(m.lfo.frequency, 11 + 20 * v); alvo(m.g.gain, .028 + .04 * v); }
    else if(tipo === 'scooter'){ alvo(m.o1.frequency, 88 + 70 * v); alvo(m.o2.frequency, 88 + 70 * v); alvo(m.lp.frequency, 900 + 700 * v); alvo(m.lfo.frequency, 20 + 16 * v); alvo(m.g.gain, .022 + .03 * v); }
    else if(tipo === 'patinete'){ alvo(m.o1.frequency, 620 + 520 * v); alvo(m.g.gain, v > .05 ? .012 + .022 * v : .0001); }
    else alvo(m.g.gain, v > .05 ? .02 + .045 * v : .0001);
  }
  /* o ambiente: trânsito ao fundo, gente falando, água do lago; passarinho e buzina de longe de vez em quando */
  let amb0 = null, ambNivel = { trafego: .6, passaros: .3, gente: .1, agua: 0 }, ambT = 0;
  function laco(buf, tipo, f, q){ const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = buf; s.loop = true; fl.type = tipo; fl.frequency.value = f; fl.Q.value = q; g.gain.value = .0001; s.connect(fl); fl.connect(g); g.connect(amb); s.start(0, Math.random() * .9); return { s, fl, g }; }
  function montaAmbiente(){
    /* v3.55: voltou pra cidade: o ambiente já existe, mas os passarinhos e as buzinas de longe precisam ser agendados de novo */
    if(amb0){ clearTimeout(ambT); ambT = setTimeout(eventos, 1500); return; }
    const tr = laco(marrom, 'lowpass', 230, .7);
    const ge = laco(ruido, 'bandpass', 900, 1.1), am = ac.createGain(); am.gain.value = .55; ge.fl.disconnect(); ge.fl.connect(am); am.connect(ge.g);
    [3.1, 4.7, 7.3].forEach((f, k) => { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = f; lg.gain.value = .14 + k * .03; l.connect(lg); lg.connect(am.gain); l.start(); });
    const ag = laco(marrom, 'bandpass', 420, .8), lf = ac.createOscillator(), lfg = ac.createGain(); lf.frequency.value = .16; lfg.gain.value = 160; lf.connect(lfg); lfg.connect(ag.fl.frequency); lf.start();
    amb0 = { tr, ge, ag };
    clearTimeout(ambT); ambT = setTimeout(eventos, 1500);
  }
  function ambiente(n){
    if(n) Object.keys(ambNivel).forEach(k => { if(Number.isFinite(n[k])) ambNivel[k] = Math.max(0, Math.min(1, n[k])); });
    if(!ac || !amb0) return;
    const t = ac.currentTime, a = (x, y) => { x.gain.cancelScheduledValues(t); x.gain.setTargetAtTime(Math.max(.0001, y), t, 1.2); };
    a(amb0.tr.g, .11 * ambNivel.trafego); a(amb0.ge.g, .035 * ambNivel.gente); a(amb0.ag.g, .06 * ambNivel.agua);
  }
  function passarinho(){
    const t = ac.currentTime + .02, base = sorte(2600, 3900), n = 2 + Math.floor(Math.random() * 4), v = .03 * (.4 + ambNivel.passaros);
    for(let k = 0; k < n; k++){
      const tt = t + k * sorte(.09, .16), o = ac.createOscillator(), g = ac.createGain(), pan = ac.createStereoPanner ? ac.createStereoPanner() : null;
      o.type = 'sine'; o.frequency.setValueAtTime(base, tt); o.frequency.exponentialRampToValueAtTime(base * sorte(1.2, 1.5), tt + .035); o.frequency.exponentialRampToValueAtTime(base * sorte(.85, 1), tt + .07);
      g.gain.setValueAtTime(.0001, tt); g.gain.exponentialRampToValueAtTime(v, tt + .01); g.gain.exponentialRampToValueAtTime(.0001, tt + .08);
      o.connect(g); if(pan){ pan.pan.value = sorte(-.7, .7); g.connect(pan); pan.connect(amb); } else g.connect(amb);
      o.start(tt); o.stop(tt + .1);
    }
  }
  function buzinaLonge(){
    const t = ac.currentTime + .02, dupla = Math.random() < .5, f = sorte(340, 420);
    [0].concat(dupla ? [.26] : []).forEach(dt => [f, f * 1.26].forEach(fr => {
      const o = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter();
      o.type = 'square'; o.frequency.value = fr; lp.type = 'lowpass'; lp.frequency.value = 900;
      g.gain.setValueAtTime(.0001, t + dt); g.gain.exponentialRampToValueAtTime(.012, t + dt + .02); g.gain.setValueAtTime(.012, t + dt + .16); g.gain.exponentialRampToValueAtTime(.0001, t + dt + .2);
      o.connect(lp); lp.connect(g); g.connect(amb); o.start(t + dt); o.stop(t + dt + .22);
    }));
  }
  /* os eventos do ambiente: cada um no seu tempo, mais passarinho onde tem árvore e mais buzina onde tem trânsito */
  function eventos(){
    clearTimeout(ambT); if(!ac || !amb0) return;
    const s = st(), ok = fxOk() && !s.casa;
    if(ok){
      if(Math.random() < .25 + ambNivel.passaros * .7) try{ passarinho(); }catch(e){}
      if(Math.random() < ambNivel.trafego * .09) try{ buzinaLonge(); }catch(e){}
    }
    ambT = setTimeout(eventos, sorte(1800, 4200) / (.5 + ambNivel.passaros));
  }
  /* o avião (hélice e vento) e o paraquedas */
  let avi = null;
  function aviao(fase){
    if(!ac) return;
    if(fase === 'para' || !fxOk()){ if(avi){ const a = avi; avi = null; try{ const t = ac.currentTime; a.g.gain.cancelScheduledValues(t); a.g.gain.setTargetAtTime(.0001, t, .5); setTimeout(() => a.nos.forEach(n => { try{ n.stop(); }catch(e){} }), 2600); }catch(e){} } return; }
    const t = ac.currentTime;
    if(!avi){
      const g = ac.createGain(); g.gain.value = .0001; g.connect(fx);
      const o1 = ac.createOscillator(), o2 = ac.createOscillator(), lp = ac.createBiquadFilter(), trem = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
      o1.type = 'sawtooth'; o1.frequency.value = 88; o2.type = 'square'; o2.frequency.value = 176; o2.detune.value = 8;
      lp.type = 'lowpass'; lp.frequency.value = 1000; trem.gain.value = .7; lfo.frequency.value = 17; lg.gain.value = .3; lfo.connect(lg); lg.connect(trem.gain);
      const g2 = ac.createGain(); g2.gain.value = .35; o1.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(trem); trem.connect(g);
      const s = ac.createBufferSource(), hp = ac.createBiquadFilter(), sg = ac.createGain(); s.buffer = ruido; s.loop = true; hp.type = 'highpass'; hp.frequency.value = 900; sg.gain.value = .25; s.connect(hp); hp.connect(sg); sg.connect(g);
      o1.start(); o2.start(); lfo.start(); s.start();
      avi = { g, o1, o2, lfo, lp, sg, nos: [o1, o2, lfo, s] };
    }
    const a = avi, alvo = (x, y, tc) => { x.cancelScheduledValues(t); x.setTargetAtTime(y, t, tc || .4); };
    if(fase === 'liga'){ alvo(a.g.gain, .03, .3); alvo(a.o1.frequency, 70); alvo(a.o2.frequency, 140); alvo(a.lfo.frequency, 11); }
    else if(fase === 'decola'){ alvo(a.g.gain, .07, .8); alvo(a.o1.frequency, 108, 1); alvo(a.o2.frequency, 216, 1); alvo(a.lfo.frequency, 23, 1); alvo(a.lp.frequency, 1500, 1); }
    else if(fase === 'voa'){ alvo(a.g.gain, .05, 1.2); alvo(a.o1.frequency, 96, 1.5); alvo(a.o2.frequency, 192, 1.5); }
    else if(fase === 'pula'){ alvo(a.g.gain, .02, 1.5); alvo(a.sg.gain, 1.2, .3); estalo(t + 1.1, 700, .6, .25, .09); }
    else if(fase === 'pousa'){ alvo(a.sg.gain, .2, .6); alvo(a.g.gain, .008, 1.4); }
  }
  /* a moeda (pagou em correal), a porta, o plim de chegada */
  function moeda(){ if(!fxOk()) return; const t = ac.currentTime + .01; brilho(t, midi('B5'), .09, .06, fx); brilho(t + .085, midi('E6'), .3, .06, fx); }
  function porta(){ if(!fxOk()) return; const t = ac.currentTime + .01; estalo(t, 600, 1.8, .12, .07); tom(t, 160, 120, .12, .06, 'triangle'); estalo(t + .14, 520, 1.6, .1, .05); }

  /* ---------- liga, pausa, sai: quem manda é o modo e o estado da cidade ---------- */
  function monta(){ const AC = window.AudioContext || window.webkitAudioContext; if(!AC) return false; ac = new AC(); mesa(); ev = partitura(); return true; }
  function nivela(x, v, tc){ if(!ac || !x) return; const t = ac.currentTime; x.gain.cancelScheduledValues(t); x.gain.setValueAtTime(x.gain.value, t); x.gain.setTargetAtTime(v, t, tc || .8); }
  /* o que deve tocar agora (e em que volume) */
  function confere(){
    if(!ac || !ativo) return;
    const s = st(), pausa = !!s.pausa, querMusica = modoAtual === 'tudo' && !pausa && !s.casa, querFx = modoAtual !== 'mudo' && !pausa;
    const mv = querMusica ? (s.voz ? VOL * VOZ_BAIXA : s.balcao ? VOL * .5 : VOL) : 0;
    nivela(musOut, mv, mv < musOut.gain.value ? .35 : 1.1);
    nivela(fx, querFx ? 1 : 0, .15);
    nivela(amb, querFx ? (s.casa ? .18 : s.balcao ? .35 : 1) : 0, .9);
    if(querMusica && !musicaOn){ musicaOn = true; i = 0; t0 = ac.currentTime + .25; clearInterval(timer); timer = setInterval(tick, 150); tick(); }
    else if(!querMusica && musicaOn){ musicaOn = false; clearInterval(timer); }
    /* v3.55: dentro de casa, de lugar 3D ou do balcão o motor da rua para (o passo da cidade não roda lá e ele ficava zumbindo) */
    if(!querFx || s.casa || s.balcao) paraMotor();
    if(!querFx) aviao('para');
    /* nada pra tocar: o áudio dorme (economiza bateria) */
    if(!querMusica && !querFx){ setTimeout(() => { if(ac && ativo && ac.state === 'running' && (modoAtual === 'mudo' || st().pausa)) ac.suspend().catch(() => {}); }, 1200); }
    else if(ac.state === 'suspended' && !document.hidden) ac.resume().catch(() => {});
    pinta();
  }
  async function acorda(){
    if(!ac && !monta()){ pinta(); return false; }
    try{ await Promise.race([ac.resume(), new Promise(r => setTimeout(r, 900))]); }catch(e){}
    if(ac.state !== 'running'){ espera(); pinta(); return false; }
    esperando = false; montaAmbiente(); ambiente(); confere();
    clearInterval(vigia); vigia = setInterval(confere, 400);
    return true;
  }
  /* o navegador não deixou começar sozinho: o primeiro toque em qualquer lugar da cidade liga */
  function espera(){
    if(esperando) return; esperando = true;
    const vai = () => { document.removeEventListener('pointerdown', vai, true); document.removeEventListener('keydown', vai, true); const ia = esperando; esperando = false; if(ia && ativo && modoAtual !== 'mudo') acorda(); };
    document.addEventListener('pointerdown', vai, true); document.addEventListener('keydown', vai, true);
  }
  function sai(){
    ativo = false; esperando = false; musicaOn = false; clearInterval(timer); clearInterval(vigia); clearTimeout(ambT);
    paraMotor(); aviao('para');
    if(ac){ nivela(musOut, 0, .3); nivela(fx, 0, .2); nivela(amb, 0, .4); }
    estado = null; botoes = [];
    setTimeout(() => { if(!ativo && ac && ac.state === 'running') ac.suspend().catch(() => {}); }, 1500);
  }
  document.addEventListener('visibilitychange', () => {
    if(!ac || !ativo) return;
    if(document.hidden) ac.suspend().catch(() => {});
    else ac.resume().then(() => { if(musicaOn){ t0 = Math.max(t0, ac.currentTime + .1 - (ev[i] ? ev[i][0] : 0)); tick(); } confere(); }).catch(() => {});
  });

  /* ---------- o botão (no alto da cidade e da casa) ---------- */
  let botoes = [];
  const ROT = { tudo: ['Música', 'Música e sons da cidade. Toca pra só os sons.'], fx: ['Só sons', 'Só os sons da cidade, sem música. Toca pra mudo.'], mudo: ['Mudo', 'Sem som. Toca pra música e sons.'] };
  function pinta(){
    botoes = botoes.filter(b => b.isConnected);
    const AC = window.AudioContext || window.webkitAudioContext;
    botoes.forEach(el => {
      if(!AC){ el.hidden = true; return; }
      el.hidden = false;
      const tocando = modoAtual === 'tudo' && musicaOn && ac && ac.state === 'running', r = ROT[modoAtual];
      el.classList.toggle('on', modoAtual !== 'mudo');
      el.setAttribute('aria-pressed', String(modoAtual !== 'mudo'));
      el.title = r[1]; el.setAttribute('aria-label', 'Som: ' + r[0]);
      el.innerHTML = `<span class="cvr-eq" aria-hidden="true">${tocando ? '<i></i><i></i><i></i>' : ico(modoAtual === 'mudo' ? 'mudo' : 'som')}</span><span class="cvr-som-tx">${esperando && modoAtual !== 'mudo' ? 'Toca pra ouvir' : r[0]}</span>`;
    });
  }
  function alterna(){
    modoAtual = modoAtual === 'tudo' ? 'fx' : modoAtual === 'fx' ? 'mudo' : 'tudo'; salvaPref(modoAtual);
    if(modoAtual !== 'mudo' && ativo && (!ac || ac.state !== 'running')) acorda(); else confere();
    pinta(); C.toast(modoAtual === 'tudo' ? 'Música e sons da cidade.' : modoAtual === 'fx' ? 'Só os sons da cidade, sem música.' : 'Sem som.', 1800);
  }
  C.acts['cvr-som'] = () => alterna();

  /* ---------- pros testes: toca num contexto off-line e devolve o pico e o volume médio ---------- */
  async function renderiza(seg, faz){
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext; if(!OAC) return null;
    const salva = [ac, master, bus, musOut, fx, amb, ruido, marrom, onda, ativo, modoAtual, estado, mot, avi, amb0];
    const off = new OAC(2, Math.round(44100 * seg), 44100);
    try{
      ac = off; mesa(); musOut.gain.value = VOL; fx.gain.value = 1; amb.gain.value = 1; ativo = true; modoAtual = 'tudo'; estado = null; mot = null; avi = null; amb0 = null;
      faz();
      const buf = await off.startRendering(), d = buf.getChannelData(0);
      let pk = 0, sq = 0, nan = false; for(let n = 0; n < d.length; n++){ const v = d[n]; if(Number.isNaN(v)){ nan = true; continue; } const a = Math.abs(v); if(a > pk) pk = a; sq += v * v; }
      return { pico: +pk.toFixed(3), rms: +Math.sqrt(sq / d.length).toFixed(4), nan };
    }finally{ clearInterval(mot && mot.tic); [ac, master, bus, musOut, fx, amb, ruido, marrom, onda, ativo, modoAtual, estado, mot, avi, amb0] = salva; }
  }
  async function amostra(seg){
    const r = await renderiza(seg, () => partitura().filter(e => e[0] < seg).forEach(e => toca(e, 0)));
    return r && Object.assign(r, { volta: +VOLTA.toFixed(2), notas: partitura().length });
  }
  /* cada efeito, um depois do outro (o estado "running" do contexto off-line não vale aqui: chama direto) */
  async function amostraFx(){
    const out = {};
    const efeitos = {
      passos: () => Object.keys(PASSOS).forEach((k, j) => { const P = PASSOS[k], t = j * .2; estalo(t, P.f, P.q, P.dur, P.v); if(P.tom) tom(t, P.tom, P.tom * .6, .08, P.v * .6); }),
      pulo: () => { const t = 0; const o = ac.createOscillator(), g = ac.createGain(); o.setPeriodicWave(onda); o.frequency.setValueAtTime(250, t); o.frequency.exponentialRampToValueAtTime(700, t + .13); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.05, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + .17); o.connect(g); g.connect(fx); o.start(t); o.stop(t + .2); estalo(.3, 380, .7, .11, .08, 'lowpass'); tom(.3, 82, 48, .09, .09); },
      buzinas: () => { buzinaCrua(0, 'carro'); buzinaCrua(.6, 'moto'); },
      carro: () => carroPassaCru(0, 1, 1),
      ambiente: () => { montaAmbienteCru(); passarinho(); buzinaLonge(); }
    };
    for(const k of Object.keys(efeitos)) out[k] = await renderiza(k === 'ambiente' ? 2 : 1.6, efeitos[k]);
    return out;
  }
  /* versões sem a trava do "running" (o contexto off-line só roda no startRendering) */
  function buzinaCrua(t, tipo){ const notas = tipo === 'moto' ? [523, 659] : [392, 494], d = .2; notas.forEach(f => { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'square'; o.frequency.value = f; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.03, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(fx); o.start(t); o.stop(t + d + .02); }); }
  function carroPassaCru(t, lado, p){ const s = ac.createBufferSource(), bp = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = marrom; s.loop = true; bp.type = 'bandpass'; bp.frequency.setValueAtTime(320, t); bp.frequency.linearRampToValueAtTime(1150, t + .6); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.07 * p, t + .6); g.gain.exponentialRampToValueAtTime(.0001, t + 1.4); s.connect(bp); bp.connect(g); g.connect(fx); s.start(t); s.stop(t + 1.45); }
  function montaAmbienteCru(){ const tr = laco(marrom, 'lowpass', 230, .7); tr.g.gain.value = .11; const ag = laco(marrom, 'bandpass', 420, .8); ag.g.gain.value = .05; }

  C.versoSom = {
    entra(botao, fn){
      ativo = true; estado = typeof fn === 'function' ? fn : null;
      if(botao){ botoes = botoes.filter(b => b.isConnected && b !== botao); botoes.push(botao); }
      pinta();
      if(modoAtual !== 'mudo') acorda(); else if(ac){ montaAmbiente(); confere(); }
    },
    /* mais um botão de som (o da casa) */
    botao(b){ if(b && !botoes.includes(b)){ botoes.push(b); pinta(); } },
    sai, alterna, modo: () => modoAtual, tocando: () => musicaOn && modoAtual === 'tudo', ativo: () => ativo,
    passo, pulo, cai, buzina, carroPassa, motor, ambiente, aviao, moeda, porta,
    amostra, amostraFx, nome: 'Rua do Corre'
  };
})();
