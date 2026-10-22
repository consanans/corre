/* CORRE · HÓRUS: A MESA (v4.24)
   O Thales: "refaça ele de uma forma gostosa de ver e de mexer, que dê prazer achar o lead real e quente e mandar
   mensagem direto no WhatsApp dele". O Radar vira uma mesa de cartas: um cliente por vez, grande, o melhor em cima.
   - A carta: o calor contando até o número, os selos que provam que a empresa existe (WhatsApp, Instagram, site, no
     mapa; cada um abre pra conferir) e o "Conferi, existe", o porquê de ser agora e a mensagem pronta num balão que dá
     pra mexer (ou pedir pra IA, ou uma resposta pronta pra quem tá esperando).
   - OURO: tem celular, é quente (60+) e tem mais uma prova de que existe, ou chegou sozinho (pediu orçamento, te
     escolheu no Mural). Carta de ouro carimba, brilha e toca.
   - O gesto: arrasta pra direita (ou Enter, ou →) e o WhatsApp dele abre com a mensagem, e o toque já conta; pra
     esquerda descarta (a barra do Desfazer deixa trocar o motivo); o Pular manda pro fim da mesa.
   - A ordem: quem tá esperando você, os retornos que venceram e os novos (ouro primeiro, celular antes do fixo).
   - Em cima, o dia: o anel dos toques até a meta (bateu, confete), quem espera, o ouro na mesa. Do lado, o olho do
     Hórus (o radar com a carta de cima marcada; tocou num ponto, ele vem pra mesa) e os próximos da mesa.
   - Garimpar: um toque e o Hórus varre o mapa da praça atrás de empresas com telefone que ainda não tão no radar.
   Som curto e sintetizado (dá pra desligar; fica no aparelho) e vibração no celular. Com "menos movimento", nada voa.
   Nada novo no banco: o toque, a cadência e o descarte são os de sempre; o "conferido" é um registro na linha do tempo. */
