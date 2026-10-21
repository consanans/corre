/* CORRE · MURAL
   Pedido fixado, corre conectado. Qualquer pessoa fixa o serviço que precisa (sem conta). Quem presta
   serviço no Corre manda proposta; quem pediu compara e escolhe. O WhatsApp de quem pediu só vai pra quem
   foi escolhido. A proposta já vira lead no Hórus de quem mandou.
   PERGUNTA (o chat aberto, na frente): "quem faz X em Y?" e a IA do Mural indica quem ligou "Aparecer no Mural".
   Rotas: #/mural · #/mural/novo · #/mural/p/CODIGO (público) · #/mural/k/CHAVE (secreto, de quem pediu) */
(function(){
  'use strict';
  const C = window.Corre, { esc, ico } = C;

  /* ---------------- o que o Mural entende ---------------- */
  const CATS = [
    ['social', 'Social media e conteúdo', /social ?media|conte[uú]do|reels?\b|instagram|tik ?tok|postage|posts?\b|feed\b|stories|influenc/i],
    ['design', 'Design e identidade', /design|logo|logotipo|identidade|branding|card[aá]pio (novo|design)|flyer|banner|embalage|ilustra|r[oó]tulo|etiqueta|arte pr/i],
    ['foto_video', 'Foto e vídeo', /foto|fot[oó]graf|ensaio|v[ií]deo|filmag|filma|drone|captaç|captac|edi[çc][aã]o de v|youtube/i],
    ['site', 'Site, app e sistema', /\bsite|landing|loja virtual|e-?commerce|\bapp\b|aplicativo|sistema|software|programa[çd]|wordpress|automa[çc]|planilha/i],
    ['trafego', 'Tráfego e marketing', /tr[aá]fego|an[uú]ncio|\bads\b|meta ads|google ads|marketing|campanha|\bseo\b|vender mais|leads?\b/i],
    ['musica', 'Música, áudio e DJ', /m[uú]sica|\bdj\b|banda|cantor|\bsom\b|[aá]udio|jingle|podcast|locu[çc]|beat|mixag|sax/i],
    ['eventos', 'Eventos e festas', /evento|festa|anivers[aá]rio|casamento|formatura|decora[çc]|cerimonial|recrea|ch[aá] de|bal[aã]o/i],
    ['reforma', 'Reforma e reparos', /reforma|pedreiro|pintor|pintura|el[eé]tric|eletricista|encanad|hidr[aá]ulic|gesso|marcen|azulej|telhad|\bobra|serralh|vazamento/i],
    ['tecnica', 'Assistência técnica', /conserto|consertar|manuten[çc]|assist[eê]ncia|ar[- ]condicionado|\bsplit\b|geladeira|m[aá]quina de lavar|celular|computador|notebook|impressora|c[aâ]mera de seguran|t[eé]cnico/i],
    ['aulas', 'Aulas e consultoria', /\baula|professor|curso\b|mentoria|consultoria|treinamento|refor[çc]o|ingl[eê]s|idioma|personal|viol[aã]o/i],
    ['beleza', 'Beleza e bem-estar', /cabel|barb|manicure|unha|maquia|est[eé]tica|massag|sobrancelha|depila|\bspa\b|noiva/i],
    ['tattoo', 'Tatuagem e piercing', /tatua|tattoo|piercing|fine ?line|blackwork|old ?school|\bflash\b|micropigment|dermopigment|tatuad/i],
    ['moda', 'Moda e costura', /costur|roupa|camiseta|uniforme|estampa|bordad|ajuste|\bmoda\b|silk|sublima/i],
    ['comida', 'Comida e buffet', /bolo|doce|salgad|marmita|buffet|coffee break|comida|churras|confeit|cozinh|\bchef\b|almo[çc]o/i],
    ['frete', 'Frete e transporte', /frete|mudan[çc]a|carreto|transporte|motoboy|entrega|log[ií]stic|motorista|guincho/i],
    ['juridico', 'Jurídico e contábil', /advog|jur[ií]dic|contrato|contab|contador|imposto|\bmei\b|cnpj|abrir empresa|nota fiscal|inventário/i],
    ['casa', 'Limpeza e casa', /limpeza|faxin|diarista|jardin|piscina|dedetiz|lavanderia|bab[aá]|cuidador|pet ?sitter|passeador|montagem de m[oó]ve/i],
    ['outros', 'Outros', null]
  ];
  const CAT = Object.fromEntries(CATS.map(([k, n]) => [k, n]));
  /* quantas palavras de cada categoria aparecem: "bolos e doces pra festa" é Comida (2), não Eventos (1) */
  /* a ocasião (festa, casamento) pesa metade: "DJ pra festa" é Música, "decoração de festa" é Eventos */
  const pontos = txt => { const t = String(txt || ''); return CATS.filter(c => c[2]).map(([k, , re], i) => ({ k, i, n: (t.match(new RegExp(re.source, 'gi')) || []).length * (k === 'eventos' ? 0.5 : 1) })).filter(x => x.n).sort((a, b) => b.n - a.n || a.i - b.i); };
  const catDe = txt => (pontos(txt)[0] || {}).k || '';
  const catsDe = txt => pontos(txt).map(x => x.k);
  /* v3.43 · quando a busca não acha ninguém: o Corre tá começando, e a pessoa precisa saber que o vazio é de agora, não pra sempre */
  const CRESCE = 'A gente tá no começo e crescendo todo dia: logo mais aparece quem faz o que você procura.';
  const CRESCE_MURAL = 'O Mural tá no começo e crescendo todo dia: logo mais aparece o que você procura.';
  const QUANDO = [['urgente', 'Urgente'], ['semana', 'Essa semana'], ['mes', 'Esse mês'], ['sem_pressa', 'Sem pressa']];
  const QN = Object.fromEntries(QUANDO);
  const VERBA = [['ate_300', 'Até R$ 300'], ['300_1000', 'R$ 300 a 1 mil'], ['1000_3000', 'R$ 1 a 3 mil'], ['3000_10000', 'R$ 3 a 10 mil'], ['mais_10000', 'Mais de R$ 10 mil'], ['combinar', 'A combinar']];
  const VN = Object.fromEntries(VERBA);
  const EXEMPLOS = ['Fotos pro cardápio do meu restaurante', 'Logo pra minha marca', 'Social media pro meu negócio', 'Conserto de ar-condicionado', 'DJ pra aniversário', 'Site pra minha empresa'];
  const PRAZOS = ['Hoje', 'Em 2 dias', 'Essa semana', 'A combinar'];
  const ST = { aberto: 'Aberto', fechado: 'Resolvido', expirado: 'Saiu do mural', lotado: 'Propostas completas' };

  /* ---------------- miúdos ---------------- */
  const Z = () => (C.horus && C.horus._) || null;
  const store = { get(k, f){ try{ const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? f : v; }catch(e){ return f; } }, set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} } };
  const UFS = () => (Z() && Z().UFS) || [['AC', 'Acre'], ['AL', 'Alagoas'], ['AP', 'Amapá'], ['AM', 'Amazonas'], ['BA', 'Bahia'], ['CE', 'Ceará'], ['DF', 'Distrito Federal'], ['ES', 'Espírito Santo'], ['GO', 'Goiás'], ['MA', 'Maranhão'], ['MT', 'Mato Grosso'], ['MS', 'Mato Grosso do Sul'], ['MG', 'Minas Gerais'], ['PA', 'Pará'], ['PB', 'Paraíba'], ['PR', 'Paraná'], ['PE', 'Pernambuco'], ['PI', 'Piauí'], ['RJ', 'Rio de Janeiro'], ['RN', 'Rio Grande do Norte'], ['RS', 'Rio Grande do Sul'], ['RO', 'Rondônia'], ['RR', 'Roraima'], ['SC', 'Santa Catarina'], ['SP', 'São Paulo'], ['SE', 'Sergipe'], ['TO', 'Tocantins']];
  const parseLugar = s => { if(Z()) return Z().parseLugar(s); const m = String(s || '').match(/^(.*?)\s*(?:,|-|\/)\s*([A-Za-z]{2})\s*$/); return m ? { cidade: m[1].trim(), uf: m[2].toUpperCase() } : { cidade: String(s || '').split(',')[0].trim(), uf: '' }; };
  const lugar = p => p.remoto && !p.cidade ? 'À distância' : [p.cidade, p.uf].filter(Boolean).join('/') + (p.remoto ? ' · ou à distância' : '');
  const digits = s => String(s || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  const waLink = (num, msg) => `https://wa.me/55${digits(num)}${msg ? '?text=' + encodeURIComponent(msg) : ''}`;
  const fmtTel = n => { const d = digits(n); return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : d; };
  const base = () => location.origin + location.pathname;
  const linkPub = cod => `${base()}#/mural/p/${cod}`;
  const linkDono = ch => `${base()}#/mural/k/${ch}`;
  const tom = cod => { let h = 0; for(const c of String(cod)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
  const primeiro = n => String(n || '').trim().split(/\s+/)[0] || '';
  const diasAte = iso => Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / 864e5));
  const me = () => C.st.me;
  const logado = () => !!(C.st.user && C.st.me);
  const pro = () => !!(me() && me().plano === 'pro');
  const LIM = () => pro() ? 60 : 3;

  /* pedidos que esta pessoa fixou neste aparelho (pra achar de novo sem conta) */
  const MEUS_K = 'corre-mural-meus';
  const lembra = p => { const l = store.get(MEUS_K, []).filter(x => x && x.chave !== p.chave); l.unshift({ chave: p.chave, codigo: p.codigo, titulo: p.titulo, t: Date.now() }); store.set(MEUS_K, l.slice(0, 12)); };
  const esquece = ch => store.set(MEUS_K, store.get(MEUS_K, []).filter(x => x && x.chave !== ch));
  const VISTAS_K = 'corre-mural-vistas';

  /* ---------------- o que o prestador pega ---------------- */
  function minhaPraca(){
    const m = me() || {}, p = parseLugar(m.cidade || '');
    if(p.cidade && p.uf) return p;
    const h = Z() && Z().cfg ? Z().cfg() : {};
    return { cidade: p.cidade || (h.cidade && h.cidade !== 'tua cidade' ? h.cidade : ''), uf: p.uf || h.uf || '' };
  }
  function prefs(){
    const h = (me() && me().horus) || {}, m = h.mural || {};
    return { cats: Array.isArray(m.cats) ? m.cats.filter(k => CAT[k]) : [], area: ['cidade', 'estado', 'brasil'].includes(m.area) ? m.area : 'cidade', feito: !!m.cats };
  }
  async function salvaPrefs(p){
    const h = Object.assign({}, (me() && me().horus) || {}, { mural: { cats: p.cats, area: p.area, mexeu: true } });
    await C.saveMe({ horus: h });
  }
  /* sugestão: o que o Hórus vende, a bio e o que a pessoa faz nas marcas do portfólio */
  async function sugestao(){
    const m = me() || {}, h = m.horus || {};
    let txt = [h.oferta, h.montado, m.bio].filter(Boolean).join(' · ');
    try{ const ps = await C.api.q('corre_portfolio', { eq: { dono: m.id }, limit: 40 }); txt += ' · ' + ps.map(x => [x.papel, x.segmento].join(' ')).join(' · '); }catch(e){}
    const out = catsDe(txt); return out.length ? out.slice(0, 5) : [];
  }

  /* calor do pedido pra quem presta serviço */
  function calor(p, pf){
    const pr = minhaPraca(); let s = 0; const r = [];
    if(pf && pf.cats.length && pf.cats.includes(p.categoria)){ s += 3; r.push('bate com teu corre'); }
    if(p.quando === 'urgente'){ s += 3; r.push('urgente'); }
    if(pr.cidade && C.norm(p.cidade) === C.norm(pr.cidade)){ s += 2; r.push('na tua cidade'); }
    if(['1000_3000', '3000_10000', 'mais_10000'].includes(p.verba)){ s += 2; r.push('verba boa'); }
    if(!p.propostas){ s += 2; r.push('ninguém mandou ainda'); } else if(p.propostas <= 2) s += 1;
    if(Date.now() - Date.parse(p.created_at) < 6 * 36e5){ s += 1; r.push('acabou de sair'); }
    return { s, r, quente: s >= 6 };
  }

  /* ---------------- estado ---------------- */
  const M = { tab: null, uf: '', cidade: '', cat: '', q: '', rows: null, minhas: null, meus: null, carregando: false, qcat: '', quf: '', qcid: '', qq: '',
    chat: [], cands: null, candsAt: 0, poll: 0, enviando: false, prefill: null };

  /* ---------------- peças ---------------- */
  const header = () => C.header('mural');
  function cardHTML(p, pf){
    const c = logado() && !p.meu ? calor(p, pf) : null, t = tom(p.codigo), rot = ((t % 5) - 2) * 0.6;
    const pct = Math.min(100, Math.round((p.propostas / Math.max(1, p.vagas)) * 100));
    return `<a class="mu-card mu-t${t % 4}" href="#/mural/p/${esc(p.codigo)}" style="--r:${rot}deg">
      <span class="mu-fita" aria-hidden="true"></span>
      <span class="mu-cat">${esc(CAT[p.categoria] || 'Outros')}</span>
      ${c && c.quente ? '<span class="mu-quente">quente</span>' : ''}
      <h3>${esc(p.titulo)}</h3>
      ${p.descricao ? `<p>${esc(String(p.descricao).slice(0, 150))}${String(p.descricao).length > 150 ? '…' : ''}</p>` : ''}
      <div class="mu-meta"><span>${ico('pin')}${esc(lugar(p))}</span>${p.quando === 'urgente' ? '<span class="mu-urg">Urgente</span>' : `<span>${esc(QN[p.quando] || '')}</span>`}${p.verba ? `<span class="mu-verba">${esc(VN[p.verba])}</span>` : ''}</div>
      <div class="mu-foot"><span class="mu-vagas" aria-hidden="true"><i style="width:${pct}%"></i></span><span>${p.propostas}/${p.vagas} propostas · ${esc(primeiro(p.nome))} · ${C.rel(p.created_at)}</span></div>
      ${p.ja ? '<span class="mu-selo">Proposta enviada</span>' : p.meu ? '<span class="mu-selo">Teu pedido</span>' : c && c.r.length ? `<span class="mu-why">${esc(c.r.slice(0, 2).join(' · '))}</span>` : ''}
    </a>`;
  }
  const chipsCat = (sel, act) => `<div class="mu-cats" role="group" aria-label="Categoria">${CATS.map(([k, n]) => `<button type="button" class="hz-chip" data-act="${act}" data-k="${k}" aria-pressed="${Array.isArray(sel) ? sel.includes(k) : sel === k}">${esc(n)}</button>`).join('')}</div>`;
  const ufOpts = sel => `<option value="">UF</option>${UFS().map(([k, n]) => `<option value="${k}"${k === sel ? ' selected' : ''} title="${esc(n)}">${k}</option>`).join('')}`;
  async function encheCidades(uf, listId){
    const dl = C.$(listId); if(!dl || !uf || !Z() || !Z().municipios) return;
    try{ const l = await Z().municipios(uf); if(C.$(listId)) C.$(listId).innerHTML = l.map(n => `<option value="${esc(n)}">`).join(''); }catch(e){}
  }

  /* ---------------- o mural ---------------- */
  async function viewMural(app){
    document.title = 'Mural · Corre';
    /* v3.69: abriu o Mural, o "novo" do menu zera (o que chegou antes daqui já foi visto) */
    store.set(VISITA_K, Date.now());
    /* entrou ou saiu: volta pra aba certa ("Pra você" pra quem tem perfil) */
    const quem = logado() ? C.st.user.id : '';
    if(!M.tab || M.quem !== quem){ M.quem = quem; M.tab = 'chat'; }
    const locais = store.get(MEUS_K, []);
    app.innerHTML = header() + `<main class="wrap mural">
      <section class="mu-hero${logado() ? ' logado' : ''}">
        <div class="mu-hero-t"><span class="mu-kicker">${ico('tacha')} Mural do Corre</span><h1>Pergunta quem faz.<br><span>O Mural responde.</span></h1>
          <p>Pergunta aberta, sem cadastro: "quem faz bolo de aniversário em Londrina?". A IA do Mural indica quem tá no Corre e faz isso. Não achou? Fixa um pedido e quem faz te manda proposta.</p></div>
        <a class="btn mu-fixar" href="#/mural/novo">${ico('tacha')} Fixar um pedido</a>
      </section>
      <div id="mu-alertas"></div>
      <div id="mu-meus">${locais.length ? meusLocaisHTML(locais) : ''}</div>
      <div class="mu-tabs" role="tablist" aria-label="Mural">${(logado() ? [['chat', 'Pergunta'], ['pra', 'Pra você'], ['tudo', 'Pedidos'], ['quem', 'Achar quem faz'], ['minhas', 'Minhas propostas']] : [['chat', 'Pergunta'], ['tudo', 'Pedidos'], ['quem', 'Achar quem faz']])
        .map(([k, n]) => `<button type="button" role="tab" data-act="mu-tab" data-k="${k}" aria-selected="${M.tab === k}">${n}</button>`).join('')}</div>
      <div id="mu-corpo"><div class="mu-wall"><p class="note">Abrindo o mural…</p></div></div>
    </main>`;
    pintaCorpo();
    if(logado()) alertas();
  }
  function meusLocaisHTML(l){
    return `<section class="card mu-meus-l"><div class="hz-h"><h2>Teus pedidos</h2><span>neste aparelho</span></div><ol class="mu-ml">${l.slice(0, 4).map(x => `<li><a href="#/mural/k/${esc(x.chave)}">${ico('tacha')}<b>${esc(x.titulo)}</b><span>ver propostas ${ico('next')}</span></a></li>`).join('')}</ol></section>`;
  }
  async function pintaCorpo(){
    const el = C.$('mu-corpo'); if(!el) return;
    clearInterval(M.poll); M.poll = 0;
    /* v3.55: cada pintura tem número; a resposta de uma busca velha ("lo") não pinta por cima da nova ("logo") */
    const seq = M.seq = (M.seq || 0) + 1;
    if(M.tab === 'chat') return pintaChat(el);
    if(M.tab === 'minhas') return pintaMinhas(el);
    if(M.tab === 'quem') return pintaQuem(el);
    const pf = logado() ? prefs() : null;
    if(M.tab === 'pra' && pf && !pf.feito){ return pintaSetup(el); }
    const pr = minhaPraca();
    const filtros = M.tab === 'tudo' ? `<div class="mu-filtros">
        <div class="mu-fl"><select class="inp sm" id="mu-uf" aria-label="Estado">${ufOpts(M.uf)}</select><input class="inp sm" id="mu-cid" list="mu-cid-l" placeholder="${M.uf ? 'Cidade' : 'Escolhe o estado'}" value="${esc(M.cidade)}" aria-label="Cidade" autocomplete="off"><datalist id="mu-cid-l"></datalist></div>
        <input class="inp sm mu-busca" id="mu-q" type="search" placeholder="Buscar: logo, DJ, conserto…" value="${esc(M.q)}" aria-label="Buscar no mural">
        ${chipsCat(M.cat, 'mu-cat')}</div>`
      : `<div class="mu-pra"><p>${pf.cats.length ? `Pedidos de <b>${esc(pf.cats.map(k => CAT[k]).join(', '))}</b>` : 'Todos os pedidos'} ${pf.area === 'brasil' ? 'do Brasil todo' : pf.area === 'estado' && pr.uf ? `no ${esc(pr.uf)}` : pr.cidade ? `em ${esc(pr.cidade)}` : ''}, mais os que aceitam à distância.</p><button type="button" class="hz-btn ghost sm" data-act="mu-setup">${ico('edit')} Ajustar</button></div>`;
    el.innerHTML = filtros + `<div class="mu-wall" id="mu-wall"><p class="note">Abrindo o mural…</p></div>`;
    if(M.tab === 'tudo' && M.uf) encheCidades(M.uf, 'mu-cid-l');
    let rows = [];
    try{
      if(M.tab === 'pra') rows = await C.api.rpc('corre_mural_lista', { p_uf: pf.area === 'brasil' ? '' : pr.uf, p_cidade: pf.area === 'cidade' ? pr.cidade : '', p_cats: pf.cats.length ? pf.cats : null, p_q: '', p_antes: null });
      else rows = await C.api.rpc('corre_mural_lista', { p_uf: M.uf, p_cidade: M.uf ? M.cidade : '', p_cats: M.cat ? [M.cat] : null, p_q: M.q, p_antes: null });
    }catch(e){ const w = C.$('mu-wall'); if(w && seq === M.seq) w.innerHTML = `<p class="note">${esc(C.errMsg(e, 'Não deu pra abrir o mural agora.'))}</p>`; return; }
    if(seq !== M.seq) return;
    rows = rows || [];
    const daqui = store.get(MEUS_K, []).map(x => x.codigo);
    if(M.tab === 'pra') rows = rows.filter(p => !daqui.includes(p.codigo));
    if(M.tab === 'pra') rows = rows.map(p => ({ p, c: calor(p, pf) })).sort((a, b) => (a.p.ja - b.p.ja) || (b.c.s - a.c.s) || String(b.p.created_at).localeCompare(String(a.p.created_at))).map(o => o.p);
    M.rows = rows;
    const w = C.$('mu-wall'); if(!w) return;
    w.innerHTML = rows.length ? rows.map(p => cardHTML(p, pf)).join('')
      : `<div class="mu-vazio"><p><b>${M.tab === 'pra' ? 'Nenhum pedido pro teu corre por aqui agora.' : 'Nada fixado com esse filtro.'}</b></p><p>${M.tab === 'pra' ? 'Abre "Tudo" pra ver o mural inteiro, ou amplia a área em Ajustar.' : `${CRESCE_MURAL} Tira um filtro ou fixa o teu pedido: quem faz, chega.`}</p><a class="btn" href="#/mural/novo">${ico('tacha')} Fixar um pedido</a></div>`;
  }
  /* ---------------- PERGUNTA: o chat aberto do Mural ---------------- */
  const CHAT_K = 'corre-mural-chat-meus', COLS = 'id,nome,cidade,uf,pergunta,resposta,indicados,categoria,pedido,created_at';
  const STOP = new Set('quem faz fazer algum alguem alguém tem pessoa preciso procuro queria gostaria indica indicacao indicação onde aqui cidade perto regiao região bom boa melhor barato preço preco valor pra para com sem uma umas uns dos das que qual quais'.split(' '));
  const normT = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  /* quem ligou "Aparecer no Mural" (com o que vende e a cidade): a lista pública que a IA usa */
  async function candidatos(){
    if(M.cands && Date.now() - M.candsAt < 60e3) return M.cands;
    try{ M.cands = (await C.api.rpc('corre_mural_candidatos', { lim: 300 })) || []; }catch(e){ M.cands = M.cands || []; }
    M.candsAt = Date.now(); return M.cands;
  }
  /* sem a IA no ar (ou no modo demonstração): o próprio Mural acha pela categoria, palavras e cidade */
  function respostaLocal(pergunta, cidade, uf, cands){
    const cat = catDe(pergunta), ws = normT(pergunta).split(/[^a-z0-9]+/).filter(w => w.length > 3 && !STOP.has(w)), cid = normT(cidade);
    const nota = c => {
      const t = normT([c.faz, c.bio, (c.itens || []).map(i => i.nome).join(' ')].join(' '));
      let s = 0, bate = 0;
      if(cat && c.categoria === cat){ s += 5; bate++; }
      ws.forEach(w => { if(t.includes(w)){ s += 2; bate++; } });
      if(cid && normT(c.cidade).startsWith(cid)) s += 2; else if(uf && new RegExp('[,/-]\\s*' + uf + '\\s*$', 'i').test(c.cidade || '')) s += 1;
      return bate ? s + Math.min(2, Number(c.escolhido) || 0) * 0.5 : 0;
    };
    const top = cands.map(c => ({ c, s: nota(c) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 3).map(x => x.c);
    const onde = cidade ? ` em ${cidade}` : '';
    return {
      resposta: top.length ? `Achei ${top.length === 1 ? 'uma pessoa' : top.length + ' pessoas'} no Corre pra isso${onde}. Dá uma olhada no perfil e no que cada um vende.` : `Ainda não achei ninguém no Corre pra isso${onde}.`,
      indicados: top.map(c => ({ handle: c.handle, motivo: String(c.faz || CAT[c.categoria] || '').slice(0, 110) })),
      pedido: !top.length, categoria: cat
    };
  }
  const meusChat = () => store.get(CHAT_K, []);
  function indHTML(x){
    const c = (M.cands || []).find(k => k.handle === x.handle);
    if(!c) return `<div class="mu-ind off"><span>@${esc(x.handle)} saiu do Mural.</span></div>`;
    const desde = (c.itens || []).map(i => Number(i.preco)).filter(v => v > 0);
    return `<div class="mu-ind">
      <a class="mu-ind-q" href="#/@${esc(c.handle)}">${C.avatar({ nome: c.nome, avatar_url: c.avatar_url }, 's')}<span><b>${esc(c.nome)}</b><small>${esc([CAT[c.categoria], String(c.cidade || '').replace(/\s*[,/-]\s*[A-Z]{2}\s*$/, '')].filter(Boolean).join(' · '))}${desde.length ? ` · a partir de ${C.money(Math.min(...desde))}` : ''}</small></span></a>
      ${x.motivo ? `<p>${esc(x.motivo)}</p>` : ''}
      <div class="mu-ind-a"><a class="hz-btn" href="#/@${esc(c.handle)}">Ver perfil</a>${c.orc ? `<a class="hz-btn pri" href="#/orcamento/${esc(c.handle)}">Pedir orçamento</a>` : ''}</div>
    </div>`;
  }
  function qaHTML(q, opt){
    opt = opt || {};
    const meu = meusChat().find(x => x.id === q.id), ind = Array.isArray(q.indicados) ? q.indicados : [];
    return `<article class="mu-qa${opt.local ? ' local' : ''}" id="qa-${esc(q.id || 'novo')}">
      <div class="mu-qa-p"><span class="av s">${esc(C.initials(q.nome || '?'))}</span><div class="mu-bolha eu"><span class="mu-qa-h"><b>${esc(q.nome || 'Alguém')}</b>${q.cidade ? ` · ${esc(q.cidade)}${q.uf ? '/' + esc(q.uf) : ''}` : ''} · ${q.created_at ? C.rel(q.created_at) : 'agora'}${meu ? ` <button type="button" class="linklike" data-act="mu-qa-apagar" data-id="${esc(q.id)}">apagar</button>` : ''}</span><p>${esc(q.pergunta)}</p></div></div>
      <div class="mu-qa-r"><span class="mu-ia-av" aria-hidden="true">${ico('tacha')}</span><div class="mu-bolha ia"><span class="mu-qa-h"><b>Mural</b>${opt.local ? ' · resposta rápida' : ''}</span>
        ${opt.pensando ? '<p class="mu-pensa"><i></i><i></i><i></i> procurando quem faz…</p>' : `<p>${esc(q.resposta || '')}</p>
        ${ind.length ? `<div class="mu-inds">${ind.map(indHTML).join('')}</div>` : `<p>${CRESCE} Enquanto isso, fixa um pedido: quem faz recebe e te manda proposta.</p>`}
        ${q.pedido ? `<button type="button" class="btn sm mu-qa-fixar" data-act="mu-qa-fixar" data-id="${esc(q.id || '')}">${ico('tacha')} Fixar isso como pedido</button>` : ''}`}
      </div></div>
    </article>`;
  }
  async function pintaChat(el){
    const m = me(), pr = minhaPraca(), conv = logado() && m && m.categoria && !m.no_mural && m.visibilidade === 'publico';
    el.innerHTML = `<section class="mu-chat">
      <form class="card mu-chat-f" id="mu-chat-f" novalidate>
        <label for="mu-pq" class="mu-chat-l">Pergunta pro Mural</label>
        <textarea class="inp" id="mu-pq" rows="2" maxlength="400" placeholder="Quem faz… em… ? Ex.: quem faz bolo de aniversário em Londrina?"></textarea>
        <div class="mu-chat-row">
          ${logado() ? '' : `<input class="inp sm" id="mu-pn" maxlength="40" autocomplete="given-name" placeholder="Teu primeiro nome" aria-label="Teu primeiro nome" value="${esc(store.get('corre-mural-nome', ''))}">`}
          <input class="inp sm" id="mu-pc" maxlength="60" list="mu-pc-l" placeholder="Cidade" aria-label="Cidade" value="${esc(store.get('corre-mural-cid', '') || pr.cidade || '')}"><datalist id="mu-pc-l"></datalist>
          <select class="inp sm" id="mu-pu" aria-label="Estado">${ufOpts(store.get('corre-mural-uf', '') || pr.uf || '')}</select>
          <input type="text" id="mu-psite" tabindex="-1" autocomplete="off" class="orc-mel" aria-hidden="true">
          <button type="submit" class="btn pri" id="mu-pok">${ico('send')} Perguntar</button>
        </div>
        <p class="fine">A pergunta e a resposta ficam abertas no Mural, com teu primeiro nome e cidade. Não põe telefone, e-mail nem endereço.</p>
      </form>
      ${conv ? `<div class="mu-conv"><p><b>Quer aparecer nas respostas?</b> Liga "Aparecer no Mural" e a IA te indica quando perguntarem por ${esc(CAT[m.categoria] || 'o que você faz')}.</p><button type="button" class="btn sm pri" data-act="mu-entrar-ia">Aparecer no Mural</button></div>` : ''}
      <div class="mu-chat-lista" id="mu-chat-l"><p class="note">Abrindo as perguntas…</p></div>
    </section>`;
    const uf = C.$('mu-pu').value; if(uf) encheCidades(uf, 'mu-pc-l');
    C.$('mu-pu').addEventListener('change', () => encheCidades(C.$('mu-pu').value, 'mu-pc-l'));
    C.$('mu-chat-f').addEventListener('submit', e => { e.preventDefault(); perguntar(); });
    C.$('mu-pq').addEventListener('keydown', e => { if(e.key === 'Enter' && (e.metaKey || e.ctrlKey)){ e.preventDefault(); perguntar(); } });
    await Promise.all([candidatos(), carregaChat()]);
    pintaLista();
    M.poll = setInterval(async () => {
      if(M.tab !== 'chat' || !C.$('mu-chat-l') || document.visibilityState !== 'visible'){ if(!C.$('mu-chat-l')){ clearInterval(M.poll); M.poll = 0; } return; }
      /* v3.55: com pergunta tua no forno, a lista não repinta (apagava o "procurando quem faz…" e a resposta sumia) */
      if(M.enviando) return;
      const antes = (M.chat[0] || {}).id; await carregaChat(); if((M.chat[0] || {}).id !== antes && !M.enviando){ await candidatos(); pintaLista(); }
    }, 25e3);
  }
  async function carregaChat(){ try{ M.chat = await C.api.q('corre_mural_chat', { select: COLS, order: ['created_at', false], limit: 30 }) || []; }catch(e){ M.chat = M.chat || []; } }
  function pintaLista(){
    const el = C.$('mu-chat-l'); if(!el) return;
    el.innerHTML = M.chat.length ? M.chat.map(q => qaHTML(q)).join('')
      : `<div class="mu-vazio"><p><b>Ninguém perguntou ainda.</b></p><p>Faz a primeira pergunta: quem tá no Corre e faz isso aparece na resposta.</p></div>`;
  }
  const ERRO_CHAT = { limite: 'Hoje já deu o limite de perguntas. Amanhã tem mais.', cheio: 'O Mural tá cheio de pergunta agora. Tenta de novo daqui a pouco.', moderacao: 'Essa pergunta não pode ir pro Mural.', contato: 'Tira telefone e e-mail da pergunta: o Mural é aberto.', pergunta: 'Escreve a pergunta com um pouco mais de detalhe.' };
  async function perguntar(){
    if(M.enviando) return;
    const v = id => String((C.$(id) || {}).value || '').trim();
    const pergunta = v('mu-pq').replace(/\s+/g, ' ');
    if(pergunta.length < 8){ C.toast('Escreve a pergunta: o que você precisa e onde.'); C.$('mu-pq').focus(); return; }
    if(/(\d[\s.-]?){8,}/.test(pergunta) || /\S+@\S+\.\S+/.test(pergunta)){ C.toast(ERRO_CHAT.contato); C.$('mu-pq').focus(); return; }
    if(v('mu-psite')) return;
    const nome = logado() ? primeiro(me() && me().nome) : v('mu-pn').split(' ')[0];
    if(!logado() && nome.length < 2){ C.toast('Coloca teu primeiro nome.'); C.$('mu-pn').focus(); return; }
    const cidade = v('mu-pc'), uf = C.$('mu-pu').value;
    store.set('corre-mural-cid', cidade); store.set('corre-mural-uf', uf); if(!logado()) store.set('corre-mural-nome', nome);
    M.enviando = true; const b = C.$('mu-pok'); b.disabled = true;
    const lista = C.$('mu-chat-l'), vazio = lista.querySelector('.mu-vazio'); if(vazio) vazio.remove();
    lista.insertAdjacentHTML('afterbegin', qaHTML({ id: 'novo', nome: nome || 'Você', cidade, uf, pergunta }, { pensando: true }));
    let q = null, local = false;
    try{
    try{
      q = await C.api.fn('mural', { pergunta, nome, cidade, uf, site: '' });
    }catch(e){
      if(ERRO_CHAT[e && e.code]){ const n = C.$('qa-novo'); if(n) n.remove(); C.toast(ERRO_CHAT[e.code], 4200); M.enviando = false; b.disabled = false; return; }
      /* a IA não tá no ar (ou é a demonstração): o Mural responde pela lista mesmo */
      const r = respostaLocal(pergunta, cidade, uf, await candidatos());
      q = Object.assign({ id: 'local-' + Date.now().toString(36), nome: nome || 'Você', cidade, uf, pergunta, created_at: new Date().toISOString() }, r);
      local = true;
      try{ const g = await C.api.ins('corre_mural_chat', { nome: q.nome, cidade, uf, pergunta, resposta: r.resposta, indicados: r.indicados, categoria: r.categoria || '', pedido: r.pedido }); if(g && g[0]){ q = Object.assign(q, g[0]); local = false; } }catch(err){ /* no ar de verdade, quem grava é a função */ }
    }
    if(q && q.id && q.chave){ store.set(CHAT_K, [{ id: q.id, chave: q.chave }].concat(meusChat()).slice(0, 30)); }
    else if(q && q.id && !local && !String(q.id).startsWith('local-')){ store.set(CHAT_K, [{ id: q.id, chave: '' }].concat(meusChat()).slice(0, 30)); }
    if(!local){ M.chat = [q].concat(M.chat.filter(x => x.id !== q.id)); }
    const n = C.$('qa-novo'), lq = C.$('mu-chat-l');
    if(n) n.outerHTML = qaHTML(q, { local }); else if(lq) lq.insertAdjacentHTML('afterbegin', qaHTML(q, { local }));
    const pq = C.$('mu-pq'); if(pq) pq.value = '';
    if(local) C.toast('Resposta rápida: a IA do Mural ainda tá sendo ligada. Essa pergunta só você vê.', 4200);
    }finally{
      /* mesmo se a pessoa trocou de aba no meio, o Mural volta a aceitar pergunta */
      M.enviando = false; if(b) b.disabled = false;
    }
  }

  /* achar quem faz: perfis na vitrine por categoria, cidade e busca (o outro lado do Mural) */
  async function pintaQuem(el){
    el.innerHTML = `<div class="mu-filtros">
        <div class="mu-fl"><select class="inp sm" id="mu-quf" aria-label="Estado">${ufOpts(M.quf)}</select><input class="inp sm" id="mu-qcid" list="mu-qcid-l" placeholder="${M.quf ? 'Cidade' : 'Escolhe o estado'}" value="${esc(M.qcid)}" aria-label="Cidade" autocomplete="off"><datalist id="mu-qcid-l"></datalist></div>
        <input class="inp sm mu-busca" id="mu-qq" type="search" placeholder="Buscar: bolo, fotógrafo, eletricista…" value="${esc(M.qq)}" aria-label="Buscar quem faz">
        ${chipsCat(M.qcat, 'mu-qcat')}</div>
      <div class="mu-pros" id="mu-pros"><p class="note">Procurando…</p></div>
      <p class="mu-cota">Não achou? <a href="#/mural/novo">Fixa o pedido</a> e quem faz chega até você.</p>`;
    if(M.quf) encheCidades(M.quf, 'mu-qcid-l');
    let l = []; const seq = M.seq;
    try{ l = await C.api.rpc('corre_quem_faz', { p_cat: M.qcat, p_uf: M.quf, p_cidade: M.quf ? M.qcid : '', p_q: M.qq }) || []; }catch(e){ const b = C.$('mu-pros'); if(b) b.innerHTML = `<p class="note">${esc(C.errMsg(e))}</p>`; return; }
    const b = C.$('mu-pros'); if(!b || seq !== M.seq) return;
    b.innerHTML = l.length ? l.map(proHTML).join('') : `<div class="mu-vazio"><p><b>Ainda não tem ninguém com esse filtro.</b></p><p>${CRESCE} Enquanto isso, tira um filtro ou fixa o teu pedido no Mural: quem faz recebe e manda proposta.</p><a class="btn" href="#/mural/novo">${ico('tacha')} Fixar um pedido</a></div>`;
  }
  function proHTML(f){
    const t = tom(f.handle);
    return `<article class="mu-pro mu-t${t % 4}">
      <div class="mu-pq">${C.avatar({ nome: f.nome, avatar_url: f.avatar_url }, 'm')}<div><b>${esc(f.nome)}</b><span>${esc(f.cidade || '')}</span></div></div>
      ${f.faz ? `<p class="mu-faz">${esc(f.faz)}</p>` : ''}
      <div class="mu-meta"><span>${esc(CAT[f.categoria] || '')}</span>${f.desde ? `<span class="mu-verba">a partir de ${C.money(f.desde)}</span>` : ''}${f.escolhido ? `<span>escolhido ${f.escolhido}x no Mural</span>` : ''}</div>
      <div class="hz-row-acts"><a class="hz-btn" href="#/@${esc(f.handle)}">Ver perfil${f.itens ? ` e o que vende (${f.itens})` : ''}</a>${f.orc ? `<a class="hz-btn pri" href="#/orcamento/${esc(f.handle)}">Pedir orçamento</a>` : ''}</div>
    </article>`;
  }
  async function pintaSetup(el, voltar){
    const pf = prefs(), pr = minhaPraca();
    const sug = pf.cats.length ? pf.cats : await sugestao();
    M.setup = { cats: sug.slice(), area: pf.area };
    el.innerHTML = `<section class="card mu-setup">
      <h2>O que você pega no Mural?</h2>
      <p class="note">Marca o que você faz. O Mural separa os pedidos que batem com teu corre e mostra primeiro os quentes: urgentes, na tua cidade, com verba e sem ninguém ainda.${sug.length && !pf.cats.length ? ' Já marquei pelo teu Hórus e pelo teu perfil.' : ''}</p>
      ${chipsCat(M.setup.cats, 'mu-sc')}
      <div class="fld"><span class="hz-lbl">Onde</span><div class="hz-chips" role="group" aria-label="Área">
        ${[['cidade', pr.cidade ? `Só ${pr.cidade}` : 'Minha cidade'], ['estado', pr.uf ? `Todo o ${pr.uf}` : 'Meu estado'], ['brasil', 'Brasil todo']].map(([k, t]) => `<button type="button" class="hz-chip" data-act="mu-sa" data-k="${k}" aria-pressed="${M.setup.area === k}">${esc(t)}</button>`).join('')}
      </div><p class="fine">Pedido que aceita à distância aparece sempre.${!pr.cidade ? ' Põe tua cidade no perfil (Editar perfil) pra filtrar por perto.' : ''}</p></div>
      <div class="acts"><button type="button" class="btn pri" data-act="mu-salva-setup">Ver meus pedidos</button>${voltar ? '<button type="button" class="btn" data-act="mu-tab" data-k="pra">Cancelar</button>' : ''}</div>
    </section>`;
  }
  async function pintaMinhas(el){
    el.innerHTML = '<div class="mu-wall"><p class="note">Abrindo tuas propostas…</p></div>';
    let l = []; try{ l = await C.api.rpc('corre_mural_minhas', {}); }catch(e){ el.innerHTML = `<p class="note">${esc(C.errMsg(e))}</p>`; return; }
    M.minhas = l || [];
    const vistas = store.get(VISTAS_K, []); store.set(VISTAS_K, Array.from(new Set(vistas.concat(M.minhas.filter(x => x.st === 'escolhida').map(x => x.id)))).slice(-200));
    const hoje = M.minhas.filter(x => Date.now() - Date.parse(x.created_at) < 864e5).length;
    el.innerHTML = `<p class="mu-cota">${pro() ? `Corre+: ${hoje} ${hoje === 1 ? 'proposta' : 'propostas'} hoje.` : `Grátis: ${Math.min(hoje, 3)} de 3 propostas hoje.`} Cada proposta já entra no teu Hórus como lead.</p>
      ${M.minhas.length ? `<ol class="mu-minhas">${M.minhas.map(minhaHTML).join('')}</ol>` : `<div class="mu-vazio"><p><b>Nenhuma proposta ainda.</b></p><p>Abre "Pra você", escolhe um pedido quente e manda a tua. Quem pediu vê teu perfil e teu portfólio.</p></div>`}`;
  }
  function minhaHTML(x){
    const p = x.pedido || {}, cli = x.cliente;
    const msg = cli ? `Oi, ${primeiro(cli.nome)}! Aqui é ${primeiro(me() && me().nome)}, do Corre. Você escolheu minha proposta pro "${p.titulo}" no Mural. Bora conversar?` : '';
    return `<li class="mu-minha st-${esc(x.st)}">
      <div class="mu-mh"><a href="#/mural/p/${esc(p.codigo)}"><b>${esc(p.titulo)}</b></a><span class="mu-st">${x.st === 'escolhida' ? 'Te escolheu' : x.st === 'recusada' ? 'Não foi dessa vez' : p.st === 'fechado' ? 'Pedido resolvido' : 'Aguardando'}</span></div>
      <p class="mu-mm">${esc(String(x.msg).slice(0, 140))}${x.valor ? ` · <b class="num">${C.money(x.valor)}</b>` : ''}</p>
      <p class="fine">${esc(lugar(p))} · ${esc(CAT[p.categoria] || '')} · enviada ${C.rel(x.created_at)}</p>
      ${cli ? `<div class="hz-row-acts"><a class="hz-btn pri" href="${esc(waLink(cli.whats, msg))}" target="_blank" rel="noopener">${ico('wa')} Chamar ${esc(primeiro(cli.nome))} no WhatsApp</a><span class="mu-tel num">${esc(fmtTel(cli.whats))}</span>${C.negocio ? `<button type="button" class="hz-btn" data-act="ng-novo" data-lead="${esc(x.lead || '')}" data-cli="${esc(cli.nome)}" data-wa="${esc(cli.whats)}">${ico('recibo')} Orçamento</button>` : ''}${x.lead ? `<a class="hz-btn ghost" href="#/horus">${ico('eye')} No Hórus</a>` : ''}</div>` : ''}
    </li>`;
  }
  async function alertas(){
    const el = C.$('mu-alertas'); if(!el) return;
    let l = []; try{ l = await C.api.rpc('corre_mural_minhas', {}); }catch(e){ return; }
    const vistas = store.get(VISTAS_K, []), novas = (l || []).filter(x => x.st === 'escolhida' && !vistas.includes(x.id));
    if(!novas.length || !C.$('mu-alertas')) return;
    C.$('mu-alertas').innerHTML = `<button type="button" class="mu-alerta" data-act="mu-tab" data-k="minhas">${ico('star')}<span><b>${novas.length === 1 ? `${esc(primeiro(novas[0].cliente && novas[0].cliente.nome))} escolheu tua proposta!` : `${novas.length} pessoas escolheram tuas propostas!`}</b> O WhatsApp chegou. Chama agora, enquanto tá quente.</span>${ico('next')}</button>`;
  }

  /* ---------------- fixar ---------------- */
  function viewNovo(app){
    document.title = 'Fixar um pedido · Mural · Corre';
    const m = me(), pr = m ? parseLugar(m.cidade || '') : { cidade: '', uf: '' };
    const F = M.novo = { cat: '', catAuto: true, quando: 'semana', verba: '', aberto: Date.now() };
    app.innerHTML = header() + `<main class="wrap mural mu-novo"><section class="card mu-form-card">
      <a class="mu-back" href="#/mural">${ico('prev')} Mural</a>
      <span class="mu-kicker">${ico('tacha')} Fixar no Mural</span><h1>O que você precisa?</h1>
      <form class="form" id="mu-f" novalidate autocomplete="on">
        <div class="fld"><label for="mu-t">Em uma linha</label><input class="inp" id="mu-t" maxlength="90" required placeholder="Ex.: fotos pro cardápio da minha hamburgueria"></div>
        <div class="mu-ex" aria-label="Exemplos">${EXEMPLOS.map(e => `<button type="button" class="chip" data-act="mu-ex">${esc(e)}</button>`).join('')}</div>
        <div class="fld"><span class="hz-lbl" id="mu-cat-l">Categoria <small id="mu-cat-auto"></small></span><div id="mu-cat-box">${chipsCat(F.cat, 'mu-fc')}</div></div>
        <div class="fld"><label for="mu-d">Conta mais <small>(quanto mais claro, melhor a proposta)</small></label><textarea class="inp" id="mu-d" rows="4" maxlength="1200" placeholder="O que é, quantidade, onde vai ser, o que não pode faltar."></textarea></div>
        <div class="fld"><span class="hz-lbl">Pra quando</span><div class="hz-chips" role="group" aria-label="Pra quando">${QUANDO.map(([k, n]) => `<button type="button" class="hz-chip" data-act="mu-fq" data-k="${k}" aria-pressed="${F.quando === k}">${esc(n)}</button>`).join('')}</div></div>
        <div class="fld"><span class="hz-lbl">Quanto quer investir</span><div class="hz-chips" role="group" aria-label="Verba">${VERBA.map(([k, n]) => `<button type="button" class="hz-chip" data-act="mu-fv" data-k="${k}" aria-pressed="false">${esc(n)}</button>`).join('')}<button type="button" class="hz-chip" data-act="mu-fv" data-k="" aria-pressed="true">Ainda não sei</button></div></div>
        <div class="row2"><div class="fld"><label for="mu-c">Cidade</label><div class="seguir-row"><input class="inp" id="mu-c" maxlength="60" list="mu-c-l" autocomplete="address-level2" value="${esc(pr.cidade || '')}"><datalist id="mu-c-l"></datalist><select class="inp sm" id="mu-u" aria-label="Estado">${ufOpts(pr.uf || '')}</select></div></div>
          <div class="fld mu-remoto"><label class="mu-check"><input type="checkbox" id="mu-r"> Pode ser feito à distância</label><p class="fine">Aí aparece pra gente do Brasil todo.</p></div></div>
        <div class="row2"><div class="fld"><label for="mu-n">Teu nome</label><input class="inp" id="mu-n" maxlength="80" autocomplete="name" value="${esc(m ? m.nome : '')}" required></div>
          <div class="fld"><label for="mu-w">WhatsApp</label><input class="inp" id="mu-w" inputmode="tel" autocomplete="tel" placeholder="(DDD) 9 9999-9999" value="${esc(store.get('corre-meu-whats', ''))}" required></div></div>
        <input type="text" id="mu-site" name="website" tabindex="-1" autocomplete="off" class="orc-mel" aria-hidden="true">
        <div class="mu-forca" id="mu-forca" aria-live="polite"></div>
        <div class="acts"><button type="submit" class="btn pri" id="mu-ok">${ico('tacha')} Fixar no Mural</button></div>
        <p class="fine">Teu WhatsApp não aparece no Mural: só vai pra quem você escolher. No mural aparece só teu primeiro nome. O pedido sai sozinho em 15 dias.</p>
      </form></section></main>`;
    if(pr.uf) encheCidades(pr.uf, 'mu-c-l');
    /* veio de uma pergunta do Mural: o pedido já começa preenchido */
    if(M.prefill){ const pf = M.prefill; M.prefill = null; C.$('mu-t').value = pf.pergunta.slice(0, 90); C.$('mu-d').value = pf.pergunta; if(pf.cidade) C.$('mu-c').value = pf.cidade; C.$('mu-t').dispatchEvent(new Event('input', { bubbles: true })); autoCat(); }
    forca();
    C.$('mu-f').addEventListener('submit', e => { e.preventDefault(); fixar(); });
  }
  function forca(){
    const el = C.$('mu-forca'), F = M.novo; if(!el || !F) return;
    const t = (C.$('mu-t').value || '').trim(), d = (C.$('mu-d').value || '').trim(), cid = (C.$('mu-c').value || '').trim() || C.$('mu-r').checked;
    const itens = [[t.length >= 12, 'o que é'], [d.length >= 40, 'detalhes'], [!!F.verba, 'verba'], [!!cid, 'onde'], [!!(F.cat && F.cat !== 'outros'), 'categoria']];
    const n = itens.filter(x => x[0]).length, falta = itens.filter(x => !x[0]).map(x => x[1]);
    const dica = !t ? 'Começa pelo que você precisa, em uma linha.' : d.length < 40 ? 'Conta mais: quantidade, onde e o que não pode faltar. Proposta vem mais certeira.' : !F.verba ? 'Diz quanto quer investir (mesmo uma faixa). Quem faz manda o valor certo de primeira.' : !cid ? 'Diz a cidade, ou marca que pode ser à distância.' : 'Tem tudo que quem faz precisa saber.';
    el.innerHTML = `<span class="mu-fb" aria-hidden="true">${itens.map(x => `<i class="${x[0] ? 'on' : ''}"></i>`).join('')}</span><span><b>${n >= 5 ? 'Pedido forte' : n >= 3 ? 'Tá ficando bom' : 'Pedido fraco'}</b> · ${esc(dica)}</span>`;
    el.dataset.falta = falta.join(',');
  }
  function autoCat(){
    const F = M.novo; if(!F || !F.catAuto) return;
    const k = catDe(C.$('mu-t').value) || catDe(C.$('mu-d').value);
    if(k && k !== F.cat){ F.cat = k; C.$('mu-cat-box').innerHTML = chipsCat(F.cat, 'mu-fc'); C.$('mu-cat-auto').textContent = '· o Corre entendeu: ' + CAT[k]; }
  }
  async function fixar(){
    const F = M.novo, v = id => String(C.$(id).value || '').trim();
    /* só a armadilha de robô (campo escondido) finge sucesso; gente rápida de verdade espera o resto dos 3 segundos e o pedido entra */
    if(v('mu-site')) return feito(null);
    const pressa = 3000 - (Date.now() - F.aberto);
    if(pressa > 0){ const b0 = C.$('mu-ok'); if(b0){ if(b0.disabled) return; b0.disabled = true; b0.textContent = 'Fixando…'; } await new Promise(r => setTimeout(r, pressa)); if(b0) b0.disabled = false; if(!C.$('mu-ok')) return; }
    const w = digits(v('mu-w'));
    if(v('mu-t').length < 6){ C.toast('Diz em uma linha o que você precisa.'); C.$('mu-t').focus(); return; }
    if(!v('mu-c') && !C.$('mu-r').checked){ C.toast('Diz a cidade, ou marca que pode ser à distância.'); C.$('mu-c').focus(); return; }
    if(v('mu-n').length < 2){ C.toast('Coloca teu nome.'); C.$('mu-n').focus(); return; }
    if(w.length < 10 || w.length > 11){ C.toast('Coloca o WhatsApp com DDD.'); C.$('mu-w').focus(); return; }
    const b = C.$('mu-ok'); b.disabled = true; b.textContent = 'Fixando…';
    const cat = F.cat || catDe(v('mu-t')) || catDe(v('mu-d')) || 'outros';
    try{
      const r = await C.api.rpc('corre_mural_fixar', { nome: v('mu-n'), whats: w, categoria: cat, titulo: v('mu-t'), descricao: v('mu-d'), cidade: v('mu-c'), uf: C.$('mu-u').value, remoto: C.$('mu-r').checked, quando: F.quando, verba: F.verba });
      store.set('corre-meu-whats', w);
      lembra({ chave: r.chave, codigo: r.codigo, titulo: v('mu-t') });
      feito(r, v('mu-n'), w, v('mu-t'));
    }catch(err){
      const h = (err && (err.hint || err.message)) || '';
      C.toast(/conexao/.test(h) ? 'Muito pedido saindo dessa internet agora. Tenta de novo mais tarde.' : /limite/.test(h) ? 'Esse WhatsApp já tem 3 pedidos abertos. Resolve um antes.' : /cheio/.test(h) ? 'O mural tá lotado agora. Tenta daqui a pouco.' : /cidade/.test(h) ? 'Diz a cidade, ou marca que pode ser à distância.' : C.errMsg(err, 'Não deu pra fixar agora. Tenta de novo.'), 4200);
      b.disabled = false; b.innerHTML = `${ico('tacha')} Fixar no Mural`;
    }
  }
  function feito(r, nome, w, titulo){
    const app = C.$('app');
    if(!r){ app.innerHTML = header() + `<main class="wrap mural mu-novo"><section class="card mu-form-card"><h1>Pedido fixado.</h1><p class="note">As propostas chegam pelo link que você recebeu.</p></section></main>`; return; }
    const ld = linkDono(r.chave), lp = linkPub(r.codigo);
    const autoMsg = `Meu pedido no Mural do Corre: "${titulo}". Pra ver e escolher as propostas: ${ld}`;
    app.innerHTML = header() + `<main class="wrap mural mu-novo"><section class="card mu-form-card mu-feito">
      <span class="mu-kicker">${ico('tacha')} Fixado · código ${esc(r.codigo)}</span>
      <h1>Pronto, ${esc(primeiro(nome))}. Teu pedido tá no Mural.</h1>
      <p>Quem presta esse serviço no Corre já pode mandar proposta. Você vê cada uma com o perfil e o portfólio de quem mandou, e escolhe com quem falar.</p>
      <div class="mu-guarda"><b>Guarda este link.</b> É por ele que você vê e escolhe as propostas${logado() ? ' (também fica no Mural, em "Teus pedidos")' : ''}.<code>${esc(ld.replace(/^https?:\/\//, ''))}</code></div>
      <div class="hz-row-acts">
        <a class="hz-btn pri" href="#/mural/k/${esc(r.chave)}">${ico('next')} Ver as propostas</a>
        <a class="hz-btn" href="${esc(waLink(w, autoMsg))}" target="_blank" rel="noopener">${ico('wa')} Mandar o link pro meu WhatsApp</a>
        <button type="button" class="hz-btn" data-act="mu-copia" data-u="${esc(ld)}">${ico('copy')} Copiar</button>
      </div>
      <p class="fine">Quer mais proposta? Manda o pedido pra quem conhece alguém que faz: <button type="button" class="linklike" data-act="mu-share" data-u="${esc(lp)}" data-t="${esc(titulo)}">compartilhar o pedido</button>.</p>
    </section></main>`;
  }

  /* ---------------- um pedido (público) ---------------- */
  async function viewPedido(app, cod){
    app.innerHTML = header() + '<main class="wrap mural mu-det"><p class="note">Abrindo o pedido…</p></main>';
    /* v3.55: a resposta lenta não pinta por cima da página pra onde a pessoa já foi */
    const rota = C.rota;
    let p = null; try{ p = await C.api.rpc('corre_mural_ver', { p_codigo: cod }); }catch(e){ p = null; }
    if(rota !== C.rota) return;
    if(!p){ app.innerHTML = header() + `<main class="wrap mural mu-det"><section class="card"><h1>Esse pedido não tá mais no Mural.</h1><p><a href="#/mural">Ver o mural</a></p></section></main>`; return; }
    document.title = `${p.titulo} · Mural · Corre`;
    const local = store.get(MEUS_K, []).find(x => x.codigo === p.codigo);
    const t = tom(p.codigo), pct = Math.min(100, Math.round((p.propostas / Math.max(1, p.vagas)) * 100));
    const prop = await propostaHTML(p, local); if(rota !== C.rota) return;
    app.innerHTML = header() + `<main class="wrap mural mu-det">
      <a class="mu-back" href="#/mural">${ico('prev')} Mural</a>
      <article class="mu-card mu-grande mu-t${t % 4}" style="--r:-.6deg">
        <span class="mu-fita" aria-hidden="true"></span>
        <span class="mu-cat">${esc(CAT[p.categoria] || 'Outros')}</span>${p.st !== 'aberto' ? `<span class="mu-stt">${esc(ST[p.st] || p.st)}</span>` : ''}
        <h1>${esc(p.titulo)}</h1>
        <p class="mu-quem">Pedido de <b>${esc(primeiro(p.nome))}</b> · fixado ${C.rel(p.created_at) === 'agora' ? 'agora' : 'há ' + C.rel(p.created_at)}${p.st === 'aberto' ? ` · sai do mural em ${diasAte(p.expira_em)} ${diasAte(p.expira_em) === 1 ? 'dia' : 'dias'}` : ''}</p>
        ${p.descricao ? `<p class="mu-desc">${esc(p.descricao).replace(/\n/g, '<br>')}</p>` : ''}
        <div class="mu-meta"><span>${ico('pin')}${esc(lugar(p))}</span>${p.quando === 'urgente' ? '<span class="mu-urg">Urgente</span>' : `<span>${esc(QN[p.quando] || '')}</span>`}<span class="mu-verba">${esc(VN[p.verba] || 'Verba não informada')}</span></div>
        <div class="mu-foot"><span class="mu-vagas" aria-hidden="true"><i style="width:${pct}%"></i></span><span>${p.propostas} de ${p.vagas} propostas${p.vagas - p.propostas > 0 && p.st === 'aberto' ? ` · ${p.vagas - p.propostas} ${p.vagas - p.propostas === 1 ? 'vaga' : 'vagas'}` : ''}</span></div>
      </article>
      <section class="card mu-prop" id="mu-prop">${prop}</section>
      <p class="fine mu-sharel">Conhece alguém que faz isso? <button type="button" class="linklike" data-act="mu-share" data-u="${esc(linkPub(p.codigo))}" data-t="${esc(p.titulo)}">Manda o pedido</button>.</p>
    </main>`;
    M.atual = p;
    const f = C.$('mu-pf'); if(f) f.addEventListener('submit', e => { e.preventDefault(); propor(p); });
  }
  async function propostaHTML(p, local){
    if(p.meu || local){
      const ch = local ? local.chave : null;
      return `<h2>Esse pedido é teu.</h2><p class="note">${p.propostas ? `${p.propostas} ${p.propostas === 1 ? 'proposta chegou' : 'propostas chegaram'}.` : 'Ainda sem proposta.'}</p>${ch ? `<a class="btn pri" href="#/mural/k/${esc(ch)}">Ver e escolher as propostas</a>` : `<button type="button" class="btn pri" data-act="mu-meu-abre" data-c="${esc(p.codigo)}">Ver e escolher as propostas</button>`}`;
    }
    if(p.st !== 'aberto') return `<h2>${p.st === 'lotado' ? 'Esse pedido já recebeu todas as propostas.' : p.st === 'fechado' ? 'Quem pediu já resolveu.' : 'Esse pedido saiu do mural.'}</h2><p class="note">Tem mais pedido fixado esperando. <a href="#/mural">Ver o mural</a></p>`;
    if(!C.st.user) return `<h2>Faz esse serviço?</h2><p>Entra no Corre e manda tua proposta. ${esc(primeiro(p.nome))} vê teu perfil e teu portfólio e escolhe com quem falar. Grátis: 3 propostas por dia.</p><button type="button" class="btn-google mu-entrar" data-act="mu-entrar"><span>Entrar com Google pra mandar proposta</span></button>`;
    if(!me()) return `<h2>Monta teu perfil primeiro.</h2><p>Leva um minuto: é ele que ${esc(primeiro(p.nome))} vê na tua proposta.</p><a class="btn pri" href="#/">Montar meu perfil</a>`;
    if(p.ja) return `<h2>Proposta enviada.</h2><p class="note">Quando ${esc(primeiro(p.nome))} escolher a tua, o WhatsApp aparece em Minhas propostas e o lead já esquenta no teu Hórus.</p><button type="button" class="btn" data-act="mu-ir-minhas">Minhas propostas</button>`;
    if(me().visibilidade !== 'publico') return `<h2>Teu perfil tá mocado.</h2><p>Pra mandar proposta, ele precisa estar na vitrine: é o que ${esc(primeiro(p.nome))} vê antes de escolher.</p><a class="btn pri" href="#/editar">Editar perfil</a>`;
    let hoje = 0; try{ const l = await C.api.rpc('corre_mural_minhas', {}); hoje = (l || []).filter(x => Date.now() - Date.parse(x.created_at) < 864e5).length; }catch(e){}
    const restam = Math.max(0, LIM() - hoje);
    if(!restam) return `<h2>Chegou no limite de hoje.</h2><p>${pro() ? 'No Corre+ são 60 propostas por dia. Amanhã libera de novo.' : 'No grátis são 3 propostas por dia. Amanhã libera de novo, ou entra no Corre+ e manda sem limite.'}</p>${pro() ? '' : `<button type="button" class="btn pri" data-act="mu-plus">Quero o Corre+</button>`}`;
    const h = (me().horus || {}), oferta = h.oferta ? String(h.oferta).replace(/\.$/, '') : '';
    const quando = { urgente: 'consigo encaixar ainda essa semana', semana: 'consigo fazer essa semana', mes: 'consigo fazer dentro do mês', sem_pressa: 'consigo fazer no teu tempo' }[p.quando] || 'consigo fazer';
    const sug = `Oi, ${primeiro(p.nome)}! Aqui é ${primeiro(me().nome)}${oferta ? `, ${oferta}` : ''}. Vi teu pedido de "${p.titulo}" e ${quando}. Meu portfólio tá no meu perfil aqui do Corre. Como você prefere seguir?`;
    return `<h2>Tua proposta</h2>
      <form class="form" id="mu-pf" novalidate>
        <div class="fld"><label for="mu-pm">Mensagem</label><textarea class="inp" id="mu-pm" rows="5" maxlength="800" required>${esc(sug)}</textarea></div>
        <div class="row2"><div class="fld"><label for="mu-pv">Valor <small>(opcional)</small></label><input class="inp num" id="mu-pv" inputmode="decimal" placeholder="R$ 0,00"></div>
          <div class="fld"><label for="mu-pp">Prazo</label><input class="inp" id="mu-pp" maxlength="60" list="mu-pp-l" placeholder="Ex.: em 5 dias"><datalist id="mu-pp-l">${PRAZOS.map(x => `<option value="${esc(x)}">`).join('')}</datalist></div></div>
        <div class="fld"><label for="mu-pw">Teu WhatsApp <small>(vai pra ${esc(primeiro(p.nome))} só se te escolher)</small></label><input class="inp" id="mu-pw" inputmode="tel" autocomplete="tel" placeholder="(DDD) 9 9999-9999" value="${esc(store.get('corre-meu-whats', ''))}"></div>
        <div class="acts"><button type="submit" class="btn pri" id="mu-pok">${ico('send')} Mandar proposta</button><span class="mu-cota">${pro() ? 'Corre+' : `${restam} de 3 hoje`}</span></div>
        <p class="fine">Teu perfil vai junto: foto, bio e portfólio. O pedido entra no teu Hórus como lead, com retorno em 2 dias.</p>
      </form>`;
  }
  async function propor(p){
    const v = id => String(C.$(id).value || '').trim();
    const msg = v('mu-pm'); if(msg.length < 10){ C.toast('Escreve a mensagem da proposta.'); C.$('mu-pm').focus(); return; }
    const val = Number(v('mu-pv').replace(/[^\d,.]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')) || null;
    const w = digits(v('mu-pw')); if(w && (w.length < 10 || w.length > 11)){ C.toast('Confere o WhatsApp com DDD, ou deixa em branco.'); C.$('mu-pw').focus(); return; }
    const b = C.$('mu-pok'); b.disabled = true; b.textContent = 'Mandando…';
    try{
      const r = await C.api.rpc('corre_mural_propor', { p_codigo: p.codigo, p_msg: msg, p_valor: val, p_prazo: v('mu-pp'), p_whats: w });
      if(w) store.set('corre-meu-whats', w);
      if(Z() && Z().H) Z().H.loaded = false;
      C.toast(`Proposta enviada. ${r && r.restam != null && !pro() ? `Restam ${r.restam} hoje.` : ''} Já tá no teu Hórus.`, 3800);
      viewPedido(C.$('app'), p.codigo);
    }catch(err){
      const h = (err && (err.hint || err.message)) || '';
      const msgs = { limite: 'Chegou no limite de 3 propostas hoje.', limite_pro: 'Chegou no limite de hoje.', ja: 'Você já mandou proposta pra esse pedido.', lotado: 'As vagas desse pedido acabaram.', fechado: 'Esse pedido não tá mais recebendo proposta.', mocado: 'Teu perfil precisa estar na vitrine.', meu: 'Esse pedido é teu.', msg: 'Escreve a mensagem da proposta.', entrar: 'Entra no Corre pra mandar proposta.' };
      const k = Object.keys(msgs).find(x => new RegExp('^' + x + '$').test(h.trim())) || Object.keys(msgs).find(x => h.includes(x));
      C.toast(k ? msgs[k] : C.errMsg(err), 4000); b.disabled = false; b.innerHTML = `${ico('send')} Mandar proposta`;
    }
  }

  /* ---------------- a página de quem pediu ---------------- */
  async function viewDono(app, chave){
    app.innerHTML = header() + '<main class="wrap mural mu-dono"><p class="note">Abrindo teu pedido…</p></main>';
    const rota = C.rota;
    let p = null; try{ p = await C.api.rpc('corre_mural_pedido', { p_chave: chave }); }catch(e){ p = null; }
    if(rota !== C.rota) return;
    if(!p){ esquece(chave); app.innerHTML = header() + `<main class="wrap mural mu-dono"><section class="card"><h1>Não achei esse pedido.</h1><p class="note">Ele pode ter sido apagado, ou o link veio cortado.</p><a class="btn" href="#/mural">Ver o mural</a></section></main>`; return; }
    document.title = `Teu pedido · ${p.titulo} · Corre`;
    lembra({ chave: p.chave, codigo: p.codigo, titulo: p.titulo });
    M.dono = p;
    const lista = p.lista || [], escolhidas = lista.filter(x => x.st === 'escolhida').length;
    const vals = lista.map(x => Number(x.valor)).filter(x => x > 0).sort((a, b) => a - b);
    const comp = vals.length >= 2 ? `de <b class="num">${C.money(vals[0])}</b> a <b class="num">${C.money(vals[vals.length - 1])}</b>` : vals.length === 1 ? `uma com valor: <b class="num">${C.money(vals[0])}</b>` : '';
    app.innerHTML = header() + `<main class="wrap mural mu-dono">
      <a class="mu-back" href="#/mural">${ico('prev')} Mural</a>
      <section class="card mu-dono-top">
        <span class="mu-kicker">${ico('tacha')} Teu pedido · ${esc(p.codigo)}</span><span class="mu-stt st-${esc(p.st)}">${esc(ST[p.st] || p.st)}</span>
        <h1>${esc(p.titulo)}</h1>
        <p class="fine">${esc(CAT[p.categoria] || '')} · ${esc(lugar(p))} · ${esc(QN[p.quando] || '')}${p.verba ? ' · ' + esc(VN[p.verba]) : ''}${p.st === 'aberto' ? ` · sai do mural em ${diasAte(p.expira_em)} dias` : ''}</p>
        <div class="hz-row-acts">
          <button type="button" class="hz-btn" data-act="mu-share" data-u="${esc(linkPub(p.codigo))}" data-t="${esc(p.titulo)}">${ico('share')} Divulgar o pedido</button>
          <button type="button" class="hz-btn" data-act="mu-copia" data-u="${esc(linkDono(p.chave))}">${ico('lock')} Copiar meu link secreto</button>
          ${p.st === 'fechado' || p.st === 'expirado' ? `<button type="button" class="hz-btn" data-act="mu-status" data-k="aberto">Reabrir por 15 dias</button>` : `<button type="button" class="hz-btn" data-act="mu-status" data-k="fechado">Já resolvi</button>`}
          <button type="button" class="hz-btn ghost" data-act="mu-apagar">${ico('trash')} Apagar</button>
        </div>
        <p class="fine">Esse link é só teu: quem tiver ele vê as propostas e escolhe. Teu WhatsApp (${esc(fmtTel(p.whats))}) só vai pra quem você escolher.</p>
      </section>
      <div class="sec-row"><h2 class="sec-t"><span class="hl">Propostas · ${lista.length} de ${p.vagas}</span></h2></div>
      ${lista.length ? `<p class="mu-comp">${lista.length} ${lista.length === 1 ? 'proposta' : 'propostas'}${comp ? ' · ' + comp : ''}. ${escolhidas ? `Você escolheu ${escolhidas} (até 3).` : 'Escolhe até 3 pra conversar.'}</p>
        <ol class="mu-props">${lista.map(propHTML).join('')}</ol>`
        : `<div class="mu-vazio"><p><b>Ainda sem proposta.</b></p><p>Quem presta esse serviço no Corre já tá vendo teu pedido. Divulgar acelera: manda o link pra quem conhece alguém que faz.</p></div>`}
    </main>`;
  }
  function propHTML(x){
    const f = x.perfil || {}, desde = f.desde ? `${C.MESES[new Date(f.desde).getMonth()]}/${new Date(f.desde).getFullYear()}` : '';
    const prova = [f.marcas ? `${f.marcas} ${f.marcas === 1 ? 'marca' : 'marcas'} no portfólio` : '', f.escolhido ? `escolhido ${f.escolhido}x no Mural` : '', desde ? `no Corre desde ${desde}` : ''].filter(Boolean);
    const msgWa = `Oi, ${primeiro(f.nome)}! Escolhi tua proposta no Mural do Corre pro "${M.dono.titulo}". Bora conversar?`;
    return `<li class="mu-pc${x.st === 'escolhida' ? ' on' : ''}">
      <div class="mu-pq">${C.avatar({ nome: f.nome, avatar_url: f.avatar_url, handle: f.handle }, 'm')}<div><b>${esc(f.nome || '')}</b><a href="#/@${esc(f.handle || '')}">@${esc(f.handle || '')} · ver perfil e portfólio</a><span>${esc(f.cidade || '')}</span></div>${x.st === 'escolhida' ? '<span class="mu-esc">Escolhida</span>' : ''}</div>
      ${prova.length ? `<p class="mu-prova">${prova.map(esc).join(' · ')}</p>` : ''}
      <p class="mu-pmsg">${esc(x.msg).replace(/\n/g, '<br>')}</p>
      <div class="mu-pvp">${x.valor ? `<span><small>Valor</small><b class="num">${C.money(x.valor)}</b></span>` : '<span><small>Valor</small><b>a combinar</b></span>'}${x.prazo ? `<span><small>Prazo</small><b>${esc(x.prazo)}</b></span>` : ''}</div>
      <div class="hz-row-acts">${x.st === 'escolhida'
        ? (x.whats ? `<a class="hz-btn pri" href="${esc(waLink(x.whats, msgWa))}" target="_blank" rel="noopener">${ico('wa')} Chamar ${esc(primeiro(f.nome))} no WhatsApp</a>` : `<span class="note">${esc(primeiro(f.nome))} recebeu teu WhatsApp e vai te chamar.</span>`)
        : `<button type="button" class="hz-btn pri" data-act="mu-escolhe" data-id="${esc(x.id)}" data-n="${esc(primeiro(f.nome))}">${ico('star')} Escolher</button><button type="button" class="hz-btn ghost" data-act="mu-dispensa" data-id="${esc(x.id)}">Dispensar</button>`}</div>
    </li>`;
  }

  /* ---------------- rota ---------------- */
  C.views.mural = function(app, sub){
    sub = String(sub || '').replace(/^\/+/, '');
    if(sub === 'novo') return viewNovo(app);
    if(sub.startsWith('p/')) return viewPedido(app, decodeURIComponent(sub.slice(2)).toUpperCase());
    if(sub.startsWith('k/')) return viewDono(app, decodeURIComponent(sub.slice(2)).toLowerCase());
    if(sub === 'quem'){ M.tab = 'quem'; M.quem = logado() ? C.st.user.id : ''; }
    return viewMural(app);
  };

  /* ---------------- início: o card do Mural ---------------- */
  C.home.push({ k: 'mural', o: 0.5, async html(){
    const pf = prefs(), pr = minhaPraca();
    let rows = [], minhas = [];
    try{ [rows, minhas] = await Promise.all([C.api.rpc('corre_mural_lista', { p_uf: pf.area === 'brasil' ? '' : pr.uf, p_cidade: pf.area === 'cidade' ? pr.cidade : '', p_cats: pf.cats.length ? pf.cats : null, p_q: '', p_antes: null }), C.api.rpc('corre_mural_minhas', {})]); }catch(e){ return ''; }
    const daqui = store.get(MEUS_K, []).map(x => x.codigo);
    rows = (rows || []).filter(p => !p.ja && !p.meu && !daqui.includes(p.codigo)); minhas = minhas || [];
    const vistas = store.get(VISTAS_K, []), novas = minhas.filter(x => x.st === 'escolhida' && !vistas.includes(x.id));
    const top = rows.map(p => ({ p, c: calor(p, pf) })).sort((a, b) => b.c.s - a.c.s).slice(0, 2);
    return `<a class="hcard mural-mini" href="#/mural">
      <div class="hc-top"><span class="hc-name">${ico('tacha')}Mural</span><span class="mono">pedidos de serviço</span></div>
      ${novas.length ? `<p class="mu-mini-alerta"><b>${novas.length === 1 ? `${esc(primeiro(novas[0].cliente && novas[0].cliente.nome))} te escolheu!` : `${novas.length} te escolheram!`}</b> Chama no WhatsApp.</p>` : ''}
      <div class="hz-mini-nums"><div><b>${rows.length}</b><span>${pf.feito ? 'pra você' : 'na tua área'}</span></div><div><b>${minhas.filter(x => x.st === 'enviada').length}</b><span>aguardando</span></div><div><b>${minhas.filter(x => x.st === 'escolhida').length}</b><span>te escolheram</span></div></div>
      ${top.length ? `<ol class="mini-list">${top.map(o => `<li><b>${esc(o.p.titulo)}</b><small>${esc([lugar(o.p), o.c.r[0]].filter(Boolean).join(' · '))}</small></li>`).join('')}</ol>` : '<p class="note">Fixa um pedido ou pega um: quem precisa de serviço chega aqui.</p>'}
      <span class="hc-go">Abrir o Mural ${ico('next')}</span>
    </a>`;
  } });

  /* ---------------- ações ---------------- */
  async function compartilhar(u, t){
    const texto = `Pedido no Mural do Corre: "${t}". Faz isso ou conhece quem faz? ${u}`;
    if(navigator.share){ try{ await navigator.share({ title: t, text: texto, url: u }); return; }catch(e){ if(e && e.name === 'AbortError') return; } }
    C.copy(texto, 'Link do pedido copiado.');
  }
  Object.assign(C.acts, {
    'mu-tab': el => { M.tab = el.dataset.k; document.querySelectorAll('.mu-tabs [role="tab"]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.k === M.tab))); if(M.tab === 'minhas'){ const a = C.$('mu-alertas'); if(a) a.innerHTML = ''; } pintaCorpo(); },
    'mu-ir-minhas': () => { M.tab = 'minhas'; C.go('#/mural'); },
    'mu-qa-fixar': el => { const q = M.chat.find(x => x.id === el.dataset.id) || { pergunta: (el.closest('.mu-qa').querySelector('.mu-bolha.eu p') || {}).textContent || '', cidade: '' }; M.prefill = { pergunta: q.pergunta || '', cidade: q.cidade || '' }; C.go('#/mural/novo'); },
    'mu-qa-apagar': async el => {
      if(el.dataset.armed !== '1'){ el.dataset.armed = '1'; el.textContent = 'apagar mesmo?'; return; }
      const x = meusChat().find(k => k.id === el.dataset.id); if(!x) return;
      try{ const ok = await C.api.rpc('corre_mural_chat_apagar', { p_id: x.id, p_chave: x.chave || '' }); if(ok === false){ C.toast('Não deu pra apagar essa.'); return; }
        store.set(CHAT_K, meusChat().filter(k => k.id !== x.id)); M.chat = M.chat.filter(q => q.id !== x.id); const a = C.$('qa-' + x.id); if(a) a.remove(); C.toast('Pergunta tirada do Mural.'); }
      catch(e){ C.toast(C.errMsg(e)); }
    },
    'mu-entrar-ia': async el => { el.disabled = true; try{ await C.saveMe({ no_mural: true }); M.candsAt = 0; await candidatos(); const c = el.closest('.mu-conv'); if(c) c.remove(); C.toast('Pronto: a IA do Mural pode te indicar. Dá pra desligar no Editar perfil.', 4200); }catch(e){ el.disabled = false; C.toast(C.errMsg(e)); } },
    'mu-cat': el => { M.cat = M.cat === el.dataset.k ? '' : el.dataset.k; pintaCorpo(); },
    'mu-qcat': el => { M.qcat = M.qcat === el.dataset.k ? '' : el.dataset.k; pintaCorpo(); },
    'mu-setup': () => pintaSetup(C.$('mu-corpo'), true),
    'mu-sc': el => { const k = el.dataset.k, s = M.setup; s.cats = s.cats.includes(k) ? s.cats.filter(x => x !== k) : s.cats.concat(k); el.setAttribute('aria-pressed', String(s.cats.includes(k))); },
    'mu-sa': el => { M.setup.area = el.dataset.k; el.parentNode.querySelectorAll('[data-act="mu-sa"]').forEach(b => b.setAttribute('aria-pressed', String(b === el))); },
    'mu-salva-setup': async el => { el.disabled = true; try{ await salvaPrefs(M.setup); M.tab = 'pra'; pintaCorpo(); C.toast('Pronto. Esses são os teus pedidos.'); }catch(e){ C.toast(C.errMsg(e)); el.disabled = false; } },
    'mu-ex': el => { const i = C.$('mu-t'); i.value = el.textContent; i.focus(); autoCat(); forca(); },
    'mu-fc': el => { const F = M.novo; F.cat = F.cat === el.dataset.k ? '' : el.dataset.k; F.catAuto = false; C.$('mu-cat-auto').textContent = ''; C.$('mu-cat-box').innerHTML = chipsCat(F.cat, 'mu-fc'); forca(); },
    'mu-fq': el => { M.novo.quando = el.dataset.k; el.parentNode.querySelectorAll('[data-act="mu-fq"]').forEach(b => b.setAttribute('aria-pressed', String(b === el))); },
    'mu-fv': el => { M.novo.verba = el.dataset.k; el.parentNode.querySelectorAll('[data-act="mu-fv"]').forEach(b => b.setAttribute('aria-pressed', String(b === el))); forca(); },
    'mu-copia': el => C.copy(el.dataset.u, 'Link copiado.'),
    'mu-share': el => compartilhar(el.dataset.u, el.dataset.t),
    'mu-entrar': async el => {
      try{ localStorage.setItem('corre-volta', location.hash); }catch(e){}
      el.disabled = true;
      try{ await C.api.login(); }catch(err){ el.disabled = false; C.toast(err && err.code === 'off' ? 'O login do Corre ainda não tá ligado neste endereço.' : 'Não deu pra abrir o login do Google. Tenta de novo.', 4200); }
    },
    'mu-plus': () => { if(C.acts['mk-plus']) return C.acts['mk-plus'](); C.sheet(`<div class="form"><div class="sheet-head"><h2>Corre+</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div><p>No <b>Corre+</b> você manda proposta no Mural sem limite (até 60 por dia) e libera rede social pra todas as marcas.</p><div class="acts">${me() && me().quer_plus ? '<span class="tag pub">Você tá na lista do Corre+</span>' : '<button type="button" class="btn pri" data-act="mk-plus-ok">Quero o Corre+</button>'}${C.CFG && C.CFG.CONTATO_PLANO ? `<a class="btn" href="${esc(C.CFG.CONTATO_PLANO)}" target="_blank" rel="noopener">Falar com o Corre</a>` : ''}</div></div>`); },
    'mu-meu-abre': async el => { try{ const l = await C.api.rpc('corre_mural_meus', {}); const p = (l || []).find(x => x.codigo === el.dataset.c); if(p) C.go('#/mural/k/' + p.chave); else C.toast('Abre pelo link que você recebeu ao fixar.'); }catch(e){ C.toast(C.errMsg(e)); } },
    'mu-escolhe': el => {
      const n = el.dataset.n, id = el.dataset.id;
      C.sheet(`<div class="form"><div class="sheet-head"><h2>Escolher ${esc(n)}?</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
        <p>${esc(n)} recebe teu WhatsApp e te chama pra combinar. Se deixou o dele na proposta, já aparece aqui pra você chamar também. Dá pra escolher até 3.</p>
        <div class="acts"><button type="button" class="btn pri" data-act="mu-escolhe-ok" data-id="${esc(id)}">Escolher ${esc(n)}</button><button type="button" class="btn" data-close>Agora não</button></div></div>`);
    },
    'mu-escolhe-ok': async el => {
      el.disabled = true;
      try{ await C.api.rpc('corre_mural_escolher', { p_chave: M.dono.chave, p_proposta: el.dataset.id }); C.avisaPedido(); C.closeSheet(); C.toast('Escolhida. Agora é conversar.', 3200); viewDono(C.$('app'), M.dono.chave); }
      catch(err){ const h = (err && (err.hint || err.message)) || ''; C.toast(/tres/.test(h) ? 'Você já escolheu 3. Resolve com elas primeiro.' : C.errMsg(err)); el.disabled = false; }
    },
    'mu-dispensa': async el => { try{ await C.api.rpc('corre_mural_recusar', { p_chave: M.dono.chave, p_proposta: el.dataset.id }); C.toast('Dispensada. A vaga abriu pra outra proposta.'); viewDono(C.$('app'), M.dono.chave); }catch(e){ C.toast(C.errMsg(e)); } },
    'mu-status': async el => { try{ await C.api.rpc('corre_mural_status', { p_chave: M.dono.chave, p_st: el.dataset.k }); C.toast(el.dataset.k === 'fechado' ? 'Fechado. Saiu do mural.' : 'Reaberto por mais 15 dias.'); viewDono(C.$('app'), M.dono.chave); }catch(e){ C.toast(C.errMsg(e)); } },
    'mu-apagar': () => C.sheet(`<div class="form"><div class="sheet-head"><h2>Apagar o pedido?</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div><p>Some do mural, com as propostas. Não tem volta.</p><div class="acts"><button type="button" class="btn danger" data-act="mu-apagar-ok">Apagar</button><button type="button" class="btn" data-close>Cancelar</button></div></div>`),
    'mu-apagar-ok': async el => { el.disabled = true; try{ await C.api.rpc('corre_mural_status', { p_chave: M.dono.chave, p_st: 'apagar' }); esquece(M.dono.chave); C.closeSheet(); C.toast('Pedido apagado.'); C.go('#/mural'); }catch(e){ C.toast(C.errMsg(e)); el.disabled = false; } }
  });
  /* filtros e o formulário reagem enquanto digita */
  let tq = null;
  document.addEventListener('input', e => {
    const id = e.target.id;
    if(id === 'mu-qq'){ clearTimeout(tq); tq = setTimeout(() => { M.qq = e.target.value.trim(); pintaCorpo().then(() => { const i = C.$('mu-qq'); if(i){ i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }); }, 450); }
    if(id === 'mu-q'){ clearTimeout(tq); tq = setTimeout(() => { M.q = e.target.value.trim(); pintaCorpo().then(() => { const i = C.$('mu-q'); if(i){ i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }); }, 450); }
    if(id === 'mu-t' || id === 'mu-d'){ autoCat(); forca(); }
    if(id === 'mu-c') forca();
  });
  document.addEventListener('change', e => {
    const id = e.target.id;
    if(id === 'mu-uf'){ M.uf = e.target.value; M.cidade = ''; pintaCorpo(); }
    if(id === 'mu-quf'){ M.quf = e.target.value; M.qcid = ''; pintaCorpo(); }
    if(id === 'mu-qcid'){ M.qcid = e.target.value.trim(); pintaCorpo(); }
    if(id === 'mu-cid'){ M.cidade = e.target.value.trim(); pintaCorpo(); }
    if(id === 'mu-u'){ encheCidades(e.target.value, 'mu-c-l'); }
    if(id === 'mu-r') forca();
  });
  /* v3.69 · o sinal do Mural no menu esperto: proposta tua que escolheram e você ainda não viu (o mais importante) e
     pedido novo pra você desde a última vez que abriu o Mural (no máximo dos últimos 3 dias, pra não acender tudo de uma
     vez na primeira) */
  const VISITA_K = 'corre-mural-visita';
  async function sinal(){
    if(!logado()) return null;
    const pf = prefs(), pr = minhaPraca();
    const [rows, minhas] = await Promise.all([
      C.api.rpc('corre_mural_lista', { p_uf: pf.area === 'brasil' ? '' : pr.uf, p_cidade: pf.area === 'cidade' ? pr.cidade : '', p_cats: pf.cats.length ? pf.cats : null, p_q: '', p_antes: null }),
      C.api.rpc('corre_mural_minhas', {})
    ]);
    const vistas = store.get(VISTAS_K, []), daqui = store.get(MEUS_K, []).map(x => x.codigo);
    const desde = Math.max(Number(store.get(VISITA_K, 0)) || 0, Date.now() - 3 * 864e5);
    return {
      escolhido: (minhas || []).filter(x => x.st === 'escolhida' && !vistas.includes(x.id)).length,
      novos: (rows || []).filter(q => !q.ja && !q.meu && !daqui.includes(q.codigo) && Date.parse(q.created_at) > desde).length
    };
  }
  /* v3.65 · a busca do Corre abre o Mural na aba "Tudo" já filtrando pelo que a pessoa procurou */
  const procura = q => { M.quem = logado() ? C.st.user.id : ''; M.tab = 'tudo'; M.cat = ''; M.q = String(q || '').trim().slice(0, 60); C.go('#/mural'); };
  C.mural = { CATS, catDe, catsDe, calor, prefs, procura, sinal };
})();
