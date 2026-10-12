/* CORRE · ROLO 360: sala de projeção. 5 frames por dia, tirados dos temas que a pessoa escolheu.
   Com a chave do Maps Embed (config.js), cada frame é o Street View de verdade, girável, com tratamento de película.
   Sem a chave, o frame revela com uma foto de verdade tirada naquele ponto (Wikimedia Commons, com crédito);
   se não achar foto, fica o negativo com legenda, que revela no Street View num toque. */
(function(){
  'use strict';
  const C = window.Corre, D = window.CORRE_ROLO, { esc, ico } = C;
  if(!D) return;
  const PER = 5, DAY = 864e5;
  const KEY = C.CFG.MAPS_EMBED_KEY || '';
  const byId = Object.fromEntries(D.frames.map(f => [f.id, f]));
  const temaN = Object.fromEntries(D.temas.map(t => [t.k, t.n]));
  const R = { day: 0, roll: [], i: 0, play: !KEY, t: 0, salvos: new Set(), avulso: null };

  const dayIdx = iso => Math.floor(Date.parse(iso + 'T12:00:00Z') / DAY);
  const temasDe = me => (me && Array.isArray(me.rolo_temas) ? me.rolo_temas : []).filter(k => temaN[k]);
  function pool(temas){ return temas.length ? D.frames.filter(f => f.t.some(t => temas.includes(t))) : D.frames; }
  function rollFor(day, temas, who){
    const p = pool(temas), order = C.shuffle(p, C.hash((who || 'corre') + '|' + temas.slice().sort().join(',')));
    const n = Math.min(PER, order.length), start = (day * PER) % order.length;
    return Array.from({ length: n }, (_, i) => order[(start + i) % order.length]);
  }
  const coord = f => `${Math.abs(f.lat).toFixed(4)}° ${f.lat < 0 ? 'S' : 'N'} · ${Math.abs(f.lng).toFixed(4)}° ${f.lng < 0 ? 'O' : 'L'}`;
  const svUrl = f => `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${f.lat},${f.lng}`;
  const embedUrl = f => `https://www.google.com/maps/embed/v1/streetview?key=${encodeURIComponent(KEY)}&location=${f.lat},${f.lng}&fov=80&language=pt-BR${f.h != null ? '&heading=' + f.h : ''}`;
  const rollNo = me => { const ini = me && me.created_at ? dayIdx(String(me.created_at).slice(0, 10)) : dayIdx('2026-10-05'); return Math.max(1, R.day - ini + 1); };
  const dataLonga = d => { const x = new Date(d * DAY + 12 * 36e5); return `${x.getUTCDate()} de ${C.MESES_L[x.getUTCMonth()]}`; };

  /* foto real do lugar, sem chave: a mais perto das coordenadas no Wikimedia Commons (licença livre, com crédito) */
  const FOTO = new Map();
  function fotoDe(f){
    if(FOTO.has(f.id)) return FOTO.get(f.id);
    const pr = (async () => {
      try{
        const q = new URLSearchParams({ action: 'query', format: 'json', origin: '*', generator: 'geosearch', ggscoord: `${f.lat}|${f.lng}`, ggsradius: '1500', ggslimit: '24', ggsnamespace: '6', prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1600', iiextmetadatafilter: 'Artist|LicenseShortName' });
        const r = await fetch('https://commons.wikimedia.org/w/api.php?' + q); if(!r.ok) return null;
        const j = await r.json(), ps = Object.values((j.query && j.query.pages) || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
        for(const pg of ps){
          const ii = pg.imageinfo && pg.imageinfo[0];
          if(!ii || ii.mime !== 'image/jpeg' || ii.width < 900 || ii.width < ii.height * 1.15) continue;
          const md = ii.extmetadata || {}, txt = v => String((v && v.value) || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
          return { src: ii.thumburl || ii.url, pagina: ii.descriptionurl || 'https://commons.wikimedia.org/', autor: txt(md.Artist).slice(0, 60), lic: txt(md.LicenseShortName).slice(0, 24) };
        }
        return null;
      }catch(e){ return null; }
    })();
    FOTO.set(f.id, pr); return pr;
  }
  /* A REVELAÇÃO: cada frame sai do negativo uma vez por dia, devagar (9 s), como no banho do laboratório.
     Só começa quando a foto carregou e o frame tá na tela; depois fica revelado até o rolo do dia seguinte. */
  const DEV_K = 'corre-rolo-dev', DEV_MS = 9000;
  const reduzido = () => { try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } };
  const devLe = () => { try{ const v = JSON.parse(localStorage.getItem(DEV_K) || 'null'); return v && v.d === R.day ? new Set(v.ids) : new Set(); }catch(e){ return new Set(); } };
  const devGrava = id => { const s = devLe(); s.add(id); try{ localStorage.setItem(DEV_K, JSON.stringify({ d: R.day, ids: [...s] })); }catch(e){} };
  const revelado = id => reduzido() || devLe().has(id);
  /* box: quem segura a <img> (a tela da sala ou o .rp-pic do player). Devolve true se o frame vai (ou tá) revelando. */
  function banho(box, f, naTela, fim){
    const img = box && box.querySelector('img'); if(!img) return false;
    if(revelado(f.id)){ box.classList.remove('latente', 'banho'); const l = box.querySelector('.dev-luz'); if(l) l.remove(); return false; }
    box.classList.add('latente');
    if(!box.querySelector('.dev-luz')) box.insertAdjacentHTML('beforeend', '<span class="dev-luz" aria-hidden="true"><i>revelando</i></span>');
    if(!naTela || box.classList.contains('banho')) return true;
    const vai = () => {
      if(box.classList.contains('banho') || !box.isConnected) return;
      box.classList.add('banho');
      clearTimeout(box._dev);
      box._dev = setTimeout(() => { devGrava(f.id); box.classList.remove('latente', 'banho'); const l = box.querySelector('.dev-luz'); if(l) l.remove(); if(fim) fim(); }, DEV_MS + 150);
    };
    if(img.complete && img.naturalWidth) vai(); else img.addEventListener('load', vai, { once: true });
    return true;
  }
  async function revelar(f){
    if(KEY) return;
    const ft = await fotoDe(f), scr = C.$('r-screen');
    if(!ft || !scr || cur() !== f || scr.dataset.f !== f.id) return;
    scr.innerHTML = `<img class="foto" src="${esc(ft.src)}" alt="${esc(f.lugar)}, ${esc(f.pais)}" decoding="async"><div class="vig" aria-hidden="true"></div><div class="grain" aria-hidden="true"></div><div class="flick" aria-hidden="true"></div><p class="sub">${esc(f.legenda)}</p><a class="credito" href="${esc(ft.pagina)}" target="_blank" rel="noopener">Foto: ${esc(ft.autor || 'Wikimedia Commons')}${ft.lic ? ' · ' + esc(ft.lic) : ''} · Wikimedia Commons</a>`;
    if(banho(scr, f, true)) tick();
    prepara(f, ft);
    const nx = R.roll[(R.roll.indexOf(f) + 1) % R.roll.length]; if(nx) fotoDe(nx);
  }

  function today(){ const me = C.st.me; R.day = dayIdx(C.hojeBR()); R.roll = rollFor(R.day, temasDe(me), C.uid()); }
  const cur = () => R.avulso || R.roll[R.i];

  /* ---------- tela ---------- */
  function screenHTML(f){
    if(!f) return '<div class="neg"><p class="neg-t">Rolo vazio</p></div>';
    const sub = `<p class="sub">${esc(f.legenda)}</p>`;
    if(KEY) return `<iframe class="sv" src="${embedUrl(f)}" title="Street View: ${esc(f.lugar)}, ${esc(f.pais)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe><div class="vig" aria-hidden="true"></div><div class="grain" aria-hidden="true"></div><div class="flick" aria-hidden="true"></div>${sub}`;
    const pos = R.roll.indexOf(f);
    return `<div class="neg"><span class="neg-n mono">${pos >= 0 && !R.avulso ? `Frame ${String(pos + 1).padStart(2, '0')} de ${R.roll.length}` : 'Frame avulso'} · negativo</span><p class="neg-t">${esc(f.titulo)}</p><span class="neg-c mono">${esc(f.lugar)} · ${coord(f)}</span><a class="neg-go" href="${svUrl(f)}" target="_blank" rel="noopener">Revelar no Street View ${ico('ext')}</a></div><div class="grain" aria-hidden="true"></div>${sub}`;
  }
  function stripHTML(){
    return R.roll.map((f, i) => `<button type="button" class="fr" data-act="rolo-ir" data-i="${i}" aria-label="Frame ${i + 1}: ${esc(f.titulo)}"${!R.avulso && i === R.i ? ' aria-current="true"' : ''}><span class="n">${String(i + 1).padStart(2, '0')}</span><b>${esc(f.lugar)}</b><small>${esc(f.pais)}</small>${R.salvos.has(f.id) ? '<i class="sv-dot" title="Guardado"></i>' : ''}</button>`).join('');
  }
  function paint(){
    const f = cur(); if(!f) return;
    const scr = C.$('r-screen'); if(!scr) return;
    clearTimeout(scr._dev); scr.classList.remove('latente', 'banho');
    scr.innerHTML = screenHTML(f); scr.dataset.f = f.id; revelar(f);
    C.$('r-meta').textContent = `${f.lugar} · ${f.pais} · ${coord(f)}`;
    C.$('r-title').textContent = f.titulo;
    C.$('r-tags').innerHTML = f.t.map(t => `<span class="pill">${esc(temaN[t])}</span>`).join('') + (R.avulso ? '<span class="pill base">Fora do rolo de hoje</span>' : '');
    C.$('r-strip').innerHTML = stripHTML();
    const sv = C.$('r-save'); sv.setAttribute('aria-pressed', String(R.salvos.has(f.id))); sv.setAttribute('aria-label', R.salvos.has(f.id) ? 'Tirar dos guardados' : 'Guardar frame');
    C.$('r-open').href = svUrl(f);
    const pl = C.$('r-play'); pl.innerHTML = ico(R.play ? 'pause' : 'play'); pl.setAttribute('aria-label', R.play ? 'Pausar' : 'Passar sozinho');
    tick();
  }
  /* revelando, o frame fica até terminar o banho e mais um respiro */
  function tick(){ clearTimeout(R.t); const scr = C.$('r-screen'); if(R.play && !R.avulso && scr) R.t = setTimeout(() => { step(1); }, scr.classList.contains('latente') ? DEV_MS + 5000 : KEY ? 14000 : 10000); }
  function step(d){ R.avulso = null; R.i = (R.i + d + R.roll.length) % R.roll.length; paint(); }

  function archiveHTML(){
    const me = C.st.me, temas = temasDe(me), out = [];
    for(let k = 1; k <= 5; k++){
      const d = R.day - k, roll = rollFor(d, temas, C.uid());
      out.push(`<div class="roll"><div class="roll-h"><h3>${k === 1 ? 'Ontem' : dataLonga(d)}</h3>${rollNo(me) - k >= 1 ? `<span class="mono">Rolo nº ${rollNo(me) - k}</span>` : ''}</div><div class="frames mini">${roll.map(f => `<button type="button" class="fr" data-act="rolo-avulso" data-id="${f.id}"><b>${esc(f.titulo)}</b><small>${esc(f.lugar)}</small></button>`).join('')}</div></div>`);
    }
    return out.join('');
  }
  function salvosHTML(){
    const list = [...R.salvos].map(id => byId[id]).filter(Boolean);
    if(!list.length) return '<p class="note">Guarda um frame com o marcador e ele fica aqui, fora do rolo do dia.</p>';
    return `<div class="frames mini wrap-g">${list.map(f => `<button type="button" class="fr" data-act="rolo-avulso" data-id="${f.id}"><b>${esc(f.titulo)}</b><small>${esc(f.lugar)} · ${esc(f.pais)}</small></button>`).join('')}</div>`;
  }
  function chipsHTML(){
    const temas = temasDe(C.st.me);
    return `<button type="button" class="chip-f" data-act="rolo-tema" data-k="" aria-pressed="${!temas.length}">Tudo</button>` +
      D.temas.map(t => `<button type="button" class="chip-f" data-act="rolo-tema" data-k="${t.k}" aria-pressed="${temas.includes(t.k)}">${esc(t.n)} <small>${pool([t.k]).length}</small></button>`).join('');
  }

  C.views.rolo = async function(app){
    today(); R.i = 0; R.avulso = null;
    const me = C.st.me, temas = temasDe(me);
    app.innerHTML = C.header('rolo') + `<main class="wrap wide">
      <section class="sala" aria-label="Rolo 360">
        <header class="sala-top">
          <div class="mark"><h1>Rolo <span>360</span></h1><p class="mono">Filmes que ninguém filmou · 5 frames por dia</p></div>
          <div class="clock"><b class="base">Rolo nº ${rollNo(me)}</b><span class="mono">${dataLonga(R.day)} · ${temas.length ? temas.map(k => temaN[k]).join(', ') : 'todos os temas'}</span><div class="r-som" id="r-som"></div></div>
        </header>
        <div class="filtros" role="group" aria-label="Que referências entram no teu rolo">${chipsHTML()}</div>
        <div class="screen" id="r-screen"></div>
        <div class="bar">
          <div class="now"><span class="mono" id="r-meta"></span><h2 id="r-title"></h2><div class="tags" id="r-tags"></div></div>
          <div class="ctrl" role="group" aria-label="Projeção">
            <button type="button" data-act="rolo-step" data-d="-1" aria-label="Frame anterior">${ico('prev')}</button>
            <button type="button" id="r-play" data-act="rolo-play"></button>
            <button type="button" data-act="rolo-step" data-d="1" aria-label="Próximo frame">${ico('next')}</button>
            <button type="button" id="r-save" data-act="rolo-save" aria-pressed="false">${ico('save')}</button>
            <button type="button" data-act="rolo-dl" aria-label="Baixar este frame" title="Baixar">${ico('down')}</button>
            <button type="button" data-act="rolo-share" aria-label="Compartilhar este frame" title="Compartilhar">${ico('share')}</button>
            ${C.st.me ? `<button type="button" data-act="rolo-post" aria-label="Postar este frame no feed" title="Postar no feed">${ico('send')}</button>` : ''}
            <a id="r-open" class="cbtn" href="#" target="_blank" rel="noopener" aria-label="Abrir no Google Maps">${ico('ext')}</a>
          </div>
        </div>
        <div class="strip"><div class="frames" id="r-strip"></div><div class="edge-txt"><span>Corre · Rolo 360</span><span>${KEY ? 'Arrasta a tela pra olhar em volta' : 'Toque em revelar pra ver em 360'}</span></div></div>
        <section class="sala-sec"><div class="sec-h"><h2>Guardados</h2><span class="mono" id="r-nsalvos"></span></div><div id="r-salvos"></div></section>
        <section class="sala-sec"><div class="sec-h"><h2>Revelados</h2><span class="mono">Os rolos dos últimos dias, com os teus temas</span></div><div class="rolls">${archiveHTML()}</div></section>
        <section class="sala-sec"><div class="sec-h"><h2>Em revelação</h2><span class="mono">O próximo rolo revela à meia-noite de Brasília</span></div><div class="frames mini">${Array.from({ length: PER }, (_, i) => `<span class="fr unexposed"><span class="n">${String(i + 1).padStart(2, '0')}</span></span>`).join('')}</div></section>
        <footer class="sala-foot"><p class="note">Cada frame é um lugar de verdade no Google Street View: um carro, uma mochila ou um barco passou por ali com uma câmera e ninguém dirigiu a cena. A legenda inventa o filme. Usa como referência de enquadramento, cor, luz e clima pro teu conteúdo.</p><p class="note r-som-cred">Música: J. S. Bach (Prelúdio em Dó maior, BWV 846) e Johann Pachelbel (Cânone em Ré), obras em domínio público, tocadas ao vivo no teu aparelho. Nada é baixado.</p><p class="mono">Imagens © Google Street View</p></footer>
      </section>
    </main>`;
    paint();
    if(C.roloSom) C.roloSom.entra(C.$('r-som'));
    try{ const rows = await C.api.q('corre_rolo_salvos', { eq: { dono: C.uid() }, order: ['created_at', false] }); R.salvos = new Set(rows.map(r => r.frame_id)); }catch(e){}
    paintSalvos(); paint();
  };
  function paintSalvos(){ const el = C.$('r-salvos'); if(el){ el.innerHTML = salvosHTML(); C.$('r-nsalvos').textContent = R.salvos.size ? `${R.salvos.size} ${R.salvos.size === 1 ? 'frame' : 'frames'}` : ''; } }

  Object.assign(C.acts, {
    'rolo-step': el => step(Number(el.dataset.d)),
    'rolo-ir': el => { R.avulso = null; R.i = Number(el.dataset.i); paint(); },
    'rolo-avulso': el => { const f = byId[el.dataset.id]; if(!f) return; const i = R.roll.findIndex(x => x.id === f.id); if(i >= 0){ R.avulso = null; R.i = i; } else R.avulso = f; paint(); C.$('r-screen').scrollIntoView({ behavior: 'smooth', block: 'center' }); },
    'rolo-play': () => { R.play = !R.play; paint(); },
    'rolo-save': async () => {
      const f = cur(); if(!f) return;
      const had = R.salvos.has(f.id);
      try{
        if(had){ await C.api.del('corre_rolo_salvos', { frame_id: f.id }); R.salvos.delete(f.id); C.toast('Saiu dos guardados.'); }
        else { await C.api.ins('corre_rolo_salvos', { frame_id: f.id }); R.salvos.add(f.id); C.toast('Frame guardado.'); }
      }catch(e){ if(e && e.code === '23505'){ R.salvos.add(f.id); } else C.toast(C.errMsg(e)); }
      paint(); paintSalvos();
    },
    'rolo-tema': async el => {
      const k = el.dataset.k, me = C.st.me;
      let temas = temasDe(me);
      temas = !k ? [] : temas.includes(k) ? temas.filter(x => x !== k) : temas.concat(k);
      try{ await C.saveMe({ rolo_temas: temas }); }catch(e){ C.toast(C.errMsg(e)); return; }
      C.views.rolo(C.$('app'));
      C.toast(temas.length ? 'Rolo refeito com os teus temas.' : 'Rolo com todos os temas.');
    }
  });
  addEventListener('keydown', e => {
    if(!C.$('r-screen') || /input|textarea|select/i.test((e.target.tagName || '')) || !C.$('sheet').hidden) return;
    if(e.key === 'ArrowRight') step(1); if(e.key === 'ArrowLeft') step(-1);
  });
  addEventListener('hashchange', () => { clearTimeout(R.t); if(!/^#\/rolo(\/|$)/.test(location.hash) && C.roloSom) C.roloSom.sai(); });

  /* ---------- a tela do Rolo no feed: o rolo do dia passando sozinho, com película, legenda e crédito ---------- */
  const RP = { i: 0, t: 0, fotos: {}, ms: 5600 };
  const pad2 = n => String(n).padStart(2, '0');
  const credito = ft => ft ? `Foto: ${ft.autor || 'Wikimedia Commons'}${ft.lic ? ' · ' + ft.lic : ''} · Wikimedia Commons` : '';
  /* um frame com a película (barras pretas, letreiros e crédito); usado no player e nos posts do feed */
  function telaHTML(f, ft, n, tot, rolo){
    const img = ft ? `<img src="${esc(ft.src)}" alt="${esc(f.lugar)}, ${esc(f.pais)}" crossorigin="anonymous" decoding="async">` : `<span class="rp-neg"><b>${esc(f.titulo)}</b><small>negativo · revelando</small></span>`;
    return `<span class="rp-band top"><i>Rolo 360</i><i>Filmes que ninguém filmou</i></span>
      <span class="rp-pic">${img}</span>
      <span class="rp-band bot"><span><i>Rolo ${pad2(Math.max(1, Math.min(9999, parseInt(rolo, 10) || 1)))}</i><small>${tot ? `Frame ${n} de ${tot}` : 'Frame avulso'}</small></span><span class="r"><i>${esc(f.lugar)}, ${esc(f.pais)}</i><small>${coord(f)}</small><small>${esc(credito(ft))}</small></span></span>`;
  }
  function playerHTML(){
    today();
    const me = C.st.me, n = rollNo(me), fs = R.roll, i = RP.i % Math.max(1, fs.length), f = fs[i];
    if(!f) return '';
    const d = new Date(R.day * DAY + 12 * 36e5);
    return `<section class="rp" aria-label="ROLO 360, rolo do dia">
      <div class="rp-top"><span class="rp-name">${ico('film')} ROLO 360</span><span class="rp-acts"><button type="button" class="rp-dl" data-act="rp-dl" aria-label="Baixar este frame">${ico('down')}</button><button type="button" class="rp-dl" data-act="rp-share" aria-label="Compartilhar este frame">${ico('share')}</button><a class="rp-all" href="#/rolo">Ver todos ${ico('ext')}</a></span></div>
      <span class="rp-mono">Rolo ${pad2(n)} · ${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)} · filmes que ninguém filmou</span>
      <button type="button" class="rp-screen" data-act="rp-next" aria-label="Próximo frame">${fs.map((x, k) => `<span class="rp-f${k === i ? ' on' : ''}" data-k="${k}">${telaHTML(x, RP.fotos[x.id], k + 1, fs.length, n)}</span>`).join('')}</button>
      <div class="rp-prog" aria-hidden="true">${fs.map((x, k) => `<i class="${k < i ? 'done' : k === i ? 'run' : ''}"><b></b></i>`).join('')}</div>
      <div class="rp-cap" aria-live="polite"><span><b>${esc(f.lugar)}</b>, ${esc(f.pais)}</span><span class="rp-mono">Frame ${i + 1} de ${fs.length}</span></div>
      <div class="rp-legenda"><p>“${esc(f.legenda)}”</p>${C.st.me ? `<button type="button" class="btn sm" data-act="rp-post">${ico('send')} Postar no feed</button>` : ''}</div>
    </section>`;
  }
  function rpShow(k){
    const box = document.querySelector('.rp'); if(!box) return false;
    const fs = R.roll; if(!fs.length) return false;
    RP.i = ((k % fs.length) + fs.length) % fs.length;
    box.querySelectorAll('.rp-f').forEach(el => el.classList.toggle('on', +el.dataset.k === RP.i));
    const bars = box.querySelectorAll('.rp-prog i');
    bars.forEach((b, j) => { b.className = j < RP.i ? 'done' : ''; });
    if(bars[RP.i]){ void bars[RP.i].offsetWidth; bars[RP.i].className = 'run'; }
    const f = fs[RP.i];
    box.querySelector('.rp-cap').innerHTML = `<span><b>${esc(f.lugar)}</b>, ${esc(f.pais)}</span><span class="rp-mono">Frame ${RP.i + 1} de ${fs.length}</span>`;
    const lg = box.querySelector('.rp-legenda p'); if(lg) lg.textContent = `“${f.legenda}”`;
    if(RP.fotos[f.id]) prepara(f, RP.fotos[f.id]);
    revelaNoPlayer(RP.i);
    return true;
  }
  /* o frame da vez revela (se ainda não revelou hoje): a barra e o relógio esperam o banho acabar */
  function revelaNoPlayer(k){
    const box = document.querySelector('.rp'), f = R.roll[k]; if(!box || !f) return;
    const pic = box.querySelector(`.rp-f[data-k="${k}"] .rp-pic`);
    RP.dev = !!(pic && banho(pic, f, true));
    const bar = box.querySelectorAll('.rp-prog i')[k];
    if(bar){ const b = bar.querySelector('b'); if(b) b.style.animationDuration = (RP.dev ? DEV_MS + 3000 : RP.ms) + 'ms'; }
  }
  function rpTick(){
    clearTimeout(RP.t);
    let reduz = false; try{ reduz = matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){}
    if(reduz) return;
    RP.t = setTimeout(() => { if(!document.querySelector('.rp')) return; if(!document.hidden) rpShow(RP.i + 1); rpTick(); }, RP.dev ? DEV_MS + 3000 : RP.ms);
  }
  async function rpRevelar(){
    const n = rollNo(C.st.me);
    await Promise.all(R.roll.map(async (f, k) => {
      const ft = await fotoDe(f); if(!ft) return;
      RP.fotos[f.id] = ft;
      if(k === RP.i) prepara(f, ft);
      const el = document.querySelector(`.rp-f[data-k="${k}"]`); if(!el) return;
      el.innerHTML = telaHTML(f, ft, k + 1, R.roll.length, n);
      const pic = el.querySelector('.rp-pic');
      if(k === RP.i){
        /* a foto do frame da vez chegou agora: o banho começa e o relógio recomeça com o tempo da revelação */
        if(banho(pic, f, true)){ RP.dev = true; const bar = document.querySelectorAll('.rp-prog i')[k]; if(bar){ bar.className = ''; void bar.offsetWidth; bar.className = 'run'; const b = bar.querySelector('b'); if(b) b.style.animationDuration = (DEV_MS + 3000) + 'ms'; } rpTick(); }
      }else banho(pic, f, false);
    }));
  }
  /* o frame como JPG 1920x1080: película, legenda e crédito gravados (a licença livre da foto pede o crédito junto) */
  async function imagemDe(f, ft){
    const im = await new Promise((ok, fail) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = fail; i.src = ft.src; });
    const W = 1920, H = 1080, band = 120, c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'); x.fillStyle = '#0B0909'; x.fillRect(0, 0, W, H);
    const ph = H - band * 2, s = Math.max(W / im.width, ph / im.height), sw = W / s, sh = ph / s;
    x.filter = 'sepia(.28) saturate(.82) contrast(1.08) brightness(.94)';
    x.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, 0, band, W, ph); x.filter = 'none';
    /* a legenda do filme, como na tela */
    const leg = String(f.legenda || '').trim();
    if(leg){
      x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.font = '700 50px Archivo, "Helvetica Neue", Arial, sans-serif';
      const max = W - 240, ws = leg.split(/\s+/), linhas = []; let ln = '';
      ws.forEach(w => { const t = ln ? ln + ' ' + w : w; if(x.measureText(t).width > max && ln){ linhas.push(ln); ln = w; } else ln = t; }); if(ln) linhas.push(ln);
      const y0 = band + ph - 54 - (linhas.length - 1) * 62;
      linhas.slice(0, 3).forEach((t, k) => { x.lineWidth = 8; x.strokeStyle = 'rgba(0,0,0,.55)'; x.strokeText(t, W / 2, y0 + k * 62); x.fillStyle = '#fff'; x.fillText(t, W / 2, y0 + k * 62); });
    }
    const pos = R.roll.indexOf(f);
    x.textAlign = 'left'; x.fillStyle = 'rgba(255,255,255,.72)'; x.font = '500 22px "IBM Plex Mono", monospace'; x.textBaseline = 'middle';
    x.fillText('ROLO 360', 56, band / 2); x.textAlign = 'right'; x.fillText('FILMES QUE NINGUÉM FILMOU', W - 56, band / 2);
    x.textAlign = 'left'; x.fillStyle = '#fff'; x.font = '600 26px "IBM Plex Mono", monospace'; x.fillText(`ROLO ${pad2(rollNo(C.st.me))}`, 56, H - band / 2 - 14);
    x.fillStyle = 'rgba(255,255,255,.72)'; x.font = '500 20px "IBM Plex Mono", monospace'; x.fillText(pos >= 0 ? `FRAME ${pos + 1} DE ${R.roll.length}` : 'FRAME AVULSO', 56, H - band / 2 + 18);
    x.textAlign = 'right'; x.fillStyle = '#fff'; x.font = '600 26px "IBM Plex Mono", monospace'; x.fillText(`${f.lugar}, ${f.pais}`.toUpperCase(), W - 56, H - band / 2 - 22);
    x.fillStyle = 'rgba(255,255,255,.72)'; x.font = '500 18px "IBM Plex Mono", monospace'; x.fillText(coord(f).toUpperCase(), W - 56, H - band / 2 + 6); x.fillText(credito(ft).toUpperCase().slice(0, 110), W - 56, H - band / 2 + 30);
    const b = await new Promise(ok => c.toBlob(ok, 'image/jpeg', .92));
    return new File([b], `rolo360-${f.id.replace('_', '-')}-${C.norm(f.lugar).replace(/[^a-z0-9]+/g, '-')}.jpg`, { type: 'image/jpeg' });
  }
  /* a imagem fica pronta assim que o frame aparece: o celular só abre o compartilhar se for na hora do toque */
  const ARQ = {}, ARQP = {};
  function prepara(f, ft){
    if(!f || !ft || ARQ[f.id] || ARQP[f.id]) return;
    ARQP[f.id] = imagemDe(f, ft).then(file => { ARQ[f.id] = file; }).catch(() => {}).finally(() => { delete ARQP[f.id]; });
  }
  /* a foto do frame: a do player (se já revelou) ou a do Commons */
  async function fotoPronta(f){ return RP.fotos[f.id] || await fotoDe(f); }
  async function rpBaixar(f, ft){
    ft = ft || await fotoPronta(f);
    if(!ft){ C.toast('Esse frame não tem foto de licença livre pra baixar. Abre no Street View.'); return; }
    try{
      const file = await imagemDe(f, ft);
      const u = URL.createObjectURL(file), a = document.createElement('a'); a.href = u; a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
      C.toast('Frame baixado, com a legenda e o crédito da foto.');
    }catch(e){ window.open(ft.pagina, '_blank', 'noopener'); C.toast('Abri a foto original numa aba nova.'); }
  }
  /* compartilhar: no celular abre a folha do sistema (WhatsApp, Instagram, Stories…) com a imagem;
     no computador sem esse recurso, copia a legenda com o link */
  async function rpCompartilhar(f, ft){
    const texto = `“${f.legenda}” · ${f.lugar}, ${f.pais}. Rolo 360, no Corre.`, link = 'https://app.corresocial.com/#/rolo';
    const copia = () => C.copy(`${texto}\n${link}`, 'Legenda e link copiados. Cola onde quiser.');
    try{
      /* imagem já pronta: chama o compartilhar direto, sem esperar nada (senão o iPhone bloqueia) */
      const file = ARQ[f.id];
      if(file && navigator.canShare && navigator.canShare({ files: [file] })){ await navigator.share({ files: [file], title: 'Rolo 360', text: `${texto}\n${link}` }); return; }
      if(!file && navigator.canShare){
        ft = ft || await fotoPronta(f);
        if(ft){ prepara(f, ft); C.toast('Preparando a imagem… toca em compartilhar de novo.'); return; }
      }
      if(navigator.share){ await navigator.share({ title: 'Rolo 360', text: texto, url: link }); return; }
      copia();
    }catch(e){ if(e && e.name === 'AbortError') return; copia(); }
  }
  async function rpPostar(f, el){
    if(!f || !C.feed) return;
    if(el){ if(el.disabled) return; el.disabled = true; }
    try{
      const ft = await fotoPronta(f).catch(() => null);
      await C.feed.publicar({ tipo: 'rolo', texto: `“${f.legenda}”`, ref: Object.assign({ frame: f.id, rolo: rollNo(C.st.me) }, ft ? { src: ft.src, autor: ft.autor, lic: ft.lic, pagina: ft.pagina } : {}) });
      C.toast('Frame no feed.');
    }catch(e){ C.toast(C.errMsg(e, 'Não deu pra postar agora.')); }
    finally{ if(el) el.disabled = false; }
  }

  C.rolo = {
    /* monta a tela do Rolo no feed */
    player(el){ RP.i = 0; el.innerHTML = playerHTML(); if(!el.innerHTML) return; rpShow(0); rpTick(); rpRevelar(); },
    /* um frame postado no feed (a foto e o crédito vêm no próprio post) */
    frameHTML(ref){
      const f = byId[ref.frame]; if(!f) return '';
      const ft = ref.src ? { src: ref.src, autor: ref.autor || '', lic: ref.lic || '', pagina: ref.pagina || '' } : null;
      return `<div class="rp-screen solo" role="img" aria-label="Rolo 360: ${esc(f.lugar)}, ${esc(f.pais)}"><span class="rp-f on">${telaHTML(f, ft, 0, 0, parseInt(ref.rolo, 10) || 1)}</span></div><p class="rp-solo-cap"><b>${esc(f.titulo)}</b> · ${esc(f.lugar)}, ${esc(f.pais)}</p>`;
    }
  };
  Object.assign(C.acts, {
    'rp-next': () => { rpShow(RP.i + 1); rpTick(); },
    'rp-dl': () => { const f = R.roll[RP.i]; if(f) rpBaixar(f, RP.fotos[f.id]); },
    'rp-share': () => { const f = R.roll[RP.i]; if(f) rpCompartilhar(f, RP.fotos[f.id]); },
    'rp-post': el => rpPostar(R.roll[RP.i], el),
    /* a sala do Rolo: baixar, compartilhar e postar o frame que tá na tela */
    'rolo-dl': () => { const f = cur(); if(f) rpBaixar(f); },
    'rolo-share': () => { const f = cur(); if(f) rpCompartilhar(f); },
    'rolo-post': el => rpPostar(cur(), el)
  });
})();
