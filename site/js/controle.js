/* CORRE · CONTROLE DE VIDEOGAME (v5.06)
   O Thales: "como eu faço pra jogar com controle no Correverso?". O controle de Xbox, de PlayStation, o Pro do Switch (ou
   outro que o navegador entende), por Bluetooth ou por cabo, joga a cidade, os lugares 3D, as corridas e os jogos da
   moldura. Regra do navegador (privacidade): ele só mostra o controle depois do primeiro botão apertado com o Corre aberto.
   A cada quadro lê o controle (navigator.getGamepads) e faz o que o teclado faria, conforme onde a pessoa tá:
     - na cidade e no 3D: o analógico esquerdo anda com força (devagar ou correndo; a cidade e a casa leem o vetor()); o
       direcional manda as setas (as sequências do minijogo das tarefas são nele); A/✕ pula (espaço: pesca, derrapa no
       kart, chuta no desafio), X/□ é o botão amarelo (Enter: entrar, trocar ideia, sentar), Y/△ empurra e, no kart, usa o
       item (F), B/○ volta (Esc). No 3D, LB/RB e o analógico direito giram a câmera; na cidade, mudam o zoom. RT acelera e
       LT freia nas corridas (gatilhos()). Menu/Options abre o Mapa; View/Share mostra os botões;
     - com uma folha, uma pergunta, a foto do Noel ou a barraca aberta, ele vira controle de menu: o direcional (ou o
       analógico) anda entre os botões pelo lugar deles na tela, A aperta, B fecha, o analógico direito rola;
     - nos jogos da moldura (são do mesmo endereço do Corre), as teclas vão pra dentro do jogo: o analógico e o direcional
       viram as setas, A espaço, X e Menu Enter, Y o E, B o Esc; View sai do jogo.
   As teclas são eventos de teclado feitos aqui, então cada canto do Correverso que já entende o teclado entende o controle
   sem mudar nada. O controle desenhado na tela do celular (pad.js) some enquanto o de verdade tá sendo usado e volta no
   primeiro toque na tela. Liga quando a cidade abre (verso.js) e desliga quando ela fecha: fora do Correverso, nada.
   C.controle = { liga(), desliga(), conectado(), usando(), camada(), vetor(), direito(), gatilhos(), nome(b), treme(ms, f), ajuda(on), estado() } */
