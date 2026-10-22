/* CORRE · HÓRUS: DESCARTAR, FAXINA E RESPOSTAS PRONTAS (v4.22)
   O Thales: "o horus precisa melhorar muito", "talvez integrar com o whatsapp" (escolheu turbinar o que já tem, sem a
   API da Meta) e "descartar mais facilmente o lead". O radar dele tem 300 empresas e quase nada andando: o que não vai
   virar cliente tem que sair da frente com um toque, e o que sobra tem que ter a mensagem certa na mão.
   - Descartar: o × em cada alvo, na fila e na base, e o botão na ficha. Um toque no motivo e pronto (sem "salvar"); vira
     Perdido com o motivo (entra no relatório do funil) ou Não encontrado (número que não existe). Embaixo, a barra
     "Desfazer" por 8 segundos, que devolve tudo como tava.
   - Selecionar na base: marca vários e descarta de uma vez (ou todos do filtro).
   - Faxina do radar: o Hórus mostra quem tá só ocupando lugar (sem telefone, cadência acabou sem resposta, parado há 60
     dias, telefone repetido) e descarta o grupo inteiro num toque, com o mesmo Desfazer.
   - Respostas prontas: na ficha, as respostas pras conversas de sempre no WhatsApp (o preço, o "vou pensar", "manda a
     proposta", "já tenho quem faz", "agora não", "me chama depois"), com o nome da empresa e o teu link; um toque põe na
     mensagem e o Enviar abre o WhatsApp com ela. Nada novo no banco. */
