/* CORRE · AVISOS: o sino, no jeito do Twitter. Quem curtiu, fortaleceu, citou, respondeu, te seguiu, te mencionou
   e te recomendou, junto com a Agenda das visitas. O número do sino soma os avisos novos e as visitas de hoje e amanhã.
   Curtida, fortalecida e seguidor parecidos se juntam: "Ana, Bia e mais 2 curtiram teu post". Perfil mocado aparece sem nome. */
(function(){
  'use strict';
  const C = window.Corre, { esc, ico } = C;
  const A = { n: 0, at: 0, lista: [], aba: 'tudo', seq: 0 };
  const ICO = { curtiu: 'heart', fortaleceu: 'raio', citou: 'raio', respondeu: 'chat', seguiu: 'eu', mencionou: 'chat', recomendou: 'star', grupo_pedido: 'gente', grupo_aceito: 'gente' };

  async function sync(forca){
    if(!C.uid() || !C.st.me) return;
    if(!forca && Date.now() - A.at < 60e3) return;
    A.at = Date.now();
    try{ A.n = Number(await C.api.rpc('corre_avisos_n', {})) || 0; }catch(e){ return; }
    if(C.visitas && C.visitas.pintaSino) C.visitas.pintaSino();
  }

  /* junta o que é parecido (o mais novo na frente) */
  function agrupa(L){
    const out = [], idx = {};
    L.forEach(e => {
      const k = e.t === 'seguiu' ? 'seguiu' : (e.t === 'curtiu' || e.t === 'fortaleceu') && e.post ? e.t + ':' + e.post : e.t === 'grupo_pedido' && e.ref ? 'gp:' + e.ref : '';
      if(k && idx[k] != null){ const g = out[idx[k]]; if(!g.quem.some(q => q.id && q.id === (e.quem || {}).id)) g.quem.push(e.quem || {}); g.novo = g.novo || e.novo; return; }
      if(k) idx[k] = out.length;
      out.push(Object.assign({}, e, { quem: [e.quem || {}] }));
    });
    return out;
  }
  function itemHTML(g){
    const q = g.quem, um = q[0] || {}, n = q.length, mais = n > 1;
    const nome = x => x.handle ? `<a href="#/@${esc(x.handle)}">${esc(x.nome || x.handle)}</a>` : `<span>${esc(x.nome || 'Alguém')}</span>`;
    const quem = n === 1 ? nome(um) : n === 2 ? `${nome(q[0])} e ${nome(q[1])}` : `${nome(q[0])}, ${nome(q[1])} e mais ${n - 2}`;
    const verbo = { curtiu: mais ? 'curtiram teu post' : 'curtiu teu post', fortaleceu: mais ? 'fortaleceram teu post' : 'fortaleceu teu post', citou: 'citou teu post',
      respondeu: 'te respondeu', seguiu: mais ? 'começaram a te seguir' : 'começou a te seguir', mencionou: 'te mencionou', recomendou: 'te recomendou',
      grupo_pedido: `${mais ? 'pediram' : 'pediu'} pra entrar em <a href="#/g/${esc(g.g || '')}/membros">${esc(g.txt || 'teu grupo')}</a>`,
      grupo_aceito: `te aceitou em <a href="#/g/${esc(g.g || '')}">${esc(g.txt || 'um grupo')}</a>` }[g.t] || '';
    const ir = g.post ? `#/p/${g.post}` : g.t === 'seguiu' && um.handle ? `#/@${um.handle}` : g.t === 'grupo_pedido' && g.g ? `#/g/${g.g}/membros` : g.t === 'grupo_aceito' && g.g ? `#/g/${g.g}` : '';
    const acao = g.t === 'recomendou' && g.ref ? `<div class="acts"><button type="button" class="btn sm pri" data-act="rec-aceita" data-id="${esc(g.ref)}">Mostrar no perfil</button><button type="button" class="btn sm ghost" data-act="rec-oculta" data-id="${esc(g.ref)}">Não mostrar</button></div>` : '';
    return `<li class="av-it ${esc(g.t)}${g.novo ? ' novo' : ''}"${ir ? ` data-ir="${esc(ir)}"` : ''}>
      <span class="av-ic" aria-hidden="true">${ico(ICO[g.t] || 'bell')}</span>
      <div class="av-c"><div class="av-quem">${q.slice(0, 6).map(x => C.avatar(x, 's')).join('')}</div>
        <p class="av-l">${quem} ${verbo} <span class="av-q">· ${C.rel(g.em)}</span></p>
        ${g.txt && !/^grupo_/.test(g.t) ? `<p class="av-txt">${esc(g.txt)}</p>` : ''}${acao}</div>
    </li>`;
  }
  async function abrir(aba){
    A.aba = aba || 'tudo';
    const nv = C.visitas && C.visitas.contaSino ? C.visitas.contaSino() : 0;
    C.sheet(`<div class="form avs"><div class="sheet-head"><h2>${ico('bell')} Avisos</h2>${C.push ? `<button type="button" class="cbtn plain avs-cel" data-act="push-ajustes" aria-label="${C.push.nome()}" title="${C.push.nome()}">${ico(C.push.CEL ? 'cel' : 'pc')}</button>` : ''}<button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      ${C.push ? C.push.faixa('avisos') : ''}
      <div class="mu-tabs avs-tabs" role="tablist" aria-label="Avisos">${[['tudo', 'Tudo'], ['mencoes', 'Menções'], ['agenda', 'Agenda']].map(([k, t]) => `<button type="button" role="tab" data-act="av-aba" data-k="${k}" aria-selected="${A.aba === k}">${t}${k === 'agenda' && nv ? ` <b class="num">${nv}</b>` : ''}</button>`).join('')}</div>
      <div id="av-l"><p class="note">Abrindo…</p></div></div>`);
    await pinta();
  }
  async function pinta(){
    const box = C.$('av-l'); if(!box) return;
    const seq = ++A.seq;
    if(A.aba === 'agenda'){ if(C.visitas && C.visitas.agendaEm) await C.visitas.agendaEm(box); return; }
    box.innerHTML = '<p class="note">Abrindo…</p>';
    let L = [];
    try{ L = (await C.api.rpc('corre_avisos', { p_lim: 80 })) || []; }
    catch(e){ if(seq === A.seq && box.isConnected) box.innerHTML = `<p class="note">${esc(C.errMsg(e, 'Não deu pra abrir os avisos agora.'))}</p>`; return; }
    if(seq !== A.seq || !box.isConnected) return;
    A.lista = L;
    const vis = A.aba === 'mencoes' ? L.filter(e => e.t === 'mencionou' || e.t === 'respondeu' || e.t === 'citou') : L;
    box.innerHTML = vis.length ? `<ul class="av-lista">${agrupa(vis).map(itemHTML).join('')}</ul>`
      : `<p class="note">${A.aba === 'mencoes' ? `Ninguém te mencionou ainda. Quando alguém escrever @${esc((C.st.me || {}).handle || '')}, aparece aqui.` : 'Nada por aqui ainda. Posta, responde e segue a galera: curtida, resposta e seguidor novo aparecem aqui.'}</p>`;
    /* abriu, viu: zera o número do sino (o destaque dos novos fica nesta abertura) */
    if(L.some(e => e.novo) || A.n){ try{ await C.api.rpc('corre_avisos_visto', {}); }catch(e){} A.n = 0; if(C.visitas && C.visitas.pintaSino) C.visitas.pintaSino(); }
  }
  /* tocar no aviso abre o post (ou o perfil de quem te seguiu) */
  document.addEventListener('click', e => {
    const li = e.target.closest && e.target.closest('.av-it[data-ir]'); if(!li || e.target.closest('a,button')) return;
    C.closeSheet(); C.go(li.dataset.ir);
  });
  Object.assign(C.acts, {
    'av-aba': el => { A.aba = el.dataset.k; document.querySelectorAll('.avs-tabs [data-k]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.k === A.aba))); pinta(); }
  });
  C.avisos = { n: () => A.n, aba: () => A.aba, sync, abrir, depois: () => { if(C.$('av-l')) pinta(); sync(true); } };
})();
