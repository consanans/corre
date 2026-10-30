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
  const ERRO = { link: 'Esse link não vale mais.', limite: 'Muita gente abrindo daqui agora. Espera um minuto e tenta de novo.', nota: 'Diz o que precisa mudar.', post: 'Esse post saiu do período do link.' };
  const msgDe = (e, fb) => (e && (ERRO[e.hint] || ERRO[e.code] || ERRO[e.message])) || C.errMsg(e, fb);

  /* ---------------- a página do cliente (sem login) ---------------- */
  const A = { cod: '', d: null, nome: '' };
  const nomeK = cod => 'corre-aprov-nome:' + cod;
  /* v5.09 · a mesma prévia do Instagram que o Studio Cria mostra (igprevia.js), e o ajuste com o que mudar marcado:
     tocando na prévia (a foto, o slide, a legenda, a capa) ou na lista embaixo, e o recado se quiser */
  const marcaIg = () => { const m = (A.d && A.d.marca) || {}; return { nome: m.nome, rede: m.rede, logo: m.logo, cor: m.cor }; };
  function cartao(p, i){
    const its = Array.isArray(p.itens) ? p.itens : [], IP = C.igPrevia;
    const est = p.aprov === 'aprovado' ? `<p class="ap-st ok">${ico('check')} Aprovado${p.quem ? ` por ${esc(p.quem)}` : ''}</p>`
      : p.aprov === 'ajuste' ? `<p class="ap-st aj">${ico('edit')} Atenção: pediu pra mudar${its.length ? ' ' + esc(IP.itensTxt(its)) : ''}${p.nota ? `: <span>${esc(p.nota)}</span>` : ''}</p>` : '';
    const ch = IP.itensDe(p).map(([k, n]) => `<label class="ap-it"><input type="checkbox" name="ap-it" value="${esc(k)}"${p.aprov === 'ajuste' && its.includes(k) ? ' checked' : ''}><span>${esc(n)}</span></label>`).join('');
    return `<article class="ap-post f-${esc(p.formato || 'feed')}${p.aprov ? ' a-' + esc(p.aprov) : ''}" id="ap-p-${esc(p.id)}" aria-labelledby="ap-t-${i}">
      <header class="ap-ph"><span class="mono num">${pad(i + 1)}</span><h2 id="ap-t-${i}">${esc(diaLongo(p.data, p.hora))}</h2><span class="ap-fmt">${esc(NOME_F[p.formato] || 'Feed')}</span>${p.publicado ? '<span class="ap-ja">já postado</span>' : ''}</header>
      <div class="ap-ig">${IP.html(p, marcaIg())}</div>
      ${est}
      <div class="ap-acts" data-id="${esc(p.id)}">
        ${p.aprov === 'aprovado' ? `<button type="button" class="btn sm ghost" data-ap="limpa">Desfazer</button><button type="button" class="btn sm" data-ap="ajuste">${ico('edit')} Pedir ajuste</button>`
          : p.aprov === 'ajuste' ? `<button type="button" class="btn sm" data-ap="ajuste">${ico('edit')} Mudar o pedido</button><button type="button" class="btn sm pri" data-ap="aprovado">${ico('check')} Aprovar assim mesmo</button>`
          : `<button type="button" class="btn pri" data-ap="aprovado">${ico('check')} Aprovar</button><button type="button" class="btn" data-ap="ajuste">${ico('edit')} Pedir ajuste</button>`}
      </div>
      <form class="ap-aj" hidden><p class="ap-aj-k"><b>O que precisa mudar?</b> Toca na prévia ou marca aqui:</p>
        <div class="ap-its" role="group" aria-label="O que precisa mudar">${ch}</div>
        <label for="ap-n-${i}">Conta como quer <small>(se já marcou acima, é opcional)</small></label><textarea class="inp" id="ap-n-${i}" rows="3" maxlength="600" placeholder="Ex.: troca a foto do segundo slide, o preço é R$ 34,90">${esc(p.aprov === 'ajuste' ? p.nota : '')}</textarea>
        <div class="acts"><button type="submit" class="btn pri">Mandar o ajuste</button><button type="button" class="btn ghost" data-ap="fecha">Cancelar</button></div></form>
    </article>`;
  }
  /* marcou na lista, acende na prévia (e o contrário) */
  function sincroniza(card){
    const on = new Set([...card.querySelectorAll('input[name="ap-it"]:checked')].map(x => x.value));
    card.querySelectorAll('.igp [data-mudar]').forEach(el => { const k = el.dataset.mudar, v = on.has(k); el.classList.toggle('on', v); el.setAttribute('aria-pressed', String(v)); });
  }
  function modoEscolhe(card, liga){
    const ig = card.querySelector('.igp'); if(!ig) return;
    ig.classList.toggle('igp-escolhe', liga);
    ig.querySelectorAll('[data-mudar]').forEach(el => { if(liga){ el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0'); el.setAttribute('aria-label', 'Mudar ' + C.igPrevia.nomeItem(el.dataset.mudar)); } else { el.removeAttribute('role'); el.removeAttribute('tabindex'); el.removeAttribute('aria-label'); el.removeAttribute('aria-pressed'); el.classList.remove('on'); } });
    if(liga){ ig.querySelectorAll('video').forEach(v => v.pause()); sincroniza(card); }
  }
  function alterna(el){
    const card = el.closest('.ap-post'), k = el.dataset.mudar; if(!card || !k) return;
    const cx = [...card.querySelectorAll('input[name="ap-it"]')].find(x => x.value === k); if(!cx) return;
    cx.checked = !cx.checked; sincroniza(card);
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
        <ol class="ap-como"><li>Olha cada post do jeito que vai ficar no Instagram (o carrossel desliza pro lado).</li><li>Aprova, ou toca em Pedir ajuste e marca o que mudar.</li><li>No fim, toca em <b>Pronto</b>: ${esc(primeiro())} recebe o aviso.</li></ol>
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
  /* v5.09: o ajuste vai pelo corre_aprov_ajuste (com os itens marcados); num banco sem ele (sem o delta-v509), pelo
     responder de antes, com o que foi marcado escrito no recado */
  const semFuncao = e => !!e && (e.code === 'PGRST202' || /could not find the function|corre_aprov_ajuste/i.test(String(e.message || '')));
  async function responde(id, v, nota, itens){
    const nome = (C.$('ap-nome') && C.$('ap-nome').value.trim()) || A.nome;
    if(nome !== A.nome){ A.nome = nome; try{ localStorage.setItem(nomeK(A.cod), nome); }catch(e){} }
    let its = v === 'ajuste' ? (itens || []) : [];
    if(v === 'ajuste'){
      try{ await C.api.rpc('corre_aprov_ajuste', { p_codigo: A.cod, p_post: id, p_itens: its, p_nota: nota || '', p_quem: nome }); }
      catch(e){
        if(!semFuncao(e)) throw e;
        const txt = its.length ? `Mudar ${C.igPrevia.itensTxt(its)}.${nota ? ' ' + nota : ''}` : nota;
        await C.api.rpc('corre_aprov_responder', { p_codigo: A.cod, p_post: id, p_aprov: v, p_nota: txt.slice(0, 600), p_quem: nome });
        nota = txt; its = [];
      }
    }
    else await C.api.rpc('corre_aprov_responder', { p_codigo: A.cod, p_post: id, p_aprov: v, p_nota: nota || '', p_quem: nome });
    const p = A.d.posts.find(x => x.id === id); if(!p) return;
    Object.assign(p, { aprov: v, nota: v ? (nota || '') : '', itens: its, quem: v ? nome : '' });
    const el = C.$('ap-p-' + id), i = A.d.posts.indexOf(p);
    if(el){ el.outerHTML = cartao(p, i); const nv = C.$('ap-p-' + id); const b = nv && nv.querySelector('.ap-acts button'); if(b) b.focus({ preventScroll: true }); }
    placar();
  }
  document.addEventListener('click', async e => {
    if(!document.querySelector('.ap-pub')) return;
    /* v5.09: no modo de pedir ajuste, tocar num pedaço da prévia marca ele */
    const alvo = e.target.closest('.igp-escolhe [data-mudar]');
    if(alvo){ e.preventDefault(); alterna(alvo); return; }
    const b = e.target.closest('[data-ap]');
    if(b){
      const card = b.closest('.ap-post'), id = card && card.id.replace(/^ap-p-/, ''), k = b.dataset.ap, f = card && card.querySelector('.ap-aj');
      if(k === 'ajuste'){ f.hidden = false; modoEscolhe(card, true); const pr = f.querySelector('input[name="ap-it"]'); (pr || f.querySelector('textarea')).focus(); return; }
      if(k === 'fecha'){ f.hidden = true; modoEscolhe(card, false); return; }
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
  document.addEventListener('keydown', e => {
    if(e.key !== 'Enter' && e.key !== ' ') return;
    const alvo = e.target.closest && e.target.closest('.igp-escolhe [data-mudar]'); if(!alvo) return;
    e.preventDefault(); alterna(alvo);
  });
  document.addEventListener('change', e => { if(e.target && e.target.name === 'ap-it'){ const card = e.target.closest('.ap-post'); if(card) sincroniza(card); } });
  document.addEventListener('submit', async e => {
    const f = e.target.closest('.ap-aj'); if(!f) return;
    e.preventDefault();
    const nota = f.querySelector('textarea').value.trim(), id = f.closest('.ap-post').id.replace(/^ap-p-/, '');
    const itens = [...f.querySelectorAll('input[name="ap-it"]:checked')].map(x => x.value);
    if(!nota && !itens.length){ C.toast('Marca o que precisa mudar, ou escreve o quê.'); (f.querySelector('input[name="ap-it"]') || f.querySelector('textarea')).focus(); return; }
    const b = f.querySelector('[type=submit]'); b.disabled = true;
    try{ await responde(id, 'ajuste', nota, itens); C.toast('Ajuste mandado.', 1800); }
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
    S.links = (ls || []).filter(l => !l.sala); S.posts = (ps || []).filter(p => p.data && p.midia_url);
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
      <div class="sl-convite"><div><b>${ico('casa')} Sala do Cliente</b><p>Um link fixo da ${esc(mk.marca)} que o cliente guarda: aprova os posts, manda material, conta as datas e vê o que foi entregue.</p></div><button type="button" class="btn pri" data-act="sala-abre" data-marca="${esc(mk.id)}">Abrir a sala</button></div>
      <h3 class="hz-sub">Ou um link só de um período</h3>
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
      const L = marcasDo(); if(!L.length){ C.toast('Põe uma marca no Studio Cria primeiro.'); return; }
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

  /* ================= v5.12 · A SALA DO CLIENTE =================
     Um link FIXO por marca (corre_aprovacoes com sala = true, delta-v512.sql), que a social media manda uma vez e o
     cliente guarda. Na mesma página ele aprova o que vem aí (o mesmo cartão, o mesmo ajuste e o mesmo Pronto do link de
     período), manda o material sem conta (vai pra pasta privada corre-sala), conta as datas e os pedidos (viram tarefa no
     Caderninho de quem cuida), vê o que saiu no mês com a conta da aprovação e abre a cobrança que ela escolheu. */
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const diaBR = ts => { try{ return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ts)); }catch(e){ return String(ts).slice(0, 10); } };
  const quandoTs = ts => { if(!ts) return ''; const d = diaBR(ts), h = hojeBR(); return d === h ? 'hoje' : d === maisDias(h, -1) ? 'ontem' : dm(d); };
  const tamTxt = b => b >= 1048576 ? `${(b / 1048576).toFixed(b >= 10485760 ? 0 : 1).replace('.', ',')} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
  const linkSala = cod => `${location.origin}${location.pathname}#/sala/${cod}`;
  const MAXB = 150 * 1048576;
  /* o tipo (o celular às vezes não diz o do HEIC e do MOV: vai pela extensão) e a extensão que o banco aceita */
  const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/heic': 'heic', 'image/heif': 'heif', 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'application/pdf': 'pdf' };
  const POR_EXT = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', heic: 'image/heic', heif: 'image/heif', mp4: 'video/mp4', mov: 'video/quicktime', pdf: 'application/pdf' };
  const tipoDe = f => EXT[f.type] ? f.type : POR_EXT[String(f.name || '').split('.').pop().toLowerCase()] || '';
  const slug = n => String(n || '').replace(/\.[^.]*$/, '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'arquivo';
  const sorteia = n => Array.from({ length: n }, () => '0123456789abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 36)]).join('');
  const icoTipo = t => /^video/.test(t) ? 'film' : /pdf/.test(t) ? 'recibo' : 'img';
  const ERRO_SL = { tipo: 'Só foto, vídeo (MP4 ou MOV) ou PDF.', tam: 'Esse arquivo passou de 150 MB.', cheio: 'Muita coisa mandada hoje. Amanhã libera de novo.', dia: 'Escolhe um dia de hoje em diante.', texto: 'Escreve um pouquinho mais.', arquivo: 'O arquivo não chegou inteiro. Tenta de novo.', caminho: 'O arquivo não chegou inteiro. Tenta de novo.' };
  const msgSl = (e, fb) => (e && (ERRO_SL[e.hint] || ERRO_SL[e.message])) || msgDe(e, fb);
  const ST_V = { orcamento: 'Orçamento', fechado: 'A receber', pago: 'Pago' };
  const digitos = s => { let d = String(s || '').replace(/\D/g, ''); if(d.length > 11 && d.startsWith('55')) d = d.slice(2); return d; };

  const nomeAgora = () => { const nome = (C.$('ap-nome') && C.$('ap-nome').value.trim()) || A.nome; if(nome !== A.nome){ A.nome = nome; try{ localStorage.setItem(nomeK(A.cod), nome); }catch(e){} } return nome; };
  function matsHTML(){
    const L = A.d.materiais || [];
    if(!L.length) return '<li class="note">Nada ainda. O que você mandar aparece aqui.</li>';
    return L.map(x => `<li class="sl-mi">${ico(icoTipo(x.tipo))}<span><b>${esc(x.nome || 'arquivo')}</b><small>${esc(quandoTs(x.em))} · ${tamTxt(+x.tam || 0)}${x.msg ? ' · ' + esc(x.msg) : ''}</small></span>${x.usado ? '<em class="sl-tag">virou post</em>' : ''}</li>`).join('');
  }
  function pedsHTML(){
    const L = A.d.pedidos || [];
    if(!L.length) return '<li class="note">Nenhum ainda.</li>';
    return L.map(x => `<li class="sl-pi"><span class="mono">${x.tipo === 'data' ? 'Data · ' + dm(x.dia) : 'Pedido'}</span><p>${esc(x.texto)}</p><small>${esc(quandoTs(x.em))}${x.feito ? ' · <b>feito</b>' : ' · anotado'}</small></li>`).join('');
  }
  function antTxt(n){
    if(n == null) return '';
    const v = Math.abs(+n), t = String(Math.round(v * 10) / 10).replace('.', ',');
    return +n >= 0 ? `aprovou em média <b class="num">${t}</b> ${v === 1 ? 'dia' : 'dias'} antes de ir pro ar` : `aprovou em média <b class="num">${t}</b> ${v === 1 ? 'dia' : 'dias'} depois da data`;
  }
  function salaHTML(){
    const d = A.d, m = d.marca || {}, q = d.quem || {}, P = d.posts, E = d.entregue || [], V = d.vendas || [], K = d.conta || {};
    const mes = MESES[(+String(d.mes || hojeBR()).slice(5, 7) || 1) - 1], falta = P.filter(p => !p.aprov).length, h = hojeBR();
    const wa = digitos(q.whats).length >= 10 ? `https://wa.me/55${digitos(q.whats)}?text=${encodeURIComponent(`Oi, ${primeiro()}! Sobre a ${m.nome || 'marca'}…`)}` : '';
    const nav = [['sl-aprova', 'Aprovar', falta], ['sl-mat', 'Material'], ['sl-ped', 'Datas e pedidos'], ['sl-ent', 'Entregue'], V.length ? ['sl-cob', 'Cobrança'] : null].filter(Boolean);
    return `<main class="wrap ap-pub sl-pub" style="--mc:${esc(/^#[0-9a-f]{6}$/i.test(m.cor || '') ? m.cor : '#FFE800')}">
      <section class="card ap-topo">
        <div class="ap-marca">${m.logo ? `<img src="${esc(m.logo)}" alt="">` : `<span class="ap-ini" aria-hidden="true">${esc(String(m.nome || '?').slice(0, 1).toUpperCase())}</span>`}<div><span class="mono">Sala do cliente${m.rede ? ' · @' + esc(m.rede) : ''}</span><h1>${esc(m.nome || 'Sala')}</h1><p>Guarda esse link: é aqui que a gente se acerta.</p></div></div>
        <div class="ap-de">${C.avatar({ nome: q.nome, avatar_url: q.avatar }, 's')}<p>${d.msg ? `<b>${esc(q.nome || 'Quem cuida da marca')}:</b> ${esc(d.msg)}` : `<b>${esc(q.nome || 'Quem cuida da marca')}</b> cuida da ${esc(m.nome || 'marca')}. Aqui você aprova os posts, manda material e conta o que vem por aí.`}</p></div>
        ${wa ? `<a class="btn sl-wa" href="${esc(wa)}" target="_blank" rel="noopener">${ico('wa')} Falar com ${esc(primeiro())} no WhatsApp</a>` : ''}
        <div class="fld ap-nome"><label for="ap-nome">Teu nome</label><input class="inp" id="ap-nome" maxlength="60" autocomplete="name" value="${esc(A.nome)}" placeholder="Pra saberem quem mandou"></div>
        <nav class="sl-nav" aria-label="Na sala">${nav.map(([id, t, n]) => `<button type="button" class="sl-vai" data-sl-vai="${id}">${esc(t)}${n ? ` <span class="sl-n">${n}</span>` : ''}</button>`).join('')}</nav>
      </section>

      <section class="sl-sec" id="sl-aprova" aria-labelledby="sl-aprova-h">
        <div class="card sl-cab"><h2 id="sl-aprova-h">${ico('check')} Pra aprovar</h2>
        ${P.length ? `<p class="note">${falta ? `${falta === 1 ? 'Falta 1 post' : `Faltam ${falta} posts`} pra você olhar.` : 'Tudo olhado por aqui.'} Aprova ou pede ajuste em cada um e toca em <b>Pronto</b> no fim.</p></div>` + P.map(cartao).join('') + '<div class="ap-placar" id="ap-placar" role="region" aria-label="Respostas"></div>'
          : `<p><b>Nada esperando você agora.</b></p><p class="note">Quando ${esc(primeiro())} puser os próximos posts, eles aparecem aqui, no mesmo link.</p></div>`}
      </section>

      <section class="card sl-sec" id="sl-mat" aria-labelledby="sl-mat-h">
        <h2 id="sl-mat-h">${ico('up')} Manda o material</h2>
        <p class="note">Foto, vídeo ou PDF, até 150 MB cada. Vai direto pra ${esc(primeiro())}, num lugar que só ela vê.</p>
        <div class="fld"><label for="sl-mat-msg">O que é? <small>(opcional)</small></label><input class="inp" id="sl-mat-msg" maxlength="300" placeholder="Ex.: as fotos do prato novo"></div>
        <input type="file" id="sl-arq" multiple accept="image/*,video/mp4,video/quicktime,.mov,.heic,application/pdf" hidden>
        <button type="button" class="btn pri" data-sl="arq">${ico('up')} Escolher os arquivos</button>
        <ul class="sl-sobe" id="sl-sobe" aria-live="polite"></ul>
        <h3 class="sl-h3">O que você já mandou</h3>
        <ul class="sl-lista" id="sl-mats">${matsHTML()}</ul>
      </section>

      <section class="card sl-sec" id="sl-ped" aria-labelledby="sl-ped-h">
        <h2 id="sl-ped-h">${ico('cal')} Datas e pedidos</h2>
        <p class="note">Tem promoção, aniversário, evento ou quer pedir alguma coisa? Conta aqui: ${esc(primeiro())} recebe e já entra na agenda dela.</p>
        <form id="sl-ped-f" class="sl-ped-f">
          <fieldset class="sl-tipo"><legend>É o quê?</legend><label><input type="radio" name="sl-t" value="data" checked><span>Uma data importante</span></label><label><input type="radio" name="sl-t" value="pedido"><span>Um pedido</span></label></fieldset>
          <div class="fld" id="sl-dia-w"><label for="sl-dia">Que dia?</label><input class="inp" type="date" id="sl-dia" min="${h}" max="${maisDias(h, 400)}"></div>
          <div class="fld"><label for="sl-tx">Conta como é</label><textarea class="inp" id="sl-tx" rows="3" maxlength="500" placeholder="Ex.: aniversário de 10 anos, com promoção de chopp"></textarea></div>
          <div class="acts"><button type="submit" class="btn pri">${ico('send')} Mandar</button></div>
        </form>
        <ul class="sl-lista" id="sl-peds">${pedsHTML()}</ul>
      </section>

      <section class="card sl-sec" id="sl-ent" aria-labelledby="sl-ent-h">
        <h2 id="sl-ent-h">${ico('star')} O que saiu em ${esc(mes)}</h2>
        <div class="sl-nums"><span><b class="num">${E.length}</b> ${E.length === 1 ? 'post no ar' : 'posts no ar'}</span><span><b class="num">${+K.aprovados || 0}</b> ${+K.aprovados === 1 ? 'aprovado' : 'aprovados'} por você</span><span><b class="num">${+K.ajustes || 0}</b> com ajuste</span></div>
        ${K.antecedencia != null ? `<p class="note">Você ${antTxt(K.antecedencia)}.</p>` : ''}
        ${E.length ? `<ul class="sl-grade">${E.map(p => `<li><img src="${esc(p.midia)}" alt="${esc(p.titulo || 'Post')}" loading="lazy"><span>${dm(p.data)} · ${esc(NOME_F[p.formato] || 'Feed')}</span>${p.link ? `<a href="${esc(p.link)}" target="_blank" rel="noopener">Ver no Instagram</a>` : ''}</li>`).join('')}</ul>` : `<p class="note">Nada saiu ainda em ${esc(mes)}.</p>`}
      </section>

      ${V.length ? `<section class="card sl-sec" id="sl-cob" aria-labelledby="sl-cob-h">
        <h2 id="sl-cob-h">${ico('recibo')} Cobrança</h2>
        <ul class="sl-lista">${V.map(v => `<li class="sl-cob"><span><span class="mono">${esc(ST_V[v.st] || '')}${v.recorrente ? ' · por mês' : ''}</span><b>${esc(v.resumo || 'Serviço')}</b><small>${v.st === 'pago' ? `Pago${v.pago_em ? ' em ' + dm(v.pago_em) : ''}` : v.vence ? `${v.vence < h ? 'Venceu' : 'Vence'} em ${dm(v.vence)}` : v.validade ? `Vale até ${dm(v.validade)}` : ''}</small></span><b class="num sl-vl">${C.money(v.total)}</b><a class="btn sm${v.st === 'pago' ? ' ghost' : ' pri'}" href="#/o/${esc(v.codigo)}">${v.st === 'orcamento' ? 'Ver e aprovar' : v.st === 'pago' ? 'Ver' : 'Ver e pagar'}</a></li>`).join('')}</ul>
      </section>` : ''}
      <p class="fine ap-pe">Feito com o Corre.</p>
    </main>`;
  }
  C.views.sala = async function(app, cod){
    A.cod = String(cod || '').trim().toLowerCase().replace(/[^0-9a-f]/g, '').slice(0, 40);
    try{ A.nome = localStorage.getItem(nomeK(A.cod)) || ''; }catch(e){ A.nome = ''; }
    app.innerHTML = `<main class="wrap ap-pub"><section class="card"><p>Abrindo a sala…</p></section></main>`;
    try{ A.d = await C.api.rpc('corre_sala_ver', { p_codigo: A.cod }); }
    catch(e){ A.d = null; app.innerHTML = `<main class="wrap ap-pub"><section class="card"><h1>${esc(msgDe(e, 'Não deu pra abrir agora.'))}</h1><p class="note">${e && (e.hint === 'limite' || e.message === 'limite') ? '' : 'O link pode ter vindo cortado ou foi trocado. Pede o novo pra quem cuida da marca.'}</p></section></main>`; return; }
    if(!A.d){ app.innerHTML = `<main class="wrap ap-pub"><section class="card"><h1>Esse link não vale mais.</h1></section></main>`; return; }
    ['posts', 'entregue', 'materiais', 'pedidos', 'vendas'].forEach(k => { A.d[k] = A.d[k] || []; });
    document.title = `Sala · ${(A.d.marca && A.d.marca.nome) || 'Corre'}`;
    app.innerHTML = salaHTML();
    if(A.d.posts.length) placar();
  };
  async function mandaArquivos(files){
    const msg = (C.$('sl-mat-msg') && C.$('sl-mat-msg').value.trim()) || '', nome = nomeAgora(), box = C.$('sl-sobe'); let ok = 0;
    for(const f of files){
      const tipo = tipoDe(f);
      const li = document.createElement('li'); li.innerHTML = `<span>${esc(f.name || 'arquivo')}</span><b class="num">…</b>`; box.appendChild(li);
      const fim = (cl, t) => { li.classList.add(cl); li.querySelector('b').textContent = t; };
      if(!tipo){ fim('erro', 'Não vai: ' + ERRO_SL.tipo); continue; }
      if(f.size > MAXB){ fim('erro', 'Não vai: passou de 150 MB'); continue; }
      const cam = `${A.cod}/${sorteia(10)}-${slug(f.name)}.${EXT[tipo]}`;
      try{
        await C.api.sala.sobe(cam, f, v => { li.querySelector('b').textContent = Math.round(v * 100) + '%'; });
        await C.api.rpc('corre_sala_material_poe', { p_codigo: A.cod, p_caminho: cam, p_nome: String(f.name || '').slice(0, 120), p_tipo: tipo, p_tam: f.size, p_quem: nome, p_msg: msg });
        fim('ok', 'Chegou'); ok++;
        A.d.materiais.unshift({ nome: f.name, tipo, tam: f.size, quem: nome, msg, em: new Date().toISOString(), usado: false });
      }catch(e){ fim('erro', msgSl(e, 'Não foi. Tenta de novo.')); }
    }
    if(ok){ C.avisaPedido(); const l = C.$('sl-mats'); if(l) l.innerHTML = matsHTML(); if(C.$('sl-mat-msg')) C.$('sl-mat-msg').value = ''; C.toast(ok === 1 ? `Chegou. ${primeiro()} já foi avisada.` : `Chegaram os ${ok}. ${primeiro()} já foi avisada.`, 3200); }
  }
  document.addEventListener('click', e => {
    if(!document.querySelector('.sl-pub')) return;
    const v = e.target.closest('[data-sl-vai]');
    if(v){ const el = C.$(v.dataset.slVai); if(el){ el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); const h = el.querySelector('h2'); if(h){ h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } } return; }
    if(e.target.closest('[data-sl="arq"]')){ const i = C.$('sl-arq'); if(i) i.click(); }
  });
  document.addEventListener('change', e => {
    if(!e.target || !document.querySelector('.sl-pub')) return;
    if(e.target.id === 'sl-arq'){ const L = [...(e.target.files || [])]; e.target.value = ''; if(L.length) mandaArquivos(L.slice(0, 30)); return; }
    if(e.target.name === 'sl-t'){
      const data = e.target.value === 'data', w = C.$('sl-dia-w'), tx = C.$('sl-tx');
      if(w) w.hidden = !data;
      if(tx) tx.placeholder = data ? 'Ex.: aniversário de 10 anos, com promoção de chopp' : 'Ex.: divulgar o show de sexta, trocar a foto do perfil';
    }
  });
  document.addEventListener('submit', async e => {
    const f = e.target.closest('#sl-ped-f'); if(!f) return;
    e.preventDefault();
    const tipo = (f.querySelector('input[name="sl-t"]:checked') || {}).value || 'pedido', dia = tipo === 'data' ? C.$('sl-dia').value : null, tx = C.$('sl-tx').value.trim();
    if(tipo === 'data' && !dia){ C.toast('Escolhe o dia.'); C.$('sl-dia').focus(); return; }
    if(tx.length < 3){ C.toast(ERRO_SL.texto); C.$('sl-tx').focus(); return; }
    const b = f.querySelector('[type=submit]'); b.disabled = true;
    try{
      const r = await C.api.rpc('corre_sala_pede', { p_codigo: A.cod, p_tipo: tipo, p_dia: dia, p_texto: tx, p_quem: nomeAgora() });
      C.avisaPedido();
      A.d.pedidos.unshift({ id: r && r.id, tipo, dia, texto: tx, quem: A.nome, em: new Date().toISOString(), feito: false });
      C.$('sl-peds').innerHTML = pedsHTML(); C.$('sl-tx').value = ''; if(C.$('sl-dia')) C.$('sl-dia').value = '';
      C.toast(`Mandado. ${primeiro()} já tem isso na agenda.`, 3000);
    }catch(err){ C.toast(msgSl(err, 'Não deu pra mandar agora. Tenta de novo.')); }
    b.disabled = false;
  });

  /* ---------------- a Sala no Studio Cria (quem cuida da marca) ---------------- */
  const SD = { mk: null, sala: null, velhas: [], mats: [], peds: [], vendas: [] };
  const semSala = e => /corre_sala|sala|relation|schema cache|does not exist|PGRST204|column/i.test(String((e && (e.message || e.code)) || ''));
  async function salaCarrega(mk){
    const uid = C.uid();
    const [ls, ms, ps, vs] = await Promise.all([
      C.api.q('corre_aprovacoes', { eq: { dono: uid, marca_id: mk.id, sala: true }, order: ['created_at', false], limit: 10 }),
      C.api.q('corre_sala_material', { eq: { dono: uid, marca_id: mk.id }, order: ['em', false], limit: 120 }).catch(() => []),
      C.api.q('corre_sala_pedidos', { eq: { dono: uid, marca_id: mk.id }, order: ['em', false], limit: 60 }).catch(() => []),
      C.api.q('corre_vendas', { select: 'id,codigo,cliente,total,st,vence,pago_em,created_at,itens', eq: { dono: uid }, order: ['created_at', false], limit: 200 }).catch(() => [])
    ]);
    SD.mk = mk; SD.sala = (ls || []).find(l => l.ativo) || null; SD.velhas = (ls || []).filter(l => !l.ativo);
    SD.mats = ms || []; SD.peds = ps || [];
    const corte = maisDias(hojeBR(), -60);
    SD.vendas = (vs || []).filter(v => ['orcamento', 'fechado'].includes(v.st) || (v.st === 'pago' && String(v.pago_em || '') >= corte) || (SD.sala && (SD.sala.vendas || []).includes(v.id)));
  }
  const msgWaSala = () => `Oi! Essa é a sala da ${SD.mk.marca} no Corre. Guarda o link: aqui você aprova os posts, manda fotos e vídeos, conta as datas importantes e vê o que já foi entregue.\n${linkSala(SD.sala.codigo)}`;
  function matDona(x){
    const img = /^image\/(jpeg|png|webp|gif)$/.test(x.tipo);
    return `<li class="sl-m${x.visto ? '' : ' novo'}" data-id="${esc(x.id)}">
      <span class="sl-m-th" data-th="${img ? esc(x.caminho) : ''}">${ico(icoTipo(x.tipo))}</span>
      <span class="sl-m-tx"><b>${esc(x.nome || 'arquivo')}</b><small>${esc(x.quem || 'O cliente')} · ${esc(quandoTs(x.em))} · ${tamTxt(+x.tam || 0)}${x.usado_em ? ' · virou post' : ''}</small>${x.msg ? `<span class="sl-m-msg">${esc(x.msg)}</span>` : ''}</span>
      <span class="acts"><button type="button" class="btn sm" data-act="sl-m-abre" data-id="${esc(x.id)}">${ico('down')} Baixar</button>${img ? `<button type="button" class="btn sm pri" data-act="sl-m-usa" data-id="${esc(x.id)}">${ico('magia')} Usar num post</button>` : ''}<button type="button" class="btn sm ghost" data-act="sl-m-tira" data-id="${esc(x.id)}" aria-label="Apagar ${esc(x.nome || 'arquivo')}">${ico('trash')}</button></span>
    </li>`;
  }
  function pedDona(x){
    return `<li class="sl-p${x.visto ? '' : ' novo'}"><span class="mono">${x.tipo === 'data' ? 'Data · ' + dm(x.dia) : 'Pedido'}</span><p>${esc(x.texto)}</p><small>${esc(x.quem || 'O cliente')} · ${esc(quandoTs(x.em))}</small>${x.tarefa ? `<a class="btn sm ghost" href="#/caderninho/t/${esc(x.tarefa)}">${ico('caderno')} No Caderninho</a>` : ''}</li>`;
  }
  function salaFolha(){
    const mk = SD.mk, sl = SD.sala, nM = SD.mats.filter(x => !x.visto).length, nP = SD.peds.filter(x => !x.visto).length;
    const cab = `<div class="sheet-head"><h2>${C.marcaLogo ? C.marcaLogo(mk, 's') : ''}<span>Sala do Cliente · ${esc(mk.marca)}</span></h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>`;
    if(!sl){
      C.sheet(`<div class="form sl-folha">${cab}
        <p>Um link só da ${esc(mk.marca)}, pra mandar uma vez e o cliente guardar. Lá, sem conta nenhuma, ele:</p>
        <ul class="sl-oque"><li>${ico('check')} aprova os posts que vêm aí, do jeito que ficam no Instagram;</li><li>${ico('up')} manda fotos, vídeos e PDF, que chegam aqui;</li><li>${ico('cal')} conta as datas e os pedidos, que viram tarefa no teu Caderninho;</li><li>${ico('star')} vê o que saiu no mês e com quanta antecedência aprovou;</li><li>${ico('recibo')} abre a cobrança que você escolher mostrar.</li></ul>
        <div class="fld"><label for="sl-msg">Recado no alto da sala <small>(opcional)</small></label><textarea class="inp" id="sl-msg" rows="2" maxlength="600" placeholder="Oi! Aqui é onde a gente se acerta."></textarea></div>
        <div class="acts"><button type="button" class="btn pri" data-act="sl-cria">${ico('link')} Abrir a sala</button>${SD.velhas.length ? '<button type="button" class="btn ghost" data-act="sl-religa">Ligar a sala de antes</button>' : ''}</div>
      </div>`, 'wide');
      return;
    }
    const escolhidas = new Set(sl.vendas || []);
    C.sheet(`<div class="form sl-folha">${cab}
      <div class="sl-link"><code>${esc(linkSala(sl.codigo))}</code>
        <div class="acts"><button type="button" class="btn sm pri" data-act="sl-wa">${ico('send')} WhatsApp</button><button type="button" class="btn sm" data-act="sl-copia">${ico('copy')} Copiar</button><a class="btn sm ghost" href="${esc(linkSala(sl.codigo))}" target="_blank" rel="noopener">${ico('ext')} Ver como o cliente</a></div>
        <p class="hint">${sl.aberto_em ? `O cliente abriu por último ${esc(quandoTs(sl.aberto_em))}.` : 'O cliente ainda não abriu.'}${sl.respondido_em ? ` Respondeu a aprovação ${esc(quandoTs(sl.respondido_em))}.` : ''}</p>
      </div>
      <h3 class="hz-sub">Material que chegou${nM ? ` <span class="sl-novo">${nM} ${nM === 1 ? 'novo' : 'novos'}</span>` : ''}</h3>
      <ul class="sl-ms" id="sl-ms">${SD.mats.length ? SD.mats.map(matDona).join('') : '<li class="note">Nada ainda. O que o cliente mandar cai aqui e o teu celular avisa.</li>'}</ul>
      <h3 class="hz-sub">Datas e pedidos${nP ? ` <span class="sl-novo">${nP} ${nP === 1 ? 'novo' : 'novos'}</span>` : ''}</h3>
      <ul class="sl-ps">${SD.peds.length ? SD.peds.map(pedDona).join('') : '<li class="note">Nenhum ainda. Cada um vira tarefa no teu Caderninho (a data, 5 dias antes).</li>'}</ul>
      <h3 class="hz-sub">Cobrança na sala</h3>
      ${SD.vendas.length ? `<p class="note">Marca o que o cliente vê lá (até 8). Ele abre o orçamento ou a cobrança de sempre, com o teu Pix.</p>
        <div class="sl-vs" role="group" aria-label="Cobranças na sala">${SD.vendas.map(v => `<label class="sl-v"><input type="checkbox" name="sl-v" value="${esc(v.id)}"${escolhidas.has(v.id) ? ' checked' : ''}><span><b>${esc(v.cliente || 'Sem nome')}</b><small>${esc(ST_V[v.st] || v.st)} · ${C.money(v.total)}${v.vence ? ' · vence ' + dm(v.vence) : ''}</small></span></label>`).join('')}</div>
        <div class="acts"><button type="button" class="btn sm" data-act="sl-vendas">Salvar a cobrança</button></div>` : '<p class="note">Sem orçamento nem cobrança aberta em Vendas e Grana.</p>'}
      <h3 class="hz-sub">Recado no alto da sala</h3>
      <div class="fld"><textarea class="inp" id="sl-msg" aria-label="Recado no alto da sala" rows="2" maxlength="600" placeholder="Oi! Aqui é onde a gente se acerta.">${esc(sl.msg || '')}</textarea></div>
      <div class="acts"><button type="button" class="btn sm" data-act="sl-recado">Salvar o recado</button></div>
      <div class="acts sl-pe"><button type="button" class="btn sm ghost" data-act="sl-troca">Trocar o link</button><button type="button" class="btn sm ghost" data-act="sl-desliga">Desligar a sala</button><button type="button" class="btn sm ghost" data-act="ap-link" data-marca="${esc(mk.id)}">Link só de um período</button></div>
    </div>`, 'wide');
    /* as miniaturas das fotos (link assinado de 1 hora) e o "visto" do que era novo */
    [...document.querySelectorAll('#sl-ms [data-th]')].filter(el => el.dataset.th).slice(0, 30).forEach(async el => {
      try{ const u = await C.api.sala.link(el.dataset.th); if(u && el.isConnected) el.innerHTML = `<img src="${esc(u)}" alt="">`; }catch(e){}
    });
    if(nM) C.api.upd('corre_sala_material', { dono: C.uid(), marca_id: mk.id, visto: false }, { visto: true }).then(() => { SD.mats.forEach(x => { x.visto = true; }); salaConta(); }).catch(() => {});
    if(nP) C.api.upd('corre_sala_pedidos', { dono: C.uid(), marca_id: mk.id, visto: false }, { visto: true }).then(() => { SD.peds.forEach(x => { x.visto = true; }); salaConta(); }).catch(() => {});
  }
  async function abreSala(mk){
    try{ await salaCarrega(mk); }
    catch(e){ C.toast(semSala(e) ? 'A Sala do Cliente ainda não foi ligada no banco (falta o delta-v512.sql).' : C.errMsg(e, 'Não deu pra abrir agora.'), 5200); return; }
    salaFolha();
  }
  const marcaDe = id => { const todas = marcasDo().concat(C.estudio && C.estudio.marca && C.estudio.marca() ? [C.estudio.marca()] : []); return (id && todas.find(x => x.id === id)) || null; };
  /* o número do que chegou e ninguém viu (o selo no botão "Sala do Cliente" do Studio Cria) */
  async function salaConta(){
    const els = document.querySelectorAll('.sl-badge'); if(!els.length || !C.uid()) return;
    let n = 0;
    try{ const [a, b] = await Promise.all([C.api.q('corre_sala_material', { select: 'id', eq: { dono: C.uid(), visto: false }, limit: 99 }), C.api.q('corre_sala_pedidos', { select: 'id', eq: { dono: C.uid(), visto: false }, limit: 99 })]); n = (a || []).length + (b || []).length; }catch(e){ n = 0; }
    document.querySelectorAll('.sl-badge').forEach(el => { el.textContent = n ? String(Math.min(n, 99)) : ''; el.hidden = !n; });
  }
  async function salaMexe(patch, ok){
    try{ await C.api.upd('corre_aprovacoes', { id: SD.sala.id }, patch); Object.assign(SD.sala, patch); if(ok) C.toast(ok, 2400); }
    catch(e){ C.toast(C.errMsg(e, 'Não deu pra salvar agora.')); throw e; }
  }
  Object.assign(C.acts, {
    'sala-abre': el => {
      const mk = marcaDe(el && el.dataset && el.dataset.marca) || (C.studio && C.studio.marcaAtual && C.studio.marcaAtual());
      if(mk) return abreSala(mk);
      const L = marcasDo(); if(!L.length){ C.toast('Põe uma marca no Studio Cria primeiro.'); return; }
      C.sheet(`<div class="form"><div class="sheet-head"><h2>Sala de qual cliente?</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
        <div class="sd-qual">${L.map(x => `<button type="button" class="st-mk" data-act="sala-abre" data-marca="${x.id}">${C.marcaLogo(x, 's')}<span><b>${esc(x.marca)}</b><small>@${esc(x.rede || '')}</small></span></button>`).join('')}</div></div>`);
    },
    'sl-cria': async el => {
      el.disabled = true; const h = hojeBR();
      try{ await C.api.ins('corre_aprovacoes', { marca_id: SD.mk.id, de: h, ate: h, sala: true, msg: (C.$('sl-msg') ? C.$('sl-msg').value.trim() : '').slice(0, 600) }); await salaCarrega(SD.mk); salaFolha(); if(SD.sala) C.copy(linkSala(SD.sala.codigo), 'Sala aberta e o link copiado. Manda pro cliente.'); }
      catch(e){ el.disabled = false; C.toast(semSala(e) ? 'A Sala do Cliente ainda não foi ligada no banco (falta o delta-v512.sql).' : C.errMsg(e, 'Não deu pra abrir agora.'), 5200); }
    },
    'sl-religa': async el => {
      const v = SD.velhas[0]; if(!v) return; el.disabled = true;
      try{ await C.api.upd('corre_aprovacoes', { id: v.id }, { ativo: true }); await salaCarrega(SD.mk); salaFolha(); C.toast('A sala de antes tá ligada de novo, com o mesmo link.'); }
      catch(e){ el.disabled = false; C.toast(C.errMsg(e, 'Não deu pra ligar agora.')); }
    },
    'sl-copia': () => { if(SD.sala) C.copy(linkSala(SD.sala.codigo), 'Link da sala copiado.'); },
    'sl-wa': () => { if(SD.sala) window.open(`https://wa.me/?text=${encodeURIComponent(msgWaSala())}`, '_blank', 'noopener'); },
    'sl-recado': async () => { const t = (C.$('sl-msg').value || '').trim().slice(0, 600); try{ await salaMexe({ msg: t }, 'Recado salvo.'); }catch(e){} },
    'sl-vendas': async () => {
      const ids = [...document.querySelectorAll('input[name="sl-v"]:checked')].map(x => x.value);
      if(ids.length > 8){ C.toast('A sala mostra até 8 cobranças.'); return; }
      try{ await salaMexe({ vendas: ids }, ids.length ? 'O cliente vê essa cobrança na sala.' : 'A sala não mostra cobrança.'); }catch(e){}
    },
    'sl-troca': async () => {
      if(!(await C.confirma({ titulo: 'Trocar o link da sala?', texto: 'O link de agora para de abrir. O material e os pedidos que já chegaram ficam aqui.', sim: 'Trocar', nao: 'Agora não' }))) return;
      try{ await C.api.upd('corre_aprovacoes', { id: SD.sala.id }, { ativo: false }); await C.api.ins('corre_aprovacoes', { marca_id: SD.mk.id, de: hojeBR(), ate: hojeBR(), sala: true, msg: SD.sala.msg || '', vendas: SD.sala.vendas || [] }); await salaCarrega(SD.mk); salaFolha(); if(SD.sala) C.copy(linkSala(SD.sala.codigo), 'Link novo copiado. Manda pro cliente.'); }
      catch(e){ C.toast(C.errMsg(e, 'Não deu pra trocar agora.')); }
    },
    'sl-desliga': async () => {
      if(!(await C.confirma({ titulo: 'Desligar a sala?', texto: 'O link para de abrir. Dá pra ligar de novo depois, com o mesmo link.', sim: 'Desligar', nao: 'Agora não' }))) return;
      try{ await salaMexe({ ativo: false }); await salaCarrega(SD.mk); salaFolha(); C.toast('Sala desligada.'); }catch(e){}
    },
    'sl-m-abre': async el => {
      const x = SD.mats.find(m => m.id === el.dataset.id); if(!x) return;
      const w = C.DEMO ? null : (() => { try{ return window.open('', '_blank'); }catch(e){ return null; } })();
      try{ const u = await C.api.sala.link(x.caminho, x.nome || true); if(!u) throw 0; if(w){ w.opener = null; w.location = u; } else { const a = document.createElement('a'); a.href = u; a.download = x.nome || 'arquivo'; document.body.appendChild(a); a.click(); a.remove(); } }
      catch(e){ if(w) w.close(); C.toast('Não deu pra abrir esse arquivo agora.'); }
    },
    'sl-m-usa': async el => {
      const x = SD.mats.find(m => m.id === el.dataset.id); if(!x || !C.estudio) return;
      el.disabled = true;
      try{
        const u = await C.api.sala.link(x.caminho); const b = await (await fetch(u)).blob();
        const f = await C.shrink(new File([b], x.nome || 'foto.jpg', { type: b.type || x.tipo }), 1600, .86);
        C.api.upd('corre_sala_material', { id: x.id }, { usado_em: new Date().toISOString() }).then(() => { x.usado_em = new Date().toISOString(); }).catch(() => {});
        C.closeSheet();
        C.estudio.abrir(SD.mk, null, undefined, { auto: true, studio: !!C.studio, pre: { foto: f }, onSave: () => { if(C.studio && C.studio.recarrega) C.studio.recarrega(); } });
      }catch(e){ el.disabled = false; C.toast(/heic|heif/.test(x.tipo) ? 'Essa foto é HEIC, que o navegador não abre: baixa, converte pra JPG e põe no post.' : 'Não deu pra abrir essa foto agora.', 5200); }
    },
    'sl-m-tira': async el => {
      const x = SD.mats.find(m => m.id === el.dataset.id); if(!x) return;
      if(!(await C.confirma({ titulo: 'Apagar esse arquivo?', texto: `"${esc(x.nome || 'arquivo')}" sai daqui e do armazenamento.`, sim: 'Apagar', nao: 'Agora não' }))) return;
      try{ await C.api.sala.tira([x.caminho]); await C.api.del('corre_sala_material', { id: x.id }); SD.mats = SD.mats.filter(m => m.id !== x.id); salaFolha(); C.toast('Apagado.'); }
      catch(e){ C.toast(C.errMsg(e, 'Não deu pra apagar agora.')); }
    }
  });
  C.sala = { abre: abreSala, conta: salaConta, linkSala };
  C.aprova = { abre, linkDe };
})();
