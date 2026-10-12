/* CORRE · BANCA DO DIA: notícia, hype e inspiração por tema, mais assuntos que a pessoa segue.
   Manchetes vêm da função "banca" no Supabase (feeds RSS das publicações + busca de notícias).
   A edição dos temas é montada de hora em hora e fica salva no banco (corre_banca_edicao):
   a página lê direto de lá (abre na hora) e só chama a função pros assuntos que a pessoa segue.
   Com a página aberta, ela troca sozinha quando sai edição nova.
   "Em alta" vem direto da Wikipédia (o que mais se leu ontem). Se a função não responder,
   a banca mostra as bancas de cada tema e a busca do assunto, pra nunca ficar vazia. */
(function(){
  'use strict';
  const C = window.Corre, { esc, ico } = C;
  const TEMAS = [
    { k: 'publicidade', n: 'Publicidade', tipo: 'Notícia', sites: [['B9', 'https://www.b9.com.br/'], ['Meio & Mensagem', 'https://www.meioemensagem.com.br/'], ['Propmark', 'https://propmark.com.br/']] },
    { k: 'redes', n: 'Redes sociais', tipo: 'Notícia', sites: [['Social Media Today', 'https://www.socialmediatoday.com/'], ['Tecnoblog', 'https://tecnoblog.net/']] },
    { k: 'tecnologia', n: 'Tecnologia e IA', tipo: 'Notícia', sites: [['Tecnoblog', 'https://tecnoblog.net/'], ['The Verge', 'https://www.theverge.com/']] },
    { k: 'negocios', n: 'Negócios', tipo: 'Notícia', sites: [['Startups', 'https://startups.com.br/']] },
    { k: 'futebol', n: 'Futebol', tipo: 'Notícia', sites: [['Trivela', 'https://trivela.com.br/']] },
    { k: 'streetwear', n: 'Streetwear e sneaker', tipo: 'Hype', sites: [['Hypebeast', 'https://hypebeast.com/'], ['Sneaker News', 'https://sneakernews.com/'], ['Highsnobiety', 'https://www.highsnobiety.com/']] },
    { k: 'musica', n: 'Rap e música', tipo: 'Hype', sites: [['Tenho Mais Discos Que Amigos!', 'https://www.tenhomaisdiscosqueamigos.com/'], ['Rolling Stone Brasil', 'https://rollingstone.com.br/'], ['Pitchfork', 'https://pitchfork.com/']] },
    { k: 'cinema', n: 'Cinema e séries', tipo: 'Hype', sites: [['Rolling Stone Brasil', 'https://rollingstone.com.br/'], ['IndieWire', 'https://www.indiewire.com/']] },
    { k: 'games', n: 'Games e anime', tipo: 'Hype', sites: [['Polygon', 'https://www.polygon.com/'], ['Anime News Network', 'https://www.animenewsnetwork.com/']] },
    { k: 'comida', n: 'Comida', tipo: 'Hype', sites: [['Eater', 'https://www.eater.com/']] },
    { k: 'design', n: 'Design', tipo: 'Inspiração', sites: [['Dezeen', 'https://www.dezeen.com/'], ['designboom', 'https://www.designboom.com/'], ['Creative Boom', 'https://www.creativeboom.com/']] },
    { k: 'arte', n: 'Arte e foto', tipo: 'Inspiração', sites: [['Colossal', 'https://www.thisiscolossal.com/'], ['PetaPixel', 'https://petapixel.com/']] }
  ];
  const T = Object.fromEntries(TEMAS.map(t => [t.k, t]));
  const PADRAO = ['publicidade', 'redes', 'streetwear', 'musica', 'design'];
  const B = { ed: null, edKey: '', at: 0, alta: null, altaAt: 0, sal: null, salAt: 0, vigia: 0, mostrada: '' };
  C.BANCA_TEMAS = TEMAS;

  const temasDe = me => { const t = (me && Array.isArray(me.banca_temas) ? me.banca_temas : []).filter(k => T[k]); return t.length ? t : PADRAO; };
  const assuntosDe = me => (me && Array.isArray(me.banca_assuntos) ? me.banca_assuntos : []).filter(Boolean);
  const gnews = q => `https://news.google.com/search?q=${encodeURIComponent(q)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
  const quando = d => d ? C.rel(d) : '';

  /* edição dos temas salva no banco (montada de hora em hora). Velha demais (3 h) = ignora. */
  const HORA = 60 * 60e3;
  async function edicaoSalva(){
    if(B.sal && Date.now() - B.salAt < 5 * 60e3) return B.sal;
    try{
      const r = await C.api.one('corre_banca_edicao', { eq: { id: 'atual' }, select: 'temas,gerado_em' });
      if(r && r.temas && Date.now() - Date.parse(r.gerado_em) < 3 * HORA){ B.sal = { temas: r.temas, geradoEm: r.gerado_em }; B.salAt = Date.now(); return B.sal; }
    }catch(e){}
    return null;
  }
  const corta = temas => Object.fromEntries(Object.entries(temas || {}).map(([k, v]) => [k, (v || []).slice(0, 8)]));
  /* manchetes: temas da edição salva + assuntos pela função (cache de 15 min na memória) */
  async function edicao(temas, assuntos, extra){
    const lista = assuntos.concat(extra || []);
    const sal = await edicaoSalva();
    if(sal && !lista.length) return { temas: corta(sal.temas), assuntos: {}, geradoEm: sal.geradoEm };
    const key = (sal ? 'sal' : temas.join(',')) + '|' + lista.join(',');
    if(B.ed && B.edKey === key && Date.now() - B.at < 15 * 60e3) return sal ? Object.assign({}, B.ed, { temas: corta(sal.temas), geradoEm: sal.geradoEm }) : B.ed;
    const ed = await C.api.fn('banca', { temas: sal ? [] : temas, assuntos: lista });
    if(!ed || !ed.temas) throw { code: 'vazio' };
    if(sal){ ed.temas = corta(sal.temas); ed.geradoEm = sal.geradoEm; }
    B.ed = ed; B.edKey = key; B.at = Date.now();
    return ed;
  }
  const horaDe = iso => { try{ return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date(iso)).replace(':', 'h'); }catch(e){ return ''; } };
  /* com a banca aberta: a cada 5 min vê se já saiu edição nova (mais de 1 h desde a última) */
  function vigia(){
    clearInterval(B.vigia);
    B.vigia = setInterval(async () => {
      if(!/^#\/banca/.test(location.hash)){ clearInterval(B.vigia); return; }
      if(document.visibilityState !== 'visible' || !B.mostrada) return;
      if(Date.now() - Date.parse(B.mostrada) < HORA + 6 * 60e3) return;
      B.salAt = 0; B.at = 0;
      const sal = await edicaoSalva();
      if(sal && sal.geradoEm !== B.mostrada) pintaGrade();
    }, 5 * 60e3);
  }
  /* o que mais se leu ontem na Wikipédia em português */
  const BLOQ = /porn|xvideos|xnxx|onlyfans|hentai|sexo|er[oó]tic/i;
  async function emAlta(){
    if(B.alta && Date.now() - B.altaAt < 30 * 60e3) return B.alta;
    const [y, m, d] = C.hojeBR().split('-');
    const urls = [`https://pt.wikipedia.org/api/rest_v1/feed/featured/${y}/${m}/${d}`, `https://api.wikimedia.org/feed/v1/wikipedia/pt/featured/${y}/${m}/${d}`];
    for(const u of urls){
      try{
        const r = await fetch(u, { headers: { accept: 'application/json' } }); if(!r.ok) continue;
        const j = await r.json(), arts = (j.mostread && j.mostread.articles) || [];
        const list = arts.filter(a => !/^(Especial|Wikipédia|Ficheiro|Portal|Categoria|Predefinição|Ajuda):/.test(a.title) && !/Página_principal|Main_Page/.test(a.title) && !BLOQ.test(a.title + ' ' + (a.description || '')))
          .slice(0, 10).map(a => ({ t: a.normalizedtitle || (a.titles && a.titles.normalized) || String(a.title).replace(/_/g, ' '), desc: a.description || '', u: (a.content_urls && a.content_urls.desktop && a.content_urls.desktop.page) || ('https://pt.wikipedia.org/wiki/' + encodeURIComponent(a.title)), v: a.views || 0 }));
        if(list.length){ B.alta = list; B.altaAt = Date.now(); return list; }
      }catch(e){}
    }
    return [];
  }

  const itemHTML = (i, n) => `<li><a href="${esc(i.u)}" target="_blank" rel="noopener"><b>${esc(i.t)}</b></a><span class="by"><span>${esc(i.f || '')}${i.d ? ' · ' + quando(i.d) : ''}</span><button type="button" class="pauta" data-act="banca-pauta" data-t="${esc(i.t)}" data-u="${esc(i.u)}" aria-label="Copiar como pauta">${ico('edit')} Pauta</button></span></li>`;
  function colHTML(k, itens){
    const t = T[k];
    const corpo = itens && itens.length ? `<ol class="b-list">${itens.map(itemHTML).join('')}</ol>`
      : `<p class="b-vazio">Sem manchete nova agora. Vai direto nas bancas:</p><ul class="b-sites">${t.sites.map(([n, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${esc(n)} ${ico('ext')}</a></li>`).join('')}</ul>`;
    return `<section class="b-col"><header><span class="kick">${esc(t.tipo)}</span><h3>${esc(t.n)}</h3></header>${corpo}</section>`;
  }
  function assuntoHTML(a, itens){
    const corpo = itens && itens.length ? `<ol class="b-list">${itens.map(itemHTML).join('')}</ol>` : `<p class="b-vazio">Nada fresco sobre isso nos últimos dias.</p>`;
    return `<section class="b-col seg"><header><span class="kick">Você segue</span><h3>${esc(a)}</h3></header>${corpo}<a class="b-more" href="${gnews(a)}" target="_blank" rel="noopener">Buscar mais sobre ${esc(a)} ${ico('ext')}</a></section>`;
  }

  C.views.banca = async function(app){
    const me = C.st.me, temas = temasDe(me), assuntos = assuntosDe(me);
    const hoje = new Date(), dia = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' }).format(hoje);
    app.innerHTML = C.header('banca') + `<main class="wrap wide">
      <section class="banca">
        <header class="masthead"><span class="mono">Edição de ${esc(dia)}<span id="b-hora"></span></span><h1>Banca do dia</h1><p>Notícia, hype e inspiração pra virar pauta.</p></header>
        <div class="filtros light" role="group" aria-label="Temas da tua banca">${TEMAS.map(t => `<button type="button" class="chip-f" data-act="banca-tema" data-k="${t.k}" aria-pressed="${temas.includes(t.k)}">${esc(t.n)}</button>`).join('')}</div>
        <form class="seguir" id="b-seguir" autocomplete="off"><label for="b-assunto" class="mono">Seguir um assunto</label><div class="seguir-row"><input class="inp" id="b-assunto" maxlength="40" placeholder="Ex.: smash burger, Athletico, Kendrick" enterkeyhint="go"><button type="submit" class="btn pri">Seguir</button></div>
          ${assuntos.length ? `<div class="seguidos">${assuntos.map(a => `<span class="chip">${esc(a)}<button type="button" data-act="banca-unfollow" data-a="${esc(a)}" aria-label="Parar de seguir ${esc(a)}">${ico('x')}</button></span>`).join('')}</div>` : ''}
        </form>
        <div class="b-grid" id="b-grid">${temas.map(k => `<section class="b-col"><header><span class="kick">${esc(T[k].tipo)}</span><h3>${esc(T[k].n)}</h3></header><p class="b-vazio">Rodando a impressora…</p></section>`).join('')}</div>
        <section class="alta"><header><span class="kick">O que o Brasil mais leu ontem</span><h3>Em alta</h3></header><div id="b-alta"><p class="b-vazio">Carregando…</p></div><p class="fine">Fonte: Wikipédia (páginas mais lidas em português).</p></section>
      </section>
    </main>`;
    C.$('b-seguir').addEventListener('submit', async e => {
      e.preventDefault();
      const v = C.$('b-assunto').value.trim().replace(/\s+/g, ' ').slice(0, 40);
      if(v.length < 3){ C.toast('Escreve pelo menos 3 letras.'); return; }
      const cur = assuntosDe(C.st.me);
      if(cur.some(a => C.norm(a) === C.norm(v))){ C.toast('Você já segue isso.'); return; }
      if(cur.length >= 8){ C.toast('Dá pra seguir até 8 assuntos.'); return; }
      try{ await C.saveMe({ banca_assuntos: cur.concat(v) }); C.views.banca(C.$('app')); }catch(err){ C.toast(C.errMsg(err)); }
    });
    emAlta().then(list => {
      const el = C.$('b-alta'); if(!el) return;
      el.innerHTML = list.length ? `<ol class="b-list alta-list">${list.map(a => `<li><a href="${esc(a.u)}" target="_blank" rel="noopener"><b>${esc(a.t)}</b></a>${a.desc ? `<span class="by"><span>${esc(a.desc)}</span></span>` : ''}</li>`).join('')}</ol>` : '<p class="b-vazio">A lista de hoje ainda não saiu.</p>';
    });
    await pintaGrade();
    vigia();
  };
  const seguidoHTML = (a, ed, buscando) => ed && !buscando && !ed.falhou ? assuntoHTML(a, (ed.assuntos || {})[a])
    : `<section class="b-col seg"><header><span class="kick">Você segue</span><h3>${esc(a)}</h3></header>${buscando ? '<p class="b-vazio">Procurando…</p>' : ''}<a class="b-more" href="${gnews(a)}" target="_blank" rel="noopener">Ver as notícias de ${esc(a)} ${ico('ext')}</a></section>`;
  async function pintaGrade(){
    const me = C.st.me, temas = temasDe(me), assuntos = assuntosDe(me);
    const pinta = (ed, buscando) => {
      const grid = C.$('b-grid'); if(!grid) return;
      grid.innerHTML = assuntos.map(a => seguidoHTML(a, ed, buscando)).join('') + temas.map(k => colHTML(k, ed ? ed.temas[k] : null)).join('');
      const h = C.$('b-hora'); if(h && ed && ed.geradoEm){ h.textContent = ' · saiu às ' + horaDe(ed.geradoEm); B.mostrada = ed.geradoEm; }
    };
    /* os temas aparecem na hora (edição salva); os assuntos chegam depois */
    const sal = await edicaoSalva();
    if(sal && assuntos.length) pinta({ temas: corta(sal.temas), assuntos: {}, geradoEm: sal.geradoEm }, true);
    let ed = null;
    try{ ed = await edicao(temas, assuntos); }catch(e){ ed = sal ? { temas: corta(sal.temas), assuntos: {}, geradoEm: sal.geradoEm, falhou: true } : null; }
    pinta(ed, false);
  }

  Object.assign(C.acts, {
    'banca-tema': async el => {
      const k = el.dataset.k; let t = temasDe(C.st.me);
      t = t.includes(k) ? t.filter(x => x !== k) : t.concat(k);
      if(!t.length){ C.toast('Deixa pelo menos um tema.'); return; }
      try{ await C.saveMe({ banca_temas: t }); C.views.banca(C.$('app')); }catch(e){ C.toast(C.errMsg(e)); }
    },
    'banca-unfollow': async el => {
      const a = el.dataset.a;
      try{ await C.saveMe({ banca_assuntos: assuntosDe(C.st.me).filter(x => x !== a) }); C.views.banca(C.$('app')); }catch(e){ C.toast(C.errMsg(e)); }
    },
    'banca-pauta': el => C.copy(`Pauta: ${el.dataset.t}\n${el.dataset.u}`, 'Pauta copiada.')
  });

  /* pro painel da marca: manchetes de um assunto (marca ou segmento) */
  C.bancaAssunto = async (assuntos) => {
    const me = C.st.me;
    try{ const ed = await edicao(temasDe(me), assuntosDe(me), assuntos); return ed.assuntos || {}; }catch(e){ return null; }
  };
  C.gnews = gnews;

  /* card do início: 3 manchetes do primeiro tema; sem função, o que tá em alta */
  C.home.push({ k: 'banca', o: 2, async html(){
    const me = C.st.me, temas = temasDe(me);
    let itens = [], rot = T[temas[0]].n;
    try{ const ed = await edicao(temas, []); for(const k of temas){ if((ed.temas[k] || []).length){ itens = ed.temas[k].slice(0, 3); rot = T[k].n; break; } } }catch(e){}
    if(!itens.length){ const alta = await emAlta(); itens = alta.slice(0, 3).map(a => ({ t: a.t, f: a.desc })); rot = 'Em alta'; }
    return `<a class="hcard banca-mini" href="#/banca">
      <div class="hc-top"><span class="hc-name">Banca do dia</span><span class="mono">${esc(rot)}</span></div>
      ${itens.length ? `<ol class="mini-list">${itens.map(i => `<li><b>${esc(i.t)}</b>${i.f ? `<small>${esc(i.f)}</small>` : ''}</li>`).join('')}</ol>` : '<p class="note">A edição de hoje tá saindo do forno.</p>'}
      <span class="hc-go">Abrir a banca ${ico('next')}</span>
    </a>`;
  } });
})();
