/* CORRE · app: entrar com Google, perfil, início, rotas. Os módulos (Rolo 360, Banca, Grana,
   Portfólio, Stories) moram nos outros arquivos e se registram em window.Corre. */
(function(){
  'use strict';
  const C = window.Corre, { $, esc, ico, avatar, toast, copy } = C, api = C.api, st = C.st;
  const app = $('app');
  /* v5.0: ligou o Aparecer no Google agora: diz onde (o Google leva uns dias pra ler a página nova) */
  const googleDiz = antes => { const me = st.me, u = me && me.no_google && !antes && C.meuCorre && C.meuCorre.googleUrl ? C.meuCorre.googleUrl(me) : null;
    return u ? `Perfil salvo. Teu trabalho já tá em ${location.host}${u}; o Google leva uns dias pra mostrar.` : me && me.no_google && !antes ? 'Perfil salvo. Aparecer no Google ligado.' : ''; };
  const HANDLE_RE = /^[a-z0-9_.]{3,24}$/;
  const IG_RE = /^[A-Za-z0-9_.]{0,30}$/;
  const ST = window.CorreStickers;
  const setStickers = page => { const el = $('stickers'); if(ST && el && !C.EMBED && el.dataset.page !== page) ST.scatter(el, page); };
  const G_LOGO = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
  /* v4.35: o "f" do Facebook (o desenho que a Meta pede no botão de entrar: branco, num botão azul dela) */
  const FACE_LOGO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9.1 23.69v-7.98H6.63v-3.67H9.1v-1.58c0-4.09 1.85-5.98 5.86-5.98.4 0 .96.04 1.47.1.39.05.77.12 1.14.2v3.32a8.6 8.6 0 0 0-.65-.03 26.8 26.8 0 0 0-.73-.01c-.71 0-1.26.1-1.68.31-.29.15-.52.36-.68.62-.26.42-.37 1-.37 1.75v1.3h3.92l-.39 2.1-.29 1.57h-3.24v8.24C19.4 23.24 24 18.18 24 12.04 24 5.42 18.63.04 12 .04S0 5.42 0 12.04c0 5.63 3.87 10.35 9.1 11.65Z"/></svg>';
  /* a maçã do botão da Apple (o desenho que a Apple pede no "Continuar com a Apple"), na cor do texto do botão */
  const APPLE_LOGO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.37 12.6c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.18-1.73-1.35-.14-2.64.8-3.33.8-.69 0-1.74-.78-2.86-.76-1.47.02-2.83.86-3.59 2.17-1.53 2.66-.39 6.6 1.1 8.76.73 1.06 1.6 2.24 2.73 2.2 1.1-.05 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.07 2.65-2.13.84-1.22 1.18-2.41 1.2-2.47-.03-.01-2.29-.88-2.3-3.51zM14.2 6.13c.6-.73 1.01-1.75.9-2.76-.87.04-1.92.58-2.54 1.31-.56.65-1.05 1.68-.92 2.67.97.08 1.96-.49 2.56-1.22z"/></svg>';
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
  /* v4.04: dono (o fundador e quem tá na corre_donos, pelo corre_meu_acesso): vê a Lojinha. Até o acesso chegar do
     banco, só o fundador */
  C.ehDono = () => C.ehFundador() || !!(C.acesso && C.acesso.dono);
  /* a casa do fundador (o loft) é dele por id, mesmo que o @ mude */
  C.fundadorId = () => FUNDADOR;
  /* ferramentas ligadas no perfil (corre_perfis.ferramentas): o Hórus liga e desliga; o Studio tá sempre na porta */
  /* v3.56: Desbaratinado = perfil público com os dados (posts, stories, portfólio, grana) só pra quem segue.
     O "mocado" de antes (perfil escondido) virou isso no banco (delta-v356); até lá, conta igual */
  const desb = p => !!(p && (p.desbaratinado || p.visibilidade === 'mocado'));
  C.desb = desb;
  C.ferr = k => { const f = (st.me && st.me.ferramentas && typeof st.me.ferramentas === 'object') ? st.me.ferramentas : {}; if(k === 'studio') return f.studio !== false; return f[k] === undefined ? !!C.DEMO : f[k] === true; };
  /* cada lugar do menu: [endereço, nome, ícone]. Sem endereço é botão (o sino abre os avisos; a carteira abre por cima) */
  const DEST = me => ({
    inicio: ['#/', 'Início', 'home'], msg: ['#/msg', 'Mensagens', 'send'], avisos: ['', 'Avisos', 'bell'], studio: ['#/studio', 'Studio Cria', 'magia'],
    verso: ['#/verso', 'Correverso', 'verso'], corre: ['#/corre', 'Vendas e Grana', 'grana'], mural: ['#/mural', 'Mural', 'tacha'],
    houzi: ['#/houzi', 'Studio Houzi', 'houzi'], perfil: ['#/@' + me.handle, 'Meu perfil', 'eu'], grupos: ['#/grupos', 'Grupos', 'gente'],
    horus: ['#/horus', 'Hórus', 'eye'], rolo: ['#/rolo', 'Rolo 360', 'rolo'], carteira: ['', 'Carteira de correal', 'correal'], planos: ['#/planos', 'Planos', 'cartao'],
    marcas: ['#/marcas', 'Portfólio e catálogo', 'marcas'], salvos: ['#/salvos', 'Salvos', 'save'], banca: ['#/banca', 'Banca do dia', 'banca'], refs: ['#/refs', 'Do teu nicho', 'cal'],
    /* v4.0 · o Link na bio (bio.js) */
    linkbio: ['#/linkbio', 'Link na bio', 'link'], convite: ['', 'Chamar a galera', 'presente'],
    /* v4.02 · a Lojinha (o painel do dono, lojinha.js): só os donos veem (o tem() filtra; v4.04: o Jey e o Lucas também) */
    lojinha: ['#/lojinha', 'Lojinha', 'grafico'],
    /* v4.19 · o Caderninho (caderninho.js): o planner, com o dia que junta as tarefas e o que o Corre já sabe */
    caderno: ['#/caderninho', 'Caderninho', 'caderno'],
    /* v4.34 · o Atendente 24h (atendente.js) e o Piloto automático (piloto.js) */
    atende: ['#/atendente', 'Atendente 24h', 'atende'], piloto: ['#/piloto', 'Piloto automático', 'piloto'],
    /* v4.41 · a casa do Corre Studio: o teu dia e as ferramentas de trabalho */
    dia: ['#/dia', 'O teu dia', 'sol'],
    /* v5.09 · o Muralzim (muralzim.js): os eventos de Londrina e o ingresso vendido aqui */
    muralzim: ['#/muralzim', 'Muralzim', 'ingresso']
  });
  /* v5.09 · o que cada nome próprio faz, em poucas palavras (o Thales, depois de ouvir que "Hórus" sozinho ninguém
     adivinha): vai embaixo do nome no menu, na gaveta e no Tudo, e no title de onde só cabe o ícone. Nome que já diz o
     que é (Início, Mensagens, Planos...) não ganha */
  const DIZ = {
    studio: 'posta no Instagram', houzi: 'cria tua marca', horus: 'acha clientes', mural: 'pedidos de serviço',
    caderno: 'tuas tarefas', verso: 'a cidade-jogo', rolo: 'filmes em 5 frames', banca: 'manchetes do dia',
    refs: 'datas que vendem', atende: 'IA responde cliente', piloto: 'vira tarefa sozinho', carteira: 'a moeda do jogo',
    lojinha: 'os números do Corre', dia: 'o que fazer hoje', muralzim: 'eventos e ingressos'
  };
  C.diz = k => DIZ[k] || '';
  const dzHTML = k => DIZ[k] ? `<small class="dz">${DIZ[k]}</small>` : '';
  const dzTit = (k, l) => DIZ[k] ? `${l} · ${DIZ[k]}` : l;
  /* v5.09 · o aniversário no perfil (só o dia e o mês, quando a pessoa deixa mostrar). No dia, a etiqueta acende */
  const MES_N = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const anivTag = p => {
    const m = /^(\d\d)-(\d\d)$/.exec((p && p.aniver) || ''); if(!m) return '';
    const hoje = C.hojeBR().slice(5) === p.aniver;
    return `<span class="tag pf-aniv${hoje ? ' hoje' : ''}">${ico('presente')} ${hoje ? 'Faz aniversário hoje' : `Aniversário: ${+m[2]} de ${MES_N[+m[1] - 1]}`}</span>`;
  };
  /* v5.09 · o link do perfil. "teusite.com.br" e "http://" viram https; o resto que não abre devolve null. A mesma regra
     da corre_perfis_link_ck (delta-v509.sql): só https, domínio com ponto, sem espaço nem aspas, até 300 letras */
  const LINK_OK = /^https:\/\/[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}(:[0-9]{2,5})?([/?#][^\s<>"'\\]*)?$/;
  C.linkOk = u => typeof u === 'string' && u.length <= 300 && LINK_OK.test(u);
  C.arrumaLink = u => {
    u = String(u || '').trim(); if(!u) return '';
    if(/^http:\/\//i.test(u)) u = 'https://' + u.slice(7); else if(!/^https:\/\//i.test(u)) u = 'https://' + u.replace(/^\/+/, '');
    let h; try{ const x = new URL(u); if(x.protocol !== 'https:' || x.username || x.password) return null; h = x.href; }catch(e){ return null; }
    return C.linkOk(h) ? h : null;
  };
  /* o link como aparece no perfil: sem https e sem www, curto */
  C.linkCurto = u => { try{ const x = new URL(u); const t = (x.hostname.replace(/^www\./, '') + (x.pathname === '/' ? '' : x.pathname) + x.search).replace(/\/$/, ''); return t.length > 38 ? t.slice(0, 36) + '…' : t; }catch(e){ return ''; } };
  /* os grupos: [nome, ícone, o que mora dentro]. No computador cada um abre ali mesmo, no menu; no celular a gaveta
     da tua foto já mostra eles abertos. v3.44 (o Thales pediu pra juntar o tanto que der): a Rede junta o Início, as
     Mensagens, os Grupos e os Avisos; o Hórus e o Portfólio vão pro Laboratório; o Perfil e os Salvos ficam juntos.
     Com isso o Mais some (não sobra nada nele) */
  /* v4.41 · as três partes (o Thales: "vamos separar o app em 3 partes, igual o TikTok"): a Rede é onde todo mundo
     entra, limpa, só o social; o trabalho mora no Corre Studio (entra pelo perfil, pelo botão do alto ou pelo
     app.corresocial.com/studio); o Correverso é o jogo. Cada página é de uma parte, e o menu muda com ela */
  /* v5.01 (o Thales: "o mural fica no studio também, ali ele está competindo demais com o correverso"): o Mural é pedido
     de serviço, trabalho; saiu da Rede (da praça, da barra e da gaveta) e mora no Corre Studio, do lado do Hórus */
  const GRUPOS_REDE = {
    rede: ['Rede', 'chat', ['inicio', 'msg', 'grupos', 'muralzim', 'avisos', 'rolo']],
    verso: ['Correverso', 'verso', ['verso', 'carteira']],
    eu: ['Perfil', 'eu', ['perfil', 'salvos', 'convite']]
  };
  const GRUPOS = {
    trampo: ['Trabalho', 'lab', ['dia', 'caderno', 'studio', 'horus', 'mural', 'atende', 'piloto', 'msg']],
    ref: ['Referência', 'banca', ['banca', 'refs']],
    marca: ['Marca', 'houzi', ['houzi', 'marcas', 'linkbio']],
    fin: ['Financeiro', 'calc', ['corre', 'planos', 'lojinha']]
  };
  /* as páginas do Corre Studio (o resto é da Rede; as Mensagens servem as duas e ficam na parte de onde a pessoa veio) */
  /* v5.03 (o Thales: "banca do dia e do teu nicho são onde as pessoas buscam referência pra criar seus materiais, então
     tem que estar dentro do studio"): as duas vieram da Rede. O Rolo 360 fica na Rede (só o Thales tem, e ele quer à mão) */
  const STUDIO_K = ['dia', 'caderno', 'studio', 'horus', 'mural', 'atende', 'piloto', 'banca', 'refs', 'houzi', 'marcas', 'linkbio', 'corre', 'planos', 'lojinha'];
  /* v5.04: o Rolo 360 mora nas duas (o Thales: "deixa o rolo só na barra e ferramentas"): no menu da Rede e nas Tuas
     ferramentas do Studio. Ele segue a parte de onde a pessoa veio, como as Mensagens */
  const NEUTRO = ['msg', 'avisos', 'rolo'];
  const MODO = { ult: (() => { try{ return sessionStorage.getItem('corre-modo') || 'rede'; }catch(e){ return 'rede'; } })() };
  const modoDe = active => {
    let m = STUDIO_K.includes(active) || (!active && /^#\/(monta|clientes)\/?$/.test(location.hash)) ? 'studio' : NEUTRO.includes(active) ? MODO.ult : 'rede';
    if(m !== 'studio') m = 'rede';
    if(m !== MODO.ult){ MODO.ult = m; try{ sessionStorage.setItem('corre-modo', m); }catch(e){} }
    return m;
  };
  C.modo = () => MODO.ult;
  /* v5.02: a luz pela rota, antes da página carregar os dados (o C.header confirma depois). É a mesma conta do script do
     começo do index.html: as páginas do Studio são de noite, as Mensagens seguem a parte de onde a pessoa veio */
  const ROTA_STUDIO = /^(dia|caderninho|studio|horus|mural|atendente|piloto|banca|refs|houzi|marcas?|linkbio|corre|vendas|grana|estilo|planos|lojinha|monta|clientes)(\/|$)/;
  const noiteDaRota = h => !!st.user && (ROTA_STUDIO.test(h) || (/^(msg|rolo)(\/|$)/.test(h) && MODO.ult === 'studio'));
  /* a praça: o Correverso em destaque no meio do menu da Rede. (v3.70: a lista em grupos e a barra fixa do celular deram
     lugar à Comanda, aos Teus e ao Tudo; os grupos seguem dentro do Tudo e da gaveta. v5.01: o Mural foi pro Studio, e o
     Correverso ficou sozinho na praça, sem disputar o olho com ele) */
  const PRACA = ['verso'];
  /* o que depende do perfil ou do módulo carregado: o Hórus liga e desliga, o Studio Houzi e os Grupos podem não vir */
  const tem = k => (k !== 'dia' || !!C.views.dia) && (k !== 'caderno' || !!C.views.caderno) && (k !== 'atende' || !!C.views.atendente) && (k !== 'piloto' || !!C.views.piloto) && (k !== 'horus' || C.ferr('horus')) && (k !== 'houzi' || C.views.houzi) && (k !== 'grupos' || C.views.grupos) && (k !== 'lojinha' || (C.ehDono() && !!C.views.lojinha));
  /* de qual item do menu cada página é (e pra onde a setinha de voltar leva). Banca e Nicho não são mais filhas do
     Início: moram na Banca, e o grupo aberto no menu já diz onde você tá */
  const DONO = { vendas: 'corre', grana: 'corre', estilo: 'corre', 'studio-dentro': 'studio', editar: 'perfil' };
  /* (v3.44: o Hórus e o Portfólio moram no Laboratório, e o grupo aberto no menu já diz onde você tá: sem migalha) */
  const VOLTA = { estilo: ['#/corre', 'Vendas e Grana'], salvos: ['perfil', 'Perfil'] };
  /* v5.09 · o Voltar de toda página (o Thales: "tem que ter sempre um botão de voltar"; e "quando você fecha algo do
     studio cria, ele volta pra rede ao invés de voltar pra página do studio"). A pilha das páginas desta aba
     (sessionStorage, fora do balcão da cidade): o Voltar leva pra página de onde a pessoa veio; sem ela (abriu direto
     pelo link ou pelo aviso), pra casa da parte (o Início na Rede, O teu dia no Studio) */
  const PILHA_K = 'corre-pilha';
  const pilha = () => { try{ const p = JSON.parse(sessionStorage.getItem(PILHA_K) || '[]'); return Array.isArray(p) ? p.filter(x => typeof x === 'string') : []; }catch(e){ return []; } };
  function pilhaAnda(hash){
    const p = pilha();
    /* foi pra página de antes (o Voltar, o voltar do navegador): sai a de cima; senão entra a nova */
    if(p.length > 1 && p[p.length - 2] === hash) p.pop(); else if(p[p.length - 1] !== hash) p.push(hash);
    try{ sessionStorage.setItem(PILHA_K, JSON.stringify(p.slice(-30))); }catch(e){}
  }
  const parteDe = hash => { const h = String(hash || '').replace(/^#\/?/, ''); return ROTA_STUDIO.test(h) ? 'studio' : /^(msg|rolo|avisos)(\/|$)/.test(h) ? 'neutro' : 'rede'; };
  /* pra onde o Voltar leva. "fora": um padrão de página que não vale como destino (o Sair do Studio Cria não volta pra
     porta dele) */
  C.voltaPra = function(fora){
    const p = pilha(), aqui = '#/' + location.hash.replace(/^#\/?/, '');
    const parte = parteDe(aqui) === 'neutro' ? MODO.ult : parteDe(aqui), casa = parte === 'studio' ? '#/dia' : '#/';
    for(let i = p.length - 1; i >= 0; i--){
      const x = p[i];
      if(x === aqui || (fora && fora.test(x))) continue;
      /* o Sair do Studio Cria fica no Studio: se antes dele era a Rede, cai em O teu dia */
      return fora && parteDe(x) === 'rede' ? casa : x;
    }
    return casa;
  };
  const NOME_VOLTA = { inicio: 'Início', dia: 'O teu dia', caderninho: 'Caderninho', studio: 'Studio Cria', horus: 'Hórus', mural: 'Mural',
    atendente: 'Atendente 24h', piloto: 'Piloto automático', banca: 'Banca do dia', refs: 'Do teu nicho', houzi: 'Studio Houzi', marcas: 'Portfólio',
    marca: 'Painel da marca', linkbio: 'Link na bio', corre: 'Vendas e Grana', planos: 'Planos', lojinha: 'Lojinha', grupos: 'Grupos', g: 'Grupo',
    salvos: 'Salvos', msg: 'Mensagens', rolo: 'Rolo 360', editar: 'Editar perfil', p: 'Post', muralzim: 'Muralzim', estilo: 'Estilo de vida' };
  const nomeVolta = hash => {
    const h = String(hash || '').replace(/^#\/?/, '');
    if(!h) return 'Início';
    if(h[0] === '@') return st.me && h.slice(1).toLowerCase() === st.me.handle ? 'Teu perfil' : C.decURI(h);
    return NOME_VOLTA[h.split('/')[0]] || '';
  };
  /* as casas das partes e as páginas que já têm o próprio jeito de sair (a cidade, o Studio Cria por dentro) */
  const SEM_VOLTA = ['inicio', 'dia', 'verso', 'studio-dentro'];
  /* onde o Postar redondo do celular aparece: no Início, no teu perfil e nas páginas de ler (Banca do dia e Do teu
     nicho), como até a v3.42, quando elas eram do Início. O Editar perfil acende o Perfil, mas ali ninguém posta */
  const POSTAR = ['inicio', 'perfil'];
  /* ---------------- v3.69 · o menu esperto ----------------
     O Thales: "melhore o menu e deixe ele o mais smart possível". Os sinais: onde tem coisa pra fazer (post que sai hoje
     ou atrasou, cliente pra retornar, cobrança vencida, alguém te escolheu no Mural ou pedido novo, teste do plano
     acabando). Calculados no aparelho com o que o app já lê; nada novo no banco. Quem mostra é a Comanda da v3.70 (mais
     embaixo), o número no canto dos blocos e a busca vazia. O uso de cada página também mora aqui (os Teus aprendem com ele) */
  const SN = { at: 0, uid: '', pronto: false, ind: null, v: {}, prox: '' };
  /* o que cada sinal abre e o ícone dele no "Pra hoje" */
  const SN_IR = { caderno: ['#/caderninho', 'caderno'], studio: ['#/studio', 'magia'], horus: ['#/horus', 'eye'], corre: ['#/corre', 'grana'], mural: ['#/mural', 'tacha'], planos: ['#/planos', 'cartao'] };
  /* estados do lead que não pedem mais retorno (os mesmos do horus.js) */
  const LEAD_FIM = ['fechado', 'perdido', 'nao_encontrado'];
  const diaMenos = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };
  const plural = (n, um, varios) => n === 1 ? `1 ${um}` : `${n} ${varios}`;
  async function calculaSinais(){
    const uid = C.uid(), hj = C.hojeBR(), v = {};
    let prox = 0;
    /* (v3.70: olha também as duas semanas da frente, pro "Próximo post" do pé da Comanda) */
    const studio = api.q('corre_posts', { select: 'id,data,hora,status,ig_status,midia_url', eq: { dono: uid }, gte: { data: diaMenos(hj, 7) }, lte: { data: diaMenos(hj, -14) }, limit: 500 }).then(ps => {
      /* o mesmo jeito do Studio: publicado e rascunho não contam; com erro ou 15 min depois da hora é atrasado */
      let hoje = 0, atras = 0, um = '';
      (ps || []).forEach(p => {
        if(p.ig_status === 'publicado' || p.status === 'postado') return;
        if(p.ig_status === 'erro'){ if(p.data <= hj){ atras++; um = p.id; } return; }
        if(!p.data || !p.hora || !p.midia_url || p.status === 'ideia') return;
        const t = Date.parse(`${p.data}T${String(p.hora).slice(0, 5)}:00-03:00`);
        if(t > Date.now()){ if(!prox || t < prox) prox = t; }
        if(p.data > hj) return;
        if(t < Date.now() - 15 * 6e4){ atras++; um = p.id; } else if(p.data === hj) hoje++;
      });
      /* v4.18: um atrasado só: a Comanda leva direto pro post, com o Postar na mão (como o aviso da hora de postar) */
      if(atras) v.studio = { txt: plural(atras, 'atrasado', 'atrasados'), n: atras, nivel: 'alerta', ir: atras === 1 && um ? '#/studio/postar/' + um : '', diz: atras === 1 ? '1 post atrasou' : `${atras} posts atrasaram` };
      else if(hoje) v.studio = { txt: `${hoje} hoje`, n: hoje, nivel: 'hoje', diz: hoje === 1 ? '1 post sai hoje' : `${hoje} posts saem hoje` };
    }).catch(() => {});
    const horus = !C.ferr('horus') ? null : api.q('corre_leads', { select: 'id,st,prox,fonte,hist', eq: { dono: uid }, lte: { prox: hj }, limit: 3000 }).then(L => {
      const todos = (L || []).filter(l => l.prox && !LEAD_FIM.includes(l.st));
      /* v4.16: pedido de orçamento (ou Mural) que ninguém respondeu vem antes de tudo e leva pra Entrada do Hórus */
      const ped = todos.filter(l => C.horusFunil ? C.horusFunil.esperando(l) : false).length;
      /* v4.36: o pedido avisa qualquer dia; o retorno, só de segunda a sexta (o do fim de semana vale na segunda) */
      const ab = todos.filter(l => C.horusVence(l.prox)); if(!ped && !ab.length) return;
      if(ped) v.horus = { txt: plural(ped, 'pedido', 'pedidos'), n: ped, nivel: 'alerta', ir: '#/horus/entrada', diz: ped === 1 ? '1 pedido de orçamento esperando resposta' : `${ped} pedidos de orçamento esperando resposta` };
      else v.horus = { txt: String(ab.length), n: ab.length, nivel: ab.some(l => C.horusDia(l.prox) < hj) ? 'alerta' : 'hoje', diz: ab.length === 1 ? '1 cliente pra retornar' : `${ab.length} clientes pra retornar` };
    }).catch(() => {});
    const vendas = api.q('corre_vendas', { select: 'id,st,vence', eq: { dono: uid, st: 'fechado' }, lte: { vence: hj }, limit: 1000 }).then(L => {
      const venc = (L || []).filter(x => x.vence && x.vence < hj).length, hoje = (L || []).filter(x => x.vence === hj).length;
      /* conta de cobrança, nunca valor: dinheiro não aparece no menu (e nunca em vermelho) */
      if(venc) v.corre = { txt: plural(venc, 'vencida', 'vencidas'), n: venc, nivel: 'alerta', diz: venc === 1 ? '1 cobrança vencida' : `${venc} cobranças vencidas` };
      else if(hoje) v.corre = { txt: `${hoje} hoje`, n: hoje, nivel: 'hoje', diz: hoje === 1 ? '1 pagamento pra receber hoje' : `${hoje} pagamentos pra receber hoje` };
    }).catch(() => {});
    const mural = C.mural && C.mural.sinal ? C.mural.sinal().then(m => {
      if(!m) return;
      if(m.escolhido) v.mural = { txt: 'te escolheram', n: m.escolhido, nivel: 'alerta', diz: m.escolhido === 1 ? 'Te escolheram no Mural!' : `${m.escolhido} te escolheram no Mural!` };
      else if(m.novos) v.mural = { txt: plural(m.novos, 'novo', 'novos'), n: m.novos, nivel: 'info', diz: m.novos === 1 ? '1 pedido novo pra você no Mural' : `${m.novos} pedidos novos pra você no Mural` };
    }).catch(() => {}) : null;
    const planos = (C.acesso ? Promise.resolve(C.acesso) : C.acessoCarrega ? C.acessoCarrega() : Promise.resolve(null)).then(A => {
      if(!A || A.fundador || A.dono || !A.planos) return;
      const NOME = { studio: 'Studio Cria', houzi: 'Studio Houzi', horus: 'Hórus' };
      Object.keys(A.planos).forEach(k => {
        const p = A.planos[k], dias = p.teste_ate ? Math.ceil((Date.parse(p.teste_ate) - Date.now()) / 864e5) : null;
        if(p.status === 'atrasada') v.planos = { txt: 'atrasado', n: '!', nivel: 'alerta', diz: `A fatura do ${NOME[k] || k} atrasou` };
        else if(!v.planos && p.status === 'teste' && !p.assinado && dias != null && dias >= 0 && dias <= 5) v.planos = { txt: dias <= 1 ? 'acaba hoje' : `${dias} dias`, n: dias <= 1 ? '!' : dias, nivel: 'hoje', diz: `O teste do ${NOME[k] || k} acaba ${dias <= 1 ? 'hoje' : `em ${dias} dias`}` };
      });
    }).catch(() => {});
    /* v4.19: o Caderninho (as tarefas de hoje e as que ficaram pra trás) */
    const caderno = C.caderno && C.caderno.sinal ? C.caderno.sinal().then(c => {
      if(!c) return;
      if(c.atras) v.caderno = { txt: plural(c.atras, 'atrasada', 'atrasadas'), n: c.atras + c.hoje, nivel: 'alerta', diz: c.atras === 1 ? '1 tarefa ficou pra trás' : `${c.atras} tarefas ficaram pra trás` };
      else if(c.hoje) v.caderno = { txt: `${c.hoje} hoje`, n: c.hoje, nivel: 'hoje', diz: c.hoje === 1 ? '1 tarefa pra hoje no Caderninho' : `${c.hoje} tarefas pra hoje no Caderninho` };
    }).catch(() => {}) : null;
    /* v4.31: denúncia esperando o dono olhar (só pros donos; a Google pede que a gente olhe o que chega) */
    const den = C.ehDono && C.ehDono() ? api.rpc('corre_denuncias_abertas', {}).then(n => {
      n = Number(n) || 0;
      if(n) v.lojinha = { txt: plural(n, 'denúncia', 'denúncias'), n, nivel: 'alerta', ir: '#/lojinha', diz: n === 1 ? '1 denúncia esperando você olhar' : `${n} denúncias esperando você olhar` };
    }).catch(() => {}) : null;
    /* (o saldo de correal ficou de fora: o menu só sinaliza o que pede ação, e "Carteira de correal" com o número não cabia) */
    await Promise.all([studio, horus, vendas, mural, planos, caderno, den]);
    return { v, prox: prox ? quandoCurto(prox) : '' };
  }
  /* "hoje 21h", "amanhã 9h30", "sex 17/10 9h" (no horário de Brasília) */
  function quandoCurto(t){
    const f = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(t));
    const o = {}; f.forEach(x => { o[x.type] = x.value; });
    const dia = C.hojeBR(new Date(t)), hj = C.hojeBR(), h = Number(o.hour) % 24, m = o.minute === '00' ? '' : o.minute;
    const qd = dia === hj ? 'hoje' : dia === diaMenos(hj, -1) ? 'amanhã' : `${String(o.weekday || '').replace('.', '')} ${o.day}/${o.month}`;
    return `${qd} ${h}h${m}`;
  }
  /* de 2 em 2 minutos no máximo (o menu se redesenha a cada página e usa o que já sabe); trocou de conta, começa do zero */
  function sinaisCarrega(forca){
    const u = C.uid() || ''; if(SN.uid !== u){ SN.uid = u; SN.v = {}; SN.prox = ''; SN.pronto = false; SN.at = 0; }
    if(!u || !st.me) return Promise.resolve(SN.v);
    if(SN.ind) return SN.ind;
    if(!forca && Date.now() - SN.at < 12e4) return Promise.resolve(SN.v);
    return (SN.ind = calculaSinais().then(r => { if(SN.uid === u){ SN.v = r.v; SN.prox = r.prox; SN.pronto = true; SN.at = Date.now(); } return SN.v; }).finally(() => { SN.ind = null; }));
  }
  /* curto: só o número (os blocos e o Tudo; as palavras ficam na Comanda) */
  const sinalHTML = (k, curto) => { const s = SN.v[k]; return `<span class="sinal${s ? ' ' + s.nivel : ''}" data-sinal="${k}"${curto ? ' data-curto' : ''}${s ? ` title="${esc(s.diz || s.txt)}"` : ' hidden'}>${s ? esc(String(curto ? s.n : s.txt)) : ''}</span>`; };
  /* o "Pra hoje" (a Comanda e a busca vazia): o que pede ação, o urgente primeiro */
  const ORDEM_SN = { alerta: 0, hoje: 1, info: 2 };
  const praHoje = () => Object.keys(SN.v).filter(k => SN.v[k].diz && SN_IR[k] && tem(k)).sort((a, b) => ORDEM_SN[SN.v[a].nivel] - ORDEM_SN[SN.v[b].nivel]);
  const NIVEIS = ['alerta', 'hoje', 'info'];
  /* depois de calcular: troca os sinais, a Comanda e os números na tela, sem redesenhar o menu */
  function pintaSinais(){
    document.querySelectorAll('[data-sinal]').forEach(el => {
      const s = SN.v[el.dataset.sinal];
      el.hidden = !s; el.className = 'sinal' + (s ? ' ' + s.nivel : ''); el.textContent = s ? String(el.hasAttribute('data-curto') ? s.n : s.txt) : '';
      if(s) el.title = s.diz || s.txt; else el.removeAttribute('title');
    });
    document.querySelectorAll('.cm-box').forEach(el => { el.innerHTML = comandaHTML(); });
    const L = praHoje(), n = L.length, nv = n ? SN.v[L[0]].nivel : '';
    /* (v4.41: o .cs-n é o número na porta do Corre Studio, na Rede) */
    document.querySelectorAll('.cm-n, .eu-n, .cs-n').forEach(el => {
      el.hidden = !n; el.textContent = n ? String(n) : '';
      NIVEIS.forEach(c => el.classList.toggle(c, c === nv));
    });
    const studio = MENU.modo === 'studio', na = n ? `. Na comanda: ${n}` : '';
    const eu = document.querySelector('.hdr-eu > summary'); if(eu) eu.setAttribute('aria-label', `Abrir o menu${studio ? ' do Corre Studio' : ''}: teu perfil e o teu corre${studio ? na : ''}`);
    document.querySelectorAll('.hdr-cs, .lado-cs, .gv-cs, .pf-cs').forEach(el => el.setAttribute('aria-label', 'Abrir o Corre Studio' + na));
  }
  /* o que a pessoa mais usa: cada página aberta soma 1, e tudo perde 10% por dia (o que você parou de usar sai sozinho) */
  const USO_K = 'corre-menu-uso';
  const usoLe = () => { try{ const o = JSON.parse(localStorage.getItem(USO_K) || 'null'); return o && st.me && o.u === st.me.id ? o : null; }catch(e){ return null; } };
  function usoConta(k){
    if(!k || !st.me || !DEST(st.me)[k]) return;
    try{
      const o = usoLe() || { u: st.me.id, c: {}, dia: C.hojeBR(), ult: '', t: 0 }, hj = C.hojeBR();
      if(o.dia !== hj){ const d = Math.min(60, Math.max(1, Math.round((Date.parse(hj) - Date.parse(o.dia)) / 864e5))); Object.keys(o.c).forEach(x => { o.c[x] = Math.round(o.c[x] * Math.pow(.9, d) * 100) / 100; if(o.c[x] < .05) delete o.c[x]; }); o.dia = hj; }
      /* a mesma página de novo em 5 minutos (voltar, recarregar) não conta */
      if(o.ult === k && Date.now() - o.t < 3e5) return;
      o.c[k] = (o.c[k] || 0) + 1; o.ult = k; o.t = Date.now();
      localStorage.setItem(USO_K, JSON.stringify(o));
    }catch(e){}
  }
  const maisUsados = (n, fora) => { const o = usoLe(); if(!o) return []; return Object.keys(o.c).filter(k => o.c[k] >= 1.5 && tem(k) && !(fora || []).includes(k)).sort((a, b) => o.c[b] - o.c[a]).slice(0, n); };
  document.addEventListener('visibilitychange', () => { if(!C.EMBED && document.visibilityState === 'visible' && st.me && Date.now() - SN.at > 6e4) sinaisCarrega(true).then(pintaSinais); });
  /* v4.16: quem resolveu um pedido (o Hórus) refaz os sinais na hora, sem esperar os 2 minutos */
  C.sinaisAtualiza = () => { if(!C.EMBED && st.me) sinaisCarrega(true).then(pintaSinais).catch(() => {}); };
  /* v4.33: o "teu dia" do Início e o Fala com o Corre leem o mesmo "Pra hoje" da Comanda */
  C.sinaisCarrega = forca => sinaisCarrega(forca).then(v => { pintaSinais(); return v; });
  C.sinaisDia = () => ({ pronto: SN.pronto, prox: SN.prox, lista: praHoje().map(k => ({ k, txt: SN.v[k].diz, nivel: SN.v[k].nivel, ir: SN.v[k].ir || SN_IR[k][0], i: SN_IR[k][1] })) });
  /* um item sem enfeite (o Mais e a gaveta). O da página aberta ganha aria-current; a carteira avisa que abre por cima */
  const itemSimples = ([k, h, l, i], cls, ativo) => h ? `<a${cls ? ` class="${cls}-${k}"` : ''} href="${esc(h)}"${cls ? ' role="menuitem"' : ''}${ativo ? ' aria-current="page"' : ''}>${ico(i)}<span class="gv-t">${l}${dzHTML(k)}</span>${sinalHTML(k)}</a>`
    : `<button type="button"${cls ? ` class="${cls}-${k}" role="menuitem"` : ''} data-act="${k === 'avisos' ? 'sino' : k}"${k === 'carteira' ? ' aria-haspopup="dialog"' : ''}>${ico(i)}<span class="gv-t">${l}${dzHTML(k)}</span>${sinalHTML(k)}</button>`;
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
    const sn = k === 'avisos' || k === 'msg' ? '' : sinalHTML(k);
    const dz = desk ? dzHTML(k) : '', ti = dzTit(k, l);
    return h ? `<a class="${c}" href="${esc(h)}" title="${ti}" aria-label="${l}"${dados}${ativo ? ' aria-current="page"' : ''}>${ic}<span class="mi-t">${l}${dz}</span>${sn}</a>`
      : `<button type="button" class="${c}" data-act="${k === 'avisos' ? 'sino' : k}" title="${ti}" aria-label="${l}"${dados}>${ic}<span class="mi-t">${l}${dz}</span>${sn}</button>`;
  };
  /* ---------------- v3.70 · a Comanda ----------------
     O Thales viu a 3.69 e disse: "ce ficou 2h pra me entregar o mesmo menu?" (os sinais só aparecem com pendência; o resto
     era igual) e "me surpreenda". O menu vira o balcão do teu dia:
     - a Comanda: o cupom do que tá na fila hoje, sempre à vista (no computador no alto do menu; no celular abre a gaveta,
       e o número fica na tua foto). Zerou, o carimbo TUDO EM DIA. No pé, o próximo post programado;
     - os Teus: blocos com o que você usa. Sem mexer, o Corre monta sozinho pelo uso, uma vez por dia e sem embaralhar
       (quem continua fica no mesmo lugar). Fixou ou arrastou ("Ajeitar"), vale o teu jeito. No celular, os 4 primeiros
       são a barra de baixo, com o Correverso no meio;
     - a praça (Correverso e Mural) segue no meio, e o Tudo guarda o resto do Corre, nos grupos de sempre.
     Mensagens e Avisos subiram pro lado da marca: o número deles fica sempre à vista. Tudo no aparelho, nada no banco */
  const TEUS_K = 'corre-menu-teus', TEUS_MAX = 8;
  /* v4.41: a Comanda, os Teus e o Tudo viraram o menu do Corre Studio (a Rede tem o menu dela, fixo e limpo). O começo de
     quem nunca mexeu: Studio, Caderninho e Vendas e Grana na barra do celular, entre O teu dia e a volta pra Rede */
  const PADRAO = ['studio', 'caderno', 'corre', 'horus', 'mural', 'houzi', 'marcas', 'atende', 'linkbio', 'piloto', 'planos'];
  /* nos Teus só entra trabalho (e as Mensagens, que o cliente também manda); O teu dia tem lugar fixo */
  const FIXAVEL = k => k !== 'dia' && (STUDIO_K.includes(k) || k === 'msg') && !!st.me && !!DEST(st.me)[k] && tem(k);
  const teusLe = () => { try{ const o = JSON.parse(localStorage.getItem(TEUS_K) || 'null'); return o && st.me && o.u === st.me.id ? o : null; }catch(e){ return null; } };
  const teusGrava = o => { try{ localStorage.setItem(TEUS_K, JSON.stringify(Object.assign({}, o, { u: st.me.id }))); }catch(e){} };
  /* o automático: os mais usados (1,5 ou mais) na frente, completado pelo começo. Recalcula uma vez por dia; quem continua
     entre os primeiros fica no lugar de ontem e quem entra pega a vaga de quem saiu (a barra do celular não pula todo dia) */
  function teusAuto(){
    const o = teusLe() || {}, hj = C.hojeBR(), velho = Array.isArray(o.auto) ? o.auto.filter(FIXAVEL) : [];
    if(o.dia === hj && velho.length) return velho;
    const top = [...new Set(maisUsados(TEUS_MAX).filter(FIXAVEL).concat(PADRAO.filter(FIXAVEL)))].slice(0, TEUS_MAX);
    const entra = top.filter(k => !velho.includes(k));
    const L = velho.map(k => top.includes(k) ? k : entra.shift()).filter(Boolean).concat(entra).slice(0, TEUS_MAX);
    teusGrava(Object.assign(o, { auto: L, dia: hj }));
    return L;
  }
  const fixados = () => { const o = teusLe(); return o && Array.isArray(o.fixos) ? o.fixos.filter(FIXAVEL) : null; };
  const teus = () => fixados() || teusAuto();
  /* completa com o começo, sem repetir, até n (quem fixou só dois ainda ganha a barra inteira) */
  const completa = (L, n, fora) => { const r = L.filter(k => !fora.includes(k)); PADRAO.forEach(k => { if(r.length < n && !r.includes(k) && !fora.includes(k) && FIXAVEL(k)) r.push(k); }); return r.slice(0, n); };
  /* no computador as Mensagens moram no alto: os blocos são os outros, de 4 a 6 */
  const blocosLado = () => { const L = teus().filter(k => k !== 'msg').slice(0, 6); return L.length >= 4 ? L : completa(L, 4, ['msg']); };
  /* a barra do celular. Na Rede: o Início, os Grupos, o Correverso no meio, as Mensagens e o Perfil (fixa: é ali que se
     acha o botão do Corre Studio, como no TikTok; v5.01: os Grupos no lugar do Mural, que foi pro Studio). No Studio:
     O teu dia, os 3 primeiros dos Teus e a volta pra Rede */
  const BARRA_REDE = ['inicio', 'grupos', 'verso', 'msg', 'perfil'];
  const barra = () => MENU.modo === 'studio' ? ['dia'].concat(completa(teus(), 3, []), ['rede']) : BARRA_REDE.filter(k => k === 'perfil' || tem(k));
  /* um bloco dos Teus. O número do sinal fica no canto; as palavras, na Comanda */
  const blocoHTML = (k, D, active) => {
    const [h, l, i] = D[k], m = k === 'msg';
    const dentro = `<span class="tl-ic">${ico(i)}${m ? '<span class="msg-n num" hidden></span>' : ''}</span><span class="tl-t">${l}${dzHTML(k)}</span>${m ? '' : sinalHTML(k, true)}`;
    return h ? `<a class="tl tl-${k}" href="${esc(h)}" title="${dzTit(k, l)}" aria-label="${l}"${m ? ' data-msg' : ''}${k === active ? ' aria-current="page"' : ''}>${dentro}</a>`
      : `<button type="button" class="tl tl-${k}" data-act="${k}" title="${l}" aria-label="${l}" aria-haspopup="dialog">${dentro}</button>`;
  };
  /* a página aberta que não tá à vista no menu aparece tracejada, com o "fixar": um toque e ela entra nos Teus */
  const fantasmaHTML = (k, D) => `<button type="button" class="tl tl-aqui" data-act="menu-fixa" data-k="${k}" title="Fixar no menu" aria-label="Você tá em ${D[k][1]}. Fixar no menu"><span class="tl-ic">${ico(D[k][2])}</span><span class="tl-t">${D[k][1]}</span><span class="tl-fixa">${ico('pin')}fixar</span></button>`;
  const teusHTML = (L, D, active, onde) => {
    const vis = L.concat(onde === 'lado' ? ['msg', 'dia', 'avisos'] : barra());
    const aqui = active && D[active] && FIXAVEL(active) && !vis.includes(active) ? fantasmaHTML(active, D) : '';
    return `<div class="tls-g tls-${onde}" role="group" aria-labelledby="tls-k-${onde}"><p class="tls-k"><span id="tls-k-${onde}">${ico('star')}Teus</span><button type="button" class="tls-aj" data-act="menu-ajeita" aria-haspopup="dialog" title="Fixar, tirar e mudar a ordem">${ico('edit')}<span>Ajeitar</span></button></p>
      ${L.length || aqui ? `<div class="tls">${L.map(k => blocoHTML(k, D, active)).join('')}${aqui}</div>` : '<p class="tls-vazio">Os teus 3 primeiros tão na barra de baixo.</p>'}</div>`;
  };
  /* a Comanda: cabeçalho com o dia, uma linha por pedido (o urgente primeiro), o total e o próximo post */
  const DIA_S = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  function comandaHTML(){
    const hj = C.hojeBR(), d = new Date(hj + 'T12:00:00Z');
    const cab = `<p class="cm-h"><b>Comanda</b><span>${DIA_S[d.getUTCDay()]} ${d.getUTCDate()} ${C.MESES[d.getUTCMonth()]}</span></p>`;
    if(!SN.pronto) return `<div class="cm" aria-busy="true">${cab}<p class="cm-carrega">conferindo a fila…</p></div>`;
    const L = praHoje(), n = L.length;
    return `<div class="cm${n ? '' : ' cm-ok'}" role="group" aria-label="Comanda de hoje: ${n ? (n === 1 ? '1 pedido na fila' : `${n} pedidos na fila`) : 'tudo em dia'}">${cab}
      ${n ? `<div class="cm-ls">${L.map((k, i) => `<a class="cm-l ${SN.v[k].nivel}" href="${SN.v[k].ir || SN_IR[k][0]}" title="${esc(SN.v[k].diz)}"><i>${String(i + 1).padStart(2, '0')}</i><span>${esc(SN.v[k].diz)}</span>${ico('next', 'cm-seta')}</a>`).join('')}</div>
        ${n > 3 ? `<button type="button" class="cm-mais" data-act="cm-mais">+ ${n - 3} na fila</button>` : ''}<p class="cm-t"><span>na fila</span><b>${n}</b></p>` : '<p class="cm-carimbo"><span>Tudo em dia</span></p>'}
      ${SN.prox ? `<p class="cm-prox">${ico('clock')}<span>Próximo post: ${esc(SN.prox)}</span></p>` : ''}</div>`;
  }
  const comandaBox = onde => `<div class="cm-box cm-${onde}">${comandaHTML()}</div>`;
  /* no menu do computador a Comanda mostra 3 pedidos; o "+N" abre o resto (a caixa guarda isso até a próxima página) */
  C.acts['cm-mais'] = el => { const b = el.closest('.cm-box'); if(b){ b.classList.add('toda'); sinalRola(); } };
  /* o número da comanda (o ícone do menu estreito e a tua foto no celular) */
  const filaN = () => { const L = praHoje(); return { n: L.length, nv: L.length ? SN.v[L[0]].nivel : '' }; };
  const filaNum = cls => { const f = filaN(); return `<span class="${cls} num${f.nv ? ' ' + f.nv : ''}"${f.n ? '' : ' hidden'}>${f.n || ''}</span>`; };
  /* o Tudo (computador): os grupos de sempre, lado a lado. Quem já tá nos blocos não repete o número */
  const tudoItem = (k, D, active, vis) => {
    const [h, l, i] = D[k], dados = k === 'avisos' ? ' data-sino' : k === 'msg' ? ' data-msg' : '';
    const n = k === 'avisos' ? '<span class="sino-n num" hidden></span>' : k === 'msg' ? '<span class="msg-n num" hidden></span>' : vis.includes(k) ? '' : sinalHTML(k, true);
    return h ? `<a class="tudo-i" href="${esc(h)}"${dados}${k === active ? ' aria-current="page"' : ''}><span class="tudo-ic">${ico(i)}${k === 'msg' ? n : ''}</span><span class="tudo-t">${l}${dzHTML(k)}</span>${k === 'msg' ? '' : n}</a>`
      : `<button type="button" class="tudo-i" data-act="${k === 'avisos' ? 'sino' : k}"${dados} aria-haspopup="dialog"><span class="tudo-ic">${ico(i)}${k === 'avisos' ? n : ''}</span><span class="tudo-t">${l}${dzHTML(k)}</span>${k === 'avisos' ? '' : n}</button>`;
  };
  const tudoHTML = (D, active) => {
    const vis = blocosLado().concat(['dia']);
    return `<div class="tudo-k"><b>Tudo do Studio</b><button type="button" class="tls-aj" data-act="menu-ajeita" aria-haspopup="dialog">${ico('edit')}<span>Ajeitar o menu</span></button></div>
      <div class="tudo-g">${Object.keys(GRUPOS).map(g => { const [t, i, ks] = GRUPOS[g], l = ks.filter(tem); return l.length ? `<div class="tudo-c" role="group" aria-label="${t}"><p class="tudo-ck">${ico(i)}${t}</p>${l.map(k => tudoItem(k, D, active, vis)).join('')}</div>` : ''; }).join('')}</div>`;
  };
  /* v4.41 · a porta do Corre Studio (na Rede): o cartão do menu, o da gaveta e o do perfil, com o número da Comanda */
  const portaStudio = cls => `<a class="${cls}" href="#/dia" aria-label="Abrir o Corre Studio${filaN().n ? `. Na comanda: ${filaN().n}` : ''}"><span class="cs-ic">${ico('luminaria')}${filaNum('cs-n')}</span><span class="cs-t"><b>Corre Studio</b><small>posts, clientes e grana</small></span>${ico('next', 'cs-seta')}</a>`;
  const voltaRede = cls => `<a class="${cls}" href="#/" aria-label="Voltar pra rede">${ico('prev')}<span>Voltar pra rede</span></a>`;
  /* a gaveta do celular. No Studio: a volta pra Rede, a Comanda, os Teus que não couberam na barra (e a página aberta,
     pra fixar) e o Tudo nos grupos. Na Rede: a porta do Studio e os grupos da Rede */
  const gavetaHTML = (me, active) => {
    const D = DEST(me), bar = barra(), um = k => tem(k) ? itemSimples([k].concat(D[k]), '', k === active) : '';
    const bloco = (id, t, i, ks) => { const l = ks.filter(tem); return l.length ? `<div class="gv-g" role="group" aria-labelledby="gv-g-${id}"><span class="gv-k" id="gv-g-${id}">${i ? ico(i) : ''}${t}</span>${l.map(um).join('')}</div>` : ''; };
    if(MENU.modo !== 'studio') return portaStudio('gv-cs') + Object.keys(GRUPOS_REDE).map(g => bloco(g, GRUPOS_REDE[g][0], GRUPOS_REDE[g][1], GRUPOS_REDE[g][2])).join('');
    return voltaRede('gv-volta') + comandaBox('gaveta') + teusHTML(teus().filter(k => !bar.includes(k)).slice(0, 4), D, active, 'gaveta')
      + Object.keys(GRUPOS).map(g => bloco(g, GRUPOS[g][0], GRUPOS[g][1], GRUPOS[g][2])).join('');
  };
  /* fixar a página aberta: entra logo depois das 3 da barra (no celular, o primeiro bloco da gaveta; no computador, à vista) */
  C.acts['menu-fixa'] = el => {
    const k = el.dataset.k; if(!st.me || !FIXAVEL(k)) return;
    const L = teus().filter(x => x !== k); L.splice(Math.min(3, L.length), 0, k);
    teusGrava(Object.assign(teusLe() || {}, { fixos: L.slice(0, TEUS_MAX) }));
    refazMenu(); toast(`${DEST(st.me)[k][1]}: fixado no menu. Pra mudar a ordem, "Ajeitar".`);
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
      ${MENU.modo === 'studio' ? `<a href="#/">${ico('chat')}Voltar pra rede</a>` : `<a href="#/dia">${ico('luminaria')}Corre Studio</a>`}
      <a href="#/editar">${ico('edit')}Editar perfil</a><button type="button" data-act="st-novo">${ico('plus')}Postar story</button>${C.push ? `<button type="button" data-act="push-ajustes">${ico('bell')}${C.push.nome ? C.push.nome() : 'Avisos no celular'}</button>` : ''}<button type="button" data-act="manual">${ico('manual')}Manual do Corre</button>
      <a href="privacidade.html">${ico('lock')}Privacidade</a><a href="termos.html">${ico('check')}Termos de uso</a><button type="button" data-act="sair">${ico('prev')}Sair</button>`;
  /* o menu da esquerda (computador). v3.70: a marca com as Mensagens e o sino do lado, o Procurar, a Comanda (no menu
     estreito, o ícone com o número), os Teus, a praça e o Tudo. Postar e a conta seguem embaixo */
  /* v4.41: o alto do menu é o mesmo nas duas partes (a marca, o Procurar, as Mensagens e o sino); a marca diz em qual
     parte você tá e leva pro começo dela */
  const ladoTopo = (active, studio) => `<a class="wm lado-wm" href="${studio ? '#/dia' : '#/'}" aria-label="${studio ? 'Corre Studio, o teu dia' : 'Corre, início'}"><span class="lado-wm-t">Corre</span><span class="lado-wm-c" aria-hidden="true">C</span><span class="wm-tag" aria-hidden="true">${studio ? 'studio' : 'rede'}</span></a>
      <div class="lado-busca"><button type="button" class="lado-procura" data-act="procura" aria-label="Procurar no Corre" title="Procurar (/)" aria-haspopup="dialog">${ico('lupa')}<span class="lado-procura-t">Procurar</span><kbd aria-hidden="true">/</kbd></button>
        <a class="lado-rb" href="#/msg" data-msg${idSe(true, 'msg-btn')} aria-label="Mensagens" title="Mensagens"${active === 'msg' ? ' aria-current="page"' : ''}>${ico('send')}<span class="msg-n num" hidden></span></a><button type="button" class="lado-rb" data-act="sino" data-sino${idSe(true, 'sino')} aria-label="Avisos e agenda" title="Avisos">${ico('bell')}<span class="sino-n num" hidden></span></button></div>`;
  const ladoConta = (me, active) => `<details class="me lado-conta"${idSe(true, 'me')}><summary class="lado-eu" aria-label="Tua conta" title="${esc(me.nome || '')} (@${esc(me.handle)})">${avatar(me, 's')}<span><b>${esc(me.nome || '')}</b><small>@${esc(me.handle)}</small></span>${ico('dots')}</summary>
        <div class="me-menu">${contaHTML(me, false, active)}</div></details>`;
  /* a Rede: a lista no jeito do X (Início, Grupos, o Rolo, os Salvos, o Perfil e a carteira), a praça (o Correverso; v5.01: o
     Mural foi pro Studio) e, embaixo, a porta do Corre Studio com o número da Comanda. O Postar e a conta no pé. v5.04 (o
     Thales: "sobe a carteira correal que tá isolada e desce o correverso"): a carteira sozinha embaixo da praça parecia
     solta; entrou na lista, e o Correverso desceu pra perto da porta do Studio */
  /* v5.09: o Muralzim (a agenda de eventos de Londrina, com ingresso) logo depois dos Grupos */
  const LADO_REDE = ['inicio', 'grupos', 'muralzim', 'rolo', 'salvos', 'perfil', 'carteira'];
  const ladoRede = (active, me) => {
    const D = DEST(me), um = k => itemMenu(k, D[k][0], D[k][1], D[k][2], 'lado-i', k === active, true);
    return `<aside class="lado lado-rede" aria-label="Menu da Rede">
      ${ladoTopo(active, false)}
      <nav class="lado-nav" aria-label="Navegação">
        ${LADO_REDE.filter(tem).map(um).join('')}
        <div class="lado-praca">${PRACA.filter(tem).map(um).join('')}</div>
      </nav>
      <i class="lado-trilho" aria-hidden="true"></i>
      ${portaStudio('lado-cs')}
      <div class="lado-pe"><button type="button" class="btn pri lado-post" data-act="lado-postar" title="Postar no feed">${ico('plus')}<span>Postar</span></button>
      ${ladoConta(me, active)}</div>
    </aside>`;
  };
  /* o Studio: O teu dia, a Comanda (no menu estreito, o ícone com o número), os Teus e o Tudo do Studio; a volta pra
     Rede embaixo. No pé, no lugar do Postar, o "Pedir pro Corre" (o Fala com o Corre: anota, cobra, agenda) */
  const ladoStudio = (active, me) => {
    const D = DEST(me);
    return `<aside class="lado lado-st" aria-label="Menu do Corre Studio">
      ${ladoTopo(active, true)}
      <nav class="lado-nav" aria-label="Navegação do Studio">
        ${tem('dia') ? itemMenu('dia', D.dia[0], D.dia[1], D.dia[2], 'lado-i', active === 'dia', true) : ''}
        ${comandaBox('lado')}
        <details class="lado-mais lado-cmm"><summary class="lado-i" title="Comanda de hoje" aria-label="Comanda de hoje"><span class="mi-ic">${ico('recibo')}${filaNum('cm-n')}</span></summary><div class="lado-mais-m lado-cmm-m">${comandaBox('balao')}</div></details>
        ${teusHTML(blocosLado(), D, active, 'lado')}
        <details class="lado-mais lado-tudo"><summary class="lado-i" title="Tudo do Studio"><span class="mi-ic">${ico('grade')}</span><span class="mi-t">Tudo</span>${ico('next', 'lado-tudo-seta')}</summary>
          <div class="lado-mais-m lado-tudo-m">${tudoHTML(D, active)}</div></details>
      </nav>
      <i class="lado-trilho" aria-hidden="true"></i>
      ${voltaRede('lado-volta')}
      <div class="lado-pe"><button type="button" class="btn pri lado-post lado-fala" data-act="fala-abre" title="Pedir pro Corre: anota, cobra, agenda">${ico('magia')}<span>Pedir pro Corre</span></button>
      ${ladoConta(me, active)}</div>
    </aside>`;
  };
  const lado = (active, me) => MENU.modo === 'studio' ? ladoStudio(active, me) : ladoRede(active, me);
  /* a barra do celular (v4.41: a da Rede é fixa; a do Studio são os Teus entre O teu dia e a volta pra Rede) */
  const tabRede = `<a class="tb-i tb-rede" href="#/" title="Voltar pra rede" aria-label="Voltar pra rede"><span class="tb-rede-p">${ico('prev')}<span>Rede</span></span></a>`;
  const tabbarHTML = (me, active, cru) => `<nav class="tabbar tbx${MENU.modo === 'studio' ? ' tb-st' : ''}" aria-label="Navegação">${barra().map(k => { if(k === 'rede') return tabRede; const [h, l, i] = DEST(me)[k]; return itemMenu(k, h, l, i, 'tb-i', k === active, false); }).join('')}</nav>
      ${MENU.modo !== 'studio' && POSTAR.includes(cru || active) ? `<button type="button" class="tb-postar" data-act="lado-postar" aria-label="Postar no feed">${ico('plus')}</button>` : ''}`;
  /* o que o C.header desenhou por último: pra refazer só o menu (fixou ou ajeitou) sem redesenhar a página (a cidade
     reiniciaria) */
  const MENU = { active: '', cru: '', modo: 'rede' };
  function refazMenu(){
    const me = st.me; if(!me) return;
    const l = document.querySelector('.lado'); if(l) l.outerHTML = lado(MENU.active, me);
    const t = document.querySelector('.tabbar.tbx'); if(t){ const p = document.querySelector('.tb-postar'); if(p) p.remove(); t.outerHTML = tabbarHTML(me, MENU.active, MENU.cru); }
    const g = document.querySelector('.hdr-eu .gaveta'); if(g) g.innerHTML = contaHTML(me, true, MENU.active);
    trocaIds(); pintaSinais(); sinalRola();
    /* os números das Mensagens e do sino voltam (os elementos são novos) */
    if(C.visitas) C.visitas.sync(); if(C.avisos) C.avisos.sync(); if(C.msg) C.msg.sync();
  }
  /* ---------------- v3.70 · Ajeitar o menu: fixar, tirar e arrastar ----------------
     A folha mostra os Teus em ordem (os 4 primeiros com o número: a barra do celular). Arrasta pela alça (dedo ou mouse) ou
     usa as setas; o "+" fixa o que não tá. "Voltar pro automático" devolve o menu pro uso */
  const AJ = { L: [] };
  function ajeitaPinta(foco){
    const D = DEST(st.me), l = $('aj-l'), m = $('aj-mais'); if(!l || !m) return;
    const n = AJ.L.length;
    l.innerHTML = AJ.L.map((k, i) => `<li class="aj-i" data-k="${k}"><span class="aj-alca" title="Arrasta pra mudar a ordem" aria-hidden="true">${ico('dots')}${ico('dots')}</span><span class="aj-n${i < 3 ? ' barra' : ''}" aria-hidden="true">${i + 1}</span>${ico(D[k][2])}<b>${D[k][1]}</b>
      <span class="aj-bs"><button type="button" class="aj-b" data-aj="cima" aria-label="Subir ${D[k][1]}"${i ? '' : ' disabled'}>${ico('sobe')}</button><button type="button" class="aj-b" data-aj="baixo" aria-label="Descer ${D[k][1]}"${i < n - 1 ? '' : ' disabled'}>${ico('desce')}</button><button type="button" class="aj-b aj-tira" data-aj="tira" aria-label="Tirar ${D[k][1]} dos Teus">${ico('x')}</button></span></li>`).join('')
      || '<li class="aj-vazio">Nada fixado: o Corre completa com o de sempre.</li>';
    const fora = Object.keys(D).filter(k => FIXAVEL(k) && !AJ.L.includes(k));
    m.innerHTML = (n >= TEUS_MAX && fora.length ? `<p class="fine aj-cheio">Os Teus tão cheios (${TEUS_MAX}): pra fixar outro, tira um.</p>` : '')
      + (fora.length ? fora.map(k => `<button type="button" class="aj-add" data-aj="poe" data-k="${k}"${n >= TEUS_MAX ? ' disabled' : ''}>${ico('plus')}<span>${D[k][1]}</span></button>`).join('') : '<p class="fine">Tudo que dá pra fixar já tá nos Teus.</p>');
    const c = $('aj-cont'); if(c) c.textContent = `${n} de ${TEUS_MAX}`;
    if(foco){ const b = l.querySelector(`[data-k="${foco[0]}"] [data-aj="${foco[1]}"]`); if(b && !b.disabled) b.focus(); else { const o = l.querySelector(`[data-k="${foco[0]}"] .aj-b:not([disabled])`); if(o) o.focus(); } }
  }
  /* arrastar: o item sobe da lista e troca de lugar quando passa do meio do vizinho. Os ouvintes ficam no documento (o item
     muda de lugar no meio do arrasto, e quem é tirado da página perde a captura do ponteiro) */
  function ajeitaArrasta(e){
    const alca = e.target.closest('.aj-alca'), li = alca && alca.closest('.aj-i'), l = $('aj-l'); if(!li || !l || e.button > 0) return;
    e.preventDefault(); li.classList.add('arrasta');
    const move = ev => {
      ev.preventDefault();
      const alvo = [...l.querySelectorAll('.aj-i:not(.arrasta)')].find(x => { const r = x.getBoundingClientRect(); return ev.clientY < r.top + r.height / 2; });
      if(alvo){ if(alvo.previousElementSibling !== li) l.insertBefore(li, alvo); } else if(l.lastElementChild !== li) l.appendChild(li);
    };
    const fim = () => {
      document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', fim); document.removeEventListener('pointercancel', fim);
      li.classList.remove('arrasta'); AJ.L = [...l.querySelectorAll('.aj-i')].map(x => x.dataset.k); ajeitaPinta();
    };
    document.addEventListener('pointermove', move, { passive: false }); document.addEventListener('pointerup', fim); document.addEventListener('pointercancel', fim);
  }
  C.acts['menu-ajeita'] = () => {
    if(!st.me) return;
    AJ.L = teus().slice(0, TEUS_MAX);
    const panel = C.sheet(`<div class="aj"><div class="sheet-head"><h2>Ajeitar o menu do Studio</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p class="aj-txt">Os Teus são o menu do Corre Studio. Os 3 primeiros vão na barra de baixo do celular, entre O teu dia e a volta pra Rede. Arrasta pela alça ou usa as setas.</p>
      <p class="aj-k"><span>Teus</span><small id="aj-cont"></small></p>
      <ol class="aj-l" id="aj-l"></ol>
      <p class="aj-k"><span>Pode fixar</span></p>
      <div class="aj-mais" id="aj-mais"></div>
      <div class="acts aj-acts"><button type="button" class="btn pri" data-aj="salva">Salvar</button><button type="button" class="btn" data-aj="auto">Voltar pro automático</button></div>
      <p class="fine aj-nota">${fixados() ? 'Agora o menu tá do teu jeito.' : 'Agora o Corre monta sozinho, pelo que você mais usa. Salvou, vale o teu jeito.'}</p></div>`, 'ajeita');
    ajeitaPinta();
    panel.addEventListener('pointerdown', ajeitaArrasta);
    panel.addEventListener('click', e => {
      const b = e.target.closest('[data-aj]'); if(!b || b.disabled) return;
      const a = b.dataset.aj, li = b.closest('.aj-i'), k = li ? li.dataset.k : b.dataset.k, i = AJ.L.indexOf(k);
      if(a === 'cima' && i > 0){ AJ.L.splice(i - 1, 0, AJ.L.splice(i, 1)[0]); ajeitaPinta([k, a]); }
      else if(a === 'baixo' && i >= 0 && i < AJ.L.length - 1){ AJ.L.splice(i + 1, 0, AJ.L.splice(i, 1)[0]); ajeitaPinta([k, a]); }
      else if(a === 'tira' && i >= 0){ AJ.L.splice(i, 1); ajeitaPinta(); }
      else if(a === 'poe' && i < 0 && AJ.L.length < TEUS_MAX){ AJ.L.push(k); ajeitaPinta(); }
      else if(a === 'salva'){ teusGrava(Object.assign(teusLe() || {}, { fixos: AJ.L.slice() })); C.closeSheet(); refazMenu(); toast('Menu ajeitado.'); }
      else if(a === 'auto'){ const o = teusLe() || {}; delete o.fixos; delete o.dia; teusGrava(o); C.closeSheet(); refazMenu(); toast('Voltou pro automático: o menu se monta pelo que você mais usa.'); }
    });
  };
  /* a dica da porta do Studio: uma por abertura, até 3 ao todo; espera folha e manual fecharem; um toque ou 6 s apagam */
  const DICA_CS = { feita: false };
  function dicaStudio(){
    if(DICA_CS.feita || MENU.modo === 'studio' || innerWidth > 900) return;
    /* v5.07: na cidade a luminária fica embaixo do Correverso, e o balão boiava por cima dele (e do Ateliê) */
    if(document.body.classList.contains('cvr-cheia') || /^#\/verso/.test(location.hash)) return;
    const b = document.querySelector('.hdr-cs'), sh = $('sheet'); if(!b || !b.getBoundingClientRect().width) return;
    if(sh && !sh.hidden){ setTimeout(dicaStudio, 2500); return; }
    let n = 0; try{ n = Number(localStorage.getItem('corre-cs-dica')) || 0; }catch(e){}
    if(n >= 3) return;
    DICA_CS.feita = true; try{ localStorage.setItem('corre-cs-dica', String(n + 1)); }catch(e){}
    const r = b.getBoundingClientRect(), d = document.createElement('div');
    d.className = 'hdr-cs-dica'; d.setAttribute('role', 'status');
    d.innerHTML = '<b>Teu trabalho mora aqui:</b> o Corre Studio, com os posts, os clientes, o Mural e a grana.';
    document.body.appendChild(d);
    const dir = Math.max(8, innerWidth - r.right - 2);
    d.style.top = Math.round(r.bottom + 12) + 'px'; d.style.right = dir + 'px';
    d.style.setProperty('--seta', Math.max(10, Math.round(r.width / 2 - 8)) + 'px');
    const some = () => { d.remove(); removeEventListener('pointerdown', some, true); removeEventListener('hashchange', some); };
    addEventListener('pointerdown', some, true); addEventListener('hashchange', some); setTimeout(some, 6500);
  }
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
    if(logged && active === '' && /^#\/@/.test(location.hash) && C.decURI(location.hash.slice(3)).toLowerCase() === me.handle) active = 'perfil';
    /* v4.41: em qual das partes a página mora (as Mensagens ficam na de onde a pessoa veio) */
    const modo = logged ? modoDe(active) : 'rede', studio = modo === 'studio';
    document.body.classList.toggle('modo-studio', logged && studio);
    /* v5.02: o Studio é de noite, a Rede (e quem não entrou) é de dia */
    if(C.tema) C.tema.poe(logged && studio);
    MENU.active = active; MENU.cru = cru; MENU.modo = modo;
    if(logged && C.visitas) setTimeout(() => C.visitas.sync(), 0);
    /* v3.69: o menu esperto (o uso de cada página e os sinais, de 2 em 2 minutos no máximo) */
    /* (no balcão dos lugares 3D o menu não aparece: conta o uso, mas não faz as consultas dos sinais de novo) */
    if(logged){ usoConta(active); if(active === 'mural' && SN.v.mural && SN.v.mural.nivel === 'info') delete SN.v.mural; if(!C.EMBED) setTimeout(() => sinaisCarrega().then(pintaSinais), 0); }
    if(logged && C.avisos) setTimeout(() => C.avisos.sync(), 0);
    if(logged && C.msg) setTimeout(() => C.msg.sync(), 0);
    /* avisos no celular: confere a inscrição deste aparelho (uma vez por abertura) */
    if(logged && C.push) setTimeout(() => C.push.sync(), 1500);
    /* o manual abre sozinho na primeira entrada e a cada atualização */
    if(logged && C.manual) setTimeout(() => C.manual.talvez(), 900);
    /* v4.01: no celular, fora do app da tela de início, o convite pra pôr o Corre na tela (depois do manual, uma folha por vez) */
    if(logged && C.instala && !C.EMBED) setTimeout(() => C.instala.talvez(), 2600);
    /* v4.02: avisa o banco que a pessoa abriu o Corre hoje (uma vez por dia por aparelho; a Lojinha conta) */
    if(logged && C.marcaDia) setTimeout(() => C.marcaDia(), 1200);
    /* v4.41: no celular, na Rede, as 3 primeiras vezes um balão aponta pra porta do Corre Studio (a luminária) */
    if(logged && !studio && !C.EMBED) setTimeout(dicaStudio, 3200);
    /* em tela baixa a lista do menu rola: o item aceso aparece (depois de a página ir pra tela) */
    if(logged) setTimeout(() => { aVista(document.querySelector('.lado-nav [aria-current="page"]')); sinalRola(); }, 0);
    const v = logged && VOLTA[cru];
    /* v5.09: toda página que não é a casa da parte ganha o Voltar (o de cima mapeado, ou o da pilha da aba) */
    let volta = v ? (v[0] === 'perfil' ? ['#/@' + me.handle, 'Perfil'] : v) : null;
    if(logged && !volta && !SEM_VOLTA.includes(cru) && !C.EMBED){ const pra = C.voltaPra(); volta = [pra, nomeVolta(pra)]; }
    return `<header class="hdr">
      ${logged ? `<details class="me hdr-eu"${idSe(false, 'me')}><summary aria-label="Abrir o menu${studio ? ' do Corre Studio' : ''}: teu perfil e o teu corre${studio && filaN().n ? `. Na comanda: ${filaN().n}` : ''}">${avatar(me, 's')}${studio ? filaNum('eu-n') : ''}</summary>
        <div class="gv-scrim" data-act="gaveta-x" aria-hidden="true"></div><div class="me-menu gaveta" aria-label="Teu menu">${contaHTML(me, true, active)}</div></details>` : ''}
      <nav class="topnav" aria-label="Navegação">
        <a class="wm" href="${logged && studio ? '#/dia' : '#/'}" aria-label="${logged && studio ? 'Corre Studio, o teu dia' : 'Corre, início'}">Corre<span class="wm-tag" aria-hidden="true">${logged && studio ? 'studio' : 'rede'}</span></a>
        ${!st.user ? `<a class="hl" href="#/">Entrar</a>` : ''}
      </nav>
      ${logged && !studio ? `<a class="hdr-cs" href="#/dia" aria-label="Abrir o Corre Studio${filaN().n ? `. Na comanda: ${filaN().n}` : ''}" title="Corre Studio">${ico('luminaria')}<span class="hdr-cs-t">Studio</span>${filaNum('cs-n')}</a>` : ''}
      ${logged ? `<button type="button" class="hdr-procura" data-act="procura" aria-label="Procurar no Corre" title="Procurar" aria-haspopup="dialog">${ico('lupa')}</button>` : ''}
      ${logged ? `<button type="button" class="sino hdr-sino" data-act="sino" data-sino${idSe(false, 'sino')} aria-label="Avisos e agenda" title="Avisos">${ico('bell')}<span class="sino-n num" hidden></span></button>` : ''}
      ${logged && studio ? `<button type="button" class="oculto-btn" data-act="oculto" aria-pressed="${C.oculto}" aria-label="${C.oculto ? 'Mostrar valores' : 'Esconder valores'}" title="${C.oculto ? 'Mostrar valores' : 'Esconder valores'}">${ico(C.oculto ? 'eyeoff' : 'eye')}</button>` : ''}
      ${st.user && !me ? `<details class="me" id="me">
        <summary aria-label="Menu da conta">${avatar({ nome: st.user.email }, 's')}</summary>
        <div class="me-menu"><a href="privacidade.html">Privacidade</a><a href="termos.html">Termos de uso</a><button type="button" data-act="sair">Sair</button></div>
      </details>` : ''}
    </header>
    ${volta ? `<nav class="migalha" aria-label="Voltar"><a href="${esc(volta[0])}" data-volta>${ico('prev')} Voltar${volta[1] ? `<span class="mg-pra"> · ${esc(volta[1])}</span>` : ''}</a></nav>` : ''}
    ${logged ? lado(active, me) : ''}
    ${logged ? tabbarHTML(me, active, cru) : ''}`;
  };

  /* ---------------- v3.65 · procurar ---------------- */
  /* O Thales pediu uma barra pra procurar grupos, gente, ferramentas "etc". É uma busca só, de qualquer página: a barra no
     alto do menu (computador), a lupa no alto (celular), a tecla / ou Ctrl+K. Ferramentas e lugares da cidade se acham aqui
     mesmo, na hora (sem banco); gente, grupos e posts vão no banco, e o banco só devolve o que a pessoa já podia ver */
  const semAcento = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const palavras = s => semAcento(s).split(/[^a-z0-9]+/).filter(Boolean);
  /* a nota de um resultado: cada palavra digitada tem que começar uma palavra do nome (vale 3) ou do apelido (vale 1);
     nome que começa com o que foi digitado ganha mais. Por começo de palavra: "ana" não acha a "Banca" */
  function nota(q, nome, kw){
    const Q = palavras(q); if(!Q.length) return 0;
    const N = palavras(nome), K = palavras(kw); let n = 0;
    for(const w of Q){ if(N.some(x => x.startsWith(w))) n += 3; else if(K.some(x => x.startsWith(w))) n += 1; else return 0; }
    return n + (semAcento(nome).startsWith(Q.join(' ')) ? 3 : 0);
  }
  /* pinta de marca-texto o pedaço que bateu (sem ligar pra acento: "joao" marca o "João") */
  function marca(txt, q){
    const ch = [...String(txt || '')], nz = ch.map(c => semAcento(c)), pos = []; let soma = 0;
    nz.forEach(z => { pos.push(soma); soma += z.length; });
    const plano = nz.join(''), on = ch.map(() => false);
    palavras(q).forEach(w => {
      const m = new RegExp('(^|[^a-z0-9])' + w).exec(plano); if(!m) return;
      const ini = m.index + m[1].length, fim = ini + w.length; pos.forEach((p, i) => { if(p >= ini && p < fim) on[i] = true; });
    });
    let out = '', dentro = false;
    ch.forEach((c, i) => { if(on[i] !== dentro){ out += on[i] ? '<mark>' : '</mark>'; dentro = on[i]; } out += esc(c); });
    return out + (dentro ? '</mark>' : '');
  }
  /* as ferramentas e os atalhos do app: o menu inteiro (DEST, o que a pessoa tem) e mais o que mora dentro das páginas */
  const FERR = () => {
    const D = DEST(st.me);
    return [
      ['inicio', 'O feed: quem você segue e o que é pra você', 'feed home timeline posts comeco'],
      ['msg', 'Conversas, pedidos e o papo dos grupos', 'chat conversa direct dm inbox papo mensagem'],
      ['grupos', 'Gente do mesmo corre num lugar só', 'comunidade turma galera'],
      ['avisos', 'Notificações e a agenda do dia', 'notificacao notificacoes sino agenda alerta lembrete'],
      ['dia', 'Corre Studio: o que fazer hoje e todas as ferramentas de trabalho', 'corre studio painel trabalho trampo dashboard hoje ferramentas comanda pra hoje'],
      ['caderno', 'Tarefas do dia, lista de afazer e lembrete na hora', 'planner tarefa tarefas todo todoist afazer lista agenda organizar lembrete checklist caderno caderninho'],
      ['studio', 'Programa e posta no Instagram', 'instagram post programar agendar calendario conteudo redes sociais legenda reels'],
      ['houzi', 'Marca, logo e brandbook', 'branding logo logotipo logomarca marca identidade visual brandbook paleta'],
      ['horus', 'Caça, funil e pedidos de clientes', 'clientes leads prospeccao prospectar abordagem radar empresas crm funil pipeline negociacao rd station'],
      ['marcas', 'Teus trabalhos e a vitrine do que você vende', 'portfolio catalogo vitrine trabalhos produtos loja'],
      ['verso', 'A cidade do Corre', 'cidade jogo game mapa pixel'],
      ['mural', 'Pedidos de serviço: quem faz o quê', 'pedido pedidos servico freela trabalho quem faz contratar'],
      ['muralzim', 'Os eventos de Londrina e o ingresso vendido aqui', 'evento eventos agenda show shows festa balada teatro rolê role ingresso ingressos ticket feira oficina londrina o que fazer'],
      ['corre', 'Do orçamento ao dinheiro na conta', 'vendas venda grana dinheiro financeiro caixa receita despesa orcamento lucro'],
      ['carteira', 'Teu saldo de correal', 'correal saldo moeda'],
      ['planos', 'Assinaturas e faturas', 'assinatura assinar pagar pagamento fatura plano preco pix boleto cartao'],
      ['lojinha', 'Como tá o Corre: gente, uso, planos e IA', 'painel dashboard numeros metricas estatistica dados lojinha crescimento usuarios'],
      ['banca', 'As manchetes do teu assunto', 'noticias noticia manchetes jornal'],
      ['refs', 'Referências e datas do teu nicho', 'referencias inspiracao nicho datas comemorativas'],
      ['rolo', 'Filmes em 360', 'filme filmes cinema'],
      ['perfil', 'Como os outros te veem', 'eu conta bio'],
      ['salvos', 'Os posts que você guardou', 'salvo guardado guardados favoritos']
    ].filter(([k]) => tem(k)).map(([k, d, kw]) => ({ k, h: D[k][0], a: D[k][0] ? '' : (k === 'avisos' ? 'sino' : k), t: D[k][1], i: D[k][2], d, kw })).concat([
      { k: 'estilo', h: '#/estilo', t: 'Estilo de vida', i: 'calc', d: 'Quanto custa o teu mês', kw: 'custo vida calculadora meta gastos' },
      { k: 'editar', h: '#/editar', t: 'Editar perfil', i: 'edit', d: 'Foto, nome, bio e quem vê teus dados', kw: 'foto nome bio desbaratinado privacidade conta capa ferramentas' },
      { k: 'postar', a: 'lado-postar', t: 'Postar no feed', i: 'plus', d: 'Escrever um post', kw: 'publicar post novo escrever' },
      { k: 'story', a: 'st-novo', t: 'Postar story', i: 'plus', d: 'Some em 24 horas', kw: 'story stories' },
      { k: 'msg-nova', a: 'msg-nova', t: 'Nova mensagem', i: 'send', d: 'Chamar alguém pra conversar', kw: 'mandar mensagem conversar chamar' },
      { k: 'gr-novo', a: 'gr-novo', t: 'Criar grupo', i: 'gente', d: 'Juntar a tua turma', kw: 'novo grupo comunidade' },
      /* v4.16: as abas do Hórus (o funil de vendas e quem chegou sozinho) */
      /* v4.29: o Monta meu Corre e a página aberta dos clientes */
      { k: 'monta', h: '#/monta', t: 'Monta meu Corre com IA', i: 'magia', d: 'Uma frase e o Corre monta link na bio, o mês no Studio Cria, clientes e a semana', kw: 'montar monta comecar começar ia configurar inicio setup onboarding automatico' },
      /* v5.09: o Muralzim por dentro (os ingressos de quem comprou, divulgar e a conta de quem vende) */
      { k: 'mz-ingressos', h: '#/muralzim/ingressos', t: 'Meus ingressos', i: 'ingresso', d: 'Os ingressos que você comprou no Muralzim, com o QR', kw: 'ingresso ingressos ticket qr entrada show evento comprei' },
      { k: 'mz-divulgar', h: '#/muralzim/divulgar', t: 'Divulgar evento no Muralzim', i: 'plus', d: 'Teu cartaz no muro de Londrina, de graça; ingresso vendido aqui', kw: 'divulgar evento cartaz vender ingresso festa show produtor organizador' },
      { k: 'mz-conta', h: '#/muralzim/conta', t: 'Conta de recebimento (ingressos)', i: 'cartao', d: 'Onde cai o dinheiro do ingresso que você vende', kw: 'conta recebimento asaas wallet receber dinheiro ingresso vender organizador' },
      { k: 'clientes', h: '#/clientes', t: 'Quantos clientes tem pra você', i: 'eye', d: 'Conta as empresas da tua cidade no mapa, por ramo', kw: 'clientes quantos empresas bairro cidade mapa mercado prospectar leads potencial' },
      ...(C.ferr('horus') ? [{ k: 'hz-funil', h: '#/horus/funil', t: 'Funil de vendas', i: 'grafico', d: 'Hórus: arrasta o cliente até o fechou', kw: 'funil crm pipeline negociacao negocios vendas previsao etapa proposta fechou kanban rd station' },
        { k: 'hz-entrada', h: '#/horus/entrada', t: 'Pedidos que chegaram', i: 'chat', d: 'Hórus: orçamento, Mural e mensagem que viraram cliente', kw: 'entrada pedido pedidos orcamento leads chegou cliente novo inbound caixa' }] : []),
      /* v4.34: o Atendente 24h e o Piloto automático */
      { k: 'atende', h: '#/atendente', t: 'Atendente 24h', i: 'atende', d: 'Responde teus clientes no link na bio e no orçamento, de dia e de noite', kw: 'atendente atendimento chatbot bot robo ia responder cliente duvida 24h automatico whatsapp sac suporte faq' },
      { k: 'piloto', h: '#/piloto', t: 'Piloto automático', i: 'piloto', d: 'Põe no Caderninho o cliente esfriando, a cobrança vencida e a marca sem post', kw: 'piloto automatico automacao automatizar lembrete cobrar retomar follow up followup esfriando rotina' },
      { k: 'mural-novo', h: '#/mural/novo', t: 'Fixar um pedido no Mural', i: 'tacha', d: 'Quem faz te manda proposta', kw: 'pedir servico orcamento' },
      { k: 'push', a: 'push-ajustes', t: C.push && C.push.nome ? C.push.nome() : 'Avisos no celular', i: 'bell', d: 'Liga e desliga as notificações', kw: 'notificacao notificacoes push celular computador mac windows avisos' },
      ...(C.instala && C.instala.falta() ? [{ k: 'instala', a: 'instala', t: 'Pôr o Corre na tela do celular', i: 'cel', d: 'Vira app: tela inteira e os avisos', kw: 'instalar app aplicativo tela inicio inicial icone atalho celular iphone android cheia full screen' }] : []),
      { k: 'manual', a: 'manual', t: 'Manual do Corre', i: 'manual', d: 'Como usar cada coisa', kw: 'ajuda duvida tutorial como funciona' },
      { k: 'doa', h: '#/linkbio', t: 'Dá um corre: doação pra entidade', i: 'heart', d: 'Uma entidade de Londrina no teu link na bio, com o Pix dela', kw: 'doar doacao doação entidade caridade causa ong ajudar solidario pix instituicao' },
      { k: 'google', h: '#/editar', t: 'Aparecer no Google', i: 'lupa', d: 'Teu trabalho na página aberta do teu ramo em Londrina', kw: 'google busca procurar seo londrina pagina publica aparecer achar cliente vitrine' },
      { k: 'loja', a: 'cvr-loja', t: 'Ateliê: loja de skins', i: 'star', d: 'Fantasias pro teu avatar, em correal ou em real', kw: 'skin skins loja roupa fantasia fantasias uniforme avatar comprar atelie natal papai noel' },
      { k: 'privacidade', h: 'privacidade.html', t: 'Privacidade', i: 'lock', d: 'O que o Corre guarda e por quê', kw: 'dados lgpd' },
      { k: 'termos', h: 'termos.html', t: 'Termos de uso', i: 'check', d: 'Planos, cobrança, cancelar e desistir em 7 dias', kw: 'termos contrato regras cancelar cancelamento desistir devolver reembolso estorno arrependimento cdc consumidor' }
    /* um atalho que é botão só aparece se o módulo dele carregou (sem o Grupos, nada de "Criar grupo") */
    ]).filter(f => !f.a || C.acts[f.a]).map(f => ({ tipo: 'f', key: 'f:' + f.k, t: f.t, s: f.d, i: f.i, h: f.h || '', a: f.a || '', kw: f.kw }));
  };
  /* os lugares da cidade (os nomes são os do Mapa do Correverso: K.lugares em verso.js). Tocou, vai direto pra lá */
  const LUGARES_V = [
    ['Tua casa', 'home', 'Decorar e receber gente', 'casa decorar moveis toca discos lar'],
    ['Feira do Corre', 'toldo', 'As barracas das ferramentas', 'feira barracas barraca'],
    ['Calçadão', 'gente', 'Em 3D: o Relojão, os bancos e muita gente', 'calcadao 3d relojao ouro verde catedral banco pombo centro pedra portuguesa'],
    ['Autódromo do Café', 'carro', 'Corrida de moto e de carro', 'corrida moto carro pista autodromo largada'],
    ['Pista do Zerão', 'carro', 'Kart com os bichos, 4 pistas', 'kart patinete corrida bichos jet'],
    ['Zerão', 'verso', 'Quadras com desafio: futsal e basquete', 'quadra quadras futsal basquete desafio bola'],
    ['Pista de skate', 'raio', 'Bowl, rampa, caixote e corrimão no Zerão', 'skate shape manobra ollie kickflip bowl rampa zerao pista'],
    ['Píer do Igapó', 'peixe', 'Torneio de pesca', 'pesca pescar peixe torneio'],
    ['Lago Igapó', 'verso', 'O lago da cidade, do Igapó 3 ao 1', 'lago agua igapo aterro higienopolis'],
    /* v4.14: a barragem do Igapó 1, onde o lago vira o ribeirão que desce até o Arthur Thomas */
    ['Barragem do Igapó', 'verso', 'Onde o lago vira ribeirão, rumo ao Arthur Thomas', 'barragem represa ribeirao cambezinho vertedouro igapo'],
    ['Porto do Tibagi', 'peixe', 'Barquinho e pesca da piapara no rio', 'rio tibagi barco barquinho pesca pescar piapara peixe porto'],
    ['Prainha do Tibagi', 'verso', 'Areia, guarda-sol e o outro píer do rio', 'prainha praia areia rio tibagi'],
    /* v4.05 */
    ['De Boa', 'play', 'O jogo da capivara, na Prainha do Tibagi', 'de boa jogo capivara empilhar bichos torre prainha tibagi'],
    /* v4.08 */
    ['Gude', 'play', 'Bolinha de gude no parquinho do Zerão', 'gude bolinha bolinhas peteleco vidro circulo parquinho zerao jogo'],
    /* v4.26 */
    ['Muro de grafite', 'play', 'O Spray: grafite no muro do fundo da quadra', 'spray grafite grafiti pichacao lata muro tinta arte rua jogo'],
    ['Sítio do café', 'play', 'A Geada de 75: salva o cafezal da geada negra', 'geada 75 1975 cafe cafezal sitio roca fazenda porteira frio jogo'],
    ['ACEL · Beisebol', 'verso', 'Desafio de rebatida do Red Sharks', 'beisebol baseball red sharks rebatida'],
    ['Sebo', 'musica', 'Discos pro teu toca-discos', 'discos disco vinil musica'],
    ['Ateliê', 'star', 'A loja de skins', 'skin skins loja roupa fantasia uniforme atelie'],
    ['Estádio do Café', 'verso', 'O estádio da cidade', 'futebol estadio'],
    ['Aeroporto', 'aviao', 'Voo pra qualquer canto da cidade', 'voo voar aviao viajar paraquedas'],
    ['Parque Arthur Thomas', 'verso', 'Mata, trilhas, macacos-prego e a Usina de 1939', 'parque arthur thomas mata trilha macaco macacos prego quati usina cambe lago'],
    ['Jaula dos Macacos', 'play', 'O jogo Elo Perdido', 'elo perdido jogo jaula macaco macacos simao'],
    ['Salto Beija-Flor', 'verso', 'A cachoeira do Arthur Thomas', 'salto beija flor cachoeira queda agua basalto'],
    ['Bosque dos Ipês', 'verso', 'Ipê florido o ano inteiro', 'bosque ipe ipes arvores'],
    ['Gleba Palhano', 'verso', 'Os prédios altos', 'predios gleba'],
    /* v3.87: só no Natal (15/10 até o Dia de Reis), quando ele tá no lago */
    ['Papai Noel do Igapó', 'star', 'O maior do mundo, 27 m, em pé no lago', 'papai noel natal arvore luzes igapo gigante guinness presente', 'natal']
  ].map(([t, i, s, kw, so]) => ({ tipo: 'v', key: 'v:' + t, t, s, i, lugar: t, kw, natal: so === 'natal' }));
  /* o que a pessoa abriu pela busca fica no aparelho (por login), pra voltar com um toque */
  const REC_K = 'corre-procura';
  const recentes = () => { try{ const o = JSON.parse(localStorage.getItem(REC_K) || 'null'); return o && st.me && o.u === st.me.id && Array.isArray(o.L) ? o.L.slice(0, 6) : []; }catch(e){ return []; } };
  const guardaRecente = o => { if(!st.me || o.tipo === 'm' || o.tipo === 't' || o.tipo === 'h' || o.tipo === 'fz' || o.tipo === 'ia') return; try{ const x = Object.assign({}, o); delete x.kw; localStorage.setItem(REC_K, JSON.stringify({ u: st.me.id, L: [x].concat(recentes().filter(r => r.key !== o.key)).slice(0, 6) })); }catch(e){} };
  /* o que tá em alta no feed (as hashtags da semana), guardado por 5 minutos */
  let altaCache = null;
  const emAlta = async () => {
    if(altaCache && Date.now() - altaCache.t < 3e5) return altaCache.L;
    let L = []; try{ L = ((await api.rpc('corre_em_alta', { dias: 7 })) || []).filter(x => x && x.tag).slice(0, 8); }catch(e){}
    altaCache = { t: Date.now(), L }; return L;
  };
  /* o banco: gente (pelo @, pelo nome e pelo que faz), grupos e posts com o texto. Cada um pode falhar sozinho */
  async function noBanco(q){
    const cru = String(q || '').trim().replace(/^[@#]+/, '').slice(0, 60), like = '%' + cru.replace(/[%_\\]/g, '') + '%', z = semAcento(cru);
    if(cru.length < 2) return { gente: [], grupos: [], posts: [] };
    const pp = c => api.q('corre_perfis', { ilike: { [c]: like }, eq: { visibilidade: 'publico' }, limit: 8 }).catch(() => []);
    const [a, b, c, g, ps] = await Promise.all([pp('handle'), pp('nome'), cru.length >= 3 ? pp('faz') : [],
      C.views.grupos ? api.rpc('corre_grupos_lista', { p_busca: cru, p_lim: 6 }).catch(() => []) : [],
      cru.length >= 3 ? api.q('corre_feed', { join: 'perfil', order: ['created_at', false], limit: 4, is: { fio: null, grupo: null }, ilike: { texto: like } }).catch(() => []) : []]);
    /* a ordem da gente: o @ que começa igual, o nome que começa igual, o resto */
    const vistos = new Set(), gente = [];
    const pontua = p => (semAcento(p.handle).startsWith(z) ? 6 : 0) + (palavras(p.nome).some(w => w.startsWith(z)) ? 4 : 0) + (semAcento(p.nome).includes(z) || semAcento(p.handle).includes(z) ? 2 : 0) + (p.id === C.uid() ? -1 : 0);
    a.concat(b, c).forEach(p => { if(p && p.id && p.handle && !vistos.has(p.id)){ vistos.add(p.id); gente.push(p); } });
    gente.sort((x, y) => pontua(y) - pontua(x));
    return { gente: gente.slice(0, 6), grupos: (g || []).slice(0, 5), posts: (ps || []).filter(p => p && p.id && p.texto).slice(0, 3) };
  }
  /* um pedaço do post em volta do que bateu */
  const trecho = (t, q) => {
    const s = String(t || '').replace(/\s+/g, ' ').trim(), i = Math.max(0, semAcento(s).indexOf(semAcento(String(q).trim().replace(/^[@#]+/, ''))));
    const ini = Math.max(0, i - 34), fim = Math.min(s.length, ini + 110);
    return (ini ? '…' : '') + s.slice(ini, fim) + (fim < s.length ? '…' : '');
  };
  const umaPessoa = p => ({ tipo: 'p', key: 'p:' + p.id, t: p.nome || '@' + p.handle, s: '@' + p.handle + (p.faz ? ' · ' + p.faz : ''), h: '#/@' + p.handle, av: { nome: p.nome || p.handle, avatar_url: p.avatar_url || '', aberto: !!p.aberto } });
  const umGrupo = g => ({ tipo: 'g', key: 'g:' + g.slug, t: g.nome, s: `${Number(g.membros_n) === 1 ? '1 membro' : `${Number(g.membros_n) || 0} membros`} · ${g.fechado ? 'fechado' : 'aberto'}${g.eu && g.eu.estado === 'ativo' ? ' · você tá dentro' : ''}`, h: '#/g/' + g.slug, gav: { nome: g.nome, cor: g.cor, capa_url: g.capa_url } });
  const umPost = (p, q) => { const a = p.perfil || {}; return { tipo: 'post', key: 'post:' + p.id, t: trecho(p.texto, q), s: '@' + (a.handle || '') + (p.created_at && C.rel ? ' · ' + C.rel(p.created_at) : ''), h: '#/p/' + p.id, av: { nome: a.nome || a.handle || '', avatar_url: a.avatar_url || '' } }; };

  const P = { q: '', seq: 0, lista: [], ativo: -1, banco: null, bancoQ: '', t: 0 };
  const icone = o => o.av ? avatar(o.av, 's') : o.gav && C.grupos ? C.grupos.av(o.gav, 's') : `<span class="pq-ic pq-ic-${o.tipo}${o.nivel ? ' pq-n-' + o.nivel : ''}">${ico(o.i)}</span>`;
  const rotulo = { f: 'ferramenta', v: 'na cidade', p: 'perfil', g: 'grupo', post: 'post', m: 'mural', t: 'hashtag', fz: 'fazer', ia: 'IA' };
  function itemHTML(o, q){
    const n = P.lista.push(o) - 1, abre = o.h ? `a href="${esc(o.h)}"` : 'button type="button"', fecha = o.h ? 'a' : 'button';
    return `<${abre} class="pq-it pq-${o.tipo}" role="option" id="pq-o-${n}" data-pq="${n}" aria-selected="false" tabindex="-1"${o.calc ? ` data-calc="${esc(o.calc)}"` : ''}>${icone(o)}<span class="pq-tx"><b>${q ? marca(o.t, q) : esc(o.t)}</b>${o.s ? `<small>${q ? marca(o.s, q) : esc(o.s)}</small>` : ''}</span><span class="pq-tipo">${rotulo[o.tipo] || ''}</span></${fecha}>`;
  }
  const secao = (id, titulo, L, q, extra) => L.length ? `<div class="pq-sec pq-sec-${id}" role="group" aria-labelledby="pq-s-${id}"><p class="pq-k" id="pq-s-${id}"><span>${titulo}</span>${extra || ''}</p>${L.map(o => itemHTML(o, q)).join('')}</div>` : '';
  /* sem nada digitado: o que a pessoa abriu antes, os atalhos de sempre e o que tá em alta */
  async function pintaVazio(){
    const res = $('pq-res'); if(!res) return;
    P.lista = []; const rec = recentes(), F = FERR(), por = k => F.find(f => f.key === 'f:' + k);
    /* v3.69: os atalhos começam pelo que a pessoa mais usa e completam com os de sempre; e o "Pra hoje" vem em cima */
    const atalhos = [...new Set(maisUsados(8, ['inicio']).concat(['studio', 'houzi', 'horus', 'corre', 'verso', 'mural', 'grupos', 'planos']))].map(por).filter(Boolean).slice(0, 8);
    const hoje = praHoje().map(k => ({ tipo: 'h', key: 'h:' + k, t: SN.v[k].diz, s: '', i: SN_IR[k][1], h: SN.v[k].ir || SN_IR[k][0], nivel: SN.v[k].nivel }));
    /* v4.33: "pede pro Corre" com os exemplos (tocou, o pedido vai pra barra) */
    const pede = C.fala ? `<div class="pq-sec pq-pede" role="group" aria-labelledby="pq-s-pd"><p class="pq-k" id="pq-s-pd"><span>Pede pro Corre</span></p><div class="pq-chips">${C.fala.EXEMPLOS.slice(0, 4).map(x => `<button type="button" class="pq-chip" data-fala-ex="${esc(x)}" tabindex="-1">${ico('magia')}<span>${esc(x)}</span></button>`).join('')}</div></div>` : '';
    res.innerHTML = secao('hoje', 'Pra hoje', hoje, '') + pede + secao('rec', 'Recentes', rec, '', `<button type="button" class="pq-limpa" data-pq-limpa>limpar</button>`)
      + `<div class="pq-sec" role="group" aria-labelledby="pq-s-at"><p class="pq-k" id="pq-s-at"><span>Atalhos</span></p><div class="pq-chips">${atalhos.map(o => { const n = P.lista.push(o) - 1; return o.h ? `<a class="pq-chip" href="${esc(o.h)}" data-pq="${n}" tabindex="-1">${ico(o.i)}<span>${esc(o.t)}</span></a>` : `<button type="button" class="pq-chip" data-pq="${n}" tabindex="-1">${ico(o.i)}<span>${esc(o.t)}</span></button>`; }).join('')}</div></div>
      <div class="pq-sec pq-alta" id="pq-alta" hidden></div>
      <p class="pq-nada pq-como">Procura gente pelo nome, pelo @ ou pelo que faz (fotógrafo, DJ, bolo), um grupo, uma ferramenta, um lugar do Correverso ou um #assunto. Ou pede o que quer fazer, do teu jeito.</p>`;
    marcaAtivo(-1);
    const seq = P.seq, L = await emAlta(), el = $('pq-alta');
    if(!el || seq !== P.seq || !L.length) return;
    el.hidden = false;
    el.innerHTML = `<p class="pq-k"><span>Em alta no Corre</span></p><div class="pq-chips">${L.map(x => `<button type="button" class="pq-chip pq-tag" data-pq-tag="${esc(x.tag)}" tabindex="-1">#${esc(x.tag)}</button>`).join('')}</div>`;
  }
  function pinta(){
    const res = $('pq-res'); if(!res) return;
    const q = P.q.trim(); if(!q) return pintaVazio();
    P.lista = [];
    const tag = /^#[\p{L}\p{N}_]{2,}$/u.test(q) ? q.slice(1).toLowerCase() : '';
    const pontua = L => L.map(o => ({ o, n: nota(q, o.t, o.kw) })).filter(x => x.n).sort((a, b) => b.n - a.n).map(x => x.o);
    const F = tag ? [] : pontua(FERR()).slice(0, 5), V = tag ? [] : pontua(LUGARES_V.filter(l => !l.natal || (C.verso && C.verso.natal && C.verso.natal()))).slice(0, 4);
    /* hashtag não vai no banco (o "#tag no feed" leva pros posts); o resto, com 2 letras ou mais */
    const vaiNoBanco = !/^#/.test(q) && q.replace(/^@+/, '').length >= 2, B = P.bancoQ === q ? P.banco : null, esperando = vaiNoBanco && !B;
    const gente = B ? B.gente.map(umaPessoa) : [], grupos = B ? B.grupos.map(umGrupo) : [], posts = B ? B.posts.map(p => umPost(p, q)) : [];
    const mais = [];
    if(tag && C.acts['fd-tag']) mais.push({ tipo: 't', key: 't:' + tag, t: `#${tag} no feed`, s: 'Os posts com essa hashtag', i: 'fogo', tag });
    if(C.mural && C.mural.procura && q.replace(/^[@#]+/, '').length >= 2) mais.push({ tipo: 'm', key: 'm', t: `Procurar "${q.replace(/^[@#]+/, '')}" no Mural`, s: 'Pedidos de serviço de quem precisa', i: 'tacha', mural: q.replace(/^[@#]+/, '') });
    /* ferramenta que bateu pelo nome vem primeiro ("studio"); bateu só pelo apelido ("foto"), a gente vem antes */
    const forte = F.length && nota(q, F[0].t, '') > 0;
    const blocos = [
      ['f', 'Ferramentas', F], ['v', 'No Correverso', V], ['p', 'Gente', gente], ['g', 'Grupos', grupos], ['post', 'Posts', posts]
    ];
    const ordem = forte ? blocos : [blocos[2], blocos[3], blocos[0], blocos[1], blocos[4]];
    /* v4.33 · Fala com o Corre: o pedido entendido no aparelho vem em cima (o Enter faz); o que só parece um pedido
       (começa com um verbo e diz quando) fica embaixo, pra não roubar o Enter de quem só procura. A IA, quando o
       aparelho não entendeu: em cima se a frase pede alguma coisa, senão no fim */
    const FZ = C.fala ? C.fala.itens(q) : { fazer: [], ia: null, topo: false };
    const fzForte = FZ.fazer.filter(o => o.fz.forte), fraco = FZ.fazer.filter(o => !o.fz.forte);
    const iaEmCima = FZ.ia && (FZ.topo || (!fzForte.length && !fraco.length && !F.length && !V.length && B && !gente.length && !grupos.length && !posts.length));
    const fazer = fzForte.concat(iaEmCima ? [FZ.ia] : []);
    if(FZ.ia && !iaEmCima) mais.unshift(FZ.ia);
    const html = secao('fz', 'Fazer', fazer, '') + ordem.map(([id, t, L]) => secao(id, t, L, id === 'post' ? q.replace(/^[@#]+/, '') : q)).join('') + secao('fz2', 'Fazer', fraco, '');
    const nadaAinda = !html && !esperando;
    res.innerHTML = html
      + (esperando ? `<div class="pq-sec pq-espera" aria-hidden="true"><p class="pq-k"><span>Gente e grupos</span></p><i></i><i></i><i></i></div>` : '')
      + (nadaAinda ? `<p class="pq-nada">Nada com "${esc(q)}" por aqui. Tenta o @ da pessoa, o nome do grupo ou o que ela faz.</p>` : '')
      + secao('m', 'Mais', mais, '');
    marcaAtivo(P.lista.length ? 0 : -1);
    if(C.fala) C.fala.preenche(res);
    const st2 = $('pq-status'); if(st2) st2.textContent = esperando ? 'Procurando…' : `${P.lista.length} ${P.lista.length === 1 ? 'resultado' : 'resultados'}`;
  }
  /* o item aceso (setas do teclado e o Enter): o leitor de tela ouve pelo aria-activedescendant */
  function marcaAtivo(n){
    const inp = $('pq-q'), its = [...document.querySelectorAll('#pq-res [data-pq]')];
    P.ativo = its.length ? Math.max(-1, Math.min(n, its.length - 1)) : -1;
    its.forEach((el, i) => { el.classList.toggle('on', i === P.ativo); if(el.getAttribute('role') === 'option') el.setAttribute('aria-selected', String(i === P.ativo)); });
    const el = its[P.ativo];
    if(inp){ if(el && el.id) inp.setAttribute('aria-activedescendant', el.id); else inp.removeAttribute('aria-activedescendant'); }
    if(el && P.teclado) el.scrollIntoView({ block: 'nearest' });
  }
  async function procura(){
    const q = P.q.trim(), seq = ++P.seq;
    pinta();
    if(q.replace(/^[@#]+/, '').length < 2 || /^#/.test(q)){ $('pq-q') && $('pq-q').closest('.pq').classList.remove('carregando'); return; }
    const caixa = $('pq-q') && $('pq-q').closest('.pq'); if(caixa) caixa.classList.add('carregando');
    const B = await noBanco(q);
    if(seq !== P.seq || !$('pq-res')) return;
    if(caixa) caixa.classList.remove('carregando');
    P.banco = B; P.bancoQ = q; P.teclado = false; pinta();
  }
  /* ir pra um lugar da cidade: abre o Correverso (se não tiver aberto) e espera a cidade ficar pronta pra levar a pessoa.
     Se uma folha tá aberta lá (a primeira entrada pede o boneco), espera ela fechar */
  function vaiLugar(nome){
    C.closeSheet();
    if(C.casa && C.casa.aberta && C.casa.aberta() && C.casa.fechar) C.casa.fechar();
    if(location.hash !== '#/verso' || !(C.verso && C.verso.vivo && C.verso.vivo())) go('#/verso');
    const t0 = Date.now();
    const tenta = () => {
      if(location.hash !== '#/verso') return;
      const sh = $('sheet'), r = (!sh || sh.hidden) && C.verso && C.verso.irPara ? C.verso.irPara(nome) : false;
      if(r === true) return toast(`Chegou: ${nome}.`);
      if(r === null) return toast(nome === 'Tua casa' ? 'Você ainda não tem casa na cidade.' : `Não achei ${nome} nesta cidade.`);
      if(Date.now() - t0 < 60000) setTimeout(tenta, 350);
    };
    setTimeout(tenta, 350);
  }
  /* abriu um resultado */
  function vai(o, e){
    if((o.tipo === 'fz' || o.tipo === 'ia') && C.fala){ if(o.h){ if(o.h === location.hash){ if(e) e.preventDefault(); C.closeSheet(); } return; } C.fala.vai(o, $('pq-res')); return; }
    guardaRecente(o);
    if(o.lugar) return vaiLugar(o.lugar);
    if(o.h){
      /* link de verdade: o navegador navega e a rota fecha a folha. Já tava nessa página: só fecha */
      if(o.h === location.hash || (o.h === '#/' && !location.hash)){ if(e) e.preventDefault(); C.closeSheet(); }
      return;
    }
    C.closeSheet();
    const b = document.createElement('button');
    if(o.tag){ b.dataset.t = o.tag; return C.acts['fd-tag'](b); }
    if(o.mural) return C.mural.procura(o.mural);
    const f = o.a && C.acts[o.a];
    if(f) Promise.resolve(f(b)).catch(err => toast(C.errMsg(err)));
  }
  function abreProcura(q0, op){
    if(!st.user || !st.me) return;
    op = op || {}; q0 = typeof q0 === 'string' ? q0 : '';
    const ja = $('sheet'); if(ja && !ja.hidden && ja.classList.contains('procura')){ const i = $('pq-q'); if(i){ i.focus(); i.select(); } return; }
    P.q = q0; P.banco = null; P.bancoQ = ''; P.teclado = false;
    const mic = C.fala && C.fala.temVoz() ? `<button type="button" class="pq-mic" id="pq-mic" aria-label="Ditar o pedido" aria-pressed="false">${ico('mic')}</button>` : '';
    const panel = C.sheet(`<div class="pq">
      <div class="pq-barra">${ico('lupa', 'pq-lupa')}<input class="pq-in" id="pq-q" type="search" placeholder="${innerWidth < 420 ? 'Procurar ou pedir' : 'Procurar ou pedir pro Corre…'}" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" maxlength="400" autofocus
        role="combobox" aria-expanded="true" aria-controls="pq-res" aria-autocomplete="list" aria-label="Procurar ou pedir pro Corre">${mic}<button type="button" class="pq-fecha" data-close aria-label="Fechar a busca"><kbd>Esc</kbd><span>Fechar</span></button></div>
      <i class="pq-barrinha" aria-hidden="true"></i>
      <div class="pq-res" id="pq-res" role="listbox" aria-label="Resultados"></div>
      <p class="pq-dica" aria-hidden="true"><span><kbd>↑</kbd><kbd>↓</kbd> escolhe</span><span><kbd>Enter</kbd> abre</span><span><kbd>/</kbd> procura de qualquer página</span></p>
      <p class="sr-only" id="pq-status" role="status" aria-live="polite"></p></div>`, 'procura');
    const inp = $('pq-q');
    inp.addEventListener('input', () => { P.q = inp.value; P.teclado = false; if(C.fala) C.fala.cancela(); clearTimeout(P.t); pinta(); P.t = setTimeout(procura, 200); });
    /* v4.33: volta do resultado da IA pra busca (com um exemplo escrito, se veio de um) */
    const volta = txt => { if(typeof txt === 'string'){ inp.value = txt; P.q = txt; } if(C.fala) C.fala.cancela(); clearTimeout(P.t); pinta(); P.t = setTimeout(procura, 200); inp.focus(); try{ inp.setSelectionRange(inp.value.length, inp.value.length); }catch(_){} };
    const mb = $('pq-mic'); if(mb) mb.addEventListener('click', () => C.fala.ouve(inp, mb));
    inp.addEventListener('keydown', e => {
      if(e.key === 'ArrowDown' || e.key === 'ArrowUp'){ e.preventDefault(); P.teclado = true; const n = document.querySelectorAll('#pq-res [data-pq]').length; if(n) marcaAtivo(P.ativo < 0 ? (e.key === 'ArrowDown' ? 0 : n - 1) : (P.ativo + (e.key === 'ArrowDown' ? 1 : -1) + n) % n); }
      else if(e.key === 'Enter'){ e.preventDefault(); const el = document.querySelectorAll('#pq-res [data-pq]')[P.ativo]; if(el) el.click(); }
    });
    panel.addEventListener('pointermove', e => { const el = e.target.closest('#pq-res [data-pq]'); if(!el || el.classList.contains('on')) return; P.teclado = false; marcaAtivo([...document.querySelectorAll('#pq-res [data-pq]')].indexOf(el)); });
    panel.addEventListener('click', e => {
      if(C.fala && C.fala.clique(e, P.q, $('pq-res'), volta)) return;
      if(e.target.closest('[data-pq-limpa]')){ try{ localStorage.removeItem(REC_K); }catch(_){} pintaVazio(); inp.focus(); return; }
      const t = e.target.closest('[data-pq-tag]'); if(t){ vai({ tipo: 't', tag: String(t.dataset.pqTag || '').toLowerCase() }, e); return; }
      const el = e.target.closest('[data-pq]'); if(!el) return;
      const o = P.lista[Number(el.dataset.pq)]; if(o) vai(o, e);
    });
    if(q0){ inp.value = q0; pinta(); P.t = setTimeout(procura, 200); try{ inp.setSelectionRange(q0.length, q0.length); }catch(_){} }
    else pintaVazio();
    if(op.voz && mb) setTimeout(() => C.fala.ouve(inp, mb), 60);
  }
  C.procura = abreProcura;
  C.procuraFerr = () => FERR();
  C.acts.procura = () => abreProcura();
  /* / e Ctrl+K abrem a busca (o / não vale com o cursor num campo; nenhum dos dois dentro de um lugar 3D, que usa o teclado) */
  addEventListener('keydown', e => {
    if(C.EMBED || !st.user || !st.me || e.defaultPrevented) return;
    const ctrlK = (e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey, barra = e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey;
    if(!ctrlK && !barra) return;
    const t = e.target, digitando = !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || ''));
    if((barra && digitando) || (C.casa && C.casa.aberta && C.casa.aberta()) || document.querySelector('dialog[open]')) return;
    const sh = $('sheet'); if(barra && sh && !sh.hidden && !sh.classList.contains('procura')) return;
    if($('story') && !$('story').hidden) return;
    e.preventDefault(); abreProcura();
  });

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
  /* v4.0 · o Correverso (cidade, 3D, móveis, sons, veículos) era mais da metade do que o app baixava na entrada. Agora
     ele mora no verso.min.js e só desce quando alguém entra na cidade, abre a carteira ou o Ateliê. Quando chega, ele
     mesmo troca estas portas pelas de verdade. Com o build antigo (tudo num arquivo só) as portas nem entram. */
  let versoP = null;
  C.versoCarrega = () => versoP || (versoP = new Promise((ok, falha) => {
    const base = document.querySelector('script[src*="corre.min.js"]'), src = base ? base.getAttribute('src').replace('corre.min.js', 'verso.min.js') : 'js/verso.min.js';
    const s = document.createElement('script'); s.src = src; s.onload = () => ok(); s.onerror = () => { versoP = null; s.remove(); falha({ message: 'A cidade não carregou. Confere a internet e tenta de novo.' }); };
    document.head.appendChild(s);
  }));
  if(!C.views.verso){
    C.views.verso = async (app, resto) => {
      const porta = C.views.verso;
      document.title = 'Correverso · Corre';
      app.innerHTML = C.header('verso') + `<main class="wrap cvr" id="cvr"><div class="cvr-stage" id="cvr-stage"><div class="cvr-load"><b>Correverso</b><span>Abrindo a cidade…</span></div></div></main>`;
      /* a tela cheia só sai no toque que trouxe pra cá: pede já, antes de esperar a cidade descer (v3.90) */
      if(C.tela && st.me){ C.tela.fica = 'cidade'; C.tela.poe('cidade'); }
      const rota = C.rota;
      try{ await C.versoCarrega(); }
      catch(e){
        if(C.tela){ C.tela.fica = null; C.tela.tira('cidade'); }
        if(rota !== C.rota) return;
        const sg = $('cvr-stage');
        if(sg) sg.innerHTML = `<div class="cvr-load cvr-erro"><b>Correverso</b><span>${esc(e.message)}</span><button type="button" class="btn sm pri" data-act="tenta-de-novo">Tentar de novo</button></div>`;
        return;
      }
      if(rota !== C.rota || C.views.verso === porta) return;
      return C.views.verso(app, resto);
    };
    /* o que abre a cidade por cima de outra página: a carteira (menu e Perfil) e o Ateliê (a busca) */
    ['carteira', 'cvr-loja'].forEach(k => {
      if(C.acts[k]) return;
      const porta = C.acts[k] = async (el, ev) => {
        try{ await C.versoCarrega(); }catch(e){ toast(e.message); return; }
        if(C.acts[k] !== porta) return C.acts[k](el, ev);
      };
    });
    /* com a página parada e a internet folgada, a cidade já vem descendo em segundo plano (não roda; só fica guardada) */
    const adianta = () => {
      const c = navigator.connection;
      if(versoP || C.EMBED || (c && (c.saveData || /2g/.test(c.effectiveType || '')))) return;
      const base = document.querySelector('script[src*="corre.min.js"]');
      if(!base) return;
      const l = document.createElement('link'); l.rel = 'prefetch'; l.as = 'script'; l.href = base.getAttribute('src').replace('corre.min.js', 'verso.min.js');
      document.head.appendChild(l);
    };
    setTimeout(() => { if(window.requestIdleCallback) window.requestIdleCallback(adianta, { timeout: 4000 }); else adianta(); }, 9000);
  }
  C.views.vendas = app => C.views.corre(app, 'vendas');
  C.views.grana = app => C.views.corre(app, 'grana');

  /* ---------------- entrar ---------------- */
  /* navegador de dentro de app (Instagram, Facebook, WhatsApp, TikTok...): o Google costuma bloquear o login nele */
  const dentroDeApp = () => /Instagram|FBAN|FBAV|FB_IAB|FBIOS|Line\/|WhatsApp|musical_ly|TikTok|BytedanceWebview|; wv\)/i.test(navigator.userAgent || '');
  /* chegou pelo link de alguém (story do Instagram, link copiado): mostra quem chamou */
  const conviteLogin = () => { const c = C.insta && C.insta.convite(); return c ? `<p class="cv-login">${ico('raio')}<span><b>@${esc(c.h)}</b> te chamou pro Corre. Entra e já sai seguindo.</span></p>` : ''; };
  /* v5.09 · a frase do que o Corre faz por você, a primeira coisa do cartão (o Thales). "Posta tua semana sozinho" só é
     verdade pra todo mundo quando a Meta aprovar o app (IG_ABERTO: true no config.js); até lá, a frase diz o que já vale */
  const fraseLogin = () => C.CFG.IG_ABERTO !== false ? 'Conecta teu Instagram e o Corre posta tua semana sozinho.'
    : 'Programa a semana do teu Instagram, acha cliente e recebe: o teu corre num lugar só.';
  function viewLogin(){
    document.body.classList.remove('com-lado');
    setStickers('login');
    app.innerHTML = `<div class="login-top"><nav class="topnav" aria-label="Navegação"><a class="hl" href="#entrar">Entrar</a><a class="hl" href="#/clientes">Clientes</a><a class="hl" href="/londrina/">Londrina</a><a class="hl" href="#/mural">Mural</a><a class="hl" href="privacidade.html">Privacidade</a></nav></div>
    <main class="login">
      <h1 class="mega">Corre</h1>
      <p class="tagline"><span class="hl">Mostra teu corre.</span></p>
      <section class="login-card" id="entrar" aria-label="Entrar no Corre">
        <p class="login-frase">${esc(fraseLogin())}</p>
        <p class="lead">Pra quem vende serviço ou produto, de qualquer segmento: acha cliente, manda orçamento, recebe e vê quanto o corre tá rendendo. Você mostra o que quiser; o resto fica só contigo.</p>
        <div class="chips" aria-label="O que tem no Corre">${[['Studio Cria', 'posta no Instagram'], ['Hórus', 'acha clientes'], ['Link na bio', 'tua página'], ['Mural', 'pedidos de serviço'], ['Vendas e Grana', 'teu dinheiro'], ['Correverso', 'a cidade-jogo']].map(([n, d]) => `<span class="chip">${n}<small>${d}</small></span>`).join('')}</div>
        ${conviteLogin()}<div class="g-oficial" id="g-oficial" hidden></div><button type="button" class="btn-google" id="btn-google" data-act="google">${G_LOGO}<span>Entrar com Google</span></button><button type="button" class="lnk g-outro" id="g-outro" data-act="google" hidden><span>Não abriu? Entra pelo outro jeito</span></button><button type="button" class="btn-face" id="btn-face" data-act="facebook"${C.DEMO ? '' : ' hidden'}>${FACE_LOGO}<span>Entrar com o Facebook</span></button><button type="button" class="btn-apple" id="btn-apple" data-act="apple"${C.CFG.APPLE_LOGIN || C.DEMO ? '' : ' hidden'}>${APPLE_LOGO}<span>Continuar com a Apple</span></button>
        ${dentroDeApp() ? `<div class="iab-aviso"><b>Abriu pelo Instagram ou WhatsApp?</b><p>O Google às vezes não deixa entrar por aqui. Se travar, abre o Corre no navegador${/Android/i.test(navigator.userAgent) ? '' : ' (no menu ••• , "Abrir no navegador")'}.</p><div class="acts">${/Android/i.test(navigator.userAgent) ? `<a class="btn sm pri" href="${esc(C.insta ? C.insta.intentUrl() : `intent://${location.host + location.pathname}#Intent;scheme=https;package=com.android.chrome;end`)}">Abrir no Chrome</a>` : ''}<button type="button" class="btn sm" data-act="iab-copia">Copiar o link</button></div></div>` : ''}
        <a class="cl-porta" href="#/clientes">${ico('eye')}<span><b>Quantos clientes tem pra você na tua cidade?</b><small>Descobre agora, sem cadastro</small></span>${ico('next')}</a>
        <div class="login-mais"><button type="button" class="lnk man-login" data-act="es-desce">${ico('desce')} O que tem no Corre</button><button type="button" class="lnk man-login" data-act="manual">${ico('manual')} Como funciona</button></div>
        <div class="em-breve" role="note" aria-label="App do Corre no celular: em breve no iOS e no Android">
          <span class="eb-tag" aria-hidden="true">Em breve</span>
          <span class="eb-loja">${ico('cel')}<span><small>App pra iPhone</small><b>iOS</b></span></span>
          <span class="eb-loja">${ico('cel')}<span><small>App pra celular</small><b>Android</b></span></span>
        </div>
        <p class="fine">Ao entrar, você concorda com os <a href="termos.html">Termos de uso</a> e a <a href="privacidade.html">Política de privacidade</a>.</p>
      </section>
    </main>${C.estreia ? C.estreia.vitrineLogin() : ''}
    <p class="login-assina">Um produto <b>Houzi Records</b> <span class="la-x"><i aria-hidden="true">×</i><span class="sr-only">e</span> <b>Simonini Software</b></span></p>`;
    botaoGoogle();
    outrosLogins();
  }
  /* v4.35: o Facebook (e a Apple) aparecem sozinhos quando o provedor tá ligado no Supabase (Authentication >
     Providers): o app pergunta pro próprio Supabase quais logins tão valendo, então ligar lá não pede site novo.
     Desligado, o botão nem aparece (tocar daria erro do Supabase). */
  async function outrosLogins(){
    if(C.DEMO || !api.provedores) return;
    let v = null; try{ v = await api.provedores(); }catch(e){ return; }
    [['facebook', 'btn-face'], ['apple', 'btn-apple']].forEach(([k, id]) => { const b = $(id); if(b && v && v[k] === true) b.hidden = false; });
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
    const gpic = md.avatar_url || md.picture || '';
    /* v4.35: a foto do Facebook vem num endereço que vence em poucos dias: não entra direto no perfil (o bindForm
       guarda uma cópia no Corre) */
    const face = ehFotoFace(gpic);
    const v = p || { nome: md.full_name || md.name || '', handle: suggestHandle(u), bio: '', cidade: '', instagram: '', visibilidade: 'publico', avatar_url: face ? '' : gpic };
    return `<form class="form" id="pf" novalidate>
      <div class="prof"><span id="pf-av">${avatar(v, 'm')}</span><div class="who"><b style="font-size:15px">Foto</b><div class="acts"><label class="btn sm up-lbl" id="pf-up">${ico('camera')} <span>Trocar foto</span><input type="file" accept="image/*" id="pf-file" aria-label="Escolher foto de perfil"></label>${gpic ? `<button type="button" class="btn sm ghost" id="pf-g">Usar a do ${face ? 'Facebook' : 'Google'}</button>` : ''}</div></div></div>
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
      <div class="row2">
        <div class="fld"><label for="f-link">Link</label><input class="inp" id="f-link" name="link" type="url" inputmode="url" maxlength="300" value="${esc(v.link || '')}" autocapitalize="none" autocomplete="url" spellcheck="false" placeholder="teusite.com.br" aria-describedby="h-link"><span class="hint" id="h-link">Teu site, portfólio ou loja. Aparece no teu perfil.</span></div>
        <div class="fld"><label for="f-nasc">Data de nascimento</label><input class="inp" id="f-nasc" name="nasc" type="date" min="1900-01-01" max="${C.hojeBR()}" autocomplete="bday" aria-describedby="h-nasc"><span class="hint" id="h-nasc">Só você vê a data inteira.</span></div>
      </div>
      <label class="switch pf-aniv-sw"><input type="checkbox" name="aniv" id="f-aniv" checked><span class="sw" aria-hidden="true"></span><span><b>Mostrar meu aniversário no perfil</b><small>Só o dia e o mês. O ano nunca aparece.</small></span></label>
      ${C.meuCorre ? C.meuCorre.campos(v) : ''}
      <fieldset class="fld"><legend>Teu corre fica</legend>
        <div class="vis">
          <label class="opt"><input type="radio" name="desbaratinado" value="" ${desb(v) ? '' : 'checked'}><span class="dot"></span><span><b>Na vitrine</b><small>Qualquer pessoa vê teu perfil, teus posts, stories e portfólio, e te acha em "Gente no Corre".</small></span></label>
          <label class="opt"><input type="radio" name="desbaratinado" value="1" ${desb(v) ? 'checked' : ''}><span class="dot"></span><span><b>${ico('lock')} Desbaratinado</b><small>Teu perfil aparece pra todo mundo, mas posts, stories, destaques, portfólio e a grana só quem te segue vê.</small></span></label>
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
      <section class="card danger"><h2 class="ch">Apagar minha conta</h2><p class="note">Apaga a conta inteira: o perfil, o login, catálogo, vendas e orçamentos, clientes do Hórus, pedidos e propostas do Mural, referências, portfólio, posts, stories, destaques, mensagens, Caderninho, as fotos e os vídeos que você subiu, contas e lançamentos, e cancela os planos pagos. Não dá pra desfazer.</p>
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
  /* v4.35: a foto que o Facebook manda no login vence em dias (o endereço leva a validade): o Corre copia ela pro
     Storage dele, como a foto que a pessoa escolhe. O servidor de foto do Facebook deixa o navegador ler (CORS aberto). */
  const ehFotoFace = url => /^https:\/\/([a-z0-9-]+\.)*(fbcdn\.net|fbsbx\.com|facebook\.com)\//i.test(url || '');
  async function copiaFoto(url){
    const r = await fetch(url, { mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer' });
    if(!r.ok) throw new Error('foto');
    return api.upload(await imagemBlob('foto', await r.blob()));
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
    const md = st.user.user_metadata || {}, gpic = md.avatar_url || md.picture || '';
    const g = $('pf-g'); if(g) g.addEventListener('click', async () => {
      if(g.disabled) return; g.disabled = true;
      try{ await aplicaFoto(ehFotoFace(gpic) ? await copiaFoto(gpic) : gpic); }
      catch(e){ toast(ehFotoFace(gpic) ? 'Não deu pra trazer a foto do Facebook. Escolhe uma em Trocar foto.' : C.errMsg(e, 'Não deu pra trocar a foto.'), 4800); }
      finally{ g.disabled = false; }
    });
    /* v4.35: perfil novo que veio do Facebook: a foto entra copiada sozinha (se a pessoa ainda não escolheu outra) */
    if(isNew && ehFotoFace(gpic)) copiaFoto(gpic).then(url => { const fa = $('f-av'); if(fa && fa.isConnected && !fa.value){ fa.value = url; paintAv(); } }).catch(() => {});
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
        /* v3.55: resposta atrasada de um @ que a pessoa já apagou não pinta a dica */
        if(lastChecked !== h || hIn.value !== h) return null;
        hHint.className = 'hint ' + (free ? 'ok' : 'bad');
        hHint.textContent = free ? `@${h} tá livre.` : `@${h} já tem dono. Tenta outro.`;
        return free;
      }catch(e){ hHint.className = 'hint'; hHint.textContent = 'Não deu pra conferir agora; a gente confere ao salvar.'; return null; }
    }
    if(isNew) checkHandle();
    if(C.meuCorre) C.meuCorre.bind();
    /* v5.09 · a data de nascimento mora à parte (corre_nascimento: só a dona lê); o perfil guarda só o dia e o mês */
    const NASC = { tinha: false, dia: '', mostra: true };
    if(!isNew) api.one('corre_nascimento', { eq: { dono: st.user.id } }).then(r => {
      if(!r) return; const fi = $('f-nasc'), ch = $('f-aniv'); if(!fi || !fi.isConnected) return;
      Object.assign(NASC, { tinha: !!r.nasceu, dia: r.nasceu || '', mostra: r.mostra !== false });
      if(!fi.value) fi.value = NASC.dia; if(ch) ch.checked = NASC.mostra;
    }).catch(() => {});
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(f);
      const p = {
        nome: String(fd.get('nome') || '').trim(),
        handle: String(fd.get('handle') || '').trim(),
        bio: String(fd.get('bio') || '').trim(),
        cidade: String(fd.get('cidade') || '').trim(),
        instagram: String(fd.get('instagram') || '').trim().replace(/^@/, ''),
        /* v3.56: o perfil é sempre público; quem quer fechar os dados pra quem não segue fica Desbaratinado */
        visibilidade: 'publico',
        aberto: fd.get('aberto') === 'on',
        avatar_url: $('f-av').value
      };
      if(!p.nome){ toast('Coloca teu nome.'); $('f-nome').focus(); return; }
      if(!HANDLE_RE.test(p.handle)){ toast('Ajusta o teu @.'); hIn.focus(); return; }
      if(!IG_RE.test(p.instagram)){ toast('O @ do Instagram só aceita letras, números, ponto e _.'); $('f-ig').focus(); return; }
      /* v5.09 · o link do perfil: "teusite.com.br" ganha https; o que não abre não salva */
      const lk = C.arrumaLink(String(fd.get('link') || ''));
      if(lk === null){ toast('Esse link não abre. Confere o endereço (ex.: teusite.com.br).', 4200); $('f-link').focus(); return; }
      if(lk || (st.me && 'link' in st.me)) p.link = lk;
      const nasc = String(fd.get('nasc') || ''), aniv = fd.get('aniv') === 'on';
      if(nasc && (nasc < '1900-01-01' || nasc > C.hojeBR())){ toast('Confere a data de nascimento.'); $('f-nasc').focus(); return; }
      const mc = C.meuCorre ? C.meuCorre.ler() : null;
      if(mc){
        if(!C.meuCorre.whatsOk(mc.whats_publico)){ toast('Confere o WhatsApp com DDD, ou deixa em branco.'); $('f-wa').focus(); return; }
        Object.assign(p, { categoria: mc.categoria, faz: mc.faz, vende_pra: mc.vende_pra, whats_publico: mc.whats_publico, no_mural: mc.no_mural });
      }
      /* v5.0 · Aparecer no Google: vai quando o banco já tem a coluna (delta-v500) ou quando a pessoa ligou; sem o delta, salva o resto */
      if(mc && (mc.no_google || (st.me && 'no_google' in st.me))) p.no_google = mc.no_google;
      const antes = isNew || !st.me ? null : { categoria: st.me.categoria || '', faz: st.me.faz || '' };
      const antesGoogle = !!(st.me && st.me.no_google);
      /* o Desbaratinado só vai quando o banco já tem a coluna (delta-v356) ou quando a pessoa escolheu; sem o delta, salva o resto */
      const querDesb = fd.get('desbaratinado') === '1';
      if(querDesb || (st.me && 'desbaratinado' in st.me)) p.desbaratinado = querDesb;
      const semColuna = e => /desbaratinado|no_google|'link'/i.test(String((e && e.message) || '') + String((e && e.hint) || '') + String((e && e.details) || ''));
      /* tira do pedido a coluna que o banco ainda não tem e diz qual ficou de fora */
      const semEssa = e => { const m = String((e && e.message) || '') + String((e && e.hint) || '') + String((e && e.details) || ''), fora = [];
        if('desbaratinado' in p && /desbaratinado/i.test(m)){ delete p.desbaratinado; fora.push('O Desbaratinado'); }
        if('no_google' in p && /no_google/i.test(m)){ delete p.no_google; fora.push('O Aparecer no Google'); }
        if('link' in p && /'link'/i.test(m)){ delete p.link; fora.push('O link do perfil'); }
        return fora.length ? fora.join(' e ') + ' ainda não tá ligado no Corre.' : ''; };
      const b = $('pf-ok'); b.disabled = true;
      try{
        if(isNew){
          try{
            let r; try{ r = await api.ins('corre_perfis', Object.assign({ id: st.user.id }, p)); }
            catch(e0){ if(!semColuna(e0)) throw e0; const fora = semEssa(e0); if(!fora) throw e0; r = await api.ins('corre_perfis', Object.assign({ id: st.user.id }, p)); toast(fora + ' Teu perfil foi salvo.', 4200); }
            st.me = r[0];
          }
          catch(e1){
            /* o perfil já existia (a tela de cadastro abriu por um tropeço de rede): entra com ele em vez de dizer que o @ tem dono */
            const ja = e1 && e1.code === '23505' ? await api.one('corre_perfis', { eq: { id: st.user.id } }).catch(() => null) : null;
            if(!ja) throw e1;
            st.me = ja; st.loadedFor = st.user.id; toast('Teu perfil já existia. Entrando nele.'); go('#/'); return;
          }
        }
        else {
          try{ await C.saveMe(p); }
          catch(e2){ if(!semColuna(e2)) throw e2; const fora = semEssa(e2); if(!fora) throw e2; await C.saveMe(p); toast(fora + ' O resto foi salvo.', 4200); }
        }
        if(mc && C.meuCorre) await C.meuCorre.aplicar(antes, mc.orc);
        /* v5.09 · a data de nascimento: só quando mudou (ou a pessoa apagou a que tinha) */
        if((nasc || NASC.tinha) && (nasc !== NASC.dia || aniv !== NASC.mostra)){
          try{
            const r = await api.rpc('corre_nascimento_salva', { p_dia: nasc || null, p_mostra: aniv });
            if(r && r.ok){ st.me.aniver = r.aniver || ''; Object.assign(NASC, { tinha: !!nasc, dia: nasc, mostra: aniv }); }
            else if(r && r.motivo === 'data') toast('A data de nascimento não entrou: confere o dia.', 4200);
          }catch(e){ toast('A data de nascimento ainda não tá ligada no Corre. O resto foi salvo.', 4200); }
        }
        st.loadedFor = st.user.id;
        /* entrou pelo link de alguém: já segue quem chamou */
        const chamou = isNew && C.insta ? await C.insta.segueQuemChamou(st.me) : null;
        /* v4.0 · a Estreia: o convite rende correal pros dois, e o app se monta pela categoria */
        let ganhou = null;
        if(isNew && C.estreia){ if(chamou) ganhou = await C.estreia.aceita(chamou.handle); await C.estreia.monta(st.me); }
        toast(isNew ? (chamou ? `Perfil criado. Você já segue @${chamou.handle}, que te chamou${ganhou && ganhou.ok ? ', e ganhou 0,50 de correal de boas-vindas' : ''}.` : 'Perfil criado. Bem-vindo ao Corre.') : googleDiz(antesGoogle) || 'Perfil salvo.', chamou ? 5200 : googleDiz(antesGoogle) ? 6000 : undefined);
        /* v4.29: quem acabou de chegar vai pro Monta meu Corre (a IA monta o link na bio, o mês no Studio, os clientes e a semana) */
        go(isNew && C.views.monta ? '#/monta' : '#/');
      }catch(err){
        if(err && err.code === '23505'){ hHint.className = 'hint bad'; hHint.textContent = `@${p.handle} já tem dono. Tenta outro.`; hIn.focus(); toast('Esse @ já tem dono.'); }
        else toast(C.errMsg(err, 'Não deu pra salvar agora. Tente de novo.'), 4000);
      }finally{ b.disabled = false; }
    });
  }

  /* ---------------- início ---------------- */
  /* os cartões do canto (cada módulo põe o dele no C.home). v4.41: os do trabalho (Hórus, Vendas, Grana e Portfólio) moram
     na casa do Corre Studio; os da Rede (visitas, Banca e Do teu nicho) ficam no Início. v5.01: o do Mural foi pro Studio */
  /* v5.09: a Banca e as datas saíram de baixo (os links ficam no alto, junto do "ver meu perfil" do bom dia) */
  const CARTOES_STUDIO = ['horus', 'mural', 'vendas', 'grana', 'marcas'];
  const CARTOES_FORA = ['banca', 'datas'];
  const NOME_CARTAO = { visitas: 'Visitas', horus: 'Hórus', mural: 'Mural', vendas: 'Vendas', banca: 'Banca do dia', grana: 'Grana', marcas: 'Portfólio', datas: 'Do teu nicho' };
  const cartoesDe = studio => C.home.slice().filter(c => !CARTOES_FORA.includes(c.k) && CARTOES_STUDIO.includes(c.k) === studio).sort((a, b) => a.o - b.o);
  const cartoesHTML = cards => cards.map(c => `<div class="hslot" id="hc-${c.k}"><div class="hcard ghost"><span class="hc-name">${NOME_CARTAO[c.k] || ''}</span></div></div>`).join('');
  function pintaCartoes(cards){
    const STK = { horus: 'olho', rolo: 'camera', banca: 'hype', grana: 'grana', marcas: 'trampo' };
    cards.forEach(c => Promise.resolve().then(() => c.html()).then(h => { const el = $('hc-' + c.k); if(!el) return; if(!h){ el.remove(); return; } el.innerHTML = h; const card = el.querySelector('.hcard'); if(card && ST && STK[c.k]) card.insertAdjacentHTML('beforeend', `<span class="hc-stk" aria-hidden="true">${ST.svg(STK[c.k])}</span>`); }).catch(() => { const el = $('hc-' + c.k); if(el) el.remove(); }));
  }
  /* v4.41: o Início é da Rede, limpo: os primeiros passos (só pra quem tá chegando), os stories, os grupos e o feed, com
     quem seguir do lado. O teu dia, os atalhos das ferramentas e o corre do mês foram pra casa do Corre Studio (#/dia) */
  async function viewHome(){
    const me = st.me;
    const cards = cartoesDe(false);
    app.innerHTML = C.header('inicio') + `<main class="wrap home">
      <div id="h-passos"></div>
      <section class="card sbar-card" aria-label="Stories" id="h-stories">${(() => { const g = C.guardado.le('stories', 864e5); return g ? `<div class="vel" aria-hidden="true">${g}</div>` : `<div class="sbar">${C.esqueleto('roda', 6)}</div>`; })()}</section>
      <div id="h-grupos" class="h-grupos"></div>
      <div class="feed-grid">
        <div class="feed-main" id="h-feed"></div>
        <aside class="feed-aside" aria-label="Na rede">
          <div class="hgrid side">${cartoesHTML(cards)}</div>
          <h2 class="sec-t"><span class="hl" id="people-t">Gente no Corre</span></h2>
          <div id="people">${C.esqueleto('linha', 4)}</div>
        </aside>
      </div>
      <p class="foot"><a href="privacidade.html">Privacidade</a> <a href="termos.html">Termos</a> <span class="credit">Londrina desenhada no traço da Monstra</span></p>
    </main>`;
    if(C.estreia) C.estreia.passos($('h-passos'));
    C.storiesBar().then(h => { const el = $('h-stories'); if(el) el.innerHTML = h; C.guardado.poe('stories', h); });
    if(C.feed) C.feed.mount($('h-feed'));
    if(C.grupos) C.grupos.faixaHome($('h-grupos'));
    pintaCartoes(cards);
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

  /* ---------------- v4.41 · a casa do Corre Studio ----------------
     O trabalho saiu do Início e do perfil e mora aqui (#/dia, ou app.corresocial.com/studio): o teu dia (a saudação, o
     Fala com o Corre e os cartões do que tá esperando), as ferramentas em blocos com o número do sinal, o corre do mês
     e os cartões do trabalho, e o "do teu jeito" (abrir o Corre direto aqui, o Hórus ligado, ajeitar o menu) */
  const FERR_ST = [
    ['caderno', 'As tarefas do dia, com aviso na hora'], ['studio', 'Posta no Instagram: o calendário de cada marca'],
    ['rolo', 'Filmes que ninguém filmou: 5 frames por dia'],
    ['horus', 'Acha cliente no mapa e chama no WhatsApp'], ['mural', 'Pedidos de quem precisa: manda proposta'],
    ['corre', 'Do orçamento ao dinheiro na conta'],
    ['atende', 'A IA responde teu cliente 24h'], ['piloto', 'O que esfria vira tarefa sozinho'],
    ['houzi', 'Cria tua marca: logo e brandbook'], ['marcas', 'Teus trabalhos e o que você vende'],
    ['linkbio', 'Tua página pra bio do Instagram'], ['planos', 'Assinaturas e faturas'], ['lojinha', 'Os números do Corre']
  ];
  /* abrir o Corre direto no Studio: guardado no aparelho, por login (quem divide o aparelho não herda) */
  const FIXA_K = 'corre-abre-studio';
  const abreNoStudio = () => { try{ return !!st.me && localStorage.getItem(FIXA_K) === st.me.id; }catch(e){ return false; } };
  C.abreNoStudio = abreNoStudio;
  function ferrStudioHTML(){
    const D = DEST(st.me);
    return FERR_ST.filter(([k]) => D[k] && (k === 'horus' || tem(k))).map(([k, d]) => {
      const off = k === 'horus' && !C.ferr('horus');
      return `<a class="csd-t${off ? ' off' : ''}" href="${D[k][0]}"><span class="csd-ic">${ico(D[k][2])}</span><span class="csd-tx"><b>${D[k][1]}</b><small>${off ? 'Desligado: toca pra ligar' : d}</small></span>${off ? '' : sinalHTML(k, true)}</a>`;
    }).join('');
  }
  async function viewDia(){
    const me = st.me, cards = cartoesDe(true), hz = C.ferr('horus'), fixa = abreNoStudio();
    app.innerHTML = C.header('dia') + `<main class="wrap csd">
      <p class="csd-k"><span>${ico('luminaria')}Corre Studio</span><a href="#/">${ico('prev')} Voltar pra rede</a></p>
      <section class="dia csd-dia" id="cs-dia" aria-label="O teu dia"></section>
      <div class="csd-cols">
        <section class="csd-ferr" aria-labelledby="csd-ferr-t">
          <h2 class="sec-t" id="csd-ferr-t"><span class="hl">Tuas ferramentas</span></h2>
          <nav class="csd-g" aria-label="Ferramentas do Corre Studio">${ferrStudioHTML()}</nav>
        </section>
        <aside class="csd-lado" aria-label="O teu mês">
          <div id="cs-corre"></div>
          <div class="hgrid side">${cartoesHTML(cards)}</div>
        </aside>
      </div>
      <section class="card csd-jeito" aria-labelledby="csd-jeito-t">
        <h2 class="ch" id="csd-jeito-t">Do teu jeito</h2>
        <label class="csd-sw"><span><b>Abrir o Corre direto aqui</b><small>Quando você abrir o app, cai no Corre Studio em vez do feed. A Rede fica a um toque.</small></span><span class="switch sw-so"><input type="checkbox" data-chg="cs-fixa"${fixa ? ' checked' : ''} aria-label="Abrir o Corre direto no Studio"><span class="sw"></span></span></label>
        <label class="csd-sw"><span><b>Hórus ligado</b><small>${hz ? 'O radar de clientes tá no teu Studio.' : 'Radar de clientes: caça empresa no mapa e monta a abordagem.'}</small></span><span class="switch sw-so"><input type="checkbox" data-chg="ferr-horus"${hz ? ' checked' : ''} aria-label="Hórus ligado"><span class="sw"></span></span></label>
        <div class="acts"><button type="button" class="btn" data-act="menu-ajeita">${ico('edit')} Ajeitar o menu do Studio</button><button type="button" class="btn ghost" data-act="cs-link">${ico('link')} Copiar o endereço do Studio</button></div>
      </section>
    </main>`;
    if(C.fala) C.fala.dia($('cs-dia'));
    if(C.correMes) C.correMes($('cs-corre'));
    pintaCartoes(cards);
  }
  C.views.dia = viewDia;
  Object.assign(C.acts, {
    'cs-fixa': el => {
      try{ if(el.checked) localStorage.setItem(FIXA_K, st.me.id); else localStorage.removeItem(FIXA_K); }catch(e){}
      toast(el.checked ? 'Pronto: o Corre abre direto no Studio neste aparelho.' : 'O Corre volta a abrir na Rede.', 3200);
    },
    /* o endereço curto (app.corresocial.com/studio): pra pôr nos favoritos ou num atalho */
    'cs-link': () => C.copy(location.origin + '/studio', 'Endereço do Corre Studio copiado.')
  });
  /* no teu perfil, como no TikTok: o botão do Corre Studio fica do lado do Editar perfil; embaixo, só o correal (o que
     era o cartão "Teu corre", com as ferramentas, virou a casa do Studio) */
  function portaPerfilHTML(){
    return `<p class="pf-correal">${ico('correal')}<span>Correal: <b class="num" data-correal-saldo>${C.correal.saldo == null ? '…' : C.correalFmt(C.correal.saldo)}</b> · a moeda do Correverso, não é dinheiro</span><button type="button" class="btn sm ghost" data-act="carteira">Carteira</button></p>`;
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
    const [stories, ds, mks, igs, grana, vit, sigoEle] = await Promise.all([
      api.q('corre_stories', { eq: { dono: p.id }, gt: { expira_em: new Date().toISOString() }, order: ['created_at', true] }).catch(() => []),
      C.destaquesDe(p.id).catch(() => []),
      api.q('corre_portfolio', { eq: { dono: p.id }, order: ['ordem', true] }).catch(() => []),
      api.q('corre_insta', { eq: { dono: p.id }, order: ['ordem', true] }).catch(() => []),
      api.rpc('corre_grana_publica', { p: p.id }).catch(() => null),
      api.rpc('corre_vitrine', { p: p.id }).catch(() => null),
      st.user && !mine && desb(p) ? api.q('corre_seguindo', { eq: { quem: st.user.id, segue: p.id } }).catch(() => []) : []
    ]);
    if(rota !== C.rota) return;
    /* v3.56: desbaratinado e você não segue: o perfil aparece, os dados não (o banco já não manda; aqui é o aviso) */
    const fechado = !mine && desb(p) && !(sigoEle && sigoEle.length);
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
          ${p.bio ? `<p class="pf-bio">${esc(p.bio)}</p>` : ''}
          <div class="meta">${p.aberto ? '<span class="tag trampo">Aberto pra trampo</span>' : ''}${catN && p.categoria !== 'outros' ? `<span class="tag cat">${esc(catN)}</span>` : ''}${p.cidade ? `<span class="tag">${esc(p.cidade)}</span>` : ''}${vit && vit.escolhido ? `<span class="tag">escolhido ${vit.escolhido}x no Mural</span>` : ''}${p.instagram ? `<a class="tag" href="https://www.instagram.com/${encodeURIComponent(p.instagram)}/" target="_blank" rel="noopener">${ico('ig')} @${esc(p.instagram)}</a>` : ''}${C.linkOk(p.link) ? `<a class="tag pf-link" href="${esc(p.link)}" target="_blank" rel="noopener nofollow ugc">${ico('link')} ${esc(C.linkCurto(p.link))}</a>` : ''}${anivTag(p)}${gtxt ? `<span class="tag grana">${esc(gtxt)}</span>` : ''}${p.ex ? '<span class="tag">Perfil de exemplo</span>' : ''}${mine && p.visibilidade === 'mocado' ? '<span class="tag moc">Mocado: só você vê</span>' : ''}</div>
          ${cta}
          ${metaHTML}
          ${gdica ? `<p class="fine pf-gdica">${gdica}</p>` : ''}
          <div id="pf-nums"></div>
          <div class="acts"><span id="pf-seguir"></span>${mine ? `<a class="btn pri" href="#/editar">Editar perfil</a><a class="btn pf-cs" href="#/dia">${ico('luminaria')} Corre Studio${filaNum('cs-n')}</a><button type="button" class="btn" data-act="st-novo">${ico('plus')} Story</button>` : ''}${p.visibilidade === 'mocado' ? '' : `<button type="button" class="btn" data-act="copiar" data-h="${esc(p.handle)}">Copiar link</button>`}${mine && p.visibilidade !== 'mocado' && C.insta ? `<button type="button" class="btn" data-act="ig-story" data-k="perfil">${ico('ig')} No story do Insta</button>` : ''}${!mine && C.msg ? (p.handle === 'corre' ? `<a class="btn" href="#/msg/@consanans" title="O @corre é o perfil da casa: quem responde é o @consanans">${ico('send')} Falar com o Corre</a>` : `<a class="btn" href="#/msg/@${esc(p.handle)}">${ico('send')} Mensagem</a>`) : ''}${!mine && C.msg && st.user && st.me ? `<button type="button" class="btn ghost" data-act="msg-mandar" data-k="perfil" data-h="${esc(p.handle)}" title="Mandar esse perfil pra alguém">Indicar</button>` : ''}${!mine && st.user && st.me && C.denuncia ? `<button type="button" class="btn ghost pf-den" data-act="den-perfil" data-id="${p.id}" data-h="${esc(p.handle)}" aria-label="Denunciar ou bloquear @${esc(p.handle)}" title="Denunciar ou bloquear">${ico('dots')}</button>` : ''}</div>
          ${mine ? portaPerfilHTML() : ''}
        </div>
      </section>
      ${vitHTML}
      ${fechado ? `<section class="card pf-desb">${ico('lock')}<div><b>@${esc(p.handle)} tá desbaratinado.</b><p>${st.user ? 'Segue' : 'Entra no Corre e segue'} pra ver os posts, stories, destaques e o portfólio.</p></div></section>` : `
      ${ds.length || mine ? `<h2 class="sec-t"><span class="hl">Destaques</span></h2><section class="card">${C.destaquesHTML(ds, mine)}</section>` : ''}
      <div id="pf-grupos" class="pf-grupos"></div>
      <h2 class="sec-t"><span class="hl">Posts</span></h2>
      <div class="feed-main solo" id="pf-feed"></div>
      ${mks.length || mine ? `<div class="sec-row"><h2 class="sec-t"><span class="hl">Portfólio</span></h2>${mine ? '<a class="btn sm" href="#/marcas">Gerenciar</a>' : ''}</div>${mks.length ? `<div class="mks">${mks.map(m => C.marcaCard(m, false)).join('')}</div>` : '<div class="empty">Coloca as marcas que você tá tocando em Portfólio.</div>'}` : ''}
      <div id="pf-recs" class="pf-recs"></div>
      ${igs.length || mine ? `<div class="sec-row"><h2 class="sec-t"><span class="hl">No Instagram</span></h2>${mine && igs.length < 12 ? `<button type="button" class="btn sm" data-act="ig-add">${ico('plus')} Post</button>` : ''}</div>${igs.length ? `<div class="igs">${igs.map(g => `<figure class="ig">${mine ? `<button type="button" class="ig-del" data-act="ig-del" data-id="${g.id}" aria-label="Tirar post da vitrine">${ico('x')}</button>` : ''}<iframe src="${esc(igEmbed(g.url))}" title="Post do Instagram" loading="lazy" scrolling="no" allowtransparency="true"></iframe></figure>`).join('')}</div>` : '<div class="empty">Escolhe até 12 posts teus pra vitrine. Cola o link do post ou do reel.</div>'}` : ''}`}
    </main>`;
    st.pfStories = ring ? [{ perfil: p, stories }] : null;
    /* sem login: depois de entrar, volta pra esse perfil */
    if(!st.user){ try{ localStorage.setItem('corre-volta', '#/@' + p.handle); }catch(e){} }
    if(mine && C.correalCarrega) C.correalCarrega();
    if(C.feed){
      C.feed.seguirHTML(p).then(r => { const a = $('pf-nums'), b = $('pf-seguir'); if(a) a.innerHTML = r.nums; if(b) b.innerHTML = r.btn; }).catch(() => {});
      if(!fechado){
        C.feed.mountPerfil($('pf-feed'), p);
        if(C.grupos) C.grupos.doPerfil($('pf-grupos'), p);
        if(C.feed.recs) C.feed.recs($('pf-recs'), p).catch(() => {});
      }
    }
  }

  /* ---------------- rotas ---------------- */
  async function loadMe(){
    if(!st.user){ st.me = null; st.loadedFor = null; st.meErro = false; return; }
    if(st.loadedFor === st.user.id && st.me) return;
    /* v4.33 · o Corre instantâneo: o perfil guardado no aparelho abre o app na hora; o do banco chega por baixo e troca
       (no balcão da cidade, não: lá a cidade já tem o perfil e o balcão abre e fecha muito) */
    if(!C.EMBED){ const g = C.guardado.le('me'); if(g && g.id === st.user.id && g.handle){ st.me = g; st.loadedFor = st.user.id; st.meErro = false; meFresco(st.user.id); return; } }
    /* erro de rede NÃO é "perfil não existe": tenta de novo e, se não der, avisa (antes caía no cadastro e a pessoa recriava o perfil) */
    st.meErro = false;
    for(let i = 0; i < 3; i++){
      /* v3.60: com o perfil, os planos (o Studio já sabe quantas redes cabem; não espera). v4.04: chegou e é dono (sem
         ser o fundador), o menu se refaz pra Lojinha aparecer */
      try{ st.me = await api.one('corre_perfis', { eq: { id: st.user.id } }); if(st.me){ st.loadedFor = st.user.id; C.guardado.poe('me', st.me); if(C.acessoCarrega) C.acessoCarrega().then(A => { if(A && A.dono && !C.ehFundador()) refazMenu(); }); } return; }
      catch(e){ if(i < 2) await new Promise(r => setTimeout(r, 700 * (i + 1))); }
    }
    st.me = null; st.meErro = true;
  }
  /* o perfil do banco chegou depois do guardado: troca; o que aparece no menu mudou (nome, foto, uma ferramenta), o menu
     se refaz sem redesenhar a página; o perfil sumiu (apagado em outro aparelho), volta pro começo */
  function meFresco(uid){
    api.one('corre_perfis', { eq: { id: uid } }).then(m => {
      if(!st.user || st.user.id !== uid) return;
      if(!m){ C.guardado.limpa(); st.me = null; st.loadedFor = null; route(); return; }
      const chave = o => JSON.stringify(o ? [o.nome, o.handle, o.avatar_url, o.ferramentas, o.categoria, o.desbaratinado] : null), mudou = chave(st.me) !== chave(m);
      st.me = m; C.guardado.poe('me', m);
      if(C.acessoCarrega) C.acessoCarrega().then(A => { if(A && A.dono && !C.ehFundador()) refazMenu(); });
      if(mudou) refazMenu();
    }).catch(() => {});
  }
  function viewSemRede(){
    app.innerHTML = C.header('') + `<main class="wrap"><section class="card"><h2 class="ch">Não deu pra carregar teu perfil agora.</h2><p class="note">A internet piscou. Teu perfil tá salvo, é só tentar de novo.</p><div class="acts" style="margin-top:14px"><button type="button" class="btn pri" data-act="tenta-de-novo">Tentar de novo</button></div></section></main>`;
  }
  function viewHorusDesligado(){
    document.title = 'Hórus · Corre';
    app.innerHTML = C.header('horus') + `<main class="wrap"><section class="card ferr-off">
      <span class="mono">${ico('eye')} Hórus</span><h1>O Hórus tá desligado.</h1>
      <p>Ele é o teu radar de clientes: caça empresa no mapa, monta a abordagem e acompanha quem tá quente. Liga quando quiser; teus leads ficam guardados.</p>
      <div class="acts"><button type="button" class="btn pri" data-act="ferr-horus" data-liga="1">${ico('eye')} Ligar o Hórus</button><a class="btn" href="${esc(C.voltaPra())}">${ico('prev')} Voltar</a></div></section></main>`;
  }
  /* no balcão do Correverso (iframe), cada página aberta avisa a cidade (tira o "abrindo…") */
  async function route(){
    try{ return await rotaDe(); }
    finally{ if(C.EMBED) C.pai('rota'); if(C.insta) C.insta.barra(); if(C.tema) C.tema.vivo = true; }
  }
  const ABRIU = { ja: false };
  async function rotaDe(){
    C.rota = (C.rota || 0) + 1;
    document.title = 'Corre';
    C.closeSheet();
    document.body.classList.remove('em-bb', 'em-bio');
    const h = location.hash.replace(/^#\/?/, '');
    /* v5.09: a pilha do Voltar (o balcão da cidade é outra janela: não entra) */
    if(!C.EMBED) pilhaAnda('#/' + h);
    /* v5.02: a luz do lugar novo já na troca (a página fala com o banco antes de desenhar). A primeira página sem
       endereço fica como o index.html deixou: quem fixou "abrir direto no Studio" cai lá logo abaixo */
    if(C.tema && (h || ABRIU.ja)) C.tema.poe(noiteDaRota(h));
    if(C.EMBED){
      /* a cidade é quem tá em volta: #/verso fecha o balcão; #/fechado é o balcão parado, sem nada rodando escondido */
      if(h === 'fechado'){ app.innerHTML = ''; return; }
      if(/^verso(\/|$)/.test(h)){ app.innerHTML = ''; C.pai('fechar'); return; }
    }
    /* logado mas sem perfil (acabou de entrar pelo link de um post, story ou perfil): primeiro o perfil, depois volta pra lá */
    const precisaPerfil = async volta => { if(!st.user) return false; await loadMe(); if(st.me || st.meErro) return false; try{ localStorage.setItem('corre-volta', volta); }catch(e){} viewOnboarding(); return true; };
    if(h.startsWith('@')){ if(await precisaPerfil(location.hash)) return; return viewProfile(C.decURI(h.slice(1)).toLowerCase()); }
    /* Story que veio do Instagram (#/s/@/ID): abre o perfil e o story por cima, sem login. O endereço vira o do perfil. */
    if(h.startsWith('s/')){
      const [hh, sid] = h.slice(2).split('/'), hd = C.decURI(hh || '').toLowerCase().replace(/[^a-z0-9_.]/g, '');
      if(await precisaPerfil('#/@' + hd)) return;
      try{ history.replaceState(null, '', location.pathname + location.search + '#/@' + hd); }catch(e){}
      await viewProfile(hd);
      if(C.insta) C.insta.abreStory(hd, sid);
      return;
    }
    /* Mural: o mural, o pedido e a página de quem pediu abrem sem login */
    if((h === 'mural' || h.startsWith('mural/')) && C.views.mural){ if(st.user) await loadMe(); window.scrollTo(0, 0); return C.views.mural(app, h.slice(6)); }
    /* v5.09 · o Muralzim: o muro, o evento e o ingresso abrem sem login (comprar e divulgar pedem) */
    if((h === 'muralzim' || h.startsWith('muralzim/')) && C.views.muralzim){ if(st.user) await loadMe(); window.scrollTo(0, 0); return C.views.muralzim(app, h.slice(9)); }
    /* Feed: a conversa de um post (#/p/ID) abre sem login, pra dar pra mandar o link */
    if(h.startsWith('p/') && C.views.post){ if(await precisaPerfil(location.hash)) return; window.scrollTo(0, 0); return C.views.post(app, C.decURI(h.slice(2))); }
    /* Grupos (v3.36): a vitrine e a página do grupo abrem sem login (grupo aberto mostra os posts; fechado, só a capa) */
    if(h.startsWith('g/') && C.views.grupo){ if(await precisaPerfil(location.hash)) return; window.scrollTo(0, 0); return C.views.grupo(app, h.slice(2)); }
    if(h === 'grupos' && C.views.grupos){ if(await precisaPerfil(location.hash)) return; window.scrollTo(0, 0); return C.views.grupos(app); }
    /* Studio Houzi (v3.37): a casa do Studio e o brandbook publicado abrem sem login (o resto do Studio pede login) */
    if(h === 'houzi' && C.views.houzi){ if(await precisaPerfil(location.hash)) return; window.scrollTo(0, 0); return C.views.houzi(app, ''); }
    if(h.startsWith('bb/') && C.views.bb){ if(st.user) await loadMe(); window.scrollTo(0, 0); return C.views.bb(app, h.slice(3)); }
    /* v4.0 · o Link na bio (app.corresocial.com/@nome vira #/bio/nome no começo do index.html): abre sem login */
    if(h.startsWith('bio/') && C.views.bio){ if(st.user) await loadMe(); window.scrollTo(0, 0); return C.views.bio(app, C.decURI(h.slice(4))); }
    if(!st.user && /^houzi\//.test(h)){ try{ localStorage.setItem('corre-volta', location.hash); }catch(e){} }
    /* v4.41: o app.corresocial.com/studio sem login: depois de entrar com o Google, volta pro Corre Studio */
    if(!st.user && h === 'dia'){ try{ localStorage.setItem('corre-volta', '#/dia'); }catch(e){} }
    /* v4.29 · "Quantos clientes tem pra você" (app.corresocial.com/clientes): abre sem login */
    if(h === 'clientes' && C.views.clientes){ if(await precisaPerfil(location.hash)) return; window.scrollTo(0, 0); return C.views.clientes(app); }
    /* v4.17 · o link de aprovação do Studio: o cliente abre sem login */
    if(h.startsWith('aprova/') && C.views.aprova){ if(st.user) await loadMe(); window.scrollTo(0, 0); return C.views.aprova(app, C.decURI(h.slice(7))); }
    /* Vendas: o orçamento que o cliente recebe abre sem login */
    if(h.startsWith('o/') && C.views.orcamentoVenda){ if(st.user) await loadMe(); window.scrollTo(0, 0); return C.views.orcamentoVenda(app, C.decURI(h.slice(2))); }
    /* Hórus 4: o link público de orçamento abre sem login */
    if(h.startsWith('orcamento/') && C.views.orcamento){ if(st.user) await loadMe(); return C.views.orcamento(app, C.decURI(h.slice(10))); }
    if(!st.user && /^msg(\/|$)/.test(h)){ try{ localStorage.setItem('corre-volta', location.hash); }catch(e){} }
    if(!st.user){ if(C.EMBED){ app.innerHTML = ''; C.pai('fechar'); return; } return viewLogin(); }
    await loadMe();
    if(!st.me) return st.meErro ? viewSemRede() : viewOnboarding();
    /* voltou do login do Google: leva pra onde a pessoa tava (ex.: o pedido do Mural) */
    let volta = ''; try{ volta = localStorage.getItem('corre-volta') || ''; if(volta) localStorage.removeItem('corre-volta'); }catch(e){}
    if(volta && /^#\/((mural|muralzim|p|msg|g|houzi)\/|@[a-z0-9_.]{3,24}$|grupos$|houzi$|dia$)/.test(volta) && volta !== location.hash){ location.hash = volta; return; }
    /* v4.29: entrou pelo "levar pro meu Hórus" da página dos clientes: volta pra ela, que leva sozinha */
    if(C.clientes && C.clientes.leva() && h !== 'monta'){ location.hash = '#/clientes'; return; }
    /* já tem perfil: convite de link não vale mais (só quem acabou de entrar segue quem chamou) */
    if(C.insta) C.insta.limpaConvite();
    window.scrollTo(0, 0);
    /* v4.41: quem fixou "abrir o Corre direto aqui" cai no Corre Studio na primeira página da abertura (o link de um
       post, de um perfil ou de um aviso abre o que foi pedido; depois disso, a Rede é um toque) */
    if(!ABRIU.ja){ ABRIU.ja = true; if(!h && abreNoStudio()){ try{ history.replaceState(null, '', location.pathname + location.search + '#/dia'); }catch(e){} return viewDia(); } }
    if(h === 'editar') return viewEdit();
    /* o aviso no celular de "seguidores novos" abre o sino por cima do Início */
    if(h === 'avisos'){ try{ history.replaceState(null, '', location.pathname + location.search + '#/'); }catch(e){} await viewHome(); if(C.avisos) C.avisos.abrir(); return; }
    /* o Rolo 360 é só do @consanans; o Hórus só abre ligado (Perfil › Ferramentas) */
    if((h === 'horus' || h.startsWith('horus/')) && !C.ferr('horus')) return viewHorusDesligado();
    /* v4.16: as abas do Hórus têm endereço (#/horus/funil, #/horus/entrada; o aviso do pedido abre a Entrada) */
    if((h === 'horus' || h.startsWith('horus/')) && C.views.horus) return C.views.horus(app, h.slice(6));
    /* v4.19: o Caderninho (#/caderninho/t/ID é o aviso do celular abrindo a tarefa) */
    if((h === 'caderninho' || h.startsWith('caderninho/')) && C.views.caderno) return C.views.caderno(app, h.slice(11));
    /* v4.34: o Atendente 24h (#/atendente/c/ID é o aviso do celular abrindo a conversa) e o Piloto automático */
    if((h === 'atendente' || h.startsWith('atendente/')) && C.views.atendente) return C.views.atendente(app, h.slice(10));
    if(h === 'piloto' && C.views.piloto) return C.views.piloto(app);
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
      try{ await C.saveMe({ ferramentas: f }); toast(liga ? 'Hórus ligado. Tá no teu Corre Studio.' : 'Hórus desligado. Teus leads ficam guardados.', 3200); if(el.type !== 'checkbox' && liga){ go('#/horus'); return; } route(); }
      catch(e){ if(el.type === 'checkbox') el.checked = !liga; toast(C.errMsg(e)); }
    },
    'iab-copia': () => C.copy(C.insta ? C.insta.linkAqui() : location.origin + location.pathname, 'Link copiado. Cola no navegador.'),
    'tira-capa': async el => { try{ await C.saveMe({ capa_url: '' }); const pv = $('pf-capa-prev'); if(pv) pv.style.backgroundImage = ''; el.hidden = true; toast('Capa tirada. Volta a capa padrão do Corre.'); }catch(e){ toast(C.errMsg(e, 'Não deu pra tirar a capa.')); } },
    /* v3.44 · entrar pela Apple (no modo demonstração, o mesmo login de mentira do Google) */
    apple: async el => {
      const sp = el.querySelector('span'), antes = sp ? sp.textContent : '';
      el.disabled = true; if(sp) sp.textContent = 'Abrindo a Apple…';
      try{ await api.login('apple'); }
      catch(err){ toast(err && err.code === 'off' ? 'O login do Corre ainda não tá ligado neste endereço.' : 'Não deu pra abrir o login da Apple. Tente de novo.', 4200); el.disabled = false; if(sp) sp.textContent = antes; }
    },
    /* v4.35 · entrar pelo Facebook (no modo demonstração, o mesmo login de mentira) */
    facebook: async el => {
      const sp = el.querySelector('span'), antes = sp ? sp.textContent : '';
      el.disabled = true; if(sp) sp.textContent = 'Abrindo o Facebook…';
      try{ await api.login('facebook'); }
      catch(err){ toast(err && err.code === 'off' ? 'O login do Corre ainda não tá ligado neste endereço.' : 'Não deu pra abrir o login do Facebook. Tente de novo.', 4200); el.disabled = false; if(sp) sp.textContent = antes; }
    },
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
      /* v3.61: plano pago rodando no Asaas é cancelado antes (o perfil some, mas o Asaas seguiria cobrando todo mês) */
      try{ if(C.planos && C.planos.cancelaTudo) await C.planos.cancelaTudo(); }
      catch(e){ toast(C.errMsg(e, 'Não deu pra cancelar teus planos agora. Cancela em Financeiro › Planos e tenta de novo.'), 5200); return; }
      /* v4.31: apaga a conta de verdade (o perfil e o login, corre_apaga_minha_conta do delta-v431) e as fotos, vídeos e
         arquivos que a pessoa subiu (a lista sai antes; o "tira" vem depois, ainda com a sessão). Banco sem o delta:
         apaga o perfil, como antes. */
      try{
        if(C.push) await C.push.sair();
        const pastas = api.minhasPastas ? await api.minhasPastas().catch(() => []) : [];
        let conta = false;
        try{ const r = await api.rpc('corre_apaga_minha_conta', {}); conta = !!(r && r.ok); }
        catch(e){ if(!(e && (e.code === 'PGRST202' || e.code === '42883' || /Could not find the function|does not exist/i.test(e.message || '')))) throw e; }
        if(!conta) await api.del('corre_perfis', { id: st.user.id });
        if(api.tiraPastas) await api.tiraPastas(pastas).catch(() => {});
        toast(conta ? 'Conta apagada. Valeu por ter passado pelo Corre.' : 'Perfil apagado.', 4200);
        await api.logout(); st.user = null; st.me = null; st.loadedFor = null; go('#/');
      }
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
  /* abriu o Tudo descendo no menu largo (v3.71; clique, Enter ou Espaço viram clique): se a lista rola, ele aparece
     inteiro. No menu estreito ele é balão do lado e não mexe na rolagem */
  document.addEventListener('click', e => {
    const s = e.target.closest('.lado-tudo > summary'); if(!s || !matchMedia('(min-width: 1280px)').matches) return;
    setTimeout(() => { const d = s.parentElement; if(d.open) aVista(d.querySelector('.lado-tudo-m .tudo-c:last-child > :last-child')); }, 0);
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
    /* v3.55: a pergunta por cima (C.confirma, um <dialog>) fecha sozinha no Esc; a folha embaixo fica (e o balcão também) */
    if(document.querySelector('dialog[open]')) return;
    const sh = $('sheet'), aberta = !!(sh && !sh.hidden);
    /* v3.53: o Esc que fechou a folha não fecha mais nada (a casa/lugar 3D ouvia o mesmo Esc e saía junto) */
    if(aberta) e.preventDefault();
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
  /* v4.35: o login que não terminou volta com ?error=... no endereço (o Supabase manda o motivo junto). Antes a
     pessoa caía de volta no login sem saber por quê. Sai do endereço logo, pra não repetir ao recarregar. */
  const erroLogin = (() => {
    try{
      const q = new URLSearchParams(location.search), hh = new URLSearchParams(location.hash.replace(/^#\/?/, ''));
      const noHash = hh.has('error') || hh.has('error_description');
      const d = [q.get('error'), q.get('error_description'), hh.get('error'), hh.get('error_description')].filter(Boolean).join(' ');
      if(!d) return '';
      /* tira só os três do endereço, do jeito que veio (o URLSearchParams escreveria o "?demo" como "?demo=") */
      const s = location.search.slice(1).split('&').filter(x => x && !/^error(_code|_description)?=/.test(x)).join('&');
      history.replaceState(null, '', location.pathname + (s ? '?' + s : '') + (noHash ? '#/' : location.hash));
      return d;
    }catch(e){ return ''; }
  })();
  const msgErroLogin = d => /e-?mail/i.test(d) ? 'O Facebook não mandou o teu e-mail, e o Corre precisa dele pra criar a conta. Põe um e-mail confirmado no Facebook (Configurações › Central de Contas › Dados pessoais) ou entra com o Google.'
    : /access_denied|denied|cancel/i.test(d) ? 'O login foi cancelado. Quando quiser, é só tocar de novo.'
    : 'O login não terminou. Tenta de novo.';
  (async function boot(){
    try{ st.user = await api.init(); }
    catch(e){ app.innerHTML = `<div class="boot"><span>Não deu pra conectar ao Corre agora. Atualize a página.</span></div>`; return; }
    api.onAuth((u) => {
      const changed = (u && u.id) !== (st.user && st.user.id);
      /* saiu da conta (ou trocou): o que tava guardado do login de antes sai do aparelho */
      if(changed && st.user) C.guardado.limpa();
      st.user = u;
      if(changed){ st.loadedFor = null; st.me = null; route(); }
    });
    route().then(() => C.pai('pronto'), () => C.pai('pronto'));
    if(erroLogin && !st.user) setTimeout(() => toast(msgErroLogin(erroLogin), 9000), 300);
    /* v4.33 · o service worker guarda o app no aparelho: da segunda vez abre na hora, até com o sinal ruim (antes ele
       só existia pra quem ligava os avisos). Só no endereço de verdade (https): no computador de teste (localhost) os
       testes trocam o config.js pela rede, e o service worker buscaria o de verdade por fora deles (?sw=1 liga pra testar) */
    if('serviceWorker' in navigator && !C.EMBED && (location.protocol === 'https:' || /[?&]sw=1\b/.test(location.search))){
      const reg = () => setTimeout(() => navigator.serviceWorker.register('sw.js', { scope: './' }).catch(() => {}), 1500);
      if(document.readyState === 'complete') reg(); else addEventListener('load', reg, { once: true });
    }
    /* v3.40: a volta do login do Instagram (o ig.html guardou o código) */
    if(C.ig) C.ig.volta();
  })();
})();
