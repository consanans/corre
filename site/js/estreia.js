/* CORRE · A ESTREIA (v4.0)
   A segunda frente da 4.0: o Corre pronto pra gente de fora.
   - a vitrine antes do login: embaixo do cartão de entrar, o que tem no Corre, pra quem é e quanto custa (os preços
     vêm do grana.js, que é o mesmo da função de pagamento e dos Termos);
   - o Corre que se monta: quem acabou de criar o perfil ganha o menu começando pelo que o corre dele usa (pela
     categoria) e, se vende pra empresa, o Hórus ligado;
   - os primeiros passos no Início: foto, o que vende, WhatsApp, link na bio, primeiro post, vitrine, a cidade e chamar
     alguém. Some quando acaba (ou no "Esconder");
   - o convite que rende: quem entra pelo teu link (?de=nome) e cria o perfil ganha 0,50 de correal, e você também (até
     10 convites; delta-v400.sql). Correal não é dinheiro: paga a IA quando acaba o grátis do dia. */
(function(){
  'use strict';
  const C = window.Corre, { $, esc, ico, toast } = C, api = C.api, st = C.st;
  const conviteLink = h => `${location.origin}/?de=${encodeURIComponent(h)}`;
  const curtoConvite = h => `${location.host}/?de=${h}`;

  /* ---------- a vitrine antes do login ---------- */
  const OQUE = [
    ['link', 'Link na bio', 'Uma página pra bio do Insta: vitrine, orçamento, WhatsApp e Pix, com a cara da tua marca.'],
    ['magia', 'Studio', 'Programa o mês: a IA faz a arte e a legenda, e o post sai sozinho no Instagram.'],
    ['grana', 'Vendas e Grana', 'Do orçamento ao dinheiro na conta: manda com link, cobra no WhatsApp, vê o mês.'],
    ['eye', 'Hórus', 'Radar de clientes: acha empresa no mapa e monta a abordagem por você.'],
    ['houzi', 'Studio Houzi', 'Marca com conceito: nome, logo em vetor, cores, letra e o brandbook.'],
    ['tacha', 'Mural', 'Alguém precisando de quem faz o que você faz? O pedido cai aqui.'],
    ['verso', 'Correverso', 'Uma Londrina de pixel: tua casa em 3D, tarefa que rende correal, corrida, pesca e show na Concha.'],
    ['chat', 'A rede', 'Feed, stories, grupos e mensagens, só de quem tá no corre.']
  ];
  const QUEM = ['Tatuador', 'Barbeiro', 'Confeiteira', 'Social media', 'Fotógrafo', 'DJ', 'Designer', 'Hamburgueria', 'Eletricista', 'Personal', 'Costureira', 'Dev', 'Maquiadora', 'Produtor de evento', 'Professora', 'Motoboy', 'Diarista', 'MC'];
  function vitrineLogin(){
    const P = C.planos, r = v => C.money(v);
    const precos = P ? `<div class="es-precos">
        <div class="es-pc"><h3>De graça</h3><ul><li>Perfil, rede e mensagens</li><li>Link na bio</li><li>Mural e Correverso</li><li>Vendas e Grana</li><li>Studio com 1 rede social</li></ul></div>
        <div class="es-pc es-pc-pago"><h3>Quando precisar de mais</h3><ul>
          <li><span>Studio com 2 redes</span><b class="num">${r(P.preco('studio', 2))}</b></li><li><span>Studio com 3 redes</span><b class="num">${r(P.preco('studio', 3))}</b></li><li><span>Studio com 4 ou mais</span><b class="num">${r(P.preco('studio', 4))}</b></li>
          <li><span>Studio Houzi <small>30 dias de graça</small></span><b class="num">${r(P.preco('houzi'))}</b></li><li><span>Hórus <small>30 dias de graça</small></span><b class="num">${r(P.preco('horus'))}</b></li></ul>
          <p class="fine">Por mês, renova sozinho e cancela quando quiser. Desistiu em até 7 dias do primeiro pagamento, volta tudo. <a href="termos.html">Termos de uso</a></p></div>
      </div>` : '';
    return `<div class="estreia" id="o-que-tem">
      <section class="es-sec" aria-labelledby="es-t1"><h2 class="es-t" id="es-t1"><span class="hl">Tudo que o teu corre precisa</span></h2>
        <div class="es-grade">${OQUE.map(([i, t, d]) => `<article class="es-i"><span class="es-ic">${ico(i)}</span><h3>${esc(t)}</h3><p>${esc(d)}</p></article>`).join('')}</div></section>
      <section class="es-sec" aria-labelledby="es-t2"><h2 class="es-t" id="es-t2"><span class="hl">Pra quem vive do próprio corre</span></h2>
        <p class="es-quem">${QUEM.map(q => `<span>${esc(q)}</span>`).join('')}<span class="es-mais">e quem mais tiver um corre</span></p></section>
      ${precos ? `<section class="es-sec" aria-labelledby="es-t3"><h2 class="es-t" id="es-t3"><span class="hl">Quanto custa</span></h2>${precos}</section>` : ''}
      <section class="es-sec es-fim"><p>Feito em Londrina, pra quem faz o corre de qualquer lugar.</p><button type="button" class="btn pri" data-act="es-sobe">${ico('raio')} Entrar e montar o meu</button></section>
    </div>`;
  }

  /* ---------- o Corre que se monta pela categoria ---------- */
  /* por categoria do "Meu corre": o começo do menu (os Teus aprendem com o uso depois) */
  const MONTA = {
    social: ['studio', 'houzi', 'horus', 'linkbio', 'corre', 'marcas'], design: ['houzi', 'studio', 'linkbio', 'horus', 'corre', 'marcas'],
    site: ['horus', 'corre', 'linkbio', 'studio', 'marcas'], trafego: ['horus', 'studio', 'corre', 'linkbio', 'marcas'],
    foto_video: ['linkbio', 'studio', 'corre', 'horus', 'marcas'], musica: ['linkbio', 'studio', 'mural', 'corre', 'grupos'],
    eventos: ['linkbio', 'corre', 'mural', 'studio', 'grupos'], beleza: ['linkbio', 'corre', 'studio', 'mural', 'marcas'],
    tattoo: ['linkbio', 'studio', 'corre', 'mural', 'houzi'], moda: ['linkbio', 'studio', 'corre', 'houzi', 'marcas'],
    comida: ['linkbio', 'corre', 'studio', 'mural', 'marcas'], reforma: ['corre', 'mural', 'linkbio', 'horus'],
    tecnica: ['corre', 'mural', 'horus', 'linkbio'], aulas: ['linkbio', 'corre', 'mural', 'studio'], frete: ['corre', 'mural', 'linkbio'],
    juridico: ['horus', 'corre', 'linkbio', 'mural'], casa: ['corre', 'mural', 'linkbio'], outros: ['linkbio', 'studio', 'corre', 'mural']
  };
  /* quem caça cliente em empresa ganha o Hórus ligado (desliga no Perfil quando quiser) */
  const HORUS_SIM = ['social', 'design', 'site', 'trafego', 'foto_video', 'juridico'];
  async function monta(me){
    if(!me) return null;
    const L = MONTA[me.categoria] || MONTA.outros;
    /* o uso de mentira que põe esses na frente (o mesmo formato do menu esperto; 2,5 a 1,5: passa do 1,5 que ele pede) */
    try{
      const c = {}; L.forEach((k, i) => { c[k] = Math.round((2.5 - i * .2) * 100) / 100; });
      localStorage.setItem('corre-menu-uso', JSON.stringify({ u: me.id, c, dia: C.hojeBR(), ult: '', t: 0 }));
      localStorage.removeItem('corre-menu-teus');
    }catch(e){}
    let horus = false;
    if(HORUS_SIM.includes(me.categoria) && me.vende_pra !== 'pessoas' && !(me.ferramentas && me.ferramentas.horus === false)){
      try{ await C.saveMe({ ferramentas: Object.assign({}, me.ferramentas || {}, { horus: true }) }); horus = true; }catch(e){}
    }
    try{ localStorage.setItem('corre-estreia:' + me.id, JSON.stringify({ cat: me.categoria || 'outros', horus, em: Date.now() })); }catch(e){}
    return { L, horus };
  }

  /* o convite: quem acabou de criar o perfil pelo link de alguém */
  async function aceita(h){
    if(!h) return null;
    try{ const r = await api.rpc('corre_convite_aceita', { p_handle: h }); if(r && r.ok && C.correalCarrega) C.correalCarrega(); return r; }catch(e){ return null; }
  }

  /* ---------- os primeiros passos (no Início) ---------- */
  const NOME_K = { inicio: 'Início', studio: 'Studio', mural: 'Mural', msg: 'Mensagens', corre: 'Vendas e Grana', grupos: 'Grupos', horus: 'Hórus', houzi: 'Studio Houzi', marcas: 'Portfólio', banca: 'Banca', linkbio: 'Link na bio' };
  async function passos(el){
    const me = st.me; if(!el || !me) return;
    let x = null; try{ x = JSON.parse(localStorage.getItem('corre-passos-x:' + me.id) || 'null'); }catch(e){}
    if(x) { el.innerHTML = ''; return; }
    const [post, vit, conv] = await Promise.all([
      api.q('corre_feed', { eq: { dono: me.id }, limit: 1 }).then(r => (r || []).length > 0).catch(() => true),
      api.rpc('corre_vitrine', { p: me.id }).then(r => !!(r && r.itens && r.itens.length)).catch(() => true),
      api.rpc('corre_convites_meus', {}).then(r => r ? (r.n || 0) > 0 : null).catch(() => null)
    ]);
    if(!$('h-passos') || st.me !== me) return;
    const bio = me.bio_link && typeof me.bio_link === 'object' && Object.keys(me.bio_link).length > 0;
    const L = [
      ['foto', !!me.avatar_url, 'Põe tua foto', 'Gente confia em quem mostra a cara.', '#/editar'],
      ['faz', !!me.faz, 'Diz o que você vende', 'Numa frase. O Corre monta teu Hórus, teu Mural e tua vitrine por ela.', '#/editar'],
      ['whats', !!me.whats_publico, 'Põe o WhatsApp pra clientes', 'Vira o botão "Chamar no WhatsApp" do perfil e do link na bio.', '#/editar'],
      ['bio', bio, 'Monta teu link na bio', `Cola ${location.host}/@${me.handle} na bio do Instagram.`, '#/linkbio'],
      ['vit', vit, 'Põe um preço na vitrine', 'O que você vende, com preço, no perfil e no link na bio.', '#/marcas'],
      ['post', post, 'Faz o primeiro post', 'Mostra um trampo teu pra rede.', '', 'novo-post'],
      ['verso', !!me.verso, 'Entra no Correverso', 'Monta teu boneco e conhece a cidade. Tarefa feita rende correal.', '#/verso']
    ].concat(conv === null ? [] : [['conv', conv, 'Chama alguém pro Corre', 'Quem entrar pelo teu link ganha 0,50 de correal, e você também.', '', 'convite']]);
    const feitos = L.filter(p => p[1]).length;
    if(feitos === L.length){ el.innerHTML = ''; return; }
    let est = null; try{ est = JSON.parse(localStorage.getItem('corre-estreia:' + me.id) || 'null'); }catch(e){}
    const montado = est && Date.now() - est.em < 14 * 864e5 && C.meuCorre ? `<p class="ps-montou">${ico('magia')}<span>Teu Corre tá montado pra <b>${esc(C.meuCorre.catNome(est.cat) || 'o teu corre')}</b>: o menu começa por ${esc((MONTA[est.cat] || MONTA.outros).slice(0, 3).map(k => NOME_K[k] || k).join(', '))}${est.horus ? ', e o Hórus tá ligado pra caçar cliente' : ''}.</span></p>` : '';
    const prox = L.find(p => !p[1]);
    /* à vista, só os 3 próximos que faltam; o resto (e os feitos) no "ver tudo" */
    const vis = new Set(L.filter(p => !p[1]).slice(0, 3).map(p => p[0])), extras = L.length - vis.size;
    el.innerHTML = `<section class="card passos" aria-labelledby="ps-t">
      <div class="ps-h"><h2 class="ch" id="ps-t">Primeiros passos</h2><span class="ps-n num">${feitos} de ${L.length}</span><button type="button" class="lnk ps-x" data-act="ps-esconde">Esconder</button></div>
      <div class="ps-barra" role="progressbar" aria-valuemin="0" aria-valuemax="${L.length}" aria-valuenow="${feitos}" aria-label="Primeiros passos: ${feitos} de ${L.length}"><i style="width:${Math.round(100 * feitos / L.length)}%"></i></div>
      ${montado}
      <ol class="ps-l">${L.map(([k, ok, t, d, href, act]) => {
        const corpo = `<span class="ps-ck" aria-hidden="true">${ok ? ico('check') : ''}</span><span class="ps-tx"><b>${esc(t)}</b>${ok ? '' : `<small>${esc(d)}</small>`}</span>${ok ? '<span class="sr-only">(feito)</span>' : ico('next', 'ps-ir')}`;
        const cls = `ps-i${ok ? ' ok' : ''}${prox && prox[0] === k ? ' prox' : ''}`;
        return `<li${vis.has(k) ? '' : ' class="ps-extra"'}>${ok ? `<span class="${cls}">${corpo}</span>` : href ? `<a class="${cls}" href="${href}">${corpo}</a>` : `<button type="button" class="${cls}" data-act="${act}">${corpo}</button>`}</li>`;
      }).join('')}</ol>
      ${extras ? `<button type="button" class="lnk ps-tudo" data-act="ps-tudo" aria-expanded="false">Ver tudo (${L.length})</button>` : ''}
    </section>`;
  }

  /* ---------- a folha do convite ---------- */
  async function conviteSheet(){
    const me = st.me; if(!me) return;
    const url = conviteLink(me.handle), txt = `Tô no Corre, a rede de quem vive do próprio corre. Entra pelo meu link que você já ganha correal: ${url}`;
    C.sheet(`<div class="sheet-h"><h2>Chama a galera</h2><button type="button" class="x" data-close aria-label="Fechar">${ico('x')}</button></div>
      <div class="cv-sh">
        <p class="cv-regra">${ico('presente')}<span>Quem entrar pelo teu link e criar o perfil ganha <b>0,50 de correal</b>, e você ganha <b>0,50</b> também (até 10 convites). Correal é a moeda do Correverso: paga a IA quando acaba o grátis do dia. Não é dinheiro.</span></p>
        <div class="lb-url"><code>${esc(curtoConvite(me.handle))}</code><button type="button" class="btn sm pri" data-act="cv-copia">${ico('copy')} Copiar</button></div>
        <div class="acts"><a class="btn" href="https://wa.me/?text=${encodeURIComponent(txt)}" target="_blank" rel="noopener">${ico('wa')} Mandar no WhatsApp</a><button type="button" class="btn" data-act="cv-manda">${ico('share')} Mandar</button></div>
        <div class="cv-gente" id="cv-gente"><p class="fine">Vendo quem já entrou…</p></div>
      </div>`, 'cv-folha');
    let r = null; try{ r = await api.rpc('corre_convites_meus', {}); }catch(e){ r = null; }
    const el = $('cv-gente'); if(!el) return;
    if(!r){ el.innerHTML = '<p class="fine">A conta dos convites aparece aqui quando o Corre for atualizado.</p>'; return; }
    el.innerHTML = r.n ? `<h3>${r.n === 1 ? 'Entrou 1 pessoa' : `Entraram ${r.n} pessoas`} pelo teu link <small>(rendeu ${C.correalTxt ? C.correalTxt(r.ganho) : r.ganho})</small></h3>
      <ul>${(r.gente || []).map(p => `<li><a href="#/@${esc(p.handle)}" data-close>${C.avatar(p, 's')}<span><b>${esc(p.nome || '')}</b><small>@${esc(p.handle)}</small></span></a></li>`).join('')}</ul>
      ${r.n >= r.teto ? `<p class="fine">Já rendeu os ${r.teto} convites. Quem chegar segue ganhando as boas-vindas.</p>` : ''}`
      : '<p class="fine">Ninguém entrou pelo teu link ainda. Manda pra quem faz um corre.</p>';
  }

  Object.assign(C.acts, {
    convite: () => conviteSheet(),
    'cv-copia': () => C.copy(conviteLink(st.me.handle), 'Link do convite copiado.'),
    'cv-manda': async () => {
      const url = conviteLink(st.me.handle);
      if(navigator.share){ try{ await navigator.share({ title: 'Corre', text: 'Entra no Corre pelo meu link:', url }); return; }catch(e){ if(e && e.name === 'AbortError') return; } }
      C.copy(url, 'Link do convite copiado.');
    },
    'ps-tudo': el => { const c = el.closest('.passos'), on = !c.classList.contains('todos'); c.classList.toggle('todos', on); el.setAttribute('aria-expanded', String(on)); el.textContent = on ? 'Ver menos' : `Ver tudo (${c.querySelectorAll('.ps-l li').length})`; },
    'ps-esconde': () => { try{ localStorage.setItem('corre-passos-x:' + st.me.id, '1'); }catch(e){} const el = $('h-passos'); if(el) el.innerHTML = ''; toast('Escondi os primeiros passos. O link na bio e o convite seguem no menu.'); },
    'novo-post': el => { const f = C.acts['lado-postar']; if(f) return f(el); location.hash = '#/'; },
    'es-sobe': () => { const c = $('entrar'); if(c){ c.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' }); const g = $('btn-google'); if(g) setTimeout(() => g.focus({ preventScroll: true }), 400); } },
    'es-desce': () => { const v = $('o-que-tem'); if(v) v.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); }
  });
  C.estreia = { vitrineLogin, monta, aceita, passos, conviteSheet, MONTA };
})();
