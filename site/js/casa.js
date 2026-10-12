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
  const escurece = (hex, f) => { const [r, g, b] = rgbDe(hex); const h = n => Math.max(0, Math.min(255, Math.round(n * f))).toString(16).padStart(2, '0'); return '#' + h(r) + h(g) + h(b); };

  /* ---------- os móveis: o catálogo mora em moveis.js (C.moveis); aqui ficam só os ajudantes da decoração fixa ---------- */
  const M = C.moveis, ITENS = M.ITENS, ITEM = M.ITEM, CAT = M.CAT;
  const pes = (w, d, h, c) => [B(.08, 0, .08, .14, h, .14, c), B(w - .22, 0, .08, .14, h, .14, c), B(.08, 0, d - .22, .14, h, .14, c), B(w - .22, 0, d - .22, .14, h, .14, c)];
  const cadeira = c => [B(.2, .45, .2, .6, .06, .6, c), B(.2, .51, .2, .6, .5, .08, c), B(.22, 0, .22, .07, .45, .07, MAD_E), B(.71, 0, .22, .07, .45, .07, MAD_E), B(.22, 0, .71, .07, .45, .07, MAD_E), B(.71, 0, .71, .07, .45, .07, MAD_E)];
  const mesaTrab = () => [B(0, .72, 0, 2, .06, 1, MAD), B(0, 0, .1, .08, .72, .8, MAD_E), B(1.92, 0, .1, .08, .72, .8, MAD_E), B(.7, .78, .3, .6, .4, .06, INK), B(.73, .81, .28, .54, .34, .02, CEU), B(.95, .78, .4, .1, .08, .1, INK), B(.6, .78, .62, .8, .03, .25, CINZA)];
  /* casa nova já vem com o básico (móvel, x, z, giro, andar, cor); a pessoa troca tudo depois */
  const PADRAO_PADRAO = [['sofa', 8, 17, 0, 0, 0], ['mesa_centro', 8, 15, 0, 0, 0], ['rack_tv', 8, 12.3, 0, 0, 0], ['tapete_listra', 7.5, 14, 0, 0, 1], ['planta', 1, 18, 0], ['luminaria', 11, 18, 0, 0, 2], ['poster', 1, 12.15, 0, 0, 0], ['neon_coracao', 14, 12.15, 0, 0, 0],
    ['cama_casal', 8, 4.5, 0, 0, 1], ['criado', 10, 4.5, 0], ['guarda_roupa', 7.4, 10.8, 0], ['tapete_quadrado', 10, 7.5, 0, 0, 2], ['poster', 11.5, 4.15, 0, 0, 2],
    ['geladeira', .4, 4.4, 0, 0, 0], ['fogao', 1.6, 4.4, 0], ['pia', 2.8, 4.4, 0], ['mesa_jantar', 2.5, 8, 0], ['cadeira', 1.5, 8.5, 1, 0, 1], ['cadeira', 4.5, 8.5, 3, 0, 1], ['balcao_cafe', 5.4, 4.4, 0],
    ['cadeira_praia', 2, 1, 0, 0, 0], ['mesa_redonda', 3.5, 1.2, 0], ['vaso', 17, .4, 0, 0, 2], ['pampa', 18.5, .4, 0]];

  /* ---------- o escritório: cada ferramenta é um móvel fixo ---------- */
  const ESTACOES = [
    { id: 'studio', titulo: 'Studio', rota: '#/studio', cor: AMARELO, x: 17.4, z: 4.35, w: 2, d: 1.9, bl: [...mesaTrab().map(b => Object.assign({}, b)), B(.65, .45, 1.1, .7, .1, .7, INK), B(.65, .55, 1.72, .7, .7, .12, INK), B(.75, .62, 1.7, .5, .5, .02, AMARELO), B(.9, 0, 1.3, .1, .45, .1, INK), B(.8, 0, 1.25, .4, .05, .4, CINZA)], tag: [1, 1.3, .3] },
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
  /* ---------- as plantas: a padrão (todo mundo) e o loft (a casa do @consanans) ---------- */
  const PLANTA_PADRAO = { k: 'padrao', W: 20, D: 20, ALT: 2.8, comodos: COMODOS_PADRAO, paredes: PAREDES_PADRAO, entrada: { x: 10, z: 20 }, padrao: PADRAO_PADRAO, tapete: { x: 9.3, z: 18.8, w: 1.4, d: 1 } };
  /* o loft: pé-direito duplo na sala, janelões de ferro, parede de tijolo, cozinha aberta com ilha, escada de concreto e o
     escritório inteiro no mezanino. Embaixo do mezanino: quarto, estúdio de som e closet. Tudo em 24 x 20. */
  const ociaL = c => [B(0, .3, 0, 1.8, .1, 1.8, c), Object.assign(B(0, .3, 0, 1.8, .1, 1.8, c), { yaw: Math.PI / 4 }), B(.6, 0, .6, .6, .3, .6, MAD_E)];
  const LOFT_DECOR = [
    /* sala: sofá modular preto com almofadas, sofá roxo, mesas redondas, tapete, luminária, pampas, lustre de tubos */
    { x: 3, z: 13.5, bl: [B(0, .12, 0, 4, .35, 1.1, INK), B(0, .47, 0, 4, .48, .3, '#1B1D22'), B(3, .12, 1.1, 1.1, .35, 1.3, INK), B(.3, .47, .35, .6, .32, .32, ROSA), B(1.2, .47, .35, .6, .32, .32, AMARELO), B(2.1, .47, .35, .6, .32, .32, LILAS), B(3.1, .47, .35, .6, .32, .32, PAPEL), B(3.1, .47, 1.3, .6, .3, .3, ROSA), ...pes(4, 1.1, .12, '#4A4E56')] },
    { x: .5, z: 9.2, bl: [B(0, .12, 0, 1.1, .35, 3.2, '#5B3D8A'), B(0, .47, 0, .3, .5, 3.2, '#4A2F70'), B(.35, .47, .3, .6, .3, .5, LILAS), B(.35, .47, 1.3, .6, .3, .5, ROSA), B(.35, .47, 2.3, .6, .3, .5, PAPEL), ...pes(1.1, 3.2, .12, '#4A4E56')] },
    { x: 5.2, z: 10.6, bl: ociaL(MAD) },
    { x: 7, z: 11.6, bl: [B(.3, .2, .3, 1.2, .08, 1.2, MAD), Object.assign(B(.3, .2, .3, 1.2, .08, 1.2, MAD), { yaw: Math.PI / 4 }), B(.7, 0, .7, .4, .2, .4, MAD_E)] },
    { x: 1.8, z: 9, piso: true, bl: [B(0, 0, 0, 8.5, .03, 6.5, '#D9C27F'), B(.3, .03, .3, 7.9, .006, 5.9, '#E3D1A0')] },
    { x: 10.8, z: 16.2, bl: [B(.3, 0, .3, .4, .06, .4, INK), B(.46, .06, .46, .08, 1.5, .08, INK), B(.15, 1.56, .15, .7, .45, .7, PAPEL)] },
    { x: .6, z: 18, bl: [B(.35, 0, .35, .3, .5, .3, '#4A4E56'), B(.42, .5, .42, .16, 1, .16, '#D9C27F'), B(.3, 1.4, .3, .4, .4, .4, '#EAD9A8'), B(.2, .9, .5, .1, .7, .1, '#D9C27F')] },
    { x: 12.4, z: 18, bl: [B(.35, 0, .35, .3, .5, .3, '#4A4E56'), B(.42, .5, .42, .16, 1, .16, '#D9C27F'), B(.3, 1.4, .3, .4, .4, .4, '#EAD9A8'), B(.6, 1, .4, .1, .6, .1, '#D9C27F')] },
    { x: 6.5, z: 13.5, bl: [B(-.04, 4.5, -.04, .08, 1.5, .08, INK), ...[0, .55, 1.1, 1.75, 2.3, 2.85].map(a => Object.assign(B(-1.3, 4.45, -.05, 2.6, .09, .09, CINZA), { yaw: a })), ...[0, 1.1, 2.3].map(a => Object.assign(B(-1.3, 4.45, -.05, .3, .09, .09, PAPEL), { yaw: a })), ...[.55, 1.75, 2.85].map(a => Object.assign(B(1, 4.45, -.05, .3, .09, .09, PAPEL), { yaw: a }))] },
    /* prateleira de discos e o grafite na parede da sala; skates na parede do lado */
    { x: 2, z: 8.15, acao: 'discos', topo: 1.9, bl: [B(0, 1, 0, 6, .08, .36, MAD), B(0, 1.8, 0, 6, .08, .36, MAD), ...Array.from({ length: 16 }, (_, i) => B(.2 + i * .36, 1.08, .04, .3, .32, .04, [INK, ROSA, AZUL, AMARELO, PAPEL, LARANJA, LILAS][i % 7])), ...Array.from({ length: 14 }, (_, i) => B(.3 + i * .4, 1.88, .04, .3, .3, .04, [AZUL, INK, PAPEL, ROSA, AMARELO][i % 5]))] },
    { x: 8.3, z: 8.15, bl: [B(0, 1.2, 0, .6, .6, .03, ROSA), B(.7, 1.5, 0, .8, .5, .03, AMARELO), B(1.6, 1.1, 0, .5, .9, .03, AZUL), B(2.2, 1.6, 0, .9, .4, .03, LILAS), B(3.2, 1.2, 0, .6, .7, .03, LARANJA), B(3.9, 1.5, 0, .5, .5, .03, PAPEL), B(.9, .9, 0, 3, .12, .03, INK)] },
    { x: .15, z: 15, parede: true, acao: 'skate', bl: [B(0, .5, 0, .06, .85, .26, ROSA), B(0, 1.5, 0, .06, .85, .26, AZUL), B(.06, .7, .04, .05, .08, .08, PAPEL), B(.06, 1.2, .04, .05, .08, .08, PAPEL), B(.06, 1.7, .04, .05, .08, .08, PAPEL), B(.06, 2.2, .04, .05, .08, .08, PAPEL)] },
    /* cozinha: bancada com pia e fogão, armários, geladeira vermelha, ilha de concreto com banquetas, mesa com cadeiras vermelhas */
    { x: 14.2, z: 8.15, bl: [B(0, 0, 0, 6.6, .85, .6, MAD_E), B(0, .85, -.05, 6.6, .06, .7, CINZA), B(1.8, .86, .1, 1, .04, .4, '#7F8A96'), B(2.28, .9, .05, .06, .3, .06, CINZA), B(4.6, .91, .05, 1.1, .04, .5, INK), B(4.7, .94, .12, .3, .03, .3, '#4A4E56'), B(5.2, .94, .12, .3, .03, .3, '#4A4E56'), B(0, .91, 0, 6.6, .95, .05, '#D3CFC4'), B(0, 1.9, 0, 6.6, .8, .4, MAD_E), B(4.4, 1.6, 0, 1.5, .3, .6, CINZA), B(.4, 1, .45, .2, .3, .2, LARANJA), B(3.4, 1, .4, .25, .15, .25, AMARELO)] },
    { x: 21, z: 8.3, bl: [B(0, 0, 0, .95, 2, .85, VERM), B(.1, 1.25, .85, .75, .02, .01, '#B4152E'), B(.8, .8, .85, .06, .35, .04, PAPEL), B(.8, 1.35, .85, .06, .3, .04, PAPEL)] },
    { x: 15.2, z: 11.2, bl: [B(0, 0, 0, 3, .85, 1, '#4A4E56'), B(-.1, .85, -.1, 3.2, .08, 1.2, CINZA), B(.5, .6, 1.3, .5, .08, .5, VERM), B(.6, 0, 1.4, .06, .6, .06, INK), B(.94, 0, 1.4, .06, .6, .06, INK), B(.6, 0, 1.74, .06, .6, .06, INK), B(.94, 0, 1.74, .06, .6, .06, INK), B(1.9, .6, 1.3, .5, .08, .5, VERM), B(2, 0, 1.4, .06, .6, .06, INK), B(2.34, 0, 1.4, .06, .6, .06, INK), B(2, 0, 1.74, .06, .6, .06, INK), B(2.34, 0, 1.74, .06, .6, .06, INK), B(1.2, .93, .3, .5, .18, .5, PAPEL), B(1.3, 1.11, .4, .3, .12, .3, LARANJA)] },
    { x: 16.3, z: 14.8, bl: [B(0, .75, 0, 2.2, .08, 1.6, MAD), B(.1, 0, .1, .12, .75, .12, INK), B(1.98, 0, .1, .12, .75, .12, INK), B(.1, 0, 1.38, .12, .75, .12, INK), B(1.98, 0, 1.38, .12, .75, .12, INK), B(.9, .83, .6, .4, .3, .4, PAPEL), B(1, 1.13, .7, .2, .2, .2, ROSA)] },
    { x: 16.6, z: 13.6, bl: cadeira(VERM) }, { x: 17.4, z: 13.6, bl: cadeira(VERM) },
    { x: 16.6, z: 16.6, bl: cadeira(VERM).map(b => Object.assign({}, b, { yaw: Math.PI })) }, { x: 17.4, z: 16.6, bl: cadeira(VERM).map(b => Object.assign({}, b, { yaw: Math.PI })) },
    /* quarto: cama preta e branca, criados, cabeceira de ripas, tapete, parede de fotos analógicas */
    { x: 2.6, z: .5, bl: [B(0, .15, 0, 2, .28, 2, INK), B(-.4, .3, -.05, 2.8, 1.4, .12, MAD), B(.05, .43, .1, 1.9, .2, 1.85, BRANCO), B(.15, .63, .15, .7, .12, .4, AMARELO), B(1.15, .63, .15, .7, .12, .4, ROSA), B(.05, .6, .75, 1.9, .12, 1.2, INK), B(.05, .72, 1.5, 1.9, .03, .35, '#D9C27F')] },
    { x: 1.4, z: .5, bl: [B(.1, 0, .1, .8, .55, .8, MAD_E), B(.3, .55, .3, .4, .3, .4, AMARELO)] }, { x: 4.9, z: .5, bl: [B(.1, 0, .1, .8, .55, .8, MAD_E), B(.3, .55, .3, .4, .3, .4, LILAS)] },
    { x: 2, z: 3, piso: true, bl: [B(0, 0, 0, 3.6, .03, 2.4, '#D9CCEF')] },
    { x: 1, z: .15, parede: true, bl: [...Array.from({ length: 5 }, (_, i) => [B(i * 1.1, 1.3, 0, .7, .55, .05, INK), B(i * 1.1 + .06, 1.36, .05, .58, .43, .01, i % 2 ? PAPEL : '#C9CDD3')]).flat()] },
    /* estúdio: mesa de DJ, monitores, pedestal de mic, painéis acústicos, caixa de discos, luz neon rosa */
    { x: 12, z: .5, acao: 'discos', topo: .72, bl: ITEM_MESA_DJ() }, { x: 9.7, z: .4, bl: [B(.15, 0, .15, .7, 1.2, .7, '#15171B'), B(.3, .2, .85, .4, .4, .02, '#34383F'), B(.4, .75, .85, .2, .2, .02, '#34383F')] }, { x: 15.6, z: .4, bl: [B(.15, 0, .15, .7, 1.2, .7, '#15171B'), B(.3, .2, .85, .4, .4, .02, '#34383F'), B(.4, .75, .85, .2, .2, .02, '#34383F')] },
    { x: 13.6, z: 3.6, bl: [B(.2, 0, .2, .6, .06, .6, INK), B(.46, .06, .46, .08, 1.55, .08, INK), B(.36, 1.5, .36, .28, .22, .28, CINZA)] },
    { x: 9.4, z: .15, parede: true, bl: Array.from({ length: 6 }, (_, i) => B(i * 1.45, 1.6, 0, 1.2, .9, .07, i % 2 ? '#2A2D33' : '#3A3E45')) },
    { x: 11, z: .15, parede: true, bl: [B(0, 2.65, 0, 3.2, .1, .05, ROSA)] },
    { x: 16.5, z: 2.6, bl: [B(0, 0, 0, .9, .55, .9, MAD), ...Array.from({ length: 8 }, (_, i) => B(.1 + i * .1, .55, .1, .04, .3, .7, [INK, ROSA, AZUL, AMARELO][i % 4]))] },
    { x: 9.5, z: 4.5, piso: true, bl: [B(0, 0, 0, 8, .03, 3, '#4A4E56')] },
    /* closet: arara com roupas, prateleira de tênis, espelho */
    { x: 18.4, z: .4, bl: [B(0, 0, 0, .08, 1.9, .5, CINZA), B(5, 0, 0, .08, 1.9, .5, CINZA), B(0, 1.85, .22, 5.08, .06, .06, CINZA), ...Array.from({ length: 10 }, (_, i) => B(.3 + i * .47, 1.05, .14, .35, .78, .22, [INK, PAPEL, ROSA, AZUL, AMARELO, LARANJA, LILAS, '#B4152E', INK, PAPEL][i]))] },
    { x: 23.35, z: 1, bl: [B(0, 0, 0, .6, 2.1, 5, PAPEL), ...[.5, 1.1, 1.7].flatMap(y => Array.from({ length: 6 }, (_, i) => B(.08, y, .3 + i * .78, .42, .22, .55, [PAPEL, INK, ROSA, AMARELO, AZUL, '#B4152E'][(i + Math.round(y * 3)) % 6])))] },
    { x: 19, z: 6, bl: [B(.2, 0, .3, .6, .06, .4, INK), B(.25, .06, .45, .5, 1.7, .1, OURO), B(.3, .16, .55, .4, 1.5, .02, CEU)] },
    /* mezanino: o painel de cotações do canto financeiro (velas rosa e ciano, nada de verde) */
    { x: 23.85, z: 1.2, y: 3, parede: true, bl: [B(0, 1.1, 0, .06, 1.3, 2.6, INK), ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => B(-.01, 1.3 + [.3, .5, .2, .7, .45, .8, .35, .6][i], .25 + i * .3, .03, [.4, .3, .5, .25, .45, .2, .5, .35][i], .14, i % 3 === 1 ? '#38E1FF' : ROSA)), B(-.01, 1.18, .15, .02, .04, 2.3, CINZA)] },
    /* mezanino: tapete e planta no escritório */
    { x: 7, z: 2.2, y: 3, piso: true, bl: [B(0, 0, 0, 9, .03, 4.5, '#2B2F38'), B(.3, .03, .3, 8.4, .006, 3.9, '#3A3E45')] },
    { x: 21.5, z: 6.4, y: 3, bl: [B(.3, 0, .3, .4, .4, .4, '#B5562F'), B(.15, .4, .15, .7, .45, .7, ROSA), B(.3, .85, .3, .4, .35, .4, LILAS)] }
  ];
  function ITEM_MESA_DJ(){ return M.blocos(ITEM.mesa_dj, 0); }
  const PLANTA_LOFT = {
    k: 'loft', W: 24, D: 20, ALT: 6,
    comodos: [
      { k: 'sala', nome: 'Sala', x0: 0, z0: 8, x1: 14, z1: 20, piso: '#A4A8AE', linha: 'rgba(15,18,24,.13)' },
      { k: 'cozinha', nome: 'Cozinha', x0: 14, z0: 8, x1: 22, z1: 20, piso: '#B8BCC2', piso2: '#A9AEB5', xadrez: true, linha: 'rgba(15,18,24,.1)' },
      { k: 'escada', nome: 'Escada', x0: 22, z0: 8, x1: 24, z1: 20, piso: '#A4A8AE', linha: 'rgba(15,18,24,.13)' },
      { k: 'quarto', nome: 'Quarto', x0: 0, z0: 0, x1: 9, z1: 8, piso: '#C89B6A', linha: 'rgba(60,30,10,.16)' },
      { k: 'estudio', nome: 'Estúdio', x0: 9, z0: 0, x1: 18, z1: 8, piso: '#2B2F38', linha: 'rgba(255,255,255,.07)' },
      { k: 'closet', nome: 'Closet', x0: 18, z0: 0, x1: 24, z1: 8, piso: '#C89B6A', linha: 'rgba(60,30,10,.16)' },
      { k: 'escritorio', nome: 'Escritório (mezanino)', x0: 0, z0: 0, x1: 24, z1: 8, n: 1, piso: '#C89B6A', linha: 'rgba(60,30,10,.2)' }
    ],
    paredes: [
      { a: [0, 20], b: [24, 20], ext: [0, 1], portas: [[11.4, 12.6]], janelas: [[14, 20.5]], altas: [[1, 10]], entrada: true },
      { a: [24, 0], b: [24, 20], ext: [1, 0], janelas: [[1, 7], [12, 18]] },
      { a: [0, 0], b: [0, 20], ext: [-1, 0], janelas: [[1, 6]], altas: [[9, 19]] },
      { a: [0, 0], b: [24, 0], ext: [0, -1], tijolo: true },
      { a: [0, 8], b: [22, 8], portas: [[4, 5.2], [13, 14.2], [20, 21.2]], alt: 3 },
      { a: [9, 0], b: [9, 8], alt: 3 }, { a: [18, 0], b: [18, 8], alt: 3 }
    ],
    entrada: { x: 12, z: 20 }, tapete: { x: 11.3, z: 18.8, w: 1.4, d: 1 },
    mezanino: { x0: 0, z0: 0, x1: 24, z1: 8, y: 3, grade: [[0, 8, 22, 8]] },
    escada: { x0: 22.6, z0: 8, x1: 24, z1: 18, topo: 3 },
    decor: LOFT_DECOR,
    estacoes: { studio: { x: 9.5, z: .4, y: 3 }, feed: { x: 3, z: .15, y: 3 }, ia: { x: 6, z: .5, y: 3 }, horus: { x: .15, z: 1, y: 3 }, mural: { x: .15, z: 4, y: 3 }, marcas: { x: 23.4, z: 1, y: 3 }, grana: { x: 23.2, z: 4.5, y: 3 }, vendas: { x: 17.5, z: 5.3, y: 3 }, nicho: { x: 1, z: 6, y: 3 }, estilo: { x: 3.4, z: 6.2, y: 3 }, manual: { x: 12.5, z: 1.2, y: 3 }, banca: { x: 14.6, z: .4, y: 3 }, rolo: { x: 17.2, z: 1, y: 3 }, agente: { x: 19.6, z: 1.3, y: 3 } },
    padrao: []
  };
  const ehDoFundador = dono => !!dono && (dono.handle === 'consanans' || (C.fundadorId && dono.id === C.fundadorId()) || (C.ehFundador && C.ehFundador() && dono.id === (C.st.me && C.st.me.id)));
  const plantaDe = dono => (ehDoFundador(dono) ? PLANTA_LOFT : PLANTA_PADRAO);
  function usaPlanta(pl){ PL = pl; W = pl.W; D = pl.D; ALT = pl.ALT; COMODOS = pl.comodos; PAREDES = pl.paredes; ENTRADA = pl.entrada; PADRAO = pl.padrao; }
  usaPlanta(PLANTA_PADRAO);
  /* a estação que é só do fundador aparece na casa do fundador (pra ele e pra quem visita) */
  const paraDono = (e, dono) => e.so !== 'fundador' || ehDoFundador(dono);
  const estAberta = e => e.id !== 'horus' || !C.ferr || C.ferr('horus');

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
      const q = projPoly(cam, [[p.x0, 0, p.z0], [p.x1, 0, p.z0], [p.x1, 0, p.z1], [p.x0, 0, p.z1]]);
      if(!q) return;
      poly(q); ctx.fillStyle = p.c; ctx.fill();
      if(p.linha){
        ctx.strokeStyle = p.linha; ctx.lineWidth = 1; ctx.beginPath();
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
    const chave = assin + '|' + cam.pos.map(v => Math.round(v * 10)).join(',');
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
        faces.push({ pts, cor: s.cru ? s.c : tom(s.c, .56 + .44 * Math.max(0, lam)) });
      }
      if(!faces.length) continue;
      let alpha = s.alpha == null ? 1 : s.alpha;
      if(foco && !s.chao && s.dono !== 'eu' && s.prof < fprof){ const q = proj(cam, [s.cx, s.cy, s.cz]); if(q && Math.hypot(q[0] - fx, q[1] - fy) < fr) alpha = Math.min(alpha, .3); }
      ctx.globalAlpha = alpha;
      for(const f of faces){
        ctx.beginPath(); f.pts.forEach((v, i) => i ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1])); ctx.closePath();
        ctx.fillStyle = f.cor; ctx.fill();
        if(!s.semTraco){ ctx.strokeStyle = s.traco || 'rgba(15,18,24,.38)'; ctx.lineWidth = 1; ctx.stroke(); }
      }
      ctx.globalAlpha = 1;
      if(hit && s.dono) hit.push({ dono: s.dono, polys: faces.map(f => f.pts), s });
    }
  }

  /* ---------- o boneco de blocos (do mesmo avatar da cidade) ---------- */
  /* os personagens em blocos (a mesma turma da cidade): corpo, cabeça e o que cada um tem de seu */
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
    } else if(k === 'ipe'){
      const TR = '#7A4E2A', TR2 = '#5A3A1E', FL = '#FFB3D1';
      pe(-.22, 1, TR2, .18, .22); pe(.04, -1, TR2, .18, .22);
      add(B(x - .13, .2, z - .13, .26, .9, .26, TR)); add(B(x - .3, .8, z - .06, .18, .06, .12, TR)); add(B(x + .12, .8, z - .06, .18, .06, .12, TR));
      add(B(x - .42, 1.0, z - .42, .84, .5, .84, ROSA)); add(B(x - .3, 1.5, z - .3, .6, .16, .6, ROSA)); add(B(x - .34, 1.2, z + .42, .1, .1, .02, FL)); add(B(x + .1, 1.3, z + .42, .1, .1, .02, AMARELO)); add(B(x - .1, 1.56, z + .3, .08, .08, .08, FL)); add(B(x + .34, 1.1, z - .1, .1, .1, .1, AMARELO));
      add(B(x - .1, .6, z + .13, .06, .06, .01, INK)); add(B(x + .04, .6, z + .13, .06, .06, .01, INK)); add(B(x - .05, .46, z + .13, .1, .04, .01, INK));
    }
  }
  /* ---------- os uniformes em blocos (os mesmos da cidade): cores da roupa e o que vai por cima ---------- */
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
    rei: { R: '#E2412E', L: INK, T: INK, bl: (x, z) => [B(x - .25, 1.5, z - .25, .5, .1, .5, OURO), B(x - .25, 1.6, z - .25, .09, .09, .09, OURO), B(x + .16, 1.6, z - .25, .09, .09, .09, OURO), B(x - .25, 1.6, z + .16, .09, .09, .09, OURO), B(x + .16, 1.6, z + .16, .09, .09, .09, OURO), B(x - .04, 1.6, z + .2, .08, .07, .05, ROSA), B(x - .32, .3, z - .18, .64, .66, .05, '#7A1F3D'), B(x - .25, .44, z + .12, .05, .5, .01, PAPEL), B(x + .2, .44, z + .12, .05, .5, .01, PAPEL), B(x - .27, .3, z - .14, .54, .16, .28, '#E2412E'), B(x - .27, .28, z - .14, .54, .04, .28, PAPEL), B(x - .26, .44, z - .13, .52, .05, .26, OURO)] }
  };
  function boneco(av, x, z, yaw, passo, andando){
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
      const T2 = { pitch: sw * sinal, piv: [x, .44, z] };
      if(perna === 'bermuda'){ add(B(x + sx, .22, z - .12, .22, .22, .24, Lc), T2); add(B(x + sx, .08, z - .12, .22, .14, .24, P), T2); }
      else add(B(x + sx, .08, z - .12, .22, .36, .24, Lc), T2);
      add(B(x + sx - .01, 0, z - .14, .24, .09, .3, T), T2);
    };
    pe(-.24, 1); pe(.02, -1);
    /* tronco e braços */
    add(B(x - .25, .44, z - .12, .5, .5, .24, R));
    if(roupa === 'jaqueta') add(B(x - .03, .44, z + .12, .06, .5, .01, Rd));
    if(estampa === 'listras'){ add(B(x - .25, .56, z + .12, .5, .05, .01, Rd)); add(B(x - .25, .7, z + .12, .5, .05, .01, Rd)); add(B(x - .25, .84, z + .12, .5, .05, .01, Rd)); }
    else if(estampa !== 'nada') add(B(x - .08, .62, z + .12, .16, .16, .01, R === PAPEL ? ROSA : PAPEL));
    if(corrente === 'ouro') add(B(x - .12, .84, z + .12, .24, .04, .01, OURO));
    const braco = (sx, sinal) => { const T2 = { pitch: -sw * sinal, piv: [x, .9, z] }; const manga = roupa === 'regata' ? P : R; add(B(x + sx, .62, z - .1, .14, .32, .2, manga), T2); add(B(x + sx, .44, z - .1, .14, .18, .2, roupa === 'camiseta' || roupa === 'regata' ? P : MAO), T2); };
    braco(-.39, 1); braco(.25, -1);
    /* o uniforme por cima (chapéu, capacete, crachá, capa…) */
    if(SK) SK.bl(x, z).forEach(b => add(b));
    /* cabeça (8 x 8 → .5), olhos, barba, cabelo, o que tem na cabeça e os óculos */
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
    /* o skate nas costas, de viés */
    if(av.skate){ add(B(x - .36, .4, z - .2, .72, .05, .22, '#2B2F38'), { pitch: 0, piv: [x, .4, z] }); add(B(x - .3, .45, z - .18, .08, .05, .08, PAPEL)); add(B(x + .22, .45, z - .18, .08, .05, .08, PAPEL)); }
    return out;
  }

  /* ---------- estado ---------- */
  const S = { aberta: false, el: null, cv: null, ctx: null, raf: 0, tAnt: 0, meu: false, dono: null, itens: [], outras: {}, modo: 'andar', sel: -1, ghost: null, disco: null, discoAtual: '',
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
      const marca = (x0, z0, x1, z1) => { marcaEm(g0, x0, z0, x1, z1); if(alta) marcaEm(g1, x0, z0, x1, z1); };
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
    S.itens.forEach(i => { const it = ITEM[i.k]; if(!it || semChao(it)) return; const p = pegadaDe(it, i.r); marcaEm(i.n ? g1 : g0, i.x, i.z, i.x + p.w, i.z + p.d); });
    S.grades = [g0, g1];
  }
  const bate = (x, z, n) => { if(x < -2 || z < -2 || x > W + 2 || z > D + 2) return true; const g = S.grades[n || 0]; if(!g) return false; const cx0 = Math.floor((x - RAIO) * G), cx1 = Math.floor((x + RAIO) * G), cz0 = Math.floor((z - RAIO) * G), cz1 = Math.floor((z + RAIO) * G); for(let cz = cz0; cz <= cz1; cz++) for(let cx = cx0; cx <= cx1; cx++){ if(cx < 0 || cz < 0 || cx >= GW || cz >= GD) continue; if(g[cz * GW + cx]) return true; } return false; };
  /* anda, sem atravessar nada e sem cair do mezanino (o chão só muda de altura pela escada) */
  function mover(e, dx, dz){
    const n = nivelDe(e.y), preso = bate(e.x, e.z, n);
    /* se já nasceu dentro de alguma coisa (móvel velho na soleira), pode andar até sair */
    const tenta = (nx, nz) => { if(!preso && bate(nx, nz, n)) return false; const y = alturaEm(nx, nz, e.y); if(Math.abs(y - e.y) > .6) return false; e.x = nx; e.z = nz; e.y = y; return true; };
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
      const gaps = (p.portas || []), jans = p.janelas || [], altas = p.altas || [], altP = p.alt || ALT, COR = p.tijolo ? TIJ : PAREDE;
      let cortes = [0, L]; gaps.forEach(gp => cortes.push(gp[0], gp[1])); jans.forEach(j => cortes.push(j[0], j[1])); altas.forEach(j => cortes.push(j[0], j[1]));
      for(let t = 1; t < L; t++) cortes.push(t);
      cortes = [...new Set(cortes)].sort((a, b) => a - b);
      for(let i = 0; i + 1 < cortes.length; i++){
        const t0 = cortes[i], t1 = cortes[i + 1], meio = (t0 + t1) / 2;
        const porta = gaps.some(gp => meio > gp[0] && meio < gp[1]), jan = !mureta && jans.some(j => meio > j[0] && meio < j[1]), alta = !mureta && altas.some(j => meio > j[0] && meio < j[1]);
        const extra = vidroFraco ? { alpha: .38 } : {};
        if(porta){ if(!mureta) out.push(caixa(t0, t1, 2.15, altP, COR, extra)); continue; }
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
      const esp = .22, piso = (COMODOS.find(c => c.n === 1) || {}).piso || MAD;
      for(let x = m.x0; x < m.x1; x += 2) for(let z = m.z0; z < m.z1; z += 2) out.push(solido({ x, y: m.y - esp, z, w: Math.min(2, m.x1 - x), h: esp, d: Math.min(2, m.z1 - z), c: piso }, null, piso, 'piso1', Object.assign({ traco: 'rgba(60,30,10,.25)' }, fraco)));
      (m.grade || []).forEach(([x0, z0, x1, z1]) => {
        const L = Math.hypot(x1 - x0, z1 - z0), dx = (x1 - x0) / L, dz = (z1 - z0) / L;
        for(let t = 0; t <= L; t += 1.5){ const px = x0 + dx * t, pz = z0 + dz * t; out.push(solido({ x: px - .04, y: m.y, z: pz - .04, w: .08, h: .95, d: .08, c: INK }, null, INK, null, Object.assign({ semTraco: true }, fraco))); }
        out.push(solido({ x: Math.min(x0, x1) - .05, y: m.y + .9, z: Math.min(z0, z1) - .05, w: Math.abs(x1 - x0) + .1 || .1, h: .07, d: Math.abs(z1 - z0) + .1 || .1, c: MAD }, null, MAD, null, fraco));
        out.push(solido({ x: Math.min(x0, x1) - .03, y: m.y + .45, z: Math.min(z0, z1) - .03, w: Math.abs(x1 - x0) + .06 || .06, h: .05, d: Math.abs(z1 - z0) + .06 || .06, c: INK }, null, INK, null, Object.assign({ semTraco: true }, fraco)));
      });
    }
    if(e){
      const n = Math.round(e.z1 - e.z0), passo = (e.z1 - e.z0) / n;
      for(let i = 0; i < n; i++){
        const h = e.topo * (i + 1) / n, z1 = e.z1 - i * passo, z0 = z1 - passo;
        out.push(solido({ x: e.x0, y: 0, z: z0, w: e.x1 - e.x0, h: h - .06, d: passo, c: '#4A4E56' }, null, '#4A4E56', 'escada'));
        out.push(solido({ x: e.x0 - .02, y: h - .06, z: z0 - .03, w: e.x1 - e.x0 + .04, h: .06, d: passo + .03, c: MAD }, null, MAD, 'escada'));
        out.push(solido({ x: e.x0 - .14, y: h, z: z0 + passo / 2 - .04, w: .08, h: .9, d: .08, c: INK }, null, INK, null, { semTraco: true }));
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
    S.fixos.forEach(e => { const dono = S.meu ? 'est:' + e.id : null, sol = cola(poe(e.bl, e, dono), e.bl, 0); out.push(...sol); if(e.agente){ const bl = solidosAgente(e, t); out.push(...cola(poe(bl, e, dono), bl, 0, sol, e.bl)); } });
    S.decor.forEach((e, i) => out.push(...cola(poe(e.bl, e, e.acao ? 'decor:' + i : null), e.bl, 0)));
    return out;
  }
  /* ---------- as ações da casa: discos (prateleira, mesa de DJ, caixa de som) e o skate (na parede ou no chão) ---------- */
  function acoes(){
    const out = [];
    S.decor.forEach((e, i) => { if(!e.acao) return; const ps = pegadasDecor(e); const bb = ps.length ? ps : [{ x: e.x + Math.min(...e.bl.map(b => b.x)), z: e.z + Math.min(...e.bl.map(b => b.z)), w: Math.max(...e.bl.map(b => b.x + b.w)) - Math.min(...e.bl.map(b => b.x)), d: Math.max(...e.bl.map(b => b.z + b.d)) - Math.min(...e.bl.map(b => b.z)) }]; const x0 = Math.min(...bb.map(q => q.x)), x1 = Math.max(...bb.map(q => q.x + q.w)), z0 = Math.min(...bb.map(q => q.z)), z1 = Math.max(...bb.map(q => q.z + q.d)); out.push({ id: 'd' + i, a: e.acao, x: x0, z: z0, w: x1 - x0, d: z1 - z0, y: e.y || 0, parede: !!e.parede, topo: e.topo || Math.max(...e.bl.map(b => b.y + b.h)) }); });
    S.itens.forEach((it, i) => { const o = ITEM[it.k]; if(!o || !o.acao) return; const p = pegadaDe(o, it.r); out.push({ id: 'i' + i, a: o.acao, x: it.x, z: it.z, w: p.w, d: p.d, y: chaoItem(it), parede: !!o.parede, topo: Math.max(...blocosDe(it).map(b => b.y + b.h)) }); });
    return out;
  }
  const acaoPraMim = a => a.a !== 'skate' || S.meu;
  const rotuloAcao = a => a.a === 'skate' ? (C.st.me && C.st.me.verso && C.st.me.verso.skate ? 'Largar o skate' : 'Pegar o skate') : a.a === 'jogo' ? 'Jogar Killer Ocean' : (S.discoAtual ? '♪ ' + (C.beats ? C.beats.nome(S.discoAtual) : 'tocando') : '♪ Discos');
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
    /* o fliperama da casa roda o Killer Ocean (o mesmo do Aquário), por cima da casa */
    if(a.a === 'jogo'){ if(C.verso && C.verso.abreJogo && C.verso.JOGOS && C.verso.JOGOS.killer) C.verso.abreJogo('killer'); else C.toast('O jogo não carregou.'); return; }
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
    const atual = S.discoAtual;
    C.sheet(`<div class="form cs-discos"><div class="sheet-head"><h2>${ico('musica')} Discos</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p class="note">Beats da casa, feitos na hora. Quem tá aqui dentro ouve junto.</p>
      <div class="cs-disco-l">${B2.DISCOS.map(d => `<button type="button" class="cs-disco${atual === d.k ? ' on' : ''}" data-act="cs-disco" data-k="${d.k}"><i style="--c:${d.cor}"></i><b>${esc(d.nome)}</b><small>${d.bpm} bpm${atual === d.k ? ' · tocando' : ''}</small></button>`).join('')}</div>
      ${atual ? `<div class="acts"><button type="button" class="btn" data-act="cs-disco-para">${ico('x')} Tirar o disco</button></div>` : ''}</div>`);
  }
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
    const som = (x, z, w, d, n) => { if(n) solidosExtra.push(solido({ x: x + .06, y: ym + .005, z: z + .06, w, h: .004, d, c: '#000' }, null, 'rgba(15,18,24,.16)', null, { cru: true, semTraco: true, chao: true })); else out.push({ x0: x + .06, z0: z + .06, x1: x + w + .06, z1: z + d + .06, c: 'rgba(15,18,24,.16)' }); };
    S.itens.forEach(i => { const it = ITEM[i.k]; if(!it || semChao(it)) return; const p = pegadaDe(it, i.r); som(i.x, i.z, p.w, p.d, i.n); });
    S.fixos.forEach(e => { if(!e.parede) som(e.x, e.z, e.w, e.d, e.y > 1.5 ? 1 : 0); });
    if(S.eu){ const n = nivelDe(S.eu.y); if(n) solidosExtra.push(solido({ x: S.eu.x - .3, y: S.eu.y + .005, z: S.eu.z - .22, w: .6, h: .004, d: .44, c: '#000' }, null, 'rgba(15,18,24,.22)', null, { cru: true, semTraco: true })); else if(!naEscada(S.eu.x, S.eu.z)) out.push({ x0: S.eu.x - .3, z0: S.eu.z - .22, x1: S.eu.x + .3, z1: S.eu.z + .22, c: 'rgba(15,18,24,.22)' }); }
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
    return pisos;
  }
  function tamanho(){
    const cv = S.cv; if(!cv || !S.el) return;
    const r = S.el.getBoundingClientRect(), esc2 = 2;
    cv.width = Math.max(160, Math.round(r.width / esc2)); cv.height = Math.max(120, Math.round(r.height / esc2));
    cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px';
  }
  function quadro(t){
    const cv = S.cv, ctx = S.ctx; if(!cv) return;
    const cam = camera(cv);
    const g = ctx.createLinearGradient(0, 0, 0, cv.height); g.addColorStop(0, '#0B1430'); g.addColorStop(.55, '#1B2A5A'); g.addColorStop(1, '#2B2F38');
    ctx.fillStyle = g; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = 'rgba(255,255,255,.7)'; for(let i = 0; i < 40; i++){ const sx = ((i * 97) % 101) / 101 * cv.width, sy = ((i * 53) % 37) / 37 * cv.height * .45; ctx.fillRect(sx, sy, 1, 1); }
    const pisos = pisosDaCasa(), extras = [];
    pisos.push(...sombras(extras));
    const solidos = [...solidosParedes(cam), ...solidosAndares(), ...solidosFixos(), ...solidosItens(), ...solidosAnimados(t), ...extras, ...solidosDisco(t)];
    if(S.eu) solidos.push(...sobe(boneco(S.eu.av, S.eu.x, S.eu.z, S.eu.yaw, S.eu.passo, S.eu.andando), S.eu.y + puloCasa(S.eu) * PULO_ALT));
    const fracoG = embaixoDoMezanino();
    gente().forEach(r => solidos.push(...sobe(boneco(r.av, r.hxv, r.hzv, r.hyaw || 0, r.hpasso || 0, !!r.hand).map(b => { b.dono = 'gente:' + r.sid; if(fracoG && (r.hyv || 0) > 1.5) b.alpha = .22; return b; }), (r.hyv || 0) + (C.verso.alturaPulo ? C.verso.alturaPulo(r) * PULO_ALT : 0))));
    if(S.ghost){ const g = S.ghost, it = ITEM[g.k]; if(it) solidos.push(...solidosItem(it, g.x, g.z, g.r, null, g.ok ? { alpha: .62 } : { alpha: .62, cru: true, traco: VERM }, alturaItem(it, g), M.blocos(it, g.c).concat(M.anima(it, animaA(t), g.c, 0))).map(s => { if(!g.ok) s.c = VERM; return s; })); }
    if(S.alvo && !S.acao){ const a = proj(cam, [S.alvo.x, (S.alvo.n && PL.mezanino ? PL.mezanino.y : 0) + .02, S.alvo.z]); if(a){ ctx.strokeStyle = ROSA; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(a[0], a[1], 6 + Math.sin(t * 6) * 1.5, 3, 0, 0, Math.PI * 2); ctx.stroke(); } }
    const foco = S.eu ? { q: proj(cam, [S.eu.x, S.eu.y + .9, S.eu.z]), prof: (S.eu.x - cam.pos[0]) ** 2 + (S.eu.y + .9 - cam.pos[1]) ** 2 + (S.eu.z - cam.pos[2]) ** 2, raio: cv.height * .16 } : null;
    cena(ctx, cv, cam, pisos, solidos, S.hit, foco && foco.q ? foco : null);
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
    const cm = S.eu && comodoDe(S.eu.x, S.eu.z, nivelDe(S.eu.y)), noEsc = !!(cm && cm.k === 'escritorio');
    if(S.meu && S.modo === 'andar') S.fixos.forEach(e => { const el = S.tags.get('est:' + e.id); if(!noEsc && !(S.eu && nivelDe(S.eu.y) === (e.y > 1.5 ? 1 : 0) && Math.hypot(S.eu.x - e.x - e.w / 2, S.eu.z - e.z - e.d / 2) < 5)){ if(el) el.hidden = true; return; } poe('est:' + e.id, [e.x + e.tag[0], (e.y || 0) + e.tag[1], e.z + e.tag[2]], e.trava ? e.titulo + ' · em breve' : e.id === 'horus' && !estAberta(e) ? 'Hórus desligado' : e.agente ? AGENTE[agenteDe(S.dono)].nome : e.titulo, e.trava ? 'trava' : e.id === 'horus' && !estAberta(e) ? 'off' : e.agente ? 'agente' : ''); });
    poe('saida', [ENTRADA.x, .25, ENTRADA.z - .25], S.meu ? 'Sair pra rua' : 'Sair', 'saida');
    if(S.modo === 'andar') acoes().forEach(a => { if(!acaoPraMim(a)) return; const cx = a.x + a.w / 2, cz = a.z + a.d / 2, n = a.y > 1.5 ? 1 : 0; if(!(S.eu && nivelDe(S.eu.y) === n && Math.hypot(S.eu.x - cx, S.eu.z - cz) < 4.5)){ const el = S.tags.get('acao:' + a.id); if(el) el.hidden = true; return; } poe('acao:' + a.id, [cx, a.y + a.topo + .35, cz], rotuloAcao(a), a.a === 'discos' && S.discoAtual ? 'acao som' : 'acao'); });
    const peers = C.verso.peers ? C.verso.peers() : new Map();
    gente().forEach(r => { const p = peers.get(r.sid), vivo = p && p.estado === 'aovivo'; poe('gente:' + r.sid, [r.hxv, (r.hyv || 0) + 1.78, r.hzv], (r.handle ? '@' + r.handle : r.nome || 'visitante') + (vivo ? ' · ao vivo' : r.mic ? ' · mic' : ''), vivo ? 'gente vivo' : 'gente'); });
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
      /* celular fraco (quadro lento): o boneco anda em passos de até 50 ms, pra a velocidade não depender do quadro
         (e sem atravessar parede num passo grande) */
      if(!parado){ const np = Math.max(1, Math.ceil(dt / .05 - 1e-9)); for(let i = 0; i < np && S.aberta && S.eu; i++) passo(dt / np); }
      andamGente(dt); sincronizaDisco();
      if(!S.portaT || t - S.portaT > .2){ S.portaT = t; portaCasa(); }
      if(C.verso.enviaPos) C.verso.enviaPos(false);
      if(!bc && !(C.verso.jogo && C.verso.jogo())){ const t0 = performance.now(); quadro(t); S.msQuadro = (S.msQuadro || 0) * .9 + (performance.now() - t0) * .1; }
    }catch(e){
      /* um erro num quadro não pode travar a casa: avisa uma vez e segue */
      if(!S.avisouErro){ S.avisouErro = true; try{ console.error('[casa] quadro', e); }catch(_){} C.toast('A casa deu um erro: ' + String((e && e.message) || e).slice(0, 120), 6000); }
    }
    S.raf = requestAnimationFrame(laco);
  }
  function passo(dt){
    const e = S.eu; if(!e) return;
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
      else { e.parado = (e.parado || 0) + dt; if(e.parado > .4){ if(S.acao && S.alvo && !S.rota.length && Math.hypot(S.alvo.x - e.x, S.alvo.z - e.z) < 2.4) chegou(); else { S.alvo = null; S.acao = null; S.rota = []; } } }
    } else { e.andando = false; }
    /* a câmera segue o boneco (e sobe junto no mezanino); andando, ela vai girando pra ficar atrás dele, a não ser
       que você tenha acabado de arrastar pra olhar de outro lado */
    const c = S.cam, f = Math.min(1, dt * 6);
    c.tx += (e.x - c.tx) * f; c.tz += (e.z - c.tz) * f; c.ty += (e.y + 1.1 - c.ty) * f;
    if(e.andando && S.modo === 'andar' && Date.now() - (S.arrastou || 0) > 3000){ const alvo = e.yaw + Math.PI; let d = alvo - c.th; d = Math.atan2(Math.sin(d), Math.cos(d)); c.th += d * Math.min(1, dt * 1.6); }
    const onde = comodoDe(e.x, e.z, nivelDe(e.y)); const nome = naEscada(e.x, e.z) ? 'Escada' : onde ? onde.nome : 'Lá fora'; if(nome !== S.ultOnde){ S.ultOnde = nome; const o = C.$('cs-onde'); if(o) o.textContent = nome; }
  }
  /* ---------- v3.40 · pular, e a plaquinha do que dá pra fazer perto (o mesmo botão no celular, Enter no teclado) ---------- */
  const PULO_MS_C = 480, PULO_ALT = .62;
  const puloCasa = o => { const t0 = o && o.puT; if(!t0) return 0; const f = (performance.now() - t0) / PULO_MS_C; return f > 0 && f < 1 ? 4 * f * (1 - f) : 0; };
  function pulaCasa(){
    const e = S.eu; if(!e || !S.aberta || S.modo !== 'andar' || puloCasa(e) > 0) return;
    e.puT = performance.now(); if(C.verso.marcaPulo) C.verso.marcaPulo();
    if(C.versoSom){ C.versoSom.pulo(''); setTimeout(() => { if(S.aberta && C.versoSom) C.versoSom.cai(.9); }, PULO_MS_C - 40); }
  }
  /* o que tá perto: uma ferramenta (na tua casa), uma ação (discos, skate, fliperama), a escada ou a saída */
  function pertoDe(){
    const e = S.eu; if(!e || S.modo !== 'andar') return null;
    const n = nivelDe(e.y); let melhor = null, md = 1.6;
    const ve = (d, o) => { if(d < md){ md = d; melhor = o; } };
    if(S.meu) S.fixos.forEach(f => { if((f.y > 1.5 ? 1 : 0) !== n) return; const nome = f.trava ? f.titulo + ' · em breve' : f.agente ? AGENTE[agenteDe(S.dono)].nome : f.id === 'horus' && !estAberta(f) ? 'Hórus desligado' : f.titulo; ve(Math.hypot(e.x - f.x - f.w / 2, e.z - f.z - f.d / 2) - Math.max(f.w, f.d) / 2, { t: 'est', e: f, nome: 'Abrir: ' + nome }); });
    acoes().forEach(a => { if(!acaoPraMim(a) || (a.y > 1.5 ? 1 : 0) !== n) return; ve(Math.hypot(e.x - a.x - a.w / 2, e.z - a.z - a.d / 2) - Math.max(a.w, a.d) / 2, { t: 'acao', a, nome: rotuloAcao(a) }); });
    if(PL.escada){ const es = PL.escada, cx = (es.x0 + es.x1) / 2; ve(n === 1 ? Math.hypot(e.x - cx, e.z - (es.z0 - .7)) - .4 : Math.hypot(e.x - cx, e.z - (es.z1 + .9)) - .4, { t: 'escada', nome: n === 1 ? 'Descer a escada' : 'Subir a escada' }); }
    if(n === 0) ve(Math.hypot(e.x - ENTRADA.x, e.z - (ENTRADA.z - .4)) - .3, { t: 'saida', nome: S.meu ? 'Sair pra rua' : 'Sair' });
    return melhor;
  }
  function portaCasa(){
    const b = C.$('cs-porta'); if(!b) return;
    const p = S.modo === 'andar' && !S.alvo ? pertoDe() : null; S.perto = p;
    const txt = p ? p.nome : '';
    if(b.dataset.txt !== txt){ b.dataset.txt = txt; b.hidden = !p; if(p) b.innerHTML = `${ico(p.t === 'saida' ? 'prev' : p.t === 'escada' ? 'up' : p.t === 'est' ? 'raio' : p.a && p.a.a === 'discos' ? 'musica' : p.a && p.a.a === 'jogo' ? 'play' : 'eu')}<span>${esc(p.nome)}</span>`; }
  }
  function acaoPerto(){
    const p = S.perto || pertoDe(); if(!p || !S.eu) return;
    if(p.t === 'est') vaiNaEstacao(p.e);
    else if(p.t === 'acao') vaiNaAcao(p.a);
    else if(p.t === 'saida') vaiSair();
    else if(p.t === 'escada'){ const es = PL.escada, cx = (es.x0 + es.x1) / 2; if(nivelDe(S.eu.y) === 1) andaPra(cx, es.z1 + .7, 0); else andaPra(cx, es.z0 - .7, 1); }
  }
  function chegou(){
    /* no meio de uma rota (pela escada): o próximo ponto */
    if(S.rota && S.rota.length){ S.alvo = S.rota.shift(); return; }
    const a = S.acao; S.alvo = null; S.acao = null; if(!a) return;
    if(a.t === 'saida'){ fechar(); return; }
    if(a.t === 'est') abreEstacao(a.e);
    if(a.t === 'acao') fazAcao(a.a);
  }
  /* o caminho até um ponto de outro andar passa pela escada: pé da escada → topo → o ponto (e, descendo, sai do pé
     pro lado antes de seguir, pra não voltar pela rampa de viés) */
  function tracaRota(x, z, n){
    const atual = S.eu ? nivelDe(S.eu.y) : 0, e = PL.escada;
    if(!e || n === atual) return [{ x, z, n }];
    const cx = (e.x0 + e.x1) / 2, pe = { x: cx, z: e.z1 + .9, n: 0 }, topo = { x: cx, z: e.z0 - .7, n: 1 };
    if(n === 1) return [pe, topo, { x, z, n }];
    const lado = x < e.x0 - .5 ? [{ x: e.x0 - 1, z: e.z1 + .9, n: 0 }] : [];
    return [topo, pe, ...lado, { x, z, n }];
  }

  /* ---------- as ferramentas do escritório abrem o balcão por cima da casa ---------- */
  function abreEstacao(e){
    if(!S.meu || !e) return;
    if(e.id === 'manual'){ if(C.manual) C.manual.abrir(); return; }
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
    if(h && h.dono === 'saida'){ vaiSair(); return; }
    /* tocou na escada: sobe (ou desce) ela inteira */
    if(h && h.dono === 'escada' && PL.escada && S.eu){ const e = PL.escada, cx = (e.x0 + e.x1) / 2; if(nivelDe(S.eu.y) === 1) andaPra(cx, e.z1 + .7, 0); else andaPra(cx, e.z0 - .7, 1); return; }
    if(h && h.dono && h.dono.startsWith('est:')){ const e = S.fixos.find(x => x.id === h.dono.slice(4)); if(e){ vaiNaEstacao(e); return; } }
    if(h && h.dono && (h.dono.startsWith('decor:') || h.dono.startsWith('item:'))){ const id = (h.dono.startsWith('decor:') ? 'd' : 'i') + h.dono.split(':')[1]; const a = acoes().find(x => x.id === id); if(a && acaoPraMim(a)){ vaiNaAcao(a); return; } }
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
    if(p.arrasta){ S.cam.th -= dx * .008; S.cam.ph = Math.max(.25, Math.min(1.35, S.cam.ph + dy * .004)); S.arrastou = Date.now(); }
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
    if(k === ' '){ e.preventDefault(); if(e.type === 'keydown' && !e.repeat) pulaCasa(); return; }
    if(e.type !== 'keydown') return;
    if(k === 'q'){ S.cam.th += Math.PI / 4; S.arrastou = Date.now(); } else if(k === 'e'){ S.cam.th -= Math.PI / 4; S.arrastou = Date.now(); }
    else if(k === 'r' && S.ghost){ giraGhost(); }
    else if(k === 'Enter' && S.modo === 'colocar'){ colocaGhost(); }
    else if(k === 'Enter' && S.modo === 'andar'){ e.preventDefault(); acaoPerto(); }
    else if(k === 'Escape'){ e.preventDefault(); if(S.modo === 'colocar') cancelaGhost(); else if(S.modo === 'decorar') decorar(false); else fechar(); }
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
  const etiquetaItem = it => { const t = []; if(it.luxo) return 'Em breve'; if(it.cores) t.push(it.cores.length + ' cores'); if(it.anima) t.push('mexe'); if(it.acao) t.push(it.acao === 'jogo' ? 'joga' : it.acao === 'discos' ? 'toca' : 'pega'); if(it.parede) t.push('parede'); if(it.teto) t.push('teto'); return t.join(' · ') || 'grátis'; };
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
      <div class="cs-top"><span class="cs-titulo"><b id="cs-titulo"></b><small id="cs-onde"></small></span><span class="cs-top-r"><b class="cs-live" id="cs-live" hidden></b><button type="button" class="cvr-bc-b cs-disco-b" id="cs-disco-b" data-act="cs-disco-b" hidden></button><button type="button" class="cvr-bc-b cvr-som cs-som" id="cs-som" data-act="cvr-som" aria-pressed="false" hidden></button><button type="button" class="cvr-bc-b cs-mic" id="cs-mic" data-act="cs-mic" aria-pressed="false">${ico('micoff')}<span>Mic desligado</span></button><button type="button" class="cvr-bc-b cs-sair" data-act="cs-sair">${ico('prev')}<span>Sair pra rua</span></button></span></div>
      <div class="cs-cam"><button type="button" data-act="cs-cam" data-k="esq" title="Girar (Q)" aria-label="Girar a câmera pra esquerda">${ico('prev')}</button><button type="button" data-act="cs-cam" data-k="dir" title="Girar (E)" aria-label="Girar a câmera pra direita">${ico('next')}</button><button type="button" data-act="cs-cam" data-k="perto" aria-label="Aproximar">${ico('plus')}</button><button type="button" data-act="cs-cam" data-k="longe" aria-label="Afastar">${ico('down')}</button></div>
      <div class="cs-bar" id="cs-bar"></div>
      <button type="button" class="cs-porta" id="cs-porta" data-act="cs-porta" hidden></button>`;
    document.body.appendChild(el); S.el = el; S.cv = C.$('cs-cv'); S.ctx = S.cv.getContext('2d');
    /* v3.40: no celular, o controle de videogame (direcional + pular); o botão de som é o mesmo da cidade */
    if(C.pad && C.pad.toque()){ S.pad = C.pad.cria(el, { pula: () => pulaCasa() }); el.classList.add('toque'); }
    if(C.versoSom && C.versoSom.botao) C.versoSom.botao(C.$('cs-som'));
    S.cv.addEventListener('pointerdown', pointerDown); S.cv.addEventListener('pointermove', pointerMove); S.cv.addEventListener('pointerup', pointerUp); S.cv.addEventListener('pointercancel', pointerUp);
    S.cv.addEventListener('wheel', roda, { passive: false });
    addEventListener('keydown', tecla); addEventListener('keyup', tecla); addEventListener('blur', soltar); addEventListener('resize', tamanho);
    tamanho();
  }
  /* abrir: se der qualquer erro, avisa na tela (em vez de ficar em silêncio) */
  async function abrir(o){
    try{ await abrirMesmo(o); }
    catch(e){ try{ console.error('[casa] abrir', e); }catch(_){} S.aberta = false; if(S.el) S.el.hidden = true; C.toast('Não deu pra abrir a casa: ' + String((e && e.message) || e).slice(0, 120), 6000); }
  }
  const comTempo = (p, ms) => Promise.race([p, new Promise(r => setTimeout(r, ms))]);
  async function abrirMesmo(o){
    o = o || {}; if(S.aberta) fechar(true);
    if(!C.st.me || !C.verso) return;
    const meu = !o.id || o.id === C.st.me.id;
    let dono = C.st.me;
    if(!meu){
      try{ dono = await comTempo(C.api.one('corre_perfis', { eq: { id: o.id } }), 6000); }catch(e){ dono = null; }
      if(!dono){ C.toast('Não deu pra abrir essa casa agora.'); return; }
    } else if(C.recarregaMe){ try{ await comTempo(C.recarregaMe(), 4000); dono = C.st.me; }catch(e){} }
    S.meu = meu; S.dono = dono; S.sujo = false;
    usaPlanta(plantaDe(dono)); S.decor = PL.decor || [];
    S.fixos = ESTACOES.filter(e => paraDono(e, dono)).map(e => Object.assign({ y: 0 }, e, (PL.estacoes || {})[e.id] || {}));
    S.itens = lerCasa(dono.casa); S.outras = outrasPlantas(dono.casa);
    S.modo = 'andar'; S.sel = -1; S.ghost = null; S.cacheItens = null; S.alvo = null; S.acao = null; S.rota = []; S.teclas.clear(); S.tags.clear(); S.ultOnde = ''; S.disco = null; S.discoAtual = ''; S.avisouErro = false;
    const emPe = innerWidth < innerHeight * .85; S.emPe = emPe; S.arrastou = 0;
    /* terceira pessoa: a câmera fica logo atrás e um pouco acima do boneco (pinça, roda ou os botões afastam) */
    S.cam = Object.assign(S.cam, { th: 0, ph: emPe ? .62 : .56, dist: emPe ? 6.2 : 6.8, tx: ENTRADA.x, ty: 1.1, tz: ENTRADA.z - 1.1 });
    const av = C.verso.avLimpo(meu ? C.st.me.verso : (C.st.me.verso), C.st.me.id);
    S.eu = null; montaGrade();
    const nasce = livrePerto(ENTRADA.x, ENTRADA.z - 1.1, 0);
    S.eu = { x: nasce[0], z: nasce[1], y: 0, yaw: Math.PI, passo: 0, andando: false, av };
    if(!S.el || !S.el.isConnected) monta(); else { S.el.hidden = false; C.$('cs-tags').innerHTML = ''; tamanho(); if(C.versoSom && C.versoSom.botao) C.versoSom.botao(C.$('cs-som')); }
    const pc = C.$('cs-porta'); if(pc){ pc.hidden = true; pc.dataset.txt = ''; }
    C.$('cs-titulo').textContent = meu ? 'Tua casa' : 'Casa de @' + (dono.handle || '');
    S.titulo = document.title; document.title = (meu ? 'Tua casa' : 'Casa de @' + (dono.handle || '')) + ' · Correverso';
    barra();
    S.aberta = true; S.tAnt = 0;
    if(!S.hist){ try{ history.pushState({ cvrCasa: 1 }, ''); S.hist = true; }catch(e){} }
    if(C.verso.anunciar) C.verso.anunciar();
    cancelAnimationFrame(S.raf); S.raf = requestAnimationFrame(laco);
    C.toast(meu ? (PL.mezanino ? 'O escritório é lá em cima: sobe pela escada.' : 'Bem-vindo em casa. No escritório, cada móvel é uma ferramenta do Corre.') : `Casa de @${dono.handle || ''}. Só pra olhar.`, 3400);
  }
  function fechar(semHist){
    if(!S.aberta) return;
    if(S.modo === 'colocar') cancelaGhost();
    S.aberta = false; cancelAnimationFrame(S.raf); S.raf = 0; S.teclas.clear(); S.padTh = null; S.perto = null; if(S.pad) S.pad.solta();
    S.disco = null; S.discoAtual = ''; if(C.beats) C.beats.para();
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
    'cs-porta': () => acaoPerto(),
    'cs-ia-quero': async el => { el.disabled = true; try{ const f = Object.assign({}, (C.st.me && C.st.me.ferramentas) || {}, { ia: 'lista' }); await C.saveMe({ ferramentas: f }); C.toast('Tá na lista do Computador IA. A gente te chama.', 3600); iaSheet(); }catch(e){ el.disabled = false; C.toast(C.errMsg(e)); } },
    'cs-mic': () => { if(C.acts['cvr-mic']) C.acts['cvr-mic'](); },
    'cs-cam': el => { const k = el.dataset.k; S.arrastou = Date.now(); if(k === 'esq') S.cam.th += Math.PI / 4; else if(k === 'dir') S.cam.th -= Math.PI / 4; else if(k === 'perto') S.cam.dist = Math.max(PERTAO, S.cam.dist - 1.5); else S.cam.dist = Math.min(LONGE(), S.cam.dist + 1.5); },
    'cs-tag': el => { const k = el.dataset.k; if(k === 'saida'){ vaiSair(); return; } if(k.startsWith('acao:')){ const a = acoes().find(x => x.id === k.slice(5)); if(a) vaiNaAcao(a); return; } const e = S.fixos.find(x => 'est:' + x.id === k); if(e) vaiNaEstacao(e); },
    'cs-ag-trocar': () => agentesSheet(),
    'cs-ag-escolhe': el => escolheAgente(el.dataset.k),
    'cs-ag-grana': () => { C.closeSheet(); const e = S.fixos.find(x => x.id === 'grana'); if(e) abreEstacao(e); },
    'cs-ag-lista': async el => { el.disabled = true; try{ const f = Object.assign({}, (C.st.me && C.st.me.ferramentas) || {}, { robo: 'lista' }); await C.saveMe({ ferramentas: f }); C.toast('Tá na lista do robô. A gente te chama quando abrir.', 3600); agenteSheet(); }catch(e){ el.disabled = false; C.toast(C.errMsg(e)); } },
    'cs-disco': el => poeDisco(el.dataset.k),
    'cs-disco-para': () => poeDisco(''),
    'cs-disco-b': () => discosSheet(),
    'cs-decorar': () => decorar(true),
    'cs-pronto': () => decorar(false),
    'cs-loja': () => loja(),
    'cs-cat': el => loja(el.dataset.k),
    'cs-pega': el => pega(el.dataset.k),
    'cs-gira': () => giraGhost(),
    'cs-coloca': () => colocaGhost(),
    'cs-cancela': () => { const v = S.ghost && S.ghost.volta; cancelaGhost(); if(v){ S.itens.splice(v.i, 0, v.o); S.cacheItens = null; montaGrade(); } },
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
    const guarda = { PL, fixos: S.fixos, decor: S.decor, itens: S.itens, eu: S.eu, cache: S.cacheItens, cacheFraco: S.cacheFraco, cam: S.cam, ghost: S.ghost };
    try{
      usaPlanta(plantaDe(dono)); S.decor = PL.decor || [];
      S.fixos = ESTACOES.filter(e => paraDono(e, dono)).map(e => Object.assign({ y: 0 }, e, (PL.estacoes || {})[e.id] || {}));
      S.itens = lerCasa(dono && dono.casa); S.eu = null; S.cacheItens = null; S.ghost = null;
      const r = cv.getBoundingClientRect(), cw = Math.max(120, Math.round((r.width || 360) / 2)), chh = Math.max(70, Math.round((r.height || 200) / 2));
      if(cv.width !== cw || cv.height !== chh){ cv.width = cw; cv.height = chh; }
      const asp = cw / chh, fov = 44 * Math.PI / 180, hfov = 2 * Math.atan(Math.tan(fov / 2) * asp);
      S.cam = { th: .28, ph: .78, dist: Math.max(W * 1.08 / 2 / Math.tan(hfov / 2) / Math.cos(.78) * .94, 12), tx: W / 2, ty: PL.mezanino ? 1.4 : .5, tz: D * .52, fov };
      const cam = camera(cv), ctx = cv.getContext('2d');
      const g = ctx.createLinearGradient(0, 0, 0, cv.height); g.addColorStop(0, '#0B1430'); g.addColorStop(.55, '#1B2A5A'); g.addColorStop(1, '#2B2F38');
      ctx.fillStyle = g; ctx.fillRect(0, 0, cv.width, cv.height);
      const pisos = pisosDaCasa(), extras = []; pisos.push(...sombras(extras));
      cena(ctx, cv, cam, pisos, [...solidosParedes(cam), ...solidosAndares(), ...solidosFixos(), ...solidosItens(), ...extras], null);
    }catch(e){ try{ console.error('[casa] prévia', e); }catch(_){} }
    finally{ usaPlanta(guarda.PL); S.fixos = guarda.fixos; S.decor = guarda.decor; S.itens = guarda.itens; S.eu = guarda.eu; S.cacheItens = guarda.cache; S.cacheFraco = guarda.cacheFraco; S.cam = guarda.cam; S.ghost = guarda.ghost; }
  }
  C.casa = { abrir, fechar, aberta: () => S.aberta, estado: () => S, ITENS, CAT, ESTACOES, encosta, alturaItem: (it, i) => alturaItem(it, i), COMODOS: () => COMODOS, planta: () => PL, plantaDe, lerCasa, miniatura, tela, serial, previa, acoes, disco: () => S.disco, discoAtual: () => S.discoAtual, poeDisco, AGENTES, agenteDe: () => agenteDe(S.dono),
    sala: () => (S.aberta && S.dono ? String(S.dono.id || '') : ''), pos: () => (S.aberta && S.eu ? { x: S.eu.x, y: S.eu.y || 0, z: S.eu.z, yaw: S.eu.yaw, andando: !!S.eu.andando } : null), gente };
})();