(function(){
  'use strict';
  const C = window.Corre, { esc, ico } = C;
  if(!C.horus || !C.horus._) return;
  const Z = C.horus._, H = Z.H;
  const HF = () => C.horusFunil, T = () => C.horusTurbo, LP = () => C.horusLimpa;
  const M = { rolar: false, f: 'tudo', pul: [], feitos: new Set(), txt: {}, alt: {}, topo: '', visto: '', sujo: false, mot: false, rap: false, ia: '', novas: new Set(), busy: false, st: '' };
  const LIM = 110;
  const reduz = () => { try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } };
  const vibra = ms => { try{ if(navigator.vibrate) navigator.vibrate(ms); }catch(e){} };

  /* ---------- as provas de que a empresa existe ---------- */
  const siteDe = l => { const m = String(l.obs || '').match(/https?:\/\/[^\s·,]+|\b(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|app|site|store|shop|art|io)(?:\.br)?\b(?:\/[^\s·,]*)?/i); return m ? (/^https?:/i.test(m[0]) ? m[0] : 'https://' + m[0]) : ''; };
  const mapsDe = l => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([Z.shortName(l.nome), l.endereco, l.bairro, l.cidade, l.uf].filter(Boolean).join(', '));
  const igBusca = l => 'https://www.google.com/search?q=' + encodeURIComponent(`site:instagram.com ${Z.shortName(l.nome)} ${l.cidade || ''}`.trim());
  function selos(l){
    const s = siteDe(l), noMapa = !!(l.endereco || l.lat != null);
    return [
      { k: 'wa', on: !!l.wa, ic: 'wa', t: l.wa ? 'celular' : l.fixo ? 'só fixo' : 'sem telefone', d: l.wa ? `Celular ${Z.fmtTel(l.wa)}: o WhatsApp abre direto nele` : 'Sem celular: o WhatsApp tenta pelo fixo' },
      { k: 'ig', on: !!l.insta, ic: 'ig', t: l.insta ? '@' + l.insta : 'Instagram?', href: l.insta ? `https://www.instagram.com/${encodeURIComponent(l.insta)}/` : igBusca(l), d: l.insta ? 'Abrir o Instagram' : 'Procurar o Instagram no Google' },
      { k: 'site', on: !!s, ic: 'link', t: s ? s.replace(/^https?:\/\/(www\.)?/i, '').replace(/[/?#].*$/, '').slice(0, 26) : 'sem site', href: s, d: s ? 'Abrir o site' : '' },
      { k: 'mapa', on: noMapa, ic: 'pin', t: noMapa ? 'no mapa' : 'mapa?', href: mapsDe(l), d: 'Ver no Google Maps' }
    ];
  }
  const provas = l => selos(l).filter(x => x.on && x.k !== 'wa').length + (Z.conferido(l) ? 1 : 0);
  const veio = l => Z.pediuLink(l) || Z.escolheuMural(l) || !!(HF() && HF().esperando && HF().esperando(l));
  const ouro = (l, h) => !!l.wa && h >= 60 && (provas(l) >= 1 || veio(l));

  /* ---------- a mesa: quem tá esperando, os retornos e os novos ---------- */
  const ORD = { espera: 0, volta: 1, novo: 2 };
  const ROT = { espera: 'Esperando você', volta: 'Retorno', novo: 'Novo no radar' };
  function grupoDe(l){
    if(Z.DONE.includes(l.st) || !Z.digits(l)) return '';
    const t = Z.today();
    if(veio(l) || ((l.st === 'interesse' || l.st === 'link' || Z.responded(l)) && l.prox && l.prox <= t)) return 'espera';
    if(Z.isDue(l) && Z.nextMsg(l)) return 'volta';
    if(l.st === 'novo' && !l.prox && Z.nextMsg(l)) return 'novo';
    return '';
  }
  function mesa(){
    const it = [];
    H.leads.forEach(l => { if(M.feitos.has(l.id)) return; const g = grupoDe(l); if(!g) return; const h = Z.heat(l); it.push({ l, h, g, ouro: ouro(l, h), p: provas(l) }); });
    it.sort((a, b) => ORD[a.g] - ORD[b.g] || b.ouro - a.ouro || (b.l.wa ? 1 : 0) - (a.l.wa ? 1 : 0) || b.h - a.h || b.p - a.p);
    /* quem foi pulado vai pro fim, na ordem em que foi pulado */
    const pos = id => M.pul.indexOf(id);
    const L = it.filter(o => pos(o.l.id) < 0).concat(it.filter(o => pos(o.l.id) >= 0).sort((a, b) => pos(a.l.id) - pos(b.l.id)));
    if(M.topo){ const i = L.findIndex(o => o.l.id === M.topo); if(i > 0) L.unshift(L.splice(i, 1)[0]); else if(i < 0) M.topo = ''; }
    return L;
  }
  const FILTROS = [['tudo', 'Tudo'], ['ouro', 'Ouro'], ['espera', 'Esperando você'], ['volta', 'Retornos'], ['novo', 'Novos']];
  const filtra = L => M.f === 'tudo' ? L : M.f === 'ouro' ? L.filter(o => o.ouro) : L.filter(o => o.g === M.f);

  /* ---------- som (curto, sintetizado na hora) ---------- */
  const SOM_K = 'corre-horus-som';
  let AC = null;
  const somOn = () => { try{ return localStorage.getItem(SOM_K) !== '0'; }catch(e){ return true; } };
  function som(k){
    if(!somOn()) return;
    try{
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      if(AC.state === 'suspended') AC.resume();
      const t = AC.currentTime, out = AC.createGain(); out.gain.value = 0.14; out.connect(AC.destination);
      const nota = (f, d, at, tipo, vol) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = tipo || 'sine'; o.frequency.setValueAtTime(f, t + at); g.gain.setValueAtTime(0.0001, t + at); g.gain.exponentialRampToValueAtTime(vol || 0.7, t + at + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + at + d); o.connect(g); g.connect(out); o.start(t + at); o.stop(t + at + d + 0.03); };
      const sopro = (de, ate, d, vol) => { const n = AC.createBuffer(1, Math.ceil(AC.sampleRate * d), AC.sampleRate), x = n.getChannelData(0); for(let i = 0; i < x.length; i++) x[i] = Math.random() * 2 - 1;
        const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(); s.buffer = n; f.type = 'bandpass'; f.Q.value = 1.4; f.frequency.setValueAtTime(de, t); f.frequency.exponentialRampToValueAtTime(ate, t + d);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + d * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + d); s.connect(f); f.connect(g); g.connect(out); s.start(t); s.stop(t + d + 0.02); };
      if(k === 'tic') nota(1800, 0.045, 0, 'triangle', 0.3);
      else if(k === 'carta') nota(740, 0.08, 0, 'triangle', 0.35);
      else if(k === 'ouro') [1319, 1568, 1976, 2637].forEach((f, i) => nota(f, 0.4, i * 0.07, 'sine', 0.5));
      else if(k === 'zap'){ sopro(500, 3600, 0.26, 0.9); nota(988, 0.14, 0.16, 'sine', 0.45); nota(1480, 0.2, 0.22, 'sine', 0.35); }
      else if(k === 'joga'){ sopro(1800, 300, 0.22, 0.6); nota(196, 0.12, 0.05, 'triangle', 0.4); }
      else if(k === 'pula') nota(520, 0.07, 0, 'triangle', 0.3);
      else if(k === 'meta') [523, 659, 784, 1047, 1319].forEach((f, i) => nota(f, i === 4 ? 0.7 : 0.16, i * 0.1, 'square', 0.22));
      else if(k === 'achou') [784, 988, 1175, 1568].forEach((f, i) => nota(f, 0.3, i * 0.09, 'triangle', 0.45));
    }catch(e){}
  }

  /* ---------- a página ---------- */
  function html(){
    /* no computador, a carta na frente e o dia, o olho e os próximos na coluna do lado; no celular, o dia em cima */
    return `<section class="mz" id="mz" aria-label="A mesa do Hórus">
      <div class="mz-corpo">
        <div class="mz-main"><div class="hz-chips mz-f" id="mz-f" role="group" aria-label="O que mostrar na mesa"></div><div class="mz-pilha" id="mz-pilha"></div></div>
        <div class="mz-lado">
          <header class="mz-olho">
            <div class="mz-anel" id="mz-anel" role="img" aria-label="Toques hoje"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="tr" cx="60" cy="60" r="52"/><circle class="vl" id="mz-anel-v" cx="60" cy="60" r="52"/></svg><div><b class="num" id="mz-hoje">0</b><small id="mz-meta"></small></div></div>
            <ul class="mz-nums"><li class="e"><b class="num" id="mz-n-esp">0</b><span>esperando você</span></li><li class="o"><b class="num" id="mz-n-ouro">0</b><span>ouro na mesa</span></li><li><b class="num" id="mz-n-mesa">0</b><span>na mesa</span></li><li><b class="num" id="mz-n-seq">0</b><span id="mz-n-seq-t">dias na meta</span></li></ul>
            <div class="mz-olho-acts"><button type="button" class="hz-btn pri mz-garimpa" id="mz-garimpa" data-act="mz-garimpa">${ico('lupa')}<span>Garimpar<small>achar mais com WhatsApp</small></span></button>
              <button type="button" class="hz-btn mz-som" id="mz-som" data-act="mz-som"></button></div>
            <p class="mz-st" id="mz-st" aria-live="polite"></p>
          </header>
          <section class="mz-radar"><div class="mz-lado-h"><h3>O olho</h3><span>no meio, as quentes; toca num ponto e ele vem pra mesa</span></div>
            <div class="hz-cvwrap"><canvas id="hz-cv" aria-label="Radar: cada ponto é uma empresa; mais perto do centro, mais quente"></canvas><div class="hz-tip" id="hz-tip" hidden></div></div><div class="hz-legend" id="hz-legend"></div></section>
          <section class="mz-mira-s"><div class="mz-lado-h"><h3>Na mira</h3><span id="mz-mira-n"></span></div><ol class="mz-mira" id="mz-mira"></ol></section>
        </div>
      </div>
    </section>`;
  }
  function pinta(){
    if(!C.$('mz')) return;
    const L = mesa(), V = filtra(L), o = V[0];
    olho(L); filtros(L); lado(V);
    H.marca = o ? o.l.id : '';
    const pilha = C.$('mz-pilha'), id = o ? o.l.id : '', nova = id !== M.visto;
    if(!nova && !M.sujo && pilha.firstElementChild) return;
    M.sujo = false; M.visto = id;
    if(nova){ M.mot = false; M.rap = false; }
    if(!o){ pilha.innerHTML = vazio(L); return; }
    pilha.innerHTML = carta(o, V);
    const card = pilha.querySelector('.mz-carta');
    liga(card, o);
    if(nova) chega(card, o);
    if(M.rolar) rolaPraCarta();
  }
  /* depois de mandar, pular ou descartar lá embaixo da carta, a próxima aparece do começo (o nome e o calor) */
  function rolaPraCarta(){
    M.rolar = false;
    const pl = C.$('mz-pilha'); if(!pl) return;
    const r = pl.getBoundingClientRect(), hd = document.querySelector('.hdr'), topo = hd && /fixed|sticky/.test(getComputedStyle(hd).position) ? Math.max(0, hd.getBoundingClientRect().bottom) : 0;
    if(r.top < topo + 8 || r.top > innerHeight * 0.6) window.scrollBy({ top: r.top - topo - 12, behavior: reduz() ? 'auto' : 'smooth' });
  }
  /* o dia em cima: atualiza no lugar (o anel anda e o número pula) */
  function olho(L){
    const p = Z.placar(), r = 2 * Math.PI * 52, k = Math.min(1, p.hoje / Math.max(1, p.meta));
    const v = C.$('mz-anel-v'); if(!v) return;
    v.style.strokeDasharray = r.toFixed(1); v.style.strokeDashoffset = (r * (1 - k)).toFixed(1);
    const an = C.$('mz-anel'); an.classList.toggle('cheio', p.hoje >= p.meta); an.setAttribute('aria-label', `${p.hoje} de ${p.meta} toques hoje`);
    const hj = C.$('mz-hoje'); if(hj.textContent !== String(p.hoje)){ hj.textContent = p.hoje; pula(hj); }
    C.$('mz-meta').textContent = `de ${p.meta} toques`;
    const put = (i, n) => { const e = C.$(i); if(e && e.textContent !== String(n)){ e.textContent = n; pula(e); } };
    put('mz-n-esp', L.filter(o => o.g === 'espera').length); put('mz-n-ouro', L.filter(o => o.ouro).length); put('mz-n-mesa', L.length); put('mz-n-seq', p.streak);
    C.$('mz-n-seq-t').textContent = p.streak === 1 ? 'dia na meta' : 'dias na meta';
    C.$('mz-st').textContent = M.st;
    const g = C.$('mz-garimpa'); g.disabled = M.busy; g.classList.toggle('busy', M.busy); g.querySelector('small').textContent = M.busy ? 'varrendo o mapa…' : 'achar mais com WhatsApp';
    const s = C.$('mz-som'), on = somOn(); s.innerHTML = ico(on ? 'som' : 'mudo'); s.setAttribute('aria-pressed', on ? 'true' : 'false'); s.setAttribute('aria-label', on ? 'Som ligado' : 'Som desligado'); s.title = on ? 'Desligar o som' : 'Ligar o som';
  }
  function pula(el){ if(reduz() || !el) return; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
  function filtros(L){
    const el = C.$('mz-f'); if(!el) return;
    const n = { tudo: L.length, ouro: L.filter(o => o.ouro).length, espera: L.filter(o => o.g === 'espera').length, volta: L.filter(o => o.g === 'volta').length, novo: L.filter(o => o.g === 'novo').length };
    el.innerHTML = FILTROS.map(([k, t]) => `<button type="button" class="hz-chip${k === 'ouro' ? ' mz-chip-ouro' : ''}" data-act="mz-f" data-k="${k}" aria-pressed="${M.f === k}">${t} <b>${n[k]}</b></button>`).join('');
  }
  function lado(V){
    const el = C.$('mz-mira'); if(!el) return;
    const prox = V.slice(1, 9);
    C.$('mz-mira-n').textContent = V.length > 1 ? `os próximos ${prox.length} de ${V.length - 1}` : '';
    el.innerHTML = prox.length ? prox.map(o => `<li><button type="button" class="mz-mira-i${o.ouro ? ' ouro' : ''}" data-act="mz-traz" data-id="${esc(o.l.id)}"><span class="hz-sc ${Z.tempOf(o.h)}">${o.h}</span><span class="nm"><b>${esc(Z.shortName(o.l.nome))}</b><small>${esc(ROT[o.g])} · ${esc(Z.nichoOf(o.l).n)}</small></span>${o.ouro ? '<i class="mz-o">ouro</i>' : ''}</button></li>`).join('')
      : `<li class="mz-mira-v">${V.length ? 'Essa é a última da mesa.' : 'Mesa vazia.'} Garimpa mais.</li>`;
  }
  function vazio(L){
    const p = Z.placar(), filtrado = M.f !== 'tudo' && L.length;
    return `<div class="mz-vazio"><span class="mz-vazio-eye">${Z.EYE}</span>
      <h2>${filtrado ? 'Nada nesse filtro.' : p.hoje >= p.meta ? 'Mesa limpa e meta batida.' : 'Mesa limpa.'}</h2>
      <p>${filtrado ? `Tem ${L.length} na mesa em outros filtros.` : 'Ninguém esperando, nenhum retorno vencido e nenhum novo com telefone. O Hórus acha mais pra você.'}</p>
      <div class="hz-row-acts">${filtrado ? '<button type="button" class="hz-btn pri" data-act="mz-f" data-k="tudo">Ver a mesa toda</button>' : `<button type="button" class="hz-btn pri" data-act="mz-garimpa">${ico('lupa')} Garimpar no mapa</button><button type="button" class="hz-btn" data-act="hz-ir-caca">Colar uma lista</button>`}</div></div>`;
  }

  /* ---------- a carta ---------- */
  function msgDe(l){ return Z.nextMsg(l) || { k: Z.defaultMsg(l), n: Z.TN[Z.defaultMsg(l)] || 'Mensagem' }; }
  function txtDe(l){ return M.txt[l.id] != null ? M.txt[l.id] : Z.compose(l, msgDe(l).k); }
  function faixa(o){
    const l = o.l, m = msgDe(l), t = Z.today();
    if(o.g === 'espera'){
      const por = Z.pediuLink(l) ? 'pediu orçamento' : Z.escolheuMural(l) ? 'te escolheu no Mural' : (HF() && HF().esperando && HF().esperando(l)) ? 'chegou sozinho' : l.st === 'link' ? 'proposta na mesa' : l.st === 'interesse' ? 'interessado' : 'respondeu';
      return `${por}${l.prox && l.prox < t ? ` · retorno venceu ${Z.ddmm(l.prox)}` : ''}`;
    }
    if(o.g === 'volta') return `${l.prox < t ? `venceu ${Z.ddmm(l.prox)}` : 'hoje'} · ${m.n}`;
    return Z.isFresh(l) ? 'caça nova · nunca chamou' : 'nunca chamou';
  }
  function carta(o, V){
    const l = o.l, h = o.h, tp = Z.tempOf(h), m = msgDe(l), tx = txtDe(l), ss = selos(l), conf = Z.conferido(l), n = Z.nichoOf(l);
    const resposta = o.g === 'espera' || Z.responded(l), fx = faixa(o);
    /* os porquês, sem repetir o que a faixa de cima já diz (nem o telefone, que os selos mostram) */
    const por = Z.reasons(l).filter(r => !fx.includes(r) && !/^(só fixo|sem telefone)$/.test(r));
    const tras = V.slice(1, 3).map((x, i) => `<div class="mz-tras t${i + 1}" aria-hidden="true"></div>`).join('');
    return `${tras}<article class="mz-carta t-${tp}${o.ouro ? ' ouro' : ''}" data-id="${esc(l.id)}" aria-label="${esc(Z.shortName(l.nome))}: calor ${h}${o.ouro ? ', ouro' : ''}">
      <div class="mz-faixa g-${o.g}"><b>${esc(ROT[o.g])}</b><span>${esc(fx)}</span>${M.novas.has(l.id) ? '<i class="mz-nova">achada agora</i>' : ''}</div>
      <div class="mz-cab">
        <div class="mz-calor" title="Calor ${h} de 100"><b class="num" data-n="${h}">${h}</b><span><em>${esc(Z.TEMP[tp])}</em><i style="--h:${h}%"></i></span></div>
        ${o.ouro ? '<span class="mz-ouro" title="Ouro: celular, quente e com prova de que existe">Ouro</span>' : ''}
      </div>
      <h2 class="mz-nome">${esc(Z.shortName(l.nome))}</h2>
      <p class="mz-onde">${esc([n.n, l.bairro, l.cidade && l.cidade !== Z.cfg().cidade ? l.cidade : ''].filter(Boolean).join(' · '))}</p>
      <ul class="mz-selos" aria-label="Provas de que a empresa existe">${ss.map((s, i) => `<li class="${s.on ? 'on' : 'off'} s-${s.k}" style="--i:${i}">${s.href ? `<a href="${esc(s.href)}" target="_blank" rel="noopener" title="${esc(s.d)}">` : `<span title="${esc(s.d || '')}">`}${ico(s.on ? 'check' : s.ic)}<span>${esc(s.t)}</span>${s.href ? '</a>' : '</span>'}</li>`).join('')}
        <li class="mz-conf${conf ? ' on' : ''}" style="--i:${ss.length}"><button type="button" data-act="mz-conf" data-id="${esc(l.id)}" aria-pressed="${conf}">${ico(conf ? 'check' : 'eye')}<span>${conf ? 'conferido' : 'conferi, existe'}</span></button></li></ul>
      ${por.length ? `<p class="mz-por">${por.map(r => `<span>${esc(r)}</span>`).join('')}</p>` : ''}
      <div class="mz-msg">
        <div class="mz-msg-h"><span class="mz-msg-k">${esc(M.txt[l.id] != null && M.ia !== l.id ? (H.ia[l.id] ? 'Escrita pela IA' : 'Mensagem tua') : m.n)}</span>
          ${T() && T().escreve ? `<button type="button" class="mz-mini" data-act="mz-ia" data-id="${esc(l.id)}"${M.ia ? ' disabled' : ''}>${ico('magia')} ${M.ia === l.id ? 'Escrevendo…' : 'Escrever com IA'}</button>` : ''}
          ${M.alt[l.id] ? `<button type="button" class="mz-mini" data-act="mz-alt" data-id="${esc(l.id)}">Outra versão</button>` : ''}
          ${resposta && LP() ? `<button type="button" class="mz-mini" data-act="mz-rap" aria-expanded="${M.rap}">Respostas prontas</button>` : ''}
          ${M.txt[l.id] != null ? `<button type="button" class="mz-mini" data-act="mz-volta" data-id="${esc(l.id)}">Voltar pra da vez</button>` : ''}</div>
        ${M.rap && LP() ? `<div class="mz-rap" role="group" aria-label="Respostas prontas">${LP().rapidaNomes.map((r, i) => `<button type="button" class="hz-chip" data-act="mz-rap-i" data-id="${esc(l.id)}" data-i="${i}">${esc(r)}</button>`).join('')}</div>` : ''}
        <label class="sr-only" for="mz-txt">Mensagem que vai no WhatsApp</label>
        <textarea class="mz-balao" id="mz-txt" rows="5" maxlength="2000">${esc(tx)}</textarea>
      </div>
      ${M.mot ? `<div class="mz-mot" role="group" aria-label="Descartar por quê?"><b>Descartar por quê?</b><div>${(LP() ? LP().MOTIVOS : []).map((x, i) => `<button type="button" class="hz-desc-m" data-act="mz-mot" data-i="${i}">${esc(x[0])}</button>`).join('')}</div><button type="button" class="hz-btn ghost" data-act="mz-mot-x">Voltar</button></div>`
      : `<div class="mz-acts">
        <a class="mz-wa" id="mz-wa" href="${esc(Z.waUrl(l, tx))}" target="_blank" rel="noopener" data-act="mz-env" data-id="${esc(l.id)}">${ico('wa')}<span><b>Mandar no WhatsApp</b><small>${l.wa ? esc(Z.fmtTel(l.wa)) : 'pelo fixo ' + esc(Z.fmtTel(l.fixo))}</small></span><kbd>Enter</kbd></a>
        <div class="mz-acts2">
          ${l.wa ? '' : `<button type="button" class="hz-btn" data-act="mz-ligou" data-id="${esc(l.id)}">Liguei</button>`}
          <button type="button" class="hz-btn" data-act="mz-pula">${ico('desce')} Pular</button>
          <button type="button" class="hz-btn" data-act="mz-desc">${ico('x')} Descartar</button>
          <button type="button" class="hz-btn ghost" data-act="mz-ficha" data-id="${esc(l.id)}">Ficha</button>
        </div>
        <p class="mz-dica">${matchMedia('(pointer: coarse)').matches ? 'Arrasta a carta: pra direita manda, pra esquerda descarta.' : 'Arrasta a carta (→ manda, ← descarta) ou usa Enter, ← e P.'}</p>
      </div>`}
      <b class="mz-lado-r" aria-hidden="true">WhatsApp</b><b class="mz-lado-l" aria-hidden="true">Descartar</b>
    </article>`;
  }
  /* o que a carta faz sozinha: o balão manda o texto pro link, e o arrastar */
  function liga(card, o){
    const t = card.querySelector('#mz-txt'), a = card.querySelector('#mz-wa');
    if(t){ const cresce = () => { t.style.height = 'auto'; t.style.height = Math.min(320, t.scrollHeight + 2) + 'px'; }; cresce();
      t.addEventListener('input', () => { M.txt[o.l.id] = t.value; if(a) a.href = Z.waUrl(o.l, t.value); cresce(); const k = card.querySelector('.mz-msg-k'); if(k && !H.ia[o.l.id]) k.textContent = 'Mensagem tua'; }); }
    arrasta(card, o);
  }
  function arrasta(card, o){
    let x0 = null, y0 = 0, dx = 0, ok = false, pid = null, lado = '';
    card.addEventListener('pointerdown', e => {
      if(e.pointerType === 'mouse' && e.button !== 0) return;
      if(e.target.closest('textarea, input, select, a, button, label')) return;
      x0 = e.clientX; y0 = e.clientY; dx = 0; ok = false; pid = e.pointerId; lado = '';
    });
    card.addEventListener('pointermove', e => {
      if(x0 == null || e.pointerId !== pid) return;
      dx = e.clientX - x0; const dy = e.clientY - y0;
      if(!ok){
        if(Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx)){ x0 = null; return; }
        if(Math.abs(dx) < 10) return;
        ok = true; try{ card.setPointerCapture(pid); }catch(er){} card.classList.add('drag');
      }
      card.style.transform = `translateX(${dx}px) rotate(${(dx / 24).toFixed(2)}deg)`;
      card.style.setProperty('--p', Math.min(1, Math.abs(dx) / LIM).toFixed(2));
      const k = dx > LIM ? 'r' : dx < -LIM ? 'l' : '';
      card.dataset.lado = dx > 20 ? 'r' : dx < -20 ? 'l' : '';
      if(k && k !== lado){ vibra(10); som('tic'); }
      lado = k;
    });
    const solta = () => {
      if(x0 == null) return; const d = dx, foi = ok; x0 = null; ok = false; card.classList.remove('drag');
      if(!foi) return;
      if(d > LIM){ const a = card.querySelector('#mz-wa'); if(a){ a.click(); return; } }
      else if(d < -LIM){ descartaGesto(o.l.id); return; }
      card.dataset.lado = ''; card.style.transform = ''; card.style.removeProperty('--p');
    };
    card.addEventListener('pointerup', solta);
    card.addEventListener('pointercancel', () => { x0 = null; ok = false; card.classList.remove('drag'); card.dataset.lado = ''; card.style.transform = ''; });
  }

  /* ---------- animações ---------- */
  function chega(card, o){
    if(!card) return;
    if(reduz()){ if(o.ouro) som('ouro'); return; }
    card.classList.add('chega');
    const n = card.querySelector('.mz-calor b');
    if(n){ const alvo = o.h, t0 = performance.now(), D = 620; n.textContent = '0'; const f = now => { const k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3); n.textContent = Math.round(alvo * e); if(k < 1 && n.isConnected) requestAnimationFrame(f); }; requestAnimationFrame(f); }
    setTimeout(() => som(o.ouro ? 'ouro' : 'carta'), o.ouro ? 560 : 60);
    if(o.ouro) setTimeout(() => vibra([12, 40, 12]), 560);
  }
  /* a carta que sai voa por cima de tudo (a de baixo já tá na mesa) */
  function voa(card, dir, txt){
    if(!card || reduz()) return;
    const pai = card.offsetParent; if(!pai) return;
    const r = pai.getBoundingClientRect(), cl = card.cloneNode(true);
    cl.removeAttribute('id'); cl.querySelectorAll('[id]').forEach(x => x.removeAttribute('id'));
    cl.classList.remove('chega', 'drag'); cl.classList.add('mz-voa');
    cl.style.cssText = `position:fixed;left:${r.left + card.offsetLeft}px;top:${r.top + card.offsetTop}px;width:${card.offsetWidth}px;height:${card.offsetHeight}px;margin:0;z-index:70;pointer-events:none;transform:${card.style.transform || 'none'}`;
    cl.insertAdjacentHTML('beforeend', `<b class="mz-carimbo c-${dir}">${esc(txt)}</b>`);
    document.body.appendChild(cl);
    requestAnimationFrame(() => requestAnimationFrame(() => cl.classList.add('vai-' + dir)));
    setTimeout(() => cl.remove(), 700);
  }
  function confete(){
    if(reduz()) return;
    const cv = document.createElement('canvas'); cv.className = 'mz-confete'; cv.setAttribute('aria-hidden', 'true'); document.body.appendChild(cv);
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = innerWidth, Hh = innerHeight; cv.width = W * dpr; cv.height = Hh * dpr;
    const x = cv.getContext('2d'); x.scale(dpr, dpr);
    const COR = ['#F2B526', '#FF4FA3', '#5AA9FF', '#FFFFFF', '#FF7A3D', '#B98CFF'];
    const ps = Array.from({ length: 150 }, (_, i) => ({ x: W / 2 + (Math.random() - 0.5) * 120, y: Hh * 0.3, vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 15 - 4, r: Math.random() * 7 + 4, c: COR[i % COR.length], a: Math.random() * 6, va: (Math.random() - 0.5) * 0.4 }));
    const t0 = performance.now();
    const f = now => { const k = (now - t0) / 1800; x.clearRect(0, 0, W, Hh);
      ps.forEach(p => { p.vy += 0.42; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va; x.save(); x.globalAlpha = Math.max(0, 1 - k * k); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c; x.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); x.restore(); });
      if(k < 1) requestAnimationFrame(f); else cv.remove(); };
    requestAnimationFrame(f);
  }
  const cartaAgora = () => document.querySelector('#mz-pilha .mz-carta');

  /* ---------- o que a pessoa faz ---------- */
  function envia(id, como){
    const l = H.by[id]; if(!l || M.feitos.has(id)) return;
    const p0 = Z.placar();
    voa(cartaAgora(), 'dir', como === 'Ligação' ? 'Ligou' : 'Enviado');
    M.feitos.add(id); M.topo = ''; M.rolar = true; delete M.txt[id]; delete M.alt[id];
    som('zap'); vibra(18);
    C.acts[como === 'Ligação' ? 'hz-call' : 'hz-fire']({ dataset: { id }, id: '' });
    pinta();
    if(p0.hoje < p0.meta && p0.hoje + 1 >= p0.meta) setTimeout(() => { confete(); som('meta'); vibra([30, 60, 30, 60, 60]); C.toast(`Meta do dia batida: ${p0.meta} toques. Bora que tem mais ouro na mesa.`, 4200); }, 380);
  }
  function pular(){
    const o = filtra(mesa())[0]; if(!o) return;
    voa(cartaAgora(), 'baixo', 'Depois');
    M.pul = M.pul.filter(x => x !== o.l.id).concat(o.l.id); M.topo = ''; M.rolar = true; som('pula'); pinta();
  }
  function descartaGesto(id){
    const l = H.by[id]; if(!l || !LP()) return;
    voa(cartaAgora(), 'esq', 'Descartado'); som('joga'); vibra(14);
    M.topo = ''; M.rolar = true; LP().descarta([id], 'perdido', 'Não é o perfil', true);
  }
  async function confere(id){
    const l = H.by[id]; if(!l) return;
    if(Z.conferido(l)){ C.toast('Já tá conferida.'); return; }
    const h0 = Z.heat(l), era = ouro(l, h0);
    Z.logH(l, 'ok', 'Conferido: a empresa existe');
    M.sujo = true; pinta();
    const h1 = Z.heat(l);
    if(!era && ouro(l, h1)){ som('ouro'); vibra([12, 40, 12]); C.toast(`${Z.shortName(l.nome)} virou ouro.`); const c = cartaAgora(); if(c && !reduz()){ c.classList.add('vira-ouro'); } }
    else som('tic');
    await Z.save(l, ['hist']);
  }
  async function garimpa(){
    if(M.busy) return;
    const c = Z.cfg(), onde = Z.lugarTxt(c.praca.cidade, c.praca.uf) || c.cidade;
    if(!C.DEMO && !(T() && T().garimpa)){ C.acts['hz-ir-caca'](); return; }
    M.busy = true; H.varre = true; M.st = `O olho tá varrendo ${onde}…`; olho(mesa());
    const antes = new Set(H.leads.map(l => l.id));
    try{
      const r = C.DEMO ? await garimpoDemo() : await T().garimpa();
      await Z.load();
      const novas = H.leads.filter(l => !antes.has(l.id));
      novas.forEach(l => M.novas.add(l.id));
      if(!novas.length) M.st = r.lidas ? `Varri ${onde}: tudo que tem telefone já tá no teu radar. Tenta outro nicho ou bairro na Caça.` : `O mapa não tem empresas com telefone nos teus nichos em ${onde}. Cola uma lista do Google Maps na Caça.`;
      else {
        const it = novas.map(l => ({ l, h: Z.heat(l) })), ours = it.filter(x => ouro(x.l, x.h)).length;
        it.sort((a, b) => (ouro(b.l, b.h) ? 1 : 0) - (ouro(a.l, a.h) ? 1 : 0) || (b.l.wa ? 1 : 0) - (a.l.wa ? 1 : 0) || b.h - a.h);
        M.topo = it[0].l.id; M.f = 'tudo';
        M.st = `Achei ${novas.length} ${novas.length === 1 ? 'empresa nova' : 'empresas novas'} com telefone em ${onde}${ours ? ` · ${ours} ${ours === 1 ? 'é ouro' : 'são ouro'}` : ''}.`;
        som('achou'); vibra([10, 30, 10]);
      }
    }catch(e){
      M.st = e && e.code === 'praca' ? 'Escolhe a cidade da caça primeiro (na gaveta Caçar empresas).' : e && e.code === 'nicho' ? 'Teus nichos não têm filtro no mapa. Ajusta em Ajustar ou usa "Montar com IA".' : e && e.code === 'cidade' ? `Não achei ${onde} no mapa. Confere a cidade da caça.` : e && e.code === 'ocupado' ? 'O mapa tá ocupado agora. Tenta de novo em um minuto.' : (e && e.name === 'AbortError') ? 'O mapa demorou demais. Tenta de novo, ou caça um bairro só na gaveta Caçar.' : 'Não deu pra falar com o mapa agora. Confere a internet e tenta de novo.';
    }finally{ M.busy = false; H.varre = false; Z.paint(); }
  }
  /* no modo demonstração (sem rede), o garimpo acha empresas de exemplo */
  async function garimpoDemo(){
    await new Promise(r => setTimeout(r, 900));
    const c = Z.cfg(), pr = c.praca, k = Date.now().toString().slice(-5), ns = c.nichos.map(n => n.k);
    const X = [['Açaí da Esquina', 'comida', 'Centro', 'acaidaesquina.exemplo', 'Rua Pará, 210'], ['Barbearia Corte Seco', 'beleza', 'Vila Nova', '', 'Rua Goiás, 88'], ['Doce Lar Confeitaria', 'cafe', 'Higienópolis', 'docelar.exemplo', ''], ['Pilates Leve', 'academia', 'Gleba Palhano', 'pilatesleve.exemplo', 'Av. Madre Leônia, 1500'], ['Lava Rápido Brilho', 'auto', 'Cilo', '', ''], ['Clínica Sorriso Norte', 'saude', 'Zona Norte', 'sorrisonorte.exemplo', 'Rua Ceará, 40']];
    const rows = X.map((x, i) => ({ nome: x[0] + ' (exemplo)', nicho: ns.includes(x[1]) ? x[1] : (ns[0] || ''), bairro: x[2], insta: x[3], end: x[4], ph: { wa: i === 4 ? '' : '4390009' + k.slice(-3) + i, fixo: i === 4 ? '4333' + k.slice(-3) + '00' + i : '', fmt: '' }, cidade: pr.cidade, uf: pr.uf, sinais: i % 2 ? ['sem_site'] : ['sem_site', 'nova'], fonte: 'mapa', cat: 'garimpo' }));
    await Z.addRows(rows, 'caca');
    return { lidas: rows.length, novas: rows.length };
  }
  async function escreveIA(id){
    const l = H.by[id]; if(!l || !T() || !T().escreve || M.ia) return;
    M.ia = id; M.sujo = true; pinta();
    try{ const r = await T().escreve(l, msgDe(l).k); if(r && r.mensagem){ M.txt[id] = r.mensagem; M.alt[id] = r.alternativa || ''; H.ia[id] = true; som('carta'); } }
    catch(e){ C.toast(T().iaErro ? T().iaErro(e) : C.errMsg(e, 'A IA não conseguiu agora.')); }
    finally{ M.ia = ''; M.sujo = true; pinta(); }
  }
  /* tocou no olho ou na lista: a empresa vem pra mesa (se estiver nela) */
  function traz(id){
    const l = H.by[id]; if(!l || !grupoDe(l) || M.feitos.has(id)) return false;
    M.topo = id; M.pul = M.pul.filter(x => x !== id); M.rolar = true;
    if(M.f !== 'tudo' && !filtra(mesa()).some(o => o.l.id === id)) M.f = 'tudo';
    pinta();
    return true;
  }

  Object.assign(C.acts, {
    'mz-env': el => envia(el.dataset.id, 'WhatsApp'),
    'mz-ligou': el => envia(el.dataset.id, 'Ligação'),
    'mz-pula': () => pular(),
    'mz-desc': () => { M.mot = true; M.sujo = true; pinta(); const b = document.querySelector('.mz-mot .hz-desc-m'); if(b) b.focus(); },
    'mz-mot-x': () => { M.mot = false; M.sujo = true; pinta(); },
    'mz-mot': el => { const o = filtra(mesa())[0], x = LP() && LP().MOTIVOS[+el.dataset.i]; if(!o || !x) return; voa(cartaAgora(), 'esq', 'Descartado'); som('joga'); M.mot = false; M.topo = ''; M.rolar = true; LP().descarta([o.l.id], x[1], x[2]); },
    'mz-ficha': el => Z.leadSheet(el.dataset.id),
    'mz-conf': el => confere(el.dataset.id),
    'mz-f': el => { M.f = el.dataset.k; M.topo = ''; som('tic'); pinta(); },
    'mz-traz': el => traz(el.dataset.id),
    'mz-ia': el => escreveIA(el.dataset.id),
    'mz-alt': el => { const id = el.dataset.id, a = M.alt[id]; if(!a) return; M.alt[id] = txtDe(H.by[id]); M.txt[id] = a; M.sujo = true; pinta(); },
    'mz-volta': el => { delete M.txt[el.dataset.id]; delete M.alt[el.dataset.id]; delete H.ia[el.dataset.id]; M.sujo = true; pinta(); },
    'mz-rap': () => { M.rap = !M.rap; M.sujo = true; pinta(); },
    'mz-rap-i': el => { const l = H.by[el.dataset.id]; if(!l || !LP()) return; M.txt[l.id] = LP().rapida(l, +el.dataset.i); M.rap = false; M.sujo = true; pinta(); const t = C.$('mz-txt'); if(t) t.focus(); },
    'mz-garimpa': () => garimpa(),
    'mz-som': () => { const on = !somOn(); try{ localStorage.setItem(SOM_K, on ? '1' : '0'); }catch(e){} if(on) som('carta'); olho(mesa()); },
    /* o "Tocar a fila" da v4.22 virou a Mesa */
    'hz-corrida': () => { const c = C.$('mz-pilha'); if(c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
  /* teclado: Enter ou → manda, ← descarta, P pula, F abre a ficha (fora dos campos, das abas e das folhas) */
  document.addEventListener('keydown', e => {
    if(!C.$('mz') || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    const t = e.target;
    if(t && t.closest && (t.closest('input, textarea, select, [contenteditable="true"], [role="tablist"], dialog, details > summary, .hz-sec') || (t.tagName === 'BUTTON' && e.key === 'Enter') || (t.tagName === 'A' && e.key === 'Enter'))) return;
    const sh = document.getElementById('sheet'); if(sh && !sh.hidden) return;
    if(document.getElementById('hz-sprint')) return;
    const o = filtra(mesa())[0]; if(!o) return;
    if(M.mot){ if(e.key === 'Escape'){ e.preventDefault(); C.acts['mz-mot-x'](); } return; }
    if(e.key === 'Enter' || e.key === 'ArrowRight'){ const a = C.$('mz-wa'); if(a){ e.preventDefault(); a.click(); } }
    else if(e.key === 'ArrowLeft'){ e.preventDefault(); C.acts['mz-desc'](); }
    else if(e.key === 'p' || e.key === 'P'){ e.preventDefault(); pular(); }
    else if(e.key === 'f' || e.key === 'F'){ e.preventDefault(); Z.leadSheet(o.l.id); }
  });

  C.horusMesa = { html, pinta, traz, mesa: () => mesa(), ouro: l => ouro(l, Z.heat(l)), selos, provas };
})();
