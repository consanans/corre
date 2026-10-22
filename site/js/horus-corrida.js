/* CORRE · HÓRUS: TOCAR A FILA (v4.22)
   O Thales: o Hórus "é a ferramenta que eu quero ficar parado olhando e mexendo durante o dia". A fila de disparo virou
   um modo de um cliente por vez, na tela inteira: quem é, por que agora, a mensagem da vez (dá pra mexer) e quatro
   saídas grandes: Enviar no WhatsApp (abre com o texto pronto, conta o toque e já passa pro próximo), Liguei (sem
   celular), Pular e Descartar (o motivo ali mesmo, num toque). Em cima, quantos faltam e o placar do dia andando.
   No teclado: Enter envia, → pula, D descarta, Esc sai. No fim, o resumo da rodada. Nada novo no banco: usa o mesmo
   toque, a mesma cadência e o mesmo descarte de sempre. */
(function(){
  'use strict';
  const C = window.Corre, { esc, ico } = C;
  if(!C.horus || !C.horus._) return;
  const Z = C.horus._, H = Z.H;
  const K = { on: false, lista: [], i: 0, env: 0, pul: 0, desc: 0, motivos: false };
  const MOT = [['Não é o perfil', 'perdido', 'Não é o perfil'], ['Sem interesse', 'perdido', 'Sem interesse'], ['Já tem quem faz', 'perdido', 'Já tem quem faz'], ['Número não existe', 'nao_encontrado', ''], ['Fechou as portas', 'nao_encontrado', 'Fechou as portas']];

  function abre(){
    /* v4.23: quem tem WhatsApp primeiro (a ordem de dentro de cada grupo fica) */
    const f = Z.fila(), ls = f.due.concat(f.novos).sort((a, b) => (b.l.wa ? 1 : 0) - (a.l.wa ? 1 : 0)).map(o => o.l.id);
    if(!ls.length){ C.toast('Fila vazia: nada vencido e nenhum novo com telefone.'); return; }
    Object.assign(K, { on: true, lista: ls, i: 0, env: 0, pul: 0, desc: 0, motivos: false });
    let el = document.getElementById('hz-corrida');
    if(!el){ el = document.createElement('div'); el.id = 'hz-corrida'; el.className = 'hz-corrida'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Tocar a fila'); document.body.appendChild(el); }
    el.hidden = false; document.body.classList.add('locked');
    pinta();
  }
  function fecha(){
    K.on = false; const el = document.getElementById('hz-corrida'); if(el){ el.hidden = true; el.innerHTML = ''; }
    const sh = document.getElementById('sheet'); if(!sh || sh.hidden) document.body.classList.remove('locked');
    Z.paint();
  }
  const atual = () => { while(K.i < K.lista.length){ const l = H.by[K.lista[K.i]]; if(l && !Z.DONE.includes(l.st)) return l; K.i++; } return null; };
  function proximo(){ K.i++; K.motivos = false; pinta(); }
  function pinta(){
    const el = document.getElementById('hz-corrida'); if(!el || !K.on) return;
    const p = Z.placar(), l = atual(), tot = K.lista.length, pct = Math.min(100, Math.round(p.hoje / Math.max(1, p.meta) * 100));
    const topo = `<header class="hzc-top"><button type="button" class="hzc-sai" data-act="hzc-sai">${ico('x')}<span>Sair</span></button>
      <div class="hzc-prog"><b>${Math.min(K.i + (l ? 1 : 0), tot)} de ${tot}</b><span>toques hoje ${p.hoje}/${p.meta}</span><i><b style="width:${pct}%"></b></i></div></header>`;
    if(!l){
      el.innerHTML = topo + `<div class="hzc-fim"><p class="hzc-k">Rodada feita</p><h2>Fila zerada.</h2>
        <ul><li><b class="num">${K.env}</b> mensagens</li><li><b class="num">${K.pul}</b> puladas</li><li><b class="num">${K.desc}</b> descartadas</li></ul>
        <p>${p.hoje >= p.meta ? 'Meta do dia batida. ' : `Faltam ${p.meta - p.hoje} toques pra meta. `}Quem responder, marca na ficha e o Hórus muda a mensagem da vez.</p>
        <button type="button" class="hz-btn pri" data-act="hzc-sai">Voltar pro radar</button></div>`;
      return;
    }
    const m = Z.nextMsg(l) || { k: 'abordagem', n: 'Mensagem' }, txt = Z.compose(l, m.k), n = Z.nichoOf(l), h = Z.heat(l);
    el.innerHTML = topo + `<article class="hzc-card" aria-live="polite">
      <div class="hzc-id"><span class="hz-sc ${h ? Z.tempOf(h) : 'off'}">${h || '·'}</span><div><h2>${esc(Z.shortName(l.nome))}</h2><p>${esc([n.n, l.bairro, l.cidade].filter(Boolean).join(' · '))}</p></div></div>
      <p class="hzc-why"><span class="hz-step">${esc(m.n)}</span>${Z.reasons(l).map(r => `<span>${esc(r)}</span>`).join('')}</p>
      <label class="sr-only" for="hzc-txt">Mensagem</label><textarea class="inp hzc-txt" id="hzc-txt" rows="6">${esc(txt)}</textarea>
      ${K.motivos ? `<div class="hzc-mot"><b>Descartar por quê?</b>${MOT.map((x, i) => `<button type="button" class="hz-desc-m" data-act="hzc-mot" data-i="${i}">${esc(x[0])}</button>`).join('')}<button type="button" class="hz-btn ghost" data-act="hzc-mot-x">Voltar</button></div>`
      : `<div class="hzc-acts">
        <a class="hz-btn pri hzc-env" id="hzc-env" href="${esc(Z.waUrl(l, txt))}" target="_blank" rel="noopener" data-act="hzc-env">${ico('wa')} Enviar no WhatsApp <kbd>Enter</kbd></a>
        ${l.wa ? '' : `<button type="button" class="hz-btn" data-act="hzc-ligou">Liguei${l.fixo ? ' · ' + esc(Z.fmtTel(l.fixo)) : ''}</button>`}
        <button type="button" class="hz-btn" data-act="hzc-pula">Pular <kbd>→</kbd></button>
        <button type="button" class="hz-btn" data-act="hzc-desc">${ico('x')} Descartar <kbd>D</kbd></button>
        <button type="button" class="hz-btn ghost" data-act="hzc-ficha">Abrir a ficha</button></div>`}
    </article>`;
    const t = document.getElementById('hzc-txt'), a = document.getElementById('hzc-env');
    if(t && a) t.addEventListener('input', () => { a.href = Z.waUrl(l, t.value); });
    const f = el.querySelector('.hzc-env, .hz-desc-m'); if(f && !(document.activeElement && document.activeElement.id === 'hzc-txt')) setTimeout(() => { try{ f.focus({ preventScroll: true }); }catch(e){} }, 30);
  }
  Object.assign(C.acts, {
    'hz-corrida': () => abre(),
    'hzc-sai': () => fecha(),
    /* o link abre o WhatsApp (o navegador faz); aqui conta o toque e passa */
    'hzc-env': () => { const l = atual(); if(!l) return; C.acts['hz-fire']({ dataset: { id: l.id }, id: '' }); K.env++; setTimeout(proximo, 350); },
    'hzc-ligou': () => { const l = atual(); if(!l) return; C.acts['hz-call']({ dataset: { id: l.id } }); K.env++; setTimeout(proximo, 200); },
    'hzc-pula': () => { const l = atual(); if(l) H.skip[l.id] = true; K.pul++; proximo(); },
    'hzc-desc': () => { K.motivos = true; pinta(); },
    'hzc-mot-x': () => { K.motivos = false; pinta(); },
    'hzc-mot': el => { const l = atual(), x = MOT[+el.dataset.i]; if(!l || !x || !C.horusLimpa) return; C.horusLimpa.descarta([l.id], x[1], x[2]); K.desc++; proximo(); },
    'hzc-ficha': () => { const l = atual(); if(!l) return; fecha(); Z.leadSheet(l.id); }
  });
  document.addEventListener('keydown', e => {
    if(!K.on || e.ctrlKey || e.metaKey || e.altKey) return;
    if(document.querySelector('dialog[open]')) return;
    const noTexto = e.target && e.target.id === 'hzc-txt';
    if(e.key === 'Escape'){ e.preventDefault(); if(K.motivos){ K.motivos = false; pinta(); } else fecha(); return; }
    if(noTexto) return;
    if(e.key === 'Enter'){ const a = document.getElementById('hzc-env'); if(a && document.activeElement !== a){ e.preventDefault(); a.click(); } }
    else if(e.key === 'ArrowRight'){ e.preventDefault(); C.acts['hzc-pula'](); }
    else if(e.key === 'd' || e.key === 'D'){ e.preventDefault(); C.acts['hzc-desc'](); }
  });
  addEventListener('hashchange', () => { if(K.on) fecha(); });
  C.horusCorrida = { abre, fecha };
})();
