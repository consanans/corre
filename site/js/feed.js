/* CORRE · FEED: a rede de verdade, com cara de Twitter e um pé no LinkedIn.
   "Pra você" mistura o que tá rendendo conversa, quem você segue, o teu nicho e a tua cidade; "Seguindo" é na ordem.
   Post curto (até 500 letras, com o contador), fio (sequência de posts teus), enquete, foto, frame do Rolo e arte do Studio.
   Fortalecer (repassa com teu nome em cima) e citar (o mesmo, com um comentário teu). Visualizações, salvar e fixar no perfil.
   Cada post abre como conversa (#/p/ID): o fio inteiro e as respostas. Em alta no corre: as #hashtags da semana. */
(function(){
  'use strict';
  const C = window.Corre, { esc, ico } = C;
  const PAGE = 15, MAX = 500;
  /* tem @alguém no texto (o aviso no celular só vai quando marcou alguém) */
  const MARCA = /(^|[^a-z0-9_.@])@[a-z0-9_.]{3,24}/i;
  const F = { tab: 'pravoce', modo: '', tag: '', tagNext: '', rows: [], fim: false, by: {}, orig: {}, likes: {}, meus: new Set(), resp: {}, forts: {}, meusF: new Set(),
    salvos: new Set(), enq: {}, fioN: {}, seguindo: null, foto: null, busy: false, perfil: null, fixo: null, fixoRow: null, alta: null, altaAt: 0, focoResp: false,
    pv: null, pvPos: 0, sv: null, svPos: 0, fioK: 0, grupo: null, gInfo: {} };
  const CV = { post: null, coms: [], fio: [], g: null, mod: false };
  /* grupos (v3.36): quem modera o grupo do post (na página do grupo ou na conversa do post) */
  const dentroG = g => !!g && !!g.eu && g.eu.estado === 'ativo';
  const modG = g => dentroG(g) && (g.eu.papel === 'dono' || g.eu.papel === 'mod');
  const grupoDe = p => !p || !p.grupo ? null : F.grupo && F.grupo.id === p.grupo ? F.grupo : CV.g && CV.g.id === p.grupo ? CV.g : null;

  /* fortaleceu sem dizer nada (repost puro) */
  const puro = p => !!p && p.tipo === 'fortalece' && !p.texto && !p.midia_url;
  /* o link leva o @ de quem compartilha (?de=): quem entrar no Corre por ele já sai seguindo */
  const linkPost = id => { const me = C.st.me, de = me && me.handle && me.visibilidade !== 'mocado' ? '?de=' + encodeURIComponent(me.handle) : ''; return `${location.origin}${location.pathname}${de}#/p/${id}`; };
  const tagRe = t => new RegExp(`(^|[\\s(])#${t}(?![\\p{L}\\p{N}_])`, 'iu');
  const linkify = t => esc(t)
    .replace(/(^|[\s(])#([\p{L}\p{N}_]{2,40})/gu, (m, a, tag) => `${a}<button type="button" class="h" data-act="fd-tag" data-t="${tag.toLowerCase()}">#${tag}</button>`)
    .replace(/(^|[\s(])@([a-z0-9_.]{3,24})/gi, (m, a, h) => { const k = h.replace(/\.+$/, ''); return k.length < 3 ? m : `${a}<a href="#/@${k.toLowerCase()}">@${k}</a>${h.slice(k.length)}`; })
    .replace(/\b(https?:\/\/[^\s<]{4,200})/g, '<a href="$1" target="_blank" rel="noopener nofollow">$1</a>');
  const dataHora = ts => { try{ return new Date(ts).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', ' às'); }catch(e){ return C.rel(ts); } };
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  /* 1.234 vira "1,2 mil", como no Twitter */
  const nfmt = n => { n = Number(n) || 0; return n < 1000 ? String(n) : n < 1e6 ? (n / 1000).toFixed(n < 1e4 ? 1 : 0).replace('.', ',').replace(/,0$/, '') + ' mil' : (n / 1e6).toFixed(1).replace('.', ',').replace(/,0$/, '') + ' mi'; };
  const restaTxt = fim => { const ms = Date.parse(fim) - Date.now(); if(ms <= 0) return 'encerrada'; const h = ms / 36e5; return h >= 24 ? `faltam ${Math.round(h / 24)} ${Math.round(h / 24) === 1 ? 'dia' : 'dias'}` : h >= 1 ? `faltam ${Math.round(h)} h` : `faltam ${Math.max(1, Math.round(ms / 6e4))} min`; };
  const erroPost = e => { const h = (e && (e.hint || e.message)) || ''; return /grupo/.test(h) ? 'Só quem é do grupo posta aqui.' : /texto/.test(h) ? `Cada post vai até ${MAX} letras. O resto vira fio.` : /enquete/.test(h) ? 'Confere a enquete: de 2 a 4 opções, cada uma com até 40 letras.' : /fio/.test(h) ? 'Não deu pra continuar esse fio.' : C.errMsg(e, 'Não deu pra publicar agora.'); };

  /* ---------- dados ---------- */
  async function seguindoIds(){
    if(F.seguindo) return F.seguindo;
    const uid = C.uid(); if(!uid) return (F.seguindo = new Set());
    const r = await C.api.q('corre_seguindo', { eq: { quem: uid } }).catch(() => []);
    return (F.seguindo = new Set(r.map(x => x.segue)));
  }
  const guarda = ps => ps.forEach(p => { F.by[p.id] = p; });
  /* os posts que alguém fortaleceu ou citou */
  async function originais(rows){
    const ids = [...new Set(rows.filter(p => p.alvo && !(p.alvo in F.orig)).map(p => p.alvo))];
    if(!ids.length) return;
    const os = await C.api.q('corre_feed', { join: 'perfil', in: { id: ids } }).catch(() => []);
    os.forEach(o => { F.orig[o.id] = o; F.by[o.id] = o; });
    ids.forEach(id => { if(!F.orig[id]) F.orig[id] = null; });
  }
  async function gruposInfo(rows){
    const ids = [...new Set(rows.concat(rows.map(r => r.alvo && F.orig[r.alvo]).filter(Boolean)).map(r => r.grupo).filter(g => g && !(g in F.gInfo)))];
    if(!ids.length) return;
    const gs = await C.api.q('corre_grupos', { select: 'id,slug,nome,fechado,cor', in: { id: ids } }).catch(() => []);
    gs.forEach(g => { F.gInfo[g.id] = g; }); ids.forEach(id => { if(!F.gInfo[id]) F.gInfo[id] = null; });
  }
  async function contagens(ids){
    ids = [...new Set(ids)].filter(Boolean); if(!ids.length) return;
    const uid = C.uid(), enqIds = ids.filter(id => F.by[id] && F.by[id].enquete), raizes = ids.filter(id => F.by[id] && !F.by[id].fio);
    const [cs, rs, fs, sv, eq, fi] = await Promise.all([
      C.api.q('corre_curtidas', { select: 'post_id,dono', in: { post_id: ids } }).catch(() => []),
      C.api.q('corre_comentarios', { select: 'post_id', in: { post_id: ids } }).catch(() => []),
      C.api.q('corre_feed', { select: 'id,dono,alvo,texto,midia_url,tipo', in: { alvo: ids } }).catch(() => []),
      uid ? C.api.q('corre_salvos', { select: 'post_id', eq: { dono: uid }, in: { post_id: ids } }).catch(() => []) : [],
      enqIds.length ? C.api.rpc('corre_enquetes', { p_ids: enqIds }).catch(() => null) : null,
      raizes.length ? C.api.q('corre_feed', { select: 'fio', in: { fio: raizes } }).catch(() => []) : []
    ]);
    ids.forEach(id => { F.likes[id] = 0; F.resp[id] = 0; F.forts[id] = 0; F.meus.delete(id); F.meusF.delete(id); F.salvos.delete(id); F.fioN[id] = 0; });
    sv.forEach(x => F.salvos.add(x.post_id));
    if(eq) Object.assign(F.enq, eq);
    fi.forEach(x => { F.fioN[x.fio] = (F.fioN[x.fio] || 0) + 1; });
    cs.forEach(c => { F.likes[c.post_id] = (F.likes[c.post_id] || 0) + 1; if(c.dono === uid) F.meus.add(c.post_id); });
    rs.forEach(c => { F.resp[c.post_id] = (F.resp[c.post_id] || 0) + 1; });
    fs.forEach(f => { F.forts[f.alvo] = (F.forts[f.alvo] || 0) + 1; if(f.dono === uid && puro(f)) F.meusF.add(f.alvo); });
  }
  async function carregar(mais){
    /* cada carga tem um número: resposta de uma aba velha não sobrescreve a aba de agora */
    const seq = F.seq = (F.seq || 0) + 1;
    const lista = F.modo === 'salvos' ? 'sv' : (!F.perfil && !F.tag && !F.grupo && F.tab === 'pravoce') ? 'pv' : '';
    if(lista && !(lista === 'pv' && F.pvVazio)){
      if(!mais || !F[lista]){
        let ids = [];
        if(lista === 'pv'){ try{ ids = (await C.api.rpc('corre_pra_voce', { p_lim: 150 })) || []; }catch(e){ ids = []; } }
        else ids = (await C.api.q('corre_salvos', { select: 'post_id', eq: { dono: C.uid() }, order: ['created_at', false], limit: 500 })).map(x => x.post_id);
        if(seq !== F.seq) return;
        /* "Pra você" sem nada nos últimos dias: cai pra linha do tempo de todo mundo */
        if(lista === 'pv' && !ids.length){ F.pvVazio = true; return carregar(mais); }
        F[lista] = ids; F[lista + 'Pos'] = 0;
      }
      const ids = F[lista].slice(F[lista + 'Pos'], F[lista + 'Pos'] + PAGE); F[lista + 'Pos'] += ids.length;
      let novos = ids.length ? await C.api.q('corre_feed', { join: 'perfil', in: { id: ids } }) : [];
      if(seq !== F.seq) return;
      novos.sort((x, y) => ids.indexOf(x.id) - ids.indexOf(y.id));
      F.fim = F[lista + 'Pos'] >= F[lista].length;
      guarda(novos);
      F.rows = mais ? F.rows.concat(novos) : novos;
      await originais(novos);
      await gruposInfo(novos);
      await contagens(novos.map(p => puro(p) ? p.alvo : p.id));
      return;
    }
    if((F.perfil || F.grupo) && !mais){
      /* o post fixado vem primeiro (no perfil ou no grupo) */
      F.fixoRow = null;
      if(F.fixo){ try{ const fx = await C.api.one('corre_feed', { join: 'perfil', eq: F.grupo ? { id: F.fixo, grupo: F.grupo.id } : { id: F.fixo, dono: F.perfil } }); if(fx && !fx.fio && !puro(fx)) F.fixoRow = fx; }catch(e){} }
      if(seq !== F.seq) return;
      if(F.fixoRow){ guarda([F.fixoRow]); await originais([F.fixoRow]); }
    }
    const o = { join: 'perfil', order: ['created_at', false], limit: PAGE, is: { fio: null } };
    if(mais && F.cursor) o.lt = { created_at: F.cursor };
    if(F.grupo) o.eq = { grupo: F.grupo.id };
    else if(F.perfil) o.eq = { dono: F.perfil };
    else{
      /* o feed principal não tem post de grupo (post de grupo mora no grupo) */
      o.is.grupo = null;
      if(F.tag) o.ilike = { texto: `%#${F.tag}%` };
      else if(F.tab === 'seguindo'){ const s = await seguindoIds(); o.in = { dono: [...s, C.uid()].filter(Boolean) }; }
    }
    let novos;
    try{ novos = await C.api.q('corre_feed', o); }
    catch(e){
      /* banco ainda sem os grupos (o delta v3.36 não rodou): o feed segue, sem o filtro de grupo */
      const semGrupo = !!e && (e.code === '42703' || /grupo/.test(e.message || '') && /does not exist|não existe/i.test(e.message || ''));
      if(!('grupo' in o.is) || !semGrupo) throw e;
      delete o.is.grupo; novos = await C.api.q('corre_feed', o);
    }
    if(seq !== F.seq) return;
    F.fim = novos.length < PAGE;
    /* o cursor vem do último que o banco mandou (antes do filtro da hashtag), pra não pular nem repetir página */
    if(novos.length) F.cursor = novos[novos.length - 1].created_at; else if(!mais) F.cursor = null;
    if(F.tag && !F.perfil && !F.grupo){ const re = tagRe(F.tag); novos = novos.filter(p => re.test(p.texto || '')); }
    guarda(novos);
    F.rows = mais ? F.rows.concat(novos) : novos;
    await originais(novos);
    if(!F.grupo) await gruposInfo(novos.concat(F.fixoRow ? [F.fixoRow] : []));
    await contagens(novos.map(p => puro(p) ? p.alvo : p.id).concat((F.perfil || F.grupo) && !mais && F.fixoRow ? [F.fixoRow.id] : []));
  }

  /* ---------- desenho ---------- */
  function midia(p){
    if(p.tipo === 'rolo' && p.ref && C.rolo) return C.rolo.frameHTML(p.ref);
    if(p.midia_url) return `<figure class="fp-img${p.tipo === 'arte' ? ' arte' : ''}"><img src="${esc(p.midia_url)}" alt="${esc((p.ref && p.ref.alt) || '')}" loading="lazy" decoding="async"></figure>`;
    return '';
  }
  /* o post citado, pequeno, dentro de outro */
  function citado(o, solto){
    if(!o) return `<div class="fp-q off">Esse post não tá mais disponível.</div>`;
    const a = o.perfil || {}, tx = String(o.texto || ''), tag = solto ? 'div' : 'a';
    return `<${tag} class="fp-q"${solto ? '' : ` href="#/p/${o.id}"`}><span class="fp-q-h">${C.avatar(a, 's')}<b>${esc(a.nome || '')}</b><span class="fp-meta">@${esc(a.handle || '')} · ${C.rel(o.created_at)}</span></span>`
      + `${tx ? `<span class="fp-q-t">${esc(tx.length > 280 ? tx.slice(0, 279) + '…' : tx)}</span>` : ''}${o.midia_url ? `<img src="${esc(o.midia_url)}" alt="" loading="lazy">` : ''}${o.tipo === 'rolo' && !o.midia_url ? '<span class="fp-tag">Rolo 360</span>' : ''}</${tag}>`;
  }
  /* a barra do post, como no Twitter: responder, fortalecer, curtir, visualizações e, no canto, salvar e compartilhar */
  function acoes(p){
    const n = F.likes[p.id] || 0, on = F.meus.has(p.id), r = F.resp[p.id] || 0, f = F.forts[p.id] || 0, fon = F.meusF.has(p.id), v = Number(p.vistas) || 0, sv = F.salvos.has(p.id);
    return `<footer class="fp-a">
      <button type="button" class="fp-b resp" data-act="fd-resp" data-id="${p.id}" aria-label="Responder${r ? ` (${plural(r, 'resposta', 'respostas')})` : ''}">${ico('chat')}<span>${r ? nfmt(r) : ''}</span></button>
      <button type="button" class="fp-b forte" data-act="fd-forte" data-id="${p.id}" aria-pressed="${fon}" aria-label="${fon ? 'Você fortaleceu. Desfazer ou citar' : 'Fortalecer ou citar'}">${ico('raio')}<span>${f ? nfmt(f) : ''}</span></button>
      <button type="button" class="fp-b like" data-act="fd-like" data-id="${p.id}" aria-pressed="${on}" aria-label="${on ? 'Descurtir' : 'Curtir'}">${ico('heart')}<span>${n ? nfmt(n) : ''}</span></button>
      <span class="fp-b vis" title="${plural(v, 'visualização', 'visualizações')}" aria-label="${plural(v, 'visualização', 'visualizações')}">${ico('vistas')}<span>${v ? nfmt(v) : ''}</span></span>
      <span class="fp-a-fim"><button type="button" class="fp-b salva" data-act="fd-salvar" data-id="${p.id}" aria-pressed="${sv}" aria-label="${sv ? 'Tirar dos salvos' : 'Salvar'}" title="${sv ? 'Tirar dos salvos' : 'Salvar'}">${ico('save')}</button><button type="button" class="fp-b" data-act="fd-share" data-id="${p.id}" aria-label="Compartilhar" title="Compartilhar">${ico('share')}</button></span>
    </footer>`;
  }
  /* enquete: vota com um toque; depois (ou se acabou, ou se é tua) mostra as barras */
  function enqueteHTML(p){
    const e = p.enquete; if(!e || !Array.isArray(e.ops)) return '';
    const uid = C.uid(), r = F.enq[p.id] || { n: e.ops.map(() => 0), total: 0, meu: null }, acabou = Date.parse(e.fim) <= Date.now();
    const ve = acabou || r.meu != null || !uid || p.dono === uid, tot = Number(r.total) || 0, max = Math.max(0, ...(r.n || []).map(Number));
    const pe = `<p class="fp-enq-pe">${plural(tot, 'voto', 'votos')} · ${acabou ? 'encerrada' : restaTxt(e.fim)}</p>`;
    if(!ve) return `<div class="fp-enq" role="group" aria-label="Enquete">${e.ops.map((o, i) => `<button type="button" class="fp-enq-op" data-act="fd-votar" data-id="${p.id}" data-op="${i}">${esc(o)}</button>`).join('')}${pe}</div>`;
    return `<div class="fp-enq res" role="group" aria-label="Resultado da enquete">${e.ops.map((o, i) => { const k = Number((r.n || [])[i]) || 0, pc = tot ? Math.round(k / tot * 100) : 0;
      return `<div class="fp-enq-r${k && k === max ? ' top' : ''}${r.meu === i ? ' meu' : ''}"><i style="width:${pc}%"></i><span>${esc(o)}${r.meu === i ? ' <em>teu voto</em>' : ''}</span><b>${pc}%</b></div>`; }).join('')}${pe}</div>`;
  }
  function postHTML(p, opt){
    opt = opt || {};
    const a = p.perfil || {}, uid = C.uid(), mine = !!uid && p.dono === uid, row = opt.row || p.id;
    const tipo = p.tipo === 'rolo' ? '<span class="fp-tag">Rolo 360</span>' : p.tipo === 'arte' ? `<span class="fp-tag">Estúdio${p.ref && p.ref.marca ? ' · ' + esc(p.ref.marca) : ''}</span>` : '';
    const rt = opt.rt && opt.rt.perfil ? `<p class="fp-rt">${ico('raio')}<a href="#/@${esc(opt.rt.perfil.handle)}">${opt.rt.dono === uid ? 'Você' : esc(opt.rt.perfil.nome || '')}</a> fortaleceu</p>` : opt.fixo ? `<p class="fp-rt fixo">${ico('tacha')} ${opt.fixo === 'grupo' ? 'Fixado no grupo' : 'Fixado no perfil'}</p>` : '';
    const gi = p.grupo && !(F.grupo && F.grupo.id === p.grupo) ? F.gInfo[p.grupo] : null;
    const gSelo = gi ? `<a class="fp-grupo" href="#/g/${esc(gi.slug)}" title="Post do grupo ${esc(gi.nome)}">${ico('gente')}<span>${esc(gi.nome)}</span></a>` : '';
    const fio = !opt.big && !opt.fioItem && F.fioN[p.id] ? `<a class="fp-fio" href="#/p/${p.id}">${ico('fio')} Mostrar o fio · ${F.fioN[p.id] + 1} posts</a>` : '';
    const quote = p.tipo === 'fortalece' && !puro(p) ? citado(p.alvo ? F.orig[p.alvo] : null) : '';
    const n = F.likes[p.id] || 0, r = F.resp[p.id] || 0, f = F.forts[p.id] || 0;
    const nums = opt.big && (n || r || f) ? `<p class="fp-nums">${[r ? `<b>${r}</b> ${r === 1 ? 'resposta' : 'respostas'}` : '', f ? `<b>${f}</b> ${f === 1 ? 'fortaleceu' : 'fortaleceram'}` : '', n ? `<b>${n}</b> ${n === 1 ? 'curtida' : 'curtidas'}` : ''].filter(Boolean).join(' · ')}</p>` : '';
    return `<article class="fp${opt.big ? ' big' : ''}${opt.fioItem ? ' fio-it' : ''}" id="fi-${row}" data-row="${row}" data-post="${p.id}">
      ${rt}
      <div class="fp-row">
        <a href="#/@${esc(a.handle || '')}" class="fp-av">${C.avatar(a, 's')}</a>
        <div class="fp-body">
          <header class="fp-h"><a class="fp-nm" href="#/@${esc(a.handle || '')}"><b>${esc(a.nome || '')}</b></a><span class="fp-meta">@${esc(a.handle || '')}${opt.big ? '' : ` · <a href="#/p/${p.id}">${C.rel(p.created_at)}</a>`}</span>${tipo}${gSelo}
            <button type="button" class="cbtn plain fp-menu" data-act="fd-menu" data-id="${p.id}" aria-label="Mais opções do post${mine ? ' (fixar, apagar)' : ''}">${ico('dots')}</button></header>
          ${p.texto ? `<p class="fp-t"${opt.big || opt.fioItem ? '' : ` data-abre="${p.id}"`}>${linkify(p.texto)}</p>` : ''}
          ${midia(p)}${enqueteHTML(p)}${quote}${fio}${opt.big ? `<p class="fp-quando">${dataHora(p.created_at)}</p>` : ''}${nums}
          ${acoes(p)}
        </div>
      </div>
    </article>`;
  }
  /* uma linha da timeline: se é um "fortaleceu", mostra o post original com o nome de quem fortaleceu em cima */
  function itemHTML(row){
    if(puro(row)){ const o = F.orig[row.alvo]; return o ? postHTML(o, { rt: row, row: row.id }) : ''; }
    return postHTML(row);
  }
  function pinta(){
    const box = C.$('fd-list'); if(!box) return;
    const vistos = new Set();
    let html = '';
    if((F.perfil || F.grupo) && F.fixoRow){ vistos.add(F.fixoRow.id); html += postHTML(F.fixoRow, { fixo: F.grupo ? 'grupo' : true }); }
    html += F.rows.map(r => { const id = puro(r) ? r.alvo : r.id; if(vistos.has(id)) return ''; vistos.add(id); return itemHTML(r); }).join('');
    box.innerHTML = html || `<div class="empty">${F.modo === 'salvos' ? 'Nada salvo ainda. Toca no marcador de um post pra guardar ele aqui.' : F.grupo ? (dentroG(F.grupo) ? 'Ninguém postou no grupo ainda. Puxa o primeiro assunto.' : 'Ninguém postou no grupo ainda.') : F.perfil ? 'Nenhum post ainda.' : F.tag ? `Ninguém postou #${esc(F.tag)} ainda. Começa você.` : F.tab === 'seguindo' ? 'Ninguém que você segue postou ainda. Segue a galera em "Quem seguir".' : 'O feed tá esperando o primeiro post. Bora?'}</div>`;
    box.classList.toggle('vazio', !html);
    const m = C.$('fd-mais'); if(m) m.hidden = F.fim || !F.rows.length;
    observa();
  }
  /* redesenha todos os lugares onde esse post aparece (timeline, fortalecidos, a conversa) */
  function repinta(id){
    document.querySelectorAll(`.fp[data-post="${id}"]`).forEach(el => {
      const big = el.classList.contains('big'), row = F.by[el.dataset.row];
      if(!row) return;
      el.outerHTML = big ? postHTML(row, { big: true }) : el.classList.contains('fio-it') ? postHTML(row, { fioItem: true }) : F.fixoRow && F.fixoRow.id === el.dataset.row ? postHTML(row, { fixo: F.grupo ? 'grupo' : true }) : itemHTML(row);
    });
    observa();
  }

  /* ---------- visualizações: o post que ficou meio segundo na tela conta (uma vez por pessoa; o teu não conta) ---------- */
  const VI = { obs: null, fila: new Set(), foram: new Set(), t: 0, tempo: new Map() };
  function observa(){
    if(!C.uid() || typeof IntersectionObserver === 'undefined') return;
    if(!VI.obs) VI.obs = new IntersectionObserver(es => es.forEach(e => {
      const id = e.target.dataset.post; if(!id) return;
      if(e.isIntersecting && e.intersectionRatio >= .5){ if(!VI.tempo.has(e.target)) VI.tempo.set(e.target, setTimeout(() => { VI.tempo.delete(e.target); viu(id); }, 600)); }
      else { clearTimeout(VI.tempo.get(e.target)); VI.tempo.delete(e.target); }
    }), { threshold: [0, .5] });
    document.querySelectorAll('.fp[data-post]').forEach(el => { if(!el.dataset.obs){ el.dataset.obs = '1'; VI.obs.observe(el); } });
  }
  function viu(id){
    const p = F.by[id]; if(!p || !C.uid() || p.dono === C.uid() || VI.foram.has(id)) return;
    VI.foram.add(id); VI.fila.add(id); clearTimeout(VI.t); VI.t = setTimeout(mandaVistas, 1200);
  }
  async function mandaVistas(){
    const ids = [...VI.fila]; VI.fila.clear(); if(!ids.length) return;
    let n = 0; try{ n = await C.api.rpc('corre_feed_viu', { p_ids: ids }); }catch(e){ return; }
    if(!n) return;
    ids.forEach(id => { const p = F.by[id]; if(!p) return; p.vistas = (Number(p.vistas) || 0) + 1;
      document.querySelectorAll(`.fp[data-post="${id}"] .fp-b.vis`).forEach(el => { const v = p.vistas; el.title = plural(v, 'visualização', 'visualizações'); el.setAttribute('aria-label', el.title); el.querySelector('span').textContent = nfmt(v); }); });
  }

  /* ---------- em alta ---------- */
  async function emAlta(){
    if(F.alta && Date.now() - F.altaAt < 120e3) return F.alta;
    try{ F.alta = (await C.api.rpc('corre_em_alta', { dias: 7 })) || []; }catch(e){ F.alta = []; }
    F.altaAt = Date.now(); return F.alta;
  }
  function altaHTML(){
    let ls = (F.alta || []).slice(0, 8);
    if(F.tag && !ls.some(x => x.tag === F.tag)) ls = [{ tag: F.tag, gente: 0 }].concat(ls);
    if(!ls.length) return `<section class="fd-alta vazio" aria-label="Em alta no corre"><span class="fd-alta-t">${ico('fogo')} Em alta no corre</span><p>Ninguém puxou assunto essa semana. Põe uma #hashtag no teu post e ela aparece aqui.</p></section>`;
    return `<section class="fd-alta" aria-label="Em alta no corre"><span class="fd-alta-t">${ico('fogo')} Em alta no corre</span>
      <div class="fd-alta-l">${ls.map(x => `<button type="button" class="fd-alta-i" data-act="fd-tag" data-t="${esc(x.tag)}" aria-pressed="${F.tag === x.tag}"><b>#${esc(x.tag)}</b>${x.gente ? `<small>${plural(x.gente, 'pessoa', 'pessoas')}</small>` : ''}</button>`).join('')}</div></section>`;
  }
  function topoHTML(){
    if(F.tag) return `<div class="fd-filtro"><span><b>#${esc(F.tag)}</b> no corre</span><button type="button" class="btn sm ghost" data-act="fd-tag" data-t="">${ico('x')} Voltar pro feed</button></div>`;
    return `<div class="fd-tabs" role="tablist" aria-label="Feed"><button type="button" role="tab" data-act="fd-tab" data-t="pravoce" aria-selected="${F.tab === 'pravoce'}">Pra você</button><button type="button" role="tab" data-act="fd-tab" data-t="seguindo" aria-selected="${F.tab === 'seguindo'}">Seguindo</button></div>`;
  }
  function composer(g){
    const me = C.st.me; if(!me) return '';
    /* v3.55: composer novo, sem foto: a foto escolhida e largada em outro composer (grupo, Início) não vai junto no próximo post */
    F.foto = null;
    return `<section class="card fc-box${g ? ' fc-grupo' : ''}" aria-label="${g ? 'Novo post no grupo' : 'Novo post'}">
      <div class="fc-row">${C.avatar(me, 's')}<div class="fc-col">
        <textarea class="inp fc-t" id="fd-t" rows="2" maxlength="${MAX}" data-conta="fd-conta" placeholder="${g ? `Escreve pro grupo, ${esc(C.firstName(me.nome))}…` : `O que tá rolando no teu corre, ${esc(C.firstName(me.nome))}?`}" aria-label="${g ? 'Texto do post no grupo' : 'Texto do post'}"></textarea>
        <div id="fd-prev"></div>
        <div id="fd-enq" class="fc-enq" hidden></div>
        <ol id="fd-fio" class="fc-fio" aria-label="Continuação do fio"></ol>
      </div></div>
      <div class="fc-bar">
        <label class="fc-ic up-lbl" title="Foto">${ico('camera')}<span class="sr-only">Foto</span><input type="file" accept="image/*" data-chg="fd-foto" aria-label="Pôr foto no post"></label>
        <button type="button" class="fc-ic" data-act="fd-enq" aria-pressed="false" title="Enquete">${ico('enquete')}<span class="sr-only">Enquete</span></button>
        <button type="button" class="fc-ic" data-act="fd-fio-mais" title="Continuar em fio">${ico('fio')}<span class="sr-only">Continuar em fio</span></button>
        <span class="fc-sp"></span>
        <span class="fc-conta" id="fd-conta" aria-live="polite"></span>
        <span class="hint" id="fd-st"></span>
        <button type="button" class="btn pri sm" data-act="fd-pub">Publicar</button>
      </div>
    </section>`;
  }
  /* o anel que enche conforme escreve (até 500 letras); nos últimos 50 aparece quanto falta */
  function conta(t){
    const el = t && t.dataset.conta && C.$(t.dataset.conta); if(!el) return;
    const n = (t.value || '').length, resta = MAX - n, pct = Math.min(1, n / MAX), r = 9, c = 2 * Math.PI * r;
    el.innerHTML = n ? `<svg viewBox="0 0 24 24" class="fc-anel${resta <= 20 ? ' quase' : ''}" aria-hidden="true"><circle cx="12" cy="12" r="${r}" class="fundo"/><circle cx="12" cy="12" r="${r}" class="cheio" stroke-dasharray="${(pct * c).toFixed(1)} ${c.toFixed(1)}"/></svg>${resta <= 50 ? `<b class="num">${resta}</b>` : ''}` : '';
    el.setAttribute('aria-label', n ? `${resta} ${resta === 1 ? 'letra sobrando' : 'letras sobrando'}` : '');
  }
  document.addEventListener('input', e => { const t = e.target; if(t && t.matches && t.matches('textarea[data-conta]')) conta(t); });
  const enqOp = i => `<input class="inp" data-enq-op maxlength="40" placeholder="Opção ${i + 1}" aria-label="Opção ${i + 1} da enquete">`;
  const enqForm = () => `<div class="fc-enq-ops">${enqOp(0)}${enqOp(1)}</div>
    <div class="fc-enq-pe"><button type="button" class="btn sm ghost" data-act="fd-enq-op">${ico('plus')} Opção</button>
      <label class="fc-enq-d">Dura <select class="inp" id="fd-enq-d" aria-label="Quanto tempo a enquete fica aberta"><option value="1">1 dia</option><option value="3">3 dias</option><option value="7">7 dias</option></select></label>
      <button type="button" class="lnk" data-act="fd-enq">Tirar enquete</button></div>`;
  function limpaComposer(){
    const t = C.$('fd-t'); if(t){ t.value = ''; conta(t); }
    F.foto = null; const pv = C.$('fd-prev'); if(pv) pv.innerHTML = '';
    const e = C.$('fd-enq'); if(e){ e.hidden = true; e.innerHTML = ''; }
    document.querySelectorAll('.fc-bar [data-act="fd-enq"]').forEach(b => b.setAttribute('aria-pressed', 'false'));
    const f = C.$('fd-fio'); if(f) f.innerHTML = '';
  }
  /* v3.55: lista recarregando (troca de aba, filtro): o "Carregar mais" some até a lista nova chegar (antes misturava as duas abas) */
  const escondeMais = () => { const m = C.$('fd-mais'); if(m) m.hidden = true; };
  async function recarrega(){
    const t = C.$('fd-topo'); if(t) t.innerHTML = topoHTML();
    const a = C.$('fd-alta'); if(a && F.alta) a.innerHTML = altaHTML();
    const b = C.$('fd-list'); if(b) b.innerHTML = '<div class="empty">Carregando…</div>'; escondeMais();
    try{ await carregar(false); pinta(); }catch(e){ if(b) b.innerHTML = `<div class="empty">${esc(C.errMsg(e, 'Não deu pra abrir o feed agora.'))}</div>`; }
  }
  /* o que eu acabei de postar/fortalecer aparece na lista que tá aberta? */
  const mostraMeus = row => (row ? (row.grupo || null) === (F.grupo ? F.grupo.id : null) : true) && (F.modo ? false : F.grupo ? true : F.perfil ? F.perfil === C.uid() : !F.tag);

  async function pub(){
    const t = C.$('fd-t'), st = C.$('fd-st'), texto = (t.value || '').trim();
    /* v3.55: o grupo é o de quando tocou em Publicar (trocar de página durante o upload jogava o post do grupo fechado no feed aberto) */
    const gid = F.grupo ? F.grupo.id : null;
    const extras = [...document.querySelectorAll('#fd-fio textarea')].map(x => x.value.trim()).filter(Boolean);
    const box = C.$('fd-enq'); let enquete = null;
    if(box && !box.hidden){
      const ops = [...box.querySelectorAll('[data-enq-op]')].map(i => i.value.trim()).filter(Boolean);
      if(!texto){ C.toast('Escreve a pergunta da enquete.'); t.focus(); return; }
      if(ops.length < 2){ C.toast('A enquete precisa de pelo menos 2 opções.'); (box.querySelector('[data-enq-op]:placeholder-shown') || box.querySelector('[data-enq-op]')).focus(); return; }
      if(new Set(ops.map(x => C.norm(x))).size !== ops.length){ C.toast('Tem opção repetida na enquete.'); return; }
      const dias = Number((C.$('fd-enq-d') || {}).value) || 1;
      enquete = { ops, fim: new Date(Date.now() + dias * 864e5).toISOString() };
    }
    if(!texto && !F.foto){ C.toast('Escreve alguma coisa ou põe uma foto.'); t.focus(); return; }
    if(texto.length > MAX || extras.some(x => x.length > MAX)){ C.toast(`Cada post vai até ${MAX} letras. O resto vira fio.`); return; }
    if(F.busy) return; F.busy = true; st.textContent = 'Publicando…';
    try{
      let midia_url = '';
      if(F.foto){ const b = await C.shrink(F.foto, 1600, .86); midia_url = await C.api.upload(b); }
      const raiz = await C.feed.publicar(Object.assign({ texto, midia_url, tipo: 'post' }, enquete ? { enquete } : {}, gid ? { grupo: gid } : {}));
      /* o fio: cada pedaço é um post teu, pendurado no primeiro */
      let foram = 0;
      for(const x of extras){ try{ const r = await C.api.ins('corre_feed', { texto: x, fio: raiz.id }); if(r && r[0]){ guarda([Object.assign(r[0], { perfil: C.st.me })]); if(C.push && MARCA.test(x)) C.push.avisa('post', r[0].id); } foram++; }catch(e){ C.toast(erroPost(e)); break; } }
      if(foram){ F.fioN[raiz.id] = foram; repinta(raiz.id); }
      limpaComposer(); st.textContent = '';
      C.toast(foram ? `Fio no ar: ${foram + 1} posts.` : 'Tá no feed.');
      if(/#[\p{L}\p{N}_]{2,}/u.test([texto].concat(extras).join(' '))){ F.altaAt = 0; emAlta().then(() => { const a = C.$('fd-alta'); if(a) a.innerHTML = altaHTML(); }); }
    }catch(e){ st.textContent = ''; C.toast(erroPost(e)); }
    finally{ F.busy = false; }
  }

  /* ---------- fortalecer e citar ---------- */
  async function fortalecer(id, desfaz){
    const uid = C.uid();
    try{
      if(desfaz){
        await C.api.del('corre_feed', { dono: uid, alvo: id, tipo: 'fortalece', texto: '', midia_url: '' });
        F.meusF.delete(id); F.forts[id] = Math.max(0, (F.forts[id] || 1) - 1);
        F.rows = F.rows.filter(r => !(puro(r) && r.dono === uid && r.alvo === id));
        C.toast('Desfeito.');
      }else{
        const r = await C.api.ins('corre_feed', { tipo: 'fortalece', alvo: id });
        const row = Object.assign(r[0], { perfil: C.st.me }); F.by[row.id] = row;
        if(C.push) C.push.avisa('post', row.id);
        if(!F.orig[row.alvo]) F.orig[row.alvo] = F.by[row.alvo] || null;
        F.meusF.add(row.alvo); F.forts[row.alvo] = (F.forts[row.alvo] || 0) + 1;
        if(mostraMeus(row)) F.rows.unshift(row);
        C.toast('Fortaleceu. Tá no feed de quem te segue.', 3000);
      }
      C.closeSheet(); pinta(); repinta(id);
    }catch(e){
      const h = (e && (e.hint || e.message)) || '';
      C.toast(e && e.code === '23505' ? 'Você já fortaleceu esse.' : /post/.test(h) ? 'Esse post não tá mais disponível.' : C.errMsg(e));
    }
  }
  function citar(id){
    const o = F.by[id]; if(!o || !C.st.me) return;
    C.sheet(`<form class="form fd-cit" id="fd-cit" novalidate><div class="sheet-head"><h2>Citar</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <div class="fc-row">${C.avatar(C.st.me, 's')}<textarea class="inp" id="fd-ct" rows="3" maxlength="2200" placeholder="O que você tem a dizer sobre isso?" aria-label="Teu comentário" autofocus></textarea></div>
      ${citado(o, true)}
      <div class="acts"><button type="submit" class="btn pri">${ico('raio')} Publicar</button></div></form>`);
    C.$('fd-cit').addEventListener('submit', async e => {
      e.preventDefault();
      const texto = C.$('fd-ct').value.trim(); if(!texto){ C.toast('Escreve teu comentário. Pra só repassar, usa "Fortalecer".'); C.$('fd-ct').focus(); return; }
      const b = e.submitter || C.$('fd-cit').querySelector('[type=submit]'); b.disabled = true;
      try{
        const r = await C.api.ins('corre_feed', { alvo: id, texto });
        const row = Object.assign(r[0], { perfil: C.st.me }); F.by[row.id] = row; F.orig[row.alvo] = F.orig[row.alvo] || o;
        if(C.push) C.push.avisa('post', row.id);
        F.likes[row.id] = 0; F.resp[row.id] = 0; F.forts[row.id] = 0;
        F.forts[row.alvo] = (F.forts[row.alvo] || 0) + 1;
        if(mostraMeus(row)) F.rows.unshift(row);
        C.closeSheet(); pinta(); repinta(id); C.toast('Citou. Tá no feed.');
      }catch(err){ b.disabled = false; C.toast(/post/.test((err && (err.hint || err.message)) || '') ? 'Esse post não tá mais disponível.' : C.errMsg(err)); }
    });
  }

  /* ---------- a conversa (#/p/ID): o post e as respostas em fio ---------- */
  const respForm = pai => `<form class="rs-f${pai ? ' mini' : ''}" data-pai="${pai || ''}">${C.avatar(C.st.me, 's')}<textarea class="inp"${pai ? '' : ' id="rs-t"'} rows="2" maxlength="500" placeholder="${pai ? 'Tua resposta…' : `Responde @${esc((CV.post.perfil || {}).handle || '')}…`}" aria-label="Tua resposta"></textarea><button type="submit" class="btn pri sm">Responder</button></form>`;
  function fioHTML(){
    const cs = CV.coms, uid = C.uid();
    if(!cs.length) return `<p class="rs-vazio">Ninguém respondeu ainda. Puxa a conversa.</p>`;
    const ids = new Set(cs.map(c => c.id)), filhos = {};
    cs.forEach(c => { const k = c.pai && ids.has(c.pai) ? c.pai : ''; (filhos[k] = filhos[k] || []).push(c); });
    const quem = id => { const c = cs.find(x => x.id === id); return c && c.perfil ? c.perfil.handle : ''; };
    const li = (c, nivel, raso) => {
      const a = c.perfil || {}, ks = filhos[c.id] || [], pode = !!uid && (c.dono === uid || CV.post.dono === uid || CV.mod);
      const sub = ks.length ? `<ol class="fio sub${nivel >= 4 ? ' raso' : ''}">${ks.map(k => li(k, nivel + 1, nivel >= 4)).join('')}</ol>` : '';
      return `<li class="rs${ks.length ? ' tem' : ''}" id="rs-${c.id}">
        <div class="rs-row"><a class="rs-av" href="#/@${esc(a.handle || '')}">${C.avatar(a, 's')}</a>
          <div class="rs-body">
            <header class="fp-h"><a class="fp-nm" href="#/@${esc(a.handle || '')}"><b>${esc(a.nome || '')}</b></a><span class="fp-meta">@${esc(a.handle || '')} · ${C.rel(c.created_at)}</span></header>
            ${raso && c.pai ? `<p class="rs-pai">respondendo @${esc(quem(c.pai))}</p>` : ''}
            <p class="rs-t">${linkify(c.texto)}</p>
            <div class="rs-a">${uid && C.st.me && (!CV.post.grupo || dentroG(CV.g)) ? `<button type="button" class="rs-b" data-act="rs-resp" data-id="${c.id}">${ico('chat')} Responder</button>` : ''}${pode ? `<button type="button" class="rs-b x" data-act="rs-del" data-id="${c.id}" aria-label="Apagar resposta">${ico('trash')}</button>` : ''}</div>
            <div class="rs-slot" id="rss-${c.id}"></div>
          </div></div>${sub}</li>`;
    };
    return `<ol class="fio">${(filhos[''] || []).map(c => li(c, 1, false)).join('')}</ol>`;
  }
  const pintaFio = () => { const el = C.$('rs-lista'); if(el) el.innerHTML = fioHTML(); };
  C.views.post = async function(app, id){
    id = String(id || '').replace(/[^0-9a-zA-Z-]/g, '').slice(0, 40);
    app.innerHTML = C.header('inicio') + `<main class="wrap conversa"><section class="card"><p>Abrindo a conversa…</p></section></main>`;
    const rota = C.rota;
    let p = null; try{ p = await C.api.one('corre_feed', { join: 'perfil', eq: { id } }); }catch(e){ p = null; }
    if(rota !== C.rota) return;
    if(p && puro(p) && p.alvo){ location.replace(`#/p/${p.alvo}`); return; }
    if(p && p.fio){ location.replace(`#/p/${p.fio}`); return; }
    if(!p){ app.innerHTML = C.header('inicio') + `<main class="wrap conversa"><section class="card"><h2 class="ch">Esse post não tá mais aqui.</h2><p class="note">Pode ter sido apagado, ou o perfil tá mocado.</p><div class="acts"><a class="btn pri" href="#/">Ir pro feed</a></div></section></main>`; return; }
    guarda([p]); await originais([p]);
    /* post de grupo: o grupo, e o meu papel nele (pra responder e moderar) */
    CV.g = null; CV.mod = false;
    if(p.grupo){
      try{
        const gr = await C.api.one('corre_grupos', { select: 'id,slug,nome,fechado,cor', eq: { id: p.grupo } });
        if(gr){ F.gInfo[gr.id] = gr; CV.g = (await C.api.rpc('corre_grupo_ver', { p_slug: gr.slug })) || gr; CV.mod = modG(CV.g); }
      }catch(e){}
    }
    let fio = []; try{ fio = await C.api.q('corre_feed', { join: 'perfil', eq: { fio: p.id }, order: ['fio_n', true], limit: 20 }); }catch(e){ fio = []; }
    guarda(fio); await contagens([p.id].concat(fio.map(x => x.id)));
    let cs = []; try{ cs = await C.api.q('corre_comentarios', { join: 'perfil', eq: { post_id: p.id }, order: ['created_at', true], limit: 500 }); }catch(e){}
    if(rota !== C.rota) return;
    CV.post = p; CV.coms = cs; CV.fio = fio; F.resp[p.id] = cs.length;
    const a = p.perfil || {};
    document.title = `${a.nome || 'Post'} no Corre${p.texto ? `: “${String(p.texto).slice(0, 60)}”` : ''}`;
    const gV = CV.g;
    app.innerHTML = C.header(gV ? 'grupos' : 'inicio') + `<main class="wrap conversa">
      ${gV ? `<a class="fd-volta" href="#/g/${esc(gV.slug)}">${ico('prev')} ${esc(gV.nome)}</a>` : `<a class="fd-volta" href="#/">${ico('prev')} Feed</a>`}
      <section class="tl-box">
        ${postHTML(p, { big: true })}
        ${fio.length ? `<ol class="fio-posts" aria-label="O fio de ${esc(a.nome || '')}">${fio.map(x => `<li>${postHTML(x, { fioItem: true })}</li>`).join('')}</ol>` : ''}
        ${p.grupo && C.uid() && C.st.me && !dentroG(gV) ? `<div class="rs-entrar"><p>Só quem é do grupo responde aqui.</p>${gV && gV.slug ? `<a class="btn pri" href="#/g/${esc(gV.slug)}">${ico('gente')} Ver o grupo</a>` : ''}</div>` : C.uid() && C.st.me ? respForm(null) : `<div class="rs-entrar"><p>Entra no Corre pra responder ${esc(C.firstName(a.nome))}.</p>${C.insta && C.insta.dentroDeApp() ? C.insta.botaoEntrar() : '<button type="button" class="btn-google" data-act="google"><span>Entrar com Google</span></button>'}</div>`}
        <div id="rs-lista">${fioHTML()}</div>
      </section>
    </main>`;
    if(!C.uid()){ try{ localStorage.setItem('corre-volta', location.hash); }catch(e){} }
    if(F.focoResp){ F.focoResp = false; const t = C.$('rs-t'); if(t) t.focus(); }
    observa();
  };
  /* responder (o post ou uma resposta) */
  document.addEventListener('submit', async e => {
    const f = e.target.closest && e.target.closest('.rs-f'); if(!f || !CV.post) return;
    e.preventDefault();
    const ta = f.querySelector('textarea'), texto = ta.value.trim(), pai = f.dataset.pai || null;
    if(!texto){ ta.focus(); return; }
    const b = f.querySelector('button[type=submit]'); b.disabled = true;
    try{
      const r = await C.api.ins('corre_comentarios', Object.assign({ post_id: CV.post.id, texto }, pai ? { pai } : {}));
      const c = Object.assign(r[0], { perfil: C.st.me }); CV.coms.push(c);
      if(C.push) C.push.avisa('resp', c.id);
      F.resp[CV.post.id] = CV.coms.length; ta.value = '';
      pintaFio(); repinta(CV.post.id);
      const el = C.$('rs-' + c.id); if(el){ el.classList.add('novo'); el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    }catch(err){ C.toast(/resposta/.test((err && (err.hint || err.message)) || '') ? 'Essa resposta foi apagada.' : C.errMsg(err, 'Não deu pra responder agora.')); }
    finally{ b.disabled = false; }
  });
  /* tocar no texto do post abre a conversa */
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('[data-abre]'); if(!t || e.target.closest('a,button')) return;
    if(window.getSelection && String(window.getSelection())) return;
    C.go('#/p/' + t.dataset.abre);
  });

  /* ---------- quem segue / quem a pessoa segue ---------- */
  const L = { id: '', h: '', t: 'seguidores', itens: [], total: 0, vis: 0, meus: null };
  async function listaSeg(id, h, t, mais){
    if(mais && L.carregando) return;
    if(!mais){ Object.assign(L, { id, h, t: t === 'seguindo' ? 'seguindo' : 'seguidores', itens: [], total: 0, vis: 0, meus: null }); }
    const seq = L.seq = (L.seq || 0) + 1; L.carregando = true;
    const aberta = C.$('pl-lista');
    if(!aberta){
      C.sheet(`<div class="form"><div class="sheet-head"><h2>@${esc(L.h)}</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
        <div class="mu-tabs pl-tabs" role="tablist" aria-label="Lista">${[['seguidores', 'Seguidores'], ['seguindo', 'Seguindo']].map(([k, n]) => `<button type="button" role="tab" data-act="pf-l-tab" data-t="${k}" aria-selected="${L.t === k}">${n}</button>`).join('')}</div>
        <div id="pl-lista"><p class="note">Carregando…</p></div></div>`);
    }else{
      document.querySelectorAll('.pl-tabs [data-t]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.t === L.t)));
      if(!mais) aberta.innerHTML = '<p class="note">Carregando…</p>';
    }
    let r = null;
    const antes = mais && L.itens.length ? L.itens[L.itens.length - 1].desde : null;
    try{ r = await C.api.rpc('corre_seguidores_lista', { p: L.id, tipo: L.t, lim: 60, antes }); }catch(e){ r = null; }
    if(seq !== L.seq) return;
    L.carregando = false;
    const box = C.$('pl-lista'); if(!box) return;
    if(!r){ box.innerHTML = '<p class="note">Não deu pra abrir a lista agora.</p>'; return; }
    const novos = r.itens || []; L.itens = L.itens.concat(novos); L.total = Number(r.total) || 0; L.vis = Number(r.visiveis) || 0;
    /* quem eu já sigo, pra mostrar o botão certo */
    const uid = C.uid();
    if(uid && novos.length){ try{ const ids = novos.map(x => x.id).filter(x => x !== uid); const rs = ids.length ? await C.api.q('corre_seguindo', { eq: { quem: uid }, in: { segue: ids } }) : []; L.meus = L.meus || new Set(); rs.forEach(x => L.meus.add(x.segue)); }catch(e){} }
    const cats = (C.mural && C.mural.CATS) || [], cat = k => ((cats.find(x => x[0] === k) || [])[1] || '');
    const linha = f => `<li class="pl-it"><button type="button" class="pl-p" data-act="pf-l-perfil" data-h="${esc(f.handle)}">${C.avatar(f, 's')}<span><b>${esc(f.nome || f.handle)}</b><small>@${esc(f.handle)}${cat(f.categoria) ? ' · ' + esc(cat(f.categoria)) : ''}${f.cidade ? ' · ' + esc(f.cidade) : ''}</small></span></button>
      ${uid && f.id !== uid ? `<button type="button" class="btn sm ${L.meus && L.meus.has(f.id) ? '' : 'pri'}" data-act="pf-l-seguir" data-id="${f.id}" aria-pressed="${!!(L.meus && L.meus.has(f.id))}">${L.meus && L.meus.has(f.id) ? 'Seguindo' : 'Seguir'}</button>` : uid && f.id === uid ? '<span class="tag">você</span>' : ''}</li>`;
    const ocultos = Math.max(0, L.total - L.vis);
    box.innerHTML = (L.itens.length ? `<ul class="pl-ul">${L.itens.map(linha).join('')}</ul>` : `<p class="note">${L.t === 'seguidores' ? 'Ninguém segue ainda.' : 'Não segue ninguém ainda.'}</p>`)
      + (L.itens.length < L.vis ? '<div class="acts"><button type="button" class="btn" data-act="pf-l-mais">Ver mais</button></div>' : '')
      + (ocultos ? `<p class="fine">${L.t === 'seguidores' ? 'Mais' : 'E mais'} ${ocultos} ${ocultos === 1 ? 'perfil mocado' : 'perfis mocados'}: ${ocultos === 1 ? 'conta no número, mas não aparece' : 'contam no número, mas não aparecem'} na lista.</p>` : '');
  }

  Object.assign(C.acts, {
    'fd-tab': async el => { F.tab = el.dataset.t === 'seguindo' ? 'seguindo' : 'pravoce'; F.pv = null; F.pvVazio = false; document.querySelectorAll('[data-act="fd-tab"]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.t === F.tab))); const b = C.$('fd-list'); if(b) b.innerHTML = '<div class="empty">Carregando…</div>'; escondeMais(); try{ await carregar(false); }catch(e){ if(b) b.innerHTML = '<div class="empty">Não deu pra carregar agora. Toca na aba de novo.</div>'; return; } pinta(); },
    'fd-mais': async el => { el.disabled = true; try{ await carregar(true); pinta(); }finally{ el.disabled = false; } },
    /* hashtag: filtra o feed da home (de qualquer lugar, leva pra lá) */
    'fd-tag': async el => {
      const t = String(el.dataset.t || '').toLowerCase();
      if(!C.$('h-feed')){ F.tagNext = t; C.go('#/'); return; }
      F.tag = F.tag === t ? '' : t; window.scrollTo({ top: Math.max(0, C.$('h-feed').getBoundingClientRect().top + scrollY - 80), behavior: 'smooth' });
      await recarrega();
    },
    /* input de arquivo de verdade (no navegador do Instagram, abrir a galeria por código não funciona) */
    'fd-foto': async el => {
      const f = el && el.files ? el.files[0] : await C.pickFile('image/*'); if(el && el.files) el.value = ''; if(!f) return;
      F.foto = f; const u = URL.createObjectURL(f);
      C.$('fd-prev').innerHTML = `<figure class="fd-prev"><img src="${u}" alt="Foto do post"><button type="button" class="cbtn" data-act="fd-sem-foto" aria-label="Tirar foto">${ico('x')}</button></figure>`;
    },
    'fd-sem-foto': () => { F.foto = null; C.$('fd-prev').innerHTML = ''; },
    'fd-pub': pub,
    /* enquete no post */
    'fd-enq': () => {
      const box = C.$('fd-enq'); if(!box) return;
      const liga = box.hidden; box.hidden = !liga; box.innerHTML = liga ? enqForm() : '';
      document.querySelectorAll('.fc-bar [data-act="fd-enq"]').forEach(b => b.setAttribute('aria-pressed', String(liga)));
      if(liga){ box.querySelector('input').focus(); const t = C.$('fd-t'); if(t && !t.value) t.placeholder = 'Faz a pergunta…'; }
    },
    'fd-enq-op': el => {
      const ops = document.querySelector('#fd-enq .fc-enq-ops'); if(!ops) return;
      const n = ops.querySelectorAll('[data-enq-op]').length; if(n >= 4){ C.toast('A enquete tem até 4 opções.'); return; }
      ops.insertAdjacentHTML('beforeend', enqOp(n)); ops.lastElementChild.focus(); if(n + 1 >= 4) el.hidden = true;
    },
    /* fio: mais um post na sequência */
    'fd-fio-mais': () => {
      const ol = C.$('fd-fio'); if(!ol) return;
      const n = ol.children.length; if(n >= 9){ C.toast('Um fio tem até 10 posts.'); return; }
      const k = 'fd-fio-c' + (++F.fioK);
      ol.insertAdjacentHTML('beforeend', `<li class="fc-fio-it"><textarea class="inp" rows="2" maxlength="${MAX}" data-conta="${k}" placeholder="Continua o fio…" aria-label="Post ${n + 2} do fio"></textarea><span class="fc-fio-pe"><span class="fc-conta" id="${k}"></span><button type="button" class="cbtn plain" data-act="fd-fio-tira" aria-label="Tirar esse post do fio">${ico('x')}</button></span></li>`);
      ol.lastElementChild.querySelector('textarea').focus();
    },
    'fd-fio-tira': el => { const li = el.closest('li'); if(li) li.remove(); },
    'fd-votar': async el => {
      if(!C.uid()){ C.toast('Entra no Corre pra votar.'); return; }
      const id = el.dataset.id, op = Number(el.dataset.op), p = F.by[id]; if(!p || !p.enquete || F.votando) return;
      F.votando = true;
      try{ await C.api.ins('corre_votos', { post_id: id, op }); }
      catch(e){ if(!(e && e.code === '23505')) C.toast(Date.parse(p.enquete.fim) <= Date.now() ? 'Essa enquete já encerrou.' : C.errMsg(e)); }
      try{ const r = await C.api.rpc('corre_enquetes', { p_ids: [id] }); if(r && r[id]) F.enq[id] = r[id]; }catch(e){}
      F.votando = false; repinta(id);
    },
    'fd-salvar': async el => {
      if(!C.uid()){ C.toast('Entra no Corre pra salvar.'); return; }
      const id = el.dataset.id, on = F.salvos.has(id);
      /* v3.55: toque duplo não manda salvar e tirar ao mesmo tempo (o banco podia ficar ao contrário da tela) */
      F.pendS = F.pendS || new Set(); if(F.pendS.has(id)) return; F.pendS.add(id);
      if(on) F.salvos.delete(id); else F.salvos.add(id);
      repinta(id);
      try{
        if(on) await C.api.del('corre_salvos', { dono: C.uid(), post_id: id }); else await C.api.ins('corre_salvos', { post_id: id });
        C.toast(on ? 'Tirado dos salvos.' : 'Salvo. Tá em Salvos, no menu da conta.', 2600);
        if(on && F.modo === 'salvos'){ F.rows = F.rows.filter(r => r.id !== id); pinta(); }
      }catch(e){ if(e && e.code === '23505') return; if(on) F.salvos.add(id); else F.salvos.delete(id); repinta(id); C.toast(C.errMsg(e)); }
      finally{ F.pendS.delete(id); }
    },
    'fd-share': el => {
      const id = el.dataset.id, p = F.by[id] || {}, a = p.perfil || {}, url = linkPost(id);
      const txt = `${a.nome ? a.nome + ' no Corre' : 'Olha esse post no Corre'}: ${url}`;
      C.sheet(`<div class="form fd-fsheet"><div class="sheet-head"><h2>${ico('share')} Compartilhar</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
        <div class="fd-fops">${C.insta ? `<button type="button" class="btn pri" data-act="ig-story" data-k="post" data-id="${id}">${ico('ig')} Story do Instagram</button>` : ''}${C.msg && C.uid() && C.st.me ? `<button type="button" class="btn" data-act="msg-mandar" data-k="post" data-id="${id}">${ico('send')} Mandar no Corre</button>` : ''}<button type="button" class="btn${C.insta ? '' : ' pri'}" data-act="fd-link" data-id="${id}">${ico('copy')} Copiar link</button><a class="btn" href="https://wa.me/?text=${encodeURIComponent(txt)}" target="_blank" rel="noopener" data-close>${ico('wa')} Mandar no WhatsApp</a>${navigator.share ? `<button type="button" class="btn" data-act="fd-share-app" data-id="${id}">${ico('send')} Outro app</button>` : ''}</div></div>`);
    },
    'fd-share-app': async el => { try{ await navigator.share({ title: 'Post no Corre', url: linkPost(el.dataset.id) }); }catch(e){} C.closeSheet(); },
    /* o "⋯" do post: fixar no perfil, copiar link e apagar (o teu) */
    'fd-menu': el => {
      const id = el.dataset.id, p = F.by[id]; if(!p) return;
      const uid = C.uid(), mine = !!uid && p.dono === uid, fixo = mine && C.st.me && C.st.me.post_fixo === id, pode = mine && !p.fio && !puro(p) && !p.grupo;
      const g = grupoDe(p), souMod = modG(g), gFixo = !!g && g.fixo === id;
      C.sheet(`<div class="form fd-fsheet"><div class="sheet-head"><h2>Post</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
        <div class="fd-mops">${pode ? `<button type="button" class="btn" data-act="fd-fixar" data-id="${id}" data-on="${fixo}">${ico('tacha')} ${fixo ? 'Tirar do topo do perfil' : 'Fixar no topo do perfil'}</button>` : ''}${souMod && !p.fio && !puro(p) ? `<button type="button" class="btn" data-act="fd-fixar-g" data-id="${id}" data-on="${gFixo}">${ico('tacha')} ${gFixo ? 'Tirar do topo do grupo' : 'Fixar no topo do grupo'}</button>` : ''}<button type="button" class="btn" data-act="fd-link" data-id="${id}">${ico('copy')} Copiar link</button>${mine ? `<button type="button" class="btn ghost" data-act="fd-del" data-id="${id}">${ico('trash')} Apagar post</button>` : souMod ? `<button type="button" class="btn ghost" data-act="fd-tira" data-id="${id}">${ico('trash')} Apagar post (moderação)</button>` : ''}</div></div>`);
    },
    'fd-fixar': async el => {
      const id = el.dataset.id, on = el.dataset.on === 'true';
      try{
        await C.saveMe({ post_fixo: on ? null : id }); C.closeSheet();
        C.toast(on ? 'Saiu do topo do teu perfil.' : 'Fixado no topo do teu perfil.');
        if(F.perfil && F.perfil === C.uid()){ F.fixo = on ? null : id; await carregar(false); pinta(); }
      }catch(e){ C.toast(/fixo/.test((e && (e.hint || e.message)) || '') ? 'Só dá pra fixar um post teu (que não seja pedaço de fio).' : C.errMsg(e)); }
    },
    /* moderação do grupo: fixar no topo do grupo e apagar post dos outros */
    'fd-fixar-g': async el => {
      const id = el.dataset.id, p = F.by[id], g = grupoDe(p), on = el.dataset.on === 'true'; if(!g) return;
      try{
        await C.api.rpc('corre_grupo_fixa', { p_grupo: g.id, p_post: on ? null : id });
        g.fixo = on ? null : id; C.closeSheet(); C.toast(on ? 'Saiu do topo do grupo.' : 'Fixado no topo do grupo.');
        if(F.grupo && F.grupo.id === g.id){ F.fixo = g.fixo; await carregar(false); pinta(); }
      }catch(e){ C.toast(/fixo/.test((e && (e.hint || e.message)) || '') ? 'Só dá pra fixar post do grupo (que não seja pedaço de fio).' : C.errMsg(e)); }
    },
    'fd-tira': async el => {
      if(el.dataset.armed !== '1'){ el.dataset.armed = '1'; el.classList.add('armed'); el.innerHTML = `${ico('trash')} Apagar mesmo? (moderação)`; return; }
      const id = el.dataset.id, g = grupoDe(F.by[id]);
      try{
        await C.api.rpc('corre_grupo_tira_post', { p_post: id }); C.closeSheet();
        F.rows = F.rows.filter(x => x.id !== id && !(puro(x) && x.alvo === id)); if(F.fixoRow && F.fixoRow.id === id){ F.fixoRow = null; F.fixo = null; }
        delete F.by[id]; C.toast('Post apagado do grupo.');
        if(CV.post && CV.post.id === id && /^#\/p\//.test(location.hash)){ CV.post = null; C.go(g ? `#/g/${g.slug}` : '#/'); return; }
        pinta();
      }catch(e){ C.toast(C.errMsg(e)); }
    },
    'fd-like': async el => {
      if(!C.uid()){ C.toast('Entra no Corre pra curtir.'); return; }
      const id = el.dataset.id, on = F.meus.has(id);
      /* toque duplo rápido não manda curtir e descurtir ao mesmo tempo */
      F.pend = F.pend || new Set(); if(F.pend.has(id)) return; F.pend.add(id);
      if(on){ F.meus.delete(id); F.likes[id] = Math.max(0, (F.likes[id] || 1) - 1); } else { F.meus.add(id); F.likes[id] = (F.likes[id] || 0) + 1; }
      repinta(id);
      try{ if(on) await C.api.del('corre_curtidas', { post_id: id, dono: C.uid() }); else { await C.api.ins('corre_curtidas', { post_id: id }); if(C.push) C.push.avisa('curtiu', id); } }
      catch(e){ if(e && e.code === '23505') return; if(on){ F.meus.add(id); F.likes[id]++; } else { F.meus.delete(id); F.likes[id]--; } repinta(id); C.toast(C.errMsg(e)); }
      finally{ F.pend.delete(id); }
    },
    'fd-resp': el => {
      const id = el.dataset.id;
      if(CV.post && CV.post.id === id && C.$('rs-t')){ C.$('rs-t').focus(); return; }
      F.focoResp = !!C.uid(); C.go('#/p/' + id);
    },
    'fd-forte': el => {
      if(!C.uid() || !C.st.me){ C.toast('Entra no Corre pra fortalecer.'); return; }
      const id = el.dataset.id, on = F.meusF.has(id), p0 = F.by[id], gi0 = p0 && p0.grupo ? (grupoDe(p0) || F.gInfo[p0.grupo]) : null;
      if(gi0 && gi0.fechado){ C.toast('Post de grupo fechado fica no grupo: não dá pra fortalecer nem citar lá fora.', 3800); return; }
      C.sheet(`<div class="form fd-fsheet"><div class="sheet-head"><h2>${ico('raio')} Fortalecer</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
        <p class="note">Fortalecer põe esse post no feed de quem te segue, com teu nome em cima. Citar é o mesmo, com um comentário teu.</p>
        <div class="fd-fops"><button type="button" class="btn pri" data-act="fd-forte-ok" data-id="${id}" data-on="${on}">${ico('raio')} ${on ? 'Desfazer o fortalecer' : 'Fortalecer'}</button><button type="button" class="btn" data-act="fd-citar" data-id="${id}">${ico('chat')} Citar</button></div></div>`);
    },
    'fd-forte-ok': el => fortalecer(el.dataset.id, el.dataset.on === 'true'),
    'fd-citar': el => citar(el.dataset.id),
    'fd-link': el => { C.copy(linkPost(el.dataset.id), 'Link do post copiado.'); C.closeSheet(); },
    'fd-del': async el => {
      if(el.dataset.armed !== '1'){ el.dataset.armed = '1'; el.classList.add('armed'); el.innerHTML = `${ico('trash')} Apagar mesmo?`; return; }
      const id = el.dataset.id, p = F.by[id];
      try{
        await C.api.del('corre_feed', { id }); C.closeSheet();
        if(C.st.me && C.st.me.post_fixo === id) C.saveMe({ post_fixo: null }).catch(() => {});
        if(F.fixoRow && F.fixoRow.id === id){ F.fixoRow = null; F.fixo = null; }
        F.rows = F.rows.filter(x => x.id !== id && !(puro(x) && x.alvo === id));
        if(id in F.orig) F.orig[id] = null;
        delete F.by[id];
        if(p && p.midia_url && p.tipo === 'post') C.api.unlink(p.midia_url);
        C.toast('Post apagado.');
        if(CV.post && CV.post.id === id && /^#\/p\//.test(location.hash)){ CV.post = null; C.go('#/'); return; }
        pinta();
      }catch(e){ C.toast(C.errMsg(e)); }
    },
    'rs-resp': el => {
      const slot = C.$('rss-' + el.dataset.id); if(!slot) return;
      if(slot.firstChild){ slot.innerHTML = ''; return; }
      document.querySelectorAll('.rs-slot').forEach(s => { s.innerHTML = ''; });
      slot.innerHTML = respForm(el.dataset.id); const t = slot.querySelector('textarea'); if(t) t.focus();
    },
    'rs-del': async el => {
      if(el.dataset.armed !== '1'){ el.dataset.armed = '1'; el.classList.add('armed'); el.innerHTML = `${ico('trash')} Apagar?`; return; }
      const id = el.dataset.id, c0 = CV.coms.find(c => c.id === id), uid = C.uid();
      try{
        /* moderador do grupo apaga resposta dos outros pela função do banco */
        if(c0 && c0.dono !== uid && CV.post.dono !== uid && CV.mod) await C.api.rpc('corre_grupo_tira_resp', { p_resp: id });
        else await C.api.del('corre_comentarios', { id });
        const fora = new Set([id]); let mudou = true;
        while(mudou){ mudou = false; CV.coms.forEach(c => { if(c.pai && fora.has(c.pai) && !fora.has(c.id)){ fora.add(c.id); mudou = true; } }); }
        CV.coms = CV.coms.filter(c => !fora.has(c.id)); F.resp[CV.post.id] = CV.coms.length;
        pintaFio(); repinta(CV.post.id);
      }catch(e){ C.toast(C.errMsg(e)); }
    },
    /* clicou no número: a lista de quem segue / quem a pessoa segue */
    'pf-lista': el => listaSeg(el.dataset.id, el.dataset.h, el.dataset.t),
    'pf-l-tab': el => listaSeg(L.id, L.h, el.dataset.t),
    'pf-l-mais': () => listaSeg(L.id, L.h, L.t, true),
    'pf-l-perfil': el => { C.closeSheet(); C.go('#/@' + el.dataset.h); },
    'pf-l-seguir': async el => {
      if(!C.uid()){ C.toast('Entra no Corre pra seguir.'); return; }
      const id = el.dataset.id, on = el.getAttribute('aria-pressed') === 'true';
      el.disabled = true;
      try{
        if(on) await C.api.del('corre_seguindo', { quem: C.uid(), segue: id }); else { await C.api.ins('corre_seguindo', { segue: id }); if(C.push) C.push.avisa('seguiu', id); }
        el.setAttribute('aria-pressed', String(!on)); el.textContent = on ? 'Seguir' : 'Seguindo'; el.classList.toggle('pri', on);
        if(L.meus){ if(on) L.meus.delete(id); else L.meus.add(id); }
        if(F.seguindo){ if(on) F.seguindo.delete(id); else F.seguindo.add(id); }
        /* no meu perfil, o "seguindo" acompanha */
        const n = C.$('pf-sigo'); if(n && L.id === C.uid()){ n.textContent = Math.max(0, +n.textContent + (on ? -1 : 1)); }
      }catch(e){ if(!(e && e.code === '23505')) C.toast(C.errMsg(e)); }
      finally{ el.disabled = false; }
    },
    'fd-seguir': async el => {
      if(!C.uid()){ C.toast('Entra no Corre pra seguir.'); return; }
      const id = el.dataset.id, on = el.getAttribute('aria-pressed') === 'true', n = C.$('pf-seg');
      el.disabled = true;
      try{
        if(on) await C.api.del('corre_seguindo', { quem: C.uid(), segue: id }); else { await C.api.ins('corre_seguindo', { segue: id }); if(C.push) C.push.avisa('seguiu', id); }
        el.setAttribute('aria-pressed', String(!on)); el.textContent = on ? 'Seguir' : 'Seguindo'; el.classList.toggle('pri', on);
        if(n){ const v = Math.max(0, +n.textContent + (on ? -1 : 1)); n.textContent = v; const l = C.$('pf-seg-l'); if(l) l.textContent = v === 1 ? 'seguidor' : 'seguidores'; }
        if(F.seguindo){ if(on) F.seguindo.delete(id); else F.seguindo.add(id); }
      }catch(e){ if(!(e && e.code === '23505')) C.toast(C.errMsg(e)); }
      finally{ el.disabled = false; }
    }
  });

  C.feed = {
    /* o feed da home */
    async mount(el){
      F.perfil = null; F.grupo = null; F.modo = ''; F.seguindo = null; F.tag = F.tagNext || ''; F.tagNext = ''; F.pv = null; F.pvVazio = false;
      el.innerHTML = `${composer()}
        <div id="fd-alta">${F.alta ? altaHTML() : ''}</div>
        <div id="fd-topo">${topoHTML()}</div>
        <div id="fd-list" class="fd-list tl"><div class="empty">Carregando o feed…</div></div>
        <div class="acts center"><button type="button" class="btn" id="fd-mais" data-act="fd-mais" hidden>Carregar mais</button></div>`;
      emAlta().then(() => { const a = C.$('fd-alta'); if(a) a.innerHTML = altaHTML(); });
      if(C.focoPost){ C.focoPost = false; const t = C.$('fd-t'); if(t){ t.scrollIntoView({ block: 'center' }); t.focus(); } }
      try{ await carregar(false); pinta(); }catch(e){ const b = C.$('fd-list'); if(b) b.innerHTML = `<div class="empty">${esc(C.errMsg(e, 'Não deu pra abrir o feed agora.'))}</div>`; }
    },
    /* os posts de um perfil (com o que a pessoa fortaleceu) */
    async mountPerfil(el, p){
      F.perfil = p.id; F.grupo = null; F.tag = ''; F.modo = ''; F.fixo = p.post_fixo || null; F.fixoRow = null;
      el.innerHTML = `<div id="fd-list" class="fd-list tl"><div class="empty">Carregando…</div></div><div class="acts center"><button type="button" class="btn" id="fd-mais" data-act="fd-mais" hidden>Carregar mais</button></div>`;
      try{ await carregar(false); pinta(); }catch(e){ const b = C.$('fd-list'); if(b) b.innerHTML = `<div class="empty">${esc(C.errMsg(e))}</div>`; }
    },
    /* o mural de um grupo (v3.36): quem tá dentro posta; o fixado vem primeiro */
    async mountGrupo(el, g){
      F.grupo = g; F.perfil = null; F.tag = ''; F.modo = ''; F.fixo = g.fixo || null; F.fixoRow = null; F.gInfo[g.id] = g;
      el.innerHTML = `${dentroG(g) && C.st.me ? composer(g) : ''}<div id="fd-list" class="fd-list tl"><div class="empty">Carregando…</div></div><div class="acts center"><button type="button" class="btn" id="fd-mais" data-act="fd-mais" hidden>Carregar mais</button></div>`;
      try{ await carregar(false); pinta(); }catch(e){ const b = C.$('fd-list'); if(b) b.innerHTML = `<div class="empty">${esc(C.errMsg(e, 'Não deu pra abrir o grupo agora.'))}</div>`; }
    },
    /* seguir: botão e números do perfil */
    async seguirHTML(p){
      const uid = C.uid();
      /* os números vêm contados no banco (inclui quem tá mocado; a lista de quem é continua só pra quem pode ver) */
      const [n, meu, sigo, posts] = await Promise.all([
        C.api.rpc('corre_seguidores_n', { p: p.id }).catch(() => null),
        uid && uid !== p.id ? C.api.q('corre_seguindo', { eq: { segue: p.id, quem: uid } }).catch(() => []) : [],
        C.api.q('corre_seguindo', { eq: { quem: p.id } }).catch(() => []),
        C.api.q('corre_feed', { select: 'id', eq: { dono: p.id }, limit: 999 }).catch(() => [])
      ]);
      const seg = { length: n && n.seguidores != null ? Number(n.seguidores) : 0 };
      if(!n){ const lista = await C.api.q('corre_seguindo', { eq: { segue: p.id } }).catch(() => []); seg.length = lista.length; }
      if(n && n.seguindo != null) sigo.length = Number(n.seguindo);
      const eu = !!uid && meu.length > 0;
      const btn = uid && uid !== p.id ? `<button type="button" class="btn ${eu ? '' : 'pri'}" data-act="fd-seguir" data-id="${p.id}" aria-pressed="${eu}">${eu ? 'Seguindo' : 'Seguir'}</button>` : '';
      return { btn, nums: `<div class="pf-nums"><span><b class="num">${posts.length}</b> ${posts.length === 1 ? 'post' : 'posts'}</span><button type="button" class="pf-n" data-act="pf-lista" data-id="${p.id}" data-h="${esc(p.handle)}" data-t="seguidores" title="Ver quem segue @${esc(p.handle)}"><b class="num" id="pf-seg">${seg.length}</b> <span id="pf-seg-l">${seg.length === 1 ? 'seguidor' : 'seguidores'}</span></button><button type="button" class="pf-n" data-act="pf-lista" data-id="${p.id}" data-h="${esc(p.handle)}" data-t="seguindo" title="Ver quem @${esc(p.handle)} segue"><b class="num" id="pf-sigo">${sigo.length}</b> seguindo</button></div>` };
    },
    /* publicar algo pronto (frame do Rolo, arte do estúdio) */
    async publicar(row){
      const r = await C.api.ins('corre_feed', row);
      const p = Object.assign(r[0], { perfil: C.st.me }); F.by[p.id] = p;
      /* marcou alguém (ou citou): quem foi marcado fica sabendo no celular */
      if(C.push && (p.alvo || MARCA.test(p.texto || ''))) C.push.avisa('post', p.id);
      F.likes[p.id] = 0; F.resp[p.id] = 0; F.forts[p.id] = 0;
      if(p.enquete) F.enq[p.id] = { n: p.enquete.ops.map(() => 0), total: 0, meu: null };
      if(mostraMeus(p)) F.rows.unshift(p);
      pinta(); return p;
    },
    seguindoIds,
    /* o post e os números dele (pro story do Instagram) */
    info(id){ const p = F.by[id]; if(!p) return null; return { p, orig: p.alvo ? (F.orig[p.alvo] || null) : null, likes: F.likes[id] || 0, resp: F.resp[id] || 0 }; },
    link: id => linkPost(id)
  };

  /* ---------- recomendações (do LinkedIn): quem trampou contigo escreve; só aparece no perfil depois que você aceita ---------- */
  const REL = { cliente: 'Cliente', parceiro: 'Parceiro de corre', colega: 'Colega de trampo' };
  const RC = { el: null, p: null };
  async function recs(el, p){
    if(el){ RC.el = el; RC.p = p; } el = RC.el; p = RC.p; if(!el || !p || !el.isConnected) return;
    const uid = C.uid(), mine = !!uid && uid === p.id;
    let rs = []; try{ rs = await C.api.q('corre_recomendacoes', { eq: { para: p.id }, order: ['created_at', false], limit: 60 }); }catch(e){ rs = []; }
    const ids = [...new Set(rs.map(r => r.dono))]; let au = [];
    if(ids.length){ try{ au = await C.api.q('corre_perfis', { select: 'id,handle,nome,avatar_url,aberto,faz', in: { id: ids } }); }catch(e){ au = []; } }
    if(!el.isConnected) return;
    const A = {}; au.forEach(a => { A[a.id] = a; });
    const ok = rs.filter(r => r.status === 'aceita' && A[r.dono]), pend = mine ? rs.filter(r => r.status === 'pendente') : [], minha = uid && !mine ? rs.find(r => r.dono === uid) : null;
    if(!ok.length && !pend.length && !uid) { el.innerHTML = ''; return; }
    const card = (r, pendente) => { const a = A[r.dono] || { nome: 'Perfil mocado' };
      return `<li class="rec${pendente ? ' pend' : ''}"><a class="rec-h" href="#/@${esc(a.handle || '')}">${C.avatar(a, 's')}<span><b>${esc(a.nome || '')}</b><small>${esc(REL[r.relacao] || '')}${a.faz ? ' · ' + esc(a.faz) : ''}</small></span></a><p>${esc(r.texto)}</p>${pendente ? `<div class="acts"><button type="button" class="btn sm pri" data-act="rec-aceita" data-id="${r.id}">Mostrar no perfil</button><button type="button" class="btn sm ghost" data-act="rec-oculta" data-id="${r.id}">Não mostrar</button></div>` : mine ? `<button type="button" class="lnk rec-x" data-act="rec-oculta" data-id="${r.id}">Tirar do perfil</button>` : ''}</li>`; };
    const btn = uid && !mine && C.st.me ? (minha ? `<span class="tag">${minha.status === 'aceita' ? 'Você recomendou' : minha.status === 'pendente' ? 'Tua recomendação tá esperando' : 'Você recomendou'}</span>` : p.visibilidade === 'mocado' ? '' : `<button type="button" class="btn sm" data-act="rec-nova">${ico('star')} Recomendar</button>`) : '';
    el.innerHTML = `<div class="sec-row"><h2 class="sec-t"><span class="hl">Recomendações</span></h2>${btn}</div>
      ${pend.length ? `<section class="card rec-pend"><h3 class="ch">Esperando você (${pend.length})</h3><ul class="recs">${pend.map(r => card(r, true)).join('')}</ul><p class="fine">Recomendação só aparece no teu perfil depois que você aceita.</p></section>` : ''}
      ${ok.length ? `<ul class="recs">${ok.map(r => card(r, false)).join('')}</ul>` : `<div class="empty">${mine ? 'Pede pra um cliente te recomendar: manda o link do teu perfil e ele toca em "Recomendar".' : `Ninguém recomendou ${esc(C.firstName(p.nome))} ainda.${btn ? ' Trampou com ' + (C.firstName(p.nome) ? esc(C.firstName(p.nome)) : 'essa pessoa') + '? Conta como foi.' : ''}`}</div>`}`;
  }
  Object.assign(C.acts, {
    'rec-nova': () => {
      const p = RC.p; if(!p || !C.st.me) return;
      C.sheet(`<form class="form" id="rec-f" novalidate><div class="sheet-head"><h2>${ico('star')} Recomendar ${esc(C.firstName(p.nome))}</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
        <fieldset class="fld"><legend>Vocês se conhecem de onde?</legend><div class="rec-rel">${Object.entries(REL).map(([k, n], i) => `<label class="chip-r"><input type="radio" name="rel" value="${k}"${i ? '' : ' checked'}><span>${n}</span></label>`).join('')}</div></fieldset>
        <div class="fld"><label for="rec-t">Como foi trampar com ${esc(C.firstName(p.nome))}?</label><textarea class="inp" id="rec-t" rows="4" maxlength="600" placeholder="O que ela fez, como foi o atendimento, se você chamaria de novo…"></textarea><span class="hint">De 20 a 600 letras. Aparece no perfil depois que ${esc(C.firstName(p.nome))} aceitar.</span></div>
        <div class="acts"><button type="submit" class="btn pri">Mandar recomendação</button></div></form>`);
      C.$('rec-f').addEventListener('submit', async e => {
        e.preventDefault();
        const texto = C.$('rec-t').value.trim(), rel = (document.querySelector('#rec-f [name="rel"]:checked') || {}).value || 'cliente';
        if(texto.length < 20){ C.toast('Escreve pelo menos 20 letras.'); C.$('rec-t').focus(); return; }
        const b = e.submitter || C.$('rec-f').querySelector('[type=submit]'); b.disabled = true;
        try{ await C.api.ins('corre_recomendacoes', { para: p.id, relacao: rel, texto }); C.closeSheet(); C.toast(`Mandada. Aparece no perfil de ${C.firstName(p.nome)} quando aceitar.`, 3600); recs(); }
        catch(err){ b.disabled = false; C.toast(err && err.code === '23505' ? 'Você já recomendou essa pessoa.' : C.errMsg(err)); }
      });
    },
    'rec-aceita': async el => { try{ await C.api.upd('corre_recomendacoes', { id: el.dataset.id }, { status: 'aceita' }); C.toast('Tá no teu perfil.'); recs(); if(C.avisos) C.avisos.depois(); }catch(e){ C.toast(C.errMsg(e)); } },
    'rec-oculta': async el => { try{ await C.api.upd('corre_recomendacoes', { id: el.dataset.id }, { status: 'oculta' }); C.toast('Não aparece no teu perfil.'); recs(); if(C.avisos) C.avisos.depois(); }catch(e){ C.toast(C.errMsg(e)); } }
  });
  C.feed.recs = recs;

  /* ---------- Salvos: os posts que você guardou (só você vê) ---------- */
  C.views.salvos = async function(app){
    document.title = 'Salvos · Corre';
    app.innerHTML = C.header('salvos') + `<main class="wrap"><div class="hello"><h1><span class="hl">Salvos</span></h1><p>Os posts que você guardou pra ver depois. Só você vê.</p></div>
      <div class="feed-main solo"><div id="fd-list" class="fd-list tl"><div class="empty">Carregando…</div></div><div class="acts center"><button type="button" class="btn" id="fd-mais" data-act="fd-mais" hidden>Carregar mais</button></div></div></main>`;
    F.perfil = null; F.grupo = null; F.tag = ''; F.modo = 'salvos'; F.sv = null;
    try{ await carregar(false); pinta(); }catch(e){ const b = C.$('fd-list'); if(b) b.innerHTML = `<div class="empty">${esc(C.errMsg(e, 'Não deu pra abrir os salvos agora.'))}</div>`; }
  };
})();