(function(){
  'use strict';
  const C = window.Corre; if(!C) return;
  const { ico, esc } = C;
  const temApi = () => typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function';
  /* a posição dos botões no mapeamento padrão do navegador (é pela posição, não pela letra: o de baixo é o A do Xbox, o ✕
     do PlayStation e o B do Switch) */
  const BT = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, VIEW: 8, MENU: 9, L3: 10, R3: 11, CIMA: 12, BAIXO: 13, ESQ: 14, DIR: 15 };
  const NOMES = {
    xbox: { A: 'A', B: 'B', X: 'X', Y: 'Y', LB: 'LB', RB: 'RB', LT: 'LT', RT: 'RT', VIEW: 'View', MENU: 'Menu' },
    ps: { A: '✕', B: '○', X: '□', Y: '△', LB: 'L1', RB: 'R1', LT: 'L2', RT: 'R2', VIEW: 'Share', MENU: 'Options' },
    nin: { A: 'B', B: 'A', X: 'Y', Y: 'X', LB: 'L', RB: 'R', LT: 'ZL', RT: 'ZR', VIEW: '−', MENU: '+' }
  };
  /* o nome que o navegador dá ("Xbox Wireless Controller", "DualSense Wireless Controller", "Wireless Controller" do
     PS4 no Mac, "Pro Controller"); o fabricante (Vendor 045e Microsoft, 054c Sony, 057e Nintendo) desempata */
  const tipoDe = id => { id = id || ''; return /xbox|045e|xinput/i.test(id) ? 'xbox' : /054c|playstation|dualsense|dualshock|^wireless controller/i.test(id) ? 'ps' : /057e|nintendo|pro controller|joy-?con/i.test(id) ? 'nin' : 'xbox'; };
  const MORTA = .2, MORTA_D = .14;
  /* o código de tecla de cada uma (os jogos da moldura leem o e.code; o Elo Perdido lê o e.key) */
  const CODE = { ' ': 'Space', Enter: 'Enter', Escape: 'Escape', ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown', ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight', f: 'KeyF', e: 'KeyE', q: 'KeyQ' };
  const KC = { ' ': 32, Enter: 13, Escape: 27, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, f: 70, e: 69, q: 81 };
  const SETA = { CIMA: 'ArrowUp', BAIXO: 'ArrowDown', ESQ: 'ArrowLeft', DIR: 'ArrowRight' };

  const G = {
    ligado: false, raf: 0, espera: 0, idx: -1, tipo: '', usando: false, ant: {}, ax: [0, 0, 0, 0], lt: 0, rt: 0, cam: '',
    /* as teclas que o controle tá segurando agora: botão → { doc, k } (soltar manda o keyup pro mesmo lugar) */
    segura: new Map(), setas: new Map(), rep: null, zT: 0, zAc: 1, ajudaT: 0, mostrou: false, tAnt: 0
  };

  function pega(){
    if(!temApi()) return null;
    let lista; try{ lista = navigator.getGamepads(); }catch(e){ return null; }
    if(!lista) return null;
    const vivos = [...lista].filter(p => p && p.connected !== false);
    if(!vivos.length) return null;
    return vivos.find(p => p.index === G.idx) || vivos.find(p => p.mapping === 'standard') || vivos[0];
  }
  const apertado = (p, i) => { const b = p.buttons && p.buttons[i]; return !!b && (b.pressed || b.value > .5); };
  const valor = (p, i) => { const b = p.buttons && p.buttons[i]; return b ? Math.max(0, Math.min(1, +b.value || (b.pressed ? 1 : 0))) : 0; };
  /* a zona morta redonda: o analógico parado nunca é perfeitamente zero */
  function morta(x, y, m0){ const m = Math.hypot(x, y); if(!(m > m0)) return { x: 0, y: 0, m: 0 }; const f = Math.min(1, (m - m0) / (1 - m0)); return { x: x / m * f, y: y / m * f, m: f }; }

  /* ---------- onde a pessoa tá: menu, jogo da moldura, lugar 3D ou cidade ---------- */
  const visivel = el => !!el && !el.hidden && el.isConnected && !!el.getClientRects().length;
  function esc2(doc){ manda(doc, 'keydown', 'Escape'); manda(doc, 'keyup', 'Escape'); }
  function camada(){
    if(!G.ligado) return null;
    const dl = [...document.querySelectorAll('dialog[open]')].pop();
    if(dl) return { k: 'menu', doc: document, el: dl, fecha: () => { try{ dl.close(); }catch(e){} } };
    const sh = C.$('sheet');
    if(sh && !sh.hidden){ const pn = sh.querySelector('.panel') || sh; return { k: 'menu', doc: document, el: pn, fecha: () => C.closeSheet() }; }
    for(const id of ['cvr-pola', 'cvr-vire']){ const el = document.getElementById(id); if(visivel(el)) return { k: 'menu', doc: document, el, fecha: () => esc2(document) }; }
    /* a barraca (o Corre dentro de um quadro): anda entre os botões de lá; B fecha a folha de lá ou volta pra rua */
    const bc = document.getElementById('cvr-balcao');
    if(bc && !bc.hidden){
      const fr = bc.querySelector('iframe'), voltar = () => { const v = bc.querySelector('.cvr-bc-volta'); if(v) v.click(); };
      let d = null; try{ d = fr && fr.contentDocument; }catch(e){}
      if(!d || !d.body) return { k: 'menu', doc: document, el: bc, fecha: voltar };
      const dl2 = [...d.querySelectorAll('dialog[open]')].pop(); if(dl2) return { k: 'menu', doc: d, el: dl2, fecha: () => { try{ dl2.close(); }catch(e){} } };
      const sh2 = d.getElementById('sheet'), W = fr.contentWindow;
      if(sh2 && !sh2.hidden) return { k: 'menu', doc: d, el: sh2.querySelector('.panel') || sh2, fecha: () => { try{ W.Corre.closeSheet(); }catch(e){ voltar(); } } };
      return { k: 'menu', doc: d, el: d.getElementById('app') || d.body, fecha: voltar };
    }
    const j = document.getElementById('cvr-jogo');
    if(j && !j.hidden){ const fr = j.querySelector('iframe'); let d = null; try{ d = fr && fr.contentDocument; }catch(e){} return { k: 'jogo', doc: d && d.body ? d : null, el: j }; }
    if(C.casa && C.casa.aberta && C.casa.aberta()) return { k: 'casa', doc: document };
    return { k: 'cidade', doc: document };
  }

  /* ---------- as teclas de mentira ---------- */
  function manda(doc, tipo, k){
    if(!doc) return;
    const w = doc.defaultView || window;
    let ev; try{ ev = new w.KeyboardEvent(tipo, { key: k, code: CODE[k] || '', bubbles: true, cancelable: true, composed: true }); }catch(e){ return; }
    /* jogo antigo que ainda lê o número da tecla */
    try{ Object.defineProperty(ev, 'keyCode', { get: () => KC[k] || 0 }); Object.defineProperty(ev, 'which', { get: () => KC[k] || 0 }); }catch(e){}
    /* no jogo, na casa e na cidade, a tecla sai do corpo da página: o foco perdido num botão (o Mapa que fechou, o amarelo)
       não pode engolir a tecla. Nos jogos da moldura, sai de quem tem o foco lá dentro (como o teclado de verdade) */
    const a = doc.activeElement, alvo = doc !== document && a && a !== doc.body && !/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) ? a : (doc.body || doc.documentElement);
    try{ alvo.dispatchEvent(ev); }catch(e){}
  }
  function aperta(nome, doc, k){ if(G.segura.has(nome)) return; G.segura.set(nome, { doc, k }); manda(doc, 'keydown', k); }
  function solta(nome){ const s = G.segura.get(nome); if(!s) return; G.segura.delete(nome); manda(s.doc, 'keyup', s.k); }
  function soltaTudo(){ for(const n of [...G.segura.keys()]) solta(n); for(const [k, d] of G.setas) manda(d, 'keyup', k); G.setas.clear(); G.rep = null; }
  /* as setas que valem agora (o direcional, ou o analógico no jogo da moldura): aperta as novas, solta as que saíram */
  function setas(doc, quer){
    for(const [k, d] of [...G.setas]) if(!quer.has(k) || d !== doc){ manda(d, 'keyup', k); G.setas.delete(k); }
    for(const k of quer) if(!G.setas.has(k)){ G.setas.set(k, doc); manda(doc, 'keydown', k); }
  }

  /* ---------- o menu: anda entre os botões pelo lugar deles na tela ---------- */
  const FOCAVEL = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';
  function focaveis(el){
    const w = el.ownerDocument.defaultView || window;
    return [...el.querySelectorAll(FOCAVEL)].filter(x => {
      if(x.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
      const r = x.getBoundingClientRect(); if(r.width < 2 || r.height < 2) return false;
      const cs = w.getComputedStyle(x); return cs.visibility !== 'hidden' && cs.display !== 'none';
    });
  }
  let focoAnt = null;
  function foca(x){
    if(!x) return;
    if(focoAnt && focoAnt !== x) focoAnt.classList.remove('ctl-foco');
    try{ x.focus({ preventScroll: true }); }catch(e){}
    x.classList.add('ctl-foco'); focoAnt = x;
    try{ x.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }catch(e){}
  }
  function primeiro(lista){ return lista.find(x => x.hasAttribute('autofocus')) || lista.find(x => x.classList.contains('pri')) || lista[0]; }
  function anda(cm, dir){
    const lista = focaveis(cm.el); if(!lista.length) return;
    const at = cm.doc.activeElement;
    if(!at || !lista.includes(at)){ foca(primeiro(lista)); return; }
    const a = at.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    const vert = dir === 'cima' || dir === 'baixo', sinal = dir === 'baixo' || dir === 'dir' ? 1 : -1;
    let melhor = null, mv = Infinity;
    for(const x of lista){
      if(x === at) continue;
      const r = x.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      /* tem que estar daquele lado de verdade (a borda, não só o meio: dois botões lado a lado não são "embaixo") */
      const prim = vert ? (sinal > 0 ? r.top - a.bottom : a.top - r.bottom) : (sinal > 0 ? r.left - a.right : a.left - r.right);
      const meio = vert ? (cy - ay) * sinal : (cx - ax) * sinal;
      if(meio <= 2 || prim < -Math.min(a.height, a.width) * .5) continue;
      /* o quanto foge pro lado (zero quando os dois se sobrepõem naquela direção) */
      const lado = vert ? Math.max(0, r.left - a.right, a.left - r.right) : Math.max(0, r.top - a.bottom, a.top - r.bottom);
      const v = Math.max(0, prim) + lado * 2.5 + Math.abs(vert ? cx - ax : cy - ay) * .05;
      if(v < mv){ mv = v; melhor = x; }
    }
    /* nada naquele lado: segue a ordem da folha (direita e baixo é o próximo; esquerda e cima, o anterior) */
    if(!melhor){ const i = lista.indexOf(at), j = i + sinal; if(j >= 0 && j < lista.length && !vert) melhor = lista[j]; }
    if(melhor) foca(melhor);
  }
  function apertaMenu(cm){
    const lista = focaveis(cm.el), at = cm.doc.activeElement;
    if(!at || !lista.includes(at)){ foca(primeiro(lista)); return; }
    if(at.tagName === 'SELECT'){ const n = at.options.length; if(n){ at.selectedIndex = (at.selectedIndex + 1) % n; at.dispatchEvent(new Event('change', { bubbles: true })); } return; }
    if(at.tagName === 'INPUT' && !/^(checkbox|radio|button|submit|reset|color|file|range)$/i.test(at.type)) return;
    if(at.tagName === 'TEXTAREA') return;
    try{ at.click(); }catch(e){}
  }
  function rolaMenu(cm, dy, dt){
    let el = cm.el; const w = el.ownerDocument.defaultView || window;
    while(el && el.scrollHeight <= el.clientHeight + 2) el = el.parentElement;
    const alvo = el || w.document.scrollingElement; if(alvo) alvo.scrollTop += dy * dt * 900;
  }

  /* ---------- quem tá usando ---------- */
  function marcaUso(){
    if(!G.usando){ G.usando = true; document.body.classList.add('ctl-on'); }
  }
  function largaUso(){ if(!G.usando) return; G.usando = false; document.body.classList.remove('ctl-on'); if(focoAnt){ focoAnt.classList.remove('ctl-foco'); focoAnt = null; } }
  /* tocou na tela ou mexeu no mouse/teclado de verdade: o controle da tela volta */
  addEventListener('pointerdown', e => { if(e.isTrusted) largaUso(); }, true);
  addEventListener('keydown', e => { if(e.isTrusted) largaUso(); }, true);
  addEventListener('focusout', e => { if(e.target && e.target.classList) e.target.classList.remove('ctl-foco'); }, true);
  function poeTipo(t){
    if(t === G.tipo) return; G.tipo = t; const N = NOMES[t], s = document.documentElement.style;
    s.setProperty('--ctl-a', JSON.stringify(N.A)); s.setProperty('--ctl-x', JSON.stringify(N.X)); s.setProperty('--ctl-y', JSON.stringify(N.Y));
    document.documentElement.dataset.ctl = t;
  }

  /* ---------- a cada quadro ---------- */
  function quadro(ts){
    G.raf = 0; if(!G.ligado) return;
    const p = pega();
    if(!p){
      /* sem controle: confere de segundo em segundo (o gamepadconnected nem sempre vem) e não gasta quadro */
      if(G.idx !== -1){ soltaTudo(); G.idx = -1; G.ant = {}; G.ax = [0, 0, 0, 0]; G.lt = G.rt = 0; }
      clearTimeout(G.espera); G.espera = setTimeout(() => { if(G.ligado && !G.raf) G.raf = requestAnimationFrame(quadro); }, 1000);
      return;
    }
    const novo = G.idx !== p.index; G.idx = p.index; poeTipo(tipoDe(p.id));
    /* achou o controle: na primeira vez da visita, os botões na tela; depois, só o aviso */
    if(novo){ marcaUso(); if(!G.mostrou){ G.mostrou = true; ajuda(true); } else C.toast('Controle ligado.', 1600); }
    const dt = Math.min(.1, G.tAnt ? Math.max(0, (ts - G.tAnt) / 1000) : .016); G.tAnt = ts;
    if(!document.hidden) processa(p, dt, novo);
    G.raf = requestAnimationFrame(quadro);
  }
  function processa(p, dt, novo){
    const ax = p.axes || [], std = p.mapping === 'standard';
    G.ax = [+ax[0] || 0, +ax[1] || 0, std ? +ax[2] || 0 : 0, std ? +ax[3] || 0 : 0];
    G.lt = std ? valor(p, BT.LT) : 0; G.rt = std ? valor(p, BT.RT) : 0;
    const agora = {}; for(const n in BT){ if(!std && BT[n] > 3) continue; agora[n] = apertado(p, BT[n]); }
    /* o primeiro quadro de um controle novo não aperta nada (o botão que acordou o controle não vira pulo) */
    if(novo){ G.ant = agora; return; }
    const desceu = n => agora[n] && !G.ant[n], subiu = n => !agora[n] && G.ant[n];
    const mexeu = Object.keys(agora).some(n => agora[n]) || G.ax.some(v => Math.abs(v) > .5) || G.lt > .3 || G.rt > .3;
    if(mexeu) marcaUso();
    const cm = camada(), k = cm ? cm.k + (cm.doc && cm.doc !== document ? '+' : '') : '';
    /* mudou de lugar (abriu uma folha, entrou na casa): o que tava apertado solta onde foi apertado */
    if(k !== G.cam){ soltaTudo(); G.cam = k; }
    if(!cm){ G.ant = agora; return; }
    if(desceu('VIEW') && cm.k !== 'jogo') ajuda(!aberta());
    if(cm.k === 'menu') menu(cm, agora, desceu, dt);
    else if(cm.k === 'jogo') jogo(cm, agora, desceu, subiu);
    else mundo(cm, agora, desceu, subiu, dt);
    /* começou a andar (passado um tempinho pra dar de ler): o cartão sai da frente */
    if(aberta() && Date.now() - G.ajudaT > 1200 && G.ax.slice(0, 2).some(v => Math.abs(v) > .3)) ajuda(false);
    G.ant = agora;
  }
  /* o direcional (ou o analógico esquerdo, no menu) com repetição: o primeiro passo na hora, depois de 380 ms anda sozinho */
  function direcao(agora){
    if(agora.CIMA) return 'cima'; if(agora.BAIXO) return 'baixo'; if(agora.ESQ) return 'esq'; if(agora.DIR) return 'dir';
    const [x, y] = G.ax; if(Math.max(Math.abs(x), Math.abs(y)) < .55) return '';
    return Math.abs(x) > Math.abs(y) ? (x > 0 ? 'dir' : 'esq') : (y > 0 ? 'baixo' : 'cima');
  }
  function menu(cm, agora, desceu, dt){
    /* o botão que já tava com o foco (a folha põe no primeiro) ganha o contorno, pra pessoa ver onde tá */
    const at = cm.doc.activeElement;
    if(G.usando && at && at !== cm.doc.body && cm.el.contains(at) && !at.classList.contains('ctl-foco')){ if(focoAnt) focoAnt.classList.remove('ctl-foco'); at.classList.add('ctl-foco'); focoAnt = at; }
    const d = direcao(agora), t = performance.now();
    if(d){ if(!G.rep || G.rep.d !== d){ G.rep = { d, t: t + 380 }; anda(cm, d); } else if(t >= G.rep.t){ G.rep.t = t + 120; anda(cm, d); } }
    else G.rep = null;
    if(desceu('A') || desceu('X')) apertaMenu(cm);
    else if(desceu('B')) cm.fecha();
    if(Math.abs(G.ax[3]) > .25) rolaMenu(cm, G.ax[3], dt);
  }
  function jogo(cm, agora, desceu, subiu){
    const d = cm.doc; if(!d) return;
    const [x, y] = G.ax, quer = new Set();
    if(agora.CIMA || y < -.5) quer.add('ArrowUp'); if(agora.BAIXO || y > .5) quer.add('ArrowDown');
    if(agora.ESQ || x < -.5) quer.add('ArrowLeft'); if(agora.DIR || x > .5) quer.add('ArrowRight');
    setas(d, quer);
    const MAPA = { A: ' ', X: 'Enter', MENU: 'Enter', Y: 'e', B: 'Escape', LB: 'q', RB: 'e' };
    for(const n in MAPA){ if(desceu(n)) aperta(n, d, MAPA[n]); else if(subiu(n)) solta(n); }
    /* View sai do jogo (o B é do jogo: lá dentro o Esc pausa) */
    if(desceu('VIEW')){ soltaTudo(); const b = cm.el.querySelector('.cvr-jogo-x'); if(b) b.click(); }
  }
  function mundo(cm, agora, desceu, subiu, dt){
    const d = document, casa = cm.k === 'casa';
    const quer = new Set(); for(const n in SETA) if(agora[n]) quer.add(SETA[n]);
    setas(d, quer);
    const MAPA = { A: ' ', X: 'Enter', Y: 'f', B: 'Escape' };
    if(casa){ MAPA.LB = 'q'; MAPA.RB = 'e'; }
    for(const n in MAPA){ if(desceu(n)) aperta(n, d, MAPA[n]); else if(subiu(n)) solta(n); }
    if(!casa){
      /* na cidade, LB/RB e o analógico direito mudam o zoom (devagar no analógico, e guarda no aparelho só de vez em quando) */
      const V = C.verso; if(!V || !V.zoom || !V.zoomFator) return;
      if(desceu('LB')) V.zoom(V.zoomFator() / 1.15); else if(desceu('RB')) V.zoom(V.zoomFator() * 1.15);
      const ry = G.ax[3]; if(Math.abs(ry) > .3) G.zAc *= 1 - ry * dt * 1.1;
      if(G.zAc !== 1 && performance.now() - G.zT > 140){ G.zT = performance.now(); V.zoom(V.zoomFator() * G.zAc); G.zAc = 1; }
      if(desceu('MENU') && C.acts && C.acts['cvr-mapa']){ soltaTudo(); C.acts['cvr-mapa'](); }
    }
    else if(desceu('MENU')) ajuda(!aberta());
  }

  /* ---------- os cartões: a ajuda dos botões e o aviso de ligou/desligou ---------- */
  const aberta = () => { const a = document.getElementById('ctl-ajuda'); return !!(a && !a.hidden); };
  function ajudaHTML(){
    const N = NOMES[G.tipo || 'xbox'], k = t => `<i class="ctl-k">${esc(t)}</i>`;
    const linhas = [
      [k('◎') + k('✛'), 'Andar (o analógico esquerdo ou o direcional)'],
      [k(N.A), 'Pular, pescar, derrapar no kart'],
      [k(N.X), 'O botão amarelo: entrar, trocar ideia, sentar'],
      [k(N.Y), 'Empurrar; no kart, usar o item'],
      [k(N.B), 'Voltar e fechar'],
      [k(N.LB) + k(N.RB), 'Câmera no 3D; zoom na cidade'],
      [k(N.RT) + k(N.LT), 'Acelerar e frear na corrida'],
      [k(N.MENU), 'Mapa da cidade'],
      [k(N.VIEW), 'Estes botões (num jogo, sai dele)']
    ];
    return `<div class="ctl-aj-t">${ico('controle')}<b>Controle ligado</b><small>Numa folha: o direcional anda, ${esc(N.A)} aperta, ${esc(N.B)} fecha</small></div><ul>${linhas.map(l => `<li><span>${l[0]}</span>${esc(l[1])}</li>`).join('')}</ul>`;
  }
  function ajuda(on){
    let a = document.getElementById('ctl-ajuda');
    if(!on){ if(a) a.hidden = true; clearTimeout(G.ajudaFim); return; }
    if(!a){ a = document.createElement('div'); a.id = 'ctl-ajuda'; a.className = 'ctl-ajuda'; a.setAttribute('role', 'status'); a.setAttribute('aria-live', 'polite'); document.body.appendChild(a); }
    a.innerHTML = ajudaHTML(); a.hidden = false; G.ajudaT = Date.now();
    clearTimeout(G.ajudaFim); G.ajudaFim = setTimeout(() => ajuda(false), 12000);
  }
  function liga(){
    if(G.ligado) return; G.ligado = true; G.cam = ''; G.ant = {}; G.idx = -1;
    if(!G.raf) G.raf = requestAnimationFrame(quadro);
  }
  function desliga(){
    if(!G.ligado) return;
    soltaTudo(); G.ligado = false; cancelAnimationFrame(G.raf); G.raf = 0; clearTimeout(G.espera); G.cam = ''; ajuda(false); largaUso();
  }
  /* o controle apareceu: acorda a leitura na hora (o aviso e a ajuda vêm do quadro, que também acha o controle que já
     tava ligado antes da cidade abrir) */
  addEventListener('gamepadconnected', () => { if(G.ligado && !G.raf){ clearTimeout(G.espera); G.raf = requestAnimationFrame(quadro); } });
  addEventListener('gamepaddisconnected', e => {
    if(!G.ligado || !e.gamepad || e.gamepad.index !== G.idx) return;
    soltaTudo(); G.idx = -1; G.ant = {}; G.ax = [0, 0, 0, 0]; G.lt = G.rt = 0; largaUso();
    C.toast('O controle desconectou. Liga de novo ou joga pela tela.', 3200);
  });

  /* ---------- o que a cidade, a casa e as corridas leem ---------- */
  const noMundo = () => G.idx !== -1 && (G.cam === 'cidade' || G.cam === 'casa');
  C.controle = {
    liga, desliga, ajuda,
    conectado: () => G.idx !== -1,
    usando: () => G.usando && G.idx !== -1,
    camada: () => G.cam,
    /* o analógico esquerdo (x pra direita, y pra baixo, de -1 a 1; m é a força), zero fora da cidade e do 3D */
    vetor: () => noMundo() ? morta(G.ax[0], G.ax[1], MORTA) : { x: 0, y: 0, m: 0 },
    direito: () => { if(!noMundo()) return { x: 0, y: 0 }; const v = morta(G.ax[2], G.ax[3], MORTA); return { x: v.x, y: v.y }; },
    gatilhos: () => noMundo() ? { l: G.lt > MORTA_D ? G.lt : 0, r: G.rt > MORTA_D ? G.rt : 0 } : { l: 0, r: 0 },
    nome: b => (NOMES[G.tipo || 'xbox'] || NOMES.xbox)[b] || b,
    /* o tremido do controle (quando tem motor e tá sendo usado): bateu, fisgou, levou empurrão */
    treme(ms, forca){
      if(!G.usando) return; const p = pega(), va = p && p.vibrationActuator; if(!va || typeof va.playEffect !== 'function') return;
      const f = Math.max(.1, Math.min(1, forca == null ? .6 : forca));
      try{ const r = va.playEffect('dual-rumble', { startDelay: 0, duration: Math.max(20, Math.min(1500, ms || 120)), weakMagnitude: f * .7, strongMagnitude: f }); if(r && r.catch) r.catch(() => {}); }catch(e){}
    },
    /* pros testes */
    estado: () => ({ ligado: G.ligado, conectado: G.idx !== -1, usando: G.usando, camada: G.cam, tipo: G.tipo, segura: [...G.segura.values()].map(s => s.k), setas: [...G.setas.keys()] })
  };
})();
