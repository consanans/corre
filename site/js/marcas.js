/* CORRE · PORTFÓLIO: as marcas que a pessoa tá tocando. Cada marca pode ter a rede social dela;
   com a rede ligada, a marca ganha o painel (grana da marca + o que sai na banca sobre ela).
   Plano grátis: 1 rede social. O "automático": quem já pagou na Grana vira sugestão de marca. */
(function(){
  'use strict';
  const C = window.Corre, { esc, ico, money } = C;
  const CORES = ['#FFE800', '#FF48B0', '#FF6C2F', '#0067AE', '#765BA7', '#141216'];
  const M = { list: [], sug: [] };
  const IG_RE = /^[A-Za-z0-9_.]{0,30}$/;
  const pro = () => (C.st.me && C.st.me.plano) === 'pro';
  /* quantas marcas podem ter rede: Pro = todas; grátis = 1, ou o que o Corre liberar (corre_perfis.redes) */
  /* v3.60: quantas redes o plano libera vem do banco (corre_meu_acesso; 999 = quantas quiser) */
  const lim = () => pro() ? Infinity : C.acesso && C.acesso.redes ? (C.acesso.redes >= 999 ? Infinity : C.acesso.redes) : Math.max(1, Number(C.st.me && C.st.me.redes) || 1);
  const nRedes = n => n === Infinity ? 'quantas redes sociais quiser' : `${n} ${n === 1 ? 'rede social' : 'redes sociais'}`;
  /* v3.60: o nome do plano do Studio Cria (o fundador não paga; quem assinou tem o Plano Studio Cria) */
  const nomePlano = () => pro() ? 'Plano Corre+' : C.acesso && C.acesso.fundador ? 'Fundador' : C.acesso && C.acesso.dono ? 'Dono' : C.acesso && C.acesso.planos && C.acesso.planos.studio && C.acesso.planos.studio.acesso ? 'Plano Studio Cria' : lim() > 1 ? 'Plano grátis + liberadas' : 'Plano grátis';
  const comRede = () => M.list.filter(m => m.rede);
  /* v3.61: as redes que o plano cobre (as mais antigas primeiro). Quem tinha o "4 ou mais" e cancelou (ou não pagou)
     segue com as marcas e as redes guardadas, mas só as que cabem no plano abrem o painel e o Studio Cria */
  const noPlano = () => { const L = comRede().slice().sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || ''))).slice(0, lim()); return M.list.filter(m => L.includes(m)); };
  const foraDoPlano = m => !!m.rede && !noPlano().includes(m);
  const foraHTML = m => `<main class="wrap"><section class="card mk-head">${C.marcaLogo(m, 'l')}<div><h1>${esc(m.marca)}</h1><p class="note">@${esc(m.rede)} tá fora do teu plano agora: ele cobre ${nRedes(lim())}. A marca e tudo dela seguem guardados; o painel e o Studio Cria dela voltam quando o plano cobrir de novo.</p></div><div class="acts">${C.naLoja && C.naLoja() ? '' : `<button type="button" class="btn pri" data-act="mk-plus">${ico('cartao')} Quero mais redes</button>`}<a class="btn" href="#/marcas">Voltar</a></div></section></main>`;
  const acessoPronto = () => (C.acesso || !C.acessoCarrega ? null : C.acessoCarrega());
  const cleanIg = v => String(v || '').trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/[/?#].*$/, '');

  /* logo ou monograma em adesivo */
  C.marcaLogo = (m, size) => m.logo_url
    ? `<span class="mk-logo ${size || ''}"><img src="${esc(m.logo_url)}" alt="" loading="lazy"></span>`
    : `<span class="mk-logo mono-g ${size || ''}" style="--c:${esc(m.cor || '#FFE800')}"><b>${esc(C.initials(m.marca))}</b></span>`;
  C.marcaCard = (m, mine) => `<article class="mk">
      ${C.marcaLogo(m)}
      <div class="mk-tx"><b>${esc(m.marca)}</b><small>${esc([m.segmento, m.papel].filter(Boolean).join(' · '))}</small>${m.desde ? `<small class="mono">desde ${esc(m.desde)}</small>` : ''}</div>
      <div class="mk-tags">${m.rede ? `<a class="tag" href="https://www.instagram.com/${encodeURIComponent(m.rede)}/" target="_blank" rel="noopener">${ico('ig')} @${esc(m.rede)}</a>` : ''}${m.link ? `<a class="tag" href="${esc(m.link)}" target="_blank" rel="noopener">${ico('ext')} Site</a>` : ''}${mine && !m.publico ? '<span class="tag moc">Mocada</span>' : ''}</div>
      ${mine ? `<div class="acts">${m.rede ? `<a class="btn sm pri" href="#/studio/${m.id}">${ico('magia')} Studio Cria</a><a class="btn sm" href="#/marca/${m.id}">Painel</a>` : ''}<button type="button" class="btn sm" data-act="mk-edit" data-id="${m.id}">Editar</button><button type="button" class="btn sm" data-act="vd-marca" data-id="${m.id}">${ico('star')} O que vendo</button></div>` : ''}
    </article>`;

  async function carregar(){
    const uid = C.uid();
    M.list = await C.api.q('corre_portfolio', { eq: { dono: uid }, order: ['ordem', true] });
    M.list.sort((a, b) => (a.ordem - b.ordem) || String(a.created_at).localeCompare(String(b.created_at)));
    /* sugestão automática: clientes que já pagaram (Grana) e ainda não estão no portfólio */
    try{
      const ls = await C.api.q('corre_lancamentos', { eq: { dono: uid }, gt: { valor: 0 }, limit: 2000 });
      const tem = new Set(M.list.map(m => C.norm(m.marca))), map = new Map();
      ls.forEach(l => { const k = C.norm(l.cliente); if(k && !tem.has(k) && l.categoria !== 'transferencia'){ const cur = map.get(k) || { nome: l.cliente, v: 0 }; cur.v += Number(l.valor); map.set(k, cur); } });
      M.sug = [...map.values()].sort((a, b) => b.v - a.v).slice(0, 6);
    }catch(e){ M.sug = []; }
  }

  C.views.marcas = async function(app){
    app.innerHTML = C.header('marcas') + '<main class="wrap"><section class="card"><p>Abrindo o portfólio…</p></section></main>';
    try{ await Promise.all([carregar(), C.catalogo ? C.catalogo.carregar(true) : null, C.acesso || !C.acessoCarrega ? null : C.acessoCarrega()]); }catch(e){ app.innerHTML = C.header('marcas') + `<main class="wrap"><section class="card"><p>${esc(C.errMsg(e))}</p></section></main>`; return; }
    const usadas = comRede().length;
    app.innerHTML = C.header('marcas') + `<main class="wrap">
      <div class="hello"><h1><span class="hl">Portfólio</span></h1><p>O que você vende e pra quem já fez. Você escolhe o que aparece no perfil.</p></div>
      ${C.catalogo ? `<div id="ct-sec" class="ct-sec">${C.catalogo.secaoHTML()}</div>` : ''}
      <div class="sec-row"><h2 class="sec-t"><span class="hl">Clientes e trabalhos</span></h2></div>
      <p class="mk-intro">As marcas e clientes que você atende ou já atendeu: é a prova do teu corre no perfil. Pra quem toca rede social de cliente, cada marca ganha o painel.</p>
      <section class="card plano"><div><b>${nomePlano()}</b><span>${pro() ? `${usadas} ${usadas === 1 ? 'rede social ligada' : 'redes sociais ligadas'}` : `${usadas} de ${nRedes(lim())} ${lim() === 1 ? 'ligada' : 'ligadas'}. A marca com rede ganha o painel: grana da marca, o que sai na banca sobre ela e o estúdio de posts.`}</span></div>${!pro() && usadas >= lim() && !(C.naLoja && C.naLoja()) ? '<button type="button" class="btn sm" data-act="mk-plus">Quero mais redes</button>' : ''}</section>
      ${M.sug.length ? `<section class="card sug"><h2 class="ch">Já te pagaram e não tão aqui</h2><p class="note">Vem da tua Grana. Um toque e a marca entra no portfólio.</p><div class="sug-row">${M.sug.map(s => `<button type="button" class="chip add" data-act="mk-sug" data-n="${esc(s.nome)}">${ico('plus')} ${esc(s.nome)} <small class="num">${money(s.v)}</small></button>`).join('')}</div></section>` : ''}
      <div class="mks">${M.list.map(m => C.marcaCard(m, true)).join('')}<button type="button" class="mk add" data-act="mk-nova">${ico('plus')}<b>Adicionar cliente ou trabalho</b><small>Marca que você atende, projeto ou a tua própria.</small></button></div>
    </main>`;
  };

  function form(m){
    const novo = !m;
    m = m || { marca: '', segmento: '', papel: '', desde: String(new Date().getFullYear()), link: '', rede: '', cor: CORES[M.list.length % CORES.length], logo_url: '', publico: true };
    let logo = m.logo_url || '';
    C.sheet(`<form class="form" id="mk-f" novalidate><div class="sheet-head"><h2>${novo ? 'Nova marca' : 'Editar marca'}</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <div class="mk-logo-row"><span id="mk-prev">${C.marcaLogo(Object.assign({}, m, { logo_url: logo }), 'l')}</span><div class="acts"><button type="button" class="btn sm" id="mk-up">${ico('camera')} ${logo ? 'Trocar logo' : 'Pôr logo'}</button>${logo ? '<button type="button" class="btn sm ghost" id="mk-nologo">Sem logo</button>' : ''}</div></div>
      <div class="fld"><label for="mk-n">Marca</label><input class="inp" id="mk-n" maxlength="60" required value="${esc(m.marca)}" placeholder="Nome da marca" autofocus></div>
      <div class="row2"><div class="fld"><label for="mk-s">Segmento</label><input class="inp" id="mk-s" maxlength="60" value="${esc(m.segmento)}" placeholder="Hamburgueria, moda, academia…"></div><div class="fld"><label for="mk-p">O que você faz</label><input class="inp" id="mk-p" maxlength="80" value="${esc(m.papel)}" placeholder="Social media, vídeo, tráfego…"></div></div>
      <div class="row2"><div class="fld"><label for="mk-r">Rede social da marca</label><div class="at"><input class="inp" id="mk-r" maxlength="60" value="${esc(m.rede)}" placeholder="perfil.da.marca" autocapitalize="none" spellcheck="false" aria-describedby="mk-rh"></div><span class="hint" id="mk-rh">@ do Instagram. Liga o painel da marca.${pro() ? '' : ` Teu plano: ${nRedes(lim())}.`}</span></div><div class="fld"><label for="mk-d">Desde</label><input class="inp" id="mk-d" maxlength="20" value="${esc(m.desde)}" placeholder="2026"></div></div>
      <div class="fld"><label for="mk-l">Site ou link</label><input class="inp" id="mk-l" maxlength="300" value="${esc(m.link)}" placeholder="https://" inputmode="url"></div>
      <fieldset class="fld"><legend>Cor do adesivo</legend><div class="cores">${CORES.map(k => `<label class="cor"><input type="radio" name="mk-cor" value="${k}"${(m.cor || CORES[0]) === k ? ' checked' : ''}><i style="background:${k}"></i></label>`).join('')}</div></fieldset>
      <label class="switch"><input type="checkbox" id="mk-pub"${m.publico ? ' checked' : ''}><span class="sw"></span><span><b>Aparece no meu perfil</b><small>Desligado, a marca fica mocada: só você vê.</small></span></label>
      <div class="acts"><button type="submit" class="btn pri" id="mk-ok">${novo ? 'Adicionar' : 'Salvar'}</button>${novo ? '' : `<button type="button" class="btn ghost" data-act="mk-rm" data-id="${m.id}">${ico('trash')} Remover a marca</button>`}</div>
    </form>`);
    const prev = () => { C.$('mk-prev').innerHTML = C.marcaLogo({ marca: C.$('mk-n').value || m.marca || '?', cor: (document.querySelector('input[name="mk-cor"]:checked') || {}).value, logo_url: logo }, 'l'); };
    C.$('mk-f').addEventListener('input', prev);
    C.$('mk-up').addEventListener('click', async () => {
      const f = await C.pickFile('image/*'); if(!f) return;
      const b = C.$('mk-up'); b.disabled = true; b.textContent = 'Subindo…';
      /* v3.74: o logo novo fica solto até salvar (fechou sem salvar, sai do Storage); trocou de novo, o de antes sai na hora */
      try{ const blob = await C.shrink(f, 360, .88, true), novoLogo = C.solta(await C.api.upload(blob)); C.soltaFora(logo); logo = novoLogo; prev(); b.innerHTML = `${ico('camera')} Trocar logo`; }
      catch(e){ C.toast(C.errMsg(e, 'Não deu pra subir a imagem.')); b.innerHTML = `${ico('camera')} Pôr logo`; }
      finally{ b.disabled = false; }
    });
    const nl = C.$('mk-nologo'); if(nl) nl.addEventListener('click', () => { C.soltaFora(logo); logo = ''; prev(); nl.remove(); });
    C.$('mk-f').addEventListener('submit', async e => {
      e.preventDefault();
      const link = C.$('mk-l').value.trim();
      const row = { marca: C.$('mk-n').value.trim(), segmento: C.$('mk-s').value.trim(), papel: C.$('mk-p').value.trim(), desde: C.$('mk-d').value.trim(), link: link && !/^https?:\/\//i.test(link) ? 'https://' + link : link, rede: cleanIg(C.$('mk-r').value), cor: (document.querySelector('input[name="mk-cor"]:checked') || {}).value || '', logo_url: logo, publico: C.$('mk-pub').checked };
      if(!row.marca){ C.toast('Coloca o nome da marca.'); C.$('mk-n').focus(); return; }
      if(!IG_RE.test(row.rede)){ C.toast('O @ só aceita letras, números, ponto e _.'); C.$('mk-r').focus(); return; }
      if(row.rede && M.list.filter(x => x.rede && x.id !== m.id).length >= lim()){ plusSheet(); return; }
      if(novo) row.ordem = M.list.length;
      const b = C.$('mk-ok'); b.disabled = true;
      try{
        if(novo) await C.api.ins('corre_portfolio', row); else await C.api.upd('corre_portfolio', { id: m.id }, row);
        if(m.logo_url && m.logo_url !== logo) C.api.unlink(m.logo_url);
        C.prende(logo); C.closeSheet(); C.toast(novo ? 'Marca no portfólio.' : 'Marca salva.'); volta();
      }catch(err){ if(/plano_gratis/.test((err && (err.hint || err.message)) || '')) plusSheet(); else C.toast(C.errMsg(err)); }
      finally{ b.disabled = false; }
    });
  }
  function plusSheet(){
    /* v3.60: com os planos no banco, mais redes é assinar o Studio Cria (o próximo degrau já vem marcado) */
    if(C.acesso && C.planos){ const l = lim(); C.planos.assinar('studio', l === Infinity ? 4 : Math.min(4, l + 1)); return; }
    const ja = C.st.me && C.st.me.quer_plus;
    C.sheet(`<div class="form"><div class="sheet-head"><h2>Mais marcas no Corre</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p>No teu plano o Corre acompanha <b>${nRedes(lim())}</b>. A marca sem rede continua no portfólio e aparece no teu perfil normalmente; o que ela não ganha é o painel.</p>
      <p>O <b>Corre+</b> libera rede social pra todas as marcas que você toca.</p>
      <div class="acts">${ja ? '<span class="tag pub">Você tá na lista do Corre+</span>' : '<button type="button" class="btn pri" data-act="mk-plus-ok">Quero o Corre+</button>'}${C.CFG.CONTATO_PLANO ? `<a class="btn" href="${esc(C.CFG.CONTATO_PLANO)}" target="_blank" rel="noopener">Falar com o Corre</a>` : ''}</div></div>`);
  }

  /* depois de salvar ou tirar uma marca: volta pra onde a pessoa tava (Studio Cria ou Portfólio) */
  const volta = () => { const h = location.hash.replace(/^#\/?/, ''); if(/^studio/.test(h) && C.views.studio) C.views.studio(C.$('app'), h.slice(7)); else C.views.marcas(C.$('app')); };

  /* v4.27 · REMOVER A MARCA (o Thales, na porta do Studio Cria: "precisa ter opção de remover marca"). Antes só dava pelo Editar,
     com dois toques e sem dizer o que ia junto. No banco, tirar a marca leva junto (on delete cascade) os posts do Studio Cria
     dela, os links de aprovação, as visitas e o que ela vende; a grana fica na Grana (é pelo nome do cliente) e o que já
     saiu no Instagram fica lá. Por isso a folha conta antes. A conexão do Instagram é pelo @, não pela marca: se nenhuma
     outra marca usa o mesmo @, a folha oferece desconectar junto (senão a conexão fica guardada à toa). */
  const opBtn = m => `<button type="button" class="st-porta-op" data-act="mk-op" data-id="${m.id}" aria-label="Editar ou remover a marca ${esc(m.marca)}" title="Editar ou remover">${ico('dots')}</button>`;
  function opSheet(m){
    if(!m) return;
    C.sheet(`<div class="form mk-op"><div class="sheet-head"><h2>${C.marcaLogo(m, 's')} ${esc(m.marca)}</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      ${m.rede ? `<p class="note">@${esc(m.rede)}${C.ig ? C.ig.seloTx(m) : ''}</p>` : ''}
      <div class="mk-op-l">
        <button type="button" class="mk-op-b" data-act="mk-edit" data-id="${m.id}">${ico('edit')}<span><b>Editar a marca</b><small>Nome, @ do Instagram, logo e cor</small></span></button>
        <button type="button" class="mk-op-b rm" data-act="mk-rm" data-id="${m.id}">${ico('trash')}<span><b>Remover a marca</b><small>Tira do Studio Cria e do Portfólio</small></span></button>
      </div></div>`);
  }
  /* a conta do Instagram que só essa marca usa (outra marca com o mesmo @ segue precisando dela) */
  const contaSo = m => { const c = m.rede && C.ig ? C.ig.contas().find(x => x.username === String(m.rede).toLowerCase()) : null; return c && !M.list.some(x => x.id !== m.id && String(x.rede || '').toLowerCase() === c.username) ? c : null; };
  async function rmSheet(m){
    if(!m) return;
    if(C.ig) try{ await C.ig.carrega(); }catch(e){}
    const c = contaSo(m);
    C.sheet(`<div class="form mk-rm"><div class="sheet-head"><h2>Remover a ${esc(m.marca)}?</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p>Ela sai do Studio Cria e do Portfólio, e o Corre não posta mais nada nela.</p>
      <ul class="mk-rm-l"><li id="mk-rm-vai">${ico('trash')}<span>Contando o que vai junto…</span></li><li>${ico('check')}<span>Ficam: o que já saiu no Instagram e a grana dela na Grana.</span></li></ul>
      ${c ? `<label class="switch"><input type="checkbox" id="mk-rm-ig" checked><span class="sw"></span><span><b>Desconectar o @${esc(c.username)} do Instagram também</b><small>Sem a marca, a conexão fica guardada à toa. Dá pra conectar de novo quando quiser.</small></span></label>` : ''}
      <div class="acts"><button type="button" class="btn armed" id="mk-rm-ok">${ico('trash')} Remover a ${esc(m.marca)}</button><button type="button" class="btn ghost" data-close>Agora não</button></div></div>`);
    const uid = C.uid(), conta = (t, o) => C.api.q(t, { eq: Object.assign({ dono: uid, marca_id: m.id }, o || {}) }).catch(() => null);
    const [posts, prods, vis] = await Promise.all([conta('corre_posts'), conta('corre_produtos'), conta('corre_visitas')]);
    const vai = C.$('mk-rm-vai'); if(!vai) return;
    const hoje = C.hojeBR(), porSair = (posts || []).filter(p => p.status !== 'postado' && !p.ig_media_id && String(p.data || '') >= hoje).length;
    const n = (k, um, varios) => `<b>${k} ${k === 1 ? um : varios}</b>`;
    const L = [posts === null ? 'os posts dela no Studio Cria' : posts.length ? `${n(posts.length, 'post', 'posts')} do Studio Cria${porSair ? ` (${porSair === 1 ? '1 ainda ia sair' : porSair + ' ainda iam sair'})` : ''}` : '']
      .concat(prods && prods.length ? [`${n(prods.length, 'item', 'itens')} do que ela vende`] : [], vis && vis.length ? [n(vis.length, 'visita', 'visitas')] : [], ['os links de aprovação dela']).filter(Boolean);
    vai.lastElementChild.innerHTML = `Vão junto: ${L.length > 1 ? L.slice(0, -1).join(', ') + ' e ' + L[L.length - 1] : L[0]}.`;
    C.$('mk-rm-ok').addEventListener('click', async ev => {
      const b = ev.currentTarget; b.disabled = true;
      const ig = C.$('mk-rm-ig');
      try{ await remove(m, posts, ig && ig.checked ? c : null); }
      catch(e){ b.disabled = false; C.toast(C.errMsg(e, 'Não deu pra remover agora.')); }
    });
  }
  async function remove(m, posts, c){
    await C.api.del('corre_portfolio', { id: m.id });
    M.list = M.list.filter(x => x.id !== m.id);
    /* o logo e as artes, fotos e vídeos dos posts dela saem do armazenamento (o banco já apagou os posts) */
    const urls = [m.logo_url].concat(C.estudio && C.estudio.urlsDo ? (posts || []).flatMap(C.estudio.urlsDo) : []);
    [...new Set(urls.filter(Boolean))].forEach(u => { try{ const r = C.api.unlink(u); if(r && r.catch) r.catch(() => {}); }catch(e){} });
    let foi = '';
    if(c) try{ await C.api.del('corre_ig_contas', { id: c.id }); foi = ` e o @${c.username} desconectado`; if(C.ig) C.ig.esquece(); }catch(e){}
    C.closeSheet(); C.toast(`${m.marca} removida${foi}.`, 3600);
    /* tava no Studio Cria dessa marca: volta pro Studio Cria, não pra uma marca que não existe mais */
    if(location.hash.includes(m.id)) history.replaceState(null, '', '#/studio');
    volta();
  }

  /* ---------- STUDIO: escolhe a marca e cria com a IA, direto (sem passar pelo Portfólio e pelo painel) ----------
     As referências seguem as da marca: as 9 últimas do Instagram dela e as que a pessoa sobe. */
  /* v3.19: o Studio Cria tem porta. Você entra (escolhe a marca), trabalha no modo Studio Cria (sem o menu do app) e sai
     quando quiser. Entrou uma vez nesta aba, a porta abre direto até você tocar em "Sair do Studio Cria". */
  const DENTRO_K = 'corre-studio-dentro';
  const dentro = () => { try{ return sessionStorage.getItem(DENTRO_K) === '1'; }catch(e){ return false; } };
  const marcaDentro = v => { try{ if(v) sessionStorage.setItem(DENTRO_K, '1'); else sessionStorage.removeItem(DENTRO_K); }catch(e){} };
  C.views.studio = async function(app, id){
    document.title = 'Studio Cria · Corre';
    id = String(id || '').replace(/^\/+/, '');
    /* v4.18: o aviso "Hora de postar" chega em #/studio/postar/ID: entra no Studio Cria e abre esse post com o Postar na mão
       (o endereço volta pra #/studio, pra recarregar a página não abrir o post de novo) */
    let post = '';
    const mp = /^postar\/([0-9a-f-]{36})$/i.exec(id);
    if(mp){ post = mp[1]; id = 'entrar'; history.replaceState(null, '', '#/studio'); }
    if(!id && dentro()) id = 'entrar';
    if(!id) return porta(app);
    marcaDentro(true);
    app.innerHTML = C.header('studio-dentro') + `<div class="st-barra" role="banner"><span class="st-barra-t">${ico('magia')} Studio Cria</span><span class="st-barra-sp"></span><button type="button" class="btn sm" data-act="studio-trocar" title="Trocar marca">${ico('marcas')} <span class="st-l">Trocar marca</span></button><button type="button" class="btn sm pri" data-act="studio-sair">${ico('prev')} <span class="st-l">Sair do Studio Cria</span><span class="st-s">Sair</span></button></div><main class="wrap studio" id="sd"><section class="card"><p>Abrindo o Studio Cria…</p></section></main>`;
    document.body.classList.add('em-studio');
    try{ await Promise.all([carregar(), acessoPronto()]); }catch(e){}
    if(!C.$('sd')) return;
    const mk = M.list.find(x => x.id === id);
    if(mk && foraDoPlano(mk)){ C.$('sd').outerHTML = foraHTML(mk); return; }
    if(C.studio) C.studio.mount(C.$('sd'), { com: noPlano(), sem: M.list.filter(m => !m.rede), id: id === 'entrar' ? '' : id, post });
  };
  async function porta(app){
    app.innerHTML = C.header('studio') + '<main class="wrap st-porta-w"><section class="card"><p>Abrindo a porta do Studio Cria…</p></section></main>';
    try{ await Promise.all([carregar(), acessoPronto()]); }catch(e){}
    const com = noPlano(), sem = M.list.filter(m => !m.rede), fora = comRede().filter(m => !com.includes(m));
    if(!/^#\/studio\/?$/.test(location.hash)) return;
    app.innerHTML = C.header('studio') + `<main class="wrap st-porta-w"><section class="st-porta">
      <span class="st-porta-k">${ico('magia')} Studio Cria</span>
      <h1>Entra no Studio Cria.</h1>
      <p>Programa o mês inteiro de uma vez: a IA faz as artes com a cara da marca e escreve as legendas (ou você sobe as tuas), e ${C.ig && !C.ig.aberto() ? 'cada post entra na agenda, no dia e na hora (a postagem automática no Instagram chega em breve)' : 'cada post sai sozinho no Instagram, no dia e na hora'}. Escolhe com qual marca vai trampar agora.</p>
      ${com.length ? `<div class="st-porta-l">${com.length > 1 ? `<button type="button" class="st-porta-mk todas" data-act="studio-entrar" data-id="todas"><span class="sd-todas" aria-hidden="true">${com.slice(0, 3).map(x => `<i style="--c:${esc(x.cor || '#FFE800')}"></i>`).join('')}</span><b>Todas as marcas</b><small>${com.length} marcas</small></button>` : ''}${com.map(m => `<div class="st-porta-c"><button type="button" class="st-porta-mk" data-act="studio-entrar" data-id="${m.id}"><span class="st-mk-av">${C.marcaLogo(m, 'l')}${C.ig ? C.ig.selo(m) : ''}</span><b>${esc(m.marca)}</b><small>@${esc(m.rede)}${C.ig ? C.ig.seloTx(m) : ''}</small></button>${opBtn(m)}</div>`).join('')}${fora.map(m => `<div class="st-porta-c"><button type="button" class="st-porta-mk fora" data-act="mk-plus">${C.marcaLogo(m, 'l')}<b>${esc(m.marca)}</b><small>fora do plano</small></button>${opBtn(m)}</div>`).join('')}</div>`
        : `<p class="st-porta-v"><b>${sem.length ? 'Liga o Instagram de uma marca pra entrar.' : 'Põe a primeira marca que você trampa.'}</b> Com o @ da marca, o Studio Cria puxa as últimas postagens dela como referência pra IA.</p>`}
      <div class="acts">${sem.slice(0, 3).map(m => `<button type="button" class="btn sm" data-act="mk-edit" data-id="${m.id}">${ico('ig')} Ligar o Insta da ${esc(m.marca)}</button>`).join('')}<button type="button" class="btn sm" data-act="mk-nova">${ico('plus')} Nova marca</button></div>
    </section>${C.ig ? `<p class="sd-ig sd-auto st-porta-ig" id="st-porta-ig" data-ig-linha data-rede="${esc(com.length === 1 ? com[0].rede : '')}">${C.ig.linha()}</p>` : ''}</main>`;
    /* v3.41: a porta também diz se o Instagram tá ligado (é aqui que a volta do login cai) */
    if(C.ig) C.ig.carrega().then(() => { C.ig.linhas(); C.ig.selos(); }, () => {});
  }

  /* ---------- painel da marca ---------- */
  C.views.marca = async function(app, id){
    app.innerHTML = C.header('marcas') + '<main class="wrap"><section class="card"><p>Abrindo o painel…</p></section></main>';
    let m = null;
    try{ await Promise.all([carregar(), acessoPronto()]); m = M.list.find(x => x.id === id); }catch(e){}
    if(!m){ app.innerHTML = C.header('marcas') + '<main class="wrap"><section class="card"><p>Essa marca não tá no teu portfólio.</p><div class="acts"><a class="btn pri" href="#/marcas">Ver portfólio</a></div></section></main>'; return; }
    if(!m.rede){
      app.innerHTML = C.header('marcas') + `<main class="wrap"><section class="card mk-head">${C.marcaLogo(m, 'l')}<div><h1>${esc(m.marca)}</h1><p class="note">Liga a rede social dessa marca pra abrir o painel.${pro() || lim() === Infinity ? '' : ` No teu plano, ${lim() === 1 ? '1 marca tem' : lim() + ' marcas têm'} painel.`}</p></div><div class="acts"><button type="button" class="btn pri" data-act="mk-edit" data-id="${m.id}">Ligar rede social</button><a class="btn" href="#/marcas">Voltar</a></div></section></main>`;
      return;
    }
    if(foraDoPlano(m)){ app.innerHTML = C.header('marcas') + foraHTML(m); return; }
    const nm = C.norm(m.marca), ym = C.hojeBR().slice(0, 7);
    let ls = [];
    try{ ls = (await C.api.q('corre_lancamentos', { eq: { dono: C.uid() }, gt: { valor: 0 }, order: ['data', false], limit: 2000 })).filter(l => C.norm(l.cliente) === nm && l.categoria !== 'transferencia'); }catch(e){}
    /* v3.55: "Últimos 12 meses" é dos últimos 12 (antes somava tudo que já entrou) */
    let [ay, am] = ym.split('-').map(Number); am -= 11; if(am < 1){ am += 12; ay--; } const desde = `${ay}-${String(am).padStart(2, '0')}-01`;
    const mes = ls.filter(l => String(l.data).slice(0, 7) === ym), tot = ls.filter(l => String(l.data).slice(0, 10) >= desde).reduce((s, l) => s + Number(l.valor), 0), totMes = mes.reduce((s, l) => s + Number(l.valor), 0);
    const assuntos = [m.marca].concat(m.segmento && C.norm(m.segmento) !== nm ? [m.segmento] : []);
    app.innerHTML = C.header('marcas') + `<main class="wrap">
      <section class="card mk-head">${C.marcaLogo(m, 'l')}<div><span class="mono">Painel da marca</span><h1>${esc(m.marca)}</h1><p class="note">${esc([m.segmento, m.papel].filter(Boolean).join(' · '))}</p></div>
        <div class="acts"><a class="btn pri" href="https://www.instagram.com/${encodeURIComponent(m.rede)}/" target="_blank" rel="noopener">${ico('ig')} @${esc(m.rede)}</a>${m.link ? `<a class="btn" href="${esc(m.link)}" target="_blank" rel="noopener">${ico('ext')} Site</a>` : ''}<button type="button" class="btn" data-act="mk-edit" data-id="${m.id}">Editar</button></div></section>
      <div class="two">
        <section class="card"><h2 class="ch">Grana da marca</h2>
          <div class="g-nums two-n"><div><span>Este mês</span><b class="num">${money(totMes)}</b></div><div><span>Últimos 12 meses</span><b class="num">${money(tot)}</b></div></div>
          ${ls.length ? `<ul class="g-lanc slim">${ls.slice(0, 6).map(l => `<li><span class="dt num">${C.ddmm(l.data)}</span><span class="ds"><b>${esc(l.descricao)}</b></span><span></span><b class="vl num">${money(l.valor)}</b><span></span></li>`).join('')}</ul>` : `<p class="note">Nenhuma entrada marcada com ${esc(m.marca)} ainda. Na Grana, coloca "${esc(m.marca)}" como cliente.</p>`}
          <div class="acts"><a class="btn sm" href="#/grana">Abrir a Grana</a></div>
        </section>
        <section class="card"><h2 class="ch">Na banca sobre ${esc(m.marca)}</h2><div id="mk-banca"><p class="note">Procurando…</p></div></section>
      </div>
      <section class="card" id="mk-vende" data-id="${m.id}"><p class="note">…</p></section>
      <section class="card" id="mk-estudio"></section>
    </main>`;
    if(C.vendas) C.vendas.carregar(true).then(() => { const el = C.$('mk-vende'); if(el) el.innerHTML = C.vendas.painelHTML(m.id); }).catch(() => {});
    if(C.estudio) C.estudio.mount(C.$('mk-estudio'), m);
    const res = C.bancaAssunto ? await C.bancaAssunto(assuntos) : null;
    const el = C.$('mk-banca'); if(!el) return;
    const itens = res ? assuntos.flatMap(a => res[a] || []) : [];
    el.innerHTML = itens.length ? `<ol class="b-list">${itens.slice(0, 8).map(i => `<li><a href="${esc(i.u)}" target="_blank" rel="noopener"><b>${esc(i.t)}</b></a><span class="by"><span>${esc(i.f || '')}${i.d ? ' · ' + C.rel(i.d) : ''}</span></span></li>`).join('')}</ol>`
      : `<p class="note">Nada novo nos últimos dias.</p><div class="acts">${assuntos.map(a => `<a class="btn sm" href="${C.gnews(a)}" target="_blank" rel="noopener">${ico('ext')} Notícias de ${esc(a)}</a>`).join('')}</div>`;
  };

  Object.assign(C.acts, {
    'studio-entrar': el => { marcaDentro(true); C.go('#/studio/' + el.dataset.id); },
    'studio-trocar': () => { marcaDentro(false); C.go('#/studio'); },
    'studio-sair': () => {
      marcaDentro(false); document.body.classList.remove('em-studio');
      /* no balcão da barraca do Studio Cria, sair é voltar pra rua do Correverso */
      if(C.EMBED){ C.pai('fechar'); return; }
      /* v5.09: sair do Studio Cria volta pro Corre Studio (pra página de onde a pessoa entrou, ou O teu dia), e não pro
         perfil, que é da Rede (o Thales: "ele volta pra rede ao invés de voltar pra página do studio mesmo") */
      C.toast('Saiu do Studio Cria.'); C.go(C.voltaPra ? C.voltaPra(/^#\/studio(\/|$)/) : '#/dia');
    },
    'mk-nova': () => form(null),
    'mk-edit': async el => { if(!M.list.length) try{ await carregar(); }catch(e){} form(M.list.find(m => m.id === el.dataset.id)); },
    'mk-op': async el => { if(!M.list.length) try{ await carregar(); }catch(e){} opSheet(M.list.find(m => m.id === el.dataset.id)); },
    'mk-rm': async el => { if(!M.list.length) try{ await carregar(); }catch(e){} rmSheet(M.list.find(m => m.id === el.dataset.id)); },
    'mk-sug': el => { form(null); C.$('mk-n').value = el.dataset.n; C.$('mk-n').dispatchEvent(new Event('input', { bubbles: true })); },
    'mk-plus': () => { if(C.naLoja && C.naLoja()){ C.toast('Mais redes não se assina pelo app.', 3600); return; } plusSheet(); },
    'mk-plus-ok': async () => { try{ await C.saveMe({ quer_plus: true }); }catch(e){} C.closeSheet(); C.toast('Tá na lista do Corre+. A gente te chama.', 3600); }
  });

  C.home.push({ k: 'marcas', o: 4, async html(){
    try{ await carregar(); }catch(e){ return ''; }
    return `<a class="hcard marcas-mini" href="#/marcas">
      <div class="hc-top"><span class="hc-name">Portfólio</span><span class="mono">${M.list.length} ${M.list.length === 1 ? 'marca' : 'marcas'}</span></div>
      ${M.list.length ? `<div class="mk-stack">${M.list.slice(0, 6).map(m => C.marcaLogo(m, 's')).join('')}</div>` : '<p class="note">Bota as marcas que você tá tocando agora.</p>'}
      ${M.sug.length ? `<p class="note">${M.sug.length} ${M.sug.length === 1 ? 'cliente da Grana pode entrar' : 'clientes da Grana podem entrar'} no portfólio.</p>` : ''}
      <span class="hc-go">${M.list.length ? 'Ver portfólio' : 'Adicionar marca'} ${ico('next')}</span>
    </a>`;
  } });
})();
