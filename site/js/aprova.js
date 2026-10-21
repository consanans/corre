/* CORRE · LINK DE APROVAÇÃO (v4.17)
   Quem cuida da marca manda um link pro cliente (WhatsApp ou copiar). O cliente abre sem login, vê os posts do período
   (arte, carrossel, story, reels, legenda e dia), aprova cada um ou pede ajuste dizendo o quê, e toca em "Pronto":
   a resposta aparece no Studio e quem mandou recebe o aviso no celular. As regras moram no banco (delta-v417.sql):
   o código é sorteado lá, o cliente só mexe na aprovação, e mudar a legenda ou a arte volta o post pra ele. */
(function(){
  'use strict';
  const C = window.Corre, { esc, ico } = C;
  const DOW = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const pad = n => String(n).padStart(2, '0');
  const parts = iso => { const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number); return { y, m, d, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay() }; };
  const dm = iso => { if(!iso) return ''; const i = parts(iso); return `${pad(i.d)}/${pad(i.m)}`; };
  const diaLongo = (iso, h) => { const i = parts(iso), w = DOW[i.dow]; return `${w[0].toUpperCase() + w.slice(1)}, ${pad(i.d)}/${pad(i.m)}${h ? ' · ' + h : ''}`; };
  const hojeBR = () => new Date(Date.now() - 3 * 36e5).toISOString().slice(0, 10);
  const maisDias = (iso, n) => new Date(Date.parse(iso + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
  const linkDe = cod => `${location.origin}${location.pathname}#/aprova/${cod}`;
  const NOME_F = { feed: 'Feed', carrossel: 'Carrossel', story: 'Story', reels: 'Reels' };
  const capHTML = t => esc(t).replace(/(^|\s)(#[\p{L}\p{N}_]+)/gu, '$1<span class="h">$2</span>').replace(/\n/g, '<br>');
  const ERRO = { link: 'Esse link não vale mais.', limite: 'Muita gente abrindo daqui agora. Espera um minuto e tenta de novo.', nota: 'Diz o que precisa mudar.', post: 'Esse post saiu do período do link.' };
  const msgDe = (e, fb) => (e && (ERRO[e.hint] || ERRO[e.code] || ERRO[e.message])) || C.errMsg(e, fb);

  /* ---------------- a página do cliente (sem login) ---------------- */
  const A = { cod: '', d: null, nome: '' };
  const nomeK = cod => 'corre-aprov-nome:' + cod;
  /* a mídia do post: o carrossel desliza, o vídeo toca com a capa, o story fica em pé */
  function midia(p){
    const M = (Array.isArray(p.midias) && p.midias.length && p.formato !== 'feed') ? p.midias : [{ u: p.midia, t: 'img' }];
    if(p.formato === 'carrossel') return `<div class="ap-car" tabindex="0" aria-label="Carrossel com ${M.length} slides: desliza pro lado">${M.map((m, i) => m.t === 'video' ? `<video src="${esc(m.u)}" controls playsinline preload="metadata" aria-label="Slide ${i + 1}, vídeo"></video>` : `<img src="${esc(m.u)}" alt="Slide ${i + 1}${i === 0 && p.alt ? ': ' + esc(p.alt) : ''}" loading="lazy" decoding="async">`).join('')}</div><span class="ap-car-n mono">${M.length} slides · desliza</span>`;
    if(M[0].t === 'video') return `<video src="${esc(M[0].u)}"${p.midia ? ` poster="${esc(p.midia)}"` : ''} controls playsinline preload="metadata" aria-label="${esc(p.titulo || 'Vídeo do post')}"></video>`;
    return `<img src="${esc(M[0].u)}" alt="${esc(p.alt || p.titulo || 'Arte do post')}" loading="lazy" decoding="async">`;
  }
  function cartao(p, i){
    const est = p.aprov === 'aprovado' ? `<p class="ap-st ok">${ico('check')} Aprovado${p.quem ? ` por ${esc(p.quem)}` : ''}</p>`
      : p.aprov === 'ajuste' ? `<p class="ap-st aj">${ico('edit')} Pediu ajuste: <span>${esc(p.nota)}</span></p>` : '';
    return `<article class="ap-post f-${esc(p.formato || 'feed')}${p.aprov ? ' a-' + esc(p.aprov) : ''}" id="ap-p-${esc(p.id)}" aria-labelledby="ap-t-${i}">
      <header class="ap-ph"><span class="mono num">${pad(i + 1)}</span><h2 id="ap-t-${i}">${esc(diaLongo(p.data, p.hora))}</h2><span class="ap-fmt">${esc(NOME_F[p.formato] || 'Feed')}</span>${p.publicado ? '<span class="ap-ja">já postado</span>' : ''}</header>
      <figure class="ap-mid">${midia(p)}</figure>
      ${p.titulo && p.formato !== 'story' ? `<h3 class="ap-tt">${esc(p.titulo)}</h3>` : ''}
      ${p.legenda ? `<div class="ap-leg">${capHTML(p.legenda)}</div>` : p.formato === 'story' ? '' : '<p class="note">Sem legenda.</p>'}
      ${est}
      <div class="ap-acts" data-id="${esc(p.id)}">
        ${p.aprov === 'aprovado' ? `<button type="button" class="btn sm ghost" data-ap="limpa">Desfazer</button><button type="button" class="btn sm" data-ap="ajuste">${ico('edit')} Pedir ajuste</button>`
          : p.aprov === 'ajuste' ? `<button type="button" class="btn sm" data-ap="ajuste">${ico('edit')} Mudar o pedido</button><button type="button" class="btn sm pri" data-ap="aprovado">${ico('check')} Aprovar assim mesmo</button>`
          : `<button type="button" class="btn pri" data-ap="aprovado">${ico('check')} Aprovar</button><button type="button" class="btn" data-ap="ajuste">${ico('edit')} Pedir ajuste</button>`}
      </div>
      <form class="ap-aj" hidden><label for="ap-n-${i}">O que precisa mudar?</label><textarea class="inp" id="ap-n-${i}" rows="3" maxlength="600" placeholder="Ex.: troca a foto do segundo slide, o preço é R$ 34,90">${esc(p.aprov === 'ajuste' ? p.nota : '')}</textarea>
        <div class="acts"><button type="submit" class="btn pri">Mandar o ajuste</button><button type="button" class="btn ghost" data-ap="fecha">Cancelar</button></div></form>
    </article>`;
  }
  const conta = () => { const P = (A.d && A.d.posts) || []; return { n: P.length, ok: P.filter(p => p.aprov === 'aprovado').length, aj: P.filter(p => p.aprov === 'ajuste').length }; };
  function placar(){
    const c = conta(), el = C.$('ap-placar'); if(!el) return;
    const falta = c.n - c.ok - c.aj;
    el.innerHTML = `<span class="ap-bar" aria-hidden="true"><i class="ok" style="width:${c.n ? c.ok / c.n * 100 : 0}%"></i><i class="aj" style="width:${c.n ? c.aj / c.n * 100 : 0}%"></i></span>
      <span class="ap-nums"><b class="num">${c.ok}</b> ${c.ok === 1 ? 'aprovado' : 'aprovados'} · <b class="num">${c.aj}</b> com ajuste · <b class="num">${falta}</b> ${falta === 1 ? 'falta' : 'faltam'}</span>
      <button type="button" class="btn pri" id="ap-fim"${c.ok + c.aj ? '' : ' disabled'}>${falta ? 'Pronto, mandar assim' : `Pronto: avisar ${esc(primeiro())}`}</button>`;
  }
  const primeiro = () => String((A.d && A.d.quem && A.d.quem.nome) || 'quem mandou').split(' ')[0];
  async function pinta(app){
    const d = A.d, m = d.marca || {}, q = d.quem || {};
    document.title = `Aprovação · ${m.nome || 'Corre'}`;
    app.innerHTML = `<main class="wrap ap-pub" style="--mc:${esc(/^#[0-9a-f]{6}$/i.test(m.cor || '') ? m.cor : '#FFE800')}">
      <section class="card ap-topo">
        <div class="ap-marca">${m.logo ? `<img src="${esc(m.logo)}" alt="">` : `<span class="ap-ini" aria-hidden="true">${esc(String(m.nome || '?').slice(0, 1).toUpperCase())}</span>`}<div><span class="mono">Aprovação de posts${m.rede ? ' · @' + esc(m.rede) : ''}</span><h1>${esc(m.nome || 'Posts')}</h1><p>De ${dm(d.de)} a ${dm(d.ate)} · ${d.posts.length === 1 ? '1 post' : d.posts.length + ' posts'}</p></div></div>
        <div class="ap-de">${C.avatar({ nome: q.nome, avatar_url: q.avatar }, 's')}<p>${d.msg ? `<b>${esc(q.nome || 'Quem cuida da marca')}:</b> ${esc(d.msg)}` : `<b>${esc(q.nome || 'Quem cuida da marca')}</b> mandou esses posts pra você aprovar.`}</p></div>
        <ol class="ap-como"><li>Olha cada post (o carrossel desliza pro lado).</li><li>Aprova, ou pede ajuste dizendo o que mudar.</li><li>No fim, toca em <b>Pronto</b>: ${esc(primeiro())} recebe o aviso.</li></ol>
        <div class="fld ap-nome"><label for="ap-nome">Teu nome</label><input class="inp" id="ap-nome" maxlength="60" autocomplete="name" value="${esc(A.nome)}" placeholder="Pra saberem quem aprovou"></div>
        ${d.respondido_em ? `<p class="fine">Já respondido em ${dm(String(d.respondido_em).slice(0, 10))}. Dá pra mudar e tocar em Pronto de novo.</p>` : ''}
      </section>
      ${d.posts.length ? d.posts.map(cartao).join('') : `<section class="card"><p><b>Nenhum post nesse período ainda.</b></p><p class="note">Quando ${esc(primeiro())} puser os posts, eles aparecem aqui no mesmo link.</p></section>`}
      ${d.posts.length ? '<div class="ap-placar" id="ap-placar" role="region" aria-label="Respostas"></div>' : ''}
      <p class="fine ap-pe">Feito com o Corre.</p>
    </main>`;
    placar();
  }
  C.views.aprova = async function(app, cod){
    A.cod = String(cod || '').trim().toLowerCase().replace(/[^0-9a-f]/g, '').slice(0, 40);
    try{ A.nome = localStorage.getItem(nomeK(A.cod)) || ''; }catch(e){ A.nome = ''; }
    app.innerHTML = `<main class="wrap ap-pub"><section class="card"><p>Abrindo os posts…</p></section></main>`;
    try{ A.d = await C.api.rpc('corre_aprov_ver', { p_codigo: A.cod }); }
    catch(e){ A.d = null; app.innerHTML = `<main class="wrap ap-pub"><section class="card"><h1>${esc(msgDe(e, 'Não deu pra abrir agora.'))}</h1><p class="note">${e && (e.hint === 'limite' || e.message === 'limite') ? '' : 'O link pode ter vindo cortado ou foi desligado. Pede de novo pra quem te mandou.'}</p></section></main>`; return; }
    if(!A.d){ app.innerHTML = `<main class="wrap ap-pub"><section class="card"><h1>Esse link não vale mais.</h1></section></main>`; return; }
    A.d.posts = A.d.posts || [];
    await pinta(app);
  };
  /* aprovar, pedir ajuste, desfazer e o Pronto (a página do cliente) */
  async function responde(id, v, nota){
    const nome = (C.$('ap-nome') && C.$('ap-nome').value.trim()) || A.nome;
    if(nome !== A.nome){ A.nome = nome; try{ localStorage.setItem(nomeK(A.cod), nome); }catch(e){} }
    await C.api.rpc('corre_aprov_responder', { p_codigo: A.cod, p_post: id, p_aprov: v, p_nota: nota || '', p_quem: nome });
    const p = A.d.posts.find(x => x.id === id); if(!p) return;
    Object.assign(p, { aprov: v, nota: v ? (nota || '') : '', quem: v ? nome : '' });
    const el = C.$('ap-p-' + id), i = A.d.posts.indexOf(p);
    if(el){ el.outerHTML = cartao(p, i); const nv = C.$('ap-p-' + id); const b = nv && nv.querySelector('.ap-acts button'); if(b) b.focus({ preventScroll: true }); }
    placar();
  }
  document.addEventListener('click', async e => {
    if(!document.querySelector('.ap-pub')) return;
    const b = e.target.closest('[data-ap]');
    if(b){
      const card = b.closest('.ap-post'), id = card && card.id.replace(/^ap-p-/, ''), k = b.dataset.ap, f = card && card.querySelector('.ap-aj');
      if(k === 'ajuste'){ f.hidden = false; f.querySelector('textarea').focus(); return; }
      if(k === 'fecha'){ f.hidden = true; return; }
      b.disabled = true;
      try{ await responde(id, k === 'limpa' ? '' : 'aprovado', ''); if(k === 'aprovado') C.toast('Aprovado.', 1800); }
      catch(err){ b.disabled = false; C.toast(msgDe(err, 'Não deu pra salvar agora. Tenta de novo.')); }
      return;
    }
    if(e.target.closest('#ap-fim')){
      const fb = e.target.closest('#ap-fim'); fb.disabled = true;
      const nome = (C.$('ap-nome') && C.$('ap-nome').value.trim()) || A.nome;
      try{
        const r = await C.api.rpc('corre_aprov_fim', { p_codigo: A.cod, p_quem: nome });
        C.avisaPedido();
        A.d.respondido_em = new Date().toISOString();
        const el = C.$('ap-placar');
        if(el) el.innerHTML = `<p class="ap-obg"><b>Valeu${nome ? ', ' + esc(nome.split(' ')[0]) : ''}!</b> ${esc(primeiro())} já sabe: ${r.aprovados} ${r.aprovados === 1 ? 'aprovado' : 'aprovados'}${r.ajustes ? `, ${r.ajustes} com ajuste` : ''}${r.faltam ? `, ${r.faltam} sem resposta` : ''}. Se mudar de ideia, é só voltar nesse link.</p>`;
      }catch(err){ fb.disabled = false; C.toast(msgDe(err, 'Não deu pra avisar agora. Tenta de novo.')); }
    }
  });
  document.addEventListener('submit', async e => {
    const f = e.target.closest('.ap-aj'); if(!f) return;
    e.preventDefault();
    const nota = f.querySelector('textarea').value.trim(), id = f.closest('.ap-post').id.replace(/^ap-p-/, '');
    if(!nota){ C.toast(ERRO.nota); f.querySelector('textarea').focus(); return; }
    const b = f.querySelector('[type=submit]'); b.disabled = true;
    try{ await responde(id, 'ajuste', nota); C.toast('Ajuste mandado.', 1800); }
    catch(err){ b.disabled = false; C.toast(msgDe(err, 'Não deu pra mandar agora. Tenta de novo.')); }
  });

  /* ---------------- no Studio: criar, mandar e acompanhar os links ---------------- */
  const S = { marca: null, links: [], posts: [] };
  const marcasDo = () => (C.studio && C.studio.marcas && C.studio.marcas()) || [];
  async function carrega(mk){
    const [ls, ps] = await Promise.all([
      C.api.q('corre_aprovacoes', { eq: { dono: C.uid(), marca_id: mk.id }, order: ['created_at', false], limit: 30 }),
      C.api.q('corre_posts', { eq: { dono: C.uid(), marca_id: mk.id }, order: ['data', true], limit: 500 })
    ]);
    S.links = ls || []; S.posts = (ps || []).filter(p => p.data && p.midia_url);
  }
  const doLink = l => S.posts.filter(p => p.data >= l.de && p.data <= l.ate);
  function linhaLink(l){
    const P = doLink(l), ok = P.filter(p => p.aprov === 'aprovado').length, aj = P.filter(p => p.aprov === 'ajuste').length;
    const st = !l.ativo ? 'Desligado' : l.respondido_em ? `${esc(l.quem || 'O cliente')} respondeu em ${dm(String(l.respondido_em).slice(0, 10))}` : l.aberto_em ? `Aberto em ${dm(String(l.aberto_em).slice(0, 10))}, sem resposta ainda` : 'Ainda não abriram';
    return `<li class="ap-li${l.ativo ? '' : ' off'}" data-id="${esc(l.id)}">
      <div class="ap-li-h"><b class="num">${dm(l.de)} a ${dm(l.ate)}</b><span class="mono">${P.length === 1 ? '1 post' : P.length + ' posts'}</span></div>
      <p class="ap-li-st">${st}${P.length ? ` · <span class="ok">${ok} ${ok === 1 ? 'aprovado' : 'aprovados'}</span>${aj ? ` · <span class="aj">${aj} com ajuste</span>` : ''}` : ''}</p>
      ${l.msg ? `<p class="note">${esc(l.msg)}</p>` : ''}
      <div class="acts">${l.ativo ? `<button type="button" class="btn sm pri" data-act="ap-wa" data-id="${esc(l.id)}">${ico('send')} WhatsApp</button><button type="button" class="btn sm" data-act="ap-copia" data-id="${esc(l.id)}">${ico('copy')} Copiar link</button><a class="btn sm ghost" href="${esc(linkDe(l.codigo))}" target="_blank" rel="noopener">${ico('ext')} Ver como o cliente</a>` : ''}<button type="button" class="btn sm ghost" data-act="ap-liga" data-id="${esc(l.id)}">${l.ativo ? 'Desligar' : 'Ligar de novo'}</button></div>
    </li>`;
  }
  function folha(){
    const mk = S.marca, h = hojeBR(), fimMes = (() => { const [y, m] = h.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); })();
    const de0 = h, ate0 = maisDias(h, 30) > fimMes ? maisDias(h, 30) : fimMes;
    C.sheet(`<div class="form ap-folha"><div class="sheet-head"><h2>${C.marcaLogo ? C.marcaLogo(mk, 's') : ''}<span>Aprovação · ${esc(mk.marca)}</span></h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p class="note">O cliente abre sem login, vê os posts do período (arte, carrossel, story, reels e legenda), aprova ou pede ajuste em cada um e toca em Pronto. A resposta aparece aqui e no calendário, e você recebe o aviso no celular.</p>
      <form id="ap-novo" class="ap-novo">
        <div class="row2"><div class="fld"><label for="ap-de">De</label><input class="inp" id="ap-de" type="date" value="${de0}" required></div><div class="fld"><label for="ap-ate">Até</label><input class="inp" id="ap-ate" type="date" value="${ate0}" required></div></div>
        <div class="fld"><label for="ap-msg">Recado pro cliente <small>(opcional)</small></label><textarea class="inp" id="ap-msg" rows="2" maxlength="600" placeholder="Oi! Segue a pauta de novembro pra você aprovar."></textarea></div>
        <div class="acts"><button type="submit" class="btn pri">${ico('link')} Criar o link</button><span class="hint" id="ap-conta" aria-live="polite"></span></div>
      </form>
      <h3 class="hz-sub">Links dessa marca</h3>
      <ul class="ap-lista" id="ap-lista">${S.links.length ? S.links.map(linhaLink).join('') : '<li class="note">Nenhum link ainda.</li>'}</ul>
    </div>`, 'wide');
    const conta = () => { const de = C.$('ap-de').value, ate = C.$('ap-ate').value, n = S.posts.filter(p => p.data >= de && p.data <= ate).length; C.$('ap-conta').textContent = de && ate ? (n === 1 ? '1 post com arte nesse período' : `${n} posts com arte nesse período`) : ''; };
    ['ap-de', 'ap-ate'].forEach(id => C.$(id).addEventListener('input', conta)); conta();
    C.$('ap-novo').addEventListener('submit', async e => {
      e.preventDefault();
      const de = C.$('ap-de').value, ate = C.$('ap-ate').value;
      if(!de || !ate || ate < de){ C.toast('O "até" vem depois do "de".'); return; }
      if((Date.parse(ate) - Date.parse(de)) / 864e5 > 92){ C.toast('Um link vale até 3 meses de posts.'); return; }
      const b = e.target.querySelector('[type=submit]'); b.disabled = true;
      try{
        const r = await C.api.ins('corre_aprovacoes', { marca_id: mk.id, de, ate, msg: C.$('ap-msg').value.trim().slice(0, 600) });
        await carrega(mk); folha();
        const l = (r && r[0]) || S.links[0];
        if(l){ C.copy(linkDe(l.codigo), 'Link criado e copiado. Manda pro cliente.'); const bt = document.querySelector(`[data-act="ap-wa"][data-id="${l.id}"]`); if(bt) bt.focus(); }
      }catch(err){ b.disabled = false; C.toast(/aprovacoes|relation|schema cache|does not exist/i.test(String(err && err.message)) ? 'O link de aprovação ainda não foi ligado no banco (falta o delta-v417.sql).' : C.errMsg(err, 'Não deu pra criar agora.'), 5200); }
    });
  }
  async function abre(mk){
    S.marca = mk;
    try{ await carrega(mk); }
    catch(e){ C.toast(/aprovacoes|relation|schema cache|does not exist/i.test(String(e && e.message)) ? 'O link de aprovação ainda não foi ligado no banco (falta o delta-v417.sql).' : C.errMsg(e, 'Não deu pra abrir agora.'), 5200); return; }
    folha();
  }
  const msgWa = l => { const mk = S.marca, P = doLink(l).length; return `Oi! Separei ${P === 1 ? 'o post' : `os ${P} posts`} da ${mk.marca} de ${dm(l.de)} a ${dm(l.ate)} pra você aprovar. É só abrir, aprovar ou pedir ajuste em cada um e tocar em Pronto:\n${linkDe(l.codigo)}`; };
  Object.assign(C.acts, {
    'ap-link': el => {
      const id = el && el.dataset && el.dataset.marca, todas = marcasDo().concat(C.estudio && C.estudio.marca && C.estudio.marca() ? [C.estudio.marca()] : []);
      const mk = (id && todas.find(x => x.id === id)) || (C.studio && C.studio.marcaAtual && C.studio.marcaAtual());
      if(mk) return abre(mk);
      const L = marcasDo(); if(!L.length){ C.toast('Põe uma marca no Studio primeiro.'); return; }
      C.sheet(`<div class="form"><div class="sheet-head"><h2>Aprovação de qual marca?</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
        <div class="sd-qual">${L.map(x => `<button type="button" class="st-mk" data-act="ap-link" data-marca="${x.id}">${C.marcaLogo(x, 's')}<span><b>${esc(x.marca)}</b><small>@${esc(x.rede || '')}</small></span></button>`).join('')}</div></div>`);
    },
    'ap-copia': el => { const l = S.links.find(x => x.id === el.dataset.id); if(l) C.copy(linkDe(l.codigo), 'Link copiado.'); },
    'ap-wa': el => { const l = S.links.find(x => x.id === el.dataset.id); if(l) window.open(`https://wa.me/?text=${encodeURIComponent(msgWa(l))}`, '_blank', 'noopener'); },
    'ap-liga': async el => {
      const l = S.links.find(x => x.id === el.dataset.id); if(!l) return;
      el.disabled = true;
      try{ await C.api.upd('corre_aprovacoes', { id: l.id }, { ativo: !l.ativo }); await carrega(S.marca); const box = C.$('ap-lista'); if(box) box.innerHTML = S.links.map(linhaLink).join(''); C.toast(l.ativo ? 'Desligado: o link não abre mais.' : 'Ligado de novo.'); }
      catch(e){ el.disabled = false; C.toast(C.errMsg(e, 'Não deu pra mudar agora.')); }
    }
  });
  C.aprova = { abre, linkDe };
})();
