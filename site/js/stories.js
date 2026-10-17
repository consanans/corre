/* CORRE · STORIES (24 h) E DESTAQUES. Foto ou texto; o anel amarelo no avatar é story no ar.
   Destaque guarda o story pra sempre no perfil. */
(function(){
  'use strict';
  const C = window.Corre, { esc, ico } = C;
  const FUNDOS = ['#141216', '#FF48B0', '#0067AE', '#FF6C2F', '#FFE800', '#765BA7'];
  const DUR = 5500;
  const V = { groups: [], gi: 0, si: 0, t: 0, start: 0, left: DUR, paused: false, raf: 0, mode: 'feed', ask: false, liked: new Set(), likes: {}, lidos: new Set() };

  /* ---------- dados ---------- */
  C.storiesAtivos = async () => {
    /* os 300 mais novos (não os mais velhos), depois em ordem de tempo dentro de cada pessoa */
    const rows = (await C.api.q('corre_stories', { gt: { expira_em: new Date().toISOString() }, join: 'perfil', order: ['created_at', false], limit: 300 })).reverse();
    const map = new Map();
    rows.forEach(s => { const k = s.dono; if(!map.has(k)) map.set(k, { perfil: s.perfil, stories: [] }); map.get(k).stories.push(s); });
    const me = C.uid(), arr = [...map.values()];
    arr.sort((a, b) => (a.perfil.id === me ? -1 : b.perfil.id === me ? 1 : 0) || String(b.stories[b.stories.length - 1].created_at).localeCompare(String(a.stories[a.stories.length - 1].created_at)));
    return arr;
  };
  C.storiesBar = async () => {
    let groups = [];
    try{ groups = await C.storiesAtivos(); }catch(e){}
    V.feed = groups;
    const me = C.st.me, mine = groups.find(g => g.perfil.id === C.uid());
    const others = groups.filter(g => g.perfil.id !== C.uid());
    return `<div class="sbar" role="list">
      <div class="sb" role="listitem"><button type="button" class="sb-av${mine ? ' on' : ''}" data-act="${mine ? 'st-ver' : 'st-novo'}" data-g="${mine ? groups.indexOf(mine) : ''}" aria-label="${mine ? 'Ver teu story' : 'Postar story'}">${C.avatar(me, 'm')}</button>${mine ? `<button type="button" class="sb-plus" data-act="st-novo" aria-label="Postar outro story">${ico('plus')}</button>` : `<span class="sb-plus" aria-hidden="true">${ico('plus')}</span>`}<span class="sb-n">${mine ? 'Teu story' : 'Postar'}</span></div>
      ${others.map(g => `<div class="sb" role="listitem"><button type="button" class="sb-av on" data-act="st-ver" data-g="${groups.indexOf(g)}" aria-label="Ver story de @${esc(g.perfil.handle)}">${C.avatar(g.perfil, 'm')}</button><span class="sb-n">${esc(g.perfil.handle)}</span></div>`).join('')}
      ${!others.length ? '<p class="sb-empty">Quando a galera postar, os stories aparecem aqui.</p>' : ''}
    </div>`;
  };

  /* ---------- visor ---------- */
  function open(groups, gi, mode, si){
    if(!groups.length || !groups[gi]) return;
    V.groups = groups; V.gi = gi; V.si = Math.max(0, Math.min(Number(si) || 0, groups[gi].stories.length - 1)); V.mode = mode || 'feed'; V.ask = false;
    let el = C.$('story');
    if(!el){ el = document.createElement('div'); el.id = 'story'; el.className = 'story'; document.body.appendChild(el); }
    el.hidden = false; document.body.classList.add('locked');
    show();
  }
  function close(){
    cancelAnimationFrame(V.raf); clearTimeout(V.t);
    const el = C.$('story'); if(el){ el.hidden = true; el.innerHTML = ''; }
    document.body.classList.remove('locked');
    if(V.dirty){ V.dirty = false; C.refresh && C.refresh(); }
  }
  function show(){
    const g = V.groups[V.gi], s = g && g.stories[V.si]; if(!s){ close(); return; }
    const mine = s.dono === C.uid(), el = C.$('story');
    const midia = s.midia_url ? `<img class="st-img" src="${esc(s.midia_url)}" alt="${esc(s.texto || 'Story de @' + g.perfil.handle)}">` : '';
    el.innerHTML = `<div class="st-frame" style="--bg:${esc(s.fundo || '#0F1218')}">
      ${midia}${s.texto ? `<p class="st-txt${s.midia_url ? ' over' : ''}">${esc(s.texto)}</p>` : ''}
      <div class="st-bars">${g.stories.map((x, i) => `<i><b style="width:${i < V.si ? 100 : 0}%"${i === V.si ? ' id="st-cur"' : ''}></b></i>`).join('')}</div>
      <div class="st-head"><a href="#/@${esc(g.perfil.handle)}" data-act="st-perfil">${C.avatar(g.perfil, 's')}<b>@${esc(g.perfil.handle)}</b></a><span>${V.mode === 'destaque' ? esc(g.titulo || 'Destaque') : C.rel(s.created_at)}</span><button type="button" class="st-x" data-act="st-fechar" aria-label="Fechar">${ico('x')}</button></div>
      <button type="button" class="st-tap l" data-act="st-prev" aria-label="Anterior"></button><button type="button" class="st-tap r" data-act="st-next" aria-label="Próximo"></button>
      ${mine ? `<div class="st-own">${V.ask ? `<span>Apagar este story?</span><button type="button" class="btn sm" data-act="st-del-ok">Apagar</button><button type="button" class="btn sm ghost" data-act="st-del-no">Não</button>` : `${V.mode === 'destaque' ? `<button type="button" class="btn sm" data-act="st-undest">Tirar do destaque</button>` : `<button type="button" class="btn sm" data-act="st-dest">${ico('star')} ${s.destaque_id ? 'Trocar destaque' : 'Destacar'}</button>`}${C.insta ? `<button type="button" class="btn sm" data-act="ig-story" data-k="story">${ico('ig')} No Insta</button>` : ''}<button type="button" class="btn sm ghost" data-act="st-del" aria-label="Apagar story">${ico('trash')}</button>`}</div>` : ''}
    </div>`;
    el.querySelector('.st-frame').insertAdjacentHTML('beforeend', '<div class="st-like" id="st-like"></div>');
    pintaLike();
    const ids = g.stories.map(x => x.id).filter(id => !V.lidos.has(id));
    if(ids.length && C.uid()){ ids.forEach(id => V.lidos.add(id)); carregaCurtidas(ids).then(pintaLike); }
    V.left = DUR; V.paused = V.ask; run();
    const img = el.querySelector('.st-img'); if(img){ V.paused = true; const go = () => { if(!V.ask) { V.paused = false; run(); } }; if(img.complete) go(); else { img.onload = go; img.onerror = go; } }
  }
  /* ---------- curtir story: o coração pra quem vê; a dona vê quem curtiu ---------- */
  async function carregaCurtidas(ids){
    try{
      const rows = await C.api.q('corre_story_curtidas', { in: { story_id: ids }, join: 'perfil' });
      rows.forEach(r => { if(r.dono === C.uid()) V.liked.add(r.story_id); const a = V.likes[r.story_id] = V.likes[r.story_id] || []; if(!a.some(p => p.id === r.perfil.id)) a.push(r.perfil); });
    }catch(e){}
  }
  function pintaLike(){
    const box = C.$('st-like'), g = V.groups[V.gi], s = g && g.stories[V.si]; if(!box || !s) return;
    if(!C.uid()){ box.innerHTML = ''; return; }
    if(s.dono === C.uid()){
      const q = V.likes[s.id] || [];
      box.className = 'st-like own';
      box.innerHTML = q.length ? `<span class="st-quem">${ico('heart')}<b>${q.length}</b> ${q.slice(0, 3).map(p => '@' + esc(p.handle)).join(', ')}${q.length > 3 ? ` e mais ${q.length - 3}` : ''}</span>` : '';
      return;
    }
    const on = V.liked.has(s.id);
    box.className = 'st-like';
    box.innerHTML = `<button type="button" class="st-heart" data-act="st-curtir" aria-pressed="${on}" aria-label="${on ? 'Descurtir story' : 'Curtir story'}">${ico('heart')}</button>`;
  }

  function run(){
    cancelAnimationFrame(V.raf); V.start = performance.now();
    const base = V.left;
    const f = now => {
      const bar = C.$('st-cur'); if(!bar) return;
      if(V.paused){ V.start = now; V.raf = requestAnimationFrame(f); return; }
      const left = base - (now - V.start); V.left = left;
      bar.style.width = Math.min(100, (1 - left / DUR) * 100) + '%';
      if(left <= 0){ next(); return; }
      V.raf = requestAnimationFrame(f);
    };
    V.raf = requestAnimationFrame(f);
  }
  function next(){ const g = V.groups[V.gi]; V.ask = false; if(V.si < g.stories.length - 1){ V.si++; show(); } else if(V.gi < V.groups.length - 1){ V.gi++; V.si = 0; show(); } else close(); }
  function prev(){ V.ask = false; if(V.si > 0){ V.si--; show(); } else if(V.gi > 0){ V.gi--; V.si = V.groups[V.gi].stories.length - 1; show(); } else show(); }
  C.storyOpen = open;
  /* o story na tela (pro story do Instagram) e a pausa enquanto a folha tá aberta */
  C.storyAtual = () => { const g = V.groups[V.gi], s = g && g.stories[V.si]; return s ? { s, perfil: g.perfil } : null; };
  C.storyPausa = () => { V.paused = true; };

  /* ---------- postar ---------- */
  function composer(){
    let file = null, url = '', fundo = FUNDOS[0], modo = 'foto';
    const panel = C.sheet(`<div class="form st-comp"><div class="sheet-head"><h2>Novo story</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <div class="seg2" role="tablist"><label><input type="radio" name="st-m" value="foto" checked><span>Foto</span></label><label><input type="radio" name="st-m" value="texto"><span>Texto</span></label></div>
      <div class="st-prev" id="st-prev"><label class="st-pick up-lbl" id="st-pick">${ico('camera')}<b>Escolher foto</b><small>Do celular ou do computador</small><input type="file" accept="image/*" class="st-file" aria-label="Escolher foto do story"></label></div>
      <div class="fld"><label for="st-t" id="st-tl">Legenda (opcional)</label><textarea class="inp" id="st-t" maxlength="220" placeholder="Bastidor do corre…"></textarea></div>
      <fieldset class="fld" id="st-fd" hidden><legend>Fundo</legend><div class="cores">${FUNDOS.map(k => `<label class="cor"><input type="radio" name="st-f" value="${k}"${k === fundo ? ' checked' : ''}><i style="background:${k}"></i></label>`).join('')}</div></fieldset>
      <div class="acts"><button type="button" class="btn pri" id="st-ok">Postar story</button><span class="fine">Fica no ar 24 h. Dá pra destacar depois.</span></div></div>`);
    const prevEl = C.$('st-prev'), t = C.$('st-t');
    const paint = () => {
      if(modo === 'texto') prevEl.innerHTML = `<div class="st-mini" style="--bg:${fundo}"><p>${esc(t.value || 'Escreve aí')}</p></div>`;
      else if(url) prevEl.innerHTML = `<div class="st-mini img"><img src="${url}" alt=""><label class="btn sm up-lbl" id="st-pick">Trocar foto<input type="file" accept="image/*" class="st-file" aria-label="Trocar foto do story"></label></div>`;
      else prevEl.innerHTML = `<label class="st-pick up-lbl" id="st-pick">${ico('camera')}<b>Escolher foto</b><small>Do celular ou do computador</small><input type="file" accept="image/*" class="st-file" aria-label="Escolher foto do story"></label>`;
    };
    panel.addEventListener('change', e => {
      if(e.target.classList && e.target.classList.contains('st-file')){ const f = e.target.files && e.target.files[0]; e.target.value = ''; if(!f) return; file = f; if(url) URL.revokeObjectURL(url); url = URL.createObjectURL(f); paint(); return; }
      if(e.target.name === 'st-m'){ modo = e.target.value; C.$('st-fd').hidden = modo !== 'texto'; C.$('st-tl').textContent = modo === 'texto' ? 'Texto' : 'Legenda (opcional)'; paint(); }
      if(e.target.name === 'st-f'){ fundo = e.target.value; paint(); }
    });
    t.addEventListener('input', () => { if(modo === 'texto') paint(); });
    C.$('st-ok').addEventListener('click', async ev => {
      const texto = t.value.trim();
      if(modo === 'foto' && !file){ C.toast('Escolhe uma foto.'); return; }
      if(modo === 'texto' && !texto){ C.toast('Escreve o texto do story.'); t.focus(); return; }
      const b = ev.target; b.disabled = true; b.textContent = 'Postando…';
      try{
        const row = { texto, fundo: modo === 'texto' ? fundo : '' };
        if(modo === 'foto'){ const blob = await C.shrink(file, 1440, .84); row.midia_url = await C.api.upload(blob); }
        /* v3.74: o banco recusou, a foto que acabou de subir sai do Storage */
        await C.api.ins('corre_stories', row).catch(e => { if(row.midia_url) C.api.unlink(row.midia_url); throw e; });
        if(url) URL.revokeObjectURL(url);
        C.closeSheet(); C.toast('Story no ar.'); C.refresh && C.refresh();
      }catch(e){ C.toast(C.errMsg(e, 'Não deu pra postar agora.')); b.disabled = false; b.textContent = 'Postar story'; }
    });
  }

  /* ---------- destaques ---------- */
  async function destacarSheet(story){
    V.paused = true;
    let ds = [];
    try{ ds = await C.api.q('corre_destaques', { eq: { dono: C.uid() }, order: ['ordem', true] }); }catch(e){}
    const panel = C.sheet(`<form class="form" id="dz-f"><div class="sheet-head"><h2>Destacar no perfil</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      ${ds.length ? `<div class="dz-list">${ds.map(d => `<button type="button" class="chip add" data-dz="${d.id}">${esc(d.titulo)}</button>`).join('')}</div><p class="fine">Ou cria um novo:</p>` : ''}
      <div class="seguir-row"><input class="inp" id="dz-t" maxlength="24" placeholder="Bastidor, Clientes, Set…" autofocus><button type="submit" class="btn pri">Criar</button></div></form>`, 'over-story');
    const put = async id => {
      try{ await C.api.upd('corre_stories', { id: story.id }, { destaque_id: id }); story.destaque_id = id; V.dirty = true; C.closeSheet(); C.toast('Destacado no perfil.'); show(); }
      catch(e){ C.toast(C.errMsg(e)); }
    };
    panel.querySelectorAll('[data-dz]').forEach(b => b.addEventListener('click', () => put(b.dataset.dz)));
    C.$('dz-f').addEventListener('submit', async e => {
      e.preventDefault(); const titulo = C.$('dz-t').value.trim(); if(!titulo){ C.toast('Dá um nome pro destaque.'); return; }
      const bt = e.target.querySelector('[type=submit]'); if(bt.disabled) return; bt.disabled = true;
      try{ const r = await C.api.ins('corre_destaques', { titulo, ordem: ds.length }); await put(r[0].id); }catch(err){ C.toast(C.errMsg(err)); }
      finally{ bt.disabled = false; }
    });
  }
  /* destaques de um perfil: [{id,titulo,stories[]}] */
  C.destaquesDe = async dono => {
    const [ds, ss] = await Promise.all([
      C.api.q('corre_destaques', { eq: { dono }, order: ['ordem', true] }),
      C.api.q('corre_stories', { eq: { dono }, order: ['created_at', true], limit: 300 })
    ]);
    return ds.map(d => Object.assign({}, d, { stories: ss.filter(s => s.destaque_id === d.id) })).filter(d => d.stories.length || dono === C.uid());
  };
  C.destaquesHTML = (ds, mine) => {
    if(!ds.length) return mine ? '<p class="note">Destaca um story e ele fica aqui pra sempre. Abre um story teu e toca em Destacar.</p>' : '';
    return `<div class="dz-row">${ds.map((d, i) => { const s = d.stories[0]; const cover = s ? (s.midia_url ? `<img src="${esc(s.midia_url)}" alt="">` : `<span style="background:${esc(s.fundo || '#0F1218')}"></span>`) : '<span class="vazio"></span>'; return `<div class="dz"><button type="button" class="dz-c" data-act="dz-ver" data-i="${i}" aria-label="Destaque ${esc(d.titulo)}"${d.stories.length ? '' : ' disabled'}>${cover}</button><span>${esc(d.titulo)}</span>${mine ? `<button type="button" class="dz-del" data-act="dz-del" data-id="${d.id}" aria-label="Apagar destaque ${esc(d.titulo)}">${ico('x')}</button>` : ''}</div>`; }).join('')}</div>`;
  };

  Object.assign(C.acts, {
    'st-novo': () => composer(),
    'st-ver': el => { if(V.feed) open(V.feed, Number(el.dataset.g), 'feed'); },
    'st-fechar': () => close(),
    'st-next': () => next(),
    'st-prev': () => prev(),
    'st-perfil': () => close(),
    'st-dest': () => { const s = V.groups[V.gi].stories[V.si]; destacarSheet(s); },
    'st-undest': async () => {
      const g = V.groups[V.gi], s = g.stories[V.si];
      try{ await C.api.upd('corre_stories', { id: s.id }, { destaque_id: null }); g.stories.splice(V.si, 1); V.dirty = true; C.toast('Saiu do destaque.'); if(!g.stories.length) close(); else { V.si = Math.min(V.si, g.stories.length - 1); show(); } }catch(e){ C.toast(C.errMsg(e)); }
    },
    'st-curtir': async el => {
      const g = V.groups[V.gi], s = g && g.stories[V.si]; if(!s || !C.uid()) return;
      const on = V.liked.has(s.id);
      if(on) V.liked.delete(s.id); else V.liked.add(s.id);
      pintaLike(); if(!on){ const h = C.$('st-like'); if(h) h.classList.add('pop'); }
      try{ if(on) await C.api.del('corre_story_curtidas', { story_id: s.id, dono: C.uid() }); else { await C.api.ins('corre_story_curtidas', { story_id: s.id }); if(C.push) C.push.avisa('story', s.id); } }
      catch(e){ if(e && e.code === '23505') return; if(on) V.liked.add(s.id); else V.liked.delete(s.id); pintaLike(); C.toast(C.errMsg(e)); }
    },
    'st-del': () => { V.ask = true; V.paused = true; show(); },
    'st-del-no': () => { V.ask = false; show(); },
    'st-del-ok': async () => {
      const g = V.groups[V.gi], s = g.stories[V.si];
      try{ await C.api.del('corre_stories', { id: s.id }); if(s.midia_url) C.api.unlink(s.midia_url); g.stories.splice(V.si, 1); V.dirty = true; V.ask = false; C.toast('Story apagado.'); if(!g.stories.length){ V.groups.splice(V.gi, 1); if(!V.groups.length) return close(); V.gi = Math.min(V.gi, V.groups.length - 1); V.si = 0; } else V.si = Math.min(V.si, g.stories.length - 1); show(); }
      catch(e){ C.toast(C.errMsg(e)); }
    },
    'dz-ver': el => { const d = (C.st.dzAtual || [])[Number(el.dataset.i)]; if(d && d.stories.length) open([{ perfil: C.st.dzPerfil, titulo: d.titulo, stories: d.stories.slice() }], 0, 'destaque'); },
    'dz-del': async el => {
      if(el.dataset.armed !== '1'){ el.dataset.armed = '1'; el.classList.add('armed'); C.toast('Toca de novo pra apagar o destaque. Os stories continuam.'); return; }
      try{ await C.api.del('corre_destaques', { id: el.dataset.id }); C.toast('Destaque apagado.'); C.refresh && C.refresh(); }catch(e){ C.toast(C.errMsg(e)); }
    }
  });
  addEventListener('keydown', e => {
    /* v3.55: o Esc que fechou uma folha (ou a pergunta) por cima do story não fecha o story junto */
    if(e.defaultPrevented || document.querySelector('dialog[open]')) return;
    const el = C.$('story'); if(!el || el.hidden || !C.$('sheet').hidden) return;
    if(e.key === 'Escape') close(); if(e.key === 'ArrowRight') next(); if(e.key === 'ArrowLeft') prev();
  });
  /* segura pra pausar */
  document.addEventListener('pointerdown', e => { if(e.target.closest('.st-tap')){ V.hold = setTimeout(() => { V.paused = true; V.held = true; }, 220); } });
  document.addEventListener('pointerup', () => { clearTimeout(V.hold); if(V.held) setTimeout(() => { V.held = false; if(!V.ask) V.paused = false; }, 0); });
  C.onSheetClose = () => { const el = C.$('story'); if(el && !el.hidden && !V.ask) V.paused = false; };
  document.addEventListener('click', e => { if(V.held && e.target.closest('.st-tap')){ e.stopPropagation(); e.preventDefault(); } }, true);
  addEventListener('hashchange', () => { const el = C.$('story'); if(el && !el.hidden) close(); });
})();
