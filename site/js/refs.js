/* CORRE · REFS: as referências de quem vende, pelo que a pessoa faz.
   - Datas que vendem: o calendário comercial do Brasil filtrado pela categoria do "Meu corre", com quando
     começar a divulgar e a mensagem pronta pros clientes (um por um, no WhatsApp de cada).
   - Tuas referências: perfil, link ou foto que você admira e POR QUÊ (preço, foto, embalagem…),
     com o preço que o mercado cobra ligado ao teu catálogo.
   - Preço de mercado: teu preço contra o que você anotou dos outros.
   A Banca e o Rolo 360 ficam na mesma aba (o menu de cima). Tudo privado (corre_refs). */
(function(){
  'use strict';
  const C = window.Corre, { esc, ico, money } = C;
  const R = { refs: [], at: 0, uid: '' };
  const PORQUE = ['Preço', 'Foto', 'Embalagem', 'Atendimento', 'Texto', 'Oferta', 'Identidade', 'Ideia de produto'];
  const DIA = 864e5;

  /* ---------------- o calendário ---------------- */
  function pascoa(y){ const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1; return new Date(y, mes - 1, dia, 12); }
  const nDom = (y, m, n, wd) => { const d = new Date(y, m - 1, 1, 12); while(d.getDay() !== wd) d.setDate(d.getDate() + 1); d.setDate(d.getDate() + 7 * (n - 1)); return d; };
  const fixo = (y, m, d) => new Date(y, m - 1, d, 12);
  const mais = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const TODOS = '*';
  /* [chave, nome, (ano) => data, categorias, dias de antecedência pra divulgar, pra quem] */
  const DATAS = [
    ['planejamento', 'Empresas planejando o ano', y => fixo(y, 1, 20), ['social', 'trafego', 'design', 'site', 'juridico', 'foto_video', 'aulas'], 20, 'empresas'],
    ['aulas', 'Volta às aulas', y => fixo(y, 2, 2), ['moda', 'aulas', 'design', 'frete', 'comida'], 21],
    ['carnaval', 'Carnaval', y => mais(pascoa(y), -47), ['beleza', 'moda', 'eventos', 'musica', 'comida', 'foto_video'], 21],
    /* toda sexta-feira 13 é flash day na tatuagem */
    ['sexta13', 'Sexta-feira 13', y => Array.from({ length: 12 }, (_, m) => fixo(y, m + 1, 13)).filter(d => d.getDay() === 5), ['tattoo'], 14],
    ['mulher', 'Dia da Mulher', y => fixo(y, 3, 8), ['beleza', 'moda', 'comida', 'foto_video', 'social', 'eventos'], 14],
    ['consumidor', 'Dia do Consumidor', y => fixo(y, 3, 15), [TODOS], 10],
    ['pascoa', 'Páscoa', y => pascoa(y), ['comida', 'eventos', 'social', 'design', 'moda'], 30],
    ['maes', 'Dia das Mães', y => nDom(y, 5, 2, 0), [TODOS], 30],
    ['namorados', 'Dia dos Namorados', y => fixo(y, 6, 12), ['comida', 'beleza', 'tattoo', 'moda', 'foto_video', 'eventos', 'musica', 'social'], 21],
    ['junina', 'Festa junina', y => fixo(y, 6, 24), ['comida', 'eventos', 'musica', 'moda'], 30],
    ['avos', 'Dia dos Avós', y => fixo(y, 7, 26), ['comida', 'foto_video', 'moda'], 10],
    ['pais', 'Dia dos Pais', y => nDom(y, 8, 2, 0), [TODOS], 21],
    ['cliente', 'Dia do Cliente', y => fixo(y, 9, 15), [TODOS], 10],
    ['criancas', 'Dia das Crianças', y => fixo(y, 10, 12), ['comida', 'eventos', 'moda', 'foto_video', 'aulas', 'musica'], 21],
    ['halloween', 'Halloween', y => fixo(y, 10, 31), ['comida', 'eventos', 'beleza', 'tattoo', 'moda'], 14],
    ['blackfriday', 'Black Friday', y => mais(nDom(y, 11, 4, 4), 1), [TODOS], 30],
    ['confra', 'Confraternização de fim de ano', y => fixo(y, 12, 12), ['comida', 'eventos', 'musica', 'foto_video', 'design', 'moda'], 45, 'empresas'],
    ['natal', 'Natal', y => fixo(y, 12, 25), [TODOS], 45],
    ['reveillon', 'Réveillon', y => fixo(y, 12, 31), ['eventos', 'musica', 'beleza', 'moda', 'comida', 'foto_video'], 30]
  ];
  /* por que cada data vende (o ângulo) + o que fazer no teu nicho (a ação) */
  const ANGULO = {
    planejamento: 'Empresa fecha fornecedor do ano agora.', aulas: 'Família reorganiza a rotina e o orçamento.', carnaval: 'Todo mundo quer estar pronto antes do feriado.',
    mulher: 'Homenagem e presente: empresa compra em quantidade.', consumidor: 'Data de desconto: um combo com preço fechado vende mais que baixar preço.',
    pascoa: 'Encomenda grande e com prazo: quem garante antes vende mais.', maes: 'A segunda data que mais vende no ano.', namorados: 'Presente pra dois: kit pronto vende sozinho.',
    junina: 'Arraiá de escola, empresa e condomínio.', avos: 'Presente afetivo, ticket menor, muita recompra.', pais: 'Presente e almoço de domingo.',
    cliente: 'Hora de agradecer quem já comprou e pedir indicação.', criancas: 'Festa de escola, presente e lembrancinha.', halloween: 'Tema forte pra foto e pra festa, infantil e adulta.',
    blackfriday: 'O cliente espera desconto: monta um combo em vez de baixar o preço de tudo.', confra: 'Empresa fecha a confraternização em novembro.',
    natal: 'A maior data do ano: agenda e estoque fecham cedo.', reveillon: 'Última festa do ano: todo mundo quer estar pronto.',
    sexta13: 'Dia de flash na tatuagem: desenho pronto, preço fechado e fila na porta.'
  };
  const ACAO = {
    comida: 'Abre a lista de encomendas e trava as datas.', beleza: 'Abre a agenda antes: quem marca primeiro garante horário.', moda: 'Peça ou kit com foto e preço no perfil antes do pico.',
    foto_video: 'Vende o ensaio com data marcada e sinal.', eventos: 'Fecha a agenda cedo e cobra sinal.', musica: 'Fecha as datas cedo; última hora paga mais.',
    social: 'Oferece a campanha pronta pros clientes: pauta, artes e calendário.', trafego: 'Separa a verba antes: quem anuncia cedo paga menos pelo clique.',
    design: 'Pacote de artes da data pros clientes (post, story, etiqueta, cartão).',
    tattoo: 'Solta os flashes da data e abre a agenda com sinal pra garantir horário.', site: 'Página da campanha pronta pra quem vende online.', aulas: 'Turma ou pacote especial da data.'
  };
  const ideia = (k, cat) => `${ANGULO[k] || ''} ${ACAO[cat] || 'Manda uma oferta pros teus clientes antes de todo mundo.'}`.trim();
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  /* as próximas datas que importam pra essa categoria */
  function proximas(cat, n){
    const hoje = new Date(C.hojeBR() + 'T12:00:00'), y = hoje.getFullYear(), out = [];
    [y, y + 1].forEach(ano => DATAS.forEach(([k, nome, f, cats, ant, pra]) => {
      if(!(cats.includes(TODOS) || (!cat && k !== 'sexta13') || cats.includes(cat))) return;
      [].concat(f(ano)).forEach(d => {
        const falta = Math.round((d - hoje) / DIA);
        if(falta < -1 || falta > 365) return;
        const abre = mais(d, -ant), jaAbriu = hoje >= abre;
        out.push({ k, nome, data: iso(d), falta, ant, abre: iso(abre), jaAbriu, pra: pra || '', ideia: ideia(k, cat) });
      });
    }));
    return out.sort((a, b) => a.falta - b.falta).slice(0, n || 6);
  }

  async function carregar(forca){
    if(!forca && R.uid === C.uid() && Date.now() - R.at < 30e3) return;
    R.refs = await C.api.q('corre_refs', { eq: { dono: C.uid() }, order: ['created_at', false], limit: 500 }).catch(() => []);
    R.uid = C.uid(); R.at = Date.now();
    if(C.catalogo) await C.catalogo.carregar(true).catch(() => null);
  }

  /* ---------------- a tela ---------------- */
  C.views.refs = async function(app){
    app.innerHTML = C.header('refs') + '<main class="wrap rf"><section class="card"><p>Abrindo as referências…</p></section></main>';
    await carregar(true);
    pinta();
  };
  function pinta(){
    const me = C.st.me || {}, cat = me.categoria || '', catN = C.meuCorre ? C.meuCorre.catNome(cat) : '';
    const ds = proximas(cat, 6);
    const app = C.$('app');
    app.innerHTML = C.header('refs') + `<main class="wrap rf">
      <div class="hello"><h1><span class="hl">Referências</span></h1><p>${cat ? `Do teu corre: <b>${esc(catN)}</b>.` : `Diz o que você vende em <a href="#/editar">Editar perfil</a> e as datas e a Banca se ajustam ao teu nicho.`} Mora na Banca do menu, com a Banca do dia e o Rolo 360.</p></div>
      <div class="sec-row"><h2 class="sec-t"><span class="hl">Datas que vendem</span></h2></div>
      <div class="rf-datas">${ds.map(dataHTML).join('')}</div>
      <div class="sec-row"><h2 class="sec-t"><span class="hl">Preço de mercado</span></h2></div>
      ${precoHTML()}
      <div class="sec-row"><h2 class="sec-t"><span class="hl">Tuas referências</span></h2><button type="button" class="btn sm pri" data-act="rf-nova">${ico('plus')} Referência</button></div>
      ${R.refs.length ? `<div class="rf-grid">${R.refs.map(refHTML).join('')}</div>` : `<section class="card rf-vazio"><p><b>Guarda aqui o que te inspira no teu nicho, e por quê.</b> Um perfil com foto que vende, uma embalagem, um texto de oferta, o preço que o concorrente cobra. Com preço, a referência entra no "Preço de mercado" do teu catálogo.</p><button type="button" class="btn" data-act="rf-nova">${ico('plus')} Primeira referência</button></section>`}
    </main>`;
  }
  function dataHTML(d){
    const quando = d.falta <= 0 ? 'é hoje' : d.falta === 1 ? 'amanhã' : `faltam ${d.falta} dias`;
    return `<article class="rf-data${d.jaAbriu ? ' agora' : ''}">
      <div class="rf-dt"><b class="num">${C.ddmm(d.data)}</b><span>${esc(quando)}</span></div>
      <div class="rf-dx"><h3>${esc(d.nome)}${d.pra === 'empresas' ? ' <small>B2B</small>' : ''}</h3>
        <p>${esc(d.ideia)}</p>
        <p class="fine">${d.jaAbriu ? '<b>É hora de divulgar.</b>' : `Começa a divulgar dia ${C.ddmm(d.abre)} (${d.ant} dias antes).`}</p>
        <div class="hz-row-acts"><button type="button" class="hz-btn${d.jaAbriu ? ' pri' : ''}" data-act="rf-avisar" data-k="${d.k}" data-n="${esc(d.nome)}" data-d="${d.data}">${ico('wa')} Avisar meus clientes</button>${d.pra === 'empresas' ? `<a class="hz-btn ghost" href="#/horus">${ico('eye')} Caçar empresas</a>` : ''}</div></div>
    </article>`;
  }
  function precoHTML(){
    const cat = (C.catalogo && C.catalogo.lista()) || [];
    if(!cat.length) return `<section class="card"><p class="note">Põe o que você vende no <a href="#/marcas">catálogo</a>. Aí, cada referência com preço mostra se você tá cobrando abaixo, na média ou acima do mercado.</p></section>`;
    const linhas = cat.map(p => ({ p, m: C.catalogo.mercado(p.id) }));
    const com = linhas.filter(x => x.m);
    return `<section class="card rf-preco">${com.length ? `<ul class="rf-pl">${com.map(({ p, m }) => {
        const pos = p.preco < m.min ? 'abaixo de todo mundo' : p.preco > m.max ? 'acima de todo mundo' : p.preco < m.med ? 'abaixo da média' : p.preco > m.med ? 'acima da média' : 'na média';
        return `<li><b>${esc(p.nome)}</b><span class="num">teu: ${money(p.preco)}${p.unidade ? '/' + esc(p.unidade) : ''}</span><span class="num">mercado: ${money(m.min)}${m.max > m.min ? '–' + money(m.max) : ''} <small>(${m.n})</small></span><span class="rf-pos${/abaixo/.test(pos) ? ' baixo' : ''}">${pos}</span></li>`; }).join('')}</ul>` : ''}
      ${linhas.some(x => !x.m) ? `<p class="note">${com.length ? 'Ainda sem preço de mercado' : 'Nenhum item com preço de mercado ainda'}: ${linhas.filter(x => !x.m).slice(0, 4).map(x => `<button type="button" class="linklike" data-act="rf-nova" data-p="${x.p.id}">${esc(x.p.nome)}</button>`).join(', ')}. Anota quanto os outros cobram.</p>` : ''}</section>`;
  }
  function refHTML(r){
    const p = r.produto_id && C.catalogo ? C.catalogo.lista().find(x => x.id === r.produto_id) : null;
    const host = r.url ? String(r.url).replace(/^https?:\/\/(www\.)?/, '').split('/')[0] : '';
    return `<article class="rf-ref">
      ${r.img_url ? `<img src="${esc(r.img_url)}" alt="" loading="lazy">` : `<span class="rf-ic">${ico(/instagram/.test(r.url) ? 'ig' : r.url ? 'ext' : 'marcador')}</span>`}
      <div class="rf-rt"><b>${esc(r.titulo)}</b>${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(host)}</a>` : ''}
        ${(r.tags || []).length ? `<span class="rf-tags">${r.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</span>` : ''}
        ${r.porque ? `<p>${esc(r.porque)}</p>` : ''}
        ${r.preco != null ? `<span class="rf-pr num">${money(r.preco)}${p ? ` · ${esc(p.nome)}` : ''}</span>` : ''}</div>
      <button type="button" class="cbtn plain rf-ed" data-act="rf-edit" data-id="${r.id}" aria-label="Editar ${esc(r.titulo)}">${ico('edit')}</button>
    </article>`;
  }

  /* ---------------- nova referência ---------------- */
  function refSheet(r, produtoId){
    const novo = !r; r = r || { titulo: '', url: '', img_url: '', porque: '', tags: [], preco: null, produto_id: produtoId || null };
    const cat = (C.catalogo && C.catalogo.lista()) || [], tags = new Set(r.tags || []);
    let img = r.img_url || '';
    C.sheet(`<form class="form rf-f" id="rf-f" novalidate><div class="sheet-head"><h2>${novo ? 'Nova referência' : 'Referência'}</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <div class="fld"><label for="rf-t">De quem ou do quê</label><input class="inp" id="rf-t" maxlength="120" value="${esc(r.titulo)}" placeholder="Doceria Fulana, @perfil, embalagem da marca X…"${novo ? ' autofocus' : ''}></div>
      <div class="fld"><label for="rf-u">Link ou @ do Instagram <small>(opcional)</small></label><input class="inp" id="rf-u" maxlength="500" value="${esc(r.url)}" placeholder="https://… ou @perfil"></div>
      <div class="fld"><span class="lbl-s">Foto <small>(print, foto da vitrine, da embalagem)</small></span><div class="rf-imgrow"><span id="rf-im">${img ? `<img src="${esc(img)}" alt="">` : ''}</span><button type="button" class="btn sm" id="rf-up">${ico('camera')} ${img ? 'Trocar' : 'Pôr foto'}</button></div></div>
      <div class="fld"><span class="lbl-s">Por quê</span><div class="hz-chips" role="group" aria-label="Por quê">${PORQUE.map(t => `<button type="button" class="hz-chip light" data-rf-tag="${esc(t)}" aria-pressed="${tags.has(t)}">${esc(t)}</button>`).join('')}</div>
        <textarea class="inp" id="rf-p" rows="2" maxlength="300" placeholder="O que eles fazem bem e você quer trazer pro teu corre">${esc(r.porque)}</textarea></div>
      <div class="row2"><div class="fld"><label for="rf-v">Preço que cobram (R$) <small>(opcional)</small></label><input class="inp num" id="rf-v" inputmode="decimal" value="${r.preco != null ? esc(C.catalogo ? C.catalogo.campo(r.preco) : r.preco) : ''}" placeholder="0,00"></div>
        <div class="fld"><label for="rf-pi">Comparar com</label><select class="inp" id="rf-pi"><option value="">Nada do meu catálogo</option>${cat.map(p => `<option value="${p.id}"${p.id === r.produto_id ? ' selected' : ''}>${esc(p.nome)}</option>`).join('')}</select></div></div>
      <div class="acts"><button type="submit" class="btn pri">${novo ? 'Guardar' : 'Salvar'}</button>${novo ? '' : `<button type="button" class="btn ghost" data-act="rf-del" data-id="${r.id}">${ico('trash')} Apagar</button>`}</div>
    </form>`);
    C.$('rf-f').addEventListener('click', e => { const b = e.target.closest('[data-rf-tag]'); if(!b) return; const t = b.dataset.rfTag; if(tags.has(t)) tags.delete(t); else tags.add(t); b.setAttribute('aria-pressed', String(tags.has(t))); });
    C.$('rf-up').addEventListener('click', async () => {
      const f = await C.pickFile('image/*'); if(!f) return; const b = C.$('rf-up'); b.disabled = true; b.textContent = 'Subindo…';
      try{ const blob = await C.shrink(f, 1000, .82); img = await C.api.upload(blob); C.$('rf-im').innerHTML = `<img src="${esc(img)}" alt="">`; }catch(e){ C.toast(C.errMsg(e, 'Não deu pra subir a foto.')); }
      finally{ b.disabled = false; b.innerHTML = `${ico('camera')} Trocar`; }
    });
    C.$('rf-f').addEventListener('submit', async e => {
      e.preventDefault();
      const titulo = C.$('rf-t').value.trim().slice(0, 120); let url = C.$('rf-u').value.trim();
      if(!titulo){ C.toast('Diz de quem ou do quê é.'); C.$('rf-t').focus(); return; }
      if(/^@[A-Za-z0-9_.]{1,30}$/.test(url)) url = 'https://www.instagram.com/' + url.slice(1) + '/';
      else if(url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
      const pv = C.$('rf-v').value.trim(), row = { titulo, url: url.slice(0, 500), img_url: img, porque: C.$('rf-p').value.trim().slice(0, 300), tags: [...tags].slice(0, 8),
        preco: pv ? (C.catalogo ? C.catalogo.parseReais(pv) : Number(pv)) : null, produto_id: C.$('rf-pi').value || null };
      try{ if(novo) await C.api.ins('corre_refs', row); else await C.api.upd('corre_refs', { id: r.id }, row); C.closeSheet(); await carregar(true); pinta(); C.toast(novo ? 'Guardada.' : 'Salva.'); }
      catch(err){ C.toast(C.errMsg(err)); }
    });
  }

  /* ---------------- avisar os clientes de uma data ---------------- */
  async function avisar(nome, data){
    let cls = [];
    try{ if(C.negocio){ await C.negocio.carregar(); cls = C.negocio.clientes().filter(c => c.whats); } }catch(e){}
    const me = C.st.me || {};
    const base = `Oi, {nome}! ${nome} tá chegando (${C.ddmm(data)}). ${me.faz ? `Tô separando ${String(me.faz).replace(/\.$/, '').toLowerCase()} pra data` : 'Tô preparando umas coisas pra data'} e quis te avisar antes de todo mundo. Quer que eu te mande as opções?`;
    C.sheet(`<div class="form rf-av"><div class="sheet-head"><h2>${esc(nome)}</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <div class="fld"><label for="rf-msg">A mensagem <small>({nome} vira o nome de cada um)</small></label><textarea class="inp" id="rf-msg" rows="4" maxlength="600">${esc(base)}</textarea></div>
      ${cls.length ? `<p class="note">${cls.length} ${cls.length === 1 ? 'cliente com WhatsApp' : 'clientes com WhatsApp'} (das tuas Vendas). Manda um por um: cada botão abre o WhatsApp da pessoa com a mensagem.</p>
        <ul class="rf-cls">${cls.slice(0, 60).map(c => `<li><span><b>${esc(c.nome)}</b><small>${c.n ? `${c.n} ${c.n === 1 ? 'compra' : 'compras'}` : 'orçamento'}${c.sumido ? ' · sumido' : ''}</small></span><a class="hz-btn" href="#" data-rf-wa="${esc(c.whats)}" data-rf-n="${esc(String(c.nome).split(' ')[0])}" target="_blank" rel="noopener">${ico('wa')} Mandar</a></li>`).join('')}</ul>`
        : `<p class="note">Teus clientes aparecem aqui quando você lança vendas e orçamentos em <a href="#/vendas">Vendas</a>. Por enquanto, copia a mensagem e manda pra tua lista.</p><button type="button" class="btn" data-act="rf-copia">${ico('copy')} Copiar mensagem</button>`}
    </div>`);
  }
  /* cada "Mandar" monta o link na hora, com o nome da pessoa na mensagem */
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-rf-wa]'); if(!a || !C.$('rf-msg')) return;
    const txt = C.$('rf-msg').value.replace(/\{nome\}/g, a.dataset.rfN);
    a.href = `https://wa.me/55${a.dataset.rfWa}?text=${encodeURIComponent(txt)}`; a.classList.add('feito');
  }, true);

  /* ---------------- início: a próxima data ---------------- */
  C.home.push({ k: 'datas', o: 2.5, async html(){
    const me = C.st.me || {}; const d = proximas(me.categoria || '', 2);
    if(!d.length) return '';
    return `<a class="hcard datas-mini" href="#/refs"><div class="hc-top"><span class="hc-name">${ico('cal')}Do teu nicho</span><span class="mono">${esc(me.categoria && C.meuCorre ? C.meuCorre.catNome(me.categoria) : 'pro teu corre')}</span></div>
      <ol class="mini-list">${d.map(x => `<li><b>${esc(x.nome)} · ${C.ddmm(x.data)}</b><small>${x.jaAbriu ? 'é hora de divulgar' : `divulga a partir de ${C.ddmm(x.abre)}`} · ${x.falta <= 0 ? 'hoje' : 'faltam ' + x.falta + ' dias'}</small></li>`).join('')}</ol>
      <span class="hc-go">Ver as datas ${ico('next')}</span></a>`;
  } });

  Object.assign(C.acts, {
    'rf-nova': el => refSheet(null, el && el.dataset && el.dataset.p),
    'rf-edit': el => { const r = R.refs.find(x => x.id === el.dataset.id); if(r) refSheet(r); },
    'rf-del': async el => { if(el.dataset.armed !== '1'){ el.dataset.armed = '1'; el.classList.add('armed'); el.textContent = 'Apagar mesmo?'; return; } try{ const r = R.refs.find(x => x.id === el.dataset.id); await C.api.del('corre_refs', { id: el.dataset.id }); if(r && r.img_url) C.api.unlink(r.img_url); C.closeSheet(); await carregar(true); pinta(); C.toast('Apagada.'); }catch(e){ C.toast(C.errMsg(e)); } },
    'rf-avisar': el => avisar(el.dataset.n, el.dataset.d),
    'rf-copia': () => C.copy(C.$('rf-msg').value.replace(/\{nome\}/g, '').replace(/Oi, !/, 'Oi!'), 'Mensagem copiada.')
  });
  C.refs = { proximas, DATAS };
})();
