/* CORRE · app: entrar com Google, perfil, início, rotas. Os módulos (Rolo 360, Banca, Grana,
   Portfólio, Stories) moram nos outros arquivos e se registram em window.Corre. */
(function(){
  'use strict';
  const C = window.Corre, { $, esc, ico, avatar, toast, copy } = C, api = C.api, st = C.st;
  const app = $('app');
  const HANDLE_RE = /^[a-z0-9_.]{3,24}$/;
  const IG_RE = /^[A-Za-z0-9_.]{0,30}$/;
  const ST = window.CorreStickers;
  const setStickers = page => { const el = $('stickers'); if(ST && el && !C.EMBED && el.dataset.page !== page) ST.scatter(el, page); };
  const G_LOGO = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
  function suggestHandle(user){
    const base = String((user.email || '').split('@')[0] || (user.user_metadata && user.user_metadata.full_name) || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 24);
    return base.length >= 3 ? base : (base + 'corre').slice(0, 24);
  }

  /* ---------------- moldura ---------------- */
  /* v3.19: o menu é a cidade e o dinheiro. v3.38: no jeito do X (lista no computador, barra e gaveta no celular).
     v3.43: em grupos, como o Thales pediu: o Laboratório (Studio e Studio Houzi), o Financeiro (Vendas e Grana e a
     carteira de correal) e a Banca (Banca do dia, Do teu nicho e Rolo 360). O Correverso e o Mural ficam juntos no
     meio, em destaque: a praça. */
  const FUNDADOR = 'd1e9f6ac-f5d7-4723-8b02-eb0d1d7137b0';
  C.ehFundador = () => !!st.me && (st.me.id === FUNDADOR || (!!C.DEMO && st.me.handle === 'consanans'));
  /* a casa do fundador (o loft) é dele por id, mesmo que o @ mude */
  C.fundadorId = () => FUNDADOR;
  /* ferramentas ligadas no perfil (corre_perfis.ferramentas): o Hórus liga e desliga; o Studio tá sempre na porta */
  C.ferr = k => { const f = (st.me && st.me.ferramentas && typeof st.me.ferramentas === 'object') ? st.me.ferramentas : {}; if(k === 'studio') return f.studio !== false; return f[k] === undefined ? !!C.DEMO : f[k] === true; };
  /* cada lugar do menu: [endereço, nome, ícone]. Sem endereço é botão (o sino abre os avisos; a carteira abre por cima) */
  const DEST = me => ({
    inicio: ['#/', 'Início', 'home'], msg: ['#/msg', 'Mensagens', 'send'], avisos: ['', 'Avisos', 'bell'], studio: ['#/studio', 'Studio', 'magia'],
    verso: ['#/verso', 'Correverso', 'verso'], corre: ['#/corre', 'Vendas e Grana', 'grana'], mural: ['#/mural', 'Mural', 'tacha'],
    houzi: ['#/houzi', 'Studio Houzi', 'houzi'], perfil: ['#/@' + me.handle, 'Meu perfil', 'eu'], grupos: ['#/grupos', 'Grupos', 'gente'],
    horus: ['#/horus', 'Hórus', 'eye'], rolo: ['#/rolo', 'Rolo 360', 'rolo'], carteira: ['', 'Carteira de correal', 'correal'],
    marcas: ['#/marcas', 'Portfólio e catálogo', 'marcas'], salvos: ['#/salvos', 'Salvos', 'save'], banca: ['#/banca', 'Banca do dia', 'banca'], refs: ['#/refs', 'Do teu nicho', 'cal']
  });
  /* os grupos: [nome, ícone, o que mora dentro]. No computador cada um abre ali mesmo, no menu; no celular a gaveta
     da tua foto já mostra eles abertos. v3.44 (o Thales pediu pra juntar o tanto que der): a Rede junta o Início, as
     Mensagens, os Grupos e os Avisos; o Hórus e o Portfólio vão pro Laboratório; o Perfil e os Salvos ficam juntos.
     Com isso o Mais some (não sobra nada nele) */
  const GRUPOS = {
    rede: ['Rede', 'chat', ['inicio', 'msg', 'grupos', 'avisos']],
    lab: ['Laboratório', 'lab', ['studio', 'houzi', 'horus', 'marcas']],
    fin: ['Financeiro', 'calc', ['corre', 'carteira']],
    banca: ['Banca', 'toldo', ['banca', 'refs', 'rolo']],
    eu: ['Perfil', 'eu', ['perfil', 'salvos']]
  };
  const GRUPO_DE = {}; Object.keys(GRUPOS).forEach(g => GRUPOS[g][2].forEach(k => { GRUPO_DE[k] = g; }));
  /* a lista do computador: a Rede em cima, o Laboratório onde o Studio morava, a praça no meio, o Perfil no fim */
  const LISTA = ['g:rede', 'g:lab', 'praca', 'g:fin', 'g:banca', 'g:eu'], PRACA = ['verso', 'mural'];
  const MAIS = [];
  /* a barra do celular: o Studio fica onde o dedo já sabe e a praça vai pro meio; o sino sobe pro alto, do lado do olho */
  const BARRA = ['inicio', 'studio', 'verso', 'mural', 'msg'];
  /* o que depende do perfil ou do módulo carregado: o Hórus liga e desliga, o Studio Houzi e os Grupos podem não vir */
  const tem = k => (k !== 'horus' || C.ferr('horus')) && (k !== 'houzi' || C.views.houzi) && (k !== 'grupos' || C.views.grupos);
  /* de qual item do menu cada página é (e pra onde a setinha de voltar leva). Banca e Nicho não são mais filhas do
     Início: moram na Banca, e o grupo aberto no menu já diz onde você tá */
  const DONO = { vendas: 'corre', grana: 'corre', estilo: 'corre', 'studio-dentro': 'studio', editar: 'perfil' };
  /* (v3.44: o Hórus e o Portfólio moram no Laboratório, e o grupo aberto no menu já diz onde você tá: sem migalha) */
  const VOLTA = { estilo: ['#/corre', 'Vendas e Grana'], salvos: ['perfil', 'Perfil'] };
  /* onde o Postar redondo do celular aparece: no Início, no teu perfil e nas páginas de ler (Banca do dia e Do teu
     nicho), como até a v3.42, quando elas eram do Início. O Editar perfil acende o Perfil, mas ali ninguém posta */
  const POSTAR = ['inicio', 'perfil', 'banca', 'refs'];
  /* um item sem enfeite (o Mais e a gaveta). O da página aberta ganha aria-current; a carteira avisa que abre por cima */
  const itemSimples = ([k, h, l, i], cls, ativo) => h ? `<a${cls ? ` class="${cls}-${k}"` : ''} href="${esc(h)}"${cls ? ' role="menuitem"' : ''}${ativo ? ' aria-current="page"' : ''}>${ico(i)}${l}</a>`
    : `<button type="button"${cls ? ` class="${cls}-${k}" role="menuitem"` : ''} data-act="${k === 'avisos' ? 'sino' : k}"${k === 'carteira' ? ' aria-haspopup="dialog"' : ''}>${ico(i)}${l}</button>`;
  /* o sino, as mensagens e a conta aparecem duas vezes (no computador e no celular): o id fica com o que tá na tela */
  const MQ = matchMedia('(min-width: 901px)');
  const idSe = (desk, id) => (MQ.matches === desk ? ` id="${id}"` : '');
  const trocaIds = () => [['sino', '[data-sino]'], ['msg-btn', '[data-msg]'], ['me', 'details.me']].forEach(([id, sel]) => {
    const els = [...document.querySelectorAll(sel)]; if(els.length < 2) return;
    els.forEach(e => e.removeAttribute('id')); (els.find(e => !!e.closest('.lado') === MQ.matches) || els[0]).id = id;
  });
  if(MQ.addEventListener) MQ.addEventListener('change', trocaIds); else if(MQ.addListener) MQ.addListener(trocaIds);
  /* um item do menu: link, ou botão (o sino abre os avisos; a carteira abre por cima) */
  const itemMenu = (k, h, l, i, cls, ativo, desk) => {
    const n = k === 'avisos' ? `<span class="sino-n num" hidden></span>` : k === 'msg' ? `<span class="msg-n num" hidden></span>` : '';
    const dados = k === 'avisos' ? ` data-sino${idSe(desk, 'sino')}` : k === 'msg' ? ` data-msg${idSe(desk, 'msg-btn')}` : '';
    /* a praça: o Correverso é a noite com estrela, o Mural é a cortiça (a mesma forma, cada um com a sua cara) */
    const ic = k === 'verso' ? `<span class="tb-bola">${ico(i)}</span>` : k === 'mural' ? `<span class="tb-bola tb-cortica">${ico(i)}</span>` : `<span class="mi-ic">${ico(i)}${n}</span>`, c = `${cls} ${desk ? 'lado' : 'tb'}-${k}`;
    return h ? `<a class="${c}" href="${esc(h)}" title="${l}" aria-label="${l}"${dados}${ativo ? ' aria-current="page"' : ''}>${ic}<span class="mi-t">${l}</span></a>`
      : `<button type="button" class="${c}" data-act="${k === 'avisos' ? 'sino' : k}" title="${l}" aria-label="${l}"${dados}>${ic}<span class="mi-t">${l}</span></button>`;
  };
  /* um item dentro do grupo (computador): link, ou botão (a carteira abre por cima) */
  /* v3.44: dentro da Rede, os Avisos (o sino) e as Mensagens levam o número de não lidos, como na lista de antes */
  const filho = (k, [h, l, i], ativo) => {
    const n = k === 'avisos' ? `<span class="sino-n num" hidden></span>` : k === 'msg' ? `<span class="msg-n num" hidden></span>` : '';
    const dados = k === 'avisos' ? ` data-sino${idSe(true, 'sino')}` : k === 'msg' ? ` data-msg${idSe(true, 'msg-btn')}` : '';
    const ic = n ? `<span class="lado-gi-ic">${ico(i)}${n}</span>` : ico(i);
    return h ? `<a class="lado-gi lado-gi-${k}" href="${esc(h)}" title="${l}" aria-label="${l}"${dados}${ativo ? ' aria-current="page"' : ''}>${ic}<span class="mi-t">${l}</span></a>`
      : `<button type="button" class="lado-gi lado-gi-${k}" data-act="${k === 'avisos' ? 'sino' : k}" title="${l}" aria-label="${l}"${dados} aria-haspopup="dialog">${ic}<span class="mi-t">${l}</span></button>`;
  };
  /* o grupo no computador. Abre o da página aberta; fora dos grupos, o Laboratório (o Studio fica a 1 clique). Um por
     vez: o name do details faz isso sozinho. Não guarda nada: o menu se redesenha a cada página e a regra decide de
     novo. Grupo com um item só vira item solto. O aberto/fechado o leitor de tela já ouve do próprio details (nada de
     aria-expanded escrito à mão, que ficaria velho no primeiro clique) */
  const grupoLado = (g, D, active) => {
    const [t, i, ks] = GRUPOS[g], itens = ks.filter(tem);
    if(itens.length < 2) return itens.map(k => itemMenu(k, D[k][0], D[k][1], D[k][2], 'lado-i', k === active, true)).join('');
    const aqui = itens.includes(active), aberto = aqui || (!GRUPO_DE[active] && g === 'lab');
    return `<details class="lado-g${aqui ? ' aqui' : ''}" data-g="${g}" name="lado-g"${aberto ? ' open' : ''}><summary class="lado-i lado-gs" title="${t}" aria-label="${t}"><span class="mi-ic">${ico(i)}</span><span class="mi-t">${t}</span>${ico('next', 'lado-g-seta')}</summary>
      <div class="lado-g-m" role="group" aria-label="${t}">${itens.map(k => filho(k, D[k], k === active)).join('')}</div></details>`;
  };
  /* a gaveta do celular: o Perfil, os três grupos já abertos (tudo a 2 toques) e o Mais. O que tá na barra também
     aparece no grupo dele, pro grupo ficar inteiro */
  const gavetaHTML = (me, active) => {
    const D = DEST(me), um = k => tem(k) ? itemSimples([k].concat(D[k]), '', k === active) : '';
    const bloco = (id, t, i, ks) => { const l = ks.filter(tem); return l.length ? `<div class="gv-g" role="group" aria-labelledby="gv-g-${id}"><span class="gv-k" id="gv-g-${id}">${i ? ico(i) : ''}${t}</span>${l.map(um).join('')}</div>` : ''; };
    return Object.keys(GRUPOS).map(g => bloco(g, GRUPOS[g][0], GRUPOS[g][1], GRUPOS[g][2])).join('') + bloco('mais', 'Mais', '', MAIS);
  };
  /* em tela baixa a lista do menu rola: o item da página aberta (e o grupo que acabou de abrir) aparece inteiro.
     Mexe só no scrollTop da lista, nunca na página. v3.43: com folga do degradê que avisa que a lista rola (36px + um
     respiro), pra ele nunca ficar por cima do item aceso. Na ponta da lista o degradê some e o scrollTop para sozinho */
  const FOLGA = 40;
  const aVista = el => { const n = el && el.closest('.lado-nav'); if(!n) return; const r = el.getBoundingClientRect(), N = n.getBoundingClientRect();
    if(r.bottom > N.bottom - FOLGA) n.scrollTop += r.bottom - N.bottom + FOLGA; else if(r.top < N.top + FOLGA) n.scrollTop -= N.top + FOLGA - r.top; };
  /* v3.43 · o menu mostra que rola. Num notebook de tela baixa (1366x768: janela de 643px) a lista rola até ~184px, e a
     barra de rolagem fica escondida (ela comeria a largura do menu de ícone): sem sinal, os itens de cima e de baixo
     sumiam calados. Aqui só mede a lista e liga as classes do lado que tem mais (rola-cima, rola-baixo); o degradê, a
     setinha e o trilho fino são do CSS (monstra.css, no fim do bloco da v3.43: "o menu mostra que rola"). Os ouvintes
     ficam no documento, uma vez só (o scroll e o toggle não sobem, mas a captura pega): o menu se redesenha a cada
     página e nada se acumula */
  const sinalRola = () => {
    const n = document.querySelector('.lado-nav'), l = n && n.closest('.lado'); if(!l) return;
    const h = n.clientHeight, sobra = n.scrollHeight - h, y = n.scrollTop, rola = h > 0 && sobra > 4;
    /* o degradê só quando tem um item inteiro escondido (mais de 24px); rolando 3 ou 15px, ele apagava o Início e o Mais,
       que estavam quase inteiros na tela. O trilho aparece sempre que a lista rola */
    l.classList.toggle('rola', rola);
    l.classList.toggle('rola-cima', rola && y > 24);
    l.classList.toggle('rola-baixo', rola && sobra - y > 24);
    if(!rola) return;
    const t = Math.max(24, Math.round(h * h / n.scrollHeight)), px = v => Math.round(v) + 'px';
    l.style.setProperty('--nav-t', px(n.offsetTop)); l.style.setProperty('--nav-h', px(h));
    l.style.setProperty('--trilho-t', px(n.offsetTop + 2 + (h - 4 - t) * Math.min(1, Math.max(0, y / sobra)))); l.style.setProperty('--trilho-h', px(t));
  };
  document.addEventListener('scroll', e => { if(e.target && e.target.classList && e.target.classList.contains('lado-nav')) sinalRola(); }, { capture: true, passive: true });
  document.addEventListener('toggle', e => { if(e.target && e.target.closest && e.target.closest('.lado-nav')) sinalRola(); }, true);
  window.addEventListener('resize', sinalRola);
  /* as letras de verdade chegam depois e mudam a altura dos itens */
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(sinalRola, () => {});
  /* a cidade usa o Espaço (pula) e o Enter (porta). Quem chegou no menu pelo Tab (um grupo, a Carteira, o sino) usa as
     duas pra abrir o que tá no foco, como em qualquer página; quem clicou com o mouse e voltou pro jogo segue pulando.
     Por isso o app lembra se o último foco veio do teclado (o :focus-visible não serve: o Chrome liga ele em qualquer
     tecla, até na seta do jogo) */
  let focoTeclado = false;
  addEventListener('keydown', e => { if(e.key === 'Tab') focoTeclado = true; }, true);
  addEventListener('pointerdown', () => { focoTeclado = false; }, true);
  C.teclaDoMenu = e => focoTeclado && (e.key === ' ' || e.key === 'Enter') && !!(e.target && e.target.closest && e.target.closest('.lado, .hdr, .tabbar, .migalha'));
  /* a conta (o mesmo menu no computador e no celular; no celular ele vira a gaveta, com o menu inteiro em cima) */
  const contaHTML = (me, gaveta, active) => `${gaveta ? `<div class="gv-topo"><a href="#/@${esc(me.handle)}" aria-label="Teu perfil">${avatar(me, 'm')}</a><b>${esc(me.nome || '')}</b><small>@${esc(me.handle)}</small></div>
      ${gavetaHTML(me, active)}
      <span class="gv-k">Conta</span>` : `<a href="#/@${esc(me.handle)}">${ico('eu')}Meu perfil</a><a href="#/salvos">${ico('save')}Salvos</a>`}
      <a href="#/editar">${ico('edit')}Editar perfil</a><button type="button" data-act="st-novo">${ico('plus')}Postar story</button>${C.push ? `<button type="button" data-act="push-ajustes">${ico('bell')}Avisos no celular</button>` : ''}<button type="button" data-act="manual">${ico('manual')}Manual do Corre</button>
      <a href="privacidade.html">${ico('lock')}Privacidade</a><button type="button" data-act="sair">${ico('prev')}Sair</button>`;
  /* o menu da esquerda (computador) */
  const lado = (active, me) => {
    const D = DEST(me), mais = MAIS.filter(tem), um = k => itemMenu(k, D[k][0], D[k][1], D[k][2], 'lado-i', k === active, true);
    const nav = LISTA.map(x => x === 'praca' ? `<div class="lado-praca">${PRACA.map(um).join('')}</div>` : x.startsWith('g:') ? grupoLado(x.slice(2), D, active) : tem(x) ? um(x) : '').join('');
    return `<aside class="lado" aria-label="Menu do Corre">
      <a class="wm lado-wm" href="#/" aria-label="Corre, início"><span class="lado-wm-t">Corre</span><span class="lado-wm-c" aria-hidden="true">C</span><span class="wm-tag" aria-hidden="true">rede</span></a>
      <nav class="lado-nav" aria-label="Navegação">${nav}
        ${mais.length ? `<details class="lado-mais"><summary class="lado-i" title="Mais"${mais.includes(active) ? ' aria-current="page"' : ''}><span class="mi-ic">${ico('dots')}</span><span class="mi-t">Mais</span></summary>
          <div class="lado-mais-m" role="menu">${mais.map(k => itemSimples([k].concat(D[k]), 'lado')).join('')}</div></details>` : ''}
      </nav>
      <i class="lado-trilho" aria-hidden="true"></i>
      <button type="button" class="btn pri lado-post" data-act="lado-postar" title="Postar no feed">${ico('plus')}<span>Postar</span></button>
      <details class="me lado-conta"${idSe(true, 'me')}><summary class="lado-eu" aria-label="Tua conta">${avatar(me, 's')}<span><b>${esc(me.nome || '')}</b><small>@${esc(me.handle)}</small></span>${ico('dots')}</summary>
        <div class="me-menu">${contaHTML(me, false, active)}</div></details>
    </aside>`;
  };
  C.header = function(cru){
    const me = st.me;
    let active = DONO[cru] || cru;
    setStickers('app');
    const logged = st.user && me;
    document.body.classList.toggle('com-lado', !!logged);
    document.body.classList.toggle('em-verso', active === 'verso');
    if(cru !== 'studio-dentro') document.body.classList.remove('em-studio');
    document.body.classList.toggle('em-msg', cru === 'msg');
    /* v3.38: o Rolo 360 apaga a cidade (sala escura) e toca música clássica; saiu da sala, a música para */
    document.body.classList.toggle('em-rolo', cru === 'rolo');
    if(cru !== 'rolo' && C.roloSom) C.roloSom.sai();
    if(logged && active === '' && /^#\/@/.test(location.hash) && decodeURIComponent(location.hash.slice(3)).toLowerCase() === me.handle) active = 'perfil';
    if(logged && C.visitas) setTimeout(() => C.visitas.sync(), 0);
    if(logged && C.avisos) setTimeout(() => C.avisos.sync(), 0);
    if(logged && C.msg) setTimeout(() => C.msg.sync(), 0);
    /* avisos no celular: confere a inscrição deste aparelho (uma vez por abertura) */
    if(logged && C.push) setTimeout(() => C.push.sync(), 1500);
    /* o manual abre sozinho na primeira entrada e a cada atualização */
    if(logged && C.manual) setTimeout(() => C.manual.talvez(), 900);
    /* em tela baixa a lista do menu rola: o item aceso aparece (depois de a página ir pra tela) */
    if(logged) setTimeout(() => { aVista(document.querySelector('.lado-nav [aria-current="page"]')); sinalRola(); }, 0);
    const v = logged && VOLTA[cru], volta = v ? (v[0] === 'perfil' ? ['#/@' + me.handle, 'Perfil'] : v) : null;
    return `<header class="hdr">
      ${logged ? `<details class="me hdr-eu"${idSe(false, 'me')}><summary aria-label="Abrir o menu: teu perfil e o teu corre">${avatar(me, 's')}</summary>
        <div class="gv-scrim" data-act="gaveta-x" aria-hidden="true"></div><div class="me-menu gaveta" aria-label="Teu menu">${contaHTML(me, true, active)}</div></details>` : ''}
      <nav class="topnav" aria-label="Navegação">
        <a class="wm" href="#/" aria-label="Corre, início">Corre<span class="wm-tag" aria-hidden="true">rede</span></a>
        ${!st.user ? `<a class="hl" href="#/">Entrar</a>` : ''}
      </nav>
      ${logged ? `<button type="button" class="sino hdr-sino" data-act="sino" data-sino${idSe(false, 'sino')} aria-label="Avisos e agenda" title="Avisos">${ico('bell')}<span class="sino-n num" hidden></span></button>` : ''}
      ${logged ? `<button type="button" class="oculto-btn" data-act="oculto" aria-pressed="${C.oculto}" aria-label="${C.oculto ? 'Mostrar valores' : 'Esconder valores'}" title="${C.oculto ? 'Mostrar valores' : 'Esconder valores'}">${ico(C.oculto ? 'eyeoff' : 'eye')}</button>` : ''}
      ${st.user && !me ? `<details class="me" id="me">
        <summary aria-label="Menu da conta">${avatar({ nome: st.user.email }, 's')}</summary>
        <div class="me-menu"><a href="privacidade.html">Privacidade</a><button type="button" data-act="sair">Sair</button></div>
      </details>` : ''}
    </header>
    ${volta ? `<nav class="migalha" aria-label="Voltar"><a href="${esc(volta[0])}">${ico('prev')} ${esc(volta[1])}</a></nav>` : ''}
    ${logged ? lado(active, me) : ''}
    ${logged ? `<nav class="tabbar tbx" aria-label="Navegação">${BARRA.filter(tem).map(k => { const [h, l, i] = DEST(me)[k]; return itemMenu(k, h, l, i, 'tb-i', k === active, false); }).join('')}</nav>
      ${POSTAR.includes(cru || active) ? `<button type="button" class="tb-postar" data-act="lado-postar" aria-label="Postar no feed">${ico('plus')}</button>` : ''}` : ''}`;
  };

  /* Corre: vendas e grana na mesma página, sem abas. #/vendas e #/grana caem aqui, na seção certa */
  C.views.corre = async function(app, foco){
    document.title = 'Corre · Corre';
    const rota = C.rota;
    app.innerHTML = C.header('corre') + `<main class="wrap corre-pg">
      <div class="hello"><h1><span class="hl">Corre</span></h1><p>Do orçamento ao dinheiro na conta, no mesmo lugar. Só você vê.</p></div>
      <div id="g-corre"></div>
      <nav class="corre-salto" aria-label="Ir pra"><button type="button" class="hz-chip" data-act="corre-ir" data-k="vendas">${ico('recibo')} Vendas</button><button type="button" class="hz-chip" data-act="corre-ir" data-k="grana">${ico('grana')} Grana</button></nav>
      <section class="corre-sec" id="corre-vendas" aria-label="Vendas"><section class="card"><p class="note">Abrindo as vendas…</p></section></section>
      <section class="corre-sec" id="corre-grana" aria-label="Grana"><section class="card"><p class="note">Abrindo a grana…</p></section></section>
    </main>`;
    if(C.correMes) C.correMes($('g-corre'));
    const erro = (id, e, t) => { const el = $(id); if(el) el.innerHTML = `<section class="card"><p>${esc(C.errMsg(e, t))}</p></section>`; };
    await Promise.all([
      C.vendasPainel ? C.vendasPainel.montar().catch(e => erro('corre-vendas', e, 'Não deu pra abrir as vendas agora.')) : null,
      C.granaPainel ? C.granaPainel.montar().catch(e => erro('corre-grana', e, 'Não deu pra abrir a grana agora.')) : null
    ]);
    if(rota !== C.rota) return;
    if(foco === 'vendas' || foco === 'grana'){ const el = $('corre-' + foco); if(el) el.scrollIntoView({ block: 'start' }); }
  };
  /* Studio Houzi (v3.37): o código do Studio (motor de marca, telas e brandbook) só desce quando alguém abre o Studio
     ou um brandbook. Quando chega, ele mesmo troca estas portas pelas de verdade. */
  let houziP = null;
  C.houziCarrega = () => houziP || (houziP = new Promise((ok, falha) => {
    const base = document.querySelector('script[src*="corre.min.js"]'), src = base ? base.getAttribute('src').replace('corre.min.js', 'houzi.min.js') : 'js/houzi.min.js';
    const s = document.createElement('script'); s.src = src; s.onload = () => ok(); s.onerror = () => { houziP = null; falha({ message: 'O Studio Houzi não carregou. Confere a internet e tenta de novo.' }); };
    document.head.appendChild(s);
  }));
  const portaHouzi = nome => async (app, resto) => {
    const porta = C.views[nome];
    try{ await C.houziCarrega(); }catch(e){ app.innerHTML = C.header('houzi') + `<main class="wrap"><section class="card"><h1>${esc(e.message)}</h1><button type="button" class="btn" data-act="tenta-de-novo">Tentar de novo</button></section></main>`; return; }
    if(C.views[nome] === porta) return;
    return C.views[nome](app, resto);
  };
  C.views.houzi = portaHouzi('houzi'); C.views.bb = portaHouzi('bb');
  C.views.vendas = app => C.views.corre(app, 'vendas');
  C.views.grana = app => C.views.corre(app, 'grana');

  /* ---------------- entrar ---------------- */
  /* navegador de dentro de app (Instagram, Facebook, WhatsApp, TikTok...): o Google costuma bloquear o login nele */
  const dentroDeApp = () => /Instagram|FBAN|FBAV|FB_IAB|FBIOS|Line\/|WhatsApp|musical_ly|TikTok|BytedanceWebview|; wv\)/i.test(navigator.userAgent || '');
  /* chegou pelo link de alguém (story do Instagram, link copiado): mostra quem chamou */
  const conviteLogin = () => { const c = C.insta && C.insta.convite(); return c ? `<p class="cv-login">${ico('raio')}<span><b>@${esc(c.h)}</b> te chamou pro Corre. Entra e já sai seguindo.</span></p>` : ''; };
  function viewLogin(){
    document.body.classList.remove('com-lado');
    setStickers('login');
    app.innerHTML = `<div class="login-top"><nav class="topnav" aria-label="Navegação"><a class="hl" href="#entrar">Entrar</a><a class="hl" href="#/mural">Mural</a><a class="hl" href="privacidade.html">Privacidade</a></nav></div>
    <main class="login">
      <h1 class="mega">Corre</h1>
      <p class="tagline"><span class="hl">Mostra teu corre.</span></p>
      <section class="login-card" id="entrar" aria-label="Entrar no Corre">
        <p class="lead">Pra quem vende serviço ou produto, de qualquer segmento: acha cliente, manda orçamento, recebe e vê quanto o corre tá rendendo. Você mostra o que quiser. O resto fica mocado.</p>
        <div class="chips" aria-label="O que tem no Corre"><span class="chip">Studio</span><span class="chip">Hórus</span><span class="chip">Mural</span><span class="chip">Correverso</span><span class="chip">Vendas e Grana</span></div>
        ${conviteLogin()}<div class="g-oficial" id="g-oficial" hidden></div><button type="button" class="btn-google" id="btn-google" data-act="google">${G_LOGO}<span>Entrar com Google</span></button><button type="button" class="lnk g-outro" id="g-outro" data-act="google" hidden><span>Não abriu? Entra pelo outro jeito</span></button>
        ${dentroDeApp() ? `<div class="iab-aviso"><b>Abriu pelo Instagram ou WhatsApp?</b><p>O Google às vezes não deixa entrar por aqui. Se travar, abre o Corre no navegador${/Android/i.test(navigator.userAgent) ? '' : ' (no menu ••• , "Abrir no navegador")'}.</p><div class="acts">${/Android/i.test(navigator.userAgent) ? `<a class="btn sm pri" href="${esc(C.insta ? C.insta.intentUrl() : `intent://${location.host + location.pathname}#Intent;scheme=https;package=com.android.chrome;end`)}">Abrir no Chrome</a>` : ''}<button type="button" class="btn sm" data-act="iab-copia">Copiar o link</button></div></div>` : ''}
        <button type="button" class="lnk man-login" data-act="manual">${ico('manual')} Como funciona o Corre</button>
        <div class="em-breve" role="note" aria-label="App do Corre no celular: em breve no iOS e no Android">
          <span class="eb-tag" aria-hidden="true">Em breve</span>
          <span class="eb-loja">${ico('cel')}<span><small>App pra iPhone</small><b>iOS</b></span></span>
          <span class="eb-loja">${ico('cel')}<span><small>App pra celular</small><b>Android</b></span></span>
        </div>
        <p class="fine">Ao entrar, você concorda com a <a href="privacidade.html">Política de privacidade</a>.</p>
      </section>
    </main>`;
    botaoGoogle();
  }
  /* v3.38: com o GOOGLE_CLIENT_ID no config, entra o botão do próprio Google (a janela mostra o endereço do Corre).
     Se o Google não carregar, volta o botão de antes; dentro do Instagram/WhatsApp fica o de antes (o Google barra lá). */
  async function botaoGoogle(){
    const alvo = $('g-oficial'), meu = $('btn-google'); if(!alvo || !meu || !api.googleBotao || !api.googleLigado() || dentroDeApp()) return;
    const volta = () => { if(!alvo.isConnected) return; alvo.hidden = true; meu.hidden = false; const o = $('g-outro'); if(o) o.hidden = true; };
    try{
      alvo.hidden = false; meu.hidden = true;
      const ok = await api.googleBotao(alvo, {
        entrando: () => { if(alvo.isConnected) alvo.classList.add('entrando'); toast('Entrando…', 2600); },
        falhou: () => { if(!alvo.isConnected) return; alvo.classList.remove('entrando'); toast('Não deu pra entrar com o Google agora. Tenta de novo ou entra pelo outro jeito.', 4800); botaoGoogle(); }
      });
      if(!ok) return volta();
      const o = $('g-outro'); if(o && alvo.isConnected) o.hidden = false;
    }catch(e){ volta(); }
  }

  /* ---------------- perfil: formulário ---------------- */
  function profileForm(p, isNew){
    const u = st.user, md = (u && u.user_metadata) || {};
    const v = p || { nome: md.full_name || md.name || '', handle: suggestHandle(u), bio: '', cidade: '', instagram: '', visibilidade: 'publico', avatar_url: md.avatar_url || md.picture || '' };
    const gpic = md.avatar_url || md.picture || '';
    return `<form class="form" id="pf" novalidate>
      <div class="prof"><span id="pf-av">${avatar(v, 'm')}</span><div class="who"><b style="font-size:15px">Foto</b><div class="acts"><label class="btn sm up-lbl" id="pf-up">${ico('camera')} <span>Trocar foto</span><input type="file" accept="image/*" id="pf-file" aria-label="Escolher foto de perfil"></label>${gpic ? '<button type="button" class="btn sm ghost" id="pf-g">Usar a do Google</button>' : ''}</div></div></div>
      <input type="hidden" id="f-av" value="${esc(v.avatar_url || '')}">
      ${isNew ? '' : `<div class="capa-row"><span class="capa-prev" id="pf-capa-prev"${capaOk(v.capa_url) ? ` style="background-image:url('${v.capa_url}')"` : ''}></span><div class="who"><b style="font-size:15px">Capa do perfil</b><div class="acts"><label class="btn sm up-lbl">${ico('camera')} <span>Trocar capa</span><input type="file" accept="image/*" data-up="capa" aria-label="Escolher capa do perfil"></label><button type="button" class="btn sm ghost" data-act="tira-capa"${capaOk(v.capa_url) ? '' : ' hidden'}>Tirar capa</button></div></div></div>`}
      <div class="row2">
        <div class="fld"><label for="f-nome">Nome</label><input class="inp" id="f-nome" name="nome" maxlength="60" required value="${esc(v.nome)}" autocomplete="name"></div>
        <div class="fld"><label for="f-handle">Teu @ no Corre</label><div class="at"><input class="inp" id="f-handle" name="handle" maxlength="24" required value="${esc(v.handle)}" autocomplete="off" autocapitalize="none" spellcheck="false" aria-describedby="h-handle"></div><span class="hint" id="h-handle">Letras minúsculas, números, ponto e _. De 3 a 24.</span></div>
      </div>
      <div class="fld"><label for="f-bio">Bio</label><textarea class="inp" id="f-bio" name="bio" maxlength="160" aria-describedby="h-bio" placeholder="O que você faz, pra quem, do teu jeito.">${esc(v.bio)}</textarea><span class="hint" id="h-bio">${(v.bio || '').length}/160</span></div>
      <div class="row2">
        <div class="fld"><label for="f-cidade">Cidade</label><input class="inp" id="f-cidade" name="cidade" maxlength="60" value="${esc(v.cidade)}" placeholder="Londrina, PR" autocomplete="address-level2"></div>
        <div class="fld"><label for="f-ig">Teu Instagram</label><div class="at"><input class="inp" id="f-ig" name="instagram" maxlength="30" value="${esc(v.instagram)}" autocapitalize="none" spellcheck="false" placeholder="seu.perfil"></div><span class="hint">Os posts que você escolher entram no teu perfil, na vitrine do Instagram.</span></div>
      </div>
      ${C.meuCorre ? C.meuCorre.campos(v) : ''}
      <fieldset class="fld"><legend>Teu corre fica</legend>
        <div class="vis">
          <label class="opt"><input type="radio" name="visibilidade" value="publico" ${v.visibilidade !== 'mocado' ? 'checked' : ''}><span class="dot"></span><span><b>Na vitrine</b><small>Qualquer pessoa vê teu perfil e te acha em "Gente no Corre".</small></span></label>
          <label class="opt"><input type="radio" name="visibilidade" value="mocado" ${v.visibilidade === 'mocado' ? 'checked' : ''}><span class="dot"></span><span><b>Mocado</b><small>Só você vê. Dá pra abrir quando quiser.</small></span></label>
        </div>
      </fieldset>
      <label class="switch pf-trampo"><input type="checkbox" name="aberto" ${v.aberto ? 'checked' : ''}><span class="sw" aria-hidden="true"></span><span><b>Aberto pra trampo</b><small>Põe um aro amarelo na tua foto e o selo no perfil: quem passa sabe que você tá pegando trabalho novo.</small></span></label>
      <div class="acts"><button type="submit" class="btn pri" id="pf-ok">${isNew ? 'Entrar no Corre' : 'Salvar perfil'}</button>${isNew ? '' : '<a class="btn" href="#/">Cancelar</a>'}</div>
    </form>`;
  }
  function viewOnboarding(){
    app.innerHTML = C.header('') + `<main class="wrap">
      <div class="hello"><h1><span class="hl">Bem-vindo ao Corre.</span></h1><p>Monta teu perfil em um minuto. Tudo aqui dá pra mudar depois.</p></div>
      <section class="card">${profileForm(null, true)}</section>
    </main>`;
    bindForm(true);
  }
  function viewEdit(){
    /* 'editar' (e não ''): o DONO leva pro Perfil, que acende no menu e na gaveta */
    app.innerHTML = C.header('editar') + `<main class="wrap">
      <h2 class="sec-t"><span class="hl">Editar perfil</span></h2>
      <section class="card">${profileForm(st.me, false)}</section>
      <section class="card danger"><h2 class="ch">Apagar meu perfil</h2><p class="note">Apaga perfil, catálogo, vendas e orçamentos, clientes do Hórus, pedidos e propostas do Mural, referências, portfólio, stories, destaques, vitrine, contas e lançamentos. Não dá pra desfazer.</p>
        <div class="seguir-row"><input class="inp" id="del-h" placeholder="Digite teu @ pra confirmar" autocapitalize="none" spellcheck="false" aria-label="Digite teu @ pra confirmar"><button type="button" class="btn ghost" data-act="apagar-conta">${ico('trash')} Apagar tudo</button></div></section>
    </main>`;
    bindForm(false);
  }
  /* foto e capa: a mesma esteira em todo lugar (perfil, Editar perfil) */
  /* só endereço limpo (sem aspas, parênteses, & ou espaço) entra no style da capa */
  const capaOk = u => /^(https:\/\/[A-Za-z0-9._~\/?#=%:@!$*+,;-]+|data:image\/jpeg;base64,[A-Za-z0-9+\/=]+)$/.test(u || '') && !/[&'"()]/.test(u);
  async function imagemBlob(tipo, file){
    try{ return tipo === 'capa' ? await C.shrink(file, 1500, .82, 3) : await C.shrink(file, 480, .86, true); }
    catch(e){
      /* não deu pra abrir no navegador: se já é jpg/png/webp leve, sobe do jeito que veio */
      if(/^image\/(jpeg|png|webp)$/.test(file.type) && file.size <= 5e6) return file;
      if(/hei[cf]/i.test(file.type + ' ' + file.name)) throw { code: 'heic' };
      throw e;
    }
  }
  const msgImagem = (e, tipo) => e && e.code === 'heic' ? 'Essa foto tá em HEIC e o navegador não abre. Tira um print dela e manda o print, ou escolhe outra.' : C.errMsg(e, tipo === 'capa' ? 'Não deu pra trocar a capa.' : 'Não deu pra trocar a foto.');
  /* a tua foto aparece no menu (computador), no alto e na gaveta (celular): troca em todos */
  const pintaAvMenu = () => {
    document.querySelectorAll('details.me > summary .av').forEach(a => { a.outerHTML = avatar(st.me, 's'); });
    document.querySelectorAll('.gv-topo .av').forEach(a => { a.outerHTML = avatar(st.me, 'm'); });
  };
  function pintaMe(velho){
    document.querySelectorAll('img').forEach(im => { if(velho && im.getAttribute('src') === velho) im.src = st.me.avatar_url; });
    pintaAvMenu();
  }
  /* qualquer <input type=file data-up="foto|capa"> na tela troca na hora */
  document.addEventListener('change', async e => {
    const inp = e.target; if(!inp || !inp.matches || !inp.matches('input[type=file][data-up]')) return;
    const file = inp.files && inp.files[0], tipo = inp.dataset.up === 'capa' ? 'capa' : 'foto'; inp.value = ''; if(!file || !st.me) return;
    const lb = inp.closest('label'); if(lb){ if(lb.classList.contains('ocupado')) return; lb.classList.add('ocupado'); }
    toast(tipo === 'capa' ? 'Subindo a capa…' : 'Subindo a foto…', 8000);
    try{
      const url = await api.upload(await imagemBlob(tipo, file)), velho = st.me.avatar_url || '';
      await C.saveMe(tipo === 'capa' ? { capa_url: url } : { avatar_url: url });
      toast(tipo === 'capa' ? 'Capa trocada.' : 'Foto trocada.');
      if(tipo === 'foto') pintaMe(velho);
      const pv = $('pf-capa-prev'); if(pv && tipo === 'capa'){ pv.style.backgroundImage = `url('${url}')`; const tb = document.querySelector('[data-act="tira-capa"]'); if(tb) tb.hidden = false; }
      if(/^#\/@/.test(location.hash)) C.refresh();
    }catch(err){ toast(msgImagem(err, tipo), 5200); }
    finally{ if(lb) lb.classList.remove('ocupado'); }
  });
  function bindForm(isNew){
    const f = $('pf'), hIn = $('f-handle'), hHint = $('h-handle'), bio = $('f-bio');
    let lastChecked = '', checkT = 0;
    const paintAv = () => { $('pf-av').innerHTML = avatar({ nome: $('f-nome').value, avatar_url: $('f-av').value }, 'm'); };
    /* o botão é um input de arquivo de verdade (tocado direto): funciona até no navegador de dentro do Instagram, que bloqueia abrir a galeria por código */
    const fIn = $('pf-file'), fLb = $('pf-up').querySelector('span');
    fIn.addEventListener('change', async () => {
      const file = fIn.files && fIn.files[0]; fIn.value = ''; if(!file) return;
      if(fIn.disabled) return; fIn.disabled = true; fLb.textContent = 'Subindo…';
      try{ await aplicaFoto(await api.upload(await imagemBlob('foto', file))); }
      catch(e){ toast(msgImagem(e, 'foto'), 5200); }
      finally{ fIn.disabled = false; fLb.textContent = 'Trocar foto'; }
    });
    /* no Editar perfil a foto vale na hora (antes ficava esperando o Salvar e muita gente saía sem salvar) */
    async function aplicaFoto(url){
      $('f-av').value = url; paintAv();
      if(isNew || !st.me){ toast('Foto pronta.'); return; }
      const velho = st.me.avatar_url || '';
      await C.saveMe({ avatar_url: url });
      document.querySelectorAll('img').forEach(im => { if(velho && im.getAttribute('src') === velho) im.src = url; });
      pintaAvMenu();
      toast('Foto trocada.');
    }
    const g = $('pf-g'); if(g) g.addEventListener('click', async () => { const md = st.user.user_metadata || {}; try{ await aplicaFoto(md.avatar_url || md.picture || ''); }catch(e){ toast(C.errMsg(e, 'Não deu pra trocar a foto.')); } });
    bio.addEventListener('input', () => { $('h-bio').textContent = `${bio.value.length}/160`; });
    hIn.addEventListener('input', () => {
      const clean = hIn.value.toLowerCase().replace(/[^a-z0-9_.]/g, '');
      if(clean !== hIn.value) hIn.value = clean;
      clearTimeout(checkT); checkT = setTimeout(checkHandle, 450);
    });
    async function checkHandle(){
      const h = hIn.value;
      if(!isNew && st.me && h === st.me.handle){ hHint.className = 'hint'; hHint.textContent = 'Esse é o teu @ atual.'; return true; }
      if(!HANDLE_RE.test(h)){ hHint.className = 'hint bad'; hHint.textContent = 'Use de 3 a 24 caracteres: letras minúsculas, números, ponto e _.'; return false; }
      lastChecked = h;
      try{
        const free = await api.rpc('corre_handle_livre', { h });
        if(lastChecked !== h) return null;
        hHint.className = 'hint ' + (free ? 'ok' : 'bad');
        hHint.textContent = free ? `@${h} tá livre.` : `@${h} já tem dono. Tenta outro.`;
        return free;
      }catch(e){ hHint.className = 'hint'; hHint.textContent = 'Não deu pra conferir agora; a gente confere ao salvar.'; return null; }
    }
    if(isNew) checkHandle();
    if(C.meuCorre) C.meuCorre.bind();
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(f);
      const p = {
        nome: String(fd.get('nome') || '').trim(),
        handle: String(fd.get('handle') || '').trim(),
        bio: String(fd.get('bio') || '').trim(),
        cidade: String(fd.get('cidade') || '').trim(),
        instagram: String(fd.get('instagram') || '').trim().replace(/^@/, ''),
        visibilidade: fd.get('visibilidade') === 'mocado' ? 'mocado' : 'publico',
        aberto: fd.get('aberto') === 'on',
        avatar_url: $('f-av').value
      };
      if(!p.nome){ toast('Coloca teu nome.'); $('f-nome').focus(); return; }
      if(!HANDLE_RE.test(p.handle)){ toast('Ajusta o teu @.'); hIn.focus(); return; }
      if(!IG_RE.test(p.instagram)){ toast('O @ do Instagram só aceita letras, números, ponto e _.'); $('f-ig').focus(); return; }
      const mc = C.meuCorre ? C.meuCorre.ler() : null;
      if(mc){
        if(!C.meuCorre.whatsOk(mc.whats_publico)){ toast('Confere o WhatsApp com DDD, ou deixa em branco.'); $('f-wa').focus(); return; }
        Object.assign(p, { categoria: mc.categoria, faz: mc.faz, vende_pra: mc.vende_pra, whats_publico: mc.whats_publico, no_mural: mc.no_mural });
      }
      const antes = isNew || !st.me ? null : { categoria: st.me.categoria || '', faz: st.me.faz || '' };
      const b = $('pf-ok'); b.disabled = true;
      try{
        if(isNew){
          try{ const r = await api.ins('corre_perfis', Object.assign({ id: st.user.id }, p)); st.me = r[0]; }
          catch(e1){
            /* o perfil já existia (a tela de cadastro abriu por um tropeço de rede): entra com ele em vez de dizer que o @ tem dono */
            const ja = e1 && e1.code === '23505' ? await api.one('corre_perfis', { eq: { id: st.user.id } }).catch(() => null) : null;
            if(!ja) throw e1;
            st.me = ja; st.loadedFor = st.user.id; toast('Teu perfil já existia. Entrando nele.'); go('#/'); return;
          }
        }
        else await C.saveMe(p);
        if(mc && C.meuCorre) await C.meuCorre.aplicar(antes, mc.orc);
        st.loadedFor = st.user.id;
        /* entrou pelo link de alguém: já segue quem chamou */
        const chamou = isNew && C.insta ? await C.insta.segueQuemChamou(st.me) : null;
        toast(isNew ? (chamou ? `Perfil criado. Você já segue @${chamou.handle}, que te chamou.` : 'Perfil criado. Bem-vindo ao Corre.') : 'Perfil salvo.', chamou ? 4200 : undefined);
        go('#/');
      }catch(err){
        if(err && err.code === '23505'){ hHint.className = 'hint bad'; hHint.textContent = `@${p.handle} já tem dono. Tenta outro.`; hIn.focus(); toast('Esse @ já tem dono.'); }
        else toast(C.errMsg(err, 'Não deu pra salvar agora. Tente de novo.'), 4000);
      }finally{ b.disabled = false; }
    });
  }

  /* ---------------- início ---------------- */
  async function viewHome(){
    const me = st.me;
    const cards = C.home.slice().sort((a, b) => a.o - b.o);
    /* v3.43: os atalhos seguem a ordem dos grupos do menu (Laboratório, Financeiro, Banca), pro olho achar no mesmo lugar */
    app.innerHTML = C.header('inicio') + `<main class="wrap home">
      <div class="hello"><h1><span class="hl">E aí, ${esc(C.firstName(me.nome))}.</span></h1><p>Teu corre tá <b>${me.visibilidade === 'mocado' ? 'mocado' : 'na vitrine'}</b>. <a href="#/@${esc(me.handle)}">Ver meu perfil</a></p></div>
      <nav class="atalhos" aria-label="Tuas ferramentas"><a class="atalho" href="#/studio">${ico('magia')}<span>Studio</span></a>${C.views.houzi ? `<a class="atalho" href="#/houzi">${ico('houzi')}<span>Studio Houzi</span></a>` : ''}<a class="atalho" href="#/corre">${ico('grana')}<span>Vendas e Grana</span></a><a class="atalho" href="#/banca">${ico('banca')}<span>Banca do dia</span></a><a class="atalho" href="#/refs">${ico('cal')}<span>Do teu nicho</span></a><a class="atalho" href="#/rolo">${ico('rolo')}<span>Rolo 360</span></a>${C.ferr('horus') ? `<a class="atalho" href="#/horus">${ico('eye')}<span>Hórus</span></a>` : ''}<a class="atalho ghost" href="#/@${esc(me.handle)}">${ico('plus')}<span>Teu corre</span></a></nav>
      <section class="card sbar-card" aria-label="Stories" id="h-stories"><div class="sbar"><p class="sb-empty">Carregando stories…</p></div></section>
      <div id="h-grupos" class="h-grupos"></div>
      <div class="feed-grid">
        <div class="feed-main" id="h-feed"></div>
        <aside class="feed-aside" aria-label="Teu corre">
          <div id="h-corre"></div>
          ${C.ehFundador() ? '<div class="feed-rolo" id="h-rolo"></div>' : ''}
          <div class="hgrid side">${cards.map(c => `<div class="hslot" id="hc-${c.k}"><div class="hcard ghost"><span class="hc-name">${{ visitas: 'Visitas', horus: 'Hórus', mural: 'Mural', vendas: 'Vendas', banca: 'Banca do dia', grana: 'Grana', marcas: 'Portfólio', datas: 'Do teu nicho' }[c.k] || ''}</span></div></div>`).join('')}</div>
          <h2 class="sec-t"><span class="hl" id="people-t">Gente no Corre</span></h2>
          <div id="people"><div class="empty">Carregando quem tá no Corre…</div></div>
        </aside>
      </div>
      <p class="foot"><a href="privacidade.html">Privacidade</a> <span class="credit">Londrina desenhada no traço da Monstra</span></p>
    </main>`;
    if(C.correMes) C.correMes($('h-corre'));
    C.storiesBar().then(h => { const el = $('h-stories'); if(el) el.innerHTML = h; });
    if(C.rolo && $('h-rolo')) C.rolo.player($('h-rolo'));
    if(C.feed) C.feed.mount($('h-feed'));
    if(C.grupos) C.grupos.faixaHome($('h-grupos'));
    const STK = { horus: 'olho', rolo: 'camera', banca: 'hype', grana: 'grana', marcas: 'trampo' };
    cards.forEach(c => Promise.resolve().then(() => c.html()).then(h => { const el = $('hc-' + c.k); if(!el) return; if(!h){ el.remove(); return; } el.innerHTML = h; const card = el.querySelector('.hcard'); if(card && ST && STK[c.k]) card.insertAdjacentHTML('beforeend', `<span class="hc-stk" aria-hidden="true">${ST.svg(STK[c.k])}</span>`); }).catch(() => { const el = $('hc-' + c.k); if(el) el.remove(); }));
    try{
      const list = await api.q('corre_perfis', { eq: { visibilidade: 'publico' }, order: ['created_at', false], limit: 30 });
      const others = list.filter(p => p.id !== me.id);
      /* quem seguir: quem você ainda não segue, primeiro o pessoal do teu nicho */
      const sigo = C.feed && C.feed.seguindoIds ? await C.feed.seguindoIds().catch(() => new Set()) : new Set();
      const nicho = p => !!me.categoria && p.categoria === me.categoria;
      const sug = others.filter(p => !sigo.has(p.id)).sort((a, b) => (nicho(b) - nicho(a)) || (!!a.ex - !!b.ex));
      const lista = sug.length ? sug : others, t = $('people-t'); if(t) t.textContent = sug.length ? 'Quem seguir' : 'Gente no Corre';
      $('people').innerHTML = lista.length
        ? `<div class="people">${lista.slice(0, 12).map(p => `<div class="pp"><a class="pp-l" href="#/@${esc(p.handle)}">${avatar(p, 's')}<span><b>${esc(p.nome)}</b><small>@${esc(p.handle)}${p.cidade ? ' · ' + esc(p.cidade) : ''}</small>${nicho(p) ? '<span class="ex nicho">do teu nicho</span>' : p.ex ? '<span class="ex">perfil de exemplo</span>' : ''}</span></a>${sigo.has(p.id) ? '' : `<button type="button" class="btn sm pri pp-seg" data-act="fd-seguir" data-id="${p.id}" aria-pressed="false">Seguir</button>`}</div>`).join('')}</div>`
        : `<div class="empty">Você chegou primeiro. Manda o link do teu perfil pra galera e puxa o povo pro Corre.</div>`;
    }catch(e){ const el = $('people'); if(el) el.innerHTML = `<div class="empty">Não deu pra carregar a lista agora. Atualize a página daqui a pouco.</div>`; }
  }

  /* ---------------- ferramentas (só no teu perfil) ---------------- */
  /* o que é de trabalho pesado sai do menu e mora aqui: o Studio (com porta de entrada) e o Hórus (liga e desliga) */
  function ferramentasHTML(){
    const hz = C.ferr('horus');
    return `<section class="card ferr" aria-label="Teu corre">
      <div class="ferr-h"><h2 class="ch">Teu corre</h2><span class="mono">só você vê</span></div>
      <div class="ferr-l">
        <div class="ferr-i ferr-cart"><span class="ferr-ico">${ico('correal')}</span><div class="ferr-tx"><b>Correal: <span class="num" data-correal-saldo>${C.correal.saldo == null ? '…' : C.correalFmt(C.correal.saldo)}</span></b><small>A moeda do Correverso (não é dinheiro). Cada tarefa feita na cidade vale centavos de correal, até ${C.correalFmt(C.correal.teto)} por dia; correal paga a IA do Studio, do Studio Houzi e do Hórus quando acaba o grátis do dia.</small></div><button type="button" class="btn sm" data-act="carteira">Carteira</button></div>
        <div class="ferr-i"><span class="ferr-ico">${ico('magia')}</span><div class="ferr-tx"><b>Studio</b><small>Programa o mês das marcas que você toca: a IA faz as artes e as legendas, e cada post sai sozinho no Instagram.</small></div><a class="btn sm pri" href="#/studio">${ico('next')} Entrar no Studio</a></div>
        <div class="ferr-i"><span class="ferr-ico">${ico('grana')}</span><div class="ferr-tx"><b>Vendas e Grana</b><small>Do orçamento ao dinheiro na conta: vendas, o que tem pra receber, o extrato e o mês.</small></div><a class="btn sm pri" href="#/corre">${ico('next')} Abrir</a></div>
        ${C.views.houzi ? `<div class="ferr-i"><span class="ferr-ico">${ico('houzi')}</span><div class="ferr-tx"><b>Studio Houzi</b><small>Marca com conceito, do naming ao brandbook: logo em vetor, cores, letra, kit e PDF.</small></div><a class="btn sm" href="#/houzi">Abrir</a></div>` : ''}
        <div class="ferr-i${hz ? ' on' : ''}"><span class="ferr-ico">${ico('eye')}</span><div class="ferr-tx"><b>Hórus</b><small>${hz ? 'Ligado: o radar tá no Início e no teu menu.' : 'Radar de clientes: caça empresa no mapa e monta a abordagem. Liga quando quiser.'}</small></div>
          <div class="ferr-a">${hz ? `<a class="btn sm" href="#/horus">Abrir</a>` : ''}<label class="switch sw-so" title="${hz ? 'Desligar o Hórus' : 'Ligar o Hórus'}"><input type="checkbox" data-chg="ferr-horus"${hz ? ' checked' : ''} aria-label="Hórus ligado"><span class="sw"></span></label></div></div>
        <div class="ferr-i"><span class="ferr-ico">${ico('rolo')}</span><div class="ferr-tx"><b>Rolo 360</b><small>A sala de projeção: 5 lugares do mundo por dia, no escuro, com música clássica. Pra respirar e pegar referência.</small></div><a class="btn sm" href="#/rolo">Abrir</a></div>
        <div class="ferr-i"><span class="ferr-ico">${ico('marcas')}</span><div class="ferr-tx"><b>Portfólio e catálogo</b><small>As marcas que você toca e o que você vende, com preço.</small></div><a class="btn sm" href="#/marcas">Abrir</a></div>
      </div></section>`;
  }

  /* ---------------- perfil público ---------------- */
  const igEmbed = url => { const m = /instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/.exec(url); return m ? `https://www.instagram.com/${m[1]}/${m[2]}/embed/` : ''; };
  async function viewProfile(h){
    app.innerHTML = C.header('') + `<main class="wrap"><section class="card"><p>Abrindo @${esc(h)}…</p></section></main>`;
    let p = null; const rota = C.rota;
    try{ p = await api.one('corre_perfis', { eq: { handle: h } }); }catch(e){ p = null; }
    if(rota !== C.rota) return;
    const mine = p && st.user && p.id === st.user.id;
    if(!p){
      app.innerHTML = C.header('') + `<main class="wrap"><section class="card"><h2 class="ch">Esse perfil não tá na vitrine.</h2><p class="note">Ou o @${esc(h)} não existe, ou o corre tá mocado.</p><div class="acts" style="margin-top:14px"><a class="btn pri" href="#/">Ir pro Corre</a></div></section></main>`;
      return;
    }
    document.title = `${p.nome} (@${p.handle}) · Corre`;
    const [stories, ds, mks, igs, grana, vit] = await Promise.all([
      api.q('corre_stories', { eq: { dono: p.id }, gt: { expira_em: new Date().toISOString() }, order: ['created_at', true] }).catch(() => []),
      C.destaquesDe(p.id).catch(() => []),
      api.q('corre_portfolio', { eq: { dono: p.id }, order: ['ordem', true] }).catch(() => []),
      api.q('corre_insta', { eq: { dono: p.id }, order: ['ordem', true] }).catch(() => []),
      api.rpc('corre_grana_publica', { p: p.id }).catch(() => null),
      api.rpc('corre_vitrine', { p: p.id }).catch(() => null)
    ]);
    if(rota !== C.rota) return;
    const itens = (vit && vit.itens) || [], orcOn = (p.horus || {}).orcamento === 'on', catN = C.meuCorre ? C.meuCorre.catNome(p.categoria) : '';
    const linkOrc = (it) => `#/orcamento/${encodeURIComponent(p.handle)}${it ? '?item=' + encodeURIComponent(it) : ''}`;
    const waP = p.whats_publico ? `https://wa.me/55${p.whats_publico}?text=${encodeURIComponent(`Oi, ${C.firstName(p.nome)}! Vi teu perfil no Corre.`)}` : '';
    const cta = (orcOn || waP) && !mine ? `<div class="pf-cta">${orcOn ? `<a class="btn pri" href="${linkOrc('')}">${ico('recibo')} Pedir orçamento</a>` : ''}${waP ? `<a class="btn" href="${esc(waP)}" target="_blank" rel="noopener">${ico('wa')} Chamar no WhatsApp</a>` : ''}</div>` : '';
    const vitHTML = itens.length || mine ? `<div class="sec-row"><h2 class="sec-t"><span class="hl">O que ${mine ? 'eu vendo' : 'vende'}</span></h2>${mine ? '<a class="btn sm" href="#/marcas">Catálogo</a>' : ''}</div>
      ${itens.length ? `<div class="pf-vit">${itens.map(it => `<article class="pf-it${/^(https:\/\/|data:image\/jpeg;base64,)/.test(it.foto_url || '') ? ' com-foto' : ''}">${/^(https:\/\/|data:image\/jpeg;base64,)/.test(it.foto_url || '') ? `<img class="pf-foto" src="${esc(it.foto_url)}" alt="${esc(it.nome)}" loading="lazy">` : ''}<span class="ct-tipo">${it.tipo === 'produto' ? 'Produto' : 'Serviço'}${it.mensal ? ' · todo mês' : ''}</span><b>${esc(it.nome)}</b>${it.preco != null ? `<span class="pf-preco num">${C.money(it.preco)}${it.unidade ? ` <small>/ ${esc(it.unidade)}</small>` : ''}</span>` : ''}${it.descricao ? `<p>${esc(it.descricao)}</p>` : ''}${orcOn && !mine ? `<a class="btn sm" href="${linkOrc(it.id)}">Quero esse</a>` : ''}</article>`).join('')}</div>`
        : `<div class="empty">Tua vitrine tá vazia. No <a href="#/marcas">catálogo</a>, marca "Mostrar no meu perfil" no que você quer vender por aqui.</div>`}` : '';
    st.dzAtual = ds; st.dzPerfil = p;
    const ring = stories.length > 0;
    /* grana no perfil: valor, faixa ou bolinhas (a máscara já vem pronta do banco). O olho do topo esconde tudo. */
    const bola = s => C.oculto ? String(s).replace(/\d/g, '•') : s;
    const gval = grana ? (grana.valor != null ? C.money(grana.valor) : grana.mascara || (grana.faixa ? bola(grana.faixa) : '')) : '';
    const mesN = C.MESES_L[+String((grana && grana.mes) || C.hojeBR()).slice(5, 7) - 1];
    const nMarcas = grana && grana.marcas ? `${grana.marcas} ${grana.marcas === 1 ? 'marca' : 'marcas'}` : '';
    const gtxt = gval ? `Corre de ${mesN}: ${gval}${nMarcas ? ' · ' + nMarcas : ''}` : nMarcas ? `${nMarcas} no corre` : '';
    /* barra da meta: só a %, e o risquinho de onde o mês está */
    const gm = grana && grana.meta;
    const metaHTML = gm ? (() => {
      const pc = Math.max(0, Number(gm.pct) || 0), rt = Math.max(0, Math.min(100, Number(gm.ritmo) || 0));
      const st = pc >= 100 ? 'Meta do mês batida.' : pc >= rt ? `À frente do mês (o mês tá em ${rt}%).` : `O mês tá em ${rt}%.`;
      return `<div class="pf-meta"><div class="pf-meta-top"><span class="mono">Meta de ${mesN}</span><b class="num">${pc}%</b></div>
        <div class="mbar" role="img" aria-label="${pc}% da meta de ${mesN}. O mês está em ${rt}%."><i style="width:${Math.min(100, pc)}%"></i><span class="tick" style="left:${rt}%"></span></div>
        <small>${st}</small></div>`;
    })() : '';
    const gdica = !mine || gval ? '' : (p.grana_mostra || 'nada') === 'nada'
      ? `A grana tá mocada no perfil. Pra mostrar faixa, valor ou bolinhas: <a href="#/grana">Corre › Grana › No teu perfil</a>.`
      : `Tua grana de ${mesN} não aparece aqui porque nenhuma entrada do mês tem cliente marcado. O perfil só conta dinheiro do corre: em <a href="#/grana">Grana</a>, toca no valor da entrada pra editar e marcar o cliente.${nMarcas ? '' : ' As marcas vêm do teu <a href="#/marcas">Portfólio</a>.'}`;
    app.innerHTML = C.header(mine ? 'perfil' : '') + `<main class="wrap">
      <section class="card prof-page">
        ${mine && C.manual ? `<button type="button" class="pf-manual" data-act="manual" title="Manual do Corre: a lógica do app e o que cada aba faz">${ico('manual')}<span>Manual</span></button>` : ''}
        ${mine ? `<label class="btn sm up-lbl pf-capa-up" title="Trocar a capa">${ico('camera')} <span>${capaOk(p.capa_url) ? 'Trocar capa' : 'Pôr capa'}</span><input type="file" accept="image/*" data-up="capa" aria-label="Trocar a capa do perfil"></label>` : ''}
        <div class="cover${capaOk(p.capa_url) ? ' com-capa' : ''}" aria-hidden="true"${capaOk(p.capa_url) ? ` style="background:url('${p.capa_url}') center/cover no-repeat"` : ''}>${capaOk(p.capa_url) ? '' : ST ? `<span class="stk" style="left:14%;top:52%;--w:92px;--r:-8deg">${ST.svg('monstra')}</span><span class="stk" style="left:84%;top:40%;--w:84px;--r:10deg">${ST.svg('hype')}</span><span class="stk" style="left:62%;top:62%;--w:74px;--r:-4deg">${ST.svg('raio')}</span>` : ''}</div>
        <div class="prof" style="margin-top:12px">
          <div class="pf-avw">${ring ? `<button type="button" class="av-btn" data-act="pf-stories" aria-label="Ver stories de @${esc(p.handle)}">${avatar(p, 'l', true)}</button>` : avatar(p, 'l')}${mine ? `<label class="pf-av-up up-lbl" title="Trocar foto">${ico('camera')}<input type="file" accept="image/*" data-up="foto" aria-label="Trocar foto de perfil"></label>` : ''}</div>
          <div class="who"><span class="nm">${esc(p.nome)}</span><span class="hd">@${esc(p.handle)}</span></div>
          ${p.faz ? `<p class="pf-faz">${esc(p.faz)}</p>` : mine ? `<p class="fine pf-gdica">Diz o que você vende em <a href="#/editar">Editar perfil</a>: o Corre monta teu Hórus, teu Mural e tua vitrine por isso.</p>` : ''}
          ${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ''}
          <div class="meta">${p.aberto ? '<span class="tag trampo">Aberto pra trampo</span>' : ''}${catN && p.categoria !== 'outros' ? `<span class="tag cat">${esc(catN)}</span>` : ''}${p.cidade ? `<span class="tag">${esc(p.cidade)}</span>` : ''}${vit && vit.escolhido ? `<span class="tag">escolhido ${vit.escolhido}x no Mural</span>` : ''}${p.instagram ? `<a class="tag" href="https://www.instagram.com/${encodeURIComponent(p.instagram)}/" target="_blank" rel="noopener">${ico('ig')} @${esc(p.instagram)}</a>` : ''}${gtxt ? `<span class="tag grana">${esc(gtxt)}</span>` : ''}${p.ex ? '<span class="tag">Perfil de exemplo</span>' : ''}${mine && p.visibilidade === 'mocado' ? '<span class="tag moc">Mocado: só você vê</span>' : ''}</div>
          ${cta}
          ${metaHTML}
          ${gdica ? `<p class="fine pf-gdica">${gdica}</p>` : ''}
          <div id="pf-nums"></div>
          <div class="acts"><span id="pf-seguir"></span>${mine ? `<a class="btn pri" href="#/editar">Editar perfil</a><button type="button" class="btn" data-act="st-novo">${ico('plus')} Story</button>` : ''}${p.visibilidade === 'mocado' ? '' : `<button type="button" class="btn" data-act="copiar" data-h="${esc(p.handle)}">Copiar link</button>`}${mine && p.visibilidade !== 'mocado' && C.insta ? `<button type="button" class="btn" data-act="ig-story" data-k="perfil">${ico('ig')} No story do Insta</button>` : ''}${!mine && C.msg ? (p.handle === 'corre' ? `<a class="btn" href="#/msg/@consanans" title="O @corre é o perfil da casa: quem responde é o @consanans">${ico('send')} Falar com o Corre</a>` : `<a class="btn" href="#/msg/@${esc(p.handle)}">${ico('send')} Mensagem</a>`) : ''}${!mine && C.msg && st.user && st.me ? `<button type="button" class="btn ghost" data-act="msg-mandar" data-k="perfil" data-h="${esc(p.handle)}" title="Mandar esse perfil pra alguém">Indicar</button>` : ''}</div>
        </div>
      </section>
      ${mine ? ferramentasHTML() : ''}
      ${vitHTML}
      ${ds.length || mine ? `<h2 class="sec-t"><span class="hl">Destaques</span></h2><section class="card">${C.destaquesHTML(ds, mine)}</section>` : ''}
      <div id="pf-grupos" class="pf-grupos"></div>
      <h2 class="sec-t"><span class="hl">Posts</span></h2>
      <div class="feed-main solo" id="pf-feed"></div>
      ${mks.length || mine ? `<div class="sec-row"><h2 class="sec-t"><span class="hl">Portfólio</span></h2>${mine ? '<a class="btn sm" href="#/marcas">Gerenciar</a>' : ''}</div>${mks.length ? `<div class="mks">${mks.map(m => C.marcaCard(m, false)).join('')}</div>` : '<div class="empty">Coloca as marcas que você tá tocando em Portfólio.</div>'}` : ''}
      <div id="pf-recs" class="pf-recs"></div>
      ${igs.length || mine ? `<div class="sec-row"><h2 class="sec-t"><span class="hl">No Instagram</span></h2>${mine && igs.length < 12 ? `<button type="button" class="btn sm" data-act="ig-add">${ico('plus')} Post</button>` : ''}</div>${igs.length ? `<div class="igs">${igs.map(g => `<figure class="ig">${mine ? `<button type="button" class="ig-del" data-act="ig-del" data-id="${g.id}" aria-label="Tirar post da vitrine">${ico('x')}</button>` : ''}<iframe src="${esc(igEmbed(g.url))}" title="Post do Instagram" loading="lazy" scrolling="no" allowtransparency="true"></iframe></figure>`).join('')}</div>` : '<div class="empty">Escolhe até 12 posts teus pra vitrine. Cola o link do post ou do reel.</div>'}` : ''}
    </main>`;
    st.pfStories = ring ? [{ perfil: p, stories }] : null;
    /* sem login: depois de entrar, volta pra esse perfil */
    if(!st.user){ try{ localStorage.setItem('corre-volta', '#/@' + p.handle); }catch(e){} }
    if(mine && C.correalCarrega) C.correalCarrega();
    if(C.feed){
      C.feed.seguirHTML(p).then(r => { const a = $('pf-nums'), b = $('pf-seguir'); if(a) a.innerHTML = r.nums; if(b) b.innerHTML = r.btn; }).catch(() => {});
      C.feed.mountPerfil($('pf-feed'), p);
      if(C.grupos) C.grupos.doPerfil($('pf-grupos'), p);
      if(C.feed.recs) C.feed.recs($('pf-recs'), p).catch(() => {});
    }
  }

  /* ---------------- rotas ---------------- */
  async function loadMe(){
    if(!st.user){ st.me = null; st.loadedFor = null; st.meErro = false; return; }
    if(st.loadedFor === st.user.id && st.me) return;
    /* erro de rede NÃO é "perfil não existe": tenta de novo e, se não der, avisa (antes caía no cadastro e a pessoa recriava o perfil) */
    st.meErro = false;
    for(let i = 0; i < 3; i++){
      try{ st.me = await api.one('corre_perfis', { eq: { id: st.user.id } }); if(st.me) st.loadedFor = st.user.id; return; }
      catch(e){ if(i < 2) await new Promise(r => setTimeout(r, 700 * (i + 1))); }
    }
    st.me = null; st.meErro = true;
  }
  function viewSemRede(){
    app.innerHTML = C.header('') + `<main class="wrap"><section class="card"><h2 class="ch">Não deu pra carregar teu perfil agora.</h2><p class="note">A internet piscou. Teu perfil tá salvo, é só tentar de novo.</p><div class="acts" style="margin-top:14px"><button type="button" class="btn pri" data-act="tenta-de-novo">Tentar de novo</button></div></section></main>`;
  }
  function viewHorusDesligado(){
    document.title = 'Hórus · Corre';
    app.innerHTML = C.header('horus') + `<main class="wrap"><section class="card ferr-off">
      <span class="mono">${ico('eye')} Hórus</span><h1>O Hórus tá desligado.</h1>
      <p>Ele é o teu radar de clientes: caça empresa no mapa, monta a abordagem e acompanha quem tá quente. Liga quando quiser; teus leads ficam guardados.</p>
      <div class="acts"><button type="button" class="btn pri" data-act="ferr-horus" data-liga="1">${ico('eye')} Ligar o Hórus</button><a class="btn" href="#/@${esc(st.me.handle)}">Voltar pro perfil</a></div></section></main>`;
  }
  /* no balcão do Correverso (iframe), cada página aberta avisa a cidade (tira o "abrindo…") */
  async function route(){
    try{ return await rotaDe(); }
    finally{ if(C.EMBED) C.pai('rota'); if(C.insta) C.insta.barra(); }
  }
  async function rotaDe(){
    C.rota = (C.rota || 0) + 1;
    document.title = 'Corre';
    C.closeSheet();
    document.body.classList.remove('em-bb');
    const h = location.hash.replace(/^#\/?/, '');
    if(C.EMBED){
      /* a cidade é quem tá em volta: #/verso fecha o balcão; #/fechado é o balcão parado, sem nada rodando escondido */
      if(h === 'fechado'){ app.innerHTML = ''; return; }
      if(/^verso(\/|$)/.test(h)){ app.innerHTML = ''; C.pai('fechar'); return; }
    }
    /* logado mas sem perfil (acabou de entrar pelo link de um post, story ou perfil): primeiro o perfil, depois volta pra lá */
    const precisaPerfil = async volta => { if(!st.user) return false; await loadMe(); if(st.me || st.meErro) return false; try{ localStorage.setItem('corre-volta', volta); }catch(e){} viewOnboarding(); return true; };
    if(h.startsWith('@')){ if(await precisaPerfil(location.hash)) return; return viewProfile(decodeURIComponent(h.slice(1)).toLowerCase()); }
    /* Story que veio do Instagram (#/s/@/ID): abre o perfil e o story por cima, sem login. O endereço vira o do perfil. */
    if(h.startsWith('s/')){
      const [hh, sid] = h.slice(2).split('/'), hd = decodeURIComponent(hh || '').toLowerCase().replace(/[^a-z0-9_.]/g, '');
      if(await precisaPerfil('#/@' + hd)) return;
      try{ history.replaceState(null, '', location.pathname + location.search + '#/@' + hd); }catch(e){}
      await viewProfile(hd);
      if(C.insta) C.insta.abreStory(hd, sid);
      return;
    }
    /* Mural: o mural, o pedido e a página de quem pediu abrem sem login */
    if((h === 'mural' || h.startsWith('mural/')) && C.views.mural){ if(st.user) await loadMe(); window.scrollTo(0, 0); return C.views.mural(app, h.slice(6)); }
    /* Feed: a conversa de um post (#/p/ID) abre sem login, pra dar pra mandar o link */
    if(h.startsWith('p/') && C.views.post){ if(await precisaPerfil(location.hash)) return; window.scrollTo(0, 0); return C.views.post(app, decodeURIComponent(h.slice(2))); }
    /* Grupos (v3.36): a vitrine e a página do grupo abrem sem login (grupo aberto mostra os posts; fechado, só a capa) */
    if(h.startsWith('g/') && C.views.grupo){ if(await precisaPerfil(location.hash)) return; window.scrollTo(0, 0); return C.views.grupo(app, h.slice(2)); }
    if(h === 'grupos' && C.views.grupos){ if(await precisaPerfil(location.hash)) return; window.scrollTo(0, 0); return C.views.grupos(app); }
    /* Studio Houzi (v3.37): a casa do Studio e o brandbook publicado abrem sem login (o resto do Studio pede login) */
    if(h === 'houzi' && C.views.houzi){ if(await precisaPerfil(location.hash)) return; window.scrollTo(0, 0); return C.views.houzi(app, ''); }
    if(h.startsWith('bb/') && C.views.bb){ if(st.user) await loadMe(); window.scrollTo(0, 0); return C.views.bb(app, h.slice(3)); }
    if(!st.user && /^houzi\//.test(h)){ try{ localStorage.setItem('corre-volta', location.hash); }catch(e){} }
    /* Vendas: o orçamento que o cliente recebe abre sem login */
    if(h.startsWith('o/') && C.views.orcamentoVenda){ if(st.user) await loadMe(); window.scrollTo(0, 0); return C.views.orcamentoVenda(app, decodeURIComponent(h.slice(2))); }
    /* Hórus 4: o link público de orçamento abre sem login */
    if(h.startsWith('orcamento/') && C.views.orcamento){ if(st.user) await loadMe(); return C.views.orcamento(app, decodeURIComponent(h.slice(10))); }
    if(!st.user && /^msg(\/|$)/.test(h)){ try{ localStorage.setItem('corre-volta', location.hash); }catch(e){} }
    if(!st.user){ if(C.EMBED){ app.innerHTML = ''; C.pai('fechar'); return; } return viewLogin(); }
    await loadMe();
    if(!st.me) return st.meErro ? viewSemRede() : viewOnboarding();
    /* voltou do login do Google: leva pra onde a pessoa tava (ex.: o pedido do Mural) */
    let volta = ''; try{ volta = localStorage.getItem('corre-volta') || ''; if(volta) localStorage.removeItem('corre-volta'); }catch(e){}
    if(volta && /^#\/((mural|p|msg|g|houzi)\/|@[a-z0-9_.]{3,24}$|grupos$|houzi$)/.test(volta) && volta !== location.hash){ location.hash = volta; return; }
    /* já tem perfil: convite de link não vale mais (só quem acabou de entrar segue quem chamou) */
    if(C.insta) C.insta.limpaConvite();
    window.scrollTo(0, 0);
    if(h === 'editar') return viewEdit();
    /* o aviso no celular de "seguidores novos" abre o sino por cima do Início */
    if(h === 'avisos'){ try{ history.replaceState(null, '', location.pathname + location.search + '#/'); }catch(e){} await viewHome(); if(C.avisos) C.avisos.abrir(); return; }
    /* o Rolo 360 é só do @consanans; o Hórus só abre ligado (Perfil › Ferramentas) */
    if(h === 'horus' && !C.ferr('horus')) return viewHorusDesligado();
    if(h.startsWith('marca/') && C.views.marca) return C.views.marca(app, h.slice(6));
    if((h === 'studio' || h.startsWith('studio/')) && C.views.studio) return C.views.studio(app, h.slice(7));
    if(h.startsWith('houzi/') && C.views.houzi) return C.views.houzi(app, h.slice(6));
    if((h === 'msg' || h.startsWith('msg/')) && C.views.msg) return C.views.msg(app, h.slice(4));
    const v = C.views[h];
    if(v) return v(app);
    return viewHome();
  }
  /* no balcão a navegação troca o endereço sem empilhar histórico: o "voltar" do celular fecha o balcão */
  function go(h){ if(location.hash === h || (h === '#/' && !location.hash)) route(); else if(C.EMBED) location.replace(location.pathname + location.search + h); else location.hash = h; }
  C.go = go; C.refresh = () => route();
  /* depois de mexer no perfil em outro lugar (o balcão da cidade), relê do banco */
  C.recarregaMe = async () => { if(!st.user) return; try{ const m = await api.one('corre_perfis', { eq: { id: st.user.id } }); if(m && st.user && m.id === st.user.id){ st.me = m; st.loadedFor = m.id; } }catch(e){} };

  /* ---------------- ações ---------------- */
  Object.assign(C.acts, {
    'tenta-de-novo': () => { st.loadedFor = null; route(); },
    'corre-ir': el => { const s = $('corre-' + el.dataset.k); if(s) s.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
    /* Hórus liga e desliga no perfil; ligado, ganha atalho no Início e no menu do avatar */
    'ferr-horus': async el => {
      const liga = el.type === 'checkbox' ? el.checked : el.dataset.liga === '1';
      const f = Object.assign({}, (st.me && st.me.ferramentas) || {}, { horus: liga });
      try{ await C.saveMe({ ferramentas: f }); toast(liga ? 'Hórus ligado. Tá no teu perfil e no Início.' : 'Hórus desligado. Teus leads ficam guardados.', 3200); if(el.type !== 'checkbox' && liga){ go('#/horus'); return; } route(); }
      catch(e){ if(el.type === 'checkbox') el.checked = !liga; toast(C.errMsg(e)); }
    },
    'iab-copia': () => C.copy(C.insta ? C.insta.linkAqui() : location.origin + location.pathname, 'Link copiado. Cola no navegador.'),
    'tira-capa': async el => { try{ await C.saveMe({ capa_url: '' }); const pv = $('pf-capa-prev'); if(pv) pv.style.backgroundImage = ''; el.hidden = true; toast('Capa tirada. Volta a capa padrão do Corre.'); }catch(e){ toast(C.errMsg(e, 'Não deu pra tirar a capa.')); } },
    google: async el => {
      const sp = el.querySelector('span'), antes = sp ? sp.textContent : '';
      el.disabled = true; if(sp) sp.textContent = 'Abrindo o Google…';
      try{ await api.login(); }
      catch(err){ toast(err && err.code === 'off' ? 'O login do Corre ainda não tá ligado neste endereço.' : 'Não deu pra abrir o login do Google. Tente de novo.', 4200); el.disabled = false; if(sp) sp.textContent = antes; }
    },
    /* o fundo escuro atrás da gaveta do celular fecha a gaveta */
    'gaveta-x': el => { const d = el.closest('details'); if(d) d.open = false; },
    /* "Postar" do menu (e o botão redondo do celular): vai pro feed e já abre o campo do post */
    'lado-postar': () => { const t = $('fd-t'); if(t){ t.scrollIntoView({ block: 'center', behavior: 'smooth' }); t.focus(); return; } C.focoPost = true; go('#/'); },
    sair: async () => { if(C.push) await C.push.sair(); if(C.msg) C.msg.para(); await api.logout(); st.user = null; st.me = null; st.loadedFor = null; try{ sessionStorage.removeItem('corre-verso-volta'); }catch(e){} go('#/'); },
    oculto: () => { C.oculto = !C.oculto; const y = scrollY; route().then(() => scrollTo(0, y)); toast(C.oculto ? 'Valores escondidos.' : 'Valores à mostra.'); },
    copiar: el => copy(C.insta ? C.insta.linkPerfil(el.dataset.h) : C.profileUrl(el.dataset.h), 'Link copiado.'),
    'pf-stories': () => { if(st.pfStories) C.storyOpen(st.pfStories, 0, 'feed'); },
    'ig-add': () => {
      C.sheet(`<form class="form" id="ig-f"><div class="sheet-head"><h2>Post na vitrine</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
        <div class="fld"><label for="ig-u">Link do post ou do reel</label><input class="inp" id="ig-u" placeholder="https://www.instagram.com/p/…" inputmode="url" autofocus></div>
        <p class="fine">No Instagram: abre o post → ⋯ → Copiar link. O post precisa ser de conta pública.</p>
        <div class="acts"><button type="submit" class="btn pri">Pôr na vitrine</button></div></form>`);
      $('ig-f').addEventListener('submit', async e => {
        e.preventDefault();
        const m = /instagram\.com\/(?:[A-Za-z0-9_.]+\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]{5,40})/.exec($('ig-u').value);
        if(!m){ toast('Esse link não é de post do Instagram.'); return; }
        const kind = m[1] === 'reels' ? 'reel' : m[1];
        try{ await api.ins('corre_insta', { url: `https://www.instagram.com/${kind}/${m[2]}/`, ordem: Date.now() % 1e9 }); C.closeSheet(); toast('Post na vitrine.'); route(); }
        catch(err){ toast(err && err.code === '23505' ? 'Esse post já tá na vitrine.' : C.errMsg(err)); }
      });
    },
    'ig-del': async el => {
      if(el.dataset.armed !== '1'){ el.dataset.armed = '1'; el.classList.add('armed'); toast('Toca de novo pra tirar da vitrine.'); return; }
      try{ await api.del('corre_insta', { id: el.dataset.id }); route(); }catch(e){ toast(C.errMsg(e)); }
    },
    'apagar-conta': async () => {
      const v = ($('del-h').value || '').trim().replace(/^@/, '').toLowerCase();
      if(v !== st.me.handle){ toast('Digite teu @ certinho pra confirmar.'); $('del-h').focus(); return; }
      try{ if(C.push) await C.push.sair(); await api.del('corre_perfis', { id: st.user.id }); toast('Perfil apagado.'); await api.logout(); st.user = null; st.me = null; st.loadedFor = null; go('#/'); }
      catch(e){ toast(C.errMsg(e)); }
    }
  });
  document.addEventListener('click', e => {
    const cl = e.target.closest('[data-close]'); if(cl){ C.closeSheet(); return; }
    const el = e.target.closest('[data-act]'); if(!el) return;
    const f = C.acts[el.dataset.act]; if(!f) return;
    if(el.tagName === 'BUTTON') e.preventDefault();
    const m = el.closest('details.me, details.lado-mais'); if(m && m.open) m.open = false;
    Promise.resolve(f(el, e)).catch(err => toast(C.errMsg(err)));
  });
  document.addEventListener('change', e => {
    const el = e.target.closest('[data-chg]'); if(!el) return;
    const f = C.acts[el.dataset.chg]; if(f) Promise.resolve(f(el, e)).catch(err => toast(C.errMsg(err)));
  });
  /* os menus que abrem por cima (a conta, o Mais e a gaveta do celular): fecham ao tocar fora ou num item */
  document.addEventListener('click', e => {
    document.querySelectorAll('details.me[open], details.lado-mais[open]').forEach(m => { if(!m.contains(e.target) || (e.target.closest('.me-menu a, .lado-mais-m a') && m.contains(e.target))) m.open = false; });
  });
  document.addEventListener('keydown', e => { if(e.key === 'Escape') document.querySelectorAll('details.me[open], details.lado-mais[open]').forEach(m => { m.open = false; }); });
  /* o Mais e a conta do computador abrem do lado do menu. O menu rola, então o balão fica preso à tela (fixo), e a
     posição sai do item clicado antes de abrir: o de cima desce a partir do item, o de baixo sobe a partir dele */
  document.addEventListener('click', e => {
    const s = e.target.closest('.lado-mais > summary, .lado-conta > summary'); if(!s) return;
    const d = s.parentElement, m = d.querySelector('.lado-mais-m, .me-menu'), l = d.closest('.lado'); if(!m || !l || d.open) return;
    const r = s.getBoundingClientRect(), L = l.getBoundingClientRect(), sobe = d.classList.contains('lado-conta') || r.top > innerHeight * 0.55;
    m.style.left = Math.round(L.right + 10) + 'px';
    m.style.top = sobe ? 'auto' : Math.round(Math.max(12, r.top - 6)) + 'px';
    m.style.bottom = sobe ? Math.round(Math.max(12, innerHeight - r.bottom - 6)) + 'px' : 'auto';
  });
  addEventListener('resize', () => document.querySelectorAll('details.lado-mais[open], details.lado-conta[open]').forEach(m => { m.open = false; }));
  /* abriu um grupo do menu (clique, Enter ou Espaço viram clique): se a lista rola, o último item dele aparece inteiro.
     Os grupos não entram nas listas de cima (fechar ao tocar fora ou com o Esc): não ficam por cima de nada */
  document.addEventListener('click', e => {
    const s = e.target.closest('.lado-g > summary'); if(!s) return;
    setTimeout(() => { const d = s.parentElement; if(d.open) aVista(d.querySelector('.lado-g-m > :last-child')); }, 0);
  });
  /* tocar em "Correverso" já estando em #/verso não muda o endereço, então o navegador não avisa ninguém:
     se a cidade tiver parada (voltou pelo botão voltar, aba restaurada...), abre de novo */
  document.addEventListener('click', e => {
    if(e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href="#/verso"]'); if(!a || location.hash !== '#/verso') return;
    if(C.verso && C.verso.vivo && C.verso.vivo()) return;
    e.preventDefault(); route();
  });
  /* página restaurada do cache do navegador (voltar depois de abrir um link de fora): a cidade foi desligada ao sair */
  addEventListener('pageshow', e => { if(e.persisted && /^#\/verso/.test(location.hash) && st.user) route(); });
  document.addEventListener('keydown', e => {
    if(e.key !== 'Escape') return;
    const sh = $('sheet'), aberta = !!(sh && !sh.hidden);
    C.closeSheet();
    if(C.EMBED && !aberta) C.pai('fechar');
  });
  if(C.EMBED){
    /* link interno dentro do balcão: troca de página sem empilhar histórico */
    document.addEventListener('click', e => {
      if(e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest('a[href^="#"]'); if(!a || a.target || a.hasAttribute('download')) return;
      const h = a.getAttribute('href'); if(h === '#') return;
      e.preventDefault(); go(h);
    }, true);
    /* a cidade manda trocar de barraca (o mesmo balcão vai de uma pra outra sem recarregar) */
    addEventListener('message', e => {
      if(e.origin !== location.origin || e.source !== window.parent) return;
      const m = e.data; if(!m || m.corre !== 'balcao' || m.t !== 'ir' || typeof m.h !== 'string' || !/^#\/[^\s<>"]*$/.test(m.h)) return;
      /* o perfil pode ter mudado lá fora (ligou o Hórus no perfil, trocou o avatar): cada barraca relê do banco */
      if(m.h !== '#/fechado') st.loadedFor = null;
      window.scrollTo(0, 0); go(m.h);
    });
  }
  addEventListener('hashchange', route);

  /* ---------------- céu e adesivos ---------------- */
  if(ST){ document.body.insertAdjacentHTML('afterbegin', ST.DEFS); const c = $('sky'); if(c && !C.EMBED) ST.sky(c); }

  /* ---------------- início ---------------- */
  (async function boot(){
    try{ st.user = await api.init(); }
    catch(e){ app.innerHTML = `<div class="boot"><span>Não deu pra conectar ao Corre agora. Atualize a página.</span></div>`; return; }
    api.onAuth((u) => {
      const changed = (u && u.id) !== (st.user && st.user.id);
      st.user = u;
      if(changed){ st.loadedFor = null; st.me = null; route(); }
    });
    route().then(() => C.pai('pronto'), () => C.pai('pronto'));
    /* v3.40: a volta do login do Instagram (o ig.html guardou o código) */
    if(C.ig) C.ig.volta();
  })();
})();
