/* CORRE · STUDIO HOUZI (v3.37). Branding e rebranding dentro do Corre, do naming ao brandbook.
   #/houzi          a casa do Studio: "Você já tem uma marca?", as tuas marcas e as que saíram daqui (vitrine).
   #/houzi/nova     o caminho: o negócio, o nome (com naming, se não tiver), o jeito e as 6 amostras.
   #/houzi/m/ID     a bancada: a ideia, o símbolo, a letra, as cores e os textos (salva sozinho).
   #/bb/endereço    o brandbook vivo (lab-livro.js).
   O desenho é todo do motor (lab-motor.js): vetor, feito no aparelho. O banco guarda só as escolhas (delta-v337.sql).
   Sem o banco (o delta ainda não rodou), a marca fica guardada neste aparelho e nada quebra. */
(function(){
  'use strict';
  const C = window.Corre, M = C.labMotor;
  if(!M) return;
  const { esc, ico } = C;
  const H = C.houzi = {};
  const TAB = 'corre_houzi_marcas';

  /* ---------- letras da interface e desenho ---------- */
  let uiPronta = null;
  H.ui = () => uiPronta || (uiPronta = Promise.all(['inter-black', 'inter-medium', 'inter-regular', 'inter-light'].map(id => M.cssPronta(id))).catch(() => null));
  H.fs = async sp => { const f = await M.fontes([sp.tipo.display, sp.tipo.texto]); return { display: f[sp.tipo.display], texto: f[sp.tipo.texto] }; };
  /* o logo em SVG numa versão (nome da versão ou a própria versão) e num arranjo */
  H.svg = (sp, fs, o) => {
    o = o || {};
    const lg = M.logo(sp, fs, o.arranjo), vs = M.versoes(sp.cores);
    const v = typeof o.versao === 'string' ? vs[o.versao] : o.versao || M.versaoPrincipal(sp);
    return { svg: M.logoSvg(lg, v, Object.assign({ titulo: sp.nome }, o.svg || {})), lg, v };
  };
  /* desenha nos espaços [data-stz-logo] (cada um com o índice da marca em data-i) depois que a letra carrega */
  const pintaLogos = async (raiz, specs, o) => {
    for(const el of raiz.querySelectorAll('[data-stz-logo]')){
      const sp = specs[Number(el.dataset.i)]; if(!sp) continue;
      try{ const fs = await H.fs(sp); const r = H.svg(sp, fs, Object.assign({}, o, el.dataset.v ? { versao: el.dataset.v } : {}, el.dataset.a ? { arranjo: el.dataset.a } : {})); el.innerHTML = r.svg; if(el.dataset.fundo !== '0') el.style.background = r.v.fundo; el.classList.add('ok'); }
      catch(e){ el.innerHTML = `<span class="stz-falha">${esc(sp.nome || '')}</span>`; }
    }
  };
  H.pintaLogos = pintaLogos;
  const chipsCor = c => `<span class="stz-chips" aria-hidden="true">${['p', 's', 'a', 'ink', 'paper'].map(k => `<i style="background:${esc(c[k])}"></i>`).join('')}</span>`;

  /* ---------- dados: banco, ou o aparelho enquanto o banco não tem a tabela ---------- */
  const ERROS = { login: 'Entra no Corre pra guardar a marca.', perfil: 'Termina teu perfil pra usar o Studio.', nome: 'O nome da marca vai de 1 a 40 letras.',
    limite_marcas: 'Você já tem 30 marcas no Studio. Apaga uma pra fazer outra.', limite_dia: 'Hoje já deu: 20 marcas novas por dia.' };
  const semBanco = e => !!e && (['PGRST202', 'PGRST205', '42P01', '42883'].includes(e.code) || /Could not find the (function|table)|relation .* does not exist|function .* does not exist/i.test(e.message || ''));
  H.erroTxt = (e, f) => { const h = (e && (e.hint || e.message)) || ''; return ERROS[h] || C.errMsg(e, f); };
  const LK = 'corre-houzi-local';
  const local = {
    ler(){ try{ const l = JSON.parse(localStorage.getItem(LK) || '[]'); return Array.isArray(l) ? l : []; }catch(e){ return []; } },
    salvar(l){ try{ localStorage.setItem(LK, JSON.stringify(l.slice(0, 20))); }catch(e){ C.toast('Sem espaço neste navegador pra guardar a marca.'); } }
  };
  const ehLocal = m => !!m && (m.local || /^l-/.test(String(m.id || '')));
  H.ehLocal = ehLocal;
  H.criar = async r => {
    try{ const x = await C.api.rpc('corre_houzi_criar', { p_nome: r.nome, p_modo: r.modo, p_spec: r.spec, p_voz: r.voz || {}, p_naming: r.naming || {} }); return Array.isArray(x) ? x[0] : x; }
    catch(e){
      if(!semBanco(e)) throw e;
      const l = local.ler(), id = 'l-' + Date.now().toString(36), agora = new Date().toISOString();
      const row = Object.assign({ id, dono: C.uid() || '', numero: 0, slug: id, publica: false, created_at: agora, updated_at: agora, local: true }, r);
      l.unshift(row); local.salvar(l);
      C.toast('A marca ficou guardada neste aparelho (o banco do Studio ainda não tá ligado).', 4200);
      return row;
    }
  };
  /* v3.55: a cor da marca vai pro SVG e pro CSS da vitrine e do brandbook, que qualquer um abre; o que não for #RRGGBB
     (alguém gravando direto no banco) vira uma cor neutra antes de chegar na tela */
  const CORES_K = { p: '#141414', s: '#D8D4CB', a: '#B8913A', ink: '#141414', paper: '#F6F2EA' };
  const limpa = m => { const c = m && m.spec && m.spec.cores; if(c && typeof c === 'object') Object.keys(CORES_K).forEach(k => { if(c[k] != null && !/^#[0-9a-f]{6}$/i.test(String(c[k]))) c[k] = CORES_K[k]; }); return m; };
  H.ler = async id => { if(/^l-/.test(id)) return local.ler().find(x => x.id === id) || null; return limpa(await C.api.one(TAB, { eq: { id } })); };
  H.lerSlug = async slug => { if(/^l-/.test(slug)) return local.ler().find(x => x.slug === slug) || null; return limpa(await C.api.one(TAB, { eq: { slug } })); };
  H.minhas = async () => {
    let l = [];
    if(C.uid()){ try{ l = await C.api.q(TAB, { eq: { dono: C.uid() }, order: ['updated_at', false], limit: 40 }); }catch(e){ if(!semBanco(e)) throw e; } }
    return (l || []).map(limpa).concat(local.ler());
  };
  H.vitrine = async () => { try{ return ((await C.api.q(TAB, { eq: { publica: true }, order: ['updated_at', false], limit: 12 })) || []).map(limpa); }catch(e){ return []; } };
  /* v3.41 · A BUYER PERSONA É SÓ DO DONO. A marca publicada abre pra qualquer um, e a voz vai junto; então o cliente
     ideal que a IA ou o dono escreveu não vai na voz: mora na corre_houzi_privado, que só o dono lê (delta-v341.sql).
     Marca deste aparelho (local) guarda junto, que lá já é só dela. */
  const PRIV = 'corre_houzi_privado', privSalvo = {};
  H.salvar = async (m, patch) => {
    if(ehLocal(m)){ const l = local.ler(), i = l.findIndex(x => x.id === m.id); if(i >= 0){ l[i] = Object.assign(l[i], patch, { updated_at: new Date().toISOString() }); local.salvar(l); } return; }
    let bp;
    if(patch.voz && Object.prototype.hasOwnProperty.call(patch.voz, 'buyer_persona')){ bp = patch.voz.buyer_persona || {}; const v = Object.assign({}, patch.voz); delete v.buyer_persona; patch = Object.assign({}, patch, { voz: v }); }
    await C.api.upd(TAB, { id: m.id }, patch);
    /* só manda quando mudou (a bancada salva a cada mexida) */
    const js = bp === undefined ? null : JSON.stringify(bp);
    if(js === null || privSalvo[m.id] === js) return;
    try{ await C.api.upsert(PRIV, [{ marca: m.id, dono: C.uid(), buyer: bp, updated_at: new Date().toISOString() }], 'marca'); privSalvo[m.id] = js; }
    catch(e){ C.toast(semBanco(e) ? 'A buyer persona não salvou: falta rodar o delta-v341 no Supabase (o resto da marca salvou).' : H.erroTxt(e, 'A buyer persona não salvou agora.'), 5200); }
  };
  /* o dono abre a marca (bancada ou brandbook): a buyer persona dele volta pra voz, só na memória */
  H.lerPrivado = async m => {
    if(!m || ehLocal(m) || !C.uid() || m.dono !== C.uid()) return m;
    try{ const r = await C.api.one(PRIV, { eq: { marca: m.id } }); m._privErro = false; if(r && r.buyer && temPersona(r.buyer)){ m.voz = Object.assign({}, m.voz || {}, { buyer_persona: r.buyer }); privSalvo[m.id] = JSON.stringify(r.buyer); } }
    /* v3.55: não deu pra ler o "Pra quem" guardado: marca, pra edição não gravar o modelo do Studio por cima do que a pessoa escreveu */
    catch(e){ m._privErro = true; }
    return m;
  };
  H.apagar = async m => { if(ehLocal(m)){ local.salvar(local.ler().filter(x => x.id !== m.id)); return; } await C.api.del(TAB, { id: m.id }); };
  H.numero = m => m && m.numero ? 'Nº ' + String(m.numero).padStart(4, '0') : 'Rascunho';

  /* ---------- os textos: o que a pessoa (ou a IA) escreveu, ou o texto que o Studio monta das escolhas ---------- */
  H.voz = m => (m.voz && m.voz.conceito) ? Object.assign({}, M.vozLocal(m.spec), m.voz) : M.vozLocal(m.spec);
  H.textos = m => {
    const base = M.conceitos(m.spec, m.naming && m.naming.nome ? m.naming : null), ia = m.voz && m.voz.textos;
    if(!ia) return base;
    const out = {};
    Object.keys(base).forEach(k => { const t = String(ia[k] || '').trim(); out[k] = t ? t.split(/\n+/).map(s => s.trim()).filter(Boolean) : base[k]; });
    return out;
  };
  /* o contexto que a IA recebe (escreve por cima dos textos do Studio) */
  H.ctxIA = m => {
    const sp = m.spec, t = M.TERRITORIOS[sp.territorio] || {}, fi = M.fonteInfo(sp.tipo.display), rc = M.receitaDe(sp), ar = M.arquetipo(sp.pers);
    return { nome: sp.nome, negocio: (M.NICHOS[sp.nicho] || {}).n || '', descr: sp.descr || '', cidade: sp.cidade || '', desde: sp.desde || '', tagline: sp.tagline || '',
      territorio: t.n || '', frase: t.frase || '', gesto: M.gestoTxt(sp), simbolo: M.simboloTxt(sp), letra: M.nomeLetra(fi),
      cores: ['p', 's', 'a', 'ink', 'paper'].map(k => `${M.nomeCor(sp.cores[k], sp.nome)} (${sp.cores[k]})`), receita: rc ? rc.n + ': ' + rc.h : '',
      textura: (M.TEXTURAS || {})[sp.textura] || sp.textura || '', vive: t.vive || '', pers: M.EIXOS.map((e, i) => e[sp.pers[i] >= 0.5 ? 1 : 0]).join(', '), arquetipo: ar.n,
      naming: m.naming && m.naming.nome ? { nome: m.naming.nome, estrategia: m.naming.estrategia, porque: m.naming.porque } : null,
      /* v3.40: as referências que a pessoa trouxe (o clima, o que não quer, o que inspira) */
      clima: (sp.refs && sp.refs.clima) || '', nao: (sp.refs && sp.refs.nao) || '', marcas: (sp.refs && sp.refs.marcas) || '' };
  };
  H.escreveIA = async m => {
    const r = await C.iaFn({ acao: 'marca', ctx: H.ctxIA(m) }, { oque: 'os textos da marca' });
    const v = Object.assign({}, H.voz(m), { conceito: r.conceito, manifesto: r.manifesto, taglines: r.taglines, e: r.e, nao_e: r.nao_e, fala: r.fala, nao_fala: r.nao_fala, bio: r.bio, wa: r.wa, textos: r.textos, ia: true });
    /* v3.41: as personas só entram se vierem com conteúdo (a função antiga não manda; aí fica a que a marca já tinha) */
    if(temPersona(r.buyer_persona)) v.buyer_persona = r.buyer_persona;
    if(temPersona(r.brand_persona)) v.brand_persona = r.brand_persona;
    return { voz: v, restam: r.restam, personas: temPersona(r.buyer_persona) || temPersona(r.brand_persona) };
  };
  /* v3.41 · AS PERSONAS do brandbook: o cliente ideal (buyer) e a marca como se fosse gente (brand). O Studio monta as
     duas na hora, das escolhas (acompanham o nicho, a cidade e o território quando mudam); o que a IA ou a pessoa
     escreveu (m.voz.buyer_persona e m.voz.brand_persona) vai por cima, campo por campo. Campo apagado volta pro do Studio. */
  const cheio = x => Array.isArray(x) ? x.some(s => String(s == null ? '' : s).trim()) : String(x == null ? '' : x).trim() !== '';
  const temPersona = p => !!p && typeof p === 'object' && Object.keys(p).some(k => cheio(p[k]));
  const junta = (base, por) => {
    const o = Object.assign({}, base);
    if(temPersona(por)) Object.keys(base).forEach(k => { if(k === 'arquetipo' || !cheio(por[k])) return; o[k] = Array.isArray(base[k]) ? (Array.isArray(por[k]) ? por[k] : String(por[k]).split('\n')).map(s => String(s).trim()).filter(Boolean).slice(0, 4) : String(por[k]).trim(); });
    return o;
  };
  H.personas = m => {
    const base = M.personas(m.spec), v = m.voz || {};
    return { buyer: junta(base.buyer, v.buyer_persona), brand: junta(base.brand, v.brand_persona), escrita: temPersona(v.buyer_persona) || temPersona(v.brand_persona) };
  };
  H.temPersona = temPersona;
  const erroIA = e => e && e.code === 'limite' ? C.limiteMsg(e, 'Studio Houzi') : e && (e.code === 'nofn' || e.code === 'sem_chave' || e.status === 404) ? 'A IA ainda não tá ligada aqui. Os textos do Studio continuam valendo.' : 'A IA não respondeu agora. Tenta de novo daqui a pouco.';
  H.erroIA = erroIA;

  /* ---------- #/houzi: a casa do Studio ---------- */
  const cartaoMarca = (m, i, meu) => `<a class="stz-card" href="#/${meu ? 'houzi/m/' + esc(m.id) : 'bb/' + esc(m.slug)}">
      <span class="stz-card-art" data-stz-logo data-i="${i}"></span>
      <span class="stz-card-tx"><span class="stz-k">${esc(H.numero(m))}${meu ? ` · ${ehLocal(m) ? 'neste aparelho' : m.publica ? 'publicada' : 'rascunho'}` : ''}</span><b>${esc(m.nome)}</b><small>${esc((M.TERRITORIOS[m.spec && m.spec.territorio] || {}).n || '')}</small></span></a>`;
  C.views.houzi = async function(app, resto){
    resto = String(resto || '');
    await H.ui();
    if(resto.startsWith('nova')) return nova(app, resto);
    if(resto.startsWith('m/')) return bancada(app, decodeURIComponent(resto.slice(2).split('?')[0]));
    document.title = 'Studio Houzi · Corre';
    const rota = C.rota, logado = !!C.uid();
    app.innerHTML = C.header('houzi') + `<main class="stz">
      <section class="stz-hero">
        <p class="stz-kick">Studio Houzi <span>·</span> marca com conceito, dentro do Corre</p>
        <h1 class="stz-h1">Você já tem uma marca?</h1>
        <div class="stz-portas">
          <a class="stz-porta" href="#/houzi/nova?m=branding"><span class="stz-n">01</span><b>Ainda não.</b><small>Do nome ao brandbook: o naming, o logo, a letra, as cores e os textos que explicam cada escolha.</small></a>
          <a class="stz-porta" href="#/houzi/nova?m=nome"><span class="stz-n">02</span><b>Tenho o nome.</b><small>Falta a marca. Seis caminhos coerentes com o teu negócio; você escolhe um e ajusta na bancada.</small></a>
          <a class="stz-porta" href="#/houzi/nova?m=rebranding"><span class="stz-n">03</span><b>Tenho, e quero outra.</b><small>Rebranding: o Studio lê a tua marca de hoje e propõe a nova, mantendo o que importa.</small></a>
        </div>
      </section>
      <section class="stz-sec stz-leva" aria-label="O que você leva">
        <div class="stz-sec-h"><h2>O que você leva</h2><small>Tudo em vetor, feito no teu aparelho.</small></div>
        <ul class="stz-leva-l">
          <li><b>O logo inteiro</b><span>As versões e as assinaturas, em SVG, PNG e PDF pra gráfica.</span></li>
          <li><b>Um brandbook vivo</b><span>Abre com um filme: o logo se constrói na tela, no som da marca. E vira apresentação com um toque.</span></li>
          <li><b>O som da marca</b><span>Três segundos tirados do nome, da cor e do território. Em WAV, pra vinheta, reels e espera de telefone.</span></li>
          <li><b>O brandbook que faz post</b><span>Escreve a frase e sai o post, o story ou o cartaz com a cara da marca.</span></li>
          <li><b>O kit pra usar amanhã</b><span>Logo animado em vídeo, modelos de post e story, capas de destaque, cartão de visita e papel timbrado.</span></li>
          <li><b>O porquê de cada escolha</b><span>Construção, combinações de cor com nota de leitura, voz e aplicações. E o PDF com QR que abre a versão viva.</span></li>
        </ul>
      </section>
      ${logado ? `<section class="stz-sec" id="stz-minhas" hidden><div class="stz-sec-h"><h2>Tuas marcas</h2></div><div class="stz-grade" id="stz-minhas-g"></div></section>` : ''}
      <section class="stz-sec stz-metodo">
        <div class="stz-sec-h"><h2>Como o Studio trabalha</h2></div>
        <ol class="stz-passos">
          <li><b>Território</b><span>Cada marca nasce de um conceito coerente com o negócio e com o sentido do nome. Brasa não vira neon.</span></li>
          <li><b>Uma ideia</b><span>Uma ideia por logo: o "O" que vira grelha, o ponto final, o corte de estêncil. Nada de enfeite.</span></li>
          <li><b>Letra e cor</b><span>Letra escolhida a dedo, paletas com nome e história e contraste testado pra tela e pra papel.</span></li>
          <li><b>O porquê</b><span>O brandbook explica cada escolha: naming, logo, tipografia, cores, elementos e aplicações.</span></li>
        </ol>
      </section>
      <section class="stz-sec" id="stz-vitrine" hidden><div class="stz-sec-h"><h2>Feitas no Studio</h2><small>Marcas que o dono publicou.</small></div><div class="stz-grade" id="stz-vitrine-g"></div></section>
      <p class="stz-rod">Studio Houzi <span>·</span> tudo em vetor, feito no teu aparelho. O logo, as versões, o PDF e o kit saem daqui.</p>
    </main>`;
    const [minhas, vit] = await Promise.all([logado ? H.minhas().catch(() => []) : [], H.vitrine()]);
    if(rota !== C.rota) return;
    if(minhas.length){
      const sec = C.$('stz-minhas'), g = C.$('stz-minhas-g'); sec.hidden = false;
      g.innerHTML = minhas.map((m, i) => cartaoMarca(m, i, true)).join('');
      pintaLogos(g, minhas.map(m => m.spec));
    }
    const fora = vit.filter(m => m.dono !== C.uid());
    if(fora.length){
      const sec = C.$('stz-vitrine'), g = C.$('stz-vitrine-g'); sec.hidden = false;
      g.innerHTML = fora.map((m, i) => cartaoMarca(m, i, false)).join('');
      pintaLogos(g, fora.map(m => m.spec));
    }
  };

  /* ---------- #/houzi/nova: o caminho até as 6 amostras ---------- */
  /* v3.40: o passo das referências (palavras, o que não quer, cores, peso da letra, onde vive, imagens) em todos os caminhos */
  const PASSOS = { branding: ['negocio', 'jeito', 'refs', 'naming', 'amostras'], nome: ['negocio', 'nome', 'jeito', 'refs', 'amostras'], rebranding: ['negocio', 'atual', 'jeito', 'refs', 'amostras'] };
  const ROT = { negocio: 'O negócio', jeito: 'O jeito', refs: 'As referências', naming: 'O nome', nome: 'O nome', atual: 'A marca de hoje', amostras: 'As amostras' };
  const LETRAS = [['', 'Tanto faz'], ['sem', 'Sem serifa'], ['serifa', 'Com serifa'], ['manuscrita', 'Manuscrita'], ['mono', 'Máquina de escrever'], ['pixel', 'Pixel']];
  const CORES = ['#E4322B', '#FF5A1F', '#F5C518', '#C59B3E', '#7A4A2A', '#2F5BFF', '#1C2E5A', '#7D5CC0', '#FF4F9A', '#141414'];
  const WK = 'corre-houzi-w';
  let W = null;
  const refsVazias = () => ({ clima: '', nao: '', marcas: '', peso: '', onde: [], cores: [], naoCores: [], imgs: [] });
  const novoW = modo => ({ modo, passo: 0, nicho: '', descr: '', cidade: (C.st.me && C.st.me.cidade) || '', desde: '', nome: '', tagline: '', palavras: '', pers: [.5, .5, .5, .5, .5], cor: '', manterCor: false, letra: '',
    velho: null, naming: null, nomes: [], favs: [], rodadaN: 0, amostras: [], rodada: 0, refs: refsVazias(), hist: [], histDe: '', nomesVistos: [] });
  const guardaW = () => { try{ const w = Object.assign({}, W, { amostras: [], velho: W.velho ? { cores: W.velho.cores } : null }); sessionStorage.setItem(WK, JSON.stringify(w)); }catch(e){ try{ const w = Object.assign({}, W, { amostras: [], velho: null, refs: Object.assign({}, W.refs, { imgs: W.refs.imgs.map(x => Object.assign({}, x, { thumb: '' })) }) }); sessionStorage.setItem(WK, JSON.stringify(w)); }catch(_){} } };
  const lerW = () => { try{ const w = JSON.parse(sessionStorage.getItem(WK) || 'null'); if(!(w && PASSOS[w.modo])) return null; w.refs = Object.assign(refsVazias(), w.refs || {}); ['hist', 'nomesVistos'].forEach(k => { if(!Array.isArray(w[k])) w[k] = []; }); if(typeof w.histDe !== 'string') w.histDe = ''; return w; }catch(e){ return null; } };
  /* as referências que vão pro motor (e pra marca): sem as miniaturas das imagens, só o que foi lido delas */
  const refsLimpas = () => { const R = W.refs; return { clima: R.clima.trim(), nao: R.nao.trim(), marcas: R.marcas.trim(), peso: R.peso, onde: R.onde.slice(), cores: R.cores.slice(), naoCores: R.naoCores.slice(), imgs: R.imgs.map(({ thumb, ...x }) => x) }; };
  const respostas = () => ({ nome: W.nome.trim(), tagline: W.tagline.trim(), nicho: W.nicho || 'outro', pers: W.pers.slice(), cor: W.cor || '', manterCor: !!(W.cor && W.manterCor), letra: W.letra || '', cidade: W.cidade.trim(), desde: W.desde.trim(), palavras: W.palavras.trim(), descr: W.descr.trim(), modo: W.modo === 'rebranding' ? 'rebranding' : 'branding', refs: refsLimpas() });
  const chaveVitrine = (sp, i) => { const pk = sp.cores.fundo === 'ink' ? 'negativo' : sp.cores.fundo === 'p' ? 'cor' : 'principal'; const l = [pk, 'cor', 'negativo'].filter((k, j, a) => a.indexOf(k) === j); return l[i % l.length]; };

  async function nova(app, resto){
    const q = new URLSearchParams(resto.split('?')[1] || ''), modo = PASSOS[q.get('m')] ? q.get('m') : '';
    if(!W) W = lerW();
    if(!W || (modo && W.modo !== modo)) W = novoW(modo || 'branding');
    document.title = 'Nova marca · Studio Houzi';
    app.innerHTML = C.header('houzi') + `<main class="stz stz-wiz"><div class="stz-wtop"><a class="stz-voltar" href="#/houzi">${ico('prev')} Studio Houzi</a><ol class="stz-trilha" id="stz-trilha"></ol></div><div id="stz-passo" class="stz-passo"></div></main>`;
    passo();
  }
  const leCampos = () => {
    const v = id => { const el = C.$(id); return el ? el.value : null; };
    if(v('stz-descr') !== null) W.descr = v('stz-descr');
    if(v('stz-cidade') !== null) W.cidade = v('stz-cidade');
    if(v('stz-desde') !== null) W.desde = v('stz-desde').replace(/\D/g, '').slice(0, 4);
    if(v('stz-nome') !== null) W.nome = v('stz-nome');
    if(v('stz-tag') !== null) W.tagline = v('stz-tag');
    if(v('stz-palavras') !== null) W.palavras = v('stz-palavras');
    if(v('stz-ref-clima') !== null) W.refs.clima = v('stz-ref-clima');
    if(v('stz-ref-nao') !== null) W.refs.nao = v('stz-ref-nao');
    if(v('stz-ref-marcas') !== null) W.refs.marcas = v('stz-ref-marcas');
  };
  function passo(){
    const box = C.$('stz-passo'); if(!box) return;
    const ps = PASSOS[W.modo], k = ps[W.passo], n = ps.length;
    C.$('stz-trilha').innerHTML = ps.map((p, i) => `<li class="${i === W.passo ? 'on' : i < W.passo ? 'feito' : ''}"><span>${String(i + 1).padStart(2, '0')}</span>${esc(ROT[p])}</li>`).join('');
    const cab = (t, sub) => `<p class="stz-kick">Passo ${W.passo + 1} de ${n}</p><h2 class="stz-h2">${t}</h2>${sub ? `<p class="stz-lead">${sub}</p>` : ''}`;
    const nav = (prox, txt) => `<div class="stz-nav">${W.passo ? `<button type="button" class="stz-btn ghost" data-act="stz-volta">${ico('prev')} Voltar</button>` : ''}${prox ? `<button type="button" class="stz-btn pri" data-act="stz-segue">${txt || 'Continuar'}</button>` : ''}</div>`;
    guardaW();
    if(k === 'negocio'){
      box.innerHTML = cab('Do que é o negócio?', 'É daqui que sai a coerência: o território, as cores e o símbolo têm que fazer sentido pro que você vende.') + `
        <div class="stz-ops" role="group" aria-label="O nicho">${Object.entries(M.NICHOS).map(([kk, x]) => `<button type="button" class="stz-op${W.nicho === kk ? ' on' : ''}" data-act="stz-nicho" data-k="${kk}" aria-pressed="${W.nicho === kk}">${esc(x.n)}</button>`).join('')}</div>
        <div class="stz-campos">
          <label class="stz-f"><span>Em uma frase, o que você vende</span><input class="stz-in" id="stz-descr" maxlength="120" value="${esc(W.descr)}" placeholder="Smash burger e batata, na zona norte"></label>
          <div class="stz-2"><label class="stz-f"><span>Cidade</span><input class="stz-in" id="stz-cidade" maxlength="60" value="${esc(W.cidade)}" placeholder="Londrina, PR"></label>
          <label class="stz-f"><span>Desde <em>(opcional)</em></span><input class="stz-in" id="stz-desde" maxlength="4" inputmode="numeric" value="${esc(W.desde)}" placeholder="2019"></label></div>
        </div>` + nav(true);
    } else if(k === 'nome'){
      box.innerHTML = cab('Como a marca se chama?') + `<div class="stz-campos">
          <label class="stz-f"><span>Nome da marca</span><input class="stz-in grande" id="stz-nome" maxlength="40" value="${esc(W.nome)}" placeholder="Nome" autocomplete="off"></label>
          <label class="stz-f"><span>Uma frase que acompanha <em>(opcional)</em></span><input class="stz-in" id="stz-tag" maxlength="48" value="${esc(W.tagline)}" placeholder="Ex.: smash de verdade"></label></div>` + nav(true);
    } else if(k === 'atual'){
      const v = W.velho;
      box.innerHTML = cab('Como é a marca hoje?', 'O Studio lê as cores do teu logo e guarda o que você quiser manter. A imagem não sai do teu aparelho.') + `<div class="stz-campos">
          <div class="stz-2"><label class="stz-f"><span>Nome</span><input class="stz-in" id="stz-nome" maxlength="40" value="${esc(W.nome)}" placeholder="Nome da marca"></label>
          <label class="stz-f"><span>Frase <em>(opcional)</em></span><input class="stz-in" id="stz-tag" maxlength="48" value="${esc(W.tagline)}" placeholder="A frase de hoje"></label></div>
          <div class="stz-velho">${v && v.img ? `<img src="${esc(v.img)}" alt="O logo de hoje">` : `<span class="stz-velho-v">${ico('img')}</span>`}<div><button type="button" class="stz-btn" data-act="stz-sobe">${ico('up')} ${v ? 'Trocar o logo' : 'Subir o logo de hoje'}</button><small>PNG, JPG ou SVG.</small></div></div>
          ${v && v.cores && v.cores.length ? `<fieldset class="stz-f"><legend>A cor que fica <em>(toca pra manter, toca de novo pra soltar)</em></legend><div class="stz-ops">${v.cores.map(c => `<button type="button" class="stz-cor${W.cor === c.hex && W.manterCor ? ' on' : ''}" data-act="stz-mantem" data-c="${esc(c.hex)}" style="--c:${esc(c.hex)}" aria-pressed="${W.cor === c.hex && W.manterCor}"><i></i>${esc(c.hex)}</button>`).join('')}</div></fieldset>` : ''}
          <fieldset class="stz-f"><legend>O estilo de letra de hoje <em>(se quiser manter)</em></legend><div class="stz-ops">${LETRAS.map(([kk, t]) => `<button type="button" class="stz-op${W.letra === kk ? ' on' : ''}" data-act="stz-letra" data-k="${kk}" aria-pressed="${W.letra === kk}">${esc(kk ? t : 'Não precisa manter')}</button>`).join('')}</div></fieldset>
        </div>` + nav(true);
    } else if(k === 'jeito'){
      box.innerHTML = cab('Qual é o jeito da marca?', 'Arrasta pro lado que é mais a cara dela. Isso desempata entre os caminhos que fazem sentido pro negócio.') + `<div class="stz-eixos">${M.EIXOS.map((e, i) => `<label class="stz-eixo"><span>${esc(e[0])}</span><input type="range" min="0" max="100" step="1" value="${Math.round(W.pers[i] * 100)}" data-i="${i}" aria-label="${esc(e[0])} ou ${esc(e[1])}"><span>${esc(e[1])}</span></label>`).join('')}</div>
        ${W.modo === 'rebranding' ? '' : `<fieldset class="stz-f"><legend>Letra que é a tua cara <em>(opcional)</em></legend><div class="stz-ops">${LETRAS.map(([kk, t]) => `<button type="button" class="stz-op${W.letra === kk ? ' on' : ''}" data-act="stz-letra" data-k="${kk}" aria-pressed="${W.letra === kk}">${esc(t)}</button>`).join('')}</div></fieldset>
        <fieldset class="stz-f"><legend>Já tem uma cor? <em>(opcional)</em></legend><div class="stz-ops"><button type="button" class="stz-op${!W.cor ? ' on' : ''}" data-act="stz-cor" data-c="" aria-pressed="${!W.cor}">Deixa com o Studio</button>${CORES.map(c => `<button type="button" class="stz-cor so${W.cor === c ? ' on' : ''}" data-act="stz-cor" data-c="${c}" style="--c:${c}" aria-pressed="${W.cor === c}" aria-label="Cor ${c}"><i></i></button>`).join('')}<label class="stz-cor livre${W.cor && !CORES.includes(W.cor) ? ' on' : ''}" title="Outra cor"><input type="color" id="stz-cor-livre" value="${esc(W.cor && !CORES.includes(W.cor) ? W.cor : '#E4322B')}"><span>Outra</span></label></div></fieldset>`}` + nav(true, 'As referências');
      box.querySelectorAll('.stz-eixo input').forEach(r => r.addEventListener('input', () => { W.pers[Number(r.dataset.i)] = Number(r.value) / 100; guardaW(); }));
      const cl = C.$('stz-cor-livre'); if(cl) cl.addEventListener('input', () => { W.cor = cl.value.toUpperCase(); W.manterCor = true; box.querySelectorAll('[data-act="stz-cor"]').forEach(b => { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); }); cl.parentElement.classList.add('on'); guardaW(); });
    } else if(k === 'refs'){
      const R = W.refs, rs = M.resumoRefs(refsLimpas());
      const chipCor = (c, lista, act) => `<button type="button" class="stz-cor so${lista.includes(c) ? ' on' : ''}" data-act="${act}" data-c="${c}" style="--c:${c}" aria-pressed="${lista.includes(c)}" aria-label="Cor ${c}"><i></i></button>`;
      box.innerHTML = cab('O que te inspira?', 'Tudo opcional. O Studio lê as palavras e as imagens e puxa os caminhos, as cores e a letra pra perto do que você trouxe (e pra longe do que você não quer).') + `<div class="stz-campos">
          <label class="stz-f"><span>O clima em palavras</span><input class="stz-in" id="stz-ref-clima" maxlength="120" value="${esc(R.clima)}" placeholder="cru, noturno, de bairro, quente"></label>
          <label class="stz-f"><span>O que ela não pode parecer</span><input class="stz-in" id="stz-ref-nao" maxlength="120" value="${esc(R.nao)}" placeholder="infantil, rosa, corporativo"></label>
          <label class="stz-f"><span>Referências: marcas, lugares, filmes, estilos <em>(de qualquer área)</em></span><input class="stz-in" id="stz-ref-marcas" maxlength="160" value="${esc(R.marcas)}" placeholder="loja de disco dos anos 70, placa de oficina, pista de skate"></label>
          <fieldset class="stz-f"><legend>Cores que você ama <em>(até 4)</em></legend><div class="stz-ops">${CORES.map(c => chipCor(c, R.cores, 'stz-ref-cor')).join('')}</div></fieldset>
          <fieldset class="stz-f"><legend>Cores que você não quer</legend><div class="stz-ops">${CORES.map(c => chipCor(c, R.naoCores, 'stz-ref-naocor')).join('')}</div></fieldset>
          <fieldset class="stz-f"><legend>O peso da letra</legend><div class="stz-ops">${M.PESOS.map(([kk, t]) => `<button type="button" class="stz-op${R.peso === kk ? ' on' : ''}" data-act="stz-ref-peso" data-k="${kk}" aria-pressed="${R.peso === kk}">${esc(t)}</button>`).join('')}</div></fieldset>
          <fieldset class="stz-f"><legend>Onde a marca mais aparece <em>(pode marcar mais de um)</em></legend><div class="stz-ops">${M.ONDE.map(([kk, t]) => `<button type="button" class="stz-op${R.onde.includes(kk) ? ' on' : ''}" data-act="stz-ref-onde" data-k="${kk}" aria-pressed="${R.onde.includes(kk)}">${esc(t)}</button>`).join('')}</div></fieldset>
          <fieldset class="stz-f"><legend>Imagens de referência <em>(até 6: fotos, prints, capas, fachadas, o que te pega)</em></legend>
            <div class="stz-refimgs">${R.imgs.map((im, i) => `<figure class="stz-refimg">${im.thumb ? `<img src="${esc(im.thumb)}" alt="Referência ${i + 1}">` : `<span class="stz-velho-v">${ico('img')}</span>`}<figcaption>${esc(M.climaImg(im))}<span class="stz-refimg-c">${(im.cores || []).slice(0, 4).map(c => `<i style="--c:${esc(c)}"></i>`).join('')}</span></figcaption><button type="button" class="stz-ic" data-act="stz-ref-tira" data-i="${i}" aria-label="Tirar a referência ${i + 1}">${ico('x')}</button></figure>`).join('')}
              ${R.imgs.length < 6 ? `<button type="button" class="stz-btn stz-refimg-add" data-act="stz-ref-sobe">${ico('img')} ${R.imgs.length ? 'Mais imagens' : 'Subir imagens'}</button>` : ''}</div>
            <small class="stz-nota">As imagens não saem do teu aparelho: o Studio só lê as cores, a luz, o contraste e a textura delas.</small></fieldset>
          ${rs.tem ? `<div class="stz-entendeu"><b>O Studio entendeu</b>${rs.puxa.length ? `<p>Puxa pra: ${rs.puxa.map(esc).join(', ')}.</p>` : ''}${rs.longe.length ? `<p>Fica longe de: ${rs.longe.map(esc).join(', ')}.</p>` : ''}${rs.cores.length ? `<p class="stz-entendeu-c">Cores perto de ${rs.cores.map(c => `<i style="--c:${esc(c)}"></i>`).join('')}</p>` : ''}${rs.semCores.length ? `<p class="stz-entendeu-c">Sem ${rs.semCores.map(c => `<i style="--c:${esc(c)}"></i>`).join('')}</p>` : ''}${rs.peso ? `<p>Letra ${esc(rs.peso)}.</p>` : ''}</div>` : ''}
        </div>` + nav(true, W.modo === 'branding' ? 'Agora o nome' : 'Ver as 6 amostras');
    } else if(k === 'naming'){
      if(!W.nomes.length) geraNomes();
      box.innerHTML = cab('Vamos achar o nome.', 'Cada nome vem com a estratégia e o porquê. Marca os que te pegarem; quando bater, usa.') + `
        <div class="stz-campos"><div class="stz-linha"><label class="stz-f"><span>Palavras que têm a ver <em>(opcional)</em></span><input class="stz-in" id="stz-palavras" maxlength="80" value="${esc(W.palavras)}" placeholder="brasa, norte, família"></label><button type="button" class="stz-btn" data-act="stz-nomes-de-novo">Gerar com elas</button></div></div>
        <div class="stz-nomes" id="stz-nomes">${W.nomes.map(nomeCard).join('')}</div>
        <div class="stz-nav"><button type="button" class="stz-btn ghost" data-act="stz-volta">${ico('prev')} Voltar</button><button type="button" class="stz-btn" data-act="stz-mais-nomes">Mais nomes</button><button type="button" class="stz-btn" data-act="stz-nomes-ia">${ico('magia')} Pedir pra IA</button></div>
        <div class="stz-campos stz-proprio"><div class="stz-linha"><label class="stz-f"><span>Já pensei num nome</span><input class="stz-in" id="stz-nome" maxlength="40" value="${esc(W.nome)}" placeholder="O teu nome"></label><button type="button" class="stz-btn pri" data-act="stz-usa-meu">Usar o meu</button></div></div>`;
    } else if(k === 'amostras'){
      if(!W.amostras.length){
        const r = respostas(), chave = JSON.stringify(Object.assign({}, r, { refs: Object.assign({}, r.refs, { imgs: r.refs.imgs.map(x => [x.l, x.c, x.contr]) }) }));
        if(W.histDe !== chave){ W.histDe = chave; W.hist = []; }
        const vistos = new Set([].concat(...W.hist.slice(0, W.rodada)));
        W.amostras = M.amostras(r, W.rodada, vistos);
        W.hist[W.rodada] = W.amostras.map(M.assinatura); W.hist = W.hist.slice(0, 40); guardaW();
      }
      const nicho = (M.NICHOS[W.nicho] || M.NICHOS.outro).n.toLowerCase();
      box.innerHTML = cab(`Seis caminhos pra ${esc(W.nome.trim())}.`, `Todos coerentes com ${esc(nicho)} e com o sentido do nome. Escolhe um: na bancada dá pra mexer em tudo, da letra à cor.`) + `
        <div class="stz-ams" id="stz-ams">${W.amostras.map(amostraCard).join('')}</div>
        <div class="stz-nav"><button type="button" class="stz-btn ghost" data-act="stz-volta">${ico('prev')} Mexer nas respostas</button><button type="button" class="stz-btn" data-act="stz-mais6">Mais 6 caminhos</button></div>`;
      pintaLogos(C.$('stz-ams'), W.amostras);
    }
    const f = box.querySelector('input.stz-in'); if(f && k !== 'amostras' && k !== 'naming' && matchMedia('(pointer:fine)').matches) setTimeout(() => f.focus(), 30);
  }
  const ROT_EST = k => (M.ESTRATEGIAS[k] || { n: 'Nome' }).n;
  function nomeCard(x, i){
    const fav = W.favs.includes(x.nome), h = M.handleDe(x.nome);
    return `<article class="stz-nm${fav ? ' fav' : ''}"><span class="stz-k">${esc(ROT_EST(x.estrategia))}${x.ia ? ' · IA' : ''}</span><b class="stz-nm-n">${esc(x.nome)}</b><p>${esc(x.porque)}</p>
      <span class="stz-nm-chk">@${esc(h)} · ${esc(h)}.com.br</span>
      <div class="stz-nm-acts"><button type="button" class="stz-ic${fav ? ' on' : ''}" data-act="stz-fav" data-i="${i}" aria-pressed="${fav}" aria-label="Marcar ${esc(x.nome)}">${ico('heart')}</button><button type="button" class="stz-btn sm" data-act="stz-usa-nome" data-i="${i}">Usar esse</button></div></article>`;
  }
  /* v3.40: os nomes novos nunca repetem os que já apareceram (nem os de rodadas atrás) e a lista não encolhe */
  function geraNomes(){
    const fav = W.nomes.filter(x => W.favs.includes(x.nome));
    const evita = new Set(W.nomesVistos.concat(W.nomes.map(x => x.nome.toLowerCase())));
    const novos = M.nomesNovos({ nicho: W.nicho || 'outro', pers: W.pers, cidade: W.cidade, palavras: W.palavras, descr: [W.descr, W.refs.clima, W.refs.marcas].filter(Boolean).join('. '), rodada: W.rodadaN }, evita, 12);
    W.nomes = fav.concat(novos).slice(0, 18);
    W.nomesVistos = W.nomesVistos.concat(novos.map(x => x.nome.toLowerCase())).slice(-400);
    if(novos.length < 5) C.toast('Os nomes desse caminho tão acabando: muda as palavras ali em cima ou pede pra IA.', 4200);
  }
  function amostraCard(sp, i){
    const t = M.TERRITORIOS[sp.territorio], rc = sp.cores.receita || '', ideia = (sp.logo.gesto === 'troca' && sp.logo.trocaPor === 'ideia') || !sp.simbolo || sp.simbolo.tipo === 'nenhum' ? M.gestoTxt(sp) : M.simboloTxt(sp);
    return `<article class="stz-am"><div class="stz-am-art" data-stz-logo data-i="${i}" data-v="${chaveVitrine(sp, i)}"></div>
      <div class="stz-am-tx"><div class="stz-am-k"><span><b>${String(i + 1).padStart(2, '0')}</b> ${esc(t.n)}</span><span>${esc(rc)}</span></div><p>${esc(ideia)}</p>${chipsCor(sp.cores)}
      <div class="stz-am-acts"><button type="button" class="stz-btn pri sm" data-act="stz-escolhe" data-i="${i}">Escolher essa</button><button type="button" class="stz-btn ghost sm" data-act="stz-perto" data-i="${i}">Ver de perto</button></div></div></article>`;
  }
  async function pertoSheet(i){
    const sp = W.amostras[i]; if(!sp) return;
    const fs = await H.fs(sp), t = M.TERRITORIOS[sp.territorio], pq = M.porque(sp), vs = M.versoes(sp.cores);
    const caixa = (v, a) => { const r = H.svg(sp, fs, { versao: v, arranjo: a }); return `<span class="stz-pv" style="background:${esc(r.v.fundo)}">${r.svg}</span>`; };
    C.sheet(`<div class="stz-perto"><div class="sheet-head"><h2>${esc(t.n)} <small>${esc(t.frase)}</small></h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <div class="stz-perto-g">${caixa(chaveVitrine(sp, 0))}${caixa('negativo')}${caixa('cor')}${caixa(chaveVitrine(sp, 0), 'simbolo')}</div>
      <dl class="stz-dl"><dt>A ideia</dt><dd>${esc(M.gestoTxt(sp))}</dd><dt>O símbolo</dt><dd>${esc(pq.simbolo)}</dd><dt>A letra</dt><dd>${esc(pq.letra)}</dd><dt>As cores</dt><dd>${esc(pq.cor)}</dd></dl>
      ${chipsCor(sp.cores)}
      <div class="acts"><button type="button" class="stz-btn pri" data-act="stz-escolhe" data-i="${i}">Escolher essa</button></div></div>`, 'wide stz-sheet');
    void vs;
  }
  const marcaBotao = (el, attr) => el.parentElement.querySelectorAll('[data-act="' + el.dataset.act + '"]').forEach(b => { const on = b === el; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); if(attr) b.removeAttribute(attr); });
  /* escolhe até n imagens (o seletor do aparelho, com várias de uma vez) */
  const escolheImagens = n => new Promise(ok => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.multiple = true;
    i.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0';
    let feito = false; const fim = fs => { if(feito) return; feito = true; i.remove(); ok(fs); };
    i.addEventListener('change', () => fim([...(i.files || [])].filter(f => /^image\//.test(f.type)).slice(0, Math.max(0, n))));
    i.addEventListener('cancel', () => fim([]));
    document.body.appendChild(i); i.click();
  });
  const lerImagem = f => new Promise((ok, falha) => { const u = URL.createObjectURL(f), im = new Image(); im.onload = () => ok({ im, u }); im.onerror = () => { URL.revokeObjectURL(u); falha({ code: 'tipo' }); }; im.src = u; });
  Object.assign(C.acts, {
    'stz-nicho': el => { W.nicho = el.dataset.k; marcaBotao(el); W.amostras = []; guardaW(); },
    'stz-letra': el => { W.letra = el.dataset.k; marcaBotao(el); W.amostras = []; guardaW(); },
    'stz-cor': el => { W.cor = el.dataset.c || ''; W.manterCor = !!W.cor; marcaBotao(el); const l = document.querySelector('.stz-cor.livre'); if(l) l.classList.remove('on'); W.amostras = []; guardaW(); },
    'stz-mantem': el => { leCampos(); const c = el.dataset.c; if(W.cor === c && W.manterCor){ W.cor = ''; W.manterCor = false; } else { W.cor = c; W.manterCor = true; } W.amostras = []; passo(); },
    /* rebranding: o logo de hoje só é lido aqui (as cores); não sobe pra lugar nenhum */
    'stz-sobe': async () => {
      leCampos();
      const f = await C.pickFile('image/*'); if(!f) return;
      try{
        const { im, u } = await lerImagem(f);
        const cv = document.createElement('canvas'), k = Math.min(1, 320 / Math.max(im.naturalWidth || 1, im.naturalHeight || 1));
        cv.width = Math.max(1, Math.round((im.naturalWidth || 1) * k)); cv.height = Math.max(1, Math.round((im.naturalHeight || 1) * k));
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); URL.revokeObjectURL(u);
        const img = cv.toDataURL('image/png'), cores = M.coresDaImagem(cv);
        W.velho = { img, cores };
        if(cores.length){ W.cor = cores[0].hex; W.manterCor = true; }
        W.amostras = []; passo();
        if(!cores.length) C.toast('Não deu pra ler as cores dessa imagem. Dá pra escolher a cor no próximo passo.', 4200);
      }catch(e){ C.toast('Não deu pra abrir essa imagem.'); }
    },
    'stz-segue': () => {
      leCampos();
      const k = PASSOS[W.modo][W.passo];
      if(k === 'negocio' && !W.nicho){ C.toast('Escolhe do que é o negócio.'); return; }
      if((k === 'nome' || k === 'atual') && !W.nome.trim()){ C.toast('Coloca o nome da marca.'); const n = C.$('stz-nome'); if(n) n.focus(); return; }
      W.passo = Math.min(PASSOS[W.modo].length - 1, W.passo + 1); W.amostras = []; passo(); window.scrollTo(0, 0);
    },
    'stz-volta': () => { leCampos(); W.passo = Math.max(0, W.passo - 1); passo(); window.scrollTo(0, 0); },
    'stz-fav': el => { const x = W.nomes[Number(el.dataset.i)]; if(!x) return; const i = W.favs.indexOf(x.nome); if(i >= 0) W.favs.splice(i, 1); else W.favs.push(x.nome); const on = W.favs.includes(x.nome); el.classList.toggle('on', on); el.setAttribute('aria-pressed', String(on)); el.closest('.stz-nm').classList.toggle('fav', on); guardaW(); },
    'stz-usa-nome': el => {
      leCampos(); const x = W.nomes[Number(el.dataset.i)]; if(!x) return;
      W.nome = x.nome;
      W.naming = { nome: x.nome, estrategia: x.estrategia, porque: x.porque, outros: W.favs.filter(n => n !== x.nome).concat(W.nomes.map(y => y.nome)).filter((n, i, a) => n !== x.nome && a.indexOf(n) === i).slice(0, 5) };
      W.passo = PASSOS[W.modo].indexOf('amostras'); W.amostras = []; passo(); window.scrollTo(0, 0);
    },
    'stz-usa-meu': () => {
      leCampos(); const n = W.nome.trim(); if(!n){ C.toast('Escreve o nome.'); return; }
      W.naming = { nome: n, estrategia: 'proprio', porque: '', outros: W.favs.slice(0, 5) };
      W.passo = PASSOS[W.modo].indexOf('amostras'); W.amostras = []; passo(); window.scrollTo(0, 0);
    },
    'stz-mais-nomes': () => { leCampos(); W.rodadaN++; geraNomes(); passo(); },
    'stz-nomes-de-novo': () => { leCampos(); W.rodadaN++; W.nomes = W.nomes.filter(x => W.favs.includes(x.nome)); geraNomes(); passo(); },
    'stz-nomes-ia': async el => {
      leCampos(); el.disabled = true; el.textContent = 'Pensando…';
      try{
        const r = await C.iaFn({ acao: 'nomes', ctx: { negocio: (M.NICHOS[W.nicho] || M.NICHOS.outro).n, descr: W.descr, cidade: W.cidade, pers: W.pers, palavras: W.palavras, clima: W.refs.clima, nao: W.refs.nao, marcas: W.refs.marcas, ja: W.nomesVistos.slice(-12).concat(W.nomes.map(x => x.nome)).slice(-12) } }, { oque: 'mais nomes' });
        const ja = new Set(W.nomes.map(x => x.nome.toLowerCase()).concat(W.nomesVistos));
        const novos = (r.nomes || []).filter(x => x && x.nome && !ja.has(String(x.nome).toLowerCase())).map(x => ({ nome: x.nome, estrategia: M.ESTRATEGIAS[x.estrategia] ? x.estrategia : 'evocativo', porque: x.porque || '', ia: true }));
        W.nomes = novos.concat(W.nomes).slice(0, 24); W.nomesVistos = W.nomesVistos.concat(novos.map(x => x.nome.toLowerCase())).slice(-400); passo();
        if(!novos.length) C.toast('A IA não trouxe nada novo dessa vez.');
      }catch(e){ C.toast(erroIA(e), 4200); passo(); }
    },
    'stz-mais6': () => { W.rodada++; W.amostras = []; passo(); window.scrollTo(0, 0); },
    /* v3.40: as referências */
    'stz-ref-cor': el => { leCampos(); const R = W.refs, c = el.dataset.c, i = R.cores.indexOf(c); if(i >= 0) R.cores.splice(i, 1); else { if(R.cores.length >= 4) R.cores.shift(); R.cores.push(c); R.naoCores = R.naoCores.filter(x => x !== c); } W.amostras = []; passo(); },
    'stz-ref-naocor': el => { leCampos(); const R = W.refs, c = el.dataset.c, i = R.naoCores.indexOf(c); if(i >= 0) R.naoCores.splice(i, 1); else { R.naoCores.push(c); R.cores = R.cores.filter(x => x !== c); } W.amostras = []; passo(); },
    'stz-ref-peso': el => { leCampos(); W.refs.peso = el.dataset.k || ''; W.amostras = []; passo(); },
    'stz-ref-onde': el => { leCampos(); const R = W.refs, k = el.dataset.k, i = R.onde.indexOf(k); if(i >= 0) R.onde.splice(i, 1); else R.onde.push(k); W.amostras = []; passo(); },
    'stz-ref-tira': el => { leCampos(); W.refs.imgs.splice(Number(el.dataset.i), 1); W.amostras = []; passo(); },
    'stz-ref-sobe': async () => {
      leCampos();
      const fs = await escolheImagens(6 - W.refs.imgs.length); if(!fs.length) return;
      let falhou = 0;
      for(const f of fs){
        try{
          const { im, u } = await lerImagem(f), lido = M.lerImagemRef(im);
          const cv = document.createElement('canvas'), k = Math.min(1, 160 / Math.max(im.naturalWidth || 1, im.naturalHeight || 1));
          cv.width = Math.max(1, Math.round((im.naturalWidth || 1) * k)); cv.height = Math.max(1, Math.round((im.naturalHeight || 1) * k));
          cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); URL.revokeObjectURL(u);
          if(!lido){ falhou++; continue; }
          W.refs.imgs.push(Object.assign({ thumb: cv.toDataURL('image/jpeg', .72) }, lido));
        }catch(e){ falhou++; }
      }
      W.refs.imgs = W.refs.imgs.slice(0, 6); W.amostras = []; passo();
      if(falhou) C.toast(falhou === 1 ? 'Uma imagem não abriu.' : falhou + ' imagens não abriram.', 3000);
    },
    'stz-perto': el => pertoSheet(Number(el.dataset.i)),
    'stz-escolhe': async el => {
      const sp = W && W.amostras[Number(el.dataset.i)]; if(!sp) return;
      document.querySelectorAll('[data-act="stz-escolhe"]').forEach(b => { b.disabled = true; });
      try{
        const spec = Object.assign({}, sp, { descr: W.descr.trim(), refs: refsLimpas() }); delete spec.rf;
        const m = await H.criar({ nome: sp.nome, modo: respostas().modo, spec, voz: M.vozLocal(spec), naming: W.naming || {} });
        C.closeSheet(); W = null; try{ sessionStorage.removeItem(WK); }catch(e){}
        C.go('#/houzi/m/' + m.id);
      }catch(e){ C.toast(H.erroTxt(e, 'Não deu pra guardar a marca agora.')); document.querySelectorAll('[data-act="stz-escolhe"]').forEach(b => { b.disabled = false; }); }
    }
  });

  /* ---------- #/houzi/m/ID: a bancada ---------- */
  let B = null;
  const ABAS = [['ideia', 'Ideia'], ['simbolo', 'Símbolo'], ['letra', 'Letra'], ['cores', 'Cores'], ['textos', 'Textos'], ['dados', 'Dados']];
  const VERSOES = [['', 'Principal'], ['negativo', 'Negativo'], ['cor', 'Na cor'], ['preto', 'Uma cor']];
  const ARRANJOS = [['horizontal', 'Horizontal'], ['vertical', 'Empilhado'], ['wordmark', 'Só o nome'], ['simbolo', 'Só o símbolo'], ['selo', 'Selo'], ['placa', 'Placa']];
  const SIMBS = [['nenhum', 'Sem símbolo'], ['ideia', 'Ideia (marca mínima)'], ['letra', 'A inicial'], ['monograma', 'Monograma'], ['emblema', 'Emblema'], ['orbita', 'Órbita'], ['geo', 'Geométrico'], ['pixel', 'Pixel'], ['icone', 'Ícone']];
  const SEPS = [['/', 'Barra /'], ['_', 'Sublinhado _'], ['.', 'Ponto .'], ['·', 'Ponto no meio ·'], ['—', 'Travessão —'], ['+', 'Mais +']];
  const TROCAS = [['circulo', 'Círculo'], ['anel', 'Anel'], ['alvo', 'Alvo'], ['ideia', 'O símbolo'], ['icone', 'O ícone']];
  const opcoes = (lista, v) => lista.map(([k, t]) => `<option value="${esc(k)}"${String(v == null ? '' : v) === k ? ' selected' : ''}>${esc(t)}</option>`).join('');
  const pega = (o, caminho) => caminho.split('.').reduce((x, k) => x == null ? x : x[k], o);
  const poe = (o, caminho, v) => { const ks = caminho.split('.'), u = ks.pop(); const alvo = ks.reduce((x, k) => (x[k] = x[k] && typeof x[k] === 'object' ? x[k] : {}), o); alvo[u] = v; };

  async function bancada(app, id){
    document.title = 'Bancada · Studio Houzi';
    app.innerHTML = C.header('houzi') + `<main class="stz stz-banc"><p class="stz-carrega">Abrindo a bancada…</p></main>`;
    const rota = C.rota;
    let m = null; try{ m = await H.ler(id); if(m) await H.lerPrivado(m); }catch(e){}
    if(rota !== C.rota) return;
    if(!m){ app.querySelector('.stz-banc').innerHTML = `<section class="stz-vazio"><h2>Essa marca não tá aqui.</h2><p>Pode ter sido apagada, ou é de outra pessoa.</p><a class="stz-btn" href="#/houzi">Voltar pro Studio</a></section>`; return; }
    if(!ehLocal(m) && m.dono !== C.uid()){ C.go('#/bb/' + m.slug); return; }
    m.spec = m.spec || {}; m.voz = m.voz && typeof m.voz === 'object' ? m.voz : {}; m.naming = m.naming && typeof m.naming === 'object' ? m.naming : {};
    B = { m, versao: '', arranjo: '', aba: 'ideia', giro: 0, variante: 0, fontesTodas: null };
    const t = M.TERRITORIOS[m.spec.territorio] || {};
    document.title = m.nome + ' · Studio Houzi';
    app.querySelector('.stz-banc').innerHTML = `
      <header class="stz-bh"><a class="stz-voltar" href="#/houzi">${ico('prev')} Studio Houzi</a>
        <div class="stz-bh-t"><span class="stz-k" id="stz-bh-k">${esc(H.numero(m))} · ${esc(t.n || '')}</span><h1 id="stz-bh-n">${esc(m.nome)}</h1></div>
        <span class="stz-salvo" id="stz-salvo" aria-live="polite">${ehLocal(m) ? 'Neste aparelho' : 'Salvo'}</span></header>
      <div class="stz-bgrid">
        <section class="stz-palco" aria-label="O logo">
          <div class="stz-tela" id="stz-tela"></div>
          <div class="stz-seg" role="group" aria-label="Versão">${VERSOES.map(([k, n]) => `<button type="button" data-act="stz-versao" data-k="${k}" aria-pressed="${B.versao === k}">${esc(n)}</button>`).join('')}</div>
          <div class="stz-seg" role="group" aria-label="Arranjo">${ARRANJOS.map(([k, n]) => `<button type="button" data-act="stz-arranjo" data-k="${k}" aria-pressed="false">${esc(n)}</button>`).join('')}</div>
          <div class="stz-minis" id="stz-minis"></div>
          <div class="stz-acoes">
            <a class="stz-btn pri" href="#/bb/${esc(m.slug || m.id)}">${ico('ext')} Ver o brandbook</a>
            <button type="button" class="stz-btn" data-act="stz-publica" id="stz-pub">${m.publica ? 'Publicada' : 'Publicar'}</button>
            <button type="button" class="stz-btn" data-act="stz-kit">${ico('down')} Kit da marca (ZIP)</button>
            <button type="button" class="stz-btn" data-act="stz-pdf">${ico('down')} Brandbook (PDF)</button>
            <button type="button" class="stz-btn" data-act="stz-portfolio">${ico('marcas')} Levar pro portfólio</button>
            <button type="button" class="stz-btn ghost" data-act="stz-apaga" id="stz-apaga">${ico('trash')} Apagar</button>
          </div>
        </section>
        <aside class="stz-ctrl" aria-label="Ajustes">
          <nav class="stz-abas" role="tablist">${ABAS.map(([k, n]) => `<button type="button" role="tab" data-act="stz-aba" data-k="${k}" aria-selected="${B.aba === k}">${esc(n)}</button>`).join('')}</nav>
          <div id="stz-aba" class="stz-aba"></div>
        </aside>
      </div>`;
    const aba = C.$('stz-aba');
    aba.addEventListener('input', e => muda(e.target, false));
    aba.addEventListener('change', e => muda(e.target, true));
    desenhaAba(); await desenhaTela();
  }
  /* o palco: o logo grande e os testes pequenos (avatar, ícone de app, favicon e o tamanho mínimo) */
  async function desenhaTela(){
    if(!B) return;
    const m = B.m, sp = m.spec, tela = C.$('stz-tela'); if(!tela) return;
    let fs; try{ fs = await H.fs(sp); }catch(e){ tela.innerHTML = '<p class="stz-falha">A letra não carregou. Atualiza a página.</p>'; return; }
    if(!B || B.m !== m) return;
    const arr = B.arranjo || sp.logo.arranjo;
    const r = H.svg(sp, fs, { versao: B.versao || undefined, arranjo: arr });
    tela.style.background = r.v.fundo; tela.innerHTML = r.svg;
    const temSimb = !!(sp.simbolo && sp.simbolo.tipo && sp.simbolo.tipo !== 'nenhum');
    document.querySelectorAll('[data-act="stz-arranjo"]').forEach(b => { b.setAttribute('aria-pressed', String(b.dataset.k === arr)); b.hidden = !temSimb && (b.dataset.k === 'horizontal' || b.dataset.k === 'vertical') && b.dataset.k !== arr; });
    document.querySelectorAll('[data-act="stz-versao"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === B.versao)));
    const vs = M.versoes(sp.cores), simb = M.logo(sp, fs, 'simbolo'), cor = vs.cor;
    const caixa = (lg, v, w, h, fundo, alinha) => M.svg(M.logoNaCaixa(lg, v, w * 0.14, h * 0.14, w * 0.72, h * 0.72, fundo, alinha), { vb: { x: 0, y: 0, w, h }, fundo });
    const pequeno = M.logo(sp, fs, sp.logo.arranjo);
    C.$('stz-minis').innerHTML = `
      <figure><span class="stz-mini av">${caixa(simb, cor, 100, 100, cor.fundo)}</span><figcaption>Avatar</figcaption></figure>
      <figure><span class="stz-mini app">${caixa(simb, vs.negativo, 100, 100, vs.negativo.fundo)}</span><figcaption>Ícone de app</figcaption></figure>
      <figure><span class="stz-mini fav">${M.svg(M.logoNaCaixa(simb, vs.principal, 1, 1, 30, 30, vs.principal.fundo), { vb: { x: 0, y: 0, w: 32, h: 32 }, fundo: vs.principal.fundo, w: 32, h: 32 })}${M.svg(M.logoNaCaixa(simb, vs.principal, 0.5, 0.5, 15, 15, vs.principal.fundo), { vb: { x: 0, y: 0, w: 16, h: 16 }, fundo: vs.principal.fundo, w: 16, h: 16 })}</span><figcaption>Favicon 32 e 16</figcaption></figure>
      <figure><span class="stz-mini min" style="background:${esc(M.versaoPrincipal(sp).fundo)}">${M.logoSvg(pequeno, M.versaoPrincipal(sp), { w: 96 })}</span><figcaption>Tamanho mínimo</figcaption></figure>`;
  }
  let desenhaT = 0, salvaT = 0;
  const redesenha = () => { clearTimeout(desenhaT); desenhaT = setTimeout(desenhaTela, 60); };
  const salvaLogo = () => {
    if(!B) return; const m = B.m, s = C.$('stz-salvo'); if(s) s.textContent = 'Salvando…';
    clearTimeout(salvaT);
    salvaT = setTimeout(async () => {
      try{ await H.salvar(m, { nome: m.nome, spec: m.spec, voz: m.voz, naming: m.naming }); const s2 = C.$('stz-salvo'); if(s2) s2.textContent = ehLocal(m) ? 'Neste aparelho' : 'Salvo'; }
      catch(e){ const s2 = C.$('stz-salvo'); if(s2) s2.textContent = 'Não salvou'; C.toast(H.erroTxt(e, 'Não deu pra salvar agora.')); }
    }, 900);
  };
  /* mexeu no desenho: os textos de conceito da IA ficam velhos (o Studio refaz os dele sozinho) */
  const mexeu = (desenho, aba) => { if(desenho && B.m.voz && B.m.voz.textos) B.m.voz.textos = null; redesenha(); salvaLogo(); if(aba) desenhaAba(); };
  /* v3.41 · as personas na aba Textos: cada campo grava a persona inteira (a do Studio + a mudança), pra uma marca antiga
     não ficar só com o campo mexido. Lista é uma por linha. */
  function personasCampos(){
    const P = H.personas(B.m), b = P.buyer, g = P.brand;
    const f = (q, k, rot, rows, max) => { const v = (q === 'buyer' ? b : g)[k], lista = Array.isArray(v); return rows ? `<label class="stz-f"><span>${rot}</span><textarea class="stz-in" rows="${rows}" data-p="${q}.${k}"${max ? ` maxlength="${max}"` : ''}>${esc(lista ? v.join('\n') : v || '')}</textarea></label>` : `<label class="stz-f"><span>${rot}</span><input class="stz-in" data-p="${q}.${k}" value="${esc(v || '')}"${max ? ` maxlength="${max}"` : ''}></label>`; };
    return `<fieldset class="stz-f stz-persona"><legend>Pra quem: a buyer persona</legend>
        <p class="stz-nota">O cliente ideal da marca: uma pessoa inventada que resume quem compra. É retrato, não pesquisa. Apagou um campo? Volta o do Studio.</p>
        ${f('buyer', 'nome', 'Apelido', 0, 30)}${f('buyer', 'perfil', 'Quem é (idade em faixa, rotina, onde o dia cruza com a marca)', 3, 320)}
        ${f('buyer', 'quer', 'O que procura (uma por linha, até 4)', 3)}${f('buyer', 'dores', 'O que incomoda hoje (uma por linha, até 4)', 3)}${f('buyer', 'onde', 'Onde encontra a marca (uma por linha, até 4)', 3)}
        ${f('buyer', 'decide', 'O que faz escolher e voltar', 2, 200)}${f('buyer', 'frase', 'Uma frase que essa pessoa diria', 2, 120)}</fieldset>
      <fieldset class="stz-f stz-persona"><legend>Se a marca fosse gente: a brand persona</legend>
        <p class="stz-nota">A marca como pessoa, no arquétipo ${esc(g.arquetipo || '')}: quem seria, como age, do que gosta, como trata o cliente.</p>
        ${f('brand', 'retrato', 'Quem seria', 3, 320)}${f('brand', 'jeito', 'Como age (uma por linha, até 4)', 3)}${f('brand', 'gosta', 'Do que gosta (uma por linha, até 4)', 3)}
        ${f('brand', 'com_o_cliente', 'Como trata o cliente', 2, 200)}${f('brand', 'frase', 'Uma frase dela, em primeira pessoa', 2, 120)}</fieldset>`;
  }
  function muda(el, fim){
    if(!B || !el || !el.dataset) return;
    const sp = B.m.spec;
    if(el.dataset.p){ /* as personas (v3.41) */
      const [q, k] = el.dataset.p.split('.'), chave = q === 'brand' ? 'brand_persona' : 'buyer_persona', atual = H.personas(B.m)[q === 'brand' ? 'brand' : 'buyer'];
      if(!atual || !(k in atual) || k === 'arquetipo') return;
      if(q !== 'brand' && B.m._privErro){ C.toast('Não deu pra abrir o teu "Pra quem" agora. Recarrega a página antes de mexer nele.', 4600); return; }
      const nova = Object.assign({}, atual, { [k]: Array.isArray(atual[k]) ? el.value.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 4) : el.value });
      delete nova.arquetipo;
      if(!B.m.voz || !B.m.voz.conceito) B.m.voz = Object.assign({}, H.voz(B.m), B.m.voz || {});
      B.m.voz[chave] = nova;
      salvaLogo(); return;
    }
    if(el.dataset.v){ /* textos (voz) */
      const k = el.dataset.v, v = H.voz(B.m); let val = el.value;
      if(/\.(\d+)$/.test(k)){ const [kk, i] = k.split('.'); const l = (v[kk] || []).slice(); l[Number(i)] = val; val = l; poe(B.m, 'voz.' + kk, val); }
      else if(['e', 'nao_e'].includes(k)) poe(B.m, 'voz.' + k, val.split(',').map(s => s.trim()).filter(Boolean));
      else if(['fala', 'nao_fala'].includes(k)) poe(B.m, 'voz.' + k, val.split('\n').map(s => s.trim()).filter(Boolean));
      else poe(B.m, 'voz.' + k, val);
      if(!B.m.voz.conceito) B.m.voz = Object.assign({}, v, B.m.voz);
      salvaLogo(); return;
    }
    const k = el.dataset.k; if(!k) return;
    let val = el.type === 'checkbox' ? el.checked : el.type === 'range' ? Number(el.value) : el.value;
    if(k === 'territorio'){ if(fim) mudaTerritorio(val); return; }
    if(el.type !== 'range' && el.type !== 'color' && !fim && el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') return;
    if(k === 'nome'){
      B.m.nome = String(val).slice(0, 40); sp.nome = B.m.nome; const n = C.$('stz-bh-n'); if(n) n.textContent = B.m.nome || ' ';
      /* renomeou: o naming do brandbook passa a ser o nome novo (o porquê do nome antigo não vale mais pra ele) */
      const nm = B.m.naming; if(nm && nm.nome && B.m.nome.trim() && nm.nome !== B.m.nome.trim()){ const antes = nm.nome; B.m.naming = { nome: B.m.nome.trim(), estrategia: 'proprio', porque: '', outros: [antes].concat(nm.outros || []).filter((x, i, a) => x && x !== B.m.nome.trim() && a.indexOf(x) === i).slice(0, 5) }; }
    }
    else if(k.startsWith('cores.')){ poe(sp, k, String(val).toUpperCase()); if(k !== 'cores.fundo'){ sp.cores.receita = ''; sp.cores.esquema = 'livre'; } if(fim) desenhaAba(); }
    else poe(sp, k, val);
    const refazAba = fim && /^(simbolo\.tipo|logo\.gesto|simbolo\.icone|simbolo\.forma)$/.test(k);
    mexeu(!/^(nome|tagline|cidade|desde|descr|nicho)$/.test(k), refazAba);
  }
  function mudaTerritorio(k, outra){
    const sp = B.m.spec, r = { nome: sp.nome, tagline: sp.tagline || '', nicho: sp.nicho, pers: sp.pers || [.5, .5, .5, .5, .5], cor: sp.cores && !sp.cores.receita ? sp.cores.p : '', manterCor: !!(sp.cores && !sp.cores.receita), cidade: sp.cidade || '', desde: sp.desde || '', modo: sp.modo, palavras: '', descr: sp.descr || '', refs: sp.refs || null };
    if(outra) B.variante++; else B.variante = 0;
    /* v3.40: "Outra versão" não repete uma versão que já passou pela bancada */
    if(!B.vistosT) B.vistosT = new Set([M.assinatura(sp)]);
    let novo = null;
    for(let tenta = 0; tenta < 14; tenta++){
      novo = M.aplicaTerritorio(k, r, M.hash(sp.nome + ':' + k + ':bancada:' + (++B.giro)), 0, null, B.variante);
      if(!outra || !B.vistosT.has(M.assinatura(novo))) break;
      B.variante++;
    }
    B.vistosT.add(M.assinatura(novo));
    novo.descr = sp.descr || ''; novo.amostra = sp.amostra || 0; if(sp.refs) novo.refs = sp.refs;
    B.m.spec = novo; B.arranjo = '';
    const kk = C.$('stz-bh-k'); if(kk) kk.textContent = H.numero(B.m) + ' · ' + (M.TERRITORIOS[k] || {}).n;
    mexeu(true, true);
  }
  /* os painéis de ajuste */
  function desenhaAba(){
    const box = C.$('stz-aba'); if(!box || !B) return;
    const sp = B.m.spec, L = sp.logo || {}, S = sp.simbolo || {}, a = B.aba;
    document.querySelectorAll('[data-act="stz-aba"]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.k === a)));
    const sel = (k, lista, rot) => `<label class="stz-f"><span>${rot}</span><select class="stz-in" data-k="${k}">${opcoes(lista, pega(sp, k))}</select></label>`;
    const campo = (k, rot, o) => `<label class="stz-f"><span>${rot}</span><input class="stz-in" data-k="${k}" value="${esc(pega(sp, k) || '')}" maxlength="${(o && o.max) || 60}"${o && o.ph ? ` placeholder="${esc(o.ph)}"` : ''}></label>`;
    if(a === 'ideia'){
      const campos = M.sentido(sp.nome, sp.tagline, ''), rank = M.ranking(sp.pers || [.5, .5, .5, .5, .5], sp.nicho, campos), ok = new Set(rank.filter(x => !x.veta && x.coer + x.sem >= 0).map(x => x.k));
      const ts = Object.entries(M.TERRITORIOS).map(([k, t]) => [k, t.n + (ok.has(k) ? '' : ' · fora do conceito')]);
      const t = M.TERRITORIOS[sp.territorio] || {};
      box.innerHTML = `<p class="stz-nota"><b>${esc(t.n || '')}</b> · ${esc(t.frase || '')}</p>
        <label class="stz-f"><span>Território</span><select class="stz-in" data-k="territorio">${opcoes(ts, sp.territorio)}</select></label>
        <button type="button" class="stz-btn sm" data-act="stz-outra">Outra versão deste território</button>
        ${sel('logo.gesto', Object.entries(M.GESTOS), 'A ideia do nome (gesto)')}
        ${L.gesto === 'separador' ? sel('logo.sep', SEPS, 'O sinal no lugar do espaço') : ''}
        ${L.gesto === 'troca' ? sel('logo.trocaPor', TROCAS, 'O "O" vira') : ''}
        ${L.gesto === 'destaque' ? sel('logo.destaque', [['primeira', 'A primeira letra'], ['vogal', 'Uma vogal'], ['ultima', 'A última letra']], 'A letra em destaque') : ''}
        ${L.gesto === 'fios' ? `<label class="stz-chk"><input type="checkbox" data-k="logo.fiosTexto"${L.fiosTexto ? ' checked' : ''}> A cidade ou o ano no fio de baixo</label>` : ''}
        ${sel('logo.arranjo', ARRANJOS.filter(x => x[0] !== 'simbolo'), 'Assinatura principal')}
        ${sel('logo.efeito', [['', 'Nenhum'], ['inclinado', 'Inclinado'], ['sombra', 'Sombra'], ['contorno', 'Contorno']], 'Efeito')}
        <div class="stz-2">${sel('logo.corTexto', [['texto', 'Tinta'], ['marca', 'Cor da marca']], 'Cor do nome')}${sel('logo.corGesto', [['acento', 'Acento'], ['marca', 'Cor da marca'], ['texto', 'Tinta']], 'Cor do gesto')}</div>
        <label class="stz-chk"><input type="checkbox" data-k="logo.tagline"${L.tagline ? ' checked' : ''}${String(sp.tagline || '').trim() ? '' : ' disabled'}> A frase embaixo do logo${String(sp.tagline || '').trim() ? '' : ' (põe uma frase em Dados)'}</label>
        <p class="stz-nota">${esc(M.gestoTxt(sp))}</p>`;
    } else if(a === 'simbolo'){
      const tipo = S.tipo || 'nenhum';
      box.innerHTML = `${sel('simbolo.tipo', SIMBS, 'Tipo de símbolo')}
        ${tipo === 'ideia' ? `<div class="stz-ideias" role="group" aria-label="As ideias">${Object.entries(M.IDEIAS).map(([k, x]) => `<button type="button" class="stz-ideia${S.ideia === k ? ' on' : ''}" data-act="stz-ideia" data-k="${k}" aria-pressed="${S.ideia === k}" title="${esc(x.n)}">${M.svg(M.pinta({ els: M.ideia(k, S.estilo) }, { marca: 'currentColor', acento: 'currentColor', texto: 'currentColor', sec: 'currentColor', furo: '#000', tinta: '#000', papel: '#fff' }), { vb: { x: -6, y: -6, w: 112, h: 112 } })}<span>${esc(x.n)}</span></button>`).join('')}</div>
          ${sel('simbolo.estilo', [['', 'Cheio'], ['linha', 'Em linha']], 'Desenho')}` : ''}
        ${tipo === 'letra' ? sel('simbolo.detalhe', [['barra', 'Faixa embaixo'], ['corte', 'Corte na diagonal'], ['fatia', 'Fatiada'], ['sombra', 'Sombra'], ['ponto', 'Ponto']], 'Detalhe da inicial') : ''}
        ${tipo === 'monograma' || tipo === 'emblema' ? `${sel('simbolo.forma', Object.entries(M.FORMAS).map(([k, f]) => [k, f.n]), 'Forma')}${campo('simbolo.letras', 'Letras', { max: 3, ph: M.iniciais(sp.nome) })}${tipo === 'monograma' ? sel('simbolo.estilo', [['', 'Cheio'], ['contorno', 'Contorno'], ['liga', 'Sobreposto']], 'Desenho') : ''}` : ''}
        ${tipo === 'icone' ? `${sel('simbolo.icone', Object.entries(M.ICONES).map(([k, f]) => [k, f.n]), 'Ícone')}${sel('simbolo.forma', [['nenhuma', 'Sem forma']].concat(Object.entries(M.FORMAS).map(([k, f]) => [k, f.n])), 'Dentro de')}` : ''}
        ${tipo === 'pixel' ? `${sel('simbolo.icone', Object.entries(M.ICONES).map(([k, f]) => [k, f.n]), 'Desenho')}${sel('simbolo.forma', [['', 'Solto'], ['moldura', 'Com moldura']], 'Moldura')}` : ''}
        ${tipo === 'geo' ? `<button type="button" class="stz-btn sm" data-act="stz-geo">Embaralhar as peças</button>` : ''}
        <p class="stz-nota">${esc(M.simboloTxt(sp))}</p>`;
    } else if(a === 'letra'){
      const fontes = M.FONTES.filter(f => f.d);
      box.innerHTML = `<div class="stz-fontes" id="stz-fontes">${fontes.map(f => `<button type="button" class="stz-fonte${sp.tipo.display === f.id ? ' on' : ''}" data-act="stz-fonte" data-k="${f.id}" aria-pressed="${sp.tipo.display === f.id}"><span class="stz-fonte-a" data-f="${f.id}"></span><small>${esc(f.k || f.n)}</small></button>`).join('')}</div>
        ${sel('logo.caixa', [['alta', 'MAIÚSCULAS'], ['baixa', 'minúsculas'], ['titulo', 'Primeira Maiúscula']], 'Caixa')}
        <label class="stz-f"><span>Espaço entre as letras</span><input type="range" class="stz-rg" min="-0.06" max="0.3" step="0.005" data-k="logo.track" value="${Number(L.track) || 0}"></label>
        ${sel('tipo.texto', M.FONTES.filter(f => !f.d).map(f => [f.id, f.k || f.n]), 'Letra de texto (cardápio, site, legenda)')}
        <p class="stz-nota">${esc(M.porque(sp).letra)}</p>`;
      desenhaFontes();
    } else if(a === 'cores'){
      const c = sp.cores, t = M.TERRITORIOS[sp.territorio] || {}, rot = { p: 'Cor da marca', s: 'Apoio', a: 'Acento', ink: 'Tinta (texto)', paper: 'Papel (fundo)' };
      const par = (x, y, n) => { const r = M.contraste(c[x], c[y]); return `<li><i style="background:${esc(c[y])};color:${esc(c[x])}">Aa</i>${esc(n)} <b>${String(Math.round(r * 10) / 10).replace('.', ',')}:1</b> <span>${esc(M.nivelContraste(r))}</span></li>`; };
      box.innerHTML = `<div class="stz-cores">${['p', 's', 'a', 'ink', 'paper'].map(k => `<label class="stz-cor-e"><input type="color" data-k="cores.${k}" value="${esc(c[k])}"><span><b>${esc(rot[k])}</b><small>${esc(M.nomeCor(c[k], sp.nome))} · ${esc(c[k])}</small></span></label>`).join('')}</div>
        ${(t.receitas || []).length ? `<p class="stz-sub">Receitas do território ${esc(t.n)}</p><div class="stz-receitas">${t.receitas.map(r => `<button type="button" class="stz-receita${c.receita === r.n ? ' on' : ''}" data-act="stz-receita" data-n="${esc(r.n)}">${chipsCor(r)}<span>${esc(r.n)}</span></button>`).join('')}</div>` : ''}
        ${sel('cores.fundo', [['paper', 'Papel'], ['ink', 'Tinta (escuro)'], ['p', 'Cor da marca']], 'Fundo da versão principal')}
        <ul class="stz-contraste">${par('ink', 'paper', 'Texto no papel')}${par('p', 'paper', 'Marca no papel')}${par('paper', 'p', 'Papel na marca')}</ul>
        <p class="stz-nota">${esc(M.porque(sp).cor)}</p>`;
    } else if(a === 'textos'){
      const v = H.voz(B.m), tx = (k, rot, rows) => `<label class="stz-f"><span>${rot}</span><textarea class="stz-in" rows="${rows || 3}" data-v="${k}">${esc(Array.isArray(v[k]) ? v[k].join(['fala', 'nao_fala'].includes(k) ? '\n' : ', ') : v[k] || '')}</textarea></label>`;
      box.innerHTML = `<p class="stz-nota">Os textos do brandbook (logo, tipografia, cores, elementos e aplicações) o Studio monta sozinho a partir das escolhas, e eles mudam quando a marca muda. Aqui é a voz da marca.${v.ia ? ' <b>Escrito com a IA.</b>' : ''}</p>
        <button type="button" class="stz-btn" data-act="stz-ia">${ico('magia')} Escrever com a IA</button>
        ${tx('conceito', 'Conceito (uma frase)', 2)}${tx('manifesto', 'Manifesto', 6)}
        <fieldset class="stz-f"><legend>Frases</legend>${(v.taglines || []).slice(0, 5).map((t, i) => `<input class="stz-in" data-v="taglines.${i}" value="${esc(t)}" maxlength="60">`).join('')}</fieldset>
        ${tx('e', 'A marca é (separado por vírgula)', 2)}${tx('nao_e', 'A marca não é', 2)}${tx('fala', 'Fala assim (uma por linha)', 3)}${tx('nao_fala', 'Nunca fala assim', 3)}${tx('bio', 'Bio do Instagram', 2)}${tx('wa', 'Boas-vindas do WhatsApp', 3)}
        ${personasCampos()}`;
    } else if(a === 'dados'){
      const nm = B.m.naming || {};
      box.innerHTML = `<label class="stz-f"><span>Nome da marca</span><input class="stz-in" data-k="nome" value="${esc(B.m.nome)}" maxlength="40"></label>
        ${campo('tagline', 'Frase (vai no logo se você ligar em Ideia)', { max: 48 })}
        ${sel('nicho', Object.entries(M.NICHOS).map(([k, n]) => [k, n.n]), 'Nicho')}
        ${campo('descr', 'O que você vende, numa frase', { max: 120 })}
        <div class="stz-2">${campo('cidade', 'Cidade', { max: 60 })}${campo('desde', 'Desde', { max: 4 })}</div>
        ${nm.nome ? `<p class="stz-sub">Naming</p><p class="stz-nota"><b>${esc(nm.nome)}</b> · ${esc((M.ESTRATEGIAS[nm.estrategia] || {}).n || '')}. ${esc(nm.porque || '')}</p>` : ''}
        <p class="stz-nota">O endereço do brandbook não muda quando o nome muda: o link que você mandou continua valendo.</p>`;
    }
  }
  /* as letras de logo, cada uma com o nome da marca (carrega as que faltam aos poucos) */
  async function desenhaFontes(){
    const sp = B.m.spec, alvo = C.$('stz-fontes'); if(!alvo) return;
    for(const el of alvo.querySelectorAll('[data-f]')){
      try{ const f = await M.fonte(el.dataset.f); if(!B || B.aba !== 'letra') return; const t = M.texto(f, sp.nome, { tam: 100, caixa: sp.logo.caixa, track: 0 }); el.innerHTML = M.svg([{ d: t.cmds, f: 'currentColor' }], { vb: M.margem([{ d: t.cmds }], 12) }); }catch(e){}
    }
  }
  /* a imagem quadrada do símbolo na cor da marca (portfólio, avatar) */
  H.simboloPng = async (m, tam, tipo) => {
    const sp = m.spec, fs = await H.fs(sp), lg = M.logo(sp, fs, 'simbolo'), v = M.versoes(sp.cores).cor, W2 = 100;
    const svg = M.svg(M.logoNaCaixa(lg, v, W2 * 0.18, W2 * 0.18, W2 * 0.64, W2 * 0.64, v.fundo), { vb: { x: 0, y: 0, w: W2, h: W2 }, fundo: v.fundo });
    return await M.png(svg, tam || 512, tam || 512, tipo || 'image/png', 0.92);
  };
  H.linkLivro = m => `${location.origin}${location.pathname}#/bb/${m.slug || m.id}`;
  const ocupado = async (el, txt, f) => { const ant = el.innerHTML; el.disabled = true; el.textContent = txt; try{ return await f(); } finally{ el.disabled = false; el.innerHTML = ant; } };
  Object.assign(C.acts, {
    'stz-aba': el => { if(!B) return; B.aba = el.dataset.k; desenhaAba(); },
    'stz-versao': el => { if(!B) return; B.versao = el.dataset.k; redesenha(); },
    'stz-arranjo': el => { if(!B) return; B.arranjo = el.dataset.k === B.m.spec.logo.arranjo ? '' : el.dataset.k; redesenha(); },
    'stz-outra': () => { if(B) mudaTerritorio(B.m.spec.territorio, true); },
    /* a ideia escolhida à mão não "sai do próprio nome": o brandbook não pode contar a origem da amostra antiga */
    'stz-ideia': el => { if(!B) return; const S = B.m.spec.simbolo; S.ideia = el.dataset.k; if(S.tipo !== 'ideia') S.tipo = 'ideia'; delete S.de; delete S.palavra; mexeu(true, true); },
    'stz-geo': () => { if(!B) return; B.m.spec.simbolo.seed = Math.floor(Math.random() * 99999); mexeu(true, false); },
    'stz-fonte': el => { if(!B) return; const sp = B.m.spec; sp.tipo.display = el.dataset.k; sp.tipo.texto = M.parTexto(el.dataset.k); document.querySelectorAll('[data-act="stz-fonte"]').forEach(b => { const on = b === el; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }); mexeu(true, false); },
    'stz-receita': el => {
      if(!B) return; const sp = B.m.spec, t = M.TERRITORIOS[sp.territorio] || {}, r = (t.receitas || []).find(x => x.n === el.dataset.n); if(!r) return;
      sp.cores = { p: r.p, s: r.s, a: r.a, ink: r.ink, paper: r.paper, fundo: r.fundo || t.fundo || 'paper', esquema: 'receita', receita: r.n };
      mexeu(true, true);
    },
    'stz-ia': async el => {
      if(!B) return; const m = B.m;
      await ocupado(el, 'Escrevendo…', async () => {
        try{ const r = await H.escreveIA(m); m.voz = r.voz; salvaLogo(); desenhaAba(); C.toast((r.personas ? 'Pronto: a voz, as personas e os textos do brandbook foram escritos com a IA.' : 'Pronto: a voz e os textos do brandbook foram escritos com a IA.') + (r.restam != null ? ` Ainda dá pra pedir ${r.restam} hoje.` : ''), 4200); }
        catch(e){ C.toast(erroIA(e), 4200); }
      });
    },
    'stz-publica': async el => {
      if(!B) return; const m = B.m;
      if(ehLocal(m)){ C.toast('Pra publicar, o banco do Studio precisa estar ligado. Por enquanto a marca fica neste aparelho.', 4800); return; }
      await ocupado(el, '…', async () => {
        try{ await H.salvar(m, { publica: !m.publica }); m.publica = !m.publica; if(m.publica) C.copy(H.linkLivro(m), 'Publicada. O link do brandbook foi copiado.'); else C.toast('Voltou a ser rascunho: só você vê.'); }
        catch(e){ C.toast(H.erroTxt(e)); }
      });
      el.textContent = m.publica ? 'Publicada' : 'Publicar';
    },
    'stz-kit': async el => { if(!B || !C.houziLivro) return; await ocupado(el, 'Montando o kit…', () => C.houziLivro.kit(B.m).catch(e => C.toast('Não deu pra montar o kit: ' + ((e && e.message) || e)))); },
    'stz-pdf': async el => { if(!B || !C.houziLivro) return; await ocupado(el, 'Montando o PDF…', () => C.houziLivro.pdf(B.m).catch(e => C.toast('Não deu pra montar o PDF: ' + ((e && e.message) || e)))); },
    'stz-portfolio': async el => {
      if(!B) return; const m = B.m, sp = m.spec;
      await ocupado(el, 'Levando…', async () => {
        try{
          const ja = await C.api.q('corre_portfolio', { eq: { dono: C.uid() } });
          if(ja.some(x => C.norm(x.marca) === C.norm(m.nome))){ C.toast('Essa marca já tá no teu portfólio.'); return; }
          const blob = await H.simboloPng(m, 360, 'image/jpeg'), logo_url = await C.api.upload(blob);
          await C.api.ins('corre_portfolio', { marca: m.nome.slice(0, 60), segmento: ((M.NICHOS[sp.nicho] || {}).n || '').slice(0, 60), papel: 'Branding · Studio Houzi', desde: String(sp.desde || '').slice(0, 20), link: m.publica && !ehLocal(m) ? H.linkLivro(m) : '', rede: '', cor: sp.cores.p, logo_url, publico: true, ordem: ja.length });
          C.toast('A marca entrou no teu portfólio.');
        }catch(e){ C.toast(C.errMsg(e, 'Não deu pra levar pro portfólio agora.')); }
      });
    },
    'stz-apaga': async el => {
      if(!B) return;
      if(!el.classList.contains('armed')){ el.classList.add('armed'); el.textContent = 'Toca de novo pra apagar'; setTimeout(() => { if(el.isConnected){ el.classList.remove('armed'); el.innerHTML = `${ico('trash')} Apagar`; } }, 4000); return; }
      try{ await H.apagar(B.m); B = null; C.toast('Marca apagada.'); C.go('#/houzi'); }catch(e){ C.toast(H.erroTxt(e)); }
    }
  });
})();
