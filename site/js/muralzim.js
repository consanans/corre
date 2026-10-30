/* CORRE · O MURALZIM (v5.09)
   O Thales mandou o Muralzim, a agenda de eventos em lambe-lambe, e pediu: "no mapa onde tem agenda da cidade, nós vamos
   instalar o muralzim, a plataforma de eventos/ingresso" e "o muralzim de verdade deve cobrar através da chave do asaas
   de verdade". Escolheu: o Asaas divide na hora (o dinheiro do ingresso cai na conta Asaas de quem organiza; a taxa
   fica com o Corre) e o Corre fica com 10% pago por quem compra, no mínimo R$ 2 por ingresso.
     #/muralzim               o muro de cartazes (aberto, sem login): os 14 dias, as categorias, o fim de semana, só grátis
                              e só com ingresso aqui. O cartaz abre a ficha (e #/muralzim/e/ID abre direto nela)
     #/muralzim/divulgar      divulgar (e #/muralzim/editar/ID): de graça, paga na porta ou ingresso vendido aqui, com
                              os tipos de ingresso (inteira, meia, lote) e a prévia do cartaz
     #/muralzim/conta         a conta de recebimento: abrir a conta no Asaas pelo Corre, ou colar o Wallet ID de uma que
                              a pessoa já tem. Até o Asaas aprovar, o evento não vende
     #/muralzim/meus          os meus eventos, com o que vendeu e quantos entraram
     #/muralzim/vendas/ID     as vendas de um evento (por tipo e cada ingresso) e o cancelar que devolve o dinheiro
     #/muralzim/portaria/ID   a portaria: o código digitado ou o QR lido pela câmera
     #/muralzim/ingressos     os meus ingressos, com o QR (que leva pra #/muralzim/i/CODIGO) e o desistir
   O preço, a taxa e pra onde vai cada parte saem do banco; quem fala com o Asaas é a função "pagamento". */
