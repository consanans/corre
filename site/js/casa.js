/* CORRE · CASA: a tua casa do Correverso por dentro, em 3D de blocos (sem biblioteca: caixas em perspectiva num canvas).
   Entra pela porta da tua casa na cidade. Sala, cozinha, quarto, escritório e varanda. No escritório, cada ferramenta do
   Corre é um móvel: toca na mesa e o Studio abre no balcão por cima da casa. A loja tem os móveis (tudo de graça por
   enquanto; os de luxo chegam depois) e o modo Decorar coloca, gira, move e guarda. O que você monta fica guardado no
   teu perfil (corre_perfis.casa) e quem bate na tua porta pode visitar. A cidade continua no ar enquanto você tá em casa. */
(function(){
  'use strict';
  const C = window.Corre, { esc, ico } = C;
  const INK = '#0F1218', PAPEL = '#FFFFFF', AMARELO = '#F2EC54', ROSA = '#FF4F9A', AZUL = '#2E5BFF', LARANJA = '#FF8A3D', LILAS = '#C6A6FF';
  const MAD = '#B3793F', MAD_E = '#7A4E2A', CINZA = '#C9CDD3', BRANCO = '#F2F0EA', OURO = '#E7B734', CEU = '#9CC9F0', VERM = '#E2412E';
  const PAREDE = '#EFEAE2', RODAPE = '#2B2F38', VIDRO = '#4F7FD1', ACO3 = '#8F96A0';
  const ESP = .3, VEL = 3.4, RAIO = .26, MAX_ITENS = 200, TIJ = '#8C3B2E';
  let W = 20, D = 20, ALT = 2.8, COMODOS = [], PAREDES = [], ENTRADA = { x: 10, z: 20 }, PADRAO = [], PL = null;
  const B = (x, y, z, w, h, d, c) => ({ x, y, z, w, h, d, c });

  /* ---------- a planta padrão: cinco cômodos num quadrado de 20 x 20 ---------- */
  const COMODOS_PADRAO = [
    { k: 'sala', nome: 'Sala', x0: 0, z0: 12, x1: 20, z1: 20, piso: '#C89B6A', linha: 'rgba(60,30,10,.16)' },
    { k: 'cozinha', nome: 'Cozinha', x0: 0, z0: 4, x1: 7, z1: 12, piso: '#E8E4DA', piso2: '#D3CFC4', xadrez: true, linha: 'rgba(60,50,40,.1)' },
    { k: 'quarto', nome: 'Quarto', x0: 7, z0: 4, x1: 13, z1: 12, piso: '#D9CCEF', linha: 'rgba(80,60,120,.14)' },
    { k: 'escritorio', nome: 'Escritório', x0: 13, z0: 4, x1: 20, z1: 12, piso: '#B8BCC2', linha: 'rgba(20,24,30,.14)' },
    { k: 'varanda', nome: 'Varanda', x0: 0, z0: 0, x1: 20, z1: 4, piso: '#A9774E', linha: 'rgba(40,20,5,.22)', aberto: true }
  ];
  /* paredes: a → b, ext = normal pra fora (parede externa vira muretinha quando fica entre a câmera e você),
     portas e janelas são trechos ao longo da parede (em metros desde o a) */
  const PAREDES_PADRAO = [
    { a: [0, 20], b: [20, 20], ext: [0, 1], portas: [[9.4, 10.6]], janelas: [[2.5, 4.5], [15.5, 17.5]], entrada: true },
    { a: [20, 4], b: [20, 20], ext: [1, 0], janelas: [[10, 12], [3, 5]] },
    { a: [0, 4], b: [0, 20], ext: [-1, 0], janelas: [[10, 12], [3, 5]] },
    { a: [0, 4], b: [20, 4], ext: [0, -1], portas: [[3, 4.2], [9.4, 10.6], [16, 17.2]] },
    { a: [0, 12], b: [20, 12], portas: [[3, 4.2], [9.4, 10.6], [16, 17.2]] },
    { a: [7, 4], b: [7, 12] },
    { a: [13, 4], b: [13, 12] },
    { a: [0, 0], b: [20, 0], grade: true }, { a: [0, 0], b: [0, 4], grade: true }, { a: [20, 0], b: [20, 4], grade: true }
  ];

  /* ---------- cores ---------- */
  const rgbDe = hex => { const n = parseInt(String(hex).slice(1, 7), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const CORES = new Map();
  function tom(hex, f){
    const k = hex + '|' + Math.round(f * 40);
    let v = CORES.get(k); if(v) return v;
    const [r, g, b] = rgbDe(hex); v = `rgb(${Math.min(255, Math.round(r * f))},${Math.min(255, Math.round(g * f))},${Math.min(255, Math.round(b * f))})`;
    CORES.set(k, v); return v;
  }
  /* v3.52 · a luz: a face de frente pro sol puxa pro quente e a da sombra puxa pro violeta (nunca pro azul frio:
     amarelo na sombra fria vira verde-oliva). O brilho é o mesmo de antes (0,56 na sombra, 1 no sol) */
  const QUENTE = [255, 236, 214], FRIO = [86, 54, 112];
  function luzTom(hex, lam){
    const q = Math.round(Math.max(-1, Math.min(1, lam)) * 24), k = hex + '#' + q;
    let v = CORES.get(k); if(v) return v;
    const l = q / 24, f = .56 + .44 * Math.max(0, l), w = l > .55 ? (l - .55) * .16 : 0, sm = l < .3 ? (.3 - l) * .1 : 0, rgb = rgbDe(hex);
    const m = i => { let x = rgb[i] * f; x = x * (1 - w) + QUENTE[i] * w; x = x * (1 - sm) + FRIO[i] * f * sm; return Math.max(0, Math.min(255, Math.round(x))); };
    v = `rgb(${m(0)},${m(1)},${m(2)})`; CORES.set(k, v); return v;
  }
  const escurece = (hex, f) => { const [r, g, b] = rgbDe(hex); const h = n => Math.max(0, Math.min(255, Math.round(n * f))).toString(16).padStart(2, '0'); return '#' + h(r) + h(g) + h(b); };

  /* ---------- os móveis: o catálogo mora em moveis.js (C.moveis); aqui ficam só os ajudantes da decoração fixa ---------- */
  const M = C.moveis, ITENS = M.ITENS, ITEM = M.ITEM, CAT = M.CAT;
  const pes = (w, d, h, c) => [B(.08, 0, .08, .14, h, .14, c), B(w - .22, 0, .08, .14, h, .14, c), B(.08, 0, d - .22, .14, h, .14, c), B(w - .22, 0, d - .22, .14, h, .14, c)];
  const cadeira = c => [B(.2, .45, .2, .6, .06, .6, c), B(.2, .51, .2, .6, .5, .08, c), B(.22, 0, .22, .07, .45, .07, MAD_E), B(.71, 0, .22, .07, .45, .07, MAD_E), B(.22, 0, .71, .07, .45, .07, MAD_E), B(.71, 0, .71, .07, .45, .07, MAD_E)];
  const mesaTrab = () => [B(0, .72, 0, 2, .06, 1, MAD), B(0, 0, .1, .08, .72, .8, MAD_E), B(1.92, 0, .1, .08, .72, .8, MAD_E), B(.7, .78, .3, .6, .4, .06, INK), B(.73, .81, .28, .54, .34, .02, CEU), B(.95, .78, .4, .1, .08, .1, INK), B(.6, .78, .62, .8, .03, .25, CINZA)];
  /* casa nova já vem com o básico (móvel, x, z, giro, andar, cor); a pessoa troca tudo depois */
  /* v3.81: a sala foi 1 m pra esquerda (o rack tampava metade da porta do quarto), e a cama e o criado saíram da frente
     da porta da varanda */
  const PADRAO_PADRAO = [['sofa', 7, 17, 0, 0, 0], ['mesa_centro', 7, 15, 0, 0, 0], ['rack_tv', 7, 12.3, 0, 0, 0], ['tapete_listra', 6.5, 14, 0, 0, 1], ['planta', 1, 18, 0], ['luminaria', 11, 18, 0, 0, 2], ['poster', 1, 12.15, 0, 0, 0], ['neon_coracao', 14, 12.15, 0, 0, 0],
    ['cama_casal', 7.3, 4.5, 0, 0, 1], ['criado', 11.4, 4.5, 0], ['guarda_roupa', 7.4, 10.8, 0], ['tapete_quadrado', 10, 7.5, 0, 0, 2], ['poster', 11.5, 4.15, 0, 0, 2],
    ['geladeira', .4, 4.4, 0, 0, 0], ['fogao', 1.6, 4.4, 0], ['pia', 2.8, 4.4, 0], ['mesa_jantar', 2.5, 8, 0], ['cadeira', 1.5, 8.5, 1, 0, 1], ['cadeira', 4.5, 8.5, 3, 0, 1], ['balcao_cafe', 5.4, 4.4, 0],
    ['cadeira_praia', 2, 1, 0, 0, 0], ['mesa_redonda', 3.5, 1.2, 0], ['vaso', 17, .4, 0, 0, 2], ['pampa', 18.5, .4, 0]];

  /* ---------- o escritório: cada ferramenta é um móvel fixo ---------- */
  const ESTACOES = [
    { id: 'studio', titulo: 'Studio Cria', rota: '#/studio', cor: AMARELO, x: 17.4, z: 4.35, w: 2, d: 1.9, bl: [...mesaTrab().map(b => Object.assign({}, b)), B(.65, .45, 1.1, .7, .1, .7, INK), B(.65, .55, 1.72, .7, .7, .12, INK), B(.75, .62, 1.7, .5, .5, .02, AMARELO), B(.9, 0, 1.3, .1, .45, .1, INK), B(.8, 0, 1.25, .4, .05, .4, CINZA)], tag: [1, 1.3, .3] },
    { id: 'feed', titulo: 'Feed', rota: '#/', cor: ROSA, parede: true, x: 13.25, z: 4.15, w: 1.4, d: .1, bl: [B(0, 1.4, 0, 1.4, .85, .08, INK), B(.08, 1.47, .08, 1.24, .71, .02, CEU), B(.2, 1.6, .1, .45, .08, .01, ROSA), B(.2, 1.75, .1, .9, .05, .01, INK), B(.2, 1.9, .1, .7, .05, .01, INK)], tag: [.7, 2.3, .1] },
    /* o Computador IA: trancado, pra ver agora e comprar depois (Corre+). Torre com luz, tela com o olho, cadeado de ouro */
    { id: 'ia', titulo: 'Computador IA', rota: '', cor: LILAS, trava: true, x: 14.5, z: 4.4, w: 1.6, d: 1.1, bl: [B(0, 0, 0, 1.6, .08, 1.1, '#2A2D33'), B(.05, .08, .15, .5, 1.45, .85, '#15171B'), B(.1, .25, 1.0, .4, .04, .01, ROSA), B(.1, .45, 1.0, .4, .04, .01, '#38E1FF'), B(.1, .65, 1.0, .4, .04, .01, LILAS), B(.1, .85, 1.0, .4, .04, .01, AMARELO), B(.65, .08, .3, .9, .72, .6, '#2A2D33'), B(.7, .8, .35, .8, .55, .07, INK), B(.74, .84, .42, .72, .47, .02, '#101318'), B(1.0, .98, .44, .2, .2, .01, AMARELO), B(1.06, 1.04, .45, .08, .08, .01, INK), B(.9, .92, .44, .4, .03, .01, LILAS), B(.9, 1.25, .44, .4, .03, .01, LILAS), B(.95, 1.36, .5, .3, .3, .3, LILAS), B(1.0, 1.66, .55, .2, .12, .2, LILAS), B(.98, .4, .92, .24, .22, .06, OURO), B(1.03, .62, .92, .14, .1, .05, OURO)], tag: [.9, 2.05, .55] },
    { id: 'horus', titulo: 'Hórus', rota: '#/horus', cor: INK, parede: true, x: 13.15, z: 5, w: .1, d: 2, bl: [B(0, 1.05, 0, .08, 1.25, 2, INK), B(.08, 1.12, .08, .02, 1.1, 1.84, '#101318'), B(.1, 1.6, .9, .01, .14, .14, AMARELO), B(.1, 1.3, .4, .01, .08, .08, AMARELO), B(.1, 1.95, 1.4, .01, .08, .08, AMARELO), B(.1, 1.45, 1.55, .01, .06, .06, ROSA)], tag: [.1, 2.35, 1] },
    { id: 'mural', titulo: 'Mural', rota: '#/mural', cor: ROSA, parede: true, x: 13.15, z: 8, w: .1, d: 2, bl: [B(0, 1.05, 0, .08, 1.15, 2, '#B5824A'), B(.08, 1.3, .2, .02, .38, .32, PAPEL), B(.08, 1.55, .7, .02, .3, .3, AMARELO), B(.08, 1.25, 1.2, .02, .42, .36, ROSA), B(.08, 1.7, 1.55, .02, .3, .3, PAPEL)], tag: [.1, 2.3, 1] },
    { id: 'marcas', titulo: 'Portfólio e catálogo', rota: '#/marcas', cor: VERM, x: 19.4, z: 6, w: .6, d: 2.5, bl: [B(.05, 0, 0, .55, 2, 2.5, '#4A4E56'), B(.05, .6, .05, .53, .04, 2.4, '#2B2F38'), B(.05, 1.25, .05, .53, .04, 2.4, '#2B2F38'), B(0, .64, .2, .3, .32, .16, ROSA), B(0, .64, .45, .3, .32, .16, AZUL), B(0, .64, .7, .3, .32, .16, AMARELO), B(0, .64, .95, .3, .32, .16, LARANJA), B(0, .64, 1.4, .3, .32, .16, VERM), B(0, 1.29, .3, .3, .3, .16, LILAS), B(0, 1.29, .6, .3, .3, .16, INK), B(0, 1.29, 1.1, .3, .3, .16, ROSA), B(0, 1.29, 1.6, .3, .3, .16, AZUL)], tag: [.3, 2.2, 1.25] },
    { id: 'grana', titulo: 'Grana', rota: '#/grana', cor: AZUL, x: 19.2, z: 9, w: .8, d: 1, bl: [B(.05, 0, .05, .75, .95, .9, '#4A4E56'), B(0, .1, .15, .06, .75, .7, '#5C6470'), B(-.04, .4, .42, .05, .14, .14, OURO), B(-.03, .3, .22, .04, .08, .3, OURO)], tag: [.3, 1.3, .5] },
    { id: 'vendas', titulo: 'Vendas', rota: '#/vendas', cor: LARANJA, x: 18, z: 10.85, w: 2, d: 1.1, bl: [B(0, 0, .1, 2, .9, 1, MAD_E), B(-.05, .9, .05, 2.1, .06, 1.1, CINZA), B(.6, .96, .3, .6, .42, .5, INK), B(.65, 1.2, .28, .5, .15, .02, CEU), B(1.4, .96, .5, .35, .08, .45, PAPEL), B(1.45, 1.04, .55, .25, .02, .35, LARANJA)], tag: [1, 1.7, .5] },
    { id: 'nicho', titulo: 'Do teu nicho', rota: '#/refs', cor: '#8F86E8', x: 13.2, z: 10.5, w: .8, d: 1.3, bl: [B(0, 0, 0, .8, .1, 1.3, MAD), B(0, .1, 0, .1, .9, 1.3, MAD), B(.12, .15, .1, .45, .6, .25, '#8F86E8'), B(.12, .15, .5, .45, .6, .25, AMARELO), B(.12, .15, .9, .45, .6, .25, ROSA)], tag: [.4, 1.2, .65] },
    { id: 'estilo', titulo: 'Estilo de vida', rota: '#/estilo', cor: LILAS, x: 14.3, z: 10.5, w: .9, d: .9, bl: [B(.05, 0, .05, .8, .7, .8, PAPEL), B(.2, .7, .2, .5, .3, .5, BRANCO), B(.15, 1, .15, .6, .12, .6, LILAS), B(.37, .72, .7, .14, .2, .02, INK)], tag: [.45, 1.4, .45] },
    { id: 'manual', titulo: 'Manual', rota: '', cor: CEU, x: 15.5, z: 7.5, w: 1, d: 1, bl: [B(0, 0, 0, 1, .5, 1, MAD), B(.2, .5, .15, .6, .12, .7, CEU), B(.22, .52, .17, .56, .08, .66, PAPEL), B(.22, .6, .17, .56, .01, .66, CEU)], tag: [.5, .95, .5] },
    { id: 'banca', titulo: 'Banca do dia', rota: '#/banca', cor: AZUL, x: 13.2, z: 8.6, w: .8, d: .5, bl: [B(0, 0, 0, .8, 1.1, .5, '#2B2F38'), B(.1, .55, .5, .6, .5, .02, PAPEL), B(.15, .95, .52, .5, .06, .01, INK), B(.15, .62, .52, .3, .25, .01, AZUL), B(.1, .25, .5, .6, .25, .02, AMARELO)], tag: [.4, 1.4, .25] },
    /* o escritório financeiro: a mesa do agente (três telas com as velas do mercado); o agente em si entra na hora, do jeito que você escolheu */
    { id: 'agente', titulo: 'Agente financeiro', rota: '', cor: OURO, agente: true, x: 16.4, z: 7.9, w: 2.2, d: 2, bl: [B(.1, .72, 1.1, 2, .06, .8, '#2B2F38'), B(.14, 0, 1.2, .08, .72, .6, INK), B(1.98, 0, 1.2, .08, .72, .6, INK), B(.15, .78, 1.55, .5, .36, .05, INK), B(.78, .78, 1.6, .64, .42, .05, INK), B(1.55, .78, 1.55, .5, .36, .05, INK), B(.95, .72, 1.3, .3, .06, .2, INK), B(.7, .78, 1.2, .5, .03, .25, CINZA), B(1.45, .78, 1.25, .25, .1, .25, PAPEL), B(.25, .78, 1.15, .2, .2, .2, OURO)], tag: [1.1, 1.6, 1.3] },
    { id: 'rolo', titulo: 'Rolo 360', rota: '#/rolo', cor: '#8E4B2B', so: 'fundador', x: 14.2, z: 7.5, w: .9, d: .9, bl: [B(0, 0, 0, .9, .1, .9, INK), B(.4, .1, .4, .1, .9, .1, INK), B(.1, 1, .2, .7, .35, .5, '#4A4E56'), B(.8, 1.08, .35, .08, .2, .2, CEU)], tag: [.45, 1.6, .45] }
  ];
  /* ---------- o agente financeiro: a turma que senta atrás da mesa (todos desenhados pro Corre) ----------
     cada um é uma lista de caixas, sentado, olhando pra frente (z+), com a cabeça em y ~1.1 e os braços na mesa */
  const AGENTES = [
    { k: 'zecaixa', nome: 'Seu Zé do Caixa', bio: 'Trinta anos de balcão de banco. Conta moeda no escuro e não erra. Desconfia de tudo que sobe rápido demais.', bl: () => { const P = '#C68642', Pd = '#A86E35'; return [B(.7, .3, .35, .6, .5, .4, PAPEL), B(.7, .45, .35, .1, .35, .4, INK), B(1.2, .45, .35, .1, .35, .4, INK), B(.52, .6, .5, .18, .22, .55, PAPEL), B(1.3, .6, .5, .18, .22, .55, PAPEL), B(.58, .6, .98, .14, .14, .2, P), B(1.28, .6, .98, .14, .14, .2, P), B(.56, .68, .5, .1, .06, .3, INK), B(1.34, .68, .5, .1, .06, .3, INK), B(.72, .8, .4, .56, .52, .5, P), B(.66, .9, .9, .68, .14, .04, PAPEL), B(.72, .9, .92, .2, .12, .02, '#9CC9F0'), B(1.08, .9, .92, .2, .12, .02, '#9CC9F0'), B(.78, 1.08, .36, .44, .18, .6, AZUL), B(.7, 1.06, .78, .6, .04, .3, AZUL), B(.84, .76, .9, .32, .06, .02, '#5A4634'), B(1.26, .98, .58, .04, .16, .04, AMARELO), B(.9, .74, .9, .2, .03, .02, Pd)]; } },
    { k: 'lontra', nome: 'Lucy, a lontra', bio: 'A lontra do Igapó que descobriu as planilhas. Nada de barriga pra cima quando a conta fecha. Calculadora na pata.', bl: () => { const B1 = '#6E5033', B3 = '#B49472'; return [B(.7, .3, .35, .6, .55, .42, B1), B(.78, .32, .76, .44, .45, .02, B3), B(.52, .62, .5, .18, .2, .5, B1), B(1.3, .62, .5, .18, .2, .5, B1), B(1.3, .64, .95, .3, .14, .3, CINZA), B(1.33, .78, .97, .24, .02, .24, PAPEL), B(.68, .85, .36, .64, .5, .54, B1), B(.9, .95, .9, .2, .16, .04, B3), B(.96, 1.04, .94, .08, .05, .01, INK), B(.78, 1.12, .9, .1, .08, .02, INK), B(1.12, 1.12, .9, .1, .08, .02, INK), B(.66, 1.28, .4, .14, .12, .14, B1), B(1.2, 1.28, .4, .14, .12, .14, B1), B(.92, .6, .78, .16, .22, .03, ROSA), B(.3, .34, .2, .3, .14, .5, B1)]; } },
    { k: 'bitinho', nome: 'Bitinho', bio: 'Uma moeda que criou pernas e opinião. Fala em porcentagem, dorme em cima do cofre e acha que tudo é oportunidade.', bl: () => [B(.72, .3, .4, .56, .48, .36, CINZA), B(.76, .4, .76, .48, .3, .02, '#8F96A0'), B(.86, .5, .78, .28, .06, .01, ROSA), B(.86, .62, .78, .28, .06, .01, '#38E1FF'), B(.56, .62, .5, .16, .16, .5, CINZA), B(1.28, .62, .5, .16, .16, .5, CINZA), B(.7, .8, .5, .6, .6, .18, OURO), B(.76, .86, .68, .48, .48, .02, '#F2D06B'), B(.84, 1.08, .7, .1, .1, .01, INK), B(1.06, 1.08, .7, .1, .1, .01, INK), B(.9, .94, .7, .2, .05, .01, INK), B(.97, 1.4, .56, .06, .14, .06, INK), B(.92, 1.54, .51, .16, .1, .16, ROSA)] },
    { k: 'candle', nome: 'Capitão Candle', bio: 'Um candle que saiu do gráfico. Bigode de marinheiro, chapéu de capitão e um só assunto: pra onde vai o mercado.', bl: () => [B(.8, .3, .4, .4, 1.1, .4, ROSA), B(.84, .6, .8, .32, .28, .02, '#FF7DB8'), B(.86, 1.02, .82, .1, .08, .01, PAPEL), B(1.04, 1.02, .82, .1, .08, .01, PAPEL), B(.88, 1.04, .83, .05, .04, .01, INK), B(1.06, 1.04, .83, .05, .04, .01, INK), B(.84, .9, .82, .32, .06, .02, INK), B(.98, 1.4, .58, .04, .3, .04, INK), B(.74, 1.36, .34, .52, .1, .52, INK), B(.7, 1.44, .3, .6, .06, .6, INK), B(.92, 1.46, .86, .16, .06, .02, OURO), B(.56, .62, .5, .22, .18, .5, ROSA), B(1.22, .62, .5, .22, .18, .5, ROSA), B(.6, .78, .98, .14, .06, .1, '#38E1FF'), B(1.26, .78, .98, .14, .06, .1, '#38E1FF')] },
    { k: 'touro', nome: 'Touro Lelé', bio: 'O touro do mercado, de moletom. Só sabe uma direção: pra cima. Bate a cabeça na porta, mas chega.', bl: () => { const T1 = '#4A3A30', T2 = '#6A5446'; return [B(.66, .3, .36, .68, .55, .42, ROSA), B(.78, .34, .78, .44, .36, .02, '#E03A86'), B(.5, .62, .5, .18, .2, .5, ROSA), B(1.32, .62, .5, .18, .2, .5, ROSA), B(.54, .64, .98, .14, .14, .14, T1), B(1.32, .64, .98, .14, .14, .14, T1), B(.64, .85, .34, .72, .52, .6, T1), B(.78, .88, .94, .44, .24, .06, T2), B(.84, .9, 1.0, .1, .1, .01, INK), B(1.06, .9, 1.0, .1, .1, .01, INK), B(.96, .84, 1.0, .08, .08, .02, OURO), B(.8, 1.18, .9, .1, .08, .02, INK), B(1.1, 1.18, .9, .1, .08, .02, INK), B(.44, 1.3, .5, .24, .1, .1, PAPEL), B(1.32, 1.3, .5, .24, .1, .1, PAPEL), B(.3, 1.38, .5, .16, .12, .1, PAPEL), B(1.54, 1.38, .5, .16, .12, .1, PAPEL), B(.7, 1.3, .36, .6, .12, .5, T1)]; } },
    { k: 'urso', nome: 'Urso Dorminhoco', bio: 'O urso do mercado, de pijama. Acorda só pra avisar que vai cair, toma um café e volta a dormir. Nunca errou um alarme.', bl: () => { const U1 = '#8E6B45', PJ = LILAS; return [B(.66, .3, .36, .68, .55, .42, PJ), B(.74, .34, .78, .1, .1, .02, PAPEL), B(1.08, .34, .78, .1, .1, .02, PAPEL), B(.9, .5, .78, .1, .1, .02, PAPEL), B(.5, .62, .5, .18, .2, .5, PJ), B(1.32, .62, .5, .18, .2, .5, PJ), B(.54, .64, .98, .14, .14, .14, U1), B(1.3, .64, .98, .18, .2, .18, PAPEL), B(1.34, .84, 1.02, .1, .04, .1, '#5A3A1E'), B(.64, .85, .34, .72, .54, .6, U1), B(.84, .9, .94, .32, .18, .06, '#B49472'), B(.96, .98, 1.0, .08, .06, .01, INK), B(.78, 1.16, .9, .14, .03, .02, INK), B(1.08, 1.16, .9, .14, .03, .02, INK), B(.6, 1.34, .4, .16, .14, .16, U1), B(1.24, 1.34, .4, .16, .14, .16, U1), B(.86, 1.38, .44, .28, .1, .36, '#5B3D8A')]; } }
  ];
  const AGENTE = {}; AGENTES.forEach(a => { AGENTE[a.k] = a; });
  const agenteDe = dono => { const f = dono && dono.ferramentas && typeof dono.ferramentas === 'object' ? dono.ferramentas : {}; return AGENTE[f.agente] ? f.agente : 'zecaixa'; };
  /* ---------- as plantas: a padrão (todo mundo); a do @consanans (o templo, v3.81) e a do @jeydiaz (a mansão, v3.80) ficam lá embaixo ---------- */
  /* v4.17 · a prateleira do Coringa (o Thales: "ao finalizar adicionar no corre dentro do quarto de todas as casas"):
     na parede do quarto, o boneco de corda sentado (roupa roxa, cabelo verde: a exceção que o Thales pediu) do lado da caixa do jogo. É
     decoração fixa de parede (não ocupa chão: não briga com o móvel de ninguém), com a ação "coringa", que abre o jogo
     na moldura (JOGOS.coringa no verso.js), pro dono e pra quem visita. Os blocos são pra parede de frente pra x+;
     eixo 'z' gira pra parede de frente pra z+ (o fundo fica a menos de .3 da parede: o jeito de chegar é o das outras
     coisas de parede, .9 pra frente) */
  function prateleiraCoringa(x, z, y, eixo){
    const RX = '#7B3FC4', RXE = '#4E2386', CAB = '#3FC24A', CARA = '#F6EEE2';
    const bl = [B(0, 1.22, 0, .28, .05, 1.2, MAD), B(0, 1.02, .12, .2, .2, .04, MAD_E), B(0, 1.02, 1.04, .2, .2, .04, MAD_E),
      /* o boneco sentado, as pernas pra frente */
      B(.08, 1.27, .26, .17, .06, .08, RX), B(.08, 1.27, .4, .17, .06, .08, RXE), B(.24, 1.27, .25, .04, .09, .1, INK), B(.24, 1.27, .39, .04, .09, .1, INK),
      B(.03, 1.27, .25, .12, .17, .24, RX), B(.15, 1.31, .25, .005, .025, .24, RXE), B(.15, 1.37, .25, .005, .025, .24, RXE),
      B(.05, 1.33, .21, .08, .1, .04, RXE), B(.05, 1.33, .49, .08, .1, .04, RXE), B(.08, 1.3, .21, .05, .04, .04, CARA), B(.08, 1.3, .49, .05, .04, .04, CARA),
      B(0, 1.34, .35, .03, .05, .04, OURO),
      B(.03, 1.44, .29, .12, .12, .16, CARA), B(.02, 1.47, .25, .1, .08, .04, CAB), B(.02, 1.47, .45, .1, .08, .04, CAB), B(0, 1.46, .29, .03, .1, .16, CAB),
      B(.15, 1.5, .3, .005, .025, .14, INK), B(.152, 1.505, .33, .003, .014, .02, PAPEL), B(.152, 1.505, .41, .003, .014, .02, PAPEL),
      B(.15, 1.475, .36, .02, .02, .02, VERM), B(.15, 1.455, .33, .004, .012, .08, VERM), B(.15, 1.462, .32, .004, .014, .014, VERM), B(.15, 1.462, .406, .004, .014, .014, VERM),
      B(.03, 1.56, .29, .12, .02, .16, AMARELO), B(.05, 1.58, .27, .08, .08, .07, RX), B(.05, 1.58, .42, .08, .08, .07, AMARELO), B(.06, 1.62, .21, .05, .05, .05, OURO), B(.06, 1.62, .5, .05, .05, .05, OURO),
      /* a caixa do jogo e uma carta de baralho encostada */
      B(.04, 1.27, .64, .2, .3, .36, VERM), B(.24, 1.33, .68, .005, .18, .28, PAPEL), B(.245, 1.45, .71, .004, .03, .22, INK), B(.245, 1.37, .79, .004, .06, .06, VERM),
      B(.06, 1.27, 1.04, .02, .2, .14, PAPEL), B(.08, 1.33, 1.08, .003, .05, .05, VERM)];
    return { x, z, y: y || 0, parede: true, acao: 'coringa', bl: eixo === 'z' ? bl.map(b => B(b.z, b.y, b.x, b.d, b.h, b.w, b.c)) : bl };
  }
  const PLANTA_PADRAO = { k: 'padrao', W: 20, D: 20, ALT: 2.8, comodos: COMODOS_PADRAO, paredes: PAREDES_PADRAO, entrada: { x: 10, z: 20 }, padrao: PADRAO_PADRAO, tapete: { x: 9.3, z: 18.8, w: 1.4, d: 1 },
    /* v4.17: a prateleira do Coringa na parede da cozinha, do lado de dentro do quarto (entre a cama e o guarda-roupa) */
    decor: [prateleiraCoringa(7.16, 7.9)] };
  function ITEM_MESA_DJ(){ return M.blocos(ITEM.mesa_dj, 0); }
  const ehDoFundador = dono => !!dono && (dono.handle === 'consanans' || (C.fundadorId && dono.id === C.fundadorId()) || (C.ehFundador && C.ehFundador() && dono.id === (C.st.me && C.st.me.id)));
  /* v3.80: casa com planta própria pelo @ (ou pelo id, se o @ mudar): a mansão brutalista do @jeydiaz e, desde a 3.86, a do @playboy */
  const PLANTA_DE = { jeydiaz: () => PLANTA_BRUTAL, '673d15ac-ac78-4493-8abe-8a82f498a109': () => PLANTA_BRUTAL,
    /* v3.86: a mansão de 20 milhões do @playboy */
    playboy: () => PLANTA_LUXO };
  Object.setPrototypeOf(PLANTA_DE, null);
  const plantaDe = dono => { if(ehDoFundador(dono)) return PLANTA_TEMPLO; const f = dono && (PLANTA_DE[String(dono.handle || '').toLowerCase()] || PLANTA_DE[String(dono.id || '')]); return f ? f() : PLANTA_PADRAO; };
  function usaPlanta(pl){ PL = pl; W = pl.W; D = pl.D; ALT = pl.ALT; COMODOS = pl.comodos; PAREDES = pl.paredes; ENTRADA = pl.entrada; PADRAO = pl.padrao; }
  usaPlanta(PLANTA_PADRAO);

  /* ---------- v3.45 · os lugares: as ferramentas da Feira viram construção onde a gente entra ----------
     Cada barraca vira a porta de um lugar 3D, no mesmo jeito de blocos da casa, onde a ferramenta mora (o Thales pediu:
     "o cara entra numa casa personalizada do Hórus e vê a ferramenta lá dentro"). Lugar é público: todo mundo que
     entra se vê lá dentro (a sala da presença é "lugar-<id>") e ninguém decora. O primeiro é o Hórus, por dentro um
     templo egípcio do jeito rosacruz (a foto que o Thales mandou): piso de terracota, no meio o tablado de mosaico com
     a borda de dentes de serra preto e branco, a passadeira vermelha, o cordão dourado e um poste de lótus em cada
     canto; colunas de papiro, bancos dourados nas laterais, os degraus do Oriente com o púlpito, paredes creme com
     gente e deuses pintados e o friso azul com o sol alado. O altar do meio é o radar: o triângulo de ouro com as
     três velas em volta da tela, e tocar nele abre o Hórus no balcão. Nada de verde: terracota, creme, ouro, preto,
     o vermelho da passadeira e o azul egípcio */
  const CREME = '#E6D7B4', CREME2 = '#DCCAA2', TERRA = '#7E3A28', MARMORE = '#EEE8DA', PRETO = '#15161A', VINHO = '#8E1B2C', SOL = '#B4152E';
  const AZUL_EG = '#2F5DA8', FRISO = '#1C2350', PELE = '#A4532F', LINHO = '#F4EFE6', BANCO = '#C9A24E', BANCO2 = '#B08A3E', BANCO_P = '#4A2E1E', TELA = '#0E2238';
  /* o chão do templo: polígonos desenhados logo depois do piso, na ordem (o mosaico não briga com nada) */
  const ret = (x0, z0, x1, z1, c) => ({ pts: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], c });
  function serra(x0, z0, x1, z1, alt){
    /* dentes pretos com a base na beirada de fora da faixa branca, apontando pra dentro */
    const out = [], lado = (a, b, dir, fixo, n) => { const s = (b - a) / n; for(let i = 0; i < n; i++){ const p = a + i * s; out.push(dir === 'x' ? { pts: [[p, fixo], [p + s, fixo], [p + s / 2, fixo + alt]], c: PRETO } : { pts: [[fixo, p], [fixo, p + s], [fixo + alt, p + s / 2]], c: PRETO }); } };
    const nx = Math.round((x1 - x0) / .55), nz = Math.round((z1 - z0) / .55);
    lado(x0, x1, 'x', z0, nx); lado(x0, x1, 'x', z1, nx); out.slice(-nx).forEach(t => { t.pts[2][1] = z1 - alt; });
    lado(z0, z1, 'z', x0, nz); lado(z0, z1, 'z', x1, nz); out.slice(-nz).forEach(t => { t.pts[2][0] = x1 - alt; });
    return out;
  }
  const CHAO_HORUS = [
    ret(3.6, 3.6, 10.4, 9.6, PRETO), ret(3.7, 3.7, 10.3, 9.5, MARMORE), ...serra(3.7, 3.7, 10.3, 9.5, .42), ret(4.2, 4.2, 9.8, 9, '#1E1F25'),
    /* a passadeira vermelha: da porta até o pé dos degraus do Oriente, com borda de ouro */
    ret(6.45, 2.4, 7.55, 13.95, VINHO), ret(6.45, 2.4, 6.53, 13.95, OURO), ret(7.47, 2.4, 7.55, 13.95, OURO)
  ];
  /* o altar do meio (é a estação do radar): degrau preto, pedestal de mármore e, em cima, a tela do radar dentro
     do triângulo de ouro, com uma vela em cada ponta (a ponta mira o Oriente) */
  const anel = (x0, z0, t, y, c) => [B(x0, y, z0, t, .012, .04, c), B(x0, y, z0 + t - .04, t, .012, .04, c), B(x0, y, z0, .04, .012, t, c), B(x0 + t - .04, y, z0, .04, .012, t, c)];
  const vela = (x, z, y) => [B(x - .05, y, z - .05, .1, .3, .1, LINHO), B(x - .03, y + .3, z - .03, .06, .1, .06, AMARELO), B(x - .015, y + .4, z - .015, .03, .05, .03, LARANJA)];
  const traco = (ax, az, bx, bz, y, c) => { const L = Math.hypot(bx - ax, bz - az), mx = (ax + bx) / 2, mz = (az + bz) / 2; return Object.assign(B(mx - L / 2, y, mz - .025, L, .015, .05, c), { yaw: Math.atan2(-(bz - az), bx - ax) }); };
  const TRI = [[1.4, .78], [.73, 1.94], [2.07, 1.94]];
  const RADAR = [
    B(.2, 0, .2, 2.4, .14, 2.4, PRETO), B(.45, .14, .45, 1.9, .12, 1.9, '#2A2B31'),
    B(.75, .26, .75, 1.3, .36, 1.3, MARMORE), B(.72, .62, .72, 1.36, .06, 1.36, OURO), B(.75, .68, .75, 1.3, .14, 1.3, MARMORE),
    B(.62, .82, .62, 1.56, .06, 1.56, MARMORE), B(.72, .88, .72, 1.36, .01, 1.36, TELA),
    ...anel(.8, .8, 1.2, .89, '#B39A2E'), ...anel(1.1, 1.1, .6, .89, '#B39A2E'),
    B(.8, .891, 1.38, 1.2, .012, .04, '#6E5E22'), B(1.38, .891, .8, .04, .012, 1.2, '#6E5E22'),
    Object.assign(B(1.4, .9, 1.36, .55, .012, .07, ROSA), { yaw: .65 }), B(1.35, .9, 1.35, .1, .03, .1, AMARELO),
    B(.95, .9, 1.05, .08, .03, .08, PAPEL), B(1.75, .9, 1.15, .08, .03, .08, ROSA), B(1.8, .9, 1.7, .08, .03, .08, PAPEL), B(1.05, .9, 1.75, .08, .03, .08, ROSA),
    traco(TRI[0][0], TRI[0][1], TRI[1][0], TRI[1][1], .905, OURO), traco(TRI[0][0], TRI[0][1], TRI[2][0], TRI[2][1], .905, OURO), traco(TRI[1][0], TRI[1][1], TRI[2][0], TRI[2][1], .905, OURO),
    ...TRI.flatMap(([x, z]) => vela(x, z, .88))
  ];
  /* os postes de lótus dos cantos do tablado, os pedestais do cordão e o cordão (com a passagem na frente) */
  const poste = (x, z) => [B(x - .16, 0, z - .16, .32, .08, .32, PRETO), B(x - .05, .08, z - .05, .1, 2.7, .1, PRETO), B(x - .09, 2.78, z - .09, .18, .1, .18, PRETO),
    B(x - .12, 2.88, z - .12, .24, .12, .24, MARMORE), B(x - .17, 3, z - .17, .34, .14, .34, MARMORE), B(x - .22, 3.14, z - .22, .44, .14, .44, MARMORE), B(x - .13, 3.28, z - .13, .26, .04, .26, AMARELO)];
  const pino = (x, z) => [B(x - .09, 0, z - .09, .18, .03, .18, OURO), B(x - .03, .03, z - .03, .06, .62, .06, OURO), B(x - .05, .65, z - .05, .1, .07, .1, OURO)];
  const CORDA = '#7A1F2E', cordaX = (x0, x1, z) => B(x0, .56, z - .02, x1 - x0, .045, .04, CORDA), cordaZ = (z0, z1, x) => B(x - .02, .56, z0, .04, .045, z1 - z0, CORDA);
  /* coluna de papiro: base preta, fuste de mármore com faixas, capitel que abre em leque e o ábaco escuro */
  const colunaEg = () => [B(0, 0, 0, .8, .18, .8, PRETO), B(.12, .18, .12, .56, .27, .56, MARMORE), B(.1, .45, .1, .6, .07, .6, PRETO), B(.1, .52, .1, .6, .04, .6, OURO),
    B(.12, .56, .12, .56, 2.19, .56, MARMORE), B(.1, 2.75, .1, .6, .06, .6, AZUL_EG), B(.1, 2.81, .1, .6, .05, .6, SOL), B(.1, 2.86, .1, .6, .04, .6, OURO),
    B(.06, 2.9, .06, .68, .18, .68, MARMORE), B(0, 3.08, 0, .8, .2, .8, MARMORE), B(-.04, 3.28, -.04, .88, .05, .88, AZUL_EG), B(-.06, 3.33, -.06, .92, .14, .92, '#2A2B31')];
  /* gente e deuses pintados na parede, de perfil, andando pro Oriente (pro fundo). [u, v, w, h, cor] em metros */
  const CORPO = [[.2, 0, .07, .48, PELE], [.33, 0, .07, .48, PELE], [.15, .48, .32, .28, LINHO], [.15, .76, .32, .05, OURO], [.2, .81, .22, .34, PELE], [.13, .82, .07, .33, PELE],
    [.42, .98, .18, .07, PELE], [.16, 1.15, .3, .09, AZUL_EG], [.6, .2, .04, 1.4, OURO], [.56, 1.6, .12, .05, OURO]];
  const CABECA = {
    farao: [[.26, 1.24, .16, .22, PELE], [.42, 1.3, .03, .05, PELE], [.16, 1.24, .1, .3, PRETO], [.16, 1.46, .26, .08, PRETO], [.2, 1.54, .16, .12, SOL]],
    horus: [[.2, 1.24, .22, .12, PRETO], [.2, 1.36, .12, .05, PRETO], [.32, 1.36, .05, .05, AMARELO], [.37, 1.36, .05, .05, PRETO], [.2, 1.41, .22, .09, PRETO], [.42, 1.31, .07, .06, OURO], [.2, 1.5, .22, .2, SOL]],
    sacerdote: [[.26, 1.24, .16, .24, PELE], [.42, 1.3, .03, .05, PELE], [.2, 1.24, .06, .24, PELE], [.2, 1.48, .22, .05, PRETO]]
  };
  const GLIFOS = [[.04, .1, AZUL_EG], [.12, .06, PRETO], [.08, .12, SOL], [.12, .05, OURO], [.06, .1, PRETO], [.1, .08, AZUL_EG]];
  /* u corre ao longo da parede, espelhado (todos olham pro fundo); o hieróglifo vai numa coluna logo atrás de cada um */
  function pintura(z0, tipo){
    const out = [], poe = (u, v, w, h, c) => out.push(B(0, 1.3 + v, z0 + (.7 - u - w), .02, h, w, c));
    CORPO.concat(CABECA[tipo]).forEach(q => poe(...q));
    GLIFOS.forEach(([w, h, c], i) => poe(-.35 + (.18 - w) / 2, .2 + i * .24, w, h, c));
    return out;
  }
  /* o friso azul do alto das laterais; os quadradinhos ficam na frente da faixa (esq = pra dentro é +x) */
  const friso = esq => {
    const out = [B(0, 3.55, .2, .03, .6, 13.6, FRISO), B(0, 3.48, .2, .03, .05, 13.6, OURO)];
    for(let i = 0; i < 30; i++) out.push(B(esq ? .03 : -.015, 3.7, .32 + i * .45, .015, .26, .2, [OURO, SOL, OURO, AZUL_EG][i % 4]));
    return out;
  };
  /* bancos dourados no tablado de cada lateral (entre as colunas), encosto na parede */
  const TRECHOS = [[.5, 2.4], [3.6, 6], [7.2, 9.6], [10.8, 13.3]];
  const bancos = esq => {
    const out = [], X = esq ? .15 : 12.65, sx = esq ? .35 : 13.05, bx = esq ? .15 : 13.65;
    out.push(B(X, 0, .3, 1.2, .16, 13.2, '#5E2A1E'));
    TRECHOS.forEach(([a, b]) => { const L = b - a; out.push(B(sx, .16, a, .6, .3, L, BANCO_P), B(sx, .46, a, .6, .07, L, BANCO), B(bx, .16, a, .2, 1, L, BANCO2), B(bx, 1.16, a, .2, .05, L, BANCO_P)); });
    return out;
  };
  const falcao = () => [B(0, 0, 0, 1, .95, 1, PRETO), B(.05, .95, .05, .9, .06, .9, OURO), B(.3, 1.01, .32, .4, .7, .42, '#2A2B31'), B(.32, 1.71, .38, .36, .32, .34, '#2A2B31'),
    B(.44, 1.74, .72, .14, .1, .16, OURO), B(.33, 1.86, .7, .06, .05, .02, AMARELO), B(.61, 1.86, .7, .06, .05, .02, AMARELO), B(.2, 1.1, .3, .12, .5, .4, PRETO), B(.68, 1.1, .3, .12, .5, .4, PRETO), B(.32, 2.03, .45, .36, .2, .2, SOL)];
  const castical = r => [B(r - .12, .3, .6, .24, .06, .24, OURO), B(r - .03, .36, .69, .06, 1.1, .06, OURO), B(r - .1, 1.46, .62, .2, .05, .2, OURO), ...vela(r, .72, 1.51)];
  const HORUS_DECOR = [
    /* o Oriente: degrau e estrado de mármore, o púlpito com o pano vermelho (a cruz de ouro e a rosa) e dois castiçais */
    { x: 3.4, z: .2, bl: [B(0, 0, 0, 7.2, .3, 1.7, MARMORE), B(.6, 0, 1.7, 6, .15, .55, MARMORE), B(1.4, 0, 2.25, 4.4, .06, .2, CREME2),
      B(3.2, .3, .45, .8, 1, .5, MARMORE), B(3.15, 1.3, .4, .9, .07, .6, OURO), B(3.35, .55, .95, .5, .6, .02, VINHO),
      B(3.57, .66, .97, .06, .4, .01, OURO), B(3.45, .8, .97, .3, .06, .01, OURO), B(3.565, .79, .98, .07, .08, .01, ROSA),
      ...castical(1), ...castical(6.2)] },
    /* o olho de Hórus num nicho azul com moldura de ouro, na parede do fundo */
    { x: 3.8, z: .15, parede: true, bl: [B(0, 1.45, 0, 6.4, 2.05, .04, FRISO), B(0, 3.44, .04, 6.4, .06, .02, OURO), B(0, 1.45, .04, 6.4, .06, .02, OURO), B(0, 1.51, .04, .06, 1.93, .02, OURO), B(6.34, 1.51, .04, .06, 1.93, .02, OURO),
      ...[[.7, 3.05, 4.6, .16], [.9, 2.7, 4.2, .14], [1.3, 2.1, 3.2, .12], [.75, 2.22, .55, .12], [.85, 2.34, .14, .3], [4.95, 2.32, .8, .12], [4.5, 2.22, .5, .45],
        [2.6, 1.6, .16, .5], [2.6, 1.6, .72, .12], [3.18, 1.6, .14, .3], [4.35, 1.85, .14, .37], [4.35, 1.73, .95, .12], [5.16, 1.73, .14, .4]].map(([x, y, w, h]) => B(x, y, .04, w, h, .02, OURO)),
      B(2.25, 2.22, .04, 1.3, .48, .02, MARMORE), B(2.62, 2.28, .06, .56, .36, .01, PRETO), B(2.7, 2.48, .07, .14, .1, .01, PAPEL)] },
    /* o friso azul do alto, com o sol alado em cima do Oriente */
    { x: 0, z: .15, parede: true, bl: [B(.2, 3.55, 0, 13.6, .6, .03, FRISO), B(.2, 3.48, 0, 13.6, .05, .03, OURO),
      B(6.72, 3.66, .03, .56, .4, .02, SOL), B(4.6, 3.84, .03, 2.1, .14, .02, OURO), B(5, 3.72, .03, 1.7, .1, .02, OURO), B(5.5, 3.62, .03, 1.2, .08, .02, OURO),
      B(7.3, 3.84, .03, 2.1, .14, .02, OURO), B(7.3, 3.72, .03, 1.7, .1, .02, OURO), B(7.3, 3.62, .03, 1.2, .08, .02, OURO),
      ...Array.from({ length: 10 }, (_, i) => B(.5 + i * .4, 3.74, .03, .2, .22, .015, [OURO, SOL, OURO, AZUL_EG][i % 4])), ...Array.from({ length: 10 }, (_, i) => B(9.7 + i * .4, 3.74, .03, .2, .22, .015, [AZUL_EG, OURO, SOL, OURO][i % 4]))] },
    { x: .15, z: 0, parede: true, bl: friso(true) }, { x: 13.82, z: 0, parede: true, bl: friso(false) },
    /* as pinturas das laterais, entre as colunas */
    { x: .15, z: 0, parede: true, bl: [...pintura(1.2, 'farao'), ...pintura(4.6, 'horus'), ...pintura(8.2, 'sacerdote'), ...pintura(11.7, 'horus')] },
    { x: 13.82, z: 0, parede: true, bl: [...pintura(1.2, 'horus'), ...pintura(4.6, 'sacerdote'), ...pintura(8.2, 'horus'), ...pintura(11.7, 'farao')] },
    /* as colunas de papiro (três de cada lado) e os bancos */
    ...[2.6, 6.2, 9.8].flatMap(z => [{ x: 1.55, z, bl: colunaEg() }, { x: 11.65, z, bl: colunaEg() }]),
    { x: 0, z: 0, bl: bancos(true) }, { x: 0, z: 0, bl: bancos(false) },
    /* os falcões de Hórus, um de cada lado do Oriente */
    { x: 2.2, z: .45, bl: falcao() }, { x: 10.8, z: .45, bl: falcao() },
    /* o tablado: os quatro postes de lótus nos cantos e o cordão dourado em volta, aberto na frente pra passadeira */
    { x: 0, z: 0, bl: [...poste(3.3, 3.3), ...poste(10.7, 3.3), ...poste(3.3, 9.9), ...poste(10.7, 9.9),
      ...[[5.15, 3.3], [7, 3.3], [8.85, 3.3], [3.3, 5.5], [3.3, 7.7], [10.7, 5.5], [10.7, 7.7], [4.7, 9.9], [6.1, 9.9], [7.9, 9.9], [9.3, 9.9]].flatMap(([x, z]) => pino(x, z)),
      cordaX(3.3, 10.7, 3.3), cordaZ(3.3, 9.9, 3.3), cordaZ(3.3, 9.9, 10.7), cordaX(3.3, 6.1, 9.9), cordaX(7.9, 10.7, 9.9)] }
  ];
  const PLANTA_HORUS = {
    k: 'lugar-horus', W: 14, D: 14, ALT: 4.2,
    comodos: [{ k: 'templo', nome: 'O templo', x0: 0, z0: 0, x1: 14, z1: 14, piso: TERRA, linha: 'rgba(25,8,3,.32)' }],
    paredes: [
      { a: [0, 14], b: [14, 14], ext: [0, 1], portas: [[6.4, 7.6]], entrada: true, cor: CREME },
      { a: [14, 0], b: [14, 14], ext: [1, 0], cor: CREME },
      { a: [0, 0], b: [0, 14], ext: [-1, 0], cor: CREME },
      { a: [0, 0], b: [14, 0], ext: [0, -1], cor: CREME2 }
    ],
    entrada: { x: 7, z: 14 }, tapete: { x: 6.3, z: 12.8, w: 1.4, d: 1 }, decor: HORUS_DECOR, chao: CHAO_HORUS, padrao: []
  };
  /* ---------- v3.46 · mais lugares da Feira: cada ferramenta vira uma construção com a cara dela ----------
     O Estúdio (Studio), o Balcão (Vendas), o Cofre (Grana) e a Galeria (Portfólio e catálogo). O mesmo motor do templo:
     planta, decoração fixa e a estação que abre a ferramenta no balcão; e agora também móveis do catálogo da casa
     (itens, no formato da casa: [k, x, z, giro, andar, cor]), que aparecem do mesmo jeito pra todo mundo */
  const salaDe = o => ({ k: 'lugar-' + o.k, W: o.W, D: o.D, ALT: o.ALT || 3.6,
    comodos: [{ k: o.k, nome: o.nome, x0: 0, z0: 0, x1: o.W, z1: o.D, piso: o.piso, piso2: o.piso2, xadrez: !!o.piso2, linha: o.linha }],
    paredes: [
      { a: [0, o.D], b: [o.W, o.D], ext: [0, 1], portas: [[o.W / 2 - .6, o.W / 2 + .6]], entrada: true, cor: o.parede },
      { a: [o.W, 0], b: [o.W, o.D], ext: [1, 0], cor: o.parede, altas: o.altasD },
      { a: [0, 0], b: [0, o.D], ext: [-1, 0], cor: o.parede, altas: o.altasE },
      { a: [0, 0], b: [o.W, 0], ext: [0, -1], cor: o.fundo || o.parede }
    ],
    entrada: { x: o.W / 2, z: o.D }, decor: o.decor || [], chao: o.chao, padrao: [] });
  /* um quadro de pintura na parede: [u, v, w, h, cor] a partir do canto de baixo; fundo = a tela. Na parede do fundo
     (eixo x) ou numa lateral (eixo z, com o lado que olha pra dentro: +1 na esquerda, -1 na direita) */
  const pintaTela = (u0, v0, w, h, fundo, formas, eixo, lado) => {
    const out = [], poe = (u, v, ww, hh, c, prof, d0) => out.push(eixo === 'z'
      ? B(lado > 0 ? d0 : -d0 - prof, v0 + v, u0 + u, prof, hh, ww, c)
      : B(u0 + u, v0 + v, d0, ww, hh, prof, c));
    poe(0, 0, w, h, fundo, .06, 0);
    formas.forEach(([u, v, ww, hh, c]) => poe(u, v, ww, hh, c, .01, .06));
    return out;
  };
  const LUZ_S = '#FFF6CF', CYC = '#F7F5F0', ACO = '#B8BEC6', ACO_E = '#8F96A0', LASER = '#FF3B3B';

  /* o Estúdio: parede de tijolo, o fundo infinito branco com dois softboxes e a câmera no tripé, e a mesa de criação
     (a grade do feed numa tela, o calendário do mês na outra e o quadro de post-its na parede) */
  const softbox = yaw => { const pv = [0, 1.75, 0]; return [B(-.18, 0, -.18, .36, .04, .36, INK), B(-.03, .04, -.03, .06, 1.4, .06, INK),
    Object.assign(B(-.42, 1.35, -.2, .84, .8, .28, '#2B2F38'), { yaw, piv: pv }), Object.assign(B(-.38, 1.39, .08, .76, .72, .03, LUZ_S), { yaw, piv: pv })]; };
  const ESTUDIO_DECOR = [
    { x: .3, z: .15, parede: true, bl: [B(0, 0, 0, 5, 3.1, .08, CYC)] },
    { x: .3, z: .23, piso: true, bl: [B(0, 0, 0, 5, .02, 3.3, CYC)] },
    { x: .3, z: .23, bl: [B(0, 0, 0, 5, .3, .1, CYC), B(0, 0, .1, 5, .12, .14, CYC)] },
    { x: .9, z: 3.8, bl: softbox(2.43) }, { x: 4.7, z: 3.8, bl: softbox(-2.43) },
    /* a câmera no tripé, olhando pro fundo */
    { x: 2.8, z: 5.2, bl: [Object.assign(B(-.025, 0, -.025, .05, 1.24, .05, INK), { roll: .3, piv: [0, 1.22, 0] }), Object.assign(B(-.025, 0, -.025, .05, 1.24, .05, INK), { roll: -.3, piv: [0, 1.22, 0] }),
      Object.assign(B(-.025, 0, -.025, .05, 1.24, .05, INK), { pitch: .3, piv: [0, 1.22, 0] }), B(-.1, 1.2, -.1, .2, .08, .2, INK),
      B(-.18, 1.28, -.12, .36, .24, .22, '#1B1D22'), B(-.09, 1.31, -.3, .18, .18, .18, '#3A3E45'), B(-.06, 1.34, -.31, .12, .12, .01, '#5C7BD9'), B(-.06, 1.52, -.06, .12, .06, .12, INK), B(.1, 1.36, .1, .05, .05, .01, ROSA)] },
    /* o quadro do mês: post-its em cima da mesa de criação */
    { x: 7.4, z: .15, parede: true, bl: [B(0, 2, 0, 4.2, 1.3, .05, '#F4F1EA'), B(0, 3.25, .05, 4.2, .05, .01, INK),
      ...Array.from({ length: 28 }, (_, i) => B(.18 + (i % 7) * .56, 2.12 + Math.floor(i / 7) * .27, .05, .4, .2, .01, [AMARELO, ROSA, CEU, PAPEL, LILAS, AMARELO, LARANJA][(i * 3 + Math.floor(i / 7)) % 7]))] },
    /* fotos analógicas na parede da esquerda */
    { x: .15, z: 1.2, parede: true, bl: [0, 1, 2, 3].flatMap(i => [B(0, 1.5 + (i % 2) * .15, i * 1.05, .04, .62, .82, INK), B(.04, 1.56 + (i % 2) * .15, i * 1.05 + .06, .01, .5, .7, ['#C9B79C', '#7F8A96', ROSA, '#D9C9A6'][i])]) }
  ];
  const ESTUDIO_MESA = [B(0, .74, 0, 4.2, .06, 1.1, MAD), ...[[.1, .1], [4.02, .1], [.1, .92], [4.02, .92]].map(([x, z]) => B(x, 0, z, .08, .74, .08, INK)),
    B(.95, .8, .35, .1, .25, .1, INK), B(.4, 1.05, .25, 1.2, .75, .06, INK),
    ...Array.from({ length: 9 }, (_, i) => B(.5 + (i % 3) * .34, 1.12 + Math.floor(i / 3) * .21, .31, .3, .17, .01, [ROSA, AMARELO, AZUL, LARANJA, LILAS, CEU, PAPEL, ROSA, AMARELO][i])),
    B(2.65, .8, .35, .1, .25, .1, INK), B(2, 1.05, .25, 1.4, .75, .06, INK),
    ...Array.from({ length: 28 }, (_, i) => B(2.08 + (i % 7) * .185, 1.13 + Math.floor(i / 7) * .15, .31, .16, .12, .01, (i * 5) % 7 < 2 ? AMARELO : '#3A3E45')),
    B(1.1, .8, .6, 1, .03, .3, '#2B2F38'), B(2.3, .8, .7, .1, .03, .15, INK), B(3.6, .8, .4, .14, .16, .14, AMARELO), B(3.15, .8, .7, .3, .01, .25, PAPEL)];
  const PLANTA_ESTUDIO = salaDe({ k: 'studio', nome: 'O estúdio', W: 13, D: 12, ALT: 3.8, piso: '#9EA3AA', linha: 'rgba(20,24,30,.12)', parede: '#EFEAE2', fundo: TIJ, altasE: [[6, 10]], decor: ESTUDIO_DECOR });

  /* o Balcão: piso xadrez de mercadinho, o balcão comprido com a caixa registradora (o rolo de nota desce até o chão),
     prateleiras cheias no fundo, geladeira e máquina de refri na lateral e o cavalete de promoção na porta */
  /* produto de mercadinho: caixa, duas latas, duas garrafas, pote e caixa de novo; a fita amarela de preço na beira */
  const PRODUTOS = [[.3, .22, .26], [.12, .17, .12], [.12, .17, .12], [.08, .34, .08], [.08, .34, .08], [.18, .16, .18], [.28, .26, .22]];
  const gondola = x0 => [B(x0, 0, .15, .08, 2.6, .5, MAD), B(x0 + 1.72, 0, .15, .08, 2.6, .5, MAD),
    ...[.4, 1, 1.6, 2.2].flatMap((y, k) => { const out = [B(x0, y, .15, 1.8, .05, .5, MAD), B(x0 + .08, y - .05, .65, 1.64, .05, .01, AMARELO)]; let x = x0 + .12;
      PRODUTOS.forEach(([w, h, d], i) => { out.push(B(x, y + .05, .4 - d / 2 + .02, w, h, d, [LARANJA, '#E2412E', '#E2412E', PAPEL, PAPEL, AZUL, AMARELO, ROSA, LILAS][(i + k * 3) % 9])); x += w + .04; }); return out; })];
  const BALCAO_DECOR = [
    { x: 2, z: 3.4, bl: [B(0, 0, 0, 8, .95, .8, MAD_E), B(0, .55, .8, 8, .14, .015, LARANJA), B(-.05, .95, -.05, 8.1, .06, .9, CINZA)] },
    { x: 0, z: 0, bl: [...gondola(.6), ...gondola(2.6), ...gondola(7.6), ...gondola(9.6)] },
    /* o rolo de nota fiscal que desce do caixa e enrola no chão */
    { x: 0, z: 0, bl: [B(5.55, .1, 4.255, .18, .84, .01, PAPEL), B(5.55, 0, 4.27, .18, .01, .75, PAPEL), B(5.55, .01, 4.95, .18, .08, .08, PAPEL)] },
    { x: 7.6, z: 8.6, bl: [B(0, 0, 0, .08, 1.05, .08, MAD), B(.66, 0, 0, .08, 1.05, .08, MAD), B(0, .3, .04, .74, .7, .05, '#2B2F38'), B(.12, .82, .09, .5, .05, .01, PAPEL), B(.12, .66, .09, .36, .05, .01, LARANJA), B(.12, .5, .09, .44, .05, .01, PAPEL)] }
  ];
  const BALCAO_CAIXA = [B(.1, 1.01, .05, 1.2, .32, .6, '#3A3E45'), B(.15, 1.33, .35, 1.1, .08, .3, '#2B2F38'),
    ...Array.from({ length: 12 }, (_, i) => B(.22 + (i % 4) * .26, 1.41, .38 + Math.floor(i / 4) * .085, .2, .02, .06, i === 3 ? LARANJA : PAPEL)),
    B(.35, 1.33, .05, .7, .3, .08, INK), B(.42, 1.39, .13, .56, .16, .01, LARANJA), B(.15, 1.05, .65, 1.1, .14, .01, '#4A4E56'), B(.6, 1.1, .66, .2, .04, .01, CINZA), B(.25, 1.33, .18, .18, .04, .2, PAPEL)];
  const PLANTA_BALCAO = salaDe({ k: 'vendas', nome: 'O balcão', W: 12, D: 11, ALT: 3.4, piso: '#EEE8DA', piso2: '#D9C9A6', linha: 'rgba(60,50,40,.1)', parede: '#F2D8A7', fundo: '#F4F1EA', decor: BALCAO_DECOR });

  /* o Cofre: a porta redonda de aço no fundo (é a estação), as caixas de depósito nas laterais, as barras de ouro no
     meio com o laser em volta e a Capi de ouro de guarda na porta */
  function portaCofre(){
    const out = [], cx = 1.8, cy = 1.85, R = 1.6, r = 1.25;
    for(let y = cy - R + .1; y < cy + R - .05; y += .2){ const dy = y + .1 - cy, h = Math.sqrt(Math.max(0, R * R - dy * dy)); out.push(B(cx - h, y, 0, h * 2, .2, .12, ACO)); }
    for(let y = cy - r + .1; y < cy + r - .05; y += .2){ const dy = y + .1 - cy, h = Math.sqrt(Math.max(0, r * r - dy * dy)); out.push(B(cx - h, y, .12, h * 2, .2, .08, '#C9CDD3')); }
    out.push(B(cx - .26, cy - .26, .2, .52, .52, .06, ACO_E), B(cx - .9, cy - .05, .26, 1.8, .1, .05, OURO), B(cx - .05, cy - .9, .26, .1, 1.8, .05, OURO));
    [[-.9, 0], [.9, 0], [0, -.9], [0, .9]].forEach(([dx, dy]) => out.push(B(cx + dx - .08, cy + dy - .08, .3, .16, .16, .06, OURO)));
    for(let i = 0; i < 12; i++){ const a = i / 12 * Math.PI * 2; out.push(B(cx + Math.cos(a) * 1.42 - .05, cy + Math.sin(a) * 1.42 - .05, .12, .1, .1, .04, OURO)); }
    out.push(B(cx - R - .12, cy - .8, 0, .22, 1.6, .2, '#5C6470'));
    return out;
  }
  const caixasDeposito = esq => { const out = []; for(let i = 0; i < 6; i++) for(let j = 0; j < 4; j++){ const z = 2.2 + i * 1.2, y = .5 + j * .55;
    out.push(B(esq ? 0 : -.05, y, z, .05, .48, 1.1, ACO), B(esq ? .05 : -.08, y + .2, z + .48, .03, .08, .14, OURO)); } return out; };
  const barras = () => { const out = [B(0, 0, 0, 2.8, .15, 2, MAD_E)]; [[5, .2, .15], [4, .42, .45], [3, .64, .75]].forEach(([n, x0, y], k) => {
    for(let i = 0; i < n; i++) out.push(B(x0 + i * .48, y, .2 + k * .2, .44, .3, 1.6 - k * .4, i % 2 ? '#F2C94C' : OURO)); }); return out; };
  const cercaLaser = (x0, z0, x1, z1) => { const out = [], pino2 = (x, z) => [B(x - .06, 0, z - .06, .12, .9, .12, ACO), B(x - .08, .9, z - .08, .16, .06, .16, ACO_E)];
    [[x0, z0], [x1, z0], [x0, z1], [x1, z1]].forEach(([x, z]) => out.push(...pino2(x, z)));
    [.35, .7].forEach(y => out.push(B(x0, y, z0 - .01, x1 - x0, .015, .02, LASER), B(x0, y, z1 - .01, x1 - x0, .015, .02, LASER), B(x0 - .01, y, z0, .02, .015, z1 - z0, LASER), B(x1 - .01, y, z0, .02, .015, z1 - z0, LASER)));
    return out; };
  const COFRE_DECOR = [
    { x: .15, z: 0, parede: true, bl: caixasDeposito(true) }, { x: 11.85, z: 0, parede: true, bl: caixasDeposito(false) },
    { x: 4.6, z: 5.4, bl: barras() }, { x: 0, z: 0, bl: cercaLaser(4.2, 5, 7.8, 7.8) },
    /* o tapete de veludo da porta até a porta do cofre */
    { x: 5.4, z: 2.2, piso: true, bl: [B(0, 0, 0, 1.2, .02, 2.6, '#5A1830')] }, { x: 5.4, z: 8.2, piso: true, bl: [B(0, 0, 0, 1.2, .02, 3.6, '#5A1830')] }
  ];
  const PLANTA_COFRE = salaDe({ k: 'grana', nome: 'O cofre', W: 12, D: 12, ALT: 3.8, piso: '#2B2F38', linha: 'rgba(231,183,52,.16)', parede: '#9AA1AB', fundo: '#7F8792', decor: COFRE_DECOR });

  /* a Galeria: paredes brancas com telas originais (formas e cores do Corre, sem copiar artista nenhum), plaquinha
     embaixo de cada uma, pedestais com peças (o tênis, a escultura de blocos, o produto) e, no meio, o catálogo aberto */
  const pedestal = topo => [B(0, 0, 0, .7, .9, .7, PAPEL), B(-.03, .9, -.03, .76, .04, .76, '#E6E2DA'), ...topo];
  const plaquinha = (x, y, z, eixo, lado) => eixo === 'z' ? [B(lado > 0 ? 0 : -.02, y, z, .02, .12, .22, PAPEL), B(lado > 0 ? .02 : -.03, y + .04, z + .04, .01, .02, .14, INK)] : [B(x, y, 0, .22, .12, .02, PAPEL), B(x + .04, y + .04, .02, .14, .02, .01, INK)];
  const GALERIA_DECOR = [
    { x: 0, z: .15, parede: true, bl: [
      ...pintaTela(1.2, .75, 3, 2, PAPEL, [[.3, .4, 1.1, 1.2, ROSA], [.5, .6, .7, .8, '#E2412E'], [1.6, .3, 1.1, .5, AZUL], [1.6, .9, .25, .9, INK], [2.05, .9, .7, .25, AMARELO], [2.3, 1.3, .3, .3, INK]]),
      ...plaquinha(2.6, .5), ...pintaTela(5.5, .75, 3, 2, '#1B1D22', [[.3, .25, 2.4, .25, AMARELO], [.6, .5, 1.8, .25, AMARELO], [.9, .75, 1.2, .25, AMARELO], [1.2, 1, .6, .25, AMARELO], [1.95, 1.4, .35, .35, ROSA], [.25, 1.6, .5, .1, PAPEL]]),
      ...plaquinha(6.9, .5), ...pintaTela(9.8, .75, 3, 2, AMARELO, [[.2, .2, 2.6, .1, INK], [.2, .2, .1, 1.6, INK], [1.3, .2, .1, 1.6, INK], [.2, 1.1, 2.6, .1, INK], [.35, .35, .85, .7, ROSA], [1.45, 1.25, 1.2, .5, AZUL], [2.3, .4, .35, .55, PAPEL]]),
      ...plaquinha(11.2, .5), ...[2.6, 6.9, 11.2].map(x => B(x - .05, 3.2, .05, .3, .1, .35, INK))] },
    { x: .15, z: 0, parede: true, bl: [...pintaTela(3.2, 1.3, 1.8, 1.4, LILAS, [[.2, .2, .6, 1, PAPEL], [.9, .5, .7, .7, INK], [1.1, .7, .3, .3, AMARELO]], 'z', 1), ...plaquinha(0, 1.05, 4, 'z', 1),
      ...pintaTela(7, 1.3, 1.8, 1.4, ROSA, [[.15, .15, 1.5, .2, INK], [.15, .5, 1, .2, PAPEL], [.15, .85, 1.3, .2, AMARELO], [1.3, .4, .3, .7, AZUL]], 'z', 1), ...plaquinha(0, 1.05, 7.8, 'z', 1)] },
    { x: 13.85, z: 0, parede: true, bl: [...pintaTela(3.2, 1.3, 1.8, 1.4, AZUL, [[.2, .2, 1.4, 1, PAPEL], [.4, .4, 1, .6, ROSA], [.7, .55, .4, .3, AMARELO]], 'z', -1), ...plaquinha(0, 1.05, 4, 'z', -1),
      ...pintaTela(7, 1.3, 1.8, 1.4, PAPEL, [[.2, .2, .2, 1, INK], [.5, .2, .2, .7, INK], [.8, .2, .2, .4, INK], [1.1, .2, .5, .5, '#E2412E']], 'z', -1), ...plaquinha(0, 1.05, 7.8, 'z', -1)] },
    /* o tênis, a escultura de blocos e o produto */
    { x: 2.2, z: 5.4, bl: pedestal([B(.1, .94, .25, .5, .06, .22, PAPEL), B(.14, 1, .25, .32, .16, .22, ROSA), B(.46, 1, .25, .14, .09, .22, ROSA), B(.16, 1.06, .26, .12, .05, .2, PAPEL), B(.48, .97, .25, .02, .05, .22, INK)]) },
    { x: 10.9, z: 5.4, bl: pedestal([B(.2, .94, .2, .3, .3, .3, AZUL), Object.assign(B(.24, 1.24, .24, .22, .22, .22, AMARELO), { yaw: .6 }), B(.29, 1.46, .29, .12, .12, .12, ROSA)]) },
    { x: 2.2, z: 8.6, bl: pedestal([B(.12, .94, .2, .3, .38, .3, PAPEL), B(.12, 1.12, .5, .3, .08, .01, '#E2412E'), B(.5, .94, .3, .12, .3, .12, '#3A3E45'), B(.52, 1.24, .32, .08, .08, .08, '#3A3E45')]) },
    { x: 10.9, z: 8.6, bl: pedestal([B(.15, .94, .15, .4, .04, .4, INK), B(.25, .98, .25, .2, .5, .2, ROSA), B(.2, 1.48, .2, .3, .06, .3, AMARELO)]) }
  ];
  const GALERIA_CATALOGO = [B(.5, 0, .3, 1, .9, .6, PAPEL), B(.3, .9, .15, 1.4, .05, .9, '#E2412E'), B(.38, .95, .2, .6, .04, .8, PAPEL), B(1.02, .95, .2, .6, .04, .8, PAPEL), B(.98, .95, .2, .04, .05, .8, '#B4152E'),
    ...Array.from({ length: 8 }, (_, i) => B(.44 + (i % 4) * .29 + (i % 4 > 1 ? .06 : 0), .991, .27 + Math.floor(i / 4) * .36, .22, .005, .28, [ROSA, AZUL, AMARELO, INK, LILAS, '#E2412E', CEU, LARANJA][i]))];
  const PLANTA_GALERIA = salaDe({ k: 'marcas', nome: 'A galeria', W: 14, D: 12, ALT: 4, piso: '#E6E2DA', linha: 'rgba(60,50,40,.08)', parede: '#F7F5F0', decor: GALERIA_DECOR });

  /* ---------- v3.47 · o resto da Feira: o Beco (Feed), a Biblioteca (Do teu nicho), a Vitrine (Estilo de vida), a
     Escolinha (Manual) e o Cineclube (Rolo 360, só do fundador, como a barraca) ---------- */
  const sorte = n => { const v = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return v - Math.floor(v); };
  /* um disco em pé (no plano x-y), de fatias de 10 cm: a bobina do projetor */
  const discoEmPe = (cx, cy, R, z, prof, c) => { const out = []; for(let y = cy - R; y < cy + R - .02; y += .1){ const dy = y + .05 - cy, h = Math.sqrt(Math.max(0, R * R - dy * dy)); if(h > .02) out.push(B(cx - h, y, z, h * 2, .1, prof, c)); } return out; };

  /* o Beco: viela de tijolo, asfalto molhado, grafite, escada de incêndio, varal de luz e, no fundo, o paredão de
     lambe-lambe, que é o feed (cada lambe é um post: a foto, duas linhas e, de vez em quando, o coração) */
  const PAREDAO = (() => { const out = [B(-.1, .5, -.02, 8.2, 3.2, .02, '#9AA1AB')];
    for(let j = 0; j < 3; j++) for(let i = 0; i < 6; i++){
      const n = i + j * 6, u = .1 + i * 1.33 + (sorte(n) - .5) * .12, v = .7 + j * 1 + (sorte(n + 9) - .5) * .12, base = [PAPEL, '#F4F1EA', AMARELO, PAPEL, ROSA, '#EAD9A8'][n % 6], foto = [AZUL, ROSA, LARANJA, LILAS, INK, CEU, AMARELO][(n * 3) % 7];
      out.push(B(u, v, 0, 1.15, .82, .02, base), B(u + .08, v + .3, .02, .99, .44, .01, foto === base ? INK : foto), B(u + .08, v + .18, .02, .7, .05, .01, INK), B(u + .08, v + .08, .02, .45, .05, .01, '#4A4E56'));
      if(n % 3 === 1) out.push(B(u + .95, v + .08, .02, .12, .1, .01, ROSA));
    }
    return out; })();
  /* o grafite da parede da esquerda, em camadas (cada uma 1,2 cm pra fora da outra): contorno, fundo, letras, brilho, escorrido e a coroa */
  const GRAFITE = [[0, .45, 5.2, 2.05, INK], [.1, .55, 5, 1.85, ROSA], [.4, .8, .9, 1.3, AMARELO], [1.5, .8, .9, 1.45, AMARELO], [2.6, .8, .9, 1.1, AMARELO], [3.7, .8, .9, 1.35, AMARELO],
    [.7, 1.1, .3, .5, INK], [1.8, 1.3, .3, .4, INK], [2.9, 1, .3, .45, INK], [4, 1.2, .3, .5, INK], [.5, 1.95, .2, .07, PAPEL], [1.6, 2.1, .2, .07, PAPEL], [3.8, 2, .2, .07, PAPEL],
    [.9, .15, .06, .4, AZUL], [2.2, .2, .06, .35, AZUL], [3.3, .1, .06, .45, AZUL], [1.9, 2.55, .22, .3, AMARELO], [2.3, 2.62, .22, .32, AMARELO], [2.7, 2.55, .22, .3, AMARELO]];
  const BECO_DECOR = [
    { x: .15, z: 0, parede: true, bl: GRAFITE.map(([u, v, w, h, c], i) => B((i < 1 ? 0 : i < 2 ? .012 : .024), v, 6 + u, .012, h, w, c)) },
    /* a escada de incêndio da direita, com a janela atrás */
    { x: 9.85, z: 0, parede: true, bl: [B(-.03, 2.35, 3.3, .03, 1.05, 1, '#1B2A5A'), B(-.04, 2.3, 3.25, .04, .05, 1.1, INK), B(-.8, 2.2, 2.5, .8, .06, 3, '#2B2F38'), B(-.8, 2.95, 2.5, .04, .04, 3, '#2B2F38'),
      ...[2.5, 3.5, 4.5, 5.46].map(z => B(-.8, 2.26, z, .04, .7, .04, '#2B2F38')), B(-.8, 2.26, 2.5, .8, .04, .04, '#2B2F38'), B(-.8, 2.26, 5.46, .8, .04, .04, '#2B2F38'),
      B(-.7, .95, 2.65, .04, 1.25, .04, '#2B2F38'), B(-.7, .95, 3.05, .04, 1.25, .04, '#2B2F38'), ...[1.1, 1.4, 1.7, 2].map(y => B(-.7, y, 2.65, .04, .03, .44, '#2B2F38'))] },
    /* poças e o bueiro */
    { x: 2.4, z: 9, piso: true, bl: [B(0, 0, 0, 1.6, .012, .9, '#2B3550'), B(.3, 0, .9, .9, .012, .4, '#2B3550')] }, { x: 6.6, z: 3.2, piso: true, bl: [B(0, 0, 0, 1, .012, .7, '#2B3550')] },
    { x: 4.6, z: 11, piso: true, bl: [B(0, 0, 0, .7, .015, .7, '#2B2F38'), Object.assign(B(0, .015, 0, .7, .01, .7, '#4A4E56'), { yaw: Math.PI / 4 })] }
  ];
  const PLANTA_BECO = salaDe({ k: 'feed', nome: 'O beco', W: 10, D: 14, ALT: 4.2, piso: '#3A3E45', parede: TIJ, fundo: '#7F8A96', decor: BECO_DECOR });

  /* a Biblioteca: estantes até o teto com a escada de correr, a mesa comprida de referências com os abajures âmbar,
     o canto de leitura e o quadro de cortiça com as referências presas por fio vermelho (o jeito de quem investiga) */
  const LIVROS_C = ['#8E1B2C', '#2F5DA8', '#C9A24E', '#E6D7B4', '#4A2E1E', ROSA, '#1C2350', LARANJA, '#7A1F3D', PAPEL];
  const livrosRun = (x0, y, w, k) => { const out = []; let x = x0, i = 0; while(x < x0 + w - .12){ const ww = Math.min(x0 + w - x, .22 + sorte(k * 7 + i) * .36), h = .28 + sorte(k * 13 + i) * .16; out.push(B(x, y, .08, ww - .02, h, .3, LIVROS_C[(k + i * 3) % LIVROS_C.length])); x += ww; i++; } return out; };
  const estanteAlta = (x0, w, k) => [B(x0, 0, 0, .08, 3.6, .42, MAD_E), B(x0 + w - .08, 0, 0, .08, 3.6, .42, MAD_E), B(x0, 3.55, 0, w, .08, .42, MAD_E),
    ...[.1, .8, 1.5, 2.2, 2.9].flatMap((y, j) => [B(x0, y, 0, w, .05, .42, MAD_E), ...livrosRun(x0 + .1, y + .05, w - .2, k * 5 + j)])];
  const CORTICA = (() => { const out = [B(-.04, 1.2, 7, .04, 1.6, 3.2, '#B5824A'), B(-.05, 1.15, 6.95, .05, .05, 3.3, MAD_E), B(-.05, 2.8, 6.95, .05, .05, 3.3, MAD_E)];
    const cards = [[7.2, 2.15], [8, 2.3], [8.9, 2.1], [9.6, 2.25], [7.4, 1.4], [8.4, 1.5], [9.3, 1.35]];
    cards.forEach(([z, y], i) => out.push(B(-.05, y, z, .01, .42, .52, PAPEL), B(-.06, y + .06, z + .05, .01, .26, .42, [ROSA, AZUL, AMARELO, LARANJA, LILAS, '#E2412E', CEU][i]), B(-.065, y + .36, z + .23, .01, .05, .05, '#E2412E')));
    [[7.45, 2.5, .8], [8.25, 2.6, .9], [7.65, 1.75, 1.0], [8.65, 1.85, .9]].forEach(([z, y, l]) => out.push(B(-.07, y, z, .005, .015, l, '#E2412E')));
    return out; })();
  const BIBLIO_DECOR = [
    { x: .2, z: .15, bl: [...estanteAlta(0, 4.1, 1), ...estanteAlta(4.3, 4.1, 2), ...estanteAlta(8.5, 4.1, 3)] },
    { x: 0, z: 0, bl: [B(.2, 3.45, .6, 12.6, .04, .04, OURO), B(5.8, 0, .72, .05, 3.45, .05, MAD), B(6.35, 0, .72, .05, 3.45, .05, MAD), ...[.4, .75, 1.1, 1.45, 1.8, 2.15, 2.5, 2.85, 3.2].map(y => B(5.8, y, .72, .6, .04, .05, MAD))] },
    { x: 12.85, z: 0, parede: true, bl: CORTICA }
  ];
  const abajur = x => [B(x - .08, .83, .55, .16, .03, .16, OURO), B(x - .02, .86, .61, .04, .35, .04, OURO), B(x - .25, 1.18, .5, .5, .12, .26, '#C98A1E'), B(x - .2, 1.17, .52, .4, .01, .22, LUZ_S)];
  const BIBLIO_MESA = [B(0, .76, 0, 5.8, .07, 1.4, MAD_E), ...[[.1, .1], [5.6, .1], [.1, 1.2], [5.6, 1.2]].map(([x, z]) => B(x, 0, z, .1, .76, .1, MAD_E)), ...abajur(1.3), ...abajur(4.5),
    B(.4, .83, .3, .7, .02, .5, PAPEL), B(.45, .85, .35, .3, .005, .4, ROSA), B(.8, .85, .35, .28, .005, .18, AZUL), B(2.2, .83, .7, .6, .02, .45, AMARELO), B(2.25, .85, .75, .25, .005, .35, INK),
    B(3.2, .83, .3, .4, .08, .3, '#8E1B2C'), B(3.22, .91, .32, .36, .08, .26, '#2F5DA8'), B(3.18, .99, .3, .42, .07, .3, '#C9A24E'),
    B(4.9, .83, .5, .6, .03, .42, '#3A3E45'), B(4.9, .86, .47, .6, .4, .03, '#3A3E45'), B(4.95, .9, .5, .5, .32, .01, LILAS)];
  const PLANTA_BIBLIO = salaDe({ k: 'nicho', nome: 'A biblioteca', W: 13, D: 12, ALT: 4.2, piso: '#8E5B33', linha: 'rgba(40,20,5,.22)', parede: '#6B3A2A', decor: BIBLIO_DECOR });

  /* a Vitrine: o estilo de vida em exposição. Cada canto é um bloco da conta (a casa, o carro, o lazer, o luxo) e tudo
     tem etiqueta pendurada; no fundo, o quadro dos sonhos, e no meio a calculadora gigante que faz a conta do mês */
  const etiqueta = (x, z) => [B(x - .15, 0, z - .15, .3, .03, .3, INK), B(x - .03, .03, z - .03, .06, 1.1, .06, INK), B(x - .22, 1.13, z - .02, .44, .28, .04, PAPEL),
    B(x - .17, 1.33, z + .02, .05, .05, .01, LILAS), B(x - .12, 1.24, z + .02, .26, .03, .01, INK), B(x - .12, 1.17, z + .02, .18, .03, .01, INK)];
  const carroSonho = () => [B(0, .25, 0, 3, .55, 1.6, LILAS), B(.7, .8, .1, 1.6, .5, 1.4, LILAS), B(.78, .86, .09, .65, .36, .01, VIDRO), B(1.5, .86, .09, .7, .36, .01, VIDRO),
    B(.78, .86, 1.5, .65, .36, .01, VIDRO), B(1.5, .86, 1.5, .7, .36, .01, VIDRO), B(2.3, .86, .2, .01, .36, 1.2, VIDRO), B(.69, .86, .2, .01, .36, 1.2, VIDRO),
    ...[[.4, -.06], [2, -.06], [.4, 1.56], [2, 1.56]].map(([x, z]) => B(x, 0, z, .6, .5, .1, INK)), B(2.99, .5, .15, .02, .12, .3, PAPEL), B(2.99, .5, 1.15, .02, .12, .3, PAPEL),
    B(-.01, .5, .15, .02, .1, .3, '#E2412E'), B(-.01, .5, 1.15, .02, .1, .3, '#E2412E')];
  const SONHOS = (() => { const out = [B(-.1, 1.15, 0, 7.2, 2.3, .04, LILAS)]; const q = (u, c) => out.push(B(u, 1.3, .04, 1.6, 2, .02, c));
    q(0, CEU); out.push(B(0, 1.3, .06, 1.6, .7, .01, AZUL), B(0, 1.3, .07, 1.6, .25, .01, '#EAD9A8'), B(.95, 2.6, .06, .4, .4, .01, AMARELO));
    q(1.8, PAPEL); out.push(B(2.15, 1.5, .06, .9, .8, .01, ROSA), B(2.05, 2.3, .06, 1.1, .2, .01, '#B4152E'), B(2.25, 2.5, .06, .7, .2, .01, '#B4152E'), B(2.45, 2.7, .06, .3, .15, .01, '#B4152E'), B(2.48, 1.5, .07, .25, .45, .01, INK));
    q(3.6, '#F4F1EA'); out.push(B(3.75, 1.75, .06, 1.3, .35, .01, LARANJA), B(4.05, 2.1, .06, .7, .3, .01, LARANJA), B(3.85, 1.6, .07, .3, .2, .01, INK), B(4.65, 1.6, .07, .3, .2, .01, INK));
    q(5.4, '#9CC9F0'); out.push(B(5.6, 2.3, .06, 1.2, .14, .01, PAPEL), B(6.05, 2.05, .06, .25, .6, .01, PAPEL), B(5.65, 2.4, .06, .14, .25, .01, PAPEL), B(5.8, 1.6, .06, .5, .12, .01, PAPEL), B(6.3, 1.75, .06, .4, .1, .01, PAPEL));
    return out; })();
  const VITRINE_DECOR = [
    { x: 3.5, z: .15, parede: true, bl: SONHOS },
    { x: 1, z: 2.2, piso: true, bl: [B(0, 0, 0, 3.8, .015, 2.4, PAPEL)] }, { x: 9.2, z: 2.2, piso: true, bl: [B(0, 0, 0, 3.8, .015, 2.4, PAPEL)] },
    { x: 1, z: 6.6, piso: true, bl: [B(0, 0, 0, 3.4, .015, 2.6, PAPEL)] }, { x: 9.6, z: 6.6, piso: true, bl: [B(0, 0, 0, 3, .015, 2.6, PAPEL)] },
    { x: 9.6, z: 2.6, bl: carroSonho() },
    { x: 0, z: 0, bl: [...etiqueta(4.4, 4.2), ...etiqueta(8.8, 4.2), ...etiqueta(4.1, 8.8), ...etiqueta(9.3, 8.8)] }
  ];
  const CALCULADORA = [B(.2, 0, .2, 1.6, .6, .8, '#D9CCEF'), B(.4, .6, .35, 1.2, 1.55, .35, INK), B(.5, 1.75, .7, 1, .3, .01, '#D9CCEF'),
    ...[0, 1, 2, 3, 4].map(i => B(.62 + i * .17, 1.8, .71, .11, .18, .005, INK)),
    ...Array.from({ length: 16 }, (_, i) => B(.5 + (i % 4) * .26, .72 + Math.floor(i / 4) * .25, .7, .2, .18, .02, i === 3 ? AMARELO : i % 4 === 3 ? LILAS : i === 0 ? ROSA : '#3A3E45'))];
  const PLANTA_VITRINE = salaDe({ k: 'estilo', nome: 'A vitrine', W: 14, D: 12, ALT: 4, piso: '#E9E6E0', linha: 'rgba(60,50,40,.06)', parede: '#F4F1EA', fundo: '#D9CCEF', decor: VITRINE_DECOR });

  /* a Escolinha: a lousa preta (nada de verde) com o giz desenhando o passo a passo, o abecedário colorido em cima,
     as carteiras com o corredor no meio, a mesa da professora com o globo e os desenhos da turma na parede */
  const LOUSA = [B(-.1, .85, 0, 7.2, 1.95, .05, MAD), B(0, .95, .05, 7, 1.75, .02, '#22252B'), B(0, .9, .05, 7, .04, .14, MAD), B(.5, .94, .12, .25, .06, .1, '#E6D7B4'),
    ...[[.5, 2.1], [2.3, 2.1], [4.1, 2.1]].flatMap(([u, v], i) => [B(u, v, .07, .36, .36, .01, PAPEL), B(u + .08, v + .08, .08, .2, .2, .005, '#22252B'), B(u + .5, v + .22, .07, 1, .05, .01, PAPEL), B(u + .5, v + .08, .07, .7, .05, .01, PAPEL), ...(i < 2 ? [B(u + 1.6, v + .16, .07, .12, .05, .01, AMARELO)] : [])]),
    B(.6, 1.2, .07, .7, .5, .01, ROSA), B(.65, 1.7, .07, .6, .1, .01, ROSA), B(.75, 1.8, .07, .4, .1, .01, ROSA), B(.82, 1.2, .08, .2, .3, .005, '#22252B'),
    B(5.9, 2.2, .07, .45, .45, .01, AMARELO), B(5.75, 2.38, .07, .1, .08, .01, AMARELO), B(6.4, 2.38, .07, .1, .08, .01, AMARELO), B(6.08, 2.7, .07, .08, .1, .01, AMARELO),
    B(2.2, 1.25, .07, 2.6, .05, .01, PAPEL), B(4.6, 1.15, .07, .14, .25, .01, PAPEL), B(5.4, 1.2, .07, .3, .3, .01, ROSA), B(5.45, 1.45, .07, .1, .08, .01, ROSA), B(5.65, 1.45, .07, .1, .08, .01, ROSA)];
  const carteiraEsc = c => [B(0, .7, 0, .8, .05, .55, MAD), B(.06, 0, .06, .05, .7, .05, '#4A4E56'), B(.69, 0, .06, .05, .7, .05, '#4A4E56'), B(.06, 0, .44, .05, .7, .05, '#4A4E56'), B(.69, 0, .44, .05, .7, .05, '#4A4E56'),
    B(.15, .42, .7, .5, .05, .42, c), B(.15, .47, 1.08, .5, .45, .05, c), B(.18, 0, .74, .04, .42, .04, '#4A4E56'), B(.58, 0, .74, .04, .42, .04, '#4A4E56'), B(.18, 0, 1.06, .04, .42, .04, '#4A4E56'), B(.58, 0, 1.06, .04, .42, .04, '#4A4E56')];
  const ESCOLA_DECOR = [
    { x: 2.5, z: .15, parede: true, bl: Array.from({ length: 12 }, (_, i) => B(i * .6, 3, .02, .5, .3, .02, [ROSA, AMARELO, AZUL, LARANJA, LILAS, CEU][i % 6])) },
    ...[[1.4, 3.4], [3.1, 3.4], [7.3, 3.4], [9, 3.4], [1.4, 5.2], [3.1, 5.2], [7.3, 5.2], [9, 5.2], [1.4, 7], [3.1, 7], [7.3, 7], [9, 7]].map(([x, z], i) => ({ x, z, bl: carteiraEsc([AZUL, ROSA, LARANJA, LILAS][i % 4]) })),
    /* a mesa da professora com o globo */
    { x: 9.6, z: 1.3, bl: [B(0, .74, 0, 1.6, .06, .8, MAD_E), B(0, 0, 0, .1, .74, .8, MAD_E), B(1.5, 0, 0, .1, .74, .8, MAD_E), B(.45, .8, .25, .2, .04, .2, MAD_E), B(.53, .84, .33, .04, .2, .04, MAD_E),
      B(.38, 1.02, .2, .34, .3, .3, AZUL), B(.34, 1.08, .24, .42, .18, .22, AZUL), B(.42, 1.12, .19, .14, .12, .01, LARANJA), B(.6, 1.18, .19, .1, .08, .01, LARANJA), B(1.1, .8, .3, .3, .2, .2, '#E2412E')] },
    /* os desenhos da turma, presos na parede da esquerda */
    { x: .15, z: 0, parede: true, bl: [[3.5, ROSA, AMARELO], [4.6, AZUL, LARANJA], [5.7, AMARELO, ROSA], [6.8, LILAS, AZUL]].flatMap(([z, a, b], i) => [B(0, 1.5 + (i % 2) * .12, z, .02, .7, .9, PAPEL), B(.02, 1.62 + (i % 2) * .12, z + .15, .01, .3, .3, a), B(.02, 1.62 + (i % 2) * .12, z + .5, .01, .45, .25, b), B(.02, 2.05 + (i % 2) * .12, z + .1, .01, .05, .7, AMARELO)]) }
  ];
  const PLANTA_ESCOLA = salaDe({ k: 'manual', nome: 'A escolinha', W: 12, D: 11, ALT: 3.4, piso: '#C89B6A', linha: 'rgba(60,30,10,.16)', parede: '#EAD9A8', fundo: '#F4F1EA', decor: ESCOLA_DECOR });

  /* o Cineclube: a tela com Londrina no fim da tarde (o céu laranja, os prédios, o ipê rosa), a cortina de veludo,
     as poltronas com o corredor no meio, o carrinho de pipoca e, perto da porta, o projetor com as duas bobinas */
  const TELAO = [B(1.6, .9, 0, 8.8, 2.9, .04, INK), B(1.8, 1, .04, 8.4, 2.6, .02, '#F2A65A'), B(1.8, 2.7, .06, 8.4, .9, .01, '#E8643A'), B(1.8, 3.2, .065, 8.4, .4, .01, '#8F86E8'),
    B(7.4, 2.2, .07, .7, .7, .01, AMARELO), ...[[1.8, .7], [2.6, 1.1], [3.2, .5], [3.8, 1.4], [4.6, .9], [5.4, 1.2], [6.1, .6], [8.3, 1], [9.1, .7]].map(([u, h], i) => B(u, 1, .075, [.7, .5, .55, .7, .7, .6, .5, .7, .8][i], h, .01, '#2B2F38')),
    ...[[3.95, 2.05], [4.2, 2.2], [3.85, 2.3], [4.05, 2.45]].map(([u, v]) => B(u, v, .08, .35, .25, .01, ROSA)), B(4.05, 1.4, .08, .08, .7, .01, MAD_E)];
  const cortina = x0 => Array.from({ length: 6 }, (_, i) => B(x0 + i * .18, 0, .15, .18, 4, .16 + (i % 2) * .06, i % 2 ? '#6E1422' : '#8E1B2C'));
  const poltronaCine = () => [B(.3, 0, .2, .3, .38, .4, '#2B2F38'), B(.05, .38, .05, .8, .12, .7, '#8E1B2C'), B(.05, .38, .7, .8, .8, .15, '#8E1B2C'), B(0, .38, .05, .06, .28, .8, '#2B2F38'), B(.84, .38, .05, .06, .28, .8, '#2B2F38')];
  const CINE_DECOR = [
    { x: 0, z: .15, parede: true, bl: TELAO },
    { x: 0, z: 0, bl: [...cortina(.6), ...cortina(10.32), B(.6, 3.7, .15, 10.8, .4, .28, '#8E1B2C'), B(.6, 3.66, .43, 10.8, .05, .02, OURO), B(1.2, 0, .45, 9.6, .25, 1.1, '#2B2F38')] },
    ...[5, 6.6, 8.2].flatMap(z => [1, 1.9, 2.8, 3.7, 7.4, 8.3, 9.2, 10.1].map(x => ({ x, z, bl: poltronaCine() }))),
    /* o carrinho de pipoca */
    { x: .6, z: 10.4, bl: [B(0, .1, 0, 1, .7, .7, '#E2412E'), ...[.1, .3, .5, .7].map(x => B(x, .1, .7, .1, .7, .01, PAPEL)), B(0, 0, .05, .15, .15, .15, INK), B(.85, 0, .05, .15, .15, .15, INK),
      B(.05, .8, .05, .9, .05, .6, PAPEL), B(.05, .85, .05, .05, .6, .05, PAPEL), B(.9, .85, .05, .05, .6, .05, PAPEL), B(.05, .85, .6, .05, .6, .05, PAPEL), B(.9, .85, .6, .05, .6, .05, PAPEL), B(.05, 1.45, .05, .9, .06, .6, '#E2412E'),
      B(.12, .85, .12, .76, .25, .46, AMARELO), B(.25, 1.1, .2, .2, .1, .2, PAPEL), B(.55, 1.1, .25, .2, .12, .2, '#F2E3B0')] },
    /* cartazes nas laterais */
    { x: .15, z: 0, parede: true, bl: [...pintaTela(4.2, 1.2, 1, 1.4, INK, [[.1, .5, .8, .8, ROSA], [.1, .15, .8, .1, AMARELO], [.1, .3, .5, .08, PAPEL]], 'z', 1), ...pintaTela(7.6, 1.2, 1, 1.4, AMARELO, [[.15, .45, .7, .8, AZUL], [.3, .65, .4, .4, PAPEL], [.15, .15, .7, .1, INK]], 'z', 1)] },
    { x: 11.85, z: 0, parede: true, bl: [...pintaTela(4.2, 1.2, 1, 1.4, LILAS, [[.15, .5, .7, .75, INK], [.35, .7, .3, .3, AMARELO], [.15, .15, .7, .1, INK]], 'z', -1), ...pintaTela(7.6, 1.2, 1, 1.4, '#E8643A', [[.1, .4, .8, .9, '#2B2F38'], [.4, .9, .2, .2, PAPEL], [.1, .15, .8, .1, PAPEL]], 'z', -1)] }
  ];
  const PROJETOR = [B(.3, 0, .3, .8, 1.1, .5, '#2B2F38'), B(.15, 1.1, .1, 1.1, .5, .9, '#3A3E45'), B(.55, 1.25, -.15, .3, .25, .25, INK), B(.6, 1.3, -.16, .2, .15, .01, LUZ_S),
    ...discoEmPe(.45, 1.95, .35, .45, .06, '#C9CDD3'), ...discoEmPe(.98, 1.85, .28, .45, .06, '#C9CDD3'), B(.4, 1.9, .51, .1, .1, .01, INK), B(.93, 1.8, .51, .1, .1, .01, INK), B(.45, 1.6, .47, .55, .02, .02, INK)];
  const PLANTA_CINE = salaDe({ k: 'rolo', nome: 'O cineclube', W: 12, D: 13, ALT: 4.2, piso: '#3A1E28', linha: 'rgba(0,0,0,.12)', parede: '#1B1D22', fundo: '#15161A', decor: CINE_DECOR });

  /* ---------- v3.48 · o Sebo: livro usado no fundo, capas de disco na parede e, no meio, os caixotes ----------
     Nos caixotes a pessoa escolhe disco pra levar pro toca-discos de casa (seboSheet). A jukebox e o toca-discos daqui
     tocam qualquer disco da cidade; tem um gato dormindo nas caixas, como todo sebo que se preze */
  const CAPAS = (() => { const out = []; for(let i = 0; i < 12; i++){ const z = 1.6 + (i % 6) * 1.1, y = 1.3 + Math.floor(i / 6) * 1, c = [ROSA, AMARELO, '#2F5DA8', LARANJA, LILAS, '#E2412E', CEU, INK, '#D9C27F', '#8F86E8', PAPEL, '#E8643A'][i];
    out.push(B(0, y, z, .03, .82, .82, c), B(.03, y + .16, z + .16, .01, .5, .5, INK), B(.04, y + .36, z + .36, .006, .1, .1, c === INK ? AMARELO : c)); } return out; })();
  const caixote = x0 => [B(x0, .78, .2, .5, .04, 1, MAD), B(x0, .78, .2, .04, .3, 1, MAD), B(x0 + .46, .78, .2, .04, .3, 1, MAD), B(x0, .78, 1.16, .5, .18, .04, MAD), B(x0, .78, .2, .5, .3, .04, MAD),
    ...Array.from({ length: 7 }, (_, i) => B(x0 + .07, .82, .3 + i * .12, .36, .32 - (i % 2) * .03, .02, [ROSA, AZUL, AMARELO, INK, LARANJA, LILAS, PAPEL][(i + Math.round(x0 * 3)) % 7]))];
  const CAIXOTES = [B(0, .72, 0, 4.8, .06, 1.4, MAD_E), ...[[.1, .1], [4.6, .1], [.1, 1.2], [4.6, 1.2]].map(([x, z]) => B(x, 0, z, .1, .72, .1, MAD_E)), ...[.35, 1.45, 2.55, 3.65].flatMap(caixote)];
  const SEBO_DECOR = [
    { x: .2, z: .15, bl: [...estanteAlta(0, 3.8, 7), ...estanteAlta(3.9, 3.8, 8), ...estanteAlta(7.8, 3.8, 9)] },
    { x: .15, z: 0, parede: true, bl: CAPAS },
    /* o balcão do dono, com o toca-discos de ouvir antes de levar e a caixinha de troco */
    { x: 9, z: 6.6, bl: [B(0, 0, 0, 2.6, .95, .8, MAD_E), B(-.05, .95, -.05, 2.7, .05, .9, MAD), B(.3, 1, .15, .7, .1, .55, INK), B(.6, 1.1, .4, .02, .02, .02, PAPEL), Object.assign(B(.35, 1.1, .2, .5, .01, .5, '#2B2F38'), { yaw: .3 }), B(.6, 1.11, .43, .1, .01, .1, ROSA), B(1.6, 1, .2, .5, .25, .4, '#3A3E45')] }
  ];
  const PLANTA_SEBO = salaDe({ k: 'sebo', nome: 'O sebo', W: 12, D: 11, ALT: 3.8, piso: '#8E5B33', linha: 'rgba(40,20,5,.22)', parede: '#E8D7C3', fundo: TIJ, decor: SEBO_DECOR });

  /* ---------- v3.49 · o Torneio de Pesca do Igapó ----------
     Um píer em T no meio da água, a margem de palha com os ipês, o placar boiando no fundo e a Capi de ouro no pódio.
     Cada balde na beira do píer é um ponto de pesca (ação "Pescar aqui"). A água é o piso do lugar, e quem não deixa
     ninguém andar nela é o PL.bloqueio (a grade marca, sem desenhar nada); o píer e a margem são polígonos do chão */
  const AGUA = '#2F6FA8', TABUA = '#B3793F', TABUA2 = '#96612F', ESTACA = '#5A3A1E';
  const tabuas = (x0, z0, x1, z1, eixo) => { const out = [ret(x0, z0, x1, z1, TABUA)];
    if(eixo === 'z') for(let x = x0 + .4; x < x1 - .05; x += .4) out.push(ret(x - .015, z0, x + .015, z1, TABUA2));
    else for(let z = z0 + .4; z < z1 - .05; z += .4) out.push(ret(x0, z - .015, x1, z + .015, TABUA2));
    return out; };
  const CHAO_PESCA = [ret(0, 11.2, 14, 14, '#D9C27F'), ret(0, 11.2, 14, 11.4, '#C9A95E'), ...tabuas(6.2, 3.5, 7.8, 11.3, 'x'), ...tabuas(1.5, 2, 12.5, 3.5, 'z'),
    ...[[2, 5], [4, 8.5], [10, 6], [11.4, 9.2], [2.6, .9], [9.2, .7], [12.6, 4.6], [3.6, 6.6]].map(([x, z]) => ret(x, z, x + .7, z + .06, '#4F8BC4'))];
  const BLOQ_PESCA = [[0, 0, 14, 2], [0, 2, 1.5, 3.5], [12.5, 2, 14, 3.5], [0, 3.5, 6.2, 11.2], [7.8, 3.5, 14, 11.2]];
  /* os pontos de pesca: onde o boneco fica (x, z), pra onde ele olha (yaw) e o balde do lado */
  const PONTOS = [[2.6, 2.35, Math.PI, [.3, 0]], [4.8, 2.35, Math.PI, [.3, 0]], [9.2, 2.35, Math.PI, [.3, 0]], [11.4, 2.35, Math.PI, [.3, 0]], [6.55, 6.6, -Math.PI / 2, [0, .3]], [7.45, 8.8, Math.PI / 2, [0, .3]]];
  const balde = (dx, dz) => [B(dx, 0, dz - .13, .26, .28, .26, '#4A4E56'), B(dx - .02, .28, dz - .15, .3, .03, .3, '#8F96A0'), B(dx + .02, .27, dz - .11, .22, .01, .22, AGUA), B(dx + .08, .29, dz - .05, .1, .02, .05, '#C9CDD3')];
  const PESCA_DECOR = [
    /* as estacas na beira do píer */
    /* v3.55: as do meio desceram de 7,5 pra 8: com o balde do ponto da esquerda elas fechavam a passagem do píer
       (na grade de 25 cm sobravam 2 casas e o boneco precisa de 3), e 4 dos 6 baldes do T ficavam sem caminho */
    { x: 0, z: 0, bl: [[6.2, 4.5], [6.2, 8], [6.2, 10.4], [7.6, 4.5], [7.6, 8], [7.6, 10.4], [1.5, 2], [1.5, 3.3], [12.3, 2], [12.3, 3.3], [3.7, 3.3], [10.1, 3.3]].map(([x, z]) => B(x, 0, z, .2, .32, .2, ESTACA)) },
    /* o placar boiando no fundo, de frente pra margem */
    { x: 5, z: .3, bl: [B(.3, 0, .2, .15, 1.6, .15, ESTACA), B(3.55, 0, .2, .15, 1.6, .15, ESTACA), B(0, 1.3, .2, 4, 1.3, .12, '#2B2F38'), B(.1, 2.3, .32, 3.8, .22, .02, ROSA),
      B(.3, 2.34, .34, .3, .14, .01, PAPEL), B(.55, 2.38, .34, .1, .06, .01, PAPEL), B(.25, 1.95, .32, 2.6, .16, .02, '#E8643A'), B(.25, 1.7, .32, 2, .16, .02, '#C9CDD3'), B(.25, 1.45, .32, 1.4, .16, .02, '#C68642'),
      B(3.1, 1.6, .32, .6, .5, .02, PAPEL), B(3.2, 1.75, .34, .4, .2, .01, ROSA)] },
    /* os ipês da margem e a barraquinha de isca */
    ...[[.4, 12.3, ROSA], [12.6, 12.3, '#FFB3D1']].map(([x, z, c]) => ({ x, z, bl: [B(.4, 0, .4, .22, 1.7, .22, ESTACA), B(0, 1.6, 0, 1, .6, 1, c), B(.2, 2.2, .2, .6, .4, .6, c), B(-.1, 1.75, .3, .3, .3, .4, c), B(.8, 1.7, .2, .3, .35, .5, c)] })),
    { x: 9.6, z: 12.2, bl: [B(0, 0, 0, 1.6, .9, .7, MAD_E), B(-.05, .9, -.05, 1.7, .05, .8, MAD), B(0, .95, 0, .08, 1, .08, ESTACA), B(1.52, .95, 0, .08, 1, .08, ESTACA),
      ...Array.from({ length: 6 }, (_, i) => B(-.1 + i * .3, 1.95, -.15, .3, .12, 1, i % 2 ? PAPEL : ROSA)), B(.2, .95, .2, .3, .2, .3, AZUL), B(.7, .95, .25, .25, .15, .25, '#C68642')] },
    ...PONTOS.map(([x, z, yaw, [dx, dz]]) => ({ x, z, acao: 'pesca', spot: { x, z, yaw }, bl: balde(dx, dz) }))
  ];
  const PLANTA_PESCA = { k: 'lugar-pesca', W: 14, D: 14, ALT: 3,
    comodos: [{ k: 'pier', nome: 'O píer', x0: 0, z0: 0, x1: 14, z1: 14, piso: AGUA, linha: 'rgba(255,255,255,.05)' }],
    paredes: [
      { a: [0, 14], b: [14, 14], ext: [0, 1], portas: [[6.4, 7.6]], entrada: true, cor: ESTACA, alt: .4 },
      { a: [14, 0], b: [14, 14], ext: [1, 0], cor: ESTACA, alt: .4 }, { a: [0, 0], b: [0, 14], ext: [-1, 0], cor: ESTACA, alt: .4 }, { a: [0, 0], b: [14, 0], ext: [0, -1], cor: ESTACA, alt: .4 }
    ],
    entrada: { x: 7, z: 14 }, decor: PESCA_DECOR, chao: CHAO_PESCA, bloqueio: BLOQ_PESCA, padrao: [] };

  /* ---------- as pistas (v3.50) ----------
     v3.59: o oval da moto saiu. A moto corre no circuito do Autódromo do Café, montado pelo mesmo motor das pistas de
     kart (lá embaixo): sozinha contra o relógio, com rampas, costelas e obstáculos. Ficam aqui as peças que o resto usa */
  const ovalPts = (cx, cz, ax, az, n) => Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2; return [cx + Math.cos(a) * ax, cz + Math.sin(a) * az]; });
  const anelPts = (cx, cz, ax, az, bx, bz, a0, a1) => [[cx + Math.cos(a0) * ax, cz + Math.sin(a0) * az], [cx + Math.cos(a1) * ax, cz + Math.sin(a1) * az], [cx + Math.cos(a1) * bx, cz + Math.sin(a1) * bz], [cx + Math.cos(a0) * bx, cz + Math.sin(a0) * bz]];
  const PNEUS = i => [B(-.26, 0, -.26, .52, .22, .52, '#1B1D22'), B(-.26, .22, -.26, .52, .22, .52, i % 2 ? '#E2412E' : PAPEL), B(-.14, .44, -.14, .28, .01, .28, '#3A3E45')];
  const ipe = (c, s) => [B(.4 * s, 0, .4 * s, .22 * s, 1.7 * s, .22 * s, '#5A3A1E'), B(0, 1.6 * s, 0, 1 * s, .6 * s, 1 * s, c), B(.2 * s, 2.2 * s, .2 * s, .6 * s, .4 * s, .6 * s, c), B(-.1 * s, 1.75 * s, .3 * s, .3 * s, .3 * s, .4 * s, c)];
  /* a arquibancada do fundo, com a torcida (cabeças coloridas, cada uma num lugar) */
  const arquibancada = (w, deg) => { const out = []; for(let k = 0; k < deg; k++) out.push(B(0, k * .45, k * .55, w, .45, (deg - k) * .55, k % 2 ? '#C9CDD3' : '#A4A8AE'));
    for(let k = 0; k < deg; k++) for(let i = 0; i < Math.floor(w / .7); i++){ if(sorte(i * 7 + k * 13) < .35) continue; out.push(B(.2 + i * .7, (k + 1) * .45, k * .55 + .15, .26, .3, .22, [ROSA, AZUL, LARANJA, LILAS, PAPEL, '#E2412E', INK][(i + k * 3) % 7]), B(.24 + i * .7, (k + 1) * .45 + .3, k * .55 + .17, .18, .18, .18, ['#C68642', '#8E5B33', '#F0C9A0', '#5A3A22'][(i + k) % 4])); }
    return out; };
  /* a largada: o totem com a bandeira quadriculada, no paddock */
  const totemLargada = cor => [B(0, 0, 0, .5, 1, .4, INK), B(.05, 1, .05, .4, .05, .3, cor), B(.22, 1.05, .15, .05, 1, .05, '#8F96A0'), ...Array.from({ length: 6 }, (_, i) => B(.27 + (i % 3) * .15, 1.6 + Math.floor(i / 3) * .15, .17, .15, .15, .01, (i + Math.floor(i / 3)) % 2 ? INK : PAPEL))];

  /* ---------- v3.53 · as pistas de kart do patinete ----------
     O Thales pediu três pistas "no estilo Mario Kart, percursos maiores e cheios de emoção". Cada pista é uma linha
     central fechada (spline centrípeta pelos pontos de controle, reamostrada a cada 0,6 m) com a largura da pista: o
     asfalto (ou a terra) são pedaços ao longo dela, a zebra entra nas curvas, e fora da pista dá pra andar, mas devagar
     (é a grama de palha, o terreiro, a calçada: atalho tem preço). Na pista: setas de turbo, rampas (pulo; apertou
     Pular na rampa, sai com turbo), fileiras de discos (passou por um, ganha um item) e um perigo que atravessa (as
     capivaras, o trator, o busão). Seis corredores: você e cinco personagens do Correverso. Tudo desenhado aqui, sem
     nada de jogo dos outros */
  const PASSO_K = .6, AGUA_K = '#2F6FA8';
  function linhaCentral(cp){
    const n = cp.length, densa = [], tj = (a, b) => Math.pow(Math.hypot(b[0] - a[0], b[1] - a[1]), .5) || 1e-4;
    for(let i = 0; i < n; i++){
      const P0 = cp[(i - 1 + n) % n], P1 = cp[i], P2 = cp[(i + 1) % n], P3 = cp[(i + 2) % n];
      const t1 = tj(P0, P1), t2 = t1 + tj(P1, P2), t3 = t2 + tj(P2, P3), m = Math.max(6, Math.ceil(Math.hypot(P2[0] - P1[0], P2[1] - P1[1]) / .15));
      for(let j = 0; j < m; j++){
        const t = t1 + (t2 - t1) * j / m, L = (A, Bq, ta, tb) => [0, 1].map(k => (tb - t) / (tb - ta) * A[k] + (t - ta) / (tb - ta) * Bq[k]);
        const A1 = L(P0, P1, 0, t1), A2 = L(P1, P2, t1, t2), A3 = L(P2, P3, t2, t3), B1 = L(A1, A2, 0, t2), B2 = L(A2, A3, t1, t3);
        densa.push(L(B1, B2, t1, t2));
      }
    }
    const cum = [0]; for(let i = 1; i <= densa.length; i++){ const a = densa[i - 1], b = densa[i % densa.length]; cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
    const tot = cum[cum.length - 1], N = Math.round(tot / PASSO_K), ds = tot / N, P = [];
    let k = 0; for(let i = 0; i < N; i++){ const s = i * ds; while(cum[k + 1] < s) k++; const u = (s - cum[k]) / (cum[k + 1] - cum[k] || 1), a = densa[k], b = densa[(k + 1) % densa.length]; P.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]); }
    const T = P.map((p, i) => { const a = P[(i - 1 + N) % N], b = P[(i + 1) % N], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / d, (b[1] - a[1]) / d]; });
    const K = T.map((t, i) => { const a = T[(i - 1 + N) % N], b = T[(i + 1) % N]; return Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]) / (2 * ds); });
    return { P, T, K, N, ds, tot };
  }
  /* os cantos de uma placa em pé: centro (x, z), virada pra yaw, largura w, altura h, de y0 pra cima */
  const cantosPlaca = (x, z, yaw, w, h, y0, frente) => { const rx = Math.cos(yaw), rz = -Math.sin(yaw), nx = Math.sin(yaw) * (frente || 0), nz = Math.cos(yaw) * (frente || 0);
    return [[x - rx * w / 2 + nx, y0 + h, z - rz * w / 2 + nz], [x + rx * w / 2 + nx, y0 + h, z + rz * w / 2 + nz], [x + rx * w / 2 + nx, y0, z + rz * w / 2 + nz], [x - rx * w / 2 + nx, y0, z - rz * w / 2 + nz]]; };
  const idxK = (c, i) => ((Math.round(i) % c.N) + c.N) % c.N;
  /* um ponto ao lado da linha central: amostra i, lat metros pro lado (+ é a esquerda de quem corre), fr pra frente */
  const ptK = (c, i, lat, fr) => { const j = idxK(c, i), p = c.P[j], t = c.T[j]; return [p[0] + t[0] * (fr || 0) - t[1] * lat, p[1] + t[1] * (fr || 0) + t[0] * lat]; };
  /* onde fica a distância s (metros, pode passar de uma volta) da linha: x, z, o rumo e o lado */
  function naLinha(c, s, lat){
    const f = (((s / c.ds) % c.N) + c.N) % c.N, i = Math.floor(f), u = f - i, a = c.P[i], b = c.P[(i + 1) % c.N], t = c.T[i], t2 = c.T[(i + 1) % c.N];
    const tx = t[0] + (t2[0] - t[0]) * u, tz = t[1] + (t2[1] - t[1]) * u, n = Math.hypot(tx, tz) || 1;
    return [a[0] + (b[0] - a[0]) * u - tz / n * (lat || 0), a[1] + (b[1] - a[1]) * u + tx / n * (lat || 0), Math.atan2(tx, tz)];
  }
  /* o pedaço mais reto perto da fração s (rampa e seta de turbo não podem cair no meio de uma curva fechada) */
  function maisReto(c, s, jan){
    const i0 = Math.round(s * c.N), J = Math.round(jan * c.N); let best = i0, bk = 1e9;
    for(let d = -J; d <= J; d++){ let k = 0; for(let j = -5; j <= 5; j++) k += Math.abs(c.K[idxK(c, i0 + d + j)]); k += Math.abs(d) * .004; if(k < bk){ bk = k; best = i0 + d; } }
    return idxK(c, best);
  }
  const longeDaLinha = (c, x, z) => { let m = 1e9; for(let i = 0; i < c.N; i += 2){ const d = Math.hypot(c.P[i][0] - x, c.P[i][1] - z); if(d < m) m = d; } return m; };
  /* a pista em si: chão, zebra, chegada, grid, setas de turbo, rampas, discos e o córrego */
  function kartPista(o){
    const c = linhaCentral(o.pts), { K, N } = c, h = o.larg / 2, chao = [], decor = [], pt = (i, lat, fr) => ptK(c, i, lat, fr);
    c.larg = o.larg;
    /* o chão, de 2 em 2 amostras e um tiquinho sobreposto (senão aparece a costura entre os pedaços) */
    for(let i = 0; i < N; i += 2) chao.push({ pts: [pt(i, h, -.06), pt(i + 2, h, .06), pt(i + 2, -h, .06), pt(i, -h, -.06)], c: o.cor });
    /* curva fechada: zebra dos dois lados; reta: a faixa da beira */
    for(let i = 0; i < N; i += 2){
      const k = (Math.abs(K[i]) + Math.abs(K[idxK(c, i + 1)]) + Math.abs(K[idxK(c, i + 2)])) / 3;
      if(k > 1 / 11){ const cz = (i / 2) % 2 ? o.zebra[0] : o.zebra[1]; [1, -1].forEach(l => chao.push({ pts: [pt(i, l * h, -.03), pt(i + 2, l * h, .03), pt(i + 2, l * (h - .45), .03), pt(i, l * (h - .45), -.03)], c: cz })); }
      else [1, -1].forEach(l => chao.push({ pts: [pt(i, l * (h - .16), -.03), pt(i + 2, l * (h - .16), .03), pt(i + 2, l * (h - .3), .03), pt(i, l * (h - .3), -.03)], c: o.beira }));
    }
    /* a chegada: o quadriculado atravessando a pista */
    const nq = Math.round(o.larg / .42), q = o.larg / nq;
    for(let a = 0; a < nq; a++) for(let b = 0; b < 2; b++) chao.push({ pts: [pt(0, -h + a * q, b * .42 - .42), pt(0, -h + (a + 1) * q, b * .42 - .42), pt(0, -h + (a + 1) * q, b * .42), pt(0, -h + a * q, b * .42)], c: (a + b) % 2 ? INK : PAPEL });
    /* o grid de largada: seis lugares, dois por fila, atrás da chegada */
    const grade = []; for(let k = 0; k < 6; k++){ const r = Math.floor(k / 2), lat = (k % 2 ? -1 : 1) * h * .48, i = -Math.round((2.6 + r * 3) / c.ds); grade.push({ i, lat }); chao.push({ pts: [pt(i, lat - .55, .6), pt(i, lat + .55, .6), pt(i, lat + .55, .47), pt(i, lat - .55, .47)], c: PAPEL }); }
    /* o córrego que corta a pista (só tem pulo pra ele: quem passa por dentro afunda e vai devagar) */
    let agua = null;
    if(o.corrego){ const i0 = maisReto(c, o.corrego, .02), L = Math.round(2.4 / c.ds); agua = { i0, i1: i0 + L };
      chao.push({ pts: [pt(i0, h + 7, 0), pt(i0 + L, h + 7, 0), pt(i0 + L, -h - 7, 0), pt(i0, -h - 7, 0)], c: AGUA_K });
      [.25, .55, .8].forEach((f, j) => chao.push({ pts: [pt(i0 + L * f, -h + j * 1.1, 0), pt(i0 + L * f, -h + j * 1.1 + .9, 0), pt(i0 + L * f + .5, -h + j * 1.1 + .9, 0), pt(i0 + L * f + .5, -h + j * 1.1, 0)], c: '#4F8BC4' })); }
    /* as setas de turbo: base escura e três setas */
    const turbos = (o.turbos || []).map(([s0, lat]) => { const i = maisReto(c, s0, .015);
      chao.push({ pts: [pt(i, lat - .8, -1.15), pt(i, lat + .8, -1.15), pt(i, lat + .8, 1.15), pt(i, lat - .8, 1.15)], c: '#1B1D22' });
      for(let a = 0; a < 3; a++){ const f = -.95 + a * .66; chao.push({ pts: [pt(i, lat - .62, f), pt(i, lat, f + .44), pt(i, lat + .62, f), pt(i, lat + .62, f + .22), pt(i, lat, f + .66), pt(i, lat - .62, f + .22)], c: a % 2 ? LARANJA : ROSA }); }
      return { i, lat }; });
    /* as rampas: tábua inclinada com as faixas, os degraus por baixo; quem passa voa (não trava ninguém: é "piso") */
    const rampas = (o.rampas || []).map(s0 => { const i = maisReto(c, s0, .02), p = c.P[i], t = c.T[i], yw = Math.atan2(t[0], t[1]), L = 1.9, H = .55, w = o.larg - .2, pit = -Math.atan2(H, L), len = Math.hypot(L, H), rc = o.rampa || [INK, ROSA];
      const g = { yaw: yw, piv: [0, 0, 0] }, gp = { yaw: yw, pitch: pit, piv: [0, 0, 0] };
      const bl = [Object.assign(B(-w / 2, 0, 0, w, .1, len, rc[0]), gp), ...[.2, .48, .76].map(f => Object.assign(B(-w / 2 + .15, .1, len * f, w - .3, .015, .18, rc[1]), gp)),
        Object.assign(B(-w / 2, 0, L - .14, w, H, .14, rc[0]), g), Object.assign(B(-w / 2, 0, L * .62, w, H * .6, .1, rc[0]), g), Object.assign(B(-w / 2, 0, L * .3, w, H * .28, .1, rc[0]), g)];
      decor.push({ x: p[0] - t[0] * L / 2, z: p[1] - t[1] * L / 2, piso: true, bl });
      return { i, ia: i - Math.round(L / 2 / c.ds) - 1, ib: i + Math.round(L / 2 / c.ds) }; });
    /* as fileiras de discos (o item): quatro de lado a lado */
    const discos = []; (o.discos || []).forEach(s0 => { const i = maisReto(c, s0, .015); for(let k = 0; k < 4; k++){ const lat = -h + .65 + k * (o.larg - 1.3) / 3, p = pt(i, lat, 0); discos.push({ id: discos.length, i, lat, x: p[0], z: p[1] }); } });
    /* v3.59 · as costelas: o trecho ondulado (faixas atravessadas); sacode e segura a velocidade, e no ar passa por cima */
    const costelas = (o.costelas || []).map(([s0, s1]) => { const i0 = Math.round(s0 * N), i1 = Math.round(s1 * N);
      for(let i = i0; i < i1; i++) chao.push({ pts: [pt(i, h - .05, -.04), pt(i + 1, h - .05, .04), pt(i + 1, -h + .05, .04), pt(i, -h + .05, -.04)], c: i % 2 ? '#5A5E68' : '#24272D' });
      return { i0: idxK(c, i0), i1: idxK(c, i1) }; });
    /* v3.59 · os obstáculos: óleo (mancha no chão: quem passa derrapa), cone (derruba e perde velocidade) e a pilha de
       pneus (bate e volta). O óleo é chão; cone e pneus são desenhados na corrida (o cone cai e levanta de novo) */
    const obst = (o.obst || []).map(([tipo, s0, lat], id) => { const i = idxK(c, Math.round(s0 * N)), p = pt(i, lat, 0), t = c.T[i];
      if(tipo === 'oleo') chao.push({ pts: Array.from({ length: 14 }, (_, k) => { const a = k / 14 * Math.PI * 2, r = 1 + .18 * Math.sin(k * 2.7); return [p[0] + Math.cos(a) * r * 1.15, p[1] + Math.sin(a) * r * .85]; }), c: '#121419' }, { pts: elipse(p[0] + .25, p[1] - .15, .45, .2, 10), c: '#3B3550' });
      return { id, tipo, i, lat, x: p[0], z: p[1], yaw: Math.atan2(t[0], t[1]) }; });
    return { c, chao, decor, grade, turbos, rampas, discos, agua, pt, h, costelas, obst };
  }
  /* espelha um bloco de decoração na profundidade (pra arquibancada olhar pro outro lado) */
  const espelhaZ = (bl, fundo) => bl.map(b => Object.assign({}, b, { z: fundo - b.z - b.d }));
  /* coisas em fila ao longo da pista (fardo, saco, poste): de s0 a s1, do lado (1 esquerda, -1 direita), a dist da linha */
  function aoLongo(Kp, s0, s1, lado, dist, passo, bl){
    const { c } = Kp, out = [], n = Math.round(((s1 - s0 + 1) % 1 || 1) * c.tot / passo);
    for(let j = 0; j <= n; j++){ const i = Math.round((s0 * c.tot + j * passo) / c.ds), p = ptK(c, i, lado * dist, 0); if(longeDaLinha(c, p[0], p[1]) < dist - .3) continue; out.push({ x: p[0], z: p[1], bl: bl(j, Math.atan2(c.T[idxK(c, i)][0], c.T[idxK(c, i)][1])) }); }
    return out;
  }
  /* o pórtico da largada: dois postes por fora, a viga com o quadriculado e a placa da pista (as luzes acendem na hora) */
  function portico(Kp, cor, placa){
    const { c, h } = Kp, p = c.P[0], t = c.T[0], yw = Math.atan2(t[0], t[1]), g = { yaw: yw, piv: [0, 0, 0] }, w = h + .7;
    const bl = [B(-w - .15, 0, -.15, .3, 3.4, .3, cor), B(w - .15, 0, -.15, .3, 3.4, .3, cor), B(-w - .15, 3.1, -.2, w * 2 + .3, .5, .4, cor),
      ...Array.from({ length: Math.round(w * 2 / .3) }, (_, i) => B(-w + i * .3, 3.15, -.21, .3, .2, .01, i % 2 ? INK : PAPEL)), B(-1.3, 3.6, -.12, 2.6, .6, .24, placa[0]), B(-1.1, 3.72, -.13, 2.2, .36, .01, placa[1])].map(b => Object.assign(b, g));
    return { x: p[0], z: p[1], bl };
  }
  /* os três lugares de corrida: o cenário de cada um é uma função que recebe a pista pronta */
  function plantaKart(o){
    const Kp = kartPista(o), { c, h } = Kp, W = o.W, D = o.D, decor = [...Kp.decor], antes = [], depois = [], bloq = [], paineis = [], placas = [];
    const livre = (x, z, f) => x > 1.2 && z > 1.2 && x < W - 1.2 && z < D - 1.2 && longeDaLinha(c, x, z) > h + (f == null ? 1.2 : f) && !(x > W / 2 - 7 && x < W / 2 + 7 && z > D - 7) && !placas.some(q => Math.hypot(q[0] - x, q[1] - z) < 4);
    /* v3.53: as placas de propaganda nos espaços vazios, viradas pra pista (postes, moldura e o desenho da marca) */
    const outdoor = (k, v, x, z, yaw, w, hh, alt) => { const rx = Math.cos(yaw), rz = -Math.sin(yaw), g = { yaw, piv: [0, 0, 0] };
      decor.push({ x, z, bl: [B(-rx * w * .35 - .09, 0, -rz * w * .35 - .09, .18, alt + .1, .18, INK), B(rx * w * .35 - .09, 0, rz * w * .35 - .09, .18, alt + .1, .18, INK), Object.assign(B(-w / 2 - .1, alt - .1, -.08, w + .2, hh + .2, .08, INK), g),
        ...[-.3, 0, .3].map(f => Object.assign(B(w * f - .15, alt + hh + .1, .05, .3, .06, .25, '#FFE9B0'), g, { cru: true }))] });
      paineis.push({ P4: cantosPlaca(x, z, yaw, w, hh, alt, .02), k, v }); placas.push([x, z]); };
    const virado = (x, z) => { let m = 1e9, j = 0; for(let i = 0; i < c.N; i += 2){ const d = Math.hypot(c.P[i][0] - x, c.P[i][1] - z); if(d < m){ m = d; j = i; } } return Math.atan2(c.P[j][0] - x, c.P[j][1] - z); };
    (o.publi || []).forEach(({ k, n, longe }) => { let feitas = 0; for(let q = 0; q < 1 && feitas < n; q += .013){ const i = Math.round((q + (o.publiFase || .03)) * c.N); for(const lado of [1, -1]){ if(feitas >= n) break; const p = ptK(c, i, lado * (h + (longe || 4.6)), 0); if(!livre(p[0], p[1], 3.4)) continue; outdoor(k, feitas, p[0], p[1], virado(p[0], p[1]), 5.2, 2.6, 1.7); feitas++; q += .9 / n; break; } } });
    /* as faixas de LED na beira da pista, correndo o texto */
    (o.led || []).forEach(({ k, n }) => { let feitas = 0; for(let q = .02; q < 1 && feitas < n; q += .011){ const i = Math.round(q * c.N); if(Math.abs(c.K[idxK(c, i)]) > 1 / 14) continue; for(const lado of [-1, 1]){ const p = ptK(c, i, lado * (h + 1.25), 0); if(!livre(p[0], p[1], 1)) continue; const yaw = virado(p[0], p[1]); decor.push({ x: p[0], z: p[1], bl: [Object.assign(B(-3.1, 0, -.18, 6.2, .9, .16, '#16181D'), { yaw, piv: [0, 0, 0] })] }); paineis.push({ P4: cantosPlaca(p[0], p[1], yaw, 6, .72, .09, .0), k, led: true }); placas.push([p[0], p[1]]); feitas++; q += .9 / n; break; } } });
    o.tema({ Kp, c, h, W, D, livre, decor, antes, depois, bloq, paineis, outdoor, virado });
    decor.push(portico(Kp, o.portico || INK, o.placa || [ROSA, PAPEL]), { x: W / 2 - 3.5, z: D - 3, acao: 'largada', bl: totemLargada(o.totem || AZUL) });
    if(o.porticoPubli){ const p = c.P[0], t = c.T[0], yw = Math.atan2(t[0], t[1]); paineis.push({ P4: cantosPlaca(p[0], p[1], yw + Math.PI, 2.6, .6, 3.6, .13), k: o.porticoPubli, v: 0, fino: true }); }
    const muro = o.muro || '#3A3E45';
    return { k: 'lugar-' + o.k, W, D, ALT: 3, longe: o.longe || 42, kart: Kp, solo: !!o.solo, paineis, banner: o.banner,
      comodos: [{ k: 'pista', nome: o.nome, x0: 0, z0: 0, x1: W, z1: D, piso: o.fora, linha: o.linha }],
      paredes: [{ a: [0, D], b: [W, D], ext: [0, 1], portas: [[W / 2 - .6, W / 2 + .6]], entrada: true, cor: muro, alt: 1.2 }, { a: [W, 0], b: [W, D], ext: [1, 0], cor: muro, alt: 1.2 }, { a: [0, 0], b: [0, D], ext: [-1, 0], cor: muro, alt: 1.2 }, { a: [0, 0], b: [W, 0], ext: [0, -1], cor: muro, alt: 1.2 }],
      entrada: { x: W / 2, z: D }, chao: [...antes, ...Kp.chao, ...depois], bloqueio: bloq, padrao: [], decor };
  }
  /* uma elipse de polígono (lago, chafariz) e o bloqueio dela, linha a linha da grade */
  const elipse = (cx, cz, rx, rz, n) => Array.from({ length: n || 28 }, (_, i) => { const a = i / (n || 28) * Math.PI * 2; return [cx + Math.cos(a) * rx, cz + Math.sin(a) * rz]; });
  const bloqElipse = (cx, cz, rx, rz) => { const out = []; for(let z = cz - rz; z < cz + rz; z += .25){ const dz = (z + .125 - cz) / rz, hx = Math.abs(dz) < 1 ? rx * Math.sqrt(1 - dz * dz) : 0; if(hx > .1) out.push([cx - hx, z, cx + hx, z + .25]); } return out; };
  const arvoreK = (c1, c2, s) => [B(-.12 * s, 0, -.12 * s, .24 * s, 1.5 * s, .24 * s, '#5A3A1E'), B(-.6 * s, 1.35 * s, -.6 * s, 1.2 * s, .7 * s, 1.2 * s, c1), B(-.4 * s, 2.05 * s, -.4 * s, .8 * s, .45 * s, .8 * s, c2), B(-.75 * s, 1.5 * s, -.2 * s, .35 * s, .35 * s, .5 * s, c2)];
  const FARDO_K = (j, yw) => [Object.assign(B(-.45, 0, -.28, .9, .5, .56, j % 3 ? '#D9C27F' : '#C9A95E'), { yaw: yw, piv: [0, 0, 0] }), Object.assign(B(-.45, .22, -.29, .9, .05, .01, '#B8964C'), { yaw: yw, piv: [0, 0, 0] })];
  const SACO_K = (j, yw) => [Object.assign(B(-.4, 0, -.25, .8, .42, .5, j % 2 ? '#B89A6E' : '#A88A5E'), { yaw: yw, piv: [0, 0, 0] }), Object.assign(B(-.36, .42, -.22, .72, .36, .44, j % 3 ? '#C2A478' : '#B08F62'), { yaw: yw + .2, piv: [0, 0, 0] }), Object.assign(B(-.1, .5, -.26, .2, .1, .01, '#7A3A22'), { yaw: yw, piv: [0, 0, 0] })];
  const BARREIRA_NEON = (j, yw) => [Object.assign(B(-.6, 0, -.15, 1.2, .55, .3, '#2B2F38'), { yaw: yw, piv: [0, 0, 0] }), Object.assign(B(-.6, .32, -.16, 1.2, .1, .01, j % 2 ? ROSA : AZUL), { yaw: yw, piv: [0, 0, 0], cru: true }), Object.assign(B(-.6, .32, .15, 1.2, .1, .01, j % 2 ? ROSA : AZUL), { yaw: yw, piv: [0, 0, 0], cru: true })];
  /* espalha árvores (ou o que for) nos lugares livres, num sorteio fixo */
  function espalha(ctx, n, semente, f, cria){ const out = []; for(let k = 0; k < n * 6 && out.length < n; k++){ const x = 2 + sorte(semente + k * 3.1) * (ctx.W - 4), z = 2 + sorte(semente + k * 7.7 + 1) * (ctx.D - 4); if(!ctx.livre(x, z, f) || out.some(q => Math.hypot(q.x - x, q.z - z) < 2.6)) continue; out.push({ x, z, bl: cria(out.length) }); } ctx.decor.push(...out); return out; }

  const KART_DEF = {
    patinete: { k: 'patinete', rk: 'kz', nome: 'Circuito do Zerão', sub: 'Parque, lago e capivara atravessando. Rampa por cima do córrego.', W: 74, D: 60, larg: 5,
      pts: [[25.3, 50.6], [39.1, 50.6], [52.9, 50.6], [63.25, 48.3], [67.85, 40.25], [65.55, 32.2], [57.5, 30.47], [54.62, 23.57], [62.1, 18.4], [67.6, 11.8], [63.5, 5.9], [51.75, 5.75], [44.27, 8.62], [41.97, 16.1], [45.42, 25.3], [37.95, 31.62], [30.47, 25.3], [30.47, 14.95], [27.02, 6.9], [18.4, 5.75], [10.35, 8.05], [6.9, 16.1], [10.92, 24.15], [6.9, 32.2], [9.2, 41.4], [14.95, 48.3]],
      cor: '#3A3E45', zebra: [VERM, PAPEL], beira: PAPEL, fora: '#D9C27F', linha: 'rgba(60,40,10,.05)', muro: '#C9A95E', portico: INK, placa: [ROSA, PAPEL], totem: AZUL,
      turbos: [[.04, 0], [.395, 0], [.62, 1], [.875, 0]], rampas: [.41, .89], corrego: .425, discos: [.08, .47, .78], perigo: { tipo: 'capivara', s: .53, alcance: 7.5, vel: .9, pausa: 2600 }, publi: [{ k: 'nexwin', n: 4 }],
      tema(K){
        /* o lago no meio, com as ondinhas, e o bloqueio dele (não dá pra cortar caminho nadando) */
        K.antes.push({ pts: elipse(37, 41.5, 11, 3.6, 32), c: AGUA_K }, ...[[30, 41], [36, 40.2], [41, 42.3], [45, 41]].map(([x, z]) => ret(x, z, x + 1.4, z + .07, '#4F8BC4')));
        K.bloq.push(...bloqElipse(37, 41.5, 11, 3.6));
        /* fardos de palha por fora das curvas rápidas e da chicane */
        [[.14, .23, -1], [.355, .4, -1], [.57, .61, 1], [.8, .88, 1], [.8, .88, -1], [.94, .99, -1]].forEach(([a, b, l]) => K.decor.push(...aoLongo(K.Kp, a, b, l, K.h + 1, 1.6, FARDO_K)));
        /* os ipês e a arquibancada da reta */
        espalha(K, 22, 11, 1.6, j => arvoreK([ROSA, '#FFB3D1', LILAS, '#E8643A'][j % 4], ['#FFB3D1', ROSA, '#B79CFF', '#F08A5D'][j % 4], .9 + sorte(j) * .5));
        [[6, 55], [45, 55]].forEach(([x, z]) => K.decor.push({ x, z, bl: espelhaZ(torcida(20, 3, [ROSA, AZUL, LARANJA, LILAS, PAPEL, VERM]), 1.65) }));
      } },
    'patinete-cafe': { k: 'patinete-cafe', rk: 'kc', nome: 'Terreiro de Café', sub: 'Terra roxa, zigue-zague entre as leiras, túnel da tulha e trator na pista.', W: 74, D: 60, larg: 5,
      pts: [[46.0, 50.6], [32.2, 50.6], [18.4, 50.6], [9.2, 46.0], [5.75, 36.8], [6.9, 25.3], [6.9, 13.8], [11.5, 5.75], [23.0, 5.75], [36.8, 5.75], [50.6, 5.75], [62.1, 6.9], [66.7, 13.8], [63.25, 20.12], [54.05, 20.12], [46.57, 24.72], [37.95, 19.55], [29.32, 24.72], [21.27, 20.12], [15.52, 24.15], [16.1, 32.2], [22.42, 36.8], [31.05, 35.65], [39.1, 40.25], [48.3, 35.65], [57.5, 34.5], [65.55, 39.1], [65.55, 47.15], [57.5, 50.6]],
      cor: '#8E3B2A', zebra: [PAPEL, '#5A2418'], beira: '#E8D9C0', fora: '#D8C9A8', linha: 'rgba(90,60,30,.06)', muro: '#7A4E2A', portico: '#5A3A1E', placa: ['#7A3A22', '#F2D3A0'], totem: LARANJA, rampa: ['#6B4A2E', '#F2D3A0'],
      turbos: [[.035, 0], [.335, 0], [.455, 0], [.845, 0]], rampas: [.19, .86], discos: [.07, .52, .76], perigo: { tipo: 'trator', s: .8, alcance: 8, vel: 1.4, pausa: 2000 }, publi: [{ k: 'nexwin', n: 4 }], publiFase: .1,
      tema(K){
        /* as leiras: o café secando no terreiro, em faixas de grão (só onde não é pista) */
        for(let z = 2; z < K.D - 8; z += 1.7) for(let x = 2; x < K.W - 3; x += 2.2){ if(!K.livre(x + 1, z + .4, 1.4) || !K.livre(x, z, 1.4) || !K.livre(x + 2, z + .8, 1.4)) continue; K.antes.push(ret(x, z, x + 2, z + .8, (Math.floor(x / 2.2) + Math.floor(z / 1.7)) % 3 ? '#6E3424' : '#5A2A1E')); }
        /* o túnel da tulha: pórticos de madeira por cima da reta de cima, com ripas de telhado */
        const { c } = K; for(let s = .3; s <= .385; s += .0085){ const i = Math.round(s * c.N), p = c.P[idxK(c, i)], t = c.T[idxK(c, i)], g = { yaw: Math.atan2(t[0], t[1]), piv: [0, 0, 0] }, w = K.h + .5;
          K.decor.push({ x: p[0], z: p[1], bl: [B(-w - .2, 0, -.15, .3, 3, .3, '#6B4A2E'), B(w - .1, 0, -.15, .3, 3, .3, '#6B4A2E'), B(-w - .3, 3, -.3, w * 2 + .6, .25, .6, '#7A4E2A'), B(-w - .3, 3.25, -.4, w * 2 + .6, .08, .8, '#8E3B2A')].map(b => Object.assign(b, g)) }); }
        /* sacos de café por fora das curvas; pés de café secos (sem folha verde) nas beiradas */
        [[.12, .17, -1], [.44, .5, 1], [.53, .7, 1], [.53, .7, -1], [.69, .74, -1], [.89, .95, -1]].forEach(([a, b, l]) => K.decor.push(...aoLongo(K.Kp, a, b, l, K.h + 1, 1.7, SACO_K)));
        espalha(K, 16, 23, 1.6, j => [B(-.08, 0, -.08, .16, .7, .16, '#4A2E22'), B(-.45, .55, -.45, .9, .8, .9, '#5A3A2A'), B(-.3, 1.3, -.3, .6, .35, .6, '#6B4632'), ...[[-.4, .9, .3], [.3, 1.05, -.42], [.1, .75, .44], [-.2, 1.2, -.3]].map(([x, y, z]) => B(x, y, z, .1, .1, .1, j % 2 ? '#C0392B' : '#E2412E'))]);
        /* a caixa-d'água e a chaminé do torrador */
        const cx = [30, 28], ch = [52, 44.5]; if(K.livre(cx[0], cx[1], 2.5)) K.decor.push({ x: cx[0], z: cx[1], bl: [...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => B(a * .9 - .1, 0, b * .9 - .1, .2, 3.2, .2, '#6B4A2E')), B(-1.2, 3.2, -1.2, 2.4, 1.6, 2.4, '#9AA0A8'), B(-1.3, 4.8, -1.3, 2.6, .2, 2.6, '#7A3A22')] });
        if(K.livre(ch[0], ch[1], 2)) K.decor.push({ x: ch[0], z: ch[1], bl: [B(-1.2, 0, -1, 2.4, 1.6, 2, TIJ), B(-.4, 1.6, -.4, .8, 3.4, .8, TIJ), B(-.5, 5, -.5, 1, .2, 1, INK)] });
      } },
    'patinete-noite': { k: 'patinete-noite', rk: 'kn', nome: 'Noite no Calçadão', sub: 'Asfalto, neon, avenida de turbo, salto na rampa de skate e o busão cruzando.', W: 74, D: 60, larg: 5,
      pts: [[27.6, 50.6], [41.4, 50.6], [55.2, 50.6], [64.4, 48.3], [66.7, 39.1], [66.7, 27.6], [66.7, 16.1], [63.25, 8.05], [54.05, 5.75], [39.1, 5.75], [24.15, 5.75], [11.5, 6.9], [6.9, 13.8], [8.05, 23.0], [14.95, 27.6], [23.0, 25.3], [29.9, 19.55], [39.1, 16.1], [47.15, 19.55], [49.45, 27.6], [44.85, 34.5], [36.8, 35.65], [27.6, 36.8], [19.5, 38], [11.5, 40.5], [8.6, 46], [14, 50.6]],
      cor: '#26282F', zebra: [ROSA, AZUL], beira: '#8F96A0', fora: '#3A3E48', linha: 'rgba(255,255,255,.04)', muro: '#1B1D22', portico: '#2B2F38', placa: [AZUL, ROSA], totem: ROSA, rampa: ['#2E5BFF', '#FF4F9A'], neon: true,
      turbos: [[.04, 0], [.075, 0], [.2, 0], [.36, 1], [.395, -1], [.43, 1], [.955, 0]], rampas: [.215, .45], discos: [.1, .5, .7], perigo: { tipo: 'busao', s: .835, alcance: 8, vel: 3.2, pausa: 1800 }, publi: [{ k: 'nexwin', n: 4 }], publiFase: .2,
      tema(K){
        /* o calçadão: a onda preta e branca no chão da praça do meio */
        const onda = (x0, z0, x1, z1) => { for(let b = 0; b < (z1 - z0) / .9; b++){ const top = [], bot = []; for(let x = x0; x <= x1 + .01; x += .8){ const y = Math.sin(x * .55) * .35; top.push([x, z0 + b * .9 + y]); bot.unshift([x, z0 + b * .9 + .45 + y]); } K.antes.push({ pts: [...top, ...bot], c: b % 2 ? '#E8E4DA' : '#1B1D22' }); } };
        onda(27, 21.5, 46, 31.5);
        /* o chafariz da praça */
        K.antes.push({ pts: elipse(37.5, 26.5, 3.4, 2.6, 24), c: '#5A5E68' }, { pts: elipse(37.5, 26.5, 2.9, 2.1, 24), c: AGUA_K }); K.bloq.push(...bloqElipse(37.5, 26.5, 3.4, 2.6));
        K.decor.push({ x: 37.5, z: 26.5, bl: [B(-.3, 0, -.3, .6, 1.4, .6, '#8F96A0'), B(-.6, 1.4, -.6, 1.2, .15, 1.2, '#8F96A0'), Object.assign(B(-.08, 1.55, -.08, .16, .6, .16, '#CFE6FF'), { cru: true, alpha: .7 }), Object.assign(B(-.55, .2, -.55, 1.1, .5, 1.1, '#CFE6FF'), { cru: true, alpha: .25 })] });
        /* os prédios de janela acesa nas beiradas, com letreiro de neon */
        const predio = (w, a, j) => { const out = [B(0, 0, 0, w, a, 2.4, ['#2B2F38', '#3A3E48', '#23262E'][j % 3])]; for(let y = 1; y < a - .8; y += 1.3) for(let x = .4; x < w - .6; x += 1.1) if(sorte(j * 13 + x * 3 + y) > .35) out.push(Object.assign(B(x, y, 2.41, .6, .7, .01, sorte(x + y + j) > .5 ? '#FFD37A' : '#FFB86B'), { cru: true }));
          out.push(Object.assign(B(w * .2, a - .6, 2.42, w * .6, .35, .02, [ROSA, AZUL, LILAS, LARANJA][j % 4]), { cru: true })); return out; };
        for(let x = 2, j = 0; x < K.W - 6; x += 7.5, j++) if(x < K.W / 2 - 9 || x > K.W / 2 + 4) K.decor.push({ x, z: K.D - 3.2, bl: predio(6, 4 + (j % 3) * 1.6, j) });
        for(let x = 2, j = 5; x < K.W - 6; x += 7.5, j++) K.decor.push({ x, z: .3, bl: espelhaZ(predio(6, 5 + (j % 3) * 1.8, j), 2.4) });
        /* barreira de neon por fora das curvas, e os postes com a luz no chão */
        [[.12, .17, -1], [.26, .33, -1], [.47, .55, -1], [.6, .8, -1], [.86, .96, -1]].forEach(([a, b, l]) => K.decor.push(...aoLongo(K.Kp, a, b, l, K.h + .9, 1.4, BARREIRA_NEON)));
        K.decor.push(...aoLongo(K.Kp, 0, .999, 1, K.h + 1.4, 9, () => [B(-.06, 0, -.06, .12, 3.2, .12, '#8F96A0'), B(-.3, 3.2, -.12, .6, .1, .24, '#8F96A0'), Object.assign(B(-.25, 3.12, -.1, .5, .08, .2, '#FFE9B0'), { cru: true })]).map(e => { K.antes.push({ mancha: [e.x, .005, e.z, 2.2, 2.2, .2, 0, '255,214,140'] }); return e; }));
      } },
    /* a Arena JET: a pista da parceira (patinete elétrico de aluguel), com placa, LED, a marca no chão, as vagas de
       patinete e de power bank, e a van da JET cruzando a pista */
    'patinete-jet': { k: 'patinete-jet', rk: 'kj', nome: 'Arena JET', sub: 'A arena da JET, parceira do Corre: patinete elétrico de aluguel. Placa pra todo lado, avenida de turbo e a van da JET cruzando.', W: 74, D: 60, larg: 5,
      pts: [[27.6,  50.6], [43.7,  50.6], [57.5,  49.45], [65.55,  43.7], [66.7,  34.5], [59.8,  29.32], [50.6,  31.62], [43.7,  36.8], [35.65,  37.38], [29.9,  31.05], [32.2,  23.0], [40.25,  18.97], [51.75,  18.97], [60.95,  16.1], [65.55,  9.2], [59.8,  4.6], [46.0,  5.75], [32.2,  5.75], [18.4,  5.75], [9.2,  9.2], [6.9,  18.4], [12.65,  25.3], [17.25,  33.35], [11.5,  40.82], [9.2,  47.15], [16.1,  51.17]],
      cor: '#1E2026', zebra: ['#307FE2', PAPEL], beira: PAPEL, fora: '#2B2F38', linha: 'rgba(48,127,226,.16)', muro: '#307FE2', portico: INK, placa: ['#307FE2', PAPEL], totem: '#307FE2', rampa: ['#307FE2', PAPEL], porticoPubli: 'jet', banner: 'jet',
      turbos: [[.03, 0], [.31, 0], [.6, 0], [.66, 1], [.7, -1], [.94, 0]], rampas: [.08, .645], discos: [.14, .45, .8], perigo: { tipo: 'van', s: .3, alcance: 6, vel: 2.4, pausa: 2200 },
      publi: [{ k: 'jet', n: 14, longe: 4.2 }], led: [{ k: 'jet', n: 9 }],
      tema(K){
        /* a marca pintada no chão, onde couber */
        let pintou = 0; for(const [x, z] of [[40, 30], [36, 44], [20, 20], [50, 14], [14, 30], [44, 40]]){ if(pintou >= 2) break; const v = pintou, ok = [[-6, -3], [6, -3], [6, 3], [-6, 3], [0, 0]].every(([dx, dz]) => K.livre(x + dx, z + dz, .4)); if(!ok) continue;
          K.antes.push({ img: () => C.verso && C.verso.publiImg('jet', v, 512, 256), P4: [[x - 6, .01, z - 3], [x + 6, .01, z - 3], [x + 6, .01, z + 3], [x - 6, .01, z + 3]] }); pintou++; }
        /* as vagas de patinete da JET (patinete azul estacionado em fila) e as estações de power bank */
        const vaga = () => { const out = [B(-2.2, 0, -.5, 4.4, .08, 1, '#3A3E45'), B(-2.2, .08, -.52, 4.4, .02, .04, '#307FE2')]; for(let j = 0; j < 5; j++){ const x = -1.8 + j * .9; out.push(B(x - .12, .1, -.42, .24, .05, .84, '#2B2F38'), B(x - .03, .15, .3, .06, 1, .06, '#307FE2'), B(x - .3, 1.12, .3, .6, .05, .06, INK), B(x - .05, .08, -.48, .1, .12, .12, '#16181D'), B(x - .05, .08, .34, .1, .12, .12, '#16181D'), Object.assign(B(x - .05, .9, .37, .1, .08, .01, '#FFE9B0'), { cru: true })); } return out; };
        const pb = () => [B(-.4, 0, -.25, .8, 1.7, .5, '#307FE2'), Object.assign(B(-.3, 1.05, .25, .6, .45, .01, '#BFE3FF'), { cru: true }), ...[0, 1, 2].map(j => B(-.3 + j * .21, .35, .25, .17, .5, .02, INK)), B(-.45, 1.7, -.3, .9, .08, .6, PAPEL)];
        espalha(K, 4, 41, 2.4, () => vaga()); espalha(K, 4, 57, 1.8, () => pb());
        /* a torcida azul na reta da largada */
        [[6, 55], [45, 55]].forEach(([x, z]) => K.decor.push({ x, z, bl: espelhaZ(torcida(20, 3, ['#307FE2', PAPEL, INK, '#BFE3FF']), 1.65) }));
      } }
  };

  /* ---------- v3.51 · as quadras: o desafio de pênalti (futsal) e o de arremesso (basquete) ----------
     Toda quadra da cidade tem a entrada da quadra 3D do esporte dela (todas as de futsal dão na mesma sala, e as de
     basquete também, pra gente se encontrar). Lá dentro é desafio de habilidade, 10 tentativas: no futsal a mira
     corre de trave a trave e o goleiro anda; chuta quando a mira tá longe dele. No basquete a régua de força vai e
     volta; arremessa quando ela passa na faixa (de 3 a faixa é mais fina). O melhor do dia vai na presença */
  const torcida = (w, deg, cores) => { const out = []; for(let k = 0; k < deg; k++) out.push(B(0, k * .45, 0, w, .45, (deg - k) * .55, k % 2 ? '#C9CDD3' : '#A4A8AE'));
    for(let k = 0; k < deg; k++) for(let i = 0; i < Math.floor(w / .7); i++){ if(sorte(i * 11 + k * 17 + w) < .4) continue; const z = (deg - k - 1) * .55 + .15;
      out.push(B(.2 + i * .7, (k + 1) * .45, z, .26, .3, .22, cores[(i + k * 3) % cores.length]), B(.24 + i * .7, (k + 1) * .45 + .3, z + .02, .18, .18, .18, ['#C68642', '#8E5B33', '#F0C9A0', '#5A3A22'][(i + k) % 4])); }
    return out; };
  /* uma linha branca reta no chão e um arco de linha (anel fino), em polígonos */
  const linha = (x0, z0, x1, z1, c) => ret(Math.min(x0, x1) - (x0 === x1 ? .04 : 0), Math.min(z0, z1) - (z0 === z1 ? .04 : 0), Math.max(x0, x1) + (x0 === x1 ? .04 : 0), Math.max(z0, z1) + (z0 === z1 ? .04 : 0), c || PAPEL);
  const arco = (cx, cz, r, a0, a1, n, c) => Array.from({ length: n }, (_, i) => { const b0 = a0 + (a1 - a0) * i / n, b1 = a0 + (a1 - a0) * (i + 1) / n; return { pts: anelPts(cx, cz, r + .04, r + .04, r - .04, r - .04, b0, b1), c: c || PAPEL }; });
  const disco2d = (cx, cz, r, c) => ({ pts: ovalPts(cx, cz, r, r, 16), c });
  /* placas de propaganda na beira (formas do Corre, sem marca de ninguém) */
  const placas = (x0, n, z) => Array.from({ length: n }, (_, i) => [B(x0 + i * 1.6, 0, z, 1.5, .7, .1, [ROSA, AMARELO, AZUL, INK][i % 4]), B(x0 + i * 1.6 + .2, .2, z + .1, .7, .3, .01, [PAPEL, INK, PAPEL, AMARELO][i % 4]), B(x0 + i * 1.6 + 1, .15, z + .1, .3, .4, .01, [AMARELO, ROSA, ROSA, ROSA][i % 4])]).flat();
  /* o futsal: quadra azul, o gol no fundo com a rede, o goleiro (robô do Corre, de uniforme de craque) */
  const GOL = { x0: 7.5, x1: 10.5, z: 1.2, alt: 2 };
  const CHAO_FUTSAL = [ret(1.2, 1.2, 16.8, 13.4, '#2F5DA8'), linha(1.2, 1.2, 16.8, 1.2), linha(1.2, 1.2, 1.2, 13.4), linha(16.8, 1.2, 16.8, 13.4), linha(1.2, 13.4, 16.8, 13.4),
    ...arco(9, 1.2, 6, 0, Math.PI, 30), disco2d(9, 7.2, .12, PAPEL), disco2d(9, 11.2, .12, PAPEL), ...arco(9, 13.4, 3, Math.PI, Math.PI * 2, 18)];
  const rede = () => { const out = [B(GOL.x0 - .1, 0, GOL.z - .1, .1, GOL.alt, .1, PAPEL), B(GOL.x1, 0, GOL.z - .1, .1, GOL.alt, .1, PAPEL), B(GOL.x0 - .1, GOL.alt, GOL.z - .1, GOL.x1 - GOL.x0 + .2, .1, .1, PAPEL),
    B(GOL.x0 - .1, 0, GOL.z - .9, .06, 1.8, .06, CINZA), B(GOL.x1 + .04, 0, GOL.z - .9, .06, 1.8, .06, CINZA), B(GOL.x0 - .1, 1.8, GOL.z - .9, GOL.x1 - GOL.x0 + .2, .05, .05, CINZA)];
    for(let x = GOL.x0; x <= GOL.x1 + .01; x += .3) out.push(B(x, 0, GOL.z - .9, .015, 1.8, .015, '#E6E2DA'));
    for(let y = .3; y < 1.8; y += .3) out.push(B(GOL.x0, y, GOL.z - .9, GOL.x1 - GOL.x0, .015, .015, '#E6E2DA'));
    for(let z = GOL.z - .9; z < GOL.z; z += .3){ out.push(B(GOL.x0 - .08, 0, z, .015, 1.9, .015, '#E6E2DA'), B(GOL.x1 + .06, 0, z, .015, 1.9, .015, '#E6E2DA')); }
    return out; };
  /* v3.52: as bolas da caixa são bolas de verdade (esfera), com o desenho do esporte */
  const BE = (x, y, z, d, c, desenho, gira) => Object.assign(B(x, y, z, d, d, d, c), { ex: { esfera: d / 2, desenho, gira } });
  const caixaBolas = (c, des) => [B(0, 0, 0, .7, .45, .5, '#3A3E45'), ...[[.08, .06], [.4, .1], [.22, .26]].map(([x, z], i) => BE(x, .38 + (i === 2 ? .06 : 0), z, .23, c, des, i * 1.3))];
  const FUTSAL_DECOR = [
    { x: 0, z: 0, bl: rede() },
    { x: .3, z: .1, bl: torcida(6.6, 3, [ROSA, AZUL, AMARELO, PAPEL, LARANJA]) }, { x: 11.1, z: .1, bl: torcida(6.6, 3, [AZUL, ROSA, LILAS, PAPEL, '#E2412E']) },
    { x: .2, z: 0, parede: true, bl: [B(0, 2.5, 0, .04, .8, 14, '#1C2350'), ...Array.from({ length: 8 }, (_, i) => B(.04, 2.62, .6 + i * 1.7, .01, .55, 1.4, [ROSA, AMARELO, PAPEL, AZUL][i % 4]))] },
    { x: 17.8, z: 0, parede: true, bl: [B(-.04, 2.5, 0, .04, .8, 14, '#1C2350'), ...Array.from({ length: 8 }, (_, i) => B(-.05, 2.62, .6 + i * 1.7, .01, .55, 1.4, [AMARELO, ROSA, AZUL, PAPEL][i % 4]))] },
    /* o placar eletrônico no fundo, em cima do gol */
    { x: 7, z: .15, parede: true, bl: [B(0, 2.6, 0, 4, 1.1, .08, INK), B(.2, 2.75, .08, 1.4, .8, .01, '#2B2F38'), B(2.4, 2.75, .08, 1.4, .8, .01, '#2B2F38'), B(.5, 2.95, .09, .8, .4, .005, '#E8643A'), B(2.7, 2.95, .09, .8, .4, .005, AMARELO), B(1.75, 3, .09, .5, .3, .005, ROSA)] },
    { x: 11.2, z: 7.4, acao: 'desafio', bl: caixaBolas(PAPEL, 'futsal') }
  ];
  /* o basquete: piso de madeira laranja, o garrafão vermelho, a linha de 3, a tabela e a cesta (o aro é laranja e a rede branca) */
  const ARO = { x: 8, y: 3.05, z: 1.6, r: .23 };
  const CHAO_BASQ = [ret(.8, .8, 15.2, 13.6, '#C8743A'), ...Array.from({ length: 9 }, (_, i) => ret(.8 + i * 1.6, .8, .8 + i * 1.6 + .02, 13.6, '#B5652F')), ret(6.2, .8, 9.8, 6.6, '#B4152E'),
    linha(.8, .8, 15.2, .8), linha(.8, .8, .8, 13.6), linha(15.2, .8, 15.2, 13.6), linha(.8, 13.6, 15.2, 13.6), linha(6.2, .8, 6.2, 6.6), linha(9.8, .8, 9.8, 6.6), linha(6.2, 6.6, 9.8, 6.6),
    ...arco(8, 6.6, 1.8, 0, Math.PI, 16), ...arco(8, 1.6, 6.75, Math.PI * .08, Math.PI * .92, 34), linha(1.6, .8, 1.6, 2.4), linha(14.4, .8, 14.4, 2.4)];
  const PONTOS_BASQ = [-55, -28, 0, 28, 55].map(a => [4.2, a]).concat([-55, -28, 0, 28, 55].map(a => [7.3, a])).map(([r, a]) => { const t = a * Math.PI / 180; return { x: ARO.x + Math.sin(t) * r, z: ARO.z + Math.cos(t) * r, tres: r > 6.75 }; });
  const cesta = () => { const out = [B(7.88, 0, .2, .24, 3.5, .24, INK), B(7.94, 3.3, .3, .12, .12, .9, INK), B(7.1, 2.85, 1.15, 1.8, 1.05, .06, PAPEL),
    B(7.72, 2.95, 1.21, .56, .04, .01, '#E2412E'), B(7.72, 3.35, 1.21, .56, .04, .01, '#E2412E'), B(7.72, 2.95, 1.21, .04, .44, .01, '#E2412E'), B(8.24, 2.95, 1.21, .04, .44, .01, '#E2412E')];
    const r = ARO.r; out.push(B(ARO.x - r, ARO.y, ARO.z - r, r * 2, .03, .03, '#E8643A'), B(ARO.x - r, ARO.y, ARO.z + r - .03, r * 2, .03, .03, '#E8643A'), B(ARO.x - r, ARO.y, ARO.z - r, .03, .03, r * 2, '#E8643A'), B(ARO.x + r - .03, ARO.y, ARO.z - r, .03, .03, r * 2, '#E8643A'), B(7.95, ARO.y - .02, 1.21, .1, .05, .16, '#E8643A'));
    [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1.2], [0, 1.2]].forEach(([a, b]) => out.push(B(ARO.x + a * .17 - .01, ARO.y - .42, ARO.z + b * .15 - .01, .02, .42, .02, PAPEL)));
    return out; };
  const BASQ_DECOR = [
    { x: 0, z: 0, bl: cesta() },
    { x: .3, z: .1, bl: torcida(5.4, 3, [ROSA, AMARELO, AZUL, PAPEL]) }, { x: 10.3, z: .1, bl: torcida(5.4, 3, [LILAS, ROSA, AZUL, LARANJA]) },
    { x: 12.8, z: 11.2, acao: 'desafio', bl: caixaBolas('#E8643A', 'basquete') }
  ];
  const quadraPlanta = (k, nome, W, D, ALT, chao, decor, cor) => ({ k: 'lugar-' + k, W, D, ALT,
    comodos: [{ k, nome, x0: 0, z0: 0, x1: W, z1: D, piso: '#4A4E56', linha: 'rgba(0,0,0,.1)' }],
    paredes: [{ a: [0, D], b: [W, D], ext: [0, 1], portas: [[W / 2 - .6, W / 2 + .6]], entrada: true, cor }, { a: [W, 0], b: [W, D], ext: [1, 0], cor }, { a: [0, 0], b: [0, D], ext: [-1, 0], cor }, { a: [0, 0], b: [W, 0], ext: [0, -1], cor }],
    entrada: { x: W / 2, z: D }, chao: [...chao, ...PONTOS_SPOT(k)], decor, padrao: [] });
  const PONTOS_SPOT = k => (k === 'quadra-basquete' ? PONTOS_BASQ.map(p => disco2d(p.x, p.z, .16, p.tres ? AMARELO : ROSA)) : []);
  const PLANTA_FUTSAL = quadraPlanta('quadra-futsal', 'Quadra do Zerão', 18, 14.4, 4, CHAO_FUTSAL, FUTSAL_DECOR, '#E6E2DA');
  const PLANTA_BASQ = quadraPlanta('quadra-basquete', 'Quadra de basquete', 16, 14.4, 5, CHAO_BASQ, BASQ_DECOR, '#E6E2DA');
  /* ---------- v3.57 · a ACEL: o campo de beisebol ----------
     A ACEL (Associação Cultural e Esportiva de Londrina, a casa nikkei da cidade) ganhou o campo em 3D, de noite e de
     refletor ligado (o Thales: "adicione a Acel no mapa, onde poderão jogar beisebol"). É o campo de verdade em escala
     menor: base a 13 m, montinho a 8,75 m da casa, cerca de 36 m nas linhas a 42 m no meio. Gramado dourado (o Corre
     não tem verde), infield de terra roxa de Londrina, alambrado atrás da casa com lanternas vermelhas, portal na
     entrada e um taikô do lado da arquibancada. O jogo é o Desafio de rebatida (junto do desafio das quadras) */
  const HP = { x: 32, z: 50 }, MONTE = { x: 32, z: 41.25 }, BOLA_B = .095, VERMELHAO = '#D9452B';
  const TERRA_R = '#9C4A2E', TERRA_R2 = '#AE5B3C', PALHA = '#D9C27F', PALHA2 = '#CDB46E';
  /* th: o ângulo a partir do meio do campo (positivo pro lado da 1ª base); a cerca é mais funda no meio */
  const cercaR = th => 36 + 6 * Math.cos(2 * th);
  const noCampo = (th, r) => [HP.x + Math.sin(th) * r, HP.z - Math.cos(th) * r];
  const BASES_B = [noCampo(Math.PI / 4, 13), noCampo(0, 13 * Math.SQRT2), noCampo(-Math.PI / 4, 13)];
  /* uma faixa reta em qualquer direção (a linha de falta vai a 45 graus) */
  const faixa = (x0, z0, x1, z1, w, c) => { const dx = x1 - x0, dz = z1 - z0, n = Math.hypot(dx, dz) || 1, px = -dz / n * w / 2, pz = dx / n * w / 2; return { pts: [[x0 + px, z0 + pz], [x1 + px, z1 + pz], [x1 - px, z1 - pz], [x0 - px, z0 - pz]], c }; };
  const CHAO_BEISEBOL = (() => {
    const out = [];
    /* as faixas do corte no gramado e a pista de aviso (terra) na beira da cerca */
    for(let z = 6; z < 55; z += 4) out.push(ret(3, z, 61, z + 2, PALHA2));
    const N = 30, a0 = -Math.PI / 4 - .04, a1 = Math.PI / 4 + .04;
    for(let i = 0; i < N; i++){ const t0 = a0 + (a1 - a0) * i / N, t1 = a0 + (a1 - a0) * (i + 1) / N; out.push({ pts: [noCampo(t0, cercaR(t0)), noCampo(t1, cercaR(t1)), noCampo(t1, cercaR(t1) - 2.2), noCampo(t0, cercaR(t0) - 2.2)], c: TERRA_R2 }); }
    /* o infield de terra roxa: o arco atrás das bases e a descida até a casa, por fora das linhas */
    const arco = []; for(let g = -76; g <= 76; g += 4){ const r = g * Math.PI / 180; arco.push([MONTE.x + Math.sin(r) * 14, MONTE.z - Math.cos(r) * 14]); }
    out.push({ pts: [[HP.x - 2, HP.z + 1.6], ...arco, [HP.x + 2, HP.z + 1.6], [HP.x, HP.z + 2.6]], c: TERRA_R });
    /* o gramado de dentro (o losango), o círculo da casa, o montinho e a terra das bases */
    out.push({ pts: [[HP.x, HP.z - 1.56], [BASES_B[0][0] - 1.56, BASES_B[0][1]], [HP.x, BASES_B[1][1] + 1.56], [BASES_B[2][0] + 1.56, BASES_B[2][1]]], c: PALHA });
    out.push({ pts: ovalPts(HP.x, HP.z, 2.3, 2.3, 22), c: TERRA_R }, { pts: ovalPts(MONTE.x, MONTE.z, 1.5, 1.5, 18), c: TERRA_R2 });
    BASES_B.forEach(([x, z]) => out.push({ pts: ovalPts(x, z, 1.15, 1.15, 14), c: TERRA_R }));
    /* as linhas de falta, da casa até a cerca, e as caixas do rebatedor */
    [-1, 1].forEach(l => { const p = noCampo(l * Math.PI / 4, cercaR(Math.PI / 4)); out.push(faixa(HP.x, HP.z, p[0], p[1], .1, PAPEL)); });
    [[30.15, 31.35], [32.65, 33.85]].forEach(([x0, x1]) => out.push(linha(x0, 49.05, x1, 49.05), linha(x0, 50.95, x1, 50.95), linha(x0, 49.05, x0, 50.95), linha(x1, 49.05, x1, 50.95)));
    /* a casa (o pentágono, a ponta pro catcher), o pino do lançador, as bases e os círculos de espera */
    out.push({ pts: [[HP.x - .3, HP.z - .3], [HP.x + .3, HP.z - .3], [HP.x + .3, HP.z], [HP.x, HP.z + .3], [HP.x - .3, HP.z]], c: PAPEL });
    out.push(ret(MONTE.x - .3, MONTE.z - .2, MONTE.x + .3, MONTE.z - .05, PAPEL));
    BASES_B.forEach(([x, z]) => out.push({ pts: [[x, z - .32], [x + .32, z], [x, z + .32], [x - .32, z]], c: PAPEL }));
    [[24.6, 53.4], [39.4, 53.4]].forEach(([x, z]) => out.push(disco2d(x, z, .75, TERRA_R2)));
    /* o escudo do Londrina Red Sharks pintado no gramado do meio do campo (o desenho é o mesmo da cidade, verso.js) */
    out.push({ img: () => (C.verso && C.verso.logoSharks ? C.verso.logoSharks() : null), P4: [[25, .01, 15.6], [39, .01, 15.6], [39, .01, 26.47], [25, .01, 26.47]] });
    return out;
  })();
  const BEISEBOL_DECOR = (() => {
    const D = [], cerca = [], N = 30;
    /* a cerca em arco (escura, friso amarelo em cima e almofada vermelha de vez em quando) e os postes de falta */
    for(let i = 0; i < N; i++){
      const t0 = -Math.PI / 4 + Math.PI / 2 * i / N, t1 = -Math.PI / 4 + Math.PI / 2 * (i + 1) / N, p0 = noCampo(t0, cercaR(t0)), p1 = noCampo(t1, cercaR(t1));
      const mx = (p0[0] + p1[0]) / 2, mz = (p0[1] + p1[1]) / 2, len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + .08, g = { yaw: Math.atan2(-(p1[1] - p0[1]), p1[0] - p0[0]), piv: [mx, 0, mz] };
      cerca.push(Object.assign(B(mx - len / 2, 0, mz - .12, len, 1.9, .24, '#2B2F38'), g), Object.assign(B(mx - len / 2, 1.9, mz - .14, len, .1, .28, '#F2C230'), g));
      if(i % 5 === 2) cerca.push(Object.assign(B(mx - len / 2 + .3, .5, mz + .121, len - .6, .7, .01, VERMELHAO), g));
    }
    D.push({ x: 0, z: 0, bl: cerca });
    [-1, 1].forEach(l => { const [x, z] = noCampo(l * Math.PI / 4, cercaR(Math.PI / 4) + .1); D.push({ x, z, bl: [B(-.09, 0, -.09, .18, 7, .18, '#F2C230'), B(l > 0 ? -.6 : .09, 3.4, -.02, .5, 2.6, .04, '#F2C230')] }); });
    /* o placar no fundo do campo (o painel com a imagem é posto em cima, no quadro) e os refletores */
    D.push({ x: 32, z: 3.4, bl: [B(-4.9, 0, -.15, .3, 3.2, .3, INK), B(4.6, 0, -.15, .3, 3.2, .3, INK), B(-5.4, 3.2, -.2, 10.8, 5.4, .4, '#1B1D22'), B(-5.4, 8.6, -.2, 10.8, .25, .4, VERMELHAO)] });
    const lampada = (x, y, z) => Object.assign(B(x, y, z, .5, .5, .02, '#FFF3C4'), { ex: { cru: true } });
    [[5, 18], [59, 18], [4, 52], [60, 52]].forEach(([x, z]) => D.push({ x, z, bl: [B(-.2, 0, -.2, .4, 11, .4, '#3A3E45'), B(-1.4, 11, -.35, 2.8, 1.5, .7, '#2B2F38'),
      ...[0, 1, 2, 3].flatMap(i => [0, 1].flatMap(j => [lampada(-1.25 + i * .66, 11.15 + j * .68, .36), lampada(-1.25 + i * .66, 11.15 + j * .68, -.38)]))] }));
    /* o alambrado atrás da casa, com o vão do meio, e as lanternas vermelhas penduradas nele */
    const alambrado = (x0, x1, z, h) => { const out = [B(x0, 0, z, .12, h, .12, '#3A3E45'), B(x1 - .12, 0, z, .12, h, .12, '#3A3E45'), B(x0, h - .1, z, x1 - x0, .1, .12, '#3A3E45')];
      for(let x = x0 + .5; x < x1 - .1; x += .5) out.push(B(x, 0, z + .04, .025, h - .1, .025, '#8F96A0'));
      for(let y = .5; y < h - .1; y += .5) out.push(B(x0, y, z + .04, x1 - x0, .025, .025, '#8F96A0'));
      return out; };
    D.push({ x: 0, z: 0, bl: [...alambrado(24.6, 30.7, 55.2, 3.6), ...alambrado(33.3, 39.4, 55.2, 3.6)] });
    D.push({ x: 0, z: 0, bl: [25.4, 27.6, 29.8, 34.2, 36.4, 38.6].flatMap(x => [B(x - .01, 3.3, 55.28, .02, .3, .02, INK), Object.assign(B(x - .24, 2.84, 55.06, .48, .48, .48, '#E2412E'), { ex: { esfera: .24 } }), B(x - .13, 3.26, 55.17, .26, .06, .26, INK), B(x - .13, 2.8, 55.17, .26, .06, .26, INK)]) });
    /* a arquibancada atrás da casa, com a torcida de vermelho e branco */
    const cores = [VERMELHAO, PAPEL, INK, AMARELO, ROSA, AZUL, '#F4F1EA'];
    [[9.5, 56.3], [34.5, 56.3]].forEach(([x, z]) => D.push({ x, z, bl: espelhaZ(torcida(20, 3, cores), 1.65) }));
    /* os bancos de reserva (fora das linhas), o taikô e o portal da entrada */
    [[16.6, 45.4], [41.8, 45.4]].forEach(([x, z]) => D.push({ x, z, bl: [B(0, 0, 1.7, 5.6, 1.7, .2, '#3A3E45'), B(0, 0, 0, .18, 1.7, 1.9, '#3A3E45'), B(5.42, 0, 0, .18, 1.7, 1.9, '#3A3E45'), B(-.2, 1.7, -.1, 6, .14, 2.1, VERMELHAO), B(.4, 0, 1.15, 4.8, .45, .45, '#8E5B33'), B(.4, .45, 1.45, 4.8, .4, .1, '#8E5B33')] }));
    D.push({ x: 49.6, z: 52.6, bl: [B(-.7, 0, -.7, 1.4, .45, 1.4, '#5A3A1E'), B(-.55, .45, -.55, 1.1, .95, 1.1, '#8E4B2B'), B(-.6, .55, -.6, 1.2, .08, 1.2, INK), B(-.6, 1.25, -.6, 1.2, .08, 1.2, INK), B(-.5, 1.4, -.5, 1, .03, 1, '#F4E9D8'),
      Object.assign(B(.3, 1.3, -.05, .5, .05, .05, '#C8955A'), { roll: .5, piv: [.3, 1.3, 0] }), Object.assign(B(.3, 1.3, .2, .5, .05, .05, '#C8955A'), { roll: .6, piv: [.3, 1.3, .2] })] });
    D.push({ x: 32, z: 58.9, bl: [B(-1.95, 0, -.15, .3, 4.3, .3, VERMELHAO), B(1.65, 0, -.15, .3, 4.3, .3, VERMELHAO), B(-2, 0, -.2, .4, .35, .4, INK), B(1.6, 0, -.2, .4, .35, .4, INK),
      B(-2.4, 3.35, -.12, 4.8, .26, .24, VERMELHAO), B(-2.7, 4, -.17, 5.4, .3, .34, VERMELHAO), B(-2.9, 4.3, -.22, 5.8, .22, .44, INK), B(-.55, 3.6, -.06, 1.1, .45, .12, INK)] });
    /* o suporte dos tacos (com o capacete): é aqui que começa o desafio */
    D.push({ x: 26.8, z: 52.3, acao: 'desafio', bl: [B(0, 0, 0, .9, .1, .35, '#5A3A1E'), B(0, .85, 0, .9, .08, .35, '#5A3A1E'), B(0, 0, 0, .08, .93, .35, '#5A3A1E'), B(.82, 0, 0, .08, .93, .35, '#5A3A1E'),
      ...[.2, .42, .64].map((x, i) => Object.assign(B(x, .05, .14, .06, .95, .06, '#C8955A'), { roll: (i - 1) * .08, piv: [x + .03, .05, .17] })), B(.28, .93, .05, .32, .22, .28, VERMELHAO), B(.24, .93, .28, .4, .04, .12, VERMELHAO)] });
    return D;
  })();
  const PLANTA_BEISEBOL = (() => {
    const W = 64, D = 60, muro = '#3A3E45', bloq = [];
    /* a cerca fecha o campo: o lado de fora dela não é de andar */
    for(let i = 0; i <= 200; i++){ const t = -Math.PI / 4 + Math.PI / 2 * i / 200, [x, z] = noCampo(t, cercaR(t) + .05); bloq.push([x - .2, z - .2, x + .2, z + .2]); }
    return { k: 'lugar-beisebol', W, D, ALT: 3, longe: 64,
      comodos: [{ k: 'campo', nome: 'ACEL', x0: 0, z0: 0, x1: W, z1: D, piso: PALHA, linha: 'rgba(60,40,10,.05)' }],
      paredes: [{ a: [0, D], b: [W, D], ext: [0, 1], portas: [[W / 2 - .6, W / 2 + .6]], entrada: true, cor: muro, alt: 1.2 }, { a: [W, 0], b: [W, D], ext: [1, 0], cor: muro, alt: 1.2 }, { a: [0, 0], b: [0, D], ext: [-1, 0], cor: muro, alt: 1.2 }, { a: [0, 0], b: [W, 0], ext: [0, -1], cor: muro, alt: 1.2 }],
      entrada: { x: W / 2, z: D }, chao: CHAO_BEISEBOL, bloqueio: bloq, padrao: [], decor: BEISEBOL_DECOR };
  })();
  const DESAFIOS = {
    futsal: { esporte: 'futsal', nome: 'Desafio de pênalti', vez: 'Cobrança', botao: 'Chutar!', per: 1.7, spot: { x: 8.55, z: 7.95, yaw: Math.PI - .07 } },
    basquete: { esporte: 'basquete', nome: 'Desafio de arremesso', vez: 'Arremesso', botao: 'Arremessar!', per: 1.5 },
    beisebol: { esporte: 'beisebol', nome: 'Desafio de rebatida', vez: 'Arremesso', botao: 'Rebater!', per: 1 }
  };

  /* v3.53: as pistas de kart só ficam prontas aqui (o cenário usa a torcida, que é das quadras) */
  /* v3.59 · o Autódromo do Café de verdade (o Thales: "arrumar a pista de moto pra uma pista de verdade: circuito maior,
     rampas, obstáculos"). Volta de 365 m: a reta dos boxes, a curva longa, os esses, o grampo lá em cima, a reta de
     cima com os dois saltos de motocross, o miolo com o terceiro salto, as costelas e a reta de volta. Brita por fora
     das curvas (fora da pista anda devagar), muro de pneu atrás dela, óleo, cone e pilha de pneu na pista, e o trator do
     café cruzando depois do grampo. Moto sozinha contra o relógio (sem bicho e sem item): é "solo" pro motor do kart */
  const PNEU_K = (j, yw) => PNEUS(j).map(b => Object.assign(b, { yaw: yw, piv: [0, 0, 0] }));
  const MOTO_DEF = { k: 'moto', rk: 'mc', solo: true, nome: 'Autódromo do Café', sub: 'O circuito da moto: grampo, esses, saltos de motocross, costelas e óleo na pista.', W: 96, D: 74, larg: 6, longe: 52,
    pts: [[30, 62], [48, 62], [66, 62], [80, 60.5], [87, 53], [87.5, 44], [82, 37], [73, 35], [66, 30], [68, 22], [76, 17], [86, 14], [88, 7.5], [80, 5], [66, 5.5], [50, 5.5], [36, 5.5], [24, 5.5], [14, 8], [8.5, 15], [9, 24], [16, 29], [26, 28], [34, 22], [44, 22], [52, 27], [53, 36], [46, 43], [36, 44], [26, 41], [16, 42], [9.5, 48.5], [10, 57], [18, 62]],
    cor: '#3A3E45', zebra: [VERM, PAPEL], beira: PAPEL, fora: '#D9C27F', linha: 'rgba(60,40,10,.05)', muro: '#2B2F38', portico: INK, placa: [VERM, PAPEL], totem: ROSA, rampa: ['#3A3E45', AMARELO],
    turbos: [[.035, 0], [.43, 0], [.875, 0]], rampas: [.455, .51, .725], costelas: [[.8, .845]],
    obst: [['cone', .06, 1.7], ['cone', .068, -1.7], ['cone', .076, 1.7], ['cone', .084, -1.7], ['cone', .092, 1.7], ['oleo', .14, 1.1], ['pneus', .3, 1.8], ['oleo', .62, -1], ['pneus', .655, -1.8], ['cone', .77, 0], ['pneus', .9, 1.7], ['oleo', .93, -.9]],
    perigo: { tipo: 'trator', s: .4, alcance: 8, vel: 1.4, pausa: 2200 }, publi: [{ k: 'nexwin', n: 5 }], publiFase: .05,
    tema(K){
      const { c, h } = K;
      /* a brita: a faixa de pedrinha por fora de toda curva, e o muro de pneu atrás dela */
      for(let i = 0; i < c.N; i += 2){ const k = (c.K[i] + c.K[idxK(c, i + 1)] + c.K[idxK(c, i + 2)]) / 3; if(Math.abs(k) < 1 / 30) continue; const l = k > 0 ? -1 : 1;
        K.antes.push({ pts: [ptK(c, i, l * (h - .1), -.05), ptK(c, i + 2, l * (h - .1), .05), ptK(c, i + 2, l * (h + 2.6), .05), ptK(c, i, l * (h + 2.6), -.05)], c: (i / 2) % 3 ? '#CFC6B4' : '#C2B8A4' }); }
      const passo = Math.max(1, Math.round(1.05 / c.ds)); let j = 0;
      for(let i = 0; i < c.N; i += passo){ const k = (c.K[idxK(c, i - 2)] + c.K[i] + c.K[idxK(c, i + 2)]) / 3; if(Math.abs(k) < 1 / 30) continue; const l = k > 0 ? -1 : 1, p = ptK(c, i, l * (h + 3), 0);
        if(longeDaLinha(c, p[0], p[1]) < h + 2.6 || p[0] < 1 || p[1] < 1 || p[0] > K.W - 1 || p[1] > K.D - 1) continue; K.decor.push({ x: p[0], z: p[1], bl: PNEU_K(j++, Math.atan2(c.T[i][0], c.T[i][1])) }); }
      /* as arquibancadas da reta dos boxes, a torre da cronometragem e os boxes */
      [[4, 66.5], [62, 66.5]].forEach(([x, z]) => K.decor.push({ x, z, bl: arquibancada(28, 3) }));
      if(K.livre(56, 51, 1.5)) K.decor.push({ x: 56, z: 51, bl: [B(-1, 0, -1, 2, 4.2, 2, '#E6E2DA'), B(-1.2, 4.2, -1.2, 2.4, 1.3, 2.4, '#9CC9F0'), B(-1.3, 5.5, -1.3, 2.6, .25, 2.6, VERM), B(-.9, 4.3, 1.21, 1.8, 1.1, .01, INK), B(-.9, 2.2, 1.01, 1.8, .5, .02, VERM)] });
      for(let x = 22; x < 50; x += 4.4) if(K.livre(x + 2, 50, 1)) K.decor.push({ x, z: 48.6, bl: [B(0, 0, 0, 4, 2.4, 2.6, '#C9CDD3'), B(.2, 0, 2.6, 3.6, 2, .02, '#3A3E45'), B(-.1, 2.4, -.1, 4.2, .2, 2.9, VERM), B(1.2, 1.5, 2.62, 1.6, .5, .02, PAPEL)] });
      /* os ipês do miolo */
      espalha(K, 16, 71, 1.8, j => ipe([ROSA, '#FFB3D1', LILAS, '#E8643A'][j % 4], .9 + sorte(j) * .4));
    } };
  const PLANTAS_KART = {}; Object.keys(KART_DEF).forEach(k => { PLANTAS_KART[k] = plantaKart(KART_DEF[k]); });
  const PLANTA_MOTO = plantaKart(MOTO_DEF);
  const PISTA_MOTO = { kart: true, solo: true, k: 'moto', rk: 'mc', tv: 1, nome: MOTO_DEF.nome, sub: MOTO_DEF.sub, veic: 'moto', vmax: 12.5, acel: 8, giro: 2.4, Kp: PLANTA_MOTO.kart, def: MOTO_DEF };
  /* v3.62 · o Autódromo também é de carro (o Thales: "no autódromo coloque a opção de correr com os carros também").
     Os três carros da garagem, cada um com o seu jeito: o Pé-Vermelho (hatch) arranca forte e vira fechado; o Palhano
     (SUV) é o mais rápido na reta e segura na curva; a Cafeeira (picape) é a mais lenta, mas passa nas costelas
     quase sem tirar o pé. Mesmo circuito e o mesmo motor; o recorde e o placar de cada um ficam à parte (carro não
     disputa tempo com moto). tv vai na presença: 1 moto, 3 hatch, 4 SUV, 5 picape */
  const VEIC_AUTO = [
    { k: 'moto', nome: 'Corre 160', sub: 'Moto: leve, arranca rápido e voa nos saltos.', P: PISTA_MOTO },
    { k: 'hatch', nome: 'Pé-Vermelho', sub: 'Hatch: arranca forte e vira fechado.', P: Object.assign({}, PISTA_MOTO, { veic: 'hatch', rk: 'mh', tv: 3, carro: true, vmax: 13, acel: 7.2, giro: 2.35, costela: .74 }) },
    { k: 'suv', nome: 'Palhano', sub: 'SUV: o mais rápido na reta; na curva, segura.', P: Object.assign({}, PISTA_MOTO, { veic: 'suv', rk: 'ms', tv: 4, carro: true, vmax: 13.6, acel: 6.2, giro: 2.1, costela: .8 }) },
    { k: 'picape', nome: 'Cafeeira', sub: 'Picape: a mais lenta, mas passa nas costelas sem tirar o pé.', P: Object.assign({}, PISTA_MOTO, { veic: 'picape', rk: 'mp', tv: 5, carro: true, vmax: 12.4, acel: 5.8, giro: 1.9, costela: .95 }) }
  ];
  const VEIC_TV = { moto: 1, patinete: 2, hatch: 3, suv: 4, picape: 5 }, TV_VEIC = { 1: 'moto', 2: 'patinete', 3: 'hatch', 4: 'suv', 5: 'picape' };

  /* ---------- v3.77 · o Calçadão de Londrina em 3D ----------
     O Thales pediu o Calçadão "com referência correta do padrão de piso, luminárias etc., pra ser um espaço onde as
     pessoas possam sentar e conversar (bastante NPC)". O que a pesquisa achou (prefeitura, IPPUL, COMPAC, UEL,
     londrinahistorica, OSM): inaugurado em 10/12/1977 na Av. Paraná, uns 700 m e uns 20 m de fachada a fachada,
     cortado pelas ruas. O piso original é petit-pavé preto e branco (pedra de Blumenau), desenho do arquiteto Hely
     Bretas Barros: as "correntes entrelaçadas". Nos trechos 1 a 4 virou paver (de 2010 em diante), cinza com os elos
     em vermelho e amarelo; só o trecho 5 (da Rio de Janeiro à Minas Gerais) ainda tem a pedra portuguesa com o desenho
     de sempre. As luminárias originais são as araucárias de 5 globos (ficaram no trecho 5); nos outros, poste de LED.
     Bancos de peroba em estrutura preta (os originais) e de concreto com encosto (os da reforma), os vasos redondos de concreto, o quiosque
     geométrico com guarda-sol, a fonte luminosa e o orelhão. Na esquina da Rio de Janeiro, o Edifício América com o
     Relojão no alto (aqui ele marca a hora de Brasília de verdade); a Praça Marechal Floriano abre um lado do trecho 4,
     com a Catedral (o telhado de chalé) lá atrás; no trecho 5, a Praça Willie Davids e, do outro lado dela, o Cine
     Teatro Ouro Verde (1952, Artigas e Cascaldi). O resto é inventado no espírito do lugar: loja sem marca de verdade,
     ambulante, locutor de loja, pregador, músico, artesã, pombo e muita gente sentada conversando.
     A planta: o trecho 4 (z de 0 a 34), a Rio de Janeiro (34 a 44) e o trecho 5 (44 a 84); o Calçadão vai de x 8 a 28,
     os prédios da esquerda ficam de 0 a 8 e os da direita de 28 a 36 */
  const KC = { pedra: '#ECE7DC', pedraP: '#1E1F25', paver: '#A3A39C', paverV: '#B4513A', paverA: '#D2A93E', tatil: '#E3BC2E', asfalto: '#2E3138', faixa: '#EFEDE6', meioFio: '#BDB8AE',
    concreto: '#BDB7AC', concretoE: '#9E988D', poste: '#23262D', globo: '#FFF4D6', peroba: '#8E5B33', perobaE: '#70452A', ferro: '#1E2026', grama: '#D6BE79', caminho: '#D9D1C1', terra: '#5A3A22', folha: '#8A603A', ipeAm: '#F5C542' };
  /* o elo visto de cima é um octógono (retângulo de canto cortado); octR é o mesmo girado e posto no lugar */
  const octR = (cx, cz, a, b, c, th) => { const co = Math.cos(th), si = Math.sin(th); return [[-a + c, -b], [a - c, -b], [a, -b + c], [a, b - c], [a - c, b], [-a + c, b], [-a, b - c], [-a, -b + c]].map(([x, z]) => [cx + x * co - z * si, cz + x * si + z * co]); };
  /* as correntes entrelaçadas. v3.78, pela foto que o Thales mandou do trecho 5: o elo é RETANGULAR e a corrente anda
     alinhada com a rua, atravessando o Calçadão (a 3.77 tinha posto em diagonal, pela leitura das descrições). Em cada
     fileira alterna o elo aberto (o quadro escuro com o miolo claro, deitado) e o elo de lado (a barra escura cheia, que
     entra nos dois vizinhos: por cima do de antes e por baixo do de depois, o entrelaçado). A fileira seguinte anda meio
     passo, então a barra de uma cai no meio do quadro da outra e o desenho fecha em degrau: o "quadriculado" que o povo
     fala. O polígono do chão não tem furo: o quadro é o retângulo escuro com o miolo da cor do chão por cima */
  function correntes(x0, z0, x1, z1, o){
    const out = [], P = o.quadro + o.barra - 2 * o.cruza;
    for(let r = 0, z = z0 - o.alto / 2; z < z1; r++, z += o.passoZ){
      const off = (r % 2) * P / 2, bz = z + (o.alto - o.barraAlto) / 2, c2 = o.cor2 || o.cor;
      for(let x = x0 - P + off; x < x1 + .3; x += P){
        out.push(ret(x, z, x + o.quadro, z + o.alto, o.cor), ret(x + o.t, z + o.t, x + o.quadro - o.t, z + o.alto - o.t, o.fundo));
        const bx = x + o.quadro - o.cruza; out.push(ret(bx, bz, bx + o.barra, bz + o.barraAlto, c2));
      }
    }
    return out;
  }
  /* a face de um prédio (pra pôr imagem): eixo 'x' é a parede em x = pos (de a0 a a1 em z), olhando pra +x (s = 1) ou
     pra -x (s = -1); eixo 'z', a parede em z = pos. A ordem dos cantos é a da imagem: cima-esquerda primeiro */
  const faceP4 = (eixo, pos, a0, a1, y0, y1, s) => eixo === 'x' ? (s > 0 ? [[pos, y1, a1], [pos, y1, a0], [pos, y0, a0], [pos, y0, a1]] : [[pos, y1, a0], [pos, y1, a1], [pos, y0, a1], [pos, y0, a0]])
    : (s > 0 ? [[a0, y1, pos], [a1, y1, pos], [a1, y0, pos], [a0, y0, pos]] : [[a1, y1, pos], [a0, y1, pos], [a0, y0, pos], [a1, y0, pos]]);
  /* cada imagem de fachada é feita uma vez (no primeiro quadro que precisa dela) e fica guardada */
  const CALC_IMG = new Map(), PXM = 20, pxm = m => Math.max(16, Math.min(512, Math.round(m * PXM)));
  function calcImg(k, w, h, desenha){ let c = CALC_IMG.get(k); if(!c){ c = document.createElement('canvas'); c.width = Math.max(8, Math.round(w)); c.height = Math.max(8, Math.round(h)); desenha(c.getContext('2d'), c.width, c.height); CALC_IMG.set(k, c); } return c; }
  const letreiro = (g, txt, cx, cy, maxW, alt, cor, peso) => { let t = Math.max(6, Math.round(alt)); g.font = `${peso || 800} ${t}px system-ui, sans-serif`; while(t > 6 && g.measureText(txt).width > maxW){ t--; g.font = `${peso || 800} ${t}px system-ui, sans-serif`; } g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = cor; g.fillText(txt, cx, cy); };
  /* a fachada de cima (do 2º andar pra cima): reboco com textura, janela por andar (umas acesas: no 3D é noite), sacada
     com grade, a faixa de reboco com a pastilha embaixo da janela (os prédios dos anos 60) e a platibanda com o friso
     Art Déco e o ano (os de 3 andares dos anos 40) */
  function fachada(g, w, h, f){
    const top = h * (f.topo || .08), n = f.andares, fh = (h - top) / n, cols = f.cols;
    g.fillStyle = f.cor; g.fillRect(0, 0, w, h);
    for(let i = 0; i < w * h / 60; i++){ g.fillStyle = sorte(i + f.seed * 97) < .5 ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.07)'; g.fillRect(Math.floor(sorte(i * 3 + f.seed) * w), Math.floor(sorte(i * 7 + f.seed * 3) * h), 2, 2); }
    g.fillStyle = f.cor2; g.fillRect(0, 0, w, Math.max(3, top * .3)); g.fillRect(0, top - 3, w, 3);
    if(f.deco) for(let i = -3; i <= 3; i++) g.fillRect(w / 2 + i * w * .045 - 2, 0, 4, top * (.95 - Math.abs(i) * .2));
    if(f.ano){ letreiro(g, f.ano, w * .17, top * .62, w * .2, top * .38, f.cor2); letreiro(g, f.ano, w * .83, top * .62, w * .2, top * .38, f.cor2); }
    if(f.nome) letreiro(g, f.nome, w / 2, top * .6, w * .6, top * .4, f.cor2);
    for(let a = 0; a < n; a++){
      const y0 = top + a * fh;
      if(f.pastilha){ g.fillStyle = f.pastilha; g.fillRect(0, y0 + fh * .74, w, fh * .22); g.fillStyle = 'rgba(255,255,255,.2)'; for(let x = 0; x < w; x += 4) for(let y = Math.ceil(y0 + fh * .74); y < y0 + fh * .95; y += 4) if(sorte(x * 13 + y * 7 + f.seed) < .3) g.fillRect(x, y, 3, 3); }
      if(f.faixa){ g.fillStyle = f.faixa; g.fillRect(0, y0, w, fh * .1); }
      for(let c = 0; c < cols; c++){
        const cw = w / cols, x0 = c * cw + cw * .16, ww = cw * .68, y1 = y0 + fh * .13, hh = fh * .56, acesa = sorte(a * 31 + c * 7 + f.seed) < (f.luz == null ? .3 : f.luz);
        g.fillStyle = acesa ? '#F0C46A' : f.vidro || '#2C3644'; g.fillRect(x0, y1, ww, hh);
        if(acesa){ g.fillStyle = 'rgba(255,244,214,.55)'; g.fillRect(x0 + 2, y1 + 2, ww - 4, hh * .38); } else { g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x0 + ww * .1, y1 + hh * .1, ww * .15, hh * .78); }
        g.fillStyle = f.cor2; g.fillRect(x0 + ww / 2 - 1, y1, 2, hh); g.fillRect(x0, y1 + hh * .42, ww, 2); g.fillRect(x0 - 2, y1 + hh, ww + 4, 3);
      }
      if(f.sacada){ g.fillStyle = f.cor2; g.fillRect(0, y0 + fh * .7, w, fh * .05); g.fillStyle = 'rgba(25,27,33,.6)'; g.fillRect(0, y0 + fh * .76, w, 2); for(let x = 3; x < w; x += 7) g.fillRect(x, y0 + fh * .76, 2, fh * .2); }
    }
  }
  /* o térreo: a vitrine acesa, a porta no meio e o que a loja vende, em formas; o adesivo de liquidação no vidro */
  function terreo(g, w, h, L){
    g.fillStyle = L.parede || '#3A3E45'; g.fillRect(0, 0, w, h);
    const n = Math.max(2, Math.round(w / 64)), mw = w / n, cores = L.cores || [ROSA, AMARELO, AZUL, LARANJA, LILAS, PAPEL];
    for(let i = 0; i < n; i++){
      const x0 = i * mw + 4, ww = mw - 8, y0 = 8, hh = h - 8, porta = i === Math.floor(n / 2);
      const gr = g.createLinearGradient(0, y0, 0, h); gr.addColorStop(0, '#FFEFC6'); gr.addColorStop(1, '#E2C083'); g.fillStyle = gr; g.fillRect(x0, y0, ww, hh);
      if(porta){ g.fillStyle = '#4A3A28'; g.fillRect(x0 + ww * .28, y0 + 6, ww * .44, hh - 6); g.fillStyle = 'rgba(255,239,198,.4)'; g.fillRect(x0 + ww * .31, y0 + 9, ww * .38, hh - 12); g.fillStyle = '#1E2026'; g.fillRect(x0 + ww * .49, y0 + 6, 2, hh - 6); continue; }
      const t = L.tipo, cx = x0 + ww / 2;
      if(t === 'roupa') for(let k = 0; k < 3; k++){ const sx = x0 + ww * (.12 + k * .28), c = cores[(i * 3 + k) % cores.length]; g.fillStyle = '#6B6F78'; g.fillRect(x0 + 4, y0 + hh * .18, ww - 8, 2); g.fillStyle = c; g.fillRect(sx, y0 + hh * .22, ww * .2, hh * .38); g.fillRect(sx - ww * .05, y0 + hh * .22, ww * .3, hh * .1); }
      else if(t === 'sapato' || t === 'otica' || t === 'celular' || t === 'livros' || t === 'variedades' || t === 'relogio'){
        for(let p = 0; p < 3; p++){ const py = y0 + hh * (.3 + p * .24); g.fillStyle = '#8A6E4E'; g.fillRect(x0 + 3, py, ww - 6, 3);
          for(let k = 0; k < 4; k++){ const px = x0 + 6 + k * (ww - 12) / 4, c = cores[(i + p * 2 + k) % cores.length], s = (ww - 12) / 4 - 4;
            g.fillStyle = c;
            if(t === 'sapato'){ g.fillRect(px, py - 7, s, 7); g.fillRect(px + s * .6, py - 11, s * .4, 4); }
            else if(t === 'otica'){ g.fillStyle = INK; g.beginPath(); g.arc(px + s * .25, py - 6, s * .2, 0, 7); g.arc(px + s * .75, py - 6, s * .2, 0, 7); g.fill(); }
            else if(t === 'celular') g.fillRect(px + s * .25, py - 14, s * .5, 13);
            else if(t === 'livros') for(let q = 0; q < 4; q++){ g.fillStyle = cores[(k + q + p) % cores.length]; g.fillRect(px + q * s / 4, py - 12 + (q % 2) * 2, s / 4 - 1, 12 - (q % 2) * 2); }
            else if(t === 'relogio'){ g.fillStyle = '#E8E2D2'; g.beginPath(); g.arc(px + s / 2, py - 7, s * .3, 0, 7); g.fill(); g.fillStyle = INK; g.fillRect(px + s / 2 - 1, py - 11, 2, 5); }
            else g.fillRect(px, py - 9 + (k % 2) * 3, s, 9 - (k % 2) * 3);
          } }
      }
      else if(t === 'lanche'){ g.fillStyle = '#B5722E'; g.fillRect(x0 + 4, y0 + hh * .6, ww - 8, hh * .12); for(let k = 0; k < 5; k++){ g.fillStyle = k % 2 ? '#E7B84A' : '#C9822E'; g.beginPath(); g.ellipse(x0 + 10 + k * (ww - 20) / 4, y0 + hh * .56, 6, 4, 0, 0, 7); g.fill(); } letreiro(g, 'PASTEL · COXINHA', cx, y0 + hh * .25, ww * .9, 11, '#8E2B1E'); }
      else if(t === 'farmacia'){ g.fillStyle = '#E8ECF2'; g.fillRect(x0 + 4, y0 + 4, ww - 8, hh - 8); for(let p = 0; p < 3; p++) for(let k = 0; k < 5; k++){ g.fillStyle = cores[(p + k) % cores.length]; g.fillRect(x0 + 8 + k * (ww - 16) / 5, y0 + hh * (.25 + p * .25), (ww - 16) / 5 - 3, 8); } }
      else { g.fillStyle = cores[i % cores.length]; g.fillRect(cx - ww * .25, y0 + hh * .3, ww * .5, hh * .5); }
      g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(x0 + ww * .07, y0 + 3, ww * .08, hh - 6);
      g.fillStyle = L.parede || '#3A3E45'; g.fillRect(x0, y0 + hh * .08, ww, 2);
      if(L.adesivo && i === 0){ g.fillStyle = L.adesivoCor || ROSA; g.fillRect(x0 + ww * .55, y0 + hh * .62, ww * .4, hh * .2); letreiro(g, L.adesivo, x0 + ww * .75, y0 + hh * .72, ww * .36, hh * .12, PAPEL); }
    }
  }
  /* a placa da loja em cima da marquise: o nome em letra grossa, com a borda de cima e de baixo */
  const placaLoja = L => g => { const w = g.canvas.width, h = g.canvas.height; g.fillStyle = L.fundo; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, h - 3, w, 3); g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(0, 0, w, 2); letreiro(g, L.nome, w / 2, h * .54, w * .94, h * .62, L.cor); };
  /* o Relojão: o mostrador quadrado no alto do Edifício América, com a hora de Brasília (refeito a cada minuto) */
  const horaBR = () => { try{ const p = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date()); return [Number(p.find(x => x.type === 'hour').value), Number(p.find(x => x.type === 'minute').value)]; }catch(e){ const d = new Date(); return [d.getHours(), d.getMinutes()]; } };
  const RELOJAO = { k: '', c: null };
  function relojao(){
    const [hh, mm] = horaBR(), k = hh + ':' + mm; if(RELOJAO.c && RELOJAO.k === k) return RELOJAO.c;
    const c = RELOJAO.c || document.createElement('canvas'); c.width = c.height = 160; const g = c.getContext('2d');
    g.fillStyle = '#1E2026'; g.fillRect(0, 0, 160, 160); g.fillStyle = '#FBF6E8'; g.fillRect(9, 9, 142, 142); g.strokeStyle = '#B9B2A2'; g.lineWidth = 2; g.strokeRect(14, 14, 132, 132);
    g.save(); g.translate(80, 80); g.fillStyle = '#1E2026';
    for(let i = 0; i < 60; i++){ g.save(); g.rotate(i / 60 * Math.PI * 2); if(i % 5) g.fillRect(-1, -64, 2, 5); else g.fillRect(-3, -66, 6, i % 15 ? 12 : 17); g.restore(); }
    const ponteiro = (a, L, w) => { g.save(); g.rotate(a); g.fillRect(-w / 2, -L, w, L + 10); g.restore(); };
    ponteiro(((hh % 12) + mm / 60) / 12 * Math.PI * 2, 38, 7); ponteiro(mm / 60 * Math.PI * 2, 56, 4.5);
    g.beginPath(); g.arc(0, 0, 6, 0, 7); g.fill(); g.restore();
    RELOJAO.k = k; RELOJAO.c = c; return c;
  }
  /* o Cine Teatro Ouro Verde: a fachada de pastilha clara, o vidrão aceso e o letreiro em cima */
  const fachadaOuro = g => { const w = g.canvas.width, h = g.canvas.height;
    g.fillStyle = '#E6D7B0'; g.fillRect(0, 0, w, h); for(let x = 0; x < w; x += 4) for(let y = 0; y < h; y += 4) if(sorte(x * 7 + y * 13) < .35){ g.fillStyle = sorte(x + y) < .5 ? 'rgba(160,120,60,.18)' : 'rgba(255,255,255,.25)'; g.fillRect(x, y, 3, 3); }
    g.fillStyle = '#2B2F38'; g.fillRect(0, h * .08, w, h * .16); letreiro(g, 'CINE TEATRO OURO VERDE', w / 2, h * .16, w * .9, h * .1, '#F4E3A8');
    const gr = g.createLinearGradient(0, h * .3, 0, h * .62); gr.addColorStop(0, '#FFE9B4'); gr.addColorStop(1, '#D9A55A'); g.fillStyle = gr; g.fillRect(w * .04, h * .3, w * .92, h * .3);
    g.fillStyle = '#5A4630'; for(let x = w * .04; x < w * .96; x += w * .06) g.fillRect(x, h * .3, 3, h * .3);
    g.fillStyle = '#B08A50'; g.fillRect(0, h * .62, w, h * .04); g.fillStyle = '#3A2E22'; for(let i = 0; i < 5; i++) g.fillRect(w * (.2 + i * .14), h * .7, w * .08, h * .3);
    g.fillStyle = 'rgba(255,233,180,.45)'; for(let i = 0; i < 5; i++) g.fillRect(w * (.21 + i * .14), h * .72, w * .06, h * .26); };
  /* a Catedral: a empena da frente (o triângulo do telhado de chalé, com o vitral comprido) e a parte de baixo, com as portas */
  const empenaCatedral = g => { const w = g.canvas.width, h = g.canvas.height; g.clearRect(0, 0, w, h);
    g.beginPath(); g.moveTo(0, h); g.lineTo(w / 2, 0); g.lineTo(w, h); g.closePath(); g.fillStyle = '#ECE5D4'; g.fill(); g.lineWidth = 6; g.strokeStyle = '#5E6672'; g.stroke();
    const vw = w * .08; [AZUL, ROSA, AMARELO, LILAS, '#E2412E', CEU].forEach((c, i) => { g.fillStyle = c; g.fillRect(w / 2 - vw / 2, h * (.22 + i * .12), vw, h * .12); }); g.strokeStyle = '#2B2F38'; g.lineWidth = 3; g.strokeRect(w / 2 - vw / 2, h * .22, vw, h * .72); };
  const frenteCatedral = g => { const w = g.canvas.width, h = g.canvas.height; g.fillStyle = '#E9E1D0'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#5A3A22'; g.fillRect(w * .38, h * .35, w * .24, h * .65); g.fillStyle = '#7A4E2A'; g.fillRect(w * .4, h * .38, w * .095, h * .62); g.fillRect(w * .505, h * .38, w * .095, h * .62);
    g.fillStyle = '#5A3A22'; g.fillRect(w * .12, h * .5, w * .12, h * .5); g.fillRect(w * .76, h * .5, w * .12, h * .5); g.fillStyle = '#C9B98F'; g.fillRect(0, h * .2, w, 4); };
  /* a placa azul de rua (a de esquina) e o totem do Calçadão */
  const placaRua = txt => g => { const w = g.canvas.width, h = g.canvas.height; g.fillStyle = '#1F4FA3'; g.fillRect(0, 0, w, h); g.strokeStyle = PAPEL; g.lineWidth = 3; g.strokeRect(4, 4, w - 8, h - 8); letreiro(g, txt, w / 2, h / 2 + 1, w * .86, h * .5, PAPEL); };
  const totemCalc = g => { const w = g.canvas.width, h = g.canvas.height; g.fillStyle = '#1F4FA3'; g.fillRect(0, 0, w, h);
    letreiro(g, 'CALÇADÃO', w / 2, h * .09, w * .86, h * .07, PAPEL); letreiro(g, 'DE LONDRINA', w / 2, h * .16, w * .86, h * .045, '#F2D06B'); letreiro(g, 'desde 1977', w / 2, h * .22, w * .7, h * .04, PAPEL, 600);
    g.fillStyle = '#ECE7DC'; g.fillRect(w * .1, h * .3, w * .8, h * .6); ['1', '2', '3', '4', '5'].forEach((n, i) => { const y = h * (.34 + i * .11); g.fillStyle = i === 4 ? '#1E1F25' : KC.paverV; g.fillRect(w * .44, y, w * .12, h * .09); letreiro(g, 'TRECHO ' + n, w * .27, y + h * .045, w * .3, h * .03, '#1E2026', 700); });
    letreiro(g, 'Você está aqui', w / 2, h * .95, w * .9, h * .035, '#F2D06B', 700); };
  /* os móveis da rua (todos de frente pra +x; espelhaX vira pro outro lado) */
  const espelhaX = (bl, L) => bl.map(b => Object.assign({}, b, { x: L - b.x - b.w }));
  /* a luminária araucária (a original do Calçadão, que ficou no trecho 5): o poste escuro, quatro braços em cruz com um
     globo cada e o quinto globo em cima, a "pinha" */
  const araucaria = () => { const out = [B(-.14, 0, -.14, .28, .45, .28, KC.ferro), B(-.07, .45, -.07, .14, 3.95, .14, KC.poste)];
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dz]) => out.push(B(dx > 0 ? .07 : dx < 0 ? -.55 : -.03, 3.62, dz > 0 ? .07 : dz < 0 ? -.55 : -.03, dx ? .48 : .06, .05, dz ? .48 : .06, KC.poste), Object.assign(B(dx * .58 - .2, 3.67, dz * .58 - .2, .4, .4, .4, KC.globo), { ex: { esfera: .2 } })));
    out.push(Object.assign(B(-.23, 4.4, -.23, .46, .46, .46, KC.globo), { ex: { esfera: .23 } }));
    return out; };
  /* o poste de LED dos trechos reformados: braço pro meio do Calçadão */
  const posteLed = l => { const bl = [B(-.1, 0, -.1, .2, .4, .2, '#3A3E45'), B(-.06, .4, -.06, .12, 5.1, .12, '#5A5F68'), B(-.05, 5.42, -.05, 1, .07, .1, '#5A5F68'), B(.72, 5.3, -.16, .56, .14, .32, '#3A3E45'), Object.assign(B(.75, 5.29, -.13, .5, .01, .26, KC.globo), { ex: { cru: true } })];
    return l > 0 ? bl : bl.map(b => Object.assign({}, b, { x: -b.x - b.w })); };
  /* o banco de peroba na estrutura preta (o do desenho original) e o de concreto com encosto (o da reforma de 2010) */
  const bancoPeroba = () => [B(.04, 0, .12, .44, .4, .07, KC.ferro), B(.04, 0, 2.01, .44, .4, .07, KC.ferro), ...[0, 1, 2, 3].map(i => B(.03 + i * .115, .4 + (3 - i) * .012, 0, .1, .05, 2.2, i % 2 ? KC.perobaE : KC.peroba)),
    B(-.04, .45, .12, .06, .55, .07, KC.ferro), B(-.04, .45, 2.01, .06, .55, .07, KC.ferro), B(-.07, .66, 0, .06, .11, 2.2, KC.peroba), B(-.07, .84, 0, .06, .11, 2.2, KC.perobaE)];
  const bancoConcreto = () => [B(.06, 0, .14, .38, .38, .3, KC.concretoE), B(.06, 0, 1.76, .38, .38, .3, KC.concretoE), B(0, .38, 0, .5, .1, 2.2, KC.concreto), B(-.1, .48, 0, .12, .52, 2.2, KC.concreto)];
  /* o vaso redondo de concreto (os da foto, enfileirados no meio e na beira; em 2019 ganharam flor colorida): o oito
     lados sai de duas caixas, uma girada (só a reta conta pra trombar). Sem verde: a folhagem é de palha escura */
  const vaso = (c1, c2) => { const g = { yaw: Math.PI / 4, piv: [0, 0, 0] }; return [B(-.5, 0, -.5, 1, .46, 1, KC.concreto), Object.assign(B(-.5, 0, -.5, 1, .46, 1, KC.concreto), g),
    B(-.44, .46, -.44, .88, .03, .88, KC.terra), ...[[-.22, -.2], [.12, -.16], [-.08, .16], [.2, .2]].map(([x, z], i) => B(x - .14, .49, z - .14, .28, .22 + (i % 2) * .1, .28, KC.folha)),
    ...[[-.25, .05], [.18, -.25], [.05, .24], [-.05, -.05], [.27, .08]].map(([x, z], i) => B(x - .07, .68 + (i % 2) * .08, z - .07, .14, .1, .14, i % 2 ? c2 : c1))]; };
  const frade = () => [B(-.13, 0, -.13, .26, .72, .26, KC.concreto), B(-.15, .72, -.15, .3, .06, .3, KC.concretoE)];
  /* a sibipiruna: copa larga e baixa, dourada, com as flores amarelas */
  /* a copa vai num dourado puxado pro laranja: o amarelo puro, na sombra, vira oliva (e aqui não tem verde) */
  const sibipiruna = () => [B(.52, 0, .52, .36, 3, .36, '#6B4A32'), B(-.5, 2.8, -.5, 2.4, .7, 2.4, '#C9953A'), B(.1, 3.45, .1, 1.4, .45, 1.4, '#D9A540'), B(-.3, 3.1, .5, .5, .4, .5, '#E2B24A'), ...[[0, 0], [1.6, .3], [.5, 1.6], [1.6, 1.5], [.2, 1.1]].map(([x, z]) => B(x - .4, 3.47, z - .4, .2, .14, .2, '#F2D04B'))];
  /* o quiosque de sucos (os quiosques geométricos que voltaram em 2017): balcão, quatro colunas e o telhado em degraus */
  const quiosque = () => [B(-1.2, 0, -1.2, 2.4, 1.05, 2.4, '#F2EDE2'), B(-1.3, 1.05, -1.3, 2.6, .08, 2.6, LARANJA), ...[[-1.15, -1.15], [1, -1.15], [-1.15, 1], [1, 1]].map(([x, z]) => B(x, 1.13, z, .15, 1.4, .15, '#E6E1D6')),
    B(-1.5, 2.53, -1.5, 3, .18, 3, LARANJA), B(-1.1, 2.71, -1.1, 2.2, .16, 2.2, PAPEL), B(-.7, 2.87, -.7, 1.4, .14, 1.4, LARANJA), B(-.3, 3.01, -.3, .6, .12, .6, PAPEL),
    B(-.95, 1.13, -.95, .26, .22, .26, '#E2412E'), B(-.55, 1.13, -1.05, .26, .26, .26, AMARELO), B(.5, 1.13, -1.0, .32, .2, .32, LARANJA), B(-.1, 1.13, -1.05, .22, .3, .22, ROSA)];
  /* a mesa com guarda-sol (os "sombreros" de antes) e as duas banquetas */
  const mesaSol = c => [B(-.06, 0, -.06, .12, .72, .12, '#3A3E45'), B(-.45, .72, -.45, .9, .05, .9, PAPEL), B(-.03, .77, -.03, .06, 1.55, .06, '#3A3E45'), B(-1.1, 2.3, -1.1, 2.2, .1, 2.2, c), B(-.8, 2.4, -.8, 1.6, .1, 1.6, PAPEL), B(-.4, 2.5, -.4, .8, .08, .8, c),
    B(-1.1, 0, -.2, .4, .45, .4, '#C9CDD3'), B(.7, 0, -.2, .4, .45, .4, '#C9CDD3')];
  /* a fonte luminosa (a do trecho 1, que voltou a funcionar em 2019): a borda, a água e o pedestal; os jatos são do quadro */
  const fonte = () => [B(-2.1, 0, -2.1, 4.2, .5, .3, KC.concreto), B(-2.1, 0, 1.8, 4.2, .5, .3, KC.concreto), B(-2.1, 0, -1.8, .3, .5, 3.6, KC.concreto), B(1.8, 0, -1.8, .3, .5, 3.6, KC.concreto),
    B(-2.15, .5, -2.15, 4.3, .06, .4, '#D6D0C4'), B(-2.15, .5, 1.75, 4.3, .06, .4, '#D6D0C4'), B(-2.15, .5, -1.75, .4, .06, 3.5, '#D6D0C4'), B(1.75, .5, -1.75, .4, .06, 3.5, '#D6D0C4'),
    B(-1.8, .1, -1.8, 3.6, .28, 3.6, '#2F6FA8'), B(-.3, .38, -.3, .6, .4, .6, '#D6D0C4')];
  /* os carrinhos dos ambulantes: pipoca, milho e fruta */
  const carrinho = k => { const cor = k === 'pipoca' ? '#E2412E' : k === 'milho' ? '#F2E3B0' : '#B3793F', out = [B(0, .15, 0, 1, .75, .7, cor), B(0, 0, .05, .15, .15, .15, INK), B(.85, 0, .05, .15, .15, .15, INK), B(.85, 0, .5, .15, .15, .15, INK), B(1, .6, .3, .4, .05, .05, '#5A5F68')];
    if(k === 'pipoca') out.push(B(.05, .9, .05, .9, .05, .6, PAPEL), B(.05, .95, .05, .05, .55, .05, PAPEL), B(.9, .95, .05, .05, .55, .05, PAPEL), B(.05, .95, .6, .05, .55, .05, PAPEL), B(.9, .95, .6, .05, .55, .05, PAPEL), B(.05, 1.5, .05, .9, .06, .6, '#E2412E'), B(.12, .95, .12, .76, .26, .46, '#FFF1C8'), B(.25, 1.21, .2, .2, .1, .2, AMARELO));
    else if(k === 'milho') out.push(B(.15, .9, .1, .5, .4, .5, '#3A3E45'), B(.12, 1.3, .07, .56, .05, .56, '#5A5F68'), B(.7, .9, .15, .12, .3, .12, '#F2D04B'), B(.7, .9, .4, .12, .3, .12, '#E7B84A'), B(.05, .9, .05, .05, 1.1, .05, '#5A5F68'), B(.05, 2, .05, .9, .05, .6, '#E2412E'));
    else out.push(...[[.1, .15], [.42, .2], [.72, .1]].map(([x, z]) => B(x, .9, z, .26, .16, .4, '#E2412E')), ...[[.1, .15], [.42, .2], [.72, .1]].map(([x, z]) => B(x, .9, z + .38, .26, .16, .04, PAPEL)), B(.2, .9, .58, .2, .3, .1, '#E7B84A'), B(.24, 1.2, .6, .12, .14, .06, '#B08A3E'), B(.6, .9, .58, .16, .12, .1, '#E2412E'));
    return out; };
  /* o prédio da beira: o corpo, a marquise de concreto com a placa da loja em cima, a fachada (imagem) e o térreo de loja
     (imagem). l = 1: lado esquerdo (fachada em x = 8, olhando pra +x); l = -1: direito (fachada em x = 28) */
  function predioCalc(K, p){
    const l = p.l, fx = l > 0 ? 8 : 28, L = p.z1 - p.z0, h = p.h, k = 'p' + K.n++;
    /* pilotis: o corpo começa em cima do térreo recuado (o Autolon) */
    K.decor.push({ x: 0, z: 0, bl: [B(l > 0 ? fx - 8 : fx, p.pilotis ? p.y0 : 0, p.z0, 8, p.pilotis ? h - p.y0 : h, L, p.cor)] });
    if(p.loja !== false){
      K.decor.push({ x: 0, z: 0, bl: [B(l > 0 ? fx : fx - 1.4, 3.3, p.z0 + .15, 1.4, .2, L - .3, KC.concreto), B(l > 0 ? fx + 1.3 : fx - 1.4, 3.5, p.z0 + .5, .1, .62, L - 1, p.loja.fundo)] });
      K.imgs.push({ P4: faceP4('x', fx + l * 1.41, p.z0 + .5, p.z1 - .5, 3.5, 4.12, l), img: () => calcImg(k + 'pl', pxm(L - 1) * 1.6, 40, placaLoja(p.loja)), cor: p.loja.fundo });
      K.imgs.push({ P4: faceP4('x', fx + l * .02, p.z0, p.z1, 0, 3.3, l), img: () => calcImg(k + 't', pxm(L) * 1.4, 96, (g, w, hh) => terreo(g, w, hh, p.loja)), cor: '#3A3E45' });
      K.luzes.push({ mancha: [fx + l * 1.3, .004, (p.z0 + p.z1) / 2, 1.1, L * .42, .15, 0, '255,214,150'] });
    }
    const y0 = p.y0 || 3.5;
    K.imgs.push({ P4: faceP4('x', fx + l * .02, p.z0, p.z1, y0, h, l), img: () => calcImg(k + 'f', pxm(L), pxm(h - y0), (g, w, hh) => fachada(g, w, hh, Object.assign({ seed: K.n * 7 }, p.f))), cor: p.cor });
    return k;
  }
  const PLANTA_CALCADAO = (() => {
    const W = 48, D = 84, K = { n: 0, decor: [], imgs: [], luzes: [], assentos: [], gente: [] }, chao = [];
    /* o chão: o paver do trecho 4 (cinza, os elos em vermelho e amarelo, a faixa tátil) e a pedra portuguesa do trecho
       5 (o desenho original, preto no branco); a praça e a rua vêm depois e cobrem o elo que passou da beira */
    chao.push(ret(-2, -40, 50, 0, KC.paver), ...correntes(8, 0, 28, 34, { quadro: 2, alto: 1.1, t: .29, barra: 1.05, barraAlto: .5, cruza: .29, passoZ: 1.62, cor: KC.paverV, cor2: KC.paverA, fundo: KC.paver }));
    chao.push(ret(11.8, 0, 12.2, 34, KC.tatil), ret(11.8, -40, 12.2, -9, KC.tatil));
    chao.push(...correntes(8, 44, 28, 84, { quadro: 2, alto: 1.1, t: .31, barra: 1.05, barraAlto: .52, cruza: .31, passoZ: 1.62, cor: KC.pedraP, fundo: KC.pedra }));
    /* as ruas: a São Paulo lá na frente, a Rio de Janeiro no meio e a Minas Gerais atrás da entrada; meio-fio,
       faixa amarela dupla no meio e a faixa de pedestre na largura do Calçadão */
    const rua = (z0, z1) => { chao.push(ret(-30, z0, 78, z1, KC.asfalto), ret(-30, z0 - .15, 78, z0 + .12, KC.meioFio), ret(-30, z1 - .12, 78, z1 + .15, KC.meioFio));
      const m = (z0 + z1) / 2; chao.push(ret(-30, m - .2, 7, m - .1, AMARELO), ret(-30, m + .1, 7, m + .2, AMARELO), ret(29, m - .2, 78, m - .1, AMARELO), ret(29, m + .1, 78, m + .2, AMARELO));
      for(let z = z0 + .7; z < z1 - .5; z += .9) chao.push(ret(9, z, 27, z + .45, KC.faixa)); };
    rua(-9, 0); rua(34, 44); rua(84, 93);
    /* a Praça Marechal Floriano (a Praça da Bandeira) abre o lado do trecho 4: grama de palha, os caminhos em asterisco e
       o canteiro redondo no meio; os degraus no fundo sobem pra Catedral */
    const praca = (x0, z0, x1, z1) => chao.push(ret(x0, z0, x1, z1, KC.grama));
    praca(28, 8, 52, 26);
    for(let i = 0; i < 8; i++){ const a = i * Math.PI / 4, L = i % 2 ? 9.2 : 10.5; chao.push({ pts: octR(38 + Math.cos(a) * L / 2, 17 + Math.sin(a) * L / 2, L / 2, .8, .01, a), c: KC.caminho }); }
    chao.push({ pts: octR(38, 17, 2.7, 2.7, 1.1, 0), c: KC.caminho }, { pts: octR(38, 17, 1.7, 1.7, .7, 0), c: KC.terra }, ret(28, 8, 30, 26, KC.caminho));
    /* a Praça Willie Davids (no trecho 5): os caminhos em tridente saindo do Calçadão, o busto no fim do do meio */
    praca(28, 56, 38, 78);
    [[37.5, 58.8], [37.5, 67], [37.5, 75.2]].forEach(([x, z]) => { const a = Math.atan2(z - 67, x - 28.5), L = Math.hypot(x - 28.5, z - 67); chao.push({ pts: octR((x + 28.5) / 2, (z + 67) / 2, L / 2, .7, .01, a), c: KC.caminho }); });
    chao.push(ret(28, 56, 29.2, 78, KC.caminho));
    /* os prédios (a fachada é imagem: uma por face, leve pro celular) */
    const lojas = [
      { nome: 'MAGAZINE PÉ-VERMELHO', fundo: '#B4152E', cor: PAPEL, tipo: 'roupa', adesivo: 'LIQUIDA', parede: '#2B2F38' },
      { nome: 'ÓTICA OLHO VIVO', fundo: '#1F4FA3', cor: PAPEL, tipo: 'otica' },
      { nome: 'RELOJOARIA HORA CERTA', fundo: '#1E2026', cor: '#F2D06B', tipo: 'relogio' },
      { nome: 'CALÇADOS PASSO CERTO', fundo: AMARELO, cor: INK, tipo: 'sapato', adesivo: '2º PAR', adesivoCor: '#B4152E' },
      { nome: 'CASA DAS CAPINHAS', fundo: ROSA, cor: PAPEL, tipo: 'celular' },
      { nome: 'PASTELARIA DO SEU KENJI', fundo: '#E8643A', cor: PAPEL, tipo: 'lanche' },
      { nome: 'FARMÁCIA SAÚDE BOA', fundo: '#2E5BFF', cor: PAPEL, tipo: 'farmacia' },
      { nome: 'LIVRARIA PÁGINA VIRADA', fundo: '#3A2E4A', cor: '#F4E3A8', tipo: 'livros' },
      { nome: 'TUDO POR 1,99 E POUCO', fundo: '#F2C230', cor: '#B4152E', tipo: 'variedades', adesivo: 'OFERTA' },
      { nome: 'LOJÃO DO CORRE', fundo: INK, cor: AMARELO, tipo: 'roupa', cores: [AMARELO, ROSA, PAPEL, LILAS] },
      { nome: 'TECIDOS ARAUCÁRIA', fundo: '#8E4B2B', cor: PAPEL, tipo: 'variedades' }
    ];
    /* lado esquerdo: no trecho 4, o Art Déco de 3 andares, o prédio de pastilha e o Edifício América na esquina; no
       trecho 5, outro Art Déco, o Autolon (o térreo alto com os pilares em V) e a torre de sacadas */
    predioCalc(K, { l: 1, z0: 0, z1: 11, h: 11.5, cor: '#E8D5B5', loja: lojas[0], f: { andares: 2, cols: 4, cor: '#E8D5B5', cor2: '#B08A50', deco: true, ano: '1948', topo: .22, sacada: true, luz: .4 } });
    predioCalc(K, { l: 1, z0: 11, z1: 22, h: 24, cor: '#E6E1D6', loja: lojas[1], f: { andares: 6, cols: 4, cor: '#E6E1D6', cor2: '#8F96A0', pastilha: '#3F6FB8', luz: .35 } });
    const am = predioCalc(K, { l: 1, z0: 22, z1: 34, h: 24, cor: '#D9D6CC', loja: lojas[2], f: { andares: 6, cols: 4, cor: '#D9D6CC', cor2: '#6B7480', nome: 'EDIFÍCIO AMÉRICA', topo: .2, luz: .3 } });
    /* o Relojão: em cima do Edifício América, virado pro Calçadão e pra Rio de Janeiro */
    K.decor.push({ x: 0, z: 0, bl: [B(1, 24, 24.6, 6.6, 6.8, 6.8, '#1E2026'), B(.8, 30.8, 24.4, 7, .3, 7.2, '#3A3E45')] });
    K.imgs.push({ P4: faceP4('x', 7.62, 24.8, 31.2, 24.2, 30.6, 1), img: relojao, cor: '#FBF6E8' }, { P4: faceP4('z', 31.42, 1.2, 7.4, 24.2, 30.6, 1), img: relojao, cor: '#FBF6E8' });
    /* a plaquinha no pé do Edifício América: tocou, diz a hora que o Relojão marca (lá em cima ele só aparece de longe, olhando pra cima) */
    K.decor.push({ x: 8.5, z: 33.1, acao: 'relojao', bl: [B(-.05, 0, -.05, .1, 1.1, .1, '#3A3E45'), B(-.05, 1.1, -.3, .1, .45, .6, '#1E2026'), B(.05, 1.18, -.22, .01, .3, .44, '#FBF6E8')] });
    K.imgs.push({ P4: faceP4('z', 34.02, 0, 8, 3.5, 24, 1), img: () => calcImg(am + 'lado', pxm(8), pxm(20.5), (g, w, h) => fachada(g, w, h, { andares: 6, cols: 2, cor: '#D9D6CC', cor2: '#6B7480', topo: .2, luz: .3, seed: 41 })), cor: '#D9D6CC' });
    predioCalc(K, { l: 1, z0: 44, z1: 58, h: 12.5, cor: '#D9A88E', loja: lojas[3], f: { andares: 3, cols: 5, cor: '#D9A88E', cor2: '#7E3A28', deco: true, ano: '1946', topo: .16, luz: .35 } });
    K.imgs.push({ P4: faceP4('z', 43.98, 0, 8, 3.5, 12.5, -1), img: () => calcImg('ladoDeco', pxm(8), pxm(9), (g, w, h) => fachada(g, w, h, { andares: 3, cols: 2, cor: '#D9A88E', cor2: '#7E3A28', topo: .16, seed: 5 })), cor: '#D9A88E' });
    /* o Autolon: o térreo de pé-direito duplo, recuado, com os pilares em V de pastilha; seis andares em cima */
    predioCalc(K, { l: 1, z0: 58, z1: 72, h: 26, y0: 7.2, pilotis: true, cor: '#E9E4D8', loja: false, f: { andares: 6, cols: 5, cor: '#E9E4D8', cor2: '#5A5F68', pastilha: '#C9A24E', faixa: '#F4F1EA', luz: .3 } });
    K.decor.push({ x: 0, z: 0, bl: [B(0, 0, 58, 5.6, 7.2, 14, '#3A3E45'), B(5.6, 7, 58, 2.4, .25, 14, '#E9E4D8'),
      ...[60.5, 64.5, 68.5].flatMap(z => [Object.assign(B(6.7, 0, z - .2, .4, 7.3, .4, '#C9A24E'), { pitch: .32, piv: [6.9, 0, z] }), Object.assign(B(6.7, 0, z - .2, .4, 7.3, .4, '#C9A24E'), { pitch: -.32, piv: [6.9, 0, z] }), B(6.6, 0, z - .3, .6, .5, .6, '#B08A3E')])] });
    K.imgs.push({ P4: faceP4('x', 5.62, 58.4, 71.6, 0, 6.9, 1), img: () => calcImg('autolon', 320, 160, (g, w, h) => terreo(g, w, h, lojas[4])), cor: '#3A3E45' });
    K.decor.push({ x: 0, z: 0, bl: [B(5.7, 5.7, 59, .1, .7, 12, ROSA)] }); K.imgs.push({ P4: faceP4('x', 5.81, 59, 71, 5.7, 6.4, 1), img: () => calcImg('autolonPl', 420, 40, placaLoja(lojas[4])), cor: ROSA });
    predioCalc(K, { l: 1, z0: 72, z1: 84, h: 25, cor: '#EDE9E1', loja: lojas[5], f: { andares: 7, cols: 4, cor: '#EDE9E1', cor2: '#7A7F88', sacada: true, luz: .4 } });
    /* lado direito: no trecho 4, um de 3 andares, a abertura da Praça Marechal Floriano e o de faixas na esquina; no
       trecho 5, o Art Déco de 4 andares, a abertura da Praça Willie Davids e um sobrado na ponta */
    predioCalc(K, { l: -1, z0: 0, z1: 8, h: 11, cor: '#CFC3A6', loja: lojas[6], f: { andares: 2, cols: 3, cor: '#CFC3A6', cor2: '#7E6A48', deco: true, ano: '1951', topo: .22, luz: .35 } });
    K.imgs.push({ P4: faceP4('z', 8.02, 28, 36, 3.5, 11, 1), img: () => calcImg('ladoF1', pxm(8), pxm(7.5), (g, w, h) => fachada(g, w, h, { andares: 2, cols: 2, cor: '#CFC3A6', cor2: '#7E6A48', topo: .22, seed: 8 })), cor: '#CFC3A6' });
    predioCalc(K, { l: -1, z0: 26, z1: 34, h: 22, cor: '#EEEAE2', loja: lojas[7], f: { andares: 6, cols: 3, cor: '#EEEAE2', cor2: '#5A5F68', pastilha: '#3F6FB8', faixa: '#FFFFFF', luz: .3 } });
    K.imgs.push({ P4: faceP4('z', 25.98, 28, 36, 3.5, 22, -1), img: () => calcImg('ladoF2', pxm(8), pxm(18.5), (g, w, h) => fachada(g, w, h, { andares: 6, cols: 2, cor: '#EEEAE2', cor2: '#5A5F68', pastilha: '#3F6FB8', luz: .3, seed: 9 })), cor: '#EEEAE2' });
    predioCalc(K, { l: -1, z0: 44, z1: 56, h: 15, cor: '#B9C6D3', loja: lojas[8], f: { andares: 3, cols: 4, cor: '#B9C6D3', cor2: '#3A4A5E', deco: true, ano: '1953', topo: .14, sacada: true, luz: .35 } });
    K.imgs.push({ P4: faceP4('z', 56.02, 28, 36, 3.5, 15, 1), img: () => calcImg('ladoW1', pxm(8), pxm(11.5), (g, w, h) => fachada(g, w, h, { andares: 3, cols: 2, cor: '#B9C6D3', cor2: '#3A4A5E', topo: .14, seed: 11 })), cor: '#B9C6D3' });
    predioCalc(K, { l: -1, z0: 78, z1: 84, h: 9.5, cor: '#E3C9A8', loja: lojas[10], f: { andares: 1, cols: 2, cor: '#E3C9A8', cor2: '#8E5B33', deco: true, topo: .3, luz: .5 } });
    /* a continuação lá na frente, depois da São Paulo (só de olhar: some no escuro) */
    [[0, -40, -9, '#DCD3C2', 18], [28, -40, -24, '#C9CDD3', 26], [28, -24, -9, '#E8D5B5', 12]].forEach(([x, z0, z1, c, h]) => { K.decor.push({ x: 0, z: 0, bl: [B(x, 0, z0, 8, h, z1 - z0, c)] }); K.imgs.push({ P4: faceP4('x', x === 0 ? 8.02 : 27.98, z0, z1, 0, h, x === 0 ? 1 : -1), img: () => calcImg('longe' + z0 + x, pxm(z1 - z0), pxm(h), (g, w, hh) => fachada(g, w, hh, { andares: Math.round(h / 3.2), cols: 4, cor: c, cor2: '#6B7480', seed: z0 + x, luz: .3 })), cor: c }); });
    /* o Cine Teatro Ouro Verde, do outro lado da Praça Willie Davids, e a Catedral lá no fundo da Praça Marechal Floriano */
    K.decor.push({ x: 0, z: 0, bl: [B(38, 0, 57, 10, 14, 20, '#E6D7B0'), B(36.7, 4.2, 59, 1.3, .3, 16, '#D6C7A0')] });
    K.imgs.push({ P4: faceP4('x', 37.98, 57, 77, 0, 14, -1), img: () => calcImg('ouro', 512, 360, fachadaOuro), cor: '#E6D7B0' });
    K.decor.push({ x: 0, z: 0, bl: [B(44, 0, 8, 4, .16, 18, '#D6D0C4'), B(45.3, .16, 8, 2.7, .16, 18, '#CFC8BA'), B(46.6, .32, 8, 1.4, .16, 18, '#C8C1B2'),
      B(52, 0, 10, 26, 8.5, 14, '#E9E1D0'), Object.assign(B(51.4, 8.5, 10, 27.2, .35, 17.5, '#5E6672'), { pitch: -1.16, piv: [52, 8.5, 10] }), Object.assign(B(51.4, 8.5, 6.5, 27.2, .35, 17.5, '#5E6672'), { pitch: 1.16, piv: [52, 8.5, 24] }),
      B(51.85, 24.2, 16.9, .2, 3.4, .2, OURO), B(51.85, 26.2, 16.2, .2, .2, 1.6, OURO)] });
    K.imgs.push({ P4: faceP4('x', 51.97, 10, 24, 8.5, 24.5, -1), img: () => calcImg('empena', 300, 340, empenaCatedral), cor: '#ECE5D4' }, { P4: faceP4('x', 51.97, 10, 24, 0, 8.5, -1), img: () => calcImg('catFrente', 300, 180, frenteCatedral), cor: '#E9E1D0' });
    /* os móveis do trecho 5: araucárias, ipês, os bancos de peroba, os vasos redondos, o quiosque, as mesas, o banquinho do
       músico e o pano da artesã */
    const banco = (x, z, tipo, l, nome) => { const bl0 = tipo === 'peroba' ? bancoPeroba() : bancoConcreto(), bl = l > 0 ? bl0 : espelhaX(bl0, .5), i = K.decor.length;
      K.decor.push({ x, z, bl, acao: 'senta', banco: i, nome: nome || 'Sentar no banco' });
      [.4, 1.1, 1.8].forEach(dz => K.assentos.push({ x: x + (l > 0 ? .2 : .3), z: z + dz, yaw: l > 0 ? Math.PI / 2 : -Math.PI / 2, banco: i, quem: null }));
      return K.assentos.length - 3; };
    [47, 59, 71, 83].forEach(z => { K.decor.push({ x: 11.2, z, bl: araucaria() }, { x: 24.8, z, bl: araucaria() }); K.luzes.push({ mancha: [11.2, .004, z, 2.6, 2.6, .17, 0, '255,240,200'] }, { mancha: [24.8, .004, z, 2.6, 2.6, .17, 0, '255,240,200'] }); });
    [[10.2, 53, ROSA], [10.2, 65, KC.ipeAm], [10.2, 77, '#FFB3D1'], [24.2, 53, PAPEL], [24.2, 77, LILAS]].forEach(([x, z, c]) => K.decor.push({ x, z, bl: ipe(c, 1.7) }));
    const bTrecho5 = [banco(8.9, 49.4, 'peroba', 1), banco(8.9, 61.4, 'peroba', 1), banco(8.9, 73.4, 'peroba', 1), banco(26.6, 49.4, 'peroba', -1), banco(26.6, 61.4, 'peroba', -1), banco(26.6, 73.4, 'peroba', -1)];
    [[47.5, ROSA, AMARELO], [56, LARANJA, PAPEL], [80, LILAS, ROSA], [9.9, 45.5, AMARELO, LILAS], [9.9, 69.5, ROSA, PAPEL], [9.9, 79.5, LARANJA, ROSA], [26.2, 45.5, LILAS, AMARELO], [26.2, 57.5, PAPEL, ROSA], [26.2, 69.9, ROSA, LARANJA]]
      .forEach(v => { const [x, z, a, b] = v.length === 3 ? [18, ...v] : v; K.decor.push({ x, z, bl: vaso(a, b) }); });
    K.decor.push({ x: 18, z: 67, bl: quiosque() });
    K.imgs.push(...[['z', 65.78, 16.5, 19.5, -1], ['z', 68.22, 16.5, 19.5, 1]].map(([e, p, a0, a1, s]) => ({ P4: faceP4(e, p, a0, a1, 2.55, 2.7, s), img: () => calcImg('sucos', 200, 24, placaLoja({ nome: 'SUCOS · VITAMINAS', fundo: LARANJA, cor: PAPEL })), cor: LARANJA })));
    const mesa = (x, z, c) => { const i = K.decor.length; K.decor.push({ x, z, bl: mesaSol(c), acao: 'senta', banco: i, nome: 'Sentar na mesa' }); K.assentos.push({ x: x - .9, z, yaw: Math.PI / 2, banco: i, quem: null }, { x: x + .9, z, yaw: -Math.PI / 2, banco: i, quem: null }); return K.assentos.length - 2; };
    const mTrecho5 = [mesa(12.3, 67, ROSA), mesa(23.7, 67, AMARELO)];
    K.decor.push({ x: 12.4, z: 57.5, bl: [B(-.2, 0, -.2, .4, .45, .4, MAD_E), B(.45, 0, .35, .3, .1, .3, INK), B(.4, .1, .3, .4, .02, .4, INK)] });
    K.decor.push({ x: 22.6, z: 79.8, piso: true, bl: [B(0, 0, 0, 1.7, .02, 1.4, '#7A2E4E'), ...Array.from({ length: 10 }, (_, i) => B(.15 + (i % 5) * .3, .02, .2 + Math.floor(i / 5) * .6, .18, .04, .18, [ROSA, AMARELO, AZUL, LARANJA, PAPEL][i % 5]))] });
    /* a Praça Willie Davids: o busto de bronze, o marco "Aqui tem História", ipê, sibipiruna e dois bancos */
    K.decor.push({ x: 35.8, z: 67, bl: [B(-.5, 0, -.5, 1, 1.3, 1, '#C9C4BA'), B(-.55, 1.3, -.55, 1.1, .08, 1.1, '#B5AFA3'), B(-.35, 1.38, -.2, .7, .32, .4, '#8A6A3A'), B(-.17, 1.7, -.17, .34, .38, .34, '#9A7A48'), B(-.51, .5, -.3, .02, .4, .6, '#7A5A30')] });
    K.decor.push({ x: 30.2, z: 60.6, bl: [B(-.05, 0, -.05, .1, 1.1, .1, '#3A3E45'), B(-.4, 1.1, -.05, .8, .5, .08, '#5A3A22')] });
    K.decor.push({ x: 31.2, z: 62, bl: ipe(ROSA, 1.6) }, { x: 33.6, z: 74.6, bl: ipe(KC.ipeAm, 1.6) }, { x: 34.2, z: 58, bl: sibipiruna() });
    const bWillie = [banco(32.6, 64.2, 'peroba', -1), banco(32.6, 69.6, 'peroba', -1)];
    /* o trecho 4: postes de LED, bancos de concreto, a fonte luminosa, os vasos, os carrinhos, a caixa de som do
       locutor, o totem e as placas de rua */
    [5, 17, 29].forEach(z => { K.decor.push({ x: 11.2, z, bl: posteLed(1) }, { x: 24.8, z, bl: posteLed(-1) }); K.luzes.push({ mancha: [12, .004, z, 2.4, 2.4, .15, 0, '235,240,255'] }, { mancha: [24, .004, z, 2.4, 2.4, .15, 0, '235,240,255'] }); });
    const bTrecho4 = [banco(8.9, 9.4, 'concreto', 1), banco(8.9, 21.4, 'concreto', 1), banco(26.6, 1.4, 'concreto', -1), banco(26.6, 28.2, 'concreto', -1)];
    K.decor.push({ x: 18, z: 14, bl: fonte() });
    [[4.5, AMARELO, ROSA], [24.5, LILAS, LARANJA], [30.5, ROSA, PAPEL], [9.9, 18.5, ROSA, AMARELO], [9.9, 25.4, LILAS, PAPEL], [26.2, 5.5, AMARELO, LARANJA]]
      .forEach(v => { const [x, z, a, b] = v.length === 3 ? [18, ...v] : v; K.decor.push({ x, z, bl: vaso(a, b) }); });
    K.decor.push({ x: 22.8, z: 21.2, bl: carrinho('pipoca') }, { x: 12, z: 30.2, bl: carrinho('milho') }, { x: 26.4, z: 12.2, bl: carrinho('fruta') });
    K.decor.push({ x: 8.3, z: 4.2, bl: [B(0, 0, 0, .5, .85, .45, '#1B1D22'), B(.5, .5, .1, .01, .25, .25, '#3A3E45'), B(.5, .15, .1, .01, .25, .25, '#3A3E45')] });
    K.decor.push({ x: 30.2, z: 15.5, bl: [B(-.3, 0, -.3, .6, .32, .6, MAD)] });
    K.decor.push({ x: 25.2, z: 32.2, bl: [B(-.3, 0, -.15, .6, 2.1, .3, '#1F4FA3')] });
    K.imgs.push({ P4: faceP4('z', 32.04, 24.92, 25.48, .3, 2, -1), img: () => calcImg('totem', 120, 300, totemCalc), cor: '#1F4FA3' }, { P4: faceP4('z', 32.36, 24.92, 25.48, .3, 2, 1), img: () => calcImg('totem', 120, 300, totemCalc), cor: '#1F4FA3' });
    [[27.8, 33, 'AV. RIO DE JANEIRO'], [8.3, 45.2, 'AV. RIO DE JANEIRO'], [27.8, 1.8, 'R. SÃO PAULO'], [8.3, 82.2, 'R. MINAS GERAIS']].forEach(([x, z, t], i) => { K.decor.push({ x, z, bl: [B(-.05, 0, -.05, .1, 2.9, .1, '#3A3E45'), B(-.05, 2.5, -.7, .1, .38, 1.4, '#1F4FA3')] });
      K.imgs.push({ P4: faceP4('x', x + .06, z - .7, z + .7, 2.5, 2.88, 1), img: () => calcImg('rua' + i, 220, 60, placaRua(t)), cor: '#1F4FA3' }, { P4: faceP4('x', x - .06, z - .7, z + .7, 2.5, 2.88, -1), img: () => calcImg('rua' + i, 220, 60, placaRua(t)), cor: '#1F4FA3' }); });
    /* os frades de concreto nas beiras das ruas (o carro não sobe no Calçadão; quem anda passa entre eles) */
    [1, 33.5, 44.5, 83].forEach(z => { for(let x = 9; x <= 27; x += 2) K.decor.push({ x, z, bl: frade() }); });
    /* a fiação por cima da Rio de Janeiro (o povo reclama, mas é dela) */
    K.decor.push({ x: 0, z: 0, bl: [35.2, 38.4, 41.6].map(z => B(-6, 7.6 + (z % 2) * .3, z, 60, .04, .04, '#15161A')) });
    /* a Praça Marechal Floriano: ipês nos cantos, o canteiro do meio e os bancos de peroba em volta */
    K.decor.push({ x: 30.4, z: 8.6, bl: ipe(ROSA, 1.7) }, { x: 43, z: 8.6, bl: ipe(PAPEL, 1.7) }, { x: 30.4, z: 23.6, bl: ipe(KC.ipeAm, 1.7) }, { x: 43, z: 23.6, bl: ipe(LILAS, 1.7) }, { x: 37.2, z: 16.2, bl: [...[0, 1, 2, 3, 4, 5].map(i => B(i % 3 * .5, 0, Math.floor(i / 3) * .5 + .3, .3, .35 + sorte(i) * .2, .3, [ROSA, AMARELO, LARANJA, LILAS, PAPEL, ROSA][i]))] });
    const bFloriano = [banco(33, 10.6, 'peroba', 1), banco(33, 18.4, 'peroba', 1), banco(42.6, 10.6, 'peroba', -1), banco(42.6, 18.4, 'peroba', -1)];
    /* a gente do Calçadão (os moradores daqui: sentados em dupla, em roda, andando, vendendo, tocando, pregando) */
    const SEN = (nome, a, av, grupo, tipo, voz) => K.gente.push({ nome, papel: 'senta', assento: a, av, grupo, tipo, voz });
    const vo = (pele, cab, cc, roupa, cr, calca, extra) => Object.assign({ pele, cabelo: cab, corCabelo: cc, roupa, corRoupa: cr, corCalca: calca }, extra || {});
    SEN('Seu Lauro', bTrecho5[0], vo(2, 'raspado', 4, 'camiseta', 6, 3, { barba: 'barba', topo: 'bone', oculos: 'grau' }), 'g0', 'idosos', 150);
    SEN('Dona Zezé', bTrecho5[0] + 1, vo(1, 'coque', 4, 'moletom', 2, 1, { oculos: 'grau' }), 'g0', 'idosos', 290);
    SEN('Seu Kazuo', bTrecho5[1], vo(0, 'curto', 4, 'jaqueta', 0, 2, { oculos: 'grau' }), 'g1', 'idosos', 170);
    SEN('Dona Hiroko', bTrecho5[1] + 1, vo(0, 'coque', 4, 'camiseta', 5, 0), 'g1', 'idosos', 300);
    SEN('Jéssica', bTrecho5[2], vo(3, 'cacheado', 0, 'regata', 4, 1, { topo: 'fone' }), 'g2', 'jovens', 330);
    SEN('Bia', bTrecho5[2] + 1, vo(1, 'longo', 3, 'camiseta', 1, 0), 'g2', 'jovens', 350);
    SEN('Seu Tião', bTrecho5[3], vo(4, 'raspado', 4, 'camiseta', 3, 3, { topo: 'bone' }), 'g3', 'idosos', 140);
    SEN('Seu Abílio', bTrecho5[3] + 1, vo(2, 'curto', 4, 'jaqueta', 7, 0, { barba: 'cavanhaque' }), 'g3', 'idosos', 160);
    SEN('Dona Neusa', bTrecho5[5], vo(3, 'black', 4, 'moletom', 5, 4), 'g4', 'geral', 280);
    SEN('Tia Rô', bTrecho5[5] + 1, vo(2, 'trancas', 1, 'camiseta', 2, 1), 'g4', 'geral', 310);
    SEN('Caio', bWillie[0], vo(3, 'curto', 0, 'camiseta', 3, 0, { topo: 'bonetras' }), 'g5', 'casal', 220);
    SEN('Larissa', bWillie[0] + 1, vo(1, 'longo', 1, 'regata', 2, 1), 'g5', 'casal', 340);
    SEN('Seu Genésio', bWillie[1] + 1, vo(1, 'raspado', 4, 'jaqueta', 6, 3, { oculos: 'grau', barba: 'barba' }), 'g6', 'idosos', 150);
    SEN('Kenji', mTrecho5[0], vo(0, 'moicano', 0, 'camiseta', 0, 0, { topo: 'nada' }), 'g7', 'jovens', 240);
    SEN('Akemi', mTrecho5[0] + 1, vo(0, 'coque', 0, 'jaqueta', 5, 0), 'g7', 'jovens', 360);
    SEN('Rafa', mTrecho5[1], vo(4, 'black', 0, 'regata', 4, 2), 'g8', 'geral', 230);
    SEN('Duda', mTrecho5[1] + 1, vo(2, 'trancas', 0, 'camiseta', 6, 4, { topo: 'bandana' }), 'g8', 'geral', 330);
    SEN('Dona Lourdes', bTrecho4[0], vo(2, 'curto', 4, 'moletom', 7, 3, { oculos: 'grau' }), 'g9', 'idosos', 270);
    SEN('Dona Cotinha', bTrecho4[0] + 1, vo(4, 'coque', 4, 'camiseta', 5, 1), 'g9', 'idosos', 300);
    SEN('Paulão', bTrecho4[1], vo(3, 'raspado', 0, 'regata', 0, 1, { barba: 'barba' }), 'g10', 'geral', 140);
    SEN('Rodrigo', bTrecho4[1] + 1, vo(1, 'curto', 2, 'camiseta', 3, 0, { oculos: 'escuro' }), 'g10', 'geral', 200);
    SEN('Seu Valdemar', bTrecho4[3], vo(1, 'raspado', 4, 'camiseta', 6, 3, { topo: 'bone', oculos: 'grau' }), 'g11', 'idosos', 150);
    SEN('Dona Edite', bTrecho4[3] + 1, vo(3, 'coque', 4, 'moletom', 2, 4), 'g11', 'idosos', 290);
    SEN('Dani', bFloriano[0], vo(2, 'longo', 0, 'jaqueta', 4, 0), 'g12', 'casal', 340);
    SEN('Marquinhos', bFloriano[0] + 1, vo(2, 'curto', 0, 'camiseta', 7, 1, { topo: 'bone' }), 'g12', 'casal', 220);
    SEN('Seu Bigode', bFloriano[1] + 1, vo(3, 'raspado', 4, 'jaqueta', 0, 3, { barba: 'barba', topo: 'bone' }), 'g13', 'idosos', 130);
    /* em pé, de roda: a turma perto da fonte e as duas amigas na praça */
    const roda = (cx, cz, nomes, grupo, tipo) => nomes.forEach(([nome, av, voz], i) => { const a = i / nomes.length * Math.PI * 2 + .4, x = cx + Math.cos(a) * .75, z = cz + Math.sin(a) * .75; K.gente.push({ nome, papel: 'roda', x, z, yaw: Math.atan2(cx - x, cz - z), av, grupo, tipo, voz }); });
    roda(18, 27.4, [['Thiaguinho', vo(4, 'moicano', 3, 'regata', 1, 0, { corrente: 'ouro' }), 230], ['Fer', vo(1, 'black', 0, 'jaqueta', 2, 0), 320], ['Gui', vo(2, 'cacheado', 1, 'moletom', 3, 1, { topo: 'gorro' }), 210]], 'g14', 'jovens');
    roda(37.4, 23, [['Lu', vo(1, 'longo', 2, 'camiseta', 5, 1), 330], ['Nanda', vo(3, 'coque', 0, 'regata', 7, 0), 350]], 'g15', 'geral');
    /* os que vendem e os que chamam a atenção: cada um com o seu grito */
    const GRITA = (nome, x, z, yaw, av, falas, extra) => K.gente.push(Object.assign({ nome, papel: 'grita', x, z, yaw, av, falas, voz: 200 }, extra || {}));
    GRITA('Seu Ditão', 24.45, 21.6, -Math.PI / 2, Object.assign(vo(4, 'raspado', 4, 'camiseta', 6, 0), { skin: 'chef' }), ['Olha a pipoca! Doce e salgada, saindo quentinha!', 'Pipoca de dois reais com gosto de infância!', 'Pombo não paga, mas você paga, hein!'], { voz: 150 });
    GRITA('Dona Socorro', 11.3, 30.9, Math.PI / 2, vo(3, 'coque', 1, 'camiseta', 1, 1, { topo: 'bandana' }), ['Olha o milho cozido na manteiga!', 'Pamonha e curau, feitos hoje cedo!', 'É milho do Paraná, minha gente!'], { voz: 300 });
    GRITA('Zé da Melancia', 28, 12.6, -Math.PI / 2, vo(4, 'curto', 0, 'regata', 3, 2, { topo: 'bone' }), ['Melancia geladinha! A fatia vem com sorriso.', 'Abacaxi doce igual conversa de vó!', 'Morango vermelhinho, olha que beleza!'], { voz: 170 });
    GRITA('Robson do Microfone', 9.7, 5.4, Math.PI / 2, vo(3, 'raspado', 0, 'jaqueta', 0, 0, { oculos: 'escuro', corrente: 'ouro' }), ['Atenção, Londrina! Hoje é tudo pela metade do dobro!', 'Entra, entra! Olhar não paga e provar é de graça!', 'Promoção relâmpago! Mais rápida que o Pé-Vermelho no Autódromo!', 'Alô, moça do vestido bonito! Tem um igualzinho aqui dentro, só que mais barato!'], { mao: 'mic', voz: 180 });
    GRITA('Irmão Ivo', 30.2, 15.5, -Math.PI / 2, vo(2, 'curto', 4, 'camiseta', 6, 0), ['Paz pra quem passa e pra quem fica no banco!', 'Bom dia, irmão! Que o teu corre seja abençoado!', 'Desacelera, meu povo. A pressa nunca chegou primeiro em lugar nenhum.'], { mao: 'mic', y: .32, voz: 160 });
    GRITA('Biel do Violão', 12.4, 57.5, Math.PI / 2, vo(2, 'cacheado', 1, 'camiseta', 7, 0, { topo: 'bandana' }), ['♪ ♫ ♪', 'Essa é de domínio público: pode cantar junto!', 'Uma moedinha pro artista? Aceito Pix também.', '♫ ♪ ♫'], { mao: 'violao', senta: true, voz: 230 });
    GRITA('Lua', 24.7, 80.5, -Math.PI / 2, vo(1, 'trancas', 3, 'regata', 5, 4), ['Pulseira feita à mão! Cada uma é única, igual você.', 'Brinco de semente e colar de miçanga, tudo feito aqui.', 'Faço o teu nome em macramê em cinco minutos.'], { voz: 340 });
    /* quem passa: duas mãos, uma de cada lado do meio (indo e vindo), com sacola de loja */
    [['Ana', 14.2, 70, -1, vo(2, 'longo', 1, 'camiseta', 2, 1)], ['Beto', 21.8, 60, 1, vo(4, 'curto', 0, 'jaqueta', 3, 0)], ['Cris', 14.8, 40, -1, vo(1, 'coque', 3, 'regata', 4, 0)], ['Davi', 21.2, 30, 1, vo(3, 'black', 0, 'moletom', 0, 2)],
      ['Elis', 14.4, 20, -1, vo(0, 'longo', 0, 'jaqueta', 5, 0)], ['Fabi', 21.6, 8, 1, vo(2, 'trancas', 0, 'camiseta', 1, 4)], ['Gu', 14.6, 80, -1, vo(4, 'moicano', 0, 'camiseta', 7, 0, { topo: 'fone' })], ['Hélio', 21.4, 50, 1, vo(1, 'raspado', 4, 'camiseta', 6, 3, { oculos: 'grau' })]]
      .forEach(([nome, x, z, dir, av], i) => K.gente.push({ nome, papel: 'anda', x, z, lane: x, dir, vel: 1.05 + (i % 3) * .18, av, mao: i % 3 ? 'sacola' : '', corSacola: [ROSA, AMARELO, AZUL, '#B4152E'][i % 4], voz: 220 + (i % 4) * 40 }));
    /* v4.04 · o Marcão Bandeira: anda o Calçadão de ponta a ponta (a mão do meio, entre a fonte e quem passa de
       sacola), com a bandeira e a camisa rubro-negra, falando da Fanáticos, da Falange Azul e do verde que não entra no
       Corre (as falas são as da cidade, C.verso.torcida). Chegou perto, ele para e olha */
    K.gente.push({ nome: 'Marcão Bandeira', papel: 'anda', x: 15.6, z: 58, lane: 15.6, dir: -1, vel: .95, av: vo(3, 'raspado', 0, 'camiseta', 7, 1, { estampa: 'listras', topo: 'bone', barba: 'cavanhaque' }), listra: INK, mao: 'bandeira', torcida: true, voz: 170 });
    /* onde não se anda: a beira das ruas da frente e de trás, a rua pros lados, o fundo da Praça Floriano */
    const bloq = [[0, 0, 48, .9], [0, 34, 7.6, 44], [28.4, 34, 48, 44], [44, 8, 48, 26], [0, 83.2, 15.5, 84], [20.5, 83.2, 48, 84]];
    return { k: 'lugar-calcadao', W, D, ALT: 3, longe: 44, cam: { ph: .38, dist: 7.4 }, phMin: -.13,
      comodos: [{ k: 'floriano', nome: 'Praça Marechal Floriano', x0: 28, z0: 8, x1: 48, z1: 26, piso: KC.grama }, { k: 'willie', nome: 'Praça Willie Davids', x0: 28, z0: 56, x1: 38, z1: 78, piso: KC.grama },
        { k: 'rio', nome: 'Av. Rio de Janeiro', x0: 0, z0: 34, x1: 48, z1: 44, piso: KC.asfalto }, { k: 't4', nome: 'Calçadão · trecho 4', x0: 0, z0: 0, x1: 48, z1: 34, piso: KC.paver }, { k: 't5', nome: 'Calçadão · trecho 5', x0: 0, z0: 44, x1: 48, z1: 84, piso: KC.pedra }],
      paredes: [{ a: [0, D], b: [W, D], ext: [0, 1], portas: [[15.5, 20.5]], entrada: true, cor: KC.asfalto, alt: .05 }, { a: [W, 0], b: [W, D], ext: [1, 0], cor: KC.asfalto, alt: .05 }, { a: [0, 0], b: [0, D], ext: [-1, 0], cor: KC.asfalto, alt: .05 }, { a: [0, 0], b: [W, 0], ext: [0, -1], cor: KC.asfalto, alt: .05 }],
      entrada: { x: 18, z: D }, chao, bloqueio: bloq, padrao: [], decor: K.decor, imgs: K.imgs, luzes: K.luzes, assentos: K.assentos, gente: K.gente };
  })();
  /* ---------- v3.77 · a gente do Calçadão: o que falam ----------
     Conversa de banco, em dupla ou em roda; quem fala os fatos fala só o que é verdade (1977, Hely Bretas Barros, as
     pedras de Blumenau, o paver de 2010, o Relojão, a Catedral no ponto mais alto, o Ouro Verde de 1952 do Artigas, as
     30 mil pessoas por dia de semana, o domingo quieto, as cigarras na primavera); o resto é causo */
  const PAPOS_CALC = {
    idosos: [
      ['Lembra quando o chão daqui era todo de pedrinha preta e branca?', 'Lembro. Da Rio de Janeiro até a Minas Gerais ainda é. O resto virou bloquinho em 2010.'],
      ['O Calçadão fez quantos anos?', 'Inaugurou em dezembro de 1977. Eu vim de terno e sapato apertado.'],
      ['Sabia que esse desenho do chão é de arquiteto?', 'Hely Bretas Barros. As correntes entrelaçadas. E as pedras vieram de Blumenau.'],
      ['Já olhou a hora no Relojão hoje?', 'Olhei. Tá certinho. Eu é que tô atrasado desde 1980.'],
      ['Antes tinha banca de revista aqui, lembra?', 'Lembro. Eu lia o jornal inteiro de pé e comprava só a bala.'],
      ['Pombo aqui é tudo parente.', 'É. Aquele de pescoço brilhante é meu cunhado.'],
      ['Esse banco é o melhor da cidade.', 'Por quê?', 'Daqui eu vejo todo mundo passar e ninguém me cobra nada.'],
      ['A Catedral fica no ponto mais alto da cidade, sabia?', 'Por isso que eu rezo daqui mesmo. Subida não é comigo.'],
      ['O Ouro Verde é de 1952.', 'Projeto do Artigas. O meu primeiro cinema foi ali, de mão dada.'],
      ['Minha neta disse que agora é tudo pelo celular.', 'Eu sei. Paguei o pastel com o dedão e ainda ganhei desconto.']
    ],
    jovens: [
      ['Bora num pastel?', 'Bora. Mas é o último. Até amanhã.'],
      ['Postou o look de hoje?', 'Postei. Três curtidas: minha mãe, minha tia e um robô.'],
      ['Tô procurando capinha de celular.', 'Aqui tem umas trinta lojas de capinha. Escolhe pela cor do teu humor.'],
      ['Bora no Zerão depois?', 'Só se for de skate. Aprendi o ollie ontem.', 'Aprendeu ou caiu bonito?'],
      ['Viu o ipê florido ali?', 'Vi. Tirei foto. Saiu meu dedo e meio ipê.'],
      ['Comprei um guarda-chuva de dez reais aqui.', 'E aí, durou?', 'Durou até a esquina da São Paulo.']
    ],
    casal: [
      ['Lembra onde a gente se conheceu?', 'Na fila da pipoca. Você furou a fila.', 'E casou com quem furou.'],
      ['Vamos num filme no Ouro Verde?', 'Vamos. Eu levo a pipoca, você leva a conversa.'],
      ['Você vai comprar mais um tênis?', 'É um investimento.', 'Em quê?', 'Em caminhar no Calçadão.']
    ],
    geral: [
      ['Vou só passar no banco e já volto.', 'Isso foi o que você disse em março.'],
      ['O moço da loja tá gritando promoção desde que eu nasci.', 'E a promoção nunca acaba. Isso é que é constância.'],
      ['Sabe onde é o ponto do ônibus?', 'Lá na ponta da Minas Gerais. Corre que ele não espera.'],
      ['Tá calor, hein?', 'Calor de Londrina: abre a porta e o sol entra antes de você.'],
      ['Viu o Relojão? Já é quase hora do almoço.', 'Pra mim é sempre quase hora do almoço.']
    ]
  };
  const FALA_VOCE = ['Senta aí, chega mais. O banco é público e a conversa também.', 'Tu é daqui? Tem cara de quem anda de skate no Zerão.', 'Olha pra cima: o Relojão do Edifício América marca a hora certinha.',
    'Num dia de semana passa umas trinta mil pessoas por aqui. Hoje parece que vieram todas.', 'Domingo isso aqui fica quieto. Hoje não: hoje é dia de corre.', 'Na primavera as cigarras cantam tão alto que a gente conversa por mímica.',
    'Esse chão de pedrinha é do desenho original. Pisa com respeito.', 'Um conselho: nunca discuta com pombo. Ele não tem nada a perder.', 'Já foi na Feira do Corre? É logo ali, na cidade.', 'Fica mais um pouco. A conversa tá boa e o banco tá na sombra.'];
  const FALA_PASSA = ['Licença, licença!', 'Tô atrasado pro banco!', 'Mãe, já tô chegando!', 'Cadê o meu ônibus?', 'Opa, foi mal!', 'E aí!', 'Vai chover, hein?', 'Bora, bora!'];
  /* ---------- v3.77 · a gente do Calçadão: o motor ----------
     Os moradores daqui são do aparelho de cada um (como os da cidade): sentam em dupla e conversam (a dupla troca uma
     conversa inteira e descansa uns segundos), param em roda, passam com sacola indo e vindo (desviam de você), e os
     ambulantes, o locutor, o pregador, o músico e a artesã chamam a atenção de tempo em tempo. Senta num banco com
     lugar e quem tá do lado te puxa pro papo; chega perto de qualquer um e o botão é "Trocar ideia". Só conversa quem
     tá perto de você, e só os 18 mais perto são desenhados (o celular agradece). O carro da Rio de Janeiro para pra
     quem tá na faixa; o pombo voa quando alguém chega perto e pousa de novo uns metros pra lá */
  const sorteia = L => L[Math.floor(Math.random() * L.length)];
  /* v4.04: a próxima fala de quem tem as dele: embaralhadas, sem repetir até acabar a lista */
  const proxFala = n => { if(!n.fila || !n.fila.length){ const a = n.falas.slice(); for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } n.fila = a; } return n.fila.pop(); };
  function calcCria(){
    if(!PL.gente || !C.verso || !C.verso.avLimpo) return null;
    const agora = Date.now(), grupos = {};
    PL.assentos.forEach(a => { a.quem = null; });
    const gente = PL.gente.map((d, i) => {
      const n = { i, nome: d.nome, papel: d.papel, av: C.verso.avLimpo(d.av, 'calc' + i), x: d.x || 0, z: d.z || 0, yaw: d.yaw || 0, y: d.y || 0, passo: Math.random() * 6, andando: false, fala: null, prox: agora + 2000 + Math.random() * 9000, mao: d.mao || '', voz: d.voz || 240, falas: d.falas || null, senta: !!d.senta, corSacola: d.corSacola };
      /* v4.04: o torcedor (as falas são as da cidade), a listra da camisa e quando ele solta a primeira */
      if(d.torcida){ n.falas = (C.verso.torcida || []).slice(); n.grita = true; n.gritoT = agora + 2500 + Math.random() * 3000; }
      if(d.listra) n.av.listra = d.listra;
      if(d.assento != null){ const a = PL.assentos[d.assento]; a.quem = n; n.sit = a; n.x = a.x; n.z = a.z; n.yaw = a.yaw; }
      if(d.papel === 'anda'){ n.lane = d.lane; n.dir = d.dir; n.vel = d.vel; n.desvio = 0; n.yaw = d.dir > 0 ? 0 : Math.PI; }
      if(d.grupo){ const g = grupos[d.grupo] || (grupos[d.grupo] = { k: d.grupo, tipo: d.tipo || 'geral', quem: [], prox: agora + 1200 + Math.random() * 7000, papo: null, ult: -1 }); g.quem.push(n); n.grupo = g; }
      return n;
    });
    /* os pombos: quatro bandos (perto da pipoca, no meio do trecho 5, na ponta e na Praça Floriano) */
    const pombos = []; [[21, 24], [16.5, 61], [19.5, 76.5], [35.5, 14]].forEach(([cx, cz], b) => { for(let i = 0; i < 3; i++) pombos.push({ cx, cz, x: cx + (i - 1) * .5, z: cz + (i % 2) * .4, y: 0, yaw: i * 2.1, voa: null, anda: 0, bica: Math.random() * 6 }); });
    return { gente, grupos: Object.values(grupos), pombos, carro: { on: false, prox: agora + 3000, x: 0, z: 0, dir: 1, v: 0 }, vozT: 0, falaT: 0 };
  }
  /* alguém fala: o balão, o tempo dele e o blá-blá-blá (só perto de você) */
  function diz(n, t, voce){
    const agora = Date.now(); n.fala = { t, ate: agora + 1900 + t.length * 58, voce: !!voce };
    if(S.eu && C.versoSom && C.versoSom.papo && Math.hypot(n.x - S.eu.x, n.z - S.eu.z) < 10) C.versoSom.papo(Math.min(40, t.length), n.voz);
  }
  /* v4.04: o canto do Marcão: 1,4 s pulando (três pulinhos) e o bumbo se você tá a até 12 m */
  function cantaCalc(n){
    n.cantaAte = Date.now() + 1400;
    if(S.eu && C.versoSom && C.versoSom.taiko && Math.hypot(n.x - S.eu.x, n.z - S.eu.z) < 12) C.versoSom.taiko(3);
  }
  /* trocar ideia: quem é de vender, vende; quem tá sentado ou em roda fala com você */
  function trocaIdeia(n){
    const agora = Date.now(); if(!n || agora - (n.botaoT || 0) < 900) return; n.botaoT = agora;
    /* v4.12: levou empurrão, fica de mal meio minuto */
    if((n.bravo || 0) > agora){ diz(n, 'Fala comigo não.', true); return; }
    if(!n.sit && !n.senta && n.papel !== 'anda' && S.eu) n.olha = agora + 6000;
    /* v4.04: o torcedor para de andar pra falar com você */
    if(n.grita && n.papel === 'anda') n.paraAte = agora + 6500;
    const t = n.falas ? proxFala(n) : n.papel === 'anda' ? sorteia(FALA_PASSA) : sorteia(FALA_VOCE);
    diz(n, t, true); if(n.grita && t === C.verso.canto) cantaCalc(n);
  }
  function vaiFalar(n){
    const e = S.eu; if(!e || !n) return;
    if(Math.hypot(e.x - n.x, e.z - n.z) < 1.9){ trocaIdeia(n); return; }
    if(e.sit) levanta();
    const a = Math.atan2(e.x - n.x, e.z - n.z), alvo = livrePerto(n.x + Math.sin(a) * 1.1, n.z + Math.cos(a) * 1.1, 0), rota = tracaRota(alvo[0], alvo[1], 0);
    S.alvo = rota.shift(); S.rota = rota; S.acao = { t: 'npc', n };
  }
  /* o assento livre de um banco (o mais perto de você) */
  const assentoLivre = e => { const L = (PL.assentos || []).filter(a => a.banco === e.banco && !a.quem); if(!L.length || !S.eu) return null; return L.sort((a, b) => Math.hypot(a.x - S.eu.x, a.z - S.eu.z) - Math.hypot(b.x - S.eu.x, b.z - S.eu.z))[0]; };
  function senta(e){
    const a = assentoLivre(e), u = S.eu; if(!a || !u) return;
    a.quem = 'eu'; u.sit = a; u.x = a.x; u.z = a.z; u.yaw = a.yaw; u.andando = false; S.alvo = null; S.acao = null; S.rota = [];
    /* a câmera vai pra frente do banco, meio de lado: você e quem tá do lado aparecem (por trás ela ficava dentro do prédio) */
    S.cam.th = a.yaw + .55; S.arrastou = Date.now();
    if(S.calc) S.calc.vozT = Date.now() + 2200;
    if(C.versoSom) C.versoSom.cai(.4);
    portaCasa();
  }
  /* levanta e dá um passo pra frente do banco (num lugar livre) */
  function levanta(){
    const u = S.eu, a = u && u.sit; if(!a) return;
    if(a.quem === 'eu') a.quem = null; u.sit = null;
    const p = livrePerto(a.x + Math.sin(a.yaw) * .8, a.z + Math.cos(a.yaw) * .8, 0); u.x = p[0]; u.z = p[1];
  }
  function calcPasso(dt){
    const K = S.calc, e = S.eu; if(!K || !e) return;
    const agora = Date.now(), perto = n => Math.hypot(n.x - e.x, n.z - e.z);
    /* as conversas de banco e de roda (só as que tão perto de você andam) */
    for(const g of K.grupos){
      const p = g.papo;
      if(p){ if(agora >= p.prox){ if(p.i < p.linhas.length){ const [n, t] = p.linhas[p.i++]; diz(n, t); p.prox = agora + 2100 + t.length * 58; } else { g.papo = null; g.prox = agora + 3500 + Math.random() * 7000; } } continue; }
      if(g.quem.length < 2 || agora < g.prox || perto(g.quem[0]) > 20 || g.quem.some(q => q.caiu || q.volta)) continue;
      const pool = PAPOS_CALC[g.tipo] || PAPOS_CALC.geral; let k = Math.floor(Math.random() * pool.length); if(pool.length > 1 && k === g.ult) k = (k + 1) % pool.length; g.ult = k;
      g.papo = { linhas: pool[k].map((t, j) => [g.quem[j % g.quem.length], t]), i: 0, prox: agora };
    }
    /* sentado: de tempo em tempo, quem tá do lado puxa você pro papo */
    if(e.sit && agora > K.vozT){ const L = K.gente.filter(n => n.papel !== 'anda' && perto(n) < 3.2 && !(n.fala && n.fala.ate > agora)); if(L.length){ diz(sorteia(L), sorteia(FALA_VOCE), true); K.vozT = agora + 8000 + Math.random() * 5000; } else K.vozT = agora + 2000; }
    for(const n of K.gente){
      /* v4.12: quem tá no chão (ou voltando pro lugar dele, bravo) não faz o resto */
      if(caidoCalc(n, dt) || voltaCalc(n, dt)) continue;
      if(n.papel === 'grita'){ if(agora > n.prox && perto(n) < 20){ diz(n, proxFala(n)); n.prox = agora + 8000 + Math.random() * 8000; } if(n.mao === 'violao'){ n.passo += dt * 11; n.andando = true; } }
      /* v4.04: o torcedor solta uma das dele andando (se você tá a até 20 m) e para pra quem chega perto (olhando) */
      if(n.papel === 'anda' && n.grita){
        /* um a cada três é o canto ("Uh, terror! Falange Azul! Fanáticooos!"): para, pula três vezes e sacode a bandeira */
        if(agora > n.gritoT && perto(n) < 20 && !(n.fala && n.fala.ate > agora)){ n.gritoN = (n.gritoN || 0) + 1; const t = n.gritoN % 3 === 1 && C.verso.canto ? C.verso.canto : proxFala(n); diz(n, t); if(t === C.verso.canto) cantaCalc(n); n.gritoT = agora + 9000 + Math.random() * 7000; }
        if(agora < (n.cantaAte || 0)){ n.y = Math.abs(Math.sin((n.cantaAte - agora) / 1400 * 3 * Math.PI)) * .26; n.andando = false; if(!(n.z > 33.2 && n.z < 44.8)) continue; } else if(n.y) n.y = 0;
        /* no meio da Rio de Janeiro ele não para (segurava o carro): termina de atravessar */
        const naRua = n.z > 33.2 && n.z < 44.8;
        if(perto(n) < 2.6 && !e.sit && !naRua) n.paraAte = Math.max(n.paraAte || 0, agora + 1500);
        if(agora < (n.paraAte || 0) && !naRua){ n.andando = false; n.yaw = Math.atan2(e.x - n.x, e.z - n.z); continue; }
      }
      if(n.papel === 'anda'){
        /* desvia de você (pro lado de lá) e de quem tá parado no caminho; na ponta, volta pela outra mão */
        const ah = (e.z - n.z) * n.dir, lat = Math.abs(e.x - n.x), quer = ah > -.3 && ah < 2.4 && lat < 1 ? (e.x > n.lane ? -1.1 : 1.1) : 0;
        n.desvio += (quer - n.desvio) * Math.min(1, dt * 3);
        const alvoX = n.lane + n.desvio; n.z += n.dir * n.vel * dt; n.x += (alvoX - n.x) * Math.min(1, dt * 2.5);
        n.yaw = Math.atan2((alvoX - n.x) * .6, n.dir); n.passo += dt * 8.5; n.andando = true;
        if((n.dir < 0 && n.z < 2.6) || (n.dir > 0 && n.z > 81.6)){ n.dir = -n.dir; n.lane = 36 - n.lane; }
        if(agora > n.prox && perto(n) < 2.2){ n.prox = agora + 18000; if(Math.random() < .35) diz(n, sorteia(FALA_PASSA)); }
      }
      /* quem tá em pé e falou com você olha pra você por uns segundos */
      if(n.olha && !n.sit && !n.senta){ if(agora < n.olha) n.yaw = Math.atan2(e.x - n.x, e.z - n.z); else { n.olha = 0; if(n.papel === 'roda' && n.grupo){ const q = n.grupo.quem, cx = q.reduce((s, o) => s + o.x, 0) / q.length, cz = q.reduce((s, o) => s + o.z, 0) / q.length; n.yaw = Math.atan2(cx - n.x, cz - n.z); } else if(PL.gente[n.i].yaw != null) n.yaw = PL.gente[n.i].yaw; } }
    }
    /* os pombos: bicam, dão uns passinhos e voam quando alguém chega perto; depois pousam uns metros pra lá */
    for(const p of K.pombos){
      if(p.voa){ const v = p.voa; v.t += dt; p.x += v.vx * dt; p.z += v.vz * dt; p.y = v.t < v.dur * .5 ? Math.min(3.2, p.y + dt * 3.4) : Math.max(0, p.y - dt * 2.2);
        if(v.t > v.dur * .5 && !v.desce){ v.desce = true; const a = Math.random() * 6.28, r = 1 + Math.random() * 1.6, tx = p.cx + Math.cos(a) * r, tz = p.cz + Math.sin(a) * r, tt = v.dur * .5; v.vx = (tx - p.x) / tt; v.vz = (tz - p.z) / tt; p.yaw = Math.atan2(v.vx, v.vz); }
        if(v.desce && p.y <= 0){ p.voa = null; p.y = 0; } continue; }
      p.bica += dt * 5; p.anda -= dt;
      if(p.anda <= 0){ p.anda = 1 + Math.random() * 2.5; const a = Math.random() * 6.28; p.tx = Math.max(p.cx - 2, Math.min(p.cx + 2, p.x + Math.cos(a) * .4)); p.tz = Math.max(p.cz - 2, Math.min(p.cz + 2, p.z + Math.sin(a) * .4)); p.yaw = Math.atan2(p.tx - p.x, p.tz - p.z); }
      if(p.tx != null){ p.x += (p.tx - p.x) * Math.min(1, dt * 2); p.z += (p.tz - p.z) * Math.min(1, dt * 2); }
      const assusta = Math.hypot(e.x - p.x, e.z - p.z) < 1.7 || K.gente.some(n => n.papel === 'anda' && Math.abs(n.x - p.x) < .9 && Math.abs(n.z - p.z) < .9);
      if(assusta){ const a = Math.atan2(p.x - e.x, p.z - e.z) + (Math.random() - .5); p.voa = { t: 0, dur: 2.6 + Math.random() * 1.6, vx: Math.sin(a) * 2.4, vz: Math.cos(a) * 2.4, desce: false }; p.yaw = a; if(C.versoSom && C.versoSom.passo && Math.hypot(e.x - p.x, e.z - p.z) < 6) C.versoSom.passo('madeira', .3); }
    }
    /* o carro da Rio de Janeiro: passa de tempo em tempo e para pra quem tá na frente (na faixa ou fora dela) */
    const cr = K.carro;
    if(!cr.on && agora > cr.prox){ cr.on = true; cr.dir = Math.random() < .5 ? 1 : -1; cr.z = cr.dir > 0 ? 41.4 : 36.6; cr.x = cr.dir > 0 ? -16 : 64; cr.v = 7; cr.k = sorteia(['hatch', 'suv', 'picape']); cr.cor = sorteia(['#C9CDD3', '#B4152E', '#1F4FA3', '#2B2F38', PAPEL, '#E8643A']); }
    if(cr.on){
      const frente = cr.x + cr.dir * 2.2, bloq = (x, z) => Math.abs(z - cr.z) < 1.9 && (x - frente) * cr.dir > -.6 && (x - frente) * cr.dir < 5.5;
      const para = bloq(e.x, e.z) || K.gente.some(n => n.papel === 'anda' && bloq(n.x, n.z)) || gente().some(r => bloq(r.hxv, r.hzv));
      cr.v += ((para ? 0 : 7) - cr.v) * Math.min(1, dt * (para ? 5 : 1.2)); cr.x += cr.dir * cr.v * dt;
      if(cr.dir > 0 ? cr.x > 68 : cr.x < -20){ cr.on = false; cr.prox = agora + 7000 + Math.random() * 12000; }
    }
    passoMoedasCalc(dt);
  }
  /* o que fica na mão: o microfone (locutor e pregador), a sacola de loja e o violão */
  function maoCalc(n, giro, dono){
    const x = n.x, z = n.z, out = [], add = (b, c) => out.push(solido(b, [giro], c || b.c, dono));
    if(n.mao === 'mic'){ add(B(x + .2, .95, z + .2, .07, .22, .07, INK)); add(B(x + .18, 1.15, z + .18, .11, .1, .11, '#5A5F68')); }
    else if(n.mao === 'sacola'){ add(B(x - .52, .22, z - .06, .16, .3, .3, n.corSacola || ROSA)); add(B(x - .46, .52, z, .04, .1, .18, n.corSacola || ROSA)); }
    else if(n.mao === 'violao'){ add(B(x - .34, .5, z + .26, .5, .42, .12, '#B5722E')); add(B(x - .14, .66, z + .385, .12, .12, .01, INK)); add(B(x + .14, .7, z + .3, .56, .08, .06, '#5A3A22')); }
    /* v4.04: a bandeira do Marcão: o mastro na mão direita e o pano saindo pra trás em diagonal (de frente e de lado ele
       aparece), balançando com o passo. Perto do mastro as listras rubro-negras; na ponta, o azul com a faixa branca */
    else if(n.mao === 'bandeira'){
      const canta = (n.cantaAte || 0) > Date.now();
      const mx = x + .26, mz = z + .08, onda = { yaw: .8 + (canta ? Math.sin(Date.now() / 85) * .5 : Math.sin(n.passo * .55) * .18 + (n.andando ? 0 : Math.sin(Date.now() / 700) * .08)), piv: [mx, 0, mz] };
      add(B(mx - .025, .48, mz - .025, .05, 2.12, .05, '#8C5A2E')); add(B(mx - .045, 2.6, mz - .045, .09, .09, .09, OURO));
      const pano = (b, c) => out.push(solido(b, [onda, giro], c, dono));
      for(let r = 0; r < 4; r++) pano(B(mx + .03, 2.5 - (r + 1) * .13, mz - .015, .45, .13, .03), r % 2 ? INK : '#B4152E');
      pano(B(mx + .48, 1.98, mz - .015, .45, .52, .03), '#4BA3E3'); pano(B(mx + .48, 2.2, mz - .02, .45, .08, .04), PAPEL);
    }
    return out;
  }
  function calcSolidos(t){
    const K = S.calc; if(!K || !S.eu) return [];
    const out = [], cx = S.cam.tx, cz = S.cam.tz;
    const lista = K.gente.map(n => [Math.hypot(n.x - cx, n.z - cz), n]).filter(p => p[0] < 26).sort((a, b) => a[0] - b[0]).slice(0, 18);
    for(const [, n] of lista){
      /* v4.12: quem caiu senta no chão (o boneco sentado, 38 cm mais baixo) e larga o que tava na mão */
      const chao = !!(n.caiu && n.caiu.sentou), dono = 'npc:' + n.i, giro = { yaw: n.yaw, piv: [n.x, 0, n.z] }, sentado = chao || (!n.caiu && !n.volta && !!(n.sit || n.senta));
      const corpo = boneco(n.av, n.x, n.z, n.yaw, n.passo, n.andando, sentado).map(b => { b.dono = dono; return b; });
      out.push(...sobe(n.caiu ? corpo : corpo.concat(maoCalc(n, giro, dono)), chao ? -.38 : n.y));
    }
    out.push(...moedasSolidos(t, cx, cz));
    /* os pombos: corpo cinza, o pescoço que brilha, a cabeça que bica (e as asas batendo no voo) */
    for(const p of K.pombos){ if(Math.hypot(p.x - cx, p.z - cz) > 20) continue;
      const g = { yaw: p.yaw, piv: [p.x, 0, p.z] }, b = p.voa ? 0 : Math.max(0, Math.sin(p.bica)) * .07, add = bb => out.push(solido(bb, [g], bb.c, null));
      add(B(p.x - .09, p.y + .06, p.z - .15, .18, .14, .28, '#8F96A0')); add(B(p.x - .07, p.y + .14 - b, p.z + .06, .14, .1, .1, '#8E86C8')); add(B(p.x - .06, p.y + .2 - b * 1.6, p.z + .1, .12, .12, .12, '#6B7480')); add(B(p.x - .02, p.y + .22 - b * 1.6, p.z + .22, .04, .03, .06, '#E2B04A'));
      if(p.voa){ const f = Math.sin(t * 22) * .6; out.push(solido(B(p.x - .34, p.y + .16, p.z - .1, .26, .03, .2, '#A4A8AE'), [{ roll: f, piv: [p.x - .09, p.y + .17, p.z] }, g], '#A4A8AE', null), solido(B(p.x + .08, p.y + .16, p.z - .1, .26, .03, .2, '#A4A8AE'), [{ roll: -f, piv: [p.x + .09, p.y + .17, p.z] }, g], '#A4A8AE', null)); } }
    /* o carro que passa e o táxi parado no ponto da São Paulo */
    const cr = K.carro; if(cr.on) out.push(...veiculo3d(cr.k, cr.x, 0, cr.z, cr.dir > 0 ? Math.PI / 2 : -Math.PI / 2, cr.cor, 'carro'));
    out.push(...veiculo3d('hatch', 33, 0, -6.4, -Math.PI / 2, '#F2F0EA', 'taxi'), solido(B(32.7, 1.62, -6.6, .6, .22, .4, '#F2C230'), null, '#F2C230', 'taxi'));
    /* a fonte: o jato do meio, os quatro de volta e a luz que muda de cor (nada de verde: azul, rosa, amarelo, lilás) */
    if(Math.hypot(18 - cx, 14 - cz) < 30){ const cor = FONTE_COR[Math.floor(t / 3.5) % FONTE_COR.length];
      /* o jato do meio sobe e abre em guarda-chuva; os quatro de volta fazem arco pra dentro */
      out.push(solido(B(17.93, .62, 13.93, .14, 1.55, .14, '#D8ECFF'), null, '#D8ECFF', null, { alpha: .42, semTraco: true }));
      for(let k = 0; k < 16; k++){ const f = (t * .9 + k / 16) % 1, a = k * 2.4, r = f * .95, h = .9 + 6.4 * f * (1 - f); out.push(esfera(18 + Math.cos(a) * r, h, 14 + Math.sin(a) * r, .07 + f * .03, k % 3 ? '#E9F4FF' : cor, null, { alpha: .62, semTraco: true })); }
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dz], j) => { for(let k = 0; k < 4; k++){ const f = (t * 1.1 + k / 4 + j * .25) % 1, r = 1.55 - f * 1.1, h = .55 + Math.sin(f * Math.PI) * .75; out.push(esfera(18 + dx * r, h, 14 + dz * r, .065, k % 2 ? '#E9F4FF' : cor, null, { alpha: .6, semTraco: true })); } }); }
    return out;
  }
  const FONTE_COR = ['#9BD4FF', '#FFB3D1', '#FFE58A', '#C9B8FF'];
  /* as sombras de quem tá perto e a luz colorida da fonte no chão (vão junto com o chão, antes das caixas) */
  function calcManchas(t){
    const K = S.calc; if(!K) return []; const out = [], cx = S.cam.tx, cz = S.cam.tz;
    K.gente.forEach(n => { if(Math.hypot(n.x - cx, n.z - cz) < 22) out.push({ mancha: [n.x, .004, n.z, .34, .28, .26, n.yaw] }); });
    (K.moedas || []).forEach(m => { if(m.parada && Math.hypot(m.x - cx, m.z - cz) < 20) out.push({ mancha: [m.x, .004, m.z, .13, .09, .22, 0] }); });
    if(Math.hypot(18 - cx, 14 - cz) < 30){ const c = FONTE_COR[Math.floor(t / 3.5) % FONTE_COR.length], r = parseInt(c.slice(1, 3), 16), g = parseInt(c.slice(3, 5), 16), b = parseInt(c.slice(5, 7), 16); out.push({ mancha: [18, .004, 14, 3.6, 3.6, .22, 0, `${r},${g},${b}`] }); }
    return out;
  }
  /* os balões: até 4 de uma vez, os mais perto de você (o que é pra você sempre aparece) */
  function calcFalas(poe){
    const K = S.calc, e = S.eu; if(!K || !e) return;
    const agora = Date.now();
    K.gente.filter(n => n.fala && n.fala.ate > agora && Math.hypot(n.x - e.x, n.z - e.z) < 15).map(n => [Math.hypot(n.x - e.x, n.z - e.z) - (n.fala.voce ? 100 : 0), n]).sort((a, b) => a[0] - b[0]).slice(0, 4)
      .forEach(([, n]) => poe('fala:' + n.i, [n.x, (n.caiu ? 1.2 : n.sit || n.senta ? 1.5 : 2.02) + n.y, n.z], n.fala.t, 'fala' + (n.fala.voce ? ' voce' : '') + (n.papel === 'grita' || n.grita ? ' grito' : '')));
    /* v4.12: o "+0,01" que sobe de onde você pegou a moeda */
    const mo = '+' + C.correalFmt((C.verso.ACHA && C.verso.ACHA.moeda) || .01);
    K.flutua = (K.flutua || []).filter(f => agora - f.t0 < 900); K.flutua.forEach(f => poe('mais:' + f.id, [f.x, .9 + (agora - f.t0) / 900 * .8, f.z], mo, 'mais'));
  }
  /* ---------- v4.12 · o empurrão no Calçadão (e o correal que cai na rua) ----------
     O Thales: "quero empurrar no 3D também, e se empurrar demais cai correal da pessoa no chão". O mesmo da cidade: perto
     de alguém, o botão preto "Empurrar" (ou F). A pessoa escorrega, cai sentada no chão (quem tava no banco cai do banco,
     o Irmão Ivo cai do caixote), fica tonta com as estrelinhas, levanta brava, fica de mal meio minuto e volta pro lugar
     dela. Quem tá na roda ou no banco do lado às vezes revida. Cada empurrão é uma estrela de procurado na cidade (a
     polícia espera você sair). O terceiro empurrão no mesmo minuto derruba as moedas (C.verso.apanhou decide, como na
     cidade): elas pulam, quicam e ficam girando no chão; passou por cima, pegou, e o banco paga pela fila da cidade
     (C.verso.achado). Tudo do aparelho de cada um, como a gente daqui */
  const BRAVO_CALC = ['Ô! Sem educação!', 'Tá maluco, rapaz?', 'Vou chamar a polícia!', 'Que isso, criatura?', 'Respeita quem tá quieto!', 'Sai pra lá!', 'Na frente de todo mundo?'];
  const REVIDE_CALC = ['Ei! Respeita!', 'Mexeu com um, mexeu com a roda!', 'Sai daqui, folgado!', 'Vai empurrar outro!'];
  const PERDEU_CALC = ['Minhas moedas!', 'Ô! Meu troco!', 'Era o dinheiro do pastel!', 'Devolve o meu correal!'];
  const LISO_CALC = ['Já levou tudo, rapaz!', 'Não tenho mais nada!', 'Tô liso, me deixa!'];
  /* quem dá pra empurrar: o mais perto a até 1,3 m, em pé ou sentado, que não tá no chão */
  function quemEmpurroCalc(){
    const K = S.calc, e = S.eu; if(!K || !e || e.sit || S.modo !== 'andar' || S.corrida || S.desafio || S.pesca || nivelDe(e.y) !== 0 || (e.tonto || 0) > Date.now()) return null;
    let best = null, md = 1.3; for(const n of K.gente){ if(n.caiu) continue; const d = Math.hypot(n.x - e.x, n.z - e.z); if(d < md){ md = d; best = n; } }
    return best;
  }
  function empurraCalc(){
    const n = quemEmpurroCalc(), e = S.eu; if(!n || !e) return;
    const agora = Date.now(); if(agora - (S.empT || 0) < 450) return; S.empT = agora;
    e.yaw = Math.atan2(n.x - e.x, n.z - e.z);
    const base = PL.gente[n.i] || {};
    /* de onde ela volta depois (o banco, o caixote, o lugar da roda ou da barraca); quem passa segue o caminho */
    const volta = n.sit ? { x: n.sit.x, z: n.sit.z, yaw: n.sit.yaw, sit: n.sit } : n.papel !== 'anda' ? { x: base.x, z: base.z, yaw: base.yaw || 0, y: base.y || 0 } : null;
    if(n.sit){ const a = n.sit, p = livrePerto(a.x + Math.sin(a.yaw) * .8, a.z + Math.cos(a.yaw) * .8, 0); n.sit = null; n.x = p[0]; n.z = p[1]; }
    const dx = n.x - e.x, dz = n.z - e.z, d = Math.hypot(dx, dz) || 1;
    n.caiu = { t0: agora, ate: agora + 2400, vx: dx / d * 2.2, vz: dz / d * 2.2, volta }; n.y = 0; n.fala = null; n.olha = 0; n.paraAte = 0; n.cantaAte = 0; n.volta = null;
    if(n.grupo && n.grupo.papo) n.grupo.papo = null;
    if(C.versoSom && C.versoSom.gta) C.versoSom.gta('empurra');
    if(C.verso.procura) C.verso.procura(1, 'empurrou ' + n.nome);
    /* empurrou demais: as moedas */
    const q = C.verso.apanhou ? C.verso.apanhou(n) : 0;
    if(q > 0){ soltaMoedasCalc(n, q); diz(n, sorteia(PERDEU_CALC)); } else if(q < 0) diz(n, sorteia(LISO_CALC));
    /* quem tá na roda ou no banco do lado às vezes revida */
    const o = n.grupo && n.grupo.quem.filter(m => m !== n && !m.caiu && Math.hypot(m.x - e.x, m.z - e.z) < 3.2)[0];
    if(o && Math.random() < .5) setTimeout(() => { if(!S.aberta || !S.calc || o.caiu) return; diz(o, sorteia(REVIDE_CALC)); o.olha = Date.now() + 3000; derrubaEuCalc(o.x, o.z); }, 380);
    brigaCalcUI();
  }
  /* você levando um empurrão: escorrega uns palmos e fica uns instantes sem andar */
  function derrubaEuCalc(fx, fz){
    const e = S.eu; if(!e) return; if(e.sit) levanta();
    const dx = e.x - fx, dz = e.z - fz, d = Math.hypot(dx, dz) || 1;
    e.tonto = Date.now() + 900; e.empurrao = { vx: dx / d * 2, vz: dz / d * 2, t0: Date.now() }; S.alvo = null; S.acao = null; S.rota = [];
    if(C.versoSom && C.versoSom.gta) C.versoSom.gta('empurra');
  }
  /* um quadro de quem tá no chão: escorrega 0,3 s girando, senta e fica tonto; levantou, fica bravo e volta pro lugar */
  function caidoCalc(n, dt){
    const c = n.caiu; if(!c) return false;
    const agora = Date.now();
    if(agora >= c.ate){
      n.caiu = null; n.bravo = agora + 30000; n.andando = false;
      diz(n, n.grita && n.papel === 'anda' ? 'Respeita a bandeira, rapaz!' : sorteia(BRAVO_CALC));
      if(S.eu) n.yaw = Math.atan2(S.eu.x - n.x, S.eu.z - n.z);
      if(c.volta){ n.volta = c.volta; n.voltaT = agora + 2600; }
      return false;
    }
    if(agora - c.t0 < 300){ const nx = n.x + c.vx * dt, nz = n.z + c.vz * dt; if(!bate(nx, n.z, 0)) n.x = nx; if(!bate(n.x, nz, 0)) n.z = nz; n.yaw += dt * 16; }
    else c.sentou = true;
    n.andando = false; return true;
  }
  /* depois do bravo: anda de volta pro lugar (e senta de novo, se era do banco) */
  function voltaCalc(n, dt){
    const v = n.volta, agora = Date.now(); if(!v) return false;
    if(agora < n.voltaT){ n.andando = false; return true; }
    const dx = v.x - n.x, dz = v.z - n.z, d = Math.hypot(dx, dz);
    if(d < .08){ n.x = v.x; n.z = v.z; n.yaw = v.yaw; n.y = v.y || 0; n.andando = false; if(v.sit && (!v.sit.quem || v.sit.quem === n)){ v.sit.quem = n; n.sit = v.sit; } n.volta = null; return false; }
    const s = Math.min(d, 1.15 * dt); n.x += dx / d * s; n.z += dz / d * s; n.yaw = Math.atan2(dx, dz); n.passo += dt * 8.5; n.andando = true; return true;
  }
  function soltaMoedasCalc(n, q){
    const K = S.calc, agora = Date.now(); if(!K) return; K.moedas = K.moedas || [];
    for(let i = 0; i < q; i++){ const a = Math.random() * Math.PI * 2, v = 1.1 + Math.random() * 1.1; K.moedaN = (K.moedaN || 0) + 1;
      K.moedas.push({ id: K.moedaN, x: n.x, z: n.z, y: .75, vx: Math.cos(a) * v, vz: Math.sin(a) * v, vy: 3.1 + Math.random() * 1.2, t0: agora + i * 70, ate: agora + 45000, quica: 0, fase: Math.random() * 6 }); }
    if(C.versoSom && C.versoSom.gta) C.versoSom.gta('moedas');
  }
  /* as moedas: voam, quicam (batem e voltam do que for sólido), param girando; passou por cima, pegou */
  function passoMoedasCalc(dt){
    const K = S.calc, e = S.eu; if(!K || !K.moedas || !K.moedas.length || !e) return;
    const agora = Date.now(); let pegou = 0;
    for(let i = K.moedas.length - 1; i >= 0; i--){
      const m = K.moedas[i]; if(agora < m.t0) continue;
      if(agora > m.ate){ K.moedas.splice(i, 1); continue; }
      if(!m.parada){
        const nx = m.x + m.vx * dt, nz = m.z + m.vz * dt;
        if(!bate(nx, m.z, 0)) m.x = nx; else m.vx = -m.vx * .4; if(!bate(m.x, nz, 0)) m.z = nz; else m.vz = -m.vz * .4;
        m.vy -= 9.8 * dt; m.y += m.vy * dt;
        if(m.y <= .14){ m.y = .14; if(m.quica < 2 && m.vy < -1.2){ m.vy = -m.vy * .35; m.vx *= .5; m.vz *= .5; m.quica++; } else { m.parada = true; m.vy = 0; } }
        continue;
      }
      if(!e.sit && Math.hypot(m.x - e.x, m.z - e.z) < .6){ K.moedas.splice(i, 1); pegou++; (K.flutua || (K.flutua = [])).push({ id: m.id, x: m.x, z: m.z, t0: agora }); }
    }
    if(pegou){ if(C.versoSom && C.versoSom.gta) C.versoSom.gta('moeda'); if(C.verso.achado) C.verso.achado(pegou); }
  }
  /* o que desenha: as moedas girando (pisca nos últimos 5 s) e as estrelinhas em volta da cabeça de quem caiu */
  function moedasSolidos(t, cx, cz){
    const K = S.calc, out = [], agora = Date.now();
    (K.moedas || []).forEach(m => { if(agora < m.t0 || Math.hypot(m.x - cx, m.z - cz) > 20 || (m.ate - agora < 5000 && Math.floor(agora / 150) % 2)) return;
      const y = m.parada ? .16 + Math.sin(t * 3 + m.fase) * .03 : m.y, g = { yaw: t * 5 + m.fase, piv: [m.x, 0, m.z] };
      out.push(solido(B(m.x - .13, y - .13, m.z - .022, .26, .26, .044, '#F2C230'), [g], '#F2C230', null)); });
    K.gente.forEach(n => { if(!(n.caiu && n.caiu.sentou) || Math.hypot(n.x - cx, n.z - cz) > 20) return;
      for(let i = 0; i < 3; i++){ const a = t * 5 + i * 2.1; out.push(esfera(n.x + Math.cos(a) * .3, 1.18, n.z + Math.sin(a) * .3, .055, i % 2 ? AMARELO : PAPEL, null)); } });
    return out;
  }
  /* o botão preto: "Empurrar Fulano" quando tem alguém perto */
  function brigaCalcUI(){
    const b = C.$('cs-briga'); if(!b) return;
    const n = quemEmpurroCalc(), txt = n ? 'Empurrar ' + n.nome : '';
    if(b.dataset.txt !== txt){ b.dataset.txt = txt; b.hidden = !n; if(n) b.innerHTML = `${ico('raio')}<span>${esc(txt)}</span>`; }
    pilhaCalc(b);
  }
  /* v4.15 · o Empurrar colado em cima do botão amarelo ("Trocar ideia"), na mesma largura; a altura vem da posição de
     verdade do amarelo (no celular o texto quebra em duas linhas). Sem o amarelo, fica onde a CSS põe */
  function pilhaCalc(b){
    const p = C.$('cs-porta'), st = p && p.offsetParent; if(!p || !st) { b.style.bottom = b.style.minWidth = ''; return; }
    if(b.hidden || p.hidden){ b.style.bottom = b.style.minWidth = ''; return; }
    const rp = p.getBoundingClientRect(), rs = st.getBoundingClientRect(); if(!rp.height) return;
    b.style.bottom = Math.round(rs.bottom - rp.top + 8) + 'px'; b.style.minWidth = rp.width.toFixed(1) + 'px';
  }
  /* as imagens das fachadas, das placas e do Relojão (uma por face) */
  /* v3.80: imagem com "n" (a pintura numa parede de fora) some quando a câmera tá do outro lado (a parede vira mureta) */
  function solidosImgs(cam){ if(!PL || !PL.imgs) return []; if(!PL._is) PL._is = PL.imgs.map(p => painelSol(p.P4, p.img, p.cor || INK, null));
    if(!cam || !PL.imgs.some(p => p.n)) return PL._is;
    return PL._is.filter((s, i) => { const p = PL.imgs[i], q = p.P4[0]; return !p.n || (cam.pos[0] - q[0]) * p.n[0] + (cam.pos[2] - q[2]) * p.n[2] > 0; }); }
  const ehCarro = k => k === 'hatch' || k === 'suv' || k === 'picape';
  const veicAuto = () => { let k = S.veicAuto; if(!k){ try{ k = localStorage.getItem('corre-autodromo') || ''; }catch(e){} } return VEIC_AUTO.find(v => v.k === k) || VEIC_AUTO[0]; };
  const PISTA_KART = k => ({ kart: true, k, rk: KART_DEF[k].rk, nome: KART_DEF[k].nome, sub: KART_DEF[k].sub, veic: 'patinete', vmax: 10, acel: 7.5, giro: 2.45, Kp: PLANTAS_KART[k].kart, def: KART_DEF[k] });
  /* ---------- v3.80 · a mansão brutalista soviética do @jeydiaz ----------
     O Thales: "faça a casa dele uma mansão brutalista soviética". 30 x 24, pé-direito de 7 m no salão. Tudo em concreto
     aparente. Embaixo: o salão com o mural de mosaico (o cosmos: sol de raios, órbita, foguete e o cosmonauta, desenho
     nosso), a lareira de concreto solta no meio do sofá de alvenaria, o lustre Sputnik, o piano de cauda, as colunas
     com capitel, a passadeira vermelha até a escadaria e o capacete de cosmonauta no pedestal; a cozinha e a mesa de
     banquete com o samovar e a "parede" de vitrine (a estante de cristais); embaixo do mezanino, o quarto com o tapete
     pendurado na parede, a bânia (a sauna russa de madeira, com a fornalha de pedras, os vênikis secos e a tina) e a
     biblioteca com a TV de madeira, as poltronas de couro, o xadrez e a radiola (toca os discos da casa). No mezanino,
     o gabinete: as ferramentas, o mapa do cosmos, o globo e o telefone vermelho. A planta é dele pelo @ (e pelo id) */
  const KB = { conc: '#A9ABAE', concE: '#7C7F84', concC: '#C4C5C7', verm: '#B3202A', vermE: '#7E1720', ouro: '#D9A93A', noz: '#5E3A22', nozC: '#8A5A36', creme: '#E9E1CF', couro: '#6B2E22', banha: '#C9A06A', banhaE: '#9C7A4A' };
  const esferaB = (x, y, z, d, c) => Object.assign(B(x, y, z, d, d, d, c), { ex: { esfera: d / 2 } });
  const luzB = b => Object.assign(b, { cru: true });
  /* cadeira de jantar virada pra um lado (o encosto fica do lado oposto) */
  const cadeiraP = (c, para) => { const pe = [B(.22, 0, .22, .07, .45, .07, INK), B(.71, 0, .22, .07, .45, .07, INK), B(.22, 0, .71, .07, .45, .07, INK), B(.71, 0, .71, .07, .45, .07, INK)], as = B(.2, .45, .2, .6, .08, .6, c);
    const enc = { 'x+': B(.2, .53, .2, .08, .62, .6, c), 'x-': B(.72, .53, .2, .08, .62, .6, c), 'z+': B(.2, .53, .2, .6, .62, .08, c), 'z-': B(.2, .53, .72, .6, .62, .08, c) }[para];
    return [...pe, as, enc]; };
  /* uma coluna de concreto com o capitel alargado em cima */
  const colunaB = () => [B(0, 0, 0, .8, 6.15, .8, KB.conc), B(.06, 0, .06, .1, 6.15, .1, KB.concC), B(-.3, 6.15, -.3, 1.4, .85, 1.4, KB.conc), B(-.15, 5.9, -.15, 1.1, .25, 1.1, KB.concE)];
  /* o lustre Sputnik: a bola de latão e as varetas com a lâmpada na ponta, girando cada uma em volta do centro */
  function sputnik(cx, cy, cz){
    const out = [B(cx - .02, cy, cz - .02, .04, 7 - cy, .04, INK), esferaB(cx - .25, cy - .25, cz - .25, .5, KB.ouro)];
    [[0, 6], [.75, 6], [-.75, 6]].forEach(([roll, n], g) => { for(let i = 0; i < n; i++){ const yaw = (i + g * .5) / n * Math.PI * 2, giro = { yaw, roll, piv: [cx, cy, cz] };
      out.push(Object.assign(B(cx, cy - .018, cz - .018, 1.05, .036, .036, KB.ouro), giro), luzB(Object.assign(B(cx + 1.02, cy - .07, cz - .07, .14, .14, .14, '#FFE9A8'), giro))); } });
    return out;
  }
  /* ---- as imagens: o mural de mosaico, o tapete na parede e o mapa do cosmos ---- */
  /* o mosaico: o desenho é feito numa tela, depois cada pastilha pega a cor do meio dela, com um tremido de tom, e o
     rejunte fica escuro entre elas */
  function muralCosmos(g, w, h){
    const R = (x0, y0, x1, y1, c) => { g.fillStyle = c; g.fillRect(x0 * w, y0 * h, (x1 - x0) * w, (y1 - y0) * h); };
    R(0, 0, 1, 1, '#14205A');
    /* o sol de raios no canto de cima à esquerda */
    const sx = w * .18, sy = h * .2;
    for(let i = 0; i < 18; i++){ const a0 = i / 18 * Math.PI * 2, a1 = a0 + Math.PI / 18; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + Math.cos(a0) * w, sy + Math.sin(a0) * w); g.lineTo(sx + Math.cos(a1) * w, sy + Math.sin(a1) * w); g.closePath(); g.fillStyle = i % 2 ? '#1E3A8A' : '#26449E'; g.fill(); }
    [[h * .34, '#F2C230'], [h * .26, '#FF8A3D'], [h * .18, '#FFE45E']].forEach(([r, c]) => { g.beginPath(); g.arc(sx, sy, r, 0, Math.PI * 2); g.fillStyle = c; g.fill(); });
    /* a Terra (azul, nuvem branca e terra cor de barro: nada de verde) com a órbita */
    const tx = w * .78, ty = h * .78; g.beginPath(); g.arc(tx, ty, h * .36, 0, Math.PI * 2); g.fillStyle = '#3C6FD6'; g.fill();
    g.fillStyle = '#C8743A'; [[-.1, -.12, .16, .1], [.08, .05, .12, .14], [-.2, .12, .1, .08]].forEach(([dx, dy, rw, rh]) => { g.beginPath(); g.ellipse(tx + dx * h, ty + dy * h, rw * h, rh * h, .4, 0, Math.PI * 2); g.fill(); });
    g.fillStyle = '#F2F0EA'; [[-.18, -.2, .14, .04], [.15, -.1, .12, .035]].forEach(([dx, dy, rw, rh]) => { g.beginPath(); g.ellipse(tx + dx * h, ty + dy * h, rw * h, rh * h, -.2, 0, Math.PI * 2); g.fill(); });
    g.strokeStyle = '#E9E1CF'; g.lineWidth = h * .025; g.setLineDash([h * .04, h * .03]); g.beginPath(); g.ellipse(w * .6, h * .52, w * .34, h * .2, -.25, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    /* o Sputnik na órbita */
    const kx = w * .32, ky = h * .68; g.fillStyle = '#E9E1CF'; g.beginPath(); g.arc(kx, ky, h * .045, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#E9E1CF'; g.lineWidth = h * .012; [[-1, .9], [-1, 1.25], [1, 2.1], [1, 2.4]].forEach(([s, a]) => { g.beginPath(); g.moveTo(kx, ky); g.lineTo(kx + Math.cos(a) * s * h * .16, ky + Math.sin(a) * h * .16); g.stroke(); });
    /* o foguete subindo na diagonal, com o rastro de fogo */
    g.save(); g.translate(w * .5, h * .5); g.rotate(-.75);
    g.fillStyle = '#FF8A3D'; g.beginPath(); g.moveTo(-h * .2, -h * .05); g.lineTo(-h * .62, 0); g.lineTo(-h * .2, h * .05); g.closePath(); g.fill();
    g.fillStyle = '#FFE45E'; g.beginPath(); g.moveTo(-h * .2, -h * .03); g.lineTo(-h * .42, 0); g.lineTo(-h * .2, h * .03); g.closePath(); g.fill();
    g.fillStyle = '#F2F0EA'; g.fillRect(-h * .2, -h * .06, h * .42, h * .12);
    g.fillStyle = '#C8102E'; g.beginPath(); g.moveTo(h * .22, -h * .06); g.lineTo(h * .36, 0); g.lineTo(h * .22, h * .06); g.closePath(); g.fill();
    g.fillRect(-h * .2, -h * .12, h * .1, h * .06); g.fillRect(-h * .2, h * .06, h * .1, h * .06);
    g.fillStyle = '#3C6FD6'; g.beginPath(); g.arc(h * .08, 0, h * .03, 0, Math.PI * 2); g.fill();
    g.restore();
    /* o cosmonauta, de perfil pro alto: o capacete redondo com o vidro dourado, o ombro e o braço erguido */
    const cx = w * .9, cy = h * .3;
    g.fillStyle = '#F2F0EA'; g.fillRect(cx - h * .16, cy + h * .12, h * .32, h * .4); g.fillRect(cx - h * .26, cy - h * .2, h * .1, h * .36);
    g.beginPath(); g.arc(cx, cy, h * .16, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#D9A93A'; g.beginPath(); g.ellipse(cx - h * .02, cy, h * .1, h * .08, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#C8102E'; g.fillRect(cx - h * .14, cy + h * .2, h * .28, h * .04);
    /* a estrela na mão erguida, e as estrelas do céu */
    const estrela = (x, y, r, c) => { g.beginPath(); for(let i = 0; i < 10; i++){ const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .42 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fillStyle = c; g.fill(); };
    estrela(cx - h * .21, cy - h * .3, h * .09, '#C8102E');
    [[.42, .14], [.6, .1], [.55, .3], [.08, .55], [.22, .9], [.45, .88], [.7, .22], [.95, .7]].forEach(([fx, fy]) => estrela(w * fx, h * fy, h * .025, '#FFF6D8'));
    /* as pastilhas */
    const P = Math.max(4, Math.round(h / 44)), im = g.getImageData(0, 0, w, h).data;
    g.fillStyle = '#2A2D33'; g.fillRect(0, 0, w, h);
    for(let y = 0; y < h; y += P) for(let x = 0; x < w; x += P){
      const i = ((Math.min(h - 1, y + (P >> 1)) * w) + Math.min(w - 1, x + (P >> 1))) * 4, j = .9 + ((x * 7 + y * 13) % 11) / 50;
      g.fillStyle = `rgb(${Math.min(255, im[i] * j) | 0},${Math.min(255, im[i + 1] * j) | 0},${Math.min(255, im[i + 2] * j) | 0})`; g.fillRect(x, y, P - 1, P - 1);
    }
  }
  /* o tapete pendurado em cima da cama: campo vinho, as barras azul e creme, o medalhão do meio e os cantos */
  function tapeteParede(g, w, h){
    const F = (x, y, ww, hh, c) => { g.fillStyle = c; g.fillRect(x, y, ww, hh); };
    F(0, 0, w, h, '#1E2A4A'); F(w * .03, h * .05, w * .94, h * .9, '#E9D8B4'); F(w * .05, h * .09, w * .9, h * .82, '#7A1C22');
    /* a barra de dentro, com os ganchos */
    g.strokeStyle = '#D9A93A'; g.lineWidth = Math.max(2, h * .012); g.strokeRect(w * .08, h * .15, w * .84, h * .7);
    for(let x = w * .1; x < w * .9; x += w * .04){ g.fillStyle = '#1E2A4A'; g.fillRect(x, h * .11, w * .015, h * .025); g.fillRect(x, h * .865, w * .015, h * .025); }
    const losango = (cx, cy, rx, ry, c) => { g.beginPath(); g.moveTo(cx, cy - ry); g.lineTo(cx + rx, cy); g.lineTo(cx, cy + ry); g.lineTo(cx - rx, cy); g.closePath(); g.fillStyle = c; g.fill(); };
    /* o medalhão: losangos uns dentro dos outros, com o octógono no meio */
    const cx = w / 2, cy = h / 2;
    [[.3, .36, '#1E2A4A'], [.26, .31, '#E9D8B4'], [.22, .26, '#B3202A'], [.16, .19, '#1E2A4A'], [.1, .12, '#D9A93A'], [.05, .06, '#7A1C22']].forEach(([rx, ry, c]) => losango(cx, cy, w * rx, h * ry, c));
    [-1, 1].forEach(s => { losango(cx + s * w * .3, cy, w * .06, h * .1, '#E9D8B4'); losango(cx + s * w * .3, cy, w * .035, h * .06, '#1E2A4A'); });
    /* os cantos e a fileira de botões */
    [[.08, .15], [.92, .15], [.08, .85], [.92, .85]].forEach(([fx, fy]) => { g.beginPath(); g.moveTo(w * fx, h * fy); g.lineTo(w * fx + (fx < .5 ? 1 : -1) * w * .12, h * fy); g.lineTo(w * fx, h * fy + (fy < .5 ? 1 : -1) * h * .2); g.closePath(); g.fillStyle = '#1E2A4A'; g.fill(); });
    for(let x = w * .14; x < w * .86; x += w * .06){ losango(x, h * .22, w * .012, h * .025, '#E9D8B4'); losango(x, h * .78, w * .012, h * .025, '#E9D8B4'); }
    /* a franja embaixo */
    for(let x = w * .04; x < w * .96; x += 4) F(x, h * .95, 2, h * .05, '#E9D8B4');
  }
  /* o mapa do cosmos do gabinete: o azul da noite, a grade, as órbitas, as constelações e o título */
  function mapaCosmos(g, w, h){
    g.fillStyle = '#101A3A'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(233,225,207,.18)'; g.lineWidth = 1; for(let x = 0; x < w; x += w / 12){ g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for(let y = 0; y < h; y += h / 5){ g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    const sx = w * .5, sy = h * .55; g.strokeStyle = 'rgba(233,225,207,.55)'; [.12, .2, .28, .38, .48].forEach((r, i) => { g.beginPath(); g.ellipse(sx, sy, w * r, h * r * .9, 0, 0, Math.PI * 2); g.stroke(); const a = i * 1.7 + .6; g.beginPath(); g.arc(sx + Math.cos(a) * w * r, sy + Math.sin(a) * h * r * .9, h * (.025 + i * .006), 0, Math.PI * 2); g.fillStyle = ['#C6A6FF', '#E7B734', '#3C6FD6', '#C8743A', '#E9E1CF'][i]; g.fill(); });
    g.beginPath(); g.arc(sx, sy, h * .07, 0, Math.PI * 2); g.fillStyle = '#F2C230'; g.fill();
    const consts = [[[.06, .2], [.12, .14], [.18, .22], [.24, .16]], [[.78, .14], [.84, .26], [.9, .18], [.95, .3]], [[.08, .8], [.15, .72], [.2, .86]]];
    g.strokeStyle = 'rgba(255,246,216,.6)'; consts.forEach(cs => { g.beginPath(); cs.forEach(([x, y], i) => (i ? g.lineTo : g.moveTo).call(g, x * w, y * h)); g.stroke(); cs.forEach(([x, y]) => { g.fillStyle = '#FFF6D8'; g.fillRect(x * w - 2, y * h - 2, 4, 4); }); });
    letreiro(g, 'КОСМОС', w * .5, h * .12, w * .4, h * .12, '#E7B734', 900);
  }
  const PLANTA_BRUTAL = {
    k: 'brutal', W: 30, D: 24, ALT: 7,
    comodos: [
      { k: 'sala', nome: 'Salão', x0: 0, z0: 9, x1: 20, z1: 24, piso: '#8E9196', linha: 'rgba(15,18,24,.12)' },
      { k: 'cozinha', nome: 'Cozinha e banquete', x0: 20, z0: 9, x1: 30, z1: 24, piso: '#E3DBC8', piso2: '#B8574A', xadrez: true, linha: 'rgba(60,30,10,.12)' },
      { k: 'quarto', nome: 'Quarto', x0: 0, z0: 0, x1: 10, z1: 9, piso: '#8A5A3A', linha: 'rgba(40,20,5,.2)' },
      { k: 'banha', nome: 'Bânia (sauna russa)', x0: 10, z0: 0, x1: 18, z1: 9, piso: '#B5824A', linha: 'rgba(60,30,10,.22)' },
      { k: 'biblioteca', nome: 'Biblioteca', x0: 18, z0: 0, x1: 30, z1: 9, piso: '#6E4A32', linha: 'rgba(30,15,5,.22)' },
      { k: 'escritorio', nome: 'Gabinete (mezanino)', x0: 0, z0: 0, x1: 30, z1: 9, n: 1, piso: '#6A2A2E', linha: 'rgba(20,5,5,.25)' }
    ],
    paredes: [
      { a: [0, 24], b: [30, 24], ext: [0, 1], portas: [[9.2, 10.8]], altas: [[1, 8], [12, 19]], janelas: [[22, 24.5], [26, 28.5]], entrada: true, cor: KB.conc },
      { a: [30, 0], b: [30, 24], ext: [1, 0], janelas: [[12, 15], [18, 21]], cor: KB.conc },
      { a: [0, 0], b: [0, 24], ext: [-1, 0], janelas: [[3, 6]], cor: KB.conc },
      { a: [0, 0], b: [30, 0], ext: [0, -1], cor: KB.concE },
      { a: [0, 9], b: [30, 9], portas: [[4, 5.2], [13, 14.2], [24.2, 25.4]], alt: 3.4, cor: KB.concC },
      { a: [10, 0], b: [10, 9], alt: 3.4, cor: KB.concC }, { a: [18, 0], b: [18, 9], alt: 3.4, cor: KB.concC },
      { a: [20, 9], b: [20, 24], portas: [[11, 12.4]], alt: 3.4, cor: KB.concC }
    ],
    entrada: { x: 10, z: 24 }, tapete: { x: 9.3, z: 22.8, w: 1.4, d: 1 },
    mezanino: { x0: 0, z0: 0, x1: 30, z1: 9, y: 3.4, grade: [[0, 9, 18.6, 9], [20, 9, 30, 9]] },
    escada: { x0: 18.6, z0: 9, x1: 20, z1: 19, topo: 3.4 },
    estacoes: { studio: { x: 9.5, z: .4, y: 3.4 }, feed: { x: 3, z: .15, y: 3.4 }, ia: { x: 6, z: .5, y: 3.4 }, horus: { x: .15, z: 1, y: 3.4 }, mural: { x: .15, z: 4, y: 3.4 }, marcas: { x: 29.4, z: 1, y: 3.4 }, grana: { x: 29.2, z: 4.5, y: 3.4 }, vendas: { x: 15.2, z: 5.6, y: 3.4 }, nicho: { x: 1, z: 6.4, y: 3.4 }, estilo: { x: 3.4, z: 6.6, y: 3.4 }, manual: { x: 12.6, z: 1.6, y: 3.4 }, banca: { x: 14.6, z: .4, y: 3.4 }, agente: { x: 21.6, z: 1.3, y: 3.4 } },
    padrao: [],
    /* as imagens nas paredes de fora (n: pra que lado olham; com a câmera do lado de fora, a parede vira mureta e a imagem some) */
    imgs: [
      { P4: faceP4('x', .17, 9.7, 23.3, 1.3, 6.3, 1), n: [1, 0, 0], img: () => calcImg('brutalMural', 704, 256, muralCosmos), cor: '#1E3A8A' },
      { P4: faceP4('z', .17, 1.8, 7.2, 1.05, 3.05, 1), n: [0, 0, 1], img: () => calcImg('brutalTapete', 324, 120, tapeteParede), cor: '#7A1C22' },
      { P4: faceP4('z', .17, 12.2, 17.8, 4.7, 6.7, 1), n: [0, 0, 1], img: () => calcImg('brutalMapa', 336, 120, mapaCosmos), cor: '#101A3A' }
    ],
    decor: [
      /* ---- o salão ---- */
      { x: 9.3, z: 18.6, piso: true, bl: [B(0, 0, 0, 1.4, .02, 5, KB.verm), B(.12, .02, 0, 1.16, .004, 5, '#C42A33'), B(0, .021, 0, .07, .004, 5, KB.ouro), B(1.33, .021, 0, .07, .004, 5, KB.ouro)] },
      { x: 10.7, z: 18.6, piso: true, bl: [B(0, 0, 0, 7.9, .02, 1.4, KB.verm), B(0, .02, .12, 7.9, .004, 1.16, '#C42A33'), B(0, .021, 0, 7.9, .004, .07, KB.ouro), B(0, .021, 1.33, 7.9, .004, .07, KB.ouro)] },
      { x: 7.4, z: 10, bl: colunaB() }, { x: 12, z: 10, bl: colunaB() }, { x: 7.4, z: 21.4, bl: colunaB() }, { x: 12, z: 21.4, bl: colunaB() },
      /* o sofá de alvenaria em U, de almofada vermelha, em volta da lareira solta */
      { x: 1.6, z: 12.3, piso: true, bl: [B(0, 0, 0, 5.6, .02, 6, '#4A3236'), B(.25, .02, .25, 5.1, .004, 5.5, '#5E3E42')] },
      { x: 1.4, z: 12.2, bl: [B(0, 0, 0, 6, .42, .8, KB.conc), B(0, .42, .25, 6, .12, .55, KB.verm), B(0, .42, 0, 6, .62, .25, KB.conc), B(.1, .54, .25, 5.8, .32, .1, KB.vermE)] },
      { x: 1.2, z: 13, bl: [B(0, 0, 0, .8, .42, 5.4, KB.conc), B(.25, .42, 0, .55, .12, 5.4, KB.verm), B(0, .42, 0, .25, .62, 5.4, KB.conc), B(.25, .54, .1, .1, .32, 5.2, KB.vermE)] },
      { x: 2.2, z: 17.8, bl: [B(0, 0, 0, 4.2, .42, .8, KB.conc), B(0, .42, 0, 4.2, .12, .55, KB.verm), B(0, .42, .55, 4.2, .62, .25, KB.conc), B(.1, .54, .45, 4, .32, .1, KB.vermE)] },
      /* a lareira aberta: o fogo na bacia, em cima do bloco de concreto, e a coifa pendurada na chaminé até o teto */
      { x: 3.7, z: 14.6, bl: [B(0, 0, 0, 1.6, .45, 1.6, KB.concE), B(.22, .45, .22, 1.16, .1, 1.16, '#2A2D33'), B(.35, .55, .7, .9, .12, .16, '#5A3A22'), B(.7, .55, .35, .16, .12, .9, '#5A3A22'), luzB(B(.5, .62, .5, .6, .3, .6, LARANJA)), luzB(B(.6, .82, .6, .4, .34, .4, '#FFE45E')), luzB(B(.7, 1.12, .7, .2, .22, .2, '#FFF3B0')), B(.1, 1.95, .1, 1.4, .8, 1.4, KB.conc), B(.14, 1.9, .14, 1.32, .05, 1.32, '#3A3D44'), B(.45, 2.75, .45, .7, 4.25, .7, KB.conc)] },
      { x: 0, z: 0, bl: sputnik(4.5, 5.2, 15.4) },
      /* o piano de cauda, a banqueta e a partitura */
      { x: 12.8, z: 12.2, bl: [B(0, .7, 0, 2.4, .32, 1.5, INK), B(0, 1.02, 0, 2.4, .04, 1.5, '#15171B'), B(.1, 0, .1, .14, .7, .14, INK), B(2.16, 0, .1, .14, .7, .14, INK), B(1.1, 0, 1.25, .14, .7, .14, INK), B(.1, .9, 1.5, 2.2, .06, .3, '#F2F0EA'), ...Array.from({ length: 11 }, (_, i) => B(.2 + i * .19, .96, 1.5, .08, .03, .17, INK)), B(.7, 1.06, 1.35, 1, .4, .04, '#15171B'), B(.8, 1.12, 1.33, .8, .3, .01, PAPEL), B(.7, 0, 2.05, 1, .5, .4, INK), B(.7, .5, 2.05, 1, .06, .4, KB.vermE)] },
      /* o capacete de cosmonauta no pedestal, aos pés da escadaria */
      { x: 16, z: 21, bl: [B(0, 0, 0, .9, 1.1, .9, KB.concC), B(-.05, 1.1, -.05, 1, .06, 1, KB.concE), esferaB(.08, 1.16, .08, .74, '#F2F0EA'), B(.2, 1.36, .8, .5, .3, .04, KB.ouro), B(.12, 1.16, .08, .66, .12, .66, '#C8CDD4'), B(.38, 1.92, .38, .14, .08, .14, KB.verm)] },
      /* os vasos de capim-dos-pampas nos janelões */
      { x: .6, z: 22.6, bl: [B(0, 0, 0, .7, .9, .7, KB.concE), B(.2, .9, .2, .3, 1.4, .3, '#D9C27F'), B(.05, 1.6, .25, .2, .9, .2, '#E3D1A0'), B(.45, 1.5, .1, .2, .8, .2, '#E3D1A0')] },
      { x: 17.4, z: 22.6, bl: [B(0, 0, 0, .7, .9, .7, KB.concE), B(.2, .9, .2, .3, 1.4, .3, '#D9C27F'), B(.05, 1.6, .25, .2, .9, .2, '#E3D1A0'), B(.45, 1.5, .1, .2, .8, .2, '#E3D1A0')] },
      /* ---- a cozinha e o banquete ---- */
      { x: 23.6, z: 12.4, bl: [B(0, .72, 0, 2.8, .08, 8, KB.noz), ...[[.15, .15], [2.5, .15], [.15, 7.7], [2.5, 7.7], [.15, 3.9], [2.5, 3.9]].map(([x, z]) => B(x, 0, z, .15, .72, .15, KB.noz)), B(1.1, .8, .2, .6, .006, 7.6, KB.creme)] },
      { x: 24.75, z: 15.8, bl: [B(0, .8, 0, .5, .12, .5, KB.ouro), esferaB(-.02, .9, -.02, .54, KB.ouro), B(.2, 1.42, .2, .1, .2, .1, KB.ouro), B(.48, 1.08, .2, .14, .04, .08, KB.ouro), B(.12, 1.62, .12, .26, .18, .26, KB.creme), B(.18, 1.62, .4, .14, .1, .02, KB.verm)] },
      ...[13, 15, 17, 19].flatMap(z => [{ x: 22.7, z, bl: cadeiraP(KB.verm, 'x+') }, { x: 26.5, z, bl: cadeiraP(KB.verm, 'x-') }]),
      { x: 24.6, z: 11.4, bl: cadeiraP(KB.verm, 'z+') }, { x: 24.6, z: 20.5, bl: cadeiraP(KB.verm, 'z-') },
      ...[14.2, 16.4, 18.6].map(z => ({ x: 25, z, bl: [B(-.015, 2.75, -.015, .03, 1.3, .03, INK), B(-.28, 2.45, -.28, .56, .3, .56, KB.verm), luzB(B(-.12, 2.38, -.12, .24, .08, .24, '#FFE9A8'))] })),
      { x: 29.25, z: 10.2, bl: [B(0, 0, 0, .7, .88, 7.6, KB.creme), B(-.06, .88, 0, .76, .05, 7.6, '#8F96A0'), ...[.6, 2, 3.4, 4.8, 6.2].map(z => B(-.02, .1, z + .1, .02, .7, 1.1, '#D8CFB8')), B(.05, .93, 1.4, .5, .04, .9, '#7F8A96'), B(.05, .93, 4.2, .55, .05, .9, '#F2F0EA'), ...[[.15, 4.3], [.15, 4.7], [.4, 4.3], [.4, 4.7]].map(([x, z]) => B(x, .98, z, .14, .02, .14, INK)), B(.1, .98, 5.8, .3, .25, .3, KB.verm), B(.3, 1.7, 0, .4, .75, 7.6, KB.creme), ...[.2, 1.7, 3.2, 4.7, 6.2].map(z => B(.28, 1.75, z, .02, .65, 1.2, '#D8CFB8'))] },
      { x: 29.1, z: 18.6, bl: [B(0, 0, 0, .85, 1.75, .8, '#F2F0EA'), B(.05, 1.75, .05, .75, .12, .7, '#E9E5DC'), B(-.05, 1, .3, .05, .35, .12, '#C8CDD4'), B(-.02, 1.5, .25, .02, .08, .3, KB.ouro), B(-.02, .95, 0, .02, .02, .8, '#C8CDD4')] },
      { x: 20.4, z: 9.2, bl: [B(0, 0, 0, 3.6, .9, .55, KB.noz), B(0, 0, 0, 3.6, 2.4, .08, KB.noz), B(0, 1.95, 0, 3.6, .45, .55, KB.noz), B(0, .9, 0, .08, 1.05, .55, KB.noz), B(3.52, .9, 0, .08, 1.05, .55, KB.noz), B(.08, 1.42, .08, 3.44, .04, .45, KB.nozC), ...Array.from({ length: 9 }, (_, i) => B(.25 + i * .36, .94, .2, .14, .24, .14, i % 3 ? '#E8F2FF' : '#BFD9F2')), ...Array.from({ length: 6 }, (_, i) => B(.3 + i * .55, 1.46, .12, .4, .38, .04, i % 2 ? '#F2F0EA' : '#1E3A8A')), ...Array.from({ length: 4 }, (_, i) => B(.2 + i * .85, .2, .55, .7, .5, .02, KB.nozC))] },
      { x: 25.8, z: 9.2, bl: [B(0, 0, 0, 3.8, .9, .55, KB.noz), B(0, 0, 0, 3.8, 2.4, .08, KB.noz), B(0, 1.95, 0, 3.8, .45, .55, KB.noz), B(0, .9, 0, .08, 1.05, .55, KB.noz), B(3.72, .9, 0, .08, 1.05, .55, KB.noz), B(.08, 1.42, .08, 3.64, .04, .45, KB.nozC), ...Array.from({ length: 10 }, (_, i) => B(.25 + i * .34, .94, .2, .14, .24, .14, i % 3 ? '#E8F2FF' : '#BFD9F2')), ...Array.from({ length: 6 }, (_, i) => B(.3 + i * .58, 1.46, .12, .4, .38, .04, i % 2 ? KB.ouro : '#F2F0EA')), ...Array.from({ length: 4 }, (_, i) => B(.2 + i * .9, .2, .55, .75, .5, .02, KB.nozC))] },
      /* ---- o quarto ---- */
      { x: 2.8, z: .3, bl: [B(0, 0, 0, 3, .35, 2.5, KB.noz), B(0, .35, 0, 3, 1.1, .15, KB.noz), B(.1, .35, .15, 2.8, .25, 2.3, KB.creme), B(.1, .6, .9, 2.8, .07, 1.55, KB.verm), B(.1, .67, .9, 2.8, .02, .2, '#E9D8B4'), B(.3, .6, .25, 1, .16, .5, PAPEL), B(1.7, .6, .25, 1, .16, .5, PAPEL)] },
      { x: 1.8, z: .3, bl: [B(0, 0, 0, .8, .55, .6, KB.noz), B(.25, .55, .15, .3, .1, .3, KB.ouro), B(.37, .65, .27, .06, .4, .06, KB.ouro), luzB(B(.2, 1.05, .1, .4, .3, .4, '#FFE2B0'))] },
      { x: 6, z: .3, bl: [B(0, 0, 0, .8, .55, .6, KB.noz), B(.25, .55, .15, .3, .1, .3, KB.ouro), B(.37, .65, .27, .06, .4, .06, KB.ouro), luzB(B(.2, 1.05, .1, .4, .3, .4, '#FFE2B0'))] },
      { x: 2.3, z: 3.4, piso: true, bl: [B(0, 0, 0, 4, .02, 3, '#2A2F5A'), B(.25, .02, .25, 3.5, .004, 2.5, '#7A1C22')] },
      { x: 6.6, z: 8.25, acao: 'roupa', bl: [B(0, 0, 0, 3, 2.5, .6, KB.noz), B(1.48, .2, -.01, .04, 2.1, .01, INK), B(1.3, 1.1, -.03, .08, .3, .03, KB.ouro), B(1.62, 1.1, -.03, .08, .3, .03, KB.ouro), B(.1, 2.5, .05, 2.8, .1, .5, KB.nozC)] },
      prateleiraCoringa(.16, 6.4),
      /* ---- a bânia: madeira por dentro, banco de dois degraus, a fornalha de pedras, a tina e os vênikis ---- */
      { x: 10.2, z: .16, parede: true, bl: [B(0, 0, 0, 7.6, 3.2, .05, KB.banha), ...Array.from({ length: 10 }, (_, i) => B(0, .3 + i * .3, .05, 7.6, .02, .01, KB.banhaE))] },
      { x: 10.5, z: .3, bl: [B(0, 0, 0, 7, .9, .7, KB.banhaE), B(-.02, .9, 0, 7.04, .07, .74, KB.banha), B(0, 0, .7, 7, .42, .8, KB.banhaE), B(-.02, .42, .7, 7.04, .07, .84, KB.banha)] },
      { x: 16.2, z: 6, bl: [B(0, 0, 0, 1.3, .95, 1.2, '#2A2D33'), B(.1, .3, 1.2, .5, .35, .02, '#FF8A3D'), ...[[.15, .2], [.5, .15], [.85, .25], [.3, .6], [.7, .65], [.5, .9]].map(([x, z], i) => esferaB(x, .93, z - .05, .3 + (i % 2) * .06, i % 3 ? '#7F848C' : '#5C6470')), B(.5, 1.2, .5, .2, 2.3, .2, '#3A3D44')] },
      { x: 15.4, z: 7.6, bl: [B(0, 0, 0, .4, .35, .4, KB.nozC), B(.05, .35, .05, .3, .02, .3, CEU), B(.15, .37, .1, .05, .5, .05, KB.noz)] },
      { x: 11, z: 6, bl: [B(0, 0, 0, 1.6, .9, 1.6, KB.nozC), Object.assign(B(0, 0, 0, 1.6, .9, 1.6, KB.nozC), { yaw: Math.PI / 4 }), B(-.03, .3, -.03, 1.66, .06, 1.66, INK), B(.12, .87, .12, 1.36, .02, 1.36, '#6FA8D8')] },
      { x: 10.16, z: 3.4, parede: true, bl: [B(0, 1.5, 0, .05, .5, .06, KB.noz), B(-.02, .8, -.12, .08, .75, .3, '#C9A24A'), B(0, 1.5, .8, .05, .5, .06, KB.noz), B(-.02, .8, .68, .08, .75, .3, '#B8902E')] },
      /* ---- a biblioteca ---- */
      { x: 18.6, z: .2, bl: [B(0, 0, 0, 10.8, 3.2, .45, KB.noz), ...[.15, 1.15, 2.15].flatMap((y, r) => Array.from({ length: 18 }, (_, i) => B(.15 + i * .58, y + .05, .4, .3 + ((i * 7 + r * 3) % 4) * .05, .62 + ((i + r) % 3) * .08, .06, [KB.verm, '#1E3A8A', KB.creme, KB.ouro, '#2A2D33', '#7A1C22', '#C8743A'][(i + r * 2) % 7]))), ...[1.05, 2.05].map(y => B(0, y, 0, 10.8, .06, .45, KB.nozC))] },
      { x: 19.8, z: 3.2, bl: [B(0, 0, .1, .9, .45, .85, KB.couro), B(0, .45, 0, .9, .8, .2, KB.couro), B(-.12, .2, .1, .14, .55, .85, KB.couro), B(.88, .2, .1, .14, .55, .85, KB.couro)] },
      { x: 22.4, z: 3.2, bl: [B(0, 0, .1, .9, .45, .85, KB.couro), B(0, .45, 0, .9, .8, .2, KB.couro), B(-.12, .2, .1, .14, .55, .85, KB.couro), B(.88, .2, .1, .14, .55, .85, KB.couro)] },
      { x: 21.15, z: 3.5, bl: [B(.3, 0, .3, .1, .66, .1, KB.noz), B(0, .66, 0, .7, .06, .7, KB.noz), ...Array.from({ length: 16 }, (_, i) => B(.03 + (i % 4) * .16, .72, .03 + Math.floor(i / 4) * .16, .16, .006, .16, (i + Math.floor(i / 4)) % 2 ? KB.creme : '#2A2D33')), B(.1, .73, .1, .06, .1, .06, PAPEL), B(.5, .73, .45, .06, .12, .06, INK)] },
      { x: 20.8, z: 6.5, bl: [B(.1, 0, .1, .1, .4, .1, KB.noz), B(1, 0, .1, .1, .4, .1, KB.noz), B(0, .4, 0, 1.2, .75, .7, KB.noz), B(.15, .5, -.02, .7, .55, .02, '#2B3A4A'), B(.22, .58, -.03, .2, .2, .01, '#4A6A84'), B(.95, .9, -.02, .1, .1, .02, KB.ouro), B(.95, .65, -.02, .1, .1, .02, KB.ouro), B(.5, 1.15, .3, .04, .4, .04, INK), Object.assign(B(.5, 1.15, .3, .04, .5, .04, INK), { roll: .5 })] },
      { x: 26.4, z: 7.7, acao: 'discos', topo: .9, bl: [B(0, 0, 0, 2, .85, .6, KB.noz), B(-.02, .85, -.02, 2.04, .06, .64, KB.nozC), B(.12, .12, -.02, 1.1, .6, .02, '#C9B48A'), ...[.2, .32, .44, .56].map(y => B(.12, y, -.03, 1.1, .015, .01, '#9C8858')), B(1.35, .5, -.02, .5, .2, .02, '#F2E2A8'), B(1.4, .58, -.03, .4, .01, .01, KB.verm), B(1.42, .22, -.02, .1, .1, .02, KB.ouro), B(1.7, .22, -.02, .1, .1, .02, KB.ouro)] },
      { x: 28.6, z: 3.4, bl: [B(.25, 0, .25, .3, .05, .3, INK), B(.37, .05, .37, .06, 1.6, .06, KB.ouro), luzB(B(.15, 1.55, .15, .5, .4, .5, '#FFE2B0'))] },
      /* ---- o gabinete, no mezanino ---- */
      { x: 6, z: 2.2, y: 3.4, piso: true, bl: [B(0, 0, 0, 9, .03, 4.6, '#4A1A1E'), B(.3, .03, .3, 8.4, .006, 4, '#7A2A30')] },
      { x: 24.4, z: 5.6, y: 3.4, bl: [B(0, .7, 0, .9, .06, .7, KB.noz), B(.38, 0, .28, .14, .7, .14, KB.noz), B(.2, .76, .15, .5, .1, .36, KB.verm), B(.15, .86, .14, .6, .07, .14, KB.verm), B(.36, .86, .3, .18, .03, .18, PAPEL)] },
      { x: 26.4, z: 6, y: 3.4, bl: [B(.2, 0, .2, .4, .06, .4, KB.noz), B(.36, .06, .36, .08, .7, .08, KB.noz), esferaB(.05, .7, .05, .7, '#3C6FD6'), Object.assign(B(.02, 1.03, .38, .76, .04, .04, KB.ouro), { roll: .4 })] }
    ]
  };
  /* ---------- v3.81 · o templo do @consanans: Egito e Rosacruz ----------
     O Thales: "faça o interior da minha casa tipo como você fez para o @jeydiaz, mas com tema de egito/rosacruz/
     maçonaria". No lugar do loft, 30 x 24 com pé-direito de 7 m. v3.82 (o Thales: "a sala do VITRIOL você tira e faz a
     sala do Umbral" e "deixa mais rosacruz do que maçom o templo de baixo"): saíram o pavimento de xadrez, as colunas B
     e J, o altar dos juramentos com as três luzes, o dossel, o malhete, o delta, o sol e a lua e o painel da loja.
     Embaixo, agora, o templo no jeito da AMORC (a foto que ele mandou, a mesma do Hórus): piso de terracota, o tablado
     de dentes de serra preto e branco, a passadeira vermelha da porta ao Oriente, o cordão vermelho com os postes de
     lótus, a Shekinah no meio (o altar triangular com as três velas, a ponta pro Oriente), as colunas de papiro, os
     bancos dourados, o Oriente nos degraus (a cadeira de ouro, o púlpito com a rosa-cruz no pano e os castiçais), as
     esfinges e os braseiros; em cima do Oriente, a rosa-cruz grande e o sol alado; na parede, o mural do Egito e, na da
     biblioteca, outra rosa-cruz e outro sol alado. Ao lado, a biblioteca hermética (o sarcófago, a esfera armilar, a
     bancada de alquimia, a gata de Bastet) e a sala do Umbral (a passagem entre o lado de fora e o templo: penumbra, o
     véu na porta, os guardiões de Anúbis, a vela, a bacia d'água e o UMBRAL pintado na parede). Embaixo do mezanino, o
     quarto do faraó, o estúdio (a mesa de DJ toca os discos) e o closet (o armário do olho de Hórus troca a skin). No
     mezanino, o gabinete com as ferramentas, o papiro da pesagem do coração, o painel da rosa-cruz, a pirâmide e o
     ankh. Tudo desenho nosso. Nada de verde (Osíris vai de preto, a cor da terra fértil) */
  const KT = { bronze: '#A8732E', bronzeE: '#7A5220', bronzeC: '#C99A55', pedra: '#D9C08A', pedraE: '#B89A62', lapis: '#22408E', ouro: '#D9A93A', ouroC: '#F2D27A', mad: '#4A2E1E', madC: '#6E4A32', azul: '#2A4FA8', escuro: '#1E1F24', papiro: '#E8D9B0' };
  /* ---- as pinturas ---- */
  const estrela5 = (g, x, y, r, c) => { g.beginPath(); for(let i = 0; i < 10; i++){ const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .42 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fillStyle = c; g.fill(); };
  /* um hieróglifo na caixa s x s (canto de cima à esquerda em x, y) */
  function hiero(g, k, x, y, s, c){
    g.fillStyle = c; g.strokeStyle = c; g.lineWidth = Math.max(1.5, s * .12); g.lineCap = 'round';
    const m = s / 2, L = (a, b, cc, d) => { g.beginPath(); g.moveTo(x + a * s, y + b * s); g.lineTo(x + cc * s, y + d * s); g.stroke(); };
    if(k === 'ankh'){ g.beginPath(); g.ellipse(x + m, y + s * .22, s * .16, s * .2, 0, 0, Math.PI * 2); g.stroke(); L(.5, .42, .5, .98); L(.22, .5, .78, .5); }
    else if(k === 'olho'){ g.beginPath(); g.ellipse(x + m, y + s * .38, s * .36, s * .16, 0, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(x + m, y + s * .38, s * .1, 0, Math.PI * 2); g.fill(); L(.4, .54, .34, .9); L(.62, .54, .82, .62); L(.82, .62, .78, .88); }
    else if(k === 'agua'){ [.25, .5, .75].forEach(v => { g.beginPath(); for(let i = 0; i <= 6; i++) g.lineTo(x + s * (.05 + i * .15), y + s * v + (i % 2 ? -s * .07 : s * .07)); g.stroke(); }); }
    else if(k === 'sol'){ g.beginPath(); g.arc(x + m, y + m, s * .36, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(x + m, y + m, s * .08, 0, Math.PI * 2); g.fill(); }
    else if(k === 'pena'){ g.beginPath(); g.ellipse(x + m, y + m, s * .14, s * .44, 0, 0, Math.PI * 2); g.fill(); L(.5, .1, .5, .98); }
    else if(k === 'passaro'){ g.beginPath(); g.ellipse(x + s * .45, y + s * .55, s * .3, s * .2, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(x + s * .74, y + s * .3, s * .12, 0, Math.PI * 2); g.fill(); L(.84, .3, .98, .36); L(.4, .72, .36, .98); L(.55, .72, .6, .98); L(.15, .55, .02, .7); }
    else if(k === 'junco'){ L(.5, .98, .5, .2); g.beginPath(); g.moveTo(x + s * .5, y + s * .2); g.quadraticCurveTo(x + s * .9, y + s * .1, x + s * .7, y + s * .5); g.fill(); }
    else if(k === 'escaravelho'){ g.beginPath(); g.ellipse(x + m, y + s * .58, s * .24, s * .3, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(x + m, y + s * .2, s * .12, 0, Math.PI * 2); g.fill(); L(.26, .45, .06, .35); L(.74, .45, .94, .35); L(.26, .7, .06, .8); L(.74, .7, .94, .8); }
    else if(k === 'cobra'){ g.beginPath(); g.moveTo(x + s * .1, y + s * .9); g.bezierCurveTo(x + s * .9, y + s * .9, x + s * .1, y + s * .3, x + s * .8, y + s * .15); g.stroke(); }
    else { g.beginPath(); g.arc(x + m, y + s * .9, s * .4, Math.PI, 0); g.fill(); }
  }
  const HIEROS = ['ankh', 'olho', 'agua', 'sol', 'pena', 'passaro', 'junco', 'escaravelho', 'cobra', 'pao'];
  const COR_HIERO = [PRETO, AZUL_EG, SOL, PRETO, '#8A5A1E'];
  /* uma coluna de hieróglifos entre as figuras */
  function hieroColuna(g, x, y, h, semente){ const s = h / 6.4; g.strokeStyle = SOL; g.lineWidth = 1; g.strokeRect(x - s * .6, y, s * 1.2, h); for(let i = 0; i < 6; i++) hiero(g, HIEROS[(semente * 7 + i * 3) % HIEROS.length], x - s * .45, y + i * s * 1.05 + s * .1, s * .9, COR_HIERO[(semente + i) % COR_HIERO.length]); }
  /* uma figura de perfil, olhando pra direita (o Oriente), pés em (x, yb), altura H */
  function egFig(g, x, yb, H, tipo){
    const u = H / 10, escuro = tipo === 'osiris', P = escuro ? '#1C1C20' : PELE;
    const R = (x0, y0, w, h, c) => { g.fillStyle = c; g.fillRect(x + x0 * u, yb - (y0 + h) * u, w * u, h * u); };
    const poli = (pts, c) => { g.beginPath(); pts.forEach(([a, b], i) => (i ? g.lineTo : g.moveTo).call(g, x + a * u, yb - b * u)); g.closePath(); g.fillStyle = c; g.fill(); };
    if(tipo === 'osiris'){
      /* o rei morto: o corpo enfaixado de branco, a coroa atef com as plumas, o cajado e o mangual cruzados */
      poli([[-.9, 0], [1, 0], [1.1, 7], [-.9, 7]], LINHO); R(-.6, 7, 1.3, 1.3, P); R(.55, 7.3, .2, .5, P);
      poli([[-.5, 8.3], [.6, 8.3], [.35, 10.2], [-.25, 10.2]], LINHO); R(-.75, 8.3, .25, 1.6, SOL); R(.6, 8.3, .25, 1.6, SOL);
      [[OURO, 6.9], [AZUL_EG, 6.65], [SOL, 6.4]].forEach(([c, y]) => R(-.9, y, 2, .25, c));
      g.strokeStyle = OURO; g.lineWidth = u * .28; g.beginPath(); g.moveTo(x + .2 * u, yb - 5.4 * u); g.lineTo(x + 1.4 * u, yb - 7.6 * u); g.stroke(); g.beginPath(); g.arc(x + 1.2 * u, yb - 7.9 * u, .35 * u, Math.PI, Math.PI * 2.2); g.stroke();
      g.strokeStyle = AZUL_EG; g.beginPath(); g.moveTo(x + 1 * u, yb - 5.4 * u); g.lineTo(x - .2 * u, yb - 7.4 * u); g.stroke();
      return;
    }
    /* as pernas (a da frente adiantada, o passo) e os pés */
    R(-.55, 0, .5, 3.8, P); R(.55, 0, .5, 3.8, P); R(-.75, 0, .85, .25, P); R(.5, 0, 1, .25, P);
    if(tipo === 'isis'){ poli([[-1, 0], [1.4, 0], [.95, 7], [-.75, 7]], LINHO); R(-.75, 0, .7, .25, P); R(.65, 0, .8, .25, P); }
    else { poli([[-.9, 3.6], [1.45, 3.6], [.85, 5.4], [-.75, 5.4]], LINHO); R(-.75, 5.2, 1.6, .3, OURO); }
    /* o tronco, o braço de trás e o da frente estendido */
    R(-.75, 5.4, 1.55, 2, P); R(-1, 5.6, .4, 1.6, P); R(.6, 6.55, 1.9, .38, P);
    /* o colar largo */
    [[OURO, 7], [AZUL_EG, 6.75], [SOL, 6.5]].forEach(([c, y]) => R(-.75, y, 1.6, .25, c));
    if(tipo === 'isis'){
      /* as asas abertas pra frente, de pena em pena */
      poli([[.5, 7.1], [4.6, 7.6], [4.4, 5.2], [.5, 5.7]], OURO);
      [[AZUL_EG, .5], [SOL, 1.4], [AZUL_EG, 2.3], [SOL, 3.2]].forEach(([c, a]) => poli([[.5 + a, 7.1 + a * .12], [1.2 + a, 7.2 + a * .1], [1.2 + a, 5.6 + a * .1], [.5 + a, 5.7 + a * .1]], c));
    }
    /* a cabeça de cada um */
    if(tipo === 'farao'){ R(-.85, 6.6, .8, 2.3, AZUL_EG); [6.9, 7.4, 7.9, 8.4].forEach(y => R(-.85, y, .8, .12, OURO)); R(-.4, 7.35, 1, 1.35, P); R(-.55, 8.6, 1.25, .45, AZUL_EG); R(.5, 8.85, .14, .35, OURO); R(.42, 6.9, .16, .5, AZUL_EG); }
    else if(tipo === 'sacerdote'){ R(-.4, 7.35, 1, 1.45, P); }
    else if(tipo === 'horus'){ R(-.85, 6.6, .75, 2, AZUL_EG); R(-.45, 7.35, 1, 1.45, '#3A2A1E'); poli([[.55, 8.5], [.95, 8.25], [.55, 7.95]], OURO); R(-.3, 7.6, .55, .12, AMARELO); g.beginPath(); g.arc(x + .05 * u, yb - 9.5 * u, .7 * u, 0, Math.PI * 2); g.fillStyle = SOL; g.fill(); }
    else if(tipo === 'anubis'){ R(-.85, 6.6, .75, 2, AZUL_EG); R(-.4, 7.35, .95, 1.15, '#1A1A1E'); R(.5, 7.55, .85, .45, '#1A1A1E'); R(-.35, 8.4, .28, 1, '#1A1A1E'); R(.02, 8.4, .28, 1, '#1A1A1E'); R(.2, 8.05, .16, .1, OURO); }
    else if(tipo === 'thoth'){ R(-.85, 6.6, .75, 2, AZUL_EG); R(-.4, 7.4, .9, 1.1, '#1E1E22'); g.strokeStyle = '#1E1E22'; g.lineWidth = u * .2; g.beginPath(); g.moveTo(x + .45 * u, yb - 8.1 * u); g.quadraticCurveTo(x + 1.6 * u, yb - 8 * u, x + 1.9 * u, yb - 6.9 * u); g.stroke(); R(.05, 8.05, .14, .1, PAPEL); }
    else if(tipo === 'isis'){ R(-.9, 6.4, .8, 2.3, PRETO); R(-.35, 7.35, .9, 1.3, P); R(-.2, 8.65, .65, .3, OURO); R(-.05, 8.95, .35, .35, OURO); }
    if(tipo !== 'anubis' && tipo !== 'horus') R(.15, 8.05, .16, .1, PRETO);
    /* o que leva na mão: o ankh (gente), o cetro (deuses) ou a paleta (Toth) */
    const hx = x + 2.4 * u, hy = yb - 6.75 * u;
    g.strokeStyle = OURO; g.lineWidth = u * .22;
    if(tipo === 'horus' || tipo === 'anubis'){ g.beginPath(); g.moveTo(hx, yb); g.lineTo(hx, hy - 2.4 * u); g.lineTo(hx + .5 * u, hy - 2.7 * u); g.stroke(); g.beginPath(); g.moveTo(hx - .25 * u, yb); g.lineTo(hx, yb - .5 * u); g.lineTo(hx + .25 * u, yb); g.stroke(); }
    else if(tipo === 'thoth'){ R(2.2, 6.4, .5, 1.6, PAPEL); R(2.3, 7.6, .3, .15, PRETO); }
    else if(tipo !== 'isis'){ g.beginPath(); g.ellipse(hx, hy - .9 * u, .3 * u, .4 * u, 0, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(hx, hy - .5 * u); g.lineTo(hx, hy + 1.2 * u); g.moveTo(hx - .45 * u, hy - .3 * u); g.lineTo(hx + .45 * u, hy - .3 * u); g.stroke(); }
  }
  /* o friso de lótus: flor aberta e botão, um depois do outro, no azul */
  function lotus(g, y0, w, h){
    g.fillStyle = AZUL_EG; g.fillRect(0, y0, w, h); g.fillStyle = OURO; g.fillRect(0, y0, w, h * .07);
    const n = Math.round(w / (h * .9));
    for(let i = 0; i < n; i++){ const cx = (i + .5) * w / n, b = y0 + h * .95, top = y0 + h * .2;
      g.fillStyle = OURO; g.fillRect(cx - h * .03, top + h * .4, h * .06, b - top - h * .4);
      if(i % 2){ g.beginPath(); g.ellipse(cx, top + h * .35, h * .14, h * .26, 0, 0, Math.PI * 2); g.fillStyle = SOL; g.fill(); }
      else { [[-.28, PAPEL], [.28, PAPEL], [0, SOL]].forEach(([dx, c]) => { g.beginPath(); g.moveTo(cx, top + h * .55); g.lineTo(cx + dx * h - h * .1, top); g.lineTo(cx + dx * h + h * .1, top); g.closePath(); g.fillStyle = c; g.fill(); }); }
    }
  }
  /* o mural do templo: a abóbada estrelada, os dentes de serra, a procissão rumo ao Oriente e o lótus */
  function muralEgito(g, w, h){
    g.fillStyle = CREME; g.fillRect(0, 0, w, h);
    const t0 = h * .15; g.fillStyle = FRISO; g.fillRect(0, 0, w, t0);
    for(let i = 0; i < 34; i++) estrela5(g, (i + .5) / 34 * w, t0 * (i % 2 ? .34 : .66), t0 * .17, OURO);
    g.fillStyle = OURO; g.fillRect(0, t0, w, h * .015);
    const sz = h * .05, sy = t0 + h * .015; g.fillStyle = PAPEL; g.fillRect(0, sy, w, sz); g.fillStyle = PRETO;
    for(let x = 0; x < w; x += sz){ g.beginPath(); g.moveTo(x, sy); g.lineTo(x + sz, sy); g.lineTo(x + sz / 2, sy + sz); g.closePath(); g.fill(); }
    const yb = h * .84, H = h * .53;
    ['sacerdote', 'farao', 'anubis', 'isis', 'thoth', 'horus', 'sacerdote'].forEach((t, i) => { const x = w * (.09 + i * .133); hieroColuna(g, x - w * .05, h * .27, h * .5, i); egFig(g, x, yb, H, t); });
    g.fillStyle = OURO; g.fillRect(0, yb + h * .01, w, h * .015);
    lotus(g, h * .865, w, h * .135);
  }
  /* o painel de hieróglifos do quarto, com o cartucho no meio */
  function hieroglifos(g, w, h){
    g.fillStyle = CREME; g.fillRect(0, 0, w, h); g.fillStyle = SOL; g.fillRect(0, 0, w, h * .04); g.fillRect(0, h * .96, w, h * .04);
    const s = h * .26;
    for(let r = 0; r < 3; r++) for(let i = 0; i < Math.floor(w / s); i++){ const x = i * s + s * .08; if(x > w * .38 && x < w * .6) continue; hiero(g, HIEROS[(i * 3 + r * 5) % HIEROS.length], x, h * .07 + r * s * 1.12, s * .82, COR_HIERO[(i + r) % COR_HIERO.length]); }
    /* o cartucho: a corda de ouro em volta, os sinais dentro */
    const cx0 = w * .4, cw = w * .2; g.strokeStyle = OURO; g.lineWidth = h * .04; g.beginPath(); g.roundRect ? g.roundRect(cx0, h * .1, cw, h * .8, h * .3) : g.rect(cx0, h * .1, cw, h * .8); g.stroke();
    g.fillStyle = OURO; g.fillRect(cx0 - h * .02, h * .86, cw + h * .04, h * .05);
    ['sol', 'ankh', 'escaravelho'].forEach((k, i) => hiero(g, k, cx0 + cw * .5 - h * .11, h * .16 + i * h * .23, h * .22, [SOL, PRETO, AZUL_EG][i]));
  }
  /* a câmara de reflexão: o V.I.T.R.I.O.L., o galo, a ampulheta e a frase */
  /* v3.82 · o quadro da sala do Umbral (no lugar do V.I.T.R.I.O.L., do mesmo jeito): UMBRAL em ouro, a frase, a porta
     com a luz do outro lado (o véu puxado de lado) e a vela */
  function umbral(g, w, h){
    const fundo = g.createLinearGradient(0, 0, 0, h); fundo.addColorStop(0, '#120F22'); fundo.addColorStop(1, '#241C3E'); g.fillStyle = fundo; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#C9A24E'; g.lineWidth = 3; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = '#E8C66A'; g.textAlign = 'center'; g.textBaseline = 'middle';
    let t = Math.round(h * .26); g.font = `700 ${t}px Georgia, serif`; while(t > 8 && g.measureText('U M B R A L').width > w * .8){ t--; g.font = `700 ${t}px Georgia, serif`; }
    g.fillText('U M B R A L', w / 2, h * .25);
    g.font = `italic ${Math.round(h * .075)}px Georgia, serif`; g.fillStyle = '#B8AED0'; g.fillText('Da sombra pra luz: atravesse em silêncio', w / 2, h * .47);
    const px = w * .2, py = h * .6, pw = h * .2, ph = h * .3;
    const luz = g.createRadialGradient(px, py + ph * .5, 2, px, py + ph * .5, ph * .8); luz.addColorStop(0, '#FFF4C8'); luz.addColorStop(1, '#C9A24E'); g.fillStyle = luz; g.fillRect(px - pw / 2, py, pw, ph);
    g.fillStyle = '#5A2A6E'; g.beginPath(); g.moveTo(px - pw / 2, py); g.lineTo(px + pw * .1, py); g.quadraticCurveTo(px - pw * .1, py + ph * .5, px - pw / 2 + 2, py + ph); g.lineTo(px - pw / 2, py + ph); g.closePath(); g.fill();
    g.fillStyle = '#8E7A4A'; g.fillRect(px - pw / 2 - 5, py - 6, pw + 10, 6); g.fillRect(px - pw / 2 - 5, py, 5, ph); g.fillRect(px + pw / 2, py, 5, ph);
    const vx = w * .8, vy = h * .9; g.fillStyle = '#EDE6D6'; g.fillRect(vx - h * .03, vy - h * .2, h * .06, h * .2); g.fillStyle = '#8E7A4A'; g.fillRect(vx - h * .07, vy, h * .14, h * .03);
    const ch = g.createRadialGradient(vx, vy - h * .25, 1, vx, vy - h * .25, h * .12); ch.addColorStop(0, 'rgba(255,230,150,.95)'); ch.addColorStop(1, 'rgba(255,200,90,0)'); g.fillStyle = ch; g.beginPath(); g.arc(vx, vy - h * .25, h * .12, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#FFE08A'; g.beginPath(); g.ellipse(vx, vy - h * .25, h * .02, h * .045, 0, 0, Math.PI * 2); g.fill();
  }
  /* v3.82 · o painel do gabinete (era o painel da loja, maçom): no azul da noite, o triângulo de ouro com a ponta pra
     baixo, a cruz com a rosa no meio e o sol alado em cima */
  function painelRosa(g, w, h){
    const ceu = g.createLinearGradient(0, 0, 0, h); ceu.addColorStop(0, '#0E1636'); ceu.addColorStop(1, '#22408E'); g.fillStyle = ceu; g.fillRect(0, 0, w, h);
    for(let i = 0; i < 26; i++){ const x = ((i * 97) % 100) / 100 * w, y = ((i * 53) % 100) / 100 * h; g.fillStyle = '#FFF6D8'; g.fillRect(x, y, 2, 2); }
    const cx = w / 2, cy = h * .58, r = h * .36, ry = cy - r * .2 + h * .03;
    g.strokeStyle = '#F2C230'; g.lineWidth = 4; g.beginPath(); g.moveTo(cx - r * 1.1, cy - r * .62); g.lineTo(cx + r * 1.1, cy - r * .62); g.lineTo(cx, cy + r * .95); g.closePath(); g.stroke();
    g.fillStyle = '#F2C230'; g.fillRect(cx - h * .03, cy - r * .55, h * .06, r * 1.2); g.fillRect(cx - r * .45, cy - r * .2, r * .9, h * .06);
    for(let i = 0; i < 7; i++){ const a = i / 7 * Math.PI * 2; g.fillStyle = SOL; g.beginPath(); g.arc(cx + Math.cos(a) * h * .045, ry + Math.sin(a) * h * .045, h * .04, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#7A0F1E'; g.beginPath(); g.arc(cx, ry, h * .03, 0, Math.PI * 2); g.fill();
    const sy = h * .12; g.fillStyle = SOL; g.beginPath(); g.arc(cx, sy, h * .05, 0, Math.PI * 2); g.fill();
    [['#F2C230', 0, .34], [AZUL_EG, .03, .28], ['#F2C230', .06, .22]].forEach(([c, dy, L]) => { g.fillStyle = c; g.fillRect(cx - h * .06 - w * L, sy - h * .02 + dy * h, w * L, h * .025); g.fillRect(cx + h * .06, sy - h * .02 + dy * h, w * L, h * .025); });
  }
  /* o papiro da pesagem do coração: o morto levado por Anúbis, a balança (o coração contra a pena), Toth anotando e
     Osíris no trono. Em cima, a fileira de hieróglifos entre as linhas */
  function livroMortos(g, w, h){
    g.fillStyle = KT.papiro; g.fillRect(0, 0, w, h);
    for(let i = 0; i < 160; i++){ g.fillStyle = 'rgba(120,90,40,.08)'; g.fillRect(((i * 37) % 100) / 100 * w, 0, 1, h); }
    g.fillStyle = SOL; g.fillRect(0, h * .04, w, h * .02); g.fillStyle = PRETO; g.fillRect(0, h * .22, w, h * .015); g.fillStyle = SOL; g.fillRect(0, h * .92, w, h * .025);
    const s = h * .14; for(let i = 0; i < Math.floor(w / (s * 1.1)); i++) hiero(g, HIEROS[(i * 7) % HIEROS.length], i * s * 1.1 + s * .1, h * .07, s * .85, COR_HIERO[i % COR_HIERO.length]);
    const yb = h * .9, H = h * .62;
    egFig(g, w * .08, yb, H, 'sacerdote'); egFig(g, w * .2, yb, H, 'anubis');
    /* a balança: o poste, o travessão, os pratos, o coração e a pena */
    const bx = w * .42, top = yb - H * .85; g.fillStyle = PRETO; g.fillRect(bx - 2, top, 4, yb - top); g.fillRect(bx - w * .06, top, w * .12, 3);
    [[-1, 'coracao'], [1, 'pena']].forEach(([sd, k]) => { const px = bx + sd * w * .055; g.strokeStyle = PRETO; g.lineWidth = 1.5; g.beginPath(); g.moveTo(px, top); g.lineTo(px - w * .02, top + H * .35); g.moveTo(px, top); g.lineTo(px + w * .02, top + H * .35); g.stroke(); g.fillStyle = OURO; g.fillRect(px - w * .025, top + H * .35, w * .05, 3);
      if(k === 'coracao'){ g.fillStyle = SOL; g.beginPath(); g.ellipse(px, top + H * .3, w * .012, H * .06, 0, 0, Math.PI * 2); g.fill(); } else hiero(g, 'pena', px - H * .06, top + H * .2, H * .14, PAPEL); });
    egFig(g, w * .6, yb, H, 'thoth');
    /* Osíris no trono, com o degrau */
    g.fillStyle = OURO; g.fillRect(w * .78, yb - H * .45, w * .07, H * .45); g.fillStyle = AZUL_EG; g.fillRect(w * .78, yb - H * .06, w * .12, H * .06);
    egFig(g, w * .86, yb, H * .95, 'osiris');
  }
  /* ---- as peças em 3D ---- */
  /* a coluna de papiro do Hórus, esticada pros 7 m do templo */
  const papiroAlto = s => colunaEg().map(b => Object.assign({}, b, { y: b.y * s, h: b.h * s }));
  /* a esfinge deitada, olhando pra frente (+z) */
  const esfinge = () => { const P = KT.pedra, E = KT.pedraE; return [B(0, 0, 0, 1, .3, 2.3, E), B(.1, .3, .2, .8, .55, 1.5, P), B(.12, .3, 1.6, .26, .22, .7, P), B(.62, .3, 1.6, .26, .22, .7, P),
    B(.22, .65, 1.4, .56, .5, .5, P), B(.18, 1.08, 1.45, .64, .62, .32, KT.lapis), ...[1.14, 1.32, 1.5].map(y => B(.17, y, 1.47, .66, .06, .3, KT.ouro)),
    B(.24, 1.1, 1.62, .52, .5, .44, P), B(.17, .78, 1.7, .14, .45, .2, KT.lapis), B(.69, .78, 1.7, .14, .45, .2, KT.lapis),
    B(.33, 1.32, 2.06, .1, .05, .01, PRETO), B(.57, 1.32, 2.06, .1, .05, .01, PRETO), B(.45, 1.2, 2.04, .1, .09, .04, E), B(.42, .95, 1.98, .16, .15, .08, KT.ouro), B(.4, .4, -.05, .1, .1, .3, P)]; };
  const obelisco = () => [B(0, 0, 0, .8, .3, .8, PRETO), B(.1, .3, .1, .6, 1.4, .6, KT.pedra), B(.13, 1.7, .13, .54, 1.3, .54, KT.pedra), B(.16, 3, .16, .48, .9, .48, KT.pedra),
    B(.2, 3.9, .2, .4, .18, .4, KT.ouro), B(.26, 4.08, .26, .28, .14, .28, KT.ouro), B(.32, 4.22, .32, .16, .12, .16, KT.ouroC),
    ...[.55, .95, 1.35].map((y, i) => B(.36, y, .09, .08, .2, .02, i % 2 ? KT.lapis : PRETO)), ...[.55, .95, 1.35].map((y, i) => B(.09, y, .36, .02, .2, .08, i % 2 ? PRETO : KT.lapis))];
  const braseiro = () => [B(0, 0, 0, .1, 1, .1, KT.bronzeE), B(.5, 0, 0, .1, 1, .1, KT.bronzeE), B(.25, 0, .45, .1, 1, .1, KT.bronzeE), B(-.05, 1, -.05, .7, .22, .65, KT.bronze), luzB(B(.1, 1.2, .08, .4, .25, .4, LARANJA)), luzB(B(.2, 1.42, .18, .2, .25, .2, '#FFE45E'))];
  /* banco do templo, com o encosto do lado da parede (x0 = encosto à esquerda). v3.82: dourado, como os do Hórus (eram azuis, de loja) */
  const bancoLoja = (L, encEsq) => [B(0, 0, 0, .7, .42, L, BANCO_P), B(0, .42, 0, .7, .08, L, BANCO), B(encEsq ? 0 : .56, .42, 0, .14, .78, L, BANCO2), B(encEsq ? 0 : .56, 1.2, 0, .14, .05, L, BANCO_P)];
  /* v3.82 · a rosa-cruz e o sol alado de frente pro templo (+z), em cima do Oriente */
  const rosaCruzZ = (cx, cy, z) => [B(cx - .14, cy - 1.25, z, .28, 2.4, .06, OURO), B(cx - 1, cy - .14, z, 2, .28, .06, OURO), ...[[cx, cy + 1.15], [cx, cy - 1.25], [cx - 1, cy], [cx + 1, cy]].map(([x, y]) => esferaB(x - .1, y - .1, z, .2, KT.ouroC)),
    esferaB(cx - .25, cy - .25, z + .02, .5, SOL), ...Array.from({ length: 7 }, (_, i) => { const a = i / 7 * Math.PI * 2; return esferaB(cx + Math.cos(a) * .28 - .1, cy + Math.sin(a) * .28 - .1, z + .12, .2, VINHO); }), esferaB(cx - .07, cy - .07, z + .32, .14, '#7A0F1E')];
  const solAladoZ = (cx, cy, z) => [esferaB(cx - .25, cy - .25, z, .5, SOL), ...[[.3, 1.9, OURO], [.15, 1.6, KT.lapis], [0, 1.3, OURO], [-.14, 1, SOL]].flatMap(([dy, L, c]) => [B(cx - .25 - L, cy + dy - .06, z, L, .13, .05, c), B(cx + .25, cy + dy - .06, z, L, .13, .05, c)]),
    B(cx - .32, cy - .38, z + .02, .1, .14, .06, OURO), B(cx + .22, cy - .38, z + .02, .1, .14, .06, OURO)];
  /* a Shekinah: o altar triangular do meio do templo, a ponta pro Oriente (-z), uma vela acesa em cada canto */
  function shekinah(){
    const out = [], T = [[0, -.72], [-.82, .5], [.82, .5]];
    T.forEach(([x, z]) => out.push(B(x - .06, 0, z - .06, .12, .8, .12, OURO)));
    for(let i = 0; i < 6; i++){ const z = -.72 + i * 1.22 / 6, w = 1.64 * (i + .5) / 6; out.push(B(-w / 2, .8, z, w, .07, 1.22 / 6, MARMORE)); }
    out.push(traco(T[0][0], T[0][1], T[1][0], T[1][1], .87, OURO), traco(T[0][0], T[0][1], T[2][0], T[2][1], .87, OURO), traco(T[1][0], T[1][1], T[2][0], T[2][1], .87, OURO));
    T.forEach(([x, z]) => { const cx = x * .78, cz = z * .78 + (z < 0 ? .04 : -.06); out.push(B(cx - .07, .87, cz - .07, .14, .04, .14, OURO), B(cx - .04, .91, cz - .04, .08, .3, .08, LINHO), luzB(B(cx - .025, 1.21, cz - .025, .05, .08, .05, AMARELO)), luzB(B(cx - .012, 1.29, cz - .012, .024, .05, .024, LARANJA))); });
    return out;
  }
  /* o castiçal alto (de pé em y: no Oriente, em cima do último degrau) */
  const candelabro = y => [B(-.12, y, -.12, .24, .06, .24, OURO), B(-.03, y + .06, -.03, .06, 1.1, .06, OURO), B(-.1, y + 1.16, -.1, .2, .05, .2, OURO), B(-.05, y + 1.21, -.05, .1, .3, .1, LINHO), luzB(B(-.03, y + 1.51, -.03, .06, .1, .06, AMARELO))];
  /* o guardião do Umbral: o chacal de Anúbis sentado no pedestal, olhando pra porta (-z) */
  const guardiao = () => { const N = '#141418'; return [B(0, 0, 0, .6, .7, .7, PRETO), B(-.02, .7, -.02, .64, .04, .74, OURO), B(.12, .74, .18, .36, .55, .42, N), B(.14, .74, .02, .1, .45, .14, N), B(.36, .74, .02, .1, .45, .14, N),
    B(.17, 1.25, .1, .26, .3, .3, N), B(.18, 1.5, .02, .24, .2, .3, N), B(.24, 1.52, -.12, .12, .1, .16, N), B(.18, 1.7, .14, .07, .22, .07, N), B(.35, 1.7, .14, .07, .22, .07, N),
    B(.16, 1.32, .08, .28, .06, .02, OURO), B(.21, 1.6, .01, .05, .03, .01, OURO), B(.34, 1.6, .01, .05, .03, .01, OURO)]; };
  /* a bacia d'água da purificação, no pé de mármore */
  const bacia = () => [B(.1, 0, .1, .4, .7, .4, MARMORE), B(0, .7, 0, .6, .1, .6, MARMORE), B(.05, .8, .05, .5, .06, .5, MARMORE), B(.08, .84, .08, .44, .02, .44, '#3C6FD6')];
  /* o véu da porta do Umbral (roxo, preso de lado com a faixa de ouro), encostado na parede de z */
  const veu = L => [B(0, 0, 0, L, 3, .06, '#3A1F5C'), ...Array.from({ length: Math.max(1, Math.round(L / .14)) }, (_, i) => B(i * .14, 0, .06, .05, 3, .02, '#2A1446')), B(0, 1.2, -.02, L, .08, .1, OURO)];
  /* a rosa-cruz e o sol alado: na parede da biblioteca, de frente pro templo (-x) */
  const rosaCruz = (x, cy, cz) => [B(x, cy - 1.25, cz - .14, .06, 2.4, .28, OURO), B(x, cy - .14, cz - 1, .06, .28, 2, OURO), ...[[cy + 1.15, cz], [cy - 1.25, cz], [cy, cz - 1], [cy, cz + 1]].map(([y, z]) => esferaB(x - .1, y - .1, z - .1, .2, KT.ouroC)),
    esferaB(x - .3, cy - .25, cz - .25, .5, SOL), ...Array.from({ length: 7 }, (_, i) => { const a = i / 7 * Math.PI * 2; return esferaB(x - .2, cy + Math.sin(a) * .28 - .1, cz + Math.cos(a) * .28 - .1, .2, VINHO); }), esferaB(x - .38, cy - .07, cz - .07, .14, '#7A0F1E')];
  const solAlado = (x, cy, cz) => [esferaB(x - .3, cy - .25, cz - .25, .5, SOL), ...[[.3, 1.9, OURO], [.15, 1.6, KT.lapis], [0, 1.3, OURO], [-.14, 1, SOL]].flatMap(([dy, L, c]) => [B(x, cy + dy - .06, cz - .25 - L, .05, .13, L, c), B(x, cy + dy - .06, cz + .25, .05, .13, L, c)]),
    B(x - .06, cy - .38, cz - .32, .06, .14, .1, OURO), B(x - .06, cy - .38, cz + .22, .06, .14, .1, OURO)];
  /* o sarcófago deitado: a caixa preta, a tampa de ouro com o rosto, o nemes listrado e os braços cruzados */
  const sarcofago = () => [B(0, 0, 0, 1.3, .45, 2.7, PRETO), B(.15, .45, .15, 1, .4, 2.4, OURO), B(.2, .85, .3, .9, .1, 2.15, OURO), B(.22, .85, .18, .86, .32, .62, KT.lapis),
    ...[.28, .42, .56, .7].map(z => B(.21, .85, z, .88, .33, .05, OURO)), B(.4, .95, .3, .5, .3, .35, OURO), B(.48, 1.25, .38, .1, .01, .06, PRETO), B(.72, 1.25, .38, .1, .01, .06, PRETO), B(.56, 1.0, .65, .18, .2, .12, KT.lapis),
    traco(.35, 1.1, .95, 1.5, .96, KT.lapis), traco(.95, 1.1, .35, 1.5, .965, SOL), B(.25, .95, 1.6, .8, .03, .9, KT.lapis), ...[1.75, 2.05].map(z => B(.25, .97, z, .8, .02, .05, OURO))];
  /* a esfera armilar: o pé, a terra no meio e os anéis de bronze */
  function armilar(){ const cy = 1.35, r = .45, out = [B(-.2, 0, -.2, .4, .08, .4, KT.bronzeE), B(-.03, .08, -.03, .06, .85, .06, KT.bronze), esferaB(-.12, cy - .12, -.12, .24, '#3C6FD6')];
    for(let i = 0; i < 10; i++){ const a0 = i / 10 * Math.PI * 2, a1 = (i + 1) / 10 * Math.PI * 2; out.push(traco(Math.cos(a0) * r, Math.sin(a0) * r, Math.cos(a1) * r, Math.sin(a1) * r, cy, KT.ouro)); const am = (a0 + a1) / 2, L = 2 * r * Math.sin(Math.PI / 10); out.push(Object.assign(B(Math.cos(am) * r - L / 2, cy + Math.sin(am) * r - .02, -.02, L, .04, .04, KT.bronzeC), { roll: am + Math.PI / 2 })); }
    return out; }
  /* a gata de Bastet no pedestal, com o brinco de ouro */
  const bastet = () => [B(0, 0, 0, .5, .55, .5, PRETO), B(-.02, .55, -.02, .54, .04, .54, OURO), B(.15, .59, .1, .2, .38, .3, '#1A1A1E'), B(.13, .95, .14, .24, .2, .2, '#1A1A1E'), B(.14, 1.15, .16, .06, .1, .06, '#1A1A1E'), B(.3, 1.15, .16, .06, .1, .06, '#1A1A1E'),
    B(.12, .9, .12, .26, .04, .24, OURO), B(.33, 1.05, .14, .03, .05, .03, OURO), B(.2, 1.02, .34, .04, .03, .01, OURO), B(.3, 1.02, .34, .04, .03, .01, OURO), B(.2, .59, .38, .1, .08, .12, '#1A1A1E')];
  /* a estante encostada numa parede de x (os livros de frente pra +x) */
  const estanteX = L => { const n = Math.floor(L / .18), out = [B(0, 0, 0, .45, 2.8, L, KT.mad)];
    [.1, 1, 1.9].forEach((y, r) => { out.push(B(0, y - .04, 0, .5, .04, L, KT.madC)); for(let i = 0; i < n; i++) out.push(B(.45, y, .05 + i * .18, .05, .6 + ((i + r) % 3) * .08, .14, [SOL, KT.lapis, LINHO, OURO, PRETO, VINHO, '#C8743A'][(i * 3 + r) % 7])); });
    return out; };
  /* o Anúbis deitado no baú, como o da tumba de Tutancâmon (olhando pra +x) */
  const anubisBau = () => [B(0, 0, 0, 1.6, .7, .7, OURO), ...[.2, .45].map(y => B(-.01, y, -.01, 1.62, .06, .72, KT.lapis)), B(.15, .7, .15, 1, .3, .4, '#141418'), B(1.05, .7, .17, .45, .12, .12, '#141418'), B(1.05, .7, .41, .45, .12, .12, '#141418'),
    B(1.0, .95, .16, .3, .3, .38, '#141418'), B(1.28, .98, .25, .22, .13, .2, '#141418'), B(1.03, 1.24, .19, .08, .2, .08, '#141418'), B(1.03, 1.24, .41, .08, .2, .08, '#141418'), B(.95, .95, .14, .07, .22, .42, OURO), B(1.2, 1.1, .15, .06, .04, .01, OURO), B(1.2, 1.1, .54, .06, .04, .01, OURO), B(0, .7, .25, .2, .08, .2, '#141418')];
  /* a cama do faraó: os pés de leão, a tampa de ouro, o lençol de linho, a manta azul e o pé da cama */
  const camaEg = () => [...[[0, 0], [2.65, 0], [0, 2.3], [2.65, 2.3]].flatMap(([x, z]) => [B(x, 0, z, .15, .35, .15, OURO), B(x - .02, 0, z + .1, .19, .06, .12, OURO)]),
    B(0, .35, 0, 2.8, .1, 2.45, OURO), B(.1, .45, .1, 2.6, .2, 2.25, LINHO), B(.1, .65, .9, 2.6, .05, 1.45, KT.lapis), B(.1, .7, 1.3, 2.6, .005, .12, OURO),
    B(.4, .65, .2, .7, .18, .4, LINHO), B(1.7, .65, .2, .7, .18, .4, LINHO), B(0, .45, 2.35, 2.8, .45, .1, OURO), ...[.4, 1.2, 2].map(x => B(x, .55, 2.45, .4, .25, .01, KT.lapis))];
  const dossel = () => [...[[-.1, -.1], [2.85, -.1], [-.1, 2.5], [2.85, 2.5]].map(([x, z]) => B(x, 0, z, .08, 2.7, .08, OURO)), B(-.1, 2.7, -.1, 3.03, .08, .08, OURO), B(-.1, 2.7, 2.5, 3.03, .08, .08, OURO), B(-.1, 2.7, -.1, .08, .08, 2.68, OURO), B(2.85, 2.7, -.1, .08, .08, 2.68, OURO),
    B(-.08, 2.3, -.08, 3, .4, .02, LINHO), B(-.08, 2.3, 2.5, 3, .4, .02, LINHO), B(-.08, 2.3, -.08, .02, .4, 2.6, LINHO), B(2.9, 2.3, -.08, .02, .4, 2.6, LINHO)];
  /* o ankh de neon rosa do estúdio, na parede do fundo */
  const ankhNeon = (x, y, z, c) => [luzB(B(x + .3, y + 1.06, z, .4, .06, .03, c)), luzB(B(x + .22, y + .7, z, .06, .4, .03, c)), luzB(B(x + .72, y + .7, z, .06, .4, .03, c)), luzB(B(x + .3, y + .66, z, .4, .06, .03, c)), luzB(B(x + .47, y, z, .06, .64, .03, c)), luzB(B(x + .15, y + .5, z, .7, .06, .03, c))];
  const PLANTA_TEMPLO = {
    k: 'templo', W: 30, D: 24, ALT: 7,
    comodos: [
      { k: 'templo', nome: 'O templo', x0: 0, z0: 8, x1: 22, z1: 24, piso: TERRA, linha: 'rgba(25,8,3,.32)' },
      { k: 'umbral', nome: 'Sala do Umbral', x0: 22, z0: 19, x1: 27, z1: 24, piso: '#16141F', linha: 'rgba(200,180,255,.05)' },
      { k: 'biblioteca', nome: 'Biblioteca hermética', x0: 22, z0: 8, x1: 30, z1: 24, piso: '#5A3A28', linha: 'rgba(30,15,5,.22)' },
      { k: 'quarto', nome: 'Quarto do faraó', x0: 0, z0: 0, x1: 9, z1: 8, piso: '#C9A86A', linha: 'rgba(60,30,10,.16)' },
      { k: 'estudio', nome: 'Estúdio', x0: 9, z0: 0, x1: 19, z1: 8, piso: '#2B2F38', linha: 'rgba(255,255,255,.07)' },
      { k: 'closet', nome: 'Closet', x0: 19, z0: 0, x1: 30, z1: 8, piso: '#8A5A3A', linha: 'rgba(40,20,5,.2)' },
      { k: 'escritorio', nome: 'Gabinete (mezanino)', x0: 0, z0: 0, x1: 30, z1: 8, n: 1, piso: '#1E2A5A', linha: 'rgba(242,210,122,.12)' }
    ],
    paredes: [
      { a: [0, 24], b: [30, 24], ext: [0, 1], portas: [[10.2, 11.8]], altas: [[1, 8], [14, 21]], janelas: [[27.6, 29.4]], entrada: true, cor: CREME },
      { a: [30, 0], b: [30, 24], ext: [1, 0], janelas: [[20, 23]], cor: CREME },
      { a: [0, 0], b: [0, 24], ext: [-1, 0], janelas: [[2.5, 5.5]], cor: CREME },
      { a: [0, 0], b: [30, 0], ext: [0, -1], cor: CREME2 },
      { a: [0, 8], b: [30, 8], portas: [[1.4, 2.6], [17.6, 18.8], [24.2, 25.4]], alt: 3.4, cor: CREME2 },
      { a: [9, 0], b: [9, 8], alt: 3.4, cor: CREME2 }, { a: [19, 0], b: [19, 8], alt: 3.4, cor: CREME2 },
      { a: [22, 8], b: [22, 24], portas: [[6, 7.4]], alt: 3.4, cor: CREME2 },
      { a: [22, 19], b: [27, 19], portas: [[3.4, 4.6]], alt: 3.2, cor: '#1C1A2A' }, { a: [27, 19], b: [27, 24], alt: 3.2, cor: '#1C1A2A' }
    ],
    entrada: { x: 11, z: 24 }, tapete: { x: 10.3, z: 22.8, w: 1.4, d: 1 },
    mezanino: { x0: 0, z0: 0, x1: 30, z1: 8, y: 3.4, grade: [[0, 8, 28.4, 8]] },
    escada: { x0: 28.4, z0: 8, x1: 30, z1: 18, topo: 3.4 },
    estacoes: { studio: { x: 9.5, z: .4, y: 3.4 }, feed: { x: 3, z: .15, y: 3.4 }, ia: { x: 6, z: .5, y: 3.4 }, horus: { x: .15, z: 1, y: 3.4 }, mural: { x: .15, z: 4, y: 3.4 }, marcas: { x: 29.4, z: 1, y: 3.4 }, grana: { x: 29.2, z: 4.6, y: 3.4 }, vendas: { x: 16.8, z: 5.4, y: 3.4 }, nicho: { x: 1, z: 6.2, y: 3.4 }, estilo: { x: 3.4, z: 6.4, y: 3.4 }, manual: { x: 12.5, z: 1.6, y: 3.4 }, banca: { x: 14.6, z: .4, y: 3.4 }, rolo: { x: 19.2, z: .9, y: 3.4 }, agente: { x: 21.6, z: 1.3, y: 3.4 } },
    padrao: [],
    /* v3.82: o tablado de dentes de serra (o da AMORC, o mesmo do Hórus) e a passadeira vermelha da porta até o Oriente */
    chao: [ret(5.3, 11.9, 16.7, 20.1, PRETO), ret(5.42, 12.02, 16.58, 19.98, MARMORE), ...serra(5.42, 12.02, 16.58, 19.98, .42), ret(5.95, 12.55, 16.05, 19.45, '#1E1F25'),
      ret(10.45, 11.7, 11.55, 23.7, VINHO), ret(10.45, 11.7, 10.53, 23.7, OURO), ret(11.47, 11.7, 11.55, 23.7, OURO)],
    imgs: [
      { P4: faceP4('x', .17, 8.6, 23.4, 1.25, 6.65, 1), n: [1, 0, 0], img: () => calcImg('temploMural', 1184, 432, muralEgito), cor: CREME },
      { P4: faceP4('z', .17, 1, 8, 1.35, 3.15, 1), n: [0, 0, 1], img: () => calcImg('temploHiero', 560, 144, hieroglifos), cor: CREME },
      { P4: faceP4('z', 23.83, 22.4, 26.6, 1.3, 3.05, -1), n: [0, 0, -1], img: () => calcImg('temploUmbral', 336, 140, umbral), cor: '#120F22' },
      { P4: faceP4('z', .17, 8.6, 17.4, 4.75, 6.65, 1), n: [0, 0, 1], img: () => calcImg('temploPapiro', 704, 152, livroMortos), cor: KT.papiro },
      { P4: faceP4('z', .17, 23.8, 28.8, 4.6, 6.6, 1), n: [0, 0, 1], img: () => calcImg('temploRosa', 500, 200, painelRosa), cor: '#22408E' }
    ],
    decor: [
      /* ---- o templo ---- */
      /* o Oriente: três degraus de mármore, o tapete azul, a cadeira de ouro, o púlpito com o pano da rosa-cruz e os castiçais */
      { x: 5, z: 8.3, bl: [B(0, 0, 0, 12, .18, 3.4, MARMORE), B(1, .18, 0, 10, .18, 2.6, MARMORE), B(2, .36, 0, 8, .18, 1.8, MARMORE), B(2.1, .54, .05, 7.8, .005, 1.7, KT.lapis), B(0, .18, 3.38, 12, .005, .02, OURO), B(1, .36, 2.58, 10, .005, .02, OURO)] },
      { x: 10.3, z: 8.45, bl: [B(0, .54, 0, 1.4, .5, .9, KT.ouro), B(.1, 1.04, .1, 1.2, .1, .7, KT.lapis), B(0, .54, 0, 1.4, 2.1, .14, KT.ouro), B(.15, .94, .14, 1.1, 1.5, .02, KT.lapis), B(-.05, 1.04, 0, .16, .35, .9, KT.ouro), B(1.29, 1.04, 0, .16, .35, .9, KT.ouro), B(.5, 2.24, .14, .4, .3, .02, KT.ouroC), esferaB(-.06, 2.64, -.06, .2, KT.ouroC), esferaB(1.26, 2.64, -.06, .2, KT.ouroC)] },
      { x: 10.6, z: 9.55, bl: [B(0, .54, 0, .8, 1, .5, MARMORE), B(-.05, 1.54, -.05, .9, .07, .6, OURO), B(.15, .79, .5, .5, .6, .02, VINHO), B(.37, .9, .52, .06, .4, .01, OURO), B(.25, 1.04, .52, .3, .06, .01, OURO), B(.365, 1.03, .53, .07, .08, .01, ROSA)] },
      { x: 7.7, z: 9.4, bl: candelabro(.54) }, { x: 14.3, z: 9.4, bl: candelabro(.54) },
      /* em cima do Oriente: a rosa-cruz grande e o sol alado */
      { x: 0, z: 0, bl: [...rosaCruzZ(11, 5, 8.38), ...solAladoZ(11, 6.45, 8.38)] },
      /* as esfinges dos lados do Oriente e os braseiros */
      { x: 3, z: 8.6, bl: esfinge() }, { x: 19.6, z: 8.6, bl: esfinge() },
      { x: 4.2, z: 11, bl: braseiro() }, { x: 17.3, z: 11, bl: braseiro() },
      /* a Shekinah no meio do tablado; os postes de lótus nos cantos e o cordão vermelho em volta (aberto pra passadeira, na frente e no fundo) */
      { x: 11, z: 16, bl: shekinah() },
      { x: 0, z: 0, bl: [...poste(5.3, 11.9), ...poste(16.7, 11.9), ...poste(5.3, 20.1), ...poste(16.7, 20.1),
        ...[[7.2, 11.9], [9.1, 11.9], [10.2, 11.9], [11.8, 11.9], [12.9, 11.9], [14.8, 11.9], [7.2, 20.1], [9.1, 20.1], [10.2, 20.1], [11.8, 20.1], [12.9, 20.1], [14.8, 20.1], [5.3, 13.95], [5.3, 16], [5.3, 18.05], [16.7, 13.95], [16.7, 16], [16.7, 18.05]].flatMap(([x, z]) => pino(x, z)),
        cordaX(5.3, 10.2, 11.9), cordaX(11.8, 16.7, 11.9), cordaX(5.3, 10.2, 20.1), cordaX(11.8, 16.7, 20.1), cordaZ(11.9, 20.1, 5.3), cordaZ(11.9, 20.1, 16.7)] },
      /* as colunas de papiro e os bancos do Norte e do Sul */
      ...[12.6, 16.2, 19.8].flatMap(z => [{ x: 3.3, z, bl: papiroAlto(1.45) }, { x: 17.9, z, bl: papiroAlto(1.45) }]),
      { x: 1, z: 11.6, bl: bancoLoja(3.8, true) }, { x: 1, z: 16.4, bl: bancoLoja(4.2, true) },
      { x: 20.3, z: 11.2, bl: bancoLoja(2.4, false) }, { x: 20.3, z: 16, bl: bancoLoja(5, false) },
      /* os obeliscos dos cantos da frente */
      { x: .4, z: 22.6, bl: obelisco() }, { x: 20.8, z: 22.4, bl: obelisco() },
      /* na parede da biblioteca, de frente pro templo: a rosa-cruz e, em cima da porta, o sol alado */
      { x: 0, z: 0, parede: true, bl: [...rosaCruz(21.8, 1.95, 18.2), ...solAlado(21.8, 2.75, 14.7)] },
      /* ---- a biblioteca hermética ---- */
      { x: 22.16, z: 8.5, bl: estanteX(5.2) }, { x: 22.16, z: 15.7, bl: estanteX(3) },
      { x: 24.2, z: 9.6, bl: sarcofago() },
      { x: 27.2, z: 10.6, bl: armilar() },
      { x: 23.3, z: 16.3, bl: [B(0, .75, 0, 1.9, .06, .8, KT.madC), ...[[.08, .08], [1.72, .08], [.08, .62], [1.72, .62]].map(([x, z]) => B(x, 0, z, .1, .75, .1, KT.mad)), esferaB(.2, .81, .2, .28, SOL), B(.3, 1.08, .3, .06, .2, .06, '#C8CDD4'), esferaB(.6, .81, .4, .22, KT.lapis), B(.68, 1.02, .48, .05, .16, .05, '#C8CDD4'), esferaB(.95, .81, .2, .2, LILAS),
        B(1.25, .81, .2, .4, .06, .3, KT.lapis), B(1.27, .87, .22, .36, .04, .26, LINHO), B(1.6, .81, .5, .1, .3, .1, LINHO), luzB(B(1.62, 1.11, .52, .06, .08, .06, AMARELO)), B(1.15, .81, .55, .14, .04, .14, KT.ouro), B(1.17, .85, .57, .1, .14, .1, '#E8F2FF'), B(1.15, .99, .55, .14, .04, .14, KT.ouro)] },
      { x: 26.3, z: 13.4, bl: [B(.15, 0, .15, .4, .06, .4, KT.mad), B(.3, .06, .3, .1, 1, .1, KT.mad), Object.assign(B(0, 1.06, .1, .7, .06, .5, KT.madC), { pitch: -.3 }), Object.assign(B(.05, 1.12, .12, .6, .06, .44, LINHO), { pitch: -.3 })] },
      { x: 27.6, z: 22.9, bl: bastet() },
      { x: 23.2, z: 12.9, piso: true, bl: [B(0, 0, 0, 4, .02, 2.6, '#7A1C22'), B(.2, .02, .2, 3.6, .004, 2.2, '#8E2A2E')] },
      /* ---- v3.82 · a sala do Umbral: o véu dos lados da porta, a bacia d'água, a vela no meio, os dois guardiões de Anúbis
         olhando pra porta e o banco de meditação embaixo do quadro ---- */
      { x: 24.55, z: 19.17, bl: veu(.8) }, { x: 26.63, z: 19.17, bl: veu(.32) },
      { x: 22.35, z: 19.5, bl: bacia() },
      { x: 23, z: 21.9, bl: candelabro(0) },
      /* o púlpito de pedra com o pergaminho: o enigma do Umbral (v3.82) */
      { x: 24.2, z: 21.1, acao: 'enigma', bl: [B(.15, 0, .1, .5, .9, .4, MARMORE), Object.assign(B(0, .9, 0, .8, .06, .6, '#2A1A10'), { pitch: -.25 }), Object.assign(B(.08, .96, .06, .64, .02, .48, KT.papiro), { pitch: -.25 }), B(.32, .99, .22, .16, .02, .08, OURO)] },
      { x: 22.3, z: 22.95, bl: guardiao() }, { x: 26.15, z: 22.95, bl: guardiao() },
      { x: 23.15, z: 23.2, bl: [B(0, 0, 0, 2.8, .42, .5, '#2A1A10'), B(-.02, .42, -.02, 2.84, .06, .54, '#3A1F5C'), B(.1, .48, .1, 2.6, .01, .02, OURO)] },
      { x: 23.2, z: 20.3, piso: true, bl: [B(0, 0, 0, 3, .02, 2.4, '#2A1446'), B(.2, .02, .2, 2.6, .004, 2, '#3A1F5C'), B(1.2, .025, .7, .6, .004, 1, OURO)] },
      /* ---- o quarto do faraó ---- */
      { x: 2.6, z: .45, bl: camaEg() }, { x: 2.6, z: .45, bl: dossel() },
      { x: 1.5, z: .4, bl: [B(0, 0, 0, .8, .55, .55, KT.mad), B(-.02, .55, -.02, .84, .04, .59, OURO), luzB(B(.25, .59, .13, .3, .42, .3, '#FFE9C4'))] },
      { x: 5.75, z: .4, bl: [B(0, 0, 0, .8, .55, .55, KT.mad), B(-.02, .55, -.02, .84, .04, .59, OURO), luzB(B(.25, .59, .13, .3, .42, .3, '#FFE9C4'))] },
      { x: 6.6, z: 5.6, bl: anubisBau() },
      prateleiraCoringa(.16, 6),
      { x: 2.2, z: 3.5, piso: true, bl: [B(0, 0, 0, 3.6, .02, 2.4, '#7A1C22'), B(.15, .02, .15, 3.3, .004, 2.1, KT.lapis), B(.3, .025, .3, 3, .004, 1.8, '#7A1C22')] },
      /* ---- o estúdio: a mesa de DJ toca os discos da casa ---- */
      { x: 12.5, z: .5, acao: 'discos', topo: .72, bl: ITEM_MESA_DJ() },
      { x: 10.3, z: .4, bl: [B(.15, 0, .15, .7, 1.2, .7, '#15171B'), B(.3, .2, .85, .4, .4, .02, '#34383F'), B(.4, .75, .85, .2, .2, .02, '#34383F')] },
      { x: 15.9, z: .4, bl: [B(.15, 0, .15, .7, 1.2, .7, '#15171B'), B(.3, .2, .85, .4, .4, .02, '#34383F'), B(.4, .75, .85, .2, .2, .02, '#34383F')] },
      { x: 9.5, z: .16, parede: true, bl: [...Array.from({ length: 6 }, (_, i) => B(i * 1.5, 1.35, 0, 1.25, .95, .07, [KT.lapis, PRETO, '#7E3A28', KT.lapis, PRETO, '#7E3A28'][i])), ...Array.from({ length: 6 }, (_, i) => B(i * 1.5 + .1, 1.42, .07, 1.05, .04, .01, OURO)), ...ankhNeon(3.6, 2.2, .08, ROSA)] },
      { x: 14.4, z: 3.2, bl: [B(.2, 0, .2, .5, .05, .5, INK), B(.42, .05, .42, .06, 1.5, .06, INK), B(.36, 1.5, .36, .18, .24, .18, '#8F96A0')] },
      { x: 9.25, z: 3.6, bl: [B(0, 0, 0, .9, .45, 2.6, KT.lapis), B(0, .45, 0, .25, .55, 2.6, KT.lapis), B(.25, .45, .2, .6, .12, 1.1, '#2E52B0'), B(.25, .45, 1.3, .6, .12, 1.1, '#2E52B0'), B(.15, .45, 0, .75, .4, .15, KT.lapis), B(.15, .45, 2.45, .75, .4, .15, KT.lapis)] },
      { x: 17.4, z: .16, parede: true, bl: [B(0, 1.4, 0, .9, 1.1, .05, PRETO), B(.08, 1.48, .05, .74, .74, .01, OURO), B(.3, 1.7, .06, .3, .3, .01, PRETO), B(.15, 2.3, .05, .6, .1, .01, OURO)] },
      { x: 11, z: 3, piso: true, bl: [B(0, 0, 0, 5, .02, 3.2, '#3A2A1E'), B(.2, .02, .2, 4.6, .004, 2.8, '#7E3A28')] },
      /* ---- o closet: o armário do olho de Hórus (troca a skin), o espelho, a arara e a sapateira ---- */
      { x: 20.6, z: .3, acao: 'roupa', bl: [B(0, 0, 0, 3.6, 2.7, .7, KT.mad), B(-.05, 2.7, -.05, 3.7, .12, .8, OURO), ...[.9, 1.8, 2.7].map(x => B(x - .01, .1, .7, .02, 2.5, .01, '#2A1A10')),
        ...[.78, 1, 1.68, 1.9, 2.58, 2.8].map(x => B(x, 1.2, .7, .05, .28, .03, OURO)),
        B(1.45, 2.05, .7, .7, .06, .02, OURO), B(1.5, 1.86, .7, .6, .05, .02, OURO), B(1.68, 1.89, .71, .22, .15, .02, KT.lapis), B(1.58, 1.7, .7, .06, .16, .02, OURO), B(1.96, 1.66, .7, .06, .22, .02, OURO), B(2.0, 1.62, .7, .22, .05, .02, OURO)] },
      { x: 24.7, z: .3, bl: [B(0, 0, 0, 1, 2.2, .1, OURO), B(.08, .1, .1, .84, 2, .01, '#BFD9F2'), B(.15, 1.6, .11, .1, .4, .01, PAPEL)] },
      { x: 26.2, z: .4, bl: [B(0, 0, 0, .08, 1.9, .5, OURO), B(3.3, 0, 0, .08, 1.9, .5, OURO), B(0, 1.85, .22, 3.38, .06, .06, OURO), ...Array.from({ length: 8 }, (_, i) => B(.3 + i * .38, 1.05, .14, .3, .78, .22, [PRETO, LINHO, KT.lapis, SOL, OURO, ROSA, VINHO, AZUL][i]))] },
      { x: 29.4, z: 2.2, bl: [B(0, 0, 0, .55, 2, 4.2, KT.mad), ...[.4, .9, 1.4].flatMap((y, r) => Array.from({ length: 6 }, (_, i) => B(-.05, y, .2 + i * .66, .45, .2, .5, [PAPEL, PRETO, SOL, KT.lapis, OURO, ROSA][(i + r * 2) % 6])))] },
      { x: 23.8, z: 4.2, bl: [B(0, 0, 0, 1.3, .45, .8, VINHO), B(-.02, .45, -.02, 1.34, .04, .84, OURO)] },
      { x: 21.2, z: 2.6, piso: true, bl: [B(0, 0, 0, 5.2, .02, 3.6, '#2A1A3A'), B(.2, .02, .2, 4.8, .004, 3.2, KT.lapis)] },
      /* ---- o gabinete, no mezanino ---- */
      { x: 3.6, z: 1.6, y: 3.4, piso: true, bl: [B(0, 0, 0, 16.4, .03, 5.4, KT.lapis), B(.25, .03, .25, 15.9, .006, 4.9, '#2E52B0'), B(.4, .036, .4, 15.6, .004, .06, OURO), B(.4, .036, 4.94, 15.6, .004, .06, OURO)] },
      { x: 25.8, z: 5.6, y: 3.4, bl: [B(0, 0, 0, 1, .8, 1, PRETO), B(.08, .8, .08, .84, .16, .84, KT.pedra), B(.18, .96, .18, .64, .16, .64, KT.pedra), B(.28, 1.12, .28, .44, .16, .44, KT.pedra), B(.38, 1.28, .38, .24, .14, .24, OURO)] },
      { x: 7.6, z: 6.6, y: 3.4, bl: [B(0, 0, 0, .7, .1, .5, PRETO), B(.29, .1, .19, .12, .95, .12, OURO), B(.05, .9, .19, .6, .12, .12, OURO), B(.2, 1.05, .19, .3, .08, .12, OURO), B(.14, 1.12, .19, .08, .32, .12, OURO), B(.48, 1.12, .19, .08, .32, .12, OURO), B(.2, 1.42, .19, .3, .08, .12, OURO)] }
    ]
  };
  /* ---------- v3.86 · a mansão do @playboy: 20 milhões de dólares por dentro ----------
     O Thales: "faça a casa do playboy por dentro super luxuosa, tipo aquelas mansões americanas de 20 milhões de
     dólares". Por fora ela continua a mansão pimp (veludo roxo, ouro, oncinha); por dentro é Beverly Hills: mármore
     branco, ouro e cristal, com o roxo do dono no veludo. 36 x 28, pé-direito de 7 m na frente.
     Na frente, tudo aberto e alto: o hall com a rosa dos ventos de mármore no chão, a mesa redonda das flores, o lustre
     de cristal de três andares, as panteras negras no pé da escadaria de mármore (passadeira roxa, corrimão de ouro) e
     as colunas brancas de capitel dourado; o living com a lareira de mármore e o quadro da coroa em cima, o sofá em U,
     o piano de cauda branco e o toca-discos (toca os discos da casa); a cozinha de chef (a ilha de mármore em cascata
     com as banquetas de veludo, a coifa de ouro, o forno duplo, a geladeira de inox) e a mesa de jantar de 12 lugares
     com o lustre. Embaixo do mezanino: a piscina coberta com a raia, o spa redondo, as espreguiçadeiras e o balde de
     champanhe; o cinema (as poltronas de veludo roxo em três degraus, a cortina, a pipoqueira e a tela); a adega com a
     parede de vidro pro hall; e a garagem dos esportivos (três carros e a moto, desenho e nome nossos, o do meio no
     tablado giratório, o letreiro de neon). No mezanino: a suíte master (a cabeceira capitonê de veludo roxo até o
     teto, a banheira de pé de frente pro vidro, a lareira e a TV), o gabinete com as ferramentas e os discos de ouro,
     olhando pro hall por cima do corrimão de ouro, e o closet-boutique (a ilha de vidro com os relógios, a parede de
     tênis, as bolsas, os ternos; o armário de espelho troca a skin). Nada de verde: a água é azul, a garrafa de vinho é
     vinho, as flores são orquídeas brancas e rosas e o capim é dourado */
  const KL = { marm: '#F1ECE4', marmE: '#DCD4C7', negro: '#16171B', negroC: '#2A2B31', ouro: '#D9A93A', ouroC: '#F2D27A', ouroE: '#A8802A', roxo: '#4A1D5E', roxoC: '#6E2C8A', roxoE: '#2C0F3A',
    creme: '#F6F0E4', branco: '#FBF8F2', noz: '#3E2618', nozC: '#6A4428', inox: '#AEB4BC', agua: '#2F7FE0', aguaC: '#7FC0F7', trav: '#E3D9C6', parede: '#F1ECE3', paredeI: '#E8E1D5', espelho: '#DCE6EF', vinho: '#5A1622' };
  /* ---- o chão: a rosa dos ventos do hall, os veios do mármore e a piscina ---- */
  const rodaL = (cx, cz, r, c, n) => ({ pts: Array.from({ length: n || 32 }, (_, i) => { const a = i / (n || 32) * Math.PI * 2; return [cx + Math.cos(a) * r, cz + Math.sin(a) * r]; }), c });
  function medalhao(cx, cz, r){
    const out = [rodaL(cx, cz, r, KL.negro), rodaL(cx, cz, r * .94, KL.ouro), rodaL(cx, cz, r * .9, KL.marm), rodaL(cx, cz, r * .62, KL.negro), rodaL(cx, cz, r * .58, '#EDE6DA')];
    /* a estrela de oito pontas: as longas pretas (as quatro do rumo, mais escuras), as curtas de ouro entre elas */
    for(let i = 0; i < 16; i++){
      const a = i / 16 * Math.PI * 2 - Math.PI / 2, longa = i % 2 === 0, L = longa ? r * .86 : r * .55, w = longa ? r * .13 : r * .09, ax = Math.cos(a), az = Math.sin(a), px = -az, pz = ax;
      out.push({ pts: [[cx, cz], [cx + ax * L * .3 + px * w, cz + az * L * .3 + pz * w], [cx + ax * L, cz + az * L], [cx + ax * L * .3 - px * w, cz + az * L * .3 - pz * w]], c: longa ? (i % 4 === 0 ? KL.negro : KL.negroC) : KL.ouro });
    }
    out.push(rodaL(cx, cz, r * .12, KL.ouro, 16), rodaL(cx, cz, r * .05, KL.negro, 12));
    return out;
  }
  /* os veios do mármore: riscos finos e tortos, sempre os mesmos (a semente) */
  function veios(x0, z0, x1, z1, n, s){
    const out = []; let k = s;
    const rnd = () => { k = (k * 16807) % 2147483647; return k / 2147483647; };
    for(let i = 0; i < n; i++){
      const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0), a = (rnd() - .5) * 1.1 + .5, L = .8 + rnd() * 2.2, w = .012 + rnd() * .018, dx = Math.cos(a), dz = Math.sin(a);
      const x2 = Math.min(x1, Math.max(x0, x + dx * L)), z2 = Math.min(z1, Math.max(z0, z + dz * L));
      out.push({ pts: [[x - dz * w, z + dx * w], [x2 - dz * w, z2 + dx * w], [x2 + dz * w, z2 - dx * w], [x + dz * w, z - dx * w]], c: 'rgba(150,138,120,.3)' });
    }
    return out;
  }
  /* a piscina coberta: a borda de travertino, a pastilha de ouro, a água azul, a escadinha, a raia do fundo e o brilho */
  const CHAO_PISCINA = [ret(1.2, 1.2, 9.8, 8.4, '#CDBFA6'), ret(1.42, 1.42, 9.58, 8.18, KL.ouro), ret(1.52, 1.52, 9.48, 8.08, KL.agua),
    ret(1.52, 1.52, 2.7, 2.3, '#5B9CEB'), ret(1.52, 2.3, 2.1, 3.1, '#4A8DE4'),
    ret(5.35, 2.4, 5.65, 7.2, '#1E5FC0'), ret(4.95, 2.4, 6.05, 2.7, '#1E5FC0'), ret(4.95, 6.9, 6.05, 7.2, '#1E5FC0'),
    ...[2.9, 4.1, 5.3, 6.5].map((z, i) => ret(2.2 + (i % 2) * .6, z, 8.8 - (i % 2) * .5, z + .05, 'rgba(255,255,255,.22)'))];
  /* ---- as peças ---- */
  /* o lustre de cristal: a corrente, até três andares de pingentes (os de cima menores), as velas de luz e a gota de baixo */
  function lustre(cx, top, cz, r, andares){
    const out = [B(cx - .03, top - 1.1, cz - .03, .06, 1.1, .06, KL.ouro)];
    [[r, top - 2.3], [r * .68, top - 1.85], [r * .4, top - 1.45]].slice(0, andares || 3).forEach(([rr, y]) => {
      const n = Math.max(8, Math.round(rr * 13));
      for(let i = 0; i < n; i++){
        const a = i / n * Math.PI * 2, x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr, L = 2 * Math.PI * rr / n + .02;
        /* o aro de ouro: um gomo por pingente, girado no lugar */
        out.push(Object.assign(B(cx + rr - .03, y, cz - L / 2, .06, .05, L, KL.ouro), { yaw: -a, piv: [cx, y, cz] }));
        out.push(luzB(B(x - .035, y - .36 - (i % 2) * .12, z - .035, .07, .34 + (i % 2) * .12, .07, i % 3 ? '#F4F8FF' : '#FFF1C8')));
        if(i % 2 === 0) out.push(luzB(B(x - .04, y + .05, z - .04, .08, .14, .08, '#FFE9A8')));
      }
      out.push(B(cx - .02, y, cz - .02, .04, top - y - 1.1, .04, KL.ouro));
    });
    out.push(esferaB(cx - .17, top - 2.75, cz - .17, .34, '#EAF2FF'), luzB(B(cx - .035, top - 3, cz - .035, .07, .26, .07, '#F4F8FF')));
    return out;
  }
  /* a coluna branca de capitel e base de ouro, do chão ao teto */
  const colunaL = () => [B(0, 0, 0, .6, 7, .6, KL.marm), B(.05, 0, .05, .08, 7, .08, KL.branco), B(-.1, 0, -.1, .8, .32, .8, KL.marmE), B(-.12, .32, -.12, .84, .05, .84, KL.ouro), B(-.12, 6.5, -.12, .84, .5, .84, KL.ouro), B(-.06, 6.4, -.06, .72, .1, .72, KL.ouroE)];
  /* a pantera negra sentada, de coleira de ouro, no pedestal de mármore (olhando pra porta, z+) */
  const pantera = () => [B(0, 0, 0, .8, .85, .8, KL.marm), B(-.04, .85, -.04, .88, .06, .88, KL.ouro), B(.17, .91, .06, .46, .42, .58, KL.negro), B(.22, 1.3, .34, .36, .5, .3, KL.negro), B(.21, 1.74, .4, .38, .28, .3, KL.negro),
    B(.23, 2, .45, .08, .1, .08, KL.negro), B(.49, 2, .45, .08, .1, .08, KL.negro), B(.3, 1.74, .68, .2, .14, .1, KL.negro), B(.27, 1.86, .7, .06, .04, .01, KL.ouro), B(.47, 1.86, .7, .06, .04, .01, KL.ouro),
    B(.2, 1.62, .4, .4, .06, .32, KL.ouro), B(.2, .91, .6, .1, .4, .1, KL.negro), B(.5, .91, .6, .1, .4, .1, KL.negro), B(.55, .91, .02, .08, .08, .5, KL.negro)];
  /* uma cadeira (ou banqueta) de veludo com pé de ouro, virada pro lado dito (o encosto do outro lado) */
  const banqueta = para => [B(.15, 0, .15, .05, .72, .05, KL.ouro), B(.6, 0, .15, .05, .72, .05, KL.ouro), B(.15, 0, .6, .05, .72, .05, KL.ouro), B(.6, 0, .6, .05, .72, .05, KL.ouro), B(.12, .3, .12, .58, .03, .58, KL.ouro), B(.1, .72, .1, .62, .1, .62, KL.roxo),
    para === 'z-' ? B(.1, .82, .62, .62, .38, .1, KL.roxo) : B(.1, .82, .1, .62, .38, .1, KL.roxo)];
  /* a poltrona do cinema, de frente pra tela (z-), em cima do degrau h */
  const poltronaL = h => [B(0, h, 0, .85, .42, .8, KL.roxo), B(0, h + .42, .6, .85, .62, .22, KL.roxo), B(.04, h + .9, .6, .77, .14, .2, KL.roxoC), B(-.06, h + .15, .02, .1, .48, .78, KL.roxoE), B(.81, h + .15, .02, .1, .48, .78, KL.roxoE),
    B(.06, h + .42, .06, .73, .06, .5, KL.roxoC), B(.83, h + .63, .1, .06, .02, .1, KL.ouro)];
  /* a espreguiçadeira de frente pra água (z-), com a toalha roxa enrolada */
  const espreguicadeira = () => [B(0, 0, 0, .72, .28, 1.9, KL.branco), B(.05, .28, .05, .62, .08, 1.2, KL.creme), Object.assign(B(.05, .3, 1.25, .62, .08, .66, KL.creme), { pitch: -.75, piv: [.36, .34, 1.25] }),
    B(.16, .36, .2, .4, .1, .22, KL.roxo), B(.04, 0, .04, .06, .28, .06, KL.ouro), B(.62, 0, .04, .06, .28, .06, KL.ouro)];
  /* o vaso de ouro com orquídeas brancas e rosas (as hastes escuras; folha nenhuma) */
  const orquidea = () => [B(0, 0, 0, .5, .55, .5, KL.ouro), B(.04, .55, .04, .42, .04, .42, KL.ouroE), B(.12, .59, .2, .03, .8, .03, KL.noz), B(.32, .59, .26, .03, .7, .03, KL.noz),
    ...[[.08, 1.25, .14, KL.branco], [.17, 1.12, .12, '#FFD6E7'], [.26, 1.3, .2, KL.branco], [.33, 1.18, .24, '#F7C6DA'], [.2, 1.38, .18, KL.branco], [.38, 1.05, .22, KL.branco]].map(([x, y, z, c]) => B(x, y, z, .1, .1, .07, c))];
  /* o esportivo da garagem: baixo e comprido, de frente pro z+ e centrado; aro de ouro ou cromado. Desenho nosso, sem marca */
  function esportivo(c, aro){
    const out = [], hw = .98, L = 4.5, z0 = -L / 2, z1 = L / 2, VID = '#1E242E', esc = escurece(c, .62);
    [1.45, -1.35].forEach(rz => [-hw - .02, hw - .26].forEach(rx => { out.push(B(rx, 0, rz - .36, .28, .72, .72, '#141519')); out.push(B(rx < 0 ? rx - .012 : rx + .272, .14, rz - .22, .02, .44, .44, aro)); }));
    out.push(B(-hw, .14, z0, hw * 2, .38, L, c), B(-hw + .06, .52, z0 + .3, hw * 2 - .12, .1, L - .7, c), B(-hw + .2, .62, -.95, hw * 2 - .4, .3, 1.75, c));
    out.push(B(-hw + .26, .66, .79, hw * 2 - .52, .24, .02, VID), B(-hw + .26, .66, -.96, hw * 2 - .52, .22, .02, VID), B(-hw + .19, .66, -.8, .02, .22, 1.45, VID), B(hw - .21, .66, -.8, .02, .22, 1.45, VID));
    out.push(B(-hw - .005, .26, -.95, .01, .2, .8, '#141519'), B(hw - .005, .26, -.95, .01, .2, .8, '#141519'));
    out.push(B(-hw + .12, .42, z1, .5, .06, .02, '#FFF6CF'), B(hw - .62, .42, z1, .5, .06, .02, '#FFF6CF'), B(-hw + .1, .4, z0 - .02, hw * 2 - .2, .05, .02, '#E2412E'));
    out.push(B(-hw + .15, .62, z0 + .1, .06, .2, .06, esc), B(hw - .21, .62, z0 + .1, .06, .2, .06, esc), B(-hw + .05, .82, z0 + .02, hw * 2 - .1, .04, .34, esc));
    out.push(B(-hw + .3, .16, z0 - .02, .5, .12, .02, '#141519'), B(.2, .2, z0 - .03, .12, .08, .02, aro));
    return out;
  }
  /* a moto da garagem (a mesma silhueta da Corre 160 do Autódromo), de frente pro z+ */
  const motoG = c => [B(-.07, 0, .38, .14, .44, .44, '#16181D'), B(-.07, 0, -.82, .14, .44, .44, '#16181D'), B(-.08, .15, .53, .16, .14, .14, KL.ouro), B(-.08, .15, -.67, .16, .14, .14, KL.ouro),
    B(-.16, .32, -.62, .32, .26, 1, c), B(-.18, .56, -.12, .36, .2, .46, c), B(-.15, .58, -.6, .3, .1, .5, INK), B(-.04, .4, .38, .08, .5, .08, KL.inox), B(-.36, .88, .36, .72, .05, .05, INK), B(-.09, .66, .48, .18, .14, .06, '#FFF6CF')];
  /* gira uma lista de blocos em volta de um ponto (o tablado giratório) */
  const gira = (bl, yaw, px, pz) => bl.map(b => Object.assign({}, b, { yaw, piv: [px, 0, pz] }));
  /* a escadaria: a passadeira roxa em cada degrau (com o varão de ouro no pé), os balaústres do lado de cá e os dois
     corrimãos de ouro, inclinados junto com a escada (a escada em si é a do motor, no mármore da planta) */
  const ESCADA_L = { x0: 16.5, z0: 11, x1: 19.5, z1: 20, topo: 3.6, cor: KL.marm, degrau: '#F8F4EE', pilar: KL.ouro };
  function passadeira(e){
    const n = Math.round(e.z1 - e.z0), passo = (e.z1 - e.z0) / n, out = [], cx = (e.x0 + e.x1) / 2, lw = 1.5;
    for(let i = 0; i < n; i++){
      const h = e.topo * (i + 1) / n, h0 = e.topo * i / n, z1 = e.z1 - i * passo, z0 = z1 - passo;
      out.push(B(cx - lw / 2, h, z0, lw, .02, passo, KL.roxo), B(cx - lw / 2, h0, z1 - .012, lw, h - h0, .02, KL.roxoE), B(cx - lw / 2 - .04, h0 + .02, z1 - .035, lw + .08, .035, .035, KL.ouro));
      out.push(B(e.x1 + .06, h, z0 + passo / 2 - .04, .08, .9, .08, KL.ouro));
    }
    const L = Math.hypot(e.z1 - e.z0, e.topo), ang = Math.atan2(e.topo, e.z1 - e.z0), y0 = .9 + e.topo / n;
    [e.x0 - .18, e.x1 + .02].forEach(x => out.push(Object.assign(B(x, y0, e.z1 - L, .16, .07, L, KL.ouro), { pitch: ang, piv: [x + .08, y0, e.z1] })));
    return out;
  }
  /* o fogo da lareira: línguas de alturas diferentes, o laranja atrás, o amarelo no meio e o miolo quase branco na
     frente (uma caixa só lia como tijolo laranja) */
  const chamas = (x, y, z, hs = [.34, .52, .42, .64, .47, .56, .36], passo = .165, dir = 1) => hs.flatMap((h, i) => {
    const zz = z + i * passo, w = passo * .85;
    return [luzB(B(x, y, zz, .04, h, w, '#F2612A')), luzB(B(x + .02 * dir, y, zz + w * .18, .04, h * .7, w * .64, '#FFA43A')), luzB(B(x + .04 * dir, y, zz + w * .29, .04, h * .38, w * .42, '#FFF1C9'))];
  });
  /* ---- as pinturas: o quadro da coroa (em cima da lareira), a tela do cinema e o neon da garagem ---- */
  function quadroCoroa(g, w, h){
    g.fillStyle = KL.roxoE; g.fillRect(0, 0, w, h);
    /* o fundo: pinceladas largas de roxo e vinho */
    for(let i = 0; i < 14; i++){ g.fillStyle = ['#4A1D5E', '#6E2C8A', '#3A1240', '#5A1A4A'][i % 4]; g.globalAlpha = .75; g.save(); g.translate(w * ((i * 37) % 100) / 100, h * ((i * 53) % 100) / 100); g.rotate(-.5 + (i % 5) * .2); g.fillRect(-w * .45, -h * .045, w * .9, h * .09); g.restore(); }
    g.globalAlpha = 1;
    /* a retícula rosa de baixo (pop art): a bolinha cresce descendo */
    g.fillStyle = 'rgba(255,79,154,.55)'; for(let y = h * .55; y < h; y += 10) for(let x = 0; x < w; x += 10){ const r = 1 + (y - h * .55) / (h * .45) * 3.2; g.beginPath(); g.arc(x + (Math.round(y / 10) % 2) * 5, y, r, 0, Math.PI * 2); g.fill(); }
    /* a coroa de ouro: as cinco pontas com a bolinha, a faixa e as pedras */
    const cx = w / 2, by = h * .62, cw = w * .64, ch = h * .3, oy = g.createLinearGradient(0, by - ch, 0, by);
    oy.addColorStop(0, '#FFE08A'); oy.addColorStop(.5, '#E7B734'); oy.addColorStop(1, '#9C7215');
    const pontas = Array.from({ length: 5 }, (_, i) => [cx - cw / 2 + i * cw / 4, by - ch * (i % 2 ? .66 : 1)]);
    g.beginPath(); g.moveTo(cx - cw / 2, by); pontas.forEach(([px, py], i) => { g.lineTo(px, py); if(i < 4) g.lineTo(px + cw / 8, by - ch * .45); }); g.lineTo(cx + cw / 2, by); g.closePath();
    g.fillStyle = oy; g.fill(); g.lineWidth = 4; g.strokeStyle = KL.roxoE; g.stroke();
    pontas.forEach(([px, py]) => { g.beginPath(); g.arc(px, py - 8, 9, 0, Math.PI * 2); g.fillStyle = '#FFE08A'; g.fill(); g.stroke(); });
    g.fillStyle = '#9C7215'; g.fillRect(cx - cw / 2, by - ch * .2, cw, ch * .14);
    [['#FF4F9A', -.3], ['#2E5BFF', 0], ['#B4152E', .3]].forEach(([c, f]) => { g.beginPath(); g.ellipse(cx + f * cw, by - ch * .13, 11, 8, 0, 0, Math.PI * 2); g.fillStyle = c; g.fill(); g.lineWidth = 2; g.stroke(); });
    /* o ouro escorrendo da coroa, como tinta de spray */
    g.fillStyle = '#E7B734'; [-.36, -.18, .05, .22, .4].forEach((f, i) => { const x = cx + f * cw, L = h * (.05 + (i * 7 % 5) * .03); g.fillRect(x - 3, by, 6, L); g.beginPath(); g.arc(x, by + L, 4.5, 0, Math.PI * 2); g.fill(); });
    /* o cifrão no canto, a assinatura, e a moldura de ouro */
    g.font = `900 ${Math.round(h * .08)}px Georgia, serif`; g.fillStyle = '#FFE08A'; g.textAlign = 'right'; g.textBaseline = 'alphabetic'; g.fillText('$', w * .88, h * .92);
    g.strokeStyle = '#E7B734'; g.lineWidth = 16; g.strokeRect(8, 8, w - 16, h - 16); g.strokeStyle = '#9C7215'; g.lineWidth = 3; g.strokeRect(17, 17, w - 34, h - 34);
  }
  function telaCinema(g, w, h){
    g.fillStyle = '#05060A'; g.fillRect(0, 0, w, h);
    const y0 = h * .1, y1 = h * .9, ceu = g.createLinearGradient(0, y0, 0, y1);
    ceu.addColorStop(0, '#1A0B3D'); ceu.addColorStop(.5, '#8E3FE0'); ceu.addColorStop(.78, '#FF5CA8'); ceu.addColorStop(1, '#FF9A5C'); g.fillStyle = ceu; g.fillRect(0, y0, w, y1 - y0);
    /* o sol se pondo, cortado pelas listras */
    const sx = w * .5, sy = h * .7; g.fillStyle = '#FFD27A'; g.beginPath(); g.arc(sx, sy, h * .2, Math.PI, 0); g.fill();
    g.fillStyle = '#FF5CA8'; for(let i = 0; i < 5; i++) g.fillRect(sx - h * .22, sy - h * .02 - i * h * .035, h * .44, h * .012);
    /* a cidade em silhueta (prédios nossos), o mais alto com a luz vermelha, e as janelas acesas */
    g.fillStyle = '#14081F'; let x = 0, k = 7; while(x < w){ k = (k * 16807) % 2147483647; const bw = 18 + (k % 40), bh = h * (.08 + (k % 100) / 100 * .3); g.fillRect(x, y1 - bh, bw, bh); x += bw + 2; }
    g.fillRect(w * .72, y1 - h * .5, w * .04, h * .5); g.fillRect(w * .738, y1 - h * .6, 2, h * .1); g.fillStyle = '#FF2D2D'; g.fillRect(w * .735, y1 - h * .6, 6, 6);
    g.fillStyle = 'rgba(255,214,140,.8)'; for(let i = 0; i < 80; i++){ k = (k * 16807) % 2147483647; g.fillRect(k % w, y1 - 4 - (k % Math.round(h * .28)), 2, 3); }
    letreiro(g, 'CORRE', w * .5, h * .3, w * .5, h * .18, '#FFF6D8', 900);
    letreiro(g, 'o filme', w * .5, h * .43, w * .3, h * .06, '#FFE08A', 600);
  }
  function neonGaragem(g, w, h){
    g.fillStyle = '#120A18'; g.fillRect(0, 0, w, h);
    g.save(); g.shadowColor = '#FF4F9A'; g.shadowBlur = h * .25; letreiro(g, 'GARAGEM', w * .58, h * .54, w * .7, h * .62, '#FF8CC0', 900); g.restore();
    letreiro(g, 'GARAGEM', w * .58, h * .54, w * .7, h * .62, '#FFE3F0', 900);
    /* a coroa de neon, no laranja-ouro (amarelo de neon no escuro puxa pro verde) */
    const cx = w * .1, cy = h * .56, s = h * .32;
    g.save(); g.shadowColor = '#FFB23D'; g.shadowBlur = h * .2; g.strokeStyle = '#FFC861'; g.lineWidth = h * .06; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(cx - s, cy + s * .5); g.lineTo(cx - s, cy - s * .4); g.lineTo(cx - s * .5, cy); g.lineTo(cx, cy - s * .6); g.lineTo(cx + s * .5, cy); g.lineTo(cx + s, cy - s * .4); g.lineTo(cx + s, cy + s * .5); g.closePath(); g.stroke(); g.restore();
  }
  /* ---- a planta ---- */
  const PLANTA_LUXO = {
    k: 'luxo', W: 36, D: 28, ALT: 7,
    comodos: [
      { k: 'hall', nome: 'Hall de entrada', x0: 12, z0: 11, x1: 24, z1: 28, piso: KL.marm, linha: 'rgba(140,120,90,.16)' },
      { k: 'sala', nome: 'Living', x0: 0, z0: 11, x1: 12, z1: 28, piso: KL.marm, linha: 'rgba(140,120,90,.16)' },
      { k: 'cozinha', nome: 'Cozinha e jantar', x0: 24, z0: 11, x1: 36, z1: 28, piso: '#CDA77C', linha: 'rgba(80,50,20,.16)' },
      { k: 'piscina', nome: 'Piscina e spa', x0: 0, z0: 0, x1: 13, z1: 11, piso: KL.trav, linha: 'rgba(120,100,70,.18)' },
      { k: 'cinema', nome: 'Cinema', x0: 13, z0: 0, x1: 21, z1: 11, piso: '#2C1238', linha: 'rgba(255,255,255,.03)' },
      { k: 'adega', nome: 'Adega', x0: 21, z0: 0, x1: 25, z1: 11, piso: '#3A2418', linha: 'rgba(0,0,0,.2)' },
      { k: 'garagem', nome: 'Garagem dos esportivos', x0: 25, z0: 0, x1: 36, z1: 11, piso: '#2A2C33', piso2: '#1C1D22', xadrez: true, linha: 'rgba(255,255,255,.05)' },
      { k: 'suite', nome: 'Suíte master (mezanino)', x0: 0, z0: 0, x1: 13, z1: 11, n: 1, piso: '#E6DED1', linha: 'rgba(120,100,70,.14)' },
      { k: 'escritorio', nome: 'Gabinete (mezanino)', x0: 13, z0: 0, x1: 25, z1: 11, n: 1, piso: '#E6DED1', linha: 'rgba(120,100,70,.14)' },
      { k: 'closet', nome: 'Closet (mezanino)', x0: 25, z0: 0, x1: 36, z1: 11, n: 1, piso: '#E6DED1', linha: 'rgba(120,100,70,.14)' }
    ],
    paredes: [
      { a: [0, 28], b: [36, 28], ext: [0, 1], portas: [[17.2, 18.8]], altas: [[1, 10.5], [13, 16.6], [19.4, 23], [25, 35]], entrada: true, cor: KL.parede },
      { a: [36, 0], b: [36, 28], ext: [1, 0], altas: [[19.5, 27]], cor: KL.parede },
      { a: [0, 0], b: [0, 28], ext: [-1, 0], altas: [[1, 10], [12, 17.5], [21.5, 27]], cor: KL.parede },
      { a: [0, 0], b: [36, 0], ext: [0, -1], janelas: [[2, 5], [7, 10]], cor: KL.paredeI },
      /* embaixo do mezanino: a parede do fundo da frente, com a adega de vidro pro hall, e as divisões */
      { a: [0, 11], b: [36, 11], portas: [[8.5, 10], [14, 15.4], [22.3, 23.7], [30, 31.6]], altas: [[21.2, 22.3], [23.7, 24.8]], alt: 3.6, cor: KL.paredeI },
      { a: [13, 0], b: [13, 11], alt: 3.6, cor: KL.paredeI }, { a: [21, 0], b: [21, 11], alt: 3.6, cor: KL.paredeI },
      { a: [25, 0], b: [25, 11], altas: [[3, 8]], alt: 3.6, cor: KL.paredeI }
    ],
    entrada: { x: 18, z: 28 }, tapete: { x: 17.3, z: 26.8, w: 1.4, d: 1 },
    mezanino: { x0: 0, z0: 0, x1: 36, z1: 11, y: 3.6, grade: [[0, 11, 16.5, 11], [19.5, 11, 36, 11]], corrimao: KL.ouro, pilar: KL.ouroE },
    escada: ESCADA_L,
    estacoes: { studio: { x: 17.3, z: .4, y: 3.6 }, feed: { x: 15, z: .15, y: 3.6 }, ia: { x: 20.2, z: .5, y: 3.6 }, horus: { x: 13.2, z: 1, y: 3.6 }, mural: { x: 13.2, z: 4.2, y: 3.6 }, marcas: { x: 24.35, z: .6, y: 3.6 }, grana: { x: 24.15, z: 3.9, y: 3.6 }, vendas: { x: 21.2, z: 5.6, y: 3.6 }, nicho: { x: 14.2, z: 6.9, y: 3.6 }, estilo: { x: 15.5, z: 3.7, y: 3.6 }, manual: { x: 22.3, z: 2.5, y: 3.6 }, banca: { x: 22.7, z: .4, y: 3.6 }, agente: { x: 17.6, z: 3.5, y: 3.6 } },
    padrao: [],
    chao: [...veios(0, 11, 24, 28, 46, 1986), ...medalhao(18, 24.6, 2.3), ...CHAO_PISCINA, rodaL(31, 5.6, 2.7, KL.ouro), rodaL(31, 5.6, 2.58, '#3A3D44'), rodaL(31, 5.6, 2.2, '#33363D')],
    /* ninguém anda dentro d'água */
    bloqueio: [[1.4, 1.4, 9.6, 8.2]],
    luzes: [{ mancha: [18, .004, 24.6, 3.4, 3.4, .14, 0, '255,236,190'] }, { mancha: [5.5, .004, 4.8, 4.6, 3.6, .14, 0, '120,190,255'] }, { mancha: [1.4, .004, 19.5, 1.7, 2.3, .2, 0, '255,170,90'] },
      { mancha: [31, .004, 15.9, 3, 1.5, .1, 0, '255,230,180'] }, { mancha: [31, .004, 5.6, 2.8, 2.8, .14, 0, '255,220,240'] }, { mancha: [17, .004, 1.6, 3.2, 1.3, .16, 0, '170,140,255'] }, { mancha: [23, .004, 1.2, 1.8, .8, .16, 0, '255,200,140'] }],
    imgs: [
      { P4: faceP4('x', .67, 18.1, 20.9, 2.4, 5.9, 1), n: [1, 0, 0], img: () => calcImg('luxoQuadro', 340, 420, quadroCoroa), cor: KL.roxoE },
      { P4: faceP4('z', .2, 14, 20, .6, 3.2, 1), n: [0, 0, 1], img: () => calcImg('luxoTela', 600, 260, telaCinema), cor: '#05060A' },
      { P4: faceP4('z', .17, 27.4, 34.6, 2.05, 3.25, 1), n: [0, 0, 1], img: () => calcImg('luxoNeon', 600, 100, neonGaragem), cor: '#120A18' }
    ],
    decor: [
      /* ---- o hall ---- */
      { x: 0, z: 0, piso: true, bl: passadeira(ESCADA_L) },
      { x: 18, z: 24.6, bl: [B(-.2, 0, -.2, .4, .75, .4, KL.ouro), Object.assign(B(-.2, 0, -.2, .4, .75, .4, KL.ouro), { yaw: Math.PI / 4 }), B(-.75, .75, -.75, 1.5, .06, 1.5, KL.negro), Object.assign(B(-.75, .75, -.75, 1.5, .06, 1.5, KL.negro), { yaw: Math.PI / 4 }),
        B(-.77, .81, -.77, 1.54, .015, 1.54, KL.ouro), B(-.18, .81, -.18, .36, .45, .36, KL.ouro), esferaB(-.5, 1.2, -.32, .42, KL.branco), esferaB(-.02, 1.34, -.12, .46, '#FFD6E7'), esferaB(-.24, 1.3, .14, .38, KL.branco), esferaB(.14, 1.14, .2, .34, '#F7C6DA'), esferaB(-.38, 1.06, .14, .3, KL.branco), esferaB(.2, 1.1, -.42, .32, KL.branco)] },
      { x: 0, z: 0, bl: lustre(18, 7, 24.6, 1.35, 3) },
      /* as panteras do lado do primeiro degrau (na frente dele, elas trancavam quem desce e vira pro living) */
      { x: 15.4, z: 19.2, bl: pantera() }, { x: 19.8, z: 19.2, bl: pantera() },
      { x: 11.7, z: 12.6, bl: colunaL() }, { x: 11.7, z: 25.8, bl: colunaL() }, { x: 23.7, z: 12.6, bl: colunaL() }, { x: 23.7, z: 25.8, bl: colunaL() },
      /* a moldura de ouro da porta e os capins dourados dos lados */
      { x: 16.95, z: 27.7, parede: true, bl: [B(0, 0, 0, .22, 2.4, .15, KL.ouro), B(1.83, 0, 0, .22, 2.4, .15, KL.ouro), B(0, 2.25, 0, 2.05, .25, .15, KL.ouro), B(.6, 2.5, 0, .85, .3, .15, KL.ouroE)] },
      { x: 15.6, z: 26.9, bl: [B(0, 0, 0, .6, .8, .6, KL.ouro), B(.22, .8, .22, .16, 1.3, .16, '#D9C27F'), B(.06, 1.4, .25, .16, .8, .16, '#E3D1A0'), B(.4, 1.3, .1, .16, .7, .16, '#E3D1A0')] },
      { x: 19.8, z: 26.9, bl: [B(0, 0, 0, .6, .8, .6, KL.ouro), B(.22, .8, .22, .16, 1.3, .16, '#D9C27F'), B(.06, 1.4, .25, .16, .8, .16, '#E3D1A0'), B(.4, 1.3, .1, .16, .7, .16, '#E3D1A0')] },
      /* ---- o living ---- */
      { x: .15, z: 17.9, bl: [B(0, 0, 0, .5, 6.6, 3.2, KL.marm), B(.5, 0, -.3, .25, 1.45, 3.8, KL.marmE), B(.5, 1.45, -.4, .4, .12, 4, KL.marm), B(.88, 1.45, -.4, .02, .12, 4, KL.ouro), B(.74, .2, .6, .02, .95, 2, '#141519'),
        B(.5, 0, -.4, 1, .05, 4, KL.negro), B(.78, .25, .9, .1, .1, 1.4, '#5A3A22'), B(.8, .33, 1.05, .1, .08, 1.1, '#3E2616'), ...chamas(.77, .35, 1.02), B(.5, 5.95, -.1, .2, .1, 3.4, KL.ouro)] },
      { x: 1.6, z: 15.7, piso: true, bl: [B(0, 0, 0, 5.4, .02, 7.6, KL.ouro), B(.12, .02, .12, 5.16, .004, 7.36, KL.creme), B(.5, .025, .5, 4.4, .003, 6.6, '#E9DFF0')] },
      { x: 5.6, z: 16.6, bl: [B(0, 0, 0, .9, .42, 5.8, KL.creme), B(.62, .42, 0, .28, .58, 5.8, KL.creme), B(0, .42, 0, .62, .12, 5.8, KL.branco), B(.45, .54, .4, .18, .42, .55, KL.roxo), B(.45, .54, 2.6, .18, .42, .55, KL.roxoC), B(.45, .54, 4.8, .18, .42, .55, KL.roxo), B(0, .4, 0, .02, .02, 5.8, KL.ouro)] },
      { x: 2.6, z: 16.1, bl: [B(0, 0, 0, 3.9, .42, .9, KL.creme), B(0, .42, 0, 3.9, .58, .28, KL.creme), B(0, .42, .28, 3.9, .12, .62, KL.branco), B(.5, .54, .3, .55, .42, .18, KL.roxoC), B(2.2, .54, .3, .55, .42, .18, KL.roxo)] },
      { x: 2.6, z: 21.9, bl: [B(0, 0, 0, 3.9, .42, .9, KL.creme), B(0, .42, .62, 3.9, .58, .28, KL.creme), B(0, .42, 0, 3.9, .12, .62, KL.branco), B(.5, .54, .44, .55, .42, .18, KL.roxo), B(2.2, .54, .44, .55, .42, .18, KL.roxoC)] },
      { x: 3.1, z: 18.5, bl: [B(0, .36, 0, 1.8, .06, 1.9, KL.marm), B(.08, 0, .08, .06, .36, .06, KL.ouro), B(1.66, 0, .08, .06, .36, .06, KL.ouro), B(.08, 0, 1.76, .06, .36, .06, KL.ouro), B(1.66, 0, 1.76, .06, .36, .06, KL.ouro), B(.6, .42, .7, .5, .12, .4, KL.ouro), B(.2, .42, .3, .35, .06, .5, KL.roxo)] },
      /* o piano de cauda branco, a banqueta e a partitura */
      { x: 7.6, z: 24, bl: [B(0, .7, 0, 2.4, .32, 1.5, KL.branco), B(0, 1.02, 0, 2.4, .04, 1.5, '#EDE8E0'), B(.1, 0, .1, .14, .7, .14, KL.branco), B(2.16, 0, .1, .14, .7, .14, KL.branco), B(1.1, 0, 1.25, .14, .7, .14, KL.branco), B(.1, .9, 1.5, 2.2, .06, .3, PAPEL),
        ...Array.from({ length: 11 }, (_, i) => B(.2 + i * .19, .96, 1.5, .08, .03, .17, INK)), B(.7, 1.06, 1.35, 1, .4, .04, KL.branco), B(.8, 1.12, 1.33, .8, .3, .01, PAPEL), B(.7, 0, 2.05, 1, .5, .4, KL.branco), B(.7, .5, 2.05, 1, .06, .4, KL.roxo)] },
      /* o toca-discos no móvel de nogueira, entre as duas caixas de som (toca os discos da casa) */
      { x: 1.3, z: 11.2, acao: 'discos', topo: .9, bl: [B(0, 0, 0, 2.6, .62, .5, KL.noz), B(.04, .1, .48, 2.52, .42, .02, KL.nozC), B(.3, .62, .05, .55, .05, .42, '#16171B'), B(.35, .67, .1, .45, .01, .32, '#0E0F12'), B(.52, .675, .21, .1, .005, .1, ROSA),
        B(.92, .67, .32, .3, .03, .04, KL.ouro), B(1.4, .62, .05, .8, .16, .4, KL.inox), B(1.5, .7, .45, .1, .05, .01, KL.ouro), B(1.75, .7, .45, .1, .05, .01, KL.ouro), B(-.6, 0, .05, .45, 1.3, .4, '#1A1B20'), B(-.55, .4, .45, .35, .6, .01, KL.ouroE), B(2.75, 0, .05, .45, 1.3, .4, '#1A1B20'), B(2.8, .4, .45, .35, .6, .01, KL.ouroE)] },
      { x: 6.7, z: 15.9, bl: [B(0, 0, 0, .5, .05, .5, KL.negro), B(.22, .05, .22, .06, 2.2, .06, KL.ouro), B(.22, 2.2, .22, 1.4, .06, .06, KL.ouro), luzB(B(1.4, 1.95, .08, .4, .3, .35, '#FFE9B0'))] },
      { x: .5, z: 12, bl: orquidea() }, { x: .5, z: 26.9, bl: orquidea() }, { x: 10.8, z: 26.9, bl: orquidea() },
      /* ---- a cozinha e o jantar ---- */
      { x: 24.15, z: 11.15, bl: [B(0, 0, 0, 5.7, .88, .65, KL.branco), B(-.02, .88, -.02, 5.74, .05, .69, KL.marm), B(0, .93, 0, 5.7, .72, .03, KL.marm), B(0, 1.65, 0, 5.7, .9, .38, KL.branco),
        ...Array.from({ length: 9 }, (_, i) => B(.25 + i * .62, .7, .64, .3, .03, .02, KL.ouro)), ...Array.from({ length: 9 }, (_, i) => B(.25 + i * .62, 1.7, .37, .3, .03, .02, KL.ouro)), B(.6, .93, .1, .45, .42, .38, KL.inox), B(.7, 1.12, .48, .12, .1, .01, INK)] },
      { x: 31.7, z: 11.15, bl: [B(0, 0, 0, 3.3, .88, .65, KL.branco), B(-.02, .88, -.02, 3.34, .05, .69, KL.marm), B(0, .93, 0, 3.3, .72, .03, KL.marm), B(0, 1.65, 0, 3.3, .9, .38, KL.branco),
        ...Array.from({ length: 5 }, (_, i) => B(.25 + i * .62, .7, .64, .3, .03, .02, KL.ouro)), ...Array.from({ length: 5 }, (_, i) => B(.25 + i * .62, 1.7, .37, .3, .03, .02, KL.ouro))] },
      /* na parede da direita: a geladeira dupla de inox, a torre do forno duplo, o fogão e a coifa de ouro */
      { x: 35.2, z: 11.2, bl: [B(0, 0, 0, .65, 2.5, 1.9, KL.inox), B(-.01, .05, .94, .01, 2.4, .02, '#7F868F'), B(-.05, .9, .7, .04, .9, .05, KL.ouro), B(-.05, .9, 1.15, .04, .9, .05, KL.ouro), B(0, 2.5, 0, .65, .4, 1.9, KL.branco),
        B(0, 0, 1.95, .65, 2.9, .9, KL.branco), B(-.01, .55, 2.05, .01, .6, .7, '#141519'), B(-.01, 1.25, 2.05, .01, .6, .7, '#141519'), B(-.03, 1.1, 2.15, .03, .03, .5, KL.ouro), B(-.03, 1.8, 2.15, .03, .03, .5, KL.ouro),
        B(0, 0, 2.9, .65, .88, 4.7, KL.branco), B(-.02, .88, 2.88, .69, .05, 4.74, KL.marm), B(.05, .93, 4, .55, .01, 1.5, '#141519'), ...[[.15, 4.15], [.15, 4.95], [.4, 4.15], [.4, 4.95]].map(([x, z]) => B(x, .94, z, .18, .005, .18, '#3A3D44')),
        B(-.1, 1.85, 3.9, .75, .45, 1.7, KL.ouro), B(.05, 2.3, 4.3, .5, 2, .9, KL.ouro), B(-.11, 1.85, 3.9, .02, .06, 1.7, KL.ouroE), B(0, 1.65, 5.95, .38, .9, 1.6, KL.branco), B(-.02, 1.7, 6.3, .02, .03, .3, KL.ouro), B(-.02, 1.7, 7, .02, .03, .3, KL.ouro)] },
      /* a ilha de mármore em cascata: a pia, a torneira de ouro, a fruteira; as banquetas e os três pendentes */
      { x: 28.6, z: 15.2, bl: [B(0, 0, 0, 4.8, .92, 1.4, KL.marm), B(-.04, .92, -.04, 4.88, .06, 1.48, '#F7F3EE'), B(.5, .06, 1.4, .02, .8, .005, 'rgba(150,138,120,.5)'), B(2.6, .2, 1.4, .02, .6, .005, 'rgba(150,138,120,.5)'),
        B(1.1, .98, .3, .8, .015, .5, KL.inox), B(1.45, .98, .14, .06, .42, .06, KL.ouro), B(1.45, 1.36, .14, .06, .04, .32, KL.ouro), B(3.3, .98, .45, .6, .1, .5, KL.ouro), esferaB(3.38, 1.06, .52, .18, LARANJA), esferaB(3.62, 1.06, .62, .18, '#B4152E'), esferaB(3.5, 1.1, .76, .17, LARANJA)] },
      ...[29, 30.2, 31.4, 32.6].map(x => ({ x, z: 16.75, bl: banqueta('z-') })),
      { x: 0, z: 0, bl: [29.6, 31, 32.4].flatMap(x => [B(x - .015, 3.2, 15.88, .03, 3.8, .03, INK), esferaB(x - .2, 2.85, 15.7, .4, KL.ouro), luzB(B(x - .1, 2.78, 15.8, .2, .08, .2, '#FFE9B0'))]) },
      { x: 27.4, z: 21.6, bl: [B(0, .72, 0, 5.2, .06, 1.4, KL.negro), B(-.02, .7, -.02, 5.24, .02, 1.44, KL.ouro), B(.8, 0, .45, .5, .72, .5, KL.ouro), B(3.9, 0, .45, .5, .72, .5, KL.ouro),
        B(2.3, .78, .5, .6, .3, .4, KL.ouro), ...[[2.36, .5], [2.6, .58], [2.78, .52], [2.48, .74]].map(([x, z], i) => B(x, 1.08, z, .09, .09 + (i % 2) * .05, .07, i % 2 ? '#FFD6E7' : KL.branco)), luzB(B(1.3, .78, .65, .06, .3, .06, '#FFF1C8')), luzB(B(3.8, .78, .65, .06, .3, .06, '#FFF1C8'))] },
      ...[27.6, 28.6, 29.6, 30.6, 31.6].flatMap(x => [{ x, z: 20.75, bl: cadeiraP(KL.roxo, 'z+') }, { x, z: 22.85, bl: cadeiraP(KL.roxo, 'z-') }]),
      { x: 26.45, z: 21.85, bl: cadeiraP(KL.roxo, 'x+') }, { x: 32.65, z: 21.85, bl: cadeiraP(KL.roxo, 'x-') },
      { x: 0, z: 0, bl: lustre(30, 7, 22.3, .95, 2) },
      { x: 35.3, z: 27.1, bl: orquidea() },
      /* ---- a piscina e o spa ---- */
      { x: 11.2, z: 2.4, bl: [B(-.9, 0, -.9, 1.8, .55, 1.8, '#CDBFA6'), Object.assign(B(-.9, 0, -.9, 1.8, .55, 1.8, '#CDBFA6'), { yaw: Math.PI / 4 }), Object.assign(B(-.75, .5, -.75, 1.5, .07, 1.5, KL.aguaC), { yaw: Math.PI / 4 }), B(-.75, .5, -.75, 1.5, .07, 1.5, KL.aguaC),
        B(-.92, .55, -.92, 1.84, .03, .06, KL.ouro), ...[[-.3, .2], [.25, -.3], [.1, .35], [-.4, -.25]].map(([x, z]) => luzB(B(x, .575, z, .08, .01, .08, PAPEL)))] },
      { x: 2.4, z: 8.9, bl: espreguicadeira() }, { x: 4, z: 8.9, bl: espreguicadeira() }, { x: 5.6, z: 8.9, bl: espreguicadeira() },
      { x: 6.7, z: 9.6, bl: [B(0, 0, 0, .5, .5, .5, KL.ouro), B(.1, .5, .1, .3, .32, .3, KL.inox), B(.2, .62, .2, .08, .45, .08, '#1C1C20'), B(.21, 1.05, .21, .06, .1, .06, KL.ouro), B(.05, .5, .3, .06, .2, .06, '#F4F8FF')] },
      { x: .4, z: .5, bl: orquidea() }, { x: 12.1, z: 9.9, bl: orquidea() },
      /* ---- o cinema ---- */
      { x: 13.8, z: .1, parede: true, bl: [B(0, .45, 0, 6.4, 2.85, .08, INK)] },
      { x: 13.2, z: .15, bl: [...Array.from({ length: 5 }, (_, i) => B(i * .14, 0, 0, .14, 3.45, .4 + (i % 2) * .08, i % 2 ? KL.roxoE : KL.roxo)), ...Array.from({ length: 5 }, (_, i) => B(6.9 + i * .14, 0, 0, .14, 3.45, .4 + (i % 2) * .08, i % 2 ? KL.roxoE : KL.roxo)), B(0, 3.3, 0, 7.6, .15, .5, KL.ouro)] },
      { x: 13.3, z: .9, bl: [B(0, 0, 0, .45, 1.5, .45, '#1A1B20'), B(.44, .3, .1, .01, .9, .25, KL.ouroE)] }, { x: 20.25, z: .9, bl: [B(0, 0, 0, .45, 1.5, .45, '#1A1B20'), B(-.01, .3, .1, .01, .9, .25, KL.ouroE)] },
      { x: 15.1, z: 5.3, bl: [B(0, 0, 0, 5.4, .3, 2.1, '#3A1748'), luzB(B(0, .26, 0, 5.4, .02, .03, '#FFD9A0'))] }, { x: 15.1, z: 7.4, bl: [B(0, 0, 0, 5.4, .6, 2.2, '#3A1748'), luzB(B(0, .56, 0, 5.4, .02, .03, '#FFD9A0'))] },
      ...[0, 1, 2].flatMap(r => [0, 1, 2, 3, 4].map(i => ({ x: 15.3 + i * .97, z: 3.3 + r * 2.12, bl: poltronaL(r * .3) }))),
      { x: 13.17, z: 1.2, parede: true, bl: [B(0, .3, 0, .06, 3, 8.6, '#3A1748'), ...[0, 2.15, 4.3, 6.45, 8.55].map(z => B(.06, .3, z, .02, 3, .05, KL.ouro))] },
      { x: 20.77, z: 1.2, parede: true, bl: [B(0, .3, 0, .06, 3, 8.6, '#3A1748'), ...[0, 2.15, 4.3, 6.45, 8.55].map(z => B(-.02, .3, z, .02, 3, .05, KL.ouro))] },
      { x: 20, z: 9.7, bl: [B(0, 0, 0, .7, .8, .5, '#B4152E'), B(.05, .8, .05, .6, .55, .4, '#FFF6D8'), B(.1, .82, .1, .5, .3, .3, '#F6E7B0'), B(0, 1.35, 0, .7, .1, .5, '#B4152E'), B(.3, 1.45, .2, .1, .15, .1, KL.ouro), B(.03, .8, .03, .04, .55, .04, KL.ouro), B(.63, .8, .03, .04, .55, .04, KL.ouro)] },
      /* ---- a adega ---- */
      { x: 21.2, z: .15, bl: [B(0, 0, 0, 3.6, 3.3, .45, KL.noz), ...Array.from({ length: 7 }, (_, r) => luzB(B(0, .25 + r * .44, .45, 3.6, .015, .01, '#FFE2A8'))),
        ...Array.from({ length: 56 }, (_, n) => { const r = Math.floor(n / 8), c = n % 8; return B(.14 + c * .43, .3 + r * .44, .45, .26, .2, .03, [KL.vinho, '#3A0F14', '#1C1C20', '#7A2A1E', KL.vinho, '#2A0A10'][(c + r * 2) % 6]); })] },
      { x: 21.15, z: 1.3, bl: [B(0, 0, 0, .45, 3.3, 8.4, KL.noz), ...Array.from({ length: 48 }, (_, n) => { const r = Math.floor(n / 8), c = n % 8; return B(.45, .35 + r * .5, .25 + c * 1.02, .03, .22, .5, [KL.vinho, '#1C1C20', '#7A2A1E', '#3A0F14'][(c + r) % 4]); }), ...Array.from({ length: 6 }, (_, r) => luzB(B(.45, .3 + r * .5, 0, .01, .015, 8.4, '#FFE2A8')))] },
      ...[[24, 1], [24, 8.8]].map(([x, z]) => ({ x, z, bl: [B(0, 0, 0, .8, .95, .8, '#7A4A2A'), Object.assign(B(0, 0, 0, .8, .95, .8, '#7A4A2A'), { yaw: Math.PI / 4 }), B(-.02, .2, -.02, .84, .05, .84, INK), B(-.02, .7, -.02, .84, .05, .84, INK), B(.3, .95, .3, .2, .01, .2, '#5A3A22')] })),
      { x: 23, z: 5.5, bl: [B(-.35, 0, -.25, .7, .04, .5, KL.ouro), B(-.1, 0, -.1, .2, 1.05, .2, KL.ouro), B(-.6, 1.05, -.4, 1.2, .06, .8, KL.marm), B(-.1, 1.11, -.1, .2, .2, .2, '#7A1C2A'), B(-.04, 1.31, -.04, .08, .14, .08, '#7A1C2A'),
        luzB(B(.3, 1.11, .1, .06, .16, .06, '#E8F2FF')), B(.3, 1.13, .1, .06, .05, .06, '#7A1C2A'), luzB(B(-.4, 1.11, .15, .06, .16, .06, '#E8F2FF'))] },
      { x: 22.2, z: 6.3, bl: banqueta('z-') }, { x: 23.1, z: 6.3, bl: banqueta('z-') },
      /* ---- a garagem dos esportivos ---- */
      { x: 31, z: 5.6, bl: gira(esportivo(KL.roxoC, KL.ouro), .6, 0, 0) },
      { x: 27.2, z: 3.4, bl: esportivo(KL.branco, KL.ouro) }, { x: 34.6, z: 3.4, bl: esportivo('#1A1B20', KL.ouro) },
      { x: 26.8, z: 8.2, bl: motoG(KL.roxo) },
      { x: 35.75, z: 2, parede: true, bl: [B(0, 0, 0, .08, 3.1, 7, '#2A2C33'), ...Array.from({ length: 8 }, (_, i) => B(-.02, .2 + i * .37, 0, .02, .04, 7, KL.ouroE)), B(-.03, 1.2, 3.3, .02, .1, .4, KL.ouro)] },
      { x: 34.7, z: 9.7, bl: [0, .28, .56].flatMap(y => [B(0, y, 0, .8, .26, .8, '#141519'), B(.25, y + .02, .25, .3, .24, .3, KL.ouro)]) },
      /* ---- no mezanino: as divisórias de nogueira (com o friso de ouro) entre a suíte, o gabinete e o closet ---- */
      { x: 12.9, z: 0, y: 3.6, bl: [B(0, 0, 0, .22, 3.3, 8, KL.noz), B(-.01, 3.2, 0, .24, .1, 8, KL.ouro), B(-.01, 0, 7.95, .24, 3.3, .05, KL.ouro)] },
      { x: 24.95, z: 0, y: 3.6, bl: [B(0, 0, 0, .22, 3.3, 8, KL.noz), B(-.01, 3.2, 0, .24, .1, 8, KL.ouro), B(-.01, 0, 7.95, .24, 3.3, .05, KL.ouro)] },
      /* ---- a suíte master ---- */
      { x: 4.4, z: .15, y: 3.6, bl: [B(0, 0, 0, 4.6, 3.25, .22, KL.roxo), B(-.08, 0, 0, .08, 3.3, .26, KL.ouro), B(4.6, 0, 0, .08, 3.3, .26, KL.ouro), B(-.08, 3.25, 0, 4.76, .08, .26, KL.ouro),
        ...Array.from({ length: 28 }, (_, n) => { const r = Math.floor(n / 4), c = n % 4; return B(.5 + c * 1.1 + (r % 2) * .55, .35 + r * .42, .22, .06, .06, .02, KL.ouro); })] },
      { x: 4.9, z: .37, y: 3.6, bl: [B(0, 0, 0, 3.6, .42, 2.6, KL.roxo), B(.05, .42, .05, 3.5, .22, 2.5, KL.branco), B(.05, .64, 1.55, 3.5, .05, .98, KL.roxoC), B(.05, .69, 1.55, 3.5, .01, .05, KL.ouro),
        B(.25, .64, .12, 1.4, .22, .45, KL.branco), B(1.95, .64, .12, 1.4, .22, .45, KL.branco), B(.5, .64, .58, .9, .2, .28, KL.roxo), B(2.2, .64, .58, .9, .2, .28, KL.roxo), B(1.5, .64, .64, .6, .18, .24, KL.ouro), B(0, .4, 2.6, 3.6, .03, .01, KL.ouro)] },
      { x: 5.4, z: 3.25, y: 3.6, bl: [B(0, .1, 0, 2.6, .35, .5, KL.roxoC), B(.05, 0, .05, .06, .1, .06, KL.ouro), B(2.49, 0, .05, .06, .1, .06, KL.ouro), B(.05, 0, .39, .06, .1, .06, KL.ouro), B(2.49, 0, .39, .06, .1, .06, KL.ouro)] },
      ...[3.85, 8.75].map(x => ({ x, z: .37, y: 3.6, bl: [B(0, 0, 0, .5, .55, .45, KL.espelho), B(-.01, .55, -.01, .52, .03, .47, KL.ouro), B(.2, .58, .15, .1, .4, .1, KL.ouro), luzB(B(.1, .98, .07, .3, .26, .3, '#FFE9B0'))] })),
      { x: 3.2, z: 2.2, y: 3.6, piso: true, bl: [B(0, 0, 0, 7.2, .02, 4.4, KL.creme), B(.2, .02, .2, 6.8, .004, 4, '#E9DFF0'), B(.35, .025, .35, 6.5, .003, 3.7, KL.creme)] },
      { x: .3, z: .2, y: 3.6, bl: [B(0, 0, 0, 2.6, .85, .6, KL.branco), B(-.02, .85, -.02, 2.64, .06, .64, KL.marm), B(.4, .91, .15, .5, .02, .3, KL.inox), B(1.7, .91, .15, .5, .02, .3, KL.inox), B(.62, .91, .05, .05, .3, .05, KL.ouro), B(1.92, .91, .05, .05, .3, .05, KL.ouro), B(.2, 1.2, -.02, 2.2, 1.4, .03, KL.ouro), B(.28, 1.28, .01, 2.04, 1.24, .01, KL.espelho)] },
      { x: .6, z: 6.4, y: 3.6, bl: [B(0, .1, 0, 1.9, .55, .95, KL.branco), B(.08, .6, .08, 1.74, .06, .79, KL.aguaC), ...[[.1, .1], [1.72, .1], [.1, .77], [1.72, .77]].map(([x, z]) => B(x, 0, z, .08, .12, .08, KL.ouro)), B(1.88, .65, .4, .06, .4, .06, KL.ouro), B(1.7, 1.02, .4, .24, .04, .06, KL.ouro)] },
      { x: 12.55, z: 2.6, y: 3.6, parede: true, bl: [B(0, .4, 0, .3, 1, 3, KL.negro), B(-.02, .58, .32, .04, .04, 2.36, '#2A2C33'), ...chamas(-.03, .62, .36, [.16, .24, .2, .3, .22, .27, .18, .25, .21, .29, .19, .23, .17, .26], .165, -1), B(.15, 1.75, .4, .1, 1.1, 2.2, '#101318'), B(.13, 1.72, .38, .02, 1.16, 2.24, KL.ouro)] },
      prateleiraCoringa(10.25, .16, 3.6, 'z'),
      { x: 1.6, z: 9.1, y: 3.6, bl: [B(0, 0, 0, 1.8, .4, .7, KL.roxo), B(0, .4, 0, .4, .45, .7, KL.roxo), B(.05, 0, .05, .06, .1, .06, KL.ouro), B(1.7, 0, .05, .06, .1, .06, KL.ouro)] },
      { x: 0, z: 0, y: 3.6, bl: lustre(6.6, 3.4, 1.7, .55, 1) },
      /* ---- o gabinete: os discos de ouro na parede, o tapete e o canto de olhar o hall ---- */
      { x: 17.4, z: .14, y: 3.6, parede: true, bl: [0, 1, 2, 3].flatMap(i => [B(i * 1.6, 2.45, 0, 1.1, .7, .04, INK), esferaB(i * 1.6 + .3, 2.55, .02, .5, KL.ouro), B(i * 1.6 + .5, 2.75, .05, .1, .1, .01, INK)]) },
      { x: 14.8, z: 2.8, y: 3.6, piso: true, bl: [B(0, 0, 0, 8.6, .02, 5.2, KL.roxoE), B(.2, .02, .2, 8.2, .004, 4.8, KL.roxo), B(.35, .025, .35, 7.9, .003, 4.5, '#5A2470')] },
      ...[20.9, 22.7].map(x => ({ x, z: 9, y: 3.6, bl: [B(0, 0, 0, .85, .42, .8, KL.creme), B(0, .42, 0, .85, .55, .2, KL.creme), B(-.06, .2, 0, .1, .45, .8, KL.creme), B(.81, .2, 0, .1, .45, .8, KL.creme)] })),
      { x: 21.95, z: 9.3, y: 3.6, bl: [B(0, .45, 0, .6, .04, .5, KL.marm), B(.27, 0, .2, .06, .45, .06, KL.ouro), B(.2, .49, .15, .14, .18, .14, KL.ouro)] },
      /* ---- o closet-boutique ---- */
      { x: 25.5, z: .15, y: 3.6, bl: [B(0, 0, 0, 3.7, .06, .6, KL.branco), B(0, 0, 0, 3.7, 3.1, .05, KL.branco), B(0, 2.9, 0, 3.7, .2, .6, KL.branco), B(0, 0, 0, .06, 3.1, .6, KL.branco), B(3.64, 0, 0, .06, 3.1, .6, KL.branco), B(.06, 2.4, .3, 3.58, .03, .03, KL.ouro), luzB(B(.06, 2.86, .05, 3.58, .02, .5, '#FFF1C8')),
        ...[INK, KL.branco, KL.roxo, '#B4152E', KL.ouro, '#1E2A4A', ROSA, KL.negroC, '#E9DFD0'].map((c, i) => B(.16 + i * .38, 1.18, .12, .3, 1.2, .4, c)), ...[KL.branco, INK, ROSA, KL.ouro, AZUL, KL.branco].map((c, i) => B(.2 + i * .56, .08, .2, .4, .14, .3, c))] },
      { x: 29.4, z: .15, y: 3.6, acao: 'roupa', bl: [B(0, 0, 0, 2.6, 3.1, .6, KL.branco), B(.08, .1, .6, 1.17, 2.9, .02, KL.espelho), B(1.35, .1, .6, 1.17, 2.9, .02, KL.espelho), B(1.24, .1, .6, .12, 2.9, .03, KL.ouro), B(1.1, 1.3, .62, .05, .6, .04, KL.ouro), B(1.45, 1.3, .62, .05, .6, .04, KL.ouro), B(.9, 2.6, .62, .8, .25, .02, KL.ouro)] },
      { x: 32.2, z: .15, y: 3.6, bl: [B(0, 0, 0, 3.6, 3.1, .05, KL.branco), B(0, 0, 0, .06, 3.1, .55, KL.branco), B(3.54, 0, 0, .06, 3.1, .55, KL.branco), ...[.75, 1.5, 2.25, 2.95].map(y => B(0, y, 0, 3.6, .05, .55, KL.branco)), ...[.7, 1.45, 2.2].map(y => luzB(B(.06, y, .05, 3.48, .02, .45, '#FFF1C8'))),
        ...Array.from({ length: 15 }, (_, n) => { const r = Math.floor(n / 5), c = n % 5; return B(.2 + c * .68, .8 + r * .75, .12, .42, .32 + (c % 2) * .06, .26, [KL.roxo, ROSA, KL.negro, '#E9DFD0', '#B4152E', KL.ouro, LILAS][(c + r * 2) % 7]); }),
        ...Array.from({ length: 5 }, (_, c) => B(.24 + c * .68, 1.12 + (c % 2) * .06, .38, .34, .03, .02, KL.ouro)), ...Array.from({ length: 6 }, (_, i) => B(.15 + i * .56, .06, .18, .4, .14, .3, [INK, KL.branco, '#B4152E', KL.ouro, ROSA, AZUL][i]))] },
      { x: 35.25, z: 1.2, y: 3.6, bl: [B(.55, 0, 0, .05, 3.1, 7.6, KL.branco), ...[0, .5, 1, 1.5, 2, 2.5].map(y => B(0, y + .06, 0, .6, .04, 7.6, KL.branco)), ...[0, .5, 1, 1.5, 2, 2.5].map(y => luzB(B(.05, y + .44, 0, .5, .015, 7.6, '#FFF1C8'))),
        ...Array.from({ length: 48 }, (_, n) => { const r = Math.floor(n / 8), c = n % 8; return B(.1, .1 + r * .5, .2 + c * .92, .4, .14, .5, [PAPEL, ROSA, AZUL, INK, LARANJA, LILAS, '#B4152E', KL.ouro][(c + r * 3) % 8]); })] },
      { x: 28.4, z: 4.6, y: 3.6, bl: [B(0, 0, 0, 4.2, .9, 1.6, KL.branco), ...[.45, .9, 1.35, 2.85, 3.3, 3.75].map(x => B(x - .15, .55, 1.6, .3, .03, .02, KL.ouro)), B(-.02, .9, -.02, 4.24, .05, 1.64, KL.marm), B(.2, .95, .2, 3.8, .02, 1.2, KL.roxo),
        ...[[.5, .5, KL.ouro], [1, .5, KL.inox], [1.5, .5, KL.ouro], [2, .5, KL.ouroC], [2.5, .5, KL.inox], [3, .5, KL.ouro]].map(([x, z, c]) => B(x, .97, z, .22, .04, .22, c)), B(.6, .97, 1, .5, .04, .14, INK), B(1.4, .97, 1, .5, .04, .14, KL.negroC), B(2.4, .97, 1, .12, .04, .12, KL.ouroC), B(2.8, .97, 1, .12, .04, .12, '#FFD6E7')] },
      { x: 30.5, z: 8.2, y: 3.6, bl: [B(-.45, 0, -.45, .9, .42, .9, KL.roxo), Object.assign(B(-.45, 0, -.45, .9, .42, .9, KL.roxo), { yaw: Math.PI / 4 }), B(-.05, .42, -.05, .1, .02, .1, KL.ouro)] },
      { x: 25.17, z: 2.8, y: 3.6, parede: true, bl: [B(0, 0, 0, .05, 2.3, 1.3, KL.ouro), B(.05, .08, .08, .02, 2.14, 1.14, KL.espelho)] },
      { x: 0, z: 0, y: 3.6, bl: lustre(30.5, 3.4, 5.4, .5, 1) }
    ]
  };
  const LUGARES = {
    horus: { titulo: 'Casa do Hórus', planta: PLANTA_HORUS, ola: 'Casa do Hórus. O radar é o altar do meio: chega e toca.',
      estacoes: () => [{ id: 'radar', liga: 'horus', titulo: 'Radar do Hórus', rota: '#/horus', cor: INK, x: 5.6, z: 5, w: 2.8, d: 2.8, bl: RADAR, tag: [1.4, 1.75, 1.4], y: 0 }] },
    studio: { titulo: 'O Estúdio', planta: PLANTA_ESTUDIO, ola: 'O Estúdio. A mesa de criação abre o Studio Cria: chega e toca.',
      estacoes: () => [{ id: 'studio', titulo: 'Mesa de criação', rota: '#/studio', cor: AMARELO, x: 7.4, z: .9, w: 4.2, d: 1.2, bl: ESTUDIO_MESA, tag: [2.1, 2.05, .6], y: 0 }],
      itens: [['cadeira_gamer', 10.4, 2.3, 2, 0, 2], ['banqueta', 2.4, 1.4, 0, 0, 2], ['mic_pedestal', 6, 4.4, 0, 0, 0], ['cabine_foto', 11.6, 6, 0, 0, 0], ['pufe', 8.6, 8.6, 0, 0, 0],
        ['bean_bag', 9.8, 8.4, 0, 0, 1], ['luminaria', .4, 10, 0, 0, 0], ['neon_raio', 5.9, .15, 0, 0, 0], ['varal_luzes', 8.4, 9.6, 0, 0, 0], ['tapete', 8.6, 7.6, 1, 0, 2]] },
    vendas: { titulo: 'O Balcão', planta: PLANTA_BALCAO, ola: 'O Balcão. A caixa registradora abre as tuas vendas: chega e toca.',
      estacoes: () => [{ id: 'vendas', titulo: 'Caixa registradora', rota: '#/vendas', cor: LARANJA, x: 5.3, z: 3.45, w: 1.4, d: .8, bl: BALCAO_CAIXA, tag: [.7, 1.95, .35], y: 0 }],
      itens: [['banqueta', 5.5, 2.2, 0, 0, 4], ['maquina_refri', .3, 5.4, 1, 0, 0], ['geladeira_bebidas', .3, 6.6, 1, 0, 0], ['vaso', .4, 9.4, 0, 0, 0], ['vaso', 10.6, 9.4, 0, 0, 1],
        ['carrinho_bar', 10.7, 5.6, 3, 0, 0], ['relogio', 5.5, .15, 0, 0, 0]] },
    grana: { titulo: 'O Cofre', planta: PLANTA_COFRE, ola: 'O Cofre. A porta do cofre abre a tua grana: chega e toca.',
      estacoes: () => [{ id: 'grana', titulo: 'Porta do cofre', rota: '#/grana', cor: AZUL, parede: true, x: 4.2, z: .15, w: 3.6, d: .1, bl: portaCofre(), tag: [1.8, 2.3, .6], y: 0 }],
      itens: [['cofre', .4, .6, 0, 0, 0], ['cofre', 10.6, .6, 0, 0, 0], ['capivara_ouro', 1, 10.2, 0, 0, 0], ['estatua', 10, 10.2, 0, 0, 0]] },
    marcas: { titulo: 'A Galeria', planta: PLANTA_GALERIA, ola: 'A Galeria. O catálogo aberto no meio é o teu portfólio: chega e toca.',
      estacoes: () => [{ id: 'marcas', titulo: 'O catálogo', rota: '#/marcas', cor: '#E2412E', x: 6, z: 6.2, w: 2, d: 1.2, bl: GALERIA_CATALOGO, tag: [1, 1.8, .6], y: 0 }],
      itens: [['banco_madeira', 1, 2.8, 0, 0, 3], ['banco_madeira', 11, 2.8, 0, 0, 3], ['estatua', 12.3, 10.4, 0, 0, 0], ['vaso', .6, 10.4, 0, 0, 0],
        ['pendente', 3, 3.4, 0, 0, 2], ['pendente', 7, 3.4, 0, 0, 2], ['pendente', 11, 3.4, 0, 0, 2]] },
    feed: { titulo: 'O Beco', planta: PLANTA_BECO, ola: 'O Beco. O paredão de lambe-lambe no fundo é o feed: chega e toca.',
      estacoes: () => [{ id: 'feed', titulo: 'Paredão do feed', rota: '#/', cor: ROSA, parede: true, x: 1, z: .15, w: 8, d: .1, bl: PAREDAO, tag: [4, 2.5, .6], y: 0 }],
      itens: [['banco_praca', .3, 2.5, 1, 0, 0], ['bike', .3, 4.8, 1, 0, 1], ['corrimao', 3.4, 6.6, 0, 0, 0], ['skate', 6.4, 7.4, 0, 0, 2], ['poste', 8.6, 7.6, 0, 0, 0], ['cone', 3.2, 10.4, 0, 0, 0],
        ['cone', 6.2, 4.4, 0, 0, 0], ['lixeira_rua', 8.7, 10.3, 0, 0, 0], ['hidrante', .3, 12.2, 0, 0, 0], ['orelhao', 8.7, 11.8, 3, 0, 0], ['quadro_grafite', 9.75, 8, 3, 0, 0],
        ['placa_rua', .15, 1.2, 1, 0, 0], ['varal_luzes', 3.5, 3.5, 0, 0, 0], ['varal_luzes', 3.5, 8.5, 0, 0, 0]] },
    nicho: { titulo: 'A Biblioteca', planta: PLANTA_BIBLIO, ola: 'A Biblioteca. A mesa de referências abre o Do teu nicho: chega e toca.',
      estacoes: () => [{ id: 'nicho', titulo: 'Mesa de referências', rota: '#/refs', cor: '#8F86E8', x: 3.6, z: 5.4, w: 5.8, d: 1.4, bl: BIBLIO_MESA, tag: [2.9, 1.7, .7], y: 0 }],
      itens: [['estante', .2, 2.2, 1, 0, 1], ['estante', .2, 4.6, 1, 0, 1], ['estante', 11.8, 2.2, 3, 0, 1], ['estante', 11.8, 4.4, 3, 0, 1], ['cadeira', 4.6, 4.2, 0, 0, 3], ['cadeira', 6, 4.2, 0, 0, 3],
        ['cadeira', 7.4, 4.2, 0, 0, 3], ['poltrona', .4, 8, 1, 0, 3], ['mesa_lateral', .4, 9.1, 0, 0, 1], ['poltrona', .4, 10.2, 1, 0, 3], ['tapete_redondo', 1.4, 8.6, 0, 0, 3],
        ['estante_manga', 11.8, 10.6, 3, 0, 0], ['luminaria', 2.6, 10.6, 0, 0, 0], ['lustre', 6, 7, 0, 0, 0]] },
    estilo: { titulo: 'A Vitrine', planta: PLANTA_VITRINE, ola: 'A Vitrine. A calculadora faz a conta do teu estilo de vida: chega e toca.',
      estacoes: () => [{ id: 'estilo', titulo: 'A conta do mês', rota: '#/estilo', cor: LILAS, x: 6, z: 4.4, w: 2, d: 1.2, bl: CALCULADORA, tag: [1, 2.45, .5], y: 0 }],
      itens: [['sofa', 1.4, 2.6, 0, 0, 5], ['mesa_lateral', 3.5, 2.6, 0, 0, 2], ['espreguicadeira', 1.4, 6.8, 0, 0, 1], ['guarda_sol', 2.5, 6.9, 0, 0, 0], ['prancha', 3.5, 7.2, 0, 0, 3],
        ['piano', 10.2, 6.9, 0, 0, 0], ['pendente', 3, 3, 0, 0, 3], ['pendente', 11, 3, 0, 0, 3], ['vaso', .5, 10.4, 0, 0, 3], ['vaso', 12.5, 10.4, 0, 0, 3]] },
    manual: { titulo: 'A Escolinha', planta: PLANTA_ESCOLA, ola: 'A Escolinha. A lousa abre o manual do Corre: chega e toca.',
      estacoes: () => [{ id: 'manual', titulo: 'A lousa', rota: '', cor: CEU, parede: true, x: 2.5, z: .15, w: 7, d: .1, bl: LOUSA, tag: [3.5, 2.3, .6], y: 0 }],
      itens: [['relogio', 10.1, .15, 0, 0, 0], ['estante', .2, .6, 1, 0, 0], ['quadro_avisos', 11.75, 4, 3, 0, 0], ['bebedouro', 10.8, 8.6, 0, 0, 0], ['vaso', .4, 9.6, 0, 0, 0]] },
    rolo: { titulo: 'O Cineclube', planta: PLANTA_CINE, ola: 'O Cineclube. O projetor perto da porta abre o Rolo 360: chega e toca.',
      estacoes: () => [{ id: 'rolo', titulo: 'O projetor', rota: '#/rolo', cor: '#8E4B2B', x: 8.6, z: 10, w: 1.4, d: 1.1, bl: PROJETOR, tag: [.7, 2.5, .5], y: 0 }],
      itens: [['arandela', .15, 3, 1, 0, 0], ['arandela', .15, 9.6, 1, 0, 0], ['arandela', 11.75, 3, 3, 0, 0], ['arandela', 11.75, 9.6, 3, 0, 0]] },
    sebo: { titulo: 'O Sebo', sai: 'Sair pra rua', planta: PLANTA_SEBO, ola: 'O Sebo. Nos caixotes do meio você escolhe disco pra levar pra tua casa: chega e toca.',
      estacoes: () => [{ id: 'sebo', abre: 'sebo', titulo: 'Caixotes de discos', rota: '', cor: '#8E4B2B', x: 3.6, z: 4.4, w: 4.8, d: 1.4, bl: CAIXOTES, tag: [2.4, 1.6, .7], y: 0 }],
      itens: [['jukebox', 10.8, 2.6, 3, 0, 0], ['pilha_discos', 1.2, 9.2, 0, 0, 0], ['pilha_discos', 2.3, 9.4, 0, 0, 0], ['gato', 1.6, 8.1, 0, 0, 1], ['poltrona', 10.7, 8.8, 3, 0, 4],
        ['luminaria', .4, 6.8, 0, 0, 0], ['toca_discos', 9.4, 8.8, 0, 0, 0]] },
    pesca: { titulo: 'Torneio de Pesca', sai: 'Sair pra rua', planta: PLANTA_PESCA, ola: 'Torneio de Pesca do Igapó. Vai num balde da beira e toca; quando a boia afundar, puxa! A rodada é de 3 minutos.',
      estacoes: () => [],
      itens: [['podio', 2.2, 12.4, 0, 0, 0], ['capivara_ouro', 4.3, 12.5, 0, 0, 0], ['caixa_termica', 8.6, 12.6, 0, 0, 0], ['banco_madeira', 11.4, 12.9, 0, 0, 0], ['poste', 5.2, 11.6, 0, 0, 0]] },
    moto: { titulo: 'Autódromo do Café', sai: 'Sair pra rua', planta: PLANTA_MOTO, ola: 'Autódromo do Café. Vai no totem da bandeira, escolhe moto ou carro e larga: 3 voltas no circuito, contra o relógio. Rampa, costela, óleo, cone e pneu na pista.', estacoes: () => [], corrida: PISTA_MOTO },
    /* v3.53: as três pistas de kart do patinete (a placa da cidade abre a escolha) */
    ...Object.fromEntries(Object.keys(KART_DEF).map(k => [k, { titulo: KART_DEF[k].nome, sai: 'Sair pra rua', planta: PLANTAS_KART[k], ola: `${KART_DEF[k].nome}. Vai no totem da bandeira, escolhe teu bicho e larga: sempre seis na pista (quem faltar, a máquina pilota).`, estacoes: () => [], corrida: PISTA_KART(k) }])),
    'quadra-futsal': { titulo: 'Quadra do Zerão', sai: 'Sair pra rua', planta: PLANTA_FUTSAL, ola: 'Quadra do Zerão. Na caixa de bolas, toca em "Desafio de pênalti": 10 cobranças contra o goleiro.', estacoes: () => [], desafio: DESAFIOS.futsal,
      itens: [['banco_madeira', 1.4, 12.2, 0, 0, 3], ['banco_madeira', 14.6, 12.2, 0, 0, 3], ['bebedouro', 16.6, 9.5, 3, 0, 0]] },
    'quadra-basquete': { titulo: 'Quadra de basquete', sai: 'Sair pra rua', planta: PLANTA_BASQ, ola: 'Quadra de basquete. Na caixa de bolas, toca em "Desafio de arremesso": 10 arremessos, 5 de dois e 5 de três.', estacoes: () => [], desafio: DESAFIOS.basquete,
      itens: [['banco_madeira', 1, 12.3, 0, 0, 3], ['banco_madeira', 12.8, 12.6, 0, 0, 3], ['bebedouro', 15, 8.5, 3, 0, 0]] },
    /* v3.57: o campo da ACEL (a porta da cidade entra aqui) */
    /* v3.77: o Calçadão de Londrina (a porta é no Calçadão da cidade) */
    calcadao: { titulo: 'Calçadão de Londrina', sai: 'Sair pra rua', planta: PLANTA_CALCADAO, calc: true, ola: 'O Calçadão de Londrina, desde 1977. Senta num banco que o povo puxa assunto; arrasta pra cima e olha o Relojão: ele marca a hora de verdade.', estacoes: () => [],
      itens: [['orelhao', 9.5, 14.6, 1, 0, 0], ['orelhao', 25.5, 52, 3, 0, 0], ['lixeira_rua', 9.6, 27, 0, 0, 0], ['lixeira_rua', 25.9, 9.5, 0, 0, 0], ['lixeira_rua', 9.6, 56, 0, 0, 0], ['lixeira_rua', 25.9, 68, 0, 0, 0], ['ponto_onibus', 28.6, 85.2, 0, 0, 0]] },
    beisebol: { titulo: 'ACEL · Beisebol', sai: 'Sair pra rua', planta: PLANTA_BEISEBOL, ola: 'ACEL, o campo de beisebol. No suporte dos tacos, toca em "Desafio de rebatida": 10 arremessos. Rebate quando a bola chegar na base: home run vale 4.', estacoes: () => [], desafio: DESAFIOS.beisebol }
  };
  /* a estação que é só do fundador aparece na casa do fundador (pra ele e pra quem visita) */
  const paraDono = (e, dono) => e.so !== 'fundador' || ehDoFundador(dono);
  const estAberta = e => (e.id !== 'horus' && e.liga !== 'horus') || !C.ferr || C.ferr('horus');

  /* ---------- 3D: caixas, câmera e projeção ---------- */
  const FACES = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [3, 2, 6, 7], [0, 3, 7, 4], [1, 2, 6, 5]];
  const LUZ = (() => { const l = [.3, 1, .55], n = Math.hypot(...l); return l.map(v => v / n); })();
  /* os 8 cantos de uma caixa no mundo; T = lista de giros (yaw em torno de y, pitch em torno de x) com o pivô de cada um */
  function cantos(b, T){
    const out = [];
    for(let i = 0; i < 8; i++){
      const q = i & 3; let x = b.x + (q === 1 || q === 2 ? b.w : 0), y = b.y + (i >= 4 ? b.h : 0), z = b.z + (q >= 2 ? b.d : 0);
      if(T) for(const t of T){
        const [px, py, pz] = t.piv; x -= px; y -= py; z -= pz;
        if(t.pitch){ const c = Math.cos(t.pitch), s = Math.sin(t.pitch), y2 = y * c - z * s, z2 = y * s + z * c; y = y2; z = z2; }
        if(t.roll){ const c = Math.cos(t.roll), s = Math.sin(t.roll), x2 = x * c - y * s, y2 = x * s + y * c; x = x2; y = y2; }
        if(t.yaw){ const c = Math.cos(t.yaw), s = Math.sin(t.yaw), x2 = x * c + z * s, z2 = -x * s + z * c; x = x2; z = z2; }
        x += px; y += py; z += pz;
      }
      out.push([x, y, z]);
    }
    return out;
  }
  /* uma caixa pode vir girada (yaw em volta de y, pitch em volta de x, roll em volta de z), com pivô próprio ou no centro dela */
  const solido = (b, T, cor, dono, extra) => {
    const TT = (b.yaw || b.pitch || b.roll) ? [{ yaw: b.yaw || 0, pitch: b.pitch || 0, roll: b.roll || 0, piv: b.piv || [b.x + b.w / 2, b.y + b.h / 2, b.z + b.d / 2] }].concat(T || []) : T;
    const v = cantos(b, TT); let cx = 0, cy = 0, cz = 0; v.forEach(p => { cx += p[0]; cy += p[1]; cz += p[2]; }); cx /= 8; cy /= 8; cz /= 8;
    const raio = Math.hypot(b.w, b.h, b.d) / 2;
    return Object.assign({ v, c: cor || b.c, cx, cy, cz, raio, dono }, b.ex || null, extra || {});
  };
  /* v3.52 · a esfera (bola de verdade): na tela é um círculo com a luz do sol e o desenho dela (gomos, costura);
     na ordem de desenho vale a caixa em volta. desenho: 'futsal', 'basquete', 'boia' ou nada; gira: o giro (rad) */
  const esfera = (x, y, z, r, c, dono, extra) => Object.assign(solido({ x: x - r, y: y - r, z: z - r, w: r * 2, h: r * 2, d: r * 2, c }, null, c, dono, {}), { esfera: r }, extra || {});
  /* os 12 gomos pretos da bola de futebol ficam nos vértices de um icosaedro */
  const ICO = (() => { const p = (1 + Math.sqrt(5)) / 2, n = Math.hypot(1, p), out = [];
    [1, -1].forEach(a => [1, -1].forEach(b => out.push([0, a / n, b * p / n], [a / n, b * p / n, 0], [a * p / n, 0, b / n]))); return out; })();
  const giraV = (v, a) => { const ca = Math.cos(a), sa = Math.sin(a), y = v[1] * ca - v[2] * sa, z = v[1] * sa + v[2] * ca, cb = Math.cos(a * .7), sb = Math.sin(a * .7); return [v[0] * cb + z * sb, y, -v[0] * sb + z * cb]; };
  function bola(ctx, cam, s, x, y, r){
    const L = LUZ, lx = L[0] * cam.r[0] + L[1] * cam.r[1] + L[2] * cam.r[2], ly = L[0] * cam.u[0] + L[1] * cam.u[1] + L[2] * cam.u[2];
    const hx = x + lx * r * .42, hy = y - ly * r * .42, g = ctx.createRadialGradient(hx, hy, r * .04, x, y, r * 1.02);
    g.addColorStop(0, luzTom(s.c, 1)); g.addColorStop(.5, luzTom(s.c, .5)); g.addColorStop(1, luzTom(s.c, -.5));
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
    if(s.desenho && r > 1.5){
      ctx.save(); ctx.clip(); const tv = v => [v[0] * cam.r[0] + v[1] * cam.r[1] + v[2] * cam.r[2], v[0] * cam.u[0] + v[1] * cam.u[1] + v[2] * cam.u[2], -(v[0] * cam.f[0] + v[1] * cam.f[1] + v[2] * cam.f[2])];
      if(s.desenho === 'futsal'){
        ctx.fillStyle = 'rgba(30,32,40,.88)';
        ICO.forEach(v0 => { const q = tv(giraV(v0, s.gira || 0)); if(q[2] <= .05) return; const px = x + q[0] * r, py = y - q[1] * r, rr = r * .23;
          ctx.beginPath(); for(let i = 0; i < 5; i++){ const a = (s.gira || 0) + i * Math.PI * .4; ctx.lineTo(px + Math.cos(a) * rr, py + Math.sin(a) * rr * (.35 + .65 * q[2])); } ctx.closePath(); ctx.fill(); });
      } else if(s.desenho === 'basquete' || s.desenho === 'globo'){
        /* as linhas da bola (costura do basquete, ou a grade de espelhinhos do globo): círculos da esfera, girados
           junto com ela, e só o pedaço da frente aparece */
        const gl = s.desenho === 'globo', G = s.gira || 0, N = 24;
        const linha = f2 => { ctx.beginPath(); let ok = false; for(let i = 0; i <= N; i++){ const q = tv(giraV(f2(i / N * Math.PI * 2), G)); if(q[2] > -.02){ const px = x + q[0] * r, py = y - q[1] * r; if(ok) ctx.lineTo(px, py); else ctx.moveTo(px, py); ok = true; } else ok = false; } ctx.stroke(); };
        ctx.strokeStyle = gl ? 'rgba(40,44,52,.5)' : 'rgba(30,20,16,.85)'; ctx.lineWidth = Math.max(1, r * (gl ? .035 : .07));
        const lats = gl ? [-.7, -.35, 0, .35, .7] : [0], lons = gl ? [0, 1, 2, 3, 4, 5].map(k => k * Math.PI / 6) : [0, Math.PI / 2];
        lats.forEach(h => { const p = Math.sqrt(1 - h * h); linha(a => [Math.cos(a) * p, h, Math.sin(a) * p]); });
        lons.forEach(fi => linha(a => [Math.cos(a) * Math.cos(fi), Math.sin(a), Math.cos(a) * Math.sin(fi)]));
        if(gl){ ctx.fillStyle = 'rgba(255,255,255,.85)'; for(let k = 0; k < 9; k++){ const a = k * 2.4 + G * 2, h = Math.sin(k * 1.7) * .8, p = Math.sqrt(1 - h * h), q = tv(giraV([Math.cos(a) * p, h, Math.sin(a) * p], G)); if(q[2] > .35) ctx.fillRect(x + q[0] * r - r * .06, y - q[1] * r - r * .06, r * .12, r * .12); } }
      } else if(s.desenho === 'beisebol'){
        /* a costura vermelha da bola de beisebol: a curva de tênis (duas voltas em S), girando junto */
        const G = s.gira || 0, N = 40; ctx.strokeStyle = 'rgba(212,40,46,.92)'; ctx.lineWidth = Math.max(1, r * .08); ctx.beginPath(); let ok = false;
        for(let i = 0; i <= N; i++){ const t2 = i / N * Math.PI * 2, v = [.62 * Math.cos(t2) + .23 * Math.cos(3 * t2), .62 * Math.sin(t2) - .23 * Math.sin(3 * t2), .55 * Math.sin(2 * t2)], n = Math.hypot(...v), q = tv(giraV([v[0] / n, v[1] / n, v[2] / n], G));
          if(q[2] > -.02){ const px = x + q[0] * r, py = y - q[1] * r; if(ok) ctx.lineTo(px, py); else ctx.moveTo(px, py); ok = true; } else ok = false; }
        ctx.stroke();
      } else if(s.desenho === 'boia'){
        ctx.fillStyle = luzTom('#F4EFE6', .7); ctx.fillRect(x - r, y, r * 2, r);
      }
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(hx, hy, r * .16, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.32)'; ctx.fill();
    if(!s.semTraco){ ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.strokeStyle = s.traco || 'rgba(15,18,24,.5)'; ctx.lineWidth = S.lw || 1; ctx.stroke(); }
  }
  /* v3.53 · a placa com desenho: um retângulo no mundo com um canvas por cima. O canvas 2D não faz perspectiva, então
     o retângulo vai em pedaços de triângulo (cada um esticado certinho); em pedaço pequeno, o erro some */
  function triImg(ctx, img, p0, p1, p2, u0, v0, u1, v1, u2, v2){
    const du1 = u1 - u0, dv1 = v1 - v0, du2 = u2 - u0, dv2 = v2 - v0, det = du1 * dv2 - du2 * dv1; if(!det) return;
    const dx1 = p1[0] - p0[0], dy1 = p1[1] - p0[1], dx2 = p2[0] - p0[0], dy2 = p2[1] - p0[1];
    const a = (dx1 * dv2 - dx2 * dv1) / det, b = (dy1 * dv2 - dy2 * dv1) / det, c = (dx2 * du1 - dx1 * du2) / det, d = (dy2 * du1 - dy1 * du2) / det;
    const cx = (p0[0] + p1[0] + p2[0]) / 3, cy = (p0[1] + p1[1] + p2[1]) / 3, sai = p => { const vx = p[0] - cx, vy = p[1] - cy, n = Math.hypot(vx, vy) || 1; return [p[0] + vx / n * .7, p[1] + vy / n * .7]; };
    const q0 = sai(p0), q1 = sai(p1), q2 = sai(p2);
    ctx.save(); ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]); ctx.lineTo(q2[0], q2[1]); ctx.closePath(); ctx.clip();
    ctx.transform(a, b, c, d, p0[0] - a * u0 - c * v0, p0[1] - b * u0 - d * v0); ctx.drawImage(img, 0, 0); ctx.restore();
  }
  /* P4 = [cima-esquerda, cima-direita, baixo-direita, baixo-esquerda], no mundo; falso se algum canto tá atrás da câmera */
  function imgNoQuad(ctx, cam, P4, img, nx, ny){
    const W = img.width, H = img.height, L = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u], g = [];
    for(let j = 0; j <= ny; j++){ const lin = [], e = L(P4[0], P4[3], j / ny), d = L(P4[1], P4[2], j / ny); for(let i = 0; i <= nx; i++){ const q = proj(cam, L(e, d, i / nx)); if(!q) return false; lin.push(q); } g.push(lin); }
    for(let j = 0; j < ny; j++) for(let i = 0; i < nx; i++){ const u0 = i / nx * W, u1 = (i + 1) / nx * W, v0 = j / ny * H, v1 = (j + 1) / ny * H;
      triImg(ctx, img, g[j][i], g[j][i + 1], g[j + 1][i], u0, v0, u1, v0, u0, v1); triImg(ctx, img, g[j][i + 1], g[j + 1][i + 1], g[j + 1][i], u1, v0, u1, v1, u0, v1); }
    return true;
  }
  /* o sólido da placa: pra ordem de desenho vale a caixa em volta; o desenho é a imagem (ou a cor, de costas) */
  const painelSol = (P4, img, cor, dono) => { const xs = P4.map(p => p[0]), ys = P4.map(p => p[1]), zs = P4.map(p => p[2]), x0 = Math.min(...xs), y0 = Math.min(...ys), z0 = Math.min(...zs);
    return Object.assign(solido(B(x0, y0, z0, Math.max(.02, Math.max(...xs) - x0), Math.max(.02, Math.max(...ys) - y0), Math.max(.02, Math.max(...zs) - z0), cor), null, cor, dono, {}), { img, P4 }); };
  /* sobe um sólido (ou vários) pra um andar */
  const sobe = (ss, y) => { if(y) ss.forEach(s => { s.v.forEach(v => { v[1] += y; }); s.cy += y; }); return ss; };
  function camera(cv){
    const c = S.cam, cy = Math.cos(c.ph), sy = Math.sin(c.ph);
    const pos = [c.tx + Math.sin(c.th) * cy * c.dist, c.ty + sy * c.dist, c.tz + Math.cos(c.th) * cy * c.dist];
    let f = [c.tx - pos[0], c.ty - pos[1], c.tz - pos[2]]; let n = Math.hypot(...f); f = f.map(v => v / n);
    let r = [-f[2], 0, f[0]]; n = Math.hypot(...r) || 1; r = r.map(v => v / n);
    const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
    /* em pé (celular), a tela é estreita: abre o ângulo pra casa caber na largura */
    const asp = cv.width / Math.max(1, cv.height), fov = c.fov || Math.max(50, Math.min(80, 2 * Math.atan(Math.tan(28 * Math.PI / 180) / asp) * 180 / Math.PI)) * Math.PI / 180;
    const F = (cv.height / 2) / Math.tan(fov / 2);
    return { pos, f, r, u, F, cx: cv.width / 2, cy: cv.height / 2 };
  }
  const PERTO = .15;
  function proj(cam, p){
    const vx = p[0] - cam.pos[0], vy = p[1] - cam.pos[1], vz = p[2] - cam.pos[2];
    const z = vx * cam.f[0] + vy * cam.f[1] + vz * cam.f[2]; if(z < .08) return null;
    const x = vx * cam.r[0] + vy * cam.r[1] + vz * cam.r[2], y = vx * cam.u[0] + vy * cam.u[1] + vz * cam.u[2];
    return [cam.cx + x / z * cam.F, cam.cy - y / z * cam.F, z];
  }
  /* o ponto no espaço da câmera (x pra direita, y pra cima, z pra frente) */
  const noOlho = (cam, p) => { const vx = p[0] - cam.pos[0], vy = p[1] - cam.pos[1], vz = p[2] - cam.pos[2]; return [vx * cam.r[0] + vy * cam.r[1] + vz * cam.r[2], vx * cam.u[0] + vy * cam.u[1] + vz * cam.u[2], vx * cam.f[0] + vy * cam.f[1] + vz * cam.f[2]]; };
  const naTela = (cam, e) => [cam.cx + e[0] / e[2] * cam.F, cam.cy - e[1] / e[2] * cam.F, e[2]];
  /* um polígono do mundo na tela: o que fica atrás da câmera é cortado no plano perto (Sutherland-Hodgman), o resto
     vira pontos da tela. null = nada aparece */
  function projPoly(cam, pts){
    const E = pts.map(p => noOlho(cam, p)); let atras = 0; E.forEach(e => { if(e[2] < PERTO) atras++; });
    if(!atras) return E.map(e => naTela(cam, e));
    if(atras === E.length) return null;
    const out = [];
    for(let i = 0; i < E.length; i++){
      const a = E[i], b = E[(i + 1) % E.length], ai = a[2] >= PERTO, bi = b[2] >= PERTO;
      if(ai) out.push(a);
      if(ai !== bi){ const t = (PERTO - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, PERTO]); }
    }
    return out.length >= 3 ? out.map(e => naTela(cam, e)) : null;
  }
  function projSeg(cam, a, b){
    let A = noOlho(cam, a), B = noOlho(cam, b);
    if(A[2] < PERTO && B[2] < PERTO) return null;
    if(A[2] < PERTO){ const t = (PERTO - A[2]) / (B[2] - A[2]); A = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, PERTO]; }
    else if(B[2] < PERTO){ const t = (PERTO - B[2]) / (A[2] - B[2]); B = [B[0] + (A[0] - B[0]) * t, B[1] + (A[1] - B[1]) * t, PERTO]; }
    return [naTela(cam, A), naTela(cam, B)];
  }
  /* de um ponto da tela pro chão (o plano y = y0: o térreo ou a laje do mezanino) */
  function chao(cam, sx, sy, y0){
    const a = (sx - cam.cx) / cam.F, b = -(sy - cam.cy) / cam.F;
    const d = [cam.f[0] + cam.r[0] * a + cam.u[0] * b, cam.f[1] + cam.r[1] * a + cam.u[1] * b, cam.f[2] + cam.r[2] * a + cam.u[2] * b];
    if(d[1] >= -1e-4) return null;
    const t = ((y0 || 0) - cam.pos[1]) / d[1]; if(t < 0) return null;
    return { x: cam.pos[0] + d[0] * t, z: cam.pos[2] + d[2] * t };
  }
  const dentro = (pt, poly) => { let ok = false; for(let i = 0, j = poly.length - 1; i < poly.length; j = i++){ const a = poly[i], b = poly[j]; if((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0]) ok = !ok; } return ok; };

  /* a ordem de desenho. Só pela distância do centro erra quando as caixas têm tamanhos muito diferentes (parede
     comprida x enfeite pequeno) ou encostam (cabeceira em cima da cama). Aqui: cada par que se cruza na tela e dá pra
     separar por um plano ganha uma regra (quem tá do lado da câmera vai depois); a lista sai dessas regras, e onde não
     tem regra vale a distância (o mais longe primeiro). Os pares são achados varrendo a tela da esquerda pra direita. */
  function ajustaOrdem(sol, cam){
    const n = sol.length, P = cam.pos, TW = cam.cx * 2, TH = cam.cy * 2;
    for(let i = 0; i < n; i++){
      const s = sol[i];
      let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity, a = Infinity, b = Infinity, c = -Infinity, d = -Infinity, atrasCam = false;
      const marca = q => { if(q[0] < a) a = q[0]; if(q[0] > c) c = q[0]; if(q[1] < b) b = q[1]; if(q[1] > d) d = q[1]; };
      for(const v of s.v){
        if(v[0] < x0) x0 = v[0]; if(v[0] > x1) x1 = v[0]; if(v[1] < y0) y0 = v[1]; if(v[1] > y1) y1 = v[1]; if(v[2] < z0) z0 = v[2]; if(v[2] > z1) z1 = v[2];
        const e = noOlho(cam, v); if(e[2] < PERTO){ atrasCam = true; continue; }
        marca(naTela(cam, e));
      }
      /* parte atrás da câmera: a caixa da tela sai das faces já cortadas no plano perto (senão "cobriria" a tela toda) */
      if(atrasCam){ a = b = Infinity; c = d = -Infinity; for(const f of FACES){ const q = projPoly(cam, [s.v[f[0]], s.v[f[1]], s.v[f[2]], s.v[f[3]]]); if(q) q.forEach(marca); } }
      /* só importa o pedaço que cai dentro da tela */
      if(a < 0) a = 0; if(b < 0) b = 0; if(c > TW) c = TW; if(d > TH) d = TH;
      s.bb = [x0, y0, z0, x1, y1, z1]; s.sb = a < c && b < d ? [a, b, c, d] : null; s.oi = i; s.ent = 0; s.sai = null; s.feito = false;
    }
    /* 1: A fica atrás de B (A primeiro); -1: B atrás de A; 0: não dá pra dizer (as caixas se misturam) */
    /* se dois planos separadores discordam, nenhum raio da câmera passa pelos dois: na tela eles não se cobrem de
       verdade (só as caixas da tela se encostam) e a ordem entre eles não importa. Sem regra nesse caso, senão vira
       ciclo e bagunça o resto */
    const atras = (A, B) => {
      let r = 0;
      for(let k = 0; k < 3; k++){
        let q = 0;
        if(A.bb[k + 3] <= B.bb[k] + 1e-4) q = P[k] > (A.bb[k + 3] + B.bb[k]) / 2 ? 1 : -1;
        else if(B.bb[k + 3] <= A.bb[k] + 1e-4) q = P[k] < (B.bb[k + 3] + A.bb[k]) / 2 ? 1 : -1;
        if(q){ if(r && r !== q) return 0; r = q; }
      }
      return r;
    };
    const liga = (A, B) => { (A.sai || (A.sai = [])).push(B); B.ent++; };
    const vis = sol.filter(s => s.sb).sort((p, q) => p.sb[0] - q.sb[0]);
    const ativos = [];
    for(const s of vis){
      for(let k = ativos.length - 1; k >= 0; k--) if(ativos[k].sb[2] < s.sb[0]){ ativos[k] = ativos[ativos.length - 1]; ativos.pop(); }
      for(const o of ativos){
        if(o.sb[1] >= s.sb[3] || s.sb[1] >= o.sb[3]) continue;
        const r = atras(o, s);
        if(r === 1) liga(o, s); else if(r === -1) liga(s, o);
      }
      ativos.push(s);
    }
    /* monta a lista: sempre o mais longe entre os que já podem ir (heap pela posição na ordem da distância) */
    const heap = [], sobe = i => { while(i > 0){ const p = (i - 1) >> 1; if(heap[p].oi <= heap[i].oi) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const desce = i => { for(;;){ const l = 2 * i + 1, r = l + 1; let m = i; if(l < heap.length && heap[l].oi < heap[m].oi) m = l; if(r < heap.length && heap[r].oi < heap[m].oi) m = r; if(m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } };
    const poe = s => { heap.push(s); sobe(heap.length - 1); };
    const tira = () => { const t = heap[0], u = heap.pop(); if(heap.length){ heap[0] = u; desce(0); } return t; };
    sol.forEach(s => { if(!s.ent) poe(s); });
    const out = []; let ciclos = 0;
    while(out.length < n){
      if(!heap.length){ /* ciclo (raro): solta o próximo na ordem da distância */ if(S.debugCena && !ciclos) S.ultCicloNos = sol.filter(x => !x.feito); const s = sol.find(x => !x.feito); s.ent = 0; poe(s); ciclos++; }
      const s = tira(); if(s.feito) continue; s.feito = true; out.push(s);
      if(s.sai) for(const t of s.sai){ if(--t.ent === 0 && !t.feito) poe(t); }
    }
    for(let i = 0; i < n; i++) sol[i] = out[i];
    if(S.debugCena) S.ultCiclos = ciclos;
  }
  /* desenha a cena: pisos, sombras e caixas (do fundo pra frente) */
  function cena(ctx, cv, cam, pisos, solidos, hit, foco){
    const poly = q => { ctx.beginPath(); q.forEach((v, i) => i ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1])); ctx.closePath(); };
    pisos.forEach(p => {
      /* v3.52 · a sombra macia (gente, veículo, bola): uma mancha que some na borda, deitada no chão */
      if(p.mancha){ const [mx, my, mz, rx, rz, a, yw, cm] = p.mancha, rgb = cm || '15,18,24', cy = Math.cos(yw || 0), sy = Math.sin(yw || 0), C0 = proj(cam, [mx, my, mz]), X = proj(cam, [mx + cy * rx, my, mz - sy * rx]), Z = proj(cam, [mx + sy * rz, my, mz + cy * rz]); if(!C0 || !X || !Z) return;
        ctx.save(); ctx.transform(X[0] - C0[0], X[1] - C0[1], Z[0] - C0[0], Z[1] - C0[1], C0[0], C0[1]);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(.55, `rgba(${rgb},${a * .6})`); g.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill(); ctx.restore(); return; }
      /* v3.53: lugar grande: o pedaço de chão longe da câmera nem é desenhado (e o quase longe vai sumindo) */
      let alP = 1;
      if(PL.longe && (p.pts || p.P4)){ if(p._c == null && p.P4) p._c = [(p.P4[0][0] + p.P4[2][0]) / 2, (p.P4[0][2] + p.P4[2][2]) / 2, Math.hypot(p.P4[0][0] - p.P4[2][0], p.P4[0][2] - p.P4[2][2]) / 2]; if(p._c == null){ let sx = 0, sz = 0; p.pts.forEach(v => { sx += v[0]; sz += v[1]; }); sx /= p.pts.length; sz /= p.pts.length; p._c = [sx, sz, Math.max(...p.pts.map(v => Math.hypot(v[0] - sx, v[1] - sz)))]; }
        const d = Math.hypot(p._c[0] - S.cam.tx, p._c[1] - S.cam.tz) - p._c[2]; if(d > PL.longe) return; if(d > PL.longe * .72) alP = Math.max(.05, 1 - (d - PL.longe * .72) / (PL.longe * .28)); }
      /* v3.53: o desenho pintado no chão (a marca no meio da arena) */
      if(p.img){ if(alP < 1) ctx.globalAlpha = alP; const im = typeof p.img === 'function' ? p.img() : p.img; if(im) imgNoQuad(ctx, cam, p.P4, im, 4, 2); ctx.globalAlpha = 1; return; }
      const q = projPoly(cam, p.pts ? p.pts.map(v => [v[0], 0, v[1]]) : [[p.x0, 0, p.z0], [p.x1, 0, p.z0], [p.x1, 0, p.z1], [p.x0, 0, p.z1]]);
      if(!q) return;
      if(alP < 1) ctx.globalAlpha = alP;
      poly(q); ctx.fillStyle = p.c; ctx.fill();
      if(alP < 1) ctx.globalAlpha = 1;
      if(p.linha){
        ctx.strokeStyle = p.linha; ctx.lineWidth = S.lw || 1; ctx.beginPath();
        for(let x = Math.ceil(p.x0); x <= p.x1; x++){ const s = projSeg(cam, [x, 0, p.z0], [x, 0, p.z1]); if(s){ ctx.moveTo(s[0][0], s[0][1]); ctx.lineTo(s[1][0], s[1][1]); } }
        for(let z = Math.ceil(p.z0); z <= p.z1; z++){ const s = projSeg(cam, [p.x0, 0, z], [p.x1, 0, z]); if(s){ ctx.moveTo(s[0][0], s[0][1]); ctx.lineTo(s[1][0], s[1][1]); } }
        ctx.stroke();
      }
      if(p.xadrez){
        ctx.fillStyle = p.c2;
        for(let x = p.x0; x < p.x1; x++) for(let z = p.z0; z < p.z1; z++){ if((x + z) & 1) continue; const s = projPoly(cam, [[x, 0, z], [x + 1, 0, z], [x + 1, 0, z + 1], [x, 0, z + 1]]); if(!s) continue; poly(s); ctx.fill(); }
      }
    });
    solidos.forEach(s => { const dx = s.cx - cam.pos[0], dy = s.cy - cam.pos[1], dz = s.cz - cam.pos[2]; s.prof = dx * dx + dy * dy + dz * dz; });
    /* o que tá colado em outra caixa vem logo depois dela (em cadeia: adesivo no pôster na moldura) */
    for(let k = 0; k < 4; k++){ let mexeu = false; for(const s of solidos){ if(s.cola){ const n = s.colaN, lado = n ? (cam.pos[0] - s.cx) * n[0] + (cam.pos[1] - s.cy) * n[1] + (cam.pos[2] - s.cz) * n[2] : 1; const p = s.cola.prof + (lado >= 0 ? -1e-5 : 1e-5); if(s.prof !== p){ s.prof = p; mexeu = true; } } } if(!mexeu) break; }
    /* um sólido com conta errada (NaN) não pode bagunçar a ordem de todos os outros: fica de fora */
    for(let i = solidos.length - 1; i >= 0; i--) if(!Number.isFinite(solidos[i].prof)) solidos.splice(i, 1);
    /* a ordem só muda quando a câmera anda (ou alguém anda): parado, reaproveita a do quadro anterior */
    let assin = solidos.length;
    for(let i = 0; i < solidos.length; i++){ const s = solidos[i]; s.ci = i; assin += Math.round(s.cx * 10) * 7 + Math.round(s.cz * 10) * 13 + (s.alpha != null ? 1 : 0); }
    /* v3.55: o tamanho da tela entra na chave (girar o celular muda quem tapa quem) */
    const chave = assin + '|' + cv.width + 'x' + cv.height + '|' + cam.pos.map(v => Math.round(v * 10)).join(',');
    const t0o = performance.now();
    if(S.ordemChave === chave && S.ordemPerm && S.ordemPerm.length === solidos.length){
      const base = solidos.slice(); for(let i = 0; i < base.length; i++) solidos[i] = base[S.ordemPerm[i]];
    } else {
      solidos.sort((a, b) => b.prof - a.prof);
      ajustaOrdem(solidos, cam);
      S.ordemChave = chave; S.ordemPerm = solidos.map(s => s.ci);
    }
    S.msOrdem = (S.msOrdem || 0) * .9 + (performance.now() - t0o) * .1;
    if(S.debugCena) S.ultCena = { solidos, cam };
    if(hit) hit.length = 0;
    const L = LUZ;
    /* o que fica entre a câmera e o boneco (mais perto da câmera e em cima dele na tela) fica transparente */
    const fx = foco && foco.q ? foco.q[0] : 0, fy = foco && foco.q ? foco.q[1] : 0, fprof = foco ? foco.prof : 0, fr = foco ? foco.raio : 0;
    const cw = cv.width, chh = cv.height;
    for(const s of solidos){
      /* o que tá fora da tela (ou atrás da câmera) nem é desenhado */
      if(s.raio != null && s.raio < 3){ const e = noOlho(cam, [s.cx, s.cy, s.cz]); if(e[2] < PERTO - s.raio) continue; if(e[2] > PERTO){ const rp = s.raio / e[2] * cam.F, sx = cam.cx + e[0] / e[2] * cam.F, sy = cam.cy - e[1] / e[2] * cam.F; if(sx + rp < 0 || sx - rp > cw || sy + rp < 0 || sy - rp > chh) continue; } }
      if(s.img){
        const P = s.P4, n = [(P[3][1] - P[0][1]) * (P[1][2] - P[0][2]) - (P[3][2] - P[0][2]) * (P[1][1] - P[0][1]), (P[3][2] - P[0][2]) * (P[1][0] - P[0][0]) - (P[3][0] - P[0][0]) * (P[1][2] - P[0][2]), (P[3][0] - P[0][0]) * (P[1][1] - P[0][1]) - (P[3][1] - P[0][1]) * (P[1][0] - P[0][0])];
        const frente = n[0] * (cam.pos[0] - s.cx) + n[1] * (cam.pos[1] - s.cy) + n[2] * (cam.pos[2] - s.cz) > 0;
        let al = s.alpha == null ? 1 : s.alpha; if(s.aL != null) al = Math.min(al, s.aL); ctx.globalAlpha = al;
        let feito = false; const im = frente ? (typeof s.img === 'function' ? s.img() : s.img) : null;
        if(im){ const q0 = proj(cam, P[0]), q2 = proj(cam, P[2]); if(q0 && q2){ const tam = Math.hypot(q2[0] - q0[0], q2[1] - q0[1]); feito = imgNoQuad(ctx, cam, P, im, tam > 300 ? 4 : tam > 90 ? 2 : 1, tam > 300 ? 2 : 1); } }
        const q = projPoly(cam, P);
        if(!feito && q){ ctx.beginPath(); q.forEach((v, i) => (i ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1]))); ctx.closePath(); ctx.fillStyle = luzTom(s.c, .1); ctx.fill(); }
        ctx.globalAlpha = 1;
        if(hit && s.dono && q) hit.push({ dono: s.dono, polys: [q], s });
        continue;
      }
      if(s.esfera){
        const e = noOlho(cam, [s.cx, s.cy, s.cz]); if(e[2] < PERTO + s.esfera) continue;
        const bx = cam.cx + e[0] / e[2] * cam.F, by = cam.cy - e[1] / e[2] * cam.F, rp = s.esfera / e[2] * cam.F;
        let al = s.alpha == null ? 1 : s.alpha; if(s.aL != null) al = Math.min(al, s.aL);
        if(foco && s.dono !== 'eu' && s.prof < fprof && Math.hypot(bx - fx, by - fy) < fr) al = Math.min(al, .3);
        ctx.globalAlpha = al; bola(ctx, cam, s, bx, by, rp); ctx.globalAlpha = 1;
        if(hit && s.dono) hit.push({ dono: s.dono, polys: [Array.from({ length: 8 }, (_, i) => [bx + Math.cos(i * Math.PI / 4) * rp, by + Math.sin(i * Math.PI / 4) * rp])], s });
        continue;
      }
      const faces = [];
      for(const f of FACES){
        const a = s.v[f[0]], b = s.v[f[1]], c = s.v[f[2]], d = s.v[f[3]];
        const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
        let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
        const fc = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2];
        if(n[0] * (fc[0] - s.cx) + n[1] * (fc[1] - s.cy) + n[2] * (fc[2] - s.cz) < 0) n = n.map(v => -v);
        if(n[0] * (cam.pos[0] - fc[0]) + n[1] * (cam.pos[1] - fc[1]) + n[2] * (cam.pos[2] - fc[2]) <= 0) continue;
        const pts = projPoly(cam, [a, b, c, d]); if(!pts) continue;
        const nn = Math.hypot(...n) || 1, lam = (n[0] * L[0] + n[1] * L[1] + n[2] * L[2]) / nn;
        /* v3.52 · a parede escurece um pouco perto do chão (o canto pega menos luz): só nas faces em pé, altas e
           encostadas no chão */
        let ao = null;
        if(!s.cru && Math.abs(n[1]) / nn < .15){ const y0 = Math.min(a[1], b[1], c[1], d[1]), y1 = Math.max(a[1], b[1], c[1], d[1]);
          if(y0 < .05 && y1 - y0 >= 1){ const p0 = proj(cam, [fc[0], y0, fc[2]]), p1 = proj(cam, [fc[0], y0 + .9, fc[2]]); if(p0 && p1) ao = [p0, p1]; } }
        faces.push({ pts, cor: s.cru ? s.c : luzTom(s.c, lam), ao });
      }
      if(!faces.length) continue;
      let alpha = s.alpha == null ? 1 : s.alpha; if(s.aL != null) alpha = Math.min(alpha, s.aL);
      if(foco && !s.chao && s.dono !== 'eu' && s.prof < fprof){ const q = proj(cam, [s.cx, s.cy, s.cz]); if(q && Math.hypot(q[0] - fx, q[1] - fy) < fr) alpha = Math.min(alpha, .3); }
      ctx.globalAlpha = alpha;
      for(const f of faces){
        ctx.beginPath(); f.pts.forEach((v, i) => i ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1])); ctx.closePath();
        ctx.fillStyle = f.cor; ctx.fill();
        if(f.ao){ const g = ctx.createLinearGradient(f.ao[0][0], f.ao[0][1], f.ao[1][0], f.ao[1][1]); g.addColorStop(0, 'rgba(30,24,40,.22)'); g.addColorStop(1, 'rgba(30,24,40,0)'); ctx.fillStyle = g; ctx.fill(); }
        if(!s.semTraco){ ctx.strokeStyle = s.traco || 'rgba(15,18,24,.38)'; ctx.lineWidth = S.lw || 1; ctx.stroke(); }
      }
      ctx.globalAlpha = 1;
      if(hit && s.dono) hit.push({ dono: s.dono, polys: faces.map(f => f.pts), s });
    }
  }

  /* ---------- o boneco de blocos (do mesmo avatar da cidade) ---------- */
  /* os personagens em blocos (a mesma turma da cidade): corpo, cabeça e o que cada um tem de seu */
  /* ---------- v3.53 · os bichos da corrida de kart: seis criaturas originais do Corre ----------
     O Thales: "personagens originais, baseados em animais, bichos engraçados com nomes engraçados". Cabeção, corpo
     pequeno e um exagero cada: o topete de raio da Capivolt, a caixa de som do Bumbo, o bico do Bicudo, o casco do
     Tatubala, a canela do Canelinha e a touca do Soneca. Todos olham pra frente (+z), como os outros personagens */
  function bichoKart3D(k, x, z, add, pe, sw){
    const olho = (dx, y, zf, c, t) => { add(B(x + dx - (t || .1) / 2, y, z + zf, t || .1, t || .1, .02, PAPEL)); add(B(x + dx - (t || .1) / 4, y + (t || .1) / 4, z + zf + .005, (t || .1) / 2, (t || .1) / 2, .02, c || INK)); };
    if(k === 'capivolt'){
      const B1 = '#8E6B45', B2 = '#6E5033', B3 = '#B49472', RAIO = '#FF8A3D';
      pe(-.22, 1, B2, .18, .2); pe(.04, -1, B2, .18, .2);
      add(B(x - .34, .2, z - .26, .68, .48, .52, B1)); add(B(x - .2, .24, z + .26, .4, .32, .02, B3));
      add(B(x - .46, .36, z - .04, .12, .22, .14, B2), { pitch: -sw, piv: [x, .58, z] }); add(B(x + .34, .36, z - .04, .12, .22, .14, B2), { pitch: sw, piv: [x, .58, z] });
      add(B(x - .37, .66, z - .28, .74, .56, .6, B1)); add(B(x - .21, .68, z + .32, .42, .26, .14, B3)); add(B(x - .13, .86, z + .46, .07, .04, .01, INK)); add(B(x + .06, .86, z + .46, .07, .04, .01, INK));
      add(B(x - .08, .62, z + .42, .07, .09, .03, PAPEL)); add(B(x + .01, .62, z + .42, .07, .09, .03, PAPEL));
      olho(-.17, .98, .32); olho(.17, .98, .32);
      add(B(x - .38, 1.1, z - .29, .76, .07, .62, INK)); add(Object.assign(B(x - .3, 1.08, z + .32, .24, .14, .03, '#38E1FF'), { cru: true })); add(Object.assign(B(x + .06, 1.08, z + .32, .24, .14, .03, '#38E1FF'), { cru: true }));
      add(B(x - .35, 1.2, z - .1, .12, .1, .1, B2)); add(B(x + .23, 1.2, z - .1, .12, .1, .1, B2));
      add(B(x - .1, 1.22, z - .06, .12, .18, .12, RAIO)); add(B(x - .02, 1.38, z - .06, .12, .14, .12, RAIO)); add(B(x - .12, 1.5, z - .06, .12, .14, .12, RAIO)); add(B(x - .04, 1.62, z - .06, .1, .12, .12, '#FFB070'));
    } else if(k === 'bumbo'){
      const U1 = '#7A4E2A', U2 = '#5A3A1E', FO = '#C9A27A';
      pe(-.26, 1, U2, .22, .24); pe(.04, -1, U2, .22, .24);
      add(B(x - .44, .24, z - .3, .88, .68, .62, U1)); add(B(x - .3, .3, z + .32, .6, .52, .02, FO));
      add(B(x - .22, .86, z + .33, .44, .04, .01, OURO)); add(B(x - .06, .72, z + .33, .12, .14, .02, OURO));
      add(B(x - .34, .4, z - .64, .68, .64, .32, INK)); add(B(x - .2, .5, z - .65, .4, .4, .01, '#3A3E45')); add(Object.assign(B(x - .06, .64, z - .66, .12, .12, .01, ROSA), { cru: true })); add(B(x - .1, .96, z - .65, .2, .06, .01, '#3A3E45'));
      add(B(x - .58, .46, z - .08, .16, .4, .2, U1), { pitch: -sw, piv: [x, .86, z] }); add(B(x + .42, .46, z - .08, .16, .4, .2, U1), { pitch: sw, piv: [x, .86, z] });
      add(B(x - .33, .92, z - .27, .66, .5, .54, U1)); add(B(x - .15, .94, z + .27, .3, .18, .1, FO)); add(B(x - .07, 1.05, z + .37, .14, .07, .01, INK)); add(B(x - .08, .96, z + .371, .16, .02, .01, INK));
      olho(-.15, 1.18, .27); olho(.15, 1.18, .27);
      add(B(x - .35, 1.38, z - .1, .16, .14, .12, U2)); add(B(x + .19, 1.38, z - .1, .16, .14, .12, U2));
      add(B(x - .35, 1.4, z - .29, .7, .12, .58, ROSA)); add(B(x - .25, 1.42, z - .55, .5, .04, .28, ROSA));
    } else if(k === 'bicudo'){
      const BI = '#FF8A3D', BI2 = '#E2412E', BI3 = '#FFB070', OL = '#38E1FF';
      pe(-.15, 1, '#6B7480', .12, .24); pe(.04, -1, '#6B7480', .12, .24);
      add(B(x - .24, .24, z - .22, .48, .5, .44, INK)); add(B(x - .14, .3, z + .22, .28, .36, .02, PAPEL));
      add(B(x - .32, .36, z - .16, .08, .34, .3, INK), { roll: -sw * .5, piv: [x - .28, .7, z] }); add(B(x + .24, .36, z - .16, .08, .34, .3, INK), { roll: sw * .5, piv: [x + .28, .7, z] });
      add(B(x - .25, .74, z - .23, .5, .46, .46, INK));
      add(Object.assign(B(x - .23, .96, z + .2, .16, .16, .03, OL), { cru: true })); add(B(x - .18, 1.0, z + .225, .07, .07, .02, INK)); add(Object.assign(B(x + .07, .96, z + .2, .16, .16, .03, OL), { cru: true })); add(B(x + .12, 1.0, z + .225, .07, .07, .02, INK));
      add(B(x - .14, .74, z + .22, .28, .32, .95, BI)); add(B(x - .141, .86, z + .24, .282, .02, .93, INK)); add(B(x - .14, 1.0, z + .22, .28, .06, .8, BI3)); add(B(x - .14, .74, z + 1.17, .28, .32, .14, BI2));
      add(B(x - .04, 1.2, z - .08, .08, .2, .06, ROSA)); add(B(x - .1, 1.18, z - .16, .06, .16, .06, BI)); add(B(x + .04, 1.18, z - .16, .06, .14, .06, BI2));
    } else if(k === 'tatubala'){
      const S1 = '#8F7A64', S2 = '#6E5C4A', PELE = '#B39A7C';
      pe(-.2, 1, '#5A4A3A', .16, .2); pe(.04, -1, '#5A4A3A', .16, .2);
      for(let q = 0; q < 5; q++){ const hq = .62 - Math.abs(q - 2) * .1; add(B(x - .38, .2, z - .4 + q * .16, .76, hq, .16, q % 2 ? S1 : S2)); add(B(x - .39, .2 + hq - .06, z - .4 + q * .16, .78, .06, .16, q % 2 ? S2 : S1)); }
      add(B(x - .3, .8, z - .24, .6, .08, .44, S2));
      add(B(x - .2, .44, z + .4, .4, .34, .32, PELE)); add(B(x - .09, .46, z + .72, .18, .16, .24, PELE)); add(B(x - .05, .54, z + .96, .1, .08, .02, INK));
      add(B(x - .19, .76, z + .44, .08, .26, .06, PELE)); add(B(x + .11, .76, z + .44, .08, .26, .06, PELE));
      olho(-.11, .64, .72, INK, .09); olho(.11, .64, .72, INK, .09);
      add(B(x - .04, .26, z - .72, .08, .08, .34, S2));
      add(B(x - .21, .5, z + .5, .42, .06, .2, VERM));
    } else if(k === 'canelinha'){
      const G1 = '#C8642A', G2 = '#A44E1E';
      pe(-.18, 1, INK, .12, .64); pe(.06, -1, INK, .12, .64);
      add(B(x - .21, 0, z - .14, .17, .09, .32, PAPEL)); add(B(x + .03, 0, z - .14, .17, .09, .32, PAPEL)); add(B(x - .21, .06, z + .12, .17, .02, .06, ROSA)); add(B(x + .03, .06, z + .12, .17, .02, .06, ROSA));
      add(B(x - .24, .62, z - .2, .48, .4, .4, G1)); add(B(x - .12, .66, z + .2, .24, .26, .02, '#E08A4E'));
      add(B(x - .36, .7, z - .06, .12, .28, .12, INK), { pitch: -sw, piv: [x, .98, z] }); add(B(x + .24, .7, z - .06, .12, .28, .12, INK), { pitch: sw, piv: [x, .98, z] });
      add(B(x - .18, .98, z - .24, .36, .12, .3, INK));
      add(B(x - .22, 1.04, z - .17, .44, .34, .36, G1)); add(B(x - .09, 1.06, z + .19, .18, .14, .26, G1)); add(B(x - .05, 1.12, z + .45, .1, .07, .02, INK)); add(B(x - .1, 1.0, z + .19, .2, .08, .02, PAPEL));
      add(B(x - .27, 1.36, z - .05, .14, .44, .08, G2)); add(B(x + .13, 1.36, z - .05, .14, .44, .08, G2)); add(B(x - .24, 1.42, z + .03, .08, .3, .01, '#FFB3D1')); add(B(x + .16, 1.42, z + .03, .08, .3, .01, '#FFB3D1'));
      olho(-.12, 1.22, .19); olho(.12, 1.22, .19);
      add(B(x - .06, .7, z - .62, .12, .12, .44, G1)); add(B(x - .06, .7, z - .7, .12, .12, .08, PAPEL));
    } else if(k === 'soneca'){
      const S1 = '#9A8A78', S2 = '#7E6E5E', CARA = '#E8DCC8', MASC = '#4A3E34';
      pe(-.2, 1, S2, .16, .22); pe(.04, -1, S2, .16, .22);
      add(B(x - .32, .22, z - .22, .64, .6, .44, S1)); add(B(x - .3, .4, z - .4, .6, .42, .18, '#CFE6FF')); add(B(x - .3, .58, z - .41, .6, .02, .2, '#A9CBEF'));
      add(B(x - .5, .3, z - .06, .14, .6, .14, S2), { pitch: -sw * .4, piv: [x, .82, z] }); add(B(x + .36, .3, z - .06, .14, .6, .14, S2), { pitch: sw * .4, piv: [x, .82, z] });
      add(B(x - .5, .26, z + .06, .14, .05, .08, CARA)); add(B(x + .36, .26, z + .06, .14, .05, .08, CARA));
      add(B(x - .28, .8, z - .22, .56, .46, .46, S1)); add(B(x - .22, .82, z + .24, .44, .38, .02, CARA));
      add(B(x - .22, .98, z + .25, .17, .09, .01, MASC)); add(B(x + .05, .98, z + .25, .17, .09, .01, MASC)); add(B(x - .18, 1.0, z + .26, .1, .02, .01, INK)); add(B(x + .08, 1.0, z + .26, .1, .02, .01, INK));
      add(B(x - .06, .85, z + .26, .12, .1, .01, '#3A1E1E')); add(B(x - .04, .87, z + .265, .08, .03, .01, ROSA));
      add(B(x - .3, 1.22, z - .24, .6, .12, .5, ROSA)); add(B(x - .22, 1.34, z - .2, .44, .12, .42, PAPEL)); add(B(x - .14, 1.46, z - .16, .28, .12, .34, ROSA)); add(B(x - .06, 1.52, z - .46, .12, .1, .32, PAPEL)); add(B(x - .1, 1.44, z - .6, .2, .18, .18, PAPEL));
    }
  }
  function personagem3D(k, x, z, add, sw, av){
    const pe = (sx, sinal, c, w, h) => add(B(x + sx, 0, z - .1, w || .18, h || .3, .2, c), { pitch: sw * sinal, piv: [x, h || .3, z] });
    const olhos = (y, c, dx) => { add(B(x - (dx || .14) - .04, y, z + .24, .08, .08, .02, c || INK)); add(B(x + (dx || .14) - .04, y, z + .24, .08, .08, .02, c || INK)); };
    if(k === 'capivara'){
      const B1 = '#8E6B45', B2 = '#6E5033', B3 = '#B49472';
      pe(-.3, 1, B2, .16, .28); pe(-.08, -1, B2, .16, .28); pe(.14, 1, B2, .16, .28); pe(.3, -1, B2, .16, .28);
      add(B(x - .36, .28, z - .3, .72, .44, .6, B1)); add(B(x - .22, .3, z + .3, .44, .22, .02, B3));
      add(B(x - .3, .7, z - .1, .6, .42, .46, B1)); add(B(x - .3, 1.12, z - .02, .12, .12, .14, B2)); add(B(x + .18, 1.12, z - .02, .12, .12, .14, B2));
      add(B(x - .14, .74, z + .36, .28, .2, .12, B3)); add(B(x - .06, .86, z + .48, .12, .05, .01, INK)); olhos(.98, INK, .16);
      add(B(x - .4, .5, z - .34, .08, .08, .08, B2)); add(B(x - .36, .68, z - .14, .72, .04, .6, B1));
    } else if(k === 'tucano'){
      const PE = '#6B7480', BI = '#FF8A3D', BI2 = '#E2412E', OL = '#38E1FF';
      pe(-.17, 1, PE, .12, .26); pe(.05, -1, PE, .12, .26);
      add(B(x - .26, .26, z - .26, .52, .56, .5, INK)); add(B(x - .14, .32, z + .24, .28, .4, .02, PAPEL)); add(B(x - .3, .34, z - .34, .6, .1, .14, INK));
      add(B(x - .22, .82, z - .22, .44, .42, .44, INK)); add(B(x - .22, 1.0, z + .22, .14, .14, .02, OL)); add(B(x - .16, 1.04, z + .23, .06, .06, .02, INK));
      add(B(x - .02, .96, z + .2, .22, .16, .5, BI)); add(B(x - .02, .96, z + .7, .22, .16, .06, BI2)); add(B(x - .02, .9, z + .2, .22, .06, .4, '#C96A2A'));
    } else if(k === 'robo'){
      const C1 = '#C9CDD3', C2 = '#8F96A0', C3 = '#6B7480', TELA = '#101318', OL = '#38E1FF';
      pe(-.22, 1, C3, .18, .3); pe(.04, -1, C3, .18, .3);
      add(B(x - .3, .3, z - .2, .6, .55, .4, C2)); add(B(x - .24, .36, z + .2, .48, .4, .02, C1)); add(B(x - .18, .4, z + .22, .06, .06, .01, ROSA)); add(B(x - .06, .4, z + .22, .06, .06, .01, AMARELO)); add(B(x + .06, .4, z + .22, .06, .06, .01, OL));
      add(B(x - .44, .42, z - .1, .12, .4, .2, C2), { pitch: -sw, piv: [x, .8, z] }); add(B(x + .32, .42, z - .1, .12, .4, .2, C2), { pitch: sw, piv: [x, .8, z] });
      add(B(x - .3, .86, z - .25, .6, .42, .5, C1)); add(B(x - .24, .92, z + .25, .48, .3, .01, TELA)); olhos(1.08, OL, .12); add(B(x - .12, .96, z + .26, .24, .04, .01, OL));
      add(B(x - .03, 1.28, z - .03, .06, .14, .06, INK)); add(B(x - .08, 1.42, z - .08, .16, .08, .16, ROSA));
    } else if(k === 'fantasma'){
      add(B(x - .3, .3, z - .2, .6, .95, .4, PAPEL)); add(B(x - .3, .2, z - .2, .14, .12, .4, PAPEL)); add(B(x - .07, .2, z - .2, .14, .12, .4, PAPEL)); add(B(x + .16, .2, z - .2, .14, .12, .4, PAPEL));
      add(B(x - .2, .84, z + .2, .12, .18, .01, INK)); add(B(x + .08, .84, z + .2, .12, .18, .01, INK)); add(B(x - .06, .64, z + .2, .12, .05, .01, INK)); add(B(x - .28, .7, z + .2, .06, .06, .01, ROSA)); add(B(x + .22, .7, z + .2, .06, .06, .01, ROSA));
    } else if(k === 'pastel'){
      const G1 = '#F2CF6B', G2 = '#C9933A';
      pe(-.2, 1, G2, .16, .26); pe(.04, -1, G2, .16, .26);
      add(B(x - .38, .26, z - .12, .76, .72, .24, G1)); add(B(x - .44, .36, z - .1, .06, .5, .2, G2)); add(B(x + .38, .36, z - .1, .06, .5, .2, G2)); add(B(x - .3, .98, z - .1, .6, .06, .2, G2));
      add(B(x - .5, .5, z - .06, .12, .26, .12, G2), { pitch: -sw, piv: [x, .76, z] }); add(B(x + .38, .5, z - .06, .12, .26, .12, G2), { pitch: sw, piv: [x, .76, z] });
      olhos(.72, INK, .13); add(B(x - .12, .5, z + .12, .24, .05, .01, INK)); add(B(x - .3, .56, z + .12, .06, .06, .01, ROSA)); add(B(x + .24, .56, z + .12, .06, .06, .01, ROSA));
    } else if(k === 'capivolt' || k === 'bumbo' || k === 'bicudo' || k === 'tatubala' || k === 'canelinha' || k === 'soneca'){
      bichoKart3D(k, x, z, add, pe, sw);
    } else if(k === 'ipe'){
      const TR = '#7A4E2A', TR2 = '#5A3A1E', FL = '#FFB3D1';
      pe(-.22, 1, TR2, .18, .22); pe(.04, -1, TR2, .18, .22);
      add(B(x - .13, .2, z - .13, .26, .9, .26, TR)); add(B(x - .3, .8, z - .06, .18, .06, .12, TR)); add(B(x + .12, .8, z - .06, .18, .06, .12, TR));
      add(B(x - .42, 1.0, z - .42, .84, .5, .84, ROSA)); add(B(x - .3, 1.5, z - .3, .6, .16, .6, ROSA)); add(B(x - .34, 1.2, z + .42, .1, .1, .02, FL)); add(B(x + .1, 1.3, z + .42, .1, .1, .02, AMARELO)); add(B(x - .1, 1.56, z + .3, .08, .08, .08, FL)); add(B(x + .34, 1.1, z - .1, .1, .1, .1, AMARELO));
      add(B(x - .1, .6, z + .13, .06, .06, .01, INK)); add(B(x + .04, .6, z + .13, .06, .06, .01, INK)); add(B(x - .05, .46, z + .13, .1, .04, .01, INK));
    }
  }
  /* ---------- os uniformes em blocos (os mesmos da cidade): cores da roupa e o que vai por cima ---------- */
  /* v3.66 · o brilho das skins lendárias no 3D: um cubinho branco que acende num ponto da lista (dx, y, dz), apaga e pula
     pro próximo. O boneco é montado a cada quadro, então o brilho anda sozinho */
  const LAPIS3 = '#1F4FA8';
  /* v3.91: a vela dentro da abóbora (a mesma tremida da cidade) */
  const brasa3 = () => { const f = Math.floor(performance.now() / 110) % 7; return f === 0 ? '#FFF2A8' : f < 4 ? '#FFD23F' : '#FFB02E'; };
  const brilho3 = (x, z, L) => { const t = Math.floor(performance.now() / 150); if(t % 4 === 3) return []; const p = L[(t * 3) % L.length]; return [B(x + p[0] - .025, p[1], z + p[2], .05, .05, .02, '#FFFFFF')]; };
  const SKIN3D = {
    policial: { R: '#1F3D7A', L: '#1B1F27', T: INK, cobre: true, bl: (x, z) => [B(x - .27, 1.38, z - .27, .54, .12, .54, '#1F3D7A'), B(x - .2, 1.38, z + .27, .4, .04, .2, INK), B(x - .1, 1.44, z + .27, .2, .05, .005, OURO), B(x - .26, .44, z - .13, .52, .05, .26, INK), B(x - .04, .44, z + .13, .08, .05, .005, OURO), B(x - .2, .8, z + .12, .07, .07, .01, OURO)] },
    bombeiro: { R: '#E2412E', L: INK, T: INK, cobre: true, bl: (x, z) => [B(x - .3, 1.36, z - .3, .6, .2, .6, '#E2412E'), B(x - .35, 1.34, z - .35, .7, .04, .7, '#B4152E'), B(x - .3, 1.44, z - .3, .6, .04, .605, AMARELO), B(x - .25, .6, z + .12, .5, .05, .01, AMARELO), B(x - .25, .74, z + .12, .5, .05, .01, AMARELO), B(x - .25, .6, z - .13, .5, .05, .01, AMARELO), B(x - .25, .74, z - .13, .5, .05, .01, AMARELO)] },
    ladrao: { R: INK, L: INK, T: INK, cobre: true, bl: (x, z) => [B(x - .27, 1.34, z - .27, .54, .16, .54, INK), B(x - .25, 1.16, z + .25, .5, .1, .01, INK), B(x - .15, 1.18, z + .255, .06, .06, .005, PAPEL), B(x + .09, 1.18, z + .255, .06, .06, .005, PAPEL), B(x - .25, .56, z + .12, .5, .05, .01, PAPEL), B(x - .25, .7, z + .12, .5, .05, .01, PAPEL), B(x - .25, .84, z + .12, .5, .05, .01, PAPEL), B(x - .25, .56, z - .13, .5, .05, .01, PAPEL), B(x - .25, .7, z - .13, .5, .05, .01, PAPEL), B(x - .2, .5, z - .4, .4, .4, .27, '#8C5A2E')] },
    medico: { R: PAPEL, L: CEU, T: PAPEL, cobre: true, bl: (x, z) => [B(x - .27, 1.38, z - .27, .54, .1, .54, CEU), B(x - .08, .7, z + .12, .16, .24, .01, CEU), B(x - .14, .72, z + .125, .04, .22, .01, INK), B(x + .1, .72, z + .125, .04, .22, .01, INK), B(x - .14, .7, z + .125, .28, .04, .01, INK), B(x + .04, .66, z + .125, .06, .06, .01, ACO3)] },
    chef: { R: PAPEL, L: '#2B2F38', T: INK, cobre: true, bl: (x, z) => [B(x - .22, 1.44, z - .22, .44, .3, .44, PAPEL), B(x - .26, 1.72, z - .26, .52, .1, .52, PAPEL), B(x - .25, .3, z + .12, .5, .42, .01, ROSA), B(x - .1, .8, z + .125, .05, .05, .005, INK), B(x + .05, .8, z + .125, .05, .05, .005, INK), B(x - .1, .7, z + .125, .05, .05, .005, INK), B(x + .05, .7, z + .125, .05, .05, .005, INK), B(x - .12, .9, z + .12, .24, .04, .01, '#E2412E')] },
    astronauta: { R: PAPEL, L: PAPEL, T: ACO3, cobre: true, bl: (x, z) => [B(x - .31, .9, z - .31, .62, .62, .62, PAPEL), B(x - .24, 1.04, z + .31, .48, .3, .01, '#1B2A5A'), B(x - .18, 1.24, z + .32, .12, .05, .005, '#38E1FF'), B(x - .2, .5, z - .33, .4, .44, .2, ACO3), B(x - .16, .78, z + .12, .1, .1, .01, AZUL), B(x + .06, .8, z + .12, .1, .05, .01, ROSA), B(x - .06, .62, z + .12, .12, .1, .01, ACO3)] },
    pirata: { R: PAPEL, L: INK, T: '#8C5A2E', cobre: true, bl: (x, z) => [B(x - .27, 1.3, z - .27, .54, .1, .54, '#E2412E'), B(x + .22, 1.26, z - .3, .1, .14, .1, '#E2412E'), B(x + .04, 1.17, z + .25, .14, .12, .01, INK), B(x - .25, 1.26, z - .25, .5, .04, .505, INK), B(x - .25, .56, z + .12, .5, .05, .01, '#E2412E'), B(x - .25, .7, z + .12, .5, .05, .01, '#E2412E'), B(x - .25, .84, z + .12, .5, .05, .01, '#E2412E'), B(x - .26, .44, z - .13, .52, .05, .26, '#5A3A1E'), B(x - .04, .44, z + .13, .08, .05, .005, OURO)] },
    ninja: { R: INK, L: INK, T: INK, cobre: true, bl: (x, z) => [B(x - .27, 1.3, z - .27, .54, .2, .54, INK), B(x - .25, .94, z + .25, .5, .22, .01, INK), B(x - .27, 1.26, z - .27, .54, .05, .54, '#E2412E'), B(x - .08, 1.2, z - .32, .16, .08, .06, '#E2412E'), B(x - .26, .44, z - .13, .52, .05, .26, '#E2412E')] },
    super: { R: ROSA, L: ROSA, T: AMARELO, bl: (x, z) => [B(x - .25, 1.16, z + .25, .5, .1, .01, INK), B(x - .15, 1.18, z + .255, .06, .06, .005, PAPEL), B(x + .09, 1.18, z + .255, .06, .06, .005, PAPEL), B(x - .3, .3, z - .17, .6, .64, .04, AMARELO), B(x - .08, .66, z + .12, .16, .16, .01, AMARELO), B(x - .26, .44, z - .13, .52, .05, .26, AMARELO)] },
    motoboy: { R: INK, L: INK, T: INK, cobre: true, bl: (x, z) => [B(x - .3, .92, z - .3, .6, .58, .6, AMARELO), B(x - .24, 1.08, z + .3, .48, .22, .01, '#1B2A5A'), B(x - .18, 1.22, z + .31, .12, .04, .005, '#38E1FF'), B(x - .03, .92, z - .31, .06, .58, .005, INK), B(x - .22, .5, z - .37, .44, .44, .24, '#E2412E'), B(x - .06, .64, z - .375, .12, .12, .005, PAPEL), B(x - .25, .66, z + .12, .5, .05, .01, AMARELO), B(x - .39, .66, z - .1, .14, .05, .2, AMARELO), B(x + .25, .66, z - .1, .14, .05, .2, AMARELO)] },
    craque: { R: ROSA, L: INK, T: INK, manga: 'curta', perna: 'bermuda', bl: (x, z) => [B(x - .18, .44, z + .12, .06, .5, .01, INK), B(x + .02, .44, z + .12, .06, .5, .01, INK), B(x - .18, .44, z - .13, .06, .5, .01, INK), B(x + .02, .44, z - .13, .06, .5, .01, INK), B(x - .1, .6, z - .135, .2, .22, .005, PAPEL), B(x - .25, .09, z - .13, .23, .14, .26, ROSA), B(x + .01, .09, z - .13, .23, .14, .26, ROSA)] },
    detetive: { R: '#C9B79C', L: INK, T: INK, cobre: true, bl: (x, z) => [B(x - .2, 1.38, z - .2, .4, .18, .4, '#5A4634'), B(x - .35, 1.36, z - .35, .7, .03, .7, '#5A4634'), B(x - .21, 1.4, z - .21, .42, .05, .42, INK), B(x - .03, .74, z + .12, .06, .2, .01, '#E2412E'), B(x - .27, .3, z - .14, .54, .16, .28, '#C9B79C'), B(x - .26, .44, z - .13, .52, .04, .26, '#A8967C')] },
    cientista: { R: PAPEL, L: '#6B7480', T: '#F4F3EF', luva: AMARELO, bl: (x, z) => [B(x - .2, 1.3, z + .25, .4, .08, .02, '#38E1FF'), B(x - .26, 1.3, z - .26, .52, .06, .52, INK), B(x - .03, .62, z + .12, .06, .3, .01, '#D3CFC4'), B(x - .2, .72, z + .12, .1, .08, .01, '#D3CFC4'), B(x - .19, .8, z + .125, .03, .05, .005, AZUL), B(x - .14, .8, z + .125, .03, .05, .005, '#E2412E')] },
    rei: { R: '#E2412E', L: INK, T: INK, bl: (x, z) => [B(x - .25, 1.5, z - .25, .5, .1, .5, OURO), B(x - .25, 1.6, z - .25, .09, .09, .09, OURO), B(x + .16, 1.6, z - .25, .09, .09, .09, OURO), B(x - .25, 1.6, z + .16, .09, .09, .09, OURO), B(x + .16, 1.6, z + .16, .09, .09, .09, OURO), B(x - .04, 1.6, z + .2, .08, .07, .05, ROSA), B(x - .32, .3, z - .18, .64, .66, .05, '#7A1F3D'), B(x - .25, .44, z + .12, .05, .5, .01, PAPEL), B(x + .2, .44, z + .12, .05, .5, .01, PAPEL), B(x - .27, .3, z - .14, .54, .16, .28, '#E2412E'), B(x - .27, .28, z - .14, .54, .04, .28, PAPEL), B(x - .26, .44, z - .13, .52, .05, .26, OURO)] },
    /* ---------- v3.66 · as skins da loja em 3D (os desenhos da cidade estão em verso.js, SKIN). A frente é +z.
       Saia comprida é uma caixa parada em volta das pernas (elas andam lá dentro); o brilho das lendárias é um
       cubinho branco que pula de lugar ---------- */
    farao: { R: '#F3E9D2', L: '#F3E9D2', T: OURO, cobre: true, manga: 'curta', perna: 'bermuda', bl: (x, z) => [
      B(x - .28, 1.36, z - .28, .56, .12, .56, OURO), B(x - .285, 1.3, z - .285, .57, .06, .57, LAPIS3),
      B(x - .34, .84, z + .02, .08, .5, .2, OURO), B(x + .26, .84, z + .02, .08, .5, .2, OURO), B(x - .345, 1.0, z + .015, .09, .05, .21, LAPIS3), B(x + .255, 1.0, z + .015, .09, .05, .21, LAPIS3),
      B(x - .345, .88, z + .015, .09, .05, .21, LAPIS3), B(x + .255, .88, z + .015, .09, .05, .21, LAPIS3), B(x - .27, .9, z - .3, .54, .5, .06, OURO), B(x - .27, 1.1, z - .305, .54, .05, .01, LAPIS3),
      B(x - .03, 1.36, z + .27, .06, .1, .03, OURO), B(x - .26, .84, z + .12, .52, .1, .02, OURO), B(x - .24, .78, z + .12, .48, .06, .02, LAPIS3), B(x - .2, .73, z + .12, .4, .05, .02, OURO),
      B(x - .26, .44, z - .13, .52, .05, .26, OURO), B(x - .06, .24, z + .12, .12, .2, .02, OURO), B(x - .4, .76, z - .11, .16, .05, .22, OURO), B(x + .24, .76, z - .11, .16, .05, .22, OURO)
    ].concat(brilho3(x, z, [[-.2, .86, .14], [.15, .8, .14], [-.3, 1.4, .1], [.25, 1.2, .1], [0, 1.4, .27]])) },
    diva: { R: ROSA, L: ROSA, T: '#DDE3EA', luva: PAPEL, manga: 'curta', bl: (x, z) => [
      B(x - .29, .02, z - .17, .58, .44, .34, ROSA), B(x - .33, .02, z - .21, .66, .1, .42, '#D93A80'),
      B(x - .18, .6, z + .125, .04, .04, .005, '#FFB3D1'), B(x + .08, .74, z + .125, .04, .04, .005, '#FFB3D1'), B(x - .05, .3, z + .175, .04, .04, .005, '#FFB3D1'), B(x + .12, .18, z + .175, .04, .04, .005, '#FFB3D1'),
      B(x - .36, .86, z - .14, .72, .1, .28, '#FFF1F7'), B(x - .42, .6, z - .06, .08, .3, .14, '#FFF1F7'), B(x + .34, .6, z - .06, .08, .3, .14, '#FFF1F7'),
      B(x - .16, 1.47, z + .1, .32, .04, .04, '#DDE3EA'), B(x - .03, 1.51, z + .12, .06, .06, .02, '#38E1FF'), B(x - .27, 1.0, z + .04, .03, .08, .03, '#DDE3EA'), B(x + .24, 1.0, z + .04, .03, .08, .03, '#DDE3EA')
    ].concat(brilho3(x, z, [[-.2, .7, .13], [.15, .55, .13], [-.1, .25, .18], [.2, .1, .22], [0, 1.53, .14]])) },
    carnaval: { R: OURO, L: OURO, T: OURO, manga: 'curta', bl: (x, z) => {
      const P = [ROSA, AMARELO, LILAS, LARANJA, ROSA, AMARELO, LILAS, LARANJA, ROSA], out = [];
      for(let i = 0; i < 9; i++){ const a = 4 - Math.abs(i - 4), h = .9 + a * .14; out.push(B(x - .88 + i * .2, .62, z - .3 - a * .01, .13, h, .03, P[i]), B(x - .88 + i * .2, .62 + h, z - .3 - a * .01, .13, .06, .03, PAPEL)); }
      return out.concat([B(x - .26, .44, z - .13, .52, .06, .26, ROSA), B(x - .25, .6, z + .125, .04, .04, .005, '#F2D06B'), B(x + .1, .78, z + .125, .04, .04, .005, '#F2D06B'),
        B(x - .27, 1.36, z - .27, .54, .06, .54, OURO), B(x - .05, 1.38, z + .26, .1, .1, .02, ROSA), B(x - .18, 1.42, z + .18, .04, .2, .04, AMARELO), B(x + .14, 1.42, z + .18, .04, .2, .04, LILAS)],
        brilho3(x, z, [[-.2, .7, .13], [.1, .9, .13], [-.6, 1.6, -.28], [.6, 1.6, -.28], [0, 1.95, -.33]]));
    } },
    samurai: { R: '#B4152E', L: INK, T: '#5A3A1E', cobre: true, bl: (x, z) => [
      B(x - .29, 1.3, z - .29, .58, .18, .58, INK), B(x - .33, 1.0, z - .33, .66, .32, .1, INK), B(x - .33, 1.0, z - .33, .08, .32, .5, INK), B(x + .25, 1.0, z - .33, .08, .32, .5, INK),
      B(x - .335, 1.12, z - .335, .67, .04, .11, '#B4152E'), B(x - .18, 1.48, z + .2, .05, .2, .04, OURO), B(x + .13, 1.48, z + .2, .05, .2, .04, OURO), B(x - .05, 1.44, z + .26, .1, .06, .03, OURO),
      B(x - .24, .94, z + .25, .48, .2, .03, '#B4152E'), B(x - .1, 1.0, z + .28, .2, .03, .005, INK),
      B(x - .44, .74, z - .13, .2, .22, .26, '#B4152E'), B(x + .24, .74, z - .13, .2, .22, .26, '#B4152E'), B(x - .445, .8, z - .135, .21, .03, .27, INK), B(x + .235, .8, z - .135, .21, .03, .27, INK),
      B(x - .25, .62, z + .12, .5, .03, .01, '#7A0F1F'), B(x - .25, .74, z + .12, .5, .03, .01, '#7A0F1F'), B(x - .25, .86, z + .12, .5, .03, .01, '#7A0F1F'), B(x - .2, .74, z + .125, .04, .03, .005, OURO), B(x + .16, .74, z + .125, .04, .03, .005, OURO),
      B(x - .26, .44, z - .13, .52, .05, .26, INK), B(x - .28, .26, z - .15, .56, .18, .3, '#B4152E'), B(x - .285, .32, z - .155, .57, .03, .31, INK),
      B(x + .2, .6, z - .22, .04, 1.4, .04, '#5A3A1E'), B(x + .24, 1.6, z - .22, .32, .38, .02, INK), B(x + .34, 1.72, z - .23, .12, .12, .01, ROSA), B(x + .38, 1.76, z - .235, .04, .04, .005, AMARELO)
    ].concat(brilho3(x, z, [[-.17, 1.66, .21], [.14, 1.66, .21], [0, 1.47, .27]])) },
    cavaleiro: { R: '#C9CDD3', L: '#AEB4BD', T: '#6B7480', luva: ACO3, cobre: true, bl: (x, z) => [
      B(x - .29, .92, z - .29, .58, .58, .58, '#C9CDD3'), B(x - .22, 1.18, z + .29, .44, .05, .01, INK), B(x - .06, 1.02, z + .29, .03, .1, .01, INK), B(x + .03, 1.02, z + .29, .03, .1, .01, INK),
      B(x - .26, 1.1, z + .29, .04, .3, .005, PAPEL), B(x - .04, 1.5, z - .2, .08, .18, .4, ROSA), B(x - .04, 1.36, z - .34, .08, .24, .12, ROSA),
      B(x - .3, .12, z - .2, .6, .82, .04, AZUL), B(x - .05, .7, z + .125, .1, .1, .01, ROSA), B(x - .2, .58, z + .125, .08, .2, .005, '#E9ECF0'),
      B(x - .43, .84, z - .13, .2, .1, .26, '#E9ECF0'), B(x + .23, .84, z - .13, .2, .1, .26, '#E9ECF0'), B(x - .26, .44, z - .13, .52, .05, .26, '#5A3A1E'), B(x - .04, .44, z + .135, .08, .05, .005, OURO)
    ].concat(brilho3(x, z, [[-.2, .8, .13], [-.27, 1.3, .3], [.2, 1.4, .3], [-.35, .9, .1], [.3, .9, .1]])) },
    galaxia: { R: '#1B1440', L: '#1B1440', T: LILAS, bl: (x, z) => {
      const V2 = '#CDE6FF', t = Math.floor(performance.now() / 220), E = [[-.18, .82], [.1, .76], [-.05, .62], [.16, .52], [-.2, .5]], out = [];
      E.forEach((p, i) => { const f = (t + i * 3) % 5; if(f < 3) out.push(B(x + p[0], p[1], z + .125, .04, .04, .005, f === 0 ? PAPEL : f === 1 ? AMARELO : ROSA)); });
      return out.concat([B(x - .27, .9, z - .14, .54, .06, .28, LILAS), B(x - .26, .44, z - .13, .52, .05, .26, LILAS), B(x - .03, .44, z + .135, .06, .05, .005, ROSA),
        B(x - .33, .94, z - .33, .03, .6, .03, V2), B(x + .3, .94, z - .33, .03, .6, .03, V2), B(x - .33, .94, z + .3, .03, .6, .03, V2), B(x + .3, .94, z + .3, .03, .6, .03, V2),
        B(x - .33, 1.54, z - .33, .66, .03, .03, V2), B(x - .33, 1.54, z + .3, .66, .03, .03, V2), B(x - .33, 1.54, z - .33, .03, .03, .66, V2), B(x + .3, 1.54, z - .33, .03, .03, .66, V2),
        B(x + .14, 1.57, z - .01, .02, .15, .02, LILAS), B(x + .12, 1.72, z - .03, .06, .06, .06, ROSA)], brilho3(x, z, [[-.3, 1.4, .3], [.28, 1.2, .3]]));
    } },
    cangaceiro: { R: '#8C5A2E', L: '#6B4A2E', T: '#3B2D22', cobre: true, bl: (x, z) => {
      const out = [B(x - .24, 1.4, z - .24, .48, .14, .48, '#8C5A2E'), B(x - .36, 1.36, z - .3, .72, .04, .6, '#5A3A1E'), B(x - .34, 1.4, z + .22, .68, .24, .04, '#8C5A2E'), B(x - .2, 1.64, z + .22, .4, .08, .04, '#8C5A2E'),
        B(x - .05, 1.5, z + .265, .1, .1, .01, OURO), B(x - .28, 1.46, z + .265, .04, .04, .005, OURO), B(x + .24, 1.46, z + .265, .04, .04, .005, OURO),
        B(x - .12, .84, z + .12, .24, .1, .02, VERM), B(x - .26, .44, z - .13, .52, .05, .26, '#3B2D22'), B(x - .03, .44, z + .135, .06, .05, .005, OURO)];
      for(let i = 0; i < 6; i++){ const c = i % 2 ? '#3B2D22' : OURO; out.push(B(x - .24 + i * .08, .86 - i * .07, z + .125, .06, .06, .005, c), B(x + .18 - i * .08, .86 - i * .07, z + .125, .06, .06, .005, c)); }
      return out;
    } },
    peao: { R: '#C8322E', L: '#2F4F8F', T: '#6B4A2E', bl: (x, z) => [
      B(x - .22, 1.44, z - .22, .44, .18, .44, '#C9A46A'), B(x - .06, 1.6, z - .22, .12, .025, .44, '#9C7D4E'), B(x - .225, 1.44, z - .225, .45, .04, .45, '#5A3A1E'), B(x - .42, 1.4, z - .36, .84, .04, .72, '#C9A46A'),
      B(x - .42, 1.44, z - .36, .04, .04, .72, '#C9A46A'), B(x + .38, 1.44, z - .36, .04, .04, .72, '#C9A46A'),
      B(x - .25, .66, z + .12, .5, .03, .01, '#7A1F1F'), B(x - .25, .82, z + .12, .5, .03, .01, '#7A1F1F'), B(x - .12, .44, z + .12, .03, .5, .01, '#7A1F1F'), B(x + .08, .44, z + .12, .03, .5, .01, '#7A1F1F'),
      B(x - .26, .44, z - .13, .52, .05, .26, '#5A3A1E'), B(x - .1, .42, z + .125, .2, .1, .01, OURO), B(x - .05, .44, z + .13, .1, .05, .005, '#F2D06B')
    ] },
    mc: { R: '#16181E', L: '#2B2F38', T: PAPEL, bl: (x, z) => [
      B(x - .27, 1.38, z - .27, .54, .12, .54, INK), B(x - .22, 1.38, z + .27, .44, .03, .2, OURO), B(x - .04, 1.42, z + .27, .08, .04, .01, OURO),
      B(x - .22, 1.18, z + .25, .44, .08, .03, OURO), B(x - .18, 1.185, z + .28, .12, .07, .005, INK), B(x + .06, 1.185, z + .28, .12, .07, .005, INK),
      B(x - .16, .86, z + .125, .32, .03, .01, OURO), B(x - .14, .8, z + .125, .03, .06, .01, OURO), B(x + .11, .8, z + .125, .03, .06, .01, OURO), B(x - .06, .7, z + .125, .12, .12, .01, '#F2D06B'),
      B(x - .12, .5, z + .125, .24, .1, .01, '#2B2F38'), B(x - .2, .86, z - .17, .4, .1, .06, '#2B2F38'), B(x + .24, .48, z - .1, .16, .04, .2, OURO)
    ].concat(brilho3(x, z, [[-.04, .74, .13], [.1, .86, .13]])) },
    mago: { R: '#6A4FB3', L: '#6A4FB3', T: '#3B2D22', bl: (x, z) => [
      B(x - .29, .02, z - .17, .58, .44, .34, '#6A4FB3'), B(x - .33, .02, z - .21, .66, .1, .42, '#4A3585'), B(x - .26, .44, z - .13, .52, .05, .26, OURO),
      B(x - .36, 1.42, z - .36, .72, .04, .72, '#6A4FB3'), B(x - .22, 1.46, z - .22, .44, .16, .44, '#6A4FB3'), B(x - .225, 1.46, z - .225, .45, .04, .45, '#4A3585'),
      B(x - .15, 1.62, z - .15, .3, .16, .3, '#6A4FB3'), B(x - .08, 1.78, z - .08, .16, .14, .16, '#6A4FB3'), B(x - .03, 1.92, z - .1, .06, .08, .06, '#6A4FB3'),
      B(x - .05, 1.66, z + .155, .1, .08, .01, AMARELO), B(x - .18, .7, z + .125, .04, .04, .005, AMARELO), B(x + .1, .55, z + .125, .04, .04, .005, AMARELO), B(x - .1, .2, z + .175, .04, .04, .005, PAPEL),
      B(x + .42, .2, z + .05, .04, 1.0, .04, '#8C5A2E'), B(x + .39, 1.2, z + .02, .1, .1, .1, '#38E1FF')
    ].concat(brilho3(x, z, [[.42, 1.32, .06], [.48, 1.26, .1]])) },
    vampiro: { R: '#5A1428', L: INK, T: INK, bl: (x, z) => [
      B(x - .32, .08, z - .2, .64, .86, .05, INK), B(x - .3, .1, z - .155, .6, .8, .01, '#B4152E'), B(x - .32, .9, z - .2, .08, .3, .3, '#B4152E'), B(x + .24, .9, z - .2, .08, .3, .3, '#B4152E'), B(x - .32, .9, z - .22, .64, .3, .04, '#B4152E'),
      B(x - .06, .72, z + .125, .12, .2, .01, PAPEL), B(x - .04, .66, z + .13, .08, .06, .01, OURO), B(x - .08, .98, z + .255, .03, .04, .005, PAPEL), B(x + .05, .98, z + .255, .03, .04, .005, PAPEL)
    ] },
    anjo: { R: PAPEL, L: PAPEL, T: OURO, bl: (x, z) => [
      B(x - .29, .02, z - .17, .58, .44, .34, PAPEL), B(x - .33, .02, z - .21, .66, .1, .42, '#DDE3EA'), B(x - .26, .44, z - .13, .52, .05, .26, OURO),
      B(x - .8, .82, z - .22, .58, .3, .04, '#F4F3EF'), B(x + .22, .82, z - .22, .58, .3, .04, '#F4F3EF'), B(x - .7, .52, z - .22, .48, .32, .04, '#F4F3EF'), B(x + .22, .52, z - .22, .48, .32, .04, '#F4F3EF'),
      B(x - .62, .36, z - .22, .36, .18, .04, '#D3D8E0'), B(x + .26, .36, z - .22, .36, .18, .04, '#D3D8E0'),
      B(x - .18, 1.64, z - .18, .36, .03, .05, OURO), B(x - .18, 1.64, z + .13, .36, .03, .05, OURO), B(x - .18, 1.64, z - .18, .05, .03, .36, OURO), B(x + .13, 1.64, z - .18, .05, .03, .36, OURO)
    ].concat(brilho3(x, z, [[-.15, 1.68, .14], [.12, 1.68, -.15]])) },
    luchador: { R: AZUL, L: AZUL, T: PAPEL, cobre: true, manga: 'curta', bl: (x, z) => [
      B(x - .29, .92, z - .29, .58, .56, .58, AZUL), B(x - .2, 1.14, z + .29, .14, .12, .01, PAPEL), B(x + .06, 1.14, z + .29, .14, .12, .01, PAPEL),
      B(x - .14, 1.18, z + .295, .05, .05, .005, INK), B(x + .08, 1.18, z + .295, .05, .05, .005, INK), B(x - .24, 1.28, z + .29, .12, .04, .01, OURO), B(x + .12, 1.28, z + .29, .12, .04, .01, OURO),
      B(x - .04, 1.26, z + .29, .08, .2, .01, OURO), B(x - .06, 1.0, z + .29, .12, .04, .01, '#3B1A1A'), B(x - .03, 1.0, z - .3, .06, .4, .01, PAPEL),
      B(x - .26, .44, z - .17, .52, .5, .04, OURO), B(x - .26, .5, z - .135, .52, .1, .27, OURO), B(x - .1, .5, z + .14, .2, .1, .01, '#F2D06B'), B(x - .03, .53, z + .15, .06, .04, .005, ROSA)
    ] },
    fada: { R: LILAS, L: '#FFB3D1', T: ROSA, manga: 'curta', bl: (x, z) => [
      B(x - .72, .74, z - .2, .47, .52, .03, '#FFB3D1'), B(x + .25, .74, z - .2, .47, .52, .03, '#FFB3D1'), B(x - .62, .42, z - .2, .37, .32, .03, '#E8D4FF'), B(x + .25, .42, z - .2, .37, .32, .03, '#E8D4FF'),
      B(x - .7, 1.16, z - .21, .06, .06, .01, ROSA), B(x + .64, 1.16, z - .21, .06, .06, .01, ROSA), B(x - .32, .36, z - .18, .64, .12, .36, '#E8D4FF'),
      B(x - .26, 1.47, z - .26, .52, .04, .52, '#FFB3D1'), B(x - .22, 1.48, z + .2, .1, .08, .06, ROSA), B(x - .05, 1.48, z + .2, .1, .08, .06, AMARELO), B(x + .12, 1.48, z + .2, .1, .08, .06, ROSA)
    ].concat(brilho3(x, z, [[-.5, 1.1, -.17], [.5, 1.0, -.17], [-.45, .55, -.17], [.45, .6, -.17]])) },
    capeta: { R: VERM, L: '#B4152E', T: INK, bl: (x, z) => [
      B(x - .2, 1.44, z + .05, .06, .12, .06, VERM), B(x + .14, 1.44, z + .05, .06, .12, .06, VERM), B(x - .23, 1.54, z + .07, .04, .06, .04, VERM), B(x + .19, 1.54, z + .07, .04, .06, .04, VERM),
      B(x - .02, .4, z - .32, .04, .04, .2, VERM), B(x - .02, .42, z - .36, .04, .22, .04, VERM), B(x - .07, .62, z - .37, .14, .1, .05, VERM),
      B(x - .1, .86, z + .12, .2, .06, .02, '#B4152E'), B(x - .26, .44, z - .13, .52, .05, .26, INK)
    ] },
    mumia: { R: '#E8DFC8', L: '#E8DFC8', T: '#C9B79C', luva: '#E8DFC8', cobre: true, bl: (x, z) => [
      B(x - .29, .92, z - .29, .58, .56, .58, '#E8DFC8'), B(x - .295, 1.0, z - .295, .59, .03, .59, '#C9B79C'), B(x - .295, 1.36, z - .295, .59, .03, .59, '#C9B79C'),
      B(x - .2, 1.16, z + .29, .4, .1, .01, '#2B2F38'), B(x - .14, 1.19, z + .295, .05, .04, .005, AMARELO), B(x + .09, 1.19, z + .295, .05, .04, .005, AMARELO),
      B(x - .255, .6, z - .125, .51, .03, .25, '#C9B79C'), B(x - .255, .74, z - .125, .51, .03, .25, '#C9B79C'), B(x - .255, .86, z - .125, .51, .03, .25, '#C9B79C'), B(x + .2, .5, z + .12, .1, .03, .02, '#E8DFC8')
    ] },
    piloto: { R: PAPEL, L: PAPEL, T: INK, luva: ROSA, cobre: true, bl: (x, z) => {
      const out = [B(x - .3, .92, z - .3, .6, .58, .6, PAPEL), B(x - .24, 1.08, z + .3, .48, .22, .01, '#1B2A5A'), B(x - .18, 1.24, z + .31, .12, .04, .005, '#38E1FF'), B(x - .05, 1.5, z - .3, .1, .01, .6, ROSA), B(x - .05, .92, z - .31, .1, .58, .01, ROSA),
        B(x - .05, .44, z + .125, .1, .5, .01, ROSA), B(x + .12, .82, z + .125, .1, .04, .005, AMARELO), B(x - .22, .82, z + .125, .1, .04, .005, AZUL)];
      for(let i = 0; i < 8; i++) out.push(B(x - .25 + i * .0625, .64, z + .125, .0625, .05, .01, i % 2 ? INK : PAPEL));
      return out;
    } },
    rockeiro: { R: INK, L: '#2B2F38', T: INK, bl: (x, z) => [
      B(x - .06, .44, z + .125, .12, .5, .01, '#F4F3EF'), B(x - .05, .66, z + .13, .1, .06, .005, ROSA), B(x + .1, .5, z + .125, .03, .3, .005, '#C9CDD3'),
      B(x - .37, .92, z - .02, .04, .03, .04, '#C9CDD3'), B(x - .29, .92, z - .02, .04, .03, .04, '#C9CDD3'), B(x + .25, .92, z - .02, .04, .03, .04, '#C9CDD3'), B(x + .33, .92, z - .02, .04, .03, .04, '#C9CDD3'),
      B(x - .27, 1.3, z - .27, .54, .06, .54, INK), B(x - .1, 1.31, z + .275, .04, .04, .005, PAPEL), B(x + .06, 1.31, z + .275, .04, .04, .005, PAPEL),
      B(x - .16, .44, z - .2, .32, .3, .06, VERM), B(x - .12, .74, z - .2, .24, .12, .06, VERM), B(x - .05, .54, z - .205, .1, .06, .005, INK), B(x + .2, .8, z - .2, .05, .7, .03, '#5A3A1E'), B(x + .18, 1.5, z - .21, .09, .12, .04, INK)
    ] },
    /* ---------- v3.91 · a coleção de Halloween em 3D (os desenhos da cidade estão em verso.js, SKIN). A abóbora tremula a
       vela (brasa3), o Saci solta fumaça e gira o redemoinho, o esqueleto acende o olho de vez em quando ---------- */
    abobora: { R: INK, L: '#3B2466', T: '#FF7A1A', cobre: true, semCabeca: true, bl: (x, z) => {
      const b = brasa3(), A2 = '#D9580B';
      return [B(x - .32, .9, z - .32, .64, .56, .64, '#FF7A1A'), B(x - .26, 1.46, z - .26, .52, .04, .52, A2),
        B(x - .13, .9, z + .32, .05, .56, .005, A2), B(x + .08, .9, z + .32, .05, .56, .005, A2), B(x - .13, .9, z - .325, .05, .56, .005, A2), B(x + .08, .9, z - .325, .05, .56, .005, A2),
        B(x - .05, 1.5, z - .05, .1, .14, .1, '#6B4A32'),
        B(x - .24, 1.22, z + .325, .12, .09, .005, b), B(x + .12, 1.22, z + .325, .12, .09, .005, b), B(x - .04, 1.12, z + .325, .08, .06, .005, b),
        B(x - .2, .99, z + .325, .4, .07, .005, b), B(x - .05, 1.03, z + .33, .05, .03, .004, '#A8420A'),
        B(x - .09, .88, z + .125, .18, .06, .01, '#FF7A1A'), B(x - .26, .44, z - .13, .52, .05, .26, A2)
      ].concat(brilho3(x, z, [[-.25, 1.5, .2], [.2, 1.3, .33], [0, 1.66, 0], [-.2, .8, .13]]));
    } },
    saci: { R: '#E8DFC8', L: VERM, T: '#5E3A26', manga: 'curta', perna: 'bermuda', bl: (x, z) => {
      const t = performance.now() / 1000, out = [
        B(x - .27, 1.38, z - .27, .54, .12, .54, VERM), B(x - .22, 1.5, z - .2, .42, .1, .42, VERM), B(x - .12, 1.6, z - .14, .3, .1, .3, VERM),
        B(x + .04, 1.68, z - .1, .22, .08, .2, VERM), B(x + .2, 1.56, z - .08, .12, .16, .14, '#B4152E'),
        B(x + .04, 1.0, z + .25, .16, .03, .03, '#5A3A1E'), B(x + .17, .98, z + .27, .07, .09, .07, '#3B2D22'), B(x + .18, 1.07, z + .28, .05, .01, .05, '#FF7A1A'),
        B(x - .26, .44, z - .13, .52, .05, .26, '#8C5A2E'), B(x - .2, .7, z + .125, .12, .12, .01, '#C9B79C')];
      for(let i = 0; i < 3; i++){ const f = (t * .7 + i / 3) % 1, sz = .05 + f * .05; out.push(B(x + .2 + Math.sin(f * 7 + i) * .05 - sz / 2, 1.1 + f * .5, z + .3 - sz / 2, sz, sz, sz, '#DCDDE3')); }
      for(let k = 0; k < 10; k++){ const a = t * 6 + k * .9, r = .34 + (k % 3) * .06; out.push(B(x + Math.cos(a) * r - .03, .04 + (k % 6) * .07, z + Math.sin(a) * r - .03, .06, .06, .06, k % 3 ? '#C9B79C' : '#D9C27F')); }
      return out.concat(brilho3(x, z, [[.25, 1.62, -.05], [-.2, 1.45, .2]]));
    } },
    bruxa: { R: '#3B2466', L: '#3B2466', T: INK, bl: (x, z) => [
      B(x - .29, .02, z - .17, .58, .44, .34, '#3B2466'), B(x - .33, .02, z - .21, .66, .1, .42, '#2A1A4A'), B(x - .26, .44, z - .13, .52, .05, .26, LARANJA),
      B(x - .04, .44, z + .135, .08, .05, .005, OURO), B(x - .1, .9, z + .12, .2, .05, .01, LARANJA),
      B(x - .18, .7, z + .125, .04, .04, .005, LARANJA), B(x + .1, .55, z + .125, .04, .04, .005, LARANJA), B(x - .12, .25, z + .175, .04, .04, .005, LARANJA), B(x + .15, .12, z + .215, .04, .04, .005, LARANJA),
      B(x - .44, 1.42, z - .44, .88, .03, .88, INK), B(x - .25, 1.45, z - .25, .5, .14, .5, INK), B(x - .255, 1.47, z - .255, .51, .05, .51, LARANJA), B(x - .05, 1.47, z + .255, .1, .06, .005, OURO),
      B(x - .17, 1.59, z - .17, .34, .14, .34, INK), B(x - .09, 1.73, z - .09, .2, .12, .18, INK), B(x - .01, 1.85, z - .05, .12, .08, .1, INK), B(x + .08, 1.9, z - .03, .08, .05, .06, INK),
      B(x + .3, .1, z - .3, .04, 1.4, .04, '#8C5A2E'), B(x + .24, .04, z - .34, .16, .28, .12, '#D9C27F'), B(x + .24, .3, z - .34, .16, .03, .12, '#5A3A1E')
    ] },
    esqueleto: { R: INK, L: INK, T: INK, luva: '#EDE6D6', cobre: true, semCabeca: true, bl: (x, z) => {
      const O = '#EDE6D6', O2 = '#BFB6A2', out = [B(x - .29, .92, z - .29, .58, .54, .58, O), B(x - .2, .9, z - .2, .4, .06, .4, O2),
        B(x - .19, 1.14, z + .29, .13, .13, .005, INK), B(x + .06, 1.14, z + .29, .13, .13, .005, INK), B(x - .03, 1.06, z + .29, .06, .05, .005, INK),
        B(x - .16, .97, z + .29, .32, .04, .005, O2), B(x - .03, .44, z - .125, .06, .5, .005, O), B(x - .04, .62, z + .125, .08, .3, .005, O), B(x - .16, .46, z + .125, .32, .05, .005, O)];
      [.84, .74, .64].forEach(y => out.push(B(x - .21, y, z + .125, .14, .03, .005, O), B(x + .07, y, z + .125, .14, .03, .005, O)));
      if(Math.floor(performance.now() / 260) % 9 < 2) out.push(B(x - .14, 1.18, z + .292, .04, .04, .004, ROSA), B(x + .1, 1.18, z + .292, .04, .04, .004, ROSA));
      return out;
    } },
    lobisomem: { R: '#7A1F3D', L: '#2E4A7A', T: '#4A3424', luva: '#6B4A32', cobre: true, semCabeca: true, bl: (x, z) => [
      B(x - .29, .92, z - .29, .58, .56, .58, '#6B4A32'), B(x - .27, 1.46, z - .08, .13, .16, .1, '#6B4A32'), B(x + .14, 1.46, z - .08, .13, .16, .1, '#6B4A32'),
      B(x - .23, 1.48, z + .02, .06, .1, .005, '#C46A8A'), B(x + .17, 1.48, z + .02, .06, .1, .005, '#C46A8A'),
      B(x - .14, .96, z + .29, .28, .2, .16, '#A07A55'), B(x - .05, 1.12, z + .45, .1, .05, .005, INK), B(x - .1, .96, z + .45, .03, .04, .004, PAPEL), B(x + .07, .96, z + .45, .03, .04, .004, PAPEL),
      B(x - .2, 1.24, z + .29, .11, .05, .005, AMARELO), B(x + .09, 1.24, z + .29, .11, .05, .005, AMARELO),
      B(x - .34, 1.02, z - .1, .05, .2, .2, '#6B4A32'), B(x + .29, 1.02, z - .1, .05, .2, .2, '#6B4A32'),
      B(x - .16, .66, z + .125, .1, .1, .005, '#6B4A32'), B(x + .06, .56, z + .125, .1, .08, .005, '#6B4A32'), B(x - .12, .88, z + .125, .24, .06, .005, '#6B4A32'),
      B(x - .05, .4, z - .3, .1, .1, .2, '#6B4A32'), B(x - .05, .3, z - .44, .1, .14, .1, '#A07A55')
    ] },
    lencol: { R: PAPEL, L: PAPEL, T: INK, luva: PAPEL, cobre: true, semCabeca: true, bl: (x, z) => [
      B(x - .33, .12, z - .28, .66, 1.4, .56, PAPEL), B(x - .27, 1.52, z - .22, .54, .06, .44, PAPEL),
      B(x - .18, 1.16, z + .28, .11, .13, .005, INK), B(x + .07, 1.16, z + .28, .11, .13, .005, INK),
      B(x - .33, .12, z + .28, .14, .04, .005, '#D9DEE6'), B(x + .02, .12, z + .28, .16, .04, .005, '#D9DEE6')
    ] },
    mortovivo: { R: '#6B5B7A', L: '#4A4E56', T: '#5A4634', luva: '#A9A3BF', cobre: true, semCabeca: true, bl: (x, z) => [
      B(x - .27, .93, z - .27, .54, .52, .54, '#A9A3BF'), B(x - .28, 1.42, z - .28, .56, .06, .56, '#3B2D22'), B(x - .1, 1.46, z - .1, .08, .06, .08, '#3B2D22'), B(x + .08, 1.46, z + .02, .06, .05, .06, '#3B2D22'),
      B(x - .19, 1.16, z + .27, .12, .12, .005, PAPEL), B(x - .17, 1.18, z + .272, .05, .05, .004, INK), B(x + .06, 1.18, z + .27, .12, .04, .005, INK),
      B(x - .12, 1.0, z + .27, .14, .04, .005, '#3B1A1A'), B(x + .04, 1.03, z + .27, .16, .02, .005, '#5E3A4A'),
      B(x - .14, .66, z + .125, .06, .12, .005, '#A9A3BF'), B(x + .12, .56, z + .125, .06, .06, .005, '#A9A3BF'), B(x - .2, .46, z + .125, .14, .05, .005, '#A9A3BF')
    ] },
    gatopreto: { R: INK, L: INK, T: INK, bl: (x, z) => [
      B(x - .26, 1.42, z - .06, .13, .14, .08, INK), B(x + .13, 1.42, z - .06, .13, .14, .08, INK), B(x - .22, 1.44, z + .02, .06, .08, .005, ROSA), B(x + .16, 1.44, z + .02, .06, .08, .005, ROSA),
      B(x - .04, 1.06, z + .25, .08, .05, .005, ROSA), B(x - .4, 1.06, z + .25, .16, .015, .005, '#2B2F38'), B(x + .24, 1.06, z + .25, .16, .015, .005, '#2B2F38'),
      B(x - .26, .9, z - .13, .52, .04, .26, ROSA), B(x - .04, .84, z + .13, .08, .07, .04, OURO),
      B(x - .03, .48, z - .32, .06, .06, .2, INK), B(x - .03, .5, z - .38, .06, .36, .06, INK), B(x - .03, .82, z - .34, .06, .06, .06, INK)
    ] }
  };
  /* v3.77: senta = sentado (no banco do Calçadão): a perna vai pra frente, na altura do assento, e a mão no joelho */
  function boneco(av, x, z, yaw, passo, andando, senta){
    const K = C.verso.cores, P = K.PELES[av.pele], H = K.CAB_CORES[av.corCabelo];
    const SK = !av.personagem && av.skin && SKIN3D[av.skin] ? SKIN3D[av.skin] : null;
    const R = SK ? SK.R : K.ROUPA_CORES[av.corRoupa], Lc = SK ? SK.L : K.CALCA_CORES[av.corCalca], T = SK ? SK.T : K.TENIS_CORES[av.tenis];
    const roupa = SK ? (SK.manga === 'curta' ? 'camiseta' : 'uniforme') : av.roupa, perna = SK && SK.perna ? SK.perna : av.perna, estampa = SK ? 'nada' : av.estampa, corrente = SK ? 'nada' : av.corrente, topo = SK ? 'nada' : av.topo, MAO = SK && SK.luva ? SK.luva : P, cobre = !!(SK && SK.cobre);
    const Rd = escurece(R, .8), out = [], giro = { yaw, piv: [x, 0, z] };
    const sw = andando ? Math.sin(passo) * .75 : 0;
    const add = (b, T2, extra) => out.push(solido(b, T2 ? [T2, giro] : [giro], b.c, 'eu', extra));
    if(av.personagem){ personagem3D(av.personagem, x, z, add, sw, av); return out; }
    /* pernas (4 x 7 px → .25 x .44) com os tênis; bermuda mostra a canela */
    const pe = (sx, sinal) => {
      const T2 = { pitch: senta ? -Math.PI / 2 : sw * sinal, piv: [x, .44, z] };
      if(perna === 'bermuda'){ add(B(x + sx, .22, z - .12, .22, .22, .24, Lc), T2); add(B(x + sx, .08, z - .12, .22, .14, .24, P), T2); }
      else add(B(x + sx, .08, z - .12, .22, .36, .24, Lc), T2);
      add(B(x + sx - .01, 0, z - .14, .24, .09, .3, T), T2);
    };
    pe(-.24, 1); pe(.02, -1);
    /* tronco e braços */
    add(B(x - .25, .44, z - .12, .5, .5, .24, R));
    if(roupa === 'jaqueta') add(B(x - .03, .44, z + .12, .06, .5, .01, Rd));
    /* (v4.04: o morador pode trazer a cor da listra: a camisa rubro-negra do Marcão) */
    if(estampa === 'listras'){ const LS = av.listra || Rd; add(B(x - .25, .56, z + .12, .5, .05, .01, LS)); add(B(x - .25, .7, z + .12, .5, .05, .01, LS)); add(B(x - .25, .84, z + .12, .5, .05, .01, LS)); }
    else if(estampa !== 'nada') add(B(x - .08, .62, z + .12, .16, .16, .01, R === PAPEL ? ROSA : PAPEL));
    if(corrente === 'ouro') add(B(x - .12, .84, z + .12, .24, .04, .01, OURO));
    const braco = (sx, sinal) => { const T2 = { pitch: (senta ? -.5 : 0) - sw * sinal, piv: [x, .9, z] }; const manga = roupa === 'regata' ? P : R; add(B(x + sx, .62, z - .1, .14, .32, .2, manga), T2); add(B(x + sx, .44, z - .1, .14, .18, .2, roupa === 'camiseta' || roupa === 'regata' ? P : MAO), T2); };
    braco(-.39, 1); braco(.25, -1);
    /* o uniforme por cima (chapéu, capacete, crachá, capa…) */
    if(SK) SK.bl(x, z).forEach(b => add(b));
    /* cabeça (8 x 8 → .5), olhos, barba, cabelo, o que tem na cabeça e os óculos */
    /* v3.91: a skin que é a cabeça inteira (abóbora, caveira, lobisomem, lençol, morto-vivo) tira a cabeça do boneco: a
       caixa maior por fora dela perdia pra cabeça na ordem de desenho, dependendo de onde tava a câmera */
    if(!(SK && SK.semCabeca)){
    add(B(x - .25, .94, z - .25, .5, .5, .5, P));
    add(B(x - .16, 1.2, z + .25, .08, .08, .01, INK)); add(B(x + .08, 1.2, z + .25, .08, .08, .01, INK));
    if(av.barba !== 'nada') add(B(x - .2, .94, z + .24, .4, av.barba === 'barba' ? .14 : .08, .03, escurece(H, .85)));
    const cab = cobre ? 'raspado' : av.cabelo, Hd = escurece(H, .85);
    if(cab === 'curto'){ add(B(x - .26, 1.38, z - .26, .52, .08, .52, H)); add(B(x - .26, 1.28, z + .2, .52, .12, .08, H)); }
    else if(cab === 'black' || cab === 'cacheado'){ add(B(x - .3, 1.36, z - .3, .6, .16, .6, H)); add(B(x - .28, 1.24, z + .2, .56, .14, .1, H)); add(B(x - .28, 1.1, z - .3, .56, .3, .08, Hd)); if(cab === 'cacheado'){ add(B(x - .34, 1.14, z - .14, .08, .3, .3, H)); add(B(x + .26, 1.14, z - .14, .08, .3, .3, H)); } }
    else if(cab === 'trancas'){ add(B(x - .26, 1.38, z - .26, .52, .08, .52, H)); add(B(x - .3, .9, z - .28, .07, .5, .14, Hd)); add(B(x + .23, .9, z - .28, .07, .5, .14, Hd)); add(B(x - .14, .85, z - .31, .28, .55, .06, H)); add(B(x - .26, 1.3, z + .2, .52, .1, .08, H)); }
    else if(cab === 'coque'){ add(B(x - .26, 1.38, z - .26, .52, .08, .52, H)); add(B(x - .1, 1.42, z - .38, .2, .18, .2, H)); add(B(x - .26, 1.3, z + .2, .52, .1, .08, H)); }
    else if(cab === 'longo'){ add(B(x - .26, 1.38, z - .26, .52, .08, .52, H)); add(B(x - .27, .72, z - .33, .54, .68, .1, Hd)); add(B(x - .3, 1.02, z - .26, .05, .4, .5, H)); add(B(x + .25, 1.02, z - .26, .05, .4, .5, H)); add(B(x - .26, 1.3, z + .2, .52, .1, .08, H)); }
    else if(cab === 'moicano'){ add(B(x - .06, 1.44, z - .28, .12, .18, .56, H)); }
    const CAP = R === PAPEL ? ROSA : R;
    if(topo === 'bone' || topo === 'bonetras'){ add(B(x - .27, 1.38, z - .27, .54, .11, .54, CAP)); add(topo === 'bone' ? B(x - .2, 1.38, z + .27, .4, .04, .2, CAP) : B(x - .2, 1.38, z - .47, .4, .04, .2, CAP)); }
    else if(topo === 'gorro'){ add(B(x - .28, 1.3, z - .28, .56, .22, .56, Rd)); add(B(x - .09, 1.52, z - .09, .18, .1, .18, PAPEL)); }
    else if(topo === 'fone'){ add(B(x - .3, 1.42, z - .06, .6, .06, .12, INK)); add(B(x - .33, 1.08, z - .11, .08, .24, .22, INK)); add(B(x + .25, 1.08, z - .11, .08, .24, .22, INK)); }
    else if(topo === 'bandana'){ add(B(x - .27, 1.3, z - .27, .54, .08, .54, ROSA)); }
    if(av.oculos === 'escuro') add(B(x - .22, 1.18, z + .25, .44, .11, .03, INK));
    else if(av.oculos === 'grau'){ add(B(x - .2, 1.17, z + .25, .16, .12, .02, INK)); add(B(x + .04, 1.17, z + .25, .16, .12, .02, INK)); }
    }
    /* o skate nas costas, de viés */
    if(av.skate){ add(B(x - .36, .4, z - .2, .72, .05, .22, '#2B2F38'), { pitch: 0, piv: [x, .4, z] }); add(B(x - .3, .45, z - .18, .08, .05, .08, PAPEL)); add(B(x + .22, .45, z - .18, .08, .05, .08, PAPEL)); }
    return out;
  }

  /* ---------- estado ---------- */
  const S = { aberta: false, lugar: '', el: null, cv: null, ctx: null, raf: 0, tAnt: 0, meu: false, dono: null, itens: [], outras: {}, modo: 'andar', sel: -1, ghost: null, disco: null, discoAtual: '',
    cam: { th: 0, ph: .95, dist: 15, tx: 10, ty: 0, tz: 16, fov: 0 }, eu: null, alvo: null, acao: null, teclas: new Set(), hit: [], hist: false, ignora: 0,
    fixos: [], decor: [], cacheItens: null, grades: [null, null], rota: [], salvaT: 0, sujo: false, pointer: null, pinch: null, tags: new Map(), titulo: '', ultOnde: '', corUlt: {} };
  const comodoDe = (x, z, n) => COMODOS.find(c => (c.n || 0) === (n || 0) && x >= c.x0 && x < c.x1 && z >= c.z0 && z < c.z1) || null;
  const nivelDe = y => (y > 1.5 ? 1 : 0);
  const naEscada = (x, z) => { const e = PL && PL.escada; return !!e && x >= e.x0 && x <= e.x1 && z >= e.z0 && z <= e.z1; };
  const noMezanino = (x, z) => { const m = PL && PL.mezanino; return !!m && x >= m.x0 && x <= m.x1 && z >= m.z0 && z <= m.z1; };
  /* a altura do chão num ponto: a rampa da escada sobe; em cima do mezanino, quem subiu fica em cima (quem tá embaixo, embaixo) */
  function alturaEm(x, z, yAnt){
    const e = PL && PL.escada, m = PL && PL.mezanino;
    if(e && naEscada(x, z)) return Math.max(0, Math.min(e.topo, e.topo * (e.z1 - z) / (e.z1 - e.z0)));
    if(m && noMezanino(x, z)) return yAnt > 1.5 ? m.y : 0;
    return 0;
  }
  const pegadaDe = (it, r) => (r & 1) ? { w: it.d, d: it.w } : { w: it.w, d: it.d };
  /* o que a decoração fixa ocupa no chão: cada bloco baixo (até 1,2 m) conta; o que tá no alto (prateleira, lustre) não */
  const pegadasDecor = e => (e.parede || e.piso) ? [] : e.bl.filter(b => b.y < 1.2 && !b.yaw).map(b => ({ x: e.x + b.x, z: e.z + b.z, w: b.w, d: b.d }));
  /* blocos de um item no mundo: gira no centro do espaço que ocupa e leva pro lugar */
  /* ---------- o que é "colado" em cima de outra caixa (adesivo, tela, listra, pôster) ----------
     uma caixa fininha encostada na face de outra é desenhada logo depois dela, sempre: o desenho ordena as caixas pela
     distância do centro, e um detalhe baixo numa parede alta ficaria "atrás" dela. Pra cada caixa fina, acha a caixa da
     mesma lista em que ela encosta (a menor que a contém); as listas prontas ficam guardadas */
  const FINA = .03, FOLGA = .035;
  const mesmoGiro = (a, b) => (a.yaw || 0) === (b.yaw || 0) && (a.pitch || 0) === (b.pitch || 0) && (a.roll || 0) === (b.roll || 0) && String(a.piv || '') === String(b.piv || '');
  /* em que caixa da lista a caixa fina `d` encosta, e pra que lado a face dela olha (normal, no espaço do móvel) */
  function baseDe(d, lista, ignora){
    const eixo = d.d <= FINA && d.d <= d.w && d.d <= d.h ? 'z' : d.h <= FINA && d.h <= d.w && d.h <= d.d ? 'y' : d.w <= FINA && d.w <= d.h && d.w <= d.d ? 'x' : '';
    if(!eixo) return null;
    let melhor = null, area = Infinity;
    for(let i = 0; i < lista.length; i++){
      const b = lista[i]; if(i === ignora || b === d || !mesmoGiro(d, b)) continue;
      let ok = false, a = 0, n = null;
      if(eixo === 'z' && d.x >= b.x - FOLGA && d.x + d.w <= b.x + b.w + FOLGA && d.y >= b.y - FOLGA && d.y + d.h <= b.y + b.h + FOLGA){ if(Math.abs(d.z - (b.z + b.d)) <= FOLGA){ ok = true; n = [0, 0, 1]; } else if(Math.abs(d.z + d.d - b.z) <= FOLGA){ ok = true; n = [0, 0, -1]; } a = b.w * b.h; }
      else if(eixo === 'y' && d.x >= b.x - FOLGA && d.x + d.w <= b.x + b.w + FOLGA && d.z >= b.z - FOLGA && d.z + d.d <= b.z + b.d + FOLGA){ if(Math.abs(d.y - (b.y + b.h)) <= FOLGA){ ok = true; n = [0, 1, 0]; } else if(Math.abs(d.y + d.h - b.y) <= FOLGA){ ok = true; n = [0, -1, 0]; } a = b.w * b.d; }
      else if(eixo === 'x' && d.y >= b.y - FOLGA && d.y + d.h <= b.y + b.h + FOLGA && d.z >= b.z - FOLGA && d.z + d.d <= b.z + b.d + FOLGA){ if(Math.abs(d.x - (b.x + b.w)) <= FOLGA){ ok = true; n = [1, 0, 0]; } else if(Math.abs(d.x + d.w - b.x) <= FOLGA){ ok = true; n = [-1, 0, 0]; } a = b.h * b.d; }
      if(ok && a < area){ area = a; melhor = { i, n }; }
    }
    return melhor;
  }
  /* a normal girada do jeito que a caixa (e o móvel) giram: pitch, roll e yaw, nessa ordem */
  function giraNormal(n, b, yaw){
    let [x, y, z] = n;
    if(b && b.pitch){ const c = Math.cos(b.pitch), s = Math.sin(b.pitch), y2 = y * c - z * s, z2 = y * s + z * c; y = y2; z = z2; }
    if(b && b.roll){ const c = Math.cos(b.roll), s = Math.sin(b.roll), x2 = x * c - y * s, y2 = x * s + y * c; x = x2; y = y2; }
    const yy = (b && b.yaw || 0) + (yaw || 0);
    if(yy){ const c = Math.cos(yy), s = Math.sin(yy), x2 = x * c + z * s, z2 = -x * s + z * c; x = x2; z = z2; }
    return [x, y, z];
  }
  const COLAS = new WeakMap();
  function colagem(bl){
    let v = COLAS.get(bl); if(v) return v;
    v = bl.map((b, i) => baseDe(b, bl, i)); COLAS.set(bl, v); return v;
  }
  /* liga cada sólido ao sólido em que ele tá colado (na mesma lista, ou numa lista fixa à parte), com a normal da face */
  function cola(sol, bl, yaw, solBase, blBase){
    if(solBase){ bl.forEach((b, i) => { const k = baseDe(b, blBase, -1); if(k && solBase[k.i]){ sol[i].cola = solBase[k.i]; sol[i].colaN = giraNormal(k.n, b, yaw); } }); return sol; }
    colagem(bl).forEach((k, i) => { if(k){ sol[i].cola = sol[k.i]; sol[i].colaN = giraNormal(k.n, bl[i], yaw); } }); return sol;
  }
  function solidosItem(it, x, z, r, dono, extra, y, bl){
    const p = pegadaDe(it, r), yaw = r * Math.PI / 2, tx = x + p.w / 2 - it.w / 2, tz = z + p.d / 2 - it.d / 2;
    bl = bl || M.blocos(it, 0);
    return cola(sobe(bl.map(b => { const bb = Object.assign({}, b, { x: b.x + tx, z: b.z + tz }); if(b.piv) bb.piv = [b.piv[0] + tx, b.piv[1], b.piv[2] + tz]; return solido(bb, [{ yaw, piv: [tx + it.w / 2, 0, tz + it.d / 2] }], b.c, dono, extra); }), y || 0), bl, yaw);
  }
  /* o chão de um móvel (térreo ou mezanino) e, no móvel de teto, o quanto ele sobe pra pendurar no teto daquele cômodo */
  const chaoItem = i => (i.n && PL.mezanino ? PL.mezanino.y : 0);
  function alturaItem(it, i){
    const y0 = chaoItem(i); if(!it || !it.teto) return y0;
    const p = pegadaDe(it, i.r || 0), cx = i.x + p.w / 2, cz = i.z + p.d / 2;
    const h = i.n ? ALT - (PL.mezanino ? PL.mezanino.y : 0) : (PL.mezanino && noMezanino(cx, cz) ? PL.mezanino.y : ALT);
    return y0 + Math.min(h, 4.5) - M.TETO_REF;
  }
  const blocosDe = i => M.blocos(ITEM[i.k], i.c);
  /* o móvel não ocupa chão: tapete, o que fica na parede e o que pendura no teto */
  const semChao = it => !!(it.piso || it.parede || it.teto);

  /* ---------- colisão: grade de 1/4 de metro ---------- */
  const G = 4; let GW = W * G + 1, GD = D * G + 1;
  function montaGrade(){
    GW = W * G + 1; GD = D * G + 1;
    const g0 = new Uint8Array(GW * GD), g1 = new Uint8Array(GW * GD);
    const marcaEm = (g, x0, z0, x1, z1) => { for(let z = Math.max(0, Math.floor(z0 * G)); z < Math.min(GD, Math.ceil(z1 * G)); z++) for(let x = Math.max(0, Math.floor(x0 * G)); x < Math.min(GW, Math.ceil(x1 * G)); x++) g[z * GW + x] = 1; };
    /* a escada tem um lado fechado (o do corrimão): ninguém entra nela pelo meio */
    if(PL.escada){ const e = PL.escada; marcaEm(g0, e.x0 - .2, e.z0, e.x0, e.z1); marcaEm(g1, e.x0 - .2, e.z0, e.x0, e.z1); }
    PAREDES.forEach(p => {
      const [ax, az] = p.a, [bx, bz] = p.b, L = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / L, dz = (bz - az) / L, meia = ESP / 2;
      /* parede que passa do mezanino (as de fora) também segura quem tá em cima */
      const alta = !!PL.mezanino && (p.alt || ALT) > PL.mezanino.y + .5;
      /* v3.81: a parede marca a grade com 6 cm de folga (célula que ela só raspa não conta). Porta de 1,2 m que caía
         torta na grade de 25 cm (as do 9,4 ao 10,6 da casa padrão) ficava com duas células livres, e o boneco precisa
         de três: o quarto da casa padrão não tinha como entrar andando */
      const F = .06, marca = (x0, z0, x1, z1) => { x0 += F; z0 += F; x1 -= F; z1 -= F; marcaEm(g0, x0, z0, x1, z1); if(alta) marcaEm(g1, x0, z0, x1, z1); };
      const gaps = (p.portas || []).slice();
      let cortes = [0, L]; gaps.forEach(gp => cortes.push(gp[0], gp[1])); cortes = [...new Set(cortes)].sort((a, b) => a - b);
      for(let i = 0; i + 1 < cortes.length; i++){
        const t0 = cortes[i], t1 = cortes[i + 1], meio = (t0 + t1) / 2;
        if(gaps.some(gp => meio > gp[0] && meio < gp[1])) continue;
        const x0 = ax + dx * t0, z0 = az + dz * t0, x1 = ax + dx * t1, z1 = az + dz * t1;
        marca(Math.min(x0, x1) - meia, Math.min(z0, z1) - meia, Math.max(x0, x1) + meia, Math.max(z0, z1) + meia);
      }
    });
    S.fixos.forEach(e => { if(!e.parede) marcaEm(e.y > 1.5 ? g1 : g0, e.x, e.z, e.x + e.w, e.z + e.d); });
    S.decor.forEach(e => { const g = (e.y || 0) > 1.5 ? g1 : g0; pegadasDecor(e).forEach(q => marcaEm(g, q.x, q.z, q.x + q.w, q.z + q.d)); });
    /* v3.49: chão que não se pisa (a água do Torneio de Pesca): bloqueia na grade sem desenhar nada */
    if(PL.bloqueio) PL.bloqueio.forEach(([x0, z0, x1, z1]) => marcaEm(g0, x0, z0, x1, z1));
    S.itens.forEach(i => { const it = ITEM[i.k]; if(!it || semChao(it)) return; const p = pegadaDe(it, i.r); marcaEm(i.n ? g1 : g0, i.x, i.z, i.x + p.w, i.z + p.d); });
    S.grades = [g0, g1];
  }
  const bate = (x, z, n) => { if(x < -2 || z < -2 || x > W + 2 || z > D + 2) return true; const g = S.grades[n || 0]; if(!g) return false; const cx0 = Math.floor((x - RAIO) * G), cx1 = Math.floor((x + RAIO) * G), cz0 = Math.floor((z - RAIO) * G), cz1 = Math.floor((z + RAIO) * G); for(let cz = cz0; cz <= cz1; cz++) for(let cx = cx0; cx <= cx1; cx++){ if(cx < 0 || cz < 0 || cx >= GW || cz >= GD) continue; if(g[cz * GW + cx]) return true; } return false; };
  /* anda, sem atravessar nada e sem cair do mezanino (o chão só muda de altura pela escada) */
  function mover(e, dx, dz){
    const n = nivelDe(e.y), preso = bate(e.x, e.z, n);
    /* se já nasceu dentro de alguma coisa (móvel velho na soleira), pode andar até sair */
    /* v3.59: voando da rampa (corrida), a altura do chão não é degrau: segue em frente (antes travava no ar) */
    const voa = e === S.eu && S.corrida && S.corrida.pulo;
    /* v3.62: o carro bate pelos lados e pela frente, não só pelo meio (senão a lataria entrava no muro de pneu) */
    const car = e === S.eu && S.corrida && S.corrida.P.carro, cy = Math.cos(e.yaw || 0), sy = Math.sin(e.yaw || 0);
    const bateCarro = (nx, nz) => [[.6, .3], [-.6, .3], [.55, 1.45], [-.55, 1.45], [.55, -1.4], [-.55, -1.4]].some(([l, f]) => bate(nx + cy * l + sy * f, nz - sy * l + cy * f, n));
    /* quina já encostada (bateu na brita e foi parar no muro): deixa sair, senão nenhum movimento passava e o carro ficava preso */
    const presoCarro = car && bateCarro(e.x, e.z);
    const tenta = (nx, nz) => { if(!preso && (bate(nx, nz, n) || (car && !presoCarro && bateCarro(nx, nz)))) return false; const y = alturaEm(nx, nz, e.y); if(!voa && Math.abs(y - e.y) > .6) return false; e.x = nx; e.z = nz; if(!voa) e.y = y; return true; };
    tenta(e.x + dx, e.z); tenta(e.x, e.z + dz);
  }
  /* um lugar livre perto de um ponto (pro boneco nascer sem ficar preso) */
  function livrePerto(x, z, n){
    if(!bate(x, z, n)) return [x, z];
    for(let r = .5; r <= 3; r += .5) for(let a = 0; a < 12; a++){ const t = a / 12 * Math.PI * 2, px = x + Math.cos(t) * r, pz = z + Math.sin(t) * r; if(px > .3 && pz > .3 && px < W - .3 && pz < D - .3 && comodoDe(px, pz, n) && !bate(px, pz, n)) return [px, pz]; }
    return [x, z];
  }

  /* ---------- os blocos fixos: paredes e janelas (por quadro, pra esconder o que fica na frente) ---------- */
  function solidosParedes(cam){
    const out = [], eu = S.eu;
    PAREDES.forEach((p, pi) => {
      const [ax, az] = p.a, [bx, bz] = p.b, L = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / L, dz = (bz - az) / L, meia = ESP / 2;
      const nx = p.ext ? p.ext[0] : -dz, nz = p.ext ? p.ext[1] : dx;
      const caixa = (t0, t1, y0, y1, cor, extra) => { const x0 = ax + dx * t0, z0 = az + dz * t0, x1 = ax + dx * t1, z1 = az + dz * t1; const X0 = Math.min(x0, x1) - meia, Z0 = Math.min(z0, z1) - meia; return solido({ x: X0, y: y0, z: Z0, w: Math.max(x0, x1) + meia - X0, h: y1 - y0, d: Math.max(z0, z1) + meia - Z0, c: cor }, null, cor, null, extra); };
      if(p.grade){
        for(let t = 0; t < L; t += 2){ out.push(caixa(t - .05, t + .05, 0, .95, '#4A4E56', { semTraco: false })); }
        /* o corrimão vai em pedaços de 1 m: peça comprida demais erra a ordem de desenho com o que tá perto da ponta */
        for(let t = 0; t < L; t += 1){ const t1 = Math.min(L, t + 1); out.push(caixa(t, t1, .82, .92, MAD, { semTraco: true })); out.push(caixa(t, t1, .4, .46, '#4A4E56', { semTraco: true })); }
        return;
      }
      /* a parede fica entre a câmera e você? (vocês dois de lados diferentes do plano dela) */
      const cxm = (ax + bx) / 2, czm = (az + bz) / 2;
      const ladoC = nx * (cam.pos[0] - cxm) + nz * (cam.pos[2] - czm), ladoE = eu ? nx * (eu.x - cxm) + nz * (eu.z - czm) : -ladoC;
      const separa = ladoC * ladoE < 0, mureta = separa && p.ext, vidroFraco = separa && !p.ext;
      const gaps = (p.portas || []), jans = p.janelas || [], altas = p.altas || [], altP = p.alt || ALT, COR = p.cor || (p.tijolo ? TIJ : PAREDE);
      let cortes = [0, L]; gaps.forEach(gp => cortes.push(gp[0], gp[1])); jans.forEach(j => cortes.push(j[0], j[1])); altas.forEach(j => cortes.push(j[0], j[1]));
      for(let t = 1; t < L; t++) cortes.push(t);
      cortes = [...new Set(cortes)].sort((a, b) => a - b);
      for(let i = 0; i + 1 < cortes.length; i++){
        const t0 = cortes[i], t1 = cortes[i + 1], meio = (t0 + t1) / 2;
        const porta = gaps.some(gp => meio > gp[0] && meio < gp[1]), jan = !mureta && jans.some(j => meio > j[0] && meio < j[1]), alta = !mureta && altas.some(j => meio > j[0] && meio < j[1]);
        const extra = vidroFraco ? { alpha: .38 } : {};
        if(porta){ if(!mureta && altP > 2.3) out.push(caixa(t0, t1, 2.15, altP, COR, extra)); continue; }
        if(mureta){ out.push(caixa(t0, t1, 0, .35, COR, { traco: 'rgba(15,18,24,.5)' })); continue; }
        if(alta){
          /* janelão de ferro: vidro do chão quase ao teto, com os montantes pretos */
          out.push(caixa(t0, t1, 0, .5, COR, extra)); out.push(caixa(t0, t1, altP - .4, altP, COR, extra));
          out.push(caixa(t0, t1, .5, altP - .4, VIDRO, { alpha: .88, cru: true, traco: 'rgba(15,18,24,.5)' }));
          out.push(caixa(t0 - .04, t0 + .04, .5, altP - .4, INK, { semTraco: true }));
          [2, 3.5].forEach(y => out.push(caixa(t0, t1, y - .04, y + .04, INK, { semTraco: true })));
          continue;
        }
        if(jan){ out.push(caixa(t0, t1, 0, 1, COR, extra)); out.push(caixa(t0, t1, 2.2, altP, COR, extra)); out.push(caixa(t0, t1, 1, 2.2, VIDRO, { alpha: .92, cru: true, traco: 'rgba(15,18,24,.6)' })); continue; }
        out.push(caixa(t0, t1, 0, altP, COR, extra));
        out.push(caixa(t0, t1, 0, .12, RODAPE, Object.assign({ semTraco: true }, extra)));
      }
      /* a porta de entrada: tapete na soleira (a parede da frente vira muretinha e a porta some) */
      if(p.entrada && pi === 0){ const tp = PL.tapete || { x: ENTRADA.x - .7, z: ENTRADA.z - 1.2, w: 1.4, d: 1 }; out.push(solido({ x: tp.x, y: 0, z: tp.z, w: tp.w, h: .02, d: tp.d, c: ROSA }, null, ROSA, 'saida', { semTraco: true })); }
    });
    return out;
  }
  /* o mezanino (laje em placas, guarda-corpo) e a escada de concreto com degraus de madeira. Quem tá embaixo do
     mezanino vê a laje e o que tá em cima meio transparente, pra não ficar no escuro */
  function solidosAndares(){
    const out = [], m = PL.mezanino, e = PL.escada; if(!m && !e) return out;
    const fraco = S.eu && nivelDe(S.eu.y) === 0 && m && noMezanino(S.eu.x, S.eu.z) ? { alpha: .16, semTraco: true } : {};
    if(m){
      /* v3.86: o corrimão e os pilares podem vir na cor da planta (o ouro da mansão do @playboy) */
      const esp = .22, piso = (COMODOS.find(c => c.n === 1) || {}).piso || MAD, COR = m.corrimao || MAD, PIL = m.pilar || INK;
      for(let x = m.x0; x < m.x1; x += 2) for(let z = m.z0; z < m.z1; z += 2) out.push(solido({ x, y: m.y - esp, z, w: Math.min(2, m.x1 - x), h: esp, d: Math.min(2, m.z1 - z), c: piso }, null, piso, 'piso1', Object.assign({ traco: 'rgba(60,30,10,.25)' }, fraco)));
      (m.grade || []).forEach(([x0, z0, x1, z1]) => {
        const L = Math.hypot(x1 - x0, z1 - z0), dx = (x1 - x0) / L, dz = (z1 - z0) / L;
        for(let t = 0; t <= L; t += 1.5){ const px = x0 + dx * t, pz = z0 + dz * t; out.push(solido({ x: px - .04, y: m.y, z: pz - .04, w: .08, h: .95, d: .08, c: PIL }, null, PIL, null, Object.assign({ semTraco: true }, fraco))); }
        out.push(solido({ x: Math.min(x0, x1) - .05, y: m.y + .9, z: Math.min(z0, z1) - .05, w: Math.abs(x1 - x0) + .1 || .1, h: .07, d: Math.abs(z1 - z0) + .1 || .1, c: COR }, null, COR, null, fraco));
        out.push(solido({ x: Math.min(x0, x1) - .03, y: m.y + .45, z: Math.min(z0, z1) - .03, w: Math.abs(x1 - x0) + .06 || .06, h: .05, d: Math.abs(z1 - z0) + .06 || .06, c: PIL }, null, PIL, null, Object.assign({ semTraco: true }, fraco)));
      });
    }
    if(e){
      /* v3.86: a escada também pode vir na cor da planta (o mármore da mansão do @playboy) */
      const n = Math.round(e.z1 - e.z0), passo = (e.z1 - e.z0) / n, CE = e.cor || '#4A4E56', CD = e.degrau || MAD, CP = e.pilar || INK;
      for(let i = 0; i < n; i++){
        const h = e.topo * (i + 1) / n, z1 = e.z1 - i * passo, z0 = z1 - passo;
        out.push(solido({ x: e.x0, y: 0, z: z0, w: e.x1 - e.x0, h: h - .06, d: passo, c: CE }, null, CE, 'escada'));
        out.push(solido({ x: e.x0 - .02, y: h - .06, z: z0 - .03, w: e.x1 - e.x0 + .04, h: .06, d: passo + .03, c: CD }, null, CD, 'escada'));
        out.push(solido({ x: e.x0 - .14, y: h, z: z0 + passo / 2 - .04, w: .08, h: .9, d: .08, c: CP }, null, CP, null, { semTraco: true }));
      }
    }
    return out;
  }
  const embaixoDoMezanino = () => !!(S.eu && PL.mezanino && nivelDe(S.eu.y) === 0 && noMezanino(S.eu.x, S.eu.z));
  /* as velas das três telas do agente (mudam a cada 1,2 s, sorteadas do relógio) e o balanço dele */
  function solidosAgente(e, t){
    const k = agenteDe(S.dono), ag = AGENTE[k], out = [], passo = Math.floor(t / 1.2), sx = 0, sz = 0, bob = Math.sin(t * 2.2) * .02;
    const r = n => { let v = Math.sin(n * 12.9898 + passo * 78.233) * 43758.5453; return v - Math.floor(v); };
    /* cada vela: x na tela, altura sorteada, nas duas caras da tela (a do agente e a de quem visita).
       (até a 3.36 faltava o z aqui: a vela nascia com NaN e bagunçava a ordem de desenho da casa inteira) */
    [[.15, .5, 1.55], [.78, .64, 1.6], [1.55, .5, 1.55]].forEach(([x0, w, z0], tela) => { for(let i = 0; i < 5; i++){
      const h = .06 + r(tela * 7 + i) * .2, up = r(tela * 7 + i + 50) > .45, cw = (w - .1) / 5 * .62, x = sx + x0 + .05 + i * (w - .1) / 5, y = .78 + .05 + r(tela * 9 + i + 90) * .08, cor = up ? '#38E1FF' : ROSA;
      out.push(B(x, y, sz + z0 - .012, cw, h, .01, cor), B(x, y, sz + z0 + .05 + .002, cw, h, .01, cor));
    } });
    const corpo = ag.bl();
    corpo.forEach((b, i) => { const bb = Object.assign({}, b, { x: b.x + sx, z: b.z + sz }); if(b.y >= .8) bb.y += bob; if(i >= 3 && i <= 4 && b.y < .7) bb.y += Math.max(0, Math.sin(t * 9 + i)) * .03; out.push(bb); });
    return out;
  }
  function solidosFixos(){
    const fraco = embaixoDoMezanino() ? { alpha: .22 } : null, t = S.tAnt || 0;
    const out = [];
    const poe = (bl, e, dono) => sobe(bl.map(b => { const bb = Object.assign({}, b, { x: b.x + e.x, z: b.z + e.z }); if(b.piv) bb.piv = [b.piv[0] + e.x, b.piv[1], b.piv[2] + e.z]; return solido(bb, null, b.c, dono, (e.y || 0) > 1.5 ? fraco : null); }), e.y || 0);
    /* v3.55: nos lugares a estação também é tocável (antes o toque no altar ou no caixa passava pro chão) */
    S.fixos.forEach(e => { const dono = (S.meu || S.lugar) ? 'est:' + e.id : null, sol = cola(poe(e.bl, e, dono), e.bl, 0); out.push(...sol); if(e.agente){ const bl = solidosAgente(e, t); out.push(...cola(poe(bl, e, dono), bl, 0, sol, e.bl)); } });
    S.decor.forEach((e, i) => out.push(...cola(poe(e.bl, e, e.acao ? 'decor:' + i : null), e.bl, 0)));
    return out;
  }
  /* ---------- as ações da casa: discos (prateleira, mesa de DJ, caixa de som) e o skate (na parede ou no chão) ---------- */
  function acoes(){
    const out = [];
    S.decor.forEach((e, i) => { if(!e.acao) return; const ps = pegadasDecor(e); const bb = ps.length ? ps : [{ x: e.x + Math.min(...e.bl.map(b => b.x)), z: e.z + Math.min(...e.bl.map(b => b.z)), w: Math.max(...e.bl.map(b => b.x + b.w)) - Math.min(...e.bl.map(b => b.x)), d: Math.max(...e.bl.map(b => b.z + b.d)) - Math.min(...e.bl.map(b => b.z)) }]; const x0 = Math.min(...bb.map(q => q.x)), x1 = Math.max(...bb.map(q => q.x + q.w)), z0 = Math.min(...bb.map(q => q.z)), z1 = Math.max(...bb.map(q => q.z + q.d)); out.push({ id: 'd' + i, a: e.acao, x: x0, z: z0, w: x1 - x0, d: z1 - z0, y: e.y || 0, parede: !!e.parede, topo: e.topo || Math.max(...e.bl.map(b => b.y + b.h)), e }); });
    S.itens.forEach((it, i) => { const o = ITEM[it.k]; if(!o || !o.acao) return; const p = pegadaDe(o, it.r); out.push({ id: 'i' + i, a: o.acao, x: it.x, z: it.z, w: p.w, d: p.d, y: chaoItem(it), parede: !!o.parede, topo: Math.max(...blocosDe(it).map(b => b.y + b.h)) }); });
    return out;
  }
  /* v3.81: o armário (trocar de skin) é como o skate: só na tua casa */
  const acaoPraMim = a => a.a === 'senta' ? !!(a.e && !(S.eu && S.eu.sit) && assentoLivre(a.e)) : (a.a !== 'skate' && a.a !== 'roupa') || S.meu;
  const rotuloAcao = a => a.a === 'senta' ? (a.e && a.e.nome) || 'Sentar' : a.a === 'relojao' ? 'A hora no Relojão' : a.a === 'desafio' ? `${(quadraAqui() || {}).nome || 'Desafio'} (${TENT})` : a.a === 'largada' ? (comBicho() ? 'Escolher bicho e largar' : autodromo() ? 'Moto ou carro: largar' : `Largar (${VOLTAS} voltas)`) : a.a === 'pesca' ? 'Pescar aqui' : a.a === 'skate' ? (C.st.me && C.st.me.verso && C.st.me.verso.skate ? 'Largar o skate' : 'Pegar o skate') : a.a === 'jogo' ? 'Jogar Killer Ocean' : a.a === 'coringa' ? 'Jogar Coringa' : a.a === 'roupa' ? 'Trocar de skin' : a.a === 'enigma' ? 'O enigma do Umbral' : (S.discoAtual ? '♪ ' + (C.beats ? C.beats.nome(S.discoAtual) : 'tocando') : '♪ Discos');
  /* vai até a frente e faz */
  function vaiNaAcao(a){
    if(!S.eu || !a || !acaoPraMim(a)) return;
    const cx = a.x + a.w / 2, cz = a.z + a.d / 2, n = a.y > 1.5 ? 1 : 0;
    if(nivelDe(S.eu.y) === n && Math.hypot(S.eu.x - cx, S.eu.z - cz) < 2.4){ fazAcao(a); return; }
    const cands = a.parede ? [[cx + (a.w < .3 ? .9 : 0), cz + (a.d < .3 ? .9 : 0)]] : [[cx, a.z + a.d + .55], [cx, a.z - .55], [a.x - .55, cz], [a.x + a.w + .55, cz]];
    const livre = cands.find(([x, z]) => !bate(x, z, n)) || cands[0];
    const rota = tracaRota(livre[0], livre[1], n);
    S.alvo = rota.shift(); S.rota = rota; S.acao = { t: 'acao', a };
  }
  async function fazAcao(a){
    if(a.a === 'discos'){ discosSheet(); return; }
    /* v3.81: parou na frente do armário da tua casa: troca de skin (abre o avatar, com as do Ateliê); salvou, o boneco
       daqui troca na hora */
    if(a.a === 'roupa'){ if(S.meu && C.verso && C.verso.avatar) C.verso.avatar('armario'); return; }
    if(a.a === 'enigma'){ enigmaSheet(); return; }
    if(a.a === 'senta'){ senta(a.e); return; }
    if(a.a === 'relojao'){ const [h, m] = horaBR(); C.toast(`O Relojão do Edifício América marca ${h}:${String(m).padStart(2, '0')}. Lá em cima, olhando de longe (arrasta pra cima), dá pra ver.`, 4200); return; }
    if(a.a === 'pesca'){ comecaPesca(a.e && a.e.spot); return; }
    if(a.a === 'largada'){ largar(); return; }
    if(a.a === 'desafio'){ comecaDesafio(); return; }
    /* o fliperama da casa roda o Killer Ocean (o mesmo do Aquário), por cima da casa */
    if(a.a === 'jogo'){ if(C.verso && C.verso.abreJogo && C.verso.JOGOS && C.verso.JOGOS.killer) C.verso.abreJogo('killer'); else C.toast('O jogo não carregou.'); return; }
    /* v4.17: a prateleira do quarto abre o Coringa, do mesmo jeito, por cima da casa */
    if(a.a === 'coringa'){ if(C.verso && C.verso.abreJogo && C.verso.JOGOS && C.verso.JOGOS.coringa) C.verso.abreJogo('coringa'); else C.toast('O jogo não carregou.'); return; }
    if(a.a === 'skate'){
      if(!S.meu || !C.st.me) return;
      const pega = !(C.st.me.verso && C.st.me.verso.skate), v = Object.assign({}, C.st.me.verso && typeof C.st.me.verso === 'object' ? C.st.me.verso : {}, { skate: pega, veiculo: pega ? 'skate' : '' });
      try{ await C.saveMe({ verso: v }); }catch(e){ C.toast(C.errMsg(e, 'Não deu pra pegar o skate agora.')); return; }
      if(C.verso.atualizaAv) C.verso.atualizaAv();
      if(C.verso.trocaVeiculo) C.verso.trocaVeiculo();
      if(S.eu) S.eu.av = C.verso.avLimpo(v, C.st.me.id);
      C.toast(v.skate ? 'Pegou o skate. Na rua você anda de skate (e mais rápido).' : 'Largou o skate.', 3200);
    }
  }
  /* ---------- os discos: beats originais, tocados na hora; quem tá na casa ouve o mesmo ---------- */
  function discosSheet(){
    const B2 = C.beats; if(!B2){ C.toast('Os discos não carregaram.'); return; }
    const atual = S.discoAtual, lista = S.lugar === 'sebo' ? B2.DISCOS : B2.daCasa ? B2.daCasa(S.dono) : B2.DISCOS;
    C.sheet(`<div class="form cs-discos"><div class="sheet-head"><h2>${ico('musica')} Discos</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p class="note">Beats da casa, feitos na hora. Quem tá aqui dentro ouve junto.${S.meu ? ' Mais discos no Sebo da cidade: escolhe lá e eles aparecem aqui.' : ''}</p>
      <div class="cs-disco-l">${lista.map(d => `<button type="button" class="cs-disco${atual === d.k ? ' on' : ''}" data-act="cs-disco" data-k="${d.k}"><i style="--c:${d.cor}"></i><b>${esc(d.nome)}</b><small>${d.bpm} bpm${atual === d.k ? ' · tocando' : ''}</small></button>`).join('')}</div>
      ${atual ? `<div class="acts"><button type="button" class="btn" data-act="cs-disco-para">${ico('x')} Tirar o disco</button></div>` : ''}</div>`);
  }
  /* ---------- v3.82 · o enigma do Umbral ----------
     O Thales: "na sala do Umbral coloca um enigma pra ser resolvido (nível fácil, quase médio); se a pessoa acerta, a
     tela fica azul uns 2 segundos e aí entra uma animação como se tivesse tendo uma experiência alucinógena". Quatro
     enigmas, um por vez (nunca o mesmo duas vezes seguidas); errou duas, vem a dica. Acertou: o azul e a travessia,
     por cima de tudo; um toque ou o Esc encerra. Sem flash: as cores andam devagar (nada pisca) e, com "reduzir
     movimento" no aparelho, fica só o azul e o brilho parado. As cores da travessia não chegam no verde, nem misturadas */
  const ENIGMAS = [
    { p: 'Quanto mais eu cresço, menos você enxerga. O que eu sou?', r: ['escuridão', 'escuro', 'trevas', 'breu', 'sombra', 'noite'], dica: 'Do lado de cá do Umbral, é o que mais tem.' },
    { p: 'Tenho cidades, mas nenhuma casa; rios, mas nenhuma água; florestas, mas nenhuma árvore. O que eu sou?', r: ['mapa'], dica: 'O Correverso inteiro cabe em mim, num botão da cidade.' },
    { p: 'Falo sem boca e escuto sem ouvido. Não tenho corpo, mas o vento e a montanha me dão vida. O que eu sou?', r: ['eco'], dica: 'Grita perto do Salto Beija-Flor e espera a resposta.' },
    { p: 'De manhã anda com quatro pés, ao meio-dia com dois e à tarde com três. Quem é?', r: ['homem', 'ser humano', 'humano', 'pessoa', 'gente', 'humanidade'], dica: 'É o enigma da esfinge. A tarde é a velhice, e o terceiro pé é a bengala.' }
  ];
  const nrmE = t => ' ' + String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(w => w && !['o', 'a', 'os', 'as', 'um', 'uma', 'e', 'eh', 'sou', 'voce', 'ele', 'ela', 'isso', 'ta'].includes(w)).map(w => w.length > 3 ? w.replace(/s$/, '') : w).join(' ') + ' ';
  function enigmaSheet(){
    if(!S.aberta) return;
    let i; do{ i = Math.floor(Math.random() * ENIGMAS.length); } while(ENIGMAS.length > 1 && i === S.enigmaUlt);
    S.enigmaUlt = i; S.enigma = { i, erros: 0 };
    C.sheet(`<form class="form cs-enigma" id="cs-enigma" autocomplete="off"><div class="sheet-head"><h2>${ico('eye')} O enigma do Umbral</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p class="cs-enigma-p">${esc(ENIGMAS[i].p)}</p>
      <div class="fld"><label for="cs-enigma-r">Tua resposta</label><input class="inp" id="cs-enigma-r" maxlength="40" autocapitalize="off" spellcheck="false" required></div>
      <p class="note" id="cs-enigma-msg" aria-live="polite">Acertou, atravessa.</p>
      <div class="acts"><button type="submit" class="btn primary">Responder</button><button type="button" class="btn" data-act="cs-enigma-outro">Outro enigma</button></div></form>`);
    const f = C.$('cs-enigma'), inp = C.$('cs-enigma-r'); if(!f || !inp) return;
    setTimeout(() => { try{ inp.focus(); }catch(e){} }, 60);
    f.addEventListener('submit', ev => { ev.preventDefault(); respondeEnigma(inp.value); });
  }
  function respondeEnigma(txt){
    const st = S.enigma, r = nrmE(txt); if(!st || !r.trim()) return;
    const E = ENIGMAS[st.i];
    if(E.r.some(x => r.includes(nrmE(x)))){ S.enigma = null; C.closeSheet(); travessia(); return; }
    st.erros++; const msg = C.$('cs-enigma-msg'), inp = C.$('cs-enigma-r');
    if(msg) msg.textContent = st.erros >= 2 ? `Ainda não. Dica: ${E.dica}` : 'Ainda não. Pensa de novo.';
    if(inp){ inp.value = ''; inp.focus(); }
  }
  /* a travessia: 2 s de azul e depois a viagem (o túnel de anéis saindo do meio, o caleidoscópio de 12 pétalas que gira e
     respira e o olho que abre no centro), uns 9 s, e some devagar. Cores: rosa, magenta, violeta, índigo, azul, laranja e
     vermelho (nenhuma mistura delas dá verde) */
  const PSI = ['#FF2D8E', '#B04DFF', '#5B3BFF', '#1E6BFF', '#FF8A3D', '#E2412E', '#FF5CC8', '#7A2BFF'];
  const psi = k => PSI[((Math.floor(k) % PSI.length) + PSI.length) % PSI.length];
  function travessia(){
    const velho = document.getElementById('cs-transe'); if(velho) velho.remove();
    const el = document.createElement('div'); el.id = 'cs-transe'; el.className = 'cs-transe'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'A travessia do Umbral. Toca pra sair.');
    el.innerHTML = '<canvas></canvas>'; document.body.appendChild(el);
    const cv = el.querySelector('canvas'), g = cv.getContext('2d'), calmo = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    const AZUL = 2000, VIAGEM = calmo ? 2600 : 9500, t0 = performance.now(); let fim = false, raf = 0;
    const tam = () => { const d = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.round(innerWidth * d); cv.height = Math.round(innerHeight * d); }; tam();
    const tecla = e => { if(e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); acaba(); } };
    const acaba = () => { if(fim) return; fim = true; el.classList.add('sai'); removeEventListener('keydown', tecla, true); removeEventListener('resize', tam); setTimeout(() => { cancelAnimationFrame(raf); el.remove(); }, 650); };
    addEventListener('keydown', tecla, true); addEventListener('resize', tam);
    el.addEventListener('pointerdown', () => { if(performance.now() - t0 > 500) acaba(); });
    if(C.versoSom && C.versoSom.transe) C.versoSom.transe(calmo);
    const passo = agora => {
      if(!el.isConnected) return; const t = agora - t0, W = cv.width, H = cv.height;
      if(t < AZUL){ g.globalAlpha = 1; g.fillStyle = '#1E4BFF'; g.fillRect(0, 0, W, H); }
      else if(t < AZUL + VIAGEM){ viagem(g, W, H, (t - AZUL) / 1000, (t - AZUL) / VIAGEM, calmo); if(t - AZUL < 700){ g.globalAlpha = 1 - (t - AZUL) / 700; g.fillStyle = '#1E4BFF'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; } }
      else { acaba(); }
      raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    S.travessia = { el, t0 };
  }
  function viagem(g, W, H, s, f, calmo){
    const cx = W / 2, cy = H / 2, R = Math.hypot(W, H) / 2, m = Math.min(W, H);
    const fundo = g.createRadialGradient(cx, cy, 0, cx, cy, R); fundo.addColorStop(0, '#1E4BFF'); fundo.addColorStop(1, '#1A0B3D'); g.globalAlpha = 1; g.fillStyle = fundo; g.fillRect(0, 0, W, H);
    if(!calmo){
      /* o túnel: anéis saindo do meio, cada um de uma cor */
      for(let i = 0; i < 14; i++){ const u = (s * .3 + i / 14) % 1, r = u * u * R * 1.2; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.lineWidth = Math.max(2, r * .12); g.strokeStyle = psi(i + Math.floor(s * .3)); g.globalAlpha = .5 * (1 - u * .6); g.stroke(); }
      /* o caleidoscópio: três voltas de 12 pétalas, girando pra lados opostos e respirando */
      const resp = 1 + .18 * Math.sin(s * 1.3); g.save(); g.translate(cx, cy);
      for(let k = 0; k < 3; k++){ const raio = m * (.15 + k * .1) * resp, giro = s * .35 * (k % 2 ? -1 : 1) + k * .2;
        for(let i = 0; i < 12; i++){ g.save(); g.rotate(i / 12 * Math.PI * 2 + giro); g.beginPath(); g.ellipse(raio, 0, raio * .55, raio * .16, Math.sin(s * .9 + k) * .6, 0, Math.PI * 2); g.fillStyle = psi(i + k * 3 + s * .5); g.globalAlpha = .3; g.fill(); g.restore(); } }
      g.restore();
    }
    /* o olho no meio, que abre devagar (a pupila acompanha o tempo) */
    const ab = Math.min(1, s / 2.4), ew = m * .16, eh = m * .07 * ab;
    g.globalAlpha = .92; g.beginPath(); g.moveTo(cx - ew, cy); g.quadraticCurveTo(cx, cy - eh * 2, cx + ew, cy); g.quadraticCurveTo(cx, cy + eh * 2, cx - ew, cy); g.fillStyle = '#FFF6E8'; g.fill();
    if(ab > .2){ const px = cx + Math.sin(s * .7) * ew * .15, ir = g.createRadialGradient(px, cy, 0, px, cy, eh * 1.1); ir.addColorStop(0, '#15161A'); ir.addColorStop(.35, '#15161A'); ir.addColorStop(.4, '#FF2D8E'); ir.addColorStop(1, '#5B3BFF');
      g.save(); g.beginPath(); g.moveTo(cx - ew, cy); g.quadraticCurveTo(cx, cy - eh * 2, cx + ew, cy); g.quadraticCurveTo(cx, cy + eh * 2, cx - ew, cy); g.clip(); g.fillStyle = ir; g.beginPath(); g.arc(px, cy, eh * 1.05, 0, Math.PI * 2); g.fill(); g.restore(); }
    g.globalAlpha = 1; g.lineWidth = Math.max(2, m * .006); g.strokeStyle = '#F2C230'; g.beginPath(); g.moveTo(cx - ew, cy); g.quadraticCurveTo(cx, cy - eh * 2, cx + ew, cy); g.quadraticCurveTo(cx, cy + eh * 2, cx - ew, cy); g.stroke();
    /* no fim, a frase */
    if(f > .62){ g.globalAlpha = Math.min(1, (f - .62) / .16); g.fillStyle = '#FFF6D8'; g.font = `700 ${Math.round(m * .055)}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Você atravessou o Umbral.', cx, cy + m * .3); g.globalAlpha = 1; }
  }
  /* ---------- v3.51 · o desafio da quadra ----------
     10 tentativas. A régua (no placar de cima) vai e volta sozinha; o botão grande chuta ou arremessa na hora. No
     futsal a régua é o gol visto de cima: a faixa escura é o goleiro, que anda sozinho e pula na bola (alcança 0,9 m);
     nas pontas é trave. No basquete a faixa rosa é a força certa (mais fina nos 5 de três). A bola voa em arcos
     (posBola) e o resultado sai no fim do voo. O melhor do dia vai na presença (m.qp, os pontos, e m.qd, o dia) */
  const quadraAqui = () => (S.aberta && S.lugar && LUGARES[S.lugar] && LUGARES[S.lugar].desafio) || null;
  const recQuadra = () => { try{ const o = JSON.parse(localStorage.getItem('corre-quadra') || '{}'); return o && typeof o === 'object' ? o : {}; }catch(e){ return {}; } };
  const guardaQuadra = o => { try{ localStorage.setItem('corre-quadra', JSON.stringify(o)); }catch(e){} };
  const melhorQuadra = Q => { const r = Q && recQuadra()[Q.esporte]; return r && r.dia === diaBR() ? r.pts : 0; };
  const TENT = 10;
  const medidor = D => { const per = D.Q.per * Math.max(.6, 1 - D.n * .035); return .5 - .5 * Math.cos((Date.now() - D.t0) / 1000 / per * Math.PI * 2); };
  const faixaBasq = n => (n < 5 ? .26 : .16);
  let GOL_AV = null;
  const GOLEIRO = () => GOL_AV || (GOL_AV = C.verso.avLimpo({ skin: 'craque' }, 'goleiro-do-corre'));
  function rankingQuadra(Q){
    const hoje = diaBR() % 1e5, out = [], meu = melhorQuadra(Q);
    if(meu) out.push({ nome: 'você', pts: meu, eu: true });
    gente().forEach(g => { if(g.qd === hoje && g.qp > 0) out.push({ nome: '@' + (g.handle || 'alguém'), pts: g.qp }); });
    return out.sort((a, b) => b.pts - a.pts);
  }
  function posicionaDesafio(){
    const D = S.desafio, e = S.eu; if(!D || !e) return;
    if(D.Q.esporte === 'futsal'){ e.x = D.Q.spot.x; e.z = D.Q.spot.z; e.yaw = D.Q.spot.yaw; }
    else if(ehBeisebol(D.Q)){ e.x = HP.x - .78; e.z = HP.z + .08; e.yaw = Math.PI / 2; e.andando = false; S.cam.th = 0; S.arrastou = 0; return; }
    else { const p = PONTOS_BASQ[D.n % PONTOS_BASQ.length]; e.x = p.x; e.z = p.z; e.yaw = Math.atan2(ARO.x - p.x, ARO.z - p.z); }
    e.andando = false; S.cam.th = e.yaw + Math.PI; S.arrastou = 0;
  }
  /* a câmera do desafio: baixa, atrás de você e mirando no meio do caminho, pra o gol (ou a cesta) aparecer inteiro
     embaixo do placar. Arrastou pra olhar, ela respeita por 3 s */
  function camDesafio(dt){
    const D = S.desafio, e = S.eu, c = S.cam, f = Math.min(1, dt * 4), gols = D.Q.esporte === 'futsal';
    /* no beisebol: atrás da casa, olhando o lançador; com a bola rebatida, a câmera vai atrás dela (na direção da batida) */
    if(ehBeisebol(D.Q)){
      const V = D.voo, segue = V && D.fase !== 'espera' && D.fase !== 'arremesso' && !V.pego, alvo = segue ? [V.p[0], V.p[1] * .55, V.p[2]] : [32, 1, 46.5];
      c.tx += (alvo[0] - c.tx) * f; c.ty += (alvo[1] - c.ty) * f; c.tz += (alvo[2] - c.tz) * f;
      if(Date.now() - (S.arrastou || 0) < 3000) return;
      let d = (segue ? -V.fi : 0) - c.th; d = Math.atan2(Math.sin(d), Math.cos(d)); c.th += d * f * (segue ? .6 : 1);
      c.ph += ((segue ? .32 : .5) - c.ph) * f; c.dist += ((segue ? 12 : 7.2) - c.dist) * f * (segue ? .5 : 1);
      return;
    }
    const al = gols ? [9, GOL.z] : [ARO.x, ARO.z], tx = e.x + (al[0] - e.x) * .4, tz = e.z + (al[1] - e.z) * .4;
    c.tx += (tx - c.tx) * f; c.tz += (tz - c.tz) * f; c.ty += ((gols ? .9 : 2.3) - c.ty) * f;
    if(Date.now() - (S.arrastou || 0) < 3000) return;
    let d = e.yaw + Math.PI - c.th; d = Math.atan2(Math.sin(d), Math.cos(d)); c.th += d * f;
    c.ph += ((gols ? .36 : .3) - c.ph) * f; c.dist += ((gols ? 8.5 : 8) - c.dist) * f;
  }
  /* sai do desafio e devolve a câmera de antes */
  function largaDesafio(){ const D = S.desafio; S.desafio = null; if(D && ehBeisebol(D.Q)) S.bsb = null; if(D && D.cam0){ S.cam.ph = D.cam0.ph; S.cam.dist = D.cam0.dist; } painelDesafio(true); }
  function comecaDesafio(){
    const Q = quadraAqui(); if(!Q || !S.eu || S.desafio) return;
    S.alvo = null; S.rota = []; S.acao = null; S.teclas.clear();
    S.desafio = { Q, n: 0, pts: 0, fase: 'mira', t0: Date.now(), bola: null, kx: 9, ktx: 9, ktT: 0, ult: Date.now(), cam0: { ph: S.cam.ph, dist: S.cam.dist } };
    if(ehBeisebol(Q)){ Object.assign(S.desafio, { fase: 'espera', t0: Date.now() + 900, hr: 0, sw: 0, swC: 0, erro: 0, pitch: null, voo: null }); S.bsb = null; }
    posicionaDesafio(); painelDesafio(true);
  }
  function paraDesafio(msg){ if(!S.desafio) return; largaDesafio(); if(msg) C.toast(msg, 1600); }
  function posBola(b, agora){
    let t = agora - b.t0;
    for(const sg of b.segs){ if(t <= sg.dur){ const u = t / sg.dur; return [sg.de[0] + (sg.ate[0] - sg.de[0]) * u, sg.de[1] + (sg.ate[1] - sg.de[1]) * u + sg.arco * 4 * u * (1 - u), sg.de[2] + (sg.ate[2] - sg.de[2]) * u, false]; } t -= sg.dur; }
    const ul = b.segs[b.segs.length - 1].ate; return [ul[0], ul[1], ul[2], true];
  }
  function dispara(){
    const D = S.desafio; if(D && ehBeisebol(D.Q)){ rebateB(D); return; }
    if(!D || D.fase !== 'mira' || !S.eu) return;
    const p = medidor(D), e = S.eu, agora = Date.now(), fx = Math.sin(e.yaw), fz = Math.cos(e.yaw);
    if(D.Q.esporte === 'futsal'){
      const ax = GOL.x0 + .1 + p * (GOL.x1 - GOL.x0 - .2), trave = p < .05 || p > .95, kf = D.kx + Math.max(-.9, Math.min(.9, ax - D.kx)) * .8, gol = !trave && Math.abs(ax - kf) > .5;
      D.kf = kf; D.res = gol ? 'gol' : trave ? 'trave' : 'defesa'; if(gol) D.pts++;
      const de = [9, .11, 7.2], ate = [ax, .55, GOL.z + .05];
      D.bola = { t0: agora, segs: [{ de, ate, dur: 450, arco: .35 }, gol ? { de: ate, ate: [ax, .2, GOL.z - .75], dur: 250, arco: 0 } : trave ? { de: ate, ate: [ax < 9 ? 5.5 : 12.5, .11, 3.4], dur: 600, arco: .6 } : { de: ate, ate: [kf + (Math.random() - .5), .11, 4], dur: 650, arco: .8 }] };
    } else {
      const w = faixaBasq(D.n), acerta = Math.abs(p - .5) < w / 2, tres = D.n >= 5;
      D.res = acerta ? (tres ? 'tres' : 'cesta') : p < .5 ? 'curto' : 'forte'; if(acerta) D.pts += tres ? 3 : 2;
      const de = [e.x + fx * .22, 2.05, e.z + fz * .22], aro = [ARO.x, ARO.y + .14, ARO.z], curto = [ARO.x - fx * .3, ARO.y + .05, ARO.z - fz * .3], tabela = [ARO.x, ARO.y + .4, 1.3];
      D.bola = { t0: agora, segs: acerta ? [{ de, ate: aro, dur: 850, arco: 1.5 }, { de: aro, ate: [ARO.x, .12, ARO.z], dur: 450, arco: 0 }]
        : p < .5 ? [{ de, ate: curto, dur: 800, arco: 1.3 }, { de: curto, ate: [ARO.x - fx * 1.8 + (Math.random() - .5), .12, ARO.z - fz * 1.8 + .5], dur: 700, arco: .7 }]
        : [{ de, ate: tabela, dur: 820, arco: 1.4 }, { de: tabela, ate: [ARO.x + (Math.random() - .5) * 2, .12, 3], dur: 750, arco: .5 }] };
    }
    D.fase = 'voo';
  }
  function fimDesafio(){
    const D = S.desafio, Q = D.Q, rec = recQuadra(), hoje = diaBR(), meu = rec[Q.esporte] && rec[Q.esporte].dia === hoje ? rec[Q.esporte].pts : 0, bateu = D.pts > meu, sempre = rec[Q.esporte + 'Rec'] || 0, recorde = D.pts > sempre;
    if(bateu) rec[Q.esporte] = { dia: hoje, pts: D.pts }; if(recorde) rec[Q.esporte + 'Rec'] = D.pts; guardaQuadra(rec);
    D.fase = 'fim';
    const lista = rankingQuadra(Q), pos = lista.findIndex(x => x.eu) + 1, un = Q.esporte === 'futsal' ? (D.pts === 1 ? 'gol' : 'gols') : (D.pts === 1 ? 'ponto' : 'pontos');
    C.toast(`Fim do desafio: ${D.pts} ${un}${ehBeisebol(Q) && D.hr ? ` (${D.hr} home run${D.hr > 1 ? 's' : ''})` : ''}${recorde && D.pts ? ', teu recorde' : bateu && D.pts ? ', o teu melhor de hoje' : ''}${lista.length > 1 && D.pts ? `. ${pos}º do dia na quadra` : ''}.`, 4800);
    if(C.verso && C.verso.anunciar) C.verso.anunciar();
    setTimeout(() => { if(S.desafio === D) largaDesafio(); }, 2400);
  }
  function tickDesafio(){
    if(!quadraAqui()) return;
    const D = S.desafio, agora = Date.now();
    if(D && ehBeisebol(D.Q) && D.fase !== 'fim'){ tickBeisebol(D, agora); painelDesafio(); return; }
    if(D && ehBeisebol(D.Q)){ D.bp = null; passoTimeB(null, Math.min(.1, (agora - D.ult) / 1000)); D.ult = agora; }
    else if(D){
      const dt = Math.min(.1, (agora - D.ult) / 1000); D.ult = agora;
      if(D.Q.esporte === 'futsal'){
        if(D.fase === 'mira'){ if(agora > D.ktT){ D.ktx = 7.9 + Math.random() * 2.2; D.ktT = agora + 600 + Math.random() * 600; } const d = D.ktx - D.kx; D.kx += Math.sign(d) * Math.min(Math.abs(d), 2.2 * dt); }
        else if(D.fase === 'voo' && D.kf != null){ const d = D.kf - D.kx; D.kx += Math.sign(d) * Math.min(Math.abs(d), 5 * dt); }
      }
      if(D.fase === 'voo' && D.bola && posBola(D.bola, agora)[3]){
        C.toast({ gol: 'Gol!', trave: 'Na trave!', defesa: 'O goleiro pegou.', cesta: 'Cesta! +2', tres: 'De três! +3', curto: 'Curto: bateu no aro.', forte: 'Forte demais: tabela e fora.' }[D.res], 1300);
        D.n++; D.bola = null; D.kf = null;
        if(D.n >= TENT) fimDesafio(); else { D.fase = 'mira'; D.t0 = agora; posicionaDesafio(); }
        painelDesafio(true);
      }
    }
    painelDesafio();
  }
  function painelDesafio(forca){
    const el = C.$('cs-pesca'), Q = quadraAqui(); if(!el || !Q) return;
    el.hidden = false; const D = S.desafio, agora = Date.now(), gols = Q.esporte === 'futsal';
    if(forca || agora - (S.painelT || 0) >= 150){ S.painelT = agora;
      const sempre = recQuadra()[Q.esporte + 'Rec'] || 0, un = n => (gols ? (n === 1 ? 'gol' : 'gols') : (n === 1 ? 'ponto' : 'pontos'));
      let topo, dica, med = '';
      if(D && D.fase !== 'fim'){
        topo = `${Q.vez} ${Math.min(TENT, D.n + 1)}/${TENT} · ${D.pts} ${un(D.pts)}`;
        if(ehBeisebol(Q)){ topo += ` · ${D.hr || 0} HR`; const [zl, zw] = zonaB(D); med = `<div class="cs-med"><i class="cs-med-a" style="left:${zl.toFixed(1)}%;width:${zw.toFixed(1)}%"></i><i class="cs-med-c"></i></div>`; dica = 'Toca Rebater! quando a bola entrar na faixa rosa. Bem no meio sai home run.'; }
        else if(gols){ med = '<div class="cs-med"><i class="cs-med-t" style="left:0;width:5%"></i><i class="cs-med-t" style="left:95%;width:5%"></i><i class="cs-med-k"></i><i class="cs-med-c"></i></div>'; dica = 'A barra é o gol, e a faixa escura é o goleiro. Chuta quando a mira tá longe dele.'; }
        else { const w = faixaBasq(D.n); med = `<div class="cs-med"><i class="cs-med-a" style="left:${(50 - w * 50).toFixed(1)}%;width:${(w * 100).toFixed(1)}%"></i><i class="cs-med-c"></i></div>`; dica = D.n >= 5 ? 'De três: a faixa é mais fina.' : 'Arremessa quando a régua passar na faixa rosa.'; }
      } else if(D){ topo = `Fim: ${D.pts} ${un(D.pts)}`; dica = `Toca ${ehBeisebol(Q) ? 'no suporte dos tacos' : 'na caixa de bolas'} pra tentar de novo.`; }
      else { topo = `${esc(Q.nome)} · melhor do dia`; dica = `Vai ${ehBeisebol(Q) ? 'no suporte dos tacos' : 'na caixa de bolas'} e toca no desafio.`; }
      const lista = rankingQuadra(Q), eu = lista.findIndex(x => x.eu), mostra = lista.slice(0, 3); if(eu > 2) mostra.push(lista[eu]);
      const html = `<b class="cs-pesca-t">${ico('raio')} ${topo}</b>${med}<ol>${mostra.length ? mostra.map(x => `<li${x.eu ? ' class="eu"' : ''}><i>${lista.indexOf(x) + 1}º</i><span>${esc(x.nome)}</span><b>${x.pts} ${gols ? un(x.pts) : 'pts'}</b></li>`).join('') : '<li><i></i><span>Ninguém jogou hoje ainda.</span><b></b></li>'}</ol><small>${dica}${sempre ? ` Recorde: ${sempre}.` : ''}</small>`;
      el.classList.remove('morde');
      if(el.dataset.h !== html){ el.dataset.h = html; el.innerHTML = html; }
    }
    /* a régua e o goleiro andam a cada quadro (só o estilo, sem refazer o placar) */
    if(D && D.fase === 'mira'){ const c = el.querySelector('.cs-med-c'); if(c) c.style.left = (medidor(D) * 100).toFixed(1) + '%'; }
    if(D && ehBeisebol(Q)){ const c = el.querySelector('.cs-med-c'); if(c){ const u = D.fase === 'arremesso' && D.pitch ? Math.min(1, (agora - D.pitch.t0) / D.pitch.T / 1.15) : D.fase === 'espera' ? 0 : 1; c.style.left = (u * 100).toFixed(1) + '%'; } }
    if(D && gols){ const k = el.querySelector('.cs-med-k'); if(k) k.style.left = ((D.kx - GOL.x0) / (GOL.x1 - GOL.x0) * 100).toFixed(1) + '%'; }
  }
  /* o goleiro (sempre no gol do futsal) e a bola (no pé, na mão ou voando) */
  function solidosDesafio(){
    const Q = quadraAqui(); if(!Q) return [];
    if(ehBeisebol(Q)) return solidosBeisebol();
    const D = S.desafio, out = [], e = S.eu, gols = Q.esporte === 'futsal';
    if(gols && C.verso && C.verso.avLimpo) out.push(...sobe(boneco(GOLEIRO(), D ? D.kx : 9, GOL.z + .45, 0, 0, false), D && D.fase === 'voo' && D.kf != null ? .25 : 0));
    const bp = bolaAgora();
    if(bp) out.push(esfera(bp[0], bp[1], bp[2], gols ? .11 : .12, gols ? PAPEL : '#E8643A', null, { desenho: gols ? 'futsal' : 'basquete', gira: D && D.bola ? (Date.now() - D.bola.t0) / 1000 * 11 : .4 }));
    return out;
  }
  /* onde a bola tá agora (no pé, na mão ou voando); null se não tem bola na quadra */
  function bolaAgora(){
    const Q = quadraAqui(), D = S.desafio, e = S.eu; if(!Q || !D) return null;
    if(ehBeisebol(Q)) return D.bp || null;
    if(D.bola) return posBola(D.bola, Date.now());
    return D.fase === 'mira' && e ? (Q.esporte === 'futsal' ? [9, .11, 7.2] : [e.x + Math.sin(e.yaw) * .22, 2.05, e.z + Math.cos(e.yaw) * .22]) : null;
  }
  /* ---------- v3.57 · o Desafio de rebatida (ACEL) ----------
     O lançador dá a volta e arremessa; a bola leva de 0,6 a 1 s até a casa (cada arremesso um pouco mais rápido). O
     taco encontra a bola 90 ms depois do toque, então o certo é tocar quando ela entra na faixa rosa do placar. O erro
     em ms decide tudo: até 150 ms tem contato (quanto mais perto de zero, mais forte e mais alto); cedo puxa pra
     esquerda, tarde vai pra direita, e passou de 45 graus é falta. A bola voa de verdade (gravidade): passou da cerca
     no alto é home run (com taikô e hanabi), bateu na cerca é tripla, e o resto conta pelo primeiro quique (12 m
     simples, 22 m dupla, 31 m tripla; antes disso, eliminado). Simples vale 1, dupla 2, tripla 3 e home run 4.
     Não vale correal: vale o recorde (o melhor do dia vai na presença, igual às quadras) */
  const SOLTA_B = 990, ANIM_B = 1600, SW_C = 90, SW_DUR = 280, JANELA_B = 150;
  const PONTOS_B = { hr: 4, muro: 3, tripla: 3, dupla: 2, simples: 1 };
  const FALA_B = { hr: 'HOME RUN! +4', muro: 'No muro! Tripla, +3', tripla: 'Tripla! +3', dupla: 'Dupla! +2', simples: 'Simples. +1', falta: 'Falta.', alto: 'Pegaram no alto: eliminado.', rasteira: 'Rasteira: eliminado na 1ª.', errou: 'Girou e errou: strike.', olhou: 'Strike! Ficou olhando.', cedo: 'Girou antes do arremesso: strike.' };
  const SOLTA_P = [MONTE.x - .34, 1.95, MONTE.z + .55], LUVA_C = [31.75, .76, 50.86];
  const POS_B = [[42.4, 38.8], [37.4, 32.4], [26.6, 32.4], [21.6, 38.8], [19.6, 22.6], [32, 15.6], [44.4, 22.6]];
  const PELES_B = ['#F0C9A0', '#C68642', '#8E5B33', '#E8B98A', '#5A3A22', '#F3D3B0', '#A86B3C', '#D9A07A', '#B97B55'];
  const lerpK = (f, K) => { if(f <= K[0][0]) return K[0][1]; for(let i = 1; i < K.length; i++) if(f <= K[i][0]){ const [a, va] = K[i - 1], [b, vb] = K[i]; return va + (vb - va) * (f - a) / (b - a); } return K[K.length - 1][1]; };
  const ehBeisebol = Q => !!Q && Q.esporte === 'beisebol';
  const logoRS = k => (C.verso && C.verso.logoSharks ? C.verso.logoSharks(k) : null);
  /* um ponto do corpo do atleta (x, y, z do boneco parado de frente) depois da inclinação (lean, no quadril hy) e do giro */
  const ptAtleta = (x, z, yaw, lean, hy, lx, ly, lz) => { const cp = Math.cos(lean), sp = Math.sin(lean), dy = ly - hy, y2 = dy * cp - lz * sp + hy, z2 = dy * sp + lz * cp, cy = Math.cos(yaw), sy = Math.sin(yaw); return [x + lx * cy + z2 * sy, y2, z - lx * sy + z2 * cy]; };
  /* v3.57 · a camisa: "SHARKS" em branco (o Thales: "na camiseta escreve SHARKS e um jeito massa, em branco"), em arco,
     letra condensada inclinada com contorno preto e sombra, e um traço por baixo que termina numa barbatana. A letra é a
     Heros Condensed das fontes do Studio (site/lab/fontes); até ela chegar, vai a do sistema, e o desenho refaz uma vez */
  let CAMISA = null, CAMISA_FONTE = null;
  function camisaSharks(){
    if(CAMISA) return CAMISA;
    if(!CAMISA_FONTE && window.FontFace && document.fonts){ CAMISA_FONTE = new FontFace('CorreJersey', 'url(lab/fontes/heroscn-bold.otf)', { weight: '700' }); CAMISA_FONTE.load().then(f => { document.fonts.add(f); CAMISA = null; }).catch(e => { CAMISA_FONTE.erro = String(e); }); }
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const x = cv.getContext('2d'), P = '#0F1218', R0 = 560, base = 150, txt = 'SHARKS';
    x.lineJoin = 'round'; x.font = '700 150px CorreJersey, "Arial Narrow", system-ui, sans-serif'; x.textBaseline = 'alphabetic'; x.textAlign = 'center';
    const ws = [...txt].map(l => x.measureText(l).width * .92), tot = ws.reduce((a, b) => a + b, 0), esc = Math.min(1, 380 / tot);
    /* o traço da barbatana: sai de baixo do S, passa sob o nome e sobe na ponta */
    const traco = () => { x.beginPath(); x.moveTo(40, 196); x.quadraticCurveTo(240, 250, 418, 214); x.quadraticCurveTo(452, 204, 470, 168); x.quadraticCurveTo(476, 206, 452, 224); x.quadraticCurveTo(250, 268, 40, 196); x.closePath(); };
    const letras = (fn) => { let s = -tot * esc / 2; [...txt].forEach((l, i) => { const w = ws[i] * esc, th = (s + w / 2) / R0; s += w;
      x.save(); x.translate(244 + Math.sin(th) * R0, base + R0 - Math.cos(th) * R0); x.rotate(th); x.transform(1, 0, -.22, 1, 0, 0); x.scale(esc, 1); fn(l); x.restore(); }); };
    x.save(); x.translate(7, 7); x.fillStyle = 'rgba(15,18,24,.55)'; traco(); x.fill(); letras(l => x.fillText(l, 0, 0)); x.restore();
    x.lineWidth = 9; x.strokeStyle = P; traco(); x.stroke(); x.fillStyle = '#FFFFFF'; x.fill();
    letras(l => { x.lineWidth = 12; x.strokeStyle = P; x.strokeText(l, 0, 0); x.fillStyle = '#FFFFFF'; x.fillText(l, 0, 0); });
    CAMISA = cv; return cv;
  }
  /* o monograma RS num pedaço do uniforme: de x0 a x1, de y0 a y1, colado na frente (lz) */
  const rsNoCorpo = (x, z, yaw, lean, hy, x0, x1, y0, y1, lz, cor, img) => painelSol([ptAtleta(x, z, yaw, lean, hy, x0, y1, lz), ptAtleta(x, z, yaw, lean, hy, x1, y1, lz), ptAtleta(x, z, yaw, lean, hy, x1, y0, lz), ptAtleta(x, z, yaw, lean, hy, x0, y0, lz)], img || (() => logoRS('rs')), cor, null);
  /* o time do campo (a máquina): cada um no seu lugar; quem tá perto de onde a bola vai cair corre atrás dela */
  function timeB(){
    if(!S.bsb) S.bsb = { J: POS_B.map(([x, z], i) => ({ x, z, x0: x, z0: z, yaw: Math.atan2(HP.x - x, HP.z - z), pele: PELES_B[i % PELES_B.length], passo: 0, corre: false, alvo: null })), fogos: [] };
    return S.bsb;
  }
  /* um jogador em blocos (o boneco da cidade não levanta um braço só): o uniforme do Londrina Red Sharks (o Thales:
     "boné preto e vermelho, camiseta vermelha e calça branca") e a luva na mão esquerda. pose: 'pronto', 'corre' (passo), 'arremesso' (f de 0 a 1), 'agachado' (o catcher) e 'juiz' */
  function atleta(x, z, yaw, o){
    const out = [], giro = { yaw, piv: [x, 0, z] }, P = o.pele || '#C68642', juiz = o.pose === 'juiz', ag = o.pose === 'agachado' || juiz, f = o.f || 0;
    const R = juiz ? '#1B1D22' : VERMELHAO, Lc = juiz ? '#3A3E45' : '#F4F1EA', dono = o.dono || null;
    const add = (b, ...T) => out.push(solido(b, [...T.filter(Boolean), giro], b.c, dono, {}));
    const sw = o.pose === 'corre' ? Math.sin(o.passo || 0) * .8 : 0, hy = ag ? .3 : .44;
    if(ag) [-.26, .04].forEach(sx => { add(B(x + sx, .2, z - .06, .22, .14, .44, Lc)); add(B(x + sx, 0, z + .22, .22, .3, .16, Lc)); add(B(x + sx - .01, 0, z + .2, .24, .08, .26, INK)); });
    else {
      /* no arremesso, a perna da luva sobe no meio da volta */
      const lev = o.pose === 'arremesso' ? -1.35 * Math.sin(Math.PI * Math.min(1, Math.max(0, f / .5))) : null;
      const perna = (sx, sinal, ang) => { const T2 = { pitch: ang != null ? ang : sw * sinal, piv: [x, hy, z] }; add(B(x + sx, .14, z - .12, .22, hy - .14, .24, Lc), T2); add(B(x + sx, .06, z - .12, .22, .1, .24, juiz ? INK : '#1B1D22'), T2); add(B(x + sx - .01, 0, z - .14, .24, .08, .3, INK), T2); };
      perna(-.24, 1, null); perna(.02, -1, lev);
    }
    const lean = o.pose === 'pronto' ? .22 : ag ? .25 : o.pose === 'arremesso' ? lerpK(f, [[0, 0], [.3, -.12], [.55, -.1], [.68, .5], [1, .3]]) : 0;
    const TL = lean ? { pitch: lean, piv: [x, hy, z] } : null;
    add(B(x - .25, hy, z - .12, .5, .5, .24, R), TL);
    if(!juiz){ add(B(x - .25, hy + .44, z - .131, .5, .04, .01, PAPEL), TL); add(B(x - .26, hy, z - .13, .52, .06, .26, INK), TL); if(!ag) out.push(rsNoCorpo(x, z, yaw, lean, hy, -.235, .235, hy + .19, hy + .425, .13, VERMELHAO, camisaSharks)); }
    add(B(x - .25, hy + .5, z - .25, .5, .5, .5, P), TL);
    add(B(x - .16, hy + .76, z + .25, .08, .08, .01, INK), TL); add(B(x + .08, hy + .76, z + .25, .08, .08, .01, INK), TL);
    if(ag) add(B(x - .27, hy + .52, z + .25, .54, .42, .05, '#2B2F38'), TL);
    /* o boné: a copa preta com o botão vermelho e a aba vermelha (o juiz, todo preto) */
    add(B(x - .27, hy + .94, z - .27, .54, .2, .54, INK), TL); add(B(x - .2, hy + .94, z + (ag ? -.47 : .27), .4, .04, .2, juiz ? INK : VERMELHAO), TL);
    if(!juiz){ add(B(x - .05, hy + 1.14, z - .05, .1, .03, .1, VERMELHAO), TL); if(!ag) out.push(rsNoCorpo(x, z, yaw, lean, hy, -.12, .12, hy + .985, hy + 1.13, .275, INK)); }
    /* os braços: o direito (lado -x) arremessa por cima; o esquerdo leva a luva */
    const braco = (sx, ang, luva) => { const T2 = { pitch: ang, piv: [x, hy + .46, z] }; add(B(x + sx, hy + .18, z - .1, .14, .32, .2, R), T2, TL); add(B(x + sx, hy, z - .1, .14, .18, .2, P), T2, TL); if(luva) add(B(x + sx - .06, hy - .14, z - .12, .26, .26, .3, '#8E5B33'), T2, TL); };
    let aD = -sw, aE = sw;
    if(o.pose === 'pronto'){ aD = -.55; aE = -.75; }
    else if(o.pose === 'agachado'){ aD = -.3; aE = -1.45; }
    else if(juiz){ aD = -.5; aE = -.5; }
    else if(o.pose === 'arremesso'){ aD = lerpK(f, [[0, -.9], [.28, -1.1], [.5, 2.5], [.56, 3.13], [.5601, -3.13], [.64, -1.9], [.75, -1], [1, -.4]]); aE = lerpK(f, [[0, -.9], [.28, -1.1], [.5, -1.6], [.68, -.3], [1, -.4]]); }
    braco(-.39, aD, false); braco(.25, aE, !juiz);
    return out;
  }
  /* a bola no arremesso: sai da mão do lançador, faz um arco leve, quebra no fim e, sem rebatida, vai pra luva */
  function bolaPitch(P, agora){
    const u = (agora - P.t0) / P.T, alvo = [HP.x + P.bx, .82 + P.by, HP.z + .05];
    if(u <= 1) return [SOLTA_P[0] + (alvo[0] - SOLTA_P[0]) * Math.pow(u, 1.6), SOLTA_P[1] + (alvo[1] - SOLTA_P[1]) * u + .9 * u * (1 - u) * .45, SOLTA_P[2] + (alvo[2] - SOLTA_P[2]) * u];
    const w = Math.min(1, (agora - P.t0 - P.T) / 150);
    return [alvo[0] + (LUVA_C[0] - alvo[0]) * w, alvo[1] + (LUVA_C[1] - alvo[1]) * w, alvo[2] + (LUVA_C[2] - alvo[2]) * w];
  }
  /* o toque: o taco começa a girar e encontra a bola 90 ms depois */
  function rebateB(D){
    if(D.sw || !['espera', 'arremesso'].includes(D.fase)) return;
    const agora = Date.now(); D.sw = agora; D.swC = agora + SW_C;
    D.erro = D.fase === 'espera' ? -1e9 : D.swC - (D.pitch.t0 + D.pitch.T);
  }
  function lancaB(D, agora){
    const e = D.erro, q = Math.max(0, 1 - Math.abs(e) / JANELA_B), fi = e / JANELA_B * .96, r = Math.random();
    /* bem no tempo sai alta e forte; meio fora, linha; muito fora, rasteira ou balão */
    const th = (q > .75 ? 22 + r * 12 : q > .45 ? 12 + r * 14 : r < .5 ? 2 + r * 12 : 48 + (r - .5) * 28) * Math.PI / 180;
    const v = 11 + 13 * Math.pow(q, 1.3) + (Math.random() - .5) * 1.6, vh = v * Math.cos(th);
    const p0 = [HP.x + .12, .86, HP.z - .2 + Math.max(-1, Math.min(1, e / JANELA_B)) * .3];
    const V = D.voo = { t0: agora, p: p0, v: [vh * Math.sin(fi), v * Math.sin(th), -vh * Math.cos(fi)], fi, th, falta: Math.abs(fi) > Math.PI / 4, quiques: 0, res: null, parou: 0, pego: false, quem: null };
    D.fase = 'voo';
    if(C.versoSom && C.versoSom.taco) C.versoSom.taco(.45 + q * .55);
    /* quem tá mais perto de onde ela vai cair sai correndo (dentro da cerca) */
    if(!V.falta){
      const vy = V.v[1], tq = (vy + Math.sqrt(vy * vy + 2 * 9.8 * (p0[1] - BOLA_B))) / 9.8; let lx = p0[0] + V.v[0] * tq, lz = p0[2] + V.v[2] * tq;
      const ang = Math.atan2(lx - HP.x, HP.z - lz), lim = cercaR(ang) - 1.2; if(Math.hypot(lx - HP.x, HP.z - lz) > lim){ lx = HP.x + Math.sin(ang) * lim; lz = HP.z - Math.cos(ang) * lim; }
      let md = 1e9; timeB().J.forEach(j => { const d = Math.hypot(j.x - lx, j.z - lz); if(d < md){ md = d; V.quem = j; } }); if(V.quem) V.quem.alvo = [lx, lz];
    }
  }
  function voaB(D, agora, dt){
    const V = D.voo, h = dt / 4;
    for(let i = 0; i < 4 && !V.parou && !V.pego; i++){
      V.v[1] -= 9.8 * h; V.p[0] += V.v[0] * h; V.p[1] += V.v[1] * h; V.p[2] += V.v[2] * h;
      const dx = V.p[0] - HP.x, dz = HP.z - V.p[2], d = Math.hypot(dx, dz), ang = Math.atan2(dx, dz);
      /* a cerca: por cima é home run; batendo nela, volta (e é tripla) */
      if(!V.res && !V.falta && Math.abs(ang) <= Math.PI / 4 + .01 && d >= cercaR(ang) - .2){
        if(V.p[1] > 2.05){ V.res = 'hr'; V.hrT = agora; soltaFogos(agora); if(C.versoSom && C.versoSom.taiko) C.versoSom.taiko(3); }
        else { V.res = 'muro'; V.v[0] *= -.35; V.v[2] *= -.35; const k = (cercaR(ang) - .35) / d; V.p[0] = HP.x + dx * k; V.p[2] = HP.z - dz * k; if(C.versoSom && C.versoSom.cai) C.versoSom.cai(.6); }
      }
      if(V.p[1] <= BOLA_B){
        V.p[1] = BOLA_B;
        if(!V.quiques && !V.res) V.res = V.falta ? 'falta' : d >= 31 ? 'tripla' : d >= 22 ? 'dupla' : d >= 12 ? 'simples' : V.th > .7 ? 'alto' : 'rasteira';
        V.quiques++; V.v[1] = Math.abs(V.v[1]) * .3; V.v[0] *= .6; V.v[2] *= .6;
        if(V.quiques > 3 || Math.hypot(V.v[0], V.v[2]) < .5){ V.v = [0, 0, 0]; V.parou = agora; }
      }
    }
    /* o fim da jogada: o home run espera a bola sumir no escuro; o resto, a bola parar (ou alguém pegar) */
    const fim = V.res === 'hr' ? agora - V.hrT > 1700 : (V.parou && agora - V.parou > 300) || V.pego || agora - V.t0 > 7000;
    if(fim) resultadoB(D, V.res || (V.falta ? 'falta' : 'rasteira'), agora);
  }
  function resultadoB(D, res, agora){
    if(D.fase === 'res' || D.fase === 'fim') return;
    const p = PONTOS_B[res] || 0; D.pts += p; if(res === 'hr') D.hr = (D.hr || 0) + 1;
    D.res = res; D.fase = 'res'; D.resAte = agora + (res === 'hr' ? 1500 : 1200);
    C.toast(FALA_B[res] || '', 1400);
    if(p && res !== 'hr' && C.versoSom && C.versoSom.moeda) C.versoSom.moeda();
    painelDesafio(true);
  }
  function passoTimeB(D, dt){
    const V = D && D.voo, luva = j => [j.x + Math.cos(j.yaw) * .3, 1, j.z - Math.sin(j.yaw) * .3];
    timeB().J.forEach(j => {
      /* quem foi atrás persegue a bola depois do quique */
      if(V && V.quem === j && !V.pego && V.quiques) j.alvo = [V.p[0], V.p[2]];
      const alvo = j.alvo || [j.x0, j.z0], dx = alvo[0] - j.x, dz = alvo[1] - j.z, d = Math.hypot(dx, dz), vel = j.alvo ? 6.8 : 3.2;
      if(d > .12){ const s = Math.min(d, vel * dt); j.x += dx / d * s; j.z += dz / d * s; j.yaw = Math.atan2(dx, dz); j.corre = true; j.passo += dt * (j.alvo ? 14 : 9); }
      else { j.corre = false; let a = Math.atan2(HP.x - j.x, HP.z - j.z) - j.yaw; a = Math.atan2(Math.sin(a), Math.cos(a)); j.yaw += a * Math.min(1, dt * 4); }
      if(V && V.quem === j && !V.pego && V.quiques && Math.hypot(V.p[0] - j.x, V.p[2] - j.z) < .7){ V.pego = true; V.v = [0, 0, 0]; }
      if(V && V.pego && V.quem === j) V.p = luva(j);
    });
  }
  function tickBeisebol(D, agora){
    const dt = Math.min(.1, (agora - D.ult) / 1000); D.ult = agora;
    if(D.fase === 'espera' && agora - D.t0 >= SOLTA_B){
      D.pitch = { t0: agora, T: Math.max(600, 1000 - D.n * 32 + (Math.random() - .5) * 140), bx: (Math.random() - .5) * .44, by: (Math.random() - .5) * .3 };
      D.fase = 'arremesso'; painelDesafio(true);
    }
    if(D.fase === 'arremesso'){
      const P = D.pitch;
      if(D.swC && agora >= D.swC && Math.abs(D.erro) <= JANELA_B) lancaB(D, agora);
      else if(agora >= P.t0 + P.T + 150){ if(C.versoSom && C.versoSom.luva) C.versoSom.luva(); resultadoB(D, D.erro === -1e9 ? 'cedo' : D.sw ? 'errou' : 'olhou', agora); }
    }
    if(D.fase === 'voo') voaB(D, agora, dt);
    if(D.fase === 'res' && agora >= D.resAte){
      D.n++; timeB().J.forEach(j => { j.alvo = null; });
      if(D.n >= TENT) fimDesafio();
      else { Object.assign(D, { fase: 'espera', t0: agora + 250, sw: 0, swC: 0, erro: 0, pitch: null, voo: null, res: null }); posicionaDesafio(); }
      painelDesafio(true);
    }
    /* onde a bola tá agora (o quadro e a sombra leem daqui) */
    D.bp = D.fase === 'arremesso' && D.pitch ? bolaPitch(D.pitch, agora) : D.voo ? D.voo.p.slice() : D.fase === 'res' && D.pitch ? LUVA_C.slice() : null;
    passoTimeB(D, dt);
  }
  /* a faixa rosa do placar: onde a bola tá quando o toque é perfeito (em % da barra, que vai até 115% do caminho) */
  const zonaB = D => { const T = D.pitch ? D.pitch.T : Math.max(600, 1000 - D.n * 32), u = 1 - SW_C / T, w = 45 / T; return [(u - w) / 1.15 * 100, 2 * w / 1.15 * 100]; };
  /* os fogos (hanabi) do home run, por cima do fundo do campo */
  function soltaFogos(agora){ const F = timeB().fogos, cores = [ROSA, AMARELO, '#E2412E', LILAS, LARANJA, PAPEL]; for(let k = 0; k < 5; k++) F.push({ t0: agora + k * 330, x: 16 + Math.random() * 32, y: 20 + Math.random() * 9, z: 2 + Math.random() * 10, c: cores[k % cores.length] }); }
  function fogosB(agora){
    const F = timeB().fogos, out = [];
    for(let i = F.length - 1; i >= 0; i--){
      const fo = F[i], t = (agora - fo.t0) / 1000; if(t > 1.8){ F.splice(i, 1); continue; } if(t < 0) continue;
      const r = 7 * (1 - Math.pow(1 - Math.min(1, t / 1.1), 3)), al = Math.max(0, 1 - t / 1.8);
      for(let k = 0; k < 18; k++){ const a = k / 18 * Math.PI * 2, b = ((k * 7) % 5 - 2) * .32; out.push(esfera(fo.x + Math.cos(a) * Math.cos(b) * r, fo.y + Math.sin(b) * r - 1.6 * t * t, fo.z + Math.sin(a) * Math.cos(b) * r * .6, .3, k % 3 ? fo.c : PAPEL, null, { alpha: al, semTraco: true })); }
    }
    return out;
  }
  /* o placar (desenhado de novo só quando muda), os números da cerca e a placa do portal */
  const textoB = (t, fundo, cor) => { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const x = cv.getContext('2d'); x.fillStyle = fundo; x.fillRect(0, 0, 256, 128); x.fillStyle = cor; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '900 84px "Archivo", system-ui, sans-serif'; x.fillText(t, 128, 68); return cv; };
  let PLACAR_B = null, PLACAR_K = '';
  function placarB(){
    const D = S.desafio && ehBeisebol(S.desafio.Q) ? S.desafio : null, rec = melhorQuadra(DESAFIOS.beisebol), escu = logoRS('escudo'), k = (D ? [D.n, D.pts, D.hr || 0, D.fase === 'res' ? D.res : ''].join('|') : 'parado|' + rec) + (escu ? '|e' : '');
    if(PLACAR_B && PLACAR_K === k) return PLACAR_B; PLACAR_K = k;
    const cv = PLACAR_B || document.createElement('canvas'); cv.width = 512; cv.height = 256; const x = cv.getContext('2d');
    x.fillStyle = '#121419'; x.fillRect(0, 0, 512, 256); x.fillStyle = VERMELHAO; x.fillRect(0, 0, 512, 62);
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#FFFFFF'; x.font = '900 46px "Archivo", system-ui, sans-serif'; x.fillText('ACEL', 256, 33);
    if(D && D.fase === 'res' && D.res === 'hr'){ x.fillStyle = '#FFE14A'; x.font = '900 76px "Archivo", system-ui, sans-serif'; x.fillText('HOME RUN!', 256, 160); }
    else {
      const L = D ? [['ARREMESSO', `${Math.min(TENT, D.n + 1)}/${TENT}`], ['PONTOS', String(D.pts)], ['HOME RUNS', String(D.hr || 0)]] : [['DESAFIO DE', 'REBATIDA'], ['MELHOR DO DIA', rec ? `${rec} PTS` : '-']];
      /* parado, o escudo do Red Sharks na esquerda e o desafio do lado */
      if(!D && escu){ const w = 196, h = w * escu.naturalHeight / escu.naturalWidth; x.drawImage(escu, 14, 64 + (190 - h) / 2, w, h);
        x.textAlign = 'center'; x.fillStyle = '#FFB347'; x.font = '700 30px system-ui, sans-serif'; x.fillText('DESAFIO DE', 360, 104); x.fillText('REBATIDA', 360, 140);
        x.font = '700 22px system-ui, sans-serif'; x.fillText('MELHOR DO DIA', 360, 186); x.fillStyle = '#FFE9B0'; x.font = '900 38px system-ui, sans-serif'; x.fillText(rec ? `${rec} PTS` : '-', 360, 224);
        PLACAR_B = cv; return cv; }
      x.font = '700 30px system-ui, sans-serif';
      L.forEach(([a, b], i) => { const y = 102 + i * 52; x.textAlign = 'left'; x.fillStyle = '#FFB347'; x.fillText(a, 30, y); x.textAlign = 'right'; x.fillStyle = '#FFE9B0'; x.fillText(b, 482, y); });
    }
    PLACAR_B = cv; return cv;
  }
  function placasB(){
    if(PL._bsb) return PL._bsb;
    const out = [painelSol(cantosPlaca(32, 3.62, 0, 10, 4.9, 3.45, 0), placarB, '#1B1D22', null)];
    [[-Math.PI / 4, '36'], [0, '42'], [Math.PI / 4, '36']].forEach(([th, t]) => { const [x, z] = noCampo(th, cercaR(th) - .14), img = textoB(t, '#2B2F38', '#F4F1EA'); out.push(painelSol(cantosPlaca(x, z, -th, 1.3, .8, .7, 0), () => img, '#2B2F38', null)); });
    const acel = textoB('ACEL', INK, '#F4F1EA'); out.push(painelSol(cantosPlaca(32, 58.97, 0, 1, .38, 3.64, 0), () => acel, INK, null), painelSol(cantosPlaca(32, 58.83, Math.PI, 1, .38, 3.64, 0), () => acel, INK, null));
    PL._bsb = out; return out;
  }
  /* o taco (gira do ombro, passa por cima da casa e termina do outro lado) e o capacete de quem rebate */
  function tacoB(D, e, agora){
    const cy = Math.cos(e.yaw), sy = Math.sin(e.yaw), gx = e.x + .25 * sy - .15 * cy, gz = e.z + .25 * cy + .15 * sy, gy = 1.04;
    const s = D.sw ? Math.min(1, (agora - D.sw) / SW_DUR) : 0, psi = lerpK(s, [[0, -1.77], [.32, 0], [1, 2]]), tilt = lerpK(s, [[0, 1], [.2, .45], [.32, .1], [.6, .3], [1, .9]]);
    const piv = [gx, gy, gz], T = [{ roll: tilt, piv }, { yaw: psi, piv }], G = [{ yaw: e.yaw, piv: [e.x, 0, e.z] }];
    return [solido(B(gx - .04, gy - .03, gz - .03, .5, .06, .06, '#C8955A'), T, '#C8955A', 'eu', {}), solido(B(gx + .44, gy - .045, gz - .045, .44, .09, .09, '#C8955A'), T, '#C8955A', 'eu', {}), solido(B(gx - .08, gy - .035, gz - .035, .18, .07, .07, INK), T, INK, 'eu', {}),
      solido(B(e.x - .28, 1.36, e.z - .28, .56, .2, .56, INK), G, INK, 'eu', {}), solido(B(e.x - .2, 1.36, e.z + .28, .4, .05, .2, VERMELHAO), G, VERMELHAO, 'eu', {}), solido(B(e.x - .29, 1.36, e.z - .29, .58, .04, .58, VERMELHAO), G, VERMELHAO, 'eu', {})];
  }
  function solidosBeisebol(){
    const D = S.desafio && ehBeisebol(S.desafio.Q) ? S.desafio : null, agora = Date.now(), out = [], T = timeB();
    /* o lançador no montinho, o catcher e o juiz atrás da casa e o time no campo */
    const f = D && D.fase !== 'fim' ? Math.max(0, Math.min(1, (agora - D.t0) / ANIM_B)) : 0;
    out.push(...atleta(MONTE.x, MONTE.z + .1, 0, { pose: f > 0 && f < 1 ? 'arremesso' : 'pronto', f, pele: '#E8B98A' }));
    out.push(...atleta(32.06, 51.35, Math.PI, { pose: 'agachado', pele: '#8E5B33' }), ...atleta(32.55, 52.3, Math.PI, { pose: 'juiz', pele: '#F0C9A0' }));
    T.J.forEach(j => out.push(...atleta(j.x, j.z, j.yaw, { pose: j.corre ? 'corre' : 'pronto', passo: j.passo, pele: j.pele })));
    if(D && S.eu) out.push(...tacoB(D, S.eu, agora));
    out.push(...fogosB(agora), ...placasB());
    const bp = bolaAgora(); if(bp) out.push(esfera(bp[0], bp[1], bp[2], BOLA_B, PAPEL, 'eu', { desenho: 'beisebol', gira: (agora - (D && D.voo ? D.voo.t0 : 0)) / 1000 * 14 }));
    return out;
  }
  /* ---------- v3.50 · a corrida ----------
     Montado, o boneco anda como veículo: frente acelera, trás freia (e dá ré), os lados viram, e a câmera fica atrás.
     No celular é o mesmo direcional: pra cima acelera, pros lados vira. A volta conta quando você passa pelos três
     lados do oval na ordem (direita, fundo, esquerda) e cruza a chegada; são 3. O melhor tempo do dia vai na presença
     (m.tc, em centésimos, e m.td, o dia de Brasília) e o placar junta você e quem tá na pista. Não vale correal */
  const VEIC_3D = {
    moto: { alt: .36, bl: c => [B(-.07, 0, .38, .14, .44, .44, '#16181D'), B(-.07, 0, -.82, .14, .44, .44, '#16181D'), B(-.08, .15, .53, .16, .14, .14, '#8F96A0'), B(-.08, .15, -.67, .16, .14, .14, '#8F96A0'),
      B(-.16, .32, -.62, .32, .26, 1, c), B(-.18, .56, -.12, .36, .2, .46, c), B(-.15, .58, -.6, .3, .1, .5, INK), B(-.04, .4, .38, .08, .5, .08, '#8F96A0'),
      B(-.36, .88, .36, .72, .05, .05, INK), B(-.09, .66, .48, .18, .14, .06, '#FFF6CF'), B(-.07, .5, -.66, .14, .08, .04, '#E2412E')] },
    patinete: { alt: .11, bl: c => [B(-.13, .06, -.5, .26, .05, .95, '#2B2F38'), B(-.05, 0, -.56, .1, .12, .12, '#16181D'), B(-.05, 0, .4, .1, .12, .12, '#16181D'),
      B(-.03, .11, .38, .06, 1, .06, '#8F96A0'), B(-.3, 1.08, .37, .6, .05, .06, INK), B(-.12, .11, .3, .24, .06, .12, c), B(-.05, .82, .44, .1, .08, .04, '#FFF6CF')] },
    /* v3.62: os carros da garagem na versão de pista (faixa branca, número na porta). Quem dirige fica atrás do vidro escuro */
    hatch: { alt: 0, bl: c => carroBl(c, { L: 3.6, W: 1.6, base: .24, corpo: .5, cab0: -1.3, cab1: .5, teto: .5, rodas: [1.08, -1.18], asa: true }) },
    suv: { alt: 0, bl: c => carroBl(c, { L: 3.9, W: 1.72, base: .3, corpo: .6, cab0: -1.62, cab1: .55, teto: .56, rodas: [1.2, -1.3], rack: true, clad: true }) },
    picape: { alt: 0, bl: c => carroBl(c, { L: 4.3, W: 1.72, base: .3, corpo: .55, cab0: -.35, cab1: .85, teto: .54, rodas: [1.38, -1.4], cacamba: true }) }
  };
  /* um carro de caixas, de frente pro z+ e centrado no meio: rodas, o corpo, a cabine com os vidros, a faixa e as luzes */
  function carroBl(c, o){
    const VID = '#28303B', hw = o.W / 2, z0 = -o.L / 2, z1 = o.L / 2, y1 = o.base + o.corpo, cz = o.cab0, cl = o.cab1 - o.cab0, out = [];
    o.rodas.forEach(rz => [-hw - .03, hw - .25].forEach(rx => { out.push(B(rx, 0, rz - .32, .28, .64, .64, '#16181D')); out.push(B(rx < 0 ? rx - .015 : rx + .275, .2, rz - .12, .02, .24, .24, '#8F96A0')); }));
    if(o.cacamba){
      /* a picape: o corpo vai até a cintura só na frente; atrás, a caçamba aberta (fundo escuro e as bordas na cor) */
      out.push(B(-hw, o.base, cz, o.W, o.corpo, z1 - cz, c));
      out.push(B(-hw, o.base, z0, o.W, o.corpo * .45, cz - z0, c));
      out.push(B(-hw + .07, o.base + o.corpo * .45, z0 + .07, o.W - .14, .02, cz - z0 - .07, escurece(c, .55)));
      out.push(B(-hw, o.base + o.corpo * .45, z0, .07, o.corpo * .55 + .06, cz - z0, c)); out.push(B(hw - .07, o.base + o.corpo * .45, z0, .07, o.corpo * .55 + .06, cz - z0, c));
      out.push(B(-hw, o.base + o.corpo * .45, z0, o.W, o.corpo * .55 + .06, .07, c));
    } else out.push(B(-hw, o.base, z0, o.W, o.corpo, o.L, c));
    if(o.clad) out.push(B(-hw - .01, o.base, z0 + .25, o.W + .02, .15, o.L - .5, '#2B2F38'));
    out.push(B(-hw + .08, y1, cz, o.W - .16, o.teto, cl, c));
    out.push(B(-hw + .13, y1 + .05, o.cab1 - .005, o.W - .26, o.teto - .12, .02, VID), B(-hw + .13, y1 + .05, cz - .015, o.W - .26, o.teto - .12, .02, VID));
    out.push(B(-hw + .065, y1 + .06, cz + .12, .02, o.teto - .15, cl - .24, VID), B(hw - .085, y1 + .06, cz + .12, .02, o.teto - .15, cl - .24, VID));
    /* a faixa branca do capô ao teto e o número (sem número escrito: o quadrado branco do número de corrida) */
    out.push(B(-.13, y1 + .004, o.cab1, .26, .012, z1 - o.cab1, PAPEL), B(-.13, y1 + o.teto + .004, cz, .26, .012, cl, PAPEL));
    out.push(B(-hw - .012, o.base + .1, -.35, .012, .32, .42, PAPEL), B(hw, o.base + .1, -.35, .012, .32, .42, PAPEL));
    /* grade, faróis e lanternas */
    out.push(B(-hw + .45, o.base + .14, z1, o.W - .9, .14, .02, INK));
    out.push(B(-hw + .1, y1 - .2, z1, .3, .12, .02, '#FFF6CF'), B(hw - .4, y1 - .2, z1, .3, .12, .02, '#FFF6CF'));
    out.push(B(-hw + .08, y1 - .18, z0 - .02, .28, .1, .02, '#E2412E'), B(hw - .36, y1 - .18, z0 - .02, .28, .1, .02, '#E2412E'));
    if(o.rack){ out.push(B(-hw + .18, y1 + o.teto, cz + .25, .06, .06, cl - .5, INK), B(hw - .24, y1 + o.teto, cz + .25, .06, .06, cl - .5, INK)); }
    if(o.asa){ out.push(B(-hw + .2, y1 + .02, z0 + .08, .06, .16, .06, INK), B(hw - .26, y1 + .02, z0 + .08, .06, .16, .06, INK), B(-hw + .12, y1 + .18, z0 + .02, o.W - .24, .04, .26, INK)); }
    return out;
  }
  /* v3.54: patinete é sempre o da JET (o Thales: "só a azul, e faz questão de enfatizar o logo da JET"): azul da marca,
     faixa branca, e a marca no guidão, no deque, atrás e numa bandeirinha alta (a câmera da corrida vê ela o tempo todo) */
  const JET_AZUL = '#307FE2';
  const LOGO_JET = [[[.09, .118, .32], [-.09, .118, .32], [-.09, .118, -.22], [.09, .118, -.22]], [[-.09, .8, .452], [.09, .8, .452], [.09, .62, .452], [-.09, .62, .452]], [[.11, .32, -.612], [-.11, .32, -.612], [-.11, .13, -.612], [.11, .13, -.612]],
    [[.0, 1.36, -.585], [-.4, 1.36, -.585], [-.4, 1.1, -.585], [.0, 1.1, -.585]], [[-.4, 1.36, -.575], [.0, 1.36, -.575], [.0, 1.1, -.575], [-.4, 1.1, -.575]]];
  const veiculo3d = (k, x, y, z, yaw, cor, dono) => {
    const jet = k === 'patinete', cr = jet ? JET_AZUL : cor, out = VEIC_3D[k].bl(cr).map(b => solido(Object.assign({}, b, { x: b.x + x, y: b.y + y, z: b.z + z }), [{ yaw, piv: [x, 0, z] }], b.c, dono, {}));
    if(jet){
      const extra = [B(-.135, .105, -.5, .27, .012, .95, PAPEL), B(-.11, .11, -.62, .22, .22, .02, JET_AZUL), B(-.012, .11, -.59, .024, 1.27, .024, '#8F96A0'), B(-.08, .58, .44, .16, .24, .01, INK)];
      extra.forEach(b => out.push(solido(Object.assign({}, b, { x: b.x + x, y: b.y + y, z: b.z + z }), [{ yaw, piv: [x, 0, z] }], b.c, dono, {})));
      const cy = Math.cos(yaw), sy = Math.sin(yaw), W = p => [x + p[0] * cy + p[2] * sy, y + p[1], z - p[0] * sy + p[2] * cy];
      const logo = () => (C.verso && C.verso.publiLogo ? C.verso.publiLogo('jet', 256, 128) : null);
      LOGO_JET.forEach(P4 => out.push(painelSol(P4.map(W), logo, JET_AZUL, dono)));
    }
    return out;
  };
  const corVeic = (k, av) => (C.veiculos && C.veiculos.cor ? C.veiculos.cor(k, av && av.vcor) : LARANJA);
  const diaBR = () => Math.floor((Date.now() - 3 * 3600e3) / 864e5);
  const tempoTxt = ms => { const t = Math.max(0, Math.round(ms / 100)), m = Math.floor(t / 600), sg = Math.floor(t / 10) % 60; return `${m}:${String(sg).padStart(2, '0')},${t % 10}`; };
  const recCorrida = () => { try{ const o = JSON.parse(localStorage.getItem('corre-corrida') || '{}'); return o && typeof o === 'object' ? o : {}; }catch(e){ return {}; } };
  const guardaCorrida = o => { try{ localStorage.setItem('corre-corrida', JSON.stringify(o)); }catch(e){} };
  const pistaAqui = () => { const P = (S.aberta && S.lugar && LUGARES[S.lugar] && LUGARES[S.lugar].corrida) || null; return P && P.k === 'moto' ? veicAuto().P : P; };
  const autodromo = () => !!(S.aberta && S.lugar && LUGARES[S.lugar] && LUGARES[S.lugar].corrida && LUGARES[S.lugar].corrida.k === 'moto');
  /* v3.59: pista de kart com os bichos (a da moto também usa o motor do kart, mas sozinha: sem bicho e sem item) */
  const comBicho = () => !!(PL && PL.kart && !PL.solo);
  const melhorHoje = P => { const r = P && recCorrida()[P.rk || P.veic]; return r && r.dia === diaBR() ? r.ms : 0; };
  const VOLTAS = 3;
  function rankingCorrida(P){
    const hoje = diaBR() % 1e5, out = [], meu = melhorHoje(P);
    if(meu) out.push({ nome: 'você', ms: meu, eu: true });
    gente().forEach(g => { if(g.td === hoje && g.tc > 0 && (!P.tv || (g.tv || 1) === P.tv)) out.push({ nome: '@' + (g.handle || 'alguém'), ms: g.tc * 10 }); });
    return out.sort((a, b) => a.ms - b.ms);
  }
  function largar(){
    const P = pistaAqui(), e = S.eu; if(!P || !e || S.corrida) return;
    if(autodromo()){ veicSheet(); return; }
    if(P.solo){ largarKart(P, null); return; }
    bichoSheet();
  }
  /* v3.62: no totem do Autódromo, moto ou um dos carros (fica guardado o último que você usou) */
  function veicSheet(){
    const rec = recCorrida(), atual = veicAuto().k;
    C.sheet(`<div class="form cs-veics"><div class="sheet-head"><h2>Com o que você corre?</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p class="note">${VOLTAS} voltas no ${esc(PISTA_MOTO.nome)}, contra o relógio. Cada veículo tem o placar e o recorde dele.</p>
      <div class="cs-veic-l">${VEIC_AUTO.map(v => `<button type="button" class="cs-veic${v.k === atual ? ' eu' : ''}" data-act="cs-veic" data-k="${v.k}"><i style="--c:${esc(corVeic(v.k, S.eu && S.eu.av))}">${ico(v.P.carro ? 'carro' : 'raio')}</i><b>${esc(v.nome)}</b><small>${esc(v.sub)}</small><em>${rec[v.P.rk + 'Rec'] ? `recorde ${tempoTxt(rec[v.P.rk + 'Rec'])}` : 'sem recorde ainda'}</em></button>`).join('')}</div></div>`);
  }
  function desmonta(desistiu){
    const R = S.corrida; if(!R) return; S.corrida = null; somPara();
    if(R.cam0){ S.cam.ph = R.cam0.ph; S.cam.dist = R.cam0.dist; }
    const e = S.eu; if(e){ e.vel = 0; e.y = 0; const p = livrePerto(ENTRADA.x, ENTRADA.z - 1.2, 0); e.x = p[0]; e.z = p[1]; e.yaw = Math.PI; S.cam.th = 0; }
    if(desistiu) C.toast('Desistiu da corrida.', 1600);
    painelCorrida(true); if(C.verso && C.verso.enviaPos) C.verso.enviaPos(true);
  }
  /* toda pista corre no motor do kart (a moto é "solo") */
  function passoVeiculo(dt){ passoKart(dt); }
  function painelCorrida(forca){ if(pistaAqui()) painelKart(forca); }
  /* ---------- v3.53 · a corrida de kart ----------
     No grid: você (4º lugar) e cinco personagens do Correverso, cada um no seu patinete. Semáforo de 3 luzes; segurar o
     acelerador quando acende a segunda dá a largada perfeita (turbo), segurar desde antes da primeira afoga. 3 voltas.
     Na pista: seta de turbo; rampa (no ar, apertou Pular: manobra e turbo na volta pro chão); derrapagem (segura Pular
     virando: a faísca fica laranja e depois rosa, e soltar dá o mini-turbo); disco (a roleta sorteia um item: café é
     turbo, café triplo são três, chiclete fica grudado na pista atrás de você, o grave do paredão derruba quem tá
     perto). Fora da pista anda devagar; muito longe, a pista te pega de volta. Os rivais andam no trilho da pista (o
     mais rápido que a curva deixa), pegam disco, usam café, soltam chiclete e mandam grave; quem fica muito pra trás
     ganha um empurrão e quem vai muito na frente segura um pouco (pra corrida ficar junta). O melhor tempo do dia de
     cada pista vai na presença, como na corrida de antes. Não vale correal: vale o pódio */
  /* os seis bichos fixos da corrida: criaturas originais do Corre, com nome de apelido (o Thales pediu "bichos
     engraçados com nomes engraçados"). Cada pessoa da pista pega um; quem sobra, a máquina pilota */
  const BICHOS_K = [
    { k: 'capivolt', nome: 'Capivolt', sobre: 'Capivara elétrica de topete de raio. Nunca tá com pressa, só que chega primeiro.', cor: LARANJA, f: .99 },
    { k: 'bumbo', nome: 'Bumbo', sobre: 'Urso barrigudo com a caixa de som nas costas. Quando o Bumbo solta o grave, até poste balança.', cor: VERM, f: .985 },
    { k: 'bicudo', nome: 'Bicudo', sobre: 'Tucano de bico maior que o corpo. Cruza a chegada de bico antes de todo mundo.', cor: AZUL, f: .98 },
    { k: 'tatubala', nome: 'Tatubala', sobre: 'Tatu-bola de casco listrado. Caiu, rola; rolou, já levantou.', cor: '#F2CF6B', f: .995 },
    { k: 'canelinha', nome: 'Canelinha', sobre: 'Lobo-guará de canela fina e tênis branco. Perna comprida, passo maior ainda.', cor: LILAS, f: .985 },
    { k: 'soneca', nome: 'Soneca', sobre: 'Bicho-preguiça de touca e travesseiro. Corre dormindo, e às vezes ganha.', cor: ROSA, f: .975 }
  ];
  const avBicho = i => ({ personagem: BICHOS_K[i].k });
  const bichoOk = i => Number.isInteger(i) && i >= 0 && i < BICHOS_K.length;
  const ITENS_K = { cafe: { nome: 'Café', ico: 'raio', n: 1 }, cafe3: { nome: 'Café triplo', ico: 'raio', n: 3 }, chiclete: { nome: 'Chiclete', ico: 'tacha', n: 1 }, grave: { nome: 'Grave', ico: 'som', n: 1 } };
  const ALAT_K = 14;
  const sorteiaItem = pos => { const r = Math.random(), atras = pos / 6;
    if(atras > .6) return r < .38 ? 'cafe3' : r < .7 ? 'grave' : r < .92 ? 'cafe' : 'chiclete';
    if(atras > .3) return r < .4 ? 'cafe' : r < .65 ? 'chiclete' : r < .85 ? 'grave' : 'cafe3';
    return r < .5 ? 'chiclete' : r < .85 ? 'cafe' : 'grave'; };
  /* a amostra mais perto de (x, z) na vizinhança da anterior (a pista pode passar perto dela mesma: procurar na
     vizinhança não deixa a volta "pular") */
  function siLocal(c, x, z, si0){ let best = si0, bd = 1e9; for(let d = -26; d <= 26; d++){ const i = idxK(c, si0 + d), p = c.P[i], dd = (p[0] - x) ** 2 + (p[1] - z) ** 2; if(dd < bd){ bd = dd; best = i; } } return [best, Math.sqrt(bd)]; }
  const latDe = (c, i, x, z) => { const p = c.P[i], t = c.T[i]; return (x - p[0]) * -t[1] + (z - p[1]) * t[0]; };
  const perto = (c, i, alvo, jan) => { const d = ((i - alvo) % c.N + c.N + c.N / 2) % c.N - c.N / 2; return Math.abs(d) <= jan; };
  /* v3.79 · o som da corrida (o Thales: "em todos os jogos de corrida eu quero barulhos, motor etc." e "uma
     musiquinha de adrenalina meio Top Gear"). Quem toca é o verso-som.js: aqui só se conta o que tá acontecendo. O motor
     e o chão vão a cada quadro (corrida), os golpes de uma vez (somFx) e a música entra na contagem, com a entrada
     terminando no "vai" */
  const somV = () => C.versoSom && C.versoSom.corrida ? C.versoSom : null;
  const somFx = (k, x) => { const V = somV(); if(V) try{ V.corridaFx(k, x); }catch(e){} };
  function somPara(){ const V = somV(); if(V) try{ V.corrida(null); V.corridaMusica(false); }catch(e){} }
  function somKart(R, P, agora, o){
    const V = somV(); if(!V) return; const e = S.eu, falta = R.larga - agora;
    /* as três luzes do semáforo (a cada segundo) e a música, que começa 3,16 s antes do "vai" */
    if(falta > 0){ const n = Math.ceil(falta / 1000); if(n <= 3 && R.somConta !== n){ R.somConta = n; somFx('conta'); } }
    if(!R.musica && !R.fim) R.musica = V.corridaMusica(true, (falta - 3158) / 1000);
    /* o rival mais perto, e de que lado ele tá (direita é +) */
    let riv = null;
    R.rivais.forEach(r => { const p = naLinha(P.Kp.c, r.s, r.lat), dx = p[0] - e.x, dz = p[1] - e.z, d = Math.hypot(dx, dz); if(!riv || d < riv.d) riv = { d, u: r.v / P.vmax, lado: d > .01 ? (dz * Math.sin(e.yaw) - dx * Math.cos(e.yaw)) / d : 0 }; });
    try{ V.corrida(Object.assign({ veic: P.veic, u: (e.vel || 0) / P.vmax, riv }, o)); }catch(x){}
    if(R.fim || falta > 0) return;
    /* passou alguém (a posição melhorou) */
    if(!P.solo && agora - (R.somPosT || 0) > 400){ R.somPosT = agora; const pos = ordemKart(R).find(x => x.eu).pos; if(R.somPos && pos < R.somPos) somFx('passou'); R.somPos = pos; }
    /* o perigo da pista chegando perto: buzina (a capivara não buzina) */
    if(agora - (R.buzT || 0) > 4000) perigoAgora(P, agora).some(g => { if(g.tipo === 'capivara' || !g.anda || Math.hypot(g.x - e.x, g.z - e.z) > 9) return false; R.buzT = agora; somFx('buzina', 'carro'); return true; });
  }
  function largarKart(P, vivo){
    if(!P.solo && !bichoOk(S.kartBicho)) return;
    const e = S.eu, c = P.Kp.c, g = P.Kp.grade, eu = vivo ? Math.max(0, vivo.quem.indexOf(C.verso.meuSid())) : P.solo ? 0 : 3, meu = g[eu], p = ptK(c, meu.i, meu.lat, 0), t = c.T[idxK(c, meu.i)];
    e.x = p[0]; e.z = p[1]; e.y = 0; e.yaw = Math.atan2(t[0], t[1]); e.vel = 0; e.andando = false;
    S.alvo = null; S.rota = []; S.acao = null; S.teclas.clear(); S.cam.th = e.yaw + Math.PI; S.cam.tx = e.x; S.cam.tz = e.z;
    /* sempre seis: ao vivo, as pessoas ficam nos primeiros lugares do grid (na ordem da lista de quem largou) e a máquina
       pilota os bichos que sobraram; quem largou (o primeiro da lista) roda a máquina e manda a posição dela pros outros.
       Sozinho: você no 4º lugar e os outros cinco */
    const ocupados = vivo ? vivo.bichos : [S.kartBicho], livres = BICHOS_K.map((b, j) => j).filter(j => !ocupados.includes(j));
    const slots = vivo ? g.map((x, n) => n).filter(n => n >= vivo.quem.length) : [0, 1, 2, 4, 5];
    const roda = !vivo || vivo.quem[0] === C.verso.meuSid();
    /* v3.55: dois com o mesmo bicho sobrava bicho sem lugar no grid (e a largada quebrava): só entra quem cabe */
    const rivais = P.solo ? [] : livres.slice(0, slots.length).map((j, n) => { const b = BICHOS_K[j], sl = g[slots[n]]; return Object.assign({}, b, { idx: j, av: avBicho(j), s: sl.i * c.ds, sAlvo: sl.i * c.ds, lat: sl.lat, latAlvo: sl.lat, v: 0, vmax: P.vmax * b.f, estilo: (sorte(j * 7.3 + 1) - .5) * 1.4, item: null, itemT: 0, boostAte: 0, rodouAte: 0, puloT: 0, fim: 0, remoto: !roda }); });
    S.corrida = { P, kart: true, vivo: vivo ? { id: vivo.id, quem: vivo.quem.slice(0, 6), bichos: vivo.bichos.slice(0, 6), host: vivo.quem[0], roda } : null, cpuT: 0, cpuVisto: Date.now(), larga: Date.now() + (vivo ? vivo.em : 4000), voltas: [], tv: 0, lap: 0, prog: meu.i * c.ds, si: idxK(c, meu.i), item: null, itemN: 0, roleta: 0, sorteado: null, boostAte: 0, drift: null, pulo: null, hopT: 0, rodouAte: 0, chic: [], ondas: [], rivais, discOff: {}, obsOff: {}, caido: {}, cam0: { ph: S.cam.ph, dist: S.cam.dist }, acelDesde: 0, longeT: 0, contraT: 0, progAnt: 0, yawVis: 0, segura: false, pulaT: 0 };
    painelCorrida(true); if(C.verso && C.verso.enviaPos) C.verso.enviaPos(true);
  }
  /* a posição de todo mundo: quem chegou, na ordem; o resto pelo quanto andou */
  function ordemKart(R){
    const tot = R.P.Kp.c.tot, nb = i => (bichoOk(i) ? BICHOS_K[i].nome : 'alguém');
    const lista = [{ nome: R.P.solo ? 'você' : `você · ${nb(S.kartBicho)}`, eu: true, prog: R.prog, tempo: R.fim ? R.total : 0 }];
    if(R.vivo) gente().forEach(r => { if(r.kl === R.vivo.id && R.vivo.quem.includes(r.sid)) lista.push({ nome: `${nb(r.kp)} · @${r.handle || 'alguém'}`, prog: (r.kg || 0) / 10, tempo: r.kfId === R.vivo.id ? r.kfT || 0 : 0 }); });
    R.rivais.forEach(r => lista.push({ nome: R.vivo ? `${r.nome} · máquina` : r.nome, prog: r.s, tempo: r.fim ? r.tempo : 0, r }));
    return lista.sort((a, b) => (a.tempo && b.tempo) ? a.tempo - b.tempo : a.tempo ? -1 : b.tempo ? 1 : b.prog - a.prog).map((x, i) => Object.assign(x, { pos: i + 1, fim: !!x.tempo, volta: Math.min(VOLTAS, Math.max(1, Math.floor(x.prog / tot) + 1)) }));
  }
  function rodou(o, ms, f){ const agora = Date.now(); if((o.rodouAte || 0) > agora) return false; o.rodouAte = agora + ms; o.rodouT0 = agora; if(o === S.corrida){ S.eu.vel = (S.eu.vel || 0) * f; o.drift = null; } else o.v *= f; return true; }
  /* o perigo de cada pista: onde ele tá agora (anda de um lado pro outro atravessando a pista, para um pouco em cada lado) */
  function perigoAgora(P, agora){
    const pg = P.def.perigo; if(!pg) return []; const c = P.Kp.c, i = P._pi == null ? (P._pi = maisReto(c, pg.s, .02)) : P._pi;
    const ida = pg.alcance * 2 / pg.vel * 1000, ciclo = (ida + pg.pausa) * 2, u = agora % ciclo;
    let lat, sg, anda = true;
    if(u < ida){ lat = -pg.alcance + pg.vel * u / 1000; sg = 1; } else if(u < ida + pg.pausa){ lat = pg.alcance; sg = 1; anda = false; }
    else if(u < ida * 2 + pg.pausa){ lat = pg.alcance - pg.vel * (u - ida - pg.pausa) / 1000; sg = -1; } else { lat = -pg.alcance; sg = -1; anda = false; }
    const t = c.T[i], yaw = Math.atan2(-t[1], t[0]) + (sg < 0 ? Math.PI : 0), ax = Math.sin(yaw), az = Math.cos(yaw), out = [];
    const MED = { capivara: [.25, .38], trator: [.7, .75], busao: [2.25, 1.15], van: [1.4, .95] }[pg.tipo] || [.3, .4];
    for(let k = 0; k < (pg.tipo === 'capivara' ? 3 : 1); k++){ const p = ptK(c, i, lat - sg * k * 1, (k - 1) * .45); out.push({ x: p[0], z: p[1], yaw, anda, tipo: pg.tipo, ax, az, hl: MED[0], rr: MED[1] }); }
    return out;
  }
  /* bateu no perigo? distância do ponto até o "corpo" dele (um segmento com raio: o busão é comprido) */
  const bateuPerigo = (o, x, z, folga) => { const dx = x - o.x, dz = z - o.z, u = Math.max(-o.hl, Math.min(o.hl, dx * o.ax + dz * o.az)); return Math.hypot(dx - o.ax * u, dz - o.az * u) < o.rr + folga; };
  function chegadaKart(){
    const R = S.corrida, P = R.P, agora = Date.now(), total = agora - R.larga, rec = recCorrida(), hoje = diaBR(); R.fim = agora; R.total = total;
    const meu = rec[P.rk] && rec[P.rk].dia === hoje ? rec[P.rk].ms : 0, bateu = !meu || total < meu, sempre = rec[P.rk + 'Rec'] || 0, recorde = !sempre || total < sempre;
    if(bateu) rec[P.rk] = { dia: hoje, ms: total }; if(recorde) rec[P.rk + 'Rec'] = total; guardaCorrida(rec);
    const pos = ordemKart(R).find(x => x.eu).pos;
    { const V = somV(); if(V) try{ V.corridaMusica(false); }catch(e){} } somFx('chegada', P.solo ? (recorde || bateu ? 1 : 4) : pos);
    if(R.vivo) mandaKart({ t: 'fim', id: R.vivo.id, ms: total });
    if(PL && PL.banner) setTimeout(() => { if(S.aberta && PL && PL.banner) bannerPubli(PL.banner); }, 2500);
    if(P.solo){ const lista = rankingCorrida(P), p2 = lista.findIndex(x => x.eu) + 1; C.toast(`Chegou! ${tempoTxt(total)}${recorde ? ', teu recorde' : bateu ? ', o teu melhor de hoje' : ''}${lista.length > 1 ? `. ${p2}º do dia na pista` : ''}.`, 5200); }
    else C.toast(`${pos === 1 ? 'Primeiro lugar!' : `Chegou em ${pos}º.`} ${tempoTxt(total)}${recorde ? ', teu recorde' : bateu ? ', o teu melhor de hoje' : ''}.`, 5200);
    if(C.verso && C.verso.anunciar) C.verso.anunciar();
    setTimeout(() => { if(S.corrida === R) desmonta(); }, 7000);
  }
  /* Pular no kart: apertou pula (e começa a derrapar se tiver virando), soltou acaba a derrapagem */
  function pulaKart(on){
    const R = S.corrida; if(!R || !R.kart) return; const agora = Date.now(); R.segura = on;
    if(on){ R.pulaT = agora; if(R.pulo){ if(agora - R.pulo.t0 < R.pulo.dur * .6) R.pulo.truque = true; return; } if(agora - R.hopT > 300) R.hopT = agora; }
    else if(R.drift){ const n = R.drift.n; R.drift = null; if(n) { somFx('mini', n); R.boostAte = Math.max(R.boostAte, agora + (n === 2 ? 1150 : 650)); S.eu.vel = Math.max(S.eu.vel || 0, R.P.vmax * (n === 2 ? 1.25 : 1.12)); } }
  }
  function usaItem(){
    const R = S.corrida; if(!R || !R.kart || !R.item || R.fim || Date.now() < R.larga) return; const agora = Date.now(), e = S.eu, k = R.item;
    somFx(k === 'chiclete' ? 'solta' : k === 'grave' ? 'grave' : 'cafe');
    if(k === 'cafe' || k === 'cafe3'){ R.boostAte = Math.max(R.boostAte, agora + 1300); e.vel = Math.max(e.vel || 0, R.P.vmax * 1.2); }
    else if(k === 'chiclete'){ const g = { x: e.x - Math.sin(e.yaw) * 1.2, z: e.z - Math.cos(e.yaw) * 1.2, ate: agora + 30000, t0: agora }; R.chic.push(g); if(R.vivo) mandaKart({ t: 'chic', id: R.vivo.id, x: Math.round(g.x * 100) / 100, z: Math.round(g.z * 100) / 100 }); }
    else if(k === 'grave'){ R.ondas.push({ x: e.x, z: e.z, t0: agora }); if(R.vivo) mandaKart({ t: 'grave', id: R.vivo.id, x: Math.round(e.x * 100) / 100, z: Math.round(e.z * 100) / 100 }); let n = 0; R.rivais.forEach(r => { const p = naLinha(R.P.Kp.c, r.s, r.lat); if(Math.hypot(p[0] - e.x, p[1] - e.z) < 8 && rodou(r, 1100, .45)) n++; }); if(n) C.toast(n === 1 ? 'O grave derrubou um.' : `O grave derrubou ${n}.`, 1400); }
    if(--R.itemN <= 0){ R.item = null; R.itemN = 0; }
    painelCorrida(true);
  }
  function passoKart(dt){
    const e = S.eu, R = S.corrida, P = R.P, c = P.Kp.c, h = P.Kp.h, k = S.teclas, agora = Date.now();
    let ac = 0, vi = 0;
    if(k.has('w') || k.has('ArrowUp')) ac += 1; if(k.has('s') || k.has('ArrowDown')) ac -= 1;
    if(k.has('d') || k.has('ArrowRight')) vi += 1; if(k.has('a') || k.has('ArrowLeft')) vi -= 1;
    const pv = S.pad && S.pad.vetor ? S.pad.vetor() : null;
    if(pv && pv.m && !ac && !vi){ ac = Math.max(-1, Math.min(1, -pv.y * 1.4)); vi = Math.max(-1, Math.min(1, pv.x * 1.4)); }
    if(S.pad && S.pad.segura) R.segura = R.segura || S.pad.segura();
    S.alvo = null; S.rota = []; S.acao = null;
    /* a largada: segurar o acelerador na hora certa */
    if(agora < R.larga){ if(ac > 0){ if(!R.acelDesde) R.acelDesde = agora; } else R.acelDesde = 0; }
    const solto = agora >= R.larga && !R.fim;
    if(solto && !R.vai){ R.vai = 1; const a = R.acelDesde; if(a && a >= R.larga - 1700 && a <= R.larga - 450){ R.boostAte = agora + 1200; e.vel = P.vmax * .9; C.toast('Largada perfeita!', 1300); somFx('perfeita'); } else if(a && a < R.larga - 2700){ R.rodouAte = agora + 900; R.rodouT0 = agora; C.toast('Afogou!', 1200); somFx('afogou'); } else { C.toast('Vai!', 900); somFx('vai'); } }
    if(!solto || R.fim) ac = R.fim ? -.25 : 0;
    const roda = (R.rodouAte || 0) > agora; if(roda){ ac = 0; vi = 0; }
    /* onde você tá na pista */
    let [si, dd] = siLocal(c, e.x, e.z, R.si); const lat = latDe(c, si, e.x, e.z), fora = Math.abs(lat) > h + .15;
    if(dd > 7.5){ R.longeT = R.longeT || agora; si = R.si; } else { R.longeT = 0; }
    /* v3.62: acelerando e sem sair do lugar (encostado no muro de pneu) por 2,5 s: volta pra pista, igual quando vai longe */
    if(solto && !R.fim && ac > 0 && Math.abs(e.vel || 0) < .8 && !R.pulo){ R.travadoT = R.travadoT || agora; if(agora - R.travadoT > 2500){ R.longeT = agora - 2600; R.travadoT = 0; } } else R.travadoT = 0;
    if(R.longeT && agora - R.longeT > 2500){ const p = ptK(c, R.si, 0, 0), t = c.T[R.si]; e.x = p[0]; e.z = p[1]; e.yaw = Math.atan2(t[0], t[1]); e.vel = 0; R.longeT = 0; R.drift = null; C.toast('De volta pra pista.', 1300); si = R.si; }
    let d = si - R.si; if(d > c.N / 2) d -= c.N; else if(d < -c.N / 2) d += c.N; R.si = si; R.prog += d * c.ds;
    const naAgua = P.Kp.agua && !R.pulo && perto(c, si, P.Kp.agua.i0 + 2, 2) && Math.abs(lat) < h + 7;
    /* v3.59: nas costelas a moto sacode e não passa de 72% (no ar, passa por cima) */
    const naCostela = !R.pulo && Math.abs(lat) < h && P.Kp.costelas.some(cs => (cs.i0 <= cs.i1 ? si >= cs.i0 && si <= cs.i1 : si >= cs.i0 || si <= cs.i1));
    /* a velocidade: turbo, fora da pista, água */
    const boost = R.boostAte > agora;
    let vmax = P.vmax; if(fora && !R.pulo) vmax = 4.4; if(naAgua) vmax = 3; if(naCostela) vmax = Math.min(vmax, P.vmax * (P.costela || .72)); if(boost) vmax = P.vmax * 1.45;
    let v = e.vel || 0;
    if(!R.pulo){
      /* v3.59: o turbo empurra até o teto dele (antes somava mais rápido do que o teto segurava e passava de 30 m/s) */
      if(boost) v += P.acel * 2.2 * dt * (v < vmax ? 1 : 0);
      else if(ac > 0) v += P.acel * ac * dt * (v > vmax ? 0 : 1);
      else if(ac < 0) v -= (v > 0 ? P.acel * 1.8 : P.acel * .5) * -ac * dt;
      else v -= Math.sign(v) * Math.min(Math.abs(v), 2.5 * dt);
      if(v > vmax) v = Math.max(vmax, v - 7 * dt);
      v = Math.max(-3, v);
    }
    /* virar: no chão; derrapando, a curva é mais fechada e o lado de dentro manda */
    const segura = R.segura || k.has(' ');
    if(!R.drift && segura && agora - R.pulaT < 300 && Math.abs(vi) > .25 && v > 5 && !R.pulo && !roda) R.drift = { lado: Math.sign(vi), t0: agora, n: 0 };
    if(R.drift && (v < 3.5 || roda)) R.drift = null;
    if(!R.pulo && Math.abs(v) > .2 && !roda){
      if(R.drift){ const D = R.drift, f = .72 + .5 * Math.max(-1, Math.min(1, vi * D.lado)); e.yaw -= D.lado * P.giro * 1.05 * f * dt; const tt = agora - D.t0; D.n = tt > 1500 ? 2 : tt > 700 ? 1 : 0; }
      else e.yaw -= vi * P.giro * dt * Math.min(1, Math.abs(v) / 3) * Math.sign(v);
    }
    R.yawVis += ((R.drift ? R.drift.lado * -.38 : 0) - R.yawVis) * Math.min(1, dt * 8);
    const sx = Math.sin(e.yaw) * v * dt, sz = Math.cos(e.yaw) * v * dt, ox = e.x, oz = e.z;
    mover(e, sx, sz);
    const andou = Math.hypot(e.x - ox, e.z - oz), quer = Math.hypot(sx, sz);
    if(quer > .001 && andou < quer * .6){ v *= .55; R.drift = null; }
    e.vel = v; e.andando = false;
    /* rampa: quem passa rápido voa */
    if(!R.pulo) P.Kp.rampas.forEach(rp => { if(!R.pulo && Math.abs(lat) < h && v > 3.5 && perto(c, si, rp.ib, 1)) { R.pulo = { t0: agora, dur: 260 + v * 62, alt: .45 + v * .085, truque: agora - R.pulaT < 160 }; R.drift = null; somFx('pulo'); } });
    if(R.pulo){ const u = (agora - R.pulo.t0) / R.pulo.dur; if(u >= 1){ somFx('pouso'); if(R.pulo.truque){ R.boostAte = Math.max(R.boostAte, agora + 850); e.vel = Math.max(e.vel, P.vmax * 1.15); C.toast('Manobra!', 900); somFx('manobra'); } R.pulo = null; e.y = 0; } else e.y = R.pulo.alt * 4 * u * (1 - u); }
    else { const hu = (agora - R.hopT) / 200; e.y = hu >= 0 && hu < 1 ? .16 * Math.sin(Math.PI * hu) : 0; if(naCostela) e.y = Math.max(e.y, .09 * Math.abs(Math.sin(R.prog * Math.PI / 1.2))); }
    /* seta de turbo */
    if(!R.pulo) P.Kp.turbos.forEach(tb => { if(perto(c, si, tb.i, 2) && Math.abs(lat - tb.lat) < .95){ if(R.boostAte < agora + 600){ R.boostAte = agora + 1100; somFx('turbo'); } e.vel = Math.max(e.vel, P.vmax * 1.3); } });
    /* disco: a roleta */
    P.Kp.discos.forEach(dc => { if((R.discOff[dc.id] || 0) > agora || Math.hypot(dc.x - e.x, dc.z - e.z) > .95 || e.y > .9) return; R.discOff[dc.id] = agora + 3000; if(!R.item && !R.roleta){ R.roleta = agora + 1000; R.sorteado = sorteiaItem(ordemKart(R).find(x => x.eu).pos); somFx('disco'); } });
    if(R.roleta && agora > R.roleta){ R.item = R.sorteado; R.itemN = ITENS_K[R.item].n; R.roleta = 0; painelCorrida(true); somFx('item'); }
    /* chiclete e perigo */
    if(!R.pulo){ for(let j = R.chic.length - 1; j >= 0; j--){ const g = R.chic[j]; if(agora - g.t0 > 500 && Math.hypot(g.x - e.x, g.z - e.z) < .6){ R.chic.splice(j, 1); if(rodou(R, 1000, .3)){ C.toast('Pisou no chiclete!', 1200); somFx('chiclete'); } } } }
    if(solto) perigoAgora(P, agora).forEach(o => { if(bateuPerigo(o, e.x, e.z, .3 + (P.carro ? .55 : 0)) && e.y < .8 && rodou(R, 1100, -.25)){ C.toast(o.tipo === 'capivara' ? 'Bateu na capivara! (ela tá bem)' : o.tipo === 'trator' ? 'Bateu no trator!' : o.tipo === 'van' ? 'Bateu na van da JET!' : 'Bateu no busão!', 1500); somFx('batida'); somFx('rodou'); } });
    R.chic = R.chic.filter(g => g.ate > agora);
    /* v3.59: os obstáculos da pista (óleo derrapa, cone cai e segura a moto, pneu bate e devolve) */
    /* v3.62: o carro é mais largo que a moto: bate antes (cg = metade da largura a mais) */
    const cg = P.carro ? .45 : 0;
    if(solto && !R.pulo && e.y < .5) P.Kp.obst.forEach(ob => { if((R.obsOff[ob.id] || 0) > agora) return; const d = Math.hypot(ob.x - e.x, ob.z - e.z) - cg;
      if(ob.tipo === 'oleo' && d < 1.05 && Math.abs(e.vel || 0) > 3){ R.obsOff[ob.id] = agora + 1500; if(rodou(R, 1000, .5)){ C.toast('Derrapou no óleo!', 1300); somFx('oleo'); } }
      else if(ob.tipo === 'cone' && d < .5){ R.obsOff[ob.id] = agora + 6000; R.caido[ob.id] = { t0: agora, ang: Math.atan2(ob.x - e.x, ob.z - e.z) }; e.vel = (e.vel || 0) * .7; somFx('cone'); }
      else if(ob.tipo === 'pneus' && d < .9){ R.obsOff[ob.id] = agora + 900; somFx('batida'); const dr = d + cg, nx = (e.x - ob.x) / (dr || 1), nz = (e.z - ob.z) / (dr || 1);
        /* v3.62: o carro raspa na pilha e sai pro lado da pista (de frente, ele voltava, acelerava e batia de novo, sem sair) */
        if(P.carro){ const t = c.T[si], lo = latDe(c, si, ob.x, ob.z), lado = lat >= lo ? 1 : -1, falta = .95 + cg - dr + .15; mover(e, -t[1] * lado * falta, t[0] * lado * falta); }
        else mover(e, nx * (.95 - d), nz * (.95 - d)); if(rodou(R, P.carro ? 600 : 800, P.carro ? .45 : -.2)) C.toast('Bateu nos pneus!', 1200); } });
    /* os rivais */
    passoRivais(dt, R, agora, agora >= R.larga);
    /* contramão */
    if(solto && !R.fim){ if(R.prog < R.progAnt - .02 && v > 2){ if(!R.contraDesde) R.contraDesde = agora; else if(agora - R.contraDesde > 1200 && agora - R.contraT > 3000){ R.contraT = agora; C.toast('Contramão!', 1100); somFx('contramao'); } } else R.contraDesde = 0; }
    R.progAnt = R.prog;
    /* as voltas */
    if(solto && !R.fim){ const feitas = Math.max(0, Math.floor(R.prog / c.tot)); if(feitas > R.lap){ R.lap = feitas; const tv = agora - (R.tv || R.larga); R.voltas.push(tv); R.tv = agora; if(R.lap >= VOLTAS) chegadaKart(); else { somFx(R.lap === VOLTAS - 1 ? 'ultima' : 'volta'); C.toast(R.lap === VOLTAS - 1 ? `Última volta! (${tempoTxt(tv)})` : `Volta ${R.lap + 1}/${VOLTAS} · ${tempoTxt(tv)}`, 1600); } } }
    /* a câmera: baixa e atrás, sobe junto no pulo */
    const cm = S.cam, f = Math.min(1, dt * 6), cAlt = P.carro ? 1.3 : 1, cDist = P.carro ? 6.4 : 4.7; cm.tx += (e.x - cm.tx) * f; cm.tz += (e.z - cm.tz) * f; cm.ty += (e.y * .6 + cAlt - cm.ty) * f;
    let dth = e.yaw + Math.PI + R.yawVis * .4 - cm.th; dth = Math.atan2(Math.sin(dth), Math.cos(dth)); cm.th += dth * Math.min(1, dt * 4);
    if(Date.now() - (S.arrastou || 0) > 3000){ cm.ph += (.3 - cm.ph) * Math.min(1, dt * 2); cm.dist += (cDist - cm.dist) * Math.min(1, dt * 2); }
    somKart(R, P, agora, { ac, boost, drift: R.drift, fora: fora && !R.pulo, costela: naCostela, agua: naAgua, ar: !!R.pulo });
  }
  function passoRivais(dt, R, agora, solto){
    const P = R.P, c = P.Kp.c, h = P.Kp.h, e = S.eu, N = c.N;
    R.rivais.forEach(r => {
      if(!solto) return;
      /* ao vivo, em quem não roda a máquina: o bicho segue o que chegou (e anda sozinho entre uma mensagem e outra) */
      /* v3.55: quem roda a máquina terminou, saiu ou escondeu a aba: depois de 3 s sem notícia cada aparelho pilota os bichos (antes eles paravam na pista) */
      if(r.remoto && !r.fim && agora - Math.max(R.cpuVisto, R.larga) > 3000) r.remoto = false;
      if(r.remoto){ if(agora - R.cpuVisto > 2500) r.v = 0; r.s += r.v * dt; r.s += (r.sAlvo - r.s) * Math.min(1, dt * 4); const p0 = naLinha(c, r.s, r.lat), dx = e.x - p0[0], dz = e.z - p0[1], dist = Math.hypot(dx, dz); if(dist < .62 && dist > .01 && !R.pulo){ mover(e, dx / dist * (.62 - dist), dz / dist * (.62 - dist)); e.vel = (e.vel || 0) * .93; } return; }
      const i = idxK(c, Math.floor(r.s / c.ds));
      /* a velocidade que a curva da frente deixa */
      let km = 0; for(let j = 2; j < 18; j++) km = Math.max(km, Math.abs(c.K[idxK(c, i + j)]));
      let alvo = Math.min(r.vmax, Math.sqrt(ALAT_K / Math.max(km, 1e-3)));
      const gap = r.s - R.prog; if(!r.fim){ if(gap > 28) alvo *= .92; else if(gap < -22) alvo *= 1.15; }
      if(r.boostAte > agora) alvo = r.vmax * 1.45;
      if(r.fim) alvo = 3;
      if((r.rodouAte || 0) > agora) alvo = 1.5;
      r.v += Math.max(-14 * dt, Math.min((alvo > r.v ? 6.5 : 14) * dt, alvo - r.v));
      r.s += r.v * dt;
      /* o lado: por dentro da curva que vem, com o jeito de cada um, e desviando de você */
      let kk = 0; for(let j = 6; j < 16; j++) kk += c.K[idxK(c, i + j)];
      r.latAlvo = Math.max(-h + .6, Math.min(h - .6, r.estilo + Math.sign(kk) * Math.min(1, Math.abs(kk) * 2) * 1.1));
      const p0 = naLinha(c, r.s, r.lat), dx = e.x - p0[0], dz = e.z - p0[1], dist = Math.hypot(dx, dz);
      if(dist < 3 && !R.fim){ const latEu = latDe(c, i, e.x, e.z); r.latAlvo = Math.max(-h + .5, Math.min(h - .5, r.latAlvo + (latEu > r.lat ? -1.3 : 1.3))); }
      r.lat += Math.max(-1.6 * dt, Math.min(1.6 * dt, r.latAlvo - r.lat));
      /* encostou em você: empurra os dois */
      if(dist < .62 && dist > .01 && !R.pulo){ const o = .62 - dist; mover(e, dx / dist * o, dz / dist * o); e.vel = (e.vel || 0) * .93; r.v *= .93; }
      /* turbo, rampa, disco, chiclete, perigo */
      P.Kp.turbos.forEach(tb => { if(perto(c, i, tb.i, 2) && Math.abs(r.lat - tb.lat) < .95 && r.boostAte < agora) r.boostAte = agora + 1000; });
      P.Kp.rampas.forEach(rp => { if(perto(c, i, rp.ib, 1) && agora - r.puloT > 1500){ r.puloT = agora; r.puloDur = 260 + r.v * 62; r.puloAlt = .45 + r.v * .085; } });
      P.Kp.discos.forEach(dc => { if((R.discOff[dc.id] || 0) > agora || !perto(c, i, dc.i, 1) || Math.abs(r.lat - dc.lat) > .8) return; R.discOff[dc.id] = agora + 3000; if(!r.item){ const q = Math.random(); r.item = q < .55 ? 'cafe' : q < .85 ? 'chiclete' : 'grave'; r.itemT = agora + 1000 + Math.random() * 3000; } });
      if(r.item && agora > r.itemT && !r.fim){
        const p = naLinha(c, r.s, r.lat);
        if(r.item === 'cafe') r.boostAte = agora + 1200;
        else if(r.item === 'chiclete'){ const q = naLinha(c, r.s - 1.3, r.lat); R.chic.push({ x: q[0], z: q[1], ate: agora + 30000, t0: agora }); if(R.vivo) mandaKart({ t: 'chic', id: R.vivo.id, x: Math.round(q[0] * 100) / 100, z: Math.round(q[1] * 100) / 100 }); }
        else if(r.item === 'grave'){ R.ondas.push({ x: p[0], z: p[1], t0: agora }); if(R.vivo) mandaKart({ t: 'grave', id: R.vivo.id, de: r.idx, x: Math.round(p[0] * 100) / 100, z: Math.round(p[1] * 100) / 100 }); const dg = Math.hypot(p[0] - e.x, p[1] - e.z); if(dg < 16) somFx('grave'); if(dg < 8 && !R.pulo && rodou(R, 850, .55)) C.toast(`O grave de ${r.nome} te pegou!`, 1500); }
        r.item = null;
      }
      if(!r.fantasma){ const p = naLinha(c, r.s, r.lat); for(let j = R.chic.length - 1; j >= 0; j--){ const g = R.chic[j]; if(agora - g.t0 > 600 && Math.hypot(g.x - p[0], g.z - p[1]) < .6){ R.chic.splice(j, 1); rodou(r, 1000, .3); } } }
      perigoAgora(P, agora).forEach(o => { const p = naLinha(c, r.s, r.lat); if(bateuPerigo(o, p[0], p[1], .25)) rodou(r, 1000, .2); });
      if(!r.fim && r.s >= VOLTAS * c.tot){ r.fim = agora; r.tempo = agora - R.larga; }
    });
    /* quem roda a máquina numa corrida ao vivo manda onde cada bicho dela tá, 5 vezes por segundo */
    if(R.vivo && R.vivo.roda && R.rivais.length && solto && agora - R.cpuT > 200){ R.cpuT = agora; mandaKart({ t: 'cpu', id: R.vivo.id, l: R.rivais.map(o => [o.idx, Math.round(o.s * 10), Math.round(o.lat * 100), Math.round(o.v * 10), (o.rodouAte || 0) > agora ? 1 : 0, o.fim ? Math.round(o.tempo) : 0]) }); }
  }
  function painelKart(forca){
    const el = C.$('cs-pesca'), P = pistaAqui(); if(!el || !P) return;
    el.hidden = false; const agora = Date.now(); if(!forca && agora - (S.painelT || 0) < 120) return; S.painelT = agora;
    const R = S.corrida && S.corrida.kart ? S.corrida : null, sempre = recCorrida()[P.rk + 'Rec'] || 0, toque = !!S.pad;
    let topo, dica, corpo;
    if(R && P.solo){
      /* v3.59: a moto, sozinha contra o relógio: a volta, o tempo e o placar do dia */
      const tempo = R.fim ? R.total : Math.max(0, agora - R.larga), lista = rankingCorrida(P), eu = lista.findIndex(x => x.eu), mostra = lista.slice(0, 3); if(eu > 2) mostra.push(lista[eu]);
      topo = agora < R.larga ? (agora < R.larga - 3000 ? 'Prepara…' : `Largada em ${Math.ceil((R.larga - agora) / 1000)}`) : R.fim ? `Chegou: ${tempoTxt(R.total)}` : `Volta ${Math.min(VOLTAS, R.lap + 1)}/${VOLTAS} · ${tempoTxt(tempo)}`;
      corpo = `<ol>${mostra.length ? mostra.map(x => `<li${x.eu ? ' class="eu"' : ''}><i>${lista.indexOf(x) + 1}º</i><span>${esc(x.nome)}</span><b>${tempoTxt(x.ms)}</b></li>`).join('') : '<li><i></i><span>Ninguém correu hoje ainda.</span><b></b></li>'}</ol>`;
      dica = agora < R.larga ? 'Segura o acelerador quando acender a segunda luz: largada perfeita.' : R.fim ? 'Volta pro paddock e larga de novo quando quiser.' : toque ? 'Na rampa, aperta Pular no ar: manobra e turbo. Desvia do óleo, dos cones e dos pneus.' : 'Na rampa, Espaço no ar: manobra e turbo. Espaço virando derrapa. Desvia do óleo, dos cones e dos pneus.';
    } else if(R){
      const ord = ordemKart(R), eu = ord.find(x => x.eu), tempo = R.fim ? R.total : Math.max(0, agora - R.larga);
      topo = agora < R.larga ? (agora < R.larga - 3000 ? 'Prepara…' : `Largada em ${Math.ceil((R.larga - agora) / 1000)}`) : R.fim ? `Chegou em ${eu.pos}º · ${tempoTxt(R.total)}` : `${eu.pos}º de 6 · Volta ${Math.min(VOLTAS, R.lap + 1)}/${VOLTAS} · ${tempoTxt(tempo)}`;
      const it = R.roleta ? ITENS_K[Object.keys(ITENS_K)[Math.floor(agora / 90) % 4]] : R.item ? ITENS_K[R.item] : null;
      corpo = `<div class="cs-kart-item${R.roleta ? ' gira' : ''}">${it ? `${ico(it.ico)}<b>${esc(it.nome)}${R.item && R.itemN > 1 ? ` x${R.itemN}` : ''}</b>` : '<span>sem item</span>'}</div><ol>${ord.map(x => `<li${x.eu ? ' class="eu"' : ''}><i>${x.pos}º</i><span>${esc(x.nome)}</span><b>${x.fim ? tempoTxt(x.tempo) : `volta ${x.volta}`}</b></li>`).join('')}</ol>`;
      dica = agora < R.larga ? 'Segura o acelerador quando acender a segunda luz: largada perfeita.' : R.fim ? 'Volta pro paddock e larga de novo quando quiser.' : toque ? 'Segura Pular virando: derrapa e solta o turbo. O botão amarelo usa o item.' : 'Espaço virando: derrapa e solta o turbo. Enter usa o item.';
    } else if(S.kartVivo && S.kartVivo.ate > agora && gente().some(r => r.kl === S.kartVivo.id)){
      /* assistindo: a corrida ao vivo dos outros, pelo que cada um manda */
      const V2 = S.kartVivo, tot = P.Kp.c.tot, nb = i => (bichoOk(i) ? BICHOS_K[i].nome : 'alguém');
      const ord = [...gente().filter(r => r.kl === V2.id).map(r => ({ nome: `${nb(r.kp)} · @${r.handle || 'alguém'}`, prog: (r.kg || 0) / 10, tempo: r.kfId === V2.id ? r.kfT || 0 : 0 })), ...(V2.rivais || []).map(o => ({ nome: `${o.nome} · máquina`, prog: o.s, tempo: o.tempo || 0 }))].sort((a, b) => (a.tempo && b.tempo) ? a.tempo - b.tempo : a.tempo ? -1 : b.tempo ? 1 : b.prog - a.prog);
      topo = 'Corrida ao vivo'; corpo = `<ol>${ord.map((x, i) => `<li><i>${i + 1}º</i><span>${esc(x.nome)}</span><b>${x.tempo ? tempoTxt(x.tempo) : `volta ${Math.min(VOLTAS, Math.max(1, Math.floor(x.prog / tot) + 1))}`}</b></li>`).join('')}</ol>`;
      dica = 'Você tá assistindo. Pra correr na próxima, escolhe um bicho no totem.';
    } else {
      topo = `${esc(P.nome)} · melhor do dia`; const lista = rankingCorrida(P), eu = lista.findIndex(x => x.eu), mostra = lista.slice(0, 3); if(eu > 2) mostra.push(lista[eu]);
      corpo = `<ol>${mostra.length ? mostra.map(x => `<li${x.eu ? ' class="eu"' : ''}><i>${lista.indexOf(x) + 1}º</i><span>${esc(x.nome)}</span><b>${tempoTxt(x.ms)}</b></li>`).join('') : '<li><i></i><span>Ninguém correu hoje ainda.</span><b></b></li>'}</ol>`;
      dica = autodromo() ? `Vai no totem da bandeira, escolhe moto ou carro e larga: 3 voltas contra o relógio. Esse placar é de ${esc(veicAuto().nome)}.` : P.solo ? 'Vai no totem da bandeira e toca em Largar: 3 voltas de moto contra o relógio.' : 'Vai no totem da bandeira, escolhe teu bicho e larga: sempre seis na pista.';
    }
    const html = `<b class="cs-pesca-t">${ico('raio')} ${topo}</b>${corpo}<small>${dica}${sempre ? ` Recorde: ${tempoTxt(sempre)}.` : ''}</small>`;
    el.classList.toggle('morde', !!(R && agora < R.larga)); el.classList.add('kart');
    if(el.dataset.h !== html){ el.dataset.h = html; el.innerHTML = html; }
  }
  /* v3.53 · as placas de propaganda (o desenho de cada uma vem do verso.js, onde moram as marcas parceiras) */
  function solidosPaineis(){
    if(!PL || !PL.paineis || !PL.paineis.length || !C.verso || !C.verso.publiImg) return [];
    if(!PL._ps) PL._ps = PL.paineis.map(p => painelSol(p.P4, p.led ? () => C.verso.publiImg(p.k, 0, 1024, 72, performance.now() / 16) : () => C.verso.publiImg(p.k, p.v || 0, 512, p.fino ? 128 : 256), INK, 'publi:' + p.k));
    return PL._ps;
  }
  /* entrou numa arena de parceiro (ou acabou a corrida nela): a faixa de propaganda passa embaixo por uns segundos */
  function bannerPubli(k){
    if(!S.el || !C.verso || !C.verso.publiImg || !C.verso.PUBLI[k]) return; let el = S.el.querySelector('.cs-banner');
    if(!el){ el = document.createElement('button'); el.type = 'button'; el.className = 'cs-banner'; el.dataset.act = 'cs-publi'; S.el.appendChild(el); }
    el.dataset.k = k; S.bannerN = (S.bannerN || 0) + 1; const img = C.verso.publiImg(k, S.bannerN, 1024, 256); el.innerHTML = '<small>Patrocínio</small>'; if(img){ const c2 = document.createElement('canvas'); c2.width = img.width; c2.height = img.height; c2.getContext('2d').drawImage(img, 0, 0); el.prepend(c2); }
    el.hidden = false; el.classList.remove('sai'); clearTimeout(S.bannerT); S.bannerT = setTimeout(() => { el.classList.add('sai'); S.bannerT = setTimeout(() => { el.hidden = true; }, 400); }, 5200);
  }
  /* o que aparece da corrida: os rivais, os discos, o chiclete, o perigo, o semáforo, faísca e fogo do turbo */
  function solidosKart(t){
    const R = S.corrida && S.corrida.kart ? S.corrida : null, P = pistaAqui(); if(!P || !P.kart) return [];
    const c = P.Kp.c, agora = Date.now(), out = [], e = S.eu;
    /* o semáforo na viga do pórtico */
    /* o semáforo: três luzes vermelhas acendem uma por uma; no "vai", as três ficam brancas-azuladas (verde não entra no Corre) */
    const fase = R ? (agora >= R.larga ? 4 : Math.max(0, 4 - Math.ceil((R.larga - agora) / 1000))) : 0;
    [-.7, 0, .7].forEach((l, j) => { const p = ptK(c, 0, l, 0), cor = fase >= 4 ? '#DDF1FF' : fase > j ? '#FF2E3A' : '#3A1416'; out.push(esfera(p[0], 3.05, p[1], .17, cor, null, {})); });
    /* os discos (o item): capa de disco girando, com o vinil saindo dela */
    P.Kp.discos.forEach(dc => { if(R && (R.discOff[dc.id] || 0) > agora) return; const y = .55 + Math.sin(t * 2.4 + dc.id) * .08, g = { yaw: t * 2 + dc.id, piv: [dc.x, y, dc.z] }, cor = [ROSA, AZUL, LARANJA, LILAS][dc.id % 4];
      out.push(solido(B(dc.x - .26, y - .26, dc.z - .025, .52, .52, .05, cor), [g], cor, null, {}), solido(B(dc.x - .1, y - .26, dc.z - .015, .46, .46, .03, INK), [g], INK, null, {}), solido(B(dc.x + .06, y - .06, dc.z - .02, .12, .12, .04, PAPEL), [g], PAPEL, null, { cru: true })); });
    if(R){
      R.chic.forEach(g => { out.push(solido(B(g.x - .3, 0, g.z - .25, .6, .04, .5, ROSA), null, ROSA, null, { cru: true, semTraco: true }), esfera(g.x + .05, .12, g.z, .12, '#FF8FC0', null, { alpha: .85 })); });
    }
    /* os bichos da máquina no patinete (correndo ou assistindo a corrida ao vivo) */
    const rivs = R ? R.rivais : (S.kartVivo && S.kartVivo.rivais) || [];
    {
      rivs.forEach((r, j) => { const p = naLinha(c, r.s, r.lat), giro = (r.rodouAte || 0) > agora ? (agora - r.rodouT0) / 1000 * 9 : 0, pu = r.puloT ? (agora - r.puloT) / (r.puloDur || 1) : 1, y = pu < 1 ? (r.puloAlt || .8) * 4 * pu * (1 - pu) : 0, yw = p[2] + giro;
        out.push(...veiculo3d('patinete', p[0], y, p[1], yw, r.cor, 'kart:' + j), ...sobe(boneco(r.av, p[0], p[1], yw, 0, false), y + VEIC_3D.patinete.alt));
        if(r.boostAte > agora) out.push(...fogo(p[0], y, p[1], yw, t)); });
    }
    if(R){
      /* você: fogo do turbo e faísca da derrapagem */
      if(e && R.boostAte > agora) out.push(...fogo(e.x, e.y || 0, e.z, e.yaw + R.yawVis, t));
      if(e && R.drift && R.drift.n){ const cor = R.drift.n === 2 ? ROSA : LARANJA, yw = e.yaw + R.yawVis; for(let k = 0; k < 4; k++){ const a = t * 30 + k * 1.7, sx = e.x - Math.sin(yw) * .55 + Math.cos(yw) * (k < 2 ? .14 : -.14) + Math.sin(a) * .08, sz = e.z - Math.cos(yw) * .55 - Math.sin(yw) * (k < 2 ? .14 : -.14) + Math.cos(a) * .08; out.push(esfera(sx, .06 + Math.abs(Math.sin(a * 1.3)) * .12, sz, .035 + (k % 2) * .02, cor, null, { semTraco: true, alpha: .95 })); } }
    }
    /* v3.59: os obstáculos de pé: o cone (derrubado fica deitado uns segundos) e a pilha de pneus */
    P.Kp.obst.forEach(ob => {
      if(ob.tipo === 'cone'){ const cd = R && R.caido[ob.id] && agora - R.caido[ob.id].t0 < 5500 ? R.caido[ob.id] : null, u = cd ? Math.min(1, (agora - cd.t0) / 250) : 0;
        const T = cd ? [{ pitch: u * 1.45, piv: [ob.x, 0, ob.z] }, { yaw: cd.ang, piv: [ob.x, 0, ob.z] }] : null;
        [B(ob.x - .2, 0, ob.z - .2, .4, .06, .4, '#1B1D22'), B(ob.x - .13, .06, ob.z - .13, .26, .18, .26, LARANJA), B(ob.x - .1, .24, ob.z - .1, .2, .1, .2, PAPEL), B(ob.x - .07, .34, ob.z - .07, .14, .14, .14, LARANJA)].forEach(b => out.push(solido(b, T, b.c, null, {})));
      } else if(ob.tipo === 'pneus'){ const g = [{ yaw: ob.yaw, piv: [ob.x, 0, ob.z] }];
        [[-.3, 0, 0], [.3, 0, 1], [0, .22, 2]].forEach(([dx, y, j]) => PNEUS(j).forEach(b => { const bb = Object.assign({}, b, { x: b.x + ob.x + dx, y: b.y + y, z: b.z + ob.z }); out.push(solido(bb, g, bb.c, null, {})); })); }
    });
    /* o perigo: capivaras, trator ou busão */
    perigoAgora(P, agora).forEach((o, j) => { out.push(...corpoPerigo(o, t, j)); });
    return out;
  }
  const fogo = (x, y, z, yw, t) => { const out = []; for(let k = 0; k < 3; k++){ const b = .55 + k * .16 + Math.abs(Math.sin(t * 40 + k)) * .1; out.push(esfera(x - Math.sin(yw) * b, y + .14, z - Math.cos(yw) * b, .1 - k * .025, k ? '#FF8A3D' : '#FFD37A', null, { semTraco: true, alpha: .9 - k * .2 })); } return out; };
  let CAPI_AV = null;
  function corpoPerigo(o, t, j){
    if(o.tipo === 'capivara'){ if(!CAPI_AV) CAPI_AV = C.verso.avLimpo({ personagem: 'capivara' }, 'capi-perigo'); return boneco(CAPI_AV, o.x, o.z, o.yaw, t * 6 + j, o.anda).map(s => Object.assign(s, { dono: null })); }
    const g = [{ yaw: o.yaw, piv: [o.x, 0, o.z] }], add = (b, cor, ex) => solido(Object.assign(b, { x: b.x + o.x, z: b.z + o.z }), g, cor || b.c, null, ex || {});
    if(o.tipo === 'trator') return [add(B(-.5, .45, -.9, 1, .7, 1.4, LARANJA)), add(B(-.42, 1.15, -.5, .84, .1, .7, LARANJA)), add(B(-.35, .9, -.3, .7, .35, .35, INK)), add(B(-.62, 0, -.95, .24, 1, 1, '#16181D')), add(B(.38, 0, -.95, .24, 1, 1, '#16181D')), add(B(-.55, 0, .35, .2, .55, .55, '#16181D')), add(B(.35, 0, .35, .2, .55, .55, '#16181D')), add(B(.2, 1.15, .3, .1, .6, .1, '#3A3E45')), add(B(-.3, 1.25, -.2, .6, .05, .5, ESTACA_K))];
    if(o.tipo === 'van') return [add(B(-.9, .3, -1.9, 1.8, 1.4, 3.8, '#F4F4F4')), add(B(-.91, .75, -1.9, 1.82, .3, 3.8, '#307FE2')), add(B(-.8, 1.25, 1.5, 1.6, .4, .32, '#BFE3FF'), null, { cru: true }), add(B(-.92, 1.2, -1.2, 1.84, .32, 2.2, '#BFE3FF'), null, { cru: true }), add(B(-.9, 1.7, -1.8, 1.8, .06, 3.4, '#307FE2')), ...[[-.95, -1.3], [.75, -1.3], [-.95, 1.0], [.75, 1.0]].map(([x, zz]) => add(B(x, 0, zz, .2, .5, .5, '#16181D')))];
    const BUS = '#2E5BFF';
    return [add(B(-1.05, .35, -2.7, 2.1, 1.7, 5.4, BUS)), add(B(-1.06, 1.15, -2.5, 2.12, .6, 4.6, '#BFE3FF'), null, { cru: true }), add(B(-1.07, .45, -2.7, 2.14, .14, 5.4, PAPEL)), add(B(-1.05, 2.05, -2.6, 2.1, .1, 5.2, PAPEL)), add(B(-.8, 1.4, 2.71, 1.6, .5, .02, '#BFE3FF'), null, { cru: true }), add(B(-.6, 1.95, 2.72, 1.2, .18, .02, INK)), ...[[-1.05, -1.9], [.85, -1.9], [-1.05, 1.7], [.85, 1.7]].map(([x, z]) => add(B(x, 0, z, .2, .6, .6, '#16181D')))];
  }
  const ESTACA_K = '#5A3A1E';
  /* as ondas do grave: anéis que abrem no chão */
  function ondasKart(ctx, cam){
    const R = S.corrida; if(!R || !R.kart || !R.ondas.length) return; const agora = Date.now(), k = 2 * (S.res || .5);
    R.ondas = R.ondas.filter(o => agora - o.t0 < 900);
    R.ondas.forEach(o => { const u = (agora - o.t0) / 900; [1, .6].forEach(f => { ctx.beginPath(); let ok = false; for(let i = 0; i <= 28; i++){ const a = i / 28 * Math.PI * 2, q = proj(cam, [o.x + Math.cos(a) * 8 * u * f, .05, o.z + Math.sin(a) * 8 * u * f]); if(!q){ ok = false; continue; } if(ok) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); ok = true; } ctx.strokeStyle = `rgba(255,79,154,${.8 * (1 - u)})`; ctx.lineWidth = Math.max(1, 3 * k * (1 - u)); ctx.stroke(); }); });
  }
  /* ---------- v3.53 · a corrida ao vivo ----------
     O Thales: "os 6 personagens escolhidos por pessoas reais pra rolar a corrida numa live, RP". Cada um escolhe o bicho
     no totem (o escolhido vai na presença: m.kp, e a hora em m.kpt pra desempatar quem pegou primeiro). Quem dá a
     largada manda um evento "kart" pra sala com a lista de quem tá com bicho; cada aparelho conta a largada a partir de
     quando recebeu (o relógio de cada um é diferente). Na corrida, cada um manda quanto andou (m.kg, em decímetros) no
     movimento; a chegada vai como evento com o tempo de cada um, e a ordem final é pelo tempo. Chiclete e grave viajam
     como evento e cada um confere em si mesmo. Quem não pegou bicho assiste com o placar ao vivo */
  const tomadoPor = i => gente().filter(r => r.kp === i).sort((a, b) => (a.kpt || 0) - (b.kpt || 0) || (a.sid < b.sid ? -1 : 1))[0] || null;
  function escolheBicho(i){
    if(!bichoOk(i)) return; const r = tomadoPor(i); if(r){ C.toast(`${BICHOS_K[i].nome} já é de @${r.handle || 'alguém'}.`, 2000); return; }
    S.kartBicho = i; S.kartBichoT = Math.floor(Date.now() / 1000) % 1e8; try{ localStorage.setItem('corre-kart-bicho', String(i)); }catch(e){}
    if(C.verso && C.verso.anunciar) C.verso.anunciar();
  }
  /* dois pegaram o mesmo bicho ao mesmo tempo: fica com quem pegou primeiro (e, empatado, a ordem do código) */
  function confereBicho(){
    if(!bichoOk(S.kartBicho) || S.corrida) return; const meu = S.kartBichoT || 0;
    const r = gente().find(o => o.kp === S.kartBicho && ((o.kpt || 0) < meu || ((o.kpt || 0) === meu && o.sid < C.verso.meuSid())));
    if(r){ C.toast(`${BICHOS_K[S.kartBicho].nome} ficou com @${r.handle || 'alguém'}. Escolhe outro no totem.`, 2600); S.kartBicho = null; if(C.verso.anunciar) C.verso.anunciar(); }
  }
  const mandaKart = d => { if(C.verso && C.verso.kartManda) C.verso.kartManda(d); };
  function svgBicho(i){
    const k = BICHOS_K[i].k, r = (x, y, w, h, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`, olhos = (y, c) => r(15, y, 6, 6, PAPEL) + r(17, y + 2, 3, 3, c || INK) + r(27, y, 6, 6, PAPEL) + r(29, y + 2, 3, 3, c || INK);
    const D = {
      capivolt: r(22, 0, 5, 5, '#FF8A3D') + r(19, 4, 5, 5, '#FF8A3D') + r(23, 8, 5, 4, '#FF8A3D') + r(8, 12, 32, 28, '#8E6B45') + r(8, 14, 32, 4, INK) + r(12, 13, 10, 6, '#38E1FF') + r(26, 13, 10, 6, '#38E1FF') + olhos(21) + r(14, 29, 20, 11, '#B49472') + r(20, 37, 3, 3, PAPEL) + r(25, 37, 3, 3, PAPEL),
      bumbo: r(9, 6, 8, 8, '#5A3A1E') + r(31, 6, 8, 8, '#5A3A1E') + r(7, 8, 34, 6, ROSA) + r(8, 12, 32, 28, '#7A4E2A') + olhos(19) + r(16, 28, 16, 10, '#C9A27A') + r(21, 29, 6, 4, INK) + r(12, 40, 24, 3, OURO),
      bicudo: r(20, 2, 4, 9, ROSA) + r(10, 10, 24, 28, INK) + r(12, 18, 8, 8, '#38E1FF') + r(14, 20, 4, 4, INK) + r(22, 22, 26, 10, '#FF8A3D') + r(44, 22, 4, 10, '#E2412E') + r(22, 26, 24, 1, INK),
      tatubala: r(6, 10, 36, 6, '#6E5C4A') + r(4, 16, 40, 6, '#8F7A64') + r(4, 22, 40, 6, '#6E5C4A') + r(15, 4, 3, 9, '#B39A7C') + r(30, 4, 3, 9, '#B39A7C') + r(12, 26, 24, 14, '#B39A7C') + olhos(28) + r(21, 36, 6, 6, '#B39A7C') + r(22, 40, 4, 2, INK),
      canelinha: r(9, 0, 6, 14, '#A44E1E') + r(33, 0, 6, 14, '#A44E1E') + r(10, 3, 3, 9, '#FFB3D1') + r(35, 3, 3, 9, '#FFB3D1') + r(9, 12, 30, 24, '#C8642A') + olhos(18) + r(18, 28, 12, 10, '#C8642A') + r(21, 35, 6, 3, INK) + r(16, 38, 16, 3, PAPEL),
      soneca: r(12, 0, 24, 6, ROSA) + r(8, 6, 32, 6, PAPEL) + r(36, 2, 8, 8, PAPEL) + r(8, 12, 32, 28, '#9A8A78') + r(11, 16, 26, 22, '#E8DCC8') + r(13, 20, 9, 5, '#4A3E34') + r(26, 20, 9, 5, '#4A3E34') + r(14, 23, 7, 1, INK) + r(27, 23, 7, 1, INK) + r(20, 30, 8, 6, '#3A1E1E')
    };
    return `<svg viewBox="0 0 48 44" aria-hidden="true">${D[k] || ''}</svg>`;
  }
  function bichoSheet(){
    const P = pistaAqui(); if(!P || !P.kart || P.solo) return;
    const outros = gente().filter(r => bichoOk(r.kp)), meu = S.kartBicho, vivos = outros.filter(r => r.kp !== meu);
    C.sheet(`<div class="form cs-bichos"><div class="sheet-head"><h2>${ico('raio')} Escolhe teu bicho</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p class="note">Seis bichos fixos, sempre seis na largada. Cada pessoa da pista pega um (dá pra fazer corrida ao vivo, numa live); quem sobrar, a máquina pilota.</p>
      <div class="cs-bichos-l">${BICHOS_K.map((b, i) => { const r = tomadoPor(i), meuB = meu === i && !r; return `<button type="button" class="cs-bicho${meuB ? ' on' : ''}${r ? ' tomado' : ''}" data-act="cs-bicho" data-i="${i}"${r ? ' disabled' : ''} style="--c:${b.cor}">${svgBicho(i)}<b>${esc(b.nome)}</b><small>${meuB ? 'você' : r ? '@' + esc(r.handle || 'alguém') : 'livre'}</small><em>${esc(b.sobre)}</em></button>`; }).join('')}</div>
      <div class="acts">${vivos.length ? `<button type="button" class="btn primary" data-act="cs-larga" data-k="vivo"${bichoOk(meu) ? '' : ' disabled'}>${ico('raio')} Largar ao vivo (${vivos.length + 1} na pista)</button>` : ''}<button type="button" class="btn${vivos.length ? '' : ' primary'}" data-act="cs-larga" data-k="solo"${bichoOk(meu) ? '' : ' disabled'}>${ico('raio')} ${vivos.length ? 'Só eu contra a máquina' : 'Largar contra a máquina'}</button></div>
      ${bichoOk(meu) ? '' : '<p class="note">Escolhe um bicho pra largar.</p>'}</div>`);
  }
  function larga(modo){
    const P = pistaAqui(); if(!P || !P.kart || S.corrida || !bichoOk(S.kartBicho)) return; C.closeSheet();
    if(modo === 'vivo'){
      const vistos = new Set([S.kartBicho]), outros = gente().filter(r => bichoOk(r.kp) && !vistos.has(r.kp) && vistos.add(r.kp)).slice(0, 5), quem = [C.verso.meuSid(), ...outros.map(r => r.sid)], bichos = [S.kartBicho, ...outros.map(r => r.kp)], id = Math.floor(Math.random() * 1e9);
      mandaKart({ t: 'larga', id, em: 5000, quem, bichos }); S.kartVivo = { id, quem, ate: Date.now() + 6 * 60e3 };
      largarKart(P, { id, quem, bichos, em: 5000 }); C.toast(quem.length < 6 ? `Corrida ao vivo: ${quem.length} de gente e ${6 - quem.length} da máquina!` : 'Corrida ao vivo com seis!', 2200);
    } else largarKart(P, null);
  }
  /* o que chega dos outros da pista (o verso.js já conferiu o formato e que é da mesma sala) */
  function kartEvento(d, r){
    if(!S.aberta || !comBicho()) return; const agora = Date.now(), R = S.corrida;
    if(d.t === 'larga'){
      S.kartVivo = { id: d.id, quem: d.quem, bichos: d.bichos, ate: agora + 6 * 60e3, rivais: [], visto: agora };
      if(d.quem.includes(C.verso.meuSid()) && bichoOk(S.kartBicho) && !R){ C.closeSheet(); largarKart(pistaAqui(), { id: d.id, quem: d.quem, bichos: d.bichos, em: Math.max(1500, d.em - 150) }); C.toast(`Corrida ao vivo! @${(r && r.handle) || 'alguém'} deu a largada.`, 2400); }
      else if(!R) C.toast('Corrida ao vivo começando: assiste daqui.', 2400);
      return;
    }
    if(d.t === 'fim'){ if(r){ r.kfT = d.ms; r.kfId = d.id; } return; }
    /* quem assiste também vê os bichos da máquina */
    const KV = S.kartVivo; if(d.t === 'cpu' && !R && KV && KV.id === d.id && r && r.sid === KV.quem[0]){ KV.visto = agora;
      d.l.forEach(([j, sdm, lcm, vdm, rodou2, fimMs]) => { let o = KV.rivais.find(x => x.idx === j); if(!o){ const b = BICHOS_K[j]; o = Object.assign({}, b, { idx: j, av: avBicho(j), s: sdm / 10 }); KV.rivais.push(o); } o.sAlvo = sdm / 10; o.lat = lcm / 100; o.v = vdm / 10; if(rodou2 && !(o.rodouAte > agora)){ o.rodouAte = agora + 900; o.rodouT0 = agora; } if(fimMs){ o.fim = o.fim || agora; o.tempo = fimMs; } }); return; }
    if(!R || !R.vivo || R.vivo.id !== d.id) return;
    if(d.t === 'cpu'){ if(!r || r.sid !== R.vivo.host || R.vivo.roda) return; R.cpuVisto = agora;
      d.l.forEach(([j, sdm, lcm, vdm, rodou2, fimMs]) => { const o = R.rivais.find(x => x.idx === j); if(!o) return; o.remoto = true; o.sAlvo = sdm / 10; o.lat = lcm / 100; o.v = vdm / 10; if(rodou2 && !(o.rodouAte > agora)){ o.rodouAte = agora + 900; o.rodouT0 = agora; } if(fimMs && !o.fim){ o.fim = agora; o.tempo = fimMs; } }); return; }
    if(d.t === 'chic') R.chic.push({ x: d.x, z: d.z, ate: agora + 30000, t0: agora });
    else if(d.t === 'grave'){ R.ondas.push({ x: d.x, z: d.z, t0: agora }); if(R.vivo.roda) R.rivais.forEach(o => { const p = naLinha(R.P.Kp.c, o.s, o.lat); if(Math.hypot(p[0] - d.x, p[1] - d.z) < 8) rodou(o, 1100, .45); }); if(!R.pulo && S.eu && Math.hypot(d.x - S.eu.x, d.z - S.eu.z) < 8 && rodou(R, 850, .55)) C.toast(`O grave de ${bichoOk(d.de) ? BICHOS_K[d.de].nome : r && bichoOk(r.kp) ? BICHOS_K[r.kp].nome : 'alguém'} te pegou!`, 1500); }
  }
  /* quem assiste: a câmera segue um corredor (o botão grande troca de um pro outro) */
  function corredoresVivo(){
    const KV = S.kartVivo, P = pistaAqui(); if(!KV || KV.ate < Date.now() || !P || !P.kart || S.corrida) return [];
    const c = P.Kp.c, nb = i => (bichoOk(i) ? BICHOS_K[i].nome : 'alguém'), out = [];
    gente().forEach(r => { if(r.kl === KV.id && r.hxv != null) out.push({ nome: nb(r.kp), x: r.hxv, z: r.hzv, yaw: r.hyaw || 0, prog: (r.kg || 0) / 10 }); });
    (KV.rivais || []).forEach(o => { const p = naLinha(c, o.s, o.lat); out.push({ nome: o.nome, x: p[0], z: p[1], yaw: p[2], prog: o.s }); });
    return out.sort((a, b) => b.prog - a.prog);
  }
  function camSegue(dt){
    const L = corredoresVivo(); if(!L.length){ S.segue = null; return; } const o = L[Math.min(L.length - 1, S.segue || 0)], c = S.cam, f = Math.min(1, dt * 4);
    c.tx += (o.x - c.tx) * f; c.tz += (o.z - c.tz) * f; c.ty += (1 - c.ty) * f; let d = o.yaw + Math.PI - c.th; d = Math.atan2(Math.sin(d), Math.cos(d)); c.th += d * Math.min(1, dt * 2.5); c.ph += (.42 - c.ph) * f; c.dist += (6 - c.dist) * f;
  }
  /* a escolha da pista (a placa de largada do patinete, na cidade) */
  const KART_LISTA = ['patinete', 'patinete-cafe', 'patinete-noite', 'patinete-jet'];
  function svgPista(P){
    const c = P.Kp.c, W = P.def.W, D = P.def.D, d = c.P.filter((_, i) => i % 3 === 0).map((q, i) => `${i ? 'L' : 'M'}${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(' ') + 'Z';
    return `<svg viewBox="-2 -2 ${W + 4} ${D + 4}" aria-hidden="true"><rect x="-2" y="-2" width="${W + 4}" height="${D + 4}" rx="4" fill="${P.def.fora}"/><path d="${d}" fill="none" stroke="${P.def.cor}" stroke-width="${P.def.larg}" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${P.def.zebra[0]}" stroke-width=".7" stroke-dasharray="2 2"/><circle cx="${c.P[0][0]}" cy="${c.P[0][1]}" r="2.2" fill="${INK}"/></svg>`;
  }
  function escolhePista(){
    const rec = recCorrida();
    C.sheet(`<div class="form cs-pistas"><div class="sheet-head"><h2>${ico('raio')} Corrida de patinete</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p class="note">Quatro pistas, 3 voltas, sempre seis na largada: Capivolt, Bumbo, Bicudo, Tatubala, Canelinha e Soneca. Com gente na pista, cada um pega um bicho; o resto, a máquina pilota. Seta de turbo, rampa, derrapagem e disco de item.</p>
      <div class="cs-pistas-l">${KART_LISTA.map(k => { const P = LUGARES[k].corrida; return `<button type="button" class="cs-pista" data-act="cs-pista" data-k="${k}">${svgPista(P)}<b>${esc(P.nome)}</b><small>${esc(P.sub)}</small><em>${Math.round(P.Kp.c.tot)} m por volta${rec[P.rk + 'Rec'] ? ` · recorde ${tempoTxt(rec[P.rk + 'Rec'])}` : ''}</em></button>`; }).join('')}</div></div>`);
  }

  /* ---------- v3.49 · a pesca do Torneio do Igapó ----------
     No balde, o boneco vai pra beira e joga a linha. Uma hora a boia afunda: o botão vira "Puxar!" e você tem 1,2 s.
     Puxou antes, o peixe se assusta; demorou, escapa. A rodada é de 3 minutos e é a mesma pra todo mundo (pelo
     relógio): soma o peso do que você tirou, e o placar mostra quem tá no píer (o peso vai na presença, em
     centésimos de kg). Não vale correal (correal só sai de tarefa); o recorde fica no aparelho */
  const RODADA_MS = 180000, rodadaAgora = () => Math.floor(Date.now() / RODADA_MS);
  /* v3.53: a piapara (prateada, comum nos rios do Paraná) e a pirarara (o bagre grande do rabo vermelho, rara) */
  const PEIXES = [['lambari', 50, .05, .2, 'um'], ['tilápia', 24, .4, 1.6, 'uma'], ['piapara', 8, .4, 2.5, 'uma'], ['traíra', 9, .8, 2.6, 'uma'], ['pacu', 6, 1.5, 4.2, 'um'], ['carpa', 4, 2, 6, 'uma'], ['dourado', 1.5, 3, 8.5, 'um'], ['pirarara', 1, 4, 18, 'uma'], ['bota velha', .5, 0, 0, 'uma']];
  const sorteiaPeixe = () => { let v = Math.random() * PEIXES.reduce((a, p) => a + p[1], 0); for(const p of PEIXES){ if(v < p[1]) return { nome: p[0], art: p[4], kg: Math.round((p[2] + Math.random() * (p[3] - p[2])) * 100) / 100 }; v -= p[1]; } return { nome: 'lambari', art: 'um', kg: .1 }; };
  const kgTxt = kg => (Math.round(kg * 100) / 100).toFixed(2).replace('.', ',') + ' kg';
  const recPesca = () => { try{ const o = JSON.parse(localStorage.getItem('corre-pesca') || '{}'); return o && typeof o === 'object' ? o : {}; }catch(e){ return {}; } };
  const guardaRec = o => { try{ localStorage.setItem('corre-pesca', JSON.stringify(o)); }catch(e){} };
  function rankingPesca(r){
    const out = [{ nome: 'você', kg: S.placar && S.placar.r === r ? S.placar.kg : 0, eu: true }];
    gente().forEach(g => { if(g.pr === r % 1e6 && g.pk > 0) out.push({ nome: '@' + (g.handle || 'alguém'), kg: g.pk / 100 }); });
    return out.sort((a, b) => b.kg - a.kg || (a.eu ? -1 : 1));
  }
  function fechaRodada(){
    const P = S.placar, r = rodadaAgora();
    if(P && P.r !== r && P.kg > 0){
      const lista = rankingPesca(P.r), pos = lista.findIndex(x => x.eu) + 1, rec = recPesca(), bateu = !rec.rodada || P.kg > rec.rodada;
      if(bateu){ rec.rodada = P.kg; guardaRec(rec); }
      C.toast(`Fim da rodada: ${kgTxt(P.kg)} em ${P.n} ${P.n === 1 ? 'peixe' : 'peixes'}${lista.length > 1 ? `, ${pos}º lugar no píer` : ''}${bateu ? '. Teu recorde!' : '.'}`, 4600);
    }
    S.placar = { r, kg: 0, n: 0 };
  }
  function comecaPesca(sp){
    if(S.lugar !== 'pesca' || !S.eu || !sp) return;
    if(!S.placar || S.placar.r !== rodadaAgora()) fechaRodada();
    const e = S.eu; e.x = sp.x; e.z = sp.z; e.yaw = sp.yaw; e.andando = false; S.alvo = null; S.rota = []; S.acao = null; S.teclas.clear();
    /* a câmera de três quartos, pra ver a vara e a boia (bem de trás, o boneco tapa as duas) */
    S.cam.th = sp.yaw + Math.PI + .7; S.arrastou = Date.now();
    S.pesca = { sp, fase: 'espera', ate: Date.now() + 2200 + Math.random() * 3500 };
    painelPesca(true);
  }
  function paraPesca(){ if(!S.pesca) return; S.pesca = null; painelPesca(true); }
  function puxa(){
    const P = S.pesca; if(!P) return; const agora = Date.now();
    if(P.fase !== 'morde'){ P.ate = Math.max(P.ate, agora) + 1500; C.toast('Cedo demais: o peixe se assustou.', 1600); return; }
    if(!S.placar || S.placar.r !== rodadaAgora()) fechaRodada();
    const p = sorteiaPeixe(), rec = recPesca();
    S.placar.kg = Math.round((S.placar.kg + p.kg) * 100) / 100; S.placar.n++;
    const maior = p.kg > 0 && (!rec.maior || p.kg > rec.maior.kg); if(maior){ rec.maior = { nome: p.nome, kg: p.kg }; guardaRec(rec); }
    C.toast(p.kg ? `Pegou ${p.art} ${p.nome} de ${kgTxt(p.kg)}!${maior && rec.maior && S.placar.n > 1 ? ' O maior que você já tirou.' : ''}` : 'Pegou uma bota velha. Vale 0 kg, mas rende história.', 2800);
    P.fase = 'espera'; P.ate = agora + 2400 + Math.random() * 4200; P.pegou = agora;
    /* v3.52: o peixe pula da água na ponta da linha e fica um tempinho pendurado na tua frente */
    P.salto = { t0: agora, p, th: S.cam.th };
    /* o peso vai no "track" da presença (o anunciar), não no movimento: assim o placar de quem tá no píer atualiza */
    if(C.verso && C.verso.anunciar) C.verso.anunciar();
    painelPesca(true);
  }
  function tickPesca(){
    if(S.lugar !== 'pesca') return;
    const P = S.pesca, agora = Date.now(), e = S.eu;
    if(P){
      if(!e || S.alvo || S.teclas.size || Math.hypot(e.x - P.sp.x, e.z - P.sp.z) > .5) paraPesca();
      else if(P.fase === 'espera' && agora > P.ate){ P.fase = 'morde'; P.ate = agora + 1200; try{ if(navigator.vibrate) navigator.vibrate(60); }catch(_){} painelPesca(true); }
      else if(P.fase === 'morde' && agora > P.ate){ P.fase = 'espera'; P.ate = agora + 2600 + Math.random() * 3800; C.toast('Escapou…', 1200); painelPesca(true); }
    }
    painelPesca();
  }
  function painelPesca(forca){
    const el = C.$('cs-pesca'); if(!el) return;
    const on = S.lugar === 'pesca'; el.hidden = !on; if(!on) return;
    const agora = Date.now(); if(!forca && agora - (S.painelT || 0) < 250) return; S.painelT = agora;
    if(!S.placar || S.placar.r !== rodadaAgora()) fechaRodada();
    const resta = RODADA_MS - (agora % RODADA_MS), mm = Math.floor(resta / 60000), ss = Math.floor(resta / 1000) % 60, rec = recPesca(), P = S.pesca;
    const lista = rankingPesca(S.placar.r), eu = lista.findIndex(x => x.eu), mostra = lista.slice(0, 3); if(eu > 2) mostra.push(lista[eu]);
    const html = `<b class="cs-pesca-t">${ico('peixe')} Rodada · ${mm}:${String(ss).padStart(2, '0')}</b><ol>${mostra.map(x => `<li${x.eu ? ' class="eu"' : ''}><i>${lista.indexOf(x) + 1}º</i><span>${esc(x.nome)}</span><b>${kgTxt(x.kg)}</b></li>`).join('')}</ol>`
      + `<small>${P ? (P.fase === 'morde' ? 'A boia afundou: puxa!' : 'Esperando a boia afundar…') : 'Vai num balde da beira e toca pra pescar.'}${rec.rodada ? ` Recorde: ${kgTxt(rec.rodada)}.` : ''}</small>`;
    el.classList.toggle('morde', !!(P && P.fase === 'morde'));
    if(el.dataset.h !== html){ el.dataset.h = html; el.innerHTML = html; }
  }
  /* a vara (uma caixa inclinada saindo da mão) e a boia, que balança e afunda quando o peixe morde */
  /* v3.52 · o peixe de cada espécie (corpo, barriga, nadadeira e rabo) e a bota velha */
  const COR_PEIXE = { lambari: ['#C9CDD3', PAPEL, '#8F96A0', '#E2412E'], 'tilápia': ['#8A8F9C', '#D7D2CC', '#6E5A6E', '#6E5A6E'], 'traíra': ['#5A4632', '#A08060', '#3E2F22', '#3E2F22'],
    pacu: ['#5F6470', '#E8643A', '#3A3E45', '#3A3E45'], piapara: ['#B8B2A0', '#E8E4DA', '#8F8A78', '#8F8A78'], pirarara: ['#3A3E45', '#F2E3C0', '#2B2F38', '#E2412E'], carpa: ['#D98E3A', '#F2D3A0', '#B5652A', '#B5652A'], dourado: ['#E8902A', '#F2C47A', '#C2601E', '#C2601E'] };
  const SALTO_SOBE = 850, SALTO_MOSTRA = 1600;
  /* o comprimento do peixe na tela (exagerado de propósito: lambari de 80 g tem que dar pra ver) */
  const tamPeixe = p => (p.kg ? .26 + .3 * Math.cbrt(p.kg) : .3);
  function peixe3d(p, c, T){
    if(!p.kg){ /* a bota velha, pingando */
      const M = '#6B4A2E';
      return [B(c[0] - .08, c[1] - .12, c[2] - .07, .16, .32, .14, M), B(c[0] - .08, c[1] - .2, c[2] - .07, .16, .1, .3, M), B(c[0] - .085, c[1] - .23, c[2] - .075, .17, .03, .31, INK), B(c[0] - .085, c[1] + .16, c[2] - .075, .17, .04, .15, '#4A3220'),
        B(c[0] - .02, c[1] - .05, c[2] + .07, .04, .14, .01, PAPEL)].map(b => solido(b, T, b.c, 'eu', {}));
    }
    const L = tamPeixe(p), w = L * .22, h = L * .32, [cor, bar, nad, rabo] = COR_PEIXE[p.nome] || COR_PEIXE.lambari, [x, y, z] = c;
    return [B(x - w / 2, y - h / 2, z - L * .35, w, h, L * .7, cor), B(x - w * .45, y - h / 2, z - L * .3, w * .9, h * .28, L * .6, bar), B(x - w * .4, y - h * .4, z + L * .35, w * .8, h * .8, L * .15, cor),
      B(x - w * .12, y - h * .75, z - L * .52, w * .24, h * 1.5, L * .16, rabo), B(x - w * .08, y + h / 2, z - L * .18, w * .16, h * .35, L * .32, nad),
      B(x - w * .43, y + h * .08, z + L * .38, .006, h * .2, h * .2, INK), B(x + w * .43 - .006, y + h * .08, z + L * .38, .006, h * .2, h * .2, INK)].map(b => solido(b, T, b.c, 'eu', {}));
  }
  function solidosPesca(t){
    const P = S.pesca, e = S.eu; if(!P || !e) return [];
    const s = P.sp.yaw, fx = Math.sin(s), fz = Math.cos(s), hx = e.x + fx * .3, hz = e.z + fz * .3, hy = .95, ang = .55, L = 1.75, agora = Date.now();
    const bx = e.x + fx * 2.3, bz = e.z + fz * 2.3, by = P.fase === 'morde' ? -.06 + Math.abs(Math.sin(t * 24)) * .05 : .02 + Math.sin(t * 2.4) * .02;
    P.tip = [hx + fx * L * Math.cos(ang), hy + L * Math.sin(ang), hz + fz * L * Math.cos(ang)]; P.agua = [bx, bz];
    const out = [solido({ x: hx, y: hy - .02, z: hz - .02, w: L, h: .04, d: .04, c: ESTACA, roll: ang, yaw: s - Math.PI / 2, piv: [hx, hy, hz] }, null, ESTACA, null, { semTraco: true })];
    const SA = P.salto, u = SA ? agora - SA.t0 : 0;
    if(SA && u > SALTO_SOBE + SALTO_MOSTRA){ P.salto = null; P.peixeC = null; }
    if(P.salto){
      /* sai da água em arco até a tua frente, de nariz pra cima, se debatendo; depois você ergue ele de lado pra
         câmera (feito foto de pescaria), e ele ainda dá umas rabanadas */
      const f = Math.min(1, u / SALTO_SOBE), ef = 1 - (1 - f) * (1 - f), de = [bx, -.1, bz], ate = [e.x + fx * .4 + Math.sin(SA.th) * .9, 1.55, e.z + fz * .4 + Math.cos(SA.th) * .9];
      const c = [de[0] + (ate[0] - de[0]) * ef, de[1] + (ate[1] - de[1]) * ef + 4 * ef * (1 - ef) * 1.3, de[2] + (ate[2] - de[2]) * ef];
      const vira = f < 1 ? 0 : Math.min(1, (u - SALTO_SOBE) / 350), Lp = tamPeixe(SA.p);
      const bate = Math.sin(t * (f < 1 ? 26 : 16)) * (f < 1 ? .55 : .3 * Math.max(.25, 1 - (u - SALTO_SOBE) / SALTO_MOSTRA));
      const pit = -Math.PI / 2 + (1 - f) * .5 + vira * (Math.PI / 2 - .3), yw = f < 1 ? s + Math.PI / 2 : SA.th + Math.PI / 2;
      const T = [{ yaw: bate, piv: c }, { pitch: pit, piv: c }, { yaw: yw, piv: c }];
      out.push(...peixe3d(SA.p, c, T));
      /* a linha vai na boca do peixe */
      P.boia = [c[0] + Lp * .5 * Math.cos(pit) * Math.sin(yw), c[1] - Lp * .5 * Math.sin(pit), c[2] + Lp * .5 * Math.cos(pit) * Math.cos(yw)]; P.peixeC = c;
      /* os respingos: gotas que saem do furo na água e caem */
      const tt = u / 1000; if(tt < .9) for(let i = 0; i < 12; i++){ const a = i / 12 * Math.PI * 2 + i, v = 1.1 + (i % 3) * .5, vy = 2.4 + (i % 4) * .5, gy = vy * tt - 4.9 * tt * tt; if(gy < -.05) continue;
        out.push(esfera(bx + Math.cos(a) * v * tt * .7, gy, bz + Math.sin(a) * v * tt * .7, .035 + (i % 2) * .015, '#CFE6FF', null, { alpha: .85 - tt * .6, semTraco: true })); }
      if(!SA.p.kg && f >= 1) for(let i = 0; i < 2; i++){ const k = ((t * 1.6 + i * .5) % 1); out.push(esfera(c[0] + (i ? .05 : -.04), c[1] - .25 - k * .6, c[2], .02, '#CFE6FF', null, { alpha: .8 - k * .6, semTraco: true })); }
    } else {
      /* a boia: bola de verdade, vermelha em cima e branca embaixo, com a anteninha */
      P.boia = [bx, by + .34, bz];
      out.push(esfera(bx, by + .1, bz, .11, ROSA, null, { desenho: 'boia' }), solido({ x: bx - .015, y: by + .2, z: bz - .015, w: .03, h: .14, d: .03, c: INK }, null, INK, null, { semTraco: true }));
    }
    return out;
  }
  /* a linha: um traço fino da ponta da vara até a boia, por cima de tudo */
  function linhaPesca(ctx, cam){
    const P = S.pesca; if(!P || !P.tip || !P.boia) return;
    const a = proj(cam, P.tip), b = proj(cam, P.boia); if(!a || !b) return;
    const k = 2 * (S.res || .5);
    /* v3.52: as ondinhas na água (no tranco da boia e no pulo do peixe) */
    const onda = (r, al) => { if(!P.agua || al <= 0) return; ctx.beginPath(); let ok = false; for(let i = 0; i <= 24; i++){ const a = i / 24 * Math.PI * 2, q = proj(cam, [P.agua[0] + Math.cos(a) * r, .01, P.agua[1] + Math.sin(a) * r]); if(!q){ ok = false; continue; } if(ok) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); ok = true; } ctx.strokeStyle = `rgba(220,236,255,${al})`; ctx.lineWidth = Math.max(1, k); ctx.stroke(); };
    const u = P.salto ? Date.now() - P.salto.t0 : -1;
    if(u >= 0 && u < 1400){ onda(.15 + u / 1000 * 1.2, .7 * (1 - u / 1400)); onda(.1 + u / 1000 * .7, .5 * (1 - u / 1400)); }
    else if(P.fase === 'morde'){ const m = (Date.now() / 450) % 1; onda(.14 + m * .4, .6 * (1 - m)); }
    ctx.save(); ctx.strokeStyle = 'rgba(244,239,230,.85)'; ctx.lineWidth = Math.max(1, .75 * k); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo((a[0] + b[0]) / 2, Math.max(a[1], b[1]) + 6 * k, b[0], b[1]); ctx.stroke(); ctx.restore();
  }
  /* ---------- v3.48 · o Sebo: os discos da cidade ----------
     Cada disco é um beat original, tocado na hora. "Ouvir" toca ali mesmo, só pra você; "Levar pra casa" põe o disco no
     toca-discos da tua casa (fica no perfil, verso.discos) e "Na tua casa" devolve. De graça: disco não custa correal */
  const linhaSebo = (d, tem) => { const on = S.ouvindo === d.k;
    return `<div class="cs-sebo-d${tem ? ' tem' : ''}" data-k="${d.k}"><span class="cs-disco${on ? ' on' : ''}"><i style="--c:${d.cor}"></i><span><b>${esc(d.nome)}</b><small>${esc(d.estilo || '')} · ${d.bpm} bpm</small></span></span>
      <span class="cs-sebo-a"><button type="button" class="btn sm" data-act="cs-sebo-ouvir" data-k="${d.k}">${ico(on ? 'pause' : 'play')} ${on ? 'Parar' : 'Ouvir'}</button><button type="button" class="btn sm${tem ? ' tem' : ' pri'}" data-act="cs-sebo-leva" data-k="${d.k}"${tem ? ' aria-pressed="true"' : ''}>${tem ? `${ico('check')} Na tua casa` : `${ico('home')} Levar pra casa`}</button></span></div>`; };
  const contaSebo = n => n ? `Na tua casa: os ${C.beats.DISCOS.length - C.beats.SEBO.length} de sempre e ${n} do Sebo. Toca "Na tua casa" pra devolver.` : `Os ${C.beats.DISCOS.length - C.beats.SEBO.length} discos de sempre já tão na tua casa; os daqui você escolhe.`;
  function seboSheet(){
    const B2 = C.beats; if(!B2 || !B2.SEBO){ C.toast('Os discos não carregaram.'); return; }
    const meus = new Set(B2.doSebo(C.st.me));
    C.sheet(`<div class="form cs-discos cs-sebo"><div class="sheet-head"><h2>${ico('musica')} Discos do Sebo</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p class="note">Ouve aqui e leva pro toca-discos da tua casa. É de graça, e dá pra devolver quando quiser.</p>
      <div class="cs-sebo-l">${B2.SEBO.map(d => linhaSebo(d, meus.has(d.k))).join('')}</div>
      <p class="fine" id="cs-sebo-conta">${contaSebo(meus.size)}</p></div>`);
  }
  const trocaLinha = k => { const d = C.beats.SEBO.find(x => x.k === k), el = document.querySelector(`.cs-sebo-d[data-k="${k}"]`); if(d && el) el.outerHTML = linhaSebo(d, C.beats.doSebo(C.st.me).includes(k)); };
  function seboOuvir(k){
    const B2 = C.beats; if(!B2) return; const antes = S.ouvindo;
    if(antes === k){ S.ouvindo = ''; if(S.discoAtual) B2.toca(S.discoAtual); else B2.para(); }
    else { S.ouvindo = k; if(!B2.toca(k)) S.ouvindo = ''; }
    if(antes && antes !== k) trocaLinha(antes); trocaLinha(k);
  }
  async function seboLeva(k){
    const B2 = C.beats; if(!B2 || !C.st.me || S.salvaSebo) return;
    const v0 = C.st.me.verso && typeof C.st.me.verso === 'object' ? C.st.me.verso : {}, meus = B2.doSebo(C.st.me), tem = meus.includes(k);
    S.salvaSebo = true;
    try{ await C.saveMe({ verso: Object.assign({}, v0, { discos: tem ? meus.filter(x => x !== k) : meus.concat(k).slice(-40) }) }); }
    catch(e){ C.toast(C.errMsg(e, 'Não deu pra guardar o disco agora.')); return; }
    finally{ S.salvaSebo = false; }
    trocaLinha(k); const ct = C.$('cs-sebo-conta'); if(ct) ct.textContent = contaSebo(B2.doSebo(C.st.me).length);
    C.toast(tem ? `Devolveu o ${B2.nome(k)}.` : `${B2.nome(k)} foi pro toca-discos da tua casa.`, 2600);
  }
  /* saiu do Sebo (ou fechou a folha) com um disco no fone: para, e volta o disco do lugar se tinha um */
  function paraDeOuvir(){ if(!S.ouvindo) return; S.ouvindo = ''; if(C.beats){ if(S.discoAtual) C.beats.toca(S.discoAtual); else C.beats.para(); } }
  function poeDisco(k){
    S.disco = { k: k || '', t: Date.now() };
    if(C.verso.anunciar) C.verso.anunciar();
    sincronizaDisco();
    C.closeSheet();
    if(k) C.toast('Tocando ' + (C.beats ? C.beats.nome(k) : k) + '.', 2200); else C.toast('Tirou o disco.', 1800);
  }
  /* o disco da casa é o último que alguém pôs (ou tirou): o teu e o de quem tá aqui, pelo relógio */
  function discoDaCasa(){
    let melhor = S.disco && S.disco.t ? S.disco : null;
    gente().forEach(r => { if(r.discoT && (!melhor || r.discoT > melhor.t)) melhor = { k: r.disco || '', t: r.discoT }; });
    return melhor ? melhor.k : '';
  }
  function sincronizaDisco(){
    const k = discoDaCasa(); if(k === S.discoAtual) return;
    S.discoAtual = k;
    if(!C.beats) return;
    if(k){ if(!C.beats.toca(k)) S.discoAtual = ''; } else C.beats.para();
    const b = C.$('cs-disco-b'); if(b){ b.hidden = !S.discoAtual; if(S.discoAtual) b.innerHTML = `${ico('musica')}<span>${esc(C.beats.nome(S.discoAtual))}</span>`; }
  }
  /* o disco girando em cima de onde toca, e um pulso no bumbo */
  function solidosDisco(t){
    const out = []; if(!S.discoAtual) return out;
    const n = C.beats ? C.beats.nivel() : 0, cor = (C.beats && C.beats.cor(S.discoAtual)) || ROSA;
    acoes().filter(a => a.a === 'discos' && !a.parede).forEach(a => {
      const cx = a.x + a.w / 2, cz = a.z + a.d / 2, y = a.y + a.topo + .02 + n * .06;
      out.push(solido({ x: cx - .28, y, z: cz - .28, w: .56, h: .03, d: .56, c: INK, yaw: t * 2.5 }, null, INK, null, { semTraco: true }));
      out.push(solido({ x: cx - .09, y: y + .03, z: cz - .09, w: .18, h: .02, d: .18, c: cor, yaw: t * 2.5 }, null, cor, null, { semTraco: true, cru: true }));
      out.push(solido({ x: cx - .06, y: y + .3 + n * .35, z: cz - .06, w: .12, h: .12, d: .12, c: cor, yaw: t * 1.3 }, null, cor, null, { semTraco: true, alpha: .55 + n * .45, cru: true }));
    });
    return out;
  }
  function solidosItens(){
    if(S.cacheItens && S.cacheFraco === embaixoDoMezanino()) return S.cacheItens;
    const out = [], fraco = embaixoDoMezanino();
    const fatias = [];
    S.itens.forEach((i, idx) => { const it = ITEM[i.k]; if(!it) return; const ex = idx === S.sel ? { traco: ROSA } : {}; if(i.n && fraco) ex.alpha = .22; const sol = solidosItem(it, i.x, i.z, i.r, 'item:' + idx, ex, alturaItem(it, i), blocosDe(i)); fatias[idx] = sol; out.push(...sol); });
    S.cacheItens = out; S.cacheFatias = fatias; S.cacheFraco = fraco; return out;
  }
  /* o que mexe nos móveis (peixe, fogo, ventilador, tela…): caixas a mais, feitas a cada quadro */
  const animaA = t => { const d = new Date(); return { t, nivel: C.beats && S.discoAtual ? C.beats.nivel() : 0, tocando: !!S.discoAtual, h: d.getHours(), m: d.getMinutes(), s: d.getSeconds() + d.getMilliseconds() / 1000 }; };
  function solidosAnimados(t){
    const out = [], fraco = embaixoDoMezanino(), A = animaA(t);
    S.itens.forEach((i, idx) => { const it = ITEM[i.k]; if(!it || !it.anima) return; const ex = idx === S.sel ? { traco: ROSA } : {}; if(i.n && fraco) ex.alpha = .22; const bl = M.anima(it, A, i.c, idx + 1); if(!bl.length) return; const sol = solidosItem(it, i.x, i.z, i.r, 'item:' + idx, ex, alturaItem(it, i), bl); const fixa = S.cacheFatias && S.cacheFatias[idx]; if(fixa) cola(sol, bl, i.r * Math.PI / 2, fixa, blocosDe(i)); out.push(...sol); });
    return out;
  }
  /* sombras no chão (pisos) e, no andar de cima, placas finas por cima da laje */
  function sombras(solidosExtra){
    const out = [], ym = PL.mezanino ? PL.mezanino.y : 0;
    const som = (x, z, w, d, n) => { if(n) solidosExtra.push(solido({ x: x + .06, y: ym + .005, z: z + .06, w, h: .004, d, c: '#000' }, null, 'rgba(15,18,24,.16)', null, { cru: true, semTraco: true, chao: true })); else out.push({ x0: x - .04, z0: z - .04, x1: x + w + .16, z1: z + d + .16, c: 'rgba(15,18,24,.07)' }, { x0: x + .06, z0: z + .06, x1: x + w + .06, z1: z + d + .06, c: 'rgba(15,18,24,.13)' }); };
    S.itens.forEach(i => { const it = ITEM[i.k]; if(!it || semChao(it)) return; const p = pegadaDe(it, i.r); som(i.x, i.z, p.w, p.d, i.n); });
    S.fixos.forEach(e => { if(!e.parede) som(e.x, e.z, e.w, e.d, e.y > 1.5 ? 1 : 0); });
    if(S.eu){ const n = nivelDe(S.eu.y); if(n) solidosExtra.push(solido({ x: S.eu.x - .3, y: S.eu.y + .005, z: S.eu.z - .22, w: .6, h: .004, d: .44, c: '#000' }, null, 'rgba(15,18,24,.22)', null, { cru: true, semTraco: true })); else if(!naEscada(S.eu.x, S.eu.z)){ const vk = S.corrida && S.corrida.P.veic, vc = vk === 'moto', ca = ehCarro(vk); out.push({ mancha: [S.eu.x, .004, S.eu.z, S.corrida ? (ca ? 1 : vc ? .42 : .3) : .36, S.corrida ? (ca ? 2 : vc ? .95 : .7) : .28, .34 * (1 - puloCasa(S.eu) * .5), S.eu.yaw] }); } }
    /* v3.52: a bola faz sombra (menor e mais clara quanto mais alto) */
    const bp = bolaAgora(); if(bp){ const al = Math.max(.08, .32 - bp[1] * .06); out.push({ mancha: [bp[0], .004, bp[2], .13 + bp[1] * .02, .13 + bp[1] * .02, al] }); }
    /* v3.53: os rivais da corrida fazem sombra */
    const rivsS = S.corrida && S.corrida.kart ? S.corrida.rivais : PL && PL.kart && S.kartVivo ? S.kartVivo.rivais || [] : [];
    if(rivsS.length){ const c = PL.kart.c; rivsS.forEach(r => { const p = naLinha(c, r.s, r.lat); out.push({ mancha: [p[0], .004, p[1], .3, .7, .3, p[2]] }); }); }
    /* v3.52: quem mais tá aqui também faz sombra */
    gente().forEach(r => { if((r.hyv || 0) > .1) return; const v = r.hmt; out.push({ mancha: [r.hxv, .004, r.hzv, v ? (v >= 3 ? 1 : v === 1 ? .42 : .3) : .36, v ? (v >= 3 ? 2 : v === 1 ? .95 : .7) : .28, .3, r.hyaw || 0] }); });
    return out;
  }

  /* ---------- quem mais tá nesta casa: vem da presença da cidade, com a posição de dentro ---------- */
  function gente(){
    if(!S.dono || !C.verso || !C.verso.remotos) return [];
    const minha = S.dono.id, vis = new Set(C.verso.aparece ? C.verso.aparece() : []), out = [];
    for(const r of C.verso.remotos().values()){ if(!vis.has(r.sid) || r.naCasa !== minha || r.hx == null) continue; out.push(r); }
    return out;
  }
  function andamGente(dt){
    gente().forEach(r => {
      if(r.hxv == null){ r.hxv = r.hx; r.hzv = r.hz; r.hyv = r.hy || 0; }
      const ax = r.hx - r.hxv, az = r.hz - r.hzv, d = Math.hypot(ax, az), ay = (r.hy || 0) - (r.hyv || 0);
      if(d > 3){ r.hxv = r.hx; r.hzv = r.hz; r.hyv = r.hy || 0; } else if(d > .01){ const k = Math.min(1, dt * 10); r.hxv += ax * k; r.hzv += az * k; r.hyv = (r.hyv || 0) + ay * k; }
      r.hand = d > .04; if(r.hand) r.hpasso = (r.hpasso || 0) + dt * 9;
    });
  }
  /* ---------- o quadro ---------- */
  /* o chão: a rua escura em volta, a calçada rente à casa, o caminho até a porta e o piso de cada cômodo do térreo */
  function pisosDaCasa(){
    const pisos = [{ x0: -14, z0: -14, x1: W + 14, z1: D + 14, c: '#20242F' }, { x0: -1.6, z0: -1.6, x1: W + 1.6, z1: D + 1.6, c: '#3A3E45', linha: 'rgba(0,0,0,.18)' },
      { x0: ENTRADA.x - 1, z0: D + 1.6, x1: ENTRADA.x + 1, z1: D + 4, c: '#3A3E45' }];
    COMODOS.forEach(c => { if(!c.n) pisos.push({ x0: c.x0, z0: c.z0, x1: c.x1, z1: c.z1, c: c.piso, c2: c.piso2, xadrez: c.xadrez, linha: c.linha }); });
    /* v3.45: o mosaico do chão de um lugar (polígonos, por cima do piso, na ordem) */
    if(PL.chao) pisos.push(...PL.chao);
    return pisos;
  }
  /* ---------- v3.52 · a resolução do 3D ----------
     Até a 3.51 o 3D era desenhado na metade da tela e esticado (serrilhado, borda grossa). Agora vai na resolução do
     aparelho (até 2 pixels por ponto) e se acerta sozinho: com os quadros lentos (menos de uns 33 por segundo), desce
     um degrau; sobrando folga por um bom tempo, sobe. O degrau que deu certo fica guardado no aparelho */
  const RES_DEGRAUS = [.5, .75, 1, 1.5, 2];
  const resMax = () => { const d = window.devicePixelRatio || 1; return RES_DEGRAUS.filter(v => v >= 1 && v <= Math.max(1, d) + .01).pop(); };
  function resInicial(){ let g = 0; try{ g = parseFloat(localStorage.getItem('corre-res3d')); }catch(e){} return RES_DEGRAUS.includes(g) ? Math.min(g, resMax()) : resMax(); }
  function ajustaRes(dt, agora){
    if(S.resFixa || !(dt > 0) || dt > .2) return;
    S.resMed = S.resMed == null ? dt : S.resMed * .94 + dt * .06;
    if(agora - (S.resT || 0) < 2500) return;
    const i = RES_DEGRAUS.indexOf(S.res); let n = S.res;
    if(S.resMed > .03 && i > 0){ n = RES_DEGRAUS[i - 1]; S.resBaixou = agora; }
    else if(S.resMed < .019 && i >= 0 && i < RES_DEGRAUS.length - 1 && RES_DEGRAUS[i + 1] <= resMax() && agora - (S.resBaixou || 0) > 20000) n = RES_DEGRAUS[i + 1];
    if(n === S.res) return;
    S.res = n; S.resT = agora; S.resMed = null; tamanho();
    try{ localStorage.setItem('corre-res3d', String(n)); }catch(e){}
  }
  function tamanho(){
    const cv = S.cv; if(!cv || !S.el) return;
    if(!S.res) S.res = resInicial();
    const r = S.el.getBoundingClientRect();
    cv.width = Math.max(160, Math.round(r.width * S.res)); cv.height = Math.max(120, Math.round(r.height * S.res));
    cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px';
    /* o traço das caixas: uns 1,15 ponto na tela, em qualquer resolução */
    S.lw = Math.max(1, S.res * 1.15);
  }
  function quadro(t){
    const cv = S.cv, ctx = S.ctx; if(!cv) return;
    const cam = camera(cv);
    const g = ctx.createLinearGradient(0, 0, 0, cv.height); g.addColorStop(0, '#0B1430'); g.addColorStop(.55, '#1B2A5A'); g.addColorStop(1, '#2B2F38');
    ctx.fillStyle = g; ctx.fillRect(0, 0, cv.width, cv.height);
    const ep = Math.max(1, Math.round((S.res || .5) * 1.6));
    ctx.fillStyle = 'rgba(255,255,255,.7)'; for(let i = 0; i < 40; i++){ const sx = ((i * 97) % 101) / 101 * cv.width, sy = ((i * 53) % 37) / 37 * cv.height * .45; ctx.fillRect(sx, sy, ep, ep); }
    const pisos = pisosDaCasa(), extras = [];
    /* v3.77: a luz dos postes e das vitrines no chão (e as sombras de quem mora no lugar) */
    if(PL.luzes) pisos.push(...PL.luzes); if(S.calc) pisos.push(...calcManchas(t));
    pisos.push(...sombras(extras));
    let solidos = [...solidosParedes(cam), ...solidosAndares(), ...solidosFixos(), ...solidosItens(), ...solidosAnimados(t), ...extras, ...solidosDisco(t), ...solidosPesca(t), ...solidosDesafio(), ...solidosKart(t), ...solidosPaineis(), ...solidosImgs(cam), ...calcSolidos(t)];
    const mv = S.corrida && S.eu ? S.corrida.P.veic : '', RK = S.corrida && S.corrida.kart ? S.corrida : null;
    const yv = S.eu ? S.eu.yaw + (RK ? RK.yawVis + ((RK.rodouAte || 0) > Date.now() ? (Date.now() - RK.rodouT0) / 1000 * 9 : 0) : 0) : 0;
    const bichoEu = comBicho() && bichoOk(S.kartBicho) ? S.kartBicho : null, avEu = bichoEu != null ? avBicho(bichoEu) : S.eu && S.eu.av;
    if(mv) solidos.push(...veiculo3d(mv, S.eu.x, S.eu.y, S.eu.z, yv, RK ? (RK.P.def.corEu || (bichoEu != null ? BICHOS_K[bichoEu].cor : corVeic(mv, S.eu.av))) : corVeic(mv, S.eu.av), 'eu'));
    if(S.eu && !ehCarro(mv)) solidos.push(...sobe(boneco(avEu, S.eu.x, S.eu.z, yv, S.eu.passo, mv ? false : S.eu.andando, !!S.eu.sit), S.eu.y + (mv ? VEIC_3D[mv].alt : puloCasa(S.eu) * PULO_ALT)));
    const fracoG = embaixoDoMezanino();
    gente().forEach(r => { const rv = TV_VEIC[r.hmt] || '', bk = comBicho() && bichoOk(r.kp) ? r.kp : null;
      if(rv) solidos.push(...veiculo3d(rv, r.hxv, r.hyv || 0, r.hzv, r.hyaw || 0, bk != null ? BICHOS_K[bk].cor : corVeic(rv, r.av), 'gente:' + r.sid));
      if(ehCarro(rv)) return;
      solidos.push(...sobe(boneco(bk != null ? avBicho(bk) : r.av, r.hxv, r.hzv, r.hyaw || 0, r.hpasso || 0, rv ? false : !!r.hand, !rv && !!r.hsit).map(b => { b.dono = 'gente:' + r.sid; if(fracoG && (r.hyv || 0) > 1.5) b.alpha = .22; return b; }), (r.hyv || 0) + (rv ? VEIC_3D[rv].alt : C.verso.alturaPulo ? C.verso.alturaPulo(r) * PULO_ALT : 0))); });
    if(S.ghost){ const g = S.ghost, it = ITEM[g.k]; if(it) solidos.push(...solidosItem(it, g.x, g.z, g.r, null, g.ok ? { alpha: .62 } : { alpha: .62, cru: true, traco: VERM }, alturaItem(it, g), M.blocos(it, g.c).concat(M.anima(it, animaA(t), g.c, 0))).map(s => { if(!g.ok) s.c = VERM; return s; })); }
    if(S.alvo && !S.acao){ const a = proj(cam, [S.alvo.x, (S.alvo.n && PL.mezanino ? PL.mezanino.y : 0) + .02, S.alvo.z]); if(a){ const k = 2 * (S.res || .5); ctx.strokeStyle = ROSA; ctx.lineWidth = 1.5 * k; ctx.beginPath(); ctx.ellipse(a[0], a[1], (6 + Math.sin(t * 6) * 1.5) * k, 3 * k, 0, 0, Math.PI * 2); ctx.stroke(); } }
    /* v3.53: lugar grande (as pistas): só desenha até a distância de vista, e o que tá longe vai sumindo no escuro */
    if(PL.longe){ const L = PL.longe, cx = S.cam.tx, cz = S.cam.tz; solidos = solidos.filter(s => { const d = Math.hypot(s.cx - cx, s.cz - cz) - (s.raio || 0); if(d > L) return false; s.aL = d > L * .72 && s.dono !== 'eu' ? Math.max(.05, 1 - (d - L * .72) / (L * .28)) : null; return true; }); }
    const foco = S.eu ? { q: proj(cam, [S.eu.x, S.eu.y + .9, S.eu.z]), prof: (S.eu.x - cam.pos[0]) ** 2 + (S.eu.y + .9 - cam.pos[1]) ** 2 + (S.eu.z - cam.pos[2]) ** 2, raio: cv.height * .16 } : null;
    cena(ctx, cv, cam, pisos, solidos, S.hit, foco && foco.q ? foco : null);
    linhaPesca(ctx, cam); ondasKart(ctx, cam);
    etiquetas(cam, cv);
  }
  /* as plaquinhas das ferramentas (e da saída) são DOM, por cima do canvas */
  function etiquetas(cam, cv){
    const box = C.$('cs-tags'); if(!box) return;
    const esc2 = S.el.clientWidth / cv.width, usadas = new Set();
    const poe = (k, p, txt, cls) => {
      let el = S.tags.get(k);
      if(!el){ el = document.createElement('button'); el.type = 'button'; el.className = 'cs-tag ' + (cls || ''); el.dataset.act = 'cs-tag'; el.dataset.k = k; el.textContent = txt; box.appendChild(el); S.tags.set(k, el); }
      usadas.add(k); if(el.textContent !== txt) el.textContent = txt; if(cls != null && el.className !== 'cs-tag ' + cls) el.className = 'cs-tag ' + cls;
      const q = proj(cam, p); if(!q){ el.hidden = true; return; }
      el.hidden = false; el.style.transform = `translate(${Math.round(q[0] * esc2)}px,${Math.round(q[1] * esc2)}px) translate(-50%,-100%)`;
      const perto = S.eu && Math.hypot(S.eu.x - p[0], S.eu.z - p[2]) < 2.6; el.classList.toggle('perto', !!perto);
    };
    const cm = S.eu && comodoDe(S.eu.x, S.eu.z, nivelDe(S.eu.y)), noEsc = !!(cm && cm.k === 'escritorio') || !!S.lugar;
    if((S.meu || S.lugar) && S.modo === 'andar') S.fixos.forEach(e => { const el = S.tags.get('est:' + e.id); if(!noEsc && !(S.eu && nivelDe(S.eu.y) === (e.y > 1.5 ? 1 : 0) && Math.hypot(S.eu.x - e.x - e.w / 2, S.eu.z - e.z - e.d / 2) < 5)){ if(el) el.hidden = true; return; } poe('est:' + e.id, [e.x + e.tag[0], (e.y || 0) + e.tag[1], e.z + e.tag[2]], e.trava ? e.titulo + ' · em breve' : e.id === 'horus' && !estAberta(e) ? 'Hórus desligado' : e.agente ? AGENTE[agenteDe(S.dono)].nome : e.titulo, e.trava ? 'trava' : e.id === 'horus' && !estAberta(e) ? 'off' : e.agente ? 'agente' : ''); });
    poe('saida', [ENTRADA.x, .25, ENTRADA.z - .25], S.meu ? 'Sair pra rua' : S.lugar ? LUGARES[S.lugar].sai || 'Sair pra Feira' : 'Sair', 'saida');
    if(S.modo === 'andar') acoes().forEach(a => { if(!acaoPraMim(a) || (S.pesca && a.a === 'pesca') || S.corrida || S.desafio){ const el = S.tags.get('acao:' + a.id); if(el) el.hidden = true; return; } const cx = a.x + a.w / 2, cz = a.z + a.d / 2, n = a.y > 1.5 ? 1 : 0; if(!(S.eu && nivelDe(S.eu.y) === n && Math.hypot(S.eu.x - cx, S.eu.z - cz) < 4.5)){ const el = S.tags.get('acao:' + a.id); if(el) el.hidden = true; return; } poe('acao:' + a.id, [cx, a.y + a.topo + .35, cz], rotuloAcao(a), a.a === 'discos' && S.discoAtual ? 'acao som' : 'acao'); });
    const peers = C.verso.peers ? C.verso.peers() : new Map();
    gente().forEach(r => { const p = peers.get(r.sid), vivo = p && p.estado === 'aovivo'; poe('gente:' + r.sid, [r.hxv, (r.hyv || 0) + 1.78, r.hzv], (r.handle ? '@' + r.handle : r.nome || 'visitante') + (vivo ? ' · ao vivo' : r.mic ? ' · mic' : ''), vivo ? 'gente vivo' : 'gente'); });
    if(S.calc) calcFalas(poe);
    S.tags.forEach((el, k) => { if(!usadas.has(k) && !el.hidden){ el.hidden = true; } });
    if(S.tags.size > 60) S.tags.forEach((el, k) => { if(!usadas.has(k)){ el.remove(); S.tags.delete(k); } });
    /* a conversa da casa: mic e quem tá ao vivo */
    const mb = C.$('cs-mic'); if(mb){ const on = !!(C.verso.mic && C.verso.mic()); if(mb.getAttribute('aria-pressed') !== String(on)){ mb.setAttribute('aria-pressed', String(on)); mb.innerHTML = `${ico(on ? 'mic' : 'micoff')}<span>${on ? 'Mic ligado' : 'Mic desligado'}</span>`; } }
    const lv = C.$('cs-live'); if(lv){ const nomes = gente().filter(r => { const p = peers.get(r.sid); return p && p.estado === 'aovivo'; }).map(r => r.handle ? '@' + r.handle : r.nome || 'visitante'); const txt = nomes.length ? 'AO VIVO · ' + nomes.join(', ') : ''; if(lv.textContent !== txt){ lv.textContent = txt; lv.hidden = !txt; } }
  }
  function laco(ts){
    if(!S.aberta) return;
    const t = ts / 1000, dt = Math.min(.25, S.tAnt ? Math.max(0, t - S.tAnt) : .016); S.tAnt = t;
    try{
      const bc = C.verso && C.verso.balcao && C.verso.balcao().aberto, sh = C.$('sheet'), parado = bc || (sh && !sh.hidden) || document.hidden;
      /* v3.48: fechou a folha do Sebo com um disco no fone: o fone para */
      if(S.ouvindo && !(sh && !sh.hidden && sh.querySelector('.cs-sebo'))) paraDeOuvir();
      tickPesca();
      if(pistaAqui()) painelCorrida();
      tickDesafio();
      if(comBicho() && (!S.bichoT || t - S.bichoT > 1)){ S.bichoT = t; confereBicho(); }
      /* v3.55: 5 s sem notícia da máquina, os bichos de quem assiste saem da pista (antes ficavam parados lá até a próxima corrida) */
      if(!S.corrida && S.kartVivo && S.kartVivo.rivais){ const KV = S.kartVivo; if(Date.now() - KV.visto > 5000) KV.rivais.length = 0; KV.rivais.forEach(o => { if(Date.now() - KV.visto > 2500) o.v = 0; o.s += o.v * dt; o.s += (o.sAlvo - o.s) * Math.min(1, dt * 4); }); }
      /* celular fraco (quadro lento): o boneco anda em passos de até 50 ms, pra a velocidade não depender do quadro
         (e sem atravessar parede num passo grande) */
      if(!parado){ const np = Math.max(1, Math.ceil(dt / .05 - 1e-9)); for(let i = 0; i < np && S.aberta && S.eu; i++) passo(dt / np); }
      andamGente(dt); if(S.calc) calcPasso(dt); sincronizaDisco();
      if(!S.portaT || t - S.portaT > .2){ S.portaT = t; portaCasa(); if(S.calc) brigaCalcUI(); else { const bg = C.$('cs-briga'); if(bg && !bg.hidden){ bg.hidden = true; bg.dataset.txt = ''; } } }
      if(C.verso.enviaPos) C.verso.enviaPos(false);
      if(!bc && !(C.verso.jogo && C.verso.jogo())){ const t0 = performance.now(); quadro(t); S.msQuadro = (S.msQuadro || 0) * .9 + (performance.now() - t0) * .1; if(!parado) ajustaRes(dt, t0); }
    }catch(e){
      /* um erro num quadro não pode travar a casa: avisa uma vez e segue */
      if(!S.avisouErro){ S.avisouErro = true; try{ console.error('[casa] quadro', e); }catch(_){} C.toast('A casa deu um erro: ' + String((e && e.message) || e).slice(0, 120), 6000); }
    }
    S.raf = requestAnimationFrame(laco);
  }
  function passo(dt){
    const e = S.eu; if(!e) return;
    if(S.corrida){ passoVeiculo(dt); return; }
    if(S.desafio){ const pv0 = S.pad && S.pad.vetor ? S.pad.vetor() : null; if(S.teclas.size || S.alvo || (pv0 && pv0.m)) paraDesafio('Saiu do desafio.'); else { camDesafio(dt); return; } }
    /* v3.77: sentado no banco: só levanta quando você mexe (tecla de andar, o direcional ou um toque no chão) */
    if(e.sit){ const pv1 = S.pad && S.modo === 'andar' ? S.pad.vetor() : null, anda = ['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].some(k => S.teclas.has(k));
      if(anda || S.alvo || (pv1 && pv1.m)){ levanta(); portaCasa(); } else { e.andando = false; const c = S.cam, f = Math.min(1, dt * 6); c.tx += (e.x - c.tx) * f; c.tz += (e.z - c.tz) * f; c.ty += (e.y + 1.1 - c.ty) * f; return; } }
    /* v4.12: levou um empurrão: escorrega uns palmos e fica uns instantes sem andar */
    if((e.tonto || 0) > Date.now()){ const em = e.empurrao; if(em && Date.now() - em.t0 < 260) mover(e, em.vx * dt, em.vz * dt); e.andando = false; S.alvo = null; S.acao = null; S.rota = [];
      const c = S.cam, f = Math.min(1, dt * 6); c.tx += (e.x - c.tx) * f; c.tz += (e.z - c.tz) * f; c.ty += (e.y + 1.1 - c.ty) * f; return; }
    let dx = 0, dz = 0;
    const k = S.teclas, th = S.cam.th;
    /* W = pra longe da câmera; as setas acompanham o giro da câmera */
    const fx = -Math.sin(th), fz = -Math.cos(th), rx = Math.cos(th), rz = -Math.sin(th);
    if(k.has('w') || k.has('ArrowUp')){ dx += fx; dz += fz; } if(k.has('s') || k.has('ArrowDown')){ dx -= fx; dz -= fz; }
    if(k.has('d') || k.has('ArrowRight')){ dx += rx; dz += rz; } if(k.has('a') || k.has('ArrowLeft')){ dx -= rx; dz -= rz; }
    /* v3.40: o direcional da tela. A base (frente da câmera) trava enquanto o dedo tá no controle, pra o boneco não andar
       em círculo quando a câmera vai girando pra trás dele */
    const pv = S.pad && S.modo === 'andar' ? S.pad.vetor() : null;
    if(pv && pv.m && !(dx || dz)){
      if(S.padTh == null) S.padTh = th;
      const t0 = S.padTh, f0x = -Math.sin(t0), f0z = -Math.cos(t0), r0x = Math.cos(t0), r0z = -Math.sin(t0), fator = Math.min(1, .35 + pv.m * .8);
      dx = f0x * -pv.y + r0x * pv.x; dz = f0z * -pv.y + r0z * pv.x; const L = Math.hypot(dx, dz) || 1; dx = dx / L * fator; dz = dz / L * fator; S.rota = [];
    } else if(!(pv && pv.m)) S.padTh = null;
    if(dx || dz){ S.alvo = null; S.acao = null; }
    else if(S.alvo){ dx = S.alvo.x - e.x; dz = S.alvo.z - e.z; const d = Math.hypot(dx, dz); if(d < .08){ dx = dz = 0; chegou(); } else { dx /= d; dz /= d; if(d < .5){ dx *= d * 2; dz *= d * 2; } } }
    if(dx || dz) S.rota = S.rota && S.teclas.size ? [] : S.rota;
    const n = Math.hypot(dx, dz);
    if(n > .001){
      const ox = e.x, oz = e.z; mover(e, dx / n * VEL * dt * Math.min(1, n), dz / n * VEL * dt * Math.min(1, n));
      const andou = Math.hypot(e.x - ox, e.z - oz);
      e.andando = andou > .0005; if(e.andando){ e.passo += dt * 9; e.yaw = Math.atan2(dx, dz); e.parado = 0; const np = Math.floor(e.passo / Math.PI); if(np !== S.passoN){ S.passoN = np; if(C.versoSom && puloCasa(e) === 0) C.versoSom.passo(naEscada(e.x, e.z) || nivelDe(e.y) === 1 ? 'madeira' : 'piso', .8); } }
      /* v3.81: travou a menos de 70 cm de um ponto do meio da rota (no templo, a quina da câmara encosta no pé da
         escada): segue pro próximo em vez de largar o caminho */
      else { e.parado = (e.parado || 0) + dt; if(e.parado > .4){ const fal = S.alvo ? Math.hypot(S.alvo.x - e.x, S.alvo.z - e.z) : 9; if(S.alvo && (S.rota.length ? fal < .7 : S.acao && fal < 2.4)) chegou(); else { S.alvo = null; S.acao = null; S.rota = []; } } }
    } else { e.andando = false; }
    /* a câmera segue o boneco (e sobe junto no mezanino); andando, ela vai girando pra ficar atrás dele, a não ser
       que você tenha acabado de arrastar pra olhar de outro lado */
    /* v3.53: assistindo a corrida ao vivo, a câmera vai com o corredor escolhido (andou, ela volta pra você) */
    if(S.segue != null){ if(e.andando || S.alvo) S.segue = null; else { camSegue(dt); return; } }
    const c = S.cam, f = Math.min(1, dt * 6);
    c.tx += (e.x - c.tx) * f; c.tz += (e.z - c.tz) * f; c.ty += (e.y + 1.1 - c.ty) * f;
    /* v3.52: pegou peixe, a câmera chega perto dele (e volta depois) */
    const PC = S.pesca && S.pesca.peixeC;
    if(PC){ if(S.distPesca == null) S.distPesca = c.dist; const g = Math.min(1, dt * 3); c.tx += ((e.x + PC[0]) / 2 - c.tx) * g; c.tz += ((e.z + PC[2]) / 2 - c.tz) * g; c.ty += (PC[1] - .2 - c.ty) * g; c.dist += (3.6 - c.dist) * g; }
    else if(S.distPesca != null){ const g = Math.min(1, dt * 2.5); c.dist += (S.distPesca - c.dist) * g; if(Math.abs(c.dist - S.distPesca) < .05){ c.dist = S.distPesca; S.distPesca = null; } }
    if(e.andando && S.modo === 'andar' && Date.now() - (S.arrastou || 0) > 3000){ const alvo = e.yaw + Math.PI; let d = alvo - c.th; d = Math.atan2(Math.sin(d), Math.cos(d)); c.th += d * Math.min(1, dt * 1.6); }
    const onde = comodoDe(e.x, e.z, nivelDe(e.y)); const nome = naEscada(e.x, e.z) ? 'Escada' : onde ? onde.nome : 'Lá fora'; if(nome !== S.ultOnde){ S.ultOnde = nome; const o = C.$('cs-onde'); if(o) o.textContent = nome; }
  }
  /* ---------- v3.40 · pular, e a plaquinha do que dá pra fazer perto (o mesmo botão no celular, Enter no teclado) ---------- */
  const PULO_MS_C = 480, PULO_ALT = .62;
  const puloCasa = o => { const t0 = o && o.puT; if(!t0) return 0; const f = (performance.now() - t0) / PULO_MS_C; return f > 0 && f < 1 ? 4 * f * (1 - f) : 0; };
  function pulaCasa(){
    const e = S.eu; if(!e || !S.aberta || S.modo !== 'andar' || puloCasa(e) > 0) return;
    if(e.sit){ levanta(); portaCasa(); return; }
    e.puT = performance.now(); if(C.verso.marcaPulo) C.verso.marcaPulo();
    if(C.versoSom){ C.versoSom.pulo(''); setTimeout(() => { if(S.aberta && C.versoSom) C.versoSom.cai(.9); }, PULO_MS_C - 40); }
  }
  /* o que tá perto: uma ferramenta (na tua casa), uma ação (discos, skate, fliperama), a escada ou a saída */
  function pertoDe(){
    const e = S.eu; if(!e || S.modo !== 'andar') return null;
    const n = nivelDe(e.y); let melhor = null, md = 1.6;
    const ve = (d, o) => { if(d < md){ md = d; melhor = o; } };
    if(S.meu || S.lugar) S.fixos.forEach(f => { if((f.y > 1.5 ? 1 : 0) !== n) return; const nome = f.trava ? f.titulo + ' · em breve' : f.agente ? AGENTE[agenteDe(S.dono)].nome : f.id === 'horus' && !estAberta(f) ? 'Hórus desligado' : f.titulo; ve(Math.hypot(e.x - f.x - f.w / 2, e.z - f.z - f.d / 2) - Math.max(f.w, f.d) / 2, { t: 'est', e: f, nome: 'Abrir: ' + nome }); });
    acoes().forEach(a => { if(!acaoPraMim(a) || (a.y > 1.5 ? 1 : 0) !== n) return; ve(Math.hypot(e.x - a.x - a.w / 2, e.z - a.z - a.d / 2) - Math.max(a.w, a.d) / 2, { t: 'acao', a, nome: rotuloAcao(a) }); });
    if(PL.escada){ const es = PL.escada, cx = (es.x0 + es.x1) / 2; ve(n === 1 ? Math.hypot(e.x - cx, e.z - (es.z0 - .7)) - .4 : Math.hypot(e.x - cx, e.z - (es.z1 + .9)) - .4, { t: 'escada', nome: n === 1 ? 'Descer a escada' : 'Subir a escada' }); }
    /* v3.77: perto de alguém do Calçadão (menos quem tá passando), o botão é trocar ideia */
    if(S.calc && n === 0) S.calc.gente.forEach(g => { if(!g.caiu && (g.papel !== 'anda' || g.grita)) ve(Math.hypot(e.x - g.x, e.z - g.z) - .5, { t: 'npc', n: g, nome: 'Trocar ideia com ' + g.nome }); });
    if(n === 0) ve(Math.hypot(e.x - ENTRADA.x, e.z - (ENTRADA.z - .4)) - .3, { t: 'saida', nome: S.meu ? 'Sair pra rua' : S.lugar ? LUGARES[S.lugar].sai || 'Sair pra Feira' : 'Sair' });
    return melhor;
  }
  function portaCasa(){
    const b = C.$('cs-porta'); if(!b) return;
    if(S.desafio){ const D = S.desafio, txt = ehBeisebol(D.Q) ? ((D.fase === 'espera' || D.fase === 'arremesso') && !D.sw ? D.Q.botao : D.fase === 'fim' ? 'Fim!' : '…') : D.fase === 'mira' ? D.Q.botao : D.fase === 'voo' ? '…' : 'Fim!'; S.perto = null; if(b.dataset.txt !== txt){ b.dataset.txt = txt; b.hidden = false; b.innerHTML = `${ico('raio')}<span>${txt}</span>`; } b.classList.remove('morde'); return; }
    if(S.corrida && S.corrida.kart && !S.corrida.P.solo){ const R = S.corrida, it = R.item && ITENS_K[R.item], txt = R.fim ? 'Chegou!' : R.roleta ? '…' : it ? `Usar: ${it.nome}${R.itemN > 1 ? ` x${R.itemN}` : ''}` : 'Sem item'; S.perto = null; if(b.dataset.txt !== txt){ b.dataset.txt = txt; b.hidden = false; b.innerHTML = `${ico(R.fim ? 'check' : it ? it.ico : 'raio')}<span>${txt}</span>`; } b.classList.toggle('vazio', !it && !R.fim); b.classList.remove('morde'); return; }
    b.classList.remove('vazio');
    if(S.corrida){ const txt = S.corrida.fim ? 'Chegou!' : 'Desistir'; S.perto = null; if(b.dataset.txt !== txt){ b.dataset.txt = txt; b.hidden = false; b.innerHTML = `${ico(S.corrida.fim ? 'check' : 'x')}<span>${txt}</span>`; } b.classList.remove('morde'); return; }
    if(S.pesca){ const txt = S.pesca.fase === 'morde' ? 'Puxar!' : 'Puxar'; S.perto = null; if(b.dataset.txt !== txt){ b.dataset.txt = txt; b.hidden = false; b.innerHTML = `${ico('peixe')}<span>${txt}</span>`; } b.classList.toggle('morde', S.pesca.fase === 'morde'); return; }
    b.classList.remove('morde');
    /* v3.77: sentado, o botão é levantar */
    if(S.eu && S.eu.sit){ const txt = 'Levantar'; S.perto = null; if(b.dataset.txt !== txt){ b.dataset.txt = txt; b.hidden = false; b.innerHTML = `${ico('up')}<span>${txt}</span>`; } return; }
    /* v3.53: tem corrida ao vivo e nada perto: o botão é a câmera de quem assiste */
    if(S.modo === 'andar' && !S.alvo && !pertoDe()){ const L = corredoresVivo(); if(L.length){ const txt = S.segue != null ? `Seguindo: ${L[Math.min(L.length - 1, S.segue)].nome}` : 'Assistir a corrida'; S.perto = null; if(b.dataset.txt !== txt){ b.dataset.txt = txt; b.hidden = false; b.innerHTML = `${ico('eye')}<span>${txt}</span>`; } return; } else S.segue = null; }
    const p = S.modo === 'andar' && !S.alvo ? pertoDe() : null; S.perto = p;
    const txt = p ? p.nome : '';
    if(b.dataset.txt !== txt){ b.dataset.txt = txt; b.hidden = !p; if(p) b.innerHTML = `${ico(p.t === 'saida' ? 'prev' : p.t === 'escada' ? 'up' : p.t === 'npc' ? 'chat' : p.t === 'est' ? 'raio' : p.a && p.a.a === 'discos' ? 'musica' : p.a && (p.a.a === 'jogo' || p.a.a === 'coringa') ? 'play' : p.a && p.a.a === 'pesca' ? 'peixe' : p.a && p.a.a === 'roupa' ? 'troca' : p.a && p.a.a === 'enigma' ? 'eye' : p.a && (p.a.a === 'largada' || p.a.a === 'desafio') ? 'raio' : 'eu')}<span>${esc(p.nome)}</span>`; }
  }
  function acaoPerto(){
    if(S.desafio){ dispara(); return; }
    if(S.corrida && S.corrida.kart && !S.corrida.P.solo){ usaItem(); return; }
    if(S.corrida){ if(!S.corrida.fim) desmonta(true); return; }
    if(S.pesca){ puxa(); return; }
    if(S.eu && S.eu.sit){ levanta(); portaCasa(); return; }
    if(!S.perto && !pertoDe()){ const L = corredoresVivo(); if(L.length){ S.segue = S.segue == null ? 0 : (S.segue + 1) % L.length; S.arrastou = 0; portaCasa(); return; } }
    const p = S.perto || pertoDe(); if(!p || !S.eu) return;
    if(p.t === 'est') vaiNaEstacao(p.e);
    else if(p.t === 'acao') vaiNaAcao(p.a);
    else if(p.t === 'npc') vaiFalar(p.n);
    else if(p.t === 'saida') vaiSair();
    else if(p.t === 'escada'){ const es = PL.escada, cx = (es.x0 + es.x1) / 2; if(nivelDe(S.eu.y) === 1) andaPra(cx, es.z1 + .7, 0); else andaPra(cx, es.z0 - .7, 1); }
  }
  function chegou(){
    /* no meio de uma rota (pela escada): o próximo ponto */
    if(S.rota && S.rota.length){
      /* v3.80: o trecho depois da escada também desvia do que tiver no caminho (na mansão, a parede da cozinha fica do
         lado da escada: andando reto, ele subia a escada de novo e chegava em cima do mezanino) */
      const prox = S.rota.shift(), d = prox && S.eu && nivelDe(S.eu.y) === prox.n ? desvia(prox.x, prox.z, prox.n) : null;
      if(d && d.length){ S.alvo = d.shift(); S.rota = d.concat(S.rota); } else S.alvo = prox;
      return;
    }
    const a = S.acao; S.alvo = null; S.acao = null; if(!a) return;
    if(a.t === 'saida'){ fechar(); return; }
    if(a.t === 'est') abreEstacao(a.e);
    if(a.t === 'acao') fazAcao(a.a);
    if(a.t === 'npc') trocaIdeia(a.n);
  }
  /* o caminho até um ponto de outro andar passa pela escada: pé da escada → topo → o ponto (e, descendo, sai do pé
     pro lado antes de seguir, pra não voltar pela rampa de viés) */
  /* v3.46: o caminho desvia do que tá no meio (o laser do Cofre, a cadeira na frente da mesa). Com a linha livre vai
     reto, como sempre; senão procura na grade da casa (de 25 em 25 cm, 8 vizinhos, sem cortar quina) e enxuga a rota
     só pros cantos. Sem caminho nenhum, vai reto e para onde bater (o jeito de antes) */
  const livreReto = (x0, z0, x1, z1, n) => { const L = Math.hypot(x1 - x0, z1 - z0), k = Math.max(1, Math.ceil(L / .12)); for(let i = 1; i <= k; i++){ const t = i / k; if(bate(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, n)) return false; } return true; };
  function desvia(x, z, n){
    const e = S.eu; if(!e || livreReto(e.x, e.z, x, z, n)) return null;
    const cw = Math.ceil(W * G), cd = Math.ceil(D * G), cel = v => (v + .5) / G, de = new Int32Array(cw * cd).fill(-1), vis = new Uint8Array(cw * cd);
    const ci = (v, m) => Math.max(0, Math.min(m - 1, Math.floor(v * G))), ini = ci(e.z, cd) * cw + ci(e.x, cw), fim = ci(z, cd) * cw + ci(x, cw);
    const livre = k => { if(k === fim) return true; if(!vis[k]) vis[k] = bate(cel(k % cw), cel(Math.floor(k / cw)), n) ? 2 : 1; return vis[k] === 1; };
    /* o mais curto de verdade (diagonal custa 1,41), com um montinho binário pra ir sempre pelo mais perto */
    const custo = new Float32Array(cw * cd).fill(1e9), feito = new Uint8Array(cw * cd), H = [];
    const sobeH = (k, c) => { H.push([c, k]); let i = H.length - 1; while(i > 0){ const p = (i - 1) >> 1; if(H[p][0] <= H[i][0]) break; [H[p], H[i]] = [H[i], H[p]]; i = p; } };
    const tiraH = () => { const t = H[0], u = H.pop(); if(H.length){ H[0] = u; let i = 0; for(;;){ const l = i * 2 + 1, r = l + 1; let m = i; if(l < H.length && H[l][0] < H[m][0]) m = l; if(r < H.length && H[r][0] < H[m][0]) m = r; if(m === i) break; [H[m], H[i]] = [H[i], H[m]]; i = m; } } return t; };
    custo[ini] = 0; de[ini] = ini; sobeH(ini, 0);
    while(H.length){
      const [c, k] = tiraH(); if(feito[k]) continue; feito[k] = 1; if(k === fim) break;
      const i = k % cw, j = Math.floor(k / cw);
      for(let di = -1; di <= 1; di++) for(let dj = -1; dj <= 1; dj++){
        const ii = i + di, jj = j + dj; if((!di && !dj) || ii < 0 || jj < 0 || ii >= cw || jj >= cd) continue;
        const kk = jj * cw + ii; if(feito[kk] || !livre(kk)) continue;
        if(di && dj && (!livre(j * cw + ii) || !livre(jj * cw + i))) continue;
        const nc = c + (di && dj ? 1.414 : 1); if(nc < custo[kk]){ custo[kk] = nc; de[kk] = k; sobeH(kk, nc); }
      }
    }
    if(de[fim] < 0) return null;
    const pts = []; for(let k = fim; k !== ini; k = de[k]) pts.push([cel(k % cw), cel(Math.floor(k / cw))]); pts.reverse(); pts[pts.length - 1] = [x, z];
    const out = []; let ox = e.x, oz = e.z, i = 0;
    while(i < pts.length){ let j = pts.length - 1; while(j > i && !livreReto(ox, oz, pts[j][0], pts[j][1], n)) j--; out.push({ x: pts[j][0], z: pts[j][1], n }); ox = pts[j][0]; oz = pts[j][1]; i = j + 1; }
    return out;
  }
  function tracaRota(x, z, n){
    const atual = S.eu ? nivelDe(S.eu.y) : 0, e = PL.escada;
    if(!e || n === atual) return desvia(x, z, n) || [{ x, z, n }];
    const cx = (e.x0 + e.x1) / 2, pe = { x: cx, z: e.z1 + .9, n: 0 }, topo = { x: cx, z: e.z0 - .7, n: 1 };
    /* v3.80: até a escada também desvia (no mezanino cheio de móvel, andando reto ele parava encostado num) */
    const ate = p => desvia(p.x, p.z, p.n) || [p];
    if(n === 1) return [...ate(pe), topo, { x, z, n }];
    const lado = x < e.x0 - .5 ? [{ x: e.x0 - 1, z: e.z1 + .9, n: 0 }] : [];
    return [...ate(topo), pe, ...lado, { x, z, n }];
  }

  /* ---------- as ferramentas do escritório abrem o balcão por cima da casa ---------- */
  function abreEstacao(e){
    if(!(S.meu || S.lugar) || !e) return;
    if(e.id === 'manual'){ if(C.manual) C.manual.abrir(); return; }
    if(e.abre === 'sebo'){ seboSheet(); return; }
    if(e.agente){ agenteSheet(); return; }
    if(e.trava){ iaSheet(); return; }
    if(!estAberta(e)){ C.toast('O Hórus tá desligado. Liga em Editar perfil › Ferramentas.', 3600); if(C.verso && C.verso.abreBalcao) C.verso.abreBalcao({ id: 'horus', titulo: 'Hórus', rota: '#/editar', cor: INK }); return; }
    if(C.verso && C.verso.abreBalcao) C.verso.abreBalcao({ id: e.id, titulo: e.titulo, rota: e.rota, cor: e.cor });
  }

  /* ---------- o escritório financeiro: o agente, o que ele faz (em breve, na Binance) e a escolha do agente ---------- */
  const miniAgente = (cv, k) => { const ag = AGENTE[k]; if(!ag) return; miniatura(cv, { k: 'agente:' + k, w: 1.3, d: 1.3, bl: ag.bl().map(b => Object.assign({}, b, { x: b.x - .35, z: b.z - .1 })) }); };
  function agenteSheet(){
    const k = agenteDe(S.dono), ag = AGENTE[k], f = (C.st.me && C.st.me.ferramentas && typeof C.st.me.ferramentas === 'object') ? C.st.me.ferramentas : {}, na = f.robo === 'lista';
    const link = C.CFG && typeof C.CFG.ROBO_URL === 'string' && /^https:\/\//.test(C.CFG.ROBO_URL) ? C.CFG.ROBO_URL : '';
    C.sheet(`<div class="form cs-ag"><div class="sheet-head"><h2>${ico('grana')} Escritório financeiro</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <div class="cs-ag-h"><canvas class="cs-ag-cv" width="150" height="130" data-k="${k}" aria-hidden="true"></canvas><div><b>${esc(ag.nome)}</b><small>teu agente</small><p>${esc(ag.bio)}</p></div></div>
      <p class="cs-ia-tags"><span class="tag plus">Corre+</span><span class="tag">${link ? 'operando' : 'em breve na Binance'}</span></p>
      <p>${S.meu ? 'Ele vai operar sozinho na tua Binance: o robô do parceiro entra aqui, e ele mostra o que fez, o que ganhou e o que tá de olho. Enquanto não abre, ele fica de olho na Grana.' : 'O agente financeiro de quem mora aqui. Em breve opera na Binance.'}</p>
      <div class="acts">${S.meu ? (link ? `<a class="btn pri" href="${esc(link)}" target="_blank" rel="noopener">${ico('ext')} Abrir o robô</a>` : na ? '<span class="tag pub">Tu tá na lista. A gente te chama quando abrir.</span>' : `<button type="button" class="btn pri" data-act="cs-ag-lista">Quero na lista</button>`) : ''}${S.meu ? `<button type="button" class="btn" data-act="cs-ag-grana">${ico('grana')} Abrir a Grana</button><button type="button" class="btn" data-act="cs-ag-trocar">${ico('troca')} Trocar o agente</button>` : ''}</div></div>`);
    document.querySelectorAll('.cs-ag-cv').forEach(cv => miniAgente(cv, cv.dataset.k));
  }
  function agentesSheet(){
    const atual = agenteDe(S.dono);
    C.sheet(`<div class="form cs-ag"><div class="sheet-head"><h2>${ico('eu')} Teu agente</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p class="note">Escolhe quem senta na mesa do escritório financeiro. Todos daqui, nenhum de fora.</p>
      <div class="cs-grid cs-ag-grid">${AGENTES.map(a => `<button type="button" class="cs-item${a.k === atual ? ' on' : ''}" data-act="cs-ag-escolhe" data-k="${a.k}"><canvas width="112" height="96" aria-hidden="true" data-k="${a.k}"></canvas><b>${esc(a.nome)}</b><small>${a.k === atual ? 'é ele' : esc(a.bio.split('.')[0])}</small></button>`).join('')}</div></div>`, 'wide');
    document.querySelectorAll('.cs-ag-grid canvas').forEach(cv => miniAgente(cv, cv.dataset.k));
  }
  async function escolheAgente(k){
    if(!AGENTE[k] || !S.meu || !C.st.me) return;
    const f = Object.assign({}, (C.st.me.ferramentas && typeof C.st.me.ferramentas === 'object') ? C.st.me.ferramentas : {}, { agente: k });
    try{ await C.saveMe({ ferramentas: f }); }catch(e){ C.toast(C.errMsg(e, 'Não deu pra trocar o agente agora.')); return; }
    if(S.dono && S.dono.id === C.st.me.id) S.dono = C.st.me;
    C.toast(AGENTE[k].nome + ' assumiu a mesa.', 2600); agenteSheet();
  }
  /* o Computador IA: o que ele vai fazer e a lista de espera (ferramentas.ia = 'lista') */
  function iaSheet(){
    const f = (C.st.me && C.st.me.ferramentas && typeof C.st.me.ferramentas === 'object') ? C.st.me.ferramentas : {}, na = f.ia === 'lista';
    C.sheet(`<div class="form cs-ia"><div class="sheet-head"><h2>${ico('magia')} Computador IA</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p class="cs-ia-tags"><span class="tag plus">Corre+</span><span class="tag">trancado · em breve</span></p>
      <p>O computador que trampa por você, o mês inteiro:</p>
      <ul class="cs-ia-l"><li>cria o conteúdo do mês pras tuas marcas, desenha as imagens e escreve as legendas;</li><li>agenda e posta no Instagram sozinho;</li><li>olha o Hórus todo dia, puxa os leads e deixa a mensagem pronta;</li><li>responde os pedidos do Mural com a tua proposta;</li><li>te manda o resumo: o que postou, quem chegou, o que fechou.</li></ul>
      <p class="fine">Vai ser pago, dentro do Corre+. Quem levanta a mão agora entra primeiro quando abrir.</p>
      <div class="acts">${na ? '<span class="tag pub">Tu tá na lista. A gente te chama quando abrir.</span>' : `<button type="button" class="btn pri" data-act="cs-ia-quero">Quero na lista</button>`}</div></div>`);
  }
  /* ---------- toque e teclado ---------- */
  function ponto(ev){ const r = S.cv.getBoundingClientRect(); return [(ev.clientX - r.left) / r.width * S.cv.width, (ev.clientY - r.top) / r.height * S.cv.height]; }
  function acerta(pt){ for(let i = S.hit.length - 1; i >= 0; i--){ const h = S.hit[i]; if(h.polys.some(p => dentro(pt, p))) return h; } return null; }
  /* onde o toque caiu: tocou em algo que tá em cima do mezanino (e você não tá embaixo dele), o ponto é na laje; senão, no térreo */
  function pontoNoChao(pt, cam, h){
    const m = PL.mezanino;
    if(m && h && h.s && h.s.cy > m.y - .5 && !embaixoDoMezanino()){ const c = chao(cam, pt[0], pt[1], m.y); if(c && noMezanino(c.x, c.z)) return { x: c.x, z: c.z, n: 1 }; }
    const c = chao(cam, pt[0], pt[1], 0); return c ? { x: c.x, z: c.z, n: 0 } : null;
  }
  function toque(ev){
    const pt = ponto(ev), cam = camera(S.cv), h = acerta(pt), ch = pontoNoChao(pt, cam, h);
    if(S.modo === 'colocar'){ if(ch) ghostNoChao(ch); return; }
    if(S.modo === 'decorar'){
      if(h && h.dono && h.dono.startsWith('item:')){ seleciona(Number(h.dono.slice(5))); return; }
      seleciona(-1); if(ch && S.eu) andaPra(ch.x, ch.z, ch.n); return;
    }
    if(h && h.dono && h.dono.startsWith('publi:') && C.verso && C.verso.publiSheet){ C.verso.publiSheet(h.dono.slice(6)); return; }
    if(h && h.dono === 'saida'){ vaiSair(); return; }
    /* tocou na escada: sobe (ou desce) ela inteira */
    if(h && h.dono === 'escada' && PL.escada && S.eu){ const e = PL.escada, cx = (e.x0 + e.x1) / 2; if(nivelDe(S.eu.y) === 1) andaPra(cx, e.z1 + .7, 0); else andaPra(cx, e.z0 - .7, 1); return; }
    if(h && h.dono && h.dono.startsWith('est:')){ const e = S.fixos.find(x => x.id === h.dono.slice(4)); if(e){ vaiNaEstacao(e); return; } }
    if(h && h.dono && (h.dono.startsWith('decor:') || h.dono.startsWith('item:'))){ const id = (h.dono.startsWith('decor:') ? 'd' : 'i') + h.dono.split(':')[1]; const a = acoes().find(x => x.id === id); if(a && acaoPraMim(a)){ vaiNaAcao(a); return; } }
    if(h && h.dono && h.dono.startsWith('npc:') && S.calc){ const n = S.calc.gente[Number(h.dono.slice(4))]; if(n){ vaiFalar(n); return; } }
    if(h && (h.dono === 'eu' || (h.dono && h.dono.startsWith('gente:')))) return;
    if(ch) andaPra(ch.x, ch.z, ch.n);
  }
  function andaPra(x, z, n){
    if(!S.eu) return; S.acao = null;
    const rota = tracaRota(Math.max(.3, Math.min(W - .3, x)), Math.max(.3, Math.min(D - .3, z)), n || 0);
    S.alvo = rota.shift(); S.rota = rota;
  }
  /* sair: anda até a porta (pela escada, se tiver em cima) e a casa fecha */
  function vaiSair(){ if(!S.eu) return; const rota = tracaRota(ENTRADA.x, ENTRADA.z - .9, 0); S.alvo = rota.shift(); S.rota = rota; S.acao = { t: 'saida' }; }
  function vaiNaEstacao(e){
    const cx = e.x + e.w / 2, cz = e.z + e.d / 2, n = e.y > 1.5 ? 1 : 0;
    if(S.eu && nivelDe(S.eu.y) === n && Math.hypot(S.eu.x - cx, S.eu.z - cz) < 2.2){ abreEstacao(e); return; }
    /* anda até a frente do móvel (do lado que tem chão livre), pela escada se for no outro andar */
    const cands = e.parede ? [[cx + (e.w < .2 ? .9 : 0), cz + (e.d < .2 ? .9 : 0)]] : [[cx, e.z + e.d + .55], [cx, e.z - .55], [e.x - .55, cz], [e.x + e.w + .55, cz]];
    const livre = cands.find(([x, z]) => !bate(x, z, n)) || cands[0];
    const rota = tracaRota(livre[0], livre[1], n);
    S.alvo = rota.shift(); S.rota = rota; S.acao = { t: 'est', e };
  }
  function pointerDown(ev){
    if(ev.button != null && ev.button !== 0 && ev.pointerType === 'mouse') return;
    S.cv.setPointerCapture && S.cv.setPointerCapture(ev.pointerId);
    if(S.pointer && S.pointer.id !== ev.pointerId){ S.pinch = { a: S.pointer.id, b: ev.pointerId, pa: [S.pointer.x, S.pointer.y], pb: [ev.clientX, ev.clientY], d0: 0, dist0: S.cam.dist }; S.pinch.d0 = Math.hypot(S.pinch.pa[0] - S.pinch.pb[0], S.pinch.pa[1] - S.pinch.pb[1]); return; }
    S.pointer = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, x0: ev.clientX, y0: ev.clientY, arrasta: false, t0: Date.now() };
  }
  function pointerMove(ev){
    if(S.pinch){ if(ev.pointerId === S.pinch.a) S.pinch.pa = [ev.clientX, ev.clientY]; else if(ev.pointerId === S.pinch.b) S.pinch.pb = [ev.clientX, ev.clientY]; else return; const d = Math.hypot(S.pinch.pa[0] - S.pinch.pb[0], S.pinch.pa[1] - S.pinch.pb[1]); if(S.pinch.d0 > 0) S.cam.dist = Math.max(PERTAO, Math.min(LONGE(), S.pinch.dist0 * S.pinch.d0 / Math.max(10, d))); return; }
    const p = S.pointer;
    if(!p || p.id !== ev.pointerId){ if(S.modo === 'colocar' && ev.pointerType === 'mouse' && !p){ const pt = ponto(ev), cam = camera(S.cv), ch = pontoNoChao(pt, cam, acerta(pt)); if(ch) ghostNoChao(ch); } return; }
    const dx = ev.clientX - p.x, dy = ev.clientY - p.y;
    if(!p.arrasta && Math.hypot(ev.clientX - p.x0, ev.clientY - p.y0) > 9) p.arrasta = true;
    if(p.arrasta){ S.cam.th -= dx * .008; S.cam.ph = Math.max(PL.phMin || .25, Math.min(1.35, S.cam.ph + dy * .004)); S.arrastou = Date.now(); }
    p.x = ev.clientX; p.y = ev.clientY;
  }
  function pointerUp(ev){
    if(S.pinch){ if(ev.pointerId === S.pinch.a || ev.pointerId === S.pinch.b){ S.pinch = null; S.pointer = null; } return; }
    const p = S.pointer; if(!p || p.id !== ev.pointerId) return;
    S.pointer = null;
    if(!p.arrasta && ev.type !== 'pointercancel') toque(ev);
  }
  const LONGE = () => 26 * Math.max(1, Math.max(W, D) / 20);
  const PERTAO = 3.2;
  function roda(ev){ ev.preventDefault(); S.cam.dist = Math.max(PERTAO, Math.min(LONGE(), S.cam.dist + ev.deltaY * .01)); }
  const TECLAS = new Set(['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
  function tecla(e){
    if(!S.aberta) return;
    const bc = C.verso && C.verso.balcao && C.verso.balcao().aberto; if(bc){ S.teclas.clear(); return; }
    const alvo = e.target, digitando = alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.tagName === 'SELECT' || alvo.isContentEditable);
    const sh = C.$('sheet'); if(digitando || (sh && !sh.hidden)){ S.teclas.clear(); return; }
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if(TECLAS.has(k)){ e.preventDefault(); if(e.type === 'keydown') S.teclas.add(k); else S.teclas.delete(k); return; }
    if(k === ' '){ e.preventDefault(); if(S.corrida && S.corrida.kart){ if(!e.repeat) pulaKart(e.type === 'keydown'); return; } if(e.type === 'keydown' && !e.repeat){ if(S.pesca) puxa(); else if(S.desafio) dispara(); else if(!S.corrida) pulaCasa(); } return; }
    if(k === 'f' && S.corrida && S.corrida.kart){ e.preventDefault(); if(e.type === 'keydown' && !e.repeat) usaItem(); return; }
    /* v4.12: F empurra no Calçadão (como na cidade) */
    if(k === 'f' && S.calc){ e.preventDefault(); if(e.type === 'keydown' && !e.repeat) empurraCalc(); return; }
    if(e.type !== 'keydown') return;
    if(k === 'q'){ S.cam.th += Math.PI / 4; S.arrastou = Date.now(); } else if(k === 'e'){ S.cam.th -= Math.PI / 4; S.arrastou = Date.now(); }
    else if(k === 'r' && S.ghost){ giraGhost(); }
    else if(k === 'Enter' && S.modo === 'colocar'){ colocaGhost(); }
    /* v3.55: Enter segurado não gasta os três cafés de uma vez (a repetição da tecla não conta) */
    else if(k === 'Enter' && S.modo === 'andar'){ e.preventDefault(); if(!e.repeat) acaoPerto(); }
    else if(k === 'Escape'){ if(e.defaultPrevented) return; e.preventDefault(); if(S.modo === 'colocar') cancelaGhost(); else if(S.modo === 'decorar') decorar(false); else fechar(); }
  }
  function soltar(){ S.teclas.clear(); }

  /* ---------- decorar: loja, colocar, girar, mover, guardar ---------- */
  /* decorar: a câmera sobe e abre (vista de cima, pra ver o cômodo inteiro); Pronto volta pra terceira pessoa */
  function decorar(on){
    if(!S.meu) return;
    if(on){ if(S.modo === 'andar'){ S.camAnt = { ph: S.cam.ph, dist: S.cam.dist }; S.cam.ph = Math.max(S.cam.ph, .95); S.cam.dist = Math.max(S.cam.dist, S.emPe ? 10 : 11); } S.modo = 'decorar'; S.sel = -1; S.cacheItens = null; }
    else { if(S.modo === 'colocar') cancelaGhost(); S.modo = 'andar'; S.sel = -1; S.cacheItens = null; salvaLogo(); if(S.camAnt){ S.cam.ph = S.camAnt.ph; S.cam.dist = S.camAnt.dist; S.camAnt = null; } }
    barra();
  }
  function seleciona(i){ S.sel = i; S.cacheItens = null; barra(); }
  /* a loja: coleções (as de parede e de teto juntam o que encosta na parede e o que pendura no teto, de qualquer coleção) */
  const daLoja = c => (c === 'parede' ? ITENS.filter(i => i.parede) : c === 'teto' ? ITENS.filter(i => i.teto) : ITENS.filter(i => i.cat === c));
  const etiquetaItem = it => { const t = []; if(it.luxo) return 'Em breve'; if(it.cores) t.push(it.cores.length + ' cores'); if(it.anima) t.push('mexe'); if(it.acao) t.push(it.acao === 'jogo' ? 'joga' : it.acao === 'discos' ? 'toca' : it.acao === 'roupa' ? 'troca a skin' : 'pega'); if(it.parede) t.push('parede'); if(it.teto) t.push('teto'); return t.join(' · ') || 'grátis'; };
  function loja(cat){
    if(!S.meu) return;
    const c = cat || S.lojaCat || 'sala'; S.lojaCat = c;
    const lista = daLoja(c), total = ITENS.filter(i => !i.luxo).length;
    const nota = c === 'luxo' ? 'Os de luxo chegam em breve, com a Grana da casa. Por enquanto é só olhar.' : c === 'parede' ? 'Esses encostam sozinhos na parede mais perto de onde você toca.' : c === 'teto' ? 'Esses penduram no teto: dá pra pôr em cima de qualquer coisa.' : 'Tudo de graça. Toca num móvel, escolhe o lugar, a cor e confirma.';
    C.sheet(`<div class="form cs-loja"><div class="sheet-head"><h2>${ico('home')} Loja da casa <small class="cs-loja-n">${total} móveis</small></h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <div class="mu-tabs cs-cats" role="tablist" aria-label="Coleções">${CAT.map(([k, t]) => `<button type="button" role="tab" data-act="cs-cat" data-k="${k}" aria-selected="${k === c}">${t}</button>`).join('')}</div>
      <p class="note">${nota}</p>
      <div class="cs-grid">${lista.map(i => `<button type="button" class="cs-item${i.luxo ? ' luxo' : ''}" data-act="cs-pega" data-k="${i.k}"${i.luxo ? ' disabled' : ''}><canvas width="112" height="96" aria-hidden="true" data-k="${i.k}"></canvas><b>${esc(i.nome)}</b><small>${esc(etiquetaItem(i))}</small></button>`).join('')}</div></div>`, 'wide');
    const cvs = [...document.querySelectorAll('.cs-item canvas')];
    /* as miniaturas são desenhadas aos poucos, pra folha abrir na hora */
    const desenha = () => { const lote = cvs.splice(0, 8); lote.forEach(cv => miniatura(cv, ITEM[cv.dataset.k], S.corUlt[cv.dataset.k] || 0)); if(cvs.length && cvs[0].isConnected) requestAnimationFrame(desenha); };
    desenha();
  }
  /* a prévia de um móvel: a mesma cena, com a câmera parada num cantinho (de parede e de teto a câmera olha de frente) */
  function miniatura(cv, it, ci, olhar){
    if(!it) return;
    const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, cv.width, cv.height);
    const bl = M.blocos(it, ci || 0).concat(M.anima(it, { t: 0, nivel: .5, tocando: true, h: 10, m: 10, s: 20 }, ci || 0, 0));
    const y0 = Math.min(...bl.map(b => b.y)), y1 = Math.max(...bl.map(b => b.y + b.h)), tam = Math.max(it.w, it.d, (y1 - y0) * .9, 1.2);
    const camAnt = S.cam; S.cam = Object.assign({ th: it.parede ? .25 : .7, ph: it.teto ? .12 : it.parede ? .22 : .62, dist: tam * 1.55 + .7, tx: it.w / 2, ty: y0 + (y1 - y0) * (it.teto ? .5 : .36), tz: it.d / 2, fov: 42 * Math.PI / 180 }, olhar || {});
    const cam = camera(cv); S.cam = camAnt;
    const sol = cola(bl.map(b => solido(b, null, b.c, null)), bl, 0);
    const pisos = it.teto ? [] : [{ x0: -.2, z0: -.2, x1: it.w + .2, z1: it.d + .2, c: 'rgba(15,18,24,.08)' }];
    if(it.parede) sol.push(solido({ x: -.3, y: 0, z: -.1, w: it.w + .6, h: Math.max(2.6, y1 + .3), d: .1, c: PAREDE }, null, PAREDE, null, { semTraco: true }));
    cena(ctx, cv, cam, pisos, sol, null);
  }
  function pega(k){
    const it = ITEM[k]; if(!it || it.luxo || !S.meu) return;
    if(S.itens.length >= MAX_ITENS){ C.toast(`A casa tá cheia: até ${MAX_ITENS} móveis.`); return; }
    C.closeSheet();
    const e = S.eu, p = pegadaDe(it, 0);
    S.modo = 'colocar'; S.sel = -1; S.cacheItens = null;
    S.ghost = { k, x: 0, z: 0, r: 0, n: e ? nivelDe(e.y) : 0, c: it.cores ? (S.corUlt[k] || 0) : 0, ok: false, de: -1 };
    poeGhost((e ? e.x : 10) - p.w / 2 + Math.sin(S.cam.th) * -1.6, (e ? e.z : 16) - p.d / 2 + Math.cos(S.cam.th) * -1.6);
    barra(); C.toast(it.parede ? 'Toca perto de uma parede: ele encosta nela sozinho.' : it.teto ? 'Toca onde ele pendura e confirma.' : 'Toca no chão pra escolher o lugar, gira se precisar e confirma.', 3200);
  }
  function cabe(it, x, z, r, ignora, n){
    const p = pegadaDe(it, r); n = n ? 1 : 0;
    if(x < 0 || z < 0 || x + p.w > W || z + p.d > D) return false;
    const c = comodoDe(x + .01, z + .01, n); if(!c) return false;
    if(x + p.w > c.x1 + 1e-6 || z + p.d > c.z1 + 1e-6) return false;
    if(n && !(PL.mezanino && noMezanino(x, z) && noMezanino(x + p.w, z + p.d))) return false;
    if(n && PL.escada && x + p.w > PL.escada.x0 - .3 && z + p.d > PL.escada.z0 - 1) return false;
    if(semChao(it)) return true;
    if(!n && naSoleira(x, z, p.w, p.d)) return false;
    const cruza = (ax, az, aw, ad) => x < ax + aw && x + p.w > ax && z < az + ad && z + p.d > az;
    const nivelFixo = e => ((e.y || 0) > 1.5 ? 1 : 0);
    if(S.fixos.some(e => !e.parede && nivelFixo(e) === n && cruza(e.x, e.z, e.w, e.d))) return false;
    if(S.decor.some(e => nivelFixo(e) === n && pegadasDecor(e).some(q => cruza(q.x, q.z, q.w, q.d)))) return false;
    if(S.itens.some((i, idx) => { if(idx === ignora || (i.n ? 1 : 0) !== n) return false; const o = ITEM[i.k]; if(!o || semChao(o)) return false; const q = pegadaDe(o, i.r); return cruza(i.x, i.z, q.w, q.d); })) return false;
    if(S.eu && nivelDe(S.eu.y) === n && cruza(S.eu.x - .3, S.eu.z - .3, .6, .6)) return false;
    return true;
  }
  /* as paredes que valem pra encostar num andar (no mezanino, só as que passam dele) */
  const paredesDe = n => PAREDES.filter(p => !p.grade && (!n || !PL.mezanino || (p.alt || ALT) > PL.mezanino.y + .5));
  /* encosta um móvel de parede na parede mais perto do ponto (centro do móvel): posição rente, de frente pro cômodo,
     deslizando ao longo dela de 1/4 em 1/4. Em cima de porta não dá. Longe de parede (mais de 2 m), fica onde tá, sem caber */
  function encosta(it, px, pz, n){
    let melhor = null;
    paredesDe(n).forEach(p => {
      const [ax, az] = p.a, [bx, bz] = p.b, L = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / L, dz = (bz - az) / L;
      let t = (px - ax) * dx + (pz - az) * dz; t = Math.max(it.w / 2, Math.min(L - it.w / 2, t));
      const fx = ax + dx * t, fz = az + dz * t, dist = Math.hypot(px - fx, pz - fz);
      if(dist > 2 || (melhor && dist >= melhor.dist)) return;
      melhor = { p, t, fx, fz, dist, L, dx, dz };
    });
    if(!melhor) return null;
    const { p, dx, dz } = melhor, t = Math.round(melhor.t * 4) / 4, fx = p.a[0] + dx * t, fz = p.a[1] + dz * t;
    const lado = Math.abs(dx) > .5 ? Math.sign(pz - fz) || 1 : Math.sign(px - fx) || 1, folga = ESP / 2;
    let x, z, r;
    if(Math.abs(dx) > .5){ r = lado > 0 ? 0 : 2; x = fx - it.w / 2; z = lado > 0 ? fz + folga : fz - folga - it.d; }
    else { r = lado > 0 ? 1 : 3; z = fz - it.w / 2; x = lado > 0 ? fx + folga : fx - folga - it.d; }
    const porta = (p.portas || []).some(g => t + it.w / 2 > g[0] && t - it.w / 2 < g[1]);
    return { x: Math.round(x * 20) / 20, z: Math.round(z * 20) / 20, r, porta };
  }
  function poeGhost(x, z){
    const g = S.ghost; if(!g) return; const it = ITEM[g.k];
    if(it.parede){
      const p0 = pegadaDe(it, g.r), e = encosta(it, x + p0.w / 2, z + p0.d / 2, g.n);
      if(e){ g.x = e.x; g.z = e.z; g.r = e.r; g.ok = !e.porta && cabe(it, g.x, g.z, g.r, g.de, g.n); } else { g.x = Math.round(x * 2) / 2; g.z = Math.round(z * 2) / 2; g.ok = false; }
      barra(); return;
    }
    const p = pegadaDe(it, g.r);
    g.x = Math.round(x * 2) / 2; g.z = Math.round(z * 2) / 2;
    g.x = Math.max(0, Math.min(W - p.w, g.x)); g.z = Math.max(0, Math.min(D - p.d, g.z));
    g.ok = cabe(it, g.x, g.z, g.r, g.de, g.n); barra();
  }
  /* o toque no chão é o centro do móvel (no andar onde o toque caiu) */
  function ghostNoChao(ch){ const g = S.ghost; if(!g) return; if(ch.n != null) g.n = ch.n ? 1 : 0; const p = pegadaDe(ITEM[g.k], g.r); poeGhost(ch.x - p.w / 2, ch.z - p.d / 2); }
  function giraGhost(){ const g = S.ghost; if(!g || ITEM[g.k].parede) return; g.r = (g.r + 1) & 3; poeGhost(g.x, g.z); }
  /* a cor: a próxima da lista do móvel (na sombra ou no móvel escolhido) */
  function corGhost(){ const g = S.ghost; if(!g) return; const it = ITEM[g.k]; if(!it.cores) return; g.c = (g.c + 1) % it.cores.length; S.corUlt[g.k] = g.c; barra(); }
  function corSel(){ const o = S.itens[S.sel]; if(!o) return; const it = ITEM[o.k]; if(!it.cores) return; o.c = ((o.c || 0) + 1) % it.cores.length; S.corUlt[o.k] = o.c; S.cacheItens = null; S.sujo = true; salvaLogo(); barra(); }
  function colocaGhost(){
    const g = S.ghost; if(!g || !g.ok){ if(g) C.toast(ITEM[g.k].parede ? 'Aqui não encosta. Toca mais perto de uma parede (fora da porta).' : 'Não cabe aí. Tenta outro lugar do cômodo.'); return; }
    const novo = { k: g.k, x: g.x, z: g.z, r: g.r, n: g.n ? 1 : 0, c: g.c || 0 };
    if(g.de >= 0) S.itens[g.de] = novo; else S.itens.push(novo);
    S.corUlt[g.k] = g.c || 0;
    S.ghost = null; S.modo = 'decorar'; S.sel = -1; S.cacheItens = null; montaGrade(); S.sujo = true; salvaLogo(); barra();
  }
  function cancelaGhost(){
    const g = S.ghost; if(!g) return;
    if(g.de >= 0 && g.orig) S.itens.splice(g.de, 0, g.orig);
    /* v3.55: o móvel que tava sendo movido volta pro lugar (Esc, voltar do celular e fechar a casa apagavam ele) */
    if(g.volta) S.itens.splice(g.volta.i, 0, g.volta.o);
    S.ghost = null; S.modo = 'decorar'; S.cacheItens = null; montaGrade(); barra();
  }
  function moveSel(){
    const i = S.sel, o = S.itens[i]; if(!o) return;
    S.itens.splice(i, 1); S.cacheItens = null; montaGrade();
    S.modo = 'colocar'; S.ghost = { k: o.k, x: o.x, z: o.z, r: o.r, n: o.n ? 1 : 0, c: o.c || 0, ok: true, de: -1, orig: null, volta: { i, o } };
    poeGhost(o.x, o.z); S.sel = -1; barra();
  }
  function giraSel(){ const o = S.itens[S.sel]; if(!o) return; const it = ITEM[o.k]; if(it.parede) return; const r = (o.r + 1) & 3; if(!cabe(it, o.x, o.z, r, S.sel, o.n)){ C.toast('Girado assim não cabe aí.'); return; } o.r = r; S.cacheItens = null; montaGrade(); S.sujo = true; salvaLogo(); }
  function guardaSel(){ if(S.sel < 0) return; S.itens.splice(S.sel, 1); S.sel = -1; S.cacheItens = null; montaGrade(); S.sujo = true; salvaLogo(); barra(); C.toast('Guardado. Tá na loja de novo quando quiser.'); }
  function guardaTudo(){ if(!S.meu || !S.itens.length) return; if(!confirm('Guardar todos os móveis da casa? Eles voltam pra loja; a casa fica vazia.')) return; S.itens = []; S.sel = -1; S.cacheItens = null; montaGrade(); S.sujo = true; salvaLogo(); barra(); C.toast('Casa vazia. Agora é só decorar.'); }
  const botaoCor = (it, c) => (it && it.cores ? `<button type="button" class="btn sm cs-cor" data-act="cs-cor"><i class="cs-cor-dot" style="--c:${it.cores[c || 0][1]}"></i> ${esc(it.cores[c || 0][0])}</button>` : '');
  function barra(){
    const b = C.$('cs-bar'); if(!b) return;
    if(S.pad) S.pad.mostra(S.modo === 'andar'); b.classList.toggle('andar', S.modo === 'andar');
    if(!S.meu){ b.innerHTML = ''; return; }
    if(S.modo === 'colocar'){ const g = S.ghost, it = g && ITEM[g.k]; b.innerHTML = `<span class="cs-bar-t">${esc(it ? it.nome : '')}${g && !g.ok ? ` <em>${it && it.parede ? 'sem parede' : 'não cabe'}</em>` : ''}</span>${it && !it.parede ? `<button type="button" class="btn sm" data-act="cs-gira">${ico('troca')} Girar</button>` : ''}${botaoCor(it, g && g.c)}<button type="button" class="btn sm pri" data-act="cs-coloca"${g && g.ok ? '' : ' disabled'}>${ico('save')} Colocar</button><button type="button" class="btn sm ghost" data-act="cs-cancela">${ico('x')}</button>`; return; }
    if(S.modo === 'decorar'){
      if(S.sel >= 0){ const o = S.itens[S.sel], it = ITEM[o.k]; b.innerHTML = `<span class="cs-bar-t">${esc(it ? it.nome : '')}</span>${it && !it.parede ? `<button type="button" class="btn sm" data-act="cs-gira-sel">${ico('troca')} Girar</button>` : ''}${botaoCor(it, o.c)}<button type="button" class="btn sm" data-act="cs-move">${ico('mapa')} Mover</button><button type="button" class="btn sm ghost" data-act="cs-guarda">${ico('trash')} Guardar</button><button type="button" class="btn sm pri" data-act="cs-pronto">Pronto</button>`; return; }
      b.innerHTML = `<span class="cs-bar-t">Decorando${S.itens.length ? ` · ${S.itens.length} ${S.itens.length === 1 ? 'móvel' : 'móveis'}` : ''}</span><button type="button" class="btn sm pri" data-act="cs-loja">${ico('plus')} Loja</button><span class="cs-bar-h">Toca num móvel pra girar, mudar a cor, mover ou guardar.</span>${S.itens.length ? `<button type="button" class="btn sm ghost" data-act="cs-guarda-tudo" title="Guardar todos os móveis">${ico('trash')}</button>` : ''}<button type="button" class="btn sm" data-act="cs-pronto">Pronto</button>`; return;
    }
    b.innerHTML = `<button type="button" class="btn sm" data-act="cs-decorar">${ico('edit')} Decorar</button><button type="button" class="btn sm" data-act="cs-loja">${ico('plus')} Loja</button>`;
  }

  /* ---------- guardar no perfil ---------- */
  /* [móvel, x, z, giro] e, no andar de cima, um 1 no fim. Guarda de que planta são (pl): os móveis de uma planta não
     entram na outra (a casa que virou loft começa limpa; os móveis da planta antiga ficam em `outras`, caso ela volte) */
  const serial = () => { const o = { v: 1, pl: PL.k, i: S.itens.slice(0, MAX_ITENS).map(i => { const e = [i.k, Math.round(i.x * 20) / 20, Math.round(i.z * 20) / 20, i.r & 3]; if(i.c) e.push(i.n ? 1 : 0, i.c); else if(i.n) e.push(1); return e; }) }; if(S.outras && Object.keys(S.outras).length) o.outras = S.outras; return o; };
  const plantaSalva = casa => (casa && typeof casa === 'object' && typeof casa.pl === 'string' ? casa.pl : 'padrao');
  /* a soleira: ninguém põe móvel onde o boneco nasce */
  const naSoleira = (x, z, w, d) => x < ENTRADA.x + .8 && x + w > ENTRADA.x - .8 && z + d > ENTRADA.z - 1.9;
  function lerCasa(casa){
    const out = [];
    const bruto = casa && typeof casa === 'object' && Array.isArray(casa.i) && plantaSalva(casa) === PL.k ? casa.i : null;
    (bruto || PADRAO).slice(0, MAX_ITENS).forEach(e => {
      if(!Array.isArray(e)) return; let [k, x, z, r, n, c] = e;
      /* móvel com nome antigo (de antes da v3.30) vira o novo, na cor que era */
      if(!ITEM[k] && M.VELHOS[k]){ c = M.VELHOS[k][1]; k = M.VELHOS[k][0]; }
      const it = ITEM[k];
      if(!it || !Number.isFinite(x) || !Number.isFinite(z)) return;
      const rr = Number.isInteger(r) ? r & 3 : 0, p = pegadaDe(it, rr), nn = n === 1 ? 1 : 0, cc = it.cores && Number.isInteger(c) ? Math.max(0, Math.min(it.cores.length - 1, c)) : 0;
      if(x < 0 || z < 0 || x + p.w > W || z + p.d > D) return;
      if(nn && !(PL.mezanino && noMezanino(x, z) && noMezanino(x + p.w, z + p.d))) return;
      if(!nn && !semChao(it) && naSoleira(x, z, p.w, p.d)) return;
      out.push({ k, x: Math.round(x * 20) / 20, z: Math.round(z * 20) / 20, r: rr, n: nn, c: cc });
    });
    return out;
  }
  /* os móveis guardados de outras plantas (ficam no perfil, sem aparecer) */
  function outrasPlantas(casa){
    const o = {}; if(!casa || typeof casa !== 'object') return o;
    if(casa.outras && typeof casa.outras === 'object') Object.keys(casa.outras).slice(0, 4).forEach(k => { if(k !== PL.k && Array.isArray(casa.outras[k])) o[k] = casa.outras[k].slice(0, MAX_ITENS); });
    const pl = plantaSalva(casa); if(pl !== PL.k && Array.isArray(casa.i)) o[pl] = casa.i.slice(0, MAX_ITENS);
    return o;
  }
  function salvaLogo(){ if(!S.meu || !S.sujo) return; clearTimeout(S.salvaT); S.salvaT = setTimeout(salva, 700); }
  async function salva(){
    if(!S.meu || !S.sujo) return; S.sujo = false;
    try{ await C.saveMe({ casa: serial() }); }catch(e){ S.sujo = true; C.toast(C.errMsg(e, 'Não deu pra guardar a casa agora.')); }
  }

  /* ---------- abrir e fechar ---------- */
  function monta(){
    const el = document.createElement('div'); el.className = 'cs-casa'; el.id = 'cs-casa';
    el.innerHTML = `<canvas id="cs-cv" aria-label="Por dentro da casa. Toca onde quer ir; arrasta pra girar a câmera."></canvas><div class="cs-tags" id="cs-tags"></div>
      <div class="cs-top"><span class="cs-top-l"><button type="button" class="cvr-bc-b cs-sair" data-act="cs-sair">${ico('prev')}<span class="cs-sair-l" id="cs-sair-t">Sair pra rua</span><span class="cs-sair-c" aria-hidden="true">Sair</span></button><span class="cs-titulo"><b id="cs-titulo"></b><small id="cs-onde"></small></span><span class="cs-dica" id="cs-dica" role="status" hidden></span></span><span class="cs-top-r"><b class="cs-live" id="cs-live" hidden></b><button type="button" class="cvr-bc-b cs-disco-b" id="cs-disco-b" data-act="cs-disco-b" hidden></button><button type="button" class="cvr-bc-b cvr-som cs-som" id="cs-som" data-act="cvr-som" aria-pressed="false" hidden></button><button type="button" class="cvr-bc-b cs-mic" id="cs-mic" data-act="cs-mic" aria-pressed="false">${ico('micoff')}<span>Mic desligado</span></button><button type="button" class="cvr-bc-b cs-tela" id="cs-tela" data-act="cs-tela" aria-pressed="false" hidden></button></span></div>
      <div class="cs-cam"><button type="button" data-act="cs-cam" data-k="esq" title="Girar (Q)" aria-label="Girar a câmera pra esquerda">${ico('prev')}</button><button type="button" data-act="cs-cam" data-k="dir" title="Girar (E)" aria-label="Girar a câmera pra direita">${ico('next')}</button><button type="button" data-act="cs-cam" data-k="perto" aria-label="Aproximar">${ico('plus')}</button><button type="button" data-act="cs-cam" data-k="longe" aria-label="Afastar">${ico('down')}</button></div>
      <div class="cs-bar" id="cs-bar"></div>
      <button type="button" class="cs-porta" id="cs-porta" data-act="cs-porta" hidden></button><button type="button" class="cs-briga" id="cs-briga" data-act="cs-briga" hidden></button><div class="cs-pesca" id="cs-pesca" aria-live="polite" hidden></div>`;
    document.body.appendChild(el); S.el = el; S.cv = C.$('cs-cv'); S.ctx = S.cv.getContext('2d');
    /* v3.40: no celular, o controle de videogame (direcional + pular); o botão de som é o mesmo da cidade */
    if(C.pad && C.pad.toque()){ S.pad = C.pad.cria(el, { pula: () => (S.pesca ? puxa() : S.desafio ? dispara() : S.corrida ? (S.corrida.kart ? pulaKart(true) : null) : pulaCasa()), soltou: () => { if(S.corrida && S.corrida.kart) pulaKart(false); } }); el.classList.add('toque'); }
    if(C.versoSom && C.versoSom.botao) C.versoSom.botao(C.$('cs-som'));
    S.cv.addEventListener('pointerdown', pointerDown); S.cv.addEventListener('pointermove', pointerMove); S.cv.addEventListener('pointerup', pointerUp); S.cv.addEventListener('pointercancel', pointerUp);
    S.cv.addEventListener('wheel', roda, { passive: false });
    addEventListener('keydown', tecla); addEventListener('keyup', tecla); addEventListener('blur', soltar); addEventListener('resize', tamanho);
    tamanho();
  }
  /* ---------- v3.88 · a tela cheia ----------
     O Thales: "implementa o modo full screen quando acessar o 3d e veja a melhor forma do usuário voltar pra tela".
     Entrou num 3D (casa, lugar ou pista), a página inteira vai pra tela cheia do navegador: some a barra de endereço e,
     no celular, a do sistema. É a página toda, e não só o 3D, pra folha, aviso e balcão continuarem aparecendo por
     cima. O pedido sai no próprio toque de entrar (o navegador só deixa assim), antes de qualquer espera.
     Pra voltar: o Sair, sempre escrito, no alto à esquerda (o lugar do "voltar" em todo app), o voltar do celular ou
     o Esc no computador. O navegador gasta o primeiro Esc (e o primeiro voltar do Android) tirando a tela cheia: o 3D
     fica, e o botão dos cantos põe de novo. Saiu do 3D, sai da tela cheia junto (trocar de um lugar pro outro não sai).
     Nas três primeiras vezes, um balão em cima do Sair mostra por onde volta. No iPhone o navegador não deixa (lá só
     vídeo vai pra tela cheia; o app instalado já ocupa a tela toda) e o botão nem aparece. Quem tirou pelo botão fica
     sem tela cheia nas próximas (corre-3d-tela) */
  const DICA_K = 'corre-3d-dica', T = C.tela;
  /* v3.89: quem pede e tira a tela cheia agora mora no core.js (C.tela), pra casa e jogos usarem igual */
  const botaoTela = () => T.botao(C.$('cs-tela'));
  T.ouve(botaoTela);
  /* o balão que mostra por onde volta, nas três primeiras vezes */
  function dicaSair(){
    let n = 0; try{ n = parseInt(localStorage.getItem(DICA_K), 10) || 0; }catch(e){} if(n >= 3) return;
    try{ localStorage.setItem(DICA_K, String(n + 1)); }catch(e){}
    const d = C.$('cs-dica'); if(!d) return; const toque = !!(S.el && S.el.classList.contains('toque'));
    d.textContent = toque ? 'Pra voltar, é aqui (ou o voltar do celular)' : 'Pra voltar, é aqui (ou Esc)';
    /* no celular o aviso de boas-vindas fica no alto, por cima do Sair: o balão espera ele sair, e empurra o Decorar pra baixo */
    const some = () => { d.classList.add('some'); S.dicaT = setTimeout(() => { d.hidden = true; if(S.el) S.el.classList.remove('dica-on'); }, 400); };
    clearTimeout(S.dicaT); S.dicaT = setTimeout(() => { if(!S.aberta) return; d.hidden = false; d.classList.remove('some'); if(S.el) S.el.classList.add('dica-on'); S.dicaT = setTimeout(some, toque ? 6500 : 7000); }, toque ? 3600 : 0);
  }
  /* abrir: se der qualquer erro, avisa na tela (em vez de ficar em silêncio) */
  async function abrir(o){
    if(T.quer()) T.poe('3d');
    try{ await abrirMesmo(o); if(!S.aberta) T.tira('3d'); }
    catch(e){ T.tira('3d'); try{ console.error('[casa] abrir', e); }catch(_){} S.aberta = false; if(S.el) S.el.hidden = true; C.toast('Não deu pra abrir a casa: ' + String((e && e.message) || e).slice(0, 120), 6000); }
  }
  const comTempo = (p, ms) => Promise.race([p, new Promise(r => setTimeout(r, ms))]);
  async function abrirMesmo(o){
    o = o || {}; if(S.aberta) fechar(true, true);
    if(!C.st.me || !C.verso) return;
    /* v3.45: um lugar (a Casa do Hórus) não é de ninguém: o "dono" é o próprio lugar, e a sala da presença leva o nome dele */
    const L = o.lugar && LUGARES[o.lugar] ? LUGARES[o.lugar] : null;
    const meu = !L && (!o.id || o.id === C.st.me.id);
    let dono = C.st.me;
    if(L) dono = { id: 'lugar-' + o.lugar, handle: '', casa: null };
    else if(!meu){
      try{ dono = await comTempo(C.api.one('corre_perfis', { eq: { id: o.id } }), 6000); }catch(e){ dono = null; }
      if(!dono){ C.toast('Não deu pra abrir essa casa agora.'); return; }
    } else if(C.recarregaMe){ try{ await comTempo(C.recarregaMe(), 4000); dono = C.st.me; }catch(e){} }
    S.meu = meu; S.lugar = L ? o.lugar : ''; S.dono = dono; S.sujo = false;
    usaPlanta(L ? L.planta : plantaDe(dono)); S.decor = PL.decor || [];
    S.fixos = L ? L.estacoes() : ESTACOES.filter(e => paraDono(e, dono)).map(e => Object.assign({ y: 0 }, e, (PL.estacoes || {})[e.id] || {}));
    S.itens = L ? lerCasa({ pl: PL.k, i: L.itens || [] }) : lerCasa(dono.casa); S.outras = L ? {} : outrasPlantas(dono.casa);
    S.modo = 'andar'; S.sel = -1; S.ghost = null; S.cacheItens = null; S.alvo = null; S.acao = null; S.rota = []; S.teclas.clear(); S.tags.clear(); S.ultOnde = ''; S.disco = null; S.discoAtual = ''; S.avisouErro = false;
    const emPe = innerWidth < innerHeight * .85; S.emPe = emPe; S.arrastou = 0;
    /* terceira pessoa: a câmera fica logo atrás e um pouco acima do boneco (pinça, roda ou os botões afastam) */
    S.cam = Object.assign(S.cam, { th: 0, ph: emPe ? .62 : .56, dist: emPe ? 6.2 : 6.8, tx: ENTRADA.x, ty: 1.1, tz: ENTRADA.z - 1.1 });
    /* v3.77: lugar de rua (o Calçadão) começa com a câmera mais baixa, pra ver os prédios */
    if(PL.cam) Object.assign(S.cam, PL.cam, emPe ? { ph: PL.cam.ph + .06 } : {});
    const av = C.verso.avLimpo(meu ? C.st.me.verso : (C.st.me.verso), C.st.me.id);
    S.eu = null; montaGrade();
    const nasce = livrePerto(ENTRADA.x, ENTRADA.z - 1.1, 0);
    S.eu = { x: nasce[0], z: nasce[1], y: 0, yaw: Math.PI, passo: 0, andando: false, av };
    S.calc = L && L.calc ? calcCria() : null;
    if(!S.el || !S.el.isConnected) monta(); else { S.el.hidden = false; C.$('cs-tags').innerHTML = ''; tamanho(); if(C.versoSom && C.versoSom.botao) C.versoSom.botao(C.$('cs-som')); }
    const pc = C.$('cs-porta'); if(pc){ pc.hidden = true; pc.dataset.txt = ''; } const pb = C.$('cs-briga'); if(pb){ pb.hidden = true; pb.dataset.txt = ''; }
    const nomeC = L ? L.titulo : meu ? 'Tua casa' : 'Casa de @' + (dono.handle || '');
    C.$('cs-titulo').textContent = nomeC;
    const st = C.$('cs-sair-t'); if(st) st.textContent = L ? L.sai || 'Sair pra Feira' : 'Sair pra rua';
    S.titulo = document.title; document.title = nomeC + ' · Correverso';
    barra();
    if(comBicho() && S.kartBicho == null){ let b = null; try{ b = parseInt(localStorage.getItem('corre-kart-bicho'), 10); }catch(e){} if(bichoOk(b)){ S.kartBicho = b; S.kartBichoT = Math.floor(Date.now() / 1000) % 1e8; } }
    if(PL && PL.banner) setTimeout(() => { if(S.aberta && PL && PL.banner) bannerPubli(PL.banner); }, 1800);
    S.resT = performance.now(); S.resMed = null; S.aberta = true; S.tAnt = 0;
    if(!S.hist){ try{ history.pushState({ cvrCasa: 1 }, ''); S.hist = true; }catch(e){} }
    if(C.verso.anunciar) C.verso.anunciar();
    botaoTela(); dicaSair();
    cancelAnimationFrame(S.raf); S.raf = requestAnimationFrame(laco);
    C.toast(L ? L.ola : meu ? (PL.mezanino ? 'O escritório é lá em cima: sobe pela escada.' : 'Bem-vindo em casa. No escritório, cada móvel é uma ferramenta do Corre.') : `Casa de @${dono.handle || ''}. Só pra olhar.`, L ? 5200 : 3400);
  }
  /* fica: trocando de um 3D pro outro (a tela cheia continua) */
  function fechar(semHist, fica){
    if(!S.aberta) return;
    if(!fica) T.tira('3d');
    const dc = C.$('cs-dica'); if(dc){ clearTimeout(S.dicaT); dc.hidden = true; } if(S.el) S.el.classList.remove('dica-on');
    if(S.modo === 'colocar') cancelaGhost();
    S.aberta = false; S.lugar = ''; cancelAnimationFrame(S.raf); S.raf = 0; S.teclas.clear(); S.padTh = null; S.perto = null; if(S.pad) S.pad.solta();
    S.disco = null; S.discoAtual = ''; S.ouvindo = ''; S.pesca = null; if(S.corrida) somPara(); S.corrida = null; S.desafio = null; S.bsb = null; S.distPesca = null; S.kartVivo = null; S.calc = null; if(C.beats) C.beats.para();
    const pq = C.$('cs-pesca'); if(pq) pq.hidden = true;
    clearTimeout(S.salvaT); if(S.sujo) salva();
    if(S.el){ S.el.hidden = true; }
    S.tags.clear(); const tg = C.$('cs-tags'); if(tg) tg.innerHTML = '';
    if(S.titulo){ document.title = S.titulo; S.titulo = ''; }
    if(S.hist){ S.hist = false; if(!semHist){ S.ignora = Date.now(); try{ history.back(); }catch(e){ S.ignora = 0; } } }
    if(C.verso && C.verso.anunciar) C.verso.anunciar();
    if(C.verso && C.verso.retoma) C.verso.retoma();
  }
  addEventListener('popstate', e => {
    if(!S.aberta) return;
    if(S.ignora && Date.now() - S.ignora < 1500){ S.ignora = 0; return; }
    /* voltou só do balcão (o estado da casa ainda tá na história): a casa fica */
    if(e.state && e.state.cvrCasa) return;
    S.hist = false; fechar(true);
  });

  Object.assign(C.acts, {
    'cs-sair': () => fechar(),
    /* v3.88: o botão dos cantos (pôr e tirar a tela cheia); a escolha fica no aparelho */
    'cs-tela': () => T.alterna('3d'),
    'cs-enigma-outro': () => enigmaSheet(),
    'cs-porta': () => acaoPerto(),
    'cs-briga': () => empurraCalc(),
    'cs-ia-quero': async el => { el.disabled = true; try{ const f = Object.assign({}, (C.st.me && C.st.me.ferramentas) || {}, { ia: 'lista' }); await C.saveMe({ ferramentas: f }); C.toast('Tá na lista do Computador IA. A gente te chama.', 3600); iaSheet(); }catch(e){ el.disabled = false; C.toast(C.errMsg(e)); } },
    'cs-mic': () => { if(C.acts['cvr-mic']) C.acts['cvr-mic'](); },
    'cs-publi': el => { if(C.verso && C.verso.publiSheet) C.verso.publiSheet(el.dataset.k); },
    'cs-bicho': el => { escolheBicho(Number(el.dataset.i)); bichoSheet(); },
    'cs-larga': el => larga(el.dataset.k),
    'cs-pista': el => { const k = el.dataset.k; if(!LUGARES[k]) return; C.closeSheet(); abrir({ lugar: k }); },
    /* v3.62: escolheu o veículo no Autódromo: guarda e larga */
    'cs-veic': el => { const v = VEIC_AUTO.find(x => x.k === el.dataset.k); if(!v || !autodromo() || S.corrida) return; S.veicAuto = v.k; try{ localStorage.setItem('corre-autodromo', v.k); }catch(e){} C.closeSheet(); largarKart(pistaAqui(), null); },
    'cs-cam': el => { const k = el.dataset.k; S.arrastou = Date.now(); if(k === 'esq') S.cam.th += Math.PI / 4; else if(k === 'dir') S.cam.th -= Math.PI / 4; else if(k === 'perto') S.cam.dist = Math.max(PERTAO, S.cam.dist - 1.5); else S.cam.dist = Math.min(LONGE(), S.cam.dist + 1.5); },
    'cs-tag': el => { const k = el.dataset.k; if(k === 'saida'){ vaiSair(); return; } if(k.startsWith('fala:') && S.calc){ const n = S.calc.gente[Number(k.slice(5))]; if(n) vaiFalar(n); return; } if(k.startsWith('acao:')){ const a = acoes().find(x => x.id === k.slice(5)); if(a) vaiNaAcao(a); return; } const e = S.fixos.find(x => 'est:' + x.id === k); if(e) vaiNaEstacao(e); },
    'cs-ag-trocar': () => agentesSheet(),
    'cs-ag-escolhe': el => escolheAgente(el.dataset.k),
    'cs-ag-grana': () => { C.closeSheet(); const e = S.fixos.find(x => x.id === 'grana'); if(e) abreEstacao(e); },
    'cs-ag-lista': async el => { el.disabled = true; try{ const f = Object.assign({}, (C.st.me && C.st.me.ferramentas) || {}, { robo: 'lista' }); await C.saveMe({ ferramentas: f }); C.toast('Tá na lista do robô. A gente te chama quando abrir.', 3600); agenteSheet(); }catch(e){ el.disabled = false; C.toast(C.errMsg(e)); } },
    'cs-disco': el => poeDisco(el.dataset.k),
    'cs-sebo-ouvir': el => seboOuvir(el.dataset.k),
    'cs-sebo-leva': el => seboLeva(el.dataset.k),
    'cs-disco-para': () => poeDisco(''),
    'cs-disco-b': () => discosSheet(),
    'cs-decorar': () => decorar(true),
    'cs-pronto': () => decorar(false),
    'cs-loja': () => loja(),
    'cs-cat': el => loja(el.dataset.k),
    'cs-pega': el => pega(el.dataset.k),
    'cs-gira': () => giraGhost(),
    'cs-coloca': () => colocaGhost(),
    'cs-cancela': () => cancelaGhost(),
    'cs-gira-sel': () => giraSel(),
    'cs-move': () => moveSel(),
    'cs-guarda': () => guardaSel(),
    'cs-guarda-tudo': () => guardaTudo(),
    'cs-cor': () => { if(S.modo === 'colocar') corGhost(); else corSel(); }
  });
  /* onde um ponto do mundo cai na tela (em px da página; os testes usam) */
  const tela = (x, y, z) => { if(!S.cv) return null; const q = proj(camera(S.cv), [x, y, z]); if(!q) return null; const r = S.cv.getBoundingClientRect(); return { x: r.left + q[0] / S.cv.width * r.width, y: r.top + q[1] / S.cv.height * r.height }; };
  /* a prévia da casa (na porta, antes de entrar): a casa inteira vista de cima e da frente, as paredes de fora baixinhas, como uma maquete */
  function previa(cv, dono){
    if(!cv || !C.verso) return;
    /* v3.55: o dono da prévia também (o agente da mesa era o da última casa aberta, não o de quem é a porta) */
    const guarda = { PL, fixos: S.fixos, decor: S.decor, itens: S.itens, eu: S.eu, cache: S.cacheItens, cacheFraco: S.cacheFraco, cam: S.cam, ghost: S.ghost, lw: S.lw, dono: S.dono };
    try{
      usaPlanta(plantaDe(dono)); S.decor = PL.decor || []; S.dono = dono;
      S.fixos = ESTACOES.filter(e => paraDono(e, dono)).map(e => Object.assign({ y: 0 }, e, (PL.estacoes || {})[e.id] || {}));
      S.itens = lerCasa(dono && dono.casa); S.eu = null; S.cacheItens = null; S.ghost = null;
      const r = cv.getBoundingClientRect(), rp = resMax(), cw = Math.max(120, Math.round((r.width || 360) * rp)), chh = Math.max(70, Math.round((r.height || 200) * rp)); S.lw = Math.max(1, rp * 1.15);
      if(cv.width !== cw || cv.height !== chh){ cv.width = cw; cv.height = chh; }
      const asp = cw / chh, fov = 44 * Math.PI / 180, hfov = 2 * Math.atan(Math.tan(fov / 2) * asp);
      S.cam = { th: .28, ph: .78, dist: Math.max(W * 1.08 / 2 / Math.tan(hfov / 2) / Math.cos(.78) * .94, 12), tx: W / 2, ty: PL.mezanino ? 1.4 : .5, tz: D * .52, fov };
      const cam = camera(cv), ctx = cv.getContext('2d');
      const g = ctx.createLinearGradient(0, 0, 0, cv.height); g.addColorStop(0, '#0B1430'); g.addColorStop(.55, '#1B2A5A'); g.addColorStop(1, '#2B2F38');
      ctx.fillStyle = g; ctx.fillRect(0, 0, cv.width, cv.height);
      const pisos = pisosDaCasa(), extras = []; pisos.push(...sombras(extras));
      cena(ctx, cv, cam, pisos, [...solidosParedes(cam), ...solidosAndares(), ...solidosFixos(), ...solidosItens(), ...extras], null);
    }catch(e){ try{ console.error('[casa] prévia', e); }catch(_){} }
    finally{ usaPlanta(guarda.PL); S.fixos = guarda.fixos; S.decor = guarda.decor; S.itens = guarda.itens; S.eu = guarda.eu; S.cacheItens = guarda.cache; S.cacheFraco = guarda.cacheFraco; S.cam = guarda.cam; S.ghost = guarda.ghost; S.lw = guarda.lw; S.dono = guarda.dono; }
  }
  C.casa = { abrir, fechar, escolhePista, aberta: () => S.aberta, estado: () => S, res: v => { S.resFixa = !!v; if(v) S.res = v; tamanho(); return S.res; },
    /* pros testes: anda até uma ação como o toque faria ('d3' = decoração 3, 'i0' = móvel 0) */
    vaiAcao: id => { const a = acoes().find(x => x.id === id); if(a) vaiNaAcao(a); return !!a; },
    /* v3.80, pros testes: anda até uma ferramenta (pela escada, se for no mezanino), como o toque nela */
    vaiEstacao: id => { const e = (S.fixos || []).find(f => f.id === id); if(e) vaiNaEstacao(e); return !!e; }, ITENS, CAT, ESTACOES, encosta, alturaItem: (it, i) => alturaItem(it, i), COMODOS: () => COMODOS, planta: () => PL, plantaDe, lerCasa, miniatura, tela, serial, previa, acoes, disco: () => S.disco, discoAtual: () => S.discoAtual, poeDisco, AGENTES, agenteDe: () => agenteDe(S.dono),
    sala: () => (S.aberta && S.dono ? String(S.dono.id || '') : ''), lugar: () => (S.aberta ? S.lugar || '' : ''), LUGARES,
    camisa: () => camisaSharks(),
    placar: () => (S.aberta && S.lugar === 'pesca' && S.placar && S.placar.r === rodadaAgora() ? { c: Math.round(S.placar.kg * 100), r: S.placar.r % 1e6 } : null), quadra: () => { const Q = quadraAqui(); if(!Q) return null; return { qp: melhorQuadra(Q), qd: diaBR() % 1e5 }; },
    corrida: () => { const P = pistaAqui(); if(!P) return null; const m = melhorHoje(P); return { tc: m ? Math.round(m / 10) : 0, td: diaBR() % 1e5, tv: P.tv || 0 }; },
    pos: () => (S.aberta && S.eu ? Object.assign({ x: S.eu.x, y: S.eu.y || 0, z: S.eu.z, yaw: S.eu.yaw, sit: S.eu.sit ? 1 : 0, andando: !!(S.eu.andando || (S.corrida && Math.abs(S.eu.vel || 0) > .3)), mt: S.corrida ? VEIC_TV[S.corrida.P.veic] || 0 : 0 }, kartPos()) : null), gente,
    /* v3.53: a corrida ao vivo (o bicho na presença, os eventos da sala) */
    kartMeta: () => (S.aberta && comBicho() && bichoOk(S.kartBicho) ? { kp: S.kartBicho, kpt: S.kartBichoT || 0 } : null), kartEvento };
  /* o que vai no movimento durante a corrida ao vivo: o bicho, quanto andou e a chegada */
  function kartPos(){
    if(!comBicho() || !bichoOk(S.kartBicho)) return {};
    const R = S.corrida, o = { kp: S.kartBicho };
    if(R && R.kart && R.vivo){ o.kl = R.vivo.id; o.kg = Math.round(R.prog * 10); if(R.fim) o.kf = Math.round(R.total / 10); }
    return o;
  }
})();
