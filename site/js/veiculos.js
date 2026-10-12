/* CORRE · CORREVERSO · A GARAGEM (v3.40)
   Como você anda pela cidade: a pé, de skate, patinete, bike, scooter, moto ou carro. A frota tem a cara da rua de
   hoje (bike urbana, patinete elétrico, scooter 125, a moto 160 de entrega, a naked 300, o hatch, o SUV compacto e a
   picape), mas os modelos, os nomes e o desenho são do Corre: nada de marca de montadora. Tudo de graça; cada um tem a
   sua velocidade, o seu som e o seu botão (de moto e de carro, o botão de pular vira buzina; de moto, vai de capacete).
   O desenho é em pixel, nas quatro vistas (de lado, de frente, de costas), no mesmo ponto do boneco: o veículo pinta a
   parte de trás antes do boneco e a da frente depois (o carro por cima, com o vidro deixando ver quem dirige).
   Aqui também moram o avião (o do Aeroporto de Londrina, pro voo pago em correal) e o paraquedas.
   C.veiculos = { LISTA, porK(k), CORES, cor(k, i), desenha(pv, k, o, camada), pose(k, vista), aviao(pv, o), sombraAviao(pv),
                  paraquedas(pv, o), garagem() } */
(function(){
  'use strict';
  const C = window.Corre; if(!C) return;
  const { esc, ico } = C;
  const INK = '#141619', PNEU = '#16181D', ARO = '#8E949C', CUBO = '#D4D8DE', FAROL = '#FFF3C4', LANT = '#FF4A3D', SETA = '#FF8A3D', PLACA = '#F4F3EF';
  const VIDRO = 'rgba(190,215,240,.2)', VIDRO_OP = '#2A3442', CLAD = '#2B2F38', DENTRO = '#2E3644';

  /* as cores da garagem (sem verde: o Corre não sugere verde) */
  const CORES = [['Vermelho', '#E2412E'], ['Azul', '#2E5BFF'], ['Branco', '#EEEBE4'], ['Preto', '#1F2228'], ['Prata', '#A4A8AE'], ['Amarelo', '#F2C230'], ['Laranja', '#FF8A3D'], ['Rosa', '#FF4F9A'], ['Lilás', '#9B7BE0'], ['Vinho', '#7A2238'], ['Areia', '#D9C29A']];
  const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  /* f > 0 clareia, f < 0 escurece */
  const tom = (h, f) => { const c = v => Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f))); return '#' + hexRgb(h).map(v => c(v).toString(16).padStart(2, '0')).join(''); };

  /* ---------- pixel: linha, roda ---------- */
  function linha(pv, x0, y0, x1, y1, c){
    let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1, err = dx + dy;
    for(let n = 0; n < 90; n++){ pv(x0, y0, 1, 1, c); if(x0 === x1 && y0 === y1) return; const e2 = 2 * err; if(e2 >= dy){ err += dy; x0 += sx; } if(e2 <= dx){ err += dx; y0 += sy; } }
  }
  const MASC = {};
  function mascara(r, th){
    const k = r + ':' + th; if(MASC[k]) return MASC[k];
    const out = []; for(let j = -r; j <= r; j++) for(let i = -r; i <= r; i++){ const d = Math.hypot(i, j); if(d <= r + .45) out.push([i, j, d > r - th ? 'p' : d > r - th - 1.05 ? 'a' : d < .75 ? 'c' : 'v']); }
    return (MASC[k] = out);
  }
  /* a roda de lado, girando (raios na bike, roda de liga na moto, calota no carro) */
  function roda(pv, cx, cy, r, th, giro, tipo){
    const bike = tipo === 'bike', carro = tipo === 'carro';
    mascara(r, th).forEach(([i, j, k]) => { if(k === 'v'){ if(carro) pv(cx + i, cy + j, 1, 1, '#3A3F48'); return; } pv(cx + i, cy + j, 1, 1, k === 'p' ? PNEU : k === 'a' ? (bike ? '#C9CED6' : ARO) : CUBO); });
    const n = bike ? 3 : carro ? 1 : 3, a = giro || 0;
    for(let s = 0; s < n; s++){ const an = a + s * Math.PI * 2 / (bike ? 6 : 3); for(let q = 1; q < r - th + (carro ? 0 : .5); q++){ pv(cx + Math.round(Math.cos(an) * q), cy + Math.round(Math.sin(an) * q), 1, 1, carro ? CUBO : bike ? '#C9CED6' : ARO); if(bike) pv(cx - Math.round(Math.cos(an) * q), cy - Math.round(Math.sin(an) * q), 1, 1, '#C9CED6'); } }
  }
  /* o braço que vai do ombro até a manopla (de lado, em bike, patinete e moto) */
  function braco(pv, o, ox, oy, mx, my){ const R = (o.ri && o.ri.R) || '#3C4450', M = (o.ri && o.ri.MAO) || '#C68B59', ex = Math.round((ox + mx) / 2), ey = Math.max(oy, my) - 1; linha(pv, ox, oy, ex, ey, R); linha(pv, ox + 1, oy, ex + 1, ey, R); linha(pv, ex, ey, mx - 1, my, R); pv(mx, my, 1, 1, M); }

  /* ---------- a frota ---------- */
  const LISTA = [
    { k: 'skate', nome: 'Skate', seg: 'shape de rua', tipo: 'skate', vel: 1.5, som: 'skate', botao: 'pula', cor: 7 },
    { k: 'patinete', nome: 'Patinete', seg: 'patinete elétrico', tipo: 'patinete', vel: 1.45, som: 'patinete', botao: 'pula', cor: 3 },
    { k: 'bike', nome: 'Magrela', seg: 'bike urbana', tipo: 'bike', vel: 1.65, som: 'bike', botao: 'pula', buzina: 'bike', cor: 5 },
    { k: 'scooter', nome: 'Brisa 125', seg: 'scooter', tipo: 'scooter', vel: 1.9, som: 'scooter', botao: 'buzina', buzina: 'moto', capacete: true, cor: 8 },
    { k: 'moto', nome: 'Corre 160', seg: 'moto de rua', tipo: 'moto', vel: 2.1, som: 'moto', botao: 'buzina', buzina: 'moto', capacete: true, cor: 0 },
    { k: 'naked', nome: 'Faísca 300', seg: 'naked 300', tipo: 'naked', vel: 2.4, som: 'naked', botao: 'buzina', buzina: 'moto', capacete: true, cor: 1 },
    { k: 'hatch', nome: 'Pé-Vermelho', seg: 'hatch', tipo: 'carro', vel: 2.15, som: 'carro', botao: 'buzina', buzina: 'carro', cor: 0,
      M: { L: 20, W: 13, yb: 13, yr: 24, xr0: -18, xr1: -14, xf1: 3, xf0: 9, rodas: [-13, 12], pilar: [-4], porta: -3 } },
    { k: 'suv', nome: 'Palhano', seg: 'SUV compacto', tipo: 'carro', vel: 2.2, som: 'carro', botao: 'buzina', buzina: 'carro', cor: 4,
      M: { L: 21, W: 14, yb: 14, yr: 26, xr0: -20, xr1: -19, xf1: 4, xf0: 10, rodas: [-14, 13], pilar: [-4, -12], porta: -3, rack: true, clad: true } },
    { k: 'picape', nome: 'Cafeeira', seg: 'picape', tipo: 'carro', vel: 2.0, som: 'carro', botao: 'buzina', buzina: 'carro', cor: 9,
      M: { L: 22, W: 14, yb: 13, yr: 25, xr0: -5, xr1: -4, xf1: 5, xf0: 11, rodas: [-15, 13], pilar: [], porta: -1, cacamba: true } }
  ];
  const POR = {}; LISTA.forEach(v => { POR[v.k] = v; });
  const porK = k => POR[k] || null;
  const cor = (k, i) => { const v = POR[k]; const n = Number.isInteger(i) && i >= 0 && i < CORES.length ? i : v ? v.cor : 0; return CORES[n][1]; };

  /* onde o boneco fica em cada veículo: quanto sobe (pés no pedal, no pedaleiro, no assoalho), quanto anda pro lado
     (no carro, quem dirige fica atrás do vidro da frente), se pedala (as pernas mexem) e se o braço vai na manopla */
  function pose(k, vista){
    const v = POR[k]; if(!v) return { sobe: 0, rx: 0, pedala: false, braco: true };
    const lado = vista === 'lado';
    switch(v.tipo){
      case 'skate': return { sobe: 2, rx: 0, pedala: false, braco: true };
      case 'patinete': return { sobe: 3, rx: lado ? -1 : 0, pedala: false, braco: !lado };
      case 'bike': return { sobe: 4, rx: lado ? -3 : 0, pedala: true, braco: !lado };
      case 'scooter': return { sobe: 5, rx: lado ? -3 : 0, pedala: false, braco: !lado };
      case 'moto': case 'naked': return { sobe: 6, rx: lado ? -4 : 0, pedala: false, braco: !lado };
      case 'carro': return { sobe: 1, rx: lado ? 1 : vista === 'frente' ? 5 : -5, pedala: false, braco: true, dentro: true };
    }
    return { sobe: 0, rx: 0, pedala: false, braco: true };
  }

  /* ---------- o desenho de cada um: camada 'sombra', 'atras' (antes do boneco) ou 'frente' (depois) ----------
     pv(x, y, w, h, cor) em pixels a partir do chão debaixo do boneco (y pra cima é negativo); de lado, olhando pra direita
     (quem chama espelha pra esquerda). o = { vista: 'lado'|'frente'|'costas', cor, giro, pedal, ri: { R, MAO }, bau } */
  const DESENHO = {
    skate(pv, o, cam){
      if(cam !== 'atras') return;
      const c = o.cor;
      if(o.vista === 'lado'){ pv(-6, -2, 12, 2, '#2B2F38'); pv(-6, -2, 12, 1, c); pv(-5, 0, 2, 1, '#F4F3EF'); pv(3, 0, 2, 1, '#F4F3EF'); }
      else { pv(-4, -2, 8, 2, '#2B2F38'); pv(-4, -2, 8, 1, c); pv(-4, 0, 2, 1, '#F4F3EF'); pv(2, 0, 2, 1, '#F4F3EF'); }
    },
    patinete(pv, o, cam){
      const c = o.cor;
      if(o.vista === 'lado'){
        if(cam !== 'frente') return;
        pv(-8, -4, 3, 1, c); pv(-7, -3, 13, 1, '#4A4E56'); pv(-7, -2, 13, 1, '#2B2F38');
        pv(-8, -2, 3, 3, PNEU); pv(-7, -1, 1, 1, ARO); pv(5, -2, 3, 3, PNEU); pv(6, -1, 1, 1, ARO);
        linha(pv, 6, -3, 4, -12, c); pv(2, -13, 4, 1, INK); pv(5, -10, 1, 1, FAROL);
        braco(pv, o, -2, -18, 2, -13);
        return;
      }
      if(o.vista === 'frente'){ if(cam !== 'frente') return; pv(-1, -3, 2, 4, PNEU); pv(-2, -3, 4, 1, '#4A4E56'); pv(0, -12, 1, 9, c); pv(-6, -12, 13, 1, INK); pv(-6, -12, 2, 1, '#2B2F38'); pv(5, -12, 2, 1, '#2B2F38'); pv(0, -10, 1, 1, FAROL); return; }
      if(cam === 'atras'){ pv(-6, -12, 13, 1, INK); return; }
      pv(-1, -3, 2, 4, PNEU); pv(-2, -4, 4, 1, c); pv(-2, -3, 4, 1, '#4A4E56'); pv(-1, -5, 2, 1, LANT);
    },
    bike(pv, o, cam){
      const c = o.cor, a = o.giro || 0;
      if(o.vista === 'lado'){
        if(cam === 'atras'){
          roda(pv, -7, -4, 4, 1, a, 'bike'); roda(pv, 7, -4, 4, 1, a, 'bike');
          linha(pv, -7, -4, -1, -4, c); linha(pv, -1, -4, -3, -10, c); linha(pv, -7, -4, -3, -10, c); linha(pv, -3, -10, 5, -10, c); linha(pv, -1, -4, 5, -10, c); linha(pv, 5, -10, 7, -4, tom(c, -.25));
          pv(-5, -11, 4, 1, INK); pv(5, -12, 1, 2, INK); pv(5, -13, 3, 1, INK); pv(-1, -4, 1, 1, CUBO);
          return;
        }
        const pa = (o.pedal || 0), px = -1 + Math.round(Math.cos(pa) * 2), py = -4 + Math.round(Math.sin(pa) * 2);
        linha(pv, -1, -4, px, py, INK); pv(px - 1, py, 3, 1, INK);
        braco(pv, o, -4, -19, 5, -13);
        return;
      }
      if(o.vista === 'frente'){
        if(cam !== 'frente') return;
        pv(-1, -9, 2, 10, PNEU); pv(0, -5, 1, 1, CUBO); pv(-2, -10, 1, 6, c); pv(1, -10, 1, 6, c); pv(-1, -13, 2, 3, c);
        pv(-6, -12, 12, 1, INK); pv(-6, -12, 2, 1, '#2B2F38'); pv(4, -12, 2, 1, '#2B2F38'); pv(-1, -11, 2, 1, FAROL);
        return;
      }
      if(cam === 'atras'){ pv(-6, -12, 2, 1, INK); pv(4, -12, 2, 1, INK); return; }
      pv(-1, -9, 2, 10, PNEU); pv(0, -5, 1, 1, CUBO); pv(-1, -10, 2, 1, LANT); pv(-2, -11, 4, 1, c);
    },
    scooter(pv, o, cam){
      const c = o.cor, cE = tom(c, -.28), cC = tom(c, .3), a = o.giro || 0;
      if(o.vista === 'lado'){
        if(cam === 'atras'){
          roda(pv, -8, -3, 3, 1, a, 'moto'); roda(pv, 8, -3, 3, 1, a, 'moto');
          pv(-11, -3, 5, 1, ARO);
          pv(-10, -10, 7, 1, c); pv(-11, -9, 8, 4, c); pv(-10, -5, 7, 1, cE); pv(-9, -10, 4, 1, cC); pv(-12, -9, 1, 2, LANT);
          pv(-10, -12, 8, 2, INK); pv(-9, -13, 6, 1, INK);
          pv(-4, -5, 9, 1, INK);
          pv(4, -14, 3, 1, c); pv(3, -13, 4, 8, c); pv(6, -13, 1, 7, cC); pv(6, -6, 5, 1, c); pv(7, -12, 1, 2, FAROL);
          pv(4, -16, 1, 2, INK); pv(3, -16, 4, 1, INK); pv(5, -18, 1, 2, INK);
          return;
        }
        braco(pv, o, -4, -20, 4, -16);
        return;
      }
      if(o.vista === 'frente'){
        if(cam !== 'frente') return;
        pv(-1, -6, 2, 7, PNEU); pv(-2, -7, 4, 1, c);
        pv(-3, -15, 6, 1, c); pv(-5, -14, 10, 8, c); pv(-5, -7, 10, 1, cE); pv(-4, -14, 8, 1, cC);
        pv(-2, -13, 4, 2, FAROL); pv(-5, -14, 1, 1, SETA); pv(4, -14, 1, 1, SETA);
        pv(-7, -16, 14, 1, INK); pv(-7, -19, 1, 3, INK); pv(6, -19, 1, 3, INK); pv(-8, -19, 2, 1, INK); pv(6, -19, 2, 1, INK);
        return;
      }
      if(cam === 'atras'){ pv(-7, -16, 2, 1, INK); pv(5, -16, 2, 1, INK); pv(-7, -19, 1, 3, INK); pv(6, -19, 1, 3, INK); return; }
      pv(-4, -11, 8, 6, c); pv(-4, -11, 8, 1, cC); pv(-4, -6, 8, 1, cE); pv(-2, -10, 4, 1, LANT); pv(-2, -8, 4, 2, PLACA); pv(-1, -4, 2, 5, PNEU);
    },
    moto(pv, o, cam){ motoDesenho(pv, o, cam, false); },
    naked(pv, o, cam){ motoDesenho(pv, o, cam, true); },
    carro(pv, o, cam, M){ if(cam === 'frente') carroDesenho(pv, o, M); else if(cam === 'atras') carroDentro(pv, o, M); }
  };
  /* a moto de rua (com o baú, se for motoboy) e a naked 300 (tanque grande, carenagem do radiador, rabeta empinada) */
  function motoDesenho(pv, o, cam, nk){
    const c = o.cor, cE = tom(c, -.3), cC = tom(c, .32), a = o.giro || 0;
    if(o.vista === 'lado'){
      if(cam === 'atras'){
        roda(pv, -9, -4, 4, 1.6, a, 'moto'); roda(pv, 9, -4, 4, 1.6, a, 'moto');
        linha(pv, -9, -4, -2, -6, INK);
        if(nk){ pv(-2, -9, 6, 5, '#2B2F38'); pv(-2, -8, 6, 1, '#3A3F48'); pv(-1, -3, 6, 1, ARO); pv(4, -4, 3, 2, ARO); }
        else { pv(-3, -8, 6, 4, '#4A4E56'); pv(-3, -7, 6, 1, '#2B2F38'); pv(-3, -5, 6, 1, '#2B2F38'); linha(pv, -1, -3, -11, -5, ARO); pv(-13, -6, 3, 2, ARO); pv(-7, -10, 5, 3, c); }
        if(nk){ pv(-8, -12, 8, 1, INK); pv(-12, -13, 4, 1, c); pv(-13, -14, 3, 1, c); pv(-14, -14, 1, 1, LANT); pv(-11, -12, 3, 1, cE); }
        else { pv(-10, -12, 9, 1, INK); pv(-9, -13, 7, 1, INK); pv(-13, -11, 4, 1, c); pv(-12, -10, 3, 1, cE); pv(-14, -12, 1, 2, LANT); }
        if(nk){ pv(0, -15, 6, 1, c); pv(-1, -14, 8, 4, c); pv(1, -10, 6, 1, cE); pv(1, -15, 3, 1, cC); pv(0, -12, 6, 1, cE); pv(4, -10, 3, 4, c); pv(4, -9, 2, 2, '#2B2F38'); }
        else { pv(0, -14, 5, 1, c); pv(-1, -13, 7, 3, c); pv(0, -10, 6, 1, cE); pv(1, -14, 3, 1, cC); }
        linha(pv, 6, -13, 9, -4, nk ? '#E2B04A' : ARO); linha(pv, 7, -13, 10, -4, nk ? '#B98A2E' : '#6B7480');
        pv(7, -9, 5, 1, c);
        if(nk){ pv(8, -15, 2, 3, FAROL); pv(7, -15, 1, 3, INK); pv(7, -17, 2, 2, cE); }
        else { pv(8, -14, 2, 3, FAROL); pv(7, -14, 1, 3, INK); }
        pv(4, -16, 1, 3, INK); pv(3, -16, 3, 1, INK); pv(5, -18, 1, 2, INK);
        if(o.bau && !nk){ pv(-14, -13, 5, 1, INK); pv(-15, -20, 8, 7, '#E2412E'); pv(-15, -20, 8, 1, '#FF7A6B'); pv(-15, -17, 8, 1, PLACA); pv(-15, -14, 8, 1, '#B5302A'); }
        return;
      }
      braco(pv, o, -5, -20, 4, -16);
      return;
    }
    if(o.vista === 'frente'){
      if(cam === 'atras'){ pv(-5, -13, 10, 3, c); pv(-4, -13, 8, 1, cC); return; }
      if(cam !== 'frente') return;
      pv(-1, -9, 2, 10, PNEU); pv(0, -5, 1, 1, CUBO);
      const garfo = nk ? '#E2B04A' : ARO; pv(-3, -12, 1, 7, garfo); pv(2, -12, 1, 7, garfo); pv(-2, -10, 4, 1, c);
      if(nk){ pv(-6, -12, 2, 4, c); pv(4, -12, 2, 4, c); pv(-3, -16, 6, 1, INK); pv(-3, -15, 6, 3, FAROL); pv(-4, -15, 1, 3, INK); pv(3, -15, 1, 3, INK); pv(-2, -18, 4, 2, cE); }
      else { pv(-3, -15, 6, 1, INK); pv(-2, -14, 4, 2, FAROL); pv(-3, -14, 1, 2, INK); pv(2, -14, 1, 2, INK); }
      pv(-5, -14, 1, 1, SETA); pv(4, -14, 1, 1, SETA);
      pv(-7, -16, 14, 1, INK); pv(-7, -19, 1, 3, INK); pv(6, -19, 1, 3, INK); pv(-8, -19, 2, 1, INK); pv(6, -19, 2, 1, INK);
      return;
    }
    if(cam === 'atras'){ pv(-7, -16, 2, 1, INK); pv(5, -16, 2, 1, INK); pv(-7, -19, 1, 3, INK); pv(6, -19, 1, 3, INK); return; }
    if(o.bau && !nk){ pv(-5, -23, 10, 8, '#E2412E'); pv(-5, -23, 10, 1, '#FF7A6B'); pv(-5, -19, 10, 1, PLACA); pv(-5, -16, 10, 1, '#B5302A'); }
    if(nk){ pv(-2, -13, 4, 2, c); pv(-1, -13, 2, 1, LANT); pv(-1, -11, 2, 2, INK); pv(-2, -9, 4, 2, PLACA); pv(-2, -8, 3, 9, PNEU); pv(3, -5, 2, 2, ARO); }
    else { pv(-3, -12, 6, 2, c); pv(-2, -12, 4, 1, LANT); pv(-2, -10, 4, 1, INK); pv(-2, -9, 4, 2, PLACA); pv(-1, -7, 2, 8, PNEU); pv(3, -6, 2, 2, ARO); }
  }
  /* o lado de dentro do carro (escuro), pintado antes de quem dirige: pelo vidro, você vê a cabeça e o escuro do carro */
  function carroDentro(pv, o, M){
    if(o.vista === 'lado'){
      const h = M.yr - M.yb;
      for(let y = -M.yr + 1; y < -M.yb; y++){ const f = (y + M.yr) / h, x0 = Math.round(M.xr1 + (M.xr0 - M.xr1) * f), x1 = Math.round(M.xf1 + (M.xf0 - M.xf1) * f); if(x1 - x0 > 1) pv(x0 + 1, y, x1 - x0 - 1, 1, DENTRO); }
      return;
    }
    const W = M.W, frente = o.vista === 'frente';
    for(let y = -M.yr + 1; y < -M.yb; y++){
      const f = (y + M.yr) / (M.yr - M.yb), x0 = -W + 4 - Math.round(2 * f), x1 = W - 5 + Math.round(2 * f);
      if(M.cacamba && !frente && y > -M.yr + 6) continue;
      pv(x0 + 1, y, x1 - x0 - 1, 1, DENTRO);
    }
  }
  /* o carro: a carroceria pinta por cima de quem dirige; o vidro é transparente e deixa ver a cabeça */
  function carroDesenho(pv, o, M){
    const c = o.cor, cE = tom(c, -.3), cC = tom(c, .3), a = o.giro || 0;
    if(o.vista === 'lado'){
      const L = M.L, h = M.yr - M.yb;
      /* a cabine: a moldura na cor do carro, o vidro por dentro, as colunas */
      for(let y = -M.yr; y < -M.yb; y++){
        const f = (y + M.yr) / h, x0 = Math.round(M.xr1 + (M.xr0 - M.xr1) * f), x1 = Math.round(M.xf1 + (M.xf0 - M.xf1) * f);
        if(y === -M.yr){ pv(x0, y, x1 - x0 + 1, 1, c); continue; }
        pv(x0, y, 1, 1, c); pv(x1, y, 1, 1, c); if(x1 - x0 > 1) pv(x0 + 1, y, x1 - x0 - 1, 1, VIDRO);
        M.pilar.forEach(px => { if(px > x0 && px < x1) pv(px, y, 1, 1, c); });
        if(y === -M.yr + 1) pv(x0 + 1, y, x1 - x0 - 1, 1, 'rgba(255,255,255,.18)');
      }
      if(M.rack){ pv(M.xr1 + 1, -M.yr - 1, 1, 1, INK); pv(M.xf1 - 2, -M.yr - 1, 1, 1, INK); pv(M.xr1 + 1, -M.yr - 2, M.xf1 - M.xr1 - 2, 1, INK); }
      /* a carroceria */
      pv(-L + 1, -M.yb, 2 * L - 2, 1, c); pv(-L, -M.yb + 1, 2 * L, M.yb - 5, c); pv(-L + 1, -M.yb, 2 * L - 2, 1, cC);
      pv(-L, -6, 2 * L, 1, cE); pv(-L + 1, -5, 2 * L - 2, 1, cE);
      if(M.cacamba){ pv(-L + 1, -M.yb, M.xr0 + L - 1, 1, '#3A3F48'); pv(-L + 1, -M.yb + 1, M.xr0 + L - 1, 1, cC); }
      if(M.clad){ pv(-L, -6, 2 * L, 2, CLAD); }
      pv(M.porta, -M.yb + 1, 1, M.yb - 6, cE); pv(M.porta + 2, -M.yb + 2, 2, 1, cE);
      pv(M.xf0 - 1, -M.yb - 2, 2, 1, INK);
      pv(L - 2, -M.yb + 2, 2, 2, FAROL); pv(-L, -M.yb + 2, 2, 2, LANT);
      pv(L - 3, -7, 3, 2, INK); pv(-L, -7, 3, 2, INK);
      /* as rodas, nos para-lamas escuros */
      M.rodas.forEach(wx => { for(let j = -6; j <= -4; j++) for(let i = -5; i <= 5; i++) if(Math.hypot(i, j + 4) <= 5.3) pv(wx + i, j, 1, 1, M.clad ? CLAD : '#1B1D22'); roda(pv, wx, -4, 4, 1.6, a, 'carro'); });
      return;
    }
    const W = M.W, frente = o.vista === 'frente';
    /* de frente (ou de costas): o vidro, a carroceria, os faróis (ou as lanternas), a placa e as rodas */
    for(let y = -M.yr; y < -M.yb; y++){
      const f = (y + M.yr) / (M.yr - M.yb), x0 = -W + 4 - Math.round(2 * f), x1 = W - 5 + Math.round(2 * f);
      if(y === -M.yr){ pv(x0, y, x1 - x0 + 1, 1, c); continue; }
      if(M.cacamba && !frente && y > -M.yr + 6){ pv(x0, y, x1 - x0 + 1, 1, '#3A3F48'); continue; }
      pv(x0, y, 1, 1, c); pv(x1, y, 1, 1, c); pv(x0 + 1, y, x1 - x0 - 1, 1, VIDRO);
      if(y === -M.yr + 1) pv(x0 + 1, y, x1 - x0 - 1, 1, 'rgba(255,255,255,.18)');
    }
    if(M.rack){ pv(-W + 4, -M.yr - 1, 1, 1, INK); pv(W - 5, -M.yr - 1, 1, 1, INK); }
    pv(-W, -M.yb, 2 * W, M.yb - 4, c); pv(-W + 1, -M.yb, 2 * W - 2, 1, cC); pv(-W, -6, 2 * W, 1, cE);
    if(M.clad) pv(-W, -6, 2 * W, 2, CLAD);
    pv(-W - 1, -M.yb - 2, 2, 1, c); pv(W - 1, -M.yb - 2, 2, 1, c);
    if(frente){ pv(-W + 1, -M.yb + 2, 4, 2, FAROL); pv(W - 5, -M.yb + 2, 4, 2, FAROL); pv(-4, -M.yb + 2, 8, 2, INK); pv(-3, -M.yb + 2, 6, 1, '#3A3F48'); }
    else { pv(-W + 1, -M.yb + 2, 3, 2, LANT); pv(W - 4, -M.yb + 2, 3, 2, LANT); if(M.cacamba) pv(-W + 1, -M.yb, 2 * W - 2, 1, '#3A3F48'); }
    pv(-3, -9, 6, 2, PLACA); pv(-W, -7, 2 * W, 1, INK);
    pv(-W, -5, 3, 5, PNEU); pv(W - 3, -5, 3, 5, PNEU);
  }
  /* desenha uma camada do veículo k */
  function desenha(pv, k, o, cam){
    const v = POR[k]; if(!v) return;
    if(cam === 'sombra'){ const L = v.tipo === 'carro' ? (o.vista === 'lado' ? v.M.L + 1 : v.M.W + 1) : v.tipo === 'skate' || v.tipo === 'patinete' ? 7 : 11; pv(-L, -1, 2 * L, 2, 'rgba(15,18,24,.26)'); return; }
    const f = DESENHO[v.tipo === 'carro' ? 'carro' : v.k];
    if(f) f(pv, Object.assign({ cor: cor(k, o.ci) }, o), cam, v.M);
  }

  /* ---------- o avião (de lado, olhando pra direita) e o paraquedas ---------- */
  function aviao(pv, o){
    o = o || {};
    const B = '#F4F3EF', BE = '#C9CED6', R = '#FF4F9A', Y = '#F2C230';
    for(let y = -20; y <= -12; y++){ const w = 3 + Math.round((y + 20) * .9); pv(-24, y, w, 1, R); }
    pv(-24, -20, 2, 1, tom(R, .3));
    pv(-27, -12, 9, 1, BE);
    pv(-22, -11, 40, 5, B); pv(-19, -13, 34, 2, B); pv(-16, -6, 32, 1, BE);
    pv(18, -11, 3, 4, B); pv(21, -10, 2, 3, BE); pv(23, -10, 2, 2, INK);
    pv(-22, -9, 43, 1, R); pv(-22, -8, 43, 1, Y);
    pv(4, -12, 4, 2, VIDRO_OP); pv(9, -12, 5, 2, VIDRO_OP); pv(10, -12, 2, 1, 'rgba(255,255,255,.35)');
    pv(-2, -12, 1, 5, BE); pv(-1, -11, 1, 1, '#8E949C');
    pv(-4, -15, 18, 2, B); pv(-4, -15, 18, 1, BE); pv(14, -15, 1, 1, LANT);
    linha(pv, 3, -13, 0, -7, INK);
    if(o.trem !== false){ pv(0, -6, 1, 4, INK); pv(-1, -2, 3, 2, PNEU); pv(17, -6, 1, 4, INK); pv(16, -2, 3, 2, PNEU); }
    if(o.helice){ pv(25, -16, 1, 13, 'rgba(20,22,25,.28)'); if(Math.floor((o.t || 0) * 30) % 2) pv(25, -15, 1, 5, INK); else pv(25, -8, 1, 5, INK); }
    else pv(25, -14, 1, 9, INK);
  }
  /* a sombra do avião no chão (uma cruz: a fuselagem e a asa) */
  function sombraAviao(pv){ const s = 'rgba(15,18,24,.24)'; pv(-24, -1, 48, 2, s); pv(0, -7, 6, 14, s); pv(-26, -3, 6, 6, s); }
  function paraquedas(pv){
    const cores = ['#FF4F9A', '#F2C230', '#F4F3EF'], fio = 'rgba(20,22,25,.55)';
    [[-44, -6, 5], [-43, -10, 9], [-42, -12, 11], [-41, -13, 12], [-40, -13, 12], [-39, -13, 12]].forEach(([y, a, b]) => { for(let x = a; x <= b; x++) pv(x, y, 1, 1, cores[Math.floor((x + 13) / 5) % 3]); });
    pv(-13, -38, 26, 1, 'rgba(15,18,24,.3)');
    linha(pv, -13, -38, -3, -21, fio); linha(pv, 12, -38, 2, -21, fio); linha(pv, -5, -38, -2, -21, fio); linha(pv, 4, -38, 1, -21, fio);
  }

  /* ---------- a garagem: escolhe o veículo e a cor; sai com ele ---------- */
  const G = { k: null, c: null };
  const meuV = () => { const v = (C.st.me && C.st.me.verso) || {}; return { k: POR[v.veiculo] ? v.veiculo : v.skate === true ? 'skate' : '', c: Number.isInteger(v.vcor) ? v.vcor : null }; };
  const pontos = v => { const n = Math.max(1, Math.min(5, Math.round((v - 1) / .3))); return '●'.repeat(n) + '○'.repeat(5 - n); };
  function garagem(){
    if(!C.st.me){ C.toast('Entra no Corre pra usar a garagem.'); return; }
    const m = meuV(); if(G.k == null){ G.k = m.k; G.c = m.c; }
    const v = POR[G.k], ci = v ? (G.c == null ? v.cor : G.c) : null;
    C.sheet(`<div class="form cvr-gar"><div class="sheet-head"><h2>${ico('carro')} Garagem</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p class="note">Como você anda pela cidade. Tudo de graça; quanto mais bolinha, mais rápido. De moto e de carro o botão de pular vira buzina.</p>
      <div class="cvr-gar-grid">
        <button type="button" class="cvr-gar-i${!G.k ? ' on' : ''}" data-act="cvr-gar-ve" data-k="" aria-pressed="${!G.k}"><canvas width="54" height="38" data-k="" aria-hidden="true"></canvas><b>A pé</b><small>${pontos(1)}</small></button>
        ${LISTA.map(x => `<button type="button" class="cvr-gar-i${x.k === G.k ? ' on' : ''}" data-act="cvr-gar-ve" data-k="${x.k}" aria-pressed="${x.k === G.k}"><canvas width="54" height="38" data-k="${x.k}" aria-hidden="true"></canvas><b>${esc(x.nome)}</b><small>${esc(x.seg)}</small><small class="cvr-gar-v" aria-label="velocidade">${pontos(x.vel)}</small></button>`).join('')}
      </div>
      ${v ? `<p class="lbl-s">Cor</p><div class="cvr-sw cvr-gar-cores" role="radiogroup" aria-label="Cor">${CORES.map(([n, h], i) => `<button type="button" role="radio" aria-checked="${i === ci}" aria-label="${esc(n)}" title="${esc(n)}" style="--c:${h}" data-act="cvr-gar-cor" data-i="${i}"></button>`).join('')}</div>` : ''}
      <div class="acts"><button type="button" class="btn pri" data-act="cvr-gar-sai">${v ? `${ico('carro')} Sair de ${esc(v.nome)}` : `${ico('eu')} Sair a pé`}</button></div></div>`, 'wide');
    document.querySelectorAll('.cvr-gar-i canvas').forEach(cv => { if(C.verso && C.verso.miniVeiculo) C.verso.miniVeiculo(cv, cv.dataset.k, cv.dataset.k === G.k ? ci : null); });
  }
  async function sai(){
    const me = C.st.me; if(!me) return;
    const k = G.k || '', v = POR[k], base = me.verso && typeof me.verso === 'object' ? me.verso : {};
    const nv = Object.assign({}, base, { veiculo: k, skate: k === 'skate' }); if(v && G.c != null) nv.vcor = G.c; else delete nv.vcor;
    if(!v) delete nv.veiculo;
    try{ await C.saveMe({ verso: nv }); }catch(e){ C.toast(C.errMsg(e, 'Não deu pra tirar da garagem agora.')); return; }
    C.closeSheet(); G.k = G.c = null;
    if(C.verso && C.verso.trocaVeiculo) C.verso.trocaVeiculo();
    C.toast(v ? `Agora você anda de ${v.nome}.` : 'Agora você anda a pé.', 2400);
  }
  Object.assign(C.acts, {
    'cvr-garagem': () => { G.k = G.c = null; garagem(); },
    'cvr-gar-ve': el => { G.k = el.dataset.k || ''; G.c = null; garagem(); },
    'cvr-gar-cor': el => { G.c = Number(el.dataset.i); garagem(); },
    'cvr-gar-sai': () => sai()
  });

  C.veiculos = { LISTA, porK, CORES, cor, desenha, pose, aviao, sombraAviao, paraquedas, garagem, tom };
})();
