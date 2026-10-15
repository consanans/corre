/* CORRE · GRUPOS (v3.36). Qualquer pessoa cria um grupo, do tema que quiser.
   Aberto: entra direto e todo mundo vê os posts. Fechado: pede pra entrar (o dono ou um moderador aceita) e só quem tá
   dentro vê os posts e quem tá no grupo. Cada grupo tem um mural (posts, respostas, enquetes e um post fixado) e um papo
   ao vivo nas Mensagens. O dono nomeia moderadores; moderador aceita pedido, tira post e resposta, fixa post, tira e bane.
   #/grupos é a vitrine (os teus e os pra descobrir); #/g/endereço é o grupo (abas: posts, membros, sobre).
   As regras moram no banco (supabase/delta-v336.sql). */
(function(){
  'use strict';
  const C = window.Corre, { esc, ico } = C;
  const GR = { g: null, aba: 'posts', lista: null, q: '', seq: 0, capa: null, capaUrl: '' };
  const rpc = (n, a) => C.api.rpc(n, a || {});
  /* as cores do grupo (sem verde) */
  const CORES = ['#2E5BFF', '#FF4F9A', '#FF8A3D', '#C6A6FF', '#F2EC54', '#5C9BC4', '#B4152E', '#0F1218'];
  const CLARAS = new Set(['#F2EC54', '#C6A6FF']);
  const ERROS = {
    nome: 'O nome do grupo vai de 3 a 60 letras.', limite_grupos: 'Você já tem 10 grupos. Apaga um pra criar outro.', limite_dia: 'Hoje já deu: 3 grupos novos por dia.',
    capa: 'A capa não subiu direito. Tenta de novo.', banido: 'Você não pode entrar nesse grupo.', dono: 'Só o dono do grupo pode fazer isso.',
    mod: 'Só quem modera o grupo pode fazer isso.', grupo: 'Esse grupo não tá mais aqui.', fora: 'Entra no grupo pra conversar.',
    limite_entrar: 'Você já tá em 100 grupos. Sai de algum pra entrar nesse.', limite_pedidos: 'Tem muito pedido teu esperando. Espera responderem.',
    estado: 'Isso já mudou. Abre o grupo de novo.', membro: 'Essa pessoa não tá no grupo.', eu: 'Isso seria contigo mesmo.',
    fixo: 'Só dá pra fixar post do grupo (que não seja pedaço de fio).', perfil: 'Termina teu perfil pra entrar em grupo.'
  };
  const semBanco = e => !!e && (e.code === 'PGRST202' || e.code === '42883' || /Could not find the function|function .* does not exist/i.test(e.message || ''));
  const erroTxt = (e, f) => { const h = (e && (e.hint || e.message)) || ''; return ERROS[h] || (semBanco(e) ? 'Os grupos ainda tão chegando no Corre.' : C.errMsg(e, f)); };
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  const nMembros = g => plural(Number(g.membros_n) || 0, 'membro', 'membros');
  const mod = g => !!g && !!g.eu && g.eu.estado === 'ativo' && (g.eu.papel === 'dono' || g.eu.papel === 'mod');
  const dentro = g => !!g && !!g.eu && g.eu.estado === 'ativo';
  /* v3.55: a capa vai dentro de url('…') no style: aspas, parênteses, barra invertida e espaço ficam de fora (abriam CSS injetado na página do grupo) */
  const capaOk = u => /^(https:\/\/[A-Za-z0-9._~\/?#=%:@!$*+,;-]+|data:image\/[a-z+]+;base64,[A-Za-z0-9+\/=]+)$/.test(String(u || ''));
  const linkDe = g => { const me = C.st.me, de = me && me.handle && me.visibilidade !== 'mocado' ? '?de=' + encodeURIComponent(me.handle) : ''; return `${location.origin}${location.pathname}${de}#/g/${g.slug}`; };

  /* a carinha do grupo: a capa, ou a inicial no quadrado da cor */
  function av(g, tam){
    const cor = /^#[0-9a-f]{6}$/i.test(g.cor || '') ? g.cor.toUpperCase() : '#2E5BFF';
    const ini = String(g.nome || '?').replace(/[^\p{L}\p{N} ]/gu, '').trim().split(/\s+/).slice(0, 2).map(x => x[0] || '').join('').toUpperCase() || '#';
    return `<span class="gr-av ${tam || 'm'}${CLARAS.has(cor) ? ' claro' : ''}" style="--gc:${cor}" aria-hidden="true">${capaOk(g.capa_url) ? `<img src="${esc(g.capa_url)}" alt="" loading="lazy">` : `<b>${esc(ini)}</b>`}</span>`;
  }
  C.grupoAv = av;
  const selo = g => g.fechado ? `<span class="gr-selo fechado">${ico('lock')} Fechado</span>` : `<span class="gr-selo">Aberto</span>`;

  /* o botão de entrar, em cada situação */
  function botaoHTML(g, onde){
    const e = g.eu && g.eu.estado;
    /* sem login: no navegador de dentro do Instagram/WhatsApp o Google não deixa entrar, então o botão abre no navegador */
    if(!C.uid()) return C.insta ? C.insta.botaoEntrar('Entrar no Corre pra participar', onde === 'topo' ? '' : 'sm')
      : `<button type="button" class="btn ${onde === 'topo' ? 'pri' : 'sm'}" data-act="google"><span>Entrar no Corre pra participar</span></button>`;
    if(e === 'ativo') return onde === 'topo' ? '' : `<span class="gr-tag dentro">${g.eu.papel === 'dono' ? 'Teu grupo' : g.eu.papel === 'mod' ? 'Você modera' : 'Você tá dentro'}</span>`;
    if(e === 'banido') return `<span class="gr-tag">Você não pode entrar</span>`;
    if(e === 'pedido') return `<button type="button" class="btn ${onde === 'topo' ? '' : 'sm'}" data-act="gr-cancela" data-id="${esc(g.id)}" title="Cancelar o pedido">${ico('clock')} Pedido enviado</button>`;
    return g.fechado ? `<button type="button" class="btn pri ${onde === 'topo' ? '' : 'sm'}" data-act="gr-pede" data-id="${esc(g.id)}">${ico('lock')} Pedir pra entrar</button>`
      : `<button type="button" class="btn pri ${onde === 'topo' ? '' : 'sm'}" data-act="gr-entra" data-id="${esc(g.id)}">${ico('plus')} Entrar no grupo</button>`;
  }
  function cardHTML(g){
    return `<li class="gr-card"><a class="gr-card-a" href="#/g/${esc(g.slug)}">${av(g, 'm')}<span class="gr-card-tx"><b>${esc(g.nome)}</b>
      <small>${nMembros(g)} · ${g.fechado ? 'fechado' : 'aberto'}</small>${g.descricao ? `<span class="gr-card-d">${esc(g.descricao)}</span>` : ''}</span></a>
      <span class="gr-card-b">${botaoHTML(g, 'card')}</span></li>`;
  }

  /* ---------- #/grupos: os teus e os pra descobrir ---------- */
  C.views.grupos = async function(app){
    document.title = 'Grupos · Corre';
    app.innerHTML = C.header('grupos') + `<main class="wrap gr-pg">
      <div class="hello gr-hello"><h1><span class="hl">Grupos</span></h1><p>Gente do mesmo corre num lugar só: pergunta, número aberto, indicação e papo ao vivo.</p>
        ${C.uid() && C.st.me ? `<div class="acts"><button type="button" class="btn pri" data-act="gr-novo">${ico('plus')} Criar grupo</button></div>` : ''}</div>
      <section id="gr-meus" aria-label="Teus grupos"></section>
      <section class="gr-desc" aria-label="Descobrir grupos">
        <div class="sec-row"><h2 class="sec-t"><span class="hl">Descobrir</span></h2></div>
        <input class="inp gr-q" id="gr-q" type="search" placeholder="Procurar grupo: nome, assunto ou tag" value="${esc(GR.q)}" autocomplete="off" aria-label="Procurar grupo">
        <ul class="gr-lista" id="gr-lista"><li class="gr-vazio">Carregando os grupos…</li></ul>
      </section></main>`;
    let t = 0;
    C.$('gr-q').addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => { GR.q = e.target.value.trim(); carregaLista(); }, 250); });
    await carregaLista();
  };
  async function carregaLista(){
    const seq = ++GR.seq, ul = C.$('gr-lista'), meus = C.$('gr-meus'); if(!ul) return;
    let L = [];
    try{ L = (await rpc('corre_grupos_lista', { p_busca: GR.q, p_lim: 120 })) || []; }
    catch(e){ if(seq === GR.seq && ul.isConnected) ul.innerHTML = `<li class="gr-vazio">${esc(erroTxt(e, 'Não deu pra abrir os grupos agora.'))}</li>`; return; }
    if(seq !== GR.seq || !ul.isConnected) return;
    GR.lista = L;
    const mL = L.filter(g => g.eu && (g.eu.estado === 'ativo' || g.eu.estado === 'pedido')), oL = L.filter(g => !mL.includes(g));
    if(meus) meus.innerHTML = !GR.q && mL.length ? `<div class="sec-row"><h2 class="sec-t"><span class="hl">Teus grupos</span></h2></div><ul class="gr-lista meus">${mL.map(cardHTML).join('')}</ul>` : '';
    const lista = GR.q ? L : oL;
    ul.innerHTML = lista.length ? lista.map(cardHTML).join('')
      : `<li class="gr-vazio">${GR.q ? `Nenhum grupo com "${esc(GR.q)}". ${C.uid() && C.st.me ? 'Cria o primeiro: tu vira dono.' : ''}` : mL.length ? 'Você já tá em todos os grupos do Corre. Cria um novo!' : 'Ainda não tem grupo nenhum. Cria o primeiro.'}${C.uid() && C.st.me ? `<button type="button" class="btn pri sm" data-act="gr-novo">${ico('plus')} Criar grupo</button>` : ''}</li>`;
  }

  /* ---------- #/g/endereço[/aba] ---------- */
  C.views.grupo = async function(app, resto){
    const [slugCru, abaCru] = String(resto || '').split('/');
    const slug = decodeURIComponent(slugCru || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
    GR.aba = ['posts', 'membros', 'sobre'].includes(abaCru) ? abaCru : 'posts';
    const rota = C.rota;
    app.innerHTML = C.header('grupos') + `<main class="wrap gr-pg"><section class="card"><p>Abrindo o grupo…</p></section></main>`;
    let g = null;
    try{ g = await rpc('corre_grupo_ver', { p_slug: slug }); }
    catch(e){ if(rota === C.rota) app.innerHTML = C.header('grupos') + `<main class="wrap gr-pg"><section class="card"><h2 class="ch">${esc(erroTxt(e, 'Não deu pra abrir o grupo agora.'))}</h2><div class="acts"><a class="btn" href="#/grupos">Ver os grupos</a></div></section></main>`; return; }
    if(rota !== C.rota) return;
    if(!g){ app.innerHTML = C.header('grupos') + `<main class="wrap gr-pg"><section class="card"><h2 class="ch">Esse grupo não existe (ou foi apagado).</h2><div class="acts"><a class="btn pri" href="#/grupos">Ver os grupos</a></div></section></main>`; return; }
    GR.g = g;
    if(!C.uid()){ try{ localStorage.setItem('corre-volta', location.hash); }catch(e){} }
    document.title = `${g.nome} · Grupos · Corre`;
    pintaGrupo(app);
  };
  function topoHTML(g){
    const cor = /^#[0-9a-f]{6}$/i.test(g.cor || '') ? g.cor : '#2E5BFF';
    const rosto = (g.rosto || []).slice(0, 6).map(p => C.avatar(p, 's')).join('');
    const acoes = [botaoHTML(g, 'topo'),
      dentro(g) ? `<a class="btn pri" href="#/msg/g/${esc(g.slug)}">${ico('send')} Papo do grupo</a>` : '',
      `<button type="button" class="btn" data-act="gr-link">${ico('share')} Chamar gente</button>`,
      dentro(g) ? `<button type="button" class="cbtn" data-act="gr-menu" aria-label="Mais opções do grupo">${ico('dots')}</button>` : ''].filter(Boolean).join('');
    return `<section class="card gr-topo">
      <div class="gr-capa${capaOk(g.capa_url) ? ' com-capa' : ''}" style="--gc:${cor}${capaOk(g.capa_url) ? `;background-image:url('${esc(g.capa_url)}')` : ''}" aria-hidden="true"></div>
      <div class="gr-id">${av(g, 'l')}<div class="gr-nm"><h1>${esc(g.nome)}</h1><p class="gr-sub">${selo(g)} <span>${nMembros(g)}</span>${rosto ? `<span class="gr-rosto">${rosto}</span>` : ''}</p></div></div>
      ${g.descricao ? `<p class="gr-desc-t">${esc(g.descricao)}</p>` : ''}
      ${g.tags && g.tags.length ? `<p class="gr-tags">${g.tags.map(t => `<button type="button" class="chip" data-act="gr-tag" data-t="${esc(t)}">#${esc(t)}</button>`).join('')}</p>` : ''}
      <div class="acts gr-acts">${acoes}</div>
      ${mod(g) && g.pedidos ? `<a class="gr-ped" href="#/g/${esc(g.slug)}/membros">${ico('bell')} ${plural(g.pedidos, 'pedido pra entrar', 'pedidos pra entrar')}</a>` : ''}
    </section>`;
  }
  function abasHTML(g){
    const A = [['posts', 'Posts'], ['membros', 'Membros'], ['sobre', 'Sobre']];
    return `<nav class="mu-tabs gr-abas" role="tablist" aria-label="${esc(g.nome)}">${A.map(([k, t]) => `<a role="tab" href="#/g/${esc(g.slug)}${k === 'posts' ? '' : '/' + k}" aria-selected="${GR.aba === k}">${t}${k === 'membros' && mod(g) && g.pedidos ? ` <b class="num">${g.pedidos}</b>` : ''}</a>`).join('')}</nav>`;
  }
  function pintaGrupo(app){
    const g = GR.g;
    app.innerHTML = C.header('grupos') + `<main class="wrap gr-pg gr-um">
      <a class="fd-volta" href="#/grupos">${ico('prev')} Grupos</a>
      ${topoHTML(g)}${abasHTML(g)}
      <div id="gr-corpo" class="gr-corpo"></div></main>`;
    const el = C.$('gr-corpo');
    if(GR.aba === 'membros') return membros(el);
    if(GR.aba === 'sobre') return sobre(el);
    if(!g.ve){
      el.innerHTML = `<section class="card gr-tranca">${ico('lock')}<h2 class="ch">Grupo fechado</h2><p>Só quem tá dentro vê os posts, quem participa e o papo. ${g.eu && g.eu.estado === 'pedido' ? 'Teu pedido tá esperando o dono ou um moderador.' : 'Pede pra entrar: o dono ou um moderador aceita.'}</p>${g.regras ? `<details class="gr-regras-mini"><summary>Regras do grupo</summary><p>${esc(g.regras)}</p></details>` : ''}<div class="acts">${botaoHTML(g, 'topo')}</div></section>`;
      return;
    }
    if(C.feed && C.feed.mountGrupo) C.feed.mountGrupo(el, g);
  }

  /* ---------- membros (e, pra quem modera, os pedidos e os banidos) ---------- */
  async function membros(el){
    const g = GR.g, rota = C.rota;
    if(!g.ve){ el.innerHTML = `<section class="card gr-tranca">${ico('lock')}<p>Grupo fechado: só quem tá dentro vê quem participa.</p></section>`; return; }
    el.innerHTML = '<section class="card"><p class="note">Carregando quem tá no grupo…</p></section>';
    let [ativos, pedidos, banidos] = [[], [], []];
    try{
      [ativos, pedidos, banidos] = await Promise.all([rpc('corre_grupo_membros_lista', { p_grupo: g.id, p_estado: 'ativo', p_lim: 500 }),
        mod(g) ? rpc('corre_grupo_membros_lista', { p_grupo: g.id, p_estado: 'pedido', p_lim: 200 }) : [],
        mod(g) ? rpc('corre_grupo_membros_lista', { p_grupo: g.id, p_estado: 'banido', p_lim: 200 }) : []]);
    }catch(e){ if(rota === C.rota) el.innerHTML = `<section class="card"><p class="note">${esc(erroTxt(e, 'Não deu pra abrir a lista agora.'))}</p></section>`; return; }
    if(rota !== C.rota) return;
    const quem = m => { const p = m.perfil || {}; return p.handle ? `<a class="gr-m-p" href="#/@${esc(p.handle)}">${C.avatar(p, 's')}<span><b>${esc(p.nome || '')}</b><small>@${esc(p.handle)}${p.faz ? ' · ' + esc(p.faz) : ''}</small></span></a>` : `<span class="gr-m-p">${C.avatar({ nome: p.nome || '?' }, 's')}<span><b>${esc(p.nome || 'Perfil mocado')}</b></span></span>`; };
    const papel = m => m.papel === 'dono' ? '<span class="gr-tag dono">Dono</span>' : m.papel === 'mod' ? '<span class="gr-tag mod">Moderador</span>' : '';
    const pode = m => mod(g) && m.id !== C.uid() && m.papel !== 'dono' && (m.papel !== 'mod' || g.eu.papel === 'dono');
    el.innerHTML = `${pedidos.length ? `<section class="card gr-peds"><h2 class="ch">${ico('bell')} ${plural(pedidos.length, 'pedido pra entrar', 'pedidos pra entrar')}</h2>
        <ul class="gr-ms">${pedidos.map(m => `<li class="gr-m" id="grm-${esc(m.id)}">${quem(m)}${m.recado ? `<p class="gr-recado">“${esc(m.recado)}”</p>` : ''}<span class="gr-m-a"><button type="button" class="btn sm pri" data-act="gr-decide" data-a="aceitar" data-id="${esc(m.id)}">Aceitar</button><button type="button" class="btn sm" data-act="gr-decide" data-a="recusar" data-id="${esc(m.id)}">Recusar</button></span></li>`).join('')}</ul></section>` : ''}
      <section class="card"><h2 class="ch">${nMembros({ membros_n: ativos.length })}</h2>
        <ul class="gr-ms">${ativos.map(m => `<li class="gr-m" id="grm-${esc(m.id)}">${quem(m)}${papel(m)}${pode(m) ? `<button type="button" class="cbtn plain" data-act="gr-m-menu" data-id="${esc(m.id)}" aria-label="Opções pra ${esc((m.perfil || {}).nome || 'essa pessoa')}">${ico('dots')}</button>` : ''}</li>`).join('')}</ul></section>
      ${banidos.length ? `<section class="card gr-ban"><h2 class="ch">${plural(banidos.length, 'pessoa banida', 'pessoas banidas')}</h2><ul class="gr-ms">${banidos.map(m => `<li class="gr-m">${quem(m)}<button type="button" class="btn sm ghost" data-act="gr-decide" data-a="desbanir" data-id="${esc(m.id)}">Desbanir</button></li>`).join('')}</ul></section>` : ''}`;
    GR.membros = ativos;
  }

  /* ---------- sobre: descrição, regras, quem criou; o dono edita e apaga ---------- */
  function sobre(el){
    const g = GR.g, d = g.dono || {};
    const quando = (() => { try{ return new Date(g.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'long', year: 'numeric' }); }catch(e){ return ''; } })();
    el.innerHTML = `<section class="card gr-sobre">
      <h2 class="ch">Sobre</h2><p>${g.descricao ? esc(g.descricao) : '<span class="note">Sem descrição.</span>'}</p>
      <h3 class="gr-h3">Regras</h3><p class="gr-regras">${g.regras ? esc(g.regras) : '<span class="note">O dono ainda não escreveu as regras. Vale o bom senso: sem spam, sem golpe, sem expor ninguém.</span>'}</p>
      <h3 class="gr-h3">Como funciona</h3><ul class="gr-como"><li>${g.fechado ? 'Fechado: quem quiser entrar pede, e o dono ou um moderador aceita. Só quem tá dentro vê os posts.' : 'Aberto: qualquer pessoa do Corre entra e vê os posts.'}</li><li>Só quem é do grupo posta e responde. Post do grupo fica no grupo (não vai pro teu feed).</li><li>O papo ao vivo fica nas tuas Mensagens.</li></ul>
      <p class="fine">Criado ${quando ? 'em ' + esc(quando) : ''}${d.handle ? ` por <a href="#/@${esc(d.handle)}">${esc(d.nome || '@' + d.handle)}</a>` : ''}.</p>
      ${g.eu && g.eu.papel === 'dono' && g.eu.estado === 'ativo' ? `<div class="acts"><button type="button" class="btn pri" data-act="gr-editar">${ico('edit')} Editar grupo</button><button type="button" class="btn ghost" data-act="gr-apagar">${ico('trash')} Apagar grupo</button></div>` : ''}
      ${dentro(g) && g.eu.papel !== 'dono' ? `<div class="acts"><button type="button" class="btn ghost" data-act="gr-sair">Sair do grupo</button></div>` : ''}
    </section>`;
  }

  /* ---------- criar e editar ---------- */
  function abreForm(g){
    if(!C.uid() || !C.st.me){ C.toast('Entra no Corre pra criar grupo.'); return; }
    const v = g || { nome: '', descricao: '', regras: '', tags: [], cor: CORES[Math.floor(Math.random() * 4)], capa_url: '', fechado: false };
    GR.capa = null; GR.capaUrl = v.capa_url || '';
    C.sheet(`<form class="form gr-form" id="gr-f" novalidate><div class="sheet-head"><h2>${g ? `${ico('edit')} Editar grupo` : `${ico('gente')} Criar grupo`}</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <div class="gr-f-prev" id="gr-f-prev">${av(v, 'l')}</div>
      <div class="fld"><label for="gr-nome">Nome do grupo</label><input class="inp" id="gr-nome" maxlength="60" required value="${esc(v.nome)}" placeholder="Ex.: Social media de comida"></div>
      <div class="fld"><label for="gr-desc">Do que é o grupo</label><textarea class="inp" id="gr-desc" rows="2" maxlength="300" placeholder="Quem entra aqui e pra quê.">${esc(v.descricao)}</textarea></div>
      <div class="fld"><label for="gr-regras">Regras (opcional)</label><textarea class="inp" id="gr-regras" rows="3" maxlength="1500" placeholder="Ex.: sem spam de curso; print de cliente só sem o nome.">${esc(v.regras)}</textarea></div>
      <div class="fld"><label for="gr-tags">Tags (até 5, separadas por vírgula)</label><input class="inp" id="gr-tags" maxlength="140" value="${esc((v.tags || []).join(', '))}" placeholder="comida, reels, delivery" autocapitalize="none"></div>
      <fieldset class="fld"><legend>Cor</legend><div class="gr-cores">${CORES.map(c => `<label class="gr-cor"><input type="radio" name="gr-cor" value="${c}"${String(v.cor).toUpperCase() === c ? ' checked' : ''}><span style="background:${c}" title="${c}"></span></label>`).join('')}</div></fieldset>
      <div class="fld"><span class="lbl">Capa (opcional)</span><div class="acts gr-capa-acts"><label class="btn sm up-lbl">${ico('camera')} <span id="gr-capa-t">${GR.capaUrl ? 'Trocar a capa' : 'Pôr capa'}</span><input type="file" accept="image/*" id="gr-capa" aria-label="Escolher a capa do grupo"></label>${GR.capaUrl ? `<button type="button" class="btn sm ghost" data-act="gr-sem-capa">Tirar a capa</button>` : ''}</div></div>
      <fieldset class="fld gr-quem"><legend>Quem entra</legend>
        <label class="gr-op"><input type="radio" name="gr-fech" value="0"${v.fechado ? '' : ' checked'}><span><b>Aberto</b><small>Qualquer pessoa do Corre entra e vê os posts.</small></span></label>
        <label class="gr-op"><input type="radio" name="gr-fech" value="1"${v.fechado ? ' checked' : ''}><span><b>Fechado</b><small>Pede pra entrar; só quem tá dentro vê os posts.</small></span></label></fieldset>
      <div class="acts"><button type="submit" class="btn pri">${g ? 'Salvar' : 'Criar o grupo'}</button></div></form>`);
    const prev = () => { const nm = C.$('gr-nome').value || 'Grupo', cor = (document.querySelector('[name="gr-cor"]:checked') || {}).value || '#2E5BFF'; const el = C.$('gr-f-prev'); if(el) el.innerHTML = av({ nome: nm, cor, capa_url: GR.capaUrl }, 'l'); };
    C.$('gr-nome').addEventListener('input', prev);
    document.querySelectorAll('[name="gr-cor"]').forEach(r => r.addEventListener('change', prev));
    C.$('gr-capa').addEventListener('change', e => {
      const f = e.target.files && e.target.files[0]; e.target.value = ''; if(!f) return;
      if(f.type && !/^image\//.test(f.type)){ C.toast('Isso não é uma foto.'); return; }
      GR.capa = f; GR.capaUrl = URL.createObjectURL(f); C.$('gr-capa-t').textContent = 'Trocar a capa'; prev();
    });
    C.$('gr-f').addEventListener('submit', async e => {
      e.preventDefault();
      const b = e.submitter || C.$('gr-f').querySelector('[type=submit]');
      const nome = C.$('gr-nome').value.replace(/\s+/g, ' ').trim();
      if(nome.length < 3){ C.toast('O nome do grupo vai de 3 a 60 letras.'); C.$('gr-nome').focus(); return; }
      const tags = C.$('gr-tags').value.split(/[,\s]+/).map(x => x.replace(/^#/, '').trim()).filter(Boolean).slice(0, 5);
      const cor = (document.querySelector('[name="gr-cor"]:checked') || {}).value || '#2E5BFF', fechado = ((document.querySelector('[name="gr-fech"]:checked') || {}).value) === '1';
      b.disabled = true; b.textContent = g ? 'Salvando…' : 'Criando…';
      try{
        let capa = GR.capaUrl && !/^blob:/.test(GR.capaUrl) ? GR.capaUrl : '';
        if(GR.capa){ const blob = await C.shrink(GR.capa, 1600, .84); capa = await C.api.upload(blob); }
        const args = { p_nome: nome, p_descricao: C.$('gr-desc').value.trim(), p_regras: C.$('gr-regras').value.trim(), p_tags: tags, p_cor: cor, p_capa_url: capa, p_fechado: fechado };
        const r = g ? await rpc('corre_grupo_editar', Object.assign({ p_grupo: g.id }, args)) : await rpc('corre_grupo_criar', args);
        C.closeSheet();
        C.toast(g ? 'Grupo salvo.' : 'Grupo no ar. Chama a galera: o link tá em "Chamar gente".', 3800);
        if(g){ GR.g = r; C.go(`#/g/${r.slug}/sobre`); C.refresh(); } else C.go(`#/g/${r.slug}`);
      }catch(err){ b.disabled = false; b.textContent = g ? 'Salvar' : 'Criar o grupo'; C.toast(erroTxt(err, 'Não deu pra salvar o grupo agora.'), 4200); }
    });
  }

  /* ---------- entrar, pedir, sair ---------- */
  async function entra(id, recado){
    const g = (GR.g && GR.g.id === id) ? GR.g : (GR.lista || []).find(x => x.id === id);
    try{
      const r = await rpc('corre_grupo_entrar', { p_grupo: id, p_recado: recado || '' });
      if(r && r.estado === 'pedido'){ C.toast('Pedido enviado. O dono ou um moderador aceita.', 3600); if(C.push) C.push.avisa('grupo-pedido', id); }
      else C.toast(g ? `Você entrou em ${g.nome}.` : 'Você entrou no grupo.', 3000);
      return r;
    }catch(e){ C.toast(erroTxt(e, 'Não deu pra entrar agora.'), 4000); return null; }
  }
  /* depois de entrar ou sair, redesenha o que tá na tela */
  async function depois(){
    if(/^#\/g\//.test(location.hash)) return C.refresh();
    if(/^#\/grupos/.test(location.hash)) return carregaLista();
  }
  function pedeForm(id){
    const g = (GR.g && GR.g.id === id) ? GR.g : (GR.lista || []).find(x => x.id === id) || {};
    C.sheet(`<form class="form" id="gr-pf"><div class="sheet-head"><h2>${ico('lock')} Pedir pra entrar</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p class="note">${esc(g.nome || 'Esse grupo')} é fechado: o dono ou um moderador aceita. Conta rapidinho quem você é (opcional).</p>
      ${g.regras ? `<details class="gr-regras-mini" open><summary>Regras do grupo</summary><p>${esc(g.regras)}</p></details>` : ''}
      <div class="fld"><label for="gr-rec">Recado</label><textarea class="inp" id="gr-rec" rows="2" maxlength="200" placeholder="Ex.: faço tráfego pra pizzaria em Londrina"></textarea></div>
      <div class="acts"><button type="submit" class="btn pri">Mandar o pedido</button></div></form>`);
    C.$('gr-pf').addEventListener('submit', async e => {
      e.preventDefault(); const b = e.submitter || C.$('gr-pf').querySelector('[type=submit]'); b.disabled = true;
      const r = await entra(id, C.$('gr-rec').value.trim()); if(r){ C.closeSheet(); depois(); } else b.disabled = false;
    });
  }

  /* ---------- o grupo no Início e no perfil ---------- */
  async function faixaHome(el){
    if(!el || !C.uid()) return;
    let L = []; try{ L = (await rpc('corre_grupos_lista', { p_busca: '', p_lim: 40 })) || []; }catch(e){ el.innerHTML = ''; return; }
    if(!el.isConnected) return;
    const meus = L.filter(g => g.eu && g.eu.estado === 'ativo').slice(0, 10);
    el.innerHTML = `<nav class="gr-faixa" aria-label="Teus grupos">${meus.map(g => `<a class="gr-chip" href="#/g/${esc(g.slug)}">${av(g, 's')}<span>${esc(g.nome)}</span></a>`).join('')}
      <a class="gr-chip mais" href="#/grupos">${ico('gente')}<span>${meus.length ? 'Grupos' : 'Grupos: acha a tua turma'}</span></a></nav>`;
  }
  async function doPerfil(el, p){
    if(!el || !p) return;
    let L = []; try{ L = (await rpc('corre_grupos_de', { p_perfil: p.id })) || []; }catch(e){ L = []; }
    if(!el.isConnected) return;
    if(!L.length){ el.innerHTML = ''; return; }
    el.innerHTML = `<div class="sec-row"><h2 class="sec-t"><span class="hl">Grupos</span></h2></div>
      <nav class="gr-faixa perfil" aria-label="Grupos de @${esc(p.handle)}">${L.slice(0, 12).map(g => `<a class="gr-chip" href="#/g/${esc(g.slug)}">${av(g, 's')}<span>${esc(g.nome)}${g.papel === 'dono' ? ' <em>dono</em>' : g.papel === 'mod' ? ' <em>mod</em>' : ''}</span></a>`).join('')}</nav>`;
  }

  /* ---------- ações ---------- */
  const armar = (el, txt) => { if(el.dataset.armed === '1') return true; el.dataset.armed = '1'; el.classList.add('armed'); el.innerHTML = esc(txt); return false; };
  Object.assign(C.acts, {
    'gr-novo': () => abreForm(null),
    'gr-editar': () => { if(GR.g) abreForm(GR.g); },
    'gr-sem-capa': el => { GR.capa = null; GR.capaUrl = ''; el.remove(); const t = C.$('gr-capa-t'); if(t) t.textContent = 'Pôr capa'; const pv = C.$('gr-f-prev'); if(pv){ const nm = (C.$('gr-nome') || {}).value || 'Grupo', cor = (document.querySelector('[name="gr-cor"]:checked') || {}).value; pv.innerHTML = av({ nome: nm, cor }, 'l'); } },
    'gr-entra': async el => { if(!C.st.me){ C.toast('Termina teu perfil pra entrar em grupo.'); return; } el.disabled = true; const r = await entra(el.dataset.id); el.disabled = false; if(r) depois(); },
    'gr-pede': el => { if(!C.st.me){ C.toast('Termina teu perfil pra entrar em grupo.'); return; } pedeForm(el.dataset.id); },
    'gr-cancela': async el => {
      if(!armar(el, 'Toca de novo pra cancelar o pedido')) return;
      try{ await rpc('corre_grupo_sair', { p_grupo: el.dataset.id }); C.toast('Pedido cancelado.'); depois(); }catch(e){ C.toast(erroTxt(e)); }
    },
    'gr-sair': async el => {
      const g = GR.g; if(!g) return;
      if(!armar(el, `Toca de novo pra sair de ${g.nome}`)) return;
      try{ await rpc('corre_grupo_sair', { p_grupo: g.id }); C.closeSheet(); C.toast(`Você saiu de ${g.nome}.`); C.go(`#/g/${g.slug}`); C.refresh(); }catch(e){ C.toast(erroTxt(e)); }
    },
    'gr-link': () => { const g = GR.g; if(!g) return; C.copy(linkDe(g), g.fechado ? 'Link copiado. Quem abrir pede pra entrar.' : 'Link do grupo copiado. Manda pra galera.'); },
    'gr-tag': el => { GR.q = el.dataset.t || ''; C.go('#/grupos'); },
    'gr-menu': () => {
      const g = GR.g; if(!g) return;
      C.sheet(`<div class="form fd-fsheet"><div class="sheet-head"><h2>${esc(g.nome)}</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
        <div class="fd-mops"><a class="btn" href="#/msg/g/${esc(g.slug)}" data-close>${ico('send')} Papo do grupo</a><button type="button" class="btn" data-act="gr-link">${ico('copy')} Copiar o link</button>
          ${g.eu && g.eu.papel === 'dono' ? `<button type="button" class="btn" data-act="gr-editar">${ico('edit')} Editar grupo</button>` : `<button type="button" class="btn ghost" data-act="gr-sair">Sair do grupo</button>`}</div>
        <p class="fine">Pra silenciar o papo, abre o papo e toca no ⋯.</p></div>`);
    },
    'gr-decide': async el => {
      const g = GR.g, a = el.dataset.a, id = el.dataset.id; if(!g || el.disabled) return;
      if(['tirar', 'banir', 'dono'].includes(a) && !armar(el, a === 'dono' ? 'Toca de novo: o grupo passa pra essa pessoa' : a === 'banir' ? 'Toca de novo pra banir' : 'Toca de novo pra tirar do grupo')) return;
      el.disabled = true;
      try{
        await rpc('corre_grupo_decide', { p_grupo: g.id, p_membro: id, p_acao: a });
        if(a === 'aceitar' && C.push) C.push.avisa('grupo-aceito', g.id);
        C.closeSheet();
        C.toast({ aceitar: 'Aceito. Já tá no grupo e no papo.', recusar: 'Pedido recusado.', tirar: 'Tirado do grupo.', banir: 'Banido: não volta sozinho.', desbanir: 'Desbanido.', mod: 'Agora modera o grupo.', desmod: 'Não modera mais.', dono: 'O grupo passou. Você continua moderando.' }[a] || 'Feito.', 3000);
        try{ GR.g = await rpc('corre_grupo_ver', { p_slug: g.slug }) || GR.g; }catch(e){}
        if(C.avisos) C.avisos.depois();
        C.refresh();
      }catch(e){ el.disabled = false; C.toast(erroTxt(e)); }
    },
    'gr-m-menu': el => {
      const g = GR.g, m = (GR.membros || []).find(x => x.id === el.dataset.id); if(!g || !m) return;
      const p = m.perfil || {}, dono = g.eu && g.eu.papel === 'dono';
      C.sheet(`<div class="form fd-fsheet"><div class="sheet-head"><h2>${esc(p.nome || 'Membro')}</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
        <div class="fd-mops">${p.handle ? `<a class="btn" href="#/@${esc(p.handle)}" data-close>${ico('eu')} Ver perfil</a>` : ''}
          ${dono ? (m.papel === 'mod' ? `<button type="button" class="btn" data-act="gr-decide" data-a="desmod" data-id="${esc(m.id)}">Tirar de moderador</button>` : `<button type="button" class="btn" data-act="gr-decide" data-a="mod" data-id="${esc(m.id)}">${ico('star')} Tornar moderador</button>`) : ''}
          ${dono ? `<button type="button" class="btn" data-act="gr-decide" data-a="dono" data-id="${esc(m.id)}">Passar o grupo pra essa pessoa</button>` : ''}
          <button type="button" class="btn" data-act="gr-decide" data-a="tirar" data-id="${esc(m.id)}">Tirar do grupo</button>
          <button type="button" class="btn ghost" data-act="gr-decide" data-a="banir" data-id="${esc(m.id)}">${ico('lock')} Banir</button></div>
        <p class="fine">Tirar: a pessoa pode voltar${g.fechado ? ' (pedindo de novo)' : ''}. Banir: não volta, a não ser que um moderador desbana.</p></div>`);
    },
    'gr-apagar': async el => {
      const g = GR.g; if(!g) return;
      if(!armar(el, 'Toca de novo: apaga o grupo, os posts e o papo')) return;
      try{ await rpc('corre_grupo_apagar', { p_grupo: g.id }); C.toast('Grupo apagado.'); GR.g = null; C.go('#/grupos'); }catch(e){ C.toast(erroTxt(e)); }
    }
  });

  /* na demonstração o dono de exemplo aceita teu pedido sozinho, depois de uns segundos */
  window.addEventListener('corre-demo-grupo', ev => {
    const x = ev.detail || {}; C.toast(`${String(x.quem || 'O dono').split(' ')[0]} te aceitou em ${x.nome || 'um grupo'}.`, 3600);
    if(C.avisos) C.avisos.sync(true);
    if(GR.g && GR.g.id === x.grupo && /^#\/g\//.test(location.hash)) C.refresh(); else if(/^#\/grupos/.test(location.hash)) carregaLista();
  });

  C.grupos = { faixaHome, doPerfil, av, abreForm, atual: () => GR.g, erroTxt };
})();
