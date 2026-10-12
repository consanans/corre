/* CORRE · ROLO 360 · A TRILHA (v3.38): música clássica tocando baixinho enquanto o rolo passa.
   Só obra em domínio público, tocada ao vivo no aparelho pelo WebAudio (nada é baixado, nada é gravação de ninguém):
   J. S. Bach, Prelúdio em Dó maior (BWV 846, 1722) e Johann Pachelbel, Cânone em Ré (c. 1700), uma depois da outra.
   Começa sozinha quando a sala abre (se o navegador deixar; senão, no primeiro toque), some quando você sai do Rolo e
   lembra se você desligou. C.roloSom = { entra(el), sai(), alterna(), tocando() } */
(function(){
  'use strict';
  const C = window.Corre; if(!C) return;
  const { esc, ico } = C;
  const PREF_K = 'corre-rolo-som', VOL = .36;
  const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const midi = n => { const m = /^([A-G])([#b]?)(\d)$/.exec(n); return (Number(m[3]) + 1) * 12 + SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); };
  const notas = s => s.trim().split(/\s+/).map(midi);
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);

  /* ---------- as peças (evento = [segundo, nota MIDI, duração, intensidade, voz, pan]) ---------- */
  /* Bach: cada compasso é um acorde de cinco notas quebrado do mesmo jeito (duas notas presas embaixo, três correndo em
     cima), duas vezes por compasso */
  const BACH = ['C4 E4 G4 C5 E5', 'C4 D4 A4 D5 F5', 'B3 D4 G4 D5 F5', 'C4 E4 G4 C5 E5', 'C4 E4 A4 E5 A5', 'C4 D4 F#4 A4 D5', 'B3 D4 G4 D5 G5', 'B3 C4 E4 G4 C5',
    'A3 C4 E4 G4 C5', 'D3 A3 D4 F#4 C5', 'G3 B3 D4 G4 B4', 'G3 Bb3 E4 G4 C#5', 'F3 A3 D4 A4 D5', 'F3 Ab3 D4 F4 B4', 'E3 G3 C4 G4 C5', 'E3 F3 A3 C4 F4',
    'D3 F3 A3 C4 F4', 'G2 D3 G3 B3 F4', 'C3 E3 G3 C4 E4', 'C3 G3 Bb3 C4 E4', 'F2 F3 A3 C4 E4', 'F#2 C3 A3 C4 Eb4', 'Ab2 F3 B3 C4 D4', 'G2 F3 G3 B3 D4',
    'G2 E3 G3 C4 E4', 'G2 D3 G3 C4 F4', 'G2 D3 G3 B3 F4', 'G2 Eb3 A3 C4 F#4', 'G2 E3 G3 C4 G4', 'G2 D3 G3 C4 F4', 'G2 D3 G3 B3 F4', 'C2 C3 G3 Bb3 E4'];
  function bach(){
    const ev = []; let t = .2;
    const hum = () => (Math.random() - .5) * .014;
    BACH.forEach((s, i) => {
      const n = notas(s), s16 = .25 * (i >= 29 ? 1 + (i - 28) * .05 : 1);
      for(let h = 0; h < 2; h++){
        const a = t + h * 8 * s16;
        ev.push([a, n[0], 8 * s16, .5, 'p', 0], [a + s16 + hum(), n[1], 7 * s16, .4, 'p', -.1]);
        [2, 3, 4, 2, 3, 4].forEach((k, j) => ev.push([a + (2 + j) * s16 + hum(), n[k], s16 * 1.7, j === 0 || j === 3 ? .36 : .31, 'p', .12]));
      }
      t += 16 * s16;
    });
    /* os dois compassos que fecham, sobre o Dó grave, e o acorde final */
    const s16 = .25 * 1.25;
    [['C2 C3', 'F3 A3 C4 F4 C4 A3 C4 A3 F3 A3 F3 D3 F3 D3'], ['C2 B2', 'G4 B4 D5 F5 D5 B4 D5 B4 G4 B4 D4 F4 E4 D4']].forEach(([b, r]) => {
      const B = notas(b), R = notas(r);
      ev.push([t, B[0], 16 * s16, .5, 'p', 0], [t + s16, B[1], 15 * s16, .4, 'p', -.1]);
      R.forEach((m, j) => ev.push([t + (2 + j) * s16 + hum(), m, s16 * 1.7, .31, 'p', .12]));
      t += 16 * s16;
    });
    notas('C2 C3 E4 G4 C5').forEach((m, j) => ev.push([t + j * .045, m, 5.5, j ? .34 : .46, 'p', 0]));
    return { nome: 'Bach', obra: 'Prelúdio em Dó maior', ev, dur: t + 7 };
  }
  /* Pachelbel: o baixo de oito notas não para; três violinos tocam a mesma melodia, cada um entrando dois compassos
     depois do outro (é isso que faz o cânone) */
  function canone(){
    const ev = [], beat = 1.02, BX = notas('D3 A2 B2 F#2 G2 D2 G2 A2');
    const V = [notas('F#5 E5 D5 C#5 B4 A4 B4 C#5').map(m => [m, 1]), notas('D5 C#5 B4 A4 G4 F#4 G4 E4').map(m => [m, 1]),
      notas('D4 F#4 A4 G4 F#4 D4 F#4 E4 D4 B3 D4 A4 G4 B4 A4 G4').map(m => [m, .5])];
    const SEQ = [0, 1, 2, 0, 1, 2], PAN = [-.38, .38, 0], VOZES = 3, CICLOS = 1 + SEQ.length + VOZES - 1;
    let t = .2;
    for(let c = 0; c < CICLOS; c++){
      BX.forEach((m, k) => ev.push([t + k * beat, m, beat * 1.05, .42, 'b', 0]));
      for(let v = 0; v < VOZES; v++){
        const q = c - 1 - v; if(q < 0 || q >= SEQ.length) continue;
        let x = t; V[SEQ[q]].forEach(([m, d]) => { ev.push([x, m, d * beat * .98, v === 2 ? .085 : .075, 'c', PAN[v]]); x += d * beat; });
      }
      t += 8 * beat;
    }
    notas('D2 D3 A3 D4 F#4 A4').forEach((m, j) => ev.push([t + j * .05, m, 5, j < 2 ? .4 : .07, j < 2 ? 'b' : 'c', j % 2 ? .3 : -.3]));
    return { nome: 'Pachelbel', obra: 'Cânone em Ré', ev, dur: t + 6.5 };
  }
  const PECAS = [bach, canone];

  /* ---------- o som ---------- */
  let ac = null, bus = null, saida = null, timer = 0, ev = [], i = 0, t0 = 0, dur = 0, peca = 0, atual = null;
  let ligado = false, esperando = false, el = null;
  const pref = () => { try{ return localStorage.getItem(PREF_K) !== '0'; }catch(e){ return true; } };
  const setPref = v => { try{ localStorage.setItem(PREF_K, v ? '1' : '0'); }catch(e){} };
  function impulso(seg){
    const n = Math.floor(ac.sampleRate * seg), b = ac.createBuffer(2, n, ac.sampleRate);
    for(let c = 0; c < 2; c++){ const d = b.getChannelData(c); for(let k = 0; k < n; k++) d[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / n, 2.8); }
    return b;
  }
  function monta(){
    const AC = window.AudioContext || window.webkitAudioContext; if(!AC) return false;
    ac = new AC(); monta2();
    return true;
  }
  const pan = (no, p) => { if(!p || !ac.createStereoPanner) return no; const s = ac.createStereoPanner(); s.pan.value = p; no.connect(s); return s; };
  /* piano macio: triângulo com a oitava em cima, brilho que fecha devagar */
  function piano(t, m, d, v, p){
    const f = hz(m), o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), g2 = ac.createGain(), lp = ac.createBiquadFilter();
    o.type = 'triangle'; o.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f * 2.002; g2.gain.value = .2;
    lp.type = 'lowpass'; lp.Q.value = .3; lp.frequency.setValueAtTime(Math.min(7200, f * 8), t); lp.frequency.exponentialRampToValueAtTime(Math.max(420, f * 2.2), t + 1.6);
    const pk = v * (m < 52 ? 1 : .82), solta = t + Math.max(d, .38), fim = solta + 2.2;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(pk, t + .012); g.gain.exponentialRampToValueAtTime(pk * .42, t + .36); g.gain.setTargetAtTime(.0001, solta, .5);
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(lp); pan(lp, p).connect(bus);
    o.start(t); o2.start(t); o.stop(fim); o2.stop(fim);
  }
  /* violino: serra filtrada com vibrato que chega devagar */
  function corda(t, m, d, v, p){
    const f = hz(m), o = ac.createOscillator(), lfo = ac.createOscillator(), lg = ac.createGain(), g = ac.createGain(), lp = ac.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.value = f; lfo.frequency.value = 5.2;
    lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * .004, t + Math.min(.5, d * .6)); lfo.connect(lg); lg.connect(o.frequency);
    lp.type = 'lowpass'; lp.frequency.value = Math.min(2600, f * 3); lp.Q.value = .5;
    const a = Math.min(.16, d * .3), fim = t + d + 1.2;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.setValueAtTime(v, t + Math.max(a, d - .04)); g.gain.setTargetAtTime(.0001, t + d, .2);
    o.connect(lp); lp.connect(g); pan(g, p).connect(bus);
    o.start(t); lfo.start(t); o.stop(fim); lfo.stop(fim);
  }
  /* o baixo do cânone: triângulo redondo com o seno uma oitava abaixo */
  function baixo(t, m, d, v){
    const f = hz(m), o = ac.createOscillator(), s = ac.createOscillator(), g = ac.createGain(), gs = ac.createGain(), lp = ac.createBiquadFilter();
    o.type = 'triangle'; o.frequency.value = f; s.type = 'sine'; s.frequency.value = f / 2; gs.gain.value = .35;
    lp.type = 'lowpass'; lp.frequency.value = 900;
    const fim = t + d + 1.4;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .06); g.gain.setTargetAtTime(v * .7, t + .1, .4); g.gain.setTargetAtTime(.0001, t + d, .3);
    o.connect(g); s.connect(gs); gs.connect(g); g.connect(lp); lp.connect(bus);
    o.start(t); s.start(t); o.stop(fim); s.stop(fim);
  }
  function toca(e, base){
    const [t, m, d, v, voz, p] = e, q = base + t, vel = v * (.92 + Math.random() * .16);
    if(voz === 'p') piano(q, m, d, vel, p); else if(voz === 'c') corda(q, m, d, vel, p); else baixo(q, m, d, vel);
  }
  function carrega(quando){ atual = PECAS[peca](); ev = atual.ev; dur = atual.dur; i = 0; t0 = quando; pinta(); }
  function tick(){
    if(!ac || !ligado || ac.state !== 'running') return;
    const ate = ac.currentTime + .9;
    while(i < ev.length && t0 + ev[i][0] < ate){ try{ toca(ev[i], t0); }catch(e){} i++; }
    if(i >= ev.length && ac.currentTime > t0 + dur){ peca = (peca + 1) % PECAS.length; carrega(ac.currentTime + 1.5); }
  }

  /* ---------- liga, pausa, sai ---------- */
  async function liga(){
    if(!ac && !monta()){ pinta(); return false; }
    ligado = true;
    try{ await ac.resume(); }catch(e){}
    if(ac.state !== 'running'){ ligado = false; espera(); pinta(); return false; }
    esperando = false;
    if(!atual || i >= ev.length) carrega(ac.currentTime + .25);
    saida.gain.cancelScheduledValues(ac.currentTime); saida.gain.setValueAtTime(saida.gain.value, ac.currentTime); saida.gain.setTargetAtTime(VOL, ac.currentTime, 1.1);
    clearInterval(timer); timer = setInterval(tick, 150); tick(); pinta();
    return true;
  }
  /* pausa: o som apaga e o relógio do áudio para no lugar (volta de onde parou) */
  function pausa(){
    ligado = false; pinta();
    if(!ac) return;
    saida.gain.cancelScheduledValues(ac.currentTime); saida.gain.setValueAtTime(saida.gain.value, ac.currentTime); saida.gain.setTargetAtTime(0, ac.currentTime, .25);
    setTimeout(() => { if(!ligado && ac && ac.state === 'running') ac.suspend().catch(() => {}); }, 1100);
  }
  /* o navegador não deixou começar sozinho: o primeiro toque em qualquer lugar da sala liga */
  function espera(){
    if(esperando) return; esperando = true;
    const vai = () => { document.removeEventListener('pointerdown', vai, true); document.removeEventListener('keydown', vai, true); if(esperando && el && el.isConnected && pref()) liga(); esperando = false; };
    document.addEventListener('pointerdown', vai, true); document.addEventListener('keydown', vai, true);
  }
  function sai(){
    esperando = false; clearInterval(timer);
    if(ac){ saida.gain.cancelScheduledValues(ac.currentTime); saida.gain.setValueAtTime(saida.gain.value, ac.currentTime); saida.gain.setTargetAtTime(0, ac.currentTime, .3); }
    ligado = false; atual = null; ev = []; i = 0; peca = 0; el = null;
    setTimeout(() => { if(!ligado && ac && ac.state === 'running') ac.suspend().catch(() => {}); }, 1500);
  }
  document.addEventListener('visibilitychange', () => {
    if(!ac || !ligado) return;
    if(document.hidden) ac.suspend().catch(() => {}); else ac.resume().then(tick).catch(() => {});
  });

  /* ---------- o botão (no alto da sala) ---------- */
  function pinta(){
    if(!el || !el.isConnected) return;
    const P = atual || { nome: 'Bach', obra: 'Prelúdio em Dó maior' };
    const sem = !(window.AudioContext || window.webkitAudioContext);
    el.innerHTML = sem ? '' : `<button type="button" class="r-som-b${ligado ? ' on' : ''}" data-act="rolo-som" aria-pressed="${ligado}" title="${ligado ? 'Desligar a música' : 'Ligar a música'}">
      <span class="r-eq" aria-hidden="true">${ligado ? '<i></i><i></i><i></i><i></i>' : ico('mudo')}</span>
      <span class="r-som-tx"><b>${ligado ? esc(P.nome) : esperando ? 'Toca pra ouvir' : 'Música desligada'}</b><small>${esc(ligado || esperando ? P.obra : 'Bach e Pachelbel')}</small></span></button>`;
  }
  C.acts['rolo-som'] = () => { if(ligado){ setPref(false); pausa(); } else { setPref(true); esperando = false; liga(); } };
  /* pros testes: toca os primeiros segundos de uma peça num contexto off-line e devolve o pico e o volume médio */
  async function amostra(k, seg){
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext; if(!OAC) return null;
    const salva = [ac, bus, saida], off = new OAC(2, Math.round(44100 * seg), 44100);
    try{
      ac = off; monta2();
      saida.gain.value = VOL;
      PECAS[k || 0]().ev.filter(e => e[0] < seg).forEach(e => toca(e, 0));
      const buf = await off.startRendering(), d = buf.getChannelData(0);
      let pk = 0, sq = 0; for(let n = 0; n < d.length; n++){ const v = Math.abs(d[n]); if(v > pk) pk = v; sq += d[n] * d[n]; }
      return { pico: +pk.toFixed(3), rms: +Math.sqrt(sq / d.length).toFixed(4), nan: d.some(Number.isNaN) };
    }finally{ [ac, bus, saida] = salva; }
  }
  /* a mesma mesa de som, montada num contexto que já existe (o off-line) */
  function monta2(){
    saida = ac.createGain(); saida.gain.value = 0;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -20; comp.knee.value = 18; comp.ratio.value = 3;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 6000;
    const seco = ac.createGain(), molhado = ac.createGain(), rev = ac.createConvolver();
    seco.gain.value = .78; molhado.gain.value = .34; rev.buffer = impulso(3.4);
    bus = ac.createGain();
    bus.connect(seco); bus.connect(rev); rev.connect(molhado);
    seco.connect(lp); molhado.connect(lp); lp.connect(comp); comp.connect(saida); saida.connect(ac.destination);
  }
  C.roloSom = {
    entra(box){ el = box; pinta(); if(pref() && !ligado) liga(); },
    sai, alterna: () => C.acts['rolo-som'](), tocando: () => ligado, peca: () => atual && atual.nome, amostra
  };
})();
