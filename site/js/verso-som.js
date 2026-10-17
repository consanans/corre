/* CORRE · CORREVERSO · O SOM DA CIDADE (v3.40).
   Tudo aqui é tocado ao vivo no aparelho pelo WebAudio: nada é baixado, nada é gravação de ninguém.
   · A música da cidade (v3.62: o Thales pediu "algo mais música clássica", "jazz"): uma rodada de três, uma depois da
     outra: "Rua do Corre" (o tema original do Corre) em trio de jazz, o Prelúdio em Dó de Bach e o Cânone em Ré de
     Pachelbel (os dois em domínio público, arranjados aqui). Fica baixinha quando tem conversa no mic e pausa dentro
     das casas (lá tocam os discos) e no aquário.
   · Os sons da cidade: passo (muda na calçada, na grama, na madeira do píer, no piso de casa), pulo e aterrissagem,
     carro passando perto, buzina ao longe, passarinho nos parques, gente no Calçadão e na Feira, água no Lago, o motor
     do teu veículo (carro, moto, scooter), a catraca da bike, o zumbido do patinete, o skate rolando, a buzina e a
     campainha, o avião e o paraquedas.
   O botão de som (no alto) troca entre "Música" (tudo), "Só sons" (sem a música) e "Mudo", e o aparelho lembra.
   C.versoSom = { entra(botao, estado), sai(), alterna(), modo(), tocando(), passo(), pulo(), cai(), buzina(),
                  carroPassa(), motor(), ambiente(), aviao(), moeda(), porta(), rio(k), amostra(seg), amostraFx() } */