(function(){
  'use strict';
  const C = window.Corre, { $, esc, ico, toast } = C;

  const CATS = [['musica', 'Música'], ['festa', 'Festa'], ['teatro', 'Teatro'], ['arte', 'Arte'], ['cinema', 'Cinema'], ['comida', 'Comida'],
    ['esporte', 'Esporte'], ['oficina', 'Oficina'], ['infantil', 'Infantil']];
  const CAT = Object.fromEntries(CATS);
  const CLASS = { L: 'Livre para todos os públicos', 10: 'Não recomendado para menores de 10 anos', 12: 'Não recomendado para menores de 12 anos',
    14: 'Não recomendado para menores de 14 anos', 16: 'Não recomendado para menores de 16 anos', 18: 'Não recomendado para menores de 18 anos' };
  const DOW = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'], DOW_L = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const MON = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const MON_L = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const semFn = e => !!e && (e.code === 'PGRST202' || e.code === '42883' || /Could not find the function|does not exist/i.test(e.message || ''));
  const logado = () => !!(C.st.user && C.st.me);
  const pad = n => String(n).padStart(2, '0');
  /* o dia de hoje em Brasília (o mesmo do banco) */
  const hoje = () => new Date(Date.now() - 3 * 36e5).toISOString().slice(0, 10);
  const maisDias = (ymd, n) => new Date(Date.parse(ymd + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
  const dataDe = ymd => { const [y, m, d] = String(ymd).split('-').map(Number); return new Date(Date.UTC(y, m - 1, d, 12)); };
  const hora = t => { const m = /^(\d{2}):(\d{2})/.exec(t || ''); return m ? Number(m[1]) + 'h' + (m[2] === '00' ? '' : m[2]) : ''; };
  const real = v => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: Number.isInteger(Number(v)) ? 0 : 2, maximumFractionDigits: 2 });
  const realC = v => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  /* a taxa do Corre por ingresso, igual à do banco (10%, mínimo R$ 2): aqui só pra mostrar antes de pagar */
  const taxaDe = p => Math.max(Math.round(Number(p) * 10 + 1e-7) / 100, 2);
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  const codFmt = c => String(c || '').replace(/^(.{4})(.{4})(.{4})$/, '$1-$2-$3');
  const codDe = t => { const m = /([A-HJ-NP-Z2-9]{4})-?([A-HJ-NP-Z2-9]{4})-?([A-HJ-NP-Z2-9]{4})(?![A-Z0-9])/.exec(String(t || '').toUpperCase()); return m ? m[1] + m[2] + m[3] : ''; };
  const urlIngresso = c => location.origin + location.pathname.replace(/[^/]*$/, '') + '#/muralzim/i/' + c;
  const abaNova = () => { if(C.DEMO) return null; try{ return window.open('', '_blank'); }catch(e){ return null; } };
  const leva = (w, link) => { if(!w) return false; if(!link){ try{ w.close(); }catch(e){} return false; } try{ w.opener = null; w.location.href = link; return true; }catch(e){ return false; } };
  const store = { get(k, d){ try{ const v = JSON.parse(sessionStorage.getItem(k)); return v == null ? d : v; }catch(e){ return d; } }, set(k, v){ try{ sessionStorage.setItem(k, JSON.stringify(v)); }catch(e){} }, tira(k){ try{ sessionStorage.removeItem(k); }catch(e){} } };

  /* ---------------- o estado ---------------- */
  const Z = { lista: null, at: 0, q: '', cat: 'all', dia: null, fds: false, gratis: false, aqui: false, passados: false, org: undefined, cp: null, pagando: null };
  async function carrega(fresca){
    if(!fresca && Z.lista && Date.now() - Z.at < 60e3) return Z.lista;
    try{ Z.lista = await C.api.rpc('corre_eventos_lista', { p_cidade: null }) || []; Z.at = Date.now(); }
    catch(e){ if(semFn(e)) Z.lista = null; else throw e; }
    return Z.lista;
  }
  const doId = id => (Z.lista || []).find(e => e.id === id);
  async function orgMeu(fresca){
    if(!logado()) return null;
    if(!fresca && Z.org !== undefined) return Z.org;
    try{ Z.org = await C.api.rpc('corre_org_meu', {}); }catch(e){ Z.org = null; }
    return Z.org;
  }

  /* ---------------- o cartaz ---------------- */
  const classHTML = r => { const k = CLASS[r] ? String(r) : 'L'; return `<span class="mz-cl mz-cl-${k === 'L' ? 'l' : k}" title="${esc(CLASS[k])}">${esc(k)}</span>`; };
  const precoCurto = ev => ev.entrada === 'gratis' ? 'Grátis' : ev.entrada === 'porta' ? real(ev.preco) : ev.desde != null ? ((ev.lotes || []).length > 1 || ev.varios ? 'desde ' : '') + real(ev.desde) : 'R$ —';
  function posterHTML(ev, o = {}){
    const cat = CAT[ev.categoria] ? ev.categoria : 'musica', d = ev.dia ? dataDe(ev.dia) : null, passou = ev.dia && ev.dia < hoje();
    const lugar = [ev.bairro, ev.cidade].filter(Boolean).join(' · ');
    const selo = ev.status === 'cancelado' ? '<span class="mz-selo mz-s-x">Cancelado</span>' : ev.esgotado ? '<span class="mz-selo">Esgotado</span>'
      : ev.vende ? `<span class="mz-selo mz-s-aqui">${ico('ingresso')}Ingresso aqui</span>` : ev.exemplo ? '<span class="mz-selo">Exemplo</span>' : '';
    return `<article class="mz-poster mz-c-${cat}${passou || o.passou ? ' passou' : ''}${ev.status === 'cancelado' ? ' cancelado' : ''}" style="--i:${o.i || 0}">
      <div class="mz-p-head"><span>${esc(CAT[cat])}</span>${classHTML(ev.classif)}</div>
      <h3 class="mz-p-t">${esc(ev.titulo || 'Nome do evento')}</h3>
      <p class="mz-p-l">${esc(ev.local || 'Local')}${lugar ? `<span>${esc(lugar)}</span>` : ''}</p>
      <div class="mz-p-d"><span class="mz-p-dd">${d ? d.getUTCDate() : '00'}</span><span class="mz-p-ds"><span>${d ? DOW[d.getUTCDay()] : 'DIA'}</span><span>${d ? MON[d.getUTCMonth()] : 'MÊS'}</span></span><span class="mz-p-h">${esc(hora(ev.inicio) || '--h')}</span></div>
      <div class="mz-p-foot"><span>${esc(precoCurto(ev))}</span>${selo}</div>
      ${o.link === false ? '' : `<a class="mz-p-abre" href="#/muralzim/e/${esc(ev.id)}"><span class="sr">Ver ${esc(ev.titulo)}</span></a>`}
    </article>`;
  }

  /* ---------------- o muro ---------------- */
  const fds = () => {
    const h = dataDe(hoje()), w = h.getUTCDay(), hj = hoje();
    if(w === 0) return [hj, hj];
    if(w >= 5) return [hj, maisDias(hj, 7 - w)];
    const sex = maisDias(hj, 5 - w); return [sex, maisDias(sex, 2)];
  };
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  function bate(ev){
    if(Z.cat !== 'all' && ev.categoria !== Z.cat) return false;
    if(Z.gratis && ev.entrada !== 'gratis') return false;
    if(Z.aqui && !ev.vende) return false;
    if(Z.q){ const tudo = norm([ev.titulo, ev.local, ev.bairro, ev.cidade, ev.organizador, CAT[ev.categoria], ev.quem && ev.quem.handle].join(' ')); if(!norm(Z.q).split(/\s+/).filter(Boolean).every(w => tudo.includes(w))) return false; }
    return true;
  }
  const quando = ev => { if(Z.dia) return ev.dia === Z.dia; if(Z.fds){ const [a, b] = fds(); return ev.dia >= a && ev.dia <= b; } return true; };
  const filtrando = () => !!(Z.q || Z.cat !== 'all' || Z.dia || Z.fds || Z.gratis || Z.aqui);

  async function viewMural(app, abrir){
    document.title = 'Muralzim · Corre';
    app.innerHTML = C.header('muralzim') + `<main class="wrap mz-w"><div class="mz" id="mz"><p class="mz-carrega">Abrindo o Muralzim…</p></div></main>`;
    try{ await carrega(); }catch(e){ const el = $('mz'); if(el) el.innerHTML = `<p class="mz-carrega">Não deu pra abrir o Muralzim agora. ${esc(C.errMsg(e))}</p>`; return; }
    const el = $('mz'); if(!el) return;
    if(Z.lista === null){ el.innerHTML = '<p class="mz-carrega">O Muralzim tá chegando: a agenda abre assim que o banco for atualizado.</p>'; return; }
    el.innerHTML = muroHTML();
    pintaFiltros();
    if(abrir) abreEvento(abrir);
  }
  function muroHTML(){
    const eu = logado();
    return `<header class="mz-top">
        <div class="mz-marca"><b>MURALZIM</b><small>agenda de Londrina</small></div>
        <label class="mz-busca" for="mz-q"><span class="sr">Procurar evento</span>${ico('lupa')}<input id="mz-q" type="search" placeholder="Evento, lugar ou bairro" autocomplete="off" value="${esc(Z.q)}"></label>
        <a class="mz-btn pri" href="#/muralzim/divulgar">${ico('plus')} Divulgar evento</a>
      </header>
      <section class="mz-intro"><h1>O que tem<br>pra fazer</h1>
        <p>Shows, festas, teatro, feiras e oficinas em Londrina. Toca num cartaz pra ver endereço, horário, preço e classificação. Com o carimbo <span class="mz-selo mz-s-aqui">${ico('ingresso')}Ingresso aqui</span>, o ingresso sai no Corre, no Pix ou no cartão.</p>
        ${eu ? `<nav class="mz-meus" aria-label="O que é teu"><a href="#/muralzim/ingressos">${ico('ingresso')} Meus ingressos</a><a href="#/muralzim/meus">${ico('cal')} Meus eventos</a></nav>` : ''}
      </section>
      <section class="mz-ctl" aria-label="Filtros">
        <div class="mz-dias-w"><div class="mz-dias" id="mz-dias" role="group" aria-label="Próximos 14 dias">${diasHTML()}</div></div>
        <div class="mz-cats" id="mz-cats" role="group" aria-label="Categorias"></div>
        <div class="mz-meta"><p class="mz-res" id="mz-res" aria-live="polite"></p>
          <div class="mz-tg"><button type="button" class="mz-chip" data-act="mz-fds" aria-pressed="false">Fim de semana</button><button type="button" class="mz-chip" data-act="mz-gratis" aria-pressed="false">Só grátis</button><button type="button" class="mz-chip" data-act="mz-aqui" aria-pressed="false">${ico('ingresso')}Ingresso aqui</button><button type="button" class="mz-limpa" data-act="mz-limpa" hidden>Limpar filtros</button></div></div>
      </section>
      <section class="mz-board" aria-label="Os cartazes"><div class="mz-muro" id="mz-muro"></div><div class="mz-past" id="mz-past"></div></section>
      <footer class="mz-foot"><p><b>Muralzim</b> · a agenda de Londrina no Corre</p><div class="mz-leg" aria-label="Classificação indicativa"><span>Classificação</span>${Object.keys(CLASS).sort((a, b) => (a === 'L' ? -1 : b === 'L' ? 1 : a - b)).map(classHTML).join('')}</div></footer>`;
  }
  function diasHTML(){
    const hj = hoje(); let h = '', mes = -1;
    for(let i = 0; i < 14; i++){
      const ymd = maisDias(hj, i), d = dataDe(ymd), we = d.getUTCDay() === 0 || d.getUTCDay() === 6;
      if(d.getUTCMonth() !== mes){ mes = d.getUTCMonth(); h += `<span class="mz-mes" aria-hidden="true">${MON[mes]}</span>`; }
      h += `<button type="button" class="mz-dia${we ? ' fds' : ''}" data-act="mz-dia" data-d="${ymd}" aria-pressed="false"><span class="mz-dow">${i === 0 ? 'HOJE' : DOW[d.getUTCDay()]}</span><span class="mz-num">${d.getUTCDate()}</span><span class="mz-pts" aria-hidden="true"></span></button>`;
    }
    return h;
  }
  function pintaFiltros(){
    const hj = hoje(), L = Z.lista || [], vem = L.filter(e => e.dia >= hj).sort((a, b) => (a.dia + a.inicio).localeCompare(b.dia + b.inicio));
    /* os dias: os pontinhos dizem quantos eventos tem em cada um (com os filtros de categoria e busca) */
    const conta = {}; vem.filter(bate).forEach(e => { conta[e.dia] = (conta[e.dia] || 0) + 1; });
    document.querySelectorAll('#mz-dias .mz-dia').forEach(b => {
      const k = b.dataset.d, n = conta[k] || 0, d = dataDe(k);
      b.setAttribute('aria-pressed', String(Z.dia === k)); b.classList.toggle('vazio', !n);
      b.querySelector('.mz-pts').innerHTML = '<i></i>'.repeat(Math.min(n, 4));
      b.setAttribute('aria-label', `${DOW_L[d.getUTCDay()]}, ${d.getUTCDate()} de ${MON_L[d.getUTCMonth()]}: ${n ? plural(n, 'evento', 'eventos') : 'nenhum evento'}`);
    });
    /* as categorias que têm evento pela frente */
    const porCat = {}; vem.forEach(e => { porCat[e.categoria] = (porCat[e.categoria] || 0) + 1; });
    const tem = CATS.filter(([k]) => porCat[k]), cats = $('mz-cats');
    if(cats){ cats.hidden = tem.length < 2;
      cats.innerHTML = `<button type="button" class="mz-chip" data-act="mz-cat" data-k="all" aria-pressed="${Z.cat === 'all'}">Todas <span class="n">${vem.length}</span></button>` +
        tem.map(([k, n]) => `<button type="button" class="mz-chip" data-act="mz-cat" data-k="${k}" aria-pressed="${Z.cat === k}"><i class="mz-sw mz-c-${k}"></i>${esc(n)} <span class="n">${porCat[k]}</span></button>`).join(''); }
    document.querySelectorAll('[data-act="mz-fds"]').forEach(b => b.setAttribute('aria-pressed', String(Z.fds)));
    document.querySelectorAll('[data-act="mz-gratis"]').forEach(b => b.setAttribute('aria-pressed', String(Z.gratis)));
    document.querySelectorAll('[data-act="mz-aqui"]').forEach(b => b.setAttribute('aria-pressed', String(Z.aqui)));
    const lp = document.querySelector('[data-act="mz-limpa"]'); if(lp) lp.hidden = !filtrando();
    /* o muro */
    const muro = $('mz-muro'); if(!muro) return;
    const lista = vem.filter(e => bate(e) && quando(e));
    muro.innerHTML = lista.length ? lista.map((e, i) => posterHTML(e, { i })).join('')
      : !vem.length ? `<div class="mz-vazio"><p class="mz-vazio-t">Nenhum evento marcado</p><p>Os cartazes dos próximos eventos de Londrina aparecem aqui. Tem um rolê pra divulgar?</p><a class="mz-btn pri" href="#/muralzim/divulgar">${ico('plus')} Divulgar o primeiro</a></div>`
      : `<div class="mz-vazio"><p class="mz-vazio-t">Nada por aqui</p><p>Nenhum evento combina com esses filtros.</p><button type="button" class="mz-btn" data-act="mz-limpa">Limpar filtros</button></div>`;
    let r;
    if(!filtrando()) r = vem.length ? plural(vem.length, 'evento', 'eventos') + ' a partir de hoje' : 'Nenhum evento marcado';
    else if(Z.dia){ const d = dataDe(Z.dia); r = `${plural(lista.length, 'evento', 'eventos')} ${DOW_L[d.getUTCDay()].toLowerCase()}, ${d.getUTCDate()}/${pad(d.getUTCMonth() + 1)}`; }
    else if(Z.fds) r = plural(lista.length, 'evento', 'eventos') + ' neste fim de semana';
    else r = `${lista.length} de ${plural(vem.length, 'evento', 'eventos')}`;
    const res = $('mz-res'); if(res) res.textContent = r;
    /* o que já passou (do mês que passou), em preto e branco */
    const past = $('mz-past'), foi = L.filter(e => e.dia < hj).sort((a, b) => (b.dia + b.inicio).localeCompare(a.dia + a.inicio));
    if(past) past.innerHTML = !foi.length ? '' : `<button type="button" class="mz-limpa" data-act="mz-passados" aria-expanded="${Z.passados}">${Z.passados ? 'Esconder os que já passaram' : 'Ver ' + plural(foi.length, 'evento que já passou', 'eventos que já passaram')}</button>`
      + (Z.passados ? `<div class="mz-muro">${foi.filter(bate).map((e, i) => posterHTML(e, { i, passou: true })).join('')}</div>` : '');
  }

  /* ---------------- a ficha do evento ---------------- */
  const dataLonga = ev => { const d = dataDe(ev.dia), hj = hoje(); return `${ev.dia === hj ? 'Hoje · ' : ev.dia === maisDias(hj, 1) ? 'Amanhã · ' : ''}${DOW_L[d.getUTCDay()]}, ${d.getUTCDate()} de ${MON_L[d.getUTCMonth()]} de ${d.getUTCFullYear()}`; };
  const faixaHora = ev => { const a = hora(ev.inicio), b = hora(ev.fim); if(!a) return ''; const h1 = Number(String(ev.inicio).slice(0, 2)); if(!b) return `a partir ${h1 === 1 ? 'da' : 'das'} ${a}`; const h2 = Number(String(ev.fim).slice(0, 2)); return `${h1 === 1 ? 'da' : 'das'} ${a} ${h2 === 1 ? 'à' : 'às'} ${b}${ev.fim <= ev.inicio ? ' do dia seguinte' : ''}`; };
  const mapa = ev => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([ev.local, ev.endereco, ev.bairro, ev.cidade].filter(Boolean).join(', '));
  function agenda(ev){
    const ini = ev.dia.replace(/-/g, '') + 'T' + String(ev.inicio || '00:00').replace(':', '').slice(0, 4) + '00';
    let fimD = ev.dia, fimH = ev.fim;
    if(fimH){ if(fimH <= ev.inicio) fimD = maisDias(ev.dia, 1); }
    else { const [h, m] = String(ev.inicio || '00:00').split(':').map(Number), t = (h + 2) * 60 + m; fimH = pad(Math.floor(t / 60) % 24) + ':' + pad(t % 60); if(t >= 1440) fimD = maisDias(ev.dia, 1); }
    const fim = fimD.replace(/-/g, '') + 'T' + String(fimH).replace(':', '').slice(0, 4) + '00';
    return 'https://calendar.google.com/calendar/render?' + new URLSearchParams({ action: 'TEMPLATE', text: ev.titulo, dates: ini + '/' + fim,
      details: [(ev.descricao || '').slice(0, 600), 'No Muralzim: ' + linkEvento(ev)].filter(Boolean).join('\n\n'), location: [ev.local, ev.endereco, ev.bairro, ev.cidade].filter(Boolean).join(', ') }).toString();
  }
  const linkEvento = ev => location.origin + location.pathname.replace(/[^/]*$/, '') + '#/muralzim/e/' + ev.id;
  const convite = ev => { const d = dataDe(ev.dia); return [ev.titulo, `${DOW_L[d.getUTCDay()]}, ${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}, ${faixaHora(ev)}`, [ev.local, ev.endereco, ev.bairro, ev.cidade].filter(Boolean).join(', '),
    `Entrada: ${precoCurto(ev)}${ev.preco_obs ? ' (' + ev.preco_obs + ')' : ''}`, `Classificação: ${ev.classif === 'L' ? 'livre' : ev.classif + ' anos'}`, linkEvento(ev)].join('\n'); };
  async function abreEvento(id){
    let ev = null;
    try{ ev = await C.api.rpc('corre_evento_ver', { p_id: id }); }catch(e){ toast(C.errMsg(e)); return; }
    /* a ficha fica por cima do muro; o endereço volta pro muro (o link do evento segue valendo pra mandar) */
    try{ if(/^#\/muralzim\/e\//.test(location.hash)) history.replaceState(null, '', '#/muralzim'); }catch(e){}
    if(!ev){ toast('Esse evento não tá mais no Muralzim.'); return; }
    Z.ev = ev;
    const eu = C.st.user && C.st.user.id, dono = C.ehDono && C.ehDono();
    const lotes = ev.lotes || [], passou = ev.dia < hoje();
    C.sheet(`<div class="mz-ficha">
      <div class="sheet-head"><span class="mz-ficha-k">${esc(CAT[ev.categoria] || '')}${ev.status === 'cancelado' ? ' · cancelado' : passou ? ' · já passou' : ''}</span><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <div class="mz-ficha-g"><div class="mz-ficha-p" aria-hidden="true">${posterHTML(ev, { link: false })}</div>
      <div><h2 class="mz-ficha-t">${esc(ev.titulo)}</h2>
        <dl class="mz-fatos">
          <div><dt>Quando</dt><dd>${esc(dataLonga(ev))}<br><span class="mz-mut">${esc(faixaHora(ev))}</span></dd></div>
          <div><dt>Onde</dt><dd><b>${esc(ev.local)}</b>${ev.endereco ? '<br>' + esc(ev.endereco) : ''}${[ev.bairro, ev.cidade].filter(Boolean).length ? '<br>' + esc([ev.bairro, ev.cidade].filter(Boolean).join(', ')) : ''}<br><a href="${esc(mapa(ev))}" target="_blank" rel="noopener">Ver no mapa ↗</a></dd></div>
          <div><dt>Entrada</dt><dd>${ev.entrada === 'corre' ? (lotes.length ? lotes.map(l => `${esc(l.nome)}: <b>${real(l.preco)}</b> <span class="mz-mut">+ ${realC(l.taxa)} de taxa${l.restam <= 0 ? ' · esgotado' : l.restam <= 10 ? ` · restam ${l.restam}` : ''}</span>`).join('<br>') : 'Ingresso em breve') : esc(precoCurto(ev))}${ev.preco_obs ? `<br><span class="mz-mut">${esc(ev.preco_obs)}</span>` : ''}</dd></div>
          <div><dt>Classificação</dt><dd class="mz-cl-l">${classHTML(ev.classif)}<span>${esc(CLASS[ev.classif] || CLASS.L)}</span></dd></div>
          <div><dt>Quem faz</dt><dd>${ev.organizador ? esc(ev.organizador) + '<br>' : ''}<a href="#/@${esc(ev.quem.handle)}">@${esc(ev.quem.handle)}</a></dd></div>
        </dl>
        ${ev.mudou_em ? '<p class="mz-aviso">O evento mudou de dia, hora ou lugar depois que os ingressos começaram a sair. Quem comprou antes pode desistir até a hora dele.</p>' : ''}
        ${ev.descricao ? `<p class="mz-desc">${esc(ev.descricao)}</p>` : ''}
        <div class="acts mz-ficha-a">
          ${ev.vende && !passou && !ev.esgotado ? `<button type="button" class="mz-btn pri" data-act="mz-comprar">${ico('ingresso')} Comprar ingresso</button>` : ''}
          ${ev.entrada === 'corre' && ev.esgotado ? '<span class="mz-selo">Esgotado</span>' : ''}
          ${ev.link ? `<a class="mz-btn${ev.vende ? '' : ' pri'}" href="${esc(ev.link)}" target="_blank" rel="noopener noreferrer">${ev.entrada === 'gratis' ? 'Inscrição' : 'Ingressos'} ↗</a>` : ''}
          ${!passou ? `<a class="mz-btn" href="${esc(agenda(ev))}" target="_blank" rel="noopener">Salvar na agenda ↗</a>` : ''}
          <button type="button" class="mz-btn" data-act="mz-convite">Copiar convite</button>
        </div>
        ${ev.meu ? `<div class="mz-dono-a"><a class="mz-btn sm" href="#/muralzim/editar/${esc(ev.id)}">${ico('edit')} Editar</a>${ev.entrada === 'corre' ? `<a class="mz-btn sm" href="#/muralzim/vendas/${esc(ev.id)}">${ico('grafico')} Vendas</a><a class="mz-btn sm" href="#/muralzim/portaria/${esc(ev.id)}">${ico('qr')} Portaria</a>` : ''}</div>` : ''}
        ${eu && !ev.meu ? `<button type="button" class="mz-den" data-act="mz-denuncia">${ico('bandeira')} Denunciar este evento</button>` : ''}
        ${dono ? `<button type="button" class="mz-den" data-act="mz-oculta" data-v="${ev.oculto ? '0' : '1'}">${ev.oculto ? 'Pôr de volta no ar' : 'Tirar do ar (dono do Corre)'}</button>` : ''}
      </div></div></div>`, 'mz-det');
  }

  /* ---------------- comprar ---------------- */
  function entrarSheet(volta, txt){
    try{ localStorage.setItem('corre-volta', volta); }catch(e){}
    C.sheet(`<div class="form"><div class="sheet-head"><h2>Entra no Corre</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p>${esc(txt)}</p><button type="button" class="btn-google" data-act="mz-entrar"><span>Entrar com Google</span></button></div>`);
  }
  function compraSheet(){
    const ev = Z.ev; if(!ev) return;
    if(!logado()){ entrarSheet('#/muralzim/e/' + ev.id, 'Pra comprar ingresso, entra no Corre. É de graça e leva um toque. Os teus ingressos ficam guardados aqui, com o QR.'); return; }
    const lotes = (ev.lotes || []).slice();
    Z.cp = { q: {} };
    const precisa = !(C.acesso && C.acesso.cliente);
    const meia = lotes.some(l => l.meia);
    C.sheet(`<form class="form mz-cp" id="mz-cp" novalidate>
      <div class="sheet-head"><h2>Ingresso</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p class="mz-cp-ev"><b>${esc(ev.titulo)}</b><span>${esc(dataLonga(ev))} · ${esc(hora(ev.inicio))} · ${esc(ev.local)}</span></p>
      <ul class="mz-lotes">${lotes.map(l => `<li class="${l.restam <= 0 ? 'esg' : ''}"><div class="mz-l-n"><b>${esc(l.nome)}${l.meia ? ' <span class="mz-meia">meia</span>' : ''}</b><small>${real(l.preco)} + ${realC(l.taxa)} de taxa${l.restam <= 0 ? ' · esgotado' : l.restam <= 10 ? ` · restam ${l.restam}` : ''}</small></div>
        <div class="mz-qtd"><button type="button" data-act="mz-q" data-l="${esc(l.id)}" data-d="-1" aria-label="Um ${esc(l.nome)} a menos"${l.restam <= 0 ? ' disabled' : ''}>−</button><output id="mz-q-${esc(l.id)}" aria-live="polite">0</output><button type="button" data-act="mz-q" data-l="${esc(l.id)}" data-d="1" aria-label="Um ${esc(l.nome)} a mais"${l.restam <= 0 ? ' disabled' : ''}>+</button></div></li>`).join('')}</ul>
      ${meia ? '<p class="hint">Meia-entrada: leva na entrada o documento que dá direito (a carteirinha de estudante, um documento com foto de quem tem 60 anos ou mais, ou de pessoa com deficiência).</p>' : ''}
      <label class="fld">Nome no ingresso<input id="mz-port" maxlength="80" autocomplete="name" value="${esc((C.st.me && C.st.me.nome) || '')}"></label>
      ${precisa ? `<fieldset class="fld mz-cli"><legend>Pro Asaas emitir a cobrança (só na primeira compra)</legend><label>Nome completo<input id="mz-nome" maxlength="100" autocomplete="name"></label><label>CPF ou CNPJ<input id="mz-doc" inputmode="numeric" maxlength="18" autocomplete="off"></label><small class="hint">O documento vai só pro Asaas; o Corre não guarda.</small></fieldset>` : ''}
      <div class="mz-total" id="mz-total" aria-live="polite">Escolhe quantos ingressos.</div>
      <label class="pl-aceite"><input type="checkbox" id="mz-aceite" required> Li e aceito os <a href="termos.html#ingressos" target="_blank" rel="noopener">Termos de uso</a> (a taxa, a desistência e o evento cancelado)</label>
      <p class="mz-erro" id="mz-cp-e" role="alert"></p>
      <div class="acts"><button type="button" class="btn pri" data-act="mz-pagar" data-f="pix">Pagar no Pix</button><button type="button" class="btn" data-act="mz-pagar" data-f="cartao">Pagar no cartão</button></div>
      <p class="fine">Pagamento único, pelo Asaas. O dinheiro do ingresso vai direto pra conta de quem organiza; a taxa de serviço fica com o Corre. Os lugares ficam guardados por 20 minutos enquanto você paga.</p>
    </form>`, 'mz-cp');
  }
  function contaCompra(){
    const ev = Z.ev, cp = Z.cp; if(!ev || !cp) return null;
    let n = 0, valor = 0, taxa = 0; const itens = [];
    (ev.lotes || []).forEach(l => { const q = cp.q[l.id] || 0; if(!q) return; n += q; valor += l.preco * q; taxa += (l.taxa != null ? Number(l.taxa) : taxaDe(l.preco)) * q; itens.push({ lote: l.id, qtd: q }); });
    return { n, valor, taxa, total: valor + taxa, itens };
  }
  function pintaTotal(){
    const t = contaCompra(), el = $('mz-total'); if(!t || !el) return;
    el.innerHTML = t.n ? `<b>Total ${realC(t.total)}</b><span>${plural(t.n, 'ingresso', 'ingressos')}: ${realC(t.valor)} + ${realC(t.taxa)} de taxa de serviço</span>` : 'Escolhe quantos ingressos.';
  }
  const ERRO_MZ = { esgotou: 'Esse tipo de ingresso acabou agora há pouco.', org: 'A conta de recebimento de quem organiza ainda não tá pronta. Tenta mais tarde.',
    evento: 'Esse evento não tá mais vendendo ingresso.', passou: 'O evento já começou: a venda fechou.', itens: 'Escolhe pelo menos um ingresso.', qtd: 'No máximo 10 ingressos por compra.',
    nome: 'Escreve o teu nome completo (pro Asaas).', doc: 'Confere o CPF ou o CNPJ.', termos: 'Marca o "Li e aceito" pra seguir.', forma: 'Escolhe Pix ou cartão.',
    config: 'A venda de ingresso ainda não tá ligada.', nofn: 'A venda de ingresso ainda tá chegando.', rede: 'Não deu pra falar com o pagamento. Tenta de novo.' };
  const erroMz = e => (e && e.code === 'asaas' && e.detalhe) ? 'O Asaas recusou: ' + e.detalhe : (e && ERRO_MZ[e.code]) || C.errMsg(e, 'Não deu pra falar com o pagamento agora.');
  async function pagar(el){
    const ev = Z.ev, t = contaCompra(), f = el.dataset.f, msg = $('mz-cp-e');
    const fala = s => { if(msg) msg.textContent = s; };
    if(!t || !t.n) return fala(ERRO_MZ.itens);
    if(t.n > 10) return fala(ERRO_MZ.qtd);
    if(!$('mz-aceite').checked) return fala(ERRO_MZ.termos);
    /* o nome e o CPF só a primeira compra pede (o Asaas guarda o cliente): em branco, o servidor diz se faltam */
    const nome = $('mz-nome') ? $('mz-nome').value.trim() : '', doc = $('mz-doc') ? $('mz-doc').value : '';
    if(nome && nome.length < 3) return fala(ERRO_MZ.nome);
    if(doc && !C.docOk(doc)) return fala(ERRO_MZ.doc);
    fala('');
    const w = f === 'cartao' ? abaNova() : null;
    document.querySelectorAll('[data-act="mz-pagar"]').forEach(b => { b.disabled = true; });
    try{
      const r = await C.api.fn('pagamento', { acao: 'ingresso-comprar', evento: ev.id, itens: t.itens, forma: f, termos: C.TERMOS_V, portador: ($('mz-port') || {}).value || '', nome, doc }) || {};
      Z.pagando = { pedido: r.pedido, ev, total: r.total, forma: f, link: r.link || '', pix: r.pix || null, ate: Date.now() + 20 * 60e3 };
      /* o cliente no Asaas já existe: a próxima compra não pede o nome e o CPF de novo */
      if(C.acesso) C.acesso.cliente = true;
      if(f === 'cartao' && !leva(w, r.link)){ if(w) try{ w.close(); }catch(e){} }
      esperaSheet();
    }catch(e){
      if(w) try{ w.close(); }catch(x){}
      fala(erroMz(e));
      /* faltou o nome ou o CPF (a primeira compra): o campo aparece e ganha o foco */
      if(e && (e.code === 'nome' || e.code === 'doc')){ const c = $(e.code === 'nome' ? 'mz-nome' : 'mz-doc'); if(c) c.focus(); }
      document.querySelectorAll('[data-act="mz-pagar"]').forEach(b => { b.disabled = false; });
      if(e && e.code === 'esgotou') Z.lista = null;
    }
  }
  /* esperando o pagamento: o QR do Pix (paga sem sair do Corre) ou o link da fatura do cartão. Confere sozinho */
  function esperaSheet(){
    const P = Z.pagando; if(!P) return;
    const demo = C.DEMO;
    C.sheet(`<div class="form mz-paga"><div class="sheet-head"><h2>${P.forma === 'pix' ? 'Paga no Pix' : 'Paga no cartão'}</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p class="mz-cp-ev"><b>${esc(P.ev.titulo)}</b><span>Total ${realC(P.total)}</span></p>
      ${P.forma === 'pix' ? (P.pix && P.pix.img ? `<img class="mz-pix-qr" src="data:image/png;base64,${esc(P.pix.img)}" alt="QR do Pix de ${esc(realC(P.total))}" width="220" height="220">` : '') +
        (P.pix && P.pix.copia ? `<button type="button" class="btn pri" data-act="mz-pix-copia">${ico('copy')} Copiar o Pix copia e cola</button>` : '<p>O QR não veio. Toca em "Conferir" daqui a pouco.</p>')
        : `<p>A fatura abriu numa aba nova: paga lá com o cartão e volta aqui.</p>${P.link ? `<a class="btn pri" href="${esc(P.link)}" target="_blank" rel="noopener">Abrir a fatura de novo ↗</a>` : ''}`}
      <p class="mz-espera" id="mz-espera" aria-live="polite">Esperando o pagamento… teus lugares ficam guardados até ${new Date(P.ate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.</p>
      <div class="acts"><button type="button" class="btn" data-act="mz-confere">Já paguei</button><a class="btn" href="#/muralzim/ingressos">Meus ingressos</a></div>
      ${demo ? '<p class="fine">Na demonstração, "Já paguei" confirma o pagamento de mentira.</p>' : ''}
    </div>`, 'mz-pg');
    vigia();
  }
  let vig = 0;
  function vigia(){
    clearTimeout(vig);
    const P = Z.pagando; if(!P || C.DEMO) return;
    vig = setTimeout(async () => {
      if(!Z.pagando || !$('mz-espera')) return;
      if(Date.now() > Z.pagando.ate + 10 * 60e3){ const el = $('mz-espera'); if(el) el.textContent = 'A reserva venceu. Se você pagou, toca em "Já paguei": se ainda tiver lugar, o ingresso vale; senão, o dinheiro volta.'; return; }
      await confere(true); vigia();
    }, document.hidden ? 15000 : 7000);
  }
  async function confere(quieto){
    let r = null;
    try{ r = await C.api.fn('pagamento', { acao: 'ingresso-confere' }); }catch(e){ if(!quieto) toast(erroMz(e)); return; }
    const P = Z.pagando;
    if(P && r && (r.pagos || []).includes(P.pedido)){ Z.pagando = null; Z.lista = null; pronto(P); return true; }
    if(P && r && (r.devolvidos || []).includes(P.pedido)){ Z.pagando = null; C.closeSheet(); toast('Os ingressos acabaram antes do teu pagamento chegar: o dinheiro já voltou.', 6000); return true; }
    if(!quieto) toast('Ainda não chegou. O Pix leva uns segundos; o cartão, o tempo de aprovar.');
    return false;
  }
  function pronto(P){
    C.sheet(`<div class="form mz-pronto"><div class="sheet-head"><h2>É teu!</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p class="mz-pronto-t">${ico('ingresso')} Os ingressos de <b>${esc(P.ev.titulo)}</b> chegaram. Na entrada, mostra o QR (no celular mesmo).</p>
      <div class="acts"><a class="btn pri" href="#/muralzim/ingressos">Ver meus ingressos</a><a class="btn" href="${esc(agenda(P.ev))}" target="_blank" rel="noopener">Salvar na agenda ↗</a></div></div>`, 'mz-ok');
  }

  /* ---------------- os meus ingressos ---------------- */
  async function viewIngressos(app){
    document.title = 'Meus ingressos · Muralzim';
    if(!logado()){ app.innerHTML = C.header('muralzim') + '<main class="wrap mz-w"><div class="mz"><p class="mz-carrega">Entra no Corre pra ver os teus ingressos.</p></div></main>'; entrarSheet('#/muralzim/ingressos', 'Os teus ingressos ficam guardados na tua conta.'); return; }
    app.innerHTML = C.header('muralzim') + '<main class="wrap mz-w"><div class="mz mz-pg-w" id="mz"><p class="mz-carrega">Abrindo os teus ingressos…</p></div></main>';
    /* o que espera pagamento: confere antes (se o aviso do Asaas não chegou, o ingresso chega assim) */
    try{ await C.api.fn('pagamento', { acao: 'ingresso-confere' }); }catch(e){}
    let L = [];
    try{ L = await C.api.rpc('corre_ingressos_meus', {}) || []; }catch(e){ const el = $('mz'); if(el) el.innerHTML = `<p class="mz-carrega">${esc(semFn(e) ? 'Os ingressos tão chegando: falta atualizar o banco.' : C.errMsg(e))}</p>`; return; }
    const el = $('mz'); if(!el) return;
    const hj = hoje(), vem = L.filter(p => p.evento.dia >= hj), foi = L.filter(p => p.evento.dia < hj);
    el.innerHTML = `<header class="mz-pg-h"><h1>${ico('ingresso')} Meus ingressos</h1><a class="mz-btn" href="#/muralzim">Ver o Muralzim</a></header>
      ${!L.length ? '<div class="mz-vazio"><p class="mz-vazio-t">Nenhum ingresso ainda</p><p>Os que você comprar no Muralzim aparecem aqui, com o QR pra mostrar na entrada.</p><a class="mz-btn pri" href="#/muralzim">Ver o que tem pra fazer</a></div>' : ''}
      ${vem.map(pedidoHTML).join('')}
      ${foi.length ? `<h2 class="mz-pg-sub">Os que já passaram</h2>${foi.map(pedidoHTML).join('')}` : ''}`;
    qrs();
  }
  const ST_ING = { valido: 'Vale', usado: 'Entrou', estornado: 'Devolvido', cancelado: 'Cancelado', pendente: 'Esperando o pagamento' };
  function pedidoHTML(p){
    const ev = p.evento, hj = hoje();
    const pend = p.status === 'pendente', volta = p.status === 'estornado';
    return `<section class="mz-ped${volta ? ' volta' : ''}" data-id="${esc(p.id)}">
      <div class="mz-ped-h"><div><b>${esc(ev.titulo)}</b><span>${esc(dataLonga(ev))} · ${esc(hora(ev.inicio))} · ${esc(ev.local)}</span>${ev.status === 'cancelado' ? '<span class="mz-selo mz-s-x">Cancelado</span>' : ''}</div><a class="mz-btn sm" href="#/muralzim/e/${esc(ev.id)}">Ver o evento</a></div>
      ${pend ? `<p class="mz-aviso">Esperando o pagamento de ${realC(p.total)}. <button type="button" class="mz-btn sm" data-act="mz-repaga" data-id="${esc(p.id)}" data-f="${esc(p.forma)}" data-l="${esc(p.link || '')}">${p.forma === 'pix' ? 'Ver o Pix' : 'Pagar a fatura'}</button></p>` : ''}
      ${volta ? `<p class="mz-mut">O dinheiro voltou (${realC(p.total)}).</p>` : ''}
      <div class="mz-ings">${(p.ingressos || []).map(i => `<article class="mz-ing ${esc(i.status)}">
        <div class="mz-ing-qr" data-qr="${esc(i.codigo)}" aria-hidden="true"></div>
        <div class="mz-ing-i"><span class="mz-ing-st">${esc(ST_ING[i.status] || i.status)}${i.usado_em ? ' às ' + new Date(i.usado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
          <b>${esc(i.lote)}${i.meia ? ' <span class="mz-meia">meia</span>' : ''}</b><span>${esc(i.portador || '')}</span>
          <a class="mz-ing-cod" href="#/muralzim/i/${esc(i.codigo)}">${esc(codFmt(i.codigo))}</a></div></article>`).join('')}</div>
      ${p.status === 'pago' && ev.dia >= hj ? `<button type="button" class="mz-den" data-act="mz-desiste" data-id="${esc(p.id)}">Desistir e receber de volta</button>` : ''}
    </section>`;
  }
  /* o QR de cada ingresso (o desenho do QR mora no Studio Houzi: desce na hora) */
  async function qrs(){
    const els = [...document.querySelectorAll('[data-qr]')]; if(!els.length) return;
    try{ await C.houziCarrega(); }catch(e){ return; }
    if(!C.labMotor || !C.labMotor.qrSvg) return;
    els.forEach(el => { if(!el.isConnected || el.dataset.ok) return; try{ el.innerHTML = C.labMotor.qrSvg(urlIngresso(el.dataset.qr), { titulo: 'Ingresso ' + codFmt(el.dataset.qr) }); el.dataset.ok = '1'; }catch(e){} });
  }

  /* ---------------- um ingresso (o QR leva pra cá) ---------------- */
  async function viewIngresso(app, cod){
    document.title = 'Ingresso · Muralzim';
    app.innerHTML = C.header('muralzim') + '<main class="wrap mz-w"><div class="mz mz-pg-w" id="mz"><p class="mz-carrega">Abrindo o ingresso…</p></div></main>';
    let i = null;
    try{ i = await C.api.rpc('corre_ingresso_ver', { p_codigo: cod }); }catch(e){ const el = $('mz'); if(el) el.innerHTML = `<p class="mz-carrega">${esc(C.errMsg(e))}</p>`; return; }
    const el = $('mz'); if(!el) return;
    if(!i || i.erro){ el.innerHTML = `<div class="mz-vazio"><p class="mz-vazio-t">${i && i.erro === 'devagar' ? 'Calma aí' : 'Ingresso não achado'}</p><p>${i && i.erro === 'devagar' ? 'Muitos ingressos abertos daqui em pouco tempo. Espera um pouco.' : 'Confere o código. Se veio de um QR, pede pra pessoa abrir o ingresso no Corre dela.'}</p><a class="mz-btn" href="#/muralzim">Ver o Muralzim</a></div>`; return; }
    const ev = i.evento;
    el.innerHTML = `<div class="mz-um ${esc(i.status)}"><span class="mz-ing-st">${esc(ST_ING[i.status] || i.status)}${i.usado_em ? ' às ' + new Date(i.usado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
      <h1>${esc(ev.titulo)}</h1><p>${esc(dataLonga(ev))} · ${esc(hora(ev.inicio))}<br>${esc(ev.local)}${ev.cidade ? ', ' + esc(ev.cidade) : ''}</p>
      <div class="mz-um-qr" data-qr="${esc(i.codigo)}" aria-hidden="true"></div>
      <p class="mz-um-cod">${esc(codFmt(i.codigo))}</p>
      <p><b>${esc(i.lote)}</b>${i.meia ? ' · meia-entrada (leva o documento)' : ''}<br>${esc(i.portador)}</p>
      ${i.organizador ? `<div class="acts">${i.status === 'valido' ? `<button type="button" class="btn pri mz-entra" data-act="mz-valida-um" data-c="${esc(i.codigo)}">${ico('check')} Validar a entrada</button>` : ''}<a class="btn" href="#/muralzim/portaria/${esc(ev.id)}">Abrir a portaria</a></div>` : ''}
      ${i.meu ? '<p class="mz-mut">Na entrada, mostra este QR. Cada ingresso entra uma vez.</p>' : ''}</div>`;
    qrs();
  }

  /* ---------------- divulgar ---------------- */
  const RASC = 'corre-mz-rascunho';
  async function viewDivulgar(app, id){
    document.title = (id ? 'Editar evento' : 'Divulgar evento') + ' · Muralzim';
    if(!logado()){ app.innerHTML = C.header('muralzim') + '<main class="wrap mz-w"><div class="mz"><p class="mz-carrega">Entra no Corre pra divulgar teu evento.</p></div></main>'; entrarSheet('#/muralzim/divulgar', 'Divulgar no Muralzim é de graça. Entra no Corre pra pôr teu cartaz no muro.'); return; }
    app.innerHTML = C.header('muralzim') + '<main class="wrap mz-w"><div class="mz mz-pg-w" id="mz"><p class="mz-carrega">Abrindo…</p></div></main>';
    let ev = null;
    if(id){ try{ ev = await C.api.rpc('corre_evento_ver', { p_id: id }); }catch(e){} if(!ev || !ev.meu){ const el = $('mz'); if(el) el.innerHTML = '<p class="mz-carrega">Esse evento não é teu (ou não existe mais).</p>'; return; } }
    const org = await orgMeu();
    const r = store.get(RASC, null), d = r && (r.id || '') === (id || '') ? r : (ev || { categoria: 'musica', classif: 'L', cidade: 'Londrina', entrada: 'gratis', lotes: [] });
    if(r && d === r) store.tira(RASC);
    Z.form = { id: id || '', lotes: (d.lotes || []).map(l => ({ id: l.id || '', nome: l.nome, preco: l.preco, qtd: l.qtd || l.restam || 50, meia: !!l.meia })) };
    const el = $('mz'); if(!el) return;
    const sel = (k, v) => k === v ? ' selected' : '';
    el.innerHTML = `<header class="mz-pg-h"><h1>${id ? 'Editar evento' : 'Divulgar evento'}</h1></header>
      <form class="form mz-form" id="mz-f" novalidate><div class="mz-form-g"><div class="mz-campos">
        <label class="fld">Nome do evento<input id="mz-f-titulo" maxlength="80" required value="${esc(d.titulo || '')}" autocomplete="off"></label>
        <div class="mz-2"><label class="fld">Categoria<select id="mz-f-categoria">${CATS.map(([k, n]) => `<option value="${k}"${sel(k, d.categoria)}>${esc(n)}</option>`).join('')}</select></label>
          <label class="fld">Classificação indicativa<select id="mz-f-classif">${Object.keys(CLASS).sort((a, b) => (a === 'L' ? -1 : b === 'L' ? 1 : a - b)).map(k => `<option value="${k}"${sel(k, String(d.classif))}>${k === 'L' ? 'Livre' : k + ' anos'}</option>`).join('')}</select></label></div>
        <div class="mz-3"><label class="fld">Data<input id="mz-f-dia" type="date" min="${hoje()}" value="${esc(d.dia || '')}" required></label>
          <label class="fld">Início<input id="mz-f-inicio" type="time" value="${esc(d.inicio || '')}" required></label>
          <label class="fld">Término <small>(se tiver)</small><input id="mz-f-fim" type="time" value="${esc(d.fim || '')}"></label></div>
        <label class="fld">Local<input id="mz-f-local" maxlength="80" placeholder="Nome do espaço" value="${esc(d.local || '')}" required autocomplete="off"></label>
        <label class="fld">Endereço <small>(se tiver)</small><input id="mz-f-endereco" maxlength="120" placeholder="Rua e número" value="${esc(d.endereco || '')}" autocomplete="off"></label>
        <div class="mz-2"><label class="fld">Bairro <small>(se tiver)</small><input id="mz-f-bairro" maxlength="60" value="${esc(d.bairro || '')}" autocomplete="off"></label>
          <label class="fld">Cidade<input id="mz-f-cidade" maxlength="60" value="${esc(d.cidade || 'Londrina')}" autocomplete="off"></label></div>
        <fieldset class="fld mz-ent"><legend>Entrada</legend>
          <div class="mz-seg" role="radiogroup" aria-label="Tipo de entrada">${[['gratis', 'Grátis'], ['porta', 'Paga na porta ou fora'], ['corre', 'Ingresso aqui']].map(([k, n]) => `<label><input type="radio" name="mz-ent" value="${k}"${(d.entrada || 'gratis') === k ? ' checked' : ''}>${n}</label>`).join('')}</div>
          <div id="mz-ent-porta" class="mz-2"><label class="fld">Valor (R$)<input id="mz-f-preco" type="number" min="0" step="0.01" inputmode="decimal" placeholder="30" value="${d.entrada === 'porta' && d.preco ? esc(d.preco) : ''}"></label>
            <label class="fld">Observação <small>(se tiver)</small><input id="mz-f-preco_obs" maxlength="80" placeholder="Meia R$ 15, lista até 23h" value="${esc(d.preco_obs || '')}"></label></div>
          <div id="mz-ent-corre">${org && org.pode ? '' : orgFaltaHTML(org)}<div id="mz-lotes-ed"></div>
            <button type="button" class="mz-btn sm" data-act="mz-lote-mais">${ico('plus')} Tipo de ingresso</button>
            <p class="hint">Quem compra paga o ingresso + 10% de taxa de serviço (no mínimo R$ 2 por ingresso). O valor do ingresso inteiro cai na tua conta Asaas na hora; a taxa fica com o Corre.</p></div>
        </fieldset>
        <label class="fld">Link de ingresso ou inscrição de fora <small>(se tiver)</small><input id="mz-f-link" type="url" placeholder="https://" value="${esc(d.link || '')}" autocomplete="off"></label>
        <label class="fld">Descrição<textarea id="mz-f-descricao" rows="5" maxlength="1200" placeholder="O que vai rolar, quem se apresenta, o que levar">${esc(d.descricao || '')}</textarea></label>
        <label class="fld">Quem organiza <small>(se não é você)</small><input id="mz-f-organizador" maxlength="80" value="${esc(d.organizador || '')}" autocomplete="off"></label>
      </div><aside class="mz-prev" aria-label="Prévia do cartaz"><p class="mz-ficha-k">Prévia do cartaz</p><div id="mz-prev"></div><p class="hint">A cor do cartaz vem da categoria.</p></aside></div>
      <p class="mz-erro" id="mz-f-e" role="alert"></p>
      <div class="acts"><button type="submit" class="btn pri" id="mz-f-ok">${id ? 'Salvar' : 'Publicar no muro'}</button><a class="btn" href="${id ? '#/muralzim/meus' : '#/muralzim'}">Cancelar</a></div>
      ${id && ev.status === 'ativo' ? `<div class="mz-perigo"><button type="button" class="mz-den" data-act="mz-ev-cancela" data-id="${esc(id)}">${ev.entrada === 'corre' ? 'Cancelar o evento (o dinheiro volta pra quem comprou)' : 'Cancelar o evento'}</button>${ev.entrada !== 'corre' ? `<button type="button" class="mz-den" data-act="mz-ev-apaga" data-id="${esc(id)}">Tirar do muro</button>` : ''}</div>` : ''}
    </form>`;
    pintaLotes(); pintaEntrada(); prevForm();
  }
  function orgFaltaHTML(org){
    const st = org && org.status;
    return `<div class="mz-org-falta">${st === 'pendente' || st === 'analise' ? `<p><b>Tua conta de recebimento tá ${st === 'analise' ? 'em análise no Asaas' : 'esperando os documentos'}.</b> Assim que o Asaas aprovar, o evento já pode vender. Dá pra divulgar agora e ligar a venda depois.</p><a class="mz-btn sm" href="#/muralzim/conta" data-act="mz-rasc">Ver a conta</a>`
      : st === 'recusada' ? '<p><b>O Asaas recusou a conta de recebimento.</b> Fala com o suporte do Asaas, ou liga uma conta que você já tem.</p><a class="mz-btn sm" href="#/muralzim/conta" data-act="mz-rasc">Ver a conta</a>'
      : '<p><b>Pra vender ingresso aqui, liga tua conta de recebimento.</b> O dinheiro do ingresso cai direto nela, na hora. É de graça: o Corre abre ela pra você no Asaas, ou você usa uma que já tem.</p><a class="mz-btn sm pri" href="#/muralzim/conta" data-act="mz-rasc">Ligar a conta de recebimento</a>'}</div>`;
  }
  function pintaLotes(){
    const box = $('mz-lotes-ed'); if(!box) return;
    const L = Z.form.lotes;
    if(!L.length) L.push({ id: '', nome: 'Inteira', preco: '', qtd: 100, meia: false });
    box.innerHTML = L.map((l, i) => `<div class="mz-lote-ed" data-i="${i}">
      <label class="fld">Tipo<input data-lf="nome" maxlength="40" value="${esc(l.nome)}" placeholder="Inteira, Meia, 1º lote"></label>
      <label class="fld">Preço (R$)<input data-lf="preco" type="number" min="5" max="2000" step="0.01" inputmode="decimal" value="${esc(l.preco)}" placeholder="50"></label>
      <label class="fld">Quantos<input data-lf="qtd" type="number" min="1" max="5000" step="1" inputmode="numeric" value="${esc(l.qtd)}"></label>
      <label class="mz-lote-meia"><input type="checkbox" data-lf="meia"${l.meia ? ' checked' : ''}> meia-entrada</label>
      <p class="mz-lote-q">${Number(l.preco) >= 5 ? `Quem compra paga ${realC(Number(l.preco) + taxaDe(l.preco))}; você recebe ${realC(l.preco)}.` : 'De R$ 5 a R$ 2.000.'}</p>
      ${L.length > 1 ? `<button type="button" class="cbtn plain mz-lote-x" data-act="mz-lote-tira" data-i="${i}" aria-label="Tirar ${esc(l.nome || 'este tipo')}">${ico('x')}</button>` : ''}</div>`).join('');
  }
  function pintaEntrada(){
    const v = (document.querySelector('input[name="mz-ent"]:checked') || {}).value || 'gratis';
    const p = $('mz-ent-porta'), c = $('mz-ent-corre'); if(p) p.hidden = v !== 'porta'; if(c) c.hidden = v !== 'corre';
  }
  function lerForm(){
    const g = k => (($('mz-f-' + k) || {}).value || '').trim();
    const entrada = (document.querySelector('input[name="mz-ent"]:checked') || {}).value || 'gratis';
    return { id: Z.form.id || undefined, titulo: g('titulo'), categoria: g('categoria'), classif: g('classif'), dia: g('dia'), inicio: g('inicio'), fim: g('fim'), local: g('local'),
      endereco: g('endereco'), bairro: g('bairro'), cidade: g('cidade') || 'Londrina', entrada, preco: entrada === 'porta' ? Number(g('preco').replace(',', '.')) || 0 : 0,
      preco_obs: g('preco_obs'), link: g('link'), descricao: g('descricao'), organizador: g('organizador'),
      lotes: entrada === 'corre' ? Z.form.lotes.map(l => ({ id: l.id || undefined, nome: String(l.nome || '').trim(), preco: Number(String(l.preco).replace(',', '.')), qtd: Math.round(Number(l.qtd)), meia: !!l.meia })) : [] };
  }
  function prevForm(){
    const d = lerForm(), box = $('mz-prev'); if(!box) return;
    const lp = d.lotes.filter(l => l.preco >= 5).map(l => l.preco);
    box.innerHTML = posterHTML(Object.assign({}, d, { id: 'previa', desde: lp.length ? Math.min(...lp) : null, varios: lp.length > 1, vende: d.entrada === 'corre' }), { link: false });
  }
  const ERRO_F = { titulo: ['titulo', 'Dá um nome pro evento.'], dia: ['dia', 'Escolhe o dia do evento.'], dia_passou: ['dia', 'Essa data já passou.'], inicio: ['inicio', 'Põe a hora que começa.'],
    local: ['local', 'Diz o nome do lugar.'], preco: ['preco', 'Põe o valor da entrada (ou escolhe Grátis).'], link: ['link', 'O link precisa começar com https://'],
    lotes: ['', 'Põe pelo menos um tipo de ingresso (até 8).'], lote_nome: ['', 'Cada tipo de ingresso precisa de um nome.'], lote_preco: ['', 'O ingresso vai de R$ 5 a R$ 2.000.'],
    lote_qtd: ['', 'A quantidade vai de 1 a 5.000.'], lote_vendido: ['', 'Não dá pra pôr menos do que já vendeu.'], org: ['', 'Pra vender ingresso aqui, liga tua conta de recebimento antes.'],
    tem_vendidos: ['', 'Já tem ingresso vendido: o evento segue com ingresso aqui. Pra parar, cancela o evento (o dinheiro volta pra quem comprou).'],
    limite: ['', 'Você tem 30 eventos pela frente: é o máximo por pessoa.'], limite_dia: ['', 'Você divulgou muitos eventos hoje. Tenta amanhã.'] };
  async function salvaForm(e){
    e.preventDefault();
    const d = lerForm(), msg = $('mz-f-e'), bt = $('mz-f-ok');
    const fala = (s, k) => { if(msg) msg.textContent = s || ''; document.querySelectorAll('#mz-f [aria-invalid]').forEach(x => x.removeAttribute('aria-invalid')); if(k && $('mz-f-' + k)){ $('mz-f-' + k).setAttribute('aria-invalid', 'true'); $('mz-f-' + k).focus(); } };
    if(d.titulo.length < 3) return fala(ERRO_F.titulo[1], 'titulo');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(d.dia)) return fala(ERRO_F.dia[1], 'dia');
    if(!Z.form.id && d.dia < hoje()) return fala(ERRO_F.dia_passou[1], 'dia');
    if(!/^\d{2}:\d{2}/.test(d.inicio)) return fala(ERRO_F.inicio[1], 'inicio');
    if(d.local.length < 2) return fala(ERRO_F.local[1], 'local');
    if(d.entrada === 'porta' && !(d.preco > 0)) return fala(ERRO_F.preco[1], 'preco');
    if(d.link && !/^https:\/\/\S{4,}$/i.test(d.link)) return fala(ERRO_F.link[1], 'link');
    if(d.entrada === 'corre'){
      if(!d.lotes.length) return fala(ERRO_F.lotes[1]);
      if(d.lotes.some(l => l.nome.length < 2)) return fala(ERRO_F.lote_nome[1]);
      if(d.lotes.some(l => !(l.preco >= 5 && l.preco <= 2000))) return fala(ERRO_F.lote_preco[1]);
      if(d.lotes.some(l => !(l.qtd >= 1 && l.qtd <= 5000))) return fala(ERRO_F.lote_qtd[1]);
      const org = await orgMeu(); if(!(org && org.pode)) return fala(ERRO_F.org[1]);
    }
    fala('');
    if(bt) bt.disabled = true;
    try{
      const r = await C.api.rpc('corre_evento_salva', { p: d });
      Z.lista = null; store.tira(RASC);
      toast(Z.form.id ? (r && r.mudou ? 'Salvo. Quem já comprou vai poder desistir até a hora do evento.' : 'Salvo.') : 'Teu cartaz tá no muro.', 4200);
      C.go('#/muralzim/e/' + (r && r.id || Z.form.id));
    }catch(err){
      if(bt) bt.disabled = false;
      const h = String((err && (err.hint || err.message)) || ''), m = ERRO_F[h] || ERRO_F[Object.keys(ERRO_F).find(k => h === k || new RegExp('\\b' + k + '\\b').test(h)) || ''];
      fala(m ? m[1] : semFn(err) ? 'O Muralzim tá chegando: falta atualizar o banco.' : C.errMsg(err), m && m[0]);
    }
  }

  /* ---------------- a conta de recebimento ---------------- */
  async function viewConta(app){
    document.title = 'Conta de recebimento · Muralzim';
    if(!logado()){ app.innerHTML = C.header('muralzim') + '<main class="wrap mz-w"><div class="mz"><p class="mz-carrega">Entra no Corre pra ligar tua conta de recebimento.</p></div></main>'; entrarSheet('#/muralzim/conta', 'Entra no Corre pra vender ingresso.'); return; }
    app.innerHTML = C.header('muralzim') + '<main class="wrap mz-w"><div class="mz mz-pg-w" id="mz"><p class="mz-carrega">Abrindo…</p></div></main>';
    let o = await orgMeu(true);
    if(o && !o.houzi && o.tipo === 'sub' && o.status !== 'aprovada'){ try{ const r = await C.api.fn('pagamento', { acao: 'org-ver' }); if(r && r.conta) o = Z.org = Object.assign({}, o, r.conta); }catch(e){} }
    const el = $('mz'); if(!el) return;
    el.innerHTML = `<header class="mz-pg-h"><h1>${ico('cartao')} Conta de recebimento</h1><a class="mz-btn" href="#/muralzim/meus">Meus eventos</a></header>
      <p class="mz-lede">Quando você vende ingresso no Muralzim, o Asaas divide o pagamento na hora: o valor do ingresso cai inteiro na tua conta e a taxa de serviço (10%, paga por quem compra) fica com o Corre. Sem mensalidade.</p>
      ${o && o.houzi ? '<div class="mz-conta ok"><b>A conta da Houzi.</b><p>Teus eventos vendem direto na conta da Houzi, sem divisão.</p></div>'
        : o && o.status ? contaHTML(o) : contaNovaHTML()}`;
  }
  const SIT = { aprovada: ['Aprovada: teus eventos vendem', 'ok'], analise: ['Em análise no Asaas', 'esp'], pendente: ['Falta mandar os documentos pro Asaas', 'esp'], recusada: ['O Asaas recusou', 'x'] };
  function contaHTML(o){
    const s = SIT[o.status] || SIT.pendente;
    return `<div class="mz-conta ${s[1]}"><span class="mz-ing-st">${esc(s[0])}</span>
      <p>${o.tipo === 'propria' ? `A carteira do Asaas que termina em <b>${esc(o.wallet_fim || '')}</b>.` : `A conta no Asaas do e-mail <b>${esc(o.email || '')}</b>.`}</p>
      ${o.status === 'pendente' ? `<p>O Asaas mandou um e-mail pra ${esc(o.email || 'você')} pra criar a senha. Depois, ele pede uma foto do documento e uma selfie. Aprovou, teu evento já vende.</p>${o.docs ? `<a class="btn pri" href="${esc(o.docs)}" target="_blank" rel="noopener">Mandar os documentos ↗</a>` : ''}` : ''}
      ${o.status === 'analise' ? '<p>Os documentos chegaram. O Asaas costuma aprovar em até 2 dias úteis.</p>' : ''}
      ${o.status === 'recusada' ? '<p>Fala com o suporte do Asaas pelo app dele, ou liga uma conta do Asaas que você já tem.</p>' : ''}
      ${o.status !== 'aprovada' ? '<div class="acts"><button type="button" class="btn" data-act="mz-org-confere">Conferir agora</button></div>' : `<div class="acts"><a class="btn pri" href="#/muralzim/divulgar">${ico('plus')} Divulgar com ingresso</a><a class="btn" href="https://www.asaas.com/login" target="_blank" rel="noopener">Entrar no Asaas ↗</a></div>`}
    </div>${o.status === 'recusada' ? contaNovaHTML(true) : ''}`;
  }
  function contaNovaHTML(soCarteira){
    const me = C.st.me || {};
    return `<div class="mz-tabs" role="tablist" aria-label="Como ligar">${soCarteira ? '' : '<button type="button" role="tab" data-act="mz-conta-tab" data-k="nova" aria-selected="true">Abrir minha conta (grátis)</button>'}<button type="button" role="tab" data-act="mz-conta-tab" data-k="tenho" aria-selected="${!!soCarteira}">Já tenho conta no Asaas</button></div>
      ${soCarteira ? '' : `<form class="form mz-conta-f" id="mz-cf" novalidate>
        <p class="hint">Esses dados vão pro Asaas abrir tua conta (é ele que guarda e confere). O Corre fica só com o e-mail, o nome e a situação da conta.</p>
        <div class="mz-seg" role="radiogroup" aria-label="Pessoa"><label><input type="radio" name="mz-cf-tipo" value="pf" checked>Pessoa física (CPF)</label><label><input type="radio" name="mz-cf-tipo" value="pj">Empresa (CNPJ)</label></div>
        <label class="fld">Nome completo (ou razão social)<input id="mz-cf-nome" maxlength="100" value="${esc(me.nome || '')}" autocomplete="name"></label>
        <div class="mz-2"><label class="fld">E-mail (vira o login do Asaas)<input id="mz-cf-email" type="email" maxlength="120" value="${esc((C.st.user && C.st.user.email) || '')}" autocomplete="email"></label>
          <label class="fld"><span id="mz-cf-doc-l">CPF</span><input id="mz-cf-doc" inputmode="numeric" maxlength="18" autocomplete="off"></label></div>
        <div class="mz-2"><label class="fld" id="mz-cf-nasc-w">Data de nascimento<input id="mz-cf-nasc" type="date" max="${maisDias(hoje(), -6570)}"></label>
          <label class="fld" id="mz-cf-emp-w" hidden>Tipo de empresa<select id="mz-cf-emp"><option value="MEI">MEI</option><option value="LIMITED">Limitada (LTDA)</option><option value="INDIVIDUAL">Individual</option><option value="ASSOCIATION">Associação</option></select></label>
          <label class="fld">Celular com DDD<input id="mz-cf-cel" inputmode="tel" maxlength="16" value="${esc(String(me.whats || me.whatsapp || '').replace(/\D/g, '').replace(/^55/, ''))}" autocomplete="tel"></label></div>
        <div class="mz-3"><label class="fld">CEP<input id="mz-cf-cep" inputmode="numeric" maxlength="9" autocomplete="postal-code"></label>
          <label class="fld">Número<input id="mz-cf-num" maxlength="12"></label>
          <label class="fld">Complemento<input id="mz-cf-comp" maxlength="60"></label></div>
        <div class="mz-2"><label class="fld">Rua<input id="mz-cf-end" maxlength="120" autocomplete="address-line1"></label>
          <label class="fld">Bairro<input id="mz-cf-bai" maxlength="60"></label></div>
        <label class="fld">Renda (ou faturamento) por mês, em R$<input id="mz-cf-renda" inputmode="numeric" maxlength="12" placeholder="3.000"><small class="hint">O Asaas pede pra toda conta (regra do Banco Central).</small></label>
        <label class="pl-aceite"><input type="checkbox" id="mz-cf-aceite"> Li e aceito os <a href="termos.html#organizador" target="_blank" rel="noopener">Termos de uso</a> (quem organiza o evento responde por ele; o estorno de quem desiste sai da tua parte)</label>
        <p class="mz-erro" id="mz-cf-e" role="alert"></p>
        <div class="acts"><button type="submit" class="btn pri" id="mz-cf-ok">Abrir minha conta</button></div></form>`}
      <form class="form mz-conta-f" id="mz-cw" novalidate${soCarteira ? '' : ' hidden'}>
        <p>No Asaas: menu da tua conta › <b>Integrações</b> › <b>Wallet ID</b> › Copiar. Cola aqui.</p>
        <label class="fld">Wallet ID<input id="mz-cw-w" maxlength="36" placeholder="00000000-0000-0000-0000-000000000000" autocomplete="off" spellcheck="false"></label>
        <label class="pl-aceite"><input type="checkbox" id="mz-cw-aceite"> Li e aceito os <a href="termos.html#organizador" target="_blank" rel="noopener">Termos de uso</a> (quem organiza o evento responde por ele; o estorno de quem desiste sai da tua parte)</label>
        <p class="mz-erro" id="mz-cw-e" role="alert"></p>
        <div class="acts"><button type="submit" class="btn pri" id="mz-cw-ok">Ligar esta conta</button></div></form>`;
  }
  const CAMPO = { tipo: 'o tipo de pessoa', nome: 'o nome completo', email: 'o e-mail', doc: 'o CPF ou CNPJ', nascimento: 'a data de nascimento (precisa ter 18 anos ou mais)', empresa: 'o tipo de empresa',
    celular: 'o celular com DDD', cep: 'o CEP', endereco: 'a rua', numero: 'o número', bairro: 'o bairro', renda: 'a renda por mês' };
  async function abreConta(e){
    e.preventDefault();
    const g = k => (($('mz-cf-' + k) || {}).value || '').trim(), msg = $('mz-cf-e'), bt = $('mz-cf-ok');
    const tipo = (document.querySelector('input[name="mz-cf-tipo"]:checked') || {}).value || 'pf';
    if(!$('mz-cf-aceite').checked){ msg.textContent = 'Marca o "Li e aceito" pra seguir.'; return; }
    const doc = g('doc'); if(!C.docOk(doc)){ msg.textContent = 'Confere o ' + (tipo === 'pf' ? 'CPF.' : 'CNPJ.'); return; }
    msg.textContent = ''; bt.disabled = true; bt.textContent = 'Abrindo a conta…';
    try{
      const r = await C.api.fn('pagamento', { acao: 'org-conta', termos: C.TERMOS_V, tipo, nome: g('nome'), email: g('email'), doc, nascimento: g('nasc'), empresa: g('emp'),
        celular: g('cel'), cep: g('cep'), endereco: g('end'), numero: g('num'), complemento: g('comp'), bairro: g('bai'), renda: g('renda') });
      Z.org = undefined;
      toast(r && r.ja ? 'Tu já tem a conta de recebimento.' : 'Conta aberta! Olha teu e-mail: o Asaas mandou o link pra criar a senha.', 6000);
      viewConta($('app'));
    }catch(err){
      bt.disabled = false; bt.textContent = 'Abrir minha conta';
      msg.textContent = err && err.code === 'campo' ? 'Confere ' + (CAMPO[err.campo] || 'os dados') + '.' : erroMz(err);
    }
  }
  async function ligaCarteira(e){
    e.preventDefault();
    const w = (($('mz-cw-w') || {}).value || '').trim(), msg = $('mz-cw-e'), bt = $('mz-cw-ok');
    if(!$('mz-cw-aceite').checked){ msg.textContent = 'Marca o "Li e aceito" pra seguir.'; return; }
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(w)){ msg.textContent = 'O Wallet ID tem 36 letras e números, com quatro tracinhos. Copia de novo no Asaas.'; return; }
    msg.textContent = ''; bt.disabled = true;
    try{ await C.api.fn('pagamento', { acao: 'org-carteira', termos: C.TERMOS_V, wallet: w }); Z.org = undefined; toast('Conta ligada. Teus eventos já podem vender.', 4200); viewConta($('app')); }
    catch(err){ bt.disabled = false; msg.textContent = err && err.code === 'wallet_houzi' ? 'Esse é o código da conta do Corre, não o teu.' : err && err.code === 'ja_tem' ? 'Tu já tem uma conta aberta pelo Corre.' : erroMz(err); }
  }

  /* ---------------- os meus eventos ---------------- */
  async function viewMeus(app){
    document.title = 'Meus eventos · Muralzim';
    if(!logado()){ app.innerHTML = C.header('muralzim') + '<main class="wrap mz-w"><div class="mz"><p class="mz-carrega">Entra no Corre pra ver teus eventos.</p></div></main>'; entrarSheet('#/muralzim/meus', 'Entra no Corre pra ver os teus eventos.'); return; }
    app.innerHTML = C.header('muralzim') + '<main class="wrap mz-w"><div class="mz mz-pg-w" id="mz"><p class="mz-carrega">Abrindo…</p></div></main>';
    let L = [], o = null;
    try{ [L, o] = await Promise.all([C.api.rpc('corre_eventos_meus', {}), orgMeu(true)]); }catch(e){ const el = $('mz'); if(el) el.innerHTML = `<p class="mz-carrega">${esc(semFn(e) ? 'O Muralzim tá chegando: falta atualizar o banco.' : C.errMsg(e))}</p>`; return; }
    const el = $('mz'); if(!el) return; L = L || [];
    const hj = hoje(), vem = L.filter(e => e.dia >= hj), foi = L.filter(e => e.dia < hj);
    const s = o && (o.houzi ? 'Conta da Houzi' : (SIT[o.status] || [])[0]);
    el.innerHTML = `<header class="mz-pg-h"><h1>${ico('cal')} Meus eventos</h1><a class="mz-btn pri" href="#/muralzim/divulgar">${ico('plus')} Divulgar evento</a></header>
      <a class="mz-conta-l" href="#/muralzim/conta">${ico('cartao')}<span><b>Conta de recebimento</b><small>${esc(s || 'Pra vender ingresso aqui: liga a tua')}</small></span>${ico('next')}</a>
      ${!L.length ? '<div class="mz-vazio"><p class="mz-vazio-t">Nenhum evento ainda</p><p>Divulga teu primeiro: é de graça e vai pro muro de Londrina.</p></div>' : ''}
      ${vem.map(meuHTML).join('')}${foi.length ? `<h2 class="mz-pg-sub">Os que já passaram</h2>${foi.map(meuHTML).join('')}` : ''}`;
  }
  function meuHTML(e){
    return `<section class="mz-meu"><div class="mz-meu-p">${posterHTML(e, { link: false })}</div><div class="mz-meu-i">
      <b>${esc(e.titulo)}</b><span>${esc(dataLonga(e))} · ${esc(hora(e.inicio))}</span>
      ${e.entrada === 'corre' ? `<p class="mz-meu-n"><span><b>${e.vendidos}</b> vendidos</span><span><b>${e.usados}</b> entraram</span><span><b>${realC(e.receita)}</b> pra ti</span></p>` : ''}
      ${e.oculto ? '<p class="mz-aviso">Tirado do ar pelo Corre (denúncia). Fala com a gente pelo e-mail dos Termos.</p>' : ''}
      ${e.denuncias ? `<p class="mz-mut">${plural(e.denuncias, 'denúncia', 'denúncias')}</p>` : ''}
      <div class="acts"><a class="mz-btn sm" href="#/muralzim/e/${esc(e.id)}">Ver</a><a class="mz-btn sm" href="#/muralzim/editar/${esc(e.id)}">${ico('edit')} Editar</a>${e.entrada === 'corre' ? `<a class="mz-btn sm" href="#/muralzim/vendas/${esc(e.id)}">${ico('grafico')} Vendas</a><a class="mz-btn sm" href="#/muralzim/portaria/${esc(e.id)}">${ico('qr')} Portaria</a>` : ''}</div>
    </div></section>`;
  }

  /* ---------------- as vendas de um evento ---------------- */
  async function viewVendas(app, id){
    document.title = 'Vendas · Muralzim';
    if(!logado()){ app.innerHTML = C.header('muralzim'); entrarSheet('#/muralzim/vendas/' + id, 'Entra no Corre pra ver as vendas.'); return; }
    app.innerHTML = C.header('muralzim') + '<main class="wrap mz-w"><div class="mz mz-pg-w" id="mz"><p class="mz-carrega">Abrindo as vendas…</p></div></main>';
    let V = null; try{ V = await C.api.rpc('corre_evento_vendas', { p_evento: id }); }catch(e){}
    const el = $('mz'); if(!el) return;
    if(!V){ el.innerHTML = '<p class="mz-carrega">Esse evento não é teu (ou não existe mais).</p>'; return; }
    Z.vendas = V;
    const ev = V.evento, ing = V.ingressos || [], vendidos = ing.filter(i => i.status !== 'estornado'), entraram = ing.filter(i => i.status === 'usado').length;
    el.innerHTML = `<header class="mz-pg-h"><h1>${ico('grafico')} Vendas</h1><a class="mz-btn pri" href="#/muralzim/portaria/${esc(id)}">${ico('qr')} Abrir a portaria</a></header>
      <p class="mz-cp-ev"><b>${esc(ev.titulo)}</b><span>${esc(dataLonga(ev))} · ${esc(hora(ev.inicio))} · ${esc(ev.local)}${ev.status === 'cancelado' ? ' · cancelado' : ''}</span></p>
      <div class="mz-nums"><div><b>${vendidos.length}</b><span>ingressos vendidos</span></div><div><b>${entraram}</b><span>já entraram</span></div><div><b>${V.pendentes || 0}</b><span>esperando pagamento</span></div></div>
      <table class="mz-tab"><caption class="sr">Por tipo de ingresso</caption><thead><tr><th scope="col">Tipo</th><th scope="col">Preço</th><th scope="col">Vendidos</th><th scope="col">Entraram</th></tr></thead>
        <tbody>${(V.lotes || []).map(l => `<tr${l.ativo ? '' : ' class="off"'}><td>${esc(l.nome)}${l.meia ? ' <span class="mz-meia">meia</span>' : ''}</td><td>${real(l.preco)}</td><td>${l.vendidos} de ${l.qtd}</td><td>${l.usados}</td></tr>`).join('')}</tbody></table>
      <label class="mz-busca mz-busca-v" for="mz-vq"><span class="sr">Procurar quem comprou</span>${ico('lupa')}<input id="mz-vq" type="search" placeholder="Nome, @ ou código" autocomplete="off"></label>
      <ul class="mz-vl" id="mz-vl">${vendaLista(ing, '')}</ul>
      ${ev.status === 'ativo' ? `<div class="mz-perigo"><button type="button" class="mz-den" data-act="mz-ev-cancela" data-id="${esc(id)}">Cancelar o evento e devolver o dinheiro de todo mundo</button></div>` : ''}`;
  }
  function vendaLista(ing, q){
    const n = norm(q).replace(/-/g, '');
    const L = !n ? ing : ing.filter(i => norm([i.portador, i.quem, i.codigo].join(' ')).replace(/-/g, '').includes(n));
    return L.length ? L.slice(0, 300).map(i => `<li class="${esc(i.status)}"><span class="mz-ing-st">${esc(ST_ING[i.status] || i.status)}</span><b>${esc(i.portador || '—')}</b><span>${esc(i.lote)}${i.meia ? ' · meia' : ''}${i.quem ? ' · @' + esc(i.quem) : ''}</span><code>${esc(codFmt(i.codigo))}</code></li>`).join('') : '<li class="mz-mut">Ninguém com esse nome ou código.</li>';
  }

  /* ---------------- a portaria ---------------- */
  const PT = { ult: [], cam: null, det: null, pausa: 0 };
  async function viewPortaria(app, id){
    document.title = 'Portaria · Muralzim';
    if(!logado()){ app.innerHTML = C.header('muralzim'); entrarSheet('#/muralzim/portaria/' + id, 'Entra no Corre pra abrir a portaria.'); return; }
    app.innerHTML = C.header('muralzim') + '<main class="wrap mz-w"><div class="mz mz-pg-w" id="mz"><p class="mz-carrega">Abrindo a portaria…</p></div></main>';
    let V = null; try{ V = await C.api.rpc('corre_evento_vendas', { p_evento: id }); }catch(e){}
    const el = $('mz'); if(!el) return;
    if(!V){ el.innerHTML = '<p class="mz-carrega">Só quem divulgou o evento abre a portaria.</p>'; return; }
    PT.id = id; PT.total = (V.ingressos || []).filter(i => i.status !== 'estornado').length; PT.entraram = (V.ingressos || []).filter(i => i.status === 'usado').length;
    const cam = 'BarcodeDetector' in window && navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
    el.innerHTML = `<header class="mz-pg-h"><h1>${ico('qr')} Portaria</h1><a class="mz-btn" href="#/muralzim/vendas/${esc(id)}">Vendas</a></header>
      <p class="mz-cp-ev"><b>${esc(V.evento.titulo)}</b><span id="mz-pt-n">${PT.entraram} de ${PT.total} já entraram</span></p>
      <form class="mz-pt-f" id="mz-pt-f" novalidate><label class="fld">Código do ingresso<input id="mz-pt-c" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABCD-EFGH-JKLM" maxlength="40"></label><button type="submit" class="btn pri">Validar</button></form>
      ${cam ? `<div class="acts"><button type="button" class="btn" data-act="mz-cam" id="mz-cam-b">${ico('qr')} Ler o QR com a câmera</button></div><video id="mz-cam" class="mz-cam" playsinline muted hidden></video>`
        : '<p class="hint">Sem a câmera aqui: no celular, a câmera do próprio aparelho lê o QR do ingresso e abre ele no Corre, com o botão de validar.</p>'}
      <div class="mz-pt-r" id="mz-pt-r" aria-live="assertive"></div>
      <h2 class="mz-pg-sub">Os últimos</h2><ul class="mz-vl" id="mz-pt-u"></ul>`;
    PT.ult = []; setTimeout(() => { const i = $('mz-pt-c'); if(i) i.focus(); }, 50);
  }
  const PT_MSG = { codigo: 'Esse código não parece de ingresso.', nao_achou: 'Ingresso não achado.', outro_evento: 'Esse ingresso é de outro evento.', usado: 'Já entrou', estornado: 'Esse ingresso foi devolvido (o dinheiro voltou). Não vale.',
    cancelado: 'Esse ingresso não foi pago. Não vale.', pendente: 'Esse ingresso ainda não foi pago. Não vale.' };
  async function valida(cod, desfaz){
    const c = codDe(cod) || String(cod || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const out = $('mz-pt-r');
    let r = null;
    try{ r = await C.api.rpc('corre_ingresso_valida', { p_codigo: c, p_desfaz: !!desfaz }); }catch(e){ if(out){ out.className = 'mz-pt-r nao'; out.innerHTML = `<b>${esc(C.errMsg(e))}</b>`; } return r; }
    if(out){
      if(r && r.ok && r.desfez){ out.className = 'mz-pt-r esp'; out.innerHTML = `<b>Desfeito</b><span>${esc(r.portador || '')} pode entrar de novo.</span>`; PT.entraram = Math.max(0, PT.entraram - 1); }
      else if(r && r.ok){ out.className = 'mz-pt-r sim'; out.innerHTML = `<b>${ico('check')} Pode entrar</b><span>${esc(r.portador || '')} · ${esc(r.lote || '')}${r.meia ? ' · <u>meia: confere o documento</u>' : ''}</span>`; PT.entraram++;
        PT.ult.unshift({ c, p: r.portador, l: r.lote, t: Date.now() }); PT.ult = PT.ult.slice(0, 10); if(navigator.vibrate) try{ navigator.vibrate(60); }catch(e){} }
      else { const m = (r && r.motivo) || 'codigo'; out.className = 'mz-pt-r ' + (m === 'usado' ? 'esp' : 'nao');
        out.innerHTML = m === 'usado' ? `<b>Já entrou</b><span>${esc(r.portador || '')}${r.usado_em ? ' às ' + new Date(r.usado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}</span>` : `<b>Não vale</b><span>${esc(PT_MSG[m] || PT_MSG.codigo)}</span>`;
        if(navigator.vibrate) try{ navigator.vibrate([90, 60, 90]); }catch(e){} }
    }
    const n = $('mz-pt-n'); if(n) n.textContent = `${PT.entraram} de ${PT.total} já entraram`;
    const u = $('mz-pt-u'); if(u) u.innerHTML = PT.ult.map(x => `<li><b>${esc(x.p || '—')}</b><span>${esc(x.l || '')} · ${new Date(x.t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span><button type="button" class="mz-btn sm" data-act="mz-pt-desfaz" data-c="${esc(x.c)}">Desfazer</button></li>`).join('');
    return r;
  }
  async function camera(){
    const v = $('mz-cam'), b = $('mz-cam-b'); if(!v) return;
    if(PT.cam){ paraCamera(); return; }
    try{
      PT.det = PT.det || new window.BarcodeDetector({ formats: ['qr_code'] });
      PT.cam = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      v.srcObject = PT.cam; v.hidden = false; await v.play(); if(b) b.textContent = 'Parar a câmera';
      const roda = async () => {
        if(!PT.cam || !v.isConnected){ paraCamera(); return; }
        if(Date.now() > PT.pausa){
          try{ const L = await PT.det.detect(v); const c = L && L[0] && codDe(L[0].rawValue); if(c){ PT.pausa = Date.now() + 2200; await valida(c); } }catch(e){}
        }
        setTimeout(roda, 280);
      };
      roda();
    }catch(e){ paraCamera(); toast('A câmera não abriu. Confere a permissão do navegador, ou digita o código.', 4200); }
  }
  function paraCamera(){
    if(PT.cam){ try{ PT.cam.getTracks().forEach(t => t.stop()); }catch(e){} }
    PT.cam = null; const v = $('mz-cam'), b = $('mz-cam-b'); if(v){ v.hidden = true; v.srcObject = null; } if(b) b.innerHTML = `${ico('qr')} Ler o QR com a câmera`;
  }
  addEventListener('hashchange', () => { if(PT.cam && !/^#\/muralzim\/portaria\//.test(location.hash)) paraCamera(); });

  /* ---------------- cancelar o evento ---------------- */
  async function cancelaEvento(id){
    const ev = (Z.vendas && Z.vendas.evento && Z.vendas.evento.id === id) ? Z.vendas.evento : await C.api.rpc('corre_evento_ver', { p_id: id }).catch(() => null);
    if(!ev) return;
    const vende = ev.entrada === 'corre';
    if(!(await C.confirma({ titulo: `Cancelar ${ev.titulo}?`, texto: vende ? 'O dinheiro de todo mundo que comprou volta, a taxa junto. Não tem volta.' : 'O cartaz fica no muro com o carimbo "Cancelado".', sim: vende ? 'Cancelar e devolver' : 'Cancelar o evento', ico: 'x' }))) return;
    if(!vende){
      try{ await C.api.rpc('corre_evento_status', { p_id: id, p_status: 'cancelado' }); Z.lista = null; toast('Evento cancelado.'); C.go('#/muralzim/meus'); }
      catch(e){ toast(C.errMsg(e)); }
      return;
    }
    toast('Devolvendo o dinheiro…', 8000);
    let tot = 0, voltas = 0;
    try{
      for(;;){
        const r = await C.api.fn('pagamento', { acao: 'evento-cancelar', evento: id }) || {};
        tot += r.devolvidos || 0; voltas++;
        if(!r.faltam) break;
        if(!r.devolvidos || voltas > 30){ toast(`Devolvi ${tot}. ${r.faltam} não voltaram agora${r.detalhe ? ' (' + r.detalhe + ')' : ''}: tenta de novo daqui a pouco.`, 8000); return; }
      }
      Z.lista = null; toast(tot ? `Evento cancelado. ${plural(tot, 'compra devolvida', 'compras devolvidas')}.` : 'Evento cancelado.', 5000); C.go('#/muralzim/meus');
    }catch(e){ toast(erroMz(e), 6000); }
  }

  /* ---------------- a rota ---------------- */
  C.views.muralzim = function(app, sub){
    sub = String(sub || '').replace(/^\/+/, '');
    const m = /^([a-z]+)\/?(.*)$/.exec(sub) || [];
    const k = m[1] || '', arg = C.decURI(m[2] || '');
    if(k === 'e' && arg) return viewMural(app, arg);
    if(k === 'divulgar') return viewDivulgar(app, '');
    if(k === 'editar' && arg) return viewDivulgar(app, arg);
    if(k === 'conta') return viewConta(app);
    if(k === 'meus') return viewMeus(app);
    if(k === 'ingressos') return viewIngressos(app);
    if(k === 'i' && arg) return viewIngresso(app, arg);
    if(k === 'vendas' && arg) return viewVendas(app, arg);
    if(k === 'portaria' && arg) return viewPortaria(app, arg);
    return viewMural(app, '');
  };

  /* ---------------- os toques ---------------- */
  Object.assign(C.acts, {
    'mz-dia': el => { Z.dia = Z.dia === el.dataset.d ? null : el.dataset.d; if(Z.dia) Z.fds = false; pintaFiltros(); },
    'mz-cat': el => { Z.cat = el.dataset.k === Z.cat && Z.cat !== 'all' ? 'all' : el.dataset.k; pintaFiltros(); },
    'mz-fds': () => { Z.fds = !Z.fds; if(Z.fds) Z.dia = null; pintaFiltros(); },
    'mz-gratis': () => { Z.gratis = !Z.gratis; if(Z.gratis) Z.aqui = false; pintaFiltros(); },
    'mz-aqui': () => { Z.aqui = !Z.aqui; if(Z.aqui) Z.gratis = false; pintaFiltros(); },
    'mz-limpa': () => { Object.assign(Z, { q: '', cat: 'all', dia: null, fds: false, gratis: false, aqui: false }); const q = $('mz-q'); if(q) q.value = ''; pintaFiltros(); },
    'mz-passados': () => { Z.passados = !Z.passados; pintaFiltros(); },
    'mz-convite': () => { if(Z.ev) C.copy(convite(Z.ev), 'Convite copiado. É só colar no WhatsApp.'); },
    'mz-comprar': () => compraSheet(),
    'mz-q': el => {
      const ev = Z.ev, cp = Z.cp, l = ev && (ev.lotes || []).find(x => x.id === el.dataset.l); if(!l || !cp) return;
      const tot = Object.values(cp.q).reduce((s, n) => s + n, 0), d = Number(el.dataset.d), atual = cp.q[l.id] || 0;
      const novo = Math.max(0, Math.min(l.restam, atual + d, atual + (10 - tot)));
      if(d > 0 && novo === atual){ const e = $('mz-cp-e'); if(e) e.textContent = tot >= 10 ? ERRO_MZ.qtd : `Só restam ${l.restam} de ${l.nome}.`; return; }
      cp.q[l.id] = novo; const o = $('mz-q-' + l.id); if(o) o.textContent = String(novo); const e = $('mz-cp-e'); if(e) e.textContent = ''; pintaTotal();
    },
    'mz-pagar': el => pagar(el),
    'mz-pix-copia': () => { const P = Z.pagando; if(P && P.pix && P.pix.copia) C.copy(P.pix.copia, 'Pix copiado. Cola no app do teu banco.'); },
    'mz-confere': async el => { el.disabled = true; if(C.DEMO && Z.pagando) await C.api.fn('pagamento', { acao: 'ingresso-demo-paga', pedido: Z.pagando.pedido }).catch(() => null); await confere(false); el.disabled = false; },
    'mz-repaga': async el => {
      const f = el.dataset.f;
      if(f !== 'pix'){ if(el.dataset.l) window.open(el.dataset.l, '_blank', 'noopener'); else toast('A fatura não tá mais aberta: compra de novo.'); return; }
      try{ const r = await C.api.fn('pagamento', { acao: 'ingresso-pix', pedido: el.dataset.id }); const sec = el.closest('.mz-ped'), t = sec && sec.querySelector('.mz-ped-h b');
        Z.pagando = { pedido: el.dataset.id, ev: { titulo: t ? t.textContent : 'Ingresso' }, total: r.total, forma: 'pix', link: r.link || '', pix: r.pix, ate: Date.now() + 10 * 60e3 }; esperaSheet(); }
      catch(e){ toast(e && e.status === 404 ? 'Esse pagamento já não tá aberto. Compra de novo.' : erroMz(e)); }
    },
    'mz-desiste': async el => {
      const id = el.dataset.id; let v = null;
      try{ v = await C.api.fn('pagamento', { acao: 'ingresso-desistir', pedido: id, ver: true }); }catch(e){ toast(erroMz(e)); return; }
      if(!v || !v.pode){ toast({ prazo: 'O prazo de desistir passou (7 dias da compra, e até 48 horas antes do evento).', usado: 'Um dos ingressos já foi usado na entrada.', devolvido: 'Esse dinheiro já voltou.' }[v && v.motivo] || 'Não dá pra desistir dessa compra.', 5600); return; }
      if(!(await C.confirma({ titulo: 'Desistir da compra?', texto: `Volta ${esc(realC(v.valor))} (a taxa junto) e os ingressos deixam de valer.`, sim: 'Desistir e receber de volta' }))) return;
      el.disabled = true;
      try{ const r = await C.api.fn('pagamento', { acao: 'ingresso-desistir', pedido: id }); toast(`Pronto: ${realC(r.devolvido)} voltando pra ti. No Pix chega em minutos; no cartão, na fatura.`, 6000); viewIngressos($('app')); }
      catch(e){ el.disabled = false; toast(erroMz(e), 6000); }
    },
    'mz-denuncia': () => {
      if(!Z.ev) return;
      C.sheet(`<form class="form" id="mz-den-f"><div class="sheet-head"><h2>Denunciar o evento</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
        <fieldset class="fld"><legend>O que tem de errado?</legend>${[['golpe', 'É golpe'], ['falso', 'O evento não existe'], ['ofensivo', 'É ofensivo ou de ódio'], ['ilegal', 'É ilegal ou perigoso'], ['spam', 'É propaganda enganosa'], ['outro', 'Outra coisa']].map(([k, n], i) => `<label class="mz-den-o"><input type="radio" name="mz-den" value="${k}"${i ? '' : ' checked'}> ${n}</label>`).join('')}</fieldset>
        <label class="fld">Conta mais <small>(se quiser)</small><textarea id="mz-den-t" rows="3" maxlength="500"></textarea></label>
        <div class="acts"><button type="submit" class="btn pri">Mandar a denúncia</button><button type="button" class="btn" data-close>Agora não</button></div></form>`);
    },
    'mz-oculta': async el => { try{ await C.api.rpc('corre_evento_oculta', { p_id: Z.ev.id, p_oculto: el.dataset.v === '1' }); Z.lista = null; C.closeSheet(); toast(el.dataset.v === '1' ? 'Tirado do ar.' : 'De volta no ar.'); viewMural($('app'), ''); }catch(e){ toast(C.errMsg(e)); } },
    'mz-entrar': async el => { el.disabled = true; try{ await C.api.login(); }catch(err){ el.disabled = false; toast('Não deu pra abrir o login do Google. Tenta de novo.', 4200); } },
    'mz-lote-mais': () => { if(Z.form.lotes.length >= 8){ toast('No máximo 8 tipos de ingresso.'); return; } guardaLotes(); Z.form.lotes.push({ id: '', nome: Z.form.lotes.some(l => /meia/i.test(l.nome)) ? '' : 'Meia-entrada', preco: '', qtd: 50, meia: !Z.form.lotes.some(l => l.meia) }); pintaLotes(); prevForm(); },
    'mz-lote-tira': el => { guardaLotes(); Z.form.lotes.splice(Number(el.dataset.i), 1); pintaLotes(); prevForm(); },
    'mz-rasc': () => { if($('mz-f')) store.set(RASC, Object.assign(lerForm(), { id: Z.form.id || '' })); },
    'mz-ev-cancela': el => cancelaEvento(el.dataset.id),
    'mz-ev-apaga': async el => { if(!(await C.confirma({ titulo: 'Tirar o cartaz do muro?', texto: 'Ele some do Muralzim.', sim: 'Tirar do muro' }))) return; try{ await C.api.rpc('corre_evento_status', { p_id: el.dataset.id, p_status: 'apagado' }); Z.lista = null; toast('Tirado do muro.'); C.go('#/muralzim/meus'); }catch(e){ toast(/tem_vendidos/.test(String(e && (e.hint || e.message))) ? ERRO_F.tem_vendidos[1] : C.errMsg(e)); } },
    'mz-conta-tab': el => { document.querySelectorAll('[data-act="mz-conta-tab"]').forEach(b => b.setAttribute('aria-selected', String(b === el))); const nova = el.dataset.k === 'nova', f = $('mz-cf'), w = $('mz-cw'); if(f) f.hidden = !nova; if(w) w.hidden = nova; },
    'mz-org-confere': async el => { el.disabled = true; try{ const r = await C.api.fn('pagamento', { acao: 'org-ver', agora: true }); Z.org = undefined; toast(r && r.conta && r.conta.status === 'aprovada' ? 'Aprovada! Teus eventos já vendem.' : 'Ainda não: o Asaas segue conferindo.', 4200); viewConta($('app')); }catch(e){ el.disabled = false; toast(erroMz(e)); } },
    'mz-cam': () => camera(),
    'mz-pt-desfaz': el => valida(el.dataset.c, true),
    'mz-valida-um': async el => { el.disabled = true; const r = await valida(el.dataset.c); toast(r && r.ok ? `Pode entrar: ${r.portador || ''}` : r && r.motivo === 'usado' ? 'Esse ingresso já entrou.' : 'Não vale.', 4200); viewIngresso($('app'), el.dataset.c); }
  });
  /* guarda o que tá escrito nos tipos de ingresso antes de redesenhar a lista */
  function guardaLotes(){
    document.querySelectorAll('.mz-lote-ed').forEach(row => { const l = Z.form.lotes[Number(row.dataset.i)]; if(!l) return;
      row.querySelectorAll('[data-lf]').forEach(i => { l[i.dataset.lf] = i.type === 'checkbox' ? i.checked : i.value; }); });
  }
  document.addEventListener('input', e => {
    const t = e.target;
    if(t.id === 'mz-q'){ Z.q = t.value.trim(); pintaFiltros(); }
    if(t.closest && t.closest('#mz-f')){ if(t.dataset.lf){ guardaLotes(); const row = t.closest('.mz-lote-ed'), l = row && Z.form.lotes[Number(row.dataset.i)], q = row && row.querySelector('.mz-lote-q'); if(l && q) q.textContent = Number(l.preco) >= 5 ? `Quem compra paga ${realC(Number(l.preco) + taxaDe(l.preco))}; você recebe ${realC(l.preco)}.` : 'De R$ 5 a R$ 2.000.'; } prevForm(); const m = $('mz-f-e'); if(m && m.textContent) m.textContent = ''; }
    if(t.id === 'mz-vq' && Z.vendas){ const ul = $('mz-vl'); if(ul) ul.innerHTML = vendaLista(Z.vendas.ingressos || [], t.value); }
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if(t.name === 'mz-ent'){ pintaEntrada(); prevForm(); }
    if(t.name === 'mz-cf-tipo'){ const pj = t.value === 'pj'; const a = $('mz-cf-nasc-w'), b = $('mz-cf-emp-w'), l = $('mz-cf-doc-l'); if(a) a.hidden = pj; if(b) b.hidden = !pj; if(l) l.textContent = pj ? 'CNPJ' : 'CPF'; }
    if(t.closest && t.closest('#mz-f')) prevForm();
  });
  document.addEventListener('submit', e => {
    const f = e.target;
    if(f.id === 'mz-f') return salvaForm(e);
    if(f.id === 'mz-cf') return abreConta(e);
    if(f.id === 'mz-cw') return ligaCarteira(e);
    if(f.id === 'mz-pt-f'){ e.preventDefault(); const i = $('mz-pt-c'); if(i && i.value.trim()){ valida(i.value); i.value = ''; i.focus(); } return; }
    if(f.id === 'mz-den-f'){
      e.preventDefault();
      const m = (f.querySelector('input[name="mz-den"]:checked') || {}).value || 'outro', t = ($('mz-den-t') || {}).value || '';
      C.api.rpc('corre_evento_denuncia', { p_evento: Z.ev.id, p_motivo: m, p_texto: t }).then(r => { C.closeSheet(); toast(r && r.ok ? 'Denúncia mandada. Os donos do Corre vão olhar.' : 'Não deu pra mandar agora.', 4200); }).catch(err => toast(C.errMsg(err)));
    }
  });

  /* pros outros cantos do Corre: o Mapa da cidade abre o Muralzim por cima dela */
  C.muralzim = { carrega, taxaDe, codDe };
})();