(function(){
  'use strict';
  const C = window.Corre, { esc, ico } = C;
  if(!C.horus || !C.horus._) return;
  const Z = C.horus._, H = Z.H;
  /* [rótulo, etapa, motivo]: "não existe" é Não encontrado; o resto é Perdido com o motivo (o relatório do funil lê) */
  const MOTIVOS = [['Não é o perfil', 'perdido', 'Não é o perfil'], ['Sem interesse', 'perdido', 'Sem interesse'], ['Já tem quem faz', 'perdido', 'Já tem quem faz'],
    ['Preço', 'perdido', 'Preço'], ['Sumiu', 'perdido', 'Sumiu'], ['Número não existe', 'nao_encontrado', ''], ['Fechou as portas', 'nao_encontrado', 'Fechou as portas']];
  const L = { sel: false, marcados: new Set(), undo: null, undoT: 0 };

  /* ---------- descartar (um ou vários), com o Desfazer ---------- */
  /* v4.24: troca = a carta descartada no gesto da Mesa (vai com "Não é o perfil" e a barra deixa trocar o motivo) */
  async function descarta(ids, st, motivo, troca){
    const ls = ids.map(id => H.by[id]).filter(l => l && !Z.DONE.includes(l.st));
    if(!ls.length) return;
    const antes = ls.map(l => ({ l, st: l.st, prox: l.prox, hist: l.hist }));
    ls.forEach(l => { l.st = st; l.prox = null; Z.logH(l, 'st', `Etapa: ${Z.SN[st]}${motivo ? ' · ' + motivo : ''} · descartado`); });
    Z.paint();
    /* de 10 em 10 (o banco não gosta de 300 de uma vez) */
    let falhou = 0;
    for(let i = 0; i < ls.length; i += 10){
      const r = await Promise.all(ls.slice(i, i + 10).map(l => C.api.upd('corre_leads', { id: l.id }, { st: l.st, prox: null, hist: l.hist }).then(() => true, () => false)));
      falhou += r.filter(x => !x).length;
    }
    if(falhou) C.toast(`${falhou} não ${falhou === 1 ? 'saiu' : 'saíram'} do radar (sem rede?). Tenta de novo.`);
    L.marcados.clear();
    mostraUndo(antes, ls.length === 1 ? `${Z.shortName(ls[0].nome)} descartado` : `${ls.length} descartados`, troca);
    if(C.sinaisAtualiza) C.sinaisAtualiza();
  }
  function mostraUndo(antes, txt, troca){
    let b = document.getElementById('hz-undo');
    if(!b){ b = document.createElement('div'); b.id = 'hz-undo'; b.className = 'hz-undo'; b.setAttribute('role', 'status'); document.body.appendChild(b); }
    L.undo = antes;
    b.innerHTML = `<span>${esc(txt)}</span><button type="button" data-act="hz-desfaz">Desfazer</button>${troca ? `<div class="hz-undo-m" role="group" aria-label="Trocar o motivo">${MOTIVOS.map((m, i) => `<button type="button" class="hz-desc-m" data-act="hz-troca-m" data-i="${i}">${esc(m[0])}</button>`).join('')}</div>` : ''}`;
    b.classList.toggle('troca', !!troca);
    b.hidden = false; b.classList.remove('sai'); void b.offsetWidth; b.classList.add('on');
    clearTimeout(L.undoT); L.undoT = setTimeout(someUndo, troca ? 10000 : 8000);
  }
  /* v4.24: o motivo certo, depois do gesto (a etapa e a linha do tempo acompanham) */
  async function trocaMotivo(i){
    const a = L.undo, m = MOTIVOS[i]; if(!a || !m) return;
    a.forEach(x => { x.l.st = m[1]; const h = (x.l.hist || [])[0]; if(h && h.k === 'st') h.v = `Etapa: ${Z.SN[m[1]]}${m[2] ? ' · ' + m[2] : ''} · descartado`; });
    Z.paint();
    await Promise.all(a.map(x => C.api.upd('corre_leads', { id: x.l.id }, { st: x.l.st, hist: x.l.hist }).catch(() => {})));
    mostraUndo(a, `${a.length === 1 ? Z.shortName(a[0].l.nome) : a.length + ' empresas'}: ${m[0].toLowerCase()}`);
  }
  function someUndo(){ const b = document.getElementById('hz-undo'); if(b){ b.classList.remove('on'); setTimeout(() => { if(!b.classList.contains('on')) b.hidden = true; }, 250); } L.undo = null; }
  async function desfaz(){
    const a = L.undo; if(!a) return; someUndo();
    a.forEach(x => { x.l.st = x.st; x.l.prox = x.prox; x.l.hist = x.hist; });
    Z.paint();
    await Promise.all(a.map(x => C.api.upd('corre_leads', { id: x.l.id }, { st: x.st, prox: x.prox, hist: x.hist }).catch(() => {})));
    C.toast(a.length === 1 ? 'Voltou pro radar.' : `${a.length} voltaram pro radar.`);
  }
  /* a folhinha do motivo: um toque e já foi */
  function motivoSheet(ids, titulo){
    C.sheet(`<div class="form hz-desc"><div class="sheet-head"><h2>${esc(titulo)}</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p class="note">Por quê? Um toque e sai do radar (dá pra desfazer).</p>
      <div class="hz-desc-l">${MOTIVOS.map((m, i) => `<button type="button" class="hz-desc-m" data-act="hz-desc-m" data-i="${i}">${esc(m[0])}</button>`).join('')}</div></div>`, 'hz-desc-folha');
    L.pend = ids;
  }

  /* ---------- a faxina: quem só ocupa lugar ---------- */
  const DIA = 864e5;
  function ultimoToque(l){ const h = (l.hist || []).find(x => x && x.t); return Date.parse((h && h.t) || l.updated_at || l.created_at || 0) || 0; }
  function grupos(){
    const ab = H.leads.filter(l => !Z.DONE.includes(l.st));
    const fone = l => String(l.wa || l.fixo || '').replace(/\D/g, '');
    const vistos = {}, dup = [];
    ab.slice().sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || ''))).forEach(l => { const f = fone(l); if(!f) return; if(vistos[f]) dup.push(l); else vistos[f] = 1; });
    return [
      { k: 'semfone', n: 'Sem telefone nenhum', d: 'Sem WhatsApp nem fixo: não dá pra chamar.', ls: ab.filter(l => !Z.digits(l) && !l.insta && l.st === 'novo'), st: 'nao_encontrado', m: 'Sem telefone' },
      { k: 'cadencia', n: 'Cadência acabou sem resposta', d: 'Levaram os 4 toques e não responderam.', ls: ab.filter(l => l.cad && l.cad.fim && !Z.responded(l) && l.st === 'contato'), st: 'perdido', m: 'Sumiu' },
      { k: 'parado', n: 'Parados há mais de 60 dias', d: 'Ninguém mexeu neles em dois meses.', ls: ab.filter(l => l.st !== 'novo' && Date.now() - ultimoToque(l) > 60 * DIA), st: 'perdido', m: 'Sumiu' },
      { k: 'dup', n: 'Telefone repetido', d: 'Mesma empresa (ou mesmo número) duas vezes: fica a mais antiga.', ls: dup, st: 'perdido', m: 'Repetido' }
    ].filter(g => g.ls.length);
  }
  function paintFaxina(){
    const el = C.$('hz-faxina'); if(!el) return;
    const G = grupos(), tot = new Set(G.flatMap(g => g.ls.map(l => l.id))).size;
    if(!G.length){ el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    el.innerHTML = `<div class="hz-h"><h2>Faxina do radar</h2><span>${tot} ${tot === 1 ? 'empresa só ocupando lugar' : 'empresas só ocupando lugar'}</span></div>
      <p class="hz-help">Radar limpo = alvos melhores. Descartar não apaga: vai pra Perdido (ou Não encontrado) com o motivo, e dá pra desfazer.</p>
      <ul class="hz-fx">${G.map(g => `<li><div><b>${esc(g.n)} <span class="num">${g.ls.length}</span></b><small>${esc(g.d)}</small><small class="hz-fx-ex">${esc(g.ls.slice(0, 3).map(l => Z.shortName(l.nome)).join(', '))}${g.ls.length > 3 ? '…' : ''}</small></div>
        <button type="button" class="hz-btn" data-act="hz-fx" data-k="${g.k}">${ico('trash')} Descartar ${g.ls.length}</button></li>`).join('')}</ul>`;
  }

  /* ---------- respostas prontas pro WhatsApp ---------- */
  const RAPIDAS = [
    ['Preço', 'Entendo, {empresa}. Te mostro o que entra e o que dá retorno, aí você decide com calma se faz sentido. Posso te mandar 2 opções, uma mais enxuta?'],
    ['Vou pensar', 'Claro! Pra te ajudar a pensar: qual é a dúvida maior hoje, o valor ou se vai dar resultado? Me fala que eu te respondo direto.'],
    ['Manda a proposta', 'Fechado! Já te mando. Só pra acertar em cheio: o que mais você quer resolver primeiro aí na {empresa}?'],
    ['Já tenho quem faz', 'Que bom que já tem alguém! Se quiser uma segunda opinião sem compromisso, fico à disposição. Posso te mandar um exemplo do que faço?'],
    ['Agora não', 'Tranquilo! Posso te chamar daqui a uns 30 dias pra ver se o momento mudou?'],
    ['Me chama depois', 'Combinado! Te chamo então. Qual dia e horário fica melhor pra você?'],
    ['Obrigado', 'Valeu demais pela conversa! Qualquer coisa, é só chamar aqui. {eu}']
  ];
  function rapidasHTML(l){
    return `<div class="hz-rap" role="group" aria-label="Respostas prontas"><span class="mono">Respostas prontas</span>${RAPIDAS.map((r, i) => `<button type="button" class="hz-chip light" data-act="hz-rap" data-id="${esc(l.id)}" data-i="${i}">${esc(r[0])}</button>`).join('')}</div>`;
  }
  function rapida(l, i){
    const c = Z.cfg(), r = RAPIDAS[i]; if(!r) return '';
    return r[1].replace(/\{empresa\}/g, Z.shortName(l.nome)).replace(/\{eu\}/g, c.eu || '').replace(/\{link\}/g, c.link || '').trim();
  }

  Object.assign(C.acts, {
    'hz-descarta': el => { const l = H.by[el.dataset.id]; if(l) motivoSheet([l.id], `Descartar ${Z.shortName(l.nome)}`); },
    'hz-desc-m': el => { const m = MOTIVOS[+el.dataset.i], ids = L.pend || []; L.pend = null; C.closeSheet(); if(m && ids.length) descarta(ids, m[1], m[2]); },
    'hz-desfaz': () => desfaz(),
    'hz-troca-m': el => trocaMotivo(+el.dataset.i),
    'hz-fx': async el => {
      const g = grupos().find(x => x.k === el.dataset.k); if(!g) return;
      if(!(await C.confirma({ ico: 'trash', titulo: `Descartar ${g.ls.length}?`, texto: `${esc(g.n)}. Vão pra ${esc(Z.SN[g.st])} com o motivo "${esc(g.m)}". Dá pra desfazer logo em seguida.`, sim: 'Descartar', nao: 'Deixa' }))) return;
      descarta(g.ls.map(l => l.id), g.st, g.m);
    },
    'hz-sel': () => { L.sel = !L.sel; L.marcados.clear(); Z.paint(); },
    'hz-sel-l': el => { const id = el.dataset.id; if(el.checked) L.marcados.add(id); else L.marcados.delete(id); barraSel(); },
    'hz-sel-todos': () => { document.querySelectorAll('.hz-base [data-chg="hz-sel-l"]').forEach(i => { i.checked = true; L.marcados.add(i.dataset.id); }); barraSel(); },
    'hz-sel-desc': () => { if(L.marcados.size) motivoSheet([...L.marcados], `Descartar ${L.marcados.size}`); },
    'hz-rap': el => {
      const l = H.by[el.dataset.id], t = C.$('hl-txt'); if(!l || !t) return;
      t.value = rapida(l, +el.dataset.i); t.dispatchEvent(new Event('input')); t.focus();
      const tpl = C.$('hl-tpl'); if(tpl) tpl.blur();
    }
  });
  function barraSel(){
    const b = C.$('hz-selbar'); if(!b) return;
    const n = L.marcados.size;
    b.querySelector('b').textContent = n ? `${n} ${n === 1 ? 'marcada' : 'marcadas'}` : 'Marca as empresas';
    b.querySelector('[data-act="hz-sel-desc"]').disabled = !n;
  }
  /* o que o horus.js chama pra desenhar */
  C.horusLimpa = {
    paint: paintFaxina,
    x: id => `<button type="button" class="hz-x" data-act="hz-descarta" data-id="${esc(id)}" aria-label="Descartar" title="Descartar">${ico('x')}</button>`,
    sel: () => L.sel,
    marcado: id => L.marcados.has(id),
    selBar: () => L.sel ? `<div class="hz-selbar" id="hz-selbar"><b>${L.marcados.size ? `${L.marcados.size} marcadas` : 'Marca as empresas'}</b><button type="button" class="hz-btn ghost" data-act="hz-sel-todos">Marcar todas da lista</button><button type="button" class="hz-btn pri" data-act="hz-sel-desc"${L.marcados.size ? '' : ' disabled'}>${ico('trash')} Descartar</button><button type="button" class="hz-btn ghost" data-act="hz-sel">Cancelar</button></div>` : '',
    rapidas: rapidasHTML,
    /* v4.24: a Mesa usa as respostas prontas e os motivos */
    rapidaNomes: RAPIDAS.map(r => r[0]), rapida, MOTIVOS,
    descarta, grupos
  };
})();