(function(){
  'use strict';
  const C = window.Corre; if(!C) return;
  const { ico } = C;
  const PREF_K = 'corre-verso-som', VOL = .2, VOZ_BAIXA = .28;
  const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const midi = n => { const m = /^([A-G])([#b]?)(\d)$/.exec(n); return (Number(m[3]) + 1) * 12 + SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); };
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  const sorte = (a, b) => a + Math.random() * (b - a);

  /* ---------- a música ----------
     O tema "Rua do Corre" (16 compassos, A e B): a melodia, compasso por compasso, em colcheias ([nota, colcheias];
     '-' é pausa). Desde a v3.62 ele toca em trio de jazz: vibrafone no tema, piano no acompanhamento e no solo,
     contrabaixo andando e prato de condução, com o balanço do swing */
  const MEL = [
    'C5:1 F5:1 A5:2 G5:1 F5:1 E5:2', 'D5:1 G5:1 B5:2 A5:1 G5:1 D5:2', 'E5:2 G5:1 B5:1 A5:2 G5:2', 'E5:3 C5:1 A4:4',
    'C5:1 F5:1 A5:2 G5:1 A5:1 C6:2', 'B5:2 A5:1 G5:1 F5:2 D5:2', 'E5:1 G5:1 C6:2 B5:1 G5:1 E5:2', 'C5:6 -:2',
    'A4:1 D5:1 F5:2 E5:1 D5:1 A4:2', 'B4:1 D5:1 G5:2 F5:1 D5:1 B4:2', 'C5:1 E5:1 G5:2 A5:2 G5:2', 'E5:4 -:2 C5:1 D5:1',
    'F5:2 E5:1 D5:1 A5:2 F5:2', 'G#5:2 B5:1 G#5:1 E5:4', 'A5:1 G5:1 E5:2 C5:2 E5:2', 'D5:2 G4:1 B4:1 D5:4'
  ];
  const ordena = ev => ev.sort((a, b) => a[0] - b[0]);
  /* 1. "Rua do Corre" em trio de jazz: tema, um coro de solo de piano e o tema de novo, e termina num Dó com nona */
  function jazz(){
    const B = 60 / 128, BARj = 4 * B, E = B / 2, SWj = .34;
    const p8 = (bar, k) => bar * BARj + k * E + (k % 2 ? SWj * E : 0);
    const CH = ['Fmaj7', 'G7', 'Em7', 'Am7', 'Fmaj7', 'G7', 'Cmaj7', 'C6', 'Dm7', 'G7', 'Cmaj7', 'Am7', 'Dm7', 'E7b9', 'Am7', 'G7'];
    /* vozes sem a fundamental (quem faz a fundamental é o baixo), no meio do teclado */
    const VZ = { Fmaj7: ['A3', 'C4', 'E4', 'G4'], G7: ['F3', 'A3', 'B3', 'E4'], Em7: ['G3', 'B3', 'D4', 'F#4'], Am7: ['G3', 'B3', 'C4', 'E4'], Cmaj7: ['E3', 'G3', 'B3', 'D4'], C6: ['E3', 'G3', 'A3', 'D4'], Dm7: ['F3', 'A3', 'C4', 'E4'], E7b9: ['D4', 'F4', 'G#4', 'B4'] };
    const RZ = { Fmaj7: 'F2', G7: 'G2', Em7: 'E2', Am7: 'A2', Cmaj7: 'C3', C6: 'C3', Dm7: 'D2', E7b9: 'E2' };
    const TER = { Fmaj7: 4, G7: 4, Em7: 3, Am7: 3, Cmaj7: 4, C6: 4, Dm7: 3, E7b9: 4 };
    /* a escala do solo: Dó maior; no E7(b9), a menor harmônica (o sol sustenido) */
    const escala = a => { const pc = a === 'E7b9' ? [9, 11, 0, 2, 4, 5, 8] : [0, 2, 4, 5, 7, 9, 11], out = []; for(let m = 60; m <= 83; m++) if(pc.includes(m % 12)) out.push(m); return out; };
    let sd = 11; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    const ev = [], CORO = 3; let nota = 72;
    for(let c = 0; c < CORO; c++) for(let b = 0; b < 16; b++){
      const bar = c * 16 + b, a = CH[b], px = CH[(b + 1) % 16], r = midi(RZ[a]), nr = midi(RZ[px]);
      /* o baixo anda: fundamental, terça, quinta e a nota de passagem pra próxima fundamental */
      [r, r + TER[a], r + 7, nr > r ? nr - 1 : nr + 1].forEach((m, q) => ev.push([bar * BARj + q * B, 'contra', m, B * .92, q ? .22 : .28]));
      /* o piano no ritmo do charleston (no 1 e no "e" do 2) */
      ev.push([p8(bar, 0), 'piano', VZ[a].map(midi), E * 1.3, .05], [p8(bar, 3), 'piano', VZ[a].map(midi), E * 2.8, .045]);
      [0, 2, 3, 4, 6, 7].forEach(k => ev.push([p8(bar, k), 'ride', k % 2 ? .028 : .042]));
      [2, 6].forEach(k => ev.push([p8(bar, k), 'chick', .045]));
      if(c !== 1){ let k = 0; MEL[b].split(' ').forEach(tk => { const [n, q] = tk.split(':'), d = Number(q); if(n !== '-') ev.push([p8(bar, k), 'vibra', midi(n), d * E * .95, .15]); k += d; }); }
      else {
        /* o solo: colcheias que andam pela escala, começando numa nota do acorde e respirando a cada dois compassos */
        const sc = escala(a), alvo = VZ[a].map(n => midi(n) + 12).reduce((x, y) => (Math.abs(y - nota) < Math.abs(x - nota) ? y : x));
        let j = sc.indexOf(sc.reduce((x, y) => (Math.abs(y - alvo) < Math.abs(x - alvo) ? y : x))), dir = rnd() < .5 ? 1 : -1;
        const n8 = b % 2 ? 6 : 8;
        for(let k = 0; k < n8; k++){ ev.push([p8(bar, k), 'piano', [sc[j]], E * .9, k % 2 ? .07 : .085]); nota = sc[j]; if(rnd() < .2) dir = -dir; j += dir * (rnd() < .8 ? 1 : 2); if(j < 2 || j > sc.length - 3) dir = -dir; j = Math.max(0, Math.min(sc.length - 1, j)); }
      }
    }
    const f = CORO * 16 * BARj;
    ev.push([f, 'contra', midi('C2'), BARj * 1.6, .3], [f, 'piano', ['E3', 'G3', 'B3', 'D4', 'A4'].map(midi), BARj * 1.6, .06], [f, 'vibra', midi('C6'), BARj * 1.6, .14], [f, 'ride', .05]);
    return { ev: ordena(ev), volta: f + BARj * 2.2 };
  }
  /* 2. Bach, Prelúdio em Dó (O Cravo Bem Temperado, BWV 846), no piano: cada compasso é um acorde aberto em arpejo */
  function bach(){
    const Q = 60 / 66, S = Q / 4, BARb = 4 * Q;
    const H = ['C3 E3 G3 C4 E4', 'C3 D3 A3 D4 F4', 'B2 D3 G3 D4 F4', 'C3 E3 G3 C4 E4', 'C3 E3 A3 E4 A4', 'C3 D3 F#3 A3 D4', 'B2 D3 G3 D4 G4', 'B2 C3 E3 G3 C4',
      'A2 C3 E3 G3 C4', 'D2 A2 D3 F#3 C4', 'G2 B2 D3 G3 B3', 'G2 Bb2 E3 G3 C#4', 'F2 A2 D3 A3 D4', 'F2 Ab2 D3 F3 B3', 'E2 G2 C3 G3 C4', 'E2 F2 A2 C3 F3',
      'D2 F2 A2 C3 F3', 'G1 D2 G2 B2 F3', 'C2 E2 G2 C3 E3', 'C2 G2 Bb2 C3 E3', 'F1 F2 A2 C3 E3', 'F#1 C2 A2 C3 Eb3', 'Ab1 F2 B2 C3 D3', 'G1 F2 G2 B2 D3',
      'G1 E2 G2 C3 E3', 'G1 D2 G2 C3 F3', 'G1 D2 G2 B2 F3', 'G1 Eb2 A2 C3 F#3', 'G1 E2 G2 C3 G3', 'G1 D2 G2 C3 F3', 'G1 D2 G2 B2 F3', 'C1 C2 G2 Bb2 E3'];
    const ev = [];
    H.forEach((acorde, bar) => {
      const m = acorde.split(' ').map(midi), forte = .8 + .2 * Math.sin(bar / H.length * Math.PI);
      [0, 1].forEach(h => { const t0 = bar * BARb + h * 2 * Q;
        [m[0], m[1], m[2], m[3], m[4], m[2], m[3], m[4]].forEach((n, j) => ev.push([t0 + j * S, 'piano', [n], j === 0 ? 2 * Q : j === 1 ? 2 * Q - S : .7, (j === 0 ? .28 : j === 1 ? .21 : .175) * forte])); });
    });
    const f = H.length * BARb;
    ev.push([f, 'piano', ['C2', 'C3', 'E3', 'G3', 'C4', 'E4'].map(midi), BARb * 1.5, .17]);
    return { ev: ordena(ev), volta: f + BARb * 1.8 };
  }
  /* 3. Pachelbel, Cânone em Ré: o baixo de sempre (ré, lá, si, fá sustenido, sol, ré, sol, lá) no violoncelo e três
     violinos que entram de dois em dois compassos tocando a mesma linha */
  function canon(){
    const Q = 60 / 58, BARc = 4 * Q;
    const BAIXO = ['D3', 'A2', 'B2', 'F#2', 'G2', 'D2', 'G2', 'A2'].map(midi);
    const V1 = 'F#5 E5 D5 C#5 B4 A4 B4 C#5'.split(' ').map(n => [n, 2]), V2 = 'D5 C#5 B4 A4 G4 F#4 G4 E4'.split(' ').map(n => [n, 1]);
    const V3 = 'D4 F#4 A4 G4 F#4 D4 F#4 E4 D4 B3 D4 A4 G4 B4 A4 G4'.split(' ').map(n => [n, .5]);
    const linha = [...V1, ...V2, ...V2, ...V3, ...V3], VOZ = 3, BARS = 2 + 2 * (VOZ - 1) + 12;
    const ev = [];
    for(let q = 0; q < BARS * 4; q++) ev.push([q * Q, 'cello', BAIXO[q % 8], Q * .96, .13]);
    for(let v = 0; v < VOZ; v++){ let t = (2 + 2 * v) * BARc; linha.forEach(([n, d]) => { ev.push([t, 'violino', midi(n), d * Q * .97, .055]); t += d * Q; }); }
    const f = BARS * BARc;
    ev.push([f, 'cello', midi('D2'), BARc * 1.5, .14], [f, 'violino', midi('D4'), BARc * 1.5, .05], [f, 'violino', midi('F#4'), BARc * 1.5, .045], [f, 'violino', midi('A4'), BARc * 1.5, .045], [f, 'violino', midi('D5'), BARc * 1.5, .05]);
    return { ev: ordena(ev), volta: f + BARc * 1.8 };
  }
  /* a rodada: toca uma, respira e entra a outra */
  const FAIXAS = [{ k: 'jazz', nome: 'Rua do Corre, em trio de jazz', faz: jazz }, { k: 'bach', nome: 'Bach · Prelúdio em Dó', faz: bach }, { k: 'canon', nome: 'Pachelbel · Cânone em Ré', faz: canon }];
  let faixas = null, fi = 0;
  const prontas = () => faixas || (faixas = FAIXAS.map(f => Object.assign({ k: f.k, nome: f.nome }, f.faz())));
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
  /* v3.62 · os instrumentos do trio e da orquestrinha */
  /* piano: duas ondas, ataque rápido e o brilho que vai fechando; o grave soa mais tempo que o agudo */
  function piano(t, m, d, v){
    const f = hz(m), o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), g2 = ac.createGain(), lp = ac.createBiquadFilter();
    o.type = 'triangle'; o.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f * 2; o2.detune.value = 4; g2.gain.value = .3;
    const fim = t + Math.min(Math.max(.7, 2.8 - (m - 48) * .035), d + .3);
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(Math.min(9000, f * 9), t); lp.frequency.exponentialRampToValueAtTime(Math.max(320, f * 2), t + 1.1);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .005); g.gain.exponentialRampToValueAtTime(v * .38, t + .22); g.gain.exponentialRampToValueAtTime(.0001, fim);
    o.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(bus);
    o.start(t); o2.start(t); o.stop(fim + .05); o2.stop(fim + .05);
  }
  /* vibrafone: o seno com o brilho de quatro vezes acima, e o tremolo do motor */
  function vibra(t, m, d, v){
    const f = hz(m), o = ac.createOscillator(), o4 = ac.createOscillator(), g = ac.createGain(), g4 = ac.createGain(), tr = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
    o.type = 'sine'; o.frequency.value = f; o4.type = 'sine'; o4.frequency.value = f * 4;
    const fim = t + Math.min(2.4, d + .9);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .004); g.gain.exponentialRampToValueAtTime(.0001, fim);
    g4.gain.setValueAtTime(.0001, t); g4.gain.exponentialRampToValueAtTime(v * .25, t + .003); g4.gain.exponentialRampToValueAtTime(.0001, t + .25);
    tr.gain.value = .78; lfo.frequency.value = 5.2; lg.gain.value = .22; lfo.connect(lg); lg.connect(tr.gain);
    o.connect(g); o4.connect(g4); g.connect(tr); g4.connect(tr); tr.connect(bus);
    o.start(t); o4.start(t); lfo.start(t); o.stop(fim + .05); o4.stop(t + .3); lfo.stop(fim + .05);
  }
  /* contrabaixo: a corda pinçada, grave e redonda */
  function contra(t, m, d, v){
    const f = hz(m), o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), g2 = ac.createGain(), lp = ac.createBiquadFilter();
    o.type = 'sine'; o.frequency.value = f; o2.type = 'triangle'; o2.frequency.value = f; g2.gain.value = .45;
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(380, t + .25);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .012); g.gain.exponentialRampToValueAtTime(v * .45, t + .16); g.gain.exponentialRampToValueAtTime(.0001, t + d + .08);
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(lp); lp.connect(bus);
    o.start(t); o2.start(t); o.stop(t + d + .12); o2.stop(t + d + .12);
  }
  /* prato de condução e o chimbal no pé */
  function prato(t, v, chick){
    const s = ac.createBufferSource(), hp = ac.createBiquadFilter(), bp = ac.createBiquadFilter(), g = ac.createGain(), dur = chick ? .06 : .5;
    s.buffer = ruido; hp.type = 'highpass'; hp.frequency.value = chick ? 6500 : 5200; bp.type = 'peaking'; bp.frequency.value = chick ? 9000 : 7600; bp.gain.value = 6; bp.Q.value = 1.2;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .002); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(hp); hp.connect(bp); bp.connect(g); g.connect(bus); s.start(t, Math.random() * .5); s.stop(t + dur + .02);
  }
  /* cordas: duas serras um pouco desafinadas entre si, o arco que entra devagar e o vibrato que chega depois */
  function corda(t, m, d, v, grave){
    const f = hz(m), o1 = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter(), lfo = ac.createOscillator(), lg = ac.createGain();
    o1.type = 'sawtooth'; o2.type = 'sawtooth'; o1.frequency.value = f; o2.frequency.value = f; o1.detune.value = -6; o2.detune.value = 7;
    lfo.frequency.value = 5.3; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * .005, t + Math.min(.6, d * .6)); lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency);
    lp.type = 'lowpass'; lp.frequency.value = grave ? 850 : 2300; lp.Q.value = .6;
    const at = grave ? .06 : Math.min(.16, d * .3);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + at); g.gain.setValueAtTime(v, t + Math.max(at, d - .05)); g.gain.setTargetAtTime(.0001, t + Math.max(at, d - .05), grave ? .12 : .2);
    o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(bus);
    o1.start(t); o2.start(t); lfo.start(t); o1.stop(t + d + 1); o2.stop(t + d + 1); lfo.stop(t + d + 1);
  }
  function toca(e, base){
    const t = base + e[0], tipo = e[1];
    if(tipo === 'piano'){ e[2].forEach(m => piano(t, m, e[3], e[4])); return; }
    if(tipo === 'vibra') return vibra(t, e[2], e[3], e[4]);
    if(tipo === 'contra') return contra(t, e[2], e[3], e[4]);
    if(tipo === 'ride' || tipo === 'chick') return prato(t, e[2], tipo === 'chick');
    if(tipo === 'violino' || tipo === 'cello') return corda(t, e[2], e[3], e[4], tipo === 'cello');
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
      if(i >= ev.length){ const F = prontas(); t0 += F[fi].volta; fi = (fi + 1) % F.length; ev = F[fi].ev; i = 0; pinta();
        /* trocou de música: o nome aparece rapidinho (na hora em que ela começa a soar) */
        const nome = F[fi].nome, quando = Math.max(0, (t0 + (ev[0] ? ev[0][0] : 0) - ac.currentTime) * 1000);
        setTimeout(() => { if(musicaOn && modoAtual === 'tudo' && !st().pausa && !st().casa) C.toast('♪ ' + nome, 2600); }, quando); }
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
    }else if(tipo === 'rabeta'){
      /* v3.75: o motor de rabeta do barquinho do Tibagi: dois tempos, agudo e picado (o "pé-de-pato" do rio) */
      const o1 = ac.createOscillator(), o2 = ac.createOscillator(), bp = ac.createBiquadFilter(), trem = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
      o1.type = 'sawtooth'; o2.type = 'square'; o2.detune.value = 1200; bp.type = 'bandpass'; bp.Q.value = .9; trem.gain.value = .7; lfo.type = 'square'; lg.gain.value = .3;
      lfo.connect(lg); lg.connect(trem.gain); o1.connect(bp); o2.connect(bp); bp.connect(trem); trem.connect(g);
      o1.start(); o2.start(); lfo.start(); m.nos.push(o1, o2, lfo); Object.assign(m, { o1, o2, lp: bp, lfo });
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
    else if(tipo === 'rabeta'){ alvo(m.o1.frequency, 92 + 70 * v); alvo(m.o2.frequency, 92 + 70 * v); alvo(m.lp.frequency, 700 + 900 * v); alvo(m.lfo.frequency, 26 + 18 * v); alvo(m.g.gain, v > .04 ? .014 + .03 * v : .0001); }
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
  /* v3.57 · a ACEL: o estalo do taco (mais forte, mais seco), a bola na luva do catcher e o taikô do home run */
  function taco(forca){ if(!fxOk()) return; const t = ac.currentTime + .004, f = Math.max(.3, Math.min(1, forca || 1)); estalo(t, 2400, 1.2, .05, .16 * f); estalo(t, 900, .9, .09, .1 * f); tom(t, 1150, 600, .06, .07 * f, 'triangle'); }
  function luva(){ if(!fxOk()) return; const t = ac.currentTime + .004; estalo(t, 520, .8, .07, .12, 'lowpass'); tom(t, 140, 90, .06, .08); }
  function taiko(n){ if(!fxOk()) return; const t = ac.currentTime + .02; for(let i = 0; i < (n || 1); i++){ const ti = t + i * .32; tom(ti, 110, 52, .5, .2); estalo(ti, 180, .7, .16, .12, 'lowpass'); } }
  /* v3.58 · o minijogo das tarefas: o plim curto do acerto e o tum do erro */
  function acerto(){ if(!fxOk()) return; const t = ac.currentTime + .005; brilho(t, midi('A5'), .1, .045, fx); }
  function erro(){ if(!fxOk()) return; const t = ac.currentTime + .005; tom(t, 190, 110, .16, .06, 'triangle'); estalo(t, 300, .8, .08, .05, 'lowpass'); }
  /* v3.75 · os sons da pesca no Tibagi: o zunido da linha e o plop da boia, a beliscada, a fisgada, a catraca do
     molinete, a piapara correndo, o tchibum de quando ela pula e a linha arrebentando */
  function rio(k){
    if(!fxOk()) return; const t = ac.currentTime + .005;
    if(k === 'lanca'){ const s = ac.createBufferSource(), bp = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = ruido; bp.type = 'bandpass'; bp.Q.value = 2; bp.frequency.setValueAtTime(500, t); bp.frequency.exponentialRampToValueAtTime(2600, t + .3);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.05, t + .08); g.gain.exponentialRampToValueAtTime(.0001, t + .34); s.connect(bp); bp.connect(g); g.connect(fx); s.start(t); s.stop(t + .4); return; }
    if(k === 'plop'){ tom(t, 520, 190, .1, .05); estalo(t, 700, .8, .08, .04, 'lowpass'); return; }
    if(k === 'belisca'){ tom(t, 640, 330, .05, .025); return; }
    if(k === 'fisga'){ estalo(t, 900, .5, .26, .1, 'lowpass'); tom(t, 170, 70, .2, .06); return; }
    if(k === 'clique'){ estalo(t, 3800, 4, .014, .03); return; }
    if(k === 'corre'){ for(let i = 0; i < 6; i++) estalo(t + i * .03, 3200, 3, .012, .03); return; }
    if(k === 'tchibum'){ estalo(t, 1100, .4, .4, .13, 'lowpass'); tom(t, 210, 60, .3, .07); estalo(t + .12, 2200, .7, .25, .05); return; }
    if(k === 'arrebenta'){ estalo(t, 2600, 6, .03, .12); tom(t, 900, 260, .12, .05, 'triangle'); return; }
    erro();
  }
  function porta(){ if(!fxOk()) return; const t = ac.currentTime + .01; estalo(t, 600, 1.8, .12, .07); tom(t, 160, 120, .12, .06, 'triangle'); estalo(t + .14, 520, 1.6, .1, .05); }

  /* ---------- liga, pausa, sai: quem manda é o modo e o estado da cidade ---------- */
  function monta(){ const AC = window.AudioContext || window.webkitAudioContext; if(!AC) return false; ac = new AC(); mesa(); ev = prontas()[fi].ev; return true; }
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
      el.title = tocando && faixas ? `Tocando: ${faixas[fi].nome}. ${r[1]}` : r[1]; el.setAttribute('aria-label', 'Som: ' + r[0]);
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
      return { pico: +pk.toFixed(3), rms: +Math.sqrt(sq / d.length).toFixed(4), nan, _buf: buf };
    }finally{ clearInterval(mot && mot.tic); [ac, master, bus, musOut, fx, amb, ruido, marrom, onda, ativo, modoAtual, estado, mot, avi, amb0] = salva; }
  }
  /* uma faixa (0 jazz, 1 Bach, 2 Pachelbel), os primeiros "seg" segundos */
  async function amostra(seg, n){
    const F = prontas()[n || 0], r = await renderiza(seg, () => F.ev.filter(e => e[0] < seg).forEach(e => toca(e, 0)));
    if(!r) return r;
    /* com "wav": o trecho em WAV (mono, 22 kHz, 16 bits, em base64), pra ouvir fora do app */
    let wav = '';
    if(arguments[2]){
      const d = r._buf.getChannelData(0), n2 = Math.floor(d.length / 2), dv = new DataView(new ArrayBuffer(44 + n2 * 2)), w = (o, t) => [...t].forEach((ch, k) => dv.setUint8(o + k, ch.charCodeAt(0)));
      w(0, 'RIFF'); dv.setUint32(4, 36 + n2 * 2, true); w(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, 22050, true); dv.setUint32(28, 44100, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); w(36, 'data'); dv.setUint32(40, n2 * 2, true);
      for(let k = 0; k < n2; k++){ const v = Math.max(-1, Math.min(1, (d[2 * k] + d[2 * k + 1]) / 2 * 3)); dv.setInt16(44 + k * 2, v * 32767, true); }
      const u = new Uint8Array(dv.buffer); let bin = ''; for(let k = 0; k < u.length; k += 32768) bin += String.fromCharCode.apply(null, u.subarray(k, k + 32768)); wav = btoa(bin);
    }
    delete r._buf;
    return Object.assign(r, { volta: +F.volta.toFixed(2), notas: F.ev.length, nome: F.nome }, wav ? { wav } : {});
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
    passo, pulo, cai, buzina, carroPassa, motor, ambiente, aviao, moeda, porta, taco, luva, taiko, acerto, erro, rio,
    amostra, amostraFx, faixas: () => prontas().map(f => f.nome), faixa: () => prontas()[fi].nome
  };
})();
